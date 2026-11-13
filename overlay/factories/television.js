/* ── television (a floating retro set whose screen is a face, moved by the voice) ──
   A rounded cabinet on two feet with a screen, two dials, a speaker and two antennae. It
   floats; each syllable bounces it and springs its antennae; it tilts toward the low or the
   high end of the sound; its dials turn with the low and the high end and its speaker lights
   with the voice. The screen shows a face in glowing lines: two upright bars for eyes, which
   blink and turn happy as the other characters' do, and a mouth that is the live waveform (with
   Gain, as the wave effects draw it). With the mic off the screen is static and the face is
   asleep; the static changes 20 times a second, by the clock. The global Bounce setting scales
   the bounce, the tilt and the antennae, and 0 stills them. With the mic and the idle animation
   both off nothing about it moves: it does not hover, and its screen holds one picture.
   Its pose (hearing, the bounce, the hover, the antennae) is TimbreCharacters in characters.js;
   the sound levels are TimbreHelix's and the colours TimbrePlanets'. Everything that moves runs
   on draw(now, dt); only the colour reads the wall clock, as the bar and wave effects do. */
VIZ_FACTORIES['television'] = function () {
  const C = TimbreCharacters, P = TimbrePlanets, HX = TimbreHelix;
  const SCREEN = [-32, -21, 49, 42, 8];                // the screen in the set's own units: left, top, width, height, corner
  const FACE_X = -7.5;                                 // the middle of the screen
  const MOUTH_POINTS = 20, MOUTH_SWING = 7;            // the mouth: how many steps it is drawn in, and its full swing
  const STATIC = 90;                                   // flecks of static with the mic off
  const { rgba, whiten, shade } = P;
  // The static's greys: a fleck is one of these, so a picture of static is six fills.
  const SHADES = [[105, 0.14], [130, 0.26], [155, 0.1], [180, 0.22], [205, 0.3], [230, 0.18]].map(([g, a]) => rgba([g, g, g + 12], a));
  const SCAN = rgba([0, 0, 0], 0.16);
  const QUIET = { loud: 0, low: 0, high: 0 };
  const TURN = 2 * Math.PI;

  // The static's flecks come from one source, seedable through window.__televisionSeed so the
  // render tests repeat.
  const random = HX.rng(window.__televisionSeed);
  const tv = C.createTelevision();
  const drawn = { mouth: 0, flecks: 0, eyes: 0, blink: 0, happy: false };   // what the last draw drew, for probe()

  // One picture of static: for each shade, its flecks as x, y, width (in the set's own units).
  // The pose says which picture shows (tv.snow, which the clock moves on, not the frames), so
  // the static flickers at one rate at any frame rate and holds still when the pose does.
  let snow = null, snowAt = -1;
  function snowfall() {
    const out = SHADES.map(() => []);
    for (let i = 0; i < STATIC; i++) out[Math.floor(random() * SHADES.length)].push(SCREEN[0] + random() * SCREEN[2], SCREEN[1] + random() * SCREEN[3], 1.5 + random() * 4);
    return out;
  }

  // A rectangle with rounded corners, as a path.
  function rounded(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  return {
    draw(now, dt) {
      dt = dt > 0 ? dt : 0;
      ctx.clearRect(0, 0, W, H);
      const live = micActive && !!waveform;
      const level = live ? HX.levels(frequencies, waveform, cfgGain) : QUIET;
      tv.step({ dt, live, level, bounce: cfgBounce, idle: cfgIdleAnim, W, H, scale: SCALE });
      const ears = tv.ears, k = tv.k;
      const cx = W / 2, cy = H / 2 + tv.cy;
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const c = getColor(colorT + 0.3), glowCol = getColor(colorT + 1.4), line = whiten(glowCol, 0.55);
      const dark = rgba(shade(c, 0.42), 1);
      drawn.mouth = 0; drawn.flecks = 0; drawn.eyes = 0; drawn.blink = 0; drawn.happy = false;

      // The glow behind it, kept a little inside the frame so it is never cut off flat.
      C.glowBehind(ctx, cx, cy, Math.max(1, Math.min(64 * k, H / 2 - Math.abs(tv.cy) - 1.5 * SCALE, W / 2)), glowCol, live ? 0.22 + 0.34 * ears.fast : 0.14);

      // The set, in units of its own drawing: the cabinet is 74 wide and 52 tall, its middle at the origin.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tv.tilt);
      ctx.scale(k, k);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // Antennae: they spring when a syllable lands and lean with the sound.
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.6;
      for (const side of [-1, 1]) {
        const a = -Math.PI / 2 + side * 0.5 + tv.wag * 0.5;
        const tx = Math.cos(a) * 25, ty = -25 + Math.sin(a) * 25;
        ctx.beginPath();
        ctx.moveTo(side * 3, -25);
        ctx.quadraticCurveTo(side * 3 + tx * 0.5 - tv.wag * 5, -25 + (ty + 25) * 0.5, tx, ty);
        ctx.stroke();
        ctx.fillStyle = rgba(whiten(glowCol, 0.4 + 0.5 * ears.fast), 1);
        ctx.beginPath(); ctx.arc(tx, ty, 2.6, 0, TURN); ctx.fill(); ctx.stroke();
      }
      // Feet.
      ctx.fillStyle = rgba(shade(c, 0.55), 1);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 16, 25); ctx.lineTo(side * 24, 25); ctx.lineTo(side * 27, 31); ctx.lineTo(side * 19, 31);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // The cabinet.
      const cab = ctx.createLinearGradient(0, -27, 0, 27);
      cab.addColorStop(0, rgba(whiten(c, 0.3), 1));
      cab.addColorStop(0.5, rgba(c, 1));
      cab.addColorStop(1, rgba(shade(c, 0.66), 1));
      ctx.fillStyle = cab;
      rounded(-37, -26, 74, 52, 9); ctx.fill(); ctx.stroke();
      // The side panel: two dials that turn with the low and the high end, and a speaker.
      for (let i = 0; i < 2; i++) {
        const y = i === 0 ? -13 : 0, a = -2.2 + tv.dials[i] * 4.4;
        ctx.fillStyle = rgba(shade(c, 0.5), 1);
        ctx.strokeStyle = dark;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(27, y, 4.3, 0, TURN); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = rgba(whiten(c, 0.7), 1);
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(27, y); ctx.lineTo(27 + Math.cos(a) * 3.3, y + Math.sin(a) * 3.3); ctx.stroke();
      }
      ctx.strokeStyle = rgba(whiten(glowCol, 0.3), 0.35 + 0.65 * tv.speaker);
      ctx.lineWidth = 1.3;
      for (const y of [10.5, 14.5, 18.5]) { ctx.beginPath(); ctx.moveTo(22.5, y); ctx.lineTo(31.5, y); ctx.stroke(); }
      // The screen: dark glass, lit a little by the voice.
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.6;
      const lit = live ? 0.1 + 0.16 * ears.fast : 0.05;
      const glass = ctx.createRadialGradient(-8, -4, 2, -8, 0, 34);
      glass.addColorStop(0, rgba([20 + glowCol[0] * lit, 24 + glowCol[1] * lit, 40 + glowCol[2] * lit], 1));
      glass.addColorStop(1, rgba([8, 10, 20], 1));
      ctx.fillStyle = glass;
      rounded(...SCREEN); ctx.fill(); ctx.stroke();
      ctx.save();
      rounded(...SCREEN); ctx.clip();
      if (tv.asleep) {
        // No signal: static, and a face asleep. A new picture for each step the pose's count
        // has taken (a long frame can take two; after a long time awake, only the last few).
        if (snow === null || tv.snow - snowAt > 4) snowAt = tv.snow - 1;
        while (snowAt < tv.snow) { snow = snowfall(); snowAt++; }
        for (let j = 0; j < SHADES.length; j++) {
          const list = snow[j];
          if (!list.length) continue;
          ctx.fillStyle = SHADES[j];
          ctx.beginPath();
          for (let i = 0; i < list.length; i += 3) ctx.rect(list[i], list[i + 1], list[i + 2], 1);
          ctx.fill();
          drawn.flecks += list.length / 3;
        }
        ctx.strokeStyle = rgba(line, 0.55);
        ctx.lineWidth = 1.5;
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(FACE_X + side * 8, -5, 3.4, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(FACE_X, 6, 2.2, 0, TURN); ctx.stroke();
      } else {
        // The face, in glowing lines: a wide soft pass, then the bright line. The mouth is the waveform itself.
        ctx.globalCompositeOperation = 'lighter';
        const shut = tv.blink, gain = cfgGain, last = waveform.length - 1;
        drawn.blink = shut; drawn.happy = ears.happy;
        ctx.strokeStyle = rgba(line, 1);
        for (const [wide, alpha] of [[4.2, 0.22], [1.7, 1]]) {
          ctx.lineWidth = wide;
          ctx.globalAlpha = alpha;
          for (const side of [-1, 1]) {
            const ex = FACE_X + side * 8.5 + tv.look * 1.5;
            ctx.beginPath();
            if (ears.happy) ctx.arc(ex, -3, 4.2, Math.PI * 1.15, Math.PI * 1.85);
            else { const h = 4.8 * (1 - shut) + 0.3; ctx.moveTo(ex, -5 - h); ctx.lineTo(ex, -5 + h); }
            ctx.stroke();
            if (alpha === 1) drawn.eyes++;
          }
          ctx.beginPath();
          for (let i = 0; i <= MOUTH_POINTS; i++) {
            const t = i / MOUTH_POINTS, arch = Math.sin(t * Math.PI);
            // The waveform with Gain, as the wave effects draw it; a sample of 0 is a real trough.
            const wave = Math.max(-1, Math.min(1, ((waveform[Math.floor(t * last)] ?? 128) - 128) / 128 * gain));
            const swing = wave * MOUTH_SWING * tv.open * arch;
            const x = FACE_X - 12 + t * 24, y = 8 + arch * 2.6 * tv.smile + swing;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            drawn.mouth = Math.max(drawn.mouth, Math.abs(swing));
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      // Scan lines, a band rolling down, and the shine on the glass.
      ctx.fillStyle = SCAN;
      ctx.beginPath();
      for (let y = SCREEN[1]; y < SCREEN[1] + SCREEN[3]; y += 2.4) ctx.rect(SCREEN[0], y, SCREEN[2], 0.9);
      ctx.fill();
      ctx.fillStyle = rgba(C.WHITE, 0.05);
      ctx.fillRect(SCREEN[0], SCREEN[1] + tv.roll * (SCREEN[3] + 8) - 6, SCREEN[2], 6);
      ctx.fillStyle = rgba(C.WHITE, 0.09);
      ctx.beginPath(); ctx.moveTo(-30, -19); ctx.lineTo(-14, -19); ctx.lineTo(-28, 4); ctx.lineTo(-30, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.restore();
    },

    // Test surface: what it hears (the slow and fast loudness, the low and high ends, the lean),
    // how far its mouth swings, the seconds it has heard, how awake it is and how far into its
    // idle rest, how far above its resting place it is drawn, where its middle is (an offset
    // from the frame's, with the hover in it), the px in one unit of its drawing, whether it
    // was drawn smaller to fit and whether the frame is holding it back, its tilt, how far its
    // antennae are sprung, its two dials, its speaker, the band on its screen and which picture
    // of static it is on, whether it is asleep, and from the last draw: whether its eyes were
    // happy and how far shut, the mouth's largest swing (in the set's own units), the flecks of
    // static and the eyes drawn.
    probe() {
      const e = tv.ears;
      return {
        loud: e.loud, fast: e.fast, low: e.low, high: e.high, lean: e.lean, happy: drawn.happy,
        open: tv.open, blink: drawn.blink, look: tv.look, clock: e.clock, awake: e.awake, rest: e.rest,
        lift: tv.lift, y: tv.cy, k: tv.k, shrink: tv.shrink, held: tv.held, tilt: tv.tilt, wag: tv.wag, dialLow: tv.dials[0], dialHigh: tv.dials[1], speaker: tv.speaker, roll: tv.roll, snow: tv.snow,
        asleep: tv.asleep, mouth: drawn.mouth, flecks: drawn.flecks, eyes: drawn.eyes,
      };
    },
  };
};
