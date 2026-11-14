# Winter Aurora as a floating 3D scene

Design, 13 November 2026. Status: the owner saw a throwaway version in the gallery and said
"Build it". The second scene on the scene kit, after Thanksgiving Harvest.

## Intent

Winter Aurora today is one full-frame shader: a painted night sky, ribbons, stars and a
mountain line that fill the whole box. The owner's standing decision (10 November) is that
all 18 seasonal and holiday effects become small 3D scenes that float over the stream with
no backdrop. This is the second of them, and the first of the WebGL effects to be rebuilt
from the ground up (issue #1).

The owner skipped the design questions ("Skip the questions but let's do Winter Aurora
first"), so every design choice here is mine. They approved the throwaway scene as a
direction.

## What the owner has decided (do not reopen)

Everything in "What was decided with the owner" in
`2026-11-10-floating-3d-scenes-thanksgiving-design.md`: real 3D with real lights, floating
with no backdrop, an invisible ground that shows only the light on it, an afterglow that
fades by time, one shared Scene placement group, light that follows the voice and settles
slowly, and the number of moving things following volume and beats.

## Goals

- Winter Aurora replaced by a kit scene under the same effect id, `winter-aurora`.
- The aurora is the thing that follows the voice; it is light, never a filled shape.
- The scene looks the same at 30 fps, 60 fps and 165 Hz.
- Selecting it twice does not grow GPU memory.
- The kit work that was put off until a second scene existed is done first.

## Non-goals

- The other 16 scenes, and the other WebGL effects.
- Changing Thanksgiving Harvest, beyond what the kit changes below do to every scene.
- A reaction of its own to a clipped mic peak (`micPeak`). A loud hit is a beat, and beats
  already flush the hem.

## Anti-goals

The Thanksgiving design's anti-goals all apply: no dark or tinted rectangle, no light ending
in a hard line at the canvas edge, no black cut-outs over a dark game, no frame-rate
dependence, no GPU leak. One more for this scene:

- A red or orange fringe trailing the aurora. Fading aurora light must stay green, teal or
  violet.

## Scene kit changes

These were deferred on 11 November "before the second scene". Behaviour is fixed here; the
shape of the code is the builder's.

1. **Upload flags before the renderer is made.** An older WebGL effect that ran first can
   leave the texture upload flags (flip, premultiply, colour conversion, alignments) set on
   the shared context, and three.js then raises a GL error while it builds its renderer. The
   kit resets them before it constructs its renderer. It must do this without changing the
   attributes the context is created with (alpha, anti-aliasing, depth and stencil as
   three.js r160 asks for them).
2. **Disposal sweeps the scene.** `dispose()` also frees every geometry, material and
   texture reachable from the scene's objects, whether or not it went through `k.keep()`.
   `k.keep()` stays for things that are not attached to the scene.
3. **A contract test for `TimbreScene.parts`.** Each part returns a fresh geometry on every
   call, with positions, normals and texture coordinates, all finite, at the size its
   comment states, resting where its comment says.
4. **The smoothing formulas are public.** `TimbreScene.follow(current, target, rate, dt)`
   and `TimbreScene.fall(current, rate, dt)`, the ones the envelope uses.
5. **A factory helper.** `TimbreScene.factory(definition)` returns the effect factory every
   scene would otherwise write by hand: `start` creates the scene from `definition()`,
   `stop` disposes it, `onResize` and `draw` pass through, and each is safe when there is no
   scene. Thanksgiving keeps its hand-written wrapper.
6. **A scene chooses how its afterglow cools.** New optional `cooling` in a definition:
   three extra fade times in seconds, one per colour channel, applied on top of the
   afterglow time; `Infinity` means none. The default is today's `[Infinity, 0.098, 0.035]`
   (green and blue fade first, so candlelight cools toward red). Anything that is not three
   positive numbers is ignored in favour of the default.
7. **A shadow is drawn without its caster's texture** (found during the build). three.js
   r160 copies a caster's `map` onto its two shared shadow materials and leaves it there,
   and in their cached uniforms, after the scene is disposed. The next scene's shadow pass
   then uploads that disposed texture again and nothing ever frees it: one GL texture lost
   each time a scene with a textured shadow caster is followed by another scene. The kit
   sets each object's `onBeforeShadow` to clear the shadow material's `map` and `alphaMap`
   when its `alphaTest` is 0, and its `displacementMap` when its `displacementScale` is 0
   (three.js copies that across the same way). With `alphaTest` above 0 three.js uses a
   material of the caster's own, which is freed with it, so cut-out shadows are unaffected.
   An object's own `onBeforeShadow` (a scene's, or the one three.js gives a `BatchedMesh`)
   is kept and runs after the kit's.

## The scene

Sizes are in scene units; the ground is `y = 0`; the viewer is toward `+z`.

### What is in it

- **The land.** A low dome of snow about 6.8 wide, 3.5 deep and 0.34 high, gently uneven,
  set 0.55 behind the frame's centre so the frame never cuts it. Four small drifts lie
  round its edge.
- **Six pines** of different sizes (the tallest about 2.5), each four tiers of drooping
  boughs with a scalloped edge and snow lying on the upper part of each tier, on a short
  trunk. The throwaway version's pines read as striped cones; these must read as trees.
- **A log cabin** in front, turned a little: log walls, a snow-laden pitched roof, plank
  gables, a door, a stone chimney with a cap of snow, and one window lit from inside. The
  window is a small fire: a warm point light that casts shadows, a soft halo, and a pane
  that glows. It flickers gently by itself and does not follow the voice.
- **The aurora.** Three curtains of light behind and above the land, at different depths
  and heights, each about 19 long, sloped and arched differently. A curtain is a sheet whose
  path meanders and folds slowly; it is drawn as fine upright rays with a crisp lower hem
  that fade upward, green at the hem through teal to violet at the top. It is added light
  only (`k.addLight`), fades out toward both of its ends and toward its top, and is hidden
  by solid objects in front of it.
- **The aurora's light.** One spot light high behind the land, aimed down and forward, in
  the aurora's colour. It is a practical light: it lights the snow, the trees and the
  invisible ground, and the pines throw their shadows toward the viewer.
- **Stars.** Up to 120 small points of added light behind the curtains, twinkling.
- **Snow.** Up to 220 small flakes falling through the scene, swaying, shrinking away as
  they land.
- **Other lights.** A cool rim from behind, a weak fill from the front and a soft ambient,
  so every solid stays readable over a dark game. They do not light the ground.
- **Camera.** Reference frame 8.6 wide by 5.3 high, centred at (0, 1.85, 0), field of view
  30°, looking down 5°, drifting side to side by about ±9°.

### How it responds

- **Loudness.** The aurora follows the kit's `flame` with its own fast rise (14 per second)
  and slow fall (1.4 per second). Louder: brighter curtains, and a brighter aurora light on
  the snow. It never goes dark: at silence the curtains keep a dim base brightness and go
  on waving.
- **Syllables travel.** The loudness is sampled 12 times a second into a history of 32
  samples (about 2.7 s). Each curtain reads that history along its length, so a syllable is
  a wave of taller, brighter rays (and a lower hem) that travels: left to right on the front
  curtain, right to left on the middle one, from the centre outward on the back one. The
  history is laid out by age each frame with the live level at age 0, so the wave moves
  smoothly and at the same speed at any frame rate. A sample that falls inside a frame
  holds the level at its own moment (between the last frame's level and this one's), so a
  long frame that takes two samples does not write the same value twice. Each curtain gets
  its own copy laid out along its length, which is where the direction of travel lives.
- **Tone.** The low end (the first four frequency bins) keeps the lower rays green; the
  high end (bins 8 to 31) strengthens the violet tops, brightens the stars and turns the
  aurora's light on the snow toward violet. With no mic these two drift slowly with the
  idle level.
- **Beats.** A beat flushes the hems pink, brightens everything for a moment and gives
  every falling flake one sideways push that dies away.
- **Snow.** The number that should be falling is `22 + 60 × flame + 70 × burst`, scaled by
  the Snowfall setting. That number only decides whether a flake that has landed sets off
  again. A flake in the air always falls to the snow and shrinks away there, so when the
  voice drops the sky thins out as flakes land, and nothing vanishes in mid-air.
- **Afterglow.** From the kit, with this scene's own cooling: red fades fastest and green
  not at all beyond the afterglow time, so trailing light stays aurora-coloured.

### Settings

`DEFAULT_PER_VIZ['winter-aurora']` becomes:

| Setting | Default | Meaning |
|---|---|---|
| `auroraGlow` | 50 | How strongly the voice drives the aurora's brightness and its light on the snow. 0 = no change in brightness, no travelling waves and no flush on a beat (the colours still follow the tone of the voice). 100 = twice the default swing in brightness, up to a ceiling of 1.25; the waves are as tall as at 50. |
| `snowfall` | 50 | Scales the number of falling flakes. 0 = none. |
| `starDensity` | 50 | How many stars: 0 = none, 100 = 120. Keeps its name and any saved value. |
| `cameraDrift` | 50 | Scales the camera's side-to-side drift. 0 = still. |

`ribbonCount` and `mountainOpacity` are retired; `sanitizeConfig` already drops unknown keys
from saved configs. The global settings apply as they do to every kit scene (Gain scales the
level, Trail veil sets the afterglow time, Idle animation gives a slow swell, colour and
Bounce settings are ignored), and the Scene placement group appears for it.

## Testing

- **`verify.mjs` (Node):** the tables (kit scene, the four settings, an old saved config);
  `follow` and `fall` exist and agree across frame rates; `decay` with a cooling; a bad
  `cooling` falls back to the default; the factory helper is safe with no three.js.
- **`verify-render.mjs` (browser):** the kit items above (a scene started after an older
  WebGL effect on a fresh page raises no GL error; a scene that is the first WebGL effect on
  a page gets the context three.js would have asked for; an object never passed to `keep()`
  is freed; the parts contract; every GL texture made while a scene runs is deleted when it
  stops, whichever scene ran before it); and for the scene: it draws solid pixels, added light and a
  transparent corner, with no light at the canvas edge; louder gives more light; a burst of
  voice travels along the history at 12 samples a second; the same at 30 and 60 fps (glow,
  history, snow count and height); each setting does what its row says; trailing light is
  never red; re-selecting does not grow GPU resources; a draw averages under 4 ms.
- **By the owner in OBS:** the real mic, over a bright and a dark source, on the 16:9 page
  and the 4:3 page.

## Known and left alone

- The older WebGL effects have the same upload-flag trouble among themselves: after Glass
  Prism, each of them raises one GL error while it builds its renderer. That is theirs to
  fix when they are rebuilt.
- The pink flush on a beat is strongest at the hem and is tested as "mostly red light in the
  upper half of the canvas", which is a proxy for the colour, not a judgement of the look.
- The shadow maps are drawn again every frame although nothing that casts a shadow moves:
  seven depth passes, six of them for the window's light. If OBS shows render lag, the first
  thing to try is a kit option to draw still shadows once.
- This scene's cooling also applies to the window's light. When the fire dims, its trailing
  light on the snow leans yellow-green instead of red. It can only show with Trail veil
  below about 68%.
- "draw() averages under 4 ms" times the script that issues the drawing commands, not the
  graphics card's work.
- The dispose sweep does not reach `customDepthMaterial` / `customDistanceMaterial`, a
  uniform whose value is an array of textures, `scene.background` / `scene.environment`, a
  `SpotLight`'s `map`, or textures owned by a `Skeleton` or a `BatchedMesh`. No scene uses
  any of them; one that does passes them through `k.keep()`.

## Left to the builder

Geometry construction, materials, light intensities and exposure, tuned by eye against the
approved throwaway (`_audits/2026-11-10/timbre-gallery/spikes/winter-aurora.js`, outside
this repo), which is reference only.

## Calls I made that the owner has not seen

1. The four settings, and retiring `ribbonCount` and `mountainOpacity`.
2. The per-scene `cooling` option in the kit, and this scene's values.
3. No separate reaction to a clipped mic peak.
4. The window fire does not follow the voice.
5. Thanksgiving keeps its own wrapper; only new scenes use the factory helper.
