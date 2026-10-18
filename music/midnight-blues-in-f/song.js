// Партитура «Midnight Blues in F»: джазовый блюз, 12 тактов x 4 квадрата + вступление и концовка, 100 BPM, свинг (вторая восьмая на 2/3 доли).
// Шагающий бас, аккорды без баса (терция, септима, нона) в ритме «чарльстон», щётки; тема - соло - соло громче - тема и концовка.
(function (g) {
  const BPM = 100, BEAT = 60 / BPM, BAR = 4 * BEAT;
  const notes = [], chords = [], sections = [], drums = [];
  const SW = (b) => { const i = Math.floor(b + 1e-6), f = b - i; return i + (Math.abs(f - 0.5) < 1e-6 ? 2 / 3 : f); }; // свинг: «и» доли сдвинуто на 2/3
  const N = (bar, beat, d, m, v, i) => notes.push({ t: (bar * 4 + SW(beat)) * BEAT, d: d * BEAT, m, v: Math.min(1, v), i });
  const PC = { C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
  const n = (s) => { const m = s.match(/^([A-G](?:#|b)?)(-?\d)$/); return PC[m[1]] + 12 * (+m[2] + 1); };
  const CH = { F7: ['F7', 'F', [0, 4, 7, 10, 14]], Bb7: ['B♭7', 'Bb', [0, 4, 7, 10, 14]], C7: ['C7', 'C', [0, 4, 7, 10, 14]], Gm7: ['Gm7', 'G', [0, 3, 7, 10, 14]],
    D7: ['D7♭9', 'D', [0, 4, 7, 10, 13]], F13: ['F13', 'F', [0, 4, 10, 14, 21]], Db7: ['D♭7', 'Db', [0, 4, 7, 10, 14]] };
  const CHORUS = ['F7', 'Bb7', 'F7', 'F7', 'Bb7', 'Bb7', 'F7', 'D7', 'Gm7', 'C7', 'F7', 'C7'];
  const prog = ['C7', 'C7', ...CHORUS, ...CHORUS, ...CHORUS, ...CHORUS, 'Db7', 'F13'];
  sections.push({ bar: 0, name: 'INTRO' }, { bar: 2, name: 'HEAD' }, { bar: 14, name: 'SOLO' }, { bar: 26, name: 'SOLO II' }, { bar: 38, name: 'HEAD OUT' }, { bar: 50, name: 'ENDING' });
  prog.forEach((c, b) => chords.push({ t: b * BAR, name: CH[c][0] }));
  const root = (c) => PC[CH[c][1]];
  // шагающий бас: корень, ступени, хроматический подход к следующему корню
  function walk(bar, c, next, v) { const r = root(c) + 36 < 38 ? root(c) + 48 : root(c) + 36; const nr = root(next) + 36 < 38 ? root(next) + 48 : root(next) + 36;
    const third = r + CH[c][2][1], fifth = r + 7; const appr = nr + (nr > r ? -1 : 1);
    [r, bar % 2 ? fifth : third, bar % 2 ? r + 9 : fifth, appr].forEach((m, k) => N(bar, k, 0.9, m, v * (k === 0 ? 1 : 0.85), 'bass')); }
  // аккорды без баса: терция, септима, нона (левая рука), «чарльстон»: раз и «и» двух
  function comp(bar, c, v) { const r = root(c); const iv = CH[c][2]; const vc = [iv[1], iv[3], iv[4]].map((x) => { let m = 48 + ((r + x) % 12); if (m < 52) m += 12; return m; }).sort((a, b) => a - b);
    const hits = bar % 4 === 3 ? [[0, 1.2], [2.5, 0.6]] : [[0, 1.2], [1.5, 0.5]]; hits.forEach(([b, d]) => vc.forEach((m) => N(bar, b, d, m, v, 'lh'))); }
  // тема
  const HEAD = [
    [[0, 1, 'F5'], [1.5, 0.5, 'Ab5'], [2, 0.5, 'A5'], [2.5, 0.5, 'C6'], [3, 1, 'A5']], [[0, 0.5, 'F5'], [0.5, 0.5, 'Eb5'], [1, 2, 'F5'], [3, 0.5, 'C5'], [3.5, 0.5, 'D5']],
    [[0, 1, 'F5'], [1.5, 0.5, 'Ab5'], [2, 0.5, 'A5'], [2.5, 0.5, 'C6'], [3, 1, 'A5']], [[0, 0.5, 'F5'], [0.5, 0.5, 'Eb5'], [1, 2.5, 'F5']],
    [[0, 1, 'Bb5'], [1.5, 0.5, 'Db6'], [2, 0.5, 'D6'], [2.5, 0.5, 'F6'], [3, 1, 'D6']], [[0, 0.5, 'Bb5'], [0.5, 0.5, 'Ab5'], [1, 2, 'Bb5'], [3, 0.5, 'F5'], [3.5, 0.5, 'G5']],
    [[0, 1, 'A5'], [1, 0.5, 'C6'], [1.5, 0.5, 'A5'], [2, 1, 'F5']], [[0, 1, 'F#5'], [1, 1, 'A5'], [2, 1, 'C6'], [3, 1, 'Eb6']],
    [[0, 1.5, 'D6'], [1.5, 0.5, 'Bb5'], [2, 1, 'G5'], [3, 1, 'F5']], [[0, 1, 'E5'], [1, 0.5, 'G5'], [1.5, 0.5, 'Bb5'], [2, 1.5, 'C6']],
    [[0, 0.5, 'C5'], [0.5, 0.5, 'Eb5'], [1, 0.5, 'F5'], [1.5, 2.5, 'A5']], [[0, 1, 'G5'], [1, 1, 'E5'], [2, 2, 'C5']]];
  const head = (bar0, v, oct = false) => HEAD.forEach((bar, i) => bar.forEach(([b, d, s]) => { N(bar0 + i, b, d * 0.92, n(s), v, 'rh'); if (oct) N(bar0 + i, b, d * 0.92, n(s) - 12, v * 0.7, 'rh'); }));
  // соло: фразы из блюзовой гаммы фа (F Ab Bb B C Eb) и звуков аккорда, по тактам, с паузами; зерно - чтобы ноты не менялись
  let seed = 11; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const BLUES = [0, 3, 5, 6, 7, 10].map((x) => x + 5);
  const scaleAt = (k) => 65 + Math.floor(k / 6) * 12 + BLUES[((k % 6) + 6) % 6] - 5;
  function solo(bar0, v, hot) { let k = 6 + Math.floor(rnd() * 4);
    for (let i = 0; i < 12; i++) { const c = CHORUS[i]; const r = root(c); const rest = !hot && i % 4 === 3;
      const steps = hot ? 8 : 6 + (i % 2) * 2; for (let s = 0; s < 8; s++) { if (rest && s >= 4) break; if (!hot && s < 8 - steps) continue;
        const b = s * 0.5; k += rnd() < 0.55 ? (rnd() < 0.5 ? -1 : 1) : (rnd() < 0.5 ? -2 : 2); k = Math.max(3, Math.min(14, k));
        let m = scaleAt(k); if (s === 0) { const ct = [0, 4, 7, 10].map((x) => (r + x) % 12); let best = m, bd = 99; for (let mm = m - 3; mm <= m + 3; mm++) if (ct.includes(mm % 12) && Math.abs(mm - m) < bd) { bd = Math.abs(mm - m); best = mm; } m = best; }
        N(bar0 + i, b, 0.46, m, v * (s % 2 ? 0.8 : 1), 'rh'); if (hot && s % 2 === 0) N(bar0 + i, b, 0.46, m - 12, v * 0.55, 'rh'); }
      if (hot && i % 4 === 3) { const t0 = 3; for (let j = 0; j < 3; j++) N(bar0 + i, t0 + j / 3, 0.3, scaleAt(k + 2 - j), v * 0.9, 'rh'); } } }
  // вступление: две такта на C7 - аккорд и подход баса
  [0, 1].forEach((b) => { comp(b, 'C7', 0.4); N(b, 0, 4, n('C3'), 0.4, 'bass'); });
  N(1, 2, 0.5, n('Bb4'), 0.4, 'rh'); N(1, 2.5, 0.5, n('B4'), 0.42, 'rh'); N(1, 3, 1, n('C5'), 0.45, 'rh');
  head(2, 0.6); solo(14, 0.55, false); solo(26, 0.68, true); head(38, 0.72, true);
  for (let b = 2; b < 50; b++) { const c = prog[b], nx = prog[b + 1] || 'F7'; const ch = Math.floor((b - 2) / 12);
    walk(b, c, nx, [0.5, 0.55, 0.65, 0.65][ch]); comp(b, c, [0.36, 0.4, 0.48, 0.46][ch]); }
  // струнные тянут аккорды во втором соло и в теме на выход
  for (let b = 26; b < 50; b++) { const r = root(prog[b]); [4, 10, 14].forEach((x) => N(b, 0, 4, 60 + ((r + x) % 12) + (60 + ((r + x) % 12) < 62 ? 12 : 0), 0.22, 'str')); }
  // концовка: D♭7 -> F13, хроматический спуск, долгий аккорд
  ['Ab5', 'G5', 'Gb5', 'F5'].forEach((s, k) => N(50, k * 0.5, 0.45, n(s), 0.6, 'rh')); N(50, 2, 2, n('Eb5'), 0.55, 'rh'); comp(50, 'Db7', 0.45); N(50, 0, 4, n('Db2'), 0.6, 'bass');
  ['A4', 'D5', 'Eb5', 'G5', 'C6'].forEach((s) => N(51, 0, 8, n(s), 0.55, 'rh')); ['F2', 'F3', 'Eb4'].forEach((s) => N(51, 0, 8, n(s), 0.5, 'lh')); N(51, 0, 8, n('F1'), 0.6, 'bass');
  N(52, 1, 2, n('F6'), 0.2, 'bell'); N(52, 1.5, 2, n('C7'), 0.15, 'bell');
  // щётки: шорох на каждую долю и свинговую восьмую, мягкий малый на 2 и 4, ножка на раз
  for (let b = 2; b < 51; b++) { const ch = Math.floor((b - 2) / 12), v = [0.5, 0.55, 0.7, 0.65][Math.min(3, ch)] || 0.5;
    for (let q = 0; q < 4; q++) { drums.push({ t: (b * 4 + q) * BEAT, k: 'shaker', v: v * 0.8 }); if (q % 2) drums.push({ t: (b * 4 + q + 2 / 3) * BEAT, k: 'shaker', v: v * 0.5 }); }
    [1, 3].forEach((q) => drums.push({ t: (b * 4 + q) * BEAT, k: 'snare', v: v * 0.35 })); drums.push({ t: b * 4 * BEAT, k: 'kick', v: v * 0.45 }); }
  drums.push({ t: 51 * BAR, k: 'boom', v: 0.5 });

  notes.sort((a, b) => a.t - b.t);
  // фа мажор: си-бемоль в ключе
  const spell = { 0: [0, ''], 1: [1, '♭'], 2: [1, ''], 3: [2, '♭'], 4: [2, ''], 5: [3, ''], 6: [3, '♯'], 7: [4, ''], 8: [5, '♭'], 9: [5, ''], 10: [6, ''], 11: [6, '♮'] };
  g.SONG = { BPM, BEAT, BAR, notes, chords, sections, drums, bars: prog.length, DUR: 51 * BAR + 6, key: 'F · SWING', title: 'Midnight Blues in F', word: 'MIDNIGHT', sub: 'BLUES  IN  F',
    spell, keysig: [['♭', 71, 47]] };
})(typeof window !== 'undefined' ? window : globalThis);
