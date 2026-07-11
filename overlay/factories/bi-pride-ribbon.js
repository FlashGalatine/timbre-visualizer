/* ── bi-pride-ribbon (Michael Page, 1998 — magenta/purple/blue ribbon) ──
   Same waveform-displacement engine as pride-ribbon, but with the bi flag's
   characteristic 40/20/40 non-equal stripe widths: a thick magenta band on
   top (same-sex attraction), a thin purple band in the middle (attraction
   to both), and a thick blue band on the bottom (opposite-sex attraction).
   Hearts are themed to the flag's three colors. */
VIZ_FACTORIES['bi-pride-ribbon'] = function () {
  // [r, g, b, heightFraction] — fractions sum to 1.0
  const STRIPES = [
    [214, 2, 112, 0.40],   // magenta
    [155, 79, 150, 0.20],  // purple
    [0, 56, 168, 0.40],    // royal blue
  ];
  const HEART_COLORS = [
    [232, 70, 150],   // hot pink
    [255, 130, 195],  // light pink
    [170, 95, 200],   // purple
    [100, 150, 230],  // light blue
  ];
  const MAX_HEARTS = 70;
  let hearts = [];
  let smoothBass = 0, smoothMid = 0, smoothTreble = 0;
  function bandAverage(lo, hi) {
    if (!frequencies || frequencies.length === 0) return 0;
    const a = Math.floor(lo * frequencies.length);
    const b = Math.min(frequencies.length, Math.floor(hi * frequencies.length));
    let s = 0;
    for (let i = a; i < b; i++) s += frequencies[i];
    const n = Math.max(1, b - a);
    return (s / (n * 255)) * cfgGain;
  }
  function spawnHeart() {
    hearts.push({
      x: Math.random() * W,
      y: H + 4 * SCALE,
      vy: -(20 + Math.random() * 30) * SCALE,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.6 + Math.random() * 1.2,
      swayAmp: (4 + Math.random() * 7) * SCALE,
      size: 3 + Math.random() * 3,
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      sparkle: 0,
    });
    if (hearts.length > MAX_HEARTS) hearts.shift();
  }
  function pathHeart(cx, cy, size) {
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
  return {
    start() { hearts = []; },
    draw(now, dt) {
      const sceneAlpha = cfgEffectBgOpacity;
      if (sceneAlpha > 0.05) {
        ctx.fillStyle = `rgba(18, 14, 28, ${sceneAlpha * 0.85})`;
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
      // Ribbon layout
      const ribbonH = H * 0.78;
      const ribbonTop = H * 0.11;
      const ampKnob = perViz['bi-pride-ribbon'].ribbonAmplitude / 100;
      const ampPx = (5 + smoothBass * 28) * SCALE * (0.4 + ampKnob * 1.6);
      const phase = now / 700;
      const sliceW = Math.max(1, Math.round(2 * SCALE));
      const wfLen = (micActive && waveform) ? waveform.length : 0;
      function dispAt(x) {
        const t = x / W;
        let d = Math.sin(t * 4 + phase) * ampPx
              + Math.sin(t * 9 - phase * 1.4) * ampPx * 0.35;
        if (wfLen > 0) {
          const idx = Math.floor(t * wfLen) % wfLen;
          const wv = (waveform[idx] - 128) / 128;
          d += wv * ampPx * 0.5 * cfgGain;
        }
        return d;
      }
      // Draw stripes with proportional heights — track running Y offset
      let yCursor = ribbonTop;
      for (const stripe of STRIPES) {
        const sH = ribbonH * stripe[3];
        ctx.fillStyle = `rgb(${stripe[0]}, ${stripe[1]}, ${stripe[2]})`;
        for (let x = 0; x < W; x += sliceW) {
          const d = dispAt(x);
          ctx.fillRect(Math.round(x), Math.round(yCursor + d), sliceW + 1, Math.ceil(sH) + 1);
        }
        yCursor += sH;
      }
      // Edge glow above ribbon
      const glowAlpha = Math.min(0.55, 0.18 + smoothBass * 0.6);
      const topGrad = ctx.createLinearGradient(0, ribbonTop - 30 * SCALE, 0, ribbonTop);
      topGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      topGrad.addColorStop(1, `rgba(255, 255, 255, ${glowAlpha * 0.45})`);
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, ribbonTop - 30 * SCALE, W, 30 * SCALE);
      // Hearts
      const heartKnob = perViz['bi-pride-ribbon'].heartRate / 100;
      const spawnP = (0.06 + smoothMid * 0.3 + smoothBass * 0.15) * (0.4 + heartKnob * 1.6);
      if (Math.random() < spawnP) spawnHeart();
      const stillHearts = [];
      for (const h of hearts) {
        h.y += h.vy * dt;
        h.sway += h.swaySpeed * dt;
        const drawX = h.x + Math.sin(h.sway) * h.swayAmp;
        const sz = h.size * SCALE * (1 + smoothBass * 0.30);
        if (smoothTreble > 0.45 && Math.random() < smoothTreble * 0.04) {
          h.sparkle = Math.min(1, h.sparkle + 0.6);
        }
        h.sparkle *= 0.92;
        if (h.y < -sz * 1.5) continue;
        const alpha = Math.min(1, (h.y + sz) / (H * 0.4));
        pathHeart(drawX, h.y, sz);
        ctx.fillStyle = `rgba(${h.color[0]}, ${h.color[1]}, ${h.color[2]}, ${alpha * 0.95})`;
        ctx.fill();
        ctx.fillStyle = `rgba(255, 240, 245, ${0.5 * alpha})`;
        ctx.beginPath();
        ctx.ellipse(drawX - sz * 0.35, h.y + sz * 0.10, sz * 0.18, sz * 0.12, -0.5, 0, Math.PI * 2);
        ctx.fill();
        if (h.sparkle > 0.05) {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, h.sparkle) * alpha})`;
          const ss = Math.max(1, Math.round(SCALE));
          ctx.fillRect(Math.round(drawX + sz * 0.3), Math.round(h.y - sz * 0.05), ss, ss);
        }
        stillHearts.push(h);
      }
      hearts = stillHearts;
    },
  };
};
