// Token Economics Explorer — key-holding proxy.
//
// The static site on GitHub Pages cannot hold the Gemini key: anything the page can
// decrypt, a visitor can read, and the outgoing x-goog-api-key header is visible in the
// Network tab regardless. So the key lives here as a Wrangler secret and never reaches
// the browser. The page stays a pile of static files with no secret in it.

import { DEMOS, DEFAULT_MODEL, findDemo, findVariant, toPublicDemo } from './demos.js';
import { toTokenStats } from './tokenStats.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/';

// The token counter is the one endpoint that takes arbitrary caller text, which costs the
// proxy its "can only ever run our own prompts" property. Two things keep that acceptable:
// countTokens does no generation (so there is no output bill to run up), and the input is
// capped here. The cap is on characters, not tokens — we cannot know the token count until
// after the call, which is the whole point of the endpoint.
const MAX_COUNT_CHARS = 8000;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    try {
      if (request.method === 'GET' && url.pathname === '/api/demos') {
        return json(
          {
            countEndpoint: endpointPath(DEFAULT_MODEL, 'countTokens'),
            demos: DEMOS.map((d) => toPublicDemo(d, endpointPath)),
          },
          200,
          cors
        );
      }

      if (request.method === 'POST' && url.pathname === '/api/measure') {
        return await handleMeasure(request, env, origin, cors);
      }

      if (request.method === 'POST' && url.pathname === '/api/count') {
        return await handleCount(request, env, origin, cors);
      }

      return json({ error: 'Not found' }, 404, cors);
    } catch (err) {
      // Never surface an exception verbatim — it can carry request details, and in the
      // worst case a header value. Log it where only the operator can see it.
      console.error('Unhandled error', err);
      return json({ error: 'Internal error' }, 500, cors);
    }
  },
};

// Shared preamble for both POST routes: origin, key, rate limit, JSON body.
async function guard(request, env, origin, cors) {
  // Origin filtering keeps casual scrapers off a shared key. It is NOT authentication —
  // any non-browser client can set whatever Origin it likes.
  if (!isAllowedOrigin(origin, env)) {
    return { error: json({ error: 'Origin not allowed' }, 403, cors) };
  }
  if (!env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not configured');
    return { error: json({ error: 'Server is not configured' }, 500, cors) };
  }

  const limited = await checkRateLimit(request, env);
  if (limited) {
    return { error: json({ error: limited }, 429, cors) };
  }

  try {
    return { body: await request.json() };
  } catch {
    return { error: json({ error: 'Request body must be JSON' }, 400, cors) };
  }
}

async function handleMeasure(request, env, origin, cors) {
  const { error, body } = await guard(request, env, origin, cors);
  if (error) return error;

  const demo = findDemo(body?.demoId);
  if (!demo) {
    return json({ error: `Unknown demo: ${String(body?.demoId ?? '')}` }, 400, cors);
  }

  const variant = findVariant(demo, body?.variantId);
  if (!variant) {
    return json({ error: `Unknown variant: ${String(body?.variantId ?? '')}` }, 400, cors);
  }

  const result = await measure(demo, variant, env.GEMINI_API_KEY);
  return json(result.body, result.status, cors);
}

async function handleCount(request, env, origin, cors) {
  const { error, body } = await guard(request, env, origin, cors);
  if (error) return error;

  const text = body?.text;
  if (typeof text !== 'string' || text.length === 0) {
    return json({ error: 'text is required' }, 400, cors);
  }
  if (text.length > MAX_COUNT_CHARS) {
    return json({ error: `text is limited to ${MAX_COUNT_CHARS} characters` }, 400, cors);
  }

  const response = await fetch(`${GEMINI_BASE}models/${DEFAULT_MODEL}:countTokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text }] }] }),
  });

  const parsed = await readJson(response);

  if (!response.ok) {
    const message = parsed?.error?.message ?? `countTokens failed with status ${response.status}`;
    return json({ error: message }, response.status === 429 ? 429 : 502, cors);
  }

  return json(
    {
      model: DEFAULT_MODEL,
      endpoint: endpointPath(DEFAULT_MODEL, 'countTokens'),
      tokens: parsed?.totalTokens ?? null,
      chars: text.length,
    },
    200,
    cors
  );
}

// One generateContent call, assembled from a server-side variant.
async function measure(demo, variant, apiKey) {
  const model = variant.model ?? demo.model;
  const requestBody = { contents: [{ parts: [{ text: variant.prompt }] }] };
  const generationConfig = {};

  if (variant.systemInstruction) {
    requestBody.systemInstruction = { parts: [{ text: variant.systemInstruction }] };
  }
  if (typeof variant.maxOutputTokens === 'number') {
    generationConfig.maxOutputTokens = variant.maxOutputTokens;
  }
  if (variant.json) {
    generationConfig.responseMimeType = 'application/json';
  }
  // thinkingBudget: 0 is the switch that actually turns reasoning off, and it is the
  // portable one — thinkingLevel 'minimal' is rejected outright by some 3.x models. The
  // budget is a hint and gets overshot; only 0 is reliably honored.
  if (variant.thinkingBudget === 0) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  if (Object.keys(generationConfig).length > 0) {
    requestBody.generationConfig = generationConfig;
  }

  const response = await fetch(`${GEMINI_BASE}models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(requestBody),
  });

  const parsed = await readJson(response);

  if (!response.ok) {
    const message =
      parsed?.error?.message ?? `Gemini API request failed with status ${response.status}`;
    // Upstream 4xx is our problem, not the caller's: a bad key or an exhausted quota is a
    // server-side condition here, since the caller never supplied either.
    return { status: response.status === 429 ? 429 : 502, body: { error: message } };
  }

  if (!parsed) {
    return { status: 502, body: { error: 'Gemini API returned an unreadable response' } };
  }

  const usage = parsed.usageMetadata;
  if (!usage) {
    return { status: 502, body: { error: 'Gemini API response did not include usage metadata' } };
  }

  const candidate = parsed.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

  return {
    status: 200,
    body: {
      demoId: demo.id,
      variantId: variant.id,
      model,
      endpoint: endpointPath(model, 'generateContent'),
      response_text: text,
      // MAX_TOKENS rather than STOP means the cap cut the answer off mid-sentence. The UI
      // says so, otherwise a truncated reply just looks like a bug.
      truncated: candidate?.finishReason === 'MAX_TOKENS',
      stats: toTokenStats(usage),
      raw: usage,
    },
  };
}

async function readJson(response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Shown in the UI so each card names the Gemini endpoint behind it. Derived here rather
// than hardcoded in the frontend so there is one source of truth for what was actually hit.
function endpointPath(model, method) {
  return `POST /v1beta/models/${model}:${method}`;
}

// Budget protection. The key is shared by every visitor, so an unthrottled endpoint is an
// unthrottled bill. Uses the Workers rate-limiting binding when one is configured; without
// it the endpoint still works, so local dev needs no extra setup.
async function checkRateLimit(request, env) {
  if (!env.MEASURE_LIMITER) return null;

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { success } = await env.MEASURE_LIMITER.limit({ key: ip });
  return success ? null : 'Rate limit reached — wait a minute and try again.';
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin, env) {
  const allowed = allowedOrigins(env);
  // No allowlist configured (local dev) → don't lock the developer out of their own worker.
  if (allowed.length === 0) return true;
  return origin !== null && allowed.includes(origin);
}

function corsHeaders(origin, env) {
  const allowed = allowedOrigins(env);
  // Echo the caller's origin only when it is on the list — never '*', which would let any
  // page on the internet spend this key from a visitor's browser.
  const allowOrigin =
    allowed.length === 0 ? (origin ?? '*') : allowed.includes(origin) ? origin : allowed[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
