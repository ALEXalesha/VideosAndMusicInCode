// Партитура «Nocturne in D minor»: один источник нот для синтеза и для визуализации.
(function (g) {
  const BPM = 84, BEAT = 60 / BPM, BAR = 4 * BEAT;
  const notes = []; // {t, d, m, v, i}  i: rh, lh, str, bass, bell, cello
  const chords = [], sections = [], drums = [];
  const N = (bar, beat, d, m, v, i) => notes.push({ t: (bar * 4 + beat) * BEAT, d: d * BEAT, m, v, i });
  const PC = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
  const n = (s) => { const m = s.match(/^([A-G](?:#|b)?)(-?\d)$/); return PC[m[1]] + 12 * (+m[2] + 1); };
  const CH = { // название, корень, ступени (полутоны от корня)
    Dm: ['Dm', 'D', [0, 3, 7]], Bb: ['B♭', 'Bb', [0, 4, 7]], F: ['F', 'F', [0, 4, 7]], C: ['C', 'C', [0, 4, 7]],
    Gm: ['Gm', 'G', [0, 3, 7]], A: ['A', 'A', [0, 4, 7]], A7: ['A7', 'A', [0, 4, 7, 10]], Am: ['Am', 'A', [0, 3, 7]],
    Asus: ['Asus4', 'A', [0, 5, 7]], D: ['D', 'D', [0, 4, 7]], Gm6: ['Gm/A', 'A', [0, 3, 7]] };
  const prog = [
    'Dm', 'Bb', 'F', 'C',                               // 0-3   вступление
    'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A7',       // 4-11  тема
    'Bb', 'C', 'Am', 'Dm', 'Gm', 'C', 'F', 'A',         // 12-19 бридж
    'Dm', 'Bb', 'F', 'C', 'Gm', 'Bb', 'Asus', 'A',      // 20-27 кульминация
    'Dm', 'Bb', 'F', 'C',                               // 28-31 вершина
    'Dm', 'Bb', 'A7', 'D'];                            // 32-35 кода
  sections.push({ bar: 0, name: 'PRELUDE' }, { bar: 4, name: 'THEME' }, { bar: 12, name: 'BRIDGE' }, { bar: 20, name: 'CRESCENDO' }, { bar: 28, name: 'APEX' }, { bar: 32, name: 'CODA' });
  const root = (c) => PC[CH[c][1]] + 36;                // корень в октаве 2
  prog.forEach((c, b) => chords.push({ t: b * BAR, name: CH[c][0] }));

  // --- мелодия (правая рука): [доля, длительность, нота]
  const M = {
    m1: [[0, 1, 'D5'], [1, 0.5, 'E5'], [1.5, 1.5, 'F5'], [3, 1, 'A5']],
    m2: [[0, 1.5, 'G5'], [1.5, 0.5, 'F5'], [2, 2, 'D5']],
    m3: [[0, 1, 'C5'], [1, 0.5, 'D5'], [1.5, 1.5, 'F5'], [3, 1, 'E5']],
    m4: [[0, 1.5, 'E5'], [1.5, 0.5, 'D5'], [2, 1, 'C5'], [3, 1, 'E5']],
    v2: [[0, 1.5, 'G5'], [1.5, 0.5, 'A5'], [2, 2, 'Bb5']],
    v3: [[0, 1, 'A5'], [1, 1, 'G5'], [2, 1, 'F5'], [3, 1, 'E5']],
    v4: [[0, 2, 'E5'], [2, 1, 'C#5'], [3, 1, 'A4']],
    b1: [[0, 2, 'F5'], [2, 1, 'D5'], [3, 1, 'F5']], b2: [[0, 2, 'G5'], [2, 1, 'E5'], [3, 1, 'G5']],
    b3: [[0, 1.5, 'A5'], [1.5, 0.5, 'C6'], [2, 1, 'A5'], [3, 1, 'G5']], b4: [[0, 3, 'F5'], [3, 0.5, 'E5'], [3.5, 0.5, 'D5']],
    b5: [[0, 1.5, 'Bb5'], [1.5, 0.5, 'A5'], [2, 1, 'G5'], [3, 1, 'D5']], b6: [[0, 1, 'E5'], [1, 1, 'F5'], [2, 2, 'G5']],
    b7: [[0, 1.5, 'A5'], [1.5, 0.5, 'G5'], [2, 1, 'F5'], [3, 1, 'C5']], b8: [[0, 2, 'C#5'], [2, 1, 'E5'], [3, 0.5, 'A5'], [3.5, 0.5, 'C#6']],
    c7: [[0, 2, 'D6'], [2, 1, 'C6'], [3, 1, 'Bb5']], c8: [[0, 1, 'A5'], [1, 1, 'G5'], [2, 1, 'E5'], [3, 0.5, 'C#5'], [3.5, 0.5, 'E5']],
    o1: [[0, 1, 'D5'], [1, 0.5, 'E5'], [1.5, 2.5, 'F5']], o2: [[0, 1, 'F5'], [1, 1, 'E5'], [2, 2, 'D5']],
    o3: [[0, 2, 'E5'], [2, 2, 'C#5']], o4: [[0, 4, 'D5']],
  };
  const play = (bar, key, vel, inst = 'rh', shift = 0, durMul = 1) => M[key].forEach(([b, d, s]) => N(bar, b, d * durMul, n(s) + shift, vel, inst));
  // вступление: мотив тихо, с паузами
  play(0, 'm1', 0.42); play(1, 'm2', 0.4); play(2, 'm3', 0.42); play(3, 'm4', 0.45);
  // тема
  ['m1', 'm2', 'm3', 'm4', 'm1', 'v2', 'v3', 'v4'].forEach((k, i) => play(4 + i, k, 0.55 + i * 0.02));
  // бридж
  ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'].forEach((k, i) => play(12 + i, k, 0.6 + i * 0.02));
  // кульминация: мелодия + октава ниже в струнных
  ['m1', 'm2', 'm3', 'm4', 'm1', 'v2', 'c7', 'c8'].forEach((k, i) => { play(20 + i, k, 0.75); play(20 + i, k, 0.5, 'str', -12); });
  // вершина: на октаву выше + колокольчики
  ['m1', 'm2', 'm3', 'm4'].forEach((k, i) => { play(28 + i, k, 0.85, 'rh', 12); play(28 + i, k, 0.55, 'str'); play(28 + i, k, 0.3, 'bell', 12); });
  // кода
  ['o1', 'o2', 'o3'].forEach((k, i) => play(32 + i, k, 0.5 - i * 0.05, 'rh', 0, 1));
  N(35, 0, 6, n('D5'), 0.42, 'rh'); N(35, 0, 6, n('F#4'), 0.32, 'rh'); N(35, 0, 6, n('A4'), 0.32, 'rh');

  // --- левая рука и аккомпанемент
  const tones = (c, base) => CH[c][2].map((s) => base + s);
  prog.forEach((c, b) => { const r = root(c); const tri = CH[c][2];
    const third = r + 12 + tri[1], fifth = r + tri[2];
    if (b < 4) { N(b, 0, 4, r, 0.4, 'lh'); N(b, 0, 4, r + 12, 0.32, 'lh'); N(b, 2, 2, fifth + 12, 0.28, 'lh'); }
    else if (b < 12 || (b >= 28 && b < 32)) { const pat = [r, fifth, r + 12, third, fifth + 12, third, r + 12, fifth];
      pat.forEach((m, k) => N(b, k / 2, 4 - k / 2, m, (k === 0 ? 0.5 : 0.36) * (b >= 28 ? 1.25 : 1), 'lh')); }
    else if (b < 20) { const pat = [r, fifth, r + 12, third + 12 > 76 ? third : third, r + 12, fifth];
      pat.forEach((m, k) => N(b, k * 2 / 3, 4 - k * 2 / 3, m, k === 0 ? 0.5 : 0.34, 'lh')); }
    else if (b < 28) { N(b, 0, 2, r, 0.62, 'lh'); N(b, 0, 2, r + 12, 0.52, 'lh');
      [1, 2, 3].forEach((q) => tones(c, r + 24).forEach((m) => N(b, q - 0.5 + 0.5, 0.45, m, 0.36, 'lh'))); N(b, 2, 2, r + 12, 0.48, 'lh'); }
    else { if (b < 35) [0, 1, 2, 3].forEach((q) => N(b, q, 4 - q, [r, fifth, r + 12, third][q], 0.34 - (b - 32) * 0.04, 'lh'));
      else { N(b, 0, 6, n('D2'), 0.4, 'lh'); N(b, 0, 6, n('D3'), 0.32, 'lh'); N(b, 0.5, 5.5, n('A3'), 0.26, 'lh'); } }
    // струнные - аккорд целыми нотами с бриджа
    if (b >= 12 && b < 35) { const v = b < 20 ? 0.32 : b < 28 ? 0.42 : b < 32 ? 0.5 : 0.28;
      tones(c, r + 12).forEach((m) => N(b, 0, 4, m < 50 ? m + 12 : m, v, 'str')); }
    if (b === 35) [n('D3'), n('F#3'), n('A3'), n('D4')].forEach((m) => N(b, 0, 6, m, 0.3, 'str'));
    // бас
    if (b >= 12 && b < 35) { N(b, 0, b >= 20 ? 2 : 4, r - 12 < 28 ? r : r - 12, b >= 20 ? 0.6 : 0.45, 'bass'); if (b >= 20) N(b, 2, 2, r - 12 < 28 ? r : r - 12, 0.5, 'bass'); }
    if (b === 35) N(b, 0, 6, n('D1'), 0.5, 'bass');
    // колокольчики - мерцание в бридже
    if (b >= 12 && b < 20) [1, 3].forEach((q, k) => N(b, q + 0.5 * k, 1.5, tones(c, r + 36)[k + 1] , 0.22, 'bell'));
    // виолончель - встречный голос в бридже
  });
  ['D4', 'E4', 'C4', 'D4', 'Bb3', 'C4', 'A3', 'C#4'].forEach((s, i) => { N(12 + i, 0, 2, n(s), 0.4, 'cello'); N(12 + i, 2, 2, n(s) + (i % 2 ? -2 : 2), 0.36, 'cello'); });

  // --- ударные: кульминация и вершина
  for (let b = 20; b < 32; b++) { drums.push({ t: b * BAR, k: 'kick', v: b === 20 || b === 28 ? 1 : 0.7 }); drums.push({ t: (b * 4 + 2.5) * BEAT, k: 'kick', v: 0.45 });
    drums.push({ t: (b * 4 + 2) * BEAT, k: 'snare', v: 0.55 });
    for (let e = 0; e < 8; e++) drums.push({ t: (b * 4 + e / 2) * BEAT, k: 'shaker', v: e % 2 ? 0.5 : 0.3 }); }
  drums.push({ t: 20 * BAR, k: 'boom', v: 0.9 }, { t: 28 * BAR, k: 'boom', v: 1 }, { t: 35 * BAR, k: 'boom', v: 0.55 });
  for (let i = 0; i < 8; i++) drums.push({ t: (27 * 4 + 2 + i * 0.25) * BEAT, k: 'snare', v: 0.25 + i * 0.07 }); // дробь к вершине

  notes.sort((a, b) => a.t - b.t);
  g.SONG = { BPM, BEAT, BAR, notes, chords, sections, drums, bars: prog.length, DUR: 35 * BAR + 7, key: 'D MINOR', title: 'Nocturne in D minor' };
})(typeof window !== 'undefined' ? window : globalThis);
