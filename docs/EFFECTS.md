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
        const v = (TimbreHelix.spread(frequencies, i, cfgBars) / 255) * cfgGain;   // bar i of cfgBars, over all 32 bands; 0..~2
        const [r, g, b] = getColor(now / 1000 * cfgColorSpeed + cfgColorHue + i * 0.2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(i * (W / cfgBars), H - v * H, W / cfgBars - 2, v * H);
      }
    },
    onResize() {},              // optional — canvas buffer size changed
    onConfig(cfg) {},           // optional — full config object after each apply (one equal to the last is not applied)
  };
};
```

Script-scope globals available to factories (from core.js):

| Name | Meaning |
|---|---|
| `ctx`, `canvas2d` | 2D canvas + context (visible for 2D effects) |
| `canvas3d` | WebGL canvas (visible for effects listed in `VIZ_USES_3D`) |
| `W`, `H`, `SCALE` | canvas buffer size + width-based scale factor (1.0 at 260 px wide) |
| `frequencies` | `Uint8Array(32)`: 32 bands from 60 Hz to 12 kHz, low to high, 0–255, or `null` when no mic (below) |
| `slices` | `Uint8Array(32)`: what `frequencies` held before the bands, 32 values 750 Hz apart, 0–255, or `null` when no mic. For the effects tuned on those values only (below) |
| `waveform` | `Uint8Array(64)`: the newest 64 input samples, 0–255 (128 is rest), or `null` |
| `micActive` | mic currently captured |
| `micPeak` | loudest input sample over at least the last two looks (4096 samples at 48 kHz), 0 to 1, before Gain, or `null` when no mic |
| `micBands` | the same sound summed up once per look: `{ bass, mid, treble, rms, centroid, level, beat, beats }`, or `null` when no mic (below) |
| `cfgGain`, `cfgBars`, `cfgBounce`, `cfgColorSpeed`, `cfgColorHue`, `cfgIdleAnim`, `cfgEffectBgOpacity` | normalized global knobs |
| `perViz['my-effect']` | your effect's own knobs |
| `getColor(t)` | palette lookup → `[r,g,b]`, a new array each call |
| `getColorInto(out, t)` | the same colour written into an array of yours, which it returns: no array is made |
| `getColorCss(t)`, `paletteStep(t)`, `PALETTE_RGB`, `PALETTE_CSS` | the palette as a table of 256 colours with ready CSS strings (below) |
| `ema`, `decay`, `chance`, `fadeOrClear` | per-second helpers (below) |
| `THREE` | three.js r160 (vendored) |

**The sound.** `overlay/audio-capture.js` opens the microphone (`{ audio: true }`, or the
device picked in the dock) and looks at it about 30 times a second. Everything it publishes
is before Gain, but for the beat.

Asked for that way, the browser runs its own echo cancellation, noise suppression and
automatic gain on the microphone before the overlay sees it. That is the dock's **Browser
processing** toggle (the top-level setting `micProcessing`), on by default. With it off the
capture asks for the same device with `echoCancellation`, `noiseSuppression` and
`autoGainControl` all `false`: the raw microphone, which is truer to the sound (quiet sounds
are not gated, loud and soft are not evened out) but lets room noise through in quiet
moments, so an effect that sat still in silence may stir. A device that refuses those
constraints (`OverconstrainedError`) is asked for once more without them, and the console
says so; any other failure is `MIC DENIED` and a retry, as before. Changing the setting
closes the session and opens the microphone again (`timbreCapture.setProcessing(on)`, under
the same request counter as a change of device), so `micBands`, its beat count included,
starts afresh. Nothing an effect reads changes shape. An effect tuned with the processing
on reads a little differently with it off: Gain is where the streamer evens that out.

- `frequencies` is 32 **log bands**, each the same musical width (about a quarter of an
  octave): band `k` runs from `60 · 200^(k/32)` Hz to `60 · 200^((k+1)/32)` Hz. The edges,
  in Hz: 60, 71, 84, 99, 116, 137, 162, 191, 226, 266, 314, 371, 438, 516, 609, 719, 849,
  1001, 1182, 1394, 1645, 1942, 2291, 2704, 3191, 3766, 4444, 5244, 6188, 7302, 8617, 10169,
  12000. A voice's pitch is in bands 2 to 8, its vowels in 9 to 24, and "s" and "t" in 25
  to 31.
- A band is folded from a 2048-point analysis (1024 bins, 23.4 Hz apart at 48 kHz; twice as
  many points for each doubling of the sample rate, so a bin stays about 23 Hz). Its value
  is the **mean power** of the bins it overlaps, each counted by the Hz of overlap, in
  decibels, plus 15 dB (`BAND_LIFT_DB`), on the browser's own byte scale (-100 dB is 0, -30 dB
  is 255). The mean, so a wide band at the top reads no louder than a narrow one at the
  bottom when every bin is at the same level. The 15 dB is 10·log10(32): a bin of this
  analysis is 32 times narrower than one of the 64-point analysis it replaced, so a sound
  spread over many bins (a breath, an "s", a hi-hat) would read 15 dB lower in each; with the
  lift it reads what it read before. A single steady tone is not spread, so in the narrow low
  bands it reads up to 15 dB (55 of 255) higher than it used to, and a tone louder than
  about -31 dB of full scale fills its band.
- Each bin is smoothed over time by the analyser, 0.7 a look. A look at the bands sees 43 ms
  of sound, so two looks in a row overlap, a value does not jump with where in a wave the
  look happened to fall, and a sound shorter than 43 ms is spread over that long.
- `slices` is what `frequencies` was before the bands, and it is kept for the effects that
  were tuned on it. Slice `k` is the sound around `750 · k` Hz (at 48 kHz; the sample rate
  divided by 64, at any rate), about 750 Hz to either side: slice 0 is the bottom of the
  spectrum, slice 1 is centred on 750 Hz, slice 31 on 23.25 kHz, and a whole voice is in
  the first six. A look at the slices sees the newest 64 samples (1.3 ms), so a low tone
  reads differently from one look to the next, as it always did. The sampler works the
  slices out itself from those 64 samples, by the arithmetic of the 64-point analysis it
  used to ask the browser for (a Blackman window, the transform, 0.7 smoothing, the same
  byte scale); fed the same recorded sound, the slices and the old values agree to within 1
  of 255 (`npm run verify:render` checks it against a real 64-point `AnalyserNode`).
- **Which one to read.** A new effect, or one being rebuilt, reads `micBands` or the log
  bands. `slices` exists for the effects tuned before this change: 11 scene modules
  (`loudness(slices, band, gain)`), the ten seasonal 2D effects (`bandAverage`), and the
  blob's outline. Each scene moves to the log bands in a change of its own; the chladni
  plate was the first (its tone is weighed over log bands 0 to 11, see its section) and the
  phosphor the second (its ten bands are runs of log bands 4 to 30, see its section), and
  `npm run verify` lists exactly which files still read `slices`. Do not read `frequencies` by position (`frequencies[3]`): a position is a
  band a quarter of an octave wide, not 750 Hz. To lay bars over the spectrum use
  `TimbreHelix.spread(frequencies, i, count)`: bar `i` of `count` reads the mean of the
  bands from `i × 32 / count` to the next bar's first, so 20 bars cover 60 Hz to 12 kHz
  with no band left out. `npm run verify` fails if an effect file reads `frequencies[`.
- `waveform` is the newest 64 samples, about a thousandth of a second: a fragment of
  one cycle of a voice. Use `micBands.rms` for how loud the input is.
- `micBands` is one object per microphone session, written afresh on every look:

  | Field | Meaning |
  |---|---|
  | `bass` | the mean of bands 0 to 8 (60 Hz to 266 Hz), 0 to 1 |
  | `mid` | the mean of bands 9 to 24 (266 Hz to 3.77 kHz), 0 to 1 |
  | `treble` | the mean of bands 25 to 31 (3.77 kHz to 12 kHz), 0 to 1 |
  | `rms` | the root mean square of the last 2048 input samples, 0 to 1 (a full-scale sine is 0.707) |
  | `centroid` | where the weight of the 32 bands lies, 0 (all in band 0) to 1 (all in band 31); `60 · 200^centroid` is roughly its frequency in Hz. 0 in silence |
  | `level` | one loudness: the larger of 3 × the root mean square of the newest 64 samples and 1.1 × the mean of slices 0 to 5. Times Gain and held to 1, it is the `level` the scene kit hands a scene. It is made the way the kit made its own before the sampler did, so the kit's scenes and their beats are where they were |
  | `beat` | `true` on the one look where `level` × Gain jumps above 1.35 × its recent average + 0.07, at most once every 220 ms |
  | `beats` | how many beats this session has had |

  The beat is the one value that takes Gain into account, because Gain is how the streamer
  says how loud their microphone is. An effect draws faster or slower than the sampler
  looks, so it should not test `beat` every frame (it would take one beat twice at 60 fps
  and could miss one at 20): keep the `beats` you saw last and act when it has moved. The
  scene kit does this for a scene (`audio.beat`).
- **The re-mapped readers.** The effects that read "low", "bass" or "high" off fixed
  positions of the 750 Hz values now take them from the new input, through
  `overlay/helix.js`. `TimbreHelix.heard(which, micBands)` is a weighted sum of `bass`, `mid`
  and `treble`, before Gain and not clamped; the weights (`TimbreHelix.HEARD`) were fitted on
  recorded sound (a voice at 150 Hz and one at 220 Hz, a kick with a hi-hat, a band) so that
  each lands within a tenth of its old level, in the mean, on every one of them:

  | `which` | Stands in for | bass, mid, treble | Read by |
  |---|---|---|---|
  | `low` | the mean of values 0-1 × 1.3 | 1.22, 0.74, 0 | `levels()`: dna, comet, fireflies, pulse-rings, orbit, black-hole, blob, owl, television |
  | `high` | the mean of values 2-10 × 3 | 0, 0.96, 1.44 | `levels()` |
  | `bass` | the mean of values 0-3 | 0.47, 0.42, 0.56 | galaxy-ripple, matrix, peaks-mirror, winter-aurora, the flag, sunburst |
  | `all` | the mean of all 32 values | 0.13, 0.03, 0.89 | matrix, tunnel, vaporwave |

  The "high" of winter-aurora and the flag (values 8-31 × 3) is the mean of log bands 29 to
  31 (7.3 to 12 kHz) × 3, and the sunburst's (values 5-14 × 2.5) the mean of bands 24 to 30
  (3.2 to 10.2 kHz) × 2.38: `TimbreHelix.bandMean(frequencies, from, to)`. The bar and
  spectrum effects (visualizer, peak-hold, sine-bars, ring-bars, spectrogram, tunnel,
  peaks-mirror, mountains-2d, vaporwave) read the log bands through `spread`, each times a
  `LOG_GAIN` of its own, fitted so that the recorded 150 Hz voice gives the light the old
  values gave; their shape is different on purpose. `tools/compare-input.mjs` (README,
  "Verification") measures all of this against any earlier build.
- Beside a cached `core.js` from before `micBands` or `slices`, the sampler publishes the
  rest and not those; beside a cached `audio-capture.js` from before them, `micBands` and
  `slices` stay `null`, the scene kit works its level out from `waveform` and `frequencies`
  as it used to, and an effect that reads `slices` or `micBands` hears nothing until the
  source is refreshed. An effect that reads `micBands` must allow for `null`.

**The palette table.** An effect that paints many things a frame should not build a colour
array and an `rgb(...)` string for each. `getColorCss(t)` returns a ready string for the
palette colour nearest `t`, from a table of 256 colours spaced evenly round the palette;
`paletteStep(t)` is that entry's index (0 to 255) and `PALETTE_RGB[i * 3]` onward its three
numbers. A table colour is within 3 of 255 on any channel of the exact `getColor(t)`. For
the exact colour without the array, hand `getColorInto` an array you keep. The table is
rebuilt whenever the palette changes, which only `setPalette(colours)` does.

**Per-second helpers.** `ema(current, target, rate, dt)` moves a value toward a target and
`decay(current, rate, dt)` lets it die away, at `rate` per second; they are the scene kit's
`follow` and `fall`. `chance(perSecond, dt)` is the chance that something which happens
`perSecond` times a second on average happens in this frame: `if (Math.random() <
chance(2, dt))`. `fadeOrClear(alpha, dt)` fades what is on the 2D canvas toward nothing,
where `alpha` is the share a 60 fps frame takes off (multiply your own strength by
`cfgEffectBgOpacity`, as the trail effects do); with nothing to fade by (Trail veil 0) it
clears the canvas instead, so nothing smears for ever. All four give the same result over a
second at any frame rate.

**Painting over a trail.** `fadeOrClear` makes a trail last as long in seconds at any frame
rate. What is painted over it every frame must then be scaled too, or a line that stands
still is brighter the more frames there are. `fadeOrClear` returns the share it took off;
the five effects that repaint their lines over a trail (`mountains-2d`, `peaks-mirror`,
`galaxy-ripple`, `tunnel`, and `vaporwave` with its backdrop off) each hold the same small
`trailAlpha(alpha, veil, share)`, which gives the alpha to paint with: `alpha` itself at
60 fps and when the canvas was cleared, less in a shorter frame, more in a longer one.
`npm run verify` holds the five copies to the same words. Matrix paints its glyphs solid
and needs none.

**What you keep on the canvas stays.** The core sets the canvas height only when it changes,
and a config equal to the one in force is not applied at all (no `onConfig`, no `onResize`),
so a history or a trail kept on the canvas survives every config that does not resize it.
When the effect changes, the 2D canvas is cleared and its context put back as new before the
next effect starts.

Multiply pixel-tuned constants by `SCALE` so the 300×220, 1440×1080 and 1920×1080 layouts all
look right. `SCALE` is 1.0 / 4.8 / 4.8 on those pages — the 16:9 page pins it to the 4:3 value
(its canvas is the same 624px tall, only wider), so size things off `SCALE`, not off `W`, and
let horizontal layouts (bars, columns, scrolling scenes) fill `W` naturally.

## Registration (3 edits)

1. Drop the file in `overlay/factories/my-effect.js`.
2. `shared/viz-config.js`: add `'my-effect'` to `ACTIVE_VIZ_NAMES` (an effect that renders
   WebGL is a kit scene, registered as below); add a
   `DEFAULT_PER_VIZ['my-effect'] = { myKnob: 50 }` entry if it
   has knobs — the control panel generates sliders from it automatically (numeric knobs
   are 0–100 unless overridden in `PER_VIZ_MAX`).
3. Add the `<script src="factories/my-effect.js">` tag to all three overlay HTML pages.

`npm run verify` fails if a name/factory-file/defaults entry is missing — run it.

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
made and puts the WebGL context back to its defaults, so the next effect starts clean.
(`thanksgiving-harvest` writes the same wrapper out by hand.)

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

For time in a shader, hand it a phase, never seconds that only grow. A shader's float has 32
bits: after 9 hours of seconds it steps 4 ms at a time, after 36 hours 16 ms, and what it
moves judders. `TimbreScene.phase(seconds, period)` wraps seconds into `0 <= phase <
period` (below one period it is the seconds themselves, to the bit). Choose the period at
which everything the shader makes of the time has come round: `sin(rate * t)` comes round
every `2π / rate`, and several together at the first time that is a whole number of turns
for each (rates of 1.7, 1 and 1.3 come round every 20π). Then the wrap cannot be seen.
`TimbreScene.createClock()` gives a clock of the scene's own, kept as a JavaScript number:
`step(dt)` adds a frame (call it only while the scene is live, if it should stand still
otherwise), `seconds` reads it, `phase(period, rate)` is the phase of `seconds * rate`.
Something that never comes round (a noise) cannot be wrapped unseen. Draw it a second time
at `phase - period`, which is where the next period starts, and mix the two by
`TimbreScene.dissolve(seconds, period, lead)`: 0 until `lead` seconds before the wrap, then
a smooth rise to 1 at the wrap. Winter Aurora does this for its rays; School of Fish and
Sunburst need only the phase.

### The rules

- **A scene is the kit's factory, and makes no renderer.** Register it with
  `TimbreScene.factory`. Never create a `WebGLRenderer` or ask a canvas for a WebGL
  context: every scene draws through the kit's one renderer, and that is what keeps GPU
  memory from growing as effects are switched. `npm run verify` fails if any file under
  `overlay/` but `scene-kit.js` does either, or if `VIZ_USES_3D` and `VIZ_SCENES` do not
  hold the same names. `npm run verify:render` selects every scene in `VIZ_SCENES` twice
  and fails if its count of geometries, textures or shader programs grew ("re-selecting
  <name> does not grow GPU resources"); a new scene is covered without a new check.
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
  redrawn at a fixed rate, not on every call. Something that fires on a peak or a beat
  has its wait before it may fire again counted in seconds too. Prove it with a render
  check that feeds the scene the same sound at two frame rates and compares what it
  reports through `debug()`. Every scene has such checks (search the suite for "30 and 60
  fps" and "30 frames a second").
- **A shader gets a phase, not the time.** Time handed to a shader comes through
  `TimbreScene.phase()` or a `createClock()` (above), wrapped where the shader's waves come
  round, so its float stays small on a source left open for days. Never hand a shader
  `now / 1000` or a clock that only grows.
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
- **Nothing builds up.** The kit draws the scene afresh every frame. The one thing carried
  from frame to frame is the kit's afterglow, which fades. A scene keeps no picture of its
  own (no 2D canvas it paints over and over, no render target it never clears), so nothing
  can pile up to solid over a long stream.
- **Make it once, in `build`.** Geometries, materials, textures, gradients, tables and
  arrays are made in `build` (or when a setting that sizes them changes) and written into
  in `update`. Nothing that could be made once is made every frame. Each scene has a cost
  check in `npm run verify:render` that it must stay under: `draw()` averaged over many
  frames, a few milliseconds of script time (search the suite for "draw() averages
  under"). Give a new scene one, taken at the settings where it does the most work.
- **Every setting changes the picture.** Give each key the scene lists in
  `DEFAULT_PER_VIZ` a render check that shows the picture, or the state `debug()`
  reports, differs between two values of it.
- **Read the sound in one place.** The kit hands `update` the level and the beat
  (`audio`, above); both come from the sampler's `micBands` (its `level` times Gain, and
  its count of beats). A new scene that wants more reads `micBands.bass`, `mid` and
  `treble`, or the log bands in `frequencies`, through one small function of its own
  module. The scenes built before the log bands read `slices` that way, as
  `loudness(bins, band, gain)` in `overlay/rose.js` does: wherever the notes on a scene
  below say "bins" or "the eight lowest bins", they mean the slices. The chladni plate
  and the phosphor read the log bands that way (`loudness(frequencies, band, gain)`). Do not paste the
  `bandAverage` helper of the older 2D effects into a scene.

### Scene placement

Every kit scene gets the **Scene placement** group in the control panel: Left-right and
Up-down (-100 to 100, percent of the half frame) and Size % (40 to 200). They are the
`placement` object in the config (`PLACEMENT_RANGES` in `shared/viz-config.js` is the
schema) and apply live through the camera, without rebuilding the scene.

### Registering a scene

The same three edits as any effect (above), plus the id in two more lists in
`shared/viz-config.js`:

1. Add the id to `VIZ_SCENES`, the list of kit scenes (it shows the Scene placement
   group for the effect), and to `VIZ_USES_3D`, the list of every WebGL effect (it shows
   the WebGL canvas). The two lists must hold the same names. `ACTIVE_VIZ_NAMES` and
   `DEFAULT_PER_VIZ` work as usual.
2. Add the scene's `<script>` tag to all three overlay pages, after `scene-kit.js` and
   `scene-parts.js`, which the pages already load before the factories.

If an id no longer says what the effect is, give it a display name in `VIZ_LABELS`
(`shared/viz-config.js`): the control panel lists the effect by that name. The id stays, so
saved configs and Streamer.bot actions keep working.

For tests, `TimbreScene.testLevel = 0.8` replaces the mic level (`null` restores it),
`TimbreScene.testClock = 129600` starts the next `createClock()` that many seconds on
(`null` restores it), and `TimbreScene.debug()` returns the live scene's render scale, GPU
resource counts, the camera's position and its own `debug()` state.

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
  `frequencies` is the 32 log bands; low and high are `heard('low', …)` and `heard('high', …)` of their
  three wide bands, times Gain, held to 1.
- `wide(bands)`, `heard(which, bands)`, `HEARD`, `bandMean(values, from, to)`, `spreadRange(i, count, n)`,
  `spread(values, i, count)`: the re-mapped readers and the bar spread ("The sound", above).
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
- **The sound.** How tall the traces stand, and the lift on a beat, come from the scene
  kit's level and beat. The shape of a trace comes from ten bands, each one sine across the
  width: `waves(b)` is how many waves band `b` has, `pace(b)` how fast it runs along the
  trace (odd bands the other way) and `weight(b)` how much it counts. The ten bands are
  runs of the sampler's log bands, one run after another from log band 4 (`FIRST`), each
  as many log bands as `RUNS` says: 4-5, 6-7 and 8-9 (116 to 314 Hz, where a voice's pitch
  and the note an octave above it are), then seven runs of three, up to log band 30
  (10.2 kHz). `runOf(b)` is band `b`'s run, and `loudness(bands, band, gain)` reads a
  band: the mean of its run, times 0.96 (`BAND_GAIN`), times Gain, held to 1. Log bands
  0 to 3 (60 to 116 Hz) and 31 are in no band; what sounds there still raises the traces,
  through the level. Before, band `b` was slice `b`, 750 Hz wide, and every voice drew
  much the same wave. The runs and the 0.96 were fitted on the recorded sounds of
  `tools/compare-input.mjs`, against the build that read the slices:
  - The bands' total (each band times its weight, added: the sum in `shape()`) is within
    a tenth of what it was under both voices: 8.8% more under the voice at 150 Hz, 8.1%
    less under the one at 220 Hz.
  - Five of the ten bands carry a tenth or more of that total under each voice, as five
    did before.
  - The two voices give different mixes: the first band has 0.196 of the total under the
    voice at 150 Hz and 0.089 under the one at 220 Hz (before: 0.201 and 0.188, and no
    band's share differed by more than 0.015).
  - Under the rising tone the loudest band goes from the first to the last, never back.
  - A band moves 0.96 and 0.92 times as far in a second under the two voices as it did
    (1.22 times under the kick, 0.80 under the band).
  With the runs starting at 60 Hz (log bands 0 to 28 in threes) the two voices' shares
  differed by 0.093 at most, and by less with the runs ending lower, which is why the
  first run starts at 116 Hz. To see what a change to any of this does, run
  `node tools/compare-input.mjs --ref <git ref> --steps record,state --only phosphor --watch now,flame,kick,stands,heard --signals speech,speech220,kick,music,sweep --idle 60 --frames`:
  `now` is the ten bands as the scene follows them, and the others are what sets the
  heights, which must stay the same on every frame.
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
  what a band pretends to hear with the mic off: Idle animation feeds the ten bands itself and
  reads no log band, so it draws what it drew before the bands moved (`npm run verify` holds
  a minute of it to the old arithmetic).
- **The scene.** `definition()` returns the kit scene definition: the slices and the
  traces. It keeps the voice in eleven of the kit's histories
  (`TimbreScene.createHistory(56, 24)`): one for the loudness and one for each band. A band
  is followed before it is kept (up at 20 a second, down at 8), because the log bands are read
  only 30 times a second and a trace drawn straight from them changes shape in steps.

All its timing comes from `dt`. The arithmetic touches nothing at load, and the file must stay
loadable under Node, because `npm run verify` imports it; the scene looks up `THREE`,
`TimbreScene`, `document` and the core.js globals only when it is built. It must be loaded
after `scene-kit.js` and before the factories.

Worth knowing before building another effect on the waveform: the `waveform` Timbre captures
is 64 samples, about a thousandth of a second, which is a fragment of one cycle of a voice.
It jitters from one reading to the next and cannot show a whole wave. This effect draws its
trace from the log bands instead. And nothing in this deck moves from place to place,
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
- **The sound.** The level and the beat (the shake and the throws) come from the scene kit.
  The tone, which picks the figure, comes from the log bands: `toneOf(bands)` is where the
  sound's weight sits among the 12 lowest (`BANDS`: 60 to 438 Hz, where a voice's pitch and
  the note an octave above it are), each band weighing as its square, so the bands that
  sound decide it and hiss under them does not. `centreOf(bands, count, gain)` is that
  place as a band number; the tone is 0 with it at band 3 (`TONE_LOW`) and 1 at band 9
  (`TONE_LOW + TONE_SPAN`), or -1 with too little sound in those bands to tell (the figure
  is then kept). Gain says how loud the microphone is, so it counts in that one test (the
  squares, times Gain squared, must come to more than 0.02) and nowhere else: the bands
  are weighed as the sampler gives them, and a voice asks for the same figure at any Gain. What sounds above 438 Hz, the vowels and an "s", does not count, so the
  tone goes by the pitch and not by what is being said. The two constants were fitted on
  the recorded sounds of `tools/compare-input.mjs`: the voice at 150 Hz sits in the middle
  of the sixth figure's tenth of the tone (0.55) and the voice at 220 Hz in the middle of
  the eighth's (0.74), the band at 0.37 and the kick between 0.05 and 0.2, and the rising
  tone asks for all ten figures in turn. Before, the tone was weighed over slices 0 to 15,
  where both voices read 0.99 and asked for the last figure. To see what a change to any
  of this does, run
  `node tools/compare-input.mjs --ref <git ref> --steps record,state --only chladni --watch tone,want,figure --signals speech,speech220,kick,music,sweep`.
  `meanOf(...)` is the running mean the scene takes of the tone over a phrase's first tenth
  of a second. `wantFigure(tone)` is the figure a tone asks for, and
  `heldFigure(tone, was)` the figure the mic's tone asks for given the one it asked for
  last: the same one until the tone is 0.4 of a figure (`EDGE`) past its edge, either way,
  so a voice whose tone lies on the edge between two figures does not go back and forth
  between them. 0.4 is the least of the margins tried (0, 0.2, 0.3, 0.4, 0.5) at which the
  recorded voices at 260 and 300 Hz, whose tones lie on an edge, stop going back and
  forth, at Gain 1, 1.5 and 2; the rising tone still asks for all ten figures. (The voice
  at 90 Hz moves its tone by more than a figure, and still changes three times in six
  seconds.) Idle animation's
  tone is taken as it is, by `wantFigure`. `voice()` is what the plate remembers
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
  `idle(b, t)` is what one of 16 pretended bands hears with the mic off, and `idleTone(t)`
  the tone of those bands (0 with their weight at 0.4, 1 at 3: `IDLE_LOW`, `IDLE_SPAN`).
  They are the bands and the tone the plate had before it heard the log bands, kept so
  that Idle animation draws the same figures at the same moments as it did;
  `npm run verify` holds a minute of it to the old arithmetic, frame by frame.
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

**A spike, not a release: the pitch of the voice chooses the droplet that leads.** The
bands still come from `slices`. The scene kit's `createPitch(8)` reads the voice's pitch
from the 12 lowest log bands (`frequencies`), the same at every Gain, and holds one of the
eight droplets for it: a low voice a low band's droplet, a high voice a high band's. That
droplet goes by the loudest band instead of its own (`lifted`) and a quarter further
(`reach(band, kick, lead)`, `LEAD_REACH`), its neighbours a little (`leadOf`,
`LEAD_WIDTH`), and none past `FURTHEST`, which is as far as a droplet went before. The pitch
counts only as far as it is clear (`clearOf` in the kit: the sound must have a voice's
vowels and must not lie evenly over every band), and comes and goes over about a second.
With no clear pitch (a drum, a band, silence, Idle animation) the scene is as it was.

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

## The ink (`TimbreInk`)

**A spike, not a release: the pitch of the voice chooses the pour that leads.** The bands
still come from `slices`. The scene kit's `createPitch(8)` reads the voice's pitch from the
12 lowest log bands (`frequencies`), the same at every Gain, and holds one of the eight
pours for it: a low voice at one end of the tank, a high voice at the other.
`leadRates(rate, at, clear)` then shares the ink out anew: the pour at the pitch's place
keeps all of its ink, its neighbours about half and the rest `LEAD_FLOOR` of theirs
(`leadWeight`, a bump `LEAD_WIDTH` pours wide), and all are scaled so that together they
pour what they did, so the budget holds as before. The pitch counts only as far as it is
clear (`clearOf` in the kit: the sound must have a voice's vowels and must not lie evenly
over every band), and comes and goes over about a second. With no clear pitch (a drum, a
band, silence, Idle animation) the scene is as it was.

`overlay/ink.js` is the Ink effect, as `globalThis.TimbreInk`: coloured ink poured into a
glass tank of water, as thousands of small soft specks. `factories/ink.js` is one line,
`VIZ_FACTORIES['ink'] = TimbreScene.factory(() => TimbreInk.definition())`. It offers:

- **The sound.** `loudness(bins, band, gain)` reads one of the eight lowest bins,
  `idle(b, t)` is what a band pretends to hear with the mic off, and `settle(v)` makes
  nothing of a level within a ten-thousandth of nothing.
- **Pouring.** `placeOf(out, b, clock)` is where band `b` pours, `pourRate(level, share)`
  how many specks a second, `pourShare(total, count)` the share of that the bands may pour
  when together they ask for more than the specks can hold, `speckCount(density)` how many
  specks there are and `shareOf(count)` their share of the most.
- **The water.** `strengthOf(flame, swirl)` is how strong the currents are and
  `current(out, x, y, z, t, strength)` the current at a place and time. `tabulate(tab, t)`
  and `flow(out, tab, x, y, z, strength)` are the same current read from tables, which is
  what the ink uses.
  `nearGlass(out, x, y, z)` is how much of it is left near the glass, the floor and the
  surface, and `fromGlass(out, x, y, z)` how fast those turn ink back. `twistOf(whirl, n)`
  is a beat's twist and `whirlAfter(whirl, dt)` how it dies away.
- **The ink.** `createInk(n, seed)` makes room for the specks, `pour(ink, count, b, level,
  clock, colour)` pours one, and `stepInk(ink, count, h, clock, strength, whirl)` moves
  them all a step; `stepsFor(dt)` is how many steps a frame takes. `lookFor(out, share)`
  and `lookOf(out, age, size, k)` are a speck's size and how much it covers, `litOf(y)` how
  lit it is, and
  `measure(ink, count)` says where the ink is, for the checks.
- **The tank.** `glassOf(glass, flame, kick)` and `surfaceOf(glass, flame, kick)` are how
  bright the glass and the water's surface are drawn, and `pxOf(height, zoom)` how many
  pixels a unit is, one unit from the camera.
- **The scene.** `GLASS_VERT`, `GLASS_FRAG` and `SURFACE_FRAG` draw the glass and the
  surface in added light; `INK_VERT` and `INK_FRAG` draw a speck as a soft disc that
  covers what is behind it. `definition()` returns the kit scene definition.

All its timing comes from `dt`. The arithmetic touches nothing at load, and the file must
stay loadable under Node, because `npm run verify` imports it; the scene looks up `THREE`,
`TimbreScene` and the core.js globals only when it is built. It must be loaded after
`scene-kit.js` and before the factories.

Worth knowing before drawing another thing that is not light:

- The kit draws light by adding it, and a scene's solid things by covering. Pigment is a
  third kind: a material that is `transparent` with three.js's usual blending and no depth
  writing covers what is behind it by its alpha, and the kit's picture carries that alpha
  out to the page, so it shows over a bright backdrop. But the kit's last pass was made
  for light and for solid things, and treats what is in between as partly light: thin
  pigment comes out brighter than a pigment would be, and in the bands along the picture's
  edges where the kit dims light, see-through pigment is darkened but still covers. Keep
  pigment out of those bands (the bottom fifth, the top tenth, a seventh at each side):
  this scene's frame is taller than its tank for that.
- Light that should lie over pigment must be drawn after it, and light behind it before:
  give the meshes a `renderOrder`. Left alone, three.js draws in the order things were
  made, and the tank's near edges were hidden by the ink behind them.
- A ring of specks that gives each new one the oldest place needs a budget. If more is
  poured in a speck's lifetime than there are specks, each is poured over while it is
  still there: here loud music cut every speck off at four seconds of its eight and a
  half, when it showed most. `pourShare` holds the pour to what the ring can hold.
- Nine sines for each of 30,000 specks, each step, was most of this scene's cost. Each
  wave of the current runs along one direction only, so it is worked out at 513 places
  along that side of the tank once a step, and a speck reads between the two nearest.
- A current that is worked out and not simulated can still be one that neither gathers nor
  thins what it carries: make each of its three parts independent of its own direction.
  But a wall breaks that. If the current only dies away at the glass, whatever reaches
  the glass stays on it and gathers where the currents along it meet (the first build
  had a tenth of its ink in a heap on the floor, and at a high Swirl a third of it in the
  tank's upright edges). The glass, the floor and the surface each turn ink back
  (`fromGlass`), and harder the stronger the current is. A check for it must be run at
  several strengths and timings: one run passed by the luck of when its beats fell.
- A thing with an age must be nothing at the end of its life and after it, not a number
  that is not one. A speck a frame older than its life had `pow(negative, 1.5)` for its
  cover in the spike, and the GPU drew square holes in the ink with it.
- Soft specks read as dots unless each is thickest in its middle, thins smoothly to
  nothing at its rim, and is wide enough to lie over its neighbours.
- A point's size is in pixels of the picture the kit draws into, which on a small page is
  several times the page, and the Scene Size slider is the camera's zoom: `pxOf` takes
  both.

## The shards (`TimbreShards`)

`overlay/shards.js` is the Shards effect, as `globalThis.TimbreShards`: a broken pane of
mirror glass that the sound opens up. `factories/shards.js` is one line,
`VIZ_FACTORIES['shards'] = TimbreScene.factory(() => TimbreShards.definition())`. It offers:

- **The cracks.** `spokesFor(density)` and `ringsFor(density)` say how many cracks run
  outward from the point of impact and how many rings cross them; `edgeAt(angle)` is how
  far the pane's edge is from that point in a direction; `crack(spokes, rings, seed)`
  gives the shards, each a polygon of three or four corners, which together fill the pane
  exactly.
- **The pane.** `createPane(density, seed)` gives every shard its middle, its distance and
  direction from the point of impact, the band its sector listens to, numbers of its own
  (how far it lifts and tips, a lean, a twist, how it lies at rest), and its corners as a
  small prism: a top (the mirror), a back and a cut side along each edge. `COUNT_MIN` and
  `COUNT_MAX` are how many shards the coarsest and the finest pane have (91 and 545; 280
  at the usual Density).
- **The sound.** `loudness(bins, band, gain)` reads one of the eight lowest bins, and
  hears nothing of one quieter than `QUIET` (0.08); `idle(b, t)` is what a band pretends
  to hear with the mic off, and `settle(v)` makes nothing of a level within a
  ten-thousandth of nothing.
- **Opening.** `amountOf(bloom)` is what the Bloom setting makes of every opening;
  `delayOf(d)` and `beatDelayOf(d)` are how long the voice's ripple and a beat's ring take
  to reach a shard; `openOf(voice, band, beat, amount)` is how far open a shard is, and
  `openAll(out, pane, voice, bands, beat, amount)` that for every shard, from what is
  remembered of the sound (the kit's `createHistory`).
- **Placing.** `poseOf(out, pane, i, e)` is where an opening puts a shard (its move, and
  its one turn), and `place(pane, open, pos, norm, shown)` every corner of every shard and
  the way it faces. `measure(pane, pos)` is the box they lie in, for the checks.
- **The light behind.** `glowOf(out, flame, kick)` is how bright and how wide it is.
- **The scene.** `MIRROR_VERT` and `MIRROR_FRAG` draw a shard, solid; `GLOW_VERT` and
  `GLOW_FRAG` draw the light behind the pane, in added light. `definition()` returns the
  kit scene definition.

All its timing comes from `dt`. The arithmetic touches nothing at load, and the file must
stay loadable under Node, because `npm run verify` imports it; the scene looks up `THREE`,
`TimbreScene` and the core.js globals only when it is built. It must be loaded after
`scene-kit.js` and before the factories.

Worth knowing before drawing another thing made of many solid pieces:

- A few hundred pieces that each move and turn on their own are cheapest as one mesh
  whose corners the arithmetic places each frame: the finest pane's 11,000 corners cost
  about a third of a millisecond, need one draw call, and can be checked under Node to
  the last corner. The buffers are made once for the most pieces there can be; breaking
  the pane anew only fills them again and changes how much is drawn, and it is broken
  anew only when Density asks for other cracks (there are 27 different panes).
- A flat mirror that shows a smooth sky reads as coloured paper. What makes it a mirror is
  something in the sky with edges (here, long soft lights), so that each piece shows its
  own part of it and the parts do not line up across a crack. No piece lies quite flat,
  even at rest, for the same reason.
- A piece that turns far enough shows its back. Holding its lean from the pane to
  `TILT_MAX` is not enough to prevent that: the pane is turned, the camera sees its far
  side at an angle, and the camera sways, so with the camera swung to the right a shard
  wide open on the left is seen from behind (the first build drew backs all but dark, and
  at the widest opening a few of every hundred pixels of the pane went black). So a
  shard's back is the same mirror as its top. A mirror looks the same from either side
  of edge-on, so nothing jumps as a shard tips through it.
- A band of the sound that is never quite silent (a room's hiss) would hold its sectors a
  little open for good, and the lights in the mirror make much of a small tilt. A band
  quieter than `QUIET` is not heard at all, as in the ink.
- What moves toward the camera grows in the picture. The frame is sized for the widest
  opening as the camera sees it, not for the box the pieces lie in: the check projects
  every corner from where the kit puts the camera, on each page and at the furthest the
  camera sways.
- A picture of many small mirrors is hard to check by its totals: how much of it is
  covered and how bright it is on average hardly change when the sky they show is wrong.
  The checks here read it two more ways. The shards' mean colour in each of 48 cells of
  the box they lie in is compared with what was measured, for the shut pane and for an
  open one (`PANE_GRID`, `OPEN_GRID` in `verify-render.mjs`: measure them again after any
  change to the look). And the scene tells the checks how the pane stands and how the
  camera saw the last frame (`world`, `view`, `proj` in its `debug()`), so a check can
  find the pixel in the middle of one shard's mirror, or of one of its cut sides, and
  say what colour it is.
- The cracks are a tiling: the shards are cut from one set of corners, so they fill the
  pane exactly (where a crack stops halfway along a neighbour's edge the two still meet).
  The checks add up the shards' areas and want the pane's, for every pane there is, and
  want every one of a few thousand places in the pane to lie in one shard and no more. A
  shard is drawn a little smaller than its polygon, so the cracks show and the light
  behind leaks through.

## The jelly (`TimbreJelly`)

`overlay/jelly.js` is the Jelly effect, as `globalThis.TimbreJelly`: a rounded cube of clear
jelly, set in four layers of the palette's colours, that wobbles as a soft body and that a
thump of the mic knocks apart into its layers. `factories/jelly.js` is one line,
`VIZ_FACTORIES['jelly'] = TimbreScene.factory(() => TimbreJelly.definition())`. It offers:

- **The sound and the settings.** `loudness(bins, band, gain)` reads one of the eight lowest
  bins; `idle(b, t)` is what a band pretends to hear with the mic off; `settle(v)` makes
  nothing of a level within a ten-thousandth of nothing. `firmOf(stiffness)` is how firm the
  jelly is: half as firm at Stiffness 0, twice at 100, and 50 for anything that is not a number.
- **The shape.** `rounded(out, x, y, z)` draws a point of a cube in onto the rounded cube
  (the fifth powers of its three numbers add up to 1). `skin(n)` is its skin, `n` squares
  along an edge: one closed sheet, every point shared by the squares round it, every
  triangle facing out. `normalsOf(pos, index, norm)` finds the way each point faces from
  the triangles round it. `layerOf(y)` is the layer at a height of the resting cube, as the
  number of its colour, and between two numbers in the narrow band where two layers meet;
  `slabOf(y)`, `slabAt(i)` and `slabWide(i)` are the slab a height belongs to, the height of
  a slab's middle and how wide the cube is there. `bubblesAt(seed)` is where its 46 bubbles are.
- **The body.** `createBody()` is a lattice of 9 x 9 x 9 points filling the cube: how far
  each is from its place (`u`) and how fast it is going (`vel`). `pull(body, bands, firm)`
  sets what the bands pull with: each on its own corner (`CORNER`), outward, by as much as
  it is louder than `QUIET` (0.06). `slapAt(out, n)` is where the nth beat slaps it and
  `slap(body, n)` the slap. `stepBody(body, firm, lift)` is one step of `STEP` (1/240 s):
  each point is drawn toward where its neighbours are, toward the lift of the middle by a
  spring that is hard at the middle and all but gone 0.8 out, and slowed, the more the
  faster it moves against its neighbours. `advance(body, dt, firm, lift)` takes as many
  whole steps as have come due (at most `STEPS_MAX`), carries the rest to the next frame,
  and puts a body that has all but stopped exactly at rest when nothing pulls it.
  `atRest(body)`, `calm(body)` and `land(body)` ask whether it is at rest, put it there, and
  put it there moving down at its top, as the last slab's landing leaves it.
- **The skin.** `locate(cells, fracs, at, x, y, z)` finds where in the lattice a point of the
  resting cube lies; `sample` and `sampleOne` read a field there, evenly between the
  lattice's points. `shape(pos, lit, body, home, cells, fracs, q, gain)` puts points where
  the body has them, squashed by `q` (`shownSquash`, `wideFor`: flatter is wider by as much
  as keeps the volume), says how fast the body is moving at each, and returns how far the
  furthest is from the middle. `measure(body)` comes first: it finds how fast each point of
  the body is going. The cube's skin and its bubbles are both drawn this way.
- **A spring let go.** `spring(sw, dt, rate, damp, to)` is where a spring would be `dt` on,
  not a step toward it, so two half steps are one whole. The body's squash, each slab's
  flight, its turning, its own squash and its flapping are all this.
- **The slabs.** `createSlabs()` is the four slabs in flight. `throwSlabs(sl, strength,
  random, fresh)` gives each a place to make for and a push; `flySlabs(sl, dt)` is the
  flight; `wobbleSlabs(sl, dt, rise, bands, firm)` is each slab's own squash and flap, in the
  air or on the stack; `showSlabs(sl, clock)` is where each is drawn (never further than
  `FLY_MAX` from where it sat, and swaying once it is loose). `startBack`, `backShare(u, i)`,
  `placeSlabs(sl, u, clock)` and `plop(sl, i)` are the way back: from the bottom up, each
  speeding up into a landing that shakes the slabs beneath it; `landAll(sl)` counts as landed
  any slab still in the air when the cube sets. `resumeSlabs` takes flight up
  again from where the slabs are drawn; `homeSlabs` puts them away. `bent(out, x, y, z, q,
  bend)` is a point of a slab squashed and bent, as the slab's shader does it;
  `slabPoint(out, sl, i, x, y, z)` is where a point of a slab is drawn; `slabHalf` and
  `reachOf(sl)` say how far anything of the slabs can be from the middle.
- **Room.** `limitFor(enlarged)`, `roomFor(reach, limit)` and `zoomAfter(zoom, room, dt)`:
  nothing is drawn further than `ROOM` (2) from the middle, whole or apart; less by as much
  as the Scene Size slider enlarges the picture, but never less than the cube at rest takes
  (`WHOLE`), so a picture enlarged past about 140% no longer holds all of the cube. It is
  drawn smaller at once and grows back slowly.
- **Camera and light.** `turnAt(out, clock)`, `orbitAt(t, drift)`, `glowOf(out, flame, kick,
  flash)`, `flareOf(kick, flash)`, `pxOf(height, zoom)`.
- `definition()`: the scene, for `TimbreScene.factory()`.

Things worth knowing:

- The jelly is a solid you can see through, drawn with ordinary blending and no depth test,
  in a fixed order: its far side, its bubbles (these are light), its near side. Apart, the
  slabs are put in order each frame, the furthest from the camera first, each with its own
  bubbles between its two sides.
- The body is the only thing here that is stepped and not worked out exactly, so it is
  stepped in fixed steps whatever the frame rate. The same pull, slap and lift give the same
  body at 30, 60 and 120 frames a second to the last digit; with real sound the bands are
  read once a frame, so two frame rates differ a little, and the check allows 0.02.
- The body is held softly, not pinned: a band that pulls a corner draws the middle after it
  by a little under a third of the corner's move.
- A firmer body is pulled harder (by the square root of how firm), or Stiffness 100 would
  show half of the movement instead of 0.7 of it.
- The scene's `debug()` gives its long lists (`points`, `facing`, `stirred`, `bubbles`,
  `bubbleLit`, `bubbleHome`, `lattice`) only when one is asked for by name; they are not
  among its own keys, so reading the whole state every frame stays cheap.
- The checks make the body again from the arithmetic beside the scene, frame for frame,
  while the cube is whole (`remade`), and work out again what is drawn from the slabs'
  flight while it is apart (`reworked`).
- The slabs are rounded tiles of their own. Stacked, they are not the cube's skin point for
  point; the knock and the last landing hide the change.
- A step of the body moves every point by where the others were at the start of the step.
  Taking the points one after another, each seeing the ones before it already moved, lets a
  body that is pulled evenly drift out of its symmetry.
- The scene's `debug()` also gives `world`, `view` and `proj`: how the cube stands and how
  the camera saw the last frame. The checks carry every point of the skin, or of the four
  slabs as the arithmetic bends, squashes and turns them, to the canvas with these, and want
  the box they lie in to be the box the GPU drew, to within `BOX_GAP` pixels. That is what
  holds the slab's shader to `bent()`.

## The school of fish (`TimbreSchool`)

`overlay/school-of-fish.js` is the School of Fish effect, as `globalThis.TimbreSchool`: a few
hundred fish that flock for real, mill as a ball, a ring or a column, and bolt apart on a
thump of the mic. `factories/school-of-fish.js` is one line,
`VIZ_FACTORIES['school-of-fish'] = TimbreScene.factory(() => TimbreSchool.definition())`. The
control panel shows it as "School of Fish" (`VIZ_LABELS`). It offers:

- **The sound and the settings.** `loudness(bins, band, gain)`, `idle(b, t)` and `settle(v)`
  as the jelly has them. `countFor(density)` is how many fish there are: 96 at Density 0, 288
  at 50, 480 at 100, always the same number to each of the eight bands, and 50 for anything
  that is not a number.
- **One fish.** `fishShape()` is its points, the way each faces and its triangles, nose toward
  +x and back toward +y: a body of rings that closes at the nose, a forked tail and a fin on
  its back. The tail and the fin are flat and marked as fins.
- **The school.** `createSchool(seed)` is every fish there can be (`FISH_MAX`, 480): where it
  is (`p`), the way it heads (`d`), how fast it swims (`sp`), its size and band (fish `i`
  listens to band `i % 8`; the low bands are the big fish), its own tilted round of the ball
  (`axis`, `shell`) and its place in the ring and in the column (`off`, `off2`, `high`). It
  starts as a ball. Only the first `n` fish are stepped and drawn; `join(sc, from, to)` puts
  fish that come in when Density is raised beside fish already there, of their own band.
- **Steering.** `steer(out, sc, i, form, tight, loud)` is where the school wants fish `i` to
  swim: round with the rest, and toward its own place in the shape (`FORMS`: ball, ring,
  column; each leans toward the viewer by `LEAN`). It returns how far the fish is from that
  place. `flock(out, sc, n, i, whole, flame, gain)` is what the fish within `NEAR` (0.46) do
  to it: it is drawn toward them, turned the way they swim, and pushed off any that is too
  close. `wantOf(size, gain, hurry, flame, loud, dart)` is how fast it wants to swim.
- **Steps.** `stepSchool(sc, n, how)` is one step of `STEP` (1/60 s): each fish turns a
  little toward where it is steered, its speed goes toward the speed it wants, it moves, and
  its tail beats faster the faster it swims. `advance(sc, n, dt, how)` takes a step once half
  of it has come due, `STEPS_MAX` (6) at most in a frame, and forgets the rest; each step
  also remembers the syllable for the shimmer and steps the bubbles. `sc.left` is then how
  far the school is behind its steps, or ahead of them.
- **The fright.** `bolt(sc, n, strength, random, fresh)` sends each fish a share of the way
  to the edge of an egg-shaped space (`EGG`), away from the middle of the school, and gives
  it the speed that gets it there in a dash; `toEdge(sc, i)` is how far that edge is. A fish
  caught outside the egg bolts back in. Where a fish ends up is its `home`: alone, it loiters
  there (`wander`, `loiterTo`). `nextForm(form)` is the shape the school comes back as.
- **The shimmer.** `pulseOf(flame, trail)` is a syllable: how much louder it has just become.
  `roundOf(sc, i, form)` is how far round the school a fish is, and `heard(sc, round)` what
  it hears of the shimmer now: the syllable of that share of `ROUND_S` (0.7 s) ago, fainter
  the further round. `dress(A, B, sc, n, how)` is what each fish is sent to be drawn with:
  its size, its tail's beat, how far it has rolled onto its side, its band, its flash, its
  glow, how wide its tail swings, and how far on along its way to draw it (`lead`, which is
  `sc.left`): a fish is drawn where it will be, or was, between two steps.
- **The bubbles.** `createBubbles(seed)` and `stepBubbles(b, sc, n, pulse)`: bubbles leave
  the school from where a fish is, as fast as the syllable is loud, rise for `BUBBLE_S`
  (2.6 s) and are put away.
- **Room.** `needOf(sc, n, sway)` is the share of the frame the school needs: the furthest
  any fish reaches, tail and all, as the swaying camera sees it. `roomFor(need, enlarged)`
  and `zoomAfter(zoom, room, dt)`: needing more than `FILL` (0.96) of the frame, or enlarged
  by the Scene Size slider, it is drawn smaller at once, and grows back slowly.
- **Camera.** `orbitAt(t, drift)`, `swayFor(drift)`, `pxOf(height, zoom)`.
- `definition()`: the scene, for `TimbreScene.factory()`.

Things worth knowing:

- The fish are solid, drawn with the depth buffer, so they show over a bright backdrop as
  well as a dark one, and one fish hides another properly. The bubbles are light.
- All the fish are one instanced mesh. Where each is, the way it heads and the eight numbers
  `dress` makes for it are sent every frame; the vertex shader bends the fish into its
  swimming wave, rolls it and places it.
- The school is the only thing here that is stepped and not worked out exactly, so it is
  stepped in fixed steps whatever the frame rate: the same sound gives the same school, fish
  for fish, at 30, 60 and 120 frames a second. Frames never come exactly on time, so a step is
  taken once half of it has come due: a frame a little early or late is then still one step
  at 60 frames a second (two at 30), where a step taken only when all of it had come due
  would be none and then two, and the fish would judder. What is left over moves each fish
  along its way as it is drawn. Each fish looks at every other each step, so a step costs
  the square of the number of fish: a little over a millisecond at Density 100.
- With the mic and Idle animation both off no step is taken: the fish stop where they are.
  No time passes for the fright either, so a scattered school stays scattered, and streams
  back only once the mic has been on for the rest of the calm wait.
- Nothing comes from `Math.random`. A thump scatters the fish by the number of the thump, so
  the same thump scatters the same school the same way.
- When the school bolts and when it regroups is `TimbreHelix.createShatter`'s machine, as for
  DNA, Glass Prism and Jelly; Fright sensitivity and Regroup seconds are its two settings
  under names that fit fish. The shape it comes back as is the one after the shape it last
  was as a whole school, however often it was frightened on the way back.
- Fish streaming back hurry only while they are far from their place, so they do not overshoot
  it. For a moment on the way back the school can still need more than the frame, and is
  drawn smaller for it.

## The boids (`TimbreBoids`)

`overlay/boids.js` is the Boids effect, as `globalThis.TimbreBoids`: birds that sit in rows
on three wires, fly up as a flock with the voice, land in a pause, and are flushed by a thump
of the mic. `factories/boids.js` is one line,
`VIZ_FACTORIES['boids'] = TimbreScene.factory(() => TimbreBoids.definition())`. It follows the
school of fish closely. It offers:

- **The sound and the settings.** `loudness` and `settle` as the jelly has them.
  `countFor(density)` is how many birds there are: 36 at Density 0, 60 at 50, 84 at 100, the
  same number to each wire. `spreadFor(cohesion)` is how wide of the lead the birds' places
  are: twice as wide at Cohesion 0, half as wide at 100. `callOf(band, flame)` is a bird's
  call: its band (and a quarter more) or seven tenths of the voice, whichever is louder.
  `pulseOf(flame, trail)` is a syllable. `idle(band, t)` is a band with the mic off and Idle
  animation on: each swells for about a third of the time, to a quarter at most.
- **One bird.** `birdShape()`: a body with a head, closed at both ends, a tail, a beak and two
  wings, beak toward +x and back toward +y. Each point's `wing` says how far out along a
  wing it is (0 for all but the wings), with the sign of its side.
- **The wires.** `wireY(fl, w, x)` is how high wire `w` hangs at `x`: from its two ends
  (`WIRE_Y`), sagging in the middle, a little more for the birds on it (`load`), and swinging
  as a spring (`bounce`). `seatY(fl, i)` is how high a bird sits; `wirePoints(out, fl, w)`
  is the wire as the ribbon it is drawn as.
- **The flock.** `createFlock(seed, n)` is every bird there can be (`BIRDS_MAX`, 84) with
  what is its own: its size, its nerve, how long it stays up after its call, its place by the
  lead and the way it sits. `state` is 0 sitting, 1 flying, 2 coming home. `reseat(fl, n)`
  makes the rows for `n` birds: bird `i` is on wire `i % 3`, in seat `floor(i / 3)` from the
  left, and listens to the band of its stretch of wire. The middle wire's seats are half a
  seat along from the others', so that no bird sits right above another. With less room to a
  seat than a bird needs (`FIT`), every bird is smaller by as much (`fl.fit`: 1 up to 60
  birds, 0.72 at 84). Birds that join sit, birds that sit move to their new seats, and a bird
  in the air flies on.
- **Flying.** `leadAt(out, tau, flame)` is the lead, which wheels above the wires, wider and
  faster the louder it is. `placeOf(out, fl, i, wide, loose)` is a bird's own place: by the
  lead, or, in a fright, its own part of the air; always inside the air (`AIR`, `ROOM`).
  `takeOff(fl, i, hard, random)` sends a sitting bird up, the way it faces and forward, off
  the wires (in a fright, harder and any way), and springs its wire.
  `stepFlock(fl, n, how)` is one step of `STEP` (1/60 s) of the wires and the birds. A
  sitting bird takes off when its call is louder than its nerve, or in a fright. A flying
  bird flies at its cruising speed and steers by turning: toward its place, off any flying
  bird too close, the way the birds near it fly, and back from the edge of its air. It banks
  into its turn and beats harder to climb. `advance(fl, n, dt, how)` takes a step once half
  of it has come due, six at most in a frame; `fl.left` is how far the flock is behind its
  steps, or ahead.
- **Staying in the picture.** `HARD` is all the air there is, an egg a little larger than
  `AIR`: from `HARD_FROM` of the way out a flying bird loses its speed outward, and at the
  edge it has none, so it turns along the edge. However often the birds are frightened, no
  bird and its open wings leave the frame.
- **Among the wires.** A bird leaves by the front and comes home round the back. Until a
  flying bird is clear of the wires (above the top one, or well in front) it flies up and
  away from them on the side it is on (`OFF`), and below the top wire it does not cross them
  (`PANE`). A bird that has heard nothing for its `stay` comes home: over the top wire to
  above and behind its seat, then down and forward onto it, slowing, and `perch` puts it
  exactly there; it folds its wings and turns to sit as it sits over the next second. So it
  comes in flying toward us and pitches up to sit with its breast to us, and it passes no
  bird that sits. One that is called again as it lands, lands first and leaves from its seat.
- **How it is drawn heading.** A bird in the air is drawn turning as a bird turns: round, at
  most `YAW_MAX` radians a second, and up or down, never steeper than `PITCH_MAX`. So it is
  always level about its heading (but for its bank), and never heads straight up, where
  "level" means nothing.
- **The fright.** `fright(fl, n, random)`: every bird is up at once; one that was sitting
  leaves hard, one in the air is thrown off its way. While `how.loose` is set every bird
  stays up, flies faster and makes for its own part of the air.
- **What is drawn.** `dress(A, B, fl, n, how)` is what each bird is sent: its size, where its
  wings are in their beat, its roll, its band, how hard it beats, how folded its wings are,
  and a flash. The ripple of a syllable reaches a flying bird later the further behind the
  lead it is, and rolls it one way or the other.
- **Camera.** `orbitAt(t, drift)`, `swayFor(drift)`.
- `definition()`: the scene, for `TimbreScene.factory()`.

Things worth knowing:

- In silence, with the mic on, every bird ends up sitting, the wires stop swinging, and then
  every number the birds and the wires are drawn with has settled to a fixed value. What
  still moves is not theirs: the palette, which drifts with its own Colour speed, and the
  camera, which sways with Camera drift. (That is why the birds' colours do not drift with
  the clock, as the fish's do.) The checks that say "exactly still" turn both off.
- The voice is the mic's alone. With the mic off and Idle animation on, the kit's own idle
  swell is not heard as a voice: the bands move the birds, and most of them sit.
- The birds are one instanced mesh, solid, drawn with the depth buffer. The wires are thin
  ribbons that fade out toward their ends. They are see-through, so three.js draws them after
  the birds; they test depth and write none.
- The flock is stepped in fixed steps whatever the frame rate, a step coming due at its half,
  and a bird in the air is drawn as far on along its way as the flock is ahead of or behind
  its steps (`uLead`), as the school of fish does it. A step weighs the wires once, as it
  begins, so that every bird that sits through it sits on the same wire.
- With the mic and Idle animation both off no step is taken and no time passes for the
  fright: birds in the air stop where they are.
- Nothing comes from `Math.random`. A thump flushes the birds by the number of the thump.
- When a fright starts and ends is `TimbreHelix.createShatter`'s machine; Fright sensitivity
  and Settle seconds are its two settings under names that fit birds. (The machine waits at
  least 0.3 s of calm, so Settle seconds 0 is that.)
- The scene is made to fill the frame at Scene Size 100. Enlarged past that it is cropped, as
  the landscape scenes are: nothing here is drawn smaller to stay in.
- A folded wing is drawn as nothing: a sitting bird is its body, its tail and its beak.
- A bird's nerve starts at 0.10, so a band that sits at about 0.08 with nobody talking (hum,
  or a noisy room at a high Gain) keeps the boldest birds of its stretch in the air.

## The rose (`TimbreRose`)

`overlay/rose.js` is the Rose effect, as `globalThis.TimbreRose`: one rose, made in code,
that grows thorns and sprouts petals with the voice, and whose petals fly as a flock on a
thump of the mic. `factories/rose.js` is one line,
`VIZ_FACTORIES['rose'] = TimbreScene.factory(() => TimbreRose.definition())`. It follows the
boids closely. It offers:

- **The sound and the settings.** `loudness`, `settle`, `pulseOf` and `idle` as the boids
  have them. `countFor(density)` is how many petals there are: 40 at Density 0, 56 at 50, 72
  at 100. `keptFor(n)` is how many of them are always out (43%: 17, 24, 31).
  `thornFor(thorns)` is how long a thorn grows: nothing at Thorns 0, 0.26 at 50, 0.52 at 100.
  `callOf(band, flame)` is a folded petal's call: its band (and a quarter more) or 0.85 of
  the voice, whichever is louder. `thornCall(band, flame, j)` is how far out thorn `j` wants
  to be: its band, or a loud voice.
- **The stem.** One curve from its foot (`FOOT`) by a bend (`BEND`) to the head (`HEAD`),
  which it runs into the way the head faces. `curve(ro)` sets it from where the head has
  swayed to; `stemAt(ro, t)` is where it is a share `t` of the way up, the way it runs there
  and two directions across it; `stemRadius(t)` is how thick it is.
- **The head.** `createRose(seed, n)` is every petal there can be (`PETALS_MAX`, 72) with
  what is its own. `state` is 0 on the head, 1 flying, 2 coming home. `lay(ro, n)` lays the
  head for `n` petals: petal `i` is the `i`-th from the heart, about 137.5 degrees further
  round than the last, a little longer and wider, and listens to band `i % 8`. The first
  `kept` are out; each of the rest is folded away and has a nerve, greater the nearer the rim.
  `pose(ro)` says where each petal belongs just now: its base, the way it grows, its inner
  face, and how far it wraps round, how deep its cup is and how far its tip rolls back.
- **How far a petal leans out** goes by its rank among the petals now out: its rank over how
  full the head is (`ro.full`, which `fullOf` measures and a step follows). So the outermost
  petals of a small rose open as the outermost of a full one do, and as more unfurl the ones
  inside them stand closer. The inner ranks stand close and only the outer ones open
  (`LEAN`, `LEAN_FROM`): leaning out evenly from heart to rim, it read as a cabbage.
- **A step.** `stepRose(ro, n, how)` is one step of `STEP` (1/60 s). The head sways on its
  stem as a spring, more for a loud voice, and nods when it is knocked. The bloom opens with
  the voice and a little further on a beat. A folded petal whose call is louder than its
  nerve unfurls, stays out for its own time after its last call, and folds away to exactly
  nothing. A thorn follows its call, quickly out and slowly in; with the mic off
  (`how.mic` false) no thorn grows. `advance(ro, n, dt, how)` takes a step once half of it
  has come due, six at most in a frame; `ro.left` is how far the rose is behind its steps.
- **The ripple.** Each step remembers the syllable (`how.pulse`). `rippleAt(ro, ago)` is the
  ripple as it was: a petal `u` of the way to the rim leans out and flashes `WAVE_SPAN * u`
  steps later; a thorn and a leaf answer later the nearer the foot they are (`STEM_WAVE`).
- **The thump.** `scatter(ro, n, strength, random)` throws every petal off the head, out
  from its axis and along it; one already in the air is thrown off its way.
  `gather(ro, n, random)` starts them for home, from the heart outward over `HOME_OVER`
  seconds.
- **Flying.** `leadAt(out, tau, flame)` is the lead, which wheels round the box. A loose petal
  flies at its cruising speed and steers by turning, as a bird does: toward its own place by
  the lead (`placeOf`: to one side of the lead or the other, above or below, and kept inside
  the air: `AIR`, `ROOM`), off any petal too close, and the way the petals near it fly. Far
  from its place it flies faster, at its place slower. A petal is light: thrown faster than it flies, it soon slows (`BRAKE`). It
  heads the way it flies and tumbles about that way; its face is carried along from step to
  step, so it never spins about itself.
- **Staying in the picture.** `HARD` is all the air there is, an egg a little larger than
  `AIR`. From `HARD_FROM` of the way out a loose petal loses its speed outward by degrees;
  what it had along the edge is made up toward the speed it had (by `KEEP` times at most),
  so it turns along the edge and does not rebound. No petal, flying or coming home, passes
  the edge. However often the petals are thrown, none leaves the frame.
- **Coming home.** A petal makes for a point a little way along the way it will grow, then
  for its base, slowing as it comes. Near its place it turns to lie as it will sit, at
  `LAND_TURN` radians a second (`turnTo`). It lands (`perch`) when it is within `LANDED`
  of its place and no faster than `CATCH`; one that passes its place faster flies on and
  comes round. It lands as it is: what is left of its turn it makes on the head, at
  `SEAT_TURN` radians a second, so it is never turned at a stroke. It flashes, stays out a
  moment and then answers to the sound like any other.
- **How loose a petal is drawn** (`ro.loose`) is one number that eases, whatever the petal
  is doing: toward 1 in the air, toward how far it still has to come as it comes home, toward
  0 on the head. Its size (`AWAY`), its flatter shape (`FLAT`) and where its middle is drawn
  all go by it, so none of them changes at a stroke: not when a peak throws a petal that was
  landing, and not when it touches down.
- **What is drawn.** `bladeGrid()` is the one grid a petal, a leaflet and a sepal are drawn
  with. `dress(out, ro, n, look)` is what each is sent: the five sepals, the six leaflets,
  then the petals (its base, the way it grows, its inner face; its length, width, wrap, cup
  and roll; its rank, its flash, how grown and how loose it is). A loose petal is drawn
  `AWAY` of its size, flatter, about its own middle, rocking as it tumbles.
  `stalk(out, ro, look)` is the stem with the heart on its top, the sixteen thorns and the
  two leaf stalks, as one mesh worked out again each frame; `stalkIndex()` is its triangles.
  Each point says what it is: stem 0, the heart 1, a thorn 2. The heart is numbered next to
  the stem it joins, so that what is drawn between them is between green and gold.
  `leafAt(ro, m, flame)` is a leaf; `thornLength(ro, j, long)` how long a thorn is drawn.
- **Camera.** `orbitAt(t, drift)`, `swayFor(drift)`.
- `definition()`: the scene, for `TimbreScene.factory()`.

Things worth knowing:

- There is no model file. The rose that was here before was the wireframe of
  `overlay/assets/rose.stl`, with a group of "3D model" settings of its own
  (`config.stlObject`). Both are gone; a saved config that still has `stlObject` is read as
  before and the key is dropped.
- The head sways a little even in silence, so the picture is not exactly still then; the
  petals, the thorns and the bloom do come to rest (a folded petal and a thorn drawn in are
  exactly 0). With the mic and Idle animation both off no step is taken and the rose does not
  move; the camera's sway and the palette's Colour speed go on, as for every scene.
- The voice is the mic's alone. With the mic off and Idle animation on, the bands swell in
  turn and a few petals open and fold; the kit's own idle swell is not heard as a voice, and
  no thorn grows.
- The petals take the palette's colour (`uPal[0]`, a little further round toward the rim:
  `PETAL_HUES`), and a thorn's tip its band's. The stem, the leaves and the sepals are green
  whatever the palette is, with a little of the palette in it (`GREEN`, `GREEN_PALETTE`), so
  when the palette's colour is green the petals are green too. The heart is gold; it lies low
  under the petals and stands up when the head is bare.
- A blade is shaped in the vertex shader (`blade()` in `BLADE_VERT`): bent across round a
  cylinder, cupped along, its tip rolled back. Its face at a point is worked out there from
  the points beside it. Everything is solid and drawn with the depth buffer, both sides.
- When Density changes the head is laid again: every petal is back on it at once.
- Nothing comes from `Math.random`. A thump throws the petals by the number of the thump.
- When a thump starts and when the petals start for home is `TimbreHelix.createShatter`'s
  machine; Scatter sensitivity and Regather seconds are its two settings under names that
  fit a rose. (The machine waits at least 0.3 s of calm, so Regather seconds 0 is that. It
  calls the rose whole 1.5 s after the petals start for home. They set off over two seconds
  and take a second or so to land, so the last of them land about two seconds after that; a
  peak in that time is a new thump, and throws those that have landed too.)
- The rose is stepped in fixed steps whatever the frame rate, a step coming due at its half,
  and a loose petal is drawn as far on along its way as the rose is ahead of or behind its
  steps. The sound is read once a frame and a thump is taken in the frame that hears it, so
  after a thump the petals are not where they would be at another frame rate; with a steady
  sound and no thump the rose is the same at any.
- The scene is made to fill the frame at Scene Size 100. Enlarged past that it is cropped.

## The Christmas tree (`TimbreTree`)

`overlay/christmas-tree.js` is the Christmas Tree effect, as `globalThis.TimbreTree`: a lit
fir tree in the snow, whose star hears the voice, whose string of lights carries it down the
tree, whose baubles are a spectrum, and which a thump of the mic shakes the snow off.
`factories/christmas-tree.js` is one line,
`VIZ_FACTORIES['christmas-tree'] = TimbreScene.factory(() => TimbreTree.definition())`. It
follows the rose closely. It offers:

- **The sound and the settings.** `loudness`, `settle` and `idle` as the rose has them
  (with the mic off the bands swell in turn, from the lowest up). `countFor(lightDensity)`
  is how many lights are on the string: 48 at 0, 96 at the default of 60, 128 at 100.
  `glowFor(starGlow)` and `snowFor(snowfall)` are shares of the usual: 0 at 0, 1 at 50, 2 at
  100. `levelOf(bands, i)` is what tier `i` hears: its own place among the eight bands,
  between two of them, the lowest at the foot and the highest under the star.
- **The tree's shape.** `TIERS` is the six tiers of boughs, foot to top (how far out the rim
  reaches, how tall, the height of its base). A tier is a skirt with a rim of seven tips
  that hangs a fifth of its height below its base, each tier turned from the one below.
  `rimY(i)` and `rimR(i, phi)` are a rim's height and how far out it is the way `phi` round;
  `tierR(i, y, phi)` is how far out a tier's boughs are at a height (0 above its top and below
  its rim); `surfaceR(y, phi)` is how far out the tree reaches: its boughs, or between one
  rim and the next 0.92 of the line from rim to rim, along which a string hangs.
  `garland(n)` is the string: a spiral down that surface, 0.42 lower each turn, with `n`
  lights evenly along it (`at`, three numbers each, from the tree's foot; `u`, how far along
  the string each is; `wire`, the string's own path; `length`). `baubleSpots()` is the 42
  baubles: each one's tier, the way round it hangs (under a tip), its radius and which of
  seven colours it is. `tierGrid(snow)`, `driftGrid()` and `starPoints()` are the points and
  triangles of a tier (or the snow lying on it), the drift and the star; `driftHeight(x, z)`
  is the drift's height, and `snowAt(x, z)` is where falling snow lands: on the drift, or
  beyond it a little above the unseen ground (`FLOOR`), so that no flake is drawn at the
  bottom edge of the picture.
- **The tree's state.** `createTree(seed, n, snow)` makes a tree with `n` lights and Snowfall's share of the usual
  snow already in the air: what the star
  heard at each of its last 96 steps (`hist`), the star's own level, the lean of the trunk
  and its speed, sideways and toward the viewer (`lean`), how much snow lies on each tier
  (`snow`, 0 to 1) and whether it may lie (`lying`), what each tier hears (`level`), each
  bauble's swing, its speed and its inner light, each light's own twinkle, and every flake
  and clump (`flake`, `flakeV`, `on`). `lay(tr, n)` lays it again whole, as it was made;
  `restring(tr, n)` lays the string alone, which is all that Light density changes.
  `heard(tr, ago)` is what the star heard so many steps ago, between two steps too.
- **The thump.** `shake(tr, strength, random)` pushes the trunk, sets every bauble swinging,
  and makes each tier with snow on it throw clumps (eighteen at most, as many as it has
  snow), outward and down; the snow itself goes a moment later, the top tiers first.
  A clump still in the air from the last shake is left where it is. `resettle(tr)` lets the
  snow settle again; snow that a shake set going is all gone first, however soon that is. The scene calls them when the shatter machine
  says so: `shake` at 1 for a thump and at `JOSTLE` (0.6) for a peak while the tree is bare,
  `resettle` after the calm wait, and `lay` when the page had stopped drawing.
- **The step.** `stepTree(tr, how)` is one step of 1/60 s: the star follows the voice (up
  fast, down slowly) and what it heard is remembered; the trunk and each bauble are springs
  that come to rest; each tier's snow goes or settles; each bauble's inner light follows its
  tier, and a rise in the tier sets it swinging; flakes fall and sway, and one that lands
  starts again at the top while there should be as many (two more at most start in a step);
  clumps fall faster and faster, keep over the drift (`KEEP`), and end at the snow.
  `advance(tr, dt, how)` takes the steps that are due, a step once half of it is due and six
  at most. `how` is the voice (`flame`), a beat (`kick`), beats lately (`burst`), the eight
  bands and Snowfall's share (`snow`).
- **What is drawn.** `dress(out, tr, look)` works out everything that changes: each light's
  level (its twinkle, what the star heard when the voice now at that light was spoken, a
  beat by its own share, and the flicker while the tree rocks), its colour and its glow's
  colour and size; each bauble's place on its string, colour and inner light; where each
  tier's snow is drawn and how much of it; every flake as drawn (smaller to nothing toward
  the sides and the top of its air and as it lands); the star's own light, its glow, its
  rays and the light it throws; and the string's light. `look` gives the string's five
  colours and the baubles' seven (`pal`, `balls`), a beat, and Star glow's share.
- **Between steps.** What moves (the trunk's lean, the baubles, the flakes and the clumps) is
  drawn as far on as the tree is ahead of or behind its steps (`tr.left`), so that it moves
  evenly at 50 or 144 frames a second as at 60.
- **The camera.** `swayFor` and `orbitAt` as the rose has them.

Worth knowing:

- The boughs, the snow, the trunk, the drift, the presents and the star are three.js's own
  lit materials, so the star's light (a point light that casts shadows) and the string's
  (one more, in front of the tree) light them. What is drawn many times over has a small
  shader of its own: a light of the string, its glow (added light, a disc that faces the
  eye), a bauble and a flake. The render suite draws one of each alone to check them.
- With the mic off and Idle animation on, the kit's slow swell stands in for the voice, so
  the star and the string breathe; a beat and a thump are the mic's alone. With the mic and
  Idle animation off no step is taken: the snow hangs in the air.
- The string's lights are sent where they are only when the string is laid; everything else
  that is sent is sent every frame.
- Clumps of snow fall straight through the boughs below them, and the lowest boughs reach a
  little past the drift at the front.

## When Streamer.bot is away (the `offline` class)

An overlay shows nothing special on air when its connection to Streamer.bot is down: it
goes on drawing with the settings it has. While the connection is down the page's `<body>`
has the class `offline`, and no style of Timbre's own hangs on it. It is a hook for custom
CSS: a rule such as `body.offline .visualizer-box { opacity: 0.4; }` in the OBS browser
source's Custom CSS box marks a disconnected overlay, if you want one marked.

## Wire format (for driving Timbre from elsewhere)

Anything that can call a Streamer.bot action can drive Timbre:

```
DoAction "Timbre Push"  args: { config: "<full config JSON>" }     — set + broadcast
DoAction "Timbre Push"  args: { reason: "…" }                      — re-broadcast cached
```

On Streamer.bot's WebSocket Server that is one frame,
`{ "request": "DoAction", "id": "<an id of yours>", "action": { "name": "Timbre Push" }, "args": { … } }`.
To receive the broadcasts, subscribe first:
`{ "request": "Subscribe", "id": "<an id>", "events": { "general": ["Custom"] } }`. The key
is lowercase `general` in the request; the events arrive with the source `General`.

Send one `Timbre Push` per change, and keep the action in a blocking queue
([SETUP.md](SETUP.md), step 2). Two requests for the action that overlap in the default
queue share one set of arguments, so one of them is lost.

Do not send the next request until the last one has run. Timbre's own pages
(`shared/panel-client-sb.js`) keep one request in flight each: the next is sent when the
reply and a `timbre:config` or `timbre:error` broadcast have both arrived, in either
order, or after 800 ms, because a sync with nothing saved broadcasts nothing. While a
push waits its turn, a newer push takes its place. This orders one sender's own
requests. Only the blocking queue orders two senders.

The broadcast every page receives is
`{ "type": "timbre:config", "config": { …full config… } }` inside SB's `General.Custom`
envelope. The full config shape is exactly `TIMBRE.defaultConfig()` in
`shared/viz-config.js` — that file is the schema. `afterglow` (seconds, 0 to 4, default
1.6) is the top-level key for the bar and wave effects' afterglow. `micProcessing` (`true`
or `false`, default `true`) is the top-level key for the browser's own handling of the
microphone: `true` leaves its echo cancellation, noise suppression and automatic gain on,
`false` asks for the raw microphone. A value that is neither is ignored.

**A push must be a full config.** `config` is the text of ONE JSON object, at most 64 KB
(65536 UTF-16 units; a full config is about 3.4 KB), that has every top-level key of
`TIMBRE.defaultConfig()`:

`activeViz`, `mic`, `micProcessing`, `bars`, `bounce`, `gain`, `colorSpeed`, `colorHue`, `bgOpacity`, `effectBgOpacity`, `idleAnim`, `showLabels`, `showChevrons`, `showDecorations`, `showBorder`, `placement`, `afterglow`, `perViz`

A partial config (`{ "gain": 150 }`) is not merged into the saved one. It is refused:
nothing is saved, no `timbre:config` is sent, the saved config stays as it was, and the
action broadcasts a `timbre:error` saying why. To change one setting, take the config of
the last `timbre:config` broadcast, change the value and send the whole object back.

The action checks the structure and the top-level keys only. It does not check values:
each page puts a value back in its range and drops a key it does not know. Each page
also merges a broadcast over the defaults, so a setting missing inside `mic`,
`placement` or `perViz` (and, in a config an older version saved, a missing top-level
key) is its default on the overlay and on the dock alike. The structure check is not a
JSON parser: send JSON that a parser accepts.

What the action cannot take or replay, it logs in Streamer.bot and broadcasts as
`{ "type": "timbre:error", "code": "…", "message": "…" }`:

| `code` | When | `message` |
|---|---|---|
| `too-large` | the config text is over 64 KB | `the config is over 64 KB` |
| `bad-config` | the text is not one balanced JSON object | `the config is not one JSON object` |
| `partial-config` | a top-level key is missing | `the config is not a full config` |
| `bad-cache` | a sync was asked for and the saved config is not one JSON object; it is not sent, and not deleted | `the saved config is damaged; change a setting to replace it` |
| `exception` | the action threw; the exception itself is in Streamer.bot's log only | `the action threw an exception` |

The reply to the `DoAction` request says only that the action was queued. It comes
before the action has run, its `status` is `ok` for a refused config too, and its
`args.queueName` is the name of the queue the action is in (`Default` for the default
queue). When no action has the name, the reply is
`{ "id": "…", "status": "error", "error": "The action '<name>' was not found" }` and
nothing runs. (Both replies as measured on Streamer.bot 1.0.7.) For a request that was
queued, the `timbre:config` or `timbre:error` broadcast is the answer. An action pasted before
these checks existed sends `{ "type": "timbre:error", "message": "<the exception's text>" }`
with no `code`, and broadcasts nothing when it refuses a config.
