/* ============================================================
   网页版太空射击 — 第 ③ 门课成品试玩。480×360，←→ 驾驶 / 空格开火。
   ============================================================ */
(function () {
  'use strict';
  var canvas = document.getElementById('shooterCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 480, H = 360;
  var ship, bullets, rocks, stars, score, shield, state, fireCd = 0, spawnT = 0, speed = 90;
  var drops, weaponT = 0;  // 宝物掉落 + 火力计时

  function reset() {
    ship = { x: W / 2, y: H - 46 };
    bullets = []; rocks = []; drops = []; weaponT = 0; score = 0; shield = 3; state = 'idle'; speed = 90;
    stars = [];
    for (var i = 0; i < 40; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.6 + .4 });
  }
  reset();
  var keys = {};
  window.addEventListener('keydown', function (e) {
    if (['ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) >= 0) e.preventDefault();
    keys[e.key] = true;
    if (e.key === ' ') { if (state === 'over') reset(); else if (state === 'idle') state = 'play'; }
  });
  window.addEventListener('keyup', function (e) { keys[e.key] = false; });

  function boom(x, y, n, col) {
    for (var i = 0; i < n; i++)
      rocks.push({ x: x, y: y, vx: (Math.random() - .5) * 260, vy: (Math.random() - .5) * 260, r: 2, dead: true, life: .35, col: col || '#f5a623' });
  }

  function update(dt) {
    stars.forEach(function (s) { s.y += (30 + s.s * 40) * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
    if (state !== 'play') return;
    if (keys.ArrowLeft || keys.a) ship.x -= 220 * dt;
    if (keys.ArrowRight || keys.d) ship.x += 220 * dt;
    ship.x = Math.max(16, Math.min(W - 16, ship.x));
    fireCd -= dt;
    if (keys[' '] && fireCd <= 0) {
      bullets.push({ x: ship.x, y: ship.y - 16 });
      if (weaponT > 0) {
        bullets.push({ x: ship.x - 10, y: ship.y - 10, vx: -80 });
        bullets.push({ x: ship.x + 10, y: ship.y - 10, vx: 80 });
      }
      fireCd = weaponT > 0 ? .12 : .18;
    }
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i]; b.y -= 380 * dt;
      if (b.vx) b.x += b.vx * dt;
      if (b.y < -8 || b.x < -8 || b.x > W + 8) bullets.splice(i, 1);
    }
    spawnT -= dt;
    if (spawnT <= 0) {
      rocks.push({ x: 20 + Math.random() * (W - 40), y: -14, vy: speed + Math.random() * 40, r: 8 + Math.random() * 8, hp: 2, dead: false });
      spawnT = .5 + Math.random();
    }
    for (i = rocks.length - 1; i >= 0; i--) {
      var r = rocks[i];
      if (r.dead) { r.life -= dt; r.x += r.vx * dt; r.y += r.vy * dt; if (r.life <= 0) rocks.splice(i, 1); continue; }
      r.y += r.vy * dt;
      if (r.y > H + 16) { rocks.splice(i, 1); continue; }
      var hitB = -1;
      for (var j = 0; j < bullets.length; j++) {
        if (Math.abs(bullets[j].x - r.x) < r.r + 3 && Math.abs(bullets[j].y - r.y) < r.r + 6) { hitB = j; break; }
      }
      if (hitB >= 0) {
        bullets.splice(hitB, 1); r.hp--;
        if (r.hp <= 0) {
          boom(r.x, r.y, 8); rocks.splice(i, 1); score += 10;
          if (score % 100 === 0) speed += 14;
          if (Math.random() < .22) drops.push({ x: r.x, y: r.y, k: ['W','S','$'][(Math.random()*3)|0], vy: 70 });
          continue;
        }
      }
      if (Math.abs(r.x - ship.x) < r.r + 12 && Math.abs(r.y - ship.y) < r.r + 10) {
        boom(r.x, r.y, 10, '#e74c3c'); rocks.splice(i, 1); shield--;
        if (shield <= 0) state = 'over';
      }
    }
    for (i = drops.length - 1; i >= 0; i--) {
      var dp = drops[i];
      dp.y += dp.vy * dt;
      if (dp.y > H + 10) { drops.splice(i, 1); continue; }
      if (Math.abs(dp.x - ship.x) < 14 && Math.abs(dp.y - ship.y) < 14) {
        drops.splice(i, 1);
        if (dp.k === 'W') weaponT = 10;
        else if (dp.k === 'S') shield = Math.min(5, shield + 1);
        else score += 50;
      }
    }
    if (weaponT > 0) weaponT -= dt;
    if (score >= 300) state = 'win';
  }

  function draw() {
    ctx.fillStyle = '#0b1026'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    stars.forEach(function (s) { ctx.globalAlpha = s.s / 2; ctx.fillRect(s.x, s.y, s.s, s.s); });
    ctx.globalAlpha = 1;
    // 子弹
    bullets.forEach(function (b) { ctx.fillStyle = '#fff'; ctx.fillRect(b.x - 1, b.y - 6, 2, 6); ctx.fillStyle = '#f5a623'; ctx.fillRect(b.x - 2, b.y - 2, 4, 4); });
    // 陨石
    rocks.forEach(function (r) {
      if (r.dead) { ctx.fillStyle = r.col; ctx.fillRect(r.x - 2, r.y - 2, 4, 4); return; }
      ctx.fillStyle = '#9aa0a6'; ctx.fillRect(r.x - r.r, r.y - r.r, r.r * 2, r.r * 2);
      ctx.fillStyle = '#c3c8cd'; ctx.fillRect(r.x - r.r, r.y - r.r, r.r * 2, 3);
      ctx.fillStyle = '#6f767d'; ctx.fillRect(r.x - r.r / 2, r.y, r.r, r.r / 2);
    });
    // 宝物
    drops.forEach(function (dp) {
      var col = dp.k === 'W' ? '#f8d347' : dp.k === 'S' ? '#66bb6a' : '#e8776f';
      ctx.fillStyle = col;
      ctx.fillRect(dp.x - 7, dp.y - 7, 14, 14);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(dp.x - 7, dp.y - 7, 14, 3);
      ctx.fillStyle = '#111'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(dp.k === '$' ? '$' : dp.k, dp.x, dp.y + 4);
    });
    // 火力全开指示
    if (weaponT > 0) {
      ctx.fillStyle = '#f8d347'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'right';
      ctx.fillText('火力全开 ' + weaponT.toFixed(0) + 's', W - 14, 26);
    }
    // 飞船
    ctx.save(); ctx.translate(ship.x, ship.y);
    ctx.fillStyle = '#48b6ce'; ctx.fillRect(-10, -3, 20, 8); ctx.fillRect(-4, -10, 8, 8);
    ctx.fillStyle = '#223c50'; ctx.fillRect(-3, -8, 6, 5);
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(-14, 0, 4, 7); ctx.fillRect(10, 0, 4, 7);
    ctx.fillStyle = '#f5a623'; ctx.fillRect(-2, 6, 4, 3 + Math.random() * 3);
    ctx.restore();
    // HUD
    ctx.fillStyle = 'rgba(20,40,50,.75)'; ctx.fillRect(8, 8, 132, 26);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
    ctx.fillText('分 ' + score + '/300', 16, 26);
    ctx.fillStyle = 'rgba(20,40,50,.75)'; ctx.fillRect(W - 92, 8, 84, 26);
    ctx.fillStyle = '#fff';
    for (var i = 0; i < shield; i++) { ctx.fillStyle = '#e8776f'; ctx.fillRect(W - 82 + i * 16, 14, 12, 12); ctx.fillStyle = '#fff'; }
    if (state === 'idle') {
      ctx.fillStyle = 'rgba(11,16,38,.82)'; ctx.fillRect(W / 2 - 150, H / 2 - 44, 300, 88);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('← → 驾驶 · 空格开火', W / 2, H / 2 - 8);
      ctx.font = '15px sans-serif'; ctx.fillText('陨石掉宝：W 火力 · S 护盾 · $ 赏金 | 300 分通关', W / 2, H / 2 + 20);
    }
    if (state === 'over' || state === 'win') {
      ctx.fillStyle = 'rgba(11,16,38,.86)'; ctx.fillRect(W / 2 - 140, H / 2 - 46, 280, 92);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(state === 'win' ? '任务完成！' : '护盾耗尽', W / 2, H / 2 - 10);
      ctx.font = '15px sans-serif';
      ctx.fillText('得分 ' + score + ' · 按空格重来', W / 2, H / 2 + 18);
    }
  }

  var last = performance.now();
  function loop(t) {
    var dt = Math.min(0.033, (t - last) / 1000); last = t;
    update(dt); draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  var btn = document.getElementById('shooterStart');
  if (btn) btn.addEventListener('click', function () { reset(); state = 'play'; });
})();
