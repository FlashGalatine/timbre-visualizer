/* ─────────────────────────────────────────────────────────────────────────
   Timbre audio capture — the overlay captures its own microphone.

   The legacy toolkit streamed 30fps FFT frames from a ControlPanel browser
   tab over a WebSocket relay. Here each overlay page runs its own
   getUserMedia + AnalyserNode, so no audio data crosses any wire — only
   config does (via Streamer.bot). Loaded as a plain <script> AFTER core.js;
   it assigns the script-scope `frequencies` / `slices` / `waveform` / `micPeak` /
   `micBands` / `micActive` bindings the effect factories read.

   What it publishes, about 30 times a second:
     frequencies  32 bands, 0-255, log-spaced from 60 Hz to 12 kHz (folded from a
                  2048-point analysis; see fold() below)
     slices       what `frequencies` was before the bands: 32 values 750 Hz apart (at
                  48 kHz), 0-255, from a look at the newest 64 samples (see sliceLook()
                  below). For the effects tuned on those values and for nothing new.
     waveform     the newest 64 input samples, 0-255 (128 is silence)
     micPeak      the loudest input sample over at least the last two looks, 0-1
     micBands     { bass, mid, treble, rms, centroid, level, beat, beats }: the
                  same sound summed up once, for every effect (see summarize())

   Emits `timbre:mic` CustomEvents ({ state: 'listening'|'denied'|'acquiring' })
   that core.js turns into the status label. Exposes window.timbreCapture:
     setDevice(deviceId, label)  — switch mic (from config.mic pushes)
     start() / stop()
     analysis                    — the arithmetic by itself (no microphone), for the checks
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const FFT_SIZE = 2048;          // the analysis at 44.1 and 48 kHz: 1024 bins, 23.4 Hz apart at 48 kHz
  const BIN_HZ = 48000 / FFT_SIZE; // the bin width the analysis keeps near, whatever the sample rate
  const BANDS = 32;               // what is published — what every factory expects
  const WAVE_SIZE = 64;           // what is published — what every factory expects
  const BAND_LOW_HZ = 60;         // the bottom edge of band 0
  const BAND_HIGH_HZ = 12000;     // the top edge of band 31
  const SMOOTHING = 0.7;
  const SAMPLE_MS = 33;           // ~30fps, same cadence as the legacy sender
  const RETRY_MS = 10000;         // re-attempt after denial / missing device
  // A band's level in decibels becomes 0-255 over the same range the browser's own byte
  // spectrum uses (-100 dB is 0, -30 dB is 255).
  const MIN_DB = -100;
  const MAX_DB = -30;
  // Added to every band, in decibels. A bin of the 2048-point analysis is 32 times narrower
  // than a bin of the 64-point analysis this replaced, so a sound spread over many bins (a
  // breath, an "s", a hi-hat, room noise) reads 10·log10(32) = 15 dB lower in each of them,
  // while a single tone reads the same. See the note on BAND_LIFT_DB in docs/EFFECTS.md.
  const BAND_LIFT_DB = 15;
  // The three wide bands, as band numbers (first, one past the last).
  const BASS = [0, 9];            // 60 Hz to 266 Hz: a voice's pitch, a kick drum
  const MID = [9, 25];            // 266 Hz to 3.76 kHz: vowels, most of a voice
  const TREBLE = [25, 32];        // 3.76 kHz to 12 kHz: "s" and "t", cymbals
  // The beat: the level jumps this far above its own recent average. The numbers are the
  // scene kit's, which found its beats this way from every frame before the sampler did.
  const BEAT_RATIO = 1.35;
  const BEAT_FLOOR = 0.07;
  const BEAT_GAP_MS = 220;
  const BEAT_AVG_RATE = 2;        // per second

  // The slices: the look the sampler took before the bands. A 64-sample analysis has 32 values.
  const SLICE_SIZE = 64;
  const SLICES = SLICE_SIZE / 2;

  // `micPeak` is declared in core.js. OBS can serve this file fresh beside a cached core.js from
  // before `micPeak` existed, and in strict mode writing an undeclared name throws: teardownStream()
  // would throw at the start of acquire(), before getUserMedia, and every effect would stay without a
  // mic. `typeof` does not throw on an undeclared name, so look once here, and without the binding
  // skip both writes to it and the analyser that feeds it. The same goes for `micBands` and `slices`.
  const HAS_PEAK = typeof micPeak !== 'undefined';
  const HAS_BANDS = typeof micBands !== 'undefined';
  const HAS_SLICES = typeof slices !== 'undefined';

  // ── The arithmetic (pure: no microphone, no page) ──────────────────────────

  // The 33 edges of the 32 bands, in Hz: edge k is 60 · 200^(k / 32), so each band is the
  // same musical width (about a quarter of an octave) and the last edge is 12 kHz.
  function bandEdges() {
    const edges = new Float64Array(BANDS + 1);
    for (let k = 0; k <= BANDS; k++) edges[k] = BAND_LOW_HZ * Math.pow(BAND_HIGH_HZ / BAND_LOW_HZ, k / BANDS);
    return edges;
  }

  // How many points the analysis has at a sample rate: 2048 at 44.1 and 48 kHz, and twice as
  // many for each doubling of the rate (4096 at 96 kHz, 8192 at 192 kHz; 1024 at 24 kHz), so
  // that a bin stays about 23 Hz wide and a look about 43 ms long on any device. A band's value
  // depends on both: with 2048 points at 96 kHz every band of a breath would read 3 dB higher.
  function analysisSize(sampleRate) {
    let size = FFT_SIZE;
    if (!(sampleRate > 0)) return size;
    while (size < 32768 && sampleRate / size > BIN_HZ * 1.5) size *= 2;
    while (size > 256 && sampleRate / size < BIN_HZ / 1.5) size /= 2;
    return size;
  }

  // Which bins of an analysis make each band, and how much of each. Bin i stands for the
  // stretch of spectrum from (i - 0.5) to (i + 0.5) bin widths; its weight in a band is the
  // length of that stretch inside the band's edges, in Hz. A band narrower than a bin (the
  // lowest five at 48 kHz) therefore still has the one or two bins it lies in. A band wholly
  // above half the sample rate has no bins and reads 0.
  function foldPlan(sampleRate, fftSize) {
    const width = sampleRate / fftSize, bins = fftSize / 2, edges = bandEdges();
    const first = new Int32Array(BANDS), count = new Int32Array(BANDS), start = new Int32Array(BANDS), total = new Float64Array(BANDS);
    const weights = [];
    let low = bins, high = -1;
    for (let b = 0; b < BANDS; b++) {
      const lo = edges[b], hi = edges[b + 1];
      const i0 = Math.max(0, Math.floor(lo / width + 0.5)), i1 = Math.min(bins - 1, Math.floor(hi / width + 0.5));
      first[b] = i0; start[b] = weights.length;
      for (let i = i0; i <= i1; i++) {
        const w = Math.max(0, Math.min(hi, (i + 0.5) * width) - Math.max(lo, (i - 0.5) * width));
        weights.push(w); total[b] += w; count[b]++;
        if (w > 0) { if (i < low) low = i; if (i > high) high = i; }
      }
    }
    return { sampleRate, fftSize, width, bins, edges, first, count, start, total, weights: Float64Array.from(weights),
      low: high < 0 ? 0 : low, high, power: new Float64Array(bins) };
  }

  // Fold a spectrum into the 32 bands. `db` holds one level per bin in decibels (what
  // AnalyserNode.getFloatFrequencyData gives: 20·log10 of the smoothed magnitude; silence is
  // -Infinity). A band's value is the MEAN power of its bins, each by its weight, back in
  // decibels, plus BAND_LIFT_DB, on the 0-255 scale. The mean and not the sum: a band of 85
  // bins and a band of one bin read the same when every bin is at the same level, so the wide
  // bands at the top are not louder for being wide. Written into `out` (32 values), returned.
  function fold(db, plan, out) {
    const power = plan.power;
    for (let i = plan.low; i <= plan.high; i++) {
      const v = db[i];
      power[i] = v > -400 ? Math.exp(v * 0.23025850929940458) : 0;   // 10^(v / 10); -Infinity and NaN are 0
    }
    for (let b = 0; b < BANDS; b++) {
      let sum = 0;
      for (let j = 0, i = plan.first[b], at = plan.start[b]; j < plan.count[b]; j++) sum += plan.weights[at + j] * power[i + j];
      let value = 0;
      if (sum > 0 && plan.total[b] > 0) {
        const level = 10 * Math.log10(sum / plan.total[b]) + BAND_LIFT_DB;
        value = (255 * (level - MIN_DB)) / (MAX_DB - MIN_DB);
      }
      out[b] = value >= 255 ? 255 : value > 0 ? Math.floor(value) : 0;
    }
    return out;
  }

  const meanOf = (bands, range) => {
    let sum = 0;
    for (let b = range[0]; b < range[1]; b++) sum += bands[b];
    return sum / ((range[1] - range[0]) * 255);
  };

  // Sum the sound up once. `bands` are the 32 folded values, `samples` the input itself
  // (-1 to 1) and `look` the 32 slices of the same moment (sliceLook() below). Written into
  // `into`, all before Gain:
  //   bass, mid, treble  the mean of the bands of each stretch, 0 to 1
  //   rms                the root mean square of the samples, 0 to 1 (a full-scale sine is 0.707)
  //   centroid           where the weight of the 32 bands lies, 0 (all in band 0) to 1 (all in
  //                      band 31); 60 · 200^centroid is roughly its frequency in Hz. 0 in silence.
  //   level              one loudness, 0 to 3: the larger of 3 × the root mean square of the
  //                      newest 64 samples and 1.1 × the mean of slices 0 to 5 (the sound up to
  //                      about 4.5 kHz). It is what the scene kit hands a scene as its level,
  //                      and it is made the way the kit made its own before the sampler did
  //                      (from `waveform` and the six lowest 750 Hz values), so the kit's
  //                      scenes and their beats are where they were.
  function summarize(bands, samples, into, look) {
    let sq = 0, recent = 0;
    const newest = Math.max(0, samples.length - WAVE_SIZE);
    for (let i = 0; i < samples.length; i++) {
      sq += samples[i] * samples[i];
      // The newest 64 as the published `waveform` holds them (whole steps of 1/128): the kit read those.
      if (i >= newest) { const step = Math.max(-128, Math.min(127, Math.floor(samples[i] * 128))) / 128; recent += step * step; }
    }
    const rms = samples.length ? Math.sqrt(sq / samples.length) : 0;
    let low = 0;
    if (look) for (let k = 0; k < 6; k++) low += look[k];
    let weight = 0, moment = 0;
    for (let b = 0; b < BANDS; b++) { weight += bands[b]; moment += bands[b] * b; }
    into.bass = meanOf(bands, BASS);
    into.mid = meanOf(bands, MID);
    into.treble = meanOf(bands, TREBLE);
    into.rms = rms > 1 ? 1 : rms;
    into.centroid = weight > 0 ? moment / (weight * (BANDS - 1)) : 0;
    into.level = Math.max(samples.length ? Math.sqrt(recent / (samples.length - newest)) * 3 : 0, (low / (6 * 255)) * 1.1);
    return into;
  }

  // The beat detector: step(level, nowMs) is true on the look where the level (0 to 1, after
  // Gain) jumps above 1.35 × its recent average + 0.07, and at most once every 220 ms.
  function createBeat() {
    let avg = 0, seeded = false, lastMs = -Infinity, lastStepMs = null;
    return {
      step(level, nowMs) {
        level = Number.isFinite(level) ? (level < 0 ? 0 : level > 1 ? 1 : level) : 0;
        const dt = lastStepMs === null ? 0 : Math.min(0.25, Math.max(0, (nowMs - lastStepMs) / 1000));
        lastStepMs = nowMs;
        // Start the average at the first reading so a steady level is not a jump.
        if (!seeded) { avg = level; seeded = true; }
        let beat = false;
        if (level > avg * BEAT_RATIO + BEAT_FLOOR && nowMs - lastMs >= BEAT_GAP_MS) { beat = true; lastMs = nowMs; }
        avg += (level - avg) * (1 - Math.exp(-BEAT_AVG_RATE * dt));
        return beat;
      },
    };
  }

  // ── The slices ──
  // Before the bands the sampler asked a 64-point AnalyserNode for its byte spectrum, and
  // effects were tuned on those 32 values: value k is the sound around 750 · k Hz (at 48 kHz;
  // sample rate / 64 apart at any rate), about 750 Hz to either side, seen in a look of
  // 64 samples (1.3 ms). The slices are those values, worked out here from the newest 64
  // samples of the one analysis the sampler has now, by the node's own arithmetic: a Blackman
  // window, a 64-point transform, each magnitude divided by 64, smoothed over time (0.7 of the
  // look before plus 0.3 of this one), and its decibels put on the 0-255 scale (-100 dB is 0,
  // -30 dB is 255). Fed the same sound they read what the old sampler's `frequencies` read
  // (tools/compare-input.mjs measures it). The plan holds the window, the transform's table
  // and `held`, the smoothed magnitudes: one plan per microphone session.
  function slicePlan() {
    const window = new Float64Array(SLICE_SIZE), cos = new Float64Array(SLICE_SIZE), sin = new Float64Array(SLICE_SIZE);
    for (let n = 0; n < SLICE_SIZE; n++) {
      const x = n / SLICE_SIZE;
      window[n] = 0.42 - 0.5 * Math.cos(2 * Math.PI * x) + 0.08 * Math.cos(4 * Math.PI * x);
      cos[n] = Math.cos(2 * Math.PI * x);
      sin[n] = Math.sin(2 * Math.PI * x);
    }
    return { window, cos, sin, held: new Float64Array(SLICES), look: new Float64Array(SLICE_SIZE) };
  }

  // One look: the newest 64 of `samples` (-1 to 1) into `out` (32 values, 0-255), returned.
  // Fewer than 64 samples, and samples that are no number, read as silence.
  function sliceLook(samples, plan, out) {
    const look = plan.look, from = samples.length - SLICE_SIZE;
    for (let n = 0; n < SLICE_SIZE; n++) {
      const v = from >= 0 ? samples[from + n] : 0;
      look[n] = Number.isFinite(v) ? v * plan.window[n] : 0;
    }
    for (let k = 0; k < SLICES; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < SLICE_SIZE; n++) {
        const at = (k * n) % SLICE_SIZE;
        re += look[n] * plan.cos[at];
        im -= look[n] * plan.sin[at];
      }
      const held = plan.held[k] = SMOOTHING * plan.held[k] + (1 - SMOOTHING) * Math.sqrt(re * re + im * im) / SLICE_SIZE;
      const value = held > 0 ? (255 * (20 * Math.log10(held) - MIN_DB)) / (MAX_DB - MIN_DB) : 0;
      out[k] = value >= 255 ? 255 : value > 0 ? Math.floor(value) : 0;
    }
    return out;
  }

  const clockMs = () => (typeof performance !== 'undefined' && performance && typeof performance.now === 'function' ? performance.now() : Date.now());

  // ── The capture ────────────────────────────────────────────────────────────

  let audioCtx = null;
  let analyser = null;
  let peakAnalyser = null;        // second analyser: a window covering at least two sample intervals
  let peakBuf = null;
  let plan = null;                // the fold for this context's sample rate
  let dbBuf = null;               // one level per bin, in decibels
  let timeBuf = null;             // the samples of one look, -1 to 1
  let waveAll = null;             // the same as bytes; its newest 64 are what is published
  let waveBuf = null;
  let bands = null;               // this session's micBands object
  let slicing = null;             // this session's slice plan (it holds the smoothing)
  let beat = null;
  let stream = null;
  let sampleTimer = null;
  let retryTimer = null;
  let wantDeviceId = '';
  let wantLabel = '';
  let running = false;
  // One microphone request at a time (TIM-14). Every acquire() takes the next number, and so
  // does stop(); a request whose number is no longer `gen` was overtaken while it waited (by a
  // later start(), setDevice(), retry or stop()). An overtaken request owns nothing: it stops
  // the stream it was handed and builds no context, analyser or timer, and when it fails it
  // neither tears down the session in force nor arms a retry.
  let gen = 0;

  const freqBuf = new Uint8Array(BANDS);
  const sliceBuf = new Uint8Array(SLICES);

  function emit(state) {
    window.dispatchEvent(new CustomEvent('timbre:mic', { detail: { state } }));
  }

  function teardownStream() {
    if (sampleTimer) { clearInterval(sampleTimer); sampleTimer = null; }
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    analyser = null;
    peakAnalyser = null;
    peakBuf = null;
    plan = null;
    dbBuf = null;
    timeBuf = null;
    waveAll = null;
    waveBuf = null;
    bands = null;
    slicing = null;
    beat = null;
    micActive = false;
    frequencies = null;
    waveform = null;
    if (HAS_PEAK) micPeak = null;
    if (HAS_BANDS) micBands = null;
    if (HAS_SLICES) slices = null;
  }

  // Build getUserMedia constraints for the configured device. `ideal` (not
  // `exact`) so a stale/foreign deviceId still falls back to the default mic
  // instead of throwing OverconstrainedError.
  async function buildConstraints() {
    if (!wantDeviceId && !wantLabel) return { audio: true };
    let deviceId = wantDeviceId;
    // deviceIds are origin/profile-scoped and churn; if we also know the
    // human label, re-match it against the current device list.
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === 'audioinput');
      const byId = inputs.find((d) => d.deviceId === wantDeviceId);
      if (!byId && wantLabel) {
        const byLabel = inputs.find((d) => d.label && d.label === wantLabel);
        if (byLabel) deviceId = byLabel.deviceId;
      }
    } catch { /* enumerateDevices unavailable — just try what we have */ }
    return deviceId ? { audio: { deviceId: { ideal: deviceId } } } : { audio: true };
  }

  async function acquire() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (!running) return;
    const my = ++gen;
    teardownStream();
    emit('acquiring');
    try {
      const constraints = await buildConstraints();
      if (my !== gen) return;     // overtaken before the microphone was asked for
      const got = await navigator.mediaDevices.getUserMedia(constraints);
      if (my !== gen) {           // overtaken while waiting: give the microphone back, build nothing
        got.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = got;
      audioCtx = new AudioContext();
      // Autoplay policy can start the context 'suspended' when there was no user
      // gesture (OBS Browser Sources never have one). Resume explicitly, and keep
      // nudging from the sample loop until it sticks.
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      const source = audioCtx.createMediaStreamSource(stream);
      // The spectrum and the waveform: 2048 samples at 48 kHz (43 ms), so each look overlaps
      // the one before it. The analyser smooths each bin over time (0.7 a look, as it always
      // has); the sampler folds the bins into the 32 bands and publishes the newest 64 samples.
      const size = analysisSize(audioCtx.sampleRate);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = size;
      analyser.smoothingTimeConstant = SMOOTHING;
      source.connect(analyser);
      plan = foldPlan(audioCtx.sampleRate, size);
      dbBuf = new Float32Array(size / 2);
      timeBuf = new Float32Array(size);
      waveAll = new Uint8Array(size);
      waveBuf = waveAll.subarray(size - WAVE_SIZE);   // the newest 64 samples
      bands = { bass: 0, mid: 0, treble: 0, rms: 0, centroid: 0, level: 0, beat: false, beats: 0 };
      beat = createBeat();
      slicing = slicePlan();

      // A short thump can be over before two looks have passed. This one spans at least two
      // intervals: the smallest power of two >= 2 * sampleRate * SAMPLE_MS / 1000, within
      // 256..32768 (4096 at 48 kHz). Each moment then shows in at least two readings in a row,
      // so a tick that comes late still sees everything since the one before.
      if (HAS_PEAK) {
        const wanted = 2 * audioCtx.sampleRate * SAMPLE_MS / 1000;
        let peakSize = 256;
        while (peakSize < wanted && peakSize < 32768) peakSize *= 2;
        peakAnalyser = audioCtx.createAnalyser();
        peakAnalyser.fftSize = peakSize;
        source.connect(peakAnalyser);
        peakBuf = new Uint8Array(peakAnalyser.fftSize);
      }

      // If the device disappears mid-stream (unplugged USB mic), re-acquire. Only the track of
      // the session in force may do that: an older session's track ending changes nothing.
      stream.getTracks().forEach((t) => { t.onended = () => { if (running && my === gen) acquire(); }; });

      sampleTimer = setInterval(() => {
        if (!analyser) return;
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        analyser.getFloatFrequencyData(dbBuf);
        analyser.getByteTimeDomainData(waveAll);
        frequencies = fold(dbBuf, plan, freqBuf);
        waveform = waveBuf;
        if (HAS_PEAK && peakAnalyser) {
          peakAnalyser.getByteTimeDomainData(peakBuf);
          let hi = 0;
          for (let i = 0; i < peakBuf.length; i++) {
            const d = Math.abs(peakBuf[i] - 128);
            if (d > hi) hi = d;
          }
          micPeak = Math.min(1, hi / 127);
        }
        if (HAS_BANDS || HAS_SLICES) {
          analyser.getFloatTimeDomainData(timeBuf);
          sliceLook(timeBuf, slicing, sliceBuf);
        }
        if (HAS_SLICES) slices = sliceBuf;
        if (HAS_BANDS) {
          summarize(freqBuf, timeBuf, bands, sliceBuf);
          // The beat is found on the level after Gain, as the scene kit found it: Gain is how
          // the streamer says how loud their microphone is.
          const gain = typeof cfgGain === 'number' ? cfgGain : 1;
          bands.beat = beat.step(bands.level * gain, clockMs());
          if (bands.beat) bands.beats++;
          micBands = bands;
        }
        micActive = true;
      }, SAMPLE_MS);
      emit('listening');
    } catch (err) {
      // An overtaken request that failed: the session (or the newer request) is not its to touch.
      if (my !== gen) return;
      teardownStream();
      emit('denied');
      console.warn('[timbre-capture] getUserMedia failed:', err && err.name, err && err.message);
      retryTimer = setTimeout(acquire, RETRY_MS);
    }
  }

  window.timbreCapture = {
    setDevice(deviceId, label) {
      const id = typeof deviceId === 'string' ? deviceId : '';
      const lb = typeof label === 'string' ? label : '';
      if (id === wantDeviceId && lb === wantLabel) return;
      wantDeviceId = id;
      wantLabel = lb;
      if (running) acquire();
    },
    start() { if (!running) { running = true; acquire(); } },
    stop() {
      running = false;
      gen++;                      // a request still waiting is overtaken: it will stop what it gets
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      teardownStream();
      emit('denied');
    },
    analysis: { FFT_SIZE, BANDS, WAVE_SIZE, BAND_LOW_HZ, BAND_HIGH_HZ, BAND_LIFT_DB, MIN_DB, MAX_DB, BASS, MID, TREBLE, SLICES, SLICE_SIZE, bandEdges, analysisSize, foldPlan, fold, summarize, createBeat, slicePlan, sliceLook },
  };
})();
