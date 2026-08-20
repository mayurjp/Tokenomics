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
//   tradeoff — what the optimization costs you; every one of them costs something, and a
//              card that shows only the saving is teaching half a lesson
//   endpoint — the Gemini endpoint behind it, or null for cards that call nothing
//   mount    — fills the card body and owns everything inside it

import { el } from './dom.js';
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
    hue: '#0891b2',
    title: 'Tokenizer',
    lesson: 'Count any text. Tokens are not words, and not characters.',
    endpoint: count,
    mount: countAnything,
  },
  {
    id: 'same-meaning',
    hue: '#0d9488',
    title: 'Phrasing Cost',
    lesson: 'The same meaning can cost several times more, depending on how it is written.',
    endpoint: count,
    mount: samePriceComparisons,
  },
  {
    id: 'measure-call',
    hue: '#2563eb',
    title: 'Baseline Call',
    lesson: 'One real call, reporting exactly what it spent.',
    endpoint: gen('single-call'),
    mount: runnerCard('single-call', { runLabel: 'Run', compact: true,
      flow: true,
      apiSwitch: true, }),
  },
  {
    id: 'thinking-cost',
    hue: '#7c3aed',
    title: 'Thinking Tokens',
    lesson: 'Newer models reason before answering, and you pay for reasoning you never see.',
    endpoint: gen('thinking'),
    hasTradeoffPanel: true,
    mount: runnerCard('thinking', {
      runLabel: 'Run both',
      compact: true,
      // The diagram stays; its explainer paragraph does not, since it restated `lesson`.
      flow: true,
      mechanism: true,
      apiSwitch: true,
      // Judgement, not measurement. The panel tags these so they cannot be mistaken for
      // findings from the run. Three a side; the rest was padding.
      tradeoffs: {
        'thinking on': {
          gain: [
            'Holds up on multi-step problems: arithmetic, planning, contradictory instructions',
            'Can catch its own mistakes before answering',
          ],
          lose: ['You cannot read the reasoning you paid for, so a wrong answer is harder to debug'],
        },
        'thinking off': {
          gain: ['Loses almost nothing on extraction, formatting, classification and rewriting'],
          lose: ['Degrades on hard reasoning — answers confidently instead of working it out'],
        },
      },
    }),
  },
  {
    id: 'caching',
    hue: '#4f46e5',
    title: 'Prompt Caching',
    lesson: 'Send the same long prompt twice and the second call reads part of it from cache.',
    tradeoff:
      'Only pays off if the stable part comes first and stays byte-identical. Implicit caching is opportunistic, so it cannot be relied on for a given call — and reordering a prompt to suit it can make it harder to read.',
    endpoint: gen('caching'),
    mount: runnerCard('caching', { runLabel: 'Run twice', compact: true,
      flow: true,
      apiSwitch: true, }),
  },
  {
    id: 'model-routing',
    hasTradeoffPanel: true,
    hue: '#059669',
    title: 'Model Routing',
    lesson: 'The same prompt costs different amounts on different model tiers.',
    tradeoff:
      'A cheaper tier is cheaper because it is less capable. The saving is real until a request needs the capability you routed away from, and detecting that reliably is its own problem.',
    endpoint: gen('routing'),
    mount: runnerCard('routing', {
      runLabel: 'Run on each tier',
      compact: true,
      flow: true,
      apiSwitch: true,
      tradeoffs: {
        'gemini-3.1-flash-lite': {
          gain: ['Fast and cheap enough to put in front of every request'],
          lose: ['Runs out of depth on anything requiring several steps held at once'],
        },
        'gemini-3.5-flash': {
          gain: ['Handles most production work without thinking about it'],
          lose: ['You are paying mid-tier rates on requests a lite model would have answered'],
        },
        'gemini-3.1-pro-preview': {
          gain: ['The one that still works when the others start guessing'],
          lose: ['Wasted on classification, extraction and formatting, which is most traffic'],
        },
      },
    }),
  },
  {
    id: 'lean-prompt',
    hasTradeoffPanel: true,
    hue: '#d97706',
    title: 'System Prompt Bloat',
    lesson: 'A bloated system prompt is paid for on every single request, forever.',
    tradeoff:
      'Every instruction you delete is behaviour you stop controlling. Trimming a system prompt is safe until you remove the line that was preventing the failure mode you forgot about.',
    endpoint: gen('system-prompt'),
    mount: runnerCard('system-prompt', {
      runLabel: 'Run both',
      compact: true,
      flow: true,
      apiSwitch: true,
      tradeoffs: {
        'bloated system prompt': {
          gain: ['Every rule you ever needed is stated somewhere in it'],
          lose: ['Resent in full on every request for the life of the feature'],
        },
        'lean system prompt': {
          gain: ['The saving is permanent and scales with traffic'],
          lose: ['Each line you cut is behaviour you stop controlling — including the failure you have forgotten about'],
        },
      },
    }),
  },
  {
    id: 'output-cap',
    hasTradeoffPanel: true,
    hue: '#ea580c',
    title: 'Output Capping',
    lesson: 'Output is the expensive half, and its length is controllable.',
    tradeoff:
      'A hard cap truncates mid-sentence rather than answering briefly. Pair it with an instruction to be concise, or you pay for output that gets cut off and thrown away.',
    endpoint: gen('output-cap'),
    mount: runnerCard('output-cap', {
      runLabel: 'Run both',
      compact: true,
      flow: true,
      apiSwitch: true,
      tradeoffs: {
        'no limit': {
          gain: ['The answer always finishes its sentence'],
          lose: ['Length is set by the model, so the bill is decided by something you do not control'],
        },
        'capped at 60 tokens': {
          gain: ['A hard ceiling on the expensive half of the bill'],
          lose: ['Truncates mid-sentence rather than answering briefly — pair it with an instruction to be concise, or you pay for output that gets thrown away'],
        },
      },
    }),
  },
  {
    id: 'structured-output',
    hasTradeoffPanel: true,
    hue: '#c026d3',
    title: 'Structured Output',
    lesson: 'Asking for JSON usually costs fewer output tokens than asking for sentences.',
    tradeoff:
      'You get fields, not reasoning. Fine when the result is data; bad when the user needed the explanation, and it requires you to define and maintain the schema.',
    endpoint: gen('structured'),
    mount: runnerCard('structured', {
      runLabel: 'Run both',
      compact: true,
      flow: true,
      apiSwitch: true,
      tradeoffs: {
        'as prose': {
          gain: ['Readable by a person with no parsing step'],
          lose: ['Pays output rates for transitions, hedging and restatement'],
        },
        'as JSON': {
          gain: ['Cheaper, and consumable by code without guessing'],
          lose: ['You get fields, not reasoning — and a schema to define and maintain'],
        },
      },
    }),
  },
  {
    id: 'rag-vs-stuffing',
    hasTradeoffPanel: true,
    hue: '#e11d48',
    title: 'Retrieval vs Stuffing',
    lesson: 'Sending only the relevant passage beats sending the whole document.',
    tradeoff:
      'Retrieval can fetch the wrong passage, and then the model answers confidently from the wrong context. It also adds a store, an index and an embedding step to run and pay for.',
    endpoint: gen('rag'),
    mount: runnerCard('rag', {
      runLabel: 'Run both',
      compact: true,
      flow: true,
      apiSwitch: true,
      tradeoffs: {
        'whole document': {
          gain: ['Nothing to build, and the answer is always somewhere in the context'],
          lose: ['Cost scales with the document on every single request'],
        },
        'retrieved section': {
          gain: ['A fixed indexing cost replaces a recurring context cost'],
          lose: ['Retrieval can fetch the wrong passage, and the model will answer confidently from it — plus a store, an index and an embedding step to run'],
        },
      },
    }),
  },
  {
    id: 'context-compression',
    hasTradeoffPanel: true,
    hue: '#0284c7',
    title: 'Context Compression',
    lesson: 'A long conversation can be summarized instead of replayed verbatim.',
    tradeoff:
      'A summary is lossy by definition. Whatever it drops is gone from the conversation, and you will not find out which detail mattered until someone asks about it.',
    endpoint: gen('compression'),
    mount: runnerCard('compression', {
      runLabel: 'Run both',
      compact: true,
      flow: true,
      apiSwitch: true,
      tradeoffs: {
        'full history': {
          gain: ['Nothing is lost, because nothing was thrown away'],
          lose: ['The fastest growing cost in any chat product — every turn resends all the ones before it'],
        },
        'summarized history': {
          gain: ['Per-turn cost stops growing with the conversation'],
          lose: ['A summary is lossy by definition, and you find out which detail mattered when someone asks about it'],
        },
      },
    }),
  },
  {
    id: 'batch-api',
    hue: '#65a30d',
    title: 'Batch API',
    lesson: 'Work nobody is waiting for is billed at half price — if you can wait for it.',
    tradeoff:
      'Results arrive within hours, not seconds. Useless for anything a person is waiting on, and it adds a job-submission and result-collection path to build.',
    endpoint: () => 'POST /v1beta/models/gemini-3.5-flash:batchGenerateContent',
    mount: batchCard,
  },
  {
    id: 'semantic-caching',
    hue: '#9333ea',
    title: 'Semantic Caching',
    lesson: 'A reworded question can reuse a previous answer and skip the model entirely.',
    tradeoff:
      'A near-match is not a match. Too loose a threshold returns a confidently irrelevant answer, and the vector store plus per-lookup embedding calls are real infrastructure and real cost.',
    endpoint: () => 'POST /v1beta/models/gemini-embedding-001:embedContent',
    mount: semanticCacheCard,
  },
  {
    id: 'finops',
    hue: '#b45309',
    title: 'FinOps',
    lesson: 'Attribution and unit economics, built on these numbers.',
    tradeoff:
      'It reduces nothing on its own. Attribution is work that buys visibility, not savings — the savings still have to come from the techniques above.',
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
    // The raw hue goes on the element; --card is derived from it in CSS, which is what
    // lets dark mode lighten every card with one rule instead of fourteen. An inline
    // --card would outrank that rule.
    style: `--card-raw: ${card.hue}`,
  }, [
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

  card.mount(body, { ...ctx, tradeoff: card.tradeoff });

  // The trade-off belongs with the result, not the pitch — it is what the saving cost you,
  // so it sits at the bottom of the card where the numbers end.
  // Only when there is no gain/lose panel. A card with both rendered the same argument
  // twice, once as prose and once as bullets.
  if (card.tradeoff && !card.hasTradeoffPanel) {
    body.append(
      el('details', { class: 'tradeoff' }, [
        el('summary', {}, 'What it costs you'),
        el('p', {}, card.tradeoff),
      ])
    );
  }

  return node;
}
