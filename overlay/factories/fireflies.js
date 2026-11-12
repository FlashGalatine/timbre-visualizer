/* ── fireflies (a living swarm that blinks with the voice, and startles on a hard peak) ──
   Soft glowing fireflies wander the whole frame, near ones larger and far ones smaller. Each
   blinks on its own slow rhythm and leaves a short streak of light while it is lit. Louder,
   they blink more often, glow brighter and fly faster; each syllable sets off a burst of
   flashes, and every flash sends out an unseen ripple that nudges the fireflies it passes. The
   low end of the sound swells each glow and the high end makes the lit ones flicker. A hard
   peak (a yell, a thump on the mic) makes the whole swarm flash and scatter, then wander back.
   The swarm itself (flight, charge, ripples, bursts and the startle) is TimbreSwarm in
   fireflies-swarm.js; the sound levels are TimbreHelix's, so Fireflies hears what DNA and Comet
   hear. Everything that moves runs on draw(now, dt); only the colour reads the wall clock, as
   the bar and wave effects do, so the colours stay in step when the effect changes. */
VIZ_FACTORIES['fireflies'] = function () {
  const LOW_OPEN_S = 0.05, LOW_CLOSE_S = 0.25;         // each glow swelling and shrinking with the low end, s
  const HIGH_S = 0.08;                                 // smoothing of the high end (the flicker), s
  const FLICKER = 0.35;                                // the most the high end dims a lit firefly
  const FLICKER_RATE = 42;                             // rad/s
  const BODY = 0.12, BODY_NEAR = 0.16;                 // an unlit body's opacity: far, and added for the nearest
  const DARK = 0.02;                                   // below this brightness only the body is drawn
  const WHITE = [255, 255, 255];
  const QUIET = { loud: 0, low: 0, high: 0 };
  const TURN = 2 * Math.PI;

  // Every random choice comes from one source, seedable through window.__firefliesSeed so the
  // render tests repeat.
  const swarm = TimbreSwarm.createSwarm({ random: TimbreHelix.rng(window.__firefliesSeed) });

  let low = 0, high = 0;                   // smoothed low and high ends of the sound, 0 to 1
  let clock = 0;                           // seconds drawn, for the flicker
  let order = [], orderOf = null;          // the fireflies far to near, and the list that order was made from

  const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a <= 0 ? 0 : a >= 1 ? 1 : Math.round(a * 1000) / 1000) + ')';
  const whiten = (c, k) => [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k];
  const haloScale = () => 4 + 5 * low;     // the glow's radius in cores, before depth and brightness
  // A firefly's brightness as drawn: its flash, dimmed by the flicker and by fading in or out.
  const shine = (f) => f.env * f.born * (1 - FLICKER * high * (0.5 + 0.5 * Math.sin(clock * FLICKER_RATE + f.pA)));

  function drawFly(f, colorT) {
    const c = getColor(colorT + f.col), core = (1.0 + 1.5 * f.z) * SCALE, lit = shine(f);
    // The body: always there, faint, so the swarm shows even when no one is lit. A bright flash
    // hides it under its core, so it is skipped then.
    if (lit < 0.5) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = rgba(c, (BODY + BODY_NEAR * f.z) * f.born);
      ctx.beginPath();
      ctx.arc(f.x, f.y, core * 0.55, 0, TURN);
      ctx.fill();
    }
    if (lit < DARK) return;
    ctx.globalCompositeOperation = 'lighter';
    // The streak it has just flown, brightest at the firefly. Its far end is where the firefly
    // was TRAIL_S ago, placed between the two notes either side of that moment.
    const h = f.hist;
    if (h.length) {
      let tx = h[0].x, ty = h[0].y;
      if (h.length > 1 && h[1].t > h[0].t) {
        const u = Math.max(0, Math.min(1, (swarm.clock - TimbreSwarm.TRAIL_S - h[0].t) / (h[1].t - h[0].t)));
        tx += (h[1].x - tx) * u;
        ty += (h[1].y - ty) * u;
      }
      if (Math.hypot(f.x - tx, f.y - ty) > 1) {
        const g = ctx.createLinearGradient(f.x, f.y, tx, ty);
        g.addColorStop(0, rgba(whiten(c, 0.3), 0.55 * lit));
        g.addColorStop(1, rgba(c, 0));
        ctx.strokeStyle = g;
        ctx.lineWidth = core * 1.3;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        for (let i = h.length - 1; i >= 1; i--) ctx.lineTo(h[i].x, h[i].y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    }
    // The glow, swelling with the low end, and a bright core.
    const R = core * (haloScale() + 3 * f.z) * (0.55 + 0.45 * lit);
    const halo = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R);
    halo.addColorStop(0, rgba(whiten(c, 0.6), 0.9 * lit));
    halo.addColorStop(0.25, rgba(c, 0.42 * lit));
    halo.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(f.x, f.y, R, 0, TURN);
    ctx.fill();
    ctx.fillStyle = rgba(WHITE, lit);
    ctx.beginPath();
    ctx.arc(f.x, f.y, core * (0.55 + 0.4 * lit), 0, TURN);
    ctx.fill();
  }

  return {
    draw(now, dt) {
      dt = dt > 0 ? dt : 0;
      ctx.clearRect(0, 0, W, H);
      clock += dt;
      const knobs = perViz['fireflies'];
      const live = micActive && !!waveform;
      // Mic off: loudness stays at zero, so the swarm drifts and blinks at its slowest; with the
      // idle animation on, only the size of each glow breathes.
      const level = live ? TimbreHelix.levels(frequencies, waveform, cfgGain)
        : cfgIdleAnim ? { loud: 0, low: 0.22 + 0.12 * Math.sin(now / 700), high: 0 }
        : QUIET;
      low = TimbreHelix.follow(low, level.low, dt, level.low > low ? LOW_OPEN_S : LOW_CLOSE_S);
      high = TimbreHelix.follow(high, level.high, dt, HIGH_S);

      // The peak is the raw input level, before Gain: the mic's loudest moment across at least the
      // last two intervals when the capture code gives it, else the peak of the waveform.
      swarm.step({
        dt, live,
        loud: level.loud,
        peak: typeof micPeak === 'number' ? micPeak : TimbreHelix.peakOf(waveform),
        threshold: TimbreHelix.threshold(knobs.startleSensitivity),
        density: knobs.density,
        W, H, scale: SCALE,
      });

      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      // Far ones first. Depth never changes, so the order is made again only when the swarm's
      // list does (a firefly added or gone).
      const flies = swarm.flies;
      if (flies !== orderOf || flies.length !== order.length) {
        order = flies.slice().sort((a, b) => a.z - b.z);
        orderOf = flies;
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const f of order) drawFly(f, colorT);
      ctx.restore();
    },

    // Test surface: how many fireflies there are and how many are lit, the flashes and startles so
    // far, the ripples alive, whether every firefly is inside the canvas, the swarm's slow loudness
    // and its coupling, the smoothed low and high ends, the glow's radius in cores, the swarm's
    // brightness added up, and where the first firefly is.
    probe() {
      const flies = swarm.flies;
      let lit = 0, glow = 0, inside = true;
      for (const f of flies) {
        if (f.env > 0.15) lit++;
        glow += f.env;
        if (!(f.x >= 0 && f.x <= W && f.y >= 0 && f.y <= H)) inside = false;
      }
      return { n: flies.length, lit, flashes: swarm.flashes, startles: swarm.startles, waves: swarm.waves.length, inside,
        loud: swarm.loud, sync: swarm.sync, low, high, haloScale: haloScale(), glow,
        firstX: flies.length ? flies[0].x : 0, firstY: flies.length ? flies[0].y : 0 };
    },
  };
};
