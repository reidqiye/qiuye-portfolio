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
    '<feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"/></filter></defs>' +
    '<g filter="url(#goo)"><g id="fxWorld"><path id="fxBody"/><path id="fxRope" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path id="fxCurtain"/><g id="fxDrips"></g></g></g><g id="fxShine"></g>';
  document.body.appendChild(fx);
  var wf = document.createElementNS(NS, 'svg');
  wf.setAttribute('width', 0); wf.setAttribute('height', 0); wf.setAttribute('aria-hidden', 'true');
  wf.style.position = 'absolute';
  wf.innerHTML = '<filter id="water" x="-5%" y="-5%" width="110%" height="110%">' +
    '<feTurbulence id="wturb" type="fractalNoise" baseFrequency="0.009 0.024" numOctaves="2" seed="4"/>' +
    '<feDisplacementMap id="wdisp" in="SourceGraphic" scale="14" xChannelSelector="R" yChannelSelector="G"/></filter>';
  document.body.appendChild(wf);
  var wturb = wf.querySelector('#wturb'), wdisp = wf.querySelector('#wdisp');
  var world = fx.querySelector('#fxWorld'), body = fx.querySelector('#fxBody'), rope = fx.querySelector('#fxRope'), curtain = fx.querySelector('#fxCurtain'), dripsG = fx.querySelector('#fxDrips'), shineG = fx.querySelector('#fxShine'), gooF = fx.querySelector('#goo'), gooBlur = fx.querySelector('feGaussianBlur');
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
      P.lv = lerp(1.02, 0.03, fill);
      var gb = P.glassBox, waveA = (R * 0.7) / gb.height;
      drawGlass(P, t, waveA * (1 - 0.5 * clamp01((t - 1300) / 600)));
      // 2. it spills over the sill as a curtain as wide as the window, with sticky drips along its edge
      var surf = (P.level == null) ? Infinity : P.level;
      if (t > 1150) {
        var tc = t - 1150, kf = clamp01((tc - 650) / 1350);
        var D = P.poolTop + innerHeight * 1.2 - G.sill;
        var yb = Math.min(G.sill + R + R * 4 * ease(tc / 700) + D * kf * kf, surf + R * 2);   // creeps down the bar front, then lets go
        var hw0 = P.glassHalf * 0.98;
        var lip = R * 1.1 * Math.min(1, tc / 250);
        var pts = [], M = 30;
        for (var q = 0; q <= M; q++) {
          var u = q / M, y = lerp(G.sill - lip, yb, u);
          pts.push((G.cx + hw0 + Math.sin(y * 0.02 + t * 0.006) * R * 0.35 + Math.pow(u, 3) * R * 1.5).toFixed(1) + ' ' + y.toFixed(1));
        }
        for (q = M; q >= 0; q--) {
          var u2 = q / M, y2 = lerp(G.sill - lip, yb, u2);
          pts.push((G.cx - hw0 - Math.sin(y2 * 0.018 + t * 0.005 + 1) * R * 0.35 - Math.pow(u2, 3) * R * 1.5).toFixed(1) + ' ' + y2.toFixed(1));
        }
        curtain.setAttribute('d', 'M' + pts.join(' L') + 'Z');
        curtain.setAttribute('fill', P.color);
        P.drips.forEach(function (dp) {
          var x = G.cx + dp.u * hw0 + Math.sin(t * 0.004 + dp.ph) * R * 0.2;
          var grow = ease((tc - dp.delay) / 900), len = dp.len * R * grow * (1 + 0.15 * Math.sin(t * 0.007 + dp.ph));
          var y1 = yb - R, y2b = Math.min(yb + len, surf + R);
          dp.el.setAttribute('x1', x.toFixed(1)); dp.el.setAttribute('x2', x.toFixed(1));
          dp.el.setAttribute('y1', y1.toFixed(1)); dp.el.setAttribute('y2', Math.max(y1, y2b).toFixed(1));
          dp.el.setAttribute('stroke-width', (dp.w * R).toFixed(1)); dp.el.setAttribute('stroke', P.color);
          dp.tip.setAttribute('cx', x.toFixed(1)); dp.tip.setAttribute('cy', Math.max(y1, y2b).toFixed(1));
          dp.tip.setAttribute('r', (dp.w * R * 0.68 * (0.6 + 0.4 * grow)).toFixed(1)); dp.tip.setAttribute('fill', P.color);
        });
        shineG.setAttribute('transform', 'translate(0 ' + (-scrollY) + ')');
        P.shine.forEach(function (sh) {
          var x = G.cx + sh.u * hw0 + Math.sin(t * 0.005 + sh.ph) * R * 0.3;
          var ya = G.sill + R * 1.5, yz = Math.min(yb - R * 2.5, surf - R);
          sh.el.setAttribute('d', yz > ya ? 'M' + x.toFixed(1) + ' ' + ya.toFixed(1) + ' L' + (x + Math.sin(t * 0.004 + sh.ph) * R * 0.4).toFixed(1) + ' ' + yz.toFixed(1) : '');
        });
      }
      // the drink rises underneath and swallows the curtain
      if (t > 2100) {
        var f = ease((t - 2100) / 1150);
        P.level = lerp(P.poolTop + innerHeight + R * 6, P.poolTop - R * 2, f);
        P.amp = R * (t < 3000 ? 1.0 : Math.exp(-(t - 3000) / 400));
        P.crown = R * 1.6 * (1 - clamp01((t - 2900) / 300));
        P.hitX = G.cx;
        var bp = [], x0 = -40, x1 = innerWidth + 40;
        for (var xx = x0; xx <= x1; xx += 18) bp.push(xx.toFixed(1) + ' ' + surfaceY(xx, now).toFixed(1));
        var deep = P.poolTop + innerHeight * 3;
        body.setAttribute('d', 'M' + bp.join(' L') + ' L' + x1 + ' ' + deep + ' L' + x0 + ' ' + deep + 'Z');
        body.setAttribute('fill', P.color);
      }
      // 3. scroll down with it
      if (t > 1800 && !P.scrolled) {
        var st = ease((t - 1800) / 1250);
        scrollTo(0, lerp(P.y0, P.poolTop, st));
        if (st >= 1) P.scrolled = true;
      }
      if (t > 3250 && !P.handed) {         // the curtain now covers the screen: hand over to the real pool (with grain)
        P.handed = true;
        setPool({ dur: 0, top: 0 }); showContent(true);
      }
      if (t > 3400) { curtain.setAttribute('d', ''); body.setAttribute('d', ''); dripsG.innerHTML = ''; shineG.innerHTML = ''; P.drips = []; P.shine = []; }
      if (t > 3400 && P.glass) { P.glass.remove(); P.glass = null; }
      if (t > 3600) { P.film.forEach(drop); P = null; busy = false; light(null); }
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
    var c = g.querySelector('.clone');
    c.innerHTML = $('scene').innerHTML;
    c.querySelectorAll('[id]').forEach(function (e) { e.removeAttribute('id'); });
    c.style.cssText = 'left:' + (-L / Wd * 100) + '%;top:' + (-GT / Hd * 100) + '%;width:' + (100 / Wd) + '%;height:' + (100 / Hd) + '%';
    g.querySelector('.tint').style.background = LIQ[i];
    var bb = g.querySelector('.bubbles');
    for (var n = 0; n < 10; n++) {
      var b = document.createElement('i'), sz = 4 + Math.random() * 7;
      b.style.cssText = 'left:' + (8 + Math.random() * 84) + '%;width:' + sz + 'px;height:' + sz + 'px;animation-delay:' + (-Math.random() * 2.4).toFixed(2) + 's;animation-duration:' + (1.8 + Math.random() * 1.4).toFixed(2) + 's';
      bb.appendChild(b);
    }
    document.querySelector('.scene-ui').appendChild(g);
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

  // ---------- The pour ----------
  function pour(i) {
    if (busy) return;
    busy = true;
    hoverDrip(null);
    light(i);
    showContent(false);
    if (calm) {
      setDrink(i); setPool({ dur: 0, top: 0 });
      pool.scrollIntoView({ block: 'start' }); showContent(true);
      light(null); busy = false; return;
    }
    setPool({ dur: 0, top: 100 });
    var G = geo(i);
    P = { t0: performance.now(), g: G, color: LIQ[i], y0: scrollY,
          poolTop: pool.getBoundingClientRect().top + scrollY,
          film: [], drips: [], lv: 1.02 };
    P.glass = makeGlass(i);
    P.glassBox = P.glass.getBoundingClientRect();
    P.glassHalf = P.glassBox.width / 2;
    wdisp.setAttribute('scale', (R * 1.3).toFixed(1));
    dripsG.innerHTML = '';
    for (var n = 0; n < 9; n++) {
      var el = document.createElementNS(NS, 'line'), tip = document.createElementNS(NS, 'circle');
      el.setAttribute('stroke-linecap', 'round');
      dripsG.appendChild(el); dripsG.appendChild(tip);
      var big = n % 2 === 0;
      P.drips.push({ el: el, tip: tip, u: -0.9 + 1.8 * (n + 0.2 + Math.random() * 0.6) / 9, len: big ? 8 + Math.random() * 12 : 2 + Math.random() * 4,
                     w: big ? 1.3 + Math.random() * 0.8 : 0.9 + Math.random() * 0.7, delay: Math.random() * 600, ph: Math.random() * 6 });
    }
    shineG.innerHTML = ''; P.shine = [];
    [-0.62, -0.18, 0.4, 0.7].forEach(function (u, n) {
      var el = document.createElementNS(NS, 'path');
      el.setAttribute('fill', 'none'); el.setAttribute('stroke', '#FBF4E6'); el.setAttribute('stroke-linecap', 'round');
      el.setAttribute('stroke-opacity', n % 2 ? .22 : .35); el.setAttribute('stroke-width', (R * (n % 2 ? 0.25 : 0.4)).toFixed(1));
      shineG.appendChild(el); P.shine.push({ el: el, u: u, ph: n * 1.9 });
    });
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
    var on = function () { if (!busy) { light(i); hoverDrip(i); } }, off = function () { if (!busy) { light(null); hoverDrip(null); } };
    b.addEventListener('mouseenter', on); b.addEventListener('focus', on);
    b.addEventListener('mouseleave', off); b.addEventListener('blur', off);
  });
  $('toTop').addEventListener('click', function () { root.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }); });

  // ---------- Initial state ----------
  light(null);
  setDrink(1);
  setPool({ dur: 0, top: 0 });
  renderMenu();
})();
