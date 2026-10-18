// Партитура «Lullaby in E-flat major»: 3/4, 72 BPM, 40 тактов. Шкатулка (колокольчики) поёт тему, фортепиано качает
// ломаными аккордами (бас - квинта - терция), струнные дышат во второй половине, в конце шкатулка замедляется и затихает.
(function (g) {
  const BPM = 72, BEAT = 60 / BPM, M = 3, BAR = M * BEAT;
  const notes = [], chords = [], sections = [], drums = [];
  const N = (bar, beat, d, m, v, i) => notes.push({ t: (bar * M + beat) * BEAT, d: d * BEAT, m, v: Math.min(1, v), i });
  const PC = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
  const n = (s) => { const m = s.match(/^([A-G]b?)(-?\d)$/); return PC[m[1]] + 12 * (+m[2] + 1); };
  const CH = { Eb: ['E♭', 'Eb', [0, 4, 7]], Ab: ['A♭', 'Ab', [0, 4, 7]], Bb7: ['B♭7', 'Bb', [0, 4, 7, 10]], Cm: ['Cm', 'C', [0, 3, 7]], Fm: ['Fm', 'F', [0, 3, 7]],
    Gm: ['Gm', 'G', [0, 3, 7]], Abm: ['A♭m', 'Ab', [0, 3, 7]], Bb: ['B♭', 'Bb', [0, 4, 7]] };
  const T = ['Eb', 'Eb', 'Ab', 'Eb', 'Cm', 'Fm', 'Bb7', 'Bb7', 'Eb', 'Gm', 'Ab', 'Eb', 'Fm', 'Bb7', 'Eb', 'Eb'];
  const prog = ['Eb', 'Bb7', ...T, 'Cm', 'Gm', 'Ab', 'Eb', 'Fm', 'Abm', 'Eb', 'Bb', ...T.slice(0, 12), 'Ab', 'Abm', 'Eb', 'Eb'];
  sections.push({ bar: 0, name: 'MUSIC BOX' }, { bar: 2, name: 'SONG' }, { bar: 18, name: 'DREAM' }, { bar: 26, name: 'SONG AGAIN' }, { bar: 38, name: 'SLEEP' });
  prog.forEach((c, b) => chords.push({ t: b * BAR, name: CH[c][0] }));
  const rootPc = (c) => PC[CH[c][1]];
  function rock(bar, c, v) { const r = rootPc(c) + 36 < 39 ? rootPc(c) + 48 : rootPc(c) + 36; const third = r + 12 + CH[c][2][1];
    [[0, r, 1.1], [1, r + 7, 0.8], [2, third, 0.75]].forEach(([b, m, k]) => N(bar, b, 2.9 - b, m, v * k, 'lh')); }
  const TH = [[[0, 2, 'G5'], [2, 1, 'Bb5']], [[0, 3, 'G5']], [[0, 1, 'F5'], [1, 1, 'Ab5'], [2, 1, 'C6']], [[0, 3, 'Bb5']],
    [[0, 2, 'G5'], [2, 1, 'Eb5']], [[0, 2, 'F5'], [2, 1, 'Ab5']], [[0, 1, 'G5'], [1, 1, 'F5'], [2, 1, 'D5']], [[0, 3, 'F5']],
    [[0, 2, 'G5'], [2, 1, 'Bb5']], [[0, 2, 'Bb5'], [2, 1, 'D6']], [[0, 1, 'C6'], [1, 1, 'Eb6'], [2, 1, 'C6']], [[0, 3, 'Bb5']],
    [[0, 1.5, 'Ab5'], [1.5, 0.5, 'G5'], [2, 1, 'F5']], [[0, 2, 'D5'], [2, 1, 'F5']], [[0, 3, 'Eb5']], [[0, 3, 'Eb5']]];
  const DR = [[[0, 2, 'C6'], [2, 1, 'Eb6']], [[0, 3, 'D6']], [[0, 1, 'C6'], [1, 1, 'Ab5'], [2, 1, 'Eb5']], [[0, 3, 'G5']],
    [[0, 2, 'Ab5'], [2, 1, 'C6']], [[0, 2, 'Cb6'], [2, 1, 'Ab5']], [[0, 3, 'G5']], [[0, 2, 'F5'], [2, 1, 'D5']]];
  const play = (bar0, list, v, inst, shift = 0) => list.forEach((bar, i) => bar.forEach(([b, d, s]) => N(bar0 + i, b, d * 0.95, (s === 'Cb6' ? 83 : n(s)) + shift, v, inst)));
  for (let b = 0; b < prog.length - 2; b++) rock(b, prog[b], b < 2 ? 0.3 : b < 18 ? 0.36 : b < 26 ? 0.4 : 0.38 - Math.max(0, b - 34) * 0.03);
  [[0, 'Bb6'], [0.5, 'G6'], [1, 'Eb6'], [2, 'Bb5'], [3, 'F6'], [4, 'D6']].forEach(([x, s]) => N(Math.floor(x / 3 * 3 / 3), (x * 1) % 3, 1.5, n(s), 0.25, 'bell'));
  play(2, TH, 0.3, 'bell', 12); play(2, TH, 0.42, 'rh');                         // песня: шкатулка + тихое фортепиано
  play(18, DR, 0.48, 'rh'); play(18, DR, 0.22, 'bell', 12);                     // сон: тема фортепиано, струнные дышат
  for (let b = 18; b < 26; b++) { const r = rootPc(prog[b]); [r + 55, r + 59 + (CH[prog[b]][2][1] - 4), r + 62].forEach((m) => N(b, 0, 3, m, 0.2, 'str')); N(b, 0, 3, rootPc(prog[b]) + 36, 0.3, 'cello'); }
  play(26, TH.slice(0, 12), 0.5, 'rh'); play(26, TH.slice(0, 12), 0.26, 'str', -12); play(26, TH.slice(0, 12), 0.24, 'bell', 12);
  // конец: шкатулка «заводится» всё медленнее, последний аккорд
  [[38, 0, 'G5'], [38, 1.2, 'Bb5'], [38, 2.6, 'Eb6'], [39, 1, 'D6'], [40, 0, 'Eb6']].forEach(([b, x, s], k) => N(b, x, 2.5, n(s) + 12, 0.28 - k * 0.03, 'bell'));
  ['Eb4', 'G4', 'Bb4', 'Eb5'].forEach((s) => N(40, 0, 6, n(s), 0.3, 'rh')); ['Eb2', 'Bb2'].forEach((s) => N(40, 0, 6, n(s), 0.32, 'lh')); N(40, 0, 6, n('Eb3'), 0.22, 'str');
  notes.sort((a, b) => a.t - b.t);
  // ми-бемоль мажор: си, ми, ля - бемоли в ключе
  const spell = { 0: [0, ''], 1: [1, '♭'], 2: [1, ''], 3: [2, ''], 4: [2, '♮'], 5: [3, ''], 6: [4, '♭'], 7: [4, ''], 8: [5, ''], 9: [5, '♮'], 10: [6, ''], 11: [6, '♮'] };
  g.SONG = { BPM, BEAT, BAR, meter: M, notes, chords, sections, drums, bars: prog.length + 1, DUR: 40 * BAR + 7, key: 'E♭ MAJOR', title: 'Lullaby in E-flat major', word: 'LULLABY', sub: 'IN  E♭  MAJOR',
    spell, keysig: [['♭', 71, 47], ['♭', 76, 52], ['♭', 69, 45]] };
})(typeof window !== 'undefined' ? window : globalThis);
