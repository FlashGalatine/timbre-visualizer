/* ── comet (a smooth glowing comet that follows the voice, and flares on a hard peak) ──
   A glowing head flies a slow looping figure with a tapering tail behind it. Louder, it flies
   faster and wider, glows brighter and trails longer. The tail remembers: each stretch is thicker
   where the voice was louder as the head passed, so syllables travel down it. The low end of the
   sound swells the glow round the head and the high end sheds sparks. A hard peak (a yell, a
   thump on the mic) flares the head: a ring, a burst of sparks and a short dash forward.
   The numbers behind it (the path, the rules that follow the voice, the tail's memory and the
   flare gate) are TimbreComet in comet-flight.js; the sound levels are TimbreHelix's, so Comet
   hears what DNA hears. Everything that moves runs on draw(now, dt); only the colour reads the
   wall clock, as the bar and wave effects do, so the colours stay in step when the effect changes. */
VIZ_FACTORIES['comet'] = function () {
  const LOUD_S = 0.12;                                 // loudness smoothing, s
  const THEN_S = 0.05;                                 // smoothing of the level the tail remembers, s
  const LENGTH_S = 0.4;                                // smoothing of the tail's length, s
  const HIGH_S = 0.08;                                 // smoothing of the high end (sparks), s
  const LOW_OPEN_S = 0.05, LOW_CLOSE_S = 0.2;          // the head's glow swelling and shrinking, s
  const REACH_GROW_S = 0.3, REACH_SHRINK_S = 0.9;      // the loop widening and narrowing, s
  const FLASH_S = 0.3;                                 // the flare's flash decay, s
  const COL_RUN = 1.4;                                 // palette steps from the head to the tail's tip
  const WHITEN = 0.55;                                 // how far toward white the tail is at the head
  const THREAD = 0.38;                                 // share of the tail the white thread runs down
  const GLOW_CHUNKS = 9;                               // the glow is drawn as up to this many stretches
  const OFF = 20000;                                   // px: how far off-canvas the glow's strokes are drawn
  const SPARK_SLOW_S = 0.6;                            // spark slowing time constant, s
  const MAX_SPARKS = 220;                              // shed sparks stop being added past this
  const FLARE_SPARKS = 44;
  const RING_S = 0.6;                                  // a flare ring's life, s
  const WHITE = [255, 255, 255];
  const QUIET = { loud: 0, low: 0, high: 0 };

  // Every random choice (the sparks) comes from one source, seedable through window.__cometSeed
  // so the render tests repeat.
  const random = TimbreHelix.rng(window.__cometSeed);
  const trail = TimbreComet.createTrail({ step: TimbreComet.step(SCALE), keep: TimbreComet.keep(SCALE) });
  const gate = TimbreComet.createFlare();

  let theta = 0.6;                         // where the head is on the figure, rad
  let clock = 0;                           // seconds flown, for the figure's slow reshaping
  let loud = 0, then = 0, len = 0, low = 0, high = 0;   // smoothed levels, 0 to 1
  let reach = TimbreComet.reach(0);        // share of the frame the figure fills
  let speed = TimbreComet.speed(0);        // rad/s, as last flown
  let flash = 0;                           // 1 at a flare, then fading
  let bright = 0.5;                        // 0 to 1
  let flares = 0;                          // how many times the head has flared
  let head = null;                         // { x, y, z }
  let vel = [0, 0];                        // the head's velocity, px/s
  let tail = 0, drawn = 0, coma = 0;       // tail length in px, points in it, the head glow's radius in px
  let tipAlpha = 0;                        // the tail's opacity at its tip, before brightness
  let widths = [];                         // the tail's half-widths as last drawn, tip first
  let sparks = [], rings = [], sparkDebt = 0;
  let sizeW = W, sizeH = H;

  const rgba = (c, a) => `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const whiten = (c, k) => [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k];
  const follow = TimbreHelix.follow;

  function flare() {
    flares++;
    rings.push({ x: head.x, y: head.y, age: 0 });
    for (let i = 0; i < FLARE_SPARKS; i++) {
      const ang = random() * 2 * Math.PI, sp = (50 + 210 * random()) * SCALE;
      sparks.push({ x: head.x, y: head.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        age: 0, life: 0.5 + 0.7 * random(), r: (0.45 + 0.7 * random()) * SCALE, col: random() * COL_RUN });
    }
  }
  function shed(dt, live) {
    sparkDebt = Math.min(4, sparkDebt + (live ? 3 + 70 * high + 14 * loud : 2.5) * dt);
    while (sparkDebt >= 1 && sparks.length < MAX_SPARKS) {
      sparkDebt -= 1;
      const ang = random() * 2 * Math.PI, sp = (6 + 26 * random()) * SCALE;
      sparks.push({ x: head.x + (random() - 0.5) * 3 * SCALE, y: head.y + (random() - 0.5) * 3 * SCALE,
        vx: -vel[0] * 0.1 + Math.cos(ang) * sp, vy: -vel[1] * 0.1 + Math.sin(ang) * sp,
        age: 0, life: 0.45 + 0.8 * random(), r: (0.3 + 0.5 * random()) * SCALE, col: random() * 0.8 });
    }
  }
  function moveSparks(dt) {
    if (!sparks.length) return;
    const keep = Math.exp(-dt / SPARK_SLOW_S);
    const travel = SPARK_SLOW_S * (1 - keep);   // exact distance per unit of decaying speed over dt
    for (const s of sparks) {
      s.age += dt;
      s.x += s.vx * travel;
      s.y += s.vy * travel;
      s.vx *= keep;
      s.vy *= keep;
    }
    sparks = sparks.filter((s) => s.age < s.life);
  }

  /* The tail's body: short round-ended strokes from the tip to the head. Each stroke first clears
     its own footprint and then adds its colour, so overlaps never double up and no joins show. */
  function drawBody(pts, first, colorT, shape) {
    const shine = 0.6 + 0.4 * bright, rad = shape.rad;
    // Each point's colour, worked out once: a point ends one stroke and starts the next.
    const col = [];
    for (let i = first; i < pts.length; i++) {
      const a = shape.along[i - first];
      col.push(rgba(whiten(getColor(colorT + a * COL_RUN), WHITEN * Math.pow(1 - a, 3)), TimbreComet.alpha(a, loud, pts[i].level) * shine));
    }
    ctx.lineCap = 'round';
    for (let i = first; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1], j = i - first;
      if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < 0.25) continue;   // the head sitting on the last fixed point
      const g = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      g.addColorStop(0, col[j]);
      g.addColorStop(1, col[j + 1]);
      ctx.lineWidth = rad[j] + rad[j + 1];
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = '#000';
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = g;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* The glow: the tail again as a few wide, blurred stretches laid UNDER what is already drawn.
     Only the blur is wanted, so each stretch is stroked far off the canvas and its shadow is
     thrown back onto it. Stretches meet end to end, and the blur hides where. */
  function drawGlow(pts, first, colorT, shape) {
    const count = pts.length - first;
    if (count < 3) return;
    const chunks = Math.min(GLOW_CHUNKS, Math.max(1, Math.floor(count / 3)));
    ctx.globalCompositeOperation = 'destination-over';
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.shadowOffsetX = OFF;
    ctx.shadowBlur = (4 + 10 * loud + 6 * flash) * SCALE;
    ctx.translate(-OFF, 0);
    for (let c = 0; c < chunks; c++) {
      const i0 = first + Math.floor((c * (count - 1)) / chunks), i1 = first + Math.floor(((c + 1) * (count - 1)) / chunks);
      if (i1 <= i0) continue;
      const mid = (i0 + i1) >> 1, a = shape.along[mid - first];
      ctx.shadowColor = rgba(getColor(colorT + a * COL_RUN), TimbreComet.alpha(a, loud, pts[mid].level) * (0.6 + 0.4 * bright) * (0.55 + 0.35 * bright));
      ctx.lineWidth = 2.3 * shape.rad[mid - first];
      const xs = [], ys = [];
      for (let i = i0; i <= i1; i++) { xs.push(pts[i].x); ys.push(pts[i].y); }
      ctx.beginPath();
      TimbreGlow.trace(ctx, xs, ys, false);
      ctx.stroke();
    }
    ctx.translate(OFF, 0);
    ctx.shadowOffsetX = 0;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalCompositeOperation = 'source-over';
  }

  // A white thread down the front of the tail, fading out.
  function drawThread(pts, first, depth, shape) {
    const xs = [], ys = [];
    for (let i = pts.length - 1; i >= first && shape.along[i - first] <= THREAD; i--) { xs.push(pts[i].x); ys.push(pts[i].y); }
    if (xs.length < 3) return;
    const g = ctx.createLinearGradient(xs[0], ys[0], xs[xs.length - 1], ys[ys.length - 1]);
    g.addColorStop(0, rgba(WHITE, 0.25 + 0.65 * loud + flash));
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.strokeStyle = g;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = (0.7 + 0.9 * loud) * SCALE * depth;
    ctx.beginPath();
    TimbreGlow.trace(ctx, xs, ys, false);
    ctx.stroke();
  }

  function drawSparks(colorT) {
    for (const s of sparks) {
      const k = 1 - s.age / s.life;
      ctx.fillStyle = rgba(whiten(getColor(colorT + s.col), 0.6 * k * k), k * (0.5 + 0.5 * bright));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (0.6 + 0.4 * k), 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  function drawRings(colorT) {
    for (const r of rings) {
      const u = r.age / RING_S, e = 1 - Math.pow(1 - u, 3);
      ctx.strokeStyle = rgba(whiten(getColor(colorT), 0.5), Math.pow(1 - u, 2));
      ctx.lineWidth = (2.2 * (1 - u) + 0.4) * SCALE;
      ctx.beginPath();
      ctx.arc(r.x, r.y, (5 + 62 * e) * SCALE, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
  // The head: a soft glow that swells with the low end, and a white core.
  function drawHead(colorT, depth) {
    const c = getColor(colorT);
    const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, coma);
    g.addColorStop(0, rgba(whiten(c, 0.7), 0.85 * bright));
    g.addColorStop(0.35, rgba(whiten(c, 0.25), 0.4 * bright));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(head.x, head.y, coma, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowColor = rgba(whiten(c, 0.4), 0.9);
    ctx.shadowBlur = (4 + 8 * loud + 8 * flash) * SCALE;
    ctx.fillStyle = rgba(WHITE, 0.75 + 0.25 * bright);
    ctx.beginPath();
    ctx.arc(head.x, head.y, (1.5 + 1.5 * loud + 1.5 * flash) * SCALE * depth, 0, 2 * Math.PI);
    ctx.fill();
  }

  return {
    draw(now, dt) {
      dt = dt > 0 ? dt : 0;
      ctx.clearRect(0, 0, W, H);
      // The box changed size: what the tail remembers is in the old frame, so start a fresh one.
      if (W !== sizeW || H !== sizeH) {
        sizeW = W; sizeH = H;
        trail.clear();
        head = null;
        sparks = [];
        rings = [];
      }
      const knobs = perViz['comet'];
      const live = micActive && !!waveform;
      // Mic off: loudness stays at zero, so the comet stays slow, small and dim; with the idle
      // animation on, only the glow round the head breathes.
      const level = live ? TimbreHelix.levels(frequencies, waveform, cfgGain)
        : cfgIdleAnim ? { loud: 0, low: 0.22 + 0.12 * Math.sin(now / 700), high: 0 }
        : QUIET;
      loud = follow(loud, level.loud, dt, LOUD_S);
      then = follow(then, level.loud, dt, THEN_S);
      len = follow(len, level.loud, dt, LENGTH_S);
      high = follow(high, level.high, dt, HIGH_S);
      low = follow(low, level.low, dt, level.low > low ? LOW_OPEN_S : LOW_CLOSE_S);
      const reach0 = reach, wantReach = TimbreComet.reach(level.loud);
      reach = follow(reach, wantReach, dt, wantReach > reach ? REACH_GROW_S : REACH_SHRINK_S);
      flash *= Math.exp(-dt / FLASH_S);

      // The peak is the raw input level, before Gain: the mic's loudest moment across at least the
      // last two intervals when the capture code gives it, else the peak of the waveform.
      const fired = gate.step({
        dt, live,
        peak: typeof micPeak === 'number' ? micPeak : TimbreHelix.peakOf(waveform),
        threshold: TimbreHelix.threshold(knobs.flareSensitivity),
      });
      if (fired) flash = 1;

      // Fly.
      speed = TimbreComet.speed(loud, flash);
      const lean0 = TimbreComet.lean(clock);
      clock += dt;
      if (!head) {
        // A fresh start begins where this frame's flight begins, so the path has no jump in it.
        head = TimbreComet.at(theta, reach0, lean0, W, H, SCALE);
        trail.add(head.x, head.y, head.z, then);
      }
      const from = head, dTheta = speed * dt;
      head = TimbreComet.fly(trail, { theta, dTheta, reach0, reach1: reach, lean0, lean1: TimbreComet.lean(clock), W, H, scale: SCALE, level: then });
      theta += dTheta;
      if (dt > 0) vel = [(head.x - from.x) / dt, (head.y - from.y) / dt];
      if (fired) flare();
      moveSparks(dt);
      shed(dt, live);
      for (const r of rings) r.age += dt;
      rings = rings.filter((r) => r.age < RING_S);

      bright = Math.min(1, 0.5 + 0.5 * loud + 0.5 * flash);
      tail = TimbreComet.tailLength(knobs.trail, len, SCALE);
      const depth = 0.82 + 0.18 * head.z;
      coma = (6 + 9 * low + 5 * loud + 9 * flash) * SCALE * depth;
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const pts = trail.points, first = trail.first(tail);
      drawn = pts.length - first;
      // How far along the tail each drawn point is, from the head (0) to the tip (1), and its
      // half-width. A tail still growing after a fresh start is measured to its oldest point, so
      // it tapers to nothing at its tip from the first moment instead of ending in a blunt stub.
      const end = trail.travelled;
      const span = first > 0 ? tail : Math.max(1e-6, Math.min(tail, end - pts[0].s));
      const along = [], rad = [];
      for (let i = first; i < pts.length; i++) {
        const a = Math.min(1, (end - pts[i].s) / span);
        along.push(a);
        rad.push(TimbreComet.radius(a, loud, pts[i].level, pts[i].z, SCALE));
      }
      TimbreComet.capBulges(rad);
      const shape = { along, rad };
      widths = rad;
      tipAlpha = TimbreComet.alpha(along[0], loud, pts[first].level);

      ctx.save();
      drawBody(pts, first, colorT, shape);
      drawGlow(pts, first, colorT, shape);
      drawThread(pts, first, depth, shape);
      drawSparks(colorT);
      drawRings(colorT);
      drawHead(colorT, depth);
      ctx.restore();
    },

    // Test surface: where the head is on the figure (rad) and how fast it flies (rad/s), the reach,
    // brightness and smoothed low end (0 to 1), the tail's length (px) and how many remembered
    // points it holds, whether the head and all of them are inside the canvas, the head glow's
    // radius (px), the sparks and rings alive, and how many times the head has flared. Also the
    // longest gap between two neighbouring points of the tail (px), the tail's opacity at its tip,
    // the level remembered at the tip and at the head, and the widest any stretch of the tail
    // stands over the narrowest point nearer the head (1 for a tail that only narrows).
    probe() {
      const pts = trail.points, from = Math.max(0, pts.length - drawn);
      let inside = !!head && head.x >= 0 && head.x <= W && head.y >= 0 && head.y <= H, gap = 0;
      for (let i = from; i < pts.length; i++) {
        if (pts[i].x < 0 || pts[i].x > W || pts[i].y < 0 || pts[i].y > H) inside = false;
        if (i > from) gap = Math.max(gap, Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
      }
      let bulge = 1, narrowest = Infinity;
      for (let i = widths.length - 1; i >= 0; i--) {
        narrowest = Math.min(narrowest, widths[i]);
        bulge = Math.max(bulge, widths[i] / narrowest);
      }
      return { theta, speed, reach, bright, low, tail, points: drawn, inside, coma, sparks: sparks.length, rings: rings.length, flares,
        gap, tipAlpha, bulge, levelTip: pts.length ? pts[from].level : 0, levelHead: pts.length ? pts[pts.length - 1].level : 0 };
    },
  };
};
