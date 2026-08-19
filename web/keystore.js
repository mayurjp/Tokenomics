// Where the visitor's own Gemini key lives.
//
// There is no server and no shared key. Each visitor brings their own, it stays in their
// browser, and it is sent to exactly one place: Google. That removes the whole class of
// problems a shared key created — no quota shared between strangers, no bill the site owner
// pays for someone else's clicking, no secret to keep out of a static file.
//
// What it does not remove: anything running in this page can read the key. That means
// browser extensions with page access, and any XSS bug here. Which is why "remember on this
// device" is opt-in rather than the default — session storage is gone when the tab closes.

const KEY_NAME = 'tokenomics.gemini_key';

const listeners = [];
const notify = () => listeners.forEach((fn) => fn(getKey()));

export function onKeyChange(fn) {
  listeners.push(fn);
}

export function getKey() {
  try {
    return sessionStorage.getItem(KEY_NAME) || localStorage.getItem(KEY_NAME) || null;
  } catch {
    // Storage can throw in a locked-down browser. A missing key is a normal state here,
    // so degrade to "no key" rather than breaking the page.
    return null;
  }
}

export function setKey(key, remember) {
  try {
    // Only ever one copy — writing to one store clears the other, so "remember" and
    // "forget on close" cannot silently disagree about which key is live.
    sessionStorage.removeItem(KEY_NAME);
    localStorage.removeItem(KEY_NAME);
    (remember ? localStorage : sessionStorage).setItem(KEY_NAME, key);
  } catch {
    // ignore — the key still works for this page load, it just will not persist
  }
  notify();
}

export function clearKey() {
  try {
    sessionStorage.removeItem(KEY_NAME);
    localStorage.removeItem(KEY_NAME);
  } catch {
    // ignore
  }
  notify();
}

export function isRemembered() {
  try {
    return localStorage.getItem(KEY_NAME) !== null;
  } catch {
    return false;
  }
}

// Never render a key in full — a screenshot or a shared screen should not leak it.
export function maskKey(key) {
  if (!key) return '';
  return key.length <= 10 ? '••••' : `${key.slice(0, 4)}…${key.slice(-4)}`;
}
