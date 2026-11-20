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
    '<g filter="url(#goo)"><g id="fxWorld"><path id="fxBody"/><path id="fxRope" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>';
  document.body.appendChild(fx);
  var world = fx.querySelector('#fxWorld'), body = fx.querySelector('#fxBody'), rope = fx.querySelector('#fxRope'), gooF = fx.querySelector('#goo'), gooBlur = fx.querySelector('feGaussianBlur');
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
    if (!P || P.level === null) return Infinity;
    var A = P.amp;
    var y = P.level + A * (0.6 * Math.sin(x * 0.011 + t * 0.0042) + 0.4 * Math.sin(x * 0.026 - t * 0.0067));
    var dx = (x - P.hitX) / (R * 7);
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
      // 1. gather: a film spreads along the sill, four drops swell under it, then slide together into one
      var grow = ease(t / 550), drain = clamp01((t - 1700) / 800), join = ease((t - 450) / 450);
      P.film.forEach(function (d) {
        d.x = lerp(d.hx, G.cx, Math.max(join * 0.35, drain)); d.y = G.sill - R * 0.15;
        d.r = R * 0.95 * grow * (1 - drain);
      });
      if (!P.released) {
        P.hang.forEach(function (d, n) {
          var e = ease((t - n * 70) / 550);
          d.x = lerp(d.hx, G.cx, join);
          d.y = G.sill + R * (0.5 + 1.4 * e + 0.9 * join) + Math.sin(t * 0.014 + n * 1.7) * R * 0.18 * e;
          d.r = R * (0.2 + 0.9 * e + 0.5 * join);
        });
        if (t > 950) {           // 2. the big drop lets go and pulls a stream behind it
          P.released = true; P.tRel = t;
          P.hang.forEach(function (d, n) { if (n) drop(d); });
          P.tip = P.hang[0]; P.tip.x = G.cx; P.tip.kind = 'tip'; P.tip.r = R * 1.5;
        }
      }
      if (P.released) {
        var tr = (t - P.tRel) / 1000, g2 = g * 0.9;
        var sway = function (y) { var k = clamp01((y - G.sill) / (R * 25)); return G.cx + Math.sin(t * 0.005 - (y - G.sill) * 0.0045) * R * 1.4 * k; };
        var tipY = G.sill + R * 3 + 0.5 * g2 * tr * tr;
        var surf = surfaceY(G.cx, now);
        if (P.tip) {
          P.tip.y = Math.min(tipY, surf); P.tip.x = sway(P.tip.y);
          if (tipY >= surf) { drop(P.tip); P.tip = null; P.landed = true; }
        }
        var topY = G.sill + R * 0.3;
        if (t > 2350) { var td = (t - 2350) / 1000; topY += 0.5 * g2 * td * td; }      // the stream lets go of the sill
        var botY = Math.min(tipY, surf + R);
        P.streamX = sway(Math.min(botY, surf));
        if (botY > topY + 2) {
          var pts = [], N = 28;
          for (var q2 = 0; q2 <= N; q2++) { var yy = lerp(topY, botY, q2 / N); pts.push(sway(yy).toFixed(1) + ' ' + yy.toFixed(1)); }
          rope.setAttribute('d', 'M' + pts.join(' L'));
          var thin = t > 2350 ? Math.max(0.35, 1 - (t - 2350) / 500) : 1;
          rope.setAttribute('stroke-width', (R * 1.35 * thin).toFixed(1));
          rope.setAttribute('stroke', P.color);
        } else rope.setAttribute('d', '');
        // a few stray droplets peel off the stream; splashes where it lands
        if (t < 2450) {
          P.acc += dt * 14;
          while (P.acc >= 1) {
            P.acc -= 1;
            var yy2 = lerp(topY + R * 10, botY, Math.random());
            dot(sway(yy2) + (Math.random() - .5) * R * 1.2, yy2, R * (0.45 + Math.random() * 0.3), 'fall', (Math.random() - .5) * R * 6, R * 20);
          }
        }
        if (P.landed && t < 2550) {
          P.sacc = (P.sacc || 0) + dt * 22;
          while (P.sacc >= 1) {
            P.sacc -= 1;
            dot(P.streamX + (Math.random() - .5) * R, surf - R * 0.6, R * (0.5 + Math.random() * 0.35), 'splash',
                (Math.random() - .5) * R * 50, -R * (20 + Math.random() * 30));
          }
        }
      }
      // 3. scroll down to the pool, then fill it
      if (t > 1000 && !P.scrolled) {
        var st = ease((t - 1000) / 1150);
        scrollTo(0, lerp(P.y0, P.poolTop, st));
        if (st >= 1) P.scrolled = true;
      }
      if (t > 1250) {
        var bottom = P.poolTop + innerHeight + R * 6;
        var f = ease((t - 1250) / 1500);
        P.level = lerp(bottom, P.poolTop - R * 2, f);
        P.amp = R * (t < 2400 ? 1.1 : 1.1 * Math.exp(-(t - 2400) / 450));
        P.crown = R * (t < 2400 ? 1.8 : Math.max(0, 1.8 - (t - 2400) / 200));
        P.hitX = P.streamX;
        var bp = [], x0 = -40, x1 = innerWidth + 40, step = 18;
        for (var x = x0; x <= x1; x += step) bp.push(x.toFixed(1) + ' ' + surfaceY(x, now).toFixed(1));
        var deep = P.poolTop + innerHeight * 3;
        body.setAttribute('d', 'M' + bp.join(' L') + ' L' + x1 + ' ' + deep + ' L' + x0 + ' ' + deep + 'Z');
        body.setAttribute('fill', P.color);
      }
      if (t > 2800 && !P.handed) {         // hand over to the real pool (with grain) underneath
        P.handed = true;
        setPool({ dur: 0, top: 0 }); showContent(true);
      }
      if (t > 3000) { body.setAttribute('d', ''); rope.setAttribute('d', ''); }
      if (t > 3400) { P.film.forEach(drop); P = null; busy = false; light(null); }
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
          film: [], hang: [], released: false, acc: 0, level: null, amp: 0, crown: 0, hitX: G.cx, streamX: G.cx };
    for (var n = 0; n < 7; n++) { var hx = G.cx + (n / 6 - .5) * 2 * G.half * 0.9; var fd = dot(hx, G.sill, 0, 'fixed'); fd.hx = hx; P.film.push(fd); }
    DX.forEach(function (dx) { var hd = dot(G.cx + dx / 4320 * G.sw, G.sill, 0, 'fixed'); hd.hx = hd.x; P.hang.push(hd); });
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
