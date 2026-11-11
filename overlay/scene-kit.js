// Timbre — scene kit, shared by the 3D scene effects. First the pure arithmetic
// (sound envelope, camera fit, afterglow decay, internal render scale,
// placement), then the WebGL runtime a scene is written against: create(def).
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

  // ── WebGL runtime ───────────────────────────────────────────────────────────
  // Everything below runs only when called: THREE, document, canvas3d and the
  // core.js audio/config globals are looked up at call time, never at load.
  //
  // Frame: solid pass (layer 0, every light) and light-catcher pass (layer 1:
  // the invisible ground and the practical lights) into one half-float 4x MSAA
  // target; an afterglow pass folds in the previous output; an output pass
  // tone-maps to the canvas. Light is written with alpha 0 throughout.

  const api = {
    createEnvelope, fitDistance, afterglowTime, decay, renderScale, viewOffset,
    testLevel: null,          // test hook: a number here replaces the mic level
    outputMode: 'added',      // or 'premultiplied' (an owner's decision, never automatic)
    readLevel, create, debug,
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

  // Mic loudness, 0..1: waveform RMS or the low FFT bins, times Gain. Without a
  // mic, a slow swell when Idle animation is on, else silence.
  function readLevel(nowMs) {
    if (typeof api.testLevel === 'number') return api.testLevel;
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

  function getRenderer() {
    if (renderer) return renderer;
    let r;
    try { r = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: true }); } catch (e) { return null; }
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

  function quadMaterial(fragmentShader, uniforms, toneMapped) {
    return new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader, uniforms, toneMapped,
      blending: THREE.NoBlending, depthTest: false, depthWrite: false,
    });
  }

  // Build a scene from its definition. Returns null without three.js or WebGL.
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

    def.build(k);

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
      def, view,
      get targets() { return targets; },
      get afterglowT() { return afterglowT; },
    };

    const handle = {
      draw(now, dt) {
        if (disposed) return;
        if (dirty) reconcile();
        if (!targets) return;                     // nothing to draw this frame
        dt = Number.isFinite(dt) && dt > 0 ? dt : 0;

        const audio = envelope.step(readLevel(now), now, dt, micActive);
        def.update(k, audio, now, dt);
        placeCamera(view.w, view.h);

        // 1 + 2: solids with every light, then the light-catcher with the practicals.
        r.shadowMap.needsUpdate = true;
        r.setRenderTarget(targets.scene);
        r.clear();
        camera.layers.set(0);
        r.render(scene, camera);
        camera.layers.set(LAYER_LIGHT);
        r.render(scene, camera);

        // 3: afterglow, previous output -> next.
        afterglowT = afterglowTime(cfgEffectBgOpacity * 100);
        const cool = decay(dt, afterglowT);
        afterglowMat.uniforms.uCool.value.set(cool[0], cool[1], cool[2]);
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
        // Lights own their shadow maps; instanced meshes own their instance buffers.
        const owned = new Set(kept);
        scene.traverse((o) => { if (o.isLight || o.isInstancedMesh) owned.add(o); });
        for (const o of owned) o.dispose();
        disposeTargets();
        r.setRenderTarget(null);
        r.resetState();
        // resetState() leaves the upload flags as the last texture set them; a
        // renderer built next on this canvas then fails texImage3D (FLIP_Y on).
        const gl = r.getContext();
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
        if (active === internals) active = null;
      },
    };

    reconcile();
    active = internals;
    return handle;
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
      memory: { geometries: info.memory.geometries, textures: info.memory.textures },
      programs: info.programs ? info.programs.length : 0,
      state: typeof active.def.debug === 'function' ? active.def.debug() : {},
    };
  }

  globalThis.TimbreScene = api;
})();
