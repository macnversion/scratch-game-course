/* ============================================================
   Scratch 亲子课程 · Minecraft 主题 — 全站统一脚本
   功能：目录与滚动定位、主题切换、移动端侧栏、返回顶部、
         积木图渲染（scratchblocks）与文本切换/复制、学习进度勾选
   ============================================================ */
(function () {
  'use strict';

  var doc = document;

  /* ---------- 通用小工具 ---------- */
  // 用户开了「减少动效」时，所有滚动都改成瞬间定位
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var scrollBehavior = function () { return reduceMotion ? 'auto' : 'smooth'; };
  if (reduceMotion && doc.head) {
    // 目录是普通 #anchor 链接，走的是 CSS 的 scroll-behavior，只能在这里压掉
    var rmStyle = doc.createElement('style');
    rmStyle.textContent = 'html{scroll-behavior:auto !important}';
    doc.head.appendChild(rmStyle);
  }

  // 全站唯一的课次识别：第1次课 / 第 1 次课 / 第 1 次课：xxx / 第 1–3 次课 / 小项目1：xxx / 1. xxx
  // 返回 { kind, num, end, title, isRange }；范围写法只用于识别，不生成勾选
  var matchLesson = function (text) {
    if (text == null) return null;
    var t = String(text).replace(/\s+/g, ' ').trim();
    if (!t) return null;
    var rest = function (matched) {
      return t.slice(matched.length).replace(/^\s*[：:]\s*/, '').trim();
    };
    var out = function (kind, num, end, title, isRange) {
      return { kind: kind, num: num, end: end, title: title, isRange: !!isRange };
    };
    var r = t.match(/^第\s*(\d+)\s*[–—\-~～至]\s*(\d+)\s*次课/);
    if (r) return out('lesson', parseInt(r[1], 10), parseInt(r[2], 10), rest(r[0]), true);
    var a = t.match(/^第\s*(\d+)\s*次?课/);
    if (a) return out('lesson', parseInt(a[1], 10), parseInt(a[1], 10), rest(a[0]));
    var b = t.match(/^小项目\s*(\d+)/);
    if (b) return out('project', parseInt(b[1], 10), parseInt(b[1], 10), rest(b[0]));
    var c = t.match(/^(\d+)\s*[.、．]\s*(.+)$/);
    if (c) return out('index', parseInt(c[1], 10), parseInt(c[1], 10), c[2].trim());
    return null;
  };

  // 选做课：不注入勾选框、不参与「下一课」串联、不计进度（分母仍算它，见 TOTALS 说明）
  var OPTIONAL_LESSON = { l10: 1 };

  /* ---------- 主题切换 ---------- */
  var themeBtns = [].slice.call(doc.querySelectorAll('.theme-btn'));
  if (themeBtns.length) {
    var syncLabel = function () {
      var dark = doc.documentElement.dataset.theme === 'dark';
      themeBtns.forEach(function (b) { b.textContent = dark ? '☀️ 亮色模式' : '🌙 暗色模式'; });
    };
    syncLabel();
    themeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = doc.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        doc.documentElement.dataset.theme = next;
        try { localStorage.setItem('scratch-theme', next); } catch (e) {}
        syncLabel();
      });
    });
  }

  /* ---------- 移动端侧栏 ---------- */
  var sidebar = doc.querySelector('.sidebar');
  var menuBtn = doc.querySelector('.menu-btn');
  if (menuBtn && sidebar) {
    var syncOpen = function () {
      menuBtn.setAttribute('aria-expanded', sidebar.classList.contains('open') ? 'true' : 'false');
    };
    syncOpen();
    menuBtn.addEventListener('click', function () { sidebar.classList.toggle('open'); syncOpen(); });
    // 点侧栏内任意链接（导航/目录）后收起，避免遮挡正文
    sidebar.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) { sidebar.classList.remove('open'); syncOpen(); }
    });
    doc.addEventListener('click', function (e) {
      if (!sidebar || !menuBtn || !e.target) return;
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) {
        sidebar.classList.remove('open');
        syncOpen();
      }
    });
  }

  /* ---------- 本页目录：宽屏放右栏，窄屏放回侧栏 ---------- */
  var tocWrap = doc.getElementById('tocWrap');
  var tocRail = doc.getElementById('tocRail');
  var wideMq = window.matchMedia('(min-width: 1360px)');
  var placeToc = function () {
    if (!tocWrap || !tocRail || !sidebar) return;
    var anchor = sidebar.querySelector('.progress-line') || sidebar.querySelector('.sidebar-foot');
    if (wideMq.matches) {
      if (tocWrap.parentNode !== tocRail) tocRail.appendChild(tocWrap);
    } else if (tocWrap.parentNode !== sidebar) {
      if (anchor) sidebar.insertBefore(tocWrap, anchor); else sidebar.appendChild(tocWrap);
    }
  };
  placeToc();
  if (wideMq.addEventListener) wideMq.addEventListener('change', placeToc);
  else if (wideMq.addListener) wideMq.addListener(placeToc);

  /* ---------- 由 h2/h3 自动生成本页目录 ---------- */
  var content = doc.querySelector('.md-content');
  var tocBox = doc.querySelector('#toc');
  var heads = [];
  if (content && tocBox) {
    // 过滤空标题（如游戏内浮层的占位标题）与标了 toc-skip 的正文小标签，避免目录被灌满
    heads = [].slice.call(doc.querySelectorAll('.md-content h2, .md-content h3'))
      .filter(function (h) { return h.textContent.trim() && !h.classList.contains('toc-skip'); });
    if (!heads.length) {
      var tw = tocBox.closest('.toc-wrap');
      if (tw) tw.style.display = 'none';
      if (tocRail) tocRail.style.display = 'none';
      doc.body.classList.add('no-toc');
    } else {
      var frag = doc.createDocumentFragment();
      // 序号抽成独立一格，标题单独一格：折行时续行回到标题列，不会与序号错位。
      // 「第 8 次课：广播、状态与结果面板」→ 8 / 广播、状态与结果面板
      // 「1. 最终会做成什么」→ 1 / 最终会做成什么；无序号则整段进标题列
      var splitLabel = function (text) {
        var t = String(text).replace(/\s+/g, ' ').trim();
        var m = matchLesson(t);
        return m && m.num ? [String(m.num), m.title || t] : ['', t];
      };
      var numbered = 0;
      heads.forEach(function (h, i) {
        if (!h.id) h.id = 'sec-' + i;
        var a = doc.createElement('a');
        a.href = '#' + h.id;
        a.className = h.tagName === 'H3' ? 'lvl-3' : 'lvl-2';
        a.setAttribute('data-target', h.id);
        var parts = splitLabel(h.textContent);
        if (parts[0]) numbered++;
        var num = doc.createElement('span');
        num.className = 'toc-n';
        num.textContent = parts[0];
        var label = doc.createElement('span');
        label.className = 'toc-t';
        label.textContent = parts[1];
        a.appendChild(num);
        a.appendChild(label);
        frag.appendChild(a);
      });
      tocBox.appendChild(frag);
      // 全页都没有序号时不预留序号列，把那一列宽度还给标题
      if (!numbered) tocBox.classList.add('toc-plain');
      // 左栏目录被压成小滚动区时，底部的常驻提示让「还有更多」在不滚动时也看得见。
      // 挂在 .toc 之外（.toc-wrap 里），这样它不随列表滚动；列表没溢出就不显示。
      var more = doc.createElement('div');
      more.className = 'toc-more';
      more.textContent = '▾ 共 ' + heads.length + ' 项，可上下滚动';
      tocBox.parentNode.appendChild(more);
      var syncMore = function () {
        var over = tocBox.scrollHeight - tocBox.clientHeight > 6;
        more.style.display = over ? '' : 'none';
      };
      syncMore();
      window.addEventListener('load', syncMore);
      window.addEventListener('resize', syncMore);

      var links = [].slice.call(tocBox.querySelectorAll('a'));
      var highlight = function () {
        var current = null;
        for (var i = 0; i < heads.length; i++) {
          if (heads[i].getBoundingClientRect().top < 90) current = heads[i];
        }
        links.forEach(function (l) { l.classList.remove('current'); });
        if (current) {
          var active = tocBox.querySelector('a[data-target="' + current.id + '"]');
          if (active) active.classList.add('current');
        }
      };
      // 滚动事件按帧合并，避免每帧全量遍历标题
      var hlTick = null;
      var onScrollHighlight = function () {
        if (hlTick !== null) return;
        if (window.requestAnimationFrame) {
          hlTick = window.requestAnimationFrame(function () { hlTick = null; highlight(); });
        } else {
          hlTick = setTimeout(function () { hlTick = null; highlight(); }, 80);
        }
      };
      window.addEventListener('scroll', onScrollHighlight, { passive: true });
      highlight();
    }
  }

  /* ---------- 三档角色标签：每节标出「谁看」 ---------- */
  // 两本手册的小节统一以 <strong>小节名：</strong> 开头，这里按小节名映射到三档角色，
  // 页面顶部再插一条图例，家长不用猜哪段该谁看。
  var ROLE_LABELS = {
    '只解决一个问题': ['r-both', '👨‍👩‍👦 一起'],
    '课前准备': ['r-parent', '🧑 家长先看'],
    '开场': ['r-both', '👨‍👩‍👦 一起'],
    '一起做': ['r-both', '👨‍👩‍👦 一起'],
    '卡点预案': ['r-parent', '🧑 家长先看'],
    '验收': ['r-both', '👨‍👩‍👦 一起'],
    '课后挑战': ['r-kid', '👦 孩子自己'],
    '资源': ['r-parent', '🧑 家长先看'],
    '目标': ['r-both', '👨‍👩‍👦 一起'],
    '新概念': ['r-parent', '🧑 家长先看'],
    '验证': ['r-both', '👨‍👩‍👦 一起'],
    '为什么这一步重要': ['r-parent', '🧑 家长先看'],
    '角色清单': ['r-both', '👨‍👩‍👦 一起'],
    '家长话术': ['r-parent', '🧑 家长先看'],
    '和孩子讨论的规则题': ['r-both', '👨‍👩‍👦 一起'],
    '毕业标准': ['r-both', '👨‍👩‍👦 一起'],
    '节奏提示': ['r-parent', '🧑 家长先看'],
    '今天 45 分钟怎么分': ['r-both', '👨‍👩‍👦 一起'],
    '具体怎么做': ['r-both', '👨‍👩‍👦 一起'],
    '今天的结束标志': ['r-both', '👨‍👩‍👦 一起'],
    '接下来去哪': ['r-both', '👨‍👩‍👦 一起'],
    // 正文里措辞不完全统一的几个小节，单独列出，避免漏标
    '为什么非要现在教': ['r-parent', '🧑 家长先看'],
    '一句话点到': ['r-both', '👨‍👩‍👦 一起'],
    '一句话版本': ['r-parent', '🧑 家长先看'],
    '贯穿全程的两个习惯': ['r-parent', '🧑 家长先看'],
    '方块编号约定': ['r-parent', '🧑 家长先看'],
    '等价写法': ['r-parent', '🧑 家长先看'],
    '先做实验再写代码': ['r-both', '👨‍👩‍👦 一起']
  };
  (function () {
    var pageKey = doc.body.getAttribute('data-page') || '';
    if (!content || !(pageKey === 'handbook-brick' || pageKey === 'handbook-flappy' || pageKey === 'handbook-shooter' || pageKey === 'handbook-snake' || pageKey === 'handbook-tower' || pageKey === 'handbook-tetra')) return;
    // "开场（5 分钟）：" -> "开场"；"开场（5 分钟）——广播的比喻：" -> "开场"；"⏳ 节奏提示：" -> "节奏提示"
    var normalize = function (text) {
      return text
        .replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/, '')
        .replace(/[（(][^）)]*[）)]/g, '')
        .replace(/—{1,2}.*$/, '')
        .replace(/[：:].*$/, '')
        .trim();
    };
    // 用最长前缀匹配，避免"开场"抢走"开场引导问题"之类的变体
    var roleOf = function (text) {
      var key = normalize(text), best = null;
      Object.keys(ROLE_LABELS).forEach(function (k) {
        if (key.indexOf(k) === 0 && (!best || k.length > best.length)) best = k;
      });
      return best ? ROLE_LABELS[best] : null;
    };
    var marked = 0;
    var missed = {};
    // 只给「第一课」之后的内容标角色；前面的导语/用法说明保持普通正文，不要被切成一堆块
    var lessonStart = content.querySelector('#l1') || content.querySelector('#b0');
    var inLessons = function (el) {
      if (!lessonStart) return true;
      return (lessonStart.compareDocumentPosition(el) & 4) !== 0; // 4 = FOLLOWING
    };
    [].slice.call(content.querySelectorAll('p > strong:first-child')).forEach(function (s) {
      if (!inLessons(s)) return;
      var role = roleOf(s.textContent);
      if (!role) {
        // 词表没覆盖到时留个线索，方便以后补 ROLE_LABELS，不打扰家长
        var missKey = normalize(s.textContent);
        if (missKey) missed[missKey] = (missed[missKey] || 0) + 1;
        return;
      }
      // 正文里手写过标签的（如第 1 课重写稿）不再重复注入
      var prev = s.previousElementSibling;
      if (prev && prev.classList && prev.classList.contains('role-tag')) return;
      var tag = doc.createElement('span');
      tag.className = 'role-tag ' + role[0];
      tag.textContent = role[1];
      s.parentNode.insertBefore(tag, s);
      marked++;
    });
    if (Object.keys(missed).length && window.console && console.debug) {
      console.debug('[role-label] 未命中角色映射的小节名（补 ROLE_LABELS 即可）', missed);
    }
    if (!marked && !content.querySelector('p > .role-tag')) return;

    /* ---- 把每一档打包成独立色块，视觉上彻底分开 ---- */
    var ROLE_OF = { 'r-parent': 'parent', 'r-both': 'both', 'r-kid': 'kid' };
    var LABEL_OF = {
      parent: '🧑 家长先看 · 孩子不用读这一段',
      both: '👨‍👩‍👦 一起看 · 你念，孩子动手',
      kid: '👦 孩子自己 · 这一段家长可以走开'
    };
    // 只有「段落第一个元素就是角色标签」的 p 才算一节的开始
    var starts = [].slice.call(content.querySelectorAll('p')).filter(function (p) {
      var f = p.firstElementChild;
      return f && f.classList && f.classList.contains('role-tag') && inLessons(p);
    });
    starts.forEach(function (p) {
      if (p.parentNode.classList && p.parentNode.classList.contains('rsec')) return;
      var tag = p.firstElementChild;
      var role = ROLE_OF[(tag.className.match(/r-(parent|both|kid)/) || [])[0]];
      if (!role) return;
      // 往后收：直到下一个带标签的段落、下一个 h2、分隔线，或「下一课」按钮
      var group = [p], node = p.nextElementSibling;
      while (node) {
        if (node.tagName === 'H2' || node.tagName === 'HR') break;
        if (node.classList && node.classList.contains('lesson-next')) break;
        if (node.tagName === 'P') {
          var nf = node.firstElementChild;
          if (nf && nf.classList && nf.classList.contains('role-tag')) break;
        }
        group.push(node);
        node = node.nextElementSibling;
      }
      // 同类相邻区块合并，避免一节课被切成一串碎块
      var prev = p.previousElementSibling;
      if (prev && prev.classList && prev.classList.contains('rsec') &&
          prev.getAttribute('data-role') === role) {
        group.forEach(function (el) { prev.appendChild(el); });
        return;
      }
      var sec = doc.createElement('section');
      sec.className = 'rsec';
      sec.setAttribute('data-role', role);
      sec.setAttribute('data-label', LABEL_OF[role]);
      p.parentNode.insertBefore(sec, p);
      group.forEach(function (el) { sec.appendChild(el); });
    });

    /* ---- 顶部筛选条：一键只看某一类 ---- */
    // 只列出这一页真实存在的类别（B 阶段没有「孩子自己」的段落，就不出现那个按钮）
    var present = {
      parent: content.querySelector('.rsec[data-role="parent"]') !== null,
      both: content.querySelector('.rsec[data-role="both"]') !== null,
      kid: content.querySelector('.rsec[data-role="kid"]') !== null
    };
    var bar = doc.createElement('div');
    bar.className = 'role-filter';
    bar.innerHTML = '<span class="rf-label">只看：</span>' + [
      ['all', '全部'],
      ['parent', '🧑 家长先看'],
      ['both', '👨‍👩‍👦 一起'],
      ['kid', '👦 孩子自己']
    ].filter(function (o) { return o[0] === 'all' || present[o[0]]; }).map(function (o) {
      return '<button type="button" data-role-filter="' + o[0] + '"' +
        (o[0] === 'all' ? ' class="on"' : '') + '>' + o[1] + '</button>';
    }).join('') + '<span class="rf-hint">按了只留那一类，孩子在场时点「一起」最清爽</span>';
    var anchor = content.querySelector('#l1') || content.querySelector('#b0') || content.querySelector('h2');
    if (anchor) content.insertBefore(bar, anchor);
    else content.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-role-filter]') : null;
      if (!btn) return;
      [].slice.call(bar.querySelectorAll('button')).forEach(function (x) { x.classList.remove('on'); });
      btn.classList.add('on');
      var v = btn.getAttribute('data-role-filter');
      if (v === 'all') { doc.body.removeAttribute('data-role-filter'); }
      else { doc.body.setAttribute('data-role-filter', v); }
    });
  })();

  /* ---------- 课级「下一课」 ---------- */
  // A 阶段 9 课（+1 次选做扩展）、B 阶段 9 个项目各自是一条单线：每课末尾插一条「下一课」，
  // 孩子不用回侧栏找，家长也不会漏顺序。最后一课直接指向下一阶段首页。
  // 选做课（l10）不串联：l9 直接指向 B 阶段首页，避免「发布日 → 扩展」把主线带偏。
  (function () {
    var pageKey = doc.body.getAttribute('data-page') || '';
    var cfg = {
      'handbook-brick': {
        prefix: 'k', kind: 'lesson',
        tailHref: 'handbook-flappy.html',
        tailLabel: '① 弹球打砖块完成 → ② 飞扬的小鸟'
      },
      'handbook-flappy': {
        prefix: 'u', kind: 'lesson',
        tailHref: 'handbook-shooter.html',
        tailLabel: '② 飞扬的小鸟完成 → ③ 太空射击'
      },
      'handbook-shooter': {
        prefix: 'h', kind: 'lesson',
        tailHref: 'handbook-snake.html',
        tailLabel: '③ 太空射击完成 → ④ 贪吃蛇'
      },
      'handbook-snake': {
        prefix: 'a', kind: 'lesson',
        tailHref: 'handbook-tower.html',
        tailLabel: '④ 贪吃蛇完成 → ⑤ 城堡塔防'
      },
      'handbook-tower': {
        prefix: 'w', kind: 'lesson',
        tailHref: 'handbook-tetra.html',
        tailLabel: '⑤ 城堡塔防完成 → ⑥ 俄罗斯方块'
      },
      'handbook-tetra': {
        prefix: 'd', kind: 'lesson',
        tailHref: 'handbook-games.html',
        tailLabel: '⑥ 俄罗斯方块完成 → 街机厅 · 更多游戏'
      }
    }[pageKey];
    if (!content || !cfg) return;

    // 每课「为什么必须连着上」一句话（l10 是选做扩展，不接下一课，故不写）
    var NOTES = {
      k1: '挡板跟手了，下一课放球上场。',
      k2: '球会弹了，下一课砌墙给它打。',
      k3: '墙铺好了，下一课让球撞碎它。',
      k4: '碎砖计分通了，下一课给它结局。',
      k5: '打砖块毕业，下一课做小鸟。',
      u1: '会掉就成功一半，下一课给它翅膀。',
      u2: '能飞能坠，下一课天上长管道。',
      u3: '管道会动了，下一课碰上就输。',
      u4: '能赢能输了，下一课计分加速毕业。',
      u5: '小鸟毕业，下一课去太空。',
      h1: '飞船听话了，下一课开火。',
      h2: '火力有了，下一课下陨石雨。',
      h3: '敌人到位，下一课打爆它们。',
      h4: '核心循环通了，下一课护盾与毕业。',
      h5: '太空毕业，下一课养蛇。',
      a1: '格子手感有了，下一课装方向盘。',
      a2: '会转弯了，下一课吃食物变长。',
      a3: '身体会跟了，下一课让它变危险。',
      a4: '能赢能输了，下一课加速毕业。',
      a5: '贪吃蛇毕业，下一课守城。',
      w1: '敌人会走路了，下一课花钱造塔。',
      w2: '塔立好了，下一课教它开火。',
      w3: '自动战斗通了，下一课成波涌来。',
      w4: '波次系统好了，下一课给它结局。',
      w5: '塔防毕业，最后一关俄罗斯方块。',
      d1: '棋盘会记事了，下一课方块下落。',
      d2: '方块会落了，下一课落地为安。',
      d3: '堆叠转起来了，下一课交出操控权。',
      d4: '操控成立，最后一课：消行毕业。',
      d5: '这一课练熟了，下一课直接用。'
    };

    var lessons = [].slice.call(content.querySelectorAll('h2, h3')).filter(function (h) {
      var m = matchLesson(h.textContent);
      return m && m.kind === cfg.kind && !m.isRange;
    });
    if (!lessons.length) return;

    // 统一锚点：handbook-b 的小项目标题原本没有 id（TOC 给的是 sec-N），
    // 这里补成 b1..b9，并同步改写已生成的目录链接，保证 #bN 可直接跳转。
    lessons.forEach(function (h, i) {
      var lm = matchLesson(h.textContent);
      var n = lm ? lm.num : i + 1;
      var want = cfg.prefix + n;
      if (h.id === want) return;
      if (h.id) {
        var link = doc.querySelector('#toc a[data-target="' + h.id + '"]');
        if (link) { link.setAttribute('data-target', want); link.setAttribute('href', '#' + want); }
      }
      h.id = want;
    });

    lessons.forEach(function (h, i) {
      var key = h.id;
      var note = NOTES[key];
      if (!note) return;
      // 选做课不算「下一课」，l9 直接接下一阶段首页
      var next = null;
      for (var j = i + 1; j < lessons.length; j++) {
        if (!OPTIONAL_LESSON[lessons[j].id]) { next = lessons[j]; break; }
      }
      // 找这一课的结束点（下一个 h2 或分隔线），顺带判断是否已注入过
      var stop = null, node = h.nextElementSibling, already = false;
      while (node) {
        if (node.tagName === 'H2' || node.tagName === 'HR') { stop = node; break; }
        if (node.classList && node.classList.contains('lesson-next')) already = true;
        node = node.nextElementSibling;
      }
      if (already) return;

      var box = doc.createElement('div');
      box.className = 'lesson-next';
      var a = doc.createElement('a');
      if (next) {
        var nm = matchLesson(next.textContent);
        var nn = nm ? nm.num : i + 2;
        // 标题去掉「第 N 次课：」/「小项目 N：」前缀，只留课名
        var title = nm && nm.title ? nm.title : next.textContent.trim();
        a.href = '#' + next.id;
        a.textContent = '下一课 → ' + (cfg.kind === 'lesson' ? '第 ' + nn + ' 课：' : '小项目 ' + nn + '：') + title;
      } else {
        a.href = cfg.tailHref;
        a.textContent = cfg.tailLabel;
      }
      box.appendChild(a);
      var span = doc.createElement('span');
      span.className = 'ln-note';
      span.textContent = note;
      box.appendChild(span);

      if (stop) content.insertBefore(box, stop);
      else content.appendChild(box);
    });
  })();

  /* ---------- 学习进度勾选 ---------- */
  // handbook-a 的 h2「第 N 次课：…」与 handbook-b 的「小项目 N：…」可勾选完成，
  // 第 10 次课（选做扩展）不注入勾选框；存 localStorage，侧边栏与首页进度条同步显示。
  var PROGRESS_KEY = 'scratch-progress-v1';
  var pageId = doc.body.dataset.page || '';
  var progressStore = (function () {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch (e) { return {}; }
  })();
  var saveProgress = function () {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressStore)); } catch (e) {}
  };
  // 进度分母：先数当前页 DOM 里的真实条目，数不出再用默认值。
  // 关键点：派生失败一律回退，绝不让内容改动把用户进度清空。
  // handbook-a 的分母 9：第 10 次课是选做扩展，不注入勾选框，不计入分母。
  var FALLBACK_TOTALS = {'handbook-brick': 5, 'handbook-flappy': 5, 'handbook-shooter': 5, 'handbook-snake': 5, 'handbook-tower': 5, 'handbook-tetra': 5};
  var KEY_PREFIX = {'handbook-brick': 'k', 'handbook-flappy': 'u', 'handbook-shooter': 'h', 'handbook-snake': 'a', 'handbook-tower': 'w', 'handbook-tetra': 'd'};

  var countEntries = function (pid) {
    if (!content) return 0;
    var n = 0;
    if (pid === 'handbook-brick' || pid === 'handbook-flappy' || pid === 'handbook-shooter' || pid === 'handbook-snake' || pid === 'handbook-tower' || pid === 'handbook-tetra') {
      var kind = 'lesson';
      [].slice.call(content.querySelectorAll('h2, h3')).forEach(function (h) {
        var m = matchLesson(h.textContent);
        if (OPTIONAL_LESSON[h.id]) return;
        if (m && m.kind === kind && !m.isRange) n++;
      });
    } else if (pid === 'games') {
      [].slice.call(content.querySelectorAll('h3')).forEach(function (h) {
        var m = matchLesson(h.textContent);
        if (!m || m.kind !== 'index') return;
        // 第 14 项三国杀单列进 sg-plan，不计入 13 个游戏
        if (h.id === 'g14' || m.num >= 14) return;
        n++;
      });
    } else if (pid === 'sg-plan') {
      [].slice.call(content.querySelectorAll('table')).forEach(function (tb) {
        if (tb.textContent.indexOf('只解决什么') < 0) return;
        [].slice.call(tb.querySelectorAll('tbody tr')).forEach(function (tr) {
          var td = tr.querySelector('td');
          if (td && /^\d+$/.test(td.textContent.trim())) n++;
        });
      });
    }
    return n;
  };

  // 只有当前页的条目数是真的从 DOM 数出来的，其他页沿用默认值
  var DERIVED = {};
  var TOTALS = (function () {
    var out = {};
    Object.keys(FALLBACK_TOTALS).forEach(function (pid) {
      var n = pid === pageId ? countEntries(pid) : 0;
      DERIVED[pid] = n;
      out[pid] = n > 0 ? n : FALLBACK_TOTALS[pid];
    });
    return out;
  })();

  // 当前课程结构里真实存在的勾选 key。只认这里列出的，旧版本残留（如已取消的 games::g14）
  // 一律不计、并在启动时清掉——否则 12 个游戏会被算成 13/13。
  var VALID_KEYS = (function () {
    var out = {};
    Object.keys(KEY_PREFIX).forEach(function (pid) {
      out[pid] = {};
      for (var i = 1; i <= TOTALS[pid]; i++) out[pid][pid + '::' + KEY_PREFIX[pid] + i] = 1;
    });
    return out;
  })();
  (function pruneOrphans() {
    // 派生值比默认值少，说明当前页解析不可信（某条标题写坏了），这时不清理，
    // 宁可留旧键也不清空进度：否则分母掉一，最后一条记录会被当孤儿删掉且立刻落盘。
    if (KEY_PREFIX[pageId] && DERIVED[pageId] < FALLBACK_TOTALS[pageId]) return;
    var changed = false;
    for (var k in progressStore) {
      var pid = k.split('::')[0];
      if (!VALID_KEYS[pid] || !VALID_KEYS[pid][k]) { delete progressStore[k]; changed = true; }
    }
    if (changed) saveProgress();
  })();
  var countDone = function (pid) {
    var n = 0, valid = VALID_KEYS[pid] || {};
    for (var k in progressStore) if (progressStore[k] && valid[k]) n++;
    return n;
  };
  // 四条进度线：A 阶段 9 课 + 1 选做 / B 阶段 9 小项目 / 街机厅 13 游戏 / 三国杀 10 课
  // 三国杀（街机厅第 14 项）已归入 sg-plan 的 10 课，不在街机厅重复计
  var LABELS = {'handbook-brick': '① 弹球打砖块', 'handbook-flappy': '② 飞扬的小鸟', 'handbook-shooter': '③ 太空射击', 'handbook-snake': '④ 贪吃蛇', 'handbook-tower': '⑤ 城堡塔防', 'handbook-tetra': '⑥ 俄罗斯方块'};

  // 通用：注册一个勾选框并与进度存储联动
  function bindBox(box, key, headingEl) {
    box.setAttribute('data-key', key);
    box.checked = !!progressStore[key];
    if (headingEl && box.checked) headingEl.classList.add('h2-done');
    box.addEventListener('change', function () {
      if (box.checked) { progressStore[key] = 1; if (headingEl) headingEl.classList.add('h2-done'); }
      else { delete progressStore[key]; if (headingEl) headingEl.classList.remove('h2-done'); }
      saveProgress();
      renderProgressLine();
    });
  }
  function makeLabel(key, headingEl, name) {
    var label = doc.createElement('label');
    label.className = 'lesson-check';
    var box = doc.createElement('input');
    box.type = 'checkbox';
    box.setAttribute('aria-label', (headingEl ? headingEl.textContent.trim() : name) + '：标记完成');
    bindBox(box, key, headingEl);
    label.appendChild(box);
    return label;
  }

  // 在对应页面注入复选框：A/B 手册=课次标题；街机厅=游戏 h3；三国杀=逐课表首列
  if (content && (pageId === 'handbook-brick' || pageId === 'handbook-flappy' || pageId === 'handbook-shooter' || pageId === 'handbook-snake' || pageId === 'handbook-tower' || pageId === 'handbook-tetra')) {
    var lessonKind = 'lesson';
    heads.forEach(function (h) {
      if (h.tagName !== 'H2' && h.tagName !== 'H3') return;
      var lm = matchLesson(h.textContent);
      if (!lm || lm.kind !== lessonKind || lm.isRange) return;
      // 选做课不计进度，不注入勾选框
      if (OPTIONAL_LESSON[h.id]) return;
      if (h.querySelector('.lesson-check')) return;
      h.insertBefore(makeLabel(pageId + '::' + h.id, h), h.firstChild);
    });
  }
  if (content && pageId === 'games') {
    heads.forEach(function (h) {
      if (h.tagName !== 'H3') return;
      var m = h.textContent.match(/^(\d+)\.\s/);
      if (!m) return;
      // 第 14 项是三国杀，进度统一在 sg-plan 页勾选，这里不注入，避免重复计数
      if (h.id === 'g14' || m[1] === '14') return;
      if (h.querySelector('.lesson-check')) return;
      h.insertBefore(makeLabel('games::' + h.id, h), h.firstChild);
    });
  }
  if (content && pageId === 'sg-plan') {
    // 逐课表：表头含"课"的那张表，第一列是纯数字的行注入勾选框
    [].slice.call(content.querySelectorAll('table')).forEach(function (tb) {
      if (tb.textContent.indexOf('只解决什么') < 0) return;
      [].slice.call(tb.querySelectorAll('tr')).forEach(function (tr, ri) {
        if (ri === 0) return;
        var td = tr.querySelector('td');
        if (!td || td.querySelector('.lesson-check') || !/^\d+$/.test(td.textContent.trim())) return;
        var n = td.textContent.trim();
        var label = makeLabel('sg-plan::c' + n, null, '第 ' + n + ' 课');
        label.style.marginRight = '6px';
        td.insertBefore(label, td.firstChild);
      });
    });
  }

  // 侧边栏进度行 + 首页进度卡
  var renderProgressLine = function () {
    var line = doc.getElementById('progressLine');
    if (line) {
      line.innerHTML = Object.keys(TOTALS).map(function (pid) {
        var done = Math.min(countDone(pid), TOTALS[pid]);
        return '<span class="pl-item">' + LABELS[pid] + ' <b>' + done + '/' + TOTALS[pid] + '</b></span>';
      }).join('') + '<span class="hint">勾选即记录进度' +
        (pageId === 'handbook-a' ? ' · 第 10 课为选做扩展，不计进度' : '') + '</span>';
    }
    Object.keys(TOTALS).forEach(function (pid) {
      var bar = doc.getElementById('bar-' + pid);
      var num = doc.getElementById('num-' + pid);
      var doneCount = Math.min(countDone(pid), TOTALS[pid]);
      if (bar && num) {
        var pct = Math.round(doneCount / TOTALS[pid] * 100);
        bar.style.width = pct + '%';
        num.textContent = doneCount + ' / ' + TOTALS[pid];
      }
      var stars = doc.getElementById('stars-' + pid);
      if (stars) {
        var s = '';
        for (var i = 0; i < TOTALS[pid]; i++) s += i < doneCount ? '⭐' : '<span class="off">☆</span>';
        stars.innerHTML = s;
      }
    });
  };
  renderProgressLine();

  // 多标签页：别处改了进度就重新读一遍，避免两个标签互相覆盖
  var syncBoxes = function () {
    [].slice.call(doc.querySelectorAll('.lesson-check input[data-key]')).forEach(function (b) {
      var key = b.getAttribute('data-key');
      b.checked = !!progressStore[key];
      var h = b.closest ? b.closest('h2') : null;
      if (h) {
        if (b.checked) h.classList.add('h2-done');
        else h.classList.remove('h2-done');
      }
    });
  };
  window.addEventListener('storage', function (e) {
    if (e.key !== PROGRESS_KEY && e.key !== null) return;
    try { progressStore = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
    catch (err) { return; }
    syncBoxes();
    renderProgressLine();
  });

  // 首页「重置进度」按钮
  var resetBtn = doc.getElementById('resetProgress');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (!window.confirm('确定清除全部学习进度记录吗？')) return;
      Object.keys(TOTALS).forEach(function (pid) {
        for (var k in progressStore) if (k.indexOf(pid + '::') === 0) delete progressStore[k];
      });
      saveProgress();
      [].slice.call(doc.querySelectorAll('.lesson-check input')).forEach(function (b) { b.checked = false; });
      [].slice.call(doc.querySelectorAll('h2.h2-done')).forEach(function (h) { h.classList.remove('h2-done'); });
      renderProgressLine();
    });
  }

  /* ---------- 积木图渲染（scratchblocks） ---------- */
  // 语言包用 <script> 预加载到 window.__SB_ZH_CN（兼容 file:// 直接打开）
  var pres = [].slice.call(doc.querySelectorAll('pre.blocks'));
  if (pres.length && window.scratchblocks && window.__SB_ZH_CN) {
    window.scratchblocks.loadLanguages({ 'zh-cn': window.__SB_ZH_CN });
    var opts = { languages: ['zh-cn', 'en'], style: 'scratch3' };  // 全站按 Scratch 3 外观渲染积木

    pres.forEach(function (pre, i) {
      var raw = pre.textContent.replace(/\s+$/, '');
      pre.dataset.raw = raw;
      pre.id = 'sb-block-' + i;

      // 工具条：积木/文本切换 + 复制
      var bar = doc.createElement('div');
      bar.className = 'block-bar';
      var tBtn = doc.createElement('button');
      tBtn.className = 'blk-btn';
      tBtn.textContent = '📄 查看文本';
      var cBtn = doc.createElement('button');
      cBtn.className = 'blk-btn';
      cBtn.textContent = '📋 复制';
      bar.appendChild(tBtn);
      bar.appendChild(cBtn);
      pre.parentNode.insertBefore(bar, pre);

      var asText = false;
      tBtn.addEventListener('click', function () {
        asText = !asText;
        if (asText) {
          pre.classList.add('as-text');
          pre.textContent = raw;
          tBtn.textContent = '🧱 查看积木';
        } else {
          pre.classList.remove('as-text');
          pre.textContent = raw;
          try { window.scratchblocks.renderMatching('#' + pre.id, opts); }
          catch (e) { console.warn('scratchblocks 渲染失败，保留原始文本', e); }
          tBtn.textContent = '📄 查看文本';
        }
      });
      cBtn.addEventListener('click', function () {
        var flash = function (txt, ms) {
          cBtn.textContent = txt;
          setTimeout(function () { cBtn.textContent = '📋 复制'; }, ms);
        };
        var ok = function () { flash('✅ 已复制', 1600); };
        var fail = function () { flash('❌ 复制失败，请手动选择文本', 2600); };
        var fb = function () { if (fallbackCopy(raw)) ok(); else fail(); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(raw).then(ok, fb);
        } else { fb(); }
      });
    });

    try {
      window.scratchblocks.renderMatching('pre.blocks', opts);
    } catch (e) {
      console.warn('scratchblocks 渲染失败，保留原始文本', e);
    }

    // 丢行自检：解析出的积木数若少于代码行数，说明有行未能渲染（语法问题），
    // 在该积木段上方插入警告，避免教学内容静默缺行。
    var countBlocks = function (node) {
      var c = 0;
      if (!node || typeof node !== 'object') return 0;
      if (node.info && node.info.category !== undefined) c = 1;
      for (var k in node) {
        var v = node[k];
        if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) c += countBlocks(v[i]); }
        else if (v && typeof v === 'object' && v.info) c += countBlocks(v);
      }
      return c;
    };
    pres.forEach(function (pre) {
      if (pre.classList.contains('as-text')) return;
      var raw = pre.dataset.raw || '';
      var lines = raw.split('\n').filter(function (l) {
        var t = l.trim();
        return t && t.indexOf('//') !== 0 && t !== '否则';
      });
      var doc2;
      try { doc2 = window.scratchblocks.parse(raw, opts); } catch (e) { doc2 = null; }
      if (!doc2) return;
      var blocks = 0;
      doc2.scripts.forEach(function (sc) { blocks += countBlocks(sc); });
      if (blocks + doc2.scripts.length < lines.length) {
        var warn = doc.createElement('div');
        warn.className = 'blk-warn';
        warn.textContent = '⚠️ 此积木段有 ' + (lines.length - blocks - doc2.scripts.length) +
          ' 行未能渲染成积木（多为措辞与编辑器不完全一致），请对照下方文本在编辑器中手动查找对应积木';
        pre.parentNode.insertBefore(warn, pre);
      }
    });
  }

  // 返回是否真的复制成功；失败时调用方要如实提示，不能假装成功
  function fallbackCopy(text) {
    var ta = doc.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    doc.body.appendChild(ta);
    ta.focus();
    ta.select();
    var ok = false;
    try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
    doc.body.removeChild(ta);
    return !!ok;
  }

  /* ---------- 返回顶部 ---------- */
  var toTop = doc.querySelector('.to-top');
  if (toTop) {
    window.addEventListener('scroll', function () {
      toTop.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
    });
  }
})();
