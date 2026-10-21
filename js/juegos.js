/* ================= Juego 1: ruta de la bodega (agente viajero) ================= */
(function () {
  var NS = 'http://www.w3.org/2000/svg', W = 560, H = 400, KM = 0.05;
  var svg = document.getElementById('t-map');
  var $ = function (id) { return document.getElementById(id); };
  function se(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var a in attrs) e.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var gLay, gNodes, pts, D, route, sol, vis, method, nodeEls;
  var km = function (px) { return (px * KM).toFixed(1).replace('.', ',') + ' km'; };

  function fondo() {
    var g = se('g', { 'aria-hidden': 'true' }, svg);
    se('rect', { 'class': 'park', x: 238, y: 172, width: 74, height: 58, rx: 10 }, g);
    [70, 160, 250, 340].forEach(function (y) { se('line', { 'class': 'st', x1: 0, y1: y, x2: W, y2: y, 'stroke-width': 9 }, g); });
    [90, 200, 330, 450, 520].forEach(function (x) { se('line', { 'class': 'st', x1: x, y1: 0, x2: x, y2: H, 'stroke-width': 9 }, g); });
    se('path', { 'class': 'st', d: 'M0 385 L560 35', 'stroke-width': 14 }, g);
    var t = se('text', { 'class': 'cap', x: 10, y: H - 10 }, g); t.textContent = 'Mapa ilustrativo · 1 km = 20 px';
  }

  function nueva() {
    var m = +$('t-n').value, sep = 66, tries = 0;
    pts = [{ x: 150 + Math.random() * 260, y: 110 + Math.random() * 180 }];
    while (pts.length < m + 1) {
      var p = { x: 32 + Math.random() * (W - 64), y: 32 + Math.random() * (H - 64) };
      if (pts.every(function (q) { return Math.hypot(p.x - q.x, p.y - q.y) >= sep; })) pts.push(p);
      if (++tries % 2500 === 0) sep -= 6;
    }
    var n = pts.length;
    D = pts.map(function (a) { return pts.map(function (b) { return Math.hypot(a.x - b.x, a.y - b.y); }); });
    route = []; sol = null; vis = { user: true, opt: true, apx: true }; method = 'nn';
    svg.textContent = ''; fondo();
    gLay = se('g', {}, svg); gNodes = se('g', {}, svg); nodeEls = [];
    var d = pts[0];
    var dep = se('g', { 'class': 'depot', role: 'img', 'aria-label': 'Bodega, punto de partida' }, gNodes);
    se('path', { d: 'M' + (d.x - 17) + ' ' + (d.y - 2) + 'L' + d.x + ' ' + (d.y - 17) + 'L' + (d.x + 17) + ' ' + (d.y - 2) + 'V' + (d.y + 13) + 'H' + (d.x - 17) + 'Z' }, dep);
    se('rect', { 'class': 'door', x: d.x - 5, y: d.y + 2, width: 10, height: 11 }, dep);
    var lt = se('text', { x: d.x, y: d.y + 28 }, dep); lt.textContent = 'Bodega';
    for (var i = 1; i < n; i++) {
      var g = se('g', { 'class': 'city', tabindex: 0, role: 'button', 'data-i': i }, gNodes);
      se('circle', { 'class': 'hit', cx: pts[i].x, cy: pts[i].y, r: 22, fill: 'transparent' }, g);
      se('circle', { 'class': 'dot', cx: pts[i].x, cy: pts[i].y, r: 14 }, g);
      var tx = se('text', { x: pts[i].x, y: pts[i].y }, g); tx.textContent = i;
      nodeEls[i] = g;
    }
    $('t-res').hidden = true;
    actualizar();
  }

  function tourLen(t) {
    var s = 0;
    for (var i = 0; i < t.length; i++) s += D[t[i]][t[(i + 1) % t.length]];
    return s;
  }

  /* óptimo: programación dinámica de Held-Karp, O(2^n · n²) */
  function heldKarp() {
    var m = pts.length - 1, S = 1 << m;
    var dp = new Float64Array(S * m).fill(Infinity), par = new Int8Array(S * m).fill(-1);
    var F = new Float64Array(m * m);
    for (var x = 0; x < m; x++) for (var y = 0; y < m; y++) F[x * m + y] = D[x + 1][y + 1];
    for (var j = 0; j < m; j++) dp[(1 << j) * m + j] = D[0][j + 1];
    for (var mask = 1; mask < S; mask++)
      for (var a = 0; a < m; a++) {
        if (!(mask & (1 << a))) continue;
        var cur = dp[mask * m + a]; if (cur === Infinity) continue;
        for (var b = 0; b < m; b++) {
          if (mask & (1 << b)) continue;
          var ix = (mask | (1 << b)) * m + b, v = cur + F[a * m + b];
          if (v < dp[ix]) { dp[ix] = v; par[ix] = a; }
        }
      }
    var full = S - 1, best = Infinity, last = -1;
    for (var k = 0; k < m; k++) { var v2 = dp[full * m + k] + D[k + 1][0]; if (v2 < best) { best = v2; last = k; } }
    var tour = [], msk = full, c = last;
    while (c >= 0) { tour.push(c + 1); var pc = par[msk * m + c]; msk ^= (1 << c); c = pc; }
    return [0].concat(tour.reverse());
  }
  /* aproximada 1: vecino más cercano */
  function vecino() {
    var n = pts.length, seen = [true], t = [0], cur = 0;
    for (var k = 1; k < n; k++) {
      var b = -1;
      for (var j = 1; j < n; j++) if (!seen[j] && (b < 0 || D[cur][j] < D[cur][b])) b = j;
      seen[b] = true; t.push(b); cur = b;
    }
    return t;
  }
  /* aproximada 2: árbol de expansión mínima (Prim) y recorrido en preorden; nunca pasa de 2× el óptimo */
  function arbol() {
    var n = pts.length, inT = [], par = [], key = [];
    for (var i = 0; i < n; i++) { key[i] = Infinity; par[i] = -1; }
    key[0] = 0;
    for (var k = 0; k < n; k++) {
      var u = -1;
      for (var v = 0; v < n; v++) if (!inT[v] && (u < 0 || key[v] < key[u])) u = v;
      inT[u] = true;
      for (var w = 0; w < n; w++) if (!inT[w] && D[u][w] < key[w]) { key[w] = D[u][w]; par[w] = u; }
    }
    var ch = pts.map(function () { return []; });
    for (var x = 1; x < n; x++) ch[par[x]].push(x);
    var t = [];
    (function dfs(u) { t.push(u); ch[u].sort(function (a, b) { return D[u][a] - D[u][b]; }).forEach(dfs); })(0);
    return t;
  }

  function pl(cls, tour, close) {
    var s = tour.map(function (i) { return pts[i].x + ',' + pts[i].y; });
    if (close) s.push(pts[tour[0]].x + ',' + pts[tour[0]].y);
    se('polyline', { 'class': 'rt ' + cls, points: s.join(' ') }, gLay);
  }

  function actualizar() {
    var m = pts.length - 1, done = route.length === m;
    gLay.textContent = '';
    if (sol) {
      if (vis.apx) pl('rt-apx', method === 'nn' ? sol.nn : sol.mst, true);
      if (vis.opt) pl('rt-opt', sol.opt, true);
    }
    if (route.length && (!sol || vis.user)) pl('rt-user', [0].concat(route), done);
    var last = route[route.length - 1];
    for (var i = 1; i <= m; i++) {
      var inR = route.indexOf(i) >= 0;
      nodeEls[i].setAttribute('class', 'city' + (inR ? ' vis' : '') + (i === last ? ' last' : ''));
      nodeEls[i].setAttribute('aria-label', 'Tienda ' + i + (inR ? (i === last ? ', última de tu ruta; tocar para quitarla' : ', ya visitada') : ', agregar a la ruta'));
    }
    var len = route.length ? tourLen([0].concat(route)) - (done ? 0 : D[last][0]) : 0;
    var st = $('t-status');
    if (!route.length) st.textContent = 'Toca una tienda para empezar la ruta desde la bodega.';
    else if (!done) st.textContent = 'Llevas ' + route.length + ' de ' + m + ' tiendas y ' + km(len) + ' recorridos.';
    else st.textContent = 'Ruta completa con el regreso a la bodega: ' + km(len) + '. ' + (sol ? '' : 'Pulsa «Ver soluciones» para compararla.');
    $('t-undo').disabled = !route.length; $('t-reset').disabled = !route.length;
    tabla();
  }

  function tabla() {
    if (!sol) return;
    var m = pts.length - 1, done = route.length === m;
    var opt = tourLen(sol.opt), apxT = method === 'nn' ? sol.nn : sol.mst, apx = tourLen(apxT);
    var u = done ? tourLen([0].concat(route)) : null;
    function pct(v) { var p = (v / opt - 1) * 100; return p < 0.05 ? 'Óptima' : '+' + p.toFixed(1).replace('.', ',') + ' %'; }
    var rows = [
      ['<i class="sw" style="background:var(--accent)"></i>Tu ruta', u === null ? 'incompleta' : km(u), u === null ? '' : pct(u)],
      ['<i class="sw" style="background:var(--ink)"></i>Óptima', km(opt), 'Óptima'],
      ['<i class="sw" style="background:var(--gold)"></i>Aproximada', km(apx), pct(apx)]
    ];
    $('t-rows').innerHTML = rows.map(function (r) { return '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('');
    var nota = 'La ruta óptima se calcula con programación dinámica (Held-Karp), que revisa todos los subconjuntos de tiendas en tiempo O(2' + '<sup>n</sup>·n²). ';
    nota += method === 'nn'
      ? 'El vecino más cercano siempre va a la tienda más próxima: es muy rápido, pero no tiene una garantía constante y puede quedar lejos del óptimo.'
      : 'Esta aproximación construye un árbol de expansión mínima (como el de la portada) y lo recorre en preorden saltando tiendas repetidas. Si las distancias cumplen la desigualdad triangular, nunca excede el doble del óptimo.';
    $('t-note').innerHTML = nota;
    if (u !== null && Math.abs(u - opt) < 1e-6) $('t-status').textContent = '¡Encontraste una ruta óptima! ' + km(u) + '.';
    else if (u !== null) $('t-status').textContent = 'Tu ruta mide ' + km(u) + ' y la óptima ' + km(opt) + ' (' + pct(u) + ').';
  }

  svg.addEventListener('click', function (e) {
    var g = e.target.closest('.city'); if (!g) return;
    var i = +g.getAttribute('data-i'), at = route.indexOf(i);
    if (at === route.length - 1 && at >= 0) route.pop();
    else if (at < 0) route.push(i);
    else { $('t-status').textContent = 'La tienda ' + i + ' ya está en tu ruta. Solo puedes quitar la última.'; return; }
    actualizar(); nodeEls[i].focus();
  });
  svg.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.city')) { e.preventDefault(); e.target.closest('.city').dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  $('t-undo').addEventListener('click', function () { route.pop(); actualizar(); });
  $('t-reset').addEventListener('click', function () { route = []; actualizar(); });
  $('t-new').addEventListener('click', nueva);
  $('t-n').addEventListener('input', function () { $('t-nv').textContent = this.value; });
  $('t-n').addEventListener('change', nueva);
  $('t-solve').addEventListener('click', function () {
    if (!sol) sol = { opt: heldKarp(), nn: vecino(), mst: arbol() };
    $('t-res').hidden = false; actualizar();
    $('t-res').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  $('t-tog').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    var k = b.getAttribute('data-k'); vis[k] = !vis[k];
    b.setAttribute('aria-pressed', vis[k]); actualizar();
  });
  $('t-met').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    method = b.getAttribute('data-m');
    this.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b); });
    vis.apx = true; $('t-tog').querySelector('[data-k="apx"]').setAttribute('aria-pressed', 'true');
    actualizar();
  });
  nueva();
})();

/* ================= Juego 2: quirófanos (minimizar el tiempo total) ================= */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var L = 'ABCDEFGHIJKL';
  var st = { p: [], m: 3, assign: [], sel: null, sol: null, shown: false, hbase: 10 };
  var sum = function (a) { return a.reduce(function (s, x) { return s + x; }, 0); };

  /* voraz: la cirugía más larga primero, en el quirófano menos cargado (LPT) */
  function lpt(p, m) {
    var idx = p.map(function (_, i) { return i; }).sort(function (a, b) { return p[b] - p[a] || a - b; });
    var A = [], ld = [], i;
    for (i = 0; i < m; i++) { A.push([]); ld.push(0); }
    idx.forEach(function (j) {
      var k = 0; for (i = 1; i < m; i++) if (ld[i] < ld[k]) k = i;
      A[k].push(j); ld[k] += p[j];
    });
    return { assign: A, cmax: Math.max.apply(null, ld) };
  }
  /* óptimo: búsqueda exhaustiva con poda, rompiendo simetrías */
  function optimo(p, m) {
    var idx = p.map(function (_, i) { return i; }).sort(function (a, b) { return p[b] - p[a] || a - b; });
    var g = lpt(p, m), best = g.cmax, bestA = g.assign.map(function (a) { return a.slice(); });
    var lb = Math.max(Math.ceil(sum(p) / m), Math.max.apply(null, p));
    var ld = [], cur = [], i;
    for (i = 0; i < m; i++) { ld.push(0); cur.push([]); }
    (function dfs(t) {
      if (best <= lb) return;
      if (t === idx.length) {
        var c = Math.max.apply(null, ld);
        if (c < best) { best = c; bestA = cur.map(function (a) { return a.slice(); }); }
        return;
      }
      var j = idx[t], seen = {};
      for (var r = 0; r < m; r++) {
        if (seen[ld[r]] || ld[r] + p[j] >= best) continue;
        seen[ld[r]] = 1;
        ld[r] += p[j]; cur[r].push(j);
        dfs(t + 1);
        cur[r].pop(); ld[r] -= p[j];
      }
    })(0);
    return { assign: bestA, cmax: best, lb: lb };
  }

  function nueva() {
    var n = +$('s-n').value, m = +$('s-m').value, p, o, g, tries = 0;
    do {
      p = []; for (var i = 0; i < n; i++) p.push(2 + Math.floor(Math.random() * 8));
      g = lpt(p, m); o = optimo(p, m);
    } while (g.cmax === o.cmax && ++tries < 40);
    st.p = p; st.m = m; st.sol = { opt: o, lpt: g };
    st.hbase = Math.ceil(sum(p) / m) + Math.max.apply(null, p) + 1;
    reiniciar();
  }
  function reiniciar() {
    st.assign = []; for (var r = 0; r < st.m; r++) st.assign.push([]);
    st.sel = null; st.shown = false; $('s-res').hidden = true;
    render();
  }
  function cmax(A) { return Math.max.apply(null, A.map(function (a) { return sum(a.map(function (j) { return st.p[j]; })); })); }

  function laneHTML(A, r, interactive, H) {
    var ld = sum(A[r].map(function (j) { return st.p[j]; }));
    var blocks = A[r].map(function (j) {
      var lab = 'Cirugía ' + L[j] + ', ' + st.p[j] + ' h';
      return interactive
        ? '<button type="button" class="blk" data-j="' + j + '" style="--p:' + st.p[j] + '" aria-label="' + lab + '. Devolver a la lista">' + L[j] + '<small>' + st.p[j] + '</small></button>'
        : '<span class="blk" style="--p:' + st.p[j] + '" role="img" aria-label="' + lab + '">' + L[j] + '<small>' + st.p[j] + '</small></span>';
    }).join('');
    return { ld: ld, html: blocks };
  }
  function roomsHTML(A, interactive, H, cm) {
    var out = '';
    for (var r = 0; r < A.length; r++) {
      var l = laneHTML(A, r, interactive, H);
      out += '<div class="room"><div class="room-h"><span>Quirófano ' + (r + 1) + '</span><span><span class="load">' + l.ld + ' h</span>' +
        (interactive ? ' <button type="button" class="gb put" data-r="' + r + '"' + (st.sel === null ? ' disabled' : '') + '>Colocar aquí</button>' : '') +
        '</span></div><div class="lane' + (interactive && st.sel !== null ? ' target' : '') + '" data-r="' + r + '">' + l.html +
        (cm > 0 ? '<i class="cmax" style="--c:' + cm + '"></i>' : '') + '</div></div>';
    }
    return out;
  }

  function render() {
    var A = st.assign, placed = {};
    A.forEach(function (a) { a.forEach(function (j) { placed[j] = 1; }); });
    var cm = cmax(A), H = Math.max(st.hbase, cm + 1);
    var pool = $('s-pool'), rooms = $('s-rooms');
    pool.style.setProperty('--u', (100 / H) + '%'); rooms.style.setProperty('--u', (100 / H) + '%');
    var pend = st.p.map(function (_, j) { return j; }).filter(function (j) { return !placed[j]; });
    pool.innerHTML = pend.length ? pend.map(function (j) {
      return '<button type="button" class="job" data-j="' + j + '" aria-pressed="' + (st.sel === j) + '" aria-label="Cirugía ' + L[j] + ', ' + st.p[j] + ' horas">' + L[j] + '<small>' + st.p[j] + ' h</small></button>';
    }).join('') : '<span class="none">Ya programaste todas las cirugías.</span>';
    rooms.innerHTML = roomsHTML(A, true, H, cm);
    var s = $('s-status'), n = st.p.length, k = n - pend.length;
    if (st.sel !== null) s.textContent = 'Cirugía ' + L[st.sel] + ' (' + st.p[st.sel] + ' h) elegida. Toca el quirófano donde la programarás.';
    else if (!k) s.textContent = 'Elige una cirugía de la lista y después el quirófano donde la programarás.';
    else if (pend.length) s.textContent = 'Llevas ' + k + ' de ' + n + ' cirugías. El quirófano más ocupado termina a las ' + cm + ' h.';
    else s.textContent = 'Calendario completo: el último quirófano termina a las ' + cm + ' h.' + (st.shown ? '' : ' Pulsa «Ver soluciones» para compararlo.');
    if (st.shown) resultados(pend.length === 0, cm);
  }

  function resultados(done, cm) {
    var o = st.sol.opt, g = st.sol.lpt;
    function pct(v) { return v === o.cmax ? 'Óptimo' : '+' + ((v / o.cmax - 1) * 100).toFixed(1).replace('.', ',') + ' %'; }
    var sw = function (c) { return '<i class="sw" style="background:' + c + '"></i>'; };
    $('s-rows').innerHTML =
      '<tr><th scope="row">' + sw('var(--accent)') + 'Tu calendario</th><td>' + (done ? cm + ' h' : 'incompleto') + '</td><td>' + (done ? pct(cm) : '') + '</td></tr>' +
      '<tr><th scope="row">' + sw('var(--ink)') + 'Óptimo</th><td>' + o.cmax + ' h</td><td>Óptimo</td></tr>' +
      '<tr><th scope="row">' + sw('var(--gold)') + 'Voraz (LPT)</th><td>' + g.cmax + ' h</td><td>' + pct(g.cmax) + '</td></tr>';
    var nota = 'Ningún calendario puede terminar antes de ' + o.lb + ' h (el trabajo total entre los quirófanos, redondeado hacia arriba, o la cirugía más larga). ';
    nota += o.cmax === o.lb ? 'Aquí el óptimo alcanza esa cota. ' : 'Aquí el óptimo queda en ' + o.cmax + ' h. ';
    nota += g.cmax === o.cmax ? 'El algoritmo voraz también dio con el óptimo.' : 'El algoritmo voraz asigna la cirugía más larga al quirófano menos cargado y es instantáneo, pero aquí se queda en ' + g.cmax + ' h. Se sabe que nunca excede 4/3 del óptimo.';
    $('s-note').textContent = nota;
    var H = Math.max(st.hbase, cm + 1, g.cmax + 1);
    var gantt = function (title, A, c) { return '<div class="gantt" style="--u:' + (100 / H) + '%"><h4>' + title + '</h4>' + roomsHTML(A, false, H, c) + '</div>'; };
    $('s-gantts').innerHTML =
      (done ? gantt('Tu calendario · ' + cm + ' h', st.assign, cm) : '') +
      gantt('Óptimo · ' + o.cmax + ' h', o.assign, o.cmax) +
      gantt('Voraz (LPT) · ' + g.cmax + ' h', g.assign, g.cmax);
    $('s-res').hidden = false;
  }

  $('s-pool').addEventListener('click', function (e) {
    var b = e.target.closest('.job'); if (!b) return;
    var j = +b.getAttribute('data-j'); st.sel = st.sel === j ? null : j; render();
    var nb = $('s-pool').querySelector('[data-j="' + j + '"]'); if (nb) nb.focus();
  });
  $('s-rooms').addEventListener('click', function (e) {
    var blk = e.target.closest('.blk');
    if (blk) {
      var j = +blk.getAttribute('data-j');
      st.assign.forEach(function (a) { var k = a.indexOf(j); if (k >= 0) a.splice(k, 1); });
      st.sel = null; render();
      var nb = $('s-pool').querySelector('[data-j="' + j + '"]'); if (nb) nb.focus();
      return;
    }
    var t = e.target.closest('[data-r]'); if (!t) return;
    if (st.sel === null) { $('s-status').textContent = 'Primero elige una cirugía de la lista.'; return; }
    var r = +t.getAttribute('data-r'); st.assign[r].push(st.sel); st.sel = null; render();
    var pb = $('s-rooms').querySelector('.put[data-r="' + r + '"]'); if (pb) pb.focus();
  });
  $('s-new').addEventListener('click', nueva);
  $('s-reset').addEventListener('click', reiniciar);
  $('s-n').addEventListener('input', function () { $('s-nv').textContent = this.value; });
  $('s-n').addEventListener('change', nueva);
  $('s-m').addEventListener('change', nueva);
  $('s-solve').addEventListener('click', function () { st.shown = true; render(); $('s-res').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  nueva();
})();

/* ================= Juego 3: distribución a farmacias (ruteo con capacidad) ================= */
(function () {
  var NS = 'http://www.w3.org/2000/svg', W = 560, H = 400, KM = 0.05, K = 5;
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('v-map'); if (!svg) return;
  function se(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var a in attrs) e.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var km = function (px) { return (px * KM).toFixed(1).replace('.', ',') + ' km'; };
  var pts, D, dem, Q, n, routes, sel, sol, view, gLay, nodeEls;

  function rlen(r) {
    if (!r.length) return 0;
    var s = D[0][r[0]];
    for (var i = 0; i < r.length - 1; i++) s += D[r[i]][r[i + 1]];
    return s + D[r[r.length - 1]][0];
  }
  function carga(r) { return r.reduce(function (s, c) { return s + dem[c - 1]; }, 0); }
  function total(rs) { return rs.reduce(function (s, r) { return s + rlen(r); }, 0); }
  function usados(rs) { return rs.filter(function (r) { return r.length; }).length; }

  /* óptimo: mejor recorrido de cada subconjunto (Held-Karp) y mejor partición en a lo más K subconjuntos que quepan en un auto */
  function exacto() {
    var S = 1 << n, dp = new Float64Array(S * n).fill(Infinity), par = new Int8Array(S * n).fill(-1);
    var tsp = new Float64Array(S).fill(Infinity), lastj = new Int8Array(S).fill(-1), ds = new Int32Array(S);
    var j, mask, a, b;
    for (j = 0; j < n; j++) dp[(1 << j) * n + j] = D[0][j + 1];
    for (mask = 1; mask < S; mask++) {
      ds[mask] = ds[mask & (mask - 1)] + dem[31 - Math.clz32(mask & -mask)];
      for (a = 0; a < n; a++) {
        if (!(mask & (1 << a))) continue;
        var cur = dp[mask * n + a]; if (cur === Infinity) continue;
        for (b = 0; b < n; b++) {
          if (mask & (1 << b)) continue;
          var ix = (mask | (1 << b)) * n + b, v = cur + D[a + 1][b + 1];
          if (v < dp[ix]) { dp[ix] = v; par[ix] = a; }
        }
        if (ds[mask] <= Q) { var t = cur + D[a + 1][0]; if (t < tsp[mask]) { tsp[mask] = t; lastj[mask] = a; } }
      }
    }
    var g = [], ch = [], k;
    for (k = 0; k <= K; k++) { g.push(new Float64Array(S).fill(Infinity)); ch.push(new Int32Array(S)); }
    g[0][0] = 0;
    for (k = 1; k <= K; k++)
      for (mask = 1; mask < S; mask++) {
        var low = mask & -mask, rest = mask ^ low, sub = rest, best = Infinity, bs = 0;
        for (;;) {
          var s = sub | low;
          if (tsp[s] < Infinity) { var c = tsp[s] + g[k - 1][mask ^ s]; if (c < best) { best = c; bs = s; } }
          if (sub === 0) break;
          sub = (sub - 1) & rest;
        }
        g[k][mask] = best; ch[k][mask] = bs;
      }
    var full = S - 1, kb = -1;
    for (k = 1; k <= K; k++) if (g[k][full] < Infinity && (kb < 0 || g[k][full] < g[kb][full] - 1e-9)) kb = k;
    if (kb < 0) return null;
    var out = [], m = full;
    for (k = kb; k >= 1; k--) {
      var s2 = ch[k][m], arr = [], msk = s2, c2 = lastj[s2];
      while (c2 >= 0) { arr.push(c2 + 1); var pc = par[msk * n + c2]; msk ^= (1 << c2); c2 = pc; }
      out.push(arr.reverse()); m ^= s2;
    }
    return out;
  }

  /* aproximada: ahorros de Clarke y Wright */
  function ahorros() {
    var rs = [], i, j;
    for (i = 1; i <= n; i++) rs.push([i]);
    var sv = [];
    for (i = 1; i <= n; i++) for (j = i + 1; j <= n; j++) sv.push([D[0][i] + D[0][j] - D[i][j], i, j]);
    sv.sort(function (x, y) { return y[0] - x[0]; });
    function find(c) { for (var k = 0; k < rs.length; k++) if (rs[k].indexOf(c) >= 0) return k; return -1; }
    sv.forEach(function (e) {
      if (e[0] <= 0) return;
      var a = find(e[1]), b = find(e[2]); if (a === b) return;
      var A = rs[a], B = rs[b];
      if (carga(A) + carga(B) > Q) return;
      var A2 = A[A.length - 1] === e[1] ? A : (A[0] === e[1] ? A.slice().reverse() : null);
      var B2 = B[0] === e[2] ? B : (B[B.length - 1] === e[2] ? B.slice().reverse() : null);
      if (!A2 || !B2) return;
      rs[a] = A2.concat(B2); rs.splice(b, 1);
    });
    while (rs.length > K) {                      /* si sobran rutas, fusiona las que menos cuesten */
      var best = null;
      for (var a2 = 0; a2 < rs.length; a2++) for (var b2 = a2 + 1; b2 < rs.length; b2++) {
        if (carga(rs[a2]) + carga(rs[b2]) > Q) continue;
        [rs[a2], rs[a2].slice().reverse()].forEach(function (ra) {
          [rs[b2], rs[b2].slice().reverse()].forEach(function (rb) {
            var d = D[ra[ra.length - 1]][rb[0]] - D[ra[ra.length - 1]][0] - D[0][rb[0]];
            if (!best || d < best.d) best = { d: d, a: a2, b: b2, r: ra.concat(rb) };
          });
        });
      }
      if (!best) break;
      rs[best.a] = best.r; rs.splice(best.b, 1);
    }
    return rs;
  }

  function fondo() {
    var g = se('g', { 'aria-hidden': 'true' }, svg);
    se('rect', { 'class': 'park', x: 238, y: 172, width: 74, height: 58, rx: 10 }, g);
    [70, 160, 250, 340].forEach(function (y) { se('line', { 'class': 'st', x1: 0, y1: y, x2: W, y2: y, 'stroke-width': 9 }, g); });
    [90, 200, 330, 450, 520].forEach(function (x) { se('line', { 'class': 'st', x1: x, y1: 0, x2: x, y2: H, 'stroke-width': 9 }, g); });
    se('path', { 'class': 'st', d: 'M0 385 L560 35', 'stroke-width': 14 }, g);
    var t = se('text', { 'class': 'cap', x: 10, y: H - 10 }, g); t.textContent = 'Mapa ilustrativo · 1 km = 20 px';
  }

  function nueva() {
    n = +$('v-n').value;
    var tries = 0, opt = null, ap = null, i;
    do {
      var sep = 62, t = 0;
      pts = [{ x: 170 + Math.random() * 220, y: 120 + Math.random() * 160 }];
      while (pts.length < n + 1) {
        var p = { x: 32 + Math.random() * (W - 64), y: 32 + Math.random() * (H - 64) };
        if (pts.every(function (q) { return Math.hypot(p.x - q.x, p.y - q.y) >= sep; })) pts.push(p);
        if (++t % 2500 === 0) sep -= 6;
      }
      D = pts.map(function (a) { return pts.map(function (b) { return Math.hypot(a.x - b.x, a.y - b.y); }); });
      dem = []; for (i = 0; i < n; i++) dem.push(1 + Math.floor(Math.random() * 5));
      var tot = dem.reduce(function (s, x) { return s + x; }, 0);
      Q = Math.max(Math.ceil(tot / K * 1.3), Math.max.apply(null, dem));
      opt = exacto();
      if (opt) ap = ahorros();
    } while ((!opt || ap.length > K || total(ap) < total(opt) + 1e-6) && ++tries < 30);
    while (!opt) { Q++; opt = exacto(); ap = ahorros(); }
    sol = { opt: opt, apx: ap };
    routes = []; for (i = 0; i < K; i++) routes.push([]);
    sel = 0; view = 'user';
    svg.textContent = ''; fondo();
    gLay = se('g', {}, svg); var gN = se('g', {}, svg); nodeEls = [];
    var d = pts[0];
    var dep = se('g', { 'class': 'depot', role: 'img', 'aria-label': 'Almacén, punto de partida' }, gN);
    se('path', { d: 'M' + (d.x - 17) + ' ' + (d.y - 2) + 'L' + d.x + ' ' + (d.y - 17) + 'L' + (d.x + 17) + ' ' + (d.y - 2) + 'V' + (d.y + 13) + 'H' + (d.x - 17) + 'Z' }, dep);
    se('rect', { 'class': 'door', x: d.x - 5, y: d.y + 2, width: 10, height: 11 }, dep);
    var lt = se('text', { x: d.x, y: d.y + 28 }, dep); lt.textContent = 'Almacén';
    for (i = 1; i <= n; i++) {
      var gc = se('g', { 'class': 'city', tabindex: 0, role: 'button', 'data-i': i }, gN);
      se('circle', { cx: pts[i].x, cy: pts[i].y, r: 22, fill: 'transparent' }, gc);
      se('circle', { 'class': 'dot', cx: pts[i].x, cy: pts[i].y, r: 14 }, gc);
      var tx = se('text', { x: pts[i].x, y: pts[i].y }, gc); tx.textContent = dem[i - 1];
      nodeEls[i] = gc;
    }
    $('v-info').textContent = 'Cada auto carga hasta ' + Q + ' cajas. En total hay que entregar ' +
      dem.reduce(function (s, x) { return s + x; }, 0) + ' cajas. El número dentro de cada farmacia son las cajas que pide.';
    $('v-res').hidden = true;
    $('v-view').querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-v') === 'user'); });
    actualizar();
  }

  function actual() { return view === 'user' ? routes : sol[view]; }

  function actualizar() {
    var cur = actual(), i, k;
    gLay.textContent = '';
    cur.forEach(function (r, k2) {
      if (!r.length) return;
      var tour = [0].concat(r, [0]);
      se('polyline', { 'class': 'rt v' + (k2 % 5 + 1), points: tour.map(function (c) { return pts[c].x + ',' + pts[c].y; }).join(' ') }, gLay);
    });
    var asig = {};
    cur.forEach(function (r, k2) { r.forEach(function (c) { asig[c] = k2; }); });
    var nAs = Object.keys(asig).length;
    for (i = 1; i <= n; i++) {
      nodeEls[i].setAttribute('class', 'city' + (asig[i] !== undefined ? ' a' + (asig[i] % 5 + 1) : ''));
      nodeEls[i].setAttribute('aria-label', 'Farmacia ' + i + ', pide ' + dem[i - 1] + ' cajas' +
        (asig[i] !== undefined ? '. La atiende el auto ' + (asig[i] + 1) + (view === 'user' ? '; tocar para quitarla' : '') : view === 'user' ? '; agregar al auto ' + (sel + 1) : ''));
      nodeEls[i].setAttribute('tabindex', view === 'user' ? 0 : -1);
    }
    var rows = Math.max(K, cur.length), h = '';
    for (k = 0; k < rows; k++) {
      var r = cur[k] || [], l = carga(r), c = k % 5 + 1;
      h += '<button type="button" class="car" data-k="' + k + '" aria-pressed="' + (view === 'user' && sel === k) + '"' + (view === 'user' ? '' : ' disabled') + '>' +
        '<i class="sw" style="background:var(--v' + c + ')"></i><span class="ci"><strong>Auto ' + (k + 1) + '</strong>' +
        '<small>' + l + '/' + Q + ' cajas · ' + (r.length ? km(rlen(r)) : 'sin ruta') + '</small>' +
        '<i class="bar"><b style="width:' + Math.min(100, l / Q * 100) + '%"></b></i></span></button>';
    }
    $('v-fleet').innerHTML = h;
    var st = $('v-status'), u = usados(cur);
    if (view === 'user') {
      if (!nAs) st.textContent = 'Elige un auto y toca las farmacias que atenderá. Cada auto lleva hasta ' + Q + ' cajas.';
      else if (nAs < n) st.textContent = 'Atiendes ' + nAs + ' de ' + n + ' farmacias con ' + u + ' autos y ' + km(total(cur)) + ' de recorrido.';
      else st.textContent = 'Todas las farmacias atendidas con ' + u + ' autos: ' + km(total(cur)) + '.' + (sol && !$('v-res').hidden ? '' : ' Pulsa «Ver soluciones» para compararla.');
    } else st.textContent = (view === 'opt' ? 'Solución óptima: ' : 'Solución aproximada: ') + km(total(cur)) + ' con ' + u + ' autos.';
    $('v-reset').disabled = !nAs || view !== 'user';
    tabla(nAs === n);
  }

  function tabla(done) {
    if ($('v-res').hidden) return;
    var o = total(sol.opt), a = total(sol.apx), u = done ? total(routes) : null;
    function pct(v) { var p = (v / o - 1) * 100; return p < 0.05 ? 'Óptima' : '+' + p.toFixed(1).replace('.', ',') + ' %'; }
    var sw = function (c) { return '<i class="sw" style="background:' + c + '"></i>'; };
    $('v-rows').innerHTML =
      '<tr><th scope="row">' + sw('var(--accent)') + 'Tu solución</th><td>' + (done ? km(u) : 'incompleta') + '</td><td>' + (done ? usados(routes) : '') + '</td><td>' + (done ? pct(u) : '') + '</td></tr>' +
      '<tr><th scope="row">' + sw('var(--ink)') + 'Óptima</th><td>' + km(o) + '</td><td>' + usados(sol.opt) + '</td><td>Óptima</td></tr>' +
      '<tr><th scope="row">' + sw('var(--gold)') + 'Aproximada</th><td>' + km(a) + '</td><td>' + usados(sol.apx) + '</td><td>' + pct(a) + '</td></tr>';
    $('v-note').innerHTML = 'La óptima se calcula con programación dinámica sobre subconjuntos de farmacias: primero el mejor recorrido de cada subconjunto que quepa en un auto, y después la mejor partición en a lo más 5 subconjuntos (unos 3<sup>n</sup> pasos). ' +
      'La aproximada usa el algoritmo de ahorros de Clarke y Wright: empieza con una ruta por farmacia y va fusionando rutas mientras ahorren distancia y quepan en un auto. Es muy rápido y suele quedar cerca del óptimo, pero no lo garantiza.';
    if (view === 'user' && done) $('v-status').textContent = Math.abs(u - o) < 1e-6 ? '¡Encontraste una solución óptima! ' + km(u) + '.' : 'Tu solución mide ' + km(u) + ' y la óptima ' + km(o) + ' (' + pct(u) + ').';
  }

  svg.addEventListener('click', function (e) {
    if (view !== 'user') return;
    var g = e.target.closest('.city'); if (!g) return;
    var i = +g.getAttribute('data-i'), k, pos = -1, ow = -1;
    for (k = 0; k < K; k++) { var x = routes[k].indexOf(i); if (x >= 0) { ow = k; pos = x; } }
    if (ow >= 0) routes[ow].splice(pos, 1);
    else {
      if (carga(routes[sel]) + dem[i - 1] > Q) {
        $('v-status').textContent = 'El auto ' + (sel + 1) + ' lleva ' + carga(routes[sel]) + ' de ' + Q + ' cajas y la farmacia ' + i + ' pide ' + dem[i - 1] + '. Elige otro auto.';
        return;
      }
      routes[sel].push(i);
    }
    actualizar(); nodeEls[i].focus();
  });
  svg.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.city')) { e.preventDefault(); e.target.closest('.city').dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  $('v-fleet').addEventListener('click', function (e) {
    var b = e.target.closest('.car'); if (!b || view !== 'user') return;
    sel = +b.getAttribute('data-k'); actualizar();
    var nb = $('v-fleet').querySelector('[data-k="' + sel + '"]'); if (nb) nb.focus();
  });
  $('v-reset').addEventListener('click', function () { routes = routes.map(function () { return []; }); actualizar(); });
  $('v-new').addEventListener('click', nueva);
  $('v-n').addEventListener('input', function () { $('v-nv').textContent = this.value; });
  $('v-n').addEventListener('change', nueva);
  $('v-solve').addEventListener('click', function () {
    $('v-res').hidden = false; actualizar();
    $('v-res').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  $('v-view').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    view = b.getAttribute('data-v');
    this.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b); });
    actualizar();
  });
  nueva();
})();
