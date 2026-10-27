/* Site menu: every page listed across the top on wide screens; under 1040px the
   links collapse behind a menu button. */
(function () {
  var BARS = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>';
  var CLOSE = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
  var styled = false;

  function addStyles() {
    if (styled) return; styled = true;
    var css = document.createElement('style');
    css.textContent =
      'header nav[aria-label="Main"] > a{min-height:44px;display:inline-flex;align-items:center}' +
      'header{position:sticky;top:0;z-index:60;transition:box-shadow .25s ease}' +
      'html{scroll-padding-top:88px}html.waios-scrolled header{box-shadow:0 6px 20px rgba(21,40,63,.08)}' +
      '.waios-menu-btn{display:none;align-items:center;justify-content:center;width:46px;height:46px;padding:0;font:inherit;background:transparent;border:1.5px solid currentColor;border-radius:6px;cursor:pointer}' +
      '@media (max-width: 1040px){' +
        'header nav[aria-label="Main"]{display:none !important;width:100%;flex-direction:column !important;align-items:stretch !important;gap:0 !important;padding:4px 0 8px}' +
        'header nav[aria-label="Main"].open{display:flex !important}' +
        'header nav[aria-label="Main"] > a{min-height:48px;font-size:17px !important;border-top:1px solid rgba(127,140,155,0.28)}' +
        'header nav[aria-label="Main"] > a:last-child{border-top:0;justify-content:center;margin-top:16px}' +
        '.waios-menu-btn{display:inline-flex}' +
      '}';
    document.head.appendChild(css);
  }

  function init() {
    var nav = document.querySelector('header nav[aria-label="Main"]');
    if (!nav) return;
    addStyles();
    if (nav.previousElementSibling && nav.previousElementSibling.className === 'waios-menu-btn') return;
    var link = nav.querySelector('a');
    var color = link ? getComputedStyle(link).color : '#15283F';
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'waios-menu-btn'; btn.style.color = color;
    if (!nav.id) nav.id = 'main-nav';
    btn.setAttribute('aria-controls', nav.id);
    btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Open menu');
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
  function onScroll() { document.documentElement.classList.toggle('waios-scrolled', (window.scrollY || 0) > 12); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  // pages with interactive sections redraw the header; add the button again when they do
  new MutationObserver(init).observe(document.body, { childList: true, subtree: true });
})();
