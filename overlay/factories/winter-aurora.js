/* ── winter-aurora (3D scene on the scene kit) ──
   A low rise of snow with six pines and a log cabin floats in the box. Behind and
   above it hang three curtains of aurora: added light, never a filled shape. The
   voice travels along each curtain as a wave of taller, brighter rays; the low end
   keeps the rays green, the high end lifts the violet tops, and a beat flushes the
   hems pink. The aurora is also a real light, high behind the land, so the pines
   throw their shadows toward the viewer and the snow brightens with the voice.
   Snow falls, more of it with volume and beats. The cabin's window is a small fire
   that keeps its own time. Built on TimbreScene (overlay/scene-kit.js): the kit
   owns the renderer, camera, placement, afterglow and disposal; this file only
   builds and animates. */
VIZ_FACTORIES['winter-aurora'] = TimbreScene.factory(function () {
  const HIST = 32;            // samples of voice history along a curtain
  const HIST_HZ = 12;         // history samples a second: a syllable crosses in about 2.7 s
  const FLAKES = 220, STARS = 120;
  const BACK = 0.55;          // the land sits this far behind the frame's centre

  // (z, hem height, ray height, phase, travel: 1 left to right, -1 right to left, 0 centre outward, slope, arch)
  const CURTAINS = [
    [-3.0, 1.9, 3.2, 0.0, 1, 0.55, 0.3],
    [-4.3, 2.45, 3.5, 2.1, -1, -0.75, 0.0],
    [-5.8, 3.0, 3.8, 4.4, 0, 0.2, 0.55],
  ];
  const CURTAIN_LENGTH = 19;
  const PINES = [[-2.35, -0.55, 1.2], [-1.5, 0.3, 0.78], [1.8, -0.7, 1.35], [2.55, 0.15, 0.68], [0.95, -1.15, 0.98], [-0.4, -1.2, 1.1]];   // (x, z, scale)
  const TIERS = [[0.66, 0.7, 0.42], [0.52, 0.62, 0.78], [0.4, 0.54, 1.1], [0.26, 0.5, 1.38]];                                           // (radius, height, base y)
  const DRIFTS = [[-3.3, 1.0, 0.55], [3.1, 1.15, 0.45], [1.0, 1.75, 0.38], [-1.3, 1.8, 0.32]];                                          // (x, z, radius)
  const CABIN = [0.3, 0.5, -0.3];                                                                                                       // (x, z, turn)

  // The rise everything stands on: (half width, height, half depth), gently uneven.
  const RISE = [3.4, 0.34, 1.75];
  const riseHeight = (x, z) => {
    const q = 1 - (x / RISE[0]) * (x / RISE[0]) - (z / RISE[2]) * (z / RISE[2]);
    return q <= 0 ? 0 : RISE[1] * Math.sqrt(q) * (1 + 0.18 * Math.sin(2.1 * x + 0.5) * Math.sin(3.1 * z + 1.0));
  };

  // A setting, read live so the control panel's sliders apply at once.
  const knob = (name) => {
    const v = typeof perViz !== 'undefined' && perViz['winter-aurora'];
    return v && typeof v[name] === 'number' ? v[name] : 50;
  };

  const AURORA_VERT = `
    uniform float uTime, uPhase, uZ, uHem, uHeight, uLen, uSlope, uArch;
    uniform float uHist[${HIST}];
    varying vec2 vUv;
    varying float vAmp;
    float hist(float a) {
      float x = clamp(a, 0.0, 1.0) * ${HIST - 1}.0, i = floor(x), f = x - i;
      f = f * f * (3.0 - 2.0 * f);
      return mix(uHist[int(i)], uHist[int(min(i + 1.0, ${HIST - 1}.0))], f);
    }
    void main() {
      float u = uv.x, v = uv.y, t = uTime;
      float amp = hist(u);   // the voice as it stands at this point of the curtain
      // The curtain's path seen from above: slow meanders and a travelling fold.
      float x = (u - 0.5) * uLen + 0.35 * sin(u * 11.0 + t * 0.17 + uPhase * 1.7);
      float z = uZ + 0.55 * sin(u * 7.0 + t * 0.21 + uPhase) + 0.28 * sin(u * 17.0 - t * 0.33 + uPhase * 2.3) + 0.1 * sin(u * 41.0 + t * 0.5);
      float hem = uHem + uSlope * (u - 0.5) + uArch * (1.0 - 4.0 * (u - 0.5) * (u - 0.5))
        + 0.3 * sin(u * 5.0 + t * 0.13 + uPhase) + 0.14 * sin(u * 13.0 - t * 0.19 + uPhase * 1.3) - 0.2 * amp;
      float h = uHeight * (0.4 + 0.6 * amp);
      vUv = uv;
      vAmp = amp;
      gl_Position = projectionMatrix * viewMatrix * vec4(x, hem + v * h, z - v * 0.6, 1.0);
    }`;
  const AURORA_FRAG = `
    precision highp float;
    uniform float uTime, uPhase, uGlow, uKick, uLow, uHigh;
    uniform vec3 uGreen, uTeal, uViolet, uPink;
    varying vec2 vUv;
    varying float vAmp;
    float hash(float n) { return fract(sin(n) * 43758.5453); }
    float noise(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
    void main() {
      float u = vUv.x, v = vUv.y;
      // Rays: fine upright streaks that drift along the curtain, over broader bands.
      float rays = (0.4 + 0.6 * noise(u * 150.0 + uTime * 0.35 + uPhase * 10.0)) * (0.55 + 0.45 * noise(u * 37.0 - uTime * 0.22 + uPhase * 3.0));
      float reach = 0.5 + 0.5 * noise(u * 60.0 + uPhase * 7.0 + uTime * 0.15);
      // A crisp lower hem, then a long fade upward; some rays reach higher than others.
      float body = smoothstep(0.0, 0.07, v) * exp(-v * 2.2 / reach) * smoothstep(1.0, 0.72, v);
      float hem = smoothstep(0.0, 0.03, v) * smoothstep(0.13, 0.03, v);
      float ends = smoothstep(0.0, 0.2, u) * smoothstep(1.0, 0.8, u);
      float bright = 0.13 + uGlow * (0.3 + 0.7 * vAmp) + 0.35 * uKick;
      float I = (body * rays + 0.22 * hem * rays) * ends * bright;
      vec3 col = mix(uGreen, uTeal, smoothstep(0.1, 0.4, v) * (0.4 - 0.25 * uLow));
      col = mix(col, uViolet, smoothstep(0.12, 0.6, v) * (0.6 + 0.4 * uHigh));
      col = mix(col, uPink, hem * min(1.0, 0.25 * vAmp + uKick));
      gl_FragColor = vec4(col * I, 1.0);
    }`;

  // One tier of a pine in unit size: a skirt of boughs that droops toward a
  // scalloped rim (apex at y = 1, rim radius about 1, dipping to y = -0.2). With
  // \`snow\` it is the snow lying on that tier: the same skirt, a little proud of
  // the boughs, reaching an uneven way down.
  function tierGeometry(THREE, snow) {
    const M = 12, N = 56, pos = [], idx = [];
    for (let j = 0; j <= M; j++) {
      for (let i = 0; i <= N; i++) {
        const phi = (i / N) * Math.PI * 2;
        const down = snow ? 0.8 + 0.1 * Math.cos(7 * phi + 1.3) + 0.06 * Math.cos(3 * phi) : 1;
        const t = (j / M) * down;
        const r = t * (1 + 0.14 * t * Math.cos(7 * phi)) * (snow ? 1.06 : 1);
        pos.push(r * Math.cos(phi), 1 - t - 0.2 * t * t + (snow ? 0.035 : 0), r * Math.sin(phi));
      }
    }
    for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
      const p = j * (N + 1) + i, q = p + N + 1;
      idx.push(p, p + 1, q, q, p + 1, q + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // The rise: a low dome of snow, ring by ring from the top out to its rim.
  function riseGeometry(THREE) {
    const M = 26, N = 72, pos = [], idx = [];
    for (let j = 0; j <= M; j++) {
      const r = Math.sin((j / M) * Math.PI / 2);
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2, x = RISE[0] * r * Math.cos(a), z = RISE[2] * r * Math.sin(a);
        pos.push(x, riseHeight(x, z), z);
      }
    }
    for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
      const p = j * (N + 1) + i, q = p + N + 1;
      idx.push(p, p + 1, q, q, p + 1, q + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function logCanvas() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#7a4c2a'; x.fillRect(0, 0, 64, 64);
    for (let j = 0; j < 6; j++) {
      x.fillStyle = '#8f5d35'; x.fillRect(0, j * 11 + 1, 64, 5);
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, j * 11 + 9, 64, 2);
    }
    return c;
  }

  // A curtain's copy of the history, laid out along its length: how long ago the voice now
  // at each point was spoken depends on which way the curtain's waves travel.
  function layOut(byAge, travel, out) {
    for (let i = 0; i < HIST; i++) {
      const u = i / (HIST - 1), age = travel > 0 ? u : travel < 0 ? 1 - u : Math.abs(u - 0.5) * 2;
      const x = age * (HIST - 1), j = Math.floor(x), f = x - j;
      out[i] = byAge[j] * (1 - f) + byAge[Math.min(j + 1, HIST - 1)] * f;
    }
  }

  const curtains = [];        // { material, travel, along }
  const flakes = [];
  const hist = new Float32Array(HIST), ring = new Float32Array(HIST);
  let ringAt = 0, sinceSample = 0, lastFlame = 0;
  let flakeMesh = null, dummy = null, auroraLight = null, windowLight = null, windowGlow = null, windowPane = null;
  let stars = null, starSeed = null;
  const s = { glow: 0, bright: 0, low: 0, high: 0, kick: 0, light: 0, orbit: 0, snowTarget: 0, falling: 0, fallingHeight: 0, landed: 0, landedHigh: 0 };

  function build(k) {
    const { THREE, scene } = k;
    dummy = new THREE.Object3D();
    const std = (hex, roughness, extra) => k.keep(new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness, metalness: 0 }, extra)));
    const solid = (parent, geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const snowMat = std(0xf1f5ff, 0.85);

    // Moonlight from behind and a weak fill from the front keep the solids readable
    // over a dark game. They do not light the ground.
    const rim = new THREE.DirectionalLight(0xa9c0ff, 1.5);
    rim.position.set(-4, 5, -6);
    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.8);
    fill.position.set(2, 3, 6);
    scene.add(rim, fill, new THREE.AmbientLight(0x4a5c7c, 1.0));

    // The aurora as a light: high and behind, shining down and forward, so the
    // pines throw their shadows toward the viewer.
    auroraLight = k.practical(new THREE.SpotLight(0x66ffa0, 18, 22, 0.62, 0.95, 1.4));
    auroraLight.position.set(-0.8, 6.6, -4.6);
    auroraLight.target.position.set(0, 0, 0.9);
    auroraLight.castShadow = true;
    auroraLight.shadow.mapSize.set(1024, 1024);
    auroraLight.shadow.camera.near = 2;
    auroraLight.shadow.camera.far = 16;
    auroraLight.shadow.bias = -0.002;
    auroraLight.shadow.normalBias = 0.03;
    scene.add(auroraLight, auroraLight.target);

    const land = new THREE.Group();
    land.position.z = -BACK;
    scene.add(land);
    solid(land, k.keep(riseGeometry(THREE)), snowMat, 0, 0, 0).castShadow = false;
    const driftGeo = k.keep(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2));
    for (const [x, z, r] of DRIFTS) solid(land, driftGeo, snowMat, x, 0, z).scale.set(r * 1.7, r * 0.45, r);

    // Pines: four tiers of drooping boughs, each with snow lying on its upper part.
    const trunkGeo = k.keep(new THREE.CylinderGeometry(0.7, 1, 1, 10));
    trunkGeo.translate(0, 0.5, 0);
    const inst = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = true; m.receiveShadow = true; land.add(m); return m; };
    const boughs = inst(k.keep(tierGeometry(THREE, false)), std(0x1d4a35, 0.9, { side: THREE.DoubleSide }), PINES.length * TIERS.length);
    const caps = inst(k.keep(tierGeometry(THREE, true)), std(0xf1f5ff, 0.85, { side: THREE.DoubleSide }), PINES.length * TIERS.length);
    const trunks = inst(trunkGeo, std(0x4a3222, 0.9), PINES.length);
    let n = 0;
    PINES.forEach(([x, z, sc], p) => {
      const y0 = riseHeight(x, z) - 0.03;
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(x, y0, z); dummy.scale.set(0.075 * sc, 0.55 * sc, 0.075 * sc); dummy.updateMatrix();
      trunks.setMatrixAt(p, dummy.matrix);
      TIERS.forEach(([r, h, base], tier) => {
        dummy.rotation.set(0, p * 1.3 + tier * 0.45, 0);   // no two tiers' scallops line up
        dummy.position.set(x, y0 + base * sc, z); dummy.scale.set(r * sc, h * sc, r * sc); dummy.updateMatrix();
        boughs.setMatrixAt(n, dummy.matrix);
        caps.setMatrixAt(n++, dummy.matrix);
      });
    });

    // The cabin: log walls, a snow-laden roof, plank gables, a door, a chimney and one lit window.
    const cabin = new THREE.Group();
    cabin.position.set(CABIN[0], riseHeight(CABIN[0], CABIN[1]) - 0.04, CABIN[1]);
    cabin.rotation.y = CABIN[2];
    land.add(cabin);
    const logs = k.keep(new THREE.CanvasTexture(logCanvas()));
    logs.colorSpace = THREE.SRGBColorSpace;
    solid(cabin, k.keep(new THREE.BoxGeometry(1.1, 0.6, 0.8)), std(0xffffff, 0.85, { map: logs }), 0, 0.3, 0);
    const roofPitch = Math.atan2(0.36, 0.4);
    const slab = k.keep(new THREE.BoxGeometry(1.36, 0.1, 0.5 / Math.cos(roofPitch)));
    solid(cabin, slab, snowMat, 0, 0.785, 0.25).rotation.x = roofPitch;
    solid(cabin, slab, snowMat, 0, 0.785, -0.25).rotation.x = -roofPitch;
    const gable = new THREE.Shape();
    gable.moveTo(-0.4, 0.6); gable.lineTo(0.4, 0.6); gable.lineTo(0, 0.95); gable.closePath();
    const gableGeo = k.keep(new THREE.ShapeGeometry(gable));
    gableGeo.rotateY(Math.PI / 2);
    const gableMat = std(0x6b4226, 0.85, { side: THREE.DoubleSide });
    solid(cabin, gableGeo, gableMat, 0.55, 0, 0);
    solid(cabin, gableGeo, gableMat, -0.55, 0, 0);
    const dark = std(0x3d2414, 0.8);
    solid(cabin, k.keep(new THREE.BoxGeometry(0.2, 0.36, 0.03)), dark, -0.27, 0.18, 0.405);
    solid(cabin, k.keep(new THREE.BoxGeometry(0.16, 0.46, 0.16)), std(0x7c8088, 0.9), 0.33, 0.93, -0.2);
    solid(cabin, k.keep(new THREE.BoxGeometry(0.21, 0.06, 0.21)), snowMat, 0.33, 1.19, -0.2);
    windowPane = new THREE.Mesh(k.keep(new THREE.PlaneGeometry(0.27, 0.21)), k.keep(new THREE.MeshBasicMaterial({ color: 0xffffff })));
    windowPane.position.set(0.2, 0.34, 0.402);
    cabin.add(windowPane);
    solid(cabin, k.keep(new THREE.BoxGeometry(0.29, 0.018, 0.02)), dark, 0.2, 0.34, 0.408).castShadow = false;
    solid(cabin, k.keep(new THREE.BoxGeometry(0.018, 0.23, 0.02)), dark, 0.2, 0.34, 0.408).castShadow = false;
    windowGlow = new THREE.Sprite(k.keep(k.addLight(new THREE.SpriteMaterial({ map: k.glowTexture(255, 170, 84), depthTest: false }))));
    windowGlow.position.set(0.2, 0.34, 0.45);
    windowGlow.renderOrder = 10;
    cabin.add(windowGlow);
    windowLight = k.practical(new THREE.PointLight(0xffa450, 2.2, 7, 2));
    windowLight.position.set(0.2, 0.34, 0.66);
    windowLight.castShadow = true;
    windowLight.shadow.mapSize.set(512, 512);
    windowLight.shadow.camera.near = 0.05;
    windowLight.shadow.camera.far = 7;
    windowLight.shadow.bias = -0.004;
    windowLight.shadow.normalBias = 0.03;
    cabin.add(windowLight);

    // The aurora: three curtains of added light, shaped in the vertex shader.
    const sheet = k.keep(new THREE.PlaneGeometry(1, 1, 220, 1));   // the shader shapes it along its length only
    for (const [z, hem, height, phase, travel, slope, arch] of CURTAINS) {
      const along = new Float32Array(HIST);
      const mat = k.keep(k.addLight(new THREE.ShaderMaterial({
        vertexShader: AURORA_VERT, fragmentShader: AURORA_FRAG, side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 }, uPhase: { value: phase }, uZ: { value: z }, uHem: { value: hem }, uHeight: { value: height },
          uLen: { value: CURTAIN_LENGTH }, uSlope: { value: slope }, uArch: { value: arch }, uHist: { value: along },
          uGlow: { value: 0 }, uKick: { value: 0 }, uLow: { value: 0 }, uHigh: { value: 0 },
          uGreen: { value: new THREE.Vector3(0.12, 1.0, 0.42) }, uTeal: { value: new THREE.Vector3(0.08, 0.75, 0.95) },
          uViolet: { value: new THREE.Vector3(0.6, 0.22, 1.0) }, uPink: { value: new THREE.Vector3(1.0, 0.25, 0.5) },
        },
      })));
      const mesh = new THREE.Mesh(sheet, mat);
      mesh.frustumCulled = false;   // the shader moves it
      scene.add(mesh);
      curtains.push({ material: mat, travel, along });
    }

    // Stars: small points of added light behind the curtains.
    const starPos = new Float32Array(STARS * 3);
    starSeed = new Float32Array(STARS * 2);
    for (let i = 0; i < STARS; i++) {
      starPos[i * 3] = -10 + 20 * Math.random(); starPos[i * 3 + 1] = 1.6 + 5.4 * Math.random(); starPos[i * 3 + 2] = -8.5;
      starSeed[i * 2] = 0.7 + 2.6 * Math.random(); starSeed[i * 2 + 1] = 6.28 * Math.random();
    }
    const starGeo = k.keep(new THREE.BufferGeometry());
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(STARS * 3), 3));
    stars = new THREE.Points(starGeo, k.keep(k.addLight(new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true, map: k.glowTexture(255, 255, 255) }))));
    stars.frustumCulled = false;
    scene.add(stars);

    // Snowflakes.
    flakeMesh = new THREE.InstancedMesh(k.keep(new THREE.SphereGeometry(1, 6, 4)), std(0xffffff, 0.8, { emissive: 0x93a7c4, emissiveIntensity: 0.85 }), FLAKES);
    flakeMesh.frustumCulled = false;
    flakeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < FLAKES; i++) flakes.push({ on: false, x: 0, y: 0, z: 0, speed: 0.3 + 0.4 * Math.random(), sway: 6.28 * Math.random(), size: 0.013 + 0.011 * Math.random(), vx: 0 });
    scene.add(flakeMesh);
  }

  function update(k, audio, now, dt) {
    const t = now / 1000, follow = TimbreScene.follow;
    s.orbit = k.orbit = Math.sin(0.13 * t) * 0.16 * knob('cameraDrift') / 50;

    // Loudness for the aurora: quick to rise, slow to settle. The setting scales
    // how far the voice swings it; below the default it also flattens the waves.
    const drive = knob('auroraGlow') / 50, waves = Math.min(1, drive);
    s.glow = follow(s.glow, audio.flame, audio.flame > s.glow ? 14 : 1.4, dt);
    s.bright = Math.min(1.25, s.glow * drive);
    s.kick = audio.kick * waves;
    let low = 0, high = 0;
    if (micActive && frequencies && frequencies.length >= 32) {
      for (let i = 0; i < 4; i++) low += frequencies[i];
      for (let i = 8; i < 32; i++) high += frequencies[i];
      low = Math.min(1, (low / 4 / 255) * cfgGain); high = Math.min(1, (high / 24 / 255) * cfgGain * 3);
    } else {
      low = audio.level * (0.6 + 0.4 * Math.sin(t * 0.31)); high = audio.level * (0.6 + 0.4 * Math.sin(t * 0.23 + 2));
    }
    s.low = follow(s.low, low, 6, dt); s.high = follow(s.high, high, 4, dt);

    // Voice history: sampled at a fixed rate, then laid out by age for the shader,
    // with the live level at age 0, so a wave moves smoothly at any frame rate.
    // A sample that falls inside this frame holds the level at its own moment, between the
    // last frame's and this one's, so a long frame does not write the same value twice.
    sinceSample += dt;
    for (let i = 0; sinceSample >= 1 / HIST_HZ && i < HIST; i++) {
      sinceSample -= 1 / HIST_HZ;
      const w = dt > 0 ? Math.max(0, Math.min(1, 1 - sinceSample / dt)) : 1;
      ringAt = (ringAt + 1) % HIST; ring[ringAt] = lastFlame + (audio.flame - lastFlame) * w;
    }
    if (sinceSample >= 1 / HIST_HZ) sinceSample = 0;   // a frame longer than the whole history
    lastFlame = audio.flame;
    const frac = sinceSample * HIST_HZ, past = (j) => ring[(ringAt - Math.min(j, HIST - 1) + HIST * 2) % HIST];
    for (let i = 0; i < HIST; i++) {
      const a = i - frac;
      if (a <= 0) { const w = frac > 1e-6 ? -a / frac : 1; hist[i] = (ring[ringAt] * (1 - w) + audio.flame * w) * waves; continue; }
      const j = Math.floor(a), f = a - j;
      hist[i] = (past(j) * (1 - f) + past(j + 1) * f) * waves;
    }
    for (const c of curtains) {
      layOut(hist, c.travel, c.along);
      const u = c.material.uniforms;
      u.uTime.value = t; u.uGlow.value = s.bright; u.uKick.value = s.kick; u.uLow.value = s.low; u.uHigh.value = s.high;
    }

    // The aurora's light on the snow: green, turning toward violet with the high end.
    auroraLight.color.setRGB(0.3 + 0.45 * s.high, 1.0 - 0.35 * s.high, 0.55 + 0.4 * s.high);
    s.light = auroraLight.intensity = 18 + 150 * s.bright + 60 * s.kick;

    // The window: a fire inside, steady with a small flicker of its own.
    const fire = 0.85 + 0.15 * Math.sin(9.1 * t) * Math.sin(5.3 * t + 1.3);
    windowLight.intensity = 2.4 * fire;
    windowPane.material.color.setRGB(2.6 * fire, 1.45 * fire, 0.5 * fire);
    windowGlow.scale.setScalar(0.75 + 0.15 * fire);
    windowGlow.material.opacity = 0.55 * fire;

    // Stars twinkle, brighter with the high end; the setting says how many there are.
    const shown = Math.round(STARS * knob('starDensity') / 100);
    stars.geometry.setDrawRange(0, shown);
    const col = stars.geometry.attributes.color;
    for (let i = 0; i < shown; i++) {
      const b = (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * starSeed[i * 2] + starSeed[i * 2 + 1]))) * (0.35 + 0.9 * s.high);
      col.setXYZ(i, b * 0.85, b * 0.92, b);
    }
    col.needsUpdate = true;

    // Snow: how much falls follows volume and beats; a beat gusts it sideways. The count
    // only decides whether a flake that has landed sets off again: one in the air keeps falling.
    const target = Math.min(FLAKES, Math.round((22 + 60 * audio.flame + 70 * audio.burst) * knob('snowfall') / 50));
    const settle = Math.exp(-1.5 * dt);
    let falling = 0, height = 0;
    for (let i = 0; i < FLAKES; i++) {
      const f = flakes[i];
      if (f.on) {
        f.vx = audio.beat ? -0.6 + 2.2 * Math.random() : f.vx * settle;
        f.y -= f.speed * dt;
        f.x += (Math.sin(0.9 * t + f.sway) * 0.22 + f.vx) * dt;
        f.z += Math.cos(0.7 * t + f.sway) * 0.1 * dt;
        const above = f.y - riseHeight(f.x, f.z + BACK);
        if (above < 0.02) { f.on = false; s.landed++; if (above > s.landedHigh) s.landedHigh = above; }
      } else if (i < target) {
        f.on = true; f.vx = 0;
        f.x = -5.5 + 11 * Math.random(); f.y = 4.4 + 1.2 * Math.random(); f.z = -2.8 + 4.6 * Math.random();
      }
      if (f.on) { falling++; height += f.y; }
      // A flake shrinks to nothing over its last quarter of a unit.
      const size = f.on ? f.size * Math.max(0, Math.min(1, (f.y - riseHeight(f.x, f.z + BACK)) * 4)) : 0;
      dummy.position.set(f.x, f.y, f.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      flakeMesh.setMatrixAt(i, dummy.matrix);
    }
    flakeMesh.instanceMatrix.needsUpdate = true;
    s.snowTarget = target; s.falling = falling; s.fallingHeight = falling ? height / falling : 0;
  }

  return {
    frame: { width: 8.6, height: 5.3, center: [0, 1.85, 0] },
    fov: 30,
    pitch: 5,
    groundColor: 0xdfe8f6,
    cooling: [0.05, Infinity, 0.25],   // trailing light stays aurora-coloured: red goes first, green last
    build,
    update,
    debug() {
      return Object.assign({
        hist: Array.from(hist), curtains: curtains.map((c) => Array.from(c.along)),
        stars: stars ? stars.geometry.drawRange.count : 0,
      }, s);
    },
  };
});
