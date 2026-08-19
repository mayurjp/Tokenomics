// FinOps, built from real measurements.
//
// This was illustrative numbers in a table. It does not have to be: FinOps is attribution —
// which feature spent what — and the way to attribute cost is to measure each feature's
// call and multiply by its traffic. So the card runs three genuinely different workloads,
// measures each, and builds the table from those numbers.
//
// The one thing it cannot measure is your traffic, so the monthly volumes are stated
// assumptions rather than results. Everything else is real.

import { el } from './dom.js';
import { measure } from './api.js';
import { costOf, usd, PRICING_DATE } from './pricing.js';

// Deliberately different shapes: a summarizer reads a lot and writes little, a rewriter is
// tiny both ways, a chat turn is small in and large out. Those differences are what make
// per-request cost diverge from total spend.
const FEATURES = [
  { variant: 'summarizer', label: 'Ticket summarizer', volume: 40000 },
  { variant: 'rewriter', label: 'Search rewriter', volume: 900000 },
  { variant: 'chat', label: 'Onboarding chat', volume: 6000 },
];

export function finopsCard(body) {
  const out = el('div', {});
  const button = el('button', { type: 'button' }, 'Measure all three');

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Measuring…';
    out.replaceChildren(el('p', { class: 'muted' }, 'Running one call per feature…'));

    try {
      const rows = [];
      for (const f of FEATURES) {
        const result = await measure('finops', f.variant);
        const perCall = costOf(result.stats, result.model);
        rows.push({ ...f, stats: result.stats, perCall, monthly: perCall * f.volume });
      }
      out.replaceChildren(renderTable(rows));
    } catch (err) {
      out.replaceChildren(el('p', { class: 'error' }, err.message));
    } finally {
      button.disabled = false;
      button.textContent = 'Measure all three';
    }
  });

  body.replaceChildren(
    el('p', { class: 'muted small' },
      'Runs one real call per feature and attributes cost from what each actually spent. ' +
      'The monthly volumes below are assumptions — everything else is measured.'),
    el('div', { class: 'controls' }, [button]),
    out
  );
}

function renderTable(rows) {
  const total = rows.reduce((n, r) => n + r.monthly, 0);
  const biggestSpend = rows.reduce((a, b) => (b.monthly > a.monthly ? b : a));
  const priciestCall = rows.reduce((a, b) => (b.perCall > a.perCall ? b : a));

  const table = el('table', { class: 'ref-table' }, [
    el('thead', {}, [
      el('tr', {}, ['Feature', 'Tokens / call', 'Calls / month', 'Cost / call', 'Cost / month']
        .map((h) => el('th', {}, h))),
    ]),
    el('tbody', {}, rows.map((r) =>
      el('tr', {}, [
        el('th', { scope: 'row' }, r.label),
        el('td', {}, r.stats.total_tokens.toLocaleString()),
        el('td', {}, r.volume.toLocaleString()),
        el('td', {}, usd(r.perCall)),
        el('td', {}, usd(r.monthly)),
      ])
    )),
  ]);

  const children = [
    table,
    el('p', { class: 'money' }, [
      el('span', {}, 'Total: '),
      el('strong', {}, usd(total)),
      el('span', {}, ' a month across three features.'),
      el('span', { class: 'muted small block' },
        `Token counts and per-call costs measured just now. Volumes are assumed. List prices as of ${PRICING_DATE}.`),
    ]),
  ];

  // The lesson only lands if the two answers differ, and with these workloads they should —
  // but it is asserted from the measured numbers rather than hardcoded, so if a run comes
  // out otherwise the card says that instead.
  if (biggestSpend.label !== priciestCall.label) {
    const ratio = priciestCall.perCall / rows.reduce((a, b) => (b.perCall < a.perCall ? b : a)).perCall;
    children.push(
      el('p', { class: 'savings' },
        `${biggestSpend.label} costs the most in total, but ${priciestCall.label} costs ` +
        `${ratio.toFixed(0)}x more every time it runs. An invoice shows you the first number ` +
        `and hides the second — which is the entire job of attribution.`)
    );
  } else {
    children.push(
      el('p', { class: 'savings' },
        `${biggestSpend.label} is both the largest total spend and the most expensive per call ` +
        `on this run. That is the easy case; attribution earns its keep when those two come apart.`)
    );
  }

  children.push(
    el('p', { class: 'muted small' },
      'Attribution does not reduce a token on its own. It tells you which of the other cards to ' +
      'go and apply, and to what.')
  );

  return el('div', {}, children);
}
