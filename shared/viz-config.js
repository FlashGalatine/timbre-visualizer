// Timbre — single source of truth for every visualizer name, knob default, and
// range. Loaded by BOTH the overlay (core.js) and the control panel
// (control.html), and imported by the mock/verify suites, so the old
// hand-sync obligation between core.js and the server is gone: there is
// exactly one copy of these tables.
//
// The file is deliberately valid as BOTH a classic <script> and an ES module
// (it only assigns `globalThis.TIMBRE`), the same trick as Tally's nations.js.

(function () {
  'use strict';

  // Allowlist of visualizer names accepted by `activeViz`. Order is the
  // dropdown order in the control panel.
  const ACTIVE_VIZ_NAMES = [
    'visualizer', 'waveform', 'blob', 'owl', 'peak-hold', 'ring-bars', 'ring-waveform',
    'comet', 'orbit', 'spectrogram', 'dna', 'fireflies', 'pulse-rings', 'matrix',
    'sine-bars', 'mountains-2d', 'mountains-3d', 'vaporwave', 'peaks-mirror', 'sunburst-3d',
    'galaxy-ripple', 'tunnel', 'metaball', 'glass-prism', 'chladni', 'phosphor', 'ink',
    'shards', 'jelly', 'boids', 'rose',
    'spring-blossoms', 'summer-tide', 'autumn-leaves', 'winter-aurora',
    'halloween-jack', 'christmas-tree', 'new-year-fireworks', 'valentines-hearts',
    'easter-eggs', 'st-patricks-shamrocks', 'july-fourth-stripes', 'thanksgiving-harvest',
    'lunar-new-year-lanterns', 'pride-ribbon', 'dia-de-muertos-calavera',
    'bi-pride-ribbon', 'ace-pride-ribbon', 'trans-pride-ribbon',
  ];

  // Which visualizers render on the WebGL canvas (all depend on the THREE global).
  const VIZ_USES_3D = [
    'mountains-3d', 'sunburst-3d', 'metaball', 'glass-prism', 'chladni',
    'phosphor', 'ink', 'shards', 'jelly', 'boids',
    'rose', 'winter-aurora', 'thanksgiving-harvest',
  ];

  // Effects built on the scene kit (overlay/scene-kit.js); all of them are 3D.
  const VIZ_SCENES = ['thanksgiving-harvest'];

  // Where a scene sits in the frame: offset from centre (percent of the half
  // frame) and size (percent of its natural size).
  const PLACEMENT_RANGES = {
    x:    { min: -100, max: 100, step: 1, default: 0 },
    y:    { min: -100, max: 100, step: 1, default: 0 },
    size: { min: 40,   max: 200, step: 1, default: 100 },
  };

  // 2D effects that draw a fading afterglow behind their live shape.
  const VIZ_AFTERGLOW = ['visualizer', 'peak-hold', 'ring-bars', 'sine-bars', 'waveform', 'ring-waveform'];

  // How long the afterglow lingers, in seconds; 0 turns it off.
  const AFTERGLOW_RANGE = { min: 0, max: 4, step: 0.1, default: 1.6 };

  // Per-viz knobs are 0-100 sliders by default; each visualizer normalizes to
  // its own range. String-typed defaults (see 'matrix') pass through verbatim
  // (capped at 4096 chars) instead of clamped.
  const DEFAULT_PER_VIZ = {
    'peak-hold':     { fallSpeed: 50 },
    'ring-bars':     { spokes: 50 },
    'ring-waveform': { amplitude: 50 },
    'comet':         { trail: 50 },
    'pulse-rings':   { sensitivity: 50, flow: 0 },
    'orbit':         { density: 50 },
    'spectrogram':   { scrollSpeed: 50 },
    'dna':           { helixFreq: 50 },
    'fireflies':     { density: 50 },
    'matrix':        {
      flow: 50,
      mode: 'pool',
      pool: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ0123456789',
      messages: 'HELLO\nGG WP\nGL HF',
    },
    'sine-bars':     { ribbon: 50 },
    'mountains-2d':  { speed: 50 },
    'mountains-3d':  { speed: 50 },
    'vaporwave':     { speed: 50, sunSize: 50 },
    'tunnel':        { bend: 50 },
    'peaks-mirror':  { seam: 50 },
    'sunburst-3d':   { density: 50 },
    'galaxy-ripple': { sensitivity: 50 },
    'metaball':      { chrome: 50 },
    'glass-prism':   { chroma: 50 },
    'chladni':       { density: 50 },
    'phosphor':      { depth: 50 },
    'ink':           { swirl: 50 },
    'shards':        { density: 50 },
    'jelly':         { stiffness: 50 },
    'boids':         { cohesion: 50 },
    'rose':          {},
    'spring-blossoms': { petalDensity: 50, windStrength: 50 },
    'summer-tide':     { waveAmplitude: 50, sunSize: 50, sparkleRate: 50 },
    'autumn-leaves':   { leafDensity: 50, vortexStrength: 30 },
    'winter-aurora':   { ribbonCount: 60, starDensity: 50, mountainOpacity: 70 },
    'halloween-jack':     { faceExpression: 0, batCount: 50, spiderChance: 30 },
    'christmas-tree':     { lightDensity: 60, snowSpeed: 50, starGlow: 50 },
    'new-year-fireworks': { burstChance: 60, particleCount: 50, gravity: 40, trailFade: 30 },
    'valentines-hearts':  { heartDensity: 50, pulseStrength: 50, cupidChance: 40 },
    'easter-eggs':              { eggCount: 50, patternStyle: 75, bunnyChance: 50 },
    'st-patricks-shamrocks':    { shamrockDensity: 50, rainbowSaturation: 60, goldRate: 50 },
    'july-fourth-stripes':      { stripeAmplitude: 50, starTwinkle: 50, burstChance: 50 },
    'thanksgiving-harvest':     { candleGlow: 50, leafDensity: 50, cameraDrift: 50 },
    'lunar-new-year-lanterns':  { lanternCount: 60, dragonOpacity: 60, fireworkRate: 50 },
    'pride-ribbon':             { ribbonAmplitude: 50, heartRate: 50, stripeStyle: 0 },
    'bi-pride-ribbon':          { ribbonAmplitude: 50, heartRate: 50 },
    'ace-pride-ribbon':         { ribbonAmplitude: 50, heartRate: 50 },
    'trans-pride-ribbon':       { ribbonAmplitude: 50, heartRate: 50 },
    'dia-de-muertos-calavera':  { petalDensity: 60, patternIntensity: 50, candleFlicker: 50 },
  };

  // Per-knob max overrides for numeric perViz values; default max is 100.
  const PER_VIZ_MAX = {};

  // Shared knob group for any visualizer that loads a 3D STL model. Whichever
  // STL viz is active reads from `config.stlObject`; adding a new STL viz means
  // just consuming it in the factory — no new knob plumbing.
  const STL_OBJECT_DEFAULTS = {
    intensity: 50,
    zoom: 50,
    sparkThickness: 0,
    sparkDistance: 50,
    sensitivity: 100,
    jitter: 35,
    smoothing: 70,
    rotX: 0, rotY: 0, rotZ: 0,
    posX: 0, posY: 0, posZ: 0,
    // Additional copies of the STL alongside the original (total = 1 + clones).
    clones: 0,
    // Bucket: <25=rows, <50=cols, <75=grid, ≥75=scattered.
    arrangement: 0,
    // World units between copies (and scatter cube half-extent).
    spacing: 0.5,
    // Bucket: <33=X, <67=Y, ≥67=Z. Default 50 keeps the original Y-axis spin.
    spinAxis: 50,
  };
  const STL_OBJECT_RANGES = {
    intensity:      { min: 0,    max: 200, step: 1 },
    zoom:           { min: 0,    max: 100, step: 1 },
    sparkThickness: { min: 0,    max: 100, step: 1 },
    sparkDistance:  { min: 0,    max: 100, step: 1 },
    sensitivity:    { min: 0,    max: 200, step: 1 },
    jitter:         { min: 0,    max: 100, step: 1 },
    smoothing:      { min: 0,    max: 100, step: 1 },
    rotX:           { min: -180, max: 180, step: 1 },
    rotY:           { min: -180, max: 180, step: 1 },
    rotZ:           { min: -180, max: 180, step: 1 },
    posX:           { min: -2,   max: 2,   step: 0.05 },
    posY:           { min: -2,   max: 2,   step: 0.05 },
    posZ:           { min: -2,   max: 2,   step: 0.05 },
    clones:         { min: 0,    max: 8,   step: 1 },
    arrangement:    { min: 0,    max: 100, step: 1 },
    spacing:        { min: 0,    max: 2,   step: 0.05 },
    spinAxis:       { min: 0,    max: 100, step: 1 },
  };

  // Top-level numeric knobs with their ranges…
  const TOP_RANGES = {
    bars:            { min: 4,  max: 32,  step: 1, default: 20 },
    bounce:          { min: 0,  max: 100, step: 1, default: 50 },
    gain:            { min: 0,  max: 200, step: 1, default: 100 },  // % multiplier on amplitudes
    colorSpeed:      { min: 50, max: 300, step: 1, default: 100 },  // % multiplier on palette cycle
    colorHue:        { min: 0,  max: 100, step: 1, default: 0 },    // palette starting offset
    bgOpacity:       { min: 0,  max: 100, step: 1, default: 88 },   // % opacity of the dark box background
    effectBgOpacity: { min: 0,  max: 100, step: 1, default: 100 },  // % on the per-frame dark trail veil
  };
  // …and the boolean toggles.
  const TOP_BOOLS = {
    idleAnim: true,        // show idle animation when the mic is off
    showLabels: true,      // show "AUDIO" header + status sub-header
    showChevrons: true,    // show the marquee chevron tracks at top + bottom
    showDecorations: true, // master toggle: off hides labels+chevrons+ticks and grows the canvas
    showBorder: true,      // show the accent border + glow halo around the box
  };

  const MAX_STRING = 4096;

  function clamp(v, lo, hi) {
    v = Number(v);
    if (!Number.isFinite(v)) return lo;
    return Math.max(lo, Math.min(hi, v));
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  // A complete config object with every default.
  function defaultConfig() {
    const cfg = { activeViz: 'visualizer', mic: { deviceId: '', label: '' } };
    for (const [k, r] of Object.entries(TOP_RANGES)) cfg[k] = r.default;
    for (const [k, v] of Object.entries(TOP_BOOLS)) cfg[k] = v;
    cfg.stlObject = clone(STL_OBJECT_DEFAULTS);
    cfg.placement = {};
    for (const [k, r] of Object.entries(PLACEMENT_RANGES)) cfg.placement[k] = r.default;
    cfg.afterglow = AFTERGLOW_RANGE.default;
    cfg.perViz = clone(DEFAULT_PER_VIZ);
    return cfg;
  }

  // Merge `partial` over `base` (or the defaults), clamping every value to its
  // range and dropping unknown keys. Always returns a complete, valid config.
  // Used by the control panel before every push and defensively by the overlay
  // on every receive — both ends run the exact same code.
  function sanitizeConfig(partial, base) {
    const cfg = base ? clone(base) : defaultConfig();
    if (!partial || typeof partial !== 'object') return cfg;

    for (const [k, r] of Object.entries(TOP_RANGES)) {
      if (partial[k] != null) cfg[k] = clamp(partial[k], r.min, r.max);
    }
    for (const k of Object.keys(TOP_BOOLS)) {
      if (partial[k] != null) cfg[k] = !!partial[k];
    }
    if (typeof partial.activeViz === 'string' && ACTIVE_VIZ_NAMES.includes(partial.activeViz)) {
      cfg.activeViz = partial.activeViz;
    }
    if (partial.mic && typeof partial.mic === 'object') {
      if (typeof partial.mic.deviceId === 'string') cfg.mic.deviceId = partial.mic.deviceId.slice(0, 256);
      if (typeof partial.mic.label === 'string') cfg.mic.label = partial.mic.label.slice(0, 256);
    }
    if (partial.stlObject && typeof partial.stlObject === 'object') {
      for (const [k, v] of Object.entries(partial.stlObject)) {
        const r = STL_OBJECT_RANGES[k];
        if (r && typeof v === 'number') cfg.stlObject[k] = clamp(v, r.min, r.max);
      }
    }
    if (partial.placement && typeof partial.placement === 'object') {
      for (const [k, v] of Object.entries(partial.placement)) {
        const r = PLACEMENT_RANGES[k];
        if (r && typeof v === 'number') cfg.placement[k] = clamp(v, r.min, r.max);
      }
    }
    if (typeof partial.afterglow === 'number') {
      cfg.afterglow = clamp(partial.afterglow, AFTERGLOW_RANGE.min, AFTERGLOW_RANGE.max);
    }
    if (partial.perViz && typeof partial.perViz === 'object') {
      for (const [name, knobs] of Object.entries(partial.perViz)) {
        const target = cfg.perViz[name];
        if (!target || !knobs || typeof knobs !== 'object') continue;
        for (const [k, v] of Object.entries(knobs)) {
          if (!(k in target)) continue;
          if (typeof target[k] === 'number' && typeof v === 'number') {
            target[k] = clamp(v, 0, (PER_VIZ_MAX[name] && PER_VIZ_MAX[name][k]) || 100);
          } else if (typeof target[k] === 'string' && typeof v === 'string') {
            target[k] = v.slice(0, MAX_STRING);
          }
        }
      }
    }
    return cfg;
  }

  globalThis.TIMBRE = {
    ACTIVE_VIZ_NAMES,
    VIZ_USES_3D,
    VIZ_SCENES,
    PLACEMENT_RANGES,
    VIZ_AFTERGLOW,
    AFTERGLOW_RANGE,
    DEFAULT_PER_VIZ,
    PER_VIZ_MAX,
    STL_OBJECT_DEFAULTS,
    STL_OBJECT_RANGES,
    TOP_RANGES,
    TOP_BOOLS,
    MAX_STRING,
    clamp,
    defaultConfig,
    sanitizeConfig,
  };
})();
