/* ── tunnel (perspective neon-streak tunnel that bends with audio) ── */
VIZ_FACTORIES['tunnel'] = function () {
  const STREAKS = 14;
  const RINGS = 18;
  const RING_SPACING = 16;
  const TUNNEL_RADIUS = 22;
  const FOCAL = 110 * SCALE;
  const NEAR = 4;
  const spokeJitter = new Array(STREAKS).fill(0).map(() => 0.85 + Math.random() * 0.3);
  let bendX = 0, bendY = 0, bendTargetX = 0, bendTargetY = 0;
  let nextBendChangeAt = 0;
  let scrollProgress = 0;
  let lastFrame = performance.now();
  function project(x, y, z) {
    if (z <= NEAR) return null;
    return {
      sx: W / 2 + (x / z) * FOCAL,
      sy: H / 2 + (y / z) * FOCAL,
      depth: z,
    };
  }
  return {
    start() {
      bendX = 0; bendY = 0; bendTargetX = 0; bendTargetY = 0;
      nextBendChangeAt = 0; scrollProgress = 0;
      lastFrame = performance.now();
    },
    draw(now) {
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const cfgBend = perViz['tunnel'].bend;
      const fadeAmount = 0.22 * cfgEffectBgOpacity;
      if (fadeAmount > 0.001) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else {
        ctx.clearRect(0, 0, W, H);
      }
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
      const ema = 0.14;
      bendX += (bendTargetX - bendX) * ema;
      bendY += (bendTargetY - bendY) * ema;
      const speed = 4 + loudness * 36;
      scrollProgress += speed * dt;
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const streakPoints = new Array(STREAKS);
      for (let s = 0; s < STREAKS; s++) streakPoints[s] = [];
      const ringPoints = new Array(RINGS);
      for (let r = RINGS - 1; r >= 0; r--) {
        const z = (r * RING_SPACING) - (scrollProgress % RING_SPACING) + NEAR + 4;
        const t = r / (RINGS - 1);
        const k = t * t;
        const offsetX = bendX * k;
        const offsetY = bendY * k;
        const rp = [];
        for (let s = 0; s < STREAKS; s++) {
          const ang = (s / STREAKS) * Math.PI * 2;
          const radius = TUNNEL_RADIUS * spokeJitter[s];
          const wx = offsetX + Math.cos(ang) * radius;
          const wy = offsetY + Math.sin(ang) * radius;
          const p = project(wx, wy, z);
          if (p) {
            streakPoints[s].push(p);
            rp.push(p);
          }
        }
        ringPoints[r] = rp;
      }
      ctx.lineWidth = Math.max(1, SCALE);
      for (let r = 0; r < RINGS; r++) {
        const pts = ringPoints[r];
        if (!pts || pts.length < 3) continue;
        const t = 1 - r / (RINGS - 1);
        const rgb = getColor(colorT + 0.5 + r / RINGS);
        ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.05 + t * 0.18})`;
        ctx.beginPath();
        ctx.moveTo(pts[0].sx, pts[0].sy);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
        ctx.closePath();
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
      ctx.lineCap = 'round';
      for (let s = 0; s < STREAKS; s++) {
        const pts = streakPoints[s];
        if (pts.length < 2) continue;
        const rgb = getColor(colorT + (s / STREAKS) * 1.6);
        const amp = streakAmp(s);
        ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.15 + amp * 0.45})`;
        ctx.lineWidth = (3 + amp * 5) * SCALE;
        ctx.beginPath();
        ctx.moveTo(pts[0].sx, pts[0].sy);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
        ctx.stroke();
        ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.4 + amp * 0.6})`;
        ctx.lineWidth = (1.2 + amp * 1.4) * SCALE;
        ctx.beginPath();
        ctx.moveTo(pts[0].sx, pts[0].sy);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
        ctx.stroke();
        const head = pts[pts.length - 1];
        const headRadius = (1.2 + amp * 3.2) * SCALE;
        ctx.fillStyle = `rgba(${Math.min(255, rgb[0]+80)}, ${Math.min(255, rgb[1]+80)}, ${Math.min(255, rgb[2]+80)}, ${0.5 + amp * 0.5})`;
        ctx.beginPath();
        ctx.arc(head.sx, head.sy, headRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
};
