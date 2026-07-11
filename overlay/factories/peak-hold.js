/* ── peak-hold (FFT bars with falling peak markers) ── */
VIZ_FACTORIES['peak-hold'] = function () {
  const BAR_GAP = Math.max(1, Math.round(1 * SCALE));
  const STEP = Math.max(2, Math.round(6 * SCALE));
  const PEAK_THICKNESS = Math.max(1, Math.round(2 * SCALE));
  const PEAK_HOLD_FRAMES = 18;
  let peaks = null;
  function ensurePeakArray(n) {
    if (!peaks || peaks.length !== n) peaks = new Array(n).fill(null).map(() => ({ y: H, hold: 0 }));
  }
  return {
    draw() {
      ctx.clearRect(0, 0, W, H);
      const numBars = cfgBars;
      const barW = Math.floor((W - (numBars - 1) * BAR_GAP) / numBars);
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      ensurePeakArray(numBars);
      const fallSpeed = perViz['peak-hold'].fallSpeed;
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
        const peak = peaks[i];
        if (y < peak.y) { peak.y = y; peak.hold = PEAK_HOLD_FRAMES; }
        else if (peak.hold > 0) { peak.hold -= 1; }
        else { peak.y = Math.min(H - PEAK_THICKNESS, peak.y + (0.2 + (fallSpeed / 100) * 1.8)); }
        const peakY = Math.round(peak.y);
        if (peakY < y - 1) {
          ctx.fillStyle = `rgb(${tipRgb[0]}, ${tipRgb[1]}, ${tipRgb[2]})`;
          ctx.fillRect(x, peakY, barW, PEAK_THICKNESS);
        }
      }
    },
  };
};
