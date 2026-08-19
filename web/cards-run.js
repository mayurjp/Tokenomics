// The generic demo runner: one button, run every variant, compare what they cost.
//
// Every generateContent card on the page is this same function with a different demo id.
// The card does not know what its demo is teaching — the catalog carries the prompts and
// the comparison metric, so adding a lesson is a catalog change, not a UI change.

import { el } from './dom.js';
import { measure } from './api.js';
import { createMeter } from './meter.js';
import { costOf, atVolume, usd, isPriced, RUNS_PER_MONTH, PRICING_DATE } from './pricing.js';

const METRIC_LABEL = {
  input_tokens: 'input tokens',
  output_tokens: 'output tokens',
  total_tokens: 'total tokens',
  cache_read_tokens: 'cache read tokens',
};

// A value the API did not report renders as "not reported", never 0 — absent and zero are
// different facts, and for cache reads the difference is the entire lesson.
function statsTable(stats, highlight) {
  const row = (label, key, cls) => {
    const value = stats[key];
    const reported = value !== null && value !== undefined;
    const classes = [cls, highlight === key ? 'mark' : null].filter(Boolean).join(' ');
    return el('tr', classes ? { class: classes } : {}, [
      el('th', { scope: 'row' }, label),
      el('td', reported ? {} : { class: 'muted' },
        reported ? value.toLocaleString() : 'not reported'),
    ]);
  };

  return el('table', { class: 'stats' }, [
    el('tbody', {}, [
      row('Input', 'input_tokens'),
      row('Output', 'output_tokens'),
      row('Thinking', 'reasoning_tokens'),
      row('Cache read', 'cache_read_tokens'),
      row('Total', 'total_tokens', 'total'),
    ]),
  ]);
}

function variantColumn(variant, outcome, highlight) {
  const head = [el('div', { class: 'pair-title muted' }, variant.label)];

  if (outcome.error) {
    return el('div', { class: 'pair-side' }, [
      ...head,
      el('p', { class: 'error small' }, outcome.error),
    ]);
  }

  const r = outcome.result;
  const cost = costOf(r.stats, r.model);
  return el('div', { class: 'pair-side' }, [
    ...head,
    statsTable(r.stats, highlight),
    el('p', { class: 'cost' }, [
      el('strong', {}, usd(atVolume(cost))),
      el('span', { class: 'muted' }, ` / month at ${RUNS_PER_MONTH.toLocaleString()} runs`),
      el('span', { class: 'muted small block' }, `${usd(cost)} per call${isPriced(r.model) ? '' : ' — price estimated'}`),
    ]),
    r.truncated ? el('p', { class: 'badge-inline' }, 'truncated by the output cap') : null,
    el('h4', {}, 'Response'),
    el('pre', { class: 'response small' }, r.response_text || '(empty)'),
  ]);
}

// The summary line. Written per metric, because "68% fewer total tokens" and "1,900 tokens
// read from cache" are different claims and a single generic sentence would blur them.
function summary(demo, outcomes) {
  const ok = demo.variants
    .map((v, i) => ({ variant: v, ...outcomes[i] }))
    .filter((o) => o.result);

  if (ok.length < 2) return null;

  const metric = demo.compare;

  if (metric === 'cache_read_tokens') {
    const last = ok[ok.length - 1].result.stats.cache_read_tokens;
    return last
      ? `The second call read ${last.toLocaleString()} tokens from cache instead of paying full price for them.`
      : 'No cache hit this time. Implicit caching is opportunistic and is not guaranteed on any given call.';
  }

  const values = ok.map((o) => ({ label: o.variant.label, n: o.result.stats[metric] ?? 0 }));
  const best = values.reduce((a, b) => (b.n < a.n ? b : a));
  const worst = values.reduce((a, b) => (b.n > a.n ? b : a));

  if (best.n === worst.n || worst.n === 0) return null;

  const pct = Math.round(((worst.n - best.n) / worst.n) * 100);
  return `${best.label} used ${pct}% fewer ${METRIC_LABEL[metric] ?? metric} — ${worst.n.toLocaleString()} down to ${best.n.toLocaleString()}.`;
}

// Tokens are the mechanism; money is the reason anyone cares. Everything here is
// hypothetical — the free tier bills nothing — so it is framed as what this work would cost
// if it ran in production, at a volume where the difference is legible.
function moneyLine(demo, outcomes) {
  const ok = demo.variants
    .map((v, i) => ({ variant: v, ...outcomes[i] }))
    .filter((o) => o.result);

  if (ok.length < 2) return null;

  const costs = ok.map((o) => ({
    label: o.variant.label,
    monthly: atVolume(costOf(o.result.stats, o.result.model)),
  }));

  const best = costs.reduce((a, b) => (b.monthly < a.monthly ? b : a));
  const worst = costs.reduce((a, b) => (b.monthly > a.monthly ? b : a));
  const saved = worst.monthly - best.monthly;

  if (saved <= 0) return null;

  return el('p', { class: 'money' }, [
    el('span', {}, `At ${RUNS_PER_MONTH.toLocaleString()} runs a month, ${worst.label} costs `),
    el('strong', {}, usd(worst.monthly)),
    el('span', {}, ` and ${best.label} costs `),
    el('strong', {}, usd(best.monthly)),
    el('span', {}, ' — a saving of '),
    el('strong', {}, usd(saved)),
    el('span', {}, ' a month.'),
    el('span', { class: 'muted small block' },
      `Hypothetical: paid-tier list prices as of ${PRICING_DATE}. The free tier bills nothing.`),
  ]);
}

export function runnerCard(demoId, options = {}) {
  return function mount(body, ctx) {
    const demo = ctx.demos?.[demoId];
    if (!demo) {
      body.replaceChildren(el('p', { class: 'error' }, `Demo "${demoId}" is not in the catalog.`));
      return;
    }

    const out = el('div', { class: 'output' });
    const meter = createMeter();
    const button = el('button', { type: 'button' }, options.runLabel ?? 'Run');

    // The prompts are what the demo is actually about, so they are inspectable — but they
    // are long, so they start collapsed rather than burying the numbers.
    const details = el('details', { class: 'prompts' }, [
      el('summary', {}, `Show what gets sent (${demo.variants.length} variants)`),
      ...demo.variants.map((v) =>
        el('div', { class: 'prompt-block' }, [
          el('div', { class: 'pair-title muted' }, v.label),
          v.systemInstruction
            ? el('pre', { class: 'prompt small' }, `[system] ${v.systemInstruction}`)
            : null,
          el('pre', { class: 'prompt small' }, v.prompt),
          el('div', { class: 'flags muted small' },
            [
              `model ${v.model}`,
              v.maxOutputTokens ? `max ${v.maxOutputTokens} output tokens` : null,
              v.json ? 'JSON response' : null,
              v.thinkingDisabled ? 'thinking off' : null,
            ].filter(Boolean).join(' · ')),
        ])
      ),
    ]);

    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Running…';
      out.replaceChildren(el('p', { class: 'muted' }, `Running ${demo.variants.length} calls…`));

      // Sequential, never parallel. Two identical prompts in flight at once is exactly the
      // shape that breaks the caching demo, and ordering matters wherever one call is meant
      // to warm something up for the next.
      // Each run reports its own cost, so the number stays next to the thing that caused it.
      meter.reset();
      const outcomes = [];
      for (const variant of demo.variants) {
        try {
          const result = await measure(demo.id, variant.id);
          meter.add(result);
          outcomes.push({ result });
        } catch (err) {
          // One unreachable model tier must not sink the whole comparison.
          outcomes.push({ error: err.message });
        }
      }

      const line = summary(demo, outcomes);
      const money = moneyLine(demo, outcomes);
      // replaceChildren stringifies a null into the text "null" — unlike el(), which skips
      // it. Anything conditional has to be filtered out before it gets here.
      out.replaceChildren(
        ...[
          el('div', { class: 'pair-grid' },
            demo.variants.map((v, i) => variantColumn(v, outcomes[i], demo.compare))),
          line ? el('p', { class: 'savings' }, line) : null,
          money,
          outcomes.every((o) => o.error)
            ? el('p', { class: 'error small' }, 'Every variant failed — check the key and its quota.')
            : null,
        ].filter(Boolean)
      );

      button.disabled = false;
      button.textContent = options.runLabel ?? 'Run';
    });

    body.replaceChildren(details, el('div', { class: 'controls' }, [button]), out, meter.node);
  };
}
