/* ── pulse-rings (a ringed planet whose rings ripple with the voice, and which explodes on a hard peak) ──
   A glowing planet with a tilted ring disc, the far half of the rings behind it and the near
   half in front. The loudness is fed in at the inner edge of the rings and travels outward, so
   each syllable is a bright ripple crossing the disc and lifting the rings as it passes. Louder,
   the planet glows brighter and its storm and the ice in the rings turn faster; the low end
   swells the planet and the high end makes the ice glitter. A hard peak (a yell, a thump on the
   mic) blows the planet into chunks and the rings thin; after a calm wait the chunks drift back
   round the glowing core and snap together, and the rings fill back in.
   The ring disc, the cracks and the shading are TimbrePlanets in planets.js; the whole / pieces /
   returning machine and the sound levels are TimbreHelix's, so Pulse Rings hears what DNA hears
   and explodes by DNA's rules. Everything that moves runs on draw(now, dt); only the colour reads
   the wall clock, as the bar and wave effects do. */
VIZ_FACTORIES['pulse-rings'] = function () {
  const P = TimbrePlanets, HX = TimbreHelix;
  const R0 = 24;                                       // × SCALE: the planet's radius at rest
  const SWELL = 0.07;                                  // how far the low end swells it
  const LIFT = 3.2;                                    // × SCALE: how far a full ripple lifts a ring off the disc
  const LOUD_S = 0.25, FAST_S = 0.045;                 // the slow loudness (glow, spin) and the fast one (the ripple)
  const LOW_OPEN_S = 0.05, LOW_CLOSE_S = 0.25, HIGH_S = 0.08;
  const SPIN_MIN = 0.25, SPIN_LOUD = 1.6;              // the storm's turning, rad/s: silent, and added at full loudness
  const SPECKS = 64, SPECK_RATE = 1.1, SPECK_LOUD = 2.2; // the ice: how many, its turning at one planet radius, and how much loudness adds
  const GLITTER_RATE = 31;                             // rad/s
  const SHOCK_S = 0.8, SHOCK_REACH = 5;                // the blast's ring of light: how long it lasts and how many planet radii it grows
  const FLASH_S = 0.16;
  const AIM_SPREAD = 1.1;                              // rad: a chunk's push turns up to half this, either way, from straight out
  const STRIPES = [[0.62, 0.14, true], [0.3, 0.1, false], [0.02, 0.16, true], [-0.3, 0.09, false], [-0.6, 0.15, true]];
  const STORM_LAT = -0.33;                             // the storm's latitude, as a sine
  const HOT = [255, 220, 175], WHITE = [255, 255, 255];
  const QUIET = { loud: 0, low: 0, high: 0 };
  const TURN = 2 * Math.PI;
  const { rgba, whiten, shade } = P;
  const clamp01 = (v) => (v > 1 ? 1 : v > 0 ? v : 0);

  // Every random choice comes from one source, seedable through window.__pulseRingsSeed so the
  // render tests repeat.
  const random = HX.rng(window.__pulseRingsSeed);
  const rings = P.createRings();
  const machine = HX.createShatter({ random, aim: (x, y, w, h) => Math.atan2(y - h / 2, x - w / 2) + (random() - 0.5) * AIM_SPREAD });
  const specks = [];
  for (let i = 0; i < SPECKS; i++) specks.push({ u: random(), a: random() * TURN, tw: random() * TURN, size: 0.22 + 0.36 * random() });

  let clock = 0, loud = 0, fast = 0, low = 0, high = 0, spin = 0, flash = 0;
  let cutR = R0 * SCALE;                   // the planet's radius when it was last cut
  let carry = 1;                           // the planet is drawn this much larger than the sound says: it comes back together at the size it was cut, then relaxes
  let sinceReturn = -1;                    // seconds into the return (the machine's own progress), or -1
  let refilled = true;                     // whether the rings have been told to fill back in since the last blast
  let sinceBlast = Infinity, blastBefore = Infinity;   // seconds since the last blast and the one before, for their rings of light
  let blasts = 0, jostles = 0;
  const drawn = { ringAlpha: 0, sparkle: 0, halo: 0, core: 0, lift: 0, planetR: R0 * SCALE };   // what the last draw drew, for probe()

  // Each chunk notes which cloud bands cross it, and its own reach across and along the planet's
  // lean, so the bands and the storm are only painted into the chunks they touch.
  const cut = () => {
    const cx = W / 2, cy = H / 2, c = Math.cos(P.ROLL), s = Math.sin(P.ROLL), up = Math.sqrt(1 - P.TILT * P.TILT);
    return P.crack(cutR, P.PIECES, random).map((p) => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const v of p.pts) { const x = v[0] * c + v[1] * s, y = -v[0] * s + v[1] * c; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const stripes = STRIPES.filter(([lat, wide]) => {
        const rx = cutR * Math.sqrt(1 - lat * lat), top = -cutR * lat * up - cutR * wide / 2, bottom = -cutR * lat * up + rx * P.TILT + cutR * wide / 2;
        return bottom >= y0 && top <= y1;
      });
      return { pts: p.pts, lx: p.cx, ly: p.cy, cx: cx + p.cx, cy: cy + p.cy, stripes, x0, x1, y0, y1 };
    });
  };

  // One half of the rings and of the ice in them: the far half is drawn before the planet, the
  // near half after it.
  function ringHalf(front, CX, CY, colorT) {
    const r0 = R0 * SCALE, bands = rings.bands;
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(P.ROLL);
    ctx.lineCap = 'butt';
    ctx.lineWidth = (bands[1].radius - bands[0].radius) * r0 * 0.86;
    for (const b of bands) {
      if (b.alpha < 0.012) continue;
      ctx.save();
      ctx.translate(0, -b.lift * LIFT * SCALE);
      ctx.scale(1, P.TILT);                // the stroke is flattened with the circle, so a band is thin where the disc is seen edge on
      ctx.strokeStyle = rgba(b.col, b.alpha);
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * r0, front ? 0 : Math.PI, front ? Math.PI : TURN);
      ctx.stroke();
      ctx.restore();
      drawn.ringAlpha += b.alpha;
    }
    for (const s of specks) {
      const sn = Math.sin(s.a);
      if ((sn >= 0) !== front) continue;
      const b = bands[Math.min(bands.length - 1, Math.floor(s.u * bands.length))];
      const a = (0.25 + 0.75 * b.level) * (0.45 + 0.7 * high * (0.5 + 0.5 * Math.sin(clock * GLITTER_RATE + s.tw)) + 0.25 * loud) * (0.35 + 0.65 * b.show);
      if (a < 0.03) continue;
      ctx.fillStyle = rgba(whiten(b.col, 0.7), a);
      ctx.beginPath();
      ctx.arc(b.radius * r0 * Math.cos(s.a), b.radius * r0 * sn * P.TILT - b.lift * LIFT * SCALE, s.size * SCALE * (0.8 + 0.5 * b.level), 0, TURN);
      ctx.fill();
      drawn.sparkle += a;
    }
    ctx.restore();
  }

  // The cloud bands and the storm, on the whole planet or on one chunk of it (`piece`). The
  // centre is the origin and the caller has clipped to what is being painted.
  function surface(R, c, piece) {
    ctx.save();
    ctx.rotate(P.ROLL);
    P.paintBands(ctx, R, c, P.TILT, piece ? piece.stripes : STRIPES, 1);
    const k = Math.sqrt(1 - STORM_LAT * STORM_LAT), facing = Math.cos(spin);
    if (facing > 0.05) {                   // the storm is on the side turned toward the viewer
      const sx = R * k * Math.sin(spin), sy = -R * STORM_LAT * Math.sqrt(1 - P.TILT * P.TILT) + R * k * P.TILT * facing;
      const rx = R * 0.2 * (0.35 + 0.65 * facing), ry = R * 0.085;
      if (!piece || (sx + rx >= piece.x0 && sx - rx <= piece.x1 && sy + ry >= piece.y0 && sy - ry <= piece.y1)) {
        ctx.fillStyle = rgba(whiten(c, 0.75), 0.55 * facing);
        ctx.beginPath();
        ctx.ellipse(sx, sy, rx, ry, 0, 0, TURN);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function piecePath(p) {
    ctx.beginPath();
    ctx.moveTo(p.pts[0][0], p.pts[0][1]);
    for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
    ctx.closePath();
  }

  return {
    draw(now, dt) {
      dt = dt > 0 ? dt : 0;
      ctx.clearRect(0, 0, W, H);
      clock += dt;
      const knobs = perViz['pulse-rings'];
      const CX = W / 2, CY = H / 2;
      const live = micActive && !!waveform;
      const level = live ? HX.levels(frequencies, waveform, cfgGain) : QUIET;
      // What goes into the rings: the voice times the Sensitivity gain, or with the mic off and
      // the idle animation on, a slow ripple of its own. The planet breathes with it.
      const idle = !live && cfgIdleAnim;
      const sound = idle ? 0.2 + 0.25 * Math.pow(Math.max(0, Math.sin(clock * 1.4)), 3) : level.loud;
      const lowNow = idle ? 0.2 + 0.1 * Math.sin(now / 800) : level.low;
      loud = HX.follow(loud, sound, dt, LOUD_S);
      fast = HX.follow(fast, sound, dt, FAST_S);
      low = HX.follow(low, lowNow, dt, lowNow > low ? LOW_OPEN_S : LOW_CLOSE_S);
      high = HX.follow(high, level.high, dt, HIGH_S);
      spin += dt * (SPIN_MIN + SPIN_LOUD * loud);
      flash *= Math.exp(-dt / FLASH_S);
      sinceBlast += dt;
      blastBefore += dt;
      carry = HX.follow(carry, 1, dt, LOW_CLOSE_S);
      const Rsound = R0 * SCALE * (1 + SWELL * low);

      // The explosion machine. The peak is the raw input level, before Gain: the mic's loudest
      // moment across at least the last two intervals when the capture code gives it, else the
      // peak of the waveform.
      if (machine.state === 'whole') cutR = Rsound * carry;
      const returning = machine.state === 'returning';
      const event = machine.step({
        now, dt, live,
        peak: typeof micPeak === 'number' ? micPeak : HX.peakOf(waveform),
        threshold: HX.threshold(knobs.explodeSensitivity),
        reconnectS: knobs.reconnectSeconds,
        W, H, scale: SCALE, cut,
      });
      // What the rings are told this frame: a blast (the chunks start to move on the next frame, so
      // it counts from this frame's end), or a refill, from the moment the return reached its snap.
      let blastAgo, refillAgo;
      const blast = () => { blastAgo = 0; blastBefore = sinceBlast; sinceBlast = 0; refilled = false; };
      if (returning && !event) sinceReturn += dt;           // in step with the machine's own progress through the return
      if (event === 'shatter') { blast(); flash = 1; sinceReturn = -1; blasts++; }
      else if (event === 'jostle') {
        jostles++;
        flash = Math.max(flash, 0.3);
        if (returning) { blast(); flash = Math.max(flash, 0.6); }   // a peak during the return blows it out again
        sinceReturn = -1;
      } else if (event === 'return') sinceReturn = 0;
      else if (event === 'whole') {
        // The planet is the size it was cut at, and relaxes from there.
        carry = cutR / Rsound;
        flash = Math.max(flash, 0.55);
        if (!refilled) { refillAgo = Math.max(0, sinceReturn + dt - HX.HANDOVER_U * HX.RETURN_S); refilled = true; }
        sinceReturn = -1;
      } else if (event === 'reset') { rings.reset(); flash = 0; carry = 1; sinceReturn = -1; refilled = true; sinceBlast = Infinity; blastBefore = Infinity; }
      if (!refilled && sinceReturn >= HX.HANDOVER_U * HX.RETURN_S) { refillAgo = sinceReturn - HX.HANDOVER_U * HX.RETURN_S; refilled = true; }
      rings.step({ dt, level: idle ? sound : clamp01(fast * P.gain(knobs.sensitivity)), flow: knobs.flow, blastAgo, refillAgo });

      const pieces = machine.pieces, whole = !pieces;
      const R = whole ? Rsound * carry : cutR;
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const c = getColor(colorT + 0.5);
      for (const b of rings.bands) {
        b.col = whiten(getColor(colorT + 1.2 + 1.3 * b.u), 0.55 * b.level * b.level);
        b.alpha = (P.ringRest(b.u) * (0.13 + 0.87 * b.level) + 0.5 * b.shock) * b.show;
      }
      for (const s of specks) {
        const r = P.INNER + s.u * (P.OUTER - P.INNER);
        s.a = (s.a + dt * (SPECK_RATE / Math.pow(r, 1.5)) * (1 + SPECK_LOUD * loud)) % TURN;
      }
      drawn.ringAlpha = 0; drawn.sparkle = 0; drawn.planetR = R;
      drawn.lift = rings.bands.reduce((m, b) => Math.max(m, b.lift), 0) * LIFT * SCALE;

      ctx.save();
      // The glow around the planet, swelling with the low end.
      ctx.globalCompositeOperation = 'lighter';
      const haloR = R * (1.6 + 0.7 * low), haloA = whole ? 0.2 + 0.2 * loud + 0.3 * fast : 0.1;
      const halo = ctx.createRadialGradient(CX, CY, R * 0.7, CX, CY, haloR);
      halo.addColorStop(0, rgba(whiten(c, 0.25), haloA));
      halo.addColorStop(0.45, rgba(c, haloA * 0.3));
      halo.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(CX, CY, haloR, 0, TURN);
      ctx.fill();
      drawn.halo = haloA;

      ringHalf(false, CX, CY, colorT);

      // The planet, whole or in chunks. A chunk carries its own part of the planet's shading and
      // clouds, so the chunks make the whole planet again when they are back in place.
      ctx.globalCompositeOperation = 'source-over';
      const body = P.bodyFill(ctx, R, c, -0.36, -0.42, 1);
      if (whole) {
        ctx.save();
        ctx.translate(CX, CY);
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, TURN);
        ctx.fill();
        ctx.clip();
        surface(R, c);
        ctx.restore();
        drawn.core = 0;
      } else {
        // The glowing core the chunks left behind; it still beats with the voice.
        ctx.globalCompositeOperation = 'lighter';
        const coreR = R * (0.5 + 0.35 * low + 0.3 * fast);
        const core = ctx.createRadialGradient(CX, CY, 0, CX, CY, coreR);
        core.addColorStop(0, rgba(WHITE, 0.95));
        core.addColorStop(0.3, rgba(whiten(c, 0.5), 0.7));
        core.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(CX, CY, coreR, 0, TURN);
        ctx.fill();
        drawn.core = coreR;
        for (const p of pieces) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.translate(p.cx + p.ox, p.cy + p.oy);
          ctx.rotate(p.rot);
          ctx.translate(-p.lx, -p.ly);
          piecePath(p);
          ctx.fillStyle = body;
          ctx.fill();
          ctx.save();
          ctx.clip();
          surface(R, c, p);
          ctx.restore();
          if (p.heat > 0.02) {             // freshly broken, or just fused, edges glow
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = rgba(HOT, 0.9 * p.heat);
            ctx.lineWidth = 1.3 * SCALE;
            ctx.lineJoin = 'round';
            piecePath(p);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      ctx.globalCompositeOperation = 'lighter';
      ringHalf(true, CX, CY, colorT);

      // The blast: a ring of light sweeping out in the plane of the rings (and the one before it,
      // if that has not faded yet), and a flash.
      for (const since of [sinceBlast, blastBefore]) {
        const sp = since / SHOCK_S;
        if (!(sp < 1)) continue;
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(P.ROLL);
        ctx.scale(1, P.TILT);
        ctx.strokeStyle = rgba(whiten(c, 0.7), 0.9 * (1 - sp) * (1 - sp));
        ctx.lineWidth = (3.2 - 2.2 * sp) * SCALE;
        ctx.beginPath();
        ctx.arc(0, 0, R0 * SCALE * (1 + SHOCK_REACH * (1 - (1 - sp) * (1 - sp))), 0, TURN);
        ctx.stroke();
        ctx.restore();
      }
      if (flash > 0.02) {
        const fr = R * (1.4 + 2.6 * flash);
        const fg = ctx.createRadialGradient(CX, CY, 0, CX, CY, fr);
        fg.addColorStop(0, rgba(WHITE, 0.9 * flash));
        fg.addColorStop(0.4, rgba(whiten(c, 0.6), 0.45 * flash));
        fg.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(CX, CY, fr, 0, TURN);
        ctx.fill();
      }
      ctx.restore();
    },

    // Test surface: the machine's state and how many chunks there are, the blasts and jostles so
    // far, whether every chunk's middle is inside the canvas, the smoothed loudness, low and high
    // ends, the planet's radius and its storm's angle, how whole the rings are on average, what
    // the inner, middle and outer bands are replaying, the tallest lift and the outer edge in
    // px, and from the last draw: the rings' opacity added up, the ice's, the glow's, and the
    // core's radius (0 when the planet is whole).
    probe() {
      const b = rings.bands, pieces = machine.pieces;
      return {
        state: machine.state, pieces: pieces ? pieces.length : 0, blasts, jostles,
        inside: !pieces || pieces.every((p) => p.cx + p.ox >= 0 && p.cx + p.ox <= W && p.cy + p.oy >= 0 && p.cy + p.oy <= H),
        loud, low, high, planetR: drawn.planetR, spin,
        show: b.reduce((sum, x) => sum + x.show, 0) / b.length,
        levelIn: b[0].level, levelMid: b[b.length >> 1].level, levelOut: b[b.length - 1].level,
        lift: drawn.lift, reach: b[b.length - 1].radius * R0 * SCALE,
        ringAlpha: drawn.ringAlpha, sparkle: drawn.sparkle, halo: drawn.halo, core: drawn.core,
      };
    },
  };
};
