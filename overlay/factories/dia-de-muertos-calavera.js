/* ── dia-de-muertos-calavera (decorated sugar-skull face + raining marigold petals) ──
   A central calavera (sugar skull) with floral patterns around the eye sockets
   and on the forehead. Bass pulses the floral patterns; treble flickers candle
   highlights inside the eye sockets. Marigold petals rain down with a small
   fraction landing in soft drifts at the base. Vibrant pink/orange/cyan local
   palette. */
VIZ_FACTORIES['dia-de-muertos-calavera'] = function () {
  const SKULL_BASE   = [248, 240, 230];
  const SKULL_DARK   = [195, 178, 158];
  const SOCKET       = [22, 14, 28];
  const ACCENT_PINK  = [255, 80, 150];
  const ACCENT_ORANGE= [255, 130, 50];
  const ACCENT_CYAN  = [60, 220, 220];
  const ACCENT_PURPLE= [170, 80, 220];
  const ACCENT_GOLD  = [255, 200, 80];
  const FLOWER_COLORS = [ACCENT_PINK, ACCENT_ORANGE, ACCENT_CYAN, ACCENT_PURPLE, ACCENT_GOLD];
  const PETAL_COLORS = [
    [255, 140, 30],
    [255, 175, 50],
    [255, 200, 80],
    [220, 90, 30],
  ];
  const SKY_TOP = [38, 12, 50];
  const SKY_BOT = [12, 6, 22];
  const MAX_PETALS = 90;
  let petals = [];
  let smoothBass = 0, smoothMid = 0, smoothTreble = 0;
  let candlePhaseL = 0, candlePhaseR = Math.PI;
  function bandAverage(lo, hi) {
    if (!frequencies || frequencies.length === 0) return 0;
    const a = Math.floor(lo * frequencies.length);
    const b = Math.min(frequencies.length, Math.floor(hi * frequencies.length));
    let s = 0;
    for (let i = a; i < b; i++) s += frequencies[i];
    const n = Math.max(1, b - a);
    return (s / (n * 255)) * cfgGain;
  }
  function spawnPetal() {
    petals.push({
      x: Math.random() * W,
      y: -6 * SCALE,
      vy: (24 + Math.random() * 36) * SCALE,
      vx: (Math.random() - 0.5) * 24 * SCALE,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 1.4,
      size: 2.5 + Math.random() * 2.0,
      color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      sway: Math.random() * Math.PI * 2,
    });
    if (petals.length > MAX_PETALS) petals.shift();
  }
  function drawFlower(cx, cy, r, color, accent, intensity) {
    const petals = 8;
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${intensity})`;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      ctx.beginPath();
      ctx.ellipse(px, py, r * 0.45, r * 0.30, a, 0, Math.PI * 2);
      ctx.fill();
    }
    // Center
    ctx.fillStyle = `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, ${intensity})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 230, ${intensity * 0.7})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawSkull(cx, cy, r, intensity, candleL, candleR) {
    // Halo for atmospheric glow
    const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.6);
    halo.addColorStop(0, `rgba(255, 200, 130, ${0.18 + intensity * 0.20})`);
    halo.addColorStop(1, 'rgba(255, 200, 130, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(cx - r * 1.6, cy - r * 1.6, r * 3.2, r * 3.2);
    // Cranium — wide oval
    ctx.fillStyle = `rgb(${SKULL_BASE[0]}, ${SKULL_BASE[1]}, ${SKULL_BASE[2]})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.10, r * 0.95, r * 1.0, 0, 0, Math.PI * 2);
    ctx.fill();
    // Jaw — slightly narrower below
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy + r * 0.55);
    ctx.quadraticCurveTo(cx, cy + r * 1.20, cx + r * 0.55, cy + r * 0.55);
    ctx.quadraticCurveTo(cx + r * 0.40, cy + r * 0.40, cx, cy + r * 0.50);
    ctx.quadraticCurveTo(cx - r * 0.40, cy + r * 0.40, cx - r * 0.55, cy + r * 0.55);
    ctx.closePath();
    ctx.fill();
    // Eye sockets — large dark ovals
    const eyeOff = r * 0.42;
    const eyeY = cy - r * 0.10;
    const eyeR = r * 0.30;
    ctx.fillStyle = `rgb(${SOCKET[0]}, ${SOCKET[1]}, ${SOCKET[2]})`;
    ctx.beginPath();
    ctx.ellipse(cx - eyeOff, eyeY, eyeR, eyeR * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + eyeOff, eyeY, eyeR, eyeR * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    // Candle flicker inside sockets — radial warm glow
    const candleGradL = ctx.createRadialGradient(cx - eyeOff, eyeY, 0, cx - eyeOff, eyeY, eyeR);
    candleGradL.addColorStop(0, `rgba(255, 230, 130, ${candleL * 0.85})`);
    candleGradL.addColorStop(1, 'rgba(255, 130, 50, 0)');
    ctx.fillStyle = candleGradL;
    ctx.beginPath();
    ctx.ellipse(cx - eyeOff, eyeY, eyeR * 0.95, eyeR * 1.0, 0, 0, Math.PI * 2);
    ctx.fill();
    const candleGradR = ctx.createRadialGradient(cx + eyeOff, eyeY, 0, cx + eyeOff, eyeY, eyeR);
    candleGradR.addColorStop(0, `rgba(255, 230, 130, ${candleR * 0.85})`);
    candleGradR.addColorStop(1, 'rgba(255, 130, 50, 0)');
    ctx.fillStyle = candleGradR;
    ctx.beginPath();
    ctx.ellipse(cx + eyeOff, eyeY, eyeR * 0.95, eyeR * 1.0, 0, 0, Math.PI * 2);
    ctx.fill();
    // Nose — heart-shaped triangle
    ctx.fillStyle = `rgb(${SOCKET[0]}, ${SOCKET[1]}, ${SOCKET[2]})`;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.10);
    ctx.lineTo(cx - r * 0.10, cy + r * 0.30);
    ctx.lineTo(cx + r * 0.10, cy + r * 0.30);
    ctx.closePath();
    ctx.fill();
    // Toothy grin
    const teethY = cy + r * 0.55;
    const teethW = r * 0.85;
    ctx.fillStyle = `rgb(${SOCKET[0]}, ${SOCKET[1]}, ${SOCKET[2]})`;
    ctx.fillRect(Math.round(cx - teethW / 2), Math.round(teethY), Math.round(teethW), Math.max(1, Math.round(r * 0.10)));
    ctx.fillStyle = `rgb(${SKULL_BASE[0]}, ${SKULL_BASE[1]}, ${SKULL_BASE[2]})`;
    const toothCount = 6;
    for (let i = 0; i < toothCount; i++) {
      const tx = cx - teethW / 2 + (teethW / toothCount) * (i + 0.5);
      ctx.fillRect(Math.round(tx - r * 0.04), Math.round(teethY - r * 0.02), Math.max(1, Math.round(r * 0.04)), Math.max(1, Math.round(r * 0.10)));
    }
    // Decorative flower patterns above eyes (fade in with intensity)
    drawFlower(cx - eyeOff, eyeY - r * 0.45, r * 0.16 * (0.85 + intensity * 0.30), ACCENT_PINK, ACCENT_GOLD, Math.min(1, 0.65 + intensity * 0.45));
    drawFlower(cx + eyeOff, eyeY - r * 0.45, r * 0.16 * (0.85 + intensity * 0.30), ACCENT_CYAN, ACCENT_GOLD, Math.min(1, 0.65 + intensity * 0.45));
    // Forehead flower — biggest
    drawFlower(cx, cy - r * 0.78, r * 0.18 * (0.85 + intensity * 0.30), ACCENT_PURPLE, ACCENT_PINK, Math.min(1, 0.7 + intensity * 0.35));
    // Cheek dots (3 each side, in line with intensity)
    ctx.fillStyle = `rgba(${ACCENT_ORANGE[0]}, ${ACCENT_ORANGE[1]}, ${ACCENT_ORANGE[2]}, ${0.7 + intensity * 0.3})`;
    for (let k = -1; k <= 1; k += 2) {
      for (let i = 0; i < 3; i++) {
        const cdx = cx + k * (eyeOff + r * 0.15 + i * r * 0.06);
        const cdy = cy + r * 0.22 + i * r * 0.04;
        ctx.beginPath();
        ctx.arc(cdx, cdy, r * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Tracery curls beneath eyes
    ctx.strokeStyle = `rgba(${ACCENT_PURPLE[0]}, ${ACCENT_PURPLE[1]}, ${ACCENT_PURPLE[2]}, ${0.65 + intensity * 0.35})`;
    ctx.lineWidth = Math.max(1, SCALE * 0.7);
    for (let k = -1; k <= 1; k += 2) {
      ctx.beginPath();
      ctx.moveTo(cx + k * (eyeOff - r * 0.15), eyeY + eyeR * 1.15);
      ctx.bezierCurveTo(
        cx + k * (eyeOff - r * 0.05), eyeY + eyeR * 1.40,
        cx + k * (eyeOff + r * 0.20), eyeY + eyeR * 1.10,
        cx + k * (eyeOff + r * 0.32), eyeY + eyeR * 1.55
      );
      ctx.stroke();
    }
    // Subtle skull seam (forehead crack as a light line)
    ctx.strokeStyle = `rgba(${SKULL_DARK[0]}, ${SKULL_DARK[1]}, ${SKULL_DARK[2]}, 0.35)`;
    ctx.lineWidth = Math.max(1, SCALE * 0.5);
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.05, cy - r * 0.95);
    ctx.lineTo(cx + r * 0.02, cy - r * 0.55);
    ctx.stroke();
  }
  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x + Math.sin(p.sway) * 1, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.95)`;
    const w = p.size * SCALE;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 1.2, w * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${Math.max(0, p.color[0] - 60)}, ${Math.max(0, p.color[1] - 50)}, ${Math.max(0, p.color[2] - 30)}, 0.8)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.55, w * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return {
    start() {
      petals = [];
      candlePhaseL = 0;
      candlePhaseR = Math.PI;
    },
    draw(now, dt) {
      const sceneAlpha = cfgEffectBgOpacity;
      if (sceneAlpha > 0.05) {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, `rgba(${SKY_TOP[0]}, ${SKY_TOP[1]}, ${SKY_TOP[2]}, ${sceneAlpha})`);
        sky.addColorStop(1, `rgba(${SKY_BOT[0]}, ${SKY_BOT[1]}, ${SKY_BOT[2]}, ${sceneAlpha})`);
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
      smoothBass += (bass - smoothBass) * 0.18;
      smoothMid += (mid - smoothMid) * 0.20;
      smoothTreble += (treble - smoothTreble) * 0.25;
      // Spawn petals
      const petalKnob = perViz['dia-de-muertos-calavera'].petalDensity / 100;
      const spawnP = (0.12 + smoothMid * 0.35 + smoothBass * 0.15) * (0.4 + petalKnob * 1.6);
      if (Math.random() < spawnP) spawnPetal();
      // Petals (drawn behind skull)
      const stillPetals = [];
      for (const p of petals) {
        p.y += p.vy * dt * (0.85 + smoothBass * 0.45);
        p.x += p.vx * dt + Math.sin(p.sway) * 0.4;
        p.sway += dt * 1.3;
        p.rot += p.rotSpeed * dt;
        if (p.y > H + 16 * SCALE) continue;
        drawPetal(p);
        stillPetals.push(p);
      }
      petals = stillPetals;
      // Candle flicker — random + sine + treble
      const flickerKnob = perViz['dia-de-muertos-calavera'].candleFlicker / 100;
      candlePhaseL += dt * (4 + smoothTreble * 8);
      candlePhaseR += dt * (4 + smoothTreble * 8);
      const baseFlicker = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(candlePhaseL + Math.sin(candlePhaseL * 1.7)));
      const baseFlickerR = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(candlePhaseR + Math.sin(candlePhaseR * 1.7)));
      const candleL = baseFlicker * (0.5 + flickerKnob * 1.0) * (0.6 + smoothMid * 0.6);
      const candleR = baseFlickerR * (0.5 + flickerKnob * 1.0) * (0.6 + smoothMid * 0.6);
      // Pattern intensity → bass-driven
      const patternKnob = perViz['dia-de-muertos-calavera'].patternIntensity / 100;
      const intensity = smoothBass * (0.4 + patternKnob * 1.6);
      // Skull
      const cx = W / 2;
      const cy = H * 0.50;
      const r = Math.min(W, H) * 0.32;
      drawSkull(cx, cy, r, Math.min(1, intensity), Math.min(1, candleL), Math.min(1, candleR));
    },
  };
};
