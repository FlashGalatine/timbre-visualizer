/* ── pulse-rings (RMS spike-driven concentric rings) ── */
VIZ_FACTORIES['pulse-rings'] = function () {
  const RING_LIFETIME = 1500;
  const RING_MAX_R = 80 * SCALE;
  const MIN_EMIT_GAP = 80;
  const IDLE_EMIT_PERIOD = 2400;
  const RING_CHUNK = Math.max(2, Math.round(2 * SCALE));
  const CHUNK_GAP = Math.max(3, Math.round(4 * SCALE));
  const CROSSHAIR_LEN = 30 * SCALE;
  let smoothVol = 0;
  let rings = [];
  let lastEmit = 0;
  let lastIdleEmit = 0;
  function getRMS() {
    if (!micActive || !waveform || waveform.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < waveform.length; i++) {
      const v = (waveform[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / waveform.length) * cfgGain;
  }
  function emitRing(now, vol) {
    if (now - lastEmit < MIN_EMIT_GAP) return;
    rings.push({ born: now, peakVol: Math.min(1, Math.max(0.2, vol)), colorOffset: Math.random() * PALETTE.length });
    lastEmit = now;
    if (rings.length > 12) rings.shift();
  }
  function drawRingPixel(rx, ry, alpha, rgb, CX, CY) {
    const circumference = 2 * Math.PI * Math.max(rx, ry);
    const steps = Math.max(24, Math.round(circumference / CHUNK_GAP));
    ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    for (let i = 0; i < steps; i++) {
      const rad = (i / steps) * Math.PI * 2;
      const x = Math.round(CX + Math.cos(rad) * rx);
      const y = Math.round(CY + Math.sin(rad) * ry);
      ctx.fillRect(x - RING_CHUNK / 2, y - RING_CHUNK / 2, RING_CHUNK, RING_CHUNK);
    }
  }
  return {
    start() { rings = []; },
    draw() {
      ctx.clearRect(0, 0, W, H);
      const CX = W / 2, CY = H / 2;
      const now = Date.now();
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const SPIKE_THRESHOLD = 0.15 - (perViz['pulse-rings'].sensitivity / 100) * 0.13;
      const flow = perViz['pulse-rings'].flow / 100;
      const rawVol = getRMS();
      smoothVol += (rawVol - smoothVol) * 0.18;
      if (micActive && rawVol - smoothVol > SPIKE_THRESHOLD) emitRing(now, rawVol);
      if (!micActive && cfgIdleAnim && now - lastIdleEmit > IDLE_EMIT_PERIOD) {
        rings.push({ born: now, peakVol: 0.4, colorOffset: Math.random() * PALETTE.length });
        lastIdleEmit = now;
        if (rings.length > 12) rings.shift();
      }
      ctx.fillStyle = 'rgba(0, 255, 255, 0.10)';
      const ch = Math.max(1, Math.round(SCALE));
      ctx.fillRect(CX - CROSSHAIR_LEN, CY, CROSSHAIR_LEN * 2, ch);
      ctx.fillRect(CX, CY - CROSSHAIR_LEN, ch, CROSSHAIR_LEN * 2);
      const vertCap = H / 2 - 2;
      const stillAlive = [];
      for (const ring of rings) {
        const age = now - ring.born;
        if (age >= RING_LIFETIME) continue;
        const lifeT = age / RING_LIFETIME;
        const r = lifeT * RING_MAX_R * (0.6 + ring.peakVol * 0.6);
        const alpha = (1 - lifeT) * (0.4 + ring.peakVol * 0.5);
        const rgb = getColor(colorT + ring.colorOffset);
        let rx, ry;
        if (flow > 0.01) {
          ry = Math.min(r, vertCap);
          rx = r * (1 + flow * 3);
        } else { rx = r; ry = r; }
        drawRingPixel(rx, ry, alpha, rgb, CX, CY);
        stillAlive.push(ring);
      }
      rings = stillAlive;
      const centerR = (3 + Math.round(smoothVol * 4)) * SCALE;
      const cRgb = getColor(colorT + 0.5);
      const tipRgb = [Math.min(255, cRgb[0] + 80), Math.min(255, cRgb[1] + 80), Math.min(255, cRgb[2] + 80)];
      ctx.fillStyle = `rgb(${tipRgb[0]}, ${tipRgb[1]}, ${tipRgb[2]})`;
      ctx.fillRect(CX - centerR, CY - centerR, centerR * 2, centerR * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      const cHi = Math.max(2, Math.round(2 * SCALE));
      ctx.fillRect(CX - cHi / 2, CY - cHi / 2, cHi, cHi);
    },
  };
};
