/* ── valentines-hearts (drifting heart particles + audio-pulsed center heart) ──
   Hearts bubble up from the bottom with gentle horizontal sway. A larger
   "love-letter" heart in the center scales with smoothed RMS. Strong bass
   beats can streak a gold cupid arrow diagonally across the frame. Treble
   sparkles light heart edges. Local rose/red palette. */
VIZ_FACTORIES['valentines-hearts'] = function () {
  const HEART_PINK   = [255, 130, 175];
  const HEART_DEEP   = [220, 50, 80];
  const HEART_ROSE   = [245, 100, 145];
  const HEART_LIGHT  = [255, 200, 220];
  const ARROW_GOLD   = [255, 215, 100];
  const ARROW_SHAFT  = [196, 130, 60];
  const HEART_PALETTE = [HEART_PINK, HEART_DEEP, HEART_ROSE, HEART_LIGHT];
  const MAX_HEARTS = 90;
  let hearts = [];
  let arrow = null;
  let smoothBass = 0, smoothMid = 0, smoothTreble = 0, smoothRMS = 0;
  let bassEMA = 0;
  let lastArrowAt = -10000;
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
  function spawnHeart() {
    hearts.push({
      x: Math.random() * W,
      y: H + 4 * SCALE,
      vy: -(20 + Math.random() * 32) * SCALE,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.6 + Math.random() * 1.2,
      swayAmp: (5 + Math.random() * 8) * SCALE,
      size: 4 + Math.random() * 4,
      color: HEART_PALETTE[Math.floor(Math.random() * HEART_PALETTE.length)],
      sparkle: 0,
      pulsePhase: Math.random() * Math.PI * 2,
    });
    if (hearts.length > MAX_HEARTS) hearts.shift();
  }
  function pathHeart(cx, cy, size) {
    // Two top semicircles + V bottom — closed path
    const r = size;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.30);
    ctx.bezierCurveTo(cx + r * 0.05, cy + r * 0.15,
                      cx + r * 0.95, cy - r * 0.45,
                      cx, cy + r * 1.10);
    ctx.bezierCurveTo(cx - r * 0.95, cy - r * 0.45,
                      cx - r * 0.05, cy + r * 0.15,
                      cx, cy + r * 0.30);
    ctx.closePath();
  }
  function drawHeart(cx, cy, size, color, alpha, sparkle, edgeGlow) {
    pathHeart(cx, cy, size);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    ctx.fill();
    if (edgeGlow > 0.001) {
      ctx.strokeStyle = `rgba(${HEART_LIGHT[0]}, ${HEART_LIGHT[1]}, ${HEART_LIGHT[2]}, ${alpha * edgeGlow})`;
      ctx.lineWidth = Math.max(1, SCALE * 0.6);
      ctx.stroke();
    }
    if (sparkle > 0.05) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, sparkle) * alpha})`;
      const s = Math.max(1, Math.round(SCALE));
      ctx.fillRect(Math.round(cx - size * 0.35), Math.round(cy - size * 0.05), s, s);
    }
    // Small white shine highlight inside
    ctx.fillStyle = `rgba(255, 240, 245, ${0.45 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.35, cy + size * 0.10, size * 0.18, size * 0.12, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawArrow(arr, now) {
    const t = arr.age / arr.life;
    const headX = arr.x0 + (arr.x1 - arr.x0) * t;
    const headY = arr.y0 + (arr.y1 - arr.y0) * t;
    const ang = Math.atan2(arr.y1 - arr.y0, arr.x1 - arr.x0);
    // Trail (last 12% of length, fading)
    const trailLen = Math.hypot(arr.x1 - arr.x0, arr.y1 - arr.y0) * 0.18;
    const tailX = headX - Math.cos(ang) * trailLen;
    const tailY = headY - Math.sin(ang) * trailLen;
    ctx.strokeStyle = `rgba(${ARROW_GOLD[0]}, ${ARROW_GOLD[1]}, ${ARROW_GOLD[2]}, ${0.7 * (1 - t)})`;
    ctx.lineWidth = Math.max(1, SCALE * 1.2);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();
    // Shaft
    const shaftLen = 18 * SCALE;
    const sx = headX - Math.cos(ang) * shaftLen;
    const sy = headY - Math.sin(ang) * shaftLen;
    ctx.strokeStyle = `rgb(${ARROW_SHAFT[0]}, ${ARROW_SHAFT[1]}, ${ARROW_SHAFT[2]})`;
    ctx.lineWidth = Math.max(1, SCALE * 1.3);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(headX, headY);
    ctx.stroke();
    // Arrowhead
    const headSize = 5 * SCALE;
    ctx.fillStyle = `rgb(${ARROW_GOLD[0]}, ${ARROW_GOLD[1]}, ${ARROW_GOLD[2]})`;
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.lineTo(headX - Math.cos(ang - 0.5) * headSize, headY - Math.sin(ang - 0.5) * headSize);
    ctx.lineTo(headX - Math.cos(ang + 0.5) * headSize, headY - Math.sin(ang + 0.5) * headSize);
    ctx.closePath();
    ctx.fill();
    // Fletching
    const flLen = 6 * SCALE;
    const fx = sx;
    const fy = sy;
    ctx.fillStyle = `rgba(${HEART_PINK[0]}, ${HEART_PINK[1]}, ${HEART_PINK[2]}, 0.95)`;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx - Math.cos(ang) * flLen + Math.cos(ang + Math.PI / 2) * flLen * 0.6,
               fy - Math.sin(ang) * flLen + Math.sin(ang + Math.PI / 2) * flLen * 0.6);
    ctx.lineTo(fx - Math.cos(ang) * flLen * 0.6, fy - Math.sin(ang) * flLen * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx - Math.cos(ang) * flLen + Math.cos(ang - Math.PI / 2) * flLen * 0.6,
               fy - Math.sin(ang) * flLen + Math.sin(ang - Math.PI / 2) * flLen * 0.6);
    ctx.lineTo(fx - Math.cos(ang) * flLen * 0.6, fy - Math.sin(ang) * flLen * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  return {
    start() {
      hearts = [];
      arrow = null;
      bassEMA = 0;
      lastArrowAt = -10000;
      ctx.clearRect(0, 0, W, H);
    },
    draw(now, dt) {
      // Light fade so trails of fast-moving hearts don't smear
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
      // Audio
      let bass, mid, treble, rms;
      if (micActive && frequencies) {
        bass = bandAverage(0, 0.18);
        mid = bandAverage(0.18, 0.55);
        treble = bandAverage(0.55, 1.0);
        rms = getRMS();
      } else if (cfgIdleAnim) {
        const t = now / 1100;
        bass = 0.16 + 0.06 * Math.sin(t);
        mid = 0.16 + 0.05 * Math.sin(t * 1.3);
        treble = 0.16 + 0.05 * Math.sin(t * 1.7);
        rms = 0.18 + 0.10 * Math.abs(Math.sin(t * 0.7));
      } else { bass = 0; mid = 0; treble = 0; rms = 0; }
      smoothBass += (bass - smoothBass) * 0.18;
      smoothMid += (mid - smoothMid) * 0.18;
      smoothTreble += (treble - smoothTreble) * 0.25;
      smoothRMS += (rms - smoothRMS) * 0.30;
      bassEMA = bassEMA * 0.85 + bass * 0.15;
      // Spawn hearts
      const densityKnob = perViz['valentines-hearts'].heartDensity / 100;
      const spawnP = (0.06 + smoothMid * 0.4 + smoothBass * 0.2) * (0.4 + densityKnob * 1.6);
      if (Math.random() < spawnP) spawnHeart();
      // Center "love letter" heart pulses with RMS
      const pulseKnob = perViz['valentines-hearts'].pulseStrength / 100;
      const baseSize = Math.min(W, H) * 0.18;
      const pulse = 1 + smoothRMS * (0.3 + pulseKnob * 1.0);
      const beat = (1 + Math.sin(now * 0.006)) * 0.5;
      const centerSize = baseSize * pulse * (0.96 + 0.06 * beat);
      const CX = W / 2;
      const CY = H * 0.50;
      // Glow halo behind center heart
      const glowR = centerSize * 1.7;
      const halo = ctx.createRadialGradient(CX, CY + centerSize * 0.5, centerSize * 0.4, CX, CY + centerSize * 0.5, glowR);
      halo.addColorStop(0, `rgba(${HEART_DEEP[0]}, ${HEART_DEEP[1]}, ${HEART_DEEP[2]}, ${0.18 + smoothRMS * 0.20})`);
      halo.addColorStop(1, `rgba(${HEART_DEEP[0]}, ${HEART_DEEP[1]}, ${HEART_DEEP[2]}, 0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(CX - glowR, CY - glowR, glowR * 2, glowR * 2);
      drawHeart(CX, CY, centerSize, HEART_DEEP, 0.95, smoothTreble * 0.6, 0.6 + smoothRMS * 0.4);
      // Drifting hearts
      const stillHearts = [];
      for (const h of hearts) {
        h.y += h.vy * dt;
        h.sway += h.swaySpeed * dt;
        const drawX = h.x + Math.sin(h.sway) * h.swayAmp;
        h.pulsePhase += dt * 3;
        const sizePulse = h.size * SCALE * (1 + smoothBass * 0.30 + 0.05 * Math.sin(h.pulsePhase));
        if (smoothTreble > 0.45 && Math.random() < smoothTreble * 0.04) {
          h.sparkle = Math.min(1, h.sparkle + 0.5);
        }
        h.sparkle *= 0.92;
        if (h.y < -sizePulse * 1.5) continue;
        const alpha = Math.min(1, (h.y + sizePulse) / (H * 0.4));
        drawHeart(drawX, h.y, sizePulse, h.color, Math.min(1, alpha), h.sparkle, smoothMid * 0.4);
        stillHearts.push(h);
      }
      hearts = stillHearts;
      // Cupid arrow — strong beat triggers
      const arrowKnob = perViz['valentines-hearts'].cupidChance / 100;
      const beatStrong = micActive && bass > bassEMA * 1.55 + 0.18;
      if (!arrow && beatStrong && now - lastArrowAt > 4000 && Math.random() < arrowKnob * 0.6) {
        const fromLeft = Math.random() < 0.5;
        const x0 = fromLeft ? -40 * SCALE : W + 40 * SCALE;
        const y0 = H * (0.18 + Math.random() * 0.25);
        const x1 = fromLeft ? W + 40 * SCALE : -40 * SCALE;
        const y1 = y0 + (Math.random() - 0.5) * H * 0.30;
        arrow = { x0, y0, x1, y1, age: 0, life: 0.8 + Math.random() * 0.3 };
        lastArrowAt = now;
      }
      if (arrow) {
        arrow.age += dt;
        if (arrow.age >= arrow.life) {
          arrow = null;
        } else {
          drawArrow(arrow, now);
        }
      }
    },
  };
};
