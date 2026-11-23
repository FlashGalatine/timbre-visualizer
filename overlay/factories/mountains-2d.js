/* ── mountains-2d (2D wireframe heightmap flythrough) ── */
VIZ_FACTORIES['mountains-2d'] = function () {
  const GRID_W = 22;
  const GRID_D = 16;
  const CELL_W = 14;
  const CELL_D = 18;
  const EYE_HEIGHT = 14;
  const FOCAL = 90 * SCALE;
  const NEAR = 4;
  const VEIL = 0.55;   // the share a 60 fps frame's fade takes off the trail, at Trail veil 100
  // LOG_GAIN is fitted so that a recorded voice gives the light the 750 Hz values gave.
  const LOG_GAIN = 0.83;
  let heightRows = null;
  let scrollProgress = 0;
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
        out[i] = v * 36;
      }
    } else if (cfgIdleAnim) {
      const t = now / 1300;
      for (let i = 0; i < GRID_W; i++) {
        out[i] = 6 + 4 * Math.sin(i * 0.6 + t) + 3 * Math.sin(i * 1.4 - t * 1.7);
      }
    }
    return out;
  }
  function project(x, y, z) {
    if (z <= NEAR) return null;
    return {
      sx: W / 2 + (x / z) * FOCAL,
      sy: H / 2 + ((EYE_HEIGHT - y) / z) * FOCAL,
    };
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
  return {
    start() {
      heightRows = new Array(GRID_D).fill(null).map(() => new Array(GRID_W).fill(0));
      const t0 = performance.now();
      for (let j = 0; j < GRID_D; j++) heightRows[j] = sampleHeights(t0);
      scrollProgress = 0;
    },
    draw(now, dt) {
      const veil = VEIL * cfgEffectBgOpacity;
      const share = fadeOrClear(veil, dt);
      const cellsPerSec = 0.4 + (perViz['mountains-2d'].speed / 100) * 2.0;
      scrollProgress += cellsPerSec * dt;
      while (scrollProgress >= 1) {
        heightRows.shift();
        heightRows.push(sampleHeights(now));
        scrollProgress -= 1;
      }
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
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
      ctx.lineWidth = Math.max(1, SCALE);
      for (let j = GRID_D - 1; j >= 0; j--) {
        const depthFade = 0.35 + 0.65 * (1 - j / (GRID_D - 1));
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
      const horizonY = H / 2 + (EYE_HEIGHT / (GRID_D * CELL_D + NEAR)) * FOCAL;
      const horizonRgb = getColor(colorT + 2.5);
      ctx.strokeStyle = `rgba(${horizonRgb[0]}, ${horizonRgb[1]}, ${horizonRgb[2]}, ${trailAlpha(0.18, veil, share)})`;
      ctx.lineWidth = Math.max(1, SCALE);
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(W, horizonY);
      ctx.stroke();
    },
  };
};
