// What / why / why not / how, one entry per card, keyed by card id.
//
// Kept out of cards.js because that file is a registry of behaviour and this is prose. Also
// because prose is the thing most likely to be edited by someone who does not want to read
// a mount function to find it.
//
// House rules: one or two sentences each. "Why not" is not a disclaimer — it is the half of
// the decision that tells you when to walk away, and it is written to be actionable.

export const EXPLAIN = {
  'count-anything': {
    what: 'A token is the chunk of text a model bills by — often a word, sometimes part of one. countTokens returns the exact count without running the model.',
    why: 'Sizing a prompt before you send it, and checking whether a rewrite actually made it cheaper.',
    whyNot: 'It measures size, not quality, and it cannot tell you what the answer will cost — only what the question does.',
    how: 'POST to models/{model}:countTokens with the same contents you would generate from. No inference runs, so nothing is billed.',
  },

  'same-meaning': {
    what: 'The same meaning tokenizes very differently depending on how it is written.',
    why: 'Anything sent at volume: templates, system prompts, serialization formats, the wording of a fixed instruction.',
    whyNot: 'Micro-optimising a prompt sent occasionally is wasted effort — the saving only matters multiplied by traffic.',
    how: 'Count both wordings and compare. Digits bill roughly one token each, JSON bills its punctuation, and the same sentence runs about 1.8x in Hindi or Japanese.',
  },

  'measure-call': {
    what: 'One generation call, reporting exactly what it spent rather than an estimate.',
    why: 'The starting point for everything else — you cannot prioritise what you have not measured.',
    whyNot: 'A single call tells you nothing about variance across inputs, or about what the same prompt costs at volume.',
    how: 'Read usageMetadata off the response: promptTokenCount, candidatesTokenCount, and thoughtsTokenCount where the model reasons.',
  },

  'thinking-cost': {
    what: 'Newer models write out reasoning before answering. It is generated text, so it is billed as output — and it is never returned in the response.',
    why: 'Multi-step problems: arithmetic, planning, contradictory or ambiguous instructions, anything where the model needs to catch its own mistake.',
    whyNot: 'Extraction, formatting, classification and rewriting. There you pay several times over for reasoning the task never needed.',
    how: [
      'Set thinkingConfig.thinkingLevel to "minimal" — the documented control, and the one that measured zero reasoning tokens.',
      'thinkingBudget: 0 also still works but no longer appears in the docs. Check which levels your model accepts: 3.5-flash takes all four, 3.7-flash has no "minimal".',
    ],
  },

  'reasoning-effort': {
    what: 'thinkingLevel is a graded control — minimal, low, medium, high — rather than an on/off switch.',
    why: 'When a task needs some reasoning but not all of it, and you would rather tune the spend than lose the capability entirely.',
    whyNot: 'The dial is narrower than it looks. On this model "low" cut reasoning by less than a fifth while "minimal" cut it to nothing, so the useful positions may be just the two ends.',
    how: [
      'Set thinkingConfig.thinkingLevel to minimal, low, medium or high.',
      'Which levels exist varies by model, and an unsupported one is rejected outright rather than rounded — 3.7-flash has no "minimal".',
      'The older thinkingBudget is a hint, not a cap: asking for 128 measured 650 tokens spent.',
    ],
  },

  caching: {
    what: 'Providers cache the prefix of a prompt they have seen recently and bill it at a fraction of the input rate.',
    why: 'Any prompt with a large stable prefix — a reference document, a long system prompt, a fixed set of examples.',
    whyNot: 'Short prompts never reach the minimum, and implicit caching is opportunistic: a hit is likely, never guaranteed, and cannot be relied on per request.',
    how: [
      'Put stable content first and the variable part last, keep the prefix byte-identical between calls, and clear roughly 2,048 tokens.',
      'Nothing to switch on — reordering the prompt is the entire technique.',
    ],
  },

  'model-routing': {
    what: 'The same prompt costs different amounts on different tiers, because the token count and the per-token rate both change.',
    why: 'Classification, extraction, formatting and routing rarely need the largest model, and they are most of the traffic.',
    whyNot: 'A cheaper tier is cheaper because it is less capable — and detecting the requests that needed the capability is its own problem.',
    how: 'Change the model id in the URL. Nothing else about the request changes, which is what makes this the cheapest thing on this page to try.',
  },

  'lean-prompt': {
    what: 'The system instruction is sent with every single request, for the life of the feature.',
    why: 'Anything resent on every call deserves scrutiny in proportion to volume — a 300 token preamble at a million calls is 300 million input tokens.',
    whyNot: 'Every line you cut is behaviour you stop controlling, including the one quietly preventing a failure you have forgotten about.',
    how: [
      'systemInstruction is a top-level field on the request, separate from contents.',
      'Treat its length as a tunable: cut until quality degrades, then put one line back.',
    ],
  },

  'output-cap': {
    what: 'A hard ceiling on how many tokens the model is allowed to generate.',
    why: 'Output is the expensive half of the bill, and without a cap its length is decided by the model rather than by you.',
    whyNot: 'A cap truncates mid-sentence rather than answering briefly — you can end up paying for output that gets thrown away.',
    how: [
      'Set generationConfig.maxOutputTokens, and pair it with an instruction to be concise so the model aims short rather than being cut short.',
      'finishReason comes back MAX_TOKENS rather than STOP when the cap was the thing that stopped it.',
    ],
  },

  'structured-output': {
    what: 'Asking for JSON returns fields. Asking for prose returns the same fields wrapped in sentences.',
    why: 'Any task whose result is data rather than explanation — extraction, classification, tagging, anything a program consumes.',
    whyNot: 'You get fields and no reasoning, and you now own a schema to define and keep in step with your code.',
    how: 'Set generationConfig.responseMimeType to application/json, and describe the fields you want in the prompt.',
  },

  'rag-vs-stuffing': {
    what: 'Send the passage that answers the question instead of the whole document.',
    why: 'Any corpus larger than its answers. The difference is routinely an order of magnitude, and quality often improves because the model is not sifting irrelevant material.',
    whyNot: 'Retrieval can fetch the wrong passage, and the model will answer confidently from it. It is also a store, an index and an embedding step to run and pay for.',
    how: [
      'Index the corpus once, retrieve per request, and put only what came back into contents.',
      'No API field is involved — this is a decision about what you send, not how you send it.',
    ],
  },

  'context-compression': {
    what: 'Replace old conversation turns with a summary rather than resending them verbatim.',
    why: 'Chat, where the whole history goes back on every turn and grows without limit — the fastest growing input cost in any conversational product.',
    whyNot: 'A summary is lossy by definition, and you discover which detail it dropped when someone asks about that detail.',
    how: 'Summarise older turns periodically and send the summary in their place, keeping recent turns intact.',
  },

  'batch-api': {
    what: 'Submit requests asynchronously and collect the results later, at half the interactive rate.',
    why: 'Bulk classification, backfills, evaluation runs — anything where no person is waiting for the answer.',
    whyNot: 'Google targets 24 hours. Useless for anything interactive, and it adds a submit-and-collect path to build and monitor.',
    how: [
      'POST to models/{model}:batchGenerateContent with your requests inline.',
      'Poll batches/{id} until its state reaches JOB_STATE_SUCCEEDED, then read the inlined responses.',
    ],
  },

  'semantic-caching': {
    what: 'Cache answers by meaning rather than by exact text, so a reworded question reuses a previous answer without calling the model at all.',
    why: 'Support and FAQ traffic, where the same handful of questions arrive worded a hundred ways. It skips generation entirely, so it saves the expensive half.',
    whyNot: 'A near-match is not a match: too loose a threshold returns a confidently irrelevant answer. It also needs a vector store and an embedding call on every lookup.',
    how: [
      'Embed the incoming question, compare it to cached questions with cosine similarity, and answer from cache above your threshold.',
      'Choose that threshold deliberately — it is the dial between saving money and answering the wrong question.',
    ],
  },

  finops: {
    what: 'Attributing spend to features, teams and individual requests, on top of the usage every call already reports.',
    why: 'Total spend and cost-per-request rank features differently, and an invoice only shows you the first — so it cannot tell you where to spend your effort.',
    whyNot: 'It reduces nothing by itself. Attribution buys visibility; the savings still have to come from the techniques above.',
    how: 'Record usageMetadata against a feature tag on every call, then aggregate by feature and by request volume.',
  },
};
