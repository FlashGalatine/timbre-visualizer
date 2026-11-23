// Timbre: the Christmas Tree effect, as `globalThis.TimbreTree`.
//
// A fir tree stands on a drift of snow with presents round its foot: six tiers of boughs with
// snow lying on them, a gold star, a string of lights wound round it from under the star to its
// lowest boughs, and a bauble under the tip of every bough. Snow falls all the while.
//
// The star hears the voice and flares, and what it heard runs down the string of lights, so
// that each syllable is a pulse of light winding round the tree. The baubles are a spectrum:
// each tier listens to a part of the sound, low at the foot and high under the star, and its
// baubles light from inside and swing. A thump of the mic rocks the tree, sets the baubles
// swinging, makes the lights flicker and knocks the snow off every bough; after a calm wait
// the snow settles again.
//
// Everything here but `definition()` is arithmetic, so that `verify` can check it under Node.
// Valid as BOTH a classic <script> and an ES module (it only assigns `globalThis.TimbreTree`),
// the same trick as shared/viz-config.js. It follows rose.js closely.

(function () {
  'use strict';

  const BANDS = 8;                          // bands the tree listens to: the eight lowest bins
  // The tiers of boughs, foot to top: how far out each rim reaches, how tall it is, and the height of its base.
  const TIERS = [[1.05, 0.86, 0.50], [0.90, 0.80, 0.90], [0.75, 0.74, 1.27], [0.60, 0.68, 1.61], [0.45, 0.62, 1.92], [0.30, 0.56, 2.20]];
  const LOBES = 7, SCALLOP = 0.14, TURN = 0.45, DROOP = 0.2;   // a rim has seven tips, this much further out than its mean; each tier is turned this far from the one below; a rim hangs this share of the tier's height below its base
  const TIER_GRID = [12, 56];               // a tier's grid: rings from its top to its rim, and points round it
  const SNOW_LIES = [0.73, 0.08, 0.05], SNOW_PROUD = [1.06, 0.035];   // how far down a tier its snow lies, give or take this by its tips and this by thirds; how far it stands out from the boughs and above them
  const TRUNK = [0.085, 0.13, 0.62];        // the trunk: its radius at the top and at the foot, and its height
  const STAR_Y = 2.93, STAR = [0.19, 0.082, 0.06];   // the star: how high it stands; its points, its notches, and how far its middle is raised
  const LIGHTS_MIN = 48, LIGHTS_MAX = 128;  // lights on the string at Light density 0 and at 100
  const STRING = [2.64, 0.37, 0.6], DROP = 0.42;   // the string: the height it starts at and ends at, and the way round it starts; how much lower it is after each turn
  const PROUD = 0.035, LINE = 0.92;         // how far the string stands off the tree, and how near the line from rim to rim it hangs
  const STRING_STEPS = 3600, WIRE_EVERY = 6;   // the string is measured in this many steps, and its wire drawn through every sixth
  const RUN_S = 1.1, HISTORY = 96;          // how long the voice takes to run down the string, in seconds; steps of what the star heard that are remembered
  const BULB_R = 0.026;                     // a light's radius
  const BAUBLES = TIERS.length * LOBES;     // one under every tip
  const BAUBLE_R = [0.072, 0.005], HANG = 0.012, TIP_IN = 0.985, TIP_UP = 0.01;   // a bauble's radius at the lowest tier and how much less for each tier above; its string; where on the tip it hangs
  const HUES = [5, 7];                      // colours along the string, and colours of baubles
  const SEED = 20261225;                    // what the tree is made from
  const STEP = 1 / 60, STEPS_MAX = 6;       // the tree's step, in seconds, and the most taken in one frame
  const RUN = Math.round(RUN_S / STEP);     // steps the voice takes to run down the string

  // The drift the tree stands on, and the presents on it.
  const DRIFT = [2.4, 0.2, 0.95], DRIFT_Z = 0, SINK = 0.03;   // its half width, its height and its half depth; how far in front of the tree its middle is; how far things stand sunk in it
  //                 x      z     w     h     d    turn  paper     ribbon
  const PRESENTS = [[-0.68, 0.62, 0.44, 0.30, 0.36, 0.30, 0xc8232c, 0xf4f1e6], [0.84, 0.60, 0.36, 0.25, 0.32, -0.40, 0x2a5cc0, 0xe9c46a],
    [1.42, 0.34, 0.30, 0.44, 0.30, 0.20, 0xf2efe6, 0xc8232c], [-1.58, 0.30, 0.32, 0.22, 0.42, -0.25, 0xd9a441, 0x8a1c2b], [0.22, 0.72, 0.24, 0.19, 0.24, 0.60, 0x7a3fa0, 0xdfe3ea]];

  // The thump.
  const SPRING = [400, 5], SPRING_STEPS = 4;   // the trunk: how stiff, and how soon it stops; the spring is worked in this many parts of a step
  const ROCK = [1.3, 0.6, 1.6];             // a thump pushes the tree sideways this fast, up to this much more, and up to half this toward or away
  const SWING = [190, 1.3], SWING_STEPS = 2, SWING_MOST = 1.2;   // a bauble on its string: how stiff, how soon it stops; the furthest it swings, in radians
  const SWING_THUMP = [4, 4], SWING_BAND = 5;   // a thump sets a bauble swinging this fast, up to this much more; a rise of 1 in its tier's sound, this fast
  const GLOW_RATE = [18, 4], BALL_GLOW = [0.05, 1.5, 0.5];   // how fast a bauble lights and fades; its inner light: at rest, for its tier's sound, and for a thump
  const SNOW_RATE = [11, 0.55], SNOW_WAIT = 0.05, SNOW_LEAST = 0.15;   // how fast the snow goes and how fast it settles; each tier below the top waits this much longer to go; a tier with less snow than this throws no clumps
  const SNOWING = [55, 55, 40];             // flakes in the air at Snowfall 50: in silence, how many more at the loudest, and how many more after beats
  const FALLING_MAX = 2 * (SNOWING[0] + SNOWING[1] + SNOWING[2]), SPAWN = 2;   // the most there can be; and the most that start in one step
  const CLUMPS_EACH = 18, CLUMPS = CLUMPS_EACH * TIERS.length, FLAKES = FALLING_MAX + CLUMPS;   // clumps a tier throws; flakes and clumps in all
  const FLAKE = [0.012, 0.011], FLAKE_FALL = [0.3, 0.4], FLAKE_SWAY = [0.9, 0.2, 0.7, 0.1];   // a flake's size, and how much more it may be; how fast it falls, and how much faster it may; how fast and how far it sways sideways, and in depth
  const SKY = [2.9, 3.9, 1.0, -1.4, 0.7];   // where a flake starts: this far to either side, at this height and up to this much higher, between these depths
  const SIDE = [2.5, 2.95], ROOF = [3.15, 2.85], LAND = [0.02, 4], FLOOR = 0.1;   // a flake is drawn smaller from here to nothing here, sideways and upward; it has landed this near the snow, and is drawn smaller over the last 1 / this above it; beyond the drift a flake lands this high, above the unseen ground
  const CLUMP = [0.026, 0.03], CLUMP_AT = [0.7, 0.3], CLUMP_OUT = [0.15, 0.6], CLUMP_DOWN = 0.5, CLUMP_UP = 0.03, GRAVITY = 2.8;   // a clump's size; where on its tier it comes from (of the way out, and how much further); how fast it is thrown outward and downward; how far above the boughs it starts; how fast it gathers speed
  const KEEP = [2.2, 0.85];                  // clumps keep over the drift: this far to either side of its middle, and this far before and behind
  const JOSTLE = 0.6, FLASH_S = 0.35;       // how hard a peak shakes the tree while it is bare, beside the thump's 1; how long the flash of a thump lasts

  // The lights and the star.
  const STAR_RATE = [26, 5], STAR_MOST = 1.5;   // how fast the star rises to the voice and falls; the most of the voice it shows, whatever Star glow
  const TWINKLE = [0.20, 0.13], TWINKLE_RATE = [2.2, 4.5];   // a light in silence: its least, and how much more as it twinkles; how fast it twinkles, and how much faster it may
  const VOICE = [1.35, 1.15], BEAT = 0.55;  // how much the voice brightens a light, and how that rises; how much a beat does, at most
  const FLICKER = [0.75, 14, 47, 9];        // while the tree rocks a light dims by up to this share; the flicker is whole at a lean of 1 / this; how fast it flickers; how far apart in time the lights are
  const CORE = [0.7, 4.6, 1.1], HALO = [0.13, 0.5], HALO_SIZE = [0.11, 0.14, 1.6];   // a light's own brightness: at nothing, for its level, and how much white for its level squared; its glow likewise; the glow's size, how much more for its level, and the level it stops growing at
  const STAR_GOLD = [0.9, 4.2, 1.6], STAR_GLOW = [0.55, 0.7, 0.35], STAR_GLOW_A = [0.35, 0.4, 1.4, 0.5];   // the star's own light; its glow's size; its glow's strength: each in silence, for the voice and for a beat or thump
  const STAR_RAYS = [0.7, 1.25, 0.6], STAR_RAYS_A = [0.3, 0.7, 1.5, 0.6], STAR_TURN = [0.45, 0.5, 0.12, 0.31];   // its rays likewise; how far and how fast the star turns from side to side, and its rays
  const STAR_LIGHT = [11, 30, 16], STAR_REACH = 6.5;   // the light it throws: in silence, for the voice, for a beat or thump; and how far it reaches
  const STRING_LIGHT = [1.0, 6, 0.35], STRING_AT = [0, 1.25, 2.3], STRING_REACH = 8;   // the string's light: at nothing, for the lights' mean level, and the least of each colour in it; where it stands, from the tree's foot; how far it reaches
  const BAND_RATE = [20, 5];                // how fast a band is followed, up and down, a second
  const SWAY = 0.14, ORBIT_RATE = 0.13;     // the camera: how far it sways each way at Camera drift 50, in radians, and how fast
  const LINGER = 0.08;                      // how long any light left behind takes to go, in seconds
  const FOV = 30, TILT = 6;                 // the camera: how wide it sees and how far it looks down, in degrees
  const FRAME = { width: 7.0, height: 4.0, center: [0, 1.5, 0] };   // what the camera frames

  // ── The settings and the sound ──────────────────────────────────────────────

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => t * t * (3 - 2 * t);
  const smooth = (a, b, v) => ease(clamp((v - a) / (b - a), 0, 1));
  const numberOr = (v, otherwise) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, 0, 100) : otherwise);
  // Light density (0 to 100) to a number of lights.
  function countFor(density) {
    return Math.round(LIGHTS_MIN + (LIGHTS_MAX - LIGHTS_MIN) * numberOr(density, 60) / 100);
  }
  // Star glow (0 to 100) to how far the voice swings the star: not at all at 0, twice as far at 100.
  function glowFor(starGlow) {
    return numberOr(starGlow, 50) / 50;
  }
  // Snowfall (0 to 100) to a share of the usual snow: none at 0, twice as much at 100.
  function snowFor(snowfall) {
    return numberOr(snowfall, 50) / 50;
  }
  // How loud a band is: its bin of 255, times Gain, at most 1.
  function loudness(bins, band, gain) {
    if (!bins || band >= bins.length) return 0;
    return Math.min(1, (bins[band] / 255) * gain);
  }
  // With the mic off and Idle animation on, the bands swell in turn, from the lowest up.
  function idle(b, t) {
    return Math.max(0, 0.5 * Math.sin(0.5 * t - 0.9 * b) - 0.15);
  }
  // What tier i hears: its own place among the bands, between two of them.
  function levelOf(bands, i) {
    const x = clamp((i + 0.5) * BANDS / TIERS.length - 0.5, 0, BANDS - 1), j = Math.min(BANDS - 2, Math.floor(x));
    return bands[j] + (bands[j + 1] - bands[j]) * (x - j);
  }
  // All but nothing is nothing, so that what dies away comes to rest.
  function settle(v) {
    return Math.abs(v) < 1e-4 ? 0 : v;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ── The tree's shape ────────────────────────────────────────────────────────

  // The height of tier i's rim, and how far out its rim is the way phi round the tree.
  function rimY(i) {
    return TIERS[i][2] - DROOP * TIERS[i][1];
  }
  function rimR(i, phi) {
    return TIERS[i][0] * (1 + SCALLOP * Math.cos(LOBES * (phi + i * TURN)));
  }
  // How far out tier i's boughs are at height y, the way phi round; 0 above its top and below its rim.
  function tierR(i, y, phi) {
    const R = TIERS[i][0], yy = (y - TIERS[i][2]) / TIERS[i][1];
    if (yy >= 1 || yy < -DROOP - 1e-9) return 0;
    const t = Math.min(1, (-1 + Math.sqrt(1 + 4 * DROOP * (1 - yy))) / (2 * DROOP));   // from yy = 1 - t - DROOP t^2
    return R * t * (1 + SCALLOP * t * Math.cos(LOBES * (phi + i * TURN)));
  }
  // How far out the tree reaches at height y, the way phi round: its boughs, or (between one rim
  // and the next) most of the line from rim to rim, along which a string hangs.
  function surfaceR(y, phi) {
    let r = 0, line = 0;
    for (let i = 0; i < TIERS.length; i++) r = Math.max(r, tierR(i, y, phi));
    for (let i = 0; i < TIERS.length - 1; i++) {
      const a = rimY(i), b = rimY(i + 1);
      if (y >= a && y <= b) { const f = (y - a) / (b - a); line = rimR(i, phi) * (1 - f) + rimR(i + 1, phi) * f; }
    }
    return Math.max(r, LINE * line);
  }
  // The string of lights: a spiral down the tree's surface, n lights evenly along it. `at` is
  // where each light is (three numbers each, from the tree's foot), `u` how far along the string
  // it is (0 at the star, 1 at the foot), `wire` the string's own path, and `length` its length.
  function garland(n) {
    const along = new Float64Array(STRING_STEPS + 1), path = new Float32Array((STRING_STEPS + 1) * 3);
    let length = 0;
    for (let s = 0; s <= STRING_STEPS; s++) {
      const y = STRING[0] + (STRING[1] - STRING[0]) * s / STRING_STEPS, phi = 2 * Math.PI * (STRING[0] - y) / DROP + STRING[2], r = surfaceR(y, phi) + PROUD, q = s * 3;
      path[q] = r * Math.cos(phi); path[q + 1] = y; path[q + 2] = r * Math.sin(phi);
      if (s) length += Math.hypot(path[q] - path[q - 3], path[q + 1] - path[q - 2], path[q + 2] - path[q - 1]);
      along[s] = length;
    }
    const at = new Float32Array(n * 3), u = new Float32Array(n);
    for (let j = 0, k = 0; j < n; j++) {
      const want = length * (j + 0.5) / n;
      while (along[k] < want) k++;
      at[j * 3] = path[k * 3]; at[j * 3 + 1] = path[k * 3 + 1]; at[j * 3 + 2] = path[k * 3 + 2];
      u[j] = want / length;
    }
    const points = Math.floor(STRING_STEPS / WIRE_EVERY) + 1, wire = new Float32Array(points * 3);
    for (let p = 0; p < points; p++) for (let k = 0; k < 3; k++) wire[p * 3 + k] = path[p * WIRE_EVERY * 3 + k];
    return { n, at, u, wire, length };
  }
  // The baubles: for each, its tier, the way round the tree it hangs (under a tip), its radius, and which of the seven colours it is.
  function baubleSpots() {
    const tier = new Uint8Array(BAUBLES), phi = new Float32Array(BAUBLES), r = new Float32Array(BAUBLES), hue = new Uint8Array(BAUBLES);
    for (let i = 0; i < TIERS.length; i++) for (let j = 0; j < LOBES; j++) {
      const b = i * LOBES + j;
      tier[b] = i; phi[b] = (2 * Math.PI * j) / LOBES - i * TURN; r[b] = BAUBLE_R[0] - BAUBLE_R[1] * i; hue[b] = (3 * j + 5 * i) % HUES[1];
    }
    return { tier, phi, r, hue };
  }
  // A grid's triangles: rows of `across` points, joined ring to ring.
  function gridIndex(rings, around) {
    const index = new Uint16Array(rings * around * 6);
    let at = 0;
    for (let j = 0; j < rings; j++) for (let i = 0; i < around; i++) {
      const p = j * (around + 1) + i, q = p + around + 1;
      index[at++] = p; index[at++] = p + 1; index[at++] = q; index[at++] = q; index[at++] = p + 1; index[at++] = q + 1;
    }
    return index;
  }
  // One tier in unit size (its top at 1, its base at 0, its rim about 1 out), or with `snow`
  // the snow lying on it: the same skirt, a little proud of the boughs, reaching an uneven way down.
  function tierGrid(snow) {
    const M = TIER_GRID[0], N = TIER_GRID[1], points = new Float32Array((M + 1) * (N + 1) * 3);
    for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) {
      const phi = (i / N) * Math.PI * 2, down = snow ? SNOW_LIES[0] + SNOW_LIES[1] * Math.cos(LOBES * phi + 1.3) + SNOW_LIES[2] * Math.cos(3 * phi) : 1;
      const t = (j / M) * down, r = t * (1 + SCALLOP * t * Math.cos(LOBES * phi)) * (snow ? SNOW_PROUD[0] : 1), q = (j * (N + 1) + i) * 3;
      points[q] = r * Math.cos(phi); points[q + 1] = 1 - t - DROOP * t * t + (snow && j ? SNOW_PROUD[1] : 0); points[q + 2] = r * Math.sin(phi);
    }
    return { points, index: gridIndex(M, N) };
  }
  // How high the drift is at (x, z), measured from its own middle: a low uneven dome, nothing beyond its rim.
  function driftHeight(x, z) {
    const q = 1 - (x / DRIFT[0]) * (x / DRIFT[0]) - (z / DRIFT[2]) * (z / DRIFT[2]);
    return q <= 0 ? 0 : DRIFT[1] * Math.sqrt(q) * (1 + 0.18 * Math.sin(2.1 * x + 0.5) * Math.sin(3.1 * z + 1.0));
  }
  function driftGrid() {
    const M = 26, N = 72, points = new Float32Array((M + 1) * (N + 1) * 3);
    for (let j = 0; j <= M; j++) {
      const r = Math.sin((j / M) * Math.PI / 2);
      for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2, x = DRIFT[0] * r * Math.cos(a), z = DRIFT[2] * r * Math.sin(a), q = (j * (N + 1) + i) * 3; points[q] = x; points[q + 1] = driftHeight(x, z); points[q + 2] = z; }
    }
    return { points, index: gridIndex(M, N) };
  }
  const FOOT = driftHeight(0, -DRIFT_Z) - SINK;   // how high the tree's foot is
  // Where falling snow lands at (x, z): on the drift, or beyond it a little above the unseen ground.
  function snowAt(x, z) {
    return Math.max(driftHeight(x, z - DRIFT_Z), FLOOR);
  }
  // The star: twenty triangles, three points each, with a raised middle front and back.
  function starPoints() {
    const rim = [], out = new Float32Array(20 * 9);
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? STAR[1] : STAR[0]; rim.push([r * Math.cos(a), r * Math.sin(a), 0]); }
    let q = 0;
    const put = (p) => { out[q++] = p[0]; out[q++] = p[1]; out[q++] = p[2]; };
    for (let i = 0; i < 10; i++) {
      const j = (i + 1) % 10;
      put([0, 0, STAR[2]]); put(rim[i]); put(rim[j]);
      put([0, 0, -STAR[2]]); put(rim[j]); put(rim[i]);
    }
    return out;
  }

  // ── The tree's state ────────────────────────────────────────────────────────

  // A tree, made from a seed, with n lights on its string.
  //   hist, histAt: what the star heard at each of its last steps    star: the star's own level
  //   lean: how far the trunk leans sideways and how fast, then toward the viewer and how fast
  //   snow: how much snow lies on each tier (0 to 1)   wait: how long each still waits to lose it   lying: whether snow may lie (1) or is off (0)
  //   level, was: what each tier hears, and heard a step ago
  //   swing, swingV, glow, sign: each bauble's swing, its speed, its inner light, and which way a rise sends it
  //   twinkle: each light's own rate, its place in time, and its share of a beat
  //   flake: every flake and clump (x, y, z, size)   flakeV: a flake's fall speed and its place in the sway; a clump's velocity   on: whether it is in the air
  function createTree(seed, n, snow) {
    const T = TIERS.length;
    const tr = {
      seed, n: 0, string: null, spots: baubleSpots(),
      hist: new Float32Array(HISTORY), histAt: 0, star: 0, time: 0, left: 0, flash: 0,
      lean: new Float32Array(4), snow: new Float32Array(T), wait: new Float32Array(T), going: new Uint8Array(T), lying: 1, level: new Float32Array(T), was: new Float32Array(T),
      swing: new Float32Array(BAUBLES), swingV: new Float32Array(BAUBLES), glow: new Float32Array(BAUBLES), sign: new Float32Array(BAUBLES),
      twinkle: new Float32Array(LIGHTS_MAX * 3),
      flake: new Float32Array(FLAKES * 4), flakeV: new Float32Array(FLAKES * 3), on: new Uint8Array(FLAKES),
      random: null, falling: 0, clumps: 0,
    };
    lay(tr, n, snow);
    return tr;
  }
  // The string laid again for n lights; nothing else is touched.
  function restring(tr, n) {
    tr.n = n;
    tr.string = garland(n);
  }
  // A flake set off from the top of its air.
  function start(tr, i) {
    const q = i * 4, r = tr.random;
    tr.flake[q] = (2 * r() - 1) * SKY[0]; tr.flake[q + 1] = SKY[1] + SKY[2] * r(); tr.flake[q + 2] = SKY[3] + (SKY[4] - SKY[3]) * r();
    tr.on[i] = 1;
  }
  // The tree laid again whole, as it was made: the snow on every tier, nothing moving, the usual snow already in the air.
  function lay(tr, n, snow) {
    const r = rng(tr.seed), first = Math.min(FALLING_MAX, Math.round(SNOWING[0] * (typeof snow === 'number' ? snow : 1)));
    restring(tr, n);
    tr.hist.fill(0); tr.histAt = 0; tr.star = 0; tr.time = 0; tr.left = 0; tr.flash = 0;
    tr.lean.fill(0); tr.snow.fill(1); tr.wait.fill(0); tr.going.fill(0); tr.lying = 1; tr.level.fill(0); tr.was.fill(0);
    tr.swing.fill(0); tr.swingV.fill(0); tr.glow.fill(0);
    for (let b = 0; b < BAUBLES; b++) tr.sign[b] = r() < 0.5 ? -1 : 1;
    for (let j = 0; j < LIGHTS_MAX; j++) { tr.twinkle[j * 3] = TWINKLE_RATE[0] + TWINKLE_RATE[1] * r(); tr.twinkle[j * 3 + 1] = 2 * Math.PI * r(); tr.twinkle[j * 3 + 2] = r(); }
    tr.flake.fill(0); tr.flakeV.fill(0); tr.on.fill(0);
    for (let i = 0; i < FALLING_MAX; i++) { tr.flake[i * 4 + 3] = FLAKE[0] + FLAKE[1] * r(); tr.flakeV[i * 3] = FLAKE_FALL[0] + FLAKE_FALL[1] * r(); tr.flakeV[i * 3 + 1] = 2 * Math.PI * r(); }
    tr.random = rng(tr.seed + 1);
    // The usual snow is in the air already, at every height.
    for (let i = 0; i < first; i++) { start(tr, i); tr.flake[i * 4 + 1] = 0.3 + (SKY[1] - 0.3) * tr.random(); }
    tr.falling = first; tr.clumps = 0;
  }
  // What the star heard `ago` steps ago (between two steps too); the furthest back it can say is the oldest it remembers.
  function heard(tr, ago) {
    const a = clamp(ago, 0, HISTORY - 2), j = Math.floor(a), f = a - j;
    const at = (k) => tr.hist[(tr.histAt - 1 - k + 2 * HISTORY) % HISTORY];
    return at(j) * (1 - f) + at(j + 1) * f;
  }
  // A clump keeps over the drift: one that would fall beyond it drops straight down at its edge.
  function keepOver(tr, c) {
    const q = c * 4, ex = tr.flake[q] / KEEP[0], ez = (tr.flake[q + 2] - DRIFT_Z) / KEEP[1], e = Math.hypot(ex, ez);
    if (e <= 1) return;
    tr.flake[q] /= e; tr.flake[q + 2] = DRIFT_Z + (tr.flake[q + 2] - DRIFT_Z) / e;
    tr.flakeV[c * 3] = 0; tr.flakeV[c * 3 + 2] = 0;
  }
  // A thump (strength 1), or a peak while the tree is bare (JOSTLE): the trunk is pushed, every
  // bauble is set swinging, and each tier with snow on it throws clumps of it, outward and down,
  // as many as it has snow. The snow itself goes a moment later, the top tiers first.
  function shake(tr, strength, random) {
    tr.lean[1] += (random() < 0.5 ? -1 : 1) * (ROCK[0] + ROCK[1] * random()) * strength;
    tr.lean[3] += (random() - 0.5) * ROCK[2] * strength;
    for (let b = 0; b < BAUBLES; b++) tr.swingV[b] += (random() < 0.5 ? -1 : 1) * (SWING_THUMP[0] + SWING_THUMP[1] * random()) * strength;
    for (let i = 0; i < TIERS.length; i++) {
      if (tr.snow[i] < SNOW_LEAST) continue;
      const R = TIERS[i][0], h = TIERS[i][1], base = TIERS[i][2], count = Math.round(CLUMPS_EACH * tr.snow[i]);
      tr.wait[i] = SNOW_WAIT * (TIERS.length - 1 - i);
      tr.going[i] = 1;
      for (let k = 0, thrown = 0; k < CLUMPS_EACH && thrown < count; k++) {
        const c = FALLING_MAX + i * CLUMPS_EACH + k;
        if (tr.on[c]) continue;   // one still in the air from the last shake is left where it is
        thrown++;
        const q = c * 4, phi = 2 * Math.PI * random(), t = CLUMP_AT[0] + CLUMP_AT[1] * random(), out = CLUMP_OUT[0] + CLUMP_OUT[1] * random();
        tr.flake[q] = R * t * Math.cos(phi); tr.flake[q + 1] = FOOT + base + h * (1 - t - DROOP * t * t) + CLUMP_UP; tr.flake[q + 2] = R * t * Math.sin(phi);
        tr.flake[q + 3] = CLUMP[0] + CLUMP[1] * random();
        tr.flakeV[c * 3] = out * Math.cos(phi); tr.flakeV[c * 3 + 1] = -CLUMP_DOWN * random(); tr.flakeV[c * 3 + 2] = out * Math.sin(phi);
        tr.on[c] = 1;
        keepOver(tr, c);
      }
    }
    tr.lying = 0;
    tr.flash = Math.max(tr.flash, strength);
  }
  // The calm wait is over: the snow may settle on the boughs again.
  function resettle(tr) {
    tr.lying = 1;
  }
  // One step. `how`: flame (the voice), kick (a beat), burst (beats lately), bands (the eight
  // bands, followed), snow (Snowfall's share).
  function stepTree(tr, how) {
    const T = TIERS.length, flame = how.flame;
    tr.time += STEP;
    // What the star hears, and the star itself.
    tr.hist[tr.histAt] = flame; tr.histAt = (tr.histAt + 1) % HISTORY;
    tr.star += (flame - tr.star) * (1 - Math.exp(-(flame > tr.star ? STAR_RATE[0] : STAR_RATE[1]) * STEP));
    if (flame === 0) tr.star = settle(tr.star);
    tr.flash = settle(tr.flash * Math.exp(-STEP / FLASH_S));
    // The trunk is a spring: it rocks and comes to rest.
    const le = tr.lean, hs = STEP / SPRING_STEPS;
    for (let s = 0; s < SPRING_STEPS; s++) {
      le[1] += (-SPRING[0] * le[0] - SPRING[1] * le[1]) * hs; le[0] += le[1] * hs;
      le[3] += (-SPRING[0] * le[2] - SPRING[1] * le[3]) * hs; le[2] += le[3] * hs;
    }
    if (Math.abs(le[0]) < 1e-5 && Math.abs(le[1]) < 1e-4) { le[0] = 0; le[1] = 0; }
    if (Math.abs(le[2]) < 1e-5 && Math.abs(le[3]) < 1e-4) { le[2] = 0; le[3] = 0; }
    // The snow on each tier: off after its wait, or settling.
    for (let i = 0; i < T; i++) {
      tr.wait[i] -= STEP;
      if (tr.wait[i] <= 0) {
        // Snow that a shake set going goes on going until it is gone, whatever is said meanwhile; only then may it settle.
        const to = tr.going[i] ? 0 : tr.lying;
        let a = tr.snow[i];
        a += (to - a) * (1 - Math.exp(-(to ? SNOW_RATE[1] : SNOW_RATE[0]) * STEP));
        tr.snow[i] = Math.abs(a - to) < 1e-3 ? to : a;
        if (tr.snow[i] === 0) tr.going[i] = 0;
      }
      tr.was[i] = tr.level[i]; tr.level[i] = levelOf(how.bands, i);
    }
    // The baubles: lit by their tier, and set swinging by a rise in it.
    const hb = STEP / SWING_STEPS;
    for (let b = 0; b < BAUBLES; b++) {
      const i = tr.spots.tier[b], lv = tr.level[i];
      let g = tr.glow[b];
      g += (lv - g) * (1 - Math.exp(-(lv > g ? GLOW_RATE[0] : GLOW_RATE[1]) * STEP));
      tr.glow[b] = lv === 0 ? settle(g) : g;
      let a = tr.swing[b], v = tr.swingV[b] + SWING_BAND * Math.max(0, lv - tr.was[i]) * tr.sign[b];
      for (let s = 0; s < SWING_STEPS; s++) { v += (-SWING[0] * a - SWING[1] * v) * hb; a += v * hb; }
      if (a > SWING_MOST) { a = SWING_MOST; v = 0; } else if (a < -SWING_MOST) { a = -SWING_MOST; v = 0; }
      if (Math.abs(a) < 1e-4 && Math.abs(v) < 1e-3) { a = 0; v = 0; }
      tr.swing[b] = a; tr.swingV[b] = v;
    }
    // The snow in the air. A flake that lands starts again at the top while there should be as
    // many; when there should be more, two at most start in a step.
    const target = Math.min(FALLING_MAX, Math.round((SNOWING[0] + SNOWING[1] * flame + SNOWING[2] * how.burst) * how.snow));
    let falling = 0, started = 0;
    for (let i = 0; i < FALLING_MAX; i++) {
      const q = i * 4;
      if (tr.on[i]) {
        const sway = tr.flakeV[i * 3 + 1];
        tr.flake[q + 1] -= tr.flakeV[i * 3] * STEP;
        tr.flake[q] += Math.sin(FLAKE_SWAY[0] * tr.time + sway) * FLAKE_SWAY[1] * STEP;
        tr.flake[q + 2] += Math.cos(FLAKE_SWAY[2] * tr.time + sway) * FLAKE_SWAY[3] * STEP;
        if (tr.flake[q + 1] - snowAt(tr.flake[q], tr.flake[q + 2]) < LAND[0]) { if (i < target) start(tr, i); else tr.on[i] = 0; }
      } else if (i < target && started < SPAWN) { start(tr, i); started++; }
      falling += tr.on[i];
    }
    tr.falling = falling;
    // The clumps fall, faster and faster, and end at the snow.
    let clumps = 0;
    for (let c = FALLING_MAX; c < FLAKES; c++) {
      if (!tr.on[c]) continue;
      const q = c * 4, w = c * 3;
      tr.flakeV[w + 1] -= GRAVITY * STEP;
      tr.flake[q] += tr.flakeV[w] * STEP; tr.flake[q + 1] += tr.flakeV[w + 1] * STEP; tr.flake[q + 2] += tr.flakeV[w + 2] * STEP;
      keepOver(tr, c);
      if (tr.flake[q + 1] - driftHeight(tr.flake[q], tr.flake[q + 2] - DRIFT_Z) < LAND[0]) tr.on[c] = 0; else clumps++;
    }
    tr.clumps = clumps;
  }
  // Take the steps that are due after `dt` seconds: a step once half of it is due, six at most
  // (what is left of a longer frame is let go). Returns how many were taken.
  function advance(tr, dt, how) {
    tr.left += dt;
    let steps = 0;
    while (tr.left >= STEP / 2 && steps < STEPS_MAX) { stepTree(tr, how); tr.left -= STEP; steps++; }
    if (tr.left >= STEP / 2) tr.left = 0;
    return steps;
  }

  // ── What is drawn ───────────────────────────────────────────────────────────

  // Everything that changes, into `out`:
  //   bright: each light's level    bulb, halo: its colour and its glow's (three each)    haloSize: its glow's size
  //   ball, ballCol: each bauble's place (from the tree's foot) and colour    ballHow: its radius and its inner light
  //   cap: for each tier, the height its snow's base is drawn at, and how much of it there is
  //   flake: every flake and clump (x, y, z, size as drawn)
  //   star: its own light, its glow's size and strength, its rays' size and strength, how far it and its rays are turned, and the light it throws
  //   string: the string's light (its colour, and how strong)
  //   lean: how far the trunk leans, sideways and toward the viewer
  // What moves (the lean, the baubles, the flakes and the clumps) is drawn as far on as the tree is ahead of or behind its steps (`left`).
  // `look`: pal (the string's five colours, three numbers each), balls (the baubles' seven), kick (a beat), glow (Star glow's share).
  function dress(out, tr, look) {
    const n = tr.n, left = tr.left, flick = Math.min(1, FLICKER[1] * Math.hypot(tr.lean[0], tr.lean[2]));
    out.lean[0] = tr.lean[0] + tr.lean[1] * left; out.lean[1] = tr.lean[2] + tr.lean[3] * left;
    let mr = 0, mg = 0, mb = 0, mean = 0;
    for (let j = 0; j < n; j++) {
      const w = j * 3, rate = tr.twinkle[w], place = tr.twinkle[w + 1], k = (j % HUES[0]) * 3, cr = look.pal[k], cg = look.pal[k + 1], cb = look.pal[k + 2];
      let b = TWINKLE[0] + TWINKLE[1] * (0.5 + 0.5 * Math.sin(tr.time * rate + place)) + VOICE[0] * Math.pow(heard(tr, tr.string.u[j] * RUN), VOICE[1]) + BEAT * look.kick * tr.twinkle[w + 2];
      b *= 1 - FLICKER[0] * flick * (0.5 + 0.5 * Math.sin(FLICKER[2] * tr.time + FLICKER[3] * place));
      const core = CORE[0] + CORE[1] * b, white = CORE[2] * b * b, glow = HALO[0] + HALO[1] * b;
      out.bright[j] = b;
      out.bulb[w] = cr * core + white; out.bulb[w + 1] = cg * core + white; out.bulb[w + 2] = cb * core + white;
      out.halo[w] = cr * glow; out.halo[w + 1] = cg * glow; out.halo[w + 2] = cb * glow;
      out.haloSize[j] = HALO_SIZE[0] + HALO_SIZE[1] * Math.min(b, HALO_SIZE[2]);
      mr += cr * b; mg += cg * b; mb += cb * b; mean += b / n;
    }
    const top = Math.max(mr, mg, mb, 1e-6), least = STRING_LIGHT[2];
    out.string[0] = least + (1 - least) * mr / top; out.string[1] = least + (1 - least) * mg / top; out.string[2] = least + (1 - least) * mb / top;
    out.string[3] = STRING_LIGHT[0] + STRING_LIGHT[1] * mean;

    const sp = tr.spots;
    for (let b = 0; b < BAUBLES; b++) {
      const i = sp.tier[b], phi = sp.phi[b], len = HANG + sp.r[b], a = tr.swing[b] + tr.swingV[b] * left, r = rimR(i, phi) * TIP_IN + len * Math.sin(a), q = b * 3, k = sp.hue[b] * 3;
      out.ball[q] = r * Math.cos(phi); out.ball[q + 1] = rimY(i) + TIP_UP - len * Math.cos(a); out.ball[q + 2] = r * Math.sin(phi);
      out.ballCol[q] = look.balls[k]; out.ballCol[q + 1] = look.balls[k + 1]; out.ballCol[q + 2] = look.balls[k + 2];
      out.ballHow[b * 2] = sp.r[b]; out.ballHow[b * 2 + 1] = BALL_GLOW[0] + BALL_GLOW[1] * tr.glow[b] + BALL_GLOW[2] * tr.flash;
    }
    for (let i = 0; i < TIERS.length; i++) { out.cap[i * 2] = TIERS[i][2] + TIERS[i][1] * (1 - tr.snow[i]); out.cap[i * 2 + 1] = tr.snow[i]; }

    for (let i = 0; i < FLAKES; i++) {
      const q = i * 4, w = i * 3, fall = i < FALLING_MAX;
      const x = tr.flake[q] + (fall ? 0 : tr.flakeV[w] * left), y = tr.flake[q + 1] + (fall ? -tr.flakeV[w] : tr.flakeV[w + 1]) * left, z = tr.flake[q + 2] + (fall ? 0 : tr.flakeV[w + 2] * left);
      let size = 0;
      if (tr.on[i]) {
        if (i < FALLING_MAX) size = tr.flake[q + 3] * clamp((y - snowAt(x, z)) * LAND[1], 0, 1) * (1 - smooth(SIDE[0], SIDE[1], Math.abs(x))) * (1 - smooth(ROOF[1], ROOF[0], y));
        else size = tr.flake[q + 3] * clamp((y - driftHeight(x, z - DRIFT_Z)) * LAND[1], 0, 1);
      }
      out.flake[q] = x; out.flake[q + 1] = y; out.flake[q + 2] = z; out.flake[q + 3] = size;
    }

    const v = Math.min(STAR_MOST, tr.star * look.glow), burst = (look.kick + tr.flash) * Math.min(1, look.glow);
    out.star[0] = STAR_GOLD[0] + STAR_GOLD[1] * v + STAR_GOLD[2] * burst;
    out.star[1] = STAR_GLOW[0] + STAR_GLOW[1] * v + STAR_GLOW[2] * burst;
    out.star[2] = STAR_GLOW_A[0] + STAR_GLOW_A[1] * Math.min(1, STAR_GLOW_A[2] * v + STAR_GLOW_A[3] * burst);
    out.star[3] = STAR_RAYS[0] + STAR_RAYS[1] * v + STAR_RAYS[2] * burst;
    out.star[4] = STAR_RAYS_A[0] + STAR_RAYS_A[1] * Math.min(1, STAR_RAYS_A[2] * v + STAR_RAYS_A[3] * burst);
    out.star[5] = STAR_TURN[0] * Math.sin(STAR_TURN[1] * tr.time);
    out.star[6] = STAR_TURN[2] * Math.sin(STAR_TURN[3] * tr.time);
    out.star[7] = STAR_LIGHT[0] + STAR_LIGHT[1] * v + STAR_LIGHT[2] * burst;
  }

  // ── The camera ──────────────────────────────────────────────────────────────

  // How far the camera sways each way, in radians, for a Camera drift of 0 to 100.
  function swayFor(drift) {
    return SWAY * numberOr(drift, 50) / 50;
  }
  function orbitAt(t, drift) {
    return swayFor(drift) * Math.sin(ORBIT_RATE * t);
  }

  // ── The shaders ─────────────────────────────────────────────────────────────

  const SUN = 'const vec3 L1 = vec3(0.3293, 0.7526, 0.5704), L2 = vec3(-0.7926, 0.1321, 0.5945);';
  // A light of the string: a small ball that glows, brightest where it faces the eye.
  const BULB_VERT = `
    attribute vec3 iPos, iCol;
    uniform float uR;
    varying vec3 vCol, vN, vV;
    void main() {
      vec4 w = modelMatrix * vec4(iPos + position * uR, 1.0);
      vCol = iCol; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const BULB_FRAG = `
    precision highp float;
    varying vec3 vCol, vN, vV;
    void main() { gl_FragColor = vec4(vCol * (0.5 + 0.5 * max(dot(normalize(vN), normalize(vV)), 0.0)), 1.0); }`;
  // Its glow: a soft disc of added light that faces the eye, a little in front of the light.
  const HALO_VERT = `
    attribute vec3 iPos, iCol;
    attribute float iSize;
    varying vec2 vUv; varying vec3 vCol;
    void main() {
      vec4 mv = viewMatrix * modelMatrix * vec4(iPos, 1.0);
      mv.xyz += normalize(-mv.xyz) * 0.10;
      mv.xy += position.xy * iSize;
      vUv = position.xy * 2.0; vCol = iCol;
      gl_Position = projectionMatrix * mv;
    }`;
  const HALO_FRAG = `
    precision highp float;
    varying vec2 vUv; varying vec3 vCol;
    void main() { float d = length(vUv); gl_FragColor = vec4(vCol * exp(-d * d * 4.5) * smoothstep(1.0, 0.55, d), 1.0); }`;
  // A bauble: a glass ball, shiny, lit from inside when its tier sounds.
  const BAUBLE_VERT = `
    attribute vec3 iPos, iCol;
    attribute vec2 iHow;     // its radius, its inner light
    varying vec3 vCol, vN, vV; varying float vGlow;
    void main() {
      vec4 w = modelMatrix * vec4(iPos + position * iHow.x, 1.0);
      vCol = iCol; vGlow = iHow.y; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const BAUBLE_FRAG = `
    precision highp float;
    ${SUN}
    varying vec3 vCol, vN, vV; varying float vGlow;
    void main() {
      vec3 n = normalize(vN), v = normalize(vV);
      float d1 = max(dot(n, L1), 0.0), d2 = max(dot(n, L2), 0.0), face = max(dot(n, v), 0.0);
      float spec = pow(max(dot(n, normalize(L1 + v)), 0.0), 70.0), spec2 = pow(max(dot(n, normalize(L2 + v)), 0.0), 40.0);
      vec3 c = vCol * (0.16 + 0.62 * d1 + 0.30 * d2) + vec3(1.0) * (0.95 * spec + 0.35 * spec2) + mix(vCol, vec3(1.0), 0.3) * 0.35 * pow(1.0 - face, 2.5);
      c += mix(vCol, vec3(1.0), 0.25) * vGlow * (0.5 + 2.2 * face * face);
      gl_FragColor = vec4(c, 1.0);
    }`;
  // A flake of snow, or a clump: a small ball, white, a little brighter above.
  const FLAKE_VERT = `
    attribute vec4 iAt;      // where it is, and its size
    varying vec3 vN;
    void main() {
      vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(iAt.xyz + position * iAt.w, 1.0);
    }`;
  const FLAKE_FRAG = `
    precision highp float;
    varying vec3 vN;
    void main() { gl_FragColor = vec4(vec3(1.25, 1.35, 1.55) * (0.8 + 0.2 * normalize(vN).y), 1.0); }`;

  // ── The scene ───────────────────────────────────────────────────────────────

  // The star's rays: a canvas of eight thin rays, the four upright and level ones longer.
  function rayCanvas() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.translate(128, 128);
    for (let i = 0; i < 8; i++) {
      const long = i % 2 === 0, L = long ? 126 : 58, w = long ? 4.5 : 3;
      x.save(); x.rotate(i * Math.PI / 4);
      const g = x.createLinearGradient(0, 0, L, 0);
      g.addColorStop(0, 'rgba(255,236,190,0.95)'); g.addColorStop(0.5, 'rgba(255,226,170,0.28)'); g.addColorStop(1, 'rgba(255,226,170,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(0, -w); x.lineTo(L, 0); x.lineTo(0, w); x.closePath(); x.fill();
      x.restore();
    }
    return c;
  }

  function definition() {
    const ID = 'christmas-tree';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name, otherwise = 50) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : otherwise;
    };
    const T = TIERS.length;
    const bands = new Float32Array(BANDS), tree = createTree(SEED, countFor(60));
    const sent = {
      bright: new Float32Array(LIGHTS_MAX), bulb: new Float32Array(LIGHTS_MAX * 3), halo: new Float32Array(LIGHTS_MAX * 3), haloSize: new Float32Array(LIGHTS_MAX),
      ball: new Float32Array(BAUBLES * 3), ballCol: new Float32Array(BAUBLES * 3), ballHow: new Float32Array(BAUBLES * 2), cap: new Float32Array(T * 2), flake: new Float32Array(FLAKES * 4),
      star: new Float32Array(8), string: new Float32Array(4), lean: new Float32Array(2),
    };
    const lightAt = new Float32Array(LIGHTS_MAX * 3);
    // The shatter machine counts its own pieces; these stand in for the snow, which falls in 3D here.
    const stubs = Array.from({ length: 4 }, () => ({ cx: 500, cy: 500 }));
    const how = { flame: 0, kick: 0, burst: 0, bands, snow: 1 };
    const look = { pal: new Float32Array(HUES[0] * 3), balls: new Float32Array(HUES[1] * 3), kick: 0, glow: 1 };
    let THREE = null, HX = null, machine = null, random = null, camera = null, tmp = null;
    let group = null, land = null, caps = [], wire = null, bulbs = null, halos = null, baubles = null, flakes = null, star = null, starGlow = null, starRays = null, starLight = null, stringLight = null;
    let uploads = [], places = [];
    // What the checks read. clock: seconds the scene has been live. lights: how many are on the
    // string. steps: steps taken this frame. phase: the thump's (whole, pieces or returning).
    const s = { flame: 0, kick: 0, burst: 0, clock: 0, live: false, orbit: 0, colorT: 0, lights: 0, steps: 0, stepped: 0, snow: 1, lean: 0, falling: 0, clumps: 0, star: 0, string: 0,
      phase: 'whole', thumps: 0, jostles: 0, settles: 0, strung: 0 };

    // The string's lights are where the string is: sent when it is laid.
    function strung() {
      lightAt.set(tree.string.at);
      for (const at of places) at.needsUpdate = true;
      bulbs.geometry.instanceCount = tree.n; halos.geometry.instanceCount = tree.n;
      s.lights = tree.n; s.strung++;
    }

    function build(k) {
      THREE = k.THREE;
      camera = k.camera;
      HX = TimbreHelix;
      machine = HX.createShatter({ random: HX.rng(7) });
      random = rng(7);
      tmp = new THREE.Color();
      lay(tree, countFor(knob('lightDensity', 60)), snowFor(knob('snowfall')));
      const scene = k.scene;
      const std = (hex, roughness, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness, metalness: 0 }, extra));
      const solid = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
      const grid = (g) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(g.points, 3)); geo.setIndex(new THREE.BufferAttribute(g.index, 1)); geo.computeVertexNormals(); return geo; };
      const snowMat = std(0xf1f5ff, 0.85);

      // Moonlight from behind and a weak fill from the front keep the solids readable over a dark game.
      const rim = new THREE.DirectionalLight(0xa9c0ff, 1.4);
      rim.position.set(-4, 5, -6);
      const fill = new THREE.DirectionalLight(0xcfe0ff, 0.75);
      fill.position.set(2, 3, 6);
      scene.add(rim, fill, new THREE.AmbientLight(0x4a5c7c, 1.0));

      // The drift, and the presents on it.
      land = new THREE.Group();
      land.position.z = DRIFT_Z;
      scene.add(land);
      solid(land, grid(driftGrid()), snowMat, 0, 0, 0).castShadow = false;
      const ball = new THREE.SphereGeometry(1, 14, 10);
      for (const [x, z, w, h, d, turn, paper, ribbon] of PRESENTS) {
        const g = new THREE.Group();
        g.position.set(x, driftHeight(x, z - DRIFT_Z) - SINK, z - DRIFT_Z);
        g.rotation.y = turn;
        land.add(g);
        const rb = std(ribbon, 0.5);
        solid(g, new THREE.BoxGeometry(w, h, d), std(paper, 0.6), 0, h / 2, 0);
        solid(g, new THREE.BoxGeometry(w * 0.16, h + 0.012, d + 0.012), rb, 0, h / 2, 0);
        solid(g, new THREE.BoxGeometry(w + 0.012, h + 0.012, d * 0.16), rb, 0, h / 2, 0);
        for (const sd of [-1, 1]) { const loop = solid(g, ball, rb, sd * w * 0.13, h + 0.035, 0); loop.scale.set(w * 0.13, 0.04, d * 0.10); loop.rotation.z = sd * 0.5; }
        solid(g, ball, rb, 0, h + 0.03, 0).scale.setScalar(0.028);
      }

      // The tree: everything on it rocks with it.
      group = new THREE.Group();
      group.position.set(0, FOOT, 0);
      scene.add(group);
      solid(group, new THREE.CylinderGeometry(TRUNK[0], TRUNK[1], TRUNK[2], 10), std(0x4a3222, 0.9), 0, TRUNK[2] / 2, 0);
      const boughGeo = grid(tierGrid(false)), capGeo = grid(tierGrid(true));
      const boughMat = std(0x1c5236, 0.9, { side: THREE.DoubleSide }), capMat = std(0xf1f5ff, 0.85, { side: THREE.DoubleSide });
      TIERS.forEach(([R, h, base], i) => {
        const b = solid(group, boughGeo, boughMat, 0, base, 0);
        b.scale.set(R, h, R); b.rotation.y = i * TURN;
        const c = solid(group, capGeo, capMat, 0, base, 0);
        c.rotation.y = i * TURN;
        caps.push(c);
      });
      // The string's wire is the same wire however many lights are on it.
      const pts = [];
      for (let p = 0; p < tree.string.wire.length; p += 3) pts.push(new THREE.Vector3(tree.string.wire[p], tree.string.wire[p + 1], tree.string.wire[p + 2]));
      wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 1200, 0.006, 5), std(0x0d2a1a, 0.8));
      wire.receiveShadow = true;
      group.add(wire);

      // What is drawn many times over: one small shape, and what is sent for each.
      const each = (geo, name, array, n, list) => { const at = new THREE.InstancedBufferAttribute(array, n).setUsage(THREE.DynamicDrawUsage); geo.setAttribute(name, at); list.push(at); };
      const many = (shape, vertexShader, fragmentShader, extra) => {
        const geo = new THREE.InstancedBufferGeometry();
        geo.setAttribute('position', shape.attributes.position); geo.setIndex(shape.index);
        if (shape.attributes.normal) geo.setAttribute('normal', shape.attributes.normal);
        const m = new THREE.Mesh(geo, new THREE.ShaderMaterial(Object.assign({ vertexShader, fragmentShader }, extra)));
        m.frustumCulled = false;
        return m;
      };
      bulbs = many(ball, BULB_VERT, BULB_FRAG, { uniforms: { uR: { value: BULB_R } } });
      each(bulbs.geometry, 'iPos', lightAt, 3, places); each(bulbs.geometry, 'iCol', sent.bulb, 3, uploads);
      group.add(bulbs);
      halos = many(new THREE.PlaneGeometry(1, 1), HALO_VERT, HALO_FRAG);
      k.addLight(halos.material);
      halos.renderOrder = 5;
      each(halos.geometry, 'iPos', lightAt, 3, places); each(halos.geometry, 'iCol', sent.halo, 3, uploads); each(halos.geometry, 'iSize', sent.haloSize, 1, uploads);
      group.add(halos);
      baubles = many(ball, BAUBLE_VERT, BAUBLE_FRAG);
      each(baubles.geometry, 'iPos', sent.ball, 3, uploads); each(baubles.geometry, 'iCol', sent.ballCol, 3, uploads); each(baubles.geometry, 'iHow', sent.ballHow, 2, uploads);
      baubles.geometry.instanceCount = BAUBLES;
      group.add(baubles);
      flakes = many(new THREE.SphereGeometry(1, 6, 4), FLAKE_VERT, FLAKE_FRAG);
      each(flakes.geometry, 'iAt', sent.flake, 4, uploads);
      flakes.geometry.instanceCount = FLAKES;
      scene.add(flakes);

      // The star: gold, with a glow and rays of added light, and the light it throws on the snow.
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPoints(), 3));
      starGeo.computeVertexNormals();
      star = new THREE.Mesh(starGeo, std(0xffd060, 0.35, { emissive: 0xffa820, emissiveIntensity: STAR_GOLD[0], metalness: 0.2 }));
      star.position.set(0, STAR_Y, 0);
      group.add(star);
      starGlow = new THREE.Sprite(k.addLight(new THREE.SpriteMaterial({ map: k.glowTexture(255, 208, 120), depthTest: false })));
      starGlow.position.set(0, STAR_Y, 0); starGlow.renderOrder = 10;
      group.add(starGlow);
      const rays = k.keep(new THREE.CanvasTexture(rayCanvas()));
      rays.colorSpace = THREE.SRGBColorSpace;
      starRays = new THREE.Sprite(k.addLight(new THREE.SpriteMaterial({ map: rays, depthTest: false })));
      starRays.position.set(0, STAR_Y, 0); starRays.renderOrder = 11;
      group.add(starRays);
      starLight = k.practical(new THREE.PointLight(0xffd9a0, STAR_LIGHT[0], STAR_REACH, 2));
      starLight.position.set(0, STAR_Y, 0);
      starLight.castShadow = true;
      starLight.shadow.mapSize.set(1024, 1024);
      starLight.shadow.camera.near = 0.08; starLight.shadow.camera.far = STAR_REACH + 0.5;
      starLight.shadow.bias = -0.004; starLight.shadow.normalBias = 0.03;
      group.add(starLight);
      // The string's light, as one light in front of the tree.
      stringLight = k.practical(new THREE.PointLight(0xffffff, STRING_LIGHT[0], STRING_REACH, 2));
      stringLight.position.set(STRING_AT[0], FOOT + STRING_AT[1], STRING_AT[2]);
      scene.add(stringLight);

      strung();
      colours(0);
      show();
    }

    // The palette colour at t, as the shaders want it (linear), into three numbers of `into` from `at`.
    function palette(into, at, t) {
      const p = getColor(t);
      tmp.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
      into[at] = tmp.r; into[at + 1] = tmp.g; into[at + 2] = tmp.b;
    }
    // The string's five colours and the baubles' seven, evenly round the palette from colorT.
    function colours(colorT) {
      for (let i = 0; i < HUES[0]; i++) palette(look.pal, i * 3, colorT + i * (PALETTE.length / HUES[0]));
      for (let i = 0; i < HUES[1]; i++) palette(look.balls, i * 3, colorT + (i + 0.5) * (PALETTE.length / HUES[1]));
    }
    // The tree is dressed, and what was worked out is put on the scene.
    function show() {
      dress(sent, tree, look);
      for (const at of uploads) at.needsUpdate = true;
      group.rotation.set(sent.lean[1], 0, sent.lean[0]);
      for (let i = 0; i < T; i++) {
        const a = sent.cap[i * 2 + 1], c = caps[i];
        c.visible = a > 0.02;
        c.position.y = sent.cap[i * 2]; c.scale.set(TIERS[i][0] * a, TIERS[i][1] * a, TIERS[i][0] * a);
      }
      const st = sent.star;
      star.material.emissiveIntensity = st[0]; star.rotation.y = st[5];
      starGlow.scale.setScalar(st[1]); starGlow.material.opacity = st[2];
      starRays.scale.setScalar(st[3]); starRays.material.opacity = st[4]; starRays.material.rotation = st[6];
      starLight.intensity = st[7];
      stringLight.color.setRGB(sent.string[0], sent.string[1], sent.string[2]);
      stringLight.intensity = sent.string[3];
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = orbitAt(t, knob('cameraDrift'));

      // With the mic and Idle animation both off, the tree stops as it is and the snow hangs in the air.
      s.live = !!(micActive || cfgIdleAnim);
      if (s.live) s.clock += dt;
      // The voice is the mic's; with the mic off and Idle animation on, the kit's slow swell stands in for it. A beat is the mic's alone.
      const flame = s.flame = settle(audio.flame);
      s.kick = settle(micActive ? audio.kick : 0);
      const n = countFor(knob('lightDensity', 60));
      if (n !== tree.n) { restring(tree, n); strung(); }   // Light density changed: the string is laid again

      // Each band is followed: quick up, slower down.
      for (let b = 0; b < BANDS; b++) {
        let v = 0;
        if (micActive) v = loudness(slices, b, cfgGain);
        else if (cfgIdleAnim) v = idle(b, s.clock);
        bands[b] = follow(bands[b], v, v > bands[b] ? BAND_RATE[0] : BAND_RATE[1], dt);
        if (v === 0) bands[b] = settle(bands[b]);
      }

      // The thump. The machine says when: a hard peak with the mic on shakes the tree, a peak
      // while it is bare shakes it again, and after a calm wait the snow may settle. The peak is
      // the raw input level, before Gain, as DNA hears it. With nothing live no time passes for it.
      const event = machine.step({
        now, dt: s.live ? dt : 0, live: !!micActive,
        peak: typeof micPeak === 'number' ? micPeak : HX.peakOf(typeof waveform === 'undefined' ? null : waveform),
        threshold: HX.threshold(knob('shakeSensitivity')), reconnectS: knob('resettleSeconds', 3),
        W: 1000, H: 1000, scale: 1, cut: () => stubs,
      });
      if (event === 'shatter') {
        random = rng(1000 + ++s.thumps);   // each thump its own, and the same again another day
        shake(tree, 1, random);
      } else if (event === 'jostle') {
        s.jostles++;
        shake(tree, JOSTLE, random);
      } else if (event === 'return') {
        s.settles++;
        resettle(tree);
      } else if (event === 'reset') {   // the page had stopped drawing: the tree is as it was made
        lay(tree, n, snowFor(knob('snowfall')));
      }
      s.phase = machine.state;

      // The tree is stepped, and dressed.
      how.flame = flame; how.kick = s.kick; how.burst = s.burst = settle(micActive ? audio.burst : 0); how.snow = snowFor(knob('snowfall'));
      s.steps = s.live ? advance(tree, dt, how) : 0;
      s.stepped += s.steps;
      // The colours: the string's five and the baubles' seven, from round the palette (they move only as the palette's own Colour speed moves them).
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      colours(colorT);
      look.kick = s.kick; look.glow = glowFor(knob('starGlow'));
      show();
      let snow = 0;
      for (let i = 0; i < T; i++) snow += tree.snow[i];
      let mean = 0;
      for (let j = 0; j < tree.n; j++) mean += sent.bright[j] / tree.n;
      s.snow = snow / T; s.lean = Math.hypot(tree.lean[0], tree.lean[2]); s.falling = tree.falling; s.clumps = tree.clumps; s.star = tree.star; s.string = mean;
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: TILT,
      groundColor: 0xdfe8f6,
      cooling: [LINGER, LINGER, LINGER],
      build,
      update,
      debug() {
        if (!bulbs) return Object.assign({}, s);
        const solid = (m) => m.transparent === false && m.depthTest === true && m.depthWrite === true && m.blending === THREE.NormalBlending;
        const d = Object.assign({
          bands: Array.from(bands), time: tree.time, left: tree.left, flash: tree.flash, lying: tree.lying, look: { kick: look.kick, glow: look.glow, pal: Array.from(look.pal), balls: Array.from(look.balls) },
          snowOf: Array.from(tree.snow), leanOf: Array.from(tree.lean), levels: Array.from(tree.level),
          drawn: { lights: bulbs.geometry.instanceCount, glows: halos.geometry.instanceCount, baubles: baubles.geometry.instanceCount, flakes: flakes.geometry.instanceCount, caps: caps.filter((c) => c.visible).length },
          solid: solid(bulbs.material) && solid(baubles.material) && solid(flakes.material), glowAdds: halos.material.transparent === true && halos.material.depthWrite === false && halos.material.blending === THREE.CustomBlending,
          neverCulled: bulbs.frustumCulled === false && halos.frustumCulled === false && baubles.frustumCulled === false && flakes.frustumCulled === false,
          lights3: { star: starLight.intensity, starShadow: starLight.castShadow, string: stringLight.intensity, stringColor: stringLight.color.toArray() },
          starLook: { gold: star.material.emissiveIntensity, glow: starGlow.scale.x, glowA: starGlow.material.opacity, rays: starRays.scale.x, raysA: starRays.material.opacity },
          tilt: [group.rotation.x, group.rotation.z], foot: group.position.toArray(),
          palRGB: Array.from({ length: HUES[0] }, (v, i) => getColor(s.colorT + i * (PALETTE.length / HUES[0])).slice(0, 3)), ballsRGB: Array.from({ length: HUES[1] }, (v, i) => getColor(s.colorT + (i + 0.5) * (PALETTE.length / HUES[1])).slice(0, 3)),
          // How the scene stands and how the camera saw the last frame, so that a check can say where on the canvas a thing was drawn.
          world: group.matrixWorld.toArray(), view: camera.matrixWorldInverse.toArray(), proj: camera.projectionMatrix.toArray(),
        }, s);
        // The long lists, made only when asked for.
        const n = tree.n;
        const list = (name, get) => Object.defineProperty(d, name, { get });
        list('sentBright', () => Array.from(sent.bright.subarray(0, n))); list('sentBulb', () => Array.from(sent.bulb.subarray(0, n * 3))); list('sentHalo', () => Array.from(sent.halo.subarray(0, n * 3)));
        list('sentHaloSize', () => Array.from(sent.haloSize.subarray(0, n))); list('sentBall', () => Array.from(sent.ball)); list('sentBallCol', () => Array.from(sent.ballCol)); list('sentBallHow', () => Array.from(sent.ballHow));
        list('sentCap', () => Array.from(sent.cap)); list('sentFlake', () => Array.from(sent.flake)); list('sentStar', () => Array.from(sent.star)); list('sentString', () => Array.from(sent.string)); list('sentLean', () => Array.from(sent.lean));
        list('lightAt', () => Array.from(lightAt.subarray(0, n * 3))); list('onOf', () => Array.from(tree.on)); list('swingOf', () => Array.from(tree.swing)); list('glowOf', () => Array.from(tree.glow));
        return d;
      },
    };
  }

  globalThis.TimbreTree = {
    BANDS, TIERS, LOBES, SCALLOP, TURN, DROOP, TIER_GRID, SNOW_LIES, SNOW_PROUD, TRUNK, STAR_Y, STAR, LIGHTS_MIN, LIGHTS_MAX, STRING, DROP, PROUD, LINE, STRING_STEPS, WIRE_EVERY, RUN_S, HISTORY, BULB_R,
    BAUBLES, BAUBLE_R, HANG, TIP_IN, TIP_UP, HUES, SEED, STEP, STEPS_MAX, RUN, DRIFT, DRIFT_Z, SINK, PRESENTS, FOOT,
    SPRING, SPRING_STEPS, ROCK, SWING, SWING_STEPS, SWING_MOST, SWING_THUMP, SWING_BAND, GLOW_RATE, BALL_GLOW, SNOW_RATE, SNOW_WAIT, SNOW_LEAST, SNOWING, FALLING_MAX, SPAWN, CLUMPS_EACH, CLUMPS, FLAKES,
    FLAKE, FLAKE_FALL, FLAKE_SWAY, SKY, SIDE, ROOF, LAND, FLOOR, CLUMP, CLUMP_AT, CLUMP_OUT, CLUMP_DOWN, CLUMP_UP, GRAVITY, KEEP, JOSTLE, FLASH_S,
    STAR_RATE, STAR_MOST, TWINKLE, TWINKLE_RATE, VOICE, BEAT, FLICKER, CORE, HALO, HALO_SIZE, STAR_GOLD, STAR_GLOW, STAR_GLOW_A, STAR_RAYS, STAR_RAYS_A, STAR_TURN, STAR_LIGHT, STAR_REACH,
    STRING_LIGHT, STRING_AT, STRING_REACH, BAND_RATE, SWAY, ORBIT_RATE, LINGER, FOV, TILT, FRAME,
    BULB_VERT, BULB_FRAG, HALO_VERT, HALO_FRAG, BAUBLE_VERT, BAUBLE_FRAG, FLAKE_VERT, FLAKE_FRAG,
    countFor, glowFor, snowFor, loudness, idle, levelOf, settle, rng, rimY, rimR, tierR, surfaceR, garland, baubleSpots, tierGrid, driftHeight, driftGrid, snowAt, starPoints,
    createTree, restring, lay, heard, shake, resettle, stepTree, advance, dress, swayFor, orbitAt, definition,
  };
})();
