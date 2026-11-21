// Qiuye Zhu · Portfolio — bar scene interactions and the "pour" transition.
(function () {
  'use strict';

  // ---------- Content ----------
  var PROJECTS = [
    { name: 'The Second Chance', kind: 'SOLO · NARRATIVE GAME', note: 'Bitter, served neat — who gets to grant a second chance?', tools: 'RPG Maker · Blender · Unreal · Ai · Ps', img: 'assets/cover-second-chance.webp', desc: '一款关于宽恕的解谜叙事游戏：罪人可以重新开始，可受害者呢？核心理念是，第二次机会应该由受害者决定。', role: '独立完成：策划、关卡、美术、开发' },
    { name: 'The Path of Rose', kind: 'TEAM OF 4 · 3D PUZZLE', note: 'Sweet with thorns — a journey through The Little Prince.', tools: 'Blender · 3D 游戏引擎 · 关卡设计', img: 'assets/cover-path-of-rose.webp', desc: '以《小王子》为蓝本、以“爱的诠释”为主题的 3D 解谜冒险：在房子与花园间寻找玫瑰，穿过魔法传送门解开谜题。', role: '组长 · 第二关关卡设计 · 动画' },
    { name: 'Dusk Game', kind: 'GAME DESIGN · 2D', note: 'Smoky, best at dusk — a game of shadows and hide-and-seek.', tools: 'Procreate · Ps · Ae · Unreal', img: 'assets/cover-dusk-game.webp', desc: '从“黄昏不要玩捉迷藏”的民间说法出发，玩家化身影子在废弃工厂里寻找回家的路，核心概念是孤立与联结。', role: '游戏设计 · 故事板 · 序列帧美术' },
    { name: 'Oops! Wrong Choice', kind: 'DUO · INSTALLATION', note: 'Fizzy and unpredictable — every jump leaves a mark.', tools: 'Blender · Python · Arduino · Unreal', img: 'assets/cover-oops.webp', desc: '一件用身体操控的互动游戏装置：你做的每个选择都会在人生上留下印记，映照出你的价值观与身份。', role: '游戏设计 · 场景搭建 · 玩法蓝图 · Arduino 跳跃代码' },
    { name: 'On The Way to Work', kind: 'BOARD GAME · UNESCO', note: 'A strong pick-me-up — a board game about entering the job market.', tools: '卡牌设计 · 规则设计 · 用户研究', img: 'assets/cover-on-the-way.webp', desc: '联合国教科文组织青年教育研究（Centre ART FOR 2023）项目中的桌游，探讨年轻人走向职场的路，获 UNESCO 认证。', role: '游戏设计 · 桌游美术 · 2024 年 5–6 月' }
  ];
  var SPECIALS = ['[学校项目 1]', '[学校项目 2]', '[学校项目 3]', '[学校项目 4]', '[学校项目 5]'];

  // ---------- Settings (tweak here) ----------
  var LIGHT = 0.7;           // beam strength 0.2–1
  var SHADOW = 0.55;         // window shadow strength 0–1
  var LIQ = ['#E9CFB2', '#DA6F41', '#96B99B'];   // About / Works / Contact
  var NAMES = ['ABOUT', 'WORKS', 'CONTACT'];
  var CXF = [0.2484, 0.4991, 0.7509];            // window centres as a fraction of scene width
  var DX = [-210, -70, 60, 190], DW = [12, 16, 10, 14];

  var $ = function (id) { return document.getElementById(id); };
  var pool = $('pool'), root = $('root');
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var busy = false, timers = [];
  var later = function (ms, fn) { timers.push(setTimeout(fn, ms)); };

  // ---------- Hover lighting ----------
  function light(i) {
    for (var n = 0; n < 3; n++) {
      var on = n === i;
      $('sel' + n).style.opacity = on ? 1 : 0;
      $('shadow' + n).style.opacity = on ? Math.min(1, SHADOW + 0.3) : SHADOW;
      $('beam' + n).style.opacity = on ? LIGHT : 0;
      $('bulb' + n).style.opacity = on ? 1 : 0;
      $('halo' + n).style.opacity = on ? LIGHT * 0.9 : 0;
      $('lab' + n).style.color = on ? '#A44A26' : '#272523';
    }
    document.querySelectorAll('.vine').forEach(function (v) { v.style.setProperty('--amp', +v.dataset.win === i ? 4.8 : 2.6); });
    $('stars').style.opacity = i === 1 ? 1 : 0;
    $('aboutfx').style.opacity = i === 0 ? 1 : 0;
    $('hello').style.opacity = i === 2 ? 1 : 0;
    $('cstars').style.opacity = i === 2 ? 1 : 0;
    $('shaker').style.animation = i === 1 ? 'shake 0.42s ease-in-out infinite' : 'none';
  }

  // ---------- Pool helpers ----------
  function setPool(o) {
    if (o.dur !== undefined) pool.style.setProperty('--fillDur', o.dur + 'ms');
    if (o.top !== undefined) pool.style.setProperty('--fillTop', o.top + '%');
    if (o.liq !== undefined) pool.style.setProperty('--liq', o.liq);
  }
  function showContent(on) {
    var c = $('poolContent');
    c.style.opacity = on ? 1 : 0;
    c.style.transform = on ? 'none' : 'translateY(24px)';
  }
  function setDrink(i) {
    document.querySelectorAll('.pane').forEach(function (p) { p.hidden = +p.dataset.pane !== i; });
    $('orderTag').textContent = '✦ YOU ORDERED · ' + NAMES[i] + ' ✦';
    pool.setAttribute('aria-label', NAMES[i].toLowerCase());
    setPool({ liq: LIQ[i] });
  }

  // ---------- Liquid engine ----------
  // Every drop is a circle. A "goo" filter blurs them and sharpens the edge again,
  // so circles that come close melt into one blob and pull thin threads apart.
  var NS = 'http://www.w3.org/2000/svg';
  var fx = document.createElementNS(NS, 'svg');
  fx.setAttribute('class', 'pour-fx'); fx.setAttribute('aria-hidden', 'true');
  fx.innerHTML = '<defs><filter id="goo" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
    '<feGaussianBlur in="SourceGraphic" stdDeviation="6"/>' +
    '<feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"/></filter>' +
    '<linearGradient id="curtGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0">' +
    '<stop offset="0" class="cg-d"/><stop offset=".16" class="cg-b"/><stop offset=".36" class="cg-l"/><stop offset=".52" class="cg-b"/><stop offset=".84" class="cg-b"/><stop offset="1" class="cg-d"/></linearGradient></defs>' +
    '<g filter="url(#goo)"><g id="fxWorld"><path id="fxBody"/><path id="fxRope" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path id="fxCurtain"/><g id="fxDrips"></g></g></g><g id="fxShine"></g><path id="fxLip" fill="none" stroke-linecap="round"/>';
  document.body.appendChild(fx);
  var wf = document.createElementNS(NS, 'svg');
  wf.setAttribute('width', 0); wf.setAttribute('height', 0); wf.setAttribute('aria-hidden', 'true');
  wf.style.position = 'absolute';
  wf.innerHTML = '<filter id="water" x="-5%" y="-5%" width="110%" height="110%">' +
    '<feTurbulence id="wturb" type="fractalNoise" baseFrequency="0.009 0.024" numOctaves="2" seed="4"/>' +
    '<feDisplacementMap id="wdisp" in="SourceGraphic" scale="14" xChannelSelector="R" yChannelSelector="G"/></filter>';
  document.body.appendChild(wf);
  var wturb = wf.querySelector('#wturb'), wdisp = wf.querySelector('#wdisp');
  var world = fx.querySelector('#fxWorld'), body = fx.querySelector('#fxBody'), rope = fx.querySelector('#fxRope'), curtain = fx.querySelector('#fxCurtain'), dripsG = fx.querySelector('#fxDrips'), shineG = fx.querySelector('#fxShine'), lipEl = fx.querySelector('#fxLip'), curtGrad = fx.querySelector('#curtGrad'), gooF = fx.querySelector('#goo'), gooBlur = fx.querySelector('feGaussianBlur');
  var parts = [], spare = [], R = 10, running = false, last = 0;
  var P = null;      // the current pour
  var H = null;      // the hover drip

  function sizeFx() {
    var W = innerWidth, Hh = innerHeight;
    fx.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    gooF.setAttribute('x', -80); gooF.setAttribute('y', -80);
    gooF.setAttribute('width', W + 160); gooF.setAttribute('height', Hh + 160);
    var sw = $('scene').getBoundingClientRect().width;
    R = Math.max(7, sw * 0.0072);
    gooBlur.setAttribute('stdDeviation', (R * 0.5).toFixed(1));
  }
  sizeFx(); window.addEventListener('resize', sizeFx);

  // the inside of each arch, as fractions of the scene: half width, arch top, where the straight sides start, the sill
  var GW = 0.1058, GT = 0.1549, GSP = 0.3333, GS = 0.668;
  function geo(i) {      // where window i's sill is, in page coordinates
    var r = $('scene').getBoundingClientRect(), sw = r.width;
    return { cx: r.left + CXF[i] * sw, sill: r.top + scrollY + r.height * 0.6603, half: sw * 0.05, sw: sw };
  }
  function dot(x, y, r, kind, vx, vy) {
    var el = spare.pop() || document.createElementNS(NS, 'circle');
    world.appendChild(el);
    var d = { x: x, y: y, r: r, vx: vx || 0, vy: vy || 0, kind: kind, el: el, age: 0 };
    parts.push(d); return d;
  }
  function drop(d) { d.dead = true; }
  function clearAll() {
    parts.forEach(function (d) { d.el.remove(); spare.push(d.el); });
    parts = []; body.setAttribute('d', ''); rope.setAttribute('d', '');
  }
  function mix(a, b, k) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), o = '#';
    [16, 8, 0].forEach(function (sh) { var c = Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k); o += (c < 16 ? '0' : '') + c.toString(16); });
    return o;
  }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t) { return Math.max(0, Math.min(1, t)); }

  function surfaceY(x, t) {    // the wavy top of the rising drink
    if (!P || P.level == null) return Infinity;
    var A = P.amp;
    var y = P.level + A * (0.6 * Math.sin(x * 0.011 + t * 0.0042) + 0.4 * Math.sin(x * 0.026 - t * 0.0067));
    var dx = (x - P.hitX) / (P.glassHalf ? P.glassHalf * 1.4 : R * 7);
    y -= P.crown * Math.exp(-dx * dx);          // the stream pushes up a little crown where it lands
    return Math.max(P.poolTop, y);
  }

  function frame(now) {
    var dt = Math.min(0.033, (now - last) / 1000 || 0.016); last = now;
    var g = R * 260;             // gravity, scaled to the drawing
    world.setAttribute('transform', 'translate(0 ' + (-scrollY) + ')');

    // --- the pour timeline ---
    if (P) {
      var t = now - P.t0, G = P.g;
      // 1. the window fills up like a glass
      var fill = ease(t / 1300);
      P.lv = lerp(1.02, -0.1, fill);
      var gb = P.glassBox, waveA = (R * 0.7) / gb.height;
      drawGlass(P, t, waveA * (1 - 0.5 * clamp01((t - 1300) / 600)));
      if (P.arcs) { runArcs(P, t, now); }
      // 2. the drink rises over the screen as a seam: above it the bar, just under its surface the bar
      //    seen through the drink, and below a ragged ink-bleed edge the menu page itself
      else if (t > 1150) {
        if (!P.sea) { setPool({ dur: 0, top: 0 }); showContent(true); P.sea = makeSea(P.i); }
        var kr = ease((t - 1150) / 1650);
        drawSea(P, t, lerp(1.03, -0.42, kr), (R * 0.9) / innerHeight, clamp01((t - 1150) / 1650));
      }
      if (!P.arcs && t > 2850 && !P.handed) {         // the menu is fully revealed: jump there for real
        P.handed = true;
        scrollTo(0, P.poolTop);
        if (P.sea) { P.sea.remove(); P.sea = null; }
      }
      if (t > (P.arcs ? 3240 : 3400)) {
        if (P.arcLayer) { P.arcLayer.remove(); P.arcLayer = null; }
        if (P.sea) { P.sea.remove(); P.sea = null; }
        if (P.glass) { P.glass.remove(); P.glass = null; }
        P.film.forEach(drop); P = null; busy = false; light(null);
      }
    }

    // --- hover: one drop swells under the sill and falls ---
    if (H && !P) {
      var ht = (now - H.t0) % 1800, e2 = ease(ht / 1150);
      if (!H.anchor) { H.anchor = dot(H.g.cx, H.g.sill, 0, 'fixed'); H.bead = dot(H.g.cx, H.g.sill, 0, 'fixed'); }
      H.anchor.r = R * 0.55 * Math.min(1, ht / 300);
      if (ht < 1150) { H.bead.y = H.g.sill + R * (0.3 + 1.5 * e2); H.bead.r = R * (0.25 + 0.6 * e2); H.dropped = false; }
      else if (!H.dropped) {
        H.dropped = true;
        var fd = dot(H.bead.x, H.bead.y, H.bead.r, 'hint', 0, R * 4); fd.y0 = fd.y;
        H.bead.r = 0;
      }
    }

    // --- move every falling drop ---
    for (var n = 0; n < parts.length; n++) {
      var d = parts[n];
      if (d.kind === 'fall' || d.kind === 'splash' || d.kind === 'hint') {
        d.vy += g * dt;
        
        d.vx *= 0.985;
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.kind === 'fall') d.r *= 1 - 0.05 * dt;
        var sy = surfaceY(d.x, now);
        if (d.y + d.r * 0.2 > sy) {
          if (d.kind === 'fall' && Math.random() < 0.3) {
            var m = 1 + (Math.random() < .4);
            for (var j = 0; j < m; j++) dot(d.x, sy - R * 0.5, R * (0.55 + Math.random() * 0.25), 'splash',
              (Math.random() - .5) * R * 40, -R * (22 + Math.random() * 28));
          }
          drop(d);
        }
        if (d.kind === 'splash' && d.vy > 0 && d.y > sy - R) drop(d);
        if (d.kind === 'hint') { var fall = d.y - d.y0; d.r *= 1 - 2.2 * dt; if (fall > R * 14 || d.r < 1) drop(d); }
        if (d.y - scrollY > innerHeight + 200) drop(d);
      }
    }
    for (var m2 = parts.length - 1; m2 >= 0; m2--) {
      var q = parts[m2];
      if (q.dead) { q.el.remove(); spare.push(q.el); parts.splice(m2, 1); continue; }
      q.el.setAttribute('cx', q.x.toFixed(1)); q.el.setAttribute('cy', q.y.toFixed(1));
      q.el.setAttribute('r', Math.max(0, q.r).toFixed(1));
      q.el.setAttribute('fill', q.color || (P ? P.color : (H ? LIQ[H.i] : '#000')));
    }

    if (P || H || parts.length) requestAnimationFrame(frame);
    else { running = false; fx.classList.remove('on'); }
  }
  function run() { if (!running) { running = true; fx.classList.add('on'); last = performance.now(); requestAnimationFrame(frame); } }

  // a small floating "click" under the sill of the window you're pointing at
  function showHint(i) {
    document.querySelectorAll('.hint').forEach(function (h, n) { h.classList.toggle('on', n === i); });
  }
  function hoverDrip(i) {
    if (calm) return;
    if (H) { H.anchor && drop(H.anchor); H.bead && drop(H.bead); H = null; }
    if (i === null || busy) return;
    H = { i: i, g: geo(i), t0: performance.now() };
    run();
  }

  // ---------- The window as a glass ----------
  function makeGlass(i) {
    var L = CXF[i] - GW, Wd = 2 * GW, Hd = GS - GT;
    var g = document.createElement('div');
    g.className = 'glass';
    g.style.cssText = 'left:' + (L * 100) + '%;top:' + (GT * 100) + '%;width:' + (Wd * 100) + '%;height:' + (Hd * 100) + '%';
    g.innerHTML = '<div class="glass-in"><div class="refr"><div class="clone"></div></div><div class="tint"></div><div class="bubbles"></div></div>' +
      '<svg class="glass-line" viewBox="0 0 1000 1000" preserveAspectRatio="none"><path class="hl1"/><path class="hl2"/></svg>';
    var c = g.querySelector('.clone'), barEl = $('barLayer');
    // only what sits behind the liquid gets refracted
    Array.prototype.some.call($('scene').children, function (el) {
      if (el === barEl) return true;
      c.appendChild(el.cloneNode(true)); return false;
    });
    c.querySelectorAll('[id]').forEach(function (e) { e.removeAttribute('id'); });
    c.style.cssText = 'left:' + (-L / Wd * 100) + '%;top:' + (-GT / Hd * 100) + '%;width:' + (100 / Wd) + '%;height:' + (100 / Hd) + '%';
    g.querySelector('.tint').style.background = LIQ[i];
    var bb = g.querySelector('.bubbles');
    for (var n = 0; n < 10; n++) {
      var b = document.createElement('i'), sz = 4 + Math.random() * 7;
      b.style.cssText = 'left:' + (8 + Math.random() * 84) + '%;width:' + sz + 'px;height:' + sz + 'px;animation-delay:' + (-Math.random() * 2.4).toFixed(2) + 's;animation-duration:' + (1.8 + Math.random() * 1.4).toFixed(2) + 's';
      bb.appendChild(b);
    }
    $('scene').insertBefore(g, $('barLayer'));   // in front of the lamps, behind the bar
    return g;
  }
  var ys = (GSP - GT) / (GS - GT);         // where the arch meets the straight sides, inside the glass box
  function halfAt(y) { return y >= ys ? 0.5 : 0.5 * Math.sqrt(Math.max(0, 1 - Math.pow((ys - y) / ys, 2))); }
  function drawGlass(P, t, A) {
    if (!P.glass) return;
    var lv = P.lv, inn = P.glass.querySelector('.glass-in');
    var wave = function (x) { return lv + A * (0.6 * Math.sin(x * 9 + t * 0.005) + 0.4 * Math.sin(x * 21 - t * 0.008)); };
    var top = [], hw = halfAt(Math.max(0, lv)), N = 24;
    for (var n = 0; n <= N; n++) { var x = 0.5 - hw + 2 * hw * n / N; top.push([x, Math.max(0, wave(x))]); }
    var poly = top.map(function (p) { return (p[0] * 100).toFixed(2) + '% ' + (p[1] * 100).toFixed(2) + '%'; });
    for (var y = Math.ceil(lv * 20) / 20; y <= 1.0001; y += 0.05) poly.push(((0.5 + halfAt(y)) * 100).toFixed(2) + '% ' + (Math.min(1, y) * 100).toFixed(2) + '%');
    poly.push('100% 100%', '0% 100%');
    for (y = 1; y >= lv; y -= 0.05) poly.push(((0.5 - halfAt(y)) * 100).toFixed(2) + '% ' + (y * 100).toFixed(2) + '%');
    inn.style.clipPath = 'polygon(' + poly.join(',') + ')';
    var hl = top.slice(3, -3).map(function (p) { return (p[0] * 1000).toFixed(1) + ' ' + ((p[1] + 0.012) * 1000).toFixed(1); });
    P.glass.querySelector('.hl1').setAttribute('d', hl.length ? 'M' + hl.join(' L') : '');
    var hl2 = top.slice(6, 11).map(function (p) { return (p[0] * 1000).toFixed(1) + ' ' + ((p[1] + 0.05) * 1000).toFixed(1); });
    P.glass.querySelector('.hl2').setAttribute('d', hl2.length ? 'M' + hl2.join(' L') : '');
    wturb.setAttribute('baseFrequency', '0.009 ' + (0.024 + 0.004 * Math.sin(t * 0.004)).toFixed(4));
  }

  // ---------- Works: giant circles slicing across the screen ----------
  // Three huge discs (cream, green, then the drink). The first grows out of the filled window; the other two
  // have their centres far off screen, so only their curved edges sweep across. Each edge has a faint ripple
  // and a thin ring running just outside it. The drink disc carries little stars.
  var STAR = 'M0-1L.18-.18 1 0 .18.18 0 1-.18.18-1 0-.18-.18Z';
  function makeArcs(P) {
    var W = innerWidth, Hh = innerHeight, g = P.glass.getBoundingClientRect();
    var wx = g.left + g.width / 2, wy = g.top + g.height * 0.55;
    var far = function (x, y) { return Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, Hh - y), Math.hypot(W - x, Hh - y)) * 1.04; };
    var near = function (x, y) { var dx = Math.max(0, -x, x - W), dy = Math.max(0, -y, y - Hh); return Math.hypot(dx, dy); };
    var d = [
      { col: '#7FA585', ring: '#E9E7DB', x: wx, y: wy, t0: 1100, dur: 560, ph: 1.7 },
      { col: P.color, ring: '#E9E7DB', x: 1.55 * W, y: -0.6 * Hh, t0: 2150, dur: 460, ph: 2.6, stars: true }
    ];
    d.forEach(function (c) { c.r0 = c === d[0] ? g.width * 0.45 : near(c.x, c.y); c.r1 = far(c.x, c.y); });
    var el = document.createElement('div');
    el.className = 'arcs'; el.setAttribute('aria-hidden', 'true');
    var svg = '<svg class="arc-rings" width="' + W + '" height="' + Hh + '">';
    d.forEach(function (c, n) {
      svg += '<circle class="rg' + n + 'a" fill="none" stroke="' + c.ring + '" stroke-width="2" cx="' + c.x + '" cy="' + c.y + '" r="0" opacity="0"/>';
      svg += '<circle class="rg' + n + 'b" fill="none" stroke="' + c.ring + '" stroke-width="1" cx="' + c.x + '" cy="' + c.y + '" r="0" opacity="0"/>';
      c.dots = [];
      for (var q = 0; q < 3; q++) { c.dots.push({ a: Math.random() * Math.PI * 2, off: R * (3 + Math.random() * 5), sz: R * (0.35 + Math.random() * 0.5) });
        svg += '<circle class="dt' + n + '_' + q + '" fill="' + (n === 2 ? '#DA6F41' : c.col) + '" r="0"/>'; }
    });
    svg += '</svg>';
    var html = '';
    // what rides inside each layer: the giant word (a different colour per layer), the bartender, small labels
    var big = [['WORKS', '#E9E7DB'], ["TONIGHT'S<br>MENU", '#272523']];
    var lab = [['SHAKEN, NOT STIRRED', 'POUR 01 / 02'], ["TONIGHT'S POUR", 'SERVED COLD · 5 SIGNATURES']];
    d.forEach(function (c, n) {
      html += '<div class="arc arc' + n + '" style="background:' + c.col + '"><div class="arc-grain"></div>';
      if (c.stars) {
        html += '<svg class="arc-stars" width="' + W + '" height="' + Hh + '">';
        for (var k = 0; k < 18; k++) {
          var sz = 7 + Math.random() * 12;
          html += '<path d="' + STAR + '" fill="#F3E7DA" style="animation-delay:' + (-Math.random() * 2).toFixed(2) + 's" transform="translate(' + (Math.random() * W).toFixed(0) + ' ' + (Math.random() * Hh).toFixed(0) + ') scale(' + sz.toFixed(1) + ')"/>';
        }
        html += '</svg>';
      }
      html += '<div class="arc-word aw' + n + '" style="color:' + big[n][1] + '">' + big[n][0] + '</div>';
      if (n === 0) html += '<div class="arc-sil"><div class="j j-upper_b"><div class="pt pt-upper_b"></div><div class="j j-fore_b"><div class="pt pt-fore_b"></div></div></div><div class="pt pt-body"></div><div class="j j-upper_f"><div class="pt pt-upper_f"></div><div class="j j-fore_f"><div class="pt pt-fore_f"></div><div class="j j-shaker"><div class="pt pt-shaker"></div></div></div></div><svg class="sil-waves" viewBox="-50 -50 100 100"><circle r="0"/><circle r="0"/><circle r="0"/></svg></div>';
      html += '<div class="arc-lab al-a" style="color:#E9E7DB">' + lab[n][0] + '</div>';
      html += '<div class="arc-lab al-b" style="color:#E9E7DB">' + lab[n][1] + '</div>';
      html += '</div>';
    });
    el.innerHTML = html + svg;
    document.body.appendChild(el);
    P.arcLayer = el; P.arcD = d;
  }
  function disc(c, r, t) {
    var pts = [], N = 96, amp = Math.min(R * 0.55, r * 0.02);
    for (var k = 0; k < N; k++) {
      var a = k / N * Math.PI * 2, rr = r + amp * (Math.sin(a * 14 + t * 0.006 + c.ph) + 0.6 * Math.sin(a * 23 - t * 0.009));
      pts.push((c.x + rr * Math.cos(a)).toFixed(1) + 'px ' + (c.y + rr * Math.sin(a)).toFixed(1) + 'px');
    }
    return 'polygon(' + pts.join(',') + ')';
  }
  // the bartender shakes the shaker; every shake sends out a thin ring
  function shakeSil(L, ts) {
    var sil = L.querySelector('.arc-sil'); if (!sil) return;
    // the figure stays still; the shaker gives two easy shakes, and each one sends out a thin ring
    var cyc = 600, n = Math.floor(ts / cyc), u = (ts % cyc) / cyc;
    var sw = n < 2 ? Math.sin(u * Math.PI * 2) * (1 - u * 0.3) : 0;
    // shoulders lift, elbows follow, the shaker tips in the hands
    var q = function (c, deg) { var e = sil.querySelector('.j-' + c); if (e) e.style.transform = 'rotate(' + deg.toFixed(2) + 'deg)'; };
    q('upper_f', -4 * sw); q('fore_f', 7 * sw); q('shaker', -5 * sw);
    q('upper_b', -3 * sw); q('fore_b', 5 * sw);
    sil.querySelectorAll('.sil-waves circle').forEach(function (ci, q) {
      var ph = (ts - q * cyc) / 900;
      if (ph < 0 || ph > 1 || q > 1) { ci.setAttribute('opacity', 0); return; }
      ci.setAttribute('r', (8 + ph * 44).toFixed(1)); ci.setAttribute('opacity', (0.9 * (1 - ph)).toFixed(2));
    });
  }
  function runArcs(P, t, now) {
    if (t < 1100) return;
    if (!P.arcLayer) makeArcs(P);
    var L = P.arcLayer, done = true;
    P.arcD.forEach(function (c, n) {
      var k = clamp01((t - c.t0) / c.dur);
      if (k < 1) done = false;
      var e = n === 0 ? 1 - Math.pow(1 - k, 2.2) : 1 - Math.pow(1 - k, 3);
      var r = lerp(c.r0, c.r1, e);
      var lay = L.querySelector('.arc' + n);
      if (c.full) { if (n === 0) shakeSil(L, t - c.t0); var wf = L.querySelector('.aw' + n); if (wf) wf.style.transform = n === 1 ? 'translate(' + (6 * (1 - ease(clamp01((t - c.t0) / 700)))).toFixed(2) + 'vw, -50%)' : 'translate(' + (10 - 20 * clamp01((t - c.t0) / 1100)).toFixed(2) + 'vw, -50%)'; return; }
      if (k >= 1) {                       // it covers the screen: stop redrawing it, and drop the layers under it
        c.full = true; lay.style.clipPath = 'none'; lay.style.willChange = 'auto';
        for (var m = 0; m < n; m++) { var u = L.querySelector('.arc' + m); if (u) u.remove(); P.arcD[m].full = true; }
        L.querySelectorAll('[class^="rg"], [class^="dt"]').forEach(function (e) { e.setAttribute('opacity', 0); });
        return;
      }
      lay.style.clipPath = k <= 0 ? 'circle(0 at 0 0)' : disc(c, r, t);
      var ring = L.querySelector('.rg' + n + 'a'), ring2 = L.querySelector('.rg' + n + 'b'), op = k <= 0 ? 0 : 0.85 * (1 - clamp01((k - 0.7) / 0.3));
      ring.setAttribute('r', (r + R * 2.4).toFixed(1)); ring.setAttribute('opacity', op.toFixed(2));
      ring2.setAttribute('r', (r + R * (5.5 + 2 * e)).toFixed(1)); ring2.setAttribute('opacity', (op * 0.6).toFixed(2));
      // a few drops riding just outside the edge, aimed at the screen centre
      var ca = Math.atan2(innerHeight / 2 - c.y, innerWidth / 2 - c.x);
      c.dots.forEach(function (dp, q) {
        var el2 = L.querySelector('.dt' + n + '_' + q), a = ca + (dp.a - Math.PI) * 0.25, rr = r + dp.off;
        el2.setAttribute('cx', (c.x + rr * Math.cos(a)).toFixed(1)); el2.setAttribute('cy', (c.y + rr * Math.sin(a)).toFixed(1));
        el2.setAttribute('r', (k <= 0 ? 0 : dp.sz * (1 - k * 0.6)).toFixed(1));
      });
      // the giant word drifts across while its layer is on screen
      var w = L.querySelector('.aw' + n);
      if (w) w.style.transform = n === 1 ? 'translate(' + (6 * (1 - ease(clamp01((t - c.t0) / 700)))).toFixed(2) + 'vw, -50%)' : 'translate(' + (10 - 20 * clamp01((t - c.t0) / 1100)).toFixed(2) + 'vw, -50%)';
      if (n === 0) shakeSil(L, t - c.t0);
    });
    // fully covered: move the page to the menu underneath, hold a breath, then let the drink clear
    if (t > 2680 && !P.handed) {
      P.handed = true;
      if (P.glass) { P.glass.remove(); P.glass = null; }
      setPool({ dur: 0, top: 0 }); scrollTo(0, P.poolTop);
    }
    if (t > 2840) {
      if (!P.shown) { P.shown = true; showContent(true); }
      L.style.opacity = (1 - clamp01((t - 2840) / 340)).toFixed(3);
    }
  }

  // ---------- The whole screen as a glass ----------
  function makeSea(i) {
    var sw = document.querySelector('.stage-wrap'), r = sw.getBoundingClientRect();
    var s = document.createElement('div');
    s.className = 'sea'; s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<div class="sea-next"></div><div class="sea-in"><div class="refr"><div class="sea-clone"></div></div><div class="tint"></div><div class="bubbles"></div></div>' +
      '<svg class="sea-line" viewBox="0 0 1000 1000" preserveAspectRatio="none"><path class="hl1"/><path class="hl2"/></svg>';
    var holder = s.querySelector('.sea-clone'), copy = sw.cloneNode(true);
    copy.querySelectorAll('[id]').forEach(function (e) { e.removeAttribute('id'); });
    holder.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
    holder.appendChild(copy);
    s.querySelector(':scope > .sea-in > .tint').style.background = LIQ[i];
    var next = pool.cloneNode(true);
    next.querySelectorAll('[id]').forEach(function (e) { e.removeAttribute('id'); });
    next.querySelectorAll('.pool-content, [class*="content"]').forEach(function (e) { e.style.transition = 'none'; e.style.opacity = 1; e.style.transform = 'none'; });
    next.style.transition = 'none';
    s.querySelector(':scope > .sea-next').appendChild(next);
    var bb = s.querySelector(':scope > .sea-in > .bubbles');
    for (var n = 0; n < 34; n++) {
      var b = document.createElement('i'), sz = 5 + Math.random() * 11;
      b.style.cssText = 'left:' + (2 + Math.random() * 96) + '%;width:' + sz + 'px;height:' + sz + 'px;animation-delay:' + (-Math.random() * 3).toFixed(2) + 's;animation-duration:' + (2.2 + Math.random() * 2).toFixed(2) + 's';
      bb.appendChild(b);
    }
    document.body.appendChild(s);
    return s;
  }
  function drawSea(P, t, lv, A, k) {
    var N = 90, top = [], bot = [], band = 0.16 + 0.04 * Math.sin(t * 0.002);
    if (!P.fingers) {                     // where the ink-bleed fingers reach up into the drink
      P.fingers = [];
      for (var f = 0; f < 14; f++) P.fingers.push({ x: Math.random(), w: 0.006 + Math.random() * 0.018, h: 0.02 + Math.random() * 0.07, ph: Math.random() * 6 });
    }
    for (var n = 0; n <= N; n++) {
      var x = n / N;
      top.push([x, lv + A * (0.6 * Math.sin(x * 11 + t * 0.005) + 0.4 * Math.sin(x * 27 - t * 0.008))]);
      var e = lv + band + 0.018 * Math.sin(x * 7 + t * 0.003) + 0.01 * Math.sin(x * 23 - t * 0.005) + 0.005 * Math.sin(x * 61 + t * 0.009);
      P.fingers.forEach(function (fg) { var d = (x - fg.x) / fg.w; e -= fg.h * (0.7 + 0.3 * Math.sin(t * 0.004 + fg.ph)) * Math.exp(-d * d); });
      bot.push([x, e]);
    }
    var pc = function (p) { return (p[0] * 100).toFixed(2) + '% ' + (p[1] * 100).toFixed(2) + '%'; };
    // the band of drink: from the surface down to the bleed edge
    P.sea.querySelector(':scope > .sea-in').style.clipPath = 'polygon(' + top.map(pc).concat(bot.slice().reverse().map(pc)).join(',') + ')';
    // the menu page: everything below the bleed edge
    P.sea.querySelector(':scope > .sea-next').style.clipPath = 'polygon(' + bot.map(pc).join(',') + ',100% 110%,0% 110%)';
    var hl = top.map(function (p) { return (p[0] * 1000).toFixed(1) + ' ' + ((p[1] + 0.006) * 1000).toFixed(1); });
    P.sea.querySelector(':scope > .sea-line .hl1').setAttribute('d', 'M' + hl.join(' L'));
    var hl2 = top.slice(18, 50).map(function (p) { return (p[0] * 1000).toFixed(1) + ' ' + ((p[1] + 0.03) * 1000).toFixed(1); });
    P.sea.querySelector(':scope > .sea-line .hl2').setAttribute('d', 'M' + hl2.join(' L'));
  }

  // ---------- The pour ----------
  function pour(i) {
    if (busy) return;
    busy = true;
    showHint(null);
    light(i);
    showContent(false);
    if (calm) {
      setDrink(i); setPool({ dur: 0, top: 0 });
      pool.scrollIntoView({ block: 'start' }); showContent(true);
      light(null); busy = false; return;
    }
    setPool({ dur: 0, top: 100 });
    var G = geo(i);
    P = { t0: performance.now(), i: i, g: G, color: LIQ[i], y0: scrollY,
          poolTop: pool.getBoundingClientRect().top + scrollY,
          film: [], drips: [], lv: 1.02, arcs: i === 1 };
    P.glass = makeGlass(i);
    P.glassBox = P.glass.getBoundingClientRect();
    P.glassHalf = P.glassBox.width / 2;
    wdisp.setAttribute('scale', (R * 1.3).toFixed(1));
    setTimeout(function () { setDrink(i); setPool({ dur: 0, top: 100 }); }, 700);
    run();
  }

  // ---------- Menu ----------
  var mi = 0;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderMenu() {
    $('menuList').innerHTML = PROJECTS.map(function (p, n) {
      return '<button class="mrow' + (n === mi ? ' on' : '') + '" type="button" data-mi="' + n + '">' +
        '<span class="num">No.0' + (n + 1) + '</span><span class="dish-col"><span class="dish-line">' +
        '<span class="dish">' + esc(p.name) + '</span><span class="leader" aria-hidden="true"></span><span class="kind">' + esc(p.kind) + '</span></span>' +
        '<span class="note">' + esc(p.note) + '</span><span class="tools">配料 · ' + esc(p.tools) + '</span></span></button>';
    }).join('');
    $('specialList').innerHTML = SPECIALS.map(function (s, n) {
      return '<div class="special"><span class="num">No.0' + (n + 6) + '</span><span class="dish-line"><span class="dish">' + esc(s) +
        '</span><span class="leader" aria-hidden="true"></span><span class="soon">COMING SOON</span></span></div>';
    }).join('');
    var p = PROJECTS[mi];
    $('pvImg').src = p.img; $('pvImg').alt = p.name + ' 封面';
    $('pvName').textContent = p.name; $('pvDesc').textContent = p.desc; $('pvRole').textContent = '我的角色 · ' + p.role;
  }
  function pick(n) {
    if (n === mi) return;
    mi = n;
    document.querySelectorAll('.mrow').forEach(function (r) { r.classList.toggle('on', +r.dataset.mi === mi); });
    var p = PROJECTS[mi];
    $('pvImg').src = p.img; $('pvImg').alt = p.name + ' 封面';
    $('pvName').textContent = p.name; $('pvDesc').textContent = p.desc; $('pvRole').textContent = '我的角色 · ' + p.role;
  }
  $('menuList').addEventListener('mouseover', function (e) { var r = e.target.closest('.mrow'); if (r) pick(+r.dataset.mi); });
  $('menuList').addEventListener('focusin', function (e) { var r = e.target.closest('.mrow'); if (r) pick(+r.dataset.mi); });
  $('menuList').addEventListener('click', function (e) { var r = e.target.closest('.mrow'); if (r) pick(+r.dataset.mi); });

  // ---------- Wiring ----------
  document.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { pour(+b.dataset.go); }); });
  document.querySelectorAll('[data-en]').forEach(function (b) {
    var i = +b.dataset.en;
    var on = function () { if (!busy) { light(i); showHint(i); } }, off = function () { if (!busy) { light(null); showHint(null); } };
    b.addEventListener('mouseenter', on); b.addEventListener('focus', on);
    b.addEventListener('mouseleave', off); b.addEventListener('blur', off);
  });
  $('toTop').addEventListener('click', function () { root.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }); });

  // ---------- Scroll parallax ----------
  var stageWrap = document.querySelector('.stage-wrap'), ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var h = stageWrap.offsetHeight || 1;
      document.documentElement.style.setProperty('--p', Math.max(0, Math.min(1, scrollY / h)).toFixed(4));
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- The giant word: as wide as the bar, from the cream sky down to the sill ----------
  function fitWord() {
    var sc = $('scene'), r = sc.getBoundingClientRect(), wr = stageWrap.getBoundingClientRect();
    var W = r.width, H = stageWrap.offsetHeight, ah = r.top - wr.top;
    var fs = W * 0.97 / 3.826;                        // Anton: PORTFOLIO is 3.83em wide
    var capTop = Math.max(ah * 0.3, 70), base = ah + r.height * 0.62;
    var k = (base - capTop) / (fs * 0.859);           // stretch the capitals to fill that height
    document.querySelectorAll('.bigword').forEach(function (svg) {
      svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      if (svg.classList.contains('bw-in')) svg.style.top = (-ah) + 'px';
      var t = svg.querySelector('text');
      t.setAttribute('x', W / 2); t.setAttribute('y', base);
      t.setAttribute('font-size', fs.toFixed(1)); t.setAttribute('textLength', (W * 0.97).toFixed(1));
      t.setAttribute('transform', 'translate(0 ' + base.toFixed(1) + ') scale(1 ' + k.toFixed(3) + ') translate(0 ' + (-base).toFixed(1) + ')');
    });
  }
  fitWord(); window.addEventListener('resize', fitWord);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWord);

  // ---------- Decode the transition's images ahead of time (otherwise the first frame can flash a solid block) ----------
  (function preload() {
    var keep = window.__pre = [];
    try {
      Array.prototype.forEach.call(document.styleSheets, function (sh) {
        Array.prototype.forEach.call(sh.cssRules || [], function (r) {
          (r.cssText.match(/url\("([^"]+\.png|data:image\/png;base64,[^"]+)"\)/g) || []).forEach(function (u) {
            var img = new Image(); img.src = u.slice(5, -2); keep.push(img); if (img.decode) img.decode().catch(function () {});
          });
        });
      });
    } catch (e) {}
    // also paint the silhouette once, invisibly, so the browser has its masks ready
    var warm = document.createElement('div');
    warm.setAttribute('aria-hidden', 'true');
    warm.style.cssText = 'position:fixed;left:0;bottom:0;width:120px;height:100px;opacity:.01;pointer-events:none;z-index:-1';
    warm.innerHTML = '<div class="arc-sil" style="width:120px"><div class="j j-upper_b"><div class="pt pt-upper_b"></div><div class="j j-fore_b"><div class="pt pt-fore_b"></div></div></div><div class="pt pt-body"></div><div class="j j-upper_f"><div class="pt pt-upper_f"></div><div class="j j-fore_f"><div class="pt pt-fore_f"></div><div class="j j-shaker"><div class="pt pt-shaker"></div></div></div></div><svg class="sil-waves" viewBox="-50 -50 100 100"><circle r="0"/><circle r="0"/><circle r="0"/></svg></div><div class="arc-grain"></div>';
    document.body.appendChild(warm);
    setTimeout(function () { warm.remove(); }, 4000);
  })();

  // ---------- Initial state ----------
  light(null);
  setDrink(1);
  setPool({ dur: 0, top: 0 });
  renderMenu();
})();
