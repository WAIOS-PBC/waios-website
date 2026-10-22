/* Small renderer for the interactive pages (templates in #dc-tpl, logic in #dc-logic).
   First render replaces the prerendered markup; later renders patch the page in
   place, so typing, focus and running animations are not disturbed. */
(function () {
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (p) {
    Object.assign(this.state, typeof p === 'function' ? p(this.state) : p);
    schedule();
  };
  window.DCLogic = DCLogic;

  var tpl, comp, root, pending = false, refs = [], mounted = false;

  function lookup(path, scope) {
    if (path == null) return undefined;
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    var parts = path.split('.'), v, found = false;
    for (var i = scope.length - 1; i >= 0; i--) {
      if (scope[i] && Object.prototype.hasOwnProperty.call(scope[i], parts[0])) { v = scope[i][parts[0]]; found = true; break; }
    }
    if (!found) return undefined;
    for (var j = 1; j < parts.length; j++) { if (v == null) return undefined; v = v[parts[j]]; }
    return v;
  }
  function expr(s) { var m = (s || '').match(/^\s*\{\{?\s*([\s\S]*?)\s*\}?\}\s*$/); return m ? m[1] : null; }
  function interp(s, scope) {
    return s.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, function (_, p) { var v = lookup(p, scope); return v == null ? '' : String(v); });
  }
  function listen(el, type) {
    el.__dcT = el.__dcT || {};
    if (el.__dcT[type]) return;
    el.__dcT[type] = 1;
    el.addEventListener(type, function (e) { var h = el.__dcH && el.__dcH[type]; if (h) return h.call(this, e); });
  }
  function renderNodes(nodes, scope, out) { for (var i = 0; i < nodes.length; i++) renderNode(nodes[i], scope, out); }
  function renderNode(n, scope, out) {
    if (n.nodeType === 3) { out.appendChild(document.createTextNode(interp(n.nodeValue, scope))); return; }
    if (n.nodeType !== 1) return;
    var tag = n.localName;
    if (tag === 'sc-for') {
      var list = lookup(expr(n.getAttribute('list')), scope) || [];
      var as = n.getAttribute('as') || 'item';
      list.forEach(function (it, i) { var o = {}; o[as] = it; o[as + 'Index'] = i; renderNodes(n.childNodes, scope.concat([o]), out); });
      return;
    }
    if (tag === 'sc-if') { if (lookup(expr(n.getAttribute('value')), scope)) renderNodes(n.childNodes, scope, out); return; }
    var el = document.createElementNS(n.namespaceURI, n.localName);
    for (var k = 0; k < n.attributes.length; k++) {
      var a = n.attributes[k], name = a.name;
      if (/^on[a-z]+$/i.test(name)) {
        var fn = lookup(expr(a.value), scope);
        if (typeof fn === 'function') {
          var type = name.slice(2).toLowerCase();
          // like React: onChange on a text field fires as you type
          if (type === 'change' && (tag === 'textarea' || (tag === 'input' && !/^(checkbox|radio|file)$/i.test(n.getAttribute('type') || '')))) type = 'input';
          el.__dcH = el.__dcH || {}; el.__dcH[type] = fn; listen(el, type);
        }
        continue;
      }
      if (name.indexOf('hint-') === 0) continue;
      if (name === 'ref') { var rf = lookup(expr(a.value), scope); if (typeof rf === 'function') refs.push([rf, el]); continue; }
      var whole = /^\s*\{\{[^}]*\}\}\s*$/.test(a.value) ? lookup(expr(a.value), scope) : undefined;
      if (typeof whole === 'boolean') { if (whole) el.setAttribute(name, ''); continue; }
      el.setAttribute(name, interp(a.value, scope));
    }
    renderNodes(n.childNodes, scope, el);
    out.appendChild(el);
  }
  function morph(a, b) {
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName || (a.nodeType === 1 && a.namespaceURI !== b.namespaceURI)) { a.parentNode.replaceChild(b, a); return; }
    if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    var i, at, keep = a.hasAttribute('data-dc-keep');
    if (!keep) for (i = b.attributes.length - 1; i >= 0; i--) { at = b.attributes[i]; if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value); }
    if (!keep) for (i = a.attributes.length - 1; i >= 0; i--) { at = a.attributes[i]; if (!b.hasAttribute(at.name)) a.removeAttribute(at.name); }
    if ((a.localName === 'input' || a.localName === 'textarea') && !/^(checkbox|radio)$/i.test(a.type || '')) {
      var bv = b.getAttribute('value');
      if (bv !== null && a.value !== bv) a.value = bv;
    }
    a.__dcH = b.__dcH || {};
    if (b.__dcT) for (var tp in b.__dcT) listen(a, tp);
    var bc = [].slice.call(b.childNodes);
    for (i = 0; i < bc.length; i++) { if (i < a.childNodes.length) morph(a.childNodes[i], bc[i]); else a.appendChild(bc[i]); }
    while (a.childNodes.length > bc.length) a.removeChild(a.lastChild);
  }
  function render() {
    pending = false;
    var frag = document.createDocumentFragment();
    refs = [];
    renderNodes(tpl.content.childNodes, [comp.renderVals()], frag);
    if (!mounted) {
      root.replaceChildren(frag);
      refs.forEach(function (r) { r[0](r[1]); });
      mounted = true;
      if (comp.componentDidMount) comp.componentDidMount();
      return;
    }
    var holder = document.createElement('div');
    holder.appendChild(frag);
    morph(root, (function () { var r = root.cloneNode(false); while (holder.firstChild) r.appendChild(holder.firstChild); return r; })());
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(render); } }

  function init() {
    tpl = document.getElementById('dc-tpl');
    root = document.getElementById('dc-root');
    var code = document.getElementById('dc-logic').textContent;
    var Component = new Function('DCLogic', code + '\nreturn Component;')(DCLogic);
    comp = new Component({});
    render();
    document.documentElement.setAttribute('data-rendered', '1');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
