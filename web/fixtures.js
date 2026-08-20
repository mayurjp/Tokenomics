// Demo mode: fabricated data, no network, no API key, no quota.
//
// This is what a visitor with no API key sees: the whole page, working, on invented
// numbers. It is never silent — the banner says so on every card the numbers touch —
// because the rest of the time the page's claim is that its numbers are real.
//
// The numbers below are anchored to real measurements taken from this key where we had
// them (the comparison-pair counts, the thinking split) and are plausible reconstructions
// where quota ran out before they could be measured. Either way, in demo mode they are
// fabrications and the banner says so.

// ?demo forces fabricated data even when a key is present. Without a key the page is in
// demo mode anyway — see api.js — so this is only needed to override a working key.
export const FORCE_DEMO = new URLSearchParams(location.search).has('demo');

const MODEL = 'gemini-3.5-flash';
const gen = (m = MODEL) => `POST /v1beta/models/${m}:generateContent`;
const cnt = `POST /v1beta/models/${MODEL}:countTokens`;
const latency = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (n) => Math.round(n * (0.92 + Math.random() * 0.16));

// Real measured values, so the ratios a demo viewer sees match reality.
const KNOWN_COUNTS = new Map([
  ['1,000,000', 9],
  ['one million', 2],
  ['{"action":"send_invoice","to":"Ann","when":"Friday","cc":"Bob","reason":"handles vendor account this quarter"}', 27],
  ['Send the invoice to Ann on Friday and copy Bob because he handles the vendor account this quarter', 18],
  ['तेज़ भूरी लोमड़ी आलसी कुत्ते के ऊपर से कूदती है', 16],
  ['The quick brown fox jumps over the lazy dog', 9],
  ['eigenvector heteroskedasticity phospholipid quaternion axolotl obfuscate', 14],
  ['number problem water people family question', 6],
  ['a          b', 3],
  ['a b', 2],
]);

export async function demoCount(text) {
  await latency(160);
  // Roughly 3.6 characters per token for ordinary English — an estimate, not a measurement.
  const tokens = KNOWN_COUNTS.get(text) ?? Math.max(1, Math.round(text.length / 3.6));
  return { model: MODEL, endpoint: cnt, tokens, chars: text.length, demo: true };
}

const LONG_PROMPT_PREVIEW =
  'COST ENGINEERING FOR LARGE LANGUAGE MODELS — INTERNAL HANDBOOK\n\n' +
  'SECTION 1. THE BILLING MODEL\n\nEvery request to a large language model is billed in\n' +
  'tokens, not in words, characters, or requests…\n\n[18 sections, ~2,200 tokens]\n\n' +
  'According to the handbook, why does output cost more than input?';

const BASIC_PROMPT =
  'Explain in three short paragraphs why a large language model bills for input tokens and ' +
  'output tokens separately, and what that means for someone designing a prompt they intend ' +
  'to send thousands of times.';

const ANSWER_LONG =
  'Input and output tokens are billed separately because they cost different amounts to ' +
  'produce. The prompt is read in a single parallel pass, which is fast and cheap. The answer ' +
  'is generated one token at a time, each one requiring another pass over everything written ' +
  'so far — so output is priced higher.\n\n' +
  'For a prompt sent thousands of times, the input is paid for on every single call. Trimming ' +
  'a few dozen words from a template is a permanent saving multiplied by volume, while a ' +
  'rambling answer is a recurring premium.';

const ANSWER_SHORT =
  'Output costs more because it is generated sequentially, one token at a time, with each ' +
  'token requiring another pass over everything written so far. Input is read in one parallel ' +
  'pass.';

const ANSWER_TOKEN = 'A token is a fragment of text — often a word, sometimes part of one — and it is the unit models are billed in.';

// demoId → variantId → { input, output, thinking, cacheRead, text, truncated }
const RUNS = {
  'single-call': {
    default: { input: 36, output: 255, thinking: 860, text: ANSWER_LONG },
  },
  thinking: {
    on: { input: 36, output: 251, thinking: 879, text: ANSWER_LONG },
    off: { input: 36, output: 336, thinking: null, text: ANSWER_LONG },
  },
  caching: {
    first: { input: 2418, output: 96, thinking: null, cacheRead: null, text: ANSWER_SHORT },
    second: { input: 2418, output: 92, thinking: null, cacheRead: 2304, text: ANSWER_SHORT },
  },
  routing: {
    // All three succeed. An earlier fixture faked a failing tier to exercise the
    // degradation path, but a fabricated outage is not a lesson — it just makes the card
    // look broken. Live mode still handles a genuinely unreachable tier; see cards-run.js.
    lite: { input: 36, output: 208, thinking: null, text: ANSWER_LONG, model: 'gemini-3.1-flash-lite' },
    flash: { input: 36, output: 262, thinking: 812, text: ANSWER_LONG, model: 'gemini-3.5-flash' },
    pro: { input: 36, output: 291, thinking: 1104, text: ANSWER_LONG, model: 'gemini-3.1-pro-preview' },
  },
  'system-prompt': {
    bloated: { input: 178, output: 41, thinking: null, text: ANSWER_TOKEN },
    lean: { input: 19, output: 38, thinking: null, text: ANSWER_TOKEN },
  },
  'output-cap': {
    uncapped: { input: 21, output: 412, thinking: null, text: ANSWER_LONG },
    capped: { input: 28, output: 60, thinking: null, truncated: true, text: 'Cost is driven mainly by how many tokens go in and how many come out, with output priced several times higher than input. The largest levers are model choice, prompt length and' },
  },
  structured: {
    prose: {
      input: 62, output: 78, thinking: null,
      text: 'The invoice number is INV-4471. It was issued to Northwind Traders on 14 March 2026 for an amount of 8,450 USD, and it is due within 30 days. The account manager responsible is Priya Raman.',
    },
    json: {
      input: 54, output: 46, thinking: null,
      text: '{\n  "invoice_number": "INV-4471",\n  "customer": "Northwind Traders",\n  "amount_usd": 8450,\n  "due_date": "2026-04-13",\n  "account_manager": "Priya Raman"\n}',
    },
  },
  rag: {
    stuffed: { input: 2418, output: 88, thinking: null, text: ANSWER_SHORT },
    retrieved: { input: 96, output: 84, thinking: null, text: ANSWER_SHORT },
  },
  semantic: {
    ask: {
      input: 24, output: 58, thinking: null,
      text: 'Most applications send a time-limited reset link to the address on file after the user requests one from the sign-in page. Following that link lets them set a new password, which invalidates the old one and any active sessions.',
    },
  },
  finops: {
    summarizer: {
      input: 118, output: 46, thinking: null,
      text: 'Export button fails in Firefox only; preflight returns 403 from the download host. Enterprise customer, escalated twice, rejects the use-Chrome workaround.',
    },
    rewriter: {
      input: 26, output: 12, thinking: null,
      text: 'firefox report export 403 CORS preflight failure',
    },
    chat: {
      input: 29, output: 214, thinking: null,
      text:
        'Welcome — the quickest way in is to connect a data source from the Sources tab, then ' +
        'open the starter dashboard it generates for you. That gives you something real to look ' +
        'at within a couple of minutes rather than a blank canvas.\n\n' +
        'From there, most people duplicate a starter chart and change its query. Everything is ' +
        'editable, nothing you do is destructive, and you can always reset a dashboard to its ' +
        'original state if an experiment goes sideways.',
    },
  },
  compression: {
    verbatim: {
      input: 641, output: 112, thinking: null,
      text: 'Start with the triage summary format and the exclusion rule for personal details, since both are agreed and cheap to implement. Then set up the week of useful / not useful marking so you have a baseline before changing anything else.',
    },
    summarized: {
      input: 198, output: 108, thinking: null,
      text: 'Start with the triage summary format and the exclusion rule for personal details, then begin the week of useful / not useful marking so you have a quality baseline before optimizing cost.',
    },
  },
};

// Deterministic pseudo-embeddings: the same text always gives the same vector, and the
// rewordings are built to land near the original while the router question does not. The
// similarity the card shows is still computed from these vectors by the real cosine
// function — demo mode fakes the embedding service, not the maths.
const DEMO_VECTORS = {
  'How do I reset my password?': [0.9, 0.32, 0.2, 0.1],
  'I forgot my password, what now?': [0.88, 0.36, 0.22, 0.12],
  'password reset help please': [0.86, 0.39, 0.25, 0.09],
  'How do I reset my router?': [0.42, 0.3, 0.8, 0.28],
};

export async function demoEmbed(text) {
  await latency(200);
  if (DEMO_VECTORS[text]) return DEMO_VECTORS[text];
  // Anything unexpected still gets a stable vector, derived from the text itself.
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) % 1000;
  return [h / 1000, ((h * 7) % 1000) / 1000, ((h * 13) % 1000) / 1000, ((h * 17) % 1000) / 1000];
}

// Synchronous: with no server, the catalog is static data in both modes and there is
// nothing to wait for.
export function demoCatalog() {
  const demos = Object.entries(RUNS).map(([id, variants]) => ({
    id,
    model: MODEL,
    compare: COMPARE[id] ?? 'total_tokens',
    variants: Object.entries(variants).map(([vid, v]) => ({
      id: vid,
      label: LABELS[id]?.[vid] ?? vid,
      model: v.model ?? MODEL,
      endpoint: gen(v.model),
      prompt: PROMPTS[id] ?? BASIC_PROMPT,
      systemInstruction: id === 'system-prompt' && vid === 'bloated'
        ? 'You are a helpful, friendly, knowledgeable and professional AI assistant. You should always be polite…'
        : id === 'system-prompt' ? 'Answer accurately and concisely in plain English.' : null,
      maxOutputTokens: v.truncated ? 60 : null,
      json: id === 'structured' && vid === 'json',
      // Mirror the live catalog's shape, not just its labels. Anything reading the
      // catalog to reconstruct a request — the API switch panel does — needs the same
      // fields in both modes, or it silently finds nothing to show in demo mode.
      thinkingBudget: v.thinking === null && v.error === undefined ? 0 : undefined,
      thinkingDisabled: v.thinking === null && v.error === undefined,
    })),
  }));

  return { countEndpoint: cnt, demos };
}

const COMPARE = {
  thinking: 'total_tokens',
  caching: 'cache_read_tokens',
  routing: 'total_tokens',
  'system-prompt': 'input_tokens',
  'output-cap': 'output_tokens',
  structured: 'output_tokens',
  rag: 'input_tokens',
  compression: 'input_tokens',
};

const LABELS = {
  semantic: { ask: 'answer the question' },
  finops: { summarizer: 'Ticket summarizer', rewriter: 'Search rewriter', chat: 'Onboarding chat' },
  'single-call': { default: 'one call' },
  thinking: { on: 'thinking on', off: 'thinking off' },
  caching: { first: 'first call', second: 'second call' },
  routing: { lite: 'gemini-3.1-flash-lite', flash: 'gemini-3.5-flash', pro: 'gemini-3.1-pro-preview' },
  'system-prompt': { bloated: 'bloated system prompt', lean: 'lean system prompt' },
  'output-cap': { uncapped: 'no limit', capped: 'capped at 60 tokens' },
  structured: { prose: 'as prose', json: 'as JSON' },
  rag: { stuffed: 'whole document', retrieved: 'retrieved section' },
  compression: { verbatim: 'full history', summarized: 'summarized history' },
};

const PROMPTS = {
  caching: LONG_PROMPT_PREVIEW,
  rag: LONG_PROMPT_PREVIEW,
  'system-prompt': 'What is a token?',
  'output-cap': 'Describe everything that affects the cost of running a large language model in production.',
  structured: 'Extract the invoice number, customer, amount, due date and account manager from this text.\n\nInvoice INV-4471 was issued to Northwind Traders on 14 March 2026 for 8,450 USD, due in 30 days, covering Q1 platform hosting. The account manager is Priya Raman.',
  compression: '[12 turns of conversation]\n\nGiven all of that, what should we do first this week?',
};

// A batch job in demo mode. The state machine is the real one — queued, running, finished
// — but compressed to seconds. A demo that genuinely took an hour would teach the lesson
// and lose the visitor; the card says the real turnaround separately.
const DEMO_BATCH_MS = 12000;

export async function demoBatchCreate() {
  await latency(500);
  return { name: `batches/demo-${Date.now().toString(36)}`, model: MODEL };
}

export async function demoBatchPoll(job) {
  const age = Date.now() - job.startedAt;

  if (age < DEMO_BATCH_MS * 0.35) {
    return { state: 'JOB_STATE_PENDING', done: false, failed: false };
  }
  if (age < DEMO_BATCH_MS) {
    return { state: 'JOB_STATE_RUNNING', done: false, failed: false };
  }

  return {
    state: 'JOB_STATE_SUCCEEDED',
    done: true,
    failed: false,
    error: null,
    response_text: ANSWER_LONG,
    stats: {
      input_tokens: 36,
      output_tokens: 268,
      total_tokens: 304,
      cache_read_tokens: null,
      cache_write_tokens: null,
      reasoning_tokens: null,
    },
    demo: true,
  };
}

export async function demoMeasure(demoId, variantId) {
  const spec = RUNS[demoId]?.[variantId];
  await latency(spec?.thinking ? 1100 : 600);

  if (!spec) throw new Error(`Unknown demo variant: ${demoId}/${variantId}`);
  // Modelled failure — the routing card has to survive a tier this key cannot reach.
  if (spec.error) throw new Error(spec.error);

  const input = spec.input;
  const output = jitter(spec.output);
  const thinking = spec.thinking === null ? null : jitter(spec.thinking);

  return {
    demoId,
    variantId,
    model: spec.model ?? MODEL,
    endpoint: gen(spec.model),
    // Fabricated like the token counts, and for the same reason: the demo sleep is
    // compressed so the page stays usable, but the number shown should reflect what a real
    // call of this shape takes. Roughly 55ms per generated token, plus a fixed overhead.
    durationMs: Math.round(900 + ((spec.output ?? 0) + (spec.thinking ?? 0)) * 5.5),
    response_text: spec.text,
    truncated: spec.truncated === true,
    stats: {
      input_tokens: input,
      output_tokens: output,
      total_tokens: input + output + (thinking ?? 0),
      cache_read_tokens: spec.cacheRead ?? null,
      cache_write_tokens: null,
      reasoning_tokens: thinking,
    },
    demo: true,
  };
}
