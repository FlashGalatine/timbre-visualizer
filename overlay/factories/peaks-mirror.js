/* ── peaks-mirror (heightmap mirrored across center seam) ── */
VIZ_FACTORIES['peaks-mirror'] = function () {
  const GRID_W = 22;
  const GRID_D = 14;
  const CELL_W = 14;
  const CELL_D = 18;
  const FOCAL = 90 * SCALE;
  const NEAR = 4;
  const VEIL = 0.45;                        // the share a 60 fps frame's fade takes off the trail, at Trail veil 100
  const BASS_RATE = -60 * Math.log(0.78);   // the bass level keeps 78% of itself over a 60 fps frame
  const GLOW_STOPS = 64;                    // colour stops down the seam's glow
  const EDGE_STRIPS = 6;                    // strips the glow dims over toward each end of the seam
  // LOG_GAIN is fitted so that a recorded voice gives the light the 750 Hz values gave.
  const LOG_GAIN = 0.74;
  let heightRows = null;
  let scrollProgress = 0;
  let bassEMA = 0;
  let strip = null, stripCtx = null;        // one column of the seam's glow, as tall as the canvas
  function sampleHeights(now) {
    const out = new Array(GRID_W).fill(0);
    if (micActive && frequencies && frequencies.length > 0) {
      // The spectrum is mirrored about the middle of the mesh, which lies between its two
      // middle columns: those two take the lowest bands and the two edges the highest. Each
      // half's columns are spread over all 32 log bands (TimbreHelix.spread).
      const mid = (GRID_W - 1) / 2;
      for (let i = 0; i < GRID_W; i++) {
        const dist = Math.abs(i - mid) - 0.5;
        const v = TimbreHelix.spread(frequencies, dist, mid + 0.5) / 255 * LOG_GAIN * cfgGain;
        out[i] = v * 28;
      }
    } else if (cfgIdleAnim) {
      const t = now / 1300;
      for (let i = 0; i < GRID_W; i++) {
        out[i] = 4 + 3 * Math.sin(i * 0.6 + t) + 2 * Math.sin(i * 1.4 - t * 1.7);
      }
    }
    return out;
  }
  function project(x, y, z) {
    if (z <= NEAR) return null;
    return { sx: W / 2 + (x / z) * FOCAL, sy: H / 2 + (y / z) * FOCAL };
  }
  function buildProjected() {
    const halfW = (GRID_W - 1) / 2;
    const projected = new Array(GRID_D);
    for (let j = 0; j < GRID_D; j++) {
      const z = (j + scrollProgress) * CELL_D + NEAR;
      const row = new Array(GRID_W);
      for (let i = 0; i < GRID_W; i++) {
        const x = (i - halfW) * CELL_W;
        const y = heightRows[j][i];
        row[i] = project(x, y, z);
      }
      projected[j] = row;
    }
    return projected;
  }
  /* The alpha to paint with over a trail, so that what stands still is as bright at any frame
     rate. `alpha` is what is painted at 60 fps, `veil` the share a 60 fps frame's fade takes
     off, `share` what this frame's fade took off (fadeOrClear's answer). At 60 fps, and when
     the canvas is cleared instead, it is `alpha` itself. */
  function trailAlpha(alpha, veil, share) {
    if (!(veil > 0.001) || veil >= 1 || share >= 1 || Math.abs(share - veil) < 1e-9) return alpha;
    const settled = alpha / (1 - (1 - alpha) * (1 - veil));
    return (settled * share) / (1 - (1 - share) * settled);
  }
  function drawWireframe(projected, colorT, veil, share) {
    ctx.lineWidth = Math.max(1, SCALE);
    for (let j = GRID_D - 1; j >= 0; j--) {
      const depthFade = 0.3 + 0.7 * (1 - j / (GRID_D - 1));
      const rgb = getColor(colorT + (j / GRID_D) * 1.2);
      ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${trailAlpha(depthFade, veil, share)})`;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < GRID_W; i++) {
        const p = projected[j][i];
        if (!p) { started = false; continue; }
        if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
        else ctx.lineTo(p.sx, p.sy);
      }
      ctx.stroke();
      if (j > 0) {
        ctx.beginPath();
        for (let i = 0; i < GRID_W; i++) {
          const p = projected[j][i];
          const q = projected[j - 1][i];
          if (!p || !q) continue;
          ctx.moveTo(p.sx, p.sy);
          ctx.lineTo(q.sx, q.sy);
        }
        ctx.stroke();
      }
    }
  }
  /* The share of a bell curve's area that lies below x (x in widths of the curve). */
  function below(x) {
    const u = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * u);
    const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-u * u);
    return x < 0 ? 0.5 * (1 - erf) : 0.5 * (1 + erf);
  }
  /* The seam's glow: what a shadowBlur of `blur` under a line `thick` wide across the whole
     canvas gave, painted without a blur. Down the canvas it is the blurred line's own
     profile: that is painted once, as a gradient, into a strip one pixel wide, and the strip
     is drawn stretched along the seam (a gradient over the whole seam costs several times a
     blur where the canvas is painted without the GPU; the strip costs a third of one).
     Toward each end of the seam the glow dims to half, as the blur did where the line stops,
     in a few steps. alphaAt(share) is the alpha to paint where the glow has that share
     (0..1) of the line's own. */
  function seamGlow(rgb, thick, blur, alphaAt) {
    const sigma = 0.485 * blur;              // the browser's blur is a bell curve this wide
    if (!(sigma > 0.01)) return;
    if (!strip || strip.height !== H) {
      strip = document.createElement('canvas');
      strip.width = 1; strip.height = H;
      stripCtx = strip.getContext('2d');
      stripCtx.globalCompositeOperation = 'copy';   // each fill replaces what was there
    }
    const reach = thick / 2 + 3 * sigma;
    const glow = stripCtx.createLinearGradient(0, H / 2 - reach, 0, H / 2 + reach);
    for (let i = 0; i <= GLOW_STOPS; i++) {
      const d = Math.abs((i / GLOW_STOPS) * 2 - 1) * reach;
      const part = below((d + thick / 2) / sigma) - below((d - thick / 2) / sigma);
      glow.addColorStop(i / GLOW_STOPS, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alphaAt(part)})`);
    }
    // Whole rows of the strip, so that it is drawn row for row.
    const top = Math.max(0, Math.floor(H / 2 - reach)), rows = Math.min(H, Math.ceil(H / 2 + reach)) - top;
    stripCtx.fillStyle = glow;
    stripCtx.fillRect(0, top, 1, rows);
    const edge = Math.min(W / 2, 2.4 * sigma), step = edge / EDGE_STRIPS;
    for (let k = 0; k < EDGE_STRIPS; k++) {
      ctx.globalAlpha = below(((k + 0.5) * step) / sigma);
      ctx.drawImage(strip, 0, top, 1, rows, k * step, top, step, rows);
      ctx.drawImage(strip, 0, top, 1, rows, W - (k + 1) * step, top, step, rows);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(strip, 0, top, 1, rows, edge, top, W - 2 * edge, rows);
  }
  return {
    start() {
      heightRows = new Array(GRID_D).fill(null).map(() => new Array(GRID_W).fill(0));
      const t0 = performance.now();
      for (let j = 0; j < GRID_D; j++) heightRows[j] = sampleHeights(t0);
      scrollProgress = 0;
      bassEMA = 0;
    },
    draw(now, dt) {
      const veil = VEIL * cfgEffectBgOpacity;
      const share = fadeOrClear(veil, dt);
      let bassInst = 0;
      if (micActive && micBands) {
        bassInst = TimbreHelix.heard('bass', micBands) * cfgGain;   // what values 0-3 of the 750 Hz spectrum gave (helix.js)
      }
      bassEMA = ema(bassEMA, bassInst, BASS_RATE, dt);
      const cellsPerSec = 0.6 + bassEMA * 1.6;
      scrollProgress += cellsPerSec * dt;
      while (scrollProgress >= 1) {
        heightRows.shift();
        heightRows.push(sampleHeights(now));
        scrollProgress -= 1;
      }
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const projected = buildProjected();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, H / 2, W, H / 2);
      ctx.clip();
      drawWireframe(projected, colorT, veil, share);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H / 2);
      ctx.clip();
      ctx.translate(0, H);
      ctx.scale(1, -1);
      drawWireframe(projected, colorT, veil, share);
      ctx.restore();
      const seamRgb = getColor(colorT + 2.5);
      const seamBase = perViz['peaks-mirror'].seam / 100;
      const pulse = Math.min(1, bassEMA * 1.5);
      const seamAlpha = Math.min(1, 0.25 + seamBase * 0.45 + pulse * 0.45);
      const seamThickness = (1 + seamBase * 1.5 + pulse * 4) * SCALE;
      ctx.save();
      seamGlow(seamRgb, seamThickness, (8 + pulse * 16) * SCALE, (part) => trailAlpha(seamAlpha * part, veil, share));
      ctx.strokeStyle = `rgba(${seamRgb[0]}, ${seamRgb[1]}, ${seamRgb[2]}, ${trailAlpha(seamAlpha, veil, share)})`;
      ctx.lineWidth = seamThickness;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
      ctx.restore();
    },
    /* For the checks: the bass level the scroll and the seam follow. */
    probe() { return { bass: bassEMA }; },
  };
};
