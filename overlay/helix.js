// Timbre — helix arithmetic, the plain numbers behind the dna effect. It holds
// the three sound levels the helix follows (loudness, low, high), the other
// levels and the bar spread that effects tuned before the log bands read the
// sound through (see "The re-mapped readers" below), the rule that
// turns Shatter Sensitivity into a peak threshold, a smoothing helper, the
// return curve, a seedable random source, and the shatter machine: whole, in
// pieces or returning, with its timers and the motion of the pieces. The
// effect in factories/dna.js cuts the pieces and draws them; nothing here draws.
//
// All timing comes from the caller's step({ now, dt }) (now in milliseconds, dt
// in seconds), never from counting frames or reading the clock, so the same
// sound changes state at the same moments at any frame rate. All randomness
// comes from the random() the machine is created with, so tests can seed it.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreHelix`), like afterglow.js, so verify.mjs can import it
// under Node. Nothing here may touch document, window, ctx or core.js globals.

(function () {
  'use strict';

  const RETURN_S = 1.5;      // how long the return takes
  const MIN_CALM_S = 0.3;    // the shortest calm wait before the return, whatever Reconnect Seconds says
  const REARM_S = 0.4;       // how long the helix must have been whole, with the mic on, before it can shatter
  const JOSTLE_GAP_S = 0.6;  // the shortest time between two pushes while in pieces
  // A step this long after the one before means the page stopped drawing (the
  // source was hidden); the helix drops its pieces and resumes whole.
  const GAP_MS = 1000;

  // Push strengths: the shatter, a peak during the return, a peak while in pieces.
  const BLAST = 1;
  const REBLAST = 0.7;
  const JOSTLE = 0.4;

  // Motion of the pieces. Every distance and speed is multiplied by the page's scale.
  const SPEED_MIN = 30, SPEED_RANGE = 90;  // push speed, px/s, also × strength
  const SCATTER_Y = 44, SCATTER_X = 34;    // jitter on the outward direction, px
  const ALONG = 0.25;                      // how far along the axis a piece is turns its push sideways
  const SPIN = 9;                          // push spin, rad/s × strength, either way
  const SLOW_S = 0.38;                     // push velocity and spin decay time constant
  const DRIFT_MIN = 2, DRIFT_RANGE = 4;    // lasting drift along the push direction, px/s
  const DRIFT_SPIN = 0.7;                  // lasting spin, rad/s, either way
  const HEAT_S = 0.35;                     // heat decay time constant
  const MARGIN = 8;                        // px in from each edge that the pieces are kept inside
  const BACK_S = 0.3;                      // easing back to the margin
  const BRAKE_S = 0.08;                    // braking a piece still heading out past the margin

  // The return curve: an eased drift most of the way home, then a snap.
  const HANDOVER_U = 0.78;  // share of the return spent drifting
  const HANDOVER_E = 0.72;  // share of the way home covered by then

  const TURN = 2 * Math.PI;

  // The peak level a shatter needs, from Shatter Sensitivity (0 to 100).
  function threshold(sensitivity) {
    const s = sensitivity;
    if (!(s > 0)) return Infinity;
    if (s <= 1) return 1;
    if (s <= 50) return 1 - 0.1 * (s - 1) / 49;
    return 0.9 - 0.4 * (Math.min(s, 100) - 50) / 50;
  }

  // The largest distance of any waveform sample from the centre line, 0 to 1.
  function peakOf(samples) {
    if (!samples || !samples.length) return 0;
    let most = 0;
    for (let i = 0; i < samples.length; i++) {
      const d = Math.abs(samples[i] - 128);
      if (d > most) most = d;
    }
    return Math.min(1, most / 127);
  }

  const clamp01 = (v) => (v > 1 ? 1 : v > 0 ? v : 0);

  // ── The re-mapped readers ────────────────────────────────────────────────
  // `frequencies` used to be 32 values 750 Hz apart, and effects read them by position
  // ("low" was values 0 and 1, "bass" values 0 to 3). It is now 32 log-spaced bands from
  // 60 Hz to 12 kHz (audio-capture.js), so those positions mean something else. The levels
  // below stand in for what the positions gave. Each is a weighted sum of the sampler's
  // three wide bands (micBands.bass, .mid and .treble), with the weights fitted on recorded
  // sound (a voice at 150 Hz and one at 220 Hz, a kick with a hi-hat, a band) so that each
  // lands within a tenth of its old level, in the mean, on every one of them
  // (tools/compare-input.mjs measures it). Before Gain, not clamped.
  //   low   was the mean of values 0-1 × 1.3 (levels() below: the helix and eight more effects)
  //   high  was the mean of values 2-10 × 3  (levels() below)
  //   bass  was the mean of values 0-3       (galaxy-ripple, matrix, peaks-mirror, winter-aurora, the flag, sunburst)
  //   all   was the mean of all 32 values    (matrix, tunnel, vaporwave)
  const HEARD = { low: [1.22, 0.74, 0], high: [0, 0.96, 1.44], bass: [0.47, 0.42, 0.56], all: [0.13, 0.03, 0.89] };
  // The three wide bands as band numbers (first, one past the last): audio-capture.js's BASS, MID and TREBLE.
  const WIDE = { bass: [0, 9], mid: [9, 25], treble: [25, 32] };

  // The mean of values[from] to values[to - 1], as 0 to 1 (the values are 0 to 255).
  function bandMean(values, from, to) {
    if (!values) return 0;
    const end = Math.min(to, values.length);
    if (!(end > from)) return 0;
    let sum = 0;
    for (let i = from; i < end; i++) sum += values[i] || 0;
    return sum / ((end - from) * 255);
  }

  // The three wide bands of the 32 log bands, each 0 to 1: what the sampler publishes as
  // micBands.bass, .mid and .treble, for a reader that is handed `frequencies` and no more.
  function wide(bands) {
    return { bass: bandMean(bands, WIDE.bass[0], WIDE.bass[1]), mid: bandMean(bands, WIDE.mid[0], WIDE.mid[1]), treble: bandMean(bands, WIDE.treble[0], WIDE.treble[1]) };
  }

  // One of the levels above ('low', 'high', 'bass', 'all') from micBands, or from wide().
  function heard(which, bands) {
    const w = HEARD[which];
    if (!w || !bands) return 0;
    const v = w[0] * bands.bass + w[1] * bands.mid + w[2] * bands.treble;
    return Number.isFinite(v) ? v : 0;
  }

  // The bar spread. An effect with `count` bars (or spokes, columns, rails) lays them over
  // all `n` bands: bar i reads the bands from i × n / count to the next bar's first, so 20
  // bars cover 60 Hz to 12 kHz and no band is left out. With more bars than bands each bar
  // reads the one band it falls in. spreadRange gives the bands (first, one past the last);
  // spread gives their mean, on the values' own 0-255 scale.
  function spreadRange(i, count, n) {
    const from = Math.floor(i * n / count);
    return [from, Math.max(from + 1, Math.floor((i + 1) * n / count))];
  }
  function spread(values, i, count) {
    if (!values || !values.length || !(i >= 0) || !(i < count)) return 0;
    const range = spreadRange(i, count, values.length), end = Math.min(range[1], values.length);
    let sum = 0;
    for (let k = range[0]; k < end; k++) sum += values[k];
    return end > range[0] ? sum / (end - range[0]) : 0;
  }

  // Loudness (twist and glow), low (strand A's width) and high (strand B's
  // width), each 0 to 1, from the shared sound arrays and Gain as a multiplier.
  // `frequencies` is the 32 log bands; low and high are heard() of their wide bands.
  function levels(frequencies, waveform, gain) {
    const bands = frequencies ? wide(frequencies) : null;
    return {
      loud: waveform ? clamp01(peakOf(waveform) * 1.5 * gain) : 0,
      low: bands ? clamp01(heard('low', bands) * gain) : 0,
      high: bands ? clamp01(heard('high', bands) * gain) : 0,
    };
  }

  // Radians per second the helix turns at a loudness.
  const twist = (loud) => 0.7 + 5.8 * loud;
  // A strand's radius at a level, px before the page's scale.
  const radius = (level) => 12 + 22 * level;

  // One step of exponential smoothing toward target with time constant tau,
  // the same at any frame rate.
  function follow(current, target, dt, tau) {
    if (!(tau > 0)) return target;
    return current + (target - current) * (1 - Math.exp(-dt / tau));
  }

  const ease = (t) => t * t * (3 - 2 * t);

  // Where a piece is u (0 to 1) of the way through the return: e is its share
  // of the way home, heat how white it glows. A lag below 1 finishes the
  // eased drift early, so the pieces do not move as one block.
  function returnShare(u, lag) {
    if (u < HANDOVER_U) {
      return { e: HANDOVER_E * ease(Math.max(0, Math.min(1, u / (HANDOVER_U * lag)))), heat: 0 };
    }
    const v = Math.min(1, (u - HANDOVER_U) / 0.22), v3 = v * v * v;
    return { e: HANDOVER_E + 0.28 * v3, heat: 0.8 * v3 };
  }

  // A repeatable generator, 0 to 1, for a finite seed; Math.random otherwise.
  // The same generator verify-render.mjs seeds its scenes with.
  function rng(seed) {
    if (!Number.isFinite(seed)) return Math.random;
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // The same angle, within half a turn of 0, so the return turns the short way round.
  const shortWay = (a) => a - TURN * Math.round(a / TURN);

  // `aim`, when given, says which way a blast pushes each piece: aim(x, y, W, H, scale, random)
  // returns the angle for the piece now at (x, y). Without it a blast pushes away from the
  // frame's long axis, as the helix needs. A jostle is random either way.
  function createShatter({ random = Math.random, aim } = {}) {
    let state = 'whole';
    let pieces = null;   // the array cut() returned, while not whole
    let motion = null;   // per piece: push velocity and spin, lasting drift, where its return started, its lag
    let wholeS = 0;      // time whole with the mic on, s
    let calmS = 0;       // time since the last peak, s
    let sinceBlastS = 0; // time since the last blast or jostle, s
    let u = 0;           // progress through the return, 0 to 1
    let lastNow, lastW, lastH;

    function reset() {
      state = 'whole';
      pieces = null;
      motion = null;
      wholeS = 0;
      calmS = 0;
      sinceBlastS = 0;
      u = 0;
    }

    // Pushes every piece from where it is now. A blast pushes it away from the
    // axis; a jostle pushes it in a random direction, because outward pushes
    // repeated through a long yell would pin every piece to the top and bottom.
    function push(strength, W, H, scale) {
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i], m = motion[i];
        const x = p.cx + p.ox, y = p.cy + p.oy;
        const a = strength === JOSTLE
          ? random() * TURN
          : aim ? aim(x, y, W, H, scale, random)
          : Math.atan2((y - H / 2) + (random() - 0.5) * SCATTER_Y * scale, (x - W / 2) * ALONG + (random() - 0.5) * SCATTER_X * scale);
        const c = Math.cos(a), s = Math.sin(a);
        const speed = (SPEED_MIN + SPEED_RANGE * random()) * scale * strength;
        m.vx += speed * c;
        m.vy += speed * s;
        m.spin += (random() - 0.5) * SPIN * strength;
        const drift = (DRIFT_MIN + DRIFT_RANGE * random()) * scale;
        m.dx = drift * c;
        m.dy = drift * s;
        m.dspin = (random() - 0.5) * DRIFT_SPIN;
        p.heat = 1;
      }
      sinceBlastS = 0;
    }

    // One frame of flight while in pieces: the push slows, the drift carries
    // on, the heat cools, and a piece past the margin is brought back inside.
    function move(dt, W, H, scale) {
      const keep = Math.exp(-dt / SLOW_S);
      const travel = SLOW_S * (1 - keep);  // exact distance per unit of decaying speed over dt
      const cool = Math.exp(-dt / HEAT_S);
      const back = 1 - Math.exp(-dt / BACK_S);
      const brake = Math.exp(-dt / BRAKE_S);
      const margin = MARGIN * scale;
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i], m = motion[i];
        p.ox += m.vx * travel + m.dx * dt;
        p.oy += m.vy * travel + m.dy * dt;
        p.rot += m.spin * travel + m.dspin * dt;
        m.vx *= keep;
        m.vy *= keep;
        m.spin *= keep;
        p.heat *= cool;

        const x = p.cx + p.ox, y = p.cy + p.oy;
        if (x < margin) {
          p.ox += (margin - x) * back;
          m.dx = Math.abs(m.dx);
          if (m.vx < 0) m.vx *= brake;
        } else if (x > W - margin) {
          p.ox -= (x - (W - margin)) * back;
          m.dx = -Math.abs(m.dx);
          if (m.vx > 0) m.vx *= brake;
        }
        if (y < margin) {
          p.oy += (margin - y) * back;
          m.dy = Math.abs(m.dy);
          if (m.vy < 0) m.vy *= brake;
        } else if (y > H - margin) {
          p.oy -= (y - (H - margin)) * back;
          m.dy = -Math.abs(m.dy);
          if (m.vy > 0) m.vy *= brake;
        }
      }
    }

    // The return begins from wherever the pieces are; from here the curve
    // places them, so their push velocity is spent.
    function startReturn() {
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i], m = motion[i];
        m.fromX = p.ox;
        m.fromY = p.oy;
        m.fromRot = shortWay(p.rot);
        m.lag = 0.6 + 0.4 * random();
        m.vx = 0;
        m.vy = 0;
        m.spin = 0;
      }
      u = 0;
      state = 'returning';
    }

    function place(dt) {
      const cool = Math.exp(-dt / HEAT_S);
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i], m = motion[i];
        const r = returnShare(u, m.lag);
        p.ox = m.fromX * (1 - r.e);
        p.oy = m.fromY * (1 - r.e);
        p.rot = m.fromRot * (1 - r.e);
        p.heat = Math.max(p.heat * cool, r.heat);
      }
    }

    function step({ now, dt, live, peak, threshold, reconnectS, W, H, scale, cut }) {
      const jumped = lastNow !== undefined && (W !== lastW || H !== lastH || now - lastNow > GAP_MS);
      lastNow = now;
      lastW = W;
      lastH = H;
      if (state !== 'whole' && jumped) {
        reset();
        return 'reset';
      }

      const isPeak = !!live && peak >= threshold;

      if (state === 'whole') {
        // Only time whole with the mic on counts, so a transient as the mic opens (a reload, a
        // device switch) cannot shatter the helix at once.
        wholeS = live ? wholeS + dt : 0;
        if (!isPeak || wholeS < REARM_S) return null;
        const cutPieces = cut();
        if (!cutPieces || !cutPieces.length) return null;
        pieces = cutPieces;
        motion = pieces.map(() => ({ vx: 0, vy: 0, spin: 0, dx: 0, dy: 0, dspin: 0, fromX: 0, fromY: 0, fromRot: 0, lag: 1 }));
        for (const p of pieces) {
          p.ox = 0;
          p.oy = 0;
          p.rot = 0;
          p.heat = 0;
        }
        push(BLAST, W, H, scale);
        calmS = 0;
        state = 'pieces';
        return 'shatter';
      }

      if (state === 'pieces') {
        let event = null;
        sinceBlastS += dt;
        if (isPeak) {
          calmS = 0;
          if (sinceBlastS >= JOSTLE_GAP_S) {
            push(JOSTLE, W, H, scale);
            event = 'jostle';
          }
        } else {
          calmS += dt;
        }
        move(dt, W, H, scale);
        const wait = reconnectS > MIN_CALM_S ? reconnectS : MIN_CALM_S;
        if (calmS >= wait) {
          startReturn();
          return 'return';
        }
        return event;
      }

      // Returning.
      if (isPeak) {
        push(REBLAST, W, H, scale);
        calmS = 0;
        state = 'pieces';
        return 'jostle';
      }
      u += dt / RETURN_S;
      if (u >= 1) {
        pieces = null;
        motion = null;
        state = 'whole';
        wholeS = 0;
        return 'whole';
      }
      place(dt);
      return null;
    }

    return {
      get state() { return state; },
      get pieces() { return pieces; },
      step,
      reset,
    };
  }

  globalThis.TimbreHelix = {
    RETURN_S, HANDOVER_U, MIN_CALM_S, REARM_S, JOSTLE_GAP_S, GAP_MS,
    HEARD, WIDE,
    threshold, peakOf, levels, bandMean, wide, heard, spreadRange, spread, twist, radius, follow, returnShare, rng, createShatter,
  };
})();
