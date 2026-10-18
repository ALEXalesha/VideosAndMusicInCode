// Синтез «Toccata in E minor» по song.js (движок из «Ноктюрна» + литавры). Фортепиано - аддитивное, с неидеальными обертонами струны.
'use strict';
const fs = require('fs');
eval(fs.readFileSync(__dirname + '/song.js', 'utf8'));
const S = globalThis.SONG; const SR = 48000; const N = Math.round(S.DUR * SR); const TAU = Math.PI * 2;
const L = new Float32Array(N), R = new Float32Array(N), rvL = new Float32Array(N), rvR = new Float32Array(N);
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); const noise = () => rnd() * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const pan = (x, p) => [x * Math.cos((p + 1) * Math.PI / 4), x * Math.sin((p + 1) * Math.PI / 4)];
function add(i, l, r, rv) { if (i < 0 || i >= N) return; L[i] += l; R[i] += r; rvL[i] += l * rv; rvR[i] += r * rv; }
function biquad(type, f, q) { const w = TAU * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
  let b0, b1, b2; if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else { b0 = a; b1 = 0; b2 = -a; }
  const a0 = 1 + a; return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: -2 * c / a0, a2: (1 - a) / a0 }; }
function filt() { let x1 = 0, x2 = 0, y1 = 0, y2 = 0, k = null; return { set(t, f, q) { k = biquad(t, f, q); }, run(x) { const y = k.b0 * x + k.b1 * x1 + k.b2 * x2 - k.a1 * y1 - k.a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; } }; }
function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
function saw() { let ph = rnd(); return (f) => { const dt = f / SR; ph += dt; if (ph >= 1) ph -= 1; return 2 * ph - 1 - blep(ph, dt); }; }
const keyPan = (m) => Math.max(-0.7, Math.min(0.7, (m - 60) / 40));

function piano(nt) { // аддитивная модель: 3 струны, негармоничность, двухступенчатый спад, удар молоточка, демпфер
  const f0 = mtof(nt.m), v = nt.v, B = 0.00012 * Math.pow(2, (nt.m - 60) / 24);
  const nh = Math.max(3, Math.min(18, Math.floor(9000 / f0))); const len = nt.d + 0.5; const n = Math.round(Math.min(len + 2.5, 9) * SR);
  const parts = [];
  for (let h = 1; h <= nh; h++) { const fh = h * f0 * Math.sqrt(1 + B * h * h); if (fh > SR * 0.45) break;
    const amp = Math.pow(h, -1.15) * (h === 1 ? 1 : 0.9) * Math.exp(-h * (1.2 - v) * 0.22) * (1 + 0.3 * Math.sin(h * 2.1));
    const kf = Math.pow(f0 / 261.6, 0.55);
    parts.push({ fh, amp, d1: (2.2 + h * 0.9) * kf, d2: (0.35 + h * 0.12) * kf, det: [0, 0.6 + h * 0.05, -0.45 - h * 0.04], ph: [rnd(), rnd(), rnd()] }); }
  const hf = filt(); hf.set('bp', 1800 + v * 2500, 0.8); const p = keyPan(nt.m); const s0 = Math.round(nt.t * SR); const off = nt.d;
  for (let i = 0; i < n; i++) { const t = i / SR; let x = 0;
    for (const q of parts) { const env = 0.65 * Math.exp(-t * q.d1) + 0.35 * Math.exp(-t * q.d2);
      let s = 0; for (let k = 0; k < 3; k++) s += Math.sin(TAU * (q.ph[k] + (q.fh + q.det[k]) * t)); x += s * q.amp * env; }
    x *= 0.33; const damp = t < off ? 1 : Math.exp(-(t - off) * (f0 > 1000 ? 4 : 9)); // демпфер после отпускания
    x = x * damp * Math.min(1, t / 0.0015) + hf.run(noise()) * Math.exp(-t * 120) * 0.25 * v; // молоточек
    const g = v * 0.2; const [l, r] = pan(x * g, p); add(s0 + i, l, r, 0.32);
    if (t > off + 1.2) break; }
}
function strings(nt, cello = false) {
  const f0 = mtof(nt.m); const os = [saw(), saw(), saw(), saw()]; const det = [-0.11, 0.07, 0.13, -0.04].map((c) => Math.pow(2, c / 12));
  const fl = filt(), fr = filt(); const att = cello ? 0.12 : 0.45, rel = 0.6; const n = Math.round((nt.d + rel) * SR); const s0 = Math.round(nt.t * SR); const p = keyPan(nt.m) * 0.6;
  for (let i = 0; i < n; i++) { const t = i / SR; if (i % 64 === 0) { const c = (cello ? 1400 : 2200) + 900 * Math.min(1, t / 1.2) * nt.v; fl.set('lp', c, 0.6); fr.set('lp', c * 1.05, 0.6); }
    const vib = t > 0.35 ? Math.sin(TAU * 5.2 * t) * 0.0035 * Math.min(1, (t - 0.35) * 2) : 0;
    const env = Math.min(1, t / att) * (t < nt.d ? 1 : Math.exp(-(t - nt.d) * 6)) * (0.9 + 0.1 * Math.sin(t * 1.7));
    let a = 0, b = 0; os.forEach((o, k) => { const x = o(f0 * det[k] * (1 + vib)); if (k % 2) a += x; else b += x; });
    const g = nt.v * env * (cello ? 0.07 : 0.032); const [l1, r1] = pan(fl.run(a) * g, p - 0.3); const [l2, r2] = pan(fr.run(b) * g, p + 0.3); add(s0 + i, l1 + l2, r1 + r2, 0.5); }
}
function bass(nt) { const f0 = mtof(nt.m); const o = saw(); const f = filt(); const n = Math.round((nt.d + 0.3) * SR); const s0 = Math.round(nt.t * SR); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; if (i % 64 === 0) f.set('lp', 220 + 400 * Math.exp(-t * 4), 0.7); ph += f0 / SR;
    const env = Math.min(1, t / 0.02) * (t < nt.d ? Math.exp(-t * 0.3) : Math.exp(-nt.d * 0.3 - (t - nt.d) * 10));
    const x = (Math.sin(TAU * ph) * 0.8 + f.run(o(f0)) * 0.35) * env * nt.v * 0.19; add(s0 + i, x, x, 0.12); } }
function bell(nt) { const f0 = mtof(nt.m); const n = Math.round(3 * SR); const s0 = Math.round(nt.t * SR); const p = keyPan(nt.m) * 1.2;
  for (let i = 0; i < n; i++) { const t = i / SR; const idx = 2.2 * Math.exp(-t * 3);
    const x = Math.sin(TAU * f0 * t + idx * Math.sin(TAU * f0 * 3.5 * t)) * Math.exp(-t * 1.6) * nt.v * 0.13 + Math.sin(TAU * f0 * 2.76 * t) * Math.exp(-t * 4) * nt.v * 0.03;
    const [l, r] = pan(x, p); add(s0 + i, l, r, 0.55); } }
function drum(d) { const s0 = Math.round(d.t * SR);
  if (d.k === 'kick') { let ph = 0; for (let i = 0; i < SR * 0.6; i++) { const t = i / SR; ph += (48 + 70 * Math.exp(-t * 25)) / SR; const x = Math.sin(TAU * ph) * Math.exp(-t * 5) * d.v * 0.55; add(s0 + i, x, x, 0.15); } }
  if (d.k === 'boom') { let ph = 0; const f = filt(); f.set('lp', 500, 0.7); for (let i = 0; i < SR * 3; i++) { const t = i / SR; ph += (38 + 30 * Math.exp(-t * 8)) / SR;
      const x = (Math.sin(TAU * ph) * Math.exp(-t * 1.4) + f.run(noise()) * Math.exp(-t * 3) * 0.4) * d.v * 0.6; add(s0 + i, x, x, 0.5); } }
  if (d.k === 'timp') { const f0 = mtof(d.m); const f = filt(); f.set('lp', 900, 0.7); const ps = [1, 1.5, 1.99, 2.44].map(() => rnd());
    for (let i = 0; i < SR * 1.6; i++) { const t = i / SR; const bend = 1 + 0.04 * Math.exp(-t * 20);
      const x = (Math.sin(TAU * (ps[0] + f0 * bend * t)) + 0.5 * Math.sin(TAU * (ps[1] + f0 * 1.5 * t)) * Math.exp(-t * 3) + 0.3 * Math.sin(TAU * (ps[2] + f0 * 1.99 * t)) * Math.exp(-t * 4)) * Math.exp(-t * 2.2)
        + f.run(noise()) * Math.exp(-t * 40) * 0.6; add(s0 + i, x * d.v * 0.32, x * d.v * 0.3, 0.35); } }
  if (d.k === 'snare') { const f = filt(); f.set('bp', 2200, 0.6); for (let i = 0; i < SR * 0.35; i++) { const t = i / SR; const x = f.run(noise()) * Math.exp(-t * 14) * d.v * 0.35; add(s0 + i, x * 0.9, x, 0.45); } }
  if (d.k === 'shaker') { const f = filt(); f.set('hp', 7000, 0.7); for (let i = 0; i < SR * 0.08; i++) { const t = i / SR; const x = f.run(noise()) * Math.sin(Math.PI * Math.min(1, t / 0.08)) * d.v * 0.08; const [l, r] = pan(x, 0.4); add(s0 + i, l, r, 0.1); } } }

const t0 = Date.now();
for (const nt of S.notes) { if (nt.i === 'rh' || nt.i === 'lh') piano(nt); else if (nt.i === 'str') strings(nt); else if (nt.i === 'cello') strings(nt, true); else if (nt.i === 'bass') bass(nt); else if (nt.i === 'bell') bell(nt); }
for (const d of S.drums) drum(d);
console.log('voices', ((Date.now() - t0) / 1000).toFixed(1), 's');
function freeverb(inp, spread, room) { const sc = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => ({ b: new Float32Array(Math.round((n + spread) * sc * 1.3)), i: 0, f: 0 }));
  const aps = [556, 441, 341, 225].map((n) => ({ b: new Float32Array(Math.round((n + spread) * sc)), i: 0 })); const out = new Float32Array(N);
  const pre = Math.round(0.025 * SR);
  for (let i = 0; i < N; i++) { const x = (i >= pre ? inp[i - pre] : 0) * 0.015; let y = 0;
    for (const c of combs) { const o = c.b[c.i]; c.f = o * 0.7 + c.f * 0.3; c.b[c.i] = x + c.f * room; c.i = (c.i + 1) % c.b.length; y += o; }
    for (const a of aps) { const o = a.b[a.i]; const v = -y + o; a.b[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.b.length; y = v; } out[i] = y; }
  return out; }
const wl = freeverb(rvL, 0, 0.9), wr = freeverb(rvR, 23, 0.9);
let peak = 0; const hl = filt(), hr = filt(); hl.set('hp', 30, 0.7); hr.set('hp', 30, 0.7);
// мягкий компрессор по огибающей
let env = 0;
for (let i = 0; i < N; i++) { let l = hl.run(L[i] + wl[i] * 1.6), r = hr.run(R[i] + wr[i] * 1.6);
  const a = Math.max(Math.abs(l), Math.abs(r)); env = a > env ? env + (a - env) * 0.01 : env * 0.99995;
  const g = env > 0.5 ? Math.pow(0.5 / env, 0.4) : 1; l *= g; r *= g;
  const fade = i > N - SR * 1.5 ? (N - i) / (SR * 1.5) : 1; L[i] = Math.tanh(l) * fade; R[i] = Math.tanh(r) * fade; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const gain = 0.89 / peak; const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gain)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gain)) * 32767), 46 + i * 4); }
fs.writeFileSync(__dirname + '/toccata.wav', buf); console.log('toccata.wav', S.DUR.toFixed(1), 's, peak', peak.toFixed(2), 'total', ((Date.now() - t0) / 1000).toFixed(1), 's');
