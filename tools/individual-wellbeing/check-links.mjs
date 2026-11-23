// Checks every outside link in the site. Run from the project folder:
//   node tools/individual-wellbeing/check-links.mjs
// Needs Node 18 or later. Some sites block automated checks (403/429); open those by hand.
import fs from "node:fs";
const html = fs.readFileSync(new URL("./source.html", import.meta.url), "utf8");
const urls = [...new Set([...html.matchAll(/https?:\/\/[^\s"'`<>)]+/g)].map(m => m[0].replace(/[.,;]+$/, "")))]
  .filter(u => !/fonts\.(googleapis|gstatic)|yourdomain|cloudflareinsights|challenges\.cloudflare|sitemaps\.org/.test(u));
console.log(`Checking ${urls.length} links...`);
const bad = [];
await Promise.all(urls.map(async (u, i) => {
  await new Promise(r => setTimeout(r, i * 60));
  try {
    let r = await fetch(u, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15000) });
    if (r.status >= 400) r = await fetch(u, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15000) });
    if (r.status >= 400) bad.push([r.status, u]);
  } catch (e) { bad.push(["error", u]); }
}));
bad.sort().forEach(([s, u]) => console.log(s, u));
console.log(bad.length ? `\n${bad.length} links to look at.` : "\nAll links answered.");
