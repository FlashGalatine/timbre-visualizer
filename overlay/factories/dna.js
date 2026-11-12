/* ── dna (a smooth glowing double helix that follows the voice) ──
   Two strands wound round the horizontal axis, half a turn apart, each a ribbon whose width
   and opacity follow its depth. The back halves draw first, then the rungs, then the front
   halves with a white core. Strand A opens with the low end of the sound and strand B with the
   high end; loudness turns the helix faster and makes it glow brighter. The numbers behind it
   (the levels, twist, radius, smoothing and the shatter machine) are TimbreHelix in helix.js.
   Everything that moves runs on draw(now, dt); only the colour reads the wall clock, as the bar
   and wave effects do, so the colours stay in step when the effect changes. */
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

  // The shatter machine, seedable through window.__dnaSeed so the render tests repeat.
  const machine = TimbreHelix.createShatter({ random: TimbreHelix.rng(window.__dnaSeed) });
  // What a shatter breaks the helix into. Nothing yet, so the helix stays whole.
  const cut = () => [];

  let phase = 0;                           // the twist, accumulated, rad
  let loud = 0;                            // smoothed loudness, 0 to 1
  let ra = TimbreHelix.radius(0) * SCALE;  // strand A's radius, px
  let rb = ra;                             // strand B's radius, px
  let bright = 0.5;                        // 0 to 1

  const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a.toFixed(3)})`;
  // z is a strand's depth: +1 nearest, -1 farthest.
  const depthAlpha = (z) => A_BACK + ((1 - A_BACK) * (z + 1)) / 2;
  const halfWidth = (z) => (W_BACK + ((W_FRONT - W_BACK) * (z + 1)) / 2) / 2;
  const toward = (r, target, dt) => TimbreHelix.follow(r, target, dt, target > r ? OPEN_S : CLOSE_S);

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
  // nearly edge-on) and when its strand end is farther away.
  function drawRungs(k, mid, colorT) {
    ctx.lineWidth = RUNG_W;
    ctx.lineCap = 'round';
    for (let m = Math.floor(phase / RUNG_STEP) + 1; ; m++) {
      const x = (m * RUNG_STEP - phase) / k;
      if (x >= W) break;
      const s = Math.sin(m * RUNG_STEP), c = Math.cos(m * RUNG_STEP);
      if (Math.abs(s) < EDGE_ON) continue;
      const t = x / W, end = (Math.sign(s) * RUNG_W) / 2;
      rungHalf(x, mid + ra * s, mid + end, getColor(colorT + COL_A + t * COL_RUN), Math.abs(s), c);
      rungHalf(x, mid - end, mid - rb * s, getColor(colorT + COL_B + t * COL_RUN), Math.abs(s), -c);
    }
  }
  function rungHalf(x, y1, y2, rgb, len, z) {
    ctx.strokeStyle = rgba(rgb, bright * (0.2 + 0.5 * len) * (0.75 + 0.25 * z));
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();
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
      phase += TimbreHelix.twist(loud) * dt;
      ra = toward(ra, TimbreHelix.radius(level.low) * SCALE, dt);
      rb = toward(rb, TimbreHelix.radius(level.high) * SCALE, dt);
      bright = 0.5 + 0.5 * loud;

      // The peak is the raw input level, before Gain: the mic's loudest moment across the
      // interval when the capture code gives it, else the peak of the waveform.
      machine.step({
        now, dt, live,
        peak: typeof micPeak === 'number' ? micPeak : TimbreHelix.peakOf(waveform),
        threshold: TimbreHelix.threshold(knobs.shatterSensitivity),
        reconnectS: knobs.reconnectSeconds,
        W, H, scale: SCALE, cut,
      });

      const k = (0.025 + (knobs.helixFreq / 100) * 0.05) / SCALE;
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      drawHelix(k, colorT, (3 + 11 * loud) * SCALE);
    },

    // Test surface: the strand radii in px, brightness 0 to 1, and the pieces (none while whole).
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
