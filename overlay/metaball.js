// Timbre — the metaball: a ball of liquid metal that each band of the sound pulls a droplet
// out of. First the arithmetic: where each droplet leaves the ball, how far it goes and how
// large it is, the ball itself, the smooth union that makes one surface of them all, and
// the glow. Then the 3D scene, written against the scene kit: definition() returns what
// TimbreScene.factory() needs. The surface is drawn by marching rays through it in a shader.
//
// All timing comes from the caller (dt in seconds), never from counting frames, so the same
// sound gives the same blob at any frame rate.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreMetaball`), like chladni.js, so verify.mjs can import it under Node.
// Nothing here may touch document, window, THREE, TimbreScene or core.js globals at load
// time; the scene looks them up when it is built.

(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const DROPS = 8;                          // droplets: one for each of the eight lowest bins
  const REACH = 1.6;                        // how far from the middle a droplet goes at full band
  const ROOM = 0.16;                        // how far past the ball and its droplets the sphere the surface is drawn on reaches
  const SKIN = 1.02;                        // that sphere is drawn flat-sided: this much larger, so that its flats clear it
  const CORE = 0.74;                        // the ball's radius in silence
  const SMOOTH = 0.42;                      // surfaces nearer than this flow together
  const RISE = 12, FALL = 2.2;              // how fast a band is followed, up and down, a second
  const FOV = 30, PITCH = 12;               // the camera: how wide it sees and how far it looks down, in degrees
  const FRAME = { width: 5.2, height: 4.8, center: [0, 0, 0] };   // what the camera frames: tall enough for the furthest droplet on a beat
  const RAD = Math.PI / 180;

  // A band, eased: slow to leave and slow to arrive.
  function ease(v) {
    const t = clamp01(v);
    return t * t * (3 - 2 * t);
  }

  // The way droplet b leaves the ball, into out: the eight spread evenly round it (a spiral
  // from near the top to near the bottom), flattened a little so that none goes straight up.
  // Each is one long, so every droplet reaches as far.
  function direction(out, b) {
    const y = 1 - (2 * (b + 0.5)) / DROPS, r = Math.sqrt(1 - y * y), a = b * 2.39996, long = Math.hypot(r, 0.75 * y);
    out[0] = (Math.cos(a) * r) / long; out[1] = (0.75 * y) / long; out[2] = (Math.sin(a) * r) / long;
    return out;
  }

  // How far round the ball droplet b has turned after `clock` seconds, in radians: all turn
  // together, each a little ahead of or behind the rest.
  function swing(b, clock) {
    return 0.22 * clock + 0.3 * Math.sin(0.7 * clock + b);
  }

  // How far from the middle a droplet is: as its band is loud, eased; a beat throws it further.
  function reach(band, kick) {
    return REACH * ease(band) * (1 + 0.18 * kick);
  }

  // A droplet's radius: low bands are large and high bands small, and one still inside the
  // ball is smaller.
  function dropSize(b, band) {
    return (0.44 - 0.03 * b) * (0.55 + 0.45 * ease(band));
  }

  // Droplet b as x, y, z and radius, written into out from index `at`.
  const WAY = [0, 0, 0];
  function dropAt(out, at, b, band, kick, clock) {
    direction(WAY, b);
    const d = reach(band, kick), a = swing(b, clock), ca = Math.cos(a), sa = Math.sin(a);
    out[at] = (WAY[0] * ca + WAY[2] * sa) * d;
    out[at + 1] = WAY[1] * d + 0.06 * Math.sin(1.7 * clock + 2.1 * b) * ease(band);
    out[at + 2] = (-WAY[0] * sa + WAY[2] * ca) * d;
    out[at + 3] = dropSize(b, band);
    return out;
  }

  // The ball as x, y, z and radius, written into out from index `at`: in the middle, bobbing
  // a hair; loudness swells it and a beat swells it more.
  function coreAt(out, at, flame, kick, clock) {
    out[at] = 0; out[at + 1] = 0.04 * Math.sin(1.3 * clock); out[at + 2] = 0;
    out[at + 3] = CORE + 0.1 * flame + 0.07 * kick;
    return out;
  }

  // The smooth union of two distances: further apart than k they leave each other alone;
  // nearer, the smaller is pulled in, by up to a quarter of k.
  function smin(a, b, k) {
    const h = clamp01(0.5 + (0.5 * (b - a)) / k);
    return b + (a - b) * h - k * h * (1 - h);
  }

  // How far a point is from the surface (negative inside it): the ball and the droplets
  // (`balls`: x, y, z and radius of each, the ball first), joined by the smooth union.
  function field(x, y, z, balls) {
    let d = Math.hypot(x - balls[0], y - balls[1], z - balls[2]) - balls[3];
    for (let i = 1; i <= DROPS; i++) { const a = i * 4; d = smin(d, Math.hypot(x - balls[a], y - balls[a + 1], z - balls[a + 2]) - balls[a + 3], SMOOTH); }
    return d;
  }

  // The radius of the sphere the surface is drawn on: ROOM past the furthest reach of the ball
  // or any droplet, so that it holds the surface and its soft edge and little else.
  function boundOf(balls) {
    let far = 0;
    for (let i = 0; i <= DROPS; i++) { const a = i * 4; far = Math.max(far, Math.hypot(balls[a], balls[a + 1], balls[a + 2]) + balls[a + 3]); }
    return far + ROOM;
  }

  // A level that has all but died away is none. The voice and a beat die away for ever and
  // never arrive, and a picture that should be still would go on changing by a hair.
  function settle(v) {
    return v < 1e-4 ? 0 : v;
  }

  // How much the metal glows in its own colour: with the voice, and more on a beat.
  function glowOf(flame, kick) {
    return 0.25 * flame + 0.5 * kick;
  }

  // The width of the surface's soft edge, as an angle seen from the camera: a pixel and a
  // half of a picture `height` pixels tall, with the camera zoomed by `zoom`.
  function pixelOf(height, zoom) {
    return ((2 * Math.tan((FOV * RAD) / 2)) / (Math.max(1, height) * zoom)) * 1.5;
  }

  // How loud a band is, 0..1: its bin, times Gain.
  function loudness(bins, band, gain) {
    if (!bins || !(band < bins.length)) return 0;
    return clamp01((bins[band] / 255) * gain);
  }

  // With the mic off and Idle animation on: how loud band b pretends to be at t seconds.
  function idle(b, t) {
    return Math.max(0, 0.34 + 0.34 * Math.sin(0.5 * t + 1.9 * b)) * (b < 5 ? 1 : 0.6);
  }

  // ── The shader ──────────────────────────────────────────────────────────────
  // The surface is field() again, in GLSL, from the same numbers. A ray is marched from
  // where it enters the sphere the surface is drawn on until it meets the surface or leaves
  // the sphere. One that only just misses gives the soft edge; one that only just misses a
  // droplet and then meets the metal behind it is a blend of the two, so the outlines inside
  // the blob are as smooth as the one round it.
  const VERT = `
    varying vec3 vWorld;
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const FRAG = `
    precision highp float;
    varying vec3 vWorld;
    uniform vec4 uBall[${DROPS + 1}];            // x, y, z and radius: the ball, then the droplets
    uniform vec3 uSky, uHorizon, uBody;
    uniform float uChrome, uGlow, uPixel, uBound;
    const float HIT = 0.0015;                  // a ray this near the surface has met it
    float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
    float field(vec3 p) {
      float d = length(p - uBall[0].xyz) - uBall[0].w;
      for (int i = 1; i < ${DROPS + 1}; i++) d = smin(d, length(p - uBall[i].xyz) - uBall[i].w, ${SMOOTH});
      return d;
    }
    vec3 normalAt(vec3 p) {
      vec2 e = vec2(0.002, 0.0);
      return normalize(vec3(field(p + e.xyy) - field(p - e.xyy), field(p + e.yxy) - field(p - e.yxy), field(p + e.yyx) - field(p - e.yyx)));
    }
    // What the metal mirrors: a sky of one palette colour over a bright horizon of another,
    // the metal's own colour dimly below, and two soft white lamps.
    vec3 sky(vec3 r) {
      vec3 c = mix(uHorizon * 1.3, uSky * 0.85, smoothstep(0.0, 0.7, r.y));
      c = mix(c, uBody * 0.07, smoothstep(0.02, -0.12, r.y));
      c += uHorizon * 0.5 * exp(-abs(r.y) * 14.0);
      c += vec3(2.4) * pow(max(dot(r, normalize(vec3(0.5, 0.7, 0.5))), 0.0), 60.0);
      c += vec3(0.9) * pow(max(dot(r, normalize(vec3(-0.7, 0.3, 0.4))), 0.0), 18.0);
      return c;
    }
    // The colour of the metal at p, seen along rd.
    vec3 shade(vec3 p, vec3 rd) {
      vec3 n = normalAt(p);
      float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
      vec3 mirror = sky(reflect(rd, n));
      vec3 soft = uBody * (0.10 + 0.55 * max(dot(n, normalize(vec3(0.4, 0.8, 0.5))), 0.0)) + uSky * 0.25 * rim;
      vec3 col = mix(soft, mirror * mix(uBody, vec3(1.0), 0.45), 0.25 + 0.75 * uChrome);
      return col + uHorizon * rim * 0.35 + uBody * uGlow * (0.15 + 0.6 * rim);
    }
    // How much of a pixel the metal covers when a ray passes d from it, t along the ray.
    float cover(float d, float t) { return 1.0 - smoothstep(HIT, HIT + uPixel * t, d); }
    void main() {
      vec3 ro = cameraPosition, rd = normalize(vWorld - cameraPosition);
      float b = dot(ro, rd), tOut = -b + sqrt(max(b * b - dot(ro, ro) + uBound * uBound, 0.0));   // where the ray leaves the sphere
      float t = max(0.0, length(vWorld - ro) - 0.01);
      // graze: the nearest the ray came to metal that it then left behind (or never reached).
      float graze = 1e9, tGraze = t, was = 1e9, tWas = t;
      bool hit = false;
      for (int i = 0; i < 128; i++) {
        float d = field(ro + rd * t);
        if (d < HIT) { hit = true; break; }
        if (d > was && was < graze) { graze = was; tGraze = tWas; }
        was = d; tWas = t;
        t += d * 0.9;
        if (t > tOut) break;
      }
      if (!hit && was < graze) { graze = was; tGraze = tWas; }
      float edge = cover(graze, tGraze);
      if (!hit && edge <= 0.02) discard;        // (so faint an edge would linger as light)
      vec3 col = edge > 0.0 ? shade(ro + rd * tGraze, rd) : vec3(0.0);
      if (hit) col = mix(shade(ro + rd * t, rd), col, edge);
      gl_FragColor = vec4(col, hit ? 1.0 : edge);
    }`;

  // ── The scene ───────────────────────────────────────────────────────────────
  // Everything below runs only when the scene is built: THREE, TimbreScene and the core.js
  // globals (the mic, the bins, the palette, the settings) are looked up then.

  // The scene definition, for TimbreScene.factory().
  function definition() {
    const ID = 'metaball';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : 50;
    };
    const bands = new Float32Array(DROPS), places = new Float32Array((DROPS + 1) * 4), balls = [];
    let THREE = null, mesh = null, mat = null;
    // What the checks read. clock: seconds the scene has been live, which the droplets turn by.
    const s = { flame: 0, kick: 0, clock: 0, live: false, orbit: 0, colorT: 0, chrome: 0, glow: 0, pixel: 0, out: 0, bound: 0 };

    function build(k) {
      THREE = k.THREE;
      for (let i = 0; i <= DROPS; i++) balls.push(new THREE.Vector4(0, 0, 0, 0.1));
      mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, transparent: true,
        uniforms: {
          uBall: { value: balls }, uSky: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBody: { value: new THREE.Color() },
          uChrome: { value: 0.5 }, uGlow: { value: 0 }, uPixel: { value: 0.002 }, uBound: { value: 1 },
        },
      });
      // The surface is drawn on a sphere that holds it; the shader finds it inside. The sphere
      // is one in radius, and is scaled each frame to what the blob needs.
      mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat);
      mesh.frustumCulled = false;
      k.scene.add(mesh);
    }

    // The palette colour at t, as the shader wants it (linear), into c.
    function palette(c, t) {
      const p = getColor(t);
      c.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = (0.3 * Math.sin(0.14 * t) + 0.08 * Math.sin(0.33 * t + 1)) * knob('cameraDrift') / 50;

      // With the mic and Idle animation both off, the droplets stop turning (and drift home).
      s.live = !!(micActive || cfgIdleAnim);
      if (s.live) s.clock += dt;
      const flame = s.flame = settle(audio.flame), kick = s.kick = settle(audio.kick);

      // The ball, and each band's droplet. A band is followed: quick out, slow home.
      coreAt(places, 0, flame, kick, s.clock);
      let out = 0;
      for (let b = 0; b < DROPS; b++) {
        let v = 0;
        if (micActive) v = loudness(frequencies, b, cfgGain);
        else if (cfgIdleAnim) v = idle(b, s.clock);
        bands[b] = follow(bands[b], v, v > bands[b] ? RISE : FALL, dt);
        if (v === 0) bands[b] = settle(bands[b]);   // all but home is home: a muted blob comes to rest
        dropAt(places, 4 + b * 4, b, bands[b], kick, s.clock);
        if (ease(bands[b]) > 0.45) out++;
      }
      s.out = out;
      for (let i = 0; i <= DROPS; i++) balls[i].set(places[i * 4], places[i * 4 + 1], places[i * 4 + 2], places[i * 4 + 3]);
      s.bound = boundOf(places);
      mesh.scale.setScalar(s.bound * SKIN);

      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      const u = mat.uniforms;
      palette(u.uBody.value, colorT); palette(u.uHorizon.value, colorT + 1); palette(u.uSky.value, colorT + 2);
      s.chrome = u.uChrome.value = clamp01(knob('chrome') / 100);
      s.glow = u.uGlow.value = glowOf(flame, kick);
      u.uBound.value = s.bound * SKIN;
      s.pixel = u.uPixel.value = pixelOf(TimbreScene.renderScale(canvas3d.height) * canvas3d.height, k.camera.zoom);
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: PITCH,
      cooling: [Infinity, Infinity, Infinity],   // fading light keeps its colour
      build,
      update,
      debug() {
        if (!mat) return Object.assign({}, s);
        // What the shader is given, read back from its uniforms.
        const u = mat.uniforms, out = { r: 0, g: 0, b: 0 };
        const srgb = (c) => { c.getRGB(out, THREE.SRGBColorSpace); return [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)]; };
        const given = [];
        for (const v of u.uBall.value) given.push(v.x, v.y, v.z, v.w);
        return Object.assign({
          balls: given, bands: Array.from(bands), body: srgb(u.uBody.value), horizon: srgb(u.uHorizon.value), sky: srgb(u.uSky.value),
          uniforms: [u.uChrome.value, u.uGlow.value, u.uPixel.value, u.uBound.value], drawnOn: mesh.scale.x, transparent: mat.transparent === true,
        }, s);
      },
    };
  }

  globalThis.TimbreMetaball = {
    DROPS, REACH, ROOM, SKIN, CORE, SMOOTH, RISE, FALL, FOV, PITCH, FRAME, VERT, FRAG,
    ease, direction, swing, reach, dropSize, dropAt, coreAt, smin, field, boundOf, settle, glowOf, pixelOf, loudness, idle, definition,
  };
})();
