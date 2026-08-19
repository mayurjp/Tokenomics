# Token Economics Explorer

A learning tool for seeing LLM token economics happen live — each optimization technique is
a small demo that calls Google Gemini for real and shows the token numbers move.

It's a **static site** on GitHub Pages. A visitor clicks a workflow, it fires a fixed prompt
at Gemini, and the page reports exactly what the API said it cost in tokens. Nothing is
estimated or counted locally.

```
web/      # the static site — plain HTML/CSS/JS, no build step, no key
worker/   # Cloudflare Worker that holds the Gemini API key
docs/     # design docs, one per phase
```

Fourteen cards, one lesson each, laid out as a grid you can scan at a glance. Click one to
expand it in place. Cards share no state and no ordering — each can be run, reordered or
removed on its own.

## Where the API key lives — and why not in the page

The key is **not** in the site, encrypted or otherwise. A static page cannot keep a secret
from its own visitors: anything the page can decrypt, so can anyone with devtools, and the
outgoing `x-goog-api-key` header shows up in the Network tab regardless. Committing a key to
a public repo also tends to get it found and auto-revoked by secret scanners.

So the key lives in a small Cloudflare Worker as a host secret, and the browser only ever
talks to that. Two further containments:

- **The browser never sends prompt text.** It sends a workflow id; the prompt is looked up
  server-side in [`worker/src/workflows.js`](worker/src/workflows.js). Whoever finds the
  endpoint can run these prompts and nothing else, against these models and nothing else.
- **Rate limiting per IP**, because a key shared by every visitor is a bill shared by every
  visitor.

Origin filtering is also in place, but it's a filter, not authentication — any non-browser
client can set `Origin` to whatever it likes.

## Running it locally

```
cd worker
npm install
cp .dev.vars.example .dev.vars   # paste a Gemini key from aistudio.google.com
npx wrangler dev                 # http://localhost:8787
```

Then serve the frontend against it in another terminal — `web/config.js` already points at
`localhost:8787`:

```
npx serve web
```

Deploy steps, the API contract, and the pre-launch checklist are in
[`worker/README.md`](worker/README.md). The site itself deploys to GitHub Pages via
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) on push to `main` — set the
repo's Pages source to **GitHub Actions**, not "deploy from a branch".

## Demo mode

Add `?demo` to the URL and the page runs on fabricated data: no API calls, no key, no quota.
A banner says so, loudly and permanently, because the rest of the time the page's whole claim
is that its numbers are real. Useful for working on the UI without spending anything.

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

Reference only, no API call — these cannot honestly be demonstrated live, so they argue from
numbers instead:

| Card | Shows |
| --- | --- |
| Batch API | Half price for work nobody is waiting for |
| Semantic Caching | Reusing answers rather than tokens |
| FinOps | Attribution and unit economics on top of the measurements |

Adding a lesson is a catalog change, not a UI change: demos live in
[`worker/src/demos.js`](worker/src/demos.js) and every comparison card is the same renderer
with a different demo id.

## A note on quota

Gemini's free tier allows **20 `generateContent` requests per day, per model**. A public
deployment sharing one key runs out fast, and the counting cards are effectively free while
the generation cards are the scarce resource. `?demo` exists partly for this reason.

## A note on the design docs

`docs/` was written for an earlier incarnation of this project: a .NET MAUI Blazor Hybrid
Windows desktop app, which has since been removed in favour of the static site above. The
phase docs still hold the substance — what each demo is meant to show, Gemini's implicit
caching behavior, the absent-≠-zero rule for token stats — but their architecture sections
describe code that no longer exists. Read them for the thinking, not the file paths.

The removed .NET code is recoverable from git history at commit `f1a233d`.
