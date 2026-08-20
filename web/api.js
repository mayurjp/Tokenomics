// The one place cards get data from. No server: either the visitor's key calls Gemini
// directly, or demo mode serves fabricated numbers.
//
// Mode is decided by whether a key is present, not by a setting. A visitor with no key gets
// a fully working page on fabricated data — which is what makes this publishable without
// anyone's key being spent — and adding a key switches every card to real calls.

import { FORCE_DEMO, demoCatalog, demoCount, demoMeasure } from './fixtures.js';
import { catalog as liveCatalog, findDemo } from './demos.js';
import { countTokens as geminiCount, generate, MissingKeyError } from './gemini.js';
import { getKey } from './keystore.js';
import { DEFAULT_MODEL } from './demos.js';

export { MissingKeyError };

// Demo-only for now: the site ships without a way to supply a key, so every number on it
// is fabricated and nothing is called. The live path below is intact and unreferenced —
// re-enabling it means restoring the settings panel and returning `FORCE_DEMO || !getKey()`
// here, not rebuilding the client.
export function isDemo() {
  return FORCE_DEMO || !getKey();
}

export function getCatalog() {
  return isDemo() ? demoCatalog() : liveCatalog(DEFAULT_MODEL);
}

// A given string always tokenizes to the same number, so asking twice is waste. Promises
// are cached rather than values, so parallel counts of the same text collapse into one
// request; failures are evicted so they stay retryable.
let countCache = new Map();

// Switching between demo numbers and real ones must not serve stale answers from the other
// mode — the cache is keyed by text alone, so it has to be dropped when the mode changes.
export function resetCaches() {
  countCache = new Map();
}

export function countTokens(text) {
  if (countCache.has(text)) return countCache.get(text);

  const pending = (isDemo() ? demoCount(text) : geminiCount(text, DEFAULT_MODEL))
    .catch((err) => {
      countCache.delete(text);
      throw err;
    });

  countCache.set(text, pending);
  return pending;
}

// Deliberately not cached: the point of a measurement is that it really ran.
export async function measure(demoId, variantId) {
  if (isDemo()) return demoMeasure(demoId, variantId);

  const demo = findDemo(demoId);
  const variant = demo?.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error(`Unknown demo variant: ${demoId}/${variantId}`);
  return generate(demo, variant);
}
