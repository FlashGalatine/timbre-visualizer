/* ── sine-bars (FFT bars + waveform ribbon overlay) ── */
VIZ_FACTORIES['sine-bars'] = function () {
  const BAR_GAP = Math.max(1, Math.round(1 * SCALE));
  const STEP = Math.max(2, Math.round(6 * SCALE));
  const ghosts = TimbreGlow.createBarGhosts();
  /* The ribbon's glow. It was a shadowBlur of 10 × SCALE under the line; it is the same
     glow painted as GLOW_STEPS strokes of the ribbon's own path, each wider and fainter than
     the next, the widest first. A blurred line falls away as a bell curve does, so each
     stroke's width and alpha are read off that curve, once, here. (Three strokes show as
     three bands on the large pages; eight do not.) */
  const RIBBON_W = Math.max(1, 2 * SCALE);
  const GLOW_STEPS = 8;
  const glowWidths = [], glowAlphas = [];
  {
    const sigma = 0.485 * 10 * SCALE;        // the browser's blur is a bell curve this wide
    // The share of a bell curve's area that lies below x (x in widths of the curve).
    const below = (x) => {
      const u = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * u);
      const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-u * u);
      return x < 0 ? 0.5 * (1 - erf) : 0.5 * (1 + erf);
    };
    let under = 0;   // the glow already painted where this stroke goes
    for (let i = 0; i < GLOW_STEPS; i++) {
      const outer = 2.6 * sigma * (1 - i / GLOW_STEPS), inner = 2.6 * sigma * (1 - (i + 1) / GLOW_STEPS);
      const d = RIBBON_W / 2 + (outer + inner) / 2;   // the middle of the band this stroke adds, from the middle of the line
      const lit = below((d + RIBBON_W / 2) / sigma) - below((d - RIBBON_W / 2) / sigma);
      glowWidths.push(RIBBON_W + 2 * outer);
      glowAlphas.push(1 - (1 - lit) / (1 - under));
      under = lit;
    }
  }
  return {
    draw(tNow) {
      ctx.clearRect(0, 0, W, H);
      const numBars = cfgBars;
      ghosts.sync(numBars + ':' + W + ':' + H);
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
        // Afterglow: ghosts of recent peaks, drawn behind the live bar.
        const strips = ghosts.step(i, barH, tNow, cfgAfterglow, micActive && !!frequencies);
        for (let s = 0; s < strips.length; s++) {
          const g = strips[s];
          ctx.globalAlpha = TimbreGlow.BAR * g.strength * 0.55;
          ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          ctx.fillRect(x, H - g.hi, barW, g.hi - g.lo);
          if (s === strips.length - 1) {
            ctx.globalAlpha = TimbreGlow.BAR_TIP * g.strength * 0.9;
            ctx.fillStyle = `rgb(${Math.min(255, rgb[0]+60)}, ${Math.min(255, rgb[1]+60)}, ${Math.min(255, rgb[2]+60)})`;
            ctx.fillRect(x, H - g.hi, barW, STEP);
          }
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.55)`;
        ctx.fillRect(x, y, barW, barH);
        ctx.fillStyle = `rgba(${Math.min(255, rgb[0]+60)}, ${Math.min(255, rgb[1]+60)}, ${Math.min(255, rgb[2]+60)}, 0.9)`;
        ctx.fillRect(x, y, barW, STEP);
      }
      const ribbonAmp = (8 + (perViz['sine-bars'].ribbon / 100) * 32) * SCALE;
      const ribbonY = H * 0.32;
      const ribbonRgb = getColor(colorT + 0.5);
      ctx.strokeStyle = `rgb(${ribbonRgb[0]}, ${ribbonRgb[1]}, ${ribbonRgb[2]})`;
      const samples = (micActive && waveform && waveform.length > 0) ? waveform.length : 64;
      const yAt = (i) => {
        let v;
        if (micActive && waveform) v = (waveform[i] - 128) / 128;
        else if (cfgIdleAnim) v = 0.4 * Math.sin((i / samples) * Math.PI * 4 + now / 350);
        else v = 0;
        return ribbonY + v * ribbonAmp * cfgGain;
      };
      // The path runs on past both edges of the canvas, the way it was heading there, so
      // that the glow's wide strokes do not end in sight.
      const gap = W / (samples - 1), past = glowWidths[0] / 2;
      ctx.beginPath();
      ctx.moveTo(-past, yAt(0) - ((yAt(1) - yAt(0)) / gap) * past);
      for (let i = 0; i < samples; i++) ctx.lineTo((i / (samples - 1)) * W, yAt(i));
      ctx.lineTo(W + past, yAt(samples - 1) + ((yAt(samples - 1) - yAt(samples - 2)) / gap) * past);
      // The glow, then the line itself, on the one path.
      const join = ctx.lineJoin;
      ctx.lineJoin = 'round';
      for (let i = 0; i < GLOW_STEPS; i++) {
        ctx.globalAlpha = glowAlphas[i];
        ctx.lineWidth = glowWidths[i];
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineJoin = join;
      ctx.lineWidth = RIBBON_W;
      ctx.stroke();
    },
  };
};
