// The switch itself, at the API level.
//
// The card shows what thinking costs, but never showed how you turn it off — the variants
// were labelled "thinking off" as if that were a setting on the page rather than a field in
// a request. This shows the actual difference between the two bodies.
//
// The JSON is produced by buildRequestBody, the same function that builds what gets sent,
// so the panel cannot drift out of sync with the real call. Only the parts that differ are
// shown: the prompt is identical across these variants and is already on the card, so
// printing it twice more would be the duplication this card just shed.

import { el } from './dom.js';
import { buildRequestBody } from './gemini.js';

// Everything except generationConfig is the same across the variants this is used for, so
// that object is the whole story. Rendered as the fragment you would paste, not a diff of
// the entire body.
function configFragment(body) {
  if (!body.generationConfig) return null;
  return JSON.stringify({ generationConfig: body.generationConfig }, null, 2);
}

function row(variant, body, thinkingIsTheSwitch) {
  const fragment = configFragment(body);

  return el('div', { class: 'switch-row' }, [
    el('div', { class: 'pair-title muted' }, variant.label),
    fragment
      ? el('pre', { class: 'prompt small' }, fragment)
      : el('p', { class: 'switch-default muted small' },
          thinkingIsTheSwitch
            ? 'No generationConfig at all. Reasoning is what the model does unless you ask it ' +
              'not to — which is why it is easy to pay for without ever deciding to.'
            : 'No generationConfig at all — the model’s defaults apply.'),
  ]);
}

export function createApiSwitch(demo) {
  const bodies = demo.variants.map((v) => buildRequestBody(demo, v));

  // The panel only earns its place when the variants actually differ. Two identical
  // configs side by side teach nothing, and neither does two rows of "no config" — so it
  // selects itself in rather than being switched on card by card.
  const shapes = bodies.map((b) => JSON.stringify(b.generationConfig ?? null));
  if (shapes.every((x) => x === shapes[0])) return null;

  // The caveats below are about thinkingConfig specifically, so they only belong on a card
  // where that is the field being changed. On Output Capping or Structured Output they
  // would be a footnote about something the card never touches.
  const thinkingIsTheSwitch = bodies.some((b) => b.generationConfig?.thinkingConfig)
    && !bodies.every((b) => b.generationConfig?.thinkingConfig);

  const node = el('details', { class: 'apiswitch' }, [
    el('summary', {}, 'How the switch is set, in the request'),
    el('div', { class: 'switch-grid' },
      demo.variants.map((v, i) => row(v, bodies[i], thinkingIsTheSwitch))),
    thinkingIsTheSwitch
      ? el('p', { class: 'muted small' }, [
          'Measured while building this: ',
          el('code', {}, 'thinkingBudget: 0'),
          ' is the portable off switch — ',
          el('code', {}, "thinkingLevel: 'minimal'"),
          ' is rejected outright by some 3.x models. A non-zero budget is a hint rather than a ' +
          'cap and gets overshot; asking for 128 still spent 650.',
        ])
      : null,
  ].filter(Boolean));

  return { node };
}
