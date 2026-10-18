// Рендер шоурила 2:00: скрытый Chromium на видеокарте -> PNG-кадры -> ffmpeg.
// node render.cjs preview t=10,20.5 [res=1080]         - кадры по секундам в preview/
// node render.cjs full res=720 fps=30 sub=2 ss=1       - черновик video_720_30.mp4
// node render.cjs full res=2160 fps=240                - финал video_2160_240.mp4 (ss 1.5, без подкадров)
// node render.cjs check res=1080 fps=10 sub=1 ss=1     - законы читаемости, отчёт в check/
// node render.cjs text fps=30                          - только законы текста (без GL), быстро
const { chromium } = require('playwright');
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
(async () => {
  const mode = process.argv[2] || 'preview';
  const res = +arg('res', 1080), FPS = +arg('fps', 60), K = res / 1080;
  const q = new URLSearchParams({ cut: '120', k: String(K), fps: String(FPS) });
  for (const k of ['ss', 'sub']) if (arg(k)) q.set(k, arg(k));
  const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-watchdog'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(require('url').pathToFileURL(path.join(__dirname, 'reel.html')).href + '?' + q, { timeout: 0 });
  const info = await p.evaluate(() => window.reelReady).catch((e) => ({ err: String(e) }));
  console.log('ready', JSON.stringify(info), errs.join('\n').slice(0, 3000));
  if (errs.length || info.err) { await b.close(); process.exit(1); }
  const N = info.frames;
  if (mode === 'preview') {
    const dir = path.join(__dirname, 'preview'); fs.mkdirSync(dir, { recursive: true });
    for (const s of arg('t', '0').split(',').map(Number)) { const f = Math.round(s * FPS); const t = Date.now(); const b64 = await p.evaluate((i) => window.renderFrame(i), f);
      fs.writeFileSync(path.join(dir, `t${s.toFixed(2).padStart(6, '0')}.png`), Buffer.from(b64, 'base64')); console.log('frame', s, Date.now() - t, 'ms'); }
  } else if (mode === 'full') {
    const from = +arg('from', 0), to = Math.min(N, +arg('to', N)), part = arg('part');
    const out = path.join(__dirname, `video_${res}_${FPS}${part ? '_p' + part : ''}.mp4`);
    const crf = arg('crf', res >= 2160 ? (FPS > 60 ? '16' : '15') : res <= 720 ? '18' : '12');
    const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int', '-c:v', 'libx264', '-preset', res >= 2160 && FPS > 60 ? 'medium' : 'slow', '-crf', crf, '-tune', 'grain',
      '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = from; f < to; f++) { const b64 = await p.evaluate((i) => window.renderFrame(i), f); const buf = Buffer.from(b64, 'base64');
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (f % (FPS * 2) === 0) { const el = (Date.now() - t0) / 1000, done = f - from + 1; console.log('frame', f, '/', to, el.toFixed(0) + 's', 'eta', ((to - f) * el / done / 60).toFixed(1) + 'min'); } }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r)); console.log('video done', ((Date.now() - t0) / 1000).toFixed(0) + 's', out);
  } else if (mode === 'check') {
    const dir = path.join(__dirname, 'check'); fs.mkdirSync(dir, { recursive: true });
    const rows = []; let bad = 0, saved = 0;
    for (let f = 0; f < N; f++) { const r = await p.evaluate((i) => window.checkFrame(i), f); rows.push(r);
      const allowedDark = r.t < 1.0 || r.t > info.dur - 1.5 || r.type === 'tunnel';
      if (r.mean < 0.003 && !allowedDark) r.black = true;
      if (r.fails.length && r.flash < 0.3 && r.t < info.dur - 1.5) { bad++; if (saved < 60) { saved++;
        fs.writeFileSync(path.join(dir, `fail_${r.t.toFixed(2).padStart(6, '0')}.png`), Buffer.from(await p.evaluate((fl) => window.markFrame(fl), r.fails), 'base64')); } }
      if (f % 50 === 0) console.log('check', f, '/', N, 'bad', bad); }
    fs.writeFileSync(path.join(dir, 'contrast.json'), JSON.stringify(rows));
    const byType = {}; for (const r of rows) { const o = byType[r.type] || (byType[r.type] = { frames: 0, bad: 0, worst: 99 }); o.frames++; if (r.fails.length && r.flash < 0.3 && r.t < info.dur - 1.5) { o.bad++; o.worst = Math.min(o.worst, ...r.fails.map((x) => x.ratio)); } }
    console.log('CONTRAST', JSON.stringify(byType)); console.log('BLACK', rows.filter((r) => r.black).map((r) => r.t).join(' ') || 'none');
  } else if (mode === 'text') {
    const log = await p.evaluate((fps) => window.textLog(fps), FPS);
    fs.mkdirSync(path.join(__dirname, 'check'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'check', 'text.json'), JSON.stringify(log));
    const fails = [];
    // время на чтение: каждая надпись видна (a >= 0.6) не меньше 0,5 с + 1 с на 14 знаков
    const runs = {}; const dt = 1 / FPS;
    log.forEach((fr) => { const seen = new Set();
      for (const r of fr.reg) { if (r.a < 0.6 || seen.has(r.id)) continue; seen.add(r.id); const o = runs[r.id] || (runs[r.id] = { text: r.text, list: [] });
        const last = o.list[o.list.length - 1]; if (last && Math.abs(last.end - fr.t) < dt * 1.5) last.end = fr.t + dt; else o.list.push({ start: fr.t, end: fr.t + dt }); o.text = r.text; } });
    for (const [id, o] of Object.entries(runs)) { if (id.startsWith('!') || id === 'tc' || id === 'vel' || id === 'codehdr' || id === 'prn') continue;
      const need = 0.5 + o.text.length / 14; for (const r of o.list) if (r.end - r.start < need - 1e-6) fails.push(`READ ${id} "${o.text}" ${r.start.toFixed(2)}s: ${(r.end - r.start).toFixed(2)} < ${need.toFixed(2)}`); }
    // безопасные поля: буквы внутри 5 % от края
    const safe = new Set(); log.forEach((fr) => { for (const g of fr.glyphs) if (g.x0 < 96 - 1 || g.x1 > 1824 + 1 || g.y0 < 54 - 1 || g.y1 > 1026 + 1) safe.add(`SAFE "${g.s.slice(0, 30)}" @${fr.t.toFixed(1)}s [${g.x0},${g.y0},${g.x1},${g.y1}]`); });
    fails.push(...[...safe].slice(0, 40));
    // наложения: рамки разных надписей не пересекаются
    const ov = new Set(); log.forEach((fr) => { const v = fr.reg.filter((r) => r.a > 0.3);
      for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) { const A = v[i], B = v[j];
        if (A.x < B.x + B.w && B.x < A.x + A.w && A.y < B.y + B.h && B.y < A.y + A.h) ov.add(`OVERLAP ${A.id} x ${B.id} @${Math.floor(fr.t)}s`); } });
    fails.push(...ov);
    // во вспышке текста нет (кроме служебной строки)
    const fl = new Set(); log.forEach((fr) => { if (fr.flash > 0.45) for (const r of fr.reg) if (r.a > 0.6 && !/^(hud|tc|sec)/.test(r.id)) fl.add(`FLASH ${r.id} @${fr.t.toFixed(2)}s`); });
    fails.push(...fl);
    console.log(fails.length ? fails.join('\n') : 'TEXT LAWS OK'); console.log('items', Object.keys(runs).length, 'fails', fails.length);
  }
  if (errs.length) console.log('ERR', errs.join('\n').slice(0, 2000));
  await b.close();
})();
