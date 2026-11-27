// Qiuye Zhu · Portfolio — bar scene interactions and the "pour" transition.
(function () {
  'use strict';

  // ---------- Content ----------
  var PROJECTS = [
    { name: 'The Path of Rose', cn: '寻玫瑰', kindCn: '四人团队 · 3D 解谜', kind: 'TEAM OF 4 · 3D PUZZLE', note: 'Sweet with thorns — a journey through The Little Prince.', tools: 'Blender · 3D 游戏引擎 · 关卡设计', img: 'assets/cover-path-of-rose.webp', desc: '以《小王子》为蓝本、以“爱的诠释”为主题的 3D 解谜冒险：在房子与花园间寻找玫瑰，穿过魔法传送门解开谜题。', role: '组长 · 第二关关卡设计 · 动画' },
    { name: 'The Second Chance', cn: '没有下次', kindCn: '个人作品 · 叙事解谜', kind: 'SOLO · NARRATIVE GAME', note: 'Bitter, served neat — who gets to grant a second chance?', tools: 'RPG Maker · Blender · Unreal · Ai · Ps', img: 'assets/cover-second-chance.webp', desc: '一款关于宽恕的解谜叙事游戏：罪人可以重新开始，可受害者呢？核心理念是，第二次机会应该由受害者决定。', role: '独立完成：策划、关卡、美术、开发' },
    { name: 'Dusk Game', cn: '黄昏游戏', kindCn: '游戏设计 · 2D', kind: 'GAME DESIGN · 2D', note: 'Smoky, best at dusk — a game of shadows and hide-and-seek.', tools: 'Procreate · Ps · Ae · Unreal', img: 'assets/cover-dusk-game.webp', desc: '从“黄昏不要玩捉迷藏”的民间说法出发，玩家化身影子在废弃工厂里寻找回家的路，核心概念是孤立与联结。', role: '游戏设计 · 故事板 · 序列帧美术' },
    { name: 'Oops! Wrong Choice', cn: '哎呀，选错了？', kindCn: '双人合作 · 互动装置', kind: 'DUO · INSTALLATION', note: 'Fizzy and unpredictable — every jump leaves a mark.', tools: 'Blender · Python · Arduino · Unreal', img: 'assets/cover-oops.webp', desc: '一件用身体操控的互动游戏装置：你做的每个选择都会在人生上留下印记，映照出你的价值观与身份。', role: '游戏设计 · 场景搭建 · 玩法蓝图 · Arduino 跳跃代码' },
    { name: 'On The Way to Work', cn: '上班路上', kindCn: '桌游 · UNESCO 项目', kind: 'BOARD GAME · UNESCO', note: 'A strong pick-me-up — a board game about entering the job market.', tools: '卡牌设计 · 规则设计 · 用户研究', img: 'assets/cover-on-the-way.webp', desc: '联合国教科文组织青年教育研究（Centre ART FOR 2023）项目中的桌游，探讨年轻人走向职场的路，获 UNESCO 认证。', role: '游戏设计 · 桌游美术 · 2024 年 5–6 月' }
  ];

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
    pool.classList.toggle('is-works', i === 1);
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
      if (t > (P.arcs ? SHRINK0 + SHRINK_MS + 80 : 3400)) {
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
  // Everything is painted onto ONE canvas each frame: two huge discs (green, then the drink), their contents,
  // the thin rings and drops. Painting one image is steady on every machine; stacking clipped full-screen
  // layers made Chrome on the Mac flash.
  var RIG = { aspect: 1.13949, j: {"shoulder_f": [0.3811, 0.7196], "elbow_f": [0.5243, 0.7851], "shoulder_b": [0.5013, 0.5844], "elbow_b": [0.7499, 0.6718], "grip_f": [0.8093, 0.3197], "grip_b": [0.8582, 0.3157]}, parts: ['upper_b', 'fore_b', 'body', 'upper_f', 'fore_f', 'shaker'], img: {} };
  RIG.parts.forEach(function (n) { var im = new Image(); im.src = 'assets/rig/' + n + '.png'; if (im.decode) im.decode().catch(function () {}); RIG.img[n] = im; });
  var GRAIN = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 160;
    var x = c.getContext('2d'), d = x.createImageData(160, 160);
    for (var q = 0; q < d.data.length; q += 4) { var v = Math.random(); d.data[q] = 38; d.data[q + 1] = 34; d.data[q + 2] = 30; d.data[q + 3] = v > 0.82 ? (v - 0.82) / 0.18 * 70 : 0; }
    x.putImageData(d, 0, 0); return c;
  })();
  function makeArcs(P) {
    var W = innerWidth, Hh = innerHeight, g = P.glass.getBoundingClientRect();
    var wx = g.left + g.width / 2, wy = g.top + g.height * 0.55;
    var far = function (x, y) { return Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, Hh - y), Math.hypot(W - x, Hh - y)) * 1.04; };
    var near = function (x, y) { var dx = Math.max(0, -x, x - W), dy = Math.max(0, -y, y - Hh); return Math.hypot(dx, dy); };
    var d = [
      { col: '#7FA585', ring: '#E9E7DB', x: wx, y: wy, t0: 1100, dur: 560, ph: 1.7, r0: g.width * 0.45 },
      { col: P.color, ring: '#E9E7DB', x: 1.55 * W, y: -0.6 * Hh, t0: 1700, dur: 430, ph: 2.6 }
    ];
    d.forEach(function (c, n) {
      if (n) c.r0 = near(c.x, c.y);
      c.r1 = far(c.x, c.y);
      c.dots = [];
      for (var q = 0; q < 3; q++) c.dots.push({ a: Math.random() * Math.PI * 2, off: R * (3 + Math.random() * 5), sz: R * (0.35 + Math.random() * 0.5) });
    });
    var stars = [];
    for (var q = 0; q < 18; q++) stars.push({ x: Math.random() * W, y: Math.random() * Hh, s: 7 + Math.random() * 12 });
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var el = document.createElement('div');
    el.className = 'arcs'; el.setAttribute('aria-hidden', 'true');
    var cv = document.createElement('canvas');
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr);
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    el.appendChild(cv); document.body.appendChild(el);
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    P.arcLayer = el; P.arcD = d; P.arcCtx = ctx; P.arcW = W; P.arcH = Hh; P.arcStars = stars;
    P.arcGrain = ctx.createPattern(GRAIN, 'repeat');
  }
  function wavyCircle(ctx, c, r, t) {
    var N = 160, amp = Math.min(R * 0.55, r * 0.02);
    ctx.beginPath();
    for (var k = 0; k <= N; k++) {
      var a = k / N * Math.PI * 2, rr = r + amp * (Math.sin(a * 14 + t * 0.006 + c.ph) + 0.6 * Math.sin(a * 23 - t * 0.009));
      var x = c.x + rr * Math.cos(a), y = c.y + rr * Math.sin(a);
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function label(ctx, txt, x, y, align, col) {
    ctx.font = '600 13px "Barlow Condensed", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2.9px';
    ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y); ctx.globalAlpha = 1;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  function star(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * .18, y - s * .18); ctx.lineTo(x + s, y); ctx.lineTo(x + s * .18, y + s * .18);
    ctx.lineTo(x, y + s); ctx.lineTo(x - s * .18, y + s * .18); ctx.lineTo(x - s, y); ctx.lineTo(x - s * .18, y - s * .18); ctx.closePath(); ctx.fill();
  }
  // the bartender: shoulders lift and elbows bend so both hands (and the shaker) go straight up and down
  function drawRig(ctx, W, Hh, ts) {
    var fw = W * 0.58, fh = fw / RIG.aspect, ox = 0, oy = Hh * 1.04 - fh;
    var cyc = 560, n = Math.floor(ts / cyc), u = (ts % cyc) / cyc, sw = n < 2 && ts > 0 ? Math.sin(u * Math.PI * 2) : 0;
    var ang = { upper_f: -8.23 * sw, fore_f: 7.07 * sw, shaker: 3 * sw, upper_b: -5.48 * sw, fore_b: 4.14 * sw };
    var piv = { upper_f: 'shoulder_f', fore_f: 'elbow_f', shaker: 'grip_f', upper_b: 'shoulder_b', fore_b: 'elbow_b' };
    var rot = function (name) {
      var j = RIG.j[piv[name]], px = ox + j[0] * fw, py = oy + j[1] * fh;
      ctx.translate(px, py); ctx.rotate(ang[name] * Math.PI / 180); ctx.translate(-px, -py);
    };
    var draw = function (name) { var im = RIG.img[name]; if (im.complete && im.naturalWidth) ctx.drawImage(im, ox, oy, fw, fh); };
    ctx.save(); rot('upper_b'); draw('upper_b'); rot('fore_b'); draw('fore_b'); ctx.restore();
    draw('body');
    ctx.save(); rot('upper_f'); draw('upper_f'); rot('fore_f'); draw('fore_f'); rot('shaker'); draw('shaker'); ctx.restore();
    // a thin ring leaves the shaker on each shake
    var gx = ox + (RIG.j.grip_f[0] + 0.03) * fw, gy = oy + (RIG.j.grip_f[1] - 0.05) * fh;
    ctx.strokeStyle = '#E9E7DB'; ctx.lineWidth = Math.max(1, fw * 0.003);
    for (var q = 0; q < 2; q++) {
      var ph = (ts - q * cyc) / 900;
      if (ph < 0 || ph > 1) continue;
      ctx.globalAlpha = 0.9 * (1 - ph); ctx.beginPath(); ctx.arc(gx, gy, fw * 0.006 * (8 + ph * 44), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function paintLayer(ctx, P, n, t, c, noText) {
    var W = P.arcW, Hh = P.arcH;
    ctx.fillStyle = c.col; ctx.fillRect(0, 0, W, Hh);
    ctx.fillStyle = P.arcGrain; ctx.fillRect(0, 0, W, Hh);
    if (n === 0) {
      var fs = W * 0.27, dx = 10 - 20 * clamp01((t - c.t0) / 1100);
      ctx.font = fs.toFixed(1) + 'px Anton, sans-serif'; ctx.fillStyle = '#E9E7DB'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('WORKS', W / 2 + dx * W / 100, Hh / 2);
      drawRig(ctx, W, Hh, t - c.t0);
      label(ctx, 'SHAKEN, NOT STIRRED', 32, 34, 'left', '#E9E7DB'); label(ctx, 'POUR 01 / 02', W - 32, Hh - 34, 'right', '#E9E7DB');
    } else {
      ctx.fillStyle = '#F3E7DA'; ctx.globalAlpha = 0.78 + 0.17 * Math.sin(t * 0.0026);
      P.arcStars.forEach(function (s) { star(ctx, s.x, s.y, s.s); });
      ctx.globalAlpha = 1;
      if (!noText) {
        var fs2 = W * 0.29, lh = fs2 * 0.82, sl = 6 * (1 - ease(clamp01((t - c.t0) / 700))) * W / 100;
        ctx.font = fs2.toFixed(1) + 'px Anton, sans-serif'; ctx.fillStyle = '#272523'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText("TONIGHT'S", W * 1.025 + sl, Hh / 2 - lh / 2);
        ctx.fillText('MENU', W * 1.025 + sl, Hh / 2 + lh / 2);
      }
      label(ctx, "TONIGHT'S POUR", 32, 34, 'left', '#E9E7DB'); label(ctx, 'SERVED COLD · 5 SIGNATURES', W - 32, Hh - 34, 'right', '#E9E7DB');
    }
  }
  function runArcs(P, t, now) {
    if (t < 1100) return;
    if (!P.arcLayer) makeArcs(P);
    var ctx = P.arcCtx, W = P.arcW, Hh = P.arcH;
    ctx.clearRect(0, 0, W, Hh);
    var top = -1;
    P.arcD.forEach(function (c, n) { if (t >= c.t0 + c.dur) top = n; });
    if (t > SHRINK0) { shrinkToSpot(P, t); return; }
    P.arcD.forEach(function (c, n) {
      if (n < top) return;                         // fully covered by a later layer
      var k = clamp01((t - c.t0) / c.dur);
      if (k <= 0) return;
      var e = n === 0 ? 1 - Math.pow(1 - k, 2.2) : 1 - Math.pow(1 - k, 3), r = lerp(c.r0, c.r1, e);
      ctx.save();
      if (k < 1) { wavyCircle(ctx, c, r, t); ctx.clip(); }
      paintLayer(ctx, P, n, t, c);
      ctx.restore();
      if (k < 1) {                                  // two thin rings and a few drops riding outside the edge
        var op = 0.85 * (1 - clamp01((k - 0.7) / 0.3));
        ctx.strokeStyle = c.ring;
        ctx.globalAlpha = op; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, r + R * 2.4, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = op * 0.6; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(c.x, c.y, r + R * (5.5 + 2 * e), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        var ca = Math.atan2(Hh / 2 - c.y, W / 2 - c.x);
        ctx.fillStyle = n === 1 ? '#DA6F41' : c.col;
        c.dots.forEach(function (dp) {
          var a = ca + (dp.a - Math.PI) * 0.25, rr = r + dp.off;
          ctx.beginPath(); ctx.arc(c.x + rr * Math.cos(a), c.y + rr * Math.sin(a), dp.sz * (1 - k * 0.6), 0, Math.PI * 2); ctx.fill();
        });
      }
    });
    // fully covered: move the page to the menu underneath, hold a breath, then let the drink clear
    if (t > 2200 && !P.handed) {
      P.handed = true;
      if (P.glass) { P.glass.remove(); P.glass = null; }
      var pc = $('poolContent'); pc.style.transition = 'none'; showContent(true);
      setPool({ dur: 0, top: 0 }); scrollTo(0, P.poolTop);
      WK.enter();
      setTimeout(function () { pc.style.transition = ''; }, 50);
    }
  }

  // ---------- The orange layer shrinks into the Works spotlight; its title flies to the corner ----------
  var SHRINK0 = 2380, SHRINK_MS = 1000;
  function shrinkToSpot(P, t) {
    var ctx = P.arcCtx, W = P.arcW, Hh = P.arcH, c = P.arcD[1];
    var k = clamp01((t - SHRINK0) / SHRINK_MS), e = ease(k);
    var sp = WK.spot(), cx = lerp(W / 2, sp.x, e), cy = lerp(Hh / 2, sp.y, e);
    var r0 = Math.hypot(W, Hh) / 2 * 1.06, r = lerp(r0, sp.r, e);
    var soft = clamp01((k - 0.62) / 0.38);                    // the hard edge melts into the lamp
    var col = mix(c.col, WK.lightCol(), soft);
    ctx.clearRect(0, 0, W, Hh);
    ctx.save();
    ctx.globalAlpha = 1 - soft;
    wavyCircle(ctx, { x: cx, y: cy, ph: c.ph }, r, t); ctx.clip();
    paintLayer(ctx, P, 1, t, { col: col, t0: c.t0 }, true);
    ctx.restore();
    var op = 0.85 * (1 - soft);                                // the rings ride the edge in
    ctx.strokeStyle = '#E9E7DB';
    ctx.globalAlpha = op; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r + R * 2.4, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = op * 0.6; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r + R * 6, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    // TONIGHT'S / MENU flies to the page title in the top-left corner
    var f = ease(clamp01((t - SHRINK0) / (SHRINK_MS * 0.8)));
    var hd = WK.titleBox(), fs0 = W * 0.29, fs1 = hd.h * 0.9;
    var fs = lerp(fs0, fs1, f), x0 = W * 1.025, y0 = Hh / 2;
    ctx.font = fs.toFixed(1) + 'px Anton, sans-serif'; ctx.textBaseline = 'middle';
    var w1 = ctx.measureText("TONIGHT'S").width, w2 = ctx.measureText('MENU').width, sp1 = ctx.measureText(' ').width;
    // start: two right-aligned lines; end: one line from the title's left edge
    var lh = fs * 0.82;
    var aX = lerp(x0 - w1, hd.x, f), aY = lerp(y0 - lh / 2, hd.y, f);
    var bX = lerp(x0 - w2, hd.x + w1 + sp1, f), bY = lerp(y0 + lh / 2, hd.y, f);
    ctx.textAlign = 'left';
    ctx.fillStyle = mix('#272523', '#E9E7DB', clamp01(f * 1.6));
    var tail = clamp01((t - SHRINK0 - SHRINK_MS * 0.8) / 160);
    ctx.globalAlpha = 1 - tail;
    ctx.fillText("TONIGHT'S", aX, aY); ctx.fillText('MENU', bX, bY);
    ctx.globalAlpha = 1;
    if (tail > 0 && !P.titleShown) { P.titleShown = true; WK.showTitle(true); }
    if (k > 0.7 && !P.dropped) { P.dropped = true; WK.drop(); }
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
    if (i === 1) WK.prepare();
    P.glass = makeGlass(i);
    P.glassBox = P.glass.getBoundingClientRect();
    P.glassHalf = P.glassBox.width / 2;
    wdisp.setAttribute('scale', (R * 1.3).toFixed(1));
    setTimeout(function () { setDrink(i); setPool({ dur: 0, top: 100 }); }, 700);
    run();
  }

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
  })();

  // ---------- Works: tonight's menu under one spotlight ----------
  // Background = a grey light map, gradient-mapped per drink (dark colour -> light colour),
  // plus grain, and a field of tiny marks that only show inside the light.
  // Scroll: the section pins; each wheel step moves exactly one card (snap B).
  var WK = (function () {
    var CFG = { radius: 0.45, soft: 0.23, bright: 1, room: 0.36, posY: 0.5, vig: 0.78, haze: 0.32, grain: 0.06,
      dots: 1, cell: 22, size: 0.49, density: 0.55, jitter: 0.35, mouseR: 80, bubbles: 7, waveMs: 1950, band: 0.16, rough: 0.66 };
    var LIGHTS = ['#c6e89c', '#fddd3a', '#bee4dd', '#f5c7c7', '#ec2c64'];
    var DARKS = ['#50071f', '#002366', '#31231b', '#2d6f8b', '#131313'];
    var CARD = [
      { short: 'ROSE', ic: 'game', tag: 'GAME', yr: '2024', glass: 'coupe', c: '#D9667A', tiny: 'SWEET<br>WITH THORNS' },
      { short: 'SECOND', ic: 'game', tag: 'GAME', yr: '2024', glass: 'rocks', c: '#C98A3A', tiny: 'SERVED NEAT<br>BITTER · 40%' },
      { short: 'DUSK', ic: 'game', tag: 'GAME', yr: '2023', glass: 'martini', c: '#8C78B0', tiny: 'SMOKY<br>BEST AT DUSK' },
      { short: 'OOPS!', ic: 'inst', tag: 'INST', yr: '2024', glass: 'highball', c: '#9DB84A', tiny: 'FIZZY<br>UNPREDICTABLE' },
      { short: 'WORK', ic: 'board', tag: 'BOARD', yr: '2024', glass: 'coffee', c: '#A8774F', tiny: 'A STRONG<br>PICK-ME-UP' }
    ];
    var IC = {
      game: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5"/><circle cx="16" cy="11" r="1" fill="currentColor"/><circle cx="18.5" cy="14" r="1" fill="currentColor"/></svg>',
      inst: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/><circle cx="12" cy="10" r="2.5"/></svg>',
      board: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3" width="11" height="15" rx="1.5" transform="rotate(-8 9 10)"/><rect x="9" y="6" width="11" height="15" rx="1.5" transform="rotate(8 15 13)"/></svg>'
    };
    function glass(t, c) {
      var I = '#272523', L = 'fill="' + c + '"', S = 'stroke="' + I + '" stroke-width="3" fill="none" stroke-linejoin="round"';
      var g = {
        rocks: '<path d="M30 70 L36 160 H124 L130 70Z" fill="#fff" opacity=".6"/><path d="M33 105 L36 160 H124 L127 105Z" ' + L + '/><rect x="58" y="92" width="28" height="26" rx="4" fill="#fff" opacity=".6" transform="rotate(12 72 105)"/><path d="M30 70 L36 160 H124 L130 70Z" ' + S + '/>',
        coupe: '<path d="M20 70 Q80 140 140 70Z" ' + L + '/><path d="M20 70 Q80 140 140 70 M80 105 V165 M55 168 H105" ' + S + '/><circle cx="118" cy="62" r="9" fill="#C93A4C" stroke="' + I + '" stroke-width="3"/>',
        martini: '<path d="M34 76 L80 120 L126 76Z" ' + L + '/><path d="M18 60 L80 120 L142 60Z M80 120 V168 M56 170 H104" ' + S + '/><circle cx="95" cy="82" r="7" fill="#7FA585" stroke="' + I + '" stroke-width="2.5"/>',
        highball: '<rect x="46" y="62" width="68" height="106" ' + L + '/><circle cx="62" cy="120" r="3" fill="#fff"/><circle cx="90" cy="100" r="4" fill="#fff"/><rect x="46" y="30" width="68" height="138" rx="3" ' + S + '/><path d="M98 10 L84 90" ' + S + '/>',
        coffee: '<path d="M36 80 Q36 166 80 166 Q124 166 124 80Z" ' + L + '/><path d="M36 80 Q36 166 80 166 Q124 166 124 80Z M124 96 Q146 98 140 120 Q136 134 120 132" ' + S + '/><ellipse cx="80" cy="80" rx="44" ry="7" fill="#E9D9BC" stroke="' + I + '" stroke-width="3"/>'
      };
      return '<svg class="pile" viewBox="0 0 160 180" aria-hidden="true">' + g[t] + '</svg>';
    }
    var sec = $('works'), pin = $('wPin'), track = $('wTrack'), pips = $('wPips'), cv = $('wBg'), ctx = cv.getContext('2d');
    var N = PROJECTS.length;
    track.innerHTML = PROJECTS.map(function (p, i) {
      var d = CARD[i];
      return '<div class="wc" data-i="' + i + '" style="--c:' + d.c + ';--dd:' + (i * 90) + 'ms"><div class="wc-in"><div class="wc-fr"><div class="wc-art">' +
        '<div class="bt back">' + d.short + '</div><div class="mk a"></div><div class="mk b"></div>' + glass(d.glass, d.c) +
        '<div class="bt front">' + p.name.replace(/^The /, '') + '</div><div class="bt vert">QIUYE BAR · POUR 0' + (i + 1) + ' · ' + d.yr + '</div>' +
        '<div class="ph">手绘物件堆 · 占位</div></div>' +
        '<div class="badges"><div class="bd">' + IC[d.ic].replace('<svg', '<svg width="46%" height="46%"') + '<small>' + d.tag + '</small></div><div class="bd">0' + (i + 1) + '<small>POUR</small></div></div>' +
        '<div class="wc-bar"><h3>' + p.cn + '</h3><p><span class="en">' + p.name + '</span>' + p.kindCn + ' · ' + d.yr + '</p></div>' +
        '<div class="wc-th"><img src="' + p.img + '" alt="' + p.cn + '"></div></div></div></div>';
    }).join('');
    pips.innerHTML = PROJECTS.map(function () { return '<i></i>'; }).join('');
    var cards = track.children;

    // ----- scroll position -> carousel -----
    var cur = 0, vh = innerHeight;
    function top0() { return sec.getBoundingClientRect().top + scrollY; }
    function prog() { return clamp((scrollY - top0()) / vh, 0, N - 1); }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function layout() {
      if (pool.classList.contains('is-works') === false) return;
      var p = prog(), cw = cards[0].offsetWidth, gap = cw * 1.08;
      for (var k = 0; k < N; k++) {
        var o = k - p, a = Math.min(1, Math.abs(o));
        cards[k].style.transform = 'translateX(' + (o * gap * (1 - 0.12 * a)).toFixed(1) + 'px) scale(' + (1 - 0.24 * a).toFixed(3) + ') rotate(' + (o * 3.5).toFixed(2) + 'deg)';
        cards[k].style.zIndex = 10 - Math.round(Math.abs(o) * 2);
        cards[k].style.filter = 'brightness(' + (1 - 0.35 * a).toFixed(2) + ')';
      }
      var n = Math.round(p);
      if (n !== cur) { startWave(n > cur ? 1 : -1, n); cur = n; }
      for (var q = 0; q < N; q++) pips.children[q].classList.toggle('on', q === cur);
      $('wCount').textContent = '0' + (cur + 1) + ' / 0' + N;
    }

    // ----- snap B: one wheel step = one card -----
    var anim = null, lockUntil = 0;
    function glide(to) {
      var from = scrollY, t0 = performance.now(), dur = calm ? 0 : 620;
      anim = { to: to };
      (function step(now) {
        var k = dur ? Math.min(1, (now - t0) / dur) : 1;
        scrollTo(0, from + (to - from) * ease(k));
        if (k < 1 && anim) requestAnimationFrame(step); else { anim = null; lockUntil = performance.now() + 260; }
      })(t0);
    }
    function snapStep(dir) {   // returns true when it handled the step
      if (busy || !pool.classList.contains('is-works')) return false;
      var T = top0(), y = scrollY, last = T + (N - 1) * vh;
      if (dir > 0 && y < T - 2 && y > T - vh * 0.85) { glide(T); return true; }      // arriving from above: land on card 1
      if (y < T - 2 || y > last + 2) return false;
      var i = Math.round((y - T) / vh), nx = i + dir;
      if (nx < 0 || nx > N - 1) return false;                                        // first/last card: let the page move on
      glide(T + nx * vh); return true;
    }
    addEventListener('wheel', function (e) {
      if (busy) return;
      var T = top0(), y = scrollY;
      if (y < T - vh || y > T + (N - 1) * vh + 2) return;
      var d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : 0;
      if (Math.abs(d) < 2) return;
      if (anim || performance.now() < lockUntil) {
        if (y >= T - vh * 0.85 && y <= T + (N - 1) * vh + 2) e.preventDefault();
        return;
      }
      if (snapStep(d > 0 ? 1 : -1)) e.preventDefault();
    }, { passive: false });
    addEventListener('keydown', function (e) {
      var k = e.key, dir = (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) ? 1 : (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) ? -1 : 0;
      if (!dir || anim || /INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) return;
      if (snapStep(dir)) e.preventDefault();
    });
    var settleT = 0;
    addEventListener('scroll', function () {
      layout();
      clearTimeout(settleT);
      settleT = setTimeout(function () {                       // a drag or a fling that stopped between two cards
        if (anim || busy || !pool.classList.contains('is-works')) return;
        var T = top0(), y = scrollY, off = (y - T) / vh;
        if (off > -0.02 && off < N - 1 + 0.02 && Math.abs(off - Math.round(off)) > 0.01) glide(T + Math.round(off) * vh);
      }, 160);
    }, { passive: true });
    track.addEventListener('click', function (e) {
      var c = e.target.closest('.wc'); if (!c) return;
      var i = +c.dataset.i; if (i !== cur) glide(top0() + i * vh);
    });

    // ----- background -----
    var W = 0, H = 0, dpr = 1, LS = 4, gw = 0, gh = 0, GA = null;
    var low = document.createElement('canvas'), lx = low.getContext('2d');
    var cache = document.createElement('canvas'), cx2 = cache.getContext('2d'), cacheKey = '';
    var grainC = document.createElement('canvas'), grx = grainC.getContext('2d');
    function hex(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
    function hsh(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
    function vnoise(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = hsh(xi, yi), b = hsh(xi + 1, yi), c = hsh(xi, yi + 1), d = hsh(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function ss(a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
    function size() {
      vh = innerHeight;
      var w = pin.clientWidth, h = pin.clientHeight; if (!w || !h) return;
      W = w; H = h; dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gw = Math.ceil(W / LS); gh = Math.ceil(H / LS); low.width = cache.width = gw; low.height = cache.height = gh;
      GA = new Float32Array(gw * gh);
      var cxp = W / 2, cyp = H * CFG.posY, Rr = CFG.radius * Math.min(W, H), diag = Math.hypot(W, H) / 2;
      for (var y = 0; y < gh; y++) for (var x = 0; x < gw; x++) {
        var px = x * LS, py = y * LS, r = Math.hypot(px - cxp, py - cyp) / Rr;
        var spot = 1 - ss(1 - CFG.soft * 0.8, 1 + CFG.soft * 0.6, r), glow = Math.exp(-r * r * 0.9) * 0.35 * CFG.soft;
        var nz = vnoise(px / 170, py / 170) * 0.5 + vnoise(px / 81, py / 81) * 0.3 + vnoise(px / 40, py / 40) * 0.2;
        var hz = (nz - 0.5) * CFG.haze * 0.55 * (spot * 0.8 + glow + 0.15);
        var vg = 1 - CFG.vig * ss(0.35, 1.05, Math.hypot(px - W / 2, py - H / 2) / diag);
        var g = CFG.room + (CFG.bright - CFG.room) * Math.min(1, spot + glow) + hz;
        GA[y * gw + x] = clamp(g * vg, 0, 1);
      }
      grainC.width = W; grainC.height = H;
      var id = grx.createImageData(W, H), d = id.data;
      for (var q = 0; q < W * H; q++) { var v = 128 + (Math.random() - 0.5) * 255 * CFG.grain * 1.6; d[q * 4] = d[q * 4 + 1] = d[q * 4 + 2] = v; d[q * 4 + 3] = 255; }
      grx.putImageData(id, 0, 0);
      cacheKey = ''; dotKey = '';
      layout();
    }
    function lightAt(x, y) { if (!GA) return 0; return GA[clamp(y / LS | 0, 0, gh - 1) * gw + clamp(x / LS | 0, 0, gw - 1)]; }
    var lA = hex(LIGHTS[0]), lB = lA, dA = hex(DARKS[0]), dB = dA, wave = null;
    function startWave(dir, n) {
      var now = performance.now();
      if (wave && now - wave.t0 > CFG.waveMs * 0.5) { lA = lB; dA = dB; }
      lB = hex(LIGHTS[n]); dB = hex(DARKS[n]);
      if (calm) { lA = lB; dA = dB; wave = null; return; }
      wave = { t0: now, dir: dir };
    }
    function field(x, y, now, grainy) {
      if (!wave) return [1, 0];
      var k = ease(Math.min(1, (now - wave.t0) / CFG.waveMs)), band = W * CFG.band;
      var front = wave.dir > 0 ? (W + band * 1.5) - k * (W + band * 3) : (-band * 1.5) + k * (W + band * 3);
      var wob = Math.sin(y * 0.011 + now * 0.003) * 46 + Math.sin(y * 0.029 - now * 0.002) * 20 + Math.sin(y * 0.004 + 1.3) * 60;
      var t = ss(-band, band, (x - front) * wave.dir + wob), ag = 1 - Math.abs(2 * t - 1);
      if (grainy && CFG.rough > 0) t = clamp((t - 0.5) * (1 + CFG.rough * 2.5) + 0.5 + (Math.random() - 0.5) * CFG.rough * ag * 1.6, 0, 1);
      return [t, ag];
    }
    // Qiuye's hand-drawn marks: dot -> small ring -> big ring -> star
    var SPR = ['mark_dot', 'mark_ring_s', 'mark_ring_l', 'mark_star'].map(function (n) { var im = new Image(); im.src = 'assets/' + n + '.webp'; return im; });
    var TS = null, tsKey = '', dotC = document.createElement('canvas'), dotKey = '';
    function tinted(rgb) {               // pre-scaled, pre-coloured copies, rebuilt only when the light colour or size changes
      var key = rgb + '|' + CFG.cell + '|' + CFG.size + '|' + dpr;
      if (key === tsKey) return TS;
      if (!SPR.every(function (im) { return im.complete && im.naturalWidth; })) return null;
      TS = SPR.map(function (im, n) {
        var sz = n === 0 ? CFG.cell * 0.95 : CFG.cell * 1.2 * CFG.size, px = Math.max(2, Math.round(sz * dpr)), c = document.createElement('canvas');
        c.width = c.height = px; var g = c.getContext('2d');
        g.drawImage(im, 0, 0, px, px); g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(' + rgb + ')'; g.fillRect(0, 0, px, px);
        return { c: c, s: sz };
      });
      tsKey = key; return TS;
    }
    var GL = ['°', 'o', 'O', '✦'], mx = -999, my = -999, tx = -999, ty = -999, bubs = [], nextB = 0;
    pin.addEventListener('mousemove', function (e) { var r = pin.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; });
    pin.addEventListener('mouseleave', function () { tx = ty = -999; });
    function paint(now) {
      if (wave && now - wave.t0 > CFG.waveMs) { lA = lB; dA = dB; wave = null; }
      if (mx < -500 || tx < -500) { mx = tx; my = ty; } else { mx += (tx - mx) * 0.18; my += (ty - my) * 0.18; }
      // gradient-mapped light
      var key = lA + '|' + dA;
      if (wave || key !== cacheKey) {
        var img = (wave ? lx : cx2).createImageData(gw, gh), d = img.data;
        for (var y = 0; y < gh; y++) for (var x = 0; x < gw; x++) {
          var i = y * gw + x, g = GA[i], t = wave ? field(x * LS, y * LS, now, true)[0] : 1, o = i * 4;
          for (var c = 0; c < 3; c++) { var dk = dA[c] + (dB[c] - dA[c]) * t, lt = lA[c] + (lB[c] - lA[c]) * t; d[o + c] = dk + (lt - dk) * g; }
          d[o + 3] = 255;
        }
        if (wave) lx.putImageData(img, 0, 0); else { cx2.putImageData(img, 0, 0); cacheKey = key; }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = !(wave && CFG.rough >= 0.3);
      ctx.drawImage(wave ? low : cache, 0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
      if (CFG.grain > 0) { ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(grainC, 0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
      // marks in the light: the quiet dot field is cached; only the mouse ring and the wave band are drawn per frame
      var C = CFG.cell, cols = Math.ceil(W / C) + 1, rows = Math.ceil(H / C) + 1, Rm = CFG.mouseR;
      var tint = [0, 1, 2].map(function (i) { return Math.round(lB[i] * 0.25 + 233 * 0.75); }).join(',');
      var ts = tinted(tint);
      if (ts && dotKey !== tsKey + '|' + W + 'x' + H) {
        dotC.width = Math.round(W * dpr); dotC.height = Math.round(H * dpr);
        var dg = dotC.getContext('2d'); dg.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (var j0 = 0; j0 < rows; j0++) for (var i0 = 0; i0 < cols; i0++) {
          var qx = i0 * C + C / 2 + (hsh(i0 + 7, j0) - 0.5) * C * CFG.jitter, qy = j0 * C + C / 2 + (hsh(i0, j0 + 9) - 0.5) * C * CFG.jitter, L0 = lightAt(qx, qy); if (L0 < 0.04) continue;
          dg.globalAlpha = CFG.dots * 0.22 * Math.min(1, L0 * 1.25); dg.drawImage(ts[0].c, qx - ts[0].s / 2, qy - ts[0].s / 2, ts[0].s, ts[0].s);
        }
        dotKey = tsKey + '|' + W + 'x' + H;
      }
      // the cached dot field, minus the mouse disc (those cells are redrawn below, so a dot can turn into a ring)
      var mouseOn = mx > -500;
      if (ts && !wave) {
        if (mouseOn) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(mx, my, Rm, 0, Math.PI * 2, true); ctx.clip('evenodd'); }
        ctx.drawImage(dotC, 0, 0, W, H);
        if (mouseOn) ctx.restore();
      }
      if (!ts) { ctx.font = '600 ' + Math.round(C * 0.88) + 'px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; }
      var i1 = 0, i2 = cols - 1, j1 = 0, j2 = rows - 1;
      if (!wave) {                                   // only the cells under the mouse need work
        if (!mouseOn) { i2 = -1; } else { i1 = Math.max(0, Math.floor((mx - Rm) / C) - 1); i2 = Math.min(cols - 1, Math.ceil((mx + Rm) / C) + 1); j1 = Math.max(0, Math.floor((my - Rm) / C) - 1); j2 = Math.min(rows - 1, Math.ceil((my + Rm) / C) + 1); }
      }
      for (var j = j1; j <= j2; j++) for (var ii = i1; ii <= i2; ii++) {
        var px = ii * C + C / 2 + (hsh(ii + 7, j) - 0.5) * C * CFG.jitter, py = j * C + C / 2 + (hsh(ii, j + 9) - 0.5) * C * CFG.jitter, L = lightAt(px, py); if (L < 0.04) continue;
        var dd = Math.hypot(px - mx, py - my);
        if (!wave && dd >= Rm) continue;                 // outside the disc: already in the cached field
        var gg = dd < Rm ? Math.pow(1 - dd / Rm, 1.4) : 0, ag = wave ? field(px, py, now, false)[1] : 0;
        var lf = Math.min(1, L * 1.25), base = CFG.dots * 0.22 * lf;
        var h = hsh(ii, j), tw = 0.5 + 0.5 * Math.sin(now * 0.003 + h * 40);
        var lv = (gg > 0 || ag > 0.01) ? gg * 3.6 + ag * 2.6 * (0.4 + 0.6 * h) + tw * 0.7 : 0;
        var boost = Math.min(0.6, gg * 0.6 + ag * 0.45) * lf;
        var bloom = lv >= 0.7 && hsh(ii + 3, j + 5) <= CFG.density;
        if (ts) {
          // a blooming cell shows only its ring/star: the dot it grew from is gone
          var sp = ts[bloom ? (lv < 1.7 ? 1 : lv < 2.9 ? 2 : 3) : 0];
          ctx.globalAlpha = Math.min(1, base + boost); ctx.drawImage(sp.c, px - sp.s / 2, py - sp.s / 2, sp.s, sp.s);
        } else if (boost > 0.01) {
          ctx.fillStyle = 'rgba(' + tint + ',' + boost.toFixed(3) + ')';
          if (!bloom) ctx.fillRect(px - 1, py - 1, 2, 2); else ctx.fillText(GL[Math.min(3, Math.floor(lv - 0.7))], px, py);
        }
      }
      ctx.globalAlpha = 1;
      // now and then a bubble drifts up through the light
      if (now > nextB) {
        nextB = now + CFG.bubbles * 1000 * (0.6 + Math.random() * 0.8);
        var R2 = CFG.radius * Math.min(W, H) * 0.8, an = Math.random() * Math.PI * 2;
        bubs.push({ x: W / 2 + Math.cos(an) * R2 * Math.random(), y: H * CFG.posY + R2 * (0.2 + Math.random() * 0.6), t0: now, life: 4200 + Math.random() * 2400, s: C * (0.6 + Math.random() * 0.7) });
      }
      bubs = bubs.filter(function (b) { return now - b.t0 < b.life; });
      bubs.forEach(function (b) {
        var k = (now - b.t0) / b.life, y = b.y - k * 90, x = b.x + Math.sin(k * 6 + b.s) * 6, a = Math.sin(k * Math.PI) * 0.55 * Math.min(1, lightAt(x, y) * 1.3);
        if (ts) { var bs = b.s * (k > 0.8 ? 0.8 : 1.3); ctx.globalAlpha = a; ctx.drawImage(ts[k > 0.8 ? 1 : 2].c, x - bs / 2, y - bs / 2, bs, bs); ctx.globalAlpha = 1; }
        else { ctx.font = '600 ' + Math.round(b.s) + 'px "Barlow Condensed", sans-serif'; ctx.fillStyle = 'rgba(' + tint + ',' + a.toFixed(3) + ')'; ctx.fillText(k > 0.8 ? '°' : 'o', x, y); }
      });
    }
    // run only while the section is on screen
    var onScreen = false, looping = false;
    function loop(now) { if (!onScreen) { looping = false; return; } if (!GA || !W) size(); if (GA) paint(now); requestAnimationFrame(loop); }
    function wake() { if (onScreen && !looping) { looping = true; requestAnimationFrame(loop); } }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; wake(); });
      io.observe(sec);
    } else { onScreen = true; wake(); }
    addEventListener('resize', function () { GA = null; vh = innerHeight; layout(); });

    return {
      spot: function () { if (!W) size(); return { x: W / 2, y: H * CFG.posY, r: CFG.radius * Math.min(W || innerWidth, H || innerHeight) }; },
      lightCol: function () { return LIGHTS[cur]; },
      titleBox: function () { var b = $('wTitle').getBoundingClientRect(); return { x: b.left, y: b.top + b.height / 2, h: b.height }; },
      prepare: function () { $('wTitle').style.opacity = 0; track.classList.remove('drop'); track.classList.add('await'); },
      enter: function () { size(); layout(); onScreen = true; wake(); },
      showTitle: function () { $('wTitle').style.opacity = 1; },
      drop: function () {
        track.classList.remove('await'); void track.offsetWidth; track.classList.add('drop');
        setTimeout(function () { track.classList.remove('drop'); }, 1500);
      },
      layout: layout
    };
  })();

  // ---------- Initial state ----------
  light(null);
  setDrink(1);
  setPool({ dur: 0, top: 0 });
  WK.layout();
})();
