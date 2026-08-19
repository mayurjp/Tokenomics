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
export async function generate(demo, variant, apiKey) {
  const model = variant.model ?? demo.model;
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

// Cheapest possible round trip that proves a key works: no generation, no quota spent.
export async function validateKey(apiKey, model) {
  await countTokens('ok', model, apiKey);
  return true;
}
