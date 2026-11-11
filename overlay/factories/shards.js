/* ── shards (InstancedMesh per-bin crystal field) ──
   ~256 tetrahedra distributed on a Fibonacci sphere; each one tracks one
   FFT bin and orbits radially as that bin's amplitude rises. Beats add a
   synchronized shatter-rotation. Uses InstancedMesh so rendering 256 lit
   meshes is essentially free. */
VIZ_FACTORIES['shards'] = function () {
  const SHARD_MIN = 96;
  const SHARD_MAX = 384;
  const BASE_RADIUS = 8;
  const RADIUS_RANGE = 14;
  const NUM_BINS = 32;
  /* Pre-compute Fibonacci-sphere directions + per-instance spin axis once. */
  const directions = new Array(SHARD_MAX);
  const spinAxes = new Array(SHARD_MAX);
  const spinPhases = new Array(SHARD_MAX);
  /* Integrated per-shard spin angle. The rate varies with the audio, so the
     angle must accumulate rate * dt — multiplying elapsed time by the live rate
     makes every small level change jump the angle by (uptime * change). */
  const spinAngles = new Float64Array(SHARD_MAX);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < SHARD_MAX; i++) {
    const y = 1 - (i + 0.5) * 2 / SHARD_MAX;
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    directions[i] = { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
    /* Per-shard spin axis is a deterministic perturbation of its direction so
       the field has variety without random churn each frame. */
    const ax = Math.sin(i * 1.7), ay = Math.cos(i * 0.9), az = Math.sin(i * 2.3);
    const am = Math.hypot(ax, ay, az);
    spinAxes[i] = { x: ax / am, y: ay / am, z: az / am };
    spinPhases[i] = (i * 0.137) % (Math.PI * 2);
    spinAngles[i] = spinPhases[i];
  }
  let renderer = null, scene = null, camera = null, mesh = null, dirLight = null;
  const tmpObject = (typeof THREE !== 'undefined') ? new THREE.Object3D() : null;
  const tmpColor = (typeof THREE !== 'undefined') ? new THREE.Color() : null;
  let burstAmount = 0;
  let bassEMA = 0;
  let lastBassSpike = 0;
  let cameraOrbit = 0;
  let lastFrame = performance.now();
  function activeShardCount() {
    const t = perViz['shards'].density / 100;
    return Math.round(SHARD_MIN + t * (SHARD_MAX - SHARD_MIN));
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
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, canvas3d.clientWidth / canvas3d.clientHeight, 0.1, 500);
    camera.position.set(0, 4, 32);
    camera.lookAt(0, 0, 0);
    const geo = new THREE.TetrahedronGeometry(0.6, 0);
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: false, metalness: 0.6, roughness: 0.25, flatShading: true,
    });
    mesh = new THREE.InstancedMesh(geo, mat, SHARD_MAX);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(SHARD_MAX * 3), 3);
    scene.add(mesh);
    dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x444466, 0.5));
    resizeRenderer();
    return true;
  }
  return {
    start() {
      if (typeof THREE === 'undefined') return;
      if (!renderer && !initThree()) return;
      burstAmount = 0; bassEMA = 0; lastBassSpike = 0;
      cameraOrbit = 0;
      lastFrame = performance.now();
      mesh.count = activeShardCount();
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
      cameraOrbit += dt * (0.18 + bassEMA * 0.4);
      const orbitR = 32 - 4 * burstAmount;
      camera.position.x = Math.sin(cameraOrbit) * orbitR;
      camera.position.z = Math.cos(cameraOrbit) * orbitR;
      camera.position.y = 4 + 3 * Math.sin(cameraOrbit * 0.6);
      camera.lookAt(0, 0, 0);
      const count = activeShardCount();
      mesh.count = count;
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const numBins = (frequencies && frequencies.length) || NUM_BINS;
      for (let i = 0; i < count; i++) {
        const d = directions[i];
        const binIdx = i % numBins;
        let amp;
        if (micActive && frequencies) {
          amp = (frequencies[binIdx] / 255) * cfgGain;
        } else if (cfgIdleAnim) {
          amp = 0.2 + 0.18 * Math.sin(i * 0.5 + now / 700);
        } else { amp = 0.05; }
        const radius = BASE_RADIUS + amp * RADIUS_RANGE * (1 + burstAmount * 0.3);
        tmpObject.position.set(d.x * radius, d.y * radius, d.z * radius);
        const scale = 0.4 + amp * 1.4 + burstAmount * 0.4;
        tmpObject.scale.set(scale, scale, scale);
        /* Self-spin: the spin axis is fixed per shard, but rotation rate scales with amp+beat. */
        const spinRate = 0.6 + amp * 1.5 + burstAmount * 4;
        spinAngles[i] = (spinAngles[i] + spinRate * dt) % (Math.PI * 2);
        tmpObject.quaternion.setFromAxisAngle(spinAxes[i], spinAngles[i]);
        tmpObject.updateMatrix();
        mesh.setMatrixAt(i, tmpObject.matrix);
        const rgb = getColor(colorT + (binIdx / numBins) * 1.4);
        const brightness = 0.4 + amp * 0.8 + burstAmount * 0.4;
        tmpColor.setRGB((rgb[0] / 255) * brightness, (rgb[1] / 255) * brightness, (rgb[2] / 255) * brightness);
        mesh.setColorAt(i, tmpColor);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      renderer.render(scene, camera);
    },
  };
};
