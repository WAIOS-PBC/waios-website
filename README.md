# waios.com

The public website for WAIOS, P.B.C., deployed on Cloudflare (Workers static assets).

- public/: everything that is served (pages, images, favicon)
- public/dc-lite.js: powers the interactive heat maps on the Wellbeing Measure page
- wrangler.jsonc: tells Cloudflare to serve the public folder

Any push to main redeploys the site.
