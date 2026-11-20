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
and disposal. A scene only builds objects and animates them. `thanksgiving-harvest` was the
first; `winter-aurora` is the second and the one to copy. The five flag effects are one
scene with five pictures; see "The flag" below.

### The factory

A scene is a function that returns a fresh scene definition; `TimbreScene.factory` turns it
into the effect factory:

```js
VIZ_FACTORIES['my-scene'] = TimbreScene.factory(function () {
  // the scene's own state lives here: this function runs each time the effect starts
  return {
    frame: { width: 6.8, height: 3.1, center: [-0.4, 0.75, 0.3] }, // the box that must always fit
    fov: 30,               // vertical field of view, degrees
    pitch: 14,             // camera elevation above the centre, degrees
    groundColor: 0x7a6f66, // optional: the invisible ground that catches practical light
    cooling: [Infinity, 0.098, 0.035], // optional: how the afterglow cools (see the rules)
    build(k) {},           // once: create objects, add them to k.scene
    update(k, audio, now, dt) {},  // every frame, before drawing
    debug() { return {}; },        // optional: state for tests / DevTools
  };
});
```

The factory's `start` calls `TimbreScene.create(definition())`, `stop` disposes the scene,
and `onResize` and `draw` pass through. `create` returns `null` when three.js or WebGL is
missing, or when `build()` throws (the error goes to the console and whatever `build` had
made is freed); the effect then simply draws nothing. `dispose()` frees everything the scene
made and puts the WebGL context back to its defaults, so the next effect (including the older
WebGL ones) starts clean. (`thanksgiving-harvest` writes the same wrapper out by hand.)

### The `k` context (passed to `build` and `update`)

| Name | Meaning |
|---|---|
| `k.THREE` | three.js r160 |
| `k.scene` | the `THREE.Scene` to add objects to |
| `k.camera` | the camera; the kit places it when the scene is created and again after every `update`, so don't move it. In `update` it is where the last frame left it |
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

For a value of the scene's own, `TimbreScene.follow(current, target, rate, dt)` moves it
toward a target and `TimbreScene.fall(current, rate, dt)` lets it die away, both at `rate`
per second whatever the frame rate. They are what the fields above are made with.

For something that should travel (a gust along a flag, a pulse along a beam), keep a history
of a level: `TimbreScene.createHistory(size, hz)` gives `{ step(level, dt), byAge,
heard(seconds) }`. Call `step` once a frame. `byAge[0]` is the level now and `byAge[i]` the
level `i` samples ago (`hz` samples a second); `heard(seconds)` reads it at any age, held at
both ends. It glides between samples and writes each sample at its own moment, so what it
drives travels at the same speed at any frame rate.

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
- **Own what you create.** `dispose()` frees every geometry, material and texture it can
  reach from the objects in `k.scene` (a texture is found as a property of a material or as
  the value of one of its uniforms), along with lights and instanced meshes. Anything it
  cannot reach that way goes through `k.keep()`: something not attached to the scene, or a
  texture held somewhere else (a `customDepthMaterial`, a uniform holding an array of
  textures, `scene.background`, a `SpotLight`'s `map`). Passing everything through
  `k.keep()` is still the habit to keep.
- **A shadow ignores its caster's texture** unless the material cuts holes with it
  (`alphaTest` above 0). three.js would otherwise leave the texture on its shared shadow
  materials and upload it again in the next scene, where nothing frees it. The kit does
  this through each object's `onBeforeShadow`; if an object has one of its own, it still
  runs, after the kit's.
- **The afterglow cools the way the scene says.** `cooling` is three extra fade times in
  seconds, for red, green and blue, on top of the afterglow time; `Infinity` adds none. The
  default, `[Infinity, 0.098, 0.035]`, lets green and blue go first, so fading candlelight
  turns warm. Winter Aurora uses `[0.05, Infinity, 0.25]` so trailing light stays green.
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

If an id no longer says what the effect is, give it a display name in `VIZ_LABELS`
(`shared/viz-config.js`): the control panel lists the effect by that name. The id stays, so
saved configs and Streamer.bot actions keep working.

For tests, `TimbreScene.testLevel = 0.8` replaces the mic level (`null` restores it), and
`TimbreScene.debug()` returns the live scene's render scale, GPU resource counts, the
camera's position and its own `debug()` state.

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

- `createEars()`: how a character hears, driven by `step({ dt, live, idle, loud, low, high })`.
  It keeps `loud` (slow) and `fast`, `low` and `high`, `rise` (a syllable starting), `lean` (-1
  the low end winning, 1 the high end), `happy` and `clock`, and two weights that ease over
  0.3 s: `awake` (the mic or the idle animation is on; a character's own small movements are
  scaled by it) and `rest` (mic off with the idle animation on: its idle breathing).
- `createSpring(hz, damping)`: the bounce, driven by `step(dt, force)` and solved exactly for
  each step, so it is in the same place at any frame rate; `x`, `v` and `reset()`. `hz` must be
  above 0 and `damping` from 0 to below 1; anything else throws a `RangeError`.
- `blink(clock, every, offset)`: 0 open to 1 shut. `bounce(setting)`: the Bounce setting as a
  strength (1 at 50). `mouth(fast)`: how far the mouth is open.
- `createBlob()`: the Blob's pose, driven by
  `step({ dt, live, level, bins, gain, bounce, idle, W, H, scale })`. It holds `radius`, `lift`
  (how far above its resting place it is drawn), `stretch`, `shrink`, `held` (the frame is
  holding it back), `cy`, its outline `px` / `py` (offsets from the middle of the frame),
  `bulge`, `look`, `blink` and its `ears`.
- `createOwl()`: the Owl's pose, driven by `step({ dt, live, level, bounce, idle, W, H, scale })`.
  It holds `k` (px for one unit of the owl's drawing), `cy`, `lift`, `shrink`, `held`, `tilt`,
  `flap` and `wing`, `open` (its beak), `look`, `blink`, `sing`, its `notes` (each
  `{ x, y, a, hue }`) and its `ears`. `OWL_UP` (48) and `OWL_BELOW` (41.5) are how far it
  reaches above and below its middle however it leans, in those units; it is fitted to the
  frame by them.
- `createTelevision()`: the Television's pose, driven by the same `step({ ... })` as the Owl's. It
  holds `k`, `cy` (with its hover in it), `lift`, `shrink`, `held`, `tilt`, `wag` (its antennae),
  `dials` (`[low, high]`), `speaker`, `roll` (the band on its screen), `snow` (which picture of
  static shows: a count that goes up 20 times a second), `asleep` (the mic is off), `open` and
  `smile` (its mouth), `look`, `blink` and its `ears`. `TV_UP` (56) and `TV_BELOW` (40) are its
  reach, in its own units. Its hover, band and static stop when the mic and the idle animation
  are both off.
- `paintFace(ctx, x, y, u, f)` and `glowBehind(ctx, x, y, r, c, a)`: the shared face (or, with
  `eyesOnly`, just its eyes) and the glow behind a character. These two draw, on the context
  they are handed.

All its timing comes from `dt`. The only randomness is the Television's static, which
`factories/television.js` draws: the pose says which picture shows (`snow`), and
`window.__televisionSeed` seeds the pictures. It uses `TimbrePlanets`' colour helpers when it paints, so
`planets.js` must be loaded before it. Like `helix.js`, the file must stay loadable under Node,
because `npm run verify` imports it.

## The flag (`TimbreFlag`)

`overlay/flag.js` is what the four Pride flags and the Fourth of July flag share, as
`globalThis.TimbreFlag`: the flags themselves, the arithmetic that moves the cloth, and the
kit scene. Each of the five effect files in `factories/` is one line,
`VIZ_FACTORIES[id] = TimbreScene.factory(() => TimbreFlag.definition(id))`. It offers:

- **The flags.** `FLAGS[id]` is `{ aspect, stripes, stripes8?, canton?, hearts?, sparks? }`.
  A stripe is `[red, green, blue, share of the height]`, top to bottom. `stripesOf(spec,
  eight)` is the list in use; `starPoints()` is the fifty stars as fractions of the union.
  `paint(ctx, w, h, spec, eight)` draws a flag on the canvas context it is handed, and
  `paintStars(ctx, w, h, spec)` draws the stars alone, white on black.
- **The voice, remembered.** `createHistory()` gives `{ step(level, dt), byAge }`: 16 samples,
  16 a second, index 0 is now. It glides between samples and writes each sample at its own
  moment, so a gust travels at the same speed at any frame rate. `gusts(byAge, out)` spreads
  it along the cloth, smoothed, from the pole (now) to the free end (the oldest).
- **Lift and droop.** `lift(wind)` says how far the wind lifts the flag (0.1 hangs, 1 flies
  straight out). `droop(fly, length)` says how far below level the cloth runs, limited so the
  longest flag stays clear of the ground when it hangs.
- **The cloth.** `shape(out, p)` writes the cloth's points for
  `p = { length, fly, droop, phase, t, gust, low, high, kick }`: rows top to bottom, columns
  from the pole to the free end, origin at the top corner by the pole. The cloth keeps its
  length, so a ripple shortens its reach instead of stretching it; it keeps its height to
  within 2%; and the edge at the pole never moves. `measure(positions)` reads off the free
  end's corner, the lowest point and the deepest ripple.
- **The scene.** `definition(id)` returns the kit scene definition: the pole and base, the
  lamp, the cloth, and the hearts or the fireworks.

To add a flag: an entry in `FLAGS`, a one-line factory file, and the usual registration as a
kit scene. A flag with `hearts` sheds hearts in those colours; one with `sparks` has
fireworks in those colours; one with a `canton` gets the union and its stars, which shine
with the high end of the sound. The three are independent.

All its timing comes from `dt`. The arithmetic touches nothing at load, and the file must stay
loadable under Node, because `npm run verify` imports it; the scene looks up `THREE`,
`TimbreScene`, `document` and the core.js globals only when it is built. It must be loaded
after `scene-kit.js` and before the factories.

## The sunburst (`TimbreSunburst`)

`overlay/sunburst.js` is the Sunburst effect, as `globalThis.TimbreSunburst`: a small star
with a crown of beams of light. `factories/sunburst-3d.js` is one line,
`VIZ_FACTORIES['sunburst-3d'] = TimbreScene.factory(() => TimbreSunburst.definition())`. It
offers:

- **The crown.** `rayCount(density)` is how many beams a Density setting means (24 to 144).
  `directions(n)` spreads `n` directions evenly over a sphere, from one pole to the other.
- **The sound.** `bandOf(y, scatter)` is the band a beam follows, as a place among the
  frequency bins: the belt round the crown's middle hears bin 0 and the poles hear bin 9,
  with `scatter(i)` moving each beam up to a bin either way. `loudness(bins, band, gain)`
  reads that band, and `answer(band, flame)` adds a little of the voice as a whole.
- **A beam.** `lengthOf(amp, kick)` and `widthOf(amp, kick)` are its size.
  `strip(out, at, centre, dir, cam, len, width)` writes it as 13 pairs of points: a spine
  running straight out of the star, with its width across the beam and across the line of
  sight, so the strip faces the camera, tapering to 8% at the tip.
- **Its light.** `glow(u, pulse, amp, kick, shimmer)` is how bright it is at `u` along its
  length, where `pulse` is the voice as it was when that light left the star;
  `shimmer(high, u, wave)` is the flicker the high end gives its outer part; `tint(out, rgb,
  u, b)` is its colour, white at the star and its own colour further out.
- **The scene.** `definition()` returns the kit scene definition: the star, its glow and
  the crown. It keeps the voice in `TimbreScene.createHistory(25, 20)`.

All its timing comes from `dt`. The arithmetic touches nothing at load, and the file must stay
loadable under Node, because `npm run verify` imports it; the scene looks up `THREE`,
`TimbreScene`, `document` and the core.js globals only when it is built. It must be loaded
after `scene-kit.js` and before the factories.

Two things the kit's afterglow does, worth knowing before building on this: a shape that
moves outward (an expanding ring) leaves a filled shape behind it, and a moving point leaves
a dotted trail. Both were tried here and dropped.

## The mountains (`TimbreMountains`)

`overlay/mountains.js` is the Mountains 3D effect, as `globalThis.TimbreMountains`: a block
of alpine land that the voice raises and that flows toward the viewer.
`factories/mountains-3d.js` is one line,
`VIZ_FACTORIES['mountains-3d'] = TimbreScene.factory(() => TimbreMountains.definition())`.
It offers:

- **The shape of the land.** `hash(ix, iz)` and `noise(x, z)` are smooth noise in 0 to 1.
  `ridge(x, w)` is the land before the voice scales it, 0.16 to 1: long connected crests,
  smaller ones on them and a little roughness. `w` runs along the way the land travels, in
  the land's own coordinate, so a crest keeps its shape as it moves.
- **The sound.** `columnX(c)` is where a column is across the block. `bandOf(x)` is the
  band it follows, as a place among the frequency bins: the middle hears bin 0 and the
  flanks (2.6 from the middle, where the land begins to sink toward the sides) hear bin 9.
  `loudness(bins, band, gain)` reads that band, and `answer(band, flame)` adds a little of
  the voice as a whole.
- **Height.** `rise(amp)` is the share of its full height the land stands at for a
  loudness (15% in silence), `heightAt(x, w, amp)` the height of a point, and
  `lift(flame, kick)` what the whole range is scaled by as the voice and a beat lift it.
  `sink(x, z)` is the share the land keeps toward the block's edges (14% at the edge).
- **Flow and colour.** `flow(speed)` is how fast the land moves for a Speed setting, in
  units a second. `shade(out, rgb, h)` is the land's colour at a height: its own colour,
  dark in the valleys, and white above the snow line. `idle(c, t)` is the swell a column
  follows with the mic off.
- **The land.** `createLand()` gives `{ advance(distance, amps), row(j), z(j),
  write(positions, heights, lift), stored(i), travel, top }`. It keeps rows of heights that
  ride with the terrain. `advance` moves the land on and writes each row it passes, once,
  with every column's loudness at the moment the far edge passed that row's place. `row(j)`
  and `z(j)` are what to draw: row 0 is the far edge (the voice now), the last row is the
  near edge (read between the two stored rows either side of it), and the rows between are
  the stored rows, newest first. `write` fills a position buffer with the whole land, sunk
  toward the edges and lifted. It also fills `heights` with every point's height before the
  lift, which is what colour and snow go by, and returns the tallest of those.
- **The cut sides.** `rim()` gives `{ from, normals, index }`: for each point of the land's
  rim, that point and the point under it on the block's base, with the triangles wound to
  face out of the block.
- **The scene.** `definition()` returns the kit scene definition: the land, the cut sides
  of the block, the sun's light with its shadow, a weak fill light and a sky light, the sun
  and the glow of the sky.

All its timing comes from `dt`, as a distance handed to `advance`. The arithmetic touches
nothing at load, and the file must stay loadable under Node, because `npm run verify`
imports it; the scene looks up `THREE`, `TimbreScene` and the core.js globals only when it
is built. It must be loaded after `scene-kit.js` and before the factories.

Worth knowing before building another piece of moving ground: the rows move with the land
and only the two edge rows stay put. Sampling a moving height field at fixed points makes
every sharp crest swim as it passes between them.

## The phosphor (`TimbrePhosphor`)

`overlay/phosphor.js` is the Phosphor effect, as `globalThis.TimbrePhosphor`: a deck of dark
slices with a glowing trace along the top of each, the voice at the front and its echoes
behind. `factories/phosphor.js` is one line,
`VIZ_FACTORIES['phosphor'] = TimbreScene.factory(() => TimbrePhosphor.definition())`. It
offers:

- **The deck.** `sliceCount(depth)` is how many slices a Depth setting means (12 to 36).
  `backOf(i, n)` is where slice `i` of `n` is, 0 at the front and 1 at the back;
  `ageOf(back)` is how old the voice it shows is (2.2 s at the back) and `zOf(back)` where
  it stands. `xOf(j)` is where point `j` of a trace is across the deck.
- **The sound.** Each of the first ten bins is one sine across the width: `waves(b)` is how
  many waves band `b` has, `pace(b)` how fast it runs along the trace (odd bands the other
  way) and `weight(b)` how much it counts. `loudness(bins, band, gain)` reads a band.
- **A trace.** `shape(u, amps, phases)` is its shape at `u` along it, -1 to 1: the bands'
  sines, each as strong as its band is loud, scaled to their total. `stand(level, kick, back)`
  is how tall the slice at `back` stands for a loudness, and `heightOf(A, pinned, w)` the height of
  one point. `pin(u)` holds a trace down at its two ends and `ends(u)` fades its light there.
- **What is drawn.** `strip(out, at, xs, ys, z, half)` writes a trace as pairs of points
  centred on it, across the trace, flat in the plane of its slice (the scene puts it 0.006
  in front). A strip turned to face the camera would, on a steep flank, put half of itself
  behind its own slice. `wall(out, at, xs, ys, z)` writes the slice under it as three points for each
  point of the trace: the top edge, where its glow ends, and the foot.
- **Light.** `fade(back)`, `bright(A, kick, back)`, `hot(back)`, `halfWidth(A, kick, back)`,
  `under(A, back)` and `tint(out, rgb, heat, b)` are how bright, how white, how wide and
  what colour a trace is, and how bright its slice glows under it. They go by how far back
  a slice is, not by its number, so a beat and the white heat reach as deep at any Depth. `idle(b, t)` is
  what a band pretends to hear with the mic off.
- **The scene.** `definition()` returns the kit scene definition: the slices and the
  traces. It keeps the voice in eleven of the kit's histories
  (`TimbreScene.createHistory(56, 24)`): one for the loudness and one for each band. A band
  is followed before it is kept (up at 20 a second, down at 8), because the bins are read
  only 30 times a second and a trace drawn straight from them changes shape in steps.

All its timing comes from `dt`. The arithmetic touches nothing at load, and the file must stay
loadable under Node, because `npm run verify` imports it; the scene looks up `THREE`,
`TimbreScene`, `document` and the core.js globals only when it is built. It must be loaded
after `scene-kit.js` and before the factories.

Worth knowing before building another effect on the waveform: the `waveform` Timbre captures
is 64 samples, about a thousandth of a second, which is a fragment of one cycle of a voice.
It jitters from one reading to the next and cannot show a whole wave. This effect draws its
trace from the frequency bins instead. And nothing in this deck moves from place to place,
only in shape, so the kit's afterglow gives the traces a little persistence where they rise
and fall, not the filled wake it leaves behind something that travels.

## Turning what a scene shows

Three scenes have Rotate X, Rotate Y and Rotate Z settings (0 to 360 degrees): Chladni,
Mountains 3D and Phosphor. They turn the thing the scene shows, not the camera, and the
scene kit has the arithmetic so that all turn the same way:

- `TimbreScene.turn(out, x, y, z, rx, ry, rz)` turns a point: it spins about its upright
  axis first (y), then rolls to one side (z), then tilts its top toward the viewer (x).
  three.js calls that order `'XZY'`, and a scene gives it to the group it turns.
- `TimbreScene.reach(box, view, rx, ry, rz, scale, px, py, pz, orbit)` is how far a turned
  box reaches from the middle of the frame: `[lowest, highest, leftmost, rightmost]`, as
  the camera sees it from where it rests, or swung `orbit` radians round the frame's
  middle as `k.orbit` swings it. `box` is `{ min, max }` and `view` is
  `{ frame, fov, pitch }` as in the scene's definition. `TimbreScene.sweep(..., sway)` is
  the same over everywhere a camera that sways `sway` radians each way comes to.
- `TimbreScene.poseFor(box, view, rx, ry, rz, sway)` is where to put the turned box and
  how large to draw it so that it stays in the frame: `{ scale, x, y, z }`. Seen from
  where the camera rests, the box may be as tall and as wide as it was unturned, or 86% of
  the frame if that is more; it sits where the unturned box does, but never reaches
  further out than that did (or 86% of the way to the frame's edge). Wherever a camera
  that sways `sway` radians each way comes to, the box is inside the frame (or reaches no
  further than the unturned box does from there). With no rotation it is exactly
  `{ scale: 1, x: 0, y: 0, z: 0 }`. It allocates, so call it when a setting changes, not
  every frame.

The fit takes the camera to be as far away as the frame's height asks, which it is on any
page at least as wide as the frame.

To give a scene the settings: put everything it shows in one `THREE.Group` with
`rotation.order = 'XZY'`; describe its solid part as a box; each frame set the group's
rotation from the settings, and its scale and position from `poseFor` (give it the
furthest the scene's own `k.orbit` swings at the present Camera drift); add `rotateX`, `rotateY` and `rotateZ` (default 0) to its entry in
`DEFAULT_PER_VIZ` and their limit of 360 to `PER_VIZ_MAX`. A scene that sizes anything in
pixels has to take the pose's scale into account as well (Chladni's grains do).

Lights need care (Mountains 3D has them):

- A `DirectionalLight` turns with the group only if its `target` is in the group too. A
  target that is not in the scene stays at the origin.
- A `HemisphereLight` takes its direction from its place in the scene, so inside the group
  the group's own position leaks into it. Keep it in the scene and set its position to the
  group's up each frame.
- A shadow camera's reach and `normalBias` are in the scene's units: scale them with the
  pose.
- A thing that can now be seen from behind or below needs a back and an underside: the
  land has a base, and the deck's traces move to the side of their slices the camera sees.

## The chladni plate (`TimbreChladni`)

`overlay/chladni.js` is the Chladni effect, as `globalThis.TimbreChladni`: a dark plate
floating in the box, with sand on it that gathers into the lines of a figure as the voice
shakes the plate. `factories/chladni.js` is one line,
`VIZ_FACTORIES['chladni'] = TimbreScene.factory(() => TimbreChladni.definition())`. It
offers:

- **The figures.** `FIGURES` is the ten figures, simplest first, each `[n, m, s]`.
  `value(fig, x, z)` is a figure's value at a place on the plate (x and z from -1 to 1):
  `cos(n·π·x)·cos(m·π·z) + s·cos(m·π·x)·cos(n·π·z)`. Its lines are where that is zero.
  `cell(x)` is the table cell for a place, and `sample(fig, ix, iz, out)` reads a figure's
  value and its slope each way from the tables (2,048 cells across the plate).
- **The sound.** `toneOf(bands)` is where the sound's weight sits among the 16 lowest bins,
  each weighing as its square, 0 to 1, or -1 with too little sound to tell. `meanOf(...)` is
  the running mean the scene takes of it over a phrase's first tenth of a second.
  `wantFigure(tone)` is the figure a tone asks for. `voice()` is what the plate remembers
  (its figure, the one before, what the tone last asked for, how long since it changed, how
  long the voice has been quiet, whether a phrase is waiting) and `listen(st, level, want,
  dt)` is one moment of listening: a new phrase takes `phraseFigure(want, has, had)`, the
  figure the tone asks for or the nearest one along that the plate neither has nor had, and
  within a phrase the figure moves only when the tone has, and not within 3 s of the last
  change. `blendOf(since)` is how far a change has got.
- **The shake.** `shakeOf(flame, kick, live)` is how hard the plate shakes. `pace(shake)`,
  `jostle(shake, h)`, `hopChance(shake, h)` and `hopSpeed(shake, moved, r)` are what that
  does to a grain. `thrown(level, rose, sinceHit)` is how hard a beat throws the sand.
- **The sand.** `createSand(n, seed)` makes n grains as plain typed arrays, each with its
  own place beside a line and its own run of random numbers. `stepSand(sand, count, figA,
  figB, blend, shake, live, h)` moves the first `count` of them one step: a grain on the
  plate walks toward its place, is jostled, and may hop; a grain in the air flies and falls.
  Within reach of its place a grain's distance from it dies away at a rate that does not
  depend on the step, and `sand.f` is left as the plate's value under each grain.
  `throwSand(sand, count, strength)` throws those lying on the plate. `measure(...)` says how
  the sand lies. `stepsFor(dt)` is how many steps a frame takes (none longer than a sixtieth
  of a second). `grainCount(density)` is how many grains a Density setting means (6,000 to
  30,000).
- **The plate and the light.** `bend(shake, clock)` is how far the plate is bent just now and
  `glow(f, shake)` how bright it glows where the figure's value is `f`. `sandBright(shake,
  inAir)`, `pale(out, rgb)` and `radius(x, z)` are how bright and what colour a grain is,
  and `grainSize(scale, zoom)` how wide it is drawn.
  `idle(b, t)` is what a band pretends to hear with the mic off.
- **The Rotate settings.** `turn(out, x, y, z, rx, ry, rz)`, `bounds(...)` and
  `poseFor(rx, ry, rz)` turn the plate, say how far it then reaches from the middle of the
  frame, and say where to put it and how large to draw it so that it stays inside. They are
  the scene kit's `turn`, `reach` and `poseFor` (see "Turning what a scene shows"), given
  the plate's box (`BOX`: its slab, and room above it for sand in the air).
- **The scene.** `definition()` returns the kit scene definition: the plate (a grid of 48
  by 48 cells with a skirt round its edge) and the sand (points of added light), in one
  group that the Rotate settings turn.

All its timing comes from `dt`, and it takes no numbers from `Math.random`. The arithmetic
touches nothing at load but its own tables, and the file must stay loadable under Node,
because `npm run verify` imports it; the scene looks up `THREE`, `TimbreScene` and the
core.js globals only when it is built. It must be loaded after `scene-kit.js` and before
the factories.

Worth knowing before building another effect out of particles: the sand is stepped in
steps no longer than a sixtieth of a second whatever the frame rate, and each grain has its
own run of random numbers, so a run is repeatable and the checks can step the sand under
Node. three.js sizes a point (`PointsMaterial` with `sizeAttenuation`) by the height of the
canvas, not of the picture the kit draws into, and takes no notice of the camera's zoom: on
the small page, where the kit draws four times taller, points come out a quarter of their
size, and the Size slider does not scale them. The scene sets the size itself each frame.
Two frame rates still give the same kind of figure and not the same grains, because a hop
is a chance taken each step. And the kit's afterglow lingers only where nothing solid is
drawn: sand over the plate leaves no trail, sand thrown beyond its edge does.

## The glass prism (`TimbreGlassPrism`)

`overlay/glass-prism.js` is the Glass Prism effect, as `globalThis.TimbreGlassPrism`: a cut
crystal of twenty facets that tumbles in the box, drawn in light only, whose colours come
apart like light through a prism. `factories/glass-prism.js` is one line,
`VIZ_FACTORIES['glass-prism'] = TimbreScene.factory(() => TimbreGlassPrism.definition())`.
It offers:

- **The sound.** `loudness(bins, band, gain)` reads one of the ten lowest bins, `idle(b, t)`
  is what a band pretends to hear with the mic off, `highOf(bands)` the mean of the five
  highest bands, and `bandOf(facet)` the band a facet answers. `settle(v)` makes nothing of
  a level within a ten-thousandth of nothing.
- **The colours coming apart.** `apartOf(high, kick, chroma)` is how far apart the three
  copies of the crystal should be, and `copyAt(out, c, apart)` copy `c`'s size, its roll
  about the line of sight and its move to the camera's right.
- **Light.** `brightOf(flame, kick, flash)` is how bright the crystal is drawn and
  `heartOf(out, flame, kick, flash)` the glow inside it; `flash` is a shatter's.
- **The pulse.** `pushOf(pulse)` is the push a beat gives, `swing(sw, dt)` carries the
  swing (`[how far out, how fast]`) on by `dt` exactly, and `sizeOf(x)` is the crystal's
  size with the swing `x` out.
- **The shatter.** `layout(corners)` gives each facet's middle and the way it faces.
  `createShards()` is the facets' flight: `blast(sh, normals, strength, random, outward,
  fresh)` pushes and spins them, `fly(sh, dt)` carries them on, `startReturn(sh, random)`
  and `place(sh, u, share)` bring them home, `resume(sh)` takes up the flight when a
  return is broken off, and `home(sh)` puts them at rest. `shape(pos, nor, corners,
  normals, centres, sh)` writes the crystal as drawn and returns how far its furthest
  corner is from the middle. `limitFor(enlarged, apart)` is how far from the middle
  anything may be drawn (less when the Size slider enlarges the picture),
  `roomFor(reach, size, apart, limit)` how much smaller it must be drawn to fit,
  `headFor(reach)` the room kept for a beat while it is in pieces, and
  `zoomAfter(zoom, room, dt)` what is held of that a step later. When it breaks
  and when it comes back is `TimbreHelix.createShatter`, as for DNA.
- **The tumble.** `turnRate(flame)` is how fast it turns by itself, `axisAt(out, clock)` the
  wandering axis it turns about, `kickAt(out, n)` the spin the nth beat gives it and
  `kickAngle(speed, dt)` the angle a dying spin turns in a step. `turn(q, x, y, z, angle)`
  turns a quaternion (x, y, z, w) about a world axis, and `tumble(q, spin, mid, flame, dt)`
  is one whole step.
- **The scene.** `VERT` and `FRAG` draw a facet in added light: its ridges, light bleeding
  in from them, a flash when it mirrors a lamp, and its band. `definition()` returns the
  kit scene definition: one icosahedron drawn three times, and a glow sprite inside.

All its timing comes from `dt`. The arithmetic touches nothing at load, and the file must
stay loadable under Node, because `npm run verify` imports it; the scene looks up `THREE`,
`TimbreScene`, `TimbreHelix` and the core.js globals only when it is built. It must be
loaded after `scene-kit.js` and before the factories; `helix.js` may come after it.

Worth knowing before making another thing that turns freely:

- Two turns do not add up the same in either order, so a step that makes one and then the
  other comes out differently at 30 and at 60 frames a second. `tumble` makes half of the
  crystal's own turn, then the whole of the kick's, then the other half, which agrees
  across frame rates to a few ten-thousandths of a radian over two seconds.
- A spin that dies away turns through an angle that can be worked out exactly
  (`kickAngle`); multiplying the speed by the step would depend on the frame rate.
- The kit's afterglow keeps every frame's light for a third of a second. Thin bright lines
  that move fast leave a comb of themselves behind, and a tumbling crystal smears into a
  blob. A scene's `cooling` shortens it: this one gives 0.06 s for all three colours.
- On a small page the kit draws into a picture several times the page, and a page pixel
  shows only the middle four of each block of sixteen. Anything a shader draws thinner than
  a page pixel (a ridge sized with `fwidth`, say) comes out in dashes that crawl. Multiply
  the `fwidth` by `TimbreScene.renderScale(canvas3d.height)` and keep the line at least
  three quarters of a page pixel wide.
- A thing that springs is better worked out than stepped: `swing` is where a damped
  spring would be after `dt`, so thirty steps a second and two hundred and forty agree to
  fourteen places, and a beat is only a push added to its speed.
- A scene whose frame its subject nearly fills has no room to throw pieces about. This
  one works out each frame how far its furthest corner is from the middle and draws the
  whole of itself smaller by just enough (`roomFor`), which looks like the camera pulling
  back. The bound is a ball about the middle, which is inside the picture wherever the
  camera drifts, so it needs no projection. What the pieces need shrinks at once and grows
  back slowly (`zoomAfter`): following it both ways would make the crystal quiver as its
  pieces spin. What a beat's swell needs on top is followed both ways: held like the
  rest, the crystal sat a quarter small after every beat at a high Pulse.
- That ball is inside the picture only as the kit frames it. The Scene Size slider is the
  camera's zoom (`k.camera.zoom`, 0.4 to 2), which a scene that fits itself to the picture
  must divide its room by; and the kit's output pass dims light in the bottom fifth, the
  top tenth and a seventh at each side, so "no light at the very edge" says little about
  where a thing is drawn. The checks work out where each corner lands from the meshes.
- Pushes any way at all, one after another, are a random walk: without something to bring
  them back the pieces all end up at their limit. Here a jostle pushes a piece that is
  beyond its limit back toward its place.
- The shatter machine in `helix.js` counts and moves flat pieces of its own. A scene in 3D
  can use it for the rule alone: hand it stand-in pieces, read its state and its events,
  and count the seconds of the return yourself, in step with it, as Pulse Rings does.
- The crystal's corners are rewritten on the CPU while it is in pieces (sixty of them),
  and copied back from a saved copy when it is whole, so that whole it is exactly the
  crystal it was and not a sum that is nearly it.
- three.js builds an icosahedron with no shared corners, three to a facet in order, so a
  facet's number is its first corner's index over three. Each corner carries one of
  1,0,0 / 0,1,0 / 0,0,1, and the least of the three at a point says how near a ridge it
  is: that is how the ridges are drawn without a second mesh of lines.
## The metaball (`TimbreMetaball`)

`overlay/metaball.js` is the Metaball effect, as `globalThis.TimbreMetaball`: one ball of
liquid metal that each of the eight lowest bands of the sound pulls a droplet out of.
`factories/metaball.js` is one line,
`VIZ_FACTORIES['metaball'] = TimbreScene.factory(() => TimbreMetaball.definition())`. It
offers:

- **The droplets.** `direction(out, b)` is the way droplet `b` leaves the ball, the eight
  spread evenly round it, and `swing(b, clock)` how far round the ball it has turned.
  `reach(band, kick)` is how far from the middle it is and `dropSize(b, band)` its radius.
  `dropAt(out, at, b, band, kick, clock)` writes it as x, y, z and radius, and
  `coreAt(out, at, flame, kick, clock)` the ball. `ease(v)` eases a band.
- **The surface.** `smin(a, b, k)` is the smooth union of two distances, and
  `field(x, y, z, balls)` how far a point is from the one surface the ball and its droplets
  make (negative inside). `VERT` and `FRAG` are the shader that draws it: `field` again in
  GLSL, built from the same numbers, with a ray marched to it from the sphere it is drawn
  on. `boundOf(balls)` is that sphere's radius: 0.16 (`ROOM`) past the furthest reach of the
  ball or any droplet.
- **Light.** `glowOf(flame, kick)` is how much the metal glows in its own colour, and
  `pixelOf(height, zoom)` the width of the surface's soft edge. `loudness(bins, band, gain)`
  reads a band, and `idle(b, t)` is what a band pretends to hear with the mic off.
  `settle(v)` makes nothing of a level within a ten-thousandth of nothing, so that a muted
  blob comes to rest.
- **The scene.** `definition()` returns the kit scene definition: one sphere with the
  shader on it, scaled each frame to `boundOf` (and 2% over, `SKIN`, because the sphere is
  drawn flat-sided), so that in a pause the shader runs on little more than the ball. It
  follows each band (out at 12 a second, home at 2.2).

All its timing comes from `dt`. The arithmetic touches nothing at load, and the file must
stay loadable under Node, because `npm run verify` imports it; the scene looks up `THREE`,
`TimbreScene` and the core.js globals only when it is built. It must be loaded after
`scene-kit.js` and before the factories.

Worth knowing before drawing another surface in a shader:

- The kit's multisampling smooths the edges of meshes, and a surface found by a ray inside
  a shader has none. So the shader makes its own soft edge from how nearly a ray missed,
  and it has to know the height of the picture the kit draws into and the camera's zoom to
  make it a pixel and a half of that picture wide. (On the small page that picture is
  several times the canvas, so on the canvas the edge is finer.) The material is
  transparent only for that edge; everywhere else the metal is solid.
- The outlines inside the surface need the same care: where a ray only just misses a
  droplet and then meets the ball behind it, the pixel is a blend of the two, by how nearly
  it missed. Without that those outlines are hard steps that crawl as the droplets turn.
- A ray that passes close to a droplet creeps past it in small steps. With too few steps
  it gives up before it reaches the metal behind, and leaves a see-through hole along the
  droplet's outline. The march has 128 steps, and ends where the ray leaves the sphere.
- `verify-render` compares the picture with the arithmetic: it sends a ray through every
  fourth pixel (and every pixel of the soft edge) and asks `field()` whether the metal is
  there. That is what holds the GLSL to the JavaScript.

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
