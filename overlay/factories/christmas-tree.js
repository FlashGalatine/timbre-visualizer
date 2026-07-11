/* ── christmas-tree (frequency-band Christmas lights on a stacked-tier tree) ──
   Four widening tiers form the tree silhouette; each tier samples a frequency
   band (treble at top → bass at bottom) and lights wired to that tier brighten
   in proportion. Star at apex pulses with overall RMS and grows a halo. Snow
   falls in the background. Lights cycle through PALETTE so the global hue/speed
   knobs still feel meaningful. */
VIZ_FACTORIES['christmas-tree'] = function () {
  const TREE_GREEN      = [22, 88, 38];
  const TREE_DARK       = [14, 58, 26];
  const TREE_HIGHLIGHT  = [36, 122, 56];
  const TRUNK           = [76, 50, 22];
  const STAR_COLOR      = [255, 232, 110];
  const SNOW            = [248, 250, 255];
  const TIERS = 4; // top → bottom
  const SNOW_MAX = 80;
  let lights = [];
  let snow = [];
  let smoothBands = [0, 0, 0, 0];
  let smoothRMS = 0;
  let lastFrame = performance.now();
  function bandAverage(lo, hi) {
    if (!frequencies || frequencies.length === 0) return 0;
    const a = Math.floor(lo * frequencies.length);
    const b = Math.min(frequencies.length, Math.floor(hi * frequencies.length));
    let s = 0;
    for (let i = a; i < b; i++) s += frequencies[i];
    const n = Math.max(1, b - a);
    return (s / (n * 255)) * cfgGain;
  }
  function getRMS() {
    if (!micActive || !waveform || waveform.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < waveform.length; i++) {
      const v = (waveform[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / waveform.length) * cfgGain;
  }
  // Tree geometry — each tier is an isoceles triangle. Returns { topY, botY, halfW, halfWtop }.
  function tierBounds(tier, CX, topY, treeH, baseHalfW) {
    const tierH = treeH / TIERS;
    const t0 = topY + tier * tierH * 0.85; // tiers overlap slightly
    const t1 = t0 + tierH;
    const halfWtop = baseHalfW * (0.10 + (tier / TIERS) * 0.45);
    const halfW    = baseHalfW * (0.30 + ((tier + 1) / TIERS) * 0.65);
    return { topY: t0, botY: t1, halfW, halfWtop, CX };
  }
  function pointInsideTier(x, y, b) {
    if (y < b.topY || y > b.botY) return false;
    const t = (y - b.topY) / (b.botY - b.topY);
    const halfWAtY = b.halfWtop + (b.halfW - b.halfWtop) * t;
    return Math.abs(x - b.CX) <= halfWAtY;
  }
  function seedLights(CX, topY, treeH, baseHalfW, density) {
    lights = [];
    // Deterministic LCG so light positions stay put across re-mounts.
    let s = 91823;
    const rand = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
    const perTier = Math.round(4 + density * 14);
    for (let t = 0; t < TIERS; t++) {
      const b = tierBounds(t, CX, topY, treeH, baseHalfW);
      let placed = 0, attempts = 0;
      while (placed < perTier && attempts < perTier * 20) {
        attempts++;
        const x = b.CX + (rand() * 2 - 1) * b.halfW;
        const y = b.topY + rand() * (b.botY - b.topY);
        if (!pointInsideTier(x, y, b)) continue;
        lights.push({ x, y, tier: t, colorOffset: rand() * PALETTE.length, blinkPhase: rand() * Math.PI * 2 });
        placed++;
      }
    }
  }
  function spawnSnow() {
    snow.push({
      x: Math.random() * W,
      y: -2 * SCALE,
      vy: (10 + Math.random() * 22) * SCALE,
      vx: (Math.random() - 0.5) * 6 * SCALE,
      size: Math.max(1, Math.round(SCALE * (0.5 + Math.random() * 0.7))),
      sway: Math.random() * Math.PI * 2,
    });
    if (snow.length > SNOW_MAX) snow.shift();
  }
  function drawStar(cx, cy, r, glowAlpha) {
    // 5-pointed star path
    ctx.fillStyle = `rgb(${STAR_COLOR[0]}, ${STAR_COLOR[1]}, ${STAR_COLOR[2]})`;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = (i % 2 === 0) ? r : r * 0.42;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    // Halo
    const grad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 3);
    grad.addColorStop(0, `rgba(${STAR_COLOR[0]}, ${STAR_COLOR[1]}, ${STAR_COLOR[2]}, ${glowAlpha})`);
    grad.addColorStop(1, `rgba(${STAR_COLOR[0]}, ${STAR_COLOR[1]}, ${STAR_COLOR[2]}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
  }
  return {
    start() {
      lights = [];
      snow = [];
      smoothBands = [0, 0, 0, 0];
      smoothRMS = 0;
      lastFrame = performance.now();
      ctx.clearRect(0, 0, W, H);
    },
    draw(now, dt) {
      const sceneAlpha = cfgEffectBgOpacity;
      // Backdrop — frosty blue night
      if (sceneAlpha > 0.05) {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, `rgba(18, 30, 65, ${sceneAlpha})`);
        sky.addColorStop(1, `rgba(8, 14, 36, ${sceneAlpha})`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
      // Audio bands — 4 splits for 4 tiers (treble at top tier 0 → bass at bottom tier 3)
      const splits = [[0.55, 1.0], [0.35, 0.55], [0.15, 0.35], [0.0, 0.15]];
      const bands = [0, 0, 0, 0];
      let rms = 0;
      if (micActive && frequencies) {
        for (let i = 0; i < TIERS; i++) bands[i] = bandAverage(splits[i][0], splits[i][1]);
        rms = getRMS();
      } else if (cfgIdleAnim) {
        const t = now / 900;
        for (let i = 0; i < TIERS; i++) bands[i] = 0.18 + 0.10 * Math.sin(t * (1 + i * 0.4) + i * 1.3);
        rms = 0.18 + 0.10 * Math.abs(Math.sin(t * 0.7));
      }
      for (let i = 0; i < TIERS; i++) smoothBands[i] += (bands[i] - smoothBands[i]) * 0.30;
      smoothRMS += (rms - smoothRMS) * 0.25;
      // Tree geometry
      const CX = W / 2;
      const treeH = H * 0.74;
      const topY = H * 0.10;
      const baseHalfW = Math.min(W, H) * 0.34;
      const trunkW = baseHalfW * 0.18;
      const trunkH = H * 0.10;
      const trunkY = topY + treeH;
      // Snow — falling background, drawn behind tree
      const snowSpeedKnob = perViz['christmas-tree'].snowSpeed / 100;
      const speedMul = 0.5 + snowSpeedKnob * 1.6;
      if (Math.random() < 0.35) spawnSnow();
      const stillSnow = [];
      for (const f of snow) {
        f.x += f.vx * dt + Math.sin(now * 0.001 + f.sway) * 0.3;
        f.y += f.vy * dt * speedMul;
        if (f.y > H + 4 * SCALE) continue;
        ctx.fillStyle = `rgba(${SNOW[0]}, ${SNOW[1]}, ${SNOW[2]}, 0.85)`;
        ctx.fillRect(Math.round(f.x - f.size / 2), Math.round(f.y - f.size / 2), f.size, f.size);
        stillSnow.push(f);
      }
      snow = stillSnow;
      // Trunk
      ctx.fillStyle = `rgb(${TRUNK[0]}, ${TRUNK[1]}, ${TRUNK[2]})`;
      ctx.fillRect(Math.round(CX - trunkW / 2), Math.round(trunkY), Math.round(trunkW), Math.round(trunkH));
      ctx.fillStyle = `rgba(${TRUNK[0] + 30}, ${TRUNK[1] + 22}, ${TRUNK[2] + 18}, 0.55)`;
      ctx.fillRect(Math.round(CX - trunkW / 2), Math.round(trunkY), Math.max(1, Math.round(trunkW * 0.3)), Math.round(trunkH));
      // Tree tiers — back to front so each tier overlaps the one above
      for (let t = 0; t < TIERS; t++) {
        const b = tierBounds(t, CX, topY, treeH, baseHalfW);
        ctx.beginPath();
        ctx.moveTo(b.CX - b.halfWtop, b.topY);
        ctx.lineTo(b.CX + b.halfWtop, b.topY);
        ctx.lineTo(b.CX + b.halfW, b.botY);
        ctx.lineTo(b.CX - b.halfW, b.botY);
        ctx.closePath();
        ctx.fillStyle = `rgb(${TREE_DARK[0]}, ${TREE_DARK[1]}, ${TREE_DARK[2]})`;
        ctx.fill();
        // Lighter highlight on left half (faux directional light)
        ctx.fillStyle = `rgba(${TREE_GREEN[0]}, ${TREE_GREEN[1]}, ${TREE_GREEN[2]}, 0.85)`;
        ctx.beginPath();
        ctx.moveTo(b.CX - b.halfWtop, b.topY);
        ctx.lineTo(b.CX, b.topY);
        ctx.lineTo(b.CX, b.botY);
        ctx.lineTo(b.CX - b.halfW, b.botY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(${TREE_HIGHLIGHT[0]}, ${TREE_HIGHLIGHT[1]}, ${TREE_HIGHLIGHT[2]}, 0.35)`;
        ctx.beginPath();
        ctx.moveTo(b.CX - b.halfWtop, b.topY);
        ctx.lineTo(b.CX - b.halfWtop * 0.4, b.topY);
        ctx.lineTo(b.CX - b.halfW * 0.4, b.botY);
        ctx.lineTo(b.CX - b.halfW, b.botY);
        ctx.closePath();
        ctx.fill();
      }
      // Lights — re-seed if dimensions changed or empty
      const densityKnob = perViz['christmas-tree'].lightDensity / 100;
      if (lights.length === 0 || lights._lastW !== W || lights._lastH !== H) {
        seedLights(CX, topY, treeH, baseHalfW, densityKnob);
        lights._lastW = W;
        lights._lastH = H;
        lights._lastDensity = densityKnob;
      }
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const lightR = Math.max(1, Math.round(2 * SCALE));
      for (const lt of lights) {
        const band = smoothBands[lt.tier];
        const blinkAdd = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 0.005 + lt.blinkPhase));
        const lit = Math.min(1, band * 2 + 0.15) * blinkAdd;
        const rgb = getColor(colorT + lt.colorOffset);
        // Halo
        const halo = ctx.createRadialGradient(lt.x, lt.y, 0, lt.x, lt.y, lightR * 5);
        halo.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.6 * lit})`);
        halo.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
        ctx.fillStyle = halo;
        ctx.fillRect(lt.x - lightR * 5, lt.y - lightR * 5, lightR * 10, lightR * 10);
        // Bulb core
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.65 + lit * 0.35})`;
        ctx.fillRect(Math.round(lt.x - lightR), Math.round(lt.y - lightR), lightR * 2, lightR * 2);
        // Bright pixel highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * lit})`;
        ctx.fillRect(Math.round(lt.x - lightR / 2), Math.round(lt.y - lightR / 2), Math.max(1, Math.round(SCALE)), Math.max(1, Math.round(SCALE)));
      }
      // Star — pulses with RMS, halo grows with starGlow knob
      const starGlowKnob = perViz['christmas-tree'].starGlow / 100;
      const starR = (5 + smoothRMS * 4) * SCALE;
      const starGlow = (0.45 + smoothRMS * 0.5) * (0.4 + starGlowKnob * 1.5);
      drawStar(CX, topY - SCALE, starR, starGlow);
      // Re-seed lights when density knob changes meaningfully
      if (Math.abs((lights._lastDensity ?? -1) - densityKnob) > 0.05) {
        seedLights(CX, topY, treeH, baseHalfW, densityKnob);
        lights._lastDensity = densityKnob;
        lights._lastW = W;
        lights._lastH = H;
      }
    },
  };
};
