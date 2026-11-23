// Private client pages at /clients/<slug>
//
// Each client gets one page, unlocked with a shared access code. Nothing about a
// client lives in this (public) repository:
//   - CLIENTS (KV): one JSON entry per client, keyed by slug (see tools/clients/)
//   - CLIENT_FILES (R2): logos and slide PDFs, under "<slug>/<file>"
//   - Cloudflare Stream: session videos, set to require signed URLs
//   - Secrets: CLIENT_COOKIE_SECRET (signs the "unlocked" cookie),
//              STREAM_KEY_ID + STREAM_KEY_JWK (sign video tokens), STREAM_CUSTOMER_CODE
// Pages are generic: no company branding beyond what each client entry provides.

const COOKIE_DAYS = 30;
// Shown on every client page unless a client entry sets its own "welcome" details.
const DEFAULT_PRESENTER = {
  from: 'Danielle Posa',
  role: 'Workplace Wellbeing Advisor',
  photo: '/images/b88a438a9b72a68ab115ed7d9d463096.jpg'
};
const enc = new TextEncoder();

export async function handleClients(request, env) {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/clients\/?/, '').split('/').filter(Boolean);
  if (!parts.length) return notFound();
  const slug = parts[0].toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return notFound();
  if (!env.CLIENTS || !env.CLIENT_COOKIE_SECRET) return notFound();

  const client = await env.CLIENTS.get(slug, 'json');
  if (!client || client.active === false) return notFound();

  const sub = parts.slice(1).join('/');
  const unlocked = await hasAccess(request, env, slug);

  // Logo: shown on the access screen too, so it is not gated.
  if (sub === 'logo') return serveFile(env, client.logo ? `${slug}/${client.logo}` : null, false);

  if (sub === 'unlock' && request.method === 'POST') {
    const form = await request.formData().catch(() => null);
    const code = String((form && form.get('code')) || '').trim();
    await new Promise(r => setTimeout(r, 400)); // slow down guessing
    if (code && client.codeHash && timingSafeEqual(await sha256Hex(normalizeCode(code)), client.codeHash)) {
      const cookie = await makeCookie(env, slug);
      return new Response(null, { status: 303, headers: { Location: `/clients/${slug}`, 'Set-Cookie': cookie, 'Cache-Control': 'no-store' } });
    }
    return html(gatePage(client, slug, true), 401);
  }

  if (sub === 'signout') {
    return new Response(null, { status: 303, headers: { Location: `/clients/${slug}`, 'Set-Cookie': `cl_${slug}=; Path=/clients/${slug}; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
  }

  if (!unlocked) {
    if (sub) return new Response(null, { status: 303, headers: { Location: `/clients/${slug}` } });
    return html(gatePage(client, slug, false), 200);
  }

  if (sub.startsWith('files/')) {
    const name = sub.slice(6);
    const allowed = (client.sessions || []).some(s => s.slides === name) || (client.downloads || []).some(d => d.file === name) || (client.welcome && client.welcome.photo === name);
    return allowed ? serveFile(env, `${slug}/${name}`, true) : notFound();
  }
  if (sub) return notFound();

  const videos = {};
  for (const s of client.sessions || []) {
    if (s.video) videos[s.video] = await videoUrl(env, s.video).catch(() => null);
  }
  return html(clientPage(client, slug, videos), 200);
}

// ---------- access ----------
function normalizeCode(c) { return c.toUpperCase().replace(/[\s-]+/g, ''); }
async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function hmac(env, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.CLIENT_COOKIE_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return b64url(new Uint8Array(sig));
}
async function makeCookie(env, slug) {
  const exp = Math.floor(Date.now() / 1000) + COOKIE_DAYS * 86400;
  const val = `${exp}.${await hmac(env, `${slug}.${exp}`)}`;
  return `cl_${slug}=${val}; Path=/clients/${slug}; Max-Age=${COOKIE_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
}
async function hasAccess(request, env, slug) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)cl_${slug}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return timingSafeEqual(sig, await hmac(env, `${slug}.${exp}`));
}

// ---------- files and video ----------
async function serveFile(env, key, isPrivate) {
  if (!key || !env.CLIENT_FILES) return notFound();
  const obj = await env.CLIENT_FILES.get(key);
  if (!obj) return notFound();
  const h = new Headers();
  obj.writeHttpMetadata(h);
  if (!h.get('Content-Type')) h.set('Content-Type', key.endsWith('.pdf') ? 'application/pdf' : key.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream');
  h.set('Cache-Control', isPrivate ? 'private, no-store' : 'public, max-age=86400');
  h.set('X-Content-Type-Options', 'nosniff');
  return new Response(obj.body, { headers: h });
}
// Signed Cloudflare Stream player URL, valid for a few hours.
async function videoUrl(env, uid) {
  if (!env.STREAM_CUSTOMER_CODE) return null;
  if (!env.STREAM_KEY_ID || !env.STREAM_KEY_JWK) return `https://customer-${env.STREAM_CUSTOMER_CODE}.cloudflarestream.com/${uid}/iframe`;
  const jwk = JSON.parse(atob(env.STREAM_KEY_JWK));
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(enc.encode(JSON.stringify({ alg: 'RS256', kid: env.STREAM_KEY_ID })));
  const body = b64url(enc.encode(JSON.stringify({ sub: uid, kid: env.STREAM_KEY_ID, exp: now + 4 * 3600, nbf: now - 60 })));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${head}.${body}`));
  return `https://customer-${env.STREAM_CUSTOMER_CODE}.cloudflarestream.com/${head}.${body}.${b64url(new Uint8Array(sig))}/iframe`;
}
function b64url(bytes) {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------- pages ----------
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function paras(t) { return String(t || '').split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join(''); }
function html(body, status) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY' } });
}
function notFound() { return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }); }

const CSS = `
*{box-sizing:border-box}body{margin:0;background:#FAF8F4;color:#2E3A45;font-family:Inter,'Helvetica Neue',Helvetica,Arial,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:#15283F}h1,h2,h3{color:#15283F;line-height:1.2;margin:0}p{margin:0 0 10px}
.wrap{max-width:1040px;margin:0 auto;padding:0 24px}
.top{border-bottom:1px solid #E6E2DA;background:#FAF8F4}.top .wrap{display:flex;align-items:center;justify-content:space-between;min-height:64px;gap:16px}
.mark{font-weight:700;color:#15283F;text-decoration:none;font-size:1rem}.top a.out{font-size:.88rem;color:#5C7285}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:.74rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#5C7285}
.dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(#F7C948 50%,#EF6F6C 50%)}
.hero{padding:56px 0 32px}.hero-in{display:grid;grid-template-columns:auto 1fr;gap:28px;align-items:center}
.logo{width:96px;height:96px;border-radius:18px;background:#fff;border:1px solid #E6E2DA;display:flex;align-items:center;justify-content:center;padding:14px}.logo img{max-width:100%;max-height:100%}
.hero h1{font-size:clamp(1.9rem,3.6vw,2.7rem);margin:8px 0 10px;letter-spacing:-.02em}.hero .lede{font-size:1.1rem;max-width:62ch}
.horizon{height:6px;width:140px;margin:22px 0 0;background:linear-gradient(#F7C948 50%,#EF6F6C 50%);border-radius:3px}
.welcome{background:#fff;border:1px solid #E6E2DA;border-radius:16px;padding:24px 26px;margin:8px 0 36px;display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start}
.welcome img{width:76px;height:76px;border-radius:50%;object-fit:cover;object-position:50% 15%}.welcome .sig{font-weight:700;color:#15283F;margin-top:6px}.welcome .role{font-size:.9rem;color:#5C7285}
.sec-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 16px;border-bottom:1px solid #E6E2DA;padding-bottom:10px}.sec-h h2{font-size:1.4rem}
.sessions{display:grid;gap:22px;margin-bottom:44px}
.session{background:#fff;border:1px solid #E6E2DA;border-radius:16px;overflow:hidden;display:grid;grid-template-columns:1.35fr 1fr}
.player{position:relative;background:#15283F;aspect-ratio:16/9}.player iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.player .ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#F3ECDF;gap:8px;font-size:.92rem;text-align:center;padding:20px}
.player .ph .play{width:58px;height:58px;border-radius:50%;background:#F7C948;display:flex;align-items:center;justify-content:center}
.s-body{padding:22px 24px;display:grid;gap:8px;align-content:start}.s-meta{font-size:.82rem;color:#5C7285;font-weight:600;letter-spacing:.04em;text-transform:uppercase}.s-body h3{font-size:1.2rem}
.btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
.btn{display:inline-flex;align-items:center;gap:8px;background:#EF6F6C;color:#15283F;font-weight:600;border-radius:10px;padding:10px 16px;text-decoration:none;border:0;font:inherit;font-weight:600;cursor:pointer}
.btn.sec{background:#fff;border:1.5px solid #15283F}.btn:hover{filter:brightness(.97)}
.links{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:44px}
.lnk{background:#fff;border:1px solid #E6E2DA;border-radius:14px;padding:18px 20px;text-decoration:none;color:#2E3A45;display:grid;gap:6px}.lnk strong{color:#15283F}.lnk:hover{border-color:#5C7285}
.contact{background:#F3ECDF;border-radius:16px;padding:22px 26px;margin-bottom:48px}
footer{border-top:1px solid #E6E2DA;padding:22px 0 40px;font-size:.85rem;color:#5C7285}
.gate{min-height:calc(100vh - 65px);display:flex;align-items:center;justify-content:center;padding:40px 20px}
.card{background:#fff;border:1px solid #E6E2DA;border-radius:20px;padding:34px 32px;max-width:440px;width:100%;text-align:center;display:grid;gap:14px;justify-items:center}
.card .logo{width:84px;height:84px}.card h1{font-size:1.6rem}
.card label{font-size:.85rem;font-weight:600;color:#15283F;justify-self:start}
.card input{width:100%;font:inherit;font-size:1.1rem;letter-spacing:.08em;text-align:center;padding:12px 14px;border:1.5px solid #A3B3C2;border-radius:10px;text-transform:uppercase}
.card input:focus-visible,.btn:focus-visible{outline:3px solid #F7C948;outline-offset:2px}
.card .btn{width:100%;justify-content:center;padding:12px}
.err{color:#9B2C2C;background:#FDECEC;border-radius:8px;padding:8px 12px;font-size:.9rem;width:100%}
.fine{font-size:.82rem;color:#5C7285}
@media (max-width:820px){.session{grid-template-columns:1fr}.links{grid-template-columns:1fr}.hero-in{grid-template-columns:1fr}.welcome{grid-template-columns:1fr}}
`;

function shell(title, body, client, slug, unlocked) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<header class="top"><div class="wrap"><span class="mark">${esc(client.siteName || 'Client resources')}</span>${unlocked ? `<a class="out" href="/clients/${esc(slug)}/signout">Sign out</a>` : ''}</div></header>
${body}</body></html>`;
}

function gatePage(client, slug, error) {
  const logo = client.logo ? `<div class="logo"><img src="/clients/${esc(slug)}/logo" alt="${esc(client.name)} logo"></div>` : '';
  return shell(`${client.name} resources`, `<main class="gate"><form class="card" method="post" action="/clients/${esc(slug)}/unlock">
    ${logo}
    <span class="eyebrow"><span class="dot"></span>Private resources</span>
    <h1>${esc(client.gateTitle || `Welcome, ${client.name} team`)}</h1>
    <p>${esc(client.gateText || 'Enter the access code you received to see your session videos, slides and resources.')}</p>
    ${error ? `<p class="err" role="alert">That code did not work. Check it and try again.</p>` : ''}
    <label for="code">Access code</label>
    <input id="code" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" required ${error ? 'aria-invalid="true"' : ''} autofocus>
    <button class="btn" type="submit">View resources</button>
    <p class="fine">${esc(client.contactText || 'Need the code? Ask the person who invited you.')}</p>
  </form></main>`, client, slug, false);
}

function clientPage(c, slug, videos) {
  const logo = c.logo ? `<div class="logo"><img src="/clients/${esc(slug)}/logo" alt="${esc(c.name)} logo"></div>` : '';
  const w = Object.assign({}, DEFAULT_PRESENTER, Object.fromEntries(Object.entries(c.welcome || {}).filter(([, v]) => v)));
  const photoSrc = !w.photo ? '' : /^(\/|https:)/.test(w.photo) ? w.photo : `/clients/${slug}/files/${w.photo}`;
  const welcome = w.text ? `<section class="welcome">${photoSrc ? `<img src="${esc(photoSrc)}" alt="${esc(w.from || '')}">` : ''}<div>${paras(w.text)}${w.from ? `<div class="sig">${esc(w.from)}</div>` : ''}${w.role ? `<div class="role">${esc(w.role)}</div>` : ''}</div></section>` : '';
  const sessions = (c.sessions || []).map((s, i) => {
    const v = s.video ? videos[s.video] : null;
    const player = v ? `<iframe src="${esc(v)}" title="${esc(s.title)}" loading="lazy" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
      : `<div class="ph"><span class="play" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="#15283F"><path d="M8 5v14l11-7z"/></svg></span>${s.video ? 'Video is not available right now.' : 'Video coming soon'}</div>`;
    return `<article class="session"><div class="player">${player}</div><div class="s-body">
      <span class="s-meta">${esc(s.label || `Session ${i + 1}`)}${s.date ? ` · ${esc(s.date)}` : ''}${s.length ? ` · ${esc(s.length)}` : ''}</span>
      <h3>${esc(s.title)}</h3>${paras(s.description)}
      <div class="btns">${s.slides ? `<a class="btn sec" href="/clients/${esc(slug)}/files/${esc(s.slides)}" target="_blank" rel="noopener">Download the slides</a>` : ''}</div>
    </div></article>`;
  }).join('');
  const links = (c.links || []).map(l => `<a class="lnk" href="${esc(l.url)}"${/^https?:/.test(l.url) ? ' target="_blank" rel="noopener"' : ''}><strong>${esc(l.title)}</strong><span>${esc(l.text || '')}</span></a>`).join('');
  return shell(`${c.name} resources`, `
  <section class="hero"><div class="wrap"><div class="hero-in">${logo}<div>
    <span class="eyebrow"><span class="dot"></span>${esc(c.eyebrow || 'Private resources')}</span>
    <h1>${esc(c.title || `Resources for the ${c.name} team`)}</h1>
    ${c.intro ? `<p class="lede">${esc(c.intro)}</p>` : ''}
    <div class="horizon" aria-hidden="true"></div>
  </div></div></div></section>
  <main class="wrap">
    ${welcome}
    ${sessions ? `<div class="sec-h"><h2>${esc(c.sessionsTitle || 'Your sessions')}</h2></div><section class="sessions">${sessions}</section>` : ''}
    ${links ? `<div class="sec-h"><h2>${esc(c.linksTitle || 'Keep going')}</h2></div><section class="links">${links}</section>` : ''}
    ${c.contact ? `<section class="contact">${paras(c.contact)}</section>` : ''}
  </main>
  <footer><div class="wrap">${esc(c.footer || `Prepared for ${c.name}. Please do not share these materials outside your organization.`)}</div></footer>`, c, slug, true);
}
