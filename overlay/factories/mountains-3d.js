/* ── mountains-3d (lit Three.js heightmap) ── */
VIZ_FACTORIES['mountains-3d'] = function () {
  const GRID_W = 26;
  const GRID_D = 22;
  const PLANE_W = 200;
  const PLANE_D = 320;
  let renderer = null, scene = null, camera = null, mesh = null, geometry = null, material = null, dirLight = null;
  let scrollProgress = 0;
  let heightRows = new Array(GRID_D).fill(null).map(() => new Array(GRID_W).fill(0));
  let lastFrame = performance.now();
  function sampleHeights(now) {
    const out = new Array(GRID_W).fill(0);
    if (micActive && frequencies && frequencies.length > 0) {
      const n = frequencies.length;
      for (let i = 0; i < GRID_W; i++) {
        const dist = Math.abs(i - GRID_W / 2);
        const binIdx = Math.min(n - 1, Math.floor((dist / (GRID_W / 2)) * (n - 1)));
        const v = (frequencies[binIdx] || 0) / 255 * cfgGain;
        out[i] = v * 32;
      }
    } else if (cfgIdleAnim) {
      const t = now / 1300;
      for (let i = 0; i < GRID_W; i++) {
        out[i] = 4 + 3 * Math.sin(i * 0.6 + t) + 2 * Math.sin(i * 1.4 - t * 1.7);
      }
    }
    return out;
  }
  function applyHeightsToGeometry() {
    if (!geometry) return;
    const positions = geometry.attributes.position;
    for (let j = 0; j < GRID_D; j++) {
      for (let i = 0; i < GRID_W; i++) {
        const idx = j * GRID_W + i;
        positions.setY(idx, heightRows[j][i]);
      }
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
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
    scene.fog = new THREE.Fog(0x0a0a1a, 80, 320);
    camera = new THREE.PerspectiveCamera(60, canvas3d.clientWidth / canvas3d.clientHeight, 0.1, 1000);
    camera.position.set(0, 32, PLANE_D / 2 - 30);
    camera.lookAt(0, 4, -PLANE_D / 2);
    geometry = new THREE.PlaneGeometry(PLANE_W, PLANE_D, GRID_W - 1, GRID_D - 1);
    geometry.rotateX(-Math.PI / 2);
    material = new THREE.MeshStandardMaterial({
      color: 0x00ffff, flatShading: true, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide,
    });
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(60, 90, 60);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x444466, 0.6));
    return true;
  }
  return {
    start() {
      if (typeof THREE === 'undefined') return;
      if (!renderer && !initThree()) return;
      const t0 = performance.now();
      heightRows = new Array(GRID_D).fill(null).map(() => new Array(GRID_W).fill(0));
      for (let j = 0; j < GRID_D; j++) heightRows[j] = sampleHeights(t0);
      applyHeightsToGeometry();
      scrollProgress = 0;
      lastFrame = t0;
      resizeRenderer();
    },
    onResize() { resizeRenderer(); },
    draw(now) {
      if (!renderer) return;
      const dt = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const cellsPerSec = 0.4 + (perViz['mountains-3d'].speed / 100) * 2.0;
      scrollProgress += cellsPerSec * dt;
      let dirty = false;
      while (scrollProgress >= 1) {
        heightRows.shift();
        heightRows.push(sampleHeights(now));
        scrollProgress -= 1;
        dirty = true;
      }
      if (dirty) applyHeightsToGeometry();
      camera.position.y = 28 + 4 * Math.sin(now / 1800);
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const rgb = getColor(colorT);
      material.color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
      dirLight.color.setRGB(
        Math.min(1, rgb[0] / 255 + 0.3),
        Math.min(1, rgb[1] / 255 + 0.3),
        Math.min(1, rgb[2] / 255 + 0.3),
      );
      renderer.render(scene, camera);
    },
  };
};
