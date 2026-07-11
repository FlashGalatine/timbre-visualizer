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
  let bassSlow = 0, bassFast = 0;
  let lastBeatAt = 0, lastIdleSpawnAt = 0;
  const ripples = [];
  const MAX_RIPPLES = 12;
  let lastFrame = performance.now();
  function spawnRipple(now, amp, atOrigin) {
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    const x = atOrigin ? 0 : (Math.random() * 2 - 1) * PLANE_HALF_X * 0.7;
    const z = atOrigin ? 0 : (Math.random() * 2 - 1) * PLANE_HALF_Z * 0.7;
    ripples.push({ x, z, age: 0, amp });
  }
  function project(x, y, z) {
    const tz = z - CAMERA_Z;
    const ty = y - CAMERA_Y;
    const ry = ty * cosT - tz * sinT;
    const rz = ty * sinT + tz * cosT;
    const depth = -rz;
    if (depth <= NEAR) return null;
    return {
      sx: W / 2 + (x / depth) * FOCAL,
      sy: H / 2 - (ry / depth) * FOCAL,
      depth,
    };
  }
  function rippleHeight(rip, wx, wz) {
    const dx = wx - rip.x;
    const dz = wz - rip.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const waveSpeed = 80;
    const waveLen = 26;
    const k = (Math.PI * 2) / waveLen;
    const radius = rip.age * waveSpeed;
    const ringWidth = 18;
    const env = Math.exp(-Math.pow((dist - radius) / ringWidth, 2));
    return rip.amp * env * Math.sin(k * (dist - radius));
  }
  return {
    start() {
      ripples.length = 0;
      spawnRipple(performance.now(), 5, true);
      lastFrame = performance.now();
    },
    draw(now) {
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const fadeAmount = 0.35 * cfgEffectBgOpacity;
      if (fadeAmount > 0.001) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else {
        ctx.clearRect(0, 0, W, H);
      }
      let bassInst = 0;
      if (micActive && frequencies && frequencies.length >= 4) {
        bassInst = ((frequencies[0] + frequencies[1] + frequencies[2] + frequencies[3]) / 4 / 255) * cfgGain;
      }
      bassSlow = bassSlow * 0.96 + bassInst * 0.04;
      bassFast = bassFast * 0.55 + bassInst * 0.45;
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
        if (r.amp < 0.05 || r.age > 10) ripples.splice(i, 1);
      }
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const points = [];
      for (let j = 0; j < GRID_Z; j++) {
        const wz = -PLANE_HALF_Z + j * SPACING;
        for (let i = 0; i < GRID_X; i++) {
          const wx = -PLANE_HALF_X + i * SPACING;
          let wy = 0;
          for (let r = 0; r < ripples.length; r++) {
            wy += rippleHeight(ripples[r], wx, wz);
          }
          const p = project(wx, wy, wz);
          if (!p) continue;
          const heightT = Math.min(1, Math.abs(wy) / 6);
          const rgb = getColor(colorT + (j / GRID_Z) * 0.6 + heightT * 0.4);
          points.push({ sx: p.sx, sy: p.sy, depth: p.depth, rgb, heightT });
        }
      }
      points.sort((a, b) => b.depth - a.depth);
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const sizeScale = Math.min(2.4, 110 / p.depth);
        const radius = (0.8 + sizeScale * 0.6 + p.heightT * 1.2) * SCALE;
        const alpha = Math.max(0.25, Math.min(1, sizeScale * 0.55 + p.heightT * 0.5));
        ctx.fillStyle = `rgba(${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
};
