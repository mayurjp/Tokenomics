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

Nowhere. There is no server and no shared key.

The page calls `generativelanguage.googleapis.com` directly from the browser — Google sends
CORS headers and accepts the preflighted `x-goog-api-key` POST, which is what makes a
backend unnecessary. Each visitor pastes their own key; it is held in their browser and sent
to exactly one place, Google.

This removes every problem a shared key created: no quota split between strangers, no bill
the site owner pays for someone else's clicking, and no secret that a static file was never
able to keep anyway.

What it does not remove: anything running in the page can read the key — browser extensions
with page access, or any XSS bug here. So "remember on this device" is opt-in rather than
the default (otherwise the key lives only until the tab closes), the key is never rendered
in full, and the panel says to use a key restricted to the Generative Language API.

Keys are validated with a `countTokens` call before being stored — no generation, no quota
spent, and a wrong key fails immediately instead of on first use.

## Running it locally

```
npx serve web
```

That is the whole thing — no build, no install, no key needed to look around. It deploys to
GitHub Pages via [`.github/workflows/pages.yml`](.github/workflows/pages.yml) on push to
`main`; set the repo's Pages source to **GitHub Actions**, not "deploy from a branch".

## Demo mode

**With no key, the whole page works on fabricated numbers.** Every card runs, every
comparison fills in, nothing is called. That is the default a first-time visitor gets, and
it is why this is publishable without anyone's key being spent. A banner says so
permanently, because the rest of the time the page's claim is that its numbers are real.

Adding a key switches every card to live calls. `?demo` forces fabricated data back on even
when a key is present — useful for working on the UI without spending quota.

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

Reference only, no API call — these cannot honestly be demonstrated live, so they argue from
numbers instead:

| Card | Shows |
| --- | --- |
| Semantic Caching | Reusing answers rather than tokens |
| FinOps | Attribution and unit economics on top of the measurements |

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
