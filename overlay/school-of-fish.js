// Timbre: the School of Fish effect, as `globalThis.TimbreSchool`.
//
// A school of fish swims in the box. It is a real flock: each fish keeps clear of the fish
// near it, swims the way they swim and stays with them. What holds the school in the picture
// is that it mills: every fish also swims round with the rest and makes for its own place in
// the school, which is a ball, a ring or a column.
//
// The voice drives it. Louder, it swims faster and packs tighter. A syllable is a shimmer that
// runs once round the school. Each fish listens to one of the eight lowest bands. A beat makes
// the school dart. A thump of the mic is a fright: the fish bolt apart and wander, and after a
// calm wait they stream back as the next shape.
//
// Everything here but `definition()` is arithmetic, so that `verify` can check it under Node.
// Valid as BOTH a classic <script> and an ES module (it only assigns `globalThis.TimbreSchool`),
// the same trick as shared/viz-config.js.

(function () {
  'use strict';

  const BANDS = 8;                          // bands the fish listen to: the eight lowest bins
  const PER_MIN = 12, PER_MAX = 60;         // fish to a band at Density 0 and at 100
  const FISH_MAX = BANDS * PER_MAX;
  const SEED = 20261122;                    // what the school is made from
  const STEP = 1 / 60, STEPS_MAX = 6;       // the school's step, in seconds, and the most taken in one frame
  const NEAR = 0.46;                        // how far a fish looks for neighbours
  const CLEAR = 0.11;                       // two fish keep this far apart for each unit of their two sizes added
  const BASE = 1.05;                        // swimming speed, in units a second
  const START = 0.5;                        // how much of it a fish has to begin with
  const LEN = 0.17, TAIL = 1.62;            // half the length of a fish of size 1, and how far its tail reaches behind its middle for each of that
  const EGG = [2, 1.4, 1.2];                // where the fish wander when the school has burst: an egg this far each way
  const LEAN = [0.30, 0.58, 0.14];          // how far each shape leans toward the viewer, in radians
  const FORMS = ['ball', 'ring', 'column'];
  const BALL = [0.40, 0.82];                // the ball: its innermost round, and how much further out its outermost is
  const AXIS_TILT = 1.3;                    // how far a fish's own round may tilt from the upright, in radians
  const RING = 1.2, RING_WIDE = 0.18, RING_HIGH = 0.2;   // the ring: its radius, and how far a fish's place may be from it, outward and up
  const COLUMN = [0.30, 0.26], COLUMN_WIDE = 0.1, COLUMN_HIGH = 1.1;   // the column: its radius at the foot and what it gains by the middle (and again by the top), and half its height
  const SWING = 0.15;                       // how much wider of the middle a fish swims while its band sounds
  const TIGHT = 0.2;                        // how much the school draws in when the sound is at its loudest
  const PULL = 2.4, PULL_MAX = 1.4;         // how hard a fish makes for its place, for each unit it is from it, and the most that counts
  const STAY = 0.5, WITH = 0.9;             // how hard it is drawn to its neighbours, and turned the way they swim
  const STAY_APART = 0.05, WITH_APART = 0.3;   // and when the school has burst
  const PART = 2.2;                         // how hard two fish too close push off
  const TURN = 2.4, TURN_LOUD = 2.5, TURN_APART = 1, TURN_BACK = 2;   // how fast a fish turns, a second; more when it is loud, when it is alone, and when it is streaming back
  const HURRY = 1.5;                        // how much faster a fish streaming back swims while it is a unit or more from its place
  const BOLT_FAST = 1.6, BOLT_STIFF = 2;    // when the school has burst, a fish faster than this hardly turns: so much less for each unit faster
  const SPEED_RATE = 2.6, DASH = 6;         // how fast a fish's speed goes to the speed it wants, a second: in the school, and when the school has burst (so a bolt is a dash)
  const BEAT = 5, BEAT_FAST = 11;           // its tail's beat, in radians a second: idling, and more for each unit of speed
  const BOLT = [0.5, 0.45];                 // a bolting fish goes this share of the way to the edge of the egg, and up to this much more
  const REBOLT = 0.8, JOSTLE = 0.6;         // a peak while they are streaming back, and one while they are apart, beside the thump's 1
  const JOIN = 0.15;                        // a fish that joins is put within this much, each way, of one already there
  const ARRIVE = 0.3, LOITER = 0.4, ROAM = 0.92;   // a wandering fish is there when this close; its next place is within this much of where its fright left it; one caught outside the egg comes back to within this share of it
  const WALL = 3, WALL_FROM = 0.9, WALL_SLOW = 0.88;   // outside the egg: how hard it is turned back, from where, and how much of its speed it keeps each step while still heading out
  const RISE = 20, FALL = 5;                // how fast a band is followed, up and down, a second
  const TRAIL = 8, PULSE = 5;               // how fast the loudness just past is forgotten, a second, and how much of a syllable a rise of 1 is
  const ROUND_S = 0.7, FADE = 0.45, HISTORY = 64;   // the shimmer: how long it takes to go round, how much it has faded by then, and how many steps are remembered
  const ROLL = 1.15;                        // how far a flashing fish rolls onto its side, in radians
  const DART_S = 0.25, FLASH_S = 0.3, FLASH_KEEP_S = 0.085;   // how long a beat's dart lasts, the flash of a fright, and a fish's own flash, in seconds
  const DART_FLASH = 0.6;                   // how much of a dart every fish flashes by
  const BUBBLES = 90, BUBBLE_S = 2.6, BUBBLE_RATE = 26;   // the bubbles: how many at most, how long one lasts, and how many leave a second at the loudest syllable
  const FILL = 0.96, ZOOM_BACK = 2;         // the share of the frame the school may fill, and how fast it grows back after being drawn smaller, a second
  const SWAY = 0.16, ORBIT_RATE = 0.13;     // the camera: how far it sways each way at Camera drift 50, in radians, and how fast
  const LINGER = 0.08;                      // how long the light the bubbles leave behind takes to go, in seconds
  // The light rippling on the fish is three waves of the time the shader is handed, at rates
  // of 1.7, 1 and 1.3. They all come round every 20π (17, 10 and 13 turns), so that time is
  // wrapped there: the shader's float stays under 63 however long the scene has run, and the
  // wrap is not seen.
  const RIPPLE_ROUND = 20 * Math.PI;
  const FOV = 30, PITCH = 6;               // the camera: how wide it sees and how far it looks down, in degrees
  const FRAME = { width: 5.0, height: 3.9, center: [0, 0, 0] };   // what the camera frames

  // ── The settings and the sound ──────────────────────────────────────────────

  // Density (0 to 100) to a number of fish: the same number to each band.
  function countFor(density) {
    const d = typeof density === 'number' && Number.isFinite(density) ? Math.max(0, Math.min(100, density)) : 50;
    return BANDS * Math.round(PER_MIN + (PER_MAX - PER_MIN) * d / 100);
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
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const ease = (t) => t * t * (3 - 2 * t);

  // ── One fish ────────────────────────────────────────────────────────────────

  // Nose toward +x, back toward +y: a body of rings that closes at the nose, a forked tail
  // and a fin on its back. The tail and the fin are flat and are marked as fins.
  function fishShape() {
    const NS = 14, NA = 10, pos = [], fin = [], tri = [];
    const high = (t) => 0.36 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, 1.4))), 0.85) + 0.045 * (1 - t);
    for (let s = 0; s <= NS; s++) {
      const t = s / NS, x = -1 + 2 * t, h = high(t), w = 0.46 * h;
      for (let a = 0; a < NA; a++) { const g = (a / NA) * Math.PI * 2; pos.push(x, h * Math.cos(g), w * Math.sin(g)); fin.push(0); }
    }
    for (let s = 0; s < NS; s++) for (let a = 0; a < NA; a++) {
      const A = s * NA + a, B = s * NA + (a + 1) % NA, C = (s + 1) * NA + a, D = (s + 1) * NA + (a + 1) % NA;
      tri.push(A, B, C, B, D, C);
    }
    const flat = (pts, faces) => { const at = pos.length / 3; for (const p of pts) { pos.push(p[0], p[1], 0); fin.push(1); } for (const f of faces) tri.push(at + f[0], at + f[1], at + f[2]); };
    flat([[-1, 0.045], [-1, -0.045], [-TAIL, 0.46], [-TAIL, -0.46], [-1.3, 0]], [[0, 2, 4], [0, 4, 1], [1, 4, 3]]);
    flat([[0.45, 0.33], [-0.35, 0.25], [-0.32, 0.6]], [[0, 2, 1]]);
    const points = new Float32Array(pos), index = new Uint16Array(tri), normals = new Float32Array(points.length);
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
      const e1x = points[b] - points[a], e1y = points[b + 1] - points[a + 1], e1z = points[b + 2] - points[a + 2], e2x = points[c] - points[a], e2y = points[c + 1] - points[a + 1], e2z = points[c + 2] - points[a + 2];
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      for (const v of [a, b, c]) { normals[v] += nx; normals[v + 1] += ny; normals[v + 2] += nz; }
    }
    for (let j = 0; j < normals.length; j += 3) { const l = Math.hypot(normals[j], normals[j + 1], normals[j + 2]) || 1; normals[j] /= l; normals[j + 1] /= l; normals[j + 2] /= l; }
    return { points, normals, fin: new Float32Array(fin), index };
  }

  // ── The school ──────────────────────────────────────────────────────────────

  // Every fish there can be: its size, its band, its own round of the ball, its place in the
  // ring and in the column, and where it is and the way it heads to begin with (a ball).
  function createSchool(seed = SEED) {
    const N = FISH_MAX, random = rng(seed), cs = Math.cos(LEAN[0]), sn = Math.sin(LEAN[0]);
    const sc = {
      p: new Float32Array(N * 3), d: new Float32Array(N * 3), sp: new Float32Array(N), size: new Float32Array(N), band: new Int32Array(N), beat: new Float32Array(N),
      shell: new Float32Array(N), high: new Float32Array(N), off: new Float32Array(N), off2: new Float32Array(N), side: new Float32Array(N), axis: new Float32Array(N * 3),
      roam: new Float32Array(N * 3), home: new Float32Array(N * 3), flash: new Float32Array(N), hist: new Float32Array(HISTORY), at: 0, form: 0, left: 0,
    };
    const out = [0, 0, 0];
    for (let i = 0; i < N; i++) {
      const a = i * 3, b = i % BANDS;
      sc.band[i] = b;
      sc.size[i] = (1.5 - 0.95 * (b / (BANDS - 1))) * (0.88 + 0.24 * random());
      sc.shell[i] = Math.cbrt(random()); sc.high[i] = random() * 2 - 1; sc.off[i] = random() * 2 - 1; sc.off2[i] = random() * 2 - 1;
      sc.side[i] = random() < 0.5 ? -1 : 1; sc.beat[i] = random() * 2 * Math.PI;
      const th = random() * AXIS_TILT, ph = random() * 2 * Math.PI, g = random() * 2 * Math.PI;
      const ax = Math.sin(th) * Math.cos(ph), ay = Math.cos(th), az = Math.sin(th) * Math.sin(ph);
      sc.axis[a] = ax; sc.axis[a + 1] = ay; sc.axis[a + 2] = az;
      // A place on its own round: two lines square to its axis and to each other.
      const l = Math.hypot(ay, ax), e1x = ay / l, e1y = -ax / l;
      const e2x = -az * e1y, e2y = az * e1x, e2z = ax * e1y - ay * e1x;
      const R = BALL[0] + BALL[1] * sc.shell[i], cg = Math.cos(g), sg = Math.sin(g);
      const x = R * (e1x * cg + e2x * sg), y = R * (e1y * cg + e2y * sg), z = R * e2z * sg;
      sc.p[a] = x; sc.p[a + 1] = y * cs - z * sn; sc.p[a + 2] = y * sn + z * cs;
      steer(out, sc, i, 0, 1, 0);
      const ol = Math.hypot(out[0], out[1], out[2]) || 1;
      sc.d[a] = out[0] / ol; sc.d[a + 1] = out[1] / ol; sc.d[a + 2] = out[2] / ol;
      sc.sp[i] = BASE * START;
    }
    return sc;
  }

  // Where the school wants fish i to swim: round with the rest, and toward its own place.
  // `tight` draws the whole school in (1 is its full size); `loud` is its own band. Says how
  // far the fish is from its place.
  function steer(out, sc, i, form, tight, loud) {
    const a = i * 3, cs = Math.cos(LEAN[form]), sn = Math.sin(LEAN[form]);
    const x = sc.p[a], y = sc.p[a + 1] * cs + sc.p[a + 2] * sn, z = -sc.p[a + 1] * sn + sc.p[a + 2] * cs;   // in the shape's own leaning space
    let tx, ty, tz, px, py, pz;
    if (form === 0) {
      const ax = sc.axis[a], ay = sc.axis[a + 1], az = sc.axis[a + 2], r = Math.hypot(x, y, z) || 1e-4;
      const R = (BALL[0] + BALL[1] * sc.shell[i]) * tight + SWING * loud, h = x * ax + y * ay + z * az, pr = (R - r) / r;
      tx = ay * z - az * y; ty = az * x - ax * z; tz = ax * y - ay * x;
      px = pr * x - h * ax; py = pr * y - h * ay; pz = pr * z - h * az;
    } else {
      const rho = Math.hypot(x, z) || 1e-4;
      const R = (form === 1 ? RING + RING_WIDE * sc.off[i] : COLUMN[0] + COLUMN[1] * (sc.high[i] + 1) + COLUMN_WIDE * sc.off[i]) * tight + SWING * loud;
      const y0 = form === 1 ? RING_HIGH * sc.off2[i] : COLUMN_HIGH * sc.high[i], pr = (R - rho) / rho;
      tx = z / rho; ty = 0; tz = -x / rho;
      px = pr * x; py = y0 - y; pz = pr * z;
    }
    const tl = Math.hypot(tx, ty, tz) || 1, pl = Math.hypot(px, py, pz), pc = PULL * (pl > PULL_MAX ? PULL_MAX / pl : 1);
    const fx = tx / tl + pc * px, fy = ty / tl + pc * py, fz = tz / tl + pc * pz;
    out[0] = fx; out[1] = fy * cs - fz * sn; out[2] = fy * sn + fz * cs;
    return pl;
  }

  // What the fish near fish i do to it, among the first n: it is drawn toward them and turned
  // the way they swim, and pushed off any that is too close. `whole` is the school together.
  function flock(out, sc, n, i, whole, flame, gain) {
    const a = i * 3, x = sc.p[a], y = sc.p[a + 1], z = sc.p[a + 2], near2 = NEAR * NEAR;
    let count = 0, cx = 0, cy = 0, cz = 0, vx = 0, vy = 0, vz = 0, sx = 0, sy = 0, sz = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const c = j * 3, dx = sc.p[c] - x, dy = sc.p[c + 1] - y, dz = sc.p[c + 2] - z, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > near2) continue;
      count++; cx += dx; cy += dy; cz += dz; vx += sc.d[c]; vy += sc.d[c + 1]; vz += sc.d[c + 2];
      const clear = CLEAR * (sc.size[i] + sc.size[j]);
      if (d2 < clear * clear) { const d = Math.sqrt(d2) || 1e-4, w = (1 - d / clear) / d; sx -= dx * w; sy -= dy * w; sz -= dz * w; }
    }
    out[0] = PART * sx; out[1] = PART * sy; out[2] = PART * sz;
    if (count) {
      const stay = (whole ? STAY * (1 + flame) * gain : STAY_APART) / count, along = whole ? WITH : WITH_APART;
      out[0] += stay * cx + along * (vx / count - sc.d[a]); out[1] += stay * cy + along * (vy / count - sc.d[a + 1]); out[2] += stay * cz + along * (vz / count - sc.d[a + 2]);
    }
  }

  // How far fish i can go the way it is heading before the edge of the egg; none if it is outside.
  function toEdge(sc, i) {
    const a = i * 3;
    let A = 0, B = 0, C = -1;
    for (let c = 0; c < 3; c++) { const p = sc.p[a + c] / EGG[c], d = sc.d[a + c] / EGG[c]; A += d * d; B += 2 * p * d; C += p * p; }
    if (C >= 0 || A === 0) return 0;
    return (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);
  }
  // A new place for fish i to make for: near where its fright left it.
  function loiterTo(sc, i, random) {
    const a = i * 3;
    let x, y, z;
    do { x = random() * 2 - 1; y = random() * 2 - 1; z = random() * 2 - 1; } while (x * x + y * y + z * z > 1);
    sc.roam[a] = sc.home[a] + LOITER * x; sc.roam[a + 1] = sc.home[a + 1] + LOITER * y; sc.roam[a + 2] = sc.home[a + 2] + LOITER * z;
  }
  // Alone: fish i makes for a place near where its fright left it (a new one once it is there), and outside the
  // egg it is turned back. Says whether it is outside and still heading out.
  function wander(out, sc, i, random) {
    const a = i * 3, x = sc.p[a], y = sc.p[a + 1], z = sc.p[a + 2];
    let rx = sc.roam[a] - x, ry = sc.roam[a + 1] - y, rz = sc.roam[a + 2] - z, rl = Math.hypot(rx, ry, rz);
    if (rl < ARRIVE) { loiterTo(sc, i, random); rx = sc.roam[a] - x; ry = sc.roam[a + 1] - y; rz = sc.roam[a + 2] - z; rl = Math.hypot(rx, ry, rz) || 1; }
    out[0] = rx / rl; out[1] = ry / rl; out[2] = rz / rl;
    const ex = x / EGG[0], ey = y / EGG[1], ez = z / EGG[2], e = ex * ex + ey * ey + ez * ez;
    if (e <= 1) return false;
    let nx = ex / EGG[0], ny = ey / EGG[1], nz = ez / EGG[2];
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const push = WALL * (Math.sqrt(e) - WALL_FROM);
    out[0] -= push * nx; out[1] -= push * ny; out[2] -= push * nz;
    return sc.d[a] * nx + sc.d[a + 1] * ny + sc.d[a + 2] * nz > 0;
  }

  // How fast a fish wants to swim. `gain` is how much the school has of it (1 together, 0
  // alone); `hurry` is how far a fish streaming back still is from its place, a unit at most
  // (0 when it is not streaming back): the further, the faster.
  function wantOf(size, gain, hurry, flame, loud, dart) {
    const together = 0.42 + 1.0 * flame + 0.75 * loud + 1.3 * dart, alone = 0.40 + 0.5 * flame + 0.5 * loud;
    return BASE * (gain * together + (1 - gain) * alone) * (1.12 - 0.18 * size) * (1 + HURRY * hurry);
  }

  // One step of the first n fish. `how`: gain (1 together, 0 alone), apart (the school has
  // burst), back (it is streaming back), flame, dart, bands, random (for the wandering).
  const F = [0, 0, 0], S = [0, 0, 0], W = [0, 0, 0];
  function stepSchool(sc, n, how) {
    const g = how.gain, whole = !how.apart, flame = how.flame, tight = 1 - TIGHT * flame;
    for (let i = 0; i < n; i++) {
      const a = i * 3, loud = how.bands[sc.band[i]];
      flock(F, sc, n, i, whole, flame, g);
      let dx = F[0], dy = F[1], dz = F[2], away = 0;
      if (g > 0) { away = steer(S, sc, i, sc.form, tight, loud); dx += g * S[0]; dy += g * S[1]; dz += g * S[2]; }
      if (g < 1) {
        const leaving = wander(W, sc, i, how.random);
        dx += (1 - g) * W[0]; dy += (1 - g) * W[1]; dz += (1 - g) * W[2];
        if (leaving && g === 0) sc.sp[i] *= WALL_SLOW;
      }
      const dl = Math.hypot(dx, dy, dz);
      if (dl > 1e-9) {
        // A fish that is bolting does not turn until it has slowed.
        const turn = Math.min(1, (TURN + TURN_LOUD * flame + (whole ? 0 : TURN_APART) + (how.back ? TURN_BACK : 0)) * STEP / (whole ? 1 : 1 + BOLT_STIFF * Math.max(0, sc.sp[i] - BOLT_FAST)));
        const fx = sc.d[a] + (dx / dl - sc.d[a]) * turn, fy = sc.d[a + 1] + (dy / dl - sc.d[a + 1]) * turn, fz = sc.d[a + 2] + (dz / dl - sc.d[a + 2]) * turn;
        const fl = Math.hypot(fx, fy, fz);
        if (fl > 1e-9) { sc.d[a] = fx / fl; sc.d[a + 1] = fy / fl; sc.d[a + 2] = fz / fl; }
      }
      sc.sp[i] += (wantOf(sc.size[i], g, how.back ? Math.min(1, away) : 0, flame, loud, how.dart) - sc.sp[i]) * Math.min(1, (whole ? SPEED_RATE : DASH) * STEP);
      sc.p[a] += sc.d[a] * sc.sp[i] * STEP; sc.p[a + 1] += sc.d[a + 1] * sc.sp[i] * STEP; sc.p[a + 2] += sc.d[a + 2] * sc.sp[i] * STEP;
      sc.beat[i] += STEP * (BEAT + BEAT_FAST * sc.sp[i]) / Math.sqrt(sc.size[i]);
    }
  }

  // The steps that have come due after dt more seconds. A step is taken once half of it has
  // come due: frames never come exactly on time, and this way one that is a little early or
  // late is still one step at 60 frames a second, not none and then two. STEPS_MAX at most, the
  // rest forgotten. `left` is then how far the school is behind its steps (or, below 0, ahead
  // of them): what is drawn allows for it (see dress). Each step also remembers the syllable
  // (how.pulse) for the shimmer and, given how.bubbles, steps them. Says how many steps it took.
  function advance(sc, n, dt, how) {
    sc.left += dt;
    let steps = 0;
    while (sc.left >= STEP / 2 && steps < STEPS_MAX) {
      stepSchool(sc, n, how);
      sc.hist[sc.at] = how.pulse || 0; sc.at = (sc.at + 1) % HISTORY;
      if (how.bubbles) stepBubbles(how.bubbles, sc, n, how.pulse || 0);
      sc.left -= STEP;
      steps++;
    }
    if (sc.left >= STEP / 2) sc.left = 0;
    return steps;
  }

  // Density raised: fish `from` up to `to` join. Each is put beside a fish already there, of
  // its own band, heading and swimming as that one does and with its places to loiter, a
  // little way off (by JOIN). Where it was left when it last swam, if it ever did, is forgotten.
  function join(sc, from, to) {
    if (from <= 0) return;
    for (let i = from; i < to; i++) {
      const a = i * 3, j = i % from, b = j * 3, off = [JOIN * sc.off[i], JOIN * sc.off2[i], JOIN * sc.high[i]];
      for (let c = 0; c < 3; c++) { sc.p[a + c] = sc.p[b + c] + off[c]; sc.home[a + c] = sc.home[b + c] + off[c]; sc.roam[a + c] = sc.roam[b + c] + off[c]; sc.d[a + c] = sc.d[b + c]; }
      sc.sp[i] = sc.sp[j]; sc.flash[i] = 0;
    }
  }

  // The fright: each of the first n fish bolts. Fresh from the school, away from its middle
  // (give or take); already apart, each its own way. It goes a share of the way to the edge
  // of the egg: that is where it will loiter, and it is given the speed that takes it there.
  // A fish caught outside the egg bolts back into it instead.
  function bolt(sc, n, strength, random, fresh) {
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) { cx += sc.p[i * 3]; cy += sc.p[i * 3 + 1]; cz += sc.p[i * 3 + 2]; }
    if (n) { cx /= n; cy /= n; cz /= n; }
    for (let i = 0; i < n; i++) {
      const a = i * 3;
      let x = random() - 0.5, y = random() - 0.5, z = (random() - 0.5) * 0.6;
      if (fresh) { x = sc.p[a] - cx + 1.1 * x; y = sc.p[a + 1] - cy + 1.1 * y; z = 0.6 * (sc.p[a + 2] - cz) + 1.1 * z; }
      const l = Math.hypot(x, y, z) || 1, share = BOLT[0] + BOLT[1] * random();
      sc.d[a] = x / l; sc.d[a + 1] = y / l; sc.d[a + 2] = z / l;
      let far = share * strength * toEdge(sc, i);
      if (far > 0) for (let c = 0; c < 3; c++) sc.home[a + c] = sc.p[a + c] + sc.d[a + c] * far;
      else {
        const e = Math.hypot(sc.p[a] / EGG[0], sc.p[a + 1] / EGG[1], sc.p[a + 2] / EGG[2]) || 1, to = ROAM * share / e;
        for (let c = 0; c < 3; c++) sc.home[a + c] = sc.p[a + c] * to;
        const hx = sc.home[a] - sc.p[a], hy = sc.home[a + 1] - sc.p[a + 1], hz = sc.home[a + 2] - sc.p[a + 2];
        far = Math.hypot(hx, hy, hz);
        if (far > 0) { sc.d[a] = hx / far; sc.d[a + 1] = hy / far; sc.d[a + 2] = hz / far; }
      }
      sc.roam[a] = sc.home[a]; sc.roam[a + 1] = sc.home[a + 1]; sc.roam[a + 2] = sc.home[a + 2];
      sc.sp[i] = Math.max(sc.sp[i], DASH * far);
    }
  }
  function nextForm(form) {
    return (form + 1) % FORMS.length;
  }

  // ── The shimmer ─────────────────────────────────────────────────────────────

  // A syllable: how much louder it has just become, at most 1.
  function pulseOf(flame, trail) {
    return clamp01(PULSE * (flame - trail));
  }
  // How far round the school fish i is, 0 to 1, in the shape's own leaning space.
  function roundOf(sc, i, form) {
    const a = i * 3, z = -sc.p[a + 1] * Math.sin(LEAN[form]) + sc.p[a + 2] * Math.cos(LEAN[form]);
    return (Math.atan2(z, sc.p[a]) / (2 * Math.PI) + 1) % 1;
  }
  // What a fish that far round hears of the shimmer now: the syllable of that much of ROUND_S
  // ago, fainter the further round.
  function heard(sc, round) {
    const ago = Math.floor(round * ROUND_S / STEP);
    return sc.hist[(sc.at - 1 - ago + 2 * HISTORY) % HISTORY] * (1 - FADE * round);
  }
  // What each of the first n fish is sent, four numbers into A and four into B:
  //   A: its size, where its tail is in its beat, how far it has rolled onto its side, its band
  //   B: its flash, its glow, how wide its tail swings, how far on along its way it is drawn
  // `how`: whole (the school is not apart), dart, flash (the fright's), bands, dt, and lead:
  // the seconds the school is behind its steps (sc.left; below 0, ahead). A fish is drawn that
  // much further on, and its tail that much on in its beat, so that it moves evenly between steps.
  function dress(A, B, sc, n, how) {
    const keep = Math.exp(-how.dt / FLASH_KEEP_S), lead = how.lead || 0;
    for (let i = 0; i < n; i++) {
      const q = i * 4;
      const f = sc.flash[i] = settle(Math.max(how.whole ? heard(sc, roundOf(sc, i, sc.form)) : 0, DART_FLASH * how.dart, how.flash, sc.flash[i] * keep));
      A[q] = sc.size[i]; A[q + 1] = sc.beat[i] + lead * (BEAT + BEAT_FAST * sc.sp[i]) / Math.sqrt(sc.size[i]); A[q + 2] = sc.side[i] * ROLL * f; A[q + 3] = sc.band[i];
      B[q] = f; B[q + 1] = Math.min(1, 1.3 * how.bands[sc.band[i]]); B[q + 2] = 0.10 + 0.10 * Math.min(1, sc.sp[i] / 1.5); B[q + 3] = lead * sc.sp[i];
    }
  }

  // ── The bubbles ─────────────────────────────────────────────────────────────

  function createBubbles(seed = SEED + 1) {
    const random = rng(seed), b = { p: new Float32Array(BUBBLES * 3), lit: new Float32Array(BUBBLES), life: new Float32Array(BUBBLES), size: new Float32Array(BUBBLES), next: 0, owed: 0, random };
    for (let j = 0; j < BUBBLES; j++) { b.size[j] = 0.03 + 0.05 * random() * random(); b.p[j * 3 + 1] = 99; }
    return b;
  }
  // One step: bubbles leave the school (from where a fish is) as fast as the syllable is loud,
  // and every bubble rises, wavers and in the end is put away.
  function stepBubbles(b, sc, n, pulse) {
    b.owed += pulse * STEP * BUBBLE_RATE;
    while (b.owed >= 1) {
      b.owed -= 1;
      if (!n) continue;
      const i = Math.floor(b.random() * n) * 3, j = b.next++ % BUBBLES;
      b.p[j * 3] = sc.p[i]; b.p[j * 3 + 1] = sc.p[i + 1]; b.p[j * 3 + 2] = sc.p[i + 2]; b.life[j] = 1;
    }
    for (let j = 0; j < BUBBLES; j++) {
      if (b.life[j] <= 0) continue;
      b.life[j] -= STEP / BUBBLE_S;
      if (b.life[j] <= 0) { b.life[j] = 0; b.lit[j] = 0; b.p[j * 3 + 1] = 99; continue; }
      b.p[j * 3] += 0.14 * Math.sin(9 * b.life[j] + j) * STEP; b.p[j * 3 + 1] += (0.35 + 6 * b.size[j]) * STEP;
      b.lit[j] = Math.min(1, b.life[j] * 3) * Math.min(1, (1 - b.life[j]) * 10);
    }
  }

  // ── The room it needs ───────────────────────────────────────────────────────

  // The share of the frame the first n fish need: the furthest any reaches, tail and all, as
  // a camera that sways `sway` radians each way sees it. 1 is the whole frame.
  function needOf(sc, n, sway) {
    const D = (FRAME.height / 2) / Math.tan((FOV * Math.PI) / 360), ss = Math.sin(sway), sp = Math.sin((PITCH * Math.PI) / 180);
    let need = 0;
    for (let i = 0; i < n; i++) {
      const a = i * 3, z = sc.p[a + 2], az = Math.abs(z), reach = TAIL * LEN * sc.size[i], persp = D / Math.max(0.5, D - z);
      const ex = (Math.abs(sc.p[a]) + az * ss + reach) * persp / (FRAME.width / 2), ey = (Math.abs(sc.p[a + 1]) + az * sp + reach) * persp / (FRAME.height / 2);
      if (ex > need) need = ex;
      if (ey > need) need = ey;
    }
    return need;
  }
  // How much smaller it must be drawn to stay in the picture, when the Size slider enlarges it by `enlarged`.
  function roomFor(need, enlarged) {
    const wants = need * enlarged;
    return wants <= FILL ? 1 : FILL / wants;
  }
  // Drawn smaller at once; back to its size slowly.
  function zoomAfter(zoom, room, dt) {
    if (room <= zoom) return room;
    const z = zoom + (room - zoom) * (1 - Math.exp(-ZOOM_BACK * dt));
    return room - z < 1e-3 && dt > 0 ? room : z;
  }
  const driftOf = (drift) => (typeof drift === 'number' && Number.isFinite(drift) ? Math.max(0, Math.min(100, drift)) : 50) / 50;
  // How far the camera sways each way, in radians, for a Camera drift of 0 to 100.
  function swayFor(drift) {
    return SWAY * driftOf(drift);
  }
  function orbitAt(t, drift) {
    return swayFor(drift) * Math.sin(ORBIT_RATE * t);
  }
  // How many pixels a unit at the middle of the frame is, in a picture `height` pixels high.
  function pxOf(height, zoom) {
    return (height * zoom) / (2 * Math.tan((FOV * Math.PI) / 360));
  }

  // ── The shaders ─────────────────────────────────────────────────────────────

  const VERT = `
    attribute float fin;
    attribute vec3 iPos, iFwd;
    attribute vec4 iA, iB;            // size, tail's place in its beat, roll, band;  flash, glow, how wide the tail swings, how far on along its way
    uniform float uLen;
    varying vec3 vN, vW, vL; varying float vBand, vFlash, vGlow, vFin, vUp;
    void main() {
      vec3 p = position, n = normal;
      // It swims: a wave runs down the body and is widest at the tail.
      float along = clamp((0.55 - p.x) / 1.55, 0.0, 1.5), s = pow(along, 1.6), ph = iA.y + 3.0 * p.x;
      float slope = iB.z * (s * 3.0 * cos(ph) - (1.6 / 1.55) * pow(along, 0.6) * sin(ph));
      p.z += iB.z * s * sin(ph);
      n = normalize(vec3(n.x - slope * n.z, n.y, n.z));
      vec3 f = normalize(iFwd), r = normalize(cross(f, vec3(0.0, 1.0, 0.0)) + vec3(0.0, 0.0, 1e-5)), u = normalize(cross(r, f));
      float cr = cos(iA.z), sr = sin(iA.z);
      vec3 u2 = u * cr + r * sr, r2 = r * cr - u * sr;
      vec4 w = modelMatrix * vec4(iPos + f * iB.w + iA.x * uLen * (f * p.x + u2 * p.y + r2 * p.z), 1.0);
      vL = position; vUp = normal.y; vBand = iA.w; vFlash = iB.x; vGlow = iB.y; vFin = fin;
      vW = w.xyz; vN = normalize(mat3(modelMatrix) * (f * n.x + u2 * n.y + r2 * n.z));
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const FRAG = `
    precision highp float;
    uniform vec3 uPal[6];
    uniform float uShift, uT;
    varying vec3 vN, vW, vL; varying float vBand, vFlash, vGlow, vFin, vUp;
    vec3 pal(float u) {
      u = fract(u) * 6.0; int i = int(floor(u)); float f = u - floor(u); f = f * f * (3.0 - 2.0 * f);
      return mix(uPal[i], uPal[(i + 1) % 6], f);
    }
    void main() {
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      vec3 v = normalize(cameraPosition - vW);
      vec3 base = pal(uShift + vBand / 8.0);
      vec3 l1 = normalize(vec3(0.25, 0.90, 0.45)), l2 = normalize(vec3(-0.60, -0.35, 0.50));
      // Light from above, rippling as it does under water.
      float ripple = 0.80 + 0.45 * sin(vW.x * 5.0 + uT * 1.7 + 1.5 * sin(vW.z * 4.0 + uT)) * sin(vW.z * 6.0 - uT * 1.3 + vW.y * 3.0);
      float d1 = max(dot(n, l1), 0.0) * ripple, d2 = max(dot(n, l2), 0.0);
      float spec = pow(max(dot(n, normalize(l1 + v)), 0.0), 60.0);
      vec3 col;
      if (vFin > 0.5) {
        col = base * (0.30 + 0.55 * d1 + 0.20 * d2 + 0.6 * vGlow + 0.5 * vFlash);
      } else {
        // A dark back, a pale belly and a silver flank that mirrors what is round it.
        float back = smoothstep(-0.15, 0.75, vUp), flank = 1.0 - abs(vUp); flank *= flank;
        vec3 body = mix(mix(base, vec3(1.0), 0.30), base * 0.50, back);
        vec3 r = reflect(-v, n);
        vec3 sky = pal(uShift + 0.5 + 0.22 * r.y + 0.12 * r.x) * (0.55 + 0.45 * (0.5 + 0.5 * r.y));
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        col = body * (0.32 + 0.80 * d1 + 0.25 * d2);
        col = mix(col, sky, (0.24 + 0.30 * vFlash) * flank);
        col += vec3(1.0, 0.98, 0.94) * spec * (0.5 + 1.8 * vFlash) + base * (0.55 * vGlow + 0.30 * fres) + vec3(0.28) * vFlash * flank;
        // Its eye.
        float eye = (1.0 - smoothstep(0.06, 0.085, length(vL.xy - vec2(0.66, 0.07)))) * smoothstep(0.02, 0.05, abs(vL.z));
        col = mix(col, vec3(0.015), eye);
        col += vec3(0.9) * eye * (1.0 - smoothstep(0.01, 0.03, length(vL.xy - vec2(0.68, 0.09))));
      }
      gl_FragColor = vec4(col, 1.0);
    }`;
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
      // A bubble: a bright rim, a clear middle and a glint.
      float rim = smoothstep(0.55, 0.9, r) * (1.0 - smoothstep(0.9, 1.0, r)), glint = 1.0 - smoothstep(0.0, 0.32, length(p - vec2(-0.35, -0.35)));
      gl_FragColor = vec4((uColor * 0.8 + vec3(0.35)) * (rim * 0.9 + glint * 0.9 + 0.08) * 0.6 * vLit, 1.0);
    }`;

  // ── The scene ───────────────────────────────────────────────────────────────

  function definition() {
    const ID = 'school-of-fish';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name, otherwise = 50) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : otherwise;
    };
    const bands = new Float32Array(BANDS), school = createSchool(SEED), bubbles = createBubbles(SEED + 1);
    const clock = TimbreScene.createClock();   // the seconds the scene has been live, kept as a JavaScript number
    const A = new Float32Array(FISH_MAX * 4), B = new Float32Array(FISH_MAX * 4);
    // The shatter machine counts its own pieces; these stand in for the fish, which swim in 3D here.
    const stubs = Array.from({ length: 4 }, () => ({ cx: 500, cy: 500 }));
    const how = { gain: 1, apart: false, back: false, flame: 0, dart: 0, bands, pulse: 0, random: null, bubbles };
    const look = { whole: true, dart: 0, flash: 0, bands, dt: 0, lead: 0 };
    let THREE = null, HX = null, machine = null, group = null, fish = null, geo = null, sent = [], shared = null, bubbleGeo = null, bubbleMat = null, points = null, camera = null;
    let trail = 0, sinceReturn = 0, dart = 0, wholeAs = 0, shown = 0;
    // What the checks read. clock: seconds the scene has been live. fish: how many are drawn.
    // steps: school steps taken this frame. phase: whole, pieces or returning. form: the shape
    // it is, or is streaming back to. gain: how much of the school there is (1 together, 0
    // apart). need: the share of the frame it needs; room: how much smaller it must be drawn;
    // zoom: how much smaller it is.
    const s = { flame: 0, kick: 0, clock: clock.seconds, live: false, orbit: 0, colorT: 0, fish: 0, steps: 0, stepped: 0, beats: 0, dart: 0, pulse: 0,
      phase: 'whole', form: FORMS[0], gain: 1, thumps: 0, jostles: 0, flash: 0, need: 0, enlarged: 1, room: 1, zoom: 1, drawnFor: 1, px: 0 };

    function build(k) {
      THREE = k.THREE;
      camera = k.camera;
      HX = TimbreHelix;
      machine = HX.createShatter({ random: HX.rng(7) });
      how.random = rng(7);
      group = new THREE.Group();
      // The fish: one shape, drawn once for each fish, placed and bent by the numbers sent with it.
      const shape = fishShape();
      geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(shape.points, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(shape.normals, 3));
      geo.setAttribute('fin', new THREE.BufferAttribute(shape.fin, 1));
      geo.setIndex(new THREE.BufferAttribute(shape.index, 1));
      const each = (name, array, n) => { const at = new THREE.InstancedBufferAttribute(array, n).setUsage(THREE.DynamicDrawUsage); geo.setAttribute(name, at); sent.push(at); };
      each('iPos', school.p, 3); each('iFwd', school.d, 3); each('iA', A, 4); each('iB', B, 4);
      shown = countFor(knob('density'));
      shared = { uPal: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Color()) }, uShift: { value: 0 }, uT: { value: 0 }, uLen: { value: LEN } };
      fish = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, uniforms: shared }));
      fish.frustumCulled = false;
      group.add(fish);
      // The bubbles: these are light.
      bubbleGeo = new THREE.BufferGeometry();
      bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubbles.p, 3).setUsage(THREE.DynamicDrawUsage));
      bubbleGeo.setAttribute('lit', new THREE.BufferAttribute(bubbles.lit, 1).setUsage(THREE.DynamicDrawUsage));
      bubbleGeo.setAttribute('size', new THREE.BufferAttribute(bubbles.size, 1));
      bubbleMat = k.addLight(new THREE.ShaderMaterial({ vertexShader: BUBBLE_VERT, fragmentShader: BUBBLE_FRAG, depthWrite: false, uniforms: { uPx: { value: 1000 }, uColor: { value: new THREE.Color() } } }));
      points = new THREE.Points(bubbleGeo, bubbleMat);
      points.frustumCulled = false; points.renderOrder = 1;
      group.add(points);
      k.scene.add(group);
      look.dt = 0;
      dress(A, B, school, FISH_MAX, look);
    }

    // The palette colour at t, as the shaders want it (linear), into c.
    function palette(c, t) {
      const p = getColor(t);
      return c.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = orbitAt(t, knob('cameraDrift'));

      // With the mic and Idle animation both off, the fish stop where they are.
      s.live = !!(micActive || cfgIdleAnim);
      if (s.live) s.clock = clock.step(dt);
      const flame = s.flame = settle(audio.flame);
      s.kick = settle(audio.kick);
      const n = s.fish = countFor(knob('density'));
      if (n > shown) join(school, shown, n);   // Density raised: the new fish go in among the others
      shown = geo.instanceCount = n;

      // Each band is followed: quick up, slower down.
      for (let b = 0; b < BANDS; b++) {
        let v = 0;
        if (micActive) v = loudness(frequencies, b, cfgGain);
        else if (cfgIdleAnim) v = idle(b, s.clock);
        bands[b] = follow(bands[b], v, v > bands[b] ? RISE : FALL, dt);
        if (v === 0) bands[b] = settle(bands[b]);
      }

      // A syllable, and a beat.
      trail = follow(trail, flame, TRAIL, dt);
      s.pulse = pulseOf(flame, trail);
      dart = settle(dart * Math.exp(-dt / DART_S));
      if (audio.beat) { dart = 1; s.beats++; }
      s.dart = dart;

      // The fright. The machine says when: a hard peak with the mic on scatters the school, a
      // peak while it is apart makes the fish bolt again, and after a calm wait they come back.
      // The peak is the raw input level, before Gain, as DNA hears it. With nothing live no time
      // passes for it: fish that have stopped where they are do not come back in the meantime.
      s.flash = settle(s.flash * Math.exp(-dt / FLASH_S));
      const was = machine.state, passed = s.live ? dt : 0;
      const event = machine.step({
        now, dt: passed, live: !!micActive,
        peak: typeof micPeak === 'number' ? micPeak : HX.peakOf(typeof waveform === 'undefined' ? null : waveform),
        threshold: HX.threshold(knob('frightSensitivity')), reconnectS: knob('regroupSeconds', 3),
        W: 1000, H: 1000, scale: 1, cut: () => stubs,
      });
      if (event === 'shatter') {
        how.random = rng(1000 + ++s.thumps);   // each thump its own, and the same again another day
        bolt(school, n, 1, how.random, true);
        s.flash = 1;
      } else if (event === 'jostle') {
        s.jostles++;
        bolt(school, n, was === 'returning' ? REBOLT : JOSTLE, how.random, false);
        s.flash = Math.max(s.flash, was === 'returning' ? 0.6 : 0.3);
      } else if (event === 'return') {
        school.form = nextForm(wholeAs);   // the shape after the one it last was, however often it was frightened on the way
        sinceReturn = 0;
      } else if (event === 'whole') {
        wholeAs = school.form;
        s.flash = Math.max(s.flash, 0.45);
      } else if (event === 'reset') {
        wholeAs = school.form;   // the page had stopped drawing: it resumes as a school, in the shape it was or was coming back to
        s.flash = 0;
      } else if (machine.state === 'returning') sinceReturn += passed;   // in step with the machine's own progress through the return
      s.phase = machine.state;
      s.form = FORMS[school.form];
      s.gain = s.phase === 'whole' ? 1 : s.phase === 'pieces' ? 0 : ease(Math.min(1, sinceReturn / HX.RETURN_S));

      // The school swims.
      how.gain = s.gain; how.apart = s.phase === 'pieces'; how.back = s.phase === 'returning';
      how.flame = flame; how.dart = dart; how.pulse = s.pulse;
      s.steps = s.live ? advance(school, n, dt, how) : 0;
      s.stepped += s.steps;
      look.whole = s.phase !== 'pieces'; look.dart = dart; look.flash = s.flash; look.dt = dt; look.lead = school.left;
      dress(A, B, school, n, look);
      for (const at of sent) at.needsUpdate = true;
      bubbleGeo.attributes.position.needsUpdate = true; bubbleGeo.attributes.lit.needsUpdate = true;

      // Spread wide, or enlarged, it is drawn smaller by as much as keeps all of it in the picture: at once, and back slowly.
      s.need = needOf(school, n, swayFor(knob('cameraDrift')));
      s.enlarged = k.camera.zoom;   // what the Size slider makes of it
      s.room = roomFor(s.need, s.enlarged);
      s.zoom = zoomAfter(s.zoom, s.room, dt);
      group.scale.setScalar(s.zoom);

      // The colours: six from round the palette for the bands to run through, drifting slowly.
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      for (let i = 0; i < 6; i++) palette(shared.uPal.value[i], colorT + i * (PALETTE.length / 6));
      shared.uShift.value = (0.01 * s.clock) % 1;
      shared.uT.value = TimbreScene.phase(s.clock, RIPPLE_ROUND);
      palette(bubbleMat.uniforms.uColor.value, colorT + PALETTE.length / 2);
      s.drawnFor = TimbreScene.renderScale(canvas3d.height);   // how many pixels of the kit's picture make one of the page
      s.px = bubbleMat.uniforms.uPx.value = pxOf(s.drawnFor * canvas3d.height, s.enlarged) * s.zoom;
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: PITCH,
      cooling: [LINGER, LINGER, LINGER],
      build,
      update,
      debug() {
        if (!fish) return Object.assign({}, s);
        const out = { r: 0, g: 0, b: 0 };
        const srgb = (c) => { c.getRGB(out, THREE.SRGBColorSpace); return [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)]; };
        const m = fish.material;
        const d = Object.assign({
          bands: Array.from(bands), trail, sinceReturn, left: school.left, wholeAs, formAt: school.form,
          drawn: geo.instanceCount, shapePoints: geo.attributes.position.count, triangles: geo.index.count / 3,
          solid: m.transparent === false && m.depthTest === true && m.depthWrite === true && m.side === THREE.DoubleSide && m.blending === THREE.NormalBlending,
          bubbleLight: bubbleMat.blending === THREE.CustomBlending && bubbleMat.blendDst === THREE.OneFactor && bubbleMat.depthWrite === false && bubbleMat.depthTest === true, bubbleColor: srgb(bubbleMat.uniforms.uColor.value),
          bubbleOrder: points.renderOrder, bubblesLive: Array.from(bubbles.life).filter((v) => v > 0).length,
          pal: shared.uPal.value.map(srgb), shift: shared.uShift.value, given: [shared.uT.value, shared.uLen.value],
          scale: group.scale.x, uploads: sent.map((at) => at.version).concat(bubbleGeo.attributes.position.version),
          neverCulled: fish.frustumCulled === false && points.frustumCulled === false,
          // How the school stands and how the camera saw the last frame, so that a check can say where on the canvas a fish was drawn.
          world: group.matrixWorld.toArray(), view: camera.matrixWorldInverse.toArray(), proj: camera.projectionMatrix.toArray(),
        }, s);
        // The long lists, made only when asked for.
        Object.defineProperty(d, 'points', { get: () => Array.from(school.p.subarray(0, s.fish * 3)) });
        Object.defineProperty(d, 'headings', { get: () => Array.from(school.d.subarray(0, s.fish * 3)) });
        Object.defineProperty(d, 'speeds', { get: () => Array.from(school.sp.subarray(0, s.fish)) });
        Object.defineProperty(d, 'sizes', { get: () => Array.from(school.size.subarray(0, s.fish)) });
        Object.defineProperty(d, 'sentA', { get: () => Array.from(A.subarray(0, s.fish * 4)) });
        Object.defineProperty(d, 'sentB', { get: () => Array.from(B.subarray(0, s.fish * 4)) });
        Object.defineProperty(d, 'bubbles', { get: () => Array.from(bubbles.p) });
        Object.defineProperty(d, 'bubbleLit', { get: () => Array.from(bubbles.lit) });
        Object.defineProperty(d, 'shimmer', { get: () => ({ hist: Array.from(school.hist), at: school.at }) });
        return d;
      },
    };
  }

  globalThis.TimbreSchool = {
    BANDS, PER_MIN, PER_MAX, FISH_MAX, SEED, STEP, STEPS_MAX, NEAR, CLEAR, BASE, START, LEN, TAIL, EGG, LEAN, FORMS, BALL, AXIS_TILT, RING, RING_WIDE, RING_HIGH, COLUMN, COLUMN_WIDE, COLUMN_HIGH,
    SWING, TIGHT, PULL, PULL_MAX, STAY, WITH, STAY_APART, WITH_APART, PART, TURN, TURN_LOUD, TURN_APART, TURN_BACK, HURRY, BOLT_FAST, BOLT_STIFF, SPEED_RATE, DASH, BEAT, BEAT_FAST, BOLT, REBOLT, JOSTLE, JOIN, ARRIVE, LOITER, ROAM, WALL, WALL_FROM, WALL_SLOW,
    RISE, FALL, TRAIL, PULSE, ROUND_S, FADE, HISTORY, ROLL, DART_S, FLASH_S, FLASH_KEEP_S, DART_FLASH, BUBBLES, BUBBLE_S, BUBBLE_RATE, FILL, ZOOM_BACK, SWAY, ORBIT_RATE, LINGER, FOV, PITCH, FRAME,
    RIPPLE_ROUND, VERT, FRAG, BUBBLE_VERT, BUBBLE_FRAG,
    countFor, loudness, idle, settle, rng, fishShape, createSchool, steer, flock, toEdge, loiterTo, wander, wantOf, stepSchool, advance, join, bolt, nextForm,
    pulseOf, roundOf, heard, dress, createBubbles, stepBubbles, needOf, roomFor, zoomAfter, swayFor, orbitAt, pxOf, definition,
  };
})();
