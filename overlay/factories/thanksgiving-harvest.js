/* ── thanksgiving-harvest (3D scene on the scene kit) ──
   A wicker horn of plenty spilling a harvest toward the viewer: pumpkins,
   apples, gourds, corn, grapes and wheat. Three cream pillar candles among the
   spill flicker with the voice, each out of step with the others, and throw real
   light and shadow onto an invisible ground. Autumn leaves fall, more of them
   with volume and beats. Built on TimbreScene (overlay/scene-kit.js,
   scene-parts.js): the kit owns the renderer, camera, placement, afterglow and
   disposal; this file only builds and animates. */
VIZ_FACTORIES['thanksgiving-harvest'] = function () {
  // (x, z, height, fall rate per second, flicker phase, light colour)
  const CANDLES = [
    [0.3, -0.75, 1.15, 2.2, 0.0, 0xffa040],
    [2.55, -0.05, 0.8, 3.4, 2.1, 0xff9438],
    [-1.15, 1.55, 0.5, 4.6, 4.3, 0xffac50],
  ];
  const CANDLE_RADIUS = 0.13;
  const JITTER_HZ = 60;   // the random part of the flicker is redrawn this often, whatever the frame rate

  // (radius, x, z, colour, roughness, turn)
  const PUMPKINS = [
    [0.52, -0.3, 0.3, 0xe8741a, 0.5, 0.3],
    [0.37, 0.75, 0.85, 0xc9521a, 0.55, 1.1],
    [0.27, 1.55, 0.4, 0xe9dcc0, 0.6, 2.0],
  ];
  const APPLE_R = 0.17, RED = 0xb01c26, GREEN = 0x8fae2c;
  const APPLES = [[0.1, 1.25, RED], [0.55, 1.6, GREEN], [1.95, 1.2, RED], [2.2, 0.55, RED], [1.2, -0.75, GREEN]];
  const CORN = [[1.1, 1.65, 0.5], [-0.55, 1.35, -0.8]];   // (x, z, turn); the husk end is the base
  const GRAPES = [1.42, 1.08];
  const GOURD_STANDING = [1.0, -0.1, 0.85];               // (x, z, scale)
  const WHEAT_FROM = [-0.95, 0.55, -0.2];                 // where the stalks leave the mouth
  // Per stalk: (direction in plan from +x toward the viewer, reach in plan, sideways bow)
  const WHEAT = [[0.0, 1.62, 0.04], [0.15, 1.74, -0.03], [0.3, 1.6, 0.05], [0.45, 1.76, -0.04], [0.6, 1.58, 0.03], [0.75, 1.7, -0.05], [0.9, 1.54, 0.04]];
  const STALK_R = 0.011, EAR_LENGTH = 0.32, GRAINS = 18;
  const GROUND_LEAVES = 8, FALLING_LEAVES = 38;
  const LEAF_TINTS = [0xd9541e, 0xe8a13a, 0xb5261e, 0xc9781f, 0x8a3b12, 0xe0c040];

  // A Thanksgiving knob, read live so the control panel's sliders apply at once.
  const knob = (name) => {
    const v = typeof perViz !== 'undefined' && perViz['thanksgiving-harvest'];
    return v && typeof v[name] === 'number' ? v[name] : 50;
  };

  // ── Geometry ─────────────────────────────────────────────────────────────────

  // The horn: a tube along a centre line from the tail (t = 0) to the mouth
  // (t = 1), growing from radius 0.08 to 0.95, with coiled bands along it.
  function hornGeometry(THREE) {
    const M = 64, N = 32, pos = [], uvs = [], idx = [];
    const centre = (t, out) => out.set(-2.3 * (1 - t), 0.08 + 0.87 * Math.pow(t, 1.2) + 0.8 * Math.pow(1 - t, 2.4), -0.7 * (1 - t) * (1 - t));
    const up = new THREE.Vector3(0, 1, 0), c = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
    const T = new THREE.Vector3(), B = new THREE.Vector3(), Nn = new THREE.Vector3();
    for (let j = 0; j <= M; j++) {
      const t = j / M;
      centre(t, c);
      T.subVectors(centre(Math.min(1, t + 0.01), a), centre(Math.max(0, t - 0.01), b)).normalize();
      B.crossVectors(T, up).normalize();
      Nn.crossVectors(B, T);
      const r = (0.08 + 0.87 * Math.pow(t, 1.2)) * (1 + 0.04 * Math.sin(j * 1.9));   // the coiled bands
      for (let i = 0; i <= N; i++) {
        const ang = (i / N) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
        pos.push(c.x + r * (ca * Nn.x + sa * B.x), c.y + r * (ca * Nn.y + sa * B.y), c.z + r * (ca * Nn.z + sa * B.z));
        uvs.push(i / N, t);
      }
    }
    for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
      const p = j * (N + 1) + i, q = p + N + 1;
      idx.push(p, q, p + 1, q, q + 1, p + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function weaveCanvas() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#b98442'; x.fillRect(0, 0, 64, 64);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      x.fillStyle = (i + j) % 2 ? '#d9a55c' : '#8a5c26';
      x.fillRect(i * 16 + 1, j * 16 + 2, 14, 12);
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(i * 16 + 1, j * 16 + 12, 14, 2);
    }
    return c;
  }

  // An apple resting on y = 0, with a dimple round the stem and a flatter base.
  function appleGeometry(THREE, r) {
    const g = new THREE.SphereGeometry(r, 28, 20);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const dip = Math.exp(-(x * x + z * z) / (r * r) / 0.09);
      p.setY(i, (y > 0 ? y * (1 - 0.3 * dip) : y * (1 - 0.14 * dip) * 0.92) + r * 0.9);
    }
    g.computeVertexNormals();
    return g;
  }

  // Concatenate indexed geometries that share position, normal and uv.
  function merge(THREE, geos) {
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let v = 0, n = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array, v * 3);
      nor.set(g.attributes.normal.array, v * 3);
      uv.set(g.attributes.uv.array, v * 2);
      const src = g.index.array;
      for (let j = 0; j < src.length; j++) idx[n + j] = src[j] + v;
      v += g.attributes.position.count; n += src.length;
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
  }

  // How high a stalk lying across the spill must rest at (x, z): the top of the
  // pumpkin, apple, grapes, corn or gourd under that point, or the ground.
  function restHeight(x, z) {
    let h = 0;
    for (const [r, px, pz] of PUMPKINS) {
      const u = Math.hypot(x - px, z - pz) / (1.12 * r);
      if (u < 1) h = Math.max(h, r * (0.74 + 0.76 * Math.pow(Math.sqrt(1 - Math.pow(u, 2 / 0.58)), 0.8)));
    }
    for (const [ax, az] of APPLES) {
      const d = Math.hypot(x - ax, z - az);
      if (d < APPLE_R) h = Math.max(h, 0.15 + 0.7 * Math.sqrt(APPLE_R * APPLE_R - d * d));
    }
    const dg = Math.hypot(x - GRAPES[0], z - GRAPES[1]) / 0.3;
    if (dg < 1) h = Math.max(h, 0.42 * Math.sqrt(1 - dg * dg));
    for (const [cx, cz, turn] of CORN) {
      const ax = -Math.cos(turn), az = Math.sin(turn);
      const along = Math.max(-0.3, Math.min(0.3, (x - cx) * ax + (z - cz) * az));
      const d = Math.hypot(x - cx - ax * along, z - cz - az * along);
      if (d < 0.09) h = Math.max(h, 0.09 + Math.sqrt(0.0081 - d * d));
    }
    if (Math.hypot(x - GOURD_STANDING[0], z - GOURD_STANDING[1]) < 0.3 * GOURD_STANDING[2]) h = Math.max(h, 1.02 * GOURD_STANDING[2]);
    return h;
  }

  // A wheat stalk from inside the mouth out to (ex, ez), lying across whatever is
  // in the way: it rests on the tops it meets and slopes down between them, the
  // way a stiff stalk would. `bow` bends it slightly sideways.
  function stalkCurve(THREE, ex, ez, bow) {
    const S = 28, SAG = 0.55;
    const [ox, oy, oz] = WHEAT_FROM;
    const dx = ex - ox, dz = ez - oz, L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
    const xs = [], zs = [], s = [], rest = [], y = [];
    for (let j = 0; j <= S; j++) {
      const u = j / S, b = bow * Math.sin(Math.PI * u);
      xs[j] = ox + dx * u + nx * b; zs[j] = oz + dz * u + nz * b; s[j] = L * u;
      rest[j] = j === 0 ? oy : restHeight(xs[j], zs[j]) + STALK_R + 0.012;
    }
    for (let j = 0; j <= S; j++) {
      let m = STALK_R;
      for (let i = 0; i <= S; i++) m = Math.max(m, rest[i] - SAG * Math.abs(s[j] - s[i]));
      y[j] = m;
    }
    for (let pass = 0; pass < 3; pass++) {
      for (let j = 1; j < S; j++) y[j] = Math.max(rest[j], (y[j - 1] + 2 * y[j] + y[j + 1]) / 4);
    }
    // Start a little inside the horn so the cut ends are hidden.
    const pts = [new THREE.Vector3(ox - 0.3 * dx / L, oy - 0.03, oz - 0.3 * dz / L)];
    for (let j = 0; j <= S; j++) pts.push(new THREE.Vector3(xs[j], y[j], zs[j]));
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  }

  function definition() {
    const candles = [];
    const leaves = [];
    let leafMesh = null, dummy = null;
    const state = { leafTarget: 0, falling: 0, fallingHeight: 0 };

    function build(k) {
      const { THREE, scene } = k;
      const parts = TimbreScene.parts;
      dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const std = (hex, roughness, extra) => k.keep(new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness, metalness: 0 }, extra)));
      const solid = (parent, geo, mat, x, y, z) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true; m.receiveShadow = true;
        parent.add(m);
        return m;
      };
      const instanced = (geo, mat, count, cast) => {
        const m = new THREE.InstancedMesh(geo, mat, count);
        m.castShadow = cast; m.receiveShadow = true;
        return m;
      };

      // Cool rim from behind, weak warm fill from the front, soft ambient: they keep
      // every object readable over a dark game, and do not light the ground.
      const rim = new THREE.DirectionalLight(0x8fa6ff, 1.6);
      rim.position.set(-3, 5, -6);
      const fill = new THREE.DirectionalLight(0xffe2c0, 0.5);
      fill.position.set(2, 3, 6);
      scene.add(rim, fill, new THREE.AmbientLight(0x6a5648, 1.1));

      // Horn of plenty, turned so the mouth and the curve of the body both show.
      const horn = new THREE.Group();
      horn.position.set(-1.25, 0, -0.35);
      horn.rotation.y = -0.22;
      scene.add(horn);
      const weave = k.keep(new THREE.CanvasTexture(weaveCanvas()));
      weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
      weave.repeat.set(10, 18);
      weave.colorSpace = THREE.SRGBColorSpace;
      solid(horn, k.keep(hornGeometry(THREE)), std(0xffffff, 0.82, { map: weave, side: THREE.DoubleSide }), 0, 0, 0);
      solid(horn, k.keep(new THREE.TorusGeometry(0.97, 0.075, 10, 40)), std(0x9a6a2e, 0.8), 0, 0.95, 0).rotation.y = Math.PI / 2;

      // Stems: one tapered unit cylinder, scaled per stem (three pumpkins, five apples).
      const stems = instanced(k.keep(new THREE.CylinderGeometry(0.53, 1, 1, 8)), std(0x55622a, 0.9), PUMPKINS.length + APPLES.length, true);
      let stem = 0;
      const addStem = (x, y, z, radius, height, lean) => {
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, 0, lean);
        dummy.scale.set(radius, height, radius);
        dummy.updateMatrix();
        stems.setMatrixAt(stem++, dummy.matrix);
      };

      for (const [r, x, z, hex, roughness, turn] of PUMPKINS) {
        solid(scene, k.keep(parts.pumpkin(THREE, r, 12)), std(hex, roughness), x, 0, z).rotation.y = turn;
        addStem(x + r * 0.05, r * 1.42, z, r * 0.15, r * 0.5, -0.3);
      }

      const apples = instanced(k.keep(appleGeometry(THREE, APPLE_R)), std(0xffffff, 0.28), APPLES.length, true);
      APPLES.forEach(([x, z, hex], i) => {
        dummy.position.set(x, 0, z); dummy.rotation.set(0, i * 1.7, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
        apples.setMatrixAt(i, dummy.matrix);
        apples.setColorAt(i, color.setHex(hex));
        addStem(x + 0.015, 0.335, z, 0.012, 0.134, -0.227);
      });
      scene.add(apples, stems);

      const gourdPts = [[0, 0], [0.2, 0.03], [0.3, 0.2], [0.26, 0.42], [0.13, 0.6], [0.1, 0.78], [0.13, 0.92], [0.06, 1.0], [0, 1.02]]
        .map(([x, y]) => new THREE.Vector2(x, y));
      const gourd = k.keep(new THREE.LatheGeometry(gourdPts, 24));
      solid(scene, gourd, std(0x7d9426, 0.5), GOURD_STANDING[0], 0, GOURD_STANDING[1]).scale.setScalar(GOURD_STANDING[2]);
      const lying = solid(scene, gourd, std(0xdba42a, 0.5), 1.75, 0.22, -0.35);
      lying.scale.setScalar(0.75);
      lying.rotation.set(0, 0.6, Math.PI / 2 - 0.1);

      // Corn: a tapering cob covered in rows of kernels, with a pale husk at its base.
      // The cob's (radius, y) profile runs from the tip (-y) to the base (+y).
      const cobProfile = [[0, -0.315], [0.026, -0.305], [0.038, -0.28], [0.046, -0.23], [0.053, -0.16], [0.057, -0.08],
        [0.059, 0.05], [0.059, 0.2], [0.057, 0.29], [0.042, 0.315], [0.02, 0.328], [0, 0.333]];
      const cobRadius = (y) => {
        for (let i = 1; i < cobProfile.length; i++) {
          const [r1, y1] = cobProfile[i];
          if (y <= y1) { const [r0, y0] = cobProfile[i - 1]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); }
        }
        return 0;
      };
      const cobGeo = k.keep(new THREE.LatheGeometry(cobProfile.map(([r, y]) => new THREE.Vector2(r, y)), 14));
      const cobMat = std(0xa87c34, 0.6);
      const kernelGeo = k.keep(new THREE.SphereGeometry(1, 8, 6));
      const kernelMat = std(0xeab82e, 0.45);
      const huskMat = std(0xcfc27e, 0.8, { side: THREE.DoubleSide });
      const leafGeo = k.keep(parts.leaf(THREE));
      const ROWS = 14, RINGS = 17, FIRST = -0.295, LAST = 0.3, STEP = (LAST - FIRST) / (RINGS - 1);
      for (const [x, z, turn] of CORN) {
        const ear = new THREE.Group();
        ear.position.set(x, 0.09, z);
        ear.rotation.set(0, turn, Math.PI / 2);   // lying down; local +y is the base
        scene.add(ear);
        solid(ear, cobGeo, cobMat, 0, 0, 0);
        const kernels = instanced(kernelGeo, kernelMat, ROWS * RINGS + 1, false);   // the cob casts the shadow
        let n = 0;
        dummy.position.set(0, FIRST - 0.016, 0);   // one kernel closes the tip
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.02);
        dummy.updateMatrix();
        kernels.setMatrixAt(n++, dummy.matrix);
        for (let j = 0; j < RINGS; j++) {
          const y = FIRST + STEP * j, R = cobRadius(y) + 0.012;
          for (let i = 0; i < ROWS; i++) {
            const phi = ((i + 0.5 * (j % 2)) / ROWS) * Math.PI * 2;
            dummy.position.set(Math.cos(phi) * R, y, Math.sin(phi) * R);
            dummy.rotation.set(0, -phi, 0);
            dummy.scale.set(0.017, STEP * 0.48, (Math.PI * R / ROWS) * 0.92);
            dummy.updateMatrix();
            kernels.setMatrixAt(n++, dummy.matrix);
          }
        }
        ear.add(kernels);
        const husk = solid(scene, leafGeo, huskMat, x - Math.cos(turn) * 0.35, 0.05, z + Math.sin(turn) * 0.35);
        husk.scale.set(1.6, 1, 2.2);
        husk.rotation.y = turn + Math.PI / 2;
      }

      // A bunch of grapes, piled in layers.
      const grapes = instanced(k.keep(new THREE.SphereGeometry(0.07, 12, 10)), std(0x4a2468, 0.25), 24, true);
      for (let i = 0; i < 24; i++) {
        const layer = i < 10 ? 0 : i < 18 ? 1 : i < 23 ? 2 : 3, a = i * 2.4;
        const rr = [0.2, 0.14, 0.08, 0][layer] * (0.6 + 0.4 * ((i * 7) % 5) / 4);
        dummy.position.set(GRAPES[0] + Math.cos(a) * rr, 0.07 + layer * 0.1, GRAPES[1] + Math.sin(a) * rr);
        dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
        grapes.setMatrixAt(i, dummy.matrix);
      }
      scene.add(grapes);

      // Wheat: seven stalks fanning from the mouth to the front right, lying across
      // the spill, each ending in an ear: two staggered rows of grains along the
      // stalk's own direction, tapering to the tip, with fine awns.
      const tubes = [];
      const grains = instanced(k.keep(new THREE.SphereGeometry(1, 8, 6)), std(0xd2a64c, 0.65), WHEAT.length * GRAINS, true);
      const awnPts = [];
      const P = new THREE.Vector3(), Tn = new THREE.Vector3(), B = new THREE.Vector3(), N = new THREE.Vector3();
      const axis = new THREE.Vector3(), X = new THREE.Vector3(), Z = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      const m = new THREE.Matrix4(), size = new THREE.Vector3();
      let g = 0;
      for (const [a, reach, bow] of WHEAT) {
        const curve = stalkCurve(THREE, WHEAT_FROM[0] + Math.cos(a) * reach, WHEAT_FROM[2] + Math.sin(a) * reach, bow);
        tubes.push(new THREE.TubeGeometry(curve, 48, STALK_R, 5, false));
        const len = curve.getLength();
        for (let j = 0; j < GRAINS; j++) {
          const v = j / (GRAINS - 1), side = j % 2 ? 1 : -1, taper = 1 - 0.4 * v;
          const u = (len - EAR_LENGTH + v * (EAR_LENGTH - 0.035)) / len;
          curve.getPointAt(u, P); curve.getTangentAt(u, Tn);
          B.crossVectors(Tn, up).normalize(); N.crossVectors(B, Tn);
          axis.copy(Tn).addScaledVector(B, side * 0.45).normalize();
          X.crossVectors(axis, N).normalize(); Z.crossVectors(X, axis);
          size.set(0.016 * taper, 0.036 * taper, 0.015 * taper);
          P.addScaledVector(B, side * 0.014 * taper).addScaledVector(N, 0.006);
          m.makeBasis(X, axis, Z).scale(size).setPosition(P);
          grains.setMatrixAt(g++, m);
          // A short awn from the grain's tip, swept toward the ear's tip.
          P.addScaledVector(axis, 0.034 * taper);
          awnPts.push(P.x, P.y, P.z);
          axis.copy(Tn).addScaledVector(B, side * 0.18).normalize();
          P.addScaledVector(axis, 0.05 + 0.02 * v);
          awnPts.push(P.x, P.y, P.z);
        }
      }
      solid(scene, k.keep(merge(THREE, tubes)), std(0xd9b862, 0.8), 0, 0, 0);
      scene.add(grains);
      const awnGeo = k.keep(new THREE.BufferGeometry());
      awnGeo.setAttribute('position', new THREE.Float32BufferAttribute(awnPts, 3));
      scene.add(new THREE.LineSegments(awnGeo, k.keep(new THREE.LineBasicMaterial({ color: 0xd9bf7a }))));

      // Candles: tall behind the spill, medium to the right, short in front on the left.
      // Wax glows near the flame: an emissive map, white at the top fading to black.
      const gc = document.createElement('canvas');
      gc.width = 4; gc.height = 64;
      const gx = gc.getContext('2d'), gg = gx.createLinearGradient(0, 0, 0, 64);
      gg.addColorStop(0, '#fff'); gg.addColorStop(0.35, '#555'); gg.addColorStop(1, '#000');
      gx.fillStyle = gg; gx.fillRect(0, 0, 4, 64);
      const waxGlow = k.keep(new THREE.CanvasTexture(gc));
      const halo = k.glowTexture(255, 176, 84);
      const flameGeo = k.keep(new THREE.SphereGeometry(0.045, 12, 10));

      for (const [x, z, h, fall, phase, warm] of CANDLES) {
        const wax = new THREE.Mesh(
          k.keep(new THREE.CylinderGeometry(CANDLE_RADIUS, CANDLE_RADIUS, h, 20)),
          std(0xf3e3c0, 0.55, { emissive: 0xff8a30, emissiveMap: waxGlow, emissiveIntensity: 0.3 }));
        wax.position.set(x, h / 2, z);
        wax.receiveShadow = true;   // no castShadow: its own light sits just above it
        scene.add(wax);

        const flame = new THREE.Mesh(flameGeo, k.keep(new THREE.MeshBasicMaterial({ color: 0xffffff })));
        flame.position.set(x, h + 0.12, z);
        scene.add(flame);

        const glow = new THREE.Sprite(k.keep(k.addLight(new THREE.SpriteMaterial({ map: halo, depthTest: false }))));
        glow.position.copy(flame.position);
        glow.renderOrder = 10;
        scene.add(glow);

        const light = k.practical(new THREE.PointLight(warm, 0.8, 14, 2));
        light.position.set(x, h + 0.16, z);
        light.castShadow = true;
        light.shadow.mapSize.set(512, 512);
        light.shadow.camera.near = 0.05;
        light.shadow.camera.far = 14;
        light.shadow.bias = -0.004;
        light.shadow.normalBias = 0.03;
        scene.add(light);

        candles.push({ x, h, fall, phase, wax, flame, glow, light, follow: 0, jitter: 0, slot: -1, brightness: 0 });
      }

      // Leaves: one instanced mesh, tinted per leaf. The first few lie on the ground;
      // the rest fall when the sound calls for them.
      leafMesh = instanced(leafGeo, std(0xffffff, 0.7, { side: THREE.DoubleSide }), GROUND_LEAVES + FALLING_LEAVES, true);
      leafMesh.frustumCulled = false;
      leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < GROUND_LEAVES + FALLING_LEAVES; i++) {
        leafMesh.setColorAt(i, color.setHex(LEAF_TINTS[i % LEAF_TINTS.length]));
        const ground = i < GROUND_LEAVES;
        leaves.push({
          ground, on: ground,
          // Each ground leaf a hair higher than the last, so overlapping ones never z-fight.
          x: -4.2 + Math.random() * 8, y: ground ? 0.012 + 0.002 * i : 0, z: -1.6 + Math.random() * 4,
          speed: 0.45 + Math.random() * 0.5, vx: 0,
          rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
          spin: 0.8 + Math.random() * 1.6, sway: Math.random() * 6.28, size: 0.8 + Math.random() * 0.8,
        });
      }
      scene.add(leafMesh);
    }

    function update(k, audio, now, dt) {
      const t = now / 1000;
      k.orbit = Math.sin(0.2 * t) * 0.26 * knob('cameraDrift') / 50;

      // Candles: fast rise toward the voice, each candle's own slow fall and flicker.
      const g = knob('candleGlow') / 50;
      const slot = Math.floor(t * JITTER_HZ);
      for (const c of candles) {
        const rate = audio.level > c.follow ? 30 : c.fall;
        c.follow += (audio.level - c.follow) * (1 - Math.exp(-rate * dt));
        if (slot !== c.slot) { c.slot = slot; c.jitter = (Math.random() - 0.5) * 0.05; }
        const flicker = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(15.3 * t + c.phase) * Math.sin(6.7 * t + 2 * c.phase)) + c.jitter;
        const b = Math.min(1.5, (0.22 + 0.78 * c.follow * g) * flicker + 0.35 * audio.kick * g);
        c.brightness = b;

        c.light.intensity = 0.8 + 10 * b;
        c.light.position.x = c.x + Math.sin(17 * t + c.phase) * 0.012;   // the shadows shiver
        c.wax.material.emissiveIntensity = 0.25 + 1.1 * b;
        const stretch = 1.6 + 1.6 * b;
        c.flame.scale.set(1, stretch + audio.kick * g, 1);
        c.flame.position.y = c.h + 0.1 + stretch * 0.03;
        c.flame.material.color.setRGB(2.2 + b, 1.5 + 0.6 * b, 0.7);
        c.glow.position.y = c.flame.position.y;   // the halo stays on the flame as it grows
        c.glow.scale.setScalar(0.5 + 0.9 * b);
        c.glow.material.opacity = Math.min(1, 0.35 + 0.5 * b);
      }

      // Leaves: how many fall follows volume and beats; a beat gusts the falling ones sideways.
      const target = Math.min(FALLING_LEAVES, Math.round((4 + 16 * audio.flame + 18 * audio.burst) * knob('leafDensity') / 50));
      const settle = Math.exp(-1.5 * dt);
      let falling = 0, height = 0;
      for (let i = 0; i < leaves.length; i++) {
        const l = leaves[i];
        if (!l.ground) {
          if (l.on) {
            l.vx = audio.beat ? -1 + 3.5 * Math.random() : l.vx * settle;
            l.y -= l.speed * dt;
            l.x += (Math.sin(1.3 * t + l.sway) * 0.35 + l.vx) * dt;
            l.rx += l.spin * dt; l.rz += l.spin * 0.7 * dt; l.ry += 0.5 * dt;
            if (l.y < 0.02) l.on = false;
          } else if (i - GROUND_LEAVES < target) {
            l.on = true; l.vx = 0;
            l.x = -4.2 + Math.random() * 8; l.y = 4.2 + Math.random(); l.z = -1.6 + Math.random() * 4;
          }
          if (l.on) { falling++; height += l.y; }
        }
        // A falling leaf shrinks to nothing over its last third of a unit.
        const s = l.on ? l.size * (l.ground ? 1 : Math.min(1, l.y * 3)) : 0;
        dummy.position.set(l.x, l.y, l.z);
        dummy.rotation.set(l.ground ? 0 : l.rx, l.ry, l.ground ? 0 : l.rz);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        leafMesh.setMatrixAt(i, dummy.matrix);
      }
      leafMesh.instanceMatrix.needsUpdate = true;
      state.leafTarget = target;
      state.falling = falling;
      state.fallingHeight = falling ? height / falling : 0;
    }

    return {
      frame: { width: 6.8, height: 3.1, center: [-0.4, 0.75, 0.3] },
      fov: 30,
      pitch: 14,
      groundColor: 0x7a6f66,
      build,
      update,
      debug() {
        return {
          candles: candles.map((c) => c.brightness), follow: candles.map((c) => c.follow),
          leafTarget: state.leafTarget, falling: state.falling, fallingHeight: state.fallingHeight,
        };
      },
    };
  }

  let scene = null;
  return {
    start() { scene = TimbreScene.create(definition()); },
    stop() { if (scene) scene.dispose(); scene = null; },
    onResize() { if (scene) scene.resize(); },
    draw(now, dt) { if (scene) scene.draw(now, dt); },
  };
};
