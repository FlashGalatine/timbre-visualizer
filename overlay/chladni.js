// Timbre — the Chladni plate: sand on a floating plate, gathering into figures as the voice
// shakes it. First the arithmetic: how many grains there are, the figures and their slope,
// the tone of the sound and which figure it asks for, how hard the plate shakes, how a grain
// walks, hops and is thrown, the plate's bend and glow, and the sand's colour. Then the 3D
// scene itself, written against the scene kit: definition() returns what
// TimbreScene.factory() needs.
//
// All timing comes from the caller (dt in seconds), never from counting frames, and the sand
// takes its random numbers from its own seeded sequences, so a run is repeatable and the same
// sound gives the same kind of figure at any frame rate.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreChladni`), like phosphor.js, so verify.mjs can import it under Node.
// Nothing here may touch document, window, THREE, TimbreScene or core.js globals at load
// time; the scene looks them up when it is built. (The tables below are plain arithmetic.)

(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const GRAINS_MIN = 6000, GRAINS_MAX = 30000;   // grains at Density 0 and 100
  const HALF = 2.2;                         // half the plate's side
  const THICK = 0.09;                       // how thick the plate is
  const G = 48;                             // cells along a side of the plate's grid
  const T = 2048;                           // table cells across the plate
  const BANDS = 16;                         // bins the tone is weighed over
  const TONE_LOW = 0.4, TONE_SPAN = 2.6;    // the tone is 0 with the sound's weight at bin 0.4 and 1 at bin 3
  const BLEND = 0.8;                        // seconds the plate takes to change figure
  const PAUSE = 0.45;                       // seconds of quiet that make the next sound a new phrase
  const HOLD = 3;                           // seconds a figure is kept within a phrase
  const HUSH = 0.1, LOUD = 0.22;            // the voice is quiet below the one and sounding above the other
  const HUM = 0.04;                         // how hard the plate shakes with no sound at all
  const REST = 2.5;                         // seconds between one throw and the next, at least
  const GRAV = 9;                           // how fast sand in the air falls
  const REACH = 0.04;                       // within this of its place a grain slows down
  const SPREAD = 0.024;                     // how far from a line a grain's own place may be: up to 1.5 times this
  const FLEX = 0.035;                       // how far the plate bends, for a figure's value of 1 at full shake
  const BEAT = 4;                           // bends a second
  const RIM = 0.16;                         // how bright the plate's rim is
  const ONSET = 0.1;                        // seconds of a phrase's tone that are weighed before the plate picks its figure
  const TONE_RATE = 2.5;                    // how fast the tone is followed within a phrase, a second
  const LIFT = 0.014;                       // how far above the plate a lying grain is drawn
  const SIZE = 0.085;                       // how wide a grain's light is
  const RINGS = 32;                         // steps of colour from the middle of the plate to a corner
  const STEPS_MAX = 6;                      // the most steps the sand takes in one frame
  const PITCH = 44, FOV = 30;               // the camera: how far it looks down, and how wide it sees, in degrees
  const FRAME = { width: 6.8, height: 4.9, center: [0, -0.38, 0] };   // what the camera frames
  const AIR = 0.25;                         // room kept above the plate for sand in the air
  const RAD = Math.PI / 180;
  const SEED = 20261119;

  // How many grains a Density setting means. No setting is the default, 50.
  function grainCount(density) {
    const d = Number.isFinite(density) ? clamp01(density / 100) : 0.5;
    return Math.round(GRAINS_MIN + d * (GRAINS_MAX - GRAINS_MIN));
  }

  // The figures, simplest first. Each is [n, m, s]: across the plate (x and z from -1 to 1)
  // its value is cos(n·π·x)·cos(m·π·z) + s·cos(m·π·x)·cos(n·π·z), and its lines are where
  // that is zero: where the plate does not move.
  const FIGURES = [[1, 2, -1], [1, 2, 1], [1, 3, 1], [2, 3, -1], [2, 3, 1], [1, 4, -1], [3, 4, -1], [2, 5, 1], [3, 5, -1], [4, 5, 1]];
  const KMAX = 5;
  function value(fig, x, z) {
    const n = fig[0] * Math.PI, m = fig[1] * Math.PI;
    return Math.cos(n * x) * Math.cos(m * z) + fig[2] * Math.cos(m * x) * Math.cos(n * z);
  }

  // The cosines and sines of each mode across the plate, read by cell.
  const COS = [], SIN = [];
  for (let k = 0; k <= KMAX; k++) {
    const c = new Float32Array(T), s = new Float32Array(T);
    for (let i = 0; i < T; i++) { const x = (i / (T - 1)) * 2 - 1; c[i] = Math.cos(k * Math.PI * x); s[i] = Math.sin(k * Math.PI * x); }
    COS.push(c); SIN.push(s);
  }
  function cell(x) {
    const i = ((x + 1) * 0.5 * (T - 1) + 0.5) | 0;
    return i < 0 ? 0 : i > T - 1 ? T - 1 : i;
  }
  // A figure's value and its slope each way at cells ix and iz, into out: [value, along x, along z].
  function sample(fig, ix, iz, out) {
    const n = fig[0], m = fig[1], s = fig[2];
    const cnx = COS[n][ix], cmx = COS[m][ix], cnz = COS[n][iz], cmz = COS[m][iz];
    out[0] = cnx * cmz + s * cmx * cnz;
    out[1] = -Math.PI * (n * SIN[n][ix] * cmz + s * m * SIN[m][ix] * cnz);
    out[2] = -Math.PI * (m * cnx * SIN[m][iz] + s * n * cmx * SIN[n][iz]);
    return out;
  }

  // How loud a band is, 0..1: its bin, times Gain.
  function loudness(bins, band, gain) {
    if (!bins || !(band < bins.length)) return 0;
    return clamp01((bins[band] / 255) * gain);
  }

  // The tone, 0..1: where the sound's weight sits among the bands (each 0..1). A band weighs
  // as its square, so the bands that sound decide it and a floor of hiss under them does not.
  // With too little sound to tell, -1.
  function toneOf(bands) {
    let sum = 0, moment = 0;
    for (let b = 0; b < BANDS; b++) { const w = bands[b] * bands[b]; sum += w; moment += b * w; }
    if (!(sum > 0.02)) return -1;
    return clamp01((moment / sum - TONE_LOW) / TONE_SPAN);
  }

  // A running mean: `mean` over `weight` seconds so far, with `value` for dt more.
  function meanOf(mean, value, weight, dt) {
    return weight + dt > 0 ? (mean * weight + value * dt) / (weight + dt) : value;
  }

  // The figure a tone asks for: low, a simple one; high, an intricate one.
  function wantFigure(tone) {
    if (!(tone > 0)) return 0;
    return Math.min(FIGURES.length - 1, Math.floor(tone * FIGURES.length));
  }

  // What the plate remembers of the voice: the figure it has and the one it had, the figure
  // the tone asked for when it last chose, how long ago it changed, how long the voice has
  // been quiet in one stretch, and whether a new phrase is waiting to start.
  function voice() {
    return { figure: 0, from: 0, asked: 0, since: 9, quiet: 9, pending: false, changes: 0, phrases: 0 };
  }

  // The figure a new phrase takes: the one its tone asks for or, if the plate has that one
  // or had it last, the nearest one along that it neither has nor had (up the list, or down
  // it from the last two). So a voice that keeps its tone goes round three figures.
  function phraseFigure(want, has, had) {
    const step = want + 2 < FIGURES.length ? 1 : -1;
    for (let i = 0; i < 3; i++) { const fig = want + i * step; if (fig !== has && fig !== had) return fig; }
    return want;
  }

  // One moment of listening (level: how loud the voice is just now). When the voice comes
  // back after a pause (PAUSE seconds of quiet in one stretch) a new phrase is waiting, and
  // starts as soon as the last change has finished and the sound has a tone (want is not
  // below 0): the plate takes phraseFigure() (but its first phrase takes what the tone asks).
  // Within a phrase the figure is kept, unless the tone comes to ask for another than it
  // asked for when the plate last chose, and then not within HOLD seconds of the last change.
  function listen(st, level, want, dt) {
    st.since += dt;
    if (level < HUSH) st.quiet += dt;
    else if (level > LOUD) { if (st.quiet > PAUSE) st.pending = true; st.quiet = 0; }
    if (level > LOUD && st.since >= BLEND && want >= 0) {
      let to = st.figure;
      if (st.pending) { to = st.phrases > 0 ? phraseFigure(want, st.figure, st.from) : want; st.pending = false; st.phrases++; st.asked = want; }
      else if (st.since > HOLD && want !== st.asked) { to = want; st.asked = want; }
      if (to !== st.figure) { st.from = st.figure; st.figure = to; st.since = 0; st.changes++; }
    }
    return st;
  }

  // How far the plate has got from the figure it had to the one it has, 0..1.
  function blendOf(since) {
    const t = clamp01(since / BLEND);
    return t * t * (3 - 2 * t);
  }

  // How hard the plate shakes: as the voice is loud, a little more on a beat, and never less
  // than a hum. With the mic and Idle animation off it does not shake.
  function shakeOf(flame, kick, live) {
    return live ? Math.min(1.2, HUM + flame + 0.4 * kick) : 0;
  }

  // How fast a grain walks toward its place (plate widths are 2; this is a second), how far
  // a step of h seconds may jostle it either way in all, the chance in that step that a
  // grain lying where the plate moves at full swing hops, and how fast a hop leaves the
  // plate (moved: how much the plate moves there, 0..1; r: the grain's luck, 0..1).
  function pace(shake) {
    return 0.5 + 2.2 * shake;
  }
  function jostle(shake, h) {
    return 0.07 * shake * Math.sqrt(12 * h);
  }
  function hopChance(shake, h) {
    return 6 * shake * h;
  }
  function hopSpeed(shake, moved, r) {
    return (0.4 + 0.8 * r) * 1.5 * Math.sqrt(shake) * moved;
  }

  // How hard a beat throws the sand, 0..1: nothing unless the level is above 0.9, and not
  // within REST seconds of the last throw.
  function thrown(level, rose, sinceHit) {
    return rose && sinceHit > REST ? clamp01(level * 10 - 9) : 0;
  }

  // How many steps the sand takes in a frame of dt seconds: none longer than a sixtieth of a
  // second (but no more than STEPS_MAX of them, for a frame that took a tenth of a second).
  function stepsFor(dt) {
    return Math.max(1, Math.min(STEPS_MAX, Math.ceil(dt * 60 - 1e-6)));
  }

  // n grains, spread evenly over the plate. Each has its place on the plate (x and z, -1 to
  // 1), its height above it and its speed while in the air, its own place beside a line
  // (off), its own run of random numbers (rng), and the plate's value under it (f).
  function createSand(n, seed) {
    const sand = {
      n, x: new Float32Array(n), z: new Float32Array(n), y: new Float32Array(n),
      vx: new Float32Array(n), vy: new Float32Array(n), vz: new Float32Array(n),
      off: new Float32Array(n), f: new Float32Array(n), rng: new Uint32Array(n),
    };
    let s = seed >>> 0;
    const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    // A grain's own run starts from a scramble of its number, so that no grain's run is another's a few draws on.
    const scramble = (v) => { v = Math.imul(v ^ (v >>> 16), 0x7feb352d); v = Math.imul(v ^ (v >>> 15), 0x846ca68b); return (v ^ (v >>> 16)) >>> 0; };
    for (let i = 0; i < n; i++) {
      sand.x[i] = r() * 2 - 1; sand.z[i] = r() * 2 - 1;
      sand.off[i] = (r() + r() + r() - 1.5) * SPREAD;
      sand.rng[i] = scramble((seed >>> 0) + Math.imul(i + 1, 0x9e3779b9)) | 1;
    }
    return sand;
  }

  // One step of h seconds for the first `count` grains. The plate has a blend of two
  // figures (figA, figB; blend 0 is all figA, 1 all figB) and shakes by `shake`. A grain on
  // the plate walks toward its place beside the nearest line, is jostled, and may hop; a
  // grain in the air flies on and falls. With the plate still (live false) only the grains
  // in the air move. Far from its place a grain walks at the plate's pace; within REACH of
  // it the distance left dies away at pace / REACH a second, whatever the length of the
  // step. sand.f is left as the plate's value under each grain where it is after the step.
  const SA = [0, 0, 0], SB = [0, 0, 0];
  function stepSand(sand, count, figA, figB, blend, shake, live, h) {
    const X = sand.x, Z = sand.z, Y = sand.y, VX = sand.vx, VY = sand.vy, VZ = sand.vz, OFF = sand.off, FV = sand.f, RNG = sand.rng;
    const speed = pace(shake), jit = jostle(shake, h), chance = hopChance(shake, h), mixed = blend < 1;
    const far = speed * h, ease = 1 - Math.exp(-far / REACH), perSecond = h > 0 ? 1 / h : 0;
    for (let i = 0; i < count; i++) {
      let x = X[i], z = Z[i], y = Y[i];
      const ix = cell(x), iz = cell(z);
      sample(figB, ix, iz, SB);
      let f = SB[0], fx = SB[1], fz = SB[2];
      if (mixed) { sample(figA, ix, iz, SA); f = SA[0] + (f - SA[0]) * blend; fx = SA[1] + (fx - SA[1]) * blend; fz = SA[2] + (fz - SA[2]) * blend; }
      let dx = 0, dz = 0;
      if (y > 0) {
        dx = VX[i] * h; dz = VZ[i] * h;
        VY[i] -= GRAV * h; y += VY[i] * h;
        if (y <= 0) { y = 0; VX[i] = 0; VY[i] = 0; VZ[i] = 0; }
      } else if (live) {
        const steep = Math.sqrt(fx * fx + fz * fz) + 1e-3;
        const err = f / steep - OFF[i];                     // how far the grain is from its place, down the slope
        const walk = (err > REACH ? far : err < -REACH ? -far : err * ease) / steep;
        let s = RNG[i];
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const r1 = s / 4294967296;
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const r2 = s / 4294967296;
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const r3 = s / 4294967296;
        dx = -(fx * walk + (r1 - 0.5) * jit);
        dz = -(fz * walk + (r2 - 0.5) * jit);
        const moved = f < 0 ? (f < -1 ? 1 : -f) : (f > 1 ? 1 : f);
        if (r3 < chance * moved) {
          s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
          VY[i] = hopSpeed(shake, moved, s / 4294967296); VX[i] = -fx * walk * perSecond; VZ[i] = -fz * walk * perSecond;
          y = 1e-4;
        }
        RNG[i] = s;
      }
      x += dx; z += dz;
      FV[i] = f + fx * dx + fz * dz;
      X[i] = x < -1 ? -1 : x > 1 ? 1 : x; Z[i] = z < -1 ? -1 : z > 1 ? 1 : z; Y[i] = y;
    }
  }

  // A throw: every one of the first `count` grains that lies on the plate goes up and a
  // little sideways, harder for a greater strength (0..1).
  function throwSand(sand, count, strength) {
    const RNG = sand.rng;
    for (let i = 0; i < count; i++) {
      if (sand.y[i] > 0) continue;
      let s = RNG[i];
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0; sand.vy[i] = (0.5 + s / 4294967296) * 1.5 * strength;
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0; sand.vx[i] = (s / 4294967296 - 0.5) * 1.3 * strength;
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0; sand.vz[i] = (s / 4294967296 - 0.5) * 1.3 * strength;
      RNG[i] = s;
      sand.y[i] = 1e-4;
    }
  }

  // How the first `count` grains lie on a blend of two figures: the share lying within 0.03
  // of their own places (settled), the share in the air (air), the highest grain (top), and
  // how far a grain is from its place on average, counting no grain as further than 0.2
  // (spread).
  function measure(sand, count, figA, figB, blend) {
    let settled = 0, air = 0, top = 0, spread = 0;
    for (let i = 0; i < count; i++) {
      const ix = cell(sand.x[i]), iz = cell(sand.z[i]);
      sample(figB, ix, iz, SB);
      let f = SB[0], fx = SB[1], fz = SB[2];
      if (blend < 1) { sample(figA, ix, iz, SA); f = SA[0] + (f - SA[0]) * blend; fx = SA[1] + (fx - SA[1]) * blend; fz = SA[2] + (fz - SA[2]) * blend; }
      const err = Math.abs(f / (Math.sqrt(fx * fx + fz * fz) + 1e-3) - sand.off[i]);
      spread += err > 0.2 ? 0.2 : err;
      if (sand.y[i] > 0) { air++; if (sand.y[i] > top) top = sand.y[i]; }
      else if (err < 0.03) settled++;
    }
    const n = Math.max(1, count);
    return { settled: settled / n, air: air / n, top, spread: spread / n };
  }

  // How far the plate is bent just now, for a figure's value of 1: it swings BEAT times a
  // second, further the harder it shakes.
  function bend(shake, clock) {
    return FLEX * shake * Math.sin(2 * Math.PI * BEAT * clock);
  }

  // How bright the plate glows where the figure's value is f: more where it moves more and
  // the harder it shakes, and not at all on a line.
  function glow(f, shake) {
    return 0.1 * Math.min(1, shake) * Math.min(1, (f * f) / 2);
  }

  // How bright a grain is: brighter the harder the plate shakes, dimmer in the air.
  function sandBright(shake, inAir) {
    return (0.55 + 0.3 * Math.min(1, shake)) * (inAir ? 0.7 : 1);
  }

  // The sand's colour: its palette colour (rgb, 0..1 each), 40% of the way to white.
  function pale(out, rgb) {
    out[0] = rgb[0] + (1 - rgb[0]) * 0.4; out[1] = rgb[1] + (1 - rgb[1]) * 0.4; out[2] = rgb[2] + (1 - rgb[2]) * 0.4;
    return out;
  }

  // The size to give the sand's points. three.js sizes a point by the canvas's height and
  // not by the height of what the kit draws into (`scale` times taller) or the camera's zoom
  // (the Size placement), so both are put back here: a grain keeps its size against the plate.
  function grainSize(scale, zoom) {
    return SIZE * scale * zoom;
  }

  // The three Rotate settings turn the plate as the scene kit turns anything (TimbreScene.turn,
  // reach and poseFor: spin about y first, then roll about z, then tilt about x). The plate
  // is this box: its slab, and room above it for sand in the air.
  const BOX = { min: [-HALF, -THICK, -HALF], max: [HALF, AIR, HALF] }, VIEW = { frame: FRAME, fov: FOV, pitch: PITCH };
  function turn(out, x, y, z, rx, ry, rz) {
    return TimbreScene.turn(out, x, y, z, rx, ry, rz);
  }
  // How far the turned plate reaches from the middle of the frame: [lowest, highest, leftmost, rightmost].
  // (orbit: how far the camera has swung round the plate, in radians; none if left out.)
  function bounds(rx, ry, rz, scale, px, py, pz, orbit) {
    return TimbreScene.reach(BOX, VIEW, rx, ry, rz, scale, px, py, pz, orbit);
  }
  // Where to put the turned plate and how large to draw it so that it stays in the frame.
  // sway: how far the camera swings each way, in radians: the plate stays in wherever it is.
  function poseFor(rx, ry, rz, sway) {
    return TimbreScene.poseFor(BOX, VIEW, rx, ry, rz, sway);
  }
  const SWAY = 0.28;                      // how far the camera swings each way at Camera drift 50, in radians

  // How far a place on the plate is from its middle: 0 there, 1 at a corner.
  function radius(x, z) {
    return Math.min(1, Math.sqrt(x * x + z * z) / Math.SQRT2);
  }

  // With the mic off and Idle animation on: how loud band b pretends to be at t seconds.
  // The weight drifts slowly up and down the bands, between the two ends of the tone, and
  // the tone with it.
  function idle(b, t) {
    const d = b - (TONE_LOW + TONE_SPAN * (0.5 + 0.5 * Math.sin(0.08 * t)));
    return Math.exp(-(d * d) / 1.5);
  }

  // ── The scene ───────────────────────────────────────────────────────────────
  // Everything below runs only when the scene is built: THREE, TimbreScene and the core.js
  // globals (the mic, the bins, the palette, the settings) are looked up then.

  // The scene definition, for TimbreScene.factory().
  function definition() {
    const ID = 'chladni';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name, unset = 50) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : unset;
    };
    const V = G + 1;                                  // points along a side of the plate's grid
    const bands = new Float32Array(BANDS), ramp = new Float32Array((RINGS + 1) * 3), rgb = [0, 0, 0], tint = [0, 0, 0];
    const PA = [0, 0, 0], PB = [0, 0, 0], cells = new Int32Array(V), rim = [];
    for (let c = 0; c < V; c++) cells[c] = cell((c / G) * 2 - 1);
    // The plate's edge, once round: the points its skirt hangs from.
    for (let c = 0; c < V; c++) rim.push(c);
    for (let r = 1; r < V; r++) rim.push(r * V + G);
    for (let c = G - 1; c >= 0; c--) rim.push(G * V + c);
    for (let r = G - 1; r >= 1; r--) rim.push(r * V);
    let THREE = null, whole = null, plate = null, skirt = null, grains = null, colour = null, sand = null, camera = null, count = 0;
    let pose = poseFor(0, 0, 0);
    const turned = [0, 0, 0];
    let swayWas = -1;
    const st = voice();
    // What the checks read. clock: seconds the scene has been live, which the plate bends by;
    // cold: no tone has been heard since the last pause; hits: how many throws there have been.
    const s = { flame: 0, kick: 0, level: 0, clock: 0, live: false, orbit: 0, colorT: 0, grains: 0, tone: 0, want: 0, cold: true, heardFor: 0, shake: 0, flex: 0, glowMax: 0, glowAt: 0, mix: 1, midF: 0, hits: 0, strength: 0, sinceHit: 9, lastKick: 0 };

    function setGrains(n) {
      count = n;
      grains.geometry.setDrawRange(0, n);
      s.grains = n;
    }

    function build(k) {
      THREE = k.THREE;
      camera = k.camera;
      colour = new THREE.Color();
      sand = createSand(GRAINS_MAX, SEED);
      // The plate, its skirt and the sand turn together, by the three Rotate settings.
      whole = new THREE.Group();
      whole.rotation.order = 'XZY';   // spin (y) first, then roll (z), then tilt (x): as turn() does
      k.scene.add(whole);
      const attribute = (n) => { const a = new THREE.BufferAttribute(new Float32Array(n * 3), 3); a.setUsage(THREE.DynamicDrawUsage); return a; };

      // The plate: a sheet that bends, solid and nearly black.
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', attribute(V * V));
      pg.setAttribute('color', attribute(V * V));
      const sheet = [];
      for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) { const p = r * V + c; sheet.push(p, p + V, p + 1, p + 1, p + V, p + V + 1); }
      pg.setIndex(sheet);
      plate = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      plate.frustumCulled = false;   // its points move every frame
      whole.add(plate);

      // Its skirt: two points under each point of the edge, the plate's thickness apart.
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', attribute(rim.length * 2));
      sg.setAttribute('color', attribute(rim.length * 2));
      const round = [];
      for (let i = 0; i < rim.length; i++) { const a = i * 2, b = ((i + 1) % rim.length) * 2; round.push(a, a + 1, b, b, a + 1, b + 1); }
      sg.setIndex(round);
      skirt = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      skirt.frustumCulled = false;
      whole.add(skirt);

      // The sand: soft grains of added light.
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', attribute(GRAINS_MAX));
      gg.setAttribute('color', attribute(GRAINS_MAX));
      grains = new THREE.Points(gg, k.addLight(new THREE.PointsMaterial({ size: SIZE, sizeAttenuation: true, map: k.glowTexture(255, 255, 255), vertexColors: true })));
      grains.frustumCulled = false;
      whole.add(grains);

      setGrains(grainCount(knob('density')));
    }

    // The palette colour at t, as the colour buffer wants it (linear), into rgb.
    function palette(t) {
      const p = getColor(t);
      colour.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
      rgb[0] = colour.r; rgb[1] = colour.g; rgb[2] = colour.b;
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = (0.22 * Math.sin(0.13 * t) + 0.06 * Math.sin(0.37 * t + 2)) * knob('cameraDrift') / 50;
      const n = grainCount(knob('density'));
      if (n !== count) setGrains(n);
      // The plate as the Rotate settings turn it, kept in the frame.
      const rx = knob('rotateX', 0), ry = knob('rotateY', 0), rz = knob('rotateZ', 0);
      const sway = (SWAY * knob('cameraDrift')) / 50;
      if (rx !== turned[0] || ry !== turned[1] || rz !== turned[2] || sway !== swayWas) { turned[0] = rx; turned[1] = ry; turned[2] = rz; swayWas = sway; pose = poseFor(rx, ry, rz, sway); }
      s.sway = sway;
      whole.rotation.set(rx * RAD, ry * RAD, rz * RAD);
      whole.scale.setScalar(pose.scale);
      whole.position.set(pose.x, pose.y, pose.z);

      // With the mic and Idle animation both off, the plate is still.
      s.live = !!(micActive || cfgIdleAnim);
      if (s.live) s.clock += dt;
      s.flame = audio.flame; s.kick = audio.kick; s.level = audio.level;

      // The tone. After a pause it is the mean of what is heard over the first ONSET seconds
      // of the voice, and the phrase waits for that; within a phrase the tone is followed.
      for (let b = 0; b < BANDS; b++) bands[b] = micActive ? loudness(frequencies, b, cfgGain) : cfgIdleAnim ? idle(b, s.clock) : 0;
      if (st.quiet > PAUSE) { s.cold = true; s.heardFor = 0; }
      const heard = toneOf(bands);
      if (heard >= 0) {
        if (s.cold) {
          s.tone = meanOf(s.tone, heard, s.heardFor, dt);
          s.heardFor += dt;
          if (s.heardFor >= ONSET - 1e-9) s.cold = false;
        } else s.tone = follow(s.tone, heard, TONE_RATE, dt);
      }
      s.want = wantFigure(s.tone);
      listen(st, audio.level, s.cold ? -1 : s.want, dt);
      const mix = blendOf(st.since), figA = FIGURES[st.from], figB = FIGURES[st.figure];
      s.mix = mix;

      // How hard the plate shakes, and a throw.
      s.shake = shakeOf(audio.flame, audio.kick, s.live);
      s.sinceHit += dt;
      const rose = audio.kick > s.lastKick + 0.4;
      s.lastKick = audio.kick;
      const strength = thrown(audio.level, rose, s.sinceHit);
      if (strength > 0) { throwSand(sand, count, strength); s.sinceHit = 0; s.hits++; s.strength = strength; }

      // The sand moves.
      const steps = stepsFor(dt), h = dt / steps;
      for (let i = 0; i < steps; i++) stepSand(sand, count, figA, figB, mix, s.shake, s.live, h);
      s.flex = bend(s.shake, s.clock);

      // The sand as drawn: each grain where it lies, a hair above the plate as it is bent there.
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      for (let i = 0; i <= RINGS; i++) { palette(colorT + (i / RINGS) * 1.4); pale(tint, rgb); ramp[i * 3] = tint[0]; ramp[i * 3 + 1] = tint[1]; ramp[i * 3 + 2] = tint[2]; }
      const pos = grains.geometry.attributes.position.array, col = grains.geometry.attributes.color.array;
      const X = sand.x, Z = sand.z, Y = sand.y, FV = sand.f, flex = s.flex, lying = sandBright(s.shake, false), flying = sandBright(s.shake, true);
      for (let i = 0; i < count; i++) {
        const p = i * 3, x = X[i], z = Z[i], y = Y[i];
        pos[p] = x * HALF; pos[p + 1] = flex * FV[i] + y + LIFT; pos[p + 2] = z * HALF;
        const ring = ((radius(x, z) * RINGS) | 0) * 3, b = y > 0 ? flying : lying;
        col[p] = ramp[ring] * b; col[p + 1] = ramp[ring + 1] * b; col[p + 2] = ramp[ring + 2] * b;
      }
      // Only the grains drawn are sent to the GPU.
      for (const a of [grains.geometry.attributes.position, grains.geometry.attributes.color]) { a.addUpdateRange(0, count * 3); a.needsUpdate = true; }
      grains.material.size = grainSize(TimbreScene.renderScale(canvas3d.height), k.camera.zoom * pose.scale);

      // The plate: bent by the figure, glowing where it moves, with a lit rim.
      palette(colorT + 0.7);
      const pp = plate.geometry.attributes.position.array, pc = plate.geometry.attributes.color.array;
      let glowMax = 0;
      for (let r = 0; r < V; r++) for (let c = 0; c < V; c++) {
        const p = (r * V + c) * 3;
        sample(figB, cells[c], cells[r], PB);
        let f = PB[0];
        if (mix < 1) { sample(figA, cells[c], cells[r], PA); f = PA[0] + (f - PA[0]) * mix; }
        const edge = r === 0 || c === 0 || r === G || c === G, g = glow(f, s.shake), light = g + (edge ? RIM : 0);
        if (g > glowMax && !edge) { glowMax = g; s.glowAt = p; }
        if (r === 12 && c === 16) s.midF = f;   // the figure's value at one point of the plate, as the plate has it
        pp[p] = ((c / G) * 2 - 1) * HALF; pp[p + 1] = flex * f; pp[p + 2] = ((r / G) * 2 - 1) * HALF;
        pc[p] = 0.006 + rgb[0] * light; pc[p + 1] = 0.006 + rgb[1] * light; pc[p + 2] = 0.009 + rgb[2] * light;
      }
      s.glowMax = glowMax;
      const sp = skirt.geometry.attributes.position.array, sc = skirt.geometry.attributes.color.array;
      for (let i = 0; i < rim.length; i++) {
        const p = rim[i] * 3, q = i * 6;
        sp[q] = pp[p]; sp[q + 1] = pp[p + 1]; sp[q + 2] = pp[p + 2];
        sp[q + 3] = pp[p]; sp[q + 4] = pp[p + 1] - THICK; sp[q + 5] = pp[p + 2];
        sc[q] = 0.006 + rgb[0] * RIM; sc[q + 1] = 0.006 + rgb[1] * RIM; sc[q + 2] = 0.009 + rgb[2] * RIM;
        sc[q + 3] = 0.004 + rgb[0] * 0.02; sc[q + 4] = 0.004 + rgb[1] * 0.02; sc[q + 5] = 0.006 + rgb[2] * 0.02;
      }
      for (const m of [plate, skirt]) { m.geometry.attributes.position.needsUpdate = true; m.geometry.attributes.color.needsUpdate = true; }
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: PITCH,
      cooling: [Infinity, Infinity, Infinity],   // fading light keeps its colour
      build,
      update,
      debug() {
        const voiced = { figure: st.figure, from: st.from, asked: st.asked, since: st.since, quiet: st.quiet, pending: st.pending, changes: st.changes, phrases: st.phrases, blend: blendOf(st.since) };
        if (!grains) return Object.assign(voiced, s);
        // How the sand lies, and what is drawn, read back from the buffers.
        const m = measure(sand, count, FIGURES[st.from], FIGURES[st.figure], voiced.blend);
        const pp = plate.geometry.attributes.position.array, pc = plate.geometry.attributes.color.array, sp = skirt.geometry.attributes.position.array;
        const pos = grains.geometry.attributes.position.array, gc = grains.geometry.attributes.color;
        let relief = 0, plateLit = 0, plateDark = Infinity, skirtOff = 0;
        const thick = [Infinity, 0];
        for (let r = 0; r < V; r++) for (let c = 0; c < V; c++) {
          const p = (r * V + c) * 3;
          relief = Math.max(relief, Math.abs(pp[p + 1]));
          if (r === 0 || c === 0 || r === G || c === G) continue;
          const sum = pc[p] + pc[p + 1] + pc[p + 2];
          plateLit = Math.max(plateLit, sum); plateDark = Math.min(plateDark, sum);
        }
        for (let i = 0; i < rim.length; i++) {
          const d = sp[i * 6 + 1] - sp[i * 6 + 4];
          thick[0] = Math.min(thick[0], d); thick[1] = Math.max(thick[1], d);
          skirtOff = Math.max(skirtOff, Math.abs(sp[i * 6 + 1] - pp[rim[i] * 3 + 1]), Math.abs(sp[i * 6] - pp[rim[i] * 3]), Math.abs(sp[i * 6 + 2] - pp[rim[i] * 3 + 2]));
        }
        const first = [];
        for (let i = 0; i < 8; i++) first.push(sand.x[i], sand.z[i], sand.y[i]);
        // The plate as it stands in the scene: where its near right corner is, and how squarely its top faces the camera.
        whole.updateMatrixWorld(true);
        const corner = plate.localToWorld(new THREE.Vector3(HALF, 0, HALF)), middle = plate.localToWorld(new THREE.Vector3(0, 0, 0)), top = plate.localToWorld(new THREE.Vector3(0, 1, 0)).sub(middle).normalize();
        const toCamera = camera.position.clone().sub(new THREE.Vector3().fromArray(FRAME.center)).normalize();
        // Where the first grain is in the scene, and how far the skirt's first point is from the plate's corner it hangs from.
        const grainWorld = grains.localToWorld(new THREE.Vector3(pos[0], pos[1], pos[2])), skirtWorldOff = skirt.localToWorld(new THREE.Vector3(sp[0], sp[1], sp[2])).distanceTo(plate.localToWorld(new THREE.Vector3(pp[rim[0] * 3], pp[rim[0] * 3 + 1], pp[rim[0] * 3 + 2])));
        // The first grain's own colour as its buffer holds it, with its brightness and its paleness taken back out.
        const b = sandBright(s.shake, sand.y[0] > 0), un = (v) => (v / b - 0.4) / 0.6, out = { r: 0, g: 0, b: 0 };
        colour.setRGB(un(gc.getX(0)), un(gc.getY(0)), un(gc.getZ(0))).getRGB(out, THREE.SRGBColorSpace);
        // The plate's glow where it is brightest, with the plate's own darkness and the glow's strength taken back out.
        const lit = { r: 0, g: 0, b: 0 }, ga = s.glowAt, gm = s.glowMax || 1;
        colour.setRGB((pc[ga] - 0.006) / gm, (pc[ga + 1] - 0.006) / gm, (pc[ga + 2] - 0.009) / gm).getRGB(lit, THREE.SRGBColorSpace);
        return Object.assign(voiced, m, {
          glowTint: [Math.round(lit.r * 255), Math.round(lit.g * 255), Math.round(lit.b * 255)],
          drawn: grains.geometry.drawRange.count, size: grains.material.size, first,
          turned: turned.slice(), scale: pose.scale, at: [pose.x, pose.y, pose.z], corner: corner.toArray(), facing: top.dot(toCamera), grainWorld: grainWorld.toArray(), skirtWorldOff, drawn0: [pos[0], pos[1], pos[2]], f0: sand.f[0],
          ring: (radius(sand.x[0], sand.z[0]) * RINGS) | 0, tint: [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)],
          relief, plateLit, plateDark, rimLit: pc[0] + pc[1] + pc[2], thick, skirtOff,
        }, s);
      },
    };
  }

  globalThis.TimbreChladni = {
    GRAINS_MIN, GRAINS_MAX, HALF, THICK, G, T, BANDS, TONE_LOW, TONE_SPAN, BLEND, PAUSE, HOLD, HUSH, LOUD, HUM, REST, GRAV, REACH, SPREAD, FLEX, BEAT, RIM, ONSET, TONE_RATE, LIFT, SIZE, RINGS, STEPS_MAX, PITCH, FOV, FRAME, AIR, BOX, SEED,
    FIGURES, grainCount, value, cell, sample, loudness, toneOf, meanOf, wantFigure, voice, phraseFigure, listen, blendOf, shakeOf, pace, jostle, hopChance, hopSpeed, thrown, stepsFor,
    createSand, stepSand, throwSand, measure, bend, glow, sandBright, pale, grainSize, turn, bounds, poseFor, SWAY, radius, idle, definition,
  };
})();
