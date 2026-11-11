// Timbre — scene kit. Pure arithmetic shared by the 3D scene effects: the sound
// envelope, camera fit, afterglow decay, internal render scale and placement.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreScene`), like shared/viz-config.js, so verify.mjs can import
// it under Node. Nothing here may touch document, window, THREE or core.js
// globals at load time; the WebGL runtime added later lives inside functions.

(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  // Frame-rate independent follow / decay: results agree at any fps.
  const follow = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  const fall = (cur, rate, dt) => cur * Math.exp(-rate * dt);

  const BEAT_GAP_MS = 220;

  // Smoothed views of the mic level, plus a beat detector. step() returns
  // { level, flame, slow, kick, burst, beat }; beat is true on the firing step
  // only, and kick is exactly 1 on that step (decay resumes on the next).
  function createEnvelope() {
    let flame = 0, slow = 0, avg = 0, kick = 0, burst = 0, seeded = false;
    let lastBeatMs = -Infinity;
    return {
      step(level, nowMs, dt, micOn) {
        level = clamp01(Number.isFinite(level) ? level : 0);
        dt = Number.isFinite(dt) && dt > 0 ? dt : 0;
        flame = follow(flame, level, level > flame ? 30 : 3, dt);
        slow = follow(slow, level, 0.8, dt);
        kick = fall(kick, 5, dt);
        burst = fall(burst, 0.45, dt);
        // Start the average at the first reading so a steady level is not a jump.
        if (!seeded) { avg = level; seeded = true; }
        let beat = false;
        if (micOn && level > avg * 1.35 + 0.07 && nowMs - lastBeatMs >= BEAT_GAP_MS) {
          beat = true;
          lastBeatMs = nowMs;
          kick = 1;
          burst = Math.min(1, burst + 0.3);
        }
        avg = follow(avg, level, 2, dt);
        return { level, flame, slow, kick, burst, beat };
      },
    };
  }

  // Camera distance at which a frameW x frameH rectangle fits a view of the
  // given vertical fov (degrees) and aspect ratio.
  function fitDistance(frameW, frameH, fovDeg, aspect) {
    return Math.max(frameH / 2, frameW / 2 / aspect) / Math.tan((fovDeg * Math.PI) / 360);
  }

  // Trail veil (0..100) to afterglow seconds: 100 -> 0.35, 0 -> 1.5.
  function afterglowTime(trailVeilPct) {
    const t = trailVeilPct / 100;
    return 1.5 * (1 - t) + 0.35 * t;
  }

  // Per-channel survival fraction of the afterglow over dt seconds; green and
  // blue cool faster than red, so fading light shifts warm.
  function decay(dt, T) {
    const r = Math.exp(-dt / T);
    return [r, r * Math.exp(-dt / 0.098), r * Math.exp(-dt / 0.035)];
  }

  // Smallest whole multiplier n >= 1 with canvasHeight * n >= 520.
  function renderScale(canvasHeight) {
    return Math.max(1, Math.ceil(520 / canvasHeight));
  }

  // Placement knobs (percent) to a camera view offset in canvas pixels plus zoom.
  function viewOffset(placement, w, h) {
    return {
      x: -(placement.x / 100) * w / 2,
      y: (placement.y / 100) * h / 2,
      zoom: placement.size / 100,
    };
  }

  globalThis.TimbreScene = { createEnvelope, fitDistance, afterglowTime, decay, renderScale, viewOffset };
})();
