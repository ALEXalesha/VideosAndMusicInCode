// Разметка времени ролика про крабика: 120 BPM, такт = 2 с, 46 тактов = 1:32. Общая для картинки и музыки.
(function (g) {
  const BPM = 120, BEAT = 60 / BPM, BAR = 4 * BEAT;
  const PLAN = [['boot', 6], ['walk', 6], ['build', 8], ['rocket', 8], ['space', 4], ['dance', 8], ['end', 6]];
  let t = 0;
  const secs = PLAN.map(([type, bars], i) => { const s = { type, bars, t0: t, len: bars * BAR, i }; t += bars * BAR; return s; });
  const at = (type, bar, beat = 0) => { const s = secs.find((x) => x.type === type); return s.t0 + bar * BAR + beat * BEAT; };
  // события, общие для звука и картинки
  const EV = {
    enter: at('boot', 1, 0.5),                    // Enter в терминале
    parts: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => at('boot', 2, k * 0.75 + 0.5)), // детали крабика встают на место
    blink: at('boot', 4, 0), hop: at('boot', 5, 0),
    stop: at('walk', 5, 0),                       // крабик замирает у края
    bridge: [at('build', 0, 2), at('build', 3, 2)],  // мост: 60 блоков
    cross: at('build', 4, 0), city: [at('build', 4, 0), at('build', 7, 3)],
    print: [at('rocket', 0, 1), at('rocket', 3, 0)], board: at('rocket', 3, 0),
    count: [1, 2, 3].map((k) => at('rocket', 4, k - 1 + 0.0)), ignite: at('rocket', 4, 3), lift: at('rocket', 5, 0),
    land: at('space', 3, 2), drop: at('dance', 0, 0), freeze: at('dance', 7, 3), sit: at('end', 0, 0),
  };
  const DUR = t;
  const kicks = [], claps = [], impacts = [];
  const four = (t0, bars, clap = true) => { for (let b = 0; b < bars * 4; b++) { kicks.push(t0 + b * BEAT); if (clap && b % 2) claps.push(t0 + b * BEAT); } };
  four(at('walk', 0), 5, false); four(at('build', 0), 8); four(at('rocket', 0), 4, false);
  four(at('dance', 0), 7); for (let b = 0; b < 3; b++) kicks.push(at('dance', 7, b));
  impacts.push({ t: EV.lift, a: 1 }, { t: EV.drop, a: 1 }, { t: EV.land, a: 0.5 }, { t: at('build', 4), a: 0.5 }, { t: EV.freeze, a: 0.7 }, { t: EV.parts[0], a: 0.3 });
  kicks.sort((a, b) => a - b); claps.sort((a, b) => a - b); impacts.sort((a, b) => a.t - b.t);
  g.TL = { BPM, BEAT, BAR, DUR, secs, at, EV, kicks, claps, impacts };
})(typeof window !== 'undefined' ? window : globalThis);
