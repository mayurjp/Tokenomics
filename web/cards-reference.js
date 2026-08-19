// Reference cards: the three Tier C topics that cannot honestly be demonstrated live.
//
// Batch results arrive hours later, semantic caching needs a vector store, and FinOps is an
// aggregation discipline rather than a request-level technique. Faking any of them with a
// live-looking button would teach the wrong thing, so these state their case in numbers and
// say plainly that nothing is being called.
//
// Prices are Gemini list prices checked against ai.google.dev/gemini-api/docs/pricing on
// 2026-08-19, for gemini-3.5-flash. They change — re-check before relying on them.

import { el } from './dom.js';
import { priceFor, usd, PRICING_DATE, BATCH_DISCOUNT } from './pricing.js';

const { in: INPUT_PER_M, out: OUTPUT_PER_M } = priceFor('gemini-3.5-flash');

function table(rows, headers) {
  return el('table', { class: 'ref-table' }, [
    el('thead', {}, [el('tr', {}, headers.map((h) => el('th', {}, h)))]),
    el('tbody', {}, rows.map((r) =>
      el('tr', {}, r.map((cell, i) =>
        i === 0 ? el('th', { scope: 'row' }, cell) : el('td', {}, cell))))),
  ]);
}

function sourceNote(text) {
  return el('p', { class: 'muted small source' }, text);
}

// ---- C1: batch ------------------------------------------------------------
export function batchCard(body) {
  // A concrete workload rather than an abstract percentage: 100k requests is where the
  // decision actually starts to matter.
  const requests = 100000;
  const inTok = 800;
  const outTok = 250;

  const standard = (requests * inTok * INPUT_PER_M + requests * outTok * OUTPUT_PER_M) / 1e6;
  const batch = standard * (1 - BATCH_DISCOUNT);

  body.replaceChildren(
    el('p', {}, `100,000 requests of ${inTok} input and ${outTok} output tokens, on gemini-3.5-flash:`),
    table(
      [
        ['Interactive', usd(standard), 'answer in seconds'],
        ['Batch', usd(batch), 'answer within hours'],
        ['Saved', usd(standard - batch), `${BATCH_DISCOUNT * 100}% off input and output`],
      ],
      ['', 'Cost', 'Latency']
    ),
    el('p', { class: 'savings' },
      'Batch is the same model and the same tokens at half price. The only thing traded away is ' +
      'latency, which costs nothing on work no human is waiting for.'),
    el('p', { class: 'muted small' },
      'Suits bulk classification, backfills and offline analysis. Useless for chat.'),
    sourceNote(`List prices for gemini-3.5-flash, checked ${PRICING_DATE}. Verify before relying on them.`)
  );
}

// ---- C2: semantic caching -------------------------------------------------
export function semanticCacheCard(body) {
  body.replaceChildren(
    el('p', {}, 'Three ways of asking one question:'),
    el('pre', { class: 'prompt small' },
      ['How do I reset my password?',
       'I forgot my password, what now?',
       'password reset help please'].join('\n')),
    table(
      [
        ['Token cache', 'no', 'needs identical text, not similar meaning'],
        ['Semantic cache', 'yes', 'matches by meaning, skips the model entirely'],
      ],
      ['', 'Hits on all three?', 'Why']
    ),
    el('p', { class: 'savings' },
      'A token cache discounts the input you resend. A semantic cache avoids the call altogether — ' +
      'so it saves the output too, which is the expensive half.'),
    el('p', { class: 'muted small' },
      'Not free: it needs a vector store and an embedding call on every lookup, and a wrong ' +
      'match returns a confidently irrelevant answer. That risk is why this is a reference ' +
      'card and not a live demo.')
  );
}

// ---- C3: FinOps -----------------------------------------------------------
export function finopsCard(body) {
  const rows = [
    ['Ticket summarizer', '412,000', usd(412000 * INPUT_PER_M / 1e6 + 96000 * OUTPUT_PER_M / 1e6), '$0.0081'],
    ['Search rewriter', '1,940,000', usd(1940000 * INPUT_PER_M / 1e6 + 210000 * OUTPUT_PER_M / 1e6), '$0.0004'],
    ['Onboarding chat', '88,000', usd(88000 * INPUT_PER_M / 1e6 + 140000 * OUTPUT_PER_M / 1e6), '$0.0192'],
  ];

  body.replaceChildren(
    el('p', {}, 'The same numbers this page measures, aggregated by feature:'),
    table(rows, ['Feature', 'Input tokens / mo', 'Cost / mo', 'Cost per request']),
    el('p', { class: 'savings' },
      'Search rewriter spends the most and matters least per request. Onboarding chat spends the ' +
      'least and costs 48x more each time it runs. Neither fact is visible from a single invoice.'),
    el('p', { class: 'muted small' },
      'Illustrative figures. FinOps is attribution, budgets and unit economics — it sits on top of ' +
      'measurement and does not reduce a single token on its own.')
  );
}
