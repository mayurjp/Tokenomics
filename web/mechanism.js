// Where the tokens actually go.
//
// The proportional bars show how big each part of the bill is. They cannot show what
// happens to it — and that is the fact this card exists for: the reasoning is generated,
// billed, and then never sent to you. `thoughtsTokenCount` is in the usage payload; the
// thinking itself is in no field of the response at all.
//
// So this draws fate rather than size. The answer's arrow leaves the model and reaches you.
// The reasoning's arrow stops dead. The billing bracket goes under both.
//
// It renders only after a run, because every number in it is a measured one — there is no
// schematic state here, since a diagram of this shape with invented counts would be making
// the exact claim the page refuses to make.

import { el } from './dom.js';
import { costOf, atVolume, usd, RUNS_PER_MONTH } from './pricing.js';

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
  svgEl('text', { x, y, class: cls ?? '' }, [document.createTextNode(str)]);

function diagram(stats, model) {
  const input = stats.input_tokens ?? 0;
  const think = stats.reasoning_tokens ?? 0;
  const output = stats.output_tokens ?? 0;
  const total = stats.total_tokens ?? input + think + output;
  const monthly = usd(atVolume(costOf(stats, model)));

  const n = (v) => v.toLocaleString();

  return svgEl('svg', {
    class: 'mech-svg',
    viewBox: '0 0 660 186',
    role: 'img',
    'aria-label':
      `Your prompt of ${n(input)} tokens goes to the model. The model generates ` +
      `${n(think)} reasoning tokens which are billed but never returned to you, and ` +
      `${n(output)} answer tokens which are. You are billed for all ${n(total)}, ` +
      `about ${monthly} per ${RUNS_PER_MONTH.toLocaleString()} runs.`,
  }, [
    svgEl('defs', {}, [
      svgEl('marker', {
        id: 'mech-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5',
        markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse',
      }, [svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'mech-head' })]),
    ]),

    // ---- what you send
    text(0, 62, 'your prompt', 'mech-label'),
    text(0, 80, `${n(input)} tokens`, 'mech-num'),
    svgEl('line', { x1: 96, y1: 74, x2: 148, y2: 74, class: 'mech-line', 'marker-end': 'url(#mech-arrow)' }),

    // ---- the model
    svgEl('rect', { x: 156, y: 20, width: 300, height: 112, rx: 10, class: 'mech-box' }),
    text(166, 38, `the model · ${model}`, 'mech-cap'),

    // ---- reasoning: generated, billed, discarded. Its arrow terminates.
    svgEl('g', { class: 'mech-think' }, [
      text(176, 66, 'thinks', 'mech-label'),
      svgEl('line', { x1: 232, y1: 61, x2: 396, y2: 61, class: 'mech-line mech-dotted' }),
      text(250, 55, `${n(think)} tokens`, 'mech-num'),
      svgEl('g', { class: 'mech-stop' }, [
        svgEl('line', { x1: 402, y1: 55, x2: 414, y2: 67 }),
        svgEl('line', { x1: 414, y1: 55, x2: 402, y2: 67 }),
      ]),
      text(468, 58, 'never', 'mech-muted'),
      text(468, 72, 'returned', 'mech-muted'),
    ]),

    // ---- the answer: the only branch that reaches you
    text(176, 112, 'answers', 'mech-label'),
    svgEl('line', { x1: 244, y1: 107, x2: 560, y2: 107, class: 'mech-line', 'marker-end': 'url(#mech-arrow)' }),
    text(262, 101, `${n(output)} tokens`, 'mech-num'),
    text(572, 103, 'you', 'mech-label'),
    text(572, 118, 'read this', 'mech-muted'),

    // ---- billing brackets both branches
    svgEl('path', { d: 'M 156 144 L 156 152 L 456 152 L 456 144', class: 'mech-bracket' }),
    text(160, 172, `billed for all ${n(total)} tokens`, 'mech-bill'),
    text(470, 172, `${monthly} / ${RUNS_PER_MONTH.toLocaleString()} runs`, 'mech-muted'),
  ]);
}

export function createMechanism() {
  const node = el('figure', { class: 'mech', hidden: '' });

  return {
    node,

    update(run) {
      if (!run?.stats || (run.stats.reasoning_tokens ?? 0) <= 0) {
        node.hidden = true;
        return;
      }

      const s = run.stats;
      const total = s.total_tokens ?? 0;
      const output = s.output_tokens ?? 0;

      const toggle = el('button', {
        type: 'button', class: 'mech-toggle', 'aria-expanded': 'false',
      }, 'What happened inside?');

      // The gap between the two numbers is the hook, and it is a real gap: the bill says
      // one thing, the response you can read says another. The diagram answers it.
      const hook = el('p', { class: 'mech-hook' }, [
        el('strong', {}, `${total.toLocaleString()} tokens billed`),
        `, but only ${output.toLocaleString()} of them ever reached you. `,
      ]);

      const figure = diagram(s, run.model);

      toggle.addEventListener('click', () => {
        const open = node.classList.toggle('revealed');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? 'Hide the inside' : 'What happened inside?';
      });

      node.hidden = false;
      node.classList.remove('revealed');
      // The diagram has a legible floor: scaled to a phone it becomes 300px wide and the
      // labels turn to fuzz. It scrolls inside its own box instead, so the page never does.
      node.replaceChildren(hook, toggle, el('div', { class: 'mech-scroll' }, figure));
    },
  };
}
