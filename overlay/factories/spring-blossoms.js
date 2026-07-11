/* ── spring-blossoms (cherry-blossom petals drifting on audio-driven wind) ──
   Soft pink/white petals (with the occasional pale-green leaf) spawn off-screen
   right and drift southwest. Bass amplifies the wind multiplier; treble lights
   sparkle highlights on individual petals. Local palette — ignores PALETTE so
   the seasonal mood survives the global hue knobs. */
VIZ_FACTORIES['spring-blossoms'] = function () {
  const MAX_PETALS = 110;
  const BASE_VX = -0.65 * SCALE;
  const BASE_VY = 0.45 * SCALE;
  const PETAL_W = Math.max(3, Math.round(5 * SCALE));
  const PETAL_H = Math.max(2, Math.round(3 * SCALE));
  const PETAL_COLORS = [
    [255, 196, 215],
    [255, 220, 230],
    [255, 240, 245],
    [252, 178, 198],
    [240, 218, 222],
  ];
  const LEAF_COLOR = [188, 220, 175];
  let petals = [];
  let smoothBass = 0, smoothMid = 0, smoothTreble = 0;
  function bandAverage(lo, hi) {
    if (!frequencies || frequencies.length === 0) return 0;
    const a = Math.floor(lo * frequencies.length);
    const b = Math.min(frequencies.length, Math.floor(hi * frequencies.length));
    let sum = 0;
    for (let i = a; i < b; i++) sum += frequencies[i];
    const n = Math.max(1, b - a);
    return (sum / (n * 255)) * cfgGain;
  }
  function makePetal(spawnEdge) {
    const isLeaf = Math.random() < 0.07;
    return {
      x: spawnEdge ? W + Math.random() * W * 0.25 : Math.random() * W,
      y: spawnEdge ? -PETAL_H * 4 + Math.random() * (H * 0.55) : Math.random() * H,
      vx: BASE_VX * (0.7 + Math.random() * 0.7),
      vy: BASE_VY * (0.55 + Math.random() * 0.9),
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.06,
      size: 0.7 + Math.random() * 0.7,
      color: isLeaf ? LEAF_COLOR : PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      sparkle: 0,
      isLeaf,
    };
  }
  function drawPetal(p) {
    const cx = Math.round(p.x), cy = Math.round(p.y);
    const w = PETAL_W * p.size;
    const h = PETAL_H * p.size;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.rot);
    if (p.isLeaf) {
      // Pointed-oval leaf
      ctx.fillStyle = `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 1.1, h * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      // Vein
      ctx.strokeStyle = `rgba(${p.color[0] - 40}, ${p.color[1] - 30}, ${p.color[2] - 40}, 0.6)`;
      ctx.lineWidth = Math.max(1, SCALE * 0.6);
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.lineTo(w, 0);
      ctx.stroke();
    } else {
      // 5-lobed sakura petal: render as a rounded teardrop ellipse with notch
      ctx.fillStyle = `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      // Darker pip near base for depth
      const dr = Math.max(0, p.color[0] - 50);
      const dg = Math.max(0, p.color[1] - 70);
      const db = Math.max(0, p.color[2] - 60);
      ctx.fillStyle = `rgba(${dr}, ${dg}, ${db}, 0.55)`;
      ctx.fillRect(-Math.max(1, SCALE * 0.5), -Math.max(1, SCALE * 0.5), Math.max(1, SCALE), Math.max(1, SCALE));
    }
    if (p.sparkle > 0.05) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, p.sparkle)})`;
      const s = Math.max(1, Math.round(SCALE));
      ctx.fillRect(-s / 2 - w * 0.2, -s / 2 - h * 0.2, s, s);
    }
    ctx.restore();
  }
  return {
    start() {
      petals = [];
      // Pre-fill so the screen isn't empty on activation
      const seed = 28;
      for (let i = 0; i < seed; i++) petals.push(makePetal(false));
      ctx.clearRect(0, 0, W, H);
    },
    draw(now, dt) {
      // Clean clear — petals are crisp objects, no trail veil.
      ctx.clearRect(0, 0, W, H);
      let bass, mid, treble;
      if (micActive && frequencies) {
        bass = bandAverage(0, 0.18);
        mid = bandAverage(0.18, 0.55);
        treble = bandAverage(0.55, 1.0);
      } else if (cfgIdleAnim) {
        const t = now / 900;
        bass = 0.16 + 0.05 * Math.sin(t);
        mid = 0.16 + 0.05 * Math.sin(t * 1.3);
        treble = 0.16 + 0.05 * Math.sin(t * 1.7);
      } else { bass = 0; mid = 0; treble = 0; }
      smoothBass += (bass - smoothBass) * 0.14;
      smoothMid += (mid - smoothMid) * 0.18;
      smoothTreble += (treble - smoothTreble) * 0.25;
      const densityFactor = 0.3 + (perViz['spring-blossoms'].petalDensity / 100) * 1.7;
      const windFactor = 0.5 + (perViz['spring-blossoms'].windStrength / 100) * 2.0;
      // Spawn — driven by mid + bass with density knob
      const spawnP = micActive
        ? Math.min(0.95, (0.06 + smoothMid * 0.4 + smoothBass * 0.25)) * densityFactor
        : (cfgIdleAnim ? 0.07 * densityFactor : 0);
      if (Math.random() < spawnP) {
        petals.push(makePetal(true));
        if (petals.length > MAX_PETALS) petals.shift();
      }
      // Bass beat → small gust burst
      if (micActive && smoothBass > 0.55 && Math.random() < smoothBass * 0.35) {
        for (let k = 0; k < 3; k++) {
          if (petals.length >= MAX_PETALS) break;
          petals.push(makePetal(true));
        }
      }
      const wind = (1 + smoothBass * 1.6) * windFactor;
      const stillAlive = [];
      for (const p of petals) {
        p.x += p.vx * wind;
        p.y += p.vy * wind * 0.65;
        p.rot += p.rotSpeed * (1 + smoothBass * 2.2);
        if (smoothTreble > 0.4 && Math.random() < smoothTreble * 0.05) {
          p.sparkle = Math.min(1, p.sparkle + 0.6);
        }
        p.sparkle *= 0.92;
        if (p.x < -PETAL_W * 5 || p.y > H + PETAL_H * 5) continue;
        stillAlive.push(p);
        drawPetal(p);
      }
      petals = stillAlive;
    },
  };
};
