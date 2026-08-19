// The token counter: type anything, see what Gemini would actually bill for it.
// Uses countTokens: a real network call to Google via the proxy, but no inference — so the
// number is exact and nothing is billed for it. Not local, and not free of rate limit.

import { recordCount } from './session.js';

// Each pair contrasts two ways of saying the same thing. The caption states the lesson only
// after the numbers are on screen, so the surprise lands first.
const PAIRS = [
  {
    label: 'Numbers',
    a: { title: 'digits', text: '1,000,000' },
    b: { title: 'words', text: 'one million' },
    caption: 'Digits tokenize one per character. Spelling a number out can cost less than writing it.',
  },
  {
    label: 'JSON vs prose',
    a: { title: 'JSON', text: '{"action":"send_invoice","to":"Ann","when":"Friday","cc":"Bob","reason":"handles vendor account this quarter"}' },
    b: { title: 'prose', text: 'Send the invoice to Ann on Friday and copy Bob because he handles the vendor account this quarter' },
    caption: 'Braces, quotes and colons are all billed. Structure you add for machines is paid for in tokens.',
  },
  {
    label: 'Language',
    a: { title: 'Hindi', text: 'तेज़ भूरी लोमड़ी आलसी कुत्ते के ऊपर से कूदती है' },
    b: { title: 'English', text: 'The quick brown fox jumps over the lazy dog' },
    caption: 'The same sentence costs roughly 1.8x more in Hindi or Japanese. Token budgets are not equal across languages.',
  },
  {
    label: 'Word rarity',
    // Six words against six words — an unequal word count would make the ratio meaningless.
    a: { title: 'six rare words', text: 'eigenvector heteroskedasticity phospholipid quaternion axolotl obfuscate' },
    b: { title: 'six common words', text: 'number problem water people family question' },
    caption: 'Common words are usually one token each. Rare ones get split into pieces, so jargon costs more than it looks.',
  },
  {
    label: 'Whitespace',
    a: { title: 'padded', text: 'a          b' },
    b: { title: 'plain', text: 'a b' },
    caption: 'Whitespace is billed like anything else — indentation in a pasted file is real money at volume.',
  },
];

export function renderCounter(apiBase, el) {
  // A given string always tokenizes to the same number, so asking twice is pure waste — it
  // spends rate limit on an answer we already have. The comparison chips are fixed text, so
  // without this every click re-counted both sides forever. Promises are cached rather than
  // values so two counts of the same text in flight at once collapse into one request.
  const cache = new Map();

  const count = (text) => {
    if (cache.has(text)) return cache.get(text);

    const pending = fetch(`${apiBase}/api/count`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).then(async (r) => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || `Request failed with status ${r.status}`);
      recordCount(body);
      return body;
    }).catch((err) => {
      // A failure must not be cached, or the text is permanently uncountable this session.
      cache.delete(text);
      throw err;
    });

    cache.set(text, pending);
    return pending;
  };

  // ---- free-text box -------------------------------------------------------
  const box = el('textarea', {
    rows: '4',
    placeholder: 'Type or paste anything — see what it costs.',
  });
  const readout = el('div', { class: 'readout muted' }, 'Waiting for text…');

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
    readout.className = 'readout muted';
    readout.replaceChildren('Counting…');
    // Debounced so a burst of typing is one call, and stamped so a slow earlier
    // response can't overwrite a newer one.
    const mine = ++seq;
    timer = setTimeout(async () => {
      try {
        const r = await count(text);
        if (mine !== seq) return;
        const ratio = (r.chars / r.tokens).toFixed(1);
        readout.className = 'readout';
        readout.replaceChildren(
          el('span', { class: 'big' }, r.tokens.toLocaleString()),
          el('span', { class: 'muted' }, ` tokens · ${r.chars.toLocaleString()} characters · ${ratio} chars/token`),
          el('div', { class: 'muted small' },
            `Sent 10,000 times that is ${(r.tokens * 10000).toLocaleString()} input tokens — billed every single time.`)
        );
      } catch (err) {
        if (mine !== seq) return;
        readout.className = 'readout error';
        readout.replaceChildren(err.message);
      }
    }, 400);
  });

  // ---- comparison chips ----------------------------------------------------
  const pairOut = el('div', { class: 'pair-out' });

  const chips = PAIRS.map((pair) => {
    const chip = el('button', { type: 'button', class: 'chip' }, pair.label);
    chip.addEventListener('click', async () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      pairOut.replaceChildren(el('p', { class: 'muted' }, 'Counting…'));
      try {
        const [a, b] = await Promise.all([count(pair.a.text), count(pair.b.text)]);
        const cheaper = a.tokens <= b.tokens ? pair.a.title : pair.b.title;
        const factor = (Math.max(a.tokens, b.tokens) / Math.min(a.tokens, b.tokens)).toFixed(1);
        pairOut.replaceChildren(
          el('div', { class: 'pair-grid' }, [
            pairSide(el, pair.a, a),
            pairSide(el, pair.b, b),
          ]),
          el('p', { class: 'savings' },
            `${cheaper} wins — ${factor}x fewer tokens for the same meaning. ${pair.caption}`)
        );
      } catch (err) {
        pairOut.replaceChildren(el('p', { class: 'error' }, err.message));
      }
    });
    return chip;
  });

  return el('article', { class: 'card' }, [
    el('h2', {}, 'What is a token?'),
    el('p', { class: 'muted' },
      'Every number here comes from Gemini’s own countTokens endpoint. It does no inference, so ' +
      'nothing is billed — but it is a real call to Google, so what you type is sent there.'),
    el('h3', {}, 'Count anything'),
    box,
    readout,
    el('h3', {}, 'Same meaning, different price'),
    el('div', { class: 'chips' }, chips),
    pairOut,
  ]);
}

function pairSide(el, spec, result) {
  return el('div', { class: 'pair-side' }, [
    el('div', { class: 'pair-title muted' }, spec.title),
    el('pre', { class: 'prompt small' }, spec.text),
    el('div', { class: 'readout' }, [
      el('span', { class: 'big' }, String(result.tokens)),
      el('span', { class: 'muted' }, ' tokens'),
    ]),
  ]);
}
