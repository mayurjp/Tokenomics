// Demo mode: fabricated data, no network, no API key, no quota.
//
// Enabled only by ?demo in the URL — never a default, and never silent. The page's whole
// claim is that its numbers are real, so demo mode announces itself loudly.
//
// The numbers below are anchored to real measurements taken from this key where we had
// them (the comparison-pair counts, the thinking split) and are plausible reconstructions
// where quota ran out before they could be measured. Either way, in demo mode they are
// fabrications and the banner says so.

export const DEMO = new URLSearchParams(location.search).has('demo');

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
    lite: { input: 36, output: 208, thinking: null, text: ANSWER_LONG, model: 'gemini-3.1-flash-lite' },
    flash: { input: 36, output: 262, thinking: 812, text: ANSWER_LONG, model: 'gemini-3.5-flash' },
    pro: { error: 'This model is not available on this key or tier.', model: 'gemini-3.1-pro' },
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

export async function demoCatalog() {
  await latency(120);

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
  'single-call': { default: 'one call' },
  thinking: { on: 'thinking on', off: 'thinking off' },
  caching: { first: 'first call', second: 'second call' },
  routing: { lite: 'gemini-3.1-flash-lite', flash: 'gemini-3.5-flash', pro: 'gemini-3.1-pro' },
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
