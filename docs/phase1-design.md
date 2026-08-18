# Phase 1 Design — Token Economics Explorer (A1: Measurement)

> **For:** Claude Code (build brief)
> **Scope:** Phase 1 ONLY — the measurement demo + a working local round-trip. Nothing else.
> **Goal:** Prove the full stack works end to end: browser → backend → Claude Agent SDK → real token
> numbers back on screen. Everything after this (caching, routing, etc.) is a later phase — do NOT build it.

---

## 0. Assumed Defaults (locked for Phase 1)

These were left open; here are the decisions to build against:

1. **Cost estimation:** NOT in Phase 1. Show **token counts only** (input / output / total + cache/reasoning
   if present). No pricing table, no dollar figures. (Counts are always accurate; prices go stale.)
2. **Prompts:** Phase 1 has **one free-play input** — the user types any prompt and sees its token breakdown.
   (A/B fixed-prompt demos come in later phases.)
3. **v1 scope:** This phase = **A1 only**. One backend endpoint, one frontend page.
4. **Streaming:** **Non-streaming.** Read the final usage after the response completes (simpler, accurate).
5. **Model:** Single Claude model. Use **`claude-sonnet-4-6`** as the default (good middle tier).
   Put it in one constant so it's trivial to change later.

---

## 1. Tech Stack

- **Backend:** Node 18+, Express, TypeScript, ES modules (`"type": "module"`)
  - `@anthropic-ai/claude-agent-sdk` (the SDK — authenticates via `ANTHROPIC_API_KEY` env var)
  - `cors`, `dotenv`
  - dev: `tsx`, `typescript`, `@types/*`
- **Frontend:** vanilla HTML/CSS/JS. **No framework, no build step.**
- **Config:** backend `.env` (git-ignored); frontend `config.js` holding `API_BASE`.

---

## 2. Folder Structure (create exactly this)

```
token-explorer/
  backend/
    src/
      server.ts          # Express app: CORS, JSON, mounts routes, starts server
      config.ts          # reads env: PORT, MODEL constant, (ANTHROPIC_API_KEY used by SDK)
      tokenStats.ts      # TokenStats type + normalizer (maps SDK usage -> TokenStats)
      routes/
        measure.ts       # POST /api/measure  -> runs SDK, returns TokenStats
    .env.example         # ANTHROPIC_API_KEY=  /  PORT=8000   (real .env is git-ignored)
    .gitignore           # node_modules, dist, .env
    package.json
    tsconfig.json
  frontend/
    index.html           # single page: prompt box, Run button, results panel
    config.js            # window.API_BASE = "http://localhost:8000"
    app.js               # calls backend, renders TokenStats
    styles.css           # minimal clean styling
  README.md              # how to install, set key, run both sides
```

---

## 3. The Contract Between Frontend & Backend

### Request
```
POST {API_BASE}/api/measure
Content-Type: application/json
{ "prompt": "user's text here" }
```

### Response (200)
```json
{
  "model": "claude-sonnet-4-6",
  "response_text": "Claude's actual answer (shown to the user, not just numbers)",
  "stats": {
    "input_tokens": 0,
    "output_tokens": 0,
    "total_tokens": 0,
    "cache_read_tokens": null,
    "cache_write_tokens": null,
    "reasoning_tokens": null
  },
  "raw": { }
}
```

### Error (4xx/5xx)
```json
{ "error": "human-readable message" }
```

**Rules:**
- `stats` fields that the SDK did NOT report come back as `null` (NOT 0 — absent ≠ zero).
- Always include `response_text` so the user sees the answer, not only token counts.
- `raw` = the untouched usage object from the SDK, for the curious / debugging.

---

## 4. `TokenStats` — the normalizer (backend/src/tokenStats.ts)

```ts
export type TokenStats = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cache_read_tokens: number | null;
  cache_write_tokens: number | null;
  reasoning_tokens: number | null;
};

// Map the SDK's usage payload into TokenStats.
// IMPORTANT: verify exact field names against the SDK's actual usage object.
// The SDK streams messages; capture the usage reported on the final/result message.
// Known field name candidates to check: input_tokens, output_tokens,
// cache_read_input_tokens, cache_creation_input_tokens.
export function toTokenStats(usage: any): TokenStats { /* ... */ }
```

> **Verify-before-final step for Claude Code:** confirm the SDK's real usage field names
> from the installed package types / the Agent SDK TypeScript reference, and map them here.
> Do not hardcode field names from memory — read them from the SDK types.

---

## 5. Backend behavior (measure.ts)

1. Read `prompt` from body; if missing/empty → 400 `{ error: "prompt is required" }`.
2. Call the SDK's `query()` with the prompt and the default model from `config.ts`.
3. Consume the streamed messages to completion (non-streaming from the client's view).
4. Collect the assistant text → `response_text`.
5. Capture the usage from the final result message → `toTokenStats()` → `stats`.
6. Return the response JSON in the shape above.
7. Wrap in try/catch → 500 `{ error: <message> }` on failure. Never leak the API key in errors.

**Deployment-ready rules (must follow):**
- API key ONLY from `process.env.ANTHROPIC_API_KEY` (never hardcoded, never returned).
- `PORT` from `process.env.PORT` with fallback `8000`.
- CORS enabled (allow the frontend origin; `*` is fine for local Phase 1).
- No secrets in the repo; `.env` is git-ignored; ship `.env.example`.

---

## 6. Frontend behavior (app.js)

1. Read `window.API_BASE` from `config.js`.
2. A textarea for the prompt + a "Run" button + a results panel.
3. On Run: POST to `{API_BASE}/api/measure`, show a loading state.
4. On success, render:
   - The **response text** (so quality is visible).
   - A small table of the token stats. For `null` fields, print **"not reported"**, not 0.
   - The model name.
5. On error, show the error message cleanly.
6. No frameworks; plain fetch + DOM. Keep it readable.

---

## 7. README.md must include

- Prereqs: Node 18+, an Anthropic API key.
- Backend: `cd backend` → `npm install` → copy `.env.example` to `.env` → paste key → `npm run dev`.
- Frontend: open `frontend/index.html` directly, or serve it (e.g. `npx serve frontend`).
  Note: if opening as a file causes CORS issues, serve it over http instead.
- Confirm `config.js` `API_BASE` matches the backend port.
- One-line note: "Deployment later = change API_BASE + set the key as a host secret. No code changes."

---

## 8. Acceptance Criteria (Phase 1 is done when…)

- [ ] `npm install` succeeds in `backend/`.
- [ ] With a valid key in `.env`, `npm run dev` starts the server on the configured port.
- [ ] Opening the frontend, typing a prompt, and clicking Run shows: the response text +
      input/output/total token counts from a **real** Claude call.
- [ ] Fields the SDK doesn't report show "not reported", not 0.
- [ ] No API key appears anywhere in the frontend, the repo, or any error message.
- [ ] Changing `API_BASE` is the only change needed to point at a deployed backend.

---

## 9. Explicitly OUT of scope for Phase 1 (do NOT build)

- Prompt caching demo (A2) and all other Tier A demos.
- Model routing / model picker UI.
- Cost / pricing table / dollar figures.
- RAG, context compression (Tier B).
- Batch / semantic-cache / FinOps cards (Tier C).
- Auth, databases, persistence, analytics, dashboards.

Build the smallest thing that proves the round-trip. Stop when Section 8 passes.

---

## 10. Notes for the builder (Claude Code)

- The Agent SDK was renamed from the Claude Code SDK; use `@anthropic-ai/claude-agent-sdk`
  and the `query()` function. Verify the current version and `query()` signature from the
  installed package before finalizing.
- Verify the usage field names from the SDK types (see §4) — this is the one place guessing
  from memory will cause wrong numbers.
- Keep everything in one language (TypeScript backend, plain JS frontend) and dependency-light.
