// The demo catalog. Replaces the old single-workflow list.
//
// A demo is one lesson. It owns a list of variants, and running a demo means running its
// variants and comparing what they cost. Everything the model is asked to do lives here on
// the server: the browser sends a demo id and a variant id, never prompt text or generation
// options. That is what keeps this proxy from being a general purpose Gemini relay — a
// caller who finds the endpoint can run these exact requests and nothing else.
//
// A variant may carry:
//   prompt            required, the user turn
//   systemInstruction optional
//   maxOutputTokens   optional
//   json              optional, ask for application/json back
//   thinkingBudget    optional, 0 disables reasoning
//   model             optional, overrides the demo's model (used by the routing demo)

import {
  REFERENCE_DOC,
  DOC_QUESTION,
  DOC_SNIPPET,
  CHAT_HISTORY,
  CHAT_SUMMARY,
  CHAT_QUESTION,
} from './content.js';

export const DEFAULT_MODEL = 'gemini-3.5-flash';

const BASIC_PROMPT =
  'Explain in three short paragraphs why a large language model bills for input tokens and ' +
  'output tokens separately, and what that means for someone designing a prompt they intend ' +
  'to send thousands of times.';

const EXTRACTION_TEXT =
  'Invoice INV-4471 was issued to Northwind Traders on 14 March 2026 for 8,450 USD, due in ' +
  '30 days, covering Q1 platform hosting. The account manager is Priya Raman.';

// A system prompt of the kind that accumulates in a real project: written once, never
// revisited, and resent on every single request thereafter.
const BLOATED_SYSTEM = [
  'You are a helpful, friendly, knowledgeable and professional AI assistant.',
  'You should always be polite and courteous to the user at all times.',
  'You should always try your best to be as helpful as you possibly can be.',
  'Please always make sure that your answers are accurate and correct.',
  'Please do not make things up or hallucinate facts that you are unsure about.',
  'If you do not know the answer to something, it is much better to say so.',
  'Always structure your answers clearly so that they are easy for the user to read.',
  'Use paragraphs where appropriate and do not write enormous walls of unbroken text.',
  'Remember that the user may not be an expert, so avoid unnecessary jargon where possible.',
  'If you must use a technical term, briefly explain what it means the first time.',
  'Be concise, but not so concise that you leave out genuinely important information.',
  'Do not be condescending or patronising towards the user under any circumstances.',
  'Do not refuse reasonable requests, and do not lecture the user about their question.',
  'Always answer in English unless the user has explicitly asked for another language.',
].join(' ');

const LEAN_SYSTEM = 'Answer accurately and concisely in plain English.';

export const DEMOS = [
  {
    id: 'single-call',
    model: DEFAULT_MODEL,
    variants: [{ id: 'default', label: 'one call', prompt: BASIC_PROMPT }],
  },

  {
    id: 'thinking',
    model: DEFAULT_MODEL,
    compare: 'total_tokens',
    variants: [
      { id: 'on', label: 'thinking on', prompt: BASIC_PROMPT },
      { id: 'off', label: 'thinking off', prompt: BASIC_PROMPT, thinkingBudget: 0 },
    ],
  },

  {
    id: 'caching',
    model: DEFAULT_MODEL,
    compare: 'cache_read_tokens',
    // Identical prompts on purpose. The second call is the demo; the first exists to put
    // the prefix in the cache. Implicit caching is opportunistic, so a miss is a normal
    // outcome and the UI must say so rather than treating it as a failure.
    variants: [
      { id: 'first', label: 'first call', prompt: `${REFERENCE_DOC}\n\n${DOC_QUESTION}` },
      { id: 'second', label: 'second call', prompt: `${REFERENCE_DOC}\n\n${DOC_QUESTION}` },
    ],
  },

  {
    id: 'routing',
    model: DEFAULT_MODEL,
    compare: 'total_tokens',
    // A tier this key cannot reach must not fail the whole comparison — the frontend runs
    // each variant independently and marks the unreachable one.
    variants: [
      { id: 'lite', label: 'gemini-3.1-flash-lite', prompt: BASIC_PROMPT, model: 'gemini-3.1-flash-lite' },
      { id: 'flash', label: 'gemini-3.5-flash', prompt: BASIC_PROMPT, model: 'gemini-3.5-flash' },
      { id: 'pro', label: 'gemini-3.1-pro', prompt: BASIC_PROMPT, model: 'gemini-3.1-pro' },
    ],
  },

  {
    id: 'system-prompt',
    model: DEFAULT_MODEL,
    compare: 'input_tokens',
    variants: [
      {
        id: 'bloated',
        label: 'bloated system prompt',
        systemInstruction: BLOATED_SYSTEM,
        prompt: 'What is a token?',
        thinkingBudget: 0,
      },
      {
        id: 'lean',
        label: 'lean system prompt',
        systemInstruction: LEAN_SYSTEM,
        prompt: 'What is a token?',
        thinkingBudget: 0,
      },
    ],
  },

  {
    id: 'output-cap',
    model: DEFAULT_MODEL,
    compare: 'output_tokens',
    variants: [
      {
        id: 'uncapped',
        label: 'no limit',
        prompt: 'Describe everything that affects the cost of running a large language model in production.',
        thinkingBudget: 0,
      },
      {
        id: 'capped',
        label: 'capped at 60 tokens',
        prompt: 'Describe everything that affects the cost of running a large language model in production. Answer in two sentences.',
        maxOutputTokens: 60,
        thinkingBudget: 0,
      },
    ],
  },

  {
    id: 'structured',
    model: DEFAULT_MODEL,
    compare: 'output_tokens',
    variants: [
      {
        id: 'prose',
        label: 'as prose',
        prompt: `Extract the invoice number, customer, amount, due date and account manager from this text, and report them in prose.\n\n${EXTRACTION_TEXT}`,
        thinkingBudget: 0,
      },
      {
        id: 'json',
        label: 'as JSON',
        prompt: `Extract the invoice number, customer, amount, due date and account manager from this text.\n\n${EXTRACTION_TEXT}`,
        json: true,
        thinkingBudget: 0,
      },
    ],
  },

  {
    id: 'rag',
    model: DEFAULT_MODEL,
    compare: 'input_tokens',
    variants: [
      {
        id: 'stuffed',
        label: 'whole document',
        prompt: `${REFERENCE_DOC}\n\n${DOC_QUESTION}`,
        thinkingBudget: 0,
      },
      {
        id: 'retrieved',
        label: 'retrieved section',
        prompt: `${DOC_SNIPPET}\n\n${DOC_QUESTION}`,
        thinkingBudget: 0,
      },
    ],
  },

  {
    id: 'compression',
    model: DEFAULT_MODEL,
    compare: 'input_tokens',
    variants: [
      {
        id: 'verbatim',
        label: 'full history',
        prompt: `${CHAT_HISTORY}\n\n${CHAT_QUESTION}`,
        thinkingBudget: 0,
      },
      {
        id: 'summarized',
        label: 'summarized history',
        prompt: `${CHAT_SUMMARY}\n\n${CHAT_QUESTION}`,
        thinkingBudget: 0,
      },
    ],
  },
];

export function findDemo(id) {
  return DEMOS.find((d) => d.id === id);
}

export function findVariant(demo, id) {
  return demo?.variants.find((v) => v.id === id);
}

// What the browser is allowed to see: everything. Prompts are public by design so a card
// can show the user exactly what it is about to send.
export function toPublicDemo(demo, endpointFor) {
  return {
    id: demo.id,
    model: demo.model,
    compare: demo.compare ?? 'total_tokens',
    variants: demo.variants.map((v) => ({
      id: v.id,
      label: v.label,
      model: v.model ?? demo.model,
      endpoint: endpointFor(v.model ?? demo.model, 'generateContent'),
      prompt: v.prompt,
      systemInstruction: v.systemInstruction ?? null,
      maxOutputTokens: v.maxOutputTokens ?? null,
      json: v.json === true,
      thinkingDisabled: v.thinkingBudget === 0,
    })),
  };
}
