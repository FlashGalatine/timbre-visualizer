/* ── galaxy-ripple (beat-driven ripples on a 3D particle field) ── */
VIZ_FACTORIES['galaxy-ripple'] = function () {
  const GRID_X = 36;
  const GRID_Z = 24;
  const SPACING = 7;
  const PLANE_HALF_X = ((GRID_X - 1) * SPACING) / 2;
  const PLANE_HALF_Z = ((GRID_Z - 1) * SPACING) / 2;
  const FOCAL = 110 * SCALE;
  const NEAR = 6;
  const CAMERA_Y = 28;
  const CAMERA_Z = 110;
  const TILT = -0.55;
  const cosT = Math.cos(-TILT);
  const sinT = Math.sin(-TILT);
  const VEIL = 0.35;                         // the share a 60 fps frame's fade takes off the trail, at Trail veil 100
  const SLOW_RATE = -60 * Math.log(0.96);    // the slow bass level keeps 96% of itself over a 60 fps frame,
  const FAST_RATE = -60 * Math.log(0.55);    // the fast one 55%
  const WAVE_SPEED = 80;
  const WAVE_K = (Math.PI * 2) / 26;         // a wave is 26 long
  const RING_WIDTH = 18;
  /* Further than this from its ring a ripple lifts a point by less than a part in 10^15 of its
     height: such a point skips it, and a ripple whose ring is that far past the plane's
     farthest corner is retired. */
  const GONE = 6 * RING_WIDTH;
  const HEIGHT_STEPS = 32;                   // a point's height picks its colour and alpha in this many steps,
  const ALPHA_STEPS = 64;                    // and its alpha is one of this many
  const TAU = Math.PI * 2;
  let bassSlow = 0, bassFast = 0;
  let lastBeatAt = 0, lastIdleSpawnAt = 0;
  let born = 0;
  const ripples = [];
  const MAX_RIPPLES = 12;
  // The live ripples, as the points read them, and one row of points as it is drawn.
  const ripX = new Float64Array(MAX_RIPPLES), ripZ = new Float64Array(MAX_RIPPLES), ripRadius = new Float64Array(MAX_RIPPLES), ripAmp = new Float64Array(MAX_RIPPLES);
  const rowX = new Float64Array(GRID_X), rowY = new Float64Array(GRID_X), rowRadius = new Float64Array(GRID_X), rowKey = new Int32Array(GRID_X);
  function spawnRipple(now, amp, atOrigin) {
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    const x = atOrigin ? 0 : (Math.random() * 2 - 1) * PLANE_HALF_X * 0.7;
    const z = atOrigin ? 0 : (Math.random() * 2 - 1) * PLANE_HALF_Z * 0.7;
    // far: how far the plane's farthest corner is from where the ripple starts.
    ripples.push({ x, z, age: 0, amp, far: Math.hypot(Math.abs(x) + PLANE_HALF_X, Math.abs(z) + PLANE_HALF_Z) });
    born++;
  }
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
      ripples.length = 0;
      born = 0;
      spawnRipple(performance.now(), 5, true);
    },
    draw(now, dt) {
      const veil = VEIL * cfgEffectBgOpacity;
      const share = fadeOrClear(veil, dt);
      let bassInst = 0;
      if (micActive && micBands) {
        bassInst = TimbreHelix.heard('bass', micBands) * cfgGain;   // what values 0-3 of the 750 Hz spectrum gave (helix.js)
      }
      bassSlow = ema(bassSlow, bassInst, SLOW_RATE, dt);
      bassFast = ema(bassFast, bassInst, FAST_RATE, dt);
      const sens = perViz['galaxy-ripple'].sensitivity;
      const thresholdFactor = 1.8 - (sens / 100) * 1.2;
      const threshold = bassSlow * thresholdFactor + 0.05;
      const refractoryMs = 220 - (sens / 100) * 120;
      if (bassFast > threshold && now - lastBeatAt > refractoryMs && bassInst > 0.18) {
        spawnRipple(now, Math.min(8, 3 + bassInst * 8), false);
        lastBeatAt = now;
      }
      if ((!micActive || bassInst < 0.05) && cfgIdleAnim && now - lastIdleSpawnAt > 2400) {
        spawnRipple(now, 4, false);
        lastIdleSpawnAt = now;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.age += dt;
        r.amp *= Math.exp(-dt * 0.55);
        if (r.amp < 0.05 || r.age > 10 || r.age * WAVE_SPEED > r.far + GONE) ripples.splice(i, 1);
      }
      const live = ripples.length;
      for (let r = 0; r < live; r++) {
        const rip = ripples[r];
        ripX[r] = rip.x; ripZ[r] = rip.z; ripRadius[r] = rip.age * WAVE_SPEED; ripAmp[r] = rip.amp;
      }
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      // Row by row, the farthest first. A row's points that share a colour and an alpha are
      // one path and one fill.
      for (let j = 0; j < GRID_Z; j++) {
        const wz = -PLANE_HALF_Z + j * SPACING;
        const tz = wz - CAMERA_Z;
        let count = 0;
        for (let i = 0; i < GRID_X; i++) {
          const wx = -PLANE_HALF_X + i * SPACING;
          let wy = 0;
          for (let r = 0; r < live; r++) {
            const dx = wx - ripX[r];
            const dz = wz - ripZ[r];
            const off = Math.sqrt(dx * dx + dz * dz) - ripRadius[r];
            if (off > GONE || off < -GONE) continue;
            wy += ripAmp[r] * Math.exp(-Math.pow(off / RING_WIDTH, 2)) * Math.sin(WAVE_K * off);
          }
          const ty = wy - CAMERA_Y;
          const depth = -(ty * sinT + tz * cosT);
          if (depth <= NEAR) continue;
          const heightT = Math.min(1, Math.abs(wy) / 6);
          const stepped = Math.round(heightT * HEIGHT_STEPS) / HEIGHT_STEPS;
          const sizeScale = Math.min(2.4, 110 / depth);
          const alpha = trailAlpha(Math.max(0.25, Math.min(1, sizeScale * 0.55 + stepped * 0.5)), veil, share);
          rowX[count] = W / 2 + (wx / depth) * FOCAL;
          rowY[count] = H / 2 - ((ty * cosT - tz * sinT) / depth) * FOCAL;
          rowRadius[count] = (0.8 + sizeScale * 0.6 + heightT * 1.2) * SCALE;
          rowKey[count] = paletteStep(colorT + (j / GRID_Z) * 0.6 + stepped * 0.4) * (ALPHA_STEPS + 1) + Math.round(alpha * ALPHA_STEPS);
          count++;
        }
        for (let i = 0; i < count; i++) {
          const key = rowKey[i];
          if (key < 0) continue;
          ctx.fillStyle = PALETTE_CSS[Math.floor(key / (ALPHA_STEPS + 1))];
          ctx.globalAlpha = (key % (ALPHA_STEPS + 1)) / ALPHA_STEPS;
          ctx.beginPath();
          for (let m = i; m < count; m++) {
            if (rowKey[m] !== key) continue;
            rowKey[m] = -1;
            ctx.moveTo(rowX[m] + rowRadius[m], rowY[m]);
            ctx.arc(rowX[m], rowY[m], rowRadius[m], 0, TAU);
          }
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
    /* For the checks: the two bass levels, the ripples alive, and how many there have been. */
    probe() { return { slow: bassSlow, fast: bassFast, ripples: ripples.length, born }; },
  };
};
