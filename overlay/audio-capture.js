/* ─────────────────────────────────────────────────────────────────────────
   Timbre audio capture — the overlay captures its own microphone.

   The legacy toolkit streamed 30fps FFT frames from a ControlPanel browser
   tab over a WebSocket relay. Here each overlay page runs its own
   getUserMedia + AnalyserNode, so no audio data crosses any wire — only
   config does (via Streamer.bot). Loaded as a plain <script> AFTER core.js;
   it assigns the same script-scope `frequencies` / `waveform` / `micPeak` / `micActive`
   bindings the 52 factories already read, so the factories are untouched.

   Emits `timbre:mic` CustomEvents ({ state: 'listening'|'denied'|'acquiring' })
   that core.js turns into the status label. Exposes window.timbreCapture:
     setDevice(deviceId, label)  — switch mic (from config.mic pushes)
     start() / stop()
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const FFT_SIZE = 64;            // 32 frequency bins — what every factory expects
  const SMOOTHING = 0.7;
  const SAMPLE_MS = 33;           // ~30fps, same cadence as the legacy sender
  const RETRY_MS = 10000;         // re-attempt after denial / missing device

  // `micPeak` is declared in core.js. OBS can serve this file fresh beside a cached core.js from
  // before `micPeak` existed, and in strict mode writing an undeclared name throws: teardownStream()
  // would throw at the start of acquire(), before getUserMedia, and every effect would stay without a
  // mic. `typeof` does not throw on an undeclared name, so look once here, and without the binding
  // skip both writes to it and the analyser that feeds it.
  const HAS_PEAK = typeof micPeak !== 'undefined';

  let audioCtx = null;
  let analyser = null;
  let peakAnalyser = null;        // second analyser: a window covering at least two sample intervals
  let peakBuf = null;
  let stream = null;
  let sampleTimer = null;
  let retryTimer = null;
  let wantDeviceId = '';
  let wantLabel = '';
  let running = false;

  const freqBuf = new Uint8Array(FFT_SIZE / 2);
  const waveBuf = new Uint8Array(FFT_SIZE);

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
    micActive = false;
    frequencies = null;
    waveform = null;
    if (HAS_PEAK) micPeak = null;
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
    teardownStream();
    emit('acquiring');
    try {
      stream = await navigator.mediaDevices.getUserMedia(await buildConstraints());
      audioCtx = new AudioContext();
      // Autoplay policy can start the context 'suspended' when there was no user
      // gesture (OBS Browser Sources never have one). Resume explicitly, and keep
      // nudging from the sample loop until it sticks.
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING;
      source.connect(analyser);

      // The first analyser only ever sees 64 samples per tick (~4% of the sound), so a
      // short thump can fall between two looks. This one spans at least two intervals:
      // the smallest power of two >= 2 * sampleRate * SAMPLE_MS / 1000, within 256..32768
      // (4096 at 48 kHz). Each moment then shows in at least two readings in a row, so a
      // tick that comes late still sees everything since the one before.
      if (HAS_PEAK) {
        const wanted = 2 * audioCtx.sampleRate * SAMPLE_MS / 1000;
        let peakSize = 256;
        while (peakSize < wanted && peakSize < 32768) peakSize *= 2;
        peakAnalyser = audioCtx.createAnalyser();
        peakAnalyser.fftSize = peakSize;
        source.connect(peakAnalyser);
        peakBuf = new Uint8Array(peakAnalyser.fftSize);
      }

      // If the device disappears mid-stream (unplugged USB mic), re-acquire.
      stream.getTracks().forEach((t) => { t.onended = () => { if (running) acquire(); }; });

      sampleTimer = setInterval(() => {
        if (!analyser) return;
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        analyser.getByteFrequencyData(freqBuf);
        analyser.getByteTimeDomainData(waveBuf);
        frequencies = freqBuf;
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
        micActive = true;
      }, SAMPLE_MS);
      emit('listening');
    } catch (err) {
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
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      teardownStream();
      emit('denied');
    },
  };
})();
