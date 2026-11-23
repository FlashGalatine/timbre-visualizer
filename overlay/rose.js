// Timbre: the Rose effect, as `globalThis.TimbreRose`.
//
// One rose, made here and not loaded from a file, floats in the box: a leaning stem with two
// leaves, five sepals under the head, and a head of petals set in a spiral. In silence it is a
// small, neat rose with a smooth stem.
//
// The voice makes it grow. Thorns come out of the stem: each listens to one of the eight lowest
// bands, low at the foot and high under the head. Petals sprout: beyond the ones that are
// always there, each unfurls when its band sounds or the voice is loud enough for its nerve,
// and folds away in a pause. Each syllable is a ripple from the heart out through the petals
// and up the stem. A thump of the mic throws every petal off the head, and they fly round the
// box as a flock, tumbling, until after a calm wait each comes home to its own place.
//
// Everything here but `definition()` is arithmetic, so that `verify` can check it under Node.
// Valid as BOTH a classic <script> and an ES module (it only assigns `globalThis.TimbreRose`),
// the same trick as shared/viz-config.js. It follows boids.js closely.

(function () {
  'use strict';

  const BANDS = 8;                          // bands the rose listens to: the eight lowest bins
  const PETALS_MIN = 40, PETALS_MAX = 72;   // petals at Density 0 and at 100
  const KEPT = 0.43;                        // the share of its petals that are always out
  const SEPALS = 5, LEAVES = 2, LEAFLETS = 3;
  const FIXED = SEPALS + LEAVES * LEAFLETS; // blades that are not petals; they are drawn first
  const BLADES_MAX = FIXED + PETALS_MAX;
  const THORNS = 16;
  const SEED = 20261124;                    // what the rose is made from
  const STEP = 1 / 60, STEPS_MAX = 6;       // the rose's step, in seconds, and the most taken in one frame
  const NS = 8, NT = 14, TIP = 1.9;         // a blade's grid, across and along; its rows gather toward the tip, which is round

  // The stem.
  const FOOT = [-0.95, -1.50, -0.10], BEND = [-0.95, -0.70, 0.10], HEAD = [0.30, 0.30, 0.25];   // its foot, a point it bends by, and its top, where the head is
  const RUN = [0.30, 0.70, 0.65], NECK = 0.95;   // the way it runs into the head, and how far below the head it still bends
  const HEAD_TURN = [0.6, 0.5], BEND_SHARE = 0.3;   // how far the head's swaying turns the way it faces, and how much of the sway the bend makes
  const STEM_R = [0.052, 0.016, 0.07], FLARE = 0.92;   // the stem's radius at its foot, how much less at its top, and how much it widens into the head, from this share of the way up
  const STEM_RINGS = 44, DOME_RINGS = 5, STEM_AROUND = 10, THORN_RINGS = 4, THORN_AROUND = 6, STALK_RINGS = 4, STALK_AROUND = 5;
  const STALK_POINTS = (STEM_RINGS + DOME_RINGS) * STEM_AROUND + THORNS * THORN_RINGS * THORN_AROUND + LEAVES * STALK_RINGS * STALK_AROUND;
  const DOME = [0.012, 0.06, 0.55], BARE = [0.25, 0.9];   // the heart on the stem's top: how far it stands under the petals, how much further bare, and its width under them; and the share of petals gone between which it rises
  const HEAD_SWAY = [0.10, 0.02, 0.04], HEAD_RATE = [0.8, 1.3, 0.55];   // how far the head sways each way, and how fast
  const HEAD_QUIET = 0.25, HEAD_LIFT = 0.05;   // the share of its sideways sway in silence, and how far a loud voice lifts it
  const HEAD_SPRING = 60, HEAD_DAMP = 9;    // the head on its stem: how stiff, and how soon it stops
  const NOD = 1.1, NOD_LAND = 0.05;         // how hard a thump knocks the head down, and a petal landing

  // The head.
  const GOLDEN = 2.39996, TURN0 = 0.3, TURN_VARY = 0.2;   // each petal is this much further round than the last, from here, give or take half this
  const LONG = [0.40, 0.38, 1.2], WIDE = [0.80, 0.25], VARY = 0.1;   // a petal's length at the heart, how much more at the rim, and how that rises; its width, of its length, at the heart and how much more at the rim; and how much each may differ
  const ROOT = [0.015, 0.085], ROOT_UP = [0.07, -0.01];   // how far from the axis a petal grows, at the heart and how much more at the rim; how high, at the heart, and at the rim
  const LEAN = [-0.06, 0.40, 0.72], LEAN_FROM = [0.5, 1.05], LEAN_TOP = 1.12;   // how far a petal leans out, in radians: at the heart, how much more by the rim, and how much more again over the outer ranks, which alone open; the furthest rank counted
  const OPEN = [0.80, 0.28], GROWING = 0.35;   // the share of its lean a petal has in silence and how much more at the loudest; and the share of it a petal has as it begins to grow
  const WRAP = [0.065, 0.62, 1.1], WRAP_MAX = 4.4, WRAP_TOP = 1.05;   // the radius a petal is wrapped round: at the heart, how much more for its length by the rim, and how that rises; the most it wraps, in radians
  const CUP = [0.10, 0.10], ROLL = [0.02, 0.30, 1.5], ROLL_TOP = 1.1;   // how deep its cup is, and how far its tip rolls back, heart and rim
  const FULL_MIN = 0.3, FULL_RATE = 4;      // the least the head counts as full, and how fast its fullness is followed
  const BLOOM_RATE = [6, 1.6], KICK_BLOOM = 0.25;   // how fast the bloom opens and closes, and how much of a beat opens it
  const NERVE = [0.10, 0.46, 1.15, 0.06], STAY = [0.7, 0.9];   // a sprouting petal's nerve: the least, how much more by the rim and how that rises, and how much each may differ; how long it stays out after its call, at least, and how much longer it may
  const CALL = [1.25, 0.85];                // what its band and what the voice count for, as its call
  const GROW = [7, 1.5], REGROW = 8, LANDED_STAY = 1.2;   // how fast a petal grows and folds; how fast one grows in the air; how long one that has landed stays out
  const WAVE_SPAN = 16, WAVE_LEAN = 0.10;   // the ripple: steps from the heart to the rim, and how far it leans a petal out
  const WAVE_FLASH = 0.6, KICK_FLASH = 0.35, LOOSE_FLASH = 0.5, FLASH_S = 0.25;   // how much of the ripple, of a beat and of a thump a petal flashes by, and how long the flash of landing lasts

  // The thorns and the leaves.
  const THORN_SPAN = [0.07, 0.78], THORN_TURN = [2.4, 0.5];   // thorns stand from this share of the way up the stem, over this much of it; each this much further round than the last, from here
  const THORN_CALL = [1.3, 1.1, 0.12, 0.02];   // what its band and what the voice count for, less this, and less this again for each of five in turn
  const THORN_RATE = [16, 2.2];             // how fast a thorn grows and draws in
  const THORN_LONG = 0.26, THORN_WIDE = [0.014, 0.2], THORN_HOOK = [0.76, 0.38], THORN_WAVE = 0.5, THORN_MOST = 1.3;   // a thorn's length at Thorns 50; its radius, and how much more for its length; how far it hooks toward the foot; how much the ripple adds, and the most
  const STEM_WAVE = [8, 26];                // the ripple reaches the top of the stem after this many steps, and the foot this many later
  const LEAF_AT = [0.36, 0.60], LEAF_TURN = [2.5, 5.6];   // where the two leaves grow, of the way up, and round the stem
  const LEAF_OUT = [0.85, 0.5], LEAF_STALK = [0.24, 0.15, 0.018, 0.006];   // the way a leaf's stalk runs: out, and up the stem; its length, where the side leaflets grow, its radius and how much less at its end
  const LEAF_SWAY = [0.10, 1.7, 0.3], LEAF_WAVE = 0.30, LEAF_DROOP = 0.18;   // how far a leaf lifts and falls, how fast, and its share in silence; how far the ripple lifts it; how far the end leaflet droops
  const LEAFLET = [[0.60, 0.34], [0.44, 0.26]], LEAF_FAN = [0.55, 0.83], LEAF_SHAPE = [0.5, -0.06, 0.06];   // the end leaflet's length and width, and a side one's; the way a side one runs; a leaflet's wrap, cup and roll
  const SEPAL = [0.34, 0.14, 0.4, -0.08, 0.10], SEPAL_AT = [1.2566, 0.4, -0.015, 0.085], SEPAL_OUT = [0.90, -0.42];   // a sepal's length, width, wrap, cup and roll; how far round each is from the last, from where, how far below the head's top and how far out; the way it runs

  // The air.
  const AIR = [1.8, 0.7, 0.6], AIR_C = [0, -0.1, 0];   // the air loose petals keep to: an egg this far each way, about here
  const HARD = [2.0, 0.85, 0.75], HARD_FROM = 0.7, KEEP = 1.5;   // all the air there is: from this share of the way out a petal loses its speed outward, and at its edge it has none
  const CRUISE = [1.1, 0.9];                // how fast the flock flies in silence and how much faster at the loudest
  const LEAD_RATE = [0.45, 0.9], LEAD = [0.9, 0.3, 0.4], LEAD_WIDE = [0.7, 0.3], LEAD_UP = 0.05;   // how fast the lead goes round; how far it swings; the share of that in silence; how far above the middle of the air it keeps
  const PLACE = [1.1, 0.45, 0.45], ROOM = 0.85;   // how far from the lead a petal's own place may be, each way; and the share of its air a place is kept within
  const TURN = [3.5, 2], SPEED_RATE = 3, BRAKE = 8;   // how fast a loose petal turns, in radians a second, and how much faster at the loudest; how fast its speed rises to the speed it wants, and how fast it falls to it (a petal is light: thrown, it soon slows)
  const ALIGN = 0.7, NEAR = 0.9, CLEAR = 0.5, PART = 2.5;   // how much it takes the way its neighbours fly; how far it looks for them; how far apart two keep, and how hard they steer off each other
  const TOP = 3.2;                           // no petal flies faster than this
  const THROW = [1.2, 1.6, 0.3, 1.2, 1.2];  // a thump throws a petal off the head: out from the axis this fast and up to this much more, along the axis this fast and up to this much more, and up to half this any way
  const THROWN = [3, 2.2, 2, 0.3];          // one already in the air is thrown up to half this sideways, this much up or down (more up than down, by this share) and half this in depth
  const JOSTLE = 0.6;                       // how hard a peak throws them while they are loose, beside the thump's 1
  const HOME_OVER = 2, HOME_VARY = 0.25;    // they start for home over this long, from the heart outward, give or take this
  const HOME_NEAR = 0.5, HOME_AHEAD = 0.45; // until it is this near its place a petal makes for a point this far along the way it will grow
  const HOME_FAST = 2.4, HOME_SLOW = [0.3, 2.5], HOME_SEEK = [5, 10];   // how fast it comes home at least; near its place, its least speed and its speed for each unit left; how hard it steers, coming and landing
  const LANDED = 0.03, CATCH = 0.6;         // it has landed when this near its place, and no faster than this (faster, it flies on and comes round)
  const TURN_HEAD = 6, TUMBLE = [0.5, 0.5, 2];   // how fast a petal turns to head the way it flies; how much of its spin it has at rest in the air, how much more at cruising speed, and the most cruising speeds counted
  const LAND_TURN = 6, SEAT_TURN = 12;      // coming in to land it turns to lie as it will sit at this many radians a second; on the head it finishes turning at this many
  const SPIN = [3, 4];                      // a petal's spin about the way it flies, in radians a second: the least, and how much more it may have
  const ROCK = 0.45, ROCK_RATE = 0.6;       // how far a loose petal rocks, in radians, and how fast for its tumbling
  const LOOSEN = 6;                         // how fast the shape a petal is drawn with follows what it is doing: loose in the air, as it will sit by the time it lands, its own again on the head
  const AWAY = 0.74, FLAT = [1.3, 0.13, 0.10];   // a loose petal is drawn this much of its size, and is this wrapped, cupped and rolled
  const RISE = 20, FALL = 5;                // how fast a band is followed, up and down, a second
  const TRAIL = 8, PULSE = 5;               // how fast the loudness just past is forgotten, a second, and how much of a syllable a rise of 1 is
  const HISTORY = 64;                       // steps of the ripple remembered
  const SWAY = 0.14, ORBIT_RATE = 0.13;     // the camera: how far it sways each way at Camera drift 50, in radians, and how fast
  const LINGER = 0.08;                      // how long any light left behind takes to go, in seconds
  const FOV = 30, PITCH = 10;               // the camera: how wide it sees and how far it looks down, in degrees
  const FRAME = { width: 5.6, height: 3.2, center: [0, -0.2, 0] };   // what the camera frames
  const PETAL_HUES = 0.03;                  // how far round the palette the petals run, from the heart to the rim
  const GREEN = [0.07, 0.29, 0.14], GREEN_PALETTE = 0.05;   // the stem's and the leaves' green, and how much of the palette is in it

  // ── The settings and the sound ──────────────────────────────────────────────

  const numberOr50 = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 50);
  // Density (0 to 100) to a number of petals.
  function countFor(density) {
    return Math.round(PETALS_MIN + (PETALS_MAX - PETALS_MIN) * numberOr50(density) / 100);
  }
  // How many of n petals are always out.
  function keptFor(n) {
    return Math.round(KEPT * n);
  }
  // Thorns (0 to 100) to how long a thorn grows: none at 0, twice as long at 100.
  function thornFor(thorns) {
    return THORN_LONG * numberOr50(thorns) / 50;
  }
  // How loud a band is: its bin of 255, times Gain, at most 1.
  function loudness(bins, band, gain) {
    if (!bins || band >= bins.length) return 0;
    return Math.min(1, (bins[band] / 255) * gain);
  }
  // With the mic off and Idle animation on, the bands swell a little in turn: each for about a
  // third of the time, and not enough for the petals nearest the rim.
  function idle(b, t) {
    return Math.max(0, 0.45 * Math.sin(0.45 * t + 1.4 * b) - 0.2);
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
  const ease = (t) => t * t * (3 - 2 * t);
  const smooth = (a, b, v) => ease(clamp((v - a) / (b - a), 0, 1));
  const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // The unit vector a, turned toward the unit vector b by at most `most` radians (all the way if b is nearer than that),
  // into out. When they are opposite it turns by way of (sx, sy, sz), which is square to a.
  function toward(out, ax, ay, az, bx, by, bz, most, sx, sy, sz) {
    const c = clamp(ax * bx + ay * by + az * bz, -1, 1);
    if (Math.acos(c) <= most) { out[0] = bx; out[1] = by; out[2] = bz; return; }
    let ex = bx - ax * c, ey = by - ay * c, ez = bz - az * c, el = Math.hypot(ex, ey, ez);
    if (el < 1e-6) { ex = sx; ey = sy; ez = sz; el = Math.hypot(ex, ey, ez) || 1; }
    const cm = Math.cos(most), sm = Math.sin(most) / el;
    out[0] = ax * cm + ex * sm; out[1] = ay * cm + ey * sm; out[2] = az * cm + ez * sm;
  }
  // A sprouting petal's call: its band, or the voice, whichever counts for more.
  function callOf(band, flame) {
    return Math.max(CALL[0] * band, CALL[1] * flame);
  }
  // How far thorn j wants to be out, 0 to 1: its band, or a loud voice.
  function thornCall(band, flame, j) {
    return clamp(Math.max(THORN_CALL[0] * band, THORN_CALL[1] * flame - THORN_CALL[2] - THORN_CALL[3] * (j % 5)), 0, 1);
  }
  // A syllable: how much louder it has just become, at most 1.
  function pulseOf(flame, trail) {
    return clamp(PULSE * (flame - trail), 0, 1);
  }

  // ── The stem ────────────────────────────────────────────────────────────────

  // Where the stem is a share t of the way up (at), the way it runs there (run), and two
  // directions across it (e1, toward the right of the picture, and e2).
  function stemAt(ro, t) {
    const m = 1 - t, a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t, c0 = ro.c0, c1 = ro.c1, c2 = ro.c2, c3 = ro.c3, at = [0, 0, 0], run = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      at[k] = a * c0[k] + b * c1[k] + c * c2[k] + d * c3[k];
      run[k] = 3 * m * m * (c1[k] - c0[k]) + 6 * m * t * (c2[k] - c1[k]) + 3 * t * t * (c3[k] - c2[k]);
    }
    const T = unit(run), e1 = unit([1 - T[0] * T[0], -T[1] * T[0], -T[2] * T[0]]);
    return { at, run: T, e1, e2: cross(T, e1) };
  }
  // The stem's radius a share t of the way up: thinner toward the top, then widening into the head.
  function stemRadius(t) {
    return STEM_R[0] - STEM_R[1] * t + STEM_R[2] * smooth(FLARE, 1, t);
  }
  // The stem's curve and the head's frame, from where the head has swayed to.
  function curve(ro) {
    const h = ro.head, top = unit([RUN[0] + HEAD_TURN[0] * h[0], RUN[1] + HEAD_TURN[1] * h[1], RUN[2]]);
    for (let k = 0; k < 3; k++) {
      ro.top[k] = top[k]; ro.c0[k] = FOOT[k]; ro.c3[k] = HEAD[k] + h[k];
      ro.c2[k] = ro.c3[k] - NECK * top[k]; ro.c1[k] = BEND[k] + BEND_SHARE * h[k];
    }
    const hx = unit([1 - top[0] * top[0], -top[1] * top[0], -top[2] * top[0]]), hy = cross(top, hx);
    for (let k = 0; k < 3; k++) { ro.hx[k] = hx[k]; ro.hy[k] = hy[k]; }
  }

  // ── The rose ────────────────────────────────────────────────────────────────

  // The ripple as it was `ago` steps back.
  function rippleAt(ro, ago) {
    return ro.hist[(ro.at - 1 - clamp(Math.floor(ago), 0, HISTORY - 4) + 2 * HISTORY) % HISTORY];
  }
  // Every petal there can be, with what is its own, and n of them on the head.
  // state: 0 on the head, 1 flying, 2 coming home.
  function createRose(seed = SEED, n = Math.round((PETALS_MIN + PETALS_MAX) / 2)) {
    const N = PETALS_MAX, random = rng(seed);
    const ro = {
      p: new Float32Array(N * 3), v: new Float32Array(N * 3), fwd: new Float32Array(N * 3), nrm: new Float32Array(N * 3), off: new Float32Array(N * 3), state: new Int8Array(N),
      vary: new Float32Array(N * 4), stayFor: new Float32Array(N), spin: new Float32Array(N),
      len: new Float32Array(N), wid: new Float32Array(N), turn: new Float32Array(N), nerve: new Float32Array(N), band: new Int32Array(N),
      grown: new Float32Array(N), heard: new Float32Array(N), loose: new Float32Array(N), psi: new Float32Array(N), homeAt: new Float32Array(N), flash: new Float32Array(N),
      // Where each belongs on the head just now: its base, the way it grows, its inner face, the way out from the axis; and its shape (wrap, cup, roll).
      base: new Float32Array(N * 3), grow: new Float32Array(N * 3), face: new Float32Array(N * 3), out: new Float32Array(N * 3), shape: new Float32Array(N * 3),
      c0: [0, 0, 0], c1: [0, 0, 0], c2: [0, 0, 0], c3: [0, 0, 0], top: [0, 0, 1], hx: [1, 0, 0], hy: [0, 1, 0],
      head: [0, 0, 0], headV: [0, 0, 0], bloom: 0, full: KEPT, thorn: new Float32Array(THORNS),
      hist: new Float32Array(HISTORY), at: 0, tau: 0, lead: [0, 0, 0], time: 0, left: 0, homing: false,
      n: 0, kept: 0, attached: 0, flying: 0, coming: 0, open: 0,
    };
    for (let i = 0; i < N; i++) {
      const a = i * 3;
      for (let c = 0; c < 4; c++) ro.vary[i * 4 + c] = random();
      ro.stayFor[i] = STAY[0] + STAY[1] * random();
      ro.spin[i] = (random() < 0.5 ? -1 : 1) * (SPIN[0] + SPIN[1] * random());
      for (let c = 0; c < 3; c++) ro.off[a + c] = random() * 2 - 1;
    }
    leadAt(ro.lead, 0, 0);
    lay(ro, n);
    return ro;
  }
  // Petal i is on the head, in its place, lying as it sits there.
  function seat(ro, i) {
    const a = i * 3;
    ro.state[i] = 0; ro.loose[i] = 0;
    for (let k = 0; k < 3; k++) { ro.p[a + k] = ro.base[a + k]; ro.v[a + k] = 0; ro.fwd[a + k] = ro.grow[a + k]; ro.nrm[a + k] = ro.face[a + k]; }
  }
  // Petal i lands in its place. It keeps the way it is turned and the shape it has, and takes the way it sits
  // and its own shape over the next steps (see stepRose).
  function perch(ro, i) {
    const a = i * 3;
    ro.state[i] = 0;
    for (let k = 0; k < 3; k++) { ro.p[a + k] = ro.base[a + k]; ro.v[a + k] = 0; }
  }
  // How many petals are on the head, flying and coming home, and how many on the head are out.
  function tally(ro) {
    let attached = 0, flying = 0, coming = 0, open = 0;
    for (let i = 0; i < ro.n; i++) {
      if (ro.state[i] === 0) { attached++; if (ro.grown[i] > 0.5) open++; } else if (ro.state[i] === 1) flying++; else coming++;
    }
    ro.attached = attached; ro.flying = flying; ro.coming = coming; ro.open = open;
  }
  // How full the head is: the share of its petals that are out on it, or on their way to it.
  function fullOf(ro) {
    let sum = 0;
    for (let i = 0; i < ro.n; i++) sum += ro.state[i] === 0 ? ease(ro.grown[i]) : ro.state[i] === 2 ? 1 : 0;
    return clamp(sum / ro.n, FULL_MIN, 1);
  }
  // The head for n petals: petal i is the i-th from the heart, a little larger and wider than
  // the last, and listens to band i % 8. The first `kept` of them are out; the rest are folded
  // away, and each of those has a nerve, greater the nearer the rim it is. Every petal is on
  // the head: one that was in the air is back at once.
  function lay(ro, n) {
    const kept = keptFor(n);
    ro.n = n; ro.kept = kept; ro.homing = false; ro.full = kept / n;
    for (let i = 0; i < n; i++) {
      const q = i * 4, u = n > 1 ? i / (n - 1) : 0, o = Math.max(0, i - kept) / Math.max(1, n - kept);
      ro.len[i] = (LONG[0] + LONG[1] * Math.pow(u, LONG[2])) * (1 - VARY / 2 + VARY * ro.vary[q]);
      ro.wid[i] = ro.len[i] * (WIDE[0] + WIDE[1] * u) * (1 - VARY / 2 + VARY * ro.vary[q + 1]);
      ro.turn[i] = i * GOLDEN + TURN0 + TURN_VARY * (ro.vary[q + 2] - 0.5);
      ro.band[i] = i % BANDS;
      ro.nerve[i] = NERVE[0] + NERVE[1] * Math.pow(o, NERVE[2]) + NERVE[3] * ro.vary[q + 3];
      ro.grown[i] = i < kept ? 1 : 0; ro.heard[i] = 0; ro.flash[i] = 0; ro.psi[i] = 0; ro.homeAt[i] = 0;
    }
    pose(ro);
    for (let i = 0; i < n; i++) seat(ro, i);
    tally(ro);
  }
  // Where the stem and the head are, and where each petal belongs on the head: how far a petal
  // leans out goes by its rank among the petals now out (its rank over how full the head is),
  // so that the outermost petals of a small rose open as the outermost of a large one do.
  function pose(ro) {
    curve(ro);
    const n = ro.n, top = ro.top, hx = ro.hx, hy = ro.hy, c3 = ro.c3, open = OPEN[0] + OPEN[1] * ro.bloom;
    for (let i = 0; i < n; i++) {
      const a = i * 3, u = n > 1 ? i / (n - 1) : 0, x = u / ro.full, x1 = Math.min(x, 1), xl = Math.min(x, LEAN_TOP), g = ease(ro.grown[i]);
      const lean = (LEAN[0] + LEAN[1] * xl + LEAN[2] * smooth(LEAN_FROM[0], LEAN_FROM[1], xl)) * open * (GROWING + (1 - GROWING) * g) + WAVE_LEAN * rippleAt(ro, WAVE_SPAN * u) * x1;
      const ct = Math.cos(ro.turn[i]), st = Math.sin(ro.turn[i]), cl = Math.cos(lean), sl = Math.sin(lean);
      const rho = ROOT[0] + ROOT[1] * x1, up = ROOT_UP[0] * (1 - x1) + ROOT_UP[1];
      for (let k = 0; k < 3; k++) {
        const o = hx[k] * ct + hy[k] * st;
        ro.out[a + k] = o; ro.base[a + k] = c3[k] + top[k] * up + o * rho;
        ro.grow[a + k] = cl * top[k] + sl * o; ro.face[a + k] = sl * top[k] - cl * o;
      }
      ro.shape[a] = Math.min(WRAP_MAX, ro.wid[i] / (WRAP[0] + WRAP[1] * ro.len[i] * Math.pow(Math.min(x, WRAP_TOP), WRAP[2])));
      ro.shape[a + 1] = CUP[0] + CUP[1] * x1;
      ro.shape[a + 2] = ROLL[0] + ROLL[1] * Math.pow(Math.min(x, ROLL_TOP), ROLL[2]);
    }
  }

  // Where the lead is after tau of its round: it wheels round the box, wider the louder it is.
  function leadAt(out, tau, flame) {
    const wide = LEAD_WIDE[0] + LEAD_WIDE[1] * flame;
    out[0] = AIR_C[0] + LEAD[0] * wide * Math.sin(0.62 * tau); out[1] = AIR_C[1] + LEAD_UP + LEAD[1] * Math.sin(0.97 * tau + 1.0); out[2] = AIR_C[2] + LEAD[2] * wide * Math.sin(1.27 * tau + 0.4);
  }

  // A thump: every one of the first n petals leaves the head, thrown out from its axis and
  // along it; one already in the air is thrown off its way. Each then flies alone for a while.
  function scatter(ro, n, strength, random) {
    for (let i = 0; i < n; i++) {
      const a = i * 3;
      if (ro.state[i] === 0) {
        const o = THROW[0] + THROW[1] * random(), u = THROW[2] + THROW[3] * random();
        for (let k = 0; k < 3; k++) ro.v[a + k] = strength * (ro.out[a + k] * o + ro.top[k] * u + (random() - 0.5) * THROW[4]);
      } else {
        ro.v[a] += strength * (random() - 0.5) * THROWN[0]; ro.v[a + 1] += strength * (random() - THROWN[3]) * THROWN[1]; ro.v[a + 2] += strength * (random() - 0.5) * THROWN[2];
      }
      ro.state[i] = 1;
    }
    ro.homing = false;
    ro.headV[1] -= NOD * strength;
    tally(ro);
  }
  // The calm wait is over: the petals start for home, from the heart outward.
  function gather(ro, n, random) {
    ro.homing = true;
    for (let i = 0; i < n; i++) ro.homeAt[i] = ro.time + HOME_OVER * (n > 1 ? i / (n - 1) : 0) + HOME_VARY * random();
  }

  // Petal i's own place in the air: by the lead, to one side of it or the other, above or below, nearer or
  // further, and kept inside the air.
  function placeOf(out, ro, i) {
    const a = i * 3;
    let qx = ro.lead[0] + PLACE[0] * ro.off[a] - AIR_C[0], qy = ro.lead[1] + PLACE[1] * ro.off[a + 1] - AIR_C[1], qz = ro.lead[2] + PLACE[2] * ro.off[a + 2] - AIR_C[2];
    const room = Math.hypot(qx / AIR[0], qy / AIR[1], qz / AIR[2]);
    if (room > ROOM) { qx *= ROOM / room; qy *= ROOM / room; qz *= ROOM / room; }
    out[0] = AIR_C[0] + qx; out[1] = AIR_C[1] + qy; out[2] = AIR_C[2] + qz;
  }
  const T3 = [0, 0, 0], Q = [0, 0, 0];
  // The petal whose numbers start at `a` is turned toward the way it sits, by at most `most` radians in all: the
  // way it grows first, then, with what is left of that, its face about it (kept across the way it grows).
  function turnTo(ro, a, most) {
    const first = Math.min(most, Math.acos(clamp(ro.fwd[a] * ro.grow[a] + ro.fwd[a + 1] * ro.grow[a + 1] + ro.fwd[a + 2] * ro.grow[a + 2], -1, 1)));
    toward(T3, ro.fwd[a], ro.fwd[a + 1], ro.fwd[a + 2], ro.grow[a], ro.grow[a + 1], ro.grow[a + 2], most, ro.nrm[a], ro.nrm[a + 1], ro.nrm[a + 2]);
    const fx = T3[0], fy = T3[1], fz = T3[2];
    let nx = ro.nrm[a], ny = ro.nrm[a + 1], nz = ro.nrm[a + 2];
    const along = nx * fx + ny * fy + nz * fz;
    nx -= fx * along; ny -= fy * along; nz -= fz * along;
    let nl = Math.hypot(nx, ny, nz);
    if (nl < 1e-4) { if (Math.abs(fy) < 0.9) { nx = -fz; ny = 0; nz = fx; } else { nx = 0; ny = fz; nz = -fy; } nl = Math.hypot(nx, ny, nz); }
    nx /= nl; ny /= nl; nz /= nl;
    let gx = ro.face[a], gy = ro.face[a + 1], gz = ro.face[a + 2];
    const over = gx * fx + gy * fy + gz * fz;
    gx -= fx * over; gy -= fy * over; gz -= fz * over;
    const gl = Math.hypot(gx, gy, gz);
    if (gl > 1e-4 && most - first > 1e-9) { toward(T3, nx, ny, nz, gx / gl, gy / gl, gz / gl, most - first, fy * nz - fz * ny, fz * nx - fx * nz, fx * ny - fy * nx); nx = T3[0]; ny = T3[1]; nz = T3[2]; }
    ro.fwd[a] = fx; ro.fwd[a + 1] = fy; ro.fwd[a + 2] = fz; ro.nrm[a] = nx; ro.nrm[a + 1] = ny; ro.nrm[a + 2] = nz;
  }
  // One step of the head, the thorns and each of the first n petals.
  // `how`: flame (the voice, 0 to 1), kick (a beat, 1 and dying away), bands (the eight bands'
  // loudness), pulse (the syllable), mic (whether the mic is on: thorns are the mic's alone).
  function stepRose(ro, n, how) {
    const flame = how.flame, bands = how.bands, t = ro.time;
    // The head sways on its stem, more for a loud voice, and nods when it is knocked.
    const loud = HEAD_QUIET + (1 - HEAD_QUIET) * flame;
    for (let k = 0; k < 3; k++) {
      const want = k === 0 ? HEAD_SWAY[0] * Math.sin(HEAD_RATE[0] * t) * loud : k === 1 ? HEAD_LIFT * flame + HEAD_SWAY[1] * Math.sin(HEAD_RATE[1] * t) : HEAD_SWAY[2] * Math.sin(HEAD_RATE[2] * t + 1);
      ro.headV[k] += STEP * (-HEAD_SPRING * (ro.head[k] - want) - HEAD_DAMP * ro.headV[k]);
      ro.head[k] += STEP * ro.headV[k];
    }
    // The bloom opens with the voice, and a little further on a beat.
    const bloom = Math.min(1, flame + KICK_BLOOM * (how.kick || 0));
    ro.bloom = settle(ro.bloom + (bloom - ro.bloom) * Math.min(1, (bloom > ro.bloom ? BLOOM_RATE[0] : BLOOM_RATE[1]) * STEP));
    ro.full += (fullOf(ro) - ro.full) * Math.min(1, FULL_RATE * STEP);
    pose(ro);
    for (let j = 0; j < THORNS; j++) {
      const w = how.mic ? thornCall(bands[Math.min(BANDS - 1, Math.floor((j * BANDS) / THORNS))], flame, j) : 0;
      ro.thorn[j] = settle(ro.thorn[j] + (w - ro.thorn[j]) * Math.min(1, (w > ro.thorn[j] ? THORN_RATE[0] : THORN_RATE[1]) * STEP));
    }
    const cruise = CRUISE[0] + CRUISE[1] * flame;
    ro.tau += STEP * (LEAD_RATE[0] + LEAD_RATE[1] * flame);
    leadAt(ro.lead, ro.tau, flame);
    const p = ro.p, v = ro.v;
    for (let i = 0; i < n; i++) {
      const a = i * 3;
      // A petal beyond the ones always out sprouts when its band sounds, or when the voice is loud enough for it.
      if (callOf(bands[ro.band[i]], flame) > ro.nerve[i]) ro.heard[i] = ro.stayFor[i];
      ro.heard[i] = Math.max(0, ro.heard[i] - STEP);
      const wanted = i < ro.kept || ro.heard[i] > 0 ? 1 : 0;
      ro.flash[i] = settle(ro.flash[i] * Math.exp(-STEP / FLASH_S));
      if (ro.state[i] === 0) {
        ro.grown[i] = clamp(ro.grown[i] + (wanted - ro.grown[i]) * Math.min(1, (wanted ? GROW[0] : GROW[1]) * STEP), 0, 1);
        if (!wanted) ro.grown[i] = settle(ro.grown[i]);
        ro.loose[i] = settle(ro.loose[i] - ro.loose[i] * Math.min(1, LOOSEN * STEP));
        for (let k = 0; k < 3; k++) { p[a + k] = ro.base[a + k]; v[a + k] = 0; }
        // It lies as it sits: at once, unless it has just landed turned some other way, when it turns to that
        // at a limited rate (the way it grows, then its face about that).
        const most = SEAT_TURN * STEP, near = Math.cos(most);
        if (ro.fwd[a] * ro.grow[a] + ro.fwd[a + 1] * ro.grow[a + 1] + ro.fwd[a + 2] * ro.grow[a + 2] >= near && ro.nrm[a] * ro.face[a] + ro.nrm[a + 1] * ro.face[a + 1] + ro.nrm[a + 2] * ro.face[a + 2] >= near) {
          for (let k = 0; k < 3; k++) { ro.fwd[a + k] = ro.grow[a + k]; ro.nrm[a + k] = ro.face[a + k]; }
        } else turnTo(ro, a, most);
        continue;
      }
      ro.grown[i] += (1 - ro.grown[i]) * Math.min(1, REGROW * STEP);
      if (ro.state[i] === 1 && ro.homing && t >= ro.homeAt[i]) ro.state[i] = 2;
      let ax = 0, ay = 0, az = 0, land = 0;
      if (ro.state[i] === 1) {
        // The flock. A petal flies at its cruising speed and steers by turning: toward its own
        // place by the lead (which is inside its air), off any petal too close and
        // the way the petals near it fly.
        placeOf(Q, ro, i);
        const tx = Q[0] - p[a], ty = Q[1] - p[a + 1], tz = Q[2] - p[a + 2], tl = Math.hypot(tx, ty, tz) || 1e-6;
        let was = Math.hypot(v[a], v[a + 1], v[a + 2]) || 1e-6;
        const hx = v[a] / was, hy = v[a + 1] / was, hz = v[a + 2] / was;
        let dx = tx / tl, dy = ty / tl, dz = tz / tl, m = 0, vx = 0, vy = 0, vz = 0;
        for (let j = 0; j < n; j++) {
          if (j === i || ro.state[j] !== 1) continue;
          const c = j * 3, ex = p[c] - p[a], ey = p[c + 1] - p[a + 1], ez = p[c + 2] - p[a + 2], d2 = ex * ex + ey * ey + ez * ez;
          if (d2 > NEAR * NEAR) continue;
          const js = Math.hypot(v[c], v[c + 1], v[c + 2]) || 1e-6;
          m++; vx += v[c] / js; vy += v[c + 1] / js; vz += v[c + 2] / js;
          if (d2 < CLEAR * CLEAR) { const d = Math.sqrt(d2) || 1e-4, w = PART * (1 - d / CLEAR) / d; dx -= ex * w; dy -= ey * w; dz -= ez * w; }
        }
        if (m) { dx += ALIGN * (vx / m - hx); dy += ALIGN * (vy / m - hy); dz += ALIGN * (vz / m - hz); }
        const dl = Math.hypot(dx, dy, dz) || 1e-6, turn = Math.min(1, (TURN[0] + TURN[1] * flame) * STEP);
        let nx = hx + (dx / dl - hx) * turn, ny = hy + (dy / dl - hy) * turn, nz = hz + (dz / dl - hz) * turn;
        const nl = Math.hypot(nx, ny, nz) || 1e-6;
        const wants = cruise * clamp(0.7 + 0.5 * tl, 0.8, 1.3);
        was += (wants - was) * Math.min(1, (was > wants ? BRAKE : SPEED_RATE) * STEP);
        // (What it is given here is the speed it has after the step, so nothing is added below.)
        ax = ((nx / nl) * was - v[a]) / STEP; ay = ((ny / nl) * was - v[a + 1]) / STEP; az = ((nz / nl) * was - v[a + 2]) / STEP;
        ro.loose[i] += (1 - ro.loose[i]) * Math.min(1, LOOSEN * STEP);
      } else {
        // Home: to its own place on the head, by a point a little way along the way it will grow, slowing as it comes.
        const dx = ro.base[a] - p[a], dy = ro.base[a + 1] - p[a + 1], dz = ro.base[a + 2] - p[a + 2], d = Math.hypot(dx, dy, dz);
        if (d < LANDED && Math.hypot(v[a], v[a + 1], v[a + 2]) < CATCH) { perch(ro, i); ro.flash[i] = 1; ro.heard[i] = LANDED_STAY; ro.headV[1] -= NOD_LAND; continue; }
        const near = d < HOME_NEAR, ahead = near ? 0 : HOME_AHEAD;
        const tx = dx + ahead * ro.grow[a], ty = dy + ahead * ro.grow[a + 1], tz = dz + ahead * ro.grow[a + 2], tl = Math.hypot(tx, ty, tz) || 1;
        const sp = near ? Math.max(HOME_SLOW[0], HOME_SLOW[1] * d) : Math.max(HOME_FAST, cruise);
        const seek = HOME_SEEK[near ? 1 : 0];
        ax = ((tx / tl) * sp - v[a]) * seek; ay = ((ty / tl) * sp - v[a + 1]) * seek; az = ((tz / tl) * sp - v[a + 2]) * seek;
        land = clamp(1 - (d - LANDED) / (HOME_NEAR - LANDED), 0, 1);
        // The nearer its place, the more it is drawn as it will sit; and that too is eased.
        ro.loose[i] += (1 - land - ro.loose[i]) * Math.min(1, LOOSEN * STEP);
      }
      v[a] += ax * STEP; v[a + 1] += ay * STEP; v[a + 2] += az * STEP;
      let sp = Math.hypot(v[a], v[a + 1], v[a + 2]) || 1e-4;
      if (sp > TOP) { v[a] *= TOP / sp; v[a + 1] *= TOP / sp; v[a + 2] *= TOP / sp; sp = TOP; }
      if (ro.state[i] === 1) {
        // Near the edge of all the air there is, it loses its speed outward and keeps what it can along the edge.
        const gx = (p[a] - AIR_C[0]) / HARD[0], gy = (p[a + 1] - AIR_C[1]) / HARD[1], gz = (p[a + 2] - AIR_C[2]) / HARD[2], q = Math.sqrt(gx * gx + gy * gy + gz * gz);
        if (q > HARD_FROM) {
          let nx = gx / HARD[0], ny = gy / HARD[1], nz = gz / HARD[2];
          const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
          const outward = v[a] * nx + v[a + 1] * ny + v[a + 2] * nz;
          if (outward > 0) {
            const lost = outward * clamp((q - HARD_FROM) / (1 - HARD_FROM), 0, 1), still = outward - lost;   // the speed outward it loses, and what it still has
            // What is not outward is along the edge: that is made up to the speed it had (so it turns along the
            // edge, and is not slowed to a stop), by KEEP times at most. One heading straight out has nothing
            // along the edge: it slows, stops at the edge and is steered back in.
            const tx = v[a] - nx * outward, ty = v[a + 1] - ny * outward, tz = v[a + 2] - nz * outward, along = Math.hypot(tx, ty, tz);
            const more = along > 1e-6 ? Math.min(Math.sqrt(Math.max(sp * sp - still * still, 0)) / along, KEEP) : 0;
            v[a] = nx * still + tx * more; v[a + 1] = ny * still + ty * more; v[a + 2] = nz * still + tz * more;
            sp = Math.hypot(v[a], v[a + 1], v[a + 2]) || 1e-4;
          }
        }
      }
      p[a] += v[a] * STEP; p[a + 1] += v[a + 1] * STEP; p[a + 2] += v[a + 2] * STEP;
      {
        // And it does not pass that edge, flying or coming home.
        const gx = (p[a] - AIR_C[0]) / HARD[0], gy = (p[a + 1] - AIR_C[1]) / HARD[1], gz = (p[a + 2] - AIR_C[2]) / HARD[2], q = Math.sqrt(gx * gx + gy * gy + gz * gz);
        if (q > 1) { p[a] = AIR_C[0] + (p[a] - AIR_C[0]) / q; p[a + 1] = AIR_C[1] + (p[a + 1] - AIR_C[1]) / q; p[a + 2] = AIR_C[2] + (p[a + 2] - AIR_C[2]) / q; }
      }
      // It heads the way it flies, and tumbles about that way as a petal does. Coming in to land it turns
      // instead to lie as it will sit, at a steady rate; what is left of that turn when it touches down it
      // makes on the head.
      if (land > 0) { turnTo(ro, a, LAND_TURN * STEP); continue; }
      const rate = Math.min(1, TURN_HEAD * STEP);
      let fx = ro.fwd[a] + (v[a] / sp - ro.fwd[a]) * rate, fy = ro.fwd[a + 1] + (v[a + 1] / sp - ro.fwd[a + 1]) * rate, fz = ro.fwd[a + 2] + (v[a + 2] / sp - ro.fwd[a + 2]) * rate;
      const fl = Math.hypot(fx, fy, fz);
      if (fl > 1e-6) { fx /= fl; fy /= fl; fz /= fl; } else { fx = ro.fwd[a]; fy = ro.fwd[a + 1]; fz = ro.fwd[a + 2]; }
      // Its face is carried along: kept across the way it heads, then turned about it.
      let nx = ro.nrm[a], ny = ro.nrm[a + 1], nz = ro.nrm[a + 2];
      const along = nx * fx + ny * fy + nz * fz;
      nx -= fx * along; ny -= fy * along; nz -= fz * along;
      let nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-4) { if (Math.abs(fy) < 0.9) { nx = -fz; ny = 0; nz = fx; } else { nx = 0; ny = fz; nz = -fy; } nl = Math.hypot(nx, ny, nz); }
      nx /= nl; ny /= nl; nz /= nl;
      const bx = fy * nz - fz * ny, by = fz * nx - fx * nz, bz = fx * ny - fy * nx;
      ro.fwd[a] = fx; ro.fwd[a + 1] = fy; ro.fwd[a + 2] = fz;
      const turned = STEP * ro.spin[i] * (TUMBLE[0] + TUMBLE[1] * Math.min(sp / cruise, TUMBLE[2])), ct = Math.cos(turned), st = Math.sin(turned);
      ro.psi[i] += turned;
      ro.nrm[a] = nx * ct + bx * st; ro.nrm[a + 1] = ny * ct + by * st; ro.nrm[a + 2] = nz * ct + bz * st;
    }
    ro.hist[ro.at] = how.pulse || 0; ro.at = (ro.at + 1) % HISTORY;
    ro.time += STEP;
    tally(ro);
  }

  // The rose is stepped in fixed steps, so that it grows and flies the same at any frame rate. A
  // step is due at its half, so a frame of just under a step still takes it; a long frame takes
  // at most STEPS_MAX and lets the rest go. Returns the number taken.
  function advance(ro, n, dt, how) {
    ro.left += dt;
    let steps = 0;
    while (ro.left >= STEP / 2 && steps < STEPS_MAX) { stepRose(ro, n, how); ro.left -= STEP; steps++; }
    if (ro.left >= STEP / 2) ro.left = 0;
    return steps;
  }

  // ── What is drawn ───────────────────────────────────────────────────────────

  // A blade's grid: (across from -1 to 1, along from 0 at its base to 1 at its tip, 0) for
  // each point, the rows closer together toward the tip; and its triangles, the inner face
  // toward the viewer when across runs right and along runs up.
  function bladeGrid() {
    const points = new Float32Array((NS + 1) * (NT + 1) * 3), index = new Uint16Array(NS * NT * 6);
    for (let j = 0; j <= NT; j++) for (let i = 0; i <= NS; i++) { const q = (j * (NS + 1) + i) * 3; points[q] = -1 + (2 * i) / NS; points[q + 1] = 1 - Math.pow(1 - j / NT, TIP); }
    let at = 0;
    for (let j = 0; j < NT; j++) for (let i = 0; i < NS; i++) {
      const A = j * (NS + 1) + i, B = A + 1, C = A + NS + 1, D = C + 1;
      index[at++] = A; index[at++] = B; index[at++] = C; index[at++] = B; index[at++] = D; index[at++] = C;
    }
    return { points, index };
  }
  // One blade's numbers into `out` (pos, fwd, nrm: three each; A, B, C: four each):
  //   pos: its base   fwd: the way it grows   nrm: its inner face
  //   A: its length, its width, how far it wraps round, how deep its cup
  //   B: how far its tip rolls back, heart to rim (0 to 1), petal or leaf (0 or 1), its flash
  //   C: how grown it is, its band, how loose it is, nothing
  function blade(out, j, at, fwd, nrm, A0, A1, A2, A3, B0, B1, B2, B3, C0, C1, C2) {
    const a = j * 3, q = j * 4;
    out.pos[a] = at[0]; out.pos[a + 1] = at[1]; out.pos[a + 2] = at[2];
    out.fwd[a] = fwd[0]; out.fwd[a + 1] = fwd[1]; out.fwd[a + 2] = fwd[2];
    out.nrm[a] = nrm[0]; out.nrm[a + 1] = nrm[1]; out.nrm[a + 2] = nrm[2];
    out.A[q] = A0; out.A[q + 1] = A1; out.A[q + 2] = A2; out.A[q + 3] = A3;
    out.B[q] = B0; out.B[q + 1] = B1; out.B[q + 2] = B2; out.B[q + 3] = B3;
    out.C[q] = C0; out.C[q + 1] = C1; out.C[q + 2] = C2; out.C[q + 3] = 0;
  }
  // Every blade: the five sepals, the two leaves' six leaflets, then the first n petals.
  // `look`: flame (the voice), kick (a beat), flash (a thump's), and lead: the seconds the rose
  // is behind its steps (ro.left). A petal in the air is drawn that much further on its way.
  // How loose a petal is (ro.loose) is how far it is drawn with the shape it has in the air: it eases, whatever the petal is doing.
  function dress(out, ro, n, look) {
    const top = ro.top, hx = ro.hx, hy = ro.hy, c3 = ro.c3, lead = look.lead || 0, at = [0, 0, 0], f = [0, 0, 0], g = [0, 0, 0];
    let j = 0;
    for (let s = 0; s < SEPALS; s++) {
      const th = s * SEPAL_AT[0] + SEPAL_AT[1], ct = Math.cos(th), st = Math.sin(th);
      for (let k = 0; k < 3; k++) { const o = hx[k] * ct + hy[k] * st; at[k] = c3[k] + top[k] * SEPAL_AT[2] + o * SEPAL_AT[3]; f[k] = o * SEPAL_OUT[0] + top[k] * SEPAL_OUT[1]; g[k] = top[k] * SEPAL_OUT[0] - o * SEPAL_OUT[1]; }
      blade(out, j++, at, unit(f), unit(g), SEPAL[0], SEPAL[1], SEPAL[2], SEPAL[3], SEPAL[4], 0, 1, 0, 1, 0, 0);
    }
    for (let m = 0; m < LEAVES; m++) {
      const leaf = leafAt(ro, m, look.flame || 0);
      for (let k = 0; k < 3; k++) f[k] = leaf.run[k] - (k === 1 ? LEAF_DROOP : 0);
      blade(out, j++, leaf.tip, unit(f), leaf.up, LEAFLET[0][0], LEAFLET[0][1], LEAF_SHAPE[0], LEAF_SHAPE[1], LEAF_SHAPE[2], 0, 1, 0, 1, 0, 0);
      for (const sd of [1, -1]) {
        for (let k = 0; k < 3; k++) { at[k] = leaf.root[k] + leaf.run[k] * LEAF_STALK[1]; f[k] = leaf.run[k] * LEAF_FAN[0] + leaf.side[k] * LEAF_FAN[1] * sd; }
        blade(out, j++, at, unit(f), leaf.up, LEAFLET[1][0], LEAFLET[1][1], LEAF_SHAPE[0], LEAF_SHAPE[1], LEAF_SHAPE[2], 0, 1, 0, 1, 0, 0);
      }
    }
    for (let i = 0; i < n; i++, j++) {
      const a = i * 3, u = n > 1 ? i / (n - 1) : 0, st = ro.state[i], l = ro.loose[i];
      const fx = ro.fwd[a], fy = ro.fwd[a + 1], fz = ro.fwd[a + 2], nx = ro.nrm[a], ny = ro.nrm[a + 1], nz = ro.nrm[a + 2];
      // In the air a petal is smaller and flatter, and it rocks as it tumbles.
      const w = ROCK * l * Math.sin(ROCK_RATE * ro.psi[i] + i), cw = Math.cos(w), sw = Math.sin(w), size = 1 - (1 - AWAY) * l, ahead = st === 0 ? 0 : lead;
      f[0] = fx * cw + nx * sw; f[1] = fy * cw + ny * sw; f[2] = fz * cw + nz * sw;
      g[0] = nx * cw - fx * sw; g[1] = ny * cw - fy * sw; g[2] = nz * cw - fz * sw;
      for (let k = 0; k < 3; k++) at[k] = ro.p[a + k] + ro.v[a + k] * ahead - f[k] * 0.5 * ro.len[i] * size * l;
      const flash = settle(Math.max(ro.flash[i], st === 0 ? WAVE_FLASH * rippleAt(ro, WAVE_SPAN * u) + KICK_FLASH * (look.kick || 0) : LOOSE_FLASH * (look.flash || 0)));
      blade(out, j, at, f, g, ro.len[i] * size, ro.wid[i] * size, ro.shape[a] + (FLAT[0] - ro.shape[a]) * l, ro.shape[a + 1] + (FLAT[1] - ro.shape[a + 1]) * l,
        ro.shape[a + 2] + (FLAT[2] - ro.shape[a + 2]) * l, u, 0, flash, ease(ro.grown[i]), ro.band[i], l);
    }
  }
  // Leaf m: where its stalk leaves the stem (root) and ends (tip), the way it runs, its upper
  // face (up) and the way across it (side). It lifts and falls a little, more for a loud voice,
  // and lifts as a syllable passes it.
  function leafAt(ro, m, flame) {
    const t = LEAF_AT[m], s = stemAt(ro, t), ct = Math.cos(LEAF_TURN[m]), st = Math.sin(LEAF_TURN[m]), out = [0, 0, 0], run = [0, 0, 0], root = [0, 0, 0], tip = [0, 0, 0];
    const lift = LEAF_SWAY[0] * Math.sin(LEAF_SWAY[1] * ro.time + 2 * m) * (LEAF_SWAY[2] + flame) + LEAF_WAVE * rippleAt(ro, STEM_WAVE[0] + STEM_WAVE[1] * (1 - t));
    for (let k = 0; k < 3; k++) { out[k] = s.e1[k] * ct + s.e2[k] * st; run[k] = out[k] * LEAF_OUT[0] + s.run[k] * (LEAF_OUT[1] + lift); }
    const r = unit(run), along = s.run[0] * r[0] + s.run[1] * r[1] + s.run[2] * r[2], up = unit([s.run[0] - r[0] * along, s.run[1] - r[1] * along, s.run[2] - r[2] * along]);
    for (let k = 0; k < 3; k++) { root[k] = s.at[k] + out[k] * stemRadius(t) * 0.8; tip[k] = root[k] + r[k] * LEAF_STALK[0]; }
    return { root, tip, run: r, up, side: cross(r, up) };
  }
  // The triangles of the stalk: the stem with the heart on its top, the thorns, the leaves' stalks.
  function stalkIndex() {
    const index = [];
    const tube = (at, rings, around) => { for (let r = 0; r < rings - 1; r++) for (let a = 0; a < around; a++) { const A = at + r * around + a, B = at + r * around + (a + 1) % around, C = A + around, D = B + around; index.push(A, B, C, B, D, C); } };
    let at = 0;
    tube(at, STEM_RINGS + DOME_RINGS, STEM_AROUND); at += (STEM_RINGS + DOME_RINGS) * STEM_AROUND;
    for (let j = 0; j < THORNS; j++) { tube(at, THORN_RINGS, THORN_AROUND); at += THORN_RINGS * THORN_AROUND; }
    for (let m = 0; m < LEAVES; m++) { tube(at, STALK_RINGS, STALK_AROUND); at += STALK_RINGS * STALK_AROUND; }
    return new Uint16Array(index);
  }
  // How long thorn j is drawn, for a thorn's full length `long`: as far out as it is, and a little more as a syllable passes it.
  function thornLength(ro, j, long) {
    const t = THORN_SPAN[0] + THORN_SPAN[1] * (j + 0.5) / THORNS;
    return long * clamp(ro.thorn[j] * (1 + THORN_WAVE * rippleAt(ro, STEM_WAVE[0] + STEM_WAVE[1] * (1 - t))), 0, THORN_MOST);
  }
  // The stalk's points into `out` (pos, nrm, tone: three each for STALK_POINTS points). tone is
  // what the point is (0 stem, 1 the heart, 2 thorn), how far along it, and its band. (The heart is numbered
  // next to the stem, which it joins: what lies between them is between green and gold.)
  // `look`: thorn (a thorn's full length), flame.
  function stalk(out, ro, look) {
    let v = 0;
    const ring = (around, at, e1, e2, r, axis, slope, kind, along, band) => {
      for (let a = 0; a < around; a++) {
        const g = (a / around) * Math.PI * 2, cg = Math.cos(g), sg = Math.sin(g);
        const dx = e1[0] * cg + e2[0] * sg, dy = e1[1] * cg + e2[1] * sg, dz = e1[2] * cg + e2[2] * sg;
        const nx = dx + axis[0] * slope, ny = dy + axis[1] * slope, nz = dz + axis[2] * slope, nl = Math.hypot(nx, ny, nz) || 1;
        out.pos[v] = at[0] + dx * r; out.pos[v + 1] = at[1] + dy * r; out.pos[v + 2] = at[2] + dz * r;
        out.nrm[v] = nx / nl; out.nrm[v + 1] = ny / nl; out.nrm[v + 2] = nz / nl;
        out.tone[v] = kind; out.tone[v + 1] = along; out.tone[v + 2] = band; v += 3;
      }
    };
    const at = [0, 0, 0], d = [0, 0, 0];
    for (let j = 0; j < STEM_RINGS; j++) { const t = j / (STEM_RINGS - 1), s = stemAt(ro, t); ring(STEM_AROUND, s.at, s.e1, s.e2, stemRadius(t), s.run, 0, 0, t, 0); }
    // The golden heart stands up only when the head is bare.
    const bare = smooth(BARE[0], BARE[1], 1 - ro.attached / ro.n);
    for (let j = 1; j <= DOME_RINGS; j++) {
      const g = (j / DOME_RINGS) * Math.PI / 2, up = (DOME[0] + DOME[1] * bare) * Math.sin(g);
      for (let k = 0; k < 3; k++) at[k] = ro.c3[k] + ro.top[k] * up;
      ring(STEM_AROUND, at, ro.hx, ro.hy, stemRadius(1) * (DOME[2] + (1 - DOME[2]) * bare) * Math.cos(g) + 0.0005, ro.top, Math.tan(Math.min(g, 1.4)), 1, 1, 0);
    }
    for (let j = 0; j < THORNS; j++) {
      const t = THORN_SPAN[0] + THORN_SPAN[1] * (j + 0.5) / THORNS, s = stemAt(ro, t), az = j * THORN_TURN[0] + THORN_TURN[1], ca = Math.cos(az), sa = Math.sin(az);
      const L = thornLength(ro, j, look.thorn), r0 = L > 0.004 ? THORN_WIDE[0] + THORN_WIDE[1] * L : 0, band = Math.min(BANDS - 1, Math.floor((j * BANDS) / THORNS)), o = [0, 0, 0];
      for (let k = 0; k < 3; k++) o[k] = s.e1[k] * ca + s.e2[k] * sa;
      for (let q = 0; q < THORN_RINGS; q++) {
        const g = q / (THORN_RINGS - 1);
        for (let k = 0; k < 3; k++) { d[k] = o[k] - s.run[k] * THORN_HOOK[0] * g; at[k] = s.at[k] + o[k] * (stemRadius(t) * 0.6 + L * g) - s.run[k] * THORN_HOOK[1] * L * g * g; }
        const du = unit(d), along = s.run[0] * du[0] + s.run[1] * du[1] + s.run[2] * du[2], u1 = unit([s.run[0] - du[0] * along, s.run[1] - du[1] * along, s.run[2] - du[2] * along]);
        ring(THORN_AROUND, at, u1, cross(du, u1), r0 * Math.pow(1 - g, 1.1) + 0.0003, du, 0.3, 2, g, band);
      }
    }
    for (let m = 0; m < LEAVES; m++) {
      const leaf = leafAt(ro, m, look.flame || 0);
      for (let q = 0; q < STALK_RINGS; q++) {
        const g = q / (STALK_RINGS - 1);
        for (let k = 0; k < 3; k++) at[k] = leaf.root[k] + (leaf.tip[k] - leaf.root[k]) * g;
        ring(STALK_AROUND, at, leaf.up, leaf.side, LEAF_STALK[2] - LEAF_STALK[3] * g, leaf.run, 0, 0, LEAF_AT[m], 0);
      }
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

  // A blade is a petal, a leaflet or a sepal: one grid, shaped here from what is sent with it.
  // Across, it is bent round a cylinder; along, it is cupped, and its tip rolls back.
  const BLADE_VERT = `
    attribute vec3 iPos, iFwd, iNrm;
    attribute vec4 iA, iB, iC;
    varying vec3 vN, vW; varying vec2 vST; varying vec4 vK; varying float vLoose;
    vec3 blade(vec2 q) {
      float s = q.x, t = q.y, kind = iB.z;
      // A petal is widest toward its tip, which is round; a leaf is pointed.
      float w = mix(pow(max(sin(3.14159 * pow(t, 1.55)), 0.0), 0.6), pow(max(sin(3.14159 * pow(t, 0.8)), 0.0), 1.2), kind);
      float x = 0.5 * iA.y * w * s;
      float R = iA.y / max(iA.z, 0.02), a = x / R;
      vec3 p = vec3(R * sin(a), iA.x * t, R * (1.0 - cos(a)));
      p.z -= iA.w * iA.x * sin(3.14159 * pow(t, 0.8));
      float tip = smoothstep(0.45, 1.0, t); tip *= tip;
      p.z -= 1.6 * iB.x * iA.x * tip * (0.6 + 0.4 * s * s);
      p.y -= 0.5 * iB.x * iA.x * tip;
      p.z += kind * 0.22 * abs(x);
      return p * iC.x;
    }
    void main() {
      vec2 q = position.xy;
      vec3 p = blade(q);
      // Its face there, from the points beside it (taken a little in from the ends, where it comes to a point).
      vec2 c = vec2(q.x * 0.97, clamp(q.y, 0.04, 0.95));
      vec3 p0 = blade(c), ds = blade(c + vec2(0.03, 0.0)) - p0, dt = blade(c + vec2(0.0, 0.03)) - p0;
      vec3 nl = normalize(cross(ds, dt) + vec3(0.0, 0.0, 1e-9));
      vec3 f = normalize(iFwd), n = normalize(iNrm - f * dot(iNrm, f)), r = cross(f, n);
      vec4 w = modelMatrix * vec4(iPos + r * p.x + f * p.y + n * p.z, 1.0);
      vN = normalize(mat3(modelMatrix) * (r * nl.x + f * nl.y + n * nl.z));
      vW = w.xyz; vST = q; vK = vec4(iB.y, iB.z, iB.w, iC.y); vLoose = iC.z;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const LIGHT = `
    uniform vec3 uPal[6];
    uniform vec3 uGreen;
    vec3 pal(float u) {
      u = fract(u) * 6.0; int i = int(floor(u)); float f = u - floor(u); f = f * f * (3.0 - 2.0 * f);
      return mix(uPal[i], uPal[(i + 1) % 6], f);
    }
    const vec3 L1 = vec3(0.3293, 0.7526, 0.5704), L2 = vec3(-0.7926, 0.1321, 0.5945);`;
  const BLADE_FRAG = `
    precision highp float;
    ${LIGHT}
    uniform float uHues;
    varying vec3 vN, vW; varying vec2 vST; varying vec4 vK; varying float vLoose;
    void main() {
      vec3 n = normalize(vN); bool back = !gl_FrontFacing; if (back) n = -n;
      vec3 v = normalize(cameraPosition - vW);
      float s = vST.x, t = vST.y, rank = vK.x;
      float d1 = max(dot(n, L1), 0.0), d2 = max(dot(n, L2), 0.0), thru = max(dot(-n, L1), 0.0);
      float spec = pow(max(dot(n, normalize(L1 + v)), 0.0), 30.0), sheen = pow(1.0 - abs(dot(n, v)), 3.0);
      vec3 col;
      if (vK.y < 0.5) {
        // A petal: deeper at the heart of the rose and toward its own base, paler at its rim, lit through.
        vec3 base = pal(uHues * rank);
        vec3 c = base * mix(mix(0.36, 0.72, vLoose), 1.0, smoothstep(0.0, 0.85, t)) * mix(mix(0.66, 1.0, rank), 1.0, vLoose);
        float rim = max(smoothstep(0.80, 1.0, t), smoothstep(0.86, 1.0, abs(s)) * smoothstep(0.2, 0.6, t));
        c = mix(c, mix(base, vec3(1.0), 0.5), 0.42 * rim);
        c *= 0.95 + 0.05 * cos(s * 22.0);
        if (back) c = mix(c, vec3(dot(c, vec3(0.33))), 0.10) * 0.94;
        col = c * (0.36 + 0.62 * d1 + 0.22 * d2 + 0.30 * thru) + base * 0.16 * sheen + vec3(1.0) * spec * 0.07 + mix(base, vec3(1.0), 0.15) * 0.24 * vK.z;
      } else {
        // A leaf: a dark midrib, veins, paler beneath.
        vec3 g = uGreen * (0.78 + 0.22 * smoothstep(0.0, 0.09, abs(s))) * (0.93 + 0.07 * cos((t * 8.0 - abs(s) * 2.2) * 6.2832));
        if (back) g = mix(g, vec3(dot(g, vec3(0.33))), 0.25) * 1.15;
        col = g * (0.36 + 0.66 * d1 + 0.22 * d2 + 0.22 * thru) + vec3(1.0) * spec * 0.16;
      }
      gl_FragColor = vec4(col, 1.0);
    }`;
  const STALK_VERT = `
    attribute vec3 tone;   // stem, heart or thorn (0, 1, 2); how far along it; its band
    varying vec3 vN, vW, vTone;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vTone = tone; vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const STALK_FRAG = `
    precision highp float;
    ${LIGHT}
    varying vec3 vN, vW, vTone;
    void main() {
      vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
      float d1 = max(dot(n, L1), 0.0), d2 = max(dot(n, L2), 0.0), spec = pow(max(dot(n, normalize(L1 + v)), 0.0), 36.0);
      // The stem is green, a little paler toward its top; a thorn's tip wears its band's colour; the heart is gold.
      vec3 c = uGreen * (0.72 + 0.28 * vTone.y);
      if (vTone.x > 1.5) c = mix(uGreen * 0.8, mix(pal(vTone.z / 8.0), vec3(1.0), 0.22), pow(vTone.y, 1.2));
      float heart = vTone.x > 1.5 ? 0.0 : smoothstep(0.35, 0.65, vTone.x);
      c = mix(c, vec3(0.80, 0.42, 0.04) * (0.85 + 0.15 * sin(vW.x * 90.0) * sin(vW.y * 90.0)), heart);
      // (The heart is matt: a shine would wash its gold out.)
      gl_FragColor = vec4(c * (0.38 + 0.70 * d1 + 0.26 * d2) + vec3(1.0) * spec * 0.18 * (1.0 - 0.85 * heart), 1.0);
    }`;

  // ── The scene ───────────────────────────────────────────────────────────────

  function definition() {
    const ID = 'rose';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name, otherwise = 50) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : otherwise;
    };
    const bands = new Float32Array(BANDS), rose = createRose(SEED, countFor(50));
    const sentBlades = { pos: new Float32Array(BLADES_MAX * 3), fwd: new Float32Array(BLADES_MAX * 3), nrm: new Float32Array(BLADES_MAX * 3), A: new Float32Array(BLADES_MAX * 4), B: new Float32Array(BLADES_MAX * 4), C: new Float32Array(BLADES_MAX * 4) };
    const sentStalk = { pos: new Float32Array(STALK_POINTS * 3), nrm: new Float32Array(STALK_POINTS * 3), tone: new Float32Array(STALK_POINTS * 3) };
    // The shatter machine counts its own pieces; these stand in for the petals, which fly in 3D here.
    const stubs = Array.from({ length: 4 }, () => ({ cx: 500, cy: 500 }));
    const how = { flame: 0, kick: 0, bands, pulse: 0, mic: false };
    const look = { flame: 0, kick: 0, flash: 0, lead: 0, thorn: THORN_LONG };
    let THREE = null, HX = null, machine = null, group = null, blades = null, stem = null, geo = null, stalkGeo = null, sent = [], shared = null, camera = null, random = null;
    let trail = 0;
    // What the checks read. clock: seconds the scene has been live. petals: how many there are.
    // attached, flying, coming: how many are doing which; open: how many on the head are out.
    // steps: steps taken this frame. phase: the thump's (whole, pieces or returning).
    const s = { flame: 0, kick: 0, clock: 0, live: false, orbit: 0, colorT: 0, petals: 0, kept: 0, attached: 0, flying: 0, coming: 0, open: 0, thorns: 0, steps: 0, stepped: 0, pulse: 0,
      phase: 'whole', thumps: 0, jostles: 0, gathers: 0, flash: 0 };

    function build(k) {
      THREE = k.THREE;
      camera = k.camera;
      HX = TimbreHelix;
      machine = HX.createShatter({ random: HX.rng(7) });
      random = rng(7);
      group = new THREE.Group();
      lay(rose, countFor(knob('density')));
      shared = { uPal: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Color()) }, uGreen: { value: new THREE.Color() }, uHues: { value: PETAL_HUES } };
      // The blades: one grid, drawn once for each sepal, leaflet and petal, shaped by the numbers sent with it.
      const grid = bladeGrid();
      geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(grid.points, 3));
      geo.setIndex(new THREE.BufferAttribute(grid.index, 1));
      const each = (g, name, array, n, Kind) => { const at = new Kind(array, n).setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, at); sent.push(at); };
      each(geo, 'iPos', sentBlades.pos, 3, THREE.InstancedBufferAttribute); each(geo, 'iFwd', sentBlades.fwd, 3, THREE.InstancedBufferAttribute); each(geo, 'iNrm', sentBlades.nrm, 3, THREE.InstancedBufferAttribute);
      each(geo, 'iA', sentBlades.A, 4, THREE.InstancedBufferAttribute); each(geo, 'iB', sentBlades.B, 4, THREE.InstancedBufferAttribute); each(geo, 'iC', sentBlades.C, 4, THREE.InstancedBufferAttribute);
      blades = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: BLADE_VERT, fragmentShader: BLADE_FRAG, side: THREE.DoubleSide, uniforms: shared }));
      blades.frustumCulled = false;
      // The stalk: the stem with the heart on its top, the thorns and the leaves' stalks, worked out again each frame.
      stalkGeo = new THREE.BufferGeometry();
      each(stalkGeo, 'position', sentStalk.pos, 3, THREE.BufferAttribute); each(stalkGeo, 'normal', sentStalk.nrm, 3, THREE.BufferAttribute); each(stalkGeo, 'tone', sentStalk.tone, 3, THREE.BufferAttribute);
      stalkGeo.setIndex(new THREE.BufferAttribute(stalkIndex(), 1));
      stem = new THREE.Mesh(stalkGeo, new THREE.ShaderMaterial({ vertexShader: STALK_VERT, fragmentShader: STALK_FRAG, side: THREE.DoubleSide, uniforms: shared }));
      stem.frustumCulled = false;
      group.add(stem); group.add(blades);
      k.scene.add(group);
      dress(sentBlades, rose, rose.n, look);
      stalk(sentStalk, rose, look);
      geo.instanceCount = FIXED + rose.n;
    }

    // The palette colour at t, as the shaders want it (linear), into c.
    function palette(c, t) {
      const p = getColor(t);
      return c.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = orbitAt(t, knob('cameraDrift'));

      // With the mic and Idle animation both off, the rose stops as it is.
      s.live = !!(micActive || cfgIdleAnim);
      if (s.live) s.clock += dt;
      // The voice is the mic's: with the mic off, Idle animation moves the bands and nothing else.
      const flame = s.flame = settle(micActive ? audio.flame : 0);
      s.kick = settle(micActive ? audio.kick : 0);
      const n = countFor(knob('density'));
      if (n !== rose.n) lay(rose, n);   // Density changed: the head is laid again
      s.petals = n; s.kept = rose.kept;
      geo.instanceCount = FIXED + n;

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

      // The thump. The machine says when: a hard peak with the mic on throws every petal off, a
      // peak while they are loose throws them again, and after a calm wait they come home. The
      // peak is the raw input level, before Gain, as DNA hears it. With nothing live no time passes for it.
      s.flash = settle(s.flash * Math.exp(-dt / FLASH_S));
      const event = machine.step({
        now, dt: s.live ? dt : 0, live: !!micActive,
        peak: typeof micPeak === 'number' ? micPeak : HX.peakOf(typeof waveform === 'undefined' ? null : waveform),
        threshold: HX.threshold(knob('scatterSensitivity')), reconnectS: knob('regatherSeconds', 3),
        W: 1000, H: 1000, scale: 1, cut: () => stubs,
      });
      if (event === 'shatter') {
        random = rng(1000 + ++s.thumps);   // each thump its own, and the same again another day
        scatter(rose, n, 1, random);
        s.flash = 1;
      } else if (event === 'jostle') {
        s.jostles++;
        scatter(rose, n, JOSTLE, random);
        s.flash = Math.max(s.flash, 0.6);
      } else if (event === 'return') {
        s.gathers++;
        gather(rose, n, random);
      } else if (event === 'reset') {   // the page had stopped drawing: every petal is back on the head
        lay(rose, n);
        s.flash = 0;
      }
      s.phase = machine.state;

      // The rose grows and flies, and is dressed.
      how.flame = flame; how.kick = s.kick; how.pulse = s.pulse; how.mic = !!micActive;
      s.steps = s.live ? advance(rose, n, dt, how) : 0;
      s.stepped += s.steps;
      s.attached = rose.attached; s.flying = rose.flying; s.coming = rose.coming; s.open = rose.open;
      let thorns = 0;
      for (let j = 0; j < THORNS; j++) thorns += rose.thorn[j] / THORNS;
      s.thorns = thorns;
      look.flame = flame; look.kick = s.kick; look.flash = s.flash; look.lead = rose.left; look.thorn = thornFor(knob('thorns'));
      dress(sentBlades, rose, n, look);
      stalk(sentStalk, rose, look);
      for (const at of sent) at.needsUpdate = true;

      // The colours: six from round the palette (they move only as the palette's own Colour speed moves them).
      // The petals take the first of them; the thorns' tips run through all six. The stem and the leaves are green, with a little of the palette.
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      for (let i = 0; i < 6; i++) palette(shared.uPal.value[i], colorT + i * (PALETTE.length / 6));
      const g = getColor(colorT + PALETTE.length / 2);
      shared.uGreen.value.setRGB(GREEN[0] + GREEN_PALETTE * g[0] / 255, GREEN[1] + GREEN_PALETTE * g[1] / 255, GREEN[2] + GREEN_PALETTE * g[2] / 255, THREE.SRGBColorSpace);
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: PITCH,
      cooling: [LINGER, LINGER, LINGER],
      build,
      update,
      debug() {
        if (!blades) return Object.assign({}, s);
        const out = { r: 0, g: 0, b: 0 };
        const srgb = (c) => { c.getRGB(out, THREE.SRGBColorSpace); return [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)]; };
        const solid = (m) => m.transparent === false && m.depthTest === true && m.depthWrite === true && m.side === THREE.DoubleSide && m.blending === THREE.NormalBlending;
        const d = Object.assign({
          bands: Array.from(bands), trail, left: rose.left, time: rose.time, tau: rose.tau, lead: rose.lead.slice(), bloom: rose.bloom, full: rose.full, homing: rose.homing,
          head: rose.head.slice(), headV: rose.headV.slice(), top: rose.top.slice(), at: rose.c3.slice(),
          drawn: geo.instanceCount, gridPoints: geo.attributes.position.count, triangles: geo.index.count / 3, stalkPoints: stalkGeo.attributes.position.count, stalkTriangles: stalkGeo.index.count / 3,
          solid: solid(blades.material) && solid(stem.material),
          pal: shared.uPal.value.map(srgb), green: srgb(shared.uGreen.value), hues: shared.uHues.value, thornLong: look.thorn,
          uploads: sent.map((at) => at.version),
          neverCulled: blades.frustumCulled === false && stem.frustumCulled === false,
          // How the scene stands and how the camera saw the last frame, so that a check can say where on the canvas a petal was drawn.
          world: group.matrixWorld.toArray(), view: camera.matrixWorldInverse.toArray(), proj: camera.projectionMatrix.toArray(),
        }, s);
        // The long lists, made only when asked for.
        const n = rose.n;
        Object.defineProperty(d, 'points', { get: () => Array.from(rose.p.subarray(0, n * 3)) });
        Object.defineProperty(d, 'speeds', { get: () => Array.from(rose.v.subarray(0, n * 3)) });
        Object.defineProperty(d, 'states', { get: () => Array.from(rose.state.subarray(0, n)) });
        Object.defineProperty(d, 'grownOf', { get: () => Array.from(rose.grown.subarray(0, n)) });
        Object.defineProperty(d, 'thornOf', { get: () => Array.from(rose.thorn) });
        Object.defineProperty(d, 'sentPos', { get: () => Array.from(sentBlades.pos.subarray(0, (FIXED + n) * 3)) });
        Object.defineProperty(d, 'sentFwd', { get: () => Array.from(sentBlades.fwd.subarray(0, (FIXED + n) * 3)) });
        Object.defineProperty(d, 'sentNrm', { get: () => Array.from(sentBlades.nrm.subarray(0, (FIXED + n) * 3)) });
        Object.defineProperty(d, 'sentA', { get: () => Array.from(sentBlades.A.subarray(0, (FIXED + n) * 4)) });
        Object.defineProperty(d, 'sentB', { get: () => Array.from(sentBlades.B.subarray(0, (FIXED + n) * 4)) });
        Object.defineProperty(d, 'sentC', { get: () => Array.from(sentBlades.C.subarray(0, (FIXED + n) * 4)) });
        Object.defineProperty(d, 'stalkPos', { get: () => Array.from(sentStalk.pos) });
        Object.defineProperty(d, 'stalkTone', { get: () => Array.from(sentStalk.tone) });
        return d;
      },
    };
  }

  globalThis.TimbreRose = {
    BANDS, PETALS_MIN, PETALS_MAX, KEPT, SEPALS, LEAVES, LEAFLETS, FIXED, BLADES_MAX, THORNS, SEED, STEP, STEPS_MAX, NS, NT, TIP,
    FOOT, BEND, HEAD, RUN, NECK, HEAD_TURN, BEND_SHARE, STEM_R, FLARE, STEM_RINGS, DOME_RINGS, STEM_AROUND, THORN_RINGS, THORN_AROUND, STALK_RINGS, STALK_AROUND, STALK_POINTS, DOME, BARE,
    HEAD_SWAY, HEAD_RATE, HEAD_QUIET, HEAD_LIFT, HEAD_SPRING, HEAD_DAMP, NOD, NOD_LAND,
    GOLDEN, TURN0, TURN_VARY, LONG, WIDE, VARY, ROOT, ROOT_UP, LEAN, LEAN_FROM, LEAN_TOP, OPEN, GROWING, WRAP, WRAP_MAX, WRAP_TOP, CUP, ROLL, ROLL_TOP, FULL_MIN, FULL_RATE, BLOOM_RATE, KICK_BLOOM,
    NERVE, STAY, CALL, GROW, REGROW, LANDED_STAY, WAVE_SPAN, WAVE_LEAN, WAVE_FLASH, KICK_FLASH, LOOSE_FLASH, FLASH_S,
    THORN_SPAN, THORN_TURN, THORN_CALL, THORN_RATE, THORN_LONG, THORN_WIDE, THORN_HOOK, THORN_WAVE, THORN_MOST, STEM_WAVE,
    LEAF_AT, LEAF_TURN, LEAF_OUT, LEAF_STALK, LEAF_SWAY, LEAF_WAVE, LEAF_DROOP, LEAFLET, LEAF_FAN, LEAF_SHAPE, SEPAL, SEPAL_AT, SEPAL_OUT,
    AIR, AIR_C, HARD, HARD_FROM, KEEP, CRUISE, LEAD_RATE, LEAD, LEAD_WIDE, LEAD_UP, PLACE, ROOM, TURN, SPEED_RATE, BRAKE, ALIGN, NEAR, CLEAR, PART, TOP,
    THROW, THROWN, JOSTLE, HOME_OVER, HOME_VARY, HOME_NEAR, HOME_AHEAD, HOME_FAST, HOME_SLOW, HOME_SEEK, LANDED, CATCH, TURN_HEAD, TUMBLE, LAND_TURN, SEAT_TURN, SPIN, ROCK, ROCK_RATE, LOOSEN, AWAY, FLAT,
    RISE, FALL, TRAIL, PULSE, HISTORY, SWAY, ORBIT_RATE, LINGER, FOV, PITCH, FRAME, PETAL_HUES, GREEN, GREEN_PALETTE,
    BLADE_VERT, BLADE_FRAG, STALK_VERT, STALK_FRAG,
    countFor, keptFor, thornFor, loudness, idle, settle, rng, toward, callOf, thornCall, pulseOf, stemAt, stemRadius, curve, rippleAt, createRose, seat, perch, turnTo, tally, fullOf, lay, pose, leadAt, placeOf, scatter, gather, stepRose, advance,
    bladeGrid, blade, dress, leafAt, stalkIndex, thornLength, stalk, swayFor, orbitAt, definition,
  };
})();
