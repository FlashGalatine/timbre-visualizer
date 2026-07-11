/* ── ink (FBO ping-pong fluid diffusion) ──
   Two render targets ping-pong an advect+decay+inject shader so colored ink
   flows in a curl-noise velocity field. Beats inject splashes at angular
   positions modulated by the spectrum. The display pass keys luminance to
   alpha so the OBS overlay stays transparent. */
VIZ_FACTORIES['ink'] = function () {
  const SIM_W = 192, SIM_H = 96;
  let renderer = null, simScene = null, displayScene = null, ortho = null;
  let rtA = null, rtB = null;
  let simMaterial = null, displayMaterial = null;
  let initialized = false;
  let bassEMA = 0, lastFrame = performance.now();
  let injectAngleIdx = 0;
  function resizeRenderer() {
    if (!renderer) return;
    const w = canvas3d.clientWidth || 260;
    const h = canvas3d.clientHeight || 130;
    renderer.setSize(w, h, false);
  }
  function initThree() {
    if (typeof THREE === 'undefined') return false;
    renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: false });
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const rtParams = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    };
    rtA = new THREE.WebGLRenderTarget(SIM_W, SIM_H, rtParams);
    rtB = new THREE.WebGLRenderTarget(SIM_W, SIM_H, rtParams);
    simScene = new THREE.Scene();
    simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPrev:          { value: null },
        uTime:          { value: 0 },
        uDecay:         { value: 0.985 },
        uSwirl:         { value: 0.5 },
        uInjectColor:   { value: new THREE.Color(0xffffff) },
        uInjectPos:     { value: new THREE.Vector2(0.5, 0.5) },
        uInjectAmount:  { value: 0 },
        uInjectRadius:  { value: 0.07 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uPrev;
        uniform float uTime, uDecay, uSwirl, uInjectAmount, uInjectRadius;
        uniform vec3 uInjectColor;
        uniform vec2 uInjectPos;
        /* Curl-noise velocity field — gives turbulent flow without a real Navier-Stokes solve. */
        vec2 curl(vec2 p, float t) {
          float a = sin(p.x * 6.0 + t * 0.4) * cos(p.y * 5.0 - t * 0.3);
          float b = cos(p.x * 4.5 - t * 0.5) * sin(p.y * 6.5 + t * 0.6);
          return vec2(b, -a);
        }
        void main() {
          vec2 v = curl(vUv * 1.5, uTime) * uSwirl * 0.004;
          /* Add a gentle radial outward drift so ink doesn't pool at injection points. */
          vec2 toC = vUv - vec2(0.5);
          v += toC * 0.0015;
          vec3 c = texture2D(uPrev, vUv - v).rgb;
          c *= uDecay;
          /* Inject: gaussian-ish falloff around uInjectPos when uInjectAmount > 0. */
          float d = distance(vUv, uInjectPos);
          float f = exp(-(d * d) / (uInjectRadius * uInjectRadius));
          c += uInjectColor * f * uInjectAmount;
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    });
    simScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial));
    displayScene = new THREE.Scene();
    displayMaterial = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uTex: { value: null } },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTex;
        void main() {
          vec3 c = texture2D(uTex, vUv).rgb;
          /* Soft tone-curve to lift mids, then derive alpha from luminance so
             dark sim cells become transparent for the OBS overlay. */
          c = pow(c, vec3(0.85));
          float a = max(c.r, max(c.g, c.b));
          gl_FragColor = vec4(c, smoothstep(0.05, 0.4, a));
        }
      `,
    });
    displayScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), displayMaterial));
    /* Clear both RTs so we don't sample uninitialized memory on the first frame. */
    renderer.setRenderTarget(rtA); renderer.clear();
    renderer.setRenderTarget(rtB); renderer.clear();
    renderer.setRenderTarget(null);
    initialized = true;
    resizeRenderer();
    return true;
  }
  return {
    start() {
      if (typeof THREE === 'undefined') return;
      if (!renderer && !initThree()) return;
      bassEMA = 0;
      injectAngleIdx = 0;
      lastFrame = performance.now();
      if (initialized) {
        renderer.setRenderTarget(rtA); renderer.clear();
        renderer.setRenderTarget(rtB); renderer.clear();
        renderer.setRenderTarget(null);
      }
      resizeRenderer();
    },
    onResize() { resizeRenderer(); },
    draw(now) {
      if (!renderer || !initialized) return;
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      let bass = 0, mid = 0, treble = 0;
      if (micActive && frequencies && frequencies.length >= 32) {
        for (let i = 0; i < 4; i++) bass += frequencies[i];
        for (let i = 4; i < 16; i++) mid += frequencies[i];
        for (let i = 16; i < 32; i++) treble += frequencies[i];
        bass = (bass / 4) / 255 * cfgGain;
        mid = (mid / 12) / 255 * cfgGain;
        treble = (treble / 16) / 255 * cfgGain;
      } else if (cfgIdleAnim) {
        bass = 0.2 + 0.15 * Math.sin(now / 1100);
        mid = 0.2 + 0.1 * Math.sin(now / 800 + 1);
        treble = 0.15 + 0.1 * Math.sin(now / 600 + 2);
      }
      bassEMA = bassEMA * 0.78 + bass * 0.22;
      const beat = bass > bassEMA * 1.5 + 0.15 ? 1 : 0;
      /* Cycle injection angle each frame; mids strength controls per-frame ink density. */
      injectAngleIdx = (injectAngleIdx + 1) % 360;
      const angle = (injectAngleIdx / 360) * Math.PI * 2 + (now / 4000);
      const r = 0.28 + 0.05 * Math.sin(now / 700);
      simMaterial.uniforms.uInjectPos.value.set(0.5 + Math.cos(angle) * r, 0.5 + Math.sin(angle) * r);
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue + injectAngleIdx * 0.01) % PALETTE.length;
      const rgb = getColor(colorT);
      simMaterial.uniforms.uInjectColor.value.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
      const inject = (mid * 0.6 + treble * 0.4) * 0.18 + beat * 0.7;
      simMaterial.uniforms.uInjectAmount.value = inject;
      simMaterial.uniforms.uInjectRadius.value = 0.05 + bassEMA * 0.06;
      simMaterial.uniforms.uTime.value = now / 1000;
      simMaterial.uniforms.uSwirl.value = 0.35 + treble * 1.2 + perViz['ink'].swirl / 100 * 1.5;
      simMaterial.uniforms.uDecay.value = 0.974 + Math.min(0.022, mid * 0.025);
      /* Sim pass: A → B */
      simMaterial.uniforms.uPrev.value = rtA.texture;
      renderer.setRenderTarget(rtB);
      renderer.render(simScene, ortho);
      /* Swap (B becomes the new "current") */
      const tmp = rtA; rtA = rtB; rtB = tmp;
      /* Display pass: render the current RT to the canvas */
      displayMaterial.uniforms.uTex.value = rtA.texture;
      renderer.setRenderTarget(null);
      renderer.render(displayScene, ortho);
    },
  };
};
