/* ── boids (InstancedMesh flocking swarm) ──
   ~128 cone-shaped boids steering by classic Reynolds rules: cohesion +
   alignment + separation. Cohesion strength tracks RMS, separation tracks
   treble, beats apply a startle scatter impulse. Each boid is oriented along
   its velocity so the flock visibly turns and splits. */
VIZ_FACTORIES['boids'] = function () {
  const BOID_MIN = 64;
  const BOID_MAX = 192;
  const BOUNDS = 8;            /* world-space half-cube the flock lives in */
  const NEIGHBOR_R = 2.4;      /* radius for cohesion + alignment */
  const SEPARATE_R = 1.0;      /* radius below which separation kicks in */
  const MAX_SPEED = 5.0;
  const MAX_FORCE = 6.0;
  const px = new Float32Array(BOID_MAX);
  const py = new Float32Array(BOID_MAX);
  const pz = new Float32Array(BOID_MAX);
  const vx = new Float32Array(BOID_MAX);
  const vy = new Float32Array(BOID_MAX);
  const vz = new Float32Array(BOID_MAX);
  let renderer = null, scene = null, camera = null, mesh = null, dirLight = null;
  const tmpObject = (typeof THREE !== 'undefined') ? new THREE.Object3D() : null;
  const tmpColor = (typeof THREE !== 'undefined') ? new THREE.Color() : null;
  const tmpVecUp = (typeof THREE !== 'undefined') ? new THREE.Vector3(0, 1, 0) : null;
  const tmpQuat = (typeof THREE !== 'undefined') ? new THREE.Quaternion() : null;
  const tmpDir = (typeof THREE !== 'undefined') ? new THREE.Vector3() : null;
  let bassEMA = 0, lastBeat = 0, cameraOrbit = 0, lastFrame = performance.now();
  function activeBoidCount() {
    const t = perViz['boids'].cohesion / 100;
    /* Knob is "cohesion" but we also let it scale population so a low knob
       gives a sparse loose flock; high gives dense tight one. */
    return Math.round(BOID_MIN + t * (BOID_MAX - BOID_MIN));
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
  function seedBoids() {
    for (let i = 0; i < BOID_MAX; i++) {
      px[i] = (Math.random() - 0.5) * BOUNDS * 1.5;
      py[i] = (Math.random() - 0.5) * BOUNDS * 1.5;
      pz[i] = (Math.random() - 0.5) * BOUNDS * 1.5;
      const ang = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = MAX_SPEED * 0.6;
      vx[i] = Math.cos(ang) * Math.cos(elev) * speed;
      vy[i] = Math.sin(elev) * speed;
      vz[i] = Math.sin(ang) * Math.cos(elev) * speed;
    }
  }
  function initThree() {
    if (typeof THREE === 'undefined') return false;
    renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a1a, 18, 40);
    camera = new THREE.PerspectiveCamera(50, canvas3d.clientWidth / canvas3d.clientHeight, 0.1, 200);
    camera.position.set(0, 4, 22);
    camera.lookAt(0, 0, 0);
    /* ConeGeometry pointed +Y by default; we re-orient to +Z so the cone tip
       leads the velocity vector when we apply a quaternion that aligns +Z to v. */
    const geo = new THREE.ConeGeometry(0.18, 0.7, 6);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.4, flatShading: true });
    mesh = new THREE.InstancedMesh(geo, mat, BOID_MAX);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(BOID_MAX * 3), 3);
    scene.add(mesh);
    dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(10, 12, 8);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x444466, 0.5));
    seedBoids();
    resizeRenderer();
    return true;
  }
  function startleAll(strength) {
    for (let i = 0; i < BOID_MAX; i++) {
      vx[i] += (Math.random() - 0.5) * strength;
      vy[i] += (Math.random() - 0.5) * strength;
      vz[i] += (Math.random() - 0.5) * strength;
    }
  }
  function step(dt, count, cohesion, separation, alignmentW) {
    /* Naive O(N²) flocking — fine for ≤200 boids. For each boid, accumulate
       neighborhood centers/velocities and a separation push, then steer toward
       the desired velocity capped by MAX_FORCE. */
    const r2 = NEIGHBOR_R * NEIGHBOR_R;
    const sr2 = SEPARATE_R * SEPARATE_R;
    const newVx = new Float32Array(count);
    const newVy = new Float32Array(count);
    const newVz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let cnt = 0, cx = 0, cy = 0, cz = 0;       /* cohesion target */
      let avx = 0, avy = 0, avz = 0;               /* alignment avg vel */
      let sx = 0, sy = 0, sz = 0;                  /* separation push */
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const dx = px[j] - px[i], dy = py[j] - py[i], dz = pz[j] - pz[i];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > r2) continue;
        cnt++;
        cx += px[j]; cy += py[j]; cz += pz[j];
        avx += vx[j]; avy += vy[j]; avz += vz[j];
        if (d2 < sr2 && d2 > 1e-6) {
          const inv = 1 / Math.sqrt(d2);
          sx -= dx * inv; sy -= dy * inv; sz -= dz * inv;
        }
      }
      let fx = 0, fy = 0, fz = 0;
      if (cnt > 0) {
        cx /= cnt; cy /= cnt; cz /= cnt;
        fx += (cx - px[i]) * 0.6 * cohesion;
        fy += (cy - py[i]) * 0.6 * cohesion;
        fz += (cz - pz[i]) * 0.6 * cohesion;
        avx /= cnt; avy /= cnt; avz /= cnt;
        fx += (avx - vx[i]) * alignmentW;
        fy += (avy - vy[i]) * alignmentW;
        fz += (avz - vz[i]) * alignmentW;
      }
      fx += sx * separation;
      fy += sy * separation;
      fz += sz * separation;
      /* Soft boundary: gentle steer back toward origin past BOUNDS. */
      if (Math.abs(px[i]) > BOUNDS) fx -= px[i] * 0.3;
      if (Math.abs(py[i]) > BOUNDS * 0.7) fy -= py[i] * 0.3;
      if (Math.abs(pz[i]) > BOUNDS) fz -= pz[i] * 0.3;
      const fmag = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1e-6;
      if (fmag > MAX_FORCE) { fx = fx / fmag * MAX_FORCE; fy = fy / fmag * MAX_FORCE; fz = fz / fmag * MAX_FORCE; }
      newVx[i] = vx[i] + fx * dt;
      newVy[i] = vy[i] + fy * dt;
      newVz[i] = vz[i] + fz * dt;
      const sp = Math.sqrt(newVx[i] * newVx[i] + newVy[i] * newVy[i] + newVz[i] * newVz[i]) || 1e-6;
      if (sp > MAX_SPEED) { newVx[i] = newVx[i] / sp * MAX_SPEED; newVy[i] = newVy[i] / sp * MAX_SPEED; newVz[i] = newVz[i] / sp * MAX_SPEED; }
    }
    for (let i = 0; i < count; i++) {
      vx[i] = newVx[i]; vy[i] = newVy[i]; vz[i] = newVz[i];
      px[i] += vx[i] * dt;
      py[i] += vy[i] * dt;
      pz[i] += vz[i] * dt;
    }
  }
  return {
    start() {
      if (typeof THREE === 'undefined') return;
      if (!renderer && !initThree()) return;
      seedBoids();
      bassEMA = 0; lastBeat = 0; cameraOrbit = 0;
      lastFrame = performance.now();
      mesh.count = activeBoidCount();
      resizeRenderer();
    },
    onResize() { resizeRenderer(); },
    draw(now) {
      if (!renderer) return;
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      let bass = 0, treble = 0, rms = 0;
      if (micActive && frequencies && frequencies.length >= 32) {
        for (let i = 0; i < 4; i++) bass += frequencies[i];
        for (let i = 16; i < 32; i++) treble += frequencies[i];
        bass = (bass / 4) / 255 * cfgGain;
        treble = (treble / 16) / 255 * cfgGain;
      } else if (cfgIdleAnim) {
        bass = 0.2 + 0.15 * Math.sin(now / 1100);
        treble = 0.15 + 0.1 * Math.sin(now / 700 + 1);
      }
      if (micActive && waveform && waveform.length > 0) {
        let acc = 0;
        for (let i = 0; i < waveform.length; i++) {
          const d = (waveform[i] - 128) / 128;
          acc += d * d;
        }
        rms = Math.sqrt(acc / waveform.length) * cfgGain;
      } else if (cfgIdleAnim) {
        rms = 0.25;
      }
      bassEMA = bassEMA * 0.78 + bass * 0.22;
      if (bass > bassEMA * 1.6 + 0.18 && now - lastBeat > 220) {
        startleAll(3 + bass * 4);
        lastBeat = now;
      }
      const cohesion = 0.4 + rms * 1.2;
      const separation = 1.5 + treble * 3.5;
      const alignmentW = 0.8;
      const count = activeBoidCount();
      mesh.count = count;
      step(dt, count, cohesion, separation, alignmentW);
      cameraOrbit += dt * 0.12;
      const orbitR = 22 - bassEMA * 2;
      camera.position.x = Math.sin(cameraOrbit) * orbitR;
      camera.position.z = Math.cos(cameraOrbit) * orbitR;
      camera.position.y = 4 + 2 * Math.sin(cameraOrbit * 0.6);
      camera.lookAt(0, 0, 0);
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      for (let i = 0; i < count; i++) {
        const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]) || 1e-6;
        tmpDir.set(vx[i] / speed, vy[i] / speed, vz[i] / speed);
        /* Build orientation: align cone's +Z (after geo.rotateX) to velocity dir. */
        tmpQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tmpDir);
        tmpObject.position.set(px[i], py[i], pz[i]);
        tmpObject.quaternion.copy(tmpQuat);
        const sScale = 0.7 + (speed / MAX_SPEED) * 0.6;
        tmpObject.scale.set(sScale, sScale, sScale);
        tmpObject.updateMatrix();
        mesh.setMatrixAt(i, tmpObject.matrix);
        /* Color by speed (faster = warmer accent). */
        const sFrac = Math.min(1, speed / MAX_SPEED);
        const rgb = getColor(colorT + sFrac * 1.6);
        const brightness = 0.5 + sFrac * 0.5;
        tmpColor.setRGB((rgb[0] / 255) * brightness, (rgb[1] / 255) * brightness, (rgb[2] / 255) * brightness);
        mesh.setColorAt(i, tmpColor);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      renderer.render(scene, camera);
    },
  };
};
