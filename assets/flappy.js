/* ============================================================
   网页版飞扬的小鸟 — 第 ② 门课成品试玩。480×360，点击/空格起跳。
   ============================================================ */
(function () {
  'use strict';
  var canvas = document.getElementById('flappyCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 480, H = 360;
  var bird, pipes, score, best = 0, state, spawnT, worldSpeed;

  function reset() {
    bird = { x: 110, y: 150, vy: 0 };
    pipes = [];
    score = 0; worldSpeed = 130; spawnT = 0;
    state = 'idle';
  }
  reset();

  function flap() {
    if (state === 'over') { reset(); return; }
    if (state === 'idle') state = 'play';
    bird.vy = -175;
  }
  window.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); flap(); }
  });
  canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); flap(); });

  function update(dt) {
    if (state !== 'play') return;
    bird.vy += 560 * dt;
    bird.y += bird.vy * dt;
    spawnT -= dt;
    if (spawnT <= 0) {
      var gapY = 70 + Math.random() * 150, gap = 105;
      pipes.push({ x: W + 30, gapY: gapY, gap: gap, passed: false });
      spawnT = 1.5;
    }
    for (var i = pipes.length - 1; i >= 0; i--) {
      var p = pipes[i];
      p.x -= worldSpeed * dt;
      if (p.x < -40) { pipes.splice(i, 1); continue; }
      if (!p.passed && p.x + 26 < bird.x) { p.passed = true; score++; if (score % 5 === 0) worldSpeed += 18; }
      // 碰撞（鸟 18×14）
      if (bird.x + 9 > p.x && bird.x - 9 < p.x + 26) {
        if (bird.y - 7 < p.gapY || bird.y + 7 > p.gapY + p.gap) die();
      }
    }
    if (bird.y > H - 26 || bird.y < 0) die();
  }
  function die() {
    state = 'over';
    best = Math.max(best, score);
  }

  function draw() {
    // 天空
    ctx.fillStyle = '#4ec0ca'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (var c = 0; c < 4; c++) ctx.fillRect(((c * 137) + (performance.now() / 60) % 480) % W - 40, 40 + c * 34, 60, 12);
    // 地面
    ctx.fillStyle = '#ded895'; ctx.fillRect(0, H - 22, W, 22);
    ctx.fillStyle = '#c9c077'; ctx.fillRect(0, H - 22, W, 5);
    // 管道
    pipes.forEach(function (p) {
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(p.x, 0, 26, p.gapY);
      ctx.fillRect(p.x - 3, p.gapY - 14, 32, 14);
      ctx.fillRect(p.x, p.gapY + p.gap, 26, H - p.gapY - p.gap - 22);
      ctx.fillRect(p.x - 3, p.gapY + p.gap, 32, 14);
      ctx.fillStyle = '#7ee0a8';
      ctx.fillRect(p.x + 3, 0, 4, p.gapY - 10);
      ctx.fillRect(p.x + 3, p.gapY + p.gap + 10, 4, H - p.gapY - p.gap - 34);
    });
    // 鸟（朝向随速度）
    var y = Math.max(10, Math.min(H - 30, bird.y));
    ctx.save(); ctx.translate(bird.x, y);
    ctx.rotate(Math.max(-0.5, Math.min(1.1, bird.vy / 320)));
    ctx.fillStyle = '#f8d347'; ctx.fillRect(-9, -7, 18, 14);
    ctx.fillStyle = '#fdf0b0'; ctx.fillRect(-6, -4, 8, 6);
    ctx.fillStyle = '#fff'; ctx.fillRect(3, -4, 6, 6);
    ctx.fillStyle = '#22302a'; ctx.fillRect(6, -2, 3, 3);
    ctx.fillStyle = '#f0652f'; ctx.fillRect(9, 1, 6, 4);
    ctx.fillStyle = '#e8a33d'; ctx.fillRect(-4, 4, 8, 3);
    ctx.restore();
    // 分数
    ctx.fillStyle = 'rgba(20,40,50,.75)'; ctx.fillRect(W / 2 - 44, 10, 88, 34);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
    ctx.fillText(String(score), W / 2, 36);
    if (state === 'idle') {
      ctx.fillStyle = 'rgba(20,40,50,.75)'; ctx.fillRect(W / 2 - 150, H / 2 - 44, 300, 88);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
      ctx.fillText('点击 / 空格 起跳', W / 2, H / 2 - 8);
      ctx.font = '15px sans-serif'; ctx.fillText('穿过管道，坚持越久分越高', W / 2, H / 2 + 22);
    }
    if (state === 'over') {
      ctx.fillStyle = 'rgba(69,44,50,.88)'; ctx.fillRect(W / 2 - 140, H / 2 - 54, 280, 104);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif';
      ctx.fillText('Game Over', W / 2, H / 2 - 16);
      ctx.font = '16px sans-serif';
      ctx.fillText('本局 ' + score + ' · 最高 ' + best, W / 2, H / 2 + 12);
      ctx.fillText('点击重来', W / 2, H / 2 + 36);
    }
  }

  var last = performance.now();
  function loop(t) {
    var dt = Math.min(0.033, (t - last) / 1000); last = t;
    update(dt); draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  var btn = document.getElementById('flappyStart');
  if (btn) btn.addEventListener('click', function () { reset(); state = 'play'; bird.vy = -160; });
})();
