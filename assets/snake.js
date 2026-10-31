/* ============================================================
   网页版贪吃蛇 — 第 ④ 门课成品试玩。480×360，方向键/WASD 控制。
   ============================================================ */
(function () {
  'use strict';
  var canvas = document.getElementById('snakeCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 480, H = 360, CELL = 20;
  var GW = 22, GH = 15, OX = (W - GW * CELL) / 2, OY = (H - GH * CELL) / 2;
  var snake, dir, nextDir, food, score, best = 0, state, stepT, speed;

  function reset() {
    snake = [{ x: 5, y: 7 }, { x: 4, y: 7 }, { x: 3, y: 7 }];
    dir = { x: 1, y: 0 }; nextDir = dir;
    score = 0; speed = .16; stepT = 0; state = 'idle';
    placeFood();
  }
  function placeFood() {
    do { food = { x: (Math.random() * GW) | 0, y: (Math.random() * GH) | 0 }; }
    while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
  }
  reset();

  var KEYMAP = {
    ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0]
  };
  window.addEventListener('keydown', function (e) {
    var m = KEYMAP[e.key];
    if (!m) return;
    e.preventDefault();
    if (state === 'over') { reset(); return; }
    if (state === 'idle') state = 'play';
    // 禁止 180° 掉头
    if (m[0] === -dir.x && m[1] === -dir.y) return;
    nextDir = { x: m[0], y: m[1] };
  });

  function step() {
    dir = nextDir;
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.x >= GW || head.y < 0 || head.y >= GH) return die();
    for (var i = 0; i < snake.length - 1; i++)
      if (snake[i].x === head.x && snake[i].y === head.y) return die();
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score++;
      if (speed > .07) speed -= .006;
      placeFood();
    } else snake.pop();
  }
  function die() { state = 'over'; best = Math.max(best, score); }

  function update(dt) {
    if (state !== 'play') return;
    stepT += dt;
    while (stepT > speed) { stepT -= speed; step(); if (state !== 'play') break; }
  }

  function cell(gx, gy, fill, r) {
    var x = OX + gx * CELL, y = OY + gy * CELL;
    ctx.fillStyle = fill;
    if (r) { ctx.beginPath(); ctx.roundRect(x + 1, y + 1, CELL - 2, CELL - 2, r); ctx.fill(); }
    else ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  }

  function draw() {
    ctx.fillStyle = '#1d2b22'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#16211a'; ctx.fillRect(OX, OY, GW * CELL, GH * CELL);
    ctx.strokeStyle = 'rgba(126,224,168,.08)';
    for (var i = 1; i < GW; i++) { ctx.beginPath(); ctx.moveTo(OX + i * CELL, OY); ctx.lineTo(OX + i * CELL, OY + GH * CELL); ctx.stroke(); }
    for (i = 1; i < GH; i++) { ctx.beginPath(); ctx.moveTo(OX, OY + i * CELL); ctx.lineTo(OX + GW * CELL, OY + i * CELL); ctx.stroke(); }
    // 食物
    cell(food.x, food.y, '#e74c3c', 4);
    ctx.fillStyle = '#f2918a'; ctx.fillRect(OX + food.x * CELL + 5, OY + food.y * CELL + 5, 4, 4);
    ctx.fillStyle = '#27ae60'; ctx.fillRect(OX + food.x * CELL + 12, OY + food.y * CELL + 2, 4, 4);
    // 蛇身
    snake.forEach(function (s, i) { cell(s.x, s.y, i === 0 ? '#2ecc71' : '#27ae60', 4); });
    // 蛇头眼睛 + 舌头方向
    var h = snake[0];
    ctx.fillStyle = '#fff';
    ctx.fillRect(OX + h.x * CELL + 10, OY + h.y * CELL + 5, 5, 5);
    ctx.fillStyle = '#22302a'; ctx.fillRect(OX + h.x * CELL + 12, OY + h.y * CELL + 7, 2, 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(OX + h.x * CELL + 8 + dir.x * 10, OY + h.y * CELL + 8 + dir.y * 10, 5, 3);
    // HUD
    ctx.fillStyle = 'rgba(20,40,30,.75)'; ctx.fillRect(8, 8, 150, 26);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
    ctx.fillText('分 ' + score + ' · 最高 ' + best, 16, 26);
    if (state === 'idle') {
      ctx.fillStyle = 'rgba(29,43,34,.88)'; ctx.fillRect(W / 2 - 150, H / 2 - 44, 300, 88);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('方向键 / WASD 转向', W / 2, H / 2 - 8);
      ctx.font = '15px sans-serif'; ctx.fillText('吃一口长一节，撞墙咬身出局', W / 2, H / 2 + 20);
    }
    if (state === 'over') {
      ctx.fillStyle = 'rgba(45,28,32,.9)'; ctx.fillRect(W / 2 - 130, H / 2 - 46, 260, 92);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('出局', W / 2, H / 2 - 10);
      ctx.font = '15px sans-serif'; ctx.fillText('本局 ' + score + ' 节 · 按方向键重来', W / 2, H / 2 + 18);
    }
  }

  var last = performance.now();
  function loop(t) {
    var dt = Math.min(0.033, (t - last) / 1000); last = t;
    update(dt); draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  var btn = document.getElementById('snakeStart');
  if (btn) btn.addEventListener('click', function () { reset(); state = 'play'; });
})();
