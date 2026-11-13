// Timbre — planets, what the ringed-planet Pulse Rings and the sun-and-planets Orbit share. It
// holds the tilted projection that makes a flat circle look like an orbit or a ring seen from
// above, the largest such circle that fits a frame, a memory of how loud the sound was a moment
// ago, the ring disc (its bands, the ripple that crosses them, what a blast does to them and how
// they fill back in), the cracks that cut a planet into chunks, the sun-and-planets system (how
// many planets there are, their orbits, how fast they go and when the sun flares), and the
// colours and shading of a lit sphere. The effects in factories/ read the sound, decide what
// happens and draw.
//
// All timing comes from the caller (dt in seconds), never from counting frames or reading the
// clock, so the same sound gives the same picture at any frame rate. Radii of rings and bands are
// in planet radii; everything else is in the caller's own units.
//
// The two paint helpers draw on the canvas context they are handed; nothing here reaches for a
// canvas of its own. Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbrePlanets`), like helix.js, so verify.mjs can import it under Node. Nothing
// here may touch document, window or core.js globals.

(function () {
  'use strict';

  const TURN = 2 * Math.PI;

  // The ring disc.
  const TILT = 0.36;                 // how flat the disc looks: 1 seen from above, 0 edge on
  const ROLL = -0.28;                // how far the whole system leans, rad
  const INNER = 1.34;                // the disc's inner edge, in planet radii
  const OUTER = 3.1, OUTER_FLOW = 1; // its outer edge at Flow 0, and added at Flow 100
  const BANDS = 30;
  const TRAVEL_S = 0.95;             // a ripple crosses the disc, inner edge to outer, in this long
  const GHOST = 0.42;                // how much of a band is left once a blast has thinned it
  const SHOCK_S = 0.22;              // a blast reaches the outer edge this long after the inner one
  const SWELL = 0.35, SWELL_S = 0.7; // how far a band swells outward as the blast passes, and for how long
  const THIN_S = 0.18;               // a band thinning, time constant
  const FILL_S = 0.7, FILL_UP_S = 0.3; // a refill reaches the outer edge this long after the inner one; a band filling, time constant
  const GAIN_MIN = 0.6, GAIN_RANGE = 1.1; // the ripple's gain at Sensitivity 0, and added at 100
  const ECHO_SLACK_S = 0.1;          // how much longer than asked the loudness memory keeps its notes

  const PIECES = 22;                 // chunks a planet breaks into
  const RIM = 56;                    // corners of the many-sided shape that stands for the planet's disc when it is cut
  const CRACK_JITTER = 0.22;         // a crack passes within half this share of the chunk's size of the chunk's middle
  const CRACK_SWING = 1.1;           // rad: a crack turns up to half this, either way, from straight across the chunk's longest reach

  // The sun-and-planets system.
  const SUN_R = 12;                                  // × scale: the sun's radius at rest
  const ORBIT_K = 0.35, ORBIT_K_SPREAD = 0.12;       // how flat an orbit looks, and how much orbits differ
  const ORBIT_ROLL = -0.2, ORBIT_ROLL_SPREAD = 0.32; // how far an orbit leans, rad, and how much orbits differ
  const AXIS_SPREAD = 1.2;                           // rad: how much planets' own leans differ
  const ORBIT_EDGE = 9;                              // × scale: room kept between the outermost orbit and the frame
  const ORBIT_INNER = 2.7;                           // the innermost orbit, in sun radii
  const SPACING = 0.9;                               // below 1 packs the inner orbits a little closer
  const LAP_S = 9;                                   // the innermost planet's lap at speed 1
  const FALL = 0.8;                                  // how quickly the turning falls off with an orbit's radius
  const SPEED_MIN = 0.4, SPEED_LOUD = 2.3, SPEED_FAST = 1.0, SPEED_FLARE = 2.5;
  const SYS_LOUD_S = 0.25, SYS_FAST_S = 0.05;        // the slow loudness and the fast one
  const FLARE_S = 0.45, FLARE_REARM_S = 1.0;         // a flare's fading, and the shortest time between two, counted with the mic on
  const BORN_S = 0.8, GONE_S = 0.5;                  // a planet fading in, and out
  const EASE_S = 0.5;                                // an orbit moving to a new radius, time constant
  const NEAR = 0.2;                                  // how much larger a planet is drawn at its nearest, and smaller at its farthest
  const MAX_PLANETS = 9, DEFAULT_PLANETS = 6;
  const PLANET_SIZES = [3.4, 4.6, 4.2, 6.6, 5.8, 3.8, 5.0, 3.2, 4.4];   // × scale, give or take a quarter; the fourth has rings

  const clamp01 = (v) => (v > 1 ? 1 : v > 0 ? v : 0);
  const follow = (current, target, dt, tau) => current + (target - current) * (1 - Math.exp(-dt / tau));

  // A point at angle th on a circle of radius a, lying in a plane flattened to k of its width and
  // leaned by roll, as an offset from the circle's centre. z says which half it is on: +1 nearest
  // the viewer (the lower half before the lean), -1 farthest.
  function place(a, th, k, roll) {
    const lx = a * Math.cos(th), ly = a * Math.sin(th) * k, c = Math.cos(roll), s = Math.sin(roll);
    return { x: lx * c - ly * s, y: lx * s + ly * c, z: Math.sin(th) };
  }

  // How far such a circle reaches sideways and up or down, per unit of radius.
  function reach(k, roll) {
    const c = Math.cos(roll), s = Math.sin(roll);
    return { x: Math.sqrt(c * c + k * k * s * s), y: Math.sqrt(s * s + k * k * c * c) };
  }

  // The largest radius at which it stays `edge` inside a W by H frame, centred.
  function fit(W, H, edge, k, roll) {
    const r = reach(k, roll);
    return Math.max(0, Math.min((W / 2 - edge) / r.x, (H / 2 - edge) / r.y));
  }

  // A memory of a level over the last `span` seconds. note(t, v) records it; heard(t, delay) is
  // what it was `delay` ago, read between the two notes either side of that moment.
  function createEcho(span) {
    const notes = [];
    return {
      get size() { return notes.length; },
      note(t, v) {
        // A moment noted twice (a frame of no length) keeps its last level, and no second note.
        if (notes.length && notes[notes.length - 1].t === t) { notes[notes.length - 1].v = v; return; }
        notes.push({ t, v });
        while (notes.length > 2 && notes[1].t < t - span - ECHO_SLACK_S) notes.shift();
      },
      heard(t, delay) {
        const n = notes.length;
        if (!n) return 0;
        const when = t - delay;
        if (when <= notes[0].t) return notes[0].v;
        if (when >= notes[n - 1].t) return notes[n - 1].v;
        let lo = 0, hi = n - 1;                // notes[lo].t <= when < notes[hi].t
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (notes[mid].t <= when) lo = mid; else hi = mid; }
        const a = notes[lo], b = notes[hi];
        return a.v + (b.v - a.v) * (when - a.t) / (b.t - a.t);
      },
    };
  }

  // The disc at rest, Saturn-like, by how far out a band is (0 inner edge, 1 outer edge): a faint
  // inner ring, a bright broad one, a dark gap, a second ring, a thin outer one.
  const ringRest = (u) => (u < 0.16 ? 0.3 : u < 0.54 ? 0.95 : u < 0.61 ? 0.07 : u < 0.9 ? 0.62 : u < 0.95 ? 0.1 : 0.45);
  // The disc's outer edge for a Flow of 0 to 100, in planet radii.
  const outer = (flow) => OUTER + OUTER_FLOW * (Number.isFinite(flow) ? clamp01(flow / 100) : 0);
  // The ripple's gain for a Sensitivity of 0 to 100.
  const gain = (sensitivity) => GAIN_MIN + GAIN_RANGE * (Number.isFinite(sensitivity) ? clamp01(sensitivity / 100) : 0.5);

  // The ring disc. step() feeds the level in at the inner edge and moves everything on by dt;
  // `bands` then says, for each band: u (0 inner to 1 outer), radius (planet radii, with the
  // blast's swell), level (what it is replaying, 0 to 1), lift (how far it is raised off the
  // disc, 0 to 1), show (how much of it is there) and shock (the blast passing, 1 to 0).
  //
  // A blast and a refill are told to step() with how long before the end of this step they
  // happened: blastAgo starts a blast at the inner edge, which lights each band up as it reaches
  // it and then thins it; refillAgo starts the rings filling back in from the inner edge (it
  // does nothing unless a blast has thinned them). Counting from the moment itself, not from the
  // frame it was noticed in, keeps the rings the same at any frame rate.
  function createRings() {
    const bands = Array.from({ length: BANDS }, (_, i) => ({ u: (i + 0.5) / BANDS, radius: 0, level: 0, lift: 0, show: 1, shock: 0 }));
    const echo = createEcho(TRAVEL_S);
    let clock = 0, blastAt = -Infinity, blastBefore = -Infinity, refillAt = -Infinity, thin = false;

    // How far through its swell a band is, 0 to 1, for a blast that began at `from`.
    const swellOf = (from, u) => clamp01((clock - from - SHOCK_S * u) / SWELL_S);

    function step({ dt, level, flow, blastAgo, refillAgo }) {
      clock += dt;
      if (blastAgo !== undefined) { blastBefore = blastAt; blastAt = clock - blastAgo; thin = true; }
      if (refillAgo !== undefined && thin) { thin = false; refillAt = clock - refillAgo; }
      echo.note(clock, clamp01(level));
      const out = outer(flow);
      for (const b of bands) {
        // Thinning or filling starts for each band when the front reaches it; only the part of
        // this frame after that moment counts.
        const part = Math.max(0, Math.min(dt, thin ? clock - blastAt - SHOCK_S * b.u : clock - refillAt - FILL_S * b.u));
        if (part > 0) b.show = follow(b.show, thin ? GHOST : 1, part, thin ? THIN_S : FILL_UP_S);
        // The swell and the flare of the blast passing. A band still swollen from the blast
        // before keeps the larger of the two, so a second blast cannot spring it back at once.
        const sw = swellOf(blastAt, b.u), was = swellOf(blastBefore, b.u);
        b.shock = Math.max(sw > 0 && sw < 1 ? 1 - sw : 0, was > 0 && was < 1 ? 1 - was : 0);
        b.level = clamp01(echo.heard(clock, b.u * TRAVEL_S) + b.shock);
        b.lift = b.level * (0.4 + 0.6 * b.u);
        b.radius = (INNER + b.u * (out - INNER)) * (1 + SWELL * Math.max(Math.sin(Math.PI * sw), Math.sin(Math.PI * was)));
      }
    }

    return {
      bands,
      step,
      // Whole again at once, as when the effect starts over.
      reset() { blastAt = -Infinity; blastBefore = -Infinity; refillAt = -Infinity; thin = false; for (const b of bands) { b.show = 1; b.shock = 0; } },
    };
  }

  // Cuts a planet's disc of radius R into `pieces` chunks along straight cracks: the largest chunk
  // left is always the next to split, across its longest reach, so no chunk ends up a splinter.
  // Each chunk is { pts (its corners, round the planet's centre), cx, cy (its middle), rm (how
  // far its middle is from the planet's) }.
  function crack(R, pieces, random) {
    const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; s += p[i][0] * q[1] - q[0] * p[i][1]; } return Math.abs(s) / 2; };
    // A chunk's middle is its centre of area, not the average of its corners: a chunk on the rim
    // has many corners along its curved side, which would drag an average toward the rim.
    const middle = (p) => {
      let x = 0, y = 0, s = 0;
      for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length], k = p[i][0] * q[1] - q[0] * p[i][1]; x += (p[i][0] + q[0]) * k; y += (p[i][1] + q[1]) * k; s += k; }
      return [x / (3 * s), y / (3 * s)];
    };
    let polys = [[]];
    for (let i = 0; i < RIM; i++) polys[0].push([R * Math.cos(i / RIM * TURN), R * Math.sin(i / RIM * TURN)]);
    for (let guard = 0; polys.length < pieces && guard < 20 * pieces; guard++) {
      let big = 0, most = -1;
      for (let i = 0; i < polys.length; i++) { const a = area(polys[i]); if (a > most) { most = a; big = i; } }
      const p = polys[big], c = middle(p);
      let far = p[0], reachMost = 0;
      for (const v of p) { const d = Math.hypot(v[0] - c[0], v[1] - c[1]); if (d > reachMost) { reachMost = d; far = v; } }
      const ang = Math.atan2(far[1] - c[1], far[0] - c[0]) + (random() - 0.5) * CRACK_SWING, nx = Math.cos(ang), ny = Math.sin(ang);
      const off = Math.sqrt(most) * CRACK_JITTER;
      const qx = c[0] + (random() - 0.5) * off, qy = c[1] + (random() - 0.5) * off;
      const A = [], B = [];
      for (let i = 0; i < p.length; i++) {
        const v = p[i], w = p[(i + 1) % p.length];
        const dv = (v[0] - qx) * nx + (v[1] - qy) * ny, dw = (w[0] - qx) * nx + (w[1] - qy) * ny;
        (dv >= 0 ? A : B).push(v);
        if ((dv >= 0) !== (dw >= 0)) { const k = dv / (dv - dw), m = [v[0] + (w[0] - v[0]) * k, v[1] + (w[1] - v[1]) * k]; A.push(m); B.push(m); }
      }
      if (A.length < 3 || B.length < 3) continue;
      polys.splice(big, 1, A, B);
    }
    return polys.map((pts) => { const c = middle(pts); return { pts, cx: c[0], cy: c[1], rm: Math.hypot(c[0], c[1]) }; });
  }

  // How many planets a Planets setting gives.
  const planetCount = (setting) => (Number.isFinite(setting) ? Math.max(0, Math.min(MAX_PLANETS, Math.round(setting))) : DEFAULT_PLANETS);

  // The sun-and-planets system. step() moves it on by dt and returns 'flare' on the frame the sun
  // flares. `planets` then holds, for each planet: a (its orbit's radius, px), th (where it is on
  // it, 0 to 2π) and turned (how far it has gone in all, rad), k and roll (its orbit's tilt and
  // lean), axis (its own lean), x, y (its place, as an offset from the sun), z (+1 nearest, -1
  // farthest), r (its radius as drawn, px), w (its turning, rad/s), born (0 to 1, fading in or
  // out), leaving, col (a palette offset), striped and ringed.
  function createSystem({ random = Math.random } = {}) {
    let planets = [];
    let loud = 0, fast = 0, flare = 0, flares = 0, armed = 0, sinceFlare = Infinity;
    let speed = SPEED_MIN, aMax = 0, aMin = 0;

    const make = (slot) => ({
      a: 0, th: random() * TURN, turned: 0,
      k: ORBIT_K + (random() - 0.5) * ORBIT_K_SPREAD,
      roll: ORBIT_ROLL + (random() - 0.5) * ORBIT_ROLL_SPREAD,
      size0: PLANET_SIZES[slot % PLANET_SIZES.length] + (random() - 0.5) * 0.5,
      col: 0.9 + slot * 0.62 + random() * 0.25,
      axis: (random() - 0.5) * AXIS_SPREAD,
      striped: slot % 3 !== 0, ringed: slot === 3,
      born: 0, leaving: false, x: 0, y: 0, z: 0, r: 0, size: 0, w: 0,
    });

    function step({ dt, live, loud: heard, peak, threshold, count, W, H, scale }) {
      // Mic off, the sound arrays may hold anything: the planets hear silence.
      const sound = live ? heard : 0;
      loud = follow(loud, sound, dt, SYS_LOUD_S);
      fast = follow(fast, sound, dt, SYS_FAST_S);
      flare *= Math.exp(-dt / FLARE_S);
      sinceFlare += dt;
      // Only time with the mic on counts toward the next flare, so the mic opening on a loud
      // moment cannot set one off.
      let event = null;
      armed = live ? armed + dt : 0;
      if (live && peak >= threshold && armed >= FLARE_REARM_S) { armed = 0; flare = 1; flares++; sinceFlare = 0; event = 'flare'; }
      const speedWas = speed;
      speed = SPEED_MIN + SPEED_LOUD * loud + SPEED_FAST * fast + SPEED_FLARE * flare;
      const pace = event ? speed : (speedWas + speed) / 2;   // the speed over this frame: the mean of its two ends (a flare jumps at once)

      // How many there are: new ones are added outermost and fade in, extra ones (the outermost)
      // fade out where they are.
      const want = planetCount(count);
      const staying = planets.filter((p) => !p.leaving);
      while (staying.length < want) { const p = make(staying.length); planets.push(p); staying.push(p); }
      while (staying.length > want) staying.pop().leaving = true;

      // The outermost orbit is as wide as the frame allows for the most tilted orbit there is;
      // the planets that are staying are spaced from the innermost orbit out to it.
      const edge = ORBIT_EDGE * scale;
      aMax = planets.length ? Infinity : fit(W, H, edge, ORBIT_K, ORBIT_ROLL);
      for (const p of planets) aMax = Math.min(aMax, fit(W, H, edge, p.k, p.roll));
      aMin = Math.min(aMax * 0.5, ORBIT_INNER * SUN_R * scale);
      staying.forEach((p, j) => {
        const target = aMin + (aMax - aMin) * (staying.length === 1 ? 0.45 : Math.pow(j / (staying.length - 1), SPACING));
        p.a = p.a ? follow(p.a, target, dt, EASE_S) : target;
      });

      for (const p of planets) {
        // An orbit eases to a new radius, but one too wide for a frame that has just shrunk is
        // brought inside it at once.
        p.a = Math.min(p.a, fit(W, H, edge, p.k, p.roll));
        p.born = clamp01(p.born + (p.leaving ? -dt / GONE_S : dt / BORN_S));
        const rate = (TURN / LAP_S) * Math.pow(aMin / p.a, FALL);     // inner planets lap faster
        p.w = rate * speed;
        const turn = rate * pace * dt;
        p.th = (p.th + turn) % TURN;
        p.turned += turn;
        const at = place(p.a, p.th, p.k, p.roll);
        p.x = at.x; p.y = at.y; p.z = at.z;
        p.size = p.size0 * scale;
        p.r = p.size * (1 + NEAR * p.z);
      }
      planets = planets.filter((p) => !(p.leaving && p.born <= 0));
      return event;
    }

    return {
      get planets() { return planets; },
      get loud() { return loud; },
      get fast() { return fast; },
      get flare() { return flare; },
      get flares() { return flares; },
      get sinceFlare() { return sinceFlare; },
      get speed() { return speed; },
      get aMax() { return aMax; },
      get aMin() { return aMin; },
      step,
    };
  }

  // Colours: [r, g, b] in, a CSS colour out.
  const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a <= 0 ? 0 : a >= 1 ? 1 : Math.round(a * 1000) / 1000) + ')';
  const whiten = (c, k) => [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k];
  const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  // The fill of a lit sphere of radius R centred on the origin, in colour c: brightest toward
  // (lx, ly) (a direction, about half a radius long at most), darkest at the far limb. `lit`
  // (0 to 1) dims the whole lit side, for a sphere seen from its night side.
  function bodyFill(ctx, R, c, lx, ly, lit) {
    const g = ctx.createRadialGradient(lx * R, ly * R, 0.04 * R, lx * 0.28 * R, ly * 0.28 * R, 1.22 * R);
    g.addColorStop(0, rgba(whiten(c, 0.8 * lit), 1));
    g.addColorStop(0.42, rgba(shade(c, 0.45 + 0.55 * lit), 1));
    g.addColorStop(1, rgba(shade(c, 0.2), 1));
    return g;
  }

  // Cloud bands on that sphere, as the near halves of circles of latitude seen at tilt k. The
  // caller has clipped to the sphere (or a chunk of it) and turned the canvas to the planet's
  // lean. `list` is [[latitude as a sine, -1 to 1, width as a share of R, dark or light]].
  function paintBands(ctx, R, c, k, list, lit) {
    const up = Math.sqrt(1 - k * k);
    ctx.lineCap = 'butt';   // a band ends square at the planet's edge, whatever the canvas was left with
    for (const [s, wide, dark] of list) {
      const rx = R * Math.sqrt(1 - s * s);
      ctx.strokeStyle = dark ? rgba(shade(c, 0.35), 0.34) : rgba(whiten(c, 0.55), 0.22 * lit);
      ctx.lineWidth = R * wide;
      ctx.beginPath();
      ctx.ellipse(0, -R * s * up, rx, rx * k, 0, 0, Math.PI);
      ctx.stroke();
    }
  }

  globalThis.TimbrePlanets = {
    TILT, ROLL, INNER, OUTER, BANDS, TRAVEL_S, GHOST, PIECES,
    SUN_R, ORBIT_K, ORBIT_ROLL,
    place, reach, fit, createEcho, ringRest, outer, gain, createRings, crack,
    planetCount, createSystem,
    rgba, whiten, shade, bodyFill, paintBands,
  };
})();
