/* ============================================================
   网页版城堡塔防 — 第 ⑤ 门课成品试玩。480×360，点击造塔（30 金）。
   ============================================================ */
(function () {
  'use strict';
  var canvas = document.getElementById('towerCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 480, H = 360;
  // 路径点（格子 20px 坐标）→ 像素
  var PATH = [[1, 13], [8, 13], [8, 3], [14, 3], [14, 11], [19, 11], [19, 6], [22, 6]]
    .map(function (p) { return { x: p[0] * 20 + 10, y: p[1] * 20 + 10 }; });
  var enemies, towers, bullets, drops, gold, baseHP, wave, spawned, spawnT, waveRest, state, kills;

  function reset() {
    enemies = []; towers = []; bullets = []; drops = [];
    gold = 80; baseHP = 10; wave = 1; spawned = 0; spawnT = 0; waveRest = 0; kills = 0;
    state = 'idle';
  }
  reset();

  function pointerXY(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (state === 'over' || state === 'win') { reset(); return; }
    if (state === 'idle') state = 'play';
    var p = pointerXY(e);
    // 先看有没有点到宝物
    for (var di = drops.length - 1; di >= 0; di--) {
      var dp2 = drops[di];
      if (Math.hypot(dp2.x - p.x, dp2.y - p.y) < 18) {
        drops.splice(di, 1);
        if (dp2.k === 'G') gold += 10; else baseHP = Math.min(12, baseHP + 1);
        return;
      }
    }
    if (gold < 30) return;
    // 不许造在路上
    for (var i = 0; i < PATH.length - 1; i++) {
      var a = PATH[i], b = PATH[i + 1];
      var minX = Math.min(a.x, b.x) - 18, maxX = Math.max(a.x, b.x) + 18;
      var minY = Math.min(a.y, b.y) - 18, maxY = Math.max(a.y, b.y) + 18;
      if (p.x > minX && p.x < maxX && p.y > minY && p.y < maxY) return;
    }
    gold -= 30;
    towers.push({ x: p.x, y: p.y, cd: 0 });
  });

  function update(dt) {
    if (state !== 'play') return;
    // 发车：每波 8 个
    spawnT -= dt;
    if (spawned < wave * 8 && spawnT <= 0) {
      enemies.push({ x: PATH[0].x, y: PATH[0].y, seg: 0, hp: 3, max: 3 });
      spawned++; spawnT = 1.6;
    }
    // 敌人沿路走
    for (var i = enemies.length - 1; i >= 0; i--) {
      var en = enemies[i], t = PATH[en.seg + 1];
      if (!t) { baseHP--; enemies.splice(i, 1); if (baseHP <= 0) state = 'over'; continue; }
      var dx = t.x - en.x, dy = t.y - en.y, d = Math.hypot(dx, dy);
      if (d < 4) { en.seg++; continue; }
      en.x += dx / d * 46 * dt; en.y += dy / d * 46 * dt;
    }
    // 炮塔开火
    towers.forEach(function (tw) {
      tw.cd -= dt;
      if (tw.cd > 0 || !enemies.length) return;
      var tgt = enemies[0], bd = 1e9;
      enemies.forEach(function (en) { var d = Math.hypot(en.x - tw.x, en.y - tw.y); if (d < bd) { bd = d; tgt = en; } });
      if (bd > 150) return;
      tw.cd = .8;
      var dx = tgt.x - tw.x, dy = tgt.y - tw.y, d = Math.hypot(dx, dy);
      bullets.push({ x: tw.x, y: tw.y, vx: dx / d * 300, vy: dy / d * 300, life: .9 });
    });
    // 子弹
    for (i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      var hit = false;
      for (var j = enemies.length - 1; j >= 0; j--) {
        var e2 = enemies[j];
        if (Math.abs(e2.x - b.x) < 10 && Math.abs(e2.y - b.y) < 10) {
          e2.hp--; hit = true;
          if (e2.hp <= 0) {
            enemies.splice(j, 1); gold += 5; kills++;
            if (Math.random() < .25) drops.push({ x: e2.x, y: e2.y, k: Math.random() < .7 ? 'G' : 'H', life: 4, vy: -60 });
          }
          break;
        }
      }
      if (hit || b.life <= 0) bullets.splice(i, 1);
    }
    for (i = drops.length - 1; i >= 0; i--) {
      var dp = drops[i];
      if (dp.vy < 0) { dp.y += dp.vy * dt; dp.vy += 300 * dt; if (dp.vy >= 0) dp.vy = 0; }
      dp.life -= dt;
      if (dp.life <= 0) drops.splice(i, 1);
    }
    // 波次
    if (spawned >= wave * 8 && !enemies.length) {
      if (wave >= 3) { state = 'win'; return; }
      waveRest -= dt;
      if (waveRest <= 0) { wave++; waveRest = 4; }
    } else waveRest = 4;
  }

  function draw() {
    ctx.fillStyle = '#2a2118'; ctx.fillRect(0, 0, W, H);
    // 路
    ctx.strokeStyle = '#5d4a33'; ctx.lineWidth = 26; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(PATH[0].x, PATH[0].y);
    PATH.forEach(function (p) { ctx.lineTo(p.x, p.y); });
    ctx.stroke();
    ctx.strokeStyle = '#6d5940'; ctx.lineWidth = 20; ctx.stroke();
    // 基地
    var b = PATH[PATH.length - 1];
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(b.x - 8, b.y - 8, 16, 6); ctx.fillRect(b.x - 12, b.y - 4, 24, 6);
    ctx.fillRect(b.x - 6, b.y + 2, 12, 5); ctx.fillStyle = '#c0392b'; ctx.fillRect(b.x - 4, b.y - 3, 8, 3);
    // 敌人
    enemies.forEach(function (en) {
      ctx.fillStyle = '#ab47bc'; ctx.fillRect(en.x - 7, en.y - 7, 14, 14);
      ctx.fillStyle = '#fff'; ctx.fillRect(en.x - 5, en.y - 4, 3, 3); ctx.fillRect(en.x + 2, en.y - 4, 3, 3);
      ctx.fillStyle = '#22302a'; ctx.fillRect(en.x - 4, en.y - 3, 1, 1); ctx.fillRect(en.x + 3, en.y - 3, 1, 1);
      // 血条
      ctx.fillStyle = '#37474f'; ctx.fillRect(en.x - 8, en.y - 11, 16, 3);
      ctx.fillStyle = '#66bb6a'; ctx.fillRect(en.x - 8, en.y - 11, 16 * en.hp / en.max, 3);
    });
    // 炮塔
    towers.forEach(function (tw) {
      ctx.fillStyle = '#607d8b'; ctx.fillRect(tw.x - 8, tw.y - 4, 16, 12);
      ctx.fillStyle = '#455a64'; ctx.fillRect(tw.x - 4, tw.y - 4, 8, 6);
      ctx.fillStyle = '#37474f'; ctx.fillRect(tw.x - 1.5, tw.y - 12, 3, 9);
    });
    // 子弹
    bullets.forEach(function (b2) { ctx.fillStyle = '#66bb6a'; ctx.fillRect(b2.x - 2, b2.y - 2, 5, 5); });
    // 宝物（闪烁提醒消失）
    drops.forEach(function (dp) {
      var blink = dp.life < 1.5 && (performance.now() / 200 | 0) % 2 === 0;
      if (blink) return;
      if (dp.k === 'G') {
        ctx.fillStyle = '#f8d347'; ctx.fillRect(dp.x - 6, dp.y - 6, 12, 12);
        ctx.fillStyle = '#fce58a'; ctx.fillRect(dp.x - 3, dp.y - 3, 6, 6);
        ctx.fillStyle = '#b18f1c'; ctx.fillRect(dp.x - 1, dp.y - 2, 2, 4);
      } else {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(dp.x - 6, dp.y - 4, 4, 3); ctx.fillRect(dp.x + 2, dp.y - 4, 4, 3);
        ctx.fillRect(dp.x - 7, dp.y - 2, 14, 3); ctx.fillRect(dp.x - 4, dp.y + 1, 8, 3);
      }
    });
    // HUD
    ctx.fillStyle = 'rgba(20,30,25,.75)'; ctx.fillRect(8, 8, 200, 26);
    ctx.fillStyle = '#f8d347'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
    ctx.fillText('金 ' + gold, 16, 26);
    ctx.fillStyle = '#e8776f';
    for (var i = 0; i < baseHP; i++) ctx.fillRect(70 + i * 8, 13, 6, 14);
    ctx.fillStyle = '#fff'; ctx.fillText('波 ' + wave + '/3 · 击杀 ' + kills, 170, 26);
    if (state === 'idle') {
      ctx.fillStyle = 'rgba(42,33,24,.88)'; ctx.fillRect(W / 2 - 160, H / 2 - 48, 320, 96);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('点击空地造炮塔（30 金）', W / 2, H / 2 - 10);
      ctx.font = '15px sans-serif'; ctx.fillText('击杀可能掉宝（金袋+10 / 红心+1血）· 点击拾取 · 守 3 波', W / 2, H / 2 + 18);
    }
    if (state === 'over' || state === 'win') {
      ctx.fillStyle = 'rgba(42,33,24,.9)'; ctx.fillRect(W / 2 - 130, H / 2 - 46, 260, 92);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(state === 'win' ? '守住了！' : '基地陷落', W / 2, H / 2 - 10);
      ctx.font = '15px sans-serif'; ctx.fillText('击杀 ' + kills + ' · 点击重来', W / 2, H / 2 + 18);
    }
  }

  var last = performance.now();
  function loop(t) {
    var dt = Math.min(0.033, (t - last) / 1000); last = t;
    update(dt); draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  var btn = document.getElementById('towerStart');
  if (btn) btn.addEventListener('click', function () { reset(); state = 'play'; });
})();
