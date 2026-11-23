// Timbre — the sunburst: a small star with a crown of light. First the arithmetic: how many
// beams there are and which way each points, which band of the sound a beam follows, how
// long and wide it is, the strip of light it is drawn as, and how bright and what colour
// that strip is along its length. Then the 3D scene itself, written against the scene kit:
// definition() returns what TimbreScene.factory() needs.
//
// All timing comes from the caller (dt in seconds), never from counting frames, so the same
// sound gives the same picture at any frame rate.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreSunburst`), like flag.js, so verify.mjs can import it under Node. Nothing
// here may touch document, window, THREE, TimbreScene or core.js globals at load time; the
// scene looks them up when it is built.

(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const RAYS_MIN = 24, RAYS_MAX = 144;   // beams at Density 0 and 100
  const SEG = 12;                        // pieces along a beam
  const HIST = 25, HIST_HZ = 20;         // voice history: it reaches back 1.2 s; the tip of the longest beam on a beat is 1.17 s old
  const CORE = 0.6;                      // the star's radius
  const REACH = 3;                       // the longest beam, beyond the star's surface (before a beat)
  const HEIGHT = 3.6;                    // the star's centre above the unseen floor
  const BANDS = 9;                       // the poles hear this bin; speech lives in the first ten
  const TRAVEL = 0.9;                    // seconds light takes to travel REACH
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  // The star's mottle is three waves of the time its shader is handed, at rates of 1, 1.3 and
  // 0.7. They all come round every 20π (10, 13 and 7 turns), so that time is wrapped there:
  // the shader's float stays under 63 however long the scene has run, and the wrap is not seen.
  const MOTTLE_ROUND = 20 * Math.PI;

  // How many beams a Density setting means. No setting is the default, 50.
  function rayCount(density) {
    const d = Number.isFinite(density) ? clamp01(density / 100) : 0.5;
    return Math.round(RAYS_MIN + d * (RAYS_MAX - RAYS_MIN));
  }

  // n directions spread evenly over a sphere (x, y, z each), from the +y pole to the -y pole.
  function directions(n) {
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const y = 1 - ((i + 0.5) * 2) / n, r = Math.sqrt(1 - y * y), th = GOLDEN * i;
      out[i * 3] = Math.cos(th) * r; out[i * 3 + 1] = y; out[i * 3 + 2] = Math.sin(th) * r;
    }
    return out;
  }

  // A fixed number in 0..1 for each beam, so that neighbours differ.
  function scatter(i) {
    const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
    return v - Math.floor(v);
  }

  // Which band of the sound a beam follows, as a place among the frequency bins (fractions
  // allowed). y is the height of its direction: the belt round the middle (y = 0) hears bin 0
  // and both poles hear bin BANDS. The scatter moves it up to one bin either way.
  function bandOf(y, scatter01) {
    return Math.max(0, Math.pow(Math.abs(y), 1.2) * BANDS + (scatter01 - 0.5) * 2);
  }

  // How loud a band is, 0..1: read between two bins, times Gain.
  function loudness(bins, band, gain) {
    if (!bins || !bins.length) return 0;
    const b = Math.max(0, Math.min(bins.length - 1, band));
    const j = Math.max(0, Math.min(bins.length - 2, Math.floor(b))), f = b - j;
    const next = j + 1 < bins.length ? bins[j + 1] : bins[j];
    return clamp01(((bins[j] + (next - bins[j]) * f) / 255) * gain);
  }

  // What a beam answers to: its own band most, and the voice as a whole a little, so that no
  // beam is dead while someone talks.
  function answer(band, flame) {
    return Math.min(1, 0.7 * band + 0.45 * flame);
  }

  // A beam's length beyond the star's surface, and its width at the star.
  function lengthOf(amp, kick) {
    return REACH * (0.1 + 0.9 * amp) * (1 + 0.3 * kick);
  }
  function widthOf(amp, kick) {
    return 0.13 * (0.55 + 0.75 * amp) * (1 + 0.4 * kick);
  }

  // One beam as a strip of SEG + 1 pairs of points, written into out (x, y, z each) from
  // vertex `at`. Its spine runs from inside the star (0.7 of its radius from the centre) to
  // `len` beyond its surface. Its width lies across the beam and across the line of sight,
  // so the strip faces the camera; it tapers to 8% at the tip. centre, dir (a unit vector)
  // and cam are [x, y, z].
  function strip(out, at, centre, dir, cam, len, width) {
    const dx = dir[0], dy = dir[1], dz = dir[2];
    for (let j = 0; j <= SEG; j++) {
      const u = j / SEG, r = CORE * 0.7 + (len + CORE * 0.3) * u;
      const px = centre[0] + dx * r, py = centre[1] + dy * r, pz = centre[2] + dz * r;
      const vx = cam[0] - px, vy = cam[1] - py, vz = cam[2] - pz;
      // side = view x dir
      let sx = vy * dz - vz * dy, sy = vz * dx - vx * dz, sz = vx * dy - vy * dx;
      let l = Math.hypot(sx, sy, sz);
      if (l < 1e-6 * (1 + Math.hypot(vx, vy, vz))) {
        // The beam points straight at the camera: any direction across it will do.
        sx = -dz; sy = 0; sz = dx; l = Math.hypot(sx, sy, sz);
        if (l < 1e-6) { sx = 1; sy = 0; sz = 0; l = 1; }
      }
      const half = (0.5 * width * (1 - 0.92 * u)) / l;
      const a = (at + j * 2) * 3;
      out[a] = px - sx * half; out[a + 1] = py - sy * half; out[a + 2] = pz - sz * half;
      out[a + 3] = px + sx * half; out[a + 4] = py + sy * half; out[a + 5] = pz + sz * half;
    }
  }

  // How bright a beam is at u (0 at the star, 1 at its tip). pulse is the voice as it was
  // when the light at that point left the star; amp is the beam's own band; shimmer is the
  // flicker below.
  function glow(u, pulse, amp, kick, shimmer01) {
    return (0.12 + 1.9 * Math.pow(Math.max(0, pulse), 1.4) + 0.4 * kick) * Math.pow(Math.max(0, 1 - u), 0.6) * (0.6 + 0.6 * amp) * shimmer01;
  }

  // The high end makes a beam flicker, more the further out. wave is -1..1.
  function shimmer(high, u, wave) {
    return 1 + 0.9 * high * u * wave;
  }

  // A beam's colour at u, times brightness b: white at the star, its own colour (rgb, 0..1
  // each) from under half way out. Written into out and returned.
  function tint(out, rgb, u, b) {
    const mix = Math.min(1, 2.2 * u);
    out[0] = (1 + (rgb[0] - 1) * mix) * b; out[1] = (1 + (rgb[1] - 1) * mix) * b; out[2] = (1 + (rgb[2] - 1) * mix) * b;
    return out;
  }

  // ── The scene ───────────────────────────────────────────────────────────────
  // Everything below runs only when the scene is built: THREE, TimbreScene and the core.js
  // globals (the mic, the bins, the palette, the settings) are looked up then.

  const CORE_VERT = `
    varying vec3 vN; varying vec3 vV; varying vec3 vO;
    void main() {
      vO = position;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalMatrix * normal; vV = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`;
  // White-hot where the ball faces the viewer, its own colour at the limb, faintly mottled.
  const CORE_FRAG = `
    varying vec3 vN; varying vec3 vV; varying vec3 vO;
    uniform vec3 uHot, uRim; uniform float uGain, uT;
    void main() {
      float f = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
      float mottle = 0.94 + 0.06 * sin(9.0 * vO.x + uT) * sin(11.0 * vO.y - 1.3 * uT) * sin(8.0 * vO.z + 0.7 * uT);
      gl_FragColor = vec4(mix(uRim, uHot, pow(f, 1.6)) * uGain * mottle, 1.0);
    }`;

  // The scene definition, for TimbreScene.factory().
  function definition() {
    const ID = 'sunburst-3d';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : 50;
    };
    const PER = (SEG + 1) * 2;   // vertices in one beam
    const centre = [0, HEIGHT, 0], cam = [0, 0, 0], dir = [0, 0, 0], rgb = [0, 0, 0], shade = [0, 0, 0];
    const amps = new Float32Array(RAYS_MAX), bands = new Float32Array(RAYS_MAX), scatters = new Float32Array(RAYS_MAX);
    const pulses = new Float32Array(SEG + 1), brights = new Float32Array(SEG + 1);
    let THREE = null, core = null, halo = null, haze = null, beams = null, history = null;
    const clock = TimbreScene.createClock();   // the seconds the scene has been live, kept as a JavaScript number
    let dirs = null, n = 0;
    let q = null, qTilt = null, euler = null, v = null, yAxis = null, colour = null, white = null;
    // What the checks read. spin: how far the crown has turned; sway: the clock its tilt
    // wanders by (the Spin setting scales both); reach: the longest beam now; swell: the
    // star's size; clock: seconds the scene has been live; ref: the beam nearest the belt,
    // which debug() reports on.
    const s = { flame: 0, kick: 0, low: 0, high: 0, spin: 0, sway: 0, orbit: 0, reach: 0, rays: 0, swell: 1, live: false, clock: clock.seconds, colorT: 0, ref: 0 };
    const aim = [0, 0, 0];   // which way the reference beam points, in the world
    let refWidth = 0;

    // Change how many beams there are. A beam that stays keeps its loudness (its direction
    // and band are new); one that comes back starts from nothing.
    function setRays(count) {
      for (let i = n; i < count; i++) amps[i] = 0;
      n = count;
      dirs = directions(n);
      let nearest = Infinity;
      for (let i = 0; i < n; i++) {
        scatters[i] = scatter(i);
        bands[i] = bandOf(dirs[i * 3 + 1], scatters[i]);
        if (Math.abs(dirs[i * 3 + 1]) < nearest) { nearest = Math.abs(dirs[i * 3 + 1]); s.ref = i; }
      }
      beams.geometry.setDrawRange(0, n * SEG * 6);
      s.rays = n;
    }

    function build(k) {
      THREE = k.THREE;
      q = new THREE.Quaternion(); qTilt = new THREE.Quaternion(); euler = new THREE.Euler();
      v = new THREE.Vector3(); yAxis = new THREE.Vector3(0, 1, 0);
      colour = new THREE.Color(); white = new THREE.Color(1, 1, 1);
      history = TimbreScene.createHistory(HIST, HIST_HZ);

      // The star: a solid ball.
      core = new THREE.Mesh(new THREE.SphereGeometry(CORE, 48, 32), new THREE.ShaderMaterial({
        uniforms: { uHot: { value: new THREE.Color(1.5, 1.45, 1.35) }, uRim: { value: new THREE.Color(1, 1, 1) }, uGain: { value: 1 }, uT: { value: 0 } },
        vertexShader: CORE_VERT, fragmentShader: CORE_FRAG,
      }));
      core.position.fromArray(centre);
      k.scene.add(core);

      // Its glow: two soft discs of added light, one tight and one wide.
      const disc = k.glowTexture(255, 255, 255);
      halo = new THREE.Sprite(k.addLight(new THREE.SpriteMaterial({ map: disc })));
      haze = new THREE.Sprite(k.addLight(new THREE.SpriteMaterial({ map: disc })));
      halo.position.fromArray(centre); haze.position.fromArray(centre);
      k.scene.add(halo, haze);

      // The crown: every beam is a strip in one mesh, rewritten each frame.
      const geo = new THREE.BufferGeometry(), count = RAYS_MAX * PER;
      const position = new THREE.BufferAttribute(new Float32Array(count * 3), 3), tone = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
      position.setUsage(THREE.DynamicDrawUsage); tone.setUsage(THREE.DynamicDrawUsage);
      const uv = new Float32Array(count * 2), index = [];
      for (let i = 0; i < RAYS_MAX; i++) {
        for (let j = 0; j <= SEG; j++) {
          const a = i * PER + j * 2;
          uv[a * 2] = 0; uv[a * 2 + 1] = j / SEG; uv[a * 2 + 2] = 1; uv[a * 2 + 3] = j / SEG;
          if (j < SEG) index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      geo.setAttribute('position', position);
      geo.setAttribute('color', tone);
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(index);
      // Soft across its width: a bright spine with a wide dim skirt.
      const c = document.createElement('canvas');
      c.width = 128; c.height = 4;
      const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 128, 0);
      for (const [at, a] of [[0, 0], [0.18, 0.06], [0.36, 0.3], [0.5, 1], [0.64, 0.3], [0.82, 0.06], [1, 0]]) g.addColorStop(at, `rgba(255,255,255,${a})`);
      x.fillStyle = g; x.fillRect(0, 0, 128, 4);
      const across = k.keep(new THREE.CanvasTexture(c));
      beams = new THREE.Mesh(geo, k.addLight(new THREE.MeshBasicMaterial({ map: across, vertexColors: true, side: THREE.DoubleSide })));
      beams.frustumCulled = false;   // its points move every frame
      k.scene.add(beams);

      setRays(rayCount(knob('density')));
    }

    // The palette colour at t, as the colour buffer wants it (linear), into rgb.
    function palette(t) {
      const p = getColor(t);
      colour.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
      rgb[0] = colour.r; rgb[1] = colour.g; rgb[2] = colour.b;
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = (0.2 * Math.sin(0.17 * t) + 0.07 * Math.sin(0.43 * t + 2)) * knob('cameraDrift') / 50;
      const count = rayCount(knob('density'));
      if (count !== n) setRays(count);

      // With the mic and Idle animation both off, the crown does not turn and nothing flickers.
      s.live = !!(micActive || cfgIdleAnim);
      const turn = knob('spin') / 50;
      if (s.live) { s.clock = clock.step(dt); s.sway += turn * dt; }
      const c = s.clock;

      // The low end swells the star; the high end makes the beams flicker.
      let low = 0, high = 0;
      if (micActive) {
        if (micBands && frequencies) {
          // What values 0-3 and 5-14 of the 750 Hz spectrum gave: see "The re-mapped readers" in helix.js.
          low = Math.min(1, TimbreHelix.heard('bass', micBands) * cfgGain); high = Math.min(1, TimbreHelix.bandMean(frequencies, 24, 31) * cfgGain * 2.38);
        }
      } else if (cfgIdleAnim) { low = 0.25 + 0.2 * Math.sin(0.9 * c); high = 0.15 + 0.12 * Math.sin(1.7 * c + 1); }
      s.low = follow(s.low, low, low > s.low ? 14 : 4, dt);
      s.high = follow(s.high, high, high > s.high ? 20 : 6, dt);
      s.flame = audio.flame; s.kick = audio.kick;
      history.step(audio.flame, dt);

      // The crown turns about a tilted axis; the tilt wanders slowly. Spin scales both, so
      // Spin 0 holds the crown quite still.
      if (s.live) s.spin += (0.1 + 0.35 * audio.flame + 0.5 * audio.kick) * turn * dt;
      qTilt.setFromEuler(euler.set(0.5 + 0.12 * Math.sin(0.13 * s.sway), 0, 0.22 * Math.sin(0.09 * s.sway + 1)));
      q.setFromAxisAngle(yAxis, s.spin).premultiply(qTilt);
      cam[0] = k.camera.position.x; cam[1] = k.camera.position.y; cam[2] = k.camera.position.z;

      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      const position = beams.geometry.attributes.position, tone = beams.geometry.attributes.color;
      let reach = 0;
      for (let i = 0; i < n; i++) {
        // How loud this beam's band is.
        let target = 0;
        if (micActive) target = answer(loudness(slices, bands[i], cfgGain), audio.flame);
        else if (cfgIdleAnim) target = clamp01(0.3 + 0.22 * Math.sin(i * 0.7 + c * 1.4) + 0.1 * Math.sin(i * 2.3 - c * 0.8));
        amps[i] = follow(amps[i], target, target > amps[i] ? 22 : 3.5, dt);
        const len = lengthOf(amps[i], audio.kick);
        if (len > reach) reach = len;
        v.set(dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2]).applyQuaternion(q);
        dir[0] = v.x; dir[1] = v.y; dir[2] = v.z;
        const width = widthOf(amps[i], audio.kick);
        if (i === s.ref) { aim[0] = v.x; aim[1] = v.y; aim[2] = v.z; refWidth = width; }
        strip(position.array, i * PER, centre, dir, cam, len, width);

        palette(colorT + (i / n) * 1.4);
        const wave = Math.sin(c * (9 + 11 * scatters[i]) + scatters[i] * 40);   // c stands still when the scene is not live
        for (let j = 0; j <= SEG; j++) {
          const u = j / SEG, r = CORE * 0.7 + (len + CORE * 0.3) * u;
          // The voice as it was when the light here left the star's surface.
          const pulse = history.heard((Math.max(0, r - CORE) / REACH) * TRAVEL);
          const b = glow(u, pulse, amps[i], audio.kick, shimmer(s.high, u, wave));
          tint(shade, rgb, u, b);
          const a = i * PER + j * 2;
          tone.setXYZ(a, shade[0], shade[1], shade[2]); tone.setXYZ(a + 1, shade[0], shade[1], shade[2]);
          if (i === s.ref) { pulses[j] = pulse; brights[j] = b; }
        }
      }
      position.needsUpdate = true; tone.needsUpdate = true;
      s.reach = reach;

      // The star and its glow.
      palette(colorT + 0.7);
      s.swell = 1 + 0.22 * s.low + 0.3 * audio.kick;
      core.scale.setScalar(s.swell);
      const uniforms = core.material.uniforms;
      uniforms.uT.value = TimbreScene.phase(c * 0.8, MOTTLE_ROUND);
      uniforms.uGain.value = 1.3 + 1.3 * audio.flame + 0.9 * audio.kick;
      uniforms.uRim.value.setRGB(rgb[0] * 1.1 + 0.12, rgb[1] * 1.1 + 0.12, rgb[2] * 1.1 + 0.12);
      const lit = 0.3 + 0.9 * audio.flame + 0.8 * audio.kick;
      colour.setRGB(rgb[0], rgb[1], rgb[2]);
      halo.material.color.copy(colour).lerp(white, 0.45).multiplyScalar(lit * 0.7);
      halo.scale.setScalar(CORE * s.swell * (4.2 + 1.6 * audio.flame + 2 * audio.kick));
      haze.material.color.copy(colour).multiplyScalar(lit * 0.45);
      haze.scale.setScalar(CORE * (9 + 5 * audio.flame + 4 * audio.kick));
    }

    return {
      frame: { width: 8.4, height: 7.4, center: [0, HEIGHT, 0] },
      fov: 30,
      pitch: 5,
      cooling: [Infinity, Infinity, Infinity],   // fading light keeps its colour
      build,
      update,
      debug() {
        if (!beams) return Object.assign({}, s);
        // The reference beam's own colour as the buffer holds it half way out, with its brightness taken back out.
        const tone = beams.geometry.attributes.color, a = s.ref * PER + SEG, b = brights[SEG / 2] || 1, out = { r: 0, g: 0, b: 0 };
        colour.setRGB(tone.getX(a) / b, tone.getY(a) / b, tone.getZ(a) / b).getRGB(out, THREE.SRGBColorSpace);
        return Object.assign({
          hist: Array.from(history.byAge),
          amps: Array.from(amps.subarray(0, n)),
          ys: Array.from({ length: n }, (_, i) => dirs[i * 3 + 1]),   // each beam's height on the crown, before it turns
          pulse: Array.from(pulses), bright: Array.from(brights),      // along the reference beam
          tip: [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)],
          cam: cam.slice(),                                            // where the strips were turned to face
          aim: aim.slice(), width: refWidth,                           // the reference beam's direction and width
          glowSize: halo.scale.x,
          given: [core.material.uniforms.uT.value],                    // the time the star's shader was handed
          drawn: beams.geometry.drawRange.count,
        }, s);
      },
    };
  }

  globalThis.TimbreSunburst = {
    RAYS_MIN, RAYS_MAX, SEG, HIST, HIST_HZ, CORE, REACH, HEIGHT, BANDS, TRAVEL, MOTTLE_ROUND,
    rayCount, directions, scatter, bandOf, loudness, answer, lengthOf, widthOf, strip, glow, shimmer, tint, definition,
  };
})();
