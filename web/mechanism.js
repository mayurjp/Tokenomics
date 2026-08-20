// Where the tokens actually go.
//
// The bars show how big each part of the bill is. They cannot show what happens to it, and
// on most of these cards that is the lesson: reasoning is generated and then discarded, a
// retriever throws away most of a document before the model ever sees it, a cache serves
// input at a tenth of the price, a summary replaces turns you no longer send.
//
// So this draws fate rather than size. It is one renderer over a small vocabulary — lanes
// going into a box or out of it, each with a token count and an outcome — and each card
// supplies a spec in mechanisms.js. Bespoke drawings per card would read better in
// isolation and drift apart in practice.
//
// It renders only after a run. Every number in it is measured; a diagram of this shape with
// invented counts would make exactly the claim this page refuses to make.

import { el } from './dom.js';

const SVG = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs, children) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
  for (const child of [].concat(children ?? [])) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

const text = (x, y, str, cls) =>
  svgEl('text', { x, y, class: cls ?? '' }, [document.createTextNode(String(str))]);

// How a lane is drawn, and what it means. The vocabulary is deliberately small: every card
// so far reduces to some arrangement of these five.
const FATE = {
  delivered: { line: 'mech-line', stop: false, tone: 'out' },   // reaches you
  billed:    { line: 'mech-line', stop: false, tone: 'in' },    // charged at full rate
  discounted:{ line: 'mech-line mech-dashed', stop: false, tone: 'cache' }, // cheaper
  dropped:   { line: 'mech-line mech-dotted', stop: true, tone: 'think' },  // made, then binned
  skipped:   { line: 'mech-line mech-dashed', stop: true, tone: 'muted' },  // never sent at all
};

// A lane marked reveal: true is the answer to the hook, and stays hidden until the toggle.
// The old bespoke renderer hard-coded this as .mech-think; the generic one emits
// .mech-lane.tone-think, so that selector matched nothing and the toggle animated air.
const laneClass = (lane, f) =>
  `mech-lane tone-${f.tone}${lane.reveal ? ' is-hidden' : ''}`;

// Geometry. Wide enough that the right-hand outcome text has somewhere to live: an earlier
// pass clipped "sent to the model" at the viewBox edge and stacked the left-hand label on
// top of its own note.
const W = 800;
const BOX_X = 214;
const BOX_W = 296;
const BOX_R = BOX_X + BOX_W;
const OUT_END = 640;        // where a delivered arrow stops
const STOP_END = BOX_R + 46; // where a terminated one does

function inLane(lane, y) {
  const f = FATE[lane.fate] ?? FATE.billed;
  return svgEl('g', { class: laneClass(lane, f) }, [
    text(0, y - 5, lane.label, 'mech-label'),
    text(0, y + 14, `${lane.tokens.toLocaleString()} tokens`, 'mech-num'),
    // 16px apart put the note's ascenders into the count's descenders. Text bounding boxes
    // are taller than the font size, so line spacing has to allow for both.
    lane.note ? text(0, y + 34, lane.note, 'mech-muted') : null,
    svgEl('line', {
      x1: 168, y1: y, x2: BOX_X - 8, y2: y,
      class: f.line, 'marker-end': 'url(#mech-arrow)',
    }),
  ]);
}

function outLane(lane, y) {
  const f = FATE[lane.fate] ?? FATE.billed;
  const endX = f.stop ? STOP_END : OUT_END;
  const labelX = f.stop ? endX + 26 : OUT_END + 14;

  return svgEl('g', { class: laneClass(lane, f) }, [
    text(BOX_X + 14, y - 5, lane.label, 'mech-label'),
    svgEl('line', {
      x1: BOX_X + 14, y1: y + 8, x2: endX, y2: y + 8,
      class: f.line, ...(f.stop ? {} : { 'marker-end': 'url(#mech-arrow)' }),
    }),
    text(BOX_X + 16, y + 26, `${lane.tokens.toLocaleString()} tokens`, 'mech-num'),
    f.stop
      ? svgEl('g', { class: 'mech-stop' }, [
          svgEl('line', { x1: endX + 6, y1: y + 2, x2: endX + 18, y2: y + 14 }),
          svgEl('line', { x1: endX + 18, y1: y + 2, x2: endX + 6, y2: y + 14 }),
        ])
      : null,
    lane.outcome ? text(labelX, y + 4, lane.outcome, 'mech-label') : null,
    lane.note ? text(labelX, y + 20, lane.note, 'mech-muted') : null,
  ]);
}

function diagram(spec) {
  const ins = spec.in ?? [];
  const outs = spec.out ?? [];
  const gap = 66;
  const rows = Math.max(ins.length, outs.length);
  const boxTop = 26;
  const boxH = Math.max(104, rows * gap + 30);
  const height = boxTop + boxH + 88;
  const firstY = boxTop + 54;

  return svgEl('svg', {
    class: 'mech-svg',
    viewBox: `0 0 ${W} ${height}`,
    role: 'img',
    'aria-label': spec.summary,
  }, [
    svgEl('defs', {}, [
      svgEl('marker', {
        id: 'mech-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5',
        markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse',
      }, [svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'mech-head' })]),
    ]),

    svgEl('rect', { x: BOX_X, y: boxTop, width: BOX_W, height: boxH, rx: 10, class: 'mech-box' }),
    text(BOX_X + 12, boxTop + 20, spec.process, 'mech-cap'),

    ...ins.map((lane, i) => inLane(lane, firstY + i * gap)),
    ...outs.map((lane, i) => outLane(lane, firstY + i * gap)),

    svgEl('path', {
      d: `M ${BOX_X} ${boxTop + boxH + 12} L ${BOX_X} ${boxTop + boxH + 20} L ${BOX_R} ${boxTop + boxH + 20} L ${BOX_R} ${boxTop + boxH + 12}`,
      class: 'mech-bracket',
    }),
    // Stacked, not side by side: a billed line can run long — "2,507 tokens, 2,304 of them
    // at a tenth of the input rate" — and it collided with the cost sitting beside it.
    text(BOX_X + 2, boxTop + boxH + 44, spec.billed, 'mech-bill'),
    spec.cost ? text(BOX_X + 2, boxTop + boxH + 66, spec.cost, 'mech-muted') : null,
  ]);
}

export function createMechanism(build) {
  const node = el('figure', { class: 'mech', hidden: '' });

  return {
    node,

    update(runs) {
      const spec = build(runs);
      if (!spec) {
        node.hidden = true;
        return;
      }

      const toggle = el('button', {
        type: 'button', class: 'mech-toggle', 'aria-expanded': 'false',
      }, spec.reveal ?? 'What happened inside?');

      toggle.addEventListener('click', () => {
        const open = node.classList.toggle('revealed');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? 'Hide the inside' : (spec.reveal ?? 'What happened inside?');
      });

      node.hidden = false;
      node.classList.remove('revealed');
      node.replaceChildren(
        el('p', { class: 'mech-hook' }, spec.hook),
        toggle,
        // The diagram has a legible floor: scaled to a phone it becomes 300px wide and the
        // labels turn to fuzz. It scrolls inside its own box so the page never does.
        el('div', { class: 'mech-scroll' }, diagram(spec))
      );
    },
  };
}
