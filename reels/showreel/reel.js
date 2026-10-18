'use strict';
// Шоурил 2:00. W, H - логические координаты рисования; K - во сколько раз больше выходной кадр (2 = 4K, 2/3 = 720p)
const Q = new URLSearchParams(location.search);
const K = +(Q.get('k') || 1), FPS = +(Q.get('fps') || 60);
const W = 1920, H = 1080, OW = Math.round(W * K), OH = Math.round(H * K);
const SS = +(Q.get('ss') || (K > 1 ? 1.5 : 2)), SW = Math.round(OW * SS), SH2 = Math.round(OH * SS);
// подкадров столько, чтобы за секунду всегда было 240 расчётов: 60 к/с - 4, 120 - 2, 240 - 1; затвор 180°
const SUB = +(Q.get('sub') || Math.max(1, Math.round(240 / FPS))), SHUTTER = 0.5 / FPS;
const { BEAT, BAR, secs, DUR } = TL;
const FD = '"Bahnschrift", "Segoe UI", sans-serif', FM = '"Cascadia Mono", Consolas, monospace';
const C = { coral: '#ff5a36', cyan: '#3ee6ff', violet: '#8b6bff', ink: '#0a0a0f', paper: '#f2efe9', white: '#ffffff', pink: '#ff3d9a' };
const SID = { intro: 0, hero: 1, type: 2, tunnel: 3, particles: 4, end: 5, fractal: 6, liquid: 7, terrain: 8, city: 9, prism: 10, hole: 11 };
const NAME = { hero: 'RAYMARCHED 3D', type: 'KINETIC TYPE', fractal: 'FRACTALS', hole: 'BLACK HOLE', terrain: 'PROCEDURAL WORLDS', city: 'INSTANCING',
  prism: 'GLASS & LIGHT', liquid: 'LIQUID METAL', tunnel: 'SHADERS', particles: 'PARTICLES', montage: 'THE EDIT', end: 'CREDITS' };
// безопасные поля (5 % кадра): ни одна надпись не выходит за них
const MX = 96, MY = 54;

// ---------- помощники
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const E = {
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inCubic: (t) => t * t * t,
};
function rng(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hashStr = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; };
const envSum = (t, list, k, key = false) => { let s = 0; for (const e of list) { const tt = key ? e.t : e; const a = key ? e.a : 1; if (t >= tt) s += a * Math.exp(-(t - tt) * k); } return s; };
const pad2 = (n) => String(n).padStart(2, '0');
const secAt = (t) => secs.find((s) => t < s.t0 + s.len) || secs[secs.length - 1];
const firstOf = (type) => secs.find((s) => s.type === type);
const GAL = 2 * BAR; // частицы: 2 такта слово CLAUDE, потом взрыв в галактику
const MONT = [['hero', 2.2], ['fractal', 6.2], ['hole', 4.5], ['terrain', 3.2], ['city', 5.4], ['prism', 3.0], ['liquid', 4.2], ['particles', GAL + 2.2]];
const NUM = {}; { let n = 0; for (const s of secs) if (NAME[s.type]) NUM[s.i] = ++n; }

// ---------- камера и параметры каждой сцены (l - время от начала сцены, len - длина сцены)
const CODE_BARS = 5;
const typed = (l) => clamp((l - 0.4) / (CODE_BARS * BAR - 0.9));
const CAM = {
  intro(st) { const l = st.l; st.cam = [0, 0.15, 4.2]; st.tgt = [0, -0.05, 0]; st.fov = 52; st.A = 0;
    st.B = typed(l) + E.inOutCubic(inv(CODE_BARS * BAR, (CODE_BARS + 2) * BAR, l)); st.C = E.outCubic(inv(7 * BAR, 7.6 * BAR, l));
    st.P = [lerp(1.7, 0, E.inOutCubic(inv(7 * BAR, 8 * BAR - 0.2, l))), 0, 0]; },
  hero(st) { const l = st.l, nb = Math.round(st.len / BAR); let whip = 0, roll = 0;
    for (let j = 1; j < nb; j++) { const w = E.inOutExpo(inv(j * BAR - 0.15, j * BAR + 0.18, l)); whip += w * 1.6; if (w > 0 && w < 1) roll += Math.sin(w * Math.PI) * 0.12; }
    const ang = l * 0.38 + whip + 0.3, rad = 7.6 - 0.6 * E.outCubic(Math.min(1, l / st.len));
    st.cam = [Math.sin(ang) * rad, 0.35 + 0.3 * Math.sin(l * 0.9), Math.cos(ang) * rad]; st.tgt = [0, 0.78, 0]; st.fov = 36;
    const seg = 0.9375, i = Math.floor(l / seg), kk = i + E.inOutCubic(inv(0, 0.35, l - i * seg)), m = kk % 6; st.A = m <= 3 ? m : 6 - m;
    st.roll = Math.sin(l * 0.7) * 0.03 + roll * 0.6; },
  type(st) { st.cam = [0, 0, 6]; },
  tunnel(st) { const l = st.l, cr = Math.max(0, l - (st.len - BAR)); const z = l * 6 + Math.pow(cr, 3) * 3.2;
    st.cam = [0, 0, -z]; st.tgt = [Math.sin(l * 1.3) * 0.4, Math.cos(l) * 0.3, -z - 6];
    st.B = Math.max(E.inCubic(cr / BAR), 0.12 * inv(0, st.len - BAR, l)); st.fov = 70 + 32 * E.inCubic(cr / BAR); st.roll = l * 0.25; },
  particles(st) { const l = st.l; const a = Math.sin(l * 0.5) * 0.8;
    const camA = [Math.sin(a) * 9.2, 0.3 + 0.15 * Math.sin(l * 1.1), Math.cos(a) * 9.2 - l * 0.25];
    const camB = [-0.2, 3.6, 9.6], tgtB = [2.5, -0.2, 0]; const p = E.inOutCubic(inv(GAL, GAL + 0.93, l));
    // последние 3 такта: галактика уезжает вправо, слева место под цифры
    const q = E.inOutCubic(inv(st.len - 3 * BAR - 0.4, st.len - 3 * BAR + 0.5, l));
    st.cam = camA.map((v, i) => lerp(v, camB[i] + (i === 0 ? Math.sin(l * 0.5) * 0.4 : 0), p)); st.tgt = [0, 0, 0].map((v, i) => lerp(v, tgtB[i], p));
    st.tgt[0] -= 3.2 * q; st.fov = 40; st.B = p; },
  end(st) { const l = st.l; const q = E.inOutCubic(inv(3 * BAR - 0.3, 3 * BAR + 0.7, l));
    st.cam = [Math.sin(l * 0.3) * 0.4 * (1 - q) + 0.3 * q, 0.55 + 0.6 * q, 6.6 - 0.6 * E.outCubic(l / 1.875) + 1.6 * q]; st.tgt = [2.3 * q, 0.45, 0]; // на экране x зеркален: цель правее - гироскоп справа st.fov = 36;
    st.A = 4 * Math.PI * E.outExpo(clamp(l / 1.15)) + l * 0.15; st.B = l > 0.9 ? 0.22 * Math.exp(-(l - 0.9) * 4) * Math.sin((l - 0.9) * 18) : 0; },
  fractal(st) { const l = st.l; const ang = l * 0.22 + 0.8, rad = lerp(3.0, 1.8, E.inOutCubic(Math.min(1, l / st.len)));
    st.cam = [Math.sin(ang) * rad, 0.3 + 0.45 * Math.sin(l * 0.17 + 0.4), Math.cos(ang) * rad]; st.tgt = [0, 0, 0]; st.fov = 46;
    st.A = 8 - 2.2 * (0.5 - 0.5 * Math.cos(l * 0.45)); st.roll = Math.sin(l * 0.3) * 0.08; },
  hole(st) { const l = st.l, d = lerp(27, 17, E.inOutCubic(clamp(l / st.len))), a = 0.5 + l * 0.07, e = 0.11 + 0.04 * Math.sin(l * 0.4);
    st.cam = [Math.sin(a) * d * Math.cos(e), d * Math.sin(e), Math.cos(a) * d * Math.cos(e)];
    const f = st.cam.map((v) => -v / d); const r = [f[2], 0, -f[0]]; const rl = Math.hypot(...r); // вправо от взгляда
    st.tgt = r.map((v) => (v / rl) * 0.22 * d); st.fov = 42; st.roll = 0.05; }, // цель левее дыры: дыра справа, слева место под текст
  liquid(st) { const l = st.l, ang = l * 0.3 + 2.0; st.cam = [Math.sin(ang) * 6.0, 1.0 + 0.35 * Math.sin(l * 0.5), Math.cos(ang) * 6.0]; st.tgt = [0, -0.1, 0]; st.fov = 38; },
  terrain(st) { const l = st.l, z = -l * 9 - 5, x = Math.sin(l * 0.5) * 0.8;
    st.cam = [x, -0.45 + 0.2 * Math.sin(l * 0.8), z]; st.tgt = [x * 0.4 + Math.sin(l * 0.3) * 0.5, -0.55, z - 10]; st.roll = Math.sin(l * 0.6) * 0.07; st.fov = 62; },
  city(st) { const l = st.l, z = -l * 5.5, x = l * 0.7; st.cam = [x, 6.6 - 1.9 * E.inOutCubic(Math.min(1, l / st.len)), z + 6];
    st.tgt = [x + 2, 1.0, z - 6]; st.roll = -0.05 + Math.sin(l * 0.4) * 0.04; st.fov = 55; },
  prism(st) { const l = st.l, ang = l * 0.35 + 0.4; st.cam = [Math.sin(ang) * 4.9, 0.55, Math.cos(ang) * 4.9]; st.tgt = [0, 0.25, 0]; st.fov = 34; st.A = l * 0.6; },
};

function state(t) {
  const sec = secAt(t); let type = sec.type, l = t - sec.t0, len = sec.len, mont = null;
  if (type === 'montage') { const b = Math.min(sec.bars * 2 - 1, Math.floor(l / (2 * BEAT))); const [ty, off] = MONT[b % MONT.length];
    mont = { b, lb: l - b * 2 * BEAT, ty }; type = ty; len = firstOf(ty).len; l = off + mont.lb; }
  const k = clamp(envSum(t, TL.kicks, 9)); const imp = envSum(t, TL.impacts, 6, true);
  const st = { t, sec, type, s: SID[type], l, len, mont, k, A: 0, B: 0, C: 0, P: [0, 0, 0], fov: 40, roll: 0, cam: [0, 0, 6], tgt: [0, 0, 0], hudInk: null };
  CAM[type](st);
  const shake = imp * 0.05;
  st.cam = st.cam.map((v, i) => v + shake * Math.sin(t * (63 + i * 17)));
  st.tgt = st.tgt.map((v, i) => v + shake * 0.6 * Math.sin(t * (51 + i * 23)));
  st.flash = clamp(envSum(t, TL.impacts, 16, true) * 0.9 + envSum(t, TL.count, 18) * 0.12 + envSum(t, TL.cuts, 24) * 0.3);
  st.ca = 0.5 + k * 1.2 + imp * 4 + (type === 'tunnel' ? st.B * 3 : 0) + (mont ? 2.5 * Math.exp(-mont.lb * 9) : 0);
  st.black = TL.gap && t >= TL.gap[0] && t < TL.gap[1] ? 1 : 0;
  st.fade = inv(DUR - 1.4, DUR, t);
  st.expo = type === 'particles' ? 1.1 : type === 'fractal' ? 1.15 : 1.0;
  return st;
}

// ---------- 2D слои: back (за 3D, герой) и front (поверх всего)
const back = document.createElement('canvas'); back.width = OW; back.height = OH; const bx = back.getContext('2d'); bx.setTransform(K, 0, 0, K, 0, 0);
const front = document.createElement('canvas'); front.width = OW; front.height = OH; const fx = front.getContext('2d', { willReadFrequently: true }); fx.setTransform(K, 0, 0, K, 0, 0);

// ---------- система текста. MODE: 'all' - как в ролике, 'mask' - только буквы (крупные красным, мелкие зелёным), 'none' - без букв.
// LOG собирает надписи кадра для законов: время на чтение, безопасные поля, наложения.
const MODE = { v: 'all' }, LOG = { on: false, reg: [], glyphs: [], deco: 0 };
function wrapCtx(ctx) {
  const o = {}; for (const m of ['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'save', 'restore', 'rect', 'clip']) o[m] = ctx[m].bind(ctx);
  // обрезка (clip) для закона полей: буквы за обрезкой не видны, их не считаем
  const stack = []; let clipR = null, lastR = null;
  ctx.save = () => { stack.push(clipR); o.save(); }; ctx.restore = () => { clipR = stack.length ? stack.pop() : null; o.restore(); };
  ctx.rect = (x, y, w, h) => { const tr = ctx.getTransform(); lastR = [(tr.a * x + tr.e) / K, (tr.d * y + tr.f) / K, (tr.a * (x + w) + tr.e) / K, (tr.d * (y + h) + tr.f) / K]; o.rect(x, y, w, h); };
  ctx.clip = (...a) => { if (lastR) clipR = clipR ? [Math.max(clipR[0], lastR[0]), Math.max(clipR[1], lastR[1]), Math.min(clipR[2], lastR[2]), Math.min(clipR[3], lastR[3])] : lastR.slice(); o.clip(...a); };
  for (const m of ['fill', 'stroke', 'fillRect', 'strokeRect']) ctx[m] = (...a) => { if (MODE.v !== 'mask') o[m](...a); };
  for (const m of ['fillText', 'strokeText']) ctx[m] = (s, x, y) => {
    if (MODE.v === 'none' || ctx.globalAlpha < 0.003) return;
    if (ctx.__outline) { if (MODE.v !== 'mask') o[m](s, x, y); return; } // тёмная обводка - не буквы, в маску и журнал не идёт
    const tr = ctx.getTransform(), sc = Math.hypot(tr.a, tr.b) / K, size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(ctx.font)[1]) * sc;
    if (LOG.on && !LOG.deco && String(s).trim()) { const mt = ctx.measureText(s); const al = ctx.textAlign;
      const x0 = al === 'center' ? x - mt.width / 2 : al === 'right' || al === 'end' ? x - mt.width : x;
      const pts = [[x0, y - mt.actualBoundingBoxAscent], [x0 + mt.width, y + mt.actualBoundingBoxDescent]].map(([px, py]) => [(tr.a * px + tr.c * py + tr.e) / K, (tr.b * px + tr.d * py + tr.f) / K]);
      const g = { s: String(s), a: ctx.globalAlpha, x0: Math.min(pts[0][0], pts[1][0]), y0: Math.min(pts[0][1], pts[1][1]), x1: Math.max(pts[0][0], pts[1][0]), y1: Math.max(pts[0][1], pts[1][1]) };
      if (clipR) { g.x0 = Math.max(g.x0, clipR[0]); g.y0 = Math.max(g.y0, clipR[1]); g.x1 = Math.min(g.x1, clipR[2]); g.y1 = Math.min(g.y1, clipR[3]); }
      if (g.x1 > g.x0 && g.y1 > g.y0) LOG.glyphs.push(g); }
    if (MODE.v === 'mask') { ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      ctx.fillStyle = ctx.strokeStyle = size >= 48 ? '#ff0000' : '#00ff00'; o[m](s, x, y); ctx.restore(); return; }
    o[m](s, x, y); };
}
wrapCtx(fx); wrapCtx(bx);
// надпись для законов: id, полный текст, рамка в логических координатах, видимость
function REG(id, text, x, y, w, h, a) { if (LOG.on && a > 0.01) LOG.reg.push({ id, text, x, y, w, h, a }); }
function deco(f) { LOG.deco++; try { f(); } finally { LOG.deco--; } } // декоративный текст: не проверяется на поля и наложения

function font(ctx, size, weight = 700, fam = FD, stretch = 'normal', spacing = '0px') { ctx.font = `${weight} ${size}px ${fam}`; ctx.fontStretch = stretch; ctx.letterSpacing = spacing; }
// крупное слово с тёмной обводкой: читается на любом фоне
function heavy(ctx, s, x, y, w = 12) { ctx.save(); ctx.__outline = true; ctx.shadowColor = 'transparent'; ctx.lineJoin = 'round'; ctx.lineWidth = w;
  ctx.strokeStyle = 'rgba(0,0,0,0.72)'; ctx.strokeText(s, x, y); ctx.__outline = false; ctx.restore(); ctx.fillText(s, x, y); }
function shade(ctx, blur = 14) { ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = blur * K; } // тень под буквами: blur в пикселях устройства, поэтому * K
// тёмная мягкая подложка под текст
function scrim(x, y, w, h, a = 1, k = 0.62) { if (a <= 0.003) return; fx.save(); fx.globalAlpha = a; fx.fillStyle = `rgba(4,4,10,${k})`;
  fx.shadowColor = `rgba(4,4,10,${k})`; fx.shadowBlur = 50 * K; fx.fillRect(x, y, w, h); fx.restore(); }
// тёмный градиент от края кадра под заголовки
function sideScrim(side, wpx, a = 1, k = 0.7) { if (a <= 0.003) return; fx.save(); fx.globalAlpha = a;
  const g = side === 'left' ? fx.createLinearGradient(0, 0, wpx, 0) : fx.createLinearGradient(W, 0, W - wpx, 0);
  g.addColorStop(0, `rgba(3,3,8,${k})`); g.addColorStop(0.55, `rgba(3,3,8,${k * 0.6})`); g.addColorStop(1, 'rgba(3,3,8,0)'); fx.fillStyle = g;
  fx.fillRect(side === 'left' ? 0 : W - wpx, 0, wpx, H); fx.restore(); }
function lettered(ctx, word, cx, cy, f, fill = true) {
  const ws = [...word].map((ch) => ctx.measureText(ch).width); const sp = parseFloat(ctx.letterSpacing) || 0;
  const total = ws.reduce((a, b) => a + b, 0) + sp * (word.length - 1); let x = cx - total / 2;
  [...word].forEach((ch, i) => { const s = f(i, word.length); if (s.a > 0.001) { ctx.save(); ctx.globalAlpha *= s.a;
      ctx.translate(x + ws[i] / 2 + (s.dx || 0), cy + (s.dy || 0)); ctx.rotate(s.rot || 0); ctx.scale(s.sx || s.sc || 1, s.sc || 1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; fill ? ctx.fillText(ch, 0, 0) : ctx.strokeText(ch, 0, 0); ctx.restore(); }
    x += ws[i] + sp; });
  return total;
}
// перемешивание букв только в первые 0,3 с появления
function scramble(txt, p, seed) { if (p >= 1) return txt; const r = rng(seed); const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/%'; const n = Math.floor(txt.length * p);
  return [...txt].map((ch, i) => (i < n || ch === ' ' ? ch : pool[Math.floor(r() * pool.length)])).join(''); }
// подпись внизу: a - время с появления, life - сколько живёт
function caption(id, txt, a, life, y = H - 140) {
  if (a < 0 || a > life) return; const al = clamp(a / 0.2) * (1 - inv(life - 0.3, life, a));
  fx.save(); font(fx, 30, 500, FM, 'normal', '4px'); const w = fx.measureText(txt).width;
  scrim(W / 2 - w / 2 - 36, y - 42, w + 72, 60, al);
  fx.globalAlpha = al; fx.fillStyle = '#fff'; fx.textAlign = 'center'; shade(fx, 10);
  fx.fillText(scramble(txt, inv(0, 0.3, a), hashStr(id)), W / 2, y); fx.restore();
  REG(id, txt, W / 2 - w / 2, y - 24, w, 30, al);
}
// техническая сводка: строки моноширинным 22 px на подложке
function readout(id, x, y, rows, a, accent = C.coral) {
  if (a <= 0.003) return; fx.save(); font(fx, 22, 500, FM, 'normal', '2px');
  const w = Math.max(...rows.map((r) => fx.measureText(r).width)), lh = 34;
  scrim(x - 34, y - 36, w + 64, rows.length * lh + 30, a);
  fx.globalAlpha = a; fx.fillStyle = '#fff'; fx.textAlign = 'left'; shade(fx, 8);
  rows.forEach((r, i) => { fx.fillText(r, x, y + i * lh); REG(id + i, r, x, y + i * lh - 18, fx.measureText(r).width, 22, a); });
  fx.shadowBlur = 0; fx.fillStyle = accent; fx.fillRect(x - 18, y - 22, 3, rows.length * lh); fx.restore();
}
const rdA = (l, t0, t1) => E.outExpo(inv(t0, t0 + 0.5, l)) * (1 - inv(t1 - 0.3, t1, l)); // видимость сводки от t0 до t1

// большое слово, которое въезжает маской снизу и уезжает вверх
function maskWord(id, ctx, w, x, y, size, a, life, col, align = 'center', shadow = true) {
  if (a < 0 || a > life) return; const pin = E.outExpo(clamp(a / 0.45)), pout = E.inExpo(inv(life - 0.25, life, a));
  ctx.save(); font(ctx, size, 800, FD, 'condensed', '2px'); ctx.textAlign = align;
  const mw = ctx.measureText(w).width, x0 = align === 'center' ? x - mw / 2 : align === 'right' ? x - mw : x;
  ctx.beginPath(); ctx.rect(0, y - size * 0.82, W, size * 1.0); ctx.clip();
  ctx.fillStyle = col; if (shadow) shade(ctx, 30); const yy = y + (1 - pin) * size - pout * size;
  heavy(ctx, w, x, yy, size / 14); ctx.restore();
  REG(id, w, x0, y - size * 0.72, mw, size * 0.72, pin * (1 - pout));
}

function drawHUD(st) {
  const { t, sec } = st; const a = 0.85 * E.outCubic(inv(0.3, 0.8, t)) * (1 - st.fade);
  if (a <= 0.003 || st.black) return;
  const ink = st.hudInk || '#fff';
  if (!st.hudInk) { fx.save(); fx.globalAlpha = a / 0.85; // мягкое затемнение у краёв под служебные строки
    let g = fx.createLinearGradient(0, 0, 0, 170); g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); fx.fillStyle = g; fx.fillRect(0, 0, W, 170);
    g = fx.createLinearGradient(0, H - 190, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.8)'); fx.fillStyle = g; fx.fillRect(0, H - 190, W, 190); fx.restore();
    scrim(MX - 16, H - 104, 470, 44, a, 0.35); scrim(W - MX - 600, H - 104, 616, 44, a, 0.35); }
  fx.save(); fx.globalAlpha = a; fx.fillStyle = ink; fx.strokeStyle = ink; fx.lineWidth = 2; if (!st.hudInk) shade(fx, 10);
  font(fx, 22, 500, FM, 'normal', '3px');
  fx.textAlign = 'left'; fx.fillText('CLAUDE  /  MOTION REEL 2026', MX, 92); REG('hud1', 'CLAUDE  /  MOTION REEL 2026', MX, 74, 420, 22, a);
  const fr = Math.floor(t * FPS + 1e-6), sTot = Math.floor(fr / FPS); fx.textAlign = 'right';
  const tc = `TC 00:${pad2(Math.floor(sTot / 60))}:${pad2(sTot % 60)}:${String(fr % FPS).padStart(FPS > 99 ? 3 : 2, '0')}`;
  fx.fillText(tc, W - MX, 92); REG('tc', tc, W - MX - 290, 74, 290, 22, a);
  if (sec.type !== 'end') { const s = `${OW} x ${OH}  ·  ${FPS} FPS  ·  128 BPM`; fx.fillText(s, W - MX, H - 74); REG('hud2', s, W - MX - 560, H - 92, 560, 22, a); }
  if (sec.type === 'intro' && Math.floor(t * 3) % 2 === 0) { fx.save(); fx.shadowBlur = 0; fx.beginPath(); fx.arc(MX - 26, 84, 7, 0, 7); fx.fillStyle = '#ff2a2a'; fx.fill(); fx.restore(); }
  fx.shadowBlur = 0; const m = 40, L = 34;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { fx.beginPath(); fx.moveTo(x, y + sy * L); fx.lineTo(x, y); fx.lineTo(x + sx * L, y); fx.stroke(); }
  if (NAME[sec.type]) { const p = E.outExpo(inv(0.2, 0.6, t - sec.t0)); const lab = `${pad2(NUM[sec.i])}  ${NAME[sec.type]}`;
    fx.textAlign = 'left'; font(fx, 24, 600, FM, 'normal', '4px'); if (!st.hudInk) shade(fx, 10);
    fx.save(); fx.beginPath(); fx.rect(MX, H - 110, 760, 46); fx.clip(); fx.fillText(lab, MX + (1 - p) * -560, H - 74); fx.restore();
    REG('sec' + sec.i, lab, MX, H - 94, fx.measureText(lab).width, 24, a * p);
    fx.shadowBlur = 0; fx.fillRect(MX, H - 62, 220 * p, 2);
    fx.globalAlpha = a * 0.5; fx.fillRect(MX, H - 44, (W - 2 * MX) * (t / DUR), 1); }
  fx.restore();
}

// ---------- интро: код печатается слева, справа по нему «печатается» фигура, потом отсчёт
const CODE = [
  '// claude · motion reel 2026 · every pixel is code',
  'float scene(vec3 p) {',
  '  float d = sdSphere(p, 1.0);',
  '  d = smin(d, sdTorus(p, vec2(0.9, 0.3)), 0.4);',
  '  return d;',
  '}',
  'vec3 shade(vec3 p, vec3 rd) {',
  '  vec3 n = normal(p);',
  '  return env(reflect(rd, n)) * fresnel(n, rd);',
  '}',
  'float kick = exp(-9.0 * (t - beat));',
  `render(scene, ${OW}, ${OH}, ${FPS});`,
];
const KW = /\b(float|vec2|vec3|return|render)\b/g;
const CODE_N = CODE.reduce((a, s) => a + s.length, 0);
function drawCode(st) { const l = st.l;
  const shown = Math.floor(typed(l) * CODE_N); const fade = 1 - inv(7 * BAR - 0.5, 7 * BAR, l); if (fade <= 0) return;
  fx.save(); fx.globalAlpha = fade * inv(0.2, 0.5, l); font(fx, 30, 500, FM, 'normal', '0px'); const cw = fx.measureText('M').width; fx.textAlign = 'left';
  let n = 0, cx = 0, cy = 0; const x0 = 170, y0 = 300, lh = 50;
  scrim(x0 - 90, y0 - 120, 1000, CODE.length * lh + 150, fx.globalAlpha, 0.6);
  CODE.forEach((line, li) => {
    if (n < shown) { fx.fillStyle = 'rgba(255,255,255,0.72)'; font(fx, 22, 500, FM); fx.fillText(String(li + 1).padStart(2, ' '), x0 - 62, y0 + li * lh); font(fx, 30, 500, FM, 'normal', '0px'); }
    const cols = new Array(line.length).fill(li === 0 ? '#c9c6d8' : C.paper);
    if (li > 0) { for (const m of line.matchAll(KW)) for (let j = 0; j < m[0].length; j++) cols[m.index + j] = C.cyan;
      for (const m of line.matchAll(/\d+(\.\d+)?/g)) for (let j = 0; j < m[0].length; j++) cols[m.index + j] = '#ff7a5c'; }
    const vis = Math.max(0, Math.min(line.length, shown - n));
    for (let j = 0; j < vis; j++) { fx.fillStyle = cols[j]; fx.fillText(line[j], x0 + j * cw, y0 + li * lh); cx = x0 + (j + 1) * cw; cy = y0 + li * lh; }
    if (vis === line.length) REG('code' + li, line, x0, y0 + li * lh - 24, line.length * cw, 30, fx.globalAlpha);
    n += line.length;
  });
  if (Math.floor(l * 4) % 2 === 0 || shown < CODE_N) { fx.fillStyle = C.coral; fx.fillRect(cx + 2, cy - 26, cw * 0.9, 32); }
  font(fx, 22, 500, FM, 'normal', '3px'); fx.fillStyle = '#fff'; fx.globalAlpha *= 0.8;
  const hdr = `${String(Math.min(shown, CODE_N)).padStart(3, '0')} / ${CODE_N} CHARS  ·  0 ASSETS`; fx.fillText(hdr, x0, y0 - 70); REG('codehdr', hdr, x0, y0 - 88, 520, 22, fx.globalAlpha);
  fx.restore();
}
function drawIntro(st) { const l = st.l;
  drawCode(st);
  // подпись под фигурой: сколько напечатано
  const pa = inv(1.0, 1.6, l) * (1 - inv(7 * BAR - 0.5, 7 * BAR, l));
  if (pa > 0) { const pc = Math.floor(clamp(st.B) * 100), solid = st.B > 1;
    const s = solid ? 'SDF SOLIDIFIED  ·  CHROME' : `PRINTING SDF  ${String(pc).padStart(3, ' ')}%`;
    fx.save(); fx.globalAlpha = pa; font(fx, 24, 500, FM, 'normal', '4px'); fx.textAlign = 'center'; fx.fillStyle = '#fff'; shade(fx, 10);
    const cxs = 1480; fx.fillText(s, cxs, 930); REG(solid ? 'prn2' : 'prn', s, cxs - 230, 906, 460, 24, pa);
    fx.shadowBlur = 0; fx.fillStyle = 'rgba(255,255,255,0.3)'; fx.fillRect(cxs - 230, 952, 460, 2); fx.fillStyle = C.coral; fx.fillRect(cxs - 230, 952, 460 * clamp(st.B), 2); fx.restore(); }
  const lb = l - (st.len - BAR); if (lb < 0) return;
  // отсчёт слева от фигуры
  const cx = 560, cy = H / 2;
  TL.count.forEach((tc, k) => { const a = st.t - tc; if (a < 0 || a > BEAT) return;
    const p = E.outExpo(clamp(a / 0.25)); const out = inv(BEAT - 0.1, BEAT, a);
    fx.save(); fx.globalAlpha = (1 - out); fx.translate(cx, cy); fx.scale(1.35 - 0.35 * p, 1.35 - 0.35 * p);
    font(fx, 380, 800, FD, 'condensed'); fx.textAlign = 'center'; fx.textBaseline = 'middle'; fx.fillStyle = '#fff'; shade(fx, 30); fx.fillText(String(3 - k), 0, 10);
    fx.restore(); REG('!count' + k, String(3 - k), cx - 110, cy - 140, 220, 280, 1 - out);
    fx.save(); fx.strokeStyle = k === 2 ? C.coral : C.cyan; fx.lineWidth = 3 * (1 - p) + 1; fx.globalAlpha = 1 - p;
    fx.beginPath(); fx.arc(cx, cy, 120 + 380 * p, 0, 7); fx.stroke(); fx.restore(); });
}

function drawHero(st) { const l = st.l;
  const words = [['MOTION', C.coral], ['DESIGN', C.paper]];
  words.forEach(([w, col], wi) => { const a = l - wi * 2 * BAR; if (a < -0.2 || a > 2 * BAR + 0.1) return;
    const outA = wi < words.length - 1 ? l - ((wi + 1) * 2 * BAR - 0.18) : -1;
    font(bx, 330, 800, FD, 'condensed', '-4px'); bx.fillStyle = col;
    bx.save(); bx.beginPath(); bx.rect(0, 100, W, 330); bx.clip();
    const pulse = 1 + st.k * 0.02;
    const tw = lettered(bx, w, W / 2, 400, (i) => { const pin = E.outExpo(clamp((a - i * 0.045) / 0.5)); const pout = outA > 0 ? E.inExpo(clamp((outA - i * 0.02) / 0.2)) : 0;
      return { dy: (1 - pin) * 340 - pout * 340, a: 1, sc: pulse }; });
    bx.restore(); REG('hero' + wi, w, W / 2 - tw / 2, 162, tw, 238, E.outExpo(clamp((a - 0.25) / 0.5)) * (outA > 0 ? 1 - clamp(outA / 0.2) : 1)); });
  const shapes = ['SPHERE', 'BOX', 'TORUS', 'OCTAHEDRON'];
  caption('hcap', 'RAYMARCHED  ·  0 POLYGONS  ·  0 TEXTURES', l - 0.5, 2 * BAR - 0.1);
  readout('hrd', 1430, 560, [`SDF   ${shapes[Math.round(st.A)]}`, `ROT   ${(st.t * 45.8 % 360).toFixed(1).padStart(5, ' ')}°`, `KICK  ${'|'.repeat(Math.round(st.k * 10)).padEnd(10, '·')}`], rdA(l, 2 * BAR, st.len), C.coral);
}

function drawType(st) { const l = st.l, WB = BAR, nb = Math.round(st.len / WB); // слово держится такт
  const words = ['SHAPE', 'ANIMATE', 'RENDER', 'REPEAT'];
  const bi = Math.min(nb - 1, Math.floor(l / WB)); const lb = l - bi * WB; const s = bi % 4, word = words[bi];
  const bgs = [C.coral, null, C.paper, C.cyan], fgs = [C.ink, '#fff', C.ink, C.ink];
  if (bgs[s]) st.hudInk = C.ink;
  fx.save();
  if (bgs[s]) { fx.fillStyle = bgs[s]; fx.fillRect(0, 0, W, H); }
  fx.fillStyle = fgs[s]; fx.strokeStyle = fgs[s];
  if (s !== 3) { fx.beginPath(); fx.rect(MX, MY, W - 2 * MX, H - 2 * MY); fx.clip(); } // въезд букв из-за безопасного поля
  const cy = H / 2 + 120; let tw = 0, sz = 380;
  if (s === 0) { font(fx, 380, 800, FD, 'condensed', '4px');
    tw = lettered(fx, word, W / 2, cy, (i) => { const p = E.outBack(clamp((lb - i * 0.03) / 0.3)); return { dy: (1 - p) * -700, a: 1 }; });
    fx.fillRect(W / 2 - 600, cy + 50, 1200 * E.outExpo(clamp(lb / 0.35)), 8); }
  if (s === 1) { font(fx, 330, 800, FD, 'condensed', '2px'); const drift = -lb * 60; sz = 330;
    tw = lettered(fx, word, W / 2 + drift, cy, (i) => { const p = E.outExpo(clamp((lb - i * 0.025) / 0.35)); return { rot: (1 - p) * -1.2, sc: 0.3 + 0.7 * p, dy: (1 - p) * 120, a: p }; });
    fx.fillStyle = C.coral; fx.beginPath(); fx.arc(W / 2 + tw / 2 + 90 + drift, cy - 240, 26 * E.outBack(clamp(lb / 0.3)), 0, 7); fx.fill(); }
  if (s === 2) { font(fx, 380, 800, FD, 'condensed', '4px'); tw = fx.measureText(word).width; const sl = 9; const top = cy - 300, hh = 360;
    for (let j = 0; j < sl; j++) { fx.save(); fx.beginPath(); fx.rect(0, top + j * hh / sl, W, hh / sl + 1); fx.clip();
      const off = (j % 2 ? 1 : -1) * (1 - E.outExpo(clamp(lb / 0.3))) * (300 + j * 40);
      if (lb < 0.18) { fx.save(); fx.globalAlpha = 0.85; fx.fillStyle = C.coral; fx.textAlign = 'center'; fx.fillText(word, W / 2 + off + 14, cy); fx.fillStyle = C.cyan; fx.fillText(word, W / 2 + off - 14, cy); fx.restore(); }
      fx.textAlign = 'center'; fx.fillText(word, W / 2 + off, cy); fx.restore(); } }
  if (s === 3) { font(fx, 150, 800, FD, 'condensed', '6px'); fx.lineWidth = 2; sz = 150;
    const zoom = 1 + E.inExpo(inv(WB - 0.2, WB, lb)) * 5; fx.translate(W / 2, H / 2); fx.scale(zoom, zoom); fx.translate(-W / 2, -H / 2);
    const row = (word + '  ').repeat(7); tw = fx.measureText(word).width;
    deco(() => { for (let r = -2; r <= 2; r++) { if (!r) continue; const y = H / 2 + 55 + r * 150; const dir = r % 2 ? 1 : -1; const x0 = dir * (lb * 420 + r * 137) % 900;
      const p = E.outExpo(clamp((lb - Math.abs(r) * 0.03) / 0.25)); fx.textAlign = 'center'; fx.globalAlpha = p * 0.35; fx.strokeText(row, W / 2 + x0, y); } });
    fx.globalAlpha = E.outExpo(clamp(lb / 0.25)); fx.textAlign = 'center'; fx.fillText(word, W / 2, H / 2 + 55); fx.globalAlpha = 1; }
  fx.restore();
  REG('type' + bi, word, W / 2 - tw / 2, (s === 3 ? H / 2 + 55 : cy) - sz * 0.72, tw, sz * 0.72, inv(0.1, 0.35, lb) * (1 - inv(WB - 0.13, WB, lb)));
  if (bi < nb - 1 && lb > WB - 0.13) { const p = E.inOutCubic(inv(WB - 0.13, WB, lb)); const nb2 = bgs[(bi + 1) % 4] || '#07070b';
    fx.save(); fx.fillStyle = nb2; fx.beginPath(); const x = W + 400 - p * (W + 800);
    fx.moveTo(x, 0); fx.lineTo(x + W + 400, 0); fx.lineTo(x + W, H); fx.lineTo(x - 400, H); fx.closePath(); fx.fill(); fx.restore(); }
}

// туннель: 3 слова по такту летят навстречу, последний такт - только скорость и тишина перед дропом
function drawTunnel(st) { const l = st.l, cx = W / 2, cy = H / 2; const sp = st.B;
  fx.save();
  const r = rng(99); fx.strokeStyle = '#fff';
  for (let i = 0; i < 160; i++) { const a = r() * Math.PI * 2; const ph = (r() + l * (0.6 + sp * 3.5)) % 1; const d0 = 120 + ph * ph * 1300; const len = 20 + sp * 380 * ph;
    fx.globalAlpha = (0.15 + 0.6 * sp) * ph; fx.lineWidth = 1 + ph * 2; fx.beginPath(); fx.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0); fx.lineTo(cx + Math.cos(a) * (d0 + len), cy + Math.sin(a) * (d0 + len)); fx.stroke(); }
  ['FASTER', 'DEEPER', 'BRIGHTER'].forEach((w, i) => { const a = l - i * BAR - 0.1, life = BAR; if (a < 0 || a > life) return;
    const sc = 0.5 * Math.exp(a * 0.45); const al = inv(0, 0.15, a) * (1 - inv(life - 0.35, life, a));
    fx.save(); fx.globalAlpha = al; fx.translate(cx, cy); fx.scale(sc, sc);
    font(fx, 260, 800, FD, 'condensed', '10px'); fx.textAlign = 'center'; fx.textBaseline = 'middle'; fx.fillStyle = i === 1 ? C.coral : '#fff'; shade(fx, 30);
    const tw = fx.measureText(w).width; deco(() => heavy(fx, w, 0, 0, 22)); fx.restore();
    REG('tun' + i, w, cx - tw * sc / 2, cy - 100 * sc, tw * sc, 200 * sc, al); });
  fx.globalAlpha = 0.8; fx.fillStyle = '#fff'; fx.fillRect(cx - 400, H - 160, 800 * clamp(l / st.len), 3);
  fx.fillStyle = 'rgba(255,255,255,0.25)'; fx.fillRect(cx - 400, H - 160, 800, 1);
  const vs = `VELOCITY  ${(20 + sp * 980).toFixed(0).padStart(4, ' ')} u/s`;
  font(fx, 24, 500, FM, 'normal', '4px'); fx.textAlign = 'center'; fx.fillStyle = '#fff'; shade(fx, 10); fx.fillText(vs, cx, H - 182); REG('vel', vs, cx - 220, H - 204, 440, 24, 0.8);
  fx.restore();
}

const PCOUNT = { n: 0 };
function drawParticles(st) { const l = st.l, cx = W / 2, cy = H / 2;
  fx.save(); fx.fillStyle = '#fff'; fx.strokeStyle = '#fff';
  if (l < GAL) { const p = E.outExpo(inv(0.5, 0.9, l)); const out = inv(GAL - 0.15, GAL, l); fx.globalAlpha = 1 - out;
    fx.lineWidth = 2; const bw = 680, bh = 220, L = 50 * p;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = cx + sx * bw, y = cy + sy * bh; fx.beginPath(); fx.moveTo(x, y - sy * L); fx.lineTo(x, y); fx.lineTo(x - sx * L, y); fx.stroke(); }
    fx.restore();
    caption('pcap', `${PCOUNT.n.toLocaleString('en-US')} PARTICLES  ·  ONE SHADER`, l - 0.6, GAL - 0.6, H - 170); }
  else if (l < st.len - 3 * BAR) { fx.restore(); caption('gcap', 'EVERY STAR IS ONE LINE OF MATH', l - GAL - 0.5, st.len - 3 * BAR - GAL - 0.4, H - 170); }
  else { // итоги на тёмной панели слева: по одной цифре на долю, остаются сеткой 2x2
    const e = l - (st.len - 3 * BAR);
    const out = E.inExpo(inv(3 * BAR - 0.2, 3 * BAR, e));
    sideScrim('left', 1250, E.outCubic(inv(-0.3, 0.4, e)) * (1 - out), 0.82);
    const items = [[Math.round(DUR * FPS), 'FRAMES RENDERED'], [0, 'IMAGES USED'], [0, 'AUDIO SAMPLES'], [100, 'CODE']];
    items.forEach(([num, lab], j) => { const a = e - 0.25 - j * BEAT; if (a < 0) return;
      const pin = E.outExpo(clamp(a / 0.35)); const x = 170 + (j % 2) * 470, y = cy - 30 + Math.floor(j / 2) * 300;
      const shown = Math.floor(num * E.outCubic(clamp(a / 0.5))).toLocaleString('en-US') + (j === 3 ? '%' : '');
      fx.save(); fx.beginPath(); fx.rect(x - 10, y - 170, 460, 200); fx.clip();
      font(fx, 160, 800, FD, 'condensed', '0px'); fx.textAlign = 'left'; fx.fillStyle = j === 3 ? C.coral : '#fff'; fx.globalAlpha = 1 - out; shade(fx, 20);
      heavy(fx, shown, x, y + (1 - pin) * 200, 12); fx.restore();
      fx.save(); fx.globalAlpha = pin * (1 - out); font(fx, 26, 500, FM, 'normal', '5px'); fx.fillStyle = '#fff'; fx.textAlign = 'left'; shade(fx, 8); fx.fillText(lab, x + 4, y + 52);
      fx.shadowBlur = 0; fx.fillStyle = C.coral; fx.fillRect(x + 4, y + 70, 100 * pin, 3); fx.restore();
      REG('st' + j, String(num) + ' ' + lab, x, y - 115, 440, 175, pin * (1 - out)); });
    fx.restore(); }
}

const CREDITS = ['RAYMARCHED SIGNED DISTANCE FIELDS', 'MANDELBULB FRACTAL', 'BLACK HOLE  ·  GRAVITATIONAL LENSING', 'PROCEDURAL TERRAIN AND CITY',
  'GLASS DISPERSION  ·  LIQUID METAL', '31 000 GPU PARTICLES', 'MUSIC SYNTHESIZED FROM SCRATCH', '0 IMAGES  ·  0 SAMPLES  ·  0 MODELS'];
function drawEnd(st) { const l = st.l, cx = W / 2;
  const logoOut = inv(3 * BAR - 0.5, 3 * BAR, l);
  if (logoOut < 1) { fx.save(); fx.fillStyle = '#fff'; fx.textAlign = 'center'; shade(fx, 24);
    const p = E.outExpo(inv(0.15, 1.1, l)); const la = inv(0.1, 0.45, l) * (1 - logoOut);
    font(fx, 140, 700, FD, 'normal', `${lerp(90, 18, p).toFixed(1)}px`); fx.globalAlpha = la; fx.fillText('CLAUDE', cx + 9, 890);
    REG('logo', 'CLAUDE', cx - 330, 790, 660, 100, la * p);
    const q = E.outExpo(inv(0.35, 0.9, l)); fx.globalAlpha = 1 - logoOut;
    scrim(cx - 560, 912, 1120, 106, (1 - logoOut) * q, 0.55);
    fx.save(); fx.beginPath(); fx.rect(cx - 520 * q, 910, 1040 * q, 60); fx.clip(); font(fx, 30, 500, FM, 'normal', '10px'); fx.fillStyle = '#ff9a80'; shade(fx, 10);
    fx.fillText('MOTION DESIGN  ·  SHOWREEL 2026', cx + 5, 952); fx.restore();
    REG('logo2', 'MOTION DESIGN · SHOWREEL 2026', cx - 420, 926, 840, 30, q * (1 - logoOut));
    fx.globalAlpha = 0.9 * inv(0.8, 1.2, l) * (1 - logoOut); font(fx, 22, 500, FM, 'normal', '4px'); fx.fillStyle = '#fff';
    fx.fillText('MADE ENTIRELY IN CODE', cx, 1000); REG('logo3', 'MADE ENTIRELY IN CODE', cx - 200, 978, 400, 22, fx.globalAlpha);
    fx.shadowBlur = 0; fx.globalAlpha = 0.6 * (1 - logoOut); fx.fillRect(cx - 540 - 200 * q, 850, 200 * q, 2); fx.fillRect(cx + 540, 850, 200 * q, 2);
    fx.restore(); }
  // титры: что было в ролике, по строке на долю, остаются до конца
  const e = l - 3 * BAR; if (e < 0) return;
  sideScrim('left', 1250, E.outCubic(inv(-0.3, 0.5, e)), 0.8);
  fx.save(); const x = 170, y0 = 300, lh = 62;
  const ta = E.outExpo(inv(0, 0.5, e));
  font(fx, 26, 600, FM, 'normal', '8px'); fx.fillStyle = '#ff9a80'; fx.globalAlpha = ta; shade(fx, 8); fx.fillText('WHAT YOU JUST WATCHED', x, y0 - 70);
  REG('crh', 'WHAT YOU JUST WATCHED', x, y0 - 92, 560, 26, ta);
  fx.shadowBlur = 0; fx.fillRect(x, y0 - 50, 520 * ta, 2);
  CREDITS.forEach((c, i) => { const a = e - 0.5 - i * BEAT; if (a < 0) return; const p = E.outExpo(clamp(a / 0.4));
    fx.globalAlpha = p; font(fx, 22, 500, FM, 'normal', '3px'); fx.fillStyle = C.coral; fx.fillText(pad2(i + 1), x, y0 + i * lh);
    font(fx, 30, 500, FM, 'normal', '3px'); fx.fillStyle = '#fff'; shade(fx, 8); fx.fillText(c, x + 70 - (1 - p) * 30, y0 + i * lh); fx.shadowBlur = 0;
    REG('cr' + i, c, x, y0 + i * lh - 24, 70 + fx.measureText(c).width, 30, p); });
  fx.restore();
}

function drawFractal(st) { const l = st.l;
  sideScrim('left', 1100, E.outCubic(inv(0, 0.4, l)), 0.75);
  ['INFINITE', 'DETAIL'].forEach((w, i) => maskWord('fw' + i, fx, w, MX + 40, 340, 170, l - i * 2 * BAR - 0.25, 2 * BAR - 0.15, i % 2 ? C.coral : '#fff', 'left'));
  caption('fcap', 'DISTANCE-ESTIMATED FRACTAL  ·  PER PIXEL', l - 0.6, 2 * BAR - 0.1);
  readout('frd', W - 520, 200, ['MANDELBULB  z → zⁿ + c', `POWER   ${st.A.toFixed(3)}`, 'ITER    7  ·  200 STEPS', 'COLOR   ORBIT TRAP'], rdA(l, 2 * BAR, st.len), C.violet);
}
function drawHole(st) { const l = st.l;
  sideScrim('left', 1000, E.outCubic(inv(0, 0.4, l)), 0.55);
  ['GRAVITY', 'BENDS LIGHT'].forEach((w, i) => maskWord('hw' + i, fx, w, MX + 40, 340, 170, l - i * 2 * BAR - 0.25, 2 * BAR - 0.15, i % 2 ? C.coral : '#fff', 'left'));
  caption('hcp', 'EVERY RAY FOLLOWS A CURVED PATH', l - 0.6, 2 * BAR - 0.1);
  readout('hrd2', MX + 50, 560, ['SCHWARZSCHILD  rs = 1', 'GEODESIC  320 STEPS', 'DISK  DOPPLER BEAMING', 'LENSING  EINSTEIN RING'], rdA(l, 2 * BAR, st.len), C.coral);
}
function drawLiquid(st) { const l = st.l;
  ['LIQUID', 'METAL'].forEach((w, i) => maskWord('lw' + i, fx, w, W / 2, 330, 230, l - i * 2 * BAR - 0.25, 2 * BAR - 0.15, i % 2 ? C.cyan : '#fff'));
  caption('lcap', 'SHAPES THAT MELT INTO EACH OTHER', l - 0.6, 2 * BAR - 0.1);
  readout('lrd', W - 560, H - 330, ['METABALLS  ×9', 'SMOOTH MIN  k = 0.55', 'REFLECTIONS  2 BOUNCES'], rdA(l, 2 * BAR, st.len), C.cyan);
}
function drawTerrain(st) { const l = st.l, cx = W / 2;
  fx.save(); const p = E.outExpo(inv(0.05, 0.7, l)); font(fx, 260, 800, FD, 'condensed', `${lerp(80, 30, p).toFixed(0)}px`);
  const a = p * (1 - inv(st.len - 0.4, st.len, l)); fx.globalAlpha = a; fx.fillStyle = '#fff'; fx.textAlign = 'center'; shade(fx, 30); heavy(fx, 'WORLDS', cx, 330, 18);
  const tw = fx.measureText('WORLDS').width; fx.restore(); REG('wrl', 'WORLDS', cx - tw / 2, 143, tw, 187, a);
  caption('tcap', 'PROCEDURAL TERRAIN  ·  ZERO MODELS', l - 0.6, 2 * BAR - 0.1);
  readout('trd', MX + 50, H - 330, [`SPEED  ${(520 + st.k * 40).toFixed(0)} km/h`, 'FBM    5 OCTAVES', 'SEED   2026'], rdA(l, 2 * BAR, st.len), C.pink);
}
function drawPrism(st) { const l = st.l, cx = W / 2;
  fx.save(); const p = E.outExpo(inv(0.1, 1.2, l)); font(fx, 96, 300, FD, 'normal', `${lerp(120, 50, p).toFixed(0)}px`); fx.fillStyle = '#fff'; fx.textAlign = 'center';
  const a = p * (1 - inv(st.len - 0.4, st.len, l)); fx.globalAlpha = a; shade(fx, 20); fx.fillText('LIGHT', cx + 25, 230);
  const tw = fx.measureText('LIGHT').width; REG('lgt', 'LIGHT', cx - tw / 2, 162, tw, 68, a);
  fx.shadowBlur = 0; const cols = ['#ff3b3b', '#ff9a2e', '#ffe14a', '#4cff7a', '#3ee6ff', '#4c6bff', '#a35bff'];
  cols.forEach((c, i) => { fx.fillStyle = c; fx.globalAlpha = 0.9 * a; fx.fillRect(cx - 245 + i * 70, 262, 60 * E.outExpo(inv(0.3 + i * 0.05, 0.9 + i * 0.05, l)), 3); });
  fx.restore();
  caption('pcp', 'ONE RAY OF LIGHT BECOMES THREE', l - 0.8, 2 * BAR - 0.3);
  readout('prd', W - 600, H - 330, ['IOR   R 1.36  G 1.50  B 1.68', 'REFRACTION ×2  ·  DISPERSION', 'FRESNEL  SCHLICK'], rdA(l, 2 * BAR, st.len), C.violet);
}
function drawCity(st) { const l = st.l;
  ['CITIES', 'SCALE'].forEach((w, i) => maskWord('cw' + i, fx, w, W / 2, H / 2 + 60, 300, l - i * 2 * BAR - 0.25, 2 * BAR - 0.15, i % 2 ? C.coral : '#fff'));
  caption('ccap', 'ONE FUNCTION  ·  16 384 BUILDINGS', l - 0.6, 2 * BAR - 0.1);
  const n = Math.floor(16384 * E.inOutCubic(clamp(l / (st.len - 0.3))));
  readout('crd', MX + 50, 200, [`BUILDINGS  ${n.toLocaleString('en-US')}`, `WAVE  ${(l * 3.2 % 6.283).toFixed(2)} rad`, 'WINDOWS  HASHED'], rdA(l, 2 * BAR, st.len), C.coral);
}
function drawMontage(st) { const { b, lb } = st.mont;
  fx.save(); fx.globalAlpha = Math.exp(-lb * 7); fx.lineWidth = 14; fx.strokeStyle = b % 2 ? C.cyan : C.coral; fx.strokeRect(7, 7, W - 14, H - 14); fx.restore(); }

const DRAW = { intro: drawIntro, hero: drawHero, type: drawType, tunnel: drawTunnel, particles: drawParticles, end: drawEnd,
  fractal: drawFractal, hole: drawHole, liquid: drawLiquid, terrain: drawTerrain, prism: drawPrism, city: drawCity };
function drawLayers(st) {
  fx.save(); fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, OW, OH); fx.restore();
  bx.save(); bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, OW, OH); bx.restore();
  if (st.mont) drawMontage(st); else DRAW[st.type](st);
  drawHUD(st);
}

// ---------- WebGL
const cv = document.getElementById('gl'); cv.width = OW; cv.height = OH;
const gl = cv.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, alpha: false });
gl.getExtension('EXT_color_buffer_float'); gl.getExtension('OES_texture_float_linear');
function prog(vs, fs) { const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); gl.attachShader(p, s); }
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
  return { p, u }; }
function tex(w, h, hdr = true) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, hdr ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  return t; }
function fbo(w, h) { const t = tex(w, h); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { f, t, w, h }; }
const SCN = {}; const sceneProg = (s) => SCN[s] || (SCN[s] = prog(SH.vsQuad, SH.fsScene.replace('uniform float uT, uL, uK, uA, uB, uC, uLen; uniform int uS;', 'uniform float uT, uL, uK, uA, uB, uC, uLen; const int uS = ' + s + ';')));
const P = { part: prog(SH.vsPart, SH.fsPart), copy: prog(SH.vsQuad, SH.fsCopy), pre: prog(SH.vsQuad, SH.fsPrefilter),
  down: prog(SH.vsQuad, SH.fsDown), up: prog(SH.vsQuad, SH.fsUp), fin: prog(SH.vsQuad, SH.fsFinal) };
const F = { scene: fbo(SW, SH2), acc: fbo(SW, SH2), frontAcc: fbo(OW, OH), bloom: [] };
const NB = Math.max(4, 6 + Math.round(Math.log2(K))); // уровней свечения больше в 4K, чтобы ореол был того же размера
for (let i = 0, w = OW, h = OH; i < NB; i++, w >>= 1, h >>= 1) F.bloom.push(fbo(w, h));
const texBack = tex(OW, OH, false), texFront = tex(OW, OH, false);
const vaoQuad = gl.createVertexArray();

const parts = (() => { const c = document.createElement('canvas'); c.width = 1600; c.height = 420; const x = c.getContext('2d');
  font(x, 330, 800, FD, 'normal', '8px'); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('CLAUDE', 800, 215);
  const img = x.getImageData(0, 0, 1600, 420).data; const T = [], Rn = []; const r = rng(2026); const step = 2.4;
  let minX = 1e9, maxX = -1e9; for (let yy = 0; yy < 420; yy += step) for (let xx = 0; xx < 1600; xx += step) { const i = (Math.floor(yy) * 1600 + Math.floor(xx)) * 4; if (img[i + 3] > 128) { minX = Math.min(minX, xx); maxX = Math.max(maxX, xx); } }
  const sc = 7.2 / (maxX - minX), mid = (minX + maxX) / 2;
  for (let yy = 0; yy < 420; yy += step) for (let xx = 0; xx < 1600; xx += step) { const i = (Math.floor(yy) * 1600 + Math.floor(xx)) * 4;
    if (img[i + 3] > 128) { T.push((xx - mid) * sc + (r() - 0.5) * 0.01, -(yy - 215) * sc, (r() - 0.5) * 0.45, 0); Rn.push(r(), r(), r(), r()); } }
  const textN = T.length / 4;
  for (let i = 0; i < 9000; i++) { T.push((r() - 0.5) * 30, (r() - 0.5) * 16, (r() - 0.5) * 24 - 4, 1); Rn.push(r(), r(), r(), r()); }
  PCOUNT.n = T.length / 4;
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  for (const [loc, data] of [[0, T], [1, Rn]]) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0); }
  gl.bindVertexArray(null); return { vao, n: T.length / 4, textN }; })();
CREDITS[5] = `${Math.round(PCOUNT.n / 1000)} 000 GPU PARTICLES`;

function persp(fov, asp, n, f) { const t = 1 / Math.tan(fov * Math.PI / 360); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; }
function lookAt(e, c, roll) { const sub = (a, b) => a.map((v, i) => v - b[i]); const nrm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const f = nrm(sub(c, e)); const r = nrm(cr(f, [Math.sin(roll), Math.cos(roll), 0])); const u = cr(r, f);
  return [r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, e), -dot(u, e), dot(f, e), 1]; }
function mul(a, b) { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return o; }
function quad(p, target, w, h) { gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, w, h); gl.useProgram(p.p); gl.bindVertexArray(vaoQuad); }
function bindTex(p, name, unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(p.u[name], unit); }
function upload(t, canvas) { gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); }

function renderSub(st) {
  drawLayers(st); upload(texFront, front); if (st.s === 1 || st.s === 7) upload(texBack, back);
  const S = sceneProg(st.s); quad(S, F.scene.f, SW, SH2); gl.disable(gl.BLEND);
  gl.uniform2f(S.u.uRes, SW, SH2); gl.uniform1f(S.u.uT, st.t); gl.uniform1f(S.u.uL, st.l); gl.uniform1f(S.u.uK, st.k); gl.uniform1f(S.u.uLen, st.len);
  gl.uniform1f(S.u.uA, st.A); gl.uniform1f(S.u.uB, st.B); gl.uniform1f(S.u.uC, st.C); gl.uniform3fv(S.u.uP, st.P);
  gl.uniform3fv(S.u.uCamPos, st.cam); gl.uniform3fv(S.u.uCamTgt, st.tgt); gl.uniform1f(S.u.uFov, st.fov); gl.uniform1f(S.u.uRoll, st.roll);
  bindTex(S, 'uBack', 0, texBack); gl.drawArrays(gl.TRIANGLES, 0, 3);
  if (st.s === 4) { const pp = P.part; gl.useProgram(pp.p); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    const vp = mul(persp(st.fov, W / H, 0.1, 100), lookAt(st.cam, st.tgt, st.roll));
    gl.uniformMatrix4fv(pp.u.uVP, false, vp); gl.uniform3fv(pp.u.uCam, st.cam); gl.uniform1f(pp.u.uL, st.l); gl.uniform1f(pp.u.uK, st.k); gl.uniform1f(pp.u.uGal, GAL); gl.uniform1f(pp.u.uPk, SH2 / 2160);
    gl.uniform1f(pp.u.uPx, SH2 / (2 * Math.tan(st.fov * Math.PI / 360))); gl.uniform1f(pp.u.uFocus, Math.hypot(...st.cam.map((v, i) => v - st.tgt[i])));
    gl.bindVertexArray(parts.vao); gl.drawArrays(gl.POINTS, 0, parts.n); gl.disable(gl.BLEND); }
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  const c = P.copy; quad(c, F.acc.f, SW, SH2); gl.uniform2f(c.u.uRes, SW, SH2); gl.uniform1f(c.u.uGain, 1 / SUB); bindTex(c, 'uTex', 0, F.scene.t); gl.drawArrays(gl.TRIANGLES, 0, 3);
  quad(c, F.frontAcc.f, OW, OH); gl.uniform2f(c.u.uRes, OW, OH); gl.uniform1f(c.u.uGain, 1 / SUB); bindTex(c, 'uTex', 0, texFront); gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.disable(gl.BLEND);
}

window.FRAMES = Math.round(DUR * FPS);
function renderGL(fi) {
  const t0 = fi / FPS;
  for (const f of [F.acc, F.frontAcc]) { gl.bindFramebuffer(gl.FRAMEBUFFER, f.f); gl.viewport(0, 0, f.w, f.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
  for (let k = 0; k < SUB; k++) renderSub(state(Math.min(DUR - 0.001, t0 + (k / SUB) * SHUTTER)));
  const st = state(t0);
  let p = P.pre; quad(p, F.bloom[0].f, OW, OH); gl.uniform2f(p.u.uRes, OW, OH); gl.uniform1f(p.u.uFrontGlow, st.type === 'type' && !st.mont ? 0.03 : 0.12);
  bindTex(p, 'uTex', 0, F.acc.t); bindTex(p, 'uFront', 1, F.frontAcc.t); gl.drawArrays(gl.TRIANGLES, 0, 3);
  for (let i = 1; i < NB; i++) { const b = F.bloom[i]; p = P.down; quad(p, b.f, b.w, b.h); gl.uniform2f(p.u.uRes, b.w, b.h); bindTex(p, 'uTex', 0, F.bloom[i - 1].t); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  for (let i = NB - 2; i >= 0; i--) { const b = F.bloom[i], s = F.bloom[i + 1]; p = P.up; quad(p, b.f, b.w, b.h); gl.uniform2f(p.u.uRes, b.w, b.h); gl.uniform2f(p.u.uSrc, s.w, s.h); bindTex(p, 'uTex', 0, s.t); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  gl.disable(gl.BLEND);
  p = P.fin; quad(p, null, OW, OH); gl.uniform2f(p.u.uRes, OW, OH);
  gl.uniform1f(p.u.uFlash, st.flash); gl.uniform1f(p.u.uCA, st.ca); gl.uniform1f(p.u.uBlack, st.black); gl.uniform1f(p.u.uFade, st.fade);
  gl.uniform1f(p.u.uTime, t0); gl.uniform1f(p.u.uBloomK, 0.22); gl.uniform1f(p.u.uExpo, st.expo);
  bindTex(p, 'uScene', 0, F.acc.t); bindTex(p, 'uBloom', 1, F.bloom[0].t); bindTex(p, 'uFront', 2, F.frontAcc.t);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return st;
}
window.renderFrame = function (fi) { renderGL(fi); return cv.toDataURL('image/png').slice(22); };

// ---------- законы читаемости
// 1) контраст: каждая буква против кольца фона вокруг неё в готовом кадре (с тенями и подложками), по плиткам 48 px.
//    Крупный текст (>= 48 px) не ниже 3:1, мелкий не ниже 4.5:1.
function lumArr(rgba, n) { const L = new Float32Array(n); const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const T = new Float32Array(256); for (let i = 0; i < 256; i++) T[i] = lin(i);
  for (let i = 0; i < n; i++) L[i] = 0.2126 * T[rgba[i * 4]] + 0.7152 * T[rgba[i * 4 + 1]] + 0.0722 * T[rgba[i * 4 + 2]]; return L; }
function dilate(m, w, h, r) { // квадратное расширение маски: два прохода скользящей суммой
  const a = new Uint8Array(w * h), b = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { let s = 0; const o = y * w; for (let x = -r; x < w; x++) { if (x + r < w) s += m[o + x + r]; if (x - r - 1 >= 0) s -= m[o + x - r - 1]; if (x >= 0) a[o + x] = s > 0 ? 1 : 0; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y < h; y++) { if (y + r < h) s += a[(y + r) * w + x]; if (y - r - 1 >= 0) s -= a[(y - r - 1) * w + x]; if (y >= 0) b[y * w + x] = s > 0 ? 1 : 0; } }
  return b; }
window.checkFrame = function (fi) {
  const st = renderGL(fi); const n = OW * OH;
  const px = new Uint8Array(n * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, OW, OH, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const flip = new Uint8Array(n * 4); for (let y = 0; y < OH; y++) flip.set(px.subarray((OH - 1 - y) * OW * 4, (OH - y) * OW * 4), y * OW * 4);
  const L = lumArr(flip, n); let mean = 0; for (let i = 0; i < n; i += 7) mean += L[i]; mean /= n / 7;
  MODE.v = 'mask'; drawLayers(st); MODE.v = 'all';
  const mk = fx.getImageData(0, 0, OW, OH).data; const big = new Uint8Array(n), small = new Uint8Array(n), any = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const a = mk[i * 4 + 3]; if (a > 200) { if (mk[i * 4] > 128) big[i] = 1; else small[i] = 1; any[i] = 1; } }
  const d1 = dilate(any, OW, OH, Math.max(1, Math.round(1.5 * K))), d3 = dilate(any, OW, OH, Math.max(2, Math.round(5 * K)));
  const T = Math.round(48 * K), tw = Math.ceil(OW / T), th = Math.ceil(OH / T); const acc = new Float64Array(tw * th * 6);
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) { const i = y * OW + x, ti = (Math.floor(y / T) * tw + Math.floor(x / T)) * 6;
    if (big[i]) { acc[ti] += L[i]; acc[ti + 1]++; } else if (small[i]) { acc[ti + 2] += L[i]; acc[ti + 3]++; } else if (d3[i] && !d1[i]) { acc[ti + 4] += L[i]; acc[ti + 5]++; } }
  const fails = []; let tiles = 0;
  for (let j = 0; j < tw * th; j++) { const a = acc.subarray(j * 6, j * 6 + 6); if (a[5] < 8) continue;
    const ring = a[4] / a[5];
    for (const [s, c, need] of [[a[0], a[1], 3], [a[2], a[3], 4.5]]) { if (c < 12 * K * K) continue; tiles++;
      const lt = s / c, ratio = (Math.max(lt, ring) + 0.05) / (Math.min(lt, ring) + 0.05);
      if (ratio < need) fails.push({ x: (j % tw) * 48, y: Math.floor(j / tw) * 48, ratio: +ratio.toFixed(2), need }); } }
  return { t: +st.t.toFixed(3), type: st.mont ? 'montage' : st.type, flash: +st.flash.toFixed(2), mean: +mean.toFixed(4), tiles, fails };
};
// картинка кадра с красными рамками на плитках, где не хватает контраста
window.markFrame = function (fails) { const c = document.createElement('canvas'); c.width = OW; c.height = OH; const x = c.getContext('2d'); x.drawImage(cv, 0, 0);
  x.strokeStyle = '#ff0000'; x.lineWidth = 3; for (const f of fails) x.strokeRect(f.x * K, f.y * K, 48 * K, 48 * K); return c.toDataURL('image/png').slice(22); };
// 2) текст всех кадров без GL: что, где и насколько видно
window.textLog = function (fps) { const out = []; LOG.on = true;
  for (let f = 0; f < Math.round(DUR * fps); f++) { const st = state(f / fps); LOG.reg = []; LOG.glyphs = []; drawLayers(st);
    out.push({ t: +(f / fps).toFixed(4), flash: +st.flash.toFixed(2), black: st.black, fade: +st.fade.toFixed(2), reg: LOG.reg.map((r) => ({ ...r, a: +r.a.toFixed(2) })),
      glyphs: LOG.glyphs.filter((g) => g.a > 0.05).map((g) => ({ s: g.s, x0: Math.round(g.x0), y0: Math.round(g.y0), x1: Math.round(g.x1), y1: Math.round(g.y1) })) }); }
  LOG.on = false; return out; };
window.reelReady = document.fonts.ready.then(() => ({ particles: PCOUNT.n, frames: window.FRAMES, dur: DUR, size: `${OW}x${OH}`, ss: SS, sub: SUB, secs: secs.map((s) => `${s.type}@${s.t0.toFixed(2)}`).join(' '),
  bahn: document.fonts.check('700 40px Bahnschrift'), mono: document.fonts.check('16px "Cascadia Mono"') }));
