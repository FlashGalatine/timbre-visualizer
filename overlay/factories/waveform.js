/* ── waveform (time-domain smooth line with echoes) ── */
VIZ_FACTORIES['waveform'] = function () {
  const LW = Math.max(1.5, 2.2 * SCALE);
  const echoes = TimbreGlow.createEchoes();
  return {
    draw(now, dt) {
      ctx.clearRect(0, 0, W, H);
      const MID = H / 2;
      const colorT = ((Date.now() * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const live = micActive && !!waveform;
      const n = live ? waveform.length : 64;
      const xs = new Float32Array(n);
      const ys = new Float32Array(n);
      let loudness = 0;
      for (let i = 0; i < n; i++) {
        let sample;
        if (live) {
          sample = ((waveform[i] - 128) / 128) * cfgGain;
        } else if (cfgIdleAnim) {
          sample = 0.15 * Math.sin(Date.now() / 500 + i * 0.25);
        } else {
          sample = 0;
        }
        const a = Math.abs(sample);
        if (a > loudness) loudness = a;
        xs[i] = n > 1 ? (i / (n - 1)) * W : 0;
        ys[i] = Math.min(H - LW, Math.max(LW, MID - sample * MID));
      }

      // Nine-stop gradient along the line, matching the colour sweep.
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      for (let k = 0; k <= 8; k++) {
        const c = getColor(colorT + (k / 8) * 1.5);
        grad.addColorStop(k / 8, `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
      }
      const mid = getColor(colorT + 0.75);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(0, MID, W, 1);

      const addLine = () => TimbreGlow.trace(ctx, xs, ys, false);
      const addArea = (shape) => {
        TimbreGlow.trace(ctx, xs, shape, false);
        ctx.lineTo(W, MID);
        ctx.lineTo(0, MID);
        ctx.closePath();
      };

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowBlur = 0;

      // Afterglow: echoes of recent loud moments, oldest first, behind the live line.
      echoes.sync(n + ':' + W + ':' + H);
      const list = echoes.step(loudness, now, dt, cfgAfterglow, live, () => Float32Array.from(ys));
      for (const e of list) {
        ctx.fillStyle = grad;
        ctx.globalAlpha = TimbreGlow.ECHO_FILL * e.strength;
        ctx.beginPath();
        addArea(e.shape);
        ctx.fill();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8 * LW;
        ctx.globalAlpha = TimbreGlow.ECHO * e.strength;
        ctx.beginPath();
        TimbreGlow.trace(ctx, xs, e.shape, false);
        ctx.stroke();
      }

      // The live line.
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = grad;
      ctx.beginPath();
      addArea(ys);
      ctx.fill();
      ctx.globalAlpha = 1;
      TimbreGlow.glowLine(ctx, addLine, {
        width: LW, stroke: grad, glowColor: `rgb(${mid[0]}, ${mid[1]}, ${mid[2]})`, blur: 8 * SCALE,
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    },
  };
};
