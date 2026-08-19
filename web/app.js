// Shell. Builds the context once, mounts the key panel, the tally and the cards.
// It knows nothing about what any card does.

import { el } from './dom.js';
import { getCatalog, isDemo, resetCaches } from './api.js';
import { renderSession } from './session.js';
import { renderKeyPanel } from './keypanel.js';
import { CARDS, renderCard } from './cards.js';

function banner() {
  if (!isDemo()) return null;
  return el('div', { class: 'demo-banner' }, [
    el('strong', {}, 'Demo mode'),
    ' — every number below is fabricated and nothing is being called. ',
    'Add a key above to run these for real.',
  ]);
}

function mountCards() {
  const catalog = getCatalog();
  const ctx = {
    countEndpoint: catalog.countEndpoint,
    demos: Object.fromEntries(catalog.demos.map((d) => [d.id, d])),
  };
  document.getElementById('cards').replaceChildren(...CARDS.map((card) => renderCard(card, ctx)));
}

function paintBanner() {
  const node = banner();
  document.getElementById('demo-banner').replaceChildren(...(node ? [node] : []));
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('session').replaceChildren(renderSession(el));

  // Switching modes rebuilds every card from scratch. Half-rendered results from the other
  // mode would be worse than losing them: fabricated numbers sitting next to real ones,
  // with nothing on screen saying which was which.
  const onKeyChange = () => {
    resetCaches();
    paintBanner();
    mountCards();
  };

  document.getElementById('keypanel').replaceChildren(renderKeyPanel(onKeyChange));
  paintBanner();
  mountCards();
});
