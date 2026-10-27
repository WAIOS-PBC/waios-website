/* Site forms: every form marked data-lead is sent to /api/lead (no email app).
   Also exposes window.waiosLead for the interactive tools. */
(function () {
  function isLive() {
    var h = location.hostname;
    return /(^|\.)waios\.com$/.test(h) || /\.workers\.dev$/.test(h) || h === 'localhost' || h === '127.0.0.1';
  }

  window.waiosLead = function (kind, email, name, fields, done) {
    if (!isLive()) { setTimeout(function () { if (done) done(true); }, 500); return; }
    var payload = { kind: kind, email: email || '', name: name || '', fields: fields || {}, page: location.pathname, website: '' };
    fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return r.ok && j && j.ok === true; }, function () { return false; }); })
      .then(function (ok) { if (done) done(ok); }, function () { if (done) done(false); });
  };

  function labelFor(el) {
    return el.getAttribute('data-label') || el.name;
  }

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !f.matches || !f.matches('form[data-lead]')) return;
    e.preventDefault();
    if (f.getAttribute('data-sending')) return;
    var fields = {}, email = '', name = '', trap = '';
    [].forEach.call(f.elements, function (el) {
      if (!el.name || el.disabled || el.type === 'submit' || el.type === 'button') return;
      if (el.name === 'website') { trap = el.value; return; }
      if (el.name === 'email') { email = el.value.trim(); return; }
      if (el.name === 'name') { name = el.value.trim(); return; }
      var key = labelFor(el), v;
      if (el.type === 'checkbox') { if (!el.checked) return; v = el.value && el.value !== 'on' ? el.value : 'Yes'; }
      else v = el.value.trim();
      if (!v) return;
      fields[key] = fields[key] ? [].concat(fields[key], v) : v;
    });
    if (name) fields.Name = name;
    var btn = f.querySelector('[type="submit"]'), label = btn ? btn.textContent : '';
    var err = f.querySelector('[data-lead-error]');
    var done = f.getAttribute('data-done') ? document.getElementById(f.getAttribute('data-done')) : null;
    function finish(ok) {
      f.removeAttribute('data-sending');
      if (btn) { btn.disabled = false; btn.textContent = label; }
      if (ok) {
        if (done) { f.hidden = true; done.hidden = false; if (done.focus) { done.setAttribute('tabindex', '-1'); done.focus({ preventScroll: true }); } }
      } else if (err) { err.hidden = false; }
    }
    if (trap) { finish(true); return; }
    if (err) err.hidden = true;
    f.setAttribute('data-sending', '1');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
    window.waiosLead(f.getAttribute('data-lead'), email, name, fields, finish);
  }, true);

  // Contact page: ?topic= ticks the matching option, ?note= starts the message
  var NOTES = {
    audit: 'I would like the workload audit template.',
    discussion: 'I would like the discussion points for leading the conversation with my team.',
    walkthrough: 'I would like an expert walkthrough of our results.',
    demo: 'I would like to see a heat map demo.',
    product: 'I would like a demo of WAIOS.'
  };
  function prefill() {
    var form = document.querySelector('form[data-lead="contact"]');
    if (!form) return;
    var q = new URLSearchParams(location.search);
    var topic = q.get('topic'), note = q.get('note');
    if (topic) {
      var box = form.querySelector('input[data-topic="' + topic + '"]');
      if (box) box.checked = true;
    }
    if (note && NOTES[note]) {
      var msg = form.querySelector('textarea');
      if (msg && !msg.value) msg.value = NOTES[note];
    }
    if (topic || note) {
      var target = document.getElementById('contact-form-section');
      if (target) setTimeout(function () { target.scrollIntoView({ block: 'start' }); }, 50);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prefill); else prefill();
})();
