# Phase 1R Design — Windows App Refactor (A1 carried over)

> **For:** Claude Code (build brief)
> **Scope:** Refactor A1 (measurement) off the Node/web stack onto a .NET MAUI Blazor Hybrid
> Windows app, backed by a shared classlib. Same demo, new shell — no new demos in this phase.
> **Goal:** Prove the desktop shape works: enter a Gemini key in the UI, test the connection,
> store it locally (encrypted), run a prompt, see real token numbers. This shape is what every
> later phase (A2–C3) builds on top of.
> **Status:** In progress. `Tokenomics.Core` and `Tokenomics.Storage.Sqlite` are built and
> smoke-tested. `Tokenomics.Windows` (the MAUI Blazor Hybrid shell) is pending the
> `maui-windows` workload install.

---

## 0. Why this refactor (context for the builder)

Phase 1 was originally built as Node/Express + Claude Agent SDK + static HTML (see
`phase1-design.md`), then re-pointed at Gemini via raw REST from an ASP.NET Core backend
(`token-explorer/backend-dotnet/`). Both of those are now superseded by this phase — not
deleted, just no longer the active target. The reasons for the move to a desktop app:

1. **No browser-exposure constraint.** A desktop app IS the client — the API key can live
   locally without ever crossing a network boundary to untrusted JS. This removes the entire
   "backend hides the key from the frontend" concern that shaped the web architecture.
2. **Future Blazor reuse.** The user's stated plan is a Blazor web app later. MAUI Blazor
   Hybrid means the Razor **UI components**, not just backend logic, carry forward — not
   true of WPF/WinUI.
3. **Multi-provider fan-out is the actual roadmap.** Comparing multiple LLMs side-by-side on
   the same prompt is planned (see open question in original spec). That means the provider
   layer needs to be an abstraction from the start, not a Gemini-shaped single path.

`backend-dotnet/` and `frontend/` (the old web version) are left in place, untouched, as a
parallel reference — not wired into this new app.

---

## 1. Tech Stack

- **Shared logic:** `Tokenomics.Core` — plain classlib (`net10.0`, no Windows-specific
  deps). Provider abstraction (`ILlmProvider`), Gemini implementation, `TokenStats`/
  `MeasureResult` models, `IApiKeyStore` interface (storage contract only, no implementation).
- **Storage:** `Tokenomics.Storage.Sqlite` — classlib. `SqliteApiKeyStore : IApiKeyStore`,
  using `Microsoft.Data.Sqlite` + Windows DPAPI (`System.Security.Cryptography.ProtectedData`,
  `DataProtectionScope.CurrentUser`) to encrypt keys at rest. Marked
  `[SupportedOSPlatform("windows")]` — this project is Windows-only by design; a future Blazor
  host implements its own `IApiKeyStore`.
- **UI shell:** `Tokenomics.Windows` — .NET MAUI Blazor Hybrid app, Windows target
  (`net10.0-windows...`, `maui-windows` workload). Razor components for the UI, hosted in a
  MAUI window instead of a browser tab.
- **DI wiring:** `Core`'s `AddTokenomicsCore()` extension registers providers +
  `ProviderRegistry`. The Windows app registers `IApiKeyStore` itself (platform-specific,
  deliberately not in Core) and calls `AddTokenomicsCore()` in `MauiProgram.cs`.

---

## 2. Solution Structure (current + target)

```
token-explorer/
  backend-dotnet/            # old web backend — left in place, not used by the app below
  frontend/                  # old static frontend — left in place, not used by the app below
  src/
    Tokenomics.Core/                  # DONE
      Models/
        TokenStats.cs
        MeasureResult.cs
        ConnectionTestResult.cs
      Providers/
        ILlmProvider.cs
        ProviderRegistry.cs
        Gemini/
          GeminiProvider.cs
          GeminiApiModels.cs
          GeminiTokenStatsMapper.cs
      Storage/
        IApiKeyStore.cs
      ServiceCollectionExtensions.cs
    Tokenomics.Storage.Sqlite/        # DONE
      SqliteApiKeyStore.cs
    Tokenomics.Windows/               # PENDING — this phase's remaining work
      MauiProgram.cs
      Components/
        Layout/MainLayout.razor
        Pages/Settings.razor             # API key entry + test connection
        Pages/Measure.razor              # A1, moved from the old frontend/index.html
      wwwroot/
        (Blazor Hybrid static assets — css, etc.)
  Tokenomics.sln
```

---

## 3. The Contract (in-process, not HTTP)

There is no REST contract in this phase — Razor components call `Core` services directly
in-process via DI. The equivalent of the old `POST /api/measure` request/response shape
becomes a method call:

```csharp
// Settings.razor
var result = await provider.TestConnectionAsync(apiKey);
if (result.Success) await apiKeyStore.SaveKeyAsync(provider.ProviderId, apiKey);

// Measure.razor
var apiKey = await apiKeyStore.GetKeyAsync("gemini")
    ?? throw new InvalidOperationException("No Gemini key saved — set one in Settings first.");
MeasureResult result = await provider.MeasureAsync(apiKey, provider.DefaultModel, prompt);
```

`MeasureResult.Stats` is the same `TokenStats` shape the old JSON contract used
(`input_tokens`/`output_tokens`/etc., now as C# properties) — the UI rendering rules carry
over unchanged: **absent fields render as "not reported," never 0.**

---

## 4. Settings Page Behavior

1. Text input for the Gemini API key (masked, like a password field).
2. "Test & Save" button:
   - Calls `ILlmProvider.TestConnectionAsync(apiKey)` (Gemini: lightweight `GET /models`
     call — validates the key without spending generation tokens).
   - On success: `IApiKeyStore.SaveKeyAsync("gemini", apiKey)`, show a success indicator.
   - On failure: show the provider's error message inline. Do not save.
3. On page load: `IApiKeyStore.HasKeyAsync("gemini")` — if true, show "a key is already saved"
   (never display the stored key itself back in the UI).
4. A "Clear key" action calling `IApiKeyStore.DeleteKeyAsync("gemini")`.
5. This page is provider-agnostic in structure (loops over `ProviderRegistry.All`) even
   though only Gemini is registered right now — so adding a second provider later doesn't
   require rebuilding this page, only registering the new `ILlmProvider`.

---

## 5. Measure Page Behavior (A1, carried over)

Same behavior as the old `frontend/app.js`, translated to Razor:

1. Textarea for the prompt + a "Run" button + a results panel.
2. On Run: resolve the saved Gemini key via `IApiKeyStore`; if missing, prompt the user to
   go set one up first (don't silently fail).
3. Call `ILlmProvider.MeasureAsync(...)`, show a loading state.
4. On success, render response text + token stats table + model name, same as before.
5. On error (e.g. `GeminiApiException`), show the message cleanly — never leak the key.

---

## 6. Security Rules (carried over, still non-negotiable)

- API key never hardcoded, never logged, never shown back in the UI after saving.
- Encrypted at rest (DPAPI, current-user scope) — confirmed via smoke test: `Protect`/
  `Unprotect` round-trip works; a value that failed to `Unprotect` (wrong user/machine) is
  treated as "no key," not surfaced as an error.
- `TestConnectionAsync` must not cost generation tokens — use a metadata/list endpoint, not
  a real prompt call.

---

## 7. Acceptance Criteria (this phase is done when…)

- [ ] `Tokenomics.Core` builds clean, no Windows-specific dependencies.
- [ ] `Tokenomics.Storage.Sqlite` builds clean; save/get/has/delete round-trip verified.
- [ ] `Tokenomics.Windows` launches as a Windows desktop window (MAUI Blazor Hybrid).
- [ ] Settings page: entering a bad key shows a clean error and does not save; entering a
      good key shows success and persists across an app restart.
- [ ] Measure page: running a prompt with a saved key shows the real response + token stats,
      with "not reported" for absent fields.
- [ ] Closing and reopening the app still has the key saved (SQLite persistence confirmed).
- [ ] No API key appears in any log, exception message, or UI element other than the masked
      input field while typing.

---

## 8. Explicitly OUT of scope for this phase

- A second LLM provider (Claude, OpenAI, etc.) — the abstraction supports it, but only
  Gemini is implemented now.
- Fan-out / side-by-side comparison UI — `ProviderRegistry.All` exists for this, but no page
  uses it yet.
- A2–C3 demos (next phases).
- The Blazor **web** host — this phase is Windows desktop only.

---

## 9. Notes for the builder

- Model name and base URL are not user-configurable in the UI yet — they're constants on
  `GeminiProvider` (`DefaultModel`, base address in `AddTokenomicsCore()`). Fine for now;
  a future phase may want model selection in Settings.
- Keep `Core` free of anything Windows-specific — that boundary is the entire point of the
  split. If a future demo needs something platform-specific (file pickers, etc.), put it in
  the Windows project, not Core.
