/* ── glass-prism (refractive icosahedron with dispersion) ──
   Single hero object: a tumbling icosahedron with MeshPhysicalMaterial
   transmission/IOR, env-mapped from a procedural gradient cubemap.
   RMS drives spin, treble drives chromatic dispersion, beat kicks a tilt impulse. */
VIZ_FACTORIES['glass-prism'] = function () {
  let renderer = null, scene = null, camera = null, prism = null, material = null;
  let envTexture = null, pmrem = null;
  let spinX = 0.4, spinY = 0.6;
  let bassEMA = 0, beatKickX = 0, beatKickY = 0, lastFrame = performance.now();
  function resizeRenderer() {
    if (!renderer) return;
    const w = canvas3d.clientWidth || 260;
    const h = canvas3d.clientHeight || 130;
    renderer.setSize(w, h, false);
    if (camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
  /* Build a tiny CanvasTexture (256x128 equirect) of vivid color bands so the
     glass has something punchy to refract. PMREM-prefiltered for proper roughness mips. */
  function buildEnvMap() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0.00, '#0a0a1a');
    grad.addColorStop(0.18, '#00ffff');
    grad.addColorStop(0.36, '#9146ff');
    grad.addColorStop(0.55, '#ff00ff');
    grad.addColorStop(0.72, '#ff1493');
    grad.addColorStop(0.90, '#39ff14');
    grad.addColorStop(1.00, '#0a0a1a');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 128);
    /* Hot-spot bands give the prism specular sparkle as it tumbles. */
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const x = (i + 0.5) * 51.2;
      const r = g.createRadialGradient(x, 64, 0, x, 64, 36);
      r.addColorStop(0, 'rgba(255,255,255,0.9)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, 256, 128);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  function initThree() {
    if (typeof THREE === 'undefined') return false;
    renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, canvas3d.clientWidth / canvas3d.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 4.2);
    camera.lookAt(0, 0, 0);
    const equirect = buildEnvMap();
    pmrem = new THREE.PMREMGenerator(renderer);
    envTexture = pmrem.fromEquirectangular(equirect).texture;
    equirect.dispose();
    pmrem.dispose();
    material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.05,
      transmission: 1.0,
      thickness: 0.9,
      ior: 1.55,
      attenuationColor: 0xffffff,
      attenuationDistance: 4.0,
      envMap: envTexture,
      envMapIntensity: 1.4,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    /* dispersion is supported on r152+; assign with a fallback so it's harmless on older builds. */
    if ('dispersion' in material) material.dispersion = 0.4;
    prism = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 0), material);
    scene.add(prism);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    resizeRenderer();
    return true;
  }
  return {
    start() {
      if (typeof THREE === 'undefined') return;
      if (!renderer && !initThree()) return;
      bassEMA = 0; beatKickX = 0; beatKickY = 0;
      lastFrame = performance.now();
      resizeRenderer();
    },
    onResize() { resizeRenderer(); },
    draw(now) {
      if (!renderer) return;
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      let bass = 0, treble = 0, rms = 0;
      if (micActive && frequencies && frequencies.length >= 32) {
        for (let i = 0; i < 4; i++) bass += frequencies[i];
        for (let i = 16; i < 32; i++) treble += frequencies[i];
        bass = (bass / 4) / 255 * cfgGain;
        treble = (treble / 16) / 255 * cfgGain;
      } else if (cfgIdleAnim) {
        bass = 0.25 + 0.15 * Math.sin(now / 1100);
        treble = 0.2 + 0.15 * Math.sin(now / 700 + 1);
      }
      if (micActive && waveform && waveform.length > 0) {
        let acc = 0;
        for (let i = 0; i < waveform.length; i++) {
          const d = (waveform[i] - 128) / 128;
          acc += d * d;
        }
        rms = Math.sqrt(acc / waveform.length) * cfgGain;
      } else if (cfgIdleAnim) {
        rms = 0.2;
      }
      bassEMA = bassEMA * 0.78 + bass * 0.22;
      if (bass > bassEMA * 1.6 + 0.18) {
        beatKickX = (Math.random() - 0.5) * 4;
        beatKickY = (Math.random() - 0.5) * 4;
      }
      beatKickX *= Math.exp(-dt * 4);
      beatKickY *= Math.exp(-dt * 4);
      spinX += dt * (0.3 + rms * 2.5) + beatKickX * dt;
      spinY += dt * (0.45 + rms * 3.0) + beatKickY * dt;
      prism.rotation.x = spinX;
      prism.rotation.y = spinY;
      const breathe = 1.0 + bass * 0.18 + bassEMA * 0.05;
      prism.scale.set(breathe, breathe, breathe);
      const chromaBoost = perViz['glass-prism'].chroma / 100;
      if ('dispersion' in material) material.dispersion = 0.15 + treble * 1.4 * chromaBoost;
      material.envMapIntensity = 1.1 + bass * 1.2;
      renderer.render(scene, camera);
    },
  };
};
