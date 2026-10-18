// node render2.cjs preview 300,1200  |  node render2.cjs full
const { chromium } = require('playwright');
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path'); const url = require('url');
(async () => {
  const mode = process.argv[2] || 'preview';
  const b = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-watchdog'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url.pathToFileURL(path.join(__dirname, 'viz.html')).href);
  const info = await p.evaluate(() => window.vizReady).catch((e) => ({ err: String(e) }));
  console.log('ready', JSON.stringify(info), errs.join('\n').slice(0, 3000));
  if (errs.length || info.err) { await b.close(); process.exit(1); }
  if (mode === 'preview') { fs.mkdirSync(path.join(__dirname, 'preview'), { recursive: true });
    for (const f of (process.argv[3] || '0').split(',').map(Number)) { const t = Date.now(); const b64 = await p.evaluate((i) => window.renderFrame(i), f);
      fs.writeFileSync(path.join(__dirname, 'preview', `f${String(f).padStart(5, '0')}.png`), Buffer.from(b64, 'base64')); console.log('frame', f, Date.now() - t, 'ms'); }
  } else { const total = info.frames;
    const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'png', '-i', '-',
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
      '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', '60', path.join(__dirname, 'video.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = 0; f < total; f++) { const buf = Buffer.from(await p.evaluate((i) => window.renderFrame(i), f), 'base64');
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r)); if (f % 600 === 0) console.log('frame', f, '/', total, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r)); console.log('video done', ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
  if (errs.length) console.log('ERR', errs.join('\n').slice(0, 2000));
  await b.close();
})();
