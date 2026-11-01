/* ============================================================
   网页版坦克大战 — 第 ⑧ 门课成品试玩（双人对战）。480×360。
   绿坦克：W A S D 移动 + 空格开炮；蓝坦克：方向键移动 + 回车开炮。
   土墙能打碎，钢墙打不动；先赢两局的一方获胜。
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('tankCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 480, H = 360, SCALE = canvas.width / W, TS = 24, COLS = 20, ROWS = 15;

  /* 地图：O 钢墙（打不动）  # 土墙（能打碎）  . 空地 */
  var MAP0 = [
    'OOOOOOOOOOOOOOOOOOOO',
    'O..................O',
    'O.##.##....##.##...O',
    'O.#..............#.O',
    'O...O...####...O...O',
    'O..................O',
    'O.##..O......O..##.O',
    'O.##..........##...O',
    'O.##..O......O..##.O',
    'O..................O',
    'O...O...####...O...O',
    'O.#..............#.O',
    'O.##.##....##.##...O',
    'O..................O',
    'OOOOOOOOOOOOOOOOOOOO',
  ];
  var map;                                    // 每局重建
  function cellAt(cx, cy) {
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return 'O';
    return map[cy][cx];
  }
  function setCell(cx, cy, ch) {
    map[cy] = map[cy].slice(0, cx) + ch + map[cy].slice(cx + 1);
  }

  var state, count, p1, p2, bullets, booms, sparks, wins, roundWinner;
  var SPEED = 85, BSPD = 250, COOL = .4;

  function mkTank(color, x, y, dir) {
    return { color: color, x: x, y: y, dir: dir, hp: 3, invuln: 0, cool: 0, dead: 0 };
  }
  function resetRound() {
    map = MAP0.slice();
    p1 = mkTank('green', 1 * TS + 12, 12 * TS + 12, 'up');
    p2 = mkTank('blue', 18 * TS + 12, 2 * TS + 12, 'down');
    bullets = []; booms = []; sparks = [];
    count = 2.2; state = 'count';
  }
  function resetMatch() { wins = { green: 0, blue: 0 }; roundWinner = null; resetRound(); state = 'idle'; }
  resetMatch();

  /* ---------- 输入 ---------- */
  var keys = {};
  var P1KEYS = { w: 'up', s: 'down', a: 'left', d: 'right', ' ': 'fire1' };
  var P2KEYS = { ArrowUp: 'up2', ArrowDown: 'down2', ArrowLeft: 'left2', ArrowRight: 'right2', Enter: 'fire2' };
  function inView() {
    var r = canvas.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }
  window.addEventListener('keydown', function (e) {
    if ((P1KEYS[e.key] || P2KEYS[e.key]) && inView()) e.preventDefault();
    keys[e.key] = true;
    if (state === 'match' && (e.key === ' ' || e.key === 'Enter')) start();
  });
  window.addEventListener('keyup', function (e) { keys[e.key] = false; });
  canvas.addEventListener('pointerdown', function () { if (state === 'idle') start(); });

  function start() {
    resetMatch(); state = 'count';
    var btn = document.getElementById('tankStart');
    if (btn) { btn.textContent = '🔄 重新开局'; btn.classList.remove('primary'); }
  }

  var DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function snap(v) { return Math.round((v - TS / 2) / TS) * TS + TS / 2; }   // 对齐车道中心

  function moveTank(t, want, dt) {
    if (!want) return;
    var v = DIRV[want];
    // 转向时把另一根轴吸附到车道中心，方便钻砖缝
    if (v[0] === 0) t.x = snap(t.x); else t.y = snap(t.y);
    if (t.dir !== want) { t.dir = want; }
    t.x += v[0] * SPEED * dt;
    t.y += v[1] * SPEED * dt;
    // 撞墙夹住（半宽 9 的方块）
    var hw = 9;
    var top = Math.floor((t.y - hw) / TS), bot = Math.floor((t.y + hw - 1) / TS);
    var left = Math.floor((t.x - hw) / TS), right = Math.floor((t.x + hw - 1) / TS);
    var solid = function (c) { return c === 'O' || c === '#'; };
    if (v[0] > 0 && (solid(cellAt(right, top)) || solid(cellAt(right, bot)))) t.x = right * TS - hw - .01;
    if (v[0] < 0 && (solid(cellAt(left, top)) || solid(cellAt(left, bot)))) t.x = (left + 1) * TS + hw + .01;
    if (v[1] > 0 && (solid(cellAt(left, bot)) || solid(cellAt(right, bot)))) t.y = bot * TS - hw - .01;
    if (v[1] < 0 && (solid(cellAt(left, top)) || solid(cellAt(right, top)))) t.y = (top + 1) * TS + hw + .01;
  }

  function fire(t, owner) {
    if (t.cool > 0) return;
    if (bullets.some(function (b) { return b.owner === owner; })) return;    // 同屏一发
    var v = DIRV[t.dir];
    bullets.push({ x: t.x + v[0] * 14, y: t.y + v[1] * 14, vx: v[0] * BSPD, vy: v[1] * BSPD, owner: owner });
    t.cool = COOL;
  }

  function hitTank(b, t) {
    return Math.abs(b.x - t.x) < 13 && Math.abs(b.y - t.y) < 13;
  }

  function step(dt) {
    if (state === 'count') {
      count -= dt;
      if (count <= 0) state = 'play';
      return;
    }
    if (state !== 'play') return;

    // 双人输入
    var want1 = keys['w'] ? 'up' : keys['s'] ? 'down' : keys['a'] ? 'left' : keys['d'] ? 'right' : null;
    var want2 = keys['ArrowUp'] ? 'up' : keys['ArrowDown'] ? 'down' : keys['ArrowLeft'] ? 'left' : keys['ArrowRight'] ? 'right' : null;
    moveTank(p1, want1, dt); moveTank(p2, want2, dt);
    if (keys[' ']) fire(p1, 1);
    if (keys['Enter']) fire(p2, 2);
    p1.cool -= dt; p2.cool -= dt;
    if (p1.invuln > 0) p1.invuln -= dt;
    if (p2.invuln > 0) p2.invuln -= dt;

    // 子弹
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      var cx = Math.floor(b.x / TS), cy = Math.floor(b.y / TS);
      var c = cellAt(cx, cy);
      if (c === '#') { setCell(cx, cy, '.'); sparks.push({ x: b.x, y: b.y, t: .25 }); bullets.splice(i, 1); continue; }
      if (c === 'O') { sparks.push({ x: b.x, y: b.y, t: .25 }); bullets.splice(i, 1); continue; }
      var other = b.owner === 1 ? p2 : p1;
      if (!other.dead && hitTank(b, other)) {
        bullets.splice(i, 1);
        if (other.invuln <= 0) {
          other.hp--; other.invuln = .7;
          if (other.hp <= 0) {
            other.dead = 1;
            booms.push({ x: other.x, y: other.y, t: .8 });
            roundWinner = b.owner === 1 ? 'green' : 'blue';
            wins[roundWinner]++;
            state = 'roundover';
          }
        }
      }
    }
    if (state === 'roundover') {
      booms.forEach(function (e) { e.t -= dt; });
      // 稍作停顿进入下一局 / 结束
      setTimeout(function () {
        if (wins[roundWinner] >= 2) state = 'match';
        else resetRound();
      }, 1400);
      state = 'wait';
    }
    if (state === 'wait') {
      booms.forEach(function (e) { e.t -= dt; });
      return;
    }
    sparks.forEach(function (s) { s.t -= dt; });
    sparks = sparks.filter(function (s) { return s.t > 0; });
  }

  /* ---------- 绘制 ---------- */
  var GREEN = { body: '#27ae60', dark: '#1e8449', light: '#52be80' };
  var BLUE = { body: '#4a90d9', dark: '#2f6bb0', light: '#7fb3e8' };

  function drawWall(ch, x, y) {
    if (ch === 'O') {
      ctx.fillStyle = '#95a5a6'; ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = '#c8d6d9'; ctx.fillRect(x, y, TS, 3); ctx.fillRect(x, y, 3, TS);
      ctx.fillStyle = '#6c7a7d'; ctx.fillRect(x, y + TS - 3, TS, 3); ctx.fillRect(x + TS - 3, y, 3, TS);
      ctx.fillStyle = '#4d5656'; ctx.fillRect(x + 4, y + 4, 3, 3); ctx.fillRect(x + TS - 7, y + TS - 7, 3, 3);
    } else if (ch === '#') {
      ctx.fillStyle = '#a0703c'; ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = '#c49a6c'; ctx.fillRect(x, y, TS, 2);
      ctx.fillStyle = '#7c5a3a';
      ctx.fillRect(x, y + 10, TS, 3); ctx.fillRect(x + TS - 3, y, 3, 10); ctx.fillRect(x + 10, y + 13, 3, 11);
      ctx.fillStyle = '#5d4429'; ctx.fillRect(x, y + TS - 2, TS, 2);
    }
  }
  function drawTank(t) {
    if (t.dead) return;
    if (t.invuln > 0 && Math.floor(t.invuln * 14) % 2 === 0) return;   // 受击闪烁
    var col = t.color === 'green' ? GREEN : BLUE;
    var x = t.x - 11, y = t.y - 11, v = DIRV[t.dir];
    // 履带（左右/上下两道）
    ctx.fillStyle = '#2c3e50';
    if (v[0] === 0) { ctx.fillRect(x, y + 3, 5, 16); ctx.fillRect(x + 17, y + 3, 5, 16); }
    else { ctx.fillRect(x + 3, y, 16, 5); ctx.fillRect(x + 3, y + 17, 16, 5); }
    ctx.fillStyle = '#576574';
    var tread = Math.floor(performance.now() / 120) % 2;
    if (v[0] === 0) { ctx.fillRect(x, y + 5 + tread * 4, 5, 3); ctx.fillRect(x + 17, y + 9 - tread * 4, 5, 3); }
    else { ctx.fillRect(x + 5 + tread * 4, y, 3, 5); ctx.fillRect(x + 9 - tread * 4, y + 17, 3, 5); }
    // 车身 + 炮塔 + 炮管
    ctx.fillStyle = col.body; ctx.fillRect(x + 5, y + 5, 12, 12);
    ctx.fillStyle = col.dark; ctx.fillRect(x + 5, y + 13, 12, 4);
    ctx.fillStyle = col.light; ctx.fillRect(x + 7, y + 7, 8, 3);
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(t.x - 2 + v[0] * 10, t.y - 2 + v[1] * 10, 4 + Math.abs(v[0]) * 4, 4 + Math.abs(v[1]) * 4);
    // 血条
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(x + 1, y - 6, 20, 4);
    ctx.fillStyle = t.color === 'green' ? '#2ecc71' : '#4a90d9';
    for (var i = 0; i < t.hp; i++) ctx.fillRect(x + 2 + i * 6, y - 5, 5, 2);
  }

  function draw() {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = '#232b23'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2c362c';
    for (var x = 0; x <= W; x += TS) { ctx.fillRect(x, 0, 1, H); }
    for (var y = 0; y <= H; y += TS) { ctx.fillRect(0, y, W, 1); }
    ctx.fillStyle = '#39443a';
    ctx.fillRect(96, 96, 4, 4); ctx.fillRect(240, 48, 4, 4); ctx.fillRect(384, 264, 4, 4); ctx.fillRect(144, 288, 4, 4);
    for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
      if (cellAt(x, y) !== '.') drawWall(cellAt(x, y), x * TS, y * TS);
    }
    // 子弹
    bullets.forEach(function (b) {
      ctx.fillStyle = '#f8d347'; ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
      ctx.fillStyle = '#fff'; ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
    });
    // 火花（打墙）
    sparks.forEach(function (s) {
      ctx.fillStyle = s.t > .12 ? '#fff' : '#f5a623';
      ctx.fillRect(s.x - 5, s.y - 5, 10, 10);
    });
    // 爆炸（两帧交替）
    booms.forEach(function (e) {
      var big = Math.floor(e.t * 10) % 2 === 0;
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(e.x - (big ? 16 : 12), e.y - (big ? 16 : 12), (big ? 32 : 24), (big ? 32 : 24));
      ctx.fillStyle = '#f5a623';
      ctx.fillRect(e.x - (big ? 11 : 8), e.y - (big ? 11 : 8), (big ? 22 : 16), (big ? 22 : 16));
      ctx.fillStyle = big ? '#fff' : '#f8d347';
      ctx.fillRect(e.x - 5, e.y - 5, 10, 10);
    });

    drawTank(p1); drawTank(p2);

    // HUD
    ctx.fillStyle = 'rgba(20,30,20,.8)'; ctx.fillRect(W / 2 - 110, 6, 220, 26);
    ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left'; ctx.fillText('绿 ' + wins.green, W / 2 - 100, 24);
    ctx.fillStyle = '#fff'; ctx.fillText(':', W / 2 - 6, 24);
    ctx.fillStyle = '#7fb3e8'; ctx.fillText(wins.blue + ' 蓝', W / 2 + 16, 24);
    ctx.textAlign = 'left';

    if (state === 'idle') {
      overlay('坦克大战 · 双人试玩', '绿：WASD 移动 + 空格开炮', '蓝：方向键移动 + 回车开炮 · 先胜两局');
    } else if (state === 'count') {
      ctx.fillStyle = 'rgba(10,18,14,.5)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = 'bold 44px "PingFang SC", sans-serif';
      ctx.fillText(count > 1.4 ? '3' : count > .7 ? '2' : '1', W / 2, H / 2);
      ctx.font = '16px "PingFang SC", sans-serif';
      ctx.fillText('准备……', W / 2, H / 2 + 36);
      ctx.textAlign = 'left';
    } else if (state === 'match') {
      var wn = wins.green >= 2 ? '绿方' : '蓝方';
      ctx.fillStyle = wins.green >= 2 ? GREEN.body : BLUE.body;
      ctx.font = 'bold 26px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(wn + '获胜！', W / 2, 150);
      ctx.fillStyle = '#fff'; ctx.font = '15px "PingFang SC", sans-serif';
      ctx.fillText('比分 绿 ' + wins.green + ' : ' + wins.blue + ' 蓝', W / 2, 178);
      ctx.fillText('按空格 / 回车再战一场', W / 2, 204);
      ctx.textAlign = 'left';
    }
  }
  function overlay(a, b, c) {
    ctx.fillStyle = 'rgba(10,18,14,.66)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(a, W / 2, 146);
    ctx.font = '15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(b, W / 2, 176); ctx.fillText(c, W / 2, 200);
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

  var btn = document.getElementById('tankStart');
  if (btn) btn.addEventListener('click', start);
})();
