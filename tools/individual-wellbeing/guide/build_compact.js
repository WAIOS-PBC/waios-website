// Builds guide.html (print layout) from the site's resource data.
const fs = require('fs');
const s = fs.readFileSync('/home/claude/financial-wellbeing-library.html', 'utf8');
const bk = q => 'https://bookshop.org/search?keywords=' + encodeURIComponent(q);
const grab = n => { const i = s.indexOf('const ' + n + ' = '); const j = s.indexOf('\n];', i); return eval(s.slice(i + ('const ' + n + ' = ').length, j + 2)); };
const READ = grab('READ'), LISTEN = grab('LISTEN'), TOOLS = grab('TOOLS');
const P = { buffer: 'Build a cushion', automate: 'Put money on autopilot', future: 'Care for your future self', mindset: 'Know your money story', experiences: 'Buy experiences', anticipate: 'Create distance from purchases', others: 'Spend on others', giving: 'Give back', time: 'Buy back time', values: 'Spend on what you value' };
const FAM = { buffer: 'peace', automate: 'peace', future: 'peace', mindset: 'peace' };
const esc = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const font = w => `@font-face{font-family:Inter;font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(`/tmp/fnt/package/files/inter-latin-${w}-normal.woff2`).toString('base64')}) format('woff2')}`;
const pills = p => p.filter(x => P[x]).map(x => `<span class="pill ${FAM[x] ? 'pc' : 'lw'}">${esc(P[x])}</span>`).join('');
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

// Small edits that read better on paper
const FIX = { 'Future You': 'Chat with an AI version of yourself at 60. A preregistered study found it reduced anxiety and strengthened connection to the future self.' };

const books = READ[0].items, articles = READ[1].items;
const toolGroups = name => TOOLS.find(g => g.group === name);
const PEACE_GROUPS = [['Build a cushion', 'buffer'], ['Put money on autopilot', 'automate'], ['Plan and spend', 'values'], ['Your future self', 'future'], ['Support and self-assessment', 'mindset']];
const LIVING_GROUPS = [['Find experiences', 'experiences'], ['Give thoughtful gifts', 'others'], ["Give in someone's honor", 'giving'], ['Give', 'giving'], ['Buy back time', 'time']];
const RENAME = { 'Support and self-assessment': 'Know your money story and get support', Give: 'Give regularly', 'Your future self': 'Care for your future self' };


const item = i => `<div class="it"><a class="t" href="${esc(i.u)}">${esc(i.t)}<span class="ar"> &#8599;</span></a><div class="m">${esc(i.m)}</div><div class="w">${esc(SHORT[i.t] || i.w)}</div></div>`;
const SHORT = {};
const sec = (n, title, body) => { const k = body.indexOf('<div class="it">', body.indexOf('<div class="it">') + 1); const cut = k > 0 ? k : body.length; return `<div class="sec"><div class="keep"><h2><span class="n">${n}</span>${esc(title)}</h2>${body.slice(0, cut)}</div>${body.slice(cut)}</div>`; };
const grp = (name, items) => `<div class="grp"><div class="keep"><h3>${esc(name)}</h3>${item(items[0])}</div>${items.slice(1).map(item).join('')}</div>`;
const nTools = TOOLS.reduce((a, g) => a + g.items.length, 0), nEp = LISTEN.reduce((a, g) => a + g.items.length, 0);
const tg = arr => arr.map(([g]) => grp(RENAME[g] || g, toolGroups(g).items)).join('');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Financial Wellbeing Resource Guide</title><style>
${[400, 500, 600, 700, 800].map(font).join('\n')}
@page { size: Letter; margin: 0.42in 0.45in 0.5in; }
@page :first { margin-top: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: Inter, sans-serif; color: #2E3A45; font-size: 8pt; line-height: 1.26; }
a { text-decoration: none; color: inherit; }
.hero { background: #15283F; color: #F3ECDF; margin: 0.36in 0 0; border-radius: 14px; padding: 0.26in 0.32in 0.18in; position: relative; overflow: hidden; }
.eb { font-size: 7pt; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #F7C948; display: flex; align-items: center; gap: 6px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: linear-gradient(#F7C948 50%, #EF6F6C 50%); display: inline-block; }
.hero h1 { font-size: 26pt; font-weight: 800; letter-spacing: -.025em; line-height: 1.02; margin: 10px 0 8px; color: #FAF8F4; max-width: 5in; }
.hero .sub { font-size: 10.5pt; max-width: 4.6in; opacity: .88; }
.hero .sun { position: absolute; right: 0.6in; top: 0.32in; width: 0.8in; height: 0.8in; border-radius: 50%; background: linear-gradient(#F7C948 50%, #EF6F6C 50%); }
.hero .hz { position: absolute; left: 0; right: 0; top: calc(0.32in + 0.4in - 3px); height: 3px; background: #F7C948; }
.hero .hz::after { content: ""; position: absolute; left: 0; right: 0; top: 3px; height: 1.5px; background: #EF6F6C; }
.hero .hz { left: 4.9in; }
.hero .count { display: flex; gap: 26px; margin-top: 16px; font-size: 7.5pt; opacity: .85; }
.hero .count b { font-size: 15pt; font-weight: 800; color: #FAF8F4; margin-right: 4px; }
.intro { display: grid; grid-template-columns: 1.15fr 1fr 1fr; gap: 8px; margin: 10px 0 9px; font-size: 7.3pt; }
.key { border-left: 3px solid #F7C948; background: #FAF8F4; padding: 8px 10px; border-radius: 0 8px 8px 0; font-size: 7.8pt; }
.key b, .fam b { color: #15283F; display: block; font-size: 8.5pt; margin-bottom: 2px; }
.fam { border-radius: 8px; padding: 8px 10px; font-size: 7.6pt; }
.fam.pc { background: #15283F; color: #F3ECDF; } .fam.pc b { color: #F7C948; }
.fam.lw { background: #F3ECDF; }
.fam span { display: block; }
.how { font-size: 7.6pt; color: #5C7285; margin: -4px 0 12px; }
.how b { color: #15283F; }
.flow { column-count: 3; column-gap: 0.26in; column-fill: auto; }
.sec h2 { font-size: 12pt; font-weight: 800; color: #15283F; letter-spacing: -.015em; margin: 0 0 6px; padding-bottom: 5px; border-bottom: 2px solid #F7C948; display: flex; align-items: baseline; gap: 7px; break-after: avoid; }
.sec h2 .n { font-size: 8pt; font-weight: 700; color: #EF6F6C; }
.sec { margin-bottom: 10px; }
.grp h3 { font-size: 7pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #5C7285; margin: 7px 0 2px; break-after: avoid; }
/* */ .keep { break-inside: avoid; }
.it { break-inside: avoid; padding: 2.5px 0 3.5px; border-bottom: 1px solid #EEEAE2; }
.t { font-weight: 700; color: #15283F; font-size: 7.9pt; line-height: 1.25; display: block; }
.ar { color: #EF6F6C; font-weight: 600; }
.m { font-size: 6.7pt; color: #5C7285; margin-top: 1px; }
.w { font-size: 6.9pt; margin-top: 2px; }
.end { break-inside: avoid; background: #15283F; color: #F3ECDF; border-radius: 10px; padding: 11px 12px; margin-top: 10px; font-size: 7.6pt; }
.end h4 { margin: 4px 0 4px; font-size: 11pt; color: #FAF8F4; }
.end .notes { margin-top: 8px; padding-top: 7px; border-top: 1px solid rgba(243,236,223,.2); font-size: 6.8pt; opacity: .85; display: grid; gap: 3px; }
.end .notes b { color: #F7C948; }
</style></head><body>
<header class="hero"><div class="hz"></div><div class="sun"></div>
<div class="eb"><span class="dot"></span>Individual Wellbeing</div>
<h1>Financial Wellbeing Resource Guide</h1>
<p class="sub">Books, articles, podcast episodes and tools for ten research-backed ways to thrive with money.</p>
<div class="count"><span><b>${books.length}</b>books</span><span><b>${articles.length}</b>articles</span><span><b>${nEp}</b>podcast episodes</span><span><b>${nTools}</b>tools</span><span style="margin-left:auto">November 2026</span></div>
</header>
<div class="intro">
<div class="key"><b>The key: money on your mind costs you joy</b>It is not money itself that dulls enjoyment. It is thinking about it. Seeing a picture of money made people savor a piece of chocolate for less time and enjoy it less (Quoidbach and colleagues, 2010).</div>
<div class="fam pc"><b>Peace of mind</b><span>Build a cushion</span><span>Put money on autopilot</span><span>Care for your future self</span><span>Know your money story</span></div>
<div class="fam lw"><b>Living well</b><span>Buy experiences · Create distance from purchases</span><span>Spend on others · Give back</span><span>Buy back time · Spend on what you value</span></div>
</div>
<p class="how"><b>How to use it:</b> pick the one or two ways that matter most to you right now, then try one resource this week. Every title is a link.</p>
<div class="flow">
${sec('01', 'Books', books.map(item).join(''))}
${sec('02', 'Articles', articles.map(item).join(''))}
${sec('03', 'Podcast episodes', LISTEN.map(g => grp(g.group, g.items)).join(''))}
${sec('04', 'Tools for peace of mind', tg(PEACE_GROUPS))}
${sec('05', 'Tools for living well', tg(LIVING_GROUPS))}
<div class="end"><div class="eb"><span class="dot"></span>Keep going</div><h4>See where to focus first</h4>Take the free four-minute Financial Wellbeing Check-in for a score on each of the ten ways and the resources that fit you best.
<div class="notes"><div><b>No commissions.</b> We do not earn money from any link in this guide.</div><div><b>Education, not advice.</b> Not financial, legal or medical advice.</div><div><b>Prices change.</b> Checked November 2026. Check expiration dates and booking terms before you buy a voucher or gift card.</div></div></div>
</div>
</body></html>`;
if (/—/.test(html.replace(/base64,[^)]+/g, ''))) console.error('EM DASH FOUND');
fs.writeFileSync('/home/claude/guide/compact.html', html);
console.log('ok');
