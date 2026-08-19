// Shell. Fetches the catalog once, builds the shared context, mounts each card.
// It knows nothing about what any card does.

import { el } from './dom.js';
import { getCatalog } from './api.js';
import { renderSession } from './session.js';
import { CARDS, renderCard } from './cards.js';
import { DEMO } from './fixtures.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (DEMO) {
    document.getElementById('demo-banner').replaceChildren(
      el('div', { class: 'demo-banner' }, [
        el('strong', {}, 'Demo mode'),
        ' — every number on this page is fabricated. No API calls are made. ',
        el('a', { href: location.pathname }, 'Leave demo mode'),
      ])
    );
  }

  document.getElementById('session').replaceChildren(renderSession(el));

  const container = document.getElementById('cards');

  try {
    const catalog = await getCatalog();
    const ctx = {
      countEndpoint: catalog.countEndpoint,
      demos: Object.fromEntries(catalog.demos.map((d) => [d.id, d])),
    };
    container.replaceChildren(...CARDS.map((card) => renderCard(card, ctx)));
  } catch (err) {
    container.replaceChildren(
      el('p', { class: 'error' }, `Could not reach the API: ${err.message}`)
    );
  }
});
