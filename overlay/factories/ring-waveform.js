/* ── ring-waveform (waveform displaced around a circle, smooth ring with echoes) ── */
VIZ_FACTORIES['ring-waveform'] = function () {
  const BASE_R = 32 * SCALE;
  const LW = Math.max(1.5, 2.2 * SCALE);
  const echoes = TimbreGlow.createEchoes();
  function getSampleAt(i, n) {
    if (micActive && waveform) {
      const idx = i % waveform.length;
      return ((waveform[idx] - 128) / 128) * cfgGain;
    }
    if (!cfgIdleAnim) return 0;
    const angle = (i / n) * Math.PI * 2;
    const t = Date.now() / 600;
    return 0.18 * Math.sin(angle * 3 + t) + 0.08 * Math.sin(angle * 7 - t * 1.3);
  }
  return {
    draw(now, dt) {
      ctx.clearRect(0, 0, W, H);
      const CX = W / 2, CY = H / 2;
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const live = micActive && !!waveform;
      const N = live ? waveform.length : 64;
      const amplitude = perViz['ring-waveform'].amplitude;
      const AMPLITUDE = (4 + (amplitude / 100) * 28) * SCALE;

      const xs = new Float32Array(N);
      const ys = new Float32Array(N);
      let loudness = 0;
      for (let i = 0; i < N; i++) {
        const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
        const sample = getSampleAt(i, N);
        const a = Math.abs(sample);
        if (a > loudness) loudness = a;
        const r = BASE_R + sample * AMPLITUDE;
        xs[i] = CX + Math.cos(angle) * r;
        ys[i] = CY + Math.sin(angle) * r;
      }

      // Nine-stop gradient running around the ring from the top. Chromium before
      // 99 (older OBS builds) has no conic gradient: the mid colour stands in.
      const mid = getColor(colorT + 0.75);
      const midRgb = `rgb(${mid[0]}, ${mid[1]}, ${mid[2]})`;
      let grad = midRgb;
      if (typeof ctx.createConicGradient === 'function') {
        grad = ctx.createConicGradient(-Math.PI / 2, CX, CY);
        for (let k = 0; k <= 8; k++) {
          const c = getColor(colorT + (k / 8) * 1.5);
          grad.addColorStop(k / 8, `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
        }
      }

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.10)';
      ctx.lineWidth = Math.max(1, SCALE);
      ctx.beginPath();
      ctx.arc(CX, CY, BASE_R, 0, Math.PI * 2);
      ctx.stroke();

      // Afterglow: echoes of recent loud moments, oldest first, behind the live ring.
      echoes.sync(N + ':' + W + ':' + H);
      const list = echoes.step(loudness, now, dt, cfgAfterglow, live, () => ({ xs: Float32Array.from(xs), ys: Float32Array.from(ys) }));
      for (const e of list) {
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8 * LW;
        ctx.globalAlpha = TimbreGlow.ECHO * e.strength;
        ctx.beginPath();
        TimbreGlow.trace(ctx, e.shape.xs, e.shape.ys, true);
        ctx.stroke();
      }

      // The live ring.
      const addRing = () => TimbreGlow.trace(ctx, xs, ys, true);
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = grad;
      ctx.beginPath();
      addRing();
      ctx.fill();
      ctx.globalAlpha = 1;
      TimbreGlow.glowLine(ctx, addRing, {
        width: LW, stroke: grad, glowColor: midRgb, blur: 8 * SCALE,
      });

      const centerRgb = getColor(colorT + 0.5);
      const coreSize = Math.max(2, Math.round(4 * SCALE));
      const coreHi = Math.max(1, Math.round(2 * SCALE));
      ctx.fillStyle = `rgb(${centerRgb[0]}, ${centerRgb[1]}, ${centerRgb[2]})`;
      ctx.fillRect(CX - coreSize / 2, CY - coreSize / 2, coreSize, coreSize);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(CX - coreHi / 2, CY - coreHi / 2, coreHi, coreHi);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    },
  };
};
