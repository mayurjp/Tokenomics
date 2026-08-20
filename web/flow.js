// The token-flow diagram: where tokens come from and what you actually pay for.
//
// The numbers in the stats table are correct but they do not land — 36, 875 and 236 read as
// three similar numbers until you see them as widths. This draws the billed total as one
// bar split to scale, so the fact that the answer you can see is a fraction of the bill is
// something you notice rather than something you work out.
//
// Two rules that make or break it:
//
// 1. All variants share one scale. If each bar were normalised to its own total, "thinking
//    off" would render exactly as wide as "thinking on" and the entire lesson would vanish.
//    Widths are always a fraction of the largest total across the run.
// 2. Before a run there are no numbers, so there are no widths. The schematic state shows
//    the shape and says it is a shape — it never invents proportions, for the same reason
//    the rest of the page never invents a token count.

import { el } from './dom.js';

const SEGMENTS = [
  { key: 'input_tokens', cls: 'seg-input', label: 'input', hint: 'the prompt you send' },
  { key: 'cache_read_tokens', cls: 'seg-cache', label: 'cached input', hint: 'read from cache, billed at a fraction' },
  { key: 'reasoning_tokens', cls: 'seg-think', label: 'thinking', hint: 'generated, billed, never shown to you' },
  { key: 'output_tokens', cls: 'seg-output', label: 'output', hint: 'the answer you actually see' },
];

function arrow() {
  return el('span', { class: 'flow-arrow', 'aria-hidden': 'true' }, '→');
}

function chip(text, cls) {
  return el('span', { class: `flow-chip ${cls ?? ''}`.trim() }, text);
}

// Cached input is a subset of the input count, so drawing both at full width would double
// count it — the fresh portion is what is left after the cached part is taken out.
function segmentsFor(stats) {
  const cached = stats.cache_read_tokens ?? 0;
  const values = {
    input_tokens: Math.max(0, (stats.input_tokens ?? 0) - cached),
    cache_read_tokens: cached,
    reasoning_tokens: stats.reasoning_tokens ?? 0,
    output_tokens: stats.output_tokens ?? 0,
  };
  return SEGMENTS.map((s) => ({ ...s, value: values[s.key] })).filter((s) => s.value > 0);
}

function describe(label, segs, total) {
  const parts = segs.map((s) => `${s.value.toLocaleString()} ${s.label}`).join(', ');
  return `${label}: ${total.toLocaleString()} billed tokens — ${parts}.`;
}

function barRow(label, stats, scaleMax, model) {
  const segs = segmentsFor(stats);
  const total = segs.reduce((n, s) => n + s.value, 0);

  const bar = el('div', {
    class: 'flow-bar',
    role: 'img',
    'aria-label': describe(label, segs, total),
  }, segs.map((s) =>
    el('span', {
      class: `flow-seg ${s.cls}`,
      // Shared scale: the widest bar in the run is 100%, everything else is relative to it.
      style: `width:${(s.value / scaleMax) * 100}%`,
      title: `${s.label} — ${s.value.toLocaleString()} tokens`,
    })
  ));

  return el('div', { class: 'flow-row' }, [
    el('div', { class: 'flow-row-label' }, label),
    el('div', { class: 'flow-pipeline' }, [
      chip(`${(stats.input_tokens ?? 0).toLocaleString()} in`),
      arrow(),
      chip(model, 'flow-model'),
      arrow(),
    ]),
    el('div', { class: 'flow-bar-wrap' }, [
      bar,
      el('div', { class: 'flow-legend' }, segs.map((s) =>
        el('span', { class: 'flow-key' }, [
          el('i', { class: `flow-dot ${s.cls}`, 'aria-hidden': 'true' }),
          `${s.label} ${s.value.toLocaleString()}`,
        ])
      )),
    ]),
    el('div', { class: 'flow-total' }, [
      el('strong', {}, total.toLocaleString()),
      el('span', { class: 'muted' }, ' billed'),
    ]),
  ]);
}

// Shown before anything has run: the shape of the flow, with no widths claimed.
function schematic() {
  return el('div', { class: 'flow-row flow-schematic' }, [
    el('div', { class: 'flow-row-label muted' }, 'shape'),
    el('div', { class: 'flow-pipeline' }, [
      chip('your prompt'),
      arrow(),
      chip('the model', 'flow-model'),
      arrow(),
    ]),
    el('div', { class: 'flow-bar-wrap' }, [
      el('div', { class: 'flow-bar' }, [
        el('span', { class: 'flow-seg seg-input', style: 'width:22%' }),
        el('span', { class: 'flow-seg seg-think', style: 'width:48%' }),
        el('span', { class: 'flow-seg seg-output', style: 'width:30%' }),
      ]),
      el('div', { class: 'flow-legend' }, [
        el('span', { class: 'flow-key' }, [el('i', { class: 'flow-dot seg-input' }), 'input']),
        el('span', { class: 'flow-key' }, [el('i', { class: 'flow-dot seg-think' }), 'thinking']),
        el('span', { class: 'flow-key' }, [el('i', { class: 'flow-dot seg-output' }), 'output']),
      ]),
    ]),
    el('div', { class: 'flow-total muted small' }, 'run it'),
  ]);
}

// Two headers, not three: the pipeline column holds both what you send and what runs it,
// and the bar column is the one that must be labelled correctly — it is the whole point.
function header() {
  return el('div', { class: 'flow-head' }, [
    el('span', {}, 'You send it to'),
    el('span', {}, 'You are billed for'),
  ]);
}

export function createFlow(explainer) {
  const node = el('figure', { class: 'flow' });

  const paint = (children) =>
    node.replaceChildren(
      el('figcaption', { class: 'flow-explain' }, explainer),
      header(),
      ...children
    );

  paint([
    schematic(),
    el('p', { class: 'flow-note muted small' },
      'Widths are illustrative until you run it — then they become the real counts.'),
  ]);

  return {
    node,

    // outcomes: [{ variant, stats }] in the order they ran.
    update(runs) {
      const withStats = runs.filter((r) => r.stats);
      if (withStats.length === 0) return;

      const totals = withStats.map((r) =>
        segmentsFor(r.stats).reduce((n, s) => n + s.value, 0));
      const scaleMax = Math.max(...totals, 1);

      const notes = [];
      const hidden = withStats.find((r) => (r.stats.reasoning_tokens ?? 0) > 0);
      if (hidden) {
        const s = hidden.stats;
        const share = Math.round(((s.reasoning_tokens ?? 0) / totals[withStats.indexOf(hidden)]) * 100);
        notes.push(
          el('p', { class: 'flow-note' },
            `On "${hidden.variant}", ${share}% of what you paid for was thinking — generated, ` +
            'billed, and never shown to you. The answer you can actually read is the ' +
            'right-hand slice.')
        );
      }

      paint([
        ...withStats.map((r, i) => barRow(r.variant, r.stats, scaleMax, r.model)),
        ...notes,
      ]);
    },
  };
}
