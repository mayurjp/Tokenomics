// One spec per card: what its tokens do, in the vocabulary mechanism.js draws.
//
// Each builder receives the runs that just happened and returns a spec, or null when the
// run cannot support the claim — a caching demo with no cache hit has no cache lane to
// draw, and drawing one anyway would be inventing the lesson.
//
// Every number here is read off a measured run. Nothing is estimated, and where a quantity
// is a difference between two runs the spec says so in words rather than implying it was
// reported by the API.

import { costOf, atVolume, usd, RUNS_PER_MONTH } from './pricing.js';

const n = (v) => (v ?? 0).toLocaleString();
const find = (runs, id) => runs.find((r) => r.stats && r.variantId === id);
const withStats = (runs) => runs.filter((r) => r.stats);

function billing(run) {
  return {
    billed: `billed for all ${n(run.stats.total_tokens)} tokens`,
    cost: `${usd(atVolume(costOf(run.stats, run.model)))} / ${RUNS_PER_MONTH.toLocaleString()} runs`,
  };
}

// ---- thinking: generated, billed, never returned ---------------------------
function thinking(runs) {
  const run = withStats(runs).find((r) => (r.stats.reasoning_tokens ?? 0) > 0);
  if (!run) return null;
  const s = run.stats;

  return {
    hook: `${n(s.total_tokens)} tokens billed, but only ${n(s.output_tokens)} of them ever reached you.`,
    process: `the model · ${run.model}`,
    in: [{ label: 'your prompt', tokens: s.input_tokens, fate: 'billed' }],
    out: [
      { label: 'thinks', tokens: s.reasoning_tokens, fate: 'dropped', outcome: 'never returned' },
      { label: 'answers', tokens: s.output_tokens, fate: 'delivered', outcome: 'you read this' },
    ],
    ...billing(run),
    summary: `A prompt of ${n(s.input_tokens)} tokens goes to the model. It generates ` +
      `${n(s.reasoning_tokens)} reasoning tokens that are billed but never returned, and ` +
      `${n(s.output_tokens)} answer tokens that are. All ${n(s.total_tokens)} are billed.`,
  };
}

// ---- caching: the same input, most of it at a tenth of the price -----------
function caching(runs) {
  const second = find(runs, 'second');
  const cached = second?.stats.cache_read_tokens ?? 0;
  // No hit means no cache lane. Implicit caching is opportunistic, and the honest diagram
  // for a miss is no diagram.
  if (!second || cached <= 0) return null;

  const s = second.stats;
  const fresh = Math.max(0, (s.input_tokens ?? 0) - cached);

  return {
    hook: `The second call sent the same ${n(s.input_tokens)} tokens of input — and was charged full price for ${n(fresh)} of them.`,
    reveal: 'Where did the discount come from?',
    process: `the model · ${second.model}`,
    in: [
      { label: 'read from cache', tokens: cached, fate: 'discounted', note: 'a tenth of the input rate' },
      { label: 'charged in full', tokens: fresh, fate: 'billed' },
    ],
    out: [{ label: 'answers', tokens: s.output_tokens, fate: 'delivered', outcome: 'you read this' }],
    // Not billing(): the total here is close to the uncached call's and would read as
    // "barely cheaper" if left unqualified. The rate is what changed, not the count.
    billed: `${n(s.total_tokens)} tokens, ${n(cached)} of them at a tenth of the input rate`,
    cost: `${usd(atVolume(costOf(second.stats, second.model)))} / ${RUNS_PER_MONTH.toLocaleString()} runs`,
    summary: `Of ${n(s.input_tokens)} input tokens, ${n(cached)} were served from cache at a ` +
      `reduced rate and ${n(fresh)} were charged in full.`,
  };
}

// ---- retrieval: most of the document never reaches the model ---------------
function rag(runs) {
  const stuffed = find(runs, 'stuffed');
  const retrieved = find(runs, 'retrieved');
  if (!stuffed || !retrieved) return null;

  const whole = stuffed.stats.input_tokens ?? 0;
  const sent = retrieved.stats.input_tokens ?? 0;
  const held = Math.max(0, whole - sent);

  return {
    hook: `The document is ${n(whole)} tokens. Retrieval sent ${n(sent)} of them and answered the same question.`,
    reveal: 'What happened to the rest?',
    process: 'retrieval, then the model',
    in: [{ label: 'the whole document', tokens: whole, fate: 'billed', note: 'indexed once' }],
    out: [
      { label: 'the passage that answers it', tokens: sent, fate: 'delivered', outcome: 'sent to the model' },
      { label: 'everything else', tokens: held, fate: 'skipped', outcome: 'never sent' },
    ],
    billed: `billed for ${n(retrieved.stats.total_tokens)} tokens, not ${n(stuffed.stats.total_tokens)}`,
    cost: `${usd(atVolume(costOf(retrieved.stats, retrieved.model)))} / ${RUNS_PER_MONTH.toLocaleString()} runs`,
    summary: `Of a ${n(whole)} token document, retrieval sent ${n(sent)} tokens to the model and ` +
      `${n(held)} were never sent.`,
  };
}

// ---- system prompt: the part you pay for on every single request -----------
function systemPrompt(runs) {
  const bloated = find(runs, 'bloated');
  const lean = find(runs, 'lean');
  if (!bloated || !lean) return null;

  const overhead = Math.max(0, (bloated.stats.input_tokens ?? 0) - (lean.stats.input_tokens ?? 0));
  const monthly = atVolume(costOf(bloated.stats, bloated.model)) - atVolume(costOf(lean.stats, lean.model));

  return {
    hook: `${n(overhead)} tokens of the bloated prompt are instructions — resent on every request, forever.`,
    reveal: 'What is actually in the input?',
    process: `the model · ${bloated.model}`,
    in: [
      { label: 'system prompt', tokens: overhead, fate: 'billed', note: 'sent again every call' },
      { label: 'the actual question', tokens: lean.stats.input_tokens, fate: 'billed' },
    ],
    out: [{ label: 'answers', tokens: bloated.stats.output_tokens, fate: 'delivered', outcome: 'you read this' }],
    billed: `billed for all ${n(bloated.stats.total_tokens)} tokens, every time`,
    cost: `${usd(monthly)} / ${RUNS_PER_MONTH.toLocaleString()} runs of pure overhead`,
    summary: `The bloated prompt carries ${n(overhead)} tokens of instructions alongside a ` +
      `${n(lean.stats.input_tokens)} token question, and both are resent on every request.`,
  };
}

// ---- output cap: the tokens that were never generated ----------------------
function outputCap(runs) {
  const uncapped = find(runs, 'uncapped');
  const capped = find(runs, 'capped');
  if (!uncapped || !capped) return null;

  const saved = Math.max(0, (uncapped.stats.output_tokens ?? 0) - (capped.stats.output_tokens ?? 0));

  return {
    hook: `Uncapped the model wrote ${n(uncapped.stats.output_tokens)} tokens. Capped it wrote ${n(capped.stats.output_tokens)} and stopped.`,
    reveal: 'What did the cap actually do?',
    process: `the model · ${capped.model}`,
    in: [{ label: 'your prompt', tokens: capped.stats.input_tokens, fate: 'billed' }],
    out: [
      { label: 'written, up to the cap', tokens: capped.stats.output_tokens, fate: 'delivered', outcome: 'you read this' },
      { label: 'never generated', tokens: saved, fate: 'skipped', outcome: 'never written', note: 'the difference between the two runs' },
    ],
    ...billing(capped),
    summary: `With a cap the model wrote ${n(capped.stats.output_tokens)} output tokens instead of ` +
      `${n(uncapped.stats.output_tokens)}; the remaining ${n(saved)} were never generated.`,
  };
}

// ---- structured output: what prose costs that fields do not ----------------
function structured(runs) {
  const prose = find(runs, 'prose');
  const json = find(runs, 'json');
  if (!prose || !json) return null;

  const packaging = Math.max(0, (prose.stats.output_tokens ?? 0) - (json.stats.output_tokens ?? 0));

  return {
    hook: `The same five fields cost ${n(prose.stats.output_tokens)} tokens as prose and ${n(json.stats.output_tokens)} as JSON.`,
    reveal: 'What is the extra paying for?',
    process: `the model · ${json.model}`,
    in: [{ label: 'the same extraction task', tokens: json.stats.input_tokens, fate: 'billed' }],
    out: [
      { label: 'the data itself', tokens: json.stats.output_tokens, fate: 'delivered', outcome: 'you read this' },
      { label: 'sentences around it', tokens: packaging, fate: 'dropped', outcome: 'no extra data', note: 'the difference between the two runs' },
    ],
    ...billing(json),
    summary: `Prose spent ${n(prose.stats.output_tokens)} output tokens on the same five fields ` +
      `JSON conveyed in ${n(json.stats.output_tokens)}.`,
  };
}

// ---- compression: history you stop resending -------------------------------
function compression(runs) {
  const verbatim = find(runs, 'verbatim');
  const summarized = find(runs, 'summarized');
  if (!verbatim || !summarized) return null;

  const dropped = Math.max(0, (verbatim.stats.input_tokens ?? 0) - (summarized.stats.input_tokens ?? 0));

  return {
    hook: `The conversation is ${n(verbatim.stats.input_tokens)} tokens. Summarised, the next turn sends ${n(summarized.stats.input_tokens)}.`,
    reveal: 'What stopped being sent?',
    process: 'summarise, then send',
    in: [{ label: 'the conversation so far', tokens: verbatim.stats.input_tokens, fate: 'billed', note: 'resent on every turn' }],
    out: [
      { label: 'the summary', tokens: summarized.stats.input_tokens, fate: 'delivered', outcome: 'sent to the model' },
      { label: 'the turns it replaces', tokens: dropped, fate: 'skipped', outcome: 'never sent again', note: 'lossy by definition' },
    ],
    ...billing(summarized),
    summary: `A ${n(verbatim.stats.input_tokens)} token history becomes a ${n(summarized.stats.input_tokens)} ` +
      `token summary, so ${n(dropped)} tokens stop being resent each turn.`,
  };
}

export const MECHANISMS = {
  thinking,
  caching,
  rag,
  'system-prompt': systemPrompt,
  'output-cap': outputCap,
  structured,
  compression,
};
