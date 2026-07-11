/* ── comet (Lissajous trail with destination-out fade) ── */
VIZ_FACTORIES['comet'] = function () {
  const X_AMP = 80 * SCALE;
  const Y_AMP = 50 * SCALE;
  const TRAIL_W = Math.max(2, Math.round(2 * SCALE));
  const HEAD_SZ = Math.max(2, Math.round(4 * SCALE));
  const HEAD_HI = Math.max(1, Math.round(2 * SCALE));
  function idlePoint(i, n, t) {
    const a = (i / n) * Math.PI * 2;
    return { x: 0.6 * Math.sin(a * 3 + t), y: 0.6 * Math.sin(a * 2 + t * 1.3) };
  }
  return {
    start() { ctx.clearRect(0, 0, W, H); },
    draw() {
      const FADE_ALPHA = 0.05 + (perViz['comet'].trail / 100) * 0.35;
      const fadeAmount = FADE_ALPHA * cfgEffectBgOpacity;
      if (fadeAmount > 0.001) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      const CX = W / 2, CY = H / 2;
      const now = Date.now();
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const n = micActive && waveform ? waveform.length : 64;
      const phase = Math.floor(n / 4);
      const t = now / 700;
      let prevX = null, prevY = null;
      for (let i = 0; i < n; i++) {
        let xv, yv;
        if (micActive && waveform) {
          xv = ((waveform[i] - 128) / 128) * cfgGain;
          yv = ((waveform[(i + phase) % n] - 128) / 128) * cfgGain;
        } else if (cfgIdleAnim) {
          const p = idlePoint(i, n, t);
          xv = p.x; yv = p.y;
        } else { xv = 0; yv = 0; }
        const x = Math.round(CX + xv * X_AMP);
        const y = Math.round(CY + yv * Y_AMP);
        const rgb = getColor(colorT + (i / n) * 1.4);
        if (prevX != null) {
          const dx = Math.abs(x - prevX);
          const dy = Math.abs(y - prevY);
          const steps = Math.max(dx, dy);
          ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          if (steps === 0) {
            ctx.fillRect(x - TRAIL_W / 2, y - TRAIL_W / 2, TRAIL_W, TRAIL_W);
          } else {
            for (let s = 0; s <= steps; s++) {
              const tt = s / steps;
              const px = Math.round(prevX + (x - prevX) * tt);
              const py = Math.round(prevY + (y - prevY) * tt);
              ctx.fillRect(px - TRAIL_W / 2, py - TRAIL_W / 2, TRAIL_W, TRAIL_W);
            }
          }
        }
        prevX = x; prevY = y;
      }
      if (prevX != null) {
        const headRgb = getColor(colorT + 0.5);
        const tipRgb = [Math.min(255, headRgb[0] + 80), Math.min(255, headRgb[1] + 80), Math.min(255, headRgb[2] + 80)];
        ctx.fillStyle = `rgb(${tipRgb[0]}, ${tipRgb[1]}, ${tipRgb[2]})`;
        ctx.fillRect(prevX - HEAD_SZ / 2, prevY - HEAD_SZ / 2, HEAD_SZ, HEAD_SZ);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(prevX - HEAD_HI / 2, prevY - HEAD_HI / 2, HEAD_HI, HEAD_HI);
      }
    },
  };
};
