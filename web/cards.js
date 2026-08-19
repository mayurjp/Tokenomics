// The card schema.
//
// One card teaches one thing. Cards share no state and never depend on each other's
// results — each fetches what it needs and can be reordered, removed, or run alone. The
// only thing they have in common is the session tally, which observes them rather than
// coupling them.
//
// A card is:
//   { id, title, lesson, endpoint, mount }
//
//   title    — what it teaches, not what it does
//   lesson   — one line
//   endpoint — the Gemini endpoint behind it, or null for cards that call nothing
//   mount    — fills the card body and owns everything inside it

import { el } from './dom.js';
import { countAnything, samePriceComparisons } from './cards-count.js';
import { runnerCard } from './cards-run.js';
import { batchCard, semanticCacheCard, finopsCard } from './cards-reference.js';

const count = (ctx) => ctx.countEndpoint ?? null;
const gen = (demoId) => (ctx) => ctx.demos?.[demoId]?.variants?.[0]?.endpoint ?? null;
const none = () => null;

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
    title: 'Baseline Call',
    lesson: 'One real call, reporting exactly what it spent.',
    endpoint: gen('single-call'),
    mount: runnerCard('single-call', { runLabel: 'Run' }),
  },
  {
    id: 'thinking-cost',
    title: 'Thinking Tokens',
    lesson: 'Newer models reason before answering, and that reasoning is charged as output.',
    endpoint: gen('thinking'),
    mount: runnerCard('thinking', { runLabel: 'Run both' }),
  },
  {
    id: 'caching',
    title: 'Prompt Caching',
    lesson: 'Send the same long prompt twice and the second call reads part of it from cache.',
    endpoint: gen('caching'),
    mount: runnerCard('caching', { runLabel: 'Run twice' }),
  },
  {
    id: 'model-routing',
    title: 'Model Routing',
    lesson: 'The same prompt costs different amounts on different model tiers.',
    endpoint: gen('routing'),
    mount: runnerCard('routing', { runLabel: 'Run on each tier' }),
  },
  {
    id: 'lean-prompt',
    title: 'System Prompt Bloat',
    lesson: 'A bloated system prompt is paid for on every single request, forever.',
    endpoint: gen('system-prompt'),
    mount: runnerCard('system-prompt', { runLabel: 'Run both' }),
  },
  {
    id: 'output-cap',
    title: 'Output Capping',
    lesson: 'Output is the expensive half, and its length is controllable.',
    endpoint: gen('output-cap'),
    mount: runnerCard('output-cap', { runLabel: 'Run both' }),
  },
  {
    id: 'structured-output',
    title: 'Structured Output',
    lesson: 'Asking for JSON usually costs fewer output tokens than asking for sentences.',
    endpoint: gen('structured'),
    mount: runnerCard('structured', { runLabel: 'Run both' }),
  },
  {
    id: 'rag-vs-stuffing',
    title: 'Retrieval vs Stuffing',
    lesson: 'Sending only the relevant passage beats sending the whole document.',
    endpoint: gen('rag'),
    mount: runnerCard('rag', { runLabel: 'Run both' }),
  },
  {
    id: 'context-compression',
    title: 'Context Compression',
    lesson: 'A long conversation can be summarized instead of replayed verbatim.',
    endpoint: gen('compression'),
    mount: runnerCard('compression', { runLabel: 'Run both' }),
  },
  {
    id: 'batch-api',
    title: 'Batch API',
    lesson: 'Work nobody is waiting for is billed at half price.',
    endpoint: none,
    mount: batchCard,
  },
  {
    id: 'semantic-caching',
    title: 'Semantic Caching',
    lesson: 'A reworded question can reuse a previous answer and skip the model entirely.',
    endpoint: none,
    mount: semanticCacheCard,
  },
  {
    id: 'finops',
    title: 'FinOps',
    lesson: 'Attribution and unit economics, built on these numbers.',
    endpoint: none,
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
    el('h2', {}, card.title),
    el('span', { class: 'chevron', 'aria-hidden': 'true' }, '▸'),
  ]);

  body.setAttribute('id', `body-${card.id}`);

  const node = el('article', { class: `card${endpoint ? '' : ' reference'}`, id: `card-${card.id}` }, [
    head,
    // Collapsed tiles are too narrow for the full path, and a truncated URL teaches
    // nothing — so the method name shows in the grid and the full path on expand.
    el('code', { class: 'endpoint' }, [
      el('span', { class: 'ep-short' }, endpoint ? endpoint.split(':').pop() : 'no API call'),
      el('span', { class: 'ep-full' }, endpoint ?? 'no API call'),
    ]),
    el('p', { class: 'lesson muted' }, card.lesson),
    body,
  ]);

  const toggle = () => {
    const open = node.classList.toggle('open');
    head.setAttribute('aria-expanded', String(open));
  };

  // A collapsed card is clickable anywhere, so the whole tile is the target. Once open,
  // only the header closes it — otherwise typing in a textarea or hitting Run would
  // collapse the thing you are trying to use.
  node.addEventListener('click', (event) => {
    if (node.classList.contains('open') && !event.target.closest('.card-head')) return;
    toggle();
  });

  head.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  });

  card.mount(body, ctx);
  return node;
}
