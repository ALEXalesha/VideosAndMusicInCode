'use strict';
// Ролик «A Crab Story»: крабик (аватарка Claude) просыпается в терминале, идёт по полу из кода, строит мост и город,
// печатает ракету, летит на Луну, танцует и смотрит на планету. Всё кодом: 3D лучевым маршем и обходом вокселей.
const Q = new URLSearchParams(location.search);
const K = +(Q.get('k') || 1), FPS = +(Q.get('fps') || 60);
const W = 1920, H = 1080, OW = Math.round(W * K), OH = Math.round(H * K);
const SS = +(Q.get('ss') || (K > 1 ? 1.25 : 1.5)), SW = Math.round(OW * SS), SH2 = Math.round(OH * SS);
const SUB = +(Q.get('sub') || Math.max(1, Math.round(240 / FPS))), SHUTTER = 0.5 / FPS;
const { BEAT, BAR, secs, DUR, EV, at } = TL;
const FD = '"Bahnschrift", "Segoe UI", sans-serif', FM = '"Cascadia Mono", Consolas, monospace';
const C = { coral: '#ff5a36', crab: '#d97757', cyan: '#3ee6ff', violet: '#8b6bff', ink: '#0a0a0f', paper: '#f2efe9', pink: '#ff3d9a' };
const SCN_ID = { boot: 0, walk: 1, build: 2, rocket: 3, space: 4, dance: 5, end: 6 };
const DEFS = { boot: ['FLOOR'], walk: ['FLOOR', 'BRIDGE'], build: ['FLOOR', 'BRIDGE', 'CITY'], rocket: ['FLOOR', 'BRIDGE', 'CITY', 'ROCKET'],
  space: ['SPACE', 'MOON', 'ROCKET'], dance: ['SPACE', 'MOON', 'ROCKET'], end: ['SPACE', 'MOON', 'ROCKET'] };
const NAME = { boot: 'WAKE UP', walk: 'WALK', build: 'BUILD', rocket: 'LAUNCH', space: 'FLY', dance: 'DANCE' };
const MX = 96, MY = 54; // безопасные поля 5 %
// ?ph=1 - ракету печатает головка 3D-принтера (просьба Алексея 17.10): крабик вызывает её, она опускается на рельсах,
// греется и быстро обводит 26 слоёв, потом уезжает вверх. Те же 40-46 с, что у старой печати, - музыка не меняется.
const PH = Q.get('ph') === '1';
const PHT = { down0: 40.55, down1: 41.2, hot1: 41.75, p0: 41.75, p1: 45.5, up1: 46.0 };

// ---------- помощники
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const E = {
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)), inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3), inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inCubic: (t) => t * t * t, inOutSine: (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t)),
};
function rng(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hashStr = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; };
const envSum = (t, list, k, key = false) => { let s = 0; for (const e of list) { const tt = key ? e.t : e; const a = key ? e.a : 1; if (t >= tt) s += a * Math.exp(-(t - tt) * k); } return s; };
const pad2 = (n) => String(n).padStart(2, '0');
const secAt = (t) => secs.find((s) => t < s.t0 + s.len) || secs[secs.length - 1];
const V = { add: (a, b) => a.map((v, i) => v + b[i]), sub: (a, b) => a.map((v, i) => v - b[i]), mul: (a, s) => a.map((v) => v * s),
  len: (a) => Math.hypot(...a), norm: (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); }, lerp: (a, b, t) => a.map((v, i) => v + (b[i] - v) * t),
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] };
// 3x3 по строкам
const M3 = { I: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  mul: (A, B) => { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return o; },
  ap: (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]],
  rx: (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; },
  ry: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; },
  rz: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; },
  // поворот, у которого локальная ось y смотрит в up (и z как можно ближе к fwd)
  frame: (up, fwd) => { const y = V.norm(up); let x = V.cross(y, fwd); if (V.len(x) < 1e-4) x = V.cross(y, [1, 0, 0]); x = V.norm(x); const z = V.cross(x, y); return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]; } };
const arc = (p0, p1, h, e) => { const p = V.lerp(p0, p1, e); p[1] += h * Math.sin(Math.PI * e); return p; };
const bez = (a, b, c, d, t) => { const u = 1 - t; return a.map((_, i) => u * u * u * a[i] + 3 * u * u * t * b[i] + 3 * u * t * t * c[i] + t * t * t * d[i]); };

// ---------- крабик: 9 коробок. 0 тело, 1-2 глаза, 3-4 руки (лево, право), 5-8 ноги. Смотрит в +z, ступни на y = 0
function rig(P) {
  const sq = P.sq ?? 1, sx = 1 / Math.sqrt(sq), sit = P.sit || 0, drop = 0.24 * sit, S = P.scale ?? 1;
  const R = M3.mul(P.base || M3.I, M3.mul(M3.ry(P.yaw || 0), M3.mul(M3.rz(P.lean || 0), M3.rx(P.tilt || 0))));
  const parts = []; const put = (c, h, rl) => parts.push({ c, h, r: rl || M3.I });
  put([0, 0.54 - drop, 0], [0.5, 0.3, 0.28]);
  const bl = clamp(P.blink || 0), lx = P.lookX || 0, ly = P.lookY || 0;
  for (const sg of [-1, 1]) put([sg * 0.2 + lx * 0.06, 0.62 - drop + ly * 0.05, 0.272], [0.055, Math.max(0.009, 0.085 * (1 - bl)), 0.02]);
  for (const sg of [-1, 1]) { const a = sg < 0 ? P.armL || 0 : P.armR || 0, f = sg < 0 ? P.armFL || 0 : P.armFR || 0;
    const rl = M3.mul(M3.ry(sg < 0 ? f : -f), M3.rz(sg < 0 ? -a : a)); const off = M3.ap(rl, [sg * 0.1, 0, 0]);
    put([sg * 0.5 + off[0], 0.5 - drop + off[1], off[2]], [0.1, 0.075, 0.1], rl); }
  [-0.36, -0.12, 0.12, 0.36].forEach((x, i) => { const ph = (P.legPh || 0) + (i % 2 ? Math.PI : 0);
    const lift = (P.legLift || 0) * Math.max(0, Math.sin(ph)), dx = (P.stride || 0) * Math.cos(ph);
    const ang = -(sit * 1.2 + (P.dangle || 0) * Math.sin((P.dPh || 0) + i * 1.9)); const rl = M3.rx(ang); const off = M3.ap(rl, [0, -0.12, 0]);
    put([x + dx, 0.24 - drop + lift + off[1], off[2]], [0.045, 0.12, 0.05], rl); });
  const pos = V.add(P.pos, [0, P.bob || 0, 0]);
  const out = { PC: [], PH: [], PR: [], tips: [] };
  parts.forEach((pt, i) => { const a = P.asm ? P.asm[i] : null;
    const cl = [pt.c[0] * sx * S, pt.c[1] * sq * S, pt.c[2] * sx * S]; let c = V.add(pos, M3.ap(R, cl));
    let rot = M3.mul(R, pt.r); let h = [pt.h[0] * sx * S, pt.h[1] * sq * S, pt.h[2] * sx * S];
    if (a) { c = V.add(c, a.d); if (a.spin) rot = M3.mul(rot, M3.mul(M3.ry(a.spin), M3.rx(a.spin * 0.7))); h = V.mul(h, a.sc ?? 1); if (a.hide) c = [c[0], -100, c[2]]; }
    out.PC.push(c); out.PH.push(h); out.PR.push(rot); out.vis = out.vis || []; out.vis.push(!(a && a.hide));
    if (i === 3 || i === 4) out.tips.push(V.add(c, M3.ap(rot, [(i === 3 ? -1 : 1) * 0.11 * S, 0.04 * S, 0]))); });
  let cen = [0, 0, 0], nv = 0; out.PC.forEach((c, i) => { if (out.vis[i]) { cen = V.add(cen, c); nv++; } }); cen = V.mul(cen, 1 / Math.max(1, nv));
  let rad = 0; out.PC.forEach((c, i) => { if (out.vis[i]) rad = Math.max(rad, V.len(V.sub(c, cen)) + V.len(out.PH[i])); });
  out.CB = [...cen, rad]; out.pos = pos; return out;
}
// моргания сами по себе
const BLINKS = [8.8, 13.6, 17.1, 19.9, 26.3, 30.1, 34.2, 38.4, 43.3, 47.6, 52.2, 58.0, 66.1, 70.2, 74.0, 81.8, 84.9, 88.2, 90.6];
const blinkAt = (t) => { let b = 0; for (const x of BLINKS) b = Math.max(b, 1 - Math.abs(t - x) / 0.08); return clamp(b); };
// прыжок с приседом: k 0..1 внутри прыжка; до и после - пружина
function hopPose(t, t0, dur) { const k = (t - t0) / dur; let sq = 1;
  if (k < 0 && k > -0.35) sq = 1 - 0.2 * Math.sin(Math.PI * inv(-0.35, 0, k));
  else if (k >= 0 && k <= 1) sq = 1 + 0.12 * Math.sin(Math.PI * k);
  else if (k > 1 && k < 1.9) { const u = (k - 1) / 0.9; sq = 1 - 0.22 * Math.exp(-u * 3) * Math.cos(u * 9); }
  return { k: clamp(k), sq }; }

// ---------- путь по полу: ровный ход с разгоном и торможением
function walkX(t, t0, t1, x0, x1, acc = 0.5) { // от x0 в t0 до x1 в t1
  if (t <= t0) return x0; if (t >= t1) return x1; const T = t1 - t0, v = (x1 - x0) / (T - acc); const u = t - t0;
  if (u < acc) return x0 + v * u * u / (2 * acc); if (u > T - acc) { const w = T - u; return x1 - v * w * w / (2 * acc); } return x0 + v * (acc / 2) + v * (u - acc); }
const X0 = -6.5, XEDGE = -0.15, XFAR = 3.3, XPAD = 3.95, PAD = [6.2, 0, -0.2];
const ROCK_LOCAL_SEAT = [0, 2.0, 0.22];
const crabX = (t) => t < 24 ? walkX(t, 11.7, EV.stop, X0, XEDGE, 0.55) : t < 40 ? walkX(t, EV.cross, EV.cross + 3.4, XEDGE, XFAR, 0.4) : walkX(t, 40.1, 41.0, XFAR, XPAD, 0.3);
const STEP = 0.26; const legPhAt = (x) => 2 * Math.PI * (x - X0) / STEP;
const mBridge = (i) => 3 + (((GX0C + Math.floor(i / 6)) * 7 + (i % 6) * 5) % 3);
const GX0C = 2;
const BCOL = [null, null, null, [0.74, 0.17, 0.075], [0.69, 0.66, 0.62], [0.12, 0.5, 0.62]];
const bridgeCell = (i) => [(GX0C + Math.floor(i / 6) + 0.5) * 0.2, -0.1, ((i % 6) - 3 + 0.5) * 0.2];
const BR0 = EV.bridge[0], BRATE = 0.1, BFLY = 0.45;

// положение ракеты в каждой сцене
function rocketAt(t) {
  if (t < 56) { const u = Math.max(0, t - EV.lift); return { pos: [PAD[0], 0.6 * u * u + 0.25 * u, PAD[2]], R: M3.I }; }
  const P0 = [-34, 15, -30], P1 = [-12, 11, -8], P2 = [1.25, 6.5, -1.1], P3 = [1.25, 0, -1.1];
  if (t < EV.land) { const e = E.inOutSine(inv(56, EV.land, t)); const s = 1 - Math.pow(1 - inv(56, EV.land, t), 1.6);
    const p = bez(P0, P1, P2, P3, s); const p2 = bez(P0, P1, P2, P3, Math.min(1, s + 0.01)); const vel = V.norm(V.sub(p2, p));
    const up = V.norm(V.lerp(vel, [0, 1, 0], E.inOutCubic(inv(59.4, 61.6, t)))); return { pos: p, R: M3.frame(up, [0, 0, 1]), e }; }
  return { pos: P3, R: M3.I };
}

// ---------- головка принтера (?ph=1): слой за слоем по кругу, сопло на верхнем крае текущего слоя
function layerRadius(y) { if (y < 0.4) return 0.42; if (y < 3.6) return 0.91; return Math.max(0.06, 1.04 * (1 - (y - 3.6) / 1.5) - 0.17); }
function printHead(st, t) {
  if (t < PHT.down0 || t > PHT.up1 + 0.05) { st.head = null; return; }
  const u = clamp((t - PHT.p0) / (PHT.p1 - PHT.p0)) * 26; const L = Math.min(25, Math.floor(u)), a = u >= 26 ? 1 : u - L;
  // рама принтера неподвижна (стойки и верх), по стойкам едет только перекладина с головкой - как у настоящего принтера;
  // drop - насколько вся рама поднята над полом: она спускается с неба в начале и улетает вверх в конце
  let ang = 0, y = 0.22, r = layerRadius(0.1), drop = 0;
  if (t < PHT.p0) { drop = lerp(9.5, 0, E.outCubic(inv(PHT.down0, PHT.down1, t))); y = 0.22 + drop; st.rocket.build = -1; }
  else if (t <= PHT.p1) { const yc = 0.2 * L + 0.1; r = layerRadius(yc); y = 0.2 * (L + 1) + 0.02; ang = a * 2 * Math.PI;
    st.rocket.build = 0.2 * L + 0.001; st.rocket.ang = a; }
  else { const k = inv(PHT.p1, PHT.up1, t); r = layerRadius(5.1); drop = 9.5 * E.inCubic(clamp((k - 0.35) / 0.65));
    y = 5.22 + 0.25 * E.outCubic(clamp(k / 0.35)) + drop; ang = 0; st.rocket.build = 5.3; st.rocket.ang = 1; }
  const N = [PAD[0] + r * Math.cos(ang), y, PAD[2] + r * Math.sin(ang)];
  const hot = clamp(inv(PHT.down1, PHT.hot1, t)) * (1 - inv(PHT.p1, PHT.up1, t));
  st.head = { p: N, gy: y + 0.8, hot, ang: st.rocket.ang ?? 0, drop };
  st.nozzleC = Math.round(lerp(25, 215, E.inOutSine(inv(PHT.down1, PHT.hot1, t))) + (t > PHT.hot1 ? Math.round(Math.sin(t * 7) * 1.2) : 0));
}

// ---------- состояние кадра
const CAMS = {};
function state(t) {
  const sec = secAt(t), type = sec.type, l = t - sec.t0;
  const k = clamp(envSum(t, TL.kicks, 9)); const imp = envSum(t, TL.impacts, 6, true);
  const st = { t, sec, type, s: SCN_ID[type], l, len: sec.len, k, cam: [0, 1, 4], tgt: [0, 0.5, 0], fov: 40, roll: 0,
    crab: null, fly: [], W: [0, 0, 60, 0.9], W2: [0, 0, 0, 0.35], rocket: null, flame: 0, smoke: 0, smokeC: [0, 0, 0], cabin: [0, 0, 0, 0],
    spot: 0, spotPos: [0, 4, 0], sun: [-0.5, 0.8, 0.45], beat: 0, flash: 0, expo: 1.0 };
  STORY[type](st);
  const shake = imp * 0.05 + (st.shake || 0);
  st.cam = st.cam.map((v, i) => v + shake * Math.sin(t * (63 + i * 17)));
  st.tgt = st.tgt.map((v, i) => v + shake * 0.6 * Math.sin(t * (51 + i * 23)));
  st.flash = clamp(st.flash + envSum(t, TL.impacts, 16, true) * 0.55);
  st.ca = 0.5 + k * 0.8 + imp * 3;
  st.fade = inv(DUR - 1.0, DUR - 0.35, t); st.black = 0;
  return st;
}
const STORY = {
  boot(st) { const t = st.t, l = st.l;
    const P = { pos: [X0, 0, 0], blink: 1, sq: 1 };
    // сборка: тело растёт из курсора, остальные детали прилетают по одной
    const r = rng(77); P.asm = [];
    for (let i = 0; i < 9; i++) { const tp = EV.parts[i], e = E.outBack(clamp((t - (tp - 0.45)) / 0.45)); const dir = V.norm([r() * 2 - 1, r() * 1.2 + 0.2, r() * 2 - 1]);
      if (i === 0) P.asm.push({ d: [0, 0, 0], sc: lerp(0.08, 1, E.outBack(clamp((t - (tp - 0.35)) / 0.35))) });
      else P.asm.push({ d: V.mul(dir, (1 - e) * 3.2), spin: (1 - e) * 6, hide: t < tp - 0.45 }); }
    const hp = hopPose(t, EV.hop, 0.45); P.sq = hp.sq; if (t >= EV.hop && t <= EV.hop + 0.45) P.bob = 0.5 * Math.sin(Math.PI * hp.k);
    P.blink = t < EV.blink ? 1 : blinkAt(t);
    P.lookX = t < 9 ? 0 : t < 9.5 ? -1 * E.inOutCubic(inv(9, 9.2, t)) : t < 10 ? lerp(-1, 1, E.inOutCubic(inv(9.5, 9.7, t))) : lerp(1, 0.4, inv(10, 10.3, t));
    P.lookY = t > 7.4 && t < 8.6 ? -0.4 : 0;
    P.armL = P.armR = t > 10.6 && t < 11.6 ? 1.1 * Math.sin(Math.PI * inv(10.6, 11.6, t)) * (0.8 + 0.2 * Math.sin(t * 30)) : 0.1;
    P.tilt = t > EV.blink && t < 9 ? 0.06 * Math.sin((t - EV.blink) * 9) * Math.exp(-(t - EV.blink) * 3) : 0;
    const x = crabX(t); P.pos = [x, 0, 0]; P.legPh = legPhAt(x); P.stride = 0.05 * inv(11.7, 12, t); P.legLift = 0.06 * inv(11.7, 12, t);
    if (t > 3.9) st.crab = P;
    // осколки-пиксели слетаются к крабику
    const r2 = rng(5); for (let j = 0; j < 14; j++) { const t1 = 4.3 + j * 0.2, e = clamp((t - (t1 - 0.6)) / 0.6); if (e <= 0 || e >= 1) continue;
      const d = V.norm([r2() * 2 - 1, r2() * 1.5, r2() * 2 - 1]); const p = V.add([X0, 0.5, 0], V.mul(d, (1 - E.inCubic(e)) * 4));
      st.fly.push({ p, s: 0.035 * (1 - e * 0.6), c: j % 3 ? [1.0, 0.36, 0.2] : [0.9, 0.85, 0.8] }); }
    st.W = [0, 0, Math.max(0, (t - 4.1) * 7) , 0.9]; st.spot = 1; st.spotPos = [X0 + 0.4, 4.2, 1.2];
    // камера: пока печатается терминал - справа от него пусто; с 7.5 с крабик в центре
    const q = E.inOutCubic(inv(7.3, 8.6, t)); const orb = 0.25 * Math.sin(l * 0.3) - 0.15 + 0.35 * inv(8, 12, t);
    const rad = lerp(3.4, 2.9, inv(4, 12, t));
    st.cam = [X0 + Math.sin(orb) * rad, lerp(0.85, 0.75, q), Math.cos(orb) * rad];
    st.tgt = [X0 + lerp(-0.75, 0, q), lerp(0.5, 0.42, q), 0]; st.fov = 38;
    if (t > 11.2) { const u = E.inOutCubic(inv(11.2, 12, t)); st.cam[0] = lerp(st.cam[0], crabX(t) + 0.6, u); st.tgt[0] = lerp(st.tgt[0], crabX(t) + 0.3, u); }
    st.expo = lerp(0.12, 1.05, E.inOutCubic(inv(3.6, 4.8, t))); },
  walk(st) { const t = st.t, l = st.l; const x = crabX(t);
    const moving = t < EV.stop; const P = { pos: [x, 0, 0], legPh: legPhAt(x), stride: moving ? 0.05 : 0, legLift: moving ? 0.065 : 0 };
    P.bob = moving ? 0.022 * Math.abs(Math.sin(P.legPh)) : 0; P.lean = moving ? -0.06 : 0;
    P.lookX = t > 16.3 && t < 17.6 ? 0 : 0.6; P.blink = blinkAt(t);
    P.armL = 0.15 + 0.08 * Math.sin(P.legPh); P.armR = 0.15 - 0.08 * Math.sin(P.legPh);
    if (t > EV.stop - 0.1) { const u = t - EV.stop; P.lean = 0.22 * Math.exp(-u * 3) * Math.cos(u * 10); // замер у края: качнулся и машет руками
      P.armL = P.armR = 1.2 * Math.exp(-u * 1.2) * (0.7 + 0.3 * Math.sin(u * 26)); P.lookX = 0.9; P.lookY = -1 * inv(0.3, 0.6, u); P.tilt = 0.18 * inv(0.3, 0.8, u); }
    st.crab = P; st.W = [0, 0, 80, 0.9]; st.W2 = [0, 0, inv(20, 22, t), 0.35];
    if (t < 16) { const p = l / 4; st.cam = [x + 0.7, 0.55, 3.0 - 0.3 * p]; st.tgt = [x + 0.35, 0.42, 0]; st.fov = 40; }
    else if (t < 20) { const p = (t - 16) / 4; st.cam = [x + 2.4 - 0.4 * p, 0.22, 1.5]; st.tgt = [x, 0.4, 0]; st.fov = 44; }
    else if (t < EV.stop + 0.4) { const p = E.inOutCubic(inv(20, EV.stop + 0.4, t)); st.cam = [lerp(x - 1.6, 0.4, p), lerp(0.6, 1.5, p), lerp(3.2, 3.6, p)]; st.tgt = [lerp(x, 1.0, p), lerp(0.4, 0.1, p), 0]; st.fov = 44; }
    else { const p = E.inOutCubic(inv(EV.stop + 0.4, 24, t)); st.cam = [lerp(2.3, 2.1, p), lerp(0.9, 1.25, p), lerp(2.0, 1.7, p)]; st.tgt = [lerp(0.15, 0.3, p), lerp(0.2, -0.1, p), 0]; st.fov = 48; } },
  build(st) { const t = st.t, l = st.l; const x = crabX(t);
    const P = { pos: [x, 0, 0], blink: blinkAt(t), lookX: 0.6, legPh: legPhAt(x) };
    // броски: блок i вылетает в BR0 + i*BRATE с клешни (чётные - левая), садится через BFLY
    const thr = t > BR0 - 0.3 && t < BR0 + 60 * BRATE + 0.2;
    if (t < BR0) { const u = inv(24, BR0, t); P.armL = P.armR = 1.3 * E.outBack(u); P.lookX = lerp(0.9, 0.6, u); }
    else if (thr) { const ph = (t - BR0) / BRATE; P.armL = 0.7 + 0.6 * Math.max(0, Math.cos(Math.PI * ph)); P.armR = 0.7 + 0.6 * Math.max(0, -Math.cos(Math.PI * ph)); P.armFL = 0.5 * Math.max(0, Math.cos(Math.PI * ph)); P.armFR = 0.5 * Math.max(0, -Math.cos(Math.PI * ph)); P.lean = 0.03 * Math.sin(ph * Math.PI); }
    // победный прыжок, переход по мосту, город растёт
    const hp = hopPose(t, 31.25, 0.4); if (t > 31 && t < 32) { P.sq = hp.sq; if (hp.k > 0 && hp.k < 1) P.bob = 0.35 * Math.sin(Math.PI * hp.k); P.armL = P.armR = 1.3; }
    const moving = t > EV.cross && t < EV.cross + 3.4; if (moving) { P.stride = 0.05; P.legLift = 0.07; P.bob = 0.025 * Math.abs(Math.sin(P.legPh)); P.lean = -0.06; P.armL = P.armR = 0.2; }
    if (t > EV.cross + 3.4) { const u = t - EV.cross - 3.4; P.lookX = lerp(0.6, -0.8, inv(0.2, 0.6, u)); P.lookY = 0.6 * inv(0.2, 0.6, u); P.armL = P.armR = 0.3; P.tilt = -0.08 * inv(0, 0.5, u); }
    st.crab = P;
    const R = P.pos && rig(P); // клешни нужны для полёта блоков
    for (let i = 0; i < 60; i++) { const tl = BR0 + i * BRATE, s = (t - tl) / BFLY; if (s <= 0 || s >= 1) continue;
      const tip = R.tips[i % 2 ? 1 : 0], dst = bridgeCell(i); st.fly.push({ p: arc(tip, dst, 0.7, E.inOutSine(s)), s: 0.09, c: BCOL[mBridge(i)] }); }
    const nb = (EV.city[1] - EV.city[0]) / BEAT; const bb = (t - EV.city[0]) / BEAT; const g = bb <= 0 ? 0 : bb >= nb ? 1 : (Math.floor(bb) + E.outBack(clamp((bb - Math.floor(bb)) / 0.6))) / nb;
    st.W = [clamp((t - BR0 - BFLY) / BRATE + 1, 0, 60), g, 80, 0.9]; st.W2 = [0, 0, 0.6, 0.4];
    st.cityN = Math.round(g * 120);
    if (t < 28) { const p = l / 4; const a = 0.55 + 0.15 * p; st.cam = [0.6 + Math.sin(a) * 3.6, 1.55 - 0.2 * p, Math.cos(a) * 3.6]; st.tgt = [0.7, 0.05, 0]; st.fov = 42; }
    else if (t < 32) { const p = (t - 28) / 4; st.cam = [3.4 - 0.2 * p, 0.32, 0.95 + 0.2 * p]; st.tgt = [0.6, 0.25, 0]; st.fov = 46; }
    else if (t < 36) { const xx = crabX(t); st.cam = [xx + 0.5, 0.55, 2.5]; st.tgt = [xx + 0.1, 0.35, 0]; st.fov = 42; }
    else { const p = E.inOutCubic(inv(36, 40, t)); st.cam = [lerp(4.4, 1.6, p), lerp(1.2, 4.6, p), lerp(3.6, 8.6, p)]; st.tgt = [lerp(3.3, 3.0, p), lerp(0.5, 1.4, p), lerp(0, -3.4, p)]; st.fov = lerp(44, 52, p); } },
  rocket(st) { const t = st.t, l = st.l;
    const rk = rocketAt(t); const rb = 0.2 * Math.floor(26 * E.inOutSine(inv(EV.print[0], EV.print[1], t)) + 0.0001);
    st.rocket = { pos: rk.pos, R: rk.R, build: t < EV.print[0] ? -1 : Math.min(5.3, rb + 0.001) };
    if (PH) printHead(st, t);
    let P;
    const seat = V.add(rk.pos, ROCK_LOCAL_SEAT);
    if (t < EV.board) { const x = crabX(t); P = { pos: [x, 0, 0], blink: blinkAt(t), lookX: 0.8, legPh: legPhAt(x), stride: t < 41 ? 0.05 : 0, legLift: t < 41 ? 0.07 : 0 };
      if (PH && t > 40.75 && t < PHT.hot1) { const u = E.outBack(clamp((t - 40.75) / 0.35)); P.armL = P.armR = 1.75 * u; P.armFL = P.armFR = 0.5 * u; P.lookY = 0.6 * u; P.sq = 1 + 0.06 * Math.sin(clamp((t - 40.75) / 0.35) * Math.PI); }
      else if (t > 41) { const ph = (t - 41) * 6; P.armL = 0.9 + 0.5 * Math.max(0, Math.cos(ph * Math.PI)); P.armR = 0.9 + 0.5 * Math.max(0, -Math.cos(ph * Math.PI)); P.armFL = P.armFR = 0.3; P.lookY = 0.3 + 0.3 * inv(41, 45, t); }
      // блоки летят на текущий слой печати
      if (!PH && t > EV.print[0] && t < EV.print[1]) { const R = rig(P); const rr = rng(3);
        for (let j = 0; j < 80; j++) { const tl = EV.print[0] + j * 0.07, s = (t - tl) / 0.4; const a = rr() * 6.283; if (s <= 0 || s >= 1) continue;
          const hy = 0.2 * Math.floor(26 * E.inOutSine(inv(EV.print[0], EV.print[1], tl + 0.4))); const dst = [PAD[0] + Math.cos(a) * 0.9, hy + 0.1, PAD[2] + Math.sin(a) * 0.9];
          st.fly.push({ p: arc(R.tips[j % 2], dst, 0.9, E.inOutSine(s)), s: 0.07, c: j % 3 === 0 ? [0.74, 0.17, 0.075] : [0.86, 0.83, 0.78] }); } } }
    else if (t < EV.board + 0.95) { // два прыжка: к окну и внутрь
      const front = [PAD[0], 0, PAD[2] + 1.75]; const x0 = [XPAD, 0, 0];
      if (t < EV.board + 0.42) { const hp = hopPose(t, EV.board, 0.42); P = { pos: arc(x0, front, 0.9, E.inOutSine(hp.k)), sq: hp.sq, yaw: 0, armL: 1.3, armR: 1.3, blink: 0, lookY: 0.4 }; }
      else { const hp = hopPose(t, EV.board + 0.47, 0.45); const p = arc(front, seat, 1.0, E.inOutSine(hp.k)); P = { pos: p, sq: hp.sq, yaw: Math.PI * E.inOutCubic(hp.k), armL: 1.4, armR: 1.4, blink: 0 }; } }
    else { const u = t - EV.board - 0.95; const turn = Math.PI * (1 - E.inOutCubic(inv(0, 0.4, u)));
      P = { pos: seat, yaw: turn + Math.PI * 2, blink: blinkAt(t), sq: 1 + 0.15 * Math.exp(-u * 4) * Math.sin(u * 14) };
      P.armR = u > 0.6 && t < 48 ? 1.2 + 0.4 * Math.sin((u - 0.6) * 14) : 0.2; P.armL = 0.2;
      if (t > EV.ignite) { P.lookX = 0.15 * Math.sin(t * 40); P.sq = 0.97 + 0.03 * Math.sin(t * 50); P.blink = t > EV.lift ? 0.6 : 0; }
      P.pos = V.add(rk.pos, ROCK_LOCAL_SEAT); st.cabin = [...V.add(rk.pos, [0, 2.75, 0.45]), 1.2]; }
    st.crab = P;
    st.flame = t < EV.ignite ? 0 : t < EV.lift ? 0.35 * inv(EV.ignite, EV.lift, t) : Math.min(1, 0.35 + (t - EV.lift) * 0.8);
    st.smoke = t < EV.ignite ? 0 : E.outCubic(inv(EV.ignite, EV.lift + 2.5, t)); st.smokeC = [PAD[0], 0.2, PAD[2]];
    st.shake = t > EV.ignite ? 0.012 + 0.03 * inv(EV.ignite, EV.lift + 1, t) * (1 - inv(53, 56, t)) : 0;
    st.W = [60, 1, 80, 0.9]; st.W2 = [0, 0, 0.6, lerp(0.4, 1, inv(52, 56, t))]; st.cityN = 120;
    const ry = rk.pos[1];
    if (t < EV.board) { const a = lerp(0.35, 1.25, inv(40, EV.board, t)); const c = [PAD[0] - 1.1, 0, PAD[2]];
      st.cam = [c[0] + Math.sin(a) * 7.4, 2.3 + 0.4 * Math.sin(l * 0.5), c[2] + Math.cos(a) * 7.4]; st.tgt = [c[0], 1.6, c[2]]; st.fov = 44;
      if (PH) { // камера поднимается вслед за соплом и отходит, чтобы головка всегда была в кадре
        const hy = st.head ? Math.min(5.6, st.head.p[1]) : 5.6, k = E.inOutSine(inv(41.2, 46, t)), R = 7.4 + 1.6 * k;
        st.cam = [c[0] + Math.sin(a) * R, 2.3 + 0.4 * Math.sin(l * 0.5) + 0.45 * hy, c[2] + Math.cos(a) * R]; st.tgt = [c[0] + 0.6, 1.2 + 0.55 * hy, c[2]]; st.fov = 46; } }
    else if (t < 48) { st.cam = [PAD[0] - 0.3, 2.6, PAD[2] + 4.6]; st.tgt = [PAD[0], 2.3, PAD[2]]; st.fov = 40;
      if (t < EV.board + 0.9) { st.cam = [PAD[0] - 1.6, 1.6, PAD[2] + 5.4]; st.tgt = [PAD[0] - 0.4, 1.4, PAD[2] + 0.5]; st.fov = 46; } }
    else if (t < EV.lift) { st.cam = [2.2, 0.55, 6.6]; st.tgt = [PAD[0], 2.2, PAD[2]]; st.fov = 46; }
    else if (t < 53) { st.cam = [3.6, 0.3, 4.6]; st.tgt = [PAD[0], ry + 2.8, PAD[2]]; st.fov = 52; }
    else { const p = E.inOutCubic(inv(53, 56, t)); st.cam = [PAD[0] - 5.5, ry * 0.45 + 2.5, PAD[2] + 11 + 5 * p]; st.tgt = [PAD[0], ry * 0.8 + 1.2, PAD[2]]; st.fov = 56; } },
  space(st) { const t = st.t, l = st.l;
    const rk = rocketAt(t); st.rocket = { pos: rk.pos, R: rk.R, build: 9 };
    const seatW = V.add(rk.pos, M3.ap(rk.R, ROCK_LOCAL_SEAT));
    st.crab = { pos: seatW, base: rk.R, blink: blinkAt(t), lookX: 0.2 * Math.sin(t * 1.3), armL: 0.3, armR: 0.3, sq: 1 };
    st.cabin = [...V.add(rk.pos, M3.ap(rk.R, [0, 2.75, 0.45])), 1.2];
    const landing = t > 61.4; st.flame = landing ? 0.5 * (1 - inv(EV.land - 0.2, EV.land + 0.1, t)) : 0.9;
    st.smoke = t > EV.land - 0.4 ? 0.55 * E.outCubic(inv(EV.land - 0.4, EV.land + 1.2, t)) : 0; st.smokeC = [1.25, 0.1, -1.1];
    st.sun = [0.9, 0.35, 0.4]; st.W2 = [0, 0, 0, 1]; st.expo = 1.0;
    if (t < 59.5) { const p = inv(56, 59.5, t); const R = rk.R; const fwd = M3.ap(R, [0, 1, 0]); const side = M3.ap(R, [0, 0, 1]);
      st.cam = V.add(rk.pos, V.add(V.mul(side, 5.4), V.add(V.mul(fwd, lerp(-2.5, 1.5, p)), [0, 0.8, 0]))); st.tgt = V.add(rk.pos, V.mul(fwd, 2.2)); st.fov = 44; st.roll = 0.08 * Math.sin(l); }
    else { const p = E.inOutCubic(inv(59.5, 64, t)); st.cam = [lerp(6.8, 5.2, p), lerp(3.0, 1.8, p), lerp(8.2, 6.6, p)]; st.tgt = [lerp(0.4, 0.6, p), lerp(2.5, 1.0, p), -0.4]; st.fov = 46; } },
  dance(st) { const t = st.t, l = st.l; const B = (t - 64) / BEAT; const D = [-0.5, 0, 1.05];
    const rk = rocketAt(t); st.rocket = { pos: rk.pos, R: rk.R, build: 9 }; st.sun = [0.9, 0.35, 0.4];
    const seat = V.add(rk.pos, ROCK_LOCAL_SEAT);
    let P = { pos: D.slice(), blink: blinkAt(t), sq: 1 };
    if (B < 1.3) { const hp = hopPose(t, 64.0, 0.6); const e = E.inOutSine(hp.k); P.pos = bez(seat, V.add(seat, [0, 0.8, 1.6]), V.add(D, [0, 1.2, 0]), D, e); P.sq = hp.sq; P.armL = P.armR = 1.4; }
    else if (B < 8) { const bi = Math.floor(B), bf = B - bi; const side = bi % 2 ? 1 : -1; const e = E.outCubic(clamp(bf / 0.35));
      P.pos = [D[0] + 0.28 * lerp(-side, side, e), 0, D[2]]; P.legPh = B * Math.PI * 2; P.legLift = 0.06; P.stride = 0.04;
      P.armL = bi % 2 ? 1.4 * (1 - bf) : 0.3; P.armR = bi % 2 ? 0.3 : 1.4 * (1 - bf); P.sq = 1 - 0.12 * Math.exp(-bf * 7); P.lean = side * 0.1 * e; P.lookX = side * 0.6; }
    else if (B < 16) { const a = Math.PI * (B - 8) / 4 + Math.PI / 2; P.pos = [D[0] + Math.cos(a) * 0.5, 0, D[2] + Math.sin(a) * 0.35];
      P.legPh = B * Math.PI * 2.5; P.legLift = 0.07; P.stride = 0.05; P.armL = P.armR = 0.6 + 0.4 * Math.sin(B * Math.PI);
      P.yaw = B > 15 ? 2 * Math.PI * E.inOutCubic(B - 15) : 0; P.lookX = Math.sin(a) * 0.7; P.bob = 0.03 * Math.abs(Math.sin(B * Math.PI)); }
    else if (B < 24) { const bi = Math.floor(B), bf = B - bi; const hp = hopPose(bf, 0.12, 0.6); P.sq = hp.sq; P.bob = hp.k > 0 && hp.k < 1 ? 0.38 * Math.sin(Math.PI * hp.k) : 0;
      P.armL = P.armR = 0.4 + 1.0 * Math.sin(Math.PI * hp.k); P.lean = B > 20 ? (bi % 2 ? 0.22 : -0.22) * Math.sin(Math.PI * hp.k) : 0; P.blink = hp.k > 0.3 && hp.k < 0.7 ? 1 : P.blink; }
    else { const bi = Math.floor(B), bf = B - bi;
      P.armL = 0.9 + 0.7 * Math.sin(B * Math.PI); P.armR = 0.9 - 0.7 * Math.sin(B * Math.PI); P.sq = 1 - 0.1 * Math.abs(Math.sin(B * Math.PI)); P.lean = 0.12 * Math.sin(B * Math.PI / 2);
      if (B > 28 && B < 30) { P.legPh = B * Math.PI * 4; P.legLift = 0.09; P.stride = 0.0; P.sq = 1 - 0.14 * Math.exp(-(bf % 0.5) * 9); }
      if (B >= 30) { const hp = hopPose(t, EV.freeze - 0.5, 0.5); P.sq = hp.sq; P.bob = hp.k > 0 && hp.k < 1 ? 0.6 * Math.sin(Math.PI * hp.k) : 0; P.yaw = 4 * Math.PI * E.inOutCubic(hp.k);
        P.armL = P.armR = 1.45; P.blink = t > EV.freeze ? 1 : P.blink; P.lean = 0; } }
    st.crab = P; st.cabin = [0, 0, 0, 0];
    st.W2 = [1, 0, 0, 1]; st.beat = Math.max(0, B);
    const cX = P.pos[0], cZ = P.pos[2];
    if (t < 68) { const p = (t - 64) / 4; st.cam = [D[0] + 0.4 - 0.8 * p, 1.0, D[2] + 5.2 - 0.4 * p]; st.tgt = [D[0] + 0.2, 0.55, D[2] - 0.8]; st.fov = 42; }
    else if (t < 72) { const a = lerp(-0.9, 0.9, E.inOutSine((t - 68) / 4)); st.cam = [D[0] + Math.sin(a) * 3.4, 1.1, D[2] - 0.5 + Math.cos(a) * 3.4]; st.tgt = [cX * 0.5 + D[0] * 0.5, 0.5, cZ * 0.5 + D[2] * 0.5 - 0.3]; st.fov = 42; }
    else if (t < 76) { st.cam = [D[0] + 1.7, 0.32, D[2] + 2.2]; st.tgt = [cX, 0.62, cZ]; st.fov = 36; st.roll = -0.06; }
    else { const p = E.inOutCubic(inv(76, 79.2, t)); const q = E.inOutCubic(inv(79.2, 80, t)); st.cam = [D[0] + lerp(0.3, 0.1, p), lerp(1.4, 5.2, p) - q * 2.6, D[2] + lerp(3.6, 3.0, p) - q * 0.8]; st.tgt = [cX, 0.4, cZ - 0.2 * p]; st.fov = 46; } },
  end(st) { const t = st.t, l = st.l; st.sun = [-0.5, 0.6, 0.65];
    const rk = rocketAt(t); st.rocket = { pos: rk.pos, R: rk.R, build: 9 };
    const dir = V.norm([-0.42, 0, -0.9]); const Ep = V.mul(dir, 2.28); const yawP = Math.atan2(dir[0], dir[2]);
    const up = E.inOutCubic(inv(86, 86.6, t)); const turn = E.inOutCubic(inv(86.5, 87.3, t));
    const P = { pos: V.sub(Ep, V.mul(dir, 0.45 * turn)), yaw: yawP + Math.PI * turn, sit: 1 - up, dangle: 0.25 * (1 - up), dPh: t * 2.2, blink: blinkAt(t) };
    P.lookY = t < 86 ? 0.5 : 0; P.armL = P.armR = 0.15;
    if (t > 87.5) { P.armR = t > 89.6 && t < 91 ? 1.2 + 0.35 * Math.sin((t - 89.6) * 15) : 0.25; P.lookX = t > 88 && t < 89 ? -0.5 : 0; }
    st.crab = P; st.W2 = [0, 0, 0, 1];
    const crabP = P.pos; const sr = [0.9, 0, -0.42]; // вправо на экране, когда смотрим в сторону планеты
    if (t < 86) { const p = inv(80, 86, t); st.cam = [Ep[0] + 0.85 - 0.15 * p, 1.2 - 0.1 * p, Ep[2] + 3.1 - 0.3 * p]; st.tgt = V.add(Ep, V.add(V.mul(dir, 5), [-0.6, 1.0, 0])); st.fov = 46; }
    else { const p = E.inOutCubic(inv(86, 92, t)); st.cam = V.add(crabP, V.add(V.mul(dir, -3.5 + 0.25 * p), V.add(V.mul(sr, -1.0), [0, 0.8, 0])));
      st.tgt = V.add(crabP, V.add(V.mul(sr, -1.1), [0, 0.65, 0])); st.fov = 40; } },
};

// ---------- 2D слой и система текста (как в шоуриле): журнал надписей для законов
const front = document.createElement('canvas'); front.width = OW; front.height = OH; const fx = front.getContext('2d', { willReadFrequently: true }); fx.setTransform(K, 0, 0, K, 0, 0);
const MODE = { v: 'all' }, LOG = { on: false, reg: [], glyphs: [], deco: 0 };
function wrapCtx(ctx) {
  const o = {}; for (const m of ['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'save', 'restore', 'rect', 'clip']) o[m] = ctx[m].bind(ctx);
  const stack = []; let clipR = null, lastR = null;
  ctx.save = () => { stack.push(clipR); o.save(); }; ctx.restore = () => { clipR = stack.length ? stack.pop() : null; o.restore(); };
  ctx.rect = (x, y, w, h) => { const tr = ctx.getTransform(); lastR = [(tr.a * x + tr.e) / K, (tr.d * y + tr.f) / K, (tr.a * (x + w) + tr.e) / K, (tr.d * (y + h) + tr.f) / K]; o.rect(x, y, w, h); };
  ctx.clip = (...a) => { if (lastR) clipR = clipR ? [Math.max(clipR[0], lastR[0]), Math.max(clipR[1], lastR[1]), Math.min(clipR[2], lastR[2]), Math.min(clipR[3], lastR[3])] : lastR.slice(); o.clip(...a); };
  for (const m of ['fill', 'stroke', 'fillRect', 'strokeRect']) ctx[m] = (...a) => { if (MODE.v !== 'mask') o[m](...a); };
  for (const m of ['fillText', 'strokeText']) ctx[m] = (s, x, y) => {
    if (MODE.v === 'none' || ctx.globalAlpha < 0.003) return;
    if (ctx.__outline) { if (MODE.v !== 'mask') o[m](s, x, y); return; }
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
wrapCtx(fx);
function REG(id, text, x, y, w, h, a) { if (LOG.on && a > 0.01) LOG.reg.push({ id, text, x, y, w, h, a }); }
function deco(f) { LOG.deco++; try { f(); } finally { LOG.deco--; } }
function font(ctx, size, weight = 700, fam = FD, stretch = 'normal', spacing = '0px') { ctx.font = `${weight} ${size}px ${fam}`; ctx.fontStretch = stretch; ctx.letterSpacing = spacing; }
function heavy(ctx, s, x, y, w = 12) { ctx.save(); ctx.__outline = true; ctx.shadowColor = 'transparent'; ctx.lineJoin = 'round'; ctx.lineWidth = w;
  ctx.strokeStyle = 'rgba(0,0,0,0.72)'; ctx.strokeText(s, x, y); ctx.__outline = false; ctx.restore(); ctx.fillText(s, x, y); }
function shade(ctx, blur = 14) { ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = blur * K; }
function scrim(x, y, w, h, a = 1, k = 0.62) { if (a <= 0.003) return; fx.save(); fx.globalAlpha = a; fx.fillStyle = `rgba(4,4,10,${k})`;
  fx.shadowColor = `rgba(4,4,10,${k})`; fx.shadowBlur = 50 * K; fx.fillRect(x, y, w, h); fx.restore(); }
function sideScrim(side, wpx, a = 1, k = 0.7) { if (a <= 0.003) return; fx.save(); fx.globalAlpha = a;
  const g = side === 'left' ? fx.createLinearGradient(0, 0, wpx, 0) : fx.createLinearGradient(W, 0, W - wpx, 0);
  g.addColorStop(0, `rgba(3,3,8,${k})`); g.addColorStop(0.55, `rgba(3,3,8,${k * 0.6})`); g.addColorStop(1, 'rgba(3,3,8,0)'); fx.fillStyle = g;
  fx.fillRect(side === 'left' ? 0 : W - wpx, 0, wpx, H); fx.restore(); }
function scramble(txt, p, seed) { if (p >= 1) return txt; const r = rng(seed); const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/%'; const n = Math.floor(txt.length * p);
  return [...txt].map((ch, i) => (i < n || ch === ' ' ? ch : pool[Math.floor(r() * pool.length)])).join(''); }
function caption(id, txt, a, life, y = H - 150) {
  if (a < 0 || a > life) return; const al = clamp(a / 0.2) * (1 - inv(life - 0.3, life, a));
  fx.save(); font(fx, 30, 500, FM, 'normal', '4px'); const w = fx.measureText(txt).width;
  scrim(W / 2 - w / 2 - 36, y - 42, w + 72, 60, al);
  fx.globalAlpha = al; fx.fillStyle = '#fff'; fx.textAlign = 'center'; shade(fx, 10);
  fx.fillText(scramble(txt, inv(0, 0.3, a), hashStr(id)), W / 2, y); fx.restore();
  REG(id, txt, W / 2 - w / 2, y - 24, w, 30, al);
}
function readout(id, x, y, rows, a, accent = C.coral) {
  if (a <= 0.003) return; fx.save(); font(fx, 22, 500, FM, 'normal', '2px');
  const w = Math.max(...rows.map((r) => fx.measureText(r).width)), lh = 34;
  scrim(x - 34, y - 36, w + 64, rows.length * lh + 30, a);
  fx.globalAlpha = a; fx.fillStyle = '#fff'; fx.textAlign = 'left'; shade(fx, 8);
  rows.forEach((r, i) => { fx.fillText(r, x, y + i * lh); REG(id + i, r, x, y + i * lh - 18, fx.measureText(r).width, 22, a); });
  fx.shadowBlur = 0; fx.fillStyle = accent; fx.fillRect(x - 18, y - 22, 3, rows.length * lh); fx.restore();
}
const rdA = (l, t0, t1) => E.outExpo(inv(t0, t0 + 0.5, l)) * (1 - inv(t1 - 0.3, t1, l));
function maskWord(id, w, x, y, size, a, life, col, align = 'center') {
  if (a < 0 || a > life) return; const pin = E.outExpo(clamp(a / 0.45)), pout = E.inExpo(inv(life - 0.25, life, a));
  fx.save(); font(fx, size, 800, FD, 'condensed', '2px'); fx.textAlign = align;
  const mw = fx.measureText(w).width, x0 = align === 'center' ? x - mw / 2 : align === 'right' ? x - mw : x;
  fx.beginPath(); fx.rect(0, y - size * 0.82, W, size * 1.0); fx.clip();
  fx.fillStyle = col; shade(fx, 30); const yy = y + (1 - pin) * size - pout * size;
  heavy(fx, w, x, yy, size / 14); fx.restore();
  REG(id, w, x0, y - size * 0.72, mw, size * 0.72, pin * (1 - pout));
}

function drawHUD(st) {
  const { t, sec } = st; const a = 0.85 * E.outCubic(inv(0.3, 0.8, t)) * (1 - st.fade) * (1 - inv(80, 80.6, t));
  if (a <= 0.003) return;
  fx.save(); fx.globalAlpha = a / 0.85;
  let g = fx.createLinearGradient(0, 0, 0, 170); g.addColorStop(0, 'rgba(0,0,0,0.72)'); g.addColorStop(1, 'rgba(0,0,0,0)'); fx.fillStyle = g; fx.fillRect(0, 0, W, 170);
  g = fx.createLinearGradient(0, H - 190, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.8)'); fx.fillStyle = g; fx.fillRect(0, H - 190, W, 190); fx.restore();
  scrim(MX - 16, H - 104, 470, 44, a, 0.35); scrim(W - MX - 600, H - 104, 616, 44, a, 0.35);
  scrim(MX - 16, 66, 476, 40, a, 0.5); scrim(W - MX - 306, 66, 322, 40, a, 0.5);
  fx.save(); fx.globalAlpha = a; fx.fillStyle = '#fff'; fx.strokeStyle = '#fff'; fx.lineWidth = 2; shade(fx, 10);
  font(fx, 22, 500, FM, 'normal', '3px');
  fx.textAlign = 'left'; fx.fillText('CLAUDE  /  A CRAB STORY 2026', MX, 92); REG('hud1', 'CLAUDE  /  A CRAB STORY 2026', MX, 74, 440, 22, a);
  const fr = Math.floor(t * FPS + 1e-6), sTot = Math.floor(fr / FPS); fx.textAlign = 'right';
  const tc = `TC 00:${pad2(Math.floor(sTot / 60))}:${pad2(sTot % 60)}:${String(fr % FPS).padStart(FPS > 99 ? 3 : 2, '0')}`;
  fx.fillText(tc, W - MX, 92); REG('tc', tc, W - MX - 290, 74, 290, 22, a);
  const s = `${OW} x ${OH}  ·  ${FPS} FPS  ·  120 BPM`; fx.fillText(s, W - MX, H - 74); REG('hud2', s, W - MX - 560, H - 92, 560, 22, a);
  fx.shadowBlur = 0; const m = 40, L = 34;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { fx.beginPath(); fx.moveTo(x, y + sy * L); fx.lineTo(x, y); fx.lineTo(x + sx * L, y); fx.stroke(); }
  if (NAME[sec.type]) { const p = E.outExpo(inv(0.2, 0.6, t - sec.t0)); const lab = `${pad2(sec.i + 1)}  ${NAME[sec.type]}`;
    fx.textAlign = 'left'; font(fx, 24, 600, FM, 'normal', '4px'); shade(fx, 10);
    fx.save(); fx.beginPath(); fx.rect(MX, H - 110, 760, 46); fx.clip(); fx.fillText(lab, MX + (1 - p) * -560, H - 74); fx.restore();
    REG('sec' + sec.i, lab, MX, H - 94, fx.measureText(lab).width, 24, a * p);
    fx.shadowBlur = 0; fx.fillRect(MX, H - 62, 220 * p, 2);
    fx.globalAlpha = a * 0.5; fx.fillRect(MX, H - 44, (W - 2 * MX) * (t / DUR), 1); }
  fx.restore();
}

// ---------- терминал в начале
const TERM = [['$ ', 'claude', 0.6, 1.0, 1.7], ['> ', 'build something cool', 2.4, 2.6, 3.6], ['', '✻ thinking ...', 3.9, 3.9, 3.9], ['', '● assembling a crab  ·  9 parts', 4.3, 4.3, 4.3]];
function drawTerminal(st) { const t = st.t; const out = inv(7.2, 7.9, t); if (out >= 1) return;
  const x0 = 170, y0 = 420, lh = 58; const a = (1 - out);
  sideScrim('left', 1150, a * inv(0.2, 0.6, t), 0.6);
  fx.save(); fx.globalAlpha = a; font(fx, 34, 500, FM); fx.textAlign = 'left'; const cw = fx.measureText('M').width;
  let cx = x0, cy = y0;
  TERM.forEach(([pre, txt, tShow, t0, t1], i) => { if (t < tShow) return; const y = y0 + i * lh; const n = t1 > t0 ? Math.floor(txt.length * inv(t0, t1, t)) : txt.length;
    fx.fillStyle = i < 2 ? C.coral : i === 2 ? '#c9c6d8' : '#ffffff'; shade(fx, 10); fx.fillText(pre, x0, y);
    fx.fillStyle = i === 1 ? '#ffffff' : i === 2 ? '#c9c6d8' : fx.fillStyle; const shown = txt.slice(0, n); fx.fillText(shown, x0 + pre.length * cw, y);
    if (n === txt.length) REG('term' + i, pre + txt, x0, y - 26, (pre.length + txt.length) * cw, 34, a);
    cx = x0 + (pre.length + n) * cw; cy = y; });
  // счётчик деталей
  if (t > 4.3) { const n = EV.parts.filter((x) => t >= x).length; const s = `${n} / 9 PARTS IN PLACE`; font(fx, 24, 500, FM, 'normal', '4px'); fx.fillStyle = '#ffffff'; fx.globalAlpha = a * 0.92;
    fx.fillText(s, x0, y0 + 4 * lh + 20); REG('!parts', s, x0, y0 + 4 * lh, 420, 24, a);
    fx.shadowBlur = 0; fx.fillStyle = 'rgba(255,255,255,0.3)'; fx.fillRect(x0, y0 + 4 * lh + 44, 420, 2); fx.fillStyle = C.coral; fx.fillRect(x0, y0 + 4 * lh + 44, 420 * n / 9, 2); }
  fx.globalAlpha = a; fx.shadowBlur = 0;
  if (t < 3.85 && Math.floor(t * 3) % 2 === 0) { fx.fillStyle = C.coral; fx.fillRect(cx + 4, cy - 28, cw * 0.9, 36); }
  fx.restore();
}

// ---------- надписи сцен
const DRAW = {
  boot(st) { drawTerminal(st); const l = st.l;
    caption('bc1', 'HELLO, WORLD', l - 8.3, 3.1); },
  walk(st) { const l = st.l;
    caption('wc1', 'A SMALL CRAB WITH A BIG IDEA', l - 1.0, 3.8);
    caption('wc2', 'EVERY LINE OF THIS FLOOR IS CODE', l - 5.2, 3.6);
    readout('wrd', W - 600, 230, ['GAP      2.00 m', 'BRIDGE   NONE', 'PLAN     BUILD ONE'], rdA(st.t, EV.stop + 0.4, 24.95), C.cyan); },
  build(st) { const t = st.t, l = st.l; const n = Math.round(st.W[0]);
    readout('wrd', W - 600, 230, ['GAP      2.00 m', 'BRIDGE   NONE', 'PLAN     BUILD ONE'], rdA(t, EV.stop + 0.4, 24.95), C.cyan);
    caption('bc1', 'ONE BLOCK AT A TIME', t - (BR0 + 0.3), 3.6);
    readout('brd', MX + 50, 230, [`BLOCKS  ${String(n).padStart(2, ' ')} / 60`, `SPAN    ${(n / 30).toFixed(2)} m`], rdA(t, BR0, 32), C.coral);
    maskWord('bw1', 'THEN A CITY', W / 2, 330, 190, t - 36.25, 3.6, '#fff');
    readout('crd', W - 560, H - 330, [`BUILDINGS  ${String(st.cityN || 0).padStart(3, ' ')}`, 'WINDOWS    HASHED', 'ONE BEAT   ONE FLOOR'], rdA(t, 36.4, 40), C.cyan); },
  rocket(st) { const t = st.t; const pr = PH ? clamp(inv(PHT.p0, PHT.p1, t)) : clamp(inv(EV.print[0], EV.print[1], t)); const layer = PH ? Math.min(26, Math.floor(26 * pr)) : Math.round(26 * E.inOutSine(pr));
    caption('rc1', 'PRINTED LAYER BY LAYER', t - 41.0, 4.2);
    readout('rrd', MX + 50, 230, [`PRINTING  ${String(Math.round(pr * 100)).padStart(3, ' ')} %`, `LAYER     ${String(layer).padStart(2, ' ')} / 26`, PH ? `NOZZLE    ${String(st.nozzleC ?? 215).padStart(3, ' ')} °C` : 'NOZZLE    215 °C'], rdA(t, 40.6, EV.board), C.coral);
    // отсчёт
    EV.count.forEach((tc, k) => { const a = t - tc; if (a < 0 || a > BEAT) return; const p = E.outExpo(clamp(a / 0.2)); const out = inv(BEAT - 0.08, BEAT, a);
      const cx = 520, cy = H / 2 - 20;
      fx.save(); fx.globalAlpha = 1 - out; fx.translate(cx, cy); fx.scale(1.35 - 0.35 * p, 1.35 - 0.35 * p); font(fx, 360, 800, FD, 'condensed'); fx.textAlign = 'center'; fx.textBaseline = 'middle';
      fx.fillStyle = '#fff'; shade(fx, 30); heavy(fx, String(3 - k), 0, 10, 24); fx.restore(); REG('!count' + k, String(3 - k), cx - 110, cy - 140, 220, 280, 1 - out);
      fx.save(); fx.strokeStyle = k === 2 ? C.coral : C.cyan; fx.lineWidth = 3 * (1 - p) + 1; fx.globalAlpha = 1 - p; fx.beginPath(); fx.arc(cx, cy, 110 + 360 * p, 0, 7); fx.stroke(); fx.restore(); });
    maskWord('rw1', 'LIFTOFF', W / 2, 300, 220, t - EV.lift - 0.1, 2.6, '#fff'); },
  space(st) { const t = st.t, l = st.l; const cx = W / 2, cy = H / 2;
    if (t < 59.6) { const sp = 1 - inv(57.5, 59.6, t); fx.save(); const r = rng(42); fx.strokeStyle = '#fff';
      for (let i = 0; i < 140; i++) { const a = r() * Math.PI * 2; const ph = (r() + l * 1.4) % 1; const d0 = 160 + ph * ph * 1200; const len = 30 + 300 * ph * sp;
        fx.globalAlpha = 0.5 * sp * ph; fx.lineWidth = 1 + ph * 2; fx.beginPath(); fx.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0); fx.lineTo(cx + Math.cos(a) * (d0 + len), cy + Math.sin(a) * (d0 + len)); fx.stroke(); }
      fx.restore(); }
    caption('sc1', 'NEXT STOP: THE MOON', l - 1.0, 4.0);
    readout('srd', W - 560, 230, [`ALTITUDE  ${Math.round(380 * E.inOutSine(inv(56, EV.land, t))).toString().padStart(3, ' ')} 000 km`, 'FUEL      COFFEE', 'CREW      1 CRAB'], rdA(t, 57.2, 62.4), C.violet); },
  dance(st) { const t = st.t;
    [['BUILD', C.coral], ['SHIP', '#fff'], ['DANCE', C.cyan], ['REPEAT', '#fff']].forEach(([w, col], i) => maskWord('dw' + i, w, W / 2, 300, 230, t - (64.3 + i * 2 * BAR), 2 * BAR - 0.45, col)); },
  end(st) { const t = st.t, l = st.l, cx = W / 2;
    const lo = inv(85.4, 85.9, t);
    if (lo < 1) { fx.save(); fx.fillStyle = '#fff'; fx.textAlign = 'center'; shade(fx, 24);
      const p = E.outExpo(inv(80.3, 81.3, t)); const la = inv(80.3, 80.7, t) * (1 - lo);
      font(fx, 140, 700, FD, 'normal', `${lerp(90, 18, p).toFixed(1)}px`); fx.globalAlpha = la; heavy(fx, 'CLAUDE', cx + 9, 300, 10);
      REG('logo', 'CLAUDE', cx - 330, 200, 660, 100, la * p);
      const q = E.outExpo(inv(80.6, 81.2, t)); fx.globalAlpha = 1 - lo; scrim(cx - 470, 322, 940, 112, (1 - lo) * q, 0.72);
      fx.save(); fx.beginPath(); fx.rect(cx - 440 * q, 322, 880 * q, 60); fx.clip(); font(fx, 30, 500, FM, 'normal', '10px'); fx.fillStyle = '#ff9a80'; shade(fx, 10);
      fx.fillText('A CRAB STORY  ·  2026', cx + 5, 364); fx.restore(); REG('logo2', 'A CRAB STORY · 2026', cx - 330, 338, 660, 30, q * (1 - lo));
      fx.globalAlpha = 0.95 * inv(81.0, 81.4, t) * (1 - lo); font(fx, 22, 500, FM, 'normal', '4px'); fx.fillStyle = '#fff';
      fx.fillText('MADE ENTIRELY IN CODE', cx, 412); REG('logo3', 'MADE ENTIRELY IN CODE', cx - 200, 390, 400, 22, fx.globalAlpha);
      fx.restore(); }
    const e = t - 86.3; if (e < 0) return; const fo = inv(91.25, 91.7, t);
    sideScrim('left', 1250, E.outCubic(inv(-0.3, 0.5, e)) * (1 - fo), 0.8);
    fx.save(); const x = 170, y0 = 330, lh = 62; const ta = E.outExpo(inv(0, 0.5, e)) * (1 - fo);
    font(fx, 26, 600, FM, 'normal', '8px'); fx.fillStyle = '#ff9a80'; fx.globalAlpha = ta; shade(fx, 8); fx.fillText('WHAT YOU JUST WATCHED', x, y0 - 70); REG('crh', 'WHAT YOU JUST WATCHED', x, y0 - 92, 560, 26, ta);
    fx.shadowBlur = 0; fx.fillStyle = '#ff9a80'; fx.fillRect(x, y0 - 50, 520 * ta, 2);
    CREDITS.forEach((c, i) => { const a = e - 0.4 - i * 0.2; if (a < 0) return; const p = E.outExpo(clamp(a / 0.4)) * (1 - fo);
      fx.globalAlpha = p; font(fx, 22, 500, FM, 'normal', '3px'); fx.fillStyle = C.coral; fx.fillText(pad2(i + 1), x, y0 + i * lh);
      font(fx, 30, 500, FM, 'normal', '3px'); fx.fillStyle = '#fff'; shade(fx, 8); fx.fillText(c, x + 70 - (1 - p) * 30, y0 + i * lh); fx.shadowBlur = 0;
      REG('cr' + i, c, x, y0 + i * lh - 24, 70 + fx.measureText(c).width, 30, p); });
    fx.restore();
    // курсор в конце: крабик снова пиксель
    if (t > DUR - 0.5) { const on = Math.floor((t - (DUR - 0.5)) * 4) % 2 === 0; if (on) { fx.save(); fx.fillStyle = C.coral; fx.globalAlpha = 1; fx.fillRect(cx - 14, H / 2 - 20, 28, 40); fx.restore(); } } },
};
const CREDITS = ['ONE CRAB  ·  9 BOXES  ·  0 POLYGONS', 'A BRIDGE OF 60 BLOCKS', 'A CITY THAT GROWS ON THE BEAT', 'A ROCKET PRINTED LAYER BY LAYER',
  'VOXELS TRACED ON THE GPU', 'MUSIC SYNTHESIZED FROM SCRATCH', '0 IMAGES  ·  0 SAMPLES  ·  0 MODELS'];
function drawLayers(st) {
  fx.save(); fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, OW, OH); fx.restore();
  DRAW[st.type](st); drawHUD(st);
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
const SCN = {}; const sceneProg = (type) => SCN[type] || (SCN[type] = prog(SH.vsQuad, SH.fsScene.replace('//__DEFS__', DEFS[type].map((d) => '#define ' + d).join('\n'))));
const P = { copy: prog(SH.vsQuad, SH.fsCopy), pre: prog(SH.vsQuad, SH.fsPrefilter), down: prog(SH.vsQuad, SH.fsDown), up: prog(SH.vsQuad, SH.fsUp), fin: prog(SH.vsQuad, SH.fsFinal) };
const F = { scene: fbo(SW, SH2), acc: fbo(SW, SH2), frontAcc: fbo(OW, OH), bloom: [] };
const NB = Math.max(4, 6 + Math.round(Math.log2(K)));
for (let i = 0, w = OW, h = OH; i < NB; i++, w >>= 1, h >>= 1) F.bloom.push(fbo(w, h));
const texFront = tex(OW, OH, false); const vaoQuad = gl.createVertexArray();
function quad(p, target, w, h) { gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, w, h); gl.useProgram(p.p); gl.bindVertexArray(vaoQuad); }
function bindTex(p, name, unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(p.u[name], unit); }
function upload(t, canvas) { gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); }
const u3 = (S, n, v) => S.u[n] && gl.uniform3fv(S.u[n], v), u4 = (S, n, v) => S.u[n] && gl.uniform4fv(S.u[n], v), u1 = (S, n, v) => S.u[n] && gl.uniform1f(S.u[n], v);
function sceneUniforms(S, st) {
  gl.uniform2f(S.u.uRes, SW, SH2); u1(S, 'uT', st.t); u1(S, 'uL', st.l); u1(S, 'uK', st.k); u1(S, 'uBeat', st.beat);
  u3(S, 'uCamPos', st.cam); u3(S, 'uCamTgt', st.tgt); u1(S, 'uFov', st.fov); u1(S, 'uRoll', st.roll);
  if (st.crab) { const R = rig(st.crab); u1(S, 'uCrab', 1); u4(S, 'uCB', R.CB);
    u3(S, 'uPC[0]', new Float32Array(R.PC.flat())); u3(S, 'uPH[0]', new Float32Array(R.PH.flat()));
    if (S.u['uPR[0]']) gl.uniformMatrix3fv(S.u['uPR[0]'], false, new Float32Array(R.PR.flat())); // по строкам = шейдер видит обратный поворот
    u3(S, 'uCrabXZ', R.pos); } else { u1(S, 'uCrab', 0); u3(S, 'uCrabXZ', [X0, 0, 0]); }
  const fl = new Float32Array(64), fc = new Float32Array(48); let cen = [0, 0, 0], n = Math.min(16, st.fly.length);
  for (let i = 0; i < n; i++) { const f = st.fly[i]; fl.set([...f.p, f.s], i * 4); fc.set(f.c, i * 3); cen = V.add(cen, f.p); }
  let fb = [0, 0, 0, -1]; if (n) { cen = V.mul(cen, 1 / n); let r = 0; for (let i = 0; i < n; i++) r = Math.max(r, V.len(V.sub(st.fly[i].p, cen)) + st.fly[i].s * 1.8); fb = [...cen, r]; }
  u4(S, 'uFly[0]', fl); u3(S, 'uFlyC[0]', fc); u4(S, 'uFB', fb);
  u4(S, 'uW', st.W); u4(S, 'uW2', st.W2);
  const rk = st.rocket || { pos: [0, -50, 0], R: M3.I, build: -1 };
  u3(S, 'uRP', rk.pos); if (S.u.uRR) gl.uniformMatrix3fv(S.u.uRR, false, new Float32Array(rk.R)); u1(S, 'uRB', rk.build);
  u1(S, 'uFlame', st.flame); u1(S, 'uSmoke', st.smoke); u3(S, 'uSmokeC', st.smokeC); u4(S, 'uCabin', st.cabin);
  u3(S, 'uSun', st.sun); u3(S, 'uSpotPos', st.spotPos); u1(S, 'uSpot', st.spot);
  const hd = st.head; u4(S, 'uHead', hd ? [...hd.p, 1 + (hd.drop || 0)] : [0, -50, 0, 0]); u4(S, 'uHead2', hd ? [hd.gy, hd.hot, hd.ang, 1] : [0, 0, 0, 0]);
}
function renderSub(st) {
  drawLayers(st); upload(texFront, front);
  const S = sceneProg(st.type); quad(S, F.scene.f, SW, SH2); gl.disable(gl.BLEND); sceneUniforms(S, st); gl.drawArrays(gl.TRIANGLES, 0, 3);
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
  let p = P.pre; quad(p, F.bloom[0].f, OW, OH); gl.uniform2f(p.u.uRes, OW, OH); gl.uniform1f(p.u.uFrontGlow, 0.1);
  bindTex(p, 'uTex', 0, F.acc.t); bindTex(p, 'uFront', 1, F.frontAcc.t); gl.drawArrays(gl.TRIANGLES, 0, 3);
  for (let i = 1; i < NB; i++) { const b = F.bloom[i]; p = P.down; quad(p, b.f, b.w, b.h); gl.uniform2f(p.u.uRes, b.w, b.h); bindTex(p, 'uTex', 0, F.bloom[i - 1].t); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  for (let i = NB - 2; i >= 0; i--) { const b = F.bloom[i], s = F.bloom[i + 1]; p = P.up; quad(p, b.f, b.w, b.h); gl.uniform2f(p.u.uRes, b.w, b.h); gl.uniform2f(p.u.uSrc, s.w, s.h); bindTex(p, 'uTex', 0, s.t); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  gl.disable(gl.BLEND);
  p = P.fin; quad(p, null, OW, OH); gl.uniform2f(p.u.uRes, OW, OH);
  gl.uniform1f(p.u.uFlash, st.flash); gl.uniform1f(p.u.uCA, st.ca); gl.uniform1f(p.u.uBlack, st.black); gl.uniform1f(p.u.uFade, st.fade);
  gl.uniform1f(p.u.uTime, t0); gl.uniform1f(p.u.uBloomK, 0.2); gl.uniform1f(p.u.uExpo, st.expo);
  bindTex(p, 'uScene', 0, F.acc.t); bindTex(p, 'uBloom', 1, F.bloom[0].t); bindTex(p, 'uFront', 2, F.frontAcc.t);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return st;
}
window.renderFrame = function (fi) { renderGL(fi); return cv.toDataURL('image/png').slice(22); };

// ---------- законы читаемости (как в шоуриле)
function lumArr(rgba, n) { const L = new Float32Array(n); const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const T = new Float32Array(256); for (let i = 0; i < 256; i++) T[i] = lin(i);
  for (let i = 0; i < n; i++) L[i] = 0.2126 * T[rgba[i * 4]] + 0.7152 * T[rgba[i * 4 + 1]] + 0.0722 * T[rgba[i * 4 + 2]]; return L; }
function dilate(m, w, h, r) { const a = new Uint8Array(w * h), b = new Uint8Array(w * h);
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
  for (let j = 0; j < tw * th; j++) { const a = acc.subarray(j * 6, j * 6 + 6); if (a[5] < 8) continue; const ring = a[4] / a[5];
    for (const [s, c, need] of [[a[0], a[1], 3], [a[2], a[3], 4.5]]) { if (c < 12 * K * K) continue; tiles++;
      const lt = s / c, ratio = (Math.max(lt, ring) + 0.05) / (Math.min(lt, ring) + 0.05);
      if (ratio < need) fails.push({ x: (j % tw) * 48, y: Math.floor(j / tw) * 48, ratio: +ratio.toFixed(2), need }); } }
  return { t: +st.t.toFixed(3), type: st.type, flash: +st.flash.toFixed(2), mean: +mean.toFixed(4), tiles, fails };
};
window.markFrame = function (fails) { const c = document.createElement('canvas'); c.width = OW; c.height = OH; const x = c.getContext('2d'); x.drawImage(cv, 0, 0);
  x.strokeStyle = '#ff0000'; x.lineWidth = 3; for (const f of fails) x.strokeRect(f.x * K, f.y * K, 48 * K, 48 * K); return c.toDataURL('image/png').slice(22); };
window.textLog = function (fps) { const out = []; LOG.on = true;
  for (let f = 0; f < Math.round(DUR * fps); f++) { const st = state(f / fps); LOG.reg = []; LOG.glyphs = []; drawLayers(st);
    out.push({ t: +(f / fps).toFixed(4), flash: +st.flash.toFixed(2), black: st.black, fade: +st.fade.toFixed(2), reg: LOG.reg.map((r) => ({ ...r, a: +r.a.toFixed(2) })),
      glyphs: LOG.glyphs.filter((g) => g.a > 0.05).map((g) => ({ s: g.s, x0: Math.round(g.x0), y0: Math.round(g.y0), x1: Math.round(g.x1), y1: Math.round(g.y1) })) }); }
  LOG.on = false; return out; };
// все сцены компилируются заранее, чтобы первый кадр сцены не ждал
for (const ty of Object.keys(DEFS)) sceneProg(ty);
window.reelReady = document.fonts.ready.then(() => ({ frames: window.FRAMES, dur: DUR, size: `${OW}x${OH}`, ss: SS, sub: SUB, secs: secs.map((s) => `${s.type}@${s.t0.toFixed(2)}`).join(' '),
  bahn: document.fonts.check('700 40px Bahnschrift'), mono: document.fonts.check('16px "Cascadia Mono"') }));
