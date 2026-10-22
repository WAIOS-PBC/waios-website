/* Site menu: groups the header links into three dropdowns, and collapses
   everything behind a menu button under 760px. */
(function () {
  var GROUPS = [
    { label: 'Why WAIOS', items: [['why-waios.html', 'Why WAIOS'], ['approach.html', 'Our Approach']] },
    { label: 'What we do', items: [['wellbeing-measure.html', 'Wellbeing Measure'], ['how-we-work.html', 'How We Work']] },
    { label: 'About', items: [['about.html', 'About us'], ['contact.html', 'Contact']] }
  ];
  var CHEV = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="M6 9l6 6 6-6"></path></svg>';
  var BARS = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>';
  var CLOSE = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
  var styled = false;

  function addStyles() {
    if (styled) return; styled = true;
    var css = document.createElement('style');
    css.textContent =
      '.wg{position:relative}' +
      '.wg-btn{font:inherit;font-size:15px;font-weight:500;background:none;border:0;color:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:0;min-height:44px}' +
      '.wg-btn[data-current]{text-decoration:underline;text-decoration-color:#EF6F6C;text-decoration-thickness:1.5px;text-underline-offset:6px;color:#15283F;font-weight:600}' +
      '.wg-menu{position:absolute;top:100%;left:-14px;padding-top:6px;display:none;z-index:60}' +
      '.wg-menu-inner{min-width:210px;background:#FFFFFF;border:1px solid #DDE3E8;border-radius:10px;box-shadow:0 14px 34px rgba(21,40,63,0.14);padding:6px;display:flex;flex-direction:column}' +
      '.wg.open .wg-menu{display:block}' +
      '@media (hover:hover) and (min-width:761px){.wg:hover .wg-menu{display:block}}' +
      '.wg-menu a{display:flex !important;align-items:center;min-height:44px;padding:0 12px !important;border-radius:6px;color:#15283F !important;text-decoration:none !important;font-weight:500 !important;font-size:15px !important;white-space:nowrap}' +
      '.wg-menu a:hover,.wg-menu a:focus-visible{background:#F1F4F6}' +
      '.wg-menu a[aria-current]{font-weight:700 !important}' +
      '.waios-menu-btn{display:none;align-items:center;justify-content:center;width:46px;height:46px;padding:0;font:inherit;background:transparent;border:1.5px solid currentColor;border-radius:6px;cursor:pointer}' +
      '@media (max-width: 760px){' +
        'header nav[aria-label="Main"]{display:none !important;width:100%;flex-direction:column !important;align-items:stretch !important;gap:0 !important;padding:4px 0 8px}' +
        'header nav[aria-label="Main"].open{display:flex !important}' +
        '.wg-btn{pointer-events:none;min-height:0;padding:16px 0 4px;font-size:12px !important;font-weight:700 !important;letter-spacing:0.18em;text-transform:uppercase;color:#5C7285 !important;text-decoration:none !important}' +
        '.wg-btn svg{display:none}' +
        '.wg-menu{position:static;display:block;padding:0}' +
        '.wg-menu-inner{border:0;box-shadow:none;padding:0;background:transparent;min-width:0}' +
        '.wg-menu a{min-height:48px;padding:0 !important;font-size:17px !important;border-top:1px solid rgba(127,140,155,0.28);border-radius:0}' +
        'header nav[aria-label="Main"] > a[href^="mailto"], header nav[aria-label="Main"] > a[href="contact.html"]:last-child{justify-content:center;margin-top:16px}' +
        '.waios-menu-btn{display:inline-flex}' +
      '}';
    document.head.appendChild(css);
  }

  function closeAll(except) {
    document.querySelectorAll('.wg.open').forEach(function (g) {
      if (g !== except) { g.classList.remove('open'); g.querySelector('.wg-btn').setAttribute('aria-expanded', 'false'); }
    });
  }

  function group(nav) {
    if (nav.getAttribute('data-grouped')) return;
    nav.setAttribute('data-grouped', '1');
    var links = [].slice.call(nav.querySelectorAll(':scope > a'));
    var cta = links[links.length - 1];
    var byHref = {};
    links.forEach(function (a) { if (a !== cta) byHref[(a.getAttribute('href') || '').split('#')[0]] = a; });
    links.forEach(function (a) { if (a !== cta) a.remove(); });
    GROUPS.forEach(function (gdef, gi) {
      var g = document.createElement('div'); g.className = 'wg';
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'wg-btn';
      btn.setAttribute('aria-expanded', 'false');
      var menuId = 'wg-menu-' + gi; btn.setAttribute('aria-controls', menuId);
      btn.innerHTML = '<span>' + gdef.label + '</span>' + CHEV;
      var menu = document.createElement('div'); menu.className = 'wg-menu'; menu.id = menuId;
      var inner = document.createElement('div'); inner.className = 'wg-menu-inner'; menu.appendChild(inner);
      gdef.items.forEach(function (it) {
        var a = byHref[it[0]] || document.createElement('a');
        a.setAttribute('href', it[0]); a.textContent = it[1]; a.removeAttribute('style');
        if (a.getAttribute('aria-current')) btn.setAttribute('data-current', '1');
        inner.appendChild(a);
      });
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !g.classList.contains('open'); closeAll(g);
        g.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      g.appendChild(btn); g.appendChild(menu);
      nav.insertBefore(g, cta);
    });
  }

  function init() {
    var nav = document.querySelector('header nav[aria-label="Main"]');
    if (!nav) return;
    addStyles();
    group(nav);
    if (nav.previousElementSibling && nav.previousElementSibling.className === 'waios-menu-btn') return;
    var link = nav.querySelector('.wg-btn');
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

  document.addEventListener('click', function () { closeAll(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  init();
  // pages with interactive sections redraw the header; rebuild the menu when they do
  new MutationObserver(init).observe(document.body, { childList: true, subtree: true });
})();
