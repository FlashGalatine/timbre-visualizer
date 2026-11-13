/* ── black-hole (light, comets and fireflies spiralling into a dark centre, fed by the voice) ──
   A solid black disc with a bright rim and a tilted, turning disc of glowing gas, the far half
   of the gas behind the hole and the near half in front. Streaks of light, small comets and
   fireflies come in from beyond the frame, spiral round faster and faster as they close in, and
   vanish into the hole, their trails draining in after them; each one it swallows makes the rim
   flare. Louder, the hole pulls harder: more is drawn in and it falls faster, and the gas glows
   brighter and turns faster. Each syllable throws in a handful more and is a ripple that runs
   inward through the gas. The low end of the sound swells the hole and the high end makes the
   fireflies flicker. A hard peak (a yell, a thump on the mic) makes the hole gulp down
   everything in sight and fire a jet of light from each pole.
   What falls in (arrival, the spiral, the trails, the end and the gulp gate) is TimbreInfall in
   infall.js; the loudness memory behind the ripple is TimbrePlanets'; the sound levels are
   TimbreHelix's. Everything that moves runs on draw(now, dt); only the colour reads the wall
   clock, as the bar and wave effects do. */
VIZ_FACTORIES['black-hole'] = function () {
  const P = TimbrePlanets, HX = TimbreHelix, I = TimbreInfall;
  const TILT = 0.36, ROLL = -0.2;                      // how flat the gas disc looks, and how far it leans
  const GAS_IN = 1.5, GAS_OUT = 4.4;                   // the gas disc, in hole radii
  const BANDS = 16;
  const TRAVEL_S = 0.8;                                // a ripple crosses the gas, outer edge to inner, in this long
  const LOW_SWELL = 0.12, FEED_SWELL = 0.1;            // how far the low end swells the hole, and feeding
  const LOW_OPEN_S = 0.05, LOW_CLOSE_S = 0.25, HIGH_S = 0.08;
  const FLICKER = 0.35, FLICKER_RATE = 42;             // the most the high end dims a firefly, and how fast, rad/s
  const RING_AFTER_S = 0.2, RING_S = 0.8, RING_REACH = 9;   // the gulp's ring of light: when it starts, how long it lasts, how far it grows (hole radii)
  const FAR_OUT = 0.15;                                // a thing this far from the rim or farther is drawn from every other remembered place
  const LUMPS = [[0, 0.45], [0.14, 1], [0.32, 0.3], [0.5, 0.85], [0.66, 0.25], [0.84, 0.7], [1, 0.45]];   // the gas's brightness round the disc
  const WHITE = [255, 255, 255];
  const QUIET = { loud: 0, low: 0, high: 0 };
  const TURN = 2 * Math.PI;
  const { rgba, whiten } = P;
  const clamp01 = (v) => (v > 1 ? 1 : v > 0 ? v : 0);

  // Every random choice comes from one source, seedable through window.__blackHoleSeed so the
  // render tests repeat.
  const infall = I.createInfall({ random: HX.rng(window.__blackHoleSeed) });
  const echo = P.createEcho(TRAVEL_S);
  const bands = Array.from({ length: BANDS }, (_, i) => ({ u: (i + 0.5) / BANDS, level: 0, alpha: 0 }));
  // A trail's points this frame, from the thing itself back to the oldest place it remembers:
  // where each is, which half it is in, and the trail's two edges there.
  const MAX = 48;
  const tx = new Float64Array(MAX), ty = new Float64Array(MAX), tz = new Float64Array(MAX);
  const ex = new Float64Array(MAX), ey = new Float64Array(MAX), fx = new Float64Array(MAX), fy = new Float64Array(MAX);

  let clock = 0, low = 0, high = 0;
  // What the last draw drew, for probe(): the things handed to it, the trails and heads it filled,
  // the jets and the halves of the gulp's ring.
  const drawn = { things: 0, ribbons: 0, heads: 0, jets: 0, rings: 0, gasAlpha: 0, holeR: I.HOLE_R * SCALE, glow: 0, flicker: 0 };

  // One thing, in one half of the frame: the part of its trail that is in that half (a tapering
  // ribbon along where it has just been) and, if the thing itself is in that half and is a comet
  // or a firefly not yet swallowed, its glowing head. It glows hotter as it nears the hole.
  function drawThing(o, front, CX, CY, colorT) {
    const head = (o.z >= 0) === front;
    if (!head && !o.mixed) return;
    const c = getColor(colorT + o.col), depth = 1 + 0.15 * o.z;
    const a = o.born * (0.55 + 0.45 * o.near) * o.fade;
    const x = CX + o.x, y = CY + o.y, pts = o.hist, n = pts.length;
    const streak = o.kind === 'streak';
    if (n >= 2 && Math.hypot(o.x - pts[0].x, o.y - pts[0].y) > 2) {
      // The points, newest first. Far from the hole a trail is nearly straight, so every other
      // remembered place is enough.
      const stride = !o.mixed && o.near < FAR_OUT && n > 6 ? 2 : 1;
      let m = 0;
      tx[m] = x; ty[m] = y; tz[m] = o.z; m++;
      for (let i = n - 1; i > 0 && m < MAX - 1; i -= stride) { tx[m] = CX + pts[i].x; ty[m] = CY + pts[i].y; tz[m] = pts[i].z; m++; }
      tx[m] = CX + pts[0].x; ty[m] = CY + pts[0].y; tz[m] = pts[0].z; m++;
      const w0 = o.size * depth * (o.kind === 'comet' ? 0.85 : o.kind === 'firefly' ? 0.5 : 0.6);
      for (let j = 0; j < m; j++) {
        const p = j === 0 ? 0 : j - 1, q = j === m - 1 ? j : j + 1;
        const dx = tx[p] - tx[q], dy = ty[p] - ty[q], d = Math.hypot(dx, dy) || 1, f = 1 - j / (m - 1);
        // A streak has no head: it is widest a little behind its front and pointed at both ends.
        const wd = w0 * (streak ? Math.min(1, 5 * (1 - f)) * Math.pow(f, 0.7) * 1.3 : f) / d;
        ex[j] = tx[j] - dy * wd; ey[j] = ty[j] + dx * wd; fx[j] = tx[j] + dy * wd; fy[j] = ty[j] - dx * wd;
      }
      // Each stretch between two points belongs to the half its middle is in. Stretches in this
      // half are joined into ribbons, all filled at once.
      let any = false, from = -1;
      ctx.beginPath();
      for (let j = 0; j <= m - 1; j++) {
        const mine = j < m - 1 && ((tz[j] + tz[j + 1]) / 2 >= 0) === front;
        if (mine && from < 0) from = j;
        if (!mine && from >= 0) {
          ctx.moveTo(ex[from], ey[from]);
          for (let i = from + 1; i <= j; i++) ctx.lineTo(ex[i], ey[i]);
          for (let i = j; i >= from; i--) ctx.lineTo(fx[i], fy[i]);
          ctx.closePath();
          from = -1; any = true;
        }
      }
      if (any) {
        const g = ctx.createLinearGradient(x, y, tx[m - 1], ty[m - 1]);
        g.addColorStop(0, rgba(whiten(c, 0.35 + 0.4 * o.near), (streak ? 0.5 : 0.75) * a));
        if (streak) g.addColorStop(0.3, rgba(whiten(c, 0.3 + 0.4 * o.near), 0.75 * a));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        ctx.fill();
        drawn.ribbons++;
      }
    }
    if (!head || streak || o.sunk) return;
    let env = 1;
    if (o.kind === 'firefly') {            // fireflies blink, and flicker with the high end
      const dim = FLICKER * high * (0.5 + 0.5 * Math.sin(clock * FLICKER_RATE + o.blink));
      const b = 0.5 + 0.5 * Math.sin(clock * o.beat + o.blink);
      env = (0.25 + 0.75 * b * b) * (1 - dim);
      drawn.flicker = Math.max(drawn.flicker, dim);
    }
    const hr = o.size * depth * (o.kind === 'comet' ? 3.4 : 3.2 + 2 * env);
    const halo = ctx.createRadialGradient(x, y, 0, x, y, hr);
    halo.addColorStop(0, rgba(whiten(c, 0.65), 0.9 * a * env));
    halo.addColorStop(0.28, rgba(c, 0.4 * a * env));
    halo.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, hr, 0, TURN);
    ctx.fill();
    ctx.fillStyle = rgba(WHITE, a * env);
    ctx.beginPath();
    ctx.arc(x, y, o.size * depth * (o.kind === 'comet' ? 0.8 : 0.5), 0, TURN);
    ctx.fill();
    drawn.heads++;
  }

  // The gas's brightness round the disc, turning: a conic gradient where the browser has one,
  // an even light where it does not.
  function lumps(phase, col) {
    if (!ctx.createConicGradient) return rgba(col, 0.6);
    const g = ctx.createConicGradient(phase, 0, 0);
    for (const [at, a] of LUMPS) g.addColorStop(at, rgba(col, a));
    return g;
  }

  // One half of the gas disc, and of the gulp's ring of light through it: the far half is drawn
  // before the hole, the near half after.
  function gasHalf(front, CX, CY, gas, ring) {
    const rh = I.HOLE_R * SCALE, from = front ? 0 : Math.PI, to = front ? Math.PI : TURN;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(ROLL);
    ctx.scale(1, TILT);
    ctx.lineWidth = (GAS_OUT - GAS_IN) / BANDS * rh * 1.02;
    for (const b of bands) {
      ctx.globalAlpha = b.alpha;
      ctx.strokeStyle = b.u < 0.3 ? gas[0] : b.u < 0.62 ? gas[1] : gas[2];
      ctx.beginPath();
      ctx.arc(0, 0, (GAS_IN + b.u * (GAS_OUT - GAS_IN)) * rh, from, to);
      ctx.stroke();
      if (front) drawn.gasAlpha += b.alpha;
    }
    if (ring) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ring.style;
      ctx.lineWidth = ring.width;
      ctx.beginPath();
      ctx.arc(0, 0, ring.radius, from, to);
      ctx.stroke();
      drawn.rings++;
    }
    ctx.restore();
  }

  return {
    draw(now, dt) {
      dt = dt > 0 ? dt : 0;
      ctx.clearRect(0, 0, W, H);
      clock += dt;
      const knobs = perViz['black-hole'];
      const CX = W / 2, CY = H / 2;
      const live = micActive && !!waveform;
      // Mic off: a slow trickle keeps falling in; with the idle animation on, the hole breathes.
      const level = live ? HX.levels(frequencies, waveform, cfgGain)
        : cfgIdleAnim ? { loud: 0, low: 0.2 + 0.12 * Math.sin(now / 800), high: 0 }
        : QUIET;
      low = HX.follow(low, level.low, dt, level.low > low ? LOW_OPEN_S : LOW_CLOSE_S);
      high = HX.follow(high, level.high, dt, HIGH_S);

      // The peak is the raw input level, before Gain: the mic's loudest moment across at least the
      // last two intervals when the capture code gives it, else the peak of the waveform.
      infall.step({
        dt, live,
        loud: level.loud,
        peak: typeof micPeak === 'number' ? micPeak : HX.peakOf(waveform),
        threshold: HX.threshold(knobs.gulpSensitivity),
        density: knobs.density,
        W, H, scale: SCALE,
      });
      const feed = Math.min(1, infall.feed), gulp = infall.gulp, jet = infall.jet;
      const rh = I.HOLE_R * SCALE, RH = rh * (1 + LOW_SWELL * low + FEED_SWELL * feed);
      const glow = clamp01(0.3 + 0.5 * infall.loud + 0.6 * feed + 0.5 * gulp);

      // The gas replays the loudness from the outside in: the outermost band hears it first.
      echo.note(clock, clamp01(infall.fast * 1.15));
      for (const b of bands) {
        b.level = echo.heard(clock, (1 - b.u) * TRAVEL_S);
        b.alpha = clamp01((1 - 0.75 * b.u) * (0.28 + 0.72 * b.level) * (0.55 + 0.45 * glow));
      }

      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const dc = getColor(colorT + 0.4), hot = whiten(dc, 0.75);
      const things = infall.things;
      // A thing whose trail lies in both halves is drawn in both, each half taking its own part.
      for (const o of things) {
        o.mixed = false;
        for (const h of o.hist) if ((h.z >= 0) !== (o.z >= 0)) { o.mixed = true; break; }
      }
      drawn.things = things.length; drawn.ribbons = 0; drawn.heads = 0; drawn.jets = 0; drawn.rings = 0;
      drawn.gasAlpha = 0; drawn.flicker = 0; drawn.holeR = RH; drawn.glow = glow;
      const gas = [lumps(infall.spin * 2.2, whiten(dc, 0.8)), lumps(infall.spin * 1.3 + 2, whiten(dc, 0.4)), lumps(infall.spin * 0.8 + 4, dc)];
      // The gulp's ring of light through the gas.
      const gt = (infall.sinceGulp - RING_AFTER_S) / RING_S;
      const ring = gt > 0 && gt < 1 ? { style: rgba(whiten(dc, 0.7), 0.85 * (1 - gt) * (1 - gt)), width: (3.2 - 2.2 * gt) * SCALE, radius: rh * (GAS_IN + RING_REACH * (1 - (1 - gt) * (1 - gt))) } : null;

      ctx.save();
      // Every line here ends square and joins plainly, whatever the last effect left the canvas with.
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      // Everything is light added to light, so within a half the order does not matter; what
      // matters is which half: the far one before the hole, the near one after.
      ctx.globalCompositeOperation = 'lighter';
      for (const o of things) drawThing(o, false, CX, CY, colorT);
      gasHalf(false, CX, CY, gas, ring);
      // The light bent round the hole: a soft ring, brightest right at the rim.
      const bent = ctx.createRadialGradient(CX, CY, RH * 0.98, CX, CY, RH * 2.2);
      bent.addColorStop(0, rgba(WHITE, 0.95 * glow));
      bent.addColorStop(0.1, rgba(hot, 0.7 * glow));
      bent.addColorStop(0.4, rgba(dc, 0.22 * glow));
      bent.addColorStop(1, rgba(dc, 0));
      ctx.fillStyle = bent;
      ctx.beginPath();
      ctx.arc(CX, CY, RH * 2.2, 0, TURN);
      ctx.arc(CX, CY, RH * 0.98, TURN, 0, true);
      ctx.fill();
      // The hole itself: solid black, so it hides what is behind it.
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgb(0,0,0)';
      ctx.beginPath();
      ctx.arc(CX, CY, RH, 0, TURN);
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(whiten(hot, 0.5), 0.35 + 0.45 * glow);
      ctx.lineWidth = (0.3 + 0.45 * glow) * SCALE;
      ctx.beginPath();
      ctx.arc(CX, CY, RH * 1.03, 0, TURN);
      ctx.stroke();
      gasHalf(true, CX, CY, gas, ring);
      for (const o of things) drawThing(o, true, CX, CY, colorT);

      // The jets from the poles: along the gas disc's axis, each starting at the hole's edge so
      // the hole stays black.
      if (jet > 0.02) {
        const ax = Math.sin(ROLL), ay = -Math.cos(ROLL);
        const len = (H / 2) * 1.05 * (1 - Math.pow(jet, 3) * 0.6), wd = RH * (0.3 + 0.25 * jet);
        for (const side of [1, -1]) {
          const bx = CX + ax * RH * 0.98 * side, by = CY + ay * RH * 0.98 * side;
          const px = CX + ax * len * side, py = CY + ay * len * side;
          const g = ctx.createLinearGradient(bx, by, px, py);
          g.addColorStop(0, rgba(WHITE, 0.95 * jet));
          g.addColorStop(0.4, rgba(whiten(dc, 0.4), 0.6 * jet));
          g.addColorStop(1, rgba(dc, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(bx - ay * wd, by + ax * wd);
          ctx.lineTo(px - ay * wd * 0.3, py + ax * wd * 0.3);
          ctx.lineTo(px + ay * wd * 0.3, py - ax * wd * 0.3);
          ctx.lineTo(bx + ay * wd, by - ax * wd);
          ctx.closePath();
          ctx.fill();
          drawn.jets++;
        }
      }
      ctx.restore();
    },

    // Test surface: how many things are falling, how many more are swallowed with their trails
    // still draining, and how many were handed to the last draw; the trails and heads that draw
    // filled, the jets, and the halves of the gulp's ring; how many have been swallowed and how
    // many gulps there have been; the hole's pull, its feeding, the gulp and the jets as they
    // stand; the slow loudness and the smoothed low and high ends; the hole's radius and its
    // glow as drawn; what the outer, middle and inner bands of gas are replaying and the near
    // half's opacity added up; the most the high end is dimming any firefly; and how far the
    // gas has turned.
    probe() {
      let sunk = 0;
      for (const o of infall.things) if (o.sunk) sunk++;
      return {
        n: infall.things.length - sunk, sunk, drawn: drawn.things, ribbons: drawn.ribbons, heads: drawn.heads, jets: drawn.jets, rings: drawn.rings,
        eaten: infall.eaten, gulps: infall.gulps,
        pull: infall.pull, feed: infall.feed, gulp: infall.gulp, jet: infall.jet,
        loud: infall.loud, low, high, holeR: drawn.holeR, glow: drawn.glow,
        levelOut: bands[BANDS - 1].level, levelMid: bands[BANDS >> 1].level, levelIn: bands[0].level,
        gasAlpha: drawn.gasAlpha, flicker: drawn.flicker, spin: infall.spin,
      };
    },
  };
};
