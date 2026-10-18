// Партитура «Toccata in E minor»: один источник нот для синтеза и для визуализации. 132 BPM, 4/4, 62 такта.
// Бегущие шестнадцатые правой руки, тема в октавах левой, эпизод в соль мажоре, разработка, кульминация с оркестром, кода.
(function (g) {
  const BPM = 132, BEAT = 60 / BPM, BAR = 4 * BEAT;
  const notes = [], chords = [], sections = [], drums = [];
  const N = (bar, beat, d, m, v, i) => notes.push({ t: (bar * 4 + beat) * BEAT, d: d * BEAT, m, v: Math.min(1, v), i });
  const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, Bb: 10, B: 11 };
  const n = (s) => { const m = s.match(/^([A-G](?:#|b)?)(-?\d)$/); return PC[m[1]] + 12 * (+m[2] + 1); };
  const CH = { Em: ['Em', 'E', [0, 3, 7]], C: ['C', 'C', [0, 4, 7]], Am: ['Am', 'A', [0, 3, 7]], B7: ['B7', 'B', [0, 4, 7, 10]], B: ['B', 'B', [0, 4, 7]],
    D: ['D', 'D', [0, 4, 7]], G: ['G', 'G', [0, 4, 7]], D7: ['D7', 'D', [0, 4, 7, 10]], Fm7b5: ['F♯ø7', 'F#', [0, 3, 6, 10]] };
  const prog = [
    'Em', 'Em', 'C', 'B7',                                   // 0-3   вступление
    'Em', 'C', 'Am', 'B7', 'Em', 'C', 'D', 'B',              // 4-11  тема
    'Am', 'Em', 'C', 'B7', 'Em', 'C', 'B7', 'Em',            // 12-19 ответ темы
    'G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D7',                // 20-27 эпизод в соль мажоре
    'Am', 'D7', 'G', 'C', 'Fm7b5', 'B7', 'C', 'B7',          // 28-35 разработка
    'Em', 'C', 'Am', 'B7', 'Em', 'C', 'D', 'B',              // 36-43 кульминация
    'Am', 'Em', 'C', 'B7', 'Em', 'C', 'B7', 'Em',            // 44-51
    'Em', 'C', 'Am', 'B7', 'Em', 'Am', 'B7', 'B7',           // 52-59 кода
    'Em', 'Em'];                                             // 60-61 финальный аккорд
  sections.push({ bar: 0, name: 'PRELUDE' }, { bar: 4, name: 'THEME' }, { bar: 20, name: 'EPISODE' }, { bar: 28, name: 'DEVELOPMENT' }, { bar: 36, name: 'CLIMAX' }, { bar: 52, name: 'CODA' });
  prog.forEach((c, b) => chords.push({ t: b * BAR, name: CH[c][0] }));
  const rootPc = (c) => PC[CH[c][1]];
  const tones = (c) => CH[c][2].map((s) => (rootPc(c) + s) % 12);
  // голоса аккорда в диапазоне [lo, hi], по возрастанию
  const voicing = (c, lo, hi) => { const pcs = tones(c); const out = []; for (let m = lo; m <= hi; m++) if (pcs.includes(m % 12)) out.push(m); return out; };
  const rootIn = (c, oct) => rootPc(c) + 12 * (oct + 1);

  // --- правая рука: бегущие шестнадцатые [верх, низ, середина, низ] на каждую долю
  function ost(bar, c, v, lo = 59, hi = 79) { const vc = voicing(c, lo, hi); const L = vc.length;
    for (let b = 0; b < 4; b++) { const top = vc[L - 1 - (b % 2)], low = vc[0], mid = vc[Math.min(L - 2, 1 + (b % 2))];
      [top, low, mid, low].forEach((m, k) => N(bar, b + k / 4, 0.24, m, v * (k === 0 ? 1.12 : 0.88), 'rh')); } }
  // --- левая рука: бас шестнадцатыми [корень, квинта, октава, квинта]
  function bassOst(bar, c, v, oct = 2) { const r = rootIn(c, oct); for (let b = 0; b < 4; b++) [r, r + 7, r + 12, r + 7].forEach((m, k) => N(bar, b + k / 4, 0.24, m, v * (k === 0 ? 1.1 : 0.85), 'lh')); }
  // --- тема: [доля, длительность, нота]
  const T = {
    a1: [[0, 1.5, 'E3'], [1.5, 0.5, 'F#3'], [2, 1, 'G3'], [3, 1, 'B3']], a2: [[0, 1.5, 'C4'], [1.5, 0.5, 'B3'], [2, 1, 'A3'], [3, 1, 'G3']],
    a3: [[0, 1, 'A3'], [1, 1, 'C4'], [2, 1, 'E4'], [3, 0.5, 'D4'], [3.5, 0.5, 'C4']], a4: [[0, 2, 'B3'], [2, 1, 'D#4'], [3, 1, 'F#3']],
    a6: [[0, 1.5, 'C4'], [1.5, 0.5, 'D4'], [2, 1, 'E4'], [3, 1, 'G4']], a7: [[0, 1, 'F#4'], [1, 1, 'E4'], [2, 1, 'D4'], [3, 1, 'A3']], a8: [[0, 2, 'B3'], [2, 2, 'D#4']],
    b1: [[0, 1.5, 'A3'], [1.5, 0.5, 'B3'], [2, 1, 'C4'], [3, 1, 'E4']], b2: [[0, 1.5, 'G3'], [1.5, 0.5, 'F#3'], [2, 1, 'E3'], [3, 1, 'B3']],
    b3: [[0, 1, 'C4'], [1, 1, 'E4'], [2, 1, 'G4'], [3, 0.5, 'F#4'], [3.5, 0.5, 'E4']], b4: [[0, 2, 'D#4'], [2, 1, 'F#4'], [3, 1, 'B3']],
    b5: [[0, 1.5, 'E4'], [1.5, 0.5, 'D4'], [2, 1, 'B3'], [3, 1, 'G3']], b6: [[0, 1.5, 'C4'], [1.5, 0.5, 'B3'], [2, 1, 'A3'], [3, 1, 'E3']],
    b7: [[0, 1, 'A3'], [1, 1, 'C4'], [2, 1, 'B3'], [3, 1, 'D#4']], b8: [[0, 4, 'E4']],
  };
  const THEME = ['a1', 'a2', 'a3', 'a4', 'a1', 'a6', 'a7', 'a8'], ANSWER = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'];
  const play = (bar, key, vel, inst, shift = 0, oct = false) => T[key].forEach(([b, d, s]) => { N(bar, b, d * 0.96, n(s) + shift, vel, inst); if (oct) N(bar, b, d * 0.96, n(s) + shift - 12, vel * 0.85, inst); });

  // ===== вступление 0-3: одни шестнадцатые, тихо, нарастая
  for (let b = 0; b < 4; b++) ost(b, prog[b], 0.32 + b * 0.05);
  N(2, 0, 4, n('C2'), 0.35, 'lh'); N(3, 0, 4, n('B1'), 0.4, 'lh');
  // ===== тема 4-19: шестнадцатые сверху, тема октавами в левой руке
  for (let b = 4; b < 20; b++) { ost(b, prog[b], 0.4 + (b - 4) * 0.008); const k = b < 12 ? THEME[b - 4] : ANSWER[b - 12]; play(b, k, 0.62 + (b >= 12 ? 0.05 : 0), 'lh', 0, true); }
  for (let b = 12; b < 20; b++) N(b, 0, 4, rootIn(prog[b], 3) + 12, 0.22, 'str');
  // ===== эпизод 20-27: певучая мелодия, левая рука ломаными восьмыми, виолончель отвечает
  const EP = [[[0, 1.5, 'B5'], [1.5, 0.5, 'A5'], [2, 2, 'G5']], [[0, 1, 'F#5'], [1, 1, 'A5'], [2, 2, 'D5']], [[0, 1.5, 'E5'], [1.5, 0.5, 'F#5'], [2, 1, 'G5'], [3, 1, 'B5']], [[0, 3, 'C6'], [3, 1, 'B5']],
    [[0, 1.5, 'B5'], [1.5, 0.5, 'C6'], [2, 2, 'D6']], [[0, 1, 'A5'], [1, 1, 'F#5'], [2, 2, 'D5']], [[0, 1, 'E5'], [1, 1, 'G5'], [2, 1, 'C6'], [3, 1, 'E6']], [[0, 2, 'D6'], [2, 1, 'C6'], [3, 1, 'A5']]];
  const CEL = ['G3', 'A3', 'B3', 'C4', 'D4', 'D4', 'E4', 'F#4'];
  EP.forEach((bar, i) => { const b = 20 + i, c = prog[b];
    bar.forEach(([x, d, s]) => { N(b, x, d * 0.95, n(s), 0.62, 'rh'); N(b, x, d * 0.95, n(s) - 12, 0.3, 'rh'); });
    const r = rootIn(c, 2), vc = voicing(c, r + 7, r + 19); [r, vc[0], vc[1], vc[2] || vc[1] + 12, vc[1], vc[0], r + 12, vc[0]].forEach((m, k) => N(b, k / 2, 0.48, m, k === 0 ? 0.5 : 0.36, 'lh'));
    N(b, 0, 2, n(CEL[i]), 0.42, 'cello'); N(b, 2, 2, n(CEL[i]) - (i % 2 ? 3 : 2), 0.38, 'cello');
    voicing(c, 55, 67).forEach((m) => N(b, 0, 4, m, 0.26, 'str'));
    if (i % 2 === 1) [0, 2].forEach((q, k) => N(b, q + 1.5, 1.2, voicing(c, 84, 96)[k + 1] || 88, 0.2, 'bell')); });
  // ===== разработка 28-35: ломаные октавы шестнадцатыми, пульс октав в басу, струнные растут
  for (let b = 28; b < 36; b++) { const c = prog[b], p = (b - 28) / 7; const vc = voicing(c, 60, 84);
    for (let s = 0; s < 8; s++) { const m = vc[Math.min(vc.length - 1, (s + (b % 2) * 2) % vc.length)]; N(b, s / 2, 0.24, m, 0.5 + 0.25 * p, 'rh'); N(b, s / 2 + 0.25, 0.24, m + 12, 0.45 + 0.25 * p, 'rh'); }
    const r = rootIn(c, 1); for (let e = 0; e < 8; e++) { N(b, e / 2, 0.45, r, 0.48 + 0.2 * p, 'lh'); N(b, e / 2, 0.45, r + 12, 0.4 + 0.2 * p, 'lh'); }
    voicing(c, 52, 71).forEach((m) => N(b, 0, 4, m, 0.3 + 0.25 * p, 'str')); N(b, 0, 4, r - 12 < 24 ? r : r - 12, 0.4 + 0.2 * p, 'bass'); }
  // ===== кульминация 36-51: тема октавами сверху (+24), бас шестнадцатыми, оркестр
  for (let b = 36; b < 52; b++) { const c = prog[b]; const k = b < 44 ? THEME[b - 36] : ANSWER[b - 44];
    play(b, k, 0.88, 'rh', 24, true); play(b, k, 0.42, 'str', 12);
    bassOst(b, c, 0.62); voicing(c, 52, 67).forEach((m) => N(b, 0, 4, m, 0.36, 'str'));
    N(b, 0, 2, rootIn(c, 1), 0.45, 'bass'); N(b, 2, 2, rootIn(c, 1), 0.38, 'bass');
    if (b % 2 === 0) [1, 3].forEach((q, j) => N(b, q + 0.5, 1, voicing(c, 88, 100)[j] || 91, 0.24, 'bell')); }
  // ===== кода 52-59: аккорды восьмыми с акцентом 3+3+2, взлёт гаммой, удар
  for (let b = 52; b < 56; b++) { const c = prog[b]; const vc = voicing(c, 64, 79).slice(-3); const r = rootIn(c, 2);
    for (let e = 0; e < 8; e++) { const acc = [0, 3, 6].includes(e); vc.forEach((m) => N(b, e / 2, 0.4, m, acc ? 0.95 : 0.6, 'rh')); N(b, e / 2, 0.4, r, acc ? 0.9 : 0.6, 'lh'); N(b, e / 2, 0.4, r - 12, acc ? 0.8 : 0.5, 'lh'); }
    voicing(c, 52, 71).forEach((m) => N(b, 0, 4, m, 0.5, 'str')); N(b, 0, 4, rootIn(c, 1), 0.7, 'bass'); }
  const SCALE = [0, 2, 3, 5, 7, 8, 11].map((x) => x + 4); // ми гармонический минор
  const scaleNote = (i) => n('E4') + Math.floor(i / 7) * 12 + SCALE[((i % 7) + 7) % 7] - 4;
  for (let b = 56; b < 58; b++) for (let s = 0; s < 16; s++) { const i = (b - 56) * 16 + s; N(b, s / 4, 0.24, scaleNote(Math.floor(i * 0.6)), 0.55 + 0.4 * i / 32, 'rh'); N(b, s / 4, 0.24, scaleNote(Math.floor(i * 0.6)) - 24, 0.45 + 0.3 * i / 32, 'lh'); }
  [56, 57].forEach((b) => { voicing(prog[b], 52, 71).forEach((m) => N(b, 0, 4, m, 0.55, 'str')); N(b, 0, 4, rootIn(prog[b], 1), 0.7, 'bass'); });
  for (let b = 58; b < 60; b++) { const vc = voicing('B7', 59, 83); for (let s = 0; s < 16; s++) { N(b, s / 4, 0.24, vc[(s * 3) % vc.length], 0.7 + 0.25 * ((b - 58) * 16 + s) / 32, 'rh');
      if (s % 2 === 0) N(b, s / 4, 0.45, n('B1') + (s % 4 ? 12 : 0), 0.85, 'lh'); }
    voicing('B7', 47, 71).forEach((m) => N(b, 0, 4, m, 0.62, 'str')); N(b, 0, 4, n('B0'), 0.8, 'bass'); }
  // финальный аккорд
  ['E5', 'G5', 'B5', 'E6', 'E4', 'B4'].forEach((s) => N(60, 0, 5, n(s), 0.95, 'rh')); ['E2', 'E3', 'B3', 'E1'].forEach((s) => N(60, 0, 5, n(s), 0.95, 'lh'));
  ['E3', 'G3', 'B3', 'E4', 'G4', 'B4'].forEach((s) => N(60, 0, 6, n(s), 0.6, 'str')); N(60, 0, 6, n('E1'), 0.9, 'bass');
  N(61, 2, 2, n('E6'), 0.3, 'bell'); N(61, 2, 2, n('B6'), 0.2, 'bell');

  // --- литавры и удары
  const timp = (bar, beat, m, v) => drums.push({ t: (bar * 4 + beat) * BEAT, k: 'timp', m, v });
  for (let b = 34; b < 36; b++) for (let s = 0; s < 16; s++) timp(b, s / 4, n('B1'), 0.25 + 0.6 * ((b - 34) * 16 + s) / 32);
  for (let b = 36; b < 60; b++) { const r = rootIn(prog[b], 1); const tm = r > n('A2') ? r - 12 : r < n('E1') ? r + 12 : r; timp(b, 0, tm, 0.85); timp(b, 2, tm, 0.6);
    if (b >= 52) { timp(b, 1.5, tm, 0.55); timp(b, 3, tm, 0.7); } }
  for (let b = 58; b < 60; b++) for (let s = 0; s < 16; s++) timp(b, s / 4, n('B1'), 0.4 + 0.5 * ((b - 58) * 16 + s) / 32);
  drums.push({ t: 36 * BAR, k: 'boom', v: 1 }, { t: 44 * BAR, k: 'boom', v: 0.85 }, { t: 52 * BAR, k: 'boom', v: 0.9 }, { t: 60 * BAR, k: 'boom', v: 1 });
  timp(60, 0, n('E2'), 1);
  for (let b = 36; b < 60; b += 2) drums.push({ t: (b * 4 + 3.5) * BEAT, k: 'snare', v: 0.3 });

  notes.sort((a, b) => a.t - b.t);
  g.SONG = { BPM, BEAT, BAR, notes, chords, sections, drums, bars: prog.length, DUR: 61 * BAR + 3.5, key: 'E MINOR', title: 'Toccata in E minor', word: 'TOCCATA', sub: 'IN  E  MINOR' };
})(typeof window !== 'undefined' ? window : globalThis);
