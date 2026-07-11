/* ── vaporwave (synthwave-aesthetic mountains flythrough with sun + grid floor) ── */
VIZ_FACTORIES['vaporwave'] = function () {
  const GRID_W = 22;
  const GRID_D = 16;
  const CELL_W = 14;
  const CELL_D = 18;
  const EYE_HEIGHT = 14;
  const FOCAL = 90 * SCALE;
  const NEAR = 4;
  const STAR_COUNT = 60;
  const GROUND_ROWS = 22;
  const RAIL_COUNT = 14;
  let heightRows = null;
  let scrollProgress = 0;
  let lastFrame = performance.now();
  let stars = [];
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
  function seedStars() {
    // Deterministic LCG so positions are stable across mount/unmount.
    let s = 1234567;
    const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    stars = new Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      stars[i] = {
        x: rand() * W,
        y: rand() * (H * 0.46),
        size: (0.7 + rand() * 1.6) * SCALE,
        phase: rand() * Math.PI * 2,
      };
    }
  }
  function audioEnergy() {
    if (!micActive || !frequencies || !frequencies.length) return 0;
    let sum = 0;
    const cap = Math.min(frequencies.length, 64);
    for (let i = 0; i < cap; i++) sum += frequencies[i];
    return (sum / cap) / 255 * cfgGain;
  }
  return {
    start() {
      heightRows = new Array(GRID_D).fill(null).map(() => new Array(GRID_W).fill(0));
      const t0 = performance.now();
      for (let j = 0; j < GRID_D; j++) heightRows[j] = sampleHeights(t0);
      scrollProgress = 0;
      lastFrame = t0;
      seedStars();
    },
    onResize() { seedStars(); },
    draw(now) {
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const sceneAlpha = cfgEffectBgOpacity;
      if (sceneAlpha > 0.05) {
        ctx.clearRect(0, 0, W, H);
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0,    `rgba(8, 6, 38, ${sceneAlpha})`);
        sky.addColorStop(0.55, `rgba(45, 18, 76, ${sceneAlpha})`);
        sky.addColorStop(1,    `rgba(85, 22, 110, ${sceneAlpha})`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        for (const st of stars) {
          const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now * 0.001 + st.phase));
          ctx.fillStyle = `rgba(255, 240, 230, ${tw * 0.85 * sceneAlpha})`;
          ctx.fillRect(st.x, st.y, st.size, st.size);
        }
        const energy = audioEnergy();
        const idleSwell = micActive ? 0 : (cfgIdleAnim ? 0.5 + 0.5 * Math.sin(now / 1500) : 0);
        const pulse = energy + idleSwell * 0.15;
        // sunSize knob 0–100 maps to a radius factor 0.04 → 0.22 → 0.40 (default 50 = 0.22).
        const sunSizeFactor = 0.04 + (perViz['vaporwave'].sunSize / 100) * 0.36;
        const sunR = Math.min(W, H) * sunSizeFactor * (1 + 0.04 * pulse);
        const sunCx = W / 2;
        const horizonY = H / 2;
        const sunCy = horizonY - sunR * 0.42;
        ctx.save();
        ctx.beginPath();
        ctx.arc(sunCx, sunCy, sunR, 0, Math.PI * 2);
        ctx.clip();
        const sunGrad = ctx.createLinearGradient(0, sunCy - sunR, 0, sunCy + sunR);
        sunGrad.addColorStop(0,    `rgba(255, 226, 122, ${sceneAlpha})`);
        sunGrad.addColorStop(0.45, `rgba(255, 138, 74, ${sceneAlpha})`);
        sunGrad.addColorStop(1,    `rgba(255, 58, 165, ${sceneAlpha})`);
        // Solid top half — no stripes from the top of the disc to ~58% down.
        const stripeStart = sunCy + sunR * 0.08;
        ctx.fillStyle = sunGrad;
        ctx.fillRect(sunCx - sunR, sunCy - sunR, sunR * 2, stripeStart - (sunCy - sunR));
        // Bottom half: lit bands separated by sky-revealing gaps that grow toward the bottom.
        // Stripe sizes scale with the radius so the look stays balanced at any sunSize.
        let y = stripeStart;
        let bandH = sunR * 0.245;
        let gapH = sunR * 0.052;
        while (y < sunCy + sunR) {
          ctx.fillStyle = sunGrad;
          ctx.fillRect(sunCx - sunR, y, sunR * 2, bandH);
          y += bandH + gapH;
          bandH = Math.max(sunR * 0.07, bandH - sunR * 0.023);
          gapH += sunR * 0.018;
        }
        ctx.restore();
      } else {
        // Transparent-canvas fallback: classic mountains-2d trail-fade so the wireframe
        // and grid overlay an OBS scene behind without the vaporwave backdrop.
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      const cellsPerSec = 0.4 + (perViz['vaporwave'].speed / 100) * 2.0;
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
        const depthFade = 0.40 + 0.60 * (1 - j / (GRID_D - 1));
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
      const gridRgb = getColor(colorT + 2.0);
      const GROUND_HALF_W = CELL_W * (GRID_W / 2 + 6);
      // Horizontal floor lines flow with the same scrollProgress as the mountains.
      for (let j = 0; j < GROUND_ROWS; j++) {
        const z = (j + scrollProgress) * CELL_D + NEAR;
        const pL = project(-GROUND_HALF_W, 0, z);
        const pR = project(+GROUND_HALF_W, 0, z);
        if (!pL || !pR) continue;
        const distFade = Math.min(1, (pL.sy - H / 2) / (H / 3));
        if (distFade <= 0) continue;
        ctx.strokeStyle = `rgba(${gridRgb[0]}, ${gridRgb[1]}, ${gridRgb[2]}, ${0.18 + 0.55 * distFade})`;
        ctx.beginPath();
        ctx.moveTo(pL.sx, pL.sy);
        ctx.lineTo(pR.sx, pR.sy);
        ctx.stroke();
      }
      // Rails converging to the horizon vanishing point.
      const RAIL_NEAR_Z = NEAR + 0.5;
      const RAIL_FAR_Z = NEAR + GROUND_ROWS * CELL_D;
      ctx.strokeStyle = `rgba(${gridRgb[0]}, ${gridRgb[1]}, ${gridRgb[2]}, 0.5)`;
      for (let i = -RAIL_COUNT; i <= RAIL_COUNT; i++) {
        const x = i * CELL_W;
        const pN = project(x, 0, RAIL_NEAR_Z);
        const pF = project(x, 0, RAIL_FAR_Z);
        if (!pN || !pF) continue;
        ctx.beginPath();
        ctx.moveTo(pN.sx, pN.sy);
        ctx.lineTo(pF.sx, pF.sy);
        ctx.stroke();
      }
      const horizonRgb = getColor(colorT + 2.5);
      ctx.strokeStyle = `rgba(${horizonRgb[0]}, ${horizonRgb[1]}, ${horizonRgb[2]}, 0.55)`;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
    },
  };
};
