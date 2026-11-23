// Timbre — ink: coloured ink poured into a glass tank of water. First the arithmetic: what a
// band hears, where it pours and how much, how the pitch of the voice chooses the pour that
// leads (a spike), the water's currents, a beat's twist, and the
// specks of ink themselves (how one is poured, how they move, how one is drawn). Then the
// shaders that draw the glass, the water's surface and a speck, and the 3D scene, written
// against the scene kit: definition() returns what TimbreScene.factory() needs.
//
// All timing comes from the caller (dt in seconds), never from counting frames, and the ink
// moves in steps no longer than a sixtieth of a second, so the same sound gives the same
// tank at 30 and at 60 frames a second. Where a speck is poured within its stream, its size
// and its shade come from a seeded sequence of the tank's own, so a run is repeatable.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreInk`), like chladni.js, so verify.mjs can import it under Node.
// Nothing here may touch document, window, THREE, TimbreScene or core.js globals at load
// time; the scene looks them up when it is built.

(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const BANDS = 8;                          // bands that pour: the eight lowest bins
  const W = 3.3, H = 2.7, D = 1.5;          // the tank: across, up, front to back
  const TOP = H / 2 - 0.22;                 // the water's surface
  const FLOOR = -H / 2 + 0.05;              // the lowest ink lies
  const WALL_X = W / 2 - 0.06, WALL_Z = D / 2 - 0.06;   // the furthest ink goes to either side, and front and back
  const LIFE = 8.5;                         // seconds a speck of ink lasts
  const POUR = 1300;                        // specks a second from a band at full level, with the most specks
  const SPECKS_MIN = 6000, SPECKS_MAX = 30000;   // specks at Density 0 and 100
  const QUIET = 0.08;                       // a band below this pours nothing
  const RISE = 14, FALL = 4;                // how fast a band is followed, up and down, a second
  const STREAM = 0.05;                      // how wide a band's stream is, across, at a level of 0.44 (it is 0.6 to 1.5 times this)
  const TWIST = 1.6, TWIST_FALL = 1.6;      // a beat's twist, in radians a second at the glass's worth, and how fast it dies away
  const SINK_FALL = 0.75;                   // how fast a speck's own speed dies away, a second
  const GLASS_PUSH = 0.25;                  // how fast the glass turns ink back, at the glass itself, in still water, in units a second
  const GLASS_GAIN = 3;                     // and how much faster for a current of strength 1: one and this many times as fast
  const BUDGET = 0.97;                      // the share of the specks' whole lives that pouring may fill
  const LEAD_WIDTH = 0.8;                   // how far to either side of the pitch's place its lead reaches, in pours (the width of the bump)
  const LEAD_FLOOR = 0.15;                  // the share of its ink a pour far from the pitch keeps: no pour is shut off
  const SETTLE = 0.03;                      // how fast ink settles of itself, in units a second
  const TAB = 512;                          // cells along each side of the tank in the current's tables
  const STEPS_MAX = 6;                      // the most steps the ink takes in one frame
  const FOV = 30, PITCH = 14;               // the camera: how wide it sees and how far it looks down, in degrees
  // What the camera frames: taller than the tank needs and centred below it, so that the tank
  // stands clear of the bands along the picture's edges where the kit dims what is not solid.
  const FRAME = { width: 5, height: 4.2, center: [0, -0.25, 0] };
  const SEED = 20261121;
  const TURN = 2 * Math.PI;

  // How many specks of ink there are at once, from Density (0..100).
  function speckCount(density) {
    const d = typeof density === 'number' && Number.isFinite(density) ? Math.max(0, Math.min(100, density)) : 50;
    return Math.round(SPECKS_MIN + ((SPECKS_MAX - SPECKS_MIN) * d) / 100);
  }

  // That count as a share of the most there can be.
  function shareOf(count) {
    return count / SPECKS_MAX;
  }

  // How loud a band is, 0..1: its bin, times Gain.
  function loudness(bins, band, gain) {
    if (!bins || !(band < bins.length)) return 0;
    return clamp01((bins[band] / 255) * gain);
  }

  // With the mic off and Idle animation on: how loud band b pretends to be at t seconds. The
  // bands take turns, each pouring a little for a while and then nothing.
  function idle(b, t) {
    return Math.sin(0.23 * t + b) > 0.2 ? Math.max(0, 0.05 + 0.5 * Math.sin(0.45 * t + 2.3 * b)) : 0;
  }

  // A level that has all but died away is none.
  function settle(v) {
    return v < 1e-4 ? 0 : v;
  }

  // Where band b pours in after `clock` seconds, into out: across the tank and front to back.
  // Low bands at one end, high at the other, each wandering a little.
  function placeOf(out, b, clock) {
    out[0] = -1.24 + (b + 0.5) * 0.31 + 0.07 * Math.sin(0.31 * clock + 1.7 * b);
    out[1] = 0.12 * Math.sin(2.1 * b) + 0.05 * Math.cos(0.27 * clock + b);
    return out;
  }

  // Specks a second from a band at `level`, when the specks there are make `share` of the most.
  function pourRate(level, share) {
    return level < QUIET ? 0 : POUR * share * level * Math.sqrt(level);
  }

  // The share of what the bands would pour that they may: all of it while `total` specks a
  // second is no more than the `count` specks in use can hold for their whole lives, and
  // less in proportion beyond that. Without this, loud music pours over ink that is still in
  // the water: it vanished at about four seconds old, when it showed most.
  function pourShare(total, count) {
    const most = (BUDGET * count) / LIFE;
    return total > most ? most / total : 1;
  }

  // The share of its ink pour b keeps when the pitch of the voice leads at `at` (in pours, 0
  // the lowest): all of it where the pitch is, less to either side (a bump LEAD_WIDTH pours
  // wide), and never less than LEAD_FLOOR.
  function leadWeight(b, at) {
    const d = (b - at) / LEAD_WIDTH;
    return LEAD_FLOOR + (1 - LEAD_FLOOR) * Math.exp(-0.5 * d * d);
  }

  // The pours' rates (specks a second, one for each band) with the pitch leading, in place.
  // Each is weighed by leadWeight(), as far as the pitch counts (`clear`, 0..1), and all
  // are then scaled so that together they pour what they did: the ink is shared out anew,
  // not added to. With clear at 0 nothing is touched.
  function leadRates(rate, at, clear) {
    if (!(clear > 0)) return rate;
    let was = 0, now = 0;
    for (let b = 0; b < BANDS; b++) { was += rate[b]; rate[b] *= 1 + clear * (leadWeight(b, at) - 1); now += rate[b]; }
    if (now > 0) { const k = was / now; for (let b = 0; b < BANDS; b++) rate[b] *= k; }
    return rate;
  }

  // How strong the currents are: slow in silence, stronger with the voice, and all of it
  // scaled by the Swirl setting (0..100; 50 is as designed, 0 is still water).
  function strengthOf(flame, swirl) {
    return ((0.1 + 0.55 * flame) * swirl) / 50;
  }

  // How bright the glass is drawn, and the water's surface: with the voice and on a beat,
  // and all of it scaled by the Glass setting (0..100; 50 is as designed, 0 is not at all).
  function glassOf(glass, flame, kick) {
    return (glass / 50) * (0.5 + 0.25 * flame + 0.35 * kick);
  }
  function surfaceOf(glass, flame, kick) {
    return (glass / 50) * (0.5 + 0.3 * flame + 0.5 * kick);
  }

  // The water's current at x, y, z after t seconds, of strength A, into out. No part of it
  // changes along its own direction, so the water neither gathers the ink nor thins it.
  function current(out, x, y, z, t, A) {
    const tt = 0.35 * t;
    out[0] = A * (Math.sin(1.9 * y + tt) * Math.cos(2.3 * z - 0.7 * tt) + 0.5 * Math.sin(3.7 * z + 1.3 * tt + 1));
    out[1] = A * 0.55 * (Math.sin(1.6 * z + 0.8 * tt) * Math.cos(2.1 * x + 0.5 * tt) + 0.5 * Math.sin(3.3 * x - 1.1 * tt));
    out[2] = A * 0.8 * (Math.sin(2.0 * x - 0.6 * tt) * Math.cos(1.7 * y + 0.9 * tt) + 0.5 * Math.sin(3.9 * y + 0.7 * tt + 2));
    return out;
  }

  // The same current, for the ink. Each of its nine waves runs along one direction only, so
  // once a step each is worked out at TAB + 1 places along its side of the tank (tabulate),
  // and every speck reads the nine nearest it and takes what lies between (flow). That is
  // the current to a ten-thousandth, for a thirtieth of the sines.
  // tab: nine tables of TAB + 1, in this order: along y, z, z (across), z, x, x (up), x, y, y (front to back).
  function tabulate(tab, t) {
    const tt = 0.35 * t, n = TAB + 1, dx = (2 * WALL_X) / TAB, dy = (TOP - FLOOR) / TAB, dz = (2 * WALL_Z) / TAB;
    for (let i = 0; i < n; i++) {
      const x = -WALL_X + i * dx, y = FLOOR + i * dy, z = -WALL_Z + i * dz;
      tab[i] = Math.sin(1.9 * y + tt); tab[n + i] = Math.cos(2.3 * z - 0.7 * tt); tab[2 * n + i] = Math.sin(3.7 * z + 1.3 * tt + 1);
      tab[3 * n + i] = Math.sin(1.6 * z + 0.8 * tt); tab[4 * n + i] = Math.cos(2.1 * x + 0.5 * tt); tab[5 * n + i] = Math.sin(3.3 * x - 1.1 * tt);
      tab[6 * n + i] = Math.sin(2.0 * x - 0.6 * tt); tab[7 * n + i] = Math.cos(1.7 * y + 0.9 * tt); tab[8 * n + i] = Math.sin(3.9 * y + 0.7 * tt + 2);
    }
    return tab;
  }
  function flow(out, tab, x, y, z, A) {
    const n = TAB + 1;
    let fx = ((x + WALL_X) * TAB) / (2 * WALL_X), fy = ((y - FLOOR) * TAB) / (TOP - FLOOR), fz = ((z + WALL_Z) * TAB) / (2 * WALL_Z);
    fx = fx < 0 ? 0 : fx > TAB ? TAB : fx; fy = fy < 0 ? 0 : fy > TAB ? TAB : fy; fz = fz < 0 ? 0 : fz > TAB ? TAB : fz;
    const ix = fx >= TAB ? TAB - 1 : fx | 0, iy = fy >= TAB ? TAB - 1 : fy | 0, iz = fz >= TAB ? TAB - 1 : fz | 0, tx = fx - ix, ty = fy - iy, tz = fz - iz;
    const at = (o, i, f) => tab[o + i] + (tab[o + i + 1] - tab[o + i]) * f;
    out[0] = A * (at(0, iy, ty) * at(n, iz, tz) + 0.5 * at(2 * n, iz, tz));
    out[1] = A * 0.55 * (at(3 * n, iz, tz) * at(4 * n, ix, tx) + 0.5 * at(5 * n, ix, tx));
    out[2] = A * 0.8 * (at(6 * n, ix, tx) * at(7 * n, iy, ty) + 0.5 * at(8 * n, iy, ty));
    return out;
  }

  // How much of the current is left at x, y, z, into out (across, up, front to back): all of
  // it in open water, a twentieth at the glass, the floor and the surface. Without this the
  // current would press the ink into the corners.
  function nearGlass(out, x, y, z) {
    out[0] = Math.max(0.05, Math.min(1, (WALL_X - Math.abs(x)) / 0.35));
    out[1] = Math.max(0.05, Math.min(1, (y - FLOOR) / 0.3, (TOP - y) / 0.25));
    out[2] = Math.max(0.05, Math.min(1, (WALL_Z - Math.abs(z)) / 0.3));
    return out;
  }

  // How fast the glass, the floor and the surface turn ink at x, y, z back toward open water,
  // into out (across, up, front to back): not at all in open water, more the nearer it is,
  // GLASS_PUSH at the glass itself. The current only dies away there, so without this
  // whatever reached the glass or the floor would stay on it, and gather where the currents
  // along it meet.
  function fromGlass(out, x, y, z) {
    const px = 1 - clamp01((WALL_X - Math.abs(x)) / 0.35), pz = 1 - clamp01((WALL_Z - Math.abs(z)) / 0.3);
    const up = 1 - clamp01((y - FLOOR) / 0.3), down = 1 - clamp01((TOP - y) / 0.25);
    out[0] = -Math.sign(x) * GLASS_PUSH * px * px;
    out[1] = GLASS_PUSH * (up * up - down * down);
    out[2] = -Math.sign(z) * GLASS_PUSH * pz * pz;
    return out;
  }

  // The twist after the nth beat: one way, and the next beat the other.
  function twistOf(whirl, n) {
    return whirl + (n % 2 ? TWIST : -TWIST);
  }

  // The twist dt seconds on: it dies away, and all but none is none.
  function whirlAfter(whirl, dt) {
    const w = whirl * Math.exp(-TWIST_FALL * dt);
    return Math.abs(w) < 1e-4 ? 0 : w;
  }

  // How many steps the ink takes in a frame of dt seconds: none longer than a sixtieth of a
  // second (but no more than STEPS_MAX of them, for a frame that took a tenth of a second).
  function stepsFor(dt) {
    return Math.max(1, Math.min(STEPS_MAX, Math.ceil(dt * 60 - 1e-6)));
  }

  // Room for n specks. Each has its place (pos: x, y, z), the speed of its own that it was
  // poured with (vel), the colour it was poured in (tint), its age in seconds (older than
  // LIFE: there is no speck), its size and the band that poured it. next: the speck the next
  // pour takes. poured: how many have been poured in all. rs: where the sequence of random
  // numbers has got to.
  function createInk(n, seed) {
    return { pos: new Float32Array(n * 3), vel: new Float32Array(n * 3), tint: new Float32Array(n * 3), age: new Float32Array(n).fill(LIFE + 1),
      size: new Float32Array(n), band: new Uint8Array(n), next: 0, poured: 0, rs: (seed >>> 0) || 1 };
  }

  // The next number of the tank's own sequence, 0 up to 1.
  function rnd(ink) {
    let s = ink.rs;
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    ink.rs = s;
    return s / 4294967296;
  }

  // Pour one speck from band b at `level`, after `clock` seconds, in `colour` (red, green,
  // blue). It takes the place of the oldest of the `count` specks in use. The middle of a
  // stream sinks fastest; its edge lags and moves outward, which is what rolls the head of a
  // plume up.
  const PLACE = [0, 0];
  function pour(ink, count, b, level, clock, colour) {
    const i = ink.next, j = i * 3;
    ink.next = (i + 1) % count;
    placeOf(PLACE, b, clock);
    const a = TURN * rnd(ink), r = STREAM * Math.sqrt(rnd(ink)) * (0.6 + 0.9 * level), edge = r / (STREAM * 1.5);
    ink.pos[j] = PLACE[0] + Math.cos(a) * r; ink.pos[j + 1] = TOP - 0.02 * rnd(ink); ink.pos[j + 2] = PLACE[1] + Math.sin(a) * r;
    ink.vel[j] = Math.cos(a) * 0.16 * edge; ink.vel[j + 1] = -(0.5 + 1.3 * level) * (1 - 0.6 * edge * edge); ink.vel[j + 2] = Math.sin(a) * 0.16 * edge;
    ink.age[i] = 0;
    ink.size[i] = 0.04 + 0.035 * rnd(ink);
    const deep = 0.78 + 0.22 * rnd(ink);   // a little unevenness in the ink
    ink.tint[j] = colour[0] * deep; ink.tint[j + 1] = colour[1] * deep; ink.tint[j + 2] = colour[2] * deep;
    ink.band[i] = b;
    ink.poured++;
    return i;
  }

  // One step of h seconds for the `count` specks in use, after `clock` seconds, in currents
  // of strength A and a twist of `whirl`. A speck's own speed dies away and the water
  // carries it; the glass, the floor and the surface turn it back, harder the stronger the
  // current (which presses it toward them), and hold it in. Returns how many specks are left.
  const CUR = [0, 0, 0], NEAR = [0, 0, 0], BACK = [0, 0, 0], TABLES = new Float32Array(9 * (TAB + 1));
  function stepInk(ink, count, h, clock, A, whirl) {
    const P = ink.pos, V = ink.vel, AGE = ink.age, keep = Math.exp(-SINK_FALL * h), back = 1 + GLASS_GAIN * A;
    tabulate(TABLES, clock);
    let left = 0;
    for (let i = 0; i < count; i++) {
      if (AGE[i] > LIFE) continue;
      AGE[i] += h;
      if (AGE[i] > LIFE) continue;
      left++;
      const j = i * 3, x = P[j], y = P[j + 1], z = P[j + 2];
      flow(CUR, TABLES, x, y, z, A);
      nearGlass(NEAR, x, y, z);
      fromGlass(BACK, x, y, z);
      V[j] *= keep; V[j + 1] *= keep; V[j + 2] *= keep;
      let nx = x + (V[j] + (CUR[0] - whirl * z * 0.9) * NEAR[0] + BACK[0] * back) * h;
      let ny = y + (V[j + 1] + (CUR[1] - SETTLE) * NEAR[1] + BACK[1] * back) * h;
      let nz = z + (V[j + 2] + (CUR[2] + whirl * x * 0.4) * NEAR[2] + BACK[2] * back) * h;
      if (ny < FLOOR) { ny = FLOOR; V[j + 1] = 0; }
      if (ny > TOP - 0.01) ny = TOP - 0.01;
      if (nx > WALL_X) nx = WALL_X; else if (nx < -WALL_X) nx = -WALL_X;
      if (nz > WALL_Z) nz = WALL_Z; else if (nz < -WALL_Z) nz = -WALL_Z;
      P[j] = nx; P[j + 1] = ny; P[j + 2] = nz;
    }
    return left;
  }

  // What the share of specks in use makes of every speck's look, into out: how many times
  // its size it is drawn, and how much it covers at its thickest. With a smaller share each
  // is larger and covers more, so the tank looks much the same. (Worked out once a frame.)
  function lookFor(out, share) {
    out[0] = 1.5 * Math.pow(share, -0.3);
    out[1] = Math.min(0.5, 0.15 / Math.sqrt(share));
    return out;
  }

  // How a speck `age` seconds old is drawn, into out: its size in units and how much of what
  // is behind it it covers, given what lookFor() made of the share (`k`). It fades in,
  // spreads and thins with age; one that is gone, or too thin to see, is nothing at all (so
  // nothing is spent on drawing it).
  function lookOf(out, age, size, k) {
    out[0] = 0; out[1] = 0;
    if (!(age <= LIFE)) return out;
    const u = age / LIFE, grow = 1 + 3.2 * u, cover = (k[1] * Math.min(1, 6 * age) * (1 - u) * Math.sqrt(1 - u)) / (0.6 + 0.4 * grow);
    if (cover <= 0.002) return out;
    out[0] = size * grow * k[0]; out[1] = cover;
    return out;
  }

  // How lit ink at height y is: ink near the surface is in more light.
  function litOf(y) {
    return 0.72 + (0.4 * (y - FLOOR)) / (TOP - FLOOR);
  }

  // For the checks: how many of the `count` specks are left, how many each band has and
  // where across the tank they lie on average, and the box they all lie in (least and most
  // across, up, and front to back).
  function measure(ink, count) {
    const perBand = new Array(BANDS).fill(0), sumX = new Array(BANDS).fill(0), box = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity], sum = [0, 0, 0];
    let alive = 0;
    for (let i = 0; i < count; i++) {
      if (ink.age[i] > LIFE) continue;
      alive++;
      const j = i * 3, b = ink.band[i];
      perBand[b]++; sumX[b] += ink.pos[j];
      for (let a = 0; a < 3; a++) { const v = ink.pos[j + a]; sum[a] += v; if (v < box[a * 2]) box[a * 2] = v; if (v > box[a * 2 + 1]) box[a * 2 + 1] = v; }
    }
    return { alive, perBand, meanX: sumX.map((v, b) => (perBand[b] ? v / perBand[b] : 0)), box: alive ? box : [0, 0, 0, 0, 0, 0], sum };
  }

  // ── The shaders ─────────────────────────────────────────────────────────────
  // The glass, in light only: the edges of each face, of an even width whatever the face's
  // size (each corner knows its face's size), and a faint sheen where the glass is seen
  // edge-on.
  const GLASS_VERT = `
    attribute vec2 faceSize;
    varying vec2 vUv, vSize;
    varying vec3 vNormal, vView;
    void main() {
      vUv = uv; vSize = faceSize;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vNormal = normalize(mat3(modelMatrix) * normal);
      vView = normalize(cameraPosition - w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const GLASS_FRAG = `
    precision highp float;
    varying vec2 vUv, vSize;
    varying vec3 vNormal, vView;
    uniform vec3 uColor;
    uniform float uBright, uScale;
    void main() {
      vec2 d = min(vUv, 1.0 - vUv) * vSize;                        // how far from the face's edges, in units
      float m = min(d.x, d.y), w = fwidth(m) * uScale, reach = max(0.012, 0.75 * w);
      float ridge = 1.0 - smoothstep(reach - w, reach + w, m);
      float sheen = pow(1.0 - abs(dot(normalize(vNormal), vView)), 3.0);
      gl_FragColor = vec4(uColor * (ridge * 0.5 + sheen * 0.05 + 0.004) * uBright, 1.0);
    }`;
  // The water's surface, in light only: its outline, a faint sheet, and up to four rings
  // that a beat sends out (each: where it began, across and front to back as shares of the
  // surface, how long ago, and how strong).
  const SURFACE_FRAG = `
    precision highp float;
    varying vec2 vUv, vSize;
    varying vec3 vNormal, vView;
    uniform vec3 uColor;
    uniform float uBright, uScale;
    uniform vec4 uRing[4];
    void main() {
      vec2 d = min(vUv, 1.0 - vUv) * vSize;
      float m = min(d.x, d.y), w = fwidth(m) * uScale, reach = max(0.010, 0.75 * w);
      float light = (1.0 - smoothstep(reach - w, reach + w, m)) * 0.45 + 0.05;
      for (int i = 0; i < 4; i++) {
        float r = length((vUv - uRing[i].xy) * vSize), at = 0.9 * uRing[i].z;
        light += uRing[i].w * exp(-uRing[i].z * 2.2) * (1.0 - smoothstep(0.0, 0.05, abs(r - at)));
      }
      gl_FragColor = vec4(uColor * light * uBright, 1.0);
    }`;
  // A speck of ink: a soft disc that covers some of what is behind it. look: its size in
  // units and how much it covers. uPx: how many pixels of the picture a unit is, one unit
  // from the camera.
  const INK_VERT = `
    attribute vec3 color;
    attribute vec2 look;
    uniform float uPx;
    varying vec3 vColor;
    varying float vCover;
    void main() {
      vColor = color; vCover = look.y;
      vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
      gl_PointSize = max(1.0, look.x * uPx / -mv.z);
      gl_Position = look.y > 0.0 ? projectionMatrix * mv : vec4(2.0, 2.0, 2.0, 1.0);   // nothing to draw: off the picture
    }`;
  const INK_FRAG = `
    precision highp float;
    varying vec3 vColor;
    varying float vCover;
    void main() {
      float r = length(gl_PointCoord - 0.5) * 2.0;
      float a = vCover * exp(-3.0 * r * r) * (1.0 - smoothstep(0.75, 1.0, r));
      if (a <= 0.002) discard;
      gl_FragColor = vec4(vColor, a);
    }`;

  // How many pixels of a picture `height` pixels tall a unit is, one unit from the camera,
  // with the camera zoomed by `zoom`.
  function pxOf(height, zoom) {
    return (height / (2 * Math.tan((FOV * Math.PI) / 360))) * zoom;
  }

  // ── The scene ───────────────────────────────────────────────────────────────
  // Everything below runs only when the scene is built: THREE, TimbreScene and the core.js
  // globals (the mic, the bins, the palette, the settings) are looked up then.

  // The scene definition, for TimbreScene.factory().
  function definition() {
    const ID = 'ink';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : 50;
    };
    const bands = new Float32Array(BANDS), owed = new Float32Array(BANDS), rate = new Float32Array(BANDS), rings = [], look2 = [0, 0], lookK = [0, 0], place = [0, 0], tint = [0, 0, 0];
    const ink = createInk(SPECKS_MAX, SEED);
    const col = new Float32Array(SPECKS_MAX * 3), look = new Float32Array(SPECKS_MAX * 2);
    let THREE = null, glass = null, front = null, surface = null, specks = null, geo = null, shade = null, whirl = 0, ringAt = 0, voice = null;
    // What the checks read. clock: seconds the scene has been live. count, share: the specks
    // in use. left: how many are in the water. strength: of the currents. whirl: the twist.
    // pitch: the voice's, 0..1. lead: the pour it leads at. clear: how much it counts, 0..1.
    const s = { pitch: 0, lead: 0, clear: 0, flame: 0, kick: 0, clock: 0, live: false, orbit: 0, colorT: 0, count: 0, share: 0, left: 0, strength: 0, whirl: 0, beats: 0, glass: 0, surface: 0, px: 0, drawnFor: 1, steps: 0, poursAt: 1 };

    function build(k) {
      THREE = k.THREE;
      shade = new THREE.Color();
      voice = TimbreScene.createPitch(BANDS);
      // The tank: a box of glass, open at the top. Each face's corners know its size.
      const box = k.keep(new THREE.BoxGeometry(W, H, D)), sizes = new Float32Array(24 * 2), dims = [[D, H], [D, H], [W, D], [W, D], [W, H], [W, H]];
      for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { sizes[(f * 4 + v) * 2] = dims[f][0]; sizes[(f * 4 + v) * 2 + 1] = dims[f][1]; }
      box.setAttribute('faceSize', new THREE.BufferAttribute(sizes, 2));
      const faces = Array.from(box.index.array);
      box.setIndex([...faces.slice(0, 12), ...faces.slice(18)]);   // no lid: the third face is the top
      const light = (frag, side, uniforms) => k.keep(k.addLight(new THREE.ShaderMaterial({ vertexShader: GLASS_VERT, fragmentShader: frag, side, depthTest: false,
        uniforms: Object.assign({ uColor: { value: new THREE.Color() }, uBright: { value: 0 }, uScale: { value: 1 } }, uniforms) })));
      // The glass is drawn in two: the faces turned away from the camera before the ink, which
      // covers them, and the faces turned toward it after the ink, so that their light lies over it.
      glass = new THREE.Mesh(box, light(GLASS_FRAG, THREE.BackSide, {}));
      glass.renderOrder = -1;
      front = new THREE.Mesh(box, light(GLASS_FRAG, THREE.FrontSide, {}));
      front.renderOrder = 1;
      for (const m of [glass, front]) { m.frustumCulled = false; k.scene.add(m); }
      const sheet = k.keep(new THREE.PlaneGeometry(W - 0.02, D - 0.02)), sheetSize = new Float32Array(8);
      for (let v = 0; v < 4; v++) { sheetSize[v * 2] = W; sheetSize[v * 2 + 1] = D; }
      sheet.setAttribute('faceSize', new THREE.BufferAttribute(sheetSize, 2));
      for (let i = 0; i < 4; i++) rings.push(new THREE.Vector4(0.5, 0.5, 99, 0));
      surface = new THREE.Mesh(sheet, light(SURFACE_FRAG, THREE.DoubleSide, { uRing: { value: rings } }));
      surface.rotation.x = -Math.PI / 2;
      surface.position.y = TOP;
      surface.renderOrder = 1;   // seen from above, it lies over the ink
      surface.frustumCulled = false;
      k.scene.add(surface);
      // The ink: pigment, not light. It covers what is behind it.
      geo = k.keep(new THREE.BufferGeometry());
      const live = (array, n) => { const a = new THREE.BufferAttribute(array, n); a.setUsage(THREE.DynamicDrawUsage); return a; };
      geo.setAttribute('position', live(ink.pos, 3));
      geo.setAttribute('color', live(col, 3));
      geo.setAttribute('look', live(look, 2));
      specks = new THREE.Points(geo, k.keep(new THREE.ShaderMaterial({ vertexShader: INK_VERT, fragmentShader: INK_FRAG, transparent: true, depthWrite: false, depthTest: false, uniforms: { uPx: { value: 1000 } } })));
      specks.frustumCulled = false;
      k.scene.add(specks);
    }

    // The palette colour at t, as the shader wants it (linear), into out.
    function palette(out, t) {
      const p = getColor(t);
      shade.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
      out[0] = shade.r; out[1] = shade.g; out[2] = shade.b;
      return out;
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = (0.26 * Math.sin(0.13 * t) + 0.07 * Math.sin(0.31 * t + 1)) * knob('cameraDrift') / 50;
      s.live = !!(micActive || cfgIdleAnim);
      const flame = s.flame = settle(audio.flame), kick = s.kick = settle(audio.kick);
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;

      // The specks in use. With fewer, those beyond the count are gone.
      const count = speckCount(knob('density'));
      if (count !== s.count) {
        if (count < s.count) ink.age.fill(LIFE + 1, count);
        if (ink.next >= count) ink.next = 0;
        s.count = count; s.share = shareOf(count);
        geo.setDrawRange(0, count);
      }

      // A beat twists the whole tank, one way and then the other, and rings the surface
      // from where the loudest band pours.
      if (audio.beat) {
        whirl = twistOf(whirl, ++s.beats);
        let loudest = 0;
        for (let b = 1; b < BANDS; b++) if (bands[b] > bands[loudest]) loudest = b;
        placeOf(place, loudest, s.clock);
        rings[ringAt].set((place[0] + W / 2) / W, (D / 2 - place[1]) / D, 0, 1);   // (the sheet's second direction runs from the back of the tank to the front)
        ringAt = (ringAt + 1) % 4;
      }
      for (const r of rings) r.z += dt;

      // Each band is followed: quick up, slower down.
      for (let b = 0; b < BANDS; b++) {
        let v = 0;
        if (micActive) v = loudness(slices, b, cfgGain);
        else if (cfgIdleAnim) v = idle(b, s.clock);
        bands[b] = follow(bands[b], v, v > bands[b] ? RISE : FALL, dt);
        if (v === 0) bands[b] = settle(bands[b]);
      }

      // The pitch of the voice (the mic's only): the pour at its place leads.
      voice.step(micActive ? frequencies : null, cfgGain, dt);
      s.pitch = voice.pitch; s.lead = voice.at; s.clear = voice.clear;

      // The ink: poured and moved in steps no longer than a sixtieth of a second.
      s.strength = strengthOf(flame, knob('swirl'));
      const steps = s.steps = stepsFor(dt), h = dt / steps;
      let total = 0;
      for (let b = 0; b < BANDS; b++) { rate[b] = pourRate(bands[b], s.share); total += rate[b]; }
      leadRates(rate, voice.at, voice.clear);   // the same ink in all, shared out by the pitch
      s.poursAt = pourShare(total, count);   // no more is poured than the specks can hold for their whole lives
      for (let n = 0; n < steps; n++) {
        if (s.live) s.clock += h;
        whirl = whirlAfter(whirl, h);
        for (let b = 0; b < BANDS; b++) {
          owed[b] += rate[b] * s.poursAt * h;
          if (owed[b] >= 1) palette(tint, colorT + b * 0.42);
          while (owed[b] >= 1) { owed[b] -= 1; pour(ink, count, b, bands[b], s.clock, tint); }
        }
        s.left = stepInk(ink, count, h, s.clock, s.strength, whirl);
      }
      s.whirl = whirl;

      // How each speck is drawn.
      lookFor(lookK, s.share);
      for (let i = 0; i < count; i++) {
        lookOf(look2, ink.age[i], ink.size[i], lookK);
        look[i * 2] = look2[0]; look[i * 2 + 1] = look2[1];
        if (look2[1] === 0) continue;
        const j = i * 3, lit = litOf(ink.pos[j + 1]);
        col[j] = ink.tint[j] * lit; col[j + 1] = ink.tint[j + 1] * lit; col[j + 2] = ink.tint[j + 2] * lit;
      }
      for (const a of [geo.attributes.position, geo.attributes.color, geo.attributes.look]) { a.addUpdateRange(0, count * a.itemSize); a.needsUpdate = true; }
      s.drawnFor = TimbreScene.renderScale(canvas3d.height);   // how many pixels of the kit's picture make one of the page
      s.px = specks.material.uniforms.uPx.value = pxOf(s.drawnFor * canvas3d.height, k.camera.zoom);

      // The glass and the surface: a pale tint of the palette, brighter with the voice and on a beat.
      const p = getColor(colorT + 1.5), gu = glass.material.uniforms, fu = front.material.uniforms, su = surface.material.uniforms;
      gu.uColor.value.setRGB(0.55 + (0.45 * p[0]) / 255, 0.55 + (0.45 * p[1]) / 255, 0.55 + (0.45 * p[2]) / 255, THREE.SRGBColorSpace);
      fu.uColor.value.copy(gu.uColor.value); su.uColor.value.copy(gu.uColor.value);
      s.glass = gu.uBright.value = fu.uBright.value = glassOf(knob('glass'), flame, kick);
      s.surface = su.uBright.value = surfaceOf(knob('glass'), flame, kick);
      gu.uScale.value = fu.uScale.value = su.uScale.value = s.drawnFor;
      glass.visible = front.visible = surface.visible = knob('glass') > 0;
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: PITCH,
      cooling: [0.08, 0.08, 0.08],   // the light a ring leaves on the surface is soon gone
      build,
      update,
      debug() {
        if (!specks) return Object.assign({}, s);
        const out = { r: 0, g: 0, b: 0 };
        const srgb = (c) => { c.getRGB(out, THREE.SRGBColorSpace); return [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)]; };
        const m = measure(ink, s.count), mat = specks.material;
        let strays = 0, newest = ink.next ? ink.next - 1 : s.count - 1;   // specks beyond the count in use that are still in the water: there should be none
        for (let i = s.count; i < SPECKS_MAX; i++) if (ink.age[i] <= LIFE) strays++;
        let colSum = 0;   // the colours the specks are drawn in, all added up
        for (let i = 0; i < s.count; i++) if (look[i * 2 + 1] > 0) colSum += col[i * 3] + col[i * 3 + 1] + col[i * 3 + 2];
        return Object.assign({
          bands: Array.from(bands), rates: Array.from(rate), perBand: m.perBand, meanX: m.meanX, box: m.box, sum: m.sum, colSum, poured: ink.poured, next: ink.next,
          rings: rings.map((r) => r.toArray()), glassColor: srgb(glass.material.uniforms.uColor.value), frontColor: srgb(front.material.uniforms.uColor.value), surfaceColor: srgb(surface.material.uniforms.uColor.value),
          shown: [glass.visible, front.visible, surface.visible], drawn: geo.drawRange.count, strays,
          brights: [glass.material.uniforms.uBright.value, front.material.uniforms.uBright.value, surface.material.uniforms.uBright.value], drawnPx: mat.uniforms.uPx.value,
          // The far glass, the ink, the near glass, the surface: in which order they are drawn, and which way each of the glass's faces is turned.
          order: [glass.renderOrder, specks.renderOrder, front.renderOrder, surface.renderOrder], sides: [glass.material.side === THREE.BackSide, front.material.side === THREE.FrontSide, surface.material.side === THREE.DoubleSide],
          surfaceAt: [surface.position.y, surface.rotation.x], faces: glass.geometry.index.count / 6, sameBox: front.geometry === glass.geometry,
          newest: { tint: [ink.tint[newest * 3], ink.tint[newest * 3 + 1], ink.tint[newest * 3 + 2]], band: ink.band[newest] },
          scales: [glass.material.uniforms.uScale.value, front.material.uniforms.uScale.value, surface.material.uniforms.uScale.value],
          pigment: mat.blending === THREE.NormalBlending && mat.transparent === true && mat.depthWrite === false && mat.depthTest === false,
          light: [glass, front, surface].every((o) => o.material.blending === THREE.CustomBlending && o.material.blendDst === THREE.OneFactor && o.material.depthTest === false),
          uploads: [geo.attributes.position.version, geo.attributes.color.version, geo.attributes.look.version],
        }, s);
      },
    };
  }

  globalThis.TimbreInk = {
    BANDS, W, H, D, TOP, FLOOR, WALL_X, WALL_Z, LIFE, POUR, SPECKS_MIN, SPECKS_MAX, QUIET, RISE, FALL, STREAM, TWIST, TWIST_FALL, SINK_FALL, SETTLE, GLASS_PUSH, GLASS_GAIN, BUDGET, LEAD_WIDTH, LEAD_FLOOR, TAB, STEPS_MAX, FOV, PITCH, FRAME, SEED,
    GLASS_VERT, GLASS_FRAG, SURFACE_FRAG, INK_VERT, INK_FRAG,
    speckCount, shareOf, loudness, idle, settle, placeOf, pourRate, pourShare, leadWeight, leadRates, strengthOf, glassOf, surfaceOf, current, tabulate, flow, nearGlass, fromGlass, twistOf, whirlAfter, stepsFor,
    createInk, pour, stepInk, lookFor, lookOf, litOf, measure, pxOf, definition,
  };
})();
