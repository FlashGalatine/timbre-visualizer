/* ── waveform (time-domain stepped wave) ── */
VIZ_FACTORIES['waveform'] = function () {
  const STEP = Math.max(2, Math.round(4 * SCALE));
  const TIP_THICK = Math.max(1, Math.round(2 * SCALE));
  return {
    draw() {
      ctx.clearRect(0, 0, W, H);
      const MID = H / 2;
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const samples = micActive && waveform ? waveform.length : 64;
      const segW = W / samples;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(0, MID, W, 1);
      for (let i = 0; i < samples; i++) {
        let sample;
        if (micActive && waveform) {
          sample = ((waveform[i] - 128) / 128) * cfgGain;
        } else if (cfgIdleAnim) {
          sample = 0.15 * Math.sin(Date.now() / 500 + i * 0.25);
        } else {
          sample = 0;
        }
        let y = MID - sample * MID;
        y = Math.round(y / STEP) * STEP;
        const rgb = getColor(colorT + (i / samples) * 1.5);
        const x = Math.floor(i * segW);
        const blockW = Math.max(1, Math.ceil(segW));
        const blockH = STEP;
        ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        ctx.fillRect(x, y - blockH / 2, blockW, blockH);
        const trailTop = Math.min(MID, y);
        const trailBot = Math.max(MID, y);
        const trailH = trailBot - trailTop;
        if (trailH > 1) {
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15)`;
          ctx.fillRect(x, trailTop, blockW, trailH);
        }
        const tipRgb = [Math.min(255, rgb[0] + 80), Math.min(255, rgb[1] + 80), Math.min(255, rgb[2] + 80)];
        ctx.fillStyle = `rgb(${tipRgb[0]}, ${tipRgb[1]}, ${tipRgb[2]})`;
        ctx.fillRect(x, y - TIP_THICK / 2, blockW, TIP_THICK);
      }
    },
  };
};
