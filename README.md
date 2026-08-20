# Token Economics Explorer

A learning tool for seeing LLM token economics happen live — each optimization technique is
a small demo that calls Google Gemini for real and shows the token numbers move.

It's a **static site** on GitHub Pages. A visitor clicks a workflow, it fires a fixed prompt
at Gemini, and the page reports exactly what the API said it cost in tokens. Nothing is
estimated or counted locally.

```
web/      # the whole app — plain HTML/CSS/JS, no build step, no dependencies
docs/     # design docs, one per phase
```

Fourteen cards, one lesson each, laid out as a grid you can scan at a glance. Click one to
expand it in place. Cards share no state and no ordering — each can be run, reordered or
removed on its own.

## Where the API key lives

Nowhere, and there is currently no way to supply one. Every number on the site is fabricated
to be representative, and no request leaves the page.

The live client is still in the repo and unreferenced: [`web/gemini.js`](web/gemini.js) calls
`generativelanguage.googleapis.com` directly from the browser, which works because Google
sends CORS headers and accepts the preflighted `x-goog-api-key` POST. Turning it back on
means restoring the settings panel and returning `FORCE_DEMO || !getKey()` from `isDemo()` in
[`web/api.js`](web/api.js) — not rebuilding anything.

That path was designed so a visitor brings their own key, held in their browser and sent only
to Google. It removes every problem a shared key creates: no quota split between strangers,
no bill the owner pays for someone else's clicking, and no secret a static file was never
able to keep.

## Running it locally

```
npx serve web
```

That is the whole thing — no build, no install, no key needed to look around. It deploys to
GitHub Pages via [`.github/workflows/pages.yml`](.github/workflows/pages.yml) on push to
`main`; set the repo's Pages source to **GitHub Actions**, not "deploy from a branch".

## The numbers

Every figure on the site is fabricated. Where a value was measured against the real API
while the card was being built, the fixture carries that measurement — the tokenizer
comparisons, the thinking split, the reasoning-effort ladder — so the ratios a reader sees
match what the API actually did. Where it was not, the fixture is a plausible reconstruction.
Either way the banner says so, on every card and on every visit.

## The cards

Backed by `countTokens` — no inference, nothing billed:

| Card | Shows |
| --- | --- |
| Tokenizer | Count any text; tokens are not words |
| Phrasing Cost | Numbers, JSON, language, rarity and whitespace compared |

Backed by `generateContent` — these really run the model:

| Card | Shows |
| --- | --- |
| Baseline Call | What one call reports it spent |
| Thinking Tokens | Reasoning on vs off |
| Prompt Caching | The same long prompt twice; cache reads on the second |
| Model Routing | One prompt across three tiers |
| System Prompt Bloat | A bloated system prompt vs a lean one |
| Output Capping | With and without `maxOutputTokens` |
| Structured Output | The same extraction as prose and as JSON |
| Retrieval vs Stuffing | Whole document vs the one relevant section |
| Context Compression | Full history vs a summary |
| Batch API | Submits a real batch job, then waits for it |

Every card calls a real endpoint. Semantic Caching embeds with `gemini-embedding-001` and
computes cosine similarity in the browser; FinOps measures one call per feature and
attributes cost from what each actually spent:

| Card | Shows |
| --- | --- |
| Semantic Caching | Rewordings hitting a cache; a near-match correctly missing |
| FinOps | Per-feature cost attribution from measured calls |

Adding a lesson is a catalog change, not a UI change: demos live in
[`web/demos.js`](web/demos.js) and every comparison card is the same renderer with a
different demo id.

## A note on quota

Gemini's free tier allows **20 `generateContent` requests per day, per model**. Since every
visitor brings their own key, that limit is theirs rather than shared — but it is still
small: clicking through every generation card costs roughly 17 of the 20. Counting cards use
`countTokens`, which does no inference and has a far larger allowance.

## A note on the design docs

`docs/` was written for an earlier incarnation of this project: a .NET MAUI Blazor Hybrid
Windows desktop app, which has since been removed in favour of the static site above. The
phase docs still hold the substance — what each demo is meant to show, Gemini's implicit
caching behavior, the absent-≠-zero rule for token stats — but their architecture sections
describe code that no longer exists. Read them for the thinking, not the file paths.

The removed .NET code is recoverable from git history at commit `f1a233d`.
