// List prices, and what a run would cost at volume.
//
// Checked against ai.google.dev/gemini-api/docs/pricing on 2026-08-19, paid tier, standard
// (non-batch) rates, USD per 1,000,000 tokens. These change — the UI says where they came
// from and when, because a dollar figure with no date on it is a liability.
//
// The free tier costs nothing, so every figure here is hypothetical: what this same work
// would cost if it were running in production on the paid tier.

export const PRICING_DATE = '19 August 2026';
export const PRICING_URL = 'https://ai.google.dev/gemini-api/docs/pricing';

// input / output / cached-input read rate, per 1M tokens.
const PRICES = {
  'gemini-3.5-flash': { in: 1.5, out: 9.0, cached: 0.15 },
  'gemini-3-flash-preview': { in: 0.5, out: 3.0, cached: 0.05 },
  'gemini-3.1-flash-lite': { in: 0.25, out: 1.5, cached: 0.025 },
  'gemini-3.1-pro-preview': { in: 2.0, out: 12.0, cached: 0.2 },
  'gemini-3.1-pro': { in: 2.0, out: 12.0, cached: 0.2 },
  'gemini-2.5-flash': { in: 0.3, out: 2.5, cached: 0.03 },
};

const FALLBACK = PRICES['gemini-3.5-flash'];

export const BATCH_DISCOUNT = 0.5;

// Embeddings are priced per input token and have no output. Cheap enough that a semantic
// cache lookup costs a small fraction of the generation call it avoids — which is the
// entire economic argument for one.
export const EMBED_PER_M = 0.15;

export function embedCost(tokens) {
  return (tokens * EMBED_PER_M) / 1e6;
}

// The volume that makes these numbers mean something. One call costs a fraction of a cent;
// the reason any of this matters is that production sends the same request over and over.
export const RUNS_PER_MONTH = 10000;

export function priceFor(model) {
  return PRICES[model] ?? FALLBACK;
}

export function isPriced(model) {
  return Boolean(PRICES[model]);
}

// Cost of a single call, in dollars.
//
// Two details that are easy to get wrong and change the answer materially:
// reasoning tokens are billed as output, not as some separate cheaper thing; and cached
// input is a *subset* of the input count, so it must be subtracted before the full rate is
// applied rather than added on top.
export function costOf(stats, model) {
  const p = priceFor(model);

  const cached = stats.cache_read_tokens ?? 0;
  const freshInput = Math.max(0, (stats.input_tokens ?? 0) - cached);
  const output = (stats.output_tokens ?? 0) + (stats.reasoning_tokens ?? 0);

  return (freshInput * p.in + cached * p.cached + output * p.out) / 1e6;
}

export function atVolume(costPerRun, runs = RUNS_PER_MONTH) {
  return costPerRun * runs;
}

// Sub-cent figures are the norm per call, so a fixed 2dp would print $0.00 for everything
// and teach the opposite of the point.
export function usd(n) {
  if (n === 0) return '$0';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  if (n < 100) return `$${n.toFixed(2)}`;
  return `$${Math.round(n).toLocaleString()}`;
}
