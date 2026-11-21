// Timbre — shards: a broken pane of mirror glass that the sound opens up. First the
// arithmetic: the cracks, the shards cut from them, what a band hears, how far open a shard
// is, and where that puts it. Then the shaders that draw a shard and the light behind the
// pane, and the 3D scene, written against the scene kit: definition() returns what
// TimbreScene.factory() needs.
//
// All timing comes from the caller (dt in seconds), never from counting frames. The cracks
// come from a seeded sequence, so the pane breaks the same way every time.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreShards`), like ink.js, so verify.mjs can import it under Node.
// Nothing here may touch document, window, THREE, TimbreScene or core.js globals at load
// time; the scene looks them up when it is built.

(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const BANDS = 8;                          // bands the pane listens to: the eight lowest bins
  const PW = 3.6, PH = 2.3;                 // the pane: across, up
  const IX = -0.38, IY = 0.14;              // where it was struck
  const FAR = Math.hypot(PW / 2 - IX, PH / 2 + IY);   // from there to the furthest corner
  const THICK = 0.05, GAP = 0.011;          // how thick the glass is, and how far a shard is drawn in from its cracks
  const TRAVEL = 0.75;                      // seconds a ripple takes to reach the furthest corner
  const BEAT_TRAVEL = 0.41;                 // and a beat's ring
  const LIFT = 1, SPREAD = 0.22, TIP = 0.6; // at an opening of 1: how far a shard at the point of impact lifts, how far one moves away for each unit it is from that point, and how far one tips, in radians
  const TILT_MAX = 0.95;                    // the furthest a shard leans from the pane, in radians
  const OPEN_MAX = 1.7;                     // the widest opening
  const QUIET = 0.08;                       // a band below this is not heard at all
  const RISE = 20, FALL = 4;                // how fast a band is followed, up and down, a second
  const HISTORY = 24, HISTORY_HZ = 24;      // what is remembered of the sound: so many samples, so many a second
  const SHARDS_MAX = 640;                   // room for this many shards
  const SECTORS = 16;                       // sectors round the point of impact, each listening to one band
  const WIDE = 9.24;                        // a shard wider than this over the number of cracks is cracked again
  const FOV = 30, PITCH = 5;                // the camera: how wide it sees and how far it looks down, in degrees
  // What the camera frames: the pane wide open, with what lifts toward the viewer.
  const FRAME = { width: 5.8, height: 4.4, center: [0, -0.05, 0.4] };
  const TURN = [-0.05, -0.26, 0.03];        // how the pane is turned from facing the camera squarely, in radians
  const GLOW_PLANE = 6.4, GLOW_Z = -0.55;   // the sheet the light behind the pane is drawn on: its size, and how far behind
  const SEED = 20261121;
  const TAU = 2 * Math.PI;

  // The number a setting gives when it is not a number: the middle.
  const setting = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 50);

  // How many cracks run outward, and how many rings of cracks cross them, from Density (0..100).
  function spokesFor(density) {
    return Math.round(12 + (20 * setting(density)) / 100);
  }
  function ringsFor(density) {
    return Math.round(5 + (6 * setting(density)) / 100);
  }

  // How far the pane's edge is from the point of impact, in the direction `angle`.
  function edgeAt(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    let t = Infinity;
    if (c > 1e-9) t = Math.min(t, (PW / 2 - IX) / c);
    if (c < -1e-9) t = Math.min(t, (-PW / 2 - IX) / c);
    if (s > 1e-9) t = Math.min(t, (PH / 2 - IY) / s);
    if (s < -1e-9) t = Math.min(t, (-PH / 2 - IY) / s);
    return t;
  }

  // A sequence of numbers, 0 up to 1, from a seed.
  function sequence(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The cracks, as the shards they cut: a list of polygons of three or four corners in the
  // pane, each anticlockwise, which together fill it exactly. `spokes` cracks run outward
  // from the point of impact (four of them to the pane's corners) and `rings` rings cross
  // them, round near the point of impact and squarer toward the pane's edge; where a shard
  // would be too wide another crack runs out through it, and some are cracked across.
  // `rnd` may be given to go on with a sequence; otherwise it starts from `seed`.
  function crack(spokes, rings, seed, rnd) {
    rnd = rnd || sequence(seed);
    // The directions of the pane's four corners, which come in order round a point inside it.
    const corners = [[PW / 2, PH / 2], [-PW / 2, PH / 2], [-PW / 2, -PH / 2], [PW / 2, -PH / 2]]
      .map(([x, y]) => (Math.atan2(y - IY, x - IX) + TAU) % TAU);
    const angles = [];
    for (let c = 0; c < 4; c++) {
      const a0 = corners[c], a1 = c < 3 ? corners[c + 1] : corners[0] + TAU, n = Math.max(1, Math.round((spokes * (a1 - a0)) / TAU));
      for (let i = 0; i < n; i++) angles.push(a0 + (a1 - a0) * (i === 0 ? 0 : (i + (rnd() - 0.5) * 0.5) / n));
    }
    const S = angles.length, wide = WIDE / spokes;
    const rmin = Math.min(PW / 2 - Math.abs(IX), PH / 2 - Math.abs(IY));
    const at = (a, f) => { const r = f * (rmin * (1 - f) + edgeAt(a) * f); return [IX + Math.cos(a) * r, IY + Math.sin(a) * r]; };
    const frac = (i) => Math.pow(i / rings, 1.15);
    const v = [];
    for (let i = 1; i <= rings; i++) {
      v[i] = [];
      for (let j = 0; j < S; j++) {
        if (i === rings) { v[i][j] = at(angles[j], 1); continue; }
        const f = frac(i) + (rnd() - 0.5) * 0.85 * (frac(i) - frac(i - 1));
        v[i][j] = at(angles[j], f);
      }
    }
    const polys = [];
    const mid = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    function quad(a, b, c, d) {
      if (Math.hypot(c[0] - b[0], c[1] - b[1]) > wide) {
        const t = 0.4 + 0.2 * rnd(), mo = mid(b, c, t), mi = mid(a, d, t);
        quad(a, b, mo, mi); quad(mi, mo, c, d);
        return;
      }
      const u = rnd();
      if (u < 0.16) polys.push([a, b, c], [a, c, d]);
      else if (u < 0.32) polys.push([a, b, d], [b, c, d]);
      else polys.push([a, b, c, d]);
    }
    for (let j = 0; j < S; j++) {
      const j1 = (j + 1) % S;
      polys.push([[IX, IY], v[1][j], v[1][j1]]);
      for (let i = 2; i <= rings; i++) quad(v[i - 1][j], v[i][j], v[i][j1], v[i - 1][j1]);
    }
    return polys;
  }

  // The pane at a Density: its shards. For shard i: its middle (cx, cy), how far that is
  // from the point of impact (dist; d as a share of the furthest corner's), the direction
  // from that point (ux, uy), the band its sector listens to, and numbers of its own: how
  // far it lifts and tips (liftK, tipK), a lean to one side and a twist as it opens, and
  // how it lies at rest (restX, restY: no shard lies quite flat). Its corners are a small
  // prism about its middle: start[i] is its first corner and start[i + 1] the next shard's;
  // local and lnorm are each corner's place and the way it faces, kind what it belongs to
  // (0 the mirror, 1 a cut side, 2 the back), tone the shard's place in the palette, and
  // index the triangles.
  function createPane(density, seed) {
    const spokes = spokesFor(density), rings = ringsFor(density), rnd = sequence(seed), polys = crack(spokes, rings, seed, rnd), count = polys.length;
    let verts = 0, indices = 0;
    for (const p of polys) { verts += 6 * p.length; indices += 12 * p.length - 12; }
    const F = () => new Float32Array(count);
    const P = { count, verts, indices, spokes, rings, cx: F(), cy: F(), dist: F(), d: F(), ux: F(), uy: F(), band: new Uint8Array(count), liftK: F(), tipK: F(), side: F(), twist: F(), restX: F(), restY: F(),
      start: new Uint32Array(count + 1), local: new Float32Array(verts * 3), lnorm: new Float32Array(verts * 3), kind: new Float32Array(verts), tone: new Float32Array(verts), index: new Uint32Array(indices) };
    let vi = 0, ii = 0;
    const put = (x, y, z, nx, ny, nz, kind, tone) => {
      const j = vi * 3;
      P.local[j] = x; P.local[j + 1] = y; P.local[j + 2] = z; P.lnorm[j] = nx; P.lnorm[j + 1] = ny; P.lnorm[j + 2] = nz; P.kind[vi] = kind; P.tone[vi] = tone;
      return vi++;
    };
    for (let i = 0; i < count; i++) {
      const p = polys[i], n = p.length, h = THICK / 2;
      let cx = 0, cy = 0;
      for (const q of p) { cx += q[0] / n; cy += q[1] / n; }
      const dist = Math.hypot(cx - IX, cy - IY), ang = (Math.atan2(cy - IY, cx - IX) + TAU) % TAU;
      P.cx[i] = cx; P.cy[i] = cy; P.dist[i] = dist; P.d[i] = dist / FAR;
      P.ux[i] = dist > 1e-6 ? (cx - IX) / dist : 0; P.uy[i] = dist > 1e-6 ? (cy - IY) / dist : 0;
      P.band[i] = (Math.floor((ang / TAU) * SECTORS) * 3) % BANDS;
      P.liftK[i] = 0.75 + 0.5 * rnd(); P.tipK[i] = 0.6 + 0.6 * rnd(); P.side[i] = (rnd() - 0.5) * 0.9; P.twist[i] = (rnd() - 0.5) * 0.8;
      P.restX[i] = (rnd() - 0.5) * 0.11; P.restY[i] = (rnd() - 0.5) * 0.11;
      const tone = P.d[i] + 0.25 * rnd();
      // Each corner is drawn in toward the middle by the gap, so the cracks show.
      const pts = p.map((q) => { const dx = q[0] - cx, dy = q[1] - cy, len = Math.hypot(dx, dy) || 1, f = Math.max(0.55, 1 - GAP / len); return [dx * f, dy * f]; });
      P.start[i] = vi;
      const top = pts.map(([x, y]) => put(x, y, h, 0, 0, 1, 0, tone));
      const back = pts.map(([x, y]) => put(x, y, -h, 0, 0, -1, 2, tone));
      for (let c = 1; c < n - 1; c++) { P.index[ii++] = top[0]; P.index[ii++] = top[c]; P.index[ii++] = top[c + 1]; }
      for (let c = 1; c < n - 1; c++) { P.index[ii++] = back[0]; P.index[ii++] = back[c + 1]; P.index[ii++] = back[c]; }
      for (let c = 0; c < n; c++) {
        const a = pts[c], b = pts[(c + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], el = Math.hypot(ex, ey) || 1, nx = ey / el, ny = -ex / el;
        const q0 = put(a[0], a[1], h, nx, ny, 0, 1, tone), q1 = put(b[0], b[1], h, nx, ny, 0, 1, tone), q2 = put(b[0], b[1], -h, nx, ny, 0, 1, tone), q3 = put(a[0], a[1], -h, nx, ny, 0, 1, tone);
        P.index[ii++] = q0; P.index[ii++] = q3; P.index[ii++] = q2; P.index[ii++] = q0; P.index[ii++] = q2; P.index[ii++] = q1;
      }
    }
    P.start[count] = vi;
    return P;
  }

  // How many shards the coarsest pane and the finest have.
  const COUNT_MIN = crack(spokesFor(0), ringsFor(0), SEED).length, COUNT_MAX = crack(spokesFor(100), ringsFor(100), SEED).length;

  // How loud a band is, 0..1: its bin, times Gain. One quieter than QUIET is not heard at
  // all: a room's hiss would hold every sector a little open, and the lights in the mirror
  // make much of a small tilt.
  function loudness(bins, band, gain) {
    if (!bins || !(band < bins.length)) return 0;
    const v = clamp01((bins[band] / 255) * gain);
    return v < QUIET ? 0 : v;
  }

  // With the mic off and Idle animation on: how loud band b pretends to be at t seconds.
  // The bands rise and fall in turn.
  function idle(b, t) {
    return Math.max(0, 0.22 + 0.3 * Math.sin(0.7 * t + 1.4 * b));
  }

  // A level that has all but died away is none.
  function settle(v) {
    return v < 1e-4 ? 0 : v;
  }

  // What the Bloom setting (0..100) makes of every opening: none at 0, as designed at 50,
  // twice that at 100.
  function amountOf(bloom) {
    return setting(bloom) / 50;
  }

  // How long ago the sound was that a shard shows, for a shard `d` of the way to the
  // furthest corner: the voice's ripple, and a beat's ring, which runs faster.
  function delayOf(d) {
    return d * TRAVEL;
  }
  function beatDelayOf(d) {
    return d * BEAT_TRAVEL;
  }

  // How far open a shard is, for the voice, its band and the beat as they were when the
  // ripple that has reached it set out, and what Bloom makes of it.
  function openOf(voice, band, beat, amount) {
    return Math.min(OPEN_MAX, (Math.min(1.2, 0.5 * voice + 0.65 * band) + 0.5 * beat) * amount);
  }

  // That for every shard of the pane, into out, from what is remembered of the voice, of
  // each band and of the beat (each answers heard(seconds ago)). Returns the mean.
  function openAll(out, pane, voice, bands, beat, amount) {
    let sum = 0;
    for (let i = 0; i < pane.count; i++) {
      const d = pane.d[i], ago = delayOf(d);
      const e = openOf(voice.heard(ago), bands[pane.band[i]].heard(ago), beat.heard(beatDelayOf(d)), amount);
      out[i] = e; sum += e;
    }
    return pane.count ? sum / pane.count : 0;
  }

  // Where an opening of `e` puts shard i, into out: its middle (0..2) and its turn (3..11,
  // a matrix by rows). It lifts toward the viewer, most near the point of impact; it moves
  // away from that point, further the further it already is; and it turns once, about the
  // axis that its tip (outward, like a petal), its lean, its twist and the way it lies at
  // rest make together. It leans no further from the pane than TILT_MAX.
  function poseOf(out, pane, i, e) {
    const ux = pane.ux[i], uy = pane.uy[i], dist = pane.dist[i];
    out[0] = pane.cx[i] + ux * SPREAD * e * dist;
    out[1] = pane.cy[i] + uy * SPREAD * e * dist;
    out[2] = LIFT * e * (0.3 + 0.7 * (1 - pane.d[i])) * pane.liftK[i];
    const a = TIP * e * pane.tipK[i], b = e * pane.side[i];
    let rx = -uy * a + ux * b + pane.restX[i], ry = ux * a + uy * b + pane.restY[i];
    const rz = e * pane.twist[i], lean = Math.hypot(rx, ry);
    if (lean > TILT_MAX) { rx *= TILT_MAX / lean; ry *= TILT_MAX / lean; }
    const ang = Math.hypot(rx, ry, rz);
    if (ang < 1e-9) { out[3] = 1; out[4] = 0; out[5] = 0; out[6] = 0; out[7] = 1; out[8] = 0; out[9] = 0; out[10] = 0; out[11] = 1; return out; }
    const x = rx / ang, y = ry / ang, z = rz / ang, c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
    out[3] = c + x * x * t; out[4] = x * y * t - z * s; out[5] = x * z * t + y * s;
    out[6] = y * x * t + z * s; out[7] = c + y * y * t; out[8] = y * z * t - x * s;
    out[9] = z * x * t - y * s; out[10] = z * y * t + x * s; out[11] = c + z * z * t;
    return out;
  }

  // Every corner of every shard, for the openings in `open` (one for each shard): where it
  // is (pos), which way it faces (norm), and how far open its shard is (shown).
  const POSE = new Float64Array(12);
  function place(pane, open, pos, norm, shown) {
    const L = pane.local, N = pane.lnorm, m = POSE;
    for (let i = 0; i < pane.count; i++) {
      const e = open[i];
      poseOf(m, pane, i, e);
      for (let v = pane.start[i], end = pane.start[i + 1]; v < end; v++) {
        const j = v * 3, lx = L[j], ly = L[j + 1], lz = L[j + 2], nx = N[j], ny = N[j + 1], nz = N[j + 2];
        pos[j] = m[0] + m[3] * lx + m[4] * ly + m[5] * lz; pos[j + 1] = m[1] + m[6] * lx + m[7] * ly + m[8] * lz; pos[j + 2] = m[2] + m[9] * lx + m[10] * ly + m[11] * lz;
        norm[j] = m[3] * nx + m[4] * ny + m[5] * nz; norm[j + 1] = m[6] * nx + m[7] * ny + m[8] * nz; norm[j + 2] = m[9] * nx + m[10] * ny + m[11] * nz;
        shown[v] = e;
      }
    }
  }

  // The light behind the pane, into out: how bright it is and how wide. Faint in silence,
  // brighter and wider with the voice and on a beat.
  function glowOf(out, flame, kick) {
    out[0] = 0.05 + 0.26 * flame + 0.3 * kick;
    out[1] = 3.8 + flame + 0.8 * kick;
    return out;
  }

  // For the checks: the box the pane's corners lie in (least and most across, up, and
  // toward the viewer).
  function measure(pane, pos) {
    const box = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
    for (let v = 0; v < pane.verts; v++) for (let a = 0; a < 3; a++) { const p = pos[v * 3 + a]; if (p < box[a * 2]) box[a * 2] = p; if (p > box[a * 2 + 1]) box[a * 2 + 1] = p; }
    return box;
  }

  // ── The shaders ─────────────────────────────────────────────────────────────
  // A shard, drawn solid. Its top is a mirror: it shows a sky of six palette colours (the
  // colour depends on where the mirror points) with long soft lights in it, so that each
  // shard shows its own piece of them, and it flashes when it catches one of three lamps.
  // Its back is a mirror too, dimmer: with the camera swayed to one side, a shard that is
  // wide open on the other side has tipped past edge-on, and must still read as glass. Its
  // cut sides glow in the colour of the light behind the pane, brighter the further open
  // the shard is.
  const MIRROR_VERT = `
    attribute float kind, tone, open;
    varying vec3 vN, vW;
    varying float vKind, vTone, vOpen;
    void main() {
      vKind = kind; vTone = tone; vOpen = open;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vW = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const MIRROR_FRAG = `
    precision highp float;
    uniform vec3 uPal[6];
    uniform float uShift, uFlame, uKick;
    varying vec3 vN, vW;
    varying float vKind, vTone, vOpen;
    vec3 pal(float u) {
      u = fract(u) * 6.0;
      int i = min(int(floor(u)), 5);
      float f = u - floor(u);
      f = f * f * (3.0 - 2.0 * f);
      return mix(uPal[i], uPal[(i + 1) % 6], f);
    }
    void main() {
      vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
      vec3 col;
      if (vKind > 0.5 && vKind < 1.5) {
        col = pal(0.5 + 0.10 * vTone) * (0.20 + 1.3 * vOpen + 0.5 * uKick);
      } else {
        vec3 r = reflect(-v, n);
        vec3 sky = pal(uShift + 0.20 * r.x + 0.28 * r.y + 0.10 * vTone);
        float bars = smoothstep(0.35, 0.95, 0.5 + 0.5 * sin(17.0 * r.y + 5.0 * r.x + 1.0));
        float lum = 0.10 + 0.22 * smoothstep(-0.7, 0.9, r.y + 0.35 * r.x) + 0.42 * bars;
        vec3 l1 = normalize(vec3(0.42, 0.72, 0.55)), l2 = normalize(vec3(-0.72, 0.22, 0.66)), l3 = normalize(vec3(0.12, -0.74, 0.66));
        float flash = pow(max(dot(r, l1), 0.0), 70.0) * 2.4 + pow(max(dot(r, l2), 0.0), 40.0) * 1.2 + pow(max(dot(r, l3), 0.0), 40.0) * 0.9;
        float fres = pow(1.0 - abs(dot(n, v)), 3.0);
        col = sky * lum * (0.8 + 0.5 * uFlame) + sky * fres * 0.6 + (vec3(0.6) + 0.4 * sky) * flash * (0.45 + 0.7 * uFlame + 0.8 * uKick);
        if (vKind > 1.5) col *= 0.6;
      }
      gl_FragColor = vec4(col, 1.0);
    }`;
  // The light behind the pane, in light only: brightest behind the point of impact and
  // falling away from it. uSize: how wide it is, in units; the sheet is uPlane across.
  const GLOW_VERT = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
    }`;
  const GLOW_FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform vec3 uColor;
    uniform float uBright, uSize, uPlane;
    void main() {
      float r = length(vUv - 0.5) * 2.0 * uPlane / uSize;
      float light = exp(-4.8 * r) * (1.0 - smoothstep(0.8, 1.0, r));
      gl_FragColor = vec4(uColor * light * uBright, 1.0);
    }`;

  // ── The scene ───────────────────────────────────────────────────────────────
  // Everything below runs only when the scene is built: THREE, TimbreScene and the core.js
  // globals (the mic, the bins, the palette, the settings) are looked up then.

  // The scene definition, for TimbreScene.factory().
  function definition() {
    const ID = 'shards';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : 50;
    };
    const VERTS = SHARDS_MAX * 24, INDICES = SHARDS_MAX * 36;
    const bands = new Float32Array(BANDS), hist = [], open = new Float32Array(SHARDS_MAX), glowed = [0, 0];
    const pos = new Float32Array(VERTS * 3), norm = new Float32Array(VERTS * 3), shown = new Float32Array(VERTS), kind = new Float32Array(VERTS), tone = new Float32Array(VERTS), index = new Uint32Array(INDICES);
    let THREE = null, pane = null, group = null, mesh = null, geo = null, glow = null, voice = null, beat = null;
    // What the checks read. clock: seconds the scene has been live. count: the shards.
    // open: how far open they are on average; most: the furthest open. amount: what Bloom
    // makes of it. glow, glowSize: the light behind the pane. breaks: how often the pane has
    // been broken anew. beats: how many beats there have been.
    const s = { flame: 0, kick: 0, clock: 0, live: false, orbit: 0, colorT: 0, count: 0, open: 0, most: 0, amount: 1, glow: 0, glowSize: 0, shift: 0, breaks: 0, beats: 0 };

    function build(k) {
      THREE = k.THREE;
      geo = k.keep(new THREE.BufferGeometry());
      const live = (array, n) => { const a = new THREE.BufferAttribute(array, n); a.setUsage(THREE.DynamicDrawUsage); return a; };
      geo.setAttribute('position', live(pos, 3));
      geo.setAttribute('normal', live(norm, 3));
      geo.setAttribute('open', live(shown, 1));
      geo.setAttribute('kind', new THREE.BufferAttribute(kind, 1));
      geo.setAttribute('tone', new THREE.BufferAttribute(tone, 1));
      geo.setIndex(new THREE.BufferAttribute(index, 1));
      mesh = new THREE.Mesh(geo, k.keep(new THREE.ShaderMaterial({ vertexShader: MIRROR_VERT, fragmentShader: MIRROR_FRAG,
        uniforms: { uPal: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Color()) }, uShift: { value: 0 }, uFlame: { value: 0 }, uKick: { value: 0 } } })));
      mesh.frustumCulled = false;
      // The light behind the pane: the shards hide it, and it leaks through the cracks.
      glow = new THREE.Mesh(k.keep(new THREE.PlaneGeometry(GLOW_PLANE, GLOW_PLANE)), k.keep(k.addLight(new THREE.ShaderMaterial({ vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
        uniforms: { uColor: { value: new THREE.Color() }, uBright: { value: 0 }, uSize: { value: 1 }, uPlane: { value: GLOW_PLANE } } }))));
      glow.position.set(IX, IY, GLOW_Z);
      glow.frustumCulled = false;
      group = new THREE.Group();
      group.rotation.set(TURN[0], TURN[1], TURN[2]);
      group.add(mesh); group.add(glow);
      k.scene.add(group);
      voice = TimbreScene.createHistory(HISTORY, HISTORY_HZ);
      beat = TimbreScene.createHistory(HISTORY, HISTORY_HZ);
      for (let b = 0; b < BANDS; b++) hist.push(TimbreScene.createHistory(HISTORY, HISTORY_HZ));
    }

    // Break the pane anew for a Density.
    function shatter(d) {
      pane = createPane(d, SEED);
      kind.set(pane.kind); tone.set(pane.tone); index.set(pane.index);
      geo.attributes.kind.needsUpdate = true; geo.attributes.tone.needsUpdate = true; geo.index.needsUpdate = true;
      geo.setDrawRange(0, pane.indices);
      s.count = pane.count; s.breaks++;
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = (0.2 * Math.sin(0.13 * t) + 0.05 * Math.sin(0.31 * t + 1)) * knob('cameraDrift') / 50;
      s.live = !!(micActive || cfgIdleAnim);
      if (s.live) s.clock += dt;
      const flame = s.flame = settle(audio.flame), kick = s.kick = settle(audio.kick);
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      if (audio.beat) s.beats++;

      // The pane, broken as finely as Density says.
      const d = setting(knob('density'));
      if (!pane || spokesFor(d) !== pane.spokes || ringsFor(d) !== pane.rings) shatter(d);

      // Each band is followed, quick up and slower down, and what it was is remembered.
      for (let b = 0; b < BANDS; b++) {
        let v = 0;
        if (micActive) v = loudness(frequencies, b, cfgGain);
        else if (cfgIdleAnim) v = idle(b, s.clock);
        bands[b] = follow(bands[b], v, v > bands[b] ? RISE : FALL, dt);
        if (v === 0) bands[b] = settle(bands[b]);
        hist[b].step(bands[b], dt);
      }
      voice.step(flame, dt);
      beat.step(kick, dt);

      // How far open each shard is, and where that puts it.
      s.amount = amountOf(knob('bloom'));
      s.open = openAll(open, pane, voice, hist, beat, s.amount);
      let most = 0;
      for (let i = 0; i < pane.count; i++) if (open[i] > most) most = open[i];
      s.most = most;
      place(pane, open, pos, norm, shown);
      for (const a of [geo.attributes.position, geo.attributes.normal, geo.attributes.open]) { a.addUpdateRange(0, pane.verts * a.itemSize); a.needsUpdate = true; }

      // The sky the shards mirror: six colours round the palette, drifting slowly.
      const u = mesh.material.uniforms;
      for (let i = 0; i < 6; i++) {
        const p = getColor(colorT + (i * PALETTE.length) / 6);
        u.uPal.value[i].setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
      }
      s.shift = u.uShift.value = (0.02 * s.clock) % 1;
      u.uFlame.value = flame; u.uKick.value = kick;

      // The light behind the pane.
      const g = getColor(colorT + PALETTE.length / 2), gu = glow.material.uniforms;
      gu.uColor.value.setRGB(g[0] / 255, g[1] / 255, g[2] / 255, THREE.SRGBColorSpace);
      glowOf(glowed, flame, kick);
      s.glow = gu.uBright.value = glowed[0];
      s.glowSize = gu.uSize.value = glowed[1];
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: PITCH,
      cooling: [0.08, 0.08, 0.08],   // the light behind the pane is soon gone from where a shard has moved over it
      build,
      update,
      debug() {
        if (!mesh || !pane) return Object.assign({}, s);
        const out = { r: 0, g: 0, b: 0 };
        const srgb = (c) => { c.getRGB(out, THREE.SRGBColorSpace); return [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)]; };
        const mat = mesh.material, gm = glow.material;
        let posSum = 0, normSum = 0, shownSum = 0;
        for (let i = 0, n = pane.verts * 3; i < n; i++) { posSum += pos[i] * ((i % 7) + 1); normSum += norm[i] * ((i % 5) + 1); }
        for (let v = 0; v < pane.verts; v++) shownSum += shown[v];
        return Object.assign({
          bands: Array.from(bands), opens: Array.from(open.subarray(0, pane.count)), box: measure(pane, pos), posSum, normSum, shownSum,
          verts: pane.verts, indices: pane.indices, drawn: geo.drawRange.count, spokes: pane.spokes, rings: pane.rings,
          pal: mat.uniforms.uPal.value.map(srgb), glowColor: srgb(gm.uniforms.uColor.value), lit: [mat.uniforms.uFlame.value, mat.uniforms.uKick.value, mat.uniforms.uShift.value],
          glowAt: glow.position.toArray(), glowDrawn: [gm.uniforms.uBright.value, gm.uniforms.uSize.value, gm.uniforms.uPlane.value], turn: [group.rotation.x, group.rotation.y, group.rotation.z],
          solid: mat.transparent === false && mat.depthTest === true && mat.depthWrite === true && mat.side === THREE.FrontSide,
          light: gm.blending === THREE.CustomBlending && gm.blendDst === THREE.OneFactor && gm.depthTest === true && gm.depthWrite === false,
          uploads: [geo.attributes.position.version, geo.attributes.normal.version, geo.attributes.open.version, geo.attributes.kind.version, geo.index.version],
          first: Array.from(pos.subarray(0, 9)), lastIndex: index[pane.indices - 1],
        }, s);
      },
    };
  }

  globalThis.TimbreShards = {
    BANDS, PW, PH, IX, IY, FAR, THICK, GAP, TRAVEL, BEAT_TRAVEL, LIFT, SPREAD, TIP, TILT_MAX, OPEN_MAX, QUIET, RISE, FALL, HISTORY, HISTORY_HZ, SHARDS_MAX, SECTORS, FOV, PITCH, FRAME, TURN, GLOW_PLANE, GLOW_Z, SEED, COUNT_MIN, COUNT_MAX,
    MIRROR_VERT, MIRROR_FRAG, GLOW_VERT, GLOW_FRAG,
    spokesFor, ringsFor, edgeAt, crack, createPane, loudness, idle, settle, amountOf, delayOf, beatDelayOf, openOf, openAll, poseOf, place, glowOf, measure, definition,
  };
})();
