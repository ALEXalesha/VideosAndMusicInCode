// Музыка к шоурилу 2:00: синтез с нуля, без сэмплов. 48 кГц, стерео, 128 BPM, ля минор. node synth.cjs
'use strict';
const fs = require('fs');
globalThis.CUT = +(process.argv[2] || 120);
eval(fs.readFileSync(__dirname + '/timeline.js', 'utf8'));
const TL = globalThis.TL;
const { BEAT, BAR, DUR } = globalThis.TL;
const SR = 48000, N = Math.round(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);
const revL = new Float32Array(N), revR = new Float32Array(N); // посыл в ревербератор
const dlyL = new Float32Array(N), dlyR = new Float32Array(N); // посыл в пинг-понг задержку
const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const noise = () => rnd() * 2 - 1;

function add(i, l, r, rv = 0, dl = 0) {
  if (i < 0 || i >= N) return;
  L[i] += l; R[i] += r; revL[i] += l * rv; revR[i] += r * rv; dlyL[i] += l * dl; dlyR[i] += r * dl;
}
// Простой биквад (RBJ)
function biquad(type, f, q) {
  const w = TAU * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  else { b0 = a; b1 = 0; b2 = -a; } // bp
  a0 = 1 + a; a1 = -2 * c; a2 = 1 - a;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}
function filt() { let x1 = 0, x2 = 0, y1 = 0, y2 = 0, k = null;
  return { set(type, f, q) { k = biquad(type, f, q); },
    run(x) { const y = k.b0 * x + k.b1 * x1 + k.b2 * x2 - k.a1 * y1 - k.a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; } }; }
// пила с polyBLEP
function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
function sawOsc() { let ph = Math.random(); return (f) => { const dt = f / SR; ph += dt; if (ph >= 1) ph -= 1; return 2 * ph - 1 - blep(ph, dt); }; }
const S = (t) => Math.round(t * SR);
const pan = (x, p) => [x * Math.cos((p + 1) * Math.PI / 4), x * Math.sin((p + 1) * Math.PI / 4)];

// ---------- ударные
function kick(t0, vol = 1) {
  let ph = 0; const n = S(0.5);
  for (let i = 0; i < n; i++) { const t = i / SR;
    const f = 45 + 120 * Math.exp(-t * 35) + 20 * Math.exp(-t * 8);
    ph += f / SR; let x = Math.sin(TAU * ph) * Math.exp(-t * 6.5);
    x += noise() * Math.exp(-t * 300) * 0.35; // щелчок
    x = Math.tanh(x * 1.6) * vol * 0.9;
    add(S(t0) + i, x, x);
  }
}
function clap(t0, vol = 1) {
  const f = filt(); f.set('bp', 1500, 0.9); const n = S(0.45);
  for (let i = 0; i < n; i++) { const t = i / SR;
    let env = 0; for (const d of [0, 0.011, 0.022]) if (t >= d) env = Math.max(env, Math.exp(-(t - d) * (d < 0.02 ? 90 : 14)));
    const x = f.run(noise()) * env * vol * 1.6;
    add(S(t0) + i, x * 0.9, x, 0.35);
  }
}
function snare(t0, vol = 1, pitch = 1) {
  const f = filt(); f.set('hp', 900 * pitch, 0.7); const n = S(0.2); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += 190 * pitch / SR;
    const x = (f.run(noise()) * 0.8 + Math.sin(TAU * ph) * 0.5) * Math.exp(-t * 22) * vol;
    add(S(t0) + i, x, x, 0.25);
  }
}
function hat(t0, open = false, vol = 1, p = 0) {
  const f = filt(); f.set('hp', 7500, 0.8); const n = S(open ? 0.3 : 0.06);
  for (let i = 0; i < n; i++) { const t = i / SR;
    const x = f.run(noise()) * Math.exp(-t * (open ? 14 : 70)) * vol * 0.32;
    const [l, r] = pan(x, p); add(S(t0) + i, l, r, 0.1);
  }
}
function crash(t0, vol = 1) {
  const f = filt(); f.set('hp', 4500, 0.6); const n = S(2.4);
  const parts = [3127, 4209, 5333, 6611, 7817]; const ph = parts.map(() => Math.random());
  for (let i = 0; i < n; i++) { const t = i / SR;
    let m = 0; for (let k = 0; k < parts.length; k++) { ph[k] += parts[k] / SR; m += Math.sin(TAU * ph[k]); }
    const x = (f.run(noise()) + m * 0.05) * Math.exp(-t * 2.2) * vol * 0.28;
    add(S(t0) + i, x * (0.9 + 0.1 * Math.sin(t * 9)), x * (0.9 + 0.1 * Math.cos(t * 7)), 0.4);
  }
}
function impact(t0, vol = 1) { // низкий удар + шумовой всплеск
  let ph = 0; const f = filt(); f.set('lp', 1200, 0.7); const n = S(2.2);
  for (let i = 0; i < n; i++) { const t = i / SR;
    ph += (32 + 60 * Math.exp(-t * 6)) / SR;
    const x = Math.sin(TAU * ph) * Math.exp(-t * 1.6) * 0.9 + f.run(noise()) * Math.exp(-t * 9) * 0.5;
    add(S(t0) + i, x * vol, x * vol, 0.5);
  }
}
function revCymbal(tEnd, len = 1.6, vol = 0.6) { // нарастающий «обратный» шум к удару
  const f = filt(); const n = S(len), s0 = S(tEnd - len);
  for (let i = 0; i < n; i++) { const p = i / n; f.set('hp', 2000 + 6000 * p, 0.7);
    const x = f.run(noise()) * Math.pow(p, 3) * vol;
    add(s0 + i, x, x * 0.95, 0.3);
  }
}
function riser(t0, t1, vol = 0.5) { // шумовой свип + растущая пила
  const f = filt(); const n = S(t1 - t0); const o1 = sawOsc(), o2 = sawOsc();
  for (let i = 0; i < n; i++) { const p = i / n; f.set('bp', 400 * Math.pow(25, p), 1.5);
    const fr = mtof(45 + 36 * p * p);
    const x = (f.run(noise()) * 0.9 + (o1(fr) + o2(fr * 1.006)) * 0.08) * p * p * vol;
    const [l, r] = pan(x, Math.sin(p * 20) * 0.5); add(S(t0) + i, l, r, 0.4);
  }
}
function tick(t0, vol = 0.2, f0 = 3000) { const n = S(0.012);
  for (let i = 0; i < n; i++) { const t = i / SR; const x = Math.sin(TAU * f0 * t) * Math.exp(-t * 500) * vol; add(S(t0) + i, x, x, 0.1); } }
function blip(t0, m, vol = 0.3, len = 0.12, p = 0) { let ph = 0; const n = S(len);
  for (let i = 0; i < n; i++) { const t = i / SR; ph += mtof(m) / SR;
    const x = (Math.sin(TAU * ph) + 0.3 * Math.sin(TAU * ph * 3)) * Math.exp(-t * 30) * vol; const [l, r] = pan(x, p); add(S(t0) + i, l, r, 0.3, 0.3); } }
function whoosh(t0, len = 0.35, vol = 0.4, up = true) { const f = filt(); const n = S(len);
  for (let i = 0; i < n; i++) { const p = i / n; f.set('bp', up ? 300 * Math.pow(20, p) : 6000 * Math.pow(0.05, p), 2);
    const x = f.run(noise()) * Math.sin(Math.PI * p) * vol; const [l, r] = pan(x, (p - 0.5) * 1.6); add(S(t0) + i, l, r, 0.2); } }

// ---------- тональные
const CH = { Am: [57, 60, 64, 69, 71], F: [53, 57, 60, 65, 69], C: [55, 60, 64, 67, 72], G: [55, 59, 62, 67, 71] };
const ROOT = { Am: 33, F: 29, C: 36, G: 31 };
const bars = ['Am', 'Am', 'F', 'C', 'G', 'Am', 'F', 'Am']; // аккорд на каждый такт
function supersaw(t0, len, notes, vol, cutA, cutB, rv = 0.35, attack = 0.005) {
  const n = S(len + 0.4); const voices = [];
  for (const m of notes) for (let k = 0; k < 5; k++) voices.push({ o: sawOsc(), f: mtof(m) * Math.pow(2, (k - 2) * 0.09 / 12), p: (k - 2) / 2 });
  const fl = filt(), fr = filt();
  for (let i = 0; i < n; i++) { const t = i / SR; if (i % 32 === 0) { const c = cutB + (cutA - cutB) * Math.exp(-t * 6); fl.set('lp', c, 0.8); fr.set('lp', c, 0.8); }
    const env = Math.min(1, t / attack) * (t < len ? 1 : Math.exp(-(t - len) * 12));
    let l = 0, r = 0; for (const v of voices) { const x = v.o(v.f); l += x * (0.6 - v.p * 0.4); r += x * (0.6 + v.p * 0.4); }
    const k = env * vol / voices.length * 3; add(S(t0) + i, fl.run(l) * k, fr.run(r) * k, rv, 0.15);
  }
}
function bass(t0, len, m, vol = 0.5, grit = 0) {
  let ph = 0; const o = sawOsc(); const f = filt(); const n = S(len + 0.05);
  for (let i = 0; i < n; i++) { const t = i / SR; if (i % 32 === 0) f.set('lp', 180 + 900 * Math.exp(-t * 18) + grit * 600, 0.9);
    ph += mtof(m) / SR; const env = Math.min(1, t / 0.004) * (t < len ? 1 : Math.exp(-(t - len) * 60));
    let x = Math.sin(TAU * ph) * 0.8 + f.run(o(mtof(m + 12))) * (0.35 + grit * 0.4);
    if (grit) x = Math.tanh(x * (1 + grit * 2));
    add(S(t0) + i, x * env * vol, x * env * vol);
  }
}
function pluck(t0, m, vol = 0.18, p = 0, dl = 0.35) {
  const o = sawOsc(); const f = filt(); const n = S(0.35);
  for (let i = 0; i < n; i++) { const t = i / SR; if (i % 16 === 0) f.set('lp', 300 + 5000 * Math.exp(-t * 25), 1.2);
    const x = f.run(o(mtof(m))) * Math.exp(-t * 9) * vol; const [l, r] = pan(x, p); add(S(t0) + i, l, r, 0.25, dl); }
}
function lead(t0, len, m, vol = 0.22, glideFrom = null) {
  const o1 = sawOsc(), o2 = sawOsc(); const f = filt(); const n = S(len + 0.15); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR;
    let mm = m; if (glideFrom !== null) mm = m + (glideFrom - m) * Math.exp(-t * 40);
    const vib = t > 0.15 ? Math.sin(TAU * 5.5 * t) * 0.18 * Math.min(1, (t - 0.15) * 4) : 0;
    const fr = mtof(mm + vib); ph += fr / SR;
    if (i % 32 === 0) f.set('lp', 1500 + 4000 * Math.exp(-t * 6), 1.4);
    const env = Math.min(1, t / 0.01) * (t < len ? 1 : Math.exp(-(t - len) * 25));
    const x = f.run(o1(fr) * 0.5 + o2(fr * 1.005) * 0.5 + (Math.sin(TAU * ph) > 0 ? 0.25 : -0.25)) * env * vol;
    add(S(t0) + i, x * 0.95, x, 0.3, 0.3);
  }
}
function pad(t0, len, notes, vol, cut0, cut1) { // мягкая подложка с открывающимся фильтром
  const voices = notes.map((m) => [sawOsc(), sawOsc(), mtof(m)]); const fl = filt(), fr = filt(); const n = S(len);
  for (let i = 0; i < n; i++) { const p = i / n; if (i % 64 === 0) { const c = cut0 * Math.pow(cut1 / cut0, p * p); fl.set('lp', c, 0.7); fr.set('lp', c, 0.7); }
    const env = Math.min(1, i / S(0.3)) * Math.min(1, (n - i) / S(0.05));
    let l = 0, r = 0; for (const [a, b, f] of voices) { l += a(f * 0.998); r += b(f * 1.002); }
    add(S(t0) + i, fl.run(l) * env * vol / voices.length, fr.run(r) * env * vol / voices.length, 0.5);
  }
}

// ---------- аранжировка по сценам (продолжение synth.cjs: инструменты выше)
const CH2 = { ...CH, Em: [52, 55, 59, 64, 67] }; const ROOT2 = { ...ROOT, Em: 28 };
function bell(t0, m, vol = 0.12, p = 0, len = 1.4) { const n = S(len), f = mtof(m);
  for (let i = 0; i < n; i++) { const t = i / SR; const mod = Math.sin(TAU * f * 3.5 * t) * 2.4 * Math.exp(-t * 5);
    const x = (Math.sin(TAU * f * t + mod) * Math.exp(-t * 2.8) + Math.sin(TAU * f * 2 * t) * 0.2 * Math.exp(-t * 6)) * vol;
    const [l, r] = pan(x, p); add(S(t0) + i, l, r, 0.55, 0.35); } }
function wob(t0, len, m, rate, vol = 0.42) { const o = sawOsc(), o2 = sawOsc(); const f = filt(); let ph = 0; const n = S(len + 0.03);
  for (let i = 0; i < n; i++) { const t = i / SR; if (i % 32 === 0) f.set('lp', 160 + 2200 * (0.5 - 0.5 * Math.cos(TAU * rate * t)), 4);
    ph += mtof(m) / SR; const env = Math.min(1, t / 0.004) * (t < len ? 1 : Math.exp(-(t - len) * 80));
    let x = Math.sin(TAU * ph) * 0.6 + f.run(o(mtof(m)) + o2(mtof(m) * 1.008)) * 0.45; x = Math.tanh(x * 1.6) * env * vol; add(S(t0) + i, x, x); } }
function hats16(t0, beats, vol = 1) { for (let b = 0; b < beats; b++) { const t = t0 + b * BEAT;
  for (let s = 0; s < 4; s++) hat(t + s * BEAT / 4, false, (s === 2 ? 0.5 : 0.28) * vol, s % 2 ? 0.4 : -0.4); hat(t + BEAT / 2, true, 0.33 * vol, 0.2); } }
function bassLine(t0, bars, prog, grit, octave = false) { for (let bar = 0; bar < bars; bar++) { const ch = prog[bar % prog.length];
  for (let e = 0; e < 8; e++) { const t = t0 + bar * BAR + e * BEAT / 2; if (!octave && e % 2 === 0) continue;
    bass(t, BEAT / 2 * 0.85, ROOT2[ch] + (octave ? (e % 2 ? 12 : 0) : (e === 7 ? 12 : 0)), octave ? 0.42 : 0.5, grit); } } }
function stabs(t0, bars, prog, vol = 0.2, cutA = 4500) { for (let bar = 0; bar < bars; bar++) { const ch = CH2[prog[bar % prog.length]];
  for (let k = 0; k < 4; k++) supersaw(t0 + bar * BAR + k * BEAT + BEAT / 2, BEAT * 0.38, ch.slice(0, 4), vol, cutA, 900); } }
function arp(t0, bars, prog, vol = 0.11, pat = [0, 2, 3, 4, 3, 2, 1, 2], oct = 12, dl = 0.35) { for (let bar = 0; bar < bars; bar++) { const ch = CH2[prog[bar % prog.length]];
  for (let s = 0; s < 16; s++) pluck(t0 + bar * BAR + s * BEAT / 4, ch[pat[s % pat.length]] + oct, vol, s % 2 ? 0.55 : -0.55, dl); } }
function melody(t0, mel, vol = 0.2) { let prev = null; for (const [b0, d, m] of mel) { lead(t0 + b0 * BEAT, d * BEAT * 0.92, m, vol, prev); prev = m; } }
const MEL_DROP = [[0, 0.5, 81], [0.75, 0.25, 79], [1, 0.5, 76], [1.5, 0.5, 74], [2, 0.75, 76], [3, 0.5, 72], [3.5, 0.5, 74],
  [4, 0.5, 77], [4.5, 0.5, 76], [5, 0.5, 72], [5.5, 0.5, 69], [6, 0.5, 72], [6.5, 0.25, 74], [6.75, 1.25, 76],
  [8, 0.5, 79], [8.5, 0.5, 76], [9, 0.5, 72], [9.5, 0.5, 76], [10, 0.75, 79], [11, 0.5, 84], [11.5, 0.5, 83],
  [12, 0.5, 81], [12.5, 0.5, 79], [13, 0.75, 74], [14, 0.5, 79], [14.5, 0.5, 81], [15, 1, 83]];
const MEL_CITY = [[0, 0.5, 84], [0.5, 0.5, 81], [1, 0.5, 77], [1.5, 0.5, 81], [2, 1, 84], [3, 0.5, 86], [3.5, 0.5, 84],
  [4, 0.5, 83], [4.5, 0.5, 79], [5, 0.5, 74], [5.5, 0.5, 79], [6, 1, 83], [7, 0.5, 86], [7.5, 0.5, 88],
  [8, 0.75, 88], [8.75, 0.25, 86], [9, 0.5, 83], [9.5, 0.5, 79], [10, 1, 83], [11, 0.5, 79], [11.5, 0.5, 76],
  [12, 0.5, 81], [12.5, 0.5, 84], [13, 0.5, 88], [13.5, 0.5, 86], [14, 2, 81]];
const cutMel = (mel, beats) => mel.filter(([b]) => b < beats).map(([b, d, m]) => [b, Math.min(d, beats - b), m]);

const P4 = (a, b, c, d) => [a, b, c, d];
for (const s of TL.secs) {
  const t0 = s.t0, nb = s.bars * 4, bars = s.bars, end = t0 + s.len;
  if (s.type === 'intro') { // 5 тактов кода, 2 такта печати фигуры, такт отсчёта
    const cb = end - BAR, pr = t0 + 5 * BAR;
    pad(t0, 5 * BAR, [45, 52, 57, 60], 0.22, 160, 900);
    for (let i = 0; i < 330; i++) { const tt = t0 + 0.45 + (5 * BAR - 0.9) * i / 330 + rnd() * 0.01; tick(tt, 0.03 + 0.02 * rnd(), 2600 + 2400 * rnd()); }
    for (let b = 1; b < 5; b++) bass(t0 + b * BAR, BAR * 0.98, 33, 0.18 + 0.03 * b, 0);
    for (let b = 2; b < 5; b++) { bell(t0 + b * BAR, 76, 0.05, -0.4, 2.2); bell(t0 + b * BAR + 2 * BEAT, 72, 0.04, 0.4, 2.2); }
    pad(pr, 2 * BAR, CH2.F, 0.3, 300, 3500);
    arp(pr, 1, ['F'], 0.06, [0, 2, 3, 4], 12, 0.4); arp(pr + BAR, 1, ['G'], 0.08, [0, 2, 3, 4, 3, 2, 1, 2], 12, 0.4);
    for (let i = 0; i < 16; i++) hat(pr + BAR + i * BEAT / 4, false, 0.05 + 0.15 * i / 16, i % 2 ? 0.4 : -0.4);
    pad(cb, BAR, CH2.Am, 0.3, 400, 5000);
    for (let i = 0; i < 16; i++) tick(cb + i * BEAT / 4, 0.05 + 0.1 * i / 16, i % 4 === 0 ? 2400 : 3200);
    TL.count.forEach((t, k) => { blip(t, 76 + k * 2, 0.35, 0.18); tick(t, 0.3, 1800); });
    riser(cb - BAR, end, 0.45); revCymbal(end, 1.4, 0.55);
  }
  if (s.type === 'hero') { const prog = P4('Am', 'F', 'C', 'G');
    hats16(t0, nb); bassLine(t0, bars, prog, 0.25); stabs(t0, bars, prog, 0.22); arp(t0, bars, prog, 0.12);
    whoosh(t0 + 2 * BAR - 0.3, 0.32, 0.45, true); revCymbal(end, 0.8, 0.35); }
  if (s.type === 'type') { const prog = P4('C', 'G', 'Am', 'F');
    hats16(t0, nb, 0.8); bassLine(t0, bars, prog, 0.2);
    for (let b = 0; b < bars; b++) { supersaw(t0 + b * BAR, BAR, CH2[prog[b]].slice(0, 4), 0.15, 1800, 1200, 0.45, 0.02);
      for (let x = 0; x < 16; x++) pluck(t0 + b * BAR + x * BEAT / 4, CH2[prog[b]][x % 4] + 12, 0.1, x % 2 ? 0.6 : -0.6, 0.45); }
    TL.words.filter((t) => t >= t0 && t < end).forEach((t, k) => { blip(t, [84, 79, 88, 81][k % 4], 0.25, 0.1, k % 2 ? 0.6 : -0.6); whoosh(t - 0.14, 0.2, 0.35, true);
      for (let j = 0; j < 4; j++) tick(t + 0.06 + j * 0.03, 0.08, 5000 - j * 600); });
    revCymbal(end, 1.0, 0.4); }
  if (s.type === 'fractal') { const prog = P4('F', 'G', 'Em', 'Am');
    for (let b = 0; b < bars; b++) { const ch = CH2[prog[b]]; const tb = t0 + b * BAR;
      pad(tb, BAR, ch.slice(0, 4).map((m) => m - 12).concat([ch[4]]), 0.3, 500, 1800);
      bass(tb, BAR * 0.95, ROOT2[prog[b]], 0.45, 0);
      arp(tb, 1, [prog[b]], 0.07, [0, 4, 2, 4, 1, 4, 3, 4], 24, 0.5);
      bell(tb, ch[4] + 12, 0.1, -0.4); bell(tb + 2 * BEAT, ch[3] + 12, 0.08, 0.4); bell(tb + 3.5 * BEAT, ch[2] + 24, 0.05, 0);
      for (let e = 0; e < 8; e++) hat(tb + e * BEAT / 2, e % 2 === 1, e % 2 ? 0.2 : 0.14, e % 2 ? 0.3 : -0.3); } }
  if (s.type === 'hole') { const prog = P4('Am', 'F', 'Em', 'G'); // темнее: низкая подложка, медленный вой, колокола выше
    for (let b = 0; b < bars; b++) { const ch = CH2[prog[b]]; const tb = t0 + b * BAR;
      pad(tb, BAR, ch.slice(0, 3).map((m) => m - 12), 0.34, 250, 1200);
      wob(tb, BAR * 0.97, ROOT2[prog[b]], 0.5, 0.32);
      bell(tb + BEAT, ch[4] + 24, 0.05, -0.5, 2.0); bell(tb + 2.5 * BEAT, ch[2] + 24, 0.045, 0.5, 2.0);
      for (let e = 0; e < 16; e++) hat(tb + e * BEAT / 4, false, e % 4 === 2 ? 0.16 : 0.08, e % 2 ? 0.5 : -0.5); }
    riser(end - BAR, end, 0.3); revCymbal(end, 1.0, 0.45); }
  if (s.type === 'terrain') { const prog = P4('F', 'G', 'Am', 'G');
    bassLine(t0, bars, prog, 0.15, true);
    for (let b = 0; b < bars; b++) { const ch = CH2[prog[b]];
      for (let x = 0; x < 16; x++) supersaw(t0 + b * BAR + x * BEAT / 4, BEAT / 4 * 0.6, ch.slice(0, 4), 0.11, 3200, 1600, 0.5);
      pad(t0 + b * BAR, BAR, ch.slice(0, 3).map((m) => m + 12), 0.2, 1200, 3000);
      for (const k of [1, 3]) snare(t0 + b * BAR + k * BEAT, 0.55, 0.9); }
    for (let b = 0; b < nb; b++) hat(t0 + b * BEAT + BEAT / 2, true, 0.3, 0.2); }
  if (s.type === 'city') { const prog = P4('F', 'G', 'Em', 'Am');
    hats16(t0, nb, 1.1); bassLine(t0, bars, prog, 0.6); stabs(t0, bars, prog, 0.2, 6500);
    melody(t0, cutMel(MEL_CITY, nb), 0.19); arp(t0, bars, prog, 0.09, [0, 4, 2, 4, 1, 4, 3, 4], 24, 0.4);
    for (let b = 1; b < bars; b++) crash(t0 + b * BAR, 0.3); revCymbal(end, 1.4, 0.4); }
  if (s.type === 'prism') { const prog = P4('F', 'G', 'Em', 'Am'); // тишина: без ударных
    for (let b = 0; b < bars; b++) { const ch = CH2[prog[b]]; const tb = t0 + b * BAR;
      pad(tb, BAR, ch.slice(0, 4), 0.28, 900, 2200);
      for (let x = 0; x < 16; x++) bell(tb + x * BEAT / 4, ch[[0, 2, 4, 3, 1, 3, 4, 2][x % 8]] + 12 + (x >= 8 ? 12 : 0), 0.04 + 0.02 * (x % 4 === 0), Math.sin(x * 0.9) * 0.7, 0.9);
      bass(tb, BAR * 0.98, ROOT2[prog[b]], 0.16, 0); } }
  if (s.type === 'liquid') { const prog = P4('F', 'C', 'G', 'Am');
    const MEL = [[0, 1.5, 76], [1.5, 0.5, 74], [2, 2, 72], [4, 1.5, 79], [5.5, 0.5, 76], [6, 2, 74], [8, 1, 81], [9, 1, 79], [10, 2, 76], [12, 1.5, 74], [13.5, 0.5, 76], [14, 2, 69]];
    for (let b = 0; b < bars; b++) { const ch = CH2[prog[b]]; const tb = t0 + b * BAR;
      pad(tb, BAR, ch.slice(0, 4), 0.25, 700, 1600); bass(tb, BAR * 0.98, ROOT2[prog[b]], 0.2, 0);
      arp(tb, 1, [prog[b]], 0.045, [0, 2, 4, 2], 12, 0.55); }
    melody(t0, MEL, 0.11);
    for (let b = 8; b < nb; b++) hat(t0 + b * BEAT + BEAT / 2, false, 0.08 + 0.1 * (b - 8) / 8, 0.3);
    riser(end - BAR, end, 0.25); }
  if (s.type === 'tunnel') { const bb = end - BAR; const prog = P4('Am', 'F', 'G', 'G');
    hats16(t0, 12, 0.9); bassLine(t0, 3, prog, 0.4);
    for (let b = 0; b < 3; b++) { arp(t0 + b * BAR, 1, [prog[b]], 0.08 + 0.02 * b, [0, 2, 4, 2], 12 + (b === 2 ? 12 : 0)); supersaw(t0 + b * BAR, BAR, CH2[prog[b]].slice(0, 4), 0.09, 600 + 900 * b, 400 + 600 * b, 0.4, 0.3); }
    pad(bb, BAR - BEAT / 4, CH2.G, 0.35, 300, 6000);
    { let t = bb; const e2 = end - BEAT / 4; while (t < e2) { const p = (t - bb) / BAR; snare(t, 0.25 + 0.6 * p, 1 + p * 0.6); t += p < 0.5 ? BEAT / 2 : p < 0.75 ? BEAT / 4 : BEAT / 8; } }
    riser(bb, end - BEAT / 4, 0.6); revCymbal(end - BEAT / 4, 1.5, 0.55); }
  if (s.type === 'particles') { const prog = P4('Am', 'F', 'C', 'G');
    hats16(t0, nb); bassLine(t0, bars, prog, 0.6); stabs(t0, bars, prog, 0.2, 6000);
    melody(t0, MEL_DROP, 0.2); melody(t0 + 4 * BAR, MEL_DROP, 0.22);
    arp(t0, bars, prog, 0.08, [0, 2, 4, 2], 12, 0.4); arp(t0 + 4 * BAR, 4, prog, 0.06, [0, 4, 2, 4], 24, 0.4);
    whoosh(t0 + 2 * BAR - 0.3, 0.3, 0.5, true); crash(t0 + 4 * BAR, 0.4); }
  if (s.type === 'montage') { const prog = P4('F', 'G', 'Em', 'Am');
    for (let b = 0; b < nb; b++) { const t = t0 + b * BEAT, c = prog[Math.floor(b / 4)], ch = CH2[c];
      supersaw(t, BEAT * 0.55, ch.slice(0, 4), 0.22, 7000, 1500, 0.4); bass(t, BEAT * 0.8, ROOT2[c], 0.55, 0.6);
      if (b % 2 === 0) { blip(t, 88 + (b % 3) * 3, 0.12, 0.08, b % 4 ? 0.7 : -0.7); whoosh(t + 2 * BEAT - 0.2, 0.2, 0.3, true); }
      for (let s4 = 0; s4 < 4; s4++) hat(t + s4 * BEAT / 4, false, 0.3, s4 % 2 ? 0.4 : -0.4); }
    melody(t0, cutMel(MEL_CITY, nb), 0.17); riser(end - BAR, end, 0.4); revCymbal(end, 1.2, 0.5); }
  if (s.type === 'end') {
    supersaw(t0, 1.4, [45, 57, 60, 64, 69, 71, 76], 0.3, 7000, 900, 0.6, 0.003);
    bass(t0, 1.2, 33, 0.6, 0.3);
    [[0.25, 81], [0.5, 76], [0.75, 72], [1.0, 69]].forEach(([d, m], k) => pluck(t0 + d, m, 0.13, k % 2 ? 0.5 : -0.5, 0.6));
    pad(t0 + 0.5, 3 * BAR, [57, 64, 69, 71, 76], 0.22, 2400, 700);
    bell(t0 + BAR, 81, 0.07, 0.3, 2.0); bell(t0 + BAR + BEAT, 88, 0.05, -0.3, 2.0);
    const cr = t0 + 3 * BAR; const prog = ['F', 'C', 'G', 'Am', 'F'];
    prog.forEach((c, b) => { pad(cr + b * BAR, b === 4 ? end - (cr + 4 * BAR) - 0.2 : BAR, CH2[c].slice(0, 4), 0.2, 1500, 900); bass(cr + b * BAR, BAR * 0.95, ROOT2[c], 0.14, 0); });
    for (let i = 0; i < 8; i++) bell(cr + 0.5 + i * BEAT, [76, 79, 81, 84, 81, 79, 76, 72][i], 0.045, i % 2 ? 0.5 : -0.5, 1.6);
    bell(end - 2.6, 69, 0.06, 0, 2.5); bell(end - 2.6, 76, 0.04, 0.3, 2.5);
  }
}
for (const t of TL.kicks) kick(t, 1);
for (const t of TL.claps) clap(t, 0.8);
for (const im of TL.impacts) { impact(im.t, im.a); crash(im.t, im.a); }

// ---------- задержка (пинг-понг 3/16) и ревербератор (Freeverb)
{ const dt = S(BEAT * 0.75); const fb = 0.38; const bl = new Float32Array(N), br = new Float32Array(N);
  for (let i = 0; i < N; i++) { const il = i - dt; const xl = dlyL[i] + (il >= 0 ? br[il] * fb : 0); const xr = dlyR[i] + (il >= 0 ? bl[il] * fb : 0);
    bl[i] = xl; br[i] = xr; if (il >= 0) { L[i] += br[il] * 0.5; R[i] += bl[il] * 0.5; revL[i] += br[il] * 0.2; revR[i] += bl[il] * 0.2; } } }
function freeverb(inp, spread) {
  const sc = SR / 44100; const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => ({ b: new Float32Array(Math.round((n + spread) * sc)), i: 0, f: 0 }));
  const aps = [556, 441, 341, 225].map((n) => ({ b: new Float32Array(Math.round((n + spread) * sc)), i: 0 }));
  const out = new Float32Array(N); const fb = 0.86, damp = 0.25;
  for (let i = 0; i < N; i++) { const x = inp[i] * 0.015; let y = 0;
    for (const c of combs) { const o = c.b[c.i]; c.f = o * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * fb; c.i = (c.i + 1) % c.b.length; y += o; }
    for (const a of aps) { const o = a.b[a.i]; const v = -y + o; a.b[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.b.length; y = v; }
    out[i] = y; }
  return out; }
const wl = freeverb(revL, 0), wr = freeverb(revR, 23);
for (let i = 0; i < N; i++) { L[i] += wl[i] * 1.4; R[i] += wr[i] * 1.4; }

// ---------- мастер: сжатие от бочки на всё, кроме самой бочки нет смысла делить - мягкий пампинг всей смеси
const kicksS = globalThis.TL.kicks.map(S);
{ let k = 0; for (let i = 0; i < N; i++) { while (k + 1 < kicksS.length && kicksS[k + 1] <= i) k++;
    const d = i - kicksS[k]; const g = d >= 0 && d < SR * 0.25 ? 1 - 0.25 * Math.exp(-d / (SR * 0.05)) : 1; L[i] *= g; R[i] *= g; } }
const hpL = filt(), hpR = filt(); hpL.set('hp', 28, 0.7); hpR.set('hp', 28, 0.7);
let peak = 0;
for (let i = 0; i < N; i++) { const fade = i > N - SR * 1.4 ? Math.pow((N - i) / (SR * 1.4), 1.5) : 1;
  L[i] = Math.tanh(hpL.run(L[i]) * 1.15) * fade; R[i] = Math.tanh(hpR.run(R[i]) * 1.15) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const gain = 0.89 / peak; // -1 dBFS
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gain)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gain)) * 32767), 46 + i * 4); }
fs.writeFileSync(__dirname + `/music${TL.cut}.wav`, buf);
console.log(`music${TL.cut}.wav`, (N / SR).toFixed(2), 's, peak before gain', peak.toFixed(3));
