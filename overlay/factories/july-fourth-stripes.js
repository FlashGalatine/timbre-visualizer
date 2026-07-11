/* ── july-fourth-stripes (waving 13-stripe flag with star field + occasional bursts) ──
   Background: 13 horizontal red/white stripes whose right edges undulate with
   bass-driven sin amplitude, like a flag in wind. Top-left has a blue canton
   with 50 pixel stars that twinkle on treble. Strong beats puff a small
   red/white/blue particle burst from a random screen location. */
VIZ_FACTORIES['july-fourth-stripes'] = function () {
  const FLAG_RED   = [201, 36, 50];
  const FLAG_WHITE = [248, 248, 250];
  const FLAG_BLUE  = [22, 56, 130];
  const STAR_COLOR = [255, 250, 220];
  const BURST_COLORS = [FLAG_RED, FLAG_WHITE, FLAG_BLUE];
  const STRIPE_COUNT = 13;
  const STAR_ROWS = 5;
  const STAR_COLS = 10;
  const MAX_BURST_PARTS = 240;
  let stars = [];
  let bursts = [];
  let smoothBass = 0, smoothMid = 0, smoothTreble = 0;
  let bassEMA = 0;
  let lastBurst = 0;
  function bandAverage(lo, hi) {
    if (!frequencies || frequencies.length === 0) return 0;
    const a = Math.floor(lo * frequencies.length);
    const b = Math.min(frequencies.length, Math.floor(hi * frequencies.length));
    let s = 0;
    for (let i = a; i < b; i++) s += frequencies[i];
    const n = Math.max(1, b - a);
    return (s / (n * 255)) * cfgGain;
  }
  function seedStars() {
    let seed = 51876;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    stars = [];
    for (let r = 0; r < STAR_ROWS; r++) {
      for (let c = 0; c < STAR_COLS; c++) {
        // 50 stars in 5+4 alternating pattern (the real flag)
        if (r % 2 === 1 && c >= 9) continue;
        const offset = (r % 2) * 0.5;
        stars.push({
          gx: c + offset,
          gy: r,
          phase: rand() * Math.PI * 2,
          speed: 0.8 + rand() * 1.4,
        });
      }
    }
  }
  function spawnBurst(now) {
    const cx = W * (0.15 + Math.random() * 0.7);
    const cy = H * (0.20 + Math.random() * 0.6);
    const count = Math.round(28 + Math.random() * 20);
    const baseSpeed = (70 + Math.random() * 30) * SCALE;
    const palette = [BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)]];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.15;
      const sp = baseSpeed * (0.6 + Math.random() * 0.8);
      bursts.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.7 + Math.random() * 0.5,
        age: 0,
        color: palette[0],
      });
      if (bursts.length > MAX_BURST_PARTS) bursts.shift();
    }
    lastBurst = now;
  }
  function drawPixelStar(cx, cy) {
    const s = Math.max(1, Math.round(SCALE));
    ctx.fillRect(Math.round(cx - s / 2), Math.round(cy - s / 2), s, s);
    ctx.fillRect(Math.round(cx - s * 1.5), Math.round(cy - s / 2), s, s);
    ctx.fillRect(Math.round(cx + s / 2), Math.round(cy - s / 2), s, s);
    ctx.fillRect(Math.round(cx - s / 2), Math.round(cy - s * 1.5), s, s);
    ctx.fillRect(Math.round(cx - s / 2), Math.round(cy + s / 2), s, s);
  }
  return {
    start() {
      seedStars();
      bursts = [];
      bassEMA = 0;
      lastBurst = 0;
    },
    onResize() { seedStars(); },
    draw(now, dt) {
      const sceneAlpha = cfgEffectBgOpacity;
      if (sceneAlpha > 0.05) {
        ctx.fillStyle = `rgba(20, 22, 36, ${sceneAlpha})`;
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
      // Stripes
      const stripeH = H / STRIPE_COUNT;
      const ampKnob = perViz['july-fourth-stripes'].stripeAmplitude / 100;
      const ampPx = (4 + smoothBass * 22) * SCALE * (0.5 + ampKnob * 1.5);
      const wavePhase = now / 800;
      const sliceW = Math.max(1, Math.round(2 * SCALE));
      for (let i = 0; i < STRIPE_COUNT; i++) {
        const isRed = (i % 2 === 0);
        const c = isRed ? FLAG_RED : FLAG_WHITE;
        ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${0.95 * sceneAlpha + (1 - sceneAlpha) * 0.85})`;
        const stripeY = i * stripeH;
        // Sample displaced edge along x → fill column-by-column
        for (let x = 0; x < W; x += sliceW) {
          const t = x / W;
          const disp = Math.sin(t * 4 + wavePhase + i * 0.3) * ampPx * t
                     + Math.sin(t * 9 - wavePhase * 1.4 + i * 0.6) * ampPx * 0.35 * t;
          ctx.fillRect(Math.round(x), Math.round(stripeY + disp), sliceW + 1, Math.ceil(stripeH) + 1);
        }
      }
      // Canton (blue field) — top-left, 7 stripes tall, 0.4 W wide
      const cantonW = W * 0.40;
      const cantonH = stripeH * 7;
      ctx.fillStyle = `rgba(${FLAG_BLUE[0]}, ${FLAG_BLUE[1]}, ${FLAG_BLUE[2]}, ${0.95 * sceneAlpha + (1 - sceneAlpha) * 0.85})`;
      // Canton rides the same wave but its right edge is what undulates most
      for (let x = 0; x < cantonW; x += sliceW) {
        const t = x / W;
        const disp = Math.sin(t * 4 + wavePhase) * ampPx * t * 0.6;
        ctx.fillRect(Math.round(x), Math.round(disp), sliceW + 1, Math.ceil(cantonH) + 1);
      }
      // Stars on the canton — rows of pixel stars
      const starTwinkleKnob = perViz['july-fourth-stripes'].starTwinkle / 100;
      const starSpacingX = cantonW / (STAR_COLS + 1);
      const starSpacingY = cantonH / (STAR_ROWS + 1);
      for (const st of stars) {
        const tw = 0.55 + 0.45 * Math.sin(now * 0.001 * st.speed + st.phase);
        const bri = (0.65 + tw * 0.35) * (0.6 + smoothTreble * 0.7) * (0.5 + starTwinkleKnob * 1.0);
        const cx = (st.gx + 1) * starSpacingX;
        const cy = (st.gy + 1) * starSpacingY;
        // Account for canton wave displacement at this column
        const t = cx / W;
        const disp = Math.sin(t * 4 + wavePhase) * ampPx * t * 0.6;
        ctx.fillStyle = `rgba(${STAR_COLOR[0]}, ${STAR_COLOR[1]}, ${STAR_COLOR[2]}, ${Math.min(1, bri)})`;
        drawPixelStar(cx, cy + disp);
      }
      // Bursts on strong beats
      const burstKnob = perViz['july-fourth-stripes'].burstChance / 100;
      const strongBeat = micActive && bass > bassEMA * 1.55 + 0.15 && now - lastBurst > 350;
      if (strongBeat && Math.random() < burstKnob * 0.7) spawnBurst(now);
      if (!micActive && cfgIdleAnim && now - lastBurst > 4500) spawnBurst(now);
      // Update + draw bursts
      const stillBursts = [];
      for (const p of bursts) {
        p.age += dt;
        if (p.age >= p.life) continue;
        p.vy += 60 * SCALE * dt;
        p.vx *= Math.pow(0.97, dt * 60);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const fade = Math.pow(1 - p.age / p.life, 1.2);
        const sz = Math.max(1, Math.round((1.6 - p.age / p.life * 0.6) * SCALE));
        ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${fade})`;
        ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
        if (p.color === FLAG_BLUE && Math.random() < 0.4) {
          ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.7})`;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(SCALE)), Math.max(1, Math.round(SCALE)));
        }
        stillBursts.push(p);
      }
      bursts = stillBursts;
    },
  };
};
