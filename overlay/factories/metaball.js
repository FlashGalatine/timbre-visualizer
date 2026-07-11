/* ── metaball (raymarched SDF chrome blob) ──
   Full-screen quad fragment shader. Bass swells the blob radii, mids drift the
   spheres, treble shifts the fresnel hue, beat punches a quick scale pulse.
   Real WebGL because raymarched smooth-min SDFs aren't reproducible in 2D canvas. */
VIZ_FACTORIES['metaball'] = function () {
  let renderer = null, scene = null, camera = null, mesh = null, material = null;
  let bassEMA = 0, beatPulse = 0, lastFrame = performance.now();
  function resizeRenderer() {
    if (!renderer) return;
    const w = canvas3d.clientWidth || 260;
    const h = canvas3d.clientHeight || 130;
    renderer.setSize(w, h, false);
    if (material) material.uniforms.uAspect.value = w / h;
  }
  function initThree() {
    if (typeof THREE === 'undefined') return false;
    renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime:    { value: 0 },
        uAspect:  { value: 2 },
        uBass:    { value: 0 },
        uMid:     { value: 0 },
        uTreble:  { value: 0 },
        uBeat:    { value: 0 },
        uChrome:  { value: 0.5 },
        uHueBase: { value: 0.5 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime, uAspect, uBass, uMid, uTreble, uBeat, uChrome, uHueBase;
        float sdSphere(vec3 p, vec3 c, float r) { return length(p - c) - r; }
        float smin(float a, float b, float k) {
          float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
          return mix(b, a, h) - k * h * (1.0 - h);
        }
        float scene(vec3 p) {
          float t = uTime;
          float jitter = uMid * 0.4;
          float r = 0.45 + uBass * 0.35 + uBeat * 0.15;
          vec3 c0 = vec3(sin(t * 0.7) * (0.4 + jitter), cos(t * 0.9) * 0.3, 0.0);
          vec3 c1 = vec3(cos(t * 1.1) * 0.5, sin(t * 1.3) * (0.3 + jitter), sin(t * 0.4) * 0.3);
          vec3 c2 = vec3(sin(t * 1.4 + 2.0) * 0.35, cos(t * 0.6 + 1.0) * 0.4, cos(t * 0.8) * 0.3);
          vec3 c3 = vec3(cos(t * 0.5 + 3.0) * 0.4, sin(t * 1.0 + 2.0) * 0.35, sin(t * 1.2) * 0.4);
          float d = sdSphere(p, c0, r);
          d = smin(d, sdSphere(p, c1, r * 0.85), 0.4);
          d = smin(d, sdSphere(p, c2, r * 0.7),  0.35);
          d = smin(d, sdSphere(p, c3, r * 0.6),  0.3);
          return d;
        }
        vec3 calcNormal(vec3 p) {
          float e = 0.001;
          vec2 h = vec2(e, 0.0);
          return normalize(vec3(
            scene(p + h.xyy) - scene(p - h.xyy),
            scene(p + h.yxy) - scene(p - h.yxy),
            scene(p + h.yyx) - scene(p - h.yyx)
          ));
        }
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        void main() {
          vec2 uv = (vUv - 0.5) * 2.0;
          uv.x *= uAspect;
          vec3 ro = vec3(0.0, 0.0, 2.6);
          vec3 rd = normalize(vec3(uv, -1.6));
          float t = 0.0;
          float hit = 0.0;
          vec3 p = ro;
          for (int i = 0; i < 56; i++) {
            p = ro + rd * t;
            float d = scene(p);
            if (d < 0.001) { hit = 1.0; break; }
            if (t > 6.0) break;
            t += d * 0.85;
          }
          if (hit < 0.5) { gl_FragColor = vec4(0.0); return; }
          vec3 n = calcNormal(p);
          vec3 lightDir = normalize(vec3(0.4, 0.6, 0.8));
          float diff = max(dot(n, lightDir), 0.0);
          float fres = pow(1.0 - max(dot(n, -rd), 0.0), 2.5);
          float hue = uHueBase + uTreble * 0.4 + fres * 0.15;
          vec3 baseCol = hsv2rgb(vec3(hue, 0.7, 1.0));
          vec3 rimCol  = hsv2rgb(vec3(hue + 0.3, 0.9, 1.0));
          vec3 col = mix(baseCol * (0.25 + diff * 0.7), rimCol, fres * (0.4 + uChrome * 0.6));
          col += pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0) * uChrome;
          float alpha = 0.95;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    resizeRenderer();
    return true;
  }
  return {
    start() {
      if (typeof THREE === 'undefined') return;
      if (!renderer && !initThree()) return;
      bassEMA = 0; beatPulse = 0; lastFrame = performance.now();
      resizeRenderer();
    },
    onResize() { resizeRenderer(); },
    draw(now) {
      if (!renderer) return;
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      let bass = 0, mid = 0, treble = 0;
      if (micActive && frequencies && frequencies.length >= 32) {
        for (let i = 0; i < 4;  i++) bass   += frequencies[i];
        for (let i = 4; i < 16; i++) mid    += frequencies[i];
        for (let i = 16; i < 32; i++) treble += frequencies[i];
        bass   = (bass   / 4)  / 255 * cfgGain;
        mid    = (mid    / 12) / 255 * cfgGain;
        treble = (treble / 16) / 255 * cfgGain;
      } else if (cfgIdleAnim) {
        const t = now / 1000;
        bass   = 0.25 + 0.15 * Math.sin(t * 0.7);
        mid    = 0.20 + 0.10 * Math.sin(t * 1.1 + 1.0);
        treble = 0.20 + 0.15 * Math.sin(t * 1.5 + 2.0);
      }
      bassEMA = bassEMA * 0.78 + bass * 0.22;
      if (bass > bassEMA * 1.6 + 0.18) beatPulse = 1;
      beatPulse *= Math.exp(-dt * 5);
      const u = material.uniforms;
      u.uTime.value   = now / 1000;
      u.uBass.value   = bass;
      u.uMid.value    = mid;
      u.uTreble.value = treble;
      u.uBeat.value   = beatPulse;
      u.uChrome.value = perViz['metaball'].chrome / 100;
      u.uHueBase.value = ((now * cfgColorSpeed) / 18000 + cfgColorHue / PALETTE.length) % 1.0;
      renderer.render(scene, camera);
    },
  };
};
