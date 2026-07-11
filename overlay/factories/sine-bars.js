/* ── sine-bars (FFT bars + waveform ribbon overlay) ── */
VIZ_FACTORIES['sine-bars'] = function () {
  const BAR_GAP = Math.max(1, Math.round(1 * SCALE));
  const STEP = Math.max(2, Math.round(6 * SCALE));
  return {
    draw() {
      ctx.clearRect(0, 0, W, H);
      const numBars = cfgBars;
      const barW = Math.floor((W - (numBars - 1) * BAR_GAP) / numBars);
      const now = Date.now();
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      for (let i = 0; i < numBars; i++) {
        let value;
        if (micActive && frequencies) {
          value = (frequencies[i] || 0) * cfgGain;
        } else if (cfgIdleAnim) {
          value = 24 + 18 * Math.sin(now / 600 + i * 0.4);
        } else { value = 0; }
        let barH = Math.floor((value / 255) * H * 0.7);
        barH = Math.max(STEP, Math.floor(barH / STEP) * STEP);
        const x = i * (barW + BAR_GAP);
        const y = H - barH;
        const rgb = getColor(colorT + (i / numBars) * 1.2);
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.55)`;
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = `rgba(${Math.min(255, rgb[0]+60)}, ${Math.min(255, rgb[1]+60)}, ${Math.min(255, rgb[2]+60)}, 0.9)`;
        ctx.fillRect(x, y, barW, STEP);
      }
      const ribbonAmp = (8 + (perViz['sine-bars'].ribbon / 100) * 32) * SCALE;
      const ribbonY = H * 0.32;
      const ribbonRgb = getColor(colorT + 0.5);
      ctx.lineWidth = Math.max(1, 2 * SCALE);
      ctx.strokeStyle = `rgb(${ribbonRgb[0]}, ${ribbonRgb[1]}, ${ribbonRgb[2]})`;
      ctx.shadowBlur = 10 * SCALE;
      ctx.shadowColor = `rgb(${ribbonRgb[0]}, ${ribbonRgb[1]}, ${ribbonRgb[2]})`;
      const samples = (micActive && waveform && waveform.length > 0) ? waveform.length : 64;
      ctx.beginPath();
      for (let i = 0; i < samples; i++) {
        const x = (i / (samples - 1)) * W;
        let v;
        if (micActive && waveform) v = (waveform[i] - 128) / 128;
        else if (cfgIdleAnim) v = 0.4 * Math.sin((i / samples) * Math.PI * 4 + now / 350);
        else v = 0;
        const y = ribbonY + v * ribbonAmp * cfgGain;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    },
  };
};
