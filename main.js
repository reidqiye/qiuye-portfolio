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
  var streams = $('streams');
  DX.forEach(function (dx, n) {
    var s = document.createElement('span');
    s.style.width = DW[n] + 'px';
    streams.appendChild(s);
  });
  function placeStreams(i) {
    Array.prototype.forEach.call(streams.children, function (s, n) {
      s.style.setProperty('--f', (CXF[i] + DX[n] / 4320).toFixed(4));
    });
  }
  function streamHeight(h) { Array.prototype.forEach.call(streams.children, function (s) { s.style.height = h + '%'; }); }
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
  function drip(i, go) {
    for (var n = 0; n < 3; n++) {
      var active = n === i;
      $('dripg' + n).style.opacity = active ? 1 : 0;
      $('pud' + n).style.transform = active && go ? 'scale(1)' : 'scale(0)';
      document.querySelectorAll('.drip' + n).forEach(function (p) { p.style.strokeDashoffset = active && go ? 0 : 1; });
    }
  }

  // ---------- The pour ----------
  function pour(i) {
    if (busy) return;
    busy = true;
    timers.forEach(clearTimeout); timers = [];
    light(i);
    placeStreams(i);
    setPool({ dur: 0, top: 100 });
    showContent(false);
    streams.style.opacity = 0; streamHeight(0);
    drip(i, false);
    later(40, function () { drip(i, true); });
    later(500, function () { setDrink(i); });
    later(calm ? 100 : 800, function () {
      pool.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
      setPool({ dur: 1500 });
      streams.style.opacity = 1; streamHeight(100);
    });
    later(calm ? 150 : 1100, function () { setPool({ top: 0 }); });
    later(calm ? 200 : 2500, function () { showContent(true); streams.style.opacity = 0; });
    later(calm ? 250 : 3000, function () { drip(null, false); light(null); busy = false; });
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
    var on = function () { if (!busy) light(i); }, off = function () { if (!busy) light(null); };
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
