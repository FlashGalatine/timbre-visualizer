/* ── thanksgiving-harvest (pumpkin pile + falling autumn leaves + swaying wheat) ──
   A trio of stacked pumpkins sits at center-bottom and pulses subtly with bass.
   Falling leaves drift down across the screen (lighter than autumn-leaves).
   Wheat stalks at the left/right edges sway with smoothed audio direction.
   Warm cornucopia palette. */
VIZ_FACTORIES['thanksgiving-harvest'] = function () {
  const PUMPKIN_BASE  = [232, 110, 36];
  const PUMPKIN_DARK  = [180, 80, 24];
  const PUMPKIN_HOT   = [255, 175, 80];
  const STEM          = [82, 50, 20];
  const SKY_TOP       = [80, 42, 28];
  const SKY_BOT       = [38, 24, 18];
  const LEAF_COLORS = [
    [212, 64, 28], [232, 110, 36], [240, 168, 50], [185, 80, 30], [156, 60, 24], [220, 130, 40], [122, 70, 30],
  ];
  const WHEAT_LIGHT = [228, 196, 110];
  const WHEAT_DARK  = [148, 110, 50];
  const MAX_LEAVES = 50;
  let leaves = [];
  let smoothBass = 0, smoothMid = 0, smoothTreble = 0;
  let smoothBalance = 0;
  function bandAverage(lo, hi) {
    if (!frequencies || frequencies.length === 0) return 0;
    const a = Math.floor(lo * frequencies.length);
    const b = Math.min(frequencies.length, Math.floor(hi * frequencies.length));
    let s = 0;
    for (let i = a; i < b; i++) s += frequencies[i];
    const n = Math.max(1, b - a);
    return (s / (n * 255)) * cfgGain;
  }
  function getBalance() {
    if (!micActive || !frequencies || frequencies.length < 4) return 0;
    const mid = Math.floor(frequencies.length / 2);
    let lo = 0, hi = 0;
    for (let i = 0; i < mid; i++) lo += frequencies[i];
    for (let i = mid; i < frequencies.length; i++) hi += frequencies[i];
    const tot = lo + hi;
    if (tot < 10) return 0;
    return (hi - lo) / tot;
  }
  function spawnLeaf() {
    leaves.push({
      x: Math.random() * W,
      y: -8 * SCALE,
      vy: (24 + Math.random() * 36) * SCALE,
      vx: (Math.random() - 0.5) * 22 * SCALE,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 1.4,
      size: 4 + Math.random() * 3,
      color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      sway: Math.random() * Math.PI * 2,
    });
    if (leaves.length > MAX_LEAVES) leaves.shift();
  }
  function drawPumpkin(cx, cy, rx, ry, pulse) {
    const r = ry * (1 + pulse * 0.04);
    const wx = rx * (1 + pulse * 0.04);
    // Lobed body
    const lobes = [
      { dx: -0.62, sx: 0.55, dim: 0.85 },
      { dx: -0.30, sx: 0.62, dim: 0.92 },
      { dx:  0.00, sx: 0.66, dim: 1.00 },
      { dx:  0.30, sx: 0.62, dim: 0.92 },
      { dx:  0.62, sx: 0.55, dim: 0.85 },
    ];
    for (const l of lobes) {
      const lr = wx * l.sx;
      const lx = cx + l.dx * wx * 0.55;
      const tone = PUMPKIN_BASE.map((c, i) => Math.round(c * l.dim + PUMPKIN_DARK[i] * (1 - l.dim)));
      ctx.fillStyle = `rgb(${tone[0]}, ${tone[1]}, ${tone[2]})`;
      ctx.beginPath();
      ctx.ellipse(lx, cy, lr, r, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Highlight on front
    ctx.fillStyle = `rgba(${PUMPKIN_HOT[0]}, ${PUMPKIN_HOT[1]}, ${PUMPKIN_HOT[2]}, 0.45)`;
    ctx.beginPath();
    ctx.ellipse(cx - wx * 0.18, cy - r * 0.30, wx * 0.18, r * 0.32, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Stem
    const sw = wx * 0.18;
    const sh = r * 0.30;
    ctx.fillStyle = `rgb(${STEM[0]}, ${STEM[1]}, ${STEM[2]})`;
    ctx.fillRect(Math.round(cx - sw / 2), Math.round(cy - r - sh * 0.85), Math.round(sw), Math.round(sh));
    // Curl on stem
    ctx.strokeStyle = `rgba(${STEM[0] + 20}, ${STEM[1] + 12}, ${STEM[2] + 8}, 0.7)`;
    ctx.lineWidth = Math.max(1, SCALE * 0.6);
    ctx.beginPath();
    ctx.moveTo(cx + sw * 0.7, cy - r - sh * 0.85);
    ctx.quadraticCurveTo(cx + sw * 1.6, cy - r - sh * 0.50, cx + sw * 0.9, cy - r - sh * 0.20);
    ctx.stroke();
  }
  function drawMaple(cx, cy, r, rot, color, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    ctx.beginPath();
    const pts = 5;
    for (let i = 0; i < pts * 2; i++) {
      const t = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = (i % 2 === 0) ? r : r * 0.42;
      const px = Math.cos(t) * rr;
      const py = Math.sin(t) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function drawWheat(baseX, baseY, height, sway) {
    // Stalk: a curving line; head: a teardrop with grain dashes
    const tipX = baseX + Math.sin(sway) * height * 0.16;
    const tipY = baseY - height;
    ctx.strokeStyle = `rgb(${WHEAT_DARK[0]}, ${WHEAT_DARK[1]}, ${WHEAT_DARK[2]})`;
    ctx.lineWidth = Math.max(1, SCALE);
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + Math.sin(sway) * height * 0.10, baseY - height * 0.5, tipX, tipY);
    ctx.stroke();
    // Head — a stack of horizontal slashes (grain ears)
    const headH = height * 0.30;
    const headW = height * 0.10;
    ctx.fillStyle = `rgb(${WHEAT_LIGHT[0]}, ${WHEAT_LIGHT[1]}, ${WHEAT_LIGHT[2]})`;
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const yy = tipY + headH * t;
      const w = headW * (1 - Math.abs(t - 0.5));
      ctx.beginPath();
      ctx.ellipse(tipX + Math.sin(sway + t) * SCALE, yy, w, headH * 0.10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Tip whiskers
    ctx.strokeStyle = `rgba(${WHEAT_LIGHT[0]}, ${WHEAT_LIGHT[1]}, ${WHEAT_LIGHT[2]}, 0.7)`;
    for (let k = -1; k <= 1; k += 2) {
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + k * height * 0.08, tipY - height * 0.10);
      ctx.stroke();
    }
  }
  return {
    start() {
      leaves = [];
      smoothBalance = 0;
    },
    draw(now, dt) {
      const sceneAlpha = cfgEffectBgOpacity;
      if (sceneAlpha > 0.05) {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, `rgba(${SKY_TOP[0]}, ${SKY_TOP[1]}, ${SKY_TOP[2]}, ${sceneAlpha})`);
        sky.addColorStop(1, `rgba(${SKY_BOT[0]}, ${SKY_BOT[1]}, ${SKY_BOT[2]}, ${sceneAlpha})`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        // Soft horizon glow band
        ctx.fillStyle = `rgba(245, 180, 90, ${sceneAlpha * 0.18})`;
        ctx.fillRect(0, H * 0.55, W, H * 0.10);
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
      smoothBass += (bass - smoothBass) * 0.18;
      smoothMid += (mid - smoothMid) * 0.20;
      smoothTreble += (treble - smoothTreble) * 0.25;
      smoothBalance += (getBalance() - smoothBalance) * 0.15;
      // Wheat — sway responds to balance + idle sine
      const swayKnob = perViz['thanksgiving-harvest'].wheatSway / 100;
      const swayBase = micActive ? smoothBalance * 0.7 : Math.sin(now / 1400) * 0.45;
      const sway = swayBase * (0.4 + swayKnob * 1.6);
      const wheatH = H * 0.55;
      const wheatBaseY = H * 0.92;
      for (let i = 0; i < 4; i++) {
        const xL = W * (0.04 + i * 0.025);
        const xR = W * (0.96 - i * 0.025);
        const phaseOff = i * 0.4;
        drawWheat(xL, wheatBaseY, wheatH * (0.85 + i * 0.04), sway + phaseOff);
        drawWheat(xR, wheatBaseY, wheatH * (0.85 + i * 0.04), sway - phaseOff);
      }
      // Spawn falling leaves
      const leafKnob = perViz['thanksgiving-harvest'].leafDensity / 100;
      const spawnP = (0.06 + smoothMid * 0.25 + smoothTreble * 0.15) * (0.4 + leafKnob * 1.6);
      if (Math.random() < spawnP) spawnLeaf();
      // Update + draw leaves (drawn behind pumpkins)
      const stillLeaves = [];
      for (const lf of leaves) {
        lf.y += lf.vy * dt * (0.85 + smoothBass * 0.4);
        lf.x += lf.vx * dt + Math.sin(lf.sway) * 0.8;
        lf.sway += dt * 1.2;
        lf.rot += lf.rotSpeed * dt;
        if (lf.y > H + 20 * SCALE) continue;
        drawMaple(lf.x, lf.y, lf.size * SCALE, lf.rot, lf.color, 0.85);
        stillLeaves.push(lf);
      }
      leaves = stillLeaves;
      // Pumpkin pile — three pumpkins, biggest center
      const pulseKnob = perViz['thanksgiving-harvest'].pumpkinPulse / 100;
      const pulse = smoothBass * (0.4 + pulseKnob * 1.6);
      const cx = W / 2;
      const baseY = H * 0.88;
      const bigR = Math.min(W, H) * 0.22;
      drawPumpkin(cx, baseY, bigR, bigR * 0.85, pulse);
      drawPumpkin(cx - bigR * 1.05, baseY + bigR * 0.10, bigR * 0.62, bigR * 0.55, pulse * 0.7);
      drawPumpkin(cx + bigR * 1.10, baseY + bigR * 0.05, bigR * 0.70, bigR * 0.60, pulse * 0.85);
      drawPumpkin(cx + bigR * 0.20, baseY - bigR * 0.85, bigR * 0.52, bigR * 0.45, pulse * 0.6);
      // Foreground glow when bass beat hits
      if (smoothBass > 0.3) {
        ctx.fillStyle = `rgba(255, 200, 110, ${Math.min(0.18, smoothBass * 0.18)})`;
        ctx.fillRect(0, H * 0.65, W, H * 0.35);
      }
    },
  };
};
