// Timbre — the glass prism: a cut crystal of twenty facets that tumbles in the box, drawn in
// light only, whose colours come apart like light through a prism. First the arithmetic: the
// bands its facets answer, how far its colours come apart, how bright it is, its tumble, the
// pulse a beat gives it, and how its facets fly when a hard peak shatters it.
// Then the shader that draws a facet, and the 3D scene, written against the scene kit:
// definition() returns what TimbreScene.factory() needs.
//
// All timing comes from the caller (dt in seconds), never from counting frames, so the same
// sound gives the same crystal at any frame rate.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreGlassPrism`), like chladni.js, so verify.mjs can import it under Node.
// Nothing here may touch document, window, THREE, TimbreScene or core.js globals at load
// time; the scene looks them up when it is built.

(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const FACETS = 20;                        // the crystal's sides
  const BANDS = 10;                         // bands the facets answer: the ten lowest bins
  const R = 1.3;                            // how far its corners are from its middle
  const RISE = 20, FALL = 5;                // how fast a band is followed, up and down, a second
  const KICK = 2.2, KICK_FALL = 2.5;        // a beat's spin, in radians a second, and how fast it dies away
  const APART_RATE = 10;                    // how fast the colours follow how far apart they should be
  const LINGER = 0.06;                      // how long the light it leaves behind takes to go, in seconds
  const PULSE_RATE = 14, PULSE_DAMP = 0.35; // the swing a beat sets going: how fast it swings, in radians a second, and how soon it stops
  const PULSE_PUSH = 4;                     // the push a beat gives it at Pulse 50: about 18% larger at the top of the swing
  const SMALLEST = 0.7, LARGEST = 1.6;      // its size is never under or over these
  const SPEED_MIN = 2.4, SPEED_RANGE = 4.6; // a blast's push on a facet, in units a second: at least, and up to this much more
  const SCATTER = 0.5;                      // how far from straight out a blast may push a facet
  const SHARD_SPIN = 9;                     // a blast's spin, in radians a second: up to half of this either way
  const SLOW_S = 0.38;                      // the push and the spin die away in this time, in seconds
  const DRIFT_MIN = 0.05, DRIFT_RANGE = 0.1; // the drift that lasts, in units a second
  const DRIFT_SPIN = 0.7;                   // the turning that lasts, in radians a second: up to half of this either way
  const FLY_MAX = 3.2;                      // no facet is drawn further than this from its place
  const REBLAST = 0.7, JOSTLE = 0.4;        // a peak while it is coming back, and one while it is in pieces, beside the shatter's 1
  const ROOM = 2;                           // nothing is drawn further than this from the middle: the picture takes a ball that size
  const HEAD = 0.2, HEAD_OVER = 0.5;        // the room kept for a beat while it is in pieces, and how far out its corners are when all of it is kept
  const ZOOM_BACK = 2;                      // how fast it comes back to its size after being drawn smaller, a second
  const FLASH_S = 0.25;                     // how long the flash of a shatter lasts, in seconds
  const TURN = 2 * Math.PI;
  const FOV = 30, PITCH = 8;                // the camera: how wide it sees and how far it looks down, in degrees
  const FRAME = { width: 5.2, height: 4.2, center: [0, 0, 0] };   // what the camera frames

  // The band a facet answers.
  function bandOf(facet) {
    return facet % BANDS;
  }

  // How loud a band is, 0..1: its bin, times Gain.
  function loudness(bins, band, gain) {
    if (!bins || !(band < bins.length)) return 0;
    return clamp01((bins[band] / 255) * gain);
  }

  // With the mic off and Idle animation on: how loud band b pretends to be at t seconds.
  function idle(b, t) {
    return 0.3 + 0.3 * Math.sin(0.6 * t + 1.4 * b);
  }

  // The high end of the sound: the mean of the five highest bands.
  function highOf(bands) {
    let sum = 0;
    for (let b = BANDS - 5; b < BANDS; b++) sum += bands[b];
    return sum / 5;
  }

  // A level that has all but died away is none. The voice and a beat die away for ever and
  // never arrive, and a picture that should be still would go on changing by a hair.
  function settle(v) {
    return v < 1e-4 ? 0 : v;
  }

  // How far the three colours should be apart: a little always, more with the high end and
  // on a beat, and all of it scaled by the Chroma setting (0..100; 50 is as designed).
  function apartOf(high, kick, chroma) {
    return ((0.018 + 0.1 * high + 0.08 * kick) * chroma) / 50;
  }

  // Copy c of the crystal (0, 1, 2) with the colours `apart`, into out: its size, how far it
  // is rolled about the line of sight (radians) and how far it is moved to the camera's right.
  function copyAt(out, c, apart) {
    const off = (c - 1) * apart;
    out[0] = 1 + off; out[1] = 0.9 * off; out[2] = 0.5 * off;
    return out;
  }

  // How bright the crystal is drawn: with the voice, on a beat, and in the flash of a shatter.
  function brightOf(flame, kick, flash = 0) {
    return 0.26 + 0.2 * flame + 0.18 * kick + 0.25 * flash;
  }

  // The glow inside it, into out: how bright and how large.
  function heartOf(out, flame, kick, flash = 0) {
    out[0] = 0.03 + 0.1 * flame + 0.12 * kick + 0.25 * flash;
    out[1] = 1.8 + 1.0 * flame + 0.6 * kick + 0.5 * flash;
    return out;
  }

  // ── The pulse ───────────────────────────────────────────────────────────────
  // A beat sets the crystal swinging like a spring let go: larger, then a little smaller
  // than it was, then still.

  // The push a beat gives the swing, by the Pulse setting (0..100; 50 is as designed).
  function pushOf(pulse) {
    return (PULSE_PUSH * pulse) / 50;
  }

  // The swing dt seconds on. sw is [how far out it is, how fast it is going]. This is where
  // the spring would be, not a step toward it, so two half steps are one whole. A swing
  // that has all but stopped has stopped: a picture that should be still is still.
  function swing(sw, dt) {
    const a = PULSE_DAMP * PULSE_RATE, wd = PULSE_RATE * Math.sqrt(1 - PULSE_DAMP * PULSE_DAMP);
    const e = Math.exp(-a * dt), c = Math.cos(wd * dt), sn = Math.sin(wd * dt), x = sw[0], v = sw[1];
    sw[0] = e * (x * c + ((v + a * x) / wd) * sn);
    sw[1] = e * (v * c - ((a * v + PULSE_RATE * PULSE_RATE * x) / wd) * sn);
    if (Math.abs(sw[0]) < 1e-4 && Math.abs(sw[1]) < 1e-3) { sw[0] = 0; sw[1] = 0; }
    return sw;
  }

  // The crystal's size with the swing x out.
  function sizeOf(x) {
    return x < SMALLEST - 1 ? SMALLEST : x > LARGEST - 1 ? LARGEST : 1 + x;
  }

  // ── The shatter ─────────────────────────────────────────────────────────────
  // A hard peak breaks the crystal into its twenty facets. A blast pushes each one outward
  // and sets it spinning; the push dies away and a slow drift carries on; after a calm wait
  // each is carried home again. When it breaks and when it comes back is TimbreHelix's
  // shatter machine, the one DNA uses; how the facets fly is below. Everything here is in
  // the crystal's own frame, so the pieces go on tumbling together.

  // The same angle, within half a turn of none, so a facet turns home the short way.
  function shortWay(a) {
    return a - TURN * Math.round(a / TURN);
  }

  // Where the facets are, from the crystal's corners (three to a facet, x y z each): each
  // facet's middle, and the way it faces, one long.
  function layout(home) {
    const centres = new Float64Array(FACETS * 3), normals = new Float64Array(FACETS * 3);
    for (let i = 0; i < FACETS; i++) {
      const j = i * 3, k = i * 9;
      for (let a = 0; a < 3; a++) centres[j + a] = (home[k + a] + home[k + 3 + a] + home[k + 6 + a]) / 3;
      const long = Math.hypot(centres[j], centres[j + 1], centres[j + 2]) || 1;
      for (let a = 0; a < 3; a++) normals[j + a] = centres[j + a] / long;
    }
    return { centres, normals };
  }

  // The facets in flight. off: how far each has flown. vel, spin: the push and the turning a
  // blast gave it, dying away. drift, dspin: the slow motion that lasts. axis: what it turns
  // about, through its own middle. ang: how far it has turned. from, fromAng, lag: where its
  // return started and how soon it finishes. shown, turned: where it is drawn.
  function createShards() {
    const three = () => new Float64Array(FACETS * 3), one = () => new Float64Array(FACETS);
    return { off: three(), vel: three(), drift: three(), axis: three(), from: three(), shown: three(),
      ang: one(), spin: one(), dspin: one(), fromAng: one(), turned: one(), lag: one().fill(1) };
  }

  // A direction, one long, anywhere on the ball, from two numbers of `random`, into out.
  function anyWay(out, random) {
    const z = 2 * random() - 1, a = TURN * random(), r = Math.sqrt(1 - z * z);
    out[0] = r * Math.cos(a); out[1] = r * Math.sin(a); out[2] = z;
    return out;
  }

  // A blast of `strength`: every facet is pushed and spun, on top of what it has. outward:
  // the push is away from the middle, give or take. Else it is any way at all, as a jostle
  // must be (pushes outward again and again would pin every facet to its limit), but for a
  // facet that has flown beyond FLY_MAX, which is pushed back toward its place: through a long
  // din they would all wander out there otherwise. fresh: the crystal was whole, so each
  // facet takes a new axis to turn about.
  const WAY = [0, 0, 0];
  function blast(sh, normals, strength, random, outward, fresh) {
    for (let i = 0; i < FACETS; i++) {
      const j = i * 3;
      anyWay(WAY, random);
      if (outward) {
        const x = normals[j] + SCATTER * WAY[0], y = normals[j + 1] + SCATTER * WAY[1], z = normals[j + 2] + SCATTER * WAY[2], long = Math.hypot(x, y, z);
        WAY[0] = x / long; WAY[1] = y / long; WAY[2] = z / long;
      } else if (Math.hypot(sh.off[j], sh.off[j + 1], sh.off[j + 2]) > FLY_MAX && sh.off[j] * WAY[0] + sh.off[j + 1] * WAY[1] + sh.off[j + 2] * WAY[2] > 0) {
        WAY[0] = -WAY[0]; WAY[1] = -WAY[1]; WAY[2] = -WAY[2];
      }
      const speed = (SPEED_MIN + SPEED_RANGE * random()) * strength;
      sh.spin[i] += (random() - 0.5) * SHARD_SPIN * strength;
      const drift = DRIFT_MIN + DRIFT_RANGE * random();
      sh.dspin[i] = (random() - 0.5) * DRIFT_SPIN;
      for (let a = 0; a < 3; a++) { sh.vel[j + a] += speed * WAY[a]; sh.drift[j + a] = drift * WAY[a]; }
      if (fresh) { anyWay(WAY, random); sh.axis[j] = WAY[0]; sh.axis[j + 1] = WAY[1]; sh.axis[j + 2] = WAY[2]; }
    }
    return sh;
  }

  // Where each facet is drawn in flight: the way it has flown, but never further than FLY_MAX.
  function show(sh) {
    for (let i = 0; i < FACETS; i++) {
      const j = i * 3, long = Math.hypot(sh.off[j], sh.off[j + 1], sh.off[j + 2]);
      const k = long > 1e-9 ? (FLY_MAX * Math.tanh(long / FLY_MAX)) / long : 1;
      sh.shown[j] = sh.off[j] * k; sh.shown[j + 1] = sh.off[j + 1] * k; sh.shown[j + 2] = sh.off[j + 2] * k;
      sh.turned[i] = sh.ang[i];
    }
    return sh;
  }

  // dt seconds of flight: the push and the spin die away, the drift carries on. Exact, so
  // two half steps are one whole.
  function fly(sh, dt) {
    const keep = Math.exp(-dt / SLOW_S), travel = SLOW_S * (1 - keep);
    for (let i = 0; i < FACETS; i++) {
      const j = i * 3;
      for (let a = 0; a < 3; a++) { sh.off[j + a] += sh.vel[j + a] * travel + sh.drift[j + a] * dt; sh.vel[j + a] *= keep; }
      sh.ang[i] += sh.spin[i] * travel + sh.dspin[i] * dt;
      sh.spin[i] *= keep;
    }
    return show(sh);
  }

  // The return begins from where the facets are drawn; from here place() carries them, so
  // their push is spent.
  function startReturn(sh, random) {
    for (let i = 0; i < FACETS; i++) {
      const j = i * 3;
      for (let a = 0; a < 3; a++) { sh.from[j + a] = sh.shown[j + a]; sh.vel[j + a] = 0; }
      sh.fromAng[i] = shortWay(sh.turned[i]);
      sh.lag[i] = 0.6 + 0.4 * random();
      sh.spin[i] = 0;
    }
    return sh;
  }

  // u (0..1) of the way through the return: each facet has come its share of the way home.
  // share(u, lag) is TimbreHelix.returnShare: an eased drift most of the way, then a snap.
  function place(sh, u, share) {
    for (let i = 0; i < FACETS; i++) {
      const j = i * 3, left = 1 - share(u, sh.lag[i]).e;
      sh.shown[j] = sh.from[j] * left; sh.shown[j + 1] = sh.from[j + 1] * left; sh.shown[j + 2] = sh.from[j + 2] * left;
      sh.turned[i] = sh.fromAng[i] * left;
    }
    return sh;
  }

  // A blast has broken the return off: flight takes up from where each facet is drawn.
  function resume(sh) {
    for (let i = 0; i < FACETS; i++) {
      const j = i * 3, long = Math.hypot(sh.shown[j], sh.shown[j + 1], sh.shown[j + 2]);
      const k = long > 1e-9 ? (FLY_MAX * Math.atanh(Math.min(long / FLY_MAX, 0.999999))) / long : 1;
      sh.off[j] = sh.shown[j] * k; sh.off[j + 1] = sh.shown[j + 1] * k; sh.off[j + 2] = sh.shown[j + 2] * k;
      sh.ang[i] = sh.turned[i];
    }
    return sh;
  }

  // Every facet home and at rest.
  function home(sh) {
    for (const k of ['off', 'vel', 'drift', 'from', 'shown', 'ang', 'spin', 'dspin', 'fromAng', 'turned']) sh[k].fill(0);
    sh.lag.fill(1);
    return sh;
  }

  // The crystal as drawn, into pos and nor (three corners to a facet, x y z each): every
  // corner of a facet moved by how far the facet is shown from its place and turned about
  // the facet's middle, and the way it faces turned with it. home, homeN: the corners and
  // the ways they face in the whole crystal. Returns how far the furthest corner is from
  // the middle.
  function shape(pos, nor, home, homeN, centres, sh) {
    let reach = 0;
    for (let i = 0; i < FACETS; i++) {
      const j = i * 3, ax = sh.axis[j], ay = sh.axis[j + 1], az = sh.axis[j + 2], c = Math.cos(sh.turned[i]), sn = Math.sin(sh.turned[i]);
      for (let v = 0; v < 3; v++) {
        const k = i * 9 + v * 3;
        const x = home[k] - centres[j], y = home[k + 1] - centres[j + 1], z = home[k + 2] - centres[j + 2], d = (ax * x + ay * y + az * z) * (1 - c);
        const px = centres[j] + sh.shown[j] + x * c + (ay * z - az * y) * sn + ax * d;
        const py = centres[j + 1] + sh.shown[j + 1] + y * c + (az * x - ax * z) * sn + ay * d;
        const pz = centres[j + 2] + sh.shown[j + 2] + z * c + (ax * y - ay * x) * sn + az * d;
        pos[k] = px; pos[k + 1] = py; pos[k + 2] = pz;
        const far = Math.hypot(px, py, pz);
        if (far > reach) reach = far;
        const nx = homeN[k], ny = homeN[k + 1], nz = homeN[k + 2], dn = (ax * nx + ay * ny + az * nz) * (1 - c);
        nor[k] = nx * c + (ay * nz - az * ny) * sn + ax * dn;
        nor[k + 1] = ny * c + (az * nx - ax * nz) * sn + ay * dn;
        nor[k + 2] = nz * c + (ax * ny - ay * nx) * sn + az * dn;
      }
    }
    return reach;
  }

  // Room kept for a beat once the crystal is in pieces, so that it can still swell: none
  // while its corners are where they belong, all of it once they are HEAD_OVER further out.
  function headFor(reach) {
    return 1 + HEAD * clamp01((reach - R) / HEAD_OVER);
  }

  // How far from the middle anything may be drawn: ROOM, less by as much as the Scene Size
  // slider has enlarged the picture (`enlarged`: 1 is as it comes), but never less than the
  // whole crystal takes with its colours `apart`. Enlarged until the crystal fills the
  // picture, its pieces have no more room than it had.
  function limitFor(enlarged, apart) {
    return Math.max(ROOM / Math.max(1, enlarged), R * (1 + apart) + 0.5 * apart);
  }

  // How much smaller everything must be drawn to fit: with its corners `reach` from the
  // middle, at `size`, its colours `apart`. The largest copy is 1 + apart times the size
  // and half of apart to one side, and none of it may be further than `limit` from the middle.
  function roomFor(reach, size, apart, limit = ROOM) {
    const most = reach * Math.max(size, headFor(reach)) * (1 + apart) + 0.5 * apart;
    return most > limit ? limit / most : 1;
  }

  // How much smaller it is drawn dt seconds on: at once as small as it must be, and back
  // toward its size at ZOOM_BACK a second. All but its size is its size.
  function zoomAfter(zoom, room, dt) {
    const z = Math.min(room, zoom + (room - zoom) * (1 - Math.exp(-ZOOM_BACK * dt)));
    return room === 1 && 1 - z < 1e-4 ? 1 : z;
  }

  // How fast it turns by itself, in radians a second.
  function turnRate(flame) {
    return 0.25 + 1.5 * flame;
  }

  // The axis it turns about after `clock` seconds, one long, into out: mostly upright, wandering.
  function axisAt(out, clock) {
    const x = Math.sin(0.21 * clock), z = 0.6 * Math.cos(0.17 * clock), long = Math.hypot(x, 1, z);
    out[0] = x / long; out[1] = 1 / long; out[2] = z / long;
    return out;
  }

  // The spin the nth beat gives it, into out: about an axis from a fixed sequence, and
  // KICK radians a second or up to 1.4 times that, as the sequence has it.
  function kickAt(out, n) {
    const a = 2.4 * n;
    out[0] = KICK * Math.cos(a); out[1] = KICK * Math.sin(1.7 * a); out[2] = KICK * Math.sin(a);
    return out;
  }

  // The angle a spin of `speed` radians a second turns in dt seconds while it dies away.
  function kickAngle(speed, dt) {
    return (speed * (1 - Math.exp(-KICK_FALL * dt))) / KICK_FALL;
  }

  // Turn q (a quaternion: x, y, z, w) by `angle` radians about the world axis x, y, z (one long).
  function turn(q, x, y, z, angle) {
    const s = Math.sin(angle / 2), ax = x * s, ay = y * s, az = z * s, aw = Math.cos(angle / 2);
    const bx = q[0], by = q[1], bz = q[2], bw = q[3];
    const nx = aw * bx + ax * bw + ay * bz - az * by, ny = aw * by - ax * bz + ay * bw + az * bx;
    const nz = aw * bz + ax * by - ay * bx + az * bw, nw = aw * bw - ax * bx - ay * by - az * bz;
    const long = Math.hypot(nx, ny, nz, nw);
    q[0] = nx / long; q[1] = ny / long; q[2] = nz / long; q[3] = nw / long;
    return q;
  }

  // One step of the tumble, dt seconds long with its middle at `mid` seconds on the clock:
  // q turns about the wandering axis at its own rate, and about the kick's axis (`spin`:
  // radians a second each way) between two halves of that turn, so that a long step and
  // two short ones end up the same way round. The kick dies away, and one that has all but
  // died is none.
  const AXIS = [0, 0, 0];
  function tumble(q, spin, mid, flame, dt) {
    axisAt(AXIS, mid);
    const half = (turnRate(flame) * dt) / 2, speed = Math.hypot(spin[0], spin[1], spin[2]);
    turn(q, AXIS[0], AXIS[1], AXIS[2], half);
    if (speed > 1e-4) {
      turn(q, spin[0] / speed, spin[1] / speed, spin[2] / speed, kickAngle(speed, dt));
      const left = Math.exp(-KICK_FALL * dt);
      spin[0] *= left; spin[1] *= left; spin[2] *= left;
    } else { spin[0] = 0; spin[1] = 0; spin[2] = 0; }
    turn(q, AXIS[0], AXIS[1], AXIS[2], half);
    return q;
  }

  // ── The shader ──────────────────────────────────────────────────────────────
  // A facet, in light only: its ridges (each corner of a facet carries one of 1,0,0 / 0,1,0 /
  // 0,0,1, so the least of the three says how near a ridge a point is), light bleeding in
  // from them, a flash when the facet mirrors a lamp toward the eye, and its band.
  const VERT = `
    attribute vec3 bary;
    attribute float faceBand;
    uniform float uBands[${BANDS}];
    varying vec3 vBary, vNormal, vView;
    varying float vBand;
    void main() {
      vBary = bary;
      vBand = uBands[int(faceBand)];
      vec4 w = modelMatrix * vec4(position, 1.0);
      vNormal = normalize(mat3(modelMatrix) * normal);
      vView = normalize(cameraPosition - w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const FRAG = `
    precision highp float;
    uniform vec3 uColor;
    uniform float uBright, uScale;
    varying vec3 vBary, vNormal, vView;
    varying float vBand;
    void main() {
      vec3 n = normalize(vNormal);
      float front = gl_FrontFacing ? 1.0 : 0.0;
      if (front < 0.5) n = -n;
      // w: how far m goes across one pixel of the page. (The kit draws small pages into a picture several
      // times the page, of which a page pixel shows only the middle: a ridge thinner than the page's own
      // pixels would come out in dashes.)
      float m = min(vBary.x, min(vBary.y, vBary.z)), w = fwidth(m) * uScale, reach = max(0.007, 0.75 * w);
      float ridge = 1.0 - smoothstep(reach - w, reach + w, m);
      float bloom = exp(-m / 0.045);
      float facing = max(dot(n, vView), 0.0);
      vec3 h1 = normalize(normalize(vec3(0.5, 0.8, 0.6)) + vView), h2 = normalize(normalize(vec3(-0.7, 0.2, 0.5)) + vView);
      float flash = pow(max(dot(n, h1), 0.0), 40.0) * 1.6 + pow(max(dot(n, h2), 0.0), 16.0) * 0.5;
      float sheen = pow(1.0 - facing, 2.0) * 0.1;
      float face = (flash * 0.7 + vBand * 0.16) * front + sheen;   // only the near facets flash and answer their bands
      float side = mix(0.3, 1.0, front);                            // the far facets are dimmer
      gl_FragColor = vec4(uColor * (ridge * 0.6 + bloom * 0.14 + face) * side * uBright, 1.0);
    }`;

  // ── The scene ───────────────────────────────────────────────────────────────
  // Everything below runs only when the scene is built: THREE, TimbreScene and the core.js
  // globals (the mic, the bins, the palette, the settings) are looked up then.

  // The scene definition, for TimbreScene.factory().
  function definition() {
    const ID = 'glass-prism';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name, otherwise = 50) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : otherwise;
    };
    const bands = new Float32Array(BANDS), shown = new Array(BANDS).fill(0);
    const q = [0, 0, 0, 1], spin = [0, 0, 0], pose = [0, 0, 0], glow = [0, 0], copies = [];
    const sw = [0, 0], sh = createShards();
    // The shatter machine counts its own pieces; these stand in for the facets, which fly in 3D here.
    const stubs = Array.from({ length: FACETS }, () => ({ cx: 500, cy: 500 }));
    let THREE = null, heart = null, sight = null, right = null;
    let HX = null, machine = null, random = null, geo = null, whole = null, wholeN = null, lay = null, sinceReturn = 0;
    // What the checks read. clock: seconds the scene has been live, which the axis wanders by.
    // swell, size: the pulse. phase: whole, pieces or returning. reach: how far its furthest
    // corner is from its middle. limit: how far anything may be drawn. room: how much smaller
    // it must be drawn to fit. held: the same with the pulse aside, kept while it grows back.
    // zoom: how much smaller it is drawn.
    const s = { flame: 0, kick: 0, clock: 0, live: false, orbit: 0, colorT: 0, high: 0, apart: 0, bright: 0, kicks: 0, drawnFor: 1,
      swell: 0, size: 1, phase: 'whole', shatters: 0, jostles: 0, flash: 0, reach: R, limit: ROOM, room: 1, held: 1, zoom: 1 };

    // The crystal's corners go back where they belong.
    function mend() {
      geo.attributes.position.array.set(whole); geo.attributes.normal.array.set(wholeN);
      geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
    }

    function build(k) {
      THREE = k.THREE;
      HX = TimbreHelix;
      machine = HX.createShatter({ random: HX.rng(7) });
      sight = new THREE.Vector3(); right = new THREE.Vector3();
      // Twenty flat facets, three corners each; no corner is shared, so each facet can carry
      // its own band and its own three ridges, and fly off by itself.
      geo = new THREE.IcosahedronGeometry(R, 0);
      whole = geo.attributes.position.array.slice(); wholeN = geo.attributes.normal.array.slice();
      lay = layout(whole);
      const n = geo.attributes.position.count, bary = new Float32Array(n * 3), band = new Float32Array(n);
      for (let i = 0; i < n; i++) { bary[i * 3 + (i % 3)] = 1; band[i] = bandOf(Math.floor(i / 3)); }
      geo.setAttribute('bary', new THREE.BufferAttribute(bary, 3));
      geo.setAttribute('faceBand', new THREE.BufferAttribute(band, 1));
      // The crystal three times over, one for each colour, the far facets showing through the near.
      for (let c = 0; c < 3; c++) {
        const mat = k.addLight(new THREE.ShaderMaterial({
          vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, depthTest: false,
          uniforms: { uColor: { value: new THREE.Color() }, uBright: { value: 0 }, uScale: { value: 1 }, uBands: { value: shown } },
        }));
        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false;
        k.scene.add(mesh);
        copies.push(mesh);
      }
      // The light gathered inside it.
      heart = new THREE.Sprite(k.addLight(new THREE.SpriteMaterial({ map: k.glowTexture(255, 255, 255), depthTest: false })));
      k.scene.add(heart);
    }

    // The palette colour at t, as the shader wants it (linear), into c.
    function palette(c, t) {
      const p = getColor(t);
      return c.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = (0.25 * Math.sin(0.12 * t) + 0.06 * Math.sin(0.31 * t + 1)) * knob('cameraDrift') / 50;

      // With the mic and Idle animation both off, the crystal stops turning.
      s.live = !!(micActive || cfgIdleAnim);
      if (s.live) s.clock += dt;
      const flame = s.flame = settle(audio.flame), kick = s.kick = settle(audio.kick);

      // Each band is followed: quick up, slower down.
      for (let b = 0; b < BANDS; b++) {
        let v = 0;
        if (micActive) v = loudness(slices, b, cfgGain);
        else if (cfgIdleAnim) v = idle(b, s.clock);
        bands[b] = follow(bands[b], v, v > bands[b] ? RISE : FALL, dt);
        if (v === 0) bands[b] = settle(bands[b]);   // all but silent is silent: a muted crystal comes to rest
        shown[b] = bands[b];
      }
      s.high = highOf(bands);

      // The tumble. A beat kicks it about the next axis of the sequence, and sets it swinging:
      // larger, then a little smaller, then still.
      if (audio.beat) { kickAt(spin, ++s.kicks); sw[1] += pushOf(knob('pulse')); }
      if (s.live) tumble(q, spin, s.clock - dt / 2, flame, dt);
      else { spin[0] = 0; spin[1] = 0; spin[2] = 0; }
      swing(sw, dt);
      s.swell = sw[0];
      s.size = sizeOf(sw[0]);

      // The shatter. The machine says when: a hard peak with the mic on breaks the crystal, a
      // peak while it is in pieces jostles them, and after a calm wait they come home. The
      // peak is the raw input level, before Gain, as DNA hears it.
      s.flash = settle(s.flash * Math.exp(-dt / FLASH_S));
      const was = machine.state;
      const event = machine.step({
        now, dt, live: !!micActive,
        peak: typeof micPeak === 'number' ? micPeak : HX.peakOf(typeof waveform === 'undefined' ? null : waveform),
        threshold: HX.threshold(knob('shatterSensitivity')), reconnectS: knob('reconnectSeconds', 3),
        W: 1000, H: 1000, scale: 1, cut: () => stubs,
      });
      if (event === 'shatter') {
        random = HX.rng(1000 + ++s.shatters);   // each shatter its own, and the same again another day
        blast(sh, lay.normals, 1, random, true, true);
        s.flash = 1;
      } else if (event === 'jostle') {
        s.jostles++;
        if (was === 'returning') { resume(sh); blast(sh, lay.normals, REBLAST, random, true, false); s.flash = Math.max(s.flash, 0.6); }
        else { blast(sh, lay.normals, JOSTLE, random, false, false); s.flash = Math.max(s.flash, 0.3); }
      } else if (event === 'return') {
        startReturn(sh, random);
        sinceReturn = 0;
      } else if (event === 'whole' || event === 'reset') {
        home(sh);
        mend();
        s.flash = event === 'whole' ? Math.max(s.flash, 0.55) : 0;
        if (event === 'reset') s.held = 1;   // the page had stopped drawing: it resumes whole, and its own size
      } else sinceReturn += dt;   // during the return, in step with the machine's own progress through it (it starts from nothing at each)
      s.phase = machine.state;
      if (s.phase === 'pieces') fly(sh, dt);
      else if (s.phase === 'returning') place(sh, Math.min(1, sinceReturn / HX.RETURN_S), HX.returnShare);
      if (s.phase === 'whole') s.reach = R;
      else {
        s.reach = shape(geo.attributes.position.array, geo.attributes.normal.array, whole, wholeN, lay.centres, sh);
        geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
      }

      // The three colours, apart by as much as the high end and a beat say.
      s.apart = follow(s.apart, apartOf(s.high, kick, knob('chroma')), APART_RATE, dt);
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      s.bright = brightOf(flame, kick, s.flash);
      s.drawnFor = TimbreScene.renderScale(canvas3d.height);   // how many pixels of the kit's picture make one of the page
      // Swollen by a beat or flown apart, it is drawn smaller by as much as keeps all of it in the
      // picture. What its pieces need is held, shrinking at once and growing back slowly (followed
      // both ways it would quiver as they spin); what a beat's swell needs on top is taken as it comes.
      s.limit = limitFor(k.camera.zoom, s.apart);
      s.room = roomFor(s.reach, s.size, s.apart, s.limit);
      s.held = zoomAfter(s.held, roomFor(s.reach, 1, s.apart, s.limit), dt);
      s.zoom = Math.min(s.held, s.room);
      k.camera.getWorldDirection(sight);
      right.setFromMatrixColumn(k.camera.matrixWorld, 0);
      for (let c = 0; c < 3; c++) {
        const m = copies[c], u = m.material.uniforms;
        copyAt(pose, c, s.apart);
        m.quaternion.set(q[0], q[1], q[2], q[3]);
        m.rotateOnWorldAxis(sight, pose[1]);
        m.scale.setScalar(pose[0] * s.size * s.zoom);
        m.position.copy(right).multiplyScalar(pose[2] * s.zoom);
        palette(u.uColor.value, colorT + c);
        u.uBright.value = s.bright;
        u.uScale.value = s.drawnFor;
      }
      heartOf(glow, flame, kick, s.flash);
      palette(heart.material.color, colorT + 1).multiplyScalar(glow[0]);
      heart.scale.setScalar(glow[1] * s.zoom);
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: PITCH,
      cooling: [LINGER, LINGER, LINGER],   // the light it leaves is soon gone, all colours alike: a fast tumble stays a crystal
      build,
      update,
      debug() {
        if (!heart) return Object.assign({}, s);
        // What is drawn, read back from the meshes and their uniforms.
        const out = { r: 0, g: 0, b: 0 };
        const srgb = (c) => { c.getRGB(out, THREE.SRGBColorSpace); return [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)]; };
        return Object.assign({
          q: q.slice(), spin: spin.slice(), bands: Array.from(bands), given: copies[0].material.uniforms.uBands.value.slice(),
          copies: copies.map((m) => ({
            turned: m.quaternion.toArray(), scale: m.scale.x, at: m.position.toArray(), color: srgb(m.material.uniforms.uColor.value), bright: m.material.uniforms.uBright.value,
            light: m.material.blending === THREE.CustomBlending && m.material.blendDst === THREE.OneFactor && m.material.depthTest === false && m.material.side === THREE.DoubleSide,
          })),
          heart: { size: heart.scale.x, light: [heart.material.color.r, heart.material.color.g, heart.material.color.b], shown: heart.visible && !!heart.parent && heart.parent.type === 'Scene' },
          right: right.toArray(), sight: sight.toArray(),
          corners: Array.from(geo.attributes.position.array), faces: Array.from(geo.attributes.normal.array), wholeCorners: Array.from(whole),
          shards: { shown: Array.from(sh.shown), turned: Array.from(sh.turned), axis: Array.from(sh.axis), lag: Array.from(sh.lag), from: Array.from(sh.from), fromAng: Array.from(sh.fromAng) },
          uploads: [geo.attributes.position.version, geo.attributes.normal.version],   // how often its corners, and the ways they face, have been sent to be drawn
        }, s);
      },
    };
  }

  globalThis.TimbreGlassPrism = {
    FACETS, BANDS, R, RISE, FALL, KICK, KICK_FALL, APART_RATE, LINGER, FOV, PITCH, FRAME, VERT, FRAG,
    PULSE_RATE, PULSE_DAMP, PULSE_PUSH, SMALLEST, LARGEST, SPEED_MIN, SPEED_RANGE, SCATTER, SHARD_SPIN, SLOW_S, DRIFT_MIN, DRIFT_RANGE, DRIFT_SPIN,
    FLY_MAX, REBLAST, JOSTLE, ROOM, HEAD, HEAD_OVER, ZOOM_BACK, FLASH_S,
    bandOf, loudness, idle, highOf, settle, apartOf, copyAt, brightOf, heartOf, turnRate, axisAt, kickAt, kickAngle, turn, tumble,
    pushOf, swing, sizeOf, shortWay, layout, createShards, anyWay, blast, show, fly, startReturn, place, resume, home, shape, headFor, limitFor, roomFor, zoomAfter, definition,
  };
})();
