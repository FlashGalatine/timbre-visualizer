/* ── orbit (band-driven orbiting particles) ── */
VIZ_FACTORIES['orbit'] = function () {
  const MIN_R = 12 * SCALE;
  const MAX_R = 54 * SCALE;
  const PARTICLE_LIFE = 1100;
  const MAX_PARTICLES = 60;
  const FADE_ALPHA = 0.22;
  const PARTICLE_SM = Math.max(2, Math.round(2 * SCALE));
  const PARTICLE_LG = Math.max(2, Math.round(3 * SCALE));
  const HILITE = Math.max(1, Math.round(SCALE));
  let particles = [];
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
  function spawnParticle(now, bass, mid, treble) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const r = MIN_R + (MAX_R - MIN_R) * (0.3 + bass * 0.7) * (0.5 + Math.random() * 0.5);
    const baseOmega = 0.012 + treble * 0.06;
    particles.push({
      angle: Math.random() * Math.PI * 2,
      radius: r,
      omega: baseOmega * dir,
      born: now,
      life: PARTICLE_LIFE,
      colorOffset: mid * 1.5 + Math.random() * 0.6,
      size: bass > 0.35 ? PARTICLE_LG : PARTICLE_SM,
    });
    if (particles.length > MAX_PARTICLES) particles.shift();
  }
  return {
    start() { particles = []; },
    draw() {
      ctx.fillStyle = `rgba(10, 10, 26, ${FADE_ALPHA})`;
      ctx.fillRect(0, 0, W, H);
      const CX = W / 2, CY = H / 2;
      const now = Date.now();
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      let bass, mid, treble;
      if (micActive && frequencies) {
        bass = bandAverage(0, 0.18);
        mid = bandAverage(0.18, 0.55);
        treble = bandAverage(0.55, 1.0);
      } else if (cfgIdleAnim) {
        const t = now / 800;
        bass = 0.18 + 0.05 * Math.sin(t);
        mid = 0.18 + 0.05 * Math.sin(t * 1.3);
        treble = 0.18 + 0.05 * Math.sin(t * 1.7);
      } else { bass = 0; mid = 0; treble = 0; }
      smoothBass += (bass - smoothBass) * 0.2;
      smoothMid += (mid - smoothMid) * 0.2;
      smoothTreble += (treble - smoothTreble) * 0.25;
      const densityFactor = 0.4 + (perViz['orbit'].density / 100) * 1.6;
      const spawnP = micActive
        ? Math.min(0.95, smoothBass * 1.4 * densityFactor)
        : 0.04 * densityFactor;
      if (Math.random() < spawnP) spawnParticle(now, smoothBass, smoothMid, smoothTreble);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.08)';
      ctx.lineWidth = Math.max(1, SCALE);
      ctx.beginPath();
      ctx.arc(CX, CY, (MIN_R + MAX_R) / 2, 0, Math.PI * 2);
      ctx.stroke();
      const stillAlive = [];
      const omegaScale = 1 + smoothTreble * 2.5;
      for (const p of particles) {
        const age = now - p.born;
        if (age >= p.life) continue;
        p.angle += p.omega * omegaScale;
        const lifeT = age / p.life;
        const alpha = (1 - lifeT) * (0.6 + 0.4 * (1 - lifeT));
        const rNow = p.radius + smoothMid * 6 * SCALE * (1 - lifeT);
        const x = Math.round(CX + Math.cos(p.angle) * rNow);
        const y = Math.round(CY + Math.sin(p.angle) * rNow);
        const rgb = getColor(colorT + p.colorOffset);
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
        ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.fillRect(x - HILITE, y - HILITE, HILITE, HILITE);
        stillAlive.push(p);
      }
      particles = stillAlive;
      const coreR = (2 + Math.round(smoothBass * 4)) * SCALE;
      const cRgb = getColor(colorT + 0.5);
      const tipRgb = [Math.min(255, cRgb[0] + 80), Math.min(255, cRgb[1] + 80), Math.min(255, cRgb[2] + 80)];
      ctx.fillStyle = `rgb(${tipRgb[0]}, ${tipRgb[1]}, ${tipRgb[2]})`;
      ctx.fillRect(CX - coreR, CY - coreR, coreR * 2, coreR * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const ch = Math.max(2, Math.round(2 * SCALE));
      ctx.fillRect(CX - ch / 2, CY - ch / 2, ch, ch);
    },
  };
};
