/* ── winter-aurora (fullscreen aurora-borealis shader with starfield + jagged horizon) ──
   One PlaneGeometry quad rendered with an orthographic camera; a fragment shader
   procedurally synthesizes the starfield, aurora ribbons, and snow-capped mountain
   silhouette. Bass drives ribbon thickness + brightness; treble lights star
   twinkles. Knob ribbonCount steps 1→4 visible bands. Same FBO-less approach as
   ink.js but without the ping-pong simulation — purely screen-space. */
VIZ_FACTORIES['winter-aurora'] = function () {
  let renderer = null, scene = null, ortho = null, material = null;
  let initialized = false;
  let smoothBass = 0, smoothTreble = 0;
  function resizeRenderer() {
    if (!renderer) return;
    const w = canvas3d.clientWidth || 260;
    const h = canvas3d.clientHeight || 130;
    renderer.setSize(w, h, false);
  }
  function initThree() {
    if (typeof THREE === 'undefined') return false;
    renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: false });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);
    ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    scene = new THREE.Scene();
    material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime:     { value: 0 },
        uBass:     { value: 0 },
        uTreble:   { value: 0 },
        uRibbons:  { value: 3 },
        uStars:    { value: 0.5 },
        uMountain: { value: 0.7 },
        uColorA:   { value: new THREE.Color(0x55ff8c) },  // emerald
        uColorB:   { value: new THREE.Color(0xb068ff) },  // violet
        uColorC:   { value: new THREE.Color(0x66e0ff) },  // cyan
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime, uBass, uTreble, uRibbons, uStars, uMountain;
        uniform vec3 uColorA, uColorB, uColorC;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }
        void main() {
          vec2 uv = vUv;
          /* Sky gradient: deep navy at horizon → near-black at top */
          vec3 col = mix(vec3(0.05, 0.08, 0.20), vec3(0.01, 0.01, 0.04), 1.0 - uv.y);
          /* Stars: hash on a coarse grid; threshold gates density. Skip lower 22% (mountain band). */
          vec2 starGrid = floor(uv * vec2(160.0, 80.0));
          float starN = hash(starGrid);
          float threshold = 0.985 - uStars * 0.025;
          if (starN > threshold && uv.y > 0.22) {
            float twinkle = 0.5 + 0.5 * sin(uTime * (1.5 + starN * 4.0) + starN * 6.28);
            float starBri = mix(0.45, 1.0, twinkle) * (0.55 + uTreble * 0.7);
            col += vec3(0.95, 0.97, 1.0) * starBri;
          }
          /* Aurora ribbons — up to 4 stacked curtains, each warped by stacked sines + noise. */
          float ribbons = max(1.0, floor(uRibbons + 0.5));
          for (float r = 0.0; r < 4.0; r += 1.0) {
            if (r >= ribbons) break;
            float bandCenter = 0.42 + r * 0.10;
            float freq = 3.0 + r * 1.3;
            float speed = 0.18 + r * 0.07;
            float warp =
                sin(uv.x * freq + uTime * speed + r * 1.7) * 0.07
              + sin(uv.x * (freq * 2.4) - uTime * (speed * 1.6) + r * 0.5) * 0.025
              + (noise(vec2(uv.x * 4.0 + uTime * 0.10, r * 3.0 + uTime * 0.05)) - 0.5) * 0.04;
            float thickness = 0.07 + uBass * 0.06 + r * 0.005;
            float dist = abs(uv.y - (bandCenter + warp));
            float band = smoothstep(thickness, 0.0, dist);
            /* Vertical curtain striations */
            float streak = 0.65 + 0.35 * sin(uv.x * 80.0 + r * 12.0 + uTime * 0.4);
            band *= streak;
            /* Hide when near or below the mountain horizon */
            band *= smoothstep(0.20, 0.50, uv.y);
            vec3 ribbonCol = mix(uColorA, uColorB, r / 3.0);
            ribbonCol = mix(ribbonCol, uColorC, 0.35 * sin(uv.x * 2.5 + uTime * 0.4 + r));
            col += ribbonCol * band * (0.65 + uBass * 1.4);
          }
          /* Mountain silhouette — additive sines + noise produce a jagged ridge */
          float horizon =
              0.18 + 0.04 * sin(uv.x * 7.0 + 0.5)
            + 0.03 * sin(uv.x * 19.0 + 1.5)
            + 0.015 * sin(uv.x * 41.0 - 2.3)
            + 0.02 * (noise(vec2(uv.x * 6.0, 0.5)) - 0.5);
          float mountainMask = smoothstep(horizon + 0.005, horizon - 0.005, uv.y);
          vec3 mountainCol = vec3(0.04, 0.05, 0.10);
          col = mix(col, mountainCol, mountainMask * uMountain);
          /* Snow rim along the ridge */
          float snowEdge = smoothstep(horizon - 0.012, horizon, uv.y) * smoothstep(horizon + 0.005, horizon - 0.005, uv.y);
          col += vec3(0.85, 0.92, 1.0) * snowEdge * 0.55 * uMountain;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    initialized = true;
    resizeRenderer();
    return true;
  }
  function bandAverage(lo, hi) {
    if (!frequencies || frequencies.length === 0) return 0;
    const a = Math.floor(lo * frequencies.length);
    const b = Math.min(frequencies.length, Math.floor(hi * frequencies.length));
    let sum = 0;
    for (let i = a; i < b; i++) sum += frequencies[i];
    const n = Math.max(1, b - a);
    return (sum / (n * 255)) * cfgGain;
  }
  function ribbonCountFromKnob(v) {
    if (v < 25) return 1;
    if (v < 50) return 2;
    if (v < 75) return 3;
    return 4;
  }
  return {
    start() {
      if (typeof THREE === 'undefined') return;
      if (!renderer && !initThree()) return;
      smoothBass = 0;
      smoothTreble = 0;
      resizeRenderer();
    },
    onResize() { resizeRenderer(); },
    draw(now) {
      if (!renderer || !initialized) return;
      let bass, treble;
      if (micActive && frequencies) {
        bass = bandAverage(0, 0.18);
        treble = bandAverage(0.55, 1.0);
      } else if (cfgIdleAnim) {
        const t = now / 1100;
        bass = 0.18 + 0.08 * Math.sin(t);
        treble = 0.18 + 0.08 * Math.sin(t * 1.5);
      } else { bass = 0; treble = 0; }
      smoothBass = smoothBass * 0.85 + bass * 0.15;
      smoothTreble = smoothTreble * 0.75 + treble * 0.25;
      material.uniforms.uTime.value = now / 1000;
      material.uniforms.uBass.value = smoothBass;
      material.uniforms.uTreble.value = smoothTreble;
      material.uniforms.uRibbons.value = ribbonCountFromKnob(perViz['winter-aurora'].ribbonCount);
      material.uniforms.uStars.value = perViz['winter-aurora'].starDensity / 100;
      material.uniforms.uMountain.value = perViz['winter-aurora'].mountainOpacity / 100;
      renderer.setRenderTarget(null);
      renderer.render(scene, ortho);
    },
  };
};
