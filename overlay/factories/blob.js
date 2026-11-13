/* ── blob (a soft vector character that swells, bulges and bounces with the voice) ──
   A smooth body with a clean outline and a face. It swells with loudness and bulges with the
   sound: the low end pushes out its top, the high end its bottom. Each syllable bounces it; it
   stretches on the way up and squashes on the way down. Its eyes blink, and turn happy when
   the voice is loud; its mouth opens with the voice. The global Bounce setting scales the
   swelling and the bounce, and 0 stills it. With the mic and the idle animation both off
   nothing about it moves.
   Its pose (hearing, the bounce, the outline) and the shared face are TimbreCharacters in
   characters.js; the sound levels are TimbreHelix's and the colours TimbrePlanets'. Everything
   that moves runs on draw(now, dt); only the colour reads the wall clock, as the bar and wave
   effects do. */
VIZ_FACTORIES['blob'] = function () {
  const C = TimbreCharacters, P = TimbrePlanets, HX = TimbreHelix;
  const QUIET = { loud: 0, low: 0, high: 0 };
  const TURN = 2 * Math.PI;
  const { rgba, whiten, shade } = P;

  const blob = C.createBlob();
  let face = { open: 0, happy: false, blink: 0, look: 0 };   // the face as last painted

  return {
    draw(now, dt) {
      dt = dt > 0 ? dt : 0;
      ctx.clearRect(0, 0, W, H);
      const live = micActive && !!waveform;
      const level = live ? HX.levels(frequencies, waveform, cfgGain) : QUIET;
      blob.step({ dt, live, level, bins: live ? frequencies : null, gain: cfgGain, bounce: cfgBounce, idle: cfgIdleAnim, W, H, scale: SCALE });
      const ears = blob.ears, n = blob.px.length;
      const cx = W / 2, cy = H / 2 + blob.cy, R = blob.radius, stretch = blob.stretch;
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const c = getColor(colorT + 0.5);

      // The glow behind it, kept a little inside the frame so it is never cut off flat.
      C.glowBehind(ctx, cx, cy, Math.max(1, Math.min(R * 2.1, H / 2 - Math.abs(blob.cy) - 1.5 * SCALE, W / 2)), c, 0.3 + 0.3 * ears.fast);

      ctx.save();
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      // The body: a smooth curve through the middles of the gaps between its points.
      const X = (i) => cx + blob.px[i], Y = (i) => H / 2 + blob.py[i];
      ctx.beginPath();
      ctx.moveTo((X(n - 1) + X(0)) / 2, (Y(n - 1) + Y(0)) / 2);
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; ctx.quadraticCurveTo(X(i), Y(i), (X(i) + X(j)) / 2, (Y(i) + Y(j)) / 2); }
      ctx.closePath();
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.45, R * 0.1, cx, cy, R * 1.5);
      body.addColorStop(0, rgba(whiten(c, 0.5), 1));
      body.addColorStop(0.5, rgba(c, 1));
      body.addColorStop(1, rgba(shade(c, 0.6), 1));
      ctx.fillStyle = body;
      ctx.fill();
      ctx.lineWidth = 1.5 * SCALE * blob.shrink;
      ctx.strokeStyle = rgba(shade(c, 0.42), 1);
      ctx.stroke();
      ctx.fillStyle = rgba(C.WHITE, 0.4);    // a highlight
      ctx.beginPath();
      ctx.ellipse(cx - R * 0.42, cy - R * 0.52 * (1 + stretch), R * 0.2, R * 0.11, -0.6, 0, TURN);
      ctx.fill();
      ctx.restore();

      face = { open: C.mouth(ears.fast), happy: ears.happy, blink: blob.blink, look: blob.look };
      C.paintFace(ctx, cx, cy - R * 0.05, R / 12.5, face);
    },

    // Test surface: what it hears (the slow and fast loudness, the low and high ends, the lean),
    // the face as it was last painted (happy, how far its mouth is open and its eyes shut, where
    // they are turned), the seconds it has heard, how awake it is and how far into its idle
    // rest, its radius, how far above its resting place it is drawn, its stretch, whether it
    // was drawn smaller to fit and whether the frame is holding it back, and how far the sound
    // is pushing its top and its bottom points.
    probe() {
      const e = blob.ears;
      return {
        loud: e.loud, fast: e.fast, low: e.low, high: e.high, lean: e.lean, happy: face.happy,
        open: face.open, blink: face.blink, look: face.look, clock: e.clock, awake: e.awake, rest: e.rest,
        radius: blob.radius, lift: blob.lift, stretch: blob.stretch, shrink: blob.shrink, held: blob.held,
        bulgeTop: blob.bulge[0], bulgeBottom: blob.bulge[blob.bulge.length >> 1],
      };
    },
  };
};
