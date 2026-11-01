# -*- coding: utf-8 -*-
"""
生成讲义 PPT：从 页面/handbook-<游戏>.html 里的
<template class="deck-src"> 内容源，产出独立自包含的放映版
（放映版/deck-<游戏>.html，八门课见下方 DECKS 配置）。

- 双击即可打开放映（无需服务器、无外部资源引用；内嵌 scratchblocks 与中文语言包）
- 全屏舞台、无侧栏：方位感在每页页眉（讲义名 + 课号徽章），目录做成议程页
- 内容源改完后重跑本脚本即可再生成：python3 生成讲义PPT.py
"""
import hashlib
import pathlib
import re

ROOT = pathlib.Path(__file__).parent


def sha12(text):
    """源的短指纹：改没改、重跑没重跑，看这一个字段就够。"""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()[:12]


DECKS = [
    dict(src="页面/handbook-brick.html", out="放映版/deck-brick.html",
         accent="#d9544a", accent_dark="#e8776f", accent_soft="#fbe4e2", label="① 弹球打砖块 · 游戏课", title="弹球打砖块 · 讲义 · Scratch 冒险乐园",
         agenda_title="目录 · 5 次课", agenda="map"),
    dict(src="页面/handbook-flappy.html", out="放映版/deck-flappy.html",
         accent="#2b9bc8", accent_dark="#54b4dc", accent_soft="#dff0f7", label="② 飞扬的小鸟 · 游戏课", title="飞扬的小鸟 · 讲义 · Scratch 冒险乐园",
         agenda_title="目录 · 5 次课", agenda="map"),
    dict(src="页面/handbook-shooter.html", out="放映版/deck-shooter.html",
         accent="#5b6ee1", accent_dark="#8b97ec", accent_soft="#e5e8fb", label="③ 太空射击 · 游戏课", title="太空射击 · 讲义 · Scratch 冒险乐园",
         agenda_title="目录 · 5 次课", agenda="map"),
    dict(src="页面/handbook-snake.html", out="放映版/deck-snake.html",
         accent="#3f9142", accent_dark="#57a85b", accent_soft="#e3f0e2", label="④ 贪吃蛇 · 游戏课", title="贪吃蛇 · 讲义 · Scratch 冒险乐园",
         agenda_title="目录 · 5 次课", agenda="map"),
    dict(src="页面/handbook-tower.html", out="放映版/deck-tower.html",
         accent="#8e5ac8", accent_dark="#ab86d9", accent_soft="#f0e6fa", label="⑤ 城堡塔防 · 游戏课", title="城堡塔防 · 讲义 · Scratch 冒险乐园",
         agenda_title="目录 · 5 次课", agenda="map"),
    dict(src="页面/handbook-tetra.html", out="放映版/deck-tetra.html",
         accent="#1f9aa8", accent_dark="#43b6c2", accent_soft="#dff2f4", label="⑥ 俄罗斯方块 · 游戏课", title="俄罗斯方块 · 讲义 · Scratch 冒险乐园",
         agenda_title="目录 · 5 次课", agenda="map"),
    dict(src="页面/handbook-platform.html", out="放映版/deck-platform.html",
         accent="#d97e2b", accent_dark="#e89a55", accent_soft="#faeede", label="⑦ 跳跳冒险 · 游戏课", title="跳跳冒险 · 讲义 · Scratch 冒险乐园",
         agenda_title="目录 · 5 次课", agenda="map"),
    dict(src="页面/handbook-tank.html", out="放映版/deck-tank.html",
         accent="#5a7d8c", accent_dark="#7c99a6", accent_soft="#e2eaee", label="⑧ 坦克大战 · 游戏课", title="坦克大战 · 讲义 · Scratch 冒险乐园",
         agenda_title="目录 · 5 次课", agenda="map"),
]

ENGINE = r"""
(function () {
  'use strict';
  var doc = document;
  var deck = doc.querySelector('.deck');
  var slides = [].slice.call(deck.querySelectorAll('.slide'));
  var counter = doc.querySelector('.deck-count');
  var bar = doc.querySelector('.deck-progress');
  var cur = -1;

  function layout() {
    deck.style.setProperty('--ds', Math.min(innerWidth / 1920, innerHeight / 1080));
  }
  addEventListener('resize', layout);
  layout();

  function go(i, dir, force) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === cur && !force) return;
    deck.dataset.dir = dir || (i > cur ? 'next' : 'prev');
    if (cur >= 0) slides[cur].classList.remove('active');
    cur = i;
    slides[cur].classList.add('active');
    try { history.replaceState(null, '', '#' + (cur + 1)); } catch (e) {}
    counter.textContent = (cur + 1) + ' / ' + slides.length;
    bar.style.width = Math.round((cur + 1) / slides.length * 100) + '%';
  }
  /* 支持 #l1 / #b0 / #c1 这类课次锚点，也兼容老的纯数字页码 #12 */
  function indexOfAnchor(h) {
    if (!h) return -1;
    var el = doc.getElementById(h);
    if (!el) return -1;
    var s = el.classList && el.classList.contains('slide') ? el
          : (el.closest ? el.closest('.slide') : null);
    return s ? slides.indexOf(s) : -1;
  }
  function fromHash() {
    var h = (location.hash || '').slice(1), idx = -1;
    if (/^\d+$/.test(h)) idx = parseInt(h, 10) - 1;
    else idx = indexOfAnchor(h);
    go(idx >= 0 ? idx : 0, 'next', true);
  }

  doc.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    var k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].indexOf(k) >= 0) { e.preventDefault(); go(cur + 1, 'next'); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].indexOf(k) >= 0) { e.preventDefault(); go(cur - 1, 'prev'); }
    else if (k === 'Home') { e.preventDefault(); go(0, 'prev'); }
    else if (k === 'End') { e.preventDefault(); go(slides.length - 1, 'next'); }
    else if (k === 'f' || k === 'F') {
      try { doc.fullscreenElement ? doc.exitFullscreen() : doc.documentElement.requestFullscreen(); } catch (err) {}
    }
  });

  deck.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-deck]') : null;
    if (!b) return;
    go(cur + (b.getAttribute('data-deck') === 'next' ? 1 : -1));
  });
  doc.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var h = (a.getAttribute('href') || '').slice(1);
    var to = /^\d+$/.test(h) ? parseInt(h, 10) - 1 : indexOfAnchor(h);
    if (to < 0) return;
    e.preventDefault();
    go(to, to >= cur ? 'next' : 'prev');
  });

  /* 主题切换（与站点同一偏好键） */
  var tb = doc.querySelector('.theme-btn');
  if (tb) {
    var sync = function () { tb.textContent = doc.documentElement.dataset.theme === 'dark' ? '☀️ 亮色' : '🌙 暗色'; };
    tb.addEventListener('click', function () {
      var n = doc.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      doc.documentElement.dataset.theme = n;
      try { localStorage.setItem('scratch-theme', n); } catch (e) {}
      sync();
    });
    sync();
  }

  /* 积木图（仅内嵌了 scratchblocks 的讲义需要）。
     统一按 Scratch 3 外观渲染；步骤大卡（stepv）里的积木是页面主视觉，放大一档——
     但脚本越长行数越高，一律 2.1 会撑爆画布：按行数分桶降档。 */
  if (window.scratchblocks && window.__SB_ZH_CN) {
    try {
      window.scratchblocks.loadLanguages({ 'zh-cn': window.__SB_ZH_CN });
      [].slice.call(deck.querySelectorAll('section.stepv pre.blocks')).forEach(function (pre) {
        var ls = pre.textContent.replace(/\s+$/, '').split('\n');
        var units = function (t) { var u = 0; for (var i = 0; i < t.length; i++) u += t.charCodeAt(i) > 0x2e80 ? 2 : 1; return u; };
        var maxU = 0;
        ls.forEach(function (l) { maxU = Math.max(maxU, units(l)); });
        var lines = ls.length;
        pre.classList.add((lines >= 14) ? 'sb-xx' : (lines >= 12 || maxU >= 58) ? 'sb-xl' : (lines >= 8 || maxU >= 46) ? 'sb-lg' : 'sb-md');
      });
      window.scratchblocks.renderMatching('section:not(.stepv) pre.blocks', { languages: ['zh-cn', 'en'], style: 'scratch3' });
      window.scratchblocks.renderMatching('pre.blocks.sb-md', { languages: ['zh-cn', 'en'], style: 'scratch3', scale: 2.1 });
      window.scratchblocks.renderMatching('pre.blocks.sb-lg', { languages: ['zh-cn', 'en'], style: 'scratch3', scale: 1.7 });
      window.scratchblocks.renderMatching('pre.blocks.sb-xl', { languages: ['zh-cn', 'en'], style: 'scratch3', scale: 1.35 });
      window.scratchblocks.renderMatching('pre.blocks.sb-xx', { languages: ['zh-cn', 'en'], style: 'scratch3', scale: 1.0 });
    } catch (e) { console.warn('积木渲染失败', e); }
  }

  /* 手写页保底：内容超出画布（纵向或横向）时整体等比微缩（下限 0.8），
     仍不够则允许页内滚动。在积木图渲染之后执行，保证 SVG 尺寸已计入。
     绝对定位的子元素（如步骤页数字水印）不搬进缩放容器——
     搬进去会让它的定位参照从画布变成缩放层，水印就飞出屏幕了。 */
  [].slice.call(deck.querySelectorAll('.slide-body')).forEach(function (b) {
    var slide = b.closest('.slide');
    if (!slide || slide.classList.contains('cover') || slide.classList.contains('bridge')) return;
    var sh = b.scrollHeight, sw = b.scrollWidth;
    if (sh - b.clientHeight <= 2 && sw - b.clientWidth <= 2) return;
    var s = Math.min(1, (b.clientHeight - 8) / sh, (b.clientWidth - 4) / sw);
    var inner = doc.createElement('div');
    inner.className = 'fit-inner';
    inner.style.transformOrigin = 'top left';
    inner.style.width = (100 / Math.max(s, 0.01)) + '%';
    if (s >= 0.75) { inner.style.transform = 'scale(' + s + ')'; }
    else { inner.style.transform = 'scale(0.75)'; b.style.overflowY = 'auto'; b.style.justifyContent = 'flex-start'; }
    var kids = [].slice.call(b.children).filter(function (el) {
      return b.ownerDocument.defaultView.getComputedStyle(el).position !== 'absolute';
    });
    kids.forEach(function (el) { inner.appendChild(el); });
    b.appendChild(inner);
  });

  fromHash();
})();
"""

EXTRA_CSS = """
/* ---------- 讲义 PPT 专属（由 生成讲义PPT.py 注入） ---------- */
html, body { height: 100%; margin: 0; overflow: hidden; }
body { background: #101713; }               /* 16:9 之外的留边（亮暗通用深底） */
.deck { position: fixed; inset: 0; z-index: 0; background: transparent; overflow: hidden; }
/* 1920×1080 逻辑画布：整页等比缩放铺满窗口，窗口级永不出滚动条 */
.slide-canvas { width: 1920px; height: 1080px; border-radius: 0; box-shadow: 0 0 90px rgba(0, 0, 0, .38); }
/* 每页页眉左上角的讲义名（PPT 式方位感，代替侧栏目录） */
.sl-deck {
  font-size: 16px; font-weight: 700; letter-spacing: 2px; color: var(--ink-soft);
  white-space: nowrap; align-self: center; margin-right: 4px;
}
/* 议程页（目录做成一页，而不是常驻侧栏） */
.slide.agenda .slide-body { display: flex; flex-direction: column; justify-content: center; }
.agenda-list { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 30px; margin-top: 8px; }
.agenda-list a {
  display: flex; align-items: center; gap: 14px; background: var(--accent-soft);
  border-radius: 12px; padding: 12px 18px; text-decoration: none;
  color: var(--ink); font-size: 22px; font-weight: 600;
}
.agenda-list a:hover, .agenda-list a:active { filter: brightness(1.06); }
.agenda-list .ag-n {
  background: var(--green-600); color: #fff; border-radius: 8px;
  font-weight: 800; padding: 2px 12px; font-size: 19px; white-space: nowrap;
}
.deck-ui .deck-link { text-decoration: none; }
/* 垂直均衡：内容不满一页时在版心内垂直居中，消除"上挤下空"；
   内容超页时 justify 无效果，行为与顶排一致 */
.slide-body { display: flex; flex-direction: column; justify-content: center; }
.slide-body > * { flex: 0 0 auto; }
/* 1920 画布下正文相对偏小，上调一档保证投影可读 */
.slide-body p, .slide-body li { font-size: 28px; }
.slide-body ul, .slide-body ol { padding-left: 44px; }
.slide-body table { font-size: 22px; }
.slide-body th, .slide-body td { padding: 10px 14px; }
.slide-body pre { font-size: 20px; }
.slide-body blockquote { font-size: 25px; }
.slide-body .step-body .see { font-size: 21px; }
.slide-body code { font-size: .9em; }
"""

# 孩子看的视觉组件：精灵图 / 舞台示意图 / 一步一页大字卡 / 图元流程 / 闯关地图。
# 全部随 deck 注入，网页手册不使用这些类，互不影响。
EXTRA_CSS_VISUAL = """
/* ---------- 精灵图（svg 由脚本按 data-sp 内联，宽高比写死在行内样式） ---------- */
svg.sp { shape-rendering: crispEdges; display: inline-block; vertical-align: middle; height: 120px; width: auto; }
svg.sp-inl { height: 1.25em; vertical-align: -.25em; }
svg.sp-sm { height: 68px; }
svg.sp-md { height: 130px; }
svg.sp-lg { height: 190px; }
svg.sp-xl { height: 290px; }
svg.sp-fill { position: absolute; inset: 0; width: 100%; height: 100%; }
svg.sp-abs { position: absolute; }
svg.sp-tiny { height: 44px; }

/* ---------- 舞台示意图：林地背景 + 站位精灵 ---------- */
.sl-stage {
  position: relative; width: 620px; max-width: 100%; aspect-ratio: 4 / 3; flex: 0 0 auto;
  border-radius: 18px; overflow: hidden; border: 4px solid var(--line);
  background: #6faf57; box-shadow: var(--shadow);
}
/* 坐标网格（第 2/3 课）：盖在背景上、精灵之下 */
.sl-stage.grid::before {
  content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,.30) 2px, transparent 2px),
    linear-gradient(90deg, rgba(255,255,255,.30) 2px, transparent 2px);
  background-size: 12.5% 12.5%;
}
.sl-stage svg.sp-abs { z-index: 1; }
/* 舞台上的坐标/说明小标签 */
.sl-tag {
  position: absolute; z-index: 2; font-size: 21px; font-weight: 700; line-height: 1.25;
  background: rgba(15, 23, 18, .74); color: #fff; border-radius: 9px; padding: 4px 12px; white-space: nowrap;
}
.sl-ring { position: absolute; z-index: 1; border: 4px dashed rgba(255,255,255,.88); border-radius: 50%; }
.sl-stage .vis-cap { position: absolute; left: 0; right: 0; bottom: 10px; text-align: center; }

/* ---------- 一步一页的大字步骤卡：居中构图，巨号水印数字垫在右侧 ---------- */
.slide-body.stepv-body { flex-direction: column; justify-content: center; align-items: center; gap: 36px; position: relative; }
.stepv-side { position: absolute; right: 70px; top: 50%; transform: translateY(-50%); z-index: 0; }
.stepv-n { font-size: 460px; font-weight: 800; line-height: .85; color: var(--accent); opacity: .12; font-variant-numeric: tabular-nums; }
.stepv-main { position: relative; z-index: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 32px; max-width: 1460px; }
.stepv-say { font-size: 62px; font-weight: 800; line-height: 1.35; text-align: center; }
.slide.stepv pre.blocks { font-size: 30px; margin: 0; }
.slide.stepv pre.blocks svg { max-width: 100%; }
.stepv-see { font-size: 33px; font-weight: 700; background: var(--accent-soft); border-radius: 16px; padding: 18px 34px; text-align: center; }
/* 居中列里的弹性块会收缩到内容宽，给对比框和矩阵定宽，避免挤窄换行 */
.stepv-main .dual { width: 1120px; max-width: 100%; }
.stepv-main .matrix { width: 1000px; max-width: 100%; }

/* ---------- 独自跟做的连续性：积木抽屉提示 / 界面点击路径 / 素材配方色卡 ---------- */
/* 这块积木在哪个类别抽屉里（颜色用 Scratch 官方类别色） */
.sl-where { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 24px; color: var(--ink-soft); font-weight: 600; }
.sl-where .cat { color: #fff; border-radius: 8px; padding: 3px 14px; font-size: 22px; font-weight: 700; }
/* 编辑器里的点击路径，一步一步照着点 */
.sl-path { font-size: 24px; font-weight: 600; line-height: 1.6; background: var(--paper); border: 3px dashed var(--line); border-radius: 14px; padding: 14px 24px; }
.sl-path b { color: var(--accent); }
/* 素材配方：色卡 + 名称，照着涂 */
.r-sw { display: flex; align-items: flex-end; gap: 22px; }
.r-sw .r-c { display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 22px; font-weight: 700; }
.r-sw .r-c i { display: block; width: 70px; height: 70px; border-radius: 16px; border: 3px solid var(--ink-soft); }

/* ---------- 素材清单卡 ---------- */
.asset-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.asset-card {
  background: var(--paper); border: 3px solid var(--line); border-radius: 16px;
  padding: 18px 12px 14px; display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.asset-card .a-name { font-size: 23px; font-weight: 800; }
.asset-card .a-tag { font-size: 19px; font-weight: 700; border-radius: 999px; padding: 3px 16px; background: var(--accent-soft); color: var(--accent); }
.asset-card .a-tag.own { background: rgba(138, 90, 53, .18); color: #8a5a35; }
html[data-theme="dark"] .asset-card .a-tag.own { color: #e0b985; }

/* ---------- 开场/验收页分栏：左边话术提问，右边一张图 ---------- */
.sl-split { display: flex; gap: 60px; align-items: center; }
.sl-split .sl-split-txt { flex: 1 1 0; min-width: 0; }
.sl-split .sl-split-vis { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.vis-cap { font-size: 22px; color: var(--ink-soft); font-weight: 600; }
/* 开场的大字提问 */
.sl-ask.big { font-size: 38px; padding-left: 0; }
.sl-ask.big li { margin: 22px 0; }

/* ---------- 图元：盒子 + 箭头（流程 / 关系 / 对比） ---------- */
.dg { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
.dg-box {
  background: var(--paper); border: 3px solid var(--line); border-radius: 18px;
  padding: 16px 24px; text-align: center; font-size: 30px; font-weight: 800;
  box-shadow: var(--shadow); line-height: 1.4;
}
.dg-box small { display: block; font-size: 21px; color: var(--ink-soft); font-weight: 600; margin-top: 4px; }
.dg-box.ok { border-color: var(--green-500); background: var(--accent-soft); }
.dg-box.no { border-color: #d96a5f; background: rgba(217, 106, 95, .12); }
.dg-arr { font-size: 48px; color: var(--accent); font-weight: 800; position: relative; padding-top: 42px; line-height: 1; }
.dg-arr small { position: absolute; top: 0; left: 50%; transform: translateX(-50%); font-size: 21px; font-weight: 700; color: var(--ink-soft); white-space: nowrap; }

/* ---------- 课首「今天登场」阵容卡（左目标右阵容） ---------- */
.sl-goal-row { display: flex; gap: 70px; align-items: center; }
.sl-goal-col { flex: 1 1 0; min-width: 0; }
.sl-cast {
  display: flex; align-items: flex-end; gap: 30px; flex: 0 0 auto;
  background: var(--paper); border: 3px solid var(--line); border-bottom-width: 6px;
  border-radius: 20px; padding: 26px 30px 10px;
}
.cast-item { display: flex; flex-direction: column; align-items: center; gap: 10px; font-size: 22px; font-weight: 700; }
.cast-item .emo { font-size: 66px; line-height: 1; height: 130px; display: flex; align-items: flex-end; }
.cast-plus { font-size: 42px; color: var(--ink-soft); font-weight: 800; padding-bottom: 44px; }

/* ---------- 2×2 情况矩阵（第 6 课） ---------- */
.matrix { display: grid; grid-template-columns: repeat(2, minmax(240px, 1fr)); gap: 16px; }
.mx-cell { border: 3px solid var(--line); border-radius: 16px; padding: 14px 18px; font-size: 26px; font-weight: 700; text-align: center; line-height: 1.5; }
.mx-ok { border-color: var(--green-500); background: var(--accent-soft); }
.mx-no { border-color: #d96a5f; background: rgba(217, 106, 95, .12); }

/* ---------- 左右对比（两种做法/两种状态）：两栏恒等高 ---------- */
.dual { display: flex; gap: 34px; align-items: stretch; }
.dual .du {
  flex: 1; border: 3px dashed var(--line); border-radius: 22px; padding: 26px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
  font-size: 27px; font-weight: 700; text-align: center; min-height: 300px;
}
.dual .du .du-t { font-size: 30px; }
.dual .du.ok { border-style: solid; border-color: var(--green-500); }
.dual .du.no { border-style: solid; border-color: #d96a5f; }

/* ---------- 色卡（第 1 课填充色） ---------- */
.sw { display: inline-block; width: 46px; height: 46px; border-radius: 10px; border: 3px solid var(--ink-soft); vertical-align: -10px; margin: 0 4px; }

/* ---------- 桥页过关徽章 ---------- */
.sl-next-badge {
  display: inline-block; font-size: 28px; font-weight: 800; color: #fff;
  background: var(--green-600); border-radius: 999px; padding: 8px 28px; margin-bottom: 26px;
}

/* ---------- 故事章节绶带（课首） ---------- */
.story-strip { display: flex; align-items: center; gap: 18px; margin: 0 0 14px; }
.story-strip .st-badge { font-size: 19px; font-weight: 800; letter-spacing: 2px; color: #fff; background: #8a5a35; border-radius: 999px; padding: 7px 20px; white-space: nowrap; }
html[data-theme="dark"] .story-strip .st-badge { background: #6d4527; }
.story-strip .st-text { font-size: 23px; font-weight: 600; color: var(--ink-soft); line-height: 1.5; }

/* ---------- 概念卡：新概念第一次出现 ---------- */
.concept { display: flex; gap: 60px; align-items: center; }
.concept .cp-def { flex: 1 1 0; min-width: 0; }
.cp-kicker { font-size: 19px; font-weight: 800; letter-spacing: 3px; color: var(--accent); margin-bottom: 10px; }
.cp-title { font-size: 48px; font-weight: 800; line-height: 1.3; margin-bottom: 16px; }
.cp-analogy { font-size: 25px; background: var(--accent-soft); border-radius: 14px; padding: 14px 22px; font-weight: 600; line-height: 1.5; }
.cp-points { list-style: none; padding: 0; font-size: 24px; margin-top: 18px; }
.cp-points li { margin: 12px 0; padding-left: 42px; position: relative; line-height: 1.5; }
.cp-points li::before { content: "💡"; position: absolute; left: 0; }
.concept .cp-vis { flex: 0 0 auto; }

/* ---------- 实验室：改一个数，先猜再看 ---------- */
.lab-kicker { font-size: 19px; font-weight: 800; letter-spacing: 3px; color: var(--accent); margin-bottom: 8px; }
.lab-say { font-size: 42px; font-weight: 800; margin-bottom: 26px; }
.lab-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.lab-card { border: 3px solid var(--line); border-radius: 18px; padding: 20px 22px; background: var(--paper); display: flex; flex-direction: column; }
.lab-card .lb-do { font-size: 26px; font-weight: 800; margin-bottom: 12px; }
.lab-card .lb-guess { font-size: 22px; color: var(--ink-soft); margin-bottom: 12px; flex: 1; }
.lab-card .lb-why { font-size: 22px; font-weight: 700; color: var(--accent); border-top: 2px dashed var(--line); padding-top: 10px; }

/* ---------- 错误医院：症状 → 药方 ---------- */
.err-kicker { font-size: 19px; font-weight: 800; letter-spacing: 3px; color: #d9534f; margin-bottom: 8px; }
.err-say { font-size: 42px; font-weight: 800; margin-bottom: 24px; }
.err-row { display: flex; gap: 26px; margin-bottom: 18px; align-items: stretch; }
.err-box { flex: 1; border-radius: 18px; padding: 18px 24px; font-size: 24px; line-height: 1.5; }
.err-box.no { border: 3px solid #d96a5f; background: rgba(217, 106, 95, .10); }
.err-box.ok { border: 3px solid var(--green-500); background: var(--accent-soft); }
.err-box .eb-t { font-weight: 800; font-size: 27px; margin-bottom: 8px; }

/* ---------- 冒险日志（课后反思 + 自由改造，参考哈佛 circle-up/reflection） ---------- */
.log-kicker { font-size: 19px; font-weight: 800; letter-spacing: 3px; color: var(--accent); margin-bottom: 8px; }
.log-say { font-size: 42px; font-weight: 800; margin-bottom: 24px; }
.log-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 22px; }
.log-card { border: 3px solid var(--line); border-radius: 18px; padding: 20px 24px; background: var(--paper); font-size: 25px; font-weight: 600; line-height: 1.5; }
.log-card .lg-t { font-size: 30px; font-weight: 800; display: block; margin-bottom: 10px; }
.log-free { display: flex; align-items: center; gap: 18px; background: var(--accent-soft); border-radius: 16px; padding: 16px 26px; font-size: 25px; font-weight: 700; }
.log-free .emo { font-size: 44px; }

/* ---------- 加料站（CS First 式 Add-ons） ---------- */
.addon-kicker { font-size: 19px; font-weight: 800; letter-spacing: 3px; color: var(--accent); margin-bottom: 8px; }
.addon-say { font-size: 42px; font-weight: 800; margin-bottom: 24px; }
.addon-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.addon-card { border: 3px solid var(--line); border-radius: 18px; padding: 20px 22px; background: var(--paper); display: flex; flex-direction: column; }
.addon-card .ad-t { font-size: 27px; font-weight: 800; margin-bottom: 10px; }
.addon-card .ad-what { font-size: 22px; color: var(--ink-soft); margin-bottom: 12px; flex: 1; line-height: 1.5; }
.addon-card .ad-how { font-size: 22px; font-weight: 700; border-top: 2px dashed var(--line); padding-top: 10px; line-height: 1.6; }
.addon-card .ad-how .cat { margin: 0 2px; }

/* ---------- 技能星图（概念 × 课程，哈佛概念框架） ---------- */
.starmap { width: 100%; max-width: 1500px; }
.sm-row { display: grid; grid-template-columns: 300px repeat(var(--cols), 1fr); align-items: center; border-bottom: 2px solid var(--line); padding: 8px 0; }
.sm-row.sm-head { font-size: 20px; color: var(--ink-soft); font-weight: 700; }
.sm-row .sm-name { font-size: 24px; font-weight: 800; }
.sm-cell { text-align: center; font-size: 24px; }
.sm-cell.on { color: var(--green-600); }
.sm-new { color: #fff; background: var(--green-600); border-radius: 10px; padding: 1px 14px; font-weight: 800; display: inline-block; line-height: 1.5; }
.sm-legend { font-size: 20px; color: var(--ink-soft); margin-top: 16px; }

/* ---------- 效果与拆解：先看成品，再倒推（worked example / backwards design） ---------- */
.fx-wrap { display: flex; flex-direction: column; gap: 30px; }
.fx-sec { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: var(--ink-soft); }
.fx-vis { display: flex; gap: 26px; align-items: center; justify-content: center; }
.fx-ba { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.fx-ba .fx-cap { font-size: 22px; font-weight: 700; color: var(--ink-soft); }
.fx-arrow { font-size: 54px; color: var(--accent); font-weight: 800; }
.td-list { list-style: none; padding: 0; margin: 0; }
.td-item { display: flex; align-items: center; gap: 16px; font-size: 25px; margin: 11px 0; line-height: 1.45; }
.td-mark { flex: 0 0 96px; text-align: center; font-size: 19px; font-weight: 800; border-radius: 999px; padding: 4px 0; }
.td-mark.old { background: var(--accent-soft); color: var(--accent); }
.td-mark.new { background: var(--green-600); color: #fff; }
.td-name { font-weight: 800; }
.td-note { color: var(--ink-soft); font-size: 22px; }


/* ---------- 版式美化：页眉层级 / 桥页 / 结果条 / 舞台框 / 呼吸感 ---------- */
/* 页眉：课次徽章化 + 标题放大 + 底部分隔线，一眼看清“第几课·讲什么” */
.slide .sl-head {
  display: flex; align-items: center; gap: 16px;
  padding-bottom: 18px; margin-bottom: 8px;
  border-bottom: 2px solid var(--line);
}
.slide .sl-lesson {
  background: var(--accent); color: #fff; border-radius: 10px;
  padding: 6px 18px; font-size: 21px; font-weight: 800; letter-spacing: 1px;
  white-space: nowrap; flex: 0 0 auto;
}
html[data-theme="dark"] .slide .sl-lesson { color: #fff; }
.slide .sl-title { font-size: 36px; }
.slide .sl-deck { font-size: 15px; letter-spacing: 1.5px; }
/* 结果条：左侧色条 + 图标对齐，像“检查点” */
.stepv-see {
  border-left: 8px solid var(--accent); border-radius: 6px 16px 16px 6px;
  padding-left: 26px;
}
/* 舞台示意框：更清晰的“截图感” */
.sl-stage { box-shadow: 0 6px 24px rgba(20,40,25,.18), 0 0 0 6px rgba(255,255,255,.06); }
/* 桥页：大徽章 + 居中留白 + 底部装饰线 */
.slide.bridge .slide-body { gap: 10px; }
.slide.bridge .sl-next-badge {
  font-size: 22px; padding: 12px 36px; letter-spacing: 2px;
  box-shadow: 0 4px 18px rgba(20,40,25,.22);
}
.slide.bridge .sl-next-title { font-size: 50px; }
.slide.bridge .sl-next-why { max-width: 1000px; }
.slide.bridge .sl-next-why::after {
  content: ""; display: block; width: 120px; height: 4px; border-radius: 2px;
  background: var(--accent); margin: 26px auto 0; opacity: .5;
}
/* 小节标题：统一字距 */
.fx-sec, .lab-kicker, .addon-kicker, .err-kicker, .log-kicker, .cp-kicker { letter-spacing: 4px; }
/* 概念卡标题：色带下划 */
.cp-title { padding-bottom: 10px; border-bottom: 4px solid var(--accent-soft); display: inline-block; }
/* td/卡片：统一圆角阴影 */
.td-item { padding: 4px 6px; border-radius: 10px; }
.td-item:hover { background: var(--accent-soft); }
/* 进度条与翻页按钮跟主题色 */
.deck-progress { background: var(--accent); }
/* 解剖图五卡：图标放大 + 卡片等高 */
.lab-grid .lab-card { min-height: 220px; }
.lab-grid .lab-card .lb-do { font-size: 28px; }
/* 总结页技能行 hover */
.sm-row:hover { background: var(--accent-soft); border-radius: 8px; }

/* ---------- 议程闯关地图 ---------- */
.slide-body.map-body { align-items: center; }
.map { display: flex; flex-direction: column; gap: 46px; width: 100%; max-width: 1720px; }
.map-row { display: flex; justify-content: center; gap: 30px; }
.map-row-back { flex-direction: row-reverse; }
.map-node {
  position: relative; flex: 1 1 0; min-width: 0; max-width: 260px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  background: var(--paper); border: 3px solid var(--line); border-radius: 18px;
  padding: 20px 10px 16px; text-decoration: none; color: var(--ink);
  box-shadow: var(--shadow);
}
.map-node:hover { border-color: var(--accent); text-decoration: none; }
.map-node .map-n {
  position: absolute; top: -16px; left: -12px; background: var(--green-600); color: #fff;
  font-weight: 800; font-size: 22px; border-radius: 999px; min-width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center; padding: 0 9px;
  box-shadow: 0 2px 8px rgba(20, 40, 25, .3);
}
.map-node .map-ico { font-size: 54px; line-height: 1.25; }
.map-node .map-t { font-size: 22px; font-weight: 700; text-align: center; line-height: 1.35; }
.map-node.map-start, .map-node.map-end { background: var(--accent-soft); border-color: var(--green-500); }
.map-node.map-start .map-ico, .map-node.map-end .map-ico { font-size: 60px; }
/* 相邻关卡间的虚线小路 */
.map-node + .map-node::before {
  content: ""; position: absolute; top: 50%; left: -30px; width: 30px;
  border-top: 4px dashed var(--line);
}

/* ---------- 封面分栏 ---------- */
.slide.cover .slide-body.cover-hero { flex-direction: row; align-items: center; justify-content: center; gap: 90px; }
.cover-hero .cover-txt { max-width: 850px; }
.cover-hero .sl-stage { width: 680px; }
.cover-hero .sl-cover-kicker { font-size: 24px; }
.cover-hero .sl-cover-title { font-size: 78px; }
.cover-hero .sl-cover-desc { font-size: 27px; }
"""

HINT = ('← → / 空格 翻页 · Home / End 首末页 · F 全屏 · '
        '页码在右下角 · 完整课文见「📖 完整手册」')

# ---------- 精灵图：deck-src 里的 <i class="…" data-sp="名字"></i> 替换为内联 SVG ----------
# 素材按游戏分目录存放在 assets/sprites/<游戏>/，公用的在 assets/sprites/公用/；递归加载，deck 保持零外部资源、双击可放。
SPRITES_DIR = ROOT / "assets" / "sprites"


def load_sprites():
    sprites = {}
    for f in sorted(SPRITES_DIR.rglob("*.svg")):
        txt = f.read_text(encoding="utf-8")
        vb = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', txt)
        if not vb:
            raise SystemExit(f'assets/sprites/{f.name}: 缺少 viewBox')
        # 去掉根 svg 写死的宽高（只出现在文件最前面，动不到后面 rect 的属性），尺寸交给 CSS
        txt = re.sub(r'\s(width|height)="[^"]*"', '', txt, count=2)
        sprites[f.stem] = dict(txt=txt, ratio='%s/%s' % (vb.group(1), vb.group(2)))
    return sprites


SPRITES = load_sprites()


def inline_sprites(body):
    # <i> 标签上 data-sp 前后都可能有其他属性（定位 style 等），整个属性串要搬到 svg 上
    tag_re = re.compile(r'<i\b([^>]*?)\sdata-sp="([^"]+)"([^>]*)></i>')

    def repl(m):
        name = m.group(2)
        if name not in SPRITES:
            raise SystemExit(f'未知精灵图: {name}（assets/sprites/ 里没有同名 svg）')
        sp = SPRITES[name]
        attrs = (m.group(1) + ' ' + m.group(3))
        # class 合并；其余属性原样保留，宽高比并入 style，保证只设高度时宽度按比例撑开
        cls_m = re.search(r'class="([^"]*)"', attrs)
        style_m = re.search(r'style="([^"]*)"', attrs)
        style = 'aspect-ratio:%s;%s' % (sp['ratio'], style_m.group(1) if style_m else '')
        attrs = re.sub(r'\s*(class|style)="[^"]*"', '', attrs).strip()
        svg = sp['txt'].replace(
            '<svg ',
            '<svg%s style="%s"%s ' % (' class="%s"' % cls_m.group(1) if cls_m and cls_m.group(1) else '',
                                      style,
                                      (' ' + attrs) if attrs else ''),
            1)
        return svg

    out = tag_re.sub(repl, body)
    leftover = re.findall(r'data-sp="([^"]+)"', out)
    if leftover:
        raise SystemExit(f'精灵图占位未替换干净: {sorted(set(leftover))}')
    return out


def verify(cfg, html, expect_slides):
    """产物自检：页数、页眉、站内链接、精灵占位。任一不过就中止，不写出坏页面。"""
    errs = []
    secs = re.findall(r'<section class="slide[^"]*"[^>]*>.*?</section>', html, re.S)
    if len(secs) != expect_slides:
        errs.append('页数不符：期望 %d，实际 %d' % (expect_slides, len(secs)))
    for i, s in enumerate(secs):
        cm = re.search(r'<section class="slide([^"]*)"', s)
        cls = cm.group(1) if cm else ''
        if 'cover' in cls or 'bridge' in cls:
            continue          # 封面与桥页是全幅页，本来不放页眉
        if 'class="sl-head"' not in s:
            errs.append('第 %d 页缺 sl-head' % (i + 1))
    for href in sorted(set(re.findall(r'href="(\.\./页面/[^"#?]+)', html))):
        if not (ROOT / href[3:]).exists():
            errs.append('链接目标不存在：%s' % href)
    left = re.findall(r'data-sp="([^"]+)"', html)
    if left:
        errs.append('精灵占位未替换：%s' % sorted(set(left)))
    if errs:
        raise SystemExit('%s 产物校验失败：\n  - %s' % (cfg["out"], '\n  - '.join(errs)))


def build(cfg):
    src = (ROOT / cfg["src"]).read_text(encoding="utf-8")
    m = re.search(r'<template class="deck-src">(.*?)</template>', src, re.S)
    if not m:
        raise SystemExit(f'{cfg["src"]}: 找不到 deck-src 模板')
    body = m.group(1)

    # 0) 模板里若已带议程页（与生成结果保持同源），先剥掉，避免重新生成时出现两个目录
    body = re.sub(r'\n?[ \t]*<!-- =+ 目录 =+ -->\n?', '\n', body)
    body = re.sub(r'\n?[ \t]*<section class="slide agenda">.*?</section>\n?', '\n', body, flags=re.S)

    # 0.05) slide-body 同时挂 md-content 类：激活全站表格/引用/行内代码的
    #    .md-content 作用域样式（否则生成的 PPT 里表格是无框裸表）
    body = body.replace('<div class="slide-body">', '<div class="slide-body md-content">')

    # 0.1) deck-src 里的站内链接是相对于 页面/ 的文件名，按 deck 所在目录（放映版/）改写
    body = re.sub(r'href="((?:outline|games|toolbox|resources|handbook-[\w-]+)\.html)',
                  r'href="../页面/\1', body)
    body = body.replace('href="index.html', 'href="../index.html')

    # 0.2) 精灵图占位替换为内联 SVG（deck 必须保持零外部资源、双击可放）
    body = inline_sprites(body)

    # 1) 每页页眉注入讲义名
    body = body.replace('<div class="sl-head">',
                        '<div class="sl-head"><span class="sl-deck">%s</span>' % cfg["label"])

    # 2) 解析各 section，生成议程页（插到封面之后）。cfg["agenda"]="map" 时渲染成闯关地图。
    secs = re.findall(r'<section class="slide[^"]*"[^>]*>.*?</section>', body, re.S)
    if not secs or secs[0].find('class="slide cover"') < 0:
        raise SystemExit(f'{cfg["src"]}: 第一页必须是封面')

    # 2.1) 每个 anchor 第一次出现的 section 加 id，供 #l1 / #b0 / #c1 直接跳转
    seen_anchors = set()

    def _tag_id(mo):
        tag = mo.group(0)
        am = re.search(r'data-anchor="([^"]+)"', tag)
        if not am or ' id="' in tag:
            return tag
        a = am.group(1)
        if a in seen_anchors:
            return tag
        seen_anchors.add(a)
        return tag[:-1].rstrip() + ' id="%s">' % a

    body = re.sub(r'<section class="slide[^"]*"[^>]*>', _tag_id, body)

    # 2.15) 末页补 id="end"，供目录「毕业」节点跳转（页码不是锚点）
    last_sec = list(re.finditer(r'<section class="slide[^"]*"[^>]*>', body))[-1]
    last_tag = last_sec.group(0)
    last_id_m = re.search(r' id="([^"]+)"', last_tag)
    if last_id_m:
        end_id = last_id_m.group(1)
    else:
        end_id = 'end'
        body = (body[:last_sec.start()] + last_tag[:-1].rstrip() + ' id="end">' +
                body[last_sec.end():])

    agenda_items = []
    for idx, sec in enumerate(secs):
        am = re.search(r'data-anchor="([^"]+)"', sec)
        if not am:
            continue
        bm = re.search(r'class="sl-lesson">([^<]+)</span>', sec)
        tm = re.search(r'class="sl-title">([^<]+)</span>', sec)
        mm = re.search(r'data-map="([^"]+)"', sec)
        agenda_items.append((idx + 2,  # 议程页插在位置 2，其后每页 +1
                             (bm.group(1) if bm else ''), (tm.group(1) if tm else ''),
                             (mm.group(1) if mm else ''), am.group(1)))
    if cfg.get("agenda") == "map":
        def map_node(href, seq, ico, txt, extra=''):
            return (f'<a class="map-node {extra}" href="#{href}">'
                    f'<span class="map-n">{seq}</span>'
                    f'<span class="map-ico">{ico}</span><span class="map-t">{txt}</span></a>')
        first, second = [], []
        half = (len(agenda_items) + 1) // 2
        for i, (n, b, t, mp, anc) in enumerate(agenda_items):
            ico, _, txt = (mp or '🗺️ ' + (t or b or '')).partition(' ')
            (first if i < half else second).append(map_node(anc or n, i + 1, ico, txt))
        start_anchor = (agenda_items[0][4] or str(agenda_items[0][0])) if agenda_items else end_id
        row1 = [map_node(start_anchor, '', '🚩', '出发', 'map-start')] + first
        row2 = second + [map_node(end_id, '', '🏆', '完成', 'map-end')]
        map_html = ('\n        <div class="map">\n'
                    '          <div class="map-row">%s</div>\n'
                    '          <div class="map-row map-row-back">%s</div>\n'
                    '        </div>') % (''.join(row1), ''.join(row2))
        agenda = f'''
<section class="slide agenda">
  <div class="slide-canvas">
    <div class="sl-head"><span class="sl-deck">{cfg['label']}</span><span class="sl-lesson">目录</span><span class="sl-title">{cfg['agenda_title']}</span></div>
    <div class="slide-body map-body">
        {map_html}
    </div>
  </div>
</section>'''
    else:
        lis = '\n        '.join(
            f'<a href="#{anc or n}"><span class="ag-n">{b.replace("第 ", "").replace("课", "").replace("小项目 ", "项目").strip() or n}</span>{t}</a>'
            for n, b, t, _, anc in agenda_items)
        agenda = f'''
<section class="slide agenda">
  <div class="slide-canvas">
    <div class="sl-head"><span class="sl-deck">{cfg['label']}</span><span class="sl-lesson">目录</span><span class="sl-title">{cfg['agenda_title']}</span></div>
    <div class="slide-body">
      <div class="agenda-list">
        {lis}
      </div>
    </div>
  </div>
</section>'''
    # 插入议程页：封面 section 结束之后
    cover_end = body.find('</section>') + len('</section>')
    body = body[:cover_end] + agenda + body[cover_end:]

    # 3) 封面 canvas 末尾追加操作提示（插在封面最后一个 </section> 之前的画布闭合处）
    cover_end = body.find('</section>')
    canvas_close = body.rfind('  </div>', 0, cover_end)
    body = (body[:canvas_close] +
            '    <div class="deck-hint">%s</div>\n' % HINT +
            body[canvas_close:])

    # 4) 组装独立文件
    css = (ROOT / "assets/style.css").read_text(encoding="utf-8")
    needs_blocks = 'pre class="blocks"' in body
    vendor = ''
    if needs_blocks:
        sb = (ROOT / "assets/vendor/scratchblocks.min.js").read_text(encoding="utf-8")
        zh = (ROOT / "assets/vendor/zh-cn.js").read_text(encoding="utf-8")
        vendor = ('<script>%s</script>\n<script>%s</script>\n' % (sb, zh))

    # 主题色：每个游戏一个性格色（覆盖站点默认绿）
    accent_css = ''
    if cfg.get("accent"):
        accent_css = (
            ':root { --accent: %(a)s; --accent-soft: %(sf)s; }\n'
            'html[data-theme="dark"] { --accent: %(ad)s; --accent-soft: %(asd)s; }\n'
            % dict(a=cfg["accent"], sf=cfg["accent_soft"],
                   ad=cfg.get("accent_dark", cfg["accent"]), asd=cfg.get("accent_soft_dark", cfg["accent_soft"]))
        )
    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<!-- generated from {cfg['src']} -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{cfg['title']}</title>
<script>document.documentElement.dataset.theme=(function(){{try{{var t=localStorage.getItem('scratch-theme');if(t)return t;}}catch(e){{}}return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}})();</script>
<style>
{css}
{accent_css}{EXTRA_CSS}
{EXTRA_CSS_VISUAL}
</style>
</head>
<body>

<div class="deck" data-dir="next">
{body}
  <div class="deck-ui">
    <button type="button" class="deck-btn" data-deck="prev" aria-label="上一页">‹</button>
    <span class="deck-count"></span>
    <button type="button" class="deck-btn" data-deck="next" aria-label="下一页">›</button>
    <button type="button" class="deck-btn theme-btn">🌙 暗色</button>
    <a class="deck-btn deck-link" href="../index.html">🏠 首页</a>
    <a class="deck-btn deck-link" href="../{cfg['src']}">📖 完整手册 · 查询</a>
  </div>
  <div class="deck-progress"></div>
</div>

{vendor}<script>
{ENGINE}
</script>
</body>
</html>
'''
    out = ROOT / cfg["out"]
    verify(cfg, html, len(secs) + 1)   # 校验不过就不落盘，避免留下半成品
    out.write_text(html, encoding="utf-8")
    total = len(re.findall(r'<section class="slide', html))
    print(f'{cfg["out"]}: {total} 页, {len(agenda_items)} 个议程项, {len(seen_anchors)} 个锚点, '
          f'积木={"内嵌" if needs_blocks else "无"}, {out.stat().st_size // 1024} KB')


if __name__ == "__main__":
    print('源文件 hash：')
    for c in DECKS:
        print('  %-24s sha256:%s' % (c["src"], sha12((ROOT / c["src"]).read_text(encoding="utf-8"))))
    for c in DECKS:
        build(c)
    print('全部生成完毕')
