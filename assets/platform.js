/* ============================================================
   网页版跳跳冒险 — 第 ⑦ 门课成品试玩。480×360，方向键/AD 移动，
   空格/↑/W 跳跃。踩扁蘑菇敌、顶问号砖吃金币、摸到终点旗过关。
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('platformCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 480, H = 360, SCALE = canvas.width / W, TS = 24;

  /* 关卡：40 列 × 15 行。# 地面  I 铁平台  ? 问号砖  c 金币  E 蘑菇敌  F 终点旗 */
  var MAP = [
    '                                        ',
    '                                        ',
    '                                        ',
    '                                        ',
    '         c            II     c          ',
    '        III                  III        ',
    '                    c                   ',
    '   II        IIII        II      II     ',
    '      c                 c          c    ',
    '  ??     ?          ?         ?         ',
    '        III    II        III      II    ',
    '                                        ',
    '     E        E          E          F   ',
    '############  #############  ###########',
    '############  #############  ###########',
  ];
  var COLS = 40, ROWS = 15, LW = COLS * TS;
  MAP.forEach(function (r, i) {
    if (r.length !== COLS) { MAP[i] = (r + ' ').slice(0, COLS); }
  });
  var MAP0 = MAP.slice();                     // 原始关卡（重开时恢复问号砖）

  var G = 1500, JUMP = -520, RUN = 170;      // 重力 / 起跳 / 跑速（像素每秒）
  var state, hero, lives, coins, enemies, pops, camX, invuln, hurtFlash;

  function cellAt(cx, cy) {
    if (cx < 0 || cx >= COLS) return '#';               // 左右边界当墙
    if (cy < 0) return ' ';
    if (cy >= ROWS) return ' ';
    return MAP[cy][cx];
  }
  function solid(cx, cy) {
    var c = cellAt(cx, cy);
    return c === '#' || c === 'I' || c === '?';
  }

  function reset() {
    state = 'idle'; lives = 3; coins = 0; invuln = 0; hurtFlash = 0;
    hero = { x: 2 * TS, y: 11 * TS, w: 16, h: 20, vx: 0, vy: 0, onGround: false, face: 1, anim: 0 };
    enemies = []; pops = [];
    MAP = MAP0.slice();                        // 恢复原始关卡
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      if (MAP[y][x] === 'E') enemies.push({ x: x * TS + 4, y: (y + 1) * TS - 14, w: 16, h: 14, dir: -1, squash: 0 });
    }
    used = {};
    camX = 0;
  }
  var used = {};                                  // 'cx,cy' → 问号砖已顶过
  reset();

  /* ---------- 输入 ---------- */
  var keys = {};
  function inView() {
    var r = canvas.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }
  window.addEventListener('keydown', function (e) {
    var k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'a', 'd', 'w', 'A', 'D', 'W', ' '].indexOf(k) >= 0 && inView()) e.preventDefault();
    keys[k === ' ' ? 'space' : k.toLowerCase()] = true;
    if ((k === ' ' || k.toLowerCase() === 'w' || k === 'ArrowUp') && (state === 'idle' || state === 'over' || state === 'win')) start();
  });
  window.addEventListener('keyup', function (e) { keys[(e.key === ' ' ? 'space' : e.key.toLowerCase())] = false; });
  canvas.addEventListener('pointerdown', function () { if (state !== 'play') start(); });

  function start() {
    reset(); state = 'play';
    var btn = document.getElementById('platformStart');
    if (btn) { btn.textContent = '🔄 重新开始'; btn.classList.remove('primary'); }
  }

  /* ---------- 物理 ---------- */
  function moveHero(dt) {
    var dir = (keys['arrowright'] || keys['d'] ? 1 : 0) - (keys['arrowleft'] || keys['a'] ? 1 : 0);
    hero.vx = dir * RUN;
    if (dir) { hero.face = dir; hero.anim += dt * 10; }
    if ((keys['space'] || keys['arrowup'] || keys['w']) && hero.onGround) hero.vy = JUMP;
    hero.vy += G * dt;
    if (hero.vy > 560) hero.vy = 560;

    // 水平移动 + 碰撞
    hero.x += hero.vx * dt;
    var hw = hero.w / 2, hh = hero.h / 2;
    var top = Math.floor((hero.y - hh) / TS), bot = Math.floor((hero.y + hh - 1) / TS);
    if (hero.vx > 0) {
      var cx = Math.floor((hero.x + hw) / TS);
      for (var y = top; y <= bot; y++) if (solid(cx, y)) { hero.x = cx * TS - hw - .01; hero.vx = 0; break; }
    } else if (hero.vx < 0) {
      var cx0 = Math.floor((hero.x - hw) / TS);
      for (y = top; y <= bot; y++) if (solid(cx0, y)) { hero.x = (cx0 + 1) * TS + hw + .01; hero.vx = 0; break; }
    }

    // 垂直移动 + 碰撞（落在平台上 / 撞头）
    hero.y += hero.vy * dt;
    hero.onGround = false;
    var left = Math.floor((hero.x - hw) / TS), right = Math.floor((hero.x + hw - 1) / TS);
    if (hero.vy > 0) {
      var cy = Math.floor((hero.y + hh) / TS);
      for (var x = left; x <= right; x++) if (solid(x, cy)) { hero.y = cy * TS - hh - .01; hero.vy = 0; hero.onGround = true; break; }
    } else if (hero.vy < 0) {
      var cy0 = Math.floor((hero.y - hh) / TS);
      for (x = left; x <= right; x++) if (solid(x, cy0)) {
        hero.y = (cy0 + 1) * TS + hh + .01; hero.vy = 0;
        bump(x, cy0); break;                      // 撞头 → 试试顶砖
      }
    }

    if (invuln > 0) invuln -= dt;
    if (hurtFlash > 0) hurtFlash -= dt;

    // 吃金币
    var mcx = Math.floor(hero.x / TS), mcy = Math.floor((hero.y - 6) / TS);
    [[mcx, mcy], [mcx, mcy - 1], [mcx + 1, mcy], [mcx - 1, mcy]].forEach(function (p) {
      if (cellAt(p[0], p[1]) === 'c') {
        setCell(p[0], p[1], ' '); coins++;
        pops.push({ x: p[0] * TS + 12, y: p[1] * TS + 6, t: .8 });
      }
    });

    // 终点旗
    if (Math.abs(hero.x - (flagX() * TS + 12)) < 14 && hero.y > 10 * TS) { state = 'win'; }

    // 掉坑
    if (hero.y > H + 40) loseLife(true);
  }
  function flagX() {
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) if (MAP[y][x] === 'F') return x;
    return 38;
  }
  function setCell(cx, cy, ch) {
    MAP[cy] = MAP[cy].slice(0, cx) + ch + MAP[cy].slice(cx + 1);
  }
  function bump(cx, cy) {
    if (cellAt(cx, cy) !== '?') return;
    setCell(cx, cy, 'I'); used[cx + ',' + cy] = true;
    coins++;
    pops.push({ x: cx * TS + 12, y: cy * TS - 6, t: .8 });
  }
  function loseLife(pit) {
    lives--;
    if (lives <= 0) { state = 'over'; return; }
    invuln = 1.6; hurtFlash = .3;
    if (pit) { hero.x = 2 * TS; hero.y = 11 * TS; hero.vx = 0; hero.vy = 0; }
    else { hero.vy = -220; hero.vx = -hero.face * 130; }
  }

  function moveEnemies(dt) {
    enemies.forEach(function (e) {
      if (e.squash > 0) { e.squash -= dt; return; }
      e.x += e.dir * 42 * dt;
      var frontCx = Math.floor((e.x + (e.dir > 0 ? e.w + 2 : -2)) / TS);
      var footCy = Math.floor((e.y + e.h + 2) / TS);
      var bodyCy = Math.floor((e.y + e.h / 2) / TS);
      if (solid(frontCx, bodyCy) || !solid(frontCx, footCy)) e.dir = -e.dir;   // 撞墙或前方是悬崖 → 调头
      // 与小勇者
      if (state === 'play' && Math.abs(hero.x - (e.x + e.w / 2)) < hero.w / 2 + e.w / 2 - 3 &&
          hero.y + hero.h / 2 > e.y && hero.y - hero.h / 2 < e.y + e.h) {
        if (hero.vy > 60 && (hero.y + hero.h / 2) - e.y < 12) { e.squash = .5; hero.vy = -300; }
        else if (invuln <= 0) loseLife(false);
      }
    });
    enemies = enemies.filter(function (e) { return e.squash === undefined || e.squash > -0.4; });
    pops.forEach(function (p) { p.t -= dt; p.y -= 40 * dt; });
    pops = pops.filter(function (p) { return p.t > 0; });
  }

  function step(dt) {
    if (state !== 'play') return;
    moveHero(dt);
    moveEnemies(dt);
    camX = Math.max(0, Math.min(LW - W, hero.x - 200));
  }

  /* ---------- 绘制 ---------- */
  function drawTile(ch, x, y, cx, cy) {
    if (ch === '#') {                                    // 地面砖：草皮 + 泥土
      ctx.fillStyle = '#7c5a3a'; ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = '#2ecc71'; ctx.fillRect(x, y, TS, 6);
      ctx.fillStyle = '#7ee0a8'; ctx.fillRect(x, y, TS, 2);
      ctx.fillStyle = '#5d4429'; ctx.fillRect(x, y + TS - 3, TS, 3);
      ctx.fillStyle = '#9c7350'; ctx.fillRect(x + 6, y + 12, 4, 4); ctx.fillRect(x + 15, y + 17, 4, 4);
    } else if (ch === 'I') {                             // 铁砖
      ctx.fillStyle = used[cx + ',' + cy] ? '#7f8c8d' : '#95a5a6';
      ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = '#c8d6d9'; ctx.fillRect(x, y, TS, 3); ctx.fillRect(x, y, 3, TS);
      ctx.fillStyle = '#6c7a7d'; ctx.fillRect(x, y + TS - 3, TS, 3); ctx.fillRect(x + TS - 3, y, 3, TS);
      if (!used[cx + ',' + cy]) { ctx.fillStyle = '#4d5656'; ctx.fillRect(x + 3, y + 3, 3, 3); ctx.fillRect(x + TS - 6, y + TS - 6, 3, 3); }
    } else if (ch === '?') {                             // 问号砖
      ctx.fillStyle = '#f5a623'; ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = '#f8d347'; ctx.fillRect(x, y, TS, 3); ctx.fillRect(x, y, 3, TS);
      ctx.fillStyle = '#b17614'; ctx.fillRect(x, y + TS - 3, TS, 3); ctx.fillRect(x + TS - 3, y, 3, TS);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
      ctx.fillText('?', x + TS / 2, y + TS / 2 + 6); ctx.textAlign = 'left';
      ctx.fillStyle = '#b17614';
      ctx.fillRect(x + 3, y + 3, 3, 3); ctx.fillRect(x + TS - 6, y + 3, 3, 3);
      ctx.fillRect(x + 3, y + TS - 6, 3, 3); ctx.fillRect(x + TS - 6, y + TS - 6, 3, 3);
    } else if (ch === 'c') {                             // 金币
      ctx.fillStyle = '#f8d347'; ctx.fillRect(x + 6, y + 4, 12, 16);
      ctx.fillStyle = '#fce58a'; ctx.fillRect(x + 9, y + 7, 6, 10);
      ctx.fillStyle = '#b18f1c'; ctx.fillRect(x + 11, y + 9, 2, 6);
    } else if (ch === 'F') {                             // 终点旗
      ctx.fillStyle = '#95a5a6'; ctx.fillRect(x + 10, y - 34, 4, 34 + 20);
      ctx.fillStyle = '#c8d6d9'; ctx.fillRect(x + 10, y - 34, 2, 34 + 20);
      ctx.fillStyle = '#f8d347'; ctx.fillRect(x + 8, y - 40, 8, 8);
      ctx.fillStyle = '#e74c3c';
      for (var i = 0; i < 5; i++) ctx.fillRect(x + 14, y - 32 + i * 4, 22 - i * 4, 4);
      ctx.fillStyle = '#6c7a7d'; ctx.fillRect(x + 2, y + 14, 20, 6);
    }
  }
  function drawHero() {
    var x = hero.x - 8 - camX, y = hero.y - 10;
    if (invuln > 0 && Math.floor(invuln * 12) % 2 === 0) return;   // 无敌闪烁
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(x + 2, y, 12, 3);      // 帽子
    ctx.fillStyle = '#c0392b'; ctx.fillRect(x, y + 3, 16, 2);
    ctx.fillStyle = '#f6c9a0'; ctx.fillRect(x + 2, y + 5, 12, 5);  // 脸
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x + 4, y + 6, 2, 2); ctx.fillRect(x + 10, y + 6, 2, 2);
    ctx.fillStyle = '#4a90d9'; ctx.fillRect(x + 2, y + 10, 12, 6); // 身体
    ctx.fillStyle = '#2f6bb0'; ctx.fillRect(x + 2, y + 14, 12, 2);
    var leg = hero.onGround && Math.abs(hero.vx) > 10 ? Math.floor(hero.anim) % 2 : 0;
    ctx.fillStyle = '#2f6bb0';                                     // 腿
    if (leg === 0) { ctx.fillRect(x + 2, y + 16, 4, 3); ctx.fillRect(x + 10, y + 16, 4, 3); }
    else { ctx.fillRect(x, y + 16, 5, 3); ctx.fillRect(x + 11, y + 16, 5, 3); }
    ctx.fillStyle = '#7c5a3a';                                     // 鞋
    ctx.fillRect(x + (leg === 0 ? 2 : 0), y + 19, leg === 0 ? 4 : 5, 1);
    ctx.fillRect(x + (leg === 0 ? 10 : 11), y + 19, leg === 0 ? 4 : 5, 1);
  }
  function drawEnemy(e) {
    var x = e.x - camX, y = e.y;
    if (e.squash > 0) {                                            // 被踩扁
      ctx.fillStyle = '#c0392b'; ctx.fillRect(x, y + e.h - 6, e.w, 6);
      ctx.fillStyle = '#f8e3c0'; ctx.fillRect(x + 3, y + e.h - 4, e.w - 6, 3);
      return;
    }
    var f = Math.floor(performance.now() / 200) % 2;
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(x + 1, y, e.w - 2, 7); // 蘑菇顶
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y + 2, 3, 3); ctx.fillRect(x + 10, y + 2, 3, 3);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(x, y + 7, e.w, 2);
    ctx.fillStyle = '#f8e3c0'; ctx.fillRect(x + 1, y + 9, e.w - 2, 3); // 脸
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(x + 4, y + 9, 2, 3); ctx.fillRect(x + 10, y + 9, 2, 3);
    ctx.fillStyle = '#5d4429';                                     // 脚
    if (f === 0) { ctx.fillRect(x, y + 12, 6, 2); ctx.fillRect(x + 10, y + 12, 6, 2); }
    else { ctx.fillRect(x + 1, y + 12, 6, 2); ctx.fillRect(x + 9, y + 12, 6, 2); }
  }

  function draw() {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    // 天空 + 太阳（不动）+ 远山 / 白云（视差）
    ctx.fillStyle = '#bfe6f7'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f8d347'; ctx.fillRect(404, 36, 26, 26);
    ctx.fillStyle = '#fce58a'; ctx.fillRect(410, 42, 14, 14);
    var hx = -(camX * .3) % (W + 160);
    ctx.fillStyle = '#a9dfbf';
    ctx.fillRect(30 + hx, 252, 130, 20); ctx.fillRect(260 + hx, 256, 160, 16);
    ctx.fillStyle = '#7dcea0'; ctx.fillRect(0, 270, W, 90);
    ctx.fillStyle = '#5aa46f'; ctx.fillRect(0, 286, W, 74);
    var cx2 = -(camX * .5) % (W + 120);
    ctx.fillStyle = '#fff';
    ctx.fillRect(50 + cx2, 46, 56, 12); ctx.fillRect(58 + cx2, 38, 32, 8);
    ctx.fillRect(270 + cx2, 66, 64, 12); ctx.fillRect(278 + cx2, 58, 40, 8);

    // 瓦片
    var c0 = Math.floor(camX / TS);
    for (var y = 0; y < ROWS; y++) for (var x = c0; x <= c0 + W / TS + 1 && x < COLS; x++) {
      var ch = MAP[y][x];
      if (ch !== ' ') drawTile(ch, x * TS - camX, y * TS, x, y);
    }
    enemies.forEach(drawEnemy);
    if (state !== 'over') drawHero();
    // +1 飘字
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
    pops.forEach(function (p) { ctx.fillText('+1', p.x - camX, p.y); });
    ctx.textAlign = 'left';

    // HUD
    ctx.fillStyle = 'rgba(20,40,30,.75)'; ctx.fillRect(8, 8, 170, 26);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('金币 ' + coins + '   生命 ' + '❤'.repeat(Math.max(0, lives)), 16, 26);
    if (hurtFlash > 0) { ctx.fillStyle = 'rgba(231,76,60,.25)'; ctx.fillRect(0, 0, W, H); }

    if (state === 'idle') overlay('跳跳冒险 · 试玩', '←→/AD 跑动，空格/↑ 跳跃', '踩扁蘑菇 · 顶问号砖 · 摸到旗子过关');
    else if (state === 'win') overlay('过关啦！', '收集金币 ' + coins + ' 枚，剩 ' + lives + ' 条命', '按空格再跑一趟');
    else if (state === 'over') overlay('生命用完了', '共收集金币 ' + coins + ' 枚', '按空格重新出发');
  }
  function overlay(title, sub, hint) {
    ctx.fillStyle = 'rgba(10,18,14,.66)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(title, W / 2, 150);
    ctx.font = '15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(sub, W / 2, 180);
    ctx.font = '13px "PingFang SC", sans-serif';
    ctx.fillText(hint, W / 2, 208);
    ctx.textAlign = 'left';
  }

  /* ---------- 主循环 ---------- */
  var last = 0;
  function loop(now) {
    var dt = last ? Math.min((now - last) / 1000, 0.033) : 0;
    last = now;
    step(dt); draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  var btn = document.getElementById('platformStart');
  if (btn) btn.addEventListener('click', start);
})();
