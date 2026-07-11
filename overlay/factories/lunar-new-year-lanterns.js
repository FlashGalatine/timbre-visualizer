/* ── lunar-new-year-lanterns (rising red lanterns + serpentine dragon silhouette) ──
   Lanterns rise from the bottom, swaying gently and pulsing with bass. Behind
   them, a long undulating dragon (a chain of segments following a sin path)
   drifts across screen. Strong beats puff small gold-red firework accents.
   Local crimson/gold palette. */
VIZ_FACTORIES['lunar-new-year-lanterns'] = function () {
  const LANTERN_BODY  = [200, 30, 30];
  const LANTERN_HOT   = [255, 100, 80];
  const LANTERN_DEEP  = [120, 14, 14];
  const TASSEL_GOLD   = [255, 200, 80];
  const DRAGON_BODY   = [220, 50, 60];
  const DRAGON_DARK   = [110, 18, 22];
  const DRAGON_GOLD   = [240, 180, 70];
  const FIREWORK_HOT  = [255, 240, 150];
  const SKY_TOP       = [60, 12, 18];
  const SKY_BOT       = [22, 6, 10];
  const MAX_LANTERNS = 12;
  const MAX_FW = 180;
  const DRAGON_SEGS = 18;
  let lanterns = [];
  let dragon = null;
  let dragonOffset = 0;
  let fireworks = [];
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
  function spawnLantern() {
    lanterns.push({
      x: Math.random() * W,
      y: H + 40 * SCALE,
      vy: -(15 + Math.random() * 12) * SCALE,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.5 + Math.random() * 0.6,
      size: 11 + Math.random() * 6,
      hue: Math.random() < 0.18 ? 'gold' : 'red',
      pulsePhase: Math.random() * Math.PI * 2,
    });
    if (lanterns.length > MAX_LANTERNS) lanterns.shift();
  }
  function spawnFireworks(cx, cy, intensity) {
    const count = Math.round(18 + intensity * 16);
    const baseSpeed = (45 + Math.random() * 25) * SCALE;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.15;
      const sp = baseSpeed * (0.6 + Math.random() * 0.7);
      fireworks.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.7 + Math.random() * 0.4,
        age: 0,
        gold: Math.random() < 0.5,
      });
      if (fireworks.length > MAX_FW) fireworks.shift();
    }
  }
  function drawLantern(l, now) {
    const cx = l.x + Math.sin(l.sway) * 4 * SCALE;
    const cy = l.y;
    const w = l.size * SCALE;
    const h = l.size * 1.15 * SCALE;
    const pulse = 1 + smoothBass * 0.08 + Math.sin(l.pulsePhase + now / 220) * 0.02;
    const body = l.hue === 'gold' ? TASSEL_GOLD : LANTERN_BODY;
    const hot = l.hue === 'gold' ? [255, 245, 200] : LANTERN_HOT;
    const deep = l.hue === 'gold' ? [180, 120, 30] : LANTERN_DEEP;
    // Halo
    const halo = ctx.createRadialGradient(cx, cy, w * 0.4, cx, cy, w * 2.0);
    halo.addColorStop(0, `rgba(${hot[0]}, ${hot[1]}, ${hot[2]}, 0.40)`);
    halo.addColorStop(1, `rgba(${hot[0]}, ${hot[1]}, ${hot[2]}, 0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(cx - w * 2, cy - w * 2, w * 4, w * 4);
    // Top cap
    ctx.fillStyle = `rgb(${TASSEL_GOLD[0]}, ${TASSEL_GOLD[1]}, ${TASSEL_GOLD[2]})`;
    ctx.fillRect(Math.round(cx - w * 0.4), Math.round(cy - h * 0.65 * pulse), Math.round(w * 0.8), Math.max(1, Math.round(h * 0.06)));
    // Body — bulbous oval with vertical ribs
    ctx.fillStyle = `rgb(${body[0]}, ${body[1]}, ${body[2]})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.55 * pulse, h * 0.55 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    // Side shading
    ctx.fillStyle = `rgba(${deep[0]}, ${deep[1]}, ${deep[2]}, 0.55)`;
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.30, cy, w * 0.22 * pulse, h * 0.50 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    // Gold trim top + bottom
    ctx.fillStyle = `rgb(${TASSEL_GOLD[0]}, ${TASSEL_GOLD[1]}, ${TASSEL_GOLD[2]})`;
    ctx.fillRect(Math.round(cx - w * 0.42), Math.round(cy - h * 0.50 * pulse), Math.round(w * 0.84), Math.max(1, Math.round(SCALE)));
    ctx.fillRect(Math.round(cx - w * 0.42), Math.round(cy + h * 0.50 * pulse - SCALE), Math.round(w * 0.84), Math.max(1, Math.round(SCALE)));
    // Inner glow
    ctx.fillStyle = `rgba(${hot[0]}, ${hot[1]}, ${hot[2]}, 0.50)`;
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.08, cy - h * 0.10, w * 0.20 * pulse, h * 0.18 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tassels — three swinging strings
    ctx.strokeStyle = `rgb(${TASSEL_GOLD[0]}, ${TASSEL_GOLD[1]}, ${TASSEL_GOLD[2]})`;
    ctx.lineWidth = Math.max(1, SCALE * 0.7);
    for (let k = -1; k <= 1; k++) {
      const tx = cx + k * w * 0.25;
      const ty = cy + h * 0.55 * pulse;
      const len = h * 0.40 + Math.sin(l.sway + k) * 2 * SCALE;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.sin(l.sway + k * 0.5) * 2 * SCALE, ty + len);
      ctx.stroke();
    }
  }
  function drawDragon(now, opacity) {
    if (!dragon) return;
    const baseY = H * 0.30;
    const ampY = H * 0.10;
    ctx.fillStyle = `rgba(${DRAGON_BODY[0]}, ${DRAGON_BODY[1]}, ${DRAGON_BODY[2]}, ${opacity})`;
    const segLen = (W + 200 * SCALE) / DRAGON_SEGS;
    const points = [];
    for (let i = 0; i < DRAGON_SEGS; i++) {
      const t = (i / DRAGON_SEGS);
      const x = -100 * SCALE + t * (W + 200 * SCALE) + dragonOffset;
      const wrappedX = ((x % (W + 220 * SCALE)) + (W + 220 * SCALE)) % (W + 220 * SCALE) - 110 * SCALE;
      const y = baseY + Math.sin(t * 6 + now / 700) * ampY * (0.6 + smoothBass * 0.7);
      const r = (12 + Math.sin(t * 3) * 4) * SCALE * (i === 0 ? 1.6 : 1);
      points.push({ x: wrappedX, y, r });
    }
    // Body — circles per segment
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      ctx.fillStyle = `rgba(${DRAGON_DARK[0]}, ${DRAGON_DARK[1]}, ${DRAGON_DARK[2]}, ${opacity * 0.85})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${DRAGON_BODY[0]}, ${DRAGON_BODY[1]}, ${DRAGON_BODY[2]}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.78, 0, Math.PI * 2);
      ctx.fill();
      // Spine highlights
      ctx.fillStyle = `rgba(${DRAGON_GOLD[0]}, ${DRAGON_GOLD[1]}, ${DRAGON_GOLD[2]}, ${opacity * 0.7})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y - p.r * 0.45, p.r * 0.20, 0, Math.PI * 2);
      ctx.fill();
    }
    // Head — biggest segment with eye + horn
    const head = points[0];
    ctx.fillStyle = `rgba(${DRAGON_GOLD[0]}, ${DRAGON_GOLD[1]}, ${DRAGON_GOLD[2]}, ${opacity})`;
    ctx.beginPath();
    ctx.arc(head.x - head.r * 0.20, head.y - head.r * 0.20, head.r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${DRAGON_DARK[0]}, ${DRAGON_DARK[1]}, ${DRAGON_DARK[2]}, ${opacity})`;
    ctx.beginPath();
    ctx.arc(head.x - head.r * 0.20, head.y - head.r * 0.20, head.r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // Whiskers
    ctx.strokeStyle = `rgba(${DRAGON_GOLD[0]}, ${DRAGON_GOLD[1]}, ${DRAGON_GOLD[2]}, ${opacity * 0.8})`;
    ctx.lineWidth = Math.max(1, SCALE);
    for (let k = -1; k <= 1; k += 2) {
      ctx.beginPath();
      ctx.moveTo(head.x + head.r * 0.5, head.y + k * head.r * 0.2);
      ctx.quadraticCurveTo(head.x + head.r * 1.6, head.y + k * head.r * 0.5, head.x + head.r * 2.2, head.y + k * head.r * 0.9);
      ctx.stroke();
    }
  }
  return {
    start() {
      lanterns = [];
      fireworks = [];
      dragon = true;
      dragonOffset = 0;
      bassEMA = 0;
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
      bassEMA = bassEMA * 0.85 + bass * 0.15;
      // Dragon — drift right
      const dragonKnob = perViz['lunar-new-year-lanterns'].dragonOpacity / 100;
      dragonOffset += dt * (12 + smoothMid * 30) * SCALE;
      drawDragon(now, sceneAlpha * (0.18 + dragonKnob * 0.55));
      // Lanterns
      const lanternKnob = perViz['lunar-new-year-lanterns'].lanternCount / 100;
      const targetCount = Math.max(2, Math.min(MAX_LANTERNS, Math.round(3 + lanternKnob * 8)));
      while (lanterns.length < targetCount && Math.random() < 0.04) spawnLantern();
      const stillLanterns = [];
      for (const l of lanterns) {
        l.y += l.vy * dt * (0.85 + smoothBass * 0.6);
        l.sway += l.swaySpeed * dt;
        l.pulsePhase += dt * 3;
        if (l.y < -40 * SCALE) continue;
        drawLantern(l, now);
        stillLanterns.push(l);
      }
      lanterns = stillLanterns;
      // Fireworks on strong beats
      const fwKnob = perViz['lunar-new-year-lanterns'].fireworkRate / 100;
      const strongBeat = micActive && bass > bassEMA * 1.5 + 0.15;
      if ((strongBeat || (cfgIdleAnim && !micActive && Math.random() < 0.012)) && Math.random() < fwKnob * 0.5) {
        const cx = W * (0.2 + Math.random() * 0.6);
        const cy = H * (0.18 + Math.random() * 0.30);
        spawnFireworks(cx, cy, smoothBass);
      }
      const stillFw = [];
      for (const p of fireworks) {
        p.age += dt;
        if (p.age >= p.life) continue;
        p.vy += 80 * SCALE * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const fade = Math.pow(1 - p.age / p.life, 1.2);
        const sz = Math.max(1, Math.round(SCALE * 1.4));
        const c = p.gold ? FIREWORK_HOT : LANTERN_HOT;
        ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${fade})`;
        ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
        stillFw.push(p);
      }
      fireworks = stillFw;
    },
  };
};
