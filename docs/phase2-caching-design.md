# Phase 2 Design — Prompt Caching Demo (A2)

> **For:** Claude Code (build brief)
> **Scope:** Phase 2 ONLY — the caching demo, built on top of the Phase 1R Windows app shell.
> Nothing else. Do NOT build A3–A6 or any Tier B/C demo here.
> **Goal:** Call the same (large enough) prompt twice and show the token numbers move —
> specifically, `cache_read_tokens` going from "not reported" to a real number, and the
> visible cost-relevant savings that implies.
> **Depends on:** Phase 1R must be done — this reuses `ILlmProvider`, `IApiKeyStore`, and the
> app shell. If Phase 1R isn't finished, stop and finish that first.

---

## 0. Assumed Defaults (locked for Phase 2)

These follow directly from what we already confirmed about Gemini's caching model
(see conversation history / Google's own caching docs), not guesses:

1. **Caching is implicit, not explicit.** Gemini 2.5+ models cache automatically — there is
   no "create a cache object" step, unlike Claude's manual `cache_control` blocks. Nothing to
   configure on the request; caching either happens or it doesn't, based on the content.
2. **Minimum size to trigger a cache hit: ~2,048 tokens** (Gemini 2.5 Flash/Pro; newer 3.x
   models may differ — verify against current docs for whichever model `GeminiProvider`
   defaults to before finalizing). A short one-line prompt like A1's demo **will not** cache.
   The demo prompt must be padded with a large fixed block of reference text.
3. **A cache hit is not guaranteed on every run.** Implicit caching is opportunistic. The UI
   must handle "no cache hit this time" as a normal outcome, not an error — show it plainly
   rather than hiding it or retrying silently.
4. **No separate "cache write" number exists** for Gemini implicit caching (unlike Claude).
   `cache_write_tokens` stays `null` always in this demo — do not invent a value.
5. **Same model both calls.** No mixing models between call 1 and call 2 — that would
   confound the comparison.

---

## 1. What the demo shows

1. A large fixed block of reference text (e.g. a few paragraphs of documentation or sample
   text — content doesn't matter, only that it reliably exceeds ~2,048 tokens) plus a short
   question appended to the end.
2. **Call 1:** send the full padded prompt. Expect `cache_read_tokens: not reported` (first
   call — nothing to read from cache yet).
3. **Call 2:** send the *identical* padded prompt again, immediately after. Expect
   `cache_read_tokens` to show a real number close to the size of the fixed block — this is
   the "win" the demo exists to show.
4. Render both results side by side with a diff: input tokens billed at full price vs.
   input tokens served from cache, and the response text for both (to prove quality didn't
   change — same honesty rule as A1).

---

## 2. Core changes needed

`Tokenomics.Core` already returns `CacheReadTokens` on every `MeasureResult` — no new
provider method is needed. This phase is UI + demo-content work, not a `Core` change, unless:

- You want a `MeasureAsync` overload/helper that runs the same prompt N times and returns a
  list of results (small convenience, optional — a Razor page can just call `MeasureAsync`
  twice in a row instead).

Do not add cache-specific parameters to `ILlmProvider` — implicit caching needs no request
changes, which is exactly why Gemini was viable for this without an explicit-cache code path.

---

## 3. UI (new Razor page: `Pages/Caching.razor`)

1. Read-only display of the fixed reference block (or a short description of it — full text
   doesn't need to be user-editable for this demo; A1 already covers free-play).
2. A single "Run Twice" button (not two separate buttons — the point is the back-to-back
   comparison, not letting the user desync the calls).
3. Results panel shows **two** columns/rows: Call 1 and Call 2, each with the same token
   stats table shape as A1, plus a highlighted "cache read tokens" row.
4. A summary line: e.g. "Call 2 read N tokens from cache instead of paying full input price
   for them" — or, if no hit occurred, "No cache hit this time — implicit caching is
   opportunistic and isn't guaranteed on every call," stated plainly, not apologetically.

---

## 4. Acceptance Criteria (Phase 2 is done when…)

- [ ] The fixed reference block reliably exceeds the model's implicit-caching minimum token
      count (verify the actual prompt-token count via a real A1-style call first, don't guess).
- [ ] Running the demo shows Call 1 with `cache_read_tokens` not reported, and — on at least
      most runs — Call 2 with a real `cache_read_tokens` value.
- [ ] A run where Call 2 does NOT get a cache hit is handled cleanly (no crash, no misleading
      "0 tokens saved" — shown as "not reported," consistent with the absent-≠-zero rule).
- [ ] Response text for both calls is shown, not just numbers.
- [ ] No new `Core` provider method was added unless it was strictly necessary (see §2).

---

## 5. Explicitly OUT of scope for Phase 2

- A3–A6 (next phase).
- Explicit/manual cache management — Gemini's `CachedContent` API is a different mechanism
  from what this demo uses and is not part of this phase.
- Any pricing/dollar-cost display — still token-counts-only per the original Phase 1 decision,
  unless that decision has since been revisited.

---

## 6. Notes for the builder

- Before writing the Razor page, run one real `MeasureAsync` call with the intended fixed
  block through the existing A1 path to confirm its actual `input_tokens` count clears the
  caching threshold — don't assume from paragraph count.
- If the model default (`GeminiProvider.DefaultModel`) has changed since Phase 1R (Gemini
  moves fast — 3.x models were already ahead of 2.5 as of Phase 1R), re-verify the minimum
  cache-trigger token count for whichever model is actually in use.
