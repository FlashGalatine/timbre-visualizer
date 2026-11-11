/* ─────────────────────────────────────────────────────────────────────────
   Timbre core — shared infrastructure for every visualizer factory.

   Loaded as a plain (non-module) <script> so its top-level let/const are
   visible to every factory <script> that follows. Factories register into
   VIZ_FACTORIES; the HTML's bootstrap script kicks off capture + the
   animation loop after every factory has loaded.

   Transport: config arrives as `svc:message` CustomEvents dispatched by
   /timbre-shared/panel-client-sb.js (Streamer.bot General.Custom broadcasts).
   Audio never crosses the wire — audio-capture.js (loaded after this file)
   fills the `frequencies` / `waveform` / `micActive` bindings from the
   page's own microphone.

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
function getColor(t) {
  const len = PALETTE.length;
  const idx = ((t % len) + len) % len;
  const i = Math.floor(idx);
  return lerpColor(PALETTE[i], PALETTE[(i + 1) % len], idx - i);
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
let frequencies = null;
let waveform = null;
let micActive = false;

/* ── Shared visualizer config — normalized values the factories consume.
      Kept in sync with the full config object below by applyConfig(). ── */
let cfgGain = 1;
let cfgColorSpeed = 1;
let cfgColorHue = 0;
let cfgIdleAnim = true;
let cfgEffectBgOpacity = 1;
let cfgBars = 20;
let cfgBounce = 50;

let cfgShowLabels = true;
let cfgShowChevrons = true;
let cfgShowDecorations = true;
let cfgShowBorder = true;

/* Full current config (complete + clamped, from TIMBRE.sanitizeConfig). The
   factories read the two nested blocks through these aliases. */
let timbreConfig = TIMBRE.defaultConfig();
let cfgSTLObject = timbreConfig.stlObject;
const perViz = timbreConfig.perViz;

/* ── Decoration helpers — apply to BOTH canvases so 2D + 3D stay aligned ── */
function applyBgOpacity(pct) {
  document.documentElement.style.setProperty('--dark-base', `rgba(10, 10, 26, ${pct / 100})`);
}
function setCanvasHeight(h) {
  H = h;
  canvas2d.height = h;
  canvas3d.height = h;
  canvasStack.style.height = h + 'px';
  // Both canvases keep their CSS height in sync via the stack rule, but the 3D
  // viz's renderer needs an explicit setSize callback when its drawing buffer changes.
  if (currentViz && typeof currentViz.onResize === 'function') currentViz.onResize();
}
function applyShowDecorations(show) {
  cfgShowDecorations = show;
  if (show) {
    applyShowLabels(cfgShowLabels);
    applyShowChevrons(cfgShowChevrons);
    if (ticksEl) ticksEl.style.display = '';
  } else {
    if (labelEl) labelEl.style.display = 'none';
    statusEl.style.display = 'none';
    document.querySelectorAll('.chevron-track').forEach(el => { el.style.display = 'none'; });
    if (ticksEl) ticksEl.style.display = 'none';
    setCanvasHeight(180);
  }
}
function applyShowChevrons(show) {
  cfgShowChevrons = show;
  if (!cfgShowDecorations) return;
  document.querySelectorAll('.chevron-track').forEach(el => {
    el.style.display = show ? '' : 'none';
  });
}
function applyShowLabels(show) {
  cfgShowLabels = show;
  if (!cfgShowDecorations) return;
  if (labelEl) labelEl.style.display = show ? '' : 'none';
  statusEl.style.display = show ? '' : 'none';
  setCanvasHeight(show ? 130 : 170);
}
function applyShowBorder(show) {
  cfgShowBorder = show;
  const box = document.querySelector('.visualizer-box');
  if (box) box.classList.toggle('no-border', !show);
  if (!show) {
    // Border off: .no-border CSS hides decorations and stretches canvas-stack to
    // 100%/100% of the box. Match the drawing buffer height to the new rendered
    // size so we render at native resolution. Width stays unchanged — CSS scales
    // it (the gap is small: 1248→1440 / 260→300 = 1.154x). offsetHeight (layout
    // height) rather than getBoundingClientRect: the 16:9 page CSS-transforms the
    // whole box to fit the source, and the buffer must follow layout, not screen px.
    canvasStack.style.height = '';
    const newH = Math.max(1, canvasStack.offsetHeight);
    H = newH;
    canvas2d.height = newH;
    canvas3d.height = newH;
    if (currentViz && typeof currentViz.onResize === 'function') currentViz.onResize();
  } else {
    // Border restored — re-apply the canvas height that the current decoration
    // toggles imply (both branches end up calling setCanvasHeight).
    applyShowDecorations(cfgShowDecorations);
  }
}

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
  // Wipe leftover 2D pixels so they don't bleed when we come back to a 2D viz.
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
   snapshots), but we still sanitize against the shared tables so a
   hand-crafted or stale payload can't wedge the overlay. */
function applyConfig(raw) {
  const cfg = TIMBRE.sanitizeConfig(raw, timbreConfig);
  timbreConfig = cfg;

  cfgBars = cfg.bars;
  cfgBounce = cfg.bounce;
  cfgGain = cfg.gain / 100;
  cfgColorSpeed = cfg.colorSpeed / 100;
  cfgColorHue = (cfg.colorHue / 100) * PALETTE.length;
  cfgIdleAnim = cfg.idleAnim;
  cfgEffectBgOpacity = cfg.effectBgOpacity / 100;
  applyShowLabels(cfg.showLabels);
  applyShowChevrons(cfg.showChevrons);
  applyShowDecorations(cfg.showDecorations);
  applyShowBorder(cfg.showBorder);
  applyBgOpacity(cfg.bgOpacity);

  // Mutate the shared objects in place — factories hold references to them.
  Object.assign(cfgSTLObject, cfg.stlObject);
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
  if (msg && msg.type === 'timbre:config' && msg.config) applyConfig(msg.config);
});

/* Debug/test surface — top-level let bindings don't attach to window, so the
   verify-render suite (and DevTools poking) reads live state through this. */
window.__timbre = {
  get micActive() { return micActive; },
  get frequencies() { return frequencies; },
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
