// 4K/240 рендер визуализации нот: node render4.cjs res=2160 fps=240 [from= to= part=] -> video_<res>_<fps>[_pN].mp4
const { chromium } = require('playwright');
const { spawn } = require('child_process'); const path = require('path'); const url = require('url');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
(async () => {
  const res = +arg('res', 2160), FPS = +arg('fps', 240), K = res / 1080;
  const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-watchdog'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(url.pathToFileURL(path.join(__dirname, 'viz.html')).href + `?k=${K}&fps=${FPS}`);
  const info = await p.evaluate(() => window.vizReady); console.log('ready', JSON.stringify(info), errs.join('\n'));
  if (errs.length) { await b.close(); process.exit(1); }
  const from = +arg('from', 0), to = Math.min(info.frames, +arg('to', info.frames)), part = arg('part');
  const out = path.join(__dirname, `video_${res}_${FPS}${part ? '_p' + part : ''}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16',
    '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) { const buf = Buffer.from(await p.evaluate((i) => window.renderFrame(i), f), 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 1200 === 0) { const el = (Date.now() - t0) / 1000, d = f - from + 1; console.log('frame', f, '/', to, el.toFixed(0) + 's', 'eta', ((to - f) * el / d / 60).toFixed(1) + 'min'); } }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); console.log('video done', ((Date.now() - t0) / 1000).toFixed(0) + 's'); await b.close();
})();
