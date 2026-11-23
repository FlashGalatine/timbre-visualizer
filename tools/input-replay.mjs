// Recorded signals for Timbre's overlay, and the three things done with them. Shared by
// tools/compare-input.mjs (two builds side by side) and verify-render.mjs (the checks that
// guard how effects look under real input).
//
//   signalInit    runs in the page before its scripts: the page's AudioContext becomes an
//                 OfflineAudioContext playing one test signal, so the REAL AnalyserNodes of
//                 overlay/audio-capture.js (and their smoothing) do the work, with no real
//                 time in it. The sampler's 33 ms timer is caught, not started.
//   recordInPage  runs in that page: steps the signal one look (33 ms) at a time and returns
//                 what the sampler published on each look.
//   replayInPage  runs in any overlay page: feeds such a recording to one effect, stepping
//                 draw() by hand at a fixed frame rate with a seeded Math.random and a clock
//                 the tool turns, and returns numbers (and, when asked, pictures) of chosen frames.
//
// Nothing here opens a port or a browser: the caller does.

export const SIGNALS = ['speech', 'speech220', 'kick', 'music', 'sweep', 'silence'];
export const SECONDS = 6;
// The moments (seconds into the signal) the tools look at, per signal.
export const TIMES = { speech: [1.5, 3.0, 4.5], speech220: [1.5, 3.0, 4.5], kick: [1.55, 2.8, 4.3], music: [1.55, 2.8, 4.3], sweep: [1.0, 3.0, 5.0], silence: [3.0] };

// What verify-render.mjs guards: a frame of each of these effects, drawn under the recorded
// speech, against the numbers stored in tools/input-expectations.json (written by
// `node tools/compare-input.mjs --steps record,render,expect`). At least two effects of each
// group of readers (see tools/input-readers.mjs).
export const GUARD = { signal: 'speech', time: 3.0, cols: 8, rows: 4,
  effects: ['dna', 'blob', 'orbit',                                   // group 1: levels() in helix.js
    'galaxy-ripple', 'matrix', 'winter-aurora', 'pride-ribbon',       // group 2: bass and high from micBands
    'glass-prism', 'jelly', 'sunburst-3d',                            // group 3: scene modules on the slices
    'visualizer', 'spectrogram', 'tunnel', 'mountains-2d',            // group 4: bars on the log bands
    'autumn-leaves', 'summer-tide',                                   // group 5: seasonal effects on the slices
    'thanksgiving-harvest', 'christmas-tree'] };                      // group 6: the scene kit's level and beat
// What the sampler published over a whole recording, as a few means (for the stored expectations).
export function soundSummary(ticks) {
  const mean = (fn) => ticks.reduce((sum, t) => sum + fn(t), 0) / ticks.length, avg = (a, from, to) => { let s = 0; for (let i = from; i < to; i++) s += a[i]; return s / (to - from) / 255; };
  const round = (v) => Math.round(v * 10000) / 10000;
  return { looks: ticks.length, bands: round(mean((t) => avg(t.f, 0, 32))), slices: round(mean((t) => avg(t.s, 0, 32))), lowSlices: round(mean((t) => avg(t.s, 0, 6))),
    bass: round(mean((t) => t.b.bass)), mid: round(mean((t) => t.b.mid)), treble: round(mean((t) => t.b.treble)), rms: round(mean((t) => t.b.rms)), level: round(mean((t) => t.b.level)), beats: ticks[ticks.length - 1].b.beats };
}

// Self-contained: it is handed to page.addInitScript(signalInit, { signal, seconds }).
export function signalInit({ signal, seconds }) {
  const SR = 48000, N = SR * seconds;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function make(signal) {
    const x = new Float32Array(N), r = rng(12345);
    // A burst of hiss (white noise differenced twice, so most of it lies above 5 kHz).
    const hissAt = (start, len, amp, decay) => {
      let prev = 0, prev2 = 0; const n0 = Math.floor(start * SR), n = Math.floor(len * SR);
      for (let i = 0; i < n && n0 + i < N; i++) { const w = r() * 2 - 1, d = w - prev, d2 = d - prev2; prev = w; prev2 = d; x[n0 + i] += amp * d2 * (decay ? Math.exp(-i / SR * decay) : Math.sin(Math.PI * i / n)); }
    };
    if (signal === 'speech' || signal === 'speech220') {
      // Syllables: a voiced burst (a fundamental of 150 Hz, or 220 Hz, and its harmonics under
      // three formants, the pitch gliding a little), sometimes with a hiss ("s") before it; a
      // longer pause every seventh.
      const pitch = signal === 'speech' ? 150 : 220;
      let t = 0.5, k = 0;
      while (t < seconds - 0.3) {
        const len = 0.14 + 0.1 * r(), gap = (k % 7 === 6) ? 0.7 : 0.06 + 0.08 * r(), amp = 0.6 + 0.4 * r(), f0 = pitch * (0.94 + 0.12 * r());
        const hiss = r() < 0.35 ? 0.07 : 0;
        if (hiss) { hissAt(t, hiss, 0.035 * amp, 0); t += hiss; }
        const n0 = Math.floor(t * SR), n = Math.floor(len * SR), phases = [];
        for (let h = 1; h <= 26; h++) phases.push(r() * 6.283);
        const F = [600 + 300 * r(), 1100 + 500 * r(), 2500 + 400 * r()];
        for (let i = 0; i < n && n0 + i < N; i++) {
          const tt = i / SR, env = Math.min(1, i / (0.012 * SR)) * Math.min(1, (n - i) / (0.04 * SR)), f = f0 * (1 + 0.06 * tt / len);
          let s = 0;
          for (let h = 1; h <= 26; h++) {
            const fh = f * h; let g = 1 / h;
            for (let q = 0; q < 3; q++) { const d = (fh - F[q]) / (90 + 60 * q); g += 1.6 / (1 + d * d) / (1 + q); }
            s += g * Math.sin(6.283185307 * fh * tt + phases[h - 1]);
          }
          x[n0 + i] += 0.045 * amp * env * s + 0.004 * env * (r() * 2 - 1);
        }
        t += len + gap; k++;
      }
    } else if (signal === 'kick') {
      // 120 beats a minute: a kick on every beat (a sine falling from 120 to 50 Hz), a hi-hat between.
      for (let beat = 0; 0.5 + beat * 0.5 < seconds - 0.2; beat++) {
        const n0 = Math.floor((0.5 + beat * 0.5) * SR); let ph = 0;
        for (let i = 0; i < 0.25 * SR && n0 + i < N; i++) { const tt = i / SR, f = 50 + 70 * Math.exp(-tt * 18); ph += 6.283185307 * f / SR; x[n0 + i] += 0.6 * Math.exp(-tt * 14) * Math.min(1, i / 48) * Math.sin(ph); }
        hissAt(0.75 + beat * 0.5, 0.08, 0.05, 45);
      }
    } else if (signal === 'music') {
      // A simple band at 120 beats a minute: a bass note on every beat, a chord held over every
      // two beats, a hi-hat on every half beat.
      const bass = [55, 55, 82.41, 73.42], chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 207.65, 246.94]];
      for (let beat = 0; 0.5 + beat * 0.5 < seconds - 0.2; beat++) {
        const start = 0.5 + beat * 0.5, n0 = Math.floor(start * SR), f = bass[beat % 4];
        for (let i = 0; i < 0.42 * SR && n0 + i < N; i++) {
          const tt = i / SR, env = Math.min(1, i / 240) * Math.exp(-tt * 4) * Math.min(1, (0.42 * SR - i) / 480);
          x[n0 + i] += 0.3 * env * (Math.sin(6.283185307 * f * tt) + 0.5 * Math.sin(6.283185307 * 2 * f * tt) + 0.25 * Math.sin(6.283185307 * 3 * f * tt));
        }
        if (beat % 2 === 0) {
          const notes = chords[(beat / 2) % 4], n = Math.floor(0.92 * SR);
          for (let i = 0; i < n && n0 + i < N; i++) {
            const tt = i / SR, env = Math.min(1, i / 960) * Math.min(1, (n - i) / 2400) * (0.7 + 0.3 * Math.exp(-tt * 3));
            let s = 0;
            for (let q = 0; q < 3; q++) for (let h = 1; h <= 6; h++) s += Math.sin(6.283185307 * notes[q] * h * tt + q + h) / h;
            x[n0 + i] += 0.035 * env * s;
          }
        }
        hissAt(start, 0.06, 0.03, 45); hissAt(start + 0.25, 0.06, 0.03, 45);
      }
    } else if (signal === 'sweep') {
      // One tone rising from 60 Hz to 12 kHz, the same share of an octave every second.
      let ph = 0;
      for (let i = 0; i < N; i++) { const f = 60 * Math.pow(200, i / N); ph += 6.283185307 * f / SR; x[i] = 0.25 * Math.sin(ph); }
    }
    return x;
  }
  const S = window.__input = { signal, SR, N, make, analysers: [] };
  const realNow = performance.now.bind(performance);
  performance.now = () => (S.vclock != null ? S.vclock : realNow());
  navigator.mediaDevices.getUserMedia = async (c) => { (S.asked = S.asked || []).push(JSON.stringify(c)); return { getTracks: () => [{ stop() {}, onended: null }] }; };
  const realSetInterval = window.setInterval.bind(window);
  window.setInterval = (fn, ms, ...rest) => { if (ms === 33) { S.sampler = fn; return 987654; } return realSetInterval(fn, ms, ...rest); };
  window.AudioContext = class {
    constructor() {
      const off = new OfflineAudioContext(1, N, SR);
      const data = make(signal);
      let peak = 0, sq = 0; for (let i = 0; i < N; i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; sq += data[i] * data[i]; }
      S.stats = { peak, rms: Math.sqrt(sq / N) };
      const buf = off.createBuffer(1, N, SR); buf.copyToChannel(data, 0);
      const src = off.createBufferSource(); src.buffer = buf; src.start(0);
      this.off = off; this.src = src; this.state = 'running'; this.sampleRate = SR;
      S.ctx = this;
    }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createMediaStreamSource() { const src = this.src; return { connect(node) { src.connect(node); } }; }
    createAnalyser() { const a = this.off.createAnalyser(); S.analysers.push(a); return a; }
  };
  // A 64-point AnalyserNode on the same sound, with the sampler's smoothing: what the sampler
  // itself used before the bands. recordInPage({ ref: true }) reads it on every look.
  S.tap = () => { const a = S.ctx.off.createAnalyser(); a.fftSize = 64; a.smoothingTimeConstant = 0.7; S.ctx.src.connect(a); return a; };
}

// Runs in a page opened with signalInit. Returns { asked, stats, ticks }: one tick per look,
// { t, f, w, p, b, s } = the time, `frequencies`, `waveform`, `micPeak`, `micBands` and
// `slices` (null where the build publishes none). With { db: true } a tick also holds `db`,
// the spectrum analyser's own spectrum (the widest analyser with the sampler's smoothing of 0.7) in decibels (rounded to 0.01), for fitting. With
// { ref: true } a tick also holds `ref`, the byte spectrum of a 64-point AnalyserNode fed the
// same sound: the 32 values the sampler published as `frequencies` before the bands.
export async function recordInPage({ db, ref } = {}) {
  const S = window.__input, off = S.ctx.off, ticks = [];
  window.frame = function () {};
  const has = { b: typeof micBands !== 'undefined', s: typeof slices !== 'undefined' };
  let wide = null, dbBuf = null;
  if (db) { for (const a of S.analysers) if (Math.abs(a.smoothingTimeConstant - 0.7) < 1e-6 && (!wide || a.fftSize > wide.fftSize)) wide = a; dbBuf = new Float32Array(wide.frequencyBinCount); }
  const tap = ref ? S.tap() : null, refBuf = ref ? new Uint8Array(32) : null;
  const count = Math.floor((S.N / S.SR) / 0.033) - 1;
  for (let k = 1; k <= count; k++) {
    const frame = Math.ceil(k * 0.033 * S.SR / 128) * 128;
    if (frame >= S.N) break;
    off.suspend(frame / S.SR).then(() => {
      S.vclock = (frame / S.SR) * 1000;
      S.sampler();
      const tick = { t: frame / S.SR, f: Array.from(frequencies), w: Array.from(waveform), p: micPeak,
        b: has.b && micBands ? Object.assign({}, micBands) : null, s: has.s && slices ? Array.from(slices) : null };
      if (db) { wide.getFloatFrequencyData(dbBuf); tick.db = Array.from(dbBuf, (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : -999)); tick.fft = wide.fftSize; }
      if (ref) { tap.getByteFrequencyData(refBuf); tick.ref = Array.from(refBuf); }
      ticks.push(tick);
      off.resume();
    });
  }
  await off.startRendering();
  return { asked: S.asked, stats: S.stats, ticks };
}

// Runs in an overlay page (any build). Feeds `ticks` to the effect `name` and looks at the
// frames nearest `times` (seconds). Returns { frames: [{ light, lit, grid, png? }], size, ms }:
//   light  the mean of red + green + blue over the frame, 0 (black) to 1 (white), the canvas
//          laid over black
//   lit    the share of pixels brighter than 24 of 765
//   grid   the same mean for each cell of a coarse grid (cols × rows, row by row)
//   png    the frame as a data URL, when `pictures` is true
// With `watch` (names of fields of a kit scene's state, as its debug() reports them) it also
// returns `watched`: one row per frame drawn, those fields in that order (null for a field
// the scene does not report). With `mic: false` the mic is off and Idle animation on for the
// run, and `ticks` is not read.
// The page's own loop is stopped for the run and its sound is put back afterwards.
export function replayInPage({ name, ticks, times, fps = 60, cols = 8, rows = 4, pictures = false, watch = null, mic = true }) {
  const saved = { random: Math.random, pnow: performance.now, dnow: Date.now, frame: window.frame, idle: cfgIdleAnim };
  const hasBands = typeof micBands !== 'undefined', hasSlices = typeof slices !== 'undefined';
  const keep = { frequencies, waveform, micActive, micPeak, micBands: hasBands ? micBands : undefined, slices: hasSlices ? slices : undefined };
  const QUIET = { bass: 0, mid: 0, treble: 0, rms: 0, centroid: 0, level: 0, beat: false, beats: 0 };
  try {
    window.frame = function () {};
    let a = 20261123 >>> 0;
    Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    let now = 100000;
    performance.now = () => now; Date.now = () => 1700000000000 + now;
    micActive = false; frequencies = null; waveform = null; micPeak = null; if (hasBands) micBands = null; if (hasSlices) slices = null;
    setActiveViz(name === 'visualizer' ? 'waveform' : 'visualizer'); setActiveViz(name);
    const f = new Uint8Array(32), sl = new Uint8Array(32), w = new Uint8Array(64).fill(128), frames = [];
    const src = VIZ_USES_3D.has(name) ? canvas3d : canvas2d;
    const tmp = document.createElement('canvas'); tmp.width = src.width; tmp.height = src.height;
    const pen = tmp.getContext('2d', { willReadFrequently: true });
    const last = Math.max(...times), watched = watch ? [] : null;
    let at = -1, next = 0;
    if (!mic) cfgIdleAnim = true;
    const started = saved.pnow.call(performance);
    for (let k = 1; k <= Math.round(last * fps); k++) {
      const t = k / fps;
      now += 1000 / fps;
      while (at + 1 < ticks.length && ticks[at + 1].t <= t) at++;
      if (at >= 0) {
        const tk = ticks[at]; f.set(tk.f); w.set(tk.w); micPeak = tk.p;
        if (hasBands) micBands = tk.b; if (hasSlices) { if (tk.s) { sl.set(tk.s); slices = sl; } else slices = null; }
      } else { f.fill(0); sl.fill(0); w.fill(128); micPeak = 0; if (hasBands) micBands = QUIET; if (hasSlices) slices = sl; }
      frequencies = f; waveform = w; micActive = true;
      if (!mic) { micActive = false; frequencies = null; waveform = null; micPeak = null; if (hasBands) micBands = null; if (hasSlices) slices = null; }
      currentViz.draw(now, 1 / fps);
      if (watched) { const seen = (window.__timbre.scene && window.__timbre.scene.state) || {}; watched.push(watch.map((key) => (seen[key] === undefined ? null : seen[key]))); }
      if (next < times.length && Math.abs(t - times[next]) < 0.5 / fps) {
        if (tmp.width !== src.width || tmp.height !== src.height) { tmp.width = src.width; tmp.height = src.height; }
        pen.globalCompositeOperation = 'source-over'; pen.fillStyle = '#000'; pen.fillRect(0, 0, tmp.width, tmp.height); pen.drawImage(src, 0, 0);
        const W = tmp.width, H = tmp.height, d = pen.getImageData(0, 0, W, H).data;
        const sums = new Float64Array(cols * rows), counts = new Float64Array(cols * rows);
        let light = 0, lit = 0;
        for (let y = 0, p = 0; y < H; y++) {
          const row = Math.min(rows - 1, Math.floor(y * rows / H)) * cols;
          for (let x = 0; x < W; x++, p += 4) {
            const v = d[p] + d[p + 1] + d[p + 2], cell = row + Math.min(cols - 1, Math.floor(x * cols / W));
            light += v; if (v > 24) lit++; sums[cell] += v; counts[cell]++;
          }
        }
        const frame = { light: light / (W * H * 765), lit: lit / (W * H), grid: Array.from(sums, (v, i) => v / (counts[i] * 765)) };
        if (pictures) frame.png = tmp.toDataURL('image/png');
        frames.push(frame); next++;
      }
    }
    return { frames, watched, ms: saved.pnow.call(performance) - started, size: [src.width, src.height] };
  } finally {
    Math.random = saved.random; performance.now = saved.pnow; Date.now = saved.dnow; window.frame = saved.frame; cfgIdleAnim = saved.idle;
    frequencies = keep.frequencies; waveform = keep.waveform; micActive = keep.micActive; micPeak = keep.micPeak;
    if (hasBands) micBands = keep.micBands; if (hasSlices) slices = keep.slices;
  }
}
