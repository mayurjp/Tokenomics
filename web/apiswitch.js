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

function row(variant, body) {
  const fragment = configFragment(body);

  return el('div', { class: 'switch-row' }, [
    el('div', { class: 'pair-title muted' }, variant.label),
    fragment
      ? el('pre', { class: 'prompt small' }, fragment)
      : el('p', { class: 'switch-default muted small' },
          'No generationConfig at all. Reasoning is what the model does unless you ask it not to — ' +
          'which is why it is easy to pay for without ever deciding to.'),
  ]);
}

export function createApiSwitch(demo) {
  const bodies = demo.variants.map((v) => buildRequestBody(demo, v));

  // Nothing to show if no variant configures anything — the panel would be two "no config"
  // rows saying nothing.
  if (bodies.every((b) => !b.generationConfig)) return null;

  const node = el('details', { class: 'apiswitch' }, [
    el('summary', {}, 'How the switch is set, in the request'),
    el('div', { class: 'switch-grid' },
      demo.variants.map((v, i) => row(v, bodies[i]))),
    el('p', { class: 'muted small' }, [
      'Measured while building this: ',
      el('code', {}, 'thinkingBudget: 0'),
      ' is the portable off switch — ',
      el('code', {}, "thinkingLevel: 'minimal'"),
      ' is rejected outright by some 3.x models. A non-zero budget is a hint rather than a ' +
      'cap and gets overshot; asking for 128 still spent 650.',
    ]),
  ]);

  return { node };
}
