/* ── chladni (audio-reactive cymatic plate) ──
   ~12k particles step along the gradient of the Chladni function f(x,y;n,m).
   Spectral centroid morphs (n,m) modes, bass agitates step size, beat reseeds.
   GPU-instanced points doing physics in the vertex shader — pure WebGL territory. */
VIZ_FACTORIES['chladni'] = function () {
  const PARTICLE_MIN = 4000;
  const PARTICLE_MAX = 24000;
  let renderer = null, scene = null, camera = null, points = null, geometry = null, material = null;
  let positions = null;
  let nMode = 3, mMode = 4, nTarget = 3, mTarget = 4;
  let bassEMA = 0, lastFrame = performance.now();
  let lastReseed = 0;
  function activeCount() {
    const t = perViz['chladni'].density / 100;
    return Math.round(PARTICLE_MIN + t * (PARTICLE_MAX - PARTICLE_MIN));
  }
  function resizeRenderer() {
    if (!renderer) return;
    const w = canvas3d.clientWidth || 260;
    const h = canvas3d.clientHeight || 130;
    renderer.setSize(w, h, false);
    if (camera) {
      camera.left = -1.0;
      camera.right = 1.0;
      camera.top = 0.5;
      camera.bottom = -0.5;
      camera.updateProjectionMatrix();
    }
  }
  function reseedParticles() {
    if (!positions) return;
    for (let i = 0; i < PARTICLE_MAX; i++) {
      positions[i * 3 + 0] = (Math.random() * 2 - 1);
      positions[i * 3 + 1] = (Math.random() * 2 - 1);
      positions[i * 3 + 2] = 0;
    }
    geometry.attributes.position.needsUpdate = true;
  }
  function initThree() {
    if (typeof THREE === 'undefined') return false;
    renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 0.5, -0.5, 0.1, 10);
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    positions = new Float32Array(PARTICLE_MAX * 3);
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, activeCount());
    /* RawShaderMaterial: we draw the particles in clip-space directly so the
       camera matrices are irrelevant — declaring `position` ourselves is simplest. */
    material = new THREE.RawShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor:     { value: new THREE.Color(0x00ffff) },
        uColor2:    { value: new THREE.Color(0xff00ff) },
        uPointSize: { value: 1.6 * SCALE },
      },
      vertexShader: `
        precision mediump float;
        attribute vec3 position;
        uniform float uPointSize;
        varying float vDistFromCenter;
        void main() {
          vDistFromCenter = length(position.xy);
          gl_Position = vec4(position.xy, 0.0, 1.0);
          gl_PointSize = uPointSize;
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform vec3 uColor;
        uniform vec3 uColor2;
        varying float vDistFromCenter;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d);
          if (r > 0.5) discard;
          float falloff = 1.0 - r * 2.0;
          vec3 col = mix(uColor, uColor2, clamp(vDistFromCenter, 0.0, 1.0));
          gl_FragColor = vec4(col, falloff * 0.7);
        }
      `,
    });
    points = new THREE.Points(geometry, material);
    scene.add(points);
    reseedParticles();
    resizeRenderer();
    return true;
  }
  /* Chladni gradient stepping happens on CPU once per frame: pure GPU vertex-shader
     physics would need a ping-pong FBO setup, more complexity than needed at 12k particles. */
  function chladniValue(x, y, n, m) {
    const PI = Math.PI;
    return Math.cos(n * PI * x) * Math.cos(m * PI * y) - Math.cos(m * PI * x) * Math.cos(n * PI * y);
  }
  function stepParticles(count, agitation, dt) {
    const eps = 0.005;
    const stepBase = 0.012 + agitation * 0.06;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const x = positions[idx + 0];
      const y = positions[idx + 1];
      const v  = chladniValue(x, y, nMode, mMode);
      const vx = chladniValue(x + eps, y, nMode, mMode);
      const vy = chladniValue(x, y + eps, nMode, mMode);
      const gx = (vx - v) / eps;
      const gy = (vy - v) / eps;
      const len = Math.hypot(gx, gy) + 1e-6;
      const sign = v > 0 ? -1 : 1;
      const step = stepBase * Math.sign(v || 1) * sign;
      positions[idx + 0] = Math.max(-1, Math.min(1, x + (gx / len) * step + (Math.random() - 0.5) * agitation * 0.02));
      positions[idx + 1] = Math.max(-1, Math.min(1, y + (gy / len) * step + (Math.random() - 0.5) * agitation * 0.02));
    }
    geometry.attributes.position.needsUpdate = true;
  }
  return {
    start() {
      if (typeof THREE === 'undefined') return;
      if (!renderer && !initThree()) return;
      bassEMA = 0;
      lastReseed = 0;
      lastFrame = performance.now();
      reseedParticles();
      geometry.setDrawRange(0, activeCount());
      resizeRenderer();
    },
    onResize() { resizeRenderer(); },
    draw(now) {
      if (!renderer) return;
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      let bass = 0;
      let centroid = 0;
      let totalMag = 0;
      if (micActive && frequencies && frequencies.length >= 32) {
        for (let i = 0; i < 4; i++) bass += frequencies[i];
        bass = (bass / 4) / 255 * cfgGain;
        for (let i = 0; i < frequencies.length; i++) {
          centroid += i * frequencies[i];
          totalMag += frequencies[i];
        }
        centroid = totalMag > 0 ? (centroid / totalMag) / frequencies.length : 0.5;
      } else if (cfgIdleAnim) {
        bass = 0.2 + 0.15 * Math.sin(now / 1200);
        centroid = 0.4 + 0.3 * Math.sin(now / 4000);
      }
      bassEMA = bassEMA * 0.78 + bass * 0.22;
      /* Map spectral centroid to (n, m) target modes in [2..7]. Smooth toward target. */
      nTarget = 2 + Math.floor(centroid * 5);
      mTarget = 2 + Math.floor((1 - centroid * 0.6) * 5);
      nMode += (nTarget - nMode) * Math.min(1, dt * 1.2);
      mMode += (mTarget - mMode) * Math.min(1, dt * 1.2);
      /* Beat → reseed (throttled). */
      if (bass > bassEMA * 1.7 + 0.2 && now - lastReseed > 1200) {
        reseedParticles();
        lastReseed = now;
      }
      const count = activeCount();
      geometry.setDrawRange(0, count);
      stepParticles(count, bassEMA, dt);
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const c1 = getColor(colorT);
      const c2 = getColor(colorT + 1.4);
      material.uniforms.uColor.value.setRGB(c1[0] / 255, c1[1] / 255, c1[2] / 255);
      material.uniforms.uColor2.value.setRGB(c2[0] / 255, c2[1] / 255, c2[2] / 255);
      material.uniforms.uPointSize.value = (1.4 + bassEMA * 1.2) * SCALE;
      renderer.render(scene, camera);
    },
  };
};
