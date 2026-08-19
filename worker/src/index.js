// Token Economics Explorer — key-holding proxy.
//
// The static site on GitHub Pages cannot hold the Gemini key: anything the page can
// decrypt, a visitor can read, and the outgoing x-goog-api-key header is visible in the
// Network tab regardless. So the key lives here as a Wrangler secret and never reaches
// the browser. The page stays a pile of static files with no secret in it.

import { WORKFLOWS, findWorkflow, toPublicWorkflow } from './workflows.js';
import { toTokenStats } from './tokenStats.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    try {
      if (request.method === 'GET' && url.pathname === '/api/workflows') {
        return json({ workflows: WORKFLOWS.map(toPublicWorkflow) }, 200, cors);
      }

      if (request.method === 'POST' && url.pathname === '/api/measure') {
        return await handleMeasure(request, env, origin, cors);
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

async function handleMeasure(request, env, origin, cors) {
  // Origin filtering keeps casual scrapers off a shared key. It is NOT authentication —
  // any non-browser client can set whatever Origin it likes. The real containment is that
  // this endpoint can only ever run a prompt from the server-side catalog, plus the rate
  // limit below.
  if (!isAllowedOrigin(origin, env)) {
    return json({ error: 'Origin not allowed' }, 403, cors);
  }

  if (!env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not configured');
    return json({ error: 'Server is not configured' }, 500, cors);
  }

  const limited = await checkRateLimit(request, env);
  if (limited) {
    return json({ error: limited }, 429, cors);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be JSON' }, 400, cors);
  }

  const workflow = findWorkflow(body?.workflowId);
  if (!workflow) {
    return json({ error: `Unknown workflow: ${String(body?.workflowId ?? '')}` }, 400, cors);
  }

  const result = await measure(workflow, env.GEMINI_API_KEY);
  return json(result.body, result.status, cors);
}

// One generateContent call. Errors map Gemini's own error.message through — never the
// raw upstream body, which can carry request detail we don't want to hand out.
async function measure(workflow, apiKey) {
  const response = await fetch(`${GEMINI_BASE}models/${workflow.model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: workflow.prompt }] }],
    }),
  });

  const rawText = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // fall through — the body wasn't JSON
  }

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
    return {
      status: 502,
      body: { error: 'Gemini API response did not include usage metadata' },
    };
  }

  const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

  return {
    status: 200,
    body: {
      model: workflow.model,
      response_text: text,
      stats: toTokenStats(usage),
      raw: usage,
    },
  };
}

// Budget protection. The key is shared by every visitor, so an unthrottled endpoint is an
// unthrottled bill. Uses the Workers rate-limiting binding when one is configured; without
// it the endpoint still works, so local dev needs no extra setup.
async function checkRateLimit(request, env) {
  if (!env.MEASURE_LIMITER) {
    return null;
  }

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
