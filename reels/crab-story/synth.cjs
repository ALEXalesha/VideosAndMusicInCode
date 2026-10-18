// Музыка к ролику про крабика, вариант 3 (звуки первой версии + новые тёплые темы): синтез с нуля, без сэмплов. 48 кГц, стерео, 120 BPM. node synth.cjs  (файл собран из _head + _instr + _arr + _master)
'use strict';
const fs = require('fs');
eval(fs.readFileSync(__dirname + '/timeline.js', 'utf8'));
const TL = globalThis.TL;
const { BEAT, BAR, DUR, EV, at } = TL;
const SR = 48000, N = Math.round(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);
const revL = new Float32Array(N), revR = new Float32Array(N);
const dlyL = new Float32Array(N), dlyR = new Float32Array(N);
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

// ---------- чиптюн: импульсная волна (как у старых приставок) с вибрато и скольжением
function chip(t0, len, m, vol = 0.12, duty = 0.25, glideFrom = null, p = 0) {
  let ph = 0; const n = S(len + 0.06); const f = filt(); f.set('lp', 7000, 0.7);
  for (let i = 0; i < n; i++) { const t = i / SR; let mm = m; if (glideFrom !== null) mm = m + (glideFrom - m) * Math.exp(-t * 45);
    const vib = t > 0.12 ? Math.sin(TAU * 6 * t) * 0.15 * Math.min(1, (t - 0.12) * 5) : 0; ph += mtof(mm + vib) / SR; ph -= Math.floor(ph);
    const env = Math.min(1, t / 0.004) * (t < len ? 1 - 0.25 * Math.min(1, t / 0.4) : Math.exp(-(t - len) * 40));
    const x = f.run((ph < duty ? 1 : -1) * 0.6) * env * vol; const [l, r] = pan(x, p); add(S(t0) + i, l, r, 0.22, 0.3); } }
function chipMel(t0, mel, vol = 0.11, duty = 0.25) { let prev = null; for (const [b0, d, m] of mel) { chip(t0 + b0 * BEAT, d * BEAT * 0.9, m, vol, duty, prev); prev = m; } }
function tri(t0, len, m, vol = 0.3) { let ph = 0; const n = S(len + 0.02); // треугольный бас приставки
  for (let i = 0; i < n; i++) { const t = i / SR; ph += mtof(m) / SR; ph -= Math.floor(ph); const x = (4 * Math.abs(ph - 0.5) - 1) * vol * Math.min(1, t / 0.003) * (t < len ? 1 : Math.exp(-(t - len) * 80)); add(S(t0) + i, x, x); } }
function boing(t0, up = true, vol = 0.22) { let ph = 0; const n = S(0.32); // прыжок: свист вверх
  for (let i = 0; i < n; i++) { const t = i / SR; const m = up ? 64 + 26 * (1 - Math.exp(-t * 14)) : 88 - 24 * (1 - Math.exp(-t * 12)); ph += mtof(m) / SR; ph -= Math.floor(ph);
    const x = (ph < 0.5 ? 1 : -1) * 0.5 * Math.exp(-t * 9) * vol; add(S(t0) + i, x, x, 0.2); } }
function chirp(t0, vol = 0.16) { blip(t0, 88, vol, 0.07, -0.2); blip(t0 + 0.09, 93, vol, 0.09, 0.2); } // «би-бип» крабика
function step(t0, vol = 0.05, p = 0) { const f = filt(); f.set('bp', 2400 + rnd() * 1800, 3); const n = S(0.03); // топот лапки
  for (let i = 0; i < n; i++) { const t = i / SR; const x = f.run(noise()) * Math.exp(-t * 260) * vol * 3; const [l, r] = pan(x, p); add(S(t0) + i, l, r, 0.05); } }
function thud(t0, vol = 0.5) { let ph = 0; const n = S(0.35); for (let i = 0; i < n; i++) { const t = i / SR; ph += (55 + 90 * Math.exp(-t * 30)) / SR;
  const x = Math.sin(TAU * ph) * Math.exp(-t * 14) * vol + noise() * Math.exp(-t * 120) * 0.15 * vol; add(S(t0) + i, x, x, 0.1); } }
function rumble(t0, t1, vol = 0.5, rise = 1) { const f = filt(); const n = S(t1 - t0); // гул двигателя
  for (let i = 0; i < n; i++) { const p = i / n; if (i % 64 === 0) f.set('lp', 120 + 900 * Math.pow(p, rise), 0.8); const env = Math.min(1, i / S(0.4)) * Math.min(1, (n - i) / S(0.8));
    const x = f.run(noise()) * env * vol * 2.2; add(S(t0) + i, x, x * 0.97, 0.25); } }
function stepper(t0, t1, vol = 0.03) { const n = S(t1 - t0); let ph = 0; // шаговый мотор принтера
  for (let i = 0; i < n; i++) { const t = i / SR; const m = 74 + 5 * Math.sin(t * 3.1) + 3 * Math.sin(t * 7.7); ph += mtof(m) / SR; ph -= Math.floor(ph);
    const g = 0.6 + 0.4 * Math.sin(t * 40); const x = (ph < 0.5 ? 1 : -1) * vol * g * Math.min(1, t / 0.2) * Math.min(1, (t1 - t0 - t) / 0.2); add(S(t0) + i, x * 0.8, x, 0.1); } }
function keyTick(t0, vol = 0.06) { tick(t0, vol, 2600 + rnd() * 1800); const f = filt(); f.set('hp', 3000, 0.7);
  for (let i = 0; i < S(0.02); i++) { const t = i / SR; const x = f.run(noise()) * Math.exp(-t * 300) * vol; add(S(t0) + i, x, x); } }

const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];
const PROG_W = ['C', 'G', 'Am', 'F'], PROG_D = ['Am', 'F', 'C', 'G'];
const MEL_CHIP = [[0, 0.5, 81], [0.5, 0.5, 84], [1, 0.5, 88], [1.5, 0.25, 86], [1.75, 0.25, 84], [2, 0.75, 86], [2.75, 0.25, 84], [3, 1, 81],
  [4, 0.5, 81], [4.5, 0.5, 84], [5, 0.5, 89], [5.5, 0.5, 88], [6, 0.5, 86], [6.5, 0.5, 84], [7, 1, 84],
  [8, 0.5, 79], [8.5, 0.5, 84], [9, 0.5, 88], [9.5, 0.5, 91], [10, 1, 88], [11, 0.5, 86], [11.5, 0.5, 84],
  [12, 0.5, 83], [12.5, 0.5, 86], [13, 0.5, 91], [13.5, 0.5, 89], [14, 0.75, 88], [14.75, 0.25, 86], [15, 1, 83]];
const MEL_FLY = [[0, 2, 76], [2, 1, 79], [3, 1, 81], [4, 3, 84], [7, 1, 83], [8, 2, 81], [10, 1, 79], [11, 1, 76], [12, 4, 79]];
const shiftMel = (mel, k) => mel.map(([b, d, m]) => [b, d, m + k]);

// ---------- третий вариант: тёплый ведущий голос (два треугольника и чуть квадрата под мягким фильтром) с новыми темами
function warm(t0, len, m, vol = 0.1, from = null, p = 0) { const n = S(len + 0.6); const f = filt(); let a = 0, b = 0, c = 0; const s0 = S(t0);
  for (let i = 0; i < n; i++) { const t = i / SR; const mm = from !== null ? m + (from - m) * Math.exp(-t * 30) : m;
    const vib = t > 0.2 ? Math.sin(TAU * 5 * t) * 0.12 * Math.min(1, (t - 0.2) * 3) : 0; const fr = mtof(mm + vib);
    a += fr / SR; b += fr * 1.0035 / SR; c += fr * 2 / SR; a -= Math.floor(a); b -= Math.floor(b); c -= Math.floor(c);
    if (i % 32 === 0) f.set('lp', 1700 + 2600 * Math.exp(-t * 3), 0.8);
    const tr = (q) => 4 * Math.abs(q - 0.5) - 1;
    const x0 = (tr(a) + tr(b)) * 0.5 + 0.22 * Math.sin(TAU * c) + 0.12 * (a < 0.5 ? 1 : -1);
    const env = Math.min(1, t / 0.012) * (t < len ? 0.85 + 0.15 * Math.exp(-t * 6) : Math.exp(-(t - len) * 7));
    const x = f.run(x0) * env * vol; const [l, r] = pan(x, p); add(s0 + i, l, r, 0.35, 0.3); } }
function warmMel(t0, mel, vol = 0.1, sparkle = 0.25) { let prev = null;
  for (const [b0, d, m] of mel) { const t = t0 + b0 * BEAT; warm(t, d * BEAT * 0.92, m, vol, prev !== null && Math.abs(prev - m) >= 5 ? prev : null, Math.sin(b0 * 0.7) * 0.2);
    if (d >= 1 && sparkle > 0) bell(t, m + 12, vol * sparkle, -Math.sin(b0) * 0.4, 1.6); prev = m; } }
const WALK3 = [[0, 0.5, 76], [0.5, 0.5, 79], [1, 1, 84], [2, 0.5, 83], [2.5, 0.5, 79], [3, 1, 74], [4, 0.5, 76], [4.5, 0.5, 81], [5, 1, 84], [6, 0.5, 86], [6.5, 0.5, 84], [7, 1, 81]];
const CITY3 = [[0, 0.75, 88], [0.75, 0.25, 86], [1, 0.5, 84], [1.5, 0.5, 81], [2, 1.5, 84], [3.5, 0.5, 86],
  [4, 0.75, 89], [4.75, 0.25, 88], [5, 0.5, 84], [5.5, 0.5, 81], [6, 2, 77],
  [8, 0.75, 88], [8.75, 0.25, 86], [9, 0.5, 84], [9.5, 0.5, 79], [10, 1.5, 84], [11.5, 0.5, 86],
  [12, 0.5, 86], [12.5, 0.5, 88], [13, 0.5, 91], [13.5, 0.5, 88], [14, 2, 86]];
const FLY3 = [[0, 3, 81], [3, 1, 84], [4, 2, 79], [6, 2, 83], [8, 3, 76], [11, 1, 79], [12, 4, 81]];
const LIFT3 = [[0, 2, 84], [2, 2, 86], [4, 2, 88], [6, 1, 91], [7, 1, 88], [8, 2, 86], [10, 2, 93]];
const END3 = [[0, 2, 84], [2, 2, 81], [4, 3, 79], [8, 1, 76], [9, 1, 79], [10, 4, 81]];

// ---------- 1. Пробуждение (0-12 с)
{ const s0 = 0;
  pad(0.2, 4.0, [45, 52, 57], 0.18, 140, 500);
  for (let i = 0; i < 6; i++) keyTick(1.0 + i * 0.7 / 6);
  for (let i = 0; i < 20; i++) keyTick(2.6 + i * 1.0 / 20, 0.05);
  blip(EV.enter, 79, 0.18, 0.1); blip(3.75, 79, 0.18, 0.1); blip(3.9, 84, 0.08, 0.2, -0.3); blip(4.3, 86, 0.08, 0.2, 0.3);
  pad(4.0, 4.2, CH2.Am.slice(0, 4), 0.2, 300, 2200);
  EV.parts.forEach((t, k) => { pluck(t, PENTA[k] , 0.16, k % 2 ? 0.5 : -0.5, 0.4); tick(t, 0.25, 1600); thud(t, k === 0 ? 0.45 : 0.18); });
  riser(6.0, 8.0, 0.25); revCymbal(8.0, 1.0, 0.35);
  // глаза открылись: колокольчик и «би-бип»
  bell(EV.blink, 84, 0.1, -0.3, 2.4); bell(EV.blink, 88, 0.08, 0.3, 2.4); bell(EV.blink + 0.02, 91, 0.06, 0, 2.4); chirp(EV.blink + 0.25);
  pad(8.0, 4.0, CH2.C.slice(0, 4), 0.22, 600, 2600);
  whoosh(9.0, 0.22, 0.12, false); whoosh(9.5, 0.22, 0.12, true);
  boing(EV.hop - 0.05, true); thud(EV.hop + 0.45, 0.3);
  for (let i = 0; i < 8; i++) hat(10.0 + i * BEAT / 2, i % 2 === 1, 0.08 + 0.06 * i / 8, i % 2 ? 0.3 : -0.3);
  for (let b = 0; b < 4; b++) tri(10 + b * BEAT, BEAT * 0.8, [36, 36, 43, 43][b], 0.22);
  revCymbal(12.0, 1.0, 0.4); }

// ---------- 2. Прогулка (12-24 с): пружинистый бас, щипки, топот лапок
{ const s0 = at('walk', 0);
  for (let bar = 0; bar < 5; bar++) { const c = PROG_W[bar % 4], tb = s0 + bar * BAR;
    for (let b = 0; b < 4; b++) tri(tb + b * BEAT, BEAT * 0.45, ROOT2[c] + 12 + (b % 2 ? 7 : 0), 0.3);
    for (let e = 0; e < 8; e++) if (e % 2) pluck(tb + e * BEAT / 2, CH2[c][(e >> 1) % 4] + 12, 0.11, e % 4 === 1 ? -0.5 : 0.5, 0.3);
    pad(tb, BAR, CH2[c].slice(0, 3), 0.1, 700, 1400);
    for (let s = 0; s < 8; s++) hat(tb + s * BEAT / 2, s % 2 === 1, s % 2 ? 0.16 : 0.1, s % 2 ? 0.4 : -0.4); }
  // топот: 5 шагов в секунду, пока идёт
  for (let t = s0 + 0.1; t < EV.stop - 0.1; t += 0.2) step(t, 0.045, Math.sin(t * 9) * 0.4);
  warmMel(s0 + 2 * BAR, WALK3, 0.085);
  chirp(16.6, 0.12);
  // замер у края: обрыв, вой вниз, тишина пропасти
  boing(EV.stop, false, 0.25); impact(EV.stop, 0.25);
  wob(EV.stop + 0.3, BAR * 0.8, 33, 0.5, 0.18); pad(EV.stop + 0.2, 1.8, [45, 48, 52], 0.18, 200, 600);
  for (const t of [22.6, 23.0, 23.5, 23.9]) thud(t, 0.22);
  riser(23.0, 24.0, 0.25); }

// ---------- 3. Стройка (24-40 с): каждый блок - нота, город растёт на каждую долю
{ const s0 = at('build', 0);
  riser(s0, EV.bridge[0], 0.2); blip(s0 + 0.5, 84, 0.1, 0.1); blip(s0 + 0.62, 88, 0.1, 0.1);
  for (let bar = 0; bar < 8; bar++) { const c = PROG_D[bar % 4], tb = s0 + bar * BAR;
    bassLine(tb, 1, [c], bar >= 4 ? 0.5 : 0.25, bar >= 4); hats16(tb, 4, bar >= 4 ? 1 : 0.7);
    pad(tb, BAR, CH2[c].slice(0, 4), bar >= 4 ? 0.16 : 0.1, 900, 2400); }
  for (let i = 0; i < 60; i++) { const tl = EV.bridge[0] + i * 0.1, tland = tl + 0.45;
    if (i % 2 === 0) whoosh(tl, 0.16, 0.05, true);
    const row = Math.floor(i / 6), k = i % 6; const m = PENTA[Math.min(9, k + (row % 5))];
    blip(tland, m, 0.09, 0.08, k % 2 ? 0.4 : -0.4); tick(tland, 0.08, 2000 + k * 200); }
  // победа
  supersaw(31.25, 0.5, [60, 64, 67, 72, 76], 0.22, 6000, 1200, 0.5); chirp(31.4, 0.14); boing(31.2, true, 0.18);
  // город: аккорд на долю, сверху чиптюн-соло
  for (let b = 0; b < 16; b++) { const t = EV.city[0] + b * BEAT; const c = PROG_D[Math.floor(b / 4) % 4];
    supersaw(t, BEAT * 0.4, CH2[c].slice(0, 4), 0.13, 5000, 1100, 0.4); thud(t, 0.18); }
  warmMel(EV.city[0], CITY3, 0.1);
  for (let b = 1; b < 4; b++) crash(EV.city[0] + b * BAR, 0.18);
  riser(38.0, 40.0, 0.3); revCymbal(40.0, 1.2, 0.4); }

// ---------- 4. Ракета (40-56 с): печать, посадка, отсчёт, взлёт
{ const s0 = at('rocket', 0); const P = ['Am', 'F', 'C', 'G'];
  stepper(EV.print[0], EV.print[1], 0.025);
  for (let bar = 0; bar < 4; bar++) { const c = P[bar % 4], tb = s0 + bar * BAR;
    arp(tb, 1, [c], 0.07 + 0.02 * bar, [0, 2, 4, 2, 3, 2, 1, 2], 12, 0.35); bass(tb, BAR * 0.95, ROOT2[c], 0.3, 0.1);
    pad(tb, BAR, CH2[c].slice(0, 4), 0.12, 600, 1800 + 400 * bar); hats16(tb, 4, 0.6); }
  boing(EV.board, true, 0.2); thud(EV.board + 0.42, 0.25); boing(EV.board + 0.47, true, 0.2); thud(EV.board + 0.92, 0.3); chirp(EV.board + 1.5, 0.12);
  pad(EV.board, 2 * BAR, [45, 52, 57, 60, 64], 0.18, 400, 2400);
  EV.count.forEach((t, k) => { blip(t, 76 + k * 4, 0.3, 0.2); tick(t, 0.3, 1800); thud(t, 0.3); });
  rumble(EV.ignite, 56.5, 0.45, 0.8); riser(EV.ignite - 1.0, EV.lift, 0.5); revCymbal(EV.lift, 1.2, 0.5);
  // взлёт: широкий аккорд, бас, соло летит вверх
  const LP = ['F', 'G', 'Am', 'C', 'F', 'G'];
  LP.forEach((c, b) => { const tb = EV.lift + b * BEAT * 2; const ch = CH2[c];
    supersaw(tb, BEAT * 2, ch.slice(0, 4).concat([ch[0] + 12]), 0.16, 4200, 2200, 0.55, 0.02); bass(tb, BEAT * 1.9, ROOT2[c], 0.45, 0.2); });
  warmMel(EV.lift, LIFT3, 0.11, 0.35);
  for (let i = 0; i < 24; i++) hat(EV.lift + i * BEAT / 4, false, 0.05 + 0.1 * i / 24, i % 2 ? 0.4 : -0.4);
  riser(53.5, 56.0, 0.35); whoosh(55.6, 0.5, 0.4, true); }

// ---------- 5. Полёт (56-64 с): без ударных, колокольчики, посадка
{ const s0 = at('space', 0); const P = ['F', 'C', 'G', 'Am'];
  for (let bar = 0; bar < 4; bar++) { const c = P[bar], tb = s0 + bar * BAR; const ch = CH2[c];
    pad(tb, BAR, ch.slice(0, 4), 0.22, 900, 2400); bass(tb, BAR * 0.98, ROOT2[c], 0.14, 0);
    for (let x = 0; x < 8; x++) bell(tb + x * BEAT / 2, ch[[0, 2, 4, 3, 1, 3, 4, 2][x]] + 12, 0.035, Math.sin(x * 1.3) * 0.7, 1.2); }
  warmMel(s0, FLY3, 0.075, 0.45);
  rumble(s0, EV.land + 0.3, 0.12, 0.4);
  thud(EV.land, 0.6); impact(EV.land, 0.35); whoosh(EV.land - 0.1, 0.4, 0.2, false);
  riser(EV.land, at('dance', 0), 0.5); revCymbal(at('dance', 0), 1.0, 0.55); }

// ---------- 6. Танец (64-80 с): дроп
{ const s0 = at('dance', 0);
  boing(s0, true, 0.2);
  for (let bar = 0; bar < 8; bar++) { const c = PROG_D[bar % 4], tb = s0 + bar * BAR; const last = bar === 7;
    if (!last) { hats16(tb, 4, 1.1); bassLine(tb, 1, [c], 0.55, true); stabs(tb, 1, [c], 0.17, 6500); }
    arp(tb, 1, [c], 0.06, [0, 4, 2, 4, 1, 4, 3, 4], 24, 0.4); }
  warmMel(s0, CITY3, 0.12); warmMel(s0 + 4 * BAR, CITY3.map(([b, d, m]) => [b, d, m + 12]), 0.07, 0); warmMel(s0 + 4 * BAR, CITY3, 0.11, 0);
  warmMel(s0, WALK3.concat(WALK3.map(([b, d, m]) => [b + 8, d, m])).map(([b, d, m]) => [b, d, m - 12]), 0.045, 0);
  for (let b = 1; b < 8; b += 2) crash(s0 + b * BAR + BAR, 0.2);
  // разгон к замиранию
  { const t0 = s0 + 7 * BAR; let t = t0; while (t < EV.freeze - 0.05) { const p = (t - t0) / (EV.freeze - t0); snare(t, 0.2 + 0.5 * p, 1 + p * 0.6); t += p < 0.5 ? BEAT / 2 : p < 0.8 ? BEAT / 4 : BEAT / 8; } }
  riser(s0 + 7 * BAR, EV.freeze, 0.45); boing(EV.freeze - 0.5, true, 0.22);
  supersaw(EV.freeze, 0.45, [57, 60, 64, 69, 72, 76], 0.25, 7000, 1500, 0.6, 0.003); impact(EV.freeze, 0.5); crash(EV.freeze, 0.4); chirp(EV.freeze + 0.15, 0.13); }

// ---------- 7. Финал (80-92 с): тихо, колокольчики, мелодия ещё раз медленно
{ const s0 = at('end', 0); const P = ['F', 'C', 'G', 'Am', 'F', 'C'];
  P.forEach((c, b) => { const tb = s0 + b * BAR; const ch = CH2[c];
    pad(tb, b === 5 ? BAR - 0.6 : BAR, ch.slice(0, 4), 0.2, 1400, 900); bass(tb, BAR * 0.95, ROOT2[c], 0.12, 0);
    for (let x = 0; x < 4; x++) bell(tb + x * BEAT + 0.25, ch[[4, 2, 3, 1][x]] + 12, 0.04, x % 2 ? 0.5 : -0.5, 1.8); });
  warmMel(s0 + 0.5, END3, 0.06, 0.5);
  chirp(87.3, 0.1); chirp(90.0, 0.09);
  for (let i = 0; i < 3; i++) tick(DUR - 0.5 + i * 0.25, 0.12, 2400); }
for (const t of TL.kicks) kick(t, 0.95);
for (const t of TL.claps) clap(t, 0.7);
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
fs.writeFileSync(__dirname + "/music.wav", buf);
console.log("music.wav", (N / SR).toFixed(2), 's, peak before gain', peak.toFixed(3));
