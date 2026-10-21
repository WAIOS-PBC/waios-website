/* Small renderer for the interactive heat maps (templates in #dc-tpl, logic in #dc-logic). */
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
        if (typeof fn === 'function') el.addEventListener(name.slice(2).toLowerCase(), fn);
        continue;
      }
      if (name.indexOf('hint-') === 0) continue;
      if (name === 'ref') { var rf = lookup(expr(a.value), scope); if (typeof rf === 'function') refs.push([rf, el]); continue; }
      el.setAttribute(name, interp(a.value, scope));
    }
    renderNodes(n.childNodes, scope, el);
    out.appendChild(el);
  }
  function pathOf(el) {
    var p = [];
    while (el && el !== root) { var par = el.parentNode; if (!par) return null; p.unshift([].indexOf.call(par.childNodes, el)); el = par; }
    return el === root ? p : null;
  }
  function restore(p) {
    var el = root;
    for (var i = 0; i < p.length && el; i++) el = el.childNodes[p[i]];
    if (el && el.focus) el.focus({ preventScroll: true });
  }
  function render() {
    pending = false;
    var fp = pathOf(document.activeElement);
    var frag = document.createDocumentFragment();
    refs = [];
    renderNodes(tpl.content.childNodes, [comp.renderVals()], frag);
    root.replaceChildren(frag);
    refs.forEach(function (r) { r[0](r[1]); });
    if (!mounted) { mounted = true; if (comp.componentDidMount) comp.componentDidMount(); }
    if (fp) restore(fp);
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
