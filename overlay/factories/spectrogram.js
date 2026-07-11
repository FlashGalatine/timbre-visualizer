/* ── spectrogram (scrolling waterfall) ── */
VIZ_FACTORIES['spectrogram'] = function () {
  const COL_W = Math.max(1, Math.round(2 * SCALE));
  const HOTSPOT_H = Math.max(1, Math.round(SCALE));
  let offscreen = null;
  let offCtx = null;
  function ensureOffscreen() {
    if (!offscreen || offscreen.width !== W || offscreen.height !== H) {
      offscreen = document.createElement('canvas');
      offscreen.width = W;
      offscreen.height = H;
      offCtx = offscreen.getContext('2d');
    }
  }
  function getFreqs() {
    if (micActive && frequencies && frequencies.length > 0) {
      if (cfgGain === 1) return frequencies;
      return frequencies.map(v => Math.min(255, v * cfgGain));
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
    start() { offscreen = null; ctx.clearRect(0, 0, W, H); },
    onResize() { offscreen = null; },
    draw() {
      ensureOffscreen();
      const SCROLL_PX = Math.max(1, Math.round((1 + (perViz['spectrogram'].scrollSpeed / 100) * 2) * SCALE));
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      offCtx.clearRect(0, 0, W, H);
      offCtx.drawImage(canvas2d, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(offscreen, -SCROLL_PX, 0);
      const freqs = getFreqs();
      const nBins = freqs.length;
      const colX = W - COL_W;
      ctx.clearRect(colX, 0, COL_W, H);
      for (let i = 0; i < nBins; i++) {
        const amp = (freqs[i] || 0) / 255;
        if (amp < 0.04) continue;
        const yTop = Math.round(H - (i + 1) * (H / nBins));
        const yBot = Math.round(H - i * (H / nBins));
        const cellH = Math.max(1, yBot - yTop);
        const rgb = getColor(colorT + (i / nBins) * 1.6);
        const a = Math.min(1, Math.pow(amp, 0.7));
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
        ctx.fillRect(colX, yTop, COL_W, cellH);
        if (amp > 0.55) {
          ctx.fillStyle = `rgba(255, 255, 255, ${(amp - 0.55) * 1.2})`;
          ctx.fillRect(colX, yTop, COL_W, HOTSPOT_H);
        }
      }
      const headRgb = getColor(colorT + 0.5);
      const headW = Math.max(1, Math.round(SCALE));
      ctx.fillStyle = `rgba(${headRgb[0]}, ${headRgb[1]}, ${headRgb[2]}, 0.6)`;
      ctx.fillRect(W - headW, 0, headW, H);
    },
  };
};
