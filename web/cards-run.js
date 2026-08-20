// The generic demo runner: one button, run every variant, compare what they cost.
//
// Every generateContent card on the page is this same function with a different demo id.
// The card does not know what its demo is teaching — the catalog carries the prompts and
// the comparison metric, so adding a lesson is a catalog change, not a UI change.

import { el } from './dom.js';
import { measure } from './api.js';
import { createMeter } from './meter.js';
import { createFlow } from './flow.js';
import { createTradeoff } from './tradeoff.js';
import { createMechanism } from './mechanism.js';
import { MECHANISMS } from './mechanisms.js';
import { createApiSwitch } from './apiswitch.js';
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

// What was configured for this variant, in the words the API uses.
function flagLine(variant) {
  return [
    `model ${variant.model}`,
    variant.maxOutputTokens ? `max ${variant.maxOutputTokens} output tokens` : null,
    variant.json ? 'JSON response' : null,
    variant.thinkingDisabled ? 'thinking off' : null,
  ].filter(Boolean).join(' · ');
}

// A short prompt reads better inline; a long one would bury the numbers underneath it, so
// past a paragraph or so it collapses. The reference document is 10,000 characters — nobody
// wants that unfolded in a column by default.
const INLINE_LIMIT = 400;

function promptBlock(variant) {
  const parts = [];

  if (variant.systemInstruction) {
    parts.push(el('pre', { class: 'prompt small' }, `[system] ${variant.systemInstruction}`));
  }
  parts.push(el('pre', { class: 'prompt small' }, variant.prompt));
  parts.push(el('div', { class: 'flags muted small' }, flagLine(variant)));

  const length = (variant.systemInstruction ?? '').length + variant.prompt.length;
  if (length <= INLINE_LIMIT) {
    return el('div', { class: 'sent' }, parts);
  }

  return el('details', { class: 'sent' }, [
    el('summary', {}, `What gets sent · ${length.toLocaleString()} characters`),
    ...parts,
  ]);
}

// One column per variant, holding everything about it in one place: what was sent, what it
// cost, what came back. Rendered before a run too, so you can read what is about to be
// spent — with a placeholder where the numbers will go rather than an empty gap.
function variantColumn(variant, outcome, highlight, compact, hasShared) {
  const head = [
    el('div', { class: 'pair-title muted' }, variant.label),
    // The prompt is dropped here only when an identical one was hoisted above the columns.
    // Where the variants genuinely differ — retrieval sends a document or a paragraph, and
    // that difference is the lesson — each column keeps its own.
    hasShared ? null : promptBlock(variant),
  ].filter(Boolean);

  if (!outcome) {
    return el('div', { class: 'pair-side' }, [
      ...head,
      el('p', { class: 'muted small awaiting' }, 'Not run yet.'),
    ]);
  }

  if (outcome.error) {
    return el('div', { class: 'pair-side' }, [
      ...head,
      el('p', { class: 'error small' }, outcome.error),
    ]);
  }

  const r = outcome.result;
  const cost = costOf(r.stats, r.model);

  // Compact mode: the flow rows already carry tokens, time and money, and the responses are
  // shown once beneath. The column would otherwise be a third restatement of both.
  if (compact) {
    return el('div', { class: 'pair-side' }, [
      ...head,
      r.truncated ? el('p', { class: 'badge-inline' }, 'truncated by the output cap') : null,
    ].filter(Boolean));
  }

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

// Two prompts that are byte-identical carry no information twice over; the same goes for
// two answers. Detected rather than assumed, so a variant that really does differ still
// shows both.
const sameText = (values) => values.every((v) => v === values[0]);

// What gets sent, hoisted above the controls so it never depends on whether a run has
// happened. One block when the variants send the same thing; a labelled block each when
// they do not — for retrieval and compression that difference is the entire lesson, and an
// earlier version dropped it on the floor the moment you pressed Run.
function promptsSection(variants) {
  const keys = variants.map((v) => `${v.systemInstruction ?? ''}||${v.prompt}`);
  if (sameText(keys)) return promptBlock(variants[0]);

  return el('div', { class: 'pair-grid prompts-grid' }, variants.map((v) =>
    el('div', {}, [
      el('div', { class: 'pair-title muted' }, v.label),
      promptBlock(v),
    ])
  ));
}

// The answers are the evidence that quality did not change, so they stay reachable — but
// when they are the same answer twice, showing both by default just doubles the reading.
function answersBlock(variants, outcomes) {
  const results = outcomes.map((o) => o?.result).filter(Boolean);
  if (results.length === 0) return null;

  const texts = results.map((r) => r.response_text || '');
  const identical = sameText(texts);

  const both = results.map((r, i) =>
    el('div', { class: 'answer' }, [
      el('div', { class: 'pair-title muted' }, variants[i]?.label ?? `answer ${i + 1}`),
      el('pre', { class: 'response small' }, r.response_text || '(empty)'),
    ]));

  if (results.length === 1) {
    return el('div', {}, [
      el('h4', {}, 'Response'),
      el('pre', { class: 'response small' }, texts[0] || '(empty)'),
    ]);
  }

  if (!identical) {
    return el('div', {}, [el('h4', {}, 'Responses'), el('div', { class: 'pair-grid' }, both)]);
  }

  return el('details', { class: 'answers' }, [
    el('summary', {}, 'Same answer both times — compare them'),
    el('pre', { class: 'response small' }, texts[0] || '(empty)'),
  ]);
}

// One sentence standing in for a savings line, a money line and two stats tables. The
// numbers are already in the diagram above, so this adds only what they cannot: whether the
// answers actually differed. The saving itself comes from summary(), which phrases it per
// the demo's own metric — input tokens for retrieval, cache reads for caching, and so on.
function verdictLine(demo, outcomes) {
  const line = summary(demo, outcomes);
  if (!line) return null;

  const texts = outcomes.map((o) => o?.result?.response_text).filter((t) => t !== undefined);
  const identical = texts.length > 1 && sameText(texts);

  return el('p', { class: 'verdict' }, [
    identical ? el('strong', {}, 'Same answer either way. ') : null,
    el('span', {}, line),
  ].filter(Boolean));
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
    // Opt-in per card. The diagram is being proven on one lesson first; turning it on for
    // another is adding flow to that card's options, nothing more.
    // flow: true renders the diagram with no explainer paragraph; a string supplies one.
    const flow = options.flow ? createFlow(typeof options.flow === 'string' ? options.flow : null) : null;
    const trade = options.tradeoffs ? createTradeoff(options.tradeoffs, options.compact === true) : null;
    // The spec is looked up by demo id: a card either has a mechanism worth drawing or it
    // does not, and that is a property of the lesson rather than a per-card switch.
    const mech = MECHANISMS[demoId] ? createMechanism(MECHANISMS[demoId]) : null;
    const apiSwitch = options.apiSwitch ? createApiSwitch(demo) : null;
    const compact = options.compact === true;
    const button = el('button', { type: 'button' }, options.runLabel ?? 'Run');

    // Columns exist from the start, holding the prompts. Running fills in the numbers
    // beneath each one rather than replacing the whole block.
    // Compact cards show what gets sent once, above the controls, and never again.
    const shared = compact ? promptsSection(demo.variants) : null;

    const columns = (outcomes) =>
      el('div', { class: 'pair-grid' },
        demo.variants.map((v, i) =>
          variantColumn(v, outcomes?.[i], demo.compare, compact, compact)));

    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Running…';
      out.replaceChildren(
        ...[compact ? null : columns(null),
            el('p', { class: 'muted' }, `Running ${demo.variants.length} calls…`)].filter(Boolean)
      );

      // Sequential, never parallel. Two identical prompts in flight at once is exactly the
      // shape that breaks the caching demo, and ordering matters wherever one call is meant
      // to warm something up for the next.
      // Each run reports its own cost, so the number stays next to the thing that caused it.
      meter.reset();
      const outcomes = [];
      for (const variant of demo.variants) {
        try {
          // Wall clock, not a claim. Thinking costs time as well as money, and the wait is
          // the half of the trade-off that token counts cannot show.
          const startedAt = performance.now();
          const result = await measure(demo.id, variant.id);
          const durationMs = result.durationMs ?? Math.round(performance.now() - startedAt);
          meter.add(result);
          outcomes.push({ result: { ...result, durationMs } });
        } catch (err) {
          // One unreachable model tier must not sink the whole comparison.
          outcomes.push({ error: err.message });
        }
      }

      const runs = demo.variants.map((v, i) => ({
        variant: v.label,
        variantId: v.id,
        model: outcomes[i].result?.model ?? v.model,
        stats: outcomes[i].result?.stats ?? null,
        durationMs: outcomes[i].result?.durationMs ?? null,
      }));

      if (trade) trade.update(runs);

      if (flow) flow.update(runs, null, Boolean(mech));
      // Each spec picks the variants it needs out of the run and returns null when the run
      // cannot support its claim — a caching demo that got no hit has no cache lane to draw.
      if (mech) mech.update(runs);

      const line = compact ? null : summary(demo, outcomes);
      const money = compact ? null : moneyLine(demo, outcomes);
      // replaceChildren stringifies a null into the text "null" — unlike el(), which skips
      // it. Anything conditional has to be filtered out before it gets here.
      out.replaceChildren(
        ...[
          compact ? verdictLine(demo, outcomes) : columns(outcomes),
          compact ? answersBlock(demo.variants, outcomes) : null,
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

    out.replaceChildren(...(compact ? [] : [columns(null)]));

    body.replaceChildren(
      // Reading order is the narrative: ask, show what gets sent, run, then the diagram
      // fills in, then the verdict, then what it cost you. Results above the button that
      // produces them reads backwards.
      ...[
        shared,
        apiSwitch?.node,
        el('div', { class: 'controls' }, [button]),
        flow?.node,
        mech?.node,
        out,
        trade?.node,
        meter.node,
      ].filter(Boolean)
    );
  };
}
