/* ── owl (pixel-art owl with bobbing/wing-flap physics) ── */
VIZ_FACTORIES['owl'] = function () {
  const P = Math.max(2, Math.round(4 * SCALE));
  let smoothVol = 0;
  let bobY = 0, bobVel = 0;
  let swayX = 0, swayVel = 0;
  let wingAngle = 0;

  function getVolume() {
    if (!micActive || !frequencies) return 0;
    let sum = 0;
    for (let i = 0; i < frequencies.length; i++) sum += frequencies[i];
    return (sum / (frequencies.length * 255)) * cfgGain;
  }
  function getBalance() {
    if (!micActive || !frequencies || frequencies.length < 4) return 0;
    const mid = Math.floor(frequencies.length / 2);
    let lo = 0, hi = 0;
    for (let i = 0; i < mid; i++) lo += frequencies[i];
    for (let i = mid; i < frequencies.length; i++) hi += frequencies[i];
    const total = lo + hi;
    if (total < 10) return 0;
    return (hi - lo) / total;
  }
  function px(x, y, w, h) {
    ctx.fillRect(Math.round(x) * P, Math.round(y) * P, (w || 1) * P, (h || 1) * P);
  }
  function drawOneEye(ex, ey, blink, happy, now, isRight) {
    if (blink) { ctx.fillStyle = '#0A0A1A'; px(ex, ey + 1, 3, 1); return; }
    if (happy) {
      ctx.fillStyle = '#0A0A1A';
      px(ex, ey + 1, 1, 1); px(ex + 1, ey, 1, 1); px(ex + 2, ey + 1, 1, 1);
      return;
    }
    ctx.fillStyle = '#0A0A1A'; px(ex, ey, 3, 3);
    ctx.fillStyle = '#1a1a3a'; px(ex, ey, 3, 3);
    ctx.fillStyle = '#0A0A1A';
    const lookX = isRight ? 1 : 0;
    px(ex + lookX, ey + 1, 2, 2);
    ctx.fillStyle = '#FFFFFF';
    px(ex, ey, 1, 1); px(ex + 1, ey, 1, 1); px(ex, ey + 1, 1, 1);
    px(ex + 2, ey + 2, 1, 1);
  }
  function drawEyes(ox, oy, vol, now, bounceSens) {
    const blink = (now % 3800) > 3650;
    const happy = vol > 0.35 * bounceSens * 2;
    drawOneEye(ox - 3, oy - 3, blink, happy, now, false);
    drawOneEye(ox + 2, oy - 3, blink, happy, now, true);
  }
  function drawNotes(ox, oy, now, colorT) {
    const notes = [
      { dx: 9, phase: 0, speed: 1800 },
      { dx: -9, phase: 1.5, speed: 2200 },
      { dx: 10, phase: 3.0, speed: 2000 },
    ];
    for (const n of notes) {
      const t = ((now / n.speed) + n.phase) % 1;
      const ny = oy - 6 - t * 12;
      const nx = ox + n.dx + Math.sin(t * Math.PI * 2) * 2;
      const alpha = 1 - t;
      if (alpha < 0.1) continue;
      const rgb = getColor(colorT + n.phase);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.7})`;
      px(Math.round(nx), Math.round(ny), 2, 1);
      px(Math.round(nx) + 1, Math.round(ny) - 2, 1, 2);
      px(Math.round(nx) + 2, Math.round(ny) - 2, 1, 1);
    }
  }

  return {
    draw() {
      ctx.clearRect(0, 0, W, H);
      const CX = W / 2;
      const CY = H / 2;
      const now = Date.now();
      const bounceSens = cfgBounce / 100;
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const bScale = bounceSens * 2;
      const rawVol = getVolume();
      smoothVol += (rawVol - smoothVol) * 0.25;
      const balance = getBalance();
      bobVel += (rawVol - smoothVol) * 6 * bScale;
      bobVel -= bobY * 0.14;
      bobVel *= 0.85;
      bobY += bobVel;
      const swayTarget = balance * 12 * bScale;
      swayVel += (swayTarget - swayX) * 0.08;
      swayVel *= 0.88;
      swayX += swayVel;
      const wingTarget = Math.min(1, rawVol * 3 * bScale);
      wingAngle += (wingTarget - wingAngle) * 0.3;
      wingAngle *= 0.92;
      const breath = (micActive || !cfgIdleAnim) ? 0 : Math.sin(now / 900) * 2;
      const idleSway = (micActive || !cfgIdleAnim) ? 0 : Math.sin(now / 1200) * 1.5;
      const ox = Math.round(CX / P + swayX + idleSway);
      const oy = Math.round(CY / P - bobY * 4 * bScale + breath + 2);
      const rgb = getColor(colorT);
      const rgbStr = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      const rgbGlow = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.15)`;
      const rgbDim = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.4)`;
      const tipRgb = [Math.min(255, rgb[0] + 80), Math.min(255, rgb[1] + 80), Math.min(255, rgb[2] + 80)];
      const tipStr = `rgb(${tipRgb[0]},${tipRgb[1]},${tipRgb[2]})`;
      const rgb2 = getColor(colorT + 2);
      const rgb2Str = `rgb(${rgb2[0]},${rgb2[1]},${rgb2[2]})`;
      const rgb2Dim = `rgba(${rgb2[0]},${rgb2[1]},${rgb2[2]},0.3)`;
      ctx.fillStyle = rgbGlow;
      const glowW = 14 + smoothVol * 6 * bScale;
      px(ox - glowW / 2, oy + 14, glowW, 2);
      px(ox - glowW / 2 + 1, oy + 15, glowW - 2, 1);
      ctx.fillStyle = rgbDim;
      px(ox - 4, oy + 5, 8, 1); px(ox - 5, oy + 6, 10, 1); px(ox - 5, oy + 7, 10, 1);
      px(ox - 5, oy + 8, 10, 1); px(ox - 5, oy + 9, 10, 1); px(ox - 4, oy + 10, 8, 1);
      px(ox - 3, oy + 11, 6, 1);
      ctx.fillStyle = rgb2Dim;
      px(ox - 2, oy + 7, 4, 1); px(ox - 1, oy + 8, 2, 1);
      px(ox - 3, oy + 9, 6, 1); px(ox - 2, oy + 10, 4, 1);
      ctx.fillStyle = rgbStr;
      px(ox - 4, oy + 5, 1, 1); px(ox + 3, oy + 5, 1, 1);
      for (let r = 6; r <= 9; r++) { px(ox - 5, oy + r, 1, 1); px(ox + 4, oy + r, 1, 1); }
      px(ox - 4, oy + 10, 1, 1); px(ox + 3, oy + 10, 1, 1);
      px(ox - 3, oy + 11, 1, 1); px(ox + 2, oy + 11, 1, 1);
      ctx.fillStyle = rgb2Str;
      px(ox - 3, oy + 12, 2, 1); px(ox + 1, oy + 12, 2, 1);
      ctx.fillStyle = tipStr;
      px(ox - 4, oy + 13, 1, 1); px(ox - 2, oy + 13, 1, 1);
      px(ox + 1, oy + 13, 1, 1); px(ox + 3, oy + 13, 1, 1);
      const wingLift = Math.round(wingAngle * 5);
      ctx.fillStyle = rgbDim;
      px(ox - 7, oy + 5 - wingLift, 2, 4);
      px(ox - 8, oy + 6 - wingLift, 1, 3);
      ctx.fillStyle = rgbStr;
      px(ox - 8, oy + 5 - wingLift, 1, 1);
      px(ox - 7, oy + 4 - wingLift, 1, 1);
      px(ox - 8, oy + 9 - wingLift, 1, 1);
      px(ox - 7, oy + 9 - wingLift, 2, 1);
      ctx.fillStyle = tipStr;
      px(ox - 9, oy + 6 - wingLift, 1, 2);
      ctx.fillStyle = rgbDim;
      px(ox + 5, oy + 5 - wingLift, 2, 4);
      px(ox + 7, oy + 6 - wingLift, 1, 3);
      ctx.fillStyle = rgbStr;
      px(ox + 7, oy + 5 - wingLift, 1, 1);
      px(ox + 6, oy + 4 - wingLift, 1, 1);
      px(ox + 7, oy + 9 - wingLift, 1, 1);
      px(ox + 5, oy + 9 - wingLift, 2, 1);
      ctx.fillStyle = tipStr;
      px(ox + 8, oy + 6 - wingLift, 1, 2);
      ctx.fillStyle = rgbDim;
      px(ox - 4, oy - 5, 8, 1); px(ox - 5, oy - 4, 10, 1);
      px(ox - 6, oy - 3, 12, 1); px(ox - 6, oy - 2, 12, 1);
      px(ox - 6, oy - 1, 12, 1); px(ox - 6, oy, 12, 1);
      px(ox - 6, oy + 1, 12, 1); px(ox - 5, oy + 2, 10, 1);
      px(ox - 5, oy + 3, 10, 1); px(ox - 4, oy + 4, 8, 1);
      ctx.fillStyle = rgbStr;
      px(ox - 4, oy - 6, 8, 1);
      px(ox - 5, oy - 5, 1, 1); px(ox + 4, oy - 5, 1, 1);
      px(ox - 6, oy - 4, 1, 1); px(ox + 5, oy - 4, 1, 1);
      for (let r = -3; r <= 1; r++) { px(ox - 7, oy + r, 1, 1); px(ox + 6, oy + r, 1, 1); }
      px(ox - 6, oy + 2, 1, 1); px(ox + 5, oy + 2, 1, 1);
      px(ox - 6, oy + 3, 1, 1); px(ox + 5, oy + 3, 1, 1);
      px(ox - 5, oy + 4, 1, 1); px(ox + 4, oy + 4, 1, 1);
      px(ox - 4, oy + 5, 8, 1);
      ctx.fillStyle = tipStr;
      px(ox - 6, oy - 6, 1, 1); px(ox - 7, oy - 7, 1, 1);
      px(ox - 5, oy - 7, 1, 1); px(ox - 6, oy - 8, 1, 1);
      px(ox + 5, oy - 6, 1, 1); px(ox + 6, oy - 7, 1, 1);
      px(ox + 4, oy - 7, 1, 1); px(ox + 5, oy - 8, 1, 1);
      ctx.fillStyle = rgb2Dim;
      px(ox - 4, oy - 4, 3, 1); px(ox + 1, oy - 4, 3, 1);
      px(ox - 5, oy - 3, 1, 2); px(ox + 4, oy - 3, 1, 2);
      px(ox - 4, oy - 1, 3, 1); px(ox + 1, oy - 1, 3, 1);
      drawEyes(ox, oy, smoothVol, now, bounceSens);
      ctx.fillStyle = rgb2Str;
      px(ox - 1, oy + 1, 2, 1);
      ctx.fillStyle = tipStr;
      px(ox, oy + 2, 1, 1);
      if (smoothVol > 0.15 * bounceSens * 2 || (!micActive && Math.sin(now / 900) > 0.8)) {
        ctx.fillStyle = 'rgba(255, 100, 150, 0.6)';
        px(ox - 1, oy + 2, 1, 1); px(ox, oy + 2, 1, 1); px(ox + 1, oy + 2, 1, 1);
        if (smoothVol > 0.3 * bounceSens * 2) px(ox - 1, oy + 3, 3, 1);
      }
      if (smoothVol > 0.25) drawNotes(ox, oy, now, colorT);
    },
  };
};
