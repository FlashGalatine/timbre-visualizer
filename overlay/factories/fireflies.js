/* ── fireflies (twinkling drifting particles) ── */
VIZ_FACTORIES['fireflies'] = function () {
  const FIREFLY_LIFE = 1600;
  const MAX_FIREFLIES = 80;
  const FADE_ALPHA = 0.15;
  const MIN_SPEED = 0.3 * SCALE;
  const MAX_SPEED = 1.6 * SCALE;
  const START_JITTER = 14 * SCALE;
  const SIZE_SM = Math.max(2, Math.round(2 * SCALE));
  const SIZE_LG = Math.max(2, Math.round(3 * SCALE));
  const HILITE = Math.max(1, Math.round(SCALE));
  let fireflies = [];
  let smoothBass = 0, smoothMid = 0, smoothTreble = 0;
  function bandAverage(start, end) {
    if (!frequencies || frequencies.length === 0) return 0;
    const lo = Math.floor(start * frequencies.length);
    const hi = Math.min(frequencies.length, Math.floor(end * frequencies.length));
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += frequencies[i];
    const n = Math.max(1, hi - lo);
    return (sum / (n * 255)) * cfgGain;
  }
  function spawnFirefly(now, vol) {
    const angle = Math.random() * Math.PI * 2;
    const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED) * (0.6 + vol * 0.8);
    fireflies.push({
      x: W / 2 + (Math.random() - 0.5) * START_JITTER,
      y: H / 2 + (Math.random() - 0.5) * START_JITTER,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      born: now,
      life: FIREFLY_LIFE * (0.7 + Math.random() * 0.6),
      colorOffset: Math.random() * PALETTE.length,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.05 + Math.random() * 0.08,
      size: vol > 0.4 ? SIZE_LG : SIZE_SM,
    });
    if (fireflies.length > MAX_FIREFLIES) fireflies.shift();
  }
  return {
    start() { fireflies = []; ctx.clearRect(0, 0, W, H); },
    draw() {
      const fadeAmount = FADE_ALPHA * cfgEffectBgOpacity;
      if (fadeAmount > 0.001) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      const now = Date.now();
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      let bass, mid, treble;
      if (micActive && frequencies) {
        bass = bandAverage(0, 0.18);
        mid = bandAverage(0.18, 0.55);
        treble = bandAverage(0.55, 1.0);
      } else if (cfgIdleAnim) {
        const t = now / 900;
        bass = 0.18 + 0.05 * Math.sin(t);
        mid = 0.18 + 0.05 * Math.sin(t * 1.3);
        treble = 0.18 + 0.05 * Math.sin(t * 1.7);
      } else { bass = 0; mid = 0; treble = 0; }
      smoothBass += (bass - smoothBass) * 0.2;
      smoothMid += (mid - smoothMid) * 0.2;
      smoothTreble += (treble - smoothTreble) * 0.25;
      const densityFactor = 0.4 + (perViz['fireflies'].density / 100) * 1.6;
      const spawnP = micActive
        ? Math.min(0.95, smoothBass * 1.6 * densityFactor)
        : (cfgIdleAnim ? 0.05 * densityFactor : 0);
      if (Math.random() < spawnP) spawnFirefly(now, smoothBass + smoothMid);
      if (micActive && smoothBass > 0.5 && Math.random() < smoothBass * 0.4) {
        for (let k = 0; k < 3; k++) spawnFirefly(now, smoothBass);
      }
      const speedScale = 1 + smoothTreble * 1.6;
      const stillAlive = [];
      for (const f of fireflies) {
        const age = now - f.born;
        if (age >= f.life) continue;
        f.x += f.vx * speedScale;
        f.y += f.vy * speedScale;
        if (f.x < -2) f.x = W + 2;
        if (f.x > W + 2) f.x = -2;
        if (f.y < -2) f.y = H + 2;
        if (f.y > H + 2) f.y = -2;
        const lifeT = age / f.life;
        const baseAlpha = (1 - lifeT) * 0.95;
        f.twinklePhase += f.twinkleSpeed;
        const twinkle = 0.5 + 0.5 * Math.sin(f.twinklePhase);
        const alpha = Math.max(0, baseAlpha * (0.35 + twinkle * 0.65));
        const rgb = getColor(colorT + f.colorOffset);
        const x = Math.round(f.x), y = Math.round(f.y);
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha * 0.3})`;
        ctx.fillRect(x - f.size, y - f.size, f.size * 2, f.size * 2);
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
        ctx.fillRect(x - f.size / 2, y - f.size / 2, f.size, f.size);
        if (twinkle > 0.85) {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
          ctx.fillRect(x, y, HILITE, HILITE);
        }
        stillAlive.push(f);
      }
      fireflies = stillAlive;
    },
  };
};
