/* ============================================================
   网页版俄罗斯方块 — 第 ⑥ 门课成品试玩。480×360，←→ 移动 / ↑ 旋转 / ↓ 加速。
   ============================================================ */
(function () {
  'use strict';
  var canvas = document.getElementById('tetraCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 480, H = 360, CELL = 18;
  var GW = 10, GH = 18, OX = (W - GW * CELL) / 2, OY = (H - GH * CELL) / 2 + 4;
  var COLORS = { I: '#26c6da', O: '#f8d347', T: '#ab7be5', S: '#2ecc71', Z: '#e74c3c', J: '#4a90d9', L: '#f39c12' };
  var SHAPES = {
    I: [[0, 0], [0, 1], [0, 2], [0, 3]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[0, 0], [0, 1], [0, 2], [1, 2]],
    L: [[1, 0], [1, 1], [1, 2], [0, 2]]
  };
  var grid, piece, score, lines, state, stepT, speed;
  var KEYS = {};

  function reset() {
    grid = [];
    for (var y = 0; y < GH; y++) grid.push(new Array(GW).fill(0));
    score = 0; lines = 0; speed = .55; stepT = 0; state = 'idle';
    spawn();
  }
  function spawn() {
    var ks = Object.keys(SHAPES);
    piece = { k: ks[(Math.random() * ks.length) | 0], c: 4, r: 0, rot: 0 };
    if (collide(piece.c, piece.r, piece.k, 0)) state = 'over';
  }
  // 预生成每个形状的 4 组"配方"（归一化，旋转不再漂移）——课程教法同款
  var ROTS = {};
  Object.keys(SHAPES).forEach(function (k) {
    var rots = [];
    for (var i = 0; i < 4; i++) {
      var cs = SHAPES[k].map(function (p) {
        var x = p[0], y = p[1];
        for (var j = 0; j < i; j++) { var t = x; x = 1 - y; y = t; }
        return [x, y];
      });
      var mx = Math.min.apply(null, cs.map(function (c) { return c[0]; }));
      var my = Math.min.apply(null, cs.map(function (c) { return c[1]; }));
      rots.push(cs.map(function (c) { return [c[0] - mx, c[1] - my]; }));
    }
    ROTS[k] = rots;
  });
  function cells(k, c, r, rot) {
    return ROTS[k][rot & 3].map(function (p) { return [c + p[0], r + p[1]]; });
  }
  function collide(c, r, k, rot) {
    return cells(k, c, r, rot).some(function (p) {
      return p[0] < 0 || p[0] >= GW || p[1] >= GH || (p[1] >= 0 && grid[p[1]][p[0]]);
    });
  }
  function lock() {
    cells(piece.k, piece.c, piece.r, piece.rot).forEach(function (p) {
      if (p[1] >= 0) grid[p[1]][p[0]] = piece.k;
    });
    // 消行
    var cleared = 0;
    for (var y = GH - 1; y >= 0; y--) {
      if (grid[y].every(function (v) { return v; })) {
        grid.splice(y, 1); grid.unshift(new Array(GW).fill(0));
        cleared++; y++;
      }
    }
    if (cleared) {
      score += [0, 10, 30, 60, 100][cleared]; lines += cleared;
      if (speed > .1) speed -= .015 * cleared;
    }
    spawn();
  }
  reset();

  window.addEventListener('keydown', function (e) {
    var k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(k) >= 0) e.preventDefault();
    if (state === 'over' && k !== 'ArrowUp') { if (k === ' ') reset(); return; }
    if (state === 'idle') { state = 'play'; }
    if (state !== 'play') return;
    if (k === 'ArrowLeft' || k === 'a') { if (!collide(piece.c - 1, piece.r, piece.k, piece.rot)) piece.c--; }
    if (k === 'ArrowRight' || k === 'd') { if (!collide(piece.c + 1, piece.r, piece.k, piece.rot)) piece.c++; }
    if (k === 'ArrowUp' || k === 'w') {
      var nr = (piece.rot + 1) % 4;
      var kicks = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [-3, 0], [3, 0], [0, -1], [-1, -1], [1, -1]];
      for (var ki = 0; ki < kicks.length; ki++) {
        if (!collide(piece.c + kicks[ki][0], piece.r + kicks[ki][1], piece.k, nr)) {
          piece.rot = nr; piece.c += kicks[ki][0]; piece.r += kicks[ki][1];
          break;
        }
      }
    }
    if (k === ' ') { while (!collide(piece.c, piece.r + 1, piece.k, piece.rot)) piece.r++; lock(); stepT = 0; }
  });

  function update(dt) {
    if (state !== 'play') return;
    stepT += dt;
    var sp = KEYS.ArrowDown ? speed / 6 : speed;
    while (stepT > sp) {
      stepT -= sp;
      if (!collide(piece.c, piece.r + 1, piece.k, piece.rot)) piece.r++;
      else { lock(); break; }
    }
  }
  window.addEventListener('keydown', function (e) { KEYS[e.key] = true; });
  window.addEventListener('keyup', function (e) { KEYS[e.key] = false; });

  function block(x, y, k, alpha) {
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = COLORS[k];
    ctx.fillRect(OX + x * CELL + 1, OY + y * CELL + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(OX + x * CELL + 1, OY + y * CELL + 1, CELL - 2, 3);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(OX + x * CELL + 1, OY + y * CELL + CELL - 4, CELL - 2, 3);
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.fillStyle = '#11151f'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1a2233'; ctx.fillRect(OX, OY, GW * CELL, GH * CELL);
    ctx.strokeStyle = 'rgba(55,71,79,.5)';
    for (var i = 1; i < GW; i++) { ctx.beginPath(); ctx.moveTo(OX + i * CELL, OY); ctx.lineTo(OX + i * CELL, OY + GH * CELL); ctx.stroke(); }
    for (i = 1; i < GH; i++) { ctx.beginPath(); ctx.moveTo(OX, OY + i * CELL); ctx.lineTo(OX + GW * CELL, OY + i * CELL); ctx.stroke(); }
    // 已落
    for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) if (grid[y][x]) block(x, y, grid[y][x]);
    // 落点投影
    if (state === 'play') {
      var dr = piece.r;
      while (!collide(piece.c, dr + 1, piece.k, piece.rot)) dr++;
      cells(piece.k, piece.c, dr, piece.rot).forEach(function (p) { if (p[1] >= 0) block(p[0], p[1], piece.k, .18); });
      cells(piece.k, piece.c, piece.r, piece.rot).forEach(function (p) { if (p[1] >= 0) block(p[0], p[1], piece.k); });
    }
    // HUD
    ctx.fillStyle = 'rgba(17,21,31,.75)'; ctx.fillRect(8, 8, 140, 26);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
    ctx.fillText('分 ' + score + ' · 消 ' + lines, 16, 26);
    if (state === 'idle') {
      ctx.fillStyle = 'rgba(17,21,31,.85)'; ctx.fillRect(W / 2 - 165, H / 2 - 48, 330, 96);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 19px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('← → 移动 · ↑ 旋转 · ↓ 加速', W / 2, H / 2 - 10);
      ctx.font = '15px sans-serif'; ctx.fillText('拼满一行消一行，堆到顶结束', W / 2, H / 2 + 18);
    }
    if (state === 'over') {
      ctx.fillStyle = 'rgba(30,17,25,.9)'; ctx.fillRect(W / 2 - 130, H / 2 - 46, 260, 92);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('堆到顶了', W / 2, H / 2 - 10);
      ctx.font = '15px sans-serif'; ctx.fillText('分 ' + score + ' · 消 ' + lines + ' 行 · 按空格重来', W / 2, H / 2 + 18);
    }
  }

  var last = performance.now();
  function loop(t) {
    var dt = Math.min(0.033, (t - last) / 1000); last = t;
    update(dt); draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  var btn = document.getElementById('tetraStart');
  if (btn) btn.addEventListener('click', function () { reset(); state = 'play'; });
})();
