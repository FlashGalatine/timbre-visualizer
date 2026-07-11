/* ── ring-waveform (waveform displaced around a circle) ── */
VIZ_FACTORIES['ring-waveform'] = function () {
  const BASE_R = 32 * SCALE;
  const GRID = Math.max(2, Math.round(4 * SCALE));
  function snap(v) { return Math.round(v / GRID) * GRID; }
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
  function drawSteppedLine(x0, y0, x1, y1, rgb) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const steps = Math.max(dx, dy) / GRID;
    if (steps < 1) {
      ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      ctx.fillRect(x0 - 1, y0 - 1, GRID - 1, GRID - 1);
      return;
    }
    ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = snap(x0 + (x1 - x0) * t);
      const y = snap(y0 + (y1 - y0) * t);
      ctx.fillRect(x - 1, y - 1, GRID - 1, GRID - 1);
    }
  }
  return {
    draw() {
      ctx.clearRect(0, 0, W, H);
      const CX = W / 2, CY = H / 2;
      const now = Date.now();
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const N = micActive && waveform ? waveform.length : 64;
      const AMPLITUDE = (4 + (perViz['ring-waveform'].amplitude / 100) * 28) * SCALE;
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.10)';
      ctx.lineWidth = Math.max(1, SCALE);
      ctx.beginPath();
      ctx.arc(CX, CY, BASE_R, 0, Math.PI * 2);
      ctx.stroke();
      const verts = [];
      for (let i = 0; i < N; i++) {
        const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
        const sample = getSampleAt(i, N);
        const r = BASE_R + sample * AMPLITUDE;
        verts.push({
          x: snap(CX + Math.cos(angle) * r),
          y: snap(CY + Math.sin(angle) * r),
        });
      }
      const glowRgb = getColor(colorT);
      ctx.beginPath();
      for (let i = 0; i < verts.length; i++) {
        const v = verts[i];
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]}, 0.10)`;
      ctx.fill();
      for (let i = 0; i < verts.length; i++) {
        const a = verts[i];
        const b = verts[(i + 1) % verts.length];
        const rgb = getColor(colorT + (i / verts.length) * 1.5);
        drawSteppedLine(a.x, a.y, b.x, b.y, rgb);
      }
      const centerRgb = getColor(colorT + 0.5);
      const coreSize = Math.max(2, Math.round(4 * SCALE));
      const coreHi = Math.max(1, Math.round(2 * SCALE));
      ctx.fillStyle = `rgb(${centerRgb[0]}, ${centerRgb[1]}, ${centerRgb[2]})`;
      ctx.fillRect(CX - coreSize / 2, CY - coreSize / 2, coreSize, coreSize);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(CX - coreHi / 2, CY - coreHi / 2, coreHi, coreHi);
    },
  };
};
