/* ── mountains-2d (2D wireframe heightmap flythrough) ── */
VIZ_FACTORIES['mountains-2d'] = function () {
  const GRID_W = 22;
  const GRID_D = 16;
  const CELL_W = 14;
  const CELL_D = 18;
  const EYE_HEIGHT = 14;
  const FOCAL = 90 * SCALE;
  const NEAR = 4;
  let heightRows = null;
  let scrollProgress = 0;
  let lastFrame = performance.now();
  function sampleHeights(now) {
    const out = new Array(GRID_W).fill(0);
    if (micActive && frequencies && frequencies.length > 0) {
      const n = frequencies.length;
      for (let i = 0; i < GRID_W; i++) {
        const dist = Math.abs(i - GRID_W / 2);
        const binIdx = Math.min(n - 1, Math.floor((dist / (GRID_W / 2)) * (n - 1)));
        const v = (frequencies[binIdx] || 0) / 255 * cfgGain;
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
  return {
    start() {
      heightRows = new Array(GRID_D).fill(null).map(() => new Array(GRID_W).fill(0));
      const t0 = performance.now();
      for (let j = 0; j < GRID_D; j++) heightRows[j] = sampleHeights(t0);
      scrollProgress = 0;
      lastFrame = t0;
    },
    draw(now) {
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const fadeAmount = 0.55 * cfgEffectBgOpacity;
      if (fadeAmount > 0.001) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else {
        ctx.clearRect(0, 0, W, H);
      }
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
        ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${depthFade})`;
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
      ctx.strokeStyle = `rgba(${horizonRgb[0]}, ${horizonRgb[1]}, ${horizonRgb[2]}, 0.18)`;
      ctx.lineWidth = Math.max(1, SCALE);
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(W, horizonY);
      ctx.stroke();
    },
  };
};
