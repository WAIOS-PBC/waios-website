// waios.com: static pages are served from ./public. This Worker only handles
// form submissions at /api/lead and emails each one to the founders' inbox.
import { EmailMessage } from 'cloudflare:email';

const FROM = 'website@waios.com';
const TO = 'dposa@globalwellbeinggroup.com';

const KINDS = {
  contact: 'Contact form',
  'research-list': 'Research list sign-up',
  investor: 'Investor access request',
  'cost-estimate': 'Burnout cost calculator',
  'risk-readout': 'Team burnout risk check',
  'wellbeing-score': 'Quick wellbeing score'
};

const ALLOWED_ORIGINS = ['https://waios.com', 'https://www.waios.com'];

function json(body, status) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

function clean(v, max) {
  if (v == null) return '';
  if (Array.isArray(v)) v = v.join(', ');
  return String(v).replace(/\r/g, '').slice(0, max || 2000).trim();
}

function oneLine(v) { return clean(v, 300).replace(/\n+/g, ' '); }

async function handleLead(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !origin.endsWith('.workers.dev')) return json({ ok: false, error: 'origin' }, 403);

  let data;
  try { data = await request.json(); } catch (e) { return json({ ok: false, error: 'format' }, 400); }
  if (!data || typeof data !== 'object') return json({ ok: false, error: 'format' }, 400);

  // bots fill the hidden field; pretend it worked
  if (clean(data.website)) return json({ ok: true });

  const kind = KINDS[data.kind] ? data.kind : null;
  if (!kind) return json({ ok: false, error: 'kind' }, 400);
  const email = oneLine(data.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'email' }, 400);

  const fields = data.fields && typeof data.fields === 'object' ? data.fields : {};
  const name = oneLine(data.name || fields.Name || fields.name || '');
  const lines = [];
  Object.keys(fields).slice(0, 40).forEach(function (k) {
    const v = clean(fields[k], 4000);
    if (v) lines.push(k + ': ' + v);
  });
  const page = oneLine(data.page || '');
  const when = new Date().toISOString();
  const subject = '[waios.com] ' + KINDS[kind] + ': ' + (name || email);
  const body = [
    KINDS[kind] + ' from waios.com',
    '',
    'Email: ' + email,
    ...lines,
    '',
    'Page: ' + (page || 'unknown'),
    'Sent: ' + when,
    '',
    'Reply to this email to answer them directly.'
  ].join('\n');

  console.log(JSON.stringify({ lead: kind, email: email, name: name, page: page, when: when }));

  if (!env.LEADS) return json({ ok: false, error: 'not-configured' }, 503);
  const safe = (s) => s.replace(/[\r\n]+/g, ' ');
  const raw = [
    'From: "WAIOS website" <' + FROM + '>',
    'To: <' + TO + '>',
    'Reply-To: ' + (name ? '"' + safe(name).replace(/"/g, '') + '" ' : '') + '<' + email + '>',
    'Subject: =?UTF-8?B?' + b64(safe(subject)) + '?=',
    'Date: ' + new Date().toUTCString(),
    'Message-ID: <' + crypto.randomUUID() + '@waios.com>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(body).replace(/(.{76})/g, '$1\r\n')
  ].join('\r\n');
  try {
    await env.LEADS.send(new EmailMessage(FROM, TO, raw));
  } catch (e) {
    console.log(JSON.stringify({ lead_error: String(e && e.message || e), lead: kind, email: email }));
    return json({ ok: false, error: 'send' }, 502);
  }
  return json({ ok: true });
}

function b64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/lead') return handleLead(request, env);
    return env.ASSETS.fetch(request);
  }
};
