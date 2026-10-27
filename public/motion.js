/* Gentle motion for the whole site: sections ease in as they scroll into view, and
   research numbers count up the first time they appear. Nothing moves for visitors who
   ask their device for less motion, and nothing runs while pages are being prepared. */
(function () {
  if (navigator.webdriver) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window) || !window.requestAnimationFrame) return;

  var css = document.createElement('style');
  css.textContent =
    '.rv{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1)}' +
    '.rv.rv-in{opacity:1;transform:none}';
  document.head.appendChild(css);

  var PICK = 'section h2, section h2 + p, .rs, .hb-card, .wp-card, section article, .bt-panel, .wb3-c, .mc';

  function countUp(el) {
    if (el.__counted) return; el.__counted = true;
    var txt = el.textContent, m = txt.match(/^(\$?)([\d,]*\.?\d+)(.*)$/);
    if (!m) return;
    var num = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, comma = m[2].indexOf(',') >= 0;
    if (!(num >= 10 || /%/.test(m[3]))) return;
    function fmt(v) {
      var s = comma ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec);
      return m[1] + s + m[3];
    }
    var t0 = null, D = 1200;
    el.textContent = fmt(0);
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / D), e = 1 - Math.pow(1 - p, 3);
      if (p < 1) { el.textContent = fmt(num * e); requestAnimationFrame(step); } else el.textContent = txt;
    }
    requestAnimationFrame(step);
  }

  function setup() {
    var first = document.querySelector('section');
    var vh = window.innerHeight;
    var els = [].slice.call(document.querySelectorAll(PICK)).filter(function (el) {
      if (el.closest('header, footer, [aria-hidden="true"]')) return false;
      if (first && first.contains(el)) return false;            // the top of the page is already on screen
      if (el.parentElement && el.parentElement.closest('.rv')) return false; // animate the outer block only
      return el.getBoundingClientRect().top > vh * 0.92;          // only what is still below the fold
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; io.unobserve(el);
        var sibs = el.parentElement ? [].filter.call(el.parentElement.children, function (c) { return c.classList.contains('rv'); }) : [];
        var i = Math.max(0, sibs.indexOf(el));
        el.style.transitionDelay = Math.min(i * 80, 320) + 'ms';
        el.classList.add('rv-in');
        var nums = el.classList.contains('rs-num') ? [el] : el.querySelectorAll('.rs-num');
        [].forEach.call(nums, function (n) { setTimeout(function () { countUp(n); }, 150 + Math.min(i * 80, 320)); });
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { el.classList.add('rv'); io.observe(el); });
    // stat cards already on screen still count up once
    var nio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { nio.unobserve(e.target); if (!e.target.closest('.rv')) countUp(e.target); } });
    }, { threshold: 0.6 });
    [].forEach.call(document.querySelectorAll('.rs-num'), function (n) { nio.observe(n); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { requestAnimationFrame(setup); });
  else requestAnimationFrame(setup);
})();
