// What it is, why you would, why you would not, and how.
//
// The card already argued all four of these, but scattered: a lesson line at the top, a
// gain/lose panel at the bottom, and a request-body panel somewhere in the middle. Same
// content, no shape. This puts them in one block in a fixed order, so every card can be
// read the same way and skimmed to the part you came for.
//
// Brief by construction: one or two sentences each. Anything longer belongs in the run.
//
// The "how" fragment is built by buildRequestBody — the same function that builds what gets
// sent — so a card cannot end up documenting a field it does not use.

import { el } from './dom.js';
import { buildRequestBody } from './gemini.js';

function configFragment(demo) {
  if (!demo) return null;

  const bodies = demo.variants.map((v) => buildRequestBody(demo, v));
  const shapes = bodies.map((b) => JSON.stringify(b.generationConfig ?? null));

  // Only worth printing when the variants differ — otherwise it is the same JSON twice,
  // which documents nothing.
  if (shapes.every((x) => x === shapes[0])) return null;

  const changed = demo.variants
    .map((v, i) => ({ label: v.label, config: bodies[i].generationConfig }))
    .filter((x) => x.config);

  return el('div', { class: 'how-code' }, changed.map((x) =>
    el('div', {}, [
      el('div', { class: 'how-code-label muted' }, x.label),
      el('pre', { class: 'prompt small' }, JSON.stringify({ generationConfig: x.config }, null, 2)),
    ])
  ));
}

function row(term, body, cls) {
  return [
    el('dt', { class: cls ?? '' }, term),
    el('dd', { class: cls ?? '' }, body),
  ];
}

export function renderExplain(explain, demo) {
  if (!explain) return null;

  const code = configFragment(demo);
  const steps = [].concat(explain.how ?? []);

  return el('section', { class: 'explain' }, [
    el('dl', {}, [
      ...row('What', explain.what),
      ...row('Why', explain.why, 'is-why'),
      ...row('Why not', explain.whyNot, 'is-whynot'),
      ...row('How', el('div', {}, [
        steps.length === 1
          ? el('p', { class: 'how-step' }, steps[0])
          : el('ol', { class: 'how-steps' }, steps.map((s) => el('li', {}, s))),
        code,
      ].filter(Boolean))),
    ]),
  ]);
}
