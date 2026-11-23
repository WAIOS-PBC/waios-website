# Private client pages

Each client gets a private page at `waios.com/clients/<name>` (for example `/clients/linkedin`), unlocked with an access code. The page holds their session videos, slides and links into the public resources. Pages are generic: no company branding beyond the client's own name and logo.

This repository is public, so **no client details live here**. The template is in `src/clients.js`. Each client's settings, files and videos live in your Cloudflare account:

| What | Where |
|---|---|
| Page settings (name, text, sessions, links) | Cloudflare KV, namespace bound as `CLIENTS` |
| Logo, slides, presenter photo | Cloudflare R2, bucket `client-files` |
| Session videos | Cloudflare Stream, set to play only with a signed link |
| Access code | Stored only as a hash in the page settings |

Once someone enters the code, they stay signed in on that browser for 30 days.

## One-time setup (about 30 minutes)

Run these from the repository folder after `npx wrangler login`.

1. **Storage for page settings and files**
   ```
   npx wrangler kv namespace create CLIENTS
   npx wrangler r2 bucket create client-files
   ```
   Paste the KV id into `wrangler.jsonc` and uncomment the two lines under "Private client pages".
2. **Cookie secret** (any long random string; keep it private)
   ```
   npx wrangler secret put CLIENT_COOKIE_SECRET
   ```
3. **Video (Cloudflare Stream)**
   - In the Cloudflare dashboard, open Stream and note your customer code: it is the part after `customer-` in any video link.
     `npx wrangler secret put STREAM_CUSTOMER_CODE`
   - Create a signing key once (dashboard or API: `POST /accounts/<account_id>/stream/keys`). Save the `id` and the base64 `jwk` value it returns; they are shown only once.
     ```
     npx wrangler secret put STREAM_KEY_ID
     npx wrangler secret put STREAM_KEY_JWK
     ```
4. Commit and push. The `/clients/` pages turn on with the next deploy.

## Adding a client

1. Copy `tools/clients/example-client.json` to `tools/clients/private/<name>.json` and fill it in. The `private` folder is never committed.
2. Put the logo, slides and any photo in `tools/clients/private/<name>/`.
3. Upload each video in the dashboard under Stream, turn on **Require signed URLs** for it, and paste its video ID into the matching session's `"video"` field.
4. Pick an access code (at least 10 letters or numbers, like `MAPLE-4827-RIVER`) and run:
   ```
   node tools/clients/add-client.mjs <name> "MAPLE-4827-RIVER"
   ```
   It prints the exact upload commands. Run them, and the page is live. No deploy needed.

**Changing the code or text later:** edit the JSON, run the script again, and rerun the printed upload command.
**Turning a page off:** set `"active": false` and upload again, or delete the KV entry.

## Good to know

- **Sharing:** anyone with the code can get in, and a code can be forwarded. For sensitive recordings, change the code after each cohort, or move to email sign-in later (Cloudflare Access can restrict a page to one email domain).
- **Logos:** the logo also shows on the access screen. Use a client's logo only with their written permission and official files.
- **Video costs (Cloudflare Stream):** about $5 per 1,000 minutes stored and $1 per 1,000 minutes watched.
- **Search engines:** client pages tell search engines not to index them.
