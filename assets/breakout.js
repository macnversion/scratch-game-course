/* ============================================================
   网页版打砖块演示 — 《小游戏项目课程地图》第 5 项的试玩版。
   舞台 480×360（与 Scratch 一致），挡板跟鼠标，反弹角度随击球点变化。
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('breakoutCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 480, H = 360, SCALE = canvas.width / W;

  var ROWS = 5, COLS = 8, BW = 55, BH = 16, GAP = 3, TOP = 42, LEFT = 12;
  var ROW_COLORS = ['#d9534f', '#f0ad4e', '#ffd94a', '#5cb85c', '#4a90d9'];
  var ROW_COLORS_DK = ['#a93e3a', '#c0863c', '#ccb038', '#3f8f43', '#386fae'];

  var state, score, lives, bricks, ball, paddle, keys = {}, speed;

  function reset() {
    state = 'idle';
    score = 0;
    lives = 3;
    speed = 250;                       // 像素/秒
    paddle = { x: W / 2, y: 330, w: 76, h: 12 };
    ball = { x: W / 2, y: paddle.y - 10, vx: 0, vy: 0, stuck: true };
    bricks = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        bricks.push({
          x: LEFT + c * (BW + GAP), y: TOP + r * (BH + GAP),
          color: ROW_COLORS[r], dark: ROW_COLORS_DK[r], alive: true
        });
      }
    }
  }
  reset();

  /* ---------- 输入 ---------- */
  var KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right', A: 'left', D: 'right' };
  window.addEventListener('keydown', function (e) {
    if (KEYMAP[e.key]) {
      var r = canvas.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) e.preventDefault();
      keys[KEYMAP[e.key]] = true;
    }
    if (e.key === ' ' && state === 'playing') { launchIfStuck(); e.preventDefault(); }
  });
  window.addEventListener('keyup', function (e) { if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false; });

  function pointerX(e) {
    var r = canvas.getBoundingClientRect();
    var cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    return Math.max(0, Math.min(W, cx / r.width * W));
  }
  canvas.addEventListener('mousemove', function (e) { paddle.x = pointerX(e); });
  canvas.addEventListener('touchmove', function (e) { e.preventDefault(); paddle.x = pointerX(e); }, { passive: false });
  canvas.addEventListener('pointerdown', function () { if (state === 'idle') start(); else launchIfStuck(); });

  function start() {
    reset();
    state = 'playing';
    launchIfStuck();
    var btn = document.getElementById('breakoutStart');
    if (btn) { btn.textContent = '🔄 重新开始'; btn.classList.remove('primary'); }
  }
  function launchIfStuck() {
    if (ball.stuck) {
      ball.stuck = false;
      var ang = (-60 - Math.random() * 60) * Math.PI / 180;   // -60° ~ -120°
      ball.vx = Math.cos(ang) * speed;
      ball.vy = Math.sin(ang) * speed;
    }
  }

  /* ---------- 更新 ---------- */
  function step(dt) {
    if (state !== 'playing') return;
    // 挡板：键盘微调（鼠标移动优先）
    if (keys.left) paddle.x -= 420 * dt;
    if (keys.right) paddle.x += 420 * dt;
    paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x));

    if (ball.stuck) { ball.x = paddle.x; ball.y = paddle.y - 10; return; }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // 墙壁
    if (ball.x < 6) { ball.x = 6; ball.vx = Math.abs(ball.vx); }
    if (ball.x > W - 6) { ball.x = W - 6; ball.vx = -Math.abs(ball.vx); }
    if (ball.y < 6) { ball.y = 6; ball.vy = Math.abs(ball.vy); }

    // 挡板：按击球点改变反弹角度（教程里的 ×0.7 思路）
    if (ball.vy > 0 && ball.y > paddle.y - 8 && ball.y < paddle.y + paddle.h &&
        Math.abs(ball.x - paddle.x) < paddle.w / 2 + 6) {
      var off = (ball.x - paddle.x) / (paddle.w / 2);        // -1 ~ 1
      var ang = off * 1.0;                                    // 最大 60°
      var sp = Math.min(speed * 1.02, 430);
      speed = sp;
      ball.vx = Math.sin(ang) * sp;
      ball.vy = -Math.cos(ang) * sp;
      ball.y = paddle.y - 8;
    }

    // 砖块
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      if (ball.x > b.x - 6 && ball.x < b.x + BW + 6 && ball.y > b.y - 6 && ball.y < b.y + BH + 6) {
        b.alive = false;
        score += 10;
        // 简化判定：从上下半区进入就翻转 vy，否则翻转 vx
        var cx = b.x + BW / 2, cy = b.y + BH / 2;
        if (Math.abs(ball.x - cx) / (BW / 2) > Math.abs(ball.y - cy) / (BH / 2)) ball.vx = -ball.vx;
        else ball.vy = -ball.vy;
        break;
      }
    }
    if (bricks.every(function (b) { return !b.alive; })) state = 'win';

    // 掉落
    if (ball.y > H + 8) {
      lives--;
      if (lives <= 0) state = 'lose';
      else { ball.stuck = true; ball.vx = 0; ball.vy = 0; }
    }
  }

  /* ---------- 绘制 ---------- */
  function draw() {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = '#101b16';
    ctx.fillRect(0, 0, W, H);
    // 砖块（双色斜面）
    bricks.forEach(function (b) {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, BW, BH);
      ctx.fillStyle = b.dark;
      ctx.fillRect(b.x, b.y + BH - 4, BW, 4);
      ctx.fillRect(b.x + BW - 4, b.y, 4, BH);
    });
    // 挡板
    ctx.fillStyle = '#cfe3ee';
    ctx.fillRect(paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h);
    ctx.fillStyle = '#7fa8c9';
    ctx.fillRect(paddle.x - paddle.w / 2, paddle.y + paddle.h - 4, paddle.w, 4);
    // 球
    if (state !== 'lose') {
      ctx.fillStyle = '#ffd94a';
      ctx.fillRect(ball.x - 6, ball.y - 6, 12, 12);
      ctx.fillStyle = '#c9a41f';
      ctx.fillRect(ball.x - 6, ball.y + 2, 12, 4);
    }
    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('得分 ' + score, 12, 24);
    ctx.fillText('生命 ' + '❤'.repeat(Math.max(0, lives)), W - 110, 24);
    if (ball.stuck && state === 'playing') {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = '13px "PingFang SC", sans-serif';
      ctx.fillText('移动鼠标瞄准，点击或按空格发球', W / 2 - 100, 310);
    }
    if (state === 'idle') {
      overlay('打砖块 · 试玩', '移动鼠标接球，敲掉全部砖块', '点击画面或下方按钮开始');
    } else if (state === 'win') {
      overlay('全部敲掉啦！', '得分 ' + score + '，剩余生命 ' + lives, '点击重新开始再来一局');
    } else if (state === 'lose') {
      overlay('球用完了', '最终得分 ' + score, '点击重新开始再来一局');
    }
  }

  function overlay(title, sub, hint) {
    ctx.fillStyle = 'rgba(10,18,14,0.66)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(title, W / 2, 150);
    ctx.font = '15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(sub, W / 2, 180);
    ctx.font = '13px "PingFang SC", sans-serif';
    ctx.fillText(hint, W / 2, 208);
    ctx.textAlign = 'left';
  }

  /* ---------- 主循环（时间差驱动，高刷屏手感一致） ---------- */
  var last = 0;
  function loop(now) {
    var dt = last ? Math.min((now - last) / 1000, 0.033) : 0;
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  var startBtn = document.getElementById('breakoutStart');
  if (startBtn) startBtn.addEventListener('click', start);
})();
