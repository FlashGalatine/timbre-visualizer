// Timbre — scene kit, shared by the 3D scene effects. First the pure arithmetic
// (sound envelope, voice history, camera fit, afterglow decay, internal render
// scale, placement), then the WebGL runtime a scene is written against: create(def).
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreScene`), like shared/viz-config.js, so verify.mjs can import
// it under Node. Nothing here may touch document, window, THREE or core.js
// globals at load time; the WebGL runtime lives inside functions.

(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  // Frame-rate independent follow / decay: results agree at any fps.
  const follow = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  const fall = (cur, rate, dt) => cur * Math.exp(-rate * dt);

  // ── Time for a shader ───────────────────────────────────────────────────────
  // A scene keeps time as a JavaScript number, which holds seconds to well under a
  // microsecond for years. A shader's float has 32 bits: handed seconds that only grow, it
  // steps 4 ms at a time after 9 hours and 16 ms (a whole frame at 60 fps) after 36, and what
  // it moves begins to judder. So a shader is handed a phase instead: the seconds wrapped at
  // a period after which everything the shader makes of them has come round to where it
  // began. sin(rate * t) comes round every 2π / rate seconds; several together come round at
  // the first time that is a whole number of turns for each (rates of 1.7, 1 and 1.3: 20π).

  // seconds wrapped into 0 <= phase < period. Below one period it is the seconds themselves,
  // to the bit. Seconds or a period that are no number give 0.
  function phase(seconds, period) {
    if (!(period > 0) || !Number.isFinite(seconds)) return 0;
    const p = seconds - Math.floor(seconds / period) * period;
    return p >= 0 && p < period ? p : 0;
  }

  // For what never comes round (a noise): how far the wrap ahead is into its dissolve. 0
  // until `lead` seconds before the phase wraps, then a smooth rise to 1 at the wrap, and 0
  // again after it. The shader draws such a term a second time at (phase - period), which is
  // where the next period starts, and mixes the two by this, so the picture crosses the wrap
  // without a jump.
  function dissolve(seconds, period, lead) {
    if (!(lead > 0) || !(period > 0) || !Number.isFinite(seconds)) return 0;
    const x = clamp01((phase(seconds, period) - (period - lead)) / lead);
    return x * x * (3 - 2 * x);
  }

  // A scene's own clock: seconds that pass only when the scene says so (while it is live,
  // say). step(dt) adds a frame and returns the seconds; phase(period, rate) is the phase of
  // seconds * rate (rate 1 when left out), for a shader.
  function createClock() {
    let seconds = typeof api.testClock === 'number' ? api.testClock : 0;
    return {
      get seconds() { return seconds; },
      step(dt) { if (Number.isFinite(dt) && dt > 0) seconds += dt; return seconds; },
      phase(period, rate) { return phase(seconds * (rate === undefined ? 1 : rate), period); },
    };
  }

  const BEAT_GAP_MS = 220;

  // Smoothed views of the mic level, plus a beat detector. step() returns
  // { level, flame, slow, kick, burst, beat }; beat is true on the firing step
  // only, and kick is exactly 1 on that step (decay resumes on the next).
  // `heardBeats` is the sampler's count of beats (micBands.beats) when it publishes one. The
  // sampler looks for the beat once per audio sample, with the same rule as below, so with a
  // count the envelope finds none itself: a beat is a count that moved since the last step.
  // (The first count seen is only noted: beats from before the scene started are not its.)
  // Without a count (a test level, or an audio-capture.js from before it published any) the
  // envelope finds the beat from the level as it always did.
  function createEnvelope() {
    let flame = 0, slow = 0, avg = 0, kick = 0, burst = 0, seeded = false;
    let lastBeatMs = -Infinity, seenBeats = null;
    return {
      step(level, nowMs, dt, micOn, heardBeats) {
        level = clamp01(Number.isFinite(level) ? level : 0);
        dt = Number.isFinite(dt) && dt > 0 ? dt : 0;
        flame = follow(flame, level, level > flame ? 30 : 3, dt);
        slow = follow(slow, level, 0.8, dt);
        kick = fall(kick, 5, dt);
        burst = fall(burst, 0.45, dt);
        // Start the average at the first reading so a steady level is not a jump.
        if (!seeded) { avg = level; seeded = true; }
        let beat = false;
        const counted = typeof heardBeats === 'number';
        const found = counted
          ? seenBeats !== null && heardBeats !== seenBeats
          : level > avg * 1.35 + 0.07 && nowMs - lastBeatMs >= BEAT_GAP_MS;
        seenBeats = counted ? heardBeats : null;
        if (micOn && found) {
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

  // A memory of a level: `size` samples, `hz` of them a second. byAge[0] is the level now
  // and byAge[i] the level i samples ago, read between the stored samples so that it glides
  // instead of stepping; heard(seconds) reads it at any age, held at both ends. A sample that
  // falls inside a frame holds the level at its own moment, between the last frame's level
  // and this one's, so a long frame does not write the same value twice. A frame longer than
  // the whole history keeps the newest of it.
  function createHistory(size, hz) {
    size = Number.isFinite(size) && size >= 2 ? Math.floor(size) : 16;
    hz = Number.isFinite(hz) && hz > 0 ? hz : 16;
    const ring = new Float32Array(size), byAge = new Float32Array(size);
    let ringAt = 0, since = 0, last = 0;
    const past = (j) => ring[(ringAt - Math.min(j, size - 1) + size * 2) % size];
    return {
      byAge,
      step(level, dt) {
        level = clamp01(Number.isFinite(level) ? level : 0);
        dt = Number.isFinite(dt) && dt > 0 ? dt : 0;
        since += dt;
        const beyond = Math.floor(since * hz) - size;   // whole samples older than the history holds
        if (beyond > 0) since -= beyond / hz;
        while (since >= 1 / hz) {
          since -= 1 / hz;
          const w = dt > 0 ? clamp01(1 - since / dt) : 1;
          ringAt = (ringAt + 1) % size;
          ring[ringAt] = last + (level - last) * w;
        }
        last = level;
        const frac = since * hz;
        for (let i = 0; i < size; i++) {
          const a = i - frac;
          if (a <= 0) { const w = frac > 1e-6 ? -a / frac : 1; byAge[i] = ring[ringAt] * (1 - w) + level * w; continue; }
          const j = Math.floor(a), f = a - j;
          byAge[i] = past(j) * (1 - f) + past(j + 1) * f;
        }
      },
      heard(seconds) {
        const a = Number.isFinite(seconds) ? Math.max(0, Math.min(size - 1, seconds * hz)) : 0;
        const j = Math.min(size - 2, Math.floor(a)), f = a - j;
        return byAge[j] * (1 - f) + byAge[j + 1] * f;
      },
    };
  }

  // Camera distance at which a frameW x frameH rectangle fits a view of the
  // given vertical fov (degrees) and aspect ratio.
  function fitDistance(frameW, frameH, fovDeg, aspect) {
    return Math.max(frameH / 2, frameW / 2 / aspect) / Math.tan((fovDeg * Math.PI) / 360);
  }

  // ── Turning what a scene shows ──────────────────────────────────────────────
  // Some scenes have three Rotate settings that turn the thing they show (not the camera).
  // These are the arithmetic of that, shared so that every such scene turns the same way.

  // A point (x, y, z; y is up) turned by three angles in degrees, into out. It spins about
  // its own upright axis first (y), then rolls to one side (about z, the axis from back to
  // front), then tilts its top toward the viewer (about x, the axis from left to right).
  // three.js calls this order 'XZY'; a scene gives it to the group it turns.
  const DEG = Math.PI / 180;
  function turn(out, x, y, z, rx, ry, rz) {
    const ca = Math.cos(rx * DEG), sa = Math.sin(rx * DEG), cb = Math.cos(ry * DEG), sb = Math.sin(ry * DEG), cc = Math.cos(rz * DEG), sc = Math.sin(rz * DEG);
    const x1 = x * cb + z * sb, z1 = -x * sb + z * cb;
    const x2 = x1 * cc - y * sc, y2 = x1 * sc + y * cc;
    out[0] = x2; out[1] = y2 * ca - z1 * sa; out[2] = y2 * sa + z1 * ca;
    return out;
  }

  // How a turned box lies on the picture: how far its eight corners reach from the middle of
  // the frame, as [lowest, highest, leftmost, rightmost], in the scene's units there. box is
  // { min: [x, y, z], max: [x, y, z] }; view is { frame, fov, pitch } as in a scene's
  // definition; the box is drawn at `scale` with its own origin at (px, py, pz). The camera
  // is where it rests, or swung `orbit` radians round the middle of the frame as a scene's
  // k.orbit swings it. (The camera is taken to be as far away as the frame's height asks,
  // which it is on any page at least as wide as the frame.)
  function reach(box, view, rx, ry, rz, scale, px, py, pz, orbit) {
    const sinP = Math.sin(view.pitch * DEG), cosP = Math.cos(view.pitch * DEG), dist = view.frame.height / 2 / Math.tan((view.fov * DEG) / 2), c = view.frame.center;
    const co = Math.cos(orbit || 0), so = Math.sin(orbit || 0);
    const b = [Infinity, -Infinity, Infinity, -Infinity], p = [0, 0, 0];
    for (let i = 0; i < 8; i++) {
      turn(p, (i & 1 ? box.max : box.min)[0], (i & 2 ? box.max : box.min)[1], (i & 4 ? box.max : box.min)[2], rx, ry, rz);
      const wx = p[0] * scale + px - c[0], qy = p[1] * scale + py - c[1], wz = p[2] * scale + pz - c[2];
      const qx = wx * co - wz * so, qz = wx * so + wz * co;                 // as the swung camera sees it
      // (A corner at the camera or behind it has no place on the picture: it is held just in front.)
      const near = dist / Math.max(dist - (qy * sinP + qz * cosP), 0.05 * dist), v = (qy * cosP - qz * sinP) * near, h = qx * near;
      if (v < b[0]) b[0] = v; if (v > b[1]) b[1] = v; if (h < b[2]) b[2] = h; if (h > b[3]) b[3] = h;
    }
    return b;
  }

  // The same, over every place a camera that sways `sway` radians each way comes to.
  function sweep(box, view, rx, ry, rz, scale, px, py, pz, sway) {
    const b = reach(box, view, rx, ry, rz, scale, px, py, pz, 0);
    if (!(sway > 0)) return b;
    for (const part of [-1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1]) {
      const o = reach(box, view, rx, ry, rz, scale, px, py, pz, part * sway);
      b[0] = Math.min(b[0], o[0]); b[1] = Math.max(b[1], o[1]); b[2] = Math.min(b[2], o[2]); b[3] = Math.max(b[3], o[3]);
    }
    return b;
  }

  // Where to put a turned box and how large to draw it, so that it stays in the frame:
  // { scale, x, y, z }. With no rotation it is where it always was, at full size.
  //
  // Seen from where the camera rests, a turned box may be as tall and as wide as it was
  // unturned, or FILL of the frame if that is more, and it sits where the unturned box does
  // (but never further out than the unturned box reached, or FILL of the way to the frame's
  // edge). If it is too large for that it is drawn smaller.
  //
  // `sway` is how far the scene's camera swings each way, in radians. Wherever the camera
  // comes to, the box must be inside the frame itself (or reach no further than the unturned
  // box does from there): it is drawn smaller again if it must be, and moved over.
  //
  // Nearer things look larger, so a correction is never exact: the rounds go on until one
  // changes nothing (a handful as a rule; a box that comes close to the camera can take
  // hundreds).
  const FILL = 0.86;
  function poseFor(box, view, rx, ry, rz, sway) {
    const sinP = Math.sin(view.pitch * DEG), cosP = Math.cos(view.pitch * DEG), halfV = view.frame.height / 2, halfH = view.frame.width / 2;
    const rest = reach(box, view, 0, 0, 0, 1, 0, 0, 0, 0), swaying = sway > 0, far = swaying ? sweep(box, view, 0, 0, 0, 1, 0, 0, 0, sway) : rest;
    // At rest: how tall and wide it may be, where its middle belongs, and how far out it may reach.
    const tall = Math.max(2 * FILL * halfV, rest[1] - rest[0]), wide = Math.max(2 * FILL * halfH, rest[3] - rest[2]);
    const homeV = (rest[0] + rest[1]) / 2, homeH = (rest[2] + rest[3]) / 2;
    const low = Math.min(rest[0], -FILL * halfV), high = Math.max(rest[1], FILL * halfV), left = Math.min(rest[2], -FILL * halfH), right = Math.max(rest[3], FILL * halfH);
    // Swaying: the frame, or as far as the unturned box reaches from wherever the camera is.
    const lowS = Math.min(far[0], -halfV), highS = Math.max(far[1], halfV), leftS = Math.min(far[2], -halfH), rightS = Math.max(far[3], halfH);
    // Where a box from..to should have its middle: at `home` if it is inside lo..hi there, or as near as it can
    // be; and then moved over if the box as the swaying camera finds it (sFrom..sTo) is outside sLo..sHi.
    const aim = (from, to, home, lo, hi, sFrom, sTo, sLo, sHi) => {
      const half = (to - from) / 2, mid = (from + to) / 2;
      let want = home;
      if (from + (home - mid) < lo || to + (home - mid) > hi) want = Math.min(Math.max(home, lo + half), hi - half);
      if (swaying) {
        const move = want - mid, f = sFrom + move, e = sTo + move;
        if (f >= sLo && e <= sHi) return want;
        if (f < sLo) want += sLo - f;
        else want -= e - sHi;
      }
      return want;
    };
    const pose = { scale: 1, x: 0, y: 0, z: 0 };
    let gainV = 1, gainH = 1;
    for (let round = 0; round < 600; round++) {
      // Its size first, then its place at that size.
      let b = reach(box, view, rx, ry, rz, pose.scale, pose.x, pose.y, pose.z, 0), s = swaying ? sweep(box, view, rx, ry, rz, pose.scale, pose.x, pose.y, pose.z, sway) : b;
      let fit = Math.min(tall / (b[1] - b[0]), wide / (b[3] - b[2]));
      if (swaying) fit = Math.min(fit, (highS - lowS) / (s[1] - s[0]), (rightS - leftS) / (s[3] - s[2]));
      const scale = Math.min(1, pose.scale * fit), grew = Math.abs(scale - pose.scale);
      pose.scale = scale;
      b = reach(box, view, rx, ry, rz, pose.scale, pose.x, pose.y, pose.z, 0);
      s = swaying ? sweep(box, view, rx, ry, rz, pose.scale, pose.x, pose.y, pose.z, sway) : b;
      const midV = (b[0] + b[1]) / 2, midH = (b[2] + b[3]) / 2;
      const up = (aim(b[0], b[1], homeV, low, high, s[0], s[1], lowS, highS) - midV) / gainV, across = (aim(b[2], b[3], homeH, left, right, s[2], s[3], leftS, rightS) - midH) / gainH;
      pose.x += across; pose.y += up * cosP; pose.z -= up * sinP;
      if (grew < 1e-10 && Math.abs(up) < 1e-9 && Math.abs(across) < 1e-9) break;
      // How far the box moved on the picture for the move it was given: nearer than the frame, further.
      b = reach(box, view, rx, ry, rz, pose.scale, pose.x, pose.y, pose.z, 0);
      if (Math.abs(up) > 1e-7) gainV = Math.min(4, Math.max(0.3, ((b[0] + b[1]) / 2 - midV) / up));
      if (Math.abs(across) > 1e-7) gainH = Math.min(4, Math.max(0.3, ((b[2] + b[3]) / 2 - midH) / across));
    }
    return pose;
  }

  // Trail veil (0..100) to afterglow seconds: 100 -> 0.35, 0 -> 1.5.
  function afterglowTime(trailVeilPct) {
    const t = trailVeilPct / 100;
    return 1.5 * (1 - t) + 0.35 * t;
  }

  // How an afterglow cools: an extra fade time in seconds for red, green and
  // blue, on top of the afterglow time. Infinity adds none. The default lets
  // green and blue go first, so fading candlelight shifts warm.
  const WARM = [Infinity, 0.098, 0.035];
  // A scene's `cooling`, or the default when it is not three positive numbers.
  function cooling(value) {
    const good = Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'number' && v > 0);
    return (good ? value : WARM).slice();
  }

  // Per-channel survival fraction of the afterglow over dt seconds.
  function decay(dt, T, cool) {
    const r = Math.exp(-dt / T), c = cool || WARM;
    return [r * Math.exp(-dt / c[0]), r * Math.exp(-dt / c[1]), r * Math.exp(-dt / c[2])];
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

  // ── WebGL runtime ───────────────────────────────────────────────────────────
  // Everything below runs only when called: THREE, document, canvas3d and the
  // core.js audio/config globals are looked up at call time, never at load.
  //
  // Frame: solid pass (layer 0, every light) and light-catcher pass (layer 1:
  // the invisible ground and the practical lights) into one half-float 4x MSAA
  // target; an afterglow pass folds in the previous output; an output pass
  // tone-maps to the canvas. Light is written with alpha 0 throughout.

  const api = {
    createEnvelope, createHistory, follow, fall, phase, dissolve, createClock, fitDistance, turn, reach, sweep, poseFor, FILL, afterglowTime, decay, cooling, renderScale, viewOffset,
    testLevel: null,          // test hook: a number here replaces the mic level
    testClock: null,          // test hook: a number here is where the next createClock() starts, in seconds
    outputMode: 'added',      // or 'premultiplied' (an owner's decision, never automatic)
    readLevel, create, factory, debug,
  };

  const DEFAULT_PLACEMENT = { x: 0, y: 0, size: 100 };
  const LAYER_LIGHT = 1;      // the ground and the lights that reach it

  let renderer = null;        // one per page, shared by every kit scene
  let active = null;          // the live scene's internals, for debug()
  let targetGeneration = 0;   // how many times render targets have been built

  const QUAD_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const AFTERGLOW_FRAG = `
    varying vec2 vUv;
    uniform sampler2D uCur, uPrev;
    uniform vec3 uCool;
    void main() {
      vec4 c = texture2D(uCur, vUv), p = texture2D(uPrev, vUv);
      vec3 glow = p.rgb * step(p.a, 0.02) * uCool;   // only light lingers; a hard test, not a blend
      gl_FragColor = vec4(mix(max(c.rgb, glow), c.rgb, c.a), c.a);
    }`;
  const OUTPUT_FRAG = `
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform float uPremultiplied;
    void main() {
      gl_FragColor = texture2D(uTex, vUv);
      float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x)
                 * smoothstep(0.0, 0.20, vUv.y) * smoothstep(1.0, 0.90, vUv.y);
      gl_FragColor.rgb *= mix(edge, 1.0, gl_FragColor.a);   // fade light, never objects
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      // After encoding, so alpha covers the colour actually written: raised from the
      // linear value, faint light would leave rgb above alpha (not premultiplied).
      if (uPremultiplied > 0.5) gl_FragColor.a = max(gl_FragColor.a, min(1.0, max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b))));
    }`;

  // The sampler's summary of the sound (core.js's micBands), or null: no mic, a test level
  // in force, or an audio-capture.js from before it published one.
  function heard() {
    if (typeof api.testLevel === 'number' || !micActive) return null;
    return typeof micBands !== 'undefined' && micBands && typeof micBands.level === 'number' ? micBands : null;
  }

  // Mic loudness, 0..1: the sampler's level (the larger of 3 × the input's RMS and 1.1 × the
  // mean of its bass and mid bands), times Gain. Beside a sampler that publishes none, the waveform RMS or the low
  // six values of `frequencies`, as before. Without a mic, a slow swell when Idle animation is
  // on, else silence.
  function readLevel(nowMs) {
    if (typeof api.testLevel === 'number') return api.testLevel;
    const bands = heard();
    if (bands) return Math.min(1, bands.level * cfgGain);
    if (micActive && waveform && waveform.length) {
      let sum = 0;
      for (let i = 0; i < waveform.length; i++) { const v = (waveform[i] - 128) / 128; sum += v * v; }
      let low = 0;
      if (frequencies && frequencies.length >= 6) { for (let i = 0; i < 6; i++) low += frequencies[i]; low /= 6; }
      return Math.min(1, Math.max(Math.sqrt(sum / waveform.length) * 3, (low / 255) * 1.1) * cfgGain);
    }
    if (cfgIdleAnim) return 0.26 + 0.2 * Math.sin(nowMs / 900) * Math.sin(nowMs / 2300 + 1);
    return 0;
  }

  // The texture upload flags, back to WebGL's defaults. three.js sets them per upload and
  // never puts them back; a renderer built while the flip flag is on raises a GL error.
  function resetUploadFlags(gl) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
  }

  // What three.js r160 asks of a context for { alpha: true, antialias: true }. The first
  // getContext() on a canvas fixes its attributes, so the kit asks for exactly these.
  const CONTEXT = {
    alpha: true, depth: true, stencil: true, antialias: true, premultipliedAlpha: true,
    preserveDrawingBuffer: false, powerPreference: 'default', failIfMajorPerformanceCaveat: false,
  };

  function getRenderer() {
    if (renderer) return renderer;
    let r;
    try {
      // An older effect may have left the upload flags set on this canvas's context.
      const gl = canvas3d.getContext('webgl2', CONTEXT);
      if (gl) resetUploadFlags(gl);
      r = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: true });
    } catch (e) { return null; }
    r.setPixelRatio(1);
    r.setClearColor(0x000000, 0);
    r.autoClear = false;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = false;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.1;
    renderer = r;
    return r;
  }

  // "Add colour, leave alpha": light lands on whatever is behind the canvas.
  function addLight(material) {
    material.blending = THREE.CustomBlending;
    material.blendEquation = THREE.AddEquation;
    material.blendSrc = THREE.SrcAlphaFactor;
    material.blendDst = THREE.OneFactor;
    material.blendSrcAlpha = THREE.ZeroFactor;
    material.blendDstAlpha = THREE.OneFactor;
    material.transparent = true;
    material.depthWrite = false;
    return material;
  }

  // three.js copies a shadow caster's map onto its shared shadow materials and leaves it
  // there (and in their cached uniforms) after the scene is gone. The next scene's shadow
  // pass then uploads that disposed texture again, and nothing ever frees it. A map only
  // matters to a shadow when it cuts holes (alphaTest above 0, where three.js uses a
  // material of the caster's own), so otherwise the shadow is drawn without it. The same
  // goes for a displacement map that displaces nothing.
  function plainShadow(r, object, camera, shadowCamera, geometry, depthMaterial) {
    if (depthMaterial.alphaTest === 0) { depthMaterial.map = null; depthMaterial.alphaMap = null; }
    if (depthMaterial.displacementScale === 0) depthMaterial.displacementMap = null;
  }
  plainShadow.timbreGuard = true;
  // Put the guard on a shadow caster, in front of any onBeforeShadow of its own (a scene's,
  // or the one three.js gives a BatchedMesh), which still runs after it.
  function guardShadow(o) {
    if (!(o.isMesh || o.isLine || o.isPoints)) return;
    const own = o.onBeforeShadow;
    if (own && own.timbreGuard) return;
    if (!own || own === THREE.Object3D.prototype.onBeforeShadow) { o.onBeforeShadow = plainShadow; return; }
    const guarded = function (r, object, camera, shadowCamera, geometry, depthMaterial, group) {
      plainShadow(r, object, camera, shadowCamera, geometry, depthMaterial);
      own.call(this, r, object, camera, shadowCamera, geometry, depthMaterial, group);
    };
    guarded.timbreGuard = true;
    o.onBeforeShadow = guarded;
  }

  function quadMaterial(fragmentShader, uniforms, toneMapped) {
    return new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader, uniforms, toneMapped,
      blending: THREE.NoBlending, depthTest: false, depthWrite: false,
    });
  }

  // Build a scene from its definition. Returns null without three.js or WebGL, or
  // when def.build() throws (the error goes to the console).
  function create(def) {
    if (typeof THREE === 'undefined' || !THREE) return null;
    const r = getRenderer();
    if (!r) return null;
    r.resetState();

    const kept = [];
    const keep = (obj) => { kept.push(obj); return obj; };
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(def.fov, 1, 0.1, 100);
    const envelope = createEnvelope();
    const center = new THREE.Vector3().fromArray(def.frame.center);
    const pitch = (def.pitch * Math.PI) / 180;
    const rendererSize = new THREE.Vector2();
    const view = { w: 0, h: 0, scale: 0 };   // canvas client size and internal scale, as last reconciled
    let targets = null;       // { w, h, scene, prev, next }
    let dirty = true, disposed = false, afterglowT = afterglowTime(100);
    const cool = cooling(def.cooling);

    const k = {
      THREE, scene, camera,
      orbit: 0,
      keep,
      practical(light) { light.layers.enable(LAYER_LIGHT); return light; },
      addLight,
      glowTexture(red, green, blue) {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const x = c.getContext('2d');
        const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
        for (const [s, a] of [[0, 1], [0.08, 0.72], [0.2, 0.38], [0.4, 0.15], [0.65, 0.045], [1, 0]]) {
          g.addColorStop(s, `rgba(${red},${green},${blue},${a})`);
        }
        x.fillStyle = g;
        x.fillRect(0, 0, 256, 256);
        const t = keep(new THREE.CanvasTexture(c));
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      },
    };

    // The invisible ground: seen only where a practical light lands on it.
    const groundGeo = keep(new THREE.PlaneGeometry(60, 60));
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, keep(addLight(new THREE.MeshStandardMaterial({
      color: def.groundColor === undefined ? 0x7a6f66 : def.groundColor, roughness: 0.85, metalness: 0,
    }))));
    ground.receiveShadow = true;
    ground.layers.set(LAYER_LIGHT);
    scene.add(ground);

    // Full-screen passes.
    const afterglowMat = keep(quadMaterial(AFTERGLOW_FRAG,
      { uCur: { value: null }, uPrev: { value: null }, uCool: { value: new THREE.Vector3(1, 1, 1) } }, false));
    const outputMat = keep(quadMaterial(OUTPUT_FRAG, { uTex: { value: null }, uPremultiplied: { value: 0 } }, true));
    const quad = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), afterglowMat);
    quad.frustumCulled = false;
    const quadScene = new THREE.Scene();
    quadScene.add(quad);
    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    function disposeTargets() {
      if (!targets) return;
      targets.scene.dispose(); targets.prev.dispose(); targets.next.dispose();
      targets = null;
    }

    // Match the renderer and the targets to the canvas's client size. Only a
    // real change rebuilds the targets. A canvas with no size (hidden, not laid
    // out) leaves everything as it is and is retried on the next frame.
    function reconcile() {
      const cw = canvas3d.clientWidth, ch = canvas3d.clientHeight;
      if (!(cw > 0 && ch > 0 && Number.isFinite(cw) && Number.isFinite(ch))) return;
      dirty = false;
      r.getSize(rendererSize);
      if (rendererSize.x !== cw || rendererSize.y !== ch || canvas3d.width !== cw || canvas3d.height !== ch) r.setSize(cw, ch, false);
      const s = renderScale(ch), w = cw * s, h = ch * s;
      view.w = cw; view.h = ch; view.scale = s;
      if (targets && targets.w === w && targets.h === h) return;
      disposeTargets();
      const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
      targets = {
        w, h,
        scene: new THREE.WebGLRenderTarget(w, h, Object.assign({ samples: 4 }, opts)),
        prev: new THREE.WebGLRenderTarget(w, h, Object.assign({ depthBuffer: false }, opts)),
        next: new THREE.WebGLRenderTarget(w, h, Object.assign({ depthBuffer: false }, opts)),
      };
      // Start from nothing (and allocate now, so GPU memory is the same from the first frame).
      r.setClearColor(0x000000, 0);   // see draw(): a restored context clears to opaque black
      for (const t of [targets.scene, targets.prev, targets.next]) { r.setRenderTarget(t); r.clear(); }
      r.setRenderTarget(null);
      targetGeneration++;
    }

    function placeCamera(w, h) {
      const aspect = w / h;
      const d = fitDistance(def.frame.width, def.frame.height, def.fov, aspect);
      const cp = Math.cos(pitch);
      camera.position.set(
        center.x + d * Math.sin(k.orbit) * cp,
        center.y + d * Math.sin(pitch),
        center.z + d * Math.cos(k.orbit) * cp);
      camera.lookAt(center);
      const pl = (typeof timbreConfig !== 'undefined' && timbreConfig && timbreConfig.placement) || DEFAULT_PLACEMENT;
      const off = viewOffset(pl, w, h);
      camera.aspect = aspect;
      camera.far = d + 40;
      camera.zoom = off.zoom;
      camera.setViewOffset(w, h, off.x, off.y, w, h);
      camera.updateProjectionMatrix();
    }

    const internals = {
      def, view, camera,
      get targets() { return targets; },
      get afterglowT() { return afterglowT; },
    };

    const handle = {
      draw(now, dt) {
        if (disposed) return;
        if (dirty) reconcile();
        if (!targets) return;                     // nothing to draw this frame
        dt = Number.isFinite(dt) && dt > 0 ? dt : 0;

        const bands = heard();
        const audio = envelope.step(readLevel(now), now, dt, micActive, bands && typeof bands.beats === 'number' ? bands.beats : undefined);
        def.update(k, audio, now, dt);
        placeCamera(view.w, view.h);

        // 1 + 2: solids with every light, then the light-catcher with the practicals.
        scene.traverse(guardShadow);              // every frame: update() may have added objects
        r.shadowMap.needsUpdate = true;
        r.setRenderTarget(targets.scene);
        // After a WebGL context restore three's clear colour is opaque black until its first
        // render(); clearing with it would make one opaque frame. three caches it, so this is free.
        r.setClearColor(0x000000, 0);
        r.clear();
        camera.layers.set(0);
        r.render(scene, camera);
        camera.layers.set(LAYER_LIGHT);
        r.render(scene, camera);

        // 3: afterglow, previous output -> next.
        afterglowT = afterglowTime(cfgEffectBgOpacity * 100);
        const fade = decay(dt, afterglowT, cool);
        afterglowMat.uniforms.uCool.value.set(fade[0], fade[1], fade[2]);
        afterglowMat.uniforms.uCur.value = targets.scene.texture;
        afterglowMat.uniforms.uPrev.value = targets.prev.texture;
        quad.material = afterglowMat;
        r.setRenderTarget(targets.next);
        r.render(quadScene, quadCam);

        // 4: output to the canvas.
        outputMat.uniforms.uTex.value = targets.next.texture;
        outputMat.uniforms.uPremultiplied.value = api.outputMode === 'premultiplied' ? 1 : 0;
        quad.material = outputMat;
        r.setRenderTarget(null);
        r.render(quadScene, quadCam);

        const t = targets.prev; targets.prev = targets.next; targets.next = t;
      },
      resize() { dirty = true; },
      dispose() {
        if (disposed) return;
        disposed = true;
        try {
          // Lights own their shadow maps; instanced meshes own their instance buffers.
          // Whatever is in the scene is the scene's, kept or not: its geometries, its
          // materials and the textures they hold (as properties or as uniforms).
          // Something kept with no dispose() (a Group, say) holds nothing to free.
          const owned = new Set(kept);
          const takeMaterial = (m) => {
            if (!m) return;
            owned.add(m);
            for (const key in m) { const v = m[key]; if (v && v.isTexture) owned.add(v); }
            if (m.uniforms) for (const key in m.uniforms) { const v = m.uniforms[key] && m.uniforms[key].value; if (v && v.isTexture) owned.add(v); }
          };
          scene.traverse((o) => {
            if (o.isLight || o.isInstancedMesh) owned.add(o);
            if (o.geometry) owned.add(o.geometry);
            if (Array.isArray(o.material)) o.material.forEach(takeMaterial); else takeMaterial(o.material);
          });
          for (const o of owned) if (typeof o.dispose === 'function') o.dispose();
          disposeTargets();
        } finally {
          // Hand the context back even if a dispose() threw, so the next effect starts clean.
          r.setRenderTarget(null);
          r.resetState();
          // resetState() leaves the upload flags as the last texture set them; a
          // renderer built next on this canvas then fails texImage3D (FLIP_Y on).
          resetUploadFlags(r.getContext());
          if (active === internals) active = null;
        }
      },
    };

    // A build() that throws gives no scene: log it, free whatever it had made, and
    // return null, which the factory wrapper already treats as nothing to draw.
    try {
      def.build(k);
    } catch (e) {
      console.error('TimbreScene: build() failed; the scene will not draw.', e);
      handle.dispose();
      return null;
    }
    reconcile();
    // update() runs before the camera is placed for the frame, so place it once now: a scene
    // that turns things to face the camera has it from its first update.
    if (view.w > 0) placeCamera(view.w, view.h);
    active = internals;
    return handle;
  }

  // The effect factory for a scene: `VIZ_FACTORIES[id] = TimbreScene.factory(definition)`,
  // where definition() returns a fresh scene definition. Every method is safe
  // when there is no scene (no three.js, no WebGL, or a build() that threw).
  function factory(definition) {
    return function () {
      let scene = null;
      return {
        start() { scene = create(definition()); },
        stop() { if (scene) scene.dispose(); scene = null; },
        onResize() { if (scene) scene.resize(); },
        draw(now, dt) { if (scene) scene.draw(now, dt); },
      };
    };
  }

  // Test and DevTools view of the live scene, or null when none is running.
  function debug() {
    if (!active || !renderer) return null;
    const t = active.targets, info = renderer.info;
    return {
      active: true,
      renderScale: t ? active.view.scale : 0,
      targetSize: t ? [t.w, t.h] : [0, 0],
      targetGeneration,
      afterglowT: active.afterglowT,
      camera: active.camera.position.toArray(),   // where the last frame was drawn from
      memory: { geometries: info.memory.geometries, textures: info.memory.textures },
      programs: info.programs ? info.programs.length : 0,
      state: typeof active.def.debug === 'function' ? active.def.debug() : {},
    };
  }

  globalThis.TimbreScene = api;
})();
