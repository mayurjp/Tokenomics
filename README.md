# Token Economics Explorer

A learning tool for seeing LLM token economics happen live — each optimization technique is
a small demo that calls Google Gemini for real and shows the token numbers move.

Design docs for every phase live in [`docs/`](docs/) — start with
[`docs/phase1-design.md`](docs/phase1-design.md) for the original plan and
[`docs/phase1r-windows-app-design.md`](docs/phase1r-windows-app-design.md) for the current
architecture.

## Current architecture

The active app is a **.NET MAUI Blazor Hybrid Windows desktop app** (in progress — see
`docs/phase1r-windows-app-design.md`), built on a shared classlib so the same logic carries
over to a Blazor web app later:

```
src/
  Tokenomics.Core/            # provider abstraction, Gemini client, token-stats models
  Tokenomics.Storage.Sqlite/  # local encrypted API-key storage (DPAPI + SQLite)
  Tokenomics.Windows/         # MAUI Blazor Hybrid app
```

The desktop app calls Gemini directly through `Tokenomics.Core` — no REST layer, since it
holds its own key locally rather than needing to hide it from browser JS.

## Prerequisites

- .NET 10 SDK with the `maui-windows` workload (`dotnet workload install maui-windows`)
- A Gemini API key (free tier) from [aistudio.google.com](https://aistudio.google.com)

## Running the Windows app

```
cd src/Tokenomics.Windows
dotnet run -f net10.0-windows10.0.19041.0
```

On first launch, go to **Settings**, paste your Gemini key, and click **Test & Save** — it's
validated against the API and stored locally (encrypted via Windows DPAPI) before saving.
Then use **Measure** (the home page) to run prompts and see real token stats. No `.env` or
config file editing needed.
