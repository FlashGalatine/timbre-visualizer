/* ── jelly (3D spring-mass lattice with beat shockwaves) ──
   A 6×6×6 grid of nodes connected by springs; each beat fires a velocity
   impulse at a random node which propagates as a visible shockwave. Nodes
   render as InstancedMesh spheres, springs as LineSegments. The 8 corners
   are pinned so the lattice doesn't fly apart. */
VIZ_FACTORIES['jelly'] = function () {
  const GRID = 6;
  const NODE_COUNT = GRID * GRID * GRID;
  const REST = 1.0;
  const NODE_RADIUS = 0.12;
  const DAMPING = 0.92;
  let renderer = null, scene = null, camera = null, dirLight = null;
  let nodeMesh = null, springGeometry = null, springLines = null;
  /* Node arrays: positions are world-space, rest is the home position so the
     lattice springs back to a cube even after big shockwaves. */
  const px = new Float32Array(NODE_COUNT);
  const py = new Float32Array(NODE_COUNT);
  const pz = new Float32Array(NODE_COUNT);
  const vx = new Float32Array(NODE_COUNT);
  const vy = new Float32Array(NODE_COUNT);
  const vz = new Float32Array(NODE_COUNT);
  const rx = new Float32Array(NODE_COUNT);
  const ry = new Float32Array(NODE_COUNT);
  const rz = new Float32Array(NODE_COUNT);
  const pinned = new Uint8Array(NODE_COUNT);
  let springs = null;
  let springPositions = null;
  const tmpObject = (typeof THREE !== 'undefined') ? new THREE.Object3D() : null;
  const tmpColor = (typeof THREE !== 'undefined') ? new THREE.Color() : null;
  let bassEMA = 0, lastBeat = 0, cameraOrbit = 0, lastFrame = performance.now();
  function nodeIdx(i, j, k) { return (i * GRID + j) * GRID + k; }
  function buildLattice() {
    /* Centered grid in world space, rest length REST between cardinal neighbors. */
    const offset = -((GRID - 1) * REST) / 2;
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        for (let k = 0; k < GRID; k++) {
          const n = nodeIdx(i, j, k);
          rx[n] = offset + i * REST;
          ry[n] = offset + j * REST;
          rz[n] = offset + k * REST;
          px[n] = rx[n]; py[n] = ry[n]; pz[n] = rz[n];
          vx[n] = vy[n] = vz[n] = 0;
          /* Pin the 8 corner nodes so the lattice has fixed anchors. */
          const isCorner = (i === 0 || i === GRID - 1) && (j === 0 || j === GRID - 1) && (k === 0 || k === GRID - 1);
          pinned[n] = isCorner ? 1 : 0;
        }
      }
    }
    /* Springs: cardinal neighbors only (i+1, j+1, k+1 from each node). */
    const list = [];
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        for (let k = 0; k < GRID; k++) {
          const a = nodeIdx(i, j, k);
          if (i + 1 < GRID) list.push([a, nodeIdx(i + 1, j, k)]);
          if (j + 1 < GRID) list.push([a, nodeIdx(i, j + 1, k)]);
          if (k + 1 < GRID) list.push([a, nodeIdx(i, j, k + 1)]);
        }
      }
    }
    springs = list;
    springPositions = new Float32Array(springs.length * 2 * 3);
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
    camera = new THREE.PerspectiveCamera(50, canvas3d.clientWidth / canvas3d.clientHeight, 0.1, 200);
    camera.position.set(0, 2, 9);
    camera.lookAt(0, 0, 0);
    buildLattice();
    const nodeGeo = new THREE.SphereGeometry(NODE_RADIUS, 8, 6);
    const nodeMat = new THREE.MeshStandardMaterial({ metalness: 0.4, roughness: 0.4, vertexColors: false });
    nodeMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, NODE_COUNT);
    nodeMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NODE_COUNT * 3), 3);
    nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(nodeMesh);
    springGeometry = new THREE.BufferGeometry();
    springGeometry.setAttribute('position', new THREE.BufferAttribute(springPositions, 3));
    const springMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 });
    springLines = new THREE.LineSegments(springGeometry, springMat);
    scene.add(springLines);
    dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(8, 10, 6);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x444466, 0.5));
    resizeRenderer();
    return true;
  }
  function fireShockwave() {
    /* Pick a non-pinned interior node and give it a strong velocity impulse,
       which propagates outward through the spring network as a visible wave. */
    let attempts = 0;
    while (attempts < 8) {
      const idx = Math.floor(Math.random() * NODE_COUNT);
      if (!pinned[idx]) {
        const dir = Math.random() * Math.PI * 2;
        const dirZ = (Math.random() - 0.5);
        vx[idx] += Math.cos(dir) * 6;
        vy[idx] += dirZ * 6;
        vz[idx] += Math.sin(dir) * 6;
        return;
      }
      attempts++;
    }
  }
  function step(dt, stiffness, agitation) {
    /* Spring forces: for each spring, compute displacement and apply equal/opposite
       acceleration to both endpoints. Then integrate, damp, and snap pinned nodes back. */
    const subDt = Math.min(dt, 0.025);
    const k = stiffness;
    for (let s = 0, len = springs.length; s < len; s++) {
      const [a, b] = springs[s];
      const dx = px[b] - px[a];
      const dy = py[b] - py[a];
      const dz = pz[b] - pz[a];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      const f = (dist - REST) * k / dist;
      const fx = dx * f, fy = dy * f, fz = dz * f;
      vx[a] += fx * subDt; vy[a] += fy * subDt; vz[a] += fz * subDt;
      vx[b] -= fx * subDt; vy[b] -= fy * subDt; vz[b] -= fz * subDt;
    }
    /* Integrate, dampen, optional treble-driven jitter on free nodes. */
    const damp = Math.pow(DAMPING, subDt * 60);
    for (let n = 0; n < NODE_COUNT; n++) {
      if (pinned[n]) {
        px[n] = rx[n]; py[n] = ry[n]; pz[n] = rz[n];
        vx[n] = vy[n] = vz[n] = 0;
        continue;
      }
      vx[n] *= damp; vy[n] *= damp; vz[n] *= damp;
      if (agitation > 0.01) {
        vx[n] += (Math.random() - 0.5) * agitation;
        vy[n] += (Math.random() - 0.5) * agitation;
        vz[n] += (Math.random() - 0.5) * agitation;
      }
      px[n] += vx[n] * subDt;
      py[n] += vy[n] * subDt;
      pz[n] += vz[n] * subDt;
    }
  }
  return {
    start() {
      if (typeof THREE === 'undefined') return;
      if (!renderer && !initThree()) return;
      buildLattice();
      bassEMA = 0; lastBeat = 0; cameraOrbit = 0;
      lastFrame = performance.now();
      resizeRenderer();
    },
    onResize() { resizeRenderer(); },
    draw(now) {
      if (!renderer) return;
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      let bass = 0, treble = 0;
      if (micActive && frequencies && frequencies.length >= 32) {
        for (let i = 0; i < 4; i++) bass += frequencies[i];
        for (let i = 16; i < 32; i++) treble += frequencies[i];
        bass = (bass / 4) / 255 * cfgGain;
        treble = (treble / 16) / 255 * cfgGain;
      } else if (cfgIdleAnim) {
        bass = 0.2 + 0.15 * Math.sin(now / 1100);
        treble = 0.15 + 0.1 * Math.sin(now / 700 + 1);
      }
      bassEMA = bassEMA * 0.78 + bass * 0.22;
      if (bass > bassEMA * 1.6 + 0.18 && now - lastBeat > 200) {
        fireShockwave();
        lastBeat = now;
      } else if (cfgIdleAnim && !micActive && now - lastBeat > 1800) {
        fireShockwave();
        lastBeat = now;
      }
      const stiffness = 60 + (perViz['jelly'].stiffness / 100) * 240;
      const agitation = treble * 0.06;
      /* Two sub-steps per frame for stability at the higher stiffness end. */
      step(dt * 0.5, stiffness, agitation);
      step(dt * 0.5, stiffness, agitation);
      cameraOrbit += dt * 0.18;
      const orbitR = 9 + bassEMA * 1.5;
      camera.position.x = Math.sin(cameraOrbit) * orbitR;
      camera.position.z = Math.cos(cameraOrbit) * orbitR;
      camera.position.y = 2 + 1.5 * Math.sin(cameraOrbit * 0.6);
      camera.lookAt(0, 0, 0);
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const baseRgb = getColor(colorT);
      const accentRgb = getColor(colorT + 1.5);
      /* Update node InstancedMesh: position from sim, color shaded by displacement
         from rest (further from rest = more accent color = visible shockwave front). */
      for (let n = 0; n < NODE_COUNT; n++) {
        tmpObject.position.set(px[n], py[n], pz[n]);
        const dx = px[n] - rx[n], dy = py[n] - ry[n], dz = pz[n] - rz[n];
        const disp = Math.min(1, Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.6);
        const scale = (1 + bassEMA * 0.4) * (pinned[n] ? 1.3 : 1);
        tmpObject.scale.set(scale, scale, scale);
        tmpObject.rotation.set(0, 0, 0);
        tmpObject.updateMatrix();
        nodeMesh.setMatrixAt(n, tmpObject.matrix);
        const r = (baseRgb[0] * (1 - disp) + accentRgb[0] * disp) / 255;
        const g = (baseRgb[1] * (1 - disp) + accentRgb[1] * disp) / 255;
        const b = (baseRgb[2] * (1 - disp) + accentRgb[2] * disp) / 255;
        tmpColor.setRGB(r, g, b);
        nodeMesh.setColorAt(n, tmpColor);
      }
      nodeMesh.instanceMatrix.needsUpdate = true;
      if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
      /* Update spring line geometry from current node positions. */
      for (let s = 0, len = springs.length; s < len; s++) {
        const [a, b] = springs[s];
        const o = s * 6;
        springPositions[o + 0] = px[a]; springPositions[o + 1] = py[a]; springPositions[o + 2] = pz[a];
        springPositions[o + 3] = px[b]; springPositions[o + 4] = py[b]; springPositions[o + 5] = pz[b];
      }
      springGeometry.attributes.position.needsUpdate = true;
      springLines.material.color.setRGB(baseRgb[0] / 255, baseRgb[1] / 255, baseRgb[2] / 255);
      springLines.material.opacity = 0.25 + bassEMA * 0.4;
      renderer.render(scene, camera);
    },
  };
};
