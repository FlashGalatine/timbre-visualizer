/* ─────────────────────────────────────────────────────────────────────────
   Timbre core — shared infrastructure for every visualizer factory.

   Loaded as a plain (non-module) <script> so its top-level let/const are
   visible to every factory <script> that follows. Factories register into
   VIZ_FACTORIES; the HTML's bootstrap script kicks off capture + the
   animation loop after every factory has loaded.

   Transport: config arrives as `svc:message` CustomEvents dispatched by
   /timbre-shared/panel-client-sb.js (Streamer.bot General.Custom broadcasts).
   Audio never crosses the wire — audio-capture.js (loaded after this file)
   fills the `frequencies` / `slices` / `waveform` / `micPeak` / `micBands` /
   `micActive` bindings from the page's own microphone.

   All names, defaults, and ranges come from /timbre-shared/viz-config.js
   (the TIMBRE global) — the single source of truth shared with control.html.
   ───────────────────────────────────────────────────────────────────────── */

/* ── Decoration strips ── */
['chevronTop', 'chevronBottom'].forEach(id => {
  const strip = document.getElementById(id);
  let ticks = '';
  for (let i = 0; i < 80; i++) {
    const isLarge = i % 4 === 0;
    ticks += `<div class="chevron-tick ${isLarge ? 'large' : 'small'}"></div>`;
  }
  strip.innerHTML = ticks + ticks;
});

const ticksEl = document.getElementById('vizTicks');
let ticksHTML = '';
for (let i = 0; i < 40; i++) ticksHTML += '<div class="tick"></div>';
ticksEl.innerHTML = ticksHTML;

/* ── Color palette (shared across all visualizers) ── */
const PALETTE = [
  [0, 255, 255], [145, 70, 255], [255, 0, 255], [255, 20, 147], [57, 255, 20],
];
function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
/* The palette colour at t, written into `out` ([r, g, b], whole numbers 0-255), which is
   returned: no array is made. t runs round the palette, one colour per whole number. */
function getColorInto(out, t) {
  const len = PALETTE.length;
  const idx = ((t % len) + len) % len;
  const i = Math.floor(idx), f = idx - i, a = PALETTE[i], b = PALETTE[(i + 1) % len];
  out[0] = Math.round(a[0] + (b[0] - a[0]) * f);
  out[1] = Math.round(a[1] + (b[1] - a[1]) * f);
  out[2] = Math.round(a[2] + (b[2] - a[2]) * f);
  return out;
}
/* The same colour as a new array, which is the caller's to keep or change. */
function getColor(t) {
  return getColorInto([0, 0, 0], t);
}

/* The palette as a table: PALETTE_STEPS colours spaced evenly round it, as numbers
   (PALETTE_RGB, three per entry) and as ready CSS strings (PALETTE_CSS), so that an effect
   that paints many things a frame builds no colour and no string for each. Entry i is the
   exact colour at i / PALETTE_STEPS of the way round; paletteStep(t) is the entry nearest t,
   and its colour is within 3 of 255 on any channel of getColor(t). The table is built again
   whenever the palette changes, which only setPalette() does. */
const PALETTE_STEPS = 256;
const PALETTE_RGB = new Uint8Array(PALETTE_STEPS * 3);
const PALETTE_CSS = new Array(PALETTE_STEPS);
function rebuildPaletteTable() {
  const c = [0, 0, 0];
  for (let i = 0; i < PALETTE_STEPS; i++) {
    getColorInto(c, (i * PALETTE.length) / PALETTE_STEPS);
    PALETTE_RGB[i * 3] = c[0]; PALETTE_RGB[i * 3 + 1] = c[1]; PALETTE_RGB[i * 3 + 2] = c[2];
    PALETTE_CSS[i] = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }
}
function paletteStep(t) {
  const len = PALETTE.length;
  return Math.round(((((t % len) + len) % len) * PALETTE_STEPS) / len) % PALETTE_STEPS;
}
function getColorCss(t) {
  return PALETTE_CSS[paletteStep(t)];
}
/* Change the palette: at least two colours, each [r, g, b] in 0-255. The array itself stays
   (effects hold it), the table is rebuilt and the hue offset follows the new length. Returns
   false, changing nothing, when the colours are not that. */
function setPalette(colours) {
  const good = Array.isArray(colours) && colours.length >= 2
    && colours.every((c) => Array.isArray(c) && c.length === 3 && c.every((v) => typeof v === 'number' && v >= 0 && v <= 255));
  if (!good) return false;
  PALETTE.length = 0;
  for (const c of colours) PALETTE.push([c[0], c[1], c[2]]);
  rebuildPaletteTable();
  cfgColorHue = (timbreConfig.colorHue / 100) * PALETTE.length;
  return true;
}
rebuildPaletteTable();

/* ── Per-second helpers (shared by the 2D effects) ──
   Each gives the same result over a second at any frame rate. ema and decay are the scene
   kit's TimbreScene.follow and TimbreScene.fall, to the digit. */
/* cur moved toward target, at `rate` per second. */
const ema = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
/* cur dying away, at `rate` per second. */
const decay = (cur, rate, dt) => cur * Math.exp(-rate * dt);
/* The chance that something which happens `perSecond` times a second on average happens in a
   frame of dt seconds: `if (Math.random() < chance(2, dt))`. */
const chance = (perSecond, dt) => 1 - Math.exp(-perSecond * dt);
/* Fade what is on the 2D canvas toward nothing, or clear it. `alpha` is the share a 60 fps
   frame takes off (the trail effects' own measure); given dt, a frame of any length takes off
   as much as leaves the same after a second. With nothing to fade by (alpha at or under
   0.001: Trail veil 0) the canvas is cleared instead, so that nothing smears for ever. With no
   dt the share is taken as given. Returns the share taken off, 1 when it cleared. */
function fadeOrClear(alpha, dt) {
  if (!(alpha > 0.001)) { ctx.clearRect(0, 0, W, H); return 1; }
  let share = Math.min(1, alpha);
  if (Number.isFinite(dt) && dt >= 0 && share < 1) share = 1 - decay(1, -60 * Math.log(1 - share), dt);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = `rgba(0, 0, 0, ${share})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  return share;
}

/* ── Canvas refs (one 2D + one WebGL canvas, stacked; the active viz picks which is visible) ── */
const canvasStack = document.getElementById('canvasStack');
const canvas2d = document.getElementById('vizCanvas2D');
const ctx = canvas2d.getContext('2d');
const canvas3d = document.getElementById('vizCanvas3D');
let W = canvas2d.width;
let H = canvas2d.height;
/* Width-based scale factor (1.0 at the baseline 260px-wide layout, 4.8 on the
   1440×1080 page). Factories multiply their pixel-tuned constants (chunk sizes,
   character pixels, projection FOCAL, particle radii) by SCALE so every layout looks
   right. W is stable across decoration toggles; only H changes, so this is safe to
   compute once. A page whose canvas is wider than it is tall-for-its-scale (the
   16:9 1920×1080 page) reassigns SCALE right after this script so radii track the
   canvas height rather than the extra width. */
let SCALE = W / 260;

/* ── Shared audio + status state (filled by audio-capture.js) ── */
const statusEl = document.getElementById('vizStatus');
const labelEl = document.querySelector('.viz-label');
let frequencies = null;   // 32 log-spaced bands, 60 Hz to 12 kHz, 0-255; null with no mic
/* What `frequencies` held before the log bands: 32 values 750 Hz apart (at 48 kHz), 0-255,
   from a 64-sample look. For the effects tuned on those values, which read them by position;
   a new or rebuilt effect reads micBands or the log bands. null with no mic. See docs/EFFECTS.md. */
let slices = null;
let waveform = null;
let micPeak = null;   // loudest input sample (0..1) across the whole sample interval; null with no mic
/* The sound summed up once per audio sample (about 30 a second), all before Gain except the
   beat: { bass, mid, treble, rms, centroid, level, beat, beats }. null with no mic. `beat` is
   true for the one sample a beat is found on; `beats` counts them, so a reader that draws
   faster or slower than the sampler compares the count with the one it saw last and neither
   misses a beat nor takes one twice. See docs/EFFECTS.md. */
let micBands = null;
let micActive = false;

/* ── Shared visualizer config — normalized values the factories consume.
      Kept in sync with the full config object below by applyConfig(). ── */
let cfgGain = 1;
let cfgColorSpeed = 1;
let cfgColorHue = 0;
let cfgIdleAnim = true;
let cfgEffectBgOpacity = 1;
let cfgAfterglow = 1.6;
let cfgBars = 20;
let cfgBounce = 50;

let cfgShowLabels = true;
let cfgShowChevrons = true;
let cfgShowDecorations = true;
let cfgShowBorder = true;

/* Full current config (complete + clamped, from TIMBRE.sanitizeConfig). The
   factories read its per-effect block through this alias. */
let timbreConfig = TIMBRE.defaultConfig();
const perViz = timbreConfig.perViz;

/* ── Decoration helpers — apply to BOTH canvases so 2D + 3D stay aligned ── */
function applyBgOpacity(pct) {
  document.documentElement.style.setProperty('--dark-base', `rgba(10, 10, 26, ${pct / 100})`);
}
/* Give both canvases the height h, in drawing-buffer pixels. Setting a canvas's height
   clears it and resets its context even when the value is the one it has, which wipes
   whatever an effect keeps on the canvas (the spectrogram's history, Matrix's rain, a
   trail). So a height the canvas already has is left alone. */
function resizeCanvases(h) {
  if (h === H && canvas2d.height === h) return;
  H = h;
  canvas2d.height = h;
  canvas3d.height = h;
  // Both canvases keep their CSS height in sync via the stack rule, but the 3D
  // viz's renderer needs an explicit setSize callback when its drawing buffer changes.
  if (currentViz && typeof currentViz.onResize === 'function') currentViz.onResize();
}
/* h is in the 300×220 page's pixels: the two large pages replace this function with one
   that scales h and calls this one. */
function setCanvasHeight(h) {
  canvasStack.style.height = h + 'px';
  resizeCanvases(h);
}
/* Show what the four toggles ask for, and give the canvas the one height they add up to,
   once. With decorations off the canvas is 180 tall; with them on it is 130, or 170 when the
   labels are hidden. */
function applyDecorations() {
  const labels = cfgShowDecorations && cfgShowLabels, chevrons = cfgShowDecorations && cfgShowChevrons;
  if (labelEl) labelEl.style.display = labels ? '' : 'none';
  statusEl.style.display = labels ? '' : 'none';
  document.querySelectorAll('.chevron-track').forEach(el => { el.style.display = chevrons ? '' : 'none'; });
  if (ticksEl) ticksEl.style.display = cfgShowDecorations ? '' : 'none';
  const box = document.querySelector('.visualizer-box');
  if (box) box.classList.toggle('no-border', !cfgShowBorder);
  if (cfgShowBorder) {
    setCanvasHeight(!cfgShowDecorations ? 180 : cfgShowLabels ? 130 : 170);
  } else {
    // Border off: .no-border CSS hides decorations and stretches canvas-stack to
    // 100%/100% of the box. Match the drawing buffer height to the new rendered
    // size so we render at native resolution. Width stays unchanged — CSS scales
    // it (the gap is small: 1248→1440 / 260→300 = 1.154x). offsetHeight (layout
    // height) rather than getBoundingClientRect: the 16:9 page CSS-transforms the
    // whole box to fit the source, and the buffer must follow layout, not screen px.
    canvasStack.style.height = '';
    resizeCanvases(Math.max(1, canvasStack.offsetHeight));
  }
}
function applyShowDecorations(show) { cfgShowDecorations = show; applyDecorations(); }
function applyShowChevrons(show) { cfgShowChevrons = show; applyDecorations(); }
function applyShowLabels(show) { cfgShowLabels = show; applyDecorations(); }
function applyShowBorder(show) { cfgShowBorder = show; applyDecorations(); }

/* ── Active viz selector ── */
const ACTIVE_VIZ_NAMES = TIMBRE.ACTIVE_VIZ_NAMES;
const VIZ_USES_3D = new Set(TIMBRE.VIZ_USES_3D);
const VIZ_FACTORIES = {};

let currentVizName = null;
let currentViz = null;

function setActiveViz(name) {
  if (!ACTIVE_VIZ_NAMES.includes(name)) return;
  if (name === currentVizName) return;
  if (currentViz && typeof currentViz.stop === 'function') currentViz.stop();
  currentViz = null;
  currentVizName = name;

  const is3d = VIZ_USES_3D.has(name);
  canvas2d.style.display = is3d ? 'none' : '';
  canvas3d.style.display = is3d ? '' : 'none';
  // Wipe leftover 2D pixels so they don't bleed when we come back to a 2D viz, and put the
  // 2D context back as new (setting the height does both), so that nothing the last effect
  // left set on it (a blend mode, a shadow, a line width) reaches the next one. Every config
  // used to do this as a side effect of setting the canvas height; now only a switch does.
  canvas2d.height = canvas2d.height;
  ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);

  const factory = VIZ_FACTORIES[name];
  if (!factory) return;
  currentViz = factory();
  if (currentViz && typeof currentViz.start === 'function') currentViz.start();
}

/* ── Master animation loop ── */
let lastFrameAt = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastFrameAt) / 1000);
  lastFrameAt = now;
  if (currentViz && typeof currentViz.draw === 'function') {
    currentViz.draw(now, dt);
  }
}

/* ── Config application ──
   Every broadcast carries the COMPLETE config (control.html sends full
   snapshots, and Timbre Push refuses a partial one), but we still sanitize
   against the shared tables so a hand-crafted or stale payload can't wedge
   the overlay. The receiver below merges a broadcast over the defaults first. */
let configApplied = false;   // the first config is always applied: the page has shown none yet

/* Whether cfg (complete, from sanitizeConfig) is what the page is already showing: equal to
   the config last applied, with nothing changed by hand since (a test or DevTools setting a
   knob, or switching the effect, without a config). */
function configInForce(cfg) {
  if (!configApplied || JSON.stringify(cfg) !== JSON.stringify(timbreConfig)) return false;
  if (currentVizName !== cfg.activeViz) return false;
  if (cfgBars !== cfg.bars || cfgBounce !== cfg.bounce || cfgGain !== cfg.gain / 100 || cfgColorSpeed !== cfg.colorSpeed / 100
    || cfgColorHue !== (cfg.colorHue / 100) * PALETTE.length || cfgIdleAnim !== cfg.idleAnim
    || cfgEffectBgOpacity !== cfg.effectBgOpacity / 100 || cfgAfterglow !== cfg.afterglow
    || cfgShowLabels !== cfg.showLabels || cfgShowChevrons !== cfg.showChevrons
    || cfgShowDecorations !== cfg.showDecorations || cfgShowBorder !== cfg.showBorder) return false;
  for (const [name, knobs] of Object.entries(cfg.perViz)) {
    const live = perViz[name];
    if (!live) return false;
    for (const [k, v] of Object.entries(knobs)) if (live[k] !== v) return false;
  }
  return true;
}

function applyConfig(raw) {
  const cfg = TIMBRE.sanitizeConfig(raw, timbreConfig);
  // A config equal to the one in force changes nothing, so nothing is done: every page that
  // connects makes Streamer.bot send the saved config to all of them again.
  if (configInForce(cfg)) return;
  timbreConfig = cfg;
  configApplied = true;

  cfgBars = cfg.bars;
  cfgBounce = cfg.bounce;
  cfgGain = cfg.gain / 100;
  cfgColorSpeed = cfg.colorSpeed / 100;
  cfgColorHue = (cfg.colorHue / 100) * PALETTE.length;
  cfgIdleAnim = cfg.idleAnim;
  cfgEffectBgOpacity = cfg.effectBgOpacity / 100;
  cfgAfterglow = cfg.afterglow;
  cfgShowLabels = cfg.showLabels;
  cfgShowChevrons = cfg.showChevrons;
  cfgShowDecorations = cfg.showDecorations;
  cfgShowBorder = cfg.showBorder;
  applyDecorations();
  applyBgOpacity(cfg.bgOpacity);

  // Mutate the shared objects in place — factories hold references to them.
  for (const [name, knobs] of Object.entries(cfg.perViz)) {
    if (perViz[name]) Object.assign(perViz[name], knobs);
    else perViz[name] = knobs;
  }

  if (window.timbreCapture) window.timbreCapture.setDevice(cfg.mic.deviceId, cfg.mic.label);
  setActiveViz(cfg.activeViz);
  if (currentViz && typeof currentViz.onConfig === 'function') currentViz.onConfig(cfg);
}

/* ── Wiring: transport (svc:message) + local mic state (timbre:mic) ── */
window.addEventListener('svc:message', (evt) => {
  const msg = evt.detail;
  if (!msg || msg.type !== 'timbre:config' || !msg.config) return;
  // Streamer.bot stores a config as it was sent and sends it again on every connect. One
  // that makes this throw must not stop the page: it keeps drawing with the settings it has.
  // A broadcast is the whole config, so it is merged over the DEFAULTS, as the dock merges
  // it (sanitizeConfig with no base), and not over what this page has: whatever a broadcast
  // lacks (one saved before a setting existed, or sent by something other than the dock)
  // is the default on every page. applyConfig itself still merges over the config in force.
  try {
    applyConfig(TIMBRE.sanitizeConfig(msg.config));
  } catch (e) {
    console.warn('Timbre: a config that came in could not be applied; the overlay keeps the settings it has.', e);
  }
});

/* Debug/test surface — top-level let bindings don't attach to window, so the
   verify-render suite (and DevTools poking) reads live state through this. */
window.__timbre = {
  get micActive() { return micActive; },
  get frequencies() { return frequencies; },
  get slices() { return slices; },
  get micPeak() { return micPeak; },
  get micBands() { return micBands; },
  get currentVizName() { return currentVizName; },
  get cfgGain() { return cfgGain; },
  get config() { return timbreConfig; },
  get SCALE() { return SCALE; },
  get W() { return W; },
  get H() { return H; },
  get scene() { return (typeof TimbreScene !== 'undefined' && TimbreScene.debug) ? TimbreScene.debug() : null; },
};

window.addEventListener('timbre:mic', (evt) => {
  const state = evt.detail && evt.detail.state;
  if (state === 'listening') {
    statusEl.textContent = 'LISTENING';
    statusEl.style.color = '';
  } else if (state === 'denied') {
    statusEl.textContent = 'MIC DENIED';
    statusEl.style.color = 'var(--magenta)';
  } else {
    statusEl.textContent = 'WAITING';
    statusEl.style.color = 'var(--magenta)';
  }
});
