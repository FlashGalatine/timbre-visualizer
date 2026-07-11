/* ── visualizer (FFT bars) ── */
VIZ_FACTORIES['visualizer'] = function () {
  const BAR_GAP = Math.max(1, Math.round(1 * SCALE));
  const STEP = Math.max(2, Math.round(6 * SCALE));
  const TIP_BAND = Math.max(1, Math.round(2 * SCALE));
  return {
    draw() {
      ctx.clearRect(0, 0, W, H);
      const numBars = cfgBars;
      const barW = Math.floor((W - (numBars - 1) * BAR_GAP) / numBars);
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      for (let i = 0; i < numBars; i++) {
        let value;
        if (micActive && frequencies) {
          value = (frequencies[i] || 0) * cfgGain;
        } else if (cfgIdleAnim) {
          value = 30 + 25 * Math.sin(Date.now() / 600 + i * 0.4);
        } else {
          value = 0;
        }
        let barH = Math.floor((value / 255) * H);
        barH = Math.max(STEP, Math.floor(barH / STEP) * STEP);
        const x = i * (barW + BAR_GAP);
        const y = H - barH;
        const rgb = getColor(colorT + (i / numBars) * 1.2);
        ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        ctx.fillRect(x, y, barW, barH);
        const tipRgb = [Math.min(255, rgb[0] + 60), Math.min(255, rgb[1] + 60), Math.min(255, rgb[2] + 60)];
        ctx.fillStyle = `rgb(${tipRgb[0]}, ${tipRgb[1]}, ${tipRgb[2]})`;
        ctx.fillRect(x, y, barW, STEP);
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`;
        ctx.fillRect(x, y + STEP, barW, TIP_BAND);
      }
    },
  };
};
