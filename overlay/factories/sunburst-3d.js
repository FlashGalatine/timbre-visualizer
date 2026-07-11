/* ── sunburst-3d (Three.js radial ray burst with bass kicks) ── */
VIZ_FACTORIES['sunburst-3d'] = function () {
  const RAY_COUNT_MIN = 64;
  const RAY_COUNT_MAX = 512;
  const BASE_RADIUS = 4;
  const MAX_LENGTH = 28;
  const directions = new Array(RAY_COUNT_MAX);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < RAY_COUNT_MAX; i++) {
    const y = 1 - (i + 0.5) * 2 / RAY_COUNT_MAX;
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    directions[i] = { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
  }
  let renderer = null, scene = null, camera = null, raysObj = null, raysGeometry = null, raysMaterial = null, core = null, dirLight = null;
  let burstAmount = 0;
  let lastBassSpike = 0;
  let bassEMA = 0;
  let lastFrame = performance.now();
  function activeRayCount() {
    const t = perViz['sunburst-3d'].density / 100;
    return Math.round(RAY_COUNT_MIN + t * (RAY_COUNT_MAX - RAY_COUNT_MIN));
  }
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
  function initThree() {
    if (typeof THREE === 'undefined') return false;
    renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);
    resizeRenderer();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, canvas3d.clientWidth / canvas3d.clientHeight, 0.1, 500);
    camera.position.set(0, 12, 70);
    camera.lookAt(0, 0, 0);
    const positions = new Float32Array(RAY_COUNT_MAX * 2 * 3);
    const colors = new Float32Array(RAY_COUNT_MAX * 2 * 3);
    raysGeometry = new THREE.BufferGeometry();
    raysGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    raysGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    raysGeometry.setDrawRange(0, activeRayCount() * 2);
    raysMaterial = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.9,
    });
    raysObj = new THREE.LineSegments(raysGeometry, raysMaterial);
    scene.add(raysObj);
    core = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    scene.add(core);
    dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x222244, 0.5));
    return true;
  }
  return {
    start() {
      if (typeof THREE === 'undefined') return;
      if (!renderer && !initThree()) return;
      burstAmount = 0;
      bassEMA = 0;
      lastBassSpike = 0;
      lastFrame = performance.now();
      raysGeometry.setDrawRange(0, activeRayCount() * 2);
      resizeRenderer();
    },
    onResize() { resizeRenderer(); },
    draw(now) {
      if (!renderer) return;
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      let bassInst = 0;
      if (micActive && frequencies && frequencies.length >= 4) {
        bassInst = ((frequencies[0] + frequencies[1] + frequencies[2] + frequencies[3]) / 4 / 255) * cfgGain;
      }
      bassEMA = bassEMA * 0.78 + bassInst * 0.22;
      if (bassInst > bassEMA * 1.6 + 0.18 && now - lastBassSpike > 180) {
        burstAmount = 1;
        lastBassSpike = now;
      }
      burstAmount *= Math.exp(-dt * 4);
      const orbitT = now / 6000;
      const orbitR = 70 - 6 * burstAmount;
      camera.position.x = Math.sin(orbitT) * orbitR;
      camera.position.z = Math.cos(orbitT) * orbitR;
      camera.position.y = 12 + 5 * Math.sin(orbitT * 0.7);
      camera.lookAt(0, 0, 0);
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const count = activeRayCount();
      raysGeometry.setDrawRange(0, count * 2);
      const numBins = (frequencies && frequencies.length) || 32;
      const positions = raysGeometry.attributes.position.array;
      const colors = raysGeometry.attributes.color.array;
      for (let i = 0; i < count; i++) {
        const d = directions[i];
        let amp;
        if (micActive && frequencies) {
          const binIdx = i % numBins;
          amp = (frequencies[binIdx] / 255) * cfgGain;
        } else if (cfgIdleAnim) {
          amp = 0.2 + 0.15 * Math.sin(i * 0.7 + now / 700);
        } else { amp = 0; }
        const length = BASE_RADIUS + amp * MAX_LENGTH * (1 + burstAmount * 0.6);
        const tipX = d.x * length;
        const tipY = d.y * length;
        const tipZ = d.z * length;
        const o = i * 6;
        positions[o + 0] = 0; positions[o + 1] = 0; positions[o + 2] = 0;
        positions[o + 3] = tipX; positions[o + 4] = tipY; positions[o + 5] = tipZ;
        const rgb = getColor(colorT + (i / count) * 1.4);
        const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
        colors[o + 0] = 1.0; colors[o + 1] = 1.0; colors[o + 2] = 1.0;
        colors[o + 3] = r; colors[o + 4] = g; colors[o + 5] = b;
      }
      raysGeometry.attributes.position.needsUpdate = true;
      raysGeometry.attributes.color.needsUpdate = true;
      raysGeometry.computeBoundingSphere();
      const coreScale = 1 + burstAmount * 0.8 + bassEMA * 0.3;
      core.scale.set(coreScale, coreScale, coreScale);
      renderer.render(scene, camera);
    },
  };
};
