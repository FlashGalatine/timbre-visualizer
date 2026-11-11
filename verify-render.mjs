// Real-pixel verification: prove the ported overlay renders in a real browser,
// capturing a (fake) microphone locally and taking config only from the SB mock.
// This is the render half that verify.mjs (protocol-only) deliberately skips.
//
// Requires a Chromium channel on the machine (system Edge/Chrome):
//   npm install --no-save playwright-core
//
// Chromium's --use-fake-device-for-media-stream provides a synthetic audio input
// (a tone), so getUserMedia succeeds headless and the analyser sees real energy —
// the same code path OBS CEF runs, minus the CEF permission question that
// spike/mic-test.html answers. Writes test-render.png / control-render.png.
//
// Covered:  fake-mic LISTENING path • 2D factory (visualizer) draws pixels •
//           config push flips viz (matrix), gain + label toggles apply •
//           3D STL factory (rose) initializes WebGL • mic-denied idle path •
//           control.html emits a Timbre Push whose config round-trips •
//           1920×1080 page: 1728×624 buffer, SCALE pinned 4.8, ring effect stays
//           inside the canvas, decoration toggles rescale, no-border fills the box •
//           same page fits 1280×720 / 640×360 sources uniformly, letterboxes 4:3 •
//           1440×1080 page: native geometry, fits 720×540, letterboxes 16:9 •
//           scene kit (Thanksgiving): internal scale, placement, resize without
//           rebuilds, afterglow time, output modes, fps independence, no GPU
//           growth on re-select (every kit scene), clean GL hand-off, no-THREE
//           fallback, no light at the canvas edge, no tinted rectangle, exception-safe
//           create/dispose, a transparent first frame after a context restore; the
//           full cornucopia: falling leaves at 30/60 fps, Leaf density and Candle
//           glow knobs, canvas coverage, embers with no mic and no idle animation,
//           and the cost of one draw() (averaged over 120 frames, under 4 ms).

import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import WebSocket from 'ws';
import './shared/viz-config.js';

const T = globalThis.TIMBRE;
const __dirname = dirname(fileURLToPath(import.meta.url));
const HTTP_PORT = Number(process.env.SB_HTTP_PORT) || 7476;
const WS_PORT = Number(process.env.SB_WS_PORT) || 8090;
const BASE = `http://127.0.0.1:${HTTP_PORT}`;
const overlayUrl = `${BASE}/timbre-overlay/mic-visualizers-300x220.html?sbport=${WS_PORT}`;
const overlayWideUrl = `${BASE}/timbre-overlay/mic-visualizers-1920x1080.html?sbport=${WS_PORT}`;
const overlay43Url = `${BASE}/timbre-overlay/mic-visualizers-1440x1080.html?sbport=${WS_PORT}`;
const controlUrl = `${BASE}/timbre-control/control.html?sbport=${WS_PORT}`;

let passed = 0, failed = 0;
const check = (n, ok, d) => { ok ? passed++ : failed++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}${!ok && d ? ' — ' + d : ''}`); };

function startMock() {
  return new Promise((res, rej) => {
    const child = spawn(process.execPath, ['mock-sb-server.mjs'], {
      cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, SB_HTTP_PORT: String(HTTP_PORT), SB_WS_PORT: String(WS_PORT) },
    });
    let out = '';
    const timer = setTimeout(() => rej(new Error('mock did not start in 8s\n' + out)), 8000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => { out += d; if (out.includes('[mock] HTTP') && out.includes('[mock] WS')) { clearTimeout(timer); res(child); } });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (d) => { out += d; });
    child.on('exit', (code) => { if (code) rej(new Error('mock exited ' + code + '\n' + out)); });
  });
}

async function launch(extraArgs) {
  const opts = { headless: true, args: extraArgs || [] };
  for (const ch of ['msedge', 'chrome']) { try { return await chromium.launch({ ...opts, channel: ch }); } catch {} }
  return await chromium.launch(opts);
}

// Push a full config through the mock exactly like control.html does.
function pushConfig(mutate) {
  const cfg = T.defaultConfig();
  mutate(cfg);
  return new Promise((res) => {
    const ws = new WebSocket(`ws://127.0.0.1:${WS_PORT}/`);
    ws.on('open', () => {
      ws.send(JSON.stringify({ request: 'DoAction', id: 'p', action: { name: 'Timbre Push' }, args: { config: JSON.stringify(cfg) } }));
      setTimeout(() => { ws.close(); res(); }, 250);
    });
  });
}

const canvas2dHasPixels = () => {
  const c = document.getElementById('vizCanvas2D');
  const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
  return false;
};

// Drive one effect with a scripted sound, stepping draw() by hand inside ONE evaluate so the
// 33 ms capture timer cannot overwrite the arrays in between. One reading per step. The page's
// own frequencies / waveform / micActive are restored before returning.
const glowRun = (pg, name, steps, fps = 60) => pg.evaluate(({ name, steps, fps }) => {
  const saved = { frequencies, waveform, micActive };
  try {
    currentViz = VIZ_FACTORIES[name](); if (currentViz.start) currentViz.start();
    const f = new Uint8Array(32), w = new Uint8Array(64), out = [];
    let now = performance.now();
    for (const s of steps) {
      if (s.config) applyConfig(s.config);
      f.fill(Math.round(s.level * 255));
      for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * s.level * 127);
      frequencies = f; waveform = w; micActive = s.mic !== false;
      for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) { now += 1000 / fps; currentViz.draw(now, 1 / fps); }
      const d = ctx.getImageData(0, 0, W, H).data; let ink = 0, alpha = 0, top = -1;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) { ink++; alpha += d[i]; if (top < 0) top = Math.floor(i / 4 / W); }
      out.push({ ink, alpha, top });
    }
    return out;
  } finally {
    frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive;
  }
}, { name, steps, fps });

// The four checks every afterglow effect must pass. slack: live pixels that legitimately
// differ from the quiet baseline (Peak Hold's marker). tweak: extra config for this effect.
async function glowChecks(pg, name, { maxGhostAlpha, slack = 0, tweak } = {}) {
  const T = 1;
  const set = async (seconds) => {
    await pushConfig((c) => { c.activeViz = name; c.afterglow = seconds; c.idleAnim = false; if (tweak) tweak(c); });
    await pg.waitForFunction(({ n, s }) => window.__timbre.currentVizName === n && cfgAfterglow === s, { n: name, s: seconds });
  };
  const loudThenQuiet = [{ secs: 0.5, level: 0 }, { secs: 0.3, level: 0.8 }, { secs: 0.15, level: 0 }];
  await set(T);
  const [q, , d, a, , m] = await glowRun(pg, name, [...loudThenQuiet, { secs: T + 0.2, level: 0 }, { secs: 0.3, level: 0.8 }, { secs: 0.15, level: 0, mic: false }]);
  const ghostPx = d.ink - q.ink;
  check(`${name}: a drop leaves a dimmer ghost`, ghostPx > 1000 && (d.alpha - q.alpha) / ghostPx < maxGhostAlpha, `${ghostPx} px, mean alpha ${((d.alpha - q.alpha) / ghostPx).toFixed(0)}`);
  check(`${name}: the ghost is gone after the afterglow time`, Math.abs(a.ink - q.ink) <= slack, `${q.ink} → ${a.ink}`);
  check(`${name}: no ghost while the mic is off`, Math.abs(m.ink - q.ink) <= slack, `${q.ink} → ${m.ink}`);
  await set(0);
  const [q0, , d0] = await glowRun(pg, name, loudThenQuiet);
  check(`${name}: afterglow 0 leaves no ghost`, Math.abs(d0.ink - q0.ink) <= slack, `${q0.ink} → ${d0.ink}`);
}

async function main() {
  console.log('Timbre — real-pixel render verification\n');
  let mock, browser, deniedBrowser;
  try {
    mock = await startMock();
    console.log(`mock SB up (:${HTTP_PORT} HTTP, :${WS_PORT} WS)\n`);

    // ── Fake-mic browser: the LISTENING path ────────────────────────────────
    browser = await launch([
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ]);
    const ctxt = await browser.newContext({ viewport: { width: 300, height: 220 }, permissions: ['microphone'] });
    const page = await ctxt.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.goto(overlayUrl, { waitUntil: 'load' });

    const listening = await page.waitForFunction(
      () => window.__timbre.micActive === true && document.getElementById('vizStatus').textContent === 'LISTENING',
      { timeout: 8000 }).then(() => true).catch(() => false);
    check('fake mic → self-capture → LISTENING', listening,
      await page.evaluate(() => document.getElementById('vizStatus').textContent));

    // The fake device's tone takes a few hundred ms to spin up — poll for energy.
    const energy = await page.waitForFunction(
      () => window.__timbre.frequencies && Array.from(window.__timbre.frequencies).reduce((a, b) => a + b, 0) > 0,
      { timeout: 5000 }).then(() => true).catch(() => false);
    check('analyser sees audio energy (fake tone)', energy);

    await page.waitForTimeout(400);
    check('default 2D factory (visualizer) draws pixels', await page.evaluate(canvas2dHasPixels));

    // ── Config push: switch viz, gain, decorations ─────────────────────────
    await pushConfig((c) => { c.activeViz = 'matrix'; c.gain = 150; c.showLabels = false; });
    const switched = await page.waitForFunction(() => window.__timbre.currentVizName === 'matrix', { timeout: 5000 })
      .then(() => true).catch(() => false);
    check('config push switches active viz to matrix', switched,
      await page.evaluate(() => window.__timbre.currentVizName));
    check('gain applies (cfgGain=1.5)', await page.evaluate(() => window.__timbre.cfgGain) === 1.5);
    check('showLabels=false hides the status line', await page.evaluate(
      () => document.getElementById('vizStatus').style.display === 'none'));
    await page.waitForTimeout(400);
    check('matrix draws pixels', await page.evaluate(canvas2dHasPixels));

    // ── 3D STL factory ─────────────────────────────────────────────────────
    await pushConfig((c) => { c.activeViz = 'rose'; });
    const rose = await page.waitForFunction(
      () => window.__timbre.currentVizName === 'rose' && document.getElementById('vizCanvas3D').style.display !== 'none',
      { timeout: 5000 }).then(() => true).catch(() => false);
    check('3D STL factory (rose) activates the WebGL canvas', rose);
    await page.waitForTimeout(1200); // STL fetch + first frames

    await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; });
    await page.waitForFunction(() => window.__timbre.scene && window.__timbre.scene.active, { timeout: 5000 }).catch(() => {});
    const small = await page.evaluate(() => window.__timbre.scene);
    check('small page renders the scene at 4× internally', !!small && small.renderScale === 4 && small.targetSize[0] === 1040 && small.targetSize[1] === 520, JSON.stringify(small && small.targetSize));
    check('no page errors across all factories exercised', pageErrors.length === 0, pageErrors.join(' | '));

    await pushConfig((c) => { c.activeViz = 'visualizer'; });
    await page.waitForTimeout(400);
    await page.screenshot({ path: resolve(__dirname, 'test-render.png') });

    // ── 1920×1080 (16:9) page: same vertical scale as 4:3, wider canvas ────
    const wide = await ctxt.newPage();
    const wideErrors = [];
    wide.on('pageerror', (e) => wideErrors.push(String(e)));
    await wide.setViewportSize({ width: 1920, height: 1080 });
    await wide.goto(overlayWideUrl, { waitUntil: 'load' });
    const wideListening = await wide.waitForFunction(
      () => window.__timbre.micActive === true && document.getElementById('vizStatus').textContent === 'LISTENING',
      { timeout: 8000 }).then(() => true).catch(() => false);
    check('1920×1080 page captures the mic → LISTENING', wideListening);
    const geo = await wide.evaluate(() => {
      const box = document.querySelector('.visualizer-box').getBoundingClientRect();
      const stack = document.getElementById('canvasStack').getBoundingClientRect();
      const c = document.getElementById('vizCanvas2D');
      return { box: [box.width, box.height], stack: [stack.width, stack.height], buf: [c.width, c.height],
               W: window.__timbre.W, H: window.__timbre.H, SCALE: window.__timbre.SCALE };
    });
    check('1920×1080 box fills the viewport', geo.box[0] === 1920 && geo.box[1] === 1080, JSON.stringify(geo.box));
    check('1728×624 drawing buffer matches the rendered canvas-stack',
      geo.buf[0] === 1728 && geo.buf[1] === 624 && geo.stack[0] === 1728 && geo.stack[1] === 624, JSON.stringify(geo));
    check('SCALE pinned to 4.8 (not W/260 = 6.65) with W=1728', geo.SCALE === 4.8 && geo.W === 1728, JSON.stringify(geo));
    await wide.waitForTimeout(400);
    check('1920×1080 default visualizer draws pixels', await wide.evaluate(canvas2dHasPixels));

    // A radial effect sized off SCALE must stay inside the 624px-tall canvas: at default
    // gain ring-bars reaches (14+42)*SCALE = 269px < 312px half-height with SCALE=4.8;
    // at W/260 (6.65) it would reach 372px and clip. (Gain >1 is deliberately not used —
    // ring-bars scales spoke length by cfgGain unclamped, so gain 2 overflows on every page.)
    await pushConfig((c) => { c.activeViz = 'ring-bars'; });
    await wide.waitForFunction(() => window.__timbre.currentVizName === 'ring-bars', { timeout: 5000 }).catch(() => {});
    await wide.waitForTimeout(600);
    const ring = await wide.evaluate(() => {
      const c = document.getElementById('vizCanvas2D');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let minY = Infinity, maxY = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 0) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
      }
      return { viz: window.__timbre.currentVizName, minY, maxY, H: c.height };
    });
    check('ring-bars stays inside the 624px canvas (radii track SCALE, not width)',
      ring.viz === 'ring-bars' && ring.maxY >= 0 && ring.minY >= 3 && ring.maxY <= ring.H - 4, JSON.stringify(ring));
    await wide.screenshot({ path: resolve(__dirname, 'test-render-1920.png') });

    // Decoration toggles re-derive the canvas height through the 4.8× override.
    await pushConfig((c) => { c.activeViz = 'visualizer'; c.showLabels = false; });
    const h170 = await wide.waitForFunction(() => window.__timbre.H === Math.round(170 * 4.8), { timeout: 5000 })
      .then(() => true).catch(() => false);
    check('showLabels=false → canvas height 816 (170×4.8)', h170, String(await wide.evaluate(() => window.__timbre.H)));
    await pushConfig((c) => { c.showBorder = false; });
    const noBorder = await wide.waitForFunction(
      () => document.querySelector('.visualizer-box').classList.contains('no-border') && window.__timbre.H === 1080,
      { timeout: 5000 }).then(() => true).catch(() => false);
    check('showBorder=false → canvas-stack fills the 1920×1080 box (H=1080)', noBorder,
      String(await wide.evaluate(() => window.__timbre.H)));
    check('no page errors on the 1920×1080 page', wideErrors.length === 0, wideErrors.join(' | '));

    // ── Same page at smaller 16:9 sizes: uniform CSS fit, geometry untouched ──
    await pushConfig((c) => { c.activeViz = 'visualizer'; });
    await wide.waitForFunction(() => window.__timbre.H === Math.round(130 * 4.8), { timeout: 5000 }).catch(() => {});
    for (const [vw, vh] of [[1280, 720], [640, 360]]) {
      await wide.setViewportSize({ width: vw, height: vh });
      await wide.waitForTimeout(250);
      const g = await wide.evaluate(() => {
        const r = document.querySelector('.visualizer-box').getBoundingClientRect();
        const c = document.getElementById('vizCanvas2D');
        return { fit: window.__timbreFit, box: [Math.round(r.width), Math.round(r.height), Math.round(r.left), Math.round(r.top)],
                 buf: [c.width, c.height], SCALE: window.__timbre.SCALE, H: window.__timbre.H,
                 scaled: document.querySelector('.visualizer-box').classList.contains('scaled') };
      });
      check(`${vw}×${vh} source: box scales to fit (uniform, top-left)`,
        Math.abs(g.fit - vw / 1920) < 1e-6 && g.box[0] === vw && g.box[1] === vh && g.box[2] === 0 && g.box[3] === 0 && g.scaled, JSON.stringify(g));
      check(`${vw}×${vh} source: 1728×624 buffer / SCALE 4.8 / H 624 unchanged`,
        g.buf[0] === 1728 && g.buf[1] === 624 && g.SCALE === 4.8 && g.H === 624, JSON.stringify(g));
      await wide.waitForTimeout(300);
      check(`${vw}×${vh} source: still draws`, await wide.evaluate(canvas2dHasPixels));
    }
    await wide.screenshot({ path: resolve(__dirname, 'test-render-640.png') });
    // Non-16:9 source letterboxes (centres) instead of stretching.
    await wide.setViewportSize({ width: 800, height: 600 });
    await wide.waitForTimeout(250);
    const lb = await wide.evaluate(() => { const r = document.querySelector('.visualizer-box').getBoundingClientRect();
      return [Math.round(r.width), Math.round(r.height), Math.round(r.left), Math.round(r.top)]; });
    check('800×600 (4:3) source letterboxes the 16:9 box centred (800×450 at y=75)',
      lb[0] === 800 && lb[1] === 450 && lb[2] === 0 && lb[3] === 75, JSON.stringify(lb));
    // no-border while scaled must size the buffer from layout (1080), not screen px (600).
    await pushConfig((c) => { c.showBorder = false; });
    const nbScaled = await wide.waitForFunction(() => window.__timbre.H === 1080, { timeout: 5000 }).then(() => true).catch(() => false);
    check('no-border while scaled → buffer height follows layout (1080), not screen px', nbScaled,
      String(await wide.evaluate(() => window.__timbre.H)));
    check('no page errors while resizing the 16:9 page', wideErrors.length === 0, wideErrors.join(' | '));

    // ── Afterglow (bar and wave effects), on the 16:9 page ──
    for (const name of ['visualizer', 'sine-bars', 'ring-bars']) await glowChecks(wide, name, { maxGhostAlpha: 135 });
    await pushConfig((c) => { c.activeViz = 'visualizer'; c.afterglow = 2; c.idleAnim = false; });
    await wide.waitForFunction(() => window.__timbre.currentVizName === 'visualizer' && cfgAfterglow === 2);
    const [gq, , gd, gp, gb1, gb2] = await glowRun(wide, 'visualizer', [
      { secs: 0.5, level: 0 }, { secs: 0.3, level: 0.8 }, { secs: 0.15, level: 0 },
      { secs: 0.1, level: 0, config: { gain: 100 } },
      { secs: 0.1, level: 0, config: { bars: 8 } }, { secs: 2.2, level: 0 },
    ]);
    check('a config push does not wipe ghosts', gp.ink - gq.ink > (gd.ink - gq.ink) * 0.8, `${gd.ink - gq.ink} → ${gp.ink - gq.ink} ghost px`);
    check('changing the Bars count starts again', gb1.ink === gb2.ink, `${gb1.ink} vs ${gb2.ink}`);

    // ── Scene kit + Thanksgiving (1920×1080 page) ─────────────────────────────
    const sceneState = () => wide.evaluate(() => window.__timbre.scene);
    // Draw one frame by hand and read the canvas in the same task (the buffer is cleared after compositing).
    // edgeLight: light pixels in the outermost 4 px on every side (solid objects may cross the edge;
    // light may not). empty: the share of pixels with no alpha and no colour.
    const probe = () => wide.evaluate(() => {
      currentViz.draw(performance.now(), 1 / 60);
      const c = document.getElementById('vizCanvas3D'), gl = c.getContext('webgl2');
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const RING = 4;
      let solid = 0, light = 0, sx = 0, empty = 0, edgeLight = 0;
      for (let i = 0; i < px.length; i += 4) {
        const x = (i / 4) % w, y = Math.floor(i / 4 / w), rgb = px[i] + px[i + 1] + px[i + 2];
        if (px[i + 3] > 250) { solid++; sx += x; }
        else if (px[i + 3] < 5 && rgb > 12) {
          light++;
          if (x < RING || y < RING || x >= w - RING || y >= h - RING) edgeLight++;
        }
        if (px[i + 3] === 0 && rgb === 0) empty++;
      }
      return { w, h, solid, light, empty: empty / (w * h), edgeLight, cornerAlpha: px[3], centroidX: solid ? sx / solid : 0 };
    });
    const activate = async (name) => { await pushConfig((c) => { c.activeViz = name; }); await wide.waitForFunction((n) => window.__timbre.currentVizName === n, name, { timeout: 5000 }); await wide.waitForTimeout(500); };

    await activate('thanksgiving-harvest');
    const s0 = await sceneState();
    check('scene activates on the WebGL canvas', !!s0 && s0.active === true && await wide.evaluate(() => document.getElementById('vizCanvas3D').style.display !== 'none'));
    check('targets are canvas-sized at scale 1', s0.renderScale === 1 && s0.targetSize[0] === 1728 && s0.targetSize[1] === 624, JSON.stringify(s0.targetSize));
    const p0 = await probe();
    check('scene has solid pixels, added light and a transparent corner', p0.solid > 3000 && p0.light > 20000 && p0.cornerAlpha === 0, JSON.stringify(p0));
    check('no hard line: no light in the outer 4 px of the canvas', p0.edgeLight === 0, JSON.stringify(p0));
    check('no tinted rectangle: over a quarter of the canvas stays fully empty', p0.empty > 0.25, p0.empty.toFixed(3));

    await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; c.placement.x = 30; });   // 30% of half of 1728 px is 259
    await wide.waitForTimeout(400);
    const p1 = await probe();
    check('placement.x slides the scene right', p1.centroidX - p0.centroidX > 150, `${p0.centroidX.toFixed(0)} → ${p1.centroidX.toFixed(0)}`);
    check('config push does not rebuild targets', (await sceneState()).targetGeneration === s0.targetGeneration);

    await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; c.placement.x = -100; c.placement.y = 100; c.placement.size = 200; });
    await wide.waitForTimeout(300); await probe();
    await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; c.showLabels = false; });
    await wide.waitForTimeout(400);
    check('a canvas height change resizes the targets', (await sceneState()).targetSize[1] === 816, JSON.stringify((await sceneState()).targetSize));
    await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; c.showBorder = false; });
    await wide.waitForTimeout(400);
    const sb = await sceneState(); await probe();
    check('border off refits', sb.targetSize[0] === 1920 && sb.targetSize[1] === 1080, JSON.stringify(sb.targetSize));
    await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; c.showBorder = false; c.gain = 110; });
    await wide.waitForTimeout(300); await probe();
    check('nor with the border off', (await sceneState()).targetGeneration === sb.targetGeneration);
    await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; c.effectBgOpacity = 0; });
    await wide.waitForTimeout(300); await probe();
    check('Trail veil 0 gives a 1.5 s afterglow', (await sceneState()).afterglowT === 1.5);
    await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; });
    await wide.waitForTimeout(300);
    const plain = await probe();
    await wide.evaluate(() => { TimbreScene.outputMode = 'premultiplied'; });
    const pm = await probe();
    await wide.evaluate(() => { TimbreScene.outputMode = 'added'; });
    check('premultiplied mode gives light an alpha', pm.light < plain.light / 10, `${plain.light} → ${pm.light}`);

    // Frame-rate independence: stop the page's own loop, drive a fixed level by hand. Each run
    // swaps Math.random for the same seeded generator (from before the scene is built until it
    // returns) and starts the clock at the same instant, half a 60 Hz flicker slot past a slot
    // boundary, so every run of the suite draws the same numbers.
    const stepped = (fps) => wide.evaluate(async (fps) => {
      window.frame = function () {};
      const random = Math.random;
      let seed = 20261111;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      try {
        TimbreScene.testLevel = 0;
        setActiveViz('visualizer'); setActiveViz('thanksgiving-harvest');
        let now = 100000 + 1000 / 120;
        for (let i = 0; i < Math.round(1.5 * fps); i++) { TimbreScene.testLevel = i < fps ? 0.8 : 0; now += 1000 / fps; currentViz.draw(now, 1 / fps); }
        return window.__timbre.scene.state;
      } finally {
        Math.random = random;
      }
    }, fps);
    await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; });
    await wide.waitForTimeout(300);
    const f30 = await stepped(30), f60 = await stepped(60);
    const want = [2.2, 3.4, 4.6].map((r) => 0.8 * Math.exp(-r * 0.5));
    check('candles fall at their own rates, the same at 30 and 60 fps',
      want.every((w, i) => Math.abs(f30.follow[i] - w) < 0.02 && Math.abs(f60.follow[i] - w) < 0.02), JSON.stringify({ want, f30: f30.follow, f60: f60.follow }));
    // The leaf simulation itself, not just its target: how many are in the air and how far they have come down.
    check('falling leaves fall the same at 30 and 60 fps (count and mean height)',
      f30.falling > 0 && Math.abs(f30.falling - f60.falling) <= 1 && Math.abs(f30.fallingHeight - f60.fallingHeight) < 0.15,
      JSON.stringify({ f30: [f30.falling, f30.fallingHeight], f60: [f60.falling, f60.fallingHeight] }));
    const knobs = await wide.evaluate(() => {
      window.frame = function () {};
      const run = (leafDensity, candleGlow) => {
        perViz['thanksgiving-harvest'].leafDensity = leafDensity; perViz['thanksgiving-harvest'].candleGlow = candleGlow;
        TimbreScene.testLevel = 0.8; setActiveViz('visualizer'); setActiveViz('thanksgiving-harvest');
        let now = performance.now(); for (let i = 0; i < 60; i++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
        return window.__timbre.scene.state;
      };
      const none = run(0, 50), full = run(100, 50), steady = run(50, 0);
      perViz['thanksgiving-harvest'].leafDensity = 50; perViz['thanksgiving-harvest'].candleGlow = 50; TimbreScene.testLevel = null;
      return { none: none.leafTarget, full: full.leafTarget, steady: steady.candles };
    });
    check('Leaf density 0 stops the fall; 100 doubles it', knobs.none === 0 && knobs.full >= 30, JSON.stringify(knobs));
    check('Candle glow 0 holds the candles at ember level', knobs.steady.every((b) => b > 0.15 && b < 0.3), JSON.stringify(knobs.steady));
    const full = await probe();
    check('the full scene covers far more of the canvas than three candles', full.solid > 60000, String(full.solid));
    const cost = await wide.evaluate(() => { let now = performance.now(), acc = 0; for (let i = 0; i < 120; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); acc += performance.now() - t; } return acc / 120; });
    check(`draw() averages under 4 ms (${cost.toFixed(2)} ms)`, cost < 4);

    // Every kit scene, so the next one is covered without a new check.
    const gpuAfterSelect = (name) => wide.evaluate((n) => { setActiveViz('visualizer'); setActiveViz(n); currentViz.draw(performance.now(), 1 / 60); const s = window.__timbre.scene; return [s.memory.geometries, s.memory.textures, s.programs]; }, name);
    for (const name of T.VIZ_SCENES) {
      const leakBefore = await gpuAfterSelect(name), leakAfter = await gpuAfterSelect(name);
      check(`re-selecting ${name} does not grow GPU resources`, JSON.stringify(leakBefore) === JSON.stringify(leakAfter), `${leakBefore} → ${leakAfter}`);
    }

    // dispose() and create() are exception-safe: a kept object with no dispose() (a Group) is
    // skipped, and a build() that throws makes create() return null after freeing what it made.
    const keptGroup = await wide.evaluate(() => {
      setActiveViz('visualizer');
      const s = TimbreScene.create({
        frame: { width: 2, height: 2, center: [0, 0.5, 0] }, fov: 30, pitch: 14, update() {},
        build(k) { k.scene.add(k.keep(new k.THREE.Group())); },
      });
      if (!s) return { created: false };
      let threw = null;
      try { s.dispose(); } catch (e) { threw = String(e); }
      return { created: true, threw, released: TimbreScene.debug() === null };
    });
    check('dispose() skips a kept object that has no dispose() and hands the context back', keptGroup.created && keptGroup.threw === null && keptGroup.released, JSON.stringify(keptGroup));
    const badBuild = await wide.evaluate(() => {
      setActiveViz('visualizer');
      const error = console.error;
      let freed = false, logged = 0, result, threw = null;
      console.error = () => { logged++; };
      try {
        result = TimbreScene.create({
          frame: { width: 2, height: 2, center: [0, 0.5, 0] }, fov: 30, pitch: 14, update() {},
          build(k) {
            k.keep(new k.THREE.BoxGeometry(1, 1, 1)).addEventListener('dispose', () => { freed = true; });
            throw new Error('test: build() fails');
          },
        });
      } catch (e) { threw = String(e); } finally { console.error = error; }
      setActiveViz('thanksgiving-harvest');
      currentViz.draw(performance.now(), 1 / 60);
      const s = window.__timbre.scene;
      return { returnedNull: result === null, threw, logged, freed, next: !!s && s.active === true && s.targetSize[0] > 0 && Array.isArray(s.state.candles) };
    });
    check('a build() that throws: create() logs it, frees what it made, returns null; the next scene starts',
      badBuild.returnedNull && badBuild.threw === null && badBuild.logged === 1 && badBuild.freed && badBuild.next, JSON.stringify(badBuild));

    const roseOk = await wide.evaluate(async () => { setActiveViz('rose'); await new Promise((r) => setTimeout(r, 1200)); currentViz.draw(performance.now()); const gl = document.getElementById('vizCanvas3D').getContext('webgl2'); return gl.getError() === 0 && !gl.isContextLost(); });
    check('an existing WebGL effect runs cleanly after a scene', roseOk);

    const noThree = await wide.evaluate(() => { const T3 = window.THREE; window.THREE = undefined; let threw = false; try { setActiveViz('visualizer'); setActiveViz('thanksgiving-harvest'); currentViz.draw(performance.now(), 1 / 60); } catch { threw = true; } window.THREE = T3; setActiveViz('visualizer'); return threw; });
    check('no THREE, no throw', noThree === false);
    await wide.evaluate(() => { TimbreScene.testLevel = null; });

    // OBS browser sources lose and restore their WebGL context: the first frame after a restore
    // must be as transparent as any other. Last in the section: disposing objects made before the
    // loss has three delete dead GL objects, which leaves a GL error flag for a later getError().
    const restored = await wide.evaluate(async () => {
      setActiveViz('thanksgiving-harvest');
      currentViz.draw(performance.now(), 1 / 60);
      const c = document.getElementById('vizCanvas3D'), gl = c.getContext('webgl2');
      const lose = gl.getExtension('WEBGL_lose_context');   // before the loss: a lost context returns null
      if (!lose) return { error: 'no WEBGL_lose_context' };
      const after = (type, act) => Promise.race([
        new Promise((res) => { c.addEventListener(type, () => res(true), { once: true }); act(); }),
        new Promise((res) => setTimeout(() => res(false), 3000)),
      ]);
      if (!(await after('webglcontextlost', () => lose.loseContext()))) return { error: 'no webglcontextlost' };
      await new Promise((res) => setTimeout(res, 0));   // one task, or the browser refuses the restore
      if (!(await after('webglcontextrestored', () => lose.restoreContext()))) return { error: 'no webglcontextrestored' };
      currentViz.draw(performance.now(), 1 / 60);       // the first frame since the restore, read in the same task
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let solid = 0;
      for (let i = 3; i < px.length; i += 4) if (px[i] > 250) solid++;
      setActiveViz('visualizer');
      return { w, h, solid, cornerAlpha: px[3] };
    });
    check('the first frame after a WebGL context restore is not opaque',
      !restored.error && restored.cornerAlpha === 0 && restored.solid < restored.w * restored.h / 2, JSON.stringify(restored));
    check('no page errors from the scene checks', wideErrors.length === 0, wideErrors.join(' | '));
    // The mock replays its last config to each page that connects: leave it on visualizer.
    await pushConfig((c) => { c.activeViz = 'visualizer'; });
    await wide.close();

    // ── 1440×1080 (4:3) page: same fit-to-source trick, 1248×624 buffer ───────
    const p43 = await ctxt.newPage();
    const p43Errors = [];
    p43.on('pageerror', (e) => p43Errors.push(String(e)));
    await p43.setViewportSize({ width: 1440, height: 1080 });
    await p43.goto(overlay43Url, { waitUntil: 'load' });
    const l43 = await p43.waitForFunction(
      () => window.__timbre.micActive === true && document.getElementById('vizStatus').textContent === 'LISTENING',
      { timeout: 8000 }).then(() => true).catch(() => false);
    check('1440×1080 page captures the mic → LISTENING', l43);
    const g43 = await p43.evaluate(() => {
      const r = document.querySelector('.visualizer-box').getBoundingClientRect();
      const c = document.getElementById('vizCanvas2D');
      return { fit: window.__timbreFit, box: [r.width, r.height], buf: [c.width, c.height], SCALE: window.__timbre.SCALE };
    });
    check('1440×1080 at native size: unscaled, 1248×624 buffer, SCALE 4.8',
      g43.fit === 1 && g43.box[0] === 1440 && g43.box[1] === 1080 && g43.buf[0] === 1248 && g43.buf[1] === 624 && g43.SCALE === 4.8, JSON.stringify(g43));
    await p43.waitForTimeout(400);
    check('1440×1080 default visualizer draws pixels', await p43.evaluate(canvas2dHasPixels));
    await p43.setViewportSize({ width: 720, height: 540 });
    await p43.waitForTimeout(250);
    const s43 = await p43.evaluate(() => {
      const r = document.querySelector('.visualizer-box').getBoundingClientRect();
      const c = document.getElementById('vizCanvas2D');
      return { fit: window.__timbreFit, box: [Math.round(r.width), Math.round(r.height), Math.round(r.left), Math.round(r.top)],
               buf: [c.width, c.height], scaled: document.querySelector('.visualizer-box').classList.contains('scaled') };
    });
    check('720×540 source: 4:3 page scales to fit, buffer unchanged',
      s43.fit === 0.5 && s43.box.join() === '720,540,0,0' && s43.buf.join() === '1248,624' && s43.scaled, JSON.stringify(s43));
    await p43.screenshot({ path: resolve(__dirname, 'test-render-720.png') });
    await p43.setViewportSize({ width: 1280, height: 720 });
    await p43.waitForTimeout(250);
    const lb43 = await p43.evaluate(() => { const r = document.querySelector('.visualizer-box').getBoundingClientRect();
      return [Math.round(r.width), Math.round(r.height), Math.round(r.left), Math.round(r.top)]; });
    check('1280×720 (16:9) source letterboxes the 4:3 box centred (960×720 at x=160)',
      lb43.join() === '960,720,160,0', JSON.stringify(lb43));
    await pushConfig((c) => { c.showBorder = false; });
    const nb43 = await p43.waitForFunction(() => window.__timbre.H === 1080, { timeout: 5000 }).then(() => true).catch(() => false);
    check('4:3 no-border while scaled → buffer height follows layout (1080)', nb43, String(await p43.evaluate(() => window.__timbre.H)));
    check('no page errors on the 1440×1080 page', p43Errors.length === 0, p43Errors.join(' | '));
    await pushConfig((c) => { c.activeViz = 'visualizer'; });
    await p43.close();

    // ── Control panel: UI change → Timbre Push → broadcast round-trip ─────
    const observed = [];
    const obs = new WebSocket(`ws://127.0.0.1:${WS_PORT}/`);
    obs.on('open', () => obs.send(JSON.stringify({ request: 'Subscribe', id: 'o', events: { general: ['Custom'] } })));
    obs.on('message', (raw) => { const m = JSON.parse(raw); if (m.event) observed.push(m.data); });

    const ctlPage = await ctxt.newPage();
    await ctlPage.goto(controlUrl, { waitUntil: 'load' });
    await ctlPage.waitForFunction(() => document.querySelectorAll('#activeViz option').length >= 49, { timeout: 5000 });
    // sync-on-connect should have populated the picker with the pushed state
    check('control panel syncs current activeViz on connect', await ctlPage.waitForFunction(
      () => document.getElementById('activeViz').value === 'visualizer', { timeout: 5000 }).then(() => true).catch(() => false));
    await ctlPage.selectOption('#activeViz', 'waveform');
    const ctlPushed = await new Promise((res) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const hit = observed.find((m) => m.type === 'timbre:config' && m.config && m.config.activeViz === 'waveform');
        if (hit || Date.now() - t0 > 5000) { clearInterval(iv); res(!!hit); }
      }, 100);
    });
    check('control change → Timbre Push → broadcast (activeViz=waveform)', ctlPushed);
    const overlayFollowed = await page.waitForFunction(() => window.__timbre.currentVizName === 'waveform', { timeout: 5000 })
      .then(() => true).catch(() => false);
    check('overlay follows the control panel live', overlayFollowed);
    check('placement group is hidden for a non-scene effect', await ctlPage.evaluate(() => document.getElementById('scenePlacement').hidden === true));
    await ctlPage.selectOption('#activeViz', 'thanksgiving-harvest');
    check('placement group shows for a scene', await ctlPage.evaluate(() => document.getElementById('scenePlacement').hidden === false));
    await ctlPage.evaluate(() => { const e = document.getElementById('place-x'); e.value = '40'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    const placed = await new Promise((res) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const hit = observed.find((m) => m.type === 'timbre:config' && m.config && m.config.placement && m.config.placement.x === 40);
        if (hit || Date.now() - t0 > 5000) { clearInterval(iv); res(!!hit); }
      }, 100);
    });
    check('moving Left-right pushes placement.x', placed);
    check('afterglow group is hidden for another effect', await ctlPage.evaluate(() => document.getElementById('afterglowGroup').hidden === true));
    await ctlPage.selectOption('#activeViz', 'ring-bars');
    check('afterglow group shows for one of the six', await ctlPage.evaluate(() => document.getElementById('afterglowGroup').hidden === false));
    await ctlPage.evaluate(() => { const e = document.getElementById('afterglow'); e.value = '3'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    const glowPushed = await new Promise((res) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const hit = observed.find((m) => m.type === 'timbre:config' && m.config && m.config.afterglow === 3);
        if (hit || Date.now() - t0 > 5000) { clearInterval(iv); res(!!hit); }
      }, 100);
    });
    check('moving Afterglow pushes afterglow', glowPushed);
    check('the overlay takes the afterglow setting', await page.waitForFunction(() => cfgAfterglow === 3, { timeout: 5000 }).then(() => true).catch(() => false));
    // Put afterglow back to its default so the shared mock state stays clean.
    const glowMark = observed.length;
    await ctlPage.evaluate(() => { const e = document.getElementById('afterglow'); e.value = '1.6'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await new Promise((res) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const hit = observed.slice(glowMark).find((m) => m.type === 'timbre:config' && m.config && m.config.afterglow === 1.6);
        if (hit || Date.now() - t0 > 5000) { clearInterval(iv); res(); }
      }, 100);
    });
    // Put the shared mock state back so the later mic-denied page starts on a 2D effect again.
    const mark = observed.length;
    await ctlPage.selectOption('#activeViz', 'waveform');
    await new Promise((res) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const hit = observed.slice(mark).find((m) => m.type === 'timbre:config' && m.config && m.config.activeViz === 'waveform');
        if (hit || Date.now() - t0 > 5000) { clearInterval(iv); res(); }
      }, 100);
    });
    await ctlPage.screenshot({ path: resolve(__dirname, 'control-render.png'), fullPage: true });
    obs.close();

    // ── Mic-denied path (no fake-media flags, no permission grant) ─────────
    deniedBrowser = await launch();
    const dctx = await deniedBrowser.newContext({ viewport: { width: 300, height: 220 } });
    const dpage = await dctx.newPage();
    await dpage.goto(overlayUrl, { waitUntil: 'load' });
    const denied = await dpage.waitForFunction(
      () => document.getElementById('vizStatus').textContent === 'MIC DENIED',
      { timeout: 8000 }).then(() => true).catch(() => false);
    check('mic denied → MIC DENIED status', denied,
      await dpage.evaluate(() => document.getElementById('vizStatus').textContent));
    await dpage.waitForTimeout(600);
    check('idle animation still draws with no mic', await dpage.evaluate(canvas2dHasPixels));
    await dpage.evaluate(() => { cfgIdleAnim = false; setActiveViz('thanksgiving-harvest'); });
    await dpage.waitForTimeout(1500);
    const silent = await dpage.evaluate(() => window.__timbre.scene && window.__timbre.scene.state);
    check('silent scene keeps its embers', !!silent && silent.candles.every((b) => b > 0.15 && b < 0.3) && silent.leafTarget === 4, JSON.stringify(silent));
  } finally {
    try { if (browser) await browser.close(); } catch {}
    try { if (deniedBrowser) await deniedBrowser.close(); } catch {}
    if (mock) mock.kill();
  }

  console.log(`\n${passed}/${passed + failed} passed${failed ? ` — ${failed} FAILED` : ''}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
