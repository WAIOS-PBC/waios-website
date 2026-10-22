# waios.com

The public website for WAIOS, P.B.C., deployed on Cloudflare (Workers static assets).

- public/: everything that is served (pages, images, favicon)
- public/dc-lite.js: powers the interactive heat maps on the Wellbeing Measure page
- wrangler.jsonc: tells Cloudflare to serve the public folder and run the form handler
- src/worker.js: handles every form on the site (POST /api/lead) and emails each submission to Danielle (dposa@globalwellbeinggroup.com) with a copy to Jen (jen@jennifer-moss.com), with reply-to set to the person who filled it in
- public/forms.js: sends the site's forms to that handler, so nobody has to open an email app

Any push to main redeploys the site.
