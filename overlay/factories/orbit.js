/* ── orbit (planets circling a sun, faster with the sound) ──
   A glowing sun in the middle and planets circling it, each on its own slightly different tilted
   orbit and leaning on its own axis, passing behind the sun and in front of it. Planets are lit
   from the sun's side, and the inner ones lap faster than the outer ones. Louder, every planet
   orbits faster and leaves a longer streak of light. The low end of the sound makes the sun
   swell and shrink and the high end makes its rays flicker. A hard peak (a yell, a thump on the
   mic) flares the sun: a ring of light sweeps out across the orbits and the planets surge.
   The system itself (how many planets, their orbits, speeds and the flare gate), the tilted
   projection and the shading of a planet are TimbrePlanets in planets.js; the sound levels are
   TimbreHelix's. Everything that moves runs on draw(now, dt); only the colour reads the wall
   clock, as the bar and wave effects do. */
VIZ_FACTORIES['orbit'] = function () {
  const P = TimbrePlanets, HX = TimbreHelix;
  const SUN_SWELL = 0.42;                              // how far the low end swells the sun
  const FLARE_SWELL = 0.25;                            // and a flare
  const LOW_OPEN_S = 0.05, LOW_CLOSE_S = 0.22, HIGH_S = 0.08, FAST_S = 0.05;
  const TRAIL_S = 0.5;                                 // a streak is this many seconds of flight
  const TRAIL_MIN = 0.04, TRAIL_MAX = 1.5;             // its shortest and longest, rad
  const SEG = 10;                                      // pieces a streak is drawn in
  const RAYS = 16;
  const FLARE_RING_S = 0.9;                            // the flare's ring of light: how long it lasts
  const STRIPES = [[0.5, 0.2, true], [0, 0.16, false], [-0.5, 0.2, true]];
  const BAND_TILT = 0.32;                              // how tilted a planet's own cloud bands look
  const WHITE = [255, 255, 255];
  const QUIET = { loud: 0, low: 0, high: 0 };
  const TURN = 2 * Math.PI;
  const { rgba, whiten } = P;

  // Every random choice comes from one source, seedable through window.__orbitSeed so the render
  // tests repeat.
  const random = HX.rng(window.__orbitSeed);
  const system = P.createSystem({ random });
  const rays = [];
  for (let i = 0; i < RAYS; i++) rays.push({ a: (i + random() * 0.7) / RAYS * TURN, rate: 0.6 + 1.4 * random(), phase: random() * TURN, wide: 0.13 + 0.12 * random(), len: 0.45 + 0.6 * random() });

  let clock = 0, low = 0, high = 0, fast = 0;
  const drawn = { bodies: 0, streak: 0, rays: 0, sunR: P.SUN_R * SCALE };   // what the last draw drew, for probe()

  // A planet's streak: a tapering ribbon along its orbit behind it, in pieces that meet edge to
  // edge, so the part on the far half of the orbit can be drawn behind the sun.
  function streak(p, c, front, CX, CY) {
    const len = Math.max(TRAIL_MIN, Math.min(TRAIL_MAX, p.w * TRAIL_S)), from = p.th - len;
    const edge = (th) => {
      const at = P.place(p.a, th, p.k, p.roll), along = P.place(1, th + Math.PI / 2, p.k, p.roll);
      const n = Math.hypot(along.x, along.y) || 1, wd = p.r * 0.72 * Math.pow(Math.max(0, 1 - (p.th - th) / len), 0.8) / n;
      return [CX + at.x - along.y * wd, CY + at.y + along.x * wd, CX + at.x + along.y * wd, CY + at.y - along.x * wd, CX + at.x, CY + at.y];
    };
    const angs = [];
    for (let j = 0; j <= SEG; j++) angs.push(p.th - len * j / SEG);
    // Also cut exactly where the orbit passes from its near half to its far half.
    for (let m = Math.ceil(from / Math.PI); m * Math.PI < p.th; m++) if (m * Math.PI > from) angs.push(m * Math.PI);
    angs.sort((a, b) => b - a);
    const head = edge(p.th), tail = edge(from);
    const g = ctx.createLinearGradient(head[4], head[5], tail[4], tail[5]);
    g.addColorStop(0, rgba(whiten(c, 0.3), 0.6 * p.born));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    let a = head;
    for (let j = 1; j < angs.length; j++) {
      const b = edge(angs[j]);
      if ((Math.sin((angs[j - 1] + angs[j]) / 2) >= 0) === front) {
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(b[2], b[3]); ctx.lineTo(a[2], a[3]);
        ctx.closePath();
        ctx.fill();
      }
      a = b;
    }
    if (front) drawn.streak = Math.max(drawn.streak, len);
  }

  function planet(p, c, CX, CY, colorT) {
    const x = CX + p.x, y = CY + p.y, r = p.r;
    const d = Math.hypot(p.x, p.y) || 1, ux = -p.x / d, uy = -p.y / d;   // toward the sun
    const lit = 0.35 + 0.65 * (1 - p.z) / 2;                             // the far side of an orbit shows the planet's lit face
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = p.born;
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.6);
    glow.addColorStop(0, rgba(c, 0.3 * (0.5 + 0.7 * fast)));
    glow.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.6, 0, TURN);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    const ringCol = p.ringed ? rgba(whiten(getColor(colorT + p.col + 0.8), 0.35), 0.8) : null;
    if (p.ringed) {                        // the far half of its rings, behind it
      ctx.strokeStyle = ringCol;
      ctx.lineWidth = r * 0.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.9, r * 0.5, p.axis, Math.PI, TURN);
      ctx.stroke();
    }
    ctx.fillStyle = P.bodyFill(ctx, r, c, ux * 0.5, uy * 0.5, lit);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TURN);
    ctx.fill();
    if (p.striped) {
      ctx.save();
      ctx.clip();
      ctx.rotate(p.axis);
      P.paintBands(ctx, r, c, BAND_TILT, STRIPES, lit);
      ctx.restore();
    }
    if (p.ringed) {                        // and the near half, in front
      ctx.strokeStyle = ringCol;
      ctx.lineWidth = r * 0.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.9, r * 0.5, p.axis, 0, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
    drawn.bodies++;
  }

  // One half of everything that orbits: the far half is drawn before the sun, the near half after.
  function half(front, order, CX, CY, colorT) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of order) {
      const c = getColor(colorT + p.col);
      // The orbit itself, faint.
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(p.roll);
      ctx.scale(1, p.k);
      ctx.strokeStyle = rgba(c, (0.1 + 0.08 * system.loud) * p.born);
      ctx.lineWidth = 0.9 * SCALE;
      ctx.beginPath();
      ctx.arc(0, 0, p.a, front ? 0 : Math.PI, front ? Math.PI : TURN);
      ctx.stroke();
      ctx.restore();
      streak(p, c, front, CX, CY);
    }
    for (const p of order) if ((p.z >= 0) === front) planet(p, getColor(colorT + p.col), CX, CY, colorT);
  }

  return {
    draw(now, dt) {
      dt = dt > 0 ? dt : 0;
      ctx.clearRect(0, 0, W, H);
      clock += dt;
      const knobs = perViz['orbit'];
      const CX = W / 2, CY = H / 2;
      const live = micActive && !!waveform;
      // Mic off: the planets drift at their slowest; with the idle animation on, the sun breathes.
      const level = live ? HX.levels(frequencies, waveform, cfgGain)
        : cfgIdleAnim ? { loud: 0, low: 0.22 + 0.14 * Math.sin(now / 800), high: 0 }
        : QUIET;
      low = HX.follow(low, level.low, dt, level.low > low ? LOW_OPEN_S : LOW_CLOSE_S);
      high = HX.follow(high, level.high, dt, HIGH_S);
      fast = HX.follow(fast, level.loud, dt, FAST_S);

      // The peak is the raw input level, before Gain: the mic's loudest moment across at least the
      // last two intervals when the capture code gives it, else the peak of the waveform.
      system.step({
        dt, live,
        loud: level.loud,
        peak: typeof micPeak === 'number' ? micPeak : HX.peakOf(waveform),
        threshold: HX.threshold(knobs.flareSensitivity),
        count: knobs.planets,
        W, H, scale: SCALE,
      });
      const flare = system.flare;
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const sc = getColor(colorT);
      const Rs = P.SUN_R * SCALE * (1 + SUN_SWELL * low) * (1 + FLARE_SWELL * flare);
      const order = system.planets.slice().sort((p, q) => p.z - q.z);
      drawn.bodies = 0; drawn.streak = 0; drawn.rays = 0; drawn.sunR = Rs;

      ctx.save();
      // The sun's corona and rays: the low end swells them, the high end makes the rays flicker.
      ctx.globalCompositeOperation = 'lighter';
      const coronaR = Rs * (2.6 + 0.8 * low + 1.2 * flare);
      const corona = ctx.createRadialGradient(CX, CY, Rs * 0.7, CX, CY, coronaR);
      corona.addColorStop(0, rgba(whiten(sc, 0.5), 0.55));
      corona.addColorStop(0.35, rgba(sc, 0.17));
      corona.addColorStop(1, rgba(sc, 0));
      ctx.fillStyle = corona;
      ctx.beginPath();
      ctx.arc(CX, CY, coronaR, 0, TURN);
      ctx.fill();
      for (const ray of rays) {
        const ang = ray.a + clock * 0.05, ca = Math.cos(ang), sa = Math.sin(ang);
        const len = Rs * (0.35 + ray.len * (0.5 + 0.5 * Math.sin(clock * ray.rate + ray.phase)) * (0.5 + 1.3 * high + 0.6 * fast + 2.2 * flare));
        const base = Rs * 0.85, tip = Rs + len, wd = Rs * ray.wide;
        const g = ctx.createLinearGradient(CX + ca * base, CY + sa * base, CX + ca * tip, CY + sa * tip);
        g.addColorStop(0, rgba(whiten(sc, 0.6), 0.3));
        g.addColorStop(1, rgba(sc, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(CX + ca * base - sa * wd, CY + sa * base + ca * wd);
        ctx.lineTo(CX + ca * tip, CY + sa * tip);
        ctx.lineTo(CX + ca * base + sa * wd, CY + sa * base - ca * wd);
        ctx.closePath();
        ctx.fill();
        drawn.rays += len / RAYS;
      }

      half(false, order, CX, CY, colorT);

      // The sun itself: a solid disc, so it hides what passes behind it.
      ctx.globalCompositeOperation = 'source-over';
      const disc = ctx.createRadialGradient(CX - 0.2 * Rs, CY - 0.25 * Rs, 0, CX, CY, Rs);
      disc.addColorStop(0, rgba(WHITE, 1));
      disc.addColorStop(0.55, rgba(whiten(sc, 0.72), 1));
      disc.addColorStop(1, rgba(whiten(sc, 0.3), 1));
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(CX, CY, Rs, 0, TURN);
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      const limb = ctx.createRadialGradient(CX, CY, Rs * 0.8, CX, CY, Rs * 1.3);
      limb.addColorStop(0, rgba(whiten(sc, 0.5), 0.45 + 0.4 * flare));
      limb.addColorStop(1, rgba(sc, 0));
      ctx.fillStyle = limb;
      ctx.beginPath();
      ctx.arc(CX, CY, Rs * 1.3, 0, TURN);
      ctx.fill();

      half(true, order, CX, CY, colorT);

      // The flare's ring of light, sweeping out across the orbits.
      const ft = system.sinceFlare / FLARE_RING_S;
      if (ft < 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(CX, CY);
        ctx.rotate(P.ORBIT_ROLL);
        ctx.scale(1, P.ORBIT_K);
        ctx.strokeStyle = rgba(whiten(sc, 0.7), 0.85 * (1 - ft) * (1 - ft));
        ctx.lineWidth = (3.4 - 2.4 * ft) * SCALE;
        ctx.beginPath();
        ctx.arc(0, 0, Rs + (system.aMax - Rs) * (1 - (1 - ft) * (1 - ft)), 0, TURN);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    },

    // Test surface: how many planets are staying, how many are listed (with those fading out)
    // and how many the last draw drew; whether every planet is wholly inside the canvas; the
    // system's speed and slow loudness; the smoothed low and high ends; the sun's radius as
    // drawn; the flares so far and how strong the last still is; how far the innermost planet
    // has turned in all; and from the last draw, the longest streak (rad) and the mean ray (px).
    probe() {
      const ps = system.planets, staying = ps.filter((p) => !p.leaving);
      return {
        n: staying.length, listed: ps.length, drawn: drawn.bodies,
        inside: ps.every((p) => Math.abs(p.x) + p.r <= W / 2 && Math.abs(p.y) + p.r <= H / 2),
        speed: system.speed, loud: system.loud, low, high, sunR: drawn.sunR,
        flares: system.flares, flare: system.flare,
        turned: staying.length ? staying[0].turned : 0,
        streak: drawn.streak, rays: drawn.rays,
      };
    },
  };
};
