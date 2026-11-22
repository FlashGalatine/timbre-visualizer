// Timbre — the jelly: a rounded cube of clear jelly, set in four layers of the palette's
// colours, that floats in the box and wobbles as a real soft body; a thump of the mic knocks
// it apart into its layers, which drop back and set again. First the arithmetic: the sound,
// the cube's shape, the body (a lattice of points joined by springs, held at its middle),
// the skin read off it, a spring let go, the slabs' flight and their way back, and the room
// it all takes in the picture. Then the shaders, and the 3D scene, written against the scene
// kit: definition() returns what TimbreScene.factory() needs.
//
// All timing comes from the caller (dt in seconds), never from counting frames. The body is
// stepped in fixed steps of STEP seconds, what is left of a frame carried to the next, so the
// same sound gives the same wobble at any frame rate. The springs (the body's squash, a slab's
// flight, turn, squash and flap) are worked out exactly for any step. What the sound adds (a
// syllable's push, a slap, the bands' pulls) is taken once a frame, at its start.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns `globalThis.TimbreJelly`),
// like glass-prism.js, so verify.mjs can import it under Node. Nothing here may touch
// document, window, THREE, TimbreScene, TimbreHelix or core.js globals at load time; the
// scene looks them up when it is built.

(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  const BANDS = 8;                          // bands that pull on it: the eight lowest bins, one to a corner
  const G = 9;                              // points along an edge of the lattice
  const SKIN = 26, SLAB_SKIN = 14;          // squares along an edge of the cube's skin, and of a slab's
  const ROUND = 5;                          // how square the cube is: 2 would be a ball
  const LAYERS = 4, THIN = 1 / LAYERS;      // the layers it was set in, and half the height of one
  const BUBBLES = 46;
  const SEED = 20261122;                    // where its bubbles are
  const SPRING = 520;                       // the spring between two neighbours
  const HOLD = 260, HOLD_WITHIN = 0.8;      // the spring that holds the middle, and how far out it reaches
  const REST = 5;                           // the weak spring that holds every point
  const DAMP = 3, VISC = 7;                 // how fast any motion dies, a second, and how much faster a fine ripple does
  const STEP = 1 / 240, STEPS_MAX = 24;     // the body's step, in seconds, and the most taken in one frame
  const RISE = 20, FALL = 5;                // how fast a band is followed, up and down, a second
  const QUIET = 0.06;                       // a band no louder than this pulls nothing
  const PULL = 40, PULL_NEAR = 0.5;         // a band's pull on its corner, and how far from the corner it is felt
  const SLAP = 3.4, SLAP_NEAR = 0.6;        // a beat's slap, in units a second, and how far from its place it is felt
  const JOLT = 0.34, TRAIL = 2.5;           // how far a syllable lifts the middle, and how fast the lift is forgotten, a second
  const SQUASH_RATE = 14.5, SQUASH_DAMP = 0.17;   // the whole body's squash: how fast it swings, in radians a second, and how soon it stops
  const SQUASH_MAX = 0.3;                   // it is never drawn flatter or taller than this
  const SQUASH_BEAT = 2.6, SQUASH_VOICE = 3.8;    // the push a beat gives the squash, and a syllable by how much louder it gets
  const STIR = 0.22, STIR_BUBBLE = 0.45;    // how much the skin and a bubble brighten for a speed of 1
  // Which corner each band pulls (bit 1: right, bit 2: near, bit 4: up). Neighbours in pitch never share an edge.
  const CORNER = [0, 3, 5, 6, 1, 2, 4, 7];
  // The thump.
  const APART = 0.9;                        // a thrown slab makes for a place this much further from the middle than where it sat
  const SCATTER = 1.3, SCATTER_UP = 0.3;    // and anywhere within this much of it, sideways and up
  const TILT = 1.1, TWIST = 1.5;            // how far it may end up tipped, and turned about its upright, in radians (half of each either way)
  const THROW = 5, SPIN = 7;                // the push a throw gives it for each unit it has to go, and the spin (up to half either way)
  const FLY_RATE = 6.5, FLY_DAMP = 0.355;   // a slab's flight to its place: a spring let go
  const TURN_RATE = 5, TURN_DAMP = 0.3;     // and its turning
  const FLY_MAX = 2.4;                      // no slab is drawn further than this from where it sat
  const KNOCKED = 0.24;                     // how squashed a slab is as it is knocked off the stack
  const SLAB_RATE = 16, SLAB_DAMP = 0.19;   // a slab's own squash
  const BEND_RATE = 11, BEND_DAMP = 0.146, BEND_MAX = 0.3;   // and its flapping
  const BEND_SPAN = 0.82;                   // how far a slab's rim moves for a bend of 1, at most
  const SLAB_KICK = 4, BEND_KICK = 5, BEND_KICK_RANGE = 5;   // what a throw does to them
  const SLAB_VOICE = 2.2, BEND_VOICE = 3;   // what a syllable does to them
  const BEND_LEAN = 0.21;                   // how far a slab leans when one of its two bands is louder than the other by 1
  const SWAY = 0.1, LOOSEN = 3;             // how far a loose slab sways, in radians, and how fast a thrown slab comes loose, a second
  const BACK_LAG = 0.16, BACK_DROP = 0.48;  // on the way back each slab sets off this much of the way after the one beneath, and takes this much
  const PLOP = 3.6, PLOP_BEND = 3, SHAKE = 1.6, SHAKE_BEND = 1.5;   // a landing: to the slab that lands, and to those beneath it
  const REBLAST = 0.8, JOSTLE = 0.55;       // a peak while they are coming back, and one while they are apart, beside the thump's 1
  const LAND = 3.2, LAND_NEAR = 0.8, LAND_AT = 0.9;   // the last landing: how hard it hits the cube's top, how widely, and where
  const LAND_SQUASH = 2.6;                  // and the push it gives the squash
  const ROOM = 2;                           // nothing is drawn further than this from the middle
  const WHOLE = Math.sqrt(3) * Math.pow(3, -1 / ROUND);   // how far the resting cube's corners are from its middle
  const ZOOM_BACK = 2;                      // how fast it grows back after being drawn smaller, a second
  const FLASH_S = 0.3;                      // how long the flash of a thump lasts, in seconds
  const LINGER = 0.08;                      // how long the light it leaves behind takes to go, in seconds
  const FOV = 30, PITCH = 6;                // the camera: how wide it sees and how far it looks down, in degrees
  const FRAME = { width: 5.4, height: 4.2, center: [0, 0, 0] };   // what the camera frames
  const TURN = 2 * Math.PI;

  // ── The sound and the settings ──────────────────────────────────────────────

  // How loud a band is, 0..1: its bin, times Gain.
  function loudness(bins, band, gain) {
    if (!bins || !(band < bins.length)) return 0;
    return clamp01((bins[band] / 255) * gain);
  }

  // With the mic off and Idle animation on: how loud band b pretends to be at t seconds.
  function idle(b, t) {
    return Math.max(0, 0.16 + 0.3 * Math.sin(0.9 * t + 1.4 * b));
  }

  // A level that has all but died away is none.
  function settle(v) {
    return v < 1e-4 ? 0 : v;
  }

  // How firm the jelly is, by the Stiffness setting (0..100; 50 is as designed): half as firm
  // at 0, twice at 100. Anything that is not a number is 50.
  function firmOf(stiffness) {
    const v = typeof stiffness === 'number' && Number.isFinite(stiffness) ? clamp(stiffness, 0, 100) : 50;
    return Math.pow(2, (v - 50) / 50);
  }

  // A repeatable generator, 0 to 1.
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ── The shape ───────────────────────────────────────────────────────────────

  // A point of a cube, drawn in toward the middle onto the rounded cube, into out.
  function rounded(out, x, y, z) {
    const r = Math.pow(Math.pow(Math.abs(x), ROUND) + Math.pow(Math.abs(y), ROUND) + Math.pow(Math.abs(z), ROUND), -1 / ROUND);
    out[0] = x * r; out[1] = y * r; out[2] = z * r;
    return out;
  }

  // The rounded cube's skin: n squares along an edge, two triangles each, every point shared
  // by the squares round it, every triangle facing out. points: x y z each. index: three to a triangle.
  function skin(n) {
    const M = n + 1, map = new Int32Array(M * M * M).fill(-1), pts = [], p = [0, 0, 0];
    for (let k = 0; k <= n; k++) for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      if (i !== 0 && i !== n && j !== 0 && j !== n && k !== 0 && k !== n) continue;
      rounded(p, 2 * i / n - 1, 2 * j / n - 1, 2 * k / n - 1);
      map[i + M * (j + M * k)] = pts.length / 3;
      pts.push(p[0], p[1], p[2]);
    }
    const tri = [], c = [0, 0, 0];
    const at = (a, side, u, v) => { c[a] = side; c[(a + 1) % 3] = u; c[(a + 2) % 3] = v; return map[c[0] + M * (c[1] + M * c[2])]; };
    for (let a = 0; a < 3; a++) for (const side of [0, n]) for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) {
      const A = at(a, side, u, v), B = at(a, side, u + 1, v), C = at(a, side, u + 1, v + 1), D = at(a, side, u, v + 1);
      if (side === n) tri.push(A, B, C, A, C, D); else tri.push(A, C, B, A, D, C);
    }
    return { points: new Float32Array(pts), index: new Uint32Array(tri) };
  }

  // The way each point of a skin faces, from the triangles round it, into norm.
  function normalsOf(pos, index, norm) {
    norm.fill(0);
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      norm[a] += nx; norm[a + 1] += ny; norm[a + 2] += nz; norm[b] += nx; norm[b + 1] += ny; norm[b + 2] += nz; norm[c] += nx; norm[c + 1] += ny; norm[c + 2] += nz;
    }
    for (let j = 0; j < norm.length; j += 3) { const l = Math.hypot(norm[j], norm[j + 1], norm[j + 2]) || 1; norm[j] /= l; norm[j + 1] /= l; norm[j + 2] /= l; }
    return norm;
  }

  // The layer at height y of the resting cube (-1 at its foot, 1 at its top), as the number of
  // its colour: 0, 1, 2 or 3, and in the narrow band where two layers meet, between the two.
  // The shader that draws the cube works this out the same way.
  function layerOf(y) {
    const g = clamp01(y * 0.5 + 0.5) * LAYERS - 0.5, f = g - Math.floor(g), t = clamp01((f - 0.36) / 0.28);
    return clamp(Math.floor(g) + t * t * (3 - 2 * t), 0, LAYERS - 1);
  }

  // The slab a height belongs to, the height of slab i's middle, and how wide the cube is there.
  function slabOf(y) {
    return clamp(Math.floor((y + 1) / (2 * THIN)), 0, LAYERS - 1);
  }
  function slabAt(i) {
    return -1 + THIN + 2 * THIN * i;
  }
  function slabWide(i) {
    return Math.pow(1 - Math.pow(Math.abs(slabAt(i)), ROUND), 1 / ROUND);
  }

  // Where the bubbles are in the resting cube, how large each is, and the slab each is in.
  function bubblesAt(seed) {
    const random = rng(seed), home = new Float32Array(BUBBLES * 3), size = new Float32Array(BUBBLES), slab = new Int32Array(BUBBLES);
    for (let i = 0; i < BUBBLES; i++) {
      for (let a = 0; a < 3; a++) home[i * 3 + a] = (random() * 2 - 1) * 0.7;
      size[i] = 0.035 + 0.075 * random() * random();
      slab[i] = slabOf(home[i * 3 + 1]);
    }
    return { home, size, slab };
  }

  // ── The body ────────────────────────────────────────────────────────────────
  // A lattice of G points an edge fills the cube from -1 to 1. u is how far each point is from
  // its place, vel how fast it is going. Each point is drawn toward where its neighbours are
  // (that is the jelly), toward the lift of the middle by a spring that is hard at the middle
  // and all but gone HOLD_WITHIN out (that is what holds it), and is slowed, the more the faster
  // it moves against its neighbours (so a fine ripple dies before a slow wobble does).

  function createBody() {
    const NN = G * G * G, home = new Float64Array(NN * 3), hold = new Float64Array(NN), near = new Int32Array(NN * 6).fill(-1), corner = [];
    for (let k = 0; k < G; k++) for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      const n = i + G * (j + G * k), x = -1 + 2 * i / (G - 1), y = -1 + 2 * j / (G - 1), z = -1 + 2 * k / (G - 1);
      home[n * 3] = x; home[n * 3 + 1] = y; home[n * 3 + 2] = z;
      const in_ = Math.max(0, 1 - Math.hypot(x, y, z) / HOLD_WITHIN);
      hold[n] = REST + HOLD * in_ * in_;
      let c = 0;
      if (i > 0) near[n * 6 + c++] = n - 1; if (i < G - 1) near[n * 6 + c++] = n + 1;
      if (j > 0) near[n * 6 + c++] = n - G; if (j < G - 1) near[n * 6 + c++] = n + G;
      if (k > 0) near[n * 6 + c++] = n - G * G; if (k < G - 1) near[n * 6 + c++] = n + G * G;
    }
    for (let c = 0; c < 8; c++) {
      const cx = c & 1 ? 1 : -1, cy = c & 4 ? 1 : -1, cz = c & 2 ? 1 : -1, w = new Float64Array(NN);
      for (let n = 0; n < NN; n++) { const d = Math.hypot(home[n * 3] - cx, home[n * 3 + 1] - cy, home[n * 3 + 2] - cz); w[n] = Math.exp(-d * d / (2 * PULL_NEAR * PULL_NEAR)); }
      corner.push({ w, way: [cx / Math.sqrt(3), cy / Math.sqrt(3), cz / Math.sqrt(3)] });
    }
    // push: what moves each point in the step being taken. speed: how fast each is going, and most: how far the furthest is from its place, as last
    // measured. left: time not yet stepped. pulled: whether any band pulls.
    return { u: new Float64Array(NN * 3), vel: new Float64Array(NN * 3), force: new Float64Array(NN * 3), push: new Float64Array(NN * 3), speed: new Float64Array(NN), home, hold, near, corner, left: 0, pulled: false, most: 0 };
  }

  // What the bands pull with: each on its own corner, outward, by as much as it is louder than
  // QUIET. A firmer body is pulled harder, so that it still shows (it moves 0.7 as far at twice as firm).
  function pull(body, bands, firm) {
    const F = body.force, NN = body.hold.length;
    F.fill(0);
    body.pulled = false;
    for (let b = 0; b < BANDS; b++) {
      const amp = PULL * Math.sqrt(firm) * Math.max(0, bands[b] - QUIET);
      if (!(amp > 0)) continue;
      body.pulled = true;
      const c = body.corner[CORNER[b]], w = c.w, x = amp * c.way[0], y = amp * c.way[1], z = amp * c.way[2];
      for (let n = 0; n < NN; n++) { const a = n * 3; F[a] += w[n] * x; F[a + 1] += w[n] * y; F[a + 2] += w[n] * z; }
    }
    return body;
  }

  // Where the nth beat slaps it, into out: the next of a fixed round of places on its sides.
  function slapAt(out, n) {
    const a = 2.4 * n, y = 0.7 * Math.sin(1.9 * n + 0.4), r = Math.sqrt(1 - 0.6 * y * y);
    out[0] = 0.9 * r * Math.cos(a); out[1] = 0.9 * y; out[2] = 0.9 * r * Math.sin(a);
    return out;
  }

  // The nth slap: the body is set moving toward its middle, hardest at the place struck.
  const AT = [0, 0, 0];
  function slap(body, n) {
    slapAt(AT, n);
    const V = body.vel, H = body.home, NN = body.hold.length, l = Math.hypot(AT[0], AT[1], AT[2]), x = AT[0] / l, y = AT[1] / l, z = AT[2] / l;
    for (let i = 0; i < NN; i++) {
      const a = i * 3, d2 = (H[a] - AT[0]) * (H[a] - AT[0]) + (H[a + 1] - AT[1]) * (H[a + 1] - AT[1]) + (H[a + 2] - AT[2]) * (H[a + 2] - AT[2]);
      const w = SLAP * Math.exp(-d2 / (2 * SLAP_NEAR * SLAP_NEAR));
      V[a] -= w * x; V[a + 1] -= w * y; V[a + 2] -= w * z;
    }
    return body;
  }

  // One step of STEP seconds. firm: how firm the jelly is. lift: how far up the middle is held.
  // Every point is pushed by where the others were, and how fast, at the start of the step, so
  // the order the points are taken in does not matter and a body pulled evenly stays even.
  function stepBody(body, firm, lift) {
    const U = body.u, V = body.vel, F = body.force, A = body.push, near = body.near, hold = body.hold, NN = hold.length, ks = SPRING * firm, h = STEP;
    for (let n = 0; n < NN; n++) {
      const a = n * 3;
      let ux = 0, uy = 0, uz = 0, vx = 0, vy = 0, vz = 0, cnt = 0;
      for (let e = 0; e < 6; e++) {
        const m = near[n * 6 + e];
        if (m < 0) break;
        const b = m * 3;
        ux += U[b]; uy += U[b + 1]; uz += U[b + 2]; vx += V[b]; vy += V[b + 1]; vz += V[b + 2]; cnt++;
      }
      const hd = hold[n] * firm;
      A[a] = ks * (ux - cnt * U[a]) + VISC * (vx - cnt * V[a]) - hd * U[a] - DAMP * V[a] + F[a];
      A[a + 1] = ks * (uy - cnt * U[a + 1]) + VISC * (vy - cnt * V[a + 1]) - hd * (U[a + 1] - lift) - DAMP * V[a + 1] + F[a + 1];
      A[a + 2] = ks * (uz - cnt * U[a + 2]) + VISC * (vz - cnt * V[a + 2]) - hd * U[a + 2] - DAMP * V[a + 2] + F[a + 2];
    }
    for (let a = 0; a < U.length; a++) { V[a] += h * A[a]; U[a] += h * V[a]; }
    return body;
  }

  // Whether the body is exactly at rest, in its place.
  function atRest(body) {
    const U = body.u, V = body.vel;
    for (let a = 0; a < U.length; a++) if (U[a] !== 0 || V[a] !== 0) return false;
    return true;
  }

  // The body put at rest in its place.
  function calm(body) {
    body.u.fill(0); body.vel.fill(0); body.left = 0;
    return body;
  }

  // dt seconds on: as many whole steps as have come due, at most STEPS_MAX (a frame longer than
  // that lets the rest go). With nothing pulling it and the middle where it belongs, a body
  // that has all but stopped has stopped: a picture that should be still is still. Returns
  // the steps taken.
  function advance(body, dt, firm, lift) {
    if (!(dt > 0)) return 0;
    body.left += dt;
    let n = Math.floor(body.left / STEP);
    if (n >= STEPS_MAX) { n = STEPS_MAX; body.left = 0; } else body.left -= n * STEP;
    for (let i = 0; i < n; i++) stepBody(body, firm, lift);
    if (n > 0 && !body.pulled && lift === 0) {
      const U = body.u, V = body.vel;
      let still = true;
      for (let a = 0; a < U.length; a++) if (Math.abs(U[a]) >= 1e-4 || Math.abs(V[a]) >= 1e-3) { still = false; break; }
      if (still) { U.fill(0); V.fill(0); }
    }
    return n;
  }

  // The last slab has landed: the body is whole and in its place, and moving down at its top.
  function land(body) {
    calm(body);
    const V = body.vel, H = body.home, NN = body.hold.length;
    for (let n = 0; n < NN; n++) {
      const a = n * 3, d2 = H[a] * H[a] + (H[a + 1] - LAND_AT) * (H[a + 1] - LAND_AT) + H[a + 2] * H[a + 2];
      V[a + 1] -= LAND * Math.exp(-d2 / (2 * LAND_NEAR * LAND_NEAR));
    }
    return body;
  }

  // ── The skin, read off the body ─────────────────────────────────────────────

  // Where in the lattice a point of the resting cube lies: its cell (the lowest of the cell's
  // eight points) into cells[at], and how far across the cell it is, into fracs. A point
  // outside the cube is read at the cube's side.
  function locate(cells, fracs, at, x, y, z) {
    const top = G - 1 - 1e-4;
    const fx = clamp((x * 0.5 + 0.5) * (G - 1), 0, top), fy = clamp((y * 0.5 + 0.5) * (G - 1), 0, top), fz = clamp((z * 0.5 + 0.5) * (G - 1), 0, top);
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz);
    cells[at] = i + G * (j + G * k);
    fracs[at * 3] = fx - i; fracs[at * 3 + 1] = fy - j; fracs[at * 3 + 2] = fz - k;
  }

  // What a field of three numbers a point has there, into out; and a field of one.
  function sample(out, field, c, fx, fy, fz) {
    const gx = 1 - fx, gy = 1 - fy, gz = 1 - fz, GG = G * G;
    const w0 = gx * gy * gz, w1 = fx * gy * gz, w2 = gx * fy * gz, w3 = fx * fy * gz, w4 = gx * gy * fz, w5 = fx * gy * fz, w6 = gx * fy * fz, w7 = fx * fy * fz;
    const a = c * 3, b = a + 3, d = (c + G) * 3, e = d + 3, f = (c + GG) * 3, g = f + 3, h = (c + GG + G) * 3, i = h + 3;
    out[0] = w0 * field[a] + w1 * field[b] + w2 * field[d] + w3 * field[e] + w4 * field[f] + w5 * field[g] + w6 * field[h] + w7 * field[i];
    out[1] = w0 * field[a + 1] + w1 * field[b + 1] + w2 * field[d + 1] + w3 * field[e + 1] + w4 * field[f + 1] + w5 * field[g + 1] + w6 * field[h + 1] + w7 * field[i + 1];
    out[2] = w0 * field[a + 2] + w1 * field[b + 2] + w2 * field[d + 2] + w3 * field[e + 2] + w4 * field[f + 2] + w5 * field[g + 2] + w6 * field[h + 2] + w7 * field[i + 2];
    return out;
  }
  function sampleOne(field, c, fx, fy, fz) {
    const gx = 1 - fx, gy = 1 - fy, gz = 1 - fz, GG = G * G;
    return gx * gy * gz * field[c] + fx * gy * gz * field[c + 1] + gx * fy * gz * field[c + G] + fx * fy * gz * field[c + G + 1]
      + gx * gy * fz * field[c + GG] + fx * gy * fz * field[c + GG + 1] + gx * fy * fz * field[c + GG + G] + fx * fy * fz * field[c + GG + G + 1];
  }

  // The squash as drawn, and how much wider a body squashed by q is: as much as keeps its volume.
  function shownSquash(q) {
    return clamp(q, -SQUASH_MAX, SQUASH_MAX);
  }
  function wideFor(q) {
    return 1 / Math.sqrt(1 - q);
  }

  // How fast each point of the body is going (body.speed), and how far the furthest is from
  // its place (body.most). shape() reads the speeds, so this comes first.
  function measure(body) {
    const U = body.u, V = body.vel, S = body.speed, NN = S.length;
    let most = 0;
    for (let n = 0; n < NN; n++) {
      const a = n * 3, d = Math.hypot(U[a], U[a + 1], U[a + 2]);
      S[n] = Math.hypot(V[a], V[a + 1], V[a + 2]);
      if (d > most) most = d;
    }
    body.most = most;
    return body;
  }

  // Points of the resting cube (home, with their cells and fracs) as the body has them, into
  // pos, squashed by q; and into lit how fast the body is moving at each (as last measured),
  // times gain, at most 1. Returns how far the furthest is from the middle.
  const D = [0, 0, 0];
  function shape(pos, lit, body, home, cells, fracs, q, gain) {
    const U = body.u, S = body.speed, shown = shownSquash(q), tall = 1 - shown, wide = wideFor(shown);
    let reach = 0;
    for (let i = 0, n = cells.length; i < n; i++) {
      const j = i * 3;
      sample(D, U, cells[i], fracs[j], fracs[j + 1], fracs[j + 2]);
      const x = (home[j] + D[0]) * wide, y = (home[j + 1] + D[1]) * tall, z = (home[j + 2] + D[2]) * wide, far = Math.hypot(x, y, z);
      pos[j] = x; pos[j + 1] = y; pos[j + 2] = z;
      if (far > reach) reach = far;
      lit[i] = Math.min(1, sampleOne(S, cells[i], fracs[j], fracs[j + 1], fracs[j + 2]) * gain);
    }
    return reach;
  }

  // ── A spring let go ─────────────────────────────────────────────────────────
  // sw is [where it is, how fast it is going]; it swings about `to` at `rate` radians a second
  // and stops as soon as `damp` (under 1) says. This is where the spring would be dt seconds
  // on, not a step toward it, so two half steps are one whole. A spring that has all but
  // stopped where it is going has stopped there.
  function spring(sw, dt, rate, damp, to = 0) {
    const a = damp * rate, wd = rate * Math.sqrt(1 - damp * damp);
    const e = Math.exp(-a * dt), c = Math.cos(wd * dt), sn = Math.sin(wd * dt), x = sw[0] - to, v = sw[1];
    const nx = e * (x * c + ((v + a * x) / wd) * sn), nv = e * (v * c - ((a * v + rate * rate * x) / wd) * sn);
    if (Math.abs(nx) < 1e-4 && Math.abs(nv) < 1e-3) { sw[0] = to; sw[1] = 0; } else { sw[0] = to + nx; sw[1] = nv; }
    return sw;
  }

  // ── The thump: the slabs ────────────────────────────────────────────────────
  // A hard peak knocks the cube apart into its layers. When that happens and when they come
  // back is TimbreHelix's shatter machine, the one DNA and Glass Prism use; how the slabs fly
  // is below. Everything here is in the cube's own frame, so the slabs go on turning with it.

  // The slabs in flight, three numbers to a slab unless said. p, v: how far each is from where
  // it sat, and how fast. r, rv: how far it is turned (about x, y, z), and how fast. tp, tr:
  // the place and the turn it makes for. from, fromR: where its way back started. shown,
  // turned: where it is drawn. One number to a slab: q, qv its squash; bend, bv its flapping;
  // loose how much it sways (0..1) and looseFrom that at the start of the way back; landed.
  function createSlabs() {
    const three = () => new Float64Array(LAYERS * 3), one = () => new Float64Array(LAYERS);
    return { p: three(), v: three(), r: three(), rv: three(), tp: three(), tr: three(), from: three(), fromR: three(), shown: three(), turned: three(),
      q: one(), qv: one(), bend: one(), bv: one(), loose: one(), looseFrom: one(), landed: new Uint8Array(LAYERS) };
  }

  // A throw of `strength`: each slab is given a place to make for (further from the middle
  // than it sat, and a little to one side) and a turn, a push toward the place, a spin, a
  // squash and a flap, on top of what it has. fresh: the cube was whole, so each starts where
  // it sat, squashed as the knock left it. random is asked, for each slab in turn: the place
  // (x, y, z), the turn (x, y, z), the spin (x, y, z), which way it flaps, how hard.
  function throwSlabs(sl, strength, random, fresh) {
    for (let i = 0; i < LAYERS; i++) {
      const j = i * 3;
      if (fresh) {
        for (let a = 0; a < 3; a++) { sl.p[j + a] = 0; sl.v[j + a] = 0; sl.r[j + a] = 0; sl.rv[j + a] = 0; }
        sl.q[i] = KNOCKED; sl.qv[i] = 0; sl.bend[i] = 0; sl.bv[i] = 0; sl.loose[i] = 0;
      }
      sl.landed[i] = 0;
      sl.tp[j] = (random() - 0.5) * SCATTER; sl.tp[j + 1] = slabAt(i) * APART + (random() - 0.5) * SCATTER_UP; sl.tp[j + 2] = (random() - 0.5) * SCATTER;
      sl.tr[j] = (random() - 0.5) * TILT; sl.tr[j + 1] = (random() - 0.5) * TWIST; sl.tr[j + 2] = (random() - 0.5) * TILT;
      for (let a = 0; a < 3; a++) sl.v[j + a] += (sl.tp[j + a] - sl.p[j + a]) * THROW * strength;
      for (let a = 0; a < 3; a++) sl.rv[j + a] += (random() - 0.5) * SPIN * strength;
      sl.qv[i] -= SLAB_KICK * strength;
      const way = random() < 0.5 ? -1 : 1;
      sl.bv[i] += way * (BEND_KICK + BEND_KICK_RANGE * random()) * strength;
    }
    return sl;
  }

  // dt seconds of flight: each slab swings out to its place and its turn and settles there,
  // and comes loose. Exact, so two half steps are one whole.
  const SW = [0, 0];
  function flySlabs(sl, dt) {
    const keep = Math.exp(-LOOSEN * dt);
    for (let j = 0; j < LAYERS * 3; j++) {
      SW[0] = sl.p[j]; SW[1] = sl.v[j]; spring(SW, dt, FLY_RATE, FLY_DAMP, sl.tp[j]); sl.p[j] = SW[0]; sl.v[j] = SW[1];
      SW[0] = sl.r[j]; SW[1] = sl.rv[j]; spring(SW, dt, TURN_RATE, TURN_DAMP, sl.tr[j]); sl.r[j] = SW[0]; sl.rv[j] = SW[1];
    }
    for (let i = 0; i < LAYERS; i++) sl.loose[i] = 1 - (1 - sl.loose[i]) * keep;
    return sl;
  }

  // dt seconds of each slab's own wobble, in the air or on the stack: a syllable (rise: how
  // much louder it got) squashes every slab and flaps each the other way from its neighbour;
  // each leans with its own two bands, by how much louder the lower is than the higher.
  function wobbleSlabs(sl, dt, rise, bands, firm) {
    const f = Math.sqrt(firm);
    for (let i = 0; i < LAYERS; i++) {
      SW[0] = sl.q[i]; SW[1] = sl.qv[i] + SLAB_VOICE * rise; spring(SW, dt, SLAB_RATE * f, SLAB_DAMP); sl.q[i] = SW[0]; sl.qv[i] = SW[1];
      SW[0] = sl.bend[i]; SW[1] = sl.bv[i] + (i % 2 ? -1 : 1) * BEND_VOICE * rise;
      spring(SW, dt, BEND_RATE * f, BEND_DAMP, BEND_LEAN * (bands[2 * i] - bands[2 * i + 1])); sl.bend[i] = SW[0]; sl.bv[i] = SW[1];
    }
    return sl;
  }

  // How a loose slab sways after `clock` seconds, into out (about x, y, z).
  function swayAt(out, i, clock) {
    out[0] = SWAY * Math.sin(0.9 * clock + i); out[1] = 0; out[2] = SWAY * Math.sin(0.7 * clock + 2 * i);
    return out;
  }

  // Where each slab is drawn in flight: the way it has flown, but never further than FLY_MAX
  // from where it sat, and turned as it has turned, swaying by as much as it is loose.
  const SWAYED = [0, 0, 0];
  function showSlabs(sl, clock) {
    for (let i = 0; i < LAYERS; i++) {
      const j = i * 3, long = Math.hypot(sl.p[j], sl.p[j + 1], sl.p[j + 2]);
      const k = long > 1e-9 ? (FLY_MAX * Math.tanh(long / FLY_MAX)) / long : 1;
      swayAt(SWAYED, i, clock);
      for (let a = 0; a < 3; a++) { sl.shown[j + a] = sl.p[j + a] * k; sl.turned[j + a] = sl.r[j + a] + sl.loose[i] * SWAYED[a]; }
    }
    return sl;
  }

  // The same angle, within half a turn of none, so a slab turns home the short way.
  function shortWay(a) {
    return a - TURN * Math.round(a / TURN);
  }

  // The way back begins from where the slabs are drawn; from here placeSlabs() carries them,
  // so their push is spent.
  function startBack(sl) {
    for (let j = 0; j < LAYERS * 3; j++) { sl.from[j] = sl.shown[j]; sl.fromR[j] = shortWay(sl.r[j]); sl.v[j] = 0; sl.rv[j] = 0; }
    for (let i = 0; i < LAYERS; i++) { sl.looseFrom[i] = sl.loose[i]; sl.landed[i] = 0; }
    return sl;
  }

  // How much of its own way back slab i has had, u (0..1) of the way through the return: the
  // bottom slab sets off first, each of the others BACK_LAG later, and each takes BACK_DROP.
  function backShare(u, i) {
    return clamp01((u - BACK_LAG * i) / BACK_DROP);
  }

  // A slab lands on the stack: it squashes and flaps, and shakes the slabs beneath it, less.
  function plop(sl, i) {
    sl.landed[i] = 1;
    sl.qv[i] += PLOP; sl.bv[i] += (i % 2 ? -1 : 1) * PLOP_BEND;
    for (let j = 0; j < i; j++) { sl.qv[j] += SHAKE; sl.bv[j] += (j % 2 ? 1 : -1) * SHAKE_BEND; }
    return sl;
  }

  // The cube sets: every slab that had not landed has landed. A frame long enough to carry
  // the top slab past its landing brings the end of the return in the same frame. Returns how many.
  function landAll(sl) {
    let n = 0;
    for (let i = 0; i < LAYERS; i++) if (!sl.landed[i]) { sl.landed[i] = 1; n++; }
    return n;
  }

  // u (0..1) of the way through the return: each slab has come the square of its share of
  // the way home, so it speeds up into its landing, and sways less the nearer it is. A slab
  // that has arrived lands, once. Returns how many landed.
  function placeSlabs(sl, u, clock) {
    let landings = 0;
    for (let i = 0; i < LAYERS; i++) {
      const j = i * 3, e = backShare(u, i), left = 1 - e * e;
      sl.loose[i] = sl.looseFrom[i] * left;
      swayAt(SWAYED, i, clock);
      for (let a = 0; a < 3; a++) { sl.shown[j + a] = sl.from[j + a] * left; sl.r[j + a] = sl.fromR[j + a] * left; sl.turned[j + a] = sl.r[j + a] + sl.loose[i] * SWAYED[a]; }
      if (e >= 1 && !sl.landed[i]) { plop(sl, i); landings++; }
    }
    return landings;
  }

  // A throw has broken the way back off: flight takes up from where each slab is drawn.
  function resumeSlabs(sl) {
    for (let i = 0; i < LAYERS; i++) {
      const j = i * 3, long = Math.hypot(sl.shown[j], sl.shown[j + 1], sl.shown[j + 2]);
      const k = long > 1e-9 ? (FLY_MAX * Math.atanh(Math.min(long / FLY_MAX, 0.999999))) / long : 1;
      for (let a = 0; a < 3; a++) sl.p[j + a] = sl.shown[j + a] * k;
      sl.landed[i] = 0;
    }
    return sl;
  }

  // Every slab home and at rest.
  function homeSlabs(sl) {
    for (const k of ['p', 'v', 'r', 'rv', 'tp', 'tr', 'from', 'fromR', 'shown', 'turned', 'q', 'qv', 'bend', 'bv', 'loose', 'looseFrom', 'landed']) sl[k].fill(0);
    return sl;
  }

  // A point of a slab (x, y, z from the slab's own middle) squashed by q and bent by `bend`,
  // into out: its rim lifts and its middle sinks, or the other way, and then it is squashed as
  // the cube is. Neither is drawn beyond its limit. The shader that draws a slab does the same.
  function shownBend(bend) {
    return clamp(bend, -BEND_MAX, BEND_MAX);
  }
  function bent(out, x, y, z, q, bend) {
    const s = shownSquash(q), wide = wideFor(s);
    out[0] = x * wide; out[1] = (y + shownBend(bend) * (x * x + z * z - 0.7)) * (1 - s); out[2] = z * wide;
    return out;
  }

  // Where a point of slab i is drawn (x, y, z from the slab's middle), into out: turned as the
  // slab is turned, about z, then y, then x (as three.js turns a group), and carried with it.
  function slabPoint(out, sl, i, x, y, z) {
    const j = i * 3, cx = Math.cos(sl.turned[j]), sx = Math.sin(sl.turned[j]), cy = Math.cos(sl.turned[j + 1]), sy = Math.sin(sl.turned[j + 1]), cz = Math.cos(sl.turned[j + 2]), sz = Math.sin(sl.turned[j + 2]);
    const x1 = x * cz - y * sz, y1 = x * sz + y * cz;
    const x2 = x1 * cy + z * sy, z2 = -x1 * sy + z * cy;
    const y3 = y1 * cx - z2 * sx, z3 = y1 * sx + z2 * cx;
    out[0] = x2 + sl.shown[j]; out[1] = y3 + slabAt(i) + sl.shown[j + 1]; out[2] = z3 + sl.shown[j + 2];
    return out;
  }

  // The round box slab i fits in, squashed by q and bent by `bend`, into out: no point of it
  // is further than out[0] from its upright axis, or than out[1] above or below its middle.
  function slabHalf(out, i, q, bend) {
    const s = shownSquash(q);
    out[0] = Math.SQRT2 * Math.pow(2, -1 / ROUND) * slabWide(i) * wideFor(s);
    out[1] = (THIN + Math.abs(shownBend(bend)) * BEND_SPAN) * (1 - s);
    return out;
  }

  // And no point of any slab, as drawn, is further than this from the middle of the cube: for
  // each, the furthest point of its round box, found from where the cube's middle lies as the
  // slab sees it (its place turned back by the slab's own turn: about x, then y, then z).
  const HALF = [0, 0];
  function reachOf(sl) {
    let reach = 0;
    for (let i = 0; i < LAYERS; i++) {
      const j = i * 3, x = sl.shown[j], y = slabAt(i) + sl.shown[j + 1], z = sl.shown[j + 2];
      const cx = Math.cos(sl.turned[j]), sx = Math.sin(sl.turned[j]), cy = Math.cos(sl.turned[j + 1]), sy = Math.sin(sl.turned[j + 1]), cz = Math.cos(sl.turned[j + 2]), sz = Math.sin(sl.turned[j + 2]);
      const y1 = y * cx + z * sx, z1 = -y * sx + z * cx;
      const x2 = x * cy - z1 * sy, z2 = x * sy + z1 * cy;
      const x3 = x2 * cz + y1 * sz, y3 = -x2 * sz + y1 * cz;
      slabHalf(HALF, i, sl.q[i], sl.bend[i]);
      const far = Math.hypot(Math.hypot(x3, z2) + HALF[0], Math.abs(y3) + HALF[1]);
      if (far > reach) reach = far;
    }
    return reach;
  }

  // ── Room in the picture ─────────────────────────────────────────────────────

  // How far from the middle anything may be drawn: ROOM, less by as much as the Scene Size
  // slider has enlarged the picture (`enlarged`: 1 is as it comes), so that a cube pulled out of
  // shape, or its slabs, stay in it; but never less than the cube at rest takes. Enlarged
  // until the resting cube fills the picture, it has no more room than that.
  function limitFor(enlarged) {
    return Math.max(ROOM / Math.max(1, Number.isFinite(enlarged) ? enlarged : 1), WHOLE);
  }

  // How much smaller everything must be drawn for its furthest point, `reach` from the middle, to be within `limit`.
  function roomFor(reach, limit = ROOM) {
    return reach > limit ? limit / reach : 1;
  }

  // How much smaller it is drawn dt seconds on: at once as small as it must be, and back
  // toward its size at ZOOM_BACK a second. All but its size is its size.
  function zoomAfter(zoom, room, dt) {
    const z = Math.min(room, zoom + (room - zoom) * (1 - Math.exp(-ZOOM_BACK * dt)));
    return room === 1 && 1 - z < 1e-4 ? 1 : z;
  }

  // ── The camera and the light ────────────────────────────────────────────────

  // How the cube is turned after `clock` seconds (about x, y, z), into out: three of its
  // faces showing, turning slowly to and fro.
  function turnAt(out, clock) {
    out[0] = 0.42 + 0.06 * Math.sin(0.11 * clock + 1); out[1] = 0.62 + 0.35 * Math.sin(0.17 * clock); out[2] = 0;
    return out;
  }

  // How far round the camera has swayed at t seconds, by the Camera drift setting (0..100).
  function orbitAt(t, drift) {
    return (0.1 * Math.sin(0.13 * t) * drift) / 50;
  }

  // Its own light, behind it, into out: how bright and how large.
  function glowOf(out, flame, kick, flash) {
    out[0] = 0.04 + 0.12 * flame + 0.2 * kick + 0.5 * flash; out[1] = 5.2;
    return out;
  }

  // How much a beat or a thump's flash brightens the jelly itself: whichever is more.
  function flareOf(kick, flash) {
    return Math.max(kick, flash);
  }

  // How many pixels of the kit's picture, `height` pixels tall, a unit is at one unit from the camera.
  function pxOf(height, zoom) {
    return (height * zoom) / (2 * Math.tan((FOV * Math.PI) / 360));
  }

  // ── The shaders ─────────────────────────────────────────────────────────────
  // The jelly is a solid you can see through, not light: its far side is drawn first, then the
  // bubbles (those are light), then its near side.
  const VERT = `
    attribute vec3 home;
    attribute float stir;
    varying vec3 vN, vW;
    varying float vHeight, vStir;
    void main() {
      vHeight = home.y; vStir = stir;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  // A slab: bent and squashed here, as bent() does it, since it is one piece.
  const SLAB_VERT = `
    uniform float uSquash, uBend;
    varying vec3 vN, vW;
    varying float vHeight, vStir;
    void main() {
      vHeight = 0.0; vStir = 0.0;
      vec3 p = position, n = normal;
      p.y += uBend * (p.x * p.x + p.z * p.z - 0.7);
      n = normalize(vec3(n.x - 2.0 * uBend * p.x * n.y, n.y, n.z - 2.0 * uBend * p.z * n.y));
      float tall = 1.0 - uSquash, wide = inversesqrt(tall);
      p *= vec3(wide, tall, wide); n = normalize(n / vec3(wide, tall, wide));
      vec4 w = modelMatrix * vec4(p, 1.0);
      vW = w.xyz; vN = normalize(mat3(modelMatrix) * n);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const FRAG = `
    precision highp float;
    uniform vec3 uPal[6];
    uniform float uShift, uFlame, uFlare, uBack, uLayer;
    varying vec3 vN, vW;
    varying float vHeight, vStir;
    vec3 pal(float u) {
      u = fract(u) * 6.0; int i = int(floor(u)); float f = u - floor(u); f = f * f * (3.0 - 2.0 * f);
      return mix(uPal[i], uPal[(i + 1) % 6], f);
    }
    void main() {
      vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
      // The layers it was set in, as layerOf() has them. A slab is one of them (uLayer; the cube has -1).
      float g = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0) * ${LAYERS}.0 - 0.5;
      float layer = uLayer >= 0.0 ? uLayer : clamp(floor(g) + smoothstep(0.36, 0.64, fract(g)), 0.0, ${LAYERS - 1}.0);
      vec3 tint = pal(uShift + 0.15 * layer);
      vec3 l1 = normalize(vec3(0.45, 0.80, 0.55)), l2 = normalize(vec3(-0.70, 0.25, 0.60));
      if (uBack > 0.5) {
        // The far side, seen through the body: where the light that entered gathers.
        float lit = 0.5 + 0.5 * dot(-n, l1);
        gl_FragColor = vec4(tint * (0.34 + 0.46 * lit + 0.22 * uFlame + 0.30 * uFlare + 0.6 * vStir), 0.62);
        return;
      }
      float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
      float wrap = 0.5 + 0.5 * dot(n, l1);
      float spec = pow(max(dot(n, normalize(l1 + v)), 0.0), 120.0) * 1.9 + pow(max(dot(n, normalize(l2 + v)), 0.0), 50.0) * 0.55;
      vec3 col = tint * (0.18 + 0.50 * wrap * wrap + 0.10 * uFlame + 0.4 * vStir) + (0.35 * tint + vec3(0.25)) * fres + vec3(spec);
      gl_FragColor = vec4(col, clamp(0.34 + 0.50 * fres + spec, 0.0, 1.0));
    }`;
  // A bubble, in light: a bright rim, a clear middle and a glint. uPx: how many pixels of the
  // picture a unit is, one unit from the camera.
  const BUBBLE_VERT = `
    attribute float size, lit;
    uniform float uPx;
    varying float vLit;
    void main() {
      vLit = lit;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = max(1.5, size * uPx / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`;
  const BUBBLE_FRAG = `
    precision highp float;
    uniform vec3 uColor;
    varying float vLit;
    void main() {
      vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p);
      if (r > 1.0) discard;
      float rim = smoothstep(0.55, 0.9, r) * smoothstep(1.0, 0.9, r), glint = smoothstep(0.32, 0.0, length(p - vec2(-0.35, -0.35))), core = smoothstep(1.0, 0.0, r);
      gl_FragColor = vec4((uColor * (0.5 + 0.5 * core) + vec3(0.6) * glint) * (rim * 0.9 + glint * 0.8 + core * vLit * 2.2) * (0.35 + vLit), 1.0);
    }`;

  // ── The scene ───────────────────────────────────────────────────────────────
  // Everything below runs only when the scene is built: THREE, TimbreScene, TimbreHelix and
  // the core.js globals (the mic, the bins, the palette, the settings) are looked up then.

  // The scene definition, for TimbreScene.factory().
  function definition() {
    const ID = 'jelly';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name, otherwise = 50) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : otherwise;
    };
    const bands = new Float32Array(BANDS), body = createBody(), sl = createSlabs(), sq = [0, 0], glow = [0, 0], turned = [0, 0, 0], point = [0, 0, 0];
    // The shatter machine counts its own pieces; these stand in for the slabs, which fly in 3D here.
    const stubs = Array.from({ length: LAYERS }, () => ({ cx: 500, cy: 500 }));
    let THREE = null, HX = null, machine = null, random = null, group = null, far = null, nearSide = null, halo = null, shared = null, bubbleMat = null, tmp = null, camera = null;
    let geo = null, home = null, index = null, cells = null, fracs = null, pos = null, norm = null, stir = null;
    let bub = null, bubCells = null, bubFracs = null, bubPos = null, bubLit = null, bubFirst = null;
    const slabs = [], bubbleSets = [], order = [0, 1, 2, 3], dist = [0, 0, 0, 0], furthestFirst = (a, b) => dist[b] - dist[a];
    let trail = 0, lastFlame = 0, sinceReturn = 0, drawnAtRest = false;
    // What the checks read. clock: seconds the scene has been live. firm: how firm the jelly is.
    // steps: body steps taken this frame. most: how far its furthest point is from its place.
    // squash: the whole body's. phase: whole, pieces or returning. reach: how far the furthest
    // thing drawn is from the middle; limit: how far it may be; room: how much smaller it must
    // be drawn; zoom: how much smaller it is.
    const s = { flame: 0, kick: 0, clock: 0, live: false, orbit: 0, colorT: 0, firm: 1, beats: 0, slaps: 0, steps: 0, most: 0, squash: 0, lift: 0, drawnFor: 1, px: 0,
      phase: 'whole', thumps: 0, jostles: 0, landed: 0, flash: 0, reach: WHOLE, limit: ROOM, room: 1, zoom: 1, shaped: 0 };

    function build(k) {
      THREE = k.THREE;
      camera = k.camera;
      HX = TimbreHelix;
      machine = HX.createShatter({ random: HX.rng(7) });
      random = rng(7);
      tmp = new THREE.Vector3();
      shared = { uPal: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Color()) }, uShift: { value: 0 }, uFlame: { value: 0 }, uFlare: { value: 0 } };
      const side = (vert, which, back, layer) => new THREE.ShaderMaterial({
        vertexShader: vert, fragmentShader: FRAG, side: which, transparent: true, depthWrite: false, depthTest: false,
        uniforms: Object.assign({}, shared, { uBack: { value: back ? 1 : 0 }, uLayer: { value: layer }, uSquash: { value: 0 }, uBend: { value: 0 } }),
      });
      group = new THREE.Group();
      // The cube: its skin, read off the body each frame.
      const sk = skin(SKIN), V = sk.points.length / 3;
      home = sk.points; index = sk.index;
      cells = new Int32Array(V); fracs = new Float32Array(V * 3); pos = new Float32Array(V * 3); norm = new Float32Array(V * 3); stir = new Float32Array(V);
      for (let i = 0; i < V; i++) locate(cells, fracs, i, home[i * 3], home[i * 3 + 1], home[i * 3 + 2]);
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('normal', new THREE.BufferAttribute(norm, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('stir', new THREE.BufferAttribute(stir, 1).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('home', new THREE.BufferAttribute(home, 3));
      geo.setIndex(new THREE.BufferAttribute(index, 1));
      far = new THREE.Mesh(geo, side(VERT, THREE.BackSide, true, -1));
      nearSide = new THREE.Mesh(geo, side(VERT, THREE.FrontSide, false, -1));
      far.renderOrder = 0; nearSide.renderOrder = 2;
      far.frustumCulled = nearSide.frustumCulled = false;
      group.add(far, nearSide);
      // The four slabs a thump knocks it into: each a rounded tile, as wide as the cube is at its height.
      const tile = skin(SLAB_SKIN);
      for (let i = 0; i < LAYERS; i++) {
        const wide = slabWide(i), p = new Float32Array(tile.points.length), nr = new Float32Array(tile.points.length);
        for (let j = 0; j < p.length; j += 3) { p[j] = tile.points[j] * wide; p[j + 1] = tile.points[j + 1] * THIN; p[j + 2] = tile.points[j + 2] * wide; }
        normalsOf(p, tile.index, nr);
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.BufferAttribute(p, 3)); sg.setAttribute('normal', new THREE.BufferAttribute(nr, 3)); sg.setIndex(new THREE.BufferAttribute(tile.index, 1));
        const g = new THREE.Group(), fm = new THREE.Mesh(sg, side(SLAB_VERT, THREE.BackSide, true, i)), nm = new THREE.Mesh(sg, side(SLAB_VERT, THREE.FrontSide, false, i));
        fm.frustumCulled = nm.frustumCulled = false;
        g.add(fm, nm); g.visible = false; g.position.y = slabAt(i);
        group.add(g);
        slabs.push({ group: g, far: fm, near: nm, squash: [fm.material.uniforms.uSquash, nm.material.uniforms.uSquash], bend: [fm.material.uniforms.uBend, nm.material.uniforms.uBend] });
      }
      // The bubbles, slab by slab, so that each slab's can be drawn with it.
      const made = bubblesAt(SEED), by = Array.from({ length: BUBBLES }, (_, i) => i).sort((a, b) => made.slab[a] - made.slab[b] || a - b);
      bub = { home: new Float32Array(BUBBLES * 3), size: new Float32Array(BUBBLES), slab: new Int32Array(BUBBLES) };
      by.forEach((from, to) => { for (let a = 0; a < 3; a++) bub.home[to * 3 + a] = made.home[from * 3 + a]; bub.size[to] = made.size[from]; bub.slab[to] = made.slab[from]; });
      bubCells = new Int32Array(BUBBLES); bubFracs = new Float32Array(BUBBLES * 3); bubPos = new Float32Array(BUBBLES * 3); bubLit = new Float32Array(BUBBLES);
      for (let i = 0; i < BUBBLES; i++) locate(bubCells, bubFracs, i, bub.home[i * 3], bub.home[i * 3 + 1], bub.home[i * 3 + 2]);
      bubbleMat = k.addLight(new THREE.ShaderMaterial({ vertexShader: BUBBLE_VERT, fragmentShader: BUBBLE_FRAG, depthTest: false, uniforms: { uPx: { value: 1000 }, uColor: { value: new THREE.Color() } } }));
      bubFirst = [0, 0, 0, 0, BUBBLES];
      for (let i = BUBBLES - 1; i >= 0; i--) bubFirst[bub.slab[i]] = i;
      for (let i = LAYERS - 1; i >= 0; i--) if (!bub.slab.includes(i)) bubFirst[i] = bubFirst[i + 1];
      for (let i = 0; i < LAYERS; i++) {
        const a = bubFirst[i], b = bubFirst[i + 1], bg = new THREE.BufferGeometry();
        bg.setAttribute('position', new THREE.BufferAttribute(bubPos.subarray(a * 3, b * 3), 3).setUsage(THREE.DynamicDrawUsage));
        bg.setAttribute('lit', new THREE.BufferAttribute(bubLit.subarray(a, b), 1).setUsage(THREE.DynamicDrawUsage));
        bg.setAttribute('size', new THREE.BufferAttribute(bub.size.subarray(a, b), 1));
        const pts = new THREE.Points(bg, bubbleMat);
        pts.frustumCulled = false;   // when it is drawn is set each frame: with the cube, or with its own slab
        group.add(pts);
        bubbleSets.push(pts);
      }
      // A faint light of its own, behind it.
      halo = new THREE.Sprite(k.addLight(new THREE.SpriteMaterial({ map: k.glowTexture(255, 255, 255), depthTest: false })));
      halo.renderOrder = -1; halo.position.set(0, 0, -1.2);
      k.scene.add(halo);
      k.scene.add(group);
    }

    // The palette colour at t, as the shaders want it (linear), into c.
    function palette(c, t) {
      const p = getColor(t);
      return c.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
    }

    // The cube or the slabs, whichever it is now.
    function show(whole) {
      far.visible = nearSide.visible = whole;
      for (const sb of slabs) sb.group.visible = !whole;
    }

    // The skin and the bubbles, sent to be drawn.
    function send() {
      geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.attributes.stir.needsUpdate = true;
      sendBubbles();
    }
    function sendBubbles() {
      for (const b of bubbleSets) { b.geometry.attributes.position.needsUpdate = true; b.geometry.attributes.lit.needsUpdate = true; }
    }

    // Apart: the slabs put where their flight has them, the furthest from the camera first so
    // that a nearer one is drawn over it, each slab's bubbles between its two sides and riding in it.
    function arrange() {
      group.updateMatrixWorld(true);
      for (let i = 0; i < LAYERS; i++) {
        const j = i * 3, sb = slabs[i], squash = shownSquash(sl.q[i]), bend = shownBend(sl.bend[i]);
        sb.group.position.set(sl.shown[j], slabAt(i) + sl.shown[j + 1], sl.shown[j + 2]);
        sb.group.rotation.set(sl.turned[j], sl.turned[j + 1], sl.turned[j + 2]);
        sb.squash[0].value = sb.squash[1].value = squash;
        sb.bend[0].value = sb.bend[1].value = bend;
        sb.group.updateMatrixWorld(true);
        dist[i] = sb.group.getWorldPosition(tmp).distanceTo(camera.position);
        order[i] = i;
      }
      order.sort(furthestFirst);
      for (let rank = 0; rank < LAYERS; rank++) { const i = order[rank]; slabs[i].far.renderOrder = rank * 3; bubbleSets[i].renderOrder = rank * 3 + 1; slabs[i].near.renderOrder = rank * 3 + 2; }
      for (let i = 0; i < BUBBLES; i++) {
        const j = i * 3, b = bub.slab[i];
        bent(point, bub.home[j], bub.home[j + 1] - slabAt(b), bub.home[j + 2], sl.q[b], sl.bend[b]);
        slabPoint(point, sl, b, point[0], point[1], point[2]);
        bubPos[j] = point[0]; bubPos[j + 1] = point[1]; bubPos[j + 2] = point[2];
        bubLit[i] = Math.min(1, 0.5 * s.flash + Math.min(0.6, Math.abs(sl.qv[b]) * 0.12));
      }
      sendBubbles();
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = orbitAt(t, knob('cameraDrift'));

      // With the mic and Idle animation both off, it stops turning and comes to rest.
      s.live = !!(micActive || cfgIdleAnim);
      if (s.live) s.clock += dt;
      const flame = s.flame = settle(audio.flame), kick = s.kick = settle(audio.kick);
      const firm = s.firm = firmOf(knob('stiffness'));
      const rise = Math.max(0, flame - lastFlame);
      lastFlame = flame;
      if (audio.beat) s.beats++;

      // Each band is followed: quick up, slower down.
      for (let b = 0; b < BANDS; b++) {
        let v = 0;
        if (micActive) v = loudness(frequencies, b, cfgGain);
        else if (cfgIdleAnim) v = idle(b, s.clock);
        bands[b] = follow(bands[b], v, v > bands[b] ? RISE : FALL, dt);
        if (v === 0) bands[b] = settle(bands[b]);   // all but silent is silent: a muted jelly comes to rest
      }

      // The thump. The machine says when: a hard peak with the mic on knocks the cube apart, a
      // peak while it is apart throws the slabs again, and after a calm wait they come back.
      // The peak is the raw input level, before Gain, as DNA hears it.
      s.flash = settle(s.flash * Math.exp(-dt / FLASH_S));
      const was = machine.state;
      const event = machine.step({
        now, dt, live: !!micActive,
        peak: typeof micPeak === 'number' ? micPeak : HX.peakOf(typeof waveform === 'undefined' ? null : waveform),
        threshold: HX.threshold(knob('shatterSensitivity')), reconnectS: knob('reconnectSeconds', 3),
        W: 1000, H: 1000, scale: 1, cut: () => stubs,
      });
      if (event === 'shatter') {
        random = rng(1000 + ++s.thumps);   // each thump its own, and the same again another day
        throwSlabs(sl, 1, random, true);
        show(false);
        s.flash = 1;
      } else if (event === 'jostle') {
        s.jostles++;
        if (was === 'returning') { resumeSlabs(sl); throwSlabs(sl, REBLAST, random, false); s.flash = Math.max(s.flash, 0.6); }
        else { throwSlabs(sl, JOSTLE, random, false); s.flash = Math.max(s.flash, 0.3); }
      } else if (event === 'return') {
        startBack(sl);
        sinceReturn = 0;
      } else if (event === 'whole' || event === 'reset') {
        if (event === 'whole') s.landed += landAll(sl);   // a frame so long that it passed the last landing
        homeSlabs(sl);
        show(true);
        sq[0] = 0; sq[1] = 0;
        drawnAtRest = false;
        if (event === 'whole') { land(body); sq[1] = LAND_SQUASH; s.flash = Math.max(s.flash, 0.55); }
        else { calm(body); s.flash = 0; s.zoom = 1; }   // the page had stopped drawing: it resumes whole, at rest, its own size
      } else if (machine.state === 'returning') sinceReturn += dt;   // in step with the machine's own progress through the return
      s.phase = machine.state;

      if (s.phase === 'whole') {
        // The soft body: each band pulls its corner, a syllable lifts the middle and squashes
        // the body, a beat slaps a face.
        pull(body, bands, firm);
        trail = follow(trail, flame, TRAIL, dt);
        if (flame === 0) trail = settle(trail);
        s.lift = JOLT * (flame - trail);
        if (audio.beat) { slap(body, s.slaps++); sq[1] += SQUASH_BEAT; }
        sq[1] += SQUASH_VOICE * rise;
        s.steps = advance(body, dt, firm, s.lift);
        spring(sq, dt, SQUASH_RATE * Math.sqrt(firm), SQUASH_DAMP);
        const resting = atRest(body) && sq[0] === 0 && sq[1] === 0 && s.flash === 0;
        if (!resting || !drawnAtRest) {
          measure(body);
          s.reach = shape(pos, stir, body, home, cells, fracs, sq[0], STIR);
          normalsOf(pos, index, norm);
          shape(bubPos, bubLit, body, bub.home, bubCells, bubFracs, sq[0], STIR_BUBBLE);
          for (let i = 0; i < BUBBLES; i++) bubLit[i] = Math.min(1, bubLit[i] + 0.5 * s.flash);
          send();
          s.shaped++;
          drawnAtRest = resting;
        }
        s.most = body.most;
        s.squash = sq[0];
        for (const b of bubbleSets) b.renderOrder = 1;
      } else {
        // Apart: each slab flies, or is carried home, and wobbles by itself.
        trail = flame; s.lift = 0; s.steps = 0; s.most = 0;
        wobbleSlabs(sl, dt, rise, bands, firm);
        if (s.phase === 'pieces') { flySlabs(sl, dt); showSlabs(sl, s.clock); }
        else {
          const landings = placeSlabs(sl, Math.min(1, sinceReturn / HX.RETURN_S), s.clock);
          if (landings) { s.landed += landings; s.flash = Math.max(s.flash, 0.3); }
        }
        s.reach = reachOf(sl);
        s.squash = sl.q[0];
      }

      // Swollen or apart, it is drawn smaller by as much as keeps all of it in the picture: at once, and back slowly.
      s.limit = limitFor(k.camera.zoom);
      s.room = roomFor(s.reach, s.limit);
      s.zoom = zoomAfter(s.zoom, s.room, dt);
      group.scale.setScalar(s.zoom);
      turnAt(turned, s.clock);
      group.rotation.set(turned[0], turned[1], turned[2]);
      if (s.phase !== 'whole') arrange();

      // The colours: six from round the palette for the layers to run through, drifting slowly.
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      for (let i = 0; i < 6; i++) palette(shared.uPal.value[i], colorT + i * (PALETTE.length / 6));
      shared.uShift.value = (0.015 * s.clock) % 1;
      shared.uFlame.value = flame;
      shared.uFlare.value = flareOf(kick, s.flash);
      palette(bubbleMat.uniforms.uColor.value, colorT + PALETTE.length / 2);
      s.drawnFor = TimbreScene.renderScale(canvas3d.height);   // how many pixels of the kit's picture make one of the page
      s.px = bubbleMat.uniforms.uPx.value = pxOf(s.drawnFor * canvas3d.height, k.camera.zoom) * s.zoom;
      glowOf(glow, flame, kick, s.flash);
      palette(halo.material.color, colorT + 1).multiplyScalar(glow[0]);
      halo.scale.setScalar(glow[1] * s.zoom);
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: PITCH,
      cooling: [LINGER, LINGER, LINGER],
      build,
      update,
      debug() {
        if (!halo) return Object.assign({}, s);
        // What is drawn, read back from the meshes and their uniforms.
        const out = { r: 0, g: 0, b: 0 };
        const srgb = (c) => { c.getRGB(out, THREE.SRGBColorSpace); return [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)]; };
        // A slab's tile as built: how far it reaches along x, y and z; and whether every way it faces is one long.
        const tileOf = (g) => { const p = g.attributes.position.array, far = [0, 0, 0]; for (let i = 0; i < p.length; i++) if (Math.abs(p[i]) > far[i % 3]) far[i % 3] = Math.abs(p[i]); return far; };
        const facedOf = (g) => { const n = g.attributes.normal.array; for (let i = 0; i < n.length; i += 3) if (Math.abs(Math.hypot(n[i], n[i + 1], n[i + 2]) - 1) > 1e-4) return false; return true; };
        const mat = (m) => ({ back: m.uniforms.uBack.value, layer: m.uniforms.uLayer.value, squash: m.uniforms.uSquash.value, bend: m.uniforms.uBend.value,
          solid: m.blending === THREE.NormalBlending && m.transparent === true && m.depthWrite === false && m.depthTest === false, side: m.side === THREE.BackSide ? 'back' : m.side === THREE.FrontSide ? 'front' : 'both' });
        const d = Object.assign({
          bands: Array.from(bands), sq: sq.slice(), trail, sinceReturn, left: body.left, pulled: body.pulled,
          turnedTo: [group.rotation.x, group.rotation.y, group.rotation.z], scale: group.scale.x,
          cube: { shown: far.visible && nearSide.visible, order: [far.renderOrder, nearSide.renderOrder], far: mat(far.material), near: mat(nearSide.material), sameSkin: far.geometry === nearSide.geometry },
          slabs: slabs.map((sb, i) => ({ tile: tileOf(sb.far.geometry), faced: facedOf(sb.far.geometry), shown: sb.group.visible, at: sb.group.position.toArray(), turned: [sb.group.rotation.x, sb.group.rotation.y, sb.group.rotation.z], order: [sb.far.renderOrder, bubbleSets[i].renderOrder, sb.near.renderOrder], away: dist[i],
            far: mat(sb.far.material), near: mat(sb.near.material), points: sb.far.geometry.attributes.position.count, sameTile: sb.far.geometry === sb.near.geometry })),
          flight: { p: Array.from(sl.p), r: Array.from(sl.r), tp: Array.from(sl.tp), tr: Array.from(sl.tr), shown: Array.from(sl.shown), turned: Array.from(sl.turned), q: Array.from(sl.q), bend: Array.from(sl.bend), loose: Array.from(sl.loose), landed: Array.from(sl.landed) },
          bubbleSets: bubbleSets.map((b) => ({ count: b.geometry.attributes.position.count, order: b.renderOrder })), bubbleFirst: bubFirst.slice(), bubbleSlab: Array.from(bub.slab),
          bubbleLight: bubbleMat.blending === THREE.CustomBlending && bubbleMat.blendDst === THREE.OneFactor && bubbleMat.depthTest === false, bubbleColor: srgb(bubbleMat.uniforms.uColor.value),
          pal: shared.uPal.value.map(srgb), shift: shared.uShift.value, given: [shared.uFlame.value, shared.uFlare.value],
          halo: { size: halo.scale.x, light: [halo.material.color.r, halo.material.color.g, halo.material.color.b], order: halo.renderOrder, at: halo.position.toArray() },
          uploads: [geo.attributes.position.version, geo.attributes.normal.version, geo.attributes.stir.version, bubbleSets[0].geometry.attributes.position.version],
          skinPoints: pos.length / 3, triangles: index.length / 3,
          neverCulled: [far, nearSide, ...bubbleSets, ...slabs.map((sb) => sb.far), ...slabs.map((sb) => sb.near)].every((o) => o.frustumCulled === false),
          // How the cube stands and how the camera saw the last frame, so that a check can say where on the canvas a point of it was drawn.
          world: group.matrixWorld.toArray(), view: camera.matrixWorldInverse.toArray(), proj: camera.projectionMatrix.toArray(),
        }, s);
        // The long lists, made only when asked for.
        Object.defineProperty(d, 'points', { get: () => Array.from(pos) });
        Object.defineProperty(d, 'facing', { get: () => Array.from(norm) });
        Object.defineProperty(d, 'stirred', { get: () => Array.from(stir) });
        Object.defineProperty(d, 'bubbles', { get: () => Array.from(bubPos) });
        Object.defineProperty(d, 'bubbleLit', { get: () => Array.from(bubLit) });
        Object.defineProperty(d, 'bubbleHome', { get: () => Array.from(bub.home) });
        Object.defineProperty(d, 'lattice', { get: () => Array.from(body.u) });
        return d;
      },
    };
  }

  globalThis.TimbreJelly = {
    BANDS, G, SKIN, SLAB_SKIN, ROUND, LAYERS, THIN, BUBBLES, SEED, SPRING, HOLD, HOLD_WITHIN, REST, DAMP, VISC, STEP, STEPS_MAX, RISE, FALL, QUIET, PULL, PULL_NEAR, SLAP, SLAP_NEAR, JOLT, TRAIL,
    SQUASH_RATE, SQUASH_DAMP, SQUASH_MAX, SQUASH_BEAT, SQUASH_VOICE, STIR, STIR_BUBBLE, CORNER, APART, SCATTER, SCATTER_UP, TILT, TWIST, THROW, SPIN, FLY_RATE, FLY_DAMP, TURN_RATE, TURN_DAMP, FLY_MAX, KNOCKED,
    SLAB_RATE, SLAB_DAMP, BEND_RATE, BEND_DAMP, BEND_MAX, BEND_SPAN, SLAB_KICK, BEND_KICK, BEND_KICK_RANGE, SLAB_VOICE, BEND_VOICE, BEND_LEAN, SWAY, LOOSEN, BACK_LAG, BACK_DROP, PLOP, PLOP_BEND, SHAKE, SHAKE_BEND,
    REBLAST, JOSTLE, LAND, LAND_NEAR, LAND_AT, LAND_SQUASH, ROOM, WHOLE, ZOOM_BACK, FLASH_S, LINGER, FOV, PITCH, FRAME,
    VERT, SLAB_VERT, FRAG, BUBBLE_VERT, BUBBLE_FRAG,
    loudness, idle, settle, firmOf, rng, rounded, skin, normalsOf, layerOf, slabOf, slabAt, slabWide, bubblesAt,
    createBody, pull, slapAt, slap, stepBody, atRest, calm, advance, land, locate, sample, sampleOne, shownSquash, wideFor, measure, shape, spring,
    createSlabs, throwSlabs, flySlabs, wobbleSlabs, swayAt, showSlabs, shortWay, startBack, backShare, plop, landAll, placeSlabs, resumeSlabs, homeSlabs, shownBend, bent, slabPoint, slabHalf, reachOf,
    limitFor, roomFor, zoomAfter, turnAt, orbitAt, glowOf, flareOf, pxOf, definition,
  };
})();
