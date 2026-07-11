/* ── dna (double helix with bass/treble strands) ── */
VIZ_FACTORIES['dna'] = function () {
  const STEP_X = Math.max(2, Math.round(4 * SCALE));
  const RUNG_GAP = Math.max(STEP_X, Math.round(12 * SCALE / STEP_X) * STEP_X);
  const PHASE_SPEED = 1.6;
  const BASE_AMP = 14 * SCALE;
  const MAX_AMP = 32 * SCALE;
  const STRAND_PX = Math.max(2, Math.round(2 * SCALE));
  const RUNG_W = Math.max(2, Math.round(2 * SCALE));
  const SNAP = Math.max(2, Math.round(2 * SCALE));
  const ZERO_HI = Math.max(2, Math.round(2 * SCALE));
  const HELIX_FREQ_BASE = 0.025 / SCALE;
  const HELIX_FREQ_RANGE = 0.05 / SCALE;
  let smoothBass = 0, smoothTreble = 0;
  function bandAverage(start, end) {
    if (!frequencies || frequencies.length === 0) return 0;
    const lo = Math.floor(start * frequencies.length);
    const hi = Math.min(frequencies.length, Math.floor(end * frequencies.length));
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += frequencies[i];
    const n = Math.max(1, hi - lo);
    return (sum / (n * 255)) * cfgGain;
  }
  function snap(v) { return Math.round(v / SNAP) * SNAP; }
  return {
    draw() {
      ctx.clearRect(0, 0, W, H);
      const MID = H / 2;
      const HELIX_FREQ = HELIX_FREQ_BASE + (perViz['dna'].helixFreq / 100) * HELIX_FREQ_RANGE;
      const now = Date.now();
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const phase = (now / 1000) * PHASE_SPEED;
      let bass, treble;
      if (micActive && frequencies) {
        bass = bandAverage(0, 0.2);
        treble = bandAverage(0.55, 1.0);
      } else if (cfgIdleAnim) {
        bass = 0.18 + 0.08 * Math.sin(now / 700);
        treble = 0.18 + 0.08 * Math.sin(now / 540 + 1.2);
      } else { bass = 0; treble = 0; }
      smoothBass += (bass - smoothBass) * 0.18;
      smoothTreble += (treble - smoothTreble) * 0.22;
      const ampA = BASE_AMP + smoothBass * (MAX_AMP - BASE_AMP);
      const ampB = BASE_AMP + smoothTreble * (MAX_AMP - BASE_AMP);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(0, MID, W, 1);
      const points = [];
      for (let x = 0; x <= W; x += STEP_X) {
        const angle = x * HELIX_FREQ + phase;
        const yA = snap(MID + Math.sin(angle) * ampA);
        const yB = snap(MID + Math.sin(angle + Math.PI) * ampB);
        points.push({ x, yA, yB });
      }
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.x % RUNG_GAP !== 0) continue;
        const sep = Math.abs(p.yA - p.yB);
        const maxSep = (ampA + ampB);
        const brightness = maxSep > 0 ? sep / maxSep : 1;
        const rungRgb = getColor(colorT + 0.5 + (p.x / W) * 0.6);
        const yTop = Math.min(p.yA, p.yB);
        const yBot = Math.max(p.yA, p.yB);
        ctx.fillStyle = `rgba(${rungRgb[0]}, ${rungRgb[1]}, ${rungRgb[2]}, ${0.25 + brightness * 0.55})`;
        ctx.fillRect(p.x - RUNG_W / 2, yTop, RUNG_W, yBot - yTop);
      }
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const colA = getColor(colorT + (i / points.length) * 1.2);
        const dx = Math.abs(b.x - a.x);
        const dy = Math.abs(b.yA - a.yA);
        const steps = Math.max(dx, dy);
        ctx.fillStyle = `rgb(${colA[0]}, ${colA[1]}, ${colA[2]})`;
        for (let s = 0; s <= steps; s++) {
          const t = s / Math.max(1, steps);
          const px = Math.round(a.x + (b.x - a.x) * t);
          const py = snap(a.yA + (b.yA - a.yA) * t);
          ctx.fillRect(px - STRAND_PX / 2, py - STRAND_PX / 2, STRAND_PX, STRAND_PX);
        }
      }
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const colB = getColor(colorT + 1.5 + (i / points.length) * 1.2);
        const dx = Math.abs(b.x - a.x);
        const dy = Math.abs(b.yB - a.yB);
        const steps = Math.max(dx, dy);
        ctx.fillStyle = `rgb(${colB[0]}, ${colB[1]}, ${colB[2]})`;
        for (let s = 0; s <= steps; s++) {
          const t = s / Math.max(1, steps);
          const px = Math.round(a.x + (b.x - a.x) * t);
          const py = snap(a.yB + (b.yB - a.yB) * t);
          ctx.fillRect(px - STRAND_PX / 2, py - STRAND_PX / 2, STRAND_PX, STRAND_PX);
        }
      }
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1], cur = points[i];
        if ((prev.yA - MID) * (cur.yA - MID) < 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillRect(cur.x - ZERO_HI / 2, MID - ZERO_HI / 2, ZERO_HI, ZERO_HI);
        }
      }
    },
  };
};
