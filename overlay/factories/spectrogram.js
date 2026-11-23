/* ── spectrogram (scrolling waterfall) ──
   The history lives on the canvas itself and is moved along by drawing the canvas onto
   itself. The last HEAD_W pixels at the right edge are the head line's own and never hold
   history, so the line is not carried along with it. */
VIZ_FACTORIES['spectrogram'] = function () {
  const HOTSPOT_H = Math.max(1, Math.round(SCALE));
  const HEAD_W = Math.max(1, Math.round(SCALE));
  let owed = 0;   // pixels of scroll not yet taken: the part of a pixel each frame leaves over
  // The rows are the 32 log bands (60 Hz to 12 kHz), one row a band.
  // LOG_GAIN is fitted so that a recorded voice gives the light the 750 Hz values gave.
  const LOG_GAIN = 0.64;
  function getFreqs() {
    if (micActive && frequencies && frequencies.length > 0) {
      return frequencies.map(v => Math.min(255, v * LOG_GAIN * cfgGain));
    }
    if (!cfgIdleAnim) return new Array(32).fill(0);
    const n = 32;
    const t = Date.now() / 1000;
    const arr = new Array(n);
    for (let i = 0; i < n; i++) {
      arr[i] = Math.max(0, 30 + 25 * Math.sin(t * 0.7 + i * 0.5) + 15 * Math.sin(t * 1.7 + i * 0.2));
    }
    return arr;
  }
  return {
    start() { owed = 0; ctx.clearRect(0, 0, W, H); },
    onResize() { owed = 0; },
    draw(now, dt) {
      // The speed is what a 60 fps frame used to scroll (a whole number of pixels), 60 times a
      // second. A frame scrolls the whole pixels its time has earned, and the new column is
      // as wide as that, so the columns meet at any speed and any frame rate.
      const perSecond = 60 * Math.max(1, Math.round((1 + (perViz['spectrogram'].scrollSpeed / 100) * 2) * SCALE));
      owed += perSecond * dt;
      const step = Math.min(W - HEAD_W, Math.floor(owed + 1e-6));
      owed -= step;
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      if (step > 0) {
        // One draw moves the history: `copy` replaces the canvas with itself, `step` to the left.
        ctx.globalCompositeOperation = 'copy';
        ctx.drawImage(canvas2d, -step, 0);
        ctx.globalCompositeOperation = 'source-over';
        // The head line went along with it; the new column covers where it landed.
        const colX = W - HEAD_W - step;
        ctx.clearRect(colX, 0, step + HEAD_W, H);
        const freqs = getFreqs();
        const nBins = freqs.length;
        for (let i = 0; i < nBins; i++) {
          const amp = (freqs[i] || 0) / 255;
          if (amp < 0.04) continue;
          const yTop = Math.round(H - (i + 1) * (H / nBins));
          const yBot = Math.round(H - i * (H / nBins));
          const cellH = Math.max(1, yBot - yTop);
          const rgb = getColor(colorT + (i / nBins) * 1.6);
          const a = Math.min(1, Math.pow(amp, 0.7));
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
          ctx.fillRect(colX, yTop, step, cellH);
          if (amp > 0.55) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(amp - 0.55) * 1.2})`;
            ctx.fillRect(colX, yTop, step, HOTSPOT_H);
          }
        }
      } else {
        ctx.clearRect(W - HEAD_W, 0, HEAD_W, H);
      }
      const headRgb = getColor(colorT + 0.5);
      ctx.fillStyle = `rgba(${headRgb[0]}, ${headRgb[1]}, ${headRgb[2]}, 0.6)`;
      ctx.fillRect(W - HEAD_W, 0, HEAD_W, H);
    },
  };
};
