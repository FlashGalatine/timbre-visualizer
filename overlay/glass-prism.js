// Timbre — the glass prism: a cut crystal of twenty facets that tumbles in the box, drawn in
// light only, whose colours come apart like light through a prism. First the arithmetic: the
// bands its facets answer, how far its colours come apart, how bright it is, and its tumble.
// Then the shader that draws a facet, and the 3D scene, written against the scene kit:
// definition() returns what TimbreScene.factory() needs.
//
// All timing comes from the caller (dt in seconds), never from counting frames, so the same
// sound gives the same crystal at any frame rate.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreGlassPrism`), like chladni.js, so verify.mjs can import it under Node.
// Nothing here may touch document, window, THREE, TimbreScene or core.js globals at load
// time; the scene looks them up when it is built.

(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const FACETS = 20;                        // the crystal's sides
  const BANDS = 10;                         // bands the facets answer: the ten lowest bins
  const R = 1.3;                            // how far its corners are from its middle
  const RISE = 20, FALL = 5;                // how fast a band is followed, up and down, a second
  const KICK = 2.2, KICK_FALL = 2.5;        // a beat's spin, in radians a second, and how fast it dies away
  const APART_RATE = 10;                    // how fast the colours follow how far apart they should be
  const FOV = 30, PITCH = 8;                // the camera: how wide it sees and how far it looks down, in degrees
  const FRAME = { width: 5.2, height: 4.2, center: [0, 0, 0] };   // what the camera frames

  // The band a facet answers.
  function bandOf(facet) {
    return facet % BANDS;
  }

  // How loud a band is, 0..1: its bin, times Gain.
  function loudness(bins, band, gain) {
    if (!bins || !(band < bins.length)) return 0;
    return clamp01((bins[band] / 255) * gain);
  }

  // With the mic off and Idle animation on: how loud band b pretends to be at t seconds.
  function idle(b, t) {
    return 0.3 + 0.3 * Math.sin(0.6 * t + 1.4 * b);
  }

  // The high end of the sound: the mean of the five highest bands.
  function highOf(bands) {
    let sum = 0;
    for (let b = BANDS - 5; b < BANDS; b++) sum += bands[b];
    return sum / 5;
  }

  // A level that has all but died away is none. The voice and a beat die away for ever and
  // never arrive, and a picture that should be still would go on changing by a hair.
  function settle(v) {
    return v < 1e-4 ? 0 : v;
  }

  // How far the three colours should be apart: a little always, more with the high end and
  // on a beat, and all of it scaled by the Chroma setting (0..100; 50 is as designed).
  function apartOf(high, kick, chroma) {
    return ((0.018 + 0.1 * high + 0.08 * kick) * chroma) / 50;
  }

  // Copy c of the crystal (0, 1, 2) with the colours `apart`, into out: its size, how far it
  // is rolled about the line of sight (radians) and how far it is moved to the camera's right.
  function copyAt(out, c, apart) {
    const off = (c - 1) * apart;
    out[0] = 1 + off; out[1] = 0.9 * off; out[2] = 0.5 * off;
    return out;
  }

  // How bright the crystal is drawn: with the voice, and on a beat.
  function brightOf(flame, kick) {
    return 0.26 + 0.2 * flame + 0.18 * kick;
  }

  // The glow inside it, into out: how bright and how large.
  function heartOf(out, flame, kick) {
    out[0] = 0.03 + 0.1 * flame + 0.12 * kick;
    out[1] = 1.8 + 1.0 * flame + 0.6 * kick;
    return out;
  }

  // How fast it turns by itself, in radians a second.
  function turnRate(flame) {
    return 0.25 + 1.5 * flame;
  }

  // The axis it turns about after `clock` seconds, one long, into out: mostly upright, wandering.
  function axisAt(out, clock) {
    const x = Math.sin(0.21 * clock), z = 0.6 * Math.cos(0.17 * clock), long = Math.hypot(x, 1, z);
    out[0] = x / long; out[1] = 1 / long; out[2] = z / long;
    return out;
  }

  // The spin the nth beat gives it, into out: about an axis from a fixed sequence, and
  // KICK radians a second or up to 1.4 times that, as the sequence has it.
  function kickAt(out, n) {
    const a = 2.4 * n;
    out[0] = KICK * Math.cos(a); out[1] = KICK * Math.sin(1.7 * a); out[2] = KICK * Math.sin(a);
    return out;
  }

  // The angle a spin of `speed` radians a second turns in dt seconds while it dies away.
  function kickAngle(speed, dt) {
    return (speed * (1 - Math.exp(-KICK_FALL * dt))) / KICK_FALL;
  }

  // Turn q (a quaternion: x, y, z, w) by `angle` radians about the world axis x, y, z (one long).
  function turn(q, x, y, z, angle) {
    const s = Math.sin(angle / 2), ax = x * s, ay = y * s, az = z * s, aw = Math.cos(angle / 2);
    const bx = q[0], by = q[1], bz = q[2], bw = q[3];
    const nx = aw * bx + ax * bw + ay * bz - az * by, ny = aw * by - ax * bz + ay * bw + az * bx;
    const nz = aw * bz + ax * by - ay * bx + az * bw, nw = aw * bw - ax * bx - ay * by - az * bz;
    const long = Math.hypot(nx, ny, nz, nw);
    q[0] = nx / long; q[1] = ny / long; q[2] = nz / long; q[3] = nw / long;
    return q;
  }

  // One step of the tumble, dt seconds long with its middle at `mid` seconds on the clock:
  // q turns about the wandering axis at its own rate, and about the kick's axis (`spin`:
  // radians a second each way) between two halves of that turn, so that a long step and
  // two short ones end up the same way round. The kick dies away, and one that has all but
  // died is none.
  const AXIS = [0, 0, 0];
  function tumble(q, spin, mid, flame, dt) {
    axisAt(AXIS, mid);
    const half = (turnRate(flame) * dt) / 2, speed = Math.hypot(spin[0], spin[1], spin[2]);
    turn(q, AXIS[0], AXIS[1], AXIS[2], half);
    if (speed > 1e-4) {
      turn(q, spin[0] / speed, spin[1] / speed, spin[2] / speed, kickAngle(speed, dt));
      const left = Math.exp(-KICK_FALL * dt);
      spin[0] *= left; spin[1] *= left; spin[2] *= left;
    } else { spin[0] = 0; spin[1] = 0; spin[2] = 0; }
    turn(q, AXIS[0], AXIS[1], AXIS[2], half);
    return q;
  }

  // ── The shader ──────────────────────────────────────────────────────────────
  // A facet, in light only: its ridges (each corner of a facet carries one of 1,0,0 / 0,1,0 /
  // 0,0,1, so the least of the three says how near a ridge a point is), light bleeding in
  // from them, a flash when the facet mirrors a lamp toward the eye, and its band.
  const VERT = `
    attribute vec3 bary;
    attribute float faceBand;
    uniform float uBands[${BANDS}];
    varying vec3 vBary, vNormal, vView;
    varying float vBand;
    void main() {
      vBary = bary;
      vBand = uBands[int(faceBand)];
      vec4 w = modelMatrix * vec4(position, 1.0);
      vNormal = normalize(mat3(modelMatrix) * normal);
      vView = normalize(cameraPosition - w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const FRAG = `
    precision highp float;
    uniform vec3 uColor;
    uniform float uBright;
    varying vec3 vBary, vNormal, vView;
    varying float vBand;
    void main() {
      vec3 n = normalize(vNormal);
      float front = gl_FrontFacing ? 1.0 : 0.0;
      if (front < 0.5) n = -n;
      float m = min(vBary.x, min(vBary.y, vBary.z)), w = fwidth(m);
      float ridge = 1.0 - smoothstep(0.007 - w, 0.007 + w, m);
      float bloom = exp(-m / 0.045);
      float facing = max(dot(n, vView), 0.0);
      vec3 h1 = normalize(normalize(vec3(0.5, 0.8, 0.6)) + vView), h2 = normalize(normalize(vec3(-0.7, 0.2, 0.5)) + vView);
      float flash = pow(max(dot(n, h1), 0.0), 40.0) * 1.6 + pow(max(dot(n, h2), 0.0), 16.0) * 0.5;
      float sheen = pow(1.0 - facing, 2.0) * 0.1;
      float face = (flash * 0.7 + vBand * 0.16) * front + sheen;   // only the near facets flash and answer their bands
      float side = mix(0.3, 1.0, front);                            // the far facets are dimmer
      gl_FragColor = vec4(uColor * (ridge * 0.6 + bloom * 0.14 + face) * side * uBright, 1.0);
    }`;

  // ── The scene ───────────────────────────────────────────────────────────────
  // Everything below runs only when the scene is built: THREE, TimbreScene and the core.js
  // globals (the mic, the bins, the palette, the settings) are looked up then.

  // The scene definition, for TimbreScene.factory().
  function definition() {
    const ID = 'glass-prism';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : 50;
    };
    const bands = new Float32Array(BANDS), shown = new Array(BANDS).fill(0);
    const q = [0, 0, 0, 1], spin = [0, 0, 0], pose = [0, 0, 0], glow = [0, 0], copies = [];
    let THREE = null, heart = null, sight = null, right = null;
    // What the checks read. clock: seconds the scene has been live, which the axis wanders by.
    const s = { flame: 0, kick: 0, clock: 0, live: false, orbit: 0, colorT: 0, high: 0, apart: 0, bright: 0, kicks: 0 };

    function build(k) {
      THREE = k.THREE;
      sight = new THREE.Vector3(); right = new THREE.Vector3();
      // Twenty flat facets, three corners each; no corner is shared, so each facet can carry
      // its own band and its own three ridges.
      const geo = new THREE.IcosahedronGeometry(R, 0);
      const n = geo.attributes.position.count, bary = new Float32Array(n * 3), band = new Float32Array(n);
      for (let i = 0; i < n; i++) { bary[i * 3 + (i % 3)] = 1; band[i] = bandOf(Math.floor(i / 3)); }
      geo.setAttribute('bary', new THREE.BufferAttribute(bary, 3));
      geo.setAttribute('faceBand', new THREE.BufferAttribute(band, 1));
      // The crystal three times over, one for each colour, the far facets showing through the near.
      for (let c = 0; c < 3; c++) {
        const mat = k.addLight(new THREE.ShaderMaterial({
          vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, depthTest: false,
          uniforms: { uColor: { value: new THREE.Color() }, uBright: { value: 0 }, uBands: { value: shown } },
        }));
        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false;
        k.scene.add(mesh);
        copies.push(mesh);
      }
      // The light gathered inside it.
      heart = new THREE.Sprite(k.addLight(new THREE.SpriteMaterial({ map: k.glowTexture(255, 255, 255), depthTest: false })));
      k.scene.add(heart);
    }

    // The palette colour at t, as the shader wants it (linear), into c.
    function palette(c, t) {
      const p = getColor(t);
      return c.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = (0.25 * Math.sin(0.12 * t) + 0.06 * Math.sin(0.31 * t + 1)) * knob('cameraDrift') / 50;

      // With the mic and Idle animation both off, the crystal stops turning.
      s.live = !!(micActive || cfgIdleAnim);
      if (s.live) s.clock += dt;
      const flame = s.flame = settle(audio.flame), kick = s.kick = settle(audio.kick);

      // Each band is followed: quick up, slower down.
      for (let b = 0; b < BANDS; b++) {
        let v = 0;
        if (micActive) v = loudness(frequencies, b, cfgGain);
        else if (cfgIdleAnim) v = idle(b, s.clock);
        bands[b] = follow(bands[b], v, v > bands[b] ? RISE : FALL, dt);
        if (v === 0) bands[b] = settle(bands[b]);   // all but silent is silent: a muted crystal comes to rest
        shown[b] = bands[b];
      }
      s.high = highOf(bands);

      // The tumble. A beat kicks it about the next axis of the sequence.
      if (audio.beat) kickAt(spin, ++s.kicks);
      if (s.live) tumble(q, spin, s.clock - dt / 2, flame, dt);
      else { spin[0] = 0; spin[1] = 0; spin[2] = 0; }

      // The three colours, apart by as much as the high end and a beat say.
      s.apart = follow(s.apart, apartOf(s.high, kick, knob('chroma')), APART_RATE, dt);
      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      s.bright = brightOf(flame, kick);
      k.camera.getWorldDirection(sight);
      right.setFromMatrixColumn(k.camera.matrixWorld, 0);
      for (let c = 0; c < 3; c++) {
        const m = copies[c], u = m.material.uniforms;
        copyAt(pose, c, s.apart);
        m.quaternion.set(q[0], q[1], q[2], q[3]);
        m.rotateOnWorldAxis(sight, pose[1]);
        m.scale.setScalar(pose[0]);
        m.position.copy(right).multiplyScalar(pose[2]);
        palette(u.uColor.value, colorT + c);
        u.uBright.value = s.bright;
      }
      heartOf(glow, flame, kick);
      palette(heart.material.color, colorT + 1).multiplyScalar(glow[0]);
      heart.scale.setScalar(glow[1]);
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: PITCH,
      cooling: [Infinity, Infinity, Infinity],   // fading light keeps its colour
      build,
      update,
      debug() {
        if (!heart) return Object.assign({}, s);
        // What is drawn, read back from the meshes and their uniforms.
        const out = { r: 0, g: 0, b: 0 };
        const srgb = (c) => { c.getRGB(out, THREE.SRGBColorSpace); return [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)]; };
        return Object.assign({
          q: q.slice(), spin: spin.slice(), bands: Array.from(bands), given: copies[0].material.uniforms.uBands.value.slice(),
          copies: copies.map((m) => ({
            turned: m.quaternion.toArray(), scale: m.scale.x, at: m.position.toArray(), color: srgb(m.material.uniforms.uColor.value), bright: m.material.uniforms.uBright.value,
            light: m.material.blending === THREE.CustomBlending && m.material.blendDst === THREE.OneFactor && m.material.depthTest === false && m.material.side === THREE.DoubleSide,
          })),
          heart: { size: heart.scale.x, light: [heart.material.color.r, heart.material.color.g, heart.material.color.b] },
          right: right.toArray(), sight: sight.toArray(),
        }, s);
      },
    };
  }

  globalThis.TimbreGlassPrism = {
    FACETS, BANDS, R, RISE, FALL, KICK, KICK_FALL, APART_RATE, FOV, PITCH, FRAME, VERT, FRAG,
    bandOf, loudness, idle, highOf, settle, apartOf, copyAt, brightOf, heartOf, turnRate, axisAt, kickAt, kickAngle, turn, tumble, definition,
  };
})();
