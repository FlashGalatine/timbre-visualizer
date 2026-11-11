/* ── easter-eggs (patterned eggs bouncing on an unseen ground line) ──
   Eggs spawn just below the canvas, get tossed up by bass beats with a
   knob-controlled bounce height, settle back, and roll. A small pixel bunny
   in the lower-left hops on strong beats. patternStyle knob steps through
   stripes / dots / zigzag / mixed (0/25/50/75). Pastel local palette. */
VIZ_FACTORIES['easter-eggs'] = function () {
  const EGG_COLORS = [
    [255, 184, 200],  // pink
    [180, 220, 245],  // baby blue
    [196, 240, 196],  // mint
    [250, 230, 158],  // butter yellow
    [220, 188, 240],  // lavender
    [255, 210, 180],  // peach
  ];
  const PATTERN_COLORS = [
    [255, 100, 130],  // hot pink
    [80, 160, 220],   // sky blue
    [120, 200, 120],  // grass
    [240, 180, 60],   // gold
    [180, 110, 220],  // purple
  ];
  const BUNNY = [248, 240, 235];
  const BUNNY_DARK = [160, 130, 120];
  const MAX_EGGS = 14;
  let eggs = [];
  let bunnyHopY = 0, bunnyHopVel = 0;
  let bunnyEarPhase = 0;
  let smoothBass = 0, smoothMid = 0, smoothTreble = 0;
  let bassEMA = 0;
  let lastFrame = performance.now();
  function bandAverage(lo, hi) {
    if (!frequencies || frequencies.length === 0) return 0;
    const a = Math.floor(lo * frequencies.length);
    const b = Math.min(frequencies.length, Math.floor(hi * frequencies.length));
    let s = 0;
    for (let i = a; i < b; i++) s += frequencies[i];
    const n = Math.max(1, b - a);
    return (s / (n * 255)) * cfgGain;
  }
  function patternKindFromKnob(v) {
    if (v < 25) return 'stripes';
    if (v < 50) return 'dots';
    if (v < 75) return 'zigzag';
    return 'mixed';
  }
  function makeEgg(idx, count, knobKind) {
    const xSlot = (idx + 0.5) / count;
    const local = patternKindFromKnob(knobKind);
    return {
      slotX: xSlot,
      x: 0, y: 0,
      vy: 0, vx: 0,
      rot: (Math.random() - 0.5) * 0.4,
      rotSpeed: (Math.random() - 0.5) * 0.05,
      restY: 0,
      bounceTimer: Math.random() * 1.5,
      size: 16 + Math.random() * 6,
      color: EGG_COLORS[Math.floor(Math.random() * EGG_COLORS.length)],
      patternColor: PATTERN_COLORS[Math.floor(Math.random() * PATTERN_COLORS.length)],
      pattern: local === 'mixed' ? ['stripes', 'dots', 'zigzag'][idx % 3] : local,
      sparkle: 0,
    };
  }
  let builtKind = null; // pattern kind the current egg row was built for
  function rebuildEggs(count, knobKind) {
    builtKind = patternKindFromKnob(knobKind);
    eggs = [];
    for (let i = 0; i < count; i++) eggs.push(makeEgg(i, count, knobKind));
  }
  function drawEgg(eg, groundY) {
    const w = eg.size * SCALE;
    const h = eg.size * 1.32 * SCALE;
    const cx = eg.x;
    const cy = eg.y;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(eg.rot);
    // Shadow on ground (only when settled)
    if (cy > groundY - h * 0.6) {
      ctx.save();
      ctx.translate(0, h * 0.55);
      ctx.scale(1, 0.25);
      ctx.fillStyle = 'rgba(40, 30, 50, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Body — pointed-top oval
    ctx.fillStyle = `rgb(${eg.color[0]}, ${eg.color[1]}, ${eg.color[2]})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.62, h * 0.50, 0, 0, Math.PI * 2);
    ctx.fill();
    // Top taper — slightly narrower upper half
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.10, w * 0.50, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pattern overlay
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.62, h * 0.50, 0, 0, Math.PI * 2);
    ctx.clip();
    const pc = eg.patternColor;
    ctx.fillStyle = `rgba(${pc[0]}, ${pc[1]}, ${pc[2]}, 0.85)`;
    if (eg.pattern === 'stripes') {
      const bandH = h * 0.10;
      for (let y = -h * 0.5; y < h * 0.5; y += bandH * 2) {
        ctx.fillRect(-w, y, w * 2, bandH);
      }
    } else if (eg.pattern === 'dots') {
      for (let row = -2; row <= 2; row++) {
        for (let col = -2; col <= 2; col++) {
          if ((row + col) % 2) continue;
          ctx.beginPath();
          ctx.arc(col * w * 0.30, row * h * 0.18, w * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else { // zigzag
      ctx.lineWidth = Math.max(1, SCALE);
      ctx.strokeStyle = `rgba(${pc[0]}, ${pc[1]}, ${pc[2]}, 0.95)`;
      for (let y = -h * 0.45; y < h * 0.45; y += h * 0.18) {
        ctx.beginPath();
        for (let x = -w; x <= w; x += w * 0.20) {
          const yy = y + ((Math.round((x + w) / (w * 0.20))) % 2 === 0 ? 0 : h * 0.05);
          if (x === -w) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.18, -h * 0.20, w * 0.12, h * 0.10, -0.4, 0, Math.PI * 2);
    ctx.fill();
    if (eg.sparkle > 0.05) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, eg.sparkle)})`;
      const s = Math.max(1, Math.round(SCALE));
      ctx.fillRect(Math.round(w * 0.12), Math.round(-h * 0.25), s, s);
    }
    ctx.restore();
  }
  function drawBunny(cx, cy, hopY, earPhase) {
    const P = Math.max(2, Math.round(2 * SCALE));
    function px(x, y, w, h) { ctx.fillRect(Math.round(cx + x * P), Math.round(cy + y * P - hopY), (w || 1) * P, (h || 1) * P); }
    // Body
    ctx.fillStyle = `rgb(${BUNNY[0]}, ${BUNNY[1]}, ${BUNNY[2]})`;
    px(-3, -1, 6, 4);
    px(-2, -3, 4, 2);
    // Ears (animated tilt with earPhase)
    const earTilt = Math.round(Math.sin(earPhase) * 1);
    px(-3 + earTilt, -7, 1, 4);
    px(2 - earTilt, -7, 1, 4);
    // Inner ear pink
    ctx.fillStyle = 'rgba(255, 170, 200, 0.9)';
    px(-3 + earTilt, -6, 1, 2);
    px(2 - earTilt, -6, 1, 2);
    // Eyes + nose
    ctx.fillStyle = `rgb(${BUNNY_DARK[0]}, ${BUNNY_DARK[1]}, ${BUNNY_DARK[2]})`;
    px(-1, -2, 1, 1);
    px(1, -2, 1, 1);
    ctx.fillStyle = 'rgba(255, 130, 150, 0.95)';
    px(0, -1, 1, 1);
    // Tail
    ctx.fillStyle = `rgb(${BUNNY[0]}, ${BUNNY[1]}, ${BUNNY[2]})`;
    px(-4, 1, 1, 1);
  }
  return {
    start() {
      lastFrame = performance.now();
      bassEMA = 0;
      bunnyHopY = 0;
      bunnyHopVel = 0;
      eggs = [];
    },
    draw(now, dt) {
      lastFrame = now;
      const sceneAlpha = cfgEffectBgOpacity;
      // Backdrop — pastel sky
      if (sceneAlpha > 0.05) {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, `rgba(190, 230, 245, ${sceneAlpha})`);
        sky.addColorStop(1, `rgba(245, 230, 235, ${sceneAlpha})`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        // Soft grass strip at bottom
        ctx.fillStyle = `rgba(180, 220, 170, ${sceneAlpha * 0.6})`;
        ctx.fillRect(0, H * 0.78, W, H * 0.22);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
      // Audio
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
      const beat = (bass > bassEMA * 1.4 + 0.10) && bass > 0.18;
      // (Re)build egg row when count or pattern knob changes
      const countKnob = perViz['easter-eggs'].eggCount;
      const patternKnob = perViz['easter-eggs'].patternStyle;
      const targetCount = Math.max(3, Math.min(MAX_EGGS, Math.round(4 + (countKnob / 100) * 10)));
      const currentKind = patternKindFromKnob(patternKnob);
      if (eggs.length !== targetCount || builtKind !== currentKind) {
        rebuildEggs(targetCount, patternKnob);
      }
      const groundY = H * 0.84;
      const xPad = W * 0.08;
      // Update + draw eggs
      for (const eg of eggs) {
        eg.x = xPad + eg.slotX * (W - 2 * xPad);
        eg.restY = groundY;
        // On beat, hop up
        if (beat && Math.random() < 0.5) {
          eg.vy = -(120 + smoothBass * 220) * SCALE * (0.6 + Math.random() * 0.6);
          eg.rotSpeed = (Math.random() - 0.5) * 0.18;
        }
        // Idle gentle bob
        eg.bounceTimer += dt * (1.0 + smoothMid * 1.5);
        const idleBob = Math.sin(eg.bounceTimer) * 2 * SCALE * (cfgIdleAnim && !micActive ? 1 : 0.3);
        eg.vy += 580 * SCALE * dt;  // gravity
        eg.y += eg.vy * dt;
        if (eg.y >= eg.restY) {
          eg.y = eg.restY;
          eg.vy *= -0.45;
          if (Math.abs(eg.vy) < 25 * SCALE) eg.vy = 0;
          eg.rotSpeed *= 0.85;
        }
        eg.rot += eg.rotSpeed * dt * 60;
        eg.rotSpeed *= Math.pow(0.92, dt * 60);
        if (smoothTreble > 0.4 && Math.random() < smoothTreble * 0.04) {
          eg.sparkle = Math.min(1, eg.sparkle + 0.6);
        }
        eg.sparkle *= 0.92;
        const drawY = eg.y + idleBob;
        const original = eg.y;
        eg.y = drawY;
        drawEgg(eg, groundY);
        eg.y = original;
      }
      // Bunny in lower-left
      const bunnyKnob = perViz['easter-eggs'].bunnyChance / 100;
      const strongBeat = (bass > bassEMA * 1.7 + 0.15);
      if (strongBeat && bunnyHopY === 0 && Math.random() < bunnyKnob * 0.7) {
        bunnyHopVel = -180 * SCALE;
      }
      bunnyHopVel += 720 * SCALE * dt;
      bunnyHopY += bunnyHopVel * dt;
      if (bunnyHopY > 0) { bunnyHopY = 0; bunnyHopVel = 0; }
      bunnyEarPhase += dt * (3 + smoothBass * 4);
      const bunnyCx = W * 0.10;
      const bunnyCy = groundY + 6 * SCALE;
      drawBunny(bunnyCx, bunnyCy, -bunnyHopY, bunnyEarPhase);
    },
  };
};
