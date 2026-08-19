// The two cards backed by countTokens. No inference, nothing billed.

import { el } from './dom.js';
import { countTokens } from './api.js';
import { createMeter } from './meter.js';

// ---- card: what a token is -------------------------------------------------
export function countAnything(body) {
  const box = el('textarea', { rows: '3', placeholder: 'Type anything.' });
  const readout = el('div', { class: 'readout muted' }, 'Waiting for text…');
  const meter = createMeter();

  let timer = null;
  let seq = 0;

  box.addEventListener('input', () => {
    clearTimeout(timer);
    const text = box.value;

    if (!text) {
      readout.className = 'readout muted';
      readout.replaceChildren('Waiting for text…');
      return;
    }

    // Debounced so a burst of typing is one call, and stamped so a slow earlier
    // response cannot overwrite a newer one.
    const mine = ++seq;
    timer = setTimeout(async () => {
      try {
        const r = await countTokens(text);
        if (mine !== seq) return;
        meter.add(r);
        readout.className = 'readout';
        readout.replaceChildren(
          el('span', { class: 'big' }, r.tokens.toLocaleString()),
          el('span', { class: 'muted' },
            ` tokens · ${r.chars.toLocaleString()} chars · ${(r.chars / r.tokens).toFixed(1)} chars/token`)
        );
      } catch (err) {
        if (mine !== seq) return;
        readout.className = 'readout error';
        readout.replaceChildren(err.message);
      }
    }, 400);
  });

  body.replaceChildren(box, readout, meter.node);
}

// ---- card: wording changes the price ---------------------------------------
const PAIRS = [
  {
    label: 'Numbers',
    a: { title: 'digits', text: '1,000,000' },
    b: { title: 'words', text: 'one million' },
    caption: 'Digits cost one token each.',
  },
  {
    label: 'JSON vs prose',
    a: { title: 'JSON', text: '{"action":"send_invoice","to":"Ann","when":"Friday","cc":"Bob","reason":"handles vendor account this quarter"}' },
    b: { title: 'prose', text: 'Send the invoice to Ann on Friday and copy Bob because he handles the vendor account this quarter' },
    caption: 'Braces, quotes and colons are billed like words.',
  },
  {
    label: 'Language',
    a: { title: 'Hindi', text: 'तेज़ भूरी लोमड़ी आलसी कुत्ते के ऊपर से कूदती है' },
    b: { title: 'English', text: 'The quick brown fox jumps over the lazy dog' },
    caption: 'A token budget does not stretch equally across languages.',
  },
  {
    label: 'Word rarity',
    // Six words against six — an unequal word count would make the ratio meaningless.
    a: { title: 'six rare words', text: 'eigenvector heteroskedasticity phospholipid quaternion axolotl obfuscate' },
    b: { title: 'six common words', text: 'number problem water people family question' },
    caption: 'Common words are one token; rare ones get split into pieces.',
  },
  {
    label: 'Whitespace',
    a: { title: 'padded', text: 'a          b' },
    b: { title: 'plain', text: 'a b' },
    caption: 'Indentation in a pasted file is billed.',
  },
];

export function samePriceComparisons(body) {
  const out = el('div', { class: 'pair-out' });
  const meter = createMeter();

  const chips = PAIRS.map((pair) => {
    const chip = el('button', { type: 'button', class: 'chip' }, pair.label);

    chip.addEventListener('click', async () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      out.replaceChildren(el('p', { class: 'muted' }, 'Counting…'));

      try {
        const [a, b] = await Promise.all([countTokens(pair.a.text), countTokens(pair.b.text)]);
        meter.reset();
        meter.add(a);
        meter.add(b);
        const cheaper = a.tokens <= b.tokens ? pair.a.title : pair.b.title;
        const factor = (Math.max(a.tokens, b.tokens) / Math.min(a.tokens, b.tokens)).toFixed(1);

        out.replaceChildren(
          el('div', { class: 'pair-grid' }, [side(pair.a, a), side(pair.b, b)]),
          el('p', { class: 'savings' }, `${cheaper} wins — ${factor}x fewer tokens. ${pair.caption}`)
        );
      } catch (err) {
        out.replaceChildren(el('p', { class: 'error' }, err.message));
      }
    });

    return chip;
  });

  body.replaceChildren(
    el('div', { class: 'chips' }, chips),
    // Each pair is two counts, because both sides have to be measured to compare them.
    // Saying so upfront stops the tally looking like it is double-counting.
    el('p', { class: 'muted small hint' },
      'Each comparison counts both sides, so it costs two calls. ' +
      'Re-opening one costs nothing — results are kept.'),
    out,
    meter.node
  );
}

function side(spec, result) {
  return el('div', { class: 'pair-side' }, [
    el('div', { class: 'pair-title muted' }, spec.title),
    el('pre', { class: 'prompt small' }, spec.text),
    el('div', { class: 'readout' }, [
      el('span', { class: 'big' }, String(result.tokens)),
      el('span', { class: 'muted' }, ' tokens'),
    ]),
  ]);
}
