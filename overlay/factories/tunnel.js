/* ── tunnel (perspective neon pipe — circular ribs + wall rails, bends with audio) ── */
VIZ_FACTORIES['tunnel'] = function () {
  const STREAKS = 14;
  const RINGS = 18;
  const RING_SPACING = 16;
  const TUNNEL_RADIUS = 22;
  const FOCAL = 110 * SCALE;
  const NEAR = 4;
  const HIST = RINGS + 2;
  const VEIL = 0.22;                           // the share a 60 fps frame's fade takes off the trail, at Trail veil 100
  const BEND_RATE = -60 * Math.log(1 - 0.14);  // the bend closes 14% of the way to its target over a 60 fps frame
  const WASH = 8;                              // the wash over the walls is painted at an eighth of the size
  /* Loudness sampled as each rib spawns at the far end, indexed by stable ring id,
     so pulses ride the ribs toward the viewer instead of flickering in place. */
  const pulseHist = new Float32Array(HIST);
  let roll = 0;
  let bendX = 0, bendY = 0, bendTargetX = 0, bendTargetY = 0;
  let nextBendChangeAt = 0;
  let scrollProgress = 0;
  let wash = null, washCtx = null;
  /* The alpha to paint with over a trail, so that what stands still is as bright at any frame
     rate. `alpha` is what is painted at 60 fps, `veil` the share a 60 fps frame's fade takes
     off, `share` what this frame's fade took off (fadeOrClear's answer). At 60 fps, and when
     the canvas is cleared instead, it is `alpha` itself. */
  function trailAlpha(alpha, veil, share) {
    if (!(veil > 0.001) || veil >= 1 || share >= 1 || Math.abs(share - veil) < 1e-9) return alpha;
    const settled = alpha / (1 - (1 - alpha) * (1 - veil));
    return (settled * share) / (1 - (1 - share) * settled);
  }
  return {
    start() {
      bendX = 0; bendY = 0; bendTargetX = 0; bendTargetY = 0;
      nextBendChangeAt = 0; scrollProgress = 0; roll = 0;
      pulseHist.fill(0);
    },
    draw(now, dt) {
      const cfgBend = perViz['tunnel'].bend;
      const veil = VEIL * cfgEffectBgOpacity;
      const trails = veil > 0.001;
      const share = fadeOrClear(veil, dt);
      let loudness = 0;
      if (micActive && frequencies) {
        let sum = 0;
        for (let i = 0; i < frequencies.length; i++) sum += frequencies[i];
        loudness = (sum / (frequencies.length * 255)) * cfgGain;
      } else if (cfgIdleAnim) {
        loudness = 0.05 + 0.05 * Math.sin(now / 1100);
      }
      if (now >= nextBendChangeAt) {
        const bendMag = (cfgBend / 100) * 70 * Math.max(0.1, loudness * 2.4);
        bendTargetX = (Math.random() * 2 - 1) * bendMag;
        bendTargetY = (Math.random() * 2 - 1) * bendMag * 0.6;
        nextBendChangeAt = now + 350 + Math.random() * 600;
      }
      bendX = ema(bendX, bendTargetX, BEND_RATE, dt);
      bendY = ema(bendY, bendTargetY, BEND_RATE, dt);
      const speed = 4 + loudness * 36;
      scrollProgress += speed * dt;
      roll += dt * (0.12 + loudness * 0.9);
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const baseIdx = Math.floor(scrollProgress / RING_SPACING);
      pulseHist[(baseIdx + RINGS - 1) % HIST] = Math.min(1, loudness);
      const streakPoints = new Array(STREAKS);
      for (let s = 0; s < STREAKS; s++) streakPoints[s] = [];
      const rings = [];
      for (let r = RINGS - 1; r >= 0; r--) {
        const z = (r * RING_SPACING) - (scrollProgress % RING_SPACING) + NEAR + 4;
        if (z <= NEAR) continue;
        const ringId = baseIdx + r;
        const t = r / (RINGS - 1);
        const k = t * t;
        const offsetX = bendX * k;
        const offsetY = bendY * k;
        const radius = TUNNEL_RADIUS * (1 + pulseHist[ringId % HIST] * 0.35);
        /* Every point of a rib shares one z, so its perspective projection is an
           exact circle — draw it with arc() instead of a point polygon. */
        const scale = FOCAL / z;
        const cx = W / 2 + offsetX * scale;
        const cy = H / 2 + offsetY * scale;
        rings.push({ cx, cy, rad: radius * scale, r, ringId, z });
        for (let s = 0; s < STREAKS; s++) {
          const ang = (s / STREAKS) * Math.PI * 2 + roll;
          streakPoints[s].push({
            sx: cx + Math.cos(ang) * radius * scale,
            sy: cy + Math.sin(ang) * radius * scale,
            z,
          });
        }
      }
      if (rings.length) {
        const far = rings[0];
        const rgb = getColor(colorT + 0.5);
        const glowR = Math.max(6 * SCALE, far.rad * 3.5);
        /* Trail fade accumulates repeated fills ~4x; compensate when trails are off. */
        const glowA = trailAlpha((trails ? 0.05 : 0.15) * (0.6 + loudness), veil, share);
        const g = ctx.createRadialGradient(far.cx, far.cy, 0, far.cx, far.cy, glowR);
        g.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${glowA})`);
        g.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(far.cx - glowR, far.cy - glowR, glowR * 2, glowR * 2);
        /* Faint wall wash — dark bore at the vanishing point, brighter toward
           the near walls, so the tube reads as volume, not concentric circles.
           It is so smooth and so faint that it is painted small, on a canvas of
           its own, and enlarged: a gradient over every pixel of the big canvas
           was most of what this effect cost. The small canvas holds it at full
           strength and it is drawn at its own faint alpha, so that none of its
           few levels are lost on the way. */
        const wallA = trailAlpha((trails ? 0.02 : 0.05) * (0.7 + loudness), veil, share);
        const washW = Math.ceil(W / WASH), washH = Math.ceil(H / WASH);
        if (!wash || wash.width !== washW || wash.height !== washH) {
          wash = document.createElement('canvas');
          wash.width = washW; wash.height = washH;
          washCtx = wash.getContext('2d');
          washCtx.globalCompositeOperation = 'copy';   // each fill replaces what was there
        }
        const wg = washCtx.createRadialGradient(far.cx / WASH, far.cy / WASH, (far.rad * 2) / WASH, far.cx / WASH, far.cy / WASH, (Math.max(W, H) * 0.8) / WASH);
        wg.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
        wg.addColorStop(1, `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
        washCtx.fillStyle = wg;
        washCtx.fillRect(0, 0, washW, washH);
        ctx.globalAlpha = wallA;
        ctx.drawImage(wash, 0, 0, washW * WASH, washH * WASH);
        ctx.globalAlpha = 1;
      }
      /* The ribs and the rails take their colours from the palette table and their
         alpha from globalAlpha, so no colour string is built for a stroke. */
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        const prox = 1 - ring.r / (RINGS - 1);
        const depthCurve = prox * prox;
        const nearFade = Math.min(1, (ring.z - NEAR) / 6);
        ctx.strokeStyle = getColorCss(colorT + 0.5 + ring.ringId * 0.07);
        ctx.globalAlpha = trailAlpha((0.05 + depthCurve * 0.32) * nearFade, veil, share);
        ctx.lineWidth = (0.6 + depthCurve * 2.6) * SCALE;
        ctx.beginPath();
        ctx.arc(ring.cx, ring.cy, ring.rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      const numBins = (frequencies && frequencies.length) || 32;
      function streakAmp(s) {
        if (micActive && frequencies) {
          const bin = Math.min(numBins - 1, Math.floor(s * numBins / STREAKS));
          return Math.min(1, (frequencies[bin] / 255) * cfgGain);
        }
        if (cfgIdleAnim) return 0.25 + 0.2 * Math.sin(s * 0.7 + now / 700);
        return 0.15;
      }
      /* Wall rails, stroked per segment with width and alpha ∝ 1/z so they taper
         and fade into the vanishing point — full-brightness polylines converge
         into a spoke knot at the center and read as a wheel, not a pipe.
         A rail is one colour, set once; each of its segments is one path, stroked
         twice: wide and faint, then narrow and bright. */
      ctx.lineCap = 'round';
      for (let s = 0; s < STREAKS; s++) {
        const pts = streakPoints[s];
        if (pts.length < 2) continue;
        ctx.strokeStyle = getColorCss(colorT + (s / STREAKS) * 1.6);
        const amp = streakAmp(s);
        const railW = (1.6 + amp * 2.6) * SCALE;
        for (let i = 0; i + 1 < pts.length; i++) {
          const persp = RING_SPACING * 2 / (pts[i].z + pts[i + 1].z);
          const reach = Math.min(1, persp * 2.4);
          ctx.beginPath();
          ctx.moveTo(pts[i].sx, pts[i].sy);
          ctx.lineTo(pts[i + 1].sx, pts[i + 1].sy);
          ctx.globalAlpha = trailAlpha(reach * (0.14 + amp * 0.4), veil, share);
          ctx.lineWidth = Math.max(0.5, railW * persp * 2);
          ctx.stroke();
          ctx.globalAlpha = trailAlpha(reach * (0.35 + amp * 0.55), veil, share);
          ctx.lineWidth = Math.max(0.4, railW * persp * 0.8);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    },
    /* For the checks: the bend and what it is making for. */
    probe() { return { bendX, bendY, targetX: bendTargetX, targetY: bendTargetY }; },
  };
};
