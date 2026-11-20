// Timbre — the mountains: a block of alpine land that the voice raises. First the
// arithmetic: the shape of the land, which band of the sound a column follows, how high the
// voice lifts it, how it sinks toward the block's edges, its colour, and the land itself, a
// set of rows that ride with the terrain as it flows toward the viewer. Then the 3D scene,
// written against the scene kit: definition() returns what TimbreScene.factory() needs.
//
// All timing comes from the caller (a distance or dt in seconds), never from counting
// frames, so the same sound gives the same land at any frame rate.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreMountains`), like sunburst.js, so verify.mjs can import it under Node.
// Nothing here may touch document, window, THREE, TimbreScene or core.js globals at load
// time; the scene looks them up when it is built.

(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  const W = 7, D = 4.4;              // the block of land: width and depth
  const NX = 80, NZ = 52;            // columns across it, and stored rows across its depth
  const SP = D / NZ;                 // the spacing of stored rows
  const HMAX = 2.15;                 // the tallest peak, before the voice lifts the range
  const FOOT = 0.15;                 // the share of its height the land keeps in silence
  const EDGE = 0.14;                 // the share of its height the land keeps at the cut edges
  const BASE = 0.26;                 // the thickness of the block below the valley floor
  const SNOW = 1.05;                 // the snow line
  const BANDS = 9;                   // the flanks hear this bin; speech lives in the first ten
  const FLANK = 2.6;                 // how far from the middle the flanks are: where the land begins to sink toward the sides
  const CROSS = 5;                   // seconds for land to cross the block at Speed 50
  const NC = NX + 1, NR = NZ + 2;    // points in a row; rows drawn (the two edges and the stored rows between)
  const ROWS = NZ + 4;               // stored rows kept
  const SNOW_RGB = [0.93, 0.95, 1];
  const FOV = 30, PITCH = 18;        // the camera: how wide it sees and how far it looks down, in degrees
  const FRAME = { width: 8.8, height: 5.4, center: [0, 0.8, 0.2] };   // what the camera frames
  // The block as a box, for the Rotate settings to keep in the frame: its base, and its tallest peak lifted.
  const BOX = { min: [-W / 2, -BASE, -D / 2], max: [W / 2, HMAX * 1.26, D / 2] }, VIEW = { frame: FRAME, fov: FOV, pitch: PITCH };
  const SWAY = 0.28;                 // how far the camera swings each way at Camera drift 50, in radians
  const RAD = Math.PI / 180;

  // A fixed number in 0..1 for each lattice point.
  function hash(ix, iz) {
    let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // Smooth noise in 0..1: the lattice values, eased between.
  function noise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    let fx = x - ix, fz = z - iz;
    fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
    const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  }

  // The shape of the land before the voice scales it, 0.16..1: long connected crests, smaller
  // ones riding on them, and a little roughness. x is across the block; w is along the way
  // the land travels, in the land's own coordinate, so a crest keeps its shape as it moves.
  function ridge(x, w) {
    const r1 = 1 - Math.abs(2 * noise(x * 0.62 + 11.3, w * 0.62) - 1);
    const r2 = 1 - Math.abs(2 * noise(x * 1.7 + 3.1, w * 1.7 + 7.7) - 1);
    const r3 = noise(x * 4.6 + 1.9, w * 4.6 + 5.2);
    return 0.16 + 0.6 * Math.pow(r1, 1.45) + 0.2 * r2 * (0.35 + 0.65 * r1) + 0.04 * r3;
  }

  // Where column c is, across the block.
  function columnX(c) {
    return -W / 2 + (c / NX) * W;
  }

  // Which band of the sound a place across the block follows, as a place among the frequency
  // bins (fractions allowed): the middle hears bin 0 and both flanks hear bin BANDS. The
  // bands stop at the flanks, so every one of them drives land that stands at full height.
  function bandOf(x) {
    return Math.min(1, Math.abs(x) / FLANK) * BANDS;
  }

  // How loud a band is, 0..1: read between two bins, times Gain.
  function loudness(bins, band, gain) {
    if (!bins || !bins.length) return 0;
    const b = Math.max(0, Math.min(bins.length - 1, band));
    const j = Math.max(0, Math.min(bins.length - 2, Math.floor(b))), f = b - j;
    const next = j + 1 < bins.length ? bins[j + 1] : bins[j];
    return clamp01(((bins[j] + (next - bins[j]) * f) / 255) * gain);
  }

  // What a column answers to: its own band most, and the voice as a whole a little, so that
  // the whole range rises when someone talks.
  function answer(band, flame) {
    return Math.min(1, 0.7 * band + 0.45 * flame);
  }

  // The share of its full height the land stands at, for a loudness of 0..1.
  function rise(amp) {
    return FOOT + (1 - FOOT) * Math.pow(clamp01(1.3 * amp), 0.85);
  }

  // The height of the land at x across the block and w along its travel, for a loudness.
  function heightAt(x, w, amp) {
    return HMAX * rise(amp) * ridge(x, w);
  }

  // The land sinks toward the block's edges, so the cut faces stay low: the share of its
  // height it keeps at x across and z along the block (z = -D/2 is the far edge). It rises
  // over a shorter distance from the far edge, where new land comes in.
  function sinkAcross(x) {
    return ease(0, 0.9, W / 2 - Math.abs(x));   // 0.9 is from the side to the flank
  }
  function sinkAlong(z) {
    return ease(0, 0.85, D / 2 - z) * ease(0, 0.5, z + D / 2);
  }
  function sink(x, z) {
    return EDGE + (1 - EDGE) * sinkAcross(x) * sinkAlong(z);
  }

  // How fast the land flows, in units a second, for a Speed setting. No setting is the
  // default, 50.
  function flow(speed) {
    const s = Number.isFinite(speed) ? clamp01(speed / 100) : 0.5;
    return (D / CROSS) * (0.25 + 1.5 * s);
  }

  // The whole range lifts with the voice and jumps on a beat.
  function lift(flame, kick) {
    return 0.86 + 0.24 * flame + 0.16 * kick;
  }

  // The colour of the land at height h (before the lift): its own colour (rgb, 0..1 each),
  // dark in the valleys and full at the snow line, and white above it. Written into out and
  // returned.
  function shade(out, rgb, h) {
    const rock = 0.2 + 0.8 * ease(0, SNOW, h), snow = ease(SNOW - 0.08, SNOW + 0.3, h);
    out[0] = rgb[0] * rock * (1 - snow) + SNOW_RGB[0] * snow;
    out[1] = rgb[1] * rock * (1 - snow) + SNOW_RGB[1] * snow;
    out[2] = rgb[2] * rock * (1 - snow) + SNOW_RGB[2] * snow;
    return out;
  }

  // With the mic off and Idle animation on: the loudness column c pretends to hear at t
  // seconds, a slow swell that differs across the range.
  function idle(c, t) {
    return clamp01(0.34 + 0.26 * Math.sin(0.09 * c + 0.5 * t) + 0.14 * Math.sin(0.23 * c - 0.31 * t));
  }

  // The land: rows of heights that ride with the terrain. A row is written once, at the
  // moment it leaves the far edge, with the loudness of each column at that moment; after
  // that it only moves. So nothing swims as the land flows, and no row jumps.
  //
  //   advance(distance, amps)  move the land on; amps is each column's loudness now
  //   row(j), z(j)             what to draw: row 0 is the far edge (the voice right now),
  //                            rows 1..NZ are the stored rows, newest first, and row NZ + 1
  //                            is the near edge, read between the two rows either side of it
  //   write(positions, heights, lift)  the whole land as points; returns the tallest height
  function createLand() {
    const xs = new Float32Array(NC), across = new Float32Array(NC);
    for (let c = 0; c < NC; c++) { xs[c] = columnX(c); across[c] = sinkAcross(xs[c]); }
    const rows = [];
    for (let i = 0; i < ROWS; i++) rows.push(new Float32Array(NC));
    const far = new Float32Array(NC), nearRow = new Float32Array(NC), before = new Float32Array(NC);
    const at = (i) => rows[((i % ROWS) + ROWS) % ROWS];
    let travel = 0, top = 0;   // how far the land has come; the newest stored row
    for (let i = top - ROWS + 1; i <= top; i++) { const row = at(i); for (let c = 0; c < NC; c++) row[c] = heightAt(xs[c], i * SP, 0); }

    function edges(amps) {
      const f = travel / SP - top, newer = at(top - NZ + 1), older = at(top - NZ);
      for (let c = 0; c < NC; c++) {
        far[c] = heightAt(xs[c], travel, amps[c]);
        nearRow[c] = newer[c] + (older[c] - newer[c]) * (1 - f);
      }
    }
    edges(before);

    function advance(distance, amps) {
      const d = Number.isFinite(distance) && distance > 0 ? distance : 0, from = travel;
      travel = from + d;
      const last = Math.floor(travel / SP);
      if (last - top > ROWS) top = last - ROWS;   // a jump: only the rows still in the block matter
      while (top < last) {
        top++;
        // When in this step the far edge passed the row's place.
        const w = clamp01((top * SP - from) / d), row = at(top);
        for (let c = 0; c < NC; c++) row[c] = heightAt(xs[c], top * SP, before[c] + (amps[c] - before[c]) * w);
      }
      before.set(amps);
      edges(amps);
    }

    const row = (j) => (j <= 0 ? far : j >= NR - 1 ? nearRow : at(top - (j - 1)));
    const z = (j) => (j <= 0 ? -D / 2 : j >= NR - 1 ? D / 2 : -D / 2 + (travel / SP - top + j - 1) * SP);

    function write(positions, heights, lifted) {
      let peak = 0;
      for (let j = 0; j < NR; j++) {
        const r = row(j), zj = z(j), along = sinkAlong(zj);
        for (let c = 0; c < NC; c++) {
          const h = r[c] * (EDGE + (1 - EDGE) * across[c] * along), a = (j * NC + c) * 3;
          positions[a] = xs[c]; positions[a + 1] = h * lifted; positions[a + 2] = zj;
          heights[j * NC + c] = h;
          if (h > peak) peak = h;
        }
      }
      return peak;
    }

    return {
      advance, row, z, write, stored: at,
      get travel() { return travel; },
      get top() { return top; },
    };
  }

  // The cut sides of the block: a wall below the land's rim. For every point of the rim there
  // are two points, the rim point itself and the point under it on the base (the odd ones).
  // from: which point of the land each copies; normals: which way each side faces; index: the
  // triangles, wound so that each faces out of the block.
  function rim() {
    const from = [], normals = [], index = [];
    const side = (list, nx, nz, turn) => {
      const first = from.length;
      for (const v of list) { from.push(v, v); normals.push(nx, 0, nz, nx, 0, nz); }
      for (let i = 0; i < list.length - 1; i++) {
        const a = first + i * 2;
        if (turn) index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    };
    const run = (n, f) => Array.from({ length: n }, (_, i) => f(i));
    side(run(NC, (c) => c), 0, -1, true);                    // far
    side(run(NC, (c) => (NR - 1) * NC + c), 0, 1, false);    // near
    side(run(NR, (j) => j * NC), -1, 0, false);              // left
    side(run(NR, (j) => j * NC + NX), 1, 0, true);           // right
    return { from: Int32Array.from(from), normals: Float32Array.from(normals), index };
  }

  // ── The scene ───────────────────────────────────────────────────────────────
  // Everything below runs only when the scene is built: THREE, TimbreScene and the core.js
  // globals (the mic, the bins, the palette, the settings) are looked up then.

  // The scene definition, for TimbreScene.factory().
  function definition() {
    const ID = 'mountains-3d';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name, unset = 50) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : unset;
    };
    const amps = new Float32Array(NC), bands = new Float32Array(NC), tones = new Float32Array(NC * 3);
    const heights = new Float32Array(NR * NC), rgb = [0, 0, 0], tone = [0, 0, 0];
    for (let c = 0; c < NC; c++) bands[c] = bandOf(columnX(c));
    let THREE = null, whole = null, land = null, mesh = null, skirt = null, skirtFrom = null, base = null, sun = null, haze = null, key = null, fill = null, sky = null;
    let swayWas = -1;
    let pose = { scale: 1, x: 0, y: 0, z: 0 };
    const turned = [0, 0, 0];
    let colour = null, white = null;
    // What the checks read. travel: how far the land has come; peak: the tallest point drawn,
    // before the lift; amp: the mean loudness across the range; clock: seconds the scene has
    // been live; snowy: how many points are more snow than rock.
    const s = { flame: 0, kick: 0, slow: 0, travel: 0, top: 0, peak: 0, amp: 0, lift: 1, live: false, clock: 0, orbit: 0, colorT: 0, snowy: 0, sun: 0, sunY: 0, sunSize: 0, glow: 0, turned: [0, 0, 0], scale: 1, at: [0, 0, 0], corner: [0, 0, 0] };
    let cornerAt = null;

    function build(k) {
      THREE = k.THREE;
      colour = new THREE.Color(); white = new THREE.Color(1, 1, 1);
      land = createLand();
      // The block, its lights and its sun turn together, by the three Rotate settings.
      whole = new THREE.Group();
      cornerAt = new THREE.Vector3();
      whole.rotation.order = 'XZY';   // spin (y) first, then roll (z), then tilt (x): as TimbreScene.turn does
      k.scene.add(whole);

      // The land: one grid, rewritten each frame.
      const geo = new THREE.BufferGeometry();
      for (const name of ['position', 'color', 'normal']) {
        const attribute = new THREE.BufferAttribute(new Float32Array(NR * NC * 3), 3);
        attribute.setUsage(THREE.DynamicDrawUsage);
        geo.setAttribute(name, attribute);
      }
      const index = [];
      for (let j = 0; j < NR - 1; j++) for (let c = 0; c < NX; c++) {
        const p = j * NC + c, q = p + NC;
        index.push(p, q, p + 1, p + 1, q, q + 1);
      }
      geo.setIndex(index);
      mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.frustumCulled = false;   // its points move every frame
      whole.add(mesh);

      // The cut sides of the block: each point of the land's rim, and the point below it.
      const sides = rim();
      skirtFrom = sides.from;
      const sg = new THREE.BufferGeometry();
      for (const name of ['position', 'color']) {
        const attribute = new THREE.BufferAttribute(new Float32Array(skirtFrom.length * 3), 3);
        attribute.setUsage(THREE.DynamicDrawUsage);
        sg.setAttribute(name, attribute);
      }
      sg.setAttribute('normal', new THREE.BufferAttribute(sides.normals, 3));
      sg.setIndex(sides.index);
      skirt = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
      skirt.castShadow = true;
      skirt.frustumCulled = false;
      whole.add(skirt);

      // The underside of the block, so that it is solid whichever way it is turned.
      const under = new THREE.PlaneGeometry(W, D);
      under.rotateX(Math.PI / 2); under.translate(0, -BASE, 0);
      base = new THREE.Mesh(under, new THREE.MeshStandardMaterial({ color: 0x0b0a12, roughness: 0.95, metalness: 0 }));
      whole.add(base);

      // The sun's light: low, from behind the range and to the left, so the peaks throw
      // their shadows across the land toward the viewer. A weak fill keeps the near faces
      // readable over a dark game. Neither lights the unseen ground.
      key = new THREE.DirectionalLight(0xffffff, 2);
      key.position.set(-5.2, 4.4, -2.6);
      key.target.position.set(0.3, 0.3, 0.2);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      const cam = key.shadow.camera;
      cam.left = -5; cam.right = 5; cam.top = 4; cam.bottom = -4; cam.near = 1; cam.far = 16;
      key.shadow.bias = -0.0012; key.shadow.normalBias = 0.05;
      fill = new THREE.DirectionalLight(0xbcd0ff, 0.75);
      fill.position.set(2.5, 3, 6);
      whole.add(key, key.target, fill, fill.target);
      // The light of the sky comes from above the land. three.js takes its direction from where
      // the light is in the scene, so it cannot ride in the group (the group's own place would
      // leak into it): it stays in the scene and is put above the land each frame.
      sky = new THREE.HemisphereLight(0xc4d6ff, 0x2a2233, 0.85);
      k.scene.add(sky);

      // The sun itself and the glow of the sky round it: added light, behind the range.
      const disc = k.glowTexture(255, 255, 255);
      sun = new THREE.Sprite(k.addLight(new THREE.SpriteMaterial({ map: disc, depthTest: true })));
      haze = new THREE.Sprite(k.addLight(new THREE.SpriteMaterial({ map: disc, depthTest: true })));
      haze.position.set(-0.6, 1.4, -D / 2 - 1.4);
      haze.scale.set(9, 4.5, 1);
      whole.add(sun, haze);
    }

    // The palette colour at t, as the colour buffer wants it (linear), into rgb.
    function palette(t) {
      const p = getColor(t);
      colour.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
      rgb[0] = colour.r; rgb[1] = colour.g; rgb[2] = colour.b;
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = (0.22 * Math.sin(0.15 * t) + 0.06 * Math.sin(0.41 * t + 2)) * knob('cameraDrift') / 50;
      // The block as the Rotate settings turn it, kept in the frame.
      const rx = knob('rotateX', 0), ry = knob('rotateY', 0), rz = knob('rotateZ', 0);
      const sway = (SWAY * knob('cameraDrift')) / 50;
      if (rx !== turned[0] || ry !== turned[1] || rz !== turned[2] || sway !== swayWas) {
        turned[0] = rx; turned[1] = ry; turned[2] = rz; swayWas = sway;
        pose = TimbreScene.poseFor(BOX, VIEW, rx, ry, rz, sway);
        // The sun's shadows are measured in the scene's units: they shrink with the block.
        const cam = key.shadow.camera;
        cam.left = -5 * pose.scale; cam.right = 5 * pose.scale; cam.top = 4 * pose.scale; cam.bottom = -4 * pose.scale; cam.near = pose.scale; cam.far = 16 * pose.scale;
        cam.updateProjectionMatrix();
        key.shadow.normalBias = 0.05 * pose.scale;
      }
      whole.rotation.set(rx * RAD, ry * RAD, rz * RAD);
      whole.scale.setScalar(pose.scale);
      whole.position.set(pose.x, pose.y, pose.z);
      // How it stands, for the checks: the settings as read, its size and place, and where one corner is in the scene.
      whole.updateMatrixWorld(true);
      sky.position.set(0, 1, 0).applyQuaternion(whole.quaternion);
      sky.updateMatrixWorld();
      mesh.localToWorld(cornerAt.set(W / 2, 0, D / 2));
      s.turned[0] = rx; s.turned[1] = ry; s.turned[2] = rz; s.scale = pose.scale; s.at[0] = pose.x; s.at[1] = pose.y; s.at[2] = pose.z; s.corner[0] = cornerAt.x; s.corner[1] = cornerAt.y; s.corner[2] = cornerAt.z;

      // With the mic and Idle animation both off, the land stands still.
      s.live = !!(micActive || cfgIdleAnim);
      if (s.live) s.clock += dt;
      s.flame = audio.flame; s.kick = audio.kick; s.slow = audio.slow;

      // How loud each column's band has been lately. It rises in a quarter of a second and
      // falls over more than one, so a phrase, not a syllable, makes a mountain.
      let mean = 0;
      for (let c = 0; c < NC; c++) {
        let target = 0;
        if (micActive) target = answer(loudness(frequencies, bands[c], cfgGain), audio.flame);
        else if (cfgIdleAnim) target = idle(c, s.clock);
        amps[c] = follow(amps[c], target, target > amps[c] ? 4 : 0.75, dt);
        mean += amps[c];
      }
      s.amp = mean / NC;

      land.advance(s.live ? flow(knob('speed')) * dt : 0, amps);
      s.travel = land.travel; s.top = land.top;
      s.lift = lift(audio.flame, audio.kick);
      const position = mesh.geometry.attributes.position, colours = mesh.geometry.attributes.color;
      s.peak = land.write(position.array, heights, s.lift);

      // Colours across the range, from the palette.
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      for (let c = 0; c < NC; c++) {
        palette(colorT + (c / NX) * 1.2);
        tones[c * 3] = rgb[0]; tones[c * 3 + 1] = rgb[1]; tones[c * 3 + 2] = rgb[2];
      }
      const col = colours.array;
      let snowy = 0;
      for (let j = 0; j < NR; j++) for (let c = 0; c < NC; c++) {
        const i = j * NC + c, h = heights[i];
        rgb[0] = tones[c * 3]; rgb[1] = tones[c * 3 + 1]; rgb[2] = tones[c * 3 + 2];
        shade(tone, rgb, h);
        col[i * 3] = tone[0]; col[i * 3 + 1] = tone[1]; col[i * 3 + 2] = tone[2];
        if (h > SNOW + 0.11) snowy++;
      }
      s.snowy = snowy;
      position.needsUpdate = true; colours.needsUpdate = true;
      mesh.geometry.computeVertexNormals();

      // The cut sides follow the rim of the land.
      const sp = skirt.geometry.attributes.position.array, sc = skirt.geometry.attributes.color.array, pos = position.array;
      for (let i = 0; i < skirtFrom.length; i++) {
        const v = skirtFrom[i] * 3, a = i * 3, c = (skirtFrom[i] % NC) * 3, low = i & 1, dark = low ? 0.1 : 0.2;
        sp[a] = pos[v]; sp[a + 1] = low ? -BASE : pos[v + 1]; sp[a + 2] = pos[v + 2];
        sc[a] = tones[c] * dark + 0.015; sc[a + 1] = tones[c + 1] * dark + 0.015; sc[a + 2] = tones[c + 2] * dark + 0.02;
      }
      skirt.geometry.attributes.position.needsUpdate = true; skirt.geometry.attributes.color.needsUpdate = true;

      // The sun, its light and the sky's glow answer the voice at once.
      palette(colorT + 0.6);
      colour.setRGB(rgb[0], rgb[1], rgb[2]);
      key.color.copy(colour).lerp(white, 0.62);
      s.sun = key.intensity = 1.5 + 2.2 * audio.flame + 1.6 * audio.kick;
      s.sunY = 0.8 + 1.3 * audio.slow;
      sun.position.set(-1.9, s.sunY, -D / 2 - 1);
      s.sunSize = 1.5 + 0.7 * audio.flame + audio.kick;
      sun.scale.setScalar(s.sunSize);
      s.glow = 0.4 + 0.7 * audio.flame + 0.7 * audio.kick;
      sun.material.color.copy(colour).lerp(white, 0.4).multiplyScalar(s.glow);
      haze.material.color.copy(colour).multiplyScalar(0.06 + 0.12 * audio.flame + 0.1 * audio.kick);
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: PITCH,
      cooling: [Infinity, Infinity, Infinity],   // fading light keeps its colour
      build,
      update,
      debug() {
        if (!mesh) return Object.assign({}, s);
        // What the checks read of the land as drawn: the tallest point in each column and in
        // each row (before the lift), where each row is, and the colour of one low point on
        // the near edge with its shading taken back out.
        const profile = new Array(NC).fill(0), depth = new Array(NR).fill(0), zs = [];
        for (let j = 0; j < NR; j++) {
          zs.push(land.z(j));
          for (let c = 0; c < NC; c++) { const h = heights[j * NC + c]; if (h > profile[c]) profile[c] = h; if (h > depth[j]) depth[j] = h; }
        }
        const sp = skirt.geometry.attributes.position.array, lp = mesh.geometry.attributes.position.array, nrm = mesh.geometry.attributes.normal.array;
        let seam = 0, tilt = 0;   // how far any point of the cut sides is from the rim point it hangs from; how far from upright the land's faces lean
        for (let i = 0; i < skirtFrom.length; i += 2) {
          const v = skirtFrom[i] * 3, a = i * 3;
          seam = Math.max(seam, Math.abs(sp[a] - lp[v]), Math.abs(sp[a + 1] - lp[v + 1]), Math.abs(sp[a + 2] - lp[v + 2]), Math.abs(sp[a + 3] - lp[v]), Math.abs(sp[a + 5] - lp[v + 2]));
        }
        for (let i = 1; i < nrm.length; i += 3) tilt += 1 - nrm[i];
        tilt /= NR * NC;
        const ref = (NR - 1) * NC + NX / 4, col = mesh.geometry.attributes.color, rock = 0.2 + 0.8 * ease(0, SNOW, heights[ref]), out = { r: 0, g: 0, b: 0 };
        colour.setRGB(col.getX(ref) / rock, col.getY(ref) / rock, col.getZ(ref) / rock).getRGB(out, THREE.SRGBColorSpace);
        return Object.assign({
          amps: Array.from(amps), profile, depth, zs, seam, tilt,
          far: Array.from(land.row(0)),
          rock: [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)],
          rim: Math.max(...Array.from(skirt.geometry.attributes.position.array).filter((_, i) => i % 3 === 1)),
          floor: Math.min(...Array.from(skirt.geometry.attributes.position.array).filter((_, i) => i % 3 === 1)),
        }, s, {
          turned: s.turned.slice(), at: s.at.slice(), corner: s.corner.slice(),   // as they are now, not as they will be
          // Read back from what is drawn, not from what update() meant to draw.
          high: Math.max(...Array.from(mesh.geometry.attributes.position.array).filter((_, i) => i % 3 === 1)),
          sun: key.intensity, sunY: sun.position.y, sunSize: sun.scale.x,
          // Where three.js will take each light to come from: a light's place less its target's, or the sky light's place.
          lights: (() => {
            const at = (o) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld), from = (l) => at(l).sub(at(l.target)).normalize().toArray();
            return { key: from(key), fill: from(fill), sky: at(sky).normalize().toArray(), keyAt: at(key).toArray(), keyAim: at(key.target).toArray(), fillAt: at(fill).toArray(), fillAim: at(fill.target).toArray() };
          })(),
          shadow: [key.shadow.camera.right, key.shadow.camera.top, key.shadow.camera.near, key.shadow.camera.far, key.shadow.normalBias],
          sway: swayWas, under: base.geometry.attributes.position.count,
          sunAt: sun.getWorldPosition(new THREE.Vector3()).toArray(), sunLocal: sun.position.toArray(),
          glow: (palette(s.colorT + 0.6), sun.material.color.r / (rgb[0] + (1 - rgb[0]) * 0.4)),
        });
      },
    };
  }

  globalThis.TimbreMountains = {
    W, D, NX, NZ, SP, HMAX, FOOT, EDGE, BASE, SNOW, BANDS, FLANK, CROSS, FOV, PITCH, FRAME, BOX, SWAY,
    hash, noise, ridge, columnX, bandOf, loudness, answer, rise, heightAt, sink, flow, lift, shade, idle, createLand, rim, definition,
  };
})();
