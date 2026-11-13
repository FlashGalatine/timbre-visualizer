# Timbre — writing your own effect

Every effect is a self-registering **factory**: one plain `<script>` file that adds an
entry to `VIZ_FACTORIES`. The core (`overlay/core.js`) owns the canvases, the config, the
audio arrays, and the animation loop; a factory only draws.

## The contract

```js
// overlay/factories/my-effect.js
VIZ_FACTORIES['my-effect'] = () => {
  // one-time setup per activation (runs each time the effect is selected)
  return {
    start() {},                 // optional — after activation
    stop() {},                  // optional — before switching away (free GL resources!)
    draw(now, dt) {             // required — every animation frame; now in ms, dt in seconds
      ctx.clearRect(0, 0, W, H);
      if (!micActive || !frequencies) { /* draw an idle state if cfgIdleAnim */ return; }
      for (let i = 0; i < cfgBars; i++) {
        const v = (frequencies[i] / 255) * cfgGain;       // 0..~2
        const [r, g, b] = getColor(now / 1000 * cfgColorSpeed + cfgColorHue + i * 0.2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(i * (W / cfgBars), H - v * H, W / cfgBars - 2, v * H);
      }
    },
    onResize() {},              // optional — canvas buffer size changed
    onConfig(cfg) {},           // optional — full config object after each apply
  };
};
```

Script-scope globals available to factories (from core.js):

| Name | Meaning |
|---|---|
| `ctx`, `canvas2d` | 2D canvas + context (visible for 2D effects) |
| `canvas3d` | WebGL canvas (visible for effects listed in `VIZ_USES_3D`) |
| `W`, `H`, `SCALE` | canvas buffer size + width-based scale factor (1.0 at 260 px wide) |
| `frequencies` | `Uint8Array(32)` FFT bins, 0–255, or `null` when no mic |
| `waveform` | `Uint8Array(64)` time-domain samples, 0–255, or `null` |
| `micActive` | mic currently captured |
| `micPeak` | loudest input sample over at least the last two looks (4096 samples at 48 kHz), 0 to 1, before Gain, or `null` when no mic |
| `cfgGain`, `cfgBars`, `cfgBounce`, `cfgColorSpeed`, `cfgColorHue`, `cfgIdleAnim`, `cfgEffectBgOpacity` | normalized global knobs |
| `cfgSTLObject` | the shared 3D-model knob group (STL effects) |
| `perViz['my-effect']` | your effect's own knobs |
| `getColor(t)` | palette lookup → `[r,g,b]` |
| `THREE` | three.js r160 (vendored) |

Multiply pixel-tuned constants by `SCALE` so the 300×220, 1440×1080 and 1920×1080 layouts all
look right. `SCALE` is 1.0 / 4.8 / 4.8 on those pages — the 16:9 page pins it to the 4:3 value
(its canvas is the same 624px tall, only wider), so size things off `SCALE`, not off `W`, and
let horizontal layouts (bars, columns, scrolling scenes) fill `W` naturally.

## Registration (3 edits)

1. Drop the file in `overlay/factories/my-effect.js`.
2. `shared/viz-config.js`: add `'my-effect'` to `ACTIVE_VIZ_NAMES` (and to `VIZ_USES_3D`
   if it renders WebGL); add a `DEFAULT_PER_VIZ['my-effect'] = { myKnob: 50 }` entry if it
   has knobs — the control panel generates sliders from it automatically (numeric knobs
   are 0–100 unless overridden in `PER_VIZ_MAX`).
3. Add the `<script src="factories/my-effect.js">` tag to all three overlay HTML pages.

`npm run verify` fails if a name/factory-file/defaults entry is missing — run it.

## 3D STL effects

The STL effect (`rose`) shares the
`stlObject` knob group and a hand-rolled **binary STL** parser (see
`overlay/factories/rose.js`). ASCII STL files are not supported — export binary. To swap
in your own model, replace the file in `overlay/assets/` and update the `*_STL_URL`
constant in the factory.

## Kit scenes (floating 3D)

A kit scene is a lit 3D set that floats over the stream with no backdrop. It is written
against the **scene kit** (`overlay/scene-kit.js`, plus the shared geometry in
`overlay/scene-parts.js`), which owns everything that is easy to get wrong: the one shared
WebGL renderer, the camera and framing, the Scene placement sliders, the afterglow, shadows
and disposal. A scene only builds objects and animates them. `thanksgiving-harvest` is the
first; copy its factory.

### The factory

The factory is a thin wrapper that hands the kit a scene definition:

```js
VIZ_FACTORIES['my-scene'] = function () {
  function definition() {
    return {
      frame: { width: 6.8, height: 3.1, center: [-0.4, 0.75, 0.3] }, // the box that must always fit
      fov: 30,               // vertical field of view, degrees
      pitch: 14,             // camera elevation above the centre, degrees
      groundColor: 0x7a6f66, // optional: the invisible ground that catches practical light
      build(k) {},           // once: create objects, add them to k.scene
      update(k, audio, now, dt) {},  // every frame, before drawing
      debug() { return {}; },        // optional: state for tests / DevTools
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
```

`TimbreScene.create(def)` returns `null` when three.js or WebGL is missing, or when
`build()` throws (the error goes to the console and whatever `build` had made is freed);
the wrapper above then simply draws nothing. `dispose()` frees everything the scene made
and puts the WebGL context back to its defaults, so the next effect (including the older
WebGL ones) starts clean.

### The `k` context (passed to `build` and `update`)

| Name | Meaning |
|---|---|
| `k.THREE` | three.js r160 |
| `k.scene` | the `THREE.Scene` to add objects to |
| `k.camera` | the camera; the kit places it every frame, so don't move it |
| `k.orbit` | radians; set it in `update` to swing the camera around the frame centre |
| `k.keep(obj)` | register a geometry, material or texture for disposal; returns `obj` |
| `k.practical(light)` | mark a light as a *practical* (see below); returns the light |
| `k.addLight(material)` | make a material add light without adding alpha; also sets `transparent = true` and `depthWrite = false`; returns the same material |
| `k.glowTexture(r, g, b)` | a soft round glow texture (0-255 channels), already kept |

`audio` in `update` is already smoothed, and every field but `beat` is 0 to 1:

| Field | Meaning |
|---|---|
| `level` | the raw mic loudness (Gain applied) |
| `flame` | fast attack, slow release: for anything that should flicker |
| `slow` | a slow average of the level: for ambient drift |
| `kick` | 1 on a beat, then decays quickly |
| `burst` | builds on beats, decays over a few seconds |
| `beat` | `true` on the one step a beat fires |

With no mic the level is a slow swell when **Idle animation** is on, otherwise silence.

### The rules

- **Only solid objects may darken the stream.** Light is written with alpha 0, so it adds
  to whatever is behind the overlay in OBS and never greys it. Never use three's stock
  `AdditiveBlending` for light, glows or sprites; wrap their material in `k.addLight()`.
- **Light goes through the kit.** A light whose glow should land on the ground is marked
  with `k.practical(light)` (a candle's point light, say). Other lights light the solids
  only. Shadow-casting lights are the most expensive thing in a scene; keep their shadow
  maps small.
- **Everything is per second.** Speeds, decays and probabilities are computed from `dt`
  (`x += speed * dt`, `v *= Math.exp(-rate * dt)`), never per frame, so a scene looks the
  same at 30 and 60 fps. A random part that must not speed up with the frame rate is
  redrawn at a fixed rate, not on every call.
- **Size the scene in the frame, not in pixels.** `frame` is the box (in scene units) that
  must fit the canvas at Size 100%, in any canvas shape: the kit picks the camera distance
  from it and the canvas aspect. Design for the frame; the 300x220, 4:3 and 16:9 pages all
  show it whole.
- **Own what you create.** Everything the scene allocates (geometries, materials,
  textures) must be reachable by `dispose()`: pass it through `k.keep()`. Lights and
  instanced meshes added to `k.scene` are swept up by the kit.
- **Rendering is the kit's.** The kit draws solids and light into a half-float target,
  folds in the previous frame so light lingers, tone-maps, and writes the canvas. The
  afterglow length follows the global **Trail veil** setting. Don't render, clear or resize
  anything yourself.

### Scene placement

Every kit scene gets the **Scene placement** group in the control panel: Left-right and
Up-down (-100 to 100, percent of the half frame) and Size % (40 to 200). They are the
`placement` object in the config (`PLACEMENT_RANGES` in `shared/viz-config.js` is the
schema) and apply live through the camera, without rebuilding the scene.

### Registering a scene

The same three edits as any effect (above), plus the id in two more lists in
`shared/viz-config.js`:

1. Add the id to `VIZ_SCENES`, the list of kit scenes that came with the scene kit (it
   shows the Scene placement group for the effect), and to `VIZ_USES_3D`, the existing
   list of every WebGL effect (it shows the WebGL canvas). `ACTIVE_VIZ_NAMES` and
   `DEFAULT_PER_VIZ` work as usual.
2. Add the scene's `<script>` tag to all three overlay pages, after `scene-kit.js` and
   `scene-parts.js`, which the pages already load before the factories.

For tests, `TimbreScene.testLevel = 0.8` replaces the mic level (`null` restores it), and
`TimbreScene.debug()` returns the live scene's render scale, GPU resource counts and its own
`debug()` state.

## Afterglow (bar and wave effects)

Six 2D effects (`visualizer`, `peak-hold`, `ring-bars`, `sine-bars`, `waveform`,
`ring-waveform`) leave a fading trace of what they just drew. The length is the
**Afterglow** setting, `cfgAfterglow` in seconds (0 to 4, default 1.6; 0 is off).
`overlay/afterglow.js` sets one global, `TimbreGlow`. It holds the arithmetic plus two
small canvas helpers (`trace`, `glowLine`) that draw only on the context they are handed:
the effect decides what to draw, `TimbreGlow` says what to remember and how strongly.

### What `TimbreGlow` offers

| Name | Meaning |
|---|---|
| `fade(ageSec, T)` | a ghost's strength, 0 to 1: full for the first 15% of `T`, then eased down to 0 at `T` |
| `createBarGhosts()` | per-bar memory of recent peaks. `sync(key)`, then `step(i, height, now, T, record)` returns the strips (`{ lo, hi, strength }`, nearest the live bar first) to draw above bar `i` |
| `createEchoes()` | frozen copies of a wave's loudest moments. `sync(key)`, then `step(loudness, now, dt, T, record, snapshot)` returns `{ shape, strength, born }` for each live echo; `snapshot()` is called to capture the wave. Never more than `MAX_ECHOES` (6) are alive, even if `T` is raised |
| `trace(ctx, xs, ys, closed)` | adds a smooth curve that follows the points to the current path, rounding each one: it passes through the midpoints between neighbours, and an open curve starts and ends on its end points (it does not begin or stroke the path) |
| `glowLine(ctx, addPath, { width, stroke, glowColor, blur })` | the live wave line: a glowing stroke with a thin white core, drawn from the path `addPath` adds |
| `BAR`, `BAR_TIP`, `ECHO`, `ECHO_FILL` | alpha ceilings (0.42, 0.63, 0.6, 0.07); multiply each by the ghost's `strength` |

### The rules

- **Ghosts go behind.** Draw them before the live shape, so the live shape looks the same
  with the afterglow on or off.
- **Redraw, don't fade.** Ghosts are redrawn every frame from remembered values. Never
  fade the previous frame's pixels.
- **Time comes from `now` and `dt`.** Never count frames, so the effect looks the same at
  30 and 60 fps.
- **Call `sync` at draw time.** Pass a key made of whatever should start the memory afresh
  (for example `` `${bars}:${W}:${H}` ``). A key that changes clears the ghosts; the same
  key keeps them, so a config push does not wipe them.
- **Never reset in `onResize`.** A resize that leaves the key unchanged keeps the ghosts.
- **No new ghosts while the mic is off.** Pass `record` as true only while there is live
  audio (the factories use `micActive` plus a check that the audio array exists); ghosts
  already alive keep fading.
- **The live drawing is unchanged.** Afterglow 0 must look exactly like the effect without
  any ghosts.

### Adding an effect

Add its id to `VIZ_AFTERGLOW` in `shared/viz-config.js`: that shows the Afterglow slider in
the control panel for the effect. Load `afterglow.js` before the factories (all three
overlay pages already do). Then read `cfgAfterglow` in `draw`, keep one `createBarGhosts()`
or `createEchoes()` per activation, and follow the rules above. `npm run verify:render` has
a set of checks every afterglow effect should pass, and a speed check (under 0.5 ms a
draw); add the new id to the `glowChecks` calls there. The speed check picks it up from
`VIZ_AFTERGLOW`.

## Helix arithmetic (`TimbreHelix`)

`overlay/helix.js` holds the plain numbers behind the DNA effect as `globalThis.TimbreHelix`;
the effect in `factories/dna.js` cuts and draws, nothing in `helix.js` draws. It offers:

- `threshold(sensitivity)`: the peak a shatter needs, from Shatter Sensitivity (0 never shatters).
- `peakOf(samples)`, `levels(frequencies, waveform, gain)`: the loudness, low and high levels (0 to 1).
- `twist(loud)`, `radius(level)`, `follow(current, target, dt, tau)`: turn speed, strand radius and
  frame-rate-independent smoothing.
- `returnShare(u, lag)`: the return curve (share of the way home, and heat).
- `rng(seed)`: a seedable random source; `window.__dnaSeed` makes the effect use it.
- `createShatter({ random, aim })`: the whole / pieces / returning state machine with the motion of the
  pieces, driven by `step({ now, dt, ... })`; all timing comes from `now` and `dt`. `aim` is
  optional: `aim(x, y, W, H, scale, random)` returns the angle a blast pushes the piece at
  `(x, y)`. Without it a blast pushes away from the frame's long axis, as the helix needs; Pulse
  Rings aims every chunk away from the middle of the frame. A jostle is random either way.
- `RETURN_S`, `HANDOVER_U`, `MIN_CALM_S`, `REARM_S`, `JOSTLE_GAP_S`, `GAP_MS`: its timing constants.

It must stay loadable under Node (a classic script that only assigns `globalThis.TimbreHelix`; no
`document`, `window`, `ctx` or core.js globals), because `npm run verify` imports it.

## Comet flight (`TimbreComet`)

`overlay/comet-flight.js` holds the plain numbers behind the Comet effect as
`globalThis.TimbreComet`; the effect in `factories/comet.js` reads the sound and draws, nothing
in `comet-flight.js` draws. Comet takes its sound levels, smoothing, peak threshold and random
source from `TimbreHelix`, so it hears what DNA hears. It offers:

- `at(theta, reach, lean, W, H, scale)`, `lean(clock)`: the looping path the head flies, and its
  slow reshaping.
- `speed(loud, flash)`, `reach(loud)`, `tailLength(trail, loud, scale)`, `radius(a, loudNow,
  loudThen, z, scale)`, `alpha(a, loudNow, loudThen)`: how the voice sets the flight and the tail.
- `capBulges(radii)`: trims each half-width (tip first, head last) to at most `BULGE` (1.25)
  times the narrowest one nearer the head, so a loud stretch of tail bulges gently.
- `createTrail({ step, keep })` and `fly(trail, { ... })`: the tail's memory of where the head has
  been and how loud the voice was there. `fly` cuts each frame's movement into sub-steps, so the
  remembered path is the same smooth curve at any frame rate.
- `createFlare()`: the gate that decides when a peak flares the head, driven by
  `step({ dt, live, peak, threshold })`.
- `step(scale)`, `keep(scale)`, `MARGIN`, `REACH_MIN`, `LEAN_MAX`, `REARM_S`, `BULGE`: its sizes and constants.

`window.__cometSeed` seeds the effect's sparks. Like `helix.js`, the file must stay loadable under
Node, because `npm run verify` imports it.

## Fireflies swarm (`TimbreSwarm`)

`overlay/fireflies-swarm.js` holds the swarm behind the Fireflies effect as
`globalThis.TimbreSwarm`; the effect in `factories/fireflies.js` reads the sound and draws,
nothing in `fireflies-swarm.js` draws. It offers:

- `count(density)`: how many fireflies a Density of 0 to 100 gives (10 to 60).
- `createSwarm({ random })`: the swarm, driven by
  `step({ dt, live, loud, peak, threshold, density, W, H, scale })`, which returns `'startle'` on
  the frame a peak startles it. It exposes `flies` (each with its place, depth `z`, brightness
  `env`, fade `born`, palette offset `col` and recent places `hist`), `waves`, `flashes`,
  `startles`, its smoothed `loud`, `fast` and `sync` levels, and its `clock`.
- `MARGIN`, `TRAIL_S`, `REARM_S`, `PUSH`, `MAX_WAVES`: its sizes and constants.

All its timing comes from `dt` and all its randomness from the `random` it is given;
`window.__firefliesSeed` seeds the effect. Like `helix.js`, the file must stay loadable under
Node, because `npm run verify` imports it.

## Planets (`TimbrePlanets`)

`overlay/planets.js` holds what the ringed-planet Pulse Rings and the other planet effects share,
as `globalThis.TimbrePlanets`. The effects in `factories/` read the sound and draw. It offers:

- `place(a, th, k, roll)`, `reach(k, roll)`, `fit(W, H, edge, k, roll)`: a point on a circle seen
  tilted (flattened to `k` of its width) and leaning by `roll`, with `z` saying which half is
  nearer; how far such a circle reaches; and the largest one that fits a frame.
- `createEcho(span)`: a memory of a level; `note(t, v)` records it and `heard(t, delay)` is what
  it was `delay` seconds ago.
- `createRings()`: the ring disc, driven by `step({ dt, level, flow, blastAgo, refillAgo })`. Its
  `bands` each give `u` (0 inner edge to 1 outer), `radius` (in planet radii), `level`, `lift`,
  `show` and `shock`. `blastAgo` starts a blast that thins the rings from the inside out and
  `refillAgo` starts them filling back in; each is how long before the end of that step it
  happened. `reset()` puts the rings back whole at once. `ringRest(u)`, `outer(flow)` and
  `gain(sensitivity)` are its rules.
- `crack(R, pieces, random)`: cuts a planet's disc into convex chunks that tile it exactly.
- `createSystem({ random })`: the sun-and-planets system behind Orbit, driven by
  `step({ dt, live, loud, peak, threshold, count, W, H, scale })`, which returns `'flare'` on the
  frame a peak flares the sun. It exposes `planets` (each with its orbit `a`, `k`, `roll`, its
  angle `th`, its place `x`, `y` as an offset from the sun, `z` and `depth` (which half of its orbit
  it is on, and how near it really is), drawn radius `r`, turning
  `w`, fade `born`, `leaving`, and its looks), `speed`, `loud`, `fast`, `flare`, `flares`,
  `sinceFlare`, `aMax` and `aMin`. `planetCount(setting)` is how many a Planets setting gives.
- `rgba`, `whiten`, `shade`: colour helpers.
- `bodyFill(ctx, R, c, lx, ly, lit)` returns the fill of a lit sphere, and
  `paintBands(ctx, R, c, k, list, lit)` paints its cloud bands. Both work on the context they are
  handed.
- `TILT`, `ROLL`, `INNER`, `OUTER`, `BANDS`, `TRAVEL_S`, `GHOST`, `PIECES`, `SUN_R`, `ORBIT_K`,
  `ORBIT_ROLL`: its constants.

All its timing comes from `dt` and all its randomness from the `random` it is given;
`window.__pulseRingsSeed` seeds Pulse Rings and `window.__orbitSeed` Orbit. Like `helix.js`, the file must stay loadable under
Node, because `npm run verify` imports it.

## Infall (`TimbreInfall`)

`overlay/infall.js` holds what falls into the Black Hole effect as `globalThis.TimbreInfall`;
the effect in `factories/black-hole.js` reads the sound and draws, nothing in `infall.js` draws.
It offers:

- `most(density)` and `rate(density)`: the most things there can be at once for a Density of 0
  to 100 (30 to 100), and how often they arrive as a multiple (0.4 to 1.6).
- `createInfall({ random })`: everything that is falling, driven by
  `step({ dt, live, loud, peak, threshold, density, W, H, scale })`, which returns `'gulp'` on the
  frame a peak makes the hole gulp. It exposes `things` (each with its `kind`, its distance `r`
  and angle `th`, its place `x`, `y` as an offset from the hole, depth `z`, `near`, fade `born`,
  `size`, palette offset `col` and the recent places `hist` its trail is drawn from; a swallowed
  thing stays listed with `sunk` set while its trail drains, `fade` falling to 0), `eaten`,
  `gulps`, `pull`, `feed`, `gulp`, `jet`, `spin`, `sinceGulp`, `loud`, `fast` and `clock`.
- `HOLE_R`, `END`, `TRAIL`, `NOTE_S`: its sizes and constants.

All its timing comes from `dt` and all its randomness from the `random` it is given;
`window.__blackHoleSeed` seeds the effect. It uses `TimbrePlanets.place` and `reach`, so
`planets.js` must be loaded before it. Like `helix.js`, the file must stay loadable under Node,
because `npm run verify` imports it.

## Characters (`TimbreCharacters`)

`overlay/characters.js` holds what the character effects share, and each character's pose, as
`globalThis.TimbreCharacters`. The effects in `factories/` read the sound, step a pose and draw.
It offers:

- `createEars()`: how a character hears, driven by `step({ dt, live, loud, low, high })`. It keeps
  `loud` (slow) and `fast`, `low` and `high`, `rise` (a syllable starting), `lean` (-1 the low
  end winning, 1 the high end), `happy` and `clock`.
- `createSpring(hz, damping)`: the bounce, driven by `step(dt, force)` and solved exactly for
  each step, so it is in the same place at any frame rate; `x`, `v` and `reset()`.
- `blink(clock, every, offset)`: 0 open to 1 shut. `bounce(setting)`: the Bounce setting as a
  strength (1 at 50). `mouth(fast)`: how far the mouth is open.
- `createBlob()`: the Blob's pose, driven by
  `step({ dt, live, level, bins, gain, bounce, idle, W, H, scale })`. It holds `radius`, `lift`,
  `stretch`, `shrink`, `cy`, its outline `px` / `py` (offsets from the middle of the frame),
  `bulge` and its `ears`.
- `paintFace(ctx, x, y, u, f)` and `glowBehind(ctx, x, y, r, c, a)`: the shared face and the glow
  behind a character. These two draw, on the context they are handed.

All its timing comes from `dt`. It uses `TimbrePlanets`' colour helpers when it paints, so
`planets.js` must be loaded before it. Like `helix.js`, the file must stay loadable under Node,
because `npm run verify` imports it.

## Wire format (for driving Timbre from elsewhere)

Anything that can call a Streamer.bot action can drive Timbre:

```
DoAction "Timbre Push"  args: { config: "<full config JSON>" }     — set + broadcast
DoAction "Timbre Push"  args: { reason: "…" }                      — re-broadcast cached
```

The broadcast every page receives is
`{ "type": "timbre:config", "config": { …full config… } }` inside SB's `General.Custom`
envelope. The full config shape is exactly `TIMBRE.defaultConfig()` in
`shared/viz-config.js` — that file is the schema. `afterglow` (seconds, 0 to 4, default
1.6) is the top-level key for the bar and wave effects' afterglow.
