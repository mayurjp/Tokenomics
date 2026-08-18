# Phase 5 Design — Tier C Explainer Cards (Static)

> **For:** Claude Code (build brief)
> **Scope:** Phase 5 ONLY — static, clearly-labeled illustrative cards for techniques that
> can't be demonstrated live in one call: Batch API, semantic caching, FinOps. No live provider
> calls in this phase at all.
> **Goal:** Complete the "optimize" third of the measure → save → optimize story with honest,
> labeled-as-illustrative content, without pretending these are live demos.
> **Depends on:** Phase 1R (app shell/navigation) only. Independent of Phases 2–4 otherwise —
> can be built in parallel with any of them if useful.

---

## 1. The core rule for this phase

Every number on every card in this phase is **illustrative, not measured** — because these
techniques structurally can't be shown in one round-trip the way Tier A/B can (batch responses
arrive asynchronously over hours; semantic caching needs a corpus of prior queries; FinOps is
an aggregation/dashboard concern, not a single API call). This is explicitly allowed by the
original honesty rules (`phase1-design.md` §7, rule 4) — but only if every illustrative number
is **visibly labeled as illustrative**, not blended in with the real measured numbers from
Tier A/B. Do not reuse the same results-table component from Tier A/B without a clear visual
distinction (e.g. a persistent "ILLUSTRATIVE — NOT A LIVE CALL" badge on these pages).

---

## 2. C1 — Batch API card

Static content covering:
- What it is: asynchronous, offline-processed requests (results within a window, typically
  hours) instead of synchronous calls.
- Illustrative discount figure (~50% off standard pricing) — labeled "illustrative, as of
  `<date>`, verify against current Gemini Batch API pricing before trusting this number in any
  real decision."
- When it makes sense: high-volume, non-interactive workloads (bulk classification,
  offline analysis) — not chat-style interactive use.

## 3. C2 — Semantic Caching card

Static content covering:
- What it is: caching *answers* to semantically similar (not identical) questions, via a
  vector store lookup before hitting the LLM at all — distinct from Gemini's implicit
  token-level caching shown in Phase 2, which requires identical content, not just similar
  meaning.
- Illustrative before/after: a repeated-question scenario where a semantic cache would skip
  the LLM call entirely for a rephrased-but-equivalent question.
- Explicitly note the infrastructure cost this implies (vector store, embedding calls to
  check similarity) — it's not free the way implicit caching is; that tradeoff is the point
  of showing this only as a static card rather than a live demo.

## 4. C3 — FinOps card

Static content covering:
- What it is: attribution (which team/feature/user is spending what), budgets, unit
  economics — a dashboarding/aggregation concern that sits on top of the token numbers this
  app already measures, not a technique that reduces tokens itself.
- Illustrative mock of what a unit-economics view might look like (e.g. "cost per completed
  user request" as a derived metric) — again clearly labeled illustrative.
- Note explicitly: this card is about *using* the measurements from Tier A/B/C1/C2, not a
  fourth optimization technique — don't present it as if it saves tokens on its own.

---

## 5. UI

- `Pages/BatchApi.razor`, `Pages/SemanticCaching.razor`, `Pages/FinOps.razor` (or one
  `Pages/Explainers.razor` with three sections — either is fine, pick whichever fits the
  existing navigation shape better).
- Reuse the app's existing layout/typography, but the illustrative-badge requirement from §1
  applies to all three.

---

## 6. Acceptance Criteria (Phase 5 is done when…)

- [ ] All three cards render with zero live provider calls.
- [ ] Every numeric figure on every card is visibly labeled illustrative, with a date.
- [ ] C2 explicitly distinguishes itself from Phase 2's implicit caching (different mechanism,
      different cost tradeoff) rather than implying it's "more of the same."
- [ ] C3 explicitly frames itself as consuming the app's existing measurements, not a new
      token-reduction technique.

---

## 7. Explicitly OUT of scope for Phase 5

- Any live call to Gemini's Batch API or an embeddings endpoint — even a working prototype of
  either would make this Tier B, not Tier C, and is out of scope here.
- A real vector store / FinOps dashboard backend — static content only.

---

## 8. Notes for the builder

- If it turns out any of these three actually *can* be shown live cheaply (e.g. Gemini's
  embeddings endpoint turns out trivial to wire up for a mini semantic-cache demo), that's a
  scope change worth flagging back to the user before building it — don't unilaterally
  upgrade a Tier C card into a live demo without checking, since the whole point of the
  Tier A/B/C split is a deliberate, agreed boundary.
