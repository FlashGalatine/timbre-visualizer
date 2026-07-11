/* ── summer-tide (warm-palette ocean horizon with pulsing sun + audio-driven waves) ──
   Five layered wave bands fan from horizon to foreground; bass drives crest height,
   treble spawns specular sparkles on the water. The sun is a soft radial glow with
   a bright core that breathes with overall energy. Falls back to translucent waves
   only when effectBgOpacity is near zero, so the box can still overlay an OBS scene. */
VIZ_FACTORIES['summer-tide'] = function () {
  const SPARKLE_MAX = 60;
  const WAVE_LAYERS = 5;
  let sparkles = [];
  let smoothBass = 0, smoothMid = 0, smoothTreble = 0;
  let lastFrame = performance.now();
  function bandAverage(lo, hi) {
    if (!frequencies || frequencies.length === 0) return 0;
    const a = Math.floor(lo * frequencies.length);
    const b = Math.min(frequencies.length, Math.floor(hi * frequencies.length));
    let sum = 0;
    for (let i = a; i < b; i++) sum += frequencies[i];
    const n = Math.max(1, b - a);
    return (sum / (n * 255)) * cfgGain;
  }
  function spawnSparkle(yMin, yMax) {
    sparkles.push({
      x: Math.random() * W,
      y: yMin + Math.random() * (yMax - yMin),
      life: 1,
      size: Math.max(1, Math.round(SCALE * (0.5 + Math.random() * 0.7))),
    });
    if (sparkles.length > SPARKLE_MAX) sparkles.shift();
  }
  return {
    start() {
      sparkles = [];
      lastFrame = performance.now();
      ctx.clearRect(0, 0, W, H);
    },
    draw(now, dt) {
      const sceneAlpha = cfgEffectBgOpacity;
      const horizonY = Math.round(H * 0.42);
      // Backdrop
      if (sceneAlpha > 0.05) {
        ctx.clearRect(0, 0, W, H);
        const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
        sky.addColorStop(0,    `rgba(255, 158, 110, ${sceneAlpha})`);
        sky.addColorStop(0.55, `rgba(255, 196, 130, ${sceneAlpha})`);
        sky.addColorStop(1,    `rgba(255, 230, 168, ${sceneAlpha})`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, horizonY);
        const water = ctx.createLinearGradient(0, horizonY, 0, H);
        water.addColorStop(0,   `rgba(82, 178, 198, ${sceneAlpha})`);
        water.addColorStop(0.6, `rgba(36, 110, 145, ${sceneAlpha})`);
        water.addColorStop(1,   `rgba(18, 60, 100, ${sceneAlpha})`);
        ctx.fillStyle = water;
        ctx.fillRect(0, horizonY, W, H - horizonY);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
      // Audio bands
      let bass, mid, treble;
      if (micActive && frequencies) {
        bass = bandAverage(0, 0.18);
        mid = bandAverage(0.18, 0.55);
        treble = bandAverage(0.55, 1.0);
      } else if (cfgIdleAnim) {
        const t = now / 1100;
        bass = 0.16 + 0.05 * Math.sin(t);
        mid = 0.16 + 0.05 * Math.sin(t * 1.3);
        treble = 0.16 + 0.05 * Math.sin(t * 1.7);
      } else { bass = 0; mid = 0; treble = 0; }
      smoothBass += (bass - smoothBass) * 0.18;
      smoothMid += (mid - smoothMid) * 0.20;
      smoothTreble += (treble - smoothTreble) * 0.25;
      // Sun
      const sunSizeKnob = perViz['summer-tide'].sunSize / 100;
      const sunR = Math.min(W, H) * (0.05 + sunSizeKnob * 0.20) * (1 + 0.05 * smoothBass);
      const sunCx = W * 0.5;
      const sunCy = horizonY - sunR * 0.30;
      if (sceneAlpha > 0.05) {
        ctx.save();
        const sunGrad = ctx.createRadialGradient(sunCx, sunCy, sunR * 0.18, sunCx, sunCy, sunR * 1.25);
        sunGrad.addColorStop(0,   `rgba(255, 255, 240, ${sceneAlpha})`);
        sunGrad.addColorStop(0.5, `rgba(255, 220, 130, ${sceneAlpha * 0.95})`);
        sunGrad.addColorStop(1,   `rgba(255, 165, 90, 0)`);
        ctx.fillStyle = sunGrad;
        ctx.fillRect(sunCx - sunR * 1.5, sunCy - sunR * 1.5, sunR * 3, sunR * 3);
        ctx.beginPath();
        ctx.arc(sunCx, sunCy, sunR * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 248, 215, ${sceneAlpha})`;
        ctx.fill();
        // Sun's reflection on water — vertical column thinning toward horizon
        const reflStart = horizonY;
        const reflEnd = H * 0.92;
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          const w = sunR * (0.9 - t * 0.6) * (0.9 + 0.2 * Math.sin(now / 600 + i));
          const y = reflStart + t * (reflEnd - reflStart);
          const a = sceneAlpha * (1 - t) * 0.45;
          ctx.fillStyle = `rgba(255, 235, 170, ${a})`;
          ctx.fillRect(sunCx - w / 2, y, w, Math.max(1, Math.round(SCALE * 1.2)));
        }
        ctx.restore();
      }
      // Wave layers — back to front
      const waveAmpKnob = perViz['summer-tide'].waveAmplitude / 100;
      const ampScale = (8 + waveAmpKnob * 26) * SCALE;
      const step = Math.max(1, Math.round(2 * SCALE));
      const waveT = now / 1000;
      for (let layer = 0; layer < WAVE_LAYERS; layer++) {
        const layerT = layer / (WAVE_LAYERS - 1);
        const baseY = horizonY + (H - horizonY) * (0.04 + layerT * 0.96);
        const amp = ampScale * (0.4 + layerT * 0.95) * (0.55 + smoothBass * 1.5);
        const freq = (0.012 + layerT * 0.020) / SCALE;
        const speed = 0.6 + layerT * 1.2;
        const phase = waveT * speed;
        const fade = sceneAlpha * (0.4 + layerT * 0.5);
        const points = [];
        for (let x = 0; x <= W; x += step) {
          const y = baseY
            + Math.sin(x * freq + phase) * amp
            + Math.sin(x * freq * 2.7 - phase * 1.4) * amp * 0.3;
          points.push([x, y]);
        }
        // Filled wave polygon
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (const [x, y] of points) ctx.lineTo(x, y);
        ctx.lineTo(W, H);
        ctx.closePath();
        if (sceneAlpha > 0.05) {
          const waveColor = ctx.createLinearGradient(0, baseY - amp, 0, H);
          waveColor.addColorStop(0,   `rgba(140, 210, 220, ${fade})`);
          waveColor.addColorStop(0.5, `rgba(60, 140, 175, ${fade * 0.95})`);
          waveColor.addColorStop(1,   `rgba(20, 80, 120, ${fade})`);
          ctx.fillStyle = waveColor;
        } else {
          ctx.fillStyle = `rgba(120, 200, 220, ${0.16 + layerT * 0.18})`;
        }
        ctx.fill();
        // Foam stroke on the crest
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
          const [x, y] = points[i];
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${(sceneAlpha > 0.05 ? sceneAlpha : 0.6) * (0.25 + layerT * 0.35)})`;
        ctx.lineWidth = Math.max(1, SCALE);
        ctx.stroke();
      }
      // Sparkles on water — treble-driven
      const sparkleKnob = perViz['summer-tide'].sparkleRate / 100;
      const spawnP = (smoothTreble * 0.5 + smoothMid * 0.05) * (0.4 + sparkleKnob * 1.6);
      if (Math.random() < spawnP) spawnSparkle(horizonY + 4 * SCALE, H * 0.88);
      const stillSparks = [];
      for (const sp of sparkles) {
        sp.life -= dt * 1.7;
        if (sp.life <= 0) continue;
        ctx.fillStyle = `rgba(255, 250, 220, ${sp.life})`;
        ctx.fillRect(Math.round(sp.x - sp.size / 2), Math.round(sp.y - sp.size / 2), sp.size, sp.size);
        stillSparks.push(sp);
      }
      sparkles = stillSparks;
    },
  };
};
