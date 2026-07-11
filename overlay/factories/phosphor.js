/* ── phosphor (stacked oscilloscope history tape) ──
   Each frame writes the current 64-sample waveform into a ring buffer of
   Line meshes; older lines slide back along -Z with fading opacity, giving
   a CRT phosphor history-tape look. Pure waveform viz extended into depth. */
VIZ_FACTORIES['phosphor'] = function () {
  const SLICE_MAX = 56;
  const SAMPLES = 64;
  let renderer = null, scene = null, camera = null, group = null;
  let lines = null, geometries = null, materials = null;
  let currentIdx = 0;
  let lastFrame = performance.now();
  function activeSliceCount() {
    const t = perViz['phosphor'].depth / 100;
    return Math.round(20 + t * (SLICE_MAX - 20));
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
    camera = new THREE.PerspectiveCamera(45, canvas3d.clientWidth / canvas3d.clientHeight, 0.1, 100);
    camera.position.set(0, 0.4, 2.4);
    camera.lookAt(0, 0, -3);
    group = new THREE.Group();
    scene.add(group);
    lines = new Array(SLICE_MAX);
    geometries = new Array(SLICE_MAX);
    materials = new Array(SLICE_MAX);
    for (let i = 0; i < SLICE_MAX; i++) {
      const positions = new Float32Array(SAMPLES * 3);
      for (let s = 0; s < SAMPLES; s++) {
        positions[s * 3 + 0] = (s / (SAMPLES - 1) - 0.5) * 3.0;
        positions[s * 3 + 1] = 0;
        positions[s * 3 + 2] = 0;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const m = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(g, m);
      group.add(line);
      lines[i] = line;
      geometries[i] = g;
      materials[i] = m;
    }
    resizeRenderer();
    return true;
  }
  return {
    start() {
      if (typeof THREE === 'undefined') return;
      if (!renderer && !initThree()) return;
      currentIdx = 0;
      lastFrame = performance.now();
      /* Wipe stale waveform data so old curves don't ghost in when re-entering. */
      for (let i = 0; i < SLICE_MAX; i++) {
        const arr = geometries[i].attributes.position.array;
        for (let s = 0; s < SAMPLES; s++) arr[s * 3 + 1] = 0;
        geometries[i].attributes.position.needsUpdate = true;
      }
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
      }
      /* Build the new waveform slice (real if mic active, synthetic for idle). */
      const slot = currentIdx;
      const arr = geometries[slot].attributes.position.array;
      const ampScale = 0.5 + bass * 0.4;
      if (micActive && waveform && waveform.length > 0) {
        const n = waveform.length;
        let sumSq = 0;
        for (let s = 0; s < SAMPLES; s++) {
          const wIdx = Math.min(n - 1, Math.floor((s / SAMPLES) * n));
          const dev = (waveform[wIdx] - 128) / 128;
          arr[s * 3 + 1] = dev * ampScale * cfgGain;
          sumSq += dev * dev;
        }
        rms = Math.sqrt(sumSq / SAMPLES) * cfgGain;
      } else if (cfgIdleAnim) {
        const t = now / 350;
        let sumSq = 0;
        for (let s = 0; s < SAMPLES; s++) {
          const u = (s / SAMPLES) * Math.PI * 4;
          const v = 0.18 * Math.sin(u + t) + 0.06 * Math.sin(u * 2.3 - t * 1.4);
          arr[s * 3 + 1] = v;
          sumSq += v * v;
        }
        rms = Math.sqrt(sumSq / SAMPLES);
      } else {
        for (let s = 0; s < SAMPLES; s++) arr[s * 3 + 1] = 0;
      }
      geometries[slot].attributes.position.needsUpdate = true;
      currentIdx = (currentIdx + 1) % SLICE_MAX;
      /* Lay slices out in Z by their age; fade older ones; recolor by palette + age. */
      const sliceCount = activeSliceCount();
      const zStride = (2.6 + treble * 1.5) / sliceCount;
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      for (let i = 0; i < SLICE_MAX; i++) {
        const age = (currentIdx - 1 - i + SLICE_MAX) % SLICE_MAX;
        if (age >= sliceCount) {
          lines[i].visible = false;
          continue;
        }
        lines[i].visible = true;
        lines[i].position.z = -age * zStride;
        const ageFrac = age / sliceCount;
        const fade = Math.pow(1 - ageFrac, 1.4);
        const rgb = getColor(colorT + ageFrac * 0.8);
        materials[i].color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
        materials[i].opacity = (0.25 + rms * 1.6) * fade;
      }
      renderer.render(scene, camera);
    },
  };
};
