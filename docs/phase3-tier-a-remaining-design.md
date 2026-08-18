# Phase 3 Design — Remaining Tier A Demos (A3–A6)

> **For:** Claude Code (build brief)
> **Scope:** Phase 3 ONLY — four demos: model routing (A3), lean vs bloated prompt (A4),
> output capping (A5), structured vs prose (A6). Build all four as one phase since they share
> a required `Core` change (see §1); do not start Tier B/C here.
> **Goal:** Round out the "measure → save" story with the remaining input/output-shaping
> techniques, each a small self-contained before/after comparison like A2's shape.
> **Depends on:** Phase 1R (app shell, provider abstraction) and, loosely, Phase 2 (the
> before/after comparison UI pattern — reuse it rather than reinventing per demo).

---

## 1. Required Core change: generation options

A3–A6 all need request-shaping that `ILlmProvider.MeasureAsync(apiKey, model, prompt, ct)`
doesn't support today (Phase 1R only ever sends bare prompt text). Add one options type,
used by all four demos:

```csharp
// Tokenomics.Core/Models/GenerationOptions.cs
public sealed class GenerationOptions
{
    public int? MaxOutputTokens { get; init; }      // A5
    public string? SystemInstruction { get; init; }  // A4 (bloated vs lean)
    public bool RequestJsonOutput { get; init; }      // A6
}
```

Extend the interface with a default-null overload so Phase 1R/2 call sites don't break:

```csharp
Task<MeasureResult> MeasureAsync(
    string apiKey, string model, string prompt,
    GenerationOptions? options = null, CancellationToken ct = default);
```

`GeminiProvider` maps this onto the real request fields:
- `MaxOutputTokens` → `generationConfig.maxOutputTokens`
- `SystemInstruction` → top-level `systemInstruction` content block (separate from `contents`)
- `RequestJsonOutput` → `generationConfig.responseMimeType = "application/json"`

**Verify these three field names against Gemini's current `generateContent` REST reference
before coding** — don't carry them over from memory; the same discipline that applied to
`usageMetadata` field names in Phase 1R applies here.

---

## 2. A3 — Model Routing

**What it shows:** same prompt, different model tiers, compare token/response tradeoffs.

- Not a `Core` change — `MeasureAsync` already takes `model` as a plain string per call.
  This is purely a UI concern: run the same prompt against 2–3 model names in sequence
  (e.g. a Flash-Lite tier, a Flash tier, a Pro tier) and show results side by side.
- **Free-tier availability is not guaranteed for every tier** (confirmed during Phase 1R
  research — Pro access on the free tier is inconsistent and changes). Each call must be
  wrapped individually: if one model 429s or errors, show that tier as "not available on
  this key/tier" and still render the ones that succeeded — don't fail the whole comparison.
- UI: `Pages/Routing.razor`. A small fixed list of model names to compare (hardcode 2–3 to
  start; a model picker is future work, not this phase).

---

## 3. A4 — Lean vs Bloated Prompt

**What it shows:** same question, fat vs trimmed system prompt → input-token drop.

- Uses `GenerationOptions.SystemInstruction`: one call with a long, redundant system prompt,
  one call with a minimal one, same user question both times.
- UI: `Pages/PromptTrim.razor`. Show both system prompts used (so the comparison is
  legible — the user should be able to see *why* the token count differs, not just that it
  does), both responses, and the input-token diff.

---

## 4. A5 — Output Capping

**What it shows:** same prompt, with/without `maxOutputTokens` + a "be brief" instruction →
output-token drop.

- Uses `GenerationOptions.MaxOutputTokens`. Pick a deliberately generous default prompt (one
  that would naturally produce a long answer) so the cap's effect is visible.
- Note: if `MaxOutputTokens` truncates mid-response, Gemini's `finishReason` will say
  `MAX_TOKENS` rather than `STOP` — surface that in the UI (e.g. a small "truncated" badge)
  so the user understands why the response looks cut off, rather than it looking like a bug.
- UI: `Pages/OutputCap.razor`.

---

## 5. A6 — Structured vs Prose

**What it shows:** same extraction task, JSON output vs free text → output-token drop
(structured output is typically far more token-efficient than prose for the same information).

- Uses `GenerationOptions.RequestJsonOutput`. Pick an extraction-shaped prompt (e.g. "pull
  out the name, date, and amount from this text") where the contrast is meaningful.
- UI: `Pages/Structured.razor`. Render the JSON response in a `<pre>`/code block so it's
  legible, not just dumped as an escaped string.

---

## 6. Acceptance Criteria (Phase 3 is done when…)

- [ ] `GenerationOptions` added to `Core`; `GeminiProvider` maps all three fields correctly,
      verified against a real call for each (not just that it compiles).
- [ ] Existing Phase 1R/2 call sites (which pass no options) still work unchanged.
- [ ] A3: at least two model tiers compared; an unavailable tier fails gracefully, not the
      whole page.
- [ ] A4: visible input-token drop between bloated and lean system prompts, both prompts
      shown in the UI.
- [ ] A5: visible output-token drop with capping; truncation is surfaced, not hidden.
- [ ] A6: visible output-token drop for JSON vs prose; JSON rendered legibly.
- [ ] Every demo still shows response text, not just numbers (the honesty rule from Phase 1
      carries through unchanged).

---

## 7. Explicitly OUT of scope for Phase 3

- Tier B (RAG, compression) — Phase 4.
- Tier C static cards — Phase 5.
- A model picker / arbitrary model input for A3 — fixed list only, this phase.
- Cost/dollar figures — still token-counts-only unless that decision has changed.

---

## 8. Notes for the builder

- Build the `GenerationOptions` change once, then all four demos become mostly UI work reusing
  it — don't design four separate one-off request paths.
- Reuse the before/after comparison layout pattern from Phase 2's `Caching.razor` where it
  fits (A4, A5, A6 are all "two calls, diff the stats" — A3 is "N calls, diff the stats"),
  rather than inventing new layout per page.
