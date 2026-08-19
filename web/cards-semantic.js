// Semantic caching, actually running.
//
// This was a reference card because it needs a vector store. It turns out the smallest
// honest version of one fits in a variable: embed the question, compare it against what is
// already cached, and if it is close enough, answer from the cache and never call the model.
//
// Every number here is measured. The embeddings are real, the cosine similarity is computed
// from those vectors, and the cache hits and misses follow from the threshold rather than
// from a script. The last question is included precisely because it should NOT hit — a
// near-match that is not a match is the failure mode this technique buys.

import { el } from './dom.js';
import { embed, cosineSimilarity, EMBED_MODEL } from './gemini.js';
import { measure, isDemo } from './api.js';
import { demoEmbed } from './fixtures.js';
import { costOf, embedCost, usd, PRICING_DATE } from './pricing.js';

const MODEL = 'gemini-3.5-flash';
const THRESHOLD = 0.85;

// One real question, two rewordings of it, and one that merely looks similar.
const QUESTIONS = [
  { text: 'How do I reset my password?', note: 'first ask — nothing cached yet' },
  { text: 'I forgot my password, what now?', note: 'reworded' },
  { text: 'password reset help please', note: 'reworded, terser' },
  { text: 'How do I reset my router?', note: 'one word different, different question' },
];

export function semanticCacheCard(body) {
  const out = el('div', {});
  const button = el('button', { type: 'button' }, 'Run all four');

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Running…';
    out.replaceChildren(el('p', { class: 'muted' }, 'Embedding, comparing, and calling only on a miss…'));

    try {
      const rows = [];
      const cache = []; // { vector, answer, question }
      let generations = 0;
      let genCost = 0;
      let embTokens = 0;

      for (const q of QUESTIONS) {
        const vector = isDemo() ? await demoEmbed(q.text) : await embed(q.text);
        // Embedding input is billed per token; roughly 4 chars per token is close enough
        // for a cost estimate and is labelled as an estimate in the footnote.
        embTokens += Math.ceil(q.text.length / 4);

        let best = { score: 0, entry: null };
        for (const entry of cache) {
          const score = cosineSimilarity(vector, entry.vector);
          if (score > best.score) best = { score, entry };
        }

        const hit = best.score >= THRESHOLD;

        if (hit) {
          rows.push({ q, score: best.score, hit: true, answer: best.entry.answer, matched: best.entry.question });
        } else {
          const result = await measure('semantic', 'ask');
          generations += 1;
          genCost += costOf(result.stats, result.model);
          cache.push({ vector, answer: result.response_text, question: q.text });
          rows.push({ q, score: best.score, hit: false, answer: result.response_text, tokens: result.stats.total_tokens });
        }
      }

      out.replaceChildren(renderResults(rows, { generations, genCost, embTokens }));
    } catch (err) {
      out.replaceChildren(el('p', { class: 'error' }, err.message));
    } finally {
      button.disabled = false;
      button.textContent = 'Run all four';
    }
  });

  body.replaceChildren(
    el('p', { class: 'muted small' },
      `Embeds each question with ${EMBED_MODEL}, compares it to what is already cached, and ` +
      `only calls the model when nothing is within ${THRESHOLD} cosine similarity.`),
    el('div', { class: 'controls' }, [button]),
    out
  );
}

function renderResults(rows, totals) {
  const table = el('table', { class: 'ref-table' }, [
    el('thead', {}, [
      el('tr', {}, ['Question', 'Similarity', 'Outcome'].map((h) => el('th', {}, h))),
    ]),
    el('tbody', {}, rows.map((r) =>
      el('tr', { class: r.hit ? 'hit' : '' }, [
        el('th', { scope: 'row' }, [
          el('div', {}, r.q.text),
          el('div', { class: 'muted small' }, r.q.note),
        ]),
        el('td', {}, r.score > 0 ? r.score.toFixed(3) : '—'),
        el('td', {}, r.hit
          ? el('span', { class: 'hit-badge' }, 'cache hit — model not called')
          : el('span', { class: 'muted' }, `miss — called the model${r.tokens ? ` (${r.tokens.toLocaleString()} tokens)` : ''}`)),
      ])
    )),
  ]);

  const hits = rows.filter((r) => r.hit).length;
  const naiveCost = totals.generations > 0 ? (totals.genCost / totals.generations) * rows.length : 0;
  const actualCost = totals.genCost + embedCost(totals.embTokens);

  const children = [
    table,
    el('p', { class: 'savings' },
      `${hits} of ${rows.length} answered from cache without calling the model. ` +
      `A token cache would have hit on none of them — it needs identical text, not similar meaning.`),
  ];

  if (naiveCost > 0) {
    children.push(
      el('p', { class: 'money' }, [
        el('span', {}, 'Calling every time: '),
        el('strong', {}, usd(naiveCost * 10000)),
        el('span', {}, ' per 10,000 questions. With the cache: '),
        el('strong', {}, usd(actualCost * 10000)),
        el('span', {}, ' — and the saving is on output, the expensive half, because the call never happens.'),
        el('span', { class: 'muted small block' },
          `Hypothetical at list prices as of ${PRICING_DATE}. Embedding tokens estimated at ~4 characters each.`),
      ])
    );
  }

  const wrongHit = rows.find((r) => r.hit && /router/.test(r.q.text));
  children.push(
    el('p', { class: 'muted small' },
      wrongHit
        ? 'Note the router question hit the password cache. That is the failure mode: a threshold loose ' +
          'enough to catch rewordings is loose enough to return a confidently wrong answer.'
        : `The router question scored below ${THRESHOLD} and correctly missed. Move the threshold down and ` +
          'it would hit, returning a confident answer to a question nobody asked — which is the risk this ' +
          'technique buys.')
  );

  return el('div', {}, children);
}
