/* ── dna (a smooth glowing double helix that follows the voice, and shatters on a hard peak) ──
   Two strands wound round the horizontal axis, half a turn apart, each a ribbon whose width
   and opacity follow its depth. The back halves draw first, then the rungs, then the front
   halves with a white core. Strand A opens with the low end of the sound and strand B with the
   high end; loudness turns the helix faster and makes it glow brighter. The numbers behind it
   (the levels, twist, radius, smoothing and the shatter machine) are TimbreHelix in helix.js.
   A hard peak breaks the helix into pieces that the machine flies apart and brings home; this
   file cuts and draws them, with a burst of sparks at the blast and one flash when the helix is
   whole again. Everything that moves runs on draw(now, dt); only the colour reads the wall
   clock, as the bar and wave effects do, so the colours stay in step when the effect changes. */
VIZ_FACTORIES['dna'] = function () {
  const W_BACK = 1.5 * SCALE, W_FRONT = 3.3 * SCALE;  // strand width, farthest and nearest
  const A_BACK = 0.32;                                 // strand opacity farthest (nearest is 1), × brightness
  const BACK_GLOW = 0.45;                              // the back halves glow less than the front
  const CORE_W = 0.8 * SCALE;                          // the white core along the front halves
  const RUNG_W = 1.5 * SCALE;
  const RUNG_STEP = (2 * Math.PI) / 9;                 // nine rungs per turn
  const EDGE_ON = 0.14;                                // no rung where |sin θ| is below this: the strands cross there
  const COL_A = 0, COL_B = 1.5;                        // palette offsets of strand A and strand B
  const COL_RUN = 1.2;                                 // palette steps along each strand's length
  const STOPS = 64;                                    // gradient stops across the width
  const STEP = 1.2 * SCALE;                            // px between samples along a strand
  const LOUD_S = 0.12;                                 // loudness smoothing, s
  const OPEN_S = 0.05, CLOSE_S = 0.2;                  // a strand opening and closing, s
  const WHITE = [255, 255, 255];
  const QUIET = { loud: 0, low: 0, high: 0 };

  // The shatter.
  const SLICE_MIN = 0.02, SLICE_MAX = 0.04;            // a strand piece's length, × W
  const MAX_PIECES = 200;                              // the piece count stays under this
  const PIECE_BRIGHT = 0.7;                            // the pieces' brightness in quiet; loudness takes it to 1
  const PIECE_GLOW = 3 * SCALE;                        // added to the pieces' blur
  const HOT = 0.8;                                     // opacity of the white overlay at full heat
  const SPARKS = 46;
  const SPARK_SPEED = 80 * SCALE, SPARK_SPEED_RANGE = 260 * SCALE;  // px/s
  const SPARK_SLOW_S = 0.5;                            // spark slowing time constant, s
  const SPARK_LIFE = 0.45, SPARK_LIFE_RANGE = 0.5;     // s, so every spark is gone within 0.95 s
  const SPARK_R = 0.45 * SCALE, SPARK_R_RANGE = 0.6 * SCALE;
  const FLASH_S = 0.25;                                // the closing flash's decay time constant, s
  const FLASH_BRIGHT = 0.5, FLASH_BLUR = 8 * SCALE;    // what a full flash adds to brightness and blur

  // Every random choice (slice lengths, the machine's pushes, sparks) comes from one source,
  // seedable through window.__dnaSeed so the render tests repeat.
  const random = TimbreHelix.rng(window.__dnaSeed);
  const machine = TimbreHelix.createShatter({ random });

  let phase = 0;                           // the twist, accumulated, rad
  let loud = 0;                            // smoothed loudness, 0 to 1
  let ra = TimbreHelix.radius(0) * SCALE;  // strand A's radius, px
  let rb = ra;                             // strand B's radius, px
  let bright = 0.5;                        // 0 to 1
  let flash = 0;                           // the closing flash, 1 when the helix is whole again
  let sparks = [];

  const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a.toFixed(3)})`;
  // z is a strand's depth: +1 nearest, -1 farthest.
  const depthAlpha = (z) => A_BACK + ((1 - A_BACK) * (z + 1)) / 2;
  const halfWidth = (z) => (W_BACK + ((W_FRONT - W_BACK) * (z + 1)) / 2) / 2;
  const toward = (r, target, dt) => TimbreHelix.follow(r, target, dt, target > r ? OPEN_S : CLOSE_S);

  // The winding in rad/px from Helix Freq. One that is not a positive finite number (a missing or
  // broken setting) falls back to the default winding, so the sampling and rung loops always end.
  function winding(freq) {
    const k = (0.025 + (freq / 100) * 0.05) / SCALE;
    return k > 0 && k < Infinity ? k : 0.05 / SCALE;
  }

  // Samples across the width, split at the turning points (cos θ = 0, where the strands pass
  // between front and back) so every run lies wholly in front or wholly behind. Each run ends on
  // the sample the next one starts from. A split is put on the nearest pixel edge: the strand is
  // level there, so the two runs meet along a pixel boundary and their anti-aliased ends leave no
  // faint seam across it. The curve itself is not rounded. aFront[i]: strand A is in front in
  // run i (B behind).
  const xs = [], sins = [], coss = [], runEnds = [], aFront = [];
  function sample(k) {
    xs.length = sins.length = coss.length = runEnds.length = aFront.length = 0;
    let from = 0;
    for (let n = Math.floor((phase - Math.PI / 2) / Math.PI) + 1; from < W; n++) {
      const to = Math.min(W, Math.round((Math.PI / 2 + n * Math.PI - phase) / k));
      if (to <= from) continue;
      const m = Math.max(1, Math.ceil((to - from) / STEP));
      for (let j = xs.length ? 1 : 0; j <= m; j++) {
        const x = from + ((to - from) * j) / m, a = k * x + phase;
        xs.push(x);
        sins.push(Math.sin(a));
        coss.push(Math.cos(a));
      }
      runEnds.push(xs.length - 1);
      aFront.push(Math.cos((k * (from + to)) / 2 + phase) > 0);
      from = to;
    }
  }

  // Calls add(from, to) for each run in which strand st is in front (front true) or behind.
  function eachRun(st, front, add) {
    let from = 0;
    for (let i = 0; i < runEnds.length; i++) {
      if ((aFront[i] === (st.sg > 0)) === front) add(from, runEnds[i]);
      from = runEnds[i];
    }
  }

  // Adds samples from..to of strand st to the path as a ribbon round its centre line, offset
  // along the curve's normal by a half-width that follows its depth. st.sg is +1 for strand A
  // (at mid + r·sin θ) and -1 for strand B (at mid - r·sin θ); its depth is st.sg · cos θ.
  function addRibbon(st, from, to, k, mid) {
    for (let i = from; i <= to; i++) ribbonEdge(st, i, k, mid, 1, i === from);
    for (let i = to; i >= from; i--) ribbonEdge(st, i, k, mid, -1, false);
    ctx.closePath();
  }
  function ribbonEdge(st, i, k, mid, side, first) {
    const slope = st.sg * st.r * k * coss[i];
    const h = (side * halfWidth(st.sg * coss[i])) / Math.sqrt(1 + slope * slope);
    const x = xs[i] - slope * h, y = mid + st.sg * st.r * sins[i] + h;
    if (first) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  function addCentre(st, from, to, mid) {
    ctx.moveTo(xs[from], mid + st.sg * st.r * sins[from]);
    for (let i = from + 1; i <= to; i++) ctx.lineTo(xs[i], mid + st.sg * st.r * sins[i]);
  }

  // A gradient across the width for strand sg: colourAt(t) and alphaAt(depth) at each stop.
  function gradient(k, sg, colourAt, alphaAt) {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    for (let j = 0; j <= STOPS; j++) {
      const t = j / STOPS;
      g.addColorStop(t, rgba(colourAt(t), alphaAt(sg * Math.cos(k * t * W + phase))));
    }
    return g;
  }

  // Rungs at fixed angles on the helix, so they turn with it. Each is two halves whose round
  // ends meet on the axis, each in its own strand's colour, dimmer when it is short (seen
  // nearly edge-on) and when its strand end is farther away. Calls visit(x, y1, y2, off, alpha)
  // for each half: off is its strand's palette offset, alpha its opacity before brightness.
  function eachRungHalf(k, mid, visit) {
    for (let m = Math.floor(phase / RUNG_STEP) + 1; ; m++) {
      const x = (m * RUNG_STEP - phase) / k;
      if (x >= W) break;
      const s = Math.sin(m * RUNG_STEP), c = Math.cos(m * RUNG_STEP);
      if (Math.abs(s) < EDGE_ON) continue;
      const end = (Math.sign(s) * RUNG_W) / 2, len = 0.2 + 0.5 * Math.abs(s);
      visit(x, mid + ra * s, mid + end, COL_A, len * (0.75 + 0.25 * c));
      visit(x, mid - end, mid - rb * s, COL_B, len * (0.75 - 0.25 * c));
    }
  }
  function drawRungs(k, mid, colorT) {
    ctx.lineWidth = RUNG_W;
    ctx.lineCap = 'round';
    eachRungHalf(k, mid, (x, y1, y2, off, alpha) => {
      ctx.strokeStyle = rgba(getColor(colorT + off + (x / W) * COL_RUN), bright * alpha);
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    });
  }

  function drawHelix(k, colorT, blur) {
    const mid = H / 2;
    sample(k);
    const coreAlpha = 0.2 + 1.4 * (bright - 0.5);   // faint when quiet, strong when loud
    const strands = [[1, ra, COL_A], [-1, rb, COL_B]].map(([sg, r, off]) => ({
      sg,
      r,
      fill: gradient(k, sg, (t) => getColor(colorT + off + t * COL_RUN), (z) => bright * depthAlpha(z)),
      core: gradient(k, sg, () => WHITE, (z) => Math.max(0, z) * coreAlpha),
      glow: rgba(getColor(colorT + off + COL_RUN / 2), 0.55 + 0.45 * bright),
    }));
    const halves = (front, glow) => {
      ctx.shadowBlur = glow;
      for (const st of strands) {
        ctx.fillStyle = st.fill;
        ctx.shadowColor = st.glow;
        ctx.beginPath();
        eachRun(st, front, (from, to) => addRibbon(st, from, to, k, mid));
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };
    halves(false, blur * BACK_GLOW);
    drawRungs(k, mid, colorT);
    halves(true, blur);
    ctx.lineWidth = CORE_W;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const st of strands) {
      ctx.strokeStyle = st.core;
      ctx.beginPath();
      eachRun(st, true, (from, to) => addCentre(st, from, to, mid));
      ctx.stroke();
    }
  }

  // What a shatter breaks the helix into, as it stands this frame: each strand in slices of
  // SLICE_MIN to SLICE_MAX of the width, and each rung half. Every piece keeps its shape, its
  // colour (as a palette offset) and its depth, and has its home centre (cx, cy); the machine
  // adds its offset, turn and heat (ox, oy, rot, heat). They come back in the order they draw:
  // back strand pieces, rung halves, front strand pieces.
  function cut(k) {
    const mid = H / 2, back = [], rungs = [], front = [];
    eachRungHalf(k, mid, (x, y1, y2, off, alpha) => {
      rungs.push({ cx: x, cy: (y1 + y2) / 2, half: (y2 - y1) / 2, alpha, col: off + (x / W) * COL_RUN });
    });
    // Every slice but a strand's last is at least `shortest`, and the last at least half that, so
    // a strand has at most perStrand slices: the slices widen if the rungs leave too little room.
    const perStrand = Math.max(1, Math.floor((MAX_PIECES - 1 - rungs.length) / 2));
    const shortest = Math.max(SLICE_MIN * W, W / perStrand);
    for (const [sg, r, off] of [[1, ra, COL_A], [-1, rb, COL_B]]) {
      for (let from = 0; from < W;) {
        let to = from + shortest * (1 + (SLICE_MAX / SLICE_MIN - 1) * random());
        if (to > W - shortest / 2) to = W;
        const piece = strandPiece(k, mid, sg, r, off, from, to);
        (piece.front ? front : back).push(piece);
        from = to;
      }
    }
    return back.concat(rungs, front);
  }

  // Strand sg's slice from..to as a ribbon (the same outline the whole helix draws) round its
  // home centre, the point on its centre line halfway along. Its depth is the depth there.
  function strandPiece(k, mid, sg, r, off, from, to) {
    const cx = (from + to) / 2, a = k * cx + phase;
    const cy = mid + sg * r * Math.sin(a), z = sg * Math.cos(a);
    const n = Math.max(1, Math.ceil((to - from) / STEP));
    const path = new Path2D(), under = [];
    for (let j = 0; j <= n; j++) {
      const x = from + ((to - from) * j) / n, t = k * x + phase, c = Math.cos(t);
      const slope = sg * r * k * c;
      const h = halfWidth(sg * c) / Math.sqrt(1 + slope * slope);
      const px = x - cx, py = mid + sg * r * Math.sin(t) - cy;
      if (j === 0) path.moveTo(px - slope * h, py + h);
      else path.lineTo(px - slope * h, py + h);
      under.push(px + slope * h, py - h);
    }
    for (let j = under.length - 2; j >= 0; j -= 2) path.lineTo(under[j], under[j + 1]);
    path.closePath();
    return { cx, cy, path, front: z > 0, alpha: depthAlpha(z), col: off + (cx / W) * COL_RUN };
  }

  // The pieces where the machine has put them: each at its home centre plus its offset, turned
  // by its turn, brighter than the calm helix (shine), with a white overlay as strong as its heat.
  function drawPieces(pieces, colorT, shine, blur) {
    ctx.lineWidth = RUNG_W;
    ctx.lineCap = 'round';
    for (const p of pieces) {
      const rgb = getColor(colorT + p.col);
      ctx.save();
      ctx.translate(p.cx + p.ox, p.cy + p.oy);
      ctx.rotate(p.rot);
      if (p.path) {
        ctx.shadowColor = rgba(rgb, 0.55 + 0.45 * shine);
        ctx.shadowBlur = p.front ? blur : blur * BACK_GLOW;
        ctx.fillStyle = rgba(rgb, shine * p.alpha);
        ctx.fill(p.path);
        ctx.shadowBlur = 0;
        if (p.heat > 0.01) {
          ctx.fillStyle = rgba(WHITE, HOT * p.heat);
          ctx.fill(p.path);
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -p.half);
        ctx.lineTo(0, p.half);
        ctx.strokeStyle = rgba(rgb, shine * p.alpha);
        ctx.stroke();
        if (p.heat > 0.01) {
          ctx.strokeStyle = rgba(WHITE, HOT * p.heat);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  // A burst of sparks off the strands at the blast. They fly in every direction, slow, fade and
  // are gone within a second; they are not part of the return.
  function burst(k) {
    const mid = H / 2;
    for (let i = 0; i < SPARKS; i++) {
      const x = random() * W, sg = random() < 0.5 ? 1 : -1;
      const a = random() * 2 * Math.PI, speed = SPARK_SPEED + SPARK_SPEED_RANGE * random();
      sparks.push({
        x,
        y: mid + sg * (sg > 0 ? ra : rb) * Math.sin(k * x + phase),
        vx: speed * Math.cos(a),
        vy: speed * Math.sin(a),
        age: 0,
        life: SPARK_LIFE + SPARK_LIFE_RANGE * random(),
        r: SPARK_R + SPARK_R_RANGE * random(),
        col: (sg > 0 ? COL_A : COL_B) + (x / W) * COL_RUN,
      });
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
  function drawSparks(colorT) {
    for (const s of sparks) {
      ctx.fillStyle = rgba(getColor(colorT + s.col), 1 - s.age / s.life);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  return {
    draw(now, dt) {
      dt = dt > 0 ? dt : 0;
      ctx.clearRect(0, 0, W, H);
      const knobs = perViz['dna'];
      const live = micActive && !!waveform;
      // Mic off: loudness stays at zero, so the twist and glow stay slow and dim; with the idle
      // animation on, only the two widths breathe, gently and out of step.
      const level = live ? TimbreHelix.levels(frequencies, waveform, cfgGain)
        : cfgIdleAnim ? { loud: 0, low: 0.22 + 0.12 * Math.sin(now / 700), high: 0.22 + 0.12 * Math.sin(now / 540 + 1.2) }
        : QUIET;
      loud = TimbreHelix.follow(loud, level.loud, dt, LOUD_S);
      // While the helix is in pieces or returning, its twist and widths hold, so every piece has a
      // fixed place to return to and the helix resumes from the angle it stopped at.
      if (machine.state === 'whole') {
        phase += TimbreHelix.twist(loud) * dt;
        ra = toward(ra, TimbreHelix.radius(level.low) * SCALE, dt);
        rb = toward(rb, TimbreHelix.radius(level.high) * SCALE, dt);
      }
      flash *= Math.exp(-dt / FLASH_S);
      moveSparks(dt);

      // The peak is the raw input level, before Gain: the mic's loudest moment across the
      // interval when the capture code gives it, else the peak of the waveform.
      const k = winding(knobs.helixFreq);
      const event = machine.step({
        now, dt, live,
        peak: typeof micPeak === 'number' ? micPeak : TimbreHelix.peakOf(waveform),
        threshold: TimbreHelix.threshold(knobs.shatterSensitivity),
        reconnectS: knobs.reconnectSeconds,
        W, H, scale: SCALE,
        cut: () => cut(k),
      });
      if (event === 'shatter') burst(k);
      else if (event === 'whole') flash = 1;
      else if (event === 'reset') sparks = [];
      bright = Math.min(1, 0.5 + 0.5 * loud + FLASH_BRIGHT * flash);

      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const blur = (3 + 11 * loud) * SCALE + FLASH_BLUR * flash;
      const pieces = machine.pieces;
      if (pieces) drawPieces(pieces, colorT, PIECE_BRIGHT + (1 - PIECE_BRIGHT) * loud, blur + PIECE_GLOW);
      else drawHelix(k, colorT, blur);
      drawSparks(colorT);
    },

    // Test surface: the strand radii in px, brightness 0 to 1, and the pieces (none while whole),
    // with how many have their centre inside the canvas.
    probe() {
      const pieces = machine.pieces;
      let inside = 0;
      if (pieces) {
        for (const p of pieces) {
          const x = p.cx + p.ox, y = p.cy + p.oy;
          if (x >= 0 && x <= W && y >= 0 && y <= H) inside++;
        }
      }
      return { state: machine.state, phase, ra, rb, bright, pieces: pieces ? pieces.length : 0, inside };
    },
  };
};
