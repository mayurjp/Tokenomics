# Tokenomics proxy (Cloudflare Worker)

Holds the Gemini API key so the static site in [`../web`](../web) doesn't have to.

## Why this exists

A static page cannot keep a secret from its own visitors. Anything the page can decrypt,
a visitor can decrypt too — and even without that, the outgoing `x-goog-api-key` header
is visible in the browser's Network tab. So the key lives here as a Worker secret, the
browser never sees it, and the site stays a pile of static files.

## Contract

| Route | Behavior |
| --- | --- |
| `GET /api/workflows` | The workflow catalog: id, label, description, model, prompt. |
| `POST /api/measure` | Body `{ "workflowId": "phase1" }`. Runs that workflow's prompt. |

Success (200):

```json
{
  "model": "gemini-3.5-flash",
  "response_text": "…",
  "stats": {
    "input_tokens": 0, "output_tokens": 0, "total_tokens": 0,
    "cache_read_tokens": null, "cache_write_tokens": null, "reasoning_tokens": null
  },
  "raw": { }
}
```

Errors: `{ "error": "human-readable message" }`. Stats fields the API did not report are
`null`, never `0` — absent and zero are different facts, and the UI renders them
differently.

**The browser never sends prompt text.** It sends a workflow id, and the prompt is looked
up server-side in [`src/workflows.js`](src/workflows.js). That keeps this from being an
open Gemini relay: whoever finds the endpoint can run these prompts and nothing else.

## Local dev

```
cd worker
npm install
cp .dev.vars.example .dev.vars   # paste a real key from aistudio.google.com
npx wrangler dev                 # serves on http://localhost:8787
```

Then serve the frontend against it — `web/config.js` already points at `localhost:8787`:

```
npx serve web
```

## Deploy

```
npx wrangler secret put GEMINI_API_KEY     # prompts for the key; never goes in a file
npx wrangler deploy
```

Then, before making the site public:

1. Set `ALLOWED_ORIGIN` in `wrangler.toml` to your Pages origin (`https://<user>.github.io`)
   and redeploy. An empty value disables the origin check, which is right for local dev and
   wrong for production.
2. Uncomment the `MEASURE_LIMITER` rate-limit binding in `wrangler.toml`. The key is shared
   by every visitor, so an unthrottled endpoint is an unthrottled bill.
3. In Google Cloud Console, restrict the key to the Generative Language API only, so a leak
   can't reach anything else.

`Origin` filtering is not authentication — any non-browser client can set it to whatever it
likes. The containment that actually holds is the server-side prompt catalog plus the rate
limit.
