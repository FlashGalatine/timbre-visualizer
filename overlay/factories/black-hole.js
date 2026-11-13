/* ── black-hole (light, comets and fireflies spiralling into a dark centre, fed by the voice) ──
   A solid black disc with a bright rim and a tilted, turning disc of glowing gas, the far half
   of the gas behind the hole and the near half in front. Streaks of light, small comets and
   fireflies come in from beyond the frame, spiral round faster and faster as they close in, and
   vanish into the hole; each one it swallows makes the rim flare. Louder, the hole pulls harder:
   more is drawn in and it falls faster, and the gas glows brighter and turns faster. Each
   syllable throws in a handful more and is a ripple that runs inward through the gas. The low
   end of the sound swells the hole and the high end makes the fireflies flicker. A hard peak (a
   yell, a thump on the mic) makes the hole gulp down everything in sight and fire a jet of light
   from each pole.
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

  let clock = 0, low = 0, high = 0;
  const drawn = { things: 0, gasAlpha: 0, holeR: I.HOLE_R * SCALE, glow: 0, flicker: 0 };   // what the last draw drew, for probe()

  // A firefly's brightness: its own blinking, dimmed by the high end's flicker.
  const blinkOf = (o) => {
    const b = 0.5 + 0.5 * Math.sin(clock * o.beat + o.blink);
    return (0.25 + 0.75 * b * b) * (1 - FLICKER * high * (0.5 + 0.5 * Math.sin(clock * FLICKER_RATE + o.blink)));
  };

  // One thing: its trail (a tapering ribbon along where it has just been) and, for a comet or a
  // firefly, its glowing head. It glows hotter as it nears the hole.
  function drawThing(o, CX, CY, colorT) {
    const c = getColor(colorT + o.col), depth = 1 + 0.15 * o.z;
    const a = o.born * (0.55 + 0.45 * o.near);
    const x = CX + o.x, y = CY + o.y, pts = o.hist, n = pts.length;
    const streak = o.kind === 'streak';
    const w0 = o.size * depth * (o.kind === 'comet' ? 0.85 : o.kind === 'firefly' ? 0.5 : 0.6);
    if (n >= 2) {
      const tx = CX + pts[0].x, ty = CY + pts[0].y;
      if (Math.hypot(x - tx, y - ty) > 2) {
        const g = ctx.createLinearGradient(x, y, tx, ty);
        // A streak has no head: it is widest a little behind its front and pointed at both ends.
        g.addColorStop(0, rgba(whiten(c, 0.35 + 0.4 * o.near), (streak ? 0.5 : 0.75) * a));
        if (streak) g.addColorStop(0.3, rgba(whiten(c, 0.3 + 0.4 * o.near), 0.75 * a));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        // The ribbon's two edges, from the head back to the oldest remembered place.
        ctx.beginPath();
        const right = [];
        for (let i = n; i >= 0; i--) {
          const px = i === n ? o.x : pts[i].x, py = i === n ? o.y : pts[i].y;
          const q = i === 0 ? pts[1] : i === n ? pts[n - 1] : pts[i - 1];
          const dx = i === 0 ? q.x - px : px - q.x, dy = i === 0 ? q.y - py : py - q.y;   // the way it was flying there
          const d = Math.hypot(dx, dy) || 1, f = i / n;
          const wd = w0 * (streak ? Math.min(1, 5 * (1 - f)) * Math.pow(f, 0.7) * 1.3 : f) / d;
          if (i === n) ctx.moveTo(CX + px - dy * wd, CY + py + dx * wd); else ctx.lineTo(CX + px - dy * wd, CY + py + dx * wd);
          right.push(CX + px + dy * wd, CY + py - dx * wd);
        }
        for (let i = right.length - 2; i >= 0; i -= 2) ctx.lineTo(right[i], right[i + 1]);
        ctx.closePath();
        ctx.fill();
      }
    }
    drawn.things++;
    if (streak) return;
    let env = 1;
    if (o.kind === 'firefly') {
      env = blinkOf(o);
      drawn.flicker = Math.max(drawn.flicker, FLICKER * high * (0.5 + 0.5 * Math.sin(clock * FLICKER_RATE + o.blink)));
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
  }

  // The gas's brightness round the disc, turning: a conic gradient where the browser has one,
  // an even light where it does not.
  function lumps(phase, col) {
    if (!ctx.createConicGradient) return rgba(col, 0.6);
    const g = ctx.createConicGradient(phase, 0, 0);
    for (const [at, a] of LUMPS) g.addColorStop(at, rgba(col, a));
    return g;
  }

  // One half of the gas disc: the far half is drawn before the hole, the near half after.
  function gasHalf(front, CX, CY, dc) {
    const rh = I.HOLE_R * SCALE;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(ROLL);
    ctx.scale(1, TILT);
    ctx.lineCap = 'butt';
    ctx.lineWidth = (GAS_OUT - GAS_IN) / BANDS * rh * 1.02;
    const inner = lumps(infall.spin * 2.2, whiten(dc, 0.8)), mid = lumps(infall.spin * 1.3 + 2, whiten(dc, 0.4)), outer = lumps(infall.spin * 0.8 + 4, dc);
    for (const b of bands) {
      ctx.globalAlpha = b.alpha;
      ctx.strokeStyle = b.u < 0.3 ? inner : b.u < 0.62 ? mid : outer;
      ctx.beginPath();
      ctx.arc(0, 0, (GAS_IN + b.u * (GAS_OUT - GAS_IN)) * rh, front ? 0 : Math.PI, front ? Math.PI : TURN);
      ctx.stroke();
      if (front) drawn.gasAlpha += b.alpha;
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
      const order = infall.things.slice().sort((p, q) => p.z - q.z);
      drawn.things = 0; drawn.gasAlpha = 0; drawn.flicker = 0; drawn.holeR = RH; drawn.glow = glow;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const o of order) if (o.z < 0) drawThing(o, CX, CY, colorT);
      gasHalf(false, CX, CY, dc);
      // The light bent round the hole: a soft ring, brightest right at the rim.
      const bent = ctx.createRadialGradient(CX, CY, RH * 0.98, CX, CY, RH * 2.2);
      bent.addColorStop(0, rgba(WHITE, 0.95 * glow));
      bent.addColorStop(0.1, rgba(hot, 0.7 * glow));
      bent.addColorStop(0.4, rgba(dc, 0.22 * glow));
      bent.addColorStop(1, rgba(dc, 0));
      ctx.fillStyle = bent;
      ctx.beginPath();
      ctx.arc(CX, CY, RH * 2.2, 0, TURN);
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
      gasHalf(true, CX, CY, dc);
      for (const o of order) if (o.z >= 0) drawThing(o, CX, CY, colorT);

      // The gulp's ring of light through the gas, and the jets from the poles.
      const gt = (infall.sinceGulp - RING_AFTER_S) / RING_S;
      if (gt > 0 && gt < 1) {
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(ROLL);
        ctx.scale(1, TILT);
        ctx.strokeStyle = rgba(whiten(dc, 0.7), 0.85 * (1 - gt) * (1 - gt));
        ctx.lineWidth = (3.2 - 2.2 * gt) * SCALE;
        ctx.beginPath();
        ctx.arc(0, 0, rh * (GAS_IN + RING_REACH * (1 - (1 - gt) * (1 - gt))), 0, TURN);
        ctx.stroke();
        ctx.restore();
      }
      if (jet > 0.02) {
        // Along the gas disc's axis, each starting at the hole's edge so the hole stays black.
        const ax = Math.sin(ROLL), ay = -Math.cos(ROLL);
        const len = (H / 2) * 1.05 * (1 - Math.pow(jet, 3) * 0.6), wd = RH * (0.3 + 0.25 * jet);
        for (const side of [1, -1]) {
          const bx = CX + ax * RH * 0.98 * side, by = CY + ay * RH * 0.98 * side;
          const tx = CX + ax * len * side, ty = CY + ay * len * side;
          const g = ctx.createLinearGradient(bx, by, tx, ty);
          g.addColorStop(0, rgba(WHITE, 0.95 * jet));
          g.addColorStop(0.4, rgba(whiten(dc, 0.4), 0.6 * jet));
          g.addColorStop(1, rgba(dc, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(bx - ay * wd, by + ax * wd);
          ctx.lineTo(tx - ay * wd * 0.3, ty + ax * wd * 0.3);
          ctx.lineTo(tx + ay * wd * 0.3, ty - ax * wd * 0.3);
          ctx.lineTo(bx + ay * wd, by - ax * wd);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    },

    // Test surface: how many things are falling and how many the last draw drew; how many have
    // been swallowed and how many gulps there have been; the hole's pull, its feeding, the gulp
    // and the jets as they stand; the slow loudness and the smoothed low and high ends; the
    // hole's radius and its glow as drawn; what the outer, middle and inner bands of gas are
    // replaying and the near half's opacity added up; the most the high end is dimming any
    // firefly; and how far the gas has turned.
    probe() {
      return {
        n: infall.things.length, drawn: drawn.things, eaten: infall.eaten, gulps: infall.gulps,
        pull: infall.pull, feed: infall.feed, gulp: infall.gulp, jet: infall.jet,
        loud: infall.loud, low, high, holeR: drawn.holeR, glow: drawn.glow,
        levelOut: bands[BANDS - 1].level, levelMid: bands[BANDS >> 1].level, levelIn: bands[0].level,
        gasAlpha: drawn.gasAlpha, flicker: drawn.flicker, spin: infall.spin,
      };
    },
  };
};
