// Timbre — fireflies swarm, the plain numbers behind the fireflies effect. It
// holds the swarm itself: where each firefly is and where it is heading, the
// charge that makes it flash, the unseen ripples a flash sends out, the burst a
// syllable sets off, and the startle on a hard peak. The effect in
// factories/fireflies.js reads the sound and draws; nothing here draws.
//
// All timing comes from the caller's step({ dt }) (seconds), never from counting
// frames or reading the clock, so the same sound gives the same rhythm at any
// frame rate. All randomness comes from the random() the swarm is created with,
// so tests can seed it. Lengths are in canvas pixels; `scale` is the page's SCALE.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreSwarm`), like helix.js, so verify.mjs can import it under
// Node. Nothing here may touch document, window, ctx or core.js globals.

(function () {
  'use strict';

  const MARGIN = 14;                         // × scale: inside this distance of an edge a firefly turns back
  const HOLD = 2;                            // px: no firefly gets nearer an edge than this
  const TRAIL_S = 0.4;                       // how much of its flight a firefly remembers, for its streak
  const TRAIL_STEP_S = TRAIL_S / 8;          // it notes where it is this often, whatever the frame rate
  const RISE_S = 0.035, FADE_S = 0.32;       // a flash: quick up, slow down
  const BORN_S = 0.8, GONE_S = 0.5;          // a new firefly fading in, an extra one fading out
  const PERIOD_MIN = 5, PERIOD_RANGE = 6;    // seconds between a firefly's own blinks when it is quiet
  const RATE = 3;                            // full loudness blinks 1 + this times as often
  const ONSET = 0.12, ONSET_GAP_S = 0.12;    // a syllable: the fast level this far over the slow one; shortest gap
  const KICK = 0.08, KICK_LOUD = 0.3;        // the charge a syllable gives, plus this × the fast level, × a random share
  const PUSH = 0.2;                          // the charge a full-strength ripple gives at its start, × sync
  const REST_S = 0.5;                        // after flashing a firefly ignores ripples for this long
  const NUDGED_S = 0.15;                     // a flash this soon after a ripple's nudge counts as set off by it
  const DECAY = 0.5;                         // a set-off flash's ripple has this share of the strength
  const MIN_WAVE = 0.2;                      // below this strength a flash sends no ripple
  const MAX_WAVES = 40;
  const WAVE_SPEED = 0.9;                    // a ripple crosses this share of the frame's width a second
  const WAVE_S = 0.55;                       // how long a ripple lasts
  const SCATTER_S = 0.45;                    // the startle's push dies away over this
  const SCATTER_MIN = 0.35, SCATTER_RANGE = 0.45;   // share of the way to the edge margin a startle pushes
  const REARM_S = 1.0;                       // the shortest time between two startles, counted with the mic on
  const LOUD_S = 0.25, FAST_S = 0.04;        // the slow and the fast copies of the loudness
  const SYNC_UP_S = 0.8, SYNC_DOWN_S = 1.5;  // how long the voice has been going: rises and falls this slowly

  const TURN = 2 * Math.PI;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const follow = (cur, want, dt, tau) => cur + (want - cur) * (1 - Math.exp(-dt / tau));
  const shortWay = (a) => a - TURN * Math.round(a / TURN);

  // How many fireflies a Density of 0 to 100 gives.
  function count(density) {
    const d = Number.isFinite(density) ? Math.max(0, Math.min(100, density)) : 50;
    return Math.round(10 + 0.5 * d);
  }

  function createSwarm({ random = Math.random } = {}) {
    let flies = [], waves = [];
    let clock = 0, loud = 0, fast = 0, sync = 0;
    let sinceKick = 1, armed = 0, flashes = 0, startles = 0;
    let lastW = 0, lastH = 0;

    function make(W, H, scale) {
      const m = MARGIN * scale, r = random;
      return {
        x: m + r() * Math.max(1, W - 2 * m), y: m + r() * Math.max(1, H - 2 * m),
        z: r(),                                 // depth: 0 far, 1 near
        heading: r() * TURN,
        wA: 0.5 + 0.9 * r(), fA: 0.3 + 0.5 * r(), pA: r() * TURN,   // two slow wobbles steer it
        wB: 0.3 + 0.6 * r(), fB: 0.9 + 0.9 * r(), pB: r() * TURN,
        period: PERIOD_MIN + PERIOD_RANGE * r(),
        charge: r(), rest: 0,
        lit: 10, power: 0.55, env: 0,           // seconds since its last flash, that flash's power, its brightness now
        nudged: 0, nudgeStrength: 0,
        kx: 0, ky: 0,                           // the startle's push, px/s
        col: r() * 1.2,                         // palette offset
        born: 0, leaving: false,
        hist: [],                               // where it has just been: { x, y, t }, t on the swarm's clock
      };
    }

    // A flash a firefly starts itself sends out a full-strength ripple; one a ripple set off sends a weaker one.
    function fire(f, power) {
      const strength = f.nudged > 0 ? f.nudgeStrength * DECAY : 1;
      f.lit = 0; f.charge = 0; f.rest = REST_S; f.power = power; f.nudged = 0; f.nudgeStrength = 0;
      flashes++;
      if (strength >= MIN_WAVE && waves.length < MAX_WAVES) waves.push({ x: f.x, y: f.y, age: 0, by: f, strength, done: new Set() });
    }

    function step({ dt, live, loud: level, peak, threshold, density, W, H, scale }) {
      dt = dt > 0 ? dt : 0;
      // The box changed size: everyone keeps their relative place, and nothing drawn in the old frame is kept.
      if (lastW && (W !== lastW || H !== lastH)) {
        for (const f of flies) { f.x *= W / lastW; f.y *= H / lastH; f.hist = []; f.kx = 0; f.ky = 0; }
        waves = [];
      }
      lastW = W; lastH = H;
      clock += dt; sinceKick += dt;
      const want = live && Number.isFinite(level) ? clamp01(level) : 0;
      loud = follow(loud, want, dt, LOUD_S);
      fast = follow(fast, want, dt, FAST_S);
      sync = follow(sync, want, dt, want > sync ? SYNC_UP_S : SYNC_DOWN_S);

      // How many there are follows Density: new ones fade in, extra ones fade out.
      const target = count(density);
      let staying = 0;
      for (const f of flies) if (!f.leaving) staying++;
      for (let i = flies.length - 1; i >= 0 && staying > target; i--) if (!flies[i].leaving) { flies[i].leaving = true; staying--; }
      for (let i = 0; i < flies.length && staying < target; i++) if (flies[i].leaving) { flies[i].leaving = false; staying++; }
      while (staying < target) { flies.push(make(W, H, scale)); staying++; }

      // A syllable starting gives every firefly a push toward its next flash.
      if (live && fast - loud > ONSET && sinceKick > ONSET_GAP_S) {
        sinceKick = 0;
        const kick = KICK + KICK_LOUD * fast;
        for (const f of flies) f.charge += kick * random();
      }

      // A hard peak startles the swarm: all flash, all are pushed away from the middle. The time
      // between two startles counts only with the mic on, so the mic opening on a peak cannot startle.
      let event = null;
      armed = live ? armed + dt : 0;
      if (live && peak >= threshold && armed >= REARM_S) {
        armed = 0; startles++; event = 'startle';
        const m = MARGIN * scale;
        for (const f of flies) {
          let dx = f.x - W / 2, dy = f.y - H / 2;
          const d = Math.hypot(dx, dy);
          if (d < 1) { const a = random() * TURN; dx = Math.cos(a); dy = Math.sin(a); } else { dx /= d; dy /= d; }
          const tx = dx > 0 ? (W - m - f.x) / dx : dx < 0 ? (m - f.x) / dx : Infinity;
          const ty = dy > 0 ? (H - m - f.y) / dy : dy < 0 ? (m - f.y) / dy : Infinity;
          const room = Math.max(0, Math.min(tx, ty));            // how far it can go before the edge margin
          const speed = (room * (SCATTER_MIN + SCATTER_RANGE * random())) / SCATTER_S;
          f.kx += dx * speed; f.ky += dy * speed;
          f.nudged = 0;
          fire(f, 1);
        }
        waves = [];
      }

      // Ripples spread from each flash. A firefly is nudged once by each, as its front arrives.
      const grow = WAVE_SPEED * W * dt;
      for (const w of waves) {
        const front = WAVE_SPEED * W * w.age + grow, push = PUSH * sync * w.strength * (1 - w.age / WAVE_S);
        for (const f of flies) {
          if (w.done.has(f)) continue;
          if (Math.hypot(f.x - w.x, f.y - w.y) >= front) continue;
          w.done.add(f);
          if (f === w.by || f.rest > 0 || push <= 0) continue;
          f.charge += push;
          f.nudgeStrength = f.nudged > 0 ? Math.max(f.nudgeStrength, w.strength) : w.strength;
          f.nudged = NUDGED_S;
        }
        w.age += dt;
      }
      if (waves.length) waves = waves.filter((w) => w.age < WAVE_S);

      const m = MARGIN * scale;
      const keep = Math.exp(-dt / SCATTER_S), travel = SCATTER_S * (1 - keep);   // exact distance per unit of decaying speed
      let gone = false;
      for (const f of flies) {
        if (f.leaving) { f.born = Math.max(0, f.born - dt / GONE_S); if (f.born <= 0) gone = true; }
        else f.born = Math.min(1, f.born + dt / BORN_S);

        // Its own rhythm, faster the louder the voice.
        if (f.rest > 0) f.rest -= dt;
        if (f.nudged > 0) f.nudged -= dt;
        f.charge += (dt / f.period) * (1 + RATE * loud);
        if (f.charge >= 1) fire(f, 0.55 + 0.45 * fast);

        // Wandering flight; near an edge it turns back toward the middle.
        f.heading += dt * (f.wA * Math.sin(clock * f.fA + f.pA) + f.wB * Math.sin(clock * f.fB + f.pB)) * (1 + loud);
        const edge = Math.max(0, (m - f.x) / m, (f.x - (W - m)) / m, (m - f.y) / m, (f.y - (H - m)) / m);
        if (edge > 0) f.heading += shortWay(Math.atan2(H / 2 - f.y, W / 2 - f.x) - f.heading) * Math.min(1, dt * 3 * Math.min(1.5, edge + 0.3));
        const speed = (7 + 12 * f.z) * scale * (1 + 2.2 * loud);
        f.x += Math.cos(f.heading) * speed * dt + f.kx * travel;
        f.y += Math.sin(f.heading) * speed * dt + f.ky * travel;
        f.kx *= keep; f.ky *= keep;
        f.x = Math.max(HOLD, Math.min(W - HOLD, f.x));
        f.y = Math.max(HOLD, Math.min(H - HOLD, f.y));

        // Its brightness now. Lit ones also swell with the voice as it is right now.
        f.lit += dt;
        f.env = (1 - Math.exp(-f.lit / RISE_S)) * Math.exp(-f.lit / FADE_S) * Math.min(1, f.power * (0.75 + 0.5 * fast));
        // Where it has been: a note every TRAIL_STEP_S, kept until the one after it is older than
        // TRAIL_S too, so the streak's far end can be placed exactly between two notes.
        const h = f.hist;
        if (!h.length || clock - h[h.length - 1].t >= TRAIL_STEP_S) h.push({ x: f.x, y: f.y, t: clock });
        while (h.length > 2 && clock - h[1].t > TRAIL_S) h.shift();
      }
      if (gone) flies = flies.filter((f) => !(f.leaving && f.born <= 0));
      return event;
    }

    return {
      get flies() { return flies; },
      get waves() { return waves; },
      get flashes() { return flashes; },
      get startles() { return startles; },
      get loud() { return loud; },
      get fast() { return fast; },
      get sync() { return sync; },
      get clock() { return clock; },
      step,
    };
  }

  globalThis.TimbreSwarm = { MARGIN, TRAIL_S, REARM_S, PUSH, MAX_WAVES, count, createSwarm };
})();
