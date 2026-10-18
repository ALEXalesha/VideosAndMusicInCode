'use strict';
// Визуализация «Nocturne in D minor»: нотный стан сверху, падающие ноты и клавиатура снизу, свечение на GPU.
const Q = new URLSearchParams(location.search); const K = +(Q.get('k') || 1), FPS = +(Q.get('fps') || 60); const W = 1920, H = 1080, OW = W * K, OH = H * K; const S = window.SONG; const { BEAT, BAR } = S;
const FD = '"Bahnschrift", "Segoe UI", sans-serif', FM = '"Cascadia Mono", Consolas, monospace', FSYM = '"Segoe UI Symbol", "Segoe UI", serif';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)); const inv = (a, b, x) => clamp((x - a) / (b - a)); const lerp = (a, b, t) => a + (b - a) * t;
const eo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)); const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const COL = { rh: ['#ff7a45', '#ffc46b'], lh: ['#7d5cff', '#b9a4ff'], str: ['#2fd4ff', '#9ff0ff'], cello: ['#20e3b2', '#a6ffe6'], bass: ['#3a64ff', '#8fb0ff'], bell: ['#f2f6ff', '#ffffff'] };
const NAME = { rh: 'PIANO · MELODY', lh: 'PIANO · LEFT HAND', str: 'STRINGS', cello: 'CELLO', bass: 'BASS', bell: 'CELESTA' };

// ---------- клавиатура C1..C7
const LO = 24, HI = 96; const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);
const whites = []; for (let m = LO; m <= HI; m++) if (!isBlack(m)) whites.push(m);
const KW = W / whites.length, KTOP = 905, KH = 160, BKH = 98, BKW = KW * 0.6;
const keyX = {}; { let wi = 0; for (let m = LO; m <= HI; m++) { if (!isBlack(m)) { keyX[m] = [wi * KW, KW]; wi++; } else keyX[m] = [wi * KW - BKW / 2, BKW]; } }
const FALL_TOP = 430, SPEED = (KTOP - FALL_TOP) / 2.2; // px/с, 2,2 с упреждения

// ---------- нотный стан
const STAFF = { x0: 150, x1: 1860, play: 560, gap: 14, treb: 205, bass: 335 }; const PXS = SPEED; // та же скорость, что у падения
const SPELL = { 0: [0, ''], 1: [0, '♯'], 2: [1, ''], 3: [2, '♭'], 4: [2, ''], 5: [3, ''], 6: [3, '♯'], 7: [4, ''], 8: [5, '♭'], 9: [5, ''], 10: [6, '♭'], 11: [6, '♮'] };
function staffPos(m) { const [l, acc] = SPELL[m % 12]; const step = (Math.floor(m / 12) - 1) * 7 + l; const treble = m >= 60;
  const ref = treble ? 30 : 18, base = treble ? STAFF.treb + 2 * STAFF.gap : STAFF.bass + 2 * STAFF.gap; // нижняя линия: E4 / G2
  return { y: base - (step - ref) * STAFF.gap / 2, acc: acc === '♭' && l === 6 ? '' : acc, step, treble, ref }; } // B♭ уже в ключе

const cv2 = document.createElement('canvas'); cv2.width = OW; cv2.height = OH; const c = cv2.getContext('2d'); c.setTransform(K, 0, 0, K, 0, 0);
function font(size, weight = 600, fam = FD, sp = '0px') { c.font = `${weight} ${size}px ${fam}`; c.letterSpacing = sp; }
function rrect(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const sectionAt = (t) => { let s = S.sections[0]; for (const x of S.sections) if (t >= x.bar * BAR) s = x; return s; };
const chordAt = (t) => { let s = S.chords[0]; for (const x of S.chords) if (t >= x.t) s = x; return s; };
const drumEnv = (t, kind, k) => { let s = 0; for (const d of S.drums) if (d.k === kind && t >= d.t && t - d.t < 3) s += d.v * Math.exp(-(t - d.t) * k); return s; };

function draw(t) {
  const kick = drumEnv(t, 'kick', 7), boom = drumEnv(t, 'boom', 2.2), snare = drumEnv(t, 'snare', 12);
  // фон: тёмный градиент и медленные цветные туманности
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#07060d'); g.addColorStop(1, '#0c0a16'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const sec = sectionAt(t); const intensity = { PRELUDE: 0.25, THEME: 0.45, BRIDGE: 0.65, CRESCENDO: 0.85, APEX: 1, CODA: 0.4 }[sec.name];
  c.globalCompositeOperation = 'lighter';
  [[0.25, 0.55, '#ff5a36', 0.13], [0.75, 0.45, '#6b4bff', 0.15], [0.5, 0.75, '#1fb6ff', 0.1]].forEach(([fx, fy, col, a], i) => {
    const x = W * (fx + 0.08 * Math.sin(t * 0.13 + i * 2)), y = H * (fy + 0.06 * Math.cos(t * 0.11 + i)); const r = 700 + 120 * Math.sin(t * 0.2 + i);
    const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = a * (0.4 + intensity * 0.8) + kick * 0.04 + boom * 0.15; c.fillStyle = rg; c.fillRect(0, 0, W, H); });
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';

  // ---------- падающие ноты: линии долей и тактов
  c.save(); c.beginPath(); c.rect(0, FALL_TOP - 30, W, KTOP - FALL_TOP + 30); c.clip();
  const b0 = Math.floor(t / BEAT); for (let b = b0; b < b0 + 6; b++) { const y = KTOP - (b * BEAT - t) * SPEED; const bar = b % 4 === 0;
    c.fillStyle = bar ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.035)'; c.fillRect(0, y, W, bar ? 2 : 1);
    if (bar && b / 4 < S.bars) { font(15, 500, FM, '2px'); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillText(String(b / 4 + 1).padStart(2, '0'), 14, y - 6); } }
  // ноты: сначала тянущиеся (струнные, бас), сверху фортепиано
  const order = ['str', 'cello', 'bass', 'lh', 'bell', 'rh'];
  for (const inst of order) for (const nt of S.notes) { if (nt.i !== inst || nt.m < LO || nt.m > HI) continue;
    const yb = KTOP - (nt.t - t) * SPEED; const h = Math.max(6, nt.d * SPEED - 3); const yt = yb - h; if (yt > KTOP || yb < FALL_TOP - 40) continue;
    const [kx, kw] = keyX[nt.m]; const pad = inst === 'str' ? 1 : inst === 'bell' ? kw * 0.3 : 3; const x = kx + pad, w = kw - pad * 2;
    const on = t >= nt.t && t < nt.t + nt.d; const [c0, c1] = COL[inst];
    c.globalAlpha = (inst === 'str' ? 0.32 : inst === 'bass' ? 0.55 : 0.92) * (0.65 + 0.35 * nt.v / 0.85);
    const gr = c.createLinearGradient(0, yt, 0, yb); gr.addColorStop(0, c0); gr.addColorStop(1, c1); c.fillStyle = gr;
    rrect(x, yt, w, h, Math.min(8, w / 2)); c.fill();
    if (on) { c.globalAlpha = 0.9; c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); }
    c.globalAlpha = 0.5; c.fillStyle = '#fff'; c.fillRect(x + 3, yt + 3, Math.max(1, w * 0.18), Math.max(0, h - 6)); }
  c.globalAlpha = 1; c.restore();

  // ---------- клавиатура
  const active = {}; for (const nt of S.notes) if (t >= nt.t && t < nt.t + nt.d + 0.05) { const a = active[nt.m]; if (!a || order.indexOf(nt.i) > order.indexOf(a.i)) active[nt.m] = nt; }
  c.fillStyle = '#05050a'; c.fillRect(0, KTOP - 6, W, H - KTOP + 6);
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, KTOP - 6, W, 2);
  for (const pass of [0, 1]) for (let m = LO; m <= HI; m++) { if (isBlack(m) !== !!pass) continue; const [x, w] = keyX[m]; const nt = active[m];
    const hgt = pass ? BKH : KH; const press = nt ? 3 : 0;
    if (!pass) { const gw = c.createLinearGradient(0, KTOP, 0, KTOP + hgt); gw.addColorStop(0, nt ? COL[nt.i][1] : '#e9e6f2'); gw.addColorStop(1, nt ? COL[nt.i][0] : '#bdb8cc'); c.fillStyle = gw;
      rrect(x + 1.5, KTOP + press, w - 3, hgt - press, 5); c.fill(); }
    else { const gb = c.createLinearGradient(0, KTOP, 0, KTOP + hgt); gb.addColorStop(0, nt ? COL[nt.i][0] : '#26232f'); gb.addColorStop(1, nt ? COL[nt.i][1] : '#0d0c12'); c.fillStyle = gb;
      rrect(x, KTOP + press - 2, w, hgt, 4); c.fill(); }
    if (nt) { const age = t - nt.t; c.globalCompositeOperation = 'lighter'; // луч света над клавишей
      const bg = c.createLinearGradient(0, KTOP - 260, 0, KTOP); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, COL[nt.i][1]);
      c.globalAlpha = 0.35 * Math.exp(-age * 1.5) + 0.12; c.fillStyle = bg; c.fillRect(x - 6, KTOP - 260, w + 12, 260); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; } }
  font(13, 500, FM, '1px'); c.fillStyle = 'rgba(40,40,60,0.6)'; c.textAlign = 'center';
  for (let m = LO; m <= HI; m += 12) { const [x, w] = keyX[m]; c.fillText('C' + (m / 12 - 1), x + w / 2, KTOP + KH - 12); } c.textAlign = 'left';

  // ---------- искры от ударов по клавишам (аналитически, без состояния)
  c.globalCompositeOperation = 'lighter';
  for (const nt of S.notes) { const a = t - nt.t; if (a < 0 || a > 1.3 || nt.m < LO || nt.m > HI || nt.i === 'str' || nt.i === 'bass') continue;
    const r = rng(Math.floor(nt.t * 1000) * 131 + nt.m); const [kx, kw] = keyX[nt.m]; const cnt = Math.round(6 + nt.v * 14);
    for (let k = 0; k < cnt; k++) { const vx = (r() - 0.5) * 160, vy = -(120 + r() * 380) * nt.v, life = 0.5 + r() * 0.8; if (a > life) continue;
      const x = kx + kw / 2 + vx * a, y = KTOP - 4 + vy * a + 260 * a * a; const al = (1 - a / life);
      c.globalAlpha = al; c.fillStyle = k % 3 ? COL[nt.i][1] : '#ffffff'; c.beginPath(); c.arc(x, y, 1.2 + 2.2 * al * r(), 0, 7); c.fill(); }
    // вспышка-кольцо
    c.globalAlpha = Math.max(0, 0.6 - a * 2) * nt.v; c.strokeStyle = COL[nt.i][1]; c.lineWidth = 2; c.beginPath(); c.ellipse(kx + kw / 2, KTOP - 2, 6 + a * 90, 3 + a * 18, 0, 0, 7); c.stroke(); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';

  // ---------- нотный стан
  const sx0 = STAFF.x0, sx1 = STAFF.x1, P = STAFF.play, gap = STAFF.gap;
  c.fillStyle = 'rgba(6,5,12,0.55)'; rrect(sx0 - 40, 120, sx1 - sx0 + 80, 280, 18); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.2;
  for (const top of [STAFF.treb - 2 * gap, STAFF.bass - 2 * gap]) for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(sx0, top + i * gap); c.lineTo(sx1, top + i * gap); c.stroke(); }
  c.beginPath(); c.moveTo(sx0, STAFF.treb - 2 * gap); c.lineTo(sx0, STAFF.bass + 2 * gap); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.85)'; font(96, 400, FSYM); c.fillText('𝄞', sx0 + 8, STAFF.treb + 2 * gap + 18); font(62, 400, FSYM); c.fillText('𝄢', sx0 + 10, STAFF.bass + 14);
  font(34, 400, FSYM); c.fillText('♭', sx0 + 82, STAFF.treb + 6); c.fillText('♭', sx0 + 82, STAFF.bass + 2 * gap + 6); // B♭ в ключе
  font(26, 700, FD); c.fillText('4', sx0 + 110, STAFF.treb - 2); c.fillText('4', sx0 + 110, STAFF.treb + 26); c.fillText('4', sx0 + 110, STAFF.bass - 2); c.fillText('4', sx0 + 110, STAFF.bass + 26);
  c.save(); c.beginPath(); c.rect(sx0 + 140, 120, sx1 - sx0 - 140, 280); c.clip();
  // тактовые черты и аккорды
  for (let b = 0; b <= S.bars; b++) { const x = P + (b * BAR - t) * PXS; if (x < sx0 + 140 || x > sx1) continue;
    c.strokeStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.moveTo(x, STAFF.treb - 2 * gap); c.lineTo(x, STAFF.bass + 2 * gap); c.stroke();
    const ch = S.chords[b]; if (ch) { font(20, 600, FD, '1px'); c.fillStyle = t >= ch.t && t < ch.t + BAR ? '#ffc46b' : 'rgba(255,255,255,0.55)'; c.fillText(ch.name, x + 8, STAFF.treb - 2 * gap - 18); } }
  for (const nt of S.notes) { if (!['rh', 'lh', 'cello'].includes(nt.i)) continue; const x = P + (nt.t - t) * PXS; if (x < sx0 + 120 || x > sx1 + 20) continue;
    const va = nt.m > 83; const sp = staffPos(va ? nt.m - 12 : nt.m); const on = t >= nt.t && t < nt.t + nt.d; const past = nt.t + nt.d < t; const [c0, c1] = COL[nt.i];
    c.globalAlpha = past ? 0.35 : 1;
    c.fillStyle = c0; c.globalAlpha *= 0.35; c.fillRect(x, sp.y - 2, Math.max(4, nt.d * PXS - 10), 4); c.globalAlpha = past ? 0.35 : 1; // длительность
    // добавочные линейки
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.2; const lo = sp.ref, hi = sp.ref + 8;
    for (let s = sp.step <= lo - 2 ? lo - 2 : hi + 2; sp.step <= lo - 2 ? s >= sp.step : s <= sp.step; s += sp.step <= lo - 2 ? -2 : 2) {
      if (sp.step > lo - 2 && sp.step < hi + 2) break; const base = sp.treble ? STAFF.treb + 2 * gap : STAFF.bass + 2 * gap; const ly = base - (s - lo) * gap / 2; c.beginPath(); c.moveTo(x - 13, ly); c.lineTo(x + 13, ly); c.stroke(); }
    const sc = on ? 1.35 : 1; c.save(); c.translate(x, sp.y); c.rotate(-0.35); c.scale(sc, sc);
    c.fillStyle = on ? '#ffffff' : c1; c.beginPath(); c.ellipse(0, 0, 9, 6.3, 0, 0, 7); c.fill(); c.restore();
    if (nt.d < 4 * BEAT - 0.01) { c.strokeStyle = on ? '#fff' : c1; c.lineWidth = 1.6; c.beginPath(); const up = sp.y > (sp.treble ? STAFF.treb : STAFF.bass); c.moveTo(x + (up ? 8 : -8), sp.y); c.lineTo(x + (up ? 8 : -8), sp.y + (up ? -44 : 44)); c.stroke(); }
    if (va) { font(13, 600, FM, '1px'); c.fillStyle = c1; c.fillText('8va', x - 10, STAFF.treb - 2 * gap - 4); }
    if (sp.acc) { font(26, 400, FSYM); c.fillStyle = on ? '#fff' : c1; c.fillText(sp.acc, x - 30, sp.y + 9); }
    if (on) { c.globalCompositeOperation = 'lighter'; const rg = c.createRadialGradient(x, sp.y, 0, x, sp.y, 34); rg.addColorStop(0, c1); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.globalAlpha = 0.7; c.fillRect(x - 34, sp.y - 34, 68, 68); c.globalCompositeOperation = 'source-over'; } }
  c.globalAlpha = 1; c.restore();
  // линия воспроизведения
  const pg = c.createLinearGradient(0, 130, 0, 390); pg.addColorStop(0, 'rgba(255,196,107,0)'); pg.addColorStop(0.5, 'rgba(255,196,107,0.95)'); pg.addColorStop(1, 'rgba(255,196,107,0)');
  c.fillStyle = pg; c.fillRect(P - 1, 130, 2, 260);

  // ---------- шапка, аккорд, раздел, ход песни
  const ch = chordAt(t); const bar = Math.floor(t / BAR), beat = Math.floor((t % BAR) / BEAT);
  font(17, 500, FM, '4px'); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillText('NOCTURNE IN D MINOR  ·  COMPOSED & SYNTHESIZED IN CODE', 64, 70);
  c.textAlign = 'right'; c.fillText(`84 BPM  ·  ${S.key}  ·  BAR ${String(Math.min(bar + 1, S.bars)).padStart(2, '0')}.${beat + 1}`, W - 64, 70); c.textAlign = 'left';
  const secA = inv(sec.bar * BAR, sec.bar * BAR + 0.6, t); font(15, 600, FM, '8px'); c.fillStyle = '#ffc46b'; c.globalAlpha = eo(secA);
  c.fillText(`${String(S.sections.indexOf(sec) + 1).padStart(2, '0')}  ${sec.name}`, 64 + (1 - eo(secA)) * -30, 104); c.globalAlpha = 1;
  // крупный аккорд справа над падающими нотами
  const ca = inv(ch.t, ch.t + 0.25, t); font(64, 700, FD, '2px'); c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,0.88)'; c.globalAlpha = eo(ca);
  c.fillText(ch.name, W - 64, FALL_TOP + 70 - (1 - eo(ca)) * 20); font(14, 500, FM, '4px'); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillText('CHORD', W - 64, FALL_TOP + 2); c.textAlign = 'left'; c.globalAlpha = 1;
  // легенда инструментов: только звучащие сейчас
  font(13, 500, FM, '3px'); let ly = FALL_TOP + 2; for (const inst of ['rh', 'lh', 'str', 'cello', 'bass', 'bell']) { const live = S.notes.some((n) => n.i === inst && t >= n.t && t < n.t + n.d);
    c.globalAlpha = live ? 0.9 : 0.25; c.fillStyle = COL[inst][0]; c.fillRect(64, ly - 10, 18, 10); c.fillStyle = '#fff'; c.fillText(NAME[inst], 92, ly); ly += 22; } c.globalAlpha = 1;
  // ударные: кольцо от большого барабана и вспышка от малого
  if (boom > 0.02) { c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ffc46b'; for (const d of S.drums) if (d.k === 'boom' && t >= d.t && t - d.t < 2) { const a = t - d.t;
      c.globalAlpha = (1 - a / 2) * 0.6; c.lineWidth = 3; c.beginPath(); c.ellipse(W / 2, KTOP, 100 + a * 1100, 30 + a * 250, 0, 0, 7); c.stroke(); } c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
  if (snare > 0.02) { c.globalCompositeOperation = 'lighter'; c.fillStyle = '#9ff0ff'; c.globalAlpha = snare * 0.25; c.fillRect(0, KTOP - 8, W, 3); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
  // полоса хода
  c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, H - 4, W, 4); c.fillStyle = '#ffc46b'; c.fillRect(0, H - 4, W * clamp(t / S.DUR), 4);
  // заставка и титры
  const titleA = 1 - inv(2.2, 3.2, t), endA = inv(S.DUR - 5, S.DUR - 3.8, t);
  for (const [a, sub] of [[titleA, 'COMPOSED, PERFORMED & SYNTHESIZED ENTIRELY IN CODE'], [endA, 'CLAUDE  ·  2026  ·  NO SAMPLES, NO RECORDINGS']]) { if (a <= 0) continue;
    c.fillStyle = `rgba(4,3,10,${0.82 * a})`; c.fillRect(0, 0, W, H); c.globalAlpha = a; c.textAlign = 'center';
    font(96, 300, FD, `${lerp(40, 14, eo(inv(0, 1.5, t > 50 ? t - S.DUR + 5 : t)))}px`); c.fillStyle = '#fff'; c.fillText('NOCTURNE', W / 2, H / 2 - 10);
    font(30, 500, FM, '14px'); c.fillStyle = '#ffc46b'; c.fillText('IN  D  MINOR', W / 2, H / 2 + 50);
    font(16, 500, FM, '5px'); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText(sub, W / 2, H / 2 + 110); c.textAlign = 'left'; c.globalAlpha = 1; }
  c.fillStyle = '#000'; c.globalAlpha = inv(S.DUR - 1.2, S.DUR, t) + (1 - inv(0, 0.8, t)); c.fillRect(0, 0, W, H); c.globalAlpha = 1;
}

// ---------- свечение на GPU
const cv = document.getElementById('gl'); cv.width = OW; cv.height = OH; const gl = cv.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
gl.getExtension('EXT_color_buffer_float'); gl.getExtension('OES_texture_float_linear');
const VS = `#version 300 es
void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position=vec4(p*2.-1.,0.,1.); }`;
const FS = {
  pre: `#version 300 es
precision highp float; uniform sampler2D T; uniform vec2 R; out vec4 o;
void main(){ vec2 uv=gl_FragCoord.xy/R; vec3 c=pow(texture(T,uv).rgb,vec3(2.2)); float b=max(c.r,max(c.g,c.b)); o=vec4(c*smoothstep(0.35,0.9,b),1.); }`,
  down: `#version 300 es
precision highp float; uniform sampler2D T; uniform vec2 R; out vec4 o;
void main(){ vec2 uv=gl_FragCoord.xy/R, px=1./R; o=vec4((texture(T,uv+px*vec2(-1,-1)).rgb+texture(T,uv+px*vec2(1,-1)).rgb+texture(T,uv+px*vec2(-1,1)).rgb+texture(T,uv+px*vec2(1,1)).rgb)*0.25,1.); }`,
  up: `#version 300 es
precision highp float; uniform sampler2D T; uniform vec2 R, Sz; out vec4 o;
void main(){ vec2 uv=gl_FragCoord.xy/R, px=1./Sz; vec3 c=texture(T,uv).rgb*4.;
  c+=(texture(T,uv+vec2(px.x,0)).rgb+texture(T,uv-vec2(px.x,0)).rgb+texture(T,uv+vec2(0,px.y)).rgb+texture(T,uv-vec2(0,px.y)).rgb)*2.;
  c+=texture(T,uv+px).rgb+texture(T,uv-px).rgb+texture(T,uv+vec2(px.x,-px.y)).rgb+texture(T,uv+vec2(-px.x,px.y)).rgb; o=vec4(c/16.,1.); }`,
  fin: `#version 300 es
precision highp float; uniform sampler2D T, B; uniform vec2 R; uniform float K, Tm; out vec4 o;
void main(){ vec2 uv=gl_FragCoord.xy/R; vec3 c=pow(texture(T,uv).rgb,vec3(2.2)); c+=texture(B,uv).rgb*K;
  c=c/(1.+c*0.15); c=pow(c,vec3(1./2.2)); vec2 d=uv-.5; c*=1.-dot(d,d)*0.5;
  float g=fract(sin(dot(gl_FragCoord.xy+fract(Tm*7.13)*917.,vec2(12.9898,78.233)))*43758.5453); c+=(g-.5)*0.02; o=vec4(clamp(c,0.,1.),1.); }` };
function prog(fs) { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p, sh); } gl.linkProgram(p); return p; }
const PR = Object.fromEntries(Object.entries(FS).map(([k, v]) => [k, prog(v)]));
function tex(w, h, hdr) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, hdr ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; }
const lv = []; for (let i = 0, w = OW / 2, h = OH / 2; i < 6; i++, w >>= 1, h >>= 1) { const t = tex(w, h, true); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); lv.push({ t, f, w, h }); }
const src = tex(OW, OH, false); const vao = gl.createVertexArray();
function pass(p, fb, w, h, texs, u = {}) { gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h); gl.useProgram(p); gl.bindVertexArray(vao);
  Object.entries(texs).forEach(([n, t], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(gl.getUniformLocation(p, n), i); });
  gl.uniform2f(gl.getUniformLocation(p, 'R'), w, h); for (const [k, v] of Object.entries(u)) Array.isArray(v) ? gl.uniform2f(gl.getUniformLocation(p, k), ...v) : gl.uniform1f(gl.getUniformLocation(p, k), v);
  gl.drawArrays(gl.TRIANGLES, 0, 3); }
window.renderFrame = function (fi) { const t = fi / FPS; draw(t);
  gl.bindTexture(gl.TEXTURE_2D, src); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv2); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.disable(gl.BLEND); pass(PR.pre, lv[0].f, lv[0].w, lv[0].h, { T: src });
  for (let i = 1; i < 6; i++) pass(PR.down, lv[i].f, lv[i].w, lv[i].h, { T: lv[i - 1].t });
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); for (let i = 4; i >= 0; i--) pass(PR.up, lv[i].f, lv[i].w, lv[i].h, { T: lv[i + 1].t }, { Sz: [lv[i + 1].w, lv[i + 1].h] }); gl.disable(gl.BLEND);
  pass(PR.fin, null, OW, OH, { T: src, B: lv[0].t }, { K: 0.35, Tm: t });
  return cv.toDataURL('image/png').slice(22); };
window.frames = Math.ceil(S.DUR * FPS);
window.vizReady = document.fonts.ready.then(() => ({ frames: window.frames, sym: document.fonts.check('40px "Segoe UI Symbol"') }));
