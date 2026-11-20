// Timbre — the phosphor: glowing traces on a deck of dark slices. First the arithmetic: how
// many slices there are, where each is and how old the voice it shows, the wave each band of
// the sound makes, the shape of a trace and how tall it stands, the strip of light it is
// drawn as, the wall under it, and how bright and what colour both are. Then the 3D scene
// itself, written against the scene kit: definition() returns what TimbreScene.factory()
// needs.
//
// All timing comes from the caller (dt in seconds), never from counting frames, so the same
// sound gives the same deck at any frame rate.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbrePhosphor`), like mountains.js, so verify.mjs can import it under Node.
// Nothing here may touch document, window, THREE, TimbreScene or core.js globals at load
// time; the scene looks them up when it is built.

(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  const SLICES_MIN = 12, SLICES_MAX = 36;   // slices at Depth 0 and 100
  const P = 96;                             // points along a trace
  const K = 10;                             // bands drawn; speech lives in the first ten bins
  const W = 6.4, D = 3.6;                   // the deck: width and depth
  const SPAN = 2.2;                         // seconds of the voice the deck holds, front to back
  const HZ = 24, HIST = 56;                 // voice history: it reaches back 2.29 s
  const LOW = 0.14;                         // a slice's height in silence: its foot
  const TALL = 1.5;                         // the most a loud voice adds to that
  const GLOW = 0.28;                        // how far below its trace a slice glows
  const PINNED = 0.16;                      // a trace is held down over this share of its length at each end
  const FRONT = 0.006;                      // how far in front of its slice a trace lies
  const RISE = 20, FALL = 8;                // how fast a band is followed, up and down, a second
  const FOV = 30, PITCH = 30;               // the camera: how wide it sees and how far it looks down, in degrees
  const FRAME = { width: 7.6, height: 4.4, center: [0, 0.55, 0] };   // what the camera frames
  // The deck as a box, for the Rotate settings to keep in the frame: its feet, and its tallest trace on a beat.
  const BOX = { min: [-W / 2, 0, -D / 2], max: [W / 2, LOW + TALL * 1.25, D / 2] }, VIEW = { frame: FRAME, fov: FOV, pitch: PITCH };
  const RAD = Math.PI / 180;
  const REACH = 23;                         // a beat and the white heat reach as deep as they would in a deck of 24 slices

  // How many slices a Depth setting means. No setting is the default, 50.
  function sliceCount(depth) {
    const d = Number.isFinite(depth) ? clamp01(depth / 100) : 0.5;
    return Math.round(SLICES_MIN + d * (SLICES_MAX - SLICES_MIN));
  }

  // Where slice i of n is in the deck, 0 at the front and 1 at the back; how old the voice
  // it shows is; and where it stands (the front is nearest the viewer).
  function backOf(i, n) {
    return n > 1 ? i / (n - 1) : 0;
  }
  function ageOf(back) {
    return back * SPAN;
  }
  function zOf(back) {
    return D / 2 - back * D;
  }

  // Where point j of a trace is, across the deck.
  function xOf(j) {
    return (j / (P - 1) - 0.5) * W;
  }

  // Each band of the sound is one sine across the width of the deck: how many waves it has,
  // how fast it runs along the trace (radians a second; odd bands run the other way), and
  // how much it counts.
  function waves(b) {
    return 1.2 + 0.9 * b;
  }
  function pace(b) {
    return (0.9 + 0.55 * b) * (b % 2 ? -1 : 1);
  }
  function weight(b) {
    return 1 / (1 + 0.15 * b);
  }
  const WAVES = new Float64Array(K), WEIGHT = new Float64Array(K);
  for (let b = 0; b < K; b++) { WAVES[b] = 2 * Math.PI * waves(b); WEIGHT[b] = weight(b); }

  // How loud a band is, 0..1: its bin, times Gain.
  function loudness(bins, band, gain) {
    if (!bins || !(band < bins.length)) return 0;
    return clamp01((bins[band] / 255) * gain);
  }

  // The shape of a trace at u (0 at one end, 1 at the other), -1..1: the bands' sines added,
  // each as strong as its band is loud (amps, 0..1 each) and moved along by its phase, and
  // the whole scaled to the bands' total, so that the shape says which bands are sounding
  // and the height (below) says how loud.
  function shape(u, amps, phases) {
    let sum = 0.15, w = 0;
    for (let b = 0; b < K; b++) {
      const a = amps[b] * WEIGHT[b];
      if (a === 0) continue;
      sum += a;
      w += a * Math.sin(WAVES[b] * u + phases[b]);
    }
    return w / sum;
  }

  // How tall the trace of the slice at `back` stands, as a share of TALL: as the voice was
  // loud, and a beat lifts the nearest slices. (The beat and the white heat below go by how
  // far back a slice is, not by its number, so they reach as deep whatever the Depth.)
  function stand(level, kick, back) {
    return Math.pow(Math.max(0, level), 0.9) * (1 + 0.25 * kick * Math.exp(-back * REACH / 4));
  }

  // The height of a point of a trace: the foot, plus what the voice adds, which is more
  // where the wave is up and less where it is down, and nothing where the trace is pinned.
  function heightOf(A, pinned, w) {
    return LOW + TALL * A * pinned * (0.55 + 0.45 * w);
  }

  // A trace is held down at its two ends (pin) and its light fades out there (ends).
  function pin(u) {
    return ease(0, PINNED, u) * ease(0, PINNED, 1 - u);
  }
  function ends(u) {
    return ease(0, PINNED, 2.2 * u) * ease(0, PINNED, 2.2 * (1 - u));
  }

  // One trace as a strip of P pairs of points, written into out (x, y, z each) from vertex
  // `at`. xs and ys are the trace's points. Each pair is centred on the trace, `half` either
  // side of it, across the trace, the lower point first. The strip lies flat at depth z, in
  // the plane of its slice: a strip turned to face the camera would, on a steep flank, put
  // half of itself behind its own slice. The camera is always in front of the deck, so a
  // flat strip is seen nearly full on.
  function strip(out, at, xs, ys, z, half) {
    for (let j = 0; j < P; j++) {
      const j0 = j > 0 ? j - 1 : 0, j1 = j < P - 1 ? j + 1 : P - 1;
      const tx = xs[j1] - xs[j0], ty = ys[j1] - ys[j0], k = half / (Math.hypot(tx, ty) || 1), a = (at + j * 2) * 3;
      out[a] = xs[j] + ty * k; out[a + 1] = ys[j] - tx * k; out[a + 2] = z;
      out[a + 3] = xs[j] - ty * k; out[a + 4] = ys[j] + tx * k; out[a + 5] = z;
    }
  }

  // The slice under a trace as P triples of points, from vertex `at`: the top edge, the
  // point GLOW below it where its glow has died (never under the foot), and the foot.
  function wall(out, at, xs, ys, z) {
    for (let j = 0; j < P; j++) {
      const a = (at + j * 3) * 3;
      out[a] = xs[j]; out[a + 1] = ys[j]; out[a + 2] = z;
      out[a + 3] = xs[j]; out[a + 4] = Math.max(0, ys[j] - GLOW); out[a + 5] = z;
      out[a + 6] = xs[j]; out[a + 7] = 0; out[a + 8] = z;
    }
  }

  // The traces dim toward the back of the deck.
  function fade(back) {
    return 0.12 + 0.88 * Math.pow(Math.max(0, 1 - back), 1.3);
  }

  // How bright the trace of the slice at `back` is; a beat flashes the nearest ones.
  function bright(A, kick, back) {
    return (0.3 + 1.4 * A + 0.9 * kick * Math.exp(-back * REACH / 3)) * fade(back);
  }

  // How far toward white a trace is: the nearest are white-hot.
  function hot(back) {
    return 0.55 * Math.exp(-back * REACH / 2.5);
  }

  // Half the width of the trace of the slice at `back`.
  function halfWidth(A, kick, back) {
    return (0.045 + 0.035 * A + 0.03 * kick * Math.exp(-back * REACH / 3)) * (1 - 0.35 * back);
  }

  // How bright a slice glows just under its trace.
  function under(A, back) {
    return (0.03 + 0.2 * A) * fade(back);
  }

  // A trace's colour: its own (rgb, 0..1 each), mixed toward white by `heat`, times
  // brightness b. Written into out and returned.
  function tint(out, rgb, heat, b) {
    out[0] = (rgb[0] + (1 - rgb[0]) * heat) * b; out[1] = (rgb[1] + (1 - rgb[1]) * heat) * b; out[2] = (rgb[2] + (1 - rgb[2]) * heat) * b;
    return out;
  }

  // With the mic off and Idle animation on: how loud band b pretends to be at t seconds.
  function idle(b, t) {
    return Math.max(0, 0.3 + 0.25 * Math.sin(0.7 * t + 1.3 * b)) * (b < 5 ? 1 : 0.4);
  }

  // ── The scene ───────────────────────────────────────────────────────────────
  // Everything below runs only when the scene is built: THREE, TimbreScene and the core.js
  // globals (the mic, the bins, the palette, the settings) are looked up then.

  // The scene definition, for TimbreScene.factory().
  function definition() {
    const ID = 'phosphor';
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name, unset = 50) => {
      const v = typeof perViz !== 'undefined' && perViz[ID];
      return v && typeof v[name] === 'number' ? v[name] : unset;
    };
    const xs = new Float32Array(P), us = new Float32Array(P), pins = new Float32Array(P), tips = new Float32Array(P), ys = new Float32Array(P);
    for (let j = 0; j < P; j++) { us[j] = j / (P - 1); xs[j] = xOf(j); pins[j] = pin(us[j]); tips[j] = ends(us[j]); }
    const amps = new Float32Array(K), heardNow = new Float32Array(K), phases = new Float64Array(K), rgb = [0, 0, 0], tone = [0, 0, 0];
    const stands = new Float32Array(SLICES_MAX), peaks = new Float32Array(SLICES_MAX), brights = new Float32Array(SLICES_MAX), widths = new Float32Array(SLICES_MAX);
    const front = new Float32Array(P), mid = new Float32Array(P), lag = new Float64Array(K), heards = new Float32Array(SLICES_MAX);
    let THREE = null, whole = null, walls = null, lines = null, level = null, colour = null, n = 0;
    let pose = { scale: 1, x: 0, y: 0, z: 0 };
    const turned = [0, 0, 0];
    const bands = [];
    // What the checks read. clock: seconds the scene has been live, which the waves run by;
    // slices: how many are drawn; ref: the slice whose colour debug() reports.
    const s = { flame: 0, kick: 0, clock: 0, live: false, orbit: 0, colorT: 0, slices: 0, ref: 0, turned: [0, 0, 0], scale: 1, at: [0, 0, 0], corner: [0, 0, 0] };
    let cornerAt = null;

    function setSlices(count) {
      n = count;
      lines.geometry.setDrawRange(0, n * (P - 1) * 6);
      walls.geometry.setDrawRange(0, n * (P - 1) * 12);
      s.slices = n;
      s.ref = Math.floor(n / 2);
    }

    function build(k) {
      THREE = k.THREE;
      colour = new THREE.Color();
      // The slices and their traces turn together, by the three Rotate settings.
      whole = new THREE.Group();
      cornerAt = new THREE.Vector3();
      whole.rotation.order = 'XZY';   // spin (y) first, then roll (z), then tilt (x): as TimbreScene.turn does
      k.scene.add(whole);
      level = TimbreScene.createHistory(HIST, HZ);
      for (let b = 0; b < K; b++) bands.push(TimbreScene.createHistory(HIST, HZ));

      const attribute = (count, size) => { const a = new THREE.BufferAttribute(new Float32Array(count * size), size); a.setUsage(THREE.DynamicDrawUsage); return a; };
      const lineIndex = [], wallIndex = [];
      for (let i = 0; i < SLICES_MAX; i++) for (let j = 0; j < P - 1; j++) {
        const p = (i * P + j) * 2, q = (i * P + j) * 3;
        lineIndex.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
        wallIndex.push(q, q + 1, q + 3, q + 1, q + 4, q + 3, q + 1, q + 2, q + 4, q + 2, q + 5, q + 4);
      }

      // The slices: solid and nearly black, with a faint glow under each top edge.
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', attribute(SLICES_MAX * P * 3, 3));
      wg.setAttribute('color', attribute(SLICES_MAX * P * 3, 3));
      wg.setIndex(wallIndex);
      walls = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      walls.frustumCulled = false;   // its points move every frame
      whole.add(walls);

      // The traces: soft strips of added light along the top edges.
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', attribute(SLICES_MAX * P * 2, 3));
      lg.setAttribute('color', attribute(SLICES_MAX * P * 2, 3));
      const uv = new Float32Array(SLICES_MAX * P * 4);
      for (let i = 0; i < SLICES_MAX; i++) for (let j = 0; j < P; j++) { const p = (i * P + j) * 4; uv[p] = 0; uv[p + 1] = us[j]; uv[p + 2] = 1; uv[p + 3] = us[j]; }
      lg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      lg.setIndex(lineIndex);
      // Soft across its width: a bright spine with a wide dim skirt.
      const c = document.createElement('canvas');
      c.width = 128; c.height = 4;
      const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 128, 0);
      for (const [at, a] of [[0, 0], [0.2, 0.05], [0.38, 0.3], [0.5, 1], [0.62, 0.3], [0.8, 0.05], [1, 0]]) g.addColorStop(at, `rgba(255,255,255,${a})`);
      x.fillStyle = g; x.fillRect(0, 0, 128, 4);
      const across = k.keep(new THREE.CanvasTexture(c));
      lines = new THREE.Mesh(lg, k.addLight(new THREE.MeshBasicMaterial({ map: across, vertexColors: true, side: THREE.DoubleSide })));
      lines.frustumCulled = false;
      whole.add(lines);

      setSlices(sliceCount(knob('depth')));
    }

    // The palette colour at t, as the colour buffer wants it (linear), into rgb.
    function palette(t) {
      const p = getColor(t);
      colour.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
      rgb[0] = colour.r; rgb[1] = colour.g; rgb[2] = colour.b;
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = (0.2 * Math.sin(0.16 * t) + 0.06 * Math.sin(0.4 * t + 2)) * knob('cameraDrift') / 50;
      // The deck as the Rotate settings turn it, kept in the frame.
      const rx = knob('rotateX', 0), ry = knob('rotateY', 0), rz = knob('rotateZ', 0);
      if (rx !== turned[0] || ry !== turned[1] || rz !== turned[2]) { turned[0] = rx; turned[1] = ry; turned[2] = rz; pose = TimbreScene.poseFor(BOX, VIEW, rx, ry, rz); }
      whole.rotation.set(rx * RAD, ry * RAD, rz * RAD);
      whole.scale.setScalar(pose.scale);
      whole.position.set(pose.x, pose.y, pose.z);
      // How it stands, for the checks: the settings as read, its size and place, and where one corner is in the scene.
      whole.updateMatrixWorld(true);
      walls.localToWorld(cornerAt.set(W / 2, 0, D / 2));
      s.turned[0] = rx; s.turned[1] = ry; s.turned[2] = rz; s.scale = pose.scale; s.at[0] = pose.x; s.at[1] = pose.y; s.at[2] = pose.z; s.corner[0] = cornerAt.x; s.corner[1] = cornerAt.y; s.corner[2] = cornerAt.z;
      const count = sliceCount(knob('depth'));
      if (count !== n) setSlices(count);

      // With the mic and Idle animation both off, the waves stop running.
      s.live = !!(micActive || cfgIdleAnim);
      if (s.live) s.clock += dt;
      s.flame = audio.flame; s.kick = audio.kick;

      // The voice goes into the histories: how loud it is, and each band. A band is followed,
      // not read raw: the bins are read 30 times a second, and a trace drawn straight from
      // them would change shape in steps.
      level.step(audio.flame, dt);
      for (let b = 0; b < K; b++) {
        let v = 0;
        if (micActive) v = loudness(frequencies, b, cfgGain);
        else if (cfgIdleAnim) v = idle(b, s.clock);
        heardNow[b] = follow(heardNow[b], v, v > heardNow[b] ? RISE : FALL, dt);
        bands[b].step(heardNow[b], dt);
      }

      const colorT = ((now * cfgColorSpeed) / 3000 + cfgColorHue) % PALETTE.length;
      s.colorT = colorT;
      const wp = walls.geometry.attributes.position.array, wc = walls.geometry.attributes.color.array;
      const lp = lines.geometry.attributes.position.array, lc = lines.geometry.attributes.color.array;
      for (let i = 0; i < n; i++) {
        const back = backOf(i, n), age = ageOf(back), z = zOf(back);
        // The voice as it was when this slice's trace was the front one.
        const loud = level.heard(age), A = stand(loud, audio.kick, back);
        for (let b = 0; b < K; b++) { amps[b] = bands[b].heard(age); phases[b] = pace(b) * (s.clock - age); }
        let peak = 0;
        for (let j = 0; j < P; j++) { const y = heightOf(A, pins[j], shape(us[j], amps, phases)); ys[j] = y; if (y > peak) peak = y; }
        const half = halfWidth(A, audio.kick, back);
        strip(lp, i * P * 2, xs, ys, z + FRONT, half);
        wall(wp, i * P * 3, xs, ys, z);

        palette(colorT + back * 0.8);
        const b = bright(A, audio.kick, back), glow = under(A, back);
        tint(tone, rgb, hot(back), b);
        for (let j = 0; j < P; j++) {
          const f = tips[j], p = (i * P + j) * 6, q = (i * P + j) * 9;
          lc[p] = tone[0] * f; lc[p + 1] = tone[1] * f; lc[p + 2] = tone[2] * f;
          lc[p + 3] = tone[0] * f; lc[p + 4] = tone[1] * f; lc[p + 5] = tone[2] * f;
          wc[q] = rgb[0] * glow * f + 0.004; wc[q + 1] = rgb[1] * glow * f + 0.004; wc[q + 2] = rgb[2] * glow * f + 0.006;
          wc[q + 3] = wc[q + 6] = rgb[0] * 0.01 + 0.004; wc[q + 4] = wc[q + 7] = rgb[1] * 0.01 + 0.004; wc[q + 5] = wc[q + 8] = rgb[2] * 0.01 + 0.006;
        }
        stands[i] = A; peaks[i] = peak; brights[i] = b; widths[i] = half; heards[i] = loud;
        if (i === 0) front.set(ys);
        if (i === s.ref) mid.set(ys);
        if (i === n - 1) lag.set(phases);
      }
      for (const m of [walls, lines]) { m.geometry.attributes.position.needsUpdate = true; m.geometry.attributes.color.needsUpdate = true; }
    }

    return {
      frame: { width: FRAME.width, height: FRAME.height, center: FRAME.center.slice() },
      fov: FOV,
      pitch: PITCH,
      cooling: [Infinity, Infinity, Infinity],   // fading light keeps its colour
      build,
      update,
      debug() {
        if (!lines) return Object.assign({}, s);
        // The reference slice's own colour as the trace's buffer holds it at the middle of the
        // trace, with its brightness and heat taken back out; and what is drawn, read back.
        const lc = lines.geometry.attributes.color, lp = lines.geometry.attributes.position.array, wp = walls.geometry.attributes.position.array;
        const a = (s.ref * P + P / 2) * 2, b = brights[s.ref] || 1, h = hot(backOf(s.ref, n)), out = { r: 0, g: 0, b: 0 };
        const un = (v) => (v / b - h) / (1 - h);
        colour.setRGB(un(lc.getX(a)), un(lc.getY(a)), un(lc.getZ(a))).getRGB(out, THREE.SRGBColorSpace);
        const zs = [], tops = [], lift = [];   // each slice's depth, the tallest point of its wall as drawn, and how far in front of it its trace lies
        for (let i = 0; i < n; i++) {
          zs.push(wp[i * P * 9 + 2]);
          lift.push(lp[i * P * 6 + 2] - wp[i * P * 9 + 2]);
          let top = 0;
          for (let j = 0; j < P; j++) top = Math.max(top, wp[(i * P + j) * 9 + 1]);
          tops.push(top);
        }
        const fa = (P / 2) * 6;   // the front trace's middle pair
        return Object.assign({
          stands: Array.from(stands.subarray(0, n)), peaks: Array.from(peaks.subarray(0, n)), brights: Array.from(brights.subarray(0, n)), widths: Array.from(widths.subarray(0, n)),
          zs, tops, lift, front: Array.from(front), mid: Array.from(mid), lag: Array.from(lag),
          heard: Array.from(heards.subarray(0, n)), now: Array.from(heardNow),
          tone: [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255)],
          span: Math.hypot(lp[fa + 3] - lp[fa], lp[fa + 4] - lp[fa + 1], lp[fa + 5] - lp[fa + 2]),   // the front trace's width as drawn
          drawn: [lines.geometry.drawRange.count, walls.geometry.drawRange.count],
        }, s, { turned: s.turned.slice(), at: s.at.slice(), corner: s.corner.slice() });   // as they are now, not as they will be
      },
    };
  }

  globalThis.TimbrePhosphor = {
    SLICES_MIN, SLICES_MAX, P, K, W, D, SPAN, HZ, HIST, LOW, TALL, GLOW, FRONT, RISE, FALL, FOV, PITCH, FRAME, BOX,
    sliceCount, backOf, ageOf, zOf, xOf, waves, pace, weight, loudness, shape, stand, heightOf, pin, ends, strip, wall,
    fade, bright, hot, halfWidth, under, tint, idle, definition,
  };
})();
