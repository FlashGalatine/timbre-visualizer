// Timbre — characters, what the Blob, the Owl and the Television share, and each one's pose. It
// holds how a character hears (slow and fast loudness, the low and high ends, a syllable
// starting, which end of the sound is winning, and when it is happy), the spring that bounces
// it, the blink, the rule that turns the Bounce setting into a strength, and for each character
// the numbers its drawing needs from one frame to the next. The effects in factories/ read the
// sound, step a pose and draw it.
//
// All timing comes from the caller (dt in seconds), never from counting frames or reading the
// clock, so the same sound gives the same character at any frame rate. Lengths are in canvas
// pixels unless a comment says otherwise; `scale` is the page's SCALE.
//
// The two paint helpers draw on the canvas context they are handed; nothing here reaches for a
// canvas of its own. Valid as BOTH a classic <script> and an ES module (it only assigns
// `globalThis.TimbreCharacters`), like helix.js, so verify.mjs can import it under Node. It uses
// TimbrePlanets' colour helpers when it paints (planets.js must be loaded first) and nothing
// else: no document, window or core.js globals.

(function () {
  'use strict';

  const TURN = 2 * Math.PI;

  // The hearing.
  const LOUD_S = 0.25, FAST_S = 0.05;        // the slow loudness and the fast one
  const LOW_OPEN_S = 0.05, LOW_CLOSE_S = 0.25, HIGH_S = 0.1;
  const LEAN_S = 0.3, LEAN_GAIN = 1.5;       // which end of the sound is winning: its easing, and how readily it tips
  const FAINT = 0.05;                        // below this loudness a character does not lean
  const HAPPY_ON = 0.45, HAPPY_OFF = 0.35;   // happy once the slow loudness passes the first, until it falls below the second
  const AWAKE_S = 0.3;                       // how quickly a character wakes or falls still, and its idle breathing comes and goes

  // The face.
  const BLINK_S = 0.16;                      // a blink, shut and open again
  const MOUTH = 1.3;                         // the mouth is fully open at a fast loudness of 1 / this
  const INK = [16, 14, 34], WHITE = [255, 255, 255], PINK = [255, 110, 160];

  // The Blob.
  const BLOB_POINTS = 32;
  const BLOB_R = 25, BLOB_GROW = 13;         // × scale: its radius at rest, and added at full voice and the usual Bounce
  const BLOB_DOWN = 4;                       // × scale: how far below the middle of the frame it sits
  const BLOB_HZ = 2.6, BLOB_DAMP = 0.22, BLOB_KICK = 2600;   // its spring, and how hard a syllable kicks it
  const BLOB_STRETCH = 0.0025, BLOB_STRETCH_MAX = 0.13;      // stretch per unit of the spring's speed while it is small, and what it levels off at
  const BLOB_BULGE = 7;                      // × scale: the most the sound pushes a point out, at the usual Bounce
  const BULGE_UP_S = 0.04, BULGE_DOWN_S = 0.18;
  const BULGE_BANDS = 11, BULGE_HIGH_WEIGHT = 2.2;           // the bands that shape it (0 to 10), and the weight of all but the first two
  const BREATH = 1.2, BREATH_RATE = 1.6;     // × scale and rad/s: breathing when idle
  const BLOB_BLINK = 3.5;                    // seconds between its blinks
  const EDGE = 3;                            // × scale: room kept between a character and the frame's top and bottom

  const clamp01 = (v) => (v > 1 ? 1 : v > 0 ? v : 0);
  const follow = (current, target, dt, tau) => current + (target - current) * (1 - Math.exp(-dt / tau));
  // The same, for a weight that must arrive: within a thousandth of the target it is the target.
  const arrive = (current, target, dt, tau) => { const v = follow(current, target, dt, tau); return Math.abs(target - v) < 1e-3 ? target : v; };

  // What a character hears. step({ dt, live, idle, loud, low, high }) takes the sound levels (0
  // to 1) and keeps: loud (slow) and fast, low and high, rise (how far the fast loudness stands
  // above the slow one: a syllable starting), lean (-1 the low end winning, 1 the high end; the
  // difference between the two ends times LEAN_GAIN, so a difference of two thirds is a full
  // lean), happy, and clock (seconds heard). Mic off, it hears silence whatever it is handed.
  // It also keeps two weights, 0 to 1, that ease over AWAKE_S: awake (the mic is on, or the idle
  // animation is: a character's own small movements are scaled by it, so with both off it is
  // perfectly still) and rest (the mic is off and the idle animation on: its idle breathing).
  // Both start where they belong, with no easing on the first step.
  function createEars() {
    const e = { live: false, loud: 0, fast: 0, low: 0, high: 0, rise: 0, lean: 0, happy: false, clock: 0, awake: 0, rest: 0 };
    let begun = false;
    e.step = ({ dt, live, idle, loud, low, high }) => {
      e.clock += dt;
      e.live = !!live;
      const awake = live || idle ? 1 : 0, rest = !live && idle ? 1 : 0;
      e.awake = begun ? arrive(e.awake, awake, dt, AWAKE_S) : awake;
      e.rest = begun ? arrive(e.rest, rest, dt, AWAKE_S) : rest;
      begun = true;
      const l = live ? loud : 0, lo = live ? low : 0, hi = live ? high : 0;
      e.loud = follow(e.loud, l, dt, LOUD_S);
      e.fast = follow(e.fast, l, dt, FAST_S);
      e.low = follow(e.low, lo, dt, lo > e.low ? LOW_OPEN_S : LOW_CLOSE_S);
      e.high = follow(e.high, hi, dt, HIGH_S);
      e.rise = Math.max(0, e.fast - e.loud);
      e.lean = follow(e.lean, e.loud > FAINT ? Math.max(-1, Math.min(1, (e.high - e.low) * LEAN_GAIN)) : 0, dt, LEAN_S);
      e.happy = e.happy ? e.loud >= HAPPY_OFF : e.loud > HAPPY_ON;
    };
    return e;
  }

  // A spring of `hz` cycles a second (above 0) and the given damping (0 to below 1: one that
  // rings), pushed by a force that is steady over each step. It is solved exactly for the step,
  // so it is in the same place at any frame rate. x is how far it is from rest, v its speed.
  // Anything else is refused here, with a RangeError, rather than giving NaN later.
  function createSpring(hz, damping) {
    if (!(hz > 0) || !(damping >= 0 && damping < 1)) throw new RangeError(`createSpring: hz must be above 0 and damping from 0 to below 1 (got ${hz}, ${damping})`);
    const w = TURN * hz, wd = w * Math.sqrt(1 - damping * damping), decay = damping * w;
    const s = { x: 0, v: 0 };
    s.step = (dt, force) => {
      if (!(dt > 0)) return;
      const rest = force / (w * w);          // where this push would hold it
      const y = s.x - rest, b = (s.v + decay * y) / wd;
      const e = Math.exp(-decay * dt), c = Math.cos(wd * dt), sn = Math.sin(wd * dt);
      s.x = rest + e * (y * c + b * sn);
      s.v = e * ((b * wd - decay * y) * c - (y * wd + decay * b) * sn);
    };
    s.reset = () => { s.x = 0; s.v = 0; };
    return s;
  }

  // A blink at `clock`: 0 open, 1 shut. It lasts BLINK_S and comes once every `every` seconds;
  // `offset` keeps two characters from blinking together.
  const blink = (clock, every, offset) => {
    const t = (clock + offset) % every;
    return t < BLINK_S ? 1 - Math.abs(t / (BLINK_S / 2) - 1) : 0;
  };

  // The Bounce setting (0 to 100) as a strength: 1 at its default of 50.
  const bounce = (setting) => (Number.isFinite(setting) ? Math.max(0, Math.min(2, setting / 50)) : 1);
  // How far the mouth is open, 0 to 1, for a fast loudness.
  const mouth = (fast) => clamp01(fast * MOUTH);

  // The Blob's pose. step({ dt, live, level, bins, gain, bounce, idle, W, H, scale }) takes the
  // sound levels, the frequency bands (or null) and Gain, the Bounce setting and whether the
  // idle animation applies. It then holds: radius (px), lift (how far above its resting place
  // it is drawn, px: the bounce, less whatever the frame held back), stretch (taller above 0,
  // flatter below), shrink (below 1 when it had to be drawn smaller to fit the frame), held
  // (the frame is holding it back: it is drawn smaller, or lower or higher than it would be),
  // cy (its middle, as an offset from the frame's), px and py (its outline, as offsets from the
  // middle of the frame), bulge (how far the sound is pushing each point, 0 to 1), look (where
  // its eyes are turned, -1 to 1), blink (0 open to 1 shut), and its ears.
  function createBlob() {
    const ears = createEars(), spring = createSpring(BLOB_HZ, BLOB_DAMP);
    const b = { ears, radius: 0, lift: 0, stretch: 0, shrink: 1, held: false, cy: 0, look: 0, blink: 0, px: new Float64Array(BLOB_POINTS), py: new Float64Array(BLOB_POINTS), bulge: new Float64Array(BLOB_POINTS) };
    b.step = ({ dt, live, level, bins, gain, bounce: setting, idle, W, H, scale }) => {
      ears.step({ dt, live, idle, loud: level.loud, low: level.low, high: level.high });
      const k = bounce(setting);
      spring.step(dt, ears.rise * BLOB_KICK * k);
      if (k === 0) spring.reset();
      const breath = Math.sin(ears.clock * BREATH_RATE) * BREATH * ears.rest;
      const R = (BLOB_R + BLOB_GROW * ears.loud * k + breath) * scale;
      // It stretches with its speed: in step while the speed is small, levelling off (never held
      // at a limit, which would snap from tall to flat at the top of a bounce).
      const stretch = BLOB_STRETCH_MAX * Math.tanh(spring.v * BLOB_STRETCH / BLOB_STRETCH_MAX);
      const lift = spring.x * scale, down = BLOB_DOWN * scale;
      // The outline: each point pushed out by its own part of the sound (the low end at the top,
      // the high end at the bottom, the same on both sides) and by a slow wobble, which stops
      // when the mic and the idle animation are both off.
      let up = 0, below = 0, side = 0;
      for (let i = 0; i < BLOB_POINTS; i++) {
        const a = (i / BLOB_POINTS) * TURN - Math.PI / 2;
        const fromTop = Math.abs(((i / BLOB_POINTS) * 2 + 1) % 2 - 1);       // 0 at the top, 1 at the bottom
        const band = Math.min(BULGE_BANDS - 1, Math.floor(fromTop * BULGE_BANDS));
        const heard = live && bins ? Math.min(1, (bins[band] || 0) / 255 * gain * (band < 2 ? 1 : BULGE_HIGH_WEIGHT)) : 0;
        b.bulge[i] = follow(b.bulge[i], heard, dt, heard > b.bulge[i] ? BULGE_UP_S : BULGE_DOWN_S);
        const wobble = Math.sin(a * 3 + ears.clock * 2.1) * 0.035 + Math.sin(a * 5 - ears.clock * 1.4) * 0.025 + Math.sin(a * 2 + ears.clock * 0.9) * 0.02;
        const r = R * (1 + wobble * ears.awake) + b.bulge[i] * BLOB_BULGE * scale * k;
        b.px[i] = Math.cos(a) * r * (1 - stretch);
        b.py[i] = Math.sin(a) * r * (1 + stretch);
        up = Math.max(up, -b.py[i]); below = Math.max(below, b.py[i]); side = Math.max(side, Math.abs(b.px[i]));
      }
      // If it would not fit the frame, top to bottom or side to side, it is drawn smaller about
      // its own middle, and its bounce is limited to the room that leaves.
      const room = Math.max(1, H / 2 - EDGE * scale), across = Math.max(1, W / 2 - EDGE * scale);
      const shrink = Math.min(1, room / Math.max(1e-6, (up + below) / 2 + 1e-9), across / Math.max(1e-6, side + 1e-9));
      const top = up * shrink, bottom = below * shrink;
      const wanted = down - lift;
      const cy = Math.max(-(room - top), Math.min(room - bottom, wanted));
      for (let i = 0; i < BLOB_POINTS; i++) { b.px[i] *= shrink; b.py[i] = b.py[i] * shrink + cy; }
      b.radius = R * shrink; b.stretch = stretch; b.shrink = shrink; b.cy = cy; b.lift = down - cy;
      b.held = shrink < 1 || cy !== wanted;
      b.look = Math.sin(ears.clock * 0.5) * ears.awake;
      b.blink = blink(ears.clock, BLOB_BLINK, 0) * ears.awake;
    };
    return b;
  }

  // The shared face, painted on `ctx` at (x, y). u is its unit, px. f gives: open (the mouth, 0
  // to 1), happy, blink (0 to 1), look (-1 to 1, where the eyes are turned) and gap (half the
  // distance between the eyes, in units; 4.2 if not given).
  function paintFace(ctx, x, y, u, f) {
    const { rgba } = globalThis.TimbrePlanets;
    const gap = f.gap || 4.2, shut = f.blink || 0;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const side of [-1, 1]) {
      const ex = x + side * gap * u + (f.look || 0) * u * 0.5, ey = y - 1.6 * u;
      if (f.happy) {                           // happy: an upturned arc
        ctx.strokeStyle = rgba(INK, 1);
        ctx.lineWidth = 0.95 * u;
        ctx.beginPath();
        ctx.arc(ex, ey + 0.9 * u, 2.1 * u, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
      } else if (shut > 0.85) {
        ctx.strokeStyle = rgba(INK, 1);
        ctx.lineWidth = 0.8 * u;
        ctx.beginPath();
        ctx.moveTo(ex - 1.9 * u, ey);
        ctx.lineTo(ex + 1.9 * u, ey);
        ctx.stroke();
      } else {
        const open = 1 - shut;
        ctx.fillStyle = rgba(INK, 1);
        ctx.beginPath();
        ctx.ellipse(ex, ey, 1.9 * u, 2.5 * u * open, 0, 0, TURN);
        ctx.fill();
        ctx.fillStyle = rgba(WHITE, 0.95);
        ctx.beginPath();
        ctx.ellipse(ex - 0.6 * u, ey - 0.9 * u * open, 0.75 * u, 0.75 * u * open, 0, 0, TURN);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(ex + 0.7 * u, ey + 0.9 * u * open, 0.35 * u, 0.35 * u * open, 0, 0, TURN);
        ctx.fill();
      }
      ctx.fillStyle = rgba(PINK, 0.38);       // blush
      ctx.beginPath();
      ctx.ellipse(x + side * (gap + 2.6) * u, y + 1.4 * u, 1.7 * u, 0.95 * u, 0, 0, TURN);
      ctx.fill();
    }
    const my = y + 3.2 * u;
    if (f.open > 0.08) {                       // an open mouth, with a tongue
      const rx = (1.5 + 0.9 * f.open) * u, ry = (0.5 + 2.3 * f.open) * u;
      ctx.fillStyle = rgba(INK, 1);
      ctx.beginPath();
      ctx.ellipse(x, my, rx, ry, 0, 0, TURN);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = rgba(PINK, 0.9);
      ctx.beginPath();
      ctx.ellipse(x, my + ry * 0.9, rx * 0.8, ry * 0.7, 0, 0, TURN);
      ctx.fill();
      ctx.restore();
    } else {                                   // a small smile
      ctx.strokeStyle = rgba(INK, 1);
      ctx.lineWidth = 0.8 * u;
      ctx.beginPath();
      ctx.arc(x, my - 1.2 * u, 1.9 * u, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  // A soft glow of light behind a character, in colour c ([r, g, b]) at strength a, so it stands
  // off a dark picture.
  function glowBehind(ctx, x, y, r, c, a) {
    const { rgba } = globalThis.TimbrePlanets;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TURN);
    ctx.fill();
    ctx.restore();
  }

  globalThis.TimbreCharacters = {
    HAPPY_ON, HAPPY_OFF, BLINK_S, INK, WHITE, PINK, EDGE,
    createEars, createSpring, blink, bounce, mouth, createBlob, paintFace, glowBehind,
  };
})();
