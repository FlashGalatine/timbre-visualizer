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
          for (let i = 0, n = Math.round(st.secs * fps); i < n; i++) { now += 1000 / fps; currentViz.draw(now, 1 / fps); }
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);   // row 0 is the bottom of the canvas
          let solid = 0, light = 0, lightSum = 0, red = 0, edge = 0, empty = 0, upG = 0, upB = 0;
          for (let i = 0; i < px.length; i += 4) {
            const x = (i / 4) % w, y = Math.floor(i / 4 / w), r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3], rgb = r + g + b;
            if (a > 250) solid++;
            else if (a < 5 && rgb > 12) {
              light++; lightSum += rgb;
              if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) edge++;
              if (y > h / 2) { upG += g; upB += b; if (r > 30 && r > g * 1.3 && r > b * 1.3) red++; }
            }
            if (a === 0 && rgb === 0) empty++;
          }
          const s = window.__timbre.scene;
          out.push({ state: (s && s.state) || {}, solid, light, lightSum, red, edge, empty: empty / (w * h), cornerAlpha: px[3], violet: upG ? upB / upG : 0 });
        }
        return out;
      } finally {
        Math.random = random; frequencies = saved.frequencies; micActive = saved.micActive;
        Object.assign(perViz['winter-aurora'], knobs0); TimbreScene.testLevel = null;
      }
    }, { steps, fps, knobs });
    const histOf = (r) => (r.state.hist || []);
    const peakAt = (r) => { const hh = histOf(r); let at = -1, top = 0; hh.forEach((v, i) => { if (v > top) { top = v; at = i; } }); return { at, top }; };

    await activate('winter-aurora');
    const wa0 = await sceneState();
    check('winter aurora is a kit scene on the WebGL canvas', !!wa0 && wa0.active === true && wa0.targetSize[0] === 1728 && wa0.targetSize[1] === 624, JSON.stringify(wa0 && wa0.targetSize));
    const [waQuiet, waLoud] = await auroraRun([{ level: 0, secs: 1.5 }, { level: 0.8, secs: 2.5 }]);
    check('winter aurora draws solid land, added light and a transparent corner', waLoud.solid > 15000 && waLoud.light > 150000 && waLoud.cornerAlpha === 0, JSON.stringify({ solid: waLoud.solid, light: waLoud.light, corner: waLoud.cornerAlpha }));
    check('winter aurora: no light in the outer 4 px of the canvas, and a quarter of it stays empty', waLoud.edge === 0 && waQuiet.edge === 0 && waLoud.empty > 0.25, JSON.stringify({ edge: waLoud.edge, empty: waLoud.empty }));
    check('winter aurora: the aurora never goes dark', waQuiet.light > 60000 && waQuiet.state.glow < 0.02, JSON.stringify({ light: waQuiet.light, glow: waQuiet.state.glow }));
    check('winter aurora: louder is brighter, in the sky and on the snow',
      waLoud.lightSum > waQuiet.lightSum * 1.8 && waLoud.state.glow > 0.7 && waLoud.state.light > waQuiet.state.light * 3, JSON.stringify({ quiet: [waQuiet.lightSum, waQuiet.state.light], loud: [waLoud.lightSum, waLoud.state.light] }));

    // A burst of voice travels along the curtains: 12 history samples a second.
    const [, , waHalf, waLater] = await auroraRun([{ level: 0, secs: 0.5 }, { level: 0.9, secs: 0.25 }, { level: 0, secs: 0.5 }, { level: 0, secs: 1 }]);
    check('winter aurora: a burst of voice travels along the curtain at 12 samples a second',
      histOf(waHalf).length === 32 && Math.abs(peakAt(waHalf).at - 6) <= 1 && Math.abs(peakAt(waLater).at - 18) <= 1 && peakAt(waHalf).top > 0.15 && peakAt(waLater).top > 0.15,
      JSON.stringify([peakAt(waHalf), peakAt(waLater)]));

    // The same at 30 and 60 fps.
    const fpsSteps = [{ level: 0.8, secs: 1 }, { level: 0, secs: 0.5 }];
    const wa30 = (await auroraRun(fpsSteps, { fps: 30 }))[1], wa60 = (await auroraRun(fpsSteps, { fps: 60 }))[1];
    check('winter aurora: the glow and the travelling history agree at 30 and 60 fps',
      wa60.state.glow > 0.2 && Math.abs(wa30.state.glow - wa60.state.glow) < 0.02 && histOf(wa60).length === 32 && histOf(wa60).every((v, i) => Math.abs(v - histOf(wa30)[i]) < 0.04),
      JSON.stringify({ glow: [wa30.state.glow, wa60.state.glow], h30: histOf(wa30).slice(0, 8), h60: histOf(wa60).slice(0, 8) }));
    check('winter aurora: snow falls the same at 30 and 60 fps (count and mean height)',
      wa60.state.falling > 20 && Math.abs(wa30.state.falling - wa60.state.falling) <= 3 && Math.abs(wa30.state.fallingHeight - wa60.state.fallingHeight) < 0.15,
      JSON.stringify({ f30: [wa30.state.falling, wa30.state.fallingHeight], f60: [wa60.state.falling, wa60.state.fallingHeight] }));

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
    check(`winter aurora: draw() averages under 4 ms (${waCost.toFixed(2)} ms)`, waCost < 4);

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
    check('a scene deletes every GL texture it made, whichever scene ran before it',
      Object.values(texturesLeft).every(([made, left]) => made > 5 && left === 0), JSON.stringify(texturesLeft));

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
        setActiveViz('glass-prism');
        await new Promise((r) => setTimeout(r, 900));
        currentViz.draw(performance.now(), 1 / 60);
        const gl = document.getElementById('vizCanvas3D').getContext('webgl2');
        const before = { flip: gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL), error: gl.getError() };
        setActiveViz('thanksgiving-harvest');
        const created = gl.getError();
        currentViz.draw(performance.now(), 1 / 60);
        const s = window.__timbre.scene;
        const attrs = gl.getContextAttributes();
        return { before, created, drawn: gl.getError(), active: !!s && s.active === true, attrs: [attrs.alpha, attrs.antialias, attrs.depth, attrs.stencil, attrs.premultipliedAlpha] };
      });
      check('an older WebGL effect leaves the flip flag set (what the next check guards against)', first.before.flip === true && first.before.error === 0, JSON.stringify(first.before));
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
        return { attrs: [a.alpha, a.antialias, a.depth, a.stencil, a.premultipliedAlpha, a.preserveDrawingBuffer], error: gl.getError(), active: !!s && s.active === true };
      });
      check('a scene that is the first WebGL effect on a page creates the context as three.js asks for it',
        JSON.stringify(cold.attrs) === '[true,true,true,true,true,false]' && cold.error === 0 && cold.active, JSON.stringify(cold));
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
