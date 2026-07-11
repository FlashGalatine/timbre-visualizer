/* ── blob (kawaii bouncing blob with face) ── */
VIZ_FACTORIES['blob'] = function () {
  const GRID = Math.max(2, Math.round(4 * SCALE));
  const BASE_R = 28 * SCALE;
  const MAX_R = 56 * SCALE;
  const NUM_VERTS = 24;
  const BOUNCE_DECAY = 0.88;
  const BOUNCE_SPEED = 0.12;
  const P = GRID;
  let smoothVol = 0;
  let bounceY = 0;
  let bounceVel = 0;

  function snap(v) { return Math.round(v / GRID) * GRID; }
  function getVolume() {
    if (!micActive || !frequencies) return 0;
    let sum = 0;
    for (let i = 0; i < frequencies.length; i++) sum += frequencies[i];
    return (sum / (frequencies.length * 255)) * cfgGain;
  }
  function getFreqAt(vertIndex) {
    if (!micActive || !frequencies || frequencies.length === 0) return 0;
    const bin = Math.floor((vertIndex / NUM_VERTS) * frequencies.length);
    return ((frequencies[bin] || 0) / 255) * cfgGain;
  }
  function drawBlobShape(verts, inflate, CX, CY) {
    ctx.beginPath();
    for (let i = 0; i < verts.length; i++) {
      const v = verts[i];
      let x = v.x, y = v.y;
      if (inflate > 0) {
        const dx = v.x - CX;
        const dy = v.y - CY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        x = snap(v.x + (dx / dist) * inflate);
        y = snap(v.y + (dy / dist) * inflate);
      }
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  function drawSteppedLine(x0, y0, x1, y1, rgb) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const steps = Math.max(dx, dy) / GRID;
    if (steps < 1) return;
    ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = snap(x0 + (x1 - x0) * t);
      const y = snap(y0 + (y1 - y0) * t);
      ctx.fillRect(x - 1, y - 1, GRID - 1, GRID - 1);
    }
  }
  function drawEye(ex, ey, blink, happy, now) {
    if (blink) { ctx.fillStyle = '#0A0A1A'; ctx.fillRect(ex - 2 * P, ey, 5 * P, P); return; }
    if (happy) {
      ctx.fillStyle = '#0A0A1A';
      ctx.fillRect(ex - 2 * P, ey + P, P, P);
      ctx.fillRect(ex - P,      ey,     P, P);
      ctx.fillRect(ex,           ey - P, P, P);
      ctx.fillRect(ex + P,      ey,     P, P);
      ctx.fillRect(ex + 2 * P,  ey + P, P, P);
      return;
    }
    ctx.fillStyle = '#0A0A1A';
    ctx.fillRect(ex - P,     ey - 2 * P, 3 * P, P);
    ctx.fillRect(ex - 2 * P, ey - P,     5 * P, 3 * P);
    ctx.fillRect(ex - P,     ey + 2 * P, 3 * P, P);
    const irisShift = Math.round(Math.sin(now / 2000)) * P;
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(ex - P + irisShift, ey - P, 3 * P, 3 * P);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ex - P, ey - P, P * 2, P * 2);
    ctx.fillRect(ex + P, ey + P, P, P);
  }
  function drawMouth(mx, my, vol) {
    ctx.fillStyle = '#0A0A1A';
    if (vol > 0.4) {
      ctx.fillRect(mx - P,     my - P,     3 * P, P);
      ctx.fillRect(mx - 2 * P, my,         P,     P);
      ctx.fillRect(mx + 2 * P, my,         P,     P);
      ctx.fillRect(mx - P,     my + P,     3 * P, P);
      ctx.fillStyle = 'rgba(255, 100, 150, 0.6)';
      ctx.fillRect(mx - P, my, 3 * P, P);
    } else if (vol > 0.15) {
      ctx.fillRect(mx - P, my - P, 3 * P, P);
      ctx.fillRect(mx - P, my + P, 3 * P, P);
      ctx.fillStyle = 'rgba(255, 100, 150, 0.5)';
      ctx.fillRect(mx - P, my, 3 * P, P);
    } else {
      ctx.fillRect(mx - 3 * P, my - P, P, P);
      ctx.fillRect(mx - 2 * P, my,     P, P);
      ctx.fillRect(mx - P,     my - P, P, P);
      ctx.fillRect(mx,         my - P, P, P);
      ctx.fillRect(mx + P,     my,     P, P);
      ctx.fillRect(mx + 2 * P, my - P, P, P);
    }
  }
  function drawFace(cx, cy, vol, now) {
    const eyeY = cy - 4 * P;
    const mouthY = cy + 3 * P;
    const eyeSpacing = 7 * P;
    const blinkCycle = now % 3500;
    const isBlinking = blinkCycle > 3350;
    const isHappy = vol > 0.35;
    drawEye(cx - eyeSpacing / 2, eyeY, isBlinking, isHappy, now);
    drawEye(cx + eyeSpacing / 2, eyeY, isBlinking, isHappy, now);
    drawMouth(cx, mouthY, vol);
    const blushY = cy;
    ctx.fillStyle = 'rgba(255, 100, 150, 0.35)';
    ctx.fillRect(cx - eyeSpacing / 2 - 4 * P, blushY, P * 2, P);
    ctx.fillRect(cx - eyeSpacing / 2 - 3 * P, blushY + P, P * 2, P);
    ctx.fillRect(cx + eyeSpacing / 2 + 2 * P, blushY, P * 2, P);
    ctx.fillRect(cx + eyeSpacing / 2 + P, blushY + P, P * 2, P);
  }

  return {
    draw() {
      ctx.clearRect(0, 0, W, H);
      const CX = W / 2;
      const CY = H / 2;
      const now = Date.now();
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const bounceSens = cfgBounce / 100;
      const rawVol = getVolume();
      smoothVol += (rawVol - smoothVol) * 0.25;
      const bScale = bounceSens * 2;
      bounceVel += (rawVol - smoothVol) * 8 * bScale;
      bounceVel -= bounceY * BOUNCE_SPEED;
      bounceVel *= BOUNCE_DECAY;
      bounceY += bounceVel;
      const blobCX = CX;
      const blobCY = snap(CY - bounceY * 20 * SCALE * bScale);
      const dynR = BASE_R + smoothVol * (MAX_R - BASE_R) * bScale;
      const verts = [];
      for (let i = 0; i < NUM_VERTS; i++) {
        const angle = (i / NUM_VERTS) * Math.PI * 2;
        const freqInfluence = getFreqAt(i);
        const wobble =
          Math.sin(angle * 3 + now / 300) * 4 * SCALE +
          Math.sin(angle * 5 - now / 500) * 3 * SCALE +
          Math.sin(angle * 2 + now / 700) * 2 * SCALE;
        const breath = (micActive || !cfgIdleAnim) ? 0 : Math.sin(now / 800) * 4 * SCALE;
        const r = dynR + freqInfluence * 18 * SCALE * bScale + wobble + breath;
        const vx = snap(blobCX + Math.cos(angle) * r);
        const vy = snap(blobCY + Math.sin(angle) * r);
        verts.push({ x: vx, y: vy, angle, freqInfluence });
      }
      const glowRgb = getColor(colorT);
      ctx.globalAlpha = 0.08;
      drawBlobShape(verts, 8 * SCALE, CX, CY);
      ctx.fillStyle = `rgb(${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]})`;
      ctx.fill();
      ctx.globalAlpha = 0.12;
      drawBlobShape(verts, 4 * SCALE, CX, CY);
      ctx.fillStyle = `rgb(${glowRgb[0]}, ${glowRgb[1]}, ${glowRgb[2]})`;
      ctx.fill();
      ctx.globalAlpha = 1.0;
      drawBlobShape(verts, 0, CX, CY);
      const bodyRgb = getColor(colorT + 0.5);
      ctx.fillStyle = `rgba(${bodyRgb[0]}, ${bodyRgb[1]}, ${bodyRgb[2]}, 0.25)`;
      ctx.fill();
      for (let i = 0; i < NUM_VERTS; i++) {
        const curr = verts[i];
        const next = verts[(i + 1) % NUM_VERTS];
        const rgb = getColor(colorT + (i / NUM_VERTS) * 1.5);
        drawSteppedLine(curr.x, curr.y, next.x, next.y, rgb);
      }
      for (let i = 0; i < NUM_VERTS; i++) {
        const v = verts[i];
        const rgb = getColor(colorT + (i / NUM_VERTS) * 1.5);
        const tipRgb = [Math.min(255, rgb[0] + 80), Math.min(255, rgb[1] + 80), Math.min(255, rgb[2] + 80)];
        ctx.fillStyle = `rgb(${tipRgb[0]}, ${tipRgb[1]}, ${tipRgb[2]})`;
        ctx.fillRect(v.x - GRID / 2, v.y - GRID / 2, GRID, GRID);
      }
      drawFace(blobCX, blobCY, smoothVol, now);
    },
  };
};
