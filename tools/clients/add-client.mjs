#!/usr/bin/env node
// Prepare a client page for upload.
//
//   node tools/clients/add-client.mjs <slug> "<ACCESS-CODE>"
//
// Reads tools/clients/private/<slug>.json (copy example-client.json to start),
// adds a hash of the access code (the code itself is never stored), saves
// tools/clients/private/<slug>.ready.json, and prints the commands to upload
// the entry and its files to Cloudflare. The private folder is not committed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [slug, code] = process.argv.slice(2);
if (!slug || !code) {
  console.error('Usage: node tools/clients/add-client.mjs <slug> "<ACCESS-CODE>"');
  process.exit(1);
}
if (!/^[a-z0-9-]{2,40}$/.test(slug)) { console.error('Slug must be lowercase letters, numbers and dashes, like "linkedin".'); process.exit(1); }
const normalized = code.toUpperCase().replace(/[\s-]+/g, '');
if (normalized.length < 10) { console.error('Use a code of at least 10 letters or numbers, like "MAPLE-4827-RIVER".'); process.exit(1); }

const dir = path.join(path.dirname(new URL(import.meta.url).pathname), 'private');
const src = path.join(dir, `${slug}.json`);
if (!fs.existsSync(src)) { console.error(`Create ${src} first (copy example-client.json).`); process.exit(1); }
const client = JSON.parse(fs.readFileSync(src, 'utf8'));
client.codeHash = crypto.createHash('sha256').update(normalized).digest('hex');
const out = path.join(dir, `${slug}.ready.json`);
fs.writeFileSync(out, JSON.stringify(client, null, 2));

const files = new Set();
if (client.logo) files.add(client.logo);
if (client.welcome && client.welcome.photo) files.add(client.welcome.photo);
for (const s of client.sessions || []) if (s.slides) files.add(s.slides);
for (const d of client.downloads || []) if (d.file) files.add(d.file);

console.log(`\nReady: ${out}\n\nUpload the page settings:`);
console.log(`  npx wrangler kv key put --binding=CLIENTS --remote ${slug} --path="${out}"`);
if (files.size) {
  console.log(`\nUpload the files (put them in tools/clients/private/${slug}/ first):`);
  for (const f of files) console.log(`  npx wrangler r2 object put client-files/${slug}/${f} --remote --file="${path.join(dir, slug, f)}"`);
}
console.log(`\nThe page will be at https://waios.com/clients/${slug}  (code: ${code})\n`);
