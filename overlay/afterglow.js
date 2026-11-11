// Timbre — afterglow arithmetic, shared by the four bar effects and the two
// wave effects. Only pure bookkeeping lives here: the fade rule, the bar ghosts
// (what a bar's recent peaks were), the echoes (frozen copies of a wave's
// loudest moments) and a smooth curve tracer. Drawing stays in the effects.
//
// Ghosts are redrawn every frame from remembered values; nothing here fades
// the previous frame's pixels. All timing comes from the caller's draw(now, dt)
// (now in milliseconds, dt in seconds), never from counting frames.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreGlow`), like scene-kit.js, so verify.mjs can import it under
// Node. Nothing here may touch document, window, ctx or core.js globals at load
// time; trace() only uses the context it is handed.

(function () {
  'use strict';

  // Ceilings for the ghost alphas, each multiplied by the ghost's strength.
  const BAR = 0.42;       // a bar's ghost
  const BAR_TIP = 0.63;   // the brighter copy of the ghost's tip
  const ECHO = 0.6;       // an echo's stroke
  const ECHO_FILL = 0.07; // an echo's fill (waveform only)
  const MAX_ECHOES = 6;

  // Strength of a ghost aged ageSec out of a lifetime of T seconds: full for the
  // first 15%, then an ease-out square down to 0 at T.
  function fade(ageSec, T) {
    if (!(T > 0)) return 0;
    if (ageSec < 0) return 1;
    if (ageSec >= T) return 0;
    const hold = 0.15 * T;
    if (ageSec <= hold) return 1;
    const left = 1 - (ageSec - hold) / (0.85 * T);
    return left * left;
  }

  // Remembers each bar's recent peaks. Keep one per effect; the effect calls
  // sync(key) every frame with something like `${bars}:${w}:${h}` so a change of
  // bar count or canvas size starts afresh.
  function createBarGhosts() {
    let key = null;
    let prev = [];   // last live height per bar
    let ghosts = []; // per bar: [{ height, born }], lowest height first

    return {
      sync(next) {
        if (next === key) return;
        key = next;
        prev = [];
        ghosts = [];
      },

      // Bookkeeping for bar i, then its strips, nearest the live bar first.
      step(i, height, nowMs, T, record) {
        const last = prev[i];
        prev[i] = height;
        if (!(T > 0)) { ghosts[i] = []; return []; }
        let list = ghosts[i] || (ghosts[i] = []);

        // Anything the live bar has caught up with is no longer a ghost.
        list = list.filter((g) => g.height > height);
        // A drop leaves a ghost at the height it fell from. Every ghost still
        // kept is higher than that, so the new one goes in front.
        if (record && last !== undefined && last > height) list.unshift({ height: last, born: nowMs });
        list = list.filter((g) => (nowMs - g.born) / 1000 < T);
        ghosts[i] = list;

        const strips = [];
        let lo = height;
        for (const g of list) {
          strips.push({ lo, hi: g.height, strength: fade((nowMs - g.born) / 1000, T) });
          lo = g.height;
        }
        return strips;
      },
    };
  }

  // Watches a wave's loudness and freezes a copy of its shape after each burst
  // of sound. See the spec's "Echoes" for why the follower rises at once.
  const FOLLOW_S = 0.15;   // follower fall time constant, seconds
  const PASSED = 0.6;      // the burst has passed when the follower is below this fraction of the peak
  const MIN_PEAK = 0.1;    // quieter bursts are not worth an echo
  const REARM = 0.08;      // follower rise above its low that arms the next burst

  function createEchoes() {
    let key = null;
    let echoes = [];     // [{ shape, born }], oldest first
    let lastMadeMs = -Infinity;
    let follower, armed, peak, loudest, candidate, hasCandidate, low;

    function resetTracker() {
      follower = 0; armed = true; peak = 0; loudest = 0;
      candidate = undefined; hasCandidate = false; low = 0;
    }
    resetTracker();

    return {
      sync(next) {
        if (next === key) return;
        key = next;
        echoes = [];
        lastMadeMs = -Infinity;
        resetTracker();
      },

      step(loudness, nowMs, dt, T, record, snapshot) {
        if (!(T > 0)) { echoes = []; lastMadeMs = -Infinity; resetTracker(); return []; }
        echoes = echoes.filter((e) => (nowMs - e.born) / 1000 < T);

        if (!record) {
          resetTracker();
        } else {
          const l = loudness > 1 ? 1 : loudness > 0 ? loudness : 0;
          follower = Math.max(l, follower * Math.exp(-(dt > 0 ? dt : 0) / FOLLOW_S));

          if (!armed) {
            low = Math.min(low, follower);
            if (follower >= low + REARM) { armed = true; peak = 0; loudest = 0; hasCandidate = false; candidate = undefined; }
          }
          if (armed) {
            if (follower > peak) peak = follower;
            if (l > loudest) { loudest = l; candidate = snapshot(); hasCandidate = true; }
            if (peak > MIN_PEAK && follower < PASSED * peak) {
              // The T / 6 spacing keeps at most six alive while T is steady; the
              // length check covers T being raised while older echoes still live.
              if (hasCandidate && echoes.length < MAX_ECHOES && (nowMs - lastMadeMs) / 1000 >= T / 6) {
                echoes.push({ shape: candidate, born: nowMs });
                lastMadeMs = nowMs;
              }
              armed = false; low = follower;
              peak = 0; loudest = 0; candidate = undefined; hasCandidate = false;
            }
          }
        }

        return echoes.map((e) => ({ shape: e.shape, strength: fade((nowMs - e.born) / 1000, T), born: e.born }));
      },
    };
  }

  // Adds a smooth curve through the points to ctx's current path (never begins
  // or strokes it). Each point is a control point, and the curve passes through
  // the midpoints between neighbours.
  function trace(ctx, xs, ys, closed) {
    const n = xs.length;
    if (n === 0) return;
    if (closed) {
      ctx.moveTo((xs[n - 1] + xs[0]) / 2, (ys[n - 1] + ys[0]) / 2);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[j]) / 2, (ys[i] + ys[j]) / 2);
      }
      ctx.closePath();
      return;
    }
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < n - 1; i++) {
      ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2);
    }
    if (n > 1) ctx.lineTo(xs[n - 1], ys[n - 1]);
  }

  globalThis.TimbreGlow = { BAR, BAR_TIP, ECHO, ECHO_FILL, MAX_ECHOES, fade, createBarGhosts, createEchoes, trace };
})();
