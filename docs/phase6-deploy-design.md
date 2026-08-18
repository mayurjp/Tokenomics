# Phase 6 Design — Deploy

> **For:** Claude Code (build brief)
> **Scope:** Phase 6 ONLY — packaging/distributing what's already built. No new demos.
> **Goal:** Get the app into a shareable, runnable form for someone other than the builder,
> on whichever machine they're on.
> **Depends on:** All prior phases functionally complete enough to be worth distributing —
> doesn't have to be literally everything (A1–C3), but shouldn't ship with obviously broken
> pages.

---

## 0. This phase changed shape from the original plan — read this first

The original spec (`phase1-design.md`) assumed a pure web architecture: static frontend on
GitHub Pages, Node backend on some host, "change `API_BASE` + set a host secret" as the whole
deploy story. That's no longer the architecture — Phase 1R moved this to a MAUI Blazor Hybrid
**Windows desktop app** with local SQLite storage, specifically because the user's near-term
target is a Windows app, with a Blazor **web** version as explicit future work, not the
current target. This phase is split into two sub-phases to match:

- **6A — package the Windows app.** This is the near-term, concrete deliverable.
- **6B — Blazor web host.** This is the "later" work the user described. Do not start 6B
  until it's explicitly asked for — it involves architectural decisions (below) that aren't
  settled yet, unlike 6A which is straightforward packaging of something that already works.

---

## 1. Sub-phase 6A — Package the Windows App

### Goal
Someone who isn't the builder can install and run the app on their own Windows machine
without a .NET SDK, a cloned repo, or `dotnet run`.

### Approach
- **MSIX packaging** is the standard distribution format for MAUI Windows apps — produces a
  signed, installable package. This is the default choice unless there's a reason to prefer
  a raw self-contained `.exe` publish instead (simpler, no signing/store requirements, but a
  less polished install experience).
- `dotnet publish` targeting `net10.0-windows...` with the Windows App SDK packaging project,
  or MSIX via Visual Studio's packaging project — verify current MAUI Windows publish docs
  before committing to exact commands, this tooling changes across SDK versions.

### What must NOT change
- The API key stays local to each install (SQLite + DPAPI, current-user scope) — packaging
  must not centralize, sync, or embed any key. Each installer is key-free; the user enters
  their own key on first run via the Settings page built in Phase 1R.

### Acceptance Criteria (6A done when…)
- [ ] A packaged build installs and runs on a Windows machine without the .NET SDK present.
- [ ] First-run experience: no key saved, Settings page prompts for one, same flow as dev.
- [ ] App icon/name/version are set to something real, not template defaults.
- [ ] No secrets, connection strings, or dev-only config are bundled into the package.

---

## 2. Sub-phase 6B — Blazor Web Host (future, not started until asked for)

### Open questions to resolve before building (do not assume answers)

1. **Blazor Server or Blazor WebAssembly?** This is the single biggest architectural fork:
   - **Blazor Server:** the app runs server-side; the API key can be held server-side
     (closer to the original web backend's trust model) but needs a real multi-user story —
     whose key is it, is it per-user or shared, how is a session's key scoped and cleaned up.
   - **Blazor WASM:** runs client-side like the original static frontend; reintroduces the
     original browser-exposure problem this whole desktop pivot was built to avoid (§0 of
     `phase1r-windows-app-design.md`) — a server-side proxy for the actual provider calls
     would likely come back, meaning part of the old `backend-dotnet/` shape gets revived.
   This decision changes `IApiKeyStore`'s implementation shape entirely (per-user server-side
   store vs. some client-side mechanism) — do not guess; ask before starting 6B.
2. **Single-user demo tool or multi-user hosted app?** If this is still meant as a personal
   learning tool (per the original spec's stated purpose), a single shared server-side key
   might be fine. If multiple people will use a hosted instance, key isolation per user
   becomes a real requirement, not a nice-to-have.
3. **Hosting target** — the original spec assumed GitHub Pages + some backend host; with
   Blazor Server that combination doesn't apply the same way (GitHub Pages can't run a
   server-side Blazor app). Pick a target once 6B is actually scoped.

### What carries over regardless of the above
- `Tokenomics.Core` — the entire provider abstraction, `ILlmProvider`, `GeminiProvider`,
  models — unchanged. This is the payoff of the Phase 1R split.
- The Razor **components** (pages) — largely reusable, since MAUI Blazor Hybrid and Blazor
  Server/WASM all render the same Razor component model. Expect some adjustment (MAUI-specific
  APIs, if any crept in, would need replacing) but not a rewrite.
- What does NOT carry over: `Tokenomics.Storage.Sqlite` as-is — it's `[SupportedOSPlatform
  ("windows")]` and assumes a single local desktop user. 6B needs its own `IApiKeyStore`
  implementation once the questions above are answered.

### Acceptance Criteria (6B — do not attempt until scoped)
Not defined yet — depends on the answers to the open questions above. Do not write this
section speculatively; come back to it once 6B is actually greenlit.

---

## 3. Explicitly OUT of scope for Phase 6

- Any new demo content — this phase is packaging/distribution only.
- 6B specifically, until its open questions are resolved with the user.
- Auth, multi-tenancy, or usage analytics — not part of this app's stated purpose
  (`phase1-design.md` calls it "a learning tool, not a production cost platform" — that framing
  hasn't changed).
