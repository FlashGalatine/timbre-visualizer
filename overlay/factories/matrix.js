/* ── matrix (Matrix Rain — char pool or messages) ── */
VIZ_FACTORIES['matrix'] = function () {
  const CELL_W = Math.max(8, Math.round(12 * SCALE));
  const CELL_H = Math.max(10, Math.round(14 * SCALE));
  let COLS = Math.floor(W / CELL_W);
  let ROWS = Math.ceil(H / CELL_H);
  let columns = null;
  // The text is indexed by whole characters (TIMBRE.splitChars), so an emoji is
  // one glyph and never half of one. A column's message is an array of them; the
  // pool is split once and again only when its text changes.
  let poolText = null, poolChars = [];
  function pickChar(message, idx) {
    const cfg = perViz['matrix'];
    if (cfg.mode === 'messages' && message && message.length > 0) {
      return message[idx % message.length];
    }
    if (cfg.pool !== poolText) { poolText = cfg.pool; poolChars = TIMBRE.splitChars(cfg.pool); }
    if (poolChars.length > 0) {
      return poolChars[(Math.random() * poolChars.length) | 0];
    }
    return ' ';
  }
  function makeColumn(initialIdle) {
    return {
      alive: false, headRow: 0, lastStepAt: 0, message: null, msgIdx: 0,
      bright: false, jitter: Math.random() * 0.4 + 0.8,
      lastChar: pickChar(null, 0),
      idleUntil: initialIdle ? performance.now() + Math.random() * 2000 : 0,
      _lastRowInt: -1,
    };
  }
  function spawnColumn(col, bright) {
    const cfg = perViz['matrix'];
    col.alive = true;
    col.headRow = -1;
    col.bright = !!bright;
    if (cfg.mode === 'messages') {
      const msgs = cfg.messages.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      col.message = msgs.length ? TIMBRE.splitChars(msgs[(Math.random() * msgs.length) | 0]) : null;
      col.msgIdx = 0;
    } else {
      col.message = null;
      col.msgIdx = 0;
    }
    col.lastStepAt = performance.now();
    col.lastChar = pickChar(col.message, col.msgIdx);
    col.prevChar = null;
    col._lastRowInt = -1;
  }
  function recomputeGrid() {
    COLS = Math.floor(W / CELL_W);
    ROWS = Math.ceil(H / CELL_H);
    columns = new Array(COLS).fill(null).map(() => makeColumn(true));
  }
  return {
    start() { recomputeGrid(); },
    onResize() { recomputeGrid(); },
    draw(now, dt) {
      if (!columns) recomputeGrid();
      // The rain's trail: a 60 fps frame takes 18% off, and a frame of any other length as much as leaves the same after a second.
      fadeOrClear(0.18, dt);
      let loudness = 0.1, bass = 0;
      if (micActive && frequencies) {
        let sum = 0;
        for (let i = 0; i < frequencies.length; i++) sum += frequencies[i];
        loudness = (sum / (frequencies.length * 255)) * cfgGain;
        bass = ((frequencies[0] + frequencies[1] + frequencies[2] + frequencies[3]) / 4 / 255) * cfgGain;
      } else if (cfgIdleAnim) {
        loudness = 0.12 + 0.04 * Math.sin(now / 800);
      } else {
        loudness = 0;
      }
      const activeFraction = Math.max(0, Math.min(1, loudness * 1.5));
      const baseRowsPerSec = 4 + (perViz['matrix'].flow / 100) * 22;
      let aliveCount = 0;
      for (let c = 0; c < COLS; c++) if (columns[c].alive) aliveCount++;
      const targetActive = Math.ceil(COLS * activeFraction);
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      ctx.font = `bold ${CELL_H - 1}px 'Share Tech Mono', monospace`;
      ctx.textBaseline = 'top';
      for (let c = 0; c < COLS; c++) {
        const col = columns[c];
        if (!col.alive) {
          if (now >= col.idleUntil && aliveCount < targetActive) {
            spawnColumn(col, bass > 0.55);
            aliveCount++;
          }
          continue;
        }
        col.headRow += baseRowsPerSec * col.jitter * dt;
        if (col.headRow >= ROWS + 4) {
          col.alive = false;
          col.idleUntil = now + (200 + Math.random() * 1200) * (1.4 - activeFraction);
          continue;
        }
        const rowInt = Math.floor(col.headRow);
        if (rowInt !== col._lastRowInt) {
          col._lastRowInt = rowInt;
          col.prevChar = col.lastChar; // the glyph the head leaves behind
          if (perViz['matrix'].mode === 'messages' && col.message) col.msgIdx++;
          col.lastChar = pickChar(col.message, col.msgIdx);
        }
        const x = c * CELL_W + 1;
        const y = rowInt * CELL_H;
        if (rowInt < 0 || rowInt >= ROWS) continue;
        const rgb = getColor(colorT + (c / COLS) * 0.6);
        if (rowInt - 1 >= 0) {
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.85)`;
          // Recolour the cell the head just left with ITS glyph, not the new head's.
          ctx.fillText(col.prevChar || col.lastChar, x, (rowInt - 1) * CELL_H);
        }
        const tint = col.bright ? 1 : 0.4;
        const hr = Math.round(255 * (1 - tint) + rgb[0] * tint);
        const hg = Math.round(255 * (1 - tint) + rgb[1] * tint);
        const hb = Math.round(255 * (1 - tint) + rgb[2] * tint);
        ctx.fillStyle = `rgb(${hr}, ${hg}, ${hb})`;
        ctx.fillText(col.lastChar, x, y);
      }
    },
  };
};
