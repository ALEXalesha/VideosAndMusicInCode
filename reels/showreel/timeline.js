// Разметка времени для картинки и музыки: 128 BPM, 64 такта = 2:00. Сцены по тактам.
(function (g) {
  const BPM = 128, BEAT = 60 / BPM, BAR = 4 * BEAT;
  const CUTS = {
    120: [['intro', 8], ['hero', 4], ['type', 4], ['fractal', 4], ['hole', 4], ['terrain', 4], ['city', 4],
      ['prism', 4], ['liquid', 4], ['tunnel', 4], ['particles', 8], ['montage', 4], ['end', 8]],
  };
  function build(cut) {
    let t = 0;
    const secs = CUTS[cut].map(([type, bars], i) => { const s = { type, bars, t0: t, len: bars * BAR, i }; t += bars * BAR; return s; });
    const kicks = [], claps = [], impacts = [], count = [], words = [], cuts = [];
    let gap = null;
    const drums = ['hero', 'type', 'terrain', 'city', 'particles'];
    for (const s of secs) {
      const nb = s.bars * 4, at = (b) => s.t0 + b * BEAT;
      if (drums.includes(s.type)) for (let b = 0; b < nb; b++) { kicks.push(at(b)); if (b % 2) claps.push(at(b)); }
      if (s.type === 'intro') for (const b of [1, 2, 3]) count.push(at(nb - 4 + b));
      if (s.type === 'type') for (let b = 0; b < nb; b += 4) words.push(at(b)); // слово держится такт
      if (s.type === 'fractal' || s.type === 'hole') for (let b = 0; b < nb; b += 4) { kicks.push(at(b), at(b + 2.5)); claps.push(at(b + 2)); }
      if (s.type === 'tunnel') { for (let b = 0; b < nb - 4; b++) { kicks.push(at(b)); if (b >= 8 && b % 2) claps.push(at(b)); } gap = [s.t0 + s.len - BEAT / 4, s.t0 + s.len]; }
      if (s.type === 'montage') for (let b = 0; b < nb; b++) { kicks.push(at(b)); if (b % 2 === 0) cuts.push(at(b)); else claps.push(at(b)); }
      if (s.type === 'end') kicks.push(at(0));
      const imp = { hero: 1, type: 0.35, fractal: 0.5, hole: 0.6, terrain: 0.45, city: 0.7, prism: 0.3, liquid: 0.25, particles: 1, montage: 0.6, end: 0.8 }[s.type];
      if (imp) impacts.push({ t: s.t0, a: imp });
      if (s.type === 'particles') impacts.push({ t: s.t0 + 2 * BAR, a: 0.55 });
    }
    impacts.sort((a, b) => a.t - b.t); kicks.sort((a, b) => a - b); claps.sort((a, b) => a - b);
    return { BPM, BEAT, BAR, cut, DUR: t, secs, kicks, claps, impacts, count, words, cuts, gap };
  }
  let cut = g.CUT || 120;
  if (typeof location !== 'undefined') cut = +(new URLSearchParams(location.search).get('cut') || cut);
  g.TL = build(+cut);
})(typeof window !== 'undefined' ? window : globalThis);
