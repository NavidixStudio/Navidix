/* =====================================================================
   NAVIDIX — the AI assistant, server side.

   This exists for one reason: the model key must never reach a browser.
   Everything else here could have been done in the panel — the panel is
   already talking to PostgREST, it could just as easily talk to an LLM.
   It must not, because doing so would put a billable credential in a file
   anyone can read, and the whole security posture of this project rests
   on the opposite: the only key in the client is one that is meant to be
   public and is useless without RLS behind it.

   So the browser calls this, this calls the model, and the key lives in
   the function's environment where it is set with

     supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

   Deploy with

     supabase functions deploy ai-assistant

   ---------------------------------------------------------------------
   What it does NOT do, deliberately:

   It does not write to the content tables. It writes the model's output
   into ai_jobs and stops. Moving that output into a draft is
   ai_apply_job(), which runs in the database under the caller's own
   permissions and always creates a draft. That split is what makes
   "the AI cannot publish on its own" a structural fact rather than a
   promise — this function has no path to `articles` at all.

   It also does not trust the caller's word about who they are. The user's
   JWT is forwarded to PostgREST as-is, so every row it writes is subject
   to the same policies as if the panel had written it. A Viewer calling
   this function directly with a crafted body gets the same refusal the
   panel's policy would have given them.
   ===================================================================== */

const MODEL = 'claude-sonnet-4-5';
const MAX_PROMPT = 4000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/* The shape the panel expects back. Asking for JSON and describing every
   key here — rather than parsing prose afterwards — is what keeps the
   editor from having to guess which paragraph was meant to be the
   excerpt. */
const SCHEMA = `{
  "title": "عنوان مقاله، فارسی، حداکثر ۷۰ نویسه",
  "slug": "نشانی انگلیسی با خط تیره، فقط a-z 0-9 -",
  "excerpt": "خلاصه در یک تا دو جمله",
  "body": "متن کامل مقاله به Markdown با سرتیترهای ## و ###",
  "seo_title": "عنوان سئو، حداکثر ۶۰ نویسه",
  "seo_description": "توضیح متا، حداکثر ۱۵۵ نویسه",
  "keywords": ["کلیدواژه", "کلیدواژه"],
  "tags": ["تگ", "تگ"],
  "headings": ["ساختار سرتیترها به ترتیب"],
  "image_prompt": "پیشنهاد انگلیسی برای ساخت تصویر شاخص"
}`;

const SYSTEM = [
  'تو دستیار تحریریه‌ی «نویدیکس» هستی — یک استودیوی مستقل علم و فناوری که',
  'درباره‌ی هوش مصنوعی، سینما و تولید محتوا می‌نویسد. مخاطب فارسی‌زبان است.',
  '',
  'قواعد نوشتن:',
  '- فارسی روان و دقیق. نه ترجمه‌ی ماشینی، نه لحن تبلیغاتی.',
  '- عدد و ادعا بدون منبع ننویس. اگر چیزی را نمی‌دانی، ننویس.',
  '- سرتیترها باید ساختار واقعی متن باشند، نه تزئین.',
  '- متن Markdown است: ## و ### برای سرتیتر، - برای فهرست. HTML ننویس.',
  '',
  'فقط و فقط یک شیء JSON برگردان، بدون هیچ متن قبل یا بعدش، با این کلیدها:',
  SCHEMA,
].join('\n');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'فقط POST' }, 405);

  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) {
    return json({
      error: 'کلید مدل روی این تابع تنظیم نشده. ' +
             'supabase secrets set ANTHROPIC_API_KEY=… را اجرا کن.',
    }, 500);
  }

  /* The caller's own token. Missing it is not an anonymous request that
     gets a default — it is a refusal, because everything below writes
     rows and rows have owners. */
  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'وارد نشده‌ای' }, 401);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

  let body: { prompt?: string; kind?: string; job_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'بدنه‌ی درخواست JSON معتبر نیست' }, 400);
  }

  const prompt = (body.prompt || '').trim();
  const kind = body.kind || 'article';

  if (prompt.length < 8) return json({ error: 'درخواست خیلی کوتاه است' }, 400);
  if (prompt.length > MAX_PROMPT) return json({ error: 'درخواست خیلی بلند است' }, 400);

  /* PostgREST as the caller, not as the function. Every insert and update
     below is checked against the same policies the panel would hit. */
  const rest = (path: string, init: RequestInit = {}) =>
    fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: ANON,
        Authorization: auth,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(init.headers || {}),
      },
    });

  /* 1 — open the job. If the caller lacks content.create, the policy
     refuses here and the model is never called, so an unauthorised
     request costs nothing. */
  const opened = await rest('ai_jobs', {
    method: 'POST',
    body: JSON.stringify({ kind, prompt, model: MODEL, status: 'pending' }),
  });

  if (!opened.ok) {
    const t = await opened.text();
    return json({ error: 'ثبت درخواست ممکن نشد: ' + t }, opened.status);
  }
  const job = (await opened.json())[0];

  /* 2 — ask the model. */
  let out: Record<string, unknown> | null = null;
  let err: string | null = null;
  let usage: { input_tokens?: number; output_tokens?: number } = {};

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);

    usage = data.usage || {};
    const text: string = (data.content || [])
      .filter((c: { type: string }) => c.type === 'text')
      .map((c: { text: string }) => c.text)
      .join('\n')
      .trim();

    /* Models sometimes wrap JSON in a fence even when asked not to.
       Stripping it is cheaper than a retry, and failing loudly on
       anything else is better than storing half an article. */
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    out = JSON.parse(cleaned);
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  /* 3 — close the job either way. A failed generation that leaves no
     trace is a failure nobody can debug later. */
  await rest(`ai_jobs?id=eq.${job.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: err ? 'failed' : 'done',
      output: out,
      error: err,
      tokens_in: usage.input_tokens ?? null,
      tokens_out: usage.output_tokens ?? null,
      finished_at: new Date().toISOString(),
    }),
  });

  if (err) return json({ error: err, job_id: job.id }, 502);

  /* The draft is not created here. The panel calls ai_apply_job() next,
     which runs in the database under the caller's permissions and always
     produces a draft — this function has no route to the content tables
     at all, which is what makes that guarantee structural. */
  return json({ job_id: job.id, output: out, usage });
});
