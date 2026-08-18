# Phase 4 Design — Tier B Demos (RAG vs Stuffing, Context Compression)

> **For:** Claude Code (build brief)
> **Scope:** Phase 4 ONLY — B1 (RAG vs stuffing) and B2 (context compression). These are
> "live, but you build a small step around the provider call" demos — unlike Tier A, the
> token savings come from work the app does *before* calling Gemini, not from a request
> parameter. Do not start Tier C here.
> **Goal:** Teach "save before you call" — the token cost of what you retrieve/summarize
> matters more than any request-time knob.
> **Depends on:** Phase 1R (app shell) and Phase 3 (`GenerationOptions`, if B2's summarization
> step reuses `MaxOutputTokens` to keep summaries short — optional, not required).

---

## 1. No required `Core` interface change

Unlike Phase 3, B1 and B2 don't need new fields on `MeasureAsync` — they need application
logic that runs *before* the existing call. That logic can live in `Core` as plain helper
classes (not part of `ILlmProvider`, since it's not provider-specific), or directly in the
Windows project if it's UI-adjacent. Recommendation: put it in `Core` under a new
`Context/` folder, since a future Blazor host will want the same retrieval/compression logic,
not just the same provider calls.

---

## 2. B1 — RAG vs Stuffing

**What it shows:** whole document in context vs. a retrieved relevant snippet → large
input-token drop, same (or comparably good) answer.

### Content needed
- A fixed sample "document" — long enough that stuffing it whole is obviously expensive
  (a few thousand tokens; reuse Phase 2's fixed reference block if it fits, or a new one).
- A fixed question whose answer lives in one identifiable section of that document.

### Retrieval approach — keep it simple, this is a demo, not a search engine
- **Recommended:** naive chunking + keyword/substring match, or a simple embeddings call if
  Gemini's embedding endpoint is already easy to reach (`text-embedding-*` models via the
  same REST pattern as `generateContent`). A full vector DB is out of scope — don't add one.
- `Core/Context/NaiveRetriever.cs`: splits the fixed document into chunks (e.g. by paragraph),
  scores chunks against the question (simple term overlap is enough), returns the
  top-N chunks as the "retrieved context."

### Demo flow
1. **Call 1 (stuffing):** send the whole document + question as the prompt.
2. **Call 2 (RAG):** run the retriever first, send only the retrieved chunk(s) + question.
3. Show both `input_tokens` counts side by side (the drop should be dramatic) and both
   responses (so the user can judge whether RAG's answer held up — the honesty rule again).

### UI
`Pages/Rag.razor` — similar before/after layout to Phase 2/3, plus a small panel showing
*which* chunk(s) got retrieved, so the mechanism is visible, not a black box.

---

## 3. B2 — Context Compression

**What it shows:** long conversation history sent verbatim vs. summarized → input-token drop.

### Content needed
- A fixed, longish multi-turn conversation history (a handful of back-and-forth turns) plus
  a final question that depends on earlier context.

### Compression approach
- `Core/Context/HistoryCompressor.cs`: calls Gemini once to summarize the history into a
  short paragraph (this summarization call's own tokens are a real cost — decide whether to
  count them in the comparison or treat them as a one-time setup cost, and **show that
  decision explicitly in the UI** rather than silently excluding them — hiding a cost
  contradicts the honesty rules this whole app is built around).

### Demo flow
1. **Call 1 (verbatim):** send full history + final question.
2. **Call 2 (compressed):** send summarized history + final question (optionally showing the
   summarization call's own token cost as a separate line item, per the note above).
3. Show both `input_tokens` and both final responses.

### UI
`Pages/Compress.razor` — same before/after pattern, plus the summary text itself shown so
the user can see what got compressed away.

---

## 4. Acceptance Criteria (Phase 4 is done when…)

- [ ] B1: retrieval logic is simple and inspectable (no external vector DB dependency added).
      Stuffing vs RAG input-token drop is visible and large. Retrieved chunk(s) shown in UI.
- [ ] B2: compression logic works via one summarization call. The summarization call's own
      token cost is either included in the comparison or clearly labeled as excluded — not
      silently dropped either way.
- [ ] Both demos show final response text for both branches, not just token numbers.
- [ ] No vector database, no external retrieval service — everything runs in-process.

---

## 5. Explicitly OUT of scope for Phase 4

- Tier C (Phase 5).
- Real embeddings/vector search infrastructure — naive retrieval is sufficient for the demo's
  teaching purpose.
- Persisting conversation history across app sessions — the fixed sample history is enough.

---

## 6. Notes for the builder

- Keep retrieval/compression logic out of `ILlmProvider` — it's not provider-specific
  behavior, it's app logic that happens to call a provider. Don't let the interface grow to
  fit these two demos' particular needs.
- If B2's summarization call reuses `GenerationOptions.MaxOutputTokens` from Phase 3 to keep
  the summary short, that's a fine reuse — but Phase 3 must land first.
