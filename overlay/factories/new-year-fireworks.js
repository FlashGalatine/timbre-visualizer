/* ── new-year-fireworks (rocket-and-burst particle system on bass beats) ──
   RMS spike detection launches a rocket from the bottom edge; when the rocket
   peaks (or naturally times out), it explodes into a radial burst with gravity
   and trails. Treble dusts every burst with white sparkles. Idle mode auto-fires
   one burst every ~3s. Colors come from PALETTE so global hue/speed apply. */
VIZ_FACTORIES['new-year-fireworks'] = function () {
  const MAX_PARTICLES = 800;
  const ROCKET_APEX_MIN = 0.45;              // burst height as a fraction of H above the bottom edge…
  const ROCKET_APEX_MAX = 0.80;              // …so every burst is centred inside the canvas
  const ROCKET_GRAVITY = 0.22;               // rockets feel a fraction of spark gravity
  const ROCKET_LIFE_MIN = 0.55;
  const ROCKET_LIFE_MAX = 0.85;
  const MIN_BEAT_GAP = 220;
  const IDLE_PERIOD = 3000;
  let particles = [];
  let smoothBass = 0, smoothTreble = 0, smoothRMS = 0;
  let bassEMA = 0;
  let lastBeat = 0;
  let lastIdle = 0;
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
  function sparkGravity() {
    return (60 + (perViz['new-year-fireworks'].gravity / 100) * 220) * SCALE;
  }
  function spawnRocket(now, intensity) {
    const x = W * (0.15 + Math.random() * 0.7);
    const drift = (Math.random() - 0.5) * 60 * SCALE;
    const life = ROCKET_LIFE_MIN + Math.random() * (ROCKET_LIFE_MAX - ROCKET_LIFE_MIN);
    /* Launch speed is solved from the canvas height so the rocket reaches its
       apex fraction exactly when its life ends (rise = -vy*t - g*t²/2). A fixed
       px/sec speed overshot every layout: the canvas is only 130-180 units tall. */
    const rise = H * (ROCKET_APEX_MIN + Math.random() * (ROCKET_APEX_MAX - ROCKET_APEX_MIN)) + 4 * SCALE;
    const vy = -(rise / life + 0.5 * sparkGravity() * ROCKET_GRAVITY * life);
    const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue + Math.random() * PALETTE.length) % PALETTE.length;
    particles.push({
      kind: 'rocket',
      x, y: H + 4 * SCALE,
      vx: drift, vy,
      life, age: 0,
      colorT,
      intensity: Math.min(1, 0.5 + intensity),
    });
    if (particles.length > MAX_PARTICLES) particles.shift();
    lastBeat = now;
  }
  function explode(rocket) {
    const colorT = rocket.colorT;
    const countKnob = perViz['new-year-fireworks'].particleCount / 100;
    const count = Math.round(28 + countKnob * 60);
    const baseSpeed = (90 + Math.random() * 40) * SCALE * (0.7 + rocket.intensity * 0.6);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.1;
      const sp = baseSpeed * (0.65 + Math.random() * 0.7);
      particles.push({
        kind: 'spark',
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.9 + Math.random() * 0.7,
        age: 0,
        colorT: (colorT + (Math.random() - 0.5) * 0.6 + PALETTE.length) % PALETTE.length,
        glitter: Math.random() < 0.18,
      });
      if (particles.length > MAX_PARTICLES) particles.shift();
    }
  }
  return {
    start() {
      particles = [];
      bassEMA = 0;
      lastBeat = 0;
      lastIdle = 0;
    },
    draw(now, dt) {
      // Trail veil — long-trail-friendly. trailFade knob shifts the fade strength.
      const trailKnob = perViz['new-year-fireworks'].trailFade / 100;
      const fadeAmount = (0.10 + trailKnob * 0.45) * cfgEffectBgOpacity;
      if (fadeAmount > 0.001) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      // Audio
      let bass, treble, rms;
      if (micActive && frequencies) {
        bass = bandAverage(0, 0.18);
        treble = bandAverage(0.55, 1.0);
        rms = getRMS();
      } else if (cfgIdleAnim) {
        const t = now / 1100;
        bass = 0.16 + 0.06 * Math.sin(t);
        treble = 0.16 + 0.06 * Math.sin(t * 1.5);
        rms = 0.18 + 0.10 * Math.abs(Math.sin(t * 0.7));
      } else { bass = 0; treble = 0; rms = 0; }
      smoothBass += (bass - smoothBass) * 0.20;
      smoothTreble += (treble - smoothTreble) * 0.25;
      smoothRMS += (rms - smoothRMS) * 0.25;
      bassEMA = bassEMA * 0.85 + bass * 0.15;
      // Beat / spike → rocket launch
      const sensKnob = perViz['new-year-fireworks'].burstChance / 100;
      const spikeThreshold = 0.45 - sensKnob * 0.32;  // 0.45 → 0.13
      const beat = micActive
        && (bass > bassEMA * (1.30 + (1 - sensKnob) * 0.2) + spikeThreshold)
        && (now - lastBeat > MIN_BEAT_GAP);
      if (beat) spawnRocket(now, smoothBass);
      // Idle auto-burst
      if (!micActive && cfgIdleAnim && now - lastIdle > IDLE_PERIOD) {
        spawnRocket(now, 0.5);
        lastIdle = now;
      }
      // Update + draw
      const gravity = sparkGravity();
      const stillAlive = [];
      for (const p of particles) {
        p.age += dt;
        if (p.kind === 'rocket') {
          p.vy += gravity * ROCKET_GRAVITY * dt;  // light gravity on rocket
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          // A rocket ALWAYS ends in a burst: at the end of its life, or if it has
          // started to fall. (Dropping expired rockets before this test lost
          // ~40% of them at 30 fps, where a frame can step over the last 20 ms.)
          if (p.age >= p.life || p.vy >= 0) {
            explode(p);
            continue;
          }
          const lifeT = p.age / p.life;
          const rgb = getColor(p.colorT);
          const tipRgb = [Math.min(255, rgb[0] + 80), Math.min(255, rgb[1] + 80), Math.min(255, rgb[2] + 80)];
          // Trail
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.6 * (1 - lifeT * 0.4)})`;
          const trailLen = 14 * SCALE;
          for (let s = 0; s < 6; s++) {
            const t = s / 6;
            const tx = p.x - p.vx * dt * 0.6 * s * 0.5;
            const ty = p.y - p.vy * dt * 0.6 * s * 0.5 - t * trailLen * 0.3;
            const sz = Math.max(1, Math.round((1.6 - t) * SCALE));
            ctx.fillRect(Math.round(tx - sz / 2), Math.round(ty - sz / 2), sz, sz);
          }
          // Tip
          ctx.fillStyle = `rgb(${tipRgb[0]}, ${tipRgb[1]}, ${tipRgb[2]})`;
          const ts = Math.max(2, Math.round(2.5 * SCALE));
          ctx.fillRect(Math.round(p.x - ts / 2), Math.round(p.y - ts / 2), ts, ts);
          stillAlive.push(p);
        } else { // 'spark'
          if (p.age >= p.life) continue;
          p.vy += gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          // Slight air drag so older sparks slow naturally
          p.vx *= Math.pow(0.985, dt * 60);
          const lifeT = p.age / p.life;
          const fade = Math.pow(1 - lifeT, 1.2);
          const rgb = getColor(p.colorT);
          const sz = Math.max(1, Math.round((1.4 - lifeT * 0.6) * SCALE));
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${fade})`;
          ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
          // Treble glitter — overdraw with white sparkle on a fraction of sparks
          if (p.glitter && smoothTreble > 0.18 && Math.random() < smoothTreble * 0.4) {
            ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.85})`;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(SCALE)), Math.max(1, Math.round(SCALE)));
          }
          if (p.y < H + 8 * SCALE) stillAlive.push(p);
        }
      }
      particles = stillAlive;
    },
  };
};
