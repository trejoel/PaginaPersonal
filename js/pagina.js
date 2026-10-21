(function () {
  /* --- filtro de publicaciones --- */
  var chips = document.getElementById('filtros');
  if (!chips) return;
  var items = document.querySelectorAll('#lista-revistas li');
  function aplicar(f) {
    items.forEach(function (li) { li.hidden = !(f === 'todas' || li.dataset.p === f); });
    chips.querySelectorAll('.chip').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.f === f ? 'true' : 'false');
    });
  }
  chips.classList.add('on');
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (b) aplicar(b.dataset.f);
  });
  aplicar('reciente');

})();
(function () {
  /* --- grafo: el algoritmo de Prim construye un árbol de expansión mínima --- */
  var svg = document.getElementById('grafo');
  if (!svg) return;
  var estado = document.getElementById('grafo-estado');
  var NS = 'http://www.w3.org/2000/svg';
  var W = 520, H = 460, N = 30, MIN = 50;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rand = rng(20261020), pts = [], tries = 0;
  while (pts.length < N && tries++ < 20000) {
    var p = { x: 28 + rand() * (W - 56), y: 28 + rand() * (H - 56) };
    if (pts.every(function (q) { return Math.hypot(p.x - q.x, p.y - q.y) >= MIN; })) pts.push(p);
  }
  N = pts.length;
  function dist(i, j) { return Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y); }

  /* Prim desde el punto más cercano a la esquina superior izquierda */
  var start = 0;
  pts.forEach(function (p, i) { if (p.x + p.y < pts[start].x + pts[start].y) start = i; });
  var inT = new Array(N).fill(false), best = new Array(N).fill(Infinity), from = new Array(N).fill(-1);
  var order = []; best[start] = 0;
  for (var k = 0; k < N; k++) {
    var u = -1;
    for (var v = 0; v < N; v++) if (!inT[v] && (u < 0 || best[v] < best[u])) u = v;
    inT[u] = true;
    if (from[u] >= 0) order.push([from[u], u]);
    for (var w = 0; w < N; w++) if (!inT[w] && dist(u, w) < best[w]) { best[w] = dist(u, w); from[w] = u; }
  }

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var a in attrs) e.setAttribute(a, attrs[a]);
    return e;
  }
  var run = 0;
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function dibujar() {
    var id = ++run;
    svg.textContent = '';
    for (var i = 0; i < N; i++) for (var j = i + 1; j < N; j++)
      if (dist(i, j) < 112) svg.appendChild(el('line', { 'class': 'e-cand', x1: pts[i].x, y1: pts[i].y, x2: pts[j].x, y2: pts[j].y }));
    var nodes = pts.map(function (p, i) {
      var c = el('circle', { 'class': 'n' + (i === start ? ' root' : ''), cx: p.x, cy: p.y, r: i === start ? 8 : 5.5 });
      svg.appendChild(c); return c;
    });
    var tree = order.map(function (e) {
      var a = pts[e[0]], b = pts[e[1]], len = Math.hypot(a.x - b.x, a.y - b.y);
      var l = el('line', { 'class': 'e-tree', x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      l.style.strokeDasharray = len; l.style.strokeDashoffset = reduce ? 0 : len;
      if (reduce) l.style.opacity = 1; else l.style.opacity = 0;
      svg.insertBefore(l, nodes[0]); return l;
    });
    nodes.forEach(function (c) { svg.appendChild(c); });
    if (reduce) {
      order.forEach(function (e) { nodes[e[1]].setAttribute('class', 'n in'); });
      estado.textContent = 'Árbol de expansión mínima: ' + order.length + ' aristas';
      return;
    }
    (async function () {
      await sleep(500);
      for (var s = 0; s < order.length; s++) {
        if (id !== run) return;
        var l = tree[s];
        l.style.opacity = 1;
        l.style.transition = 'stroke-dashoffset 220ms ease-out';
        l.style.strokeDashoffset = 0;
        nodes[order[s][1]].setAttribute('class', 'n in');
        estado.textContent = 'Prim: arista ' + (s + 1) + ' de ' + order.length;
        await sleep(190);
      }
      if (id === run) estado.textContent = 'Árbol de expansión mínima: ' + order.length + ' aristas';
    })();
  }
  document.getElementById('grafo-repetir').addEventListener('click', dibujar);
  dibujar();
})();
