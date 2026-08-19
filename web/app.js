// Shell. Builds the context once, mounts the settings panel, the tally and the cards.
// It knows nothing about what any card does.

import { el } from './dom.js';
import { getCatalog, isDemo, resetCaches } from './api.js';
import { renderKeyPanel } from './keypanel.js';
import { getKey } from './keystore.js';
import { CARDS, renderCard } from './cards.js';

function mountCards() {
  const catalog = getCatalog();
  const ctx = {
    countEndpoint: catalog.countEndpoint,
    demos: Object.fromEntries(catalog.demos.map((d) => [d.id, d])),
  };
  document.getElementById('cards').replaceChildren(...CARDS.map((card) => renderCard(card, ctx)));
}

function paintBanner() {
  const host = document.getElementById('demo-banner');
  if (!isDemo()) {
    host.replaceChildren();
    return;
  }
  host.replaceChildren(
    el('div', { class: 'demo-banner' }, [
      el('strong', {}, 'Demo mode'),
      ' — every number below is fabricated and nothing is being called. Add a key in ',
      el('button', { type: 'button', class: 'linklike' }, 'settings'),
      ' to run these for real.',
    ])
  );
  // The banner is the only pointer to the key panel now that the header is just a title,
  // so it opens the same panel the gear does.
  host.querySelector('button').addEventListener('click', () => setPanel(true));
}

const toggle = () => document.getElementById('settings-toggle');
const panel = () => document.getElementById('keypanel');

function setPanel(open) {
  panel().hidden = !open;
  toggle().setAttribute('aria-expanded', String(open));
  if (open) panel().querySelector('input')?.focus();
}

// A dot on the gear is the only always-visible signal of which mode the page is in once
// the banner is gone, so it has to track the key rather than being set once at load.
function paintKeyDot() {
  toggle().classList.toggle('has-key', Boolean(getKey()));
}

document.addEventListener('DOMContentLoaded', () => {
  // Switching modes rebuilds every card from scratch. Half-rendered results from the other
  // mode would be worse than losing them: fabricated numbers sitting next to real ones,
  // with nothing on screen saying which was which.
  const onKeyChange = () => {
    resetCaches();
    paintBanner();
    paintKeyDot();
    mountCards();
  };

  panel().replaceChildren(renderKeyPanel(onKeyChange));
  toggle().addEventListener('click', () => setPanel(panel().hidden));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel().hidden) {
      setPanel(false);
      toggle().focus();
    }
  });

  paintBanner();
  paintKeyDot();
  mountCards();
});
