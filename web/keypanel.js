// The key panel: the one piece of UI that decides whether the page shows real numbers.
//
// It states plainly where the key goes, because a page asking for an API key owes the
// visitor that. The key is validated with a countTokens call before it is stored — no
// generation, no quota spent, and a wrong key fails immediately rather than on first use.

import { el } from './dom.js';
import { getKey, setKey, clearKey, isRemembered, maskKey } from './keystore.js';
import { validateKey } from './gemini.js';
import { DEFAULT_MODEL } from './demos.js';

export function renderKeyPanel(onChange) {
  const node = el('section', { class: 'keypanel' });

  const paint = () => {
    const key = getKey();
    node.replaceChildren(key ? liveState(key, paint, onChange) : entryState(paint, onChange));
  };

  paint();
  return node;
}

function liveState(key, repaint, onChange) {
  const forget = el('button', { type: 'button', class: 'ghost' }, 'Forget key');
  forget.addEventListener('click', () => {
    clearKey();
    repaint();
    onChange();
  });

  return el('div', { class: 'key-live' }, [
    el('div', {}, [
      el('strong', {}, 'Live mode'),
      ' — using your key ',
      el('code', {}, maskKey(key)),
      el('span', { class: 'muted' },
        isRemembered() ? ' · saved on this device' : ' · cleared when this tab closes'),
    ]),
    forget,
  ]);
}

function entryState(repaint, onChange) {
  const input = el('input', {
    type: 'password',
    placeholder: 'Paste your Gemini API key',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-label': 'Gemini API key',
  });

  const remember = el('input', { type: 'checkbox', id: 'remember-key' });
  const submit = el('button', { type: 'button' }, 'Use my key');
  const status = el('span', { class: 'key-status muted' });

  const activate = async () => {
    const value = input.value.trim();
    if (!value) {
      status.className = 'key-status error';
      status.replaceChildren('Paste a key first.');
      return;
    }

    submit.disabled = true;
    status.className = 'key-status muted';
    status.replaceChildren('Checking…');

    try {
      // Validate before storing, so a bad key never becomes the page's state.
      await validateKey(value, DEFAULT_MODEL);
      setKey(value, remember.checked);
      repaint();
      onChange();
    } catch (err) {
      status.className = 'key-status error';
      status.replaceChildren(err.message);
      submit.disabled = false;
    }
  };

  submit.addEventListener('click', activate);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') activate();
  });

  return el('div', { class: 'key-entry' }, [
    el('div', { class: 'key-row' }, [
      input,
      submit,
    ]),
    el('div', { class: 'key-row key-opts' }, [
      el('label', { class: 'toggle', for: 'remember-key' }, [remember, el('span', {}, 'Remember on this device')]),
      status,
    ]),
    el('p', { class: 'muted small' }, [
      'Your key stays in this browser and is sent only to Google — there is no server here to ',
      'send it to. Anything running in this page can read it, so use a key restricted to the ',
      'Generative Language API, and prefer not remembering it on a shared machine. ',
      el('a', { href: 'https://aistudio.google.com/apikey', target: '_blank', rel: 'noopener' }, 'Get a key'),
      '.',
    ]),
  ]);
}
