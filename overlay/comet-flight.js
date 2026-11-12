// Timbre — comet flight, the plain numbers behind the comet effect. It holds
// the looping path the head flies, the rules that turn the voice into speed,
// reach, tail length, tail width and opacity, the tail's memory of where the
// head has been (and how loud the voice was there), and the gate that decides
// when a peak flares the head. The effect in factories/comet.js reads the sound
// and draws; nothing here draws.
//
// All timing comes from the caller (dt in seconds), never from counting frames
// or reading the clock, so the same sound gives the same flight at any frame
// rate. Lengths are in canvas pixels; `scale` is the page's SCALE.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreComet`), like helix.js, so verify.mjs can import it under
// Node. Nothing here may touch document, window, ctx or core.js globals.

(function () {
  'use strict';

  const MARGIN = 18;                         // × scale: the path keeps this far inside the frame
  const SPEED_MIN = 0.2, SPEED_LOUD = 0.75;  // radians a second along the figure: silent, and added at full loudness
  const DASH = 1.6;                          // a full flare multiplies the speed by 1 + this
  const REACH_MIN = 0.42;                    // share of the frame the figure fills when silent
  const LEAN_MAX = 0.35, LEAN_RATE = 0.07;   // the figure's slow reshaping: limit in radians, and its rate
  const TAIL_MIN = 50, TAIL_PER_TRAIL = 2.8; // × scale: tail length at Trail 0, and added per point of Trail
  const TAIL_QUIET = 0.3;                    // share of that length when silent
  const STEP = 1.7, STEP_FLOOR = 3;          // spacing of remembered points: × scale, and its floor in px
  const REARM_S = 0.7;                       // the shortest time between two flares, counted with the mic on

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // The figure: three loops across, two up and down, centred in the frame. `lean` shifts the
  // across loops against the up-and-down ones and so reshapes it. At a lean of a quarter turn the
  // figure folds into a line and the head would stop and turn back; lean() never goes near that.
  // z is a hint of depth: +1 nearest, -1 farthest.
  function at(theta, reach, lean, W, H, scale) {
    const m = MARGIN * scale;
    return {
      x: W / 2 + (W / 2 - m) * reach * Math.sin(3 * theta + lean),
      y: H / 2 + (H / 2 - m) * reach * Math.sin(2 * theta),
      z: Math.cos(theta + 0.6),
    };
  }
  const lean = (clock) => LEAN_MAX * Math.sin(clock * LEAN_RATE);

  const speed = (loud, flash = 0) => (SPEED_MIN + SPEED_LOUD * loud) * (1 + DASH * flash);
  const reach = (loud) => REACH_MIN + (1 - REACH_MIN) * loud;
  const tailLength = (trail, loud, scale) => scale * (TAIL_MIN + TAIL_PER_TRAIL * trail) * (TAIL_QUIET + (1 - TAIL_QUIET) * loud);
  const step = (scale) => Math.max(STEP_FLOOR, STEP * scale);
  const keep = (scale) => tailLength(100, 1, scale);

  // Half the tail's width, `a` of the way from the head (0) to the tip (1). loudNow swells the
  // whole tail together; loudThen is the loudness when the head passed this point, so syllables
  // ride down the tail as bulges. z is the depth there.
  const radius = (a, loudNow, loudThen, z, scale) =>
    scale * (0.45 + (1.3 + 2.2 * loudNow + 1.5 * loudThen) * Math.pow(1 - a, 1.1)) * (0.82 + 0.18 * z);
  // The tail's opacity at the same place, before brightness.
  const alpha = (a, loudNow, loudThen) => clamp01((0.5 + 0.3 * loudNow + 0.3 * loudThen) * Math.pow(1 - a, 1.15));

  // The tail's memory: points along the path the head has flown, oldest first. Every point but
  // the last is fixed and lies between half a step and one step from the one before it; the last
  // is the head and moves until it is far enough away to be fixed. Each point carries its
  // distance along the path (s) and the level given when the head was there.
  function createTrail({ step, keep }) {
    let points = [];
    function add(x, y, z, level) {
      const n = points.length;
      if (n === 0) { points.push({ x, y, z, s: 0, level }); return; }
      if (n === 1) { points.push({ x, y, z, s: Math.hypot(x - points[0].x, y - points[0].y), level }); return; }
      const fixed = points[n - 2], head = points[n - 1];
      const d = Math.hypot(x - fixed.x, y - fixed.y);
      if (d < step * 0.5) {                      // still close to the last fixed point: move the head
        head.x = x; head.y = y; head.z = z; head.s = fixed.s + d; head.level = level;
        return;
      }
      // Far enough: the head becomes fixed where it now is, and a new head starts on top of it.
      head.x = x; head.y = y; head.z = z; head.s = fixed.s + d; head.level = level;
      points.push({ x, y, z, s: head.s, level });
      let drop = 0;
      while (drop < points.length - 2 && head.s - points[drop + 1].s > keep) drop++;
      if (drop) points.splice(0, drop);
    }
    return {
      get points() { return points; },
      get travelled() { return points.length ? points[points.length - 1].s : 0; },
      add,
      // The oldest point within `length` of the head, as an index.
      first(length) {
        const end = points.length ? points[points.length - 1].s : 0;
        let i = points.length - 1;
        while (i > 0 && end - points[i - 1].s <= length) i--;
        return Math.max(0, i);
      },
      clear() { points = []; },
    };
  }

  // Move the head on by dTheta, remembering the path in sub-steps short enough that no two
  // remembered points are more than a step apart, however long the frame was. reach and lean run
  // from their values at the start of the frame to their values at its end. Returns the head.
  function fly(trail, { theta, dTheta, reach0, reach1, lean0, lean1, W, H, scale, level }) {
    const ax = W / 2 - MARGIN * scale, ay = H / 2 - MARGIN * scale;
    const top = Math.max(reach0, reach1);
    // The farthest the head can travel this frame: along the figure, plus the figure growing and leaning.
    const far = Math.abs(dTheta) * Math.hypot(3 * ax, 2 * ay) * top + Math.abs(reach1 - reach0) * Math.hypot(ax, ay) + Math.abs(lean1 - lean0) * ax * top;
    const n = Math.max(1, Math.ceil(far / (step(scale) * 0.5)));
    let p = null;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      p = at(theta + dTheta * u, reach0 + (reach1 - reach0) * u, lean0 + (lean1 - lean0) * u, W, H, scale);
      trail.add(p.x, p.y, p.z, level);
    }
    return p;
  }

  // Decides when a peak flares the head: the mic is on, the peak has reached the threshold, and
  // it has been REARM_S since the last flare. That time counts only while the mic is on and starts
  // from nothing, so the mic opening on a loud moment cannot flare.
  function createFlare() {
    let armed = 0;
    return {
      step({ dt, live, peak, threshold }) {
        if (!live) { armed = 0; return false; }
        armed += dt;
        if (!(peak >= threshold) || armed < REARM_S) return false;
        armed = 0;
        return true;
      },
    };
  }

  globalThis.TimbreComet = {
    MARGIN, REACH_MIN, LEAN_MAX, REARM_S,
    at, lean, speed, reach, tailLength, step, keep, radius, alpha, createTrail, fly, createFlare,
  };
})();
