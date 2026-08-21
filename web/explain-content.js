// What / why / why not / how, one entry per card, keyed by card id.
//
// Kept out of cards.js because that file is a registry of behaviour and this is prose. Also
// because prose is the thing most likely to be edited by someone who does not want to read
// a mount function to find it.
//
// House rules: one or two sentences each. "Why not" is not a disclaimer — it is the half of
// the decision that tells you when to walk away, and it is written to be actionable.

export const EXPLAIN = {
  'embeddings-space': {
    what: 'A 2D visualization of Embeddings (Vector Space).',
    why: 'Models do not understand English. They understand math. By translating words into coordinates (embeddings), models can calculate the "semantic distance" between concepts. This is how Semantic Search (RAG) works: it simply finds the points in space that are mathematically closest to your query.',
    how: 'Click on any word in the graph. The sandbox will calculate its distance to every other point, and highlight its nearest neighbors.'
  },
  'system-prompts': {
    what: 'A sandbox demonstrating the power and priority of System instructions.',
    why: 'When building LLM applications, you cannot trust the user\'s prompt to contain the rules (users often try to jailbreak or ignore them). The System Prompt is a privileged context area that strictly defines the model\'s persona, output format, and constraints.',
    how: 'Change the System Prompt dropdown to alter the model\'s developer constraints. Then try asking the exact same User question in the chat and watch how the System constraints completely override and steer the response.'
  },
  'agentic-sandbox': {
    what: 'A demonstration of Zero-Shot Prompting vs Agentic Workflows.',
    why: 'Asking a model to do a massive, complex task in a single prompt (Zero-Shot) saves tokens but usually results in poor, buggy output. By breaking the task into a loop of smaller prompts (Planning, Coding, Reviewing, Refining) using agents, you spend more tokens but achieve production-level accuracy.',
    how: 'Click "Run Zero-Shot" to see a single inference pass. Then click "Run Agentic Loop" to watch a multi-agent simulation step-by-step. Compare the final cost and accuracy of both approaches.'
  },
  'context-stuffer': {
    what: 'A visual sandbox demonstrating the "Lost in the Middle" phenomenon (Context Window degradation) across large prompts.',
    why: 'When passing massive documents into standard LLMs, they suffer from a U-shaped accuracy curve. They perfectly recall facts at the beginning (priming) and the end (recency bias), but hallucinate or completely miss facts hidden in the middle of the context. This ruins complex Tokenomics use-cases unless you use a specialized model.',
    how: 'Adjust the "Haystack Size" to increase your context window. Then move the "Needle" to the Beginning, Middle, or End of the prompt. Click Query to see if a standard model can successfully retrieve the hidden fact.'
  },
  'routing-sandbox': {
    what: 'A sandbox demonstrating Dynamic Model Routing—the practice of sending tasks to different models based on complexity.',
    why: 'Using your smartest, most expensive model (like Gemini 1.5 Pro) for simple data extraction is a massive waste of money. Using your fastest, cheapest model (like Gemini 1.5 Flash) for complex reasoning will result in hallucinations and errors. Perfect tokenomics requires dynamic routing.',
    how: 'Look at the top task in the queue. Decide if it requires complex reasoning or if it\'s a simple chore. Click the corresponding button to assign it to Flash or Pro and watch how your budget and accuracy meters react!'
  },
  'caching-playground': {
    what: 'A demonstration of Prompt Caching, where a large context is kept in memory to avoid reprocessing it on every request.',
    why: 'Sending a massive system prompt (like a whole codebase or book) for every user message is extremely slow and expensive because the model has to process the entire document every time. Prompt caching solves this.',
    how: 'Send a message in the chat below. The first request takes time and costs full price as the 50,000 tokens are processed. Send a second message and watch the cost plummet as the context is instantly pulled from the cache instead!'
  },
  'tokenizer-sandbox': {
    what: 'A visual demonstration of how text is chopped into smaller subword pieces called tokens.',
    why: 'Many assume one word equals one token, or that characters have a fixed ratio to tokens. This is false. Certain languages or formats (like JSON) use significantly more tokens for the same amount of data, drastically impacting your API costs.',
    how: 'Type text or use the presets to see our simulated visual tokenizer chop your string into colored chunks. Notice how Japanese or JSON formatting consumes tokens much faster than standard English text.'
  },
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
    caseStudy: 'Zilliz (makers of Milvus) report that in enterprise B2B applications, up to 40% of all user queries are semantically redundant. Implementing GPTCache on top of their LLM pipelines reduced API bills by nearly half.',
  },

  finops: {
    what: 'Attributing spend to features, teams and individual requests, on top of the usage every call already reports.',
    why: 'Total spend and cost-per-request rank features differently, and an invoice only shows you the first — so it cannot tell you where to spend your effort.',
    whyNot: 'It reduces nothing by itself. Attribution buys visibility; the savings still have to come from the techniques above.',
    how: 'Record usageMetadata against a feature tag on every call, then aggregate by feature and by request volume.',
  },

  'kv-cache': {
    what: 'When multiple requests hit the same model concurrently with identical prefixes (like a shared system prompt), the model can cache the KV states for that prefix in memory and reuse them across requests.',
    why: 'Massive cost and latency reduction at scale. It transforms a O(N) memory and compute problem into O(1) for the shared prefix.',
    whyNot: 'It requires strict structural discipline: the shared prefix must be character-for-character identical and appear exactly at the start of every prompt.',
    how: 'Place the shared context (instructions, examples, document corpus) at the very top of your prompt, and append user-specific variables at the very end.',
    caseStudy: 'Anthropic partnered with Notion to implement Prompt Caching for their AI assistant. Because Notion passes massive amounts of user workspace data as context, prefix caching reduced Time-to-First-Token by 50% and slashed API costs by 60%.',
  },

  'prompt-compression': {
    what: 'Using algorithmic techniques or smaller, cheaper models (like Llama-3-8B) to strip semantically redundant tokens from a prompt before sending it to a massive, expensive model.',
    why: 'When passing huge documents (10k+ tokens) where exact phrasing doesn\'t matter, compression can shrink the token count by 3x-4x without degrading extraction accuracy.',
    whyNot: 'Compression destroys formatting, tone, and sometimes subtle nuances. Do not use it for creative writing or strict code generation tasks.',
    how: 'Pass the prompt through a compressor model (e.g., LLMLingua) or a smaller fine-tuned model before sending the compressed string to your final LLM endpoint.',
    caseStudy: 'Microsoft Research released LLMLingua, demonstrating that algorithmically compressing prompts by 2x-3x before sending them to GPT-4 yields identical entity extraction accuracy while drastically cutting the $0.03/1k token inference cost.',
  },

  'agentic-multiplier': {
    what: 'The phenomenon where autonomous agents continually append their thoughts, actions, and observations to the context window, causing token usage to grow exponentially with each reasoning step.',
    why: 'Understanding this prevents "bill shock" when deploying multi-agent systems like ReAct or AutoGen.',
    whyNot: 'It is a warning, not a feature. The goal is to break the loop by persisting state elsewhere.',
    how: 'Instead of passing the entire trajectory string back to the model, parse the agent\'s state into a JSON object and pass only the current state summary and the latest observation.',
    caseStudy: 'Engineers deploying Microsoft AutoGen into production discovered that unmanaged agent histories caused context windows to balloon exponentially in just 10 turns. They had to implement strict state-pruning to remain economically viable.',
  },

  'finetune-vs-rag': {
    what: 'The mathematical breakeven point between the upfront compute cost of fine-tuning a model versus the recurring input token costs of sending retrieved context (RAG) on every request.',
    why: 'To make informed infrastructure decisions based on your actual request volume.',
    whyNot: 'Cost is only one dimension. RAG allows for real-time updates and permissions, whereas fine-tuning bakes knowledge into static weights.',
    how: 'Calculate: (Fine-tune Cost + (Volume * Base Input Cost)) vs (Volume * (Base Input + Retrieved Tokens Cost)). See the calculator on this card.',
  },

  multimodal: {
    what: 'Image tokenization works by slicing images into tiles (e.g., 512x512). A fixed token count is charged per tile.',
    why: 'To accurately estimate costs for Vision pipelines, where high-res images can silently explode your token usage.',
    whyNot: 'Downscaling too much to save tokens can cause the model to hallucinate or miss critical visual details.',
    how: 'Scale your images down on the client side so they span exactly the minimum number of 512x512 tiles required for the task.',
  },

  'quadratic-attention': {
    what: 'The core self-attention mechanism in Transformers scales quadratically. A 100k context window requires 100x more compute (and thus cost/latency) than a 10k window, not 10x.',
    why: 'Understanding this explains why providers charge a premium for long-context models, and why you should keep prompts as short as mathematically possible.',
    whyNot: 'Sometimes you simply need the model to read a massive document. In those cases, you have to pay the O(N²) tax.',
    how: 'Use RAG, summarization pipelines, or sliding-window attention to bound the context length to a linear or smaller scale.',
  },

  'speculative-decoding': {
    what: 'Using a small "draft" model to predict the next few tokens, and using a massive "target" model to verify them all at once in parallel.',
    why: 'It drastically reduces generation latency (Time Per Output Token). The target model does 1 parallel pass instead of 5 sequential passes.',
    whyNot: 'If the draft model is too inaccurate, the target model rejects the tokens and you waste compute. It only works well if the draft model has a high acceptance rate.',
    how: 'This is an infrastructure-level optimization (e.g., using vLLM or specific provider endpoints). As an API user, seek out providers that use this internally.',
    caseStudy: 'Google DeepMind heavily utilizes Speculative Decoding in their Gemini infrastructure. Using a tiny 1B draft model alongside a massive 70B target model increases tokens-per-second (TPS) by 2.5x without changing the final output.',
  },

  'schema-minification': {
    what: 'JSON schemas for tool calling and structured output are sent as input tokens on every turn. Shortening keys and descriptions saves massive token volume.',
    why: 'In a 10-turn agentic loop, a 1,000-token OpenAPI schema costs 10,000 input tokens. Minifying it to 300 tokens saves 7,000 tokens.',
    whyNot: 'If you shorten a description too much, the model might not understand how to use the tool correctly, causing a logic failure.',
    how: 'Use Enums instead of verbose descriptions, shorten parameter names (e.g., "usr_id" instead of "user_account_identification_number"), and strip out redundant instructions.',
  },
  'interactive-rag': {
    what: 'A stepwise demonstration of Retrieval-Augmented Generation (RAG) using semantic search.',
    why: 'Sending an entire document (stuffing) is expensive. Chunking a document and retrieving only the relevant chunk saves LLM bandwidth and cost.',
    whyNot: 'RAG requires embedding infrastructure (a vector database, a chunking strategy) which is complex to maintain compared to simply sending the whole document if it is short.',
    how: 'Embed the user\'s prompt, compute cosine similarity against the embedded document chunks, and only send the top match(es) in the generation prompt.',
  },
};
