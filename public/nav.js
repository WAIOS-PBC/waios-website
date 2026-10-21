/* Phone menu: collapses the header links behind a Menu button under 760px. */
(function () {
  var styled = false;
  function init() {
  var nav = document.querySelector('header nav[aria-label="Main"]');
  if (!nav || nav.previousElementSibling && nav.previousElementSibling.className === 'waios-menu-btn') return;
  var link = nav.querySelector('a:not([href^="mailto"])');
  var color = link ? getComputedStyle(link).color : '#15283F';
  var css = document.createElement('style');
  css.textContent =
    '.waios-menu-btn{display:none;align-items:center;gap:8px;font:inherit;font-size:15px;font-weight:600;background:transparent;border:1.5px solid currentColor;border-radius:6px;justify-content:center;width:46px;height:46px;padding:0;cursor:pointer}' +
    '@media (max-width: 760px){' +
    'header nav[aria-label="Main"]{display:none !important;width:100%;flex-direction:column !important;align-items:stretch !important;gap:0 !important;padding:4px 0 8px}' +
    'header nav[aria-label="Main"].open{display:flex !important}' +
    'header nav[aria-label="Main"] a{min-height:48px;box-sizing:border-box;display:flex !important;align-items:center;font-size:17px !important;border-top:1px solid rgba(127,140,155,0.28)}' +
    'header nav[aria-label="Main"] a[href^="mailto"]{justify-content:center;margin-top:12px;border-top:0}' +
    '.waios-menu-btn{display:inline-flex}}';
  if (!styled) { document.head.appendChild(css); styled = true; }
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'waios-menu-btn';
  btn.style.color = color;
  btn.setAttribute('aria-expanded', 'false');
  if (!nav.id) nav.id = 'main-nav';
  btn.setAttribute('aria-controls', nav.id);
  var BARS = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>';
  var CLOSE = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
  btn.setAttribute('aria-label', 'Open menu');
  btn.innerHTML = BARS;
  nav.parentNode.insertBefore(btn, nav);
  function set(open) {
    nav.classList.toggle('open', open); window.__waiosNavOpen = open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.innerHTML = open ? CLOSE : BARS;
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  btn.addEventListener('click', function () { set(!nav.classList.contains('open')); });
  if (window.__waiosNavOpen) set(true);
  }
  init();
  // pages with interactive sections redraw the header; put the button back when they do
  new MutationObserver(init).observe(document.body, { childList: true, subtree: true });
})();
