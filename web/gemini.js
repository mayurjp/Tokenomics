// Direct browser client for the Gemini API.
//
// generativelanguage.googleapis.com sends CORS headers and accepts the preflighted POST
// with x-goog-api-key, so a static page can call it with no server in between. That is the
// whole reason this app has no backend.

import { getKey } from './keystore.js';
import { toTokenStats } from './tokenStats.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/';

export const endpointPath = (model, method) => `POST /v1beta/models/${model}:${method}`;

export class MissingKeyError extends Error {
  constructor() {
    super('Add your Gemini API key to run this for real.');
    this.name = 'MissingKeyError';
  }
}

async function call(path, body, apiKey) {
  const key = apiKey ?? getKey();
  if (!key) throw new MissingKeyError();

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
  } catch {
    // fetch only rejects on network or CORS failure — never on an HTTP error status.
    throw new Error('Could not reach the Gemini API. Check your connection.');
  }

  const raw = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // fall through — not JSON
  }

  if (!response.ok) {
    throw new Error(parsed?.error?.message ?? `Gemini API request failed with status ${response.status}`);
  }
  if (!parsed) throw new Error('Gemini API returned an unreadable response');

  return parsed;
}

export async function countTokens(text, model, apiKey) {
  const parsed = await call(
    `models/${model}:countTokens`,
    { contents: [{ parts: [{ text }] }] },
    apiKey
  );

  return {
    model,
    endpoint: endpointPath(model, 'countTokens'),
    tokens: parsed.totalTokens ?? null,
    chars: text.length,
  };
}

// Builds one generateContent request from a demo variant. The variant is the single place
// that decides what gets sent; this only translates it into the API's shape.
// Exported so the UI can show the request without hand-writing a copy of it. A card that
// displays "this is what gets sent" next to code that sends something else is a lie waiting
// to happen; this way the shown body is built by the same function that sends it.
export function buildRequestBody(demo, variant) {
  const body = { contents: [{ parts: [{ text: variant.prompt }] }] };
  const generationConfig = {};

  if (variant.systemInstruction) {
    body.systemInstruction = { parts: [{ text: variant.systemInstruction }] };
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
    body.generationConfig = generationConfig;
  }

  return body;
}

export async function generate(demo, variant, apiKey) {
  const model = variant.model ?? demo.model;
  const body = buildRequestBody(demo, variant);

  const parsed = await call(`models/${model}:generateContent`, body, apiKey);

  const usage = parsed.usageMetadata;
  if (!usage) throw new Error('Gemini API response did not include usage metadata');

  const candidate = parsed.candidates?.[0];

  return {
    demoId: demo.id,
    variantId: variant.id,
    model,
    endpoint: endpointPath(model, 'generateContent'),
    response_text: candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '',
    // MAX_TOKENS rather than STOP means the cap cut the answer off mid-sentence. The UI
    // says so, otherwise a truncated reply just looks like a bug.
    truncated: candidate?.finishReason === 'MAX_TOKENS',
    stats: toTokenStats(usage),
    raw: usage,
  };
}

// ---- Embeddings -----------------------------------------------------------
//
// What makes semantic caching demonstrable rather than merely describable: embed two
// differently-worded questions, compare the vectors, and the similarity is a real measured
// number rather than an assertion.

export const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_DIMS = 768;

export async function embed(text, apiKey) {
  const parsed = await call(
    `models/${EMBED_MODEL}:embedContent`,
    {
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      output_dimensionality: EMBED_DIMS,
    },
    apiKey
  );

  const values = parsed.embedding?.values ?? parsed.embeddings?.[0]?.values;
  if (!Array.isArray(values)) throw new Error('Embedding response contained no vector.');
  return values;
}

// Cosine similarity. Gemini's embeddings are not guaranteed unit-length at reduced
// dimensionality, so normalise rather than assuming a plain dot product is the cosine.
export function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ---- Batch ----------------------------------------------------------------
//
// Batch is the same model and the same tokens at half price, paid for in latency: Google
// targets 24 hours and usually beats it, but nothing guarantees a fast turnaround. That is
// exactly why this is worth running rather than describing — the wait is the lesson.

export async function createBatch(prompt, model, displayName, apiKey) {
  const parsed = await call(
    `models/${model}:batchGenerateContent`,
    {
      batch: {
        display_name: displayName,
        input_config: {
          requests: {
            requests: [
              { request: { contents: [{ parts: [{ text: prompt }] }] }, metadata: { key: 'demo-1' } },
            ],
          },
        },
      },
    },
    apiKey
  );

  const name = parsed.name ?? parsed.batch?.name;
  if (!name) throw new Error('Batch was created but the API returned no job name.');
  return { name, model };
}

export async function getBatch(name, apiKey) {
  const key = apiKey ?? getKey();
  if (!key) throw new MissingKeyError();

  const response = await fetch(`${BASE}${name}`, { headers: { 'x-goog-api-key': key } });
  const raw = await response.text();

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // fall through
  }

  if (!response.ok) {
    throw new Error(parsed?.error?.message ?? `Could not read batch job (status ${response.status})`);
  }
  return normalizeBatch(parsed);
}

// The batch payload has moved between shapes across API revisions, and the docs do not pin
// down where inline responses land. Rather than guess one path and break silently, look in
// each plausible place and report honestly when nothing is found.
function normalizeBatch(job) {
  const state = job?.metadata?.state ?? job?.state ?? 'JOB_STATE_UNSPECIFIED';

  const inlined =
    job?.response?.inlinedResponses?.inlinedResponses ??
    job?.response?.inlinedResponses ??
    job?.dest?.inlinedResponses?.inlinedResponses ??
    job?.dest?.inlinedResponses ??
    [];

  const first = Array.isArray(inlined) ? inlined[0] : null;
  const inner = first?.response ?? first;
  const candidate = inner?.candidates?.[0];

  return {
    name: job?.name,
    state,
    done: state === 'JOB_STATE_SUCCEEDED' || state === 'JOB_STATE_FAILED' || job?.done === true,
    failed: state === 'JOB_STATE_FAILED' || state === 'JOB_STATE_EXPIRED' || state === 'JOB_STATE_CANCELLED',
    error: job?.error?.message ?? null,
    response_text: candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '',
    // Whether batch returns usage per response is undocumented; if it is absent the UI says
    // "not reported" rather than inventing a zero.
    stats: inner?.usageMetadata ? toTokenStats(inner.usageMetadata) : null,
  };
}

// Cheapest possible round trip that proves a key works: no generation, no quota spent.
export async function validateKey(apiKey, model) {
  await countTokens('ok', model, apiKey);
  return true;
}
