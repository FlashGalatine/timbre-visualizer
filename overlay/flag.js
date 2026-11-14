// Timbre — the flag, what the four Pride flags and the Fourth of July flag share. First the
// arithmetic: the five flags (their stripes, the union and its stars), painting one, a memory
// of the voice that travels along the cloth, how far the wind lifts the flag, how far it
// droops, and the cloth's shape. Then the 3D scene itself, written against the scene kit:
// definition(id) returns what TimbreScene.factory() needs.
//
// All timing comes from the caller (dt in seconds), never from counting frames, so the same
// sound gives the same picture at any frame rate.
//
// Valid as BOTH a classic <script> and an ES module (it only assigns `globalThis.TimbreFlag`),
// like planets.js, so verify.mjs can import it under Node. Nothing here may touch document,
// window, THREE, TimbreScene or core.js globals at load time; the scene looks them up when it
// is built. The two paint helpers draw on the canvas context they are handed.

(function () {
  'use strict';

  const TURN = 2 * Math.PI;
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const HIST = 16;            // samples of voice history along the flag
  const HIST_HZ = 16;         // history samples a second: a gust crosses the flag in just under a second
  const NU = 56, NV = 22;     // the cloth's grid: columns along its length, rows down its height
  const HOIST = 2.3;          // the flag's height
  const POLE_X = -2.5;        // where the pole stands
  const TOP = 4.75;           // the height at which the flag's top corner meets the pole

  // ── The flags ───────────────────────────────────────────────────────────────
  // A stripe is [red, green, blue, share of the height], top to bottom.
  const RED = [201, 36, 50], WHITE = [248, 248, 250], BLUE = [22, 56, 130];
  const SIX = [[228, 30, 38, 1], [243, 137, 36, 1], [254, 224, 53, 1], [120, 184, 60, 1], [0, 130, 200, 1], [120, 73, 152, 1]];
  const FLAGS = {
    // The six-stripe rainbow, or with black and brown above it (stripes8).
    'pride-ribbon': {
      aspect: 5 / 3, stripes: SIX, stripes8: [[40, 25, 25, 1], [120, 80, 60, 1]].concat(SIX),
      hearts: [[255, 130, 175], [254, 100, 130], [255, 215, 100], [120, 220, 200]],
    },
    // Michael Page, 1998: magenta 40%, purple 20%, blue 40%.
    'bi-pride-ribbon': {
      aspect: 5 / 3, stripes: [[214, 2, 112, 0.4], [155, 79, 150, 0.2], [0, 56, 168, 0.4]],
      hearts: [[232, 70, 150], [255, 130, 195], [170, 95, 200], [100, 150, 230]],
    },
    // AVEN, 2010: black, grey, white, purple.
    'ace-pride-ribbon': {
      aspect: 5 / 3, stripes: [[22, 22, 22, 1], [165, 165, 165, 1], [240, 240, 240, 1], [128, 0, 128, 1]],
      hearts: [[128, 0, 128], [170, 70, 180], [240, 240, 240], [200, 200, 200], [128, 0, 128]],
    },
    // Monica Helms, 1999: the same read from either end.
    'trans-pride-ribbon': {
      aspect: 5 / 3, stripes: [[91, 206, 250, 1], [245, 169, 184, 1], [255, 255, 255, 1], [245, 169, 184, 1], [91, 206, 250, 1]],
      hearts: [[91, 206, 250], [245, 169, 184], [255, 255, 255], [255, 200, 220], [140, 220, 255]],
    },
    // The flag of the United States: thirteen stripes, and a union of fifty stars.
    'july-fourth-stripes': {
      aspect: 1.9, stripes: Array.from({ length: 13 }, (_, i) => (i % 2 === 0 ? RED : WHITE).concat(1)),
      canton: { width: 0.4, height: 7 / 13, color: BLUE },
      sparks: [[255, 70, 84], [255, 255, 255], [96, 150, 255]],
    },
  };

  // The stripes in use: the eight-stripe form where a flag has one and it is asked for.
  function stripesOf(spec, eight) {
    return eight && spec.stripes8 ? spec.stripes8 : spec.stripes;
  }

  // The fifty stars, as [x, y] in fractions of the union: nine rows of six and five.
  function starPoints() {
    const out = [];
    for (let row = 0; row < 9; row++) {
      const n = row % 2 === 0 ? 6 : 5;
      for (let i = 0; i < n; i++) out.push([(2 * i + (row % 2 === 0 ? 1 : 2)) / 12, (row + 1) / 10]);
    }
    return out;
  }

  function fillStars(ctx, w, h, canton) {
    const cw = w * canton.width, ch = h * canton.height, radius = h * 0.0308;
    for (const [sx, sy] of starPoints()) {
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const a = -Math.PI / 2 + (p * Math.PI) / 5, r = p % 2 === 0 ? radius : radius * 0.382;
        ctx.lineTo(cw * sx + r * Math.cos(a), ch * sy + r * Math.sin(a));
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  // Paint a flag over a w by h canvas: stripes top to bottom, then the union and its stars.
  function paint(ctx, w, h, spec, eight) {
    const stripes = stripesOf(spec, eight), total = stripes.reduce((a, s) => a + s[3], 0);
    let y = 0;
    for (const [r, g, b, share] of stripes) {
      const height = (h * share) / total;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, Math.floor(y), w, Math.ceil(height) + 1);   // a hair over, so no seam shows between stripes
      y += height;
    }
    if (spec.canton) {
      const c = spec.canton.color;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(0, 0, w * spec.canton.width, h * spec.canton.height);
      ctx.fillStyle = 'rgb(255,255,255)';
      fillStars(ctx, w, h, spec.canton);
    }
  }

  // The stars alone, white on black: the map of what shines on the flag.
  function paintStars(ctx, w, h, spec) {
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.fillRect(0, 0, w, h);
    if (!spec.canton) return;
    ctx.fillStyle = 'rgb(255,255,255)';
    fillStars(ctx, w, h, spec.canton);
  }

  // ── The voice, remembered ───────────────────────────────────────────────────
  // step(level, dt) takes the level now; byAge[i] is the level i samples ago, gliding between
  // samples so that a wave moves smoothly and at the same speed at any frame rate. A sample
  // that falls inside a frame holds the level at its own moment, between the last frame's
  // level and this one's, so a long frame does not write the same value twice.
  function createHistory() {
    const ring = new Float32Array(HIST), byAge = new Float32Array(HIST);
    let ringAt = 0, since = 0, last = 0;
    const past = (j) => ring[(ringAt - Math.min(j, HIST - 1) + HIST * 2) % HIST];
    return {
      byAge,
      step(level, dt) {
        level = clamp01(Number.isFinite(level) ? level : 0);
        dt = Number.isFinite(dt) && dt > 0 ? dt : 0;
        since += dt;
        for (let i = 0; since >= 1 / HIST_HZ && i < HIST; i++) {
          since -= 1 / HIST_HZ;
          const w = dt > 0 ? clamp01(1 - since / dt) : 1;
          ringAt = (ringAt + 1) % HIST;
          ring[ringAt] = last + (level - last) * w;
        }
        if (since >= 1 / HIST_HZ) since = 0;   // a frame longer than the whole history
        last = level;
        const frac = since * HIST_HZ;
        for (let i = 0; i < HIST; i++) {
          const a = i - frac;
          if (a <= 0) { const w = frac > 1e-6 ? -a / frac : 1; byAge[i] = ring[ringAt] * (1 - w) + level * w; continue; }
          const j = Math.floor(a), f = a - j;
          byAge[i] = past(j) * (1 - f) + past(j + 1) * f;
        }
      },
    };
  }

  // The history along the cloth: out[0] is the pole (now), out[NU] the free end (the oldest),
  // smoothed so that no sharp front travels along the flag.
  function gusts(byAge, out) {
    for (let i = 0; i <= NU; i++) {
      const x = (i / NU) * (HIST - 1), j = Math.floor(x), f = x - j;
      out[i] = byAge[j] * (1 - f) + byAge[Math.min(HIST - 1, j + 1)] * f;
    }
    for (let pass = 0; pass < 6; pass++) {
      let was = out[0];
      for (let i = 0; i <= NU; i++) {
        const here = out[i], next = out[Math.min(NU, i + 1)];
        out[i] = (was + 2 * here + next) / 4;
        was = here;
      }
    }
    return out;
  }

  // ── Lift and droop ──────────────────────────────────────────────────────────
  // How far the wind (0..1) lifts the flag: 0.1 hangs, 1 flies straight out.
  function lift(wind) {
    return Math.min(1, 0.1 + 1.3 * Math.pow(clamp01(wind), 0.75));
  }

  // How far below level the cloth runs, in radians. A flying flag still sags a little; the
  // limit keeps the lowest corner of the longest flag clear of the ground when it hangs.
  function droop(fly, length) {
    return 0.07 + 0.66 * Math.min(1, (HOIST * 5 / 3) / length) * Math.pow(1 - clamp01(fly), 1.4);
  }

  // ── The cloth ───────────────────────────────────────────────────────────────
  // Writes the cloth's points into out: (NU + 1) x (NV + 1) of them, rows top to bottom,
  // columns from the pole to the free end, three numbers each. The origin is the top corner
  // at the pole; x runs along the flag, y up, z toward the side the ripples push.
  //   p = { length, fly, droop, phase, t, gust, low, high, kick }
  // The cloth keeps its length: each step along a row is the same size, its drop comes from
  // the droop, its depth from the ripple (at most 85% of what is left), and the rest goes
  // sideways. So a ripple shortens the flag's reach instead of stretching it.
  function shape(out, p) {
    const ds = p.length / NU, fly = clamp01(p.fly);
    const ripple = (i, v) => {
      const u = i / NU, ramp = Math.min(1, u * 3) * (0.35 + 0.65 * u);   // nothing moves at the pole
      const A = (0.07 + 0.32 * p.gust[i] + 0.12 * p.low + 0.2 * p.kick) * ramp * (0.3 + 0.7 * fly);
      return A * (Math.sin(TURN * 1.35 * u - p.phase + 0.7 * v) + 0.45 * Math.sin(TURN * 3.1 * u - 1.8 * p.phase + 1.3 - 1.1 * v))
        + 0.05 * p.high * u * u * u * Math.sin(TURN * 7 * u - 3.3 * p.phase + 2 * v)                     // flutter at the free end
        + (1 - fly) * 0.17 * ramp * Math.sin(TURN * 2.6 * u + 0.6 * Math.sin(0.7 * p.t) + 0.5 * v);      // a hanging flag's folds
    };
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      let x = 0, y = -v * HOIST, z = 0, zWas = 0;
      for (let i = 0; i <= NU; i++) {
        if (i > 0) {
          const q = Math.min(1, ((i - 0.5) / NU) * 2.2), ease = q * q * (3 - 2 * q);
          const angle = p.droop * ease * (0.9 + 0.2 * v);   // the lower edge hangs a little further
          const flat = ds * Math.cos(angle), zNow = ripple(i, v);
          const dz = Math.max(-0.85 * flat, Math.min(0.85 * flat, zNow - zWas));
          x += Math.sqrt(flat * flat - dz * dz); y -= ds * Math.sin(angle); z += dz; zWas = zNow;
        }
        const o = (j * (NU + 1) + i) * 3;
        out[o] = x; out[o + 1] = y; out[o + 2] = z;
      }
    }
    return out;
  }

  // What the checks and the scene read off a cloth: where the free end's top corner is, the
  // lowest point, and the deepest ripple.
  function measure(positions) {
    let lowest = 0, ripple = 0;
    for (let o = 0; o < positions.length; o += 3) {
      if (positions[o + 1] < lowest) lowest = positions[o + 1];
      const d = Math.abs(positions[o + 2]);
      if (d > ripple) ripple = d;
    }
    return { endX: positions[NU * 3], endY: positions[NU * 3 + 1], lowest, ripple };
  }

  // ── The scene ───────────────────────────────────────────────────────────────
  // Everything below runs only when a scene is built: THREE, TimbreScene, document and the
  // core.js audio and config globals are looked up then, never at load.
  const HEARTS = 56;             // at most this many hearts in the air
  const PER_BURST = 80, BURSTS = 3;
  const BURST_GAP_MS = 380;      // a beat sets off a burst no more often than this
  const IDLE_BURST_MS = 3200;    // with the mic off, a burst this often

  // The scene definition for one of the five flag effects, for TimbreScene.factory().
  function definition(id) {
    const spec = FLAGS[id], length = HOIST * spec.aspect;
    // A setting, read live so the control panel's sliders apply at once.
    const knob = (name) => {
      const v = typeof perViz !== 'undefined' && perViz[id];
      return v && typeof v[name] === 'number' ? v[name] : name === 'stripeStyle' ? 0 : 50;
    };
    const history = createHistory(), gust = new Float32Array(NU + 1);
    const cloth = { length, fly: 0, droop: 0, phase: 0, t: 0, gust, low: 0, high: 0, kick: 0 };
    const hearts = [], sparks = [];
    const s = { wind: 0, fly: 0, droop: 0, kick: 0, low: 0, high: 0, orbit: 0, phase: 0, stripes: spec.stripes.length,
      hearts: 0, heartsMade: 0, heartFrom: 1, sparks: 0, bursts: 0, flash: 0, shine: 0 };
    let THREE = null, flag = null, flagGroup = null, canvas = null, texture = null, painted = false;
    let heartMesh = null, sparkPoints = null, flash = null, dummy = null, point = null, colour = null;
    let yaw = 0.3, heartDue = 0, lastBurst = null, burstAt = 0;

    function build(k) {
      THREE = k.THREE;
      const scene = k.scene;
      dummy = new THREE.Object3D(); point = new THREE.Vector3(); colour = new THREE.Color();
      const std = (hex, roughness, extra) => k.keep(new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness, metalness: 0 }, extra)));
      const solid = (geo, mat, x, y, z) => {
        const m = new THREE.Mesh(k.keep(geo), mat);
        m.position.set(x, y, z);
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m);
        return m;
      };

      // Soft sky light and a weak cool fill keep the shaded folds readable. One warm lamp,
      // high and in front, also reaches the ground, so the flag's shadow lies in a pool of light.
      const fill = new THREE.DirectionalLight(0xdfe6ff, 0.5);
      fill.position.set(-4, 3, 6);
      scene.add(new THREE.AmbientLight(0xffffff, 1.15), fill);
      const lamp = k.practical(new THREE.SpotLight(0xfff4e6, 230, 30, 0.44, 0.9, 2));
      lamp.position.set(3.6, 9, 5.5);
      lamp.target.position.set(-0.8, 1.2, -0.3);
      lamp.castShadow = true;
      lamp.shadow.mapSize.set(1024, 1024);
      lamp.shadow.camera.near = 3;
      lamp.shadow.camera.far = 22;
      lamp.shadow.bias = -0.0015;
      lamp.shadow.normalBias = 0.02;
      scene.add(lamp, lamp.target);

      // A two-step stone base, the pole and its finial.
      const stone = std(0x8f8b86, 0.9);
      solid(new THREE.CylinderGeometry(0.6, 0.66, 0.16, 40), stone, POLE_X, 0.08, 0);
      solid(new THREE.CylinderGeometry(0.38, 0.42, 0.16, 40), stone, POLE_X, 0.24, 0);
      const poleHeight = TOP + 0.2 - 0.3;
      solid(new THREE.CylinderGeometry(0.034, 0.042, poleHeight, 16), std(0xd6d9df, 0.35, { metalness: 0.35 }), POLE_X, 0.3 + poleHeight / 2, 0);
      solid(new THREE.SphereGeometry(0.085, 20, 14), std(0xf0c257, 0.3, { metalness: 0.4, emissive: 0x3a2a08 }), POLE_X, TOP + 0.27, 0);

      // The flag: its picture on a canvas, the cloth as a grid the update moves.
      canvas = document.createElement('canvas');
      canvas.width = 1280; canvas.height = Math.round(1280 / spec.aspect);
      paint(canvas.getContext('2d'), canvas.width, canvas.height, spec, false);
      texture = k.keep(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      let glow = texture, glowStrength = 0.14;   // a little of its own colour, so shaded folds keep their hue
      if (spec.canton) {                         // or, where there are stars, the stars alone: they shine with the sound
        const starCanvas = document.createElement('canvas');
        starCanvas.width = canvas.width; starCanvas.height = canvas.height;
        paintStars(starCanvas.getContext('2d'), starCanvas.width, starCanvas.height, spec);
        glow = k.keep(new THREE.CanvasTexture(starCanvas));
        glow.colorSpace = THREE.SRGBColorSpace;
        glowStrength = 0;
      }
      flag = new THREE.Mesh(k.keep(new THREE.PlaneGeometry(length, HOIST, NU, NV)),
        std(0xffffff, 0.8, { map: texture, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: glowStrength, side: THREE.DoubleSide }));
      flag.castShadow = true;
      flag.frustumCulled = false;   // the update moves it
      flagGroup = new THREE.Group();
      flagGroup.position.set(POLE_X + 0.04, TOP, 0);
      flagGroup.add(flag);
      scene.add(flagGroup);

      if (spec.hearts) {
        const outline = new THREE.Shape();
        outline.moveTo(0, -0.5);
        outline.bezierCurveTo(-0.95, 0.12, -0.55, 0.78, 0, 0.3);
        outline.bezierCurveTo(0.55, 0.78, 0.95, 0.12, 0, -0.5);
        const heart = k.keep(new THREE.ExtrudeGeometry(outline, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.08, bevelSegments: 3, curveSegments: 14 }));
        heart.center();
        heartMesh = new THREE.InstancedMesh(heart, std(0xffffff, 0.35, { emissive: 0x241018 }), HEARTS);
        heartMesh.castShadow = true;
        heartMesh.frustumCulled = false;
        heartMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        dummy.scale.setScalar(0); dummy.updateMatrix();
        for (let i = 0; i < HEARTS; i++) {
          hearts.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, size: 0.1, spin: 0, turn: 0 });
          heartMesh.setMatrixAt(i, dummy.matrix);
          heartMesh.setColorAt(i, colour.setRGB(1, 1, 1));
        }
        scene.add(heartMesh);
      }
      if (spec.sparks) {
        const N = PER_BURST * BURSTS;
        for (let i = 0; i < N; i++) sparks.push({ on: false, vx: 0, vy: 0, vz: 0, age: 0, life: 1, c: spec.sparks[0] });
        const geo = k.keep(new THREE.BufferGeometry());
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
        sparkPoints = new THREE.Points(geo, k.keep(k.addLight(new THREE.PointsMaterial({ size: 9, sizeAttenuation: false, vertexColors: true, map: k.glowTexture(255, 255, 255) }))));
        sparkPoints.frustumCulled = false;
        scene.add(sparkPoints);
        flash = k.practical(new THREE.PointLight(0xffffff, 0, 14, 2));
        flash.position.set(0, 3.5, -1.8);
        scene.add(flash);
      }
    }

    // Hearts peel off the free half of the cloth and blow away downwind. One in the air
    // always finishes its flight; the setting only says how many set off.
    function updateHearts(audio, t, dt) {
      heartDue += ((0.6 + 8 * audio.flame) * dt + (audio.beat ? 6 : 0)) * knob('heartRate') / 50;
      const positions = flag.geometry.attributes.position;
      let live = 0;
      for (let i = 0; i < HEARTS; i++) {
        const h = hearts[i];
        if (!h.on && heartDue >= 1) {
          heartDue -= 1;
          const column = Math.floor(NU * (0.5 + 0.5 * Math.random()));
          point.fromBufferAttribute(positions, Math.floor(Math.random() * (NV + 1)) * (NU + 1) + column);
          flag.localToWorld(point);
          const push = (0.35 + 1.1 * s.wind) * (0.7 + 0.6 * Math.random());
          h.on = true; h.age = 0; h.life = 2.4 + 1.6 * Math.random();
          h.x = point.x; h.y = point.y; h.z = point.z + 0.05;
          h.vx = Math.cos(yaw) * push; h.vz = Math.sin(yaw) * push * 0.6 + (Math.random() - 0.5) * 0.3; h.vy = 0.25 + 0.35 * Math.random();
          h.size = 0.085 + 0.07 * Math.random(); h.spin = (Math.random() - 0.5) * 3; h.turn = TURN * Math.random();
          const c = spec.hearts[Math.floor(Math.random() * spec.hearts.length)];
          heartMesh.setColorAt(i, colour.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace));
          heartMesh.instanceColor.needsUpdate = true;
          s.heartsMade++;
          if (column / NU < s.heartFrom) s.heartFrom = column / NU;
        }
        let size = 0;
        if (h.on) {
          h.age += dt;
          if (h.age >= h.life) h.on = false;
          else {
            h.x += (h.vx + Math.sin(1.7 * t + h.turn) * 0.12) * dt; h.y += h.vy * dt; h.z += h.vz * dt;
            // It grows as it leaves the cloth and shrinks away at the end.
            size = h.size * Math.min(1, h.age / 0.25) * Math.min(1, (h.life - h.age) / 0.7);
            live++;
          }
        }
        dummy.position.set(h.x, h.y, h.z);
        dummy.rotation.set(0, h.spin * t + h.turn, 0.25 * Math.sin(1.3 * t + h.turn));
        dummy.scale.setScalar(size);
        dummy.updateMatrix();
        heartMesh.setMatrixAt(i, dummy.matrix);
      }
      if (heartDue > 8) heartDue = 8;   // with every heart in the air, the rest do not queue up for ever
      heartMesh.instanceMatrix.needsUpdate = true;
      s.hearts = live;
    }

    // A burst of sparks behind the flag, with a flash that lights its back and the ground.
    function updateSparks(audio, now, dt) {
      if (lastBurst === null) lastBurst = now;
      const chance = (knob('burstChance') / 100) * 1.4;
      const idleDue = !micActive && cfgIdleAnim && chance > 0 && now - lastBurst > IDLE_BURST_MS;
      const position = sparkPoints.geometry.attributes.position, tint = sparkPoints.geometry.attributes.color;
      if (idleDue || (audio.beat && now - lastBurst > BURST_GAP_MS && Math.random() < chance)) {
        lastBurst = now;
        const cx = -1.4 + 3.6 * Math.random(), cy = 2.7 + 2.0 * Math.random(), cz = -1.5 - 0.9 * Math.random();
        const c = spec.sparks[Math.floor(Math.random() * spec.sparks.length)];
        for (let n = 0; n < PER_BURST; n++) {
          const i = burstAt * PER_BURST + n, sp = sparks[i];
          const up = 2 * Math.random() - 1, round = TURN * Math.random(), flat = Math.sqrt(1 - up * up), speed = 1.2 + Math.random();
          sp.on = true; sp.age = 0; sp.life = 1.0 + 0.7 * Math.random(); sp.c = c;
          sp.vx = flat * Math.cos(round) * speed; sp.vy = flat * Math.sin(round) * speed; sp.vz = up * speed * 0.5;
          position.setXYZ(i, cx, cy, cz);
        }
        burstAt = (burstAt + 1) % BURSTS;
        flash.position.set(cx, cy, cz);
        flash.color.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);
        s.flash = 1;
        s.bursts++;
      }
      s.flash = TimbreScene.fall(s.flash, 5, dt);
      flash.intensity = 60 * s.flash;
      const drag = Math.exp(-1.2 * dt);
      let live = 0;
      for (let i = 0; i < sparks.length; i++) {
        const sp = sparks[i];
        let b = 0;
        if (sp.on) {
          sp.age += dt;
          if (sp.age >= sp.life) sp.on = false;
          else {
            sp.vx *= drag; sp.vy = sp.vy * drag - 0.9 * dt; sp.vz *= drag;
            position.setXYZ(i, position.getX(i) + sp.vx * dt, position.getY(i) + sp.vy * dt, position.getZ(i) + sp.vz * dt);
            b = 2.4 * Math.pow(1 - sp.age / sp.life, 1.5);   // it dims as it burns out
            live++;
          }
        }
        tint.setXYZ(i, (sp.c[0] / 255) * b, (sp.c[1] / 255) * b, (sp.c[2] / 255) * b);
      }
      position.needsUpdate = true; tint.needsUpdate = true;
      s.sparks = live;
    }

    function update(k, audio, now, dt) {
      const t = now / 1000, follow = TimbreScene.follow;
      s.orbit = k.orbit = Math.sin(0.11 * t) * 0.12 * knob('cameraDrift') / 50;

      // The voice is the wind. The setting scales how hard it blows.
      const drive = knob('wind') / 50, blow = Math.min(1, audio.flame * drive);
      s.wind = follow(s.wind, blow, blow > s.wind ? 5 : 0.7, dt);   // the flag lifts quickly and sinks slowly
      s.kick = audio.kick * Math.min(1, drive);
      let low = 0, high = 0;
      if (micActive && frequencies && frequencies.length >= 32) {
        for (let i = 0; i < 4; i++) low += frequencies[i];
        for (let i = 8; i < 32; i++) high += frequencies[i];
        low = Math.min(1, (low / 4 / 255) * cfgGain); high = Math.min(1, (high / 24 / 255) * cfgGain * 3);
      } else {
        low = audio.level * (0.6 + 0.4 * Math.sin(t * 0.31)); high = audio.level * (0.6 + 0.4 * Math.sin(t * 0.23 + 2));
      }
      s.low = follow(s.low, low, 6, dt); s.high = follow(s.high, high, 4, dt);
      history.step(blow, dt);
      gusts(history.byAge, gust);

      s.fly = lift(s.wind) + 0.03 * Math.sin(0.5 * t);   // never quite still
      s.droop = droop(s.fly, length);
      s.phase += (1.6 + 6.5 * s.wind + 4 * s.kick) * dt;
      yaw = 0.3 + 0.2 * Math.sin(0.23 * t) + 0.08 * Math.sin(0.71 * t + 1);
      flagGroup.rotation.y = -yaw;   // the wind blows to the right and a little toward the viewer
      cloth.fly = s.fly; cloth.droop = s.droop; cloth.phase = s.phase; cloth.t = t;
      cloth.low = s.low; cloth.high = s.high; cloth.kick = s.kick;
      const positions = flag.geometry.attributes.position;
      shape(positions.array, cloth);
      positions.needsUpdate = true;
      flag.geometry.computeVertexNormals();
      flagGroup.updateMatrixWorld(true);

      // Stripe style: the same texture, painted again.
      const eight = !!spec.stripes8 && knob('stripeStyle') >= 50;
      if (eight !== painted) {
        paint(canvas.getContext('2d'), canvas.width, canvas.height, spec, eight);
        texture.needsUpdate = true;
        painted = eight;
      }
      s.stripes = stripesOf(spec, eight).length;

      if (heartMesh) updateHearts(audio, t, dt);
      if (sparkPoints) {
        updateSparks(audio, now, dt);
        s.shine = Math.min(2, s.high * knob('starTwinkle') / 50);   // the stars shine with the high end
        flag.material.emissiveIntensity = 1.1 * s.shine;
      }
    }

    return {
      frame: { width: 7.8, height: 5.6, center: [-0.2, 2.65, 0] },
      fov: 30,
      pitch: 6,
      groundColor: 0x8a917f,
      cooling: [Infinity, Infinity, Infinity],   // fading light keeps its colour: no warm fringe behind a moving shadow
      build,
      update,
      debug() {
        const heartColors = [];
        if (heartMesh && heartMesh.instanceColor) {
          const c = { r: 0, g: 0, b: 0 };
          hearts.forEach((h, i) => {
            if (!h.on) return;
            colour.fromBufferAttribute(heartMesh.instanceColor, i).getRGB(c, THREE.SRGBColorSpace);
            heartColors.push([Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)]);
          });
        }
        const at = flag ? measure(flag.geometry.attributes.position.array) : { endX: 0, endY: 0, lowest: 0, ripple: 0 };
        return Object.assign({ hist: Array.from(history.byAge), heartColors }, at, s);
      },
    };
  }

  globalThis.TimbreFlag = {
    HIST, HIST_HZ, NU, NV, HOIST, POLE_X, TOP,
    FLAGS, stripesOf, starPoints, paint, paintStars,
    createHistory, gusts, lift, droop, shape, measure,
    definition,
  };
})();
