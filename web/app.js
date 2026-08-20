// Shell. Builds the context once, mounts the settings panel, the tally and the cards.
// It knows nothing about what any card does.

import { el } from './dom.js';
import { getCatalog, isDemo, resetCaches } from './api.js';
import { renderKeyPanel } from './keypanel.js';
import { getKey } from './keystore.js';
import { CARDS, renderCard } from './cards.js';

const SITE_TITLE = 'Token Economics Explorer';

// Every card is mounted once and stays in the DOM. Navigation shows and hides them rather
// than rebuilding, so a run you kicked off survives going back to the grid and returning —
// re-rendering would silently throw away results you paid for.
function mountCards() {
  const catalog = getCatalog();
  const ctx = {
    countEndpoint: catalog.countEndpoint,
    demos: Object.fromEntries(catalog.demos.map((d) => [d.id, d])),
  };
  document.getElementById('cards').replaceChildren(...CARDS.map((card) => renderCard(card, ctx)));
  route();
}

// ---- routing ---------------------------------------------------------------
//
// One card at a time, addressed by hash. A URL per lesson means it can be linked to and
// the browser's back button already does the right thing, which no amount of in-page
// state would have given us.

const cardIds = () => new Set(CARDS.map((c) => c.id));

function activeId() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ''));
  return cardIds().has(id) ? id : null;
}

// Where the reader was in the grid, so coming back does not dump them at the top.
let gridScroll = 0;

function route() {
  const id = activeId();
  const grid = document.getElementById('cards');
  const back = document.getElementById('backbar');

  grid.classList.toggle('detail', Boolean(id));
  back.hidden = !id;

  for (const node of grid.children) {
    const isActive = node.id === `card-${id}`;
    node.classList.toggle('open', isActive);
    const head = node.querySelector('.card-head');
    if (head) head.setAttribute('aria-expanded', String(isActive));
  }

  const card = CARDS.find((c) => c.id === id);
  document.title = card ? `${card.title} · ${SITE_TITLE}` : SITE_TITLE;

  if (id) {
    window.scrollTo(0, 0);
    // Send focus to the heading so a keyboard or screen-reader user lands in the lesson
    // rather than back at the top of the document.
    document.querySelector(`#card-${id} h2`)?.focus?.();
  } else {
    // A frame later, so the grid's layout is back before we scroll into it. Restoring in
    // the same tick works today but depends on the detail page being at least as tall as
    // the position we are restoring; the deferral removes that assumption.
    const target = gridScroll;
    requestAnimationFrame(() => window.scrollTo(0, target));
  }
}

function goBack() {
  // pushState rather than clearing the hash, so the URL comes back clean instead of
  // keeping a bare "#". hashchange does not fire for this, hence the explicit route().
  history.pushState(null, '', location.pathname + location.search);
  route();
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
  const back = el('button', { type: 'button', class: 'backbar-button' }, '← All cards');
  back.addEventListener('click', goBack);
  document.getElementById('backbar').replaceChildren(back);

  window.addEventListener('hashchange', route);
  // pushState entries need popstate; hash entries need hashchange. Both end up here.
  window.addEventListener('popstate', route);
  // Remember the reading position only while the grid is what is on screen.
  window.addEventListener('scroll', () => {
    // Only while the grid is genuinely on screen — the restore scroll itself must not
    // overwrite the position it is restoring.
    if (!activeId() && !document.getElementById('cards').classList.contains('detail')) {
      gridScroll = window.scrollY;
    }
  }, { passive: true });

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
