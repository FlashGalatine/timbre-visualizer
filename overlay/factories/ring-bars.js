/* ── ring-bars (FFT bars sweeping radially from center) ── */
VIZ_FACTORIES['ring-bars'] = function () {
  const INNER_R = 14 * SCALE;
  const MAX_LEN = 42 * SCALE;
  const STEP = Math.max(2, Math.round(4 * SCALE));
  const SPOKE_W = Math.max(1, Math.round(3 * SCALE));
  const TIP_SZ = Math.max(2, Math.round(4 * SCALE));
  const CORE_R = Math.max(2, 4 * SCALE);
  const CORE_HILITE = Math.max(1, Math.round(2 * SCALE));
  function getSpokeValue(i, NUM_SPOKES) {
    if (micActive && frequencies && frequencies.length > 0) {
      const half = NUM_SPOKES / 2;
      const offset = i < half ? i : NUM_SPOKES - i;
      const bin = Math.floor((offset / half) * frequencies.length);
      return (frequencies[bin] || 0) * cfgGain;
    }
    if (!cfgIdleAnim) return 0;
    return 60 + 30 * Math.sin(Date.now() / 700 + i * 0.5);
  }
  return {
    draw() {
      ctx.clearRect(0, 0, W, H);
      const CX = W / 2, CY = H / 2;
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const NUM_SPOKES = Math.max(8, Math.round(12 + (perViz['ring-bars'].spokes / 100) * 36));
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.18)';
      ctx.lineWidth = Math.max(1, SCALE);
      ctx.beginPath();
      ctx.arc(CX, CY, INNER_R - 2 * SCALE, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < NUM_SPOKES; i++) {
        const value = getSpokeValue(i, NUM_SPOKES);
        let len = Math.floor((value / 255) * MAX_LEN);
        len = Math.max(STEP, Math.floor(len / STEP) * STEP);
        const angle = -Math.PI / 2 + (i / NUM_SPOKES) * Math.PI * 2;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const rgb = getColor(colorT + (i / NUM_SPOKES) * 1.2);
        ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        for (let r = INNER_R; r < INNER_R + len; r += STEP) {
          const px = Math.round(CX + cos * r);
          const py = Math.round(CY + sin * r);
          ctx.fillRect(px - SPOKE_W / 2, py - SPOKE_W / 2, SPOKE_W, SPOKE_W);
        }
        const tipR = INNER_R + len;
        const tipRgb = [Math.min(255, rgb[0] + 80), Math.min(255, rgb[1] + 80), Math.min(255, rgb[2] + 80)];
        const tx = Math.round(CX + cos * tipR);
        const ty = Math.round(CY + sin * tipR);
        ctx.fillStyle = `rgb(${tipRgb[0]}, ${tipRgb[1]}, ${tipRgb[2]})`;
        ctx.fillRect(tx - TIP_SZ / 2, ty - TIP_SZ / 2, TIP_SZ, TIP_SZ);
      }
      const centerRgb = getColor(colorT + 0.5);
      ctx.fillStyle = `rgb(${centerRgb[0]}, ${centerRgb[1]}, ${centerRgb[2]})`;
      ctx.beginPath();
      ctx.arc(CX, CY, CORE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(CX - CORE_HILITE / 2, CY - CORE_HILITE / 2, CORE_HILITE, CORE_HILITE);
    },
  };
};
