/* ── st-patricks-shamrocks (falling clovers + rainbow-arc backdrop + pot of gold) ──
   Shamrocks (mostly 3-leaf with rare 4-leaf "luck" drops) fall and spin from
   the top edge. The rainbow arc behind them is a stack of curved bands whose
   saturation pulses with bass (knob-controlled). A pot of gold in the lower-
   right corner ejects gold-coin particles on strong beats. */
VIZ_FACTORIES['st-patricks-shamrocks'] = function () {
  const RAINBOW = [
    [255, 50, 50],
    [255, 140, 50],
    [255, 220, 50],
    [60, 200, 80],
    [50, 130, 240],
    [160, 80, 220],
  ];
  const SHAMROCK_GREEN     = [40, 160, 60];
  const SHAMROCK_DARK      = [22, 110, 40];
  const SHAMROCK_HIGHLIGHT = [120, 220, 120];
  const STEM_COLOR         = [80, 60, 24];
  const POT_COLOR          = [40, 30, 22];
  const POT_HIGHLIGHT      = [80, 60, 40];
  const GOLD_COLOR         = [255, 215, 80];
  const GOLD_HOT           = [255, 245, 180];
  const MAX_SHAMROCKS = 70;
  const MAX_COINS = 30;
  let shamrocks = [];
  let coins = [];
  let smoothBass = 0, smoothMid = 0, smoothTreble = 0;
  let bassEMA = 0;
  function bandAverage(lo, hi) {
    if (!frequencies || frequencies.length === 0) return 0;
    const a = Math.floor(lo * frequencies.length);
    const b = Math.min(frequencies.length, Math.floor(hi * frequencies.length));
    let s = 0;
    for (let i = a; i < b; i++) s += frequencies[i];
    const n = Math.max(1, b - a);
    return (s / (n * 255)) * cfgGain;
  }
  function spawnShamrock() {
    const lucky = Math.random() < 0.06;
    shamrocks.push({
      x: Math.random() * W,
      y: -8 * SCALE,
      vy: (35 + Math.random() * 40) * SCALE,
      vx: (Math.random() - 0.5) * 14 * SCALE,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 1.6,
      size: 5 + Math.random() * 4,
      lucky,
      sway: Math.random() * Math.PI * 2,
    });
    if (shamrocks.length > MAX_SHAMROCKS) shamrocks.shift();
  }
  function spawnCoin(potX, potY) {
    coins.push({
      x: potX,
      y: potY,
      vx: (Math.random() - 0.3) * 90 * SCALE,
      vy: -(120 + Math.random() * 80) * SCALE,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 8,
      life: 1.4 + Math.random() * 0.6,
      age: 0,
      size: 3 + Math.random() * 1.5,
    });
    if (coins.length > MAX_COINS) coins.shift();
  }
  function drawLeaf(cx, cy, r, color) {
    // Heart-ish leaf — two arcs meeting at the bottom
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.30, cy - r * 0.28, r * 0.50, r * 0.62, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.30, cy - r * 0.28, r * 0.50, r * 0.62, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - r * 0.35, cy + r * 0.05);
    ctx.lineTo(cx + r * 0.35, cy + r * 0.05);
    ctx.closePath();
    ctx.fill();
  }
  function drawShamrock(s) {
    const cx = s.x;
    const cy = s.y + Math.sin(s.sway) * 1 * SCALE;
    const r = s.size * SCALE;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(s.rot);
    // Stem
    ctx.strokeStyle = `rgb(${STEM_COLOR[0]}, ${STEM_COLOR[1]}, ${STEM_COLOR[2]})`;
    ctx.lineWidth = Math.max(1, SCALE * 0.7);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.2);
    ctx.lineTo(0, r * 1.2);
    ctx.stroke();
    // 3 (or 4) leaves
    const leafCount = s.lucky ? 4 : 3;
    for (let i = 0; i < leafCount; i++) {
      const a = (i / leafCount) * Math.PI * 2 - Math.PI / 2;
      const lx = Math.cos(a) * r * 0.55;
      const ly = Math.sin(a) * r * 0.55;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(a + Math.PI / 2);
      drawLeaf(0, 0, r * 1.0, s.lucky ? SHAMROCK_GREEN : SHAMROCK_DARK);
      ctx.restore();
    }
    // Center pip
    ctx.fillStyle = `rgba(${SHAMROCK_HIGHLIGHT[0]}, ${SHAMROCK_HIGHLIGHT[1]}, ${SHAMROCK_HIGHLIGHT[2]}, 0.55)`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawRainbowArc(cx, cy, rOuter, rInner, satMul, alpha) {
    const bands = RAINBOW.length;
    const bandThickness = (rOuter - rInner) / bands;
    for (let i = 0; i < bands; i++) {
      const c = RAINBOW[i];
      const sr = Math.round(c[0] + (255 - c[0]) * (1 - satMul));
      const sg = Math.round(c[1] + (255 - c[1]) * (1 - satMul));
      const sb = Math.round(c[2] + (255 - c[2]) * (1 - satMul));
      const r1 = rOuter - i * bandThickness;
      const r2 = r1 - bandThickness;
      ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r1, Math.PI, Math.PI * 2);
      ctx.arc(cx, cy, r2, Math.PI * 2, Math.PI, true);
      ctx.closePath();
      ctx.fill();
    }
  }
  function drawPotOfGold(potX, potY) {
    const w = 28 * SCALE;
    const h = 22 * SCALE;
    // Pile of gold spilling over the rim
    ctx.fillStyle = `rgb(${GOLD_COLOR[0]}, ${GOLD_COLOR[1]}, ${GOLD_COLOR[2]})`;
    ctx.beginPath();
    ctx.ellipse(potX, potY - h * 0.45, w * 0.50, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgb(${GOLD_HOT[0]}, ${GOLD_HOT[1]}, ${GOLD_HOT[2]})`;
    ctx.beginPath();
    ctx.ellipse(potX - w * 0.12, potY - h * 0.50, w * 0.18, h * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pot body
    ctx.fillStyle = `rgb(${POT_COLOR[0]}, ${POT_COLOR[1]}, ${POT_COLOR[2]})`;
    ctx.beginPath();
    ctx.moveTo(potX - w * 0.45, potY - h * 0.40);
    ctx.quadraticCurveTo(potX - w * 0.60, potY + h * 0.20, potX - w * 0.30, potY + h * 0.50);
    ctx.lineTo(potX + w * 0.30, potY + h * 0.50);
    ctx.quadraticCurveTo(potX + w * 0.60, potY + h * 0.20, potX + w * 0.45, potY - h * 0.40);
    ctx.closePath();
    ctx.fill();
    // Rim
    ctx.fillStyle = `rgb(${POT_HIGHLIGHT[0]}, ${POT_HIGHLIGHT[1]}, ${POT_HIGHLIGHT[2]})`;
    ctx.beginPath();
    ctx.ellipse(potX, potY - h * 0.40, w * 0.48, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Inner darkness
    ctx.fillStyle = `rgba(${POT_COLOR[0]}, ${POT_COLOR[1]}, ${POT_COLOR[2]}, 0.85)`;
    ctx.beginPath();
    ctx.ellipse(potX, potY - h * 0.40, w * 0.40, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawCoin(c) {
    const t = c.age / c.life;
    const fade = Math.pow(1 - t, 1.1);
    const cx = c.x, cy = c.y;
    const sz = c.size * SCALE * (1 + Math.abs(Math.sin(c.rot)) * 0.4);
    ctx.fillStyle = `rgba(${GOLD_COLOR[0]}, ${GOLD_COLOR[1]}, ${GOLD_COLOR[2]}, ${fade})`;
    ctx.fillRect(Math.round(cx - sz / 2), Math.round(cy - sz / 2), Math.round(sz), Math.round(sz));
    ctx.fillStyle = `rgba(${GOLD_HOT[0]}, ${GOLD_HOT[1]}, ${GOLD_HOT[2]}, ${fade})`;
    ctx.fillRect(Math.round(cx - sz / 4), Math.round(cy - sz / 4), Math.max(1, Math.round(sz / 2)), Math.max(1, Math.round(sz / 2)));
  }
  return {
    start() {
      shamrocks = [];
      coins = [];
      bassEMA = 0;
    },
    draw(now, dt) {
      const sceneAlpha = cfgEffectBgOpacity;
      if (sceneAlpha > 0.05) {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, `rgba(150, 200, 230, ${sceneAlpha})`);
        sky.addColorStop(1, `rgba(190, 220, 200, ${sceneAlpha})`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
      let bass, mid, treble;
      if (micActive && frequencies) {
        bass = bandAverage(0, 0.18);
        mid = bandAverage(0.18, 0.55);
        treble = bandAverage(0.55, 1.0);
      } else if (cfgIdleAnim) {
        const t = now / 1100;
        bass = 0.16 + 0.06 * Math.sin(t);
        mid = 0.16 + 0.05 * Math.sin(t * 1.3);
        treble = 0.16 + 0.05 * Math.sin(t * 1.7);
      } else { bass = 0; mid = 0; treble = 0; }
      smoothBass += (bass - smoothBass) * 0.20;
      smoothMid += (mid - smoothMid) * 0.18;
      smoothTreble += (treble - smoothTreble) * 0.25;
      bassEMA = bassEMA * 0.85 + bass * 0.15;
      // Rainbow arc — centered well below the canvas so we see only its top
      const satKnob = perViz['st-patricks-shamrocks'].rainbowSaturation / 100;
      const sat = (0.4 + satKnob * 0.7) * (0.7 + smoothBass * 0.6);
      const arcCx = W / 2;
      const arcCy = H * 1.2;
      const rOuter = Math.min(W, H) * 1.05;
      const rInner = rOuter * 0.78;
      drawRainbowArc(arcCx, arcCy, rOuter, rInner, Math.min(1, sat), Math.min(1, sceneAlpha * (0.55 + satKnob * 0.45)));
      // Spawn shamrocks
      const densityKnob = perViz['st-patricks-shamrocks'].shamrockDensity / 100;
      const spawnP = (0.05 + smoothMid * 0.25 + smoothBass * 0.12) * (0.4 + densityKnob * 1.6);
      if (Math.random() < spawnP) spawnShamrock();
      // Update + draw shamrocks
      const stillShamrocks = [];
      for (const s of shamrocks) {
        s.y += s.vy * dt * (0.9 + smoothBass * 0.5);
        s.x += s.vx * dt + Math.sin(s.sway) * 0.4;
        s.sway += dt * 1.2;
        s.rot += s.rotSpeed * dt * (1 + smoothTreble * 1.5);
        if (s.y > H + 20 * SCALE) continue;
        drawShamrock(s);
        stillShamrocks.push(s);
      }
      shamrocks = stillShamrocks;
      // Pot of gold (lower-right) — spawns coins on strong beats
      const potX = W * 0.84;
      const potY = H * 0.86;
      drawPotOfGold(potX, potY);
      const goldKnob = perViz['st-patricks-shamrocks'].goldRate / 100;
      const strongBeat = bass > bassEMA * 1.55 + 0.15;
      if ((strongBeat || (cfgIdleAnim && !micActive && Math.random() < 0.01)) && Math.random() < goldKnob * 0.55) {
        for (let k = 0; k < 2; k++) spawnCoin(potX + (Math.random() - 0.5) * 6 * SCALE, potY - 12 * SCALE);
      }
      const stillCoins = [];
      for (const c of coins) {
        c.age += dt;
        if (c.age >= c.life) continue;
        c.vy += 380 * SCALE * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += c.rotSpeed * dt;
        if (c.y > H + 20 * SCALE) continue;
        drawCoin(c);
        stillCoins.push(c);
      }
      coins = stillCoins;
    },
  };
};
