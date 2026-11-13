// Timbre — infall, what falls into the Black Hole effect. It holds how often things arrive and
// how many there may be, where each one starts, the spiral that carries it in (slow far out,
// faster and faster close to the hole), the places it remembers for its trail, the moment the
// hole swallows it (after which its trail drains in behind it), and the gate that decides when a
// peak makes the hole gulp. The effect in
// factories/black-hole.js reads the sound and draws; nothing here draws.
//
// All timing comes from the caller (dt in seconds), never from counting frames or reading the
// clock, so the same sound gives the same infall at any frame rate. Lengths are in canvas pixels;
// `scale` is the page's SCALE. A thing's place is an offset from the middle of the frame.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns `globalThis.TimbreInfall`),
// like helix.js, so verify.mjs can import it under Node. It uses TimbrePlanets.place and reach
// (planets.js must be loaded first) and nothing else: no document, window, ctx or core.js globals.

(function () {
  'use strict';

  const TURN = 2 * Math.PI;
  const HOLE_R = 12;                         // × scale: the hole's radius at rest
  const END = 1.12;                          // in hole radii: inside this a thing is gone
  const K_MIN = 0.28, K_RANGE = 0.24;        // how flat each thing's own circle looks
  const ROLL = -0.2, ROLL_SPREAD = 0.5;      // how far it leans, rad, and how much circles differ
  const START_PAD = 10, START_SPREAD = 0.2;  // a thing starts at least this far (× scale) beyond the frame, or up to a fifth farther out
  const STREAKS = 0.5, COMETS = 0.22;        // shares of what arrives; the rest are fireflies
  const SIZE = { streak: [0.8, 0.5], comet: [1.5, 0.9], firefly: [1.0, 0.7] };   // × scale: the least, and the range above it
  const TRAIL = { streak: 0.45, comet: 0.6, firefly: 0.16 };                    // seconds of flight each kind's trail holds
  const NOTE_S = 1 / 30;                     // how often a thing's place is remembered for its trail
  const BORN_S = 0.5;                        // a thing fading in
  const WHIRL = 1.6, WHIRL_AT = 4, WHIRL_MAX = 14;   // turning, rad/s, at 4 hole radii when the whirl is 1; and the most
  const DRIFT = 0.26;                        // the share of its radius a thing loses a second, per unit of pull
  const PLUNGE = 2.2, PLUNGE_AT = 2;         // and the extra close in: at full strength inside 2 hole radii
  const PULL_MIN = 0.45, PULL_LOUD = 1.9, PULL_FAST = 0.8, PULL_GULP = 25;
  const PULL_CAP = 4;                        // the whirl and the plunge stop growing with the pull here
  const ARRIVE = 1.3, ARRIVE_LOUD = 10;      // things a second: silent, and added at full loudness
  const KICK = 3, KICK_FAST = 5;             // a syllable starting throws in this many, plus this many at full loudness
  const ONSET = 0.12, ONSET_GAP_S = 0.15;    // a syllable starts when the fast loudness stands this far above the slow; at most this often
  const LOUD_S = 0.25, FAST_S = 0.045;       // the slow loudness and the fast one
  const FEED_S = 0.3, FEED_COMET = 0.3, FEED_OTHER = 0.14;   // the rim's flare when it swallows something
  const GULP_S = 0.3, REARM_S = 1.5;         // a gulp's fading, and the shortest time between two, counted with the mic on
  const JET_AFTER_S = 0.22, JET_S = 0.3;     // the jets fire this long after a gulp, and fade (gone within about a second)
  const SPIN_MIN = 0.5, SPIN_LOUD = 1.6, SPIN_GULP = 3;      // the gas turning, rad/s
  const MOST_MIN = 30, MOST_RANGE = 70;      // the most there can be: at Density 0, and added at 100
  const RATE_MIN = 0.4, RATE_RANGE = 1.2;    // how often things arrive, as a multiple: at Density 0, and added at 100

  const clamp01 = (v) => (v > 1 ? 1 : v > 0 ? v : 0);
  const follow = (current, target, dt, tau) => current + (target - current) * (1 - Math.exp(-dt / tau));
  const share = (density) => (Number.isFinite(density) ? clamp01(density / 100) : 0.5);
  const most = (density) => Math.round(MOST_MIN + MOST_RANGE * share(density));
  const rate = (density) => RATE_MIN + RATE_RANGE * share(density);

  // What is falling in. step() moves everything on by dt and returns 'gulp' on the frame the hole
  // gulps. `things` then holds, for each: kind ('streak', 'comet' or 'firefly'), r (how far from
  // the hole, px), th (its angle) and turned (how far round it has gone in all), k and roll (its
  // circle's tilt and lean), x, y (its place, as an offset from the hole), z (+1 nearest, -1
  // farthest), near (0 far out to 1 at the rim), born (0 to 1, fading in), size (px), col (a
  // palette offset), blink and beat (a firefly's rhythm), and hist (the places it remembers,
  // oldest first, each { x, y, z, t }). A thing the hole has swallowed stays listed for as long
  // as its trail holds, with sunk set and fade falling from 1 to 0: it no longer moves, and its
  // trail drains in after it. It does not count toward how many there may be.
  function createInfall({ random = Math.random } = {}) {
    let things = [];
    let clock = 0, loud = 0, fast = 0, feed = 0, gulp = 0, jet = 0, jetIn = 0, spin = 0, pull = PULL_MIN;
    let debt = 0, sinceKick = Infinity, armed = 0, sinceGulp = Infinity, eaten = 0, gulps = 0;

    function make(W, H, scale) {
      const P = globalThis.TimbrePlanets;
      const pick = random(), kind = pick < STREAKS ? 'streak' : pick < STREAKS + COMETS ? 'comet' : 'firefly';
      const k = K_MIN + K_RANGE * random(), roll = ROLL + (random() - 0.5) * ROLL_SPREAD;
      const farther = 1 + START_SPREAD * random(), th = random() * TURN;
      // Far enough out that its circle reaches beyond the frame's sides, and that the thing
      // itself, wherever on that circle it starts, is beyond the frame: past a side, or past the
      // top or the bottom.
      const pad = START_PAD * scale, way = P.place(1, th, k, roll);
      const out = Math.min((W / 2 + pad) / Math.abs(way.x), (H / 2 + pad) / Math.abs(way.y));
      return {
        kind, k, roll,
        r: Math.max((W / 2 + pad) / P.reach(k, roll).x, out) * farther,
        th, turned: 0,
        col: random() * 2.4,
        size: (SIZE[kind][0] + SIZE[kind][1] * random()) * scale,
        blink: random() * TURN, beat: 2 + 4 * random(),
        born: 0, near: 0, fade: 1, x: 0, y: 0, z: 0, note: 0, hist: [], sunk: false, sunkAt: 0, gone: false,
      };
    }

    function step({ dt, live, loud: heard, peak, threshold, density, W, H, scale }) {
      const P = globalThis.TimbrePlanets;
      clock += dt;
      sinceKick += dt;
      sinceGulp += dt;
      // Mic off, the sound arrays may hold anything: the hole hears silence.
      const sound = live ? heard : 0;
      loud = follow(loud, sound, dt, LOUD_S);
      fast = follow(fast, sound, dt, FAST_S);
      feed *= Math.exp(-dt / FEED_S);
      // The gulp over this frame, on average: it has been fading since the frame began.
      const gulpOver = dt > 0 ? gulp * (GULP_S / dt) * (1 - Math.exp(-dt / GULP_S)) : gulp;
      gulp *= Math.exp(-dt / GULP_S);
      jet *= Math.exp(-dt / JET_S);
      // The jets fire part of the way through a frame: they have already faded for the rest of it.
      if (jetIn > 0) { jetIn -= dt; if (jetIn <= 0) jet = Math.exp(jetIn / JET_S); }

      // A hard peak makes the hole gulp. Only time with the mic on counts toward the next one, so
      // the mic opening on a loud moment cannot set one off. (Frames add up to a hair under the
      // wait, hence the allowance.) A gulp begins at this frame's end: it pulls from the next
      // frame on, so it is as strong however long the frame.
      let event = null;
      armed = live ? armed + dt : 0;
      if (live && peak >= threshold && armed >= REARM_S - 1e-9) { armed = 0; gulp = 1; gulps++; sinceGulp = 0; jetIn = JET_AFTER_S; event = 'gulp'; }

      pull = PULL_MIN + PULL_LOUD * loud + PULL_FAST * fast + PULL_GULP * gulp;                  // as it stands now
      const drive = PULL_MIN + PULL_LOUD * loud + PULL_FAST * fast + PULL_GULP * gulpOver;     // as it was over this frame
      const strength = Math.min(drive, PULL_CAP), whirl = 0.6 + 0.5 * strength;
      spin += dt * (SPIN_MIN + SPIN_LOUD * loud + SPIN_GULP * gulpOver);

      // New things are drawn in: a trickle when silent, a stream when loud, a handful when a
      // syllable starts. When the frame is full, what would have come is dropped, not saved up.
      const often = rate(density), limit = most(density);
      let falling = 0;
      for (const o of things) if (!o.sunk) falling++;
      debt += dt * (ARRIVE + ARRIVE_LOUD * loud) * often;
      if (live && fast - loud > ONSET && sinceKick > ONSET_GAP_S) { sinceKick = 0; debt += (KICK + KICK_FAST * fast) * often; }
      while (debt >= 1) {
        if (falling >= limit) { debt = Math.min(debt, 1); break; }
        debt -= 1;
        falling++;
        things.push(make(W, H, scale));
      }

      // Everything spirals in. The radius shrinks by a share of itself, so no frame however long
      // can carry a thing past the hole.
      const rh = HOLE_R * scale;
      let kept = 0;
      for (const o of things) {
        if (o.sunk) {
          // Swallowed: it stays where it went in while its trail drains in after it.
          while (o.hist.length > 1 && clock - o.hist[0].t > TRAIL[o.kind]) o.hist.shift();
          o.fade = 1 - (clock - o.sunkAt) / TRAIL[o.kind];
          if (o.fade > 0) things[kept++] = o;
          continue;
        }
        o.born = Math.min(1, o.born + dt / BORN_S);
        const turn = Math.min(WHIRL_MAX, WHIRL * Math.pow(WHIRL_AT * rh / o.r, 1.5) * whirl) * dt;
        o.th = (o.th + turn) % TURN;
        o.turned += turn;
        const close = Math.min(1, PLUNGE_AT * rh / o.r);
        o.r *= Math.exp(-dt * (DRIFT * drive + PLUNGE * close * close * close * (0.5 + 0.5 * strength)));
        const at = P.place(o.r, o.th, o.k, o.roll);
        o.x = at.x; o.y = at.y; o.z = at.z;
        o.near = clamp01(1 - (o.r - 1.2 * rh) / (5 * rh));
        o.note += dt;
        const sinks = o.r < END * rh;
        if (o.note >= NOTE_S || !o.hist.length || sinks) { o.note = 0; o.hist.push({ x: o.x, y: o.y, z: o.z, t: clock }); }
        while (o.hist.length > 1 && clock - o.hist[0].t > TRAIL[o.kind]) o.hist.shift();
        if (sinks) { o.sunk = true; o.sunkAt = clock; eaten++; feed += o.kind === 'comet' ? FEED_COMET : FEED_OTHER; }
        things[kept++] = o;
      }
      things.length = kept;
      return event;
    }

    return {
      get things() { return things; },
      get clock() { return clock; },
      get loud() { return loud; },
      get fast() { return fast; },
      get pull() { return pull; },
      get feed() { return feed; },
      get gulp() { return gulp; },
      get jet() { return jet; },
      get spin() { return spin; },
      get sinceGulp() { return sinceGulp; },
      get eaten() { return eaten; },
      get gulps() { return gulps; },
      step,
    };
  }

  globalThis.TimbreInfall = { HOLE_R, END, TRAIL, NOTE_S, most, rate, createInfall };
})();
