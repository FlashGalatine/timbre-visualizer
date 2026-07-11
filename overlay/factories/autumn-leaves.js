/* ── autumn-leaves (maple/oak leaves spinning through a perspective wind tunnel) ──
   Borrows the Z-projection trick from mountains-2d: leaves live in world (x,y,z)
   and travel toward the camera each frame. Bass drives a vortex pull around the
   image center plus an outward gust; treble accelerates per-leaf rotation so they
   "flip" and catch light. Local warm-palette colors — ignores the global palette. */
VIZ_FACTORIES['autumn-leaves'] = function () {
  const FOCAL = 90 * SCALE;
  const NEAR = 4;
  const FAR = 220;
  const FIELD_W = 200;
  const FIELD_H = 80;
  const LEAF_COLORS = [
    [212, 64, 28],
    [232, 110, 36],
    [240, 168, 50],
    [185, 80, 30],
    [156, 60, 24],
    [220, 130, 40],
    [122, 70, 30],
    [196, 92, 36],
  ];
  let leaves = [];
  let smoothBass = 0, smoothTreble = 0;
  function bandAverage(lo, hi) {
    if (!frequencies || frequencies.length === 0) return 0;
    const a = Math.floor(lo * frequencies.length);
    const b = Math.min(frequencies.length, Math.floor(hi * frequencies.length));
    let sum = 0;
    for (let i = a; i < b; i++) sum += frequencies[i];
    const n = Math.max(1, b - a);
    return (sum / (n * 255)) * cfgGain;
  }
  function makeLeaf(seedZ) {
    return {
      x: (Math.random() - 0.5) * FIELD_W,
      y: (Math.random() - 0.5) * FIELD_H,
      z: seedZ,
      vz: -(18 + Math.random() * 32),
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 1.5,
      type: Math.random() < 0.55 ? 'maple' : 'oak',
      color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      size: 6 + Math.random() * 5,
      tilt: Math.random() * Math.PI * 2,
      tiltSpeed: 0.6 + Math.random() * 1.3,
    };
  }
  function project(x, y, z) {
    if (z <= NEAR) return null;
    return {
      sx: W / 2 + (x / z) * FOCAL,
      sy: H / 2 + (y / z) * FOCAL,
      scale: FOCAL / z,
    };
  }
  function drawMaple(cx, cy, r, rot, color, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    ctx.beginPath();
    const pts = 5;
    for (let i = 0; i < pts * 2; i++) {
      const t = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = (i % 2 === 0) ? r : r * 0.42;
      const px = Math.cos(t) * rr;
      const py = Math.sin(t) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // Stem
    ctx.strokeStyle = `rgba(${Math.max(0, color[0] - 60)}, ${Math.max(0, color[1] - 40)}, ${Math.max(0, color[2] - 20)}, ${alpha * 0.7})`;
    ctx.lineWidth = Math.max(1, r * 0.10);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.7);
    ctx.lineTo(0, r * 1.25);
    ctx.stroke();
    ctx.restore();
  }
  function drawOak(cx, cy, r, rot, color, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    ctx.beginPath();
    const segs = 22;
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI * 2;
      const rr = r * (0.78 + 0.22 * Math.cos(t * 6));
      const px = Math.cos(t) * rr;
      const py = Math.sin(t) * rr * 1.3;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // Center vein
    ctx.strokeStyle = `rgba(${Math.max(0, color[0] - 60)}, ${Math.max(0, color[1] - 40)}, ${Math.max(0, color[2] - 20)}, ${alpha * 0.5})`;
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.1);
    ctx.lineTo(0, r * 1.1);
    ctx.stroke();
    ctx.restore();
  }
  return {
    start() {
      leaves = [];
      for (let i = 0; i < 38; i++) {
        leaves.push(makeLeaf(NEAR + 4 + Math.random() * (FAR - NEAR - 4)));
      }
    },
    draw(now, dt) {
      const fadeAmount = 0.55 * cfgEffectBgOpacity;
      if (fadeAmount > 0.001) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else {
        ctx.clearRect(0, 0, W, H);
      }
      let bass, treble;
      if (micActive && frequencies) {
        bass = bandAverage(0, 0.18);
        treble = bandAverage(0.55, 1.0);
      } else if (cfgIdleAnim) {
        const t = now / 1100;
        bass = 0.16 + 0.05 * Math.sin(t);
        treble = 0.16 + 0.05 * Math.sin(t * 1.5);
      } else { bass = 0; treble = 0; }
      smoothBass += (bass - smoothBass) * 0.15;
      smoothTreble += (treble - smoothTreble) * 0.25;
      const densityKnob = perViz['autumn-leaves'].leafDensity / 100;
      const vortexKnob = perViz['autumn-leaves'].vortexStrength / 100;
      const targetCount = Math.round(20 + densityKnob * 70);
      while (leaves.length < targetCount) leaves.push(makeLeaf(FAR + Math.random() * 40));
      // Far → near so closer leaves draw on top
      leaves.sort((a, b) => b.z - a.z);
      const speedScale = 1 + smoothBass * 1.6;
      const vortex = (0.6 + smoothBass * 2.0) * vortexKnob;
      const rotBoost = 1 + smoothTreble * 3.0;
      const stillAlive = [];
      for (const lf of leaves) {
        lf.z += lf.vz * dt * speedScale;
        if (lf.z <= NEAR + 0.4) continue;
        if (vortex > 0.001) {
          const angle = Math.atan2(lf.y, lf.x);
          const r = Math.hypot(lf.x, lf.y);
          const newAngle = angle + vortex * dt * 0.7;
          lf.x = Math.cos(newAngle) * r;
          lf.y = Math.sin(newAngle) * r;
          lf.x += Math.cos(angle) * smoothBass * 8 * dt;
          lf.y += Math.sin(angle) * smoothBass * 8 * dt;
        }
        // Gentle base drift
        lf.x += Math.sin(now * 0.0007 + lf.tilt) * dt * 4;
        lf.y += Math.cos(now * 0.0008 + lf.tilt) * dt * 3;
        lf.rot += lf.rotSpeed * dt * rotBoost;
        lf.tilt += lf.tiltSpeed * dt;
        const p = project(lf.x, lf.y, lf.z);
        if (!p) continue;
        if (p.sx < -60 || p.sx > W + 60 || p.sy < -60 || p.sy > H + 60) {
          stillAlive.push(lf);
          continue;
        }
        const r = Math.max(2, lf.size * p.scale);
        const depthFade = Math.min(1, 1.15 - lf.z / FAR);
        const flipShade = 0.55 + 0.45 * Math.abs(Math.cos(lf.tilt));
        const alpha = Math.max(0.05, depthFade) * flipShade;
        if (lf.type === 'maple') {
          drawMaple(p.sx, p.sy, r, lf.rot, lf.color, alpha);
        } else {
          drawOak(p.sx, p.sy, r, lf.rot, lf.color, alpha);
        }
        stillAlive.push(lf);
      }
      leaves = stillAlive;
    },
  };
};
