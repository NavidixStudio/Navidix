import pkg from 'playwright';   // npm i playwright  (chromium only is enough)
const { chromium } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/* Plates, generated from each style's own DNA rather than hand-drawn one by
   one. A plate is (mark-making × lighting × palette): the marks say how the
   surface was made, the lighting says where it comes from, the palette is the
   style's. That composes, so style number 80 costs nothing extra — it just
   picks its two primitives.

   They are deliberately abstract. Every image host is refused by this
   environment's network policy, and a plate that pretended to be a real
   example of the prompt's output would be a lie either way. */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT  = path.join(HERE, '..', 'prompts');
fs.mkdirSync(OUT, { recursive: true });
const STYLES = JSON.parse(fs.readFileSync(path.join(HERE,'styles.json'), 'utf8'));
const W = 800, H = 500;

const lib = `
let _s = 1; const seed = n => { _s = n; };
const R = () => (_s = _s*16807 % 2147483647) / 2147483647;
const rnd = (a,b) => a + R()*(b-a);
const pick = a => a[(R()*a.length)|0];
const W=${W}, H=${H};

function grain(cx, amt){
  const d = cx.getImageData(0,0,W,H), p = d.data;
  for (let i=0;i<p.length;i+=4){ const n=(R()-.5)*amt; p[i]+=n; p[i+1]+=n; p[i+2]+=n; }
  cx.putImageData(d,0,0);
}
function glow(cx,x,y,r,c,a){
  const g=cx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,c.replace('A',a)); g.addColorStop(1,c.replace('A',0));
  cx.fillStyle=g; cx.fillRect(0,0,W,H);
}
const lerp=(a,b,t)=>a+(b-a)*t;
/* The composition below a flat style's horizon. Left to the seed it is a coin
   toss, and a few styles are *about* their ground: a wave for ukiyo-e, a fan
   for deco, a walled garden for the miniature. */
let ID='';
const GROUND_OF = { ukiyoe:1, artdeco:3, miniature:2, gouache:0 };
function hex(c){ return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]; }
function mix(c1,c2,t){ const a=hex(c1),b=hex(c2);
  return 'rgb('+Math.round(lerp(a[0],b[0],t))+','+Math.round(lerp(a[1],b[1],t))+','+Math.round(lerp(a[2],b[2],t))+')'; }

/* ---------- ground: a horizon and two planes, so marks have somewhere to sit ---------- */
function ground(cx,P){
  const g=cx.createLinearGradient(0,0,W*0.5,H);
  g.addColorStop(0,P[0]); g.addColorStop(1, P[1]||P[0]);
  cx.fillStyle=g; cx.fillRect(0,0,W,H);
}

/* ---------- MARKS ---------- */
const MARK = {
  // loaded strokes with a lit ridge and a shadowed one
  impasto(cx,P){
    const Q=[P[0],P[0]].concat(P);          // let the dark ground carry, so a
    for(let i=0;i<340;i++){                 // hot accent stays an accent
      const x=rnd(-40,W), y=rnd(-20,H), l=rnd(34,130), w=rnd(9,24), a=rnd(-.55,.55);
      cx.save(); cx.translate(x,y); cx.rotate(a);
      cx.globalAlpha=rnd(.35,.92); cx.fillStyle=pick(Q); cx.fillRect(0,0,l,w);
      cx.globalAlpha=rnd(.2,.5);
      cx.fillStyle='rgba(255,244,222,.55)'; cx.fillRect(0,0,l,2.2);
      cx.fillStyle='rgba(0,0,0,.5)';        cx.fillRect(0,w-2.2,l,2.2);
      cx.restore();
    }
  },
  // short separated dabs of unmixed pigment, organised around a horizon
  dabs(cx,P){
    const hz=H*0.56;
    cx.globalAlpha=.5; cx.fillStyle=P[P.length-1]; cx.fillRect(0,hz,W,H-hz); cx.globalAlpha=1;
    for(let i=0;i<1600;i++){
      const y=rnd(0,H), x=rnd(0,W), sky=y<hz;
      cx.save(); cx.translate(x,y); cx.rotate(sky?rnd(-.35,.35):rnd(1.1,1.9));
      cx.globalAlpha=rnd(.35,.85); cx.fillStyle=pick(P);
      cx.fillRect(0,0,rnd(16,32),rnd(7,12)); cx.restore();
    }
  },
  // pigment blooming into damp paper, with real untouched white
  wash(cx,P){
    cx.fillStyle='#F4F1E8'; cx.fillRect(0,0,W,H);
    for(let i=0;i<30;i++){
      const x=rnd(60,W-60), y=rnd(50,H-50), r=rnd(50,165), c=pick(P);
      for(let k=0;k<7;k++){
        cx.globalAlpha=.055; cx.fillStyle=c; cx.beginPath();
        cx.ellipse(x+rnd(-14,14),y+rnd(-14,14),r*rnd(.6,1),r*rnd(.5,.9),rnd(0,6.28),0,6.28); cx.fill();
      }
      cx.globalAlpha=.10; cx.strokeStyle=c; cx.lineWidth=2; cx.beginPath();
      cx.ellipse(x,y,r*.92,r*.72,rnd(0,6.28),0,6.28); cx.stroke();
    }
    cx.globalAlpha=1;
  },
  // flat colour areas, print misregistration. The composition is drawn from
  // the seed, so two flat styles never come out as the same picture.
  flat(cx,P){
    cx.fillStyle=P[P.length-1]||'#EFE7D8'; cx.fillRect(0,0,W,H);
    const hz=rnd(.44,.70), n=1+((R()*3)|0);
    for(let i=0;i<n;i++){
      cx.fillStyle=P[i%P.length];
      cx.fillRect(0,H*hz*i/n,W,H*hz/n+1);
    }
    const dr=rnd(46,108), dx=rnd(W*.18,W*.82), dy=rnd(dr+18, Math.max(dr+20,H*hz-dr*.25));
    cx.fillStyle=P[(n+1)%P.length]; cx.beginPath(); cx.arc(dx,dy,dr,0,6.28); cx.fill();

    const kind = GROUND_OF[ID] !== undefined ? GROUND_OF[ID] : (R()*3)|0;
    if(kind===3){                                   // a stepped fan: deco
      cx.save(); cx.translate(W*.5,H*hz); cx.fillStyle=P[n%P.length];
      for(let i=-6;i<=6;i++){
        cx.globalAlpha=.9-Math.abs(i)*.055;
        cx.beginPath(); cx.moveTo(0,0);
        cx.lineTo(i*72-26,-H*.5); cx.lineTo(i*72+26,-H*.5); cx.fill();
      }
      cx.restore(); cx.globalAlpha=1;
      cx.fillStyle=P[(n+2)%P.length]; cx.fillRect(0,H*hz,W,H);
      for(let i=1;i<=3;i++){
        cx.globalAlpha=.18; cx.fillStyle=P[P.length-1];
        cx.fillRect(0,H*hz+i*22,W,7);
      }
      cx.globalAlpha=1;
    } else {
      cx.fillStyle=P[n%P.length]; cx.beginPath(); cx.moveTo(0,H);
      if(kind===0){                                 // a peak
        cx.lineTo(0,H*hz); cx.lineTo(W*rnd(.28,.72),H*(hz-rnd(.08,.2)));
        cx.lineTo(W,H*hz); cx.lineTo(W,H);
      } else if(kind===1){                          // a swell
        const f=rnd(.007,.015), a=rnd(20,42);
        cx.lineTo(0,H*hz);
        for(let x=0;x<=W;x+=12) cx.lineTo(x,H*hz+Math.sin(x*f+1)*a);
        cx.lineTo(W,H);
      } else {                                      // stacked terraces
        cx.lineTo(0,H*hz); cx.lineTo(W,H*hz); cx.lineTo(W,H);
      }
      cx.fill();
      if(kind===2){
        cx.fillStyle=P[(n+2)%P.length];
        cx.fillRect(0,H*(hz+rnd(.11,.24)),W,H);
      }
    }
    cx.globalAlpha=.12; cx.fillStyle=P[1%P.length];
    for(let y=4;y<H;y+=7) for(let x=4;x<W;x+=7) cx.fillRect(x+1.5,y+1.5,1.6,1.6);
    cx.globalAlpha=1;
  },
  // cross-hatching pooling into a form, construction left visible
  hatch(cx,P){
    cx.fillStyle=P[0]; cx.fillRect(0,0,W,H);
    const fx=W*0.46, fy=H*0.5;
    for(const [ang,dens,al] of [[-.6,900,.30],[.55,700,.24],[1.35,500,.18]]){
      cx.strokeStyle='rgba(28,28,30,1)'; cx.lineWidth=1.1;
      for(let i=0;i<dens;i++){
        const x=rnd(fx-230,fx+230), y=rnd(fy-190,fy+190);
        const d=Math.hypot((x-fx)/230,(y-fy)/190); if(d>1) continue;
        cx.globalAlpha=al*(1-d)*rnd(.6,1.25); const l=rnd(26,74);
        cx.beginPath(); cx.moveTo(x,y); cx.lineTo(x+Math.cos(ang)*l,y+Math.sin(ang)*l); cx.stroke();
      }
    }
    cx.globalAlpha=.9; cx.strokeStyle='rgba(22,22,24,.9)'; cx.lineWidth=2;
    cx.beginPath(); cx.ellipse(fx,fy,150,196,0,0,6.28); cx.stroke();
    cx.globalAlpha=.4; cx.strokeStyle='rgba(120,120,124,.9)'; cx.lineWidth=1;
    cx.strokeRect(fx-168,fy-214,336,428);
    cx.beginPath(); cx.moveTo(fx-168,fy); cx.lineTo(fx+168,fy); cx.stroke();
    cx.globalAlpha=1;
  },
  // confident contour, flat fills, no shading — print and poster languages
  line(cx,P){
    cx.fillStyle=P[P.length-1]; cx.fillRect(0,0,W,H);
    const hz=rnd(.52,.72), amp=rnd(34,68), f=rnd(.008,.015);
    cx.fillStyle=P[0]; cx.beginPath(); cx.moveTo(0,H);
    for(let x=0;x<=W;x+=14) cx.lineTo(x,H*hz+Math.sin(x*f)*amp); cx.lineTo(W,H); cx.fill();
    const dr=rnd(58,96);
    cx.fillStyle=P[1%P.length];
    cx.beginPath(); cx.arc(rnd(W*.2,W*.8),rnd(dr+22,H*hz-dr*.3),dr,0,6.28); cx.fill();
    cx.strokeStyle=P[0]; cx.lineWidth=rnd(3.5,6); cx.lineCap='round';
    const rows=6+((R()*6)|0), gap=(H-70)/rows, dir=R()<.5?1:-1;
    for(let i=0;i<rows;i++){
      cx.globalAlpha=.85; cx.beginPath();
      const y=44+i*gap;
      cx.moveTo(36,y);
      cx.bezierCurveTo(W*rnd(.2,.4),y-46*dir,W*rnd(.55,.75),y+50*dir,W-36,y-rnd(4,26)*dir);
      cx.stroke();
    }
    cx.globalAlpha=1;
  },
  // no marks at all: photographic and lighting-led styles
  smooth(cx,P){
    const g=cx.createLinearGradient(0,0,W*0.4,H);
    g.addColorStop(0,mix(P[0],P[1%P.length],.25)); g.addColorStop(1,P[0]);
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
  },
  // available-light photography: a street receding, figures for scale
  grain(cx,P){
    const g=cx.createLinearGradient(0,0,W,H);
    g.addColorStop(0,'#4A4B46'); g.addColorStop(.5,P[1%P.length]); g.addColorStop(1,'#2B2C29');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
    for(let i=0;i<6;i++){
      const w=rnd(70,150), x=i<3? rnd(0,180) : rnd(W-220,W-60);
      cx.globalAlpha=.5-i*.05; cx.fillStyle=i%2?'#3A3B37':'#22231F';
      cx.fillRect(x, rnd(20,90), w, H);
    }
    cx.globalAlpha=.92; cx.fillStyle='#191A17';
    [[W*0.34,H*0.78,.75],[W*0.55,H*0.7,.55],[W*0.68,H*0.65,.4]].forEach(([x,y,s])=>{
      cx.beginPath(); cx.ellipse(x,y-46*s,11*s,13*s,0,0,6.28); cx.fill();
      cx.fillRect(x-13*s,y-34*s,26*s,52*s);
      cx.fillRect(x-11*s,y+16*s,9*s,30*s); cx.fillRect(x+3*s,y+16*s,9*s,30*s);
    });
    cx.globalAlpha=1;
  }
};

/* ---------- SUBJECTS ----------
   A style whose mark-making is "smooth" leaves nothing on the surface, so
   without a subject the plate is only a gradient. These give the light
   something to fall on: a volume, a vessel, a head. */

// backdrop sweeping into a table, the way a seamless does
function sweep(cx,P,tone){
  const y=H*0.70;
  const g=cx.createLinearGradient(0,0,0,y);
  g.addColorStop(0,mix(P[0],tone,.06)); g.addColorStop(1,mix(P[0],tone,.22));
  cx.fillStyle=g; cx.fillRect(0,0,W,y+2);
  const t=cx.createLinearGradient(0,y,0,H);
  t.addColorStop(0,mix(P[0],tone,.30)); t.addColorStop(1,mix(P[0],'#000000',.35));
  cx.fillStyle=t; cx.fillRect(0,y,W,H-y);
  cx.globalAlpha=.5; cx.fillStyle=mix(P[0],tone,.34);
  cx.beginPath(); cx.moveTo(0,y+2);
  for(let x=0;x<=W;x+=20) cx.lineTo(x,y+2-Math.sin(x*.004)*7);
  cx.lineTo(W,y+22); cx.lineTo(0,y+22); cx.fill(); cx.globalAlpha=1;
}
// fill a silhouette with modelled light: key falloff plus a shadow side
function shade(cx,path,base,lx,ly,r,key){
  cx.save(); cx.beginPath(); path(cx); cx.clip();
  cx.fillStyle=base; cx.fillRect(0,0,W,H);
  const g=cx.createRadialGradient(lx,ly,0,lx,ly,r);
  g.addColorStop(0,key.replace('A','.92')); g.addColorStop(.42,key.replace('A','.34'));
  g.addColorStop(1,key.replace('A','0'));
  cx.fillStyle=g; cx.fillRect(0,0,W,H);
  const d=cx.createRadialGradient(lx,ly,r*.45,lx,ly,r*2.2);
  d.addColorStop(0,'rgba(0,0,0,0)'); d.addColorStop(1,'rgba(0,0,0,.8)');
  cx.fillStyle=d; cx.fillRect(0,0,W,H); cx.restore();
}
function contact(cx,x,y,rx,dir){
  cx.save(); cx.globalAlpha=.5; cx.fillStyle='rgba(0,0,0,.9)';
  cx.beginPath(); cx.ellipse(x+dir*rx*.6,y,rx*1.5,rx*.22,0,0,6.28); cx.fill();
  cx.restore();
}
const BG = {
  study: (cx,P,key)=>sweep(cx,P,key==='cool'?'#8FA6BA':'#E8DCC6'),
  bottle:(cx,P)=>sweep(cx,P,'#C9D4DC'),
  jug:   (cx,P,key)=>sweep(cx,P,key==='cool'?'#B9C6CE':'#E8D2AC'),
  bust:  (cx,P)=>{                 // a dark ground, so the lit head is the picture
    sweep(cx,P,'#241A12');
    const g=cx.createLinearGradient(0,0,W*.6,H);
    g.addColorStop(0,'rgba(0,0,0,.34)'); g.addColorStop(1,'rgba(0,0,0,.74)');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
  },
  lone:  ()=>{}, figure: ()=>{}
};
const FORM = {
  // sphere and block: the lighting study every studio shot descends from
  study(cx,P,lx,ly,key){
    const k=key==='cool'?'rgba(226,238,250,A)':'rgba(255,243,222,A)';
    const bx=W*0.63, by=H*0.70, bw=104, bh=132;
    contact(cx,bx+bw/2,by+3,bw*.5,lx<W/2?1:-1);
    shade(cx,c=>{c.rect(bx,by-bh,bw,bh);}, mix(P[1%P.length],'#000000',.3), lx,ly,340,k);
    const r=88, sx=W*0.36, sy=by-r;
    contact(cx,sx,by+3,r*.8,lx<W/2?1:-1);
    shade(cx,c=>{c.arc(sx,sy,r,0,6.28);}, P[1%P.length], lx,ly,300,k);
  },
  // a tall vessel on a seamless: product lighting, one specular strip
  bottle(cx,P,lx,ly,key){
    const cxp=W*0.5, base=H*0.74, hgt=250, w=64;
    const path=c=>{
      c.moveTo(cxp-w,base); c.lineTo(cxp-w,base-hgt*.62);
      c.bezierCurveTo(cxp-w,base-hgt*.8,cxp-20,base-hgt*.78,cxp-20,base-hgt*.9);
      c.lineTo(cxp-20,base-hgt); c.lineTo(cxp+20,base-hgt);
      c.lineTo(cxp+20,base-hgt*.9);
      c.bezierCurveTo(cxp+20,base-hgt*.78,cxp+w,base-hgt*.8,cxp+w,base-hgt*.62);
      c.lineTo(cxp+w,base); c.closePath();
    };
    contact(cx,cxp,base+2,w,0);
    shade(cx,path,mix(P[1%P.length],'#000000',.25),lx,ly,300,'rgba(245,250,255,A)');
    cx.save(); cx.beginPath(); path(cx); cx.clip();
    cx.globalAlpha=.85; cx.fillStyle='rgba(255,255,255,.9)';
    cx.fillRect(cxp-w+13,base-hgt*.86,7,hgt*.72);
    cx.globalAlpha=.3; cx.fillRect(cxp+w-22,base-hgt*.7,11,hgt*.6);
    cx.restore(); cx.globalAlpha=1;
  },
  // jug, bowl and a fold of cloth — the still life the old masters lit
  jug(cx,P,lx,ly,key){
    const k=key==='cool'?'rgba(232,242,252,A)':'rgba(255,236,196,A)';
    const base=H*0.74;
    const jug=c=>{
      c.moveTo(W*.40,base); c.bezierCurveTo(W*.32,base-40,W*.33,base-130,W*.42,base-152);
      c.lineTo(W*.42,base-184); c.lineTo(W*.52,base-184); c.lineTo(W*.52,base-152);
      c.bezierCurveTo(W*.61,base-130,W*.62,base-40,W*.54,base); c.closePath();
    };
    contact(cx,W*.47,base+2,72,lx<W/2?1:-1);
    shade(cx,jug,mix(P[1%P.length],'#000000',.2),lx,ly,290,k);
    const bowl=c=>{
      c.moveTo(W*.60,base-58); c.bezierCurveTo(W*.60,base+4,W*.78,base+4,W*.78,base-58); c.closePath();
    };
    contact(cx,W*.69,base+2,58,lx<W/2?1:-1);
    shade(cx,bowl,mix(P[2%P.length]||P[1%P.length],'#000000',.28),lx,ly,290,k);
    cx.globalAlpha=.55; cx.fillStyle=mix(P[P.length-1],'#000000',.4);
    cx.beginPath(); cx.moveTo(0,base+6);
    for(let x=0;x<=W*.34;x+=16) cx.lineTo(x,base+6+Math.sin(x*.03)*11);
    cx.lineTo(W*.34,H); cx.lineTo(0,H); cx.fill(); cx.globalAlpha=1;
  },
  // head and shoulders, three-quarter, the portrait convention
  bust(cx,P,lx,ly,key){
    const k='rgba(255,238,208,A)';
    const cxp=W*0.48, hy=H*0.40, hr=84;
    const body=c=>{
      c.moveTo(cxp-186,H); c.bezierCurveTo(cxp-166,H*0.66,cxp-92,H*0.60,cxp-46,H*0.575);
      c.lineTo(cxp+46,H*0.575);
      c.bezierCurveTo(cxp+92,H*0.60,cxp+166,H*0.66,cxp+186,H); c.closePath();
    };
    shade(cx,body,mix(P[0],'#000000',.35),lx,ly,420,'rgba(220,200,170,A)');
    const head=c=>{
      c.ellipse(cxp,hy,hr*.82,hr,0,0,6.28);
      c.moveTo(cxp+22,hy+hr*.8); c.lineTo(cxp+22,H*0.585);
      c.lineTo(cxp-22,H*0.585); c.lineTo(cxp-22,hy+hr*.8); c.closePath();
    };
    shade(cx,head,mix(P[2%P.length]||P[1%P.length],'#3A2418',.45),lx,ly,300,k);
    cx.save(); cx.globalAlpha=.55; cx.fillStyle='rgba(0,0,0,.85)';
    cx.beginPath(); cx.ellipse(cxp,hy-hr*.26,hr*.86,hr*.5,0,3.14,6.28); cx.fill();
    cx.restore();
  },
  // one sphere, one impossible shadow: the metaphysical square
  lone(cx,P,lx,ly,key){
    const base=H*0.80, r=64, sx=W*0.34;
    cx.save(); cx.globalAlpha=.6; cx.fillStyle='rgba(0,0,0,.9)';
    cx.beginPath(); cx.moveTo(sx-r,base); cx.lineTo(sx+r,base);
    cx.lineTo(W*0.05,H); cx.lineTo(W*-0.2,H); cx.fill(); cx.restore();
    cx.fillStyle='#0B0D14'; cx.beginPath(); cx.arc(sx,base-r,r,0,6.28); cx.fill();
    cx.save(); cx.beginPath(); cx.arc(sx,base-r,r,0,6.28); cx.clip();
    const g=cx.createRadialGradient(W*.8,H*.6,0,W*.8,H*.6,520);
    g.addColorStop(0,'rgba(255,222,170,.75)'); g.addColorStop(1,'rgba(255,222,170,0)');
    cx.fillStyle=g; cx.fillRect(0,0,W,H); cx.restore();
    cx.strokeStyle='rgba(255,232,190,.9)'; cx.lineWidth=2.6;
    cx.beginPath(); cx.arc(sx,base-r,r,-1.1,.9); cx.stroke();
  },
  // a figure for scale, cut out against the light
  figure(cx,P,lx,ly,key){
    const x=W*0.30, y=H*0.86, s=1.5;
    cx.save(); cx.globalAlpha=.45; cx.fillStyle='rgba(0,0,0,.9)';
    cx.beginPath(); cx.ellipse(x-30*s,y+4,72*s,9*s,0,0,6.28); cx.fill(); cx.restore();
    cx.fillStyle='#120C08';
    cx.beginPath(); cx.ellipse(x,y-62*s,11*s,13*s,0,0,6.28); cx.fill();
    cx.fillRect(x-14*s,y-48*s,28*s,52*s);
    cx.fillRect(x-12*s,y+2*s,10*s,26*s); cx.fillRect(x+3*s,y+2*s,10*s,26*s);
  }
};
// which subject, and whether it goes in front of the light or behind it
const SUBJECT = {
  studio:      ['study',  'cool'],
  product:     ['bottle', 'cool'],
  window:      ['jug',    'cool'],
  chiaro:      ['jug',    'warm'],
  renaissance: ['bust',   'warm'],
  qajar:       ['bust',   'warm'],
  surreal:     ['lone',   'warm'],
  golden:      ['figure', 'warm']
};
const LIGHTPOS = {
  chiaro:[.30,.24], golden:[.80,.60], soft:[.30,.20], neon:[.30,.34],
  rim:[.50,.90], back:[.56,.44], top:[.50,.02], flat:[.36,.26]
};

/* ---------- LIGHT ---------- */
const LIGHT = {
  chiaro(cx,P){
    glow(cx,W*0.3,H*0.24,250,'rgba(244,228,198,A)',.85);
    const g=cx.createRadialGradient(W*0.3,H*0.24,70,W*0.3,H*0.24,W*0.62);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.55,'rgba(0,0,0,.72)'); g.addColorStop(1,'rgba(0,0,0,.97)');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
  },
  golden(cx,P){
    glow(cx,W*0.8,H*0.6,470,'rgba(255,217,160,A)',.8);
    glow(cx,W*0.8,H*0.6,130,'rgba(255,246,224,A)',.9);
    cx.save(); cx.translate(W*0.8,H*0.6); cx.globalAlpha=.09;
    for(let i=0;i<16;i++){ cx.rotate(6.28/16); cx.fillStyle='#FFE9C4';
      cx.beginPath(); cx.moveTo(0,0); cx.lineTo(-620,-24); cx.lineTo(-620,24); cx.fill(); }
    cx.restore();
    cx.globalAlpha=.5; cx.fillStyle='#FFF0D4';
    for(let i=0;i<220;i++){ cx.beginPath(); cx.arc(rnd(0,W),rnd(0,H),rnd(.6,2),0,6.28); cx.fill(); }
    cx.globalAlpha=1;
  },
  soft(cx,P){
    const g=cx.createLinearGradient(W*0.1,0,W,H);
    g.addColorStop(0,'rgba(255,255,255,.28)'); g.addColorStop(.55,'rgba(255,255,255,.03)');
    g.addColorStop(1,'rgba(18,22,26,.52)');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
    glow(cx,W*0.32,H*0.26,330,'rgba(240,236,228,A)',.22);
  },
  neon(cx,P){
    glow(cx,W*0.3,H*0.34,260,'rgba(255,46,99,A)',.7);
    glow(cx,W*0.72,H*0.28,240,'rgba(34,211,238,A)',.65);
    cx.lineCap='round';
    [[P[1%P.length],W*0.18,H*0.26,W*0.44,H*0.26],[P[2%P.length],W*0.6,H*0.2,W*0.86,H*0.2]]
      .forEach(([c,x1,y1,x2,y2])=>{
        cx.strokeStyle=c; cx.lineWidth=13; cx.globalAlpha=.22;
        cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke();
        cx.lineWidth=4; cx.globalAlpha=1; cx.strokeStyle='#FFF';
        cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke();
      });
    cx.globalAlpha=1; cx.fillStyle='rgba(6,9,16,.88)'; cx.fillRect(0,H*0.6,W,H*0.4);
    cx.globalAlpha=.28;
    for(let i=0;i<90;i++){ cx.fillStyle=pick([P[1%P.length],P[2%P.length],'#FFFFFF']);
      cx.fillRect(rnd(0,W),H*0.6+rnd(0,H*0.4),rnd(2,7),rnd(14,60)); }
    cx.globalAlpha=.1; cx.fillStyle='#9FB6C8'; cx.fillRect(0,0,W,H); cx.globalAlpha=1;
  },
  rim(cx,P){
    glow(cx,W*0.5,H*0.72,420,'rgba(191,227,255,A)',.55);
    cx.fillStyle='#05070B';
    cx.beginPath(); cx.ellipse(W*0.5,H*0.62,128,178,0,0,6.28); cx.fill();
    cx.beginPath(); cx.ellipse(W*0.5,H*0.32,64,74,0,0,6.28); cx.fill();
    cx.lineWidth=3.2; cx.strokeStyle='rgba(210,238,255,.92)';
    cx.beginPath(); cx.ellipse(W*0.5,H*0.62,128,178,0,-2.5,.35); cx.stroke();
    cx.beginPath(); cx.ellipse(W*0.5,H*0.32,64,74,0,-2.6,.3); cx.stroke();
    cx.globalAlpha=.15; cx.fillStyle='#9FC7E8'; cx.fillRect(0,0,W,H); cx.globalAlpha=1;
  },
  back(cx,P){
    // atmospheric planes receding, one warm accent behind them
    glow(cx,W*0.56,H*0.44,320,'rgba(240,178,120,A)',.5);
    const layer=(base,al,col)=>{
      cx.globalAlpha=al; cx.fillStyle=col; cx.beginPath(); cx.moveTo(0,H);
      for(let x=0;x<=W;x+=18) cx.lineTo(x, base+Math.sin(x*.012+base)*26+rnd(-8,8));
      cx.lineTo(W,H); cx.fill();
    };
    layer(H*0.54,.3,'#12202C'); layer(H*0.66,.44,'#0D1822'); layer(H*0.8,.72,'#070D14');
    cx.globalAlpha=.9; cx.fillStyle='#05080C'; cx.fillRect(W*0.5-2,H*0.8-13,4,13);
    cx.globalAlpha=1;
  },
  top(cx,P){
    glow(cx,W/2,H*0.16,340,'rgba(245,247,250,A)',.3);
    const g=cx.createRadialGradient(W/2,H*0.44,60,W/2,H/2,W*0.7);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.5)');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
  },
  flat(){}                                    // ornament and print carry no light
};

/* an illuminated border, the way a Persian folio is bounded */
function border(cx,P){
  const m=17, i=30;
  cx.strokeStyle=P[1%P.length]; cx.lineWidth=m*2;
  cx.strokeRect(0,0,W,H);
  cx.strokeStyle=mix(P[0],'#000000',.4); cx.lineWidth=2.5;
  cx.strokeRect(m*2+3,m*2+3,W-(m*2+3)*2,H-(m*2+3)*2);
  cx.strokeStyle=P[P.length-1]; cx.lineWidth=1.4;
  cx.strokeRect(i,i,W-i*2,H-i*2);
  cx.fillStyle=P[P.length-1]; cx.globalAlpha=.85;
  for(let x=m*2+10;x<W-m*2;x+=26){ cx.beginPath(); cx.arc(x,m,3.4,0,6.28); cx.fill();
                                   cx.beginPath(); cx.arc(x,H-m,3.4,0,6.28); cx.fill(); }
  for(let y=m*2+10;y<H-m*2;y+=26){ cx.beginPath(); cx.arc(m,y,3.4,0,6.28); cx.fill();
                                   cx.beginPath(); cx.arc(W-m,y,3.4,0,6.28); cx.fill(); }
  cx.globalAlpha=1;
}

async function make(st){
  const [mark, lit, P] = st.plate;
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const cx=cv.getContext('2d');
  seed(20260810 + st.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)*97);
  ID = st.id;
  const subj = SUBJECT[st.id];
  const lp = LIGHTPOS[lit] || [.4,.3], lx = W*lp[0], ly = H*lp[1];

  if (mark !== 'wash' && mark !== 'flat' && mark !== 'line' && mark !== 'grain') ground(cx,P);
  MARK[mark](cx,P);
  if (subj) BG[subj[0]](cx,P,subj[1]);
  LIGHT[lit](cx,P);
  if (subj){
    FORM[subj[0]](cx,P,lx,ly,subj[1]);
    // one pass of the room's own light over the objects, so they sit in it
    const u=cx.createRadialGradient(lx,ly,0,lx,ly,W*0.9);
    u.addColorStop(0, subj[1]==='cool'?'rgba(214,230,246,.16)':'rgba(255,226,178,.18)');
    u.addColorStop(1,'rgba(0,0,0,.30)');
    cx.fillStyle=u; cx.fillRect(0,0,W,H);
  }

  // flat lighting draws nothing, so painterly marks under it stay unrelieved
  if (lit === 'flat' && (mark === 'impasto' || mark === 'dabs')){
    const g=cx.createRadialGradient(W*.42,H*.4,H*.2,W*.42,H*.4,W*.78);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(8,10,16,.62)');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
  }
  if (st.id === 'miniature' || st.id === 'qajar') border(cx,P);

  grain(cx, mark==='grain' ? 44 : mark==='wash' ? 18 : 12);
  return cv.toDataURL('image/jpeg', 0.82);
}
`;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await browser.newContext()).newPage();
await page.setContent('<body></body>');
await page.addScriptTag({ content: lib });

let total = 0;
for (const st of STYLES) {
  const url = await page.evaluate(s => make(s), st);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  fs.writeFileSync(`${OUT}/${st.id}.jpg`, buf);
  total += buf.length;
  console.log(`${st.id.padEnd(14)} ${st.plate[0].padEnd(8)} ${st.plate[1].padEnd(7)} ${(buf.length/1024).toFixed(0).padStart(3)} KB`);
}
console.log(`\n${STYLES.length} plates, ${(total/1024).toFixed(0)} KB total`);
await browser.close();
