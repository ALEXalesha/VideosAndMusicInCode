// Партитура «Waltz in A major»: 3/4, 168 BPM, 76 тактов. Вступление, тема, тема выше со струнными и виолончелью,
// средняя часть в фа-диез миноре, кульминация всем оркестром, кода. Один источник нот для синтеза и визуализации.
(function (g) {
  const BPM = 168, BEAT = 60 / BPM, M = 3, BAR = M * BEAT;
  const notes = [], chords = [], sections = [], drums = [];
  const N = (bar, beat, d, m, v, i) => notes.push({ t: (bar * M + beat) * BEAT, d: d * BEAT, m, v: Math.min(1, v), i });
  const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, Bb: 10, B: 11 };
  const n = (s) => { const m = s.match(/^([A-G](?:#|b)?)(-?\d)$/); return PC[m[1]] + 12 * (+m[2] + 1); };
  const CH = { A: ['A', 'A', [0, 4, 7]], E7: ['E7', 'E', [0, 4, 7, 10]], D: ['D', 'D', [0, 4, 7]], 'F#m': ['F♯m', 'F#', [0, 3, 7]], Bm: ['Bm', 'B', [0, 3, 7]],
    'C#7': ['C♯7', 'C#', [0, 4, 7, 10]], Dm: ['Dm', 'D', [0, 3, 7]] };
  const A1 = ['A', 'A', 'E7', 'E7', 'A', 'A', 'D', 'D', 'A', 'F#m', 'Bm', 'E7', 'A', 'D', 'E7', 'A'];
  const B1 = ['F#m', 'F#m', 'C#7', 'C#7', 'F#m', 'F#m', 'D', 'E7', 'Bm', 'Bm', 'F#m', 'F#m', 'D', 'E7', 'A', 'E7'];
  const prog = ['A', 'E7', 'A', 'E7', ...A1, ...A1, ...B1, ...A1, 'A', 'D', 'A', 'Dm', 'A', 'E7', 'A', 'A'];
  sections.push({ bar: 0, name: 'INTRO' }, { bar: 4, name: 'THEME' }, { bar: 20, name: 'REPRISE' }, { bar: 36, name: 'MINOR' }, { bar: 52, name: 'CLIMAX' }, { bar: 68, name: 'CODA' });
  prog.forEach((c, b) => chords.push({ t: b * BAR, name: CH[c][0] }));
  const rootPc = (c) => PC[CH[c][1]]; const tones = (c) => CH[c][2].map((s) => (rootPc(c) + s) % 12);
  const voicing = (c, lo, hi) => { const pcs = tones(c); const out = []; for (let m = lo; m <= hi; m++) if (pcs.includes(m % 12)) out.push(m); return out; };
  const rootIn = (c, oct) => rootPc(c) + 12 * (oct + 1);
  // мелодия темы и средней части: [доля, длительность, нота] на такт
  const TA = [[[0, 2, 'C#5'], [2, 1, 'E5']], [[0, 1.5, 'A5'], [1.5, 0.5, 'G#5'], [2, 1, 'F#5']], [[0, 2, 'E5'], [2, 1, 'D5']], [[0, 3, 'B4']],
    [[0, 2, 'C#5'], [2, 1, 'E5']], [[0, 1.5, 'A5'], [1.5, 0.5, 'B5'], [2, 1, 'C#6']], [[0, 2, 'D6'], [2, 1, 'C#6']], [[0, 3, 'A5']],
    [[0, 1, 'E5'], [1, 1, 'A5'], [2, 1, 'C#6']], [[0, 2, 'C#6'], [2, 1, 'A5']], [[0, 1, 'B5'], [1, 1, 'D6'], [2, 1, 'F#5']], [[0, 2, 'G#5'], [2, 1, 'B5']],
    [[0, 2, 'A5'], [2, 1, 'C#6']], [[0, 1.5, 'F#5'], [1.5, 0.5, 'A5'], [2, 1, 'D6']], [[0, 2, 'B5'], [2, 1, 'G#5']], [[0, 3, 'A5']]];
  const TB = [[[0, 2, 'C#5'], [2, 1, 'F#5']], [[0, 3, 'A5']], [[0, 2, 'G#5'], [2, 1, 'F5']], [[0, 3, 'C#5']],
    [[0, 2, 'F#5'], [2, 1, 'A5']], [[0, 3, 'C#6']], [[0, 2, 'D6'], [2, 1, 'B5']], [[0, 2, 'G#5'], [2, 1, 'E5']],
    [[0, 2, 'D5'], [2, 1, 'F#5']], [[0, 3, 'B5']], [[0, 2, 'A5'], [2, 1, 'C#6']], [[0, 3, 'F#5']],
    [[0, 1, 'F#5'], [1, 1, 'A5'], [2, 1, 'D6']], [[0, 2, 'B5'], [2, 1, 'G#5']], [[0, 3, 'A5']], [[0, 1, 'E5'], [1, 1, 'G#5'], [2, 1, 'B5']]];
  const mel = (bar, list, v, inst = 'rh', shift = 0, oct = false) => list.forEach(([b, d, s]) => { N(bar, b, d * 0.95, n(s) + shift, v, inst); if (oct) N(bar, b, d * 0.95, n(s) + shift - 12, v * 0.7, inst); });
  // левая рука: бас на раз, аккорд на два и три
  function waltzLH(bar, c, v) { const r = rootIn(c, 2); const bassN = bar % 2 ? r + 7 - (r + 7 > 52 ? 12 : 0) : r; N(bar, 0, 0.95, bassN, v * 1.1, 'lh');
    const vc = voicing(c, 55, 67).slice(0, 3); [1, 2].forEach((q) => vc.forEach((m) => N(bar, q, 0.7, m, v * 0.62, 'lh'))); }

  for (let b = 0; b < prog.length; b++) { const c = prog[b];
    const v = b < 4 ? 0.34 : b < 20 ? 0.42 : b < 36 ? 0.48 : b < 52 ? 0.5 : b < 68 ? 0.6 : 0.4 - (b - 68) * 0.02;
    if (b < 74) waltzLH(b, c, v); }
  // вступление: колокольчики
  [[0, 'E6'], [1, 'C#6'], [2, 'A5'], [3, 'B5']].forEach(([b, s]) => { N(b, 0, 2, n(s), 0.3, 'bell'); N(b, 2, 1, n(s) + 7 > 96 ? n(s) - 5 : n(s) + 7, 0.18, 'bell'); });
  // тема
  TA.forEach((bar, i) => mel(4 + i, bar, 0.58));
  // тема ещё раз: выше, струнные, виолончель отвечает
  TA.forEach((bar, i) => { mel(20 + i, bar, 0.62, 'rh', 12); mel(20 + i, bar, 0.28, 'str'); });
  const CEL = ['A3', 'C#4', 'B3', 'G#3', 'A3', 'E4', 'F#4', 'D4', 'C#4', 'A3', 'D4', 'E4', 'C#4', 'F#3', 'G#3', 'A3'];
  CEL.forEach((s, i) => N(20 + i, 0, 2.9, n(s), 0.4, 'cello'));
  for (let b = 20; b < 36; b++) voicing(prog[b], 57, 69).forEach((m) => N(b, 0, 3, m, 0.2, 'str'));
  // средняя часть: фа-диез минор, мелодия ниже и певуче, струнные растут
  TB.forEach((bar, i) => { mel(36 + i, bar, 0.6); mel(36 + i, bar, 0.26, 'cello', -24); });
  for (let b = 36; b < 52; b++) { voicing(prog[b], 54, 69).forEach((m) => N(b, 0, 3, m, 0.24 + 0.012 * (b - 36), 'str')); N(b, 0, 3, rootIn(prog[b], 1), 0.35, 'bass'); }
  // кульминация: октавы, оркестр, колокольчики
  TA.forEach((bar, i) => { mel(52 + i, bar, 0.82, 'rh', 12, true); mel(52 + i, bar, 0.42, 'str'); });
  for (let b = 52; b < 68; b++) { voicing(prog[b], 52, 71).forEach((m) => N(b, 0, 3, m, 0.34, 'str')); N(b, 0, 3, rootIn(prog[b], 1), 0.5, 'bass');
    if (b % 2 === 0) N(b, 1, 1.5, voicing(prog[b], 88, 100)[1] || 93, 0.22, 'bell'); }
  // кода: мотив затихает, ре минор на миг, последний аккорд
  mel(68, [[0, 2, 'C#6'], [2, 1, 'E6']], 0.5); mel(69, [[0, 3, 'F#6']], 0.45); mel(70, [[0, 2, 'E6'], [2, 1, 'C#6']], 0.42); mel(71, [[0, 3, 'F6']], 0.4);
  mel(72, [[0, 2, 'E6'], [2, 1, 'A5']], 0.38); mel(73, [[0, 2, 'B5'], [2, 1, 'G#5']], 0.36);
  ['A4', 'C#5', 'E5', 'A5'].forEach((s) => N(74, 0, 6, n(s), 0.4, 'rh')); ['A1', 'A2', 'E3'].forEach((s) => N(74, 0, 6, n(s), 0.42, 'lh'));
  ['A3', 'C#4', 'E4', 'A4'].forEach((s) => N(74, 0, 6, n(s), 0.3, 'str')); N(74, 0, 6, n('A1'), 0.4, 'bass'); N(75, 1, 2, n('A6'), 0.2, 'bell');
  for (let b = 68; b < 74; b++) voicing(prog[b], 57, 69).forEach((m) => N(b, 0, 3, m, 0.2, 'str'));
  drums.push({ t: 52 * BAR, k: 'boom', v: 0.6 }, { t: 74 * BAR, k: 'boom', v: 0.4 });
  for (let b = 52; b < 68; b++) drums.push({ t: b * BAR, k: 'shaker', v: 0.35 });

  notes.sort((a, b) => a.t - b.t);
  // ля мажор: фа, до, соль - диезы в ключе
  const spell = { 0: [0, '♮'], 1: [0, ''], 2: [1, ''], 3: [1, '♯'], 4: [2, ''], 5: [3, '♮'], 6: [3, ''], 7: [4, '♮'], 8: [4, ''], 9: [5, ''], 10: [6, '♭'], 11: [6, ''] };
  g.SONG = { BPM, BEAT, BAR, meter: M, notes, chords, sections, drums, bars: prog.length, DUR: 75 * BAR + 3.5, key: 'A MAJOR', title: 'Waltz in A major', word: 'WALTZ', sub: 'IN  A  MAJOR',
    spell, keysig: [['♯', 77, 53], ['♯', 72, 48], ['♯', 79, 55]] };
})(typeof window !== 'undefined' ? window : globalThis);
