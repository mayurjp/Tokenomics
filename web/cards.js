// The card schema.
//
// One card teaches one thing. Cards share no state and never depend on each other's
// results — each fetches what it needs, reports its own cost, and can be reordered,
// removed, or run alone.
//
// A card is:
//   { id, title, lesson, endpoint, mount }
//
//   title    — what it teaches, not what it does
//   lesson   — one line
//   endpoint — the Gemini endpoint behind it, or null for cards that call nothing
//   mount    — fills the card body and owns everything inside it

import { el } from './dom.js';
import { renderExplain } from './explain.js';
import { EXPLAIN } from './explain-content.js';
import { countAnything, samePriceComparisons } from './cards-count.js';
import { runnerCard } from './cards-run.js';
import { batchCard } from './cards-batch.js';
import { semanticCacheCard } from './cards-semantic.js';
import { finopsCard } from './cards-finops.js';

const count = (ctx) => ctx.countEndpoint ?? null;
const gen = (demoId) => (ctx) => ctx.demos?.[demoId]?.variants?.[0]?.endpoint ?? null;

export const CARDS = [
  {
    id: 'count-anything',
    title: 'Tokenizer',
    lesson: 'Count any text. Tokens are not words, and not characters.',
    endpoint: count,
    mount: countAnything,
  },
  {
    id: 'same-meaning',
    title: 'Phrasing Cost',
    lesson: 'The same meaning can cost several times more, depending on how it is written.',
    endpoint: count,
    mount: samePriceComparisons,
  },
  {
    id: 'measure-call',
    demoId: 'single-call',
    title: 'Baseline Call',
    lesson: 'One real call, reporting exactly what it spent.',
    endpoint: gen('single-call'),
    mount: runnerCard('single-call', { runLabel: 'Run', compact: true,
      flow: true, }),
  },
  {
    id: 'thinking-cost',
    demoId: 'thinking',
    title: 'Thinking Tokens',
    lesson: 'Newer models reason before answering, and you pay for reasoning you never see.',
    endpoint: gen('thinking'),
    mount: runnerCard('thinking', {
      runLabel: 'Run both',
      compact: true,
      // The diagram stays; its explainer paragraph does not, since it restated `lesson`.
      flow: true,
      // Judgement, not measurement. The panel tags these so they cannot be mistaken for
      // findings from the run. Three a side; the rest was padding.
    }),
  },
  {
    id: 'caching',
    demoId: 'caching',
    title: 'Prompt Caching',
    lesson: 'Send the same long prompt twice and the second call reads part of it from cache.',
    endpoint: gen('caching'),
    mount: runnerCard('caching', { runLabel: 'Run twice', compact: true,
      flow: true, }),
  },
  {
    id: 'model-routing',
    demoId: 'routing',
    title: 'Model Routing',
    lesson: 'The same prompt costs different amounts on different model tiers.',
    endpoint: gen('routing'),
    mount: runnerCard('routing', {
      runLabel: 'Run on each tier',
      compact: true,
      flow: true,
    }),
  },
  {
    id: 'lean-prompt',
    demoId: 'system-prompt',
    title: 'System Prompt Bloat',
    lesson: 'A bloated system prompt is paid for on every single request, forever.',
    endpoint: gen('system-prompt'),
    mount: runnerCard('system-prompt', {
      runLabel: 'Run both',
      compact: true,
      flow: true,
    }),
  },
  {
    id: 'output-cap',
    demoId: 'output-cap',
    title: 'Output Capping',
    lesson: 'Output is the expensive half, and its length is controllable.',
    endpoint: gen('output-cap'),
    mount: runnerCard('output-cap', {
      runLabel: 'Run both',
      compact: true,
      flow: true,
    }),
  },
  {
    id: 'structured-output',
    demoId: 'structured',
    title: 'Structured Output',
    lesson: 'Asking for JSON usually costs fewer output tokens than asking for sentences.',
    endpoint: gen('structured'),
    mount: runnerCard('structured', {
      runLabel: 'Run both',
      compact: true,
      flow: true,
    }),
  },
  {
    id: 'rag-vs-stuffing',
    demoId: 'rag',
    title: 'Retrieval vs Stuffing',
    lesson: 'Sending only the relevant passage beats sending the whole document.',
    endpoint: gen('rag'),
    mount: runnerCard('rag', {
      runLabel: 'Run both',
      compact: true,
      flow: true,
    }),
  },
  {
    id: 'context-compression',
    demoId: 'compression',
    title: 'Context Compression',
    lesson: 'A long conversation can be summarized instead of replayed verbatim.',
    endpoint: gen('compression'),
    mount: runnerCard('compression', {
      runLabel: 'Run both',
      compact: true,
      flow: true,
    }),
  },
  {
    id: 'batch-api',
    title: 'Batch API',
    lesson: 'Work nobody is waiting for is billed at half price — if you can wait for it.',
    endpoint: () => 'POST /v1beta/models/gemini-3.5-flash:batchGenerateContent',
    mount: batchCard,
  },
  {
    id: 'semantic-caching',
    title: 'Semantic Caching',
    lesson: 'A reworded question can reuse a previous answer and skip the model entirely.',
    endpoint: () => 'POST /v1beta/models/gemini-embedding-001:embedContent',
    mount: semanticCacheCard,
  },
  {
    id: 'finops',
    title: 'FinOps',
    lesson: 'Attribution and unit economics, built on these numbers.',
    endpoint: () => 'POST /v1beta/models/gemini-3.5-flash:generateContent',
    mount: finopsCard,
  },
];

export function renderCard(card, ctx) {
  const endpoint = card.endpoint(ctx);
  const body = el('div', { class: 'card-body' });

  const head = el('header', {
    class: 'card-head',
    role: 'button',
    tabindex: '0',
    'aria-expanded': 'false',
    'aria-controls': `body-${card.id}`,
  }, [
    // tabindex -1 so the router can move focus here on navigation; an h2 is not focusable
    // otherwise, and a keyboard user would be left at the top of the document.
    el('h2', { tabindex: '-1' }, card.title),
    el('span', { class: 'chevron', 'aria-hidden': 'true' }, '▸'),
  ]);

  body.setAttribute('id', `body-${card.id}`);

  const node = el('article', {
    class: `card${endpoint ? '' : ' reference'}`,
    id: `card-${card.id}`,
    // Each lesson carries its own hue, so the grid is scannable by colour and a card keeps
    // its identity when it becomes the whole page. Everything colourful downstream reads
    // this one variable.
    // A tone per kind of call, not per card. Fourteen distinct hues looked like decoration;
    // three that mean "counts tokens", "runs the model" and "calls nothing" are information.
    'data-kind': endpoint ? (endpoint.includes('countTokens') ? 'count' : 'generate') : 'none',
  }, [
    head,
    // Collapsed tiles are too narrow for the full path, and a truncated URL teaches
    // nothing — so the method name shows in the grid and the full path on expand.
    el('code', { class: 'endpoint' }, [
      el('span', { class: 'ep-short' }, endpoint ? endpoint.split(':').pop() : 'no API call'),
      el('span', { class: 'ep-full' }, endpoint ?? 'no API call'),
    ]),
    el('p', { class: 'lesson muted' }, card.lesson),
    // What / why / why not / how, in that order on every card. Looked up by card id rather
    // than wired per card, so a card cannot quietly ship without one.
    renderExplain(EXPLAIN[card.id], ctx.demos?.[card.demoId]),
    body,
  ].filter(Boolean));

  // Opening a card is a navigation, not a toggle. The hash gives each lesson a URL, so it
  // can be linked to and the browser's own back button works — the router in app.js decides
  // which card is open, and nothing here mutates that directly.
  const open = () => {
    if (node.classList.contains('open')) return;
    location.hash = card.id;
  };

  node.addEventListener('click', (event) => {
    // Inside an open card, clicks belong to whatever they landed on.
    if (node.classList.contains('open')) return;
    if (event.target.closest('a')) return;
    open();
  });

  head.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  });

  card.mount(body, ctx);

  return node;
}
