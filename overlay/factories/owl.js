/* ── owl (a vector owl that bobs, leans, flaps and sings with the voice) ──
   An owl drawn as smooth shapes: an egg-shaped body with a paler belly, a wide head with ear
   tufts and pale discs round large eyes, a small beak, two wings, a tail and two feet. Each
   syllable bobs it; it leans toward the low or the high end of the sound; its wings lift with
   the voice and flutter when the voice is loud; its beak opens with the voice; and music notes
   float up beside it while the voice is loud. Its eyes blink, and turn happy when the voice is
   loud. The global Bounce setting scales the bob, the lean and the flap, and 0 stills them.
   With the mic and the idle animation both off nothing about it moves.
   Its pose (hearing, the bob, the wings, the notes) and the shared eyes are TimbreCharacters in
   characters.js; the sound levels are TimbreHelix's and the colours TimbrePlanets'. Everything
   that moves runs on draw(now, dt); only the colour reads the wall clock, as the bar and wave
   effects do. */
VIZ_FACTORIES['owl'] = function () {
  const C = TimbreCharacters, P = TimbrePlanets, HX = TimbreHelix;
  const EYE_UNIT = 2.6;                                // the shared eyes' unit, in units of the owl's drawing
  const BELLY = [[8, 2], [14, 3], [20, 2]];            // rows of feather marks: how far down, and how many
  const QUIET = { loud: 0, low: 0, high: 0 };
  const TURN = 2 * Math.PI;
  const { rgba, whiten, shade } = P;

  const owl = C.createOwl();
  let notesDrawn = 0;
  let face = { happy: false, blink: 0, look: 0 };      // its eyes as last painted

  return {
    draw(now, dt) {
      dt = dt > 0 ? dt : 0;
      ctx.clearRect(0, 0, W, H);
      const live = micActive && !!waveform;
      const level = live ? HX.levels(frequencies, waveform, cfgGain) : QUIET;
      owl.step({ dt, live, level, bounce: cfgBounce, idle: cfgIdleAnim, W, H, scale: SCALE });
      const ears = owl.ears, k = owl.k;
      const cx = W / 2, cy = H / 2 + owl.cy;
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const c = getColor(colorT), warm = getColor(colorT + 2);
      const dark = rgba(shade(c, 0.42), 1);

      // The glow behind it, kept a little inside the frame so it is never cut off flat.
      C.glowBehind(ctx, cx, cy, Math.max(1, Math.min(59 * k, H / 2 - Math.abs(owl.cy) - 1.5 * SCALE, W / 2)), c, 0.26 + 0.3 * ears.fast);

      // The owl, in units of its own drawing: about 48 wide and 85 tall, its middle at the origin.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(owl.tilt);
      ctx.scale(k, k);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = dark;
      // Tail.
      ctx.fillStyle = rgba(shade(c, 0.7), 1);
      ctx.beginPath();
      ctx.moveTo(-7, 28); ctx.quadraticCurveTo(0, 44, 7, 28);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Wings, lifting with the voice.
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * 16, -2);
        ctx.rotate(-side * owl.wing);
        ctx.fillStyle = rgba(shade(c, 0.72), 1);
        ctx.beginPath();
        ctx.moveTo(0, -4); ctx.quadraticCurveTo(side * 17, 2, side * 9, 30); ctx.quadraticCurveTo(side * 1, 24, 0, -4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = rgba(shade(c, 0.5), 0.8);   // feather lines
        ctx.lineWidth = 0.9;
        for (const t of [0.45, 0.7]) { ctx.beginPath(); ctx.moveTo(side * 3 * t, 6 * t); ctx.quadraticCurveTo(side * 10 * t, 14 * t + 4, side * 8.5 * t, 30 * t); ctx.stroke(); }
        ctx.restore();
      }
      // Feet.
      ctx.strokeStyle = rgba(warm, 1);
      ctx.lineWidth = 2.2;
      for (const side of [-1, 1]) for (const toe of [-3.2, 0, 3.2]) { ctx.beginPath(); ctx.moveTo(side * 8, 33); ctx.lineTo(side * 8 + toe, 38.5); ctx.stroke(); }
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.3;
      // Body and belly.
      const bodyFill = ctx.createRadialGradient(-8, -4, 2, 0, 8, 34);
      bodyFill.addColorStop(0, rgba(whiten(c, 0.35), 1));
      bodyFill.addColorStop(0.6, rgba(c, 1));
      bodyFill.addColorStop(1, rgba(shade(c, 0.68), 1));
      ctx.fillStyle = bodyFill;
      ctx.beginPath(); ctx.ellipse(0, 9, 20, 26, 0, 0, TURN); ctx.fill(); ctx.stroke();
      ctx.fillStyle = rgba(whiten(c, 0.62), 1);
      ctx.beginPath(); ctx.ellipse(0, 15, 12.5, 17, 0, 0, TURN); ctx.fill();
      ctx.strokeStyle = rgba(shade(c, 0.6), 0.75);
      ctx.lineWidth = 1;
      for (const [y, n] of BELLY) for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc((i - (n - 1) / 2) * 7, y, 2.6, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.3;
      // Ear tufts, then the head over them.
      ctx.fillStyle = rgba(shade(c, 0.78), 1);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 9, -30); ctx.quadraticCurveTo(side * 19, -44, side * 23, -41); ctx.quadraticCurveTo(side * 24, -30, side * 20, -22);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      const headFill = ctx.createRadialGradient(-9, -26, 2, 0, -17, 28);
      headFill.addColorStop(0, rgba(whiten(c, 0.4), 1));
      headFill.addColorStop(0.6, rgba(c, 1));
      headFill.addColorStop(1, rgba(shade(c, 0.7), 1));
      ctx.fillStyle = headFill;
      ctx.beginPath(); ctx.ellipse(0, -17, 24, 18.5, 0, 0, TURN); ctx.fill(); ctx.stroke();
      // The pale discs round the eyes.
      ctx.fillStyle = rgba(whiten(c, 0.72), 1);
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * 10.5, -17, 10.5, 11, 0, 0, TURN); ctx.fill(); }
      // The beak: the lower half drops as the voice opens it, far enough for the pink inside
      // to show below the upper half.
      const open = owl.open, jawTop = -9 + open * 1.5, jawTip = -6 + open * 6;
      ctx.fillStyle = rgba(shade(warm, 0.8), 1);
      ctx.beginPath(); ctx.moveTo(-3.4, jawTop); ctx.lineTo(3.4, jawTop); ctx.lineTo(0, jawTip); ctx.closePath(); ctx.fill();
      if (open > 0.1) {
        ctx.fillStyle = rgba(C.PINK, 1);
        ctx.beginPath(); ctx.moveTo(-2.5, jawTop + 0.3); ctx.lineTo(2.5, jawTop + 0.3); ctx.lineTo(0, jawTip - 1.4); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = rgba(warm, 1);
      ctx.beginPath(); ctx.moveTo(-4.2, -12); ctx.quadraticCurveTo(0, -14, 4.2, -12); ctx.lineTo(0, -5.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();

      // Its eyes: the shared eyes, large, in the discs, turned the way it leans.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(owl.tilt);
      const u = EYE_UNIT * k;
      face = { eyesOnly: true, gap: 10.5 / EYE_UNIT, happy: ears.happy, blink: owl.blink, look: owl.look };
      C.paintFace(ctx, 0, -17 * k + 1.6 * u, u, face);
      ctx.restore();

      // Music notes float up beside it while the voice is loud.
      notesDrawn = 0;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const s = SCALE * 1.1 * owl.shrink;
      for (const note of owl.notes) {
        if (note.a < 0.05) continue;
        const nx = cx + note.x, ny = H / 2 + note.y, col = rgba(whiten(getColor(colorT + note.hue), 0.3), note.a);
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.1 * s;
        ctx.beginPath(); ctx.ellipse(nx, ny, 2.6 * s, 1.9 * s, -0.35, 0, TURN); ctx.fill();
        ctx.beginPath(); ctx.moveTo(nx + 2.3 * s, ny - 0.4 * s); ctx.lineTo(nx + 2.3 * s, ny - 9 * s); ctx.quadraticCurveTo(nx + 6 * s, ny - 8 * s, nx + 6.2 * s, ny - 4.6 * s); ctx.stroke();
        notesDrawn++;
      }
      ctx.restore();
    },

    // Test surface: what it hears (the slow and fast loudness, the low and high ends, the lean),
    // its eyes as they were last painted (happy, how far shut, where they are turned), how far
    // its beak is open, the seconds it has heard, how awake it is and how far into its idle
    // rest, how far above its resting place it is drawn, whether it was drawn smaller to fit
    // and whether the frame is holding it back, how far it is tilted, its wings' lift and the
    // flap behind it, how strongly it is singing, and how many notes the last draw drew.
    probe() {
      const e = owl.ears;
      return {
        loud: e.loud, fast: e.fast, low: e.low, high: e.high, lean: e.lean, happy: face.happy,
        open: owl.open, blink: face.blink, look: face.look, clock: e.clock, awake: e.awake, rest: e.rest,
        lift: owl.lift, shrink: owl.shrink, held: owl.held, tilt: owl.tilt, wing: owl.wing, flap: owl.flap, sing: owl.sing, notes: notesDrawn,
      };
    },
  };
};
