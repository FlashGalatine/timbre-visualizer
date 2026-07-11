/* ── halloween-jack (audio-mouthing jack-o-lantern with bats + spider drops) ──
   The pumpkin face is the centerpiece: triangle eyes glow with candle-flicker,
   the carved mouth opens with smoothed waveform RMS so it actually "mouths" the
   audio. Bass beats spawn flapping bats that streak across; long quiet stretches
   release a spider on a thread from the top. Local Halloween palette — ignores
   the global PALETTE/hue. */
VIZ_FACTORIES['halloween-jack'] = function () {
  const ORANGE      = [255, 130, 30];
  const ORANGE_DARK = [200, 92, 20];
  const ORANGE_BRT  = [255, 175, 80];
  const STEM        = [82, 50, 20];
  const SKY_TOP     = [30, 12, 50];
  const SKY_BOT     = [10, 5, 24];
  const GLOW_HOT    = [255, 230, 130];
  const GLOW_WARM   = [255, 130, 50];
  const BAT_COLOR   = [16, 4, 22];
  const SPIDER      = [12, 6, 18];
  const MAX_BATS = 8;
  let smoothBass = 0, smoothMid = 0, smoothTreble = 0, smoothRMS = 0;
  let bassEMA = 0;
  let bats = [];
  let spider = null;
  let lastSpiderAt = -10000;
  let blinkSeed = Math.random() * 1000;
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
  function spawnBat(now, fromLeft) {
    bats.push({
      x: fromLeft ? -16 * SCALE : W + 16 * SCALE,
      y: H * (0.18 + Math.random() * 0.35),
      vx: (fromLeft ? 1 : -1) * (50 + Math.random() * 60) * SCALE,
      bobPhase: Math.random() * Math.PI * 2,
      flapPhase: Math.random() * Math.PI * 2,
      size: 0.7 + Math.random() * 0.5,
      born: now,
    });
    if (bats.length > MAX_BATS) bats.shift();
  }
  function dropSpider(now) {
    spider = {
      x: W * (0.15 + Math.random() * 0.7),
      y: -8 * SCALE,
      vy: 26 * SCALE,
      phase: 'down',
      life: 0,
      target: H * (0.18 + Math.random() * 0.18),
    };
    lastSpiderAt = now;
  }
  function expressionFromKnob(v) {
    if (v < 25) return 'classic';
    if (v < 50) return 'evil';
    if (v < 75) return 'surprised';
    return 'derpy';
  }
  function drawTriangle(cx, cy, w, h, dir) {
    ctx.beginPath();
    if (dir === 'down') {
      ctx.moveTo(cx - w / 2, cy - h / 2);
      ctx.lineTo(cx + w / 2, cy - h / 2);
      ctx.lineTo(cx, cy + h / 2);
    } else {
      ctx.moveTo(cx, cy - h / 2);
      ctx.lineTo(cx + w / 2, cy + h / 2);
      ctx.lineTo(cx - w / 2, cy + h / 2);
    }
    ctx.closePath();
    ctx.fill();
  }
  function drawEye(cx, cy, w, h, expr, flicker) {
    // Carved hole — dark base
    ctx.fillStyle = `rgb(${SKY_BOT[0]}, ${SKY_BOT[1]}, ${SKY_BOT[2]})`;
    if (expr === 'classic' || expr === 'evil') {
      drawTriangle(cx, cy, w, h, 'down');
    } else if (expr === 'surprised') {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else { // derpy — circle with offset highlight
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Inner glow (warm yellow seeping out)
    const glowR = Math.min(w, h) * 0.55;
    const grad = ctx.createRadialGradient(cx, cy, glowR * 0.15, cx, cy, glowR);
    grad.addColorStop(0,    `rgba(${GLOW_HOT[0]}, ${GLOW_HOT[1]}, ${GLOW_HOT[2]}, ${0.85 * flicker})`);
    grad.addColorStop(0.5,  `rgba(${GLOW_WARM[0]}, ${GLOW_WARM[1]}, ${GLOW_WARM[2]}, ${0.55 * flicker})`);
    grad.addColorStop(1,    `rgba(${GLOW_WARM[0]}, ${GLOW_WARM[1]}, ${GLOW_WARM[2]}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);
  }
  function drawMouth(cx, cy, openHeight, mouthW, flicker) {
    const halfH = Math.max(2 * SCALE, openHeight / 2);
    const halfW = mouthW / 2;
    // Carved mouth band
    ctx.fillStyle = `rgb(${SKY_BOT[0]}, ${SKY_BOT[1]}, ${SKY_BOT[2]})`;
    ctx.beginPath();
    ctx.moveTo(cx - halfW, cy);
    ctx.quadraticCurveTo(cx - halfW * 0.5, cy + halfH * 1.4, cx + halfW, cy);
    ctx.quadraticCurveTo(cx + halfW * 0.5, cy - halfH * 0.6, cx - halfW, cy);
    ctx.closePath();
    ctx.fill();
    // Two upper teeth + two lower teeth (carved-out triangles in pumpkin orange)
    const toothW = mouthW * 0.18;
    const toothH = Math.min(halfH * 1.1, mouthW * 0.18);
    ctx.fillStyle = `rgb(${ORANGE[0]}, ${ORANGE[1]}, ${ORANGE[2]})`;
    drawTriangle(cx - mouthW * 0.22, cy - toothH * 0.2, toothW, toothH * 1.1, 'down');
    drawTriangle(cx + mouthW * 0.22, cy - toothH * 0.2, toothW, toothH * 1.1, 'down');
    drawTriangle(cx, cy + toothH * 0.4, toothW, toothH * 0.95, 'up');
    // Inner mouth glow
    const grad = ctx.createRadialGradient(cx, cy, mouthW * 0.05, cx, cy, mouthW * 0.5);
    grad.addColorStop(0, `rgba(${GLOW_HOT[0]}, ${GLOW_HOT[1]}, ${GLOW_HOT[2]}, ${0.65 * flicker})`);
    grad.addColorStop(1, `rgba(${GLOW_WARM[0]}, ${GLOW_WARM[1]}, ${GLOW_WARM[2]}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - mouthW * 0.5, cy - halfH * 1.5, mouthW, halfH * 3);
  }
  function drawPumpkin(cx, cy, rx, ry, flicker) {
    // Outer glow halo
    const halo = ctx.createRadialGradient(cx, cy, rx * 0.6, cx, cy, rx * 1.5);
    halo.addColorStop(0, `rgba(${GLOW_WARM[0]}, ${GLOW_WARM[1]}, ${GLOW_WARM[2]}, ${0.18 * flicker})`);
    halo.addColorStop(1, `rgba(${GLOW_WARM[0]}, ${GLOW_WARM[1]}, ${GLOW_WARM[2]}, 0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(cx - rx * 1.5, cy - ry * 1.5, rx * 3, ry * 3);
    // Body: a cluster of 5 ellipses for the lobed gourd look
    const lobeOffsets = [
      { dx: -0.65, sx: 0.55, sy: 0.95, dim: 0.85 },
      { dx: -0.32, sx: 0.62, sy: 0.99, dim: 0.92 },
      { dx:  0.00, sx: 0.66, sy: 1.00, dim: 1.00 },
      { dx:  0.32, sx: 0.62, sy: 0.99, dim: 0.92 },
      { dx:  0.65, sx: 0.55, sy: 0.95, dim: 0.85 },
    ];
    for (const lobe of lobeOffsets) {
      const lr = rx * lobe.sx;
      const lh = ry * lobe.sy;
      const lx = cx + lobe.dx * rx * 0.55;
      const tone = ORANGE.map((c, i) => Math.round(c * lobe.dim + ORANGE_DARK[i] * (1 - lobe.dim)));
      ctx.fillStyle = `rgb(${tone[0]}, ${tone[1]}, ${tone[2]})`;
      ctx.beginPath();
      ctx.ellipse(lx, cy, lr, lh, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Highlight on the front lobe
    ctx.fillStyle = `rgba(${ORANGE_BRT[0]}, ${ORANGE_BRT[1]}, ${ORANGE_BRT[2]}, 0.45)`;
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.18, cy - ry * 0.30, rx * 0.18, ry * 0.32, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Stem
    const stemW = rx * 0.18;
    const stemH = ry * 0.30;
    ctx.fillStyle = `rgb(${STEM[0]}, ${STEM[1]}, ${STEM[2]})`;
    ctx.fillRect(Math.round(cx - stemW / 2), Math.round(cy - ry - stemH * 0.85), Math.round(stemW), Math.round(stemH));
    ctx.fillStyle = `rgba(${STEM[0] + 30}, ${STEM[1] + 30}, ${STEM[2] + 25}, 0.7)`;
    ctx.fillRect(Math.round(cx - stemW / 2), Math.round(cy - ry - stemH * 0.85), Math.max(1, Math.round(stemW * 0.3)), Math.round(stemH));
  }
  function drawBat(b, now) {
    const flap = Math.sin(b.flapPhase + (now - b.born) / 80);
    const cx = b.x;
    const cy = b.y + Math.sin(b.bobPhase + (now - b.born) / 220) * 4 * SCALE;
    const s = b.size * SCALE;
    ctx.fillStyle = `rgb(${BAT_COLOR[0]}, ${BAT_COLOR[1]}, ${BAT_COLOR[2]})`;
    // Body
    ctx.beginPath();
    ctx.ellipse(cx, cy, 2.5 * s, 1.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings — open/close based on flap
    const span = 7 * s + flap * 3 * s;
    const wingY = cy - flap * 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx - span * 0.45, wingY - 3 * s, cx - span, cy + 1 * s);
    ctx.quadraticCurveTo(cx - span * 0.55, cy + 0.5 * s, cx - span * 0.3, cy + 2 * s);
    ctx.lineTo(cx, cy + 1 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + span * 0.45, wingY - 3 * s, cx + span, cy + 1 * s);
    ctx.quadraticCurveTo(cx + span * 0.55, cy + 0.5 * s, cx + span * 0.3, cy + 2 * s);
    ctx.lineTo(cx, cy + 1 * s);
    ctx.closePath();
    ctx.fill();
    // Tiny eye dot
    ctx.fillStyle = 'rgba(255, 60, 40, 0.85)';
    const ed = Math.max(1, Math.round(SCALE));
    ctx.fillRect(Math.round(cx - 0.5 * s), Math.round(cy - 0.6 * s), ed, ed);
  }
  function drawSpider(sp, now) {
    if (!sp) return;
    const sx = sp.x;
    const sy = sp.y;
    // Thread
    ctx.strokeStyle = 'rgba(220, 220, 230, 0.45)';
    ctx.lineWidth = Math.max(1, SCALE * 0.5);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    // Body
    const s = SCALE;
    ctx.fillStyle = `rgb(${SPIDER[0]}, ${SPIDER[1]}, ${SPIDER[2]})`;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 3.5 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs (8) — arcs around body, slight wiggle
    ctx.strokeStyle = `rgba(${SPIDER[0]}, ${SPIDER[1]}, ${SPIDER[2]}, 0.95)`;
    ctx.lineWidth = Math.max(1, SCALE * 0.7);
    const legW = Math.sin(now / 180) * 0.5;
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const tier = i % 4;
      const baseAng = side * (0.3 + tier * 0.25);
      const tipX = sx + side * (5 + tier * 1.6) * s;
      const tipY = sy + (tier - 1.5) * 1.7 * s + legW * s;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(baseAng) * 2 * s, sy + Math.sin(baseAng) * 2 * s);
      ctx.quadraticCurveTo(sx + side * 4 * s, sy + (tier - 1.5) * s - 1.5 * s, tipX, tipY);
      ctx.stroke();
    }
    // Tiny eyes
    ctx.fillStyle = 'rgba(255, 60, 40, 0.85)';
    const ed = Math.max(1, Math.round(SCALE));
    ctx.fillRect(Math.round(sx - 1.2 * s), Math.round(sy - 1 * s), ed, ed);
    ctx.fillRect(Math.round(sx + 0.4 * s), Math.round(sy - 1 * s), ed, ed);
  }
  return {
    start() {
      bats = [];
      spider = null;
      bassEMA = 0;
      lastSpiderAt = -10000;
      ctx.clearRect(0, 0, W, H);
    },
    draw(now, dt) {
      const sceneAlpha = cfgEffectBgOpacity;
      // Backdrop — purple Halloween night
      if (sceneAlpha > 0.05) {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, `rgba(${SKY_TOP[0]}, ${SKY_TOP[1]}, ${SKY_TOP[2]}, ${sceneAlpha})`);
        sky.addColorStop(1, `rgba(${SKY_BOT[0]}, ${SKY_BOT[1]}, ${SKY_BOT[2]}, ${sceneAlpha})`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        // A faint moon disc, off-center
        const moonCx = W * 0.78;
        const moonCy = H * 0.22;
        const moonR = Math.min(W, H) * 0.07;
        ctx.fillStyle = `rgba(220, 215, 200, ${sceneAlpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(moonCx, moonCy, moonR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${SKY_BOT[0]}, ${SKY_BOT[1]}, ${SKY_BOT[2]}, ${sceneAlpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(moonCx + moonR * 0.45, moonCy - moonR * 0.15, moonR * 0.85, 0, Math.PI * 2);
        ctx.fill();
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
        rms = 0.18 + 0.12 * Math.abs(Math.sin(t * 0.7));
      } else { bass = 0; mid = 0; treble = 0; rms = 0; }
      smoothBass += (bass - smoothBass) * 0.18;
      smoothMid += (mid - smoothMid) * 0.20;
      smoothTreble += (treble - smoothTreble) * 0.25;
      smoothRMS += (rms - smoothRMS) * 0.30;
      bassEMA = bassEMA * 0.85 + bass * 0.15;
      // Beat detection — trigger bats
      const beat = (bass > bassEMA * 1.45 + 0.10) && bass > 0.18;
      const batCountKnob = perViz['halloween-jack'].batCount / 100;
      if (beat && Math.random() < 0.35 + batCountKnob * 0.55 && bats.length < MAX_BATS) {
        spawnBat(now, Math.random() < 0.5);
      }
      // Spider drop — sparse, knob-controlled
      const spiderKnob = perViz['halloween-jack'].spiderChance / 100;
      if (!spider && now - lastSpiderAt > 6000 && Math.random() < spiderKnob * 0.005) {
        dropSpider(now);
      }
      // Bats
      const stillBats = [];
      for (const b of bats) {
        b.x += b.vx * dt;
        if (b.x < -40 * SCALE || b.x > W + 40 * SCALE) continue;
        drawBat(b, now);
        stillBats.push(b);
      }
      bats = stillBats;
      // Pumpkin
      const CX = W / 2;
      const CY = H * 0.58;
      const baseR = Math.min(W, H) * 0.32;
      const pulse = 1 + smoothBass * 0.06;
      const rx = baseR * pulse;
      const ry = baseR * 0.85 * pulse;
      // Candle flicker — random + sine + audio breath
      const flickerBase = 0.78 + 0.22 * Math.sin(now / 130 + Math.sin(now / 73));
      const flicker = Math.max(0.3, flickerBase + smoothMid * 0.4);
      drawPumpkin(CX, CY, rx, ry, flicker);
      // Face
      const expr = expressionFromKnob(perViz['halloween-jack'].faceExpression);
      const eyeY = CY - ry * 0.20;
      const eyeOff = rx * 0.32;
      const eyeW = rx * 0.32;
      const eyeH = ry * 0.30;
      const blink = ((now + blinkSeed) % 4200) > 4060;
      if (!blink) {
        if (expr === 'evil') {
          // angled eyes
          ctx.save();
          ctx.translate(CX - eyeOff, eyeY);
          ctx.rotate(0.25);
          drawEye(0, 0, eyeW, eyeH, 'classic', flicker);
          ctx.restore();
          ctx.save();
          ctx.translate(CX + eyeOff, eyeY);
          ctx.rotate(-0.25);
          drawEye(0, 0, eyeW, eyeH, 'classic', flicker);
          ctx.restore();
        } else if (expr === 'derpy') {
          drawEye(CX - eyeOff, eyeY, eyeW * 0.95, eyeH * 0.95, 'derpy', flicker);
          drawEye(CX + eyeOff, eyeY - 2 * SCALE, eyeW * 1.1, eyeH * 1.05, 'derpy', flicker);
        } else {
          drawEye(CX - eyeOff, eyeY, eyeW, eyeH, expr, flicker);
          drawEye(CX + eyeOff, eyeY, eyeW, eyeH, expr, flicker);
        }
      } else {
        // Closed-eye slits
        ctx.fillStyle = `rgba(${SKY_BOT[0]}, ${SKY_BOT[1]}, ${SKY_BOT[2]}, 0.95)`;
        ctx.fillRect(CX - eyeOff - eyeW / 2, eyeY - SCALE * 0.5, eyeW, Math.max(1, SCALE));
        ctx.fillRect(CX + eyeOff - eyeW / 2, eyeY - SCALE * 0.5, eyeW, Math.max(1, SCALE));
      }
      // Mouth — opens with smoothed RMS
      const mouthY = CY + ry * 0.30;
      const mouthW = rx * 1.05;
      const openH = Math.max(2 * SCALE, Math.min(ry * 0.45, smoothRMS * ry * 1.6));
      drawMouth(CX, mouthY, openH, mouthW, flicker);
      // Spider
      if (spider) {
        if (spider.phase === 'down') {
          spider.y += spider.vy * dt;
          if (spider.y >= spider.target) { spider.phase = 'dangle'; spider.life = 0; }
        } else if (spider.phase === 'dangle') {
          spider.life += dt;
          spider.y = spider.target + Math.sin(spider.life * 5) * 1.2 * SCALE;
          if (spider.life > 2.5) spider.phase = 'up';
        } else { // 'up'
          spider.y -= spider.vy * 1.1 * dt;
          if (spider.y < -10 * SCALE) spider = null;
        }
        if (spider) drawSpider(spider, now);
      }
    },
  };
};
