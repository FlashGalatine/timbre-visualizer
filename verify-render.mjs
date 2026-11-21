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
//           and the cost of one draw() (averaged over 120 frames, under 4 ms) •
//           afterglow (bars and waves): ghosts appear, fade on the way out and are gone
//           after the afterglow time, afterglow 0 leaves none, config pushes keep ghosts, a Bars change
//           starts again, Peak Hold falls at the same speed at 30/60 fps, the control
//           panel's Afterglow slider, and the six effects drawing in under 0.5 ms •
//           the DNA helix: draws edge to edge on all three pages, opens and brightens with
//           the voice (strand A with the low end, strand B with the high end), turns at
//           0.7 rad/s in quiet and 6.5 loud, alike at 30, 60 and 165 fps, and with the mic
//           off breathes only in width (idle animation) or stays quiet (none); a peak shatters
//           it into pieces that stay in the frame (wide and small pages) and come back whole, the
//           twist holds while in pieces, Gain at 200% and Sensitivity 0 never shatter, the waveform
//           peak stands in for a missing micPeak, a config push keeps the pieces, a size change or a
//           hidden source resumes whole, a seeded shatter repeats, Helix Freq moved while in pieces
//           rejoins on the old winding, and a draw (whole, in pieces, and the blast frame) stays
//           inside its time budget; stopping the mic puts micPeak back to null •
//           the comet: flies inside the frame on all three pages; louder is faster, wider, brighter
//           and longer-tailed; it settles when the voice stops; the flight is alike at 30, 60 and
//           165 fps; a peak flares the head (wide and small pages) and the flare dies away; Gain at
//           200% and Flare Sensitivity 0 never flare; the waveform peak stands in for a missing
//           micPeak; the mic opening on a loud moment does not flare; mic off is slow and dim, and
//           with the idle animation only the head's glow breathes; the tail has a glow, bulges gently, remembers
//           the voice, fades to nothing at its tip and has no gap after a long first frame; the low
//           end swells the head's glow and the high end sheds sparks; Trail sets the tail length; a config push keeps the tail and a size change
//           starts a fresh one; a seeded run repeats; the canvas state is left as found; a draw
//           stays inside its time budget; and the control panel shows its two sliders •
//           the fireflies: a swarm of 35 inside the frame on all three pages; silent, they blink
//           rarely; a voice makes them blink more; flashes bunch on syllables; a peak startles the
//           whole swarm (wide and small pages), which settles again; a held yell startles once a
//           second; Gain at 200% and Startle Sensitivity 0 never startle; the waveform peak stands
//           in for a missing micPeak; the mic opening on a loud moment does not startle; mic off is
//           calm, and with the idle animation only the glow breathes; the low end swells the glow
//           and the high end is heard; Density sets how many; a config push and a size change keep
//           the swarm; a seeded run repeats; the canvas state is left as found; a draw stays inside
//           its time budget; and the control panel shows its two sliders •
//           pulse rings: a whole ringed planet inside the frame on all three pages; a syllable
//           ripples outward through the rings; a voice lights the rings and the glow; the low end
//           swells the planet and the high end makes the ice glitter; a peak blows the planet into
//           chunks and thins the rings (wide and small pages); after the calm wait the chunks
//           return and the rings fill back in; Reconnect Seconds sets the wait; in pieces the
//           rings and the core still answer the voice; a held yell blows it apart once and then
//           jostles; Gain at 200% and Explode Sensitivity 0 never blow it apart; the waveform peak
//           stands in for a missing micPeak; the mic opening on a loud moment does not blow it
//           apart; mic off rests, and with the idle animation a slow ripple keeps crossing;
//           Sensitivity and Flow do what they say; a config push keeps the planet as it is and a
//           size change in pieces puts it back whole; a seeded run repeats; the canvas state is
//           left as found; a draw stays inside its time budget; and the control panel shows its
//           four sliders •
//           orbit: a sun and six planets inside the frame on all three pages; a voice makes them
//           orbit faster and streak farther; the low end swells the sun and the high end lengthens
//           its rays; a peak flares the sun and the planets surge, then settle (wide and small
//           pages); a held yell flares once a second; Gain at 200% and Flare Sensitivity 0 never
//           flare; the waveform peak stands in for a missing micPeak; the mic opening on a loud
//           moment does not flare; mic off the planets drift, and with the idle animation the sun
//           breathes; Planets sets how many, down to the sun alone, also mid-flight; a config push
//           and a size change keep the planets; a seeded run repeats; the canvas state is left as
//           found; a draw stays inside its time budget; and the control panel shows its two sliders •
//           black hole: things falling into a solid black hole on all three pages; a voice feeds
//           it far more and the gas brightens and turns faster; a syllable ripples inward through
//           the gas; the low end swells the hole and the high end makes the fireflies flicker; a
//           peak makes it gulp down what is in sight and fire its jets (wide and small pages); a
//           held yell gulps every second and a half; Gain at 200% and Gulp Sensitivity 0 never
//           gulp; the waveform peak stands in for a missing micPeak; the mic opening on a loud
//           moment does not gulp; mic off a trickle keeps falling, and with the idle animation
//           the hole breathes; Density sets how much falls in; a config push and a size change
//           keep everything falling; a seeded run repeats; the canvas state is left as found; a
//           draw stays inside its time budget; and the control panel lists it with its two sliders •
//           blob: a whole blob inside the frame on all three pages; a voice swells it, opens its
//           mouth and makes it happy; a syllable bounces it, stretching on the way up, and it
//           settles; it blinks; the low end pushes out its top and the high end its bottom;
//           Bounce 0 stills it and Bounce 100 keeps it inside the frame; mic off it is still, and
//           with the idle animation it breathes; a config push and a size change keep it; the
//           canvas state is left as found and the picture does not depend on the line settings
//           it is handed; and a draw stays inside its time budget •
//           owl: a whole owl inside the frame on all three pages; a voice lifts its wings, opens
//           its beak, makes it happy and sets it singing; a syllable bobs it and it settles; it
//           blinks; it leans toward the end of the sound that is winning; Bounce 0 stills it and
//           Bounce 100 keeps it inside the frame; mic off it is still, and with the idle animation
//           it sways; a config push and a size change keep it; the canvas state is left as found
//           and the picture does not depend on the line settings it is handed; and a draw stays
//           inside its time budget •
//           television: a whole set inside the frame on all three pages; a voice makes its mouth
//           the waveform, lights its speaker and makes it happy; the face is on the canvas with
//           the mic on and asleep in static with it off; a syllable bounces it and springs its
//           antennae; it blinks; it tilts and its dials turn with the low and the high end;
//           Bounce 0 stills it and Bounce 100 keeps it inside the frame; with the idle animation
//           it hovers in its sleep; a config push and a size change keep it; a seeded run repeats;
//           the canvas state is left as found and the picture does not depend on the line settings
//           it is handed; a draw stays inside its time budget; and the control panel lists it.

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
// The first step must be a quiet baseline: every later risePx / rise is measured against it.
const glowRun = (pg, name, steps, fps = 60) => pg.evaluate(({ name, steps, fps }) => {
  const saved = { frequencies, waveform, micActive };
  try {
    currentViz = VIZ_FACTORIES[name](); if (currentViz.start) currentViz.start();
    const f = new Uint8Array(32), w = new Uint8Array(64), out = [];
    let first = null;
    let now = performance.now();
    for (const s of steps) {
      if (s.config) applyConfig(s.config);
      f.fill(Math.round(s.level * 255));
      for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * s.level * 127);
      frequencies = f; waveform = w; micActive = s.mic !== false;
      for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) { now += 1000 / fps; currentViz.draw(now, 1 / fps); }
      const d = ctx.getImageData(0, 0, W, H).data; let ink = 0, alpha = 0, top = -1;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) { ink++; alpha += d[i]; if (top < 0) top = Math.floor(i / 4 / W); }
      let risePx = 0, rise = 0;
      if (first) { for (let i = 0; i < first.length; i++) { const up = d[i * 4 + 3] - first[i]; if (up > 0) { risePx++; rise += up; } } }
      else { first = new Uint8Array(d.length / 4); for (let i = 0; i < first.length; i++) first[i] = d[i * 4 + 3]; }
      out.push({ ink, alpha, top, risePx, rise });
    }
    return out;
  } finally {
    frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive;
  }
}, { name, steps, fps });

// Drive one effect (DNA, Comet) with a scripted sound the way glowRun does, one reading per step: its
// probe() plus pixel facts (ink: pixels with alpha; alpha: summed; top / bottom: first and last rows
// with ink; emptyCols: columns with no ink) and the canvas state the draw left behind (op: the blend
// mode; blur: the shadow blur; globalAlpha; offsetX: the shadow offset; transformKept: the transform
// is what it was before the run).
// steps: [{ secs, wave, low, high, peak, mic, config, jump }] — wave/low/high/peak are 0..1; low fills
// frequency bins 0-1, high bins 2-10. peak is micPeak (null or missing: the effect reads the waveform);
// mic: false turns the mic off as a real mic-off does (micActive false; frequencies, waveform and
// micPeak null); jump skips that many seconds before the step, as a hidden source does.
// Every call starts a new effect, seeded through the effect's seed global (window.__dnaSeed,
// window.__cometSeed, window.__firefliesSeed). Nothing carries over between
// calls: the page's own loop may draw the effect in between, so a scenario runs in one call. The
// page's own sound and micPeak are restored. With `odd: true` the canvas is handed over with
// unusual line settings (as another effect might leave it): linesKept then says the effect gave
// them back untouched, and the picture shows whether it leaned on the usual ones.
// Each step's result is the effect's probe() plus what the canvas holds: ink (pixels that are not
// clear), alpha (their alpha, summed), top and bottom (the first and last rows with ink), emptyCols,
// light (red + green + blue, summed), and for the solid (fully opaque) pixels their count and the
// box round them (solidTop, solidBottom, solidLeft, solidRight), solidTopX and solidBottomX (the
// middles of the topmost and the lowest solid rows), dark (how many are exactly the characters' ink colour) and pink (how many
// are exactly their pink). odd hands the canvas over with unusual line settings; still holds the
// wall clock, so the colours are the same from one run to the next.
const effectRun = (name, seedKey) => (pg, steps, { fps = 60, seed = 1, odd = false, still = false } = {}) => pg.evaluate(({ name, seedKey, steps, fps, seed, odd, still }) => {
  const saved = { frequencies, waveform, micActive, micPeak, seed: window[seedKey], line: [ctx.lineWidth, ctx.lineCap, ctx.lineJoin], clock: Date.now };
  try {
    if (odd) { ctx.lineWidth = 7.25; ctx.lineCap = 'round'; ctx.lineJoin = 'bevel'; }
    if (still) Date.now = () => 1700000000000;
    window[seedKey] = seed;
    currentViz = VIZ_FACTORIES[name]();
    let now = performance.now();
    const f = new Uint8Array(32), w = new Uint8Array(64), out = [];
    const matrix = () => { const m = ctx.getTransform(); return [m.a, m.b, m.c, m.d, m.e, m.f].join(); };
    const matrix0 = matrix();
    const lines = () => [ctx.lineWidth, ctx.lineCap, ctx.lineJoin].join();
    const lines0 = lines();
    for (const s of steps) {
      if (s.config) applyConfig(s.config);
      if (s.jump) now += s.jump * 1000;
      f.fill(0);
      f.fill(Math.round((s.low || 0) * 255), 0, 2);
      f.fill(Math.round((s.high || 0) * 255), 2, 11);
      for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * (s.wave || 0) * 127);
      const on = s.mic !== false;
      frequencies = on ? f : null; waveform = on ? w : null; micActive = on; micPeak = on ? (s.peak ?? null) : null;
      for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) { now += 1000 / fps; currentViz.draw(now, 1 / fps); }
      const d = ctx.getImageData(0, 0, W, H).data, inked = new Uint8Array(W);
      let ink = 0, alpha = 0, top = -1, bottom = -1, light = 0, solid = 0, dark = 0, pink = 0, solidTop = -1, solidBottom = -1, solidLeft = -1, solidRight = -1, topSum = 0, topCount = 0, lowSum = 0, lowCount = 0;
      for (let p = 0; p < d.length / 4; p++) {
        const a = d[p * 4 + 3];
        if (a === 0) continue;
        ink++; alpha += a; inked[p % W] = 1;
        bottom = Math.floor(p / W); if (top < 0) top = bottom;
        light += d[p * 4] + d[p * 4 + 1] + d[p * 4 + 2];
        if (a !== 255) continue;
        const x = p % W;
        if (bottom !== solidBottom) { lowSum = 0; lowCount = 0; }
        lowSum += x; lowCount++;
        solid++; solidBottom = bottom; if (solidTop < 0) solidTop = bottom;
        if (bottom === solidTop) { topSum += x; topCount++; }
        if (d[p * 4] === 255 && d[p * 4 + 1] === 110 && d[p * 4 + 2] === 160) pink++;
        if (solidLeft < 0 || x < solidLeft) solidLeft = x;
        if (x > solidRight) solidRight = x;
        if (d[p * 4] === 16 && d[p * 4 + 1] === 14 && d[p * 4 + 2] === 34) dark++;
      }
      let emptyCols = 0;
      for (let x = 0; x < W; x++) if (!inked[x]) emptyCols++;
      // A clip left behind would stop this dot in the far corner from being drawn. It is wiped again.
      ctx.fillStyle = '#fff'; ctx.fillRect(W - 1, H - 1, 1, 1);
      const unclipped = ctx.getImageData(W - 1, H - 1, 1, 1).data[3] === 255;
      ctx.clearRect(W - 1, H - 1, 1, 1);
      out.push({ ...currentViz.probe(), ink, alpha, top, bottom, emptyCols, light, solid, dark, pink, solidTop, solidBottom, solidLeft, solidRight, solidTopX: topCount ? topSum / topCount : -1, solidBottomX: lowCount ? lowSum / lowCount : -1, op: ctx.globalCompositeOperation, blur: ctx.shadowBlur, globalAlpha: ctx.globalAlpha,
        offsetX: ctx.shadowOffsetX, transformKept: matrix() === matrix0, linesKept: lines() === lines0, unclipped });
    }
    return out;
  } finally {
    frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak;
    window[seedKey] = saved.seed;
    [ctx.lineWidth, ctx.lineCap, ctx.lineJoin] = saved.line;
    Date.now = saved.clock;
  }
}, { name, seedKey, steps, fps, seed, odd, still });
const dnaRun = effectRun('dna', '__dnaSeed'), cometRun = effectRun('comet', '__cometSeed'), fliesRun = effectRun('fireflies', '__firefliesSeed');
const ringsRun = effectRun('pulse-rings', '__pulseRingsSeed'), orbitRun = effectRun('orbit', '__orbitSeed'), holeRun = effectRun('black-hole', '__blackHoleSeed');
const blobRun = effectRun('blob', '__blobSeed'), owlRun = effectRun('owl', '__owlSeed'), tvRun = effectRun('television', '__televisionSeed');
const talk = { wave: 0.5, low: 0.5, high: 0.3, peak: 0.5 }, silence = { wave: 0, low: 0, high: 0, peak: 0 };

// The five checks every afterglow effect must pass. slack: live pixels that legitimately
// differ from the quiet baseline (Peak Hold's marker). tweak: extra config for this effect.
async function glowChecks(pg, name, { maxGhostAlpha, slack = 0, tweak } = {}) {
  const T = 1;
  const set = async (seconds) => {
    await pushConfig((c) => { c.activeViz = name; c.afterglow = seconds; c.idleAnim = false; if (tweak) tweak(c); });
    await pg.waitForFunction(({ n, s }) => window.__timbre.currentVizName === n && cfgAfterglow === s, { n: name, s: seconds });
  };
  const loudThenQuiet = [{ secs: 0.5, level: 0 }, { secs: 0.3, level: 0.8 }, { secs: 0.15, level: 0 }];
  await set(T);
  const [q, , d, h, a, , m] = await glowRun(pg, name, [...loudThenQuiet, { secs: 0.35, level: 0 }, { secs: T + 0.2 - 0.35, level: 0 }, { secs: 0.3, level: 0.8 }, { secs: 0.15, level: 0, mic: false }]);
  const ghostPx = d.risePx;
  check(`${name}: a drop leaves a dimmer ghost`, ghostPx > 1000 && d.rise / ghostPx < maxGhostAlpha, `${ghostPx} px, mean rise ${(d.rise / ghostPx).toFixed(0)}`);
  check(`${name}: the ghost fades on the way out`, h.rise > d.rise * 0.15 && h.rise < d.rise * 0.6, `${(h.rise / d.rise).toFixed(2)} of the at-drop rise`);
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
    check('micPeak is a level between 0 and 1 while listening', await page.waitForFunction(
      () => typeof window.__timbre.micPeak === 'number' && window.__timbre.micPeak > 0 && window.__timbre.micPeak <= 1, { timeout: 5000 }).then(() => true).catch(() => false));

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
    await glowChecks(wide, 'visualizer', { maxGhostAlpha: 135 });
    await glowChecks(wide, 'sine-bars', { maxGhostAlpha: 85 });
    await glowChecks(wide, 'ring-bars', { maxGhostAlpha: 135 });
    await pushConfig((c) => { c.activeViz = 'visualizer'; c.afterglow = 2; c.idleAnim = false; });
    await wide.waitForFunction(() => window.__timbre.currentVizName === 'visualizer' && cfgAfterglow === 2);
    const [gq, , gd, gp, gb1, gb2] = await glowRun(wide, 'visualizer', [
      { secs: 0.5, level: 0 }, { secs: 0.3, level: 0.8 }, { secs: 0.15, level: 0 },
      { secs: 0.1, level: 0, config: { afterglow: 2.5 } },
      { secs: 0.1, level: 0, config: { bars: 8 } }, { secs: 2.2, level: 0 },
    ]);
    check('a config push does not wipe ghosts', gp.ink - gq.ink > (gd.ink - gq.ink) * 0.8, `${gd.ink - gq.ink} → ${gp.ink - gq.ink} ghost px`);
    check('changing the Bars count starts again', gb1.ink === gb2.ink, `${gb1.ink} vs ${gb2.ink}`);
    // The marker is live, not a ghost: allow its pixels (one thin strip per bar) as slack, and
    // let it land before the "gone" reading by using the fastest fall.
    await glowChecks(wide, 'peak-hold', { maxGhostAlpha: 135, slack: 1728 * 12, tweak: (c) => { c.perViz['peak-hold'].fallSpeed = 100; } });
    await pushConfig((c) => { c.activeViz = 'peak-hold'; c.afterglow = 0; c.idleAnim = false; });   // fallSpeed 50
    await wide.waitForFunction(() => window.__timbre.currentVizName === 'peak-hold' && cfgAfterglow === 0);
    const peakRun = (fps) => glowRun(wide, 'peak-hold', [{ secs: 0.3, level: 0.8 }, { secs: 0.25, level: 0 }, { secs: 0.5, level: 0 }], fps);
    const [l60, h60, pk60] = await peakRun(60);
    const [, , pk30] = await peakRun(30);
    check('peak-hold: the marker holds for 0.3 s', h60.top === l60.top, `${l60.top} → ${h60.top}`);
    // 0.75 s after the drop: 0.45 s of falling at (12 + 1.08 × 50) × 4.8 = 316.8 px/s = 142.6 px.
    check('peak-hold: the marker falls at the same speed at 30 and 60 fps', Math.abs(pk60.top - l60.top - 142.6) <= 16 && Math.abs(pk30.top - pk60.top) <= 16, `60 fps ${pk60.top - l60.top} px, 30 fps ${pk30.top - l60.top} px`);
    // 42: the real echoes read 35.1; an echo stroke at full alpha reads 47.8 (its faint fill dominates the mean).
    await glowChecks(wide, 'waveform', { maxGhostAlpha: 42 });
    await glowChecks(wide, 'ring-waveform', { maxGhostAlpha: 165 });
    await pushConfig((c) => { c.activeViz = 'visualizer'; c.afterglow = 1.6; c.idleAnim = false; });
    await wide.waitForFunction(() => cfgAfterglow === 1.6);
    const costs = await wide.evaluate((names) => names.map((name) => {
      currentViz = VIZ_FACTORIES[name](); if (currentViz.start) currentViz.start();
      const f = new Uint8Array(32), w = new Uint8Array(64); frequencies = f; waveform = w; micActive = true;
      let now = performance.now(); const t0 = performance.now();
      for (let k = 0; k < 300; k++) {
        const level = k % 30 < 15 ? 0.8 : 0;                       // loud and quiet, a quarter second each
        f.fill(level * 255); for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * level * 127);
        now += 1000 / 60; currentViz.draw(now, 1 / 60);
      }
      return [name, (performance.now() - t0) / 300];
    }), T.VIZ_AFTERGLOW);
    check('afterglow effects draw in under 0.5 ms', costs.every(([, ms]) => ms < 0.5), costs.map(([n, ms]) => `${n} ${ms.toFixed(3)}`).join(', '));

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

    // ── Winter Aurora (the second kit scene) ──────────────────────────────────
    // Build the scene afresh with seeded randomness, drive the level (and, where a step gives
    // them, the low and high ends of the spectrum) by hand, and read the canvas after each step.
    // red: light pixels in the upper half that are mostly red (the lit window is in the lower half).
    const auroraRun = (steps, { fps = 60, knobs = null } = {}) => wide.evaluate(({ steps, fps, knobs }) => {
      window.frame = function () {};
      const random = Math.random, saved = { frequencies, micActive }, knobs0 = Object.assign({}, perViz['winter-aurora']);
      let seed = 20261113;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      try {
        if (knobs) Object.assign(perViz['winter-aurora'], knobs);
        TimbreScene.testLevel = 0;
        setActiveViz('visualizer'); setActiveViz('winter-aurora');
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), f = new Uint8Array(32), out = [];
        let now = 100000 + 1000 / 120;
        for (const st of steps) {
          TimbreScene.testLevel = st.level;
          if (st.low !== undefined) { f.fill(Math.round(st.low * 255), 0, 4); f.fill(0, 4, 8); f.fill(Math.round(st.high * 255), 8, 32); frequencies = f; micActive = true; }
          let jump = 0, before = null;
          for (let i = 0, n = Math.round(st.secs * fps); i < n; i++) {
            now += 1000 / fps; currentViz.draw(now, 1 / fps);
            if (st.trace) {   // from the third sample on: the first two follow the live level
              const hh = window.__timbre.scene.state.hist;
              if (before) for (let j = 2; j < hh.length; j++) jump = Math.max(jump, Math.abs(hh[j] - before[j]));
              before = hh;
            }
          }
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);   // row 0 is the bottom of the canvas
          let solid = 0, light = 0, lightSum = 0, red = 0, edge = 0, empty = 0, upG = 0, upB = 0, skySum = 0;
          for (let i = 0; i < px.length; i += 4) {
            const x = (i / 4) % w, y = Math.floor(i / 4 / w), r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3], rgb = r + g + b;
            if (a > 250) solid++;
            else if (a < 5 && rgb > 12) {
              light++; lightSum += rgb;
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
              if (y > h / 2) { upG += g; upB += b; skySum += rgb; if (r > 30 && r > g * 1.3 && r > b * 1.3) red++; }
            }
            if (a === 0 && rgb === 0) empty++;
          }
          const s = window.__timbre.scene;
          out.push({ state: (s && s.state) || {}, solid, light, lightSum, red, edge, empty: empty / (w * h), cornerAlpha: px[3], violet: upG ? upB / upG : 0, jump, skySum });
        }
        return out;
      } finally {
        Math.random = random; frequencies = saved.frequencies; micActive = saved.micActive;
        Object.assign(perViz['winter-aurora'], knobs0); TimbreScene.testLevel = null;
      }
    }, { steps, fps, knobs });
    const histOf = (r) => (r.state.hist || []);
    const peakOf = (hh) => { let at = -1, top = 0; (hh || []).forEach((v, i) => { if (v > top) { top = v; at = i; } }); return { at, top }; };
    const peakAt = (r) => peakOf(histOf(r));
    const curtainOf = (r, c) => ((r.state.curtains || [])[c] || []);

    const SKY_QUIET = 7500000;
    // Flags: thresholds are 60% of what the scenes give: about 109,000 solid pixels (the flag, pole,
    // base and hearts), 118,000 pixels of light on the ground, 12,300 dark pixels in the black stripe,
    // and 26,800 unlit pixels inside the pool of light (the shadows).
    const SOLID_FLAG = 65000, LIGHT_POOL = 70000, DARK_STRIPE = 7000, SHADOW_HOLES = 16000;
    await activate('winter-aurora');
    const wa0 = await sceneState();
    check('winter aurora is a kit scene on the WebGL canvas', !!wa0 && wa0.active === true && wa0.targetSize[0] === 1728 && wa0.targetSize[1] === 624, JSON.stringify(wa0 && wa0.targetSize));
    const [waQuiet, waLoud] = await auroraRun([{ level: 0, secs: 1.5 }, { level: 0.8, secs: 2.5 }]);
    check('winter aurora draws solid land, added light and a transparent corner', waLoud.solid > 15000 && waLoud.light > 150000 && waLoud.cornerAlpha === 0, JSON.stringify({ solid: waLoud.solid, light: waLoud.light, corner: waLoud.cornerAlpha }));
    check('winter aurora: no light in the outer 4 px of the canvas, and a quarter of it stays empty', waLoud.edge === 0 && waQuiet.edge === 0 && waLoud.empty > 0.25, JSON.stringify({ edge: waLoud.edge, empty: waLoud.empty }));
    // The light in the upper half of the canvas, in silence. SKY_QUIET is 60% of what the scene gives (12.6 million).
    check('winter aurora: the aurora never goes dark', waQuiet.skySum > SKY_QUIET && waQuiet.state.glow < 0.02, JSON.stringify({ sky: waQuiet.skySum, glow: waQuiet.state.glow }));
    check('winter aurora: louder is brighter, in the sky and on the snow',
      waLoud.lightSum > waQuiet.lightSum * 1.8 && waLoud.state.glow > 0.7 && waLoud.state.light > waQuiet.state.light * 3, JSON.stringify({ quiet: [waQuiet.lightSum, waQuiet.state.light], loud: [waLoud.lightSum, waLoud.state.light] }));

    // A burst of voice travels along the curtains: 12 history samples a second.
    const [, , waHalf, waLater] = await auroraRun([{ level: 0, secs: 0.5 }, { level: 0.9, secs: 0.25 }, { level: 0, secs: 0.5, trace: true }, { level: 0, secs: 1, trace: true }]);
    check('winter aurora: a burst of voice travels along the curtain at 12 samples a second',
      histOf(waHalf).length === 32 && Math.abs(peakAt(waHalf).at - 6) <= 1 && Math.abs(peakAt(waLater).at - 18) <= 1 && peakAt(waHalf).top > 0.15 && peakAt(waLater).top > 0.15,
      JSON.stringify([peakAt(waHalf), peakAt(waLater)]));

    // Left to right on the front curtain, right to left on the middle one, from the centre outward on the back one.
    const back = (r) => { const b = curtainOf(r, 2); return { left: peakOf(b.slice(0, 16)).at, right: 16 + peakOf(b.slice(16)).at, even: b.length === 32 && b.every((v, i) => Math.abs(v - b[31 - i]) < 1e-6) }; };
    check('winter aurora: the burst runs left to right on the front curtain and right to left on the middle one',
      Math.abs(peakOf(curtainOf(waHalf, 0)).at - 6) <= 1 && Math.abs(peakOf(curtainOf(waLater, 0)).at - 18) <= 1
      && Math.abs(peakOf(curtainOf(waHalf, 1)).at - 25) <= 1 && Math.abs(peakOf(curtainOf(waLater, 1)).at - 13) <= 1,
      JSON.stringify([0, 1].map((c) => [peakOf(curtainOf(waHalf, c)).at, peakOf(curtainOf(waLater, c)).at])));
    check('winter aurora: the burst runs from the centre outward on the back curtain, the same on both sides',
      back(waHalf).even && back(waLater).even && Math.abs(back(waHalf).left - 12.5) <= 1 && Math.abs(back(waHalf).right - 18.5) <= 1
      && Math.abs(back(waLater).left - 6.5) <= 1 && Math.abs(back(waLater).right - 24.5) <= 1, JSON.stringify([back(waHalf), back(waLater)]));
    // The wave glides: no history value steps by a whole sample from one frame to the next.
    // (A burst this sharp is a step of about 0.8 between two samples; gliding spreads it over five frames.)
    check('winter aurora: the travelling wave glides between samples', waHalf.jump > 0.02 && waHalf.jump < 0.3 && waLater.jump < 0.3, JSON.stringify([waHalf.jump, waLater.jump]));

    // The same at 30 and 60 fps. The reading falls part-way between two history samples.
    const fpsSteps = [{ level: 0.8, secs: 1 }, { level: 0, secs: 16 / 30 }];
    const wa30 = (await auroraRun(fpsSteps, { fps: 30 }))[1], wa60 = (await auroraRun(fpsSteps, { fps: 60 }))[1];
    check('winter aurora: the glow and the travelling history agree at 30 and 60 fps',
      wa60.state.glow > 0.2 && Math.abs(wa30.state.glow - wa60.state.glow) < 0.02 && histOf(wa60).length === 32 && histOf(wa60).every((v, i) => Math.abs(v - histOf(wa30)[i]) < 0.04),
      JSON.stringify({ glow: [wa30.state.glow, wa60.state.glow], h30: histOf(wa30).slice(0, 8), h60: histOf(wa60).slice(0, 8) }));
    check('winter aurora: snow falls the same at 30 and 60 fps (count and mean height)',
      wa60.state.falling > 20 && Math.abs(wa30.state.falling - wa60.state.falling) <= 3 && Math.abs(wa30.state.fallingHeight - wa60.state.fallingHeight) < 0.15,
      JSON.stringify({ f30: [wa30.state.falling, wa30.state.fallingHeight], f60: [wa60.state.falling, wa60.state.fallingHeight] }));
    // A long frame takes more than one history sample; each must still hold the level at its own moment.
    const slowSteps = [{ level: 0, secs: 0.5 }, { level: 0.9, secs: 0.3 }, { level: 0, secs: 0.5 }];
    const wa10 = (await auroraRun(slowSteps, { fps: 10 }))[2], waFast = (await auroraRun(slowSteps, { fps: 60 }))[2];
    const smear = Math.max(...histOf(waFast).map((v, i) => Math.abs(v - (histOf(wa10)[i] || 0))));
    check('winter aurora: the history at 10 fps matches the one at 60 fps', histOf(wa10).length === 32 && smear < 0.12, smear.toFixed(3));

    // Snow lands. Over 25 s every flake has come down at least once; each switched off at the snow, not above it.
    const [snowLong] = await auroraRun([{ level: 0.5, secs: 25 }]);
    check('winter aurora: flakes land on the snow and are replaced',
      snowLong.state.landed > 60 && snowLong.state.landedHigh < 0.03 && Math.abs(snowLong.state.falling - snowLong.state.snowTarget) <= 2 && snowLong.state.fallingHeight > 1 && snowLong.state.fallingHeight < 4,
      JSON.stringify({ landed: snowLong.state.landed, high: snowLong.state.landedHigh, falling: snowLong.state.falling, target: snowLong.state.snowTarget, height: snowLong.state.fallingHeight }));
    // When the voice stops, the flakes already falling keep falling: none vanishes in mid-air.
    const [snowLoud, snowHush] = await auroraRun([{ level: 0.9, secs: 3 }, { level: 0, secs: 2 }]);
    check('winter aurora: when the voice stops, the snow in the air keeps falling',
      snowLoud.state.falling > 60 && snowHush.state.snowTarget < snowLoud.state.falling - 25 && snowHush.state.falling >= snowLoud.state.falling - 2 && snowHush.state.landed === 0,
      JSON.stringify({ loud: snowLoud.state.falling, hush: [snowHush.state.falling, snowHush.state.snowTarget, snowHush.state.landed] }));

    // Each setting.
    const loudSecond = [{ level: 0.8, secs: 1.5 }];
    const [kDefault] = await auroraRun(loudSecond);
    const [kNoSnow] = await auroraRun(loudSecond, { knobs: { snowfall: 0 } }), [kSnow] = await auroraRun(loudSecond, { knobs: { snowfall: 100 } });
    check('winter aurora: Snowfall 0 stops the snow; 100 doubles it',
      kNoSnow.state.snowTarget === 0 && kNoSnow.state.falling === 0 && kDefault.state.snowTarget > 50 && Math.abs(kSnow.state.snowTarget - 2 * kDefault.state.snowTarget) <= 2,
      JSON.stringify([kNoSnow.state.snowTarget, kDefault.state.snowTarget, kSnow.state.snowTarget]));
    const [kNoStars] = await auroraRun(loudSecond, { knobs: { starDensity: 0 } }), [kStars] = await auroraRun(loudSecond, { knobs: { starDensity: 100 } });
    check('winter aurora: Star density sets how many stars (0, 60, 120)', kNoStars.state.stars === 0 && kDefault.state.stars === 60 && kStars.state.stars === 120, JSON.stringify([kNoStars.state.stars, kDefault.state.stars, kStars.state.stars]));
    const [kStill] = await auroraRun(loudSecond, { knobs: { cameraDrift: 0 } }), [kDrift] = await auroraRun(loudSecond, { knobs: { cameraDrift: 100 } });
    check('winter aurora: Camera drift 0 holds the camera still; 100 doubles the swing',
      kStill.state.orbit === 0 && Math.abs(kDefault.state.orbit) > 0.01 && Math.abs(kDrift.state.orbit - 2 * kDefault.state.orbit) < 1e-9, JSON.stringify([kStill.state.orbit, kDefault.state.orbit, kDrift.state.orbit]));
    const [kSteadyQuiet, kSteady] = await auroraRun([{ level: 0, secs: 1 }, { level: 0.8, secs: 1.5 }], { knobs: { auroraGlow: 0 } });
    const [kWild] = await auroraRun([{ level: 0.3, secs: 1.5 }], { knobs: { auroraGlow: 100 } }), [kMild] = await auroraRun([{ level: 0.3, secs: 1.5 }]);
    check('winter aurora: Aurora glow 0 gives a steady aurora with no waves',
      kSteady.state.bright === 0 && kSteady.state.light === kSteadyQuiet.state.light && histOf(kSteady).length === 32 && histOf(kSteady).every((v) => v === 0) && Math.abs(kSteady.lightSum - kSteadyQuiet.lightSum) < kSteadyQuiet.lightSum * 0.12,
      JSON.stringify({ bright: kSteady.state.bright, light: [kSteadyQuiet.state.light, kSteady.state.light], sums: [kSteadyQuiet.lightSum, kSteady.lightSum] }));
    check('winter aurora: Aurora glow 100 doubles the swing', kMild.state.bright > 0.2 && Math.abs(kWild.state.bright - 2 * kMild.state.bright) < 0.01, JSON.stringify([kMild.state.bright, kWild.state.bright]));

    // Tone: the high end lifts the violet; the low end keeps the green.
    const [toneLow] = await auroraRun([{ level: 0.7, secs: 2, low: 0.9, high: 0 }]), [toneHigh] = await auroraRun([{ level: 0.7, secs: 2, low: 0, high: 0.9 }]);
    check('winter aurora: the high end of the sound lifts the violet in the sky',
      toneLow.state.low > 0.6 && toneLow.state.high < 0.05 && toneHigh.state.high > 0.6 && toneHigh.violet > toneLow.violet * 1.15, JSON.stringify({ low: [toneLow.state.low, toneLow.violet], high: [toneHigh.state.high, toneHigh.violet] }));

    // A beat flushes the hems pink; once it has passed, trailing light is never red.
    const [, waBeat, waSettled, waTrail] = await auroraRun([{ level: 0.05, secs: 1 }, { level: 0.9, secs: 0.05 }, { level: 0.9, secs: 2.5 }, { level: 0, secs: 0.15 }]);
    check('winter aurora: a beat flushes the hems pink', waBeat.state.kick > 0.7 && waBeat.red > 300 && waSettled.state.kick < 0.001, JSON.stringify({ kick: [waBeat.state.kick, waSettled.state.kick], red: waBeat.red }));
    check('winter aurora: trailing light is never red', waSettled.red === 0 && waTrail.red === 0 && waTrail.light > 100000, JSON.stringify({ settled: waSettled.red, trail: waTrail.red }));

    await activate('winter-aurora');
    const waP0 = await probe();
    await pushConfig((c) => { c.activeViz = 'winter-aurora'; c.placement.x = 30; });
    await wide.waitForTimeout(400);
    const waP1 = await probe();
    check('winter aurora: Scene placement slides it', waP1.centroidX - waP0.centroidX > 150, `${waP0.centroidX.toFixed(0)} → ${waP1.centroidX.toFixed(0)}`);
    await activate('winter-aurora');
    const waCost = await wide.evaluate(() => { let now = performance.now(), acc = 0; for (let i = 0; i < 120; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); acc += performance.now() - t; } return acc / 120; });
    check(`winter aurora: draw() averages under 4 ms of script time (${waCost.toFixed(2)} ms)`, waCost < 4);

    // ── The flags (five kit scenes on one cloth) ───────────────────────────────
    {   // its own block: the names below are the flags' own
    // Build the scene afresh with seeded randomness, drive the level (and, where a step gives
    // them, the low and high ends) by hand, and read the canvas and the scene after each step.
    // A step with idle: true has the mic off (Idle animation is on in the default config).
    // tones: where the solid pixels of one colour are (count, mean x, mean y from the bottom).
    const flagRun = (id, steps, { fps = 60, knobs = null } = {}) => wide.evaluate(({ id, steps, fps, knobs }) => {
      window.frame = function () {};
      const random = Math.random, saved = { frequencies, micActive }, knobs0 = Object.assign({}, perViz[id]);
      let seed = 20261114;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      try {
        if (knobs) Object.assign(perViz[id], knobs);
        TimbreScene.testLevel = 0;
        setActiveViz('visualizer'); setActiveViz(id);
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), f = new Uint8Array(32), out = [];
        let now = 100000 + 1000 / 120;
        for (const st of steps) {
          TimbreScene.testLevel = st.level;
          micActive = !st.idle;
          if (st.knobs) Object.assign(perViz[id], st.knobs);
          if (st.low !== undefined) { f.fill(Math.round(st.low * 255), 0, 4); f.fill(0, 4, 8); f.fill(Math.round(st.high * 255), 8, 32); frequencies = f; }
          const trace = st.trace ? [] : null;
          for (let i = 0, n = Math.round(st.secs * fps); i < n; i++) {
            now += 1000 / fps; currentViz.draw(now, 1 / fps);
            if (trace) { const q = window.__timbre.scene.state; trace.push([q.wind, q.kick, q.phase]); }
          }
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);   // row 0 is the bottom of the canvas
          const tones = { red: [0, 0, 0], blue: [0, 0, 0], violet: [0, 0, 0], magenta: [0, 0, 0], dark: [0, 0, 0] };
          let solid = 0, light = 0, lightSum = 0, edge = 0, empty = 0, holes = 0;
          const first = new Int32Array(h).fill(-1), last = new Int32Array(h).fill(-1);
          for (let i = 0; i < px.length; i += 4) {
            const x = (i / 4) % w, y = Math.floor(i / 4 / w), r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3], rgb = r + g + b;
            if (a > 250) {
              solid++;
              const max = Math.max(r, g, b), min = Math.min(r, g, b);
              let tone = null;
              if (max < 60) tone = 'dark';
              else if (max - min > 70) {
                const hue = (max === r ? ((g - b) / (max - min) + 6) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4) * 60;
                tone = hue < 12 || hue > 348 ? 'red' : hue >= 205 && hue <= 250 ? 'blue' : hue >= 262 && hue <= 300 ? 'violet' : hue >= 308 && hue <= 345 ? 'magenta' : null;
              }
              if (tone) { tones[tone][0]++; tones[tone][1] += x; tones[tone][2] += y; }
            } else if (a < 5 && rgb > 12) {
              light++; lightSum += rgb;
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
              if (first[y] < 0) first[y] = x;
              last[y] = x;
            }
            if (a === 0 && rgb === 0) empty++;
          }
          // Holes: unlit, see-through pixels with light on both sides of them in their row. Shadows on the ground.
          for (let i = 0; i < px.length; i += 4) {
            const x = (i / 4) % w, y = Math.floor(i / 4 / w);
            if (px[i + 3] < 5 && px[i] + px[i + 1] + px[i + 2] <= 12 && x > first[y] && x < last[y]) holes++;
          }
          for (const k of Object.keys(tones)) { const t = tones[k]; tones[k] = { n: t[0], x: t[0] ? t[1] / t[0] : 0, y: t[0] ? t[2] / t[0] : 0 }; }
          const s = window.__timbre.scene;
          out.push({ state: (s && s.state) || {}, textures: s ? s.memory.textures : -1, solid, light, lightSum, edge, empty: empty / (w * h), cornerAlpha: px[3], tones, holes, trace });
        }
        return out;
      } finally {
        Math.random = random; frequencies = saved.frequencies; micActive = saved.micActive;
        Object.assign(perViz[id], knobs0); TimbreScene.testLevel = null;
      }
    }, { id, steps, fps, knobs });
    const FLAGS = ['pride-ribbon', 'bi-pride-ribbon', 'ace-pride-ribbon', 'trans-pride-ribbon', 'july-fourth-stripes'];
    const RAINBOW = 'pride-ribbon', JULY = 'july-fourth-stripes';
    const flagPeak = (r) => { let at = -1, top = 0; (r.state.hist || []).forEach((v, i) => { if (v > top) { top = v; at = i; } }); return { at, top }; };
    const talk = [{ level: 0.8, secs: 2 }];

    for (const id of FLAGS) {
      await activate(id);
      const st = await sceneState();
      const [r] = await flagRun(id, talk);
      check(`${id} is a kit scene: a solid flag, light on the ground, a transparent corner`,
        !!st && st.active === true && st.targetSize[0] === 1728 && r.solid > SOLID_FLAG && r.light > LIGHT_POOL && r.cornerAlpha === 0 && r.edge === 0 && r.empty > 0.5 && r.state.fly > 0.95,
        JSON.stringify({ size: st && st.targetSize, solid: r.solid, light: r.light, corner: r.cornerAlpha, edge: r.edge, empty: r.empty, fly: r.state.fly }));
      check(`${id} throws a shadow into its pool of light`, r.holes > SHADOW_HOLES, String(r.holes));
    }

    // The right way up, and the right way round.
    const [rbLoud] = await flagRun(RAINBOW, talk), [biLoud] = await flagRun('bi-pride-ribbon', talk), [julyLoud] = await flagRun(JULY, talk);
    check('rainbow flag: red is at the top and violet at the bottom', rbLoud.tones.red.n > 2000 && rbLoud.tones.violet.n > 2000 && rbLoud.tones.red.y > rbLoud.tones.violet.y + 60,
      JSON.stringify({ red: rbLoud.tones.red, violet: rbLoud.tones.violet }));
    check('bi flag: magenta is above blue', biLoud.tones.magenta.n > 3000 && biLoud.tones.blue.n > 3000 && biLoud.tones.magenta.y > biLoud.tones.blue.y + 60, JSON.stringify({ magenta: biLoud.tones.magenta, blue: biLoud.tones.blue }));
    check('fourth of july flag: the blue union is at the top, on the pole side', julyLoud.tones.blue.n > 3000 && julyLoud.tones.red.n > 3000
      && julyLoud.tones.blue.y > julyLoud.tones.red.y + 20 && julyLoud.tones.blue.x < julyLoud.tones.red.x - 40, JSON.stringify({ blue: julyLoud.tones.blue, red: julyLoud.tones.red }));

    // The voice is the wind.
    const [rbQuiet, rbQuietLater, rbTalk] = await flagRun(RAINBOW, [{ level: 0, secs: 2.5 }, { level: 0, secs: 1 }, { level: 0.8, secs: 2 }]);
    check('flag: it hangs in silence and flies when you talk', rbQuiet.state.fly < 0.2 && rbTalk.state.fly > 0.95 && rbTalk.state.endY > rbQuiet.state.endY + 1 && rbQuiet.state.endY < -1.2 && rbTalk.state.endY > -0.5,
      JSON.stringify({ quiet: [rbQuiet.state.fly, rbQuiet.state.endX, rbQuiet.state.endY], talk: [rbTalk.state.fly, rbTalk.state.endX, rbTalk.state.endY] }));
    check('flag: in silence it still sways', Math.abs(rbQuiet.state.endY - rbQuietLater.state.endY) + Math.abs(rbQuiet.state.endX - rbQuietLater.state.endX) + Math.abs(rbQuiet.state.ripple - rbQuietLater.state.ripple) > 0.005
      && rbQuiet.state.lowest + 4.75 > 0.3, JSON.stringify([rbQuiet.state.endX, rbQuietLater.state.endX, rbQuiet.state.endY, rbQuietLater.state.endY, rbQuiet.state.lowest]));
    check('flag: louder ripples deeper', rbTalk.state.ripple > 0.2 && rbTalk.state.wind > 0.7, JSON.stringify([rbTalk.state.ripple, rbTalk.state.wind]));

    // A syllable is a gust that travels from the pole to the free end: 16 history samples a second.
    const [, , gSoon, gLater] = await flagRun(RAINBOW, [{ level: 0, secs: 0.5 }, { level: 0.9, secs: 4 / 60 }, { level: 0, secs: 0.25 }, { level: 0, secs: 0.5 }]);
    check('flag: a syllable travels along the cloth at 16 samples a second',
      (gSoon.state.hist || []).length === 16 && Math.abs(flagPeak(gSoon).at - 4) <= 1 && Math.abs(flagPeak(gLater).at - 12) <= 1 && flagPeak(gSoon).top > 0.2 && flagPeak(gLater).top > 0.2,
      JSON.stringify([flagPeak(gSoon), flagPeak(gLater)]));

    // The same at 30 and 60 fps.
    const fpsFlag = [{ level: 0.8, secs: 1 }, { level: 0, secs: 16 / 30 }];
    const f30 = (await flagRun(RAINBOW, fpsFlag, { fps: 30 }))[1], f60 = (await flagRun(RAINBOW, fpsFlag, { fps: 60 }))[1];
    check('flag: the wind, the lift, the gusts and the ripples agree at 30 and 60 fps',
      f60.state.wind > 0.3 && Math.abs(f30.state.wind - f60.state.wind) < 0.02 && Math.abs(f30.state.fly - f60.state.fly) < 0.02 && Math.abs(f30.state.phase - f60.state.phase) < 0.15
      && f60.state.hist.every((v, i) => Math.abs(v - f30.state.hist[i]) < 0.04) && Math.abs(f30.state.endY - f60.state.endY) < 0.06,
      JSON.stringify({ wind: [f30.state.wind, f60.state.wind], fly: [f30.state.fly, f60.state.fly], phase: [f30.state.phase, f60.state.phase], endY: [f30.state.endY, f60.state.endY] }));
    check('flag: hearts leave at the same rate at 30 and 60 fps', f60.state.heartsMade > 5 && Math.abs(f30.state.heartsMade - f60.state.heartsMade) <= 2, JSON.stringify([f30.state.heartsMade, f60.state.heartsMade]));

    // A beat snaps the cloth.
    const [, beatNow, beatGone] = await flagRun(RAINBOW, [{ level: 0.05, secs: 1 }, { level: 0.9, secs: 0.05 }, { level: 0.9, secs: 2.5 }]);
    check('flag: a beat snaps the cloth, then lets go', beatNow.state.kick > 0.7 && beatGone.state.kick < 0.001, JSON.stringify([beatNow.state.kick, beatGone.state.kick]));

    // Wind.
    const [calmQuiet, calm] = await flagRun(RAINBOW, [{ level: 0, secs: 1 }, { level: 0.8, secs: 2 }], { knobs: { wind: 0 } });
    check('flag: Wind 0 leaves it hanging whatever the sound', calm.state.wind === 0 && calm.state.fly < 0.2 && calm.state.kick === 0 && calm.state.hist.every((v) => v === 0) && Math.abs(calm.state.endY - calmQuiet.state.endY) < 0.1,
      JSON.stringify({ wind: calm.state.wind, fly: calm.state.fly, kick: calm.state.kick, endY: [calmQuiet.state.endY, calm.state.endY] }));
    const [mild] = await flagRun(RAINBOW, [{ level: 0.3, secs: 3 }]), [wild] = await flagRun(RAINBOW, [{ level: 0.3, secs: 3 }], { knobs: { wind: 100 } });
    check('flag: Wind 100 doubles what the voice does', mild.state.wind > 0.2 && Math.abs(wild.state.wind - 2 * mild.state.wind) < 0.02 && wild.state.fly > mild.state.fly, JSON.stringify([mild.state.wind, wild.state.wind, mild.state.fly, wild.state.fly]));

    // Hearts.
    const [hDefault] = await flagRun(RAINBOW, talk), [hNone] = await flagRun(RAINBOW, talk, { knobs: { heartRate: 0 } }), [hMany] = await flagRun(RAINBOW, talk, { knobs: { heartRate: 100 } });
    check('flag: Heart rate 0 sheds no hearts; 100 sheds twice as many', hNone.state.hearts === 0 && hNone.state.heartsMade === 0 && hDefault.state.heartsMade > 8
      && Math.abs(hMany.state.heartsMade - 2 * hDefault.state.heartsMade) <= 2, JSON.stringify([hNone.state.heartsMade, hDefault.state.heartsMade, hMany.state.heartsMade]));
    check('flag: hearts leave from the free half of the cloth', hDefault.state.heartFrom >= 0.5 && hDefault.state.heartFrom <= 1 && hDefault.state.hearts > 8, JSON.stringify([hDefault.state.heartFrom, hDefault.state.hearts]));
    const palette = [[255, 130, 175], [254, 100, 130], [255, 215, 100], [120, 220, 200]];
    check('flag: hearts take the flag\'s heart colours', (hDefault.state.heartColors || []).length > 8
      && hDefault.state.heartColors.every((c) => palette.some((p) => Math.abs(p[0] - c[0]) <= 1 && Math.abs(p[1] - c[1]) <= 1 && Math.abs(p[2] - c[2]) <= 1))
      && new Set(hDefault.state.heartColors.map(String)).size >= 3, JSON.stringify((hDefault.state.heartColors || []).slice(0, 6)));
    // When the voice stops, hearts in the air finish their flight: none is 2.4 s old yet, and
    // after 1.3 s of silence nothing is left of the voice.
    const [hLoud, hHush] = await flagRun(RAINBOW, [{ level: 0.8, secs: 1 }, { level: 0, secs: 1.3 }]);
    check('flag: when the voice stops, the hearts in the air keep flying', hLoud.state.hearts > 4 && hHush.state.hearts >= hLoud.state.hearts, JSON.stringify([hLoud.state.hearts, hHush.state.hearts]));
    const [hLong] = await flagRun(RAINBOW, [{ level: 0.8, secs: 9 }], { knobs: { heartRate: 100 } });
    check('flag: never more than 56 hearts at once, and old ones make room', hLong.state.hearts <= 56 && hLong.state.hearts > 30 && hLong.state.heartsMade > 80, JSON.stringify([hLong.state.hearts, hLong.state.heartsMade]));
    const [julyTalk] = await flagRun(JULY, talk);
    check('fourth of july flag sheds no hearts', julyTalk.state.hearts === 0 && julyTalk.state.heartsMade === 0, JSON.stringify([julyTalk.state.hearts, julyTalk.state.heartsMade]));

    // Stripe style.
    const [eight] = await flagRun(RAINBOW, talk, { knobs: { stripeStyle: 100 } }), [justEight] = await flagRun(RAINBOW, talk, { knobs: { stripeStyle: 50 } }), [justSix] = await flagRun(RAINBOW, talk, { knobs: { stripeStyle: 49 } });
    check('rainbow flag: Stripe style at 50 or more adds black and brown above the six', rbLoud.state.stripes === 6 && justSix.state.stripes === 6 && justEight.state.stripes === 8 && eight.state.stripes === 8
      && eight.tones.dark.n > rbLoud.tones.dark.n + DARK_STRIPE, JSON.stringify({ stripes: [rbLoud.state.stripes, justSix.state.stripes, justEight.state.stripes, eight.state.stripes], dark: [rbLoud.tones.dark.n, eight.tones.dark.n] }));
    const toggled = await wide.evaluate(() => {
      setActiveViz('visualizer'); setActiveViz('pride-ribbon');
      const out = [], step = (v) => { perViz['pride-ribbon'].stripeStyle = v; currentViz.draw(performance.now(), 1 / 60); currentViz.draw(performance.now() + 16, 1 / 60); const s = window.__timbre.scene; out.push([s.state.stripes, s.memory.textures, s.memory.geometries]); };
      try { for (const v of [0, 100, 0, 100, 0]) step(v); } finally { perViz['pride-ribbon'].stripeStyle = 0; }
      return out;
    });
    const repaint = await flagRun(RAINBOW, [{ level: 0.8, secs: 1 }, { level: 0.8, secs: 0.5, knobs: { stripeStyle: 100 } }, { level: 0.8, secs: 0.5, knobs: { stripeStyle: 0 } }]);
    check('rainbow flag: a change of Stripe style shows on the cloth at once, both ways', repaint[1].tones.dark.n > repaint[0].tones.dark.n + DARK_STRIPE
      && repaint[2].tones.dark.n < repaint[0].tones.dark.n + 500, JSON.stringify(repaint.map((r) => r.tones.dark.n)));
    check('rainbow flag: switching Stripe style back and forth repaints the one texture', JSON.stringify(toggled.map((t) => t[0])) === '[6,8,6,8,6]' && toggled.every((t) => t[1] === toggled[0][1] && t[2] === toggled[0][2]), JSON.stringify(toggled));

    // Fourth of July: fireworks and stars.
    const beat = [{ level: 0.05, secs: 1 }, { level: 0.9, secs: 0.1 }, { level: 0.9, secs: 2.5 }];
    const [, bang, after] = await flagRun(JULY, beat, { knobs: { burstChance: 100 } }), [, noBang] = await flagRun(JULY, beat, { knobs: { burstChance: 0 } });
    check('fourth of july flag: Burst chance 100 sets off a burst on a beat, with a flash', bang.state.bursts === 1 && bang.state.sparks === 80 && bang.state.flash > 0.3 && bang.lightSum > noBang.lightSum * 1.05,
      JSON.stringify({ bursts: bang.state.bursts, sparks: bang.state.sparks, flash: bang.state.flash, light: [noBang.lightSum, bang.lightSum] }));
    check('fourth of july flag: Burst chance 0 sets off none', noBang.state.bursts === 0 && noBang.state.sparks === 0 && noBang.state.flash === 0, JSON.stringify(noBang.state.bursts));
    check('fourth of july flag: the sparks burn out and the flash fades', after.state.sparks === 0 && after.state.flash < 0.001 && after.state.bursts >= 1 && after.state.bursts <= 3, JSON.stringify([after.state.sparks, after.state.flash, after.state.bursts]));
    const [idleBursts] = await flagRun(JULY, [{ level: 0.3, secs: 7, idle: true }]), [idleNone] = await flagRun(JULY, [{ level: 0.3, secs: 7, idle: true }], { knobs: { burstChance: 0 } });
    check('fourth of july flag: with the mic off a burst goes off every 3.2 s, unless Burst chance is 0', idleBursts.state.bursts === 2 && idleNone.state.bursts === 0, JSON.stringify([idleBursts.state.bursts, idleNone.state.bursts]));
    const tone = (knobs, high) => flagRun(JULY, [{ level: 0.7, secs: 2, low: 0.2, high }], { knobs });
    const [shine] = await tone(null, 0.9), [dull] = await tone(null, 0), [noShine] = await tone({ starTwinkle: 0 }, 0.9), [bright] = await tone({ starTwinkle: 100 }, 0.9);
    check('fourth of july flag: the stars shine with the high end of the sound; Star twinkle 0 stops it, 100 doubles it',
      shine.state.high > 0.6 && shine.state.shine > 0.5 && dull.state.shine < 0.05 && noShine.state.shine === 0 && Math.abs(bright.state.shine - 2 * shine.state.shine) < 0.02,
      JSON.stringify([dull.state.shine, shine.state.shine, noShine.state.shine, bright.state.shine]));

    // After the review.
    // The cloth is handed what the sound gives: the beat, the gust where its age puts it, the tone.
    check('flag: a beat reaches the cloth', beatNow.state.cloth && beatNow.state.cloth.kick === beatNow.state.kick && beatGone.state.cloth.kick === beatGone.state.kick, JSON.stringify(beatNow.state.cloth));
    const gustPeak = (r) => { let at = -1, top = 0; (r.state.gust || []).forEach((v, i) => { if (v > top) { top = v; at = i; } }); return at; };
    check('flag: the gust sits on the cloth where its age puts it, a quarter then three quarters of the way along',
      (gSoon.state.gust || []).length === 57 && Math.abs(gustPeak(gSoon) - 15) <= 3 && Math.abs(gustPeak(gLater) - 45) <= 3, JSON.stringify([gustPeak(gSoon), gustPeak(gLater)]));
    // The ripples' phase advances by 1.6 + 6.5 x wind + 4 x kick a second, frame by frame.
    const [, traced] = await flagRun(RAINBOW, [{ level: 0.05, secs: 1 }, { level: 0.9, secs: 1.5, trace: true }]);
    const rule = (traced.trace || []).slice(1).map((f, i) => Math.abs((f[2] - traced.trace[i][2]) - (1.6 + 6.5 * f[0] + 4 * f[1]) / 60));
    check('flag: the ripples run faster with the wind and faster still on a beat', rule.length === 89 && Math.max(...rule) < 1e-9 && traced.trace.some((f) => f[1] > 0.7) && traced.trace[89][0] > 0.5,
      JSON.stringify({ frames: rule.length, worst: rule.length ? Math.max(...rule) : null }));
    const [slow] = await flagRun(RAINBOW, [{ level: 0, secs: 2 }]), [fast] = await flagRun(RAINBOW, [{ level: 0.8, secs: 2 }]);
    check('flag: in silence the ripples still run, slowly', slow.state.phase > 3 && slow.state.phase < 3.4 && fast.state.phase > 3 * slow.state.phase, JSON.stringify([slow.state.phase, fast.state.phase]));
    // It lifts quickly and sinks slowly: half a second into a pause it is still flying.
    const [, lull] = await flagRun(RAINBOW, [{ level: 0.8, secs: 2 }, { level: 0, secs: 0.5 }]);
    check('flag: it does not drop between words', lull.state.wind > 0.55 && lull.state.fly > 0.9, JSON.stringify([lull.state.wind, lull.state.fly]));
    // Where it is in the world: clear of the ground, flying to the right and toward the viewer.
    check('flag: it stands clear of the ground and flies to the right, toward the viewer', rbQuiet.state.groundClear > 0.3 && rbQuiet.state.groundClear < 1.2 && rbTalk.state.groundClear > 2
      && rbTalk.state.endWorld[0] > -2.5 + 2.5 && rbTalk.state.endWorld[2] > 0.3 && Math.abs(rbTalk.state.endWorld[1] - (4.75 + rbTalk.state.endY)) < 1e-6,
      JSON.stringify({ clear: [rbQuiet.state.groundClear, rbTalk.state.groundClear], end: rbTalk.state.endWorld }));
    const [quiet1, quiet2, quiet3] = await flagRun(RAINBOW, [{ level: 0, secs: 2.5 }, { level: 0, secs: 0.7 }, { level: 0, secs: 0.7 }]);
    const zs = [quiet1, quiet2, quiet3].map((r) => r.state.endZ);   // in the cloth's own frame: the slow turn about the pole does not count
    check('flag: in silence its folds keep moving', Math.max(...zs) - Math.min(...zs) > 0.005, JSON.stringify(zs));
    // Wind 0: the tone of the sound must not move it either.
    const still0 = [{ level: 0, secs: 2 }], toned0 = [{ level: 0.8, secs: 2, low: 0.9, high: 0.9 }];
    const [w0] = await flagRun(RAINBOW, still0, { knobs: { wind: 0 } }), [w0Tone] = await flagRun(RAINBOW, toned0, { knobs: { wind: 0 } }), [w50Tone] = await flagRun(RAINBOW, toned0);
    check('flag: Wind 0 keeps the tone of the sound off the cloth too', w0Tone.state.high > 0.6 && w0Tone.state.cloth.low === 0 && w0Tone.state.cloth.high === 0 && Math.abs(w0Tone.state.ripple - w0.state.ripple) < 1e-9
      && w50Tone.state.cloth.high === w50Tone.state.high && w50Tone.state.cloth.low === w50Tone.state.low && w50Tone.state.cloth.low > 0.6,
      JSON.stringify({ wind0: [w0.state.ripple, w0Tone.state.ripple, w0Tone.state.cloth], wind50: w50Tone.state.cloth }));
    // Heart rate turned to 0 while every heart is in the air: none sets off afterwards.
    const syllables = (n, extra) => Array.from({ length: n }, (_, i) => Object.assign({ level: i % 2 ? 0.9 : 0.05, secs: 0.2 }, extra));
    const crowd = await flagRun(RAINBOW, [...syllables(30), { level: 0.9, secs: 0.2, knobs: { heartRate: 0 } }, ...syllables(20)], { knobs: { heartRate: 100 } });
    check('flag: turning Heart rate to 0 stops hearts at once, even with every heart in the air', crowd[29].state.hearts >= 54 && crowd[30].state.heartsMade === crowd[29].state.heartsMade
      && crowd[50].state.heartsMade === crowd[29].state.heartsMade && crowd[50].state.hearts < 20, JSON.stringify([crowd[29].state.hearts, crowd[29].state.heartsMade, crowd[30].state.heartsMade, crowd[50].state.heartsMade, crowd[50].state.hearts]));
    check('rainbow flag: the cloth keeps a little of its own colour in the shade', rbLoud.state.glow === 0.14, String(rbLoud.state.glow));

    // Fireworks: a spark in the air burns out where it is; a new burst never takes it.
    const volley = await flagRun(JULY, syllables(16), { knobs: { burstChance: 100 } });
    const last = volley[15].state;
    check('fourth of july flag: bursts one after another never cut a spark off in mid-air', last.bursts >= 6 && last.sparksCut === 0 && volley.some((r) => r.state.sparks > 160), JSON.stringify({ bursts: last.bursts, cut: last.sparksCut, most: Math.max(...volley.map((r) => r.state.sparks)) }));
    check('fourth of july flag: a long loud note is two bursts, 0.38 s apart at the least', after.state.bursts === 2, String(after.state.bursts));
    const sparkPalette = [[255, 70, 84], [255, 255, 255], [96, 150, 255]];
    check('fourth of july flag: sparks take the flag\'s spark colours', (bang.state.sparkTints || []).length === 80
      && bang.state.sparkTints.every((c) => sparkPalette.some((p) => Math.abs(p[0] - c[0]) <= 1 && Math.abs(p[1] - c[1]) <= 1 && Math.abs(p[2] - c[2]) <= 1)), JSON.stringify((bang.state.sparkTints || []).slice(0, 3)));
    check('fourth of july flag: the stars\' shine is the cloth\'s own glow', Math.abs(shine.state.glow - 1.1 * shine.state.shine) < 1e-9 && noShine.state.glow === 0 && dull.state.glow < 0.06, JSON.stringify([dull.state.glow, shine.state.glow, noShine.state.glow]));

    // A flag's parts are separate: stars shine without fireworks, and fireworks do not make a flag glow.
    const parts = await wide.evaluate(() => {
      const saved = { frequencies, micActive }, f = new Uint8Array(32).fill(230);
      const run = (id, spec) => {
        TimbreFlag.FLAGS[id] = spec;
        let scene = null;
        try {
          scene = TimbreScene.create(TimbreFlag.definition(id));
          if (!scene) return null;
          let now = 200000;
          for (let i = 0; i < 120; i++) { now += 1000 / 60; scene.draw(now, 1 / 60); }
          const st = TimbreScene.debug().state;
          return { shine: st.shine, glow: st.glow, sparks: st.sparks, hearts: st.hearts, stripes: st.stripes };
        } finally { if (scene) scene.dispose(); delete TimbreFlag.FLAGS[id]; }
      };
      setActiveViz('pride-ribbon'); currentViz.stop();   // the WebGL canvas stays showing, with no scene on it
      try {
        TimbreScene.testLevel = 0.7; frequencies = f; micActive = true;
        return {
          union: run('test-union', { aspect: 1.5, stripes: [[10, 20, 30, 1]], canton: { width: 0.4, height: 0.5, color: [0, 0, 90] } }),
          sparks: run('test-sparks', { aspect: 1.5, stripes: [[200, 20, 30, 1], [20, 20, 200, 1]], sparks: [[255, 255, 255]] }),
        };
      } finally { TimbreScene.testLevel = null; frequencies = saved.frequencies; micActive = saved.micActive; setActiveViz('visualizer'); }
    });
    check('a flag with a union and no fireworks still has stars that shine; one with fireworks and no union keeps its plain glow',
      !!parts.union && !!parts.sparks && parts.union.shine > 0.5 && Math.abs(parts.union.glow - 1.1 * parts.union.shine) < 1e-9 && parts.union.sparks === 0 && parts.union.hearts === 0
      && parts.sparks.glow === 0.14 && parts.sparks.shine === 0 && parts.sparks.stripes === 2, JSON.stringify(parts));

    // Camera drift, placement, cost.
    const [still] = await flagRun(RAINBOW, talk, { knobs: { cameraDrift: 0 } }), [drift] = await flagRun(RAINBOW, talk, { knobs: { cameraDrift: 100 } });
    check('flag: Camera drift 0 holds the camera still; 100 doubles the swing', still.state.orbit === 0 && Math.abs(rbLoud.state.orbit) > 0.005 && Math.abs(drift.state.orbit - 2 * rbLoud.state.orbit) < 1e-9, JSON.stringify([still.state.orbit, rbLoud.state.orbit, drift.state.orbit]));
    await activate(RAINBOW);
    const flagP0 = await probe();
    await pushConfig((c) => { c.activeViz = 'pride-ribbon'; c.placement.x = 30; });
    await wide.waitForTimeout(400);
    const flagP1 = await probe();
    check('flag: Scene placement slides it', flagP1.centroidX - flagP0.centroidX > 150, `${flagP0.centroidX.toFixed(0)} → ${flagP1.centroidX.toFixed(0)}`);
    for (const id of [RAINBOW, JULY]) {
      await activate(id);
      const cost = await wide.evaluate(() => { let now = performance.now(), acc = 0; for (let i = 0; i < 120; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); acc += performance.now() - t; } return acc / 120; });
      check(`${id}: draw() averages under 4 ms of script time (${cost.toFixed(2)} ms)`, cost < 4);
    }

    }

    // ── The sunburst (a kit scene: a star with a crown of light) ───────────────
    {   // its own block: the names below are the sunburst's own
    // Build the scene afresh, drive the level and the 32 bins by hand, and read the canvas and
    // the scene after each step. A step gives level (null: whatever the kit hears), secs, and
    // either all (every bin, 0..1) or bins ([[bin, 0..1], ...]); idle: true has the mic off,
    // off: true has the mic and Idle animation off.
    const SUN = 'sunburst-3d';
    // hue and colorSpeed set the palette's place and speed for the run, gain the Gain setting. A trace row is
    // [spin, flame, kick, brightness at piece 9, reach, brightness at the star, the reference beam's direction, clock].
    const sunRun = (steps, { fps = 60, knobs = null, hue = null, colorSpeed = null, gain = null } = {}) => wide.evaluate(({ id, steps, fps, knobs, hue, colorSpeed, gain }) => {
      window.frame = function () {};
      const saved = { frequencies, micActive, cfgIdleAnim, cfgColorHue, cfgColorSpeed, cfgGain }, knobs0 = Object.assign({}, perViz[id]);
      try {
        if (knobs) Object.assign(perViz[id], knobs);
        if (hue !== null) cfgColorHue = hue;
        if (colorSpeed !== null) cfgColorSpeed = colorSpeed;
        if (gain !== null) cfgGain = gain;
        TimbreScene.testLevel = 0;
        setActiveViz('visualizer'); setActiveViz(id);
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), f = new Uint8Array(32), out = [];
        let now = 100000 + 1000 / 120;
        for (const st of steps) {
          TimbreScene.testLevel = st.level;
          micActive = !st.idle && !st.off;
          cfgIdleAnim = st.off ? false : saved.cfgIdleAnim;
          if (st.knobs) Object.assign(perViz[id], st.knobs);
          f.fill(st.all !== undefined ? Math.round(st.all * 255) : 0);
          if (st.bins) for (const [i, v] of st.bins) f[i] = Math.round(v * 255);
          frequencies = f;
          const trace = st.trace ? [] : null;
          let firstCam = null;
          for (let i = 0, n = Math.round(st.secs * fps); i < n; i++) {
            now += 1000 / fps; currentViz.draw(now, 1 / fps);
            const q = window.__timbre.scene.state;
            if (firstCam === null) firstCam = q.cam;
            if (trace) trace.push([q.spin, q.flame, q.kick, q.bright[9], q.reach, q.bright[0], q.aim, q.clock]);
          }
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);   // row 0 is the bottom of the canvas
          let solid = 0, light = 0, lightSum = 0, edge = 0, empty = 0, hash = 2166136261;
          for (let i = 0; i < px.length; i++) hash = Math.imul(hash ^ px[i], 16777619) >>> 0;   // the whole picture, as one number
          const box = [w, -1, h, -1], solidBox = [w, -1, h, -1];
          const grow = (b, x, y) => { if (x < b[0]) b[0] = x; if (x > b[1]) b[1] = x; if (y < b[2]) b[2] = y; if (y > b[3]) b[3] = y; };
          for (let i = 0; i < px.length; i += 4) {
            const x = (i / 4) % w, y = Math.floor(i / 4 / w), rgb = px[i] + px[i + 1] + px[i + 2], a = px[i + 3];
            if (a > 250) { solid++; grow(solidBox, x, y); }
            else if (a < 5 && rgb > 12) {
              light++; lightSum += rgb; grow(box, x, y);
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
            }
            if (a === 0 && rgb === 0) empty++;
          }
          const size = (b) => ({ w: b[1] < 0 ? 0 : b[1] - b[0] + 1, h: b[3] < 0 ? 0 : b[3] - b[2] + 1, cx: (b[0] + b[1]) / 2, cy: (b[2] + b[3]) / 2 });
          const s = window.__timbre.scene, state = (s && s.state) || {}, c = (Math.floor(h / 2) * w + Math.floor(w / 2)) * 4;
          out.push({ state, textures: s ? s.memory.textures : -1, solid, light, lightSum, edge, empty: empty / (w * h), cornerAlpha: px[3], centreAlpha: px[c + 3],
            box: size(box), solidBox: size(solidBox), canvas: [w, h], trace, firstCam, hash, kitCam: s ? s.camera : null,
            expectTip: state.rays ? getColor(state.colorT + (state.ref / state.rays) * 1.4) : null,
            fit: TimbreScene.fitDistance(8.4, 7.4, 30, canvas3d.clientWidth / canvas3d.clientHeight) });
        }
        return out;
      } finally {
        frequencies = saved.frequencies; micActive = saved.micActive; cfgIdleAnim = saved.cfgIdleAnim; cfgColorHue = saved.cfgColorHue; cfgColorSpeed = saved.cfgColorSpeed; cfgGain = saved.cfgGain;
        Object.assign(perViz[id], knobs0); TimbreScene.testLevel = null;
      }
    }, { id: SUN, steps, fps, knobs, hue, colorSpeed, gain });
    const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    const sunPeak = (a) => { let at = -1, top = 0; (a || []).forEach((v, i) => { if (v > top) { top = v; at = i; } }); return { at, top }; };
    const talk = [{ level: 0.8, all: 0.8, secs: 2 }];
    // Thresholds are 60% of what the scene gives at a steady 0.8: about 11,000 solid pixels
    // (the star) and 224,000 pixels of light (the crown and the glow).
    const SUN_SOLID = 6500, SUN_LIGHT = 134000;

    await activate(SUN);
    const sunState = await sceneState();
    const [loud] = await sunRun(talk);
    const [hush] = await sunRun([{ level: 0, secs: 2 }]);
    check('sunburst-3d is a kit scene: a solid star in the middle, light all round it, a transparent corner',
      !!sunState && sunState.active === true && sunState.targetSize[0] === 1728 && loud.solid > SUN_SOLID && loud.light > SUN_LIGHT && loud.cornerAlpha === 0 && loud.centreAlpha === 255 && loud.edge === 0 && loud.empty > 0.3,
      JSON.stringify({ size: sunState && sunState.targetSize, solid: loud.solid, light: loud.light, corner: loud.cornerAlpha, centre: loud.centreAlpha, edge: loud.edge, empty: loud.empty }));
    check('sunburst: the star is a round ball in the middle of the frame', Math.abs(loud.solidBox.w - loud.solidBox.h) <= 0.1 * loud.solidBox.h && Math.abs(loud.solidBox.cx - loud.canvas[0] / 2) < 0.05 * loud.canvas[0]
      && Math.abs(loud.solidBox.cy - loud.canvas[1] / 2) < 0.08 * loud.canvas[1] && loud.solid > 0.7 * (Math.PI / 4) * loud.solidBox.w * loud.solidBox.h, JSON.stringify(loud.solidBox));
    check('sunburst: louder, the beams reach further and the crown is larger', Math.abs(loud.state.reach - 3 * (0.1 + 0.9 * 0.92)) < 0.01 && Math.abs(hush.state.reach - 0.3) < 0.01 && loud.box.w > hush.box.w * 1.8 && loud.box.h > hush.box.h * 1.5 && loud.lightSum > 3 * hush.lightSum,
      JSON.stringify({ reach: [hush.state.reach, loud.state.reach], box: [hush.box, loud.box], sum: [hush.lightSum, loud.lightSum] }));
    check('sunburst: in silence the star is still there, small, with short spikes', hush.solid > 0.5 * loud.solid && hush.light > 500 && hush.state.amps.every((a) => a < 0.001), JSON.stringify([hush.solid, hush.light]));

    // Bands: the belt hears the low end, the poles the higher bins; every beam answers the voice a little.
    const belt = (r) => mean(r.state.amps.filter((_, i) => Math.abs(r.state.ys[i]) < 0.2)), pole = (r) => mean(r.state.amps.filter((_, i) => Math.abs(r.state.ys[i]) > 0.8));
    const [lowOnly] = await sunRun([{ level: 0.5, bins: [[0, 1], [1, 1]], secs: 2 }]), [highOnly] = await sunRun([{ level: 0.5, bins: [[8, 1], [9, 1], [10, 1]], secs: 2 }]);
    check('sunburst: the low end drives the belt round the middle', belt(lowOnly) > pole(lowOnly) + 0.4 && belt(lowOnly) > 0.8, JSON.stringify([belt(lowOnly), pole(lowOnly)]));
    check('sunburst: the higher bins drive the beams near the poles', pole(highOnly) > belt(highOnly) + 0.4 && pole(highOnly) > 0.7, JSON.stringify([belt(highOnly), pole(highOnly)]));
    const [noBins] = await sunRun([{ level: 0.8, secs: 2 }]);
    check('sunburst: with no band of its own, every beam still answers the voice a little', noBins.state.amps.length === 84 && noBins.state.amps.every((a) => Math.abs(a - 0.45 * 0.8) < 0.01)
      && Math.abs(noBins.state.reach - 3 * (0.1 + 0.9 * 0.36)) < 0.03, JSON.stringify([Math.min(...noBins.state.amps), Math.max(...noBins.state.amps), noBins.state.reach]));
    const [gained] = await sunRun([{ level: 0.5, bins: [[0, 0.4], [1, 0.4]], secs: 2 }]);
    check('sunburst: a beam\'s reach is its loudest band\'s length', Math.abs(lowOnly.state.reach - 3 * (0.1 + 0.9 * Math.max(...lowOnly.state.amps))) < 1e-4 && gained.state.reach < lowOnly.state.reach - 0.5,
      JSON.stringify([gained.state.reach, lowOnly.state.reach, Math.max(...lowOnly.state.amps)]));

    const quiet = [{ level: 0.5, bins: [[0, 0.4], [1, 0.4]], secs: 2 }];
    const [plain] = await sunRun(quiet, { gain: 1 }), [boosted] = await sunRun(quiet, { gain: 2 });
    check('sunburst: Gain scales what the band of a beam gives', Math.abs(Math.max(...plain.state.amps) - (0.7 * 0.4 + 0.45 * 0.5)) < 0.01 && Math.abs(Math.max(...boosted.state.amps) - (0.7 * 0.8 + 0.45 * 0.5)) < 0.01
      && boosted.state.low > 1.9 * plain.state.low, JSON.stringify({ amp: [Math.max(...plain.state.amps), Math.max(...boosted.state.amps)], low: [plain.state.low, boosted.state.low] }));

    // A syllable is a shell of brightness that travels out along the beams.
    const syllable = [{ level: 0, all: 1, secs: 1 }, { level: 0.9, all: 1, secs: 0.1 }];
    const [, , soon] = await sunRun([...syllable, { level: 0, all: 1, secs: 0.25 }]), [, , late] = await sunRun([...syllable, { level: 0, all: 1, secs: 0.6 }]);
    check('sunburst: a syllable travels through the voice history at 20 samples a second', sunPeak(soon.state.hist).at === 5 && sunPeak(late.state.hist).at === 12 && sunPeak(soon.state.hist).top > 0.5,
      JSON.stringify([sunPeak(soon.state.hist), sunPeak(late.state.hist)]));
    check('sunburst: on a beam it is a shell of brightness moving outward, under half way after a quarter second and well past it after 0.6 s',
      sunPeak(soon.state.pulse).at >= 4 && sunPeak(soon.state.pulse).at <= 6 && sunPeak(late.state.pulse).at >= 8 && sunPeak(late.state.pulse).at >= sunPeak(soon.state.pulse).at + 4 && sunPeak(soon.state.pulse).top > 0.5
      && soon.state.bright[sunPeak(soon.state.pulse).at] > 3 * soon.state.bright[10], JSON.stringify({ soon: sunPeak(soon.state.pulse), late: sunPeak(late.state.pulse), bright: soon.state.bright.map((v) => +v.toFixed(2)) }));

    const heardAt = (hist, secs) => { const a = Math.max(0, Math.min(hist.length - 1, secs * 20)), j = Math.min(hist.length - 2, Math.floor(a)); return hist[j] + (hist[j + 1] - hist[j]) * (a - j); };
    const shellError = (r) => {
      const len = 3 * (0.1 + 0.9 * r.state.amps[r.state.ref]) * (1 + 0.3 * r.state.kick);
      return Math.max(...r.state.pulse.map((p, j) => Math.abs(p - heardAt(r.state.hist, (Math.max(0, 0.42 + (len + 0.18) * (j / 12) - 0.6) / 3) * 0.9))));
    };
    check('sunburst: light leaves the star\'s surface and takes 0.9 s to travel the longest reach, whatever the beam\'s own length', soon.state.hist.length === 25 && shellError(soon) < 1e-4 && shellError(late) < 1e-4
      && late.state.reach < soon.state.reach - 0.2, JSON.stringify({ error: [shellError(soon), shellError(late)], reach: [soon.state.reach, late.state.reach], hist: soon.state.hist.length }));

    // A beat.
    const beat = [{ level: 0.05, all: 0.5, secs: 1 }, { level: 0.9, all: 0.5, secs: 0.1 }, { level: 0.9, all: 0.5, secs: 2.5 }];
    const [calm, hit, after] = await sunRun(beat);
    check('sunburst: a beat lengthens the beams and swells the star, then lets go', hit.state.kick > 0.5 && after.state.kick < 0.001 && calm.state.kick === 0
      && Math.abs(hit.state.reach - 3 * (0.1 + 0.9 * Math.max(...hit.state.amps)) * (1 + 0.3 * hit.state.kick)) < 1e-4
      && Math.abs(hit.state.swell - (1 + 0.22 * hit.state.low + 0.3 * hit.state.kick)) < 1e-9 && hit.state.swell > after.state.swell + 0.1 && hit.solid > after.solid * 1.15 && hit.edge === 0,
      JSON.stringify({ kick: [calm.state.kick, hit.state.kick, after.state.kick], reach: hit.state.reach, swell: [hit.state.swell, after.state.swell], solid: [hit.solid, after.solid], edge: hit.edge }));
    const hitAmp = hit.state.amps[hit.state.ref];
    check('sunburst: a beat also widens and brightens the beams and spreads the star\'s glow',
      Math.abs(hit.state.width - 0.13 * (0.55 + 0.75 * hitAmp) * (1 + 0.4 * hit.state.kick)) < 1e-6 && hit.state.width > after.state.width * 1.15
      && Math.abs(hit.state.bright[0] - (0.12 + 1.9 * Math.pow(hit.state.pulse[0], 1.4) + 0.4 * hit.state.kick) * (0.6 + 0.6 * hitAmp)) < 1e-4
      && Math.abs(hit.state.glowSize - 0.6 * hit.state.swell * (4.2 + 1.6 * hit.state.flame + 2 * hit.state.kick)) < 1e-6 && hit.state.glowSize > after.state.glowSize * 1.2,
      JSON.stringify({ width: [hit.state.width, after.state.width], bright0: hit.state.bright[0], glow: [hit.state.glowSize, after.state.glowSize] }));
    const [bass] = await sunRun([{ level: 0.5, bins: [[0, 1], [1, 1], [2, 1], [3, 1]], secs: 3 }]), [treble] = await sunRun([{ level: 0.5, bins: [[6, 1], [8, 1], [10, 1], [12, 1]], secs: 3 }]);
    check('sunburst: the low end swells the star', bass.state.low > 0.95 && treble.state.low < 0.01 && bass.state.swell > 1.2 && Math.abs(treble.state.swell - 1) < 0.01 && bass.solid > treble.solid * 1.25,
      JSON.stringify({ low: [bass.state.low, treble.state.low], swell: [bass.state.swell, treble.state.swell], solid: [bass.solid, treble.solid] }));

    // The high end makes the outer half of the beams flicker.
    const swing = (r, at = 3) => { const b = r.trace.map((t) => t[at]); return (Math.max(...b) - Math.min(...b)) / Math.max(...b); };
    const [, flick] = await sunRun([{ level: 0.6, bins: [[5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1]], secs: 3 }, { level: 0.6, bins: [[5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1]], secs: 1, trace: true }]);
    const [, steady] = await sunRun([{ level: 0.6, bins: [[0, 1], [1, 1]], secs: 3 }, { level: 0.6, bins: [[0, 1], [1, 1]], secs: 1, trace: true }]);
    check('sunburst: the high end makes a beam flicker, more the further out and not at all at the star; without it the beam is steady', flick.state.high > 0.9 && steady.state.high < 0.01 && swing(flick) > 0.5 && swing(steady) < 0.02
      && swing(flick, 5) < 0.02, JSON.stringify({ high: [flick.state.high, steady.state.high], swing: [swing(flick), swing(steady)], atTheStar: swing(flick, 5) }));

    // Density.
    const [few] = await sunRun(talk, { knobs: { density: 0 } }), [many] = await sunRun(talk, { knobs: { density: 100 } });
    check('sunburst: Density 0 is 24 beams, the default 84, 100 is 144', few.state.rays === 24 && loud.state.rays === 84 && many.state.rays === 144 && few.state.amps.length === 24 && many.state.amps.length === 144
      && few.state.drawn === 24 * 12 * 6 && many.state.drawn === 144 * 12 * 6 && many.lightSum > 1.3 * few.lightSum, JSON.stringify({ rays: [few.state.rays, loud.state.rays, many.state.rays], drawn: [few.state.drawn, many.state.drawn], sum: [few.lightSum, many.lightSum] }));
    const moved = await sunRun([{ level: 0.8, all: 0.8, secs: 1 }, { level: 0.8, all: 0.8, secs: 1, knobs: { density: 100 } }, { level: 0.8, all: 0.8, secs: 1, knobs: { density: 0 } }]);
    check('sunburst: a change of Density applies at once, both ways', moved[0].state.rays === 84 && moved[1].state.rays === 144 && moved[2].state.rays === 24 && moved[1].lightSum > moved[2].lightSum * 1.3
      && moved[2].state.amps.length === 24 && moved[1].state.amps.every((a) => a > 0.9) && moved[1].textures === moved[0].textures && moved[2].textures === moved[0].textures,
      JSON.stringify(moved.map((m) => [m.state.rays, m.lightSum, m.textures])));

    const back = await sunRun([{ level: 0.8, all: 0.8, secs: 1, knobs: { density: 100 } }, { level: 0, secs: 0.1, knobs: { density: 0 } }, { level: null, off: true, secs: 3 }, { level: null, off: true, secs: 1 / 60, knobs: { density: 100 } }]);
    check('sunburst: beams that come back when Density is raised start from nothing, not from where they were', back[0].state.rays === 144 && back[2].state.rays === 24 && back[3].state.rays === 144
      && back[3].state.amps.every((a) => a < 0.001) && Math.abs(back[3].state.reach - 0.3) < 0.01, JSON.stringify({ rays: back.map((b) => b.state.rays), most: Math.max(...back[3].state.amps), reach: back[3].state.reach }));

    // Spin.
    const turning = [{ level: 0.05, all: 0.5, secs: 1 }, { level: 0.9, all: 0.5, secs: 1.5, trace: true }];
    const [, spun] = await sunRun(turning), [, held] = await sunRun(turning, { knobs: { spin: 0 } }), [, fast] = await sunRun(turning, { knobs: { spin: 100 } });
    let worstSpin = 0, kicked = 0;
    for (let i = 1; i < spun.trace.length; i++) {
      const [spin, flame, kick] = spun.trace[i];
      worstSpin = Math.max(worstSpin, Math.abs(spin - spun.trace[i - 1][0] - (0.1 + 0.35 * flame + 0.5 * kick) / 60));
      kicked = Math.max(kicked, kick);
    }
    check('sunburst: the crown turns faster with the voice and faster still on a beat', spun.trace.length === 90 && worstSpin < 1e-9 && kicked > 0.9 && spun.state.spin > 0.5, JSON.stringify({ frames: spun.trace.length, worst: worstSpin, kicked, spin: spun.state.spin }));
    // The crown itself: the direction the reference beam (on the crown's belt) points in.
    const between = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
    const swept = (r) => between(r.trace[0][6], r.trace[r.trace.length - 1][6]);
    check('sunburst: the crown itself turns as far as its spin says', Math.abs(swept(spun) - (spun.trace[89][0] - spun.trace[0][0])) < 0.06 && swept(spun) > 0.4 && Math.abs(Math.hypot(...spun.state.aim) - 1) < 1e-6,
      JSON.stringify({ swept: swept(spun), spin: spun.trace[89][0] - spun.trace[0][0] }));
    check('sunburst: Spin 0 holds the crown still, its tilt included; 100 doubles the turning', held.state.spin === 0 && held.state.sway === 0 && held.trace.every((t) => between(t[6], held.trace[0][6]) < 1e-6)
      && Math.abs(fast.state.spin - 2 * spun.state.spin) < 1e-9 && Math.abs(fast.state.sway - 2 * spun.state.sway) < 1e-9 && spun.state.sway > 2,
      JSON.stringify({ spin: [held.state.spin, spun.state.spin, fast.state.spin], sway: [held.state.sway, spun.state.sway, fast.state.sway], rocked: Math.max(...held.trace.map((t) => between(t[6], held.trace[0][6]))) }));

    // Camera.
    const [still] = await sunRun(talk, { knobs: { cameraDrift: 0 } }), [drift] = await sunRun(talk, { knobs: { cameraDrift: 100 } });
    check('sunburst: Camera drift 0 holds the camera still; 100 doubles the sway', still.state.orbit === 0 && Math.abs(loud.state.orbit) > 0.005 && Math.abs(drift.state.orbit - 2 * loud.state.orbit) < 1e-9, JSON.stringify([still.state.orbit, loud.state.orbit, drift.state.orbit]));
    const camDist = (c) => Math.hypot(c[0], c[1] - 3.6, c[2]);
    // In update() the camera is where the last frame left it: a frame's swing behind the kit's, and on the
    // first frame where the kit put it when the scene was made (at its distance, with no swing yet).
    check('sunburst: the beams are turned to face where the kit\'s camera is', !!loud.kitCam && Math.hypot(loud.state.cam[0] - loud.kitCam[0], loud.state.cam[1] - loud.kitCam[1], loud.state.cam[2] - loud.kitCam[2]) < 0.05
      && Math.abs(loud.kitCam[0]) > 0.5 && Math.abs(camDist(loud.kitCam) - loud.fit) < 0.01 && loud.fit > 10, JSON.stringify({ fit: loud.fit, cam: loud.state.cam, kit: loud.kitCam }));
    check('sunburst: on its first frame they face where the kit put the camera when the scene was made', Math.abs(loud.firstCam[0]) < 1e-9 && Math.abs(loud.firstCam[2] - loud.fit * Math.cos((5 * Math.PI) / 180)) < 0.01
      && Math.abs(camDist(loud.firstCam) - loud.fit) < 0.01, JSON.stringify({ fit: loud.fit, first: loud.firstCam }));

    // The same at any frame rate.
    const fpsSteps = [{ level: 0.8, all: 0.8, secs: 1 }, { level: 0, all: 0, secs: 0.5 }];
    const [, s30] = await sunRun(fpsSteps, { fps: 30 }), [, s60] = await sunRun(fpsSteps, { fps: 60 });
    check('sunburst: the same sound gives the same star at 30 and 60 fps', Math.abs(s30.state.spin - s60.state.spin) < 0.02 && Math.abs(s30.state.reach - s60.state.reach) < 0.06 && s60.state.reach > 0.75
      && Math.abs(s30.state.clock - 1.5) < 1e-6 && Math.abs(s60.state.clock - 1.5) < 1e-6 && Math.abs(s30.state.sway - s60.state.sway) < 1e-6
      && s60.state.hist.every((v, i) => Math.abs(v - s30.state.hist[i]) < 0.05) && Math.abs(s30.state.low - s60.state.low) < 0.02,
      JSON.stringify({ spin: [s30.state.spin, s60.state.spin], reach: [s30.state.reach, s60.state.reach], low: [s30.state.low, s60.state.low] }));

    // Mic off.
    const [idle1, idle2] = await sunRun([{ level: null, idle: true, secs: 2 }, { level: null, idle: true, secs: 1.5 }]);
    check('sunburst: with the mic off and Idle animation on, the crown turns and its beams breathe', idle1.state.live === true && idle2.state.spin > idle1.state.spin + 0.1 && idle1.state.reach > 0.8 && idle1.state.reach < 2.4
      && idle1.state.amps.some((a, i) => Math.abs(a - idle2.state.amps[i]) > 0.1) && idle1.light > 3000, JSON.stringify({ spin: [idle1.state.spin, idle2.state.spin], reach: [idle1.state.reach, idle2.state.reach], light: idle1.light }));
    // Camera drift 0 and a palette that stands still, so that nothing but the scene could move the picture.
    const [off1, off2] = await sunRun([{ level: null, off: true, secs: 3 }, { level: null, off: true, secs: 1, trace: true }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    const [on1, on2] = await sunRun([{ level: null, idle: true, secs: 3 }, { level: null, idle: true, secs: 1 }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    check('sunburst: with the mic and Idle animation off the picture holds still, pixel for pixel', off1.hash === off2.hash && on1.hash !== on2.hash && off2.light > 500
      && off2.trace.every((t) => between(t[6], off2.trace[0][6]) === 0), JSON.stringify({ off: [off1.hash, off2.hash], idle: [on1.hash, on2.hash], light: off2.light }));
    check('sunburst: with the mic and Idle animation off, the crown does not turn and nothing flickers', off1.state.live === false && off2.state.spin === off1.state.spin && off2.state.clock === off1.state.clock
      && off2.state.amps.every((a) => a < 0.001) && Math.abs(off2.state.reach - 0.3) < 0.01 && swing(off2) < 0.001 && off2.solid > 0.5 * loud.solid,
      JSON.stringify({ spin: [off1.state.spin, off2.state.spin], clock: [off1.state.clock, off2.state.clock], reach: off2.state.reach, swing: swing(off2) }));

    // Colour.
    const [hued] = await sunRun(talk, { hue: 2 });
    const close = (a, b) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 2);
    check('sunburst: a beam takes its colour from the palette, and the hue setting moves it', close(loud.state.tip, loud.expectTip) && close(hued.state.tip, hued.expectTip) && !close(hued.state.tip, loud.state.tip),
      JSON.stringify({ tip: loud.state.tip, expect: loud.expectTip, hued: hued.state.tip, hueExpect: hued.expectTip }));

    // Placement and cost.
    await activate(SUN);
    const sunP0 = await probe();
    await pushConfig((c) => { c.activeViz = 'sunburst-3d'; c.placement.x = 30; });
    await wide.waitForTimeout(400);
    const sunP1 = await probe();
    check('sunburst: Scene placement slides it', sunP1.centroidX - sunP0.centroidX > 150, `${sunP0.centroidX.toFixed(0)} → ${sunP1.centroidX.toFixed(0)}`);
    await pushConfig((c) => { c.placement.x = 0; });
    await wide.waitForTimeout(300);
    await activate(SUN);
    const sunCost = await wide.evaluate(() => { perViz['sunburst-3d'].density = 100; try { let now = performance.now(), acc = 0; for (let i = 0; i < 120; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); acc += performance.now() - t; } return acc / 120; } finally { perViz['sunburst-3d'].density = 50; } });
    check(`sunburst-3d: draw() with all 144 beams averages under 4 ms of script time (${sunCost.toFixed(2)} ms)`, sunCost < 4);

    // The kit places the camera when a scene is created, so its first update() already has it.
    const firstUpdate = await wide.evaluate(() => {
      setActiveViz('sunburst-3d'); currentViz.stop();   // the WebGL canvas stays showing, with no scene on it
      let seen = null, scene = null;
      try {
        scene = TimbreScene.create({ frame: { width: 6, height: 4, center: [0, 2, 0] }, fov: 30, pitch: 10, build() {}, update(k) { if (seen === null) seen = k.camera.position.length(); } });
        if (!scene) return null;
        scene.draw(300000, 1 / 60);
        return seen;
      } finally { if (scene) scene.dispose(); setActiveViz('visualizer'); }
    });
    check('a scene\'s camera is in place before its first update', firstUpdate !== null && firstUpdate > 5, String(firstUpdate));

    }

    // ── The mountains (a kit scene: a block of land that the voice raises) ─────
    {   // its own block: the names below are the mountains' own
    // Build the scene afresh, drive the level and the 32 bins by hand, and read the canvas and
    // the scene after each step. A step gives level (null: whatever the kit hears), secs, and
    // either all (every bin, 0..1) or bins ([[bin, 0..1], ...]); idle: true has the mic off,
    // off: true has the mic and Idle animation off.
    const LAND = 'mountains-3d';
    // hue and colorSpeed set the palette's place and speed for the run, gain the Gain setting. A trace row is
    // [travel, top, flame, kick, lift, sun, sunSize, clock, peak, orbit].
    const landRun = (steps, { fps = 60, knobs = null, hue = null, colorSpeed = null, gain = null } = {}) => wide.evaluate(({ id, steps, fps, knobs, hue, colorSpeed, gain }) => {
      window.frame = function () {};
      const saved = { frequencies, micActive, cfgIdleAnim, cfgColorHue, cfgColorSpeed, cfgGain }, knobs0 = Object.assign({}, perViz[id]);
      try {
        if (knobs) Object.assign(perViz[id], knobs);
        if (hue !== null) cfgColorHue = hue;
        if (colorSpeed !== null) cfgColorSpeed = colorSpeed;
        if (gain !== null) cfgGain = gain;
        TimbreScene.testLevel = 0;
        setActiveViz('visualizer'); setActiveViz(id);
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), f = new Uint8Array(32), out = [];
        let now = 100000 + 1000 / 120;
        for (const st of steps) {
          TimbreScene.testLevel = st.level;
          micActive = !st.idle && !st.off;
          cfgIdleAnim = st.off ? false : saved.cfgIdleAnim;
          if (st.knobs) Object.assign(perViz[id], st.knobs);
          f.fill(st.all !== undefined ? Math.round(st.all * 255) : 0);
          if (st.bins) for (const [i, v] of st.bins) f[i] = Math.round(v * 255);
          frequencies = f;
          const trace = st.trace ? [] : null;
          for (let i = 0, n = Math.round(st.secs * fps); i < n; i++) {
            now += 1000 / fps; currentViz.draw(now, 1 / fps);
            if (trace) { const q = window.__timbre.scene.state; trace.push([q.travel, q.top, q.flame, q.kick, q.lift, q.sun, q.sunSize, q.clock, q.peak, q.orbit]); }
          }
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);   // row 0 is the bottom of the canvas
          let solid = 0, white = 0, light = 0, lightSum = 0, edge = 0, empty = 0, hash = 2166136261;
          for (let i = 0; i < px.length; i++) hash = Math.imul(hash ^ px[i], 16777619) >>> 0;   // the whole picture, as one number
          const box = [w, -1, h, -1], solidBox = [w, -1, h, -1];
          const grow = (b, x, y) => { if (x < b[0]) b[0] = x; if (x > b[1]) b[1] = x; if (y < b[2]) b[2] = y; if (y > b[3]) b[3] = y; };
          for (let i = 0; i < px.length; i += 4) {
            const x = (i / 4) % w, y = Math.floor(i / 4 / w), rgb = px[i] + px[i + 1] + px[i + 2], a = px[i + 3];
            if (a > 250) {
              solid++; grow(solidBox, x, y);
              if (px[i] > 170 && px[i + 1] > 170 && px[i + 2] > 170 && Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]) < 60) white++;
            } else if (a < 5 && rgb > 12) {
              light++; lightSum += rgb; grow(box, x, y);
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
            }
            if (a === 0 && rgb === 0) empty++;
          }
          const size = (b) => ({ w: b[1] < 0 ? 0 : b[1] - b[0] + 1, h: b[3] < 0 ? 0 : b[3] - b[2] + 1, cx: (b[0] + b[1]) / 2, cy: (b[2] + b[3]) / 2 });
          // How much of the lowest twentieth of the block's box is solid: its near side, from edge to edge.
          let foot = 0;
          const rows = Math.max(1, Math.round((solidBox[3] - solidBox[2] + 1) / 20));
          if (solidBox[1] >= 0) for (let y = solidBox[2]; y < solidBox[2] + rows; y++) for (let x = solidBox[0]; x <= solidBox[1]; x++) if (px[(y * w + x) * 4 + 3] > 250) foot++;
          foot /= Math.max(1, rows * (solidBox[1] - solidBox[0] + 1));
          const s = window.__timbre.scene, state = (s && s.state) || {};
          out.push({ state, textures: s ? s.memory.textures : -1, solid, white, light, lightSum, edge, empty: empty / (w * h), cornerAlpha: px[3],
            box: size(box), solidBox: size(solidBox), canvas: [w, h], trace, hash, kitCam: s ? s.camera : null, foot,
            // Where the near right corner should be, from the Rotate settings as the scene read them.
            expectCorner: state.turned ? (() => { const K = TimbreScene, M = TimbreMountains, r = state.turned, D = Math.PI / 180, p = K.poseFor(M.BOX, { frame: M.FRAME, fov: M.FOV, pitch: M.PITCH }, r[0], r[1], r[2], state.sway), o = new THREE.Vector3(M.W / 2, 0, M.D / 2).applyEuler(new THREE.Euler(r[0] * D, r[1] * D, r[2] * D, 'XZY')); return [o.x * p.scale + p.x, o.y * p.scale + p.y, o.z * p.scale + p.z]; })() : null,
            // Where each light should come from and where the sun should be, turned as the land is.
            expectLights: state.lights ? (() => { const r = state.turned, D = Math.PI / 180, e = new THREE.Euler(r[0] * D, r[1] * D, r[2] * D, 'XZY'), dir = (x, y, z) => new THREE.Vector3(x, y, z).normalize().applyEuler(e).toArray();
              const sunAt = new THREE.Vector3().fromArray(state.sunLocal).applyEuler(e).multiplyScalar(state.scale).add(new THREE.Vector3().fromArray(state.at)).toArray();
              return { key: dir(-5.5, 4.1, -2.8), fill: dir(2.5, 3, 6), sky: dir(0, 1, 0), sunAt }; })() : null,
            expectRock: state.amps ? getColor(state.colorT + 0.3) : null,
            expectFar: state.amps ? TimbreMountains.heightAt(0, state.travel, state.amps[40]) : null });
        }
        return out;
      } finally {
        frequencies = saved.frequencies; micActive = saved.micActive; cfgIdleAnim = saved.cfgIdleAnim; cfgColorHue = saved.cfgColorHue; cfgColorSpeed = saved.cfgColorSpeed; cfgGain = saved.cfgGain;
        Object.assign(perViz[id], knobs0); TimbreScene.testLevel = null;
      }
    }, { id: LAND, steps, fps, knobs, hue, colorSpeed, gain });
    const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    const top = (a) => Math.max(...a);
    const talk = [{ level: 0.8, all: 0.8, secs: 4 }];
    // Thresholds are 60% of what the scene gives after 4 s at a steady 0.8: about 299,000 solid pixels
    // (the block) and 43,500 pixels of light (the sun, most of it behind the peaks, and the sky's glow).
    const LAND_SOLID = 180000, LAND_LIGHT = 26000;
    const SPC = 4.4 / 52, FLOW = 4.4 / 5, LAND_TALL = 352;   // the block measures 365 pixels

    await activate(LAND);
    const landState = await sceneState();
    const [loud] = await landRun(talk);
    const [hush] = await landRun([{ level: 0, secs: 2 }]);
    check('mountains-3d is a kit scene: a solid block of land, the sun\'s light behind it, a transparent corner',
      !!landState && landState.active === true && landState.targetSize[0] === 1728 && loud.solid > LAND_SOLID && loud.light > LAND_LIGHT && loud.cornerAlpha === 0 && loud.edge === 0 && loud.empty > 0.3,
      JSON.stringify({ size: landState && landState.targetSize, solid: loud.solid, light: loud.light, corner: loud.cornerAlpha, edge: loud.edge, empty: loud.empty }));
    check('mountains: the block sits in the middle of the frame, wider than it is tall', Math.abs(loud.solidBox.cx - loud.canvas[0] / 2) < 0.06 * loud.canvas[0] && loud.solidBox.w > 1.5 * loud.solidBox.h && loud.solidBox.w > 0.3 * loud.canvas[0],
      JSON.stringify({ box: loud.solidBox, canvas: loud.canvas }));
    check('mountains: louder, the land stands higher', loud.state.peak > 1.5 && hush.state.peak <= 2.15 * 0.15 + 1e-6 && hush.state.peak > 0.15 && loud.solid > 1.15 * hush.solid && loud.solidBox.h > 1.3 * hush.solidBox.h,
      JSON.stringify({ peak: [hush.state.peak, loud.state.peak], solid: [hush.solid, loud.solid], box: [hush.solidBox, loud.solidBox] }));
    check('mountains: in silence the block is still there, low foothills with no snow on them', hush.solid > 0.4 * loud.solid && hush.state.amps.every((a) => a < 0.001) && hush.state.snowy === 0 && hush.white < 50 && Math.abs(hush.state.lift - 0.86) < 1e-9,
      JSON.stringify({ solid: hush.solid, snowy: hush.state.snowy, white: hush.white, lift: hush.state.lift }));
    check('mountains: peaks above the snow line are white', loud.state.snowy > 30 && loud.white > 800 && loud.state.peak > 1.05 + 0.3, JSON.stringify({ snowy: loud.state.snowy, white: loud.white, peak: loud.state.peak }));

    // Bands: the middle of the range hears the low end, the flanks the higher bins; every column answers the voice a little.
    const mid = (a) => mean(a.filter((_, c) => Math.abs(c - 40) <= 3)), flank = (a) => mean(a.filter((_, c) => Math.abs(c - 40) >= 26 && Math.abs(c - 40) <= 30));
    const [lowOnly] = await landRun([{ level: 0.5, bins: [[0, 1], [1, 1]], secs: 3 }]), [highOnly] = await landRun([{ level: 0.5, bins: [[8, 1], [9, 1], [10, 1]], secs: 3 }]);
    check('mountains: the low end raises the middle of the range', Math.abs(mid(lowOnly.state.amps) - 0.925) < 0.01 && flank(lowOnly.state.amps) < 0.3 && mid(lowOnly.state.profile) > 1.3 * flank(lowOnly.state.profile),
      JSON.stringify({ amps: [mid(lowOnly.state.amps), flank(lowOnly.state.amps)], land: [mid(lowOnly.state.profile), flank(lowOnly.state.profile)] }));
    check('mountains: the higher bins raise its flanks', flank(highOnly.state.amps) > 0.7 && Math.abs(mid(highOnly.state.amps) - 0.225) < 0.01 && flank(highOnly.state.profile) > 1.3 * mid(highOnly.state.profile),
      JSON.stringify({ amps: [mid(highOnly.state.amps), flank(highOnly.state.amps)], land: [mid(highOnly.state.profile), flank(highOnly.state.profile)] }));
    const [noBins] = await landRun([{ level: 0.8, secs: 3 }]);
    check('mountains: with no band of its own, every column still answers the voice a little', noBins.state.amps.length === 81 && noBins.state.amps.every((a) => Math.abs(a - 0.45 * 0.8) < 0.01),
      JSON.stringify([Math.min(...noBins.state.amps), Math.max(...noBins.state.amps)]));
    const quiet = [{ level: 0.5, bins: [[0, 0.4], [1, 0.4]], secs: 3 }];
    const [plain] = await landRun(quiet, { gain: 1 }), [boosted] = await landRun(quiet, { gain: 2 });
    check('mountains: Gain scales what the band of a column gives', Math.abs(top(plain.state.amps) - (0.7 * 0.4 + 0.45 * 0.5)) < 0.01 && Math.abs(top(boosted.state.amps) - (0.7 * 0.8 + 0.45 * 0.5)) < 0.01,
      JSON.stringify([top(plain.state.amps), top(boosted.state.amps)]));

    // The land flows.
    const flowing = [{ level: 0.5, all: 0.5, secs: 2 }];
    const [mid50] = await landRun(flowing), [slow] = await landRun(flowing, { knobs: { speed: 0 } }), [fast] = await landRun(flowing, { knobs: { speed: 100 } });
    check('mountains: the land flows at the speed the Speed setting gives', Math.abs(mid50.state.travel - 2 * FLOW) < 1e-6 && Math.abs(slow.state.travel - 2 * 0.25 * FLOW) < 1e-6 && Math.abs(fast.state.travel - 2 * 1.75 * FLOW) < 1e-6,
      JSON.stringify([slow.state.travel, mid50.state.travel, fast.state.travel]));
    const [, changed] = await landRun([{ level: 0.5, all: 0.5, secs: 1 }, { level: 0.5, all: 0.5, secs: 1, knobs: { speed: 100 } }]);
    check('mountains: a change of Speed applies at once', Math.abs(changed.state.travel - (FLOW + 1.75 * FLOW)) < 1e-6, String(changed.state.travel));
    const zs = mid50.state.zs, part = mid50.state.travel / SPC - mid50.state.top;
    check('mountains: the far and near edges stay where they are, and the rows between ride a row apart', zs.length === 54 && Math.abs(zs[0] + 2.2) < 1e-9 && Math.abs(zs[53] - 2.2) < 1e-9 && mid50.state.top === Math.floor(mid50.state.travel / SPC)
      && Math.abs(zs[1] - (-2.2 + part * SPC)) < 1e-9 && zs.slice(1, 52).every((v, j) => Math.abs(zs[j + 2] - v - SPC) < 1e-9) && zs[52] <= 2.2,
      JSON.stringify({ top: mid50.state.top, travel: mid50.state.travel, z: [zs[0], zs[1], zs[2], zs[52], zs[53]] }));
    // Read an eighth of a second into a syllable too: the loudness is then well short of full height and still
    // rising by the frame, so a far edge that lagged a frame, or stood at full height, would not match.
    const [onset] = await landRun([{ level: 0.8, all: 0.8, secs: 0.12 }], { gain: 1 });
    check('mountains: the far edge is the voice as it is now', Math.abs(loud.state.far[40] - loud.expectFar) < 1e-5 && Math.abs(lowOnly.state.far[40] - lowOnly.expectFar) < 1e-5 && loud.expectFar > 0.3
      && Math.abs(onset.state.far[40] - onset.expectFar) < 1e-5 && onset.state.amps[40] > 0.15 && onset.state.amps[40] < 0.6,
      JSON.stringify({ far: [loud.state.far[40], lowOnly.state.far[40], onset.state.far[40]], expect: [loud.expectFar, lowOnly.expectFar, onset.expectFar], amp: onset.state.amps[40] }));

    // The loudness a column follows: quick to rise, slow to fall. The middle column is followed by hand
    // here, from the voice the scene saw on each frame.
    const ramp = await landRun([{ level: 0.8, all: 0.8, secs: 0.5, trace: true }, { level: 0, all: 0, secs: 1.5, trace: true }], { gain: 1 });
    let byHand = 0;
    const wanted = ramp.map((r, i) => { for (const t of r.trace) { const target = Math.min(1, 0.7 * (i === 0 ? 0.8 : 0) + 0.45 * t[2]); byHand += (target - byHand) * (1 - Math.exp(-(target > byHand ? 4 : 0.75) / 60)); } return byHand; });
    check('mountains: the loudness a column follows rises in a quarter of a second and falls over more than one', Math.abs(ramp[0].state.amps[40] - wanted[0]) < 1e-4 && Math.abs(ramp[1].state.amps[40] - wanted[1]) < 1e-4
      && wanted[0] > 0.7 && wanted[1] > 0.2 && wanted[1] < 0.4, JSON.stringify({ amps: [ramp[0].state.amps[40], ramp[1].state.amps[40]], wanted }));

    // A phrase makes a range, and the range travels.
    const [, phrase] = await landRun([{ level: 0.8, all: 0.8, secs: 1.2 }, { level: 0, secs: 3.5 }]);
    const tall = phrase.state.depth.indexOf(top(phrase.state.depth)), behind = phrase.state.depth.filter((_, j) => phrase.state.zs[j] > -1.7 && phrase.state.zs[j] < -0.9);
    check('mountains: a phrase is a range that travels toward the viewer, with lower land behind it', phrase.state.zs[tall] > 0.3 && phrase.state.zs[tall] < 1.7 && top(phrase.state.depth) > 1.2 && mean(behind) < 0.55 * top(phrase.state.depth)
      && phrase.state.amps.every((a) => a < 0.1), JSON.stringify({ z: phrase.state.zs[tall], tall: top(phrase.state.depth), behind: mean(behind), amp: top(phrase.state.amps) }));

    // The cut edges.
    check('mountains: the land sinks to its cut edges, and the block has a flat base', loud.state.rim <= 0.14 * 2.15 * loud.state.lift + 1e-6 && loud.state.rim > 0.02 && Math.abs(loud.state.floor + 0.26) < 1e-6
      && [loud.state.profile[0], loud.state.profile[80], loud.state.depth[0], loud.state.depth[53]].every((h) => h <= 0.14 * 2.15 + 1e-6 && h > 0.01) && top(loud.state.depth) > 5 * loud.state.depth[53]
      && loud.state.seam === 0 && hush.state.seam === 0 && mid50.state.seam === 0,
      JSON.stringify({ rim: loud.state.rim, floor: loud.state.floor, edges: [loud.state.profile[0], loud.state.profile[80], loud.state.depth[0], loud.state.depth[53]] }));

    // The land's normals are worked out again as it changes: steep land leans its faces further from upright.
    check('mountains: the shading follows the shape of the land', loud.state.tilt > 2 * hush.state.tilt && hush.state.tilt > 0.0005 && loud.state.tilt < 0.9, JSON.stringify([hush.state.tilt, loud.state.tilt]));

    // The light and the lift answer at once; a beat.
    check('mountains: the sun\'s light and the lift of the range follow the voice as it is now', Math.abs(hush.state.sun - 1.5) < 1e-9 && Math.abs(loud.state.sun - (1.5 + 2.2 * loud.state.flame + 1.6 * loud.state.kick)) < 1e-9 && loud.state.sun > hush.state.sun + 1.5
      && Math.abs(loud.state.lift - (0.86 + 0.24 * loud.state.flame + 0.16 * loud.state.kick)) < 1e-9 && loud.state.lift > hush.state.lift + 0.15
      && Math.abs(loud.state.sunY - (0.8 + 1.3 * loud.state.slow)) < 1e-9 && loud.state.sunY > hush.state.sunY + 0.2 && loud.lightSum > 2 * hush.lightSum
      && Math.abs(loud.state.high - loud.state.peak * loud.state.lift) < 1e-4 && Math.abs(hush.state.high - hush.state.peak * 0.86) < 1e-4 && Math.abs(hush.state.glow - 0.4) < 1e-6 && Math.abs(loud.state.glow - (0.4 + 0.7 * loud.state.flame + 0.7 * loud.state.kick)) < 1e-6,
      JSON.stringify({ sun: [hush.state.sun, loud.state.sun], lift: [hush.state.lift, loud.state.lift], sunY: [hush.state.sunY, loud.state.sunY], light: [hush.lightSum, loud.lightSum] }));
    const beat = [{ level: 0.05, all: 0.5, secs: 1 }, { level: 0.9, all: 0.5, secs: 0.1 }, { level: 0.9, all: 0.5, secs: 2.5 }];
    const [calm, hit, after] = await landRun(beat);
    check('mountains: a beat lifts the range and flares the sun, then lets go', hit.state.kick > 0.5 && after.state.kick < 0.001 && calm.state.kick === 0
      && Math.abs(hit.state.lift - (0.86 + 0.24 * hit.state.flame + 0.16 * hit.state.kick)) < 1e-9 && hit.state.lift > calm.state.lift + 0.1
      && Math.abs(hit.state.sun - (1.5 + 2.2 * hit.state.flame + 1.6 * hit.state.kick)) < 1e-9 && Math.abs(hit.state.sunSize - (1.5 + 0.7 * hit.state.flame + hit.state.kick)) < 1e-9
      && Math.abs(hit.state.glow - (0.4 + 0.7 * hit.state.flame + 0.7 * hit.state.kick)) < 1e-9 && hit.state.sunSize > after.state.sunSize * 1.2 && hit.lightSum > after.lightSum * 1.05 && hit.edge === 0,
      JSON.stringify({ kick: [calm.state.kick, hit.state.kick, after.state.kick], lift: [calm.state.lift, hit.state.lift, after.state.lift], size: [hit.state.sunSize, after.state.sunSize], light: [hit.lightSum, after.lightSum], edge: hit.edge }));

    // Camera.
    const [still] = await landRun(flowing, { knobs: { cameraDrift: 0 } }), [drift] = await landRun(flowing, { knobs: { cameraDrift: 100 } });
    check('mountains: Camera drift 0 holds the camera still; 100 doubles the sway', still.state.orbit === 0 && Math.abs(mid50.state.orbit) > 0.005 && Math.abs(drift.state.orbit - 2 * mid50.state.orbit) < 1e-9
      && Math.abs(still.kitCam[0]) < 1e-6 && Math.abs(drift.kitCam[0]) > 1.5 * Math.abs(mid50.kitCam[0]) && Math.abs(mid50.kitCam[0]) > 0.05,
      JSON.stringify({ orbit: [still.state.orbit, mid50.state.orbit, drift.state.orbit], x: [still.kitCam[0], mid50.kitCam[0], drift.kitCam[0]] }));

    // With the camera held still, the block is LAND_TALL pixels from its base to its tallest point; without its cut sides it would be about 35 fewer.
    // And its near side is a wall from edge to edge: the lowest rows of the block are solid nearly all the way across.
    check('mountains: the block has cut sides down to its base', still.solidBox.h > LAND_TALL && still.solidBox.h < LAND_TALL + 30 && still.foot > 0.8, JSON.stringify({ box: still.solidBox, foot: still.foot }));

    // The same at any frame rate.
    // 2.6 s in all: the land has then come 27.04 rows, so both runs have written the same number of rows.
    const fpsSteps = [{ level: 0.8, all: 0.8, secs: 1.5 }, { level: 0, all: 0, secs: 1.1 }];
    const [, l30] = await landRun(fpsSteps, { fps: 30 }), [, l60] = await landRun(fpsSteps, { fps: 60 });
    const gap = (a, b) => top(a.map((v, i) => Math.abs(v - b[i])));
    check('mountains: the same sound gives the same land at 30 and 60 fps', Math.abs(l30.state.travel - l60.state.travel) < 1e-6 && l30.state.top === l60.state.top && Math.abs(l30.state.clock - 2.6) < 1e-6 && Math.abs(l60.state.clock - 2.6) < 1e-6
      && gap(l30.state.depth, l60.state.depth) < 0.05 && gap(l30.state.amps, l60.state.amps) < 0.02 && top(l60.state.depth) > 1,
      JSON.stringify({ travel: [l30.state.travel, l60.state.travel], depth: gap(l30.state.depth, l60.state.depth), amps: gap(l30.state.amps, l60.state.amps), tall: top(l60.state.depth) }));

    // Mic off.
    const [idle1, idle2] = await landRun([{ level: null, idle: true, secs: 3 }, { level: null, idle: true, secs: 2 }]);
    check('mountains: with the mic off and Idle animation on, the land flows and swells', idle1.state.live === true && Math.abs(idle2.state.travel - 5 * FLOW) < 1e-6 && idle2.state.peak > 0.5 && gap(idle1.state.amps, idle2.state.amps) > 0.05
      && mean(idle2.state.amps) > 0.15 && mean(idle2.state.amps) < 0.6 && top(idle2.state.amps) - Math.min(...idle2.state.amps) > 0.2,
      JSON.stringify({ travel: [idle1.state.travel, idle2.state.travel], peak: idle2.state.peak, amps: [Math.min(...idle2.state.amps), mean(idle2.state.amps), top(idle2.state.amps)], moved: gap(idle1.state.amps, idle2.state.amps) }));
    // Camera drift 0 and a palette that stands still, so that nothing but the scene could move the picture.
    const [off1, off2] = await landRun([{ level: null, off: true, secs: 3 }, { level: null, off: true, secs: 1, trace: true }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    const [on1, on2] = await landRun([{ level: null, idle: true, secs: 3 }, { level: null, idle: true, secs: 1 }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    check('mountains: with the mic and Idle animation off the picture holds still, pixel for pixel', off1.hash === off2.hash && on1.hash !== on2.hash && off2.solid > 0.4 * loud.solid,
      JSON.stringify({ off: [off1.hash, off2.hash], idle: [on1.hash, on2.hash], solid: off2.solid }));
    check('mountains: with the mic and Idle animation off, the land does not flow', off1.state.live === false && off2.state.travel === 0 && off2.state.clock === 0 && off2.state.amps.every((a) => a < 0.001)
      && off2.trace.every((t) => t[0] === 0 && t[8] === off2.trace[0][8] && t[4] === off2.trace[0][4]) && off2.state.peak <= 2.15 * 0.15 + 1e-6,
      JSON.stringify({ travel: off2.state.travel, clock: off2.state.clock, peak: off2.state.peak }));

    const [live1, muted1, muted2] = await landRun([{ level: 0.8, all: 0.8, secs: 2 }, { level: null, off: true, secs: 1 }, { level: null, off: true, secs: 4, trace: true }], { gain: 1 });
    check('mountains: muted in the middle of a stream, the land stops where it is and the far edge settles', Math.abs(live1.state.travel - 2 * FLOW) < 1e-6 && muted1.state.travel === live1.state.travel && muted2.state.travel === live1.state.travel
      && muted1.state.live === false && muted2.state.clock === live1.state.clock && muted2.trace.every((t) => t[0] === live1.state.travel)
      && muted1.state.amps[40] < live1.state.amps[40] - 0.2 && muted1.state.amps[40] > 0.2 && muted2.state.amps[40] < 0.05 && gap(muted1.state.depth.slice(3, 50), muted2.state.depth.slice(3, 50)) === 0 && top(muted2.state.depth) > 1,
      JSON.stringify({ travel: [live1.state.travel, muted1.state.travel, muted2.state.travel], amp: [live1.state.amps[40], muted1.state.amps[40], muted2.state.amps[40]], moved: gap(muted1.state.depth.slice(3, 50), muted2.state.depth.slice(3, 50)) }));

    // Colour.
    const [hued] = await landRun(flowing, { hue: 2 });
    const close = (a, b) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 2);
    check('mountains: the land takes its colour from the palette, and the hue setting moves it', close(mid50.state.rock, mid50.expectRock) && close(hued.state.rock, hued.expectRock) && !close(hued.state.rock, mid50.state.rock),
      JSON.stringify({ rock: mid50.state.rock, expect: mid50.expectRock, hued: hued.state.rock, hueExpect: hued.expectRock }));

    // The three Rotate settings, with the camera held still.
    const landTurned = (knobs) => landRun([{ level: 0.8, all: 0.8, secs: 1 }], { knobs: Object.assign({ cameraDrift: 0 }, knobs) });
    const [landFlat] = await landTurned({}), [landFace] = await landTurned({ rotateX: 72 }), [landDiamond] = await landTurned({ rotateX: 72, rotateY: 45 }), [landRolled] = await landTurned({ rotateY: 200, rotateZ: 30 });
    const landOff = (r) => Math.max(...r.state.corner.map((v, i) => Math.abs(v - r.expectCorner[i])));
    const landIn = (r) => r.solidBox.cx - r.solidBox.w / 2 > 4 && r.solidBox.cx + r.solidBox.w / 2 < r.canvas[0] - 4 && r.solidBox.cy - r.solidBox.h / 2 > 4 && r.solidBox.cy + r.solidBox.h / 2 < r.canvas[1] - 4;
    const off3 = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    const lit = (r) => Math.max(off3(r.state.lights.key, r.expectLights.key), off3(r.state.lights.fill, r.expectLights.fill), off3(r.state.lights.sky, r.expectLights.sky), off3(r.state.sunAt, r.expectLights.sunAt));
    const L = landFlat.state.lights;
    check('mountains-3d: with no rotation it is where it always was, and so are its lights', landFlat.state.turned.join() === '0,0,0' && landFlat.state.scale === 1 && landFlat.state.at.join() === '0,0,0' && landOff(landFlat) < 1e-6
      && Math.abs(landFlat.state.corner[0] - 3.5) < 1e-6 && Math.abs(landFlat.state.corner[2] - 2.2) < 1e-6 && landIn(landFlat)
      && off3(L.keyAt, [-5.2, 4.4, -2.6]) < 1e-6 && off3(L.keyAim, [0.3, 0.3, 0.2]) < 1e-6 && off3(L.fillAt, [2.5, 3, 6]) < 1e-6 && off3(L.fillAim, [0, 0, 0]) < 1e-6 && off3(L.sky, [0, 1, 0]) < 1e-9 && lit(landFlat) < 1e-6
      && landFlat.state.shadow.join() === '5,4,1,16,0.05' && landFlat.state.sway === 0,
      JSON.stringify({ corner: landFlat.state.corner, box: landFlat.solidBox, lights: L, shadow: landFlat.state.shadow }));
    check('mountains-3d: Rotate X, Y and Z turn it, and however it is turned it stays in the frame', [landFace, landDiamond, landRolled].every((r) => landOff(r) < 1e-5 && landIn(r) && r.solidBox.w > 100 && r.solidBox.h > 100 && r.state.scale <= 1 && r.state.scale > 0.4)
      && landFace.state.turned.join() === '72,0,0' && landDiamond.state.scale < landFace.state.scale && Math.abs(landFace.state.corner[1] - landFlat.state.corner[1]) > 0.5 && landRolled.state.turned.join() === '0,200,30'
      && landFace.hash !== landFlat.hash,
      JSON.stringify({ off: [landOff(landFace), landOff(landDiamond), landOff(landRolled)], scale: [landFace.state.scale, landDiamond.state.scale, landRolled.state.scale], box: [landFlat.solidBox, landFace.solidBox, landDiamond.solidBox, landRolled.solidBox] }));
    const [landUnder] = await landTurned({ rotateX: 180 }), [landOver] = await landTurned({ rotateZ: 180 });
    check('mountains-3d: its lights, its shadows and its sun turn with it, so it is lit the same whichever way it is turned', [landFace, landDiamond, landRolled, landUnder].every((r) => lit(r) < 1e-5)
      && off3(landFace.state.lights.sky, [0, Math.cos(72 * Math.PI / 180), Math.sin(72 * Math.PI / 180)]) < 1e-6 && off3(landUnder.state.lights.sky, [0, -1, 0]) < 1e-6
      && [landDiamond, landUnder].every((r) => off3(r.state.shadow, [5, 4, 1, 16, 0.05].map((v) => v * r.state.scale)) < 1e-9 && Math.abs(r.state.shadowSpan - 5 * r.state.scale) < 1e-6) && landDiamond.state.scale < 0.9
      && Math.abs(landFlat.state.shadowSpan - 5) < 1e-6,
      JSON.stringify({ lit: [lit(landFace), lit(landDiamond), lit(landRolled), lit(landUnder)], sky: [landFace.state.lights.sky, landUnder.state.lights.sky], shadow: landDiamond.state.shadow, scale: landDiamond.state.scale }));
    check('mountains-3d: turned right over it is still a solid block, seen from below', [landUnder, landOver].every((r) => landOff(r) < 1e-5 && landIn(r) && r.solid > 0.3 * landFlat.solid && r.solidBox.h > 0.3 * landFlat.solidBox.h) && off3(landUnder.state.under, [3.5, 2.2, -0.26, -0.26, -1]) < 1e-6,
      JSON.stringify({ solid: [landFlat.solid, landUnder.solid, landOver.solid], box: [landFlat.solidBox, landUnder.solidBox, landOver.solidBox] }));
    const [landSway] = await landRun([{ level: 0.8, all: 0.8, secs: 1 }], { knobs: { cameraDrift: 100, rotateX: 330, rotateY: 315, rotateZ: 180 } }), [landCalm] = await landTurned({ rotateX: 330, rotateY: 315, rotateZ: 180 }), [landSway0] = await landRun([{ level: 0.8, all: 0.8, secs: 1 }], { knobs: { cameraDrift: 50 } });
    check('mountains-3d: the more the camera drifts, the more room a turned block is given for it', Math.abs(landSway.state.sway - 0.56) < 1e-12 && Math.abs(landSway0.state.sway - 0.28) < 1e-12 && landOff(landSway) < 1e-5 && landOff(landCalm) < 1e-5 && landSway.state.scale < landCalm.state.scale - 0.02
      && landSway0.state.scale === 1 && landSway0.state.at.join() === '0,0,0', JSON.stringify({ sway: [landSway0.state.sway, landSway.state.sway], scale: [landCalm.state.scale, landSway.state.scale], off: landOff(landSway) }));
    const landReset = await landRun([{ level: 0.8, all: 0.8, secs: 1 }, { level: 0.8, all: 0.8, secs: 0.02, knobs: { rotateX: 72, rotateY: 90, rotateZ: 10 } }, { level: 0.8, all: 0.8, secs: 0.02, knobs: { rotateX: 0, rotateY: 0, rotateZ: 0 } }], { knobs: { cameraDrift: 0 } });
    check('mountains-3d: a change of rotation applies at once, both ways', landReset.map((r) => r.state.turned.join()).join(' ') === '0,0,0 72,90,10 0,0,0' && landReset[1].state.scale < 1 && landReset[2].state.scale === 1 && landOff(landReset[1]) < 1e-5 && landOff(landReset[2]) < 1e-6
      // (three.js sets a shadow camera up once, when its map is made: a change after that has to be pushed through.)
      && Math.abs(landReset[1].state.shadowSpan - 5 * landReset[1].state.scale) < 1e-6 && Math.abs(landReset[2].state.shadowSpan - 5) < 1e-6,
      JSON.stringify(landReset.map((r) => [r.state.turned, r.state.scale])));

    // Placement and cost.
    await activate(LAND);
    const landP0 = await probe();
    await pushConfig((c) => { c.activeViz = 'mountains-3d'; c.placement.x = 30; });
    await wide.waitForTimeout(400);
    const landP1 = await probe();
    check('mountains: Scene placement slides it', landP1.centroidX - landP0.centroidX > 150, `${landP0.centroidX.toFixed(0)} → ${landP1.centroidX.toFixed(0)}`);
    await pushConfig((c) => { c.placement.x = 0; });
    await wide.waitForTimeout(300);
    await activate(LAND);
    const landCost = await wide.evaluate(() => { let now = performance.now(), acc = 0; for (let i = 0; i < 120; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); acc += performance.now() - t; } return acc / 120; });
    check(`mountains-3d: draw() averages under 5 ms of script time (${landCost.toFixed(2)} ms)`, landCost < 5);

    }

    // ── The phosphor (a kit scene: glowing traces on a deck of dark slices) ────
    {   // its own block: the names below are the phosphor's own
    // Build the scene afresh, drive the level and the 32 bins by hand, and read the canvas and
    // the scene after each step. A step gives level (null: whatever the kit hears), secs, and
    // either all (every bin, 0..1) or bins ([[bin, 0..1], ...]); idle: true has the mic off,
    // off: true has the mic and Idle animation off.
    const DECK = 'phosphor';
    // hue and colorSpeed set the palette's place and speed for the run, gain the Gain setting. A trace row is
    // [clock, flame, kick, the front trace's stand, its peak, its brightness, its half width, orbit, the last slice's first phase].
    const deckRun = (steps, { fps = 60, knobs = null, hue = null, colorSpeed = null, gain = null } = {}) => wide.evaluate(({ id, steps, fps, knobs, hue, colorSpeed, gain }) => {
      window.frame = function () {};
      const saved = { frequencies, micActive, cfgIdleAnim, cfgColorHue, cfgColorSpeed, cfgGain }, knobs0 = Object.assign({}, perViz[id]);
      try {
        if (knobs) Object.assign(perViz[id], knobs);
        if (hue !== null) cfgColorHue = hue;
        if (colorSpeed !== null) cfgColorSpeed = colorSpeed;
        if (gain !== null) cfgGain = gain;
        TimbreScene.testLevel = 0;
        setActiveViz('visualizer'); setActiveViz(id);
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), f = new Uint8Array(32), out = [];
        let now = 100000 + 1000 / 120;
        for (const st of steps) {
          TimbreScene.testLevel = st.level;
          micActive = !st.idle && !st.off;
          cfgIdleAnim = st.off ? false : saved.cfgIdleAnim;
          if (st.knobs) Object.assign(perViz[id], st.knobs);
          f.fill(st.all !== undefined ? Math.round(st.all * 255) : 0);
          if (st.bins) for (const [i, v] of st.bins) f[i] = Math.round(v * 255);
          frequencies = f;
          const trace = st.trace ? [] : null;
          for (let i = 0, n = Math.round(st.secs * fps); i < n; i++) {
            now += 1000 / fps; currentViz.draw(now, 1 / fps);
            if (trace) { const q = window.__timbre.scene.state; trace.push([q.clock, q.flame, q.kick, q.stands[0], q.peaks[0], q.brights[0], q.widths[0], q.orbit, q.lag[0]]); }
          }
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);   // row 0 is the bottom of the canvas
          let solid = 0, light = 0, lightSum = 0, edge = 0, empty = 0, hash = 2166136261;
          for (let i = 0; i < px.length; i++) hash = Math.imul(hash ^ px[i], 16777619) >>> 0;   // the whole picture, as one number
          const box = [w, -1, h, -1], solidBox = [w, -1, h, -1];
          const grow = (b, x, y) => { if (x < b[0]) b[0] = x; if (x > b[1]) b[1] = x; if (y < b[2]) b[2] = y; if (y > b[3]) b[3] = y; };
          for (let i = 0; i < px.length; i += 4) {
            const x = (i / 4) % w, y = Math.floor(i / 4 / w), rgb = px[i] + px[i + 1] + px[i + 2], a = px[i + 3];
            if (a > 250) { solid++; grow(solidBox, x, y); }
            else if (a < 5 && rgb > 12) {
              light++; lightSum += rgb; grow(box, x, y);
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
            }
            if (a === 0 && rgb === 0) empty++;
          }
          const size = (b) => ({ w: b[1] < 0 ? 0 : b[1] - b[0] + 1, h: b[3] < 0 ? 0 : b[3] - b[2] + 1, cx: (b[0] + b[1]) / 2, cy: (b[2] + b[3]) / 2 });
          // foot: over the middle half of the deck, how far above the deck's bottom edge a column's
          // lowest solid pixel is at most, in pixels. With the camera square on, the front slice's
          // foot is that bottom edge, so this is 0 or so unless the slice is open underneath.
          let foot = -1;
          if (solidBox[1] >= 0) {
            const span = solidBox[1] - solidBox[0];
            for (let x = Math.round(solidBox[0] + span * 0.25); x <= Math.round(solidBox[0] + span * 0.75); x++) {
              let y = solidBox[2];
              while (y <= solidBox[3] && px[(y * w + x) * 4 + 3] <= 250) y++;
              foot = Math.max(foot, y - solidBox[2]);
            }
          }
          const s = window.__timbre.scene, state = (s && s.state) || {};
          // lit: how much light lies on the slices themselves (a trace over its own slice and the one behind it).
          let lit = 0;
          for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 250 && px[i] + px[i + 1] + px[i + 2] > 150) lit += px[i] + px[i + 1] + px[i + 2];
          out.push({ state, solid, light, lightSum, lit, edge, foot, empty: empty / (w * h), cornerAlpha: px[3],
            box: size(box), solidBox: size(solidBox), canvas: [w, h], trace, hash, kitCam: s ? s.camera : null,
            // Where the near right corner should be, from the Rotate settings as the scene read them.
            expectCorner: state.turned ? (() => { const K = TimbreScene, M = TimbrePhosphor, r = state.turned, D = Math.PI / 180, p = K.poseFor(M.BOX, { frame: M.FRAME, fov: M.FOV, pitch: M.PITCH }, r[0], r[1], r[2], state.sway), o = new THREE.Vector3(M.W / 2, 0, M.D / 2).applyEuler(new THREE.Euler(r[0] * D, r[1] * D, r[2] * D, 'XZY')); return [o.x * p.scale + p.x, o.y * p.scale + p.y, o.z * p.scale + p.z]; })() : null,
            expectTone: state.slices ? getColor(state.colorT + TimbrePhosphor.backOf(state.ref, state.slices) * 0.8) : null });
        }
        return out;
      } finally {
        frequencies = saved.frequencies; micActive = saved.micActive; cfgIdleAnim = saved.cfgIdleAnim; cfgColorHue = saved.cfgColorHue; cfgColorSpeed = saved.cfgColorSpeed; cfgGain = saved.cfgGain;
        Object.assign(perViz[id], knobs0); TimbreScene.testLevel = null;
      }
    }, { id: DECK, steps, fps, knobs, hue, colorSpeed, gain });
    const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    const top = (a) => Math.max(...a);
    const gap = (a, b) => top(a.map((v, i) => Math.abs(v - b[i])));
    const tallest = (a) => a.indexOf(top(a));
    const ageOfSlice = (i, n) => (i / (n - 1)) * 2.2;
    // The free part of a trace, between the two pinned ends.
    const free = (trace) => trace.slice(16, 80);
    const humps = (trace) => { const t = free(trace); let n = 0; for (let j = 1; j < t.length - 1; j++) if (t[j] > t[j - 1] && t[j] >= t[j + 1]) n++; return n; };
    const swing = (trace) => top(free(trace)) - Math.min(...free(trace));
    const talk = [{ level: 0.8, all: 0.8, secs: 3 }];
    // Thresholds are 60% of what the scene gives after 3 s at a steady 0.8: about 319,000 solid pixels
    // (the slices) and 9,200 pixels of light over the background (the traces' glow above the deck and at its sides).
    const DECK_SOLID = 190000, DECK_LIGHT = 5500;

    await activate(DECK);
    const deckState = await sceneState();
    const [loud] = await deckRun(talk);
    const [hush] = await deckRun([{ level: 0, secs: 2 }]);
    check('phosphor is a kit scene: solid dark slices, traces of added light along their tops, a transparent corner',
      !!deckState && deckState.active === true && deckState.targetSize[0] === 1728 && loud.solid > DECK_SOLID && loud.light > DECK_LIGHT && loud.cornerAlpha === 0 && loud.edge === 0 && loud.empty > 0.3,
      JSON.stringify({ size: deckState && deckState.targetSize, solid: loud.solid, light: loud.light, corner: loud.cornerAlpha, edge: loud.edge, empty: loud.empty, box: [loud.solidBox, hush.solidBox], hush: [hush.solid, hush.light] }));
    check('phosphor: the deck sits in the middle of the frame, wider than it is tall', Math.abs(loud.solidBox.cx - loud.canvas[0] / 2) < 0.06 * loud.canvas[0] && loud.solidBox.w > 1.5 * loud.solidBox.h && loud.solidBox.w > 0.3 * loud.canvas[0],
      JSON.stringify({ box: loud.solidBox, canvas: loud.canvas }));
    const A8 = Math.pow(0.8, 0.9);
    check('phosphor: louder, the traces stand taller', loud.state.stands.length === 24 && loud.state.stands.every((a) => Math.abs(a - A8) < 0.01) && top(loud.state.peaks) < 0.14 + 1.5 * A8 + 1e-6 && Math.min(...loud.state.peaks) > 0.14 + 1.5 * A8 * 0.55
      && hush.state.peaks.every((p) => Math.abs(p - 0.14) < 1e-6) && loud.solidBox.h > 1.15 * hush.solidBox.h && gap(loud.state.tops, loud.state.peaks) < 1e-5,
      JSON.stringify({ stand: [Math.min(...loud.state.stands), top(loud.state.stands)], peaks: [Math.min(...loud.state.peaks), top(loud.state.peaks)], solid: [hush.solid, loud.solid] }));
    check('phosphor: in silence the deck is a row of low feet with dim, flat traces', hush.solid > 500 && hush.light > 150 && hush.state.stands.every((a) => a === 0) && hush.state.front.every((y) => Math.abs(y - 0.14) < 1e-6)
      && Math.abs(hush.state.brights[0] - 0.3) < 1e-6 && Math.abs(hush.state.widths[0] - 0.045) < 1e-6, JSON.stringify({ solid: hush.solid, light: hush.light, bright: hush.state.brights[0] }));
    check('phosphor: the slices stand from the front of the deck to the back, the front one nearest', Math.abs(loud.state.zs[0] - 1.8) < 1e-6 && Math.abs(loud.state.zs[23] + 1.8) < 1e-6 && loud.state.zs.every((z, i) => i === 0 || Math.abs(loud.state.zs[i - 1] - z - 3.6 / 23) < 1e-5),
      JSON.stringify([loud.state.zs[0], loud.state.zs[1], loud.state.zs[23]]));

    // The echoes: a syllable, then silence. The tallest slice is the one as old as the silence is long.
    const syllable = [{ level: 0.9, all: 0.9, secs: 0.25 }];
    const [, soon] = await deckRun([...syllable, { level: 0, secs: 0.6 }]), [, late] = await deckRun([...syllable, { level: 0, secs: 1.3 }]);
    check('phosphor: a syllable travels back through the deck, one slice after another', Math.abs(ageOfSlice(tallest(soon.state.stands), 24) - 0.6) < 0.1 && Math.abs(ageOfSlice(tallest(late.state.stands), 24) - 1.3) < 0.1
      && top(soon.state.stands) > 0.7 && soon.state.stands[0] < 0.4 && late.state.stands[0] < 0.05 && soon.state.stands[23] < 0.01 && Math.abs(tallest(soon.state.peaks) - tallest(soon.state.stands)) <= 1,
      JSON.stringify({ soon: [tallest(soon.state.stands), top(soon.state.stands), soon.state.stands[0]], late: [tallest(late.state.stands), top(late.state.stands), late.state.stands[0]] }));
    const paceOf = (b) => (0.9 + 0.55 * b) * (b % 2 ? -1 : 1);
    check('phosphor: an echo\'s waves are where the front\'s were when it was the front', loud.state.lag.length === 10 && loud.state.lag.every((p, b) => Math.abs(p - paceOf(b) * (loud.state.clock - 2.2)) < 1e-9) && Math.abs(loud.state.clock - 3) < 1e-6,
      JSON.stringify({ clock: loud.state.clock, lag: loud.state.lag.slice(0, 3) }));

    // Bands: the low end makes broad waves, the higher bands fine ripples.
    const [lowOnly] = await deckRun([{ level: 0.6, bins: [[0, 1]], secs: 1.5 }]), [highOnly] = await deckRun([{ level: 0.6, bins: [[9, 1]], secs: 1.5 }]);
    check('phosphor: the low end makes broad waves and the higher bands fine ripples', humps(lowOnly.state.front) <= 2 && humps(highOnly.state.front) >= 5 && humps(highOnly.state.front) <= 8 && swing(lowOnly.state.front) > 0.2 && swing(highOnly.state.front) > 0.2,
      JSON.stringify({ humps: [humps(lowOnly.state.front), humps(highOnly.state.front)], swing: [swing(lowOnly.state.front), swing(highOnly.state.front)] }));
    const [, turned] = await deckRun([{ level: 0.6, bins: [[0, 1]], secs: 1.5 }, { level: 0.6, bins: [[9, 1]], secs: 0.7 }]);
    check('phosphor: an echo keeps the bands of its own moment', turned.state.ref === 12 && humps(turned.state.front) >= 5 && humps(turned.state.mid) <= 2 && swing(turned.state.mid) > 0.2,
      JSON.stringify({ humps: [humps(turned.state.front), humps(turned.state.mid)], swing: [swing(turned.state.front), swing(turned.state.mid)] }));
    const [risen, fallen] = await deckRun([{ level: 0.6, bins: [[3, 1]], secs: 0.05 }, { level: 0.6, secs: 0.1 }], { gain: 1 });
    check('phosphor: a band is followed, quick to rise and slower to fall, so the front trace does not step with each reading', Math.abs(risen.state.now[3] - (1 - Math.exp(-1))) < 1e-5 && Math.abs(fallen.state.now[3] - (1 - Math.exp(-1)) * Math.exp(-0.8)) < 1e-5 && risen.state.now[4] === 0,
      JSON.stringify([risen.state.now[3], fallen.state.now[3]]));
    const [noBins] = await deckRun([{ level: 0.6, secs: 1.5 }]);
    check('phosphor: with no band sounding a trace is a smooth arch as tall as the voice is loud', swing(noBins.state.front) < 1e-6 && Math.abs(top(noBins.state.front) - (0.14 + 1.5 * Math.pow(0.6, 0.9) * 0.55)) < 0.01, JSON.stringify([swing(noBins.state.front), top(noBins.state.front)]));
    // Both ends of a trace are held down at the foot, whatever sounds; it rises from there.
    const ease = (u) => { const t = Math.min(1, Math.max(0, u / 0.16)); return t * t * (3 - 2 * t); };
    const archAt = (j) => 0.14 + 1.5 * Math.pow(0.6, 0.9) * 0.55 * ease(j / 95) * ease(1 - j / 95);
    check('phosphor: both ends of a trace are held at the foot, and it rises from there', [noBins, loud, highOnly].every((r) => Math.abs(r.state.front[0] - 0.14) < 1e-6 && Math.abs(r.state.front[95] - 0.14) < 1e-6)
      && top(loud.state.front) > 0.8 && [4, 8, 12, 87, 91].every((j) => Math.abs(noBins.state.front[j] - archAt(j)) < 0.01) && noBins.state.front[4] < noBins.state.front[8] && noBins.state.front[8] < noBins.state.front[12],
      JSON.stringify({ ends: [loud.state.front[0], loud.state.front[95], highOnly.state.front[0]], rise: [4, 8, 12].map((j) => [noBins.state.front[j], archAt(j)]) }));
    const quiet = [{ level: 0.6, bins: [[3, 0.3]], secs: 1.5 }], w3 = 1 / 1.45, A6 = Math.pow(0.6, 0.9);
    const [plain] = await deckRun(quiet, { gain: 1 }), [boosted] = await deckRun(quiet, { gain: 2 });
    const swingFor = (a) => 1.5 * A6 * 0.9 * ((a * w3) / (0.15 + a * w3));
    check('phosphor: Gain scales how loud a band is, and so how full its wave swings', Math.abs(swing(plain.state.front) - swingFor(0.3)) < 0.02 && Math.abs(swing(boosted.state.front) - swingFor(0.6)) < 0.02 && swing(boosted.state.front) > swing(plain.state.front) + 0.08,
      JSON.stringify({ swing: [swing(plain.state.front), swing(boosted.state.front)], want: [swingFor(0.3), swingFor(0.6)] }));

    // A beat.
    const beat = [{ level: 0.05, all: 0.5, secs: 1 }, { level: 0.9, all: 0.5, secs: 0.1 }, { level: 0.9, all: 0.5, secs: 2.5 }];
    const [calm, hit, after] = await deckRun(beat);
    const hitA = Math.pow(hit.state.flame, 0.9) * (1 + 0.25 * hit.state.kick);
    check('phosphor: a beat lifts, brightens and widens the nearest traces, then lets go', hit.state.kick > 0.5 && after.state.kick < 0.001 && calm.state.kick === 0
      && Math.abs(hit.state.stands[0] - hitA) < 1e-5 && Math.abs(hit.state.brights[0] - (0.3 + 1.4 * hitA + 0.9 * hit.state.kick)) < 1e-5 && Math.abs(hit.state.widths[0] - (0.045 + 0.035 * hitA + 0.03 * hit.state.kick)) < 1e-6
      && Math.abs(hit.state.span - 2 * hit.state.widths[0]) < 1e-5 && hit.state.brights[0] > after.state.brights[0] * 1.2 && hit.state.widths[0] > after.state.widths[0] * 1.1
      && [0, 6, 12].every((i) => { const back = i / 23, A = hit.state.stands[i]; return Math.abs(A - Math.pow(hit.state.heard[i], 0.9) * (1 + 0.25 * hit.state.kick * Math.exp(-5.75 * back))) < 1e-5
        && Math.abs(hit.state.brights[i] - (0.3 + 1.4 * A + 0.9 * hit.state.kick * Math.exp(-(23 / 3) * back)) * (0.12 + 0.88 * Math.pow(1 - back, 1.3))) < 1e-5
        && Math.abs(hit.state.widths[i] - (0.045 + 0.035 * A + 0.03 * hit.state.kick * Math.exp(-(23 / 3) * back)) * (1 - 0.35 * back)) < 1e-6; })
      && hit.edge === 0,
      JSON.stringify({ kick: [calm.state.kick, hit.state.kick, after.state.kick], stand: [hit.state.stands[0], hitA], bright: [hit.state.brights[0], after.state.brights[0]], width: [hit.state.widths[0], after.state.widths[0]], span: hit.state.span }));

    // Depth.
    const [few] = await deckRun(talk, { knobs: { depth: 0 } }), [many] = await deckRun(talk, { knobs: { depth: 100 } });
    check('phosphor: Depth 0 is 12 slices, the default 24, 100 is 36, in the same deck', few.state.slices === 12 && loud.state.slices === 24 && many.state.slices === 36 && few.state.drawn[0] === 12 * 95 * 6 && few.state.drawn[1] === 12 * 95 * 12 && many.state.drawn[0] === 36 * 95 * 6
      && few.state.zs.length === 12 && Math.abs(few.state.zs[11] + 1.8) < 1e-6 && Math.abs(many.state.zs[35] + 1.8) < 1e-6 && Math.abs(few.state.zs[0] - 1.8) < 1e-6 && few.state.stands.length === 12 && many.state.stands.length === 36,
      JSON.stringify({ slices: [few.state.slices, loud.state.slices, many.state.slices], drawn: [few.state.drawn, many.state.drawn], solid: [few.solid, many.solid], light: [few.light, many.light] }));
    const moved = await deckRun([{ level: 0.8, all: 0.8, secs: 1 }, { level: 0.8, all: 0.8, secs: 0.1, knobs: { depth: 100 } }, { level: 0.8, all: 0.8, secs: 0.1, knobs: { depth: 0 } }]);
    check('phosphor: a change of Depth applies at once, both ways, and the front trace stays as it was', moved.map((r) => r.state.slices).join() === '24,36,12' && moved.map((r) => r.state.stands.length).join() === '24,36,12'
      && Math.abs(moved[1].state.stands[0] - moved[0].state.stands[0]) < 0.02 && Math.abs(moved[2].state.stands[0] - moved[0].state.stands[0]) < 0.02 && moved[2].state.zs.length === 12 && moved[1].state.zs.length === 36,
      JSON.stringify(moved.map((r) => [r.state.slices, r.state.stands[0], r.light])));

    // Camera.
    const [still] = await deckRun(talk, { knobs: { cameraDrift: 0 } }), [drift] = await deckRun(talk, { knobs: { cameraDrift: 100 } });
    check('phosphor: Camera drift 0 holds the camera still; 100 doubles the sway', still.state.orbit === 0 && Math.abs(loud.state.orbit) > 0.005 && Math.abs(drift.state.orbit - 2 * loud.state.orbit) < 1e-9
      && Math.abs(still.kitCam[0]) < 1e-6 && Math.abs(drift.kitCam[0]) > 1.5 * Math.abs(loud.kitCam[0]) && Math.abs(loud.kitCam[0]) > 0.05,
      JSON.stringify({ orbit: [still.state.orbit, loud.state.orbit, drift.state.orbit], x: [still.kitCam[0], loud.kitCam[0], drift.kitCam[0]] }));
    check('phosphor: a slice is solid from its trace down to its foot', still.foot >= 0 && still.foot <= 2 && still.solidBox.h > 100, JSON.stringify({ foot: [still.foot, hush.foot], box: still.solidBox }));
    check('phosphor: each trace lies in the plane of its slice, a hair in front of it', loud.state.span > 0 && loud.state.lift.every((d) => Math.abs(d - 0.006) < 1e-6) && Math.abs(loud.state.span - 2 * loud.state.widths[0]) < 1e-5, JSON.stringify({ lift: loud.state.lift.slice(0, 3), span: loud.state.span }));

    // The same at any frame rate.
    const fpsSteps = [{ level: 0.8, all: 0.8, secs: 1 }, { level: 0, all: 0, secs: 0.5 }];
    const [, d30] = await deckRun(fpsSteps, { fps: 30 }), [, d60] = await deckRun(fpsSteps, { fps: 60 });
    // A band a tenth of a second into its rise: the same at both rates, and where the rate of 20 a second puts it.
    const onset = [{ level: 0.6, bins: [[3, 1]], secs: 0.1 }];
    const [b30] = await deckRun(onset, { fps: 30, gain: 1 }), [b60] = await deckRun(onset, { fps: 60, gain: 1 });
    check('phosphor: the same sound gives the same deck at 30 and 60 fps', Math.abs(d30.state.clock - 1.5) < 1e-6 && Math.abs(d60.state.clock - 1.5) < 1e-6 && gap(d30.state.lag, d60.state.lag) < 1e-6
      && gap(d30.state.stands, d60.state.stands) < 0.06 && gap(d30.state.peaks, d60.state.peaks) < 0.1 && top(d60.state.stands) > 0.7 && tallest(d30.state.stands) === tallest(d60.state.stands)
      && Math.abs(b30.state.now[3] - (1 - Math.exp(-2))) < 1e-5 && Math.abs(b60.state.now[3] - (1 - Math.exp(-2))) < 1e-5,
      JSON.stringify({ clock: [d30.state.clock, d60.state.clock], stands: gap(d30.state.stands, d60.state.stands), peaks: gap(d30.state.peaks, d60.state.peaks), tallest: [tallest(d30.state.stands), tallest(d60.state.stands)], band: [b30.state.now[3], b60.state.now[3]] }));

    // Mic off.
    const [idle1, idle2] = await deckRun([{ level: null, idle: true, secs: 3 }, { level: null, idle: true, secs: 1.5 }]);
    check('phosphor: with the mic off and Idle animation on, the traces swell and their waves run', idle1.state.live === true && Math.abs(idle2.state.clock - 4.5) < 1e-6 && idle2.state.stands[0] > 0.03 && idle2.state.stands[0] < 0.9
      && gap(idle1.state.front, idle2.state.front) > 0.01 && swing(idle2.state.front) > 0.01 && idle2.light > 1000,
      JSON.stringify({ clock: [idle1.state.clock, idle2.state.clock], stand: idle2.state.stands[0], moved: gap(idle1.state.front, idle2.state.front), swing: swing(idle2.state.front), light: idle2.light }));
    // Camera drift 0 and a palette that stands still, so that nothing but the scene could move the picture.
    const [off1, off2] = await deckRun([{ level: null, off: true, secs: 3 }, { level: null, off: true, secs: 1, trace: true }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    const [on1, on2] = await deckRun([{ level: null, idle: true, secs: 3 }, { level: null, idle: true, secs: 1 }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    check('phosphor: with the mic and Idle animation off the picture holds still, pixel for pixel', off1.hash === off2.hash && on1.hash !== on2.hash && off2.solid > 500 && off2.light > 5,
      JSON.stringify({ off: [off1.hash, off2.hash], idle: [on1.hash, on2.hash], solid: off2.solid, light: off2.light }));
    const [live1, muted1, muted2, muted3] = await deckRun([{ level: 0.8, all: 0.8, secs: 2 }, { level: null, off: true, secs: 0.5 }, { level: null, off: true, secs: 7.5, trace: true }, { level: null, off: true, secs: 1 }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    check('phosphor: muted in the middle of a stream, the waves stop where they are and the echoes die away', muted1.state.live === false && muted1.state.clock === live1.state.clock && muted2.state.clock === live1.state.clock
      && gap(muted1.state.lag, muted2.state.lag) === 0 && muted2.trace.every((t) => t[0] === live1.state.clock && t[8] === muted2.trace[0][8])
      && muted1.state.stands[23] > 0.5 && muted1.state.stands[0] < 0.4 && top(muted2.state.stands) < 0.01 && muted2.state.peaks.every((p) => p < 0.16) && muted2.hash === muted3.hash && muted1.hash !== muted2.hash,
      JSON.stringify({ clock: [live1.state.clock, muted1.state.clock, muted2.state.clock], stands: [muted1.state.stands[0], muted1.state.stands[23], top(muted2.state.stands)] }));

    // Colour.
    const [hued] = await deckRun(talk, { hue: 2 });
    const close = (a, b) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 2);
    check('phosphor: a trace takes its colour from the palette by how far back it is, and the hue setting moves it', close(loud.state.tone, loud.expectTone) && close(hued.state.tone, hued.expectTone) && !close(hued.state.tone, loud.state.tone) && loud.state.ref === 12,
      JSON.stringify({ tone: loud.state.tone, expect: loud.expectTone, hued: hued.state.tone, hueExpect: hued.expectTone }));

    // The three Rotate settings, with the camera held still.
    // How much of the light that lies on the unturned deck's slices a deck seen from behind must show on its own.
    const BEHIND = 0.43;
    const deckTurned = (knobs) => deckRun([{ level: 0.8, all: 0.8, secs: 1 }], { knobs: Object.assign({ cameraDrift: 0 }, knobs) });
    const [deckFlat] = await deckTurned({}), [deckFace] = await deckTurned({ rotateX: 60 }), [deckDiamond] = await deckTurned({ rotateX: 60, rotateY: 45 }), [deckRolled] = await deckTurned({ rotateY: 200, rotateZ: 30 });
    const deckOff = (r) => Math.max(...r.state.corner.map((v, i) => Math.abs(v - r.expectCorner[i])));
    const deckIn = (r) => r.solidBox.cx - r.solidBox.w / 2 > 4 && r.solidBox.cx + r.solidBox.w / 2 < r.canvas[0] - 4 && r.solidBox.cy - r.solidBox.h / 2 > 4 && r.solidBox.cy + r.solidBox.h / 2 < r.canvas[1] - 4;
    check('phosphor: with no rotation it is where it always was', deckFlat.state.turned.join() === '0,0,0' && deckFlat.state.scale === 1 && deckFlat.state.at.join() === '0,0,0' && deckOff(deckFlat) < 1e-6
      && Math.abs(deckFlat.state.corner[0] - 3.2) < 1e-6 && Math.abs(deckFlat.state.corner[2] - 1.8) < 1e-6 && deckIn(deckFlat), JSON.stringify({ corner: deckFlat.state.corner, box: deckFlat.solidBox }));
    check('phosphor: Rotate X, Y and Z turn it, and however it is turned it stays in the frame', [deckFace, deckDiamond, deckRolled].every((r) => deckOff(r) < 1e-5 && deckIn(r) && r.solidBox.w > 100 && r.solidBox.h > 100 && r.state.scale <= 1 && r.state.scale > 0.4)
      && deckFace.state.turned.join() === '60,0,0' && deckDiamond.state.scale < deckFace.state.scale && Math.abs(deckFace.state.corner[1] - deckFlat.state.corner[1]) > 0.5 && deckRolled.state.turned.join() === '0,200,30'
      && deckFace.hash !== deckFlat.hash,
      JSON.stringify({ off: [deckOff(deckFace), deckOff(deckDiamond), deckOff(deckRolled)], scale: [deckFace.state.scale, deckDiamond.state.scale, deckRolled.state.scale], box: [deckFlat.solidBox, deckFace.solidBox, deckDiamond.solidBox, deckRolled.solidBox] }));
    const [deckBack] = await deckTurned({ rotateY: 180 }), [deckEnd] = await deckTurned({ rotateY: 80 });
    check('phosphor: seen from behind, its traces lie on the side of their slices that the camera sees', deckFlat.state.behind === false && deckEnd.state.behind === false && deckBack.state.behind === true && deckOff(deckBack) < 1e-5 && deckIn(deckBack)
      && deckBack.lit > BEHIND * deckFlat.lit, JSON.stringify({ behind: [deckFlat.state.behind, deckEnd.state.behind, deckBack.state.behind], lit: [deckFlat.lit, deckEnd.lit, deckBack.lit] }));
    // From its end, which side the camera sees is down to which way the camera has swung.
    const [deckSide] = await deckRun([{ level: 0.8, all: 0.8, secs: 1 }], { knobs: { cameraDrift: 100, rotateY: 90 } });
    check('phosphor: seen from its end, the camera\'s own swing decides which side of the slices it sees', Math.abs(deckSide.state.orbit) > 0.01 && deckSide.state.behind === (deckSide.state.orbit < 0), JSON.stringify({ orbit: deckSide.state.orbit, behind: deckSide.state.behind }));
    const deckDrifts = await deckRun([{ level: 0.8, all: 0.8, secs: 1 }, { level: 0.8, all: 0.8, secs: 0.02, knobs: { cameraDrift: 100 } }], { knobs: { cameraDrift: 0, rotateX: 60 } });
    check('phosphor: a change of Camera drift alone is fitted afresh, at once', deckDrifts[0].state.sway === 0 && Math.abs(deckDrifts[1].state.sway - 0.52) < 1e-12 && deckDrifts[1].state.scale < deckDrifts[0].state.scale - 0.005 && deckOff(deckDrifts[1]) < 1e-5,
      JSON.stringify(deckDrifts.map((r) => [r.state.sway, r.state.scale])));
    const [deckSway] = await deckRun([{ level: 0.8, all: 0.8, secs: 1 }], { knobs: { cameraDrift: 100, rotateX: 60 } }), [deckSway0] = await deckRun([{ level: 0.8, all: 0.8, secs: 1 }], { knobs: { cameraDrift: 50 } });
    check('phosphor: the more the camera drifts, the more room a turned deck is given for it', Math.abs(deckSway.state.sway - 0.52) < 1e-12 && Math.abs(deckSway0.state.sway - 0.26) < 1e-12 && deckOff(deckSway) < 1e-5 && deckSway.state.scale < deckFace.state.scale - 0.005
      && deckSway0.state.scale === 1 && deckSway0.state.at.join() === '0,0,0', JSON.stringify({ sway: [deckSway0.state.sway, deckSway.state.sway], scale: [deckFace.state.scale, deckSway.state.scale], off: deckOff(deckSway) }));
    const deckReset = await deckRun([{ level: 0.8, all: 0.8, secs: 1 }, { level: 0.8, all: 0.8, secs: 0.02, knobs: { rotateX: 60, rotateY: 90, rotateZ: 10 } }, { level: 0.8, all: 0.8, secs: 0.02, knobs: { rotateX: 0, rotateY: 0, rotateZ: 0 } }], { knobs: { cameraDrift: 0 } });
    check('phosphor: a change of rotation applies at once, both ways', deckReset.map((r) => r.state.turned.join()).join(' ') === '0,0,0 60,90,10 0,0,0' && deckReset[1].state.scale < 1 && deckReset[2].state.scale === 1 && deckOff(deckReset[1]) < 1e-5 && deckOff(deckReset[2]) < 1e-6,
      JSON.stringify(deckReset.map((r) => [r.state.turned, r.state.scale])));

    // Placement and cost.
    await activate(DECK);
    const deckP0 = await probe();
    await pushConfig((c) => { c.activeViz = 'phosphor'; c.placement.x = 30; });
    await wide.waitForTimeout(400);
    const deckP1 = await probe();
    check('phosphor: Scene placement slides it', deckP1.centroidX - deckP0.centroidX > 150, `${deckP0.centroidX.toFixed(0)} → ${deckP1.centroidX.toFixed(0)}`);
    await pushConfig((c) => { c.placement.x = 0; });
    await wide.waitForTimeout(300);
    await activate(DECK);
    const deckCost = await wide.evaluate(() => { perViz['phosphor'].depth = 100; try { let now = performance.now(), acc = 0; for (let i = 0; i < 120; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); acc += performance.now() - t; } return acc / 120; } finally { perViz['phosphor'].depth = 50; } });
    check(`phosphor: draw() with all 36 slices averages under 5 ms of script time (${deckCost.toFixed(2)} ms)`, deckCost < 5);

    }

    // ── The chladni plate (a kit scene: sand on a floating plate) ────
    {   // its own block: the names below are the plate's own
    // Build the scene afresh, drive the level and the 32 bins by hand, and read the canvas and
    // the scene after each step. A step gives level (null: whatever the kit hears), secs, and
    // either all (every bin, 0..1) or bins ([[bin, 0..1], ...]); idle: true has the mic off,
    // off: true has the mic and Idle animation off.
    const PLATE = 'chladni';
    // hue and colorSpeed set the palette's place and speed for the run, gain the Gain setting. A trace row is
    // [clock, shake, flex, relief, air, top, orbit, figure, since, blend, settled].
    const plateRun = (steps, { fps = 60, knobs = null, hue = null, colorSpeed = null, gain = null } = {}) => wide.evaluate(({ id, steps, fps, knobs, hue, colorSpeed, gain }) => {
      window.frame = function () {};
      const saved = { frequencies, micActive, cfgIdleAnim, cfgColorHue, cfgColorSpeed, cfgGain }, knobs0 = Object.assign({}, perViz[id]);
      try {
        if (knobs) Object.assign(perViz[id], knobs);
        if (hue !== null) cfgColorHue = hue;
        if (colorSpeed !== null) cfgColorSpeed = colorSpeed;
        if (gain !== null) cfgGain = gain;
        TimbreScene.testLevel = 0;
        setActiveViz('visualizer'); setActiveViz(id);
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), f = new Uint8Array(32), out = [];
        let now = 100000 + 1000 / 120, last = null;
        for (const st of steps) {
          TimbreScene.testLevel = st.level;
          micActive = !st.idle && !st.off;
          cfgIdleAnim = st.off ? false : saved.cfgIdleAnim;
          if (st.knobs) Object.assign(perViz[id], st.knobs);
          f.fill(st.all !== undefined ? Math.round(st.all * 255) : 0);
          if (st.bins) for (const [i, v] of st.bins) f[i] = Math.round(v * 255);
          frequencies = f;
          const trace = st.trace ? [] : null;
          for (let i = 0, n = Math.round(st.secs * fps); i < n; i++) {
            now += 1000 / fps; currentViz.draw(now, 1 / fps);
            if (trace) { const q = window.__timbre.scene.state; trace.push([q.clock, q.shake, q.flex, q.relief, q.air, q.top, q.orbit, q.figure, q.since, q.blend, q.settled]); }
          }
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);   // row 0 is the bottom of the canvas
          // solid: the plate. sand: plate pixels with bright sand on them. lit: plate pixels with any light on them.
          // light: light over the background (sand in the air beyond the plate's edge).
          let solid = 0, sand = 0, lit = 0, light = 0, edge = 0, empty = 0, hash = 2166136261;
          for (let i = 0; i < px.length; i++) hash = Math.imul(hash ^ px[i], 16777619) >>> 0;   // the whole picture, as one number
          const solidBox = [w, -1, h, -1];
          for (let i = 0; i < px.length; i += 4) {
            const x = (i / 4) % w, y = Math.floor(i / 4 / w), rgb = px[i] + px[i + 1] + px[i + 2], a = px[i + 3];
            if (a > 250) {
              solid++; if (rgb > 380) sand++; if (rgb > 45) lit++;
              if (x < solidBox[0]) solidBox[0] = x; if (x > solidBox[1]) solidBox[1] = x; if (y < solidBox[2]) solidBox[2] = y; if (y > solidBox[3]) solidBox[3] = y;
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
            } else if (a < 5 && rgb > 12) light++;
            if (a === 0 && rgb === 0) empty++;
          }
          const size = (b) => ({ w: b[1] < 0 ? 0 : b[1] - b[0] + 1, h: b[3] < 0 ? 0 : b[3] - b[2] + 1, cx: (b[0] + b[1]) / 2, cy: (b[2] + b[3]) / 2 });
          // How this picture differs from the last step's: how many pixels, by how much at most, where, and how many
          // of them are on the plate, over the background, and on an edge between. For when a still picture is not still.
          const diff = { n: 0, max: 0, box: [w, -1, h, -1], kinds: [0, 0, 0] };
          if (last) for (let i = 0; i < px.length; i += 4) {
            const d = Math.max(Math.abs(px[i] - last[i]), Math.abs(px[i + 1] - last[i + 1]), Math.abs(px[i + 2] - last[i + 2]), Math.abs(px[i + 3] - last[i + 3]));
            if (!d) continue;
            const x = (i / 4) % w, y = Math.floor(i / 4 / w);
            diff.n++; if (d > diff.max) diff.max = d;
            if (x < diff.box[0]) diff.box[0] = x; if (x > diff.box[1]) diff.box[1] = x; if (y < diff.box[2]) diff.box[2] = y; if (y > diff.box[3]) diff.box[3] = y;
            diff.kinds[px[i + 3] > 250 ? 0 : px[i + 3] < 5 ? 1 : 2]++;
          }
          last = px;
          const s = window.__timbre.scene, state = (s && s.state) || {};
          out.push({ state, solid, sand, lit, light, edge, diff, glowT: s ? s.afterglowT : null, empty: empty / (w * h), cornerAlpha: px[3], solidBox: size(solidBox), canvas: [w, h], trace, hash, kitCam: s ? s.camera : null,
            expectTone: state.grains ? getColor(state.colorT + (state.ring / 32) * 1.4) : null, expectGlow: state.grains ? getColor(state.colorT + 0.7) : null,
            // Where the plate's near right corner should be, from the Rotate settings as the scene read them.
            // The figure's value at the plate's point (16, 12) of 48: blended as the plate should have it, and each figure's own.
            expectMid: state.grains ? (() => { const C = TimbreChladni, ix = C.cell((16 / 48) * 2 - 1), iz = C.cell((12 / 48) * 2 - 1), fb = C.sample(C.FIGURES[state.figure], ix, iz, [0, 0, 0])[0], fa = C.sample(C.FIGURES[state.from], ix, iz, [0, 0, 0])[0], m = C.blendOf(state.since); return [fa + (fb - fa) * m, fa, fb]; })() : null,
            expectGrain: state.turned ? (() => { const C = TimbreChladni, r = state.turned, p = C.poseFor(r[0], r[1], r[2]), o = C.turn([0, 0, 0], state.drawn0[0], state.drawn0[1], state.drawn0[2], r[0], r[1], r[2]); return [o[0] * p.scale + p.x, o[1] * p.scale + p.y, o[2] * p.scale + p.z]; })() : null,
            expectCorner: state.turned ? (() => { const C = TimbreChladni, r = state.turned, D = Math.PI / 180, p = C.poseFor(r[0], r[1], r[2], state.sway), o = new THREE.Vector3(C.HALF, 0, C.HALF).applyEuler(new THREE.Euler(r[0] * D, r[1] * D, r[2] * D, 'XZY')); return [o.x * p.scale + p.x, o.y * p.scale + p.y, o.z * p.scale + p.z]; })() : null });
        }
        return out;
      } finally {
        frequencies = saved.frequencies; micActive = saved.micActive; cfgIdleAnim = saved.cfgIdleAnim; cfgColorHue = saved.cfgColorHue; cfgColorSpeed = saved.cfgColorSpeed; cfgGain = saved.cfgGain;
        Object.assign(perViz[id], knobs0); TimbreScene.testLevel = null;
      }
    }, { id: PLATE, steps, fps, knobs, hue, colorSpeed, gain });
    const top = (a) => Math.max(...a);
    const gap = (a, b) => top(a.map((v, i) => Math.abs(v - b[i])));
    const smooth = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
    const close = (a, b) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 2);
    // A voice sitting low: its weight is at bin 1, which asks for the third figure.
    const low = [[1, 0.8]];
    const talk = [{ level: 0.8, bins: low, secs: 3 }];
    // Thresholds are 60% of what the scene gives after 3 s at a steady 0.8: about 244,000 solid pixels
    // (the plate) and 12,200 of them bright with sand.
    // PLATE_AIR is 60% of the pixels of light over the background a tenth of a second into a throw: about 4,550.
    const PLATE_SOLID = 146000, PLATE_SAND = 7300, PLATE_AIR = 2700;

    await activate(PLATE);
    const plateState = await sceneState();
    const [early, loud] = await plateRun([{ level: 0.8, bins: low, secs: 0.02 }, { level: 0.8, bins: low, secs: 2.98 }]);   // one frame, then the rest of 3 s
    const [, hush, hush2] = await plateRun([...talk, { level: 0, secs: 2 }, { level: 0, secs: 0.5 }]);
    check('chladni is a kit scene: a solid dark plate with sand of added light on it, a transparent corner',
      !!plateState && plateState.active === true && plateState.targetSize[0] === 1728 && loud.solid > PLATE_SOLID && loud.sand > PLATE_SAND && loud.cornerAlpha === 0 && loud.edge === 0 && loud.empty > 0.3,
      JSON.stringify({ size: plateState && plateState.targetSize, solid: loud.solid, sand: loud.sand, lit: loud.lit, light: loud.light, corner: loud.cornerAlpha, edge: loud.edge, empty: loud.empty, box: loud.solidBox, hush: [hush.solid, hush.sand, hush.lit] }));
    check('chladni: the plate sits in the middle of the frame, wider than it is tall', Math.abs(loud.solidBox.cx - loud.canvas[0] / 2) < 0.06 * loud.canvas[0] && loud.solidBox.w > 1.2 * loud.solidBox.h && loud.solidBox.w > 0.25 * loud.canvas[0] && loud.solidBox.h > 0.5 * loud.canvas[1],
      JSON.stringify({ box: loud.solidBox, canvas: loud.canvas }));
    check('chladni: shaken by the voice, the sand gathers on the lines of the figure', early.state.settled < 0.4 && loud.state.settled > 0.7 && loud.state.spread < early.state.spread / 3 && loud.state.figure === 2 && loud.state.from === 0 && loud.state.changes === 1
      && Math.abs(loud.state.shake - 0.84) < 0.01 && loud.state.grains === 18000 && loud.state.drawn === 18000,
      JSON.stringify({ settled: [early.state.settled, loud.state.settled], spread: [early.state.spread, loud.state.spread], figure: loud.state.figure, shake: loud.state.shake }));
    check('chladni: in a pause the plate only hums, the figure is sharp and the sand lies almost still', Math.abs(hush.state.shake - 0.04) < 0.005 && hush.state.settled > 0.9 && hush.state.spread < loud.state.spread / 2 && hush.state.air < 0.01
      && gap(hush.state.first, hush2.state.first) < 0.01 && hush.state.figure === 2,
      JSON.stringify({ shake: hush.state.shake, settled: hush.state.settled, spread: [loud.state.spread, hush.state.spread], air: hush.state.air, moved: gap(hush.state.first, hush2.state.first) }));
    const [soft] = await plateRun([{ level: 0.3, bins: low, secs: 3 }]), [full] = await plateRun([{ level: 1, bins: low, secs: 3 }]);
    check('chladni: the louder the voice, the fuzzier the lines', full.state.spread > 1.5 * soft.state.spread && soft.state.settled > 0.7 && Math.abs(soft.state.shake - 0.34) < 0.01 && Math.abs(full.state.shake - 1.04) < 0.01,
      JSON.stringify({ spread: [soft.state.spread, full.state.spread], settled: [soft.state.settled, full.state.settled] }));
    // A moment when the plate is bent up, and one when it is bent down, with the camera held still.
    const [up, down] = await plateRun([{ level: 0.8, bins: low, secs: 3.034 }, { level: 0.8, bins: low, secs: 0.15 }], { knobs: { cameraDrift: 0 } });
    check('chladni: a grain is drawn where it lies on the bent plate, a hair above it', [0, 1, 2].every((i) => Math.abs(up.state.drawn0[i] - [up.state.first[0] * 2.2, up.state.flex * up.state.f0 + up.state.first[2] + 0.014, up.state.first[1] * 2.2][i]) < 1e-5)
      && Math.abs(up.state.flex * up.state.f0) > 1e-4 && up.state.flex > 0.015 && down.state.flex < -0.015 && Math.abs(up.state.first[0]) <= 1 && Math.abs(up.state.first[1]) <= 1 && Math.abs(loud.state.size - 0.085) < 1e-9,
      JSON.stringify({ size: loud.state.size, drawn: up.state.drawn0, lies: up.state.first.slice(0, 3), f: up.state.f0, flex: [up.state.flex, down.state.flex] }));
    check('chladni: the plate is drawn bent: its outline is not the same bent up as bent down', up.solid !== down.solid && (Math.abs(up.solidBox.h - down.solidBox.h) >= 2 || Math.abs(up.solidBox.cy - down.solidBox.cy) >= 1) && up.state.relief > 0.03 && down.state.relief > 0.03,
      JSON.stringify({ solid: [up.solid, down.solid], box: [up.solidBox, down.solidBox], relief: [up.state.relief, down.state.relief] }));

    // The tone picks the figure.
    const [deep] = await plateRun([{ level: 0.8, bins: [[0, 1]], secs: 0.5 }]), [mid] = await plateRun([{ level: 0.8, bins: [[1, 1], [2, 1]], secs: 0.5 }]), [high] = await plateRun([{ level: 0.8, bins: [[9, 1]], secs: 0.5 }]);
    check('chladni: a low voice draws a simple figure and a high one an intricate one', deep.state.figure === 0 && deep.state.changes === 0 && mid.state.figure === 4 && high.state.figure === 9 && deep.state.tone === 0 && Math.abs(mid.state.tone - 1.1 / 2.6) < 1e-3 && high.state.tone === 1,
      JSON.stringify({ figure: [deep.state.figure, mid.state.figure, high.state.figure], tone: [deep.state.tone, mid.state.tone, high.state.tone] }));
    // The plate waits a tenth of a second into a phrase and takes the mean of the tone over it.
    const [snap, onset] = await plateRun([{ level: 0.8, bins: [[9, 1]], secs: 0.05 }, { level: 0.8, bins: [[9, 1]], secs: 0.1 }]);
    const [, mixed, settledOn] = await plateRun([{ level: 0.8, bins: [[9, 1]], secs: 0.05 }, { level: 0.8, bins: [[0, 1]], secs: 0.05 }, { level: 0.8, bins: [[0, 1]], secs: 0.5 }]);
    check('chladni: a phrase takes its figure from the tone of its first tenth of a second', snap.state.tone === 1 && snap.state.figure === 0 && snap.state.phrases === 0 && snap.state.cold === true && snap.state.pending === true
      && onset.state.figure === 9 && onset.state.phrases === 1 && onset.state.cold === false && Math.abs(onset.state.since - 0.05) < 0.02
      && Math.abs(mixed.state.tone - 0.5) < 1e-6 && mixed.state.figure === 5 && mixed.state.asked === 5 && settledOn.state.figure === 5 && settledOn.state.tone < 0.2,
      JSON.stringify({ snap: [snap.state.tone, snap.state.figure, snap.state.phrases], onset: [onset.state.figure, onset.state.since], mixed: [mixed.state.tone, mixed.state.figure], after: [settledOn.state.tone, settledOn.state.figure] }));
    // A voice too faint to have a tone starts no phrase, and the plate keeps its figure; Gain makes it loud enough.
    const faintly = [{ level: 0.8, bins: [[1, 0.08], [2, 0.08]], secs: 0.5 }];
    const [faint] = await plateRun(faintly, { gain: 1 }), [boosted] = await plateRun(faintly, { gain: 2 }), [quietly] = await plateRun([{ level: 0.8, bins: [[1, 0.16], [2, 0.16]], secs: 0.5 }], { gain: 1 });
    check('chladni: a sound with no tone to speak of leaves the figure alone, and Gain scales the bands the tone is weighed over', faint.state.figure === 0 && faint.state.phrases === 0 && faint.state.tone === 0 && faint.state.settled > 0.5
      && boosted.state.figure === 4 && boosted.state.phrases === 1 && Math.abs(boosted.state.tone - 1.1 / 2.6) < 1e-3 && quietly.state.figure === 4 && Math.abs(quietly.state.tone - 1.1 / 2.6) < 1e-3,
      JSON.stringify({ figure: [faint.state.figure, boosted.state.figure, quietly.state.figure], tone: [faint.state.tone, boosted.state.tone, quietly.state.tone], phrases: [faint.state.phrases, boosted.state.phrases] }));
    // Within a phrase the figure follows the tone, but keeps a figure for 3 s.
    const [, kept, turned] = await plateRun([{ level: 0.8, bins: low, secs: 0.5 }, { level: 0.8, bins: [[9, 1]], secs: 1.5 }, { level: 0.8, bins: [[9, 1]], secs: 1.5 }]);
    check('chladni: within a phrase the figure follows the tone, but not within 3 s of the last change', kept.state.figure === 2 && Math.abs(kept.state.tone - (1 - (10 / 13) * Math.exp(-3.75))) < 1e-4 && kept.state.want > 2 && turned.state.figure === 9 && turned.state.from === 2 && turned.state.changes === 2
      && Math.abs(turned.state.since - 0.39) < 0.05 && turned.state.asked === 9, JSON.stringify({ figure: [kept.state.figure, turned.state.figure], tone: [kept.state.tone, turned.state.tone], since: turned.state.since }));
    // A new phrase.
    const [said, , again, later] = await plateRun([{ level: 0.8, bins: low, secs: 1.5 }, { level: 0, secs: 0.6 }, { level: 0.8, bins: low, secs: 0.4, trace: true }, { level: 0.8, bins: low, secs: 0.6 }]);
    const [, , short] = await plateRun([{ level: 0.8, bins: low, secs: 1.5 }, { level: 0, secs: 0.3 }, { level: 0.8, bins: low, secs: 0.4 }]);
    check('chladni: each phrase draws a new figure; a gap shorter than a pause does not', said.state.figure === 2 && again.state.figure === 3 && again.state.from === 2 && again.state.changes === 2 && short.state.figure === 2 && short.state.changes === 1,
      JSON.stringify({ figure: [said.state.figure, again.state.figure, short.state.figure], changes: [again.state.changes, short.state.changes] }));
    const pause = { level: 0, secs: 0.6 }, word = { level: 0.8, bins: low, secs: 1 };
    const rounds = await plateRun([word, pause, word, pause, word, pause, word, pause, word]);
    const burst = { level: 0.8, bins: low, secs: 0.2 }, breath = { level: 0, secs: 0.3 };
    const bursts = await plateRun([burst, breath, burst, breath, burst, breath, burst, breath, burst, breath, burst, breath, burst, breath, burst]);
    check('chladni: a voice that keeps its tone goes round three figures, and short gaps between words are not pauses', rounds.map((r) => r.state.figure).join() === '2,2,3,3,4,4,2,2,3' && rounds[8].state.phrases === 5
      && bursts[14].state.figure === 2 && bursts[14].state.phrases === 1 && bursts[14].state.changes === 1,
      JSON.stringify({ rounds: rounds.map((r) => r.state.figure), bursts: [bursts[14].state.figure, bursts[14].state.phrases, bursts[14].state.changes] }));
    // The blend from the frame the plate takes its new figure (a tenth of a second into the phrase).
    const blendTrace = again.trace.map((t) => t[9]).slice(again.trace.findIndex((t) => t[9] === 0));
    check('chladni: the plate changes figure over 0.8 s, and the sand follows', Math.abs(again.state.since - 0.3) < 0.02 && Math.abs(again.state.blend - smooth(again.state.since / 0.8)) < 1e-6 && again.state.blend > 0.15 && again.state.blend < 0.6
      && again.state.mix === again.state.blend && Math.abs(again.state.midF - again.expectMid[0]) < 1e-6 && Math.abs(again.expectMid[1] - again.expectMid[2]) > 0.1 && again.state.settled > 0.85 && later.state.blend === 1
      && blendTrace.length > 10 && blendTrace[0] === 0 && blendTrace.every((b, i) => i === 0 || b > blendTrace[i - 1]) && later.state.settled > 0.6 && later.state.figure === 3,
      JSON.stringify({ since: again.state.since, blend: [again.state.blend, later.state.blend], settled: [again.state.settled, later.state.settled], mid: [again.state.midF, again.expectMid] }));

    // The plate bends and glows where it moves.
    const [, bent] = await plateRun([{ level: 0.8, bins: low, secs: 2 }, { level: 0.8, bins: low, secs: 0.5, trace: true }]);
    const [, humming] = await plateRun([{ level: 0, secs: 1 }, { level: 0, secs: 0.5, trace: true }]);
    const swing = (r) => top(r.trace.map((t) => Math.abs(t[2]))), relief = (r) => top(r.trace.map((t) => t[3]));
    // How many times the bend changes side, leaving out the frames where it is passing through flat.
    const turns = (r) => { const s = r.trace.map((t) => t[2]).filter((v) => Math.abs(v) > 1e-9).map(Math.sign); return s.filter((v, i) => i > 0 && v !== s[i - 1]).length; };
    const bentRow = bent.trace.reduce((a, t) => (Math.abs(t[2]) > Math.abs(a[2]) ? t : a));
    check('chladni: the plate bends four times a second, further the louder the voice', Math.abs(swing(bent) - 0.035 * 0.84) < 0.035 * 0.84 * 0.03 && Math.abs(swing(humming) - 0.035 * 0.04) < 0.035 * 0.04 * 0.03
      && bentRow[3] > 1.5 * Math.abs(bentRow[2]) && bentRow[3] <= 2 * Math.abs(bentRow[2]) + 1e-6 && turns(bent) === 3
      && Math.abs(bent.state.flex - 0.035 * bent.state.shake * Math.sin(2 * Math.PI * 4 * bent.state.clock)) < 1e-6,
      JSON.stringify({ swing: [swing(bent), swing(humming)], relief: [relief(bent), relief(humming)], turns: turns(bent) }));
    check('chladni: the plate glows where it moves, more the louder the voice, and has a lit rim', Math.abs(loud.state.glowMax - 0.1 * loud.state.shake) < 1e-6 && Math.abs(hush.state.glowMax - 0.1 * hush.state.shake) < 1e-6 && hush.state.glowMax < 0.005 && loud.state.plateLit > 1.5 * hush.state.plateLit
      && loud.state.plateDark < 0.03 && hush.state.rimLit > 2 * hush.state.plateLit && loud.lit > 1.5 * hush.lit && close(loud.state.glowTint, loud.expectGlow),
      JSON.stringify({ glow: [loud.state.glowMax, hush.state.glowMax], lit: [loud.state.plateLit, hush.state.plateLit], dark: loud.state.plateDark, rim: hush.state.rimLit, px: [loud.lit, hush.lit], tint: [loud.state.glowTint, loud.expectGlow] }));
    check('chladni: the plate has its thickness all round, bent or not, and its skirt hangs from its edge', Math.abs(up.state.thick[0] - 0.09) < 1e-6 && Math.abs(up.state.thick[1] - 0.09) < 1e-6 && up.state.skirtOff < 1e-6 && up.state.relief > 0.03 && Math.abs(hush.state.thick[0] - 0.09) < 1e-6,
      JSON.stringify({ thick: up.state.thick, off: up.state.skirtOff, relief: up.state.relief }));

    // A throw.
    const settle = { level: 0.3, bins: low, secs: 2.5 };
    const [calm, hit, fell, back] = await plateRun([settle, { level: 1, bins: low, secs: 0.1 }, { level: 0.3, bins: low, secs: 0.6 }, { level: 0.3, bins: low, secs: 2 }]);
    const [, nearly] = await plateRun([settle, { level: 0.88, bins: low, secs: 0.1 }]);
    const [, , , twice] = await plateRun([settle, { level: 1, bins: low, secs: 0.1 }, { level: 0.05, bins: low, secs: 1.5 }, { level: 1, bins: low, secs: 0.1 }]);
    check('chladni: a yell or a mic thump throws all the sand into the air, and it lands scattered and walks back', calm.state.hits === 0 && calm.state.settled > 0.7 && hit.state.hits === 1 && hit.state.strength === 1 && hit.state.air > 0.9 && hit.state.top > 0.1 && hit.state.top < 0.35
      && fell.state.air < 0.15 && gap(calm.state.first, fell.state.first) > 0.03 && back.state.settled > 0.7 && back.state.hits === 1 && hit.edge === 0
      && hit.light > PLATE_AIR && Math.abs(hit.solid - calm.solid) < 0.02 * calm.solid && hit.state.first[2] > 0 && close(hit.state.tint, hit.expectTone),
      JSON.stringify({ hits: [calm.state.hits, hit.state.hits, back.state.hits], air: [hit.state.air, fell.state.air], top: hit.state.top, settled: [calm.state.settled, fell.state.settled, back.state.settled], moved: gap(calm.state.first, fell.state.first), light: [calm.light, hit.light], solid: [calm.solid, hit.solid], tint: [hit.state.tint, hit.expectTone] }));
    const [, , , third] = await plateRun([settle, { level: 1, bins: low, secs: 0.1 }, { level: 0.05, bins: low, secs: 2.7 }, { level: 1, bins: low, secs: 0.1 }]);
    const [, held] = await plateRun([settle, { level: 1, bins: low, secs: 3.5 }]);
    // A beat at a level too low to throw, and the level rising past 0.9 a moment later with no beat of its own.
    const [, , late] = await plateRun([settle, { level: 0.6, bins: low, secs: 0.05 }, { level: 1, bins: low, secs: 0.1 }]);
    check('chladni: the plate shakes as hard as the voice is loud, and harder on a beat', Math.abs(nearly.state.shake - Math.min(1.2, 0.04 + nearly.state.flame + 0.4 * nearly.state.kick)) < 1e-6 && nearly.state.kick > 0.5 && nearly.state.shake < 1.19
      && Math.abs(nearly.state.flame - 0.88) > 0.005 && Math.abs(hush.state.shake - (0.04 + hush.state.flame)) < 1e-6, JSON.stringify({ shake: nearly.state.shake, flame: nearly.state.flame, kick: nearly.state.kick }));
    check('chladni: a throw needs a beat of its own: a held yell throws once, and a level that rises after the beat throws nothing; after 2.5 s a new hit throws again', held.state.hits === 1 && held.state.level === 1
      && late.state.hits === 0 && late.state.kick > 0.4 && late.state.level === 1 && third.state.hits === 2 && third.state.air > 0.9,
      JSON.stringify({ held: held.state.hits, late: [late.state.hits, late.state.kick], third: [third.state.hits, third.state.air] }));
    check('chladni: a beat below a level of 0.9 throws nothing, and neither does a second hit within 2.5 s', nearly.state.hits === 0 && nearly.state.kick > 0.5 && nearly.state.air < 0.05 && twice.state.hits === 1 && twice.state.kick > 0.5,
      JSON.stringify({ nearly: [nearly.state.hits, nearly.state.kick, nearly.state.air], twice: [twice.state.hits, twice.state.kick] }));

    // Density.
    const [few] = await plateRun(talk, { knobs: { density: 0 } }), [many] = await plateRun(talk, { knobs: { density: 100 } });
    check('chladni: Density 0 is 6,000 grains, the default 18,000, 100 is 30,000', few.state.grains === 6000 && few.state.drawn === 6000 && loud.state.grains === 18000 && many.state.grains === 30000 && many.state.drawn === 30000
      && many.sand > 1.5 * few.sand && many.state.settled > 0.7 && few.state.settled > 0.7, JSON.stringify({ grains: [few.state.grains, loud.state.grains, many.state.grains], sand: [few.sand, loud.sand, many.sand] }));
    const moved = await plateRun([{ level: 0.8, bins: low, secs: 2 }, { level: 0.8, bins: low, secs: 0.02, knobs: { density: 100 } }, { level: 0.8, bins: low, secs: 0.02, knobs: { density: 0 } }]);
    check('chladni: a change of Density applies at once, both ways, and the sand already lying stays', moved.map((r) => r.state.grains).join() === '18000,30000,6000' && moved.map((r) => r.state.drawn).join() === '18000,30000,6000'
      && gap(moved[0].state.first, moved[1].state.first) < 0.1 && gap(moved[1].state.first, moved[2].state.first) < 0.1 && moved[2].state.settled > 0.7 && moved[1].state.settled < moved[0].state.settled,
      JSON.stringify(moved.map((r) => [r.state.grains, r.state.settled, r.sand])));

    // The three Rotate settings, with the camera held still.
    const turnedBy = (knobs) => plateRun(talk, { knobs: Object.assign({ cameraDrift: 0 }, knobs) });
    const [flat] = await turnedBy({}), [face] = await turnedBy({ rotateX: 46 }), [diamond] = await turnedBy({ rotateX: 46, rotateY: 45 }), [spun] = await turnedBy({ rotateY: 45 }), [rolled] = await turnedBy({ rotateZ: 30 });
    // How far the plate's corner is from where the settings put it; the same for the first grain; and for the skirt, from the plate.
    const cornerOff = (r) => Math.max(gap(r.state.corner, r.expectCorner), gap(r.state.grainWorld, r.expectGrain), r.state.skirtWorldOff);
    const [flatAgain] = await turnedBy({});
    check('chladni: the sand starts the same every time, so two runs of the same sound leave every grain in the same place', gap(flatAgain.state.first, flat.state.first) === 0 && flatAgain.state.settled === flat.state.settled,
      JSON.stringify({ a: flatAgain.state.first.slice(0, 3), b: flat.state.first.slice(0, 3) }));
    check('chladni: with no rotation the plate is where it always was', flat.state.turned.join() === '0,0,0' && flat.state.scale === 1 && flat.state.at.join() === '0,0,0' && cornerOff(flat) < 1e-6 && Math.abs(flat.state.corner[0] - 2.2) < 1e-6 && Math.abs(flat.state.corner[2] - 2.2) < 1e-6
      && Math.abs(flat.state.facing - Math.cos(46 * Math.PI / 180)) < 1e-4, JSON.stringify({ corner: flat.state.corner, facing: flat.state.facing }));
    check('chladni: Rotate X at 46 turns the plate to face the camera, like the old effect', face.state.facing > 0.9999 && Math.abs(face.solidBox.w - face.solidBox.h) < 0.05 * face.solidBox.w && face.solidBox.h > flat.solidBox.h && cornerOff(face) < 1e-5
      && face.state.scale < 1 && face.state.scale > 0.85 && face.state.settled > 0.7 && face.edge === 0 && face.sand > PLATE_SAND && Math.abs(face.state.size - 0.085 * face.state.scale) < 1e-9,
      JSON.stringify({ facing: face.state.facing, box: [face.solidBox, flat.solidBox], scale: face.state.scale, corner: [face.state.corner, face.expectCorner], sand: face.sand }));
    check('chladni: Rotate Y spins the plate in its own plane, Rotate Z rolls it to one side, and however it is turned it stays in the frame', [diamond, spun, rolled].every((r) => r.edge === 0 && cornerOff(r) < 1e-5 && r.state.scale < 1 && r.solid > 0.25 * flat.solid && r.state.settled > 0.7)
      && diamond.state.facing > 0.9999 && Math.abs(spun.state.facing - flat.state.facing) < 1e-6 && rolled.state.facing < flat.state.facing - 0.02 && diamond.state.scale < 0.8 * face.state.scale
      && Math.abs(diamond.solidBox.w - diamond.solidBox.h) < 0.05 * diamond.solidBox.w && Math.abs(rolled.solidBox.cx - flat.solidBox.cx) < 0.03 * flat.canvas[0] && diamond.solidBox.h < flat.canvas[1],
      JSON.stringify({ facing: [diamond.state.facing, spun.state.facing, rolled.state.facing], scale: [diamond.state.scale, spun.state.scale, rolled.state.scale], box: [diamond.solidBox, spun.solidBox, rolled.solidBox], off: [cornerOff(diamond), cornerOff(spun), cornerOff(rolled)] }));
    const plateDrifts = await plateRun([talk[0], Object.assign({}, talk[0], { secs: 0.02, knobs: { cameraDrift: 100 } })], { knobs: { cameraDrift: 0, rotateX: 46 } });
    check('chladni: a change of Camera drift alone is fitted afresh, at once', plateDrifts[0].state.sway === 0 && Math.abs(plateDrifts[1].state.sway - 0.56) < 1e-12 && plateDrifts[1].state.scale < plateDrifts[0].state.scale - 0.03 && gap(plateDrifts[1].state.corner, plateDrifts[1].expectCorner) < 1e-5,
      JSON.stringify(plateDrifts.map((r) => [r.state.sway, r.state.scale])));
    const [plateSway] = await plateRun(talk, { knobs: { cameraDrift: 100, rotateX: 46 } }), [plateSway0] = await plateRun(talk, { knobs: { cameraDrift: 50 } });
    check('chladni: the more the camera drifts, the more room a turned plate is given for it', Math.abs(plateSway.state.sway - 0.56) < 1e-12 && Math.abs(plateSway0.state.sway - 0.28) < 1e-12 && gap(plateSway.state.corner, plateSway.expectCorner) < 1e-5
      && plateSway.state.scale < face.state.scale - 0.03 && plateSway0.state.scale === 1 && plateSway0.state.at.join() === '0,0,0' && plateSway.edge === 0,
      JSON.stringify({ sway: [plateSway0.state.sway, plateSway.state.sway], scale: [face.state.scale, plateSway.state.scale] }));
    const reset = await plateRun([{ level: 0.8, bins: low, secs: 1.5 }, { level: 0.8, bins: low, secs: 0.02, knobs: { rotateX: 46, rotateY: 90, rotateZ: 10 } }, { level: 0.8, bins: low, secs: 0.02, knobs: { rotateX: 0, rotateY: 0, rotateZ: 0 } }], { knobs: { cameraDrift: 0 } });
    check('chladni: a change of rotation applies at once, both ways, and the sand keeps its figure', reset.map((r) => r.state.turned.join()).join(' ') === '0,0,0 46,90,10 0,0,0' && reset[1].state.scale < 1 && reset[2].state.scale === 1 && cornerOff(reset[1]) < 1e-5 && cornerOff(reset[2]) < 1e-6
      && gap(reset[0].state.first, reset[1].state.first) < 0.1 && reset[1].state.settled > 0.7 && reset[1].state.figure === reset[0].state.figure,
      JSON.stringify(reset.map((r) => [r.state.turned, r.state.scale, r.state.settled])));

    // Camera.
    const [still] = await plateRun(talk, { knobs: { cameraDrift: 0 } }), [drift] = await plateRun(talk, { knobs: { cameraDrift: 100 } });
    check('chladni: Camera drift 0 holds the camera still; 100 doubles the sway', still.state.orbit === 0 && Math.abs(loud.state.orbit) > 0.005 && Math.abs(drift.state.orbit - 2 * loud.state.orbit) < 1e-9
      && Math.abs(still.kitCam[0]) < 1e-6 && Math.abs(drift.kitCam[0]) > 1.5 * Math.abs(loud.kitCam[0]) && Math.abs(loud.kitCam[0]) > 0.05,
      JSON.stringify({ orbit: [still.state.orbit, loud.state.orbit, drift.state.orbit], x: [still.kitCam[0], loud.kitCam[0], drift.kitCam[0]] }));

    // The same at any frame rate.
    const fpsSteps = [{ level: 0.8, bins: low, secs: 2 }, { level: 0, secs: 0.6 }, { level: 0.8, bins: low, secs: 0.3 }];
    const [a30, , c30] = await plateRun(fpsSteps, { fps: 30 }), [a60, , c60] = await plateRun(fpsSteps, { fps: 60 });
    // The tone a second and a half after the voice has gone from low to high, at 30 fps: where following at 2.5 a second puts it.
    const [, k30] = await plateRun([{ level: 0.8, bins: low, secs: 0.5 }, { level: 0.8, bins: [[9, 1]], secs: 1.5 }], { fps: 30 });
    // A throw, two tenths of a second on, at 60 and at 144 fps: the sand is as high and as much of it is in the air.
    const [, t60] = await plateRun([settle, { level: 1, bins: low, secs: 0.2 }], { fps: 60 }), [, t144] = await plateRun([settle, { level: 1, bins: low, secs: 0.2 }], { fps: 144 });
    check('chladni: thrown sand flies as high and as long at 144 fps as at 60', t60.state.hits === 1 && t144.state.hits === 1 && t60.state.air > 0.8 && Math.abs(t144.state.air - t60.state.air) < 0.08 && Math.abs(t144.state.top - t60.state.top) < 0.12 * t60.state.top,
      JSON.stringify({ air: [t60.state.air, t144.state.air], top: [t60.state.top, t144.state.top] }));
    check('chladni: the same sound gives the same kind of figure at 30 and 60 fps', Math.abs(c30.state.clock - 2.9) < 1e-6 && Math.abs(c60.state.clock - 2.9) < 1e-6 && c30.state.figure === 3 && c60.state.figure === 3 && Math.abs(c30.state.since - c60.state.since) < 0.02
      && Math.abs(c30.state.blend - c60.state.blend) < 0.05 && Math.abs(a30.state.settled - a60.state.settled) < 0.05 && a60.state.settled > 0.7 && Math.abs(a30.state.spread - a60.state.spread) < 0.3 * a60.state.spread
      && Math.abs(a30.state.shake - a60.state.shake) < 1e-3 && Math.abs(a30.state.air - a60.state.air) < 0.02 && Math.abs(k30.state.tone - (1 - (10 / 13) * Math.exp(-3.75))) < 1e-4,
      JSON.stringify({ clock: [c30.state.clock, c60.state.clock], figure: [c30.state.figure, c60.state.figure], since: [c30.state.since, c60.state.since], settled: [a30.state.settled, a60.state.settled], spread: [a30.state.spread, a60.state.spread], air: [a30.state.air, a60.state.air] }));

    // Mic off.
    const [idle1, idle2] = await plateRun([{ level: null, idle: true, secs: 3 }, { level: null, idle: true, secs: 1.5, trace: true }]);
    check('chladni: with the mic off and Idle animation on, the plate shakes and the sand moves', idle1.state.live === true && Math.abs(idle2.state.clock - 4.5) < 1e-6 && idle2.state.shake > 0.08 && idle2.state.shake < 0.7 && gap(idle1.state.first, idle2.state.first) > 0.001
      && relief(idle2) > 0.002 && idle2.state.tone > 0.55 && idle2.state.tone < 0.8,
      JSON.stringify({ clock: [idle1.state.clock, idle2.state.clock], shake: idle2.state.shake, moved: gap(idle1.state.first, idle2.state.first), relief: relief(idle2), tone: idle2.state.tone, figure: idle2.state.figure }));
    // Camera drift 0 and a palette that stands still, so that nothing but the scene could move the picture.
    const [off1, off2] = await plateRun([{ level: null, off: true, secs: 3 }, { level: null, off: true, secs: 1, trace: true }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    const [on1, on2] = await plateRun([{ level: null, idle: true, secs: 3 }, { level: null, idle: true, secs: 1 }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    check('chladni: with the mic and Idle animation off the picture holds still, pixel for pixel', off1.hash === off2.hash && on1.hash !== on2.hash && off2.solid > 500 && off2.sand + off2.lit > 50 && off2.state.live === false && off2.state.shake === 0 && off2.state.clock === 0
      && gap(off1.state.first, off2.state.first) === 0 && off2.trace.every((t) => t[2] === 0 && t[3] === 0),
      JSON.stringify({ off: [off1.hash, off2.hash], idle: [on1.hash, on2.hash], solid: off2.solid, sand: off2.sand, lit: off2.lit, differs: off2.diff, afterglow: off2.glowT }));
    const [live1, thrownUp, muted1, muted2, muted3] = await plateRun([settle, { level: 1, bins: low, secs: 0.05 }, { level: null, off: true, secs: 0.05 }, { level: null, off: true, secs: 6 }, { level: null, off: true, secs: 1 }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    check('chladni: muted in the middle of a throw, the plate stops, the sand in the air lands and then nothing moves', thrownUp.state.hits === 1 && muted1.state.live === false && muted1.state.air > 0.5 && muted1.state.clock === thrownUp.state.clock && muted2.state.clock === thrownUp.state.clock
      && muted2.state.air === 0 && muted3.state.air === 0 && muted2.state.shake === 0 && muted2.state.relief === 0 && gap(muted2.state.first, muted3.state.first) === 0 && muted2.hash === muted3.hash && muted1.hash !== muted2.hash
      && live1.state.live === true, JSON.stringify({ air: [thrownUp.state.air, muted1.state.air, muted2.state.air], clock: [thrownUp.state.clock, muted2.state.clock], hash: [muted1.hash, muted2.hash, muted3.hash], differs: muted3.diff, afterglow: muted3.glowT }));

    // Colour.
    const [hued] = await plateRun(talk, { hue: 2 });
    check('chladni: a grain takes its colour from the palette by how far it is from the middle of the plate, and the hue setting moves it', close(loud.state.tint, loud.expectTone) && close(hued.state.tint, hued.expectTone) && !close(hued.state.tint, loud.state.tint)
      && loud.state.ring === Math.min(32, Math.floor(Math.hypot(loud.state.first[0], loud.state.first[1]) / Math.SQRT2 * 32)),
      JSON.stringify({ tint: loud.state.tint, expect: loud.expectTone, hued: hued.state.tint, hueExpect: hued.expectTone, ring: loud.state.ring }));

    // Placement and cost.
    await activate(PLATE);
    const plateP0 = await probe();
    await pushConfig((c) => { c.activeViz = 'chladni'; c.placement.x = 30; });
    await wide.waitForTimeout(400);
    const plateP1 = await probe();
    check('chladni: Scene placement slides it', plateP1.centroidX - plateP0.centroidX > 150, `${plateP0.centroidX.toFixed(0)} → ${plateP1.centroidX.toFixed(0)}`);
    await pushConfig((c) => { c.activeViz = 'chladni'; c.placement.size = 50; });
    await wide.waitForTimeout(400);
    const halfSize = await wide.evaluate(() => { currentViz.draw(performance.now(), 1 / 60); currentViz.draw(performance.now() + 17, 1 / 60); return window.__timbre.scene.state.size; });
    // The small page draws into a picture several times taller than its canvas.
    const smallSand = await page.evaluate(() => { currentViz.draw(performance.now(), 1 / 60); currentViz.draw(performance.now() + 17, 1 / 60); const s = window.__timbre.scene; return { name: window.__timbre.currentVizName, scale: s && s.renderScale, size: s && s.state.size }; });
    check('chladni: a grain keeps its size against the plate under the Size slider and on the small page', Math.abs(halfSize - 0.0425) < 1e-9 && smallSand.name === 'chladni' && smallSand.scale >= 2 && Math.abs(smallSand.size - 0.085 * smallSand.scale * 0.5) < 1e-9,
      JSON.stringify({ half: halfSize, small: smallSand }));
    await pushConfig((c) => { c.placement.x = 0; });
    await wide.waitForTimeout(300);
    await activate(PLATE);
    const plateCost = await wide.evaluate(() => { perViz['chladni'].density = 100; try { let now = performance.now(), acc = 0; for (let i = 0; i < 120; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); acc += performance.now() - t; } return acc / 120; } finally { perViz['chladni'].density = 50; } });
    check(`chladni: draw() with all 30,000 grains averages under 5 ms of script time (${plateCost.toFixed(2)} ms)`, plateCost < 5);

    }

    // ── The glass prism (a kit scene: a cut crystal turning in the light) ────
    {   // its own block: the names below are the crystal's own
    // Build the scene afresh, drive the level and the 32 bins by hand, and read the canvas and
    // the scene after each step. A step gives level (null: whatever the kit hears), secs, and
    // either all (every bin, 0..1) or bins ([[bin, 0..1], ...]); idle: true has the mic off,
    // off: true has the mic and Idle animation off. peak is the mic's raw peak (0..1; none unless
    // given), which is what shatters the crystal; wave ('loud' or 'flat') has the capture give no peak
    // and a wave to take it from. gap is milliseconds in which the page drew nothing, before the step.
    // keep: true keeps the step's picture, and versus: true says how another step's differs from it.
    const PRISM = 'glass-prism';
    const prismRun = (steps, { fps = 60, knobs = null, hue = null, colorSpeed = null, gain = null } = {}) => wide.evaluate(({ id, steps, fps, knobs, hue, colorSpeed, gain }) => {
      window.frame = function () {};
      const saved = { frequencies, micActive, cfgIdleAnim, cfgColorHue, cfgColorSpeed, cfgGain, micPeak, waveform }, knobs0 = Object.assign({}, perViz[id]);
      try {
        if (knobs) Object.assign(perViz[id], knobs);
        if (hue !== null) cfgColorHue = hue;
        if (colorSpeed !== null) cfgColorSpeed = colorSpeed;
        if (gain !== null) cfgGain = gain;
        TimbreScene.testLevel = 0;
        micPeak = 0;
        setActiveViz('visualizer'); setActiveViz(id);
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), f = new Uint8Array(32), out = [];
        let now = 100000 + 1000 / 120, last = null;
        for (const st of steps) {
          TimbreScene.testLevel = st.level;
          micActive = !st.idle && !st.off;
          cfgIdleAnim = st.off ? false : saved.cfgIdleAnim;
          micPeak = st.peak === undefined ? 0 : st.peak;
          if (st.wave) { micPeak = null; const wv = new Uint8Array(256).fill(128); if (st.wave === 'loud') wv[40] = 255; waveform = wv; } else waveform = saved.waveform;
          if (st.gap) now += st.gap;
          if (st.knobs) Object.assign(perViz[id], st.knobs);
          f.fill(st.all !== undefined ? Math.round(st.all * 255) : 0);
          if (st.bins) for (const [i, v] of st.bins) f[i] = Math.round(v * 255);
          frequencies = f;
          let beats = 0;
          for (let i = 0, n = Math.round(st.secs * fps); i < n; i++) { now += 1000 / fps; const k0 = window.__timbre.scene ? window.__timbre.scene.state.kicks : 0; currentViz.draw(now, 1 / fps); if (window.__timbre.scene.state.kicks > k0) beats++; }
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);   // row 0 is the bottom of the canvas
          // light: pixels of light over the background, which is all this scene makes. solid: pixels that
          // cover the background, which it should never make. sum: how much light there is in all.
          // white: pixels of light burnt out to white. rim: the mean colour of the light in the outer tenth of its
          // box at each side, where only the largest of the three copies reaches.
          let solid = 0, light = 0, sum = 0, edge = 0, empty = 0, sx = 0, white = 0, hash = 2166136261;
          for (let i = 0; i < px.length; i++) hash = Math.imul(hash ^ px[i], 16777619) >>> 0;   // the whole picture, as one number
          const box = [w, -1, h, -1], rim = [0, 0, 0, 0];
          for (let i = 0; i < px.length; i += 4) {
            const x = (i / 4) % w, y = Math.floor(i / 4 / w), rgb = px[i] + px[i + 1] + px[i + 2], a = px[i + 3];
            if (a > 250) solid++;
            else if (a < 5 && rgb > 12) {
              light++; sum += rgb; sx += x; if (rgb > 720) white++;
              if (x < box[0]) box[0] = x; if (x > box[1]) box[1] = x; if (y < box[2]) box[2] = y; if (y > box[3]) box[3] = y;
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
            }
            if (a === 0 && rgb === 0) empty++;
          }
          const size = (b) => ({ w: b[1] < 0 ? 0 : b[1] - b[0] + 1, h: b[3] < 0 ? 0 : b[3] - b[2] + 1, cx: (b[0] + b[1]) / 2, cy: (b[2] + b[3]) / 2 });
          // core: the box of the light at least half as bright as the brightest. (What the crystal left behind a moment ago is fainter.)
          let brightest = 0; const core = [w, -1, h, -1];
          for (let i = 0; i < px.length; i += 4) if (px[i + 3] < 5) { const rgb = px[i] + px[i + 1] + px[i + 2]; if (rgb > brightest) brightest = rgb; }
          for (let i = 0; i < px.length; i += 4) if (px[i + 3] < 5 && px[i] + px[i + 1] + px[i + 2] > 12 && px[i] + px[i + 1] + px[i + 2] >= brightest / 2) { const x = (i / 4) % w, y = Math.floor(i / 4 / w); if (x < core[0]) core[0] = x; if (x > core[1]) core[1] = x; if (y < core[2]) core[2] = y; if (y > core[3]) core[3] = y; }
          if (box[1] >= 0) {
            const tenth = (box[1] - box[0] + 1) / 10;
            for (let i = 0; i < px.length; i += 4) { const x = (i / 4) % w; if (px[i + 3] < 5 && px[i] + px[i + 1] + px[i + 2] > 12 && (x < box[0] + tenth || x > box[1] - tenth)) { rim[0] += px[i]; rim[1] += px[i + 1]; rim[2] += px[i + 2]; rim[3]++; } }
          }
          // How this picture differs from the last step's, for when a still picture is not still.
          const diff = { n: 0, max: 0 };
          if (last) for (let i = 0; i < px.length; i++) { const d = Math.abs(px[i] - last[i]); if (d) { diff.n++; if (d > diff.max) diff.max = d; } }
          last = px;
          if (st.keep) window.__prismKept = px;
          // far: the furthest any corner of any of the three copies is drawn from the middle of the picture, across and up, where 1 is
          // its edge. From the corners as they stand and each mesh's own size, turn and place, through a camera made here where the
          // kit's is, with the Size slider at 100.
          const far = { x: 0, y: 0 };
          { const st0 = (window.__timbre.scene && window.__timbre.scene.state) || {}, at0 = window.__timbre.scene && window.__timbre.scene.camera;
            if (st0.copies && st0.corners && at0) { const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 100); cam.position.fromArray(at0); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
              const v = new THREE.Vector3(), qq = new THREE.Quaternion(), p0 = new THREE.Vector3();
              for (const c of st0.copies) { qq.fromArray(c.turned); p0.fromArray(c.at); for (let i = 0; i < st0.corners.length; i += 3) { v.set(st0.corners[i], st0.corners[i + 1], st0.corners[i + 2]).multiplyScalar(c.scale).applyQuaternion(qq).add(p0).project(cam); far.x = Math.max(far.x, Math.abs(v.x)); far.y = Math.max(far.y, Math.abs(v.y)); } } } }
          const versus = { n: -1, max: 0 };
          if (st.versus && window.__prismKept && window.__prismKept.length === px.length) { versus.n = 0; for (let i = 0; i < px.length; i++) { const d = Math.abs(px[i] - window.__prismKept[i]); if (d) { versus.n++; if (d > versus.max) versus.max = d; } } }
          const s = window.__timbre.scene, state = (s && s.state) || {};
          // Which way each facet faces, by three.js's own geometry and the crystal's turn: 1 straight at the camera, -1 straight away.
          const facing = [];
          if (state.q) { const g = new THREE.IcosahedronGeometry(1, 0), p = g.attributes.position, q = new THREE.Quaternion().fromArray(state.q), to = new THREE.Vector3().fromArray(state.sight).negate(), v = new THREE.Vector3();
            for (let fc = 0; fc < 20; fc++) { v.set(0, 0, 0); for (let c = 0; c < 3; c++) v.add(new THREE.Vector3().fromBufferAttribute(p, fc * 3 + c)); facing.push(v.normalize().applyQuaternion(q).dot(to)); } g.dispose(); }
          out.push({ state, solid, light, sum, edge, beats, white, facing, rim: rim[3] ? [rim[0] / rim[3], rim[1] / rim[3], rim[2] / rim[3]] : [0, 0, 0], empty: empty / (w * h), cornerAlpha: px[3], box: size(box), core: size(core), centroidX: light ? sx / light : 0, canvas: [w, h], hash, diff, versus, far, kitCam: s ? s.camera : null,
            expect: state.copies ? [getColor(state.colorT), getColor(state.colorT + 1), getColor(state.colorT + 2)] : null });
        }
        return out;
      } finally {
        frequencies = saved.frequencies; micActive = saved.micActive; cfgIdleAnim = saved.cfgIdleAnim; cfgColorHue = saved.cfgColorHue; cfgColorSpeed = saved.cfgColorSpeed; cfgGain = saved.cfgGain; micPeak = saved.micPeak; waveform = saved.waveform;
        Object.assign(perViz[id], knobs0); TimbreScene.testLevel = null;
      }
    }, { id: PRISM, steps, fps, knobs, hue, colorSpeed, gain });
    const top = (a) => Math.max(...a);
    const gap = (a, b) => top(a.map((v, i) => Math.abs(v - b[i])));
    const close = (a, b) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 2);
    const long = (v) => Math.hypot(...v);
    // A picture is as the last one was. This GPU draws the very same scene in one of two ways, two pixels apart by one
    // step, and changes between them of its own accord (twelve runs of a scene whose every number was fixed showed it
    // at any moment, seconds after anything had moved), so a pixel-for-pixel test fails one run in four.
    const same = (r) => r.diff.n <= 8 && r.diff.max <= 1;
    const dot4 = (a, b) => Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
    // How far a turn is from another, in radians (from none at all, by default).
    const turned = (q, from = [0, 0, 0, 1]) => 2 * Math.acos(Math.min(1, dot4(q, from)));
    const apartOf = (high, kick, chroma = 50) => (0.018 + 0.1 * high + 0.08 * kick) * chroma / 50;
    // A run's three copies are where its `apart` puts them: the middle one as the crystal is, the others
    // smaller and larger, rolled about the line of sight and moved along the camera's right.
    // The axis a copy has been rolled about, from its own turn and the crystal's: (its turn) times (the crystal's, undone).
    const rollAxis = (c, q) => { const [ax, ay, az, aw] = c, bx = -q[0], by = -q[1], bz = -q[2], bw = q[3], v = [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw]; return v.map((x) => x / (long(v) || 1)); };
    const placed = (r) => { const a = r.state.apart, c = r.state.copies, q = r.state.q, by = r.state.size * r.state.zoom; return turned(c[1].turned, q) < 1e-6 && c[1].scale === by && long(c[1].at) === 0 && Math.abs(long(r.state.sight) - 1) < 1e-9
      && Math.abs(r.state.sight[0] * r.state.right[0] + r.state.sight[1] * r.state.right[1] + r.state.sight[2] * r.state.right[2]) < 1e-9
      && [0, 2].every((i) => { const off = (i - 1) * a; return Math.abs(c[i].scale - (1 + off) * by) < 1e-9 && gap(c[i].at, r.state.right.map((v) => v * 0.5 * off * r.state.zoom)) < 1e-9 && Math.abs(turned(c[i].turned, q) - 0.9 * a) < 1e-6
        && (a < 1e-4 || gap(rollAxis(c[i].turned, q).map((v) => v * Math.sign(off)), r.state.sight) < 1e-4); }); };
    const like = (a, b) => (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (long(a) * long(b) || 1);
    const talk = [{ level: 0.8, all: 0.8, secs: 3 }];
    // The threshold is 60% of what the scene gives after 3 s at a steady 0.8 with every band sounding: about
    // 127,000 pixels of light.
    const PRISM_LIGHT = 76000;
    // How like the third palette colour the light at the rim must be (1 is the same hue).
    const RIM = 0.95;
    // How much of its own box the crystal's light fills: whole, at least this much; in pieces, at most that. Measured.
    const PRISM_WHOLE = 0.5, PRISM_APART = 0.4;
    // How far the furthest facet is moved by a jostle a twentieth of a second on: measured, and held to a seventh either way. (A blast's strength would move it 1.75 times as far.)
    const JOSTLED = [0.1, 0.135];
    // How much further the crystal reaches a quarter of a second after a blast during the return: measured, and held to a seventh either way.
    const REBLOWN = [0.43, 0.575];
    // How far apart a shatter may be at 30 and at 60 frames a second, two seconds on. Measured: the same to fifteen places.
    const FPS_SHOWN = 1e-9, FPS_TURNED = 1e-9, FPS_ZOOM = 1e-9;
    // How much light the crystal gives on the small page in a pause, all told: between what whole ridges and dashed ones give.
    const SMALL_LIT = 290000;
    // How much light the crystal gives in a pause, all told: measured, and held to a tenth either way.
    const HUSH_SUM = 13900000;
    // The most light a loud beat may leave on the picture, all told: a crystal whose light lingers smears into a blob with far more.
    const SMEAR_MAX = 50000000;

    await activate(PRISM);
    const prismState = await sceneState();
    const [loud] = await prismRun(talk);
    const [hush] = await prismRun([{ level: 0, secs: 2 }]);
    check('glass-prism is a kit scene: light only, with nothing solid, a transparent corner and no light at the edge',
      !!prismState && prismState.active === true && prismState.targetSize[0] === 1728 && loud.light > PRISM_LIGHT && loud.solid === 0 && hush.solid === 0 && loud.cornerAlpha === 0 && loud.edge === 0 && loud.empty > 0.4
        && loud.state.copies.length === 3 && loud.state.copies.every((c) => c.light === true),
      JSON.stringify({ size: prismState && prismState.targetSize, light: [loud.light, hush.light], sum: [loud.sum, hush.sum], solid: loud.solid, corner: loud.cornerAlpha, edge: loud.edge, empty: loud.empty, box: [loud.box, hush.box] }));
    check('glass-prism: in a pause the crystal sits in the middle of the frame, dim, its colours all but together', hush.state.flame === 0 && hush.state.kick === 0 && Math.abs(hush.state.apart - 0.018) < 1e-6 && Math.abs(hush.state.bright - 0.26) < 1e-9 && hush.state.bands.every((b) => b === 0)
      && Math.abs(hush.box.cx - hush.canvas[0] / 2) < 0.05 * hush.canvas[0] && Math.abs(hush.box.cy - hush.canvas[1] / 2) < 0.08 * hush.canvas[1] && hush.box.h > 0.45 * hush.canvas[1] && hush.box.h < 0.9 * hush.canvas[1] && hush.light > 0.2 * PRISM_LIGHT && placed(hush) && Math.abs(hush.sum - HUSH_SUM) < 0.1 * HUSH_SUM,
      JSON.stringify({ apart: hush.state.apart, bright: hush.state.bright, box: hush.box, canvas: hush.canvas, light: hush.light, sum: hush.sum }));
    check('glass-prism: with every band sounding it is far brighter, and its colours are further apart', loud.state.bands.every((b) => b > 0.7) && Math.abs(loud.state.high - loud.state.bands.slice(5).reduce((a, b) => a + b, 0) / 5) < 1e-6
      && Math.abs(loud.state.apart - apartOf(loud.state.high, loud.state.kick)) < 0.002 && loud.state.apart > 3 * hush.state.apart && loud.sum > 2 * hush.sum && loud.box.w > hush.box.w && placed(loud),
      JSON.stringify({ bands: loud.state.bands, high: loud.state.high, apart: [hush.state.apart, loud.state.apart], sum: [hush.sum, loud.sum], box: [hush.box.w, loud.box.w] }));

    // A band and its facets.
    const [none] = await prismRun([{ level: 0.6, secs: 1.5 }], { gain: 1 });
    const [third] = await prismRun([{ level: 0.6, bins: [[2, 1]], secs: 1.5 }], { gain: 1 });
    // The crystal is turned the same way in each of these runs. A band whose two facets both face away, and one with a facet full on.
    let turnedAt = null, hidden, shown;
    for (const secs of [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]) {
      const [r] = await prismRun([{ level: 0.6, secs }], { gain: 1 }), faces = (b) => Math.max(r.facing[b], r.facing[b + 10]), all = [0, 1, 2, 3, 4];   // (a low band: a high one would also pull the colours apart)
      hidden = all.find((b) => faces(b) < -0.15); shown = all.find((b) => faces(b) > 0.6);
      if (hidden !== undefined && shown !== undefined) { turnedAt = { secs, r }; break; }
    }
    const awayRun = turnedAt ? await prismRun([{ level: 0.6, bins: [[hidden, 1]], secs: turnedAt.secs }], { gain: 1 }) : [null], towardRun = turnedAt ? await prismRun([{ level: 0.6, bins: [[shown, 1]], secs: turnedAt.secs }], { gain: 1 }) : [null];
    const away = awayRun[0], toward = towardRun[0], plainRun = turnedAt && turnedAt.r;
    check('glass-prism: a band lights its own two facets where they face the viewer, and nothing where they face away', !!turnedAt && gap(away.state.q, plainRun.state.q) === 0 && away.state.bands[hidden] > 0.99 && toward.state.bands[shown] > 0.99
      && Math.abs(away.sum - plainRun.sum) <= 0.002 * plainRun.sum && toward.sum > 1.02 * plainRun.sum && plainRun.facing.length === 20 && Math.max(...plainRun.facing.map(Math.abs)) <= 1 + 1e-9,
      JSON.stringify(turnedAt ? { secs: turnedAt.secs, hidden, shown, faces: [[plainRun.facing[hidden], plainRun.facing[hidden + 10]], [plainRun.facing[shown], plainRun.facing[shown + 10]]], sum: [plainRun.sum, away.sum, toward.sum] } : { found: false }));
    const [beyond] = await prismRun([{ level: 0.6, bins: [[12, 1]], secs: 1.5 }], { gain: 1 });
    check('glass-prism: a band lights its own facets, and no other band\'s', Math.abs(third.state.bands[2] - 1) < 1e-6 && third.state.bands.every((b, i) => i === 2 || b === 0) && gap(third.state.given, third.state.bands) === 0 && third.state.given.length === 10
      && third.sum > 1.02 * none.sum && third.state.high === 0, JSON.stringify({ bands: third.state.bands, given: third.state.given, sum: [none.sum, third.sum] }));
    check('glass-prism: only the ten lowest bins are heard', beyond.state.bands.every((b) => b === 0) && Math.abs(beyond.sum - none.sum) <= 0.001 * none.sum && beyond.light === none.light,
      JSON.stringify({ bands: beyond.state.bands, sum: [none.sum, beyond.sum], light: [none.light, beyond.light] }));
    const [risen, fallen] = await prismRun([{ level: 0.6, bins: [[2, 1]], secs: 0.1 }, { level: 0.6, secs: 0.5 }], { gain: 1 });
    check('glass-prism: a band is followed, quick up and slower down', Math.abs(risen.state.bands[2] - (1 - Math.exp(-2))) < 1e-5 && Math.abs(fallen.state.bands[2] - (1 - Math.exp(-2)) * Math.exp(-2.5)) < 1e-5 && risen.state.bands[3] === 0,
      JSON.stringify({ bands: [risen.state.bands[2], fallen.state.bands[2]] }));
    const quiet = [{ level: 0.6, bins: [[2, 0.4]], secs: 1.5 }];
    const [plain] = await prismRun(quiet, { gain: 1 }), [boosted] = await prismRun(quiet, { gain: 2 });
    check('glass-prism: Gain scales how loud a band is', Math.abs(plain.state.bands[2] - 0.4) < 0.005 && Math.abs(boosted.state.bands[2] - 0.8) < 0.005 && boosted.sum > plain.sum,
      JSON.stringify({ bands: [plain.state.bands[2], boosted.state.bands[2]], sum: [plain.sum, boosted.sum] }));

    // The colours coming apart.
    const lows = [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]], highs = [[5, 1], [6, 1], [7, 1], [8, 1], [9, 1]];
    const [low] = await prismRun([{ level: 0.6, bins: lows, secs: 2 }], { gain: 1 }), [high] = await prismRun([{ level: 0.6, bins: highs, secs: 2 }], { gain: 1 }), [parting] = await prismRun([{ level: 0.6, bins: highs, secs: 0.1 }], { gain: 1 });
    check('glass-prism: the colours do not jump apart, they follow', parting.state.high > 0.8 && parting.state.apart > 0.03 && parting.state.apart < 0.08 && placed(parting), JSON.stringify({ high: parting.state.high, apart: parting.state.apart }));
    check('glass-prism: the high end of the sound pulls its colours apart, and the low end does not', low.state.high === 0 && Math.abs(high.state.high - 1) < 1e-6 && Math.abs(low.state.apart - 0.018) < 1e-6 && Math.abs(high.state.apart - 0.118) < 1e-6
      && placed(low) && placed(high) && high.state.copies[2].scale > 1.11 && high.state.copies[0].scale < 0.89 && long(high.state.copies[2].at) > 0.05 && high.box.w > low.box.w + 20 && high.light > 1.1 * low.light,
      JSON.stringify({ high: [low.state.high, high.state.high], apart: [low.state.apart, high.state.apart], scale: high.state.copies.map((c) => c.scale), box: [low.box.w, high.box.w], light: [low.light, high.light] }));
    const [together] = await prismRun([{ level: 0.6, bins: highs, secs: 2 }], { gain: 1, knobs: { chroma: 0 } }), [wide2] = await prismRun([{ level: 0.6, bins: highs, secs: 2 }], { gain: 1, knobs: { chroma: 100 } });
    check('glass-prism: Chroma 0 keeps the three colours together; 100 takes them twice as far apart', together.state.apart === 0 && together.state.copies.every((c) => c.scale === 1 && long(c.at) === 0 && turned(c.turned, together.state.q) < 1e-6)
      && Math.abs(wide2.state.apart - 0.236) < 1e-6 && placed(wide2) && wide2.light > high.light && high.light > 1.2 * together.light && wide2.box.w > high.box.w,
      JSON.stringify({ apart: [together.state.apart, high.state.apart, wide2.state.apart], light: [together.light, high.light, wide2.light], box: [together.box.w, high.box.w, wide2.box.w] }));

    // The voice, the tumble and a beat.
    const [slowTurn] = await prismRun([{ level: 0, secs: 2 }]), [fastTurn] = await prismRun([{ level: 0.8, secs: 2 }]), [quick] = await prismRun([{ level: 0.8, secs: 0.05 }]);
    check('glass-prism: it turns slowly in silence and several times as fast with the voice, which also brightens it', Math.abs(turned(slowTurn.state.q) - 0.5) < 0.01 && turned(fastTurn.state.q) > 4 * turned(slowTurn.state.q) && Math.abs(fastTurn.state.flame - 0.8) < 0.01
      && Math.abs(fastTurn.state.bright - (0.26 + 0.2 * fastTurn.state.flame + 0.18 * fastTurn.state.kick)) < 1e-9 && fastTurn.state.copies.every((c) => c.bright === fastTurn.state.bright) && fastTurn.sum > 1.3 * slowTurn.sum
      && quick.state.flame > 0.02 && quick.state.flame < 0.7 && Math.abs(quick.state.bright - (0.26 + 0.2 * quick.state.flame + 0.18 * quick.state.kick)) < 1e-9 && fastTurn.state.heart.shown === true
      && Math.abs(fastTurn.state.heart.size - (1.8 + fastTurn.state.flame + 0.6 * fastTurn.state.kick)) < 1e-9 && Math.abs(slowTurn.state.heart.size - 1.8) < 1e-9 && top(fastTurn.state.heart.light) > 3 * top(slowTurn.state.heart.light),
      JSON.stringify({ turned: [turned(slowTurn.state.q), turned(fastTurn.state.q)], flame: fastTurn.state.flame, bright: [slowTurn.state.bright, fastTurn.state.bright], sum: [slowTurn.sum, fastTurn.sum], heart: [slowTurn.state.heart, fastTurn.state.heart] }));
    const beat = [{ level: 0.05, all: 0.5, secs: 1 }, { level: 0.9, all: 0.5, secs: 0.1 }, { level: 0.9, all: 0.5, secs: 2.5 }];
    const [calm, hit, after] = await prismRun(beat, { gain: 1 });
    const kick1 = [2.2 * Math.cos(2.4), 2.2 * Math.sin(4.08), 2.2 * Math.sin(2.4)];
    check('glass-prism: a beat kicks its tumble about a new axis, pulls its colours apart and brightens it, then lets go', calm.state.kicks === 0 && long(calm.state.spin) === 0 && hit.beats === 1 && hit.state.kicks === 1 && hit.state.kick > 0.5
      && long(hit.state.spin) > 0.7 * long(kick1) && long(hit.state.spin) <= long(kick1) && long(kick1) > 2.2 && gap(hit.state.spin.map((v) => v / long(hit.state.spin)), kick1.map((v) => v / long(kick1))) < 1e-9
      && hit.state.apart > calm.state.apart + 0.02 && hit.state.bright > calm.state.bright + 0.15 && Math.abs(hit.state.bright - (0.26 + 0.2 * hit.state.flame + 0.18 * hit.state.kick)) < 1e-9 && after.state.kicks >= 1 && after.state.kick < 0.001 && long(after.state.spin) < 0.05 && after.state.apart < hit.state.apart && hit.edge === 0 && placed(hit),
      JSON.stringify({ kicks: [calm.state.kicks, hit.state.kicks, after.state.kicks], beats: hit.beats, kick: [hit.state.kick, after.state.kick], spin: [hit.state.spin, after.state.spin], apart: [calm.state.apart, hit.state.apart, after.state.apart], bright: [calm.state.bright, hit.state.bright], speed: [long(kick1), long(hit.state.spin), long(after.state.spin)] }));
    const [, smear] = await prismRun([{ level: 0.05, all: 0.8, secs: 1 }, { level: 0.9, all: 0.8, secs: 0.6 }]);
    check('glass-prism: tumbling fast on a loud beat it is still a crystal, not a blob of white', smear.state.kicks >= 1 && smear.state.flame > 0.7 && smear.sum / (smear.state.size * smear.state.size) < SMEAR_MAX && smear.light > 0.5 * PRISM_LIGHT, JSON.stringify({ sum: smear.sum, atItsSize: smear.sum / (smear.state.size * smear.state.size), size: smear.state.size, light: smear.light, kicks: smear.state.kicks, flame: smear.state.flame }));
    const second = (await prismRun([...beat, { level: 0.05, all: 0.5, secs: 2 }, { level: 0.9, all: 0.5, secs: 0.1 }], { gain: 1 }))[4];
    // (The kit may hear more beats than one in a long loud stretch: whichever this is, its axis is that beat's own.)
    const nth = (n) => [Math.cos(2.4 * n), Math.sin(4.08 * n), Math.sin(2.4 * n)];
    check('glass-prism: the next beat kicks it about another axis', !!second && second.beats === 1 && second.state.kicks > 1 && gap(second.state.spin.map((v) => v / long(second.state.spin)), nth(second.state.kicks).map((v, _, a) => v / long(a))) < 1e-9
      && gap(nth(second.state.kicks).map((v, _, a) => v / long(a)), kick1.map((v) => v / long(kick1))) > 0.3,
      JSON.stringify(second && { kicks: second.state.kicks, spin: second.state.spin }));

    // The pulse: one beat (a tenth of a second of loudness), then quiet, so that the swing is that beat's alone.
    const swingAt = (t, push = 4) => { const a = 0.35 * 14, wd = 14 * Math.sqrt(1 - 0.35 * 0.35); return (push / wd) * Math.exp(-a * t) * Math.sin(wd * t); };
    const oneBeat = [{ level: 0.05, all: 0.5, secs: 1 }, { level: 0.9, all: 0.5, secs: 0.1 }, { level: 0.05, all: 0.5, secs: 0.3 }, { level: 0.05, all: 0.5, secs: 3 }];
    const [level0, swollen, drawnIn, rested] = await prismRun(oneBeat, { gain: 1 }), [, flat, flatIn] = await prismRun(oneBeat, { gain: 1, knobs: { pulse: 0 } }), [, hard] = await prismRun(oneBeat, { gain: 1, knobs: { pulse: 100 } });
    check('glass-prism: a beat swells it, then it draws in a little, then it is its own size again', level0.state.size === 1 && level0.state.swell === 0 && swollen.beats === 1 && Math.abs(swollen.state.size - (1 + swingAt(0.1))) < 1e-9 && swollen.state.size > 1.17
      && Math.abs(drawnIn.state.size - (1 + swingAt(0.4))) < 1e-9 && drawnIn.state.size < 0.97 && drawnIn.beats === 0 && rested.state.size === 1 && rested.state.swell === 0 && rested.state.zoom === 1 && [swollen, drawnIn, rested].every(placed)
      && swollen.state.copies[1].scale === swollen.state.size && swollen.state.room === 1 && swollen.edge === 0 && Math.abs(swollen.state.swell - swingAt(0.1)) < 1e-9 && Math.abs(drawnIn.state.swell - swingAt(0.4)) < 1e-9,
      JSON.stringify({ size: [level0.state.size, swollen.state.size, drawnIn.state.size, rested.state.size], want: [1 + swingAt(0.1), 1 + swingAt(0.4)], beats: [swollen.beats, drawnIn.beats] }));
    // A second beat fifteen frames after the first, read six frames on: the two swings, added.
    const pair = await prismRun([{ level: 0.05, all: 0.5, secs: 1 }, { level: 0.9, all: 0.5, secs: 0.1 }, { level: 0.05, all: 0.5, secs: 0.15 }, { level: 0.95, all: 0.5, secs: 0.05 }, { level: 0.05, all: 0.5, secs: 0.05 }], { gain: 1 });
    check('glass-prism: a beat while it is still swinging adds its push to the swing', pair[1].beats === 1 && pair[2].beats === 0 && pair[3].beats === 1 && pair[4].beats === 0 && Math.abs(pair[4].state.swell - (swingAt(0.35) + swingAt(0.1))) < 1e-9
      && Math.abs(swingAt(0.35)) > 0.03 && placed(pair[4]), JSON.stringify({ beats: pair.map((r) => r.beats), swell: pair[4].state.swell, want: swingAt(0.35) + swingAt(0.1), one: swingAt(0.1) }));
    // Pulse and Chroma both at 100, the high end loud: the swell is more than the picture has room for, so it is drawn smaller for as long as it
    // is swollen and no longer. (Held as the pieces' room is, it would sit a quarter small after every beat.)
    const [, tight, loose] = await prismRun([{ level: 0.05, all: 1, secs: 1 }, { level: 0.9, all: 1, secs: 0.1 }, { level: 0.05, all: 1, secs: 0.3 }], { knobs: { pulse: 100, chroma: 100 } });
    check('glass-prism: a swell too large for the picture is drawn smaller while it lasts, and not after', tight.state.size > 1.3 && tight.state.room < 0.95 && tight.state.zoom === tight.state.room && tight.state.held === 1 && tight.far.y <= 0.99 && tight.far.x <= 0.99 && tight.far.y > 0.75 && tight.far.y > loose.far.y + 0.03
      && loose.state.size < 1 && loose.state.room === 1 && loose.state.zoom === 1 && loose.state.held === 1 && placed(tight) && placed(loose),
      JSON.stringify({ size: [tight.state.size, loose.state.size], room: [tight.state.room, loose.state.room], zoom: [tight.state.zoom, loose.state.zoom], held: [tight.state.held, loose.state.held], far: [tight.far, loose.far] }));
    check('glass-prism: in the picture it is larger on the beat and smaller after, by the Pulse setting: not at all at 0, twice as hard at 100', flat.state.size === 1 && flatIn.state.size === 1 && flat.beats === 1 && swollen.box.h > 1.1 * flat.box.h && swollen.box.w > 1.1 * flat.box.w
      && drawnIn.core.h < 0.985 * flatIn.core.h && drawnIn.core.w < 0.985 * flatIn.core.w && Math.abs(hard.state.size - (1 + swingAt(0.1, 8))) < 1e-9 && hard.box.h > 1.1 * swollen.box.h && hard.edge === 0 && hard.far.y <= 0.99 && hard.far.y > swollen.far.y + 0.05 && swollen.far.y > flat.far.y + 0.05 && flat.far.y > 0.55 && flat.far.y < 0.75 && placed(hard) && placed(flat),
      JSON.stringify({ box: [flat.box, swollen.box, hard.box], core: [flatIn.core, drawnIn.core], size: [flat.state.size, swollen.state.size, hard.state.size] }));

    // The shatter: a hard peak on the mic, then calm.
    const hum = { level: 0.3, all: 0.4 }, same3 = (a, b) => a.length === b.length && gap(a, b) === 0;
    // How much of its own box the light fills: a whole crystal most of it, twenty facets apart far less.
    const fill = (r) => r.light / (r.box.w * r.box.h || 1);
    const units = (a) => { for (let i = 0; i < a.length; i += 3) if (Math.abs(Math.hypot(a[i], a[i + 1], a[i + 2]) - 1) > 1e-9) return false; return a.length === 60; };
    const [before, struck, flying, hanging] = await prismRun([{ ...hum, secs: 1 }, { ...hum, secs: 0.05, peak: 1 }, { ...hum, secs: 0.45 }, { ...hum, secs: 1 }], { gain: 1 });
    check('glass-prism: until a peak it is whole', before.state.phase === 'whole' && before.state.shatters === 0 && before.state.reach === 1.3 && before.state.zoom === 1 && before.state.flash === 0 && same3(before.state.corners, before.state.wholeCorners)
      && before.state.corners.length === 180 && before.state.shards.shown.every((v) => v === 0), JSON.stringify({ phase: before.state.phase, reach: before.state.reach, zoom: before.state.zoom }));
    check('glass-prism: a hard peak on the mic shatters it, in a flash', struck.state.phase === 'pieces' && struck.state.shatters === 1 && struck.state.flash > 0.7 && struck.state.flash < 1 && Math.abs(struck.state.bright - (0.26 + 0.2 * struck.state.flame + 0.18 * struck.state.kick + 0.25 * struck.state.flash)) < 1e-9
      && struck.state.reach > 1.4 && !same3(struck.state.corners, struck.state.wholeCorners) && struck.sum > 1.2 * before.sum && Math.abs(struck.state.heart.size - (1.8 + struck.state.flame + 0.6 * struck.state.kick + 0.5 * struck.state.flash) * struck.state.zoom) < 1e-9,
      JSON.stringify({ phase: struck.state.phase, flash: struck.state.flash, reach: struck.state.reach, zoom: struck.state.zoom, sum: [before.sum, struck.sum] }));
    check('glass-prism: its facets fly apart, and it is drawn smaller so that all of them stay in the picture', flying.state.phase === 'pieces' && flying.state.reach > 3 && flying.state.zoom < 0.6 && flying.state.zoom <= flying.state.room && flying.state.room < 0.6
      && flying.state.zoom * (flying.state.reach * flying.state.size * (1 + flying.state.apart) + 0.5 * flying.state.apart) <= 2 + 1e-9 && flying.edge === 0 && hanging.edge === 0 && flying.solid === 0 && placed(flying) && placed(hanging)
      && units(flying.state.shards.axis) && Math.max(...flying.state.shards.turned.map(Math.abs)) > 0.5 && flying.state.uploads[0] > before.state.uploads[0] + 20 && flying.state.uploads[1] > before.state.uploads[1] + 20
      && hanging.state.uploads[0] > flying.state.uploads[0] + 50 && hanging.state.uploads[1] > flying.state.uploads[1] + 50
      && hanging.state.phase === 'pieces' && hanging.state.reach >= flying.state.reach && hanging.state.jostles === 0 && hanging.state.flash < 0.01 && [flying, hanging].every((r) => r.far.y <= 0.99 && r.far.x <= 0.99 && r.far.y > 0.7) && before.far.y < 0.75 && flying.state.zoom === flying.state.held && flying.state.limit === 2,
      JSON.stringify({ phase: flying.state.phase, reach: [flying.state.reach, hanging.state.reach], zoom: [flying.state.zoom, hanging.state.zoom], room: flying.state.room, edge: [flying.edge, hanging.edge], far: [before.far, flying.far, hanging.far] }));
    // The first shatter again, made here: its blast (strength 1, outward, the first shatter's own numbers) and the thirty steps since.
    const flown = await wide.evaluate(({ corners, steps }) => steps.map((n) => { const P = TimbreGlassPrism, sh = P.createShards(); P.blast(sh, P.layout(corners).normals, 1, TimbreHelix.rng(1001), true, true); for (let i = 0; i < n; i++) P.fly(sh, 1 / 60); return { shown: Array.from(sh.shown), turned: Array.from(sh.turned), axis: Array.from(sh.axis) }; }), { corners: flying.state.wholeCorners, steps: [29, 30, 31] });
    check('glass-prism: in flight each facet is exactly where the arithmetic puts it', gap(flying.state.shards.shown, flown[1].shown) < 1e-9 && gap(flying.state.shards.turned, flown[1].turned) < 1e-9 && gap(flying.state.shards.axis, flown[1].axis) < 1e-12
      && gap(flying.state.shards.shown, flown[0].shown) > 1e-4 && gap(flying.state.shards.shown, flown[2].shown) > 1e-4, JSON.stringify({ off: flown.map((f) => gap(flying.state.shards.shown, f.shown)), turned: gap(flying.state.shards.turned, flown[1].turned) }));
    check('glass-prism: in the picture, the pieces are apart: the light fills far less of its box, and the box is larger', fill(before) > PRISM_WHOLE && fill(hanging) < PRISM_APART && hanging.box.h > 1.1 * before.box.h && hanging.box.w > 1.1 * before.box.w && hanging.light > 0.1 * before.light,
      JSON.stringify({ fill: [fill(before), fill(flying), fill(hanging)], box: [before.box, flying.box, hanging.box], light: [before.light, flying.light, hanging.light] }));

    // Coming back: after Reconnect seconds of calm, a second and a half of return.
    const mend = [{ ...hum, secs: 1 }, { ...hum, secs: 0.05, peak: 1 }, { ...hum, secs: 0.85 }, { ...hum, secs: 0.6 }, { ...hum, secs: 0.6 }, { ...hum, secs: 0.6 }, { ...hum, secs: 0.3 }, { ...hum, secs: 4 }];
    const [mend0, , waiting, coming, nearer, healed, healedOn, long1] = await prismRun(mend, { gain: 1, knobs: { reconnectSeconds: 1 } }), [, , , stay3] = await prismRun(mend.slice(0, 4), { gain: 1, knobs: { reconnectSeconds: 3 } });
    // The return began 60 or 61 frames after the peak (a second of calm), and this is read 87 after it: 26 or 27 frames of a return of 90.
    const onTheWay = await wide.evaluate(({ sh }) => [25, 26, 27, 28].map((n) => { let worst = 0; for (let i = 0; i < 20; i++) { const left = 1 - TimbreHelix.returnShare(n / 90, sh.lag[i]).e;
      for (let a = 0; a < 3; a++) worst = Math.max(worst, Math.abs(sh.shown[i * 3 + a] - sh.from[i * 3 + a] * left)); worst = Math.max(worst, Math.abs(sh.turned[i] - sh.fromAng[i] * left)); } return worst; }), { sh: coming.state.shards });
    check('glass-prism: on its way home each facet is exactly where its share of the way puts it, in step with the machine', Math.min(onTheWay[1], onTheWay[2]) < 1e-9 && onTheWay[0] > 1e-4 && onTheWay[3] > 1e-4 && Math.max(...coming.state.shards.from.map(Math.abs)) > 0.8,
      JSON.stringify({ off: onTheWay }));
    check('glass-prism: after Reconnect seconds of calm the facets come home, the short way and each in its own time', waiting.state.phase === 'pieces' && coming.state.phase === 'returning' && nearer.state.phase === 'returning' && stay3.state.phase === 'pieces'
      && coming.state.reach < waiting.state.reach && nearer.state.reach < coming.state.reach && nearer.state.zoom > coming.state.zoom && coming.state.zoom <= coming.state.room && coming.edge === 0 && nearer.edge === 0
      && coming.state.shards.turned.every((v) => Math.abs(v) <= Math.PI) && Math.max(...coming.state.shards.lag) - Math.min(...coming.state.shards.lag) > 0.15 && placed(coming),
      JSON.stringify({ phase: [waiting.state.phase, coming.state.phase, nearer.state.phase, stay3.state.phase], reach: [waiting.state.reach, coming.state.reach, nearer.state.reach], zoom: [coming.state.zoom, nearer.state.zoom] }));
    check('glass-prism: home, it is the crystal it was, corner for corner, with a flash, and grows back to its size', healed.state.phase === 'whole' && same3(healed.state.corners, healed.state.wholeCorners) && same3(healed.state.faces, before.state.faces) && healed.state.reach === 1.3
      && healed.state.shards.shown.every((v) => v === 0) && healed.state.shards.turned.every((v) => v === 0) && healed.state.flash > 0.05 && healed.state.flash < 0.55 && healed.state.zoom > nearer.state.zoom && healed.state.zoom < 1 && healed.state.room === 1
      && healed.state.zoom === healed.state.held && Math.abs((1 - healedOn.state.held) - (1 - healed.state.held) * Math.exp(-0.6)) < 1e-9 && healedOn.state.zoom === healedOn.state.held
      && [waiting, coming, nearer, healed, long1].every((r) => r.state.uploads[1] - r.state.uploads[0] === mend0.state.uploads[1] - mend0.state.uploads[0]) && healed.state.uploads[1] > nearer.state.uploads[1] && long1.state.uploads[0] === healed.state.uploads[0]
      && long1.state.zoom === 1 && long1.state.flash === 0 && long1.state.phase === 'whole' && long1.state.shatters === 1 && Math.abs(fill(long1) - fill(before)) < 0.1 && placed(long1) && long1.state.copies[1].scale === long1.state.size,
      JSON.stringify({ phase: [healed.state.phase, long1.state.phase], flash: [healed.state.flash, long1.state.flash], zoom: [nearer.state.zoom, healed.state.zoom, healedOn.state.zoom, long1.state.zoom], held: [healed.state.held, healedOn.state.held], uploads: [nearer.state.uploads, healed.state.uploads, long1.state.uploads], fill: [fill(before), fill(long1)] }));

    // A second shatter, once it is whole again.
    const twice = await prismRun([{ ...hum, secs: 1 }, { ...hum, secs: 0.05, peak: 1 }, { ...hum, secs: 0.45 }, { ...hum, secs: 3.5 }, { ...hum, secs: 0.05, peak: 1 }, { ...hum, secs: 0.45 }, { ...hum, secs: 1.2 }], { gain: 1, knobs: { reconnectSeconds: 1 } });
    check('glass-prism: the next shatter is another, and it too comes home in its own time', twice[2].state.phase === 'pieces' && twice[2].state.shatters === 1 && twice[3].state.phase === 'whole' && twice[5].state.phase === 'pieces' && twice[5].state.shatters === 2
      && units(twice[5].state.shards.axis) && gap(twice[5].state.shards.axis, twice[2].state.shards.axis) > 0.3 && gap(twice[5].state.shards.shown, twice[2].state.shards.shown) > 0.3 && twice[6].state.phase === 'returning' && twice[6].state.reach > 1.5 && twice[6].state.reach < twice[5].state.reach,
      JSON.stringify({ phase: twice.map((r) => r.state.phase), shatters: twice.map((r) => r.state.shatters), reach: [twice[5].state.reach, twice[6].state.reach] }));
    // The page stops drawing for three seconds (the source hidden) while it is in pieces.
    const skippedRun = await prismRun([{ ...hum, secs: 1 }, { ...hum, secs: 0.05, peak: 1 }, { ...hum, secs: 0.5 }, { ...hum, secs: 0.1, gap: 3000 }, { ...hum, secs: 0.5 }], { gain: 1 }), skippedOn = skippedRun[4], skipped = skippedRun[3];
    check('glass-prism: when the page has not drawn for a while it is whole again at once, without a flash', skipped.state.phase === 'whole' && skipped.state.shatters === 1 && same3(skipped.state.corners, skipped.state.wholeCorners) && skipped.state.shards.shown.every((v) => v === 0)
      && skipped.state.shards.turned.every((v) => v === 0) && skipped.state.flash === 0 && skipped.state.reach === 1.3 && skipped.state.zoom === 1 && placed(skipped) && skipped.state.copies[1].scale === skipped.state.size && fill(skippedOn) > PRISM_WHOLE && skippedOn.state.zoom === 1,
      JSON.stringify({ phase: skipped.state.phase, flash: skipped.state.flash, zoom: skipped.state.zoom, fill: [fill(skipped), fill(skippedOn)] }));
    // Where the capture gives no peak of its own, the wave's is taken.
    const heard = (wave) => prismRun([{ ...hum, secs: 1 }, { ...hum, secs: 0.05, wave }, { ...hum, secs: 0.3 }], { gain: 1 }).then((r) => r[2]);
    const heardLoud = await heard('loud'), heardFlat = await heard('flat');
    check('glass-prism: where the capture gives no peak, the peak of the wave is taken', heardLoud.state.phase === 'pieces' && heardLoud.state.shatters === 1 && heardFlat.state.phase === 'whole' && heardFlat.state.shatters === 0,
      JSON.stringify({ phase: [heardLoud.state.phase, heardFlat.state.phase] }));

    // What sets it off, and what does not.
    const strike = (peak, opts, more = {}) => prismRun([{ ...hum, secs: 1, ...more }, { ...hum, secs: 0.05, peak, ...more }, { ...hum, secs: 0.3, ...more }], opts).then((r) => r[2]);
    const soft = await strike(0.6, { gain: 1 }), keen = await strike(0.6, { gain: 1, knobs: { shatterSensitivity: 100 } }), never = await strike(1, { gain: 1, knobs: { shatterSensitivity: 0 } }), gained = await strike(0.6, { gain: 3 });
    const asleep = await strike(1, { gain: 1 }, { idle: true }), dark = await strike(1, { gain: 1 }, { off: true });
    check('glass-prism: Shatter sensitivity sets how hard a peak it takes (never, at 0), Gain does not, and it takes the mic', soft.state.phase === 'whole' && soft.state.shatters === 0 && keen.state.phase === 'pieces' && keen.state.shatters === 1 && never.state.phase === 'whole' && never.state.shatters === 0
      && gained.state.phase === 'whole' && asleep.state.phase === 'whole' && asleep.state.shatters === 0 && dark.state.phase === 'whole' && dark.state.shatters === 0 && same3(never.state.corners, never.state.wholeCorners),
      JSON.stringify({ phase: [soft.state.phase, keen.state.phase, never.state.phase, gained.state.phase, asleep.state.phase, dark.state.phase] }));
    // A peak while it is in pieces jostles them; one while they are coming home blows them out again.
    const [, , , jolted, backing, , again] = await prismRun([{ ...hum, secs: 1 }, { ...hum, secs: 0.05, peak: 1 }, { ...hum, secs: 0.7 }, { ...hum, secs: 0.05, peak: 1 }, { ...hum, secs: 1.3 }, { ...hum, secs: 0.05, peak: 1 }, { ...hum, secs: 0.2 }], { gain: 1, knobs: { reconnectSeconds: 1 } });
    const [, , , unjolted, calmBack] = await prismRun([{ ...hum, secs: 1 }, { ...hum, secs: 0.05, peak: 1 }, { ...hum, secs: 0.7 }, { ...hum, secs: 0.05 }, { ...hum, secs: 1.3 }], { gain: 1, knobs: { reconnectSeconds: 1 } });
    // One frame after a peak in the middle of the return, and the same frame without it: the facets are where the return had got to, not where they once flew to.
    const reSteps = (peak) => [{ ...hum, secs: 1 }, { ...hum, secs: 0.05, peak: 1 }, { ...hum, secs: 0.7 }, { ...hum, secs: 0.05 }, { ...hum, secs: 1.3 }, { ...hum, secs: 1 / 60, peak }];
    const blown = (await prismRun(reSteps(1), { gain: 1, knobs: { reconnectSeconds: 1 } }))[5], unblown = (await prismRun(reSteps(0), { gain: 1, knobs: { reconnectSeconds: 1 } }))[5];
    // What the jostle did to each facet, a twentieth of a second on: which way, against where it was, and how far.
    let jostledIn = 0, jostledFar = 0;
    for (let i = 0; i < 20; i++) { const a = jolted.state.shards.shown, b = unjolted.state.shards.shown, d = [a[i * 3] - b[i * 3], a[i * 3 + 1] - b[i * 3 + 1], a[i * 3 + 2] - b[i * 3 + 2]];
      if (d[0] * b[i * 3] + d[1] * b[i * 3 + 1] + d[2] * b[i * 3 + 2] < 0) jostledIn++; jostledFar = Math.max(jostledFar, long(d)); }
    // What the blast during the return did, a quarter of a second on: nearly every facet is further out than it was, and the crystal reaches further by a blast's worth.
    let blownOut = 0; const blownGrew = again.state.reach - backing.state.reach;
    for (let i = 0; i < 20; i++) { const a = again.state.shards.shown, b = backing.state.shards.shown; if (Math.hypot(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]) > Math.hypot(b[i * 3], b[i * 3 + 1], b[i * 3 + 2])) blownOut++; }
    check('glass-prism: a peak while they are coming home pushes the pieces outward, and by its own strength', blownOut >= 18 && blownGrew > REBLOWN[0] && blownGrew < REBLOWN[1], JSON.stringify({ outward: blownOut, grew: blownGrew }));
    check('glass-prism: a jostle pushes the pieces any way at all, some of them inward, and less hard than a blast', jostledIn >= 4 && jostledIn <= 16 && jostledFar > JOSTLED[0] && jostledFar < JOSTLED[1], JSON.stringify({ inward: jostledIn, furthest: jostledFar }));
    check('glass-prism: a peak while it is in pieces jostles them, and one while they are coming home blows them out again', jolted.state.jostles === 1 && jolted.state.phase === 'pieces' && unjolted.state.jostles === 0 && gap(jolted.state.shards.shown, unjolted.state.shards.shown) > 0.02
      && jolted.state.flash > unjolted.state.flash + 0.1 && calmBack.state.phase === 'returning' && backing.state.phase === 'returning' && again.state.jostles === 2 && again.state.phase === 'pieces' && again.state.shatters === 1
      && again.state.reach > backing.state.reach + 0.15 && again.far.y <= 0.99 && again.far.x <= 0.99 && again.state.flash > 0.1 && backing.state.flash < 0.01 && again.edge === 0 && blown.state.phase === 'pieces' && unblown.state.phase === 'returning' && gap(blown.state.shards.shown, unblown.state.shards.shown) < 0.25
      && gap(blown.state.shards.turned, unblown.state.shards.turned) < 0.25 && same3(blown.state.shards.axis, unblown.state.shards.axis) && units(blown.state.shards.axis)
      && same3(jolted.state.shards.axis, unjolted.state.shards.axis),
      JSON.stringify({ jostles: [jolted.state.jostles, unjolted.state.jostles, again.state.jostles], phase: [jolted.state.phase, calmBack.state.phase, again.state.phase], reach: [backing.state.reach, again.state.reach], flash: [backing.state.flash, again.state.flash], took: gap(blown.state.shards.shown, unblown.state.shards.shown), moved: gap(jolted.state.shards.shown, unjolted.state.shards.shown) }));
    // The worst the sound can do while it is in pieces: beats one after another, Pulse and Chroma at 100, the camera as far round as it goes.
    const din = { level: 0.05, all: 1 }, loudly = { level: 0.95, all: 1 };
    const worst = await prismRun([{ ...din, secs: 1 }, { ...loudly, secs: 0.05, peak: 1 }, { ...loudly, secs: 0.2 }, { ...din, secs: 0.2 }, { ...loudly, secs: 0.15 }, { ...din, secs: 0.3 }, { ...loudly, secs: 0.1 }, { ...din, secs: 0.6 }], { knobs: { pulse: 100, chroma: 100, cameraDrift: 100 } });
    check('glass-prism: in pieces, with beats, Pulse and Chroma at 100 and the camera far round, nothing reaches the edge of the picture', worst.slice(1).every((r) => r.state.phase === 'pieces' && r.edge === 0 && r.solid === 0 && r.state.zoom <= r.state.room && placed(r) && r.state.zoom * (r.state.reach * r.state.size * (1 + r.state.apart) + 0.5 * r.state.apart) <= 2 + 1e-9)
      && worst.every((r) => r.far.y <= 0.99 && r.far.x <= 0.99) && Math.max(...worst.map((r) => r.far.y)) > 0.8 && Math.max(...worst.map((r) => r.state.apart)) > 0.2
      && worst[7].state.kicks >= 3 && Math.max(...worst.map((r) => r.state.size)) > 1.2 && Math.min(...worst.map((r) => r.state.zoom)) < 0.4 && Math.max(...worst.map((r) => r.box.h)) > 0.7 * worst[0].canvas[1],
      JSON.stringify(worst.map((r) => ({ phase: r.state.phase, edge: r.edge, size: r.state.size, zoom: r.state.zoom, boxH: r.box.h, kicks: r.state.kicks, far: r.far }))));
    // The same shatter at 30 and 60 frames a second (in silence, so that no beat falls on another frame).
    const quietCrack = [{ level: 0, secs: 1 }, { level: 0, secs: 0.1, peak: 1 }, { level: 0, secs: 1.9 }];
    const [, , s30] = await prismRun(quietCrack, { fps: 30 }), [, , s60] = await prismRun(quietCrack, { fps: 60 }), [, , sAgain] = await prismRun(quietCrack, { fps: 60 });
    check('glass-prism: the same peak gives the same shatter at 30 and 60 fps, and the same again the next time', s30.state.phase === 'pieces' && s60.state.phase === 'pieces' && gap(s30.state.shards.shown, s60.state.shards.shown) < FPS_SHOWN && gap(s30.state.shards.turned, s60.state.shards.turned) < FPS_TURNED
      && same3(s30.state.shards.axis, s60.state.shards.axis) && Math.abs(s30.state.zoom - s60.state.zoom) < FPS_ZOOM && same3(sAgain.state.shards.shown, s60.state.shards.shown) && Math.max(...s60.state.shards.shown.map(Math.abs)) > 0.8,
      JSON.stringify({ shown: gap(s30.state.shards.shown, s60.state.shards.shown), turned: gap(s30.state.shards.turned, s60.state.shards.turned), zoom: [s30.state.zoom, s60.state.zoom] }));
    // Muted while it is in pieces: the facets still come home, and then nothing moves.
    const lifeOf = (peak, last) => [{ ...hum, secs: 1 }, { ...hum, secs: 0.05, peak }, { ...hum, secs: 0.5 }, { level: null, off: true, secs: 8 }, { level: null, off: true, secs: 1, ...last }];
    const [, , , , unbroken] = await prismRun(lifeOf(0, { keep: true }), { knobs: { cameraDrift: 0, reconnectSeconds: 1 }, colorSpeed: 0 });
    const [, , apartNow, mutedHome, mutedStill] = await prismRun(lifeOf(1, { versus: true }), { knobs: { cameraDrift: 0, reconnectSeconds: 1 }, colorSpeed: 0 });
    check('glass-prism: muted while it is in pieces, it still comes home, and then the picture holds still', apartNow.state.phase === 'pieces' && mutedHome.state.phase === 'whole' && mutedHome.state.zoom === 1 && mutedHome.state.flash === 0 && mutedHome.state.size === 1
      && same3(mutedHome.state.corners, mutedHome.state.wholeCorners) && same(mutedStill) && mutedHome.diff.n > 1000 && unbroken.state.shatters === 0 && mutedStill.state.shatters === 1 && mutedStill.versus.n >= 0 && mutedStill.versus.n <= 8 && mutedStill.versus.max <= 1 && mutedStill.light > 0.2 * PRISM_LIGHT,
      JSON.stringify({ phase: [apartNow.state.phase, mutedHome.state.phase], zoom: mutedHome.state.zoom, differs: mutedStill.diff, fromOneThatNeverBroke: mutedStill.versus }));

    // Camera.
    const [still] = await prismRun(talk, { knobs: { cameraDrift: 0 } }), [drift] = await prismRun(talk, { knobs: { cameraDrift: 100 } });
    check('glass-prism: Camera drift 0 holds the camera still; 100 doubles the sway', still.state.orbit === 0 && Math.abs(loud.state.orbit) > 0.005 && Math.abs(drift.state.orbit - 2 * loud.state.orbit) < 1e-9
      && Math.abs(still.kitCam[0]) < 1e-6 && Math.abs(drift.kitCam[0]) > 1.5 * Math.abs(loud.kitCam[0]) && Math.abs(loud.kitCam[0]) > 0.05 && Math.abs(long(drift.state.right) - 1) < 1e-9 && Math.abs(drift.state.right[2]) > 0.01 && Math.abs(still.state.right[2]) < 1e-9,
      JSON.stringify({ orbit: [still.state.orbit, loud.state.orbit, drift.state.orbit], x: [still.kitCam[0], loud.kitCam[0], drift.kitCam[0]], right: [still.state.right, drift.state.right] }));

    // The same at any frame rate.
    const fpsSteps = [{ level: 0.05, all: 0.5, secs: 1 }, { level: 0.9, all: 0.8, secs: 1 }, { level: 0, all: 0, secs: 0.5 }];
    const [, , d30] = await prismRun(fpsSteps, { fps: 30 }), [, , d60] = await prismRun(fpsSteps, { fps: 60 });
    check('glass-prism: the same sound gives the same crystal at 30 and 60 fps', Math.abs(d30.state.clock - 2.5) < 1e-6 && Math.abs(d60.state.clock - 2.5) < 1e-6 && d30.state.kicks >= 1 && d60.state.kicks === d30.state.kicks && gap(d30.state.bands, d60.state.bands) < 1e-5
      && turned(d30.state.q, d60.state.q) < 0.05 && turned(d60.state.q) > 0.5 && Math.abs(d30.state.apart - d60.state.apart) < 0.005,
      JSON.stringify({ clock: [d30.state.clock, d60.state.clock], kicks: [d30.state.kicks, d60.state.kicks], bands: gap(d30.state.bands, d60.state.bands), between: turned(d30.state.q, d60.state.q), turned: turned(d60.state.q), apart: [d30.state.apart, d60.state.apart] }));

    // Mic off.
    const [idle1, idle2] = await prismRun([{ level: null, idle: true, secs: 3 }, { level: null, idle: true, secs: 1.5 }]);
    // The 120 steps of two seconds of silence, made here: each turns it about the axis as it is at the middle of the step (not at its end).
    const [replay, replayLate] = await wide.evaluate(() => [0.5, 0].map((back) => { const q = [0, 0, 0, 1], spin = [0, 0, 0], dt = 1 / 60; let clock = 0; for (let i = 0; i < 120; i++) { clock += dt; TimbreGlassPrism.tumble(q, spin, clock - back * dt, 0, dt); } return q; }));
    check('glass-prism: with the mic off and Idle animation on it tumbles slowly and its facets take turns', idle1.state.live === true && Math.abs(idle2.state.clock - 4.5) < 1e-6 && turned(idle2.state.q, idle1.state.q) > 0.2 && gap(idle1.state.bands, idle2.state.bands) > 0.1 && top(idle2.state.bands) > 0.3 && top(idle2.state.bands) < 0.61
      && idle2.state.kicks === 0, JSON.stringify({ clock: [idle1.state.clock, idle2.state.clock], turned: turned(idle2.state.q, idle1.state.q), bands: idle2.state.bands }));
    check('glass-prism: in silence its tumble is the arithmetic\'s own, step for step', gap(slowTurn.state.q, replay) < 1e-12 && gap(slowTurn.state.q, replayLate) > 1e-6, JSON.stringify({ replay: [gap(slowTurn.state.q, replay), gap(slowTurn.state.q, replayLate)] }));
    // Camera drift 0 and a palette that stands still, so that nothing but the scene could move the picture.
    const [off1, off2] = await prismRun([{ level: null, off: true, secs: 4 }, { level: null, off: true, secs: 1 }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    const [on1, on2] = await prismRun([{ level: null, idle: true, secs: 4 }, { level: null, idle: true, secs: 1 }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    check('glass-prism: with the mic and Idle animation off the picture holds still', same(off2) && on2.diff.n > 1000 && off2.light > 0.2 * PRISM_LIGHT && off2.state.live === false && off2.state.clock === 0 && turned(off2.state.q) === 0,
      JSON.stringify({ off: [off1.hash, off2.hash], idle: [on1.hash, on2.hash], light: off2.light, differs: off2.diff, numbers: [off1, off2].map((r) => [r.state.flame, r.state.kick, r.state.bright, r.state.apart, r.state.orbit, r.state.colorT, r.state.heart.size, r.sum]) }));
    // (Quiet and then loud, so that a beat has struck and its kick is still dying away when the mic goes.)
    const [, live1, muted1, muted2, muted3] = await prismRun([{ level: 0.05, all: 0.8, secs: 1.5 }, { level: 0.9, all: 0.8, secs: 0.5 }, { level: null, off: true, secs: 0.5 }, { level: null, off: true, secs: 7.5 }, { level: null, off: true, secs: 1 }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    check('glass-prism: muted in the middle of a stream, it stops turning where it is, dims, and then nothing moves', muted1.state.live === false && muted1.state.clock === live1.state.clock && muted2.state.clock === live1.state.clock && turned(live1.state.q) > 1
      && gap(muted1.state.q, live1.state.q) === 0 && gap(muted2.state.q, live1.state.q) === 0 && long(live1.state.spin) > 0.3 && live1.state.kick > 0.01 && muted1.state.kick > 0 && long(muted1.state.spin) === 0 && muted1.state.bands[0] > 0.01 && muted1.state.bands[0] < live1.state.bands[0]
      && muted1.state.swell !== 0 && muted2.state.swell === 0 && muted2.state.size === 1 && muted2.state.zoom === 1
      && muted2.state.bands.every((b) => b === 0) && muted2.state.flame === 0 && muted2.state.kick === 0 && muted2.state.bright === 0.26 && Math.abs(muted2.state.apart - 0.018) < 1e-12 && same(muted3) && muted2.diff.n > 1000,
      JSON.stringify({ clock: [live1.state.clock, muted1.state.clock, muted2.state.clock], bands: [live1.state.bands[0], muted1.state.bands[0], muted2.state.bands[0]], apart: muted2.state.apart, differs: muted3.diff }));

    // Colour.
    const [hued] = await prismRun(talk, { hue: 2 });
    check('glass-prism: its three copies are three palette colours, the glow inside the middle one, and the hue setting moves them', [0, 1, 2].every((c) => close(loud.state.copies[c].color, loud.expect[c])) && [0, 1, 2].every((c) => close(hued.state.copies[c].color, hued.expect[c]))
      && !close(hued.state.copies[0].color, loud.state.copies[0].color) && !close(loud.state.copies[0].color, loud.state.copies[1].color),
      JSON.stringify({ copies: loud.state.copies.map((c) => c.color), expect: loud.expect, hued: hued.state.copies[0].color }));

    // Far apart, the outer rim of the light is the largest copy alone: the third palette colour. And the glow inside is the second.
    const lin = (c) => c.map((v) => Math.pow(v / 255, 2.2));
    const [rimRun] = await prismRun([{ level: 0.6, bins: highs, secs: 2 }], { gain: 1, knobs: { chroma: 100 } }), [rimHued] = await prismRun([{ level: 0.6, bins: highs, secs: 2 }], { gain: 1, hue: 2, knobs: { chroma: 100 } });
    check('glass-prism: in the picture, the light at its outer rim is the third palette colour, and the hue setting moves it', [rimRun, rimHued].every((r) => like(r.rim, r.expect[2]) > RIM && like(r.rim, r.expect[2]) > like(r.rim, r.expect[0]) + 0.02 && like(r.rim, r.expect[2]) > like(r.rim, [1, 1, 1]) + 0.02)
      && like(rimRun.rim, rimHued.rim) < 0.97,
      JSON.stringify([rimRun, rimHued].map((r) => ({ rim: r.rim, expect: r.expect, like: [like(r.rim, r.expect[0]), like(r.rim, r.expect[1]), like(r.rim, r.expect[2]), like(r.rim, [1, 1, 1])] }))));
    check('glass-prism: the glow inside is the second palette colour', [loud, hued].every((r) => like(r.state.heart.light, lin(r.expect[1])) > 0.995 && like(r.state.heart.light, lin(r.expect[1])) > like(r.state.heart.light, lin(r.expect[0])) + 0.01),
      JSON.stringify([loud, hued].map((r) => ({ light: r.state.heart.light, expect: r.expect, like: [like(r.state.heart.light, lin(r.expect[0])), like(r.state.heart.light, lin(r.expect[1]))] }))));

    // Placement and cost.
    const [placed0] = await prismRun([{ level: 0.5, all: 0.5, secs: 1 }]);
    await pushConfig((c) => { c.activeViz = PRISM; c.placement.x = 30; });
    await wide.waitForTimeout(400);
    const [placed1] = await prismRun([{ level: 0.5, all: 0.5, secs: 1 }]);
    check('glass-prism: Scene placement slides it', placed1.centroidX - placed0.centroidX > 150 && placed1.light > 0.5 * placed0.light, `${placed0.centroidX.toFixed(0)} → ${placed1.centroidX.toFixed(0)}`);
    await pushConfig((c) => { c.activeViz = PRISM; c.placement.x = 0; c.placement.size = 50; });
    await wide.waitForTimeout(400);
    const [halved] = await prismRun([{ level: 0.5, all: 0.5, secs: 1 }]);
    // The small page draws into a picture several times taller than its canvas.
    const smallPrism = await page.evaluate(() => { currentViz.draw(performance.now(), 1 / 60); currentViz.draw(performance.now() + 17, 1 / 60); const s = window.__timbre.scene; return { name: window.__timbre.currentVizName, scale: s && s.renderScale, copies: s && s.state.copies ? s.state.copies.length : 0, drawnFor: s && s.state.drawnFor }; });
    // On the small page a ridge sized for the kit's larger picture would be half a page pixel wide and show in dashes:
    // far less of the page would be lit.
    const smallLit = await page.evaluate(() => { const fr = window.frame, heard = { frequencies, micActive, cfgColorSpeed, cfgColorHue, micPeak }; window.frame = function () {}; try { TimbreScene.testLevel = 0; frequencies = new Uint8Array(32); micActive = true; micPeak = 0; cfgColorSpeed = 0; cfgColorHue = 0; setActiveViz('visualizer'); setActiveViz('glass-prism'); let now = 100000; for (let i = 0; i < 120; i++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
      const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let lit = 0, sum = 0; for (let i = 0; i < px.length; i += 4) { const rgb = px[i] + px[i + 1] + px[i + 2]; if (px[i + 3] < 5 && rgb > 60) { lit++; sum += rgb; } } return { lit, sum, canvas: [w, h] }; } finally { TimbreScene.testLevel = null; window.frame = fr; frequencies = heard.frequencies; micActive = heard.micActive; cfgColorSpeed = heard.cfgColorSpeed; cfgColorHue = heard.cfgColorHue; micPeak = heard.micPeak; } });
    check('glass-prism: on the small page its ridges are whole lines', smallLit.sum > SMALL_LIT, JSON.stringify(smallLit));
    check('glass-prism: the Size slider halves it, and the small page draws it too', halved.box.w < 0.62 * placed0.box.w && halved.box.w > 0.38 * placed0.box.w && halved.solid === 0 && smallPrism.name === PRISM && smallPrism.scale >= 2 && smallPrism.copies === 3 && smallPrism.drawnFor === smallPrism.scale && loud.state.drawnFor === 1,
      JSON.stringify({ box: [placed0.box.w, halved.box.w], small: smallPrism }));
    // The Size slider at 140: the picture is enlarged, so the pieces must keep closer in.
    await pushConfig((c) => { c.activeViz = PRISM; c.placement.size = 140; });
    await wide.waitForTimeout(400);
    const [bigWhole, , bigFlying, bigHanging] = await prismRun([{ ...hum, secs: 1 }, { ...hum, secs: 0.05, peak: 1 }, { ...hum, secs: 0.45 }, { ...hum, secs: 1 }], { gain: 1 });
    const [, bigSwollen] = await prismRun(oneBeat, { gain: 1 });
    check('glass-prism: enlarged with the Size slider, its pieces still stay in the picture', bigWhole.state.zoom === 1 && bigWhole.far.y * 1.4 > 0.85 && bigWhole.far.y * 1.4 < 1 && Math.abs(bigFlying.state.limit - 2 / 1.4) < 1e-9
      && [bigFlying, bigHanging].every((r) => r.state.phase === 'pieces' && r.far.y * 1.4 <= 0.99 && r.far.x * 1.4 <= 0.99 && r.far.y * 1.4 > 0.7) && bigFlying.state.zoom < 0.75 * flying.state.zoom && bigFlying.state.zoom > 0.65 * flying.state.zoom && bigFlying.state.zoom === bigFlying.state.held
      && bigSwollen.state.size > 1.17 && bigSwollen.state.room < 0.95 && bigSwollen.state.zoom === bigSwollen.state.room && bigSwollen.state.held === 1 && bigSwollen.far.y * 1.4 <= 0.99 && bigSwollen.far.y * 1.4 > 0.85,
      JSON.stringify({ far: [bigWhole.far, bigFlying.far, bigHanging.far, bigSwollen.far].map((f) => [f.x * 1.4, f.y * 1.4]), limit: bigFlying.state.limit, zoom: [flying.state.zoom, bigFlying.state.zoom, bigSwollen.state.zoom], room: bigSwollen.state.room }));
    // The Size slider at 200: the crystal itself is more than the picture takes, which is the streamer's to choose. It is not drawn smaller for it, however far apart its colours.
    await pushConfig((c) => { c.activeViz = PRISM; c.placement.size = 200; });
    await wide.waitForTimeout(400);
    const [huge] = await prismRun([{ level: 0.6, bins: highs, secs: 2 }], { gain: 1, knobs: { chroma: 100 } });
    check('glass-prism: enlarged until it fills the picture, the whole crystal is not drawn smaller, however far apart its colours', huge.state.apart > 0.2 && huge.state.size === 1 && huge.state.zoom === 1 && huge.state.room === 1
      && Math.abs(huge.state.limit - (1.3 * (1 + huge.state.apart) + 0.5 * huge.state.apart)) < 1e-9 && huge.state.limit > 1.5 && placed(huge), JSON.stringify({ apart: huge.state.apart, limit: huge.state.limit, zoom: huge.state.zoom, room: huge.state.room }));
    await pushConfig((c) => { c.placement.size = 100; });
    await wide.waitForTimeout(300);
    await activate(PRISM);
    const prismCost = await wide.evaluate(() => { let now = performance.now(), acc = 0; for (let i = 0; i < 120; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); acc += performance.now() - t; } return acc / 120; });
    check(`glass-prism: draw() averages under 5 ms of script time (${prismCost.toFixed(2)} ms)`, prismCost < 5);

    }

    // ── The metaball (a kit scene: a ball of liquid metal and its droplets) ────
    {   // its own block: the names below are the metaball's own
    // Build the scene afresh, drive the level and the 32 bins by hand, and read the canvas and
    // the scene after each step. A step gives level (null: whatever the kit hears), secs, and
    // either all (every bin, 0..1) or bins ([[bin, 0..1], ...]); idle: true has the mic off,
    // off: true has the mic and Idle animation off.
    const BLOB = 'metaball';
    const blobRun = (steps, { fps = 60, knobs = null, hue = null, colorSpeed = null, gain = null } = {}) => wide.evaluate(({ id, steps, fps, knobs, hue, colorSpeed, gain }) => {
      window.frame = function () {};
      const saved = { frequencies, micActive, cfgIdleAnim, cfgColorHue, cfgColorSpeed, cfgGain }, knobs0 = Object.assign({}, perViz[id]);
      try {
        if (knobs) Object.assign(perViz[id], knobs);
        if (hue !== null) cfgColorHue = hue;
        if (colorSpeed !== null) cfgColorSpeed = colorSpeed;
        if (gain !== null) cfgGain = gain;
        TimbreScene.testLevel = 0;
        setActiveViz('visualizer'); setActiveViz(id);
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), f = new Uint8Array(32), out = [];
        let now = 100000 + 1000 / 120, last = null;
        for (const st of steps) {
          TimbreScene.testLevel = st.level;
          micActive = !st.idle && !st.off;
          cfgIdleAnim = st.off ? false : saved.cfgIdleAnim;
          if (st.knobs) Object.assign(perViz[id], st.knobs);
          f.fill(st.all !== undefined ? Math.round(st.all * 255) : 0);
          if (st.bins) for (const [i, v] of st.bins) f[i] = Math.round(v * 255);
          frequencies = f;
          for (let i = 0, n = Math.round(st.secs * fps); i < n; i++) { now += 1000 / fps; currentViz.draw(now, 1 / fps); }
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);   // row 0 is the bottom of the canvas
          // solid: the metal. soft: its edge, neither solid nor clear. light: light over the background, which
          // this scene should not make. sum: how bright the metal is in all. shine: pixels of white highlight.
          // tint: the mean colour of the metal.
          let solid = 0, soft = 0, light = 0, edge = 0, empty = 0, sum = 0, shine = 0, hash = 2166136261;
          for (let i = 0; i < px.length; i++) hash = Math.imul(hash ^ px[i], 16777619) >>> 0;   // the whole picture, as one number
          const solidBox = [w, -1, h, -1], tint = [0, 0, 0], softAt = [];
          for (let i = 0; i < px.length; i += 4) {
            const x = (i / 4) % w, y = Math.floor(i / 4 / w), rgb = px[i] + px[i + 1] + px[i + 2], a = px[i + 3];
            if (a > 250) {
              solid++; sum += rgb; if (rgb > 690) shine++;
              tint[0] += px[i]; tint[1] += px[i + 1]; tint[2] += px[i + 2];
              if (x < solidBox[0]) solidBox[0] = x; if (x > solidBox[1]) solidBox[1] = x; if (y < solidBox[2]) solidBox[2] = y; if (y > solidBox[3]) solidBox[3] = y;
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
            } else if (a >= 5) { soft++; softAt.push(i / 4); }
            else if (rgb > 12) light++;
            if (a === 0 && rgb === 0) empty++;
          }
          // The picture against the arithmetic (match: true; with the Scene placement sliders at rest). A ray is
          // sent from the camera through a pixel and TimbreMetaball.field() says how near the metal it passes, or
          // how deep it goes in. Two pixels clear of the metal must be clear, and two pixels deep must be solid.
          // Every fourth pixel each way is asked, and every pixel of the soft edge (a hole in the metal is soft).
          const against = { asked: 0, metal: 0, clear: 0, holes: 0, stray: 0 }, outline = { n: 0, sum: 0 };
          const sc = window.__timbre.scene;
          if (st.match && sc && sc.state.balls) {
            const cam = sc.camera, far = Math.hypot(cam[0], cam[1], cam[2]), fwd = cam.map((v) => -v / far), sl = Math.hypot(fwd[0], fwd[2]);
            const side = [-fwd[2] / sl, 0, fwd[0] / sl], up = [side[1] * fwd[2] - side[2] * fwd[1], side[2] * fwd[0] - side[0] * fwd[2], side[0] * fwd[1] - side[1] * fwd[0]];
            const th = Math.tan(15 * Math.PI / 180), balls = sc.state.balls, F = TimbreMetaball.field;
            const ask = (x, y) => {
              const nx = ((x + 0.5) / w * 2 - 1) * th * w / h, ny = ((y + 0.5) / h * 2 - 1) * th;
              let dx = fwd[0] + side[0] * nx + up[0] * ny, dy = fwd[1] + side[1] * nx + up[1] * ny, dz = fwd[2] + side[2] * nx + up[2] * ny;
              const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
              const one = 2 * th * far / h;   // a pixel, at the middle of the scene
              let t = far - 3.2, least = 9;
              for (let n = 0; n < 400 && t < far + 3.2; n++) {
                const v = F(cam[0] + dx * t, cam[1] + dy * t, cam[2] + dz * t, balls);
                if (v < least) least = v;
                t += Math.max(Math.abs(v) * 0.9, 0.004);   // on through the metal, to find how deep the ray goes
              }
              const a = px[(y * w + x) * 4 + 3];
              against.asked++;
              if (least < -2 * one) { against.metal++; if (a <= 250) against.holes++; }
              else if (least > 2 * one) { against.clear++; if (a >= 5) against.stray++; }
            };
            for (let y = 2; y < h; y += 4) for (let x = 2; x < w; x += 4) ask(x, y);
            for (const at of softAt) ask(at % w, Math.floor(at / w));
            // The outlines inside the blob: pixels of metal whose ray passed within a pixel of nearer metal (a droplet's
            // outline) on its way. Across such an outline the colour steps from one neighbour's to the opposite one's;
            // `between` is how far the pixel's own colour is from the nearer of the two, as a share of the step, and is
            // 0 where the outline is a hard step and up to a half where it is a blend. Its mean is `soft`.
            const apartOf = (i, j) => Math.abs(px[i] - px[j]) + Math.abs(px[i + 1] - px[j + 1]) + Math.abs(px[i + 2] - px[j + 2]);
            const grazes = (x, y) => {
              const nx = ((x + 0.5) / w * 2 - 1) * th * w / h, ny = ((y + 0.5) / h * 2 - 1) * th;
              let dx = fwd[0] + side[0] * nx + up[0] * ny, dy = fwd[1] + side[1] * nx + up[1] * ny, dz = fwd[2] + side[2] * nx + up[2] * ny;
              const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
              let t = far - 3.2, was = 9, graze = 9, tGraze = t;
              for (let n = 0; n < 600 && t < far + 3.2; n++) {
                const v = F(cam[0] + dx * t, cam[1] + dy * t, cam[2] + dz * t, balls);
                if (v < 1e-4) return graze < 2 * th * tGraze / h;      // met the metal: had it passed within a pixel of some before?
                if (v > was && was < graze) { graze = was; tGraze = t; }
                was = v; t += Math.max(v * 0.5, 1e-4);
              }
              return false;
            };
            for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
              const i = (y * w + x) * 4;
              if (px[i + 3] <= 250 || px[i + 7] <= 250 || px[i - 1] <= 250 || px[i + w * 4 + 3] <= 250 || px[i - w * 4 + 3] <= 250) continue;
              const across = apartOf(i - 4, i + 4), down = apartOf(i - w * 4, i + w * 4), step = Math.max(across, down);
              if (step < 120) continue;
              const a = across >= down ? i - 4 : i - w * 4, b = across >= down ? i + 4 : i + w * 4;
              if (!grazes(x, y)) continue;
              outline.n++; outline.sum += Math.min(apartOf(i, a), apartOf(i, b)) / step;
            }
          }
          const size = (b) => ({ w: b[1] < 0 ? 0 : b[1] - b[0] + 1, h: b[3] < 0 ? 0 : b[3] - b[2] + 1, cx: (b[0] + b[1]) / 2, cy: (b[2] + b[3]) / 2 });
          // How this picture differs from the last step's, for when a still picture is not still.
          const diff = { n: 0, max: 0 };
          if (last) for (let i = 0; i < px.length; i++) { const d = Math.abs(px[i] - last[i]); if (d) { diff.n++; if (d > diff.max) diff.max = d; } }
          last = px;
          const s = window.__timbre.scene, state = (s && s.state) || {};
          out.push({ state, solid, soft, light, edge, shine, against, outline: { n: outline.n, soft: outline.n ? outline.sum / outline.n : 0 }, tint: tint.map((v) => (solid ? v / solid : 0)), mean: solid ? sum / solid : 0, empty: empty / (w * h), cornerAlpha: px[3], solidBox: size(solidBox), canvas: [w, h], hash, diff, kitCam: s ? s.camera : null,
            expect: state.balls ? [getColor(state.colorT), getColor(state.colorT + 1), getColor(state.colorT + 2)] : null,
            expectPixel: state.balls ? TimbreMetaball.pixelOf(TimbreScene.renderScale(gl.canvas.height) * gl.canvas.height, 1) : null });
        }
        return out;
      } finally {
        frequencies = saved.frequencies; micActive = saved.micActive; cfgIdleAnim = saved.cfgIdleAnim; cfgColorHue = saved.cfgColorHue; cfgColorSpeed = saved.cfgColorSpeed; cfgGain = saved.cfgGain;
        Object.assign(perViz[id], knobs0); TimbreScene.testLevel = null;
      }
    }, { id: BLOB, steps, fps, knobs, hue, colorSpeed, gain });
    const top = (a) => Math.max(...a);
    const gap = (a, b) => top(a.map((v, i) => Math.abs(v - b[i])));
    const close = (a, b) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 2);
    const smooth = (v) => { const u = Math.min(1, Math.max(0, v)); return u * u * (3 - 2 * u); };
    // Droplet b of a run (the ball is 0): how far its middle is from the scene's, and its radius.
    const far = (r, i) => Math.hypot(r.state.balls[i * 4], r.state.balls[i * 4 + 1], r.state.balls[i * 4 + 2]);
    const radius = (r, i) => r.state.balls[i * 4 + 3];
    const talk = [{ level: 0.8, all: 0.8, secs: 3 }];
    // The threshold is 60% of what the scene gives after 3 s at a steady 0.8 with every band sounding: about
    // 73,000 solid pixels.
    const BLOB_SOLID = 44000;
    // How far a pixel on an outline inside the blob is from the nearer of the two colours the outline parts, as a
    // share of the step between them: none where the outline is a hard step.
    const SOFT = 0.2;
    // How much brighter the metal is, pixel for pixel, at a steady 0.8 than in a pause.
    const GLOWS = 1.02;

    await activate(BLOB);
    const blobState = await sceneState();
    const [loud] = await blobRun([Object.assign({ match: true }, talk[0])]);
    const [hush] = await blobRun([{ level: 0, secs: 2, match: true }]);
    const T15 = Math.tan(15 * Math.PI / 180), like = (a, b) => (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b) || 1);
    // How many pixels wide a ball of radius r at the middle of the scene is drawn: the frame is 4.8 tall.
    const ballWide = (r, canvas) => 2 * Math.tan(Math.asin(r / (2.4 / T15))) / T15 * canvas[1] / 2;
    check('metaball is a kit scene: solid metal that adds no light, with a transparent corner',
      !!blobState && blobState.active === true && blobState.targetSize[0] === 1728 && loud.solid > BLOB_SOLID && loud.cornerAlpha === 0 && loud.edge === 0 && loud.empty > 0.5 && loud.light < 0.01 * loud.solid && loud.state.transparent === true
        && loud.state.balls.length === 36,
      JSON.stringify({ size: blobState && blobState.targetSize, solid: [loud.solid, hush.solid], soft: [loud.soft, hush.soft], light: loud.light, corner: loud.cornerAlpha, edge: loud.edge, empty: loud.empty, box: [loud.solidBox, hush.solidBox], mean: loud.mean, shine: loud.shine }));
    check('metaball: a pause is one round ball in the middle of the frame', hush.state.out === 0 && [1, 2, 3, 4, 5, 6, 7, 8].every((i) => far(hush, i) < 1e-6) && Math.abs(radius(hush, 0) - 0.74) < 1e-4 && Math.abs(hush.solidBox.w - hush.solidBox.h) < 0.04 * hush.solidBox.w
      && Math.abs(hush.solidBox.cx - hush.canvas[0] / 2) < 0.04 * hush.canvas[0] && Math.abs(hush.solidBox.cy - hush.canvas[1] / 2) < 0.08 * hush.canvas[1] && Math.abs(hush.solid - Math.PI * hush.solidBox.w * hush.solidBox.w / 4) < 0.05 * hush.solid && Math.abs(hush.solidBox.w - ballWide(0.74, hush.canvas)) <= 3,
      JSON.stringify({ out: hush.state.out, radius: radius(hush, 0), box: hush.solidBox, wide: ballWide(0.74, hush.canvas), solid: hush.solid }));
    check('metaball: the sphere it is drawn on is no larger than the blob needs', Math.abs(hush.state.bound - (0.74 + Math.abs(hush.state.balls[1]) + 0.16)) < 1e-6 && hush.state.drawnOn === hush.state.bound * 1.02 && hush.state.uniforms[3] === hush.state.drawnOn
      && loud.state.bound > 2 && loud.state.bound < 2.7 && loud.state.drawnOn === loud.state.bound * 1.02,
      JSON.stringify({ bound: [hush.state.bound, loud.state.bound], drawnOn: [hush.state.drawnOn, loud.state.drawnOn] }));
    const [up1, down1] = await blobRun([{ level: 0, secs: 1.2 }, { level: 0, secs: 2.4 }]);
    check('metaball: the ball bobs a hair, in the picture as in the arithmetic', Math.abs(up1.state.balls[1] - 0.04 * Math.sin(1.56)) < 1e-6 && Math.abs(down1.state.balls[1] - 0.04 * Math.sin(4.68)) < 1e-6 && up1.solidBox.cy - down1.solidBox.cy > 7 && up1.solidBox.cy - down1.solidBox.cy < 14,
      JSON.stringify({ y: [up1.state.balls[1], down1.state.balls[1]], cy: [up1.solidBox.cy, down1.solidBox.cy] }));

    check('metaball: with every band sounding, every droplet is out and the blob is far larger', loud.state.out === 8 && [1, 2, 3, 4, 5, 6, 7, 8].every((i) => Math.abs(far(loud, i) - 1.6 * smooth(Math.min(1, loud.state.bands[i - 1]))) < 0.07) && loud.state.bands.every((b) => b > 0.7)
      && loud.solid > 1.5 * hush.solid && loud.solidBox.w > 1.6 * hush.solidBox.w, JSON.stringify({ out: loud.state.out, far: [1, 4, 8].map((i) => far(loud, i)), bands: loud.state.bands, solid: [hush.solid, loud.solid] }));
    check('metaball: the surface has a soft edge about a pixel wide', hush.soft > 0.9 * Math.PI * hush.solidBox.w && hush.soft < 1.7 * Math.PI * hush.solidBox.w && Math.abs(hush.state.pixel - hush.expectPixel) < 1e-12 && hush.state.uniforms[2] === hush.state.pixel,
      JSON.stringify({ soft: hush.soft, around: Math.PI * hush.solidBox.w, pixel: [hush.state.pixel, hush.expectPixel] }));

    // A band and its droplet.
    const [third] = await blobRun([{ level: 0.6, bins: [[2, 1]], secs: 1.5, match: true }], { gain: 1 });
    const [neck] = await blobRun([{ level: 0.6, bins: [[2, 0.65]], secs: 2.5, match: true }], { gain: 1 });
    const [, thrown] = await blobRun([{ level: 0.05, all: 1, secs: 1.5 }, { level: 0.9, all: 1, secs: 0.05, match: true }], { gain: 1, knobs: { cameraDrift: 100 } });
    check('metaball: the picture is the surface the arithmetic describes: clear where a ray passes clear of it, solid where a ray goes in, and no holes',
      [hush, loud, third, neck, thrown].every((r) => r.against.holes === 0 && r.against.stray === 0 && r.against.clear > 30000) && hush.against.metal > 1300 && loud.against.metal > 3000 && third.against.metal > hush.against.metal + 150
        && neck.state.out === 1 && neck.against.metal > hush.against.metal + 150,
      JSON.stringify({ hush: hush.against, loud: loud.against, third: third.against, neck: neck.against, thrown: thrown.against }));
    check('metaball: with every band full, on a beat, at the widest camera drift, the blob is whole inside the picture', thrown.state.kick > 0.6 && thrown.state.bands.every((b) => b > 0.99) && thrown.edge === 0
      && thrown.solidBox.h < 0.96 * thrown.canvas[1] && thrown.solidBox.h > 0.75 * thrown.canvas[1], JSON.stringify({ kick: thrown.state.kick, edge: thrown.edge, box: thrown.solidBox, canvas: thrown.canvas }));
    check('metaball: the outlines inside the blob are blends, as the one round it is', loud.outline.n > 40 && thrown.outline.n > 40 && loud.outline.soft > SOFT && thrown.outline.soft > SOFT && hush.outline.n === 0,
      JSON.stringify({ outline: [hush.outline, third.outline, loud.outline, thrown.outline] }));
    check('metaball: a band pulls its own droplet out, and no other', third.state.out === 1 && Math.abs(far(third, 3) - 1.6) < 0.07 && Math.abs(radius(third, 3) - 0.38) < 1e-3 && [1, 2, 4, 5, 6, 7, 8].every((i) => far(third, i) < 1e-6)
      && Math.abs(radius(third, 1) - 0.44 * 0.55) < 1e-4, JSON.stringify({ out: third.state.out, far: [1, 2, 3, 4].map((i) => far(third, i)), radius: [radius(third, 1), radius(third, 3)] }));
    const [risen, fallen] = await blobRun([{ level: 0.6, bins: [[2, 1]], secs: 0.1 }, { level: 0.6, secs: 0.5 }], { gain: 1 });
    check('metaball: a band is followed, quick out and slow home', Math.abs(risen.state.bands[2] - (1 - Math.exp(-1.2))) < 1e-5 && Math.abs(fallen.state.bands[2] - (1 - Math.exp(-1.2)) * Math.exp(-1.1)) < 1e-5 && risen.state.bands[3] === 0 && far(fallen, 3) < far(risen, 3) && far(fallen, 3) > 0.05,
      JSON.stringify({ bands: [risen.state.bands[2], fallen.state.bands[2]], far: [far(risen, 3), far(fallen, 3)] }));
    // An edge too faint to count as metal would be taken for light by the afterglow, and linger where the droplet had been.
    check('metaball: a droplet going home leaves no light behind it', fallen.light === 0 && risen.light === 0 && fallen.solid > 1000, JSON.stringify({ light: [risen.light, fallen.light], solid: fallen.solid }));
    const quiet = [{ level: 0.6, bins: [[2, 0.4]], secs: 1.5 }];
    const [plain] = await blobRun(quiet, { gain: 1 }), [boosted] = await blobRun(quiet, { gain: 2 });
    check('metaball: Gain scales how loud a band is, and so how far its droplet goes', Math.abs(plain.state.bands[2] - 0.4) < 0.005 && Math.abs(boosted.state.bands[2] - 0.8) < 0.005 && Math.abs(far(plain, 3) - 1.6 * smooth(plain.state.bands[2])) < 0.07 && far(boosted, 3) > far(plain, 3) + 0.5 && plain.state.out === 0 && boosted.state.out === 1,
      JSON.stringify({ bands: [plain.state.bands[2], boosted.state.bands[2]], far: [far(plain, 3), far(boosted, 3)] }));

    // Loudness and a beat.
    const [swollen] = await blobRun([{ level: 0.8, secs: 2 }]);
    const [quick] = await blobRun([{ level: 0.8, secs: 0.05 }]);
    check('metaball: the voice swells the ball and makes the metal glow', Math.abs(radius(swollen, 0) - (0.74 + 0.1 * swollen.state.flame + 0.07 * swollen.state.kick)) < 1e-4 && Math.abs(swollen.state.flame - 0.8) < 0.01 && Math.abs(swollen.state.glow - 0.2) < 0.01
      && swollen.state.uniforms[1] === swollen.state.glow && hush.state.glow < 0.01 && swollen.solid > 1.1 * hush.solid && swollen.mean > GLOWS * hush.mean
      && quick.state.flame > 0.02 && quick.state.flame < 0.7 && Math.abs(radius(quick, 0) - (0.74 + 0.1 * quick.state.flame + 0.07 * quick.state.kick)) < 1e-4,
      JSON.stringify({ radius: radius(swollen, 0), flame: [quick.state.flame, swollen.state.flame], glow: [swollen.state.glow, hush.state.glow], solid: [hush.solid, swollen.solid], mean: [hush.mean, swollen.mean] }));
    const beat = [{ level: 0.05, all: 0.5, secs: 1 }, { level: 0.9, all: 0.5, secs: 0.1 }, { level: 0.9, all: 0.5, secs: 2.5 }];
    const [calm, hit, after] = await blobRun(beat, { gain: 1 });
    check('metaball: a beat throws every droplet further, swells the ball and brightens the glow, then lets go', hit.state.kick > 0.5 && after.state.kick < 0.001 && calm.state.kick === 0
      && [1, 4, 8].every((i) => Math.abs(far(hit, i) - 1.6 * smooth(hit.state.bands[i - 1]) * (1 + 0.18 * hit.state.kick)) < 0.07 && far(hit, i) > far(calm, i) * 1.05)
      && Math.abs(radius(hit, 0) - (0.74 + 0.1 * hit.state.flame + 0.07 * hit.state.kick)) < 1e-4 && Math.abs(hit.state.glow - (0.25 * hit.state.flame + 0.5 * hit.state.kick)) < 1e-5 && hit.state.glow > after.state.glow + 0.2 && hit.edge === 0,
      JSON.stringify({ kick: [calm.state.kick, hit.state.kick, after.state.kick], far: [far(calm, 1), far(hit, 1), far(after, 1)], radius: [radius(calm, 0), radius(hit, 0)], glow: [hit.state.glow, after.state.glow] }));

    // Chrome.
    const [matte] = await blobRun(talk, { knobs: { chrome: 0 } }), [mirror] = await blobRun(talk, { knobs: { chrome: 100 } });
    check('metaball: Chrome 0 is a soft shaded body and 100 all mirror', matte.state.chrome === 0 && mirror.state.chrome === 1 && loud.state.chrome === 0.5 && matte.state.uniforms[0] === 0 && mirror.state.uniforms[0] === 1 && matte.hash !== mirror.hash && matte.hash !== loud.hash
      && mirror.shine > 1.5 * matte.shine + 20 && Math.abs(mirror.solid - matte.solid) < 0.01 * matte.solid, JSON.stringify({ chrome: [matte.state.chrome, loud.state.chrome, mirror.state.chrome], shine: [matte.shine, loud.shine, mirror.shine], mean: [matte.mean, loud.mean, mirror.mean] }));

    // Camera.
    const [still] = await blobRun(talk, { knobs: { cameraDrift: 0 } }), [drift] = await blobRun(talk, { knobs: { cameraDrift: 100 } });
    check('metaball: Camera drift 0 holds the camera still; 100 doubles the sway', still.state.orbit === 0 && Math.abs(loud.state.orbit) > 0.005 && Math.abs(drift.state.orbit - 2 * loud.state.orbit) < 1e-9
      && Math.abs(still.kitCam[0]) < 1e-6 && Math.abs(drift.kitCam[0]) > 1.5 * Math.abs(loud.kitCam[0]) && Math.abs(loud.kitCam[0]) > 0.05
      && Math.abs(Math.hypot(...still.kitCam) - 2.4 / T15) < 1e-6 && Math.abs(still.kitCam[1] / Math.hypot(...still.kitCam) - Math.sin(12 * Math.PI / 180)) < 1e-9,
      JSON.stringify({ orbit: [still.state.orbit, loud.state.orbit, drift.state.orbit], x: [still.kitCam[0], loud.kitCam[0], drift.kitCam[0]], cam: still.kitCam }));

    // The same at any frame rate.
    const fpsSteps = [{ level: 0.8, all: 0.8, secs: 1 }, { level: 0, all: 0, secs: 0.5 }];
    const [, d30] = await blobRun(fpsSteps, { fps: 30 }), [, d60] = await blobRun(fpsSteps, { fps: 60 });
    const onset = [{ level: 0.6, bins: [[2, 1]], secs: 0.1 }];
    const [b30] = await blobRun(onset, { fps: 30, gain: 1 }), [b60] = await blobRun(onset, { fps: 60, gain: 1 });
    check('metaball: the same sound gives the same blob at 30 and 60 fps', Math.abs(d30.state.clock - 1.5) < 1e-6 && Math.abs(d60.state.clock - 1.5) < 1e-6 && gap(d30.state.bands, d60.state.bands) < 1e-5 && gap(d30.state.balls, d60.state.balls) < 0.03 && far(d60, 1) > 0.15
      && Math.abs(b30.state.bands[2] - (1 - Math.exp(-1.2))) < 1e-5 && Math.abs(b60.state.bands[2] - (1 - Math.exp(-1.2))) < 1e-5,
      JSON.stringify({ clock: [d30.state.clock, d60.state.clock], bands: gap(d30.state.bands, d60.state.bands), balls: gap(d30.state.balls, d60.state.balls), band: [b30.state.bands[2], b60.state.bands[2]] }));

    // Mic off.
    const [idle1, idle2] = await blobRun([{ level: null, idle: true, secs: 3 }, { level: null, idle: true, secs: 1.5 }]);
    check('metaball: with the mic off and Idle animation on, droplets come and go', idle1.state.live === true && Math.abs(idle2.state.clock - 4.5) < 1e-6 && gap(idle1.state.balls, idle2.state.balls) > 0.05 && top(idle2.state.bands) > 0.3 && top(idle2.state.bands) < 0.75
      && [1, 2, 3, 4, 5, 6, 7, 8].some((i) => far(idle2, i) > 0.3), JSON.stringify({ clock: [idle1.state.clock, idle2.state.clock], moved: gap(idle1.state.balls, idle2.state.balls), bands: idle2.state.bands }));
    // Camera drift 0 and a palette that stands still, so that nothing but the scene could move the picture.
    const [off1, off2] = await blobRun([{ level: null, off: true, secs: 3 }, { level: null, off: true, secs: 1 }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    const [on1, on2] = await blobRun([{ level: null, idle: true, secs: 3 }, { level: null, idle: true, secs: 1 }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    check('metaball: with the mic and Idle animation off the picture holds still, pixel for pixel', off1.hash === off2.hash && on1.hash !== on2.hash && off2.solid > 500 && off2.state.live === false && off2.state.clock === 0 && off2.state.out === 0,
      JSON.stringify({ off: [off1.hash, off2.hash], idle: [on1.hash, on2.hash], solid: off2.solid, differs: off2.diff }));
    // (Quiet and then loud, so that a beat has struck and is still dying away when the mic goes.)
    const [, live1, muted1, muted2, muted3] = await blobRun([{ level: 0.05, all: 0.8, secs: 1 }, { level: 0.9, all: 0.8, secs: 1 }, { level: null, off: true, secs: 0.5 }, { level: null, off: true, secs: 7.5 }, { level: null, off: true, secs: 1 }], { knobs: { cameraDrift: 0 }, colorSpeed: 0 });
    check('metaball: muted in the middle of a stream, the droplets stop turning, drift home, and then nothing moves', muted1.state.live === false && muted1.state.clock === live1.state.clock && muted2.state.clock === live1.state.clock && live1.state.out === 8 && live1.state.kick > 0.001 && muted1.state.kick > 0 && muted1.state.kick < live1.state.kick
      && far(muted1, 1) > 0.05 && far(muted1, 1) < far(live1, 1) && muted2.state.bands.every((b) => b === 0) && muted2.state.flame === 0 && muted2.state.kick === 0 && muted2.state.glow === 0 && radius(muted2, 0) === Math.fround(0.74) && [1, 2, 3, 4, 5, 6, 7, 8].every((i) => far(muted2, i) === 0) && muted2.hash === muted3.hash && muted1.hash !== muted2.hash,
      JSON.stringify({ clock: [live1.state.clock, muted1.state.clock, muted2.state.clock], far: [far(live1, 1), far(muted1, 1), far(muted2, 1)], bands: muted2.state.bands.slice(0, 3), differs: muted3.diff }));

    // Colour.
    const [hued] = await blobRun(talk, { hue: 2 });
    check('metaball: the metal, its horizon and its sky are three palette colours, and the hue setting moves them', close(loud.state.body, loud.expect[0]) && close(loud.state.horizon, loud.expect[1]) && close(loud.state.sky, loud.expect[2])
      && close(hued.state.body, hued.expect[0]) && !close(hued.state.body, loud.state.body), JSON.stringify({ body: [loud.state.body, loud.expect[0]], horizon: [loud.state.horizon, loud.expect[1]], sky: [loud.state.sky, loud.expect[2]], hued: hued.state.body }));
    const [huedMatte] = await blobRun(talk, { hue: 2, knobs: { chrome: 0 } });
    check('metaball: in the picture a matte blob is the colour of its body, not of its sky', like(matte.tint, matte.expect[0]) > like(matte.tint, matte.expect[2]) + 0.02 && like(huedMatte.tint, huedMatte.expect[0]) > like(huedMatte.tint, huedMatte.expect[2]) + 0.02
      && like(matte.tint, huedMatte.tint) < 0.98,
      JSON.stringify({ tint: [matte.tint, huedMatte.tint], body: [matte.expect[0], huedMatte.expect[0]], sky: [matte.expect[2], huedMatte.expect[2]], like: [like(matte.tint, matte.expect[0]), like(matte.tint, matte.expect[2]), like(huedMatte.tint, huedMatte.expect[0]), like(huedMatte.tint, huedMatte.expect[2])] }));

    // Placement and cost.
    await activate(BLOB);
    const blobP0 = await probe();
    await pushConfig((c) => { c.activeViz = 'metaball'; c.placement.x = 30; });
    await wide.waitForTimeout(400);
    const blobP1 = await probe();
    check('metaball: Scene placement slides it', blobP1.centroidX - blobP0.centroidX > 150, `${blobP0.centroidX.toFixed(0)} → ${blobP1.centroidX.toFixed(0)}`);
    await pushConfig((c) => { c.activeViz = 'metaball'; c.placement.size = 50; });
    await wide.waitForTimeout(400);
    const [halfHush] = await blobRun([{ level: 0, secs: 2 }]);
    check('metaball: at half size the soft edge is still about a pixel wide in the picture', halfHush.soft > 0.9 * Math.PI * halfHush.solidBox.w && halfHush.soft < 1.7 * Math.PI * halfHush.solidBox.w && Math.abs(halfHush.solidBox.w - ballWide(0.74, halfHush.canvas) / 2) <= 3,
      JSON.stringify({ soft: halfHush.soft, around: Math.PI * halfHush.solidBox.w, box: halfHush.solidBox }));
    const halfEdge = await wide.evaluate(() => { currentViz.draw(performance.now(), 1 / 60); currentViz.draw(performance.now() + 17, 1 / 60); return window.__timbre.scene.state.pixel; });
    // The small page draws into a picture several times taller than its canvas.
    const smallBlob = await page.evaluate(() => { currentViz.draw(performance.now(), 1 / 60); currentViz.draw(performance.now() + 17, 1 / 60); const s = window.__timbre.scene, c = document.getElementById('vizCanvas3D'); return { name: window.__timbre.currentVizName, scale: s && s.renderScale, pixel: s && s.state.pixel, want: TimbreMetaball.pixelOf(s.renderScale * c.height, 0.5) }; });
    check('metaball: the soft edge stays a pixel and a half wide under the Size slider and on the small page', Math.abs(halfEdge - 2 * hush.state.pixel) < 1e-12 && smallBlob.name === 'metaball' && smallBlob.scale >= 2 && Math.abs(smallBlob.pixel - smallBlob.want) < 1e-12,
      JSON.stringify({ half: halfEdge, full: hush.state.pixel, small: smallBlob }));
    await pushConfig((c) => { c.placement.x = 0; });
    await wide.waitForTimeout(300);
    await activate(BLOB);
    const blobCost = await wide.evaluate(() => { let now = performance.now(), acc = 0; for (let i = 0; i < 120; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); acc += performance.now() - t; } return acc / 120; });
    check(`metaball: draw() averages under 5 ms of script time (${blobCost.toFixed(2)} ms)`, blobCost < 5);
    // The shader's work is done after draw() returns: reading a pixel back waits for it.
    const blobFrame = await wide.evaluate(() => { const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), one = new Uint8Array(4); let now = performance.now(), acc = 0; for (let i = 0; i < 60; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one); acc += performance.now() - t; } return acc / 60; });
    check(`metaball: a frame, drawn and finished by the GPU, averages under 12 ms (${blobFrame.toFixed(2)} ms)`, blobFrame < 12);

    }

    // ── The ink (a kit scene: coloured ink poured into a glass tank of water) ────
    {   // its own block: the names below are the ink's own
    // Build the scene afresh, drive the level and the 32 bins by hand, and read the canvas and
    // the scene after each step. A step gives level (null: whatever the kit hears), secs, and
    // either all (every bin, 0..1) or bins ([[bin, 0..1], ...]); idle: true has the mic off,
    // off: true has the mic and Idle animation off; hue sets the palette's hue from that step on.
    // mark: true notes which pixels are bright, and every later step counts the bright pixels that were not (fresh).
    // keep: true keeps the step's picture, and versus: true counts the pixels of another step's where the ink is thick in both and this one is brighter.
    const INK = 'ink';
    const inkRun = (steps, { fps = 60, knobs = null, hue = null, colorSpeed = null, gain = null } = {}) => wide.evaluate(({ id, steps, fps, knobs, hue, colorSpeed, gain }) => {
      window.frame = function () {};
      const saved = { frequencies, micActive, cfgIdleAnim, cfgColorHue, cfgColorSpeed, cfgGain }, knobs0 = Object.assign({}, perViz[id]);
      try {
        if (knobs) Object.assign(perViz[id], knobs);
        if (hue !== null) cfgColorHue = hue;
        if (colorSpeed !== null) cfgColorSpeed = colorSpeed;
        if (gain !== null) cfgGain = gain;
        TimbreScene.testLevel = 0;
        setActiveViz('visualizer'); setActiveViz(id);
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), f = new Uint8Array(32), out = [];
        let now = 100000 + 1000 / 120, last = null, marked = null;
        for (const st of steps) {
          TimbreScene.testLevel = st.level;
          micActive = !st.idle && !st.off;
          cfgIdleAnim = st.off ? false : saved.cfgIdleAnim;
          if (st.knobs) Object.assign(perViz[id], st.knobs);
          if (st.hue !== undefined) cfgColorHue = st.hue;
          f.fill(st.all !== undefined ? Math.round(st.all * 255) : 0);
          if (st.bins) for (const [i, v] of st.bins) f[i] = Math.round(v * 255);
          frequencies = f;
          let beats = 0;
          for (let i = 0, n = Math.round(st.secs * fps); i < n; i++) { now += 1000 / fps; const b0 = window.__timbre.scene ? window.__timbre.scene.state.beats : 0; currentViz.draw(now, 1 / fps); if (window.__timbre.scene.state.beats > b0) beats++; }
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);   // row 0 is the bottom of the canvas
          // inked: pixels the ink covers (its pigment has alpha). cover: how much it covers in all. color: the ink's mean colour.
          // light: pixels of light over the background, which is the glass and the water's surface. edge: either, at the canvas's edge.
          let inked = 0, cover = 0, light = 0, lightSum = 0, edge = 0, sx = 0, bright = 0, hash = 2166136261;
          for (let i = 0; i < px.length; i++) hash = Math.imul(hash ^ px[i], 16777619) >>> 0;
          const box = [w, -1, h, -1], lightBox = [w, -1, h, -1], color = [0, 0, 0];
          for (let i = 0; i < px.length; i += 4) {
            const x = (i / 4) % w, y = Math.floor(i / 4 / w), rgb = px[i] + px[i + 1] + px[i + 2], a = px[i + 3];
            if (a >= 25) {
              inked++; cover += a / 255; sx += x * a; color[0] += px[i]; color[1] += px[i + 1]; color[2] += px[i + 2];
              if (x < box[0]) box[0] = x; if (x > box[1]) box[1] = x; if (y < box[2]) box[2] = y; if (y > box[3]) box[3] = y;
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
            } else if (a < 5 && rgb > 12) {
              light++; lightSum += rgb; if (rgb > 250) bright++;
              if (x < lightBox[0]) lightBox[0] = x; if (x > lightBox[1]) lightBox[1] = x; if (y < lightBox[2]) lightBox[2] = y; if (y > lightBox[3]) lightBox[3] = y;
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
            }
          }
          const size = (b) => ({ w: b[1] < 0 ? 0 : b[1] - b[0] + 1, h: b[3] < 0 ? 0 : b[3] - b[2] + 1, x0: b[0], x1: b[1], y0: b[2], y1: b[3] });
          // How bright the ink is for what it covers, in the upper third of its box and in the lower (the picture's colours carry the cover, so it is divided out).
          const thirds = [[0, 0], [0, 0]];
          if (box[3] >= 0) for (let i = 0; i < px.length; i += 4) { const a = px[i + 3]; if (a < 25) continue; const y = Math.floor(i / 4 / w), third = (y - box[2]) / (box[3] - box[2] + 1);
            if (third > 2 / 3) { thirds[0][0] += px[i] + px[i + 1] + px[i + 2]; thirds[0][1] += a; } else if (third < 1 / 3) { thirds[1][0] += px[i] + px[i + 1] + px[i + 2]; thirds[1][1] += a; } }
          const diff = { n: 0, max: 0 };
          if (last) for (let i = 0; i < px.length; i++) { const d = Math.abs(px[i] - last[i]); if (d) { diff.n++; if (d > diff.max) diff.max = d; } }
          last = px;
          if (st.keep) window.__inkKept = px;
          let fresh = -1;
          const isBright = (i) => px[i + 3] < 5 && px[i] + px[i + 1] + px[i + 2] > 250;
          if (marked && marked.length === px.length / 4) { fresh = 0; for (let i = 0; i < px.length; i += 4) if (isBright(i) && !marked[i / 4]) fresh++; }
          if (st.mark) { marked = new Uint8Array(px.length / 4); for (let i = 0; i < px.length; i += 4) if (isBright(i)) marked[i / 4] = 1; }
          let over = -1;
          if (st.versus && window.__inkKept && window.__inkKept.length === px.length) { over = 0; const kept = window.__inkKept; for (let i = 0; i < px.length; i += 4) if (px[i + 3] >= 100 && kept[i + 3] >= 100 && px[i] + px[i + 1] + px[i + 2] > kept[i] + kept[i + 1] + kept[i + 2] + 25) over++; }
          const s = window.__timbre.scene, state = (s && s.state) || {};
          out.push({ state, inked, cover, light, lightSum, edge, beats, bright, over, fresh, upper: thirds[0][1] ? thirds[0][0] / thirds[0][1] : 0, lower: thirds[1][1] ? thirds[1][0] / thirds[1][1] : 0, color: inked ? color.map((v) => v / inked) : [0, 0, 0], centroidX: cover ? sx / (cover * 255) : 0, box: size(box), lightBox: size(lightBox), cornerAlpha: px[3], canvas: [w, h], hash, diff,
            kitCam: s ? s.camera : null, expect: state.bands ? state.bands.map((_, b) => getColor(state.colorT + b * 0.42)) : null });
        }
        return out;
      } finally {
        frequencies = saved.frequencies; micActive = saved.micActive; cfgIdleAnim = saved.cfgIdleAnim; cfgColorHue = saved.cfgColorHue; cfgColorSpeed = saved.cfgColorSpeed; cfgGain = saved.cfgGain;
        Object.assign(perViz[id], knobs0); TimbreScene.testLevel = null;
      }
    }, { id: INK, steps, fps, knobs, hue, colorSpeed, gain });
    const gap = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    const long = (v) => Math.hypot(...v);
    const like = (a, b) => (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (long(a) * long(b) || 1);
    // A picture is as the last one was, but for the two stray pixels this GPU allows itself (see the glass prism's block).
    const same = (r) => r.diff.n <= 8 && r.diff.max <= 1;
    const pourRate = (level, share) => level < 0.08 ? 0 : 1300 * share * level * Math.sqrt(level);
    const still = { knobs: { cameraDrift: 0 }, colorSpeed: 0, gain: 1 };
    // Pixels of ink after three seconds of every band sounding: measured, and the threshold is six tenths of it.
    const INK_COVERED = 52000;
    // How much the ink covers in all after those three seconds: measured, and held to a fifth either way.
    const INK_COVER = 49860;
    // The empty tank's light in silence, all told; how many of its pixels are bright (its edges); and the box they lie in (left, right, bottom, top). Measured.
    const TANK_LIGHT = 5626000, TANK_BRIGHT = 8950, TANK_BOX = [572, 1129, 90, 560];
    // Pixels where the ink is thick and the near glass's light lies over it: measured with the near glass drawn after the ink and before it, and set between.
    const OVER_INK = 50;
    // How bright ink is for what it covers, at least (the sum of its three colours for a cover of one, of 765): measured, and seven tenths of it.
    const INK_BRIGHT = 1.8;
    // How many pixels are bright half a second after a beat that were not bright at the beat: the ring, spreading. Measured, and half of it. (Without the ring there are none: the glass is brightest at the beat.)
    const RING_LIGHT = 150;
    // How much the ink covers with every band full and the tank full: measured, and eight tenths of it. And the empty tank's light on the small page, at half size: 256,790 as it is,
    // 246,344 with only the surface's edge sized for the kit's larger picture (which comes out in dashes), and less with the glass's edges so.
    const FLOOD_COVER = 69000, SMALL_TANK = 252000;
    // How like its palette colour a band's ink must be in the picture (1 is the same hue). Measured.
    const INK_HUE = 0.93;
    // How far apart the ink may lie at 30 and at 60 frames a second, after the same sound. Measured, and set a few times over.
    const FPS_BOX = 0.03, FPS_MEAN = 0.03;

    await activate(INK);
    const inkState = await sceneState();
    const [inkLoud] = await inkRun([{ level: 0.8, all: 0.8, secs: 3 }], { gain: 1 });
    const [inkHush] = await inkRun([{ level: 0, secs: 2 }], { gain: 1 });
    // The same loud three seconds with the glass not drawn and with it: where the ink is thick, the near glass's light lies over it.
    const [unlit] = await inkRun([{ level: 0.8, all: 0.8, secs: 3, keep: true }], { gain: 1, knobs: { glass: 0 } }), [lit] = await inkRun([{ level: 0.8, all: 0.8, secs: 3, versus: true }], { gain: 1 });
    check('ink is a kit scene: pigment that covers what is behind it, in a tank drawn in light, with a transparent corner and nothing at the edge',
      !!inkState && inkState.active === true && inkState.targetSize[0] === 1728 && inkLoud.inked > INK_COVERED && inkLoud.state.pigment === true && inkLoud.state.light === true && inkLoud.cornerAlpha === 0 && inkLoud.edge === 0
        && inkLoud.light > 2000 && inkLoud.state.count === 18000 && inkLoud.state.drawn === 18000 && Math.abs(inkLoud.state.share - 0.6) < 1e-12
        && inkLoud.state.brights[0] === inkLoud.state.glass && inkLoud.state.brights[1] === inkLoud.state.glass && inkLoud.state.brights[2] === inkLoud.state.surface && inkLoud.state.glass > 0.5 && inkLoud.state.drawnPx === inkLoud.state.px
        && gap(inkLoud.state.surfaceColor, inkLoud.state.glassColor) === 0 && gap(inkLoud.state.frontColor, inkLoud.state.glassColor) === 0 && Math.abs(inkLoud.state.surfaceAt[0] - 1.13) < 1e-9 && Math.abs(inkLoud.state.surfaceAt[1] + Math.PI / 2) < 1e-9 && inkLoud.state.faces === 5
        && Math.abs(inkLoud.cover - INK_COVER) < 0.2 * INK_COVER && inkLoud.state.strays === 0,
      JSON.stringify({ size: inkState && inkState.targetSize, inked: inkLoud.inked, cover: inkLoud.cover, light: inkLoud.light, corner: inkLoud.cornerAlpha, edge: inkLoud.edge, box: inkLoud.box, lightBox: inkLoud.lightBox }));
    check('ink: in silence nothing is poured, and the tank stands empty', inkHush.state.poured === 0 && inkHush.state.left === 0 && inkHush.inked === 0 && inkHush.light > 2000 && inkHush.state.bands.every((b) => b === 0) && inkHush.state.flame === 0
      && Math.abs(inkHush.state.strength - 0.1) < 1e-12 && Math.abs(inkHush.state.glass - 0.5) < 1e-12 && Math.abs(inkHush.state.surface - 0.5) < 1e-12 && inkHush.state.shown.every(Boolean) && inkHush.edge === 0,
      JSON.stringify({ poured: inkHush.state.poured, inked: inkHush.inked, light: inkHush.light, strength: inkHush.state.strength, glass: inkHush.state.glass }));
    check('ink: the empty tank is drawn as it was measured: its edges, its faces\' sheen and the water\'s surface, and where they lie', Math.abs(inkHush.lightSum - TANK_LIGHT) < 0.08 * TANK_LIGHT && Math.abs(inkHush.bright - TANK_BRIGHT) < 0.12 * TANK_BRIGHT
      && gap([inkHush.lightBox.x0, inkHush.lightBox.x1, inkHush.lightBox.y0, inkHush.lightBox.y1], TANK_BOX) <= 3,
      JSON.stringify({ lightSum: inkHush.lightSum, bright: inkHush.bright, box: inkHush.lightBox }));
    check('ink: the far glass is drawn before the ink and the near glass and the surface after it, so the tank\'s near edges lie over the ink', JSON.stringify(inkLoud.state.order) === '[-1,0,1,1]' && inkLoud.state.sides.every(Boolean) && inkLoud.state.sameBox === true
      && lit.over > OVER_INK && lit.state.left === unlit.state.left && unlit.light < 0.03 * lit.light, JSON.stringify({ order: inkLoud.state.order, sides: inkLoud.state.sides, over: lit.over, left: [unlit.state.left, lit.state.left] }));
    check('ink: the tank stands clear of the bands along the picture\'s edges where the kit dims what is not solid', inkLoud.box.y0 >= 0.2 * inkLoud.canvas[1] - 2 && inkLoud.box.y1 <= 0.9 * inkLoud.canvas[1] + 2 && inkLoud.box.x0 >= 0.14 * inkLoud.canvas[0] && inkLoud.box.x1 <= 0.86 * inkLoud.canvas[0]
      && inkHush.lightBox.y0 >= 0.13 * inkHush.canvas[1], JSON.stringify({ ink: inkLoud.box, glass: inkHush.lightBox, canvas: inkLoud.canvas }));
    check('ink: all of it is inside the tank, in the scene and in the picture', inkLoud.state.box[0] >= -1.59 - 1e-6 && inkLoud.state.box[1] <= 1.59 + 1e-6 && inkLoud.state.box[2] >= -1.3 - 1e-6 && inkLoud.state.box[3] <= 1.13 + 1e-6 && inkLoud.state.box[4] >= -0.69 - 1e-6 && inkLoud.state.box[5] <= 0.69 + 1e-6
      && inkLoud.box.x0 >= inkLoud.lightBox.x0 - 2 && inkLoud.box.x1 <= inkLoud.lightBox.x1 + 2 && inkLoud.box.y0 >= inkLoud.lightBox.y0 - 2 && inkLoud.box.y1 <= inkLoud.lightBox.y1 + 2 && inkLoud.box.w > 0.3 * inkLoud.lightBox.w,
      JSON.stringify({ scene: inkLoud.state.box, ink: inkLoud.box, glass: inkLoud.lightBox }));

    // A band: its place, its colour, how much it pours.
    const one = (b, secs = 1.2, opts = still) => inkRun([{ level: 0.3, bins: [[b, 1]], secs }], opts).then((r) => r[0]);
    const band0 = await one(0), band3 = await one(3), band7 = await one(7), band12 = await one(12);
    check('ink: each band pours at its own place along the top, low bands at one end and high at the other', [[band0, 0], [band3, 3], [band7, 7]].every(([r, b]) => r.state.perBand[b] === r.state.left && r.state.left > 300 && r.state.perBand.every((n, i) => i === b || n === 0))
      && band0.state.meanX[0] < band3.state.meanX[3] - 0.5 && band3.state.meanX[3] < band7.state.meanX[7] - 0.5 && band0.centroidX < band3.centroidX - 80 && band3.centroidX < band7.centroidX - 80 && band0.inked > 300,
      JSON.stringify({ meanX: [band0.state.meanX[0], band3.state.meanX[3], band7.state.meanX[7]], centroidX: [band0.centroidX, band3.centroidX, band7.centroidX], left: [band0.state.left, band3.state.left, band7.state.left], inked: band0.inked }));
    check('ink: in the picture each band\'s ink is its own palette colour', [[band0, 0], [band3, 3], [band7, 7]].every(([r, b]) => like(r.color, r.expect[b]) > INK_HUE) && like(band0.color, band0.expect[0]) > like(band0.color, band0.expect[7]) + 0.02 && like(band7.color, band7.expect[7]) > like(band7.color, band7.expect[0]) + 0.02,
      JSON.stringify([[band0, 0], [band3, 3], [band7, 7]].map(([r, b]) => ({ color: r.color, expect: r.expect[b], like: like(r.color, r.expect[b]), other: like(r.color, r.expect[7 - b]) }))));
    const tintOf = await wide.evaluate(({ band, colorT }) => { const p = getColor(colorT + band * 0.42), c = new THREE.Color().setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace); return [c.r, c.g, c.b]; }, { band: 3, colorT: band3.state.colorT });
    const shadeOf = band3.state.newest.tint.map((v, i) => (tintOf[i] > 0.02 ? v / tintOf[i] : null)).filter((v) => v !== null);
    check('ink: a speck is poured in its band\'s palette colour, as three.js decodes it, a little uneven in shade', band3.state.newest.band === 3 && shadeOf.length >= 2 && Math.max(...shadeOf) - Math.min(...shadeOf) < 1e-4 && shadeOf[0] >= 0.78 - 1e-4 && shadeOf[0] <= 1 + 1e-4,
      JSON.stringify({ tint: band3.state.newest.tint, palette: tintOf, shade: shadeOf }));
    check('ink: only the eight lowest bins pour', band12.state.poured === 0 && band12.inked === 0 && band12.state.bands.every((b) => b === 0), JSON.stringify({ poured: band12.state.poured, inked: band12.inked }));
    const [risen, fallen] = await inkRun([{ level: 0.3, bins: [[2, 1]], secs: 0.1 }, { level: 0.3, secs: 0.5 }], still);
    check('ink: a band is followed, quick up and slower down', Math.abs(risen.state.bands[2] - (1 - Math.exp(-1.4))) < 1e-5 && Math.abs(fallen.state.bands[2] - (1 - Math.exp(-1.4)) * Math.exp(-2)) < 1e-5 && risen.state.bands[3] === 0,
      JSON.stringify({ bands: [risen.state.bands[2], fallen.state.bands[2]] }));
    // Once a band is steady, a second of it pours what its level says, at this share of the specks.
    const [steady0, steady1] = await inkRun([{ level: 0.3, bins: [[2, 0.5]], secs: 1 }, { level: 0.3, bins: [[2, 0.5]], secs: 1 }], still);
    const [, strong1] = await inkRun([{ level: 0.3, bins: [[2, 0.5]], secs: 1 }, { level: 0.3, bins: [[2, 0.5]], secs: 1 }], { ...still, gain: 2 });
    check('ink: a band pours as much as its level says, and Gain scales the level', Math.abs(steady1.state.bands[2] - 128 / 255) < 1e-4 && Math.abs((steady1.state.poured - steady0.state.poured) - pourRate(128 / 255, 0.6)) <= 2
      && strong1.state.bands[2] > 0.999 && strong1.state.poured > 2.3 * steady1.state.poured && strong1.inked > steady1.inked,
      JSON.stringify({ band: [steady1.state.bands[2], strong1.state.bands[2]], poured: [steady0.state.poured, steady1.state.poured, strong1.state.poured], want: pourRate(128 / 255, 0.6) }));
    const quietBand = await inkRun([{ level: 0.3, bins: [[2, 0.07]], secs: 1.5 }], still).then((r) => r[0]);
    check('ink: a band that is all but silent pours nothing', quietBand.state.bands[2] > 0.06 && quietBand.state.poured === 0 && quietBand.inked === 0, JSON.stringify({ band: quietBand.state.bands[2], poured: quietBand.state.poured }));

    // Ten seconds on, a band pours where its place has wandered to.
    const [, wandered] = await inkRun([{ level: 0.3, secs: 10 }, { level: 0.3, bins: [[7, 1]], secs: 0.25 }], { ...still, knobs: { cameraDrift: 0, swirl: 0 } });
    const places = await wide.evaluate((clock) => [TimbreInk.placeOf([0, 0], 7, clock)[0], TimbreInk.placeOf([0, 0], 7, 0)[0]], wandered.state.clock - 0.12);
    check('ink: where a band pours wanders with time', Math.abs(wandered.state.clock - 10.25) < 1e-6 && wandered.state.left > 50 && Math.abs(wandered.state.meanX[7] - places[0]) < 0.02 && Math.abs(places[0] - places[1]) > 0.05,
      JSON.stringify({ meanX: wandered.state.meanX[7], now: places[0], atFirst: places[1] }));

    // It sinks, and it thins away.
    const [early, sunk, thinning, cleared] = await inkRun([{ level: 0.3, bins: [[3, 1]], secs: 0.4 }, { level: 0.3, secs: 1.6 }, { level: 0.3, secs: 4 }, { level: 0.3, secs: 3.5 }], still);
    check('ink: it sinks from the surface as a plume', early.state.box[3] > 1.0 && early.state.box[2] > 0.2 && sunk.state.box[2] < early.state.box[2] - 0.5 && sunk.box.h > 1.5 * early.box.h && sunk.state.left >= early.state.left && sunk.state.left < 2 * early.state.left && early.state.left > 100,
      JSON.stringify({ early: early.state.box.slice(2, 4), sunk: sunk.state.box.slice(2, 4), boxH: [early.box.h, sunk.box.h], left: [early.state.left, sunk.state.left] }));
    check('ink: in the picture, ink near the surface is in more light than ink lower down, and all of it as bright as its colour', sunk.upper > 1.08 * sunk.lower && sunk.lower > INK_BRIGHT, JSON.stringify({ upper: sunk.upper, lower: sunk.lower }));
    check('ink: left alone it thins away, and after eight and a half seconds the water is clear', thinning.state.left === sunk.state.left && thinning.cover < 0.8 * sunk.cover && thinning.cover > 0 && cleared.state.left === 0 && cleared.inked === 0 && cleared.state.poured === sunk.state.poured,
      JSON.stringify({ left: [sunk.state.left, thinning.state.left, cleared.state.left], cover: [sunk.cover, thinning.cover, cleared.cover] }));

    // Three seconds of two bands, made again here step for step from the arithmetic, as the scene should have made it: the same ink in the same places, drawn in the same colours.
    const [made] = await inkRun([{ level: 0.3, bins: [[2, 0.9], [5, 0.6]], secs: 3 }], still);
    const again = await wide.evaluate(({ frames, bytes, colorT, count }) => {
      const K = TimbreInk, follow = TimbreScene.follow, ink = K.createInk(K.SPECKS_MAX, K.SEED), share = K.shareOf(count), bands = new Float32Array(8), owed = new Float32Array(8), rate = new Float32Array(8), c = new THREE.Color(), k = K.lookFor([0, 0], share), look = [0, 0];
      let flame = 0, clock = 0, tint = [0, 0, 0];
      for (let f = 0; f < frames; f++) { const dt = 1 / 60;
        flame = follow(flame, 0.3, 0.3 > flame ? 30 : 3, dt);
        for (let b = 0; b < 8; b++) { const v = Math.min(1, bytes[b] / 255); bands[b] = follow(bands[b], v, v > bands[b] ? K.RISE : K.FALL, dt); if (v === 0) bands[b] = K.settle(bands[b]); }
        let total = 0; for (let b = 0; b < 8; b++) { rate[b] = K.pourRate(bands[b], share); total += rate[b]; }
        const part = K.pourShare(total, count);
        clock += dt;
        for (let b = 0; b < 8; b++) { owed[b] += rate[b] * part * dt; if (owed[b] >= 1) { const p = getColor(colorT + b * 0.42); c.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace); tint = [c.r, c.g, c.b]; }
          while (owed[b] >= 1) { owed[b] -= 1; K.pour(ink, count, b, bands[b], clock, tint); } }
        K.stepInk(ink, count, dt, clock, K.strengthOf(K.settle(flame), 50), 0); }
      const m = K.measure(ink, count); let colSum = 0;
      for (let i = 0; i < count; i++) { K.lookOf(look, ink.age[i], ink.size[i], k); if (look[1] === 0) continue; const lit = Math.fround(K.litOf(ink.pos[i * 3 + 1])); colSum += Math.fround(ink.tint[i * 3] * lit) + Math.fround(ink.tint[i * 3 + 1] * lit) + Math.fround(ink.tint[i * 3 + 2] * lit); }
      return { sum: m.sum, alive: m.alive, poured: ink.poured, colSum };
    }, { frames: 180, bytes: [0, 0, Math.round(0.9 * 255), 0, 0, Math.round(0.6 * 255), 0, 0], colorT: made.state.colorT, count: 18000 });
    check('ink: the scene makes the ink the arithmetic makes, step for step: the same specks in the same places, drawn in the same colours', made.state.beats === 0 && made.state.poured === again.poured && made.state.left === again.alive && again.alive > 1000
      && gap(made.state.sum, again.sum) < 0.02 && Math.abs(made.state.colSum - again.colSum) < 1e-3 * again.colSum && Math.abs(made.state.sum[1]) > 100,
      JSON.stringify({ poured: [made.state.poured, again.poured], left: [made.state.left, again.alive], sum: [made.state.sum, again.sum], colSum: [made.state.colSum, again.colSum] }));

    // The currents.
    const flow = (swirl, level) => inkRun([{ level, bins: [[3, 1]], secs: 3 }], { ...still, knobs: { cameraDrift: 0, swirl } }).then((r) => r[0]);
    const calmWater = await flow(0, 0.3), usual = await flow(50, 0.3), wild = await flow(100, 0.3), loudWater = await flow(50, 0.9);
    const wide3 = (r) => r.state.box[1] - r.state.box[0];
    check('ink: Swirl sets how strong the currents are: at 0 the ink sinks straight; and a louder voice makes them stronger', calmWater.state.strength === 0 && Math.abs(usual.state.strength - (0.1 + 0.55 * usual.state.flame)) < 1e-9 && Math.abs(wild.state.strength - 2 * (0.1 + 0.55 * wild.state.flame)) < 1e-9
      && Math.abs(usual.state.flame - 0.3) < 0.01 && loudWater.state.strength > 2 * usual.state.strength && wide3(calmWater) < 0.75 && wide3(usual) > wide3(calmWater) + 0.1 && wide3(wild) > wide3(usual) + 0.1 && wide3(loudWater) > wide3(usual) + 0.1
      && usual.box.w > calmWater.box.w + 15 && wild.box.w > usual.box.w + 15,
      JSON.stringify({ strength: [calmWater.state.strength, usual.state.strength, wild.state.strength, loudWater.state.strength], wide: [wide3(calmWater), wide3(usual), wide3(wild), wide3(loudWater)], boxW: [calmWater.box.w, usual.box.w, wild.box.w] }));

    // A beat.
    const beatSteps = [{ level: 0.05, all: 0.5, secs: 1 }, { level: 0.9, all: 0.5, secs: 0.1, mark: true }, { level: 0.05, all: 0.5, secs: 0.4 }, { level: 0.05, all: 0.5, secs: 1.5 }, { level: 0.9, all: 0.5, secs: 0.1 }];
    const [calm, hit, after, later, second] = await inkRun(beatSteps, still), [, hitDark] = await inkRun(beatSteps.slice(0, 2), { ...still, knobs: { cameraDrift: 0, glass: 0 } });
    check('ink: a beat twists the tank and rings the surface; the twist dies away, and the next beat twists it the other way', calm.state.beats === 0 && calm.state.whirl === 0 && hit.beats === 1 && Math.abs(hit.state.whirl - 1.6 * Math.exp(-0.16)) < 1e-6 && Math.abs(after.state.whirl - 1.6 * Math.exp(-0.8)) < 1e-6
      && Math.abs(later.state.whirl - 1.6 * Math.exp(-3.2)) < 1e-6 && second.beats === 1 && second.state.beats === 2 && Math.abs(second.state.whirl - (1.6 * Math.exp(-3.2) - 1.6) * Math.exp(-0.16)) < 1e-6 && hit.state.rings[0][3] === 1 && Math.abs(hit.state.rings[0][2] - 0.1) < 1e-6 && hit.state.rings[0][0] > 0.1 && hit.state.rings[0][0] < 0.9 && hit.state.rings[1][3] === 0
      && second.state.rings[1][3] === 1 && Math.abs(hit.state.surface - (0.5 + 0.3 * hit.state.flame + 0.5 * hit.state.kick)) < 1e-9 && Math.abs(hit.state.glass - (0.5 + 0.25 * hit.state.flame + 0.35 * hit.state.kick)) < 1e-9 && hit.state.kick > 0.5
      && hit.lightSum > 1.3 * calm.lightSum && hit.edge === 0 && after.fresh > RING_LIGHT && later.fresh < 0.3 * after.fresh && after.state.flame > 0.15 && after.state.flame < 0.5 && Math.abs(later.lightSum - calm.lightSum) < 0.03 * calm.lightSum && Math.abs(later.bright - calm.bright) < 0.05 * calm.bright + 20,
      JSON.stringify({ beats: [calm.state.beats, hit.beats, second.state.beats], whirl: [hit.state.whirl, after.state.whirl, later.state.whirl, second.state.whirl], rings: hit.state.rings, surface: hit.state.surface, lightSum: [calm.lightSum, hit.lightSum, later.lightSum], bright: [calm.bright, hit.bright, after.bright, later.bright], fresh: [after.fresh, later.fresh], flame: after.state.flame }));
    const fiveBeats = [{ level: 0.05, all: 0.5, secs: 1 }]; for (let n = 0; n < 5; n++) fiveBeats.push({ level: 0.9, all: 0.5, secs: 0.1 }, { level: 0.05, all: 0.5, secs: 0.5 });
    const fifth = (await inkRun(fiveBeats.slice(0, 10), still))[9], fourth = (await inkRun(fiveBeats.slice(0, 8), still))[7];
    check('ink: there are four rings, used in turn', fourth.state.beats === 4 && fourth.state.rings.every((r) => r[3] === 1) && Math.abs(fourth.state.rings[3][2] - 0.1) < 1e-6 && fourth.state.rings[0][2] > fourth.state.rings[1][2] && fourth.state.rings[1][2] > fourth.state.rings[2][2]
      && fifth.state.beats === 5 && Math.abs(fifth.state.rings[0][2] - 0.1) < 1e-6 && fifth.state.rings[1][2] > 1.5, JSON.stringify({ fourth: fourth.state.rings.map((r) => r[2]), fifth: fifth.state.rings.map((r) => r[2]) }));

    // A beat with one band far louder than the rest: the ring starts at that band's place.
    const [, ringed] = await inkRun([{ level: 0.05, bins: [[5, 0.9], [1, 0.3]], secs: 1 }, { level: 0.9, bins: [[5, 0.9], [1, 0.3]], secs: 0.1 }], still);
    const ringWant = await wide.evaluate((clock) => { const p = TimbreInk.placeOf([0, 0], 5, clock); return [(p[0] + 3.3 / 2) / 3.3, (1.5 / 2 - p[1]) / 1.5, p[1]]; }, ringed.state.clock - 0.1);
    // (The surface's sheet runs from the back of the tank to the front: a band that pours toward the front rings in the sheet's upper half.)
    check('ink: the ring starts where the loudest band pours', ringed.beats === 1 && ringed.state.rings[0][3] === 1 && Math.abs(ringed.state.rings[0][0] - ringWant[0]) < 0.002 && Math.abs(ringed.state.rings[0][1] - ringWant[1]) < 0.002 && ringWant[0] > 0.6 && Math.abs(ringWant[2]) > 0.05 && (ringWant[1] - 0.5) * ringWant[2] < 0,
      JSON.stringify({ ring: ringed.state.rings[0], want: ringWant }));
    // The same ink with a beat and without one, in still water (Swirl 0), so that the twist is all that differs.
    const twistRun = (level) => inkRun([{ level: 0.05, bins: [[7, 1]], secs: 1 }, { level, bins: [[7, 1]], secs: 0.1 }, { level: 0.05, bins: [[7, 1]], secs: 0.6 }], { ...still, knobs: { cameraDrift: 0, swirl: 0 } }).then((r) => r[2]);
    const twisted = await twistRun(0.9), untwisted = await twistRun(0.05);
    check('ink: the twist carries the ink round the tank', twisted.state.beats === 1 && untwisted.state.beats === 0 && twisted.state.strength === 0 && twisted.state.poured === untwisted.state.poured && gap(twisted.state.box, untwisted.state.box) > 0.05
      && Math.abs((twisted.state.box[4] + twisted.state.box[5]) / 2 - (untwisted.state.box[4] + untwisted.state.box[5]) / 2) > 0.03,
      JSON.stringify({ twisted: twisted.state.box, untwisted: untwisted.state.box }));

    // Glass.
    const [bright] = await inkRun(beatSteps.slice(0, 1), { ...still, knobs: { cameraDrift: 0, glass: 100 } }), [dark] = await inkRun(beatSteps.slice(0, 1), { ...still, knobs: { cameraDrift: 0, glass: 0 } });
    check('ink: Glass sets how bright the tank and the water\'s surface are drawn: not at all at 0, where the ink floats free', dark.state.glass === 0 && dark.state.surface === 0 && dark.state.shown.every((v) => v === false) && dark.light < 0.03 * calm.light && dark.inked > 0.8 * calm.inked && dark.state.left === calm.state.left
      && hitDark.light < 0.03 * calm.light && hitDark.state.beats === 1 && Math.abs(bright.state.glass - 2 * calm.state.glass) < 1e-9 && bright.state.shown.every(Boolean) && bright.lightSum > 1.5 * calm.lightSum && calm.light > 2000 && gap(dark.state.box, calm.state.box) === 0,
      JSON.stringify({ glass: [dark.state.glass, calm.state.glass, bright.state.glass], light: [dark.light, calm.light, bright.light], lightSum: [calm.lightSum, bright.lightSum], inked: [dark.inked, calm.inked] }));

    // Density.
    const dens = (density) => inkRun([{ level: 0.6, all: 0.6, secs: 2.5 }], { ...still, knobs: { cameraDrift: 0, density } }).then((r) => r[0]);
    const sparse = await dens(0), usualDens = await dens(50), dense = await dens(100);
    check('ink: Density sets how many specks there are; with fewer each is larger and covers more, so the tank looks much the same', sparse.state.count === 6000 && usualDens.state.count === 18000 && dense.state.count === 30000 && sparse.state.drawn === 6000 && dense.state.drawn === 30000
      && Math.abs(sparse.state.share - 0.2) < 1e-12 && dense.state.share === 1 && sparse.state.left <= 6000 && dense.state.left > 2.5 * sparse.state.left && dense.state.left <= 30000
      && sparse.inked > 0.55 * usualDens.inked && sparse.inked < 1.6 * usualDens.inked && dense.inked > 0.55 * usualDens.inked && dense.inked < 1.6 * usualDens.inked && sparse.cover > 0.5 * dense.cover && sparse.cover < 1.8 * dense.cover,
      JSON.stringify({ count: [sparse.state.count, usualDens.state.count, dense.state.count], left: [sparse.state.left, usualDens.state.left, dense.state.left], inked: [sparse.inked, usualDens.inked, dense.inked], cover: [sparse.cover, usualDens.cover, dense.cover] }));
    const [full, cut] = await inkRun([{ level: 0.6, all: 0.6, secs: 2.5 }, { level: 0.6, all: 0.6, secs: 0.05, knobs: { density: 0 } }], { ...still, knobs: { cameraDrift: 0, density: 100 } });
    check('ink: Density lowered while ink is in the water leaves only the specks still in use', full.state.count === 30000 && full.state.left > 6000 && cut.state.count === 6000 && cut.state.drawn === 6000 && cut.state.left <= 6000 && cut.state.next < 6000 && cut.inked > 0 && cut.state.strays === 0 && full.state.strays === 0,
      JSON.stringify({ left: [full.state.left, cut.state.left], next: cut.state.next, inked: [full.inked, cut.inked] }));

    const [, , raised] = await inkRun([{ level: 0.6, all: 0.6, secs: 2.5 }, { level: 0.6, all: 0.6, secs: 0.05, knobs: { density: 0 } }, { level: 0.6, all: 0.6, secs: 0.05, knobs: { density: 100 } }], { ...still, knobs: { cameraDrift: 0, density: 100 } });
    check('ink: Density raised again does not bring back the specks that were dropped', raised.state.count === 30000 && raised.state.drawn === 30000 && raised.state.left <= cut.state.left + 600 && raised.state.left > 0 && raised.state.strays === 0,
      JSON.stringify({ left: [full.state.left, cut.state.left, raised.state.left] }));

    // Every band full for twelve seconds: no more is poured than the specks can hold for their whole lives, so none is poured over while it is still in the water.
    const [flood1, flood2] = await inkRun([{ level: 0.9, all: 1, secs: 10 }, { level: 0.9, all: 1, secs: 2 }], still);
    check('ink: with every band full the pour is held to what the specks can hold, and the ink lives its whole life', Math.abs(flood2.state.poursAt - 0.97 * 18000 / 8.5 / (8 * pourRate(flood2.state.bands[0], 0.6))) < 1e-3 && flood2.state.poursAt < 0.4
      && Math.abs((flood2.state.poured - flood1.state.poured) - 2 * 0.97 * 18000 / 8.5) <= 8 && flood2.state.left > 0.93 * 18000 && flood2.state.left <= 18000 && inkLoud.state.poursAt < 1 && band3.state.poursAt === 1 && flood2.cover > FLOOD_COVER && flood2.state.strays === 0,
      JSON.stringify({ poursAt: flood2.state.poursAt, poured: [flood1.state.poured, flood2.state.poured], left: flood2.state.left, cover: flood2.cover, inked: flood2.inked }));

    // Colour: ink keeps the colour it was poured in.
    const [, poured0, turned] = await inkRun([{ level: 0.3, bins: [[3, 1]], secs: 1 }, { level: 0.3, secs: 1 }, { level: 0.3, secs: 0.5, hue: 2 }], still);
    check('ink: ink in the water keeps the colour it was poured in when the palette turns; the glass turns with it', like(turned.color, poured0.color) > 0.99 && like(poured0.expect[3], turned.expect[3]) < 0.97 && gap(turned.state.glassColor, poured0.state.glassColor) > 10 && turned.state.poured === poured0.state.poured && poured0.state.poured > 300,
      JSON.stringify({ ink: [poured0.color, turned.color], like: like(turned.color, poured0.color), palette: like(poured0.expect[3], turned.expect[3]), glass: [poured0.state.glassColor, turned.state.glassColor] }));

    // Camera.
    const [noDrift] = await inkRun([{ level: 0.8, all: 0.8, secs: 3 }], { gain: 1, knobs: { cameraDrift: 0 } }), [drift] = await inkRun([{ level: 0.8, all: 0.8, secs: 3 }], { gain: 1, knobs: { cameraDrift: 100 } });
    check('ink: Camera drift 0 holds the camera still; 100 doubles the sway', noDrift.state.orbit === 0 && Math.abs(inkLoud.state.orbit) > 0.005 && Math.abs(drift.state.orbit - 2 * inkLoud.state.orbit) < 1e-9 && Math.abs(noDrift.kitCam[0]) < 1e-6 && Math.abs(drift.kitCam[0]) > 1.5 * Math.abs(inkLoud.kitCam[0]) && drift.edge === 0,
      JSON.stringify({ orbit: [noDrift.state.orbit, inkLoud.state.orbit, drift.state.orbit], x: [noDrift.kitCam[0], inkLoud.kitCam[0], drift.kitCam[0]] }));

    // The same at any frame rate.
    const fpsSteps = [{ level: 0.05, all: 0.5, secs: 1 }, { level: 0.9, all: 0.8, secs: 1 }, { level: 0, all: 0, secs: 0.5 }];
    const [, , i30] = await inkRun(fpsSteps, { ...still, fps: 30 }), [, , i60] = await inkRun(fpsSteps, { ...still, fps: 60 });
    check('ink: the same sound gives the same tank at 30 and 60 fps', Math.abs(i30.state.clock - 2.5) < 1e-6 && Math.abs(i60.state.clock - 2.5) < 1e-6 && i60.state.poured > 1000 && Math.abs(i30.state.poured - i60.state.poured) < 0.03 * i60.state.poured && Math.abs(i30.state.left - i60.state.left) < 0.03 * i60.state.left
      && i30.state.steps === 2 && i60.state.steps === 1 && Math.abs(i30.state.whirl - i60.state.whirl) < 1e-9 && i60.state.beats >= 1 && gap(i30.state.box, i60.state.box) < FPS_BOX && gap(i30.state.meanX, i60.state.meanX) < FPS_MEAN && Math.abs(i30.inked - i60.inked) < 0.12 * i60.inked,
      JSON.stringify({ poured: [i30.state.poured, i60.state.poured], left: [i30.state.left, i60.state.left], whirl: [i30.state.whirl, i60.state.whirl], box: gap(i30.state.box, i60.state.box), meanX: gap(i30.state.meanX, i60.state.meanX), inked: [i30.inked, i60.inked] }));

    // Mic off.
    const [idle1, idle2] = await inkRun([{ level: null, idle: true, secs: 6 }, { level: null, idle: true, secs: 6 }], still);
    check('ink: with the mic off and Idle animation on, bands take turns to pour a little', idle1.state.live === true && Math.abs(idle2.state.clock - 12) < 1e-6 && idle2.state.poured > idle1.state.poured && idle1.state.poured > 50 && idle2.inked > 200 && idle2.state.beats === 0 && idle2.state.perBand.filter((n) => n > 0).length >= 2 && new Set(idle2.state.perBand).size >= 4
      && Math.max(...idle2.state.bands) < 0.56, JSON.stringify({ poured: [idle1.state.poured, idle2.state.poured], inked: idle2.inked, perBand: idle2.state.perBand, bands: idle2.state.bands }));
    const [off1, off2] = await inkRun([{ level: null, off: true, secs: 4 }, { level: null, off: true, secs: 1 }], still);
    check('ink: with the mic and Idle animation off nothing pours and the picture holds still', off2.state.live === false && off2.state.clock === 0 && off2.state.poured === 0 && off2.inked === 0 && same(off2) && off2.light > 2000, JSON.stringify({ poured: off2.state.poured, differs: off2.diff, clock: off2.state.clock }));
    const [live1, muted1, muted2, muted3] = await inkRun([{ level: 0.9, all: 0.8, secs: 1.5 }, { level: null, off: true, secs: 0.5 }, { level: null, off: true, secs: 9 }, { level: null, off: true, secs: 1 }], still);
    check('ink: muted in the middle of a stream, the ink in the water still thins away, and then nothing moves', live1.state.left > 1000 && muted1.state.live === false && muted1.state.clock === live1.state.clock && muted1.state.left > 0 && muted1.state.poured < live1.state.poured + 0.2 * live1.state.poured && muted2.state.left === 0 && muted2.inked === 0
      && muted2.state.poured - muted1.state.poured < 60 && muted2.state.whirl === 0 && muted2.state.flame === 0 && muted2.state.bands.every((b) => b === 0) && same(muted3) && muted1.diff.n > 1000,
      JSON.stringify({ left: [live1.state.left, muted1.state.left, muted2.state.left], poured: [live1.state.poured, muted1.state.poured, muted2.state.poured], whirl: muted2.state.whirl, differs: muted3.diff }));

    // What is sent to be drawn, placement, and cost.
    const [up1, up2] = await inkRun([{ level: 0.5, all: 0.5, secs: 0.5 }, { level: 0.5, all: 0.5, secs: 0.5 }], still);
    check('ink: every frame its specks\' places, colours and looks are sent to be drawn', [0, 1, 2].every((i) => up2.state.uploads[i] - up1.state.uploads[i] === 30) && up2.state.px > 0 && Math.abs(up2.state.px - 624 / (2 * Math.tan(15 * Math.PI / 180))) < 1e-6 && up2.state.drawnFor === 1 && up2.state.scales.every((v) => v === 1),
      JSON.stringify({ uploads: [up1.state.uploads, up2.state.uploads], px: up2.state.px, canvas: up2.canvas }));
    const [placed0] = await inkRun([{ level: 0.5, all: 0.5, secs: 2 }], still);
    await pushConfig((c) => { c.activeViz = INK; c.placement.x = 30; });
    await wide.waitForTimeout(400);
    const [placed1] = await inkRun([{ level: 0.5, all: 0.5, secs: 2 }], still);
    check('ink: Scene placement slides it', placed1.centroidX - placed0.centroidX > 150 && placed1.inked > 0.5 * placed0.inked, placed0.centroidX.toFixed(0) + ' → ' + placed1.centroidX.toFixed(0));
    await pushConfig((c) => { c.activeViz = INK; c.placement.x = 0; c.placement.size = 50; });
    await wide.waitForTimeout(400);
    const [halved] = await inkRun([{ level: 0.5, all: 0.5, secs: 2 }], still);
    // The small page draws into a picture several times taller than its canvas: the specks are sized for that picture.
    const smallInk = await page.evaluate(() => { const fr = window.frame, heard = { frequencies, micActive }; window.frame = function () {}; try { TimbreScene.testLevel = 0.5; const f = new Uint8Array(32).fill(128); frequencies = f; micActive = true; setActiveViz('visualizer'); setActiveViz('ink');
      const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
      // First the empty tank, in silence: how much light its edges give. (Edges sized for the kit's larger picture would come out in dashes.)
      const full = frequencies; frequencies = new Uint8Array(32); TimbreScene.testLevel = 0; let now = 100000; for (let i = 0; i < 30; i++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); let tankLight = 0; for (let i = 0; i < px.length; i += 4) if (px[i + 3] < 5) tankLight += px[i] + px[i + 1] + px[i + 2];
      frequencies = full; TimbreScene.testLevel = 0.5; for (let i = 0; i < 120; i++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let inked = 0; for (let i = 3; i < px.length; i += 4) if (px[i] >= 25) inked++;
      const s = window.__timbre.scene; return { name: window.__timbre.currentVizName, scale: s && s.renderScale, px: s && s.state.px, drawnFor: s && s.state.drawnFor, scales: s && s.state.scales, left: s && s.state.left, inked, tankLight, canvas: [w, h] }; } finally { TimbreScene.testLevel = null; window.frame = fr; frequencies = heard.frequencies; micActive = heard.micActive; } });
    check('ink: the Size slider halves it, and the small page draws it too, its specks and its glass sized for the picture the kit draws into', halved.box.w < 0.62 * placed0.box.w && halved.box.w > 0.38 * placed0.box.w && Math.abs(halved.state.px - 0.5 * placed0.state.px) < 1e-6 && halved.state.drawnPx === halved.state.px
      && halved.inked < 0.31 * placed0.inked && halved.inked > 0.19 * placed0.inked && smallInk.tankLight > SMALL_TANK
      && smallInk.name === INK && smallInk.scale >= 2 && smallInk.drawnFor === smallInk.scale && smallInk.scales.every((v) => v === smallInk.scale) && Math.abs(smallInk.px - 0.5 * smallInk.scale * smallInk.canvas[1] / (2 * Math.tan(15 * Math.PI / 180))) < 1e-6
      && smallInk.left > 500 && smallInk.inked > 0.015 * smallInk.canvas[0] * smallInk.canvas[1],
      JSON.stringify({ box: [placed0.box.w, halved.box.w], inked: [placed0.inked, halved.inked], px: [placed0.state.px, halved.state.px], small: smallInk }));
    await pushConfig((c) => { c.placement.size = 100; });
    await wide.waitForTimeout(300);
    // The tank filled (every band full for nine seconds), at Density 100 and at 50; then a frame's script time, and a frame drawn and finished by the GPU.
    const costAt = async (density) => { await pushConfig((c) => { c.activeViz = INK; c.perViz.ink.density = density; }); await wide.waitForTimeout(300);
      return wide.evaluate(() => { const fr = window.frame, heard = { frequencies, micActive }; window.frame = function () {}; try { TimbreScene.testLevel = 0.9; frequencies = new Uint8Array(32).fill(255); micActive = true; setActiveViz('visualizer'); setActiveViz('ink');
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), one = new Uint8Array(4); let now = performance.now(), script = 0, whole = 0;
        for (let i = 0; i < 540; i++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
        for (let i = 0; i < 60; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); script += performance.now() - t; }
        for (let i = 0; i < 60; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one); whole += performance.now() - t; }
        return { script: script / 60, whole: whole / 60, left: window.__timbre.scene.state.left, count: window.__timbre.scene.state.count }; } finally { TimbreScene.testLevel = null; window.frame = fr; frequencies = heard.frequencies; micActive = heard.micActive; } }); };
    const costFull = await costAt(100), costUsual = await costAt(50);
    await pushConfig((c) => { c.perViz.ink.density = 50; });
    check('ink: with the tank full of all 30,000 specks, draw() averages under 6 ms of script time, and a frame drawn and finished by the GPU under 10 ms (' + costFull.script.toFixed(2) + ' and ' + costFull.whole.toFixed(2) + ' ms)', costFull.left > 0.9 * 30000 && costFull.count === 30000 && costFull.script < 6 && costFull.whole < 10, JSON.stringify(costFull));
    check('ink: at the usual Density, draw() averages under 4 ms and a finished frame under 7 ms (' + costUsual.script.toFixed(2) + ' and ' + costUsual.whole.toFixed(2) + ' ms)', costUsual.left > 0.9 * 18000 && costUsual.count === 18000 && costUsual.script < 4 && costUsual.whole < 7, JSON.stringify(costUsual));

    }

    // ── The shards (a kit scene: a broken pane of mirror glass that the sound opens up) ────
    {   // its own block: the names below are the shards' own
    // Build the scene afresh, drive the level and the 32 bins by hand, and read the canvas and
    // the scene after each step. A step gives level (null: whatever the kit hears), secs, and
    // either all (every bin, 0..1) or bins ([[bin, 0..1], ...]); idle: true has the mic off,
    // off: true has the mic and Idle animation off; hue sets the palette's hue from that step
    // on; knobs sets settings from that step on. grid: true reads the shards' colours cell by
    // cell; probe: true looks at the pixel in the middle of each shard's mirror and cut sides.
    // Beside the scene, the pane is made again here from the arithmetic alone, frame for frame
    // (the bands followed, what is remembered of them, of the voice and of the beat, how far
    // open each shard is and where that puts every corner), and model says how far the scene's
    // own is from it.
    const SHARDS = 'shards';
    const shardRun = (steps, { fps = 60, knobs = null, hue = null, colorSpeed = null, gain = null } = {}) => wide.evaluate(({ id, steps, fps, knobs, hue, colorSpeed, gain }) => {
      window.frame = function () {};
      const saved = { frequencies, micActive, cfgIdleAnim, cfgColorHue, cfgColorSpeed, cfgGain }, knobs0 = Object.assign({}, perViz[id]);
      try {
        if (knobs) Object.assign(perViz[id], knobs);
        if (hue !== null) cfgColorHue = hue;
        if (colorSpeed !== null) cfgColorSpeed = colorSpeed;
        if (gain !== null) cfgGain = gain;
        TimbreScene.testLevel = 0;
        setActiveViz('visualizer'); setActiveViz(id);
        const K = TimbreShards, follow = TimbreScene.follow, mk = () => TimbreScene.createHistory(K.HISTORY, K.HISTORY_HZ);
        const m = { bands: new Float32Array(8), hist: Array.from({ length: 8 }, mk), voice: mk(), beat: mk(), clock: 0 }, panes = {};
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), f = new Uint8Array(32), out = [];
        let now = 100000 + 1000 / 120, last = null;
        for (const st of steps) {
          TimbreScene.testLevel = st.level;
          micActive = !st.idle && !st.off;
          cfgIdleAnim = st.off ? false : saved.cfgIdleAnim;
          if (st.knobs) Object.assign(perViz[id], st.knobs);
          if (st.hue !== undefined) cfgColorHue = st.hue;
          f.fill(st.all !== undefined ? Math.round(st.all * 255) : 0);
          if (st.bins) for (const [i, v] of st.bins) f[i] = Math.round(v * 255);
          frequencies = f;
          let beats = 0;
          for (let i = 0, n = Math.round(st.secs * fps); i < n; i++) {
            now += 1000 / fps;
            const b0 = window.__timbre.scene ? window.__timbre.scene.state.beats : 0, dt = 1 / fps;
            currentViz.draw(now, dt);
            const live = window.__timbre.scene.state;
            if (live.beats > b0) beats++;
            if (micActive || cfgIdleAnim) m.clock += dt;
            for (let b = 0; b < 8; b++) {
              let v = 0;
              if (micActive) v = K.loudness(frequencies, b, cfgGain); else if (cfgIdleAnim) v = K.idle(b, m.clock);
              m.bands[b] = follow(m.bands[b], v, v > m.bands[b] ? K.RISE : K.FALL, dt);
              if (v === 0) m.bands[b] = K.settle(m.bands[b]);
              m.hist[b].step(m.bands[b], dt);
            }
            m.voice.step(live.flame, dt); m.beat.step(live.kick, dt);
          }
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);   // row 0 is the bottom of the canvas
          // solid: pixels a shard covers. part: pixels at a shard's rim. light: pixels of light over the background (the light behind the pane).
          // white: solid pixels all but white (a shard catching a lamp). dark: solid pixels that are dark (their three colours come to less than 150 of 765). edge: anything at the canvas's edge.
          let solid = 0, part = 0, light = 0, lightSum = 0, edge = 0, sx = 0, white = 0, dark = 0, sum = 0, sumSq = 0, hash = 2166136261;
          for (let i = 0; i < px.length; i++) hash = Math.imul(hash ^ px[i], 16777619) >>> 0;
          const box = [w, -1, h, -1], color = [0, 0, 0];
          for (let i = 0; i < px.length; i += 4) {
            const x = (i / 4) % w, y = Math.floor(i / 4 / w), rgb = px[i] + px[i + 1] + px[i + 2], a = px[i + 3];
            if (a >= 250) {
              solid++; sx += x; sum += rgb; sumSq += rgb * rgb; color[0] += px[i]; color[1] += px[i + 1]; color[2] += px[i + 2];
              if (px[i] > 215 && px[i + 1] > 215 && px[i + 2] > 215) white++;
              if (rgb < 150) dark++;
              if (x < box[0]) box[0] = x; if (x > box[1]) box[1] = x; if (y < box[2]) box[2] = y; if (y > box[3]) box[3] = y;
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
            } else if (a >= 25) {
              part++;
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
            } else if (a < 5 && rgb > 12) {
              light++; lightSum += rgb;
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
            }
          }
          // Light seen inside the box the shards lie in: what leaks through the cracks and between open shards.
          let cracks = 0;
          if (box[1] >= 0) for (let y = box[2]; y <= box[3]; y++) for (let x = box[0]; x <= box[1]; x++) { const i = (y * w + x) * 4; if (px[i + 3] < 5 && px[i] + px[i + 1] + px[i + 2] > 12) cracks++; }
          const diff = { n: 0, max: 0 };
          if (last) for (let i = 0; i < px.length; i++) { const d = Math.abs(px[i] - last[i]); if (d) { diff.n++; if (d > diff.max) diff.max = d; } }
          last = px;
          const s = window.__timbre.scene, state = (s && s.state) || {};
          // The pane made again from the arithmetic.
          const dens = perViz[id].density, pane = panes[dens] || (panes[dens] = K.createPane(dens, K.SEED));
          const open = new Float32Array(pane.count), pos = new Float32Array(pane.verts * 3), norm = new Float32Array(pane.verts * 3), shown = new Float32Array(pane.verts);
          const mean = K.openAll(open, pane, m.voice, m.hist, m.beat, K.amountOf(perViz[id].bloom));
          K.place(pane, open, pos, norm, shown);
          let posSum = 0, normSum = 0, gapOpen = state.opens && state.opens.length === pane.count ? 0 : 99;
          for (let i = 0, n = pane.verts * 3; i < n; i++) { posSum += pos[i] * ((i % 7) + 1); normSum += norm[i] * ((i % 5) + 1); }
          if (!gapOpen) for (let i = 0; i < pane.count; i++) gapOpen = Math.max(gapOpen, Math.abs(open[i] - state.opens[i]));
          const ring = (test) => { let t = 0, n = 0; for (let i = 0; i < pane.count; i++) if (test(pane.d[i])) { t += state.opens[i]; n++; } return n ? t / n : 0; };
          const byBand = Array.from({ length: 8 }, (_, b) => { let t = 0, n = 0; for (let i = 0; i < pane.count; i++) if (pane.band[i] === b) { t += state.opens[i]; n++; } return n ? t / n : 0; });
          const model = { gapOpen, gapPos: Math.abs(posSum - state.posSum) / (1 + Math.abs(posSum)), gapNorm: Math.abs(normSum - state.normSum) / (1 + Math.abs(normSum)), mean, bands: Array.from(m.bands), clock: m.clock,
            inner: ring((d) => d < 0.15), mid: ring((d) => d > 0.4 && d < 0.6), outer: ring((d) => d > 0.85), byBand,
            pal: [0, 1, 2, 3, 4, 5].map((i) => getColor(state.colorT + (i * PALETTE.length) / 6).slice(0, 3)), glowColor: getColor(state.colorT + PALETTE.length / 2).slice(0, 3) };
          // The shards' mean colour in each of 8 x 6 cells of the box they lie in, left to right and bottom to top (-1 where a cell has fewer than 40 of their pixels).
          let grid = null;
          if (st.grid && box[1] >= 0) {
            const gw = 8, gh = 6, acc = new Float64Array(gw * gh * 4);
            for (let y = box[2]; y <= box[3]; y++) for (let x = box[0]; x <= box[1]; x++) {
              const i = (y * w + x) * 4; if (px[i + 3] < 250) continue;
              const c = (Math.min(gh - 1, Math.floor(((y - box[2]) * gh) / (box[3] - box[2] + 1))) * gw + Math.min(gw - 1, Math.floor(((x - box[0]) * gw) / (box[1] - box[0] + 1)))) * 4;
              acc[c] += px[i]; acc[c + 1] += px[i + 1]; acc[c + 2] += px[i + 2]; acc[c + 3]++;
            }
            grid = [];
            for (let c = 0; c < gw * gh; c++) { const n = acc[c * 4 + 3]; for (let a = 0; a < 3; a++) grid.push(n < 40 ? -1 : Math.round(acc[c * 4 + a] / n)); }
          }
          // One shard at a time: the pixel where the camera saw the middle of its mirror, and of each of its cut sides, when that face was turned to the camera,
          // large enough to find and not hidden. tops, sides: how many were found. topLike, sideLike: how many are the colour of the light behind the pane
          // (the same hue to within 0.97, 1 being the same). sideSum: how bright the sides are in all (the three colours added, of 765 each).
          const probe = { tops: 0, topLike: 0, sides: 0, sideLike: 0, sideSum: 0 };
          if (st.probe && state.world && state.view && state.proj) {
            const Wm = state.world, Vm = state.view, Pm = state.proj, cam = s.camera, g = state.glowColor, gl2 = Math.hypot(...g) || 1;
            const mul = (mt, v) => [mt[0] * v[0] + mt[4] * v[1] + mt[8] * v[2] + mt[12] * v[3], mt[1] * v[0] + mt[5] * v[1] + mt[9] * v[2] + mt[13] * v[3], mt[2] * v[0] + mt[6] * v[1] + mt[10] * v[2] + mt[14] * v[3], mt[3] * v[0] + mt[7] * v[1] + mt[11] * v[2] + mt[15] * v[3]];
            const seen = (v) => { const a = mul(Wm, [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2], 1]), c = mul(Pm, mul(Vm, a)); return { world: a, x: ((c[0] / c[3]) * 0.5 + 0.5) * w - 0.5, y: ((c[1] / c[3]) * 0.5 + 0.5) * h - 0.5 }; };
            const facing = (v, a) => { const n = mul(Wm, [norm[v * 3], norm[v * 3 + 1], norm[v * 3 + 2], 0]), d = [cam[0] - a[0], cam[1] - a[1], cam[2] - a[2]]; return (n[0] * d[0] + n[1] * d[1] + n[2] * d[2]) / Math.hypot(...d); };
            const look = (verts, least) => {
              const ps = verts.map(seen); let area = 0, mx = 0, my = 0;
              for (let q = 0; q < ps.length; q++) { const a = ps[q], b = ps[(q + 1) % ps.length]; area += a.x * b.y - b.x * a.y; mx += a.x / ps.length; my += a.y / ps.length; }
              if (Math.abs(area) / 2 < least || facing(verts[0], ps[0].world) < 0.3 || !(mx >= 0 && my >= 0 && mx < w - 1 && my < h - 1)) return null;
              const i = (Math.round(my) * w + Math.round(mx)) * 4;
              if (px[i + 3] < 250) return null;
              const c = [px[i], px[i + 1], px[i + 2]];
              return { like: (c[0] * g[0] + c[1] * g[1] + c[2] * g[2]) / ((Math.hypot(...c) || 1) * gl2), sum: c[0] + c[1] + c[2] };
            };
            for (let i = 0; i < pane.count; i++) {
              const s0 = pane.start[i], n = (pane.start[i + 1] - s0) / 6, top = look(Array.from({ length: n }, (_, c) => s0 + c), 150);
              if (top) { probe.tops++; if (top.like > 0.97) probe.topLike++; }
              for (let c = 0; c < n; c++) { const side = look([0, 1, 2, 3].map((q) => s0 + 2 * n + c * 4 + q), 25); if (side) { probe.sides++; probe.sideSum += side.sum; if (side.like > 0.97) probe.sideLike++; } }
            }
          }
          const size = (b) => ({ w: b[1] < 0 ? 0 : b[1] - b[0] + 1, h: b[3] < 0 ? 0 : b[3] - b[2] + 1, x0: b[0], x1: b[1], y0: b[2], y1: b[3] });
          out.push({ state, model, solid, part, light, lightSum, edge, beats, white, dark, cracks, grid, probe, bright: solid ? sum / solid : 0, vary: solid ? Math.sqrt(Math.max(0, sumSq / solid - (sum / solid) ** 2)) : 0,
            color: solid ? color.map((v) => v / solid) : [0, 0, 0], centroidX: solid ? sx / solid : 0, box: size(box), cornerAlpha: px[3], canvas: [w, h], hash, diff, kitCam: s ? s.camera : null });
        }
        return out;
      } finally {
        frequencies = saved.frequencies; micActive = saved.micActive; cfgIdleAnim = saved.cfgIdleAnim; cfgColorHue = saved.cfgColorHue; cfgColorSpeed = saved.cfgColorSpeed; cfgGain = saved.cfgGain;
        Object.assign(perViz[id], knobs0); TimbreScene.testLevel = null;
      }
    }, { id: SHARDS, steps, fps, knobs, hue, colorSpeed, gain });
    const gap = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    // A picture is as the last one was, but for the two stray pixels this GPU allows itself (see the glass prism's block).
    const same = (r) => r.diff.n <= 8 && r.diff.max <= 1;
    const remade = (r) => r.model.gapOpen < 1e-6 && r.model.gapPos < 1e-6 && r.model.gapNorm < 1e-6;
    const still = { knobs: { cameraDrift: 0 }, colorSpeed: 0, gain: 1 };
    // The shut pane: how many pixels its shards cover, the box they lie in (left, right, bottom, top), how bright they are on average
    // (the sum of the three colours, of 765) and how much that varies across the pane (the soft lights in the mirror). Measured.
    const PANE_SOLID = 134457, PANE_BOX = [635, 1114, 166, 493], PANE_BRIGHT = 350, PANE_VARY = 121;
    // Pixels of light seen through the shut pane's cracks, at least and at most. Measured.
    const CRACKS = [300, 700];
    // Solid pixels all but white when the pane is open and loud (shards catching a lamp), at least. Measured, and half of it.
    const FLASHES = 1000;
    // The shards' colours cell by cell (see the runner), for the shut pane and for the pane after two seconds of every band at 0.8: measured. And how far a cell's
    // colour may be from it: a few times what two runs differ by.
    const PANE_GRID = [79, 163, 112, 71, 160, 103, 58, 153, 109, 37, 130, 105, 34, 139, 104, 27, 134, 115, 30, 133, 114, 11, 102, 94, 93, 160, 123, 65, 150, 108, 35, 135, 108, 45, 134, 107, 20, 119, 104, 14, 109, 99, 4, 113, 111, 4, 104, 97, 70, 147, 115, 103, 154, 138, 68, 136, 121, 41, 112, 107, 28, 126, 117, 7, 110, 102, 5, 112, 106, 3, 104, 95, 126, 176, 163, 80, 141, 131, 83, 141, 140, 74, 141, 143, 37, 140, 132, 27, 142, 138, 50, 168, 167, 61, 173, 170, 123, 166, 156, 108, 167, 161, 113, 169, 170, 73, 144, 141, 78, 163, 161, 87, 180, 181, 57, 176, 178, 46, 180, 179, 121, 170, 158, 143, 190, 188, 137, 191, 196, 103, 183, 184, 90, 183, 185, 66, 168, 172, 61, 178, 181, 70, 184, 188], OPEN_GRID = [136, 114, 100, 125, 73, 87, 125, 77, 88, 163, 181, 144, 137, 118, 110, 84, 122, 150, 69, 132, 156, 97, 144, 168, 141, 127, 115, 106, 78, 73, 135, 74, 96, 172, 142, 142, 117, 137, 156, 63, 136, 133, 116, 115, 203, 100, 82, 181, 75, 123, 78, 121, 102, 102, 156, 113, 124, 190, 139, 191, 141, 136, 175, 153, 70, 185, 145, 111, 189, 82, 67, 166, 110, 146, 134, 141, 149, 166, 176, 116, 192, 173, 73, 207, 128, 93, 207, 86, 111, 167, 223, 159, 229, 190, 162, 222, 124, 150, 170, 100, 138, 191, 142, 99, 201, 171, 75, 204, 161, 56, 202, 213, 154, 233, 214, 97, 226, 128, 85, 186, 100, 141, 120, 72, 144, 183, 149, 86, 206, 195, 90, 214, 174, 59, 200, 223, 128, 226, 190, 140, 221, 137, 86, 209], GRID_TOL = 3;
    // With the pane wide open: how many cut sides must be found turned to the camera, and how bright they are on average at least (the three colours added). Measured.
    const SIDES_SEEN = 150, SIDE_BRIGHT = 450;
    // How far apart the openings may be at 30 and at 60 frames a second, after the same sound. Measured, and set a few times over.
    const FPS_OPEN = 0.03;
    // How many times more of the wide-open pane is all but white on a beat than a second after it. Measured, and set halfway to 1.
    const BEAT_FLASH = 1.5;
    // The share of the shards' pixels that may be dark with the pane wide open and the camera swung furthest to the right, which is when the shards on the
    // left have tipped past edge-on. Measured with a shard's back drawn as a mirror (as it is: none) and drawn dark (as it was at first: 1.5%), and set between.
    const DARK_MOST = 0.004;

    await activate(SHARDS);
    const shState = await sceneState();
    const [shLoud] = await shardRun([{ level: 0.8, all: 0.8, secs: 3 }], { gain: 1 });
    const [shHush] = await shardRun([{ level: 0, secs: 2, grid: true }], still);
    const [shOpen] = await shardRun([{ level: 0.8, all: 0.8, secs: 2, grid: true, probe: true }], still), [shWide] = await shardRun([{ level: 0.8, all: 0.8, secs: 2, probe: true }], { ...still, knobs: { cameraDrift: 0, bloom: 100 } });
    check('shards is a kit scene: solid shards in front of a light, with a transparent corner and nothing at the edge',
      !!shState && shState.active === true && shState.targetSize[0] === 1728 && shLoud.solid > 0.8 * PANE_SOLID && shLoud.state.solid === true && shLoud.state.light === true && shLoud.state.neverCulled === true && shLoud.cornerAlpha === 0 && shLoud.edge === 0
        && shLoud.state.count === 280 && shLoud.state.verts === 5808 && shLoud.state.indices === 8256 && shLoud.state.drawn === 8256 && shLoud.state.spokes === 22 && shLoud.state.rings === 8 && shLoud.state.breaks === 1
        && gap(shLoud.state.turn, [-0.05, -0.26, 0.03]) < 1e-12 && gap(shLoud.state.glowAt, [-0.38, 0.14, -0.55]) < 1e-12 && shLoud.state.glowDrawn[0] === shLoud.state.glow && shLoud.state.glowDrawn[1] === shLoud.state.glowSize && shLoud.state.glowDrawn[2] === 6.4
        && shLoud.state.lit[0] === shLoud.state.flame && shLoud.state.lit[1] === shLoud.state.kick && shLoud.state.lit[2] === shLoud.state.shift && shLoud.state.open > 0.6 && shLoud.part < 0.2 * shLoud.solid,
      JSON.stringify({ size: shState && shState.targetSize, solid: shLoud.solid, part: shLoud.part, light: shLoud.light, corner: shLoud.cornerAlpha, edge: shLoud.edge, box: shLoud.box, open: shLoud.state.open }));
    check('shards: in silence the pane is shut, every shard in its place', shHush.state.opens.length === 280 && shHush.state.opens.every((v) => v === 0) && shHush.state.open === 0 && shHush.state.most === 0 && shHush.state.bands.every((b) => b === 0) && shHush.state.flame === 0
      && Math.abs(shHush.state.glow - 0.05) < 1e-12 && Math.abs(shHush.state.glowSize - 3.8) < 1e-12 && shHush.state.box[0] > -1.81 && shHush.state.box[1] < 1.81 && shHush.state.box[2] > -1.16 && shHush.state.box[3] < 1.16 && shHush.state.box[4] > -0.06 && shHush.state.box[5] < 0.06
      && shHush.edge === 0 && remade(shHush), JSON.stringify({ open: shHush.state.open, glow: shHush.state.glow, box: shHush.state.box, model: [shHush.model.gapOpen, shHush.model.gapPos, shHush.model.gapNorm] }));
    check('shards: the shut pane is drawn as it was measured: a mirror with soft lights in it, where it lies, with light leaking through its cracks', Math.abs(shHush.solid - PANE_SOLID) < 0.03 * PANE_SOLID
      && gap([shHush.box.x0, shHush.box.x1, shHush.box.y0, shHush.box.y1], PANE_BOX) <= 3 && Math.abs(shHush.bright - PANE_BRIGHT) < 0.12 * PANE_BRIGHT && shHush.vary > 0.7 * PANE_VARY && shHush.cracks >= CRACKS[0] && shHush.cracks <= CRACKS[1],
      JSON.stringify({ solid: shHush.solid, box: shHush.box, bright: shHush.bright, vary: shHush.vary, cracks: shHush.cracks, light: shHush.light, white: shHush.white }));
    check('shards: every shard is where the arithmetic puts it, frame for frame: the bands followed, the ripple, how far open, every corner and the way it faces', remade(shLoud) && Math.abs(shLoud.model.mean - shLoud.state.open) < 1e-6 && shLoud.state.shownSum > 0
      && gap(shLoud.model.bands, shLoud.state.bands) < 1e-9 && Math.abs(shLoud.model.clock - shLoud.state.clock) < 1e-9, JSON.stringify({ model: [shLoud.model.gapOpen, shLoud.model.gapPos, shLoud.model.gapNorm], mean: [shLoud.model.mean, shLoud.state.open] }));
    check('shards: open, the shards have left the pane toward the viewer and spread, and some catch a lamp', shLoud.state.box[5] > 0.8 && shLoud.state.box[1] - shLoud.state.box[0] > 3.9 && shLoud.box.w > shHush.box.w + 20 && shLoud.white > FLASHES && shLoud.cracks > 3 * shHush.cracks
      && Math.abs(shLoud.state.most - 0.92) < 1e-6, JSON.stringify({ box: shLoud.state.box, w: [shHush.box.w, shLoud.box.w], white: [shHush.white, shLoud.white], cracks: [shHush.cracks, shLoud.cracks], most: shLoud.state.most }));

    // The picture, cell by cell and shard by shard.
    check('shards: the shut pane\'s colours are as they were measured, cell by cell: the sky the mirrors show, its soft lights, and where they fall', shHush.grid.length === 144 && gap(shHush.grid, PANE_GRID) <= GRID_TOL,
      JSON.stringify({ worst: gap(shHush.grid, PANE_GRID), grid: shHush.grid }));
    check('shards: and the open pane\'s, lit by the voice', shOpen.grid.length === 144 && gap(shOpen.grid, OPEN_GRID) <= GRID_TOL && remade(shOpen), JSON.stringify({ worst: gap(shOpen.grid, OPEN_GRID), grid: shOpen.grid }));
    check('shards: a shard\'s cut sides glow in the colour of the light behind the pane, brighter the wider it is open (so bright, wide open, that they are all but white); its mirror shows the sky, which is mostly other colours',
      shOpen.probe.sides > SIDES_SEEN && shOpen.probe.sideLike > 0.75 * shOpen.probe.sides && shOpen.probe.sideSum > SIDE_BRIGHT * shOpen.probe.sides && shWide.probe.sides > SIDES_SEEN
        && shWide.probe.sideSum / shWide.probe.sides > shOpen.probe.sideSum / shOpen.probe.sides + 40 && shOpen.probe.tops > 100 && shOpen.probe.topLike < 0.2 * shOpen.probe.tops, JSON.stringify({ open: shOpen.probe, wide: shWide.probe, glow: shWide.state.glowColor }));

    // The ripple.
    const [early, later, passed] = await shardRun([{ level: 0.9, secs: 0.12 }, { level: 0, secs: 0.3 }, { level: 0, secs: 1.2 }], still);
    check('shards: a syllable opens the pane at the point of impact first, and travels outward to the far corners', early.model.inner > 0.3 && early.model.mid < 0.03 && early.model.outer === 0 && later.model.mid > 0.2 && later.model.outer === 0 && later.model.inner < early.model.inner
      && passed.model.outer > 2 * passed.model.inner && passed.model.outer > 0.01 && remade(early) && remade(later) && remade(passed)
      && [early, later, passed].every((r) => Math.abs(r.state.most - Math.max(...r.state.opens)) < 1e-9) && passed.state.most > passed.state.opens[0] + 0.01,
      JSON.stringify({ early: [early.model.inner, early.model.mid, early.model.outer], later: [later.model.inner, later.model.mid, later.model.outer], passed: [passed.model.inner, passed.model.mid, passed.model.outer] }));

    // A band and its sectors.
    const one = (bins, opts = still) => shardRun([{ level: 0, bins, secs: 1.5 }], opts).then((r) => r[0]);
    const band2 = await one([[2, 1]]), band5 = await one([[5, 1]]), band12 = await one([[12, 1]]), half2 = await one([[2, 0.5]]), gained2 = await one([[2, 0.5]], { ...still, gain: 2 });
    check('shards: each sector of the pane opens with its own band, and with no other', Math.abs(band2.model.byBand[2] - 0.65) < 0.005 && band2.model.byBand.every((v, b) => b === 2 || v === 0) && Math.abs(band5.model.byBand[5] - 0.65) < 0.005 && band5.model.byBand.every((v, b) => b === 5 || v === 0)
      && band12.state.opens.every((v) => v === 0) && band2.solid > 0 && remade(band2) && remade(band5), JSON.stringify({ band2: band2.model.byBand, band5: band5.model.byBand }));
    check('shards: a band is as loud as its bin, times Gain', Math.abs(half2.model.byBand[2] - 0.325) < 0.005 && Math.abs(gained2.model.byBand[2] - 0.65) < 0.005 && Math.abs(half2.state.bands[2] - 0.5 * 128 / 127.5) < 0.01 && Math.abs(gained2.state.bands[2] - 2 * half2.state.bands[2]) < 0.01,
      JSON.stringify({ half: half2.model.byBand[2], gained: gained2.model.byBand[2], bands: [half2.state.bands[2], gained2.state.bands[2]] }));
    const hiss = await one([[0, 0.07], [2, 0.07], [5, 0.07]]), heard = await one([[2, 0.1]]);
    check('shards: a band quieter than 0.08 is not heard, so a room\'s hiss leaves the pane shut', hiss.state.opens.every((v) => v === 0) && hiss.state.bands.every((b) => b === 0) && Math.abs(hiss.solid - shHush.solid) < 0.01 * shHush.solid
      && heard.model.byBand[2] > 0.05 && heard.state.bands[2] > 0.09 && remade(hiss) && remade(heard), JSON.stringify({ hiss: [hiss.state.open, hiss.state.bands], heard: [heard.model.byBand[2], heard.state.bands[2]] }));
    const [risen, fallen] = await shardRun([{ level: 0, bins: [[2, 1]], secs: 0.1 }, { level: 0, secs: 0.5 }], still);
    check('shards: a band is followed quick up and slower down', Math.abs(risen.state.bands[2] - (1 - Math.exp(-2))) < 1e-6 && Math.abs(fallen.state.bands[2] - (1 - Math.exp(-2)) * Math.exp(-2)) < 1e-6 && risen.state.bands.every((v, b) => b === 2 || v === 0),
      JSON.stringify({ risen: risen.state.bands[2], fallen: fallen.state.bands[2] }));

    // A beat.
    const beatSteps = [{ level: 0.05, secs: 1 }, { level: 0.9, secs: 0.1 }, { level: 0.05, secs: 0.32 }];
    const [calm, hit, ringing] = await shardRun(beatSteps, still);
    check('shards: a beat sends a ring outward ahead of the voice, and the light behind the pane flares', calm.beats === 0 && hit.beats === 1 && hit.state.beats === 1 && hit.state.kick > 0.5 && Math.abs(hit.state.glow - (0.05 + 0.26 * hit.state.flame + 0.3 * hit.state.kick)) < 1e-9
      && Math.abs(hit.state.glowSize - (3.8 + hit.state.flame + 0.8 * hit.state.kick)) < 1e-9 && hit.state.glow > calm.state.glow + 0.25 && hit.state.lit[1] === hit.state.kick && hit.state.lit[0] === hit.state.flame && hit.lightSum > 2 * calm.lightSum && hit.state.most > calm.state.most + 0.5 && ringing.model.outer > calm.model.outer + 0.3
      && remade(hit) && remade(ringing), JSON.stringify({ beats: [calm.beats, hit.beats], kick: hit.state.kick, glow: [calm.state.glow, hit.state.glow], light: [calm.lightSum, hit.lightSum], most: [calm.state.most, hit.state.most], outer: [calm.model.outer, ringing.model.outer], mid: ringing.model.mid }));
    // The pane held as wide open as it goes (so that nothing moves), a beat, and a second later: on the beat the shards that catch a lamp flash harder.
    const [, onBeat, afterBeat] = await shardRun([{ level: 0.5, all: 1, secs: 2 }, { level: 0.95, all: 1, secs: 0.1 }, { level: 0.95, all: 1, secs: 1 }], { ...still, knobs: { cameraDrift: 0, bloom: 100 } });
    check('shards: on a beat the shards that catch a lamp flash harder', onBeat.beats === 1 && onBeat.state.kick > 0.5 && afterBeat.state.kick < 0.02 && afterBeat.state.flame >= onBeat.state.flame && gap(onBeat.state.opens, afterBeat.state.opens) < 1e-6
      && onBeat.state.opens.every((v) => Math.abs(v - 1.7) < 1e-6) && onBeat.white > BEAT_FLASH * afterBeat.white && afterBeat.white > 500,
      JSON.stringify({ kick: [onBeat.state.kick, afterBeat.state.kick], flame: [onBeat.state.flame, afterBeat.state.flame], white: [onBeat.white, afterBeat.white] }));

    // Bloom.
    const bloomAt = (bloom) => shardRun([{ level: 0.8, all: 0.8, secs: 3 }], { ...still, knobs: { cameraDrift: 0, bloom } }).then((r) => r[0]);
    const bloom0 = await bloomAt(0), bloom50 = await bloomAt(50), bloom100 = await bloomAt(100);
    check('shards: Bloom 0 keeps the pane shut while its lights still change; 100 opens it twice as far, and no further than the widest', bloom0.state.opens.every((v) => v === 0) && bloom0.state.amount === 0 && Math.abs(bloom0.solid - shHush.solid) < 0.02 * shHush.solid
      && bloom0.state.glow > 0.2 && bloom0.bright > 1.1 * shHush.bright && bloom50.state.amount === 1 && bloom100.state.amount === 2 && bloom100.state.open > 1.4 * bloom50.state.open && bloom100.state.most <= 1.7 + 1e-6 && bloom100.state.most > 1.6
      && bloom100.state.box[5] > bloom50.state.box[5] + 0.3 && bloom100.edge === 0 && remade(bloom0) && remade(bloom100),
      JSON.stringify({ open: [bloom0.state.open, bloom50.state.open, bloom100.state.open], most: bloom100.state.most, bright: [shHush.bright, bloom0.bright], z: [bloom50.state.box[5], bloom100.state.box[5]], edge: bloom100.edge }));
    // The widest opening there is, with the camera swaying as far as it goes, at four moments of its sway: swung to one side, and to the other.
    const widest = await shardRun([{ level: 1, all: 1, secs: 1.5 }, { level: 1, all: 1, secs: 7 }, { level: 1, all: 1, secs: 9 }, { level: 1, all: 1, secs: 14 }], { colorSpeed: 0, gain: 1, knobs: { cameraDrift: 100, bloom: 100 } });
    check('shards: wide open, every shard is still in the picture, however far the camera has swayed', widest.every((r) => r.edge === 0 && r.box.x0 > 8 && r.box.x1 < r.canvas[0] - 8 && r.box.y0 > 8 && r.box.y1 < r.canvas[1] - 8 && r.state.most > 1.69)
      && Math.max(...widest.map((r) => r.state.orbit)) > 0.3 && Math.min(...widest.map((r) => r.state.orbit)) < -0.3, JSON.stringify(widest.map((r) => ({ box: r.box, orbit: r.state.orbit, most: r.state.most }))));
    check('shards: a shard that has tipped past edge-on, as the camera sees it, shows a mirror too and not a dark back', widest[1].dark < DARK_MOST * widest[1].solid && widest[1].state.orbit > 0.38 && widest.every((r) => r.solid > 30000),
      JSON.stringify(widest.map((r) => ({ dark: r.dark, solid: r.solid, share: r.dark / r.solid, orbit: r.state.orbit }))));

    // Density.
    const densAt = (density) => shardRun([{ level: 0.6, all: 0.6, secs: 1.5 }], { ...still, knobs: { cameraDrift: 0, density } }).then((r) => r[0]);
    const dens0 = await densAt(0), dens100 = await densAt(100);
    check('shards: Density breaks the pane more coarsely or more finely', dens0.state.count === 91 && dens0.state.spokes === 12 && dens0.state.rings === 5 && dens0.state.drawn === dens0.state.indices && dens100.state.count === 545 && dens100.state.spokes === 32 && dens100.state.rings === 11
      && dens100.state.drawn === dens100.state.indices && dens100.state.indices > 2 * dens0.state.indices && dens0.edge === 0 && dens100.edge === 0 && dens0.solid > 0.5 * shHush.solid && dens100.solid > 0.5 * shHush.solid && remade(dens0) && remade(dens100)
      && dens0.state.lastIndex < dens0.state.verts && dens100.state.lastIndex < dens100.state.verts, JSON.stringify({ count: [dens0.state.count, dens100.state.count], drawn: [dens0.state.drawn, dens100.state.drawn], solid: [dens0.solid, dens100.solid] }));
    const changing = [{ level: 0.6, all: 0.6, secs: 1.5 }, { level: 0.6, all: 0.6, secs: 0.05, knobs: { density: 0 } }, { level: 0.6, all: 0.6, secs: 0.05, knobs: { density: 50 } }];
    const [whole1, coarse, whole2] = await shardRun(changing, still), [, , straight] = await shardRun(changing.map((s) => ({ ...s, knobs: undefined })), still);
    check('shards: Density changed while the pane is open breaks it anew at once, and changed back gives the pane there was', whole1.state.breaks === 1 && coarse.state.breaks === 2 && whole2.state.breaks === 3 && coarse.state.count === 91 && coarse.state.drawn === coarse.state.indices
      && coarse.state.opens.length === 91 && remade(coarse) && whole2.state.count === 280 && remade(whole2) && gap(whole2.state.opens, straight.state.opens) < 1e-9 && Math.abs(whole2.state.posSum - straight.state.posSum) < 1e-6 && Math.abs(whole2.solid - straight.solid) < 0.01 * straight.solid
      && coarse.state.uploads[3] === whole1.state.uploads[3] + 1 && coarse.state.uploads[4] === whole1.state.uploads[4] + 1 && whole2.state.uploads[3] === whole1.state.uploads[3] + 2 && coarse.edge === 0,
      JSON.stringify({ breaks: [whole1.state.breaks, coarse.state.breaks, whole2.state.breaks], count: [coarse.state.count, whole2.state.count], opens: gap(whole2.state.opens, straight.state.opens), posSum: [whole2.state.posSum, straight.state.posSum], solid: [whole2.solid, straight.solid], remade: [remade(coarse), remade(whole2)], drawn: [coarse.state.drawn, coarse.state.indices], uploads: [whole1.state.uploads, coarse.state.uploads, whole2.state.uploads] }));
    const [, nudged, stepped] = await shardRun([{ level: 0.6, all: 0.6, secs: 1 }, { level: 0.6, all: 0.6, secs: 0.05, knobs: { density: 51 } }, { level: 0.6, all: 0.6, secs: 0.05, knobs: { density: 55 } }], still);
    check('shards: a Density that asks for the same cracks leaves the pane as it is, and the next that does not breaks it', nudged.state.breaks === 1 && nudged.state.count === 280 && nudged.state.spokes === 22 && stepped.state.breaks === 2 && stepped.state.spokes === 23 && stepped.state.rings === 8
      && stepped.state.count !== 280 && remade(nudged) && remade(stepped), JSON.stringify({ breaks: [nudged.state.breaks, stepped.state.breaks], count: [nudged.state.count, stepped.state.count], spokes: [nudged.state.spokes, stepped.state.spokes] }));
    const [ringsA, ringsB] = await shardRun([{ level: 0.6, all: 0.6, secs: 0.5 }, { level: 0.6, all: 0.6, secs: 0.05, knobs: { density: 42 } }], { ...still, knobs: { cameraDrift: 0, density: 40 } });
    check('shards: a Density that asks for another ring of cracks and no more cracks outward breaks the pane too', ringsA.state.spokes === 20 && ringsA.state.rings === 7 && ringsB.state.spokes === 20 && ringsB.state.rings === 8 && ringsB.state.breaks === ringsA.state.breaks + 1
      && ringsB.state.count > ringsA.state.count && remade(ringsB), JSON.stringify({ spokes: [ringsA.state.spokes, ringsB.state.spokes], rings: [ringsA.state.rings, ringsB.state.rings], breaks: [ringsA.state.breaks, ringsB.state.breaks] }));

    // Colours.
    const [hue0, hue2] = await shardRun([{ level: 0.5, all: 0.5, secs: 1 }, { level: 0.5, all: 0.5, secs: 0.5, hue: 2 }], still);
    check('shards: the mirrors show six colours from round the palette and the light behind is another, and they turn with the palette', [hue0, hue2].every((r) => r.state.pal.every((c, i) => gap(c, r.model.pal[i]) <= 1) && gap(r.state.glowColor, r.model.glowColor) <= 1)
      && gap(hue0.state.pal[0], hue0.state.pal[3]) > 30 && gap(hue0.state.pal[0], hue2.state.pal[0]) > 30 && gap(hue0.color, hue2.color) > 12 && Math.abs(hue2.state.colorT - hue0.state.colorT - 2) < 1e-9,
      JSON.stringify({ pal: [hue0.state.pal, hue0.model.pal], glow: [hue0.state.glowColor, hue0.model.glowColor], colour: [hue0.color, hue2.color] }));

    // Camera.
    const [noDrift] = await shardRun([{ level: 0.8, all: 0.8, secs: 3 }], { gain: 1, knobs: { cameraDrift: 0 } }), [drift] = await shardRun([{ level: 0.8, all: 0.8, secs: 3 }], { gain: 1, knobs: { cameraDrift: 100 } });
    check('shards: Camera drift 0 holds the camera still; 100 doubles the sway', noDrift.state.orbit === 0 && Math.abs(shLoud.state.orbit) > 0.005 && Math.abs(drift.state.orbit - 2 * shLoud.state.orbit) < 1e-9 && Math.abs(noDrift.kitCam[0]) < 1e-6 && Math.abs(drift.kitCam[0]) > 1.5 * Math.abs(shLoud.kitCam[0]) && drift.edge === 0,
      JSON.stringify({ orbit: [noDrift.state.orbit, shLoud.state.orbit, drift.state.orbit], x: [noDrift.kitCam[0], shLoud.kitCam[0], drift.kitCam[0]] }));

    // The same at any frame rate.
    const fpsSteps = [{ level: 0.05, all: 0.5, secs: 1 }, { level: 0.9, all: 0.8, secs: 1 }, { level: 0, all: 0, secs: 0.3 }];
    const [, , s30] = await shardRun(fpsSteps, { ...still, fps: 30 }), [, , s60] = await shardRun(fpsSteps, { ...still, fps: 60 });
    check('shards: the same sound gives the same pane at 30 and 60 fps', Math.abs(s30.state.clock - 2.3) < 1e-6 && Math.abs(s60.state.clock - 2.3) < 1e-6 && s60.state.open > 0.2 && gap(s30.state.opens, s60.state.opens) < FPS_OPEN && gap(s30.state.box, s60.state.box) < 2 * FPS_OPEN
      && s60.state.beats >= 1 && s30.state.beats === s60.state.beats && Math.abs(s30.solid - s60.solid) < 0.03 * s60.solid && remade(s30) && remade(s60),
      JSON.stringify({ opens: gap(s30.state.opens, s60.state.opens), box: gap(s30.state.box, s60.state.box), open: [s30.state.open, s60.state.open], solid: [s30.solid, s60.solid] }));

    // Mic off.
    const [idle1, idle2] = await shardRun([{ level: null, idle: true, secs: 3 }, { level: null, idle: true, secs: 3 }], still);
    check('shards: with the mic off and Idle animation on, the sectors lift a little in turn', idle1.state.live === true && Math.abs(idle2.state.clock - 6) < 1e-6 && idle1.state.open > 0.05 && idle2.state.open > 0.05 && idle2.state.most < 0.75 && idle2.state.beats === 0 && gap(idle1.model.byBand, idle2.model.byBand) > 0.1
      && Math.max(...idle2.model.byBand) - Math.min(...idle2.model.byBand) > 0.1 && Math.max(...idle2.state.bands) < 0.53 && idle2.diff.n > 1000 && remade(idle1) && remade(idle2),
      JSON.stringify({ open: [idle1.state.open, idle2.state.open], most: idle2.state.most, byBand: [idle1.model.byBand, idle2.model.byBand], bands: idle2.state.bands }));
    const [longIdle] = await shardRun([{ level: null, idle: true, secs: 55 }], still);
    check('shards: the sky the shards mirror drifts slowly round the palette, and its drift stays a share of once round', Math.abs(idle2.state.shift - 0.12) < 1e-9 && Math.abs(longIdle.state.clock - 55) < 1e-6 && Math.abs(longIdle.state.shift - 0.1) < 1e-6 && longIdle.state.lit[2] === longIdle.state.shift && remade(longIdle),
      JSON.stringify({ shift: [idle2.state.shift, longIdle.state.shift], clock: longIdle.state.clock }));
    const [off1, off2] = await shardRun([{ level: null, off: true, secs: 3 }, { level: null, off: true, secs: 1 }], still);
    check('shards: with the mic and Idle animation off the pane is shut and the picture holds still', off2.state.live === false && off2.state.clock === 0 && off2.state.open === 0 && off2.state.most === 0 && off2.state.shift === 0 && same(off2) && Math.abs(off2.solid - shHush.solid) < 0.01 * shHush.solid,
      JSON.stringify({ open: off2.state.open, differs: off2.diff, clock: off2.state.clock, solid: off2.solid }));
    const [, live1, muted1, muted2, muted3] = await shardRun([{ level: 0.05, all: 0.8, secs: 0.5 }, { level: 0.9, all: 0.8, secs: 1 }, { level: null, off: true, secs: 0.3 }, { level: null, off: true, secs: 8 }, { level: null, off: true, secs: 1 }], still);
    check('shards: muted while it is open and a beat is dying away, the pane closes, and then nothing moves', live1.state.open > 0.6 && live1.state.beats >= 1 && muted1.state.kick > 0 && muted1.state.live === false && muted1.state.clock === live1.state.clock && muted1.state.open > 0.2 && muted1.state.open < live1.state.open && muted2.state.open === 0 && muted2.state.most === 0
      && muted2.state.flame === 0 && muted2.state.kick === 0 && muted2.state.bands.every((b) => b === 0) && muted2.state.opens.every((v) => v === 0) && same(muted3) && muted1.diff.n > 1000 && muted2.state.shift === live1.state.shift && Math.abs(muted2.state.glow - 0.05) < 1e-12,
      JSON.stringify({ open: [live1.state.open, muted1.state.open, muted2.state.open], flame: muted2.state.flame, kick: [live1.state.kick, muted1.state.kick, muted2.state.kick], beats: [live1.beats, live1.state.beats], differs: muted3.diff }));

    // What is sent to be drawn, placement, and cost.
    const [up1, up2] = await shardRun([{ level: 0.5, all: 0.5, secs: 0.5 }, { level: 0.5, all: 0.5, secs: 0.5 }], still);
    check('shards: every frame its corners, the way they face and how far open they are are sent to be drawn; what does not change is sent once', [0, 1, 2].every((i) => up2.state.uploads[i] - up1.state.uploads[i] === 30) && up2.state.uploads[3] === up1.state.uploads[3] && up2.state.uploads[4] === up1.state.uploads[4],
      JSON.stringify({ uploads: [up1.state.uploads, up2.state.uploads] }));
    const [placed0] = await shardRun([{ level: 0.5, all: 0.5, secs: 2 }], still);
    await pushConfig((c) => { c.activeViz = SHARDS; c.placement.x = 30; });
    await wide.waitForTimeout(400);
    const [placed1] = await shardRun([{ level: 0.5, all: 0.5, secs: 2 }], still);
    check('shards: Scene placement slides it', placed1.centroidX - placed0.centroidX > 150 && placed1.solid > 0.8 * placed0.solid, placed0.centroidX.toFixed(0) + ' → ' + placed1.centroidX.toFixed(0));
    await pushConfig((c) => { c.activeViz = SHARDS; c.placement.x = 0; c.placement.size = 50; });
    await wide.waitForTimeout(400);
    const [halved] = await shardRun([{ level: 0.5, all: 0.5, secs: 2 }], still);
    // The small page, with the pane as wide open as it goes.
    const smallShards = await page.evaluate(() => { const fr = window.frame, heard = { frequencies, micActive }, knobs0 = Object.assign({}, perViz.shards); window.frame = function () {}; try { perViz.shards.bloom = 100; perViz.shards.cameraDrift = 0; TimbreScene.testLevel = 1; frequencies = new Uint8Array(32).fill(255); micActive = true; setActiveViz('visualizer'); setActiveViz('shards');
      const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
      let now = 100000; for (let i = 0; i < 120; i++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let solid = 0, edge = 0; for (let i = 0; i < px.length; i += 4) if (px[i + 3] >= 25) { if (px[i + 3] >= 128) solid++; const x = (i / 4) % w, y = Math.floor(i / 4 / w); if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) edge++; }
      const s = window.__timbre.scene; return { name: window.__timbre.currentVizName, scale: s && s.renderScale, most: s && s.state.most, count: s && s.state.count, solid, edge, canvas: [w, h] }; } finally { Object.assign(perViz.shards, knobs0); TimbreScene.testLevel = null; window.frame = fr; frequencies = heard.frequencies; micActive = heard.micActive; } });
    check('shards: the Size slider halves it, and the small page draws it too, wide open and all of it in the picture', halved.box.w < 0.62 * placed0.box.w && halved.box.w > 0.38 * placed0.box.w && halved.solid < 0.31 * placed0.solid && halved.solid > 0.19 * placed0.solid
      && smallShards.name === SHARDS && smallShards.scale >= 2 && smallShards.count === 280 && smallShards.most > 1.69 && smallShards.edge === 0 && smallShards.solid > 0.03 * smallShards.canvas[0] * smallShards.canvas[1],
      JSON.stringify({ box: [placed0.box.w, halved.box.w], solid: [placed0.solid, halved.solid], small: smallShards }));
    await pushConfig((c) => { c.placement.size = 100; });
    await wide.waitForTimeout(300);
    // The finest pane, open and loud: a frame's script time, and a frame drawn and finished by the GPU.
    await pushConfig((c) => { c.activeViz = SHARDS; c.perViz.shards.density = 100; });
    await wide.waitForTimeout(300);
    const shCost = await wide.evaluate(() => { const fr = window.frame, heard = { frequencies, micActive }; window.frame = function () {}; try { TimbreScene.testLevel = 0.9; frequencies = new Uint8Array(32).fill(255); micActive = true; setActiveViz('visualizer'); setActiveViz('shards');
      const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), one = new Uint8Array(4); let now = performance.now(), script = 0, whole = 0;
      for (let i = 0; i < 120; i++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
      for (let i = 0; i < 60; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); script += performance.now() - t; }
      for (let i = 0; i < 60; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one); whole += performance.now() - t; }
      return { script: script / 60, whole: whole / 60, count: window.__timbre.scene.state.count, open: window.__timbre.scene.state.open }; } finally { TimbreScene.testLevel = null; window.frame = fr; frequencies = heard.frequencies; micActive = heard.micActive; } });
    await pushConfig((c) => { c.perViz.shards.density = 50; });
    check('shards: with the finest pane open, draw() averages under 3 ms of script time, and a frame drawn and finished by the GPU under 7 ms (' + shCost.script.toFixed(2) + ' and ' + shCost.whole.toFixed(2) + ' ms)', shCost.count === 545 && shCost.open > 0.5 && shCost.script < 3 && shCost.whole < 7, JSON.stringify(shCost));

    }

    // Every kit scene, so the next one is covered without a new check.
    const gpuAfterSelect = (name) => wide.evaluate((n) => { setActiveViz('visualizer'); setActiveViz(n); currentViz.draw(performance.now(), 1 / 60); const s = window.__timbre.scene; return [s.memory.geometries, s.memory.textures, s.programs]; }, name);
    for (const name of T.VIZ_SCENES) {
      const leakBefore = await gpuAfterSelect(name), leakAfter = await gpuAfterSelect(name);
      check(`re-selecting ${name} does not grow GPU resources`, JSON.stringify(leakBefore) === JSON.stringify(leakAfter), `${leakBefore} → ${leakAfter}`);
    }

    // three.js copies a shadow caster's texture onto its shared shadow materials and keeps it
    // there after the scene is gone; the next scene's shadow pass would upload that disposed
    // texture again and nothing would free it. So: every GL texture made while a scene runs is
    // deleted when it stops, whichever scene ran before it.
    const texturesLeft = await wide.evaluate((names) => {
      const gl = document.getElementById('vizCanvas3D').getContext('webgl2');
      const create = gl.createTexture, del = gl.deleteTexture, out = {};
      let live = 0;
      gl.createTexture = function () { live++; return create.call(gl); };
      gl.deleteTexture = function (t) { live--; return del.call(gl, t); };
      try {
        for (const first of names) for (const second of names) {
          setActiveViz(first); currentViz.draw(performance.now(), 1 / 60);
          setActiveViz('visualizer');
          live = 0;
          setActiveViz(second); currentViz.draw(performance.now(), 1 / 60); currentViz.draw(performance.now() + 16, 1 / 60);
          const made = live;
          setActiveViz('visualizer');
          out[first + ' then ' + second] = [made, live];
        }
      } finally { gl.createTexture = create; gl.deleteTexture = del; }
      return out;
    }, T.VIZ_SCENES);
    const TEXTURES = { 'thanksgiving-harvest': 9, 'winter-aurora': 8, 'pride-ribbon': 5, 'bi-pride-ribbon': 5, 'ace-pride-ribbon': 5, 'trans-pride-ribbon': 5, 'july-fourth-stripes': 7, 'sunburst-3d': 5, 'mountains-3d': 5, 'phosphor': 4, 'chladni': 4, 'glass-prism': 4, 'metaball': 3, 'ink': 3, 'shards': 3 };
    check('a scene deletes every GL texture it made, whichever scene ran before it',
      Object.keys(texturesLeft).length === T.VIZ_SCENES.length ** 2 && Object.entries(texturesLeft).every(([pair, [made, left]]) => made >= TEXTURES[pair.split(' then ')[1]] && left === 0), JSON.stringify(texturesLeft));

    // The guard drops a caster's textures from the shadow only where they do not shape it, and an
    // object's own onBeforeShadow still runs (after the guard).
    const shadowSeen = await wide.evaluate(() => {
      setActiveViz('winter-aurora'); currentViz.stop();   // the WebGL canvas stays showing, with no scene on it
      const seen = { plain: [], cut: [], flat: [] };
      const s = TimbreScene.create({
        frame: { width: 3, height: 2, center: [0, 0.5, 0] }, fov: 30, pitch: 14, update() {},
        build(k) {
          const T3 = k.THREE;
          const tex = () => { const t = k.keep(new T3.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)); t.needsUpdate = true; return t; };
          const add = (name, material, x) => {
            const m = new T3.Mesh(k.keep(new T3.BoxGeometry(0.5, 0.5, 0.5)), k.keep(material));
            m.position.set(x, 0.25, 0); m.castShadow = true;
            m.onBeforeShadow = (r, o, c, sc, g, depth) => { seen[name].push([!!depth.map, !!depth.displacementMap]); };
            k.scene.add(m);
          };
          add('plain', new T3.MeshStandardMaterial({ map: tex() }), -0.8);
          add('cut', new T3.MeshStandardMaterial({ map: tex(), alphaTest: 0.5 }), 0);
          add('flat', new T3.MeshStandardMaterial({ displacementMap: tex(), displacementScale: 0 }), 0.8);
          const light = k.practical(new T3.PointLight(0xffffff, 3, 7, 2));
          light.position.set(0, 2, 2); light.castShadow = true;
          k.scene.add(light);
        },
      });
      if (!s) return { created: false };
      s.draw(performance.now(), 1 / 60); s.draw(performance.now() + 16, 1 / 60);
      s.dispose();
      setActiveViz('visualizer');
      return Object.assign({ created: true }, seen);
    });
    const all = (list, map, bump) => Array.isArray(list) && list.length >= 2 && list.every(([m, d]) => m === map && d === bump);
    check('a shadow is drawn without its caster\'s map, unless the map cuts holes in it', shadowSeen.created && all(shadowSeen.plain, false, false) && all(shadowSeen.cut, true, false), JSON.stringify({ plain: (shadowSeen.plain || [])[0], cut: (shadowSeen.cut || [])[0], n: (shadowSeen.plain || []).length }));
    check('a shadow is drawn without a displacement map that displaces nothing', shadowSeen.created && all(shadowSeen.flat, false, false), JSON.stringify((shadowSeen.flat || [])[0]));

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

    // dispose() frees what is in the scene even when it never went through keep().
    const swept = await wide.evaluate(() => {
      setActiveViz('visualizer');
      const freed = { geometry: false, material: false, texture: false, uniformTexture: false };
      const on = (obj, key) => { obj.addEventListener('dispose', () => { freed[key] = true; }); return obj; };
      const s = TimbreScene.create({
        frame: { width: 2, height: 2, center: [0, 0.5, 0] }, fov: 30, pitch: 14, update() {},
        build(k) {
          const T3 = k.THREE, data = new Uint8Array([255, 255, 255, 255]);
          const map = on(new T3.DataTexture(data, 1, 1), 'texture'); map.needsUpdate = true;
          const mesh = new T3.Mesh(on(new T3.BoxGeometry(1, 1, 1), 'geometry'), on(new T3.MeshStandardMaterial({ map }), 'material'));
          const tex = on(new T3.DataTexture(data, 1, 1), 'uniformTexture'); tex.needsUpdate = true;
          const lit = new T3.Mesh(mesh.geometry, [new T3.ShaderMaterial({
            uniforms: { uMap: { value: tex } }, vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }',
            fragmentShader: 'uniform sampler2D uMap; void main() { gl_FragColor = texture2D(uMap, vec2(0.5)); }',
          })]);
          const group = new T3.Group();
          group.add(mesh, lit);
          k.scene.add(group);
        },
      });
      if (!s) return { created: false };
      s.draw(performance.now(), 1 / 60);
      s.dispose();
      return Object.assign({ created: true }, freed);
    });
    check('dispose() frees geometries, materials and textures in the scene that were never kept',
      swept.created && swept.geometry && swept.material && swept.texture && swept.uniformTexture, JSON.stringify(swept));

    // The shared parts keep their contract: a fresh geometry per call, complete and finite, at the stated size.
    const parts = await wide.evaluate(() => {
      const box = (g) => { g.computeBoundingBox(); const b = g.boundingBox; return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z]; };
      const whole = (g) => !!g && g.isBufferGeometry && ['position', 'normal', 'uv'].every((a) => g.attributes[a] && g.attributes[a].count > 0
        && Array.prototype.every.call(g.attributes[a].array, Number.isFinite));
      const out = { names: Object.keys(TimbreScene.parts).sort() };
      const p1 = TimbreScene.parts.pumpkin(THREE, 0.5, 12), p2 = TimbreScene.parts.pumpkin(THREE, 0.5, 12);
      const l1 = TimbreScene.parts.leaf(THREE), l2 = TimbreScene.parts.leaf(THREE);
      out.fresh = p1 !== p2 && l1 !== l2;
      out.whole = whole(p1) && whole(l1);
      out.pumpkin = box(p1); out.big = box(TimbreScene.parts.pumpkin(THREE, 1, 8)); out.leaf = box(l1);
      for (const g of [p1, p2, l1, l2]) g.dispose();
      return out;
    });
    const nearly = (a, b, tol) => Math.abs(a - b) <= tol;
    check('scene parts: pumpkin and leaf each return a fresh, complete, finite geometry', JSON.stringify(parts.names) === '["leaf","pumpkin"]' && parts.fresh && parts.whole, JSON.stringify(parts));
    // A pumpkin of radius r rests on y = 0, is about 1.12 r wide each way and under 1.5 r tall.
    check('scene parts: a pumpkin rests on the ground and scales with its radius',
      nearly(parts.pumpkin[1], 0, 0.02) && nearly(parts.pumpkin[3], 0.56, 0.03) && nearly(parts.pumpkin[0], -0.56, 0.03) && parts.pumpkin[4] > 0.6 && parts.pumpkin[4] < 0.75
      && nearly(parts.big[3], 2 * parts.pumpkin[3], 0.03) && nearly(parts.big[4], 2 * parts.pumpkin[4], 0.03), JSON.stringify([parts.pumpkin, parts.big]));
    // A leaf lies flat in the XZ plane, about 0.23 wide and 0.57 long.
    check('scene parts: a leaf lies flat, about 0.23 wide and 0.57 long',
      nearly(parts.leaf[1], 0, 1e-6) && nearly(parts.leaf[4], 0, 1e-6) && nearly(parts.leaf[3] - parts.leaf[0], 0.23, 0.01) && nearly(parts.leaf[5] - parts.leaf[2], 0.57, 0.01), JSON.stringify(parts.leaf));

    // An older WebGL effect can leave the texture upload flags set on the shared context. The
    // page's first scene (the kit builds its renderer then) must start without a GL error.
    // (A page applies the pushed config when it connects, so the config must not name a scene.)
    await pushConfig((c) => { c.activeViz = 'visualizer'; });
    const freshPage = async () => {
      const p = await ctxt.newPage();
      await p.setViewportSize({ width: 1920, height: 1080 });
      await p.goto(overlayWideUrl, { waitUntil: 'load' });
      await p.waitForFunction(() => window.__timbre && window.__timbre.micActive === true && window.__timbre.currentVizName === 'visualizer', { timeout: 8000 });
      return p;
    };
    {
      const fresh = await freshPage();
      const first = await fresh.evaluate(async () => {
        window.frame = function () {};
        setActiveViz('jelly');
        await new Promise((r) => setTimeout(r, 900));
        currentViz.draw(performance.now(), 1 / 60);
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2');
        // None of the older effects left uploads a texture any more, so the flag is set here as one that did would leave it.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        const before = { flip: gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL), error: gl.getError() };
        setActiveViz('thanksgiving-harvest');
        const created = gl.getError();
        currentViz.draw(performance.now(), 1 / 60);
        const s = window.__timbre.scene;
        const attrs = gl.getContextAttributes();
        return { before, created, drawn: gl.getError(), active: !!s && s.active === true, attrs: [attrs.alpha, attrs.antialias, attrs.depth, attrs.stencil, attrs.premultipliedAlpha] };
      });
      check('an older WebGL effect made the context, and the flip flag is set as one with a texture would leave it (what the next check guards against)', first.before.flip === true && first.before.error === 0, JSON.stringify(first.before));
      check('the first scene after an older WebGL effect starts without a GL error', first.created === 0 && first.drawn === 0 && first.active, JSON.stringify(first));
      await fresh.close();
    }
    // With no context yet, the kit must still create it as three.js would have.
    {
      const fresh = await freshPage();
      const cold = await fresh.evaluate(() => {
        window.frame = function () {};
        setActiveViz('thanksgiving-harvest');
        currentViz.draw(performance.now(), 1 / 60);
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2'), a = gl.getContextAttributes(), s = window.__timbre.scene;
        return { attrs: [a.alpha, a.antialias, a.depth, a.stencil, a.premultipliedAlpha, a.preserveDrawingBuffer, a.powerPreference], error: gl.getError(), active: !!s && s.active === true };
      });
      check('a scene that is the first WebGL effect on a page creates the context as three.js asks for it',
        JSON.stringify(cold.attrs) === '[true,true,true,true,true,false,"default"]' && cold.error === 0 && cold.active, JSON.stringify(cold));
      await fresh.close();
    }

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
    // The 16:9 page stays open (its own loop stopped) for the DNA checks after the 4:3 page.
    await pushConfig((c) => { c.activeViz = 'visualizer'; });

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

    // ── DNA: the calm helix, on all three pages ──────────────────────────────
    // A pushed config is the defaults plus the changes, so DNA's knobs are at their defaults.
    const dnaOn = async (pages, idle) => {
      await pushConfig((c) => { c.activeViz = 'dna'; c.idleAnim = idle; });
      for (const pg of pages) await pg.waitForFunction((i) => window.__timbre.currentVizName === 'dna' && cfgIdleAnim === i, idle, { timeout: 5000 });
    };
    const near = (v, want, tol) => Math.abs(v - want) <= tol;
    await dnaOn([page, p43, wide], false);
    for (const pg of [page, p43, wide]) {
      const size = await pg.evaluate(() => `${W}×${H}`);
      const [r] = await dnaRun(pg, [{ secs: 1, ...talk }]);
      check(`dna: the helix draws edge to edge at ${size}`, r.ink > 0 && r.emptyCols === 0 && r.state === 'whole', JSON.stringify({ ink: r.ink, emptyCols: r.emptyCols, state: r.state }));
    }
    const dnaScale = await wide.evaluate(() => window.__timbre.SCALE), quietR = 12 * dnaScale;
    const [dq, dl] = await dnaRun(wide, [{ secs: 1, ...silence }, { secs: 1, wave: 0.6, low: 0.8, high: 0.8, peak: 0.6 }]);
    check('dna: louder is wider and brighter',
      dl.ra > dq.ra && dl.rb > dq.rb && dl.bright > dq.bright && dl.alpha > dq.alpha && dl.bottom - dl.top > dq.bottom - dq.top,
      JSON.stringify([dq, dl].map(({ ra, rb, bright, alpha, top, bottom }) => ({ ra, rb, bright, alpha, height: bottom - top }))));
    // A loud second first, so the helix has to narrow and dim again.
    const [, ds, ds1] = await dnaRun(wide, [{ secs: 1, wave: 0.6, low: 0.8, high: 0.8, peak: 0.6 }, { secs: 2, ...silence }, { secs: 1, ...silence }]);
    check('dna: the quiet helix is narrow, dim and slow',
      near(ds.ra, quietR, 0.05 * quietR) && near(ds.rb, quietR, 0.05 * quietR) && near(ds.bright, 0.5, 0.02) && near(ds1.phase - ds.phase, 0.7, 0.05),
      JSON.stringify({ ra: ds.ra, rb: ds.rb, bright: ds.bright, turned: ds1.phase - ds.phase }));
    const loud = { wave: 0.7, low: 0.5, high: 0.5, peak: 0.7 };   // loudness 0.7 × 1.5 clamps to 1
    const turned = async (fps) => { const [a, b] = await dnaRun(wide, [{ secs: 1, ...loud }, { secs: 1, ...loud }], { fps }); return b.phase - a.phase; };
    const t60 = await turned(60);
    check('dna: a loud helix turns at 6.5 radians a second', near(t60, 6.5, 0.15), t60.toFixed(3));
    const t30 = await turned(30), t165 = await turned(165);
    check('dna: the twist is the same at 30 and 165 fps', Math.max(t30, t60, t165) - Math.min(t30, t60, t165) <= 0.05, `30 fps ${t30.toFixed(3)}, 60 fps ${t60.toFixed(3)}, 165 fps ${t165.toFixed(3)}`);
    const [lowOnly] = await dnaRun(wide, [{ secs: 1, wave: 0.3, low: 0.9, high: 0, peak: 0.3 }]);
    const [highOnly] = await dnaRun(wide, [{ secs: 1, wave: 0.3, low: 0, high: 0.9, peak: 0.3 }]);
    check('dna: low sound opens strand A, high sound strand B', lowOnly.ra > lowOnly.rb * 1.5 && highOnly.rb > highOnly.ra * 1.5,
      JSON.stringify({ low: [lowOnly.ra, lowOnly.rb], high: [highOnly.ra, highOnly.rb] }));
    const off = { ...silence, mic: false };
    await dnaOn([wide], true);
    const [idle0, ...idle] = await dnaRun(wide, [{ secs: 0, ...off }, ...Array.from({ length: 16 }, () => ({ secs: 0.25, ...off }))]);
    const idleRa = idle.map((r) => r.ra), idleBright = idle.map((r) => r.bright);
    const idleTurned = idle[idle.length - 1].phase - idle0.phase;
    check('dna: mic off with idle animation: only the widths breathe',
      Math.max(...idleRa) - Math.min(...idleRa) > 2 * dnaScale && idleBright.every((b) => near(b, 0.5, 0.02)) && near(idleTurned, 2.8, 0.2),
      JSON.stringify({ raRange: Math.max(...idleRa) - Math.min(...idleRa), bright: [Math.min(...idleBright), Math.max(...idleBright)], turned: idleTurned }));
    await dnaOn([wide], false);
    const [, dm] = await dnaRun(wide, [{ secs: 1, wave: 0.6, low: 0.8, high: 0.8, peak: 0.6 }, { secs: 2, ...off }]);
    check('dna: mic off without idle animation is the quiet helix', near(dm.ra, quietR, 0.05 * quietR) && near(dm.rb, quietR, 0.05 * quietR), JSON.stringify({ ra: dm.ra, rb: dm.rb }));

    // ── DNA: the shatter and the return (16:9 page unless noted) ─────────────
    // Reconnect Seconds is 2 for this block, so the return starts 2 s after the last peak.
    const reconnectIs = async (secs) => {
      await pushConfig((c) => { c.activeViz = 'dna'; c.idleAnim = false; c.perViz.dna.reconnectSeconds = secs; });
      for (const pg of [page, wide]) await pg.waitForFunction((s) => window.__timbre.config.perViz.dna.reconnectSeconds === s, secs, { timeout: 5000 });
    };
    await reconnectIs(2);
    const blast = [{ secs: 1, ...talk }, { secs: 0.1, ...talk, peak: 0.95 }];
    const tall = (r) => r.bottom - r.top;
    const shatterFacts = (calm, apart) => JSON.stringify({ state: apart.state, pieces: apart.pieces, inside: apart.inside, height: tall(apart), calmHeight: tall(calm) });
    // Read 1 s after the blast: its sparks are gone (each within 0.95 s), so the height is the pieces'
    // alone, and the return is still 1 s away. In pieces the picture reaches the canvas's top and bottom
    // rows, but the talking helix with its glow already spans about 0.7 of the height, so the shattered
    // picture can be at most about 1.43 times as tall. 1.3 times is more than the loudest whole helix reaches.
    const shattersOk = (calm, apart) => apart.state === 'pieces' && apart.pieces >= 60 && apart.pieces < 200
      && apart.inside >= 0.9 * apart.pieces && tall(apart) > 1.3 * tall(calm);
    const [wCalm, wBlast, wApart] = await dnaRun(wide, [...blast, { secs: 1, ...talk }]);
    check('dna: a peak shatters the helix', shattersOk(wCalm, wApart), shatterFacts(wCalm, wApart));
    const [sCalm, , sApart] = await dnaRun(page, [...blast, { secs: 1, ...talk }]);
    check('dna: the same on the small page', shattersOk(sCalm, sApart), shatterFacts(sCalm, sApart));
    // The return starts 2 s after the last peak and takes 1.5 s; back means within the helix's band.
    const [wTalk, , wReturning, wBack] = await dnaRun(wide, [...blast, { secs: 2.2, ...talk }, { secs: 1.6, ...talk }]);
    check('dna: the pieces come back',
      wReturning.state === 'returning' && wBack.state === 'whole' && wBack.pieces === 0 && tall(wBack) < tall(wApart) * 0.8 && tall(wBack) <= 1.1 * tall(wTalk),
      JSON.stringify({ after2_2: wReturning.state, after3_8: wBack.state, pieces: wBack.pieces, height: tall(wBack), talking: tall(wTalk), shattered: tall(wApart) }));
    check('dna: the twist waits while in pieces', wApart.phase === wBlast.phase, JSON.stringify({ state: wApart.state, phase: [wBlast.phase, wApart.phase] }));
    const [gain200] = await dnaRun(wide, [{ secs: 5, wave: 0.6, low: 0.6, high: 0.6, peak: 0.6, config: { gain: 200 } }]);
    await wide.evaluate(() => applyConfig({ gain: 100 }));
    check('dna: talking with Gain at 200% does not shatter', gain200.state === 'whole', gain200.state);
    const [, sens0] = await dnaRun(wide, [{ secs: 1, ...talk, config: { perViz: { dna: { shatterSensitivity: 0 } } } }, { secs: 1, ...talk, peak: 1 }]);
    await wide.evaluate(() => applyConfig({ perViz: { dna: { shatterSensitivity: 50 } } }));
    check('dna: sensitivity 0 never shatters', sens0.state === 'whole', sens0.state);
    const [, fromWave] = await dnaRun(wide, [{ secs: 1, ...talk }, { secs: 0.1, wave: 0.95, low: 0.5, high: 0.3, peak: null }]);
    check('dna: falls back to the waveform peak', fromWave.state === 'pieces', fromWave.state);
    const [, , pushedFrom, pushedTo] = await dnaRun(wide, [...blast, { secs: 0.3, ...talk },
      { secs: 1 / 60, ...talk, config: { perViz: { dna: { reconnectSeconds: 3 } }, bounce: 70 } }]);
    await wide.evaluate(() => applyConfig({ perViz: { dna: { reconnectSeconds: 2 } }, bounce: 50 }));
    check('dna: a config push leaves the pieces alone',
      pushedFrom.state === 'pieces' && pushedTo.state === 'pieces' && pushedTo.pieces === pushedFrom.pieces && Math.abs(pushedTo.ink - pushedFrom.ink) <= 0.05 * pushedFrom.ink,
      JSON.stringify([pushedFrom, pushedTo].map(({ state, pieces, ink }) => ({ state, pieces, ink }))));
    const [, , resizedFrom, resized] = await dnaRun(wide, [...blast, { secs: 0.3, ...talk }, { secs: 1 / 60, ...talk, config: { showLabels: false } }]);
    await wide.evaluate(() => applyConfig({ showLabels: true }));
    check('dna: a real size change comes back whole', resizedFrom.state === 'pieces' && resized.state === 'whole', `${resizedFrom.state} → ${resized.state}`);
    const [, , hiddenFrom, shown] = await dnaRun(wide, [...blast, { secs: 0.3, ...talk }, { secs: 1 / 60, ...talk, jump: 5 }]);
    check('dna: a hidden source comes back whole', hiddenFrom.state === 'pieces' && shown.state === 'whole', `${hiddenFrom.state} → ${shown.state}`);
    const seeded = async () => (await dnaRun(wide, [...blast, { secs: 0.5, ...talk }], { seed: 7 }))[2];
    const seedA = await seeded(), seedB = await seeded();
    check('dna: a seeded shatter repeats', seedA.state === 'pieces' && seedA.inside === seedB.inside && seedA.ink === seedB.ink,
      JSON.stringify([seedA, seedB].map(({ state, inside, ink }) => ({ state, inside, ink }))));
    // Helix Freq moved while in pieces: the pieces go home to the winding they were cut from, so the
    // helix rejoins on that winding, inside its band, and takes the new winding once it is whole.
    // Readings: talk, blast, 0.3 s, the push, 3 s (returning), then one per frame through the rejoin.
    // The band is 1.25 times the talking helix here, not 1.1: the first whole frame carries the closing
    // flash's extra glow (it reads 1.18 times; the shattered picture reads 1.43).
    const freqRun = await dnaRun(wide, [...blast, { secs: 0.3, ...talk },
      { secs: 1 / 60, ...talk, config: { perViz: { dna: { helixFreq: 100 } } } }, { secs: 3, ...talk },
      ...Array.from({ length: 60 }, () => ({ secs: 1 / 60, ...talk }))]).catch((e) => String(e));
    await wide.evaluate(() => applyConfig({ perViz: { dna: { helixFreq: 50 } } }));
    const rejoin = Array.isArray(freqRun) ? freqRun.findIndex((r, i) => i > 4 && r.state === 'whole') : -1;
    const [fTalk, fWhole, fLast] = rejoin > 4 ? [freqRun[0], freqRun[rejoin], freqRun[freqRun.length - 1]] : [];
    check('dna: Helix Freq moved while in pieces rejoins on the old winding',
      rejoin > 4 && freqRun[rejoin - 1].state === 'returning' && fWhole.k === fTalk.k && tall(fWhole) <= 1.25 * tall(fTalk) && fLast.k > fTalk.k,
      Array.isArray(freqRun) ? JSON.stringify({ rejoin, k: [fTalk && fTalk.k, fWhole && fWhole.k, fLast && fLast.k], height: fWhole && tall(fWhole), talking: fTalk && tall(fTalk) }) : freqRun);
    await reconnectIs(3);
    // Cost: 300 talking frames (the first second brings the helix to the 0.4 s of calm the shatter
    // needs), the one frame of a 0.95 peak, then 150 frames in pieces (2.5 s, inside the 3 s reconnect).
    const dnaCost = await wide.evaluate(() => {
      const saved = { frequencies, waveform, micActive, micPeak, seed: window.__dnaSeed };
      try {
        window.__dnaSeed = 1;
        currentViz = VIZ_FACTORIES['dna']();
        const f = new Uint8Array(32), w = new Uint8Array(64);
        f.fill(128, 0, 2); f.fill(77, 2, 11);
        for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * 0.5 * 127);
        frequencies = f; waveform = w; micActive = true;
        let now = performance.now();
        const frames = (n, peak) => {
          micPeak = peak; const t0 = performance.now();
          for (let k = 0; k < n; k++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
          return (performance.now() - t0) / n;
        };
        const whole = frames(300, 0.5), wholeState = currentViz.probe().state;
        const blast = frames(1, 0.95);
        const pieces = frames(150, 0.5), piecesState = currentViz.probe().state;
        return { whole, pieces, blast, wholeState, piecesState };
      } finally {
        frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak;
        window.__dnaSeed = saved.seed;
      }
    });
    check('dna: draws in under 1 ms, and its blast frame in under 4',
      dnaCost.wholeState === 'whole' && dnaCost.piecesState === 'pieces' && dnaCost.whole < 1 && dnaCost.pieces < 1 && dnaCost.blast < 4,
      `whole ${dnaCost.whole.toFixed(3)}, pieces ${dnaCost.pieces.toFixed(3)}, blast ${dnaCost.blast.toFixed(2)} (${dnaCost.wholeState}, ${dnaCost.piecesState})`);

    // ── Comet: a smooth comet that follows the voice (16:9 page unless noted) ─
    // A pushed config is the defaults plus the changes, so Comet's knobs are at their defaults.
    const cometOn = async (pages, idle) => {
      await pushConfig((c) => { c.activeViz = 'comet'; c.idleAnim = idle; });
      for (const pg of pages) await pg.waitForFunction((i) => window.__timbre.currentVizName === 'comet' && cfgIdleAnim === i, idle, { timeout: 5000 });
    };
    const facts = (...rs) => JSON.stringify(rs.map((r) => r && ({ speed: r.speed, reach: r.reach, bright: r.bright, tail: r.tail, points: r.points,
      inside: r.inside, low: r.low, sparks: r.sparks, rings: r.rings, flares: r.flares, ink: r.ink,
      gap: r.gap, tipAlpha: r.tipAlpha, levelTip: r.levelTip, levelHead: r.levelHead, coma: r.coma })));
    const cometStep = await wide.evaluate(() => TimbreComet.step(SCALE)), cometMaxR = await wide.evaluate(() => TimbreComet.radius(0, 1, 1, 1, SCALE));
    await cometOn([page, p43, wide], false);
    const loudTalk = { wave: 0.6, low: 0.8, high: 0.8, peak: 0.6 };   // loudness 0.6 × 1.5 = 0.9
    for (const pg of [page, p43, wide]) {
      const size = await pg.evaluate(() => `${W}×${H}`);
      const [r] = await cometRun(pg, [{ secs: 2, ...talk }]);
      const stepHere = await pg.evaluate(() => TimbreComet.step(SCALE));
      check(`comet: flies inside the frame at ${size}`, r.ink > 0 && r.inside === true && r.points > 5 && r.gap <= stepHere * 1.001 && r.flares === 0, facts(r));
    }
    const cometScale = await wide.evaluate(() => window.__timbre.SCALE);
    const [cq, cl] = await cometRun(wide, [{ secs: 3, ...silence }, { secs: 3, ...loudTalk }]);
    check('comet: silent is slow, small and dim',
      near(cq.speed, 0.2, 0.01) && near(cq.reach, 0.42, 0.01) && near(cq.bright, 0.5, 0.01) && near(cq.tail, cometScale * 190 * 0.3, 2) && cq.ink > 0 && cq.flares === 0, facts(cq));
    check('comet: louder flies faster and wider, glows brighter and trails longer',
      cl.speed > cq.speed * 3 && cl.reach > cq.reach * 1.8 && cl.bright > cq.bright + 0.3 && cl.tail > cq.tail * 2 && cl.ink > cq.ink * 2 && cl.inside === true, facts(cq, cl));
    check('comet: leaves the canvas state as it found it',
      [cq, cl].every((r) => r.op === 'source-over' && r.blur === 0 && r.globalAlpha === 1 && r.offsetX === 0 && r.transformKept === true),
      JSON.stringify([cq, cl].map((r) => [r.op, r.blur, r.globalAlpha, r.offsetX, r.transformKept])));
    // The glow is only blur. Without it the picture is at most the tail's body (narrower than its
    // length times its greatest width), the head's glow, and a few sparks.
    check('comet: the tail has a soft glow round it', cl.ink > 1.3 * (cl.tail * 2 * cometMaxR + Math.PI * cl.coma * cl.coma),
      JSON.stringify({ ink: cl.ink, bodyAndHeadAtMost: Math.round(cl.tail * 2 * cometMaxR + Math.PI * cl.coma * cl.coma) }));
    const [, cRise] = await cometRun(wide, [{ secs: 2, ...silence }, { secs: 0.3, ...loudTalk }]);
    const [, cFall] = await cometRun(wide, [{ secs: 2, ...loudTalk }, { secs: 0.3, ...silence }]);
    check('comet: the tail remembers how loud the voice was where the head passed',
      cRise.levelHead > 0.7 && cRise.levelTip < 0.1 && cFall.levelHead < 0.1 && cFall.levelTip > 0.7, facts(cRise, cFall));
    // Syllables: 0.18 s of voice, 0.12 s of quiet, read after each. Uncapped, a bulge reaches about 1.4.
    const cSyll = (await cometRun(wide, Array.from({ length: 24 }, (_, i) => (i % 2 ? { secs: 0.12, ...silence } : { secs: 0.18, wave: 0.5, low: 0.6, high: 0.4, peak: 0.5 })))).slice(6);
    const cBulges = cSyll.map((r) => r.bulge);
    check('comet: syllables bulge the tail, never more than 1.25 times the tail nearer the head',
      Math.max(...cBulges) <= 1.2501 && Math.max(...cBulges) > 1.1, cBulges.map((b) => b.toFixed(3)).join(' '));
    const [cLowOnly] = await cometRun(wide, [{ secs: 2, wave: 0.3, low: 0.9, high: 0, peak: 0.3 }]);
    const [cHighOnly] = await cometRun(wide, [{ secs: 2, wave: 0.3, low: 0, high: 0.9, peak: 0.3 }]);
    check('comet: the low end swells the glow round the head, the high end sheds sparks',
      cLowOnly.coma > cHighOnly.coma * 1.5 && cHighOnly.sparks > cLowOnly.sparks * 3, facts(cLowOnly, cHighOnly));
    const [cFirst] = await cometRun(wide, [{ secs: 0.1, ...loud }], { fps: 10 });   // one frame at the 0.1 s cap, at full loudness
    check('comet: a long first frame leaves no gap in the path', cFirst.points > 3 && cFirst.gap <= cometStep * 1.001, facts(cFirst));
    const [cYoung, cOld] = await cometRun(wide, [{ secs: 0.5, ...silence }, { secs: 5, ...silence }]);
    check('comet: the tail fades to nothing at its tip, from the first moment',
      cYoung.points > 3 && cYoung.tipAlpha < 0.005 && cOld.tipAlpha < 0.03, facts(cYoung, cOld));
    const [, cs] = await cometRun(wide, [{ secs: 2, ...loudTalk }, { secs: 6, ...silence }]);
    check('comet: it settles back when the voice stops', near(cs.speed, 0.2, 0.01) && near(cs.reach, 0.42, 0.02) && near(cs.bright, 0.5, 0.01), facts(cs));
    const flown = async (fps) => { const [a, b] = await cometRun(wide, [{ secs: 1, ...loudTalk }, { secs: 1, ...loudTalk }], { fps }); return b.theta - a.theta; };
    const cf30 = await flown(30), cf60 = await flown(60), cf165 = await flown(165);
    check('comet: a loud comet covers 0.875 radians a second, alike at 30, 60 and 165 fps',
      near(cf60, 0.875, 0.02) && Math.max(cf30, cf60, cf165) - Math.min(cf30, cf60, cf165) <= 0.01, `30 fps ${cf30.toFixed(4)}, 60 fps ${cf60.toFixed(4)}, 165 fps ${cf165.toFixed(4)}`);

    // The flare.
    const yell = [{ secs: 1, ...talk }, { secs: 0.1, ...talk, peak: 0.95 }];
    const [cCalm, cFlare] = await cometRun(wide, yell);
    check('comet: a peak flares the head',
      cCalm.flares === 0 && cFlare.flares === 1 && cFlare.rings === 1 && cFlare.sparks >= cCalm.sparks + 30 && cFlare.bright > cCalm.bright + 0.1 && cFlare.speed > cCalm.speed * 1.3, facts(cCalm, cFlare));
    const [, sFlare] = await cometRun(page, yell);
    check('comet: the same on the small page', sFlare.flares === 1 && sFlare.rings === 1 && sFlare.inside === true, facts(sFlare));
    const [, , cAfter] = await cometRun(wide, [...yell, { secs: 2.5, ...talk }]);
    check('comet: the flare dies away', cAfter.flares === 1 && cAfter.rings === 0 && near(cAfter.bright, cCalm.bright, 0.03) && near(cAfter.speed, cCalm.speed, 0.03), facts(cCalm, cAfter));
    const [, cHeld] = await cometRun(wide, [{ secs: 1, ...talk }, { secs: 1.5, ...talk, peak: 0.95 }]);
    check('comet: a held yell flares again only every 0.7 s', cHeld.flares === 3, facts(cHeld));
    const [cGain] = await cometRun(wide, [{ secs: 5, wave: 0.6, low: 0.6, high: 0.6, peak: 0.6, config: { gain: 200 } }]);
    await wide.evaluate(() => applyConfig({ gain: 100 }));
    check('comet: talking with Gain at 200% does not flare', cGain.flares === 0, facts(cGain));
    const [, cSens0] = await cometRun(wide, [{ secs: 1, ...talk, config: { perViz: { comet: { flareSensitivity: 0 } } } }, { secs: 1, ...talk, peak: 1 }]);
    await wide.evaluate(() => applyConfig({ perViz: { comet: { flareSensitivity: 50 } } }));
    check('comet: Flare Sensitivity 0 never flares', cSens0.flares === 0, facts(cSens0));
    const [, cWave] = await cometRun(wide, [{ secs: 1, ...talk }, { secs: 0.1, wave: 0.95, low: 0.5, high: 0.3, peak: null }]);
    check('comet: falls back to the waveform peak', cWave.flares === 1, facts(cWave));

    // Mic off.
    const [, cOff] = await cometRun(wide, [{ secs: 2, ...loudTalk }, { secs: 6, ...off }]);
    check('comet: mic off drifts slowly and dimly',
      near(cOff.speed, 0.2, 0.01) && near(cOff.reach, 0.42, 0.02) && near(cOff.bright, 0.5, 0.01) && cOff.low < 0.001 && cOff.flares === 0 && cOff.ink > 0, facts(cOff));
    // A thump as the mic opens: the 0.7 s wait counts only time with the mic on.
    const [, cOpen] = await cometRun(wide, [{ secs: 1, ...off }, { secs: 0.3, ...talk, peak: 0.95 }]);
    check('comet: the mic opening on a loud moment does not flare', cOpen.flares === 0, facts(cOpen));
    await cometOn([wide], true);
    const cIdle = (await cometRun(wide, [{ secs: 0, ...off }, ...Array.from({ length: 16 }, () => ({ secs: 0.25, ...off }))])).slice(1);
    const idleLow = cIdle.map((r) => r.low);
    check('comet: mic off with idle animation: only the glow round the head breathes',
      Math.max(...idleLow) - Math.min(...idleLow) > 0.15 && cIdle.every((r) => near(r.speed, 0.2, 0.01) && near(r.bright, 0.5, 0.01) && near(r.reach, 0.42, 0.01)),
      JSON.stringify({ low: [Math.min(...idleLow), Math.max(...idleLow)], speed: cIdle[15].speed, bright: cIdle[15].bright }));
    await cometOn([wide], false);

    // Settings and the box.
    const [cTrail0] = await cometRun(wide, [{ secs: 3, ...talk, config: { perViz: { comet: { trail: 0 } } } }]);
    const [cTrail100] = await cometRun(wide, [{ secs: 3, ...talk, config: { perViz: { comet: { trail: 100 } } } }]);
    await wide.evaluate(() => applyConfig({ perViz: { comet: { trail: 50 } } }));
    check('comet: Trail sets the tail length, and 0 still leaves a tail',
      cTrail0.tail > 20 * cometScale && cTrail0.points > 3 && cTrail100.tail > cTrail0.tail * 5 && cTrail100.points > cTrail0.points * 3, facts(cTrail0, cTrail100));
    const [, cPushFrom, cPushTo] = await cometRun(wide, [{ secs: 2, ...talk }, { secs: 1 / 60, ...talk }, { secs: 1 / 60, ...talk, config: { bounce: 70 } }]);
    await wide.evaluate(() => applyConfig({ bounce: 50 }));
    check('comet: a config push keeps the tail', cPushFrom.points > 10 && Math.abs(cPushTo.points - cPushFrom.points) <= 4, facts(cPushFrom, cPushTo));
    const [, cSizeFrom, cSized, cSizeLater] = await cometRun(wide, [{ secs: 2, ...talk }, { secs: 1 / 60, ...talk },
      { secs: 1 / 60, ...talk, config: { showLabels: false } }, { secs: 1, ...talk }]);
    await wide.evaluate(() => applyConfig({ showLabels: true }));
    check('comet: a real size change starts a fresh tail inside the new frame',
      cSizeFrom.points > 20 && cSized.points < cSizeFrom.points / 3 && cSized.inside === true && cSizeLater.points > 10 && cSizeLater.inside === true, facts(cSizeFrom, cSized, cSizeLater));
    const cSeeded = async () => (await cometRun(wide, [...yell, { secs: 0.3, ...talk }], { seed: 7 }))[2];
    const cSeedA = await cSeeded(), cSeedB = await cSeeded();
    check('comet: a seeded run repeats', cSeedA.sparks > 20 && cSeedA.sparks === cSeedB.sparks && cSeedA.ink === cSeedB.ink, facts(cSeedA, cSeedB));

    // Cost, with the longest tail: 300 loud frames, the one frame of a 0.95 peak, then 60 more.
    const cometCost = await wide.evaluate(() => {
      const saved = { frequencies, waveform, micActive, micPeak, seed: window.__cometSeed };
      try {
        applyConfig({ perViz: { comet: { trail: 100 } } });
        window.__cometSeed = 1;
        currentViz = VIZ_FACTORIES['comet']();
        const f = new Uint8Array(32), w = new Uint8Array(64);
        f.fill(204, 0, 2); f.fill(204, 2, 11);
        for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * 0.6 * 127);
        frequencies = f; waveform = w; micActive = true;
        let now = performance.now();
        const frames = (n, peak) => {
          micPeak = peak; const t0 = performance.now();
          for (let k = 0; k < n; k++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
          return (performance.now() - t0) / n;
        };
        const flying = frames(300, 0.6), before = currentViz.probe();
        const flare = frames(1, 0.95);
        const after = frames(60, 0.6), then = currentViz.probe();
        return { flying, flare, after, points: before.points, flares: then.flares };
      } finally {
        frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak;
        window.__cometSeed = saved.seed;
        applyConfig({ perViz: { comet: { trail: 50 } } });
      }
    });
    check('comet: draws in under 1.5 ms with the longest tail, and its flare frame in under 4',
      cometCost.points > 100 && cometCost.flares === 1 && cometCost.flying < 1.5 && cometCost.after < 1.5 && cometCost.flare < 4,
      `flying ${cometCost.flying.toFixed(3)}, flare frame ${cometCost.flare.toFixed(2)}, after ${cometCost.after.toFixed(3)} (${cometCost.points} points, ${cometCost.flares} flare)`);
    check('comet: no page errors from the Comet checks', pageErrors.length === 0 && p43Errors.length === 0 && wideErrors.length === 0,
      [...pageErrors, ...p43Errors, ...wideErrors].join(' | '));

    // ── Fireflies: a living swarm (16:9 page unless noted) ───────────────────
    // A pushed config is the defaults plus the changes, so Fireflies' knobs are at their defaults.
    const fliesOn = async (pages, idle) => {
      await pushConfig((c) => { c.activeViz = 'fireflies'; c.idleAnim = idle; });
      for (const pg of pages) await pg.waitForFunction((i) => window.__timbre.currentVizName === 'fireflies' && cfgIdleAnim === i, idle, { timeout: 5000 });
    };
    const ff = (...rs) => JSON.stringify(rs.map((r) => r && ({ n: r.n, lit: r.lit, flashes: r.flashes, startles: r.startles, waves: r.waves, inside: r.inside,
      loud: r.loud, sync: r.sync, low: r.low, high: r.high, haloScale: r.haloScale, glow: r.glow, ink: r.ink, firstX: r.firstX,
      flicker: r.flicker, drawn: r.drawn })));
    await fliesOn([page, p43, wide], false);
    for (const pg of [page, p43, wide]) {
      const size = await pg.evaluate(() => `${W}×${H}`);
      const [r] = await fliesRun(pg, [{ secs: 3, ...talk }]);
      check(`fireflies: a swarm of 35 inside the frame at ${size}`, r.ink > 0 && r.inside === true && r.n === 35 && r.flashes > 0 && r.startles === 0, ff(r));
    }
    // Ten seconds silent, then ten of a steady voice. Silent, 35 fireflies blink about 44 times in ten seconds.
    const [fQuiet, fLoud] = await fliesRun(wide, [{ secs: 10, ...silence }, { secs: 10, ...loudTalk }]);
    check('fireflies: silent, they blink rarely', fQuiet.flashes >= 20 && fQuiet.flashes <= 80 && fQuiet.loud < 0.01 && fQuiet.inside === true, ff(fQuiet));
    check('fireflies: a voice makes them blink more', fLoud.flashes - fQuiet.flashes > 2.5 * fQuiet.flashes && fLoud.loud > 0.8 && fLoud.inside === true, ff(fQuiet, fLoud));
    check('fireflies: leaves the canvas state as it found it',
      [fQuiet, fLoud].every((r) => r.op === 'source-over' && r.blur === 0 && r.globalAlpha === 1 && r.offsetX === 0 && r.transformKept === true),
      JSON.stringify([fQuiet, fLoud].map((r) => [r.op, r.blur, r.globalAlpha, r.offsetX, r.transformKept])));
    // Syllables: 0.18 s of voice, 0.42 s of quiet. The voice is on for 30% of the time.
    const fSyll = await fliesRun(wide, Array.from({ length: 40 }, (_, i) => (i % 2 ? { secs: 0.42, ...silence } : { secs: 0.18, ...loudTalk })));
    let inVoice = 0, inQuiet = 0;
    for (let i = 8; i < 40; i++) { const d = fSyll[i].flashes - fSyll[i - 1].flashes; if (i % 2) inQuiet += d; else inVoice += d; }
    check('fireflies: flashes bunch on the syllables', inVoice > inQuiet && inVoice + inQuiet > 30, `${inVoice} flashes in the syllables, ${inQuiet} between them`);

    // The startle.
    const fYell = [{ secs: 1.5, ...talk }, { secs: 0.1, ...talk, peak: 0.95 }];
    const [fCalm, fStartled] = await fliesRun(wide, fYell);
    check('fireflies: a peak startles the whole swarm',
      fCalm.startles === 0 && fStartled.startles === 1 && fStartled.lit === fStartled.n && fStartled.inside === true && fStartled.glow > 2 * fCalm.glow, ff(fCalm, fStartled));
    const [, fSmall] = await fliesRun(page, fYell);
    check('fireflies: the same on the small page', fSmall.startles === 1 && fSmall.lit === fSmall.n && fSmall.inside === true, ff(fSmall));
    const [, , fAfter] = await fliesRun(wide, [...fYell, { secs: 4, ...talk }]);
    check('fireflies: the swarm settles after a startle', fAfter.startles === 1 && fAfter.inside === true && fAfter.lit < fAfter.n, ff(fAfter));
    const [, fHeld] = await fliesRun(wide, [{ secs: 1.5, ...talk }, { secs: 2.5, ...talk, peak: 0.95 }]);
    check('fireflies: a held yell startles again only once a second', fHeld.startles === 3, ff(fHeld));
    const [fGain] = await fliesRun(wide, [{ secs: 5, wave: 0.6, low: 0.6, high: 0.6, peak: 0.6, config: { gain: 200 } }]);
    await wide.evaluate(() => applyConfig({ gain: 100 }));
    check('fireflies: talking with Gain at 200% does not startle', fGain.startles === 0, ff(fGain));
    const [, fSens0] = await fliesRun(wide, [{ secs: 1.5, ...talk, config: { perViz: { fireflies: { startleSensitivity: 0 } } } }, { secs: 1, ...talk, peak: 1 }]);
    await wide.evaluate(() => applyConfig({ perViz: { fireflies: { startleSensitivity: 50 } } }));
    check('fireflies: Startle Sensitivity 0 never startles', fSens0.startles === 0, ff(fSens0));
    const [, fWave] = await fliesRun(wide, [{ secs: 1.5, ...talk }, { secs: 0.1, wave: 0.95, low: 0.5, high: 0.3, peak: null }]);
    check('fireflies: falls back to the waveform peak', fWave.startles === 1, ff(fWave));
    const [, fOpen] = await fliesRun(wide, [{ secs: 1.5, ...off }, { secs: 0.3, ...talk, peak: 0.95 }]);
    check('fireflies: the mic opening on a loud moment does not startle', fOpen.startles === 0, ff(fOpen));

    // Mic off.
    const [fBefore, fOff] = await fliesRun(wide, [{ secs: 2, ...loudTalk }, { secs: 10, ...off }]);
    check('fireflies: mic off, they drift and blink rarely',
      fOff.loud < 0.01 && fOff.low < 0.001 && fOff.flashes - fBefore.flashes >= 15 && fOff.flashes - fBefore.flashes <= 90 && fOff.inside === true, ff(fBefore, fOff));
    await fliesOn([wide], true);
    const fIdle = (await fliesRun(wide, [{ secs: 0, ...off }, ...Array.from({ length: 16 }, () => ({ secs: 0.25, ...off }))])).slice(1);
    const fIdleLow = fIdle.map((r) => r.low);
    check('fireflies: mic off with idle animation: only the glow breathes',
      Math.max(...fIdleLow) - Math.min(...fIdleLow) > 0.15 && fIdle.every((r) => r.loud === 0 && r.startles === 0),
      JSON.stringify({ low: [Math.min(...fIdleLow), Math.max(...fIdleLow)], loud: fIdle[15].loud }));
    await fliesOn([wide], false);
    const [fLowOnly] = await fliesRun(wide, [{ secs: 2, wave: 0.3, low: 0.9, high: 0, peak: 0.3 }]);
    const [fHighOnly] = await fliesRun(wide, [{ secs: 2, wave: 0.3, low: 0, high: 0.9, peak: 0.3 }]);
    check('fireflies: the low end swells the glow, and the high end makes lit ones flicker',
      fLowOnly.haloScale > fHighOnly.haloScale * 1.5 && fHighOnly.high > 0.5 && fLowOnly.high < 0.1 && fHighOnly.flicker > 0.1 && fLowOnly.flicker < 0.02, ff(fLowOnly, fHighOnly));

    // Settings and the box.
    const [fFew] = await fliesRun(wide, [{ secs: 2, ...talk, config: { perViz: { fireflies: { density: 0 } } } }]);
    const [fMany] = await fliesRun(wide, [{ secs: 2, ...talk, config: { perViz: { fireflies: { density: 100 } } } }]);
    await wide.evaluate(() => applyConfig({ perViz: { fireflies: { density: 50 } } }));
    check('fireflies: Density sets how many there are', fFew.n === 10 && fMany.n === 60 && fMany.inside === true, ff(fFew, fMany));
    // Density moved while the swarm is flying: every firefly that is there is drawn, and no other.
    const [fGrowFrom, fGrown, fShrunk] = await fliesRun(wide, [{ secs: 2, ...talk }, { secs: 1, ...talk, config: { perViz: { fireflies: { density: 100 } } } },
      { secs: 1.5, ...talk, config: { perViz: { fireflies: { density: 0 } } } }]);
    await wide.evaluate(() => applyConfig({ perViz: { fireflies: { density: 50 } } }));
    check('fireflies: Density moved mid-flight adds and removes fireflies, and all of them are drawn',
      fGrowFrom.n === 35 && fGrowFrom.drawn === 35 && fGrown.n === 60 && fGrown.drawn === 60 && fShrunk.n === 10 && fShrunk.drawn === 10, ff(fGrowFrom, fGrown, fShrunk));
    const [, fPushFrom, fPushTo] = await fliesRun(wide, [{ secs: 2, ...talk }, { secs: 1 / 60, ...talk }, { secs: 1 / 60, ...talk, config: { bounce: 70 } }]);
    await wide.evaluate(() => applyConfig({ bounce: 50 }));
    check('fireflies: a config push keeps the swarm',
      fPushTo.n === fPushFrom.n && fPushTo.flashes >= fPushFrom.flashes && fPushFrom.flashes > 0 && Math.abs(fPushTo.firstX - fPushFrom.firstX) < 10, ff(fPushFrom, fPushTo));
    const [, fSizeFrom, fSized, fSizeLater] = await fliesRun(wide, [{ secs: 2, ...talk }, { secs: 1 / 60, ...talk },
      { secs: 1 / 60, ...talk, config: { showLabels: false } }, { secs: 2, ...talk }]);
    await wide.evaluate(() => applyConfig({ showLabels: true }));
    check('fireflies: a real size change keeps the swarm, inside the new frame',
      fSized.n === fSizeFrom.n && fSized.flashes >= fSizeFrom.flashes && fSized.inside === true && fSizeLater.inside === true && fSizeLater.n === fSizeFrom.n, ff(fSizeFrom, fSized, fSizeLater));
    const fSeeded = async () => (await fliesRun(wide, [...fYell, { secs: 0.3, ...talk }], { seed: 7 }))[2];
    const fSeedA = await fSeeded(), fSeedB = await fSeeded();
    check('fireflies: a seeded run repeats', fSeedA.flashes > 35 && fSeedA.flashes === fSeedB.flashes && fSeedA.ink === fSeedB.ink && fSeedA.firstX === fSeedB.firstX, ff(fSeedA, fSeedB));

    // Cost, with the largest swarm: 300 loud frames, the one frame of a 0.95 peak, then 60 more.
    const fliesCost = await wide.evaluate(() => {
      const saved = { frequencies, waveform, micActive, micPeak, seed: window.__firefliesSeed };
      try {
        applyConfig({ perViz: { fireflies: { density: 100 } } });
        window.__firefliesSeed = 1;
        currentViz = VIZ_FACTORIES['fireflies']();
        const f = new Uint8Array(32), w = new Uint8Array(64);
        f.fill(204, 0, 2); f.fill(204, 2, 11);
        for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * 0.6 * 127);
        frequencies = f; waveform = w; micActive = true;
        let now = performance.now();
        const frames = (n, peak) => {
          micPeak = peak; const t0 = performance.now();
          for (let k = 0; k < n; k++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
          return (performance.now() - t0) / n;
        };
        const flying = frames(300, 0.6), before = currentViz.probe();
        const startle = frames(1, 0.95);
        const after = frames(60, 0.6), then = currentViz.probe();
        return { flying, startle, after, n: before.n, startles: then.startles };
      } finally {
        frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak;
        window.__firefliesSeed = saved.seed;
        applyConfig({ perViz: { fireflies: { density: 50 } } });
      }
    });
    check('fireflies: draws in under 1.5 ms with the largest swarm, and its startle frame in under 4',
      fliesCost.n === 60 && fliesCost.startles === 1 && fliesCost.flying < 1.5 && fliesCost.after < 1.5 && fliesCost.startle < 4,
      `flying ${fliesCost.flying.toFixed(3)}, startle frame ${fliesCost.startle.toFixed(2)}, after ${fliesCost.after.toFixed(3)} (${fliesCost.n} fireflies, ${fliesCost.startles} startle)`);
    check('fireflies: no page errors from the Fireflies checks', pageErrors.length === 0 && p43Errors.length === 0 && wideErrors.length === 0,
      [...pageErrors, ...p43Errors, ...wideErrors].join(' | '));

    // ── Pulse Rings: a ringed planet (16:9 page unless noted) ────────────────
    const ringsOn = async (pages, idle) => {
      await pushConfig((c) => { c.activeViz = 'pulse-rings'; c.idleAnim = idle; });
      for (const pg of pages) await pg.waitForFunction((i) => window.__timbre.currentVizName === 'pulse-rings' && cfgIdleAnim === i, idle, { timeout: 5000 });
    };
    const pr = (...rs) => JSON.stringify(rs.map((r) => r && ({ state: r.state, pieces: r.pieces, blasts: r.blasts, jostles: r.jostles, inside: r.inside, loud: r.loud, low: r.low, high: r.high,
      planetR: r.planetR, show: r.show, levelIn: r.levelIn, levelMid: r.levelMid, levelOut: r.levelOut, lift: r.lift, reach: r.reach, ringAlpha: r.ringAlpha, sparkle: r.sparkle,
      halo: r.halo, core: r.core, spin: r.spin, ink: r.ink, top: r.top, bottom: r.bottom, emptyCols: r.emptyCols })));
    const prKnobs = (k) => ({ perViz: { 'pulse-rings': k } });
    await ringsOn([page, p43, wide], false);
    for (const pg of [page, p43, wide]) {
      const [size, h] = await pg.evaluate(() => [`${W}×${H}`, H]);
      const [r] = await ringsRun(pg, [{ secs: 3, ...talk }]);
      check(`pulse rings: a whole ringed planet inside the frame at ${size}`,
        r.ink > 0 && r.state === 'whole' && r.pieces === 0 && r.blasts === 0 && r.show > 0.999 && r.top > 0 && r.bottom < h - 1 && r.emptyCols > 0, pr(r));
    }
    // One syllable, then quiet: it is at the inner edge first, the middle next, the outer edge last.
    const [, rIn, rMid, rOut] = await ringsRun(wide, [{ secs: 1.5, ...silence }, { secs: 0.1, ...loudTalk }, { secs: 0.45, ...silence }, { secs: 0.45, ...silence }]);
    check('pulse rings: a syllable ripples outward through the rings',
      rIn.levelIn > 0.6 && rIn.levelMid < 0.05 && rIn.levelOut < 0.05 && rMid.levelMid > 0.3 && rMid.levelIn < 0.05 && rMid.levelOut < 0.05
      && rOut.levelOut > 0.3 && rOut.levelIn < 0.05 && rOut.levelMid < 0.05 && rMid.lift > 2, pr(rIn, rMid, rOut));
    const [rQuiet, rLoud] = await ringsRun(wide, [{ secs: 3, ...silence }, { secs: 3, ...loudTalk }]);
    check('pulse rings: silent, the rings rest dim; a voice lights them and the planet\'s glow',
      rQuiet.ringAlpha > 0 && rLoud.ringAlpha > 3 * rQuiet.ringAlpha && rLoud.halo > 1.5 * rQuiet.halo && rLoud.alpha > 1.5 * rQuiet.alpha && rLoud.spin - rQuiet.spin > 3 * rQuiet.spin
      && rQuiet.state === 'whole' && rLoud.state === 'whole', pr(rQuiet, rLoud));
    // Whole, the frame of the blast, in pieces, on the way back, and whole again.
    // The canvas is handed over with unusual line settings, which must come back untouched.
    const rStateSteps = [{ secs: 1.5, ...talk }, { secs: 1 / 60, ...talk, peak: 0.95 }, { secs: 1, ...talk }, { secs: 2.6, ...talk }, { secs: 2, ...talk }];
    const rStates = await ringsRun(wide, rStateSteps, { odd: true });
    const rUsual = await ringsRun(wide, rStateSteps);
    check('pulse rings: draws the same whatever line settings it is handed',
      rStates.every((r, i) => r.ink === rUsual[i].ink && r.alpha === rUsual[i].alpha), JSON.stringify(rStates.map((r, i) => [r.state, r.ink, rUsual[i].ink, r.alpha, rUsual[i].alpha])));
    check('pulse rings: leaves the canvas state as it found it, whole, in pieces and on the way back',
      rStates.map((r) => r.state).join() === 'whole,pieces,pieces,returning,whole'
      && [rQuiet, rLoud, ...rStates].every((r) => r.op === 'source-over' && r.blur === 0 && r.globalAlpha === 1 && r.offsetX === 0 && r.transformKept === true && r.linesKept === true && r.unclipped === true),
      JSON.stringify([rQuiet, rLoud, ...rStates].map((r) => [r.state, r.op, r.blur, r.globalAlpha, r.offsetX, r.transformKept, r.linesKept, r.unclipped])));
    const [rLowOnly] = await ringsRun(wide, [{ secs: 2, wave: 0.3, low: 0.9, high: 0, peak: 0.3 }]);
    const [rHighOnly] = await ringsRun(wide, [{ secs: 2, wave: 0.3, low: 0, high: 0.9, peak: 0.3 }]);
    check('pulse rings: the low end swells the planet, and the high end makes the ice glitter',
      rLowOnly.planetR > rHighOnly.planetR * 1.04 && rHighOnly.high > 0.5 && rLowOnly.high < 0.1 && rHighOnly.sparkle > 1.5 * rLowOnly.sparkle, pr(rLowOnly, rHighOnly));

    // The explosion.
    const rYell = [{ secs: 1.5, ...talk }, { secs: 0.1, ...talk, peak: 0.95 }];
    const [rCalm, rBlown, rThin] = await ringsRun(wide, [...rYell, { secs: 0.8, ...talk }]);
    check('pulse rings: a peak blows the planet into chunks and thins the rings',
      rCalm.state === 'whole' && rCalm.blasts === 0 && rBlown.state === 'pieces' && rBlown.pieces === 22 && rBlown.blasts === 1 && rBlown.core > 0
      && rThin.state === 'pieces' && rThin.show > 0.4 && rThin.show < 0.5 && rThin.inside === true, pr(rCalm, rBlown, rThin));
    const [, rSmall] = await ringsRun(page, rYell);
    check('pulse rings: the same on the small page', rSmall.state === 'pieces' && rSmall.pieces === 22 && rSmall.inside === true, pr(rSmall));
    const [, , rWait, rBack, rWhole, rFull] = await ringsRun(wide, [...rYell, { secs: 2.8, ...talk }, { secs: 0.5, ...talk }, { secs: 1.3, ...talk }, { secs: 2.5, ...talk }]);
    check('pulse rings: after three calm seconds the chunks return and the rings fill back in',
      rWait.state === 'pieces' && rBack.state === 'returning' && rWhole.state === 'whole' && rWhole.pieces === 0 && rWhole.core === 0 && rWhole.show > rWait.show + 0.1
      && rFull.show > 0.97 && rFull.blasts === 1, pr(rWait, rBack, rWhole, rFull));
    // The refill starts with the snap, at any frame rate: half a second after the planet is whole
    // again the inner rings are full and the outer ones are not, so a refill that started a frame
    // or two early shows in how whole the rings are (before it was tied to the snap, ten frames a
    // second read 0.09 fuller than sixty). What is left is the machine's own calm wait, which
    // ends on a whole frame: at 60 fps it ends one frame later than at 10 or 144, worth 0.012 here.
    const rRefill = async (fps) => (await ringsRun(wide, [{ secs: 1.5, ...talk }, { secs: 0.1, ...talk, peak: 0.95 }, { secs: 4.9, ...talk }], { fps }))[2];
    const rFill10 = await rRefill(10), rFill60 = await rRefill(60), rFill144 = await rRefill(144);
    check('pulse rings: the rings fill back in from the snap, the same at 10, 60 and 144 fps',
      [rFill10, rFill60, rFill144].every((r) => r.state === 'whole' && r.show > 0.5 && r.show < 0.95) && Math.abs(rFill144.show - rFill60.show) < 0.02 && Math.abs(rFill10.show - rFill60.show) < 0.02,
      JSON.stringify([rFill10.show, rFill60.show, rFill144.show]));
    // The planet was cut while a thump had swollen it. When the chunks are back it is that size,
    // and only then relaxes: frame by frame across the moment it becomes whole, it never jumps.
    const rJoin = await ringsRun(wide, [{ secs: 1.5, wave: 0.5, low: 1, high: 0.3, peak: 0.5 }, { secs: 0.1, wave: 0.5, low: 1, high: 0.3, peak: 0.95 }, { secs: 4.3, ...silence },
      ...Array.from({ length: 30 }, () => ({ secs: 1 / 60, ...silence }))]);
    const rJoinR = rJoin.slice(2).map((r) => r.planetR), rJoinStep = Math.max(...rJoinR.slice(1).map((v, i) => Math.abs(v - rJoinR[i])));
    check('pulse rings: the planet does not change size in one frame when it comes back together',
      rJoin[2].state === 'returning' && rJoin[rJoin.length - 1].state === 'whole' && rJoinR[0] > 24 * 4.8 * 1.05 && rJoinStep < 1.5 && rJoinR[rJoinR.length - 1] < rJoinR[0],
      JSON.stringify({ from: rJoinR[0], to: rJoinR[rJoinR.length - 1], mostInOneFrame: rJoinStep }));
    const [, , rSoon] = await ringsRun(wide, [{ secs: 1.5, ...talk, config: prKnobs({ reconnectSeconds: 1 }) }, { secs: 0.1, ...talk, peak: 0.95 }, { secs: 2.7, ...talk }]);
    await wide.evaluate(() => applyConfig({ perViz: { 'pulse-rings': { reconnectSeconds: 3 } } }));
    check('pulse rings: Reconnect Seconds sets the wait', rSoon.state === 'whole', pr(rSoon));
    const [, , rApartQuiet, rApartLoud] = await ringsRun(wide, [...rYell, { secs: 1.2, ...silence }, { secs: 0.3, ...loudTalk }]);
    check('pulse rings: in pieces, the rings and the core still answer the voice',
      rApartLoud.state === 'pieces' && rApartLoud.levelIn > 0.6 && rApartLoud.ringAlpha > 2 * rApartQuiet.ringAlpha && rApartLoud.core > rApartQuiet.core * 1.1, pr(rApartQuiet, rApartLoud));
    const [, rHeld] = await ringsRun(wide, [{ secs: 1.5, ...talk }, { secs: 2.5, ...talk, peak: 0.95 }]);
    check('pulse rings: a held yell blows it apart once, then only jostles the chunks', rHeld.blasts === 1 && rHeld.jostles >= 2 && rHeld.state === 'pieces' && rHeld.inside === true, pr(rHeld));
    const [rGain] = await ringsRun(wide, [{ secs: 5, wave: 0.6, low: 0.6, high: 0.6, peak: 0.6, config: { gain: 200 } }]);
    await wide.evaluate(() => applyConfig({ gain: 100 }));
    check('pulse rings: talking with Gain at 200% does not blow it apart', rGain.blasts === 0 && rGain.state === 'whole', pr(rGain));
    const [, rSens0] = await ringsRun(wide, [{ secs: 1.5, ...talk, config: prKnobs({ explodeSensitivity: 0 }) }, { secs: 1, ...talk, peak: 1 }]);
    await wide.evaluate(() => applyConfig({ perViz: { 'pulse-rings': { explodeSensitivity: 50 } } }));
    check('pulse rings: Explode Sensitivity 0 never blows it apart', rSens0.blasts === 0 && rSens0.state === 'whole', pr(rSens0));
    const [, rWave] = await ringsRun(wide, [{ secs: 1.5, ...talk }, { secs: 0.1, wave: 0.95, low: 0.5, high: 0.3, peak: null }]);
    check('pulse rings: falls back to the waveform peak', rWave.blasts === 1, pr(rWave));
    const [, rOpen] = await ringsRun(wide, [{ secs: 1.5, ...off }, { secs: 0.3, ...talk, peak: 0.95 }]);
    check('pulse rings: the mic opening on a loud moment does not blow it apart', rOpen.blasts === 0 && rOpen.state === 'whole', pr(rOpen));

    // Mic off.
    const [, rOff] = await ringsRun(wide, [{ secs: 2, ...loudTalk }, { secs: 3, ...off }]);
    check('pulse rings: mic off, the rings rest', rOff.loud < 0.01 && rOff.levelIn < 0.01 && rOff.levelOut < 0.01 && rOff.state === 'whole' && rOff.ink > 0, pr(rOff));
    await ringsOn([wide], true);
    const rIdle = (await ringsRun(wide, [{ secs: 0, ...off }, ...Array.from({ length: 24 }, () => ({ secs: 0.25, ...off }))])).slice(1);
    const rIdleIn = rIdle.map((r) => r.levelIn), rIdleR = rIdle.map((r) => r.planetR);
    check('pulse rings: mic off with idle animation: a slow ripple keeps crossing the rings',
      Math.max(...rIdleIn) - Math.min(...rIdleIn) > 0.15 && Math.max(...rIdleR) > Math.min(...rIdleR) && rIdle.every((r) => r.blasts === 0 && r.state === 'whole'),
      JSON.stringify({ levelIn: [Math.min(...rIdleIn), Math.max(...rIdleIn)], planetR: [Math.min(...rIdleR), Math.max(...rIdleR)] }));
    await ringsOn([wide], false);

    // Settings and the box.
    const soft = { wave: 0.3, low: 0.3, high: 0.2, peak: 0.3 };   // loudness 0.3 × 1.5 = 0.45
    const [rDull] = await ringsRun(wide, [{ secs: 2, ...soft, config: prKnobs({ sensitivity: 0 }) }]);
    const [rKeen] = await ringsRun(wide, [{ secs: 2, ...soft, config: prKnobs({ sensitivity: 100 }) }]);
    await wide.evaluate(() => applyConfig({ perViz: { 'pulse-rings': { sensitivity: 50 } } }));
    check('pulse rings: Sensitivity sets how strongly the rings answer', Math.abs(rDull.levelMid - 0.27) < 0.03 && Math.abs(rKeen.levelMid - 0.765) < 0.03, pr(rDull, rKeen));
    const [rNarrow] = await ringsRun(wide, [{ secs: 2, ...talk }]);
    const [rWide] = await ringsRun(wide, [{ secs: 2, ...talk, config: prKnobs({ flow: 100 }) }]);
    await wide.evaluate(() => applyConfig({ perViz: { 'pulse-rings': { flow: 0 } } }));
    check('pulse rings: Flow spreads the rings farther out',
      Math.abs(rWide.reach / rNarrow.reach - 4.1 / 3.1) < 0.02 && rWide.emptyCols < rNarrow.emptyCols - 100 && rWide.emptyCols > 0 && rWide.top > 0, pr(rNarrow, rWide));
    const [, , rPushFrom, rPushTo] = await ringsRun(wide, [...rYell, { secs: 0.5, ...talk }, { secs: 1 / 60, ...talk, config: { bounce: 70 } }]);
    await wide.evaluate(() => applyConfig({ bounce: 50 }));
    const [, rWholeFrom, rWholeTo] = await ringsRun(wide, [{ secs: 2, ...talk }, { secs: 1 / 60, ...talk }, { secs: 1 / 60, ...talk, config: { bounce: 70 } }]);
    await wide.evaluate(() => applyConfig({ bounce: 50 }));
    // The storm's angle starts from nothing when the effect is made again, so it going on from where it was shows the effect was kept.
    check('pulse rings: a config push keeps the planet as it is, in pieces or whole',
      rPushFrom.state === 'pieces' && rPushTo.state === 'pieces' && rPushTo.pieces === 22 && rPushTo.blasts === 1 && rPushTo.spin > rPushFrom.spin
      && rWholeTo.state === 'whole' && rWholeTo.show === 1 && rWholeTo.spin > rWholeFrom.spin && rWholeFrom.spin > 1, pr(rPushFrom, rPushTo, rWholeFrom, rWholeTo));
    const [, , rSizeFrom, rSized, rSizeLater] = await ringsRun(wide, [...rYell, { secs: 0.5, ...talk }, { secs: 1 / 60, ...talk, config: { showLabels: false } }, { secs: 2, ...talk }]);
    await wide.evaluate(() => applyConfig({ showLabels: true }));
    check('pulse rings: a real size change in pieces puts the planet back whole, in the new frame',
      rSizeFrom.state === 'pieces' && rSized.state === 'whole' && rSized.pieces === 0 && rSized.show === 1 && rSizeLater.state === 'whole' && rSizeLater.ink > 0 && rSizeLater.top > 0, pr(rSizeFrom, rSized, rSizeLater));
    const rSeeded = async () => (await ringsRun(wide, [...rYell, { secs: 0.3, ...talk }], { seed: 7 }))[2];
    const rSeedA = await rSeeded(), rSeedB = await rSeeded();
    const [, , rSeedOther] = await ringsRun(wide, [...rYell, { secs: 0.3, ...talk }], { seed: 8 });
    check('pulse rings: a seeded run repeats', rSeedA.pieces === 22 && rSeedA.ink === rSeedB.ink && rSeedA.sparkle === rSeedB.sparkle && rSeedA.ink !== rSeedOther.ink, pr(rSeedA, rSeedB, rSeedOther));

    // Cost: 300 loud frames whole, the one frame of a 0.95 peak, then 120 in pieces.
    const ringsCost = await wide.evaluate(() => {
      const saved = { frequencies, waveform, micActive, micPeak, seed: window.__pulseRingsSeed };
      try {
        window.__pulseRingsSeed = 1;
        currentViz = VIZ_FACTORIES['pulse-rings']();
        const f = new Uint8Array(32), w = new Uint8Array(64);
        f.fill(204, 0, 2); f.fill(204, 2, 11);
        for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * 0.6 * 127);
        frequencies = f; waveform = w; micActive = true;
        let now = performance.now();
        const frames = (n, peak) => {
          micPeak = peak; const t0 = performance.now();
          for (let k = 0; k < n; k++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
          return (performance.now() - t0) / n;
        };
        const whole = frames(300, 0.6);
        const blast = frames(1, 0.95);
        const apart = frames(120, 0.6), then = currentViz.probe();
        return { whole, blast, apart, state: then.state, pieces: then.pieces };
      } finally {
        frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak;
        window.__pulseRingsSeed = saved.seed;
      }
    });
    check('pulse rings: draws in under 1.5 ms whole and in pieces, and its blast frame in under 4',
      ringsCost.state === 'pieces' && ringsCost.pieces === 22 && ringsCost.whole < 1.5 && ringsCost.apart < 1.5 && ringsCost.blast < 4,
      `whole ${ringsCost.whole.toFixed(3)}, blast frame ${ringsCost.blast.toFixed(2)}, in pieces ${ringsCost.apart.toFixed(3)} (${ringsCost.state}, ${ringsCost.pieces} chunks)`);
    check('pulse rings: no page errors from the Pulse Rings checks', pageErrors.length === 0 && p43Errors.length === 0 && wideErrors.length === 0,
      [...pageErrors, ...p43Errors, ...wideErrors].join(' | '));

    // ── Orbit: planets round a sun (16:9 page unless noted) ──────────────────
    const orbitOn = async (pages, idle) => {
      await pushConfig((c) => { c.activeViz = 'orbit'; c.idleAnim = idle; });
      for (const pg of pages) await pg.waitForFunction((i) => window.__timbre.currentVizName === 'orbit' && cfgIdleAnim === i, idle, { timeout: 5000 });
    };
    const ob = (...rs) => JSON.stringify(rs.map((r) => r && ({ n: r.n, listed: r.listed, drawn: r.drawn, inside: r.inside, speed: r.speed, loud: r.loud, low: r.low, high: r.high,
      sunR: r.sunR, flares: r.flares, flare: r.flare, turned: r.turned, streak: r.streak, rays: r.rays, ink: r.ink, top: r.top, bottom: r.bottom, emptyCols: r.emptyCols })));
    const obKnobs = (k) => ({ perViz: { orbit: k } });
    await orbitOn([page, p43, wide], false);
    for (const pg of [page, p43, wide]) {
      const [size, h] = await pg.evaluate(() => [`${W}×${H}`, H]);
      const [r] = await orbitRun(pg, [{ secs: 3, ...talk }]);
      check(`orbit: a sun and six planets inside the frame at ${size}`,
        r.ink > 0 && r.n === 6 && r.listed === 6 && r.drawn === 6 && r.inside === true && r.flares === 0 && r.top > 0 && r.bottom < h - 1 && r.emptyCols > 0, ob(r));
    }
    const [oQuiet, oLoud] = await orbitRun(wide, [{ secs: 3, ...silence }, { secs: 3, ...loudTalk }]);
    check('orbit: silent, the planets drift; a voice makes them orbit faster and streak farther',
      oQuiet.turned > 0.5 && oLoud.turned - oQuiet.turned > 5 * oQuiet.turned && oLoud.speed > 3 && Math.abs(oQuiet.speed - 0.4) < 0.01 && oLoud.streak > 3 * oQuiet.streak
      && oQuiet.inside === true && oLoud.inside === true, ob(oQuiet, oLoud));
    // Talking, the frame of a flare, and the flare's ring sweeping out; the canvas is handed over
    // with unusual line settings, which must come back untouched.
    const oStateSteps = [{ secs: 1.5, ...talk }, { secs: 1 / 60, ...talk, peak: 0.95 }, { secs: 0.3, ...talk }, { secs: 2, ...talk }];
    const oStates = await orbitRun(wide, oStateSteps, { odd: true });
    const oUsual = await orbitRun(wide, oStateSteps);
    check('orbit: leaves the canvas state as it found it, flaring or not',
      oStates[1].flares === 1 && [oQuiet, oLoud, ...oStates].every((r) => r.op === 'source-over' && r.blur === 0 && r.globalAlpha === 1 && r.offsetX === 0 && r.transformKept === true && r.linesKept === true && r.unclipped === true),
      JSON.stringify([oQuiet, oLoud, ...oStates].map((r) => [r.flares, r.op, r.blur, r.globalAlpha, r.offsetX, r.transformKept, r.linesKept, r.unclipped])));
    check('orbit: draws the same whatever line settings it is handed',
      oStates.every((r, i) => r.ink === oUsual[i].ink && r.alpha === oUsual[i].alpha), JSON.stringify(oStates.map((r, i) => [r.ink, oUsual[i].ink, r.alpha, oUsual[i].alpha])));
    // What is drawn over what, on every frame of ten seconds of loud talk with nine planets: the
    // far half of each orbit before the sun and the near half after, and within each half the
    // planets from the farthest to the nearest by how near they really are.
    const oOrder = await wide.evaluate(() => {
      const saved = { frequencies, waveform, micActive, micPeak, seed: window.__orbitSeed };
      try {
        applyConfig({ perViz: { orbit: { planets: 9 } } });
        window.__orbitSeed = 3;
        currentViz = VIZ_FACTORIES['orbit']();
        const f = new Uint8Array(32), w = new Uint8Array(64);
        f.fill(204, 0, 2); f.fill(204, 2, 11);
        for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * 0.6 * 127);
        frequencies = f; waveform = w; micActive = true; micPeak = 0.6;
        let now = performance.now(), wrong = 0, frames = 0, bodies = 0, swapsByAngle = 0;
        for (let k = 0; k < 600; k++) {
          now += 1000 / 60; currentViz.draw(now, 1 / 60);
          const order = currentViz.probe().order;
          const sun = order.findIndex((o) => o.sun), far = order.slice(0, sun), near = order.slice(sun + 1);
          const rising = (xs) => xs.every((o, i) => i === 0 || o.depth >= xs[i - 1].depth);
          if (sun < 0 || !far.every((o) => o.depth < 0) || !near.every((o) => o.depth >= 0) || !rising(far) || !rising(near)) wrong++;
          // How often ordering by the angle on its own orbit would have put two planets the other way round.
          for (const half of [far, near]) for (let i = 1; i < half.length; i++) if (half[i].z < half[i - 1].z) swapsByAngle++;
          frames++; bodies += far.length + near.length;
        }
        return { wrong, frames, bodies, swapsByAngle };
      } finally {
        frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak;
        window.__orbitSeed = saved.seed;
        applyConfig({ perViz: { orbit: { planets: 6 } } });
      }
    });
    check('orbit: far planets are drawn before the sun and near ones after, each half from the farthest to the nearest',
      oOrder.wrong === 0 && oOrder.frames === 600 && oOrder.bodies === 5400 && oOrder.swapsByAngle > 20, JSON.stringify(oOrder));
    const [oLowOnly] = await orbitRun(wide, [{ secs: 2, wave: 0.3, low: 0.9, high: 0, peak: 0.3 }]);
    const [oHighOnly] = await orbitRun(wide, [{ secs: 2, wave: 0.3, low: 0, high: 0.9, peak: 0.3 }]);
    check('orbit: the low end swells the sun, and the high end lengthens its rays',
      oLowOnly.sunR > oHighOnly.sunR * 1.3 && Math.abs(oHighOnly.sunR - 12 * 4.8) < 0.5 && oHighOnly.high > 0.5 && oLowOnly.high < 0.1
      && oHighOnly.rays / oHighOnly.sunR > 1.4 * oLowOnly.rays / oLowOnly.sunR, ob(oLowOnly, oHighOnly));

    // The flare.
    const oYell = [{ secs: 1.5, ...talk }, { secs: 0.1, ...talk, peak: 0.95 }];
    const [oCalm, oFlared, oAfter] = await orbitRun(wide, [...oYell, { secs: 4, ...talk }]);
    check('orbit: a peak flares the sun and the planets surge, then settle',
      oCalm.flares === 0 && oFlared.flares === 1 && oFlared.speed > oCalm.speed + 1.8 && oFlared.sunR > oCalm.sunR * 1.15 && oFlared.alpha > 1.3 * oCalm.alpha
      && oAfter.flares === 1 && Math.abs(oAfter.speed - oCalm.speed) < 0.1 && oAfter.inside === true, ob(oCalm, oFlared, oAfter));
    const [, oSmall] = await orbitRun(page, oYell);
    check('orbit: the same on the small page', oSmall.flares === 1 && oSmall.inside === true && oSmall.n === 6, ob(oSmall));
    const [, oHeld] = await orbitRun(wide, [{ secs: 1.5, ...talk }, { secs: 2.5, ...talk, peak: 0.95 }]);
    check('orbit: a held yell flares again only once a second', oHeld.flares === 3 && oHeld.inside === true, ob(oHeld));
    const [oGain] = await orbitRun(wide, [{ secs: 5, wave: 0.6, low: 0.6, high: 0.6, peak: 0.6, config: { gain: 200 } }]);
    await wide.evaluate(() => applyConfig({ gain: 100 }));
    check('orbit: talking with Gain at 200% does not flare', oGain.flares === 0, ob(oGain));
    const [, oSens0] = await orbitRun(wide, [{ secs: 1.5, ...talk, config: obKnobs({ flareSensitivity: 0 }) }, { secs: 1, ...talk, peak: 1 }]);
    await wide.evaluate(() => applyConfig({ perViz: { orbit: { flareSensitivity: 50 } } }));
    check('orbit: Flare Sensitivity 0 never flares', oSens0.flares === 0, ob(oSens0));
    const [, oWave] = await orbitRun(wide, [{ secs: 1.5, ...talk }, { secs: 0.1, wave: 0.95, low: 0.5, high: 0.3, peak: null }]);
    check('orbit: falls back to the waveform peak', oWave.flares === 1, ob(oWave));
    const [, oOpen] = await orbitRun(wide, [{ secs: 1.5, ...off }, { secs: 0.3, ...talk, peak: 0.95 }]);
    const [, , oReopen] = await orbitRun(wide, [{ secs: 3, ...talk }, { secs: 2, ...off }, { secs: 0.3, ...talk, peak: 0.95 }]);
    check('orbit: the mic opening on a loud moment does not flare, the first time or after a mute', oOpen.flares === 0 && oReopen.flares === 0, ob(oOpen, oReopen));
    // Nine planets and a flare: the sun's corona and rays, and the outer planets' glow, fade out before the frame's edge.
    const [, oEdge, oEdgeLater] = await orbitRun(wide, [{ secs: 2, ...loudTalk, config: obKnobs({ planets: 9 }) }, { secs: 0.05, ...loudTalk, peak: 0.95 }, { secs: 0.2, ...loudTalk }]);
    const [, oEdgeSmall] = await orbitRun(page, [{ secs: 2, ...loudTalk }, { secs: 0.05, ...loudTalk, peak: 0.95 }]);
    await wide.evaluate(() => applyConfig({ perViz: { orbit: { planets: 6 } } }));
    check('orbit: a flare with nine planets stays clear of the frame\'s top and bottom',
      oEdge.flares === 1 && oEdge.top > 0 && oEdge.bottom < 623 && oEdgeLater.top > 0 && oEdgeLater.bottom < 623 && oEdgeSmall.flares === 1 && oEdgeSmall.top > 0 && oEdgeSmall.bottom < 129, ob(oEdge, oEdgeLater, oEdgeSmall));

    // Mic off.
    const [oBefore, oOff] = await orbitRun(wide, [{ secs: 2, ...loudTalk }, { secs: 3, ...off }]);
    check('orbit: mic off, the planets drift at their slowest and the sun rests',
      Math.abs(oOff.speed - 0.4) < 0.01 && oOff.loud < 0.01 && oOff.low < 0.001 && oOff.turned > oBefore.turned && Math.abs(oOff.sunR - 12 * 4.8) < 0.1 && oOff.inside === true, ob(oBefore, oOff));
    await orbitOn([wide], true);
    const oIdle = (await orbitRun(wide, [{ secs: 0, ...off }, ...Array.from({ length: 24 }, () => ({ secs: 0.25, ...off }))])).slice(1);
    const oIdleR = oIdle.map((r) => r.sunR);
    check('orbit: mic off with idle animation: the sun breathes and the planets keep drifting',
      Math.max(...oIdleR) - Math.min(...oIdleR) > 0.05 * 12 * 4.8 && oIdle.every((r) => r.flares === 0 && Math.abs(r.speed - 0.4) < 0.01) && oIdle[23].turned > oIdle[0].turned,
      JSON.stringify({ sunR: [Math.min(...oIdleR), Math.max(...oIdleR)], speed: oIdle[23].speed }));
    await orbitOn([wide], false);

    // Settings and the box.
    const [oNone] = await orbitRun(wide, [{ secs: 2, ...talk, config: obKnobs({ planets: 0 }) }]);
    const [oNine] = await orbitRun(wide, [{ secs: 2, ...talk, config: obKnobs({ planets: 9 }) }]);
    await wide.evaluate(() => applyConfig({ perViz: { orbit: { planets: 6 } } }));
    check('orbit: Planets sets how many there are, down to the sun alone',
      oNone.n === 0 && oNone.drawn === 0 && oNone.ink > 0 && oNine.n === 9 && oNine.drawn === 9 && oNine.inside === true && oNine.ink > oNone.ink, ob(oNone, oNine));
    const [oGrowFrom, oGrown, oShrunk] = await orbitRun(wide, [{ secs: 2, ...talk }, { secs: 1, ...talk, config: obKnobs({ planets: 9 }) }, { secs: 1.5, ...talk, config: obKnobs({ planets: 2 }) }]);
    await wide.evaluate(() => applyConfig({ perViz: { orbit: { planets: 6 } } }));
    check('orbit: Planets moved mid-flight adds and removes planets, and all of them are drawn',
      oGrowFrom.n === 6 && oGrowFrom.drawn === 6 && oGrown.n === 9 && oGrown.drawn === 9 && oShrunk.n === 2 && oShrunk.listed === 2 && oShrunk.drawn === 2 && oShrunk.inside === true, ob(oGrowFrom, oGrown, oShrunk));
    // The moment planets are added they are faint, and the moment they are removed they are still
    // there: the picture a frame after the change is close to the one before it.
    const [oSunOnly, oJustAdded, oAddedLater, oJustRemoved, oRemovedLater] = await orbitRun(wide, [{ secs: 2, ...talk, config: obKnobs({ planets: 0 }) },
      { secs: 1 / 60, ...talk, config: obKnobs({ planets: 9 }) }, { secs: 2, ...talk }, { secs: 1 / 60, ...talk, config: obKnobs({ planets: 0 }) }, { secs: 1, ...talk }]);
    await wide.evaluate(() => applyConfig({ perViz: { orbit: { planets: 6 } } }));
    check('orbit: planets fade in and fade out, on the canvas',
      oJustAdded.listed === 9 && oJustAdded.drawn === 9 && oJustAdded.alpha - oSunOnly.alpha < 0.25 * (oAddedLater.alpha - oSunOnly.alpha) && oAddedLater.alpha > 1.2 * oSunOnly.alpha
      && oJustRemoved.n === 0 && oJustRemoved.listed === 9 && oJustRemoved.drawn === 9 && oJustRemoved.alpha - oSunOnly.alpha > 0.7 * (oAddedLater.alpha - oSunOnly.alpha)
      && oRemovedLater.listed === 0 && oRemovedLater.drawn === 0, JSON.stringify([oSunOnly, oJustAdded, oAddedLater, oJustRemoved, oRemovedLater].map((r) => [r.n, r.listed, r.drawn, r.alpha])));
    const [, oPushFrom, oPushTo] = await orbitRun(wide, [{ secs: 2, ...talk }, { secs: 1 / 60, ...talk }, { secs: 1 / 60, ...talk, config: { bounce: 70 } }]);
    await wide.evaluate(() => applyConfig({ bounce: 50 }));
    check('orbit: a config push keeps the planets on their way', oPushTo.n === 6 && oPushTo.turned > oPushFrom.turned && oPushTo.turned - oPushFrom.turned < 0.2, ob(oPushFrom, oPushTo));
    const [, oSizeFrom, oSized, oSizeLater] = await orbitRun(wide, [{ secs: 2, ...talk }, { secs: 1 / 60, ...talk },
      { secs: 1 / 60, ...talk, config: { showLabels: false } }, { secs: 2, ...talk }]);
    await wide.evaluate(() => applyConfig({ showLabels: true }));
    check('orbit: a real size change keeps the planets, inside the new frame',
      oSized.n === 6 && oSized.inside === true && oSized.turned > oSizeFrom.turned && oSized.turned - oSizeFrom.turned < 0.2 && oSizeLater.inside === true && oSizeLater.drawn === 6, ob(oSizeFrom, oSized, oSizeLater));
    // That was the frame growing (the labels gone). Now it shrinks back, with nine planets spread
    // over the taller frame: every one is inside the shorter frame on the very next draw.
    const [oTall, oShort, oShortLater] = await orbitRun(wide, [{ secs: 3, ...talk, config: { showLabels: false, perViz: { orbit: { planets: 9 } } } },
      { secs: 1 / 60, ...talk, config: { showLabels: true } }, { secs: 2, ...talk }]);
    await wide.evaluate(() => applyConfig({ showLabels: true, perViz: { orbit: { planets: 6 } } }));
    check('orbit: when the frame shrinks, every planet is inside it on the next draw',
      oTall.n === 9 && oTall.inside === true && oShort.n === 9 && oShort.inside === true && oShort.drawn === 9 && oShort.turned - oTall.turned < 0.2 && oShortLater.inside === true, ob(oTall, oShort, oShortLater));
    const oSeeded = async (seed) => (await orbitRun(wide, [...oYell, { secs: 0.3, ...talk }], { seed }))[2];
    const oSeedA = await oSeeded(7), oSeedB = await oSeeded(7), oSeedC = await oSeeded(8);
    check('orbit: a seeded run repeats', oSeedA.flares === 1 && oSeedA.ink === oSeedB.ink && oSeedA.turned === oSeedB.turned && oSeedA.ink !== oSeedC.ink, ob(oSeedA, oSeedB, oSeedC));

    // Cost, with nine planets: 300 loud frames, the one frame of a 0.95 peak, then 60 more.
    const orbitCost = await wide.evaluate(() => {
      const saved = { frequencies, waveform, micActive, micPeak, seed: window.__orbitSeed };
      try {
        applyConfig({ perViz: { orbit: { planets: 9 } } });
        window.__orbitSeed = 1;
        currentViz = VIZ_FACTORIES['orbit']();
        const f = new Uint8Array(32), w = new Uint8Array(64);
        f.fill(204, 0, 2); f.fill(204, 2, 11);
        for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * 0.6 * 127);
        frequencies = f; waveform = w; micActive = true;
        let now = performance.now();
        const frames = (n, peak) => {
          micPeak = peak; const t0 = performance.now();
          for (let k = 0; k < n; k++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
          return (performance.now() - t0) / n;
        };
        const flying = frames(300, 0.6);
        const flare = frames(1, 0.95);
        const after = frames(60, 0.6), then = currentViz.probe();
        return { flying, flare, after, n: then.n, flares: then.flares };
      } finally {
        frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak;
        window.__orbitSeed = saved.seed;
        applyConfig({ perViz: { orbit: { planets: 6 } } });
      }
    });
    check('orbit: draws in under 1.5 ms with nine planets, flaring or not',
      orbitCost.n === 9 && orbitCost.flares === 1 && orbitCost.flying < 1.5 && orbitCost.after < 1.5 && orbitCost.flare < 4,
      `flying ${orbitCost.flying.toFixed(3)}, flare frame ${orbitCost.flare.toFixed(2)}, after ${orbitCost.after.toFixed(3)} (${orbitCost.n} planets, ${orbitCost.flares} flare)`);
    check('orbit: no page errors from the Orbit checks', pageErrors.length === 0 && p43Errors.length === 0 && wideErrors.length === 0,
      [...pageErrors, ...p43Errors, ...wideErrors].join(' | '));

    // ── Black Hole: light, comets and fireflies falling in (16:9 page unless noted) ──
    const holeOn = async (pages, idle) => {
      await pushConfig((c) => { c.activeViz = 'black-hole'; c.idleAnim = idle; });
      for (const pg of pages) await pg.waitForFunction((i) => window.__timbre.currentVizName === 'black-hole' && cfgIdleAnim === i, idle, { timeout: 5000 });
    };
    const bh = (...rs) => JSON.stringify(rs.map((r) => r && ({ n: r.n, sunk: r.sunk, drawn: r.drawn, ribbons: r.ribbons, heads: r.heads, jets: r.jets, rings: r.rings, eaten: r.eaten, gulps: r.gulps, pull: r.pull, feed: r.feed, gulp: r.gulp, jet: r.jet,
      loud: r.loud, low: r.low, high: r.high, holeR: r.holeR, glow: r.glow, levelOut: r.levelOut, levelMid: r.levelMid, levelIn: r.levelIn, gasAlpha: r.gasAlpha,
      flicker: r.flicker, spin: r.spin, ink: r.ink })));
    const bhKnobs = (k) => ({ perViz: { 'black-hole': k } });
    // The middle of the canvas, as the last frame of a run left it: [r, g, b, a].
    const middle = (pg) => pg.evaluate(() => [...ctx.getImageData(Math.floor(W / 2), Math.floor(H / 2), 1, 1).data]);
    await holeOn([page, p43, wide], false);
    for (const pg of [page, p43, wide]) {
      const size = await pg.evaluate(() => `${W}×${H}`);
      const [r, dot] = await pg.evaluate(() => 0).then(async () => { const out = await holeRun(pg, [{ secs: 6, ...talk }]); return [out[0], await middle(pg)]; });
      check(`black hole: things falling into a solid black hole at ${size}`,
        r.ink > 0 && r.n > 5 && r.drawn === r.n + r.sunk && r.ribbons > 3 && r.heads > 0 && r.heads <= r.n && r.eaten > 0 && r.gulps === 0 && dot.join() === '0,0,0,255', bh(r) + ' middle ' + dot.join());
    }
    // The hole is black across its whole upper half, where only far things and the far gas pass
    // (behind it); and well beyond the gas, where nothing else is drawn, the falling things show:
    // their trails as well as their heads (measured: 14601 lit pixels there, 7847 with no trails).
    const hPixels = await wide.evaluate(() => {
      const saved = { frequencies, waveform, micActive, micPeak, seed: window.__blackHoleSeed };
      try {
        window.__blackHoleSeed = 2;
        currentViz = VIZ_FACTORIES['black-hole']();
        const f = new Uint8Array(32), w = new Uint8Array(64);
        f.fill(128, 0, 2); f.fill(77, 2, 11);
        for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * 0.5 * 127);
        frequencies = f; waveform = w; micActive = true; micPeak = 0.5;
        let now = performance.now(), worst = 0, checked = 0, beyond = 0;
        for (let k = 0; k < 360; k++) {
          now += 1000 / 60; currentViz.draw(now, 1 / 60);
          if (k % 30 !== 29) continue;                         // twelve looks over six seconds
          const R = currentViz.probe().holeR, cx = W / 2, cy = H / 2, d = ctx.getImageData(0, 0, W, H).data;
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), p = (y * W + x) * 4;
            if (dist < 0.95 * R && y + 0.5 < cy - 0.3 * R) { checked++; if (d[p] + d[p + 1] + d[p + 2] > 0 || d[p + 3] !== 255) worst++; }
            else if (k === 359 && dist > 7 * R && d[p + 3] > 0) beyond++;
          }
        }
        const pr = currentViz.probe();
        return { worst, checked, beyond, n: pr.n, eaten: pr.eaten };
      } finally {
        frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak;
        window.__blackHoleSeed = saved.seed;
      }
    });
    check('black hole: the hole is black across its upper half while things fall behind it, and the falling things show beyond the gas',
      hPixels.worst === 0 && hPixels.checked > 20000 && hPixels.beyond > 11000 && hPixels.n > 5 && hPixels.eaten > 0, JSON.stringify(hPixels));
    const [hQuiet, hLoud] = await holeRun(wide, [{ secs: 8, ...silence }, { secs: 8, ...loudTalk }]);
    check('black hole: silent, a trickle falls in; a voice feeds it far more, and the gas brightens and turns faster',
      hQuiet.n > 3 && Math.abs(hQuiet.pull - 0.45) < 0.01 && hLoud.pull > 2.5 && hLoud.eaten - hQuiet.eaten > 4 * Math.max(1, hQuiet.eaten) && hLoud.gasAlpha > 1.5 * hQuiet.gasAlpha
      && hLoud.glow > hQuiet.glow + 0.3 && hLoud.spin - hQuiet.spin > 2 * hQuiet.spin, bh(hQuiet, hLoud));
    // Talking, the frame of a gulp, the jets firing and the ring sweeping out; the canvas is handed
    // over with unusual line settings, which must come back untouched.
    const hStateSteps = [{ secs: 3, ...talk }, { secs: 1 / 60, ...talk, peak: 0.95 }, { secs: 0.3, ...talk }, { secs: 0.3, ...talk }, { secs: 2, ...talk }];
    const hStates = await holeRun(wide, hStateSteps, { odd: true });
    const hUsual = await holeRun(wide, hStateSteps);
    check('black hole: leaves the canvas state as it found it, gulping or not',
      hStates[1].gulps === 1 && hStates[2].jets === 2 && hStates[2].rings === 2 && hStates[4].jets === 0
      && [hQuiet, hLoud, ...hStates].every((r) => r.op === 'source-over' && r.blur === 0 && r.globalAlpha === 1 && r.offsetX === 0 && r.transformKept === true && r.linesKept === true && r.unclipped === true),
      JSON.stringify([hQuiet, hLoud, ...hStates].map((r) => [r.gulps, r.jets, r.rings, r.op, r.blur, r.globalAlpha, r.offsetX, r.transformKept, r.linesKept, r.unclipped])));
    check('black hole: draws the same whatever line settings it is handed',
      hStates.every((r, i) => r.ink === hUsual[i].ink && r.alpha === hUsual[i].alpha), JSON.stringify(hStates.map((r, i) => [r.ink, hUsual[i].ink, r.alpha, hUsual[i].alpha])));
    // The jets on the canvas: a third of a second after a gulp, the strip along the hole's axis above
    // it holds far more light than at the same moment of the same run without the gulp.
    const axisLight = (peak) => wide.evaluate((peak) => {
      const saved = { frequencies, waveform, micActive, micPeak, seed: window.__blackHoleSeed };
      try {
        window.__blackHoleSeed = 4;
        currentViz = VIZ_FACTORIES['black-hole']();
        const f = new Uint8Array(32), w = new Uint8Array(64);
        f.fill(128, 0, 2); f.fill(77, 2, 11);
        for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * 0.5 * 127);
        frequencies = f; waveform = w; micActive = true;
        let now = performance.now();
        const frames = (n, p) => { micPeak = p; for (let k = 0; k < n; k++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); } };
        frames(120, 0.5); frames(1, peak); frames(20, 0.5);
        // The gas disc's axis leans 0.2 rad: a strip 2 to 4 hole radii up it, half a hole radius wide.
        const R = 12 * SCALE, ax = Math.sin(-0.2), ay = -Math.cos(-0.2), d = ctx.getImageData(0, 0, W, H).data;
        let light = 0;
        for (let s = 2; s <= 4; s += 0.02) for (let o = -0.25; o <= 0.25; o += 0.05) {
          const x = Math.round(W / 2 + ax * s * R - ay * o * R), y = Math.round(H / 2 + ay * s * R + ax * o * R), p = (y * W + x) * 4;
          light += d[p + 3];
        }
        return { light, jet: currentViz.probe().jet, jets: currentViz.probe().jets };
      } finally {
        frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak;
        window.__blackHoleSeed = saved.seed;
      }
    }, peak);
    const hAxisJet = await axisLight(0.95), hAxisCalm = await axisLight(0.5);
    check('black hole: the jets are on the canvas, along the hole\'s axis',
      hAxisJet.jets === 2 && hAxisCalm.jets === 0 && hAxisJet.light > 3 * hAxisCalm.light + 20000, JSON.stringify([hAxisJet, hAxisCalm]));
    // One syllable, then quiet: it is at the gas's outer edge first, the middle next, the inner edge last.
    const [, hOut, hMid, hIn] = await holeRun(wide, [{ secs: 1.5, ...silence }, { secs: 0.1, ...loudTalk }, { secs: 0.36, ...silence }, { secs: 0.4, ...silence }]);
    check('black hole: a syllable ripples inward through the gas',
      hOut.levelOut > 0.6 && hOut.levelMid < 0.05 && hOut.levelIn < 0.05 && hMid.levelMid > 0.3 && hMid.levelOut < 0.05 && hMid.levelIn < 0.05
      && hIn.levelIn > 0.3 && hIn.levelOut < 0.05 && hIn.levelMid < 0.05, bh(hOut, hMid, hIn));
    const [hLowOnly] = await holeRun(wide, [{ secs: 4, wave: 0.3, low: 0.9, high: 0, peak: 0.3 }]);
    const [hHighOnly] = await holeRun(wide, [{ secs: 4, wave: 0.3, low: 0, high: 0.9, peak: 0.3 }]);
    check('black hole: the low end swells the hole, and the high end makes the fireflies flicker',
      hLowOnly.holeR > hHighOnly.holeR * 1.06 && hHighOnly.high > 0.5 && hLowOnly.high < 0.1, bh(hLowOnly, hHighOnly));
    const hFlick = await holeRun(wide, Array.from({ length: 20 }, () => ({ secs: 0.05, wave: 0.5, low: 0, high: 0.9, peak: 0.3 })));
    const hCalm = await holeRun(wide, Array.from({ length: 20 }, () => ({ secs: 0.05, wave: 0.5, low: 0.9, high: 0, peak: 0.3 })));
    check('black hole: (the flicker is seen on the fireflies that are there)',
      Math.max(...hFlick.map((r) => r.flicker)) > 0.2 && Math.max(...hCalm.map((r) => r.flicker)) < 0.02, JSON.stringify([Math.max(...hFlick.map((r) => r.flicker)), Math.max(...hCalm.map((r) => r.flicker))]));

    // The gulp.
    const hYell = [{ secs: 4, ...talk }, { secs: 0.1, ...talk, peak: 0.95 }];
    const [hCalmly, hGulped, hJets, hEmpty] = await holeRun(wide, [...hYell, { secs: 0.3, ...talk }, { secs: 0.9, ...silence }]);
    check('black hole: a peak makes the hole gulp down what is in sight and fire its jets',
      hCalmly.gulps === 0 && hCalmly.n > 10 && hGulped.gulps === 1 && hGulped.gulp > 0.5 && hGulped.jet === 0 && hJets.jet > 0.4 && hJets.jets === 2 && hJets.pull > hCalmly.pull
      && hEmpty.n < 0.35 * hCalmly.n && hEmpty.eaten - hCalmly.eaten >= 0.7 * hCalmly.n, bh(hCalmly, hGulped, hJets, hEmpty));
    const [, hSmall, , hSmallEmpty] = await holeRun(page, [...hYell, { secs: 0.3, ...talk }, { secs: 0.9, ...silence }]);
    check('black hole: the same on the small page', hSmall.gulps === 1 && hSmallEmpty.n <= 5, bh(hSmall, hSmallEmpty));
    const [, hHeld] = await holeRun(wide, [{ secs: 2, ...talk }, { secs: 3.5, ...talk, peak: 0.95 }]);
    check('black hole: a held yell gulps again only every second and a half', hHeld.gulps === 3, bh(hHeld));
    const [hGain] = await holeRun(wide, [{ secs: 5, wave: 0.6, low: 0.6, high: 0.6, peak: 0.6, config: { gain: 200 } }]);
    await wide.evaluate(() => applyConfig({ gain: 100 }));
    check('black hole: talking with Gain at 200% does not make it gulp', hGain.gulps === 0, bh(hGain));
    const [, hSens0] = await holeRun(wide, [{ secs: 2, ...talk, config: bhKnobs({ gulpSensitivity: 0 }) }, { secs: 1, ...talk, peak: 1 }]);
    await wide.evaluate(() => applyConfig({ perViz: { 'black-hole': { gulpSensitivity: 50 } } }));
    check('black hole: Gulp Sensitivity 0 never gulps', hSens0.gulps === 0, bh(hSens0));
    const [, hWave] = await holeRun(wide, [{ secs: 2, ...talk }, { secs: 0.1, wave: 0.95, low: 0.5, high: 0.3, peak: null }]);
    check('black hole: falls back to the waveform peak', hWave.gulps === 1, bh(hWave));
    const [, hOpen] = await holeRun(wide, [{ secs: 2, ...off }, { secs: 0.3, ...talk, peak: 0.95 }]);
    check('black hole: the mic opening on a loud moment does not make it gulp', hOpen.gulps === 0, bh(hOpen));

    // Mic off.
    const [hBefore, hOff] = await holeRun(wide, [{ secs: 3, ...loudTalk }, { secs: 8, ...off }]);
    check('black hole: mic off, a trickle keeps falling in',
      Math.abs(hOff.pull - 0.45) < 0.01 && hOff.loud < 0.01 && hOff.low < 0.001 && hOff.eaten > hBefore.eaten && hOff.n > 3 && hOff.holeR <= 12 * 4.8 * 1.1 + 0.01, bh(hBefore, hOff));   // the low end no longer swells the hole; feeding still may, by up to a tenth
    await holeOn([wide], true);
    const hIdle = (await holeRun(wide, [{ secs: 0, ...off }, ...Array.from({ length: 24 }, () => ({ secs: 0.25, ...off }))])).slice(1);
    const hIdleR = hIdle.map((r) => r.holeR);
    check('black hole: mic off with idle animation: the hole breathes',
      Math.max(...hIdleR) - Math.min(...hIdleR) > 0.015 * 12 * 4.8 && hIdle.every((r) => r.gulps === 0 && Math.abs(r.pull - 0.45) < 0.01),
      JSON.stringify({ holeR: [Math.min(...hIdleR), Math.max(...hIdleR)], pull: hIdle[23].pull }));
    await holeOn([wide], false);

    // Settings and the box. Speech keeps the frame fullest: syllables of 0.2 s every half second.
    const speech = Array.from({ length: 40 }, (_, i) => (i % 2 ? { secs: 0.3, ...silence } : { secs: 0.2, ...loudTalk }));
    const mostOf = (rs) => Math.max(...rs.map((r) => r.n));
    const hFew = await holeRun(wide, [{ secs: 0, ...silence, config: bhKnobs({ density: 0 }) }, ...speech]);
    const hDefault = await holeRun(wide, [{ secs: 0, ...silence, config: bhKnobs({ density: 50 }) }, ...speech]);
    const hMany = await holeRun(wide, [{ secs: 0, ...silence, config: bhKnobs({ density: 100 }) }, ...speech]);
    await wide.evaluate(() => applyConfig({ perViz: { 'black-hole': { density: 50 } } }));
    check('black hole: Density sets how much falls in, up to its limit',
      mostOf(hFew) <= 30 && mostOf(hFew) > 8 && mostOf(hDefault) <= 65 && mostOf(hDefault) > mostOf(hFew) + 10 && mostOf(hMany) <= 100 && mostOf(hMany) > mostOf(hDefault) + 10
      && hMany.every((r) => r.drawn === r.n + r.sunk), JSON.stringify([mostOf(hFew), mostOf(hDefault), mostOf(hMany)]));
    const [, hPushFrom, hPushTo] = await holeRun(wide, [{ secs: 3, ...talk }, { secs: 1 / 60, ...talk }, { secs: 1 / 60, ...talk, config: { bounce: 70 } }]);
    await wide.evaluate(() => applyConfig({ bounce: 50 }));
    check('black hole: a config push keeps everything falling', hPushFrom.n > 5 && Math.abs(hPushTo.n - hPushFrom.n) <= 2 && hPushTo.eaten >= hPushFrom.eaten && hPushTo.spin > hPushFrom.spin, bh(hPushFrom, hPushTo));
    const [, hSizeFrom, hSized, hSizeLater] = await holeRun(wide, [{ secs: 3, ...talk }, { secs: 1 / 60, ...talk },
      { secs: 1 / 60, ...talk, config: { showLabels: false } }, { secs: 3, ...talk }]);
    await wide.evaluate(() => applyConfig({ showLabels: true }));
    check('black hole: a real size change keeps everything falling',
      Math.abs(hSized.n - hSizeFrom.n) <= 2 && hSized.drawn === hSized.n + hSized.sunk && hSizeLater.eaten > hSizeFrom.eaten && hSizeLater.n > 5 && hSizeLater.ink > 0, bh(hSizeFrom, hSized, hSizeLater));
    // The size change just above gave the page a fresh canvas, and the browser draws a canvas a
    // little differently once its pixels have been read back twice (measured on this effect: the
    // same seeded run inks 116111 px on the first two reads of a fresh canvas and 116522 px on every
    // read after). Three runs are thrown away first so the runs compared are all drawn the same way.
    const hSeeded = async (seed) => (await holeRun(wide, [{ secs: 3, ...talk }], { seed }))[0];
    for (let i = 0; i < 3; i++) await hSeeded(1);
    const hSeedA = await hSeeded(7), hSeedB = await hSeeded(7), hSeedC = await hSeeded(8);
    check('black hole: a seeded run repeats', hSeedA.n > 5 && hSeedA.n === hSeedB.n && hSeedA.ink === hSeedB.ink && hSeedA.eaten === hSeedB.eaten && hSeedA.ink !== hSeedC.ink, bh(hSeedA, hSeedB, hSeedC));

    // Cost, at the highest Density: 420 frames of speech, the one frame of a 0.95 peak, then 60 more.
    const holeCost = await wide.evaluate(() => {
      const saved = { frequencies, waveform, micActive, micPeak, seed: window.__blackHoleSeed };
      try {
        applyConfig({ perViz: { 'black-hole': { density: 100 } } });
        window.__blackHoleSeed = 1;
        currentViz = VIZ_FACTORIES['black-hole']();
        const f = new Uint8Array(32), loudW = new Uint8Array(64), quietW = new Uint8Array(64).fill(128);
        f.fill(204, 0, 2); f.fill(204, 2, 11);
        for (let i = 0; i < 64; i++) loudW[i] = 128 + Math.round(Math.sin(i * 0.4) * 0.6 * 127);
        frequencies = f; micActive = true;
        let now = performance.now(), most = 0, frame = 0;
        const frames = (n, peak) => {
          micPeak = peak; const t0 = performance.now();
          for (let k = 0; k < n; k++) { waveform = (frame++ % 30) < 12 ? loudW : quietW; now += 1000 / 60; currentViz.draw(now, 1 / 60); }
          return (performance.now() - t0) / n;
        };
        frames(240, 0.6);                                   // fill the frame first
        const before = currentViz.probe();
        const falling = frames(180, 0.6); most = currentViz.probe().n;
        const gulp = frames(1, 0.95);
        const after = frames(60, 0.6), then = currentViz.probe();
        return { falling, gulp, after, filled: before.n, most, gulps: then.gulps };
      } finally {
        frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak;
        window.__blackHoleSeed = saved.seed;
        applyConfig({ perViz: { 'black-hole': { density: 50 } } });
      }
    });
    check('black hole: draws in under 1.5 ms at the highest Density, gulping or not',
      holeCost.filled > 65 && holeCost.gulps === 1 && holeCost.falling < 1.5 && holeCost.after < 1.5 && holeCost.gulp < 4,
      `falling ${holeCost.falling.toFixed(3)}, gulp frame ${holeCost.gulp.toFixed(2)}, after ${holeCost.after.toFixed(3)} (${holeCost.filled} then ${holeCost.most} things, ${holeCost.gulps} gulp)`);
    check('black hole: no page errors from the Black Hole checks', pageErrors.length === 0 && p43Errors.length === 0 && wideErrors.length === 0,
      [...pageErrors, ...p43Errors, ...wideErrors].join(' | '));

    // ── Blob: a vector character (16:9 page unless noted) ────────────────────
    const charOn = async (name, pages, idle) => {
      await pushConfig((c) => { c.activeViz = name; c.idleAnim = idle; });
      for (const pg of pages) await pg.waitForFunction(([n, i]) => window.__timbre.currentVizName === n && cfgIdleAnim === i, [name, idle], { timeout: 5000 });
    };
    // What the three characters' probes share.
    const ch = (...rs) => JSON.stringify(rs.map((r) => r && ({ loud: r.loud, fast: r.fast, low: r.low, high: r.high, lean: r.lean, happy: r.happy, open: r.open, blink: r.blink, clock: r.clock,
      radius: r.radius, lift: r.lift, stretch: r.stretch, shrink: r.shrink, held: r.held, bulgeTop: r.bulgeTop, bulgeBottom: r.bulgeBottom, ink: r.ink, top: r.top, bottom: r.bottom, emptyCols: r.emptyCols,
      solid: r.solid, dark: r.dark, solidTop: r.solidTop, solidBottom: r.solidBottom, solidLeft: r.solidLeft, solidRight: r.solidRight })));
    // The middle of a character's solid pixels, top to bottom: where its body is drawn.
    const bodyMid = (r) => (r.solidTop + r.solidBottom) / 2;
    const stateKept = (r) => r.op === 'source-over' && r.blur === 0 && r.globalAlpha === 1 && r.offsetX === 0 && r.transformKept === true && r.linesKept === true && r.unclipped === true;
    const stateOf = (rs) => JSON.stringify(rs.map((r) => [r.op, r.blur, r.globalAlpha, r.offsetX, r.transformKept, r.linesKept, r.unclipped]));
    await charOn('blob', [page, p43, wide], false);
    for (const pg of [page, p43, wide]) {
      const [size, h, scale] = await pg.evaluate(() => [`${W}×${H}`, H, SCALE]);
      const [r] = await blobRun(pg, [{ secs: 3, ...talk }]);
      check(`blob: a whole blob inside the frame at ${size}`,
        r.ink > 0 && r.top > 0 && r.bottom < h - 1 && r.emptyCols > 0 && r.shrink === 1 && Math.abs(r.radius - (25 + 13 * 0.75) * scale) < 0.6 * scale, ch(r));
    }
    const [bQuiet, bLoud] = await blobRun(wide, [{ secs: 3, ...silence }, { secs: 3, ...loudTalk }]);
    check('blob: silent it rests with a small smile; a voice swells it, opens its mouth and makes it happy',
      Math.abs(bQuiet.radius - 25 * 4.8) < 0.01 && bQuiet.open === 0 && bQuiet.happy === false && Math.abs(bQuiet.lift) < 0.01
      && bLoud.radius > 35 * 4.8 && bLoud.open === 1 && bLoud.happy === true && bLoud.ink > 1.2 * bQuiet.ink, ch(bQuiet, bLoud));
    // Resting, the first frames of a bounce, the bounce, and a loud voice; the canvas is handed over
    // with unusual line settings, which must come back untouched.
    const bStateSteps = [{ secs: 1, ...silence }, { secs: 0.05, ...loudTalk }, { secs: 0.25, ...loudTalk }, { secs: 2, ...loudTalk }];
    const bStates = await blobRun(wide, bStateSteps, { odd: true, still: true }), bUsual = await blobRun(wide, bStateSteps, { still: true });
    check('blob: leaves the canvas state as it found it', [bQuiet, bLoud, ...bStates].every(stateKept), stateOf([bQuiet, bLoud, ...bStates]));
    check('blob: draws the same, body and face, whatever line settings it is handed',
      bStates.every((r, i) => r.ink === bUsual[i].ink && r.alpha === bUsual[i].alpha && r.light === bUsual[i].light && r.dark === bUsual[i].dark && r.dark > 200),
      JSON.stringify(bStates.map((r, i) => [r.ink, bUsual[i].ink, r.alpha, bUsual[i].alpha, r.light, bUsual[i].light, r.dark, bUsual[i].dark])));
    const [bRest, bHop, bLanded] = await blobRun(wide, [{ secs: 1.5, ...silence }, { secs: 0.15, ...loudTalk }, { secs: 4, ...loudTalk }]);
    check('blob: a syllable bounces it, stretching on the way up, and it settles',
      Math.abs(bRest.lift) < 0.01 && bHop.lift > 2 * 4.8 && bHop.stretch > 0.02 && bHop.top < bRest.top && Math.abs(bLanded.lift) < 0.5 * 4.8 && Math.abs(bLanded.stretch) < 0.005, ch(bRest, bHop, bLanded));
    // The body that is drawn is where the pose says: its bodyMid sits 4 px × scale below the frame's, less the lift.
    const inPlace = (r, h = 624, scale = 4.8) => Math.abs(bodyMid(r) - (h / 2 + 4 * scale - r.lift)) < 0.09 * r.radius + 2;
    check('blob: the body that is drawn rises with the bounce', [bRest, bHop, bLanded].every((r) => inPlace(r)) && bodyMid(bRest) - bodyMid(bHop) > 1.5 * 4.8,
      JSON.stringify([bRest, bHop, bLanded].map((r) => [bodyMid(r), r.lift, r.radius])));
    // It blinks: about once in three and a half seconds, for a sixth of a second. The second blink is
    // the one that proves it (the first is at the moment it is made), and its eyes are seen to shut.
    const bBlinkRun = await blobRun(wide, Array.from({ length: 84 }, () => ({ secs: 0.05, ...silence })));
    const bLate = bBlinkRun.filter((r) => r.clock > 3.4), bShutAt = bLate.reduce((m, r) => (r.blink > m.blink ? r : m)), bOpenAt = bBlinkRun[40];
    const bBetween = bBlinkRun.filter((r) => r.clock > 0.2 && r.clock < 3.4);
    check('blob: it blinks every three and a half seconds, and its eyes are seen to shut',
      bBetween.every((r) => r.blink === 0) && bOpenAt.dark > 200 && bShutAt.blink > 0.5 && bShutAt.dark < 0.7 * bOpenAt.dark && bLate.filter((r) => r.blink > 0).length >= 2 && bLate.filter((r) => r.blink > 0).length <= 4,
      JSON.stringify({ open: [bOpenAt.blink, bOpenAt.dark], shut: [bShutAt.clock, bShutAt.blink, bShutAt.dark], late: bLate.map((r) => +r.blink.toFixed(2)) }));
    const [bLowOnly] = await blobRun(wide, [{ secs: 2, wave: 0.3, low: 0.9, high: 0, peak: 0.3 }]);
    const [bHighOnly] = await blobRun(wide, [{ secs: 2, wave: 0.3, low: 0, high: 0.9, peak: 0.3 }]);
    check('blob: the low end pushes out its top and the high end its bottom',
      bLowOnly.bulgeTop > 0.8 && bLowOnly.bulgeBottom < 0.05 && bHighOnly.bulgeBottom > 0.8 && bHighOnly.bulgeTop < 0.05 && bLowOnly.lean < -0.9 && bHighOnly.lean > 0.9, ch(bLowOnly, bHighOnly));

    // The Bounce setting.
    const [bStillQuiet, bStill, bStillLoud] = await blobRun(wide, [{ secs: 1.5, ...silence, config: { bounce: 0 } }, { secs: 0.15, ...loudTalk }, { secs: 3, ...loudTalk }]);
    check('blob: Bounce 0 stills it: no bounce and no swelling, though the face still answers',
      bStill.lift === 0 && bStill.stretch === 0 && Math.abs(bStillLoud.radius - 25 * 4.8) < 0.01 && bStillLoud.open === 1 && bStillLoud.happy === true && inPlace(bStill) && inPlace(bStillLoud), ch(bStill, bStillLoud));
    // With the body held to one size, what a voice adds round it is the glow.
    const glow = (r) => r.alpha - 255 * r.solid;
    check('blob: its glow brightens with the voice', Math.abs(bStillLoud.solid - bStillQuiet.solid) < 0.03 * bStillQuiet.solid && glow(bStillLoud) > 1.3 * glow(bStillQuiet),
      JSON.stringify({ solid: [bStillQuiet.solid, bStillLoud.solid], glow: [glow(bStillQuiet), glow(bStillLoud)] }));
    await wide.evaluate(() => applyConfig({ bounce: 50 }));
    const [, bMid, bStopped] = await blobRun(wide, [{ secs: 1.5, ...silence }, { secs: 0.15, ...loudTalk }, { secs: 1 / 60, ...loudTalk, config: { bounce: 0 } }]);
    check('blob: Bounce set to 0 in the middle of a bounce stills it at once', bMid.lift > 2 * 4.8 && bMid.stretch > 0.02 && bStopped.lift === 0 && bStopped.stretch === 0 && inPlace(bStopped) && bodyMid(bStopped) - bodyMid(bMid) > 1.5 * 4.8,
      ch(bMid, bStopped));
    const bHardSteps = [{ secs: 0, ...silence, config: { bounce: 100 } }, ...Array.from({ length: 24 }, (_, i) => (i % 2 ? { secs: 0.3, ...silence } : { secs: 0.2, wave: 0.67, low: 1, high: 1, peak: 0.6 }))];
    const bHard = (await blobRun(wide, bHardSteps)).slice(1), bHardSmall = (await blobRun(page, bHardSteps)).slice(1);
    await wide.evaluate(() => applyConfig({ bounce: 50 }));
    await page.evaluate(() => applyConfig({ bounce: 50 }));
    const most = (rs, key) => Math.max(...rs.map((r) => r[key])), least = (rs, key) => Math.min(...rs.map((r) => r[key]));
    // Its outline keeps 3 px × scale from the frame's edge; half its stroke (0.75 px × scale) lies outside the outline.
    check('blob: at Bounce 100 and full voice it bounces higher, the frame holds it back, and it stays inside, on the wide and the small page',
      bHard.every((r) => r.top > 0 && r.bottom < 623 && r.solidTop >= 10 && r.solidBottom <= 613) && most(bHard, 'lift') > 8 * 4.8 && most(bHard, 'radius') > 40 * 4.8 && bHard.some((r) => r.held)
      && bHard.filter((r) => !r.held).every((r) => inPlace(r))
      && bHardSmall.every((r) => r.top > 0 && r.bottom < 129 && r.solidTop >= 2 && r.solidBottom <= 127) && most(bHardSmall, 'lift') > 8 && bHardSmall.some((r) => r.held),
      JSON.stringify({ lift: most(bHard, 'lift'), radius: most(bHard, 'radius'), top: least(bHard, 'top'), bottom: most(bHard, 'bottom'), solidTop: least(bHard, 'solidTop'), solidBottom: most(bHard, 'solidBottom'), held: bHard.filter((r) => r.held).length,
        unplaced: bHard.filter((r) => !r.held && !inPlace(r)).map((r) => [bodyMid(r), r.lift, r.radius]),
        small: { lift: most(bHardSmall, 'lift'), top: least(bHardSmall, 'top'), bottom: most(bHardSmall, 'bottom'), solidTop: least(bHardSmall, 'solidTop'), solidBottom: most(bHardSmall, 'solidBottom'), held: bHardSmall.filter((r) => r.held).length, shrunk: bHardSmall.filter((r) => r.shrink < 1).length } }));

    // Mic off.
    const bOff = await blobRun(wide, [{ secs: 2, ...loudTalk }, ...Array.from({ length: 16 }, () => ({ secs: 0.25, ...off }))]);
    const bOffR = bOff.slice(9).map((r) => r.radius);   // from two seconds after the mic went off
    check('blob: mic off it is still, with its mouth shut',
      Math.max(...bOffR) - Math.min(...bOffR) < 0.05 && Math.abs(bOffR[0] - 25 * 4.8) < 0.05 && bOff[16].open < 1e-6 && bOff[16].happy === false && bOff[16].ink > 0, ch(bOff[16]));
    await charOn('blob', [wide], true);
    const bIdleR = (await blobRun(wide, Array.from({ length: 20 }, () => ({ secs: 0.25, ...off })))).map((r) => r.radius);
    check('blob: mic off with idle animation: it breathes', Math.max(...bIdleR) - Math.min(...bIdleR) > 1.8 * 4.8 && Math.max(...bIdleR) - Math.min(...bIdleR) < 2.6 * 4.8,
      JSON.stringify([Math.min(...bIdleR), Math.max(...bIdleR)]));
    await charOn('blob', [wide], false);

    // The box.
    const [, bPushFrom, bPushTo] = await blobRun(wide, [{ secs: 2, ...talk }, { secs: 1 / 60, ...talk }, { secs: 1 / 60, ...talk, config: { colorHue: 30 } }]);
    await wide.evaluate(() => applyConfig({ colorHue: 0 }));
    check('blob: a config push keeps it as it is', bPushTo.clock > bPushFrom.clock && bPushTo.clock > 2 && Math.abs(bPushTo.radius - bPushFrom.radius) < 0.5, ch(bPushFrom, bPushTo));
    const [, bSizeFrom, bSized, bSizeLater] = await blobRun(wide, [{ secs: 2, ...talk }, { secs: 1 / 60, ...talk }, { secs: 1 / 60, ...talk, config: { showLabels: false } }, { secs: 2, ...talk }]);
    await wide.evaluate(() => applyConfig({ showLabels: true }));
    check('blob: a real size change keeps it, in the middle of the new frame',
      bSized.clock > bSizeFrom.clock && Math.abs(bSized.radius - bSizeFrom.radius) < 0.5 && Math.abs((bSized.top + bSized.bottom) / 2 - (816 / 2 + 4 * 4.8)) < 8
      && Math.abs((bSizeFrom.top + bSizeFrom.bottom) / 2 - (624 / 2 + 4 * 4.8)) < 8 && bSizeLater.top > 0 && bSizeLater.ink > 0, ch(bSizeFrom, bSized, bSizeLater));

    // Cost: 300 frames of a loud voice in syllables.
    const charCost = (name, mic = true) => wide.evaluate(([name, mic]) => {
      const saved = { frequencies, waveform, micActive, micPeak };
      try {
        currentViz = VIZ_FACTORIES[name]();
        const f = new Uint8Array(32), loudW = new Uint8Array(64), quietW = new Uint8Array(64).fill(128);
        f.fill(204, 0, 2); f.fill(204, 2, 11);
        for (let i = 0; i < 64; i++) loudW[i] = 128 + Math.round(Math.sin(i * 0.4) * 0.6 * 127);
        frequencies = mic ? f : null; micActive = mic; micPeak = mic ? 0.6 : null;
        let now = performance.now();
        const t0 = performance.now();
        for (let k = 0; k < 300; k++) { waveform = !mic ? null : (k % 30) < 12 ? loudW : quietW; now += 1000 / 60; currentViz.draw(now, 1 / 60); }
        return (performance.now() - t0) / 300;
      } finally { frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak; }
    }, [name, mic]);
    const blobCost = await charCost('blob');
    check('blob: draws in under 1.5 ms', blobCost < 1.5, `${blobCost.toFixed(3)} ms a frame`);
    check('blob: no page errors from the Blob checks', pageErrors.length === 0 && p43Errors.length === 0 && wideErrors.length === 0,
      [...pageErrors, ...p43Errors, ...wideErrors].join(' | '));

    // ── Owl: a vector character (16:9 page unless noted) ─────────────────────
    const ow = (...rs) => JSON.stringify(rs.map((r) => r && ({ loud: r.loud, fast: r.fast, lean: r.lean, happy: r.happy, open: r.open, blink: r.blink, clock: r.clock, lift: r.lift, shrink: r.shrink,
      tilt: r.tilt, wing: r.wing, flap: r.flap, sing: r.sing, notes: r.notes, held: r.held, ink: r.ink, top: r.top, bottom: r.bottom, emptyCols: r.emptyCols,
      solid: r.solid, dark: r.dark, pink: r.pink, solidTop: r.solidTop, solidBottom: r.solidBottom, solidLeft: r.solidLeft, solidRight: r.solidRight, solidTopX: r.solidTopX })));
    const owWidth = (r) => r.solidRight - r.solidLeft;
    await charOn('owl', [page, p43, wide], false);
    for (const pg of [page, p43, wide]) {
      const [size, h] = await pg.evaluate(() => [`${W}×${H}`, H]);
      const [r] = await owlRun(pg, [{ secs: 3, ...talk }]);
      check(`owl: a whole owl inside the frame at ${size}`, r.ink > 0 && r.top > 0 && r.bottom < h - 1 && r.emptyCols > 0 && r.shrink === 1 && r.wing > 0.8 && r.notes >= 1, ow(r));
    }
    const [oQuiet2, oLoud2] = await owlRun(wide, [{ secs: 3, ...silence }, { secs: 3, ...loudTalk }]);
    check('owl: silent it rests with folded wings; a voice lifts its wings, opens its beak, makes it happy and sets it singing',
      Math.abs(oQuiet2.wing - 0.12) < 1e-6 && oQuiet2.open === 0 && oQuiet2.happy === false && oQuiet2.sing === 0 && oQuiet2.notes === 0 && Math.abs(oQuiet2.lift) < 0.01 && oQuiet2.tilt === 0
      && oLoud2.wing > 1.1 && oLoud2.open === 1 && oLoud2.happy === true && oLoud2.sing === 1 && oLoud2.notes >= 1 && oLoud2.alpha > 1.03 * oQuiet2.alpha, ow(oQuiet2, oLoud2));
    check('owl: the wings that are drawn spread with the voice, and the open beak shows its pink inside',
      owWidth(oLoud2) > 1.25 * owWidth(oQuiet2) && oQuiet2.pink === 0 && oLoud2.pink > 60, ow(oQuiet2, oLoud2));
    const owStateSteps = [{ secs: 1, ...silence }, { secs: 0.05, ...loudTalk }, { secs: 0.25, ...loudTalk }, { secs: 2, ...loudTalk }];
    const owStates = await owlRun(wide, owStateSteps, { odd: true, still: true }), owUsual = await owlRun(wide, owStateSteps, { still: true });
    check('owl: leaves the canvas state as it found it', [oQuiet2, oLoud2, ...owStates].every(stateKept), stateOf([oQuiet2, oLoud2, ...owStates]));
    check('owl: draws the same, body, eyes and notes, whatever line settings it is handed',
      owStates.every((r, i) => r.ink === owUsual[i].ink && r.alpha === owUsual[i].alpha && r.light === owUsual[i].light && r.dark === owUsual[i].dark && r.dark > 200) && owStates[3].notes >= 1,
      JSON.stringify(owStates.map((r, i) => [r.ink, owUsual[i].ink, r.alpha, owUsual[i].alpha, r.light, owUsual[i].light, r.dark, owUsual[i].dark])));
    const [owRest, owHop, owLanded] = await owlRun(wide, [{ secs: 1.5, ...silence }, { secs: 0.15, ...loudTalk }, { secs: 4, ...loudTalk }]);
    check('owl: a syllable bobs it, and it settles', Math.abs(owRest.lift) < 0.01 && owHop.lift > 2 * 4.8 && Math.abs(owLanded.lift) < 0.5 * 4.8, ow(owRest, owHop, owLanded));
    check('owl: the owl that is drawn rises with the bob', Math.abs(bodyMid(owRest) - bodyMid(owHop) - owHop.lift) < 3 && Math.abs(bodyMid(owRest) - bodyMid(owLanded) - owLanded.lift) < 3,
      JSON.stringify([owRest, owHop, owLanded].map((r) => [bodyMid(r), r.lift])));
    // It blinks every 3.8 seconds, first at 2.5 s, and its eyes are seen to shut.
    const owBlinkRun = await owlRun(wide, Array.from({ length: 64 }, () => ({ secs: 0.05, ...silence })));
    const owLate = owBlinkRun.filter((r) => r.clock > 2.45), owShutAt = owLate.reduce((m, r) => (r.blink > m.blink ? r : m)), owOpenAt = owBlinkRun[20];
    check('owl: it blinks, and its eyes are seen to shut',
      owBlinkRun.filter((r) => r.clock < 2.45).every((r) => r.blink === 0) && owOpenAt.dark > 200 && owShutAt.blink > 0.5 && owShutAt.dark < 0.7 * owOpenAt.dark
      && owLate.filter((r) => r.blink > 0).length >= 2 && owLate.filter((r) => r.blink > 0).length <= 4,
      JSON.stringify({ open: [owOpenAt.blink, owOpenAt.dark], shut: [owShutAt.clock, owShutAt.blink, owShutAt.dark], late: owLate.map((r) => +r.blink.toFixed(2)) }));
    const [owLowOnly] = await owlRun(wide, [{ secs: 2, wave: 0.3, low: 0.9, high: 0, peak: 0.3 }]);
    const [owHighOnly] = await owlRun(wide, [{ secs: 2, wave: 0.3, low: 0, high: 0.9, peak: 0.3 }]);
    check('owl: it leans toward the end of the sound that is winning', owLowOnly.tilt < -0.12 && owHighOnly.tilt > 0.12 && Math.abs(owLowOnly.tilt + owHighOnly.tilt) < 0.01, ow(owLowOnly, owHighOnly));
    // Leaning to the low side, its right ear tuft is the higher one; to the high side, its left.
    check('owl: the owl that is drawn leans', owLowOnly.solidTopX - 864 > 10 * 4.8 && owHighOnly.solidTopX - 864 < -10 * 4.8, ow(owLowOnly, owHighOnly));

    // The Bounce setting.
    // A sound that would make it lean (the high end winning), so that standing upright means something.
    const owOneSided = { wave: 0.6, low: 0.1, high: 0.9, peak: 0.6 };
    const [owStillQuiet, owStill, owStillLoud] = await owlRun(wide, [{ secs: 1.5, ...silence, config: { bounce: 0 } }, { secs: 0.15, ...owOneSided }, { secs: 3, ...owOneSided }]);
    check('owl: Bounce 0 stills it: no bob, no lean, no flap, though its beak and eyes still answer',
      owStill.lift === 0 && Math.abs(owStillLoud.wing - 0.12) < 1e-6 && owStillLoud.lean > 0.9 && owStillLoud.tilt === 0 && owStillLoud.open === 1 && owStillLoud.happy === true
      && Math.abs(bodyMid(owStillLoud) - bodyMid(owStillQuiet)) < 1 && Math.abs(owWidth(owStillLoud) - owWidth(owStillQuiet)) < 2 && owStillLoud.pink > 60, ow(owStillQuiet, owStill, owStillLoud));
    const owSyll = [{ secs: 0, ...silence, config: { bounce: 100 } }, ...Array.from({ length: 24 }, (_, i) => (i % 2 ? { secs: 0.3, ...silence } : { secs: 0.2, wave: 0.67, low: 0.2, high: 1, peak: 0.6 }))];
    const owHard = (await owlRun(wide, owSyll)).slice(1), owHardSmall = (await owlRun(page, owSyll)).slice(1);
    await wide.evaluate(() => applyConfig({ bounce: 50 }));
    await page.evaluate(() => applyConfig({ bounce: 50 }));
    check('owl: at Bounce 100 and full voice it bobs higher and stays inside the frame, on the wide and the small page',
      owHard.every((r) => r.top > 0 && r.bottom < 623 && r.solidTop >= 10 && r.solidBottom <= 613) && most(owHard, 'lift') > 10 * 4.8
      && owHardSmall.every((r) => r.top > 0 && r.bottom < 129 && r.solidTop >= 2 && r.solidBottom <= 127) && most(owHardSmall, 'lift') > 10,
      JSON.stringify({ lift: most(owHard, 'lift'), top: least(owHard, 'top'), bottom: most(owHard, 'bottom'), solidTop: least(owHard, 'solidTop'), solidBottom: most(owHard, 'solidBottom'), held: owHard.filter((r) => r.held).length,
        small: { lift: most(owHardSmall, 'lift'), top: least(owHardSmall, 'top'), bottom: most(owHardSmall, 'bottom'), solidTop: least(owHardSmall, 'solidTop'), solidBottom: most(owHardSmall, 'solidBottom'), held: owHardSmall.filter((r) => r.held).length } }));

    // Mic off.
    const owOff = await owlRun(wide, [{ secs: 2, ...loudTalk }, ...Array.from({ length: 16 }, () => ({ secs: 0.25, ...off }))]);
    check('owl: mic off it is still: upright, wings folded, beak shut, no notes',
      owOff.slice(9).every((r) => Math.abs(r.tilt) < 1e-3 && Math.abs(r.wing - 0.12) < 1e-4 && r.open < 1e-6 && r.notes === 0 && Math.abs(r.lift) < 0.05) && owOff[16].ink > 0, ow(owOff[16]));
    await charOn('owl', [wide], true);
    const owIdleRun = await owlRun(wide, Array.from({ length: 36 }, () => ({ secs: 0.25, ...off }))), owIdle = owIdleRun.map((r) => r.tilt);
    check('owl: mic off with idle animation: it sways', Math.max(...owIdle) > 0.04 && Math.min(...owIdle) < -0.04 && Math.max(...owIdle) < 0.051, JSON.stringify([Math.min(...owIdle), Math.max(...owIdle)]));
    // The sway is in what is drawn: whichever way it leans, the ear tuft on the other side is the higher one.
    const owSwayed = owIdleRun.filter((r) => Math.abs(r.tilt) > 0.03);
    check('owl: the owl that is drawn sways', owSwayed.some((r) => r.tilt > 0) && owSwayed.some((r) => r.tilt < 0) && owSwayed.every((r) => (r.solidTopX - 864) * r.tilt < 0 && Math.abs(r.solidTopX - 864) > 10 * 4.8),
      JSON.stringify(owSwayed.map((r) => [+r.tilt.toFixed(3), Math.round(r.solidTopX - 864)])));
    await charOn('owl', [wide], false);

    // The box.
    const [, owPushFrom, owPushTo] = await owlRun(wide, [{ secs: 2, ...talk }, { secs: 1 / 60, ...talk }, { secs: 1 / 60, ...talk, config: { colorHue: 30 } }]);
    await wide.evaluate(() => applyConfig({ colorHue: 0 }));
    check('owl: a config push keeps it as it is', owPushTo.clock > owPushFrom.clock && owPushTo.clock > 2 && Math.abs(owPushTo.wing - owPushFrom.wing) < 0.2, ow(owPushFrom, owPushTo));
    const [, owSizeFrom, owSized, owSizeLater] = await owlRun(wide, [{ secs: 2, ...silence }, { secs: 1 / 60, ...silence }, { secs: 1 / 60, ...silence, config: { showLabels: false } }, { secs: 2, ...silence }]);
    await wide.evaluate(() => applyConfig({ showLabels: true }));
    check('owl: a real size change keeps it, in the middle of the new frame',
      owSized.clock > owSizeFrom.clock && Math.abs((owSized.top + owSized.bottom) / 2 - (816 / 2 + 4 * 4.8)) < 8 && Math.abs((owSizeFrom.top + owSizeFrom.bottom) / 2 - (624 / 2 + 4 * 4.8)) < 8
      && owSizeLater.top > 0 && owSizeLater.ink > 0, ow(owSizeFrom, owSized, owSizeLater));

    const owlCost = await charCost('owl');
    check('owl: draws in under 1.5 ms', owlCost < 1.5, `${owlCost.toFixed(3)} ms a frame`);
    check('owl: no page errors from the Owl checks', pageErrors.length === 0 && p43Errors.length === 0 && wideErrors.length === 0,
      [...pageErrors, ...p43Errors, ...wideErrors].join(' | '));

    // ── Television: a new vector character (16:9 page unless noted) ──────────
    const tvf = (...rs) => JSON.stringify(rs.map((r) => r && ({ loud: r.loud, fast: r.fast, lean: r.lean, happy: r.happy, open: r.open, blink: r.blink, clock: r.clock, lift: r.lift, shrink: r.shrink,
      tilt: r.tilt, wag: r.wag, dialLow: r.dialLow, dialHigh: r.dialHigh, speaker: r.speaker, asleep: r.asleep, mouth: r.mouth, flecks: r.flecks, eyes: r.eyes, y: r.y, k: r.k, held: r.held, snow: r.snow,
      ink: r.ink, top: r.top, bottom: r.bottom, emptyCols: r.emptyCols, solidTop: r.solidTop, solidBottom: r.solidBottom, solidBottomX: r.solidBottomX })));
    // The set that is drawn is where the pose says, tilted as it says: its lowest solid row is the corner of a
    // foot, (27, 31) in its own units with half the stroke (0.8) round it, below its middle.
    const tvFoot = (r, h = 624) => h / 2 + r.y + (31 * Math.cos(r.tilt) + 27 * Math.abs(Math.sin(r.tilt)) + 0.8) * r.k;
    const tvPlaced = (r, h = 624) => Math.abs(r.solidBottom - tvFoot(r, h)) < 3;
    await charOn('television', [page, p43, wide], false);
    for (const pg of [page, p43, wide]) {
      const [size, h] = await pg.evaluate(() => [`${W}×${H}`, H]);
      const [r] = await tvRun(pg, [{ secs: 3, ...talk }]);
      check(`television: a whole set inside the frame at ${size}`, r.ink > 0 && r.top > 0 && r.bottom < h - 1 && r.emptyCols > 0 && r.shrink === 1 && r.asleep === false && r.eyes === 2 && r.mouth > 2, tvf(r));
    }
    const [tQuiet, tLoud] = await tvRun(wide, [{ secs: 3, ...silence }, { secs: 3, ...loudTalk }]);
    check('television: silent, its face is on the screen with a flat smile; a voice makes its mouth the waveform, lights its speaker and makes it happy',
      tQuiet.asleep === false && tQuiet.eyes === 2 && tQuiet.mouth === 0 && tQuiet.open === 0 && tQuiet.happy === false && tQuiet.speaker === 0 && tQuiet.flecks === 0 && tQuiet.tilt === 0
      && tLoud.mouth > 3 && tLoud.open === 1 && tLoud.happy === true && tLoud.speaker > 0.85 && tLoud.alpha > tQuiet.alpha, tvf(tQuiet, tLoud));
    const tStateSteps = [{ secs: 1, ...silence }, { secs: 0.05, ...loudTalk }, { secs: 0.25, ...loudTalk }, { secs: 2, ...loudTalk }, { secs: 1, ...off }];
    const tStates = await tvRun(wide, tStateSteps, { odd: true, still: true }), tUsual = await tvRun(wide, tStateSteps, { still: true });
    check('television: leaves the canvas state as it found it, awake or asleep', tStates[4].asleep === true && [tQuiet, tLoud, ...tStates].every(stateKept), stateOf([tQuiet, tLoud, ...tStates]));
    check('television: draws the same, set, face and static, whatever line settings it is handed',
      tStates.every((r, i) => r.ink === tUsual[i].ink && r.alpha === tUsual[i].alpha && r.light === tUsual[i].light),
      JSON.stringify(tStates.map((r, i) => [r.ink, tUsual[i].ink, r.alpha, tUsual[i].alpha, r.light, tUsual[i].light])));
    // The face is on the canvas: bright lines in the middle of the screen with the mic on, and far
    // fewer bright pixels there when it is asleep (the sleeping face is dim, and static is grey).
    // The colours follow the wall clock, so the clock is held while this draws and reads, and put back.
    const screenLight = (steps, seed = 3) => wide.evaluate(({ steps, seed }) => {
      const saved = { frequencies, waveform, micActive, micPeak, seed: window.__televisionSeed, now: Date.now };
      try {
        Date.now = () => 1700000000000;
        window.__televisionSeed = seed;
        currentViz = VIZ_FACTORIES['television']();
        const f = new Uint8Array(32), w = new Uint8Array(64);
        let now = performance.now();
        for (const s of steps) {
          f.fill(0); f.fill(Math.round(s.low * 255), 0, 2); f.fill(Math.round(s.high * 255), 2, 11);
          for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * s.wave * 127);
          const on = s.mic !== false;
          frequencies = on ? f : null; waveform = on ? w : null; micActive = on; micPeak = null;
          for (let k = 0, n = Math.round(s.secs * 60); k < n; k++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
        }
        // A box round the middle of the screen: 30 by 30 of the set's own units, where the eyes and the mouth are.
        const p = currentViz.probe(), unit = 0.92 * SCALE, cx = W / 2 - 7.5 * unit, cy = H / 2 + p.y, half = Math.round(15 * unit);
        const d = ctx.getImageData(Math.round(cx) - half, Math.round(cy) - half, 2 * half, 2 * half).data;
        let bright = 0, light = 0;
        for (let i = 0; i < d.length; i += 4) { const v = d[i] + d[i + 1] + d[i + 2]; light += v; if (v > 420) bright++; }
        return { bright, light, asleep: p.asleep, tilt: p.tilt, blink: p.blink, eyes: p.eyes };
      } finally {
        Date.now = saved.now;
        frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak;
        window.__televisionSeed = saved.seed;
      }
    }, { steps, seed });
    const tFace = await screenLight([{ secs: 4, wave: 0.3, low: 0.4, high: 0.4 }]), tSleep = await screenLight([{ secs: 4, wave: 0.3, low: 0.4, high: 0.4, mic: false }]);
    check('television: the face is on the canvas with the mic on, and gone to sleep with it off',
      tFace.asleep === false && tSleep.asleep === true && tFace.bright > 1500 && tSleep.bright < 0.25 * tFace.bright, JSON.stringify([tFace, tSleep]));
    const [tRest, tHop, tLanded] = await tvRun(wide, [{ secs: 1.5, ...silence }, { secs: 0.15, ...loudTalk }, { secs: 6, ...loudTalk }]);
    check('television: a syllable bounces it and springs its antennae, and both settle',
      Math.abs(tRest.lift) < 0.01 && tRest.wag === 0 && tHop.lift > 2 * 4.8 && Math.abs(tHop.wag) > 0.1 && Math.abs(tLanded.lift) < 0.5 * 4.8 && Math.abs(tLanded.wag) < 0.03, tvf(tRest, tHop, tLanded));
    check('television: the set that is drawn rises with the bounce', [tRest, tHop, tLanded].every((r) => tvPlaced(r)) && tRest.solidBottom - tHop.solidBottom > 1.5 * 4.8,
      JSON.stringify([tRest, tHop, tLanded].map((r) => [r.solidBottom, +tvFoot(r).toFixed(1), r.lift])));
    // It blinks every 4.1 seconds, first at 3.5 s, and its eyes are seen to shut: the bars go dark.
    const tBlinkRun = await tvRun(wide, Array.from({ length: 76 }, () => ({ secs: 0.05, ...silence })));
    const tLate = tBlinkRun.filter((r) => r.clock > 3.45);
    const tEyesOpen = await screenLight([{ secs: 2, wave: 0, low: 0, high: 0 }]), tEyesShut = await screenLight([{ secs: 215 / 60, wave: 0, low: 0, high: 0 }]);
    check('television: it blinks, and its eyes are seen to shut',
      tBlinkRun.filter((r) => r.clock < 3.45).every((r) => r.blink === 0) && tLate.some((r) => r.blink > 0.5) && tLate.filter((r) => r.blink > 0).length >= 2 && tLate.filter((r) => r.blink > 0).length <= 4
      && tEyesOpen.blink === 0 && tEyesShut.blink > 0.9 && tEyesOpen.eyes === 2 && tEyesOpen.bright - tEyesShut.bright > 250,
      JSON.stringify({ late: tLate.map((r) => +r.blink.toFixed(2)), open: tEyesOpen, shut: tEyesShut }));
    const [tLowOnly] = await tvRun(wide, [{ secs: 3, wave: 0.3, low: 0.9, high: 0, peak: 0.3 }]);
    const [tHighOnly] = await tvRun(wide, [{ secs: 3, wave: 0.3, low: 0, high: 0.9, peak: 0.3 }]);
    check('television: it tilts toward the end of the sound that is winning, and its dials turn with the low and the high end',
      tLowOnly.tilt < -0.08 && tHighOnly.tilt > 0.08 && tLowOnly.dialLow > 0.9 && tLowOnly.dialHigh < 0.05 && tHighOnly.dialHigh > 0.9 && tHighOnly.dialLow < 0.05 && tLowOnly.wag < 0 && tHighOnly.wag > 0, tvf(tLowOnly, tHighOnly));
    // Tilted toward the low end its left foot is the lower one; toward the high end, its right.
    check('television: the set that is drawn tilts', tvPlaced(tLowOnly) && tvPlaced(tHighOnly) && tLowOnly.solidBottomX - 864 < -10 * 4.4 && tHighOnly.solidBottomX - 864 > 10 * 4.4, tvf(tLowOnly, tHighOnly));
    // The mouth is the waveform with Gain: a quiet mic turned up draws the mouth a louder one does.
    const [tGainLoud] = await tvRun(wide, [{ secs: 2, wave: 0.5, low: 0.4, high: 0.4, peak: 0.5 }]);
    const [tGainUp] = await tvRun(wide, [{ secs: 2, wave: 0.25, low: 0.2, high: 0.2, peak: 0.25, config: { gain: 200 } }]);
    await wide.evaluate(() => applyConfig({ gain: 100 }));
    check('television: its mouth follows Gain', tGainLoud.mouth > 2.5 && Math.abs(tGainUp.mouth - tGainLoud.mouth) < 0.08 * tGainLoud.mouth && Math.abs(tGainUp.open - tGainLoud.open) < 0.05, tvf(tGainLoud, tGainUp));
    // A sample of 0 is the bottom of a trough, not silence: a clipped voice shows its troughs.
    const tTrough = await wide.evaluate(() => {
      const saved = { frequencies, waveform, micActive, micPeak };
      try {
        currentViz = VIZ_FACTORIES['television']();
        const f = new Uint8Array(32).fill(150), loudW = new Uint8Array(64);
        for (let i = 0; i < 64; i++) loudW[i] = 128 + Math.round(Math.sin(i * 0.4) * 0.6 * 127);
        frequencies = f; micActive = true; micPeak = 0.6; waveform = loudW;
        let now = performance.now();
        for (let k = 0; k < 60; k++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
        waveform = new Uint8Array(64); now += 1000 / 60; currentViz.draw(now, 1 / 60);
        const trough = currentViz.probe();
        waveform = new Uint8Array(0); now += 1000 / 60; currentViz.draw(now, 1 / 60);
        return { open: trough.open, mouth: trough.mouth, empty: currentViz.probe().mouth };
      } finally { frequencies = saved.frequencies; waveform = saved.waveform; micActive = saved.micActive; micPeak = saved.micPeak; }
    });
    check('television: a waveform at the bottom of its range swings the mouth fully, and an empty one draws it flat', tTrough.open > 0.9 && tTrough.mouth > 6 && tTrough.empty === 0, JSON.stringify(tTrough));

    // The Bounce setting.
    const [, tStill, tStillLoud] = await tvRun(wide, [{ secs: 1.5, ...silence, config: { bounce: 0 } }, { secs: 0.15, ...loudTalk }, { secs: 3, wave: 0.6, low: 0.1, high: 0.9, peak: 0.6 }]);
    check('television: Bounce 0 stills it: no bounce, no tilt, no spring in its antennae, though its face still answers',
      tStill.lift === 0 && tStill.wag === 0 && tStillLoud.tilt === 0 && tStillLoud.wag === 0 && tStillLoud.open === 1 && tStillLoud.mouth > 3, tvf(tStill, tStillLoud));
    const tSyll = [{ secs: 0, ...silence, config: { bounce: 100 } }, ...Array.from({ length: 24 }, (_, i) => (i % 2 ? { secs: 0.3, ...silence } : { secs: 0.2, wave: 0.67, low: 0.1, high: 1, peak: 0.6 }))];
    const tHard = (await tvRun(wide, tSyll)).slice(1), tHardSmall = (await tvRun(page, tSyll)).slice(1);
    await wide.evaluate(() => applyConfig({ bounce: 50 }));
    await page.evaluate(() => applyConfig({ bounce: 50 }));
    check('television: at Bounce 100 and full voice it bounces higher and stays inside the frame, on the wide and the small page',
      tHard.every((r) => r.top > 0 && r.bottom < 623 && r.solidTop >= 10 && r.solidBottom <= 613 && Math.abs(r.tilt) <= 0.3 && tvPlaced(r)) && most(tHard, 'lift') > 6 * 4.8
      && tHardSmall.every((r) => r.top > 0 && r.bottom < 129 && r.solidTop >= 2 && r.solidBottom <= 127 && tvPlaced(r, 130)) && most(tHardSmall, 'lift') > 6,
      JSON.stringify({ lift: most(tHard, 'lift'), tilt: Math.max(...tHard.map((r) => Math.abs(r.tilt))), top: least(tHard, 'top'), bottom: most(tHard, 'bottom'), solidTop: least(tHard, 'solidTop'), solidBottom: most(tHard, 'solidBottom'),
        held: tHard.filter((r) => r.held).length, unplaced: tHard.filter((r) => !tvPlaced(r)).map((r) => [r.solidBottom, +tvFoot(r).toFixed(1)]),
        small: { lift: most(tHardSmall, 'lift'), top: least(tHardSmall, 'top'), bottom: most(tHardSmall, 'bottom'), solidTop: least(tHardSmall, 'solidTop'), solidBottom: most(tHardSmall, 'solidBottom'), held: tHardSmall.filter((r) => r.held).length,
          unplaced: tHardSmall.filter((r) => !tvPlaced(r, 130)).map((r) => [r.solidBottom, +tvFoot(r, 130).toFixed(1)]) } }));

    // Mic off.
    const tOff = await tvRun(wide, [{ secs: 2, ...loudTalk }, ...Array.from({ length: 16 }, () => ({ secs: 0.25, ...off }))]);
    const tOffTop = tOff.slice(9).map((r) => r.top);
    check('television: mic off it is asleep and still, its screen static',
      tOff.slice(9).every((r) => r.asleep === true && r.flecks === 90 && r.eyes === 0 && r.mouth === 0 && Math.abs(r.tilt) < 1e-3 && Math.abs(r.lift) < 0.05) && Math.max(...tOffTop) - Math.min(...tOffTop) <= 1, tvf(tOff[16]));
    // Still means still: with the idle animation off, once it has dozed off, every frame is the same picture:
    // it does not hover, the band on its screen has stopped and its static holds.
    const tHeldStill = (await tvRun(wide, [{ secs: 3, ...off }, ...Array.from({ length: 6 }, () => ({ secs: 0.1, ...off }))], { still: true })).slice(1);
    check('television: mic off with the idle animation off, nothing on the canvas changes',
      new Set(tHeldStill.map((r) => r.light)).size === 1 && new Set(tHeldStill.map((r) => r.snow)).size === 1 && new Set(tHeldStill.map((r) => r.roll)).size === 1 && tHeldStill.every((r) => r.flecks === 90),
      JSON.stringify(tHeldStill.map((r) => [r.light, r.snow, r.roll])));
    await charOn('television', [wide], true);
    // Where its middle is: it rises and falls 2.2 px × scale either side of where it floats.
    const tIdleRun = await tvRun(wide, Array.from({ length: 20 }, () => ({ secs: 0.25, ...off })), { still: true }), tIdleY = tIdleRun.map((r) => r.y);
    check('television: asleep with the idle animation on, its static changes 20 times a second and the band on its screen rolls',
      Math.abs(tIdleRun[19].snow - tIdleRun[0].snow - 95) <= 2 && new Set(tIdleRun.map((r) => r.light)).size > 15 && tIdleRun.some((r, i) => i > 0 && r.roll < tIdleRun[i - 1].roll) && tIdleRun.every((r) => tvPlaced(r)),
      JSON.stringify(tIdleRun.map((r) => [r.snow, +r.roll.toFixed(2)])));
    const tvCostAsleep = await charCost('television', false);
    check('television: asleep, static and all, it draws in under 1.5 ms', tvCostAsleep < 1.5, `${tvCostAsleep.toFixed(3)} ms a frame`);
    check('television: mic off with idle animation: it hovers in its sleep', Math.abs(Math.max(...tIdleY) - Math.min(...tIdleY) - 2 * 2.2 * 4.8) < 1.5 && tOff.slice(9).every((r) => Math.abs(r.y - 5 * 4.8) < 0.05),   // and with the idle animation off, it did not
      JSON.stringify([Math.min(...tIdleY), Math.max(...tIdleY)]));
    await charOn('television', [wide], false);

    // The box.
    const [, tPushFrom, tPushTo] = await tvRun(wide, [{ secs: 2, ...talk }, { secs: 1 / 60, ...talk }, { secs: 1 / 60, ...talk, config: { colorHue: 30 } }]);
    await wide.evaluate(() => applyConfig({ colorHue: 0 }));
    check('television: a config push keeps it as it is', tPushTo.clock > tPushFrom.clock && tPushTo.clock > 2 && Math.abs(tPushTo.lift - tPushFrom.lift) < 3, tvf(tPushFrom, tPushTo));
    const [, tSizeFrom, tSized, tSizeLater] = await tvRun(wide, [{ secs: 2, ...off }, { secs: 1 / 60, ...off }, { secs: 1 / 60, ...off, config: { showLabels: false } }, { secs: 2, ...off }]);
    await wide.evaluate(() => applyConfig({ showLabels: true }));
    check('television: a real size change keeps it, in the middle of the new frame',
      tSized.clock > tSizeFrom.clock && Math.abs((tSized.top + tSized.bottom) / 2 - (816 / 2 + 5 * 4.8)) < 8 && Math.abs((tSizeFrom.top + tSizeFrom.bottom) / 2 - (624 / 2 + 5 * 4.8)) < 8
      && tSizeLater.top > 0 && tSizeLater.ink > 0, tvf(tSizeFrom, tSized, tSizeLater));
    // The static is the only thing here that is random. The screen is solid glass, so static changes
    // the screen's colours, not how much of the canvas is inked: this reads the light on the screen.
    // (The size change just above gave the page a fresh canvas, which the browser draws a little
    // differently until its pixels have been read back twice, so three reads are thrown away first.)
    const tAsleep = [{ secs: 1, wave: 0, low: 0, high: 0, mic: false }];
    for (let i = 0; i < 3; i++) await screenLight(tAsleep, 1);
    const tSeedA = await screenLight(tAsleep, 7), tSeedB = await screenLight(tAsleep, 7), tSeedC = await screenLight(tAsleep, 8);
    check('television: a seeded run repeats, static and all', tSeedA.asleep === true && tSeedA.light === tSeedB.light && tSeedA.light !== tSeedC.light, JSON.stringify([tSeedA.light, tSeedB.light, tSeedC.light]));

    const tvCost = await charCost('television');
    check('television: draws in under 1.5 ms', tvCost < 1.5, `${tvCost.toFixed(3)} ms a frame`);
    check('television: no page errors from the Television checks', pageErrors.length === 0 && p43Errors.length === 0 && wideErrors.length === 0,
      [...pageErrors, ...p43Errors, ...wideErrors].join(' | '));

    await pushConfig((c) => { c.activeViz = 'visualizer'; });
    check('dna: no page errors from the DNA checks', pageErrors.length === 0 && p43Errors.length === 0 && wideErrors.length === 0,
      [...pageErrors, ...p43Errors, ...wideErrors].join(' | '));
    // Stopping the capture puts micPeak back to null. The 4:3 page closes next, so stopping its mic disturbs nothing.
    const stopped = await p43.evaluate(() => { const before = window.__timbre.micPeak; window.timbreCapture.stop(); return { before, after: window.__timbre.micPeak }; });
    check('stopping the mic puts micPeak back to null', typeof stopped.before === 'number' && stopped.after === null, JSON.stringify(stopped));
    await p43.close();
    await wide.close();

    // ── Control panel: UI change → Timbre Push → broadcast round-trip ─────
    const observed = [];
    const obs = new WebSocket(`ws://127.0.0.1:${WS_PORT}/`);
    obs.on('open', () => obs.send(JSON.stringify({ request: 'Subscribe', id: 'o', events: { general: ['Custom'] } })));
    obs.on('message', (raw) => { const m = JSON.parse(raw); if (m.event) observed.push(m.data); });

    const ctlPage = await ctxt.newPage();
    await ctlPage.goto(controlUrl, { waitUntil: 'load' });
    await ctlPage.waitForFunction(() => document.querySelectorAll('#activeViz option').length >= 51, { timeout: 5000 });
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
    await ctlPage.selectOption('#activeViz', 'dna');
    check('DNA shows its three sliders', await ctlPage.evaluate(() =>
      ['Helix Freq', 'Shatter Sensitivity', 'Reconnect Seconds'].every((t) => [...document.querySelectorAll('#perVizKnobs label')].some((l) => l.textContent === t))
      && document.getElementById('pv-dna-reconnectSeconds').max === '10'));
    await ctlPage.evaluate(() => { const e = document.getElementById('pv-dna-reconnectSeconds'); e.value = '7'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    check('moving Reconnect Seconds reaches the overlay', await page.waitForFunction(() => window.__timbre.config.perViz.dna.reconnectSeconds === 7, { timeout: 5000 }).then(() => true).catch(() => false));
    // Put Reconnect Seconds back to 3 and wait for the push.
    const dnaMark = observed.length;
    await ctlPage.evaluate(() => { const e = document.getElementById('pv-dna-reconnectSeconds'); e.value = '3'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await new Promise((res) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const hit = observed.slice(dnaMark).find((m) => m.type === 'timbre:config' && m.config && m.config.perViz && m.config.perViz.dna && m.config.perViz.dna.reconnectSeconds === 3);
        if (hit || Date.now() - t0 > 5000) { clearInterval(iv); res(); }
      }, 100);
    });
    await ctlPage.selectOption('#activeViz', 'comet');
    check('Comet shows its two sliders', await ctlPage.evaluate(() =>
      ['Trail', 'Flare Sensitivity'].every((t) => [...document.querySelectorAll('#perVizKnobs label')].some((l) => l.textContent === t))
      && !!document.getElementById('pv-comet-flareSensitivity')));
    await ctlPage.selectOption('#activeViz', 'fireflies');
    check('Fireflies shows its two sliders', await ctlPage.evaluate(() =>
      ['Density', 'Startle Sensitivity'].every((t) => [...document.querySelectorAll('#perVizKnobs label')].some((l) => l.textContent === t))
      && !!document.getElementById('pv-fireflies-startleSensitivity')));
    await ctlPage.selectOption('#activeViz', 'pulse-rings');
    check('Pulse Rings shows its four sliders', await ctlPage.evaluate(() =>
      ['Sensitivity', 'Flow', 'Explode Sensitivity', 'Reconnect Seconds'].every((t) => [...document.querySelectorAll('#perVizKnobs label')].some((l) => l.textContent === t))
      && document.getElementById('pv-pulse-rings-reconnectSeconds').max === '10' && document.getElementById('pv-pulse-rings-explodeSensitivity').max === '100'));
    await ctlPage.selectOption('#activeViz', 'orbit');
    check('Orbit shows its two sliders', await ctlPage.evaluate(() =>
      ['Planets', 'Flare Sensitivity'].every((t) => [...document.querySelectorAll('#perVizKnobs label')].some((l) => l.textContent === t))
      && document.getElementById('pv-orbit-planets').max === '9' && document.querySelectorAll('#perVizKnobs .row').length === 2));
    await ctlPage.selectOption('#activeViz', 'black-hole');
    check('Black Hole is in the list after Pulse Rings and shows its two sliders', await ctlPage.evaluate(() => {
      const names = [...document.querySelectorAll('#activeViz option')].map((o) => o.value);
      return names.indexOf('black-hole') === names.indexOf('pulse-rings') + 1 && names.length === 51
        && ['Density', 'Gulp Sensitivity'].every((t) => [...document.querySelectorAll('#perVizKnobs label')].some((l) => l.textContent === t))
        && !!document.getElementById('pv-black-hole-gulpSensitivity') && document.querySelectorAll('#perVizKnobs .row').length === 2;
    }));
    await ctlPage.selectOption('#activeViz', 'television');
    check('Television is in the list after Blob and Owl, with no sliders of its own', await ctlPage.evaluate(() => {
      const names = [...document.querySelectorAll('#activeViz option')].map((o) => o.value);
      return names.indexOf('television') === names.indexOf('owl') + 1 && names.indexOf('owl') === names.indexOf('blob') + 1
        && document.querySelectorAll('#perVizKnobs .row').length === 0 && !!document.getElementById('g-bounce');
    }));
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
    check('micPeak is null with no mic', await dpage.evaluate(() => window.__timbre.micPeak === null));
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
