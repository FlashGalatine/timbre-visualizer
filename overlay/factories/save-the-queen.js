/* ── save-the-queen (wireframe FFXIV "Save the Queen" sword hero) ──
   Variant of sword.js using an optimized (~5.5k triangle) STL of the FFXIV
   Save the Queen sword. Same WireframeGeometry / spark-source-stride / instance
   pool conventions as sword.js — only the asset and module-scope cache
   identifiers differ. Reads the shared STL knobs (clones, arrangement, spacing,
   etc.) from cfgSTLObject. */

let _satqSTLCache = null;
let _satqSTLPromise = null;
const SATQ_STL_URL = 'assets/save_the_queen_sword.stl';

function _loadSatqBinarySTL(url) {
  return fetch(url).then(r => {
    if (!r.ok) throw new Error(`STL fetch failed: ${r.status}`);
    return r.arrayBuffer();
  }).then(buf => {
    const view = new DataView(buf);
    const triCount = view.getUint32(80, true);
    const positions = new Float32Array(triCount * 9);
    let off = 84;
    for (let i = 0; i < triCount; i++) {
      for (let v = 0; v < 3; v++) {
        const o = i * 9 + v * 3;
        positions[o + 0] = view.getFloat32(off + 12 + v * 12, true);
        positions[o + 1] = view.getFloat32(off + 16 + v * 12, true);
        positions[o + 2] = view.getFloat32(off + 20 + v * 12, true);
      }
      off += 50;
    }
    return positions;
  });
}

function _ensureSatqLoaded() {
  if (_satqSTLCache) return Promise.resolve(_satqSTLCache);
  if (_satqSTLPromise) return _satqSTLPromise;
  _satqSTLPromise = _loadSatqBinarySTL(SATQ_STL_URL).then(p => { _satqSTLCache = p; return p; });
  return _satqSTLPromise;
}

VIZ_FACTORIES['save-the-queen'] = function () {
  const SPARK_MAX = 96;
  const SOURCE_VERTEX_STRIDE = 4;
  const SATQ_TILT_Z = 0;
  const DEG2RAD = Math.PI / 180;
  const MAX_CLONES = 8;

  let renderer = null, scene = null, camera = null;
  let swordGroup = null, swordTiltGroup = null, outerTransformGroup = null;

  /* Shared resources built once after STL loads — instances reference these. */
  let sharedWireGeo = null;
  let swordMaterial = null, swordMaterialR = null, swordMaterialB = null;
  let sparkMaterial = null, sparkHaloMaterial = null;
  let sourceVerts = null;

  /* Per-instance pool. instances[0] is the original; clones extend it. */
  const instances = [];
  let lastArrangementKey = '';

  /* Audio EMAs are shared so all clones pulse in unison. */
  let driveEMA = 0, motionEMA = 0, accentEMA = 0, beatEMA = 0, lastBeat = 0, lastFrame = performance.now();
  let initialLoadStarted = false;

  function intensity() { return cfgSTLObject.intensity / 100; }
  function sparkThickness() { return cfgSTLObject.sparkThickness / 100; }
  function sparkDistance() { return cfgSTLObject.sparkDistance / 100; }
  function sensitivity() { return Math.max(0, (cfgSTLObject.sensitivity ?? 100) / 100); }
  function jitterGate() { return (Math.max(0, Math.min(100, cfgSTLObject.jitter ?? 35)) / 100) * 0.18; }
  function smoothingAlpha() {
    const smooth = Math.max(0, Math.min(100, cfgSTLObject.smoothing ?? 70)) / 100;
    return 0.34 - smooth * 0.28;
  }
  function applyAudioGate(level) {
    const scaled = Math.max(0, level * sensitivity());
    const gate = jitterGate();
    if (scaled <= gate) return 0;
    return Math.min(2, (scaled - gate) / Math.max(0.0001, 1 - gate));
  }
  function bandLevel(start, end) {
    if (!micActive || !frequencies || frequencies.length === 0) return 0;
    const lo = Math.max(0, Math.floor(start));
    const hi = Math.min(frequencies.length, Math.floor(end));
    if (hi <= lo) return 0;
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += frequencies[i];
    return (sum / (hi - lo)) / 255 * cfgGain;
  }
  function waveformLevel() {
    if (!micActive || !waveform || waveform.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < waveform.length; i++) {
      const v = (waveform[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / waveform.length) * cfgGain;
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

  function makeInstance() {
    const group = new THREE.Group();
    const inst = {
      group,
      wire:  new THREE.LineSegments(sharedWireGeo, swordMaterial),
      wireR: new THREE.LineSegments(sharedWireGeo, swordMaterialR),
      wireB: new THREE.LineSegments(sharedWireGeo, swordMaterialB),
      sparks: new Array(SPARK_MAX),
      sparkPositions: new Float32Array(SPARK_MAX * 6),
      sparkColors:    new Float32Array(SPARK_MAX * 6),
      sparkGeometry:  new THREE.BufferGeometry(),
      sparkLines: null, sparkHaloA: null, sparkHaloB: null,
      rotY: 0,
    };
    for (let i = 0; i < SPARK_MAX; i++) inst.sparks[i] = { life: 0 };
    inst.sparkGeometry.setAttribute('position', new THREE.BufferAttribute(inst.sparkPositions, 3));
    inst.sparkGeometry.setAttribute('color',    new THREE.BufferAttribute(inst.sparkColors, 3));
    inst.sparkGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
    inst.sparkLines = new THREE.LineSegments(inst.sparkGeometry, sparkMaterial);
    inst.sparkHaloA = new THREE.LineSegments(inst.sparkGeometry, sparkHaloMaterial);
    inst.sparkHaloB = new THREE.LineSegments(inst.sparkGeometry, sparkHaloMaterial);
    inst.sparkLines.frustumCulled = false;
    inst.sparkHaloA.frustumCulled = false;
    inst.sparkHaloB.frustumCulled = false;
    inst.sparkHaloA.visible = false;
    inst.sparkHaloB.visible = false;
    group.add(inst.wire, inst.wireR, inst.wireB, inst.sparkLines, inst.sparkHaloA, inst.sparkHaloB);
    swordGroup.add(group);
    return inst;
  }

  function destroyInstance(inst) {
    swordGroup.remove(inst.group);
    inst.sparkGeometry.dispose();
  }

  function syncInstanceCount() {
    if (!sharedWireGeo) return;
    const want = 1 + Math.max(0, Math.min(MAX_CLONES, Math.round(cfgSTLObject.clones ?? 0)));
    while (instances.length < want) instances.push(makeInstance());
    while (instances.length > want) {
      destroyInstance(instances.pop());
      lastArrangementKey = '';
    }
  }

  function applyArrangement() {
    const total = instances.length;
    if (!total) return;
    const sp = Math.max(0, Math.min(2, cfgSTLObject.spacing ?? 0.5));
    const bucket = Math.max(0, Math.min(100, cfgSTLObject.arrangement ?? 0));
    const mode = bucket < 25 ? 'rows' : bucket < 50 ? 'cols' : bucket < 75 ? 'grid' : 'scatter';
    const key = `${total}|${mode}|${sp.toFixed(3)}`;
    if (key === lastArrangementKey) return;
    lastArrangementKey = key;
    if (mode === 'rows') {
      for (let i = 0; i < total; i++) {
        instances[i].group.position.set((i - (total - 1) / 2) * sp, 0, 0);
      }
    } else if (mode === 'cols') {
      for (let i = 0; i < total; i++) {
        instances[i].group.position.set(0, ((total - 1) / 2 - i) * sp, 0);
      }
    } else if (mode === 'grid') {
      const cols = Math.ceil(Math.sqrt(total));
      const rows = Math.ceil(total / cols);
      for (let i = 0; i < total; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        instances[i].group.position.set((c - (cols - 1) / 2) * sp, ((rows - 1) / 2 - r) * sp, 0);
      }
    } else {
      let s = (0x9e3779b9 ^ total) >>> 0;
      const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s / 0x100000000 - 0.5) * 2; };
      instances[0].group.position.set(0, 0, 0);
      for (let i = 1; i < total; i++) {
        instances[i].group.position.set(rnd() * sp, rnd() * sp, rnd() * sp);
      }
    }
  }

  function buildSwordMeshes(positions) {
    const meshGeo = new THREE.BufferGeometry();
    meshGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    meshGeo.computeBoundingSphere();
    const sphere = meshGeo.boundingSphere;
    meshGeo.translate(-sphere.center.x, -sphere.center.y, -sphere.center.z);
    const scale = 1.4 / sphere.radius;
    meshGeo.scale(scale, scale, scale);
    meshGeo.computeBoundingBox();
    const size = new THREE.Vector3();
    meshGeo.boundingBox.getSize(size);
    if (size.x > size.y && size.x >= size.z) {
      meshGeo.rotateZ(Math.PI / 2);
    } else if (size.z > size.y && size.z >= size.x) {
      meshGeo.rotateX(-Math.PI / 2);
    }
    sharedWireGeo = new THREE.WireframeGeometry(meshGeo);
    swordMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    swordMaterialR = new THREE.LineBasicMaterial({
      color: 0xff007f, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    swordMaterialB = new THREE.LineBasicMaterial({
      color: 0x0090ff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const flat = meshGeo.attributes.position.array;
    const triCount = flat.length / 9;
    const verts = [];
    for (let i = 0; i < triCount; i++) {
      if ((i % SOURCE_VERTEX_STRIDE) !== 0) continue;
      const o = i * 9;
      verts.push(flat[o + 0], flat[o + 1], flat[o + 2]);
    }
    sourceVerts = new Float32Array(verts);
    syncInstanceCount();
    applyArrangement();
  }

  function initThree() {
    if (typeof THREE === 'undefined') return false;
    renderer = new THREE.WebGLRenderer({ canvas: canvas3d, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, canvas3d.clientWidth / canvas3d.clientHeight, 0.1, 100);
    camera.position.set(0, 0.2, 4.6);
    camera.lookAt(0, 0, 0);
    /* Three nested groups: outerTransformGroup (user rot/pos from STL Object
       knobs) → swordTiltGroup (fixed baseline pose) → swordGroup (instance
       pool). See sword.js for the rationale. */
    outerTransformGroup = new THREE.Group();
    scene.add(outerTransformGroup);
    swordTiltGroup = new THREE.Group();
    swordTiltGroup.rotation.z = SATQ_TILT_Z;
    outerTransformGroup.add(swordTiltGroup);
    swordGroup = new THREE.Group();
    swordTiltGroup.add(swordGroup);
    sparkMaterial = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 1.0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    /* Halo material: dimmer, shared across instances. Two halo copies per
       instance (±X offset) fake spark thickness on platforms where
       LineBasicMaterial.linewidth is capped to 1 (Chromium / OBS). */
    sparkHaloMaterial = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    if (!initialLoadStarted) {
      initialLoadStarted = true;
      _ensureSatqLoaded()
        .then(positions => buildSwordMeshes(positions))
        .catch(err => { console.error('[save-the-queen] STL load failed:', err); });
    } else if (_satqSTLCache) {
      buildSwordMeshes(_satqSTLCache);
    }
    resizeRenderer();
    return true;
  }

  function spawnSparksForInstance(inst, burst) {
    if (!sourceVerts) return;
    const count = Math.round(2 + burst * (4 + intensity() * 12));
    const vertCount = sourceVerts.length / 3;
    const distNorm = sparkDistance();
    const velMult = 0.4 + distNorm * 1.6;
    const lifeMult = 0.7 + distNorm * 0.7;
    let spawned = 0;
    for (let s = 0; s < SPARK_MAX && spawned < count; s++) {
      if (inst.sparks[s].life > 0) continue;
      const vIdx = Math.floor(Math.random() * vertCount);
      const ox = sourceVerts[vIdx * 3 + 0];
      const oy = sourceVerts[vIdx * 3 + 1];
      const oz = sourceVerts[vIdx * 3 + 2];
      const dx = (Math.random() - 0.5);
      const dy = (Math.random() - 0.3);
      const dz = (Math.random() - 0.5);
      const dl = Math.hypot(dx, dy, dz) || 1;
      const speed = (0.8 + Math.random() * 1.4 + burst * 0.6) * velMult;
      const sp = inst.sparks[s];
      sp.x0 = ox; sp.y0 = oy; sp.z0 = oz;
      sp.vx = dx / dl * speed;
      sp.vy = dy / dl * speed;
      sp.vz = dz / dl * speed;
      sp.life = (0.45 + Math.random() * 0.2) * lifeMult;
      sp.maxLife = sp.life;
      spawned++;
    }
  }

  return {
    start() {
      if (typeof THREE === 'undefined') return;
      if (!renderer && !initThree()) return;
      if (_satqSTLCache && !sharedWireGeo) buildSwordMeshes(_satqSTLCache);
      driveEMA = 0; motionEMA = 0; accentEMA = 0; beatEMA = 0; lastBeat = 0;
      for (const inst of instances) {
        inst.rotY = 0;
        for (let i = 0; i < SPARK_MAX; i++) inst.sparks[i].life = 0;
      }
      lastFrame = performance.now();
      resizeRenderer();
    },
    onResize() { resizeRenderer(); },
    draw(now) {
      if (!renderer) return;
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;

      syncInstanceCount();
      applyArrangement();

      let driveTarget = 0, motionTarget = 0, accentTarget = 0;
      if (micActive && frequencies && frequencies.length >= 16) {
        const low = bandLevel(0, 2);
        const voice = bandLevel(1, 8);
        const presence = bandLevel(8, 16);
        const rms = waveformLevel();
        const rawDrive = Math.max(0, voice * 0.95 + presence * 0.15 - low * 0.35);
        const rawMotion = Math.max(rawDrive * 0.9, voice * 0.35 + rms * 0.55);
        const rawAccent = Math.max(0, presence * 0.9 + rawDrive * 0.15);
        driveTarget = applyAudioGate(rawDrive);
        motionTarget = applyAudioGate(rawMotion);
        accentTarget = applyAudioGate(rawAccent);
      } else if (cfgIdleAnim) {
        driveTarget = 0.14 + 0.10 * Math.sin(now / 1200);
        motionTarget = 0.18 + 0.08 * Math.sin(now / 900 + 0.7);
        accentTarget = 0.12 + 0.06 * Math.sin(now / 700 + 1);
      }
      const alpha = smoothingAlpha();
      driveEMA += (driveTarget - driveEMA) * alpha;
      motionEMA += (motionTarget - motionEMA) * alpha;
      accentEMA += (accentTarget - accentEMA) * Math.min(0.32, alpha * 1.4);
      const prevBeatEMA = beatEMA;
      beatEMA += (driveTarget - beatEMA) * Math.max(0.05, alpha * 0.55);
      let beatBurst = 0;
      const smoothPct = Math.max(0, Math.min(100, cfgSTLObject.smoothing ?? 70));
      const beatCooldown = 180 + (smoothPct / 100) * 220;
      const attack = Math.max(0, driveTarget - prevBeatEMA);
      if (micActive && attack > 0.06 && driveTarget > 0.08 && driveTarget > prevBeatEMA * 1.18 + 0.04 && now - lastBeat > beatCooldown) {
        beatBurst = Math.min(1.5, attack * 2.6);
        for (const inst of instances) spawnSparksForInstance(inst, beatBurst);
        lastBeat = now;
      } else if (cfgIdleAnim && !micActive && now - lastBeat > 1500) {
        beatBurst = 0.6;
        for (const inst of instances) spawnSparksForInstance(inst, beatBurst);
        lastBeat = now;
      }

      const motionClamped = Math.min(1.25, motionEMA);
      const driveClamped  = Math.min(1.25, driveEMA);
      const pulse  = 1 + driveClamped * 0.16 + motionClamped * 0.08;
      const wobbleX = Math.sin(now / 3200) * (0.10 + Math.min(1, motionEMA) * 0.08);
      const spinDelta = dt * (0.28 + motionClamped * 0.95);

      const zoomNorm = cfgSTLObject.zoom / 100;
      camera.position.z = 6.5 - zoomNorm * 3.5;
      if (outerTransformGroup) {
        outerTransformGroup.rotation.set(
          cfgSTLObject.rotX * DEG2RAD,
          cfgSTLObject.rotY * DEG2RAD,
          cfgSTLObject.rotZ * DEG2RAD,
        );
        outerTransformGroup.position.set(cfgSTLObject.posX, cfgSTLObject.posY, cfgSTLObject.posZ);
      }

      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      const rgb = getColor(colorT);
      if (swordMaterial) {
        swordMaterial.color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
        swordMaterial.opacity = Math.min(1, 0.82 + driveEMA * 0.18);
      }
      const chroma = Math.min(1, accentEMA);
      const chromOff = 0.012 + chroma * 0.05;
      if (swordMaterialR && swordMaterialB) {
        swordMaterialR.opacity = chroma * 0.65;
        swordMaterialB.opacity = chroma * 0.65;
      }

      const thickN = sparkThickness();
      if (sparkMaterial) sparkMaterial.linewidth = 1 + thickN * 3;
      if (sparkHaloMaterial) sparkHaloMaterial.opacity = 0.45 * thickN;
      const haloOff = thickN * 0.05;
      const haloVisible = thickN > 0.01;

      const spkBaseColor = getColor(colorT + 0.6);
      const spkAccentColor = getColor(colorT + 1.2);
      const spinBucket = Math.max(0, Math.min(100, cfgSTLObject.spinAxis ?? 50));
      const spinAxis = spinBucket < 33 ? 'x' : spinBucket < 67 ? 'y' : 'z';
      for (const inst of instances) {
        inst.rotY += spinDelta;
        inst.group.rotation.x = (spinAxis === 'x') ? inst.rotY : wobbleX;
        inst.group.rotation.y = (spinAxis === 'y') ? inst.rotY : 0;
        inst.group.rotation.z = (spinAxis === 'z') ? inst.rotY : 0;
        inst.group.scale.set(pulse, pulse, pulse);
        if (inst.wireR && inst.wireB) {
          inst.wireR.position.set(-chromOff, 0, 0);
          inst.wireB.position.set(chromOff, 0, 0);
        }
        if (inst.sparkHaloA && inst.sparkHaloB) {
          inst.sparkHaloA.position.set(haloOff, 0, 0);
          inst.sparkHaloB.position.set(-haloOff, 0, 0);
          inst.sparkHaloA.visible = haloVisible;
          inst.sparkHaloB.visible = haloVisible;
        }
        const sp_pos = inst.sparkPositions;
        const sp_col = inst.sparkColors;
        for (let s = 0; s < SPARK_MAX; s++) {
          const sp = inst.sparks[s];
          const o = s * 6;
          if (sp.life <= 0) {
            sp_pos[o + 0] = sp_pos[o + 1] = sp_pos[o + 2] = 0;
            sp_pos[o + 3] = sp_pos[o + 4] = sp_pos[o + 5] = 0;
            sp_col[o + 0] = sp_col[o + 1] = sp_col[o + 2] = 0;
            sp_col[o + 3] = sp_col[o + 4] = sp_col[o + 5] = 0;
            continue;
          }
          const age = sp.maxLife - sp.life;
          const x1 = sp.x0 + sp.vx * age;
          const y1 = sp.y0 + sp.vy * age;
          const z1 = sp.z0 + sp.vz * age;
          sp_pos[o + 0] = sp.x0; sp_pos[o + 1] = sp.y0; sp_pos[o + 2] = sp.z0;
          sp_pos[o + 3] = x1;    sp_pos[o + 4] = y1;    sp_pos[o + 5] = z1;
          const fade = sp.life / sp.maxLife;
          const r0 = (spkAccentColor[0] / 255) * fade;
          const g0 = (spkAccentColor[1] / 255) * fade;
          const b0 = (spkAccentColor[2] / 255) * fade;
          const r1 = (spkBaseColor[0]   / 255) * fade * 0.4;
          const g1 = (spkBaseColor[1]   / 255) * fade * 0.4;
          const b1 = (spkBaseColor[2]   / 255) * fade * 0.4;
          sp_col[o + 0] = r0; sp_col[o + 1] = g0; sp_col[o + 2] = b0;
          sp_col[o + 3] = r1; sp_col[o + 4] = g1; sp_col[o + 5] = b1;
          sp.life -= dt;
        }
        inst.sparkGeometry.attributes.position.needsUpdate = true;
        inst.sparkGeometry.attributes.color.needsUpdate = true;
      }

      renderer.render(scene, camera);
    },
  };
};
