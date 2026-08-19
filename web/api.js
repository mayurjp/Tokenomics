// Every call to the proxy goes through here, so counting, caching and error handling
// are defined once instead of per card.

import { recordCount, recordMeasure } from './session.js';
import { DEMO, demoCatalog, demoCount, demoMeasure } from './fixtures.js';

const API_BASE = (window.API_BASE || '').replace(/\/$/, '');

async function post(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const parsed = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(parsed?.error || `Request failed with status ${response.status}`);
  }
  return parsed;
}

export async function getCatalog() {
  if (DEMO) return demoCatalog();

  const response = await fetch(`${API_BASE}/api/demos`);
  const parsed = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(parsed?.error || `Request failed with status ${response.status}`);
  }
  return parsed;
}

// A given string always tokenizes to the same number, so asking twice is waste. Promises
// are cached rather than values, so parallel counts of the same text collapse into one
// request; failures are evicted so they stay retryable.
const countCache = new Map();

export function countTokens(text) {
  if (countCache.has(text)) return countCache.get(text);

  const pending = (DEMO ? demoCount(text) : post('/api/count', { text }))
    .then((result) => {
      recordCount(result);
      return result;
    })
    .catch((err) => {
      countCache.delete(text);
      throw err;
    });

  countCache.set(text, pending);
  return pending;
}

// Deliberately not cached: the point of a measurement is that it really ran.
export async function measure(demoId, variantId) {
  const result = DEMO
    ? await demoMeasure(demoId, variantId)
    : await post('/api/measure', { demoId, variantId });
  recordMeasure(result);
  return result;
}
