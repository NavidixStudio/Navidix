import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
import fs from 'fs';

/* Style plates, drawn rather than downloaded.
   Every image host is blocked from this environment, so instead of a stock
   photo each style gets a plate built from the thing that actually defines
   it — impasto ridges for oil, blooming edges for watercolour, halftone for
   gouache, one pool of light in the dark for chiaroscuro. They are abstract
   on purpose: they show a style's palette, light direction and mark-making
   without pretending to be an example of the prompt's output. Each writes to
   prompts/<id>.jpg, so dropping a real render over one later is a file swap. */

const OUT = '/home/user/Navidix/prompts';
fs.mkdirSync(OUT, { recursive: true });

const W = 800, H = 500;

const draw = `
const R = (s => () => (s = s*16807 % 2147483647) / 2147483647)(20260810);
const rnd = (a,b) => a + R()*(b-a);
const pick = a => a[(R()*a.length)|0];

function grain(cx, amt){
  const d = cx.getImageData(0,0,${W},${H}), p = d.data;
  for (let i=0;i<p.length;i+=4){ const n=(R()-.5)*amt; p[i]+=n; p[i+1]+=n; p[i+2]+=n; }
  cx.putImageData(d,0,0);
}
function wash(cx, cols){
  const g = cx.createLinearGradient(0,0,${W},${H});
  cols.forEach((c,i)=>g.addColorStop(i/(cols.length-1), c));
  cx.fillStyle = g; cx.fillRect(0,0,${W},${H});
}
function vignette(cx, a){
  const g = cx.createRadialGradient(${W/2},${H*0.44},60,${W/2},${H/2},${W*0.72});
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,'+a+')');
  cx.fillStyle=g; cx.fillRect(0,0,${W},${H});
}
function glow(cx,x,y,r,c,a){
  const g=cx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,c.replace('ALPHA',a)); g.addColorStop(1,c.replace('ALPHA',0));
  cx.fillStyle=g; cx.fillRect(0,0,${W},${H});
}

const PLATES = {
  /* thick loaded strokes, each with a lit ridge and a shadowed one */
  oil(cx,P){
    wash(cx,[P[0],'#12100C',P[0]]);
    for(let i=0;i<300;i++){
      const x=rnd(-40,${W}), y=rnd(-20,${H}), l=rnd(30,120), w=rnd(9,26), a=rnd(-0.5,0.5);
      cx.save(); cx.translate(x,y); cx.rotate(a);
      const c=pick(P); cx.globalAlpha=rnd(.35,.9);
      cx.fillStyle=c; cx.fillRect(0,0,l,w);
      cx.globalAlpha=rnd(.2,.5); cx.fillStyle='rgba(255,240,215,.5)'; cx.fillRect(0,0,l,2.2);
      cx.fillStyle='rgba(0,0,0,.45)'; cx.fillRect(0,w-2.2,l,2.2);
      cx.restore();
    }
    cx.globalAlpha=1; glow(cx,${W*0.3},${H*0.24},420,'rgba(255,226,178,ALPHA)',.30);
    vignette(cx,.62); grain(cx,16);
  },
  /* blooming wet edges over paper, and real untouched white */
  watercolor(cx,P){
    cx.fillStyle='#F4F1E8'; cx.fillRect(0,0,${W},${H});
    for(let i=0;i<26;i++){
      const x=rnd(60,${W-60}), y=rnd(50,${H-50}), r=rnd(50,160), c=pick(P);
      for(let k=0;k<7;k++){
        cx.beginPath(); cx.globalAlpha=.06;
        cx.fillStyle=c;
        cx.ellipse(x+rnd(-14,14), y+rnd(-14,14), r*rnd(.6,1), r*rnd(.5,.9), rnd(0,6.28),0,6.28);
        cx.fill();
      }
      cx.globalAlpha=.10; cx.strokeStyle=c; cx.lineWidth=2;
      cx.beginPath(); cx.ellipse(x,y,r*.92,r*.72,rnd(0,6.28),0,6.28); cx.stroke();
    }
    cx.globalAlpha=1; grain(cx,20);
  },
  /* flat blocks, four colours, print misregistration */
  gouache(cx,P){
    cx.fillStyle='#EFE7D8'; cx.fillRect(0,0,${W},${H});
    const bands=[[0,.42],[.42,.62],[.62,1]];
    bands.forEach((b,i)=>{ cx.fillStyle=P[i%P.length];
      cx.fillRect(0,${H}*b[0],${W},${H}*(b[1]-b[0])); });
    cx.fillStyle=P[2]; cx.beginPath(); cx.arc(${W*0.68},${H*0.34},96,0,6.28); cx.fill();
    cx.globalAlpha=.5; cx.fillStyle=P[1];
    cx.beginPath(); cx.moveTo(0,${H}); cx.lineTo(${W*0.42},${H*0.44}); cx.lineTo(${W*0.8},${H}); cx.fill();
    cx.globalAlpha=.16; cx.fillStyle='#E4572E';
    for(let y=4;y<${H};y+=7) for(let x=4;x<${W};x+=7){ cx.fillRect(x+1.5,y+1.5,1.6,1.6); }
    cx.globalAlpha=1; grain(cx,10);
  },
  /* short dabs of unmixed pigment, high key */
  impressionist(cx,P){
    wash(cx,[P[4],P[0]]);
    const hz = 280;                                                      // a horizon to organise the dabs
    cx.fillStyle=P[3]; cx.globalAlpha=.5; cx.fillRect(0,hz,800,500-hz);
    cx.globalAlpha=1;
    for(let i=0;i<1500;i++){
      const y=rnd(0,500), x=rnd(0,800);
      const sky = y<hz;
      const col = sky ? pick([P[0],P[1],P[4],'#DCE8F2']) : pick([P[3],P[2],P[1],'#8FA86E']);
      cx.save(); cx.translate(x,y); cx.rotate(sky?rnd(-.35,.35):rnd(1.1,1.9));
      cx.globalAlpha=rnd(.35,.85); cx.fillStyle=col;
      cx.fillRect(0,0,rnd(16,34),rnd(7,12));                            // long enough to read
      cx.restore();
    }
    cx.globalAlpha=1; glow(cx,576,100,300,'rgba(255,248,214,ALPHA)',.5);
    grain(cx,8);
  },
  /* flat ornament, gold on lapis, no perspective */
  miniature(cx,P){
    cx.fillStyle=P[0]; cx.fillRect(0,0,${W},${H});
    cx.strokeStyle=P[1]; cx.lineWidth=3; cx.strokeRect(22,22,${W-44},${H-44});
    cx.lineWidth=1; cx.strokeRect(32,32,${W-64},${H-64});
    cx.fillStyle=P[2]; cx.fillRect(32,32,${W-64},${H-64});
    // interlaced arcs, the way an illuminated border is set out
    cx.strokeStyle=P[1]; cx.globalAlpha=.85;
    for(let i=0;i<11;i++){
      const cx0=60+i*68;
      for(let j=0;j<6;j++){
        cx.lineWidth=j%2?1:2; cx.beginPath();
        cx.arc(cx0, 60+j*74, 30, 0, Math.PI, j%2===0); cx.stroke();
      }
    }
    cx.globalAlpha=.5; cx.fillStyle=P[1];
    for(let i=0;i<48;i++){ cx.beginPath(); cx.arc(rnd(46,${W-46}),rnd(46,${H-46}),rnd(2,5),0,6.28); cx.fill(); }
    cx.globalAlpha=1; grain(cx,8);
  },
  /* layered haze, silhouettes reading front to back, one warm accent */
  concept(cx,P){
    wash(cx,['#0A1018',P[1]]);
    glow(cx,${W*0.54},${H*0.44},300,'rgba(240,168,104,ALPHA)',.55);
    const layer=(base,alpha,col)=>{
      cx.globalAlpha=alpha; cx.fillStyle=col; cx.beginPath(); cx.moveTo(0,${H});
      let y=base; for(let x=0;x<=${W};x+=18){ y=base+Math.sin(x*.012+base)*26+rnd(-9,9); cx.lineTo(x,y); }
      cx.lineTo(${W},${H}); cx.fill();
    };
    layer(${H*0.52},.32,'#12202C'); layer(${H*0.64},.45,'#0D1822'); layer(${H*0.78},.72,'#070D14');
    cx.globalAlpha=.9; cx.fillStyle='#05080C'; cx.fillRect(${W*0.5-2},${H*0.78-13},4,13); // figure for scale
    cx.globalAlpha=1; vignette(cx,.5); grain(cx,10);
  },
  /* hatching, construction lines left in */
  graphite(cx,P){
    cx.fillStyle=P[0]; cx.fillRect(0,0,800,500);
    const fx=368, fy=250, fr=150;
    // hatching pools into a form instead of scattering evenly
    for(const [ang,dens,alpha] of [[-0.6,900,.30],[0.55,700,.24],[1.35,500,.18]]){
      cx.strokeStyle='rgba(28,28,30,1)'; cx.lineWidth=1.1;
      for(let i=0;i<dens;i++){
        const x=rnd(fx-230,fx+230), y=rnd(fy-190,fy+190);
        const d=Math.hypot((x-fx)/230,(y-fy)/190);
        if (d>1) continue;
        cx.globalAlpha=alpha*(1-d)*rnd(.6,1.25);
        const l=rnd(26,74);
        cx.beginPath(); cx.moveTo(x,y); cx.lineTo(x+Math.cos(ang)*l,y+Math.sin(ang)*l); cx.stroke();
      }
    }
    cx.globalAlpha=.9; cx.strokeStyle='rgba(22,22,24,.9)'; cx.lineWidth=2;   // contour
    cx.beginPath(); cx.ellipse(fx,fy,150,196,0,0,6.28); cx.stroke();
    cx.globalAlpha=.42; cx.strokeStyle='rgba(120,120,124,.9)'; cx.lineWidth=1;
    cx.strokeRect(fx-168,fy-214,336,428);                                     // construction, left in
    cx.beginPath(); cx.moveTo(fx-168,fy); cx.lineTo(fx+168,fy);
    cx.moveTo(fx,fy-214); cx.lineTo(fx,fy+214); cx.stroke();
    cx.globalAlpha=1; grain(cx,13);
  },
  /* one softbox at 45, falloff, seamless backdrop */
  studio(cx,P){
    wash(cx,['#17171A',P[0]]);
    glow(cx,272,140,300,'rgba(120,116,112,ALPHA)',.5);                     // backdrop falloff
    const hx=400, hy=210;
    cx.fillStyle='#2E2A27';                                              // shoulders
    cx.beginPath(); cx.ellipse(hx,475,190,130,0,0,6.28); cx.fill();
    cx.beginPath(); cx.ellipse(hx,hy,86,108,0,0,6.28); cx.fill();        // head
    // key at 45 from upper inline-start, so the far cheek falls off
    const g=cx.createRadialGradient(hx-70,hy-70,10,hx-70,hy-70,260);
    g.addColorStop(0,'rgba(234,223,210,.92)'); g.addColorStop(.45,'rgba(200,186,172,.34)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    cx.save(); cx.globalCompositeOperation='lighter'; cx.fillStyle=g;
    cx.beginPath(); cx.ellipse(hx,hy,86,108,0,0,6.28); cx.fill();
    cx.beginPath(); cx.ellipse(hx,475,190,130,0,0,6.28); cx.fill(); cx.restore();
    glow(cx,hx+96,hy-104,110,'rgba(255,252,246,ALPHA)',.5);              // hair light
    vignette(cx,.72); grain(cx,9);
  },
  /* available light, imperfect, grain forward */
  doc(cx,P){
    wash(cx,['#4A4B46',P[1],'#2B2C29']);
    glow(cx,496,170,340,'rgba(255,242,214,ALPHA)',.5);                     // sun down the street
    cx.globalAlpha=.75; cx.fillStyle='#26272400';
    // receding building blocks, one-point, the way a street reads
    for(let i=0;i<6;i++){
      const w=rnd(70,150), x=i<3? rnd(0,180) : rnd(800-220,800-60);
      cx.globalAlpha=.5-i*.05; cx.fillStyle=i%2?'#3A3B37':'#22231F';
      cx.fillRect(x, rnd(20,90), w, 500);
    }
    cx.globalAlpha=.92; cx.fillStyle='#191A17';                          // walking figures
    [[272,390,.75],[440,350,.55],[544,325,.4]].forEach(([x,y,sc])=>{
      cx.beginPath(); cx.ellipse(x,y-46*sc,11*sc,13*sc,0,0,6.28); cx.fill();
      cx.fillRect(x-13*sc,y-34*sc,26*sc,52*sc);
      cx.fillRect(x-11*sc,y+16*sc,9*sc,30*sc); cx.fillRect(x+3*sc,y+16*sc,9*sc,30*sc);
    });
    cx.globalAlpha=1; vignette(cx,.5); grain(cx,46);                     // grain forward
  },
  /* anamorphic bars, teal/orange, halation around the highlight */
  film35(cx,P){
    wash(cx,['#0B1219',P[1]]);
    glow(cx,${W*0.62},${H*0.46},260,'rgba(224,162,107,ALPHA)',.7);
    glow(cx,${W*0.2},${H*0.6},280,'rgba(47,93,107,ALPHA)',.6);
    glow(cx,${W*0.62},${H*0.46},110,'rgba(255,214,170,ALPHA)',.5);        // halation core
    cx.globalAlpha=.22; cx.fillStyle='#8FD8FF';
    cx.save(); cx.translate(${W*0.62},${H*0.46}); cx.rotate(-.06);
    cx.fillRect(-360,-2.5,720,5); cx.restore();                            // anamorphic streak
    cx.globalAlpha=1; cx.fillStyle='#04060A';
    cx.fillRect(0,0,${W},46); cx.fillRect(0,${H-46},${W},46);              // 2.39:1 bars
    grain(cx,26);
  },
  /* controlled specular on a polished surface */
  product(cx,P){
    wash(cx,[P[0],'#1A2028',P[0]]);
    glow(cx,${W/2},${H*0.2},340,'rgba(245,247,250,ALPHA)',.30);
    cx.globalAlpha=.9;
    const g=cx.createLinearGradient(0,${H*0.36},0,${H*0.72});
    g.addColorStop(0,'#8FA2B4'); g.addColorStop(.5,'#E9F1F8'); g.addColorStop(1,'#4C5A66');
    cx.fillStyle=g; cx.beginPath();
    cx.roundRect(${W*0.34},${H*0.3},${W*0.32},${H*0.38},14); cx.fill();
    cx.globalAlpha=.42; cx.scale(1,-1);                                     // reflection
    cx.fillStyle=g; cx.beginPath();
    cx.roundRect(${W*0.34},-${H*0.68}-${H*0.3},${W*0.32},${H*0.3},14); cx.fill();
    cx.setTransform(1,0,0,1,0,0);
    cx.globalAlpha=.85; cx.fillStyle='rgba(255,255,255,.85)';
    cx.beginPath(); cx.roundRect(${W*0.37},${H*0.33},${W*0.06},${H*0.3},6); cx.fill();
    cx.globalAlpha=1; vignette(cx,.5); grain(cx,7);
  },
  /* low sun behind, long rake, dust in the beam */
  golden(cx,P){
    wash(cx,[P[0],'#7A4526',P[1]]);
    glow(cx,${W*0.8},${H*0.62},480,'rgba(255,217,160,ALPHA)',.85);
    glow(cx,${W*0.8},${H*0.62},130,'rgba(255,246,224,ALPHA)',.9);
    cx.save(); cx.translate(${W*0.8},${H*0.62}); cx.globalAlpha=.10;
    for(let i=0;i<16;i++){ cx.rotate(6.28/16); cx.fillStyle='#FFE9C4';
      cx.beginPath(); cx.moveTo(0,0); cx.lineTo(-620,-24); cx.lineTo(-620,24); cx.fill(); }
    cx.restore();
    cx.globalAlpha=.55; cx.fillStyle='#FFF0D4';
    for(let i=0;i<260;i++){ cx.beginPath(); cx.arc(rnd(0,${W}),rnd(0,${H}),rnd(.6,2.1),0,6.28); cx.fill(); }
    cx.globalAlpha=.75; cx.fillStyle='#1A0E08';
    cx.beginPath(); cx.moveTo(0,${H}); cx.lineTo(0,${H*0.8});
    for(let x=0;x<=${W};x+=22) cx.lineTo(x,${H*0.8}+Math.sin(x*.02)*14);
    cx.lineTo(${W},${H}); cx.fill();
    cx.globalAlpha=1; grain(cx,14);
  },
  /* one hard source, most of the frame crushed black */
  chiaro(cx,P){
    cx.fillStyle='#050506'; cx.fillRect(0,0,${W},${H});
    glow(cx,${W*0.3},${H*0.24},250,'rgba(240,221,188,ALPHA)',.95);
    glow(cx,${W*0.3},${H*0.24},90,'rgba(255,246,228,ALPHA)',.9);
    cx.globalAlpha=.55; cx.fillStyle=P[1];
    cx.beginPath(); cx.ellipse(${W*0.34},${H*0.52},130,170,-.3,0,6.28); cx.fill();
    cx.globalAlpha=1;
    const g=cx.createRadialGradient(${W*0.3},${H*0.24},70,${W*0.3},${H*0.24},${W*0.62});
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.55,'rgba(0,0,0,.72)'); g.addColorStop(1,'rgba(0,0,0,.97)');
    cx.fillStyle=g; cx.fillRect(0,0,${W},${H});
    grain(cx,12);
  },
  /* two complementary tubes, fog, wet ground */
  neon(cx,P){
    cx.fillStyle=P[0]; cx.fillRect(0,0,${W},${H});
    glow(cx,${W*0.3},${H*0.34},260,'rgba(255,46,99,ALPHA)',.75);
    glow(cx,${W*0.72},${H*0.28},240,'rgba(34,211,238,ALPHA)',.7);
    cx.lineCap='round';
    [[P[1],${W*0.18},${H*0.26},${W*0.44},${H*0.26}],[P[2],${W*0.6},${H*0.2},${W*0.86},${H*0.2}],
     [P[1],${W*0.62},${H*0.42},${W*0.62},${H*0.2}]].forEach(([c,x1,y1,x2,y2])=>{
      cx.strokeStyle=c; cx.lineWidth=13; cx.globalAlpha=.22;
      cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke();
      cx.lineWidth=4; cx.globalAlpha=1; cx.strokeStyle='#FFF';
      cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke();
    });
    cx.globalAlpha=1; cx.fillStyle='rgba(6,9,16,.9)'; cx.fillRect(0,${H*0.6},${W},${H*0.4});
    cx.globalAlpha=.3;                                                     // wet reflections
    for(let i=0;i<90;i++){ cx.fillStyle=pick([P[1],P[2],'#FFFFFF']);
      cx.fillRect(rnd(0,${W}),${H*0.6}+rnd(0,${H*0.4}),rnd(2,7),rnd(14,60)); }
    cx.globalAlpha=.12; cx.fillStyle='#9FB6C8'; cx.fillRect(0,0,${W},${H}); // fog
    cx.globalAlpha=1; grain(cx,20);
  },
  /* indirect daylight, gentle falloff, bounce on the shadow side */
  window(cx,P){
    wash(cx,[P[0],P[1],P[2]]);
    const g=cx.createLinearGradient(${W*0.1},0,${W},${H});
    g.addColorStop(0,'rgba(255,255,255,.72)'); g.addColorStop(.55,'rgba(255,255,255,.06)');
    g.addColorStop(1,'rgba(20,24,28,.55)');
    cx.fillStyle=g; cx.fillRect(0,0,${W},${H});
    cx.globalAlpha=.5; cx.fillStyle='#FFFFFF';                             // the window itself
    cx.fillRect(${W*0.06},${H*0.12},${W*0.2},${H*0.56});
    cx.globalAlpha=.7; cx.strokeStyle='#8E9AA3'; cx.lineWidth=5;
    cx.beginPath(); cx.moveTo(${W*0.16},${H*0.12}); cx.lineTo(${W*0.16},${H*0.68});
    cx.moveTo(${W*0.06},${H*0.4}); cx.lineTo(${W*0.26},${H*0.4}); cx.stroke();
    cx.globalAlpha=1; grain(cx,9);
  },
  /* near silhouette, contour traced in light, haze to separate */
  rim(cx,P){
    wash(cx,[P[0],P[1]]);
    glow(cx,${W*0.5},${H*0.72},420,'rgba(191,227,255,ALPHA)',.6);
    cx.fillStyle='#05070B';
    cx.beginPath(); cx.ellipse(${W*0.5},${H*0.62},128,178,0,0,6.28); cx.fill();
    cx.beginPath(); cx.ellipse(${W*0.5},${H*0.32},64,74,0,0,6.28); cx.fill();
    cx.lineWidth=3.2; cx.strokeStyle='rgba(210,238,255,.92)';
    cx.beginPath(); cx.ellipse(${W*0.5},${H*0.62},128,178,0,-2.5,.35); cx.stroke();
    cx.beginPath(); cx.ellipse(${W*0.5},${H*0.32},64,74,0,-2.6,.3); cx.stroke();
    cx.globalAlpha=.16; cx.fillStyle='#9FC7E8'; cx.fillRect(0,0,${W},${H});
    cx.globalAlpha=1; vignette(cx,.55); grain(cx,12);
  }
};

async function make(id, pal){
  const cv = document.createElement('canvas');
  cv.width = ${W}; cv.height = ${H};
  const cx = cv.getContext('2d');
  PLATES[id](cx, pal);
  return cv.toDataURL('image/jpeg', 0.82);
}
`;

const PALETTES = {
  oil:['#3B2A1C','#8A5A2B','#E8C88A','#5E3A1E','#C79A5B'],
  watercolor:['#8FC7D8','#D98C9B','#A8C6A1','#E0C071'],
  gouache:['#2B4162','#E4572E','#F4D35E'],
  impressionist:['#7FA5C4','#EBD9A0','#C98BA0','#9FBF8E','#F2E2C2'],
  miniature:['#0E3E52','#C9A227','#1E5B70'],
  concept:['#141A22','#3E6C8E','#F0A868'],
  graphite:['#EDEBE7','#8B8B8B','#2A2A2A'],
  studio:['#1A1A1D','#6E6A66','#EADFD2'],
  doc:['#3A3B38','#9C8C74','#D6D2CA'],
  film35:['#101820','#2F5D6B','#E0A26B'],
  product:['#0E0F12','#4C5A66','#F5F7FA'],
  golden:['#2A1B14','#C9743B','#FFD9A0'],
  chiaro:['#0A0A0C','#5E4632','#F0DDBC'],
  neon:['#0B0F1A','#FF2E63','#22D3EE'],
  window:['#E8E4DC','#A8B2B8','#4A4E52'],
  rim:['#08090C','#1F3A4D','#BFE3FF'],
};

const browser = await chromium.launch({ args:['--no-sandbox'] });
const page = await (await browser.newContext()).newPage();
await page.setContent('<body></body>');
await page.addScriptTag({ content: draw });

for (const [id, pal] of Object.entries(PALETTES)){
  const url = await page.evaluate(([i,p]) => make(i,p), [id, pal]);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  fs.writeFileSync(`${OUT}/${id}.jpg`, buf);
  console.log(`${id.padEnd(14)} ${(buf.length/1024).toFixed(0).padStart(3)} KB`);
}
await browser.close();
console.log('\ntotal', (fs.readdirSync(OUT).reduce((a,f)=>a+fs.statSync(`${OUT}/${f}`).size,0)/1024).toFixed(0), 'KB');
