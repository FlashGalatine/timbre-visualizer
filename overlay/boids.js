// Timbre: the Boids effect, as `globalThis.TimbreBoids`.
//
// Three wires hang across the box, and in silence birds sit on them in rows, wings folded. The
// wires are a spectrum: each stretch listens to one of the eight lowest bands, low at the left.
//
// The voice sends the birds up. A bird takes off when its band sounds, or when the voice is
// loud enough for its nerve. In the air they are a real flock: each keeps clear of the birds
// near it and flies the way they fly, and all follow a lead that wheels round the box. In a
// pause each bird glides back to its own seat and lands, and the wire springs under it. A
// thump of the mic is a fright: every bird bursts up at once and stays up while it lasts.
//
// Everything here but `definition()` is arithmetic, so that `verify` can check it under Node.
// Valid as BOTH a classic <script> and an ES module (it only assigns `globalThis.TimbreBoids`),
// the same trick as shared/viz-config.js. It follows school-of-fish.js closely.

(function () {
  'use strict';

  const BANDS = 8;                          // bands the wires listen to: the eight lowest bins
  const WIRES = 3;
  const PER_MIN = 12, PER_MAX = 28;         // birds to a wire at Density 0 and at 100
  const BIRDS_MAX = WIRES * PER_MAX;
  const SEED = 20261123;                    // what the flock is made from
  const STEP = 1 / 60, STEPS_MAX = 6;       // the flock's step, in seconds, and the most taken in one frame
  const WIRE_Y = [-0.45, -0.95, -1.45];     // how high each wire's ends hang
  const SPAN = 2, REACH = 1.65;             // a wire runs this far each way, and birds sit this far along it
  const SAG = 0.12, LOAD_SAG = 0.03;        // how far a wire sags in the middle, and how much more with every seat taken
  const SEG = 48, WIRE_HALF = 0.011, FADE = 0.45;   // a wire is drawn in this many pieces, this thick each way, fading out over this much at each end
  const SPRING = 300, SPRING_DAMP = 6;      // a wire's swing: how stiff, and how soon it stops
  const LEAVE = 0.18, LAND_KICK = 0.25, BOUNCE_MAX = 0.08;   // what a bird leaving and a bird landing do to its wire, and the furthest a wire swings
  const SIZE = 0.25, PERCH = 0.34;          // a middling bird's length, and how far above its wire its middle sits, of its own length
  const AIR = [1.75, 0.7, 0.75], AIR_Y = 0.62;   // the air the flock keeps to: an egg this far each way, about this height
  const WALL = 8, WALL_FROM = 0.95;         // how hard a bird is turned back at the edge of its air, and from where
  const WALL_OUT = 1.1, WALL_SLOW = 0.85;   // well outside its air (this many times as far out) and still heading out, it keeps this much of its speed each step
  const ROOM = 0.85;                        // a bird's place by the lead is kept within this share of its air
  const CRUISE = [1.1, 1.0];                // how fast the flock flies in silence, and how much faster at the loudest
  const LOOSE_FAST = 1.3;                   // frightened, the birds fly this much faster, and each makes for its own part of the air and not for the lead
  const LEAD_RATE = [0.45, 0.9];            // how fast the lead goes round, and how much faster at the loudest
  const LEAD = [1.0, 0.3, 0.45];            // how far the lead swings: across, up and down, toward and away
  const LEAD_WIDE = [0.7, 0.3];             // the share of that in silence, and how much more at the loudest
  const PLACE = [0.8, 0.4, 0.5];            // how far from the lead a bird's own place may be, each way
  const TURN = [3.5, 2], SPEED_RATE = 3;    // how fast a flying bird turns, in radians a second, and how much faster at the loudest; and how fast its speed goes to the speed it wants
  const LEVEL = 0.7, ALIGN = 0.7;           // how much of the climb to its place it steers by (it flies more level than straight at it), and how much it takes the way its neighbours fly
  const NEAR = 0.7, CLEAR = 0.4, PART = 2.5;   // how far it looks for neighbours, how far apart two birds keep, and how hard they steer off each other
  const TOP = 4.2;                          // no bird flies faster than this
  const HOME_HIGH = 0.3, HOME_NEAR = 0.45;  // coming home a bird first makes for this far above its seat, until it is this near
  const HOME_FAST = 2, HOME_SLOW = [0.4, 4.5], HOME_SEEK = 5;   // how fast it comes home at least; near its seat, its least speed and its speed for each unit left; how hard it steers
  const LANDED = 0.05;                      // it has landed when this near its seat
  const UP = [1.7, 0.5, 0.9, 0.7], UP_HARD = [1.8, 0.6, 3, 1.6];   // a bird leaves its wire this fast upward (and up to this much more), and up to this much sideways and in depth; frightened, harder
  const THROWN = [5, 1, 2.5, 3];            // a fright throws a flying bird: up to this much sideways, this much up and up to this much more, and up to this much in depth
  const BANK = 0.22, BANK_MAX = 1.1, BANK_RATE = 6;   // how far a bird rolls for how hard it turns, at most, and how fast
  const FLAP_RATE = 7, BEAT = [13, 9];      // how fast its beating follows what it needs, and its wings' beat in radians a second: at rest in the air, and more at full effort
  const FOLD_RATE = 6, UNFOLD_RATE = 12;    // how fast it folds its wings, and opens them
  const TURN_HEAD = 10, FACE_RATE = 8;      // how fast it turns to head the way it flies, and to sit the way it sits
  const NERVE = [0.10, 0.42], STAY = [0.5, 0.8];   // the least nerve and how much more a bird may have; how long it stays up after its call, at least, and how much longer it may
  const CALL = [1.25, 0.7];                 // what its band and what the voice count for, as its call
  const RISE = 20, FALL = 5;                // how fast a band is followed, up and down, a second
  const TRAIL = 8, PULSE = 5;               // how fast the loudness just past is forgotten, a second, and how much of a syllable a rise of 1 is
  const HISTORY = 64, WAVE = 22, WAVE_MAX = 40, WAVE_ROLL = 0.8;   // the ripple: steps remembered, steps later for each unit behind the lead, the latest it reaches, and how far it rolls a bird
  const KICK_FLASH = 0.5, FLASH_S = 0.3;    // how much of a beat every flying bird flashes by, and how long the flash of a fright lasts
  const SWAY = 0.12, ORBIT_RATE = 0.13;     // the camera: how far it sways each way at Camera drift 50, in radians, and how fast
  const LINGER = 0.08;                      // how long any light left behind takes to go, in seconds
  const FOV = 30, PITCH = 6;                // the camera: how wide it sees and how far it looks down, in degrees
  const FRAME = { width: 5.0, height: 3.9, center: [0, 0, 0] };   // what the camera frames

  // ── The settings and the sound ──────────────────────────────────────────────

  const numberOr50 = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 50);
  // Density (0 to 100) to a number of birds: the same number to each wire.
  function countFor(density) {
    return WIRES * Math.round(PER_MIN + (PER_MAX - PER_MIN) * numberOr50(density) / 100);
  }
  // Cohesion (0 to 100) to how wide of the lead the birds' places are: twice as wide at 0, half at 100.
  function spreadFor(cohesion) {
    return Math.pow(2, (50 - numberOr50(cohesion)) / 50);
  }
  // How loud a band is: its bin of 255, times Gain, at most 1.
  function loudness(bins, band, gain) {
    if (!bins || band >= bins.length) return 0;
    return Math.min(1, (bins[band] / 255) * gain);
  }
  // With the mic off and Idle animation on, the bands swell a little in turn.
  function idle(b, t) {
    return Math.max(0, 0.16 + 0.3 * Math.sin(0.9 * t + 1.4 * b));
  }
  // All but nothing is nothing, so that what dies away comes to rest.
  function settle(v) {
    return Math.abs(v) < 1e-4 ? 0 : v;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // A bird's call: its band, or the voice, whichever counts for more.
  function callOf(band, flame) {
    return Math.max(CALL[0] * band, CALL[1] * flame);
  }
  // A syllable: how much louder it has just become, at most 1.
  function pulseOf(flame, trail) {
    return clamp(PULSE * (flame - trail), 0, 1);
  }

  // ── One bird ────────────────────────────────────────────────────────────────

  // Beak toward +x, back toward +y: a body with a head, closed at both ends; a tail and a beak;
  // and two wings. `wing` is 0 for all but the wings; on a wing it is how far out along it the
  // point is (just above 0 at the root, 1 at the tip), with the sign of its side.
  function birdShape() {
    const NS = 12, NA = 8, pos = [], wing = [], tri = [];
    for (let s = 0; s <= NS; s++) {
      const t = s / NS, x = -0.5 + t;
      const r = s === 0 || s === NS ? 0
        : 0.17 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, 0.75) * 0.9)), 0.7) * (t < 0.72 ? 1 : Math.max(0, 1 - Math.pow((t - 0.72) / 0.5, 2)))
          + 0.115 * Math.exp(-Math.pow((t - 0.84) / 0.085, 2)) * (1 - Math.pow(Math.max(0, (t - 0.84) / 0.16), 3));
      for (let a = 0; a < NA; a++) { const g = (a / NA) * Math.PI * 2; pos.push(x, r * Math.cos(g), 0.9 * r * Math.sin(g)); wing.push(0); }
    }
    for (let s = 0; s < NS; s++) for (let a = 0; a < NA; a++) {
      const A = s * NA + a, B = s * NA + (a + 1) % NA, C = (s + 1) * NA + a, D = (s + 1) * NA + (a + 1) % NA;
      tri.push(A, B, C, B, D, C);
    }
    const flat = (pts, faces) => { const at = pos.length / 3; for (const p of pts) { pos.push(p[0], p[1], p[2]); wing.push(p[3]); } for (const f of faces) tri.push(at + f[0], at + f[1], at + f[2]); };
    flat([[-0.40, 0.02, 0, 0], [-0.98, 0.02, 0.17, 0], [-0.98, 0.02, -0.17, 0]], [[0, 2, 1]]);   // the tail
    flat([[0.46, 0.045, 0, 0], [0.46, -0.03, 0, 0], [0.68, -0.005, 0, 0], [0.46, 0.005, 0.04, 0], [0.46, 0.005, -0.04, 0]], [[0, 1, 2], [3, 2, 4]]);   // the beak
    for (const sd of [1, -1]) {
      flat([[0.20, 0.06, 0.1 * sd, 0.001 * sd], [-0.22, 0.06, 0.1 * sd, 0.001 * sd], [0.16, 0.06, 0.62 * sd, 0.5 * sd], [-0.32, 0.06, 0.62 * sd, 0.5 * sd], [-0.20, 0.06, 1.2 * sd, sd]],
        sd > 0 ? [[0, 1, 2], [1, 3, 2], [2, 3, 4]] : [[0, 2, 1], [1, 2, 3], [2, 4, 3]]);
    }
    const points = new Float32Array(pos), index = new Uint16Array(tri), normals = new Float32Array(points.length);
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
      const e1x = points[b] - points[a], e1y = points[b + 1] - points[a + 1], e1z = points[b + 2] - points[a + 2], e2x = points[c] - points[a], e2y = points[c + 1] - points[a + 1], e2z = points[c + 2] - points[a + 2];
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      for (const v of [a, b, c]) { normals[v] += nx; normals[v + 1] += ny; normals[v + 2] += nz; }
    }
    for (let j = 0; j < normals.length; j += 3) { const l = Math.hypot(normals[j], normals[j + 1], normals[j + 2]) || 1; normals[j] /= l; normals[j + 1] /= l; normals[j + 2] /= l; }
    return { points, normals, wing: new Float32Array(wing), index };
  }

  // ── The wires ───────────────────────────────────────────────────────────────

  // How high wire w hangs at x: from its two ends, sagging in the middle (more for the birds on
  // it), and swinging most in the middle.
  function wireY(fl, w, x) {
    const u = x / SPAN;
    return WIRE_Y[w] - (SAG + LOAD_SAG * fl.load[w]) * (1 - u * u) + fl.bounce[w] * Math.cos((Math.PI * x) / (2 * SPAN));
  }
  // How high bird i's middle is when it sits.
  function seatY(fl, i) {
    return wireY(fl, fl.wire[i], fl.seatX[i]) + PERCH * SIZE * fl.size[i];
  }
  // Wire w as a ribbon: two points for each of SEG + 1 places along it, above and below.
  function wirePoints(out, fl, w) {
    for (let j = 0; j <= SEG; j++) {
      const x = -SPAN + (2 * SPAN * j) / SEG, y = wireY(fl, w, x), q = j * 6;
      out[q] = x; out[q + 1] = y + WIRE_HALF; out[q + 2] = 0; out[q + 3] = x; out[q + 4] = y - WIRE_HALF; out[q + 5] = 0;
    }
  }

  // ── The flock ───────────────────────────────────────────────────────────────

  // Every bird there can be, with what is its own (its size, its nerve, how long it stays up,
  // its place by the lead, the way it sits), and n of them seated on the wires.
  // state: 0 sitting, 1 flying, 2 coming home.
  function createFlock(seed = SEED, n = WIRES * Math.round((PER_MIN + PER_MAX) / 2)) {
    const N = BIRDS_MAX, random = rng(seed);
    const fl = {
      p: new Float32Array(N * 3), v: new Float32Array(N * 3), head: new Float32Array(N * 3), state: new Int8Array(N),
      size: new Float32Array(N), nerve: new Float32Array(N), stay: new Float32Array(N), beat: new Float32Array(N), jit: new Float32Array(N), off: new Float32Array(N * 3), face: new Float32Array(N * 3),
      fold: new Float32Array(N), flap: new Float32Array(N), roll: new Float32Array(N), heard: new Float32Array(N),
      wire: new Int32Array(N), slot: new Int32Array(N), band: new Int32Array(N), seatX: new Float32Array(N),
      bounce: new Float32Array(WIRES), bounceV: new Float32Array(WIRES), load: new Float32Array(WIRES),
      hist: new Float32Array(HISTORY), at: 0, tau: 0, lead: [0, AIR_Y, 0], left: 0, n: 0, per: 0, sitting: 0, flying: 0, coming: 0,
    };
    for (let i = 0; i < N; i++) {
      const a = i * 3;
      fl.size[i] = 0.85 + 0.35 * random();
      fl.nerve[i] = NERVE[0] + NERVE[1] * random() * random();
      fl.stay[i] = STAY[0] + STAY[1] * random();
      fl.beat[i] = random() * 2 * Math.PI;
      fl.jit[i] = random() - 0.5;
      for (let c = 0; c < 3; c++) fl.off[a + c] = random() * 2 - 1;
      // Sitting, it is upright, seen a little from the front, turned a little to the left or the right.
      const fx = (random() < 0.5 ? -1 : 1) * (0.26 + 0.16 * random()), l = Math.hypot(fx, 0.85, 0.3);
      fl.face[a] = fx / l; fl.face[a + 1] = 0.85 / l; fl.face[a + 2] = 0.3 / l;
    }
    leadAt(fl.lead, 0, 0);
    reseat(fl, n);
    return fl;
  }
  // Bird i put on its seat: wings folded, heading the way it sits, hearing nothing.
  function sit(fl, i) {
    const a = i * 3;
    fl.state[i] = 0;
    fl.p[a] = fl.seatX[i]; fl.p[a + 1] = seatY(fl, i); fl.p[a + 2] = 0;
    fl.v[a] = fl.v[a + 1] = fl.v[a + 2] = 0;
    fl.head[a] = fl.face[a]; fl.head[a + 1] = fl.face[a + 1]; fl.head[a + 2] = fl.face[a + 2];
    fl.fold[i] = 1; fl.flap[i] = 0; fl.roll[i] = 0; fl.heard[i] = 0;
  }
  // Bird i lands on its seat. It folds its wings and turns to sit as it sits in its own time (see stepFlock).
  function perch(fl, i) {
    const a = i * 3;
    fl.state[i] = 0;
    fl.p[a] = fl.seatX[i]; fl.p[a + 1] = seatY(fl, i); fl.p[a + 2] = 0;
    fl.v[a] = fl.v[a + 1] = fl.v[a + 2] = 0;
    fl.heard[i] = 0;
  }
  // How many birds are sitting, flying and coming home.
  function tally(fl) {
    let sitting = 0, flying = 0, coming = 0;
    for (let i = 0; i < fl.n; i++) { if (fl.state[i] === 0) sitting++; else if (fl.state[i] === 1) flying++; else coming++; }
    fl.sitting = sitting; fl.flying = flying; fl.coming = coming;
  }
  // How much of each wire's seats are taken. (A step weighs the wires once, as it begins, so
  // that every bird that sits through it sits on the same wire.)
  function weigh(fl) {
    const on = [0, 0, 0];
    for (let i = 0; i < fl.n; i++) if (fl.state[i] === 0) on[fl.wire[i]]++;
    for (let w = 0; w < WIRES; w++) fl.load[w] = fl.per ? on[w] / fl.per : 0;
    tally(fl);
  }
  // The rows for n birds: bird i is on wire i % 3, in seat floor(i / 3) from the left, and
  // listens to the band of its stretch of wire. Birds that join sit; birds that sit move to
  // their new seats; a bird in the air flies on, and has a new seat to come home to.
  function reseat(fl, n) {
    const per = n / WIRES, was = fl.n;
    fl.n = n; fl.per = per;
    for (let i = 0; i < n; i++) {
      fl.wire[i] = i % WIRES; fl.slot[i] = Math.floor(i / WIRES);
      fl.seatX[i] = -REACH + (2 * REACH) * (fl.slot[i] + 0.5 + 0.3 * fl.jit[i]) / per + (fl.wire[i] - 1) * 0.04;
      fl.band[i] = Math.min(BANDS - 1, Math.floor((BANDS * fl.slot[i]) / per));
      if (i >= was) fl.state[i] = 0;
    }
    weigh(fl);
    for (let i = 0; i < n; i++) if (fl.state[i] === 0) sit(fl, i);
  }

  // Where the lead is after tau of its round: it wheels above the wires, wider the louder it is.
  function leadAt(out, tau, flame) {
    const wide = LEAD_WIDE[0] + LEAD_WIDE[1] * flame;
    out[0] = LEAD[0] * wide * Math.sin(0.62 * tau); out[1] = AIR_Y + LEAD[1] * Math.sin(0.97 * tau + 1.0); out[2] = LEAD[2] * wide * Math.sin(1.27 * tau + 0.4);
  }

  // Bird i leaves its wire (hard, in a fright), and the wire springs up after it. A bird
  // already in the air only goes on flying.
  function takeOff(fl, i, hard, random) {
    if (fl.state[i] === 0) {
      const a = i * 3, u = hard ? UP_HARD : UP;
      fl.v[a] = (random() - 0.5) * u[2]; fl.v[a + 1] = u[0] + u[1] * random(); fl.v[a + 2] = (random() - 0.2) * u[3];
      fl.bounceV[fl.wire[i]] += LEAVE;
    }
    fl.state[i] = 1;
  }

  // Bird i's own place: by the lead, `wide` times as far from it as it would be; or, when the
  // flock is `loose`, its own part of the air, wherever the lead is. Kept inside the air.
  function placeOf(out, fl, i, wide, loose) {
    const a = i * 3;
    let x = fl.lead[0] + PLACE[0] * wide * fl.off[a], y = fl.lead[1] + PLACE[1] * wide * fl.off[a + 1], z = fl.lead[2] + PLACE[2] * wide * fl.off[a + 2];
    if (loose) { x = AIR[0] * fl.off[a]; y = AIR_Y + AIR[1] * fl.off[a + 1]; z = AIR[2] * fl.off[a + 2]; }
    const e = Math.hypot(x / AIR[0], (y - AIR_Y) / AIR[1], z / AIR[2]);
    if (e > ROOM) { const k = ROOM / e; x *= k; y = AIR_Y + (y - AIR_Y) * k; z *= k; }
    out[0] = x; out[1] = y; out[2] = z;
  }

  // One step of the wires and of the first n birds. `how`: flame, bands, loose (a fright is on:
  // every bird stays up, and flies faster and wider), spread (from Cohesion), pulse, random.
  const Q = [0, 0, 0];
  function stepFlock(fl, n, how) {
    const flame = how.flame, cruise = CRUISE[0] + CRUISE[1] * flame, fast = how.loose ? LOOSE_FAST : 1, wide = how.spread, near2 = NEAR * NEAR;
    // The wires swing under what landed on them and what left, and come to rest.
    weigh(fl);
    for (let w = 0; w < WIRES; w++) {
      fl.bounceV[w] += STEP * (-SPRING * fl.bounce[w] - SPRING_DAMP * fl.bounceV[w]);
      fl.bounce[w] = clamp(fl.bounce[w] + STEP * fl.bounceV[w], -BOUNCE_MAX, BOUNCE_MAX);
      if (Math.abs(fl.bounce[w]) < 1e-6 && Math.abs(fl.bounceV[w]) < 1e-5) { fl.bounce[w] = 0; fl.bounceV[w] = 0; }
    }
    fl.tau += STEP * (LEAD_RATE[0] + LEAD_RATE[1] * flame);
    leadAt(fl.lead, fl.tau, flame);
    for (let i = 0; i < n; i++) {
      const a = i * 3;
      // What it hears: its call lasts it a while.
      if (callOf(how.bands[fl.band[i]], flame) > fl.nerve[i]) fl.heard[i] = fl.stay[i];
      else fl.heard[i] = Math.max(0, fl.heard[i] - STEP);
      const up = fl.heard[i] > 0 || how.loose;

      if (fl.state[i] === 0) {
        if (up) { takeOff(fl, i, false, how.random); continue; }
        // Sitting: it rides its wire, and settles exactly as it sits.
        fl.p[a] = fl.seatX[i]; fl.p[a + 1] = seatY(fl, i); fl.p[a + 2] = 0;
        fl.fold[i] += (1 - fl.fold[i]) * Math.min(1, FOLD_RATE * STEP);
        if (1 - fl.fold[i] < 1e-4) fl.fold[i] = 1;
        fl.flap[i] = settle(fl.flap[i] * 0.8); fl.roll[i] = settle(fl.roll[i] * 0.8);
        let turning = 0;
        for (let c = 0; c < 3; c++) { fl.head[a + c] += (fl.face[a + c] - fl.head[a + c]) * Math.min(1, FACE_RATE * STEP); turning = Math.max(turning, Math.abs(fl.face[a + c] - fl.head[a + c])); }
        if (turning < 1e-4) for (let c = 0; c < 3; c++) fl.head[a + c] = fl.face[a + c];
        continue;
      }
      if (fl.state[i] === 1 && !up) fl.state[i] = 2;
      else if (fl.state[i] === 2 && up) fl.state[i] = 1;

      const x = fl.p[a], y = fl.p[a + 1], z = fl.p[a + 2], ox = fl.v[a], oy = fl.v[a + 1], oz = fl.v[a + 2];
      let landing = 0;
      if (fl.state[i] === 1) {
        // The flock. A bird flies at its cruising speed and steers by turning: toward its own
        // place by the lead, more level than straight at it; off any bird too close and the
        // way the birds near it fly; and back from the edge of its air, which is above the wires.
        let sp = Math.hypot(ox, oy, oz) || 1e-6;
        const hx = ox / sp, hy = oy / sp, hz = oz / sp;
        placeOf(Q, fl, i, wide, how.loose);
        const tx = Q[0] - x, ty = Q[1] - y, tz = Q[2] - z, tl = Math.hypot(tx, ty, tz) || 1e-6;
        let dx = tx / tl, dy = LEVEL * ty / tl, dz = tz / tl, count = 0, vx = 0, vy = 0, vz = 0;
        for (let j = 0; j < n; j++) {
          if (j === i || fl.state[j] !== 1) continue;
          const c = j * 3, ex = fl.p[c] - x, ey = fl.p[c + 1] - y, ez = fl.p[c + 2] - z, d2 = ex * ex + ey * ey + ez * ez;
          if (d2 > near2) continue;
          const js = Math.hypot(fl.v[c], fl.v[c + 1], fl.v[c + 2]) || 1e-6;
          count++; vx += fl.v[c] / js; vy += fl.v[c + 1] / js; vz += fl.v[c + 2] / js;
          if (d2 < CLEAR * CLEAR) { const d = Math.sqrt(d2) || 1e-4, w = PART * (1 - d / CLEAR) / d; dx -= ex * w; dy -= ey * w; dz -= ez * w; }
        }
        if (count) { dx += ALIGN * (vx / count - hx); dy += ALIGN * (vy / count - hy); dz += ALIGN * (vz / count - hz); }
        let leaving = false;
        const ex = x / AIR[0], ey = (y - AIR_Y) / AIR[1], ez = z / AIR[2], e = Math.hypot(ex, ey, ez);
        if (e > WALL_FROM) {
          let nx = ex / AIR[0], ny = ey / AIR[1], nz = ez / AIR[2];
          const nl = Math.hypot(nx, ny, nz) || 1, push = WALL * (e - WALL_FROM);
          nx /= nl; ny /= nl; nz /= nl;
          dx -= push * nx; dy -= push * ny; dz -= push * nz;
          leaving = e > WALL_OUT && hx * nx + hy * ny + hz * nz > 0;
        }
        const dl = Math.hypot(dx, dy, dz) || 1e-6, turn = Math.min(1, (TURN[0] + TURN[1] * flame) * STEP);
        let nx = hx + (dx / dl - hx) * turn, ny = hy + (dy / dl - hy) * turn, nz = hz + (dz / dl - hz) * turn;
        const nl = Math.hypot(nx, ny, nz) || 1e-6;
        sp += (cruise * fast * clamp(0.7 + 0.5 * tl, 0.8, 1.3) - sp) * Math.min(1, SPEED_RATE * STEP);
        if (leaving) sp *= WALL_SLOW;
        fl.v[a] = (nx / nl) * sp; fl.v[a + 1] = (ny / nl) * sp; fl.v[a + 2] = (nz / nl) * sp;
        fl.fold[i] += (0 - fl.fold[i]) * Math.min(1, UNFOLD_RATE * STEP);
      } else {
        // Home: to above its seat, then down onto it, slowing, wings wide.
        const sx = fl.seatX[i], sy = seatY(fl, i), dx = sx - x, dy = sy - y, dz = -z, d = Math.hypot(dx, dy, dz);
        if (d < LANDED) { perch(fl, i); fl.bounceV[fl.wire[i]] -= LAND_KICK; continue; }
        landing = d < HOME_NEAR ? 1 : 0;
        const ty = dy + (landing ? 0 : HOME_HIGH), tl = Math.hypot(dx, ty, dz) || 1, sp = landing ? Math.max(HOME_SLOW[0], HOME_SLOW[1] * d) : Math.max(HOME_FAST, cruise);
        const k = Math.min(1, HOME_SEEK * STEP);
        fl.v[a] += ((dx / tl) * sp - ox) * k; fl.v[a + 1] += ((ty / tl) * sp - oy) * k; fl.v[a + 2] += ((dz / tl) * sp - oz) * k;
        fl.fold[i] += (0 - fl.fold[i]) * Math.min(1, UNFOLD_RATE * STEP);
      }
      let sp = Math.hypot(fl.v[a], fl.v[a + 1], fl.v[a + 2]);
      if (sp > TOP) { fl.v[a] *= TOP / sp; fl.v[a + 1] *= TOP / sp; fl.v[a + 2] *= TOP / sp; sp = TOP; }
      fl.p[a] += fl.v[a] * STEP; fl.p[a + 1] += fl.v[a + 1] * STEP; fl.p[a + 2] += fl.v[a + 2] * STEP;
      if (sp < 1e-6) continue;
      // It banks into its turn, beats harder to climb, to turn or to land, and glides when it sinks.
      const ax = (fl.v[a] - ox) / STEP, ay = (fl.v[a + 1] - oy) / STEP, az = (fl.v[a + 2] - oz) / STEP;
      const rx = -fl.v[a + 2], rz = fl.v[a], rl = Math.hypot(rx, rz) || 1, turned = (ax * rx + az * rz) / rl;   // how hard it is turning, to its right
      fl.roll[i] += (clamp(BANK * turned, -BANK_MAX, BANK_MAX) - fl.roll[i]) * Math.min(1, BANK_RATE * STEP);
      const want = landing ? 1 : fl.v[a + 1] < -0.45 ? 0.16 : clamp(0.5 + 0.35 * fl.v[a + 1] + 0.03 * Math.hypot(ax, ay, az), 0.4, 1);
      fl.flap[i] += (want - fl.flap[i]) * Math.min(1, FLAP_RATE * STEP);
      fl.beat[i] += STEP * (BEAT[0] + BEAT[1] * fl.flap[i]) / Math.sqrt(fl.size[i]);
      // It heads the way it flies; landing, it turns to sit the way it sits.
      const down = landing ? clamp(1 - Math.hypot(fl.seatX[i] - fl.p[a], seatY(fl, i) - fl.p[a + 1], fl.p[a + 2]) / HOME_NEAR, 0, 1) : 0;
      let hl = 0;
      for (let c = 0; c < 3; c++) { fl.head[a + c] += ((1 - down) * fl.v[a + c] / sp + down * fl.face[a + c] - fl.head[a + c]) * Math.min(1, TURN_HEAD * STEP); hl += fl.head[a + c] * fl.head[a + c]; }
      hl = Math.sqrt(hl) || 1;
      for (let c = 0; c < 3; c++) fl.head[a + c] /= hl;
    }
    fl.hist[fl.at] = how.pulse || 0; fl.at = (fl.at + 1) % HISTORY;
    tally(fl);
  }

  // The steps that have come due after dt more seconds: a step once half of it has (so that a
  // frame a little early or late is still one step at 60 frames a second), STEPS_MAX at most,
  // the rest forgotten. `left` is then how far the flock is behind its steps, or ahead of them.
  function advance(fl, n, dt, how) {
    fl.left += dt;
    let steps = 0;
    while (fl.left >= STEP / 2 && steps < STEPS_MAX) { stepFlock(fl, n, how); fl.left -= STEP; steps++; }
    if (fl.left >= STEP / 2) fl.left = 0;
    return steps;
  }

  // The fright: every one of the first n birds is up at once. One that was sitting leaves hard;
  // one already in the air is thrown off its way.
  function fright(fl, n, random) {
    for (let i = 0; i < n; i++) {
      const a = i * 3, sitting = fl.state[i] === 0;
      takeOff(fl, i, true, random);
      if (!sitting) { fl.v[a] += (random() - 0.5) * THROWN[0]; fl.v[a + 1] += THROWN[1] + THROWN[2] * random(); fl.v[a + 2] += (random() - 0.5) * THROWN[3]; }
    }
    weigh(fl);
  }

  // What each of the first n birds is sent, four numbers into A and four into B:
  //   A: its size, where its wings are in their beat, how far it has rolled, its band
  //   B: how hard it beats, how folded its wings are, its flash, nothing
  // `how`: kick (a beat), flash (a fright's), and lead: the seconds the flock is behind its
  // steps (fl.left). A bird in the air is sent its wings that much on in their beat; the scene
  // draws it that much further on along its way.
  function dress(A, B, fl, n, how) {
    const lead = how.lead || 0;
    for (let i = 0; i < n; i++) {
      const a = i * 3, q = i * 4, st = fl.state[i];
      // The ripple runs back through the flock: a bird further behind the lead banks later.
      const far = Math.hypot(fl.p[a] - fl.lead[0], fl.p[a + 1] - fl.lead[1], fl.p[a + 2] - fl.lead[2]), ago = Math.min(WAVE_MAX, Math.floor(far * WAVE));
      const wave = st === 1 ? fl.hist[(fl.at - 1 - ago + 2 * HISTORY) % HISTORY] : 0;
      const f = settle(Math.max(wave, st === 1 ? KICK_FLASH * how.kick : 0, st === 0 ? 0 : how.flash));
      A[q] = fl.size[i]; A[q + 1] = fl.beat[i] + (st === 0 ? 0 : lead * (BEAT[0] + BEAT[1] * fl.flap[i]) / Math.sqrt(fl.size[i]));
      A[q + 2] = fl.roll[i] + WAVE_ROLL * wave * (i % 2 ? 1 : -1); A[q + 3] = fl.band[i];
      B[q] = fl.flap[i]; B[q + 1] = fl.fold[i]; B[q + 2] = f; B[q + 3] = 0;
    }
  }

  // ── The camera ──────────────────────────────────────────────────────────────

  // How far the camera sways each way, in radians, for a Camera drift of 0 to 100.
  function swayFor(drift) {
    return SWAY * numberOr50(drift) / 50;
  }
  function orbitAt(t, drift) {
    return swayFor(drift) * Math.sin(ORBIT_RATE * t);
  }

  // ── The shaders ─────────────────────────────────────────────────────────────

  const VERT = `
    attribute float wing;
    attribute vec3 iPos, iVel, iFwd;
    attribute vec4 iA, iB;            // size, where its wings are in their beat, roll, band;  how hard it beats, how folded, flash, -
    uniform float uLen, uLead;
    varying vec3 vN, vW; varying float vBand, vFlash, vWing, vUp;
    void main() {
      vec3 p = position, n = normal;
      float t = abs(wing), sd = sign(wing);
      if (t > 0.0) {
        float z0 = 0.1 * sd, reach = (p.z - z0) * (1.0 - 0.94 * iB.y);
        // Folded, a wing lies close along the body, its tip toward the tail. Open, it beats about its root, the tip lagging.
        p.x = mix(p.x, -0.02 - 0.42 * t, iB.y); p.y = mix(p.y, 0.075 - 0.07 * t, iB.y);
        float ang = (1.0 - iB.y) * (0.14 + iB.x * sin(iA.y - 1.2 * t) * (0.3 + 0.7 * t));
        float c = cos(ang), s = sin(ang);
        p.y += abs(reach) * s; p.z = z0 + reach * c;
        n = vec3(0.0, c, -sd * s);
      }
      vec3 f = normalize(iFwd), r = normalize(cross(f, vec3(0.0, 1.0, 0.0)) + vec3(0.0, 0.0, 1e-5)), u = normalize(cross(r, f));
      float cr = cos(iA.z), sr = sin(iA.z);
      vec3 u2 = u * cr + r * sr, r2 = r * cr - u * sr;
      vec4 w = modelMatrix * vec4(iPos + iVel * uLead + iA.x * uLen * (f * p.x + u2 * p.y + r2 * p.z), 1.0);
      vUp = normal.y; vBand = iA.w; vFlash = iB.z; vWing = t;
      vW = w.xyz; vN = normalize(mat3(modelMatrix) * (f * n.x + u2 * n.y + r2 * n.z));
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const FRAG = `
    precision highp float;
    uniform vec3 uPal[6];
    varying vec3 vN, vW; varying float vBand, vFlash, vWing, vUp;
    vec3 pal(float u) {
      u = fract(u) * 6.0; int i = int(floor(u)); float f = u - floor(u); f = f * f * (3.0 - 2.0 * f);
      return mix(uPal[i], uPal[(i + 1) % 6], f);
    }
    void main() {
      vec3 n = normalize(vN); bool under = !gl_FrontFacing; if (under) n = -n;
      vec3 v = normalize(cameraPosition - vW);
      vec3 base = pal(vBand / 8.0);   // its band's colour: the wires are a spectrum, and it does not drift
      vec3 l1 = normalize(vec3(0.30, 0.85, 0.50)), l2 = normalize(vec3(-0.50, -0.50, 0.50));
      float d1 = max(dot(n, l1), 0.0), d2 = max(dot(n, l2), 0.0);
      float spec = pow(max(dot(n, normalize(l1 + v)), 0.0), 40.0);
      vec3 col;
      if (vWing > 0.0) {
        // A wing: its band's colour above, paler beneath, darker toward the tip.
        vec3 top = base * (1.0 - 0.45 * smoothstep(0.55, 1.0, vWing)), below = mix(base, vec3(1.0), 0.28);
        col = (under ? below : top) * (0.42 + 0.70 * d1 + 0.25 * d2) + vec3(1.0) * spec * (0.25 + 0.9 * vFlash) + base * 0.5 * vFlash;
      } else {
        // The body, the tail and the beak: dark above, with a pale breast.
        vec3 body = mix(mix(base, vec3(1.0), 0.35), base * 0.30 + vec3(0.03), smoothstep(-0.35, 0.45, vUp));
        col = body * (0.40 + 0.75 * d1 + 0.25 * d2) + vec3(1.0) * spec * 0.2 + base * 0.3 * vFlash;
      }
      gl_FragColor = vec4(col, 1.0);
    }`;
  const WIRE_VERT = `
    attribute float fade;
    varying float vFade;
    void main() { vFade = fade; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const WIRE_FRAG = `
    precision highp float;
    uniform vec3 uColor;
    varying float vFade;
    void main() { gl_FragColor = vec4(uColor, vFade); }`;

  // ── The scene ───────────────────────────────────────────────────────────────

  function definition() {
    const ID = 'boids';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name, otherwise = 50) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : otherwise;
    };
    const bands = new Float32Array(BANDS), flock = createFlock(SEED);
    const A = new Float32Array(BIRDS_MAX * 4), B = new Float32Array(BIRDS_MAX * 4);
    // The shatter machine counts its own pieces; these stand in for the birds, which fly in 3D here.
    const stubs = Array.from({ length: 4 }, () => ({ cx: 500, cy: 500 }));
    const how = { flame: 0, bands, loose: false, spread: 1, pulse: 0, random: null };
    const look = { kick: 0, flash: 0, lead: 0 };
    let THREE = null, HX = null, machine = null, group = null, birds = null, geo = null, sent = [], shared = null, wireMat = null, camera = null;
    const wires = [];
    let trail = 0;
    // What the checks read. clock: seconds the scene has been live. birds: how many there are.
    // sitting, flying, coming: how many are doing which. steps: flock steps taken this frame.
    // phase: the fright's (whole, pieces or returning); loose: whether it is on.
    const s = { flame: 0, kick: 0, clock: 0, live: false, orbit: 0, colorT: 0, birds: 0, sitting: 0, flying: 0, coming: 0, steps: 0, stepped: 0, beats: 0, pulse: 0, spread: 1,
      phase: 'whole', loose: false, thumps: 0, jostles: 0, flash: 0 };

    function build(k) {
      THREE = k.THREE;
      camera = k.camera;
      HX = TimbreHelix;
      machine = HX.createShatter({ random: HX.rng(7) });
      how.random = rng(7);
      group = new THREE.Group();
      reseat(flock, countFor(knob('density')));
      // The birds: one shape, drawn once for each bird, placed, rolled, beaten and folded by the numbers sent with it.
      const shape = birdShape();
      geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(shape.points, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(shape.normals, 3));
      geo.setAttribute('wing', new THREE.BufferAttribute(shape.wing, 1));
      geo.setIndex(new THREE.BufferAttribute(shape.index, 1));
      const each = (name, array, n) => { const at = new THREE.InstancedBufferAttribute(array, n).setUsage(THREE.DynamicDrawUsage); geo.setAttribute(name, at); sent.push(at); };
      each('iPos', flock.p, 3); each('iVel', flock.v, 3); each('iFwd', flock.head, 3); each('iA', A, 4); each('iB', B, 4);
      shared = { uPal: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Color()) }, uLen: { value: SIZE }, uLead: { value: 0 } };
      birds = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, uniforms: shared }));
      birds.frustumCulled = false;
      // The wires: thin ribbons that fade out toward their ends, drawn before the birds.
      wireMat = new THREE.ShaderMaterial({ vertexShader: WIRE_VERT, fragmentShader: WIRE_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uColor: { value: new THREE.Color() } } });
      for (let w = 0; w < WIRES; w++) {
        const g = new THREE.BufferGeometry(), pos = new Float32Array((SEG + 1) * 6), fade = new Float32Array((SEG + 1) * 2), index = [];
        for (let j = 0; j <= SEG; j++) {
          const x = -SPAN + (2 * SPAN * j) / SEG;
          fade[j * 2] = fade[j * 2 + 1] = clamp((SPAN - Math.abs(x)) / FADE, 0, 1);
          if (j < SEG) index.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 1, j * 2 + 3, j * 2 + 2);
        }
        wirePoints(pos, flock, w);
        const at = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
        g.setAttribute('position', at); g.setAttribute('fade', new THREE.BufferAttribute(fade, 1)); g.setIndex(index);
        const mesh = new THREE.Mesh(g, wireMat);
        mesh.frustumCulled = false; mesh.renderOrder = -1;
        group.add(mesh);
        wires.push({ pos, at, mesh });
      }
      group.add(birds);
      k.scene.add(group);
      dress(A, B, flock, BIRDS_MAX, look);
    }

    // The palette colour at t, as the shaders want it (linear), into c.
    function palette(c, t) {
      const p = getColor(t);
      return c.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = orbitAt(t, knob('cameraDrift'));

      // With the mic and Idle animation both off, the birds stop where they are.
      s.live = !!(micActive || cfgIdleAnim);
      if (s.live) s.clock += dt;
      const flame = s.flame = settle(audio.flame);
      s.kick = settle(audio.kick);
      const n = countFor(knob('density'));
      if (n !== flock.n) reseat(flock, n);   // Density changed: the rows close up or spread
      s.birds = geo.instanceCount = n;

      // Each band is followed: quick up, slower down.
      for (let b = 0; b < BANDS; b++) {
        let v = 0;
        if (micActive) v = loudness(frequencies, b, cfgGain);
        else if (cfgIdleAnim) v = idle(b, s.clock);
        bands[b] = follow(bands[b], v, v > bands[b] ? RISE : FALL, dt);
        if (v === 0) bands[b] = settle(bands[b]);
      }
      trail = follow(trail, flame, TRAIL, dt);
      s.pulse = pulseOf(flame, trail);
      if (audio.beat) s.beats++;

      // The fright. The machine says when: a hard peak with the mic on sends every bird up, a
      // peak while it lasts startles them again, and after a calm wait it is over. The peak is
      // the raw input level, before Gain, as DNA hears it. With nothing live no time passes for it.
      s.flash = settle(s.flash * Math.exp(-dt / FLASH_S));
      const event = machine.step({
        now, dt: s.live ? dt : 0, live: !!micActive,
        peak: typeof micPeak === 'number' ? micPeak : HX.peakOf(typeof waveform === 'undefined' ? null : waveform),
        threshold: HX.threshold(knob('frightSensitivity')), reconnectS: knob('settleSeconds', 3),
        W: 1000, H: 1000, scale: 1, cut: () => stubs,
      });
      if (event === 'shatter') {
        how.random = rng(1000 + ++s.thumps);   // each thump its own, and the same again another day
        fright(flock, n, how.random);
        s.flash = 1;
      } else if (event === 'jostle') {
        s.jostles++;
        fright(flock, n, how.random);
        s.flash = Math.max(s.flash, 0.6);
      } else if (event === 'reset') s.flash = 0;   // the page had stopped drawing: the fright is over
      s.phase = machine.state;
      s.loose = s.phase === 'pieces';

      // The flock flies, and is dressed.
      how.flame = flame; how.loose = s.loose; how.spread = s.spread = spreadFor(knob('cohesion')); how.pulse = s.pulse;
      s.steps = s.live ? advance(flock, n, dt, how) : 0;
      s.stepped += s.steps;
      s.sitting = flock.sitting; s.flying = flock.flying; s.coming = flock.coming;
      look.kick = s.kick; look.flash = s.flash; look.lead = flock.left;
      dress(A, B, flock, n, look);
      for (const at of sent) at.needsUpdate = true;
      shared.uLead.value = flock.left;
      for (let w = 0; w < WIRES; w++) { wirePoints(wires[w].pos, flock, w); wires[w].at.needsUpdate = true; }

      // The colours: six from round the palette for the bands to run through (they move only as the palette's own Colour speed moves them, so
      // that birds sitting in silence are exactly still). The wires are grey, with a little of the palette.
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      for (let i = 0; i < 6; i++) palette(shared.uPal.value[i], colorT + i * (PALETTE.length / 6));
      const g = getColor(colorT + PALETTE.length / 2);
      wireMat.uniforms.uColor.value.setRGB(0.32 + 0.14 * g[0] / 255, 0.32 + 0.14 * g[1] / 255, 0.35 + 0.14 * g[2] / 255, THREE.SRGBColorSpace);
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: PITCH,
      cooling: [LINGER, LINGER, LINGER],
      build,
      update,
      debug() {
        if (!birds) return Object.assign({}, s);
        const out = { r: 0, g: 0, b: 0 };
        const srgb = (c) => { c.getRGB(out, THREE.SRGBColorSpace); return [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)]; };
        const m = birds.material;
        const d = Object.assign({
          bands: Array.from(bands), trail, left: flock.left, per: flock.per, tau: flock.tau, lead: flock.lead.slice(),
          drawn: geo.instanceCount, shapePoints: geo.attributes.position.count, triangles: geo.index.count / 3,
          solid: m.transparent === false && m.depthTest === true && m.depthWrite === true && m.side === THREE.DoubleSide && m.blending === THREE.NormalBlending,
          wireSeeThrough: wireMat.transparent === true && wireMat.depthWrite === false && wireMat.blending === THREE.NormalBlending, wireColor: srgb(wireMat.uniforms.uColor.value),
          wireOrder: wires.map((w) => w.mesh.renderOrder), wirePieces: wires.map((w) => w.mesh.geometry.index.count / 6),
          pal: shared.uPal.value.map(srgb), given: [shared.uLen.value, shared.uLead.value],
          bounce: Array.from(flock.bounce), bounceV: Array.from(flock.bounceV), load: Array.from(flock.load),
          uploads: sent.map((at) => at.version).concat(wires.map((w) => w.at.version)),
          neverCulled: birds.frustumCulled === false && wires.every((w) => w.mesh.frustumCulled === false),
          // How the scene stands and how the camera saw the last frame, so that a check can say where on the canvas a bird was drawn.
          world: group.matrixWorld.toArray(), view: camera.matrixWorldInverse.toArray(), proj: camera.projectionMatrix.toArray(),
        }, s);
        // The long lists, made only when asked for.
        const n = flock.n;
        Object.defineProperty(d, 'points', { get: () => Array.from(flock.p.subarray(0, n * 3)) });
        Object.defineProperty(d, 'speeds', { get: () => Array.from(flock.v.subarray(0, n * 3)) });
        Object.defineProperty(d, 'headings', { get: () => Array.from(flock.head.subarray(0, n * 3)) });
        Object.defineProperty(d, 'states', { get: () => Array.from(flock.state.subarray(0, n)) });
        Object.defineProperty(d, 'bandOf', { get: () => Array.from(flock.band.subarray(0, n)) });
        Object.defineProperty(d, 'seats', { get: () => Array.from(flock.seatX.subarray(0, n)) });
        Object.defineProperty(d, 'sizes', { get: () => Array.from(flock.size.subarray(0, n)) });
        Object.defineProperty(d, 'sentA', { get: () => Array.from(A.subarray(0, n * 4)) });
        Object.defineProperty(d, 'sentB', { get: () => Array.from(B.subarray(0, n * 4)) });
        Object.defineProperty(d, 'wires', { get: () => wires.map((w) => Array.from(w.pos)) });
        return d;
      },
    };
  }

  globalThis.TimbreBoids = {
    BANDS, WIRES, PER_MIN, PER_MAX, BIRDS_MAX, SEED, STEP, STEPS_MAX, WIRE_Y, SPAN, REACH, SAG, LOAD_SAG, SEG, WIRE_HALF, FADE, SPRING, SPRING_DAMP, LEAVE, LAND_KICK, BOUNCE_MAX, SIZE, PERCH,
    AIR, AIR_Y, WALL, WALL_FROM, CRUISE, LOOSE_FAST, LEAD_RATE, LEAD, LEAD_WIDE, PLACE, TURN, SPEED_RATE, LEVEL, ALIGN, NEAR, CLEAR, PART, ROOM, WALL_OUT, WALL_SLOW, TOP, HOME_HIGH, HOME_NEAR, HOME_FAST, HOME_SLOW, HOME_SEEK, LANDED,
    UP, UP_HARD, THROWN, BANK, BANK_MAX, BANK_RATE, FLAP_RATE, BEAT, FOLD_RATE, UNFOLD_RATE, TURN_HEAD, FACE_RATE, NERVE, STAY, CALL, RISE, FALL, TRAIL, PULSE, HISTORY, WAVE, WAVE_MAX, WAVE_ROLL, KICK_FLASH, FLASH_S,
    SWAY, ORBIT_RATE, LINGER, FOV, PITCH, FRAME,
    VERT, FRAG, WIRE_VERT, WIRE_FRAG,
    countFor, spreadFor, loudness, idle, settle, rng, callOf, pulseOf, birdShape, wireY, seatY, wirePoints, createFlock, sit, perch, tally, weigh, reseat, leadAt, placeOf, takeOff, stepFlock, advance, fright, dress, swayFor, orbitAt, definition,
  };
})();
