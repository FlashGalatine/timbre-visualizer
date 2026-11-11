# Floating 3D scenes: shared foundation and the Thanksgiving scene

Design, 10 November 2026. Status: awaiting approval. OBS output check passed.

## Intent

The 18 effects in the Seasons, Holidays and Pride groups look flat and dated: 2D shapes with solid fills. They are being redesigned from nothing as small 3D scenes with real lights. This document covers the first slice of that work:

1. **The scene kit**: the shared pieces every one of the 18 will use.
2. **The Thanksgiving scene**: the first effect built on the kit. Thanksgiving is 26 November 2026, so this one ships first.

The other 17 scenes are separate, later designs. Each will reuse the kit unchanged or extend it.

### How the box is used

The visualizer box sits **behind the streamer's VTuber avatar**. The avatar is either in a bottom corner over gameplay (left or right, depending on the game) or full-screen in a talking-head scene. Two consequences drive the design:

- The game must show through the box around the scene's objects.
- The avatar covers part of the box, so the streamer must be able to move the scene out from behind it.

The owner uses two of the three overlay pages: the **16:9 page** (`mic-visualizers-1920x1080.html`, canvas 1728×624) for full-screen scenes, and the **4:3 page** (`mic-visualizers-1440x1080.html`, canvas 1248×624) when the box sits in the corner behind the avatar. Both pages scale to whatever size the Browser Source is given. Tune and test on these two first. The 300×220 page must still work, but it is not the owner's layout.

## What was decided with the owner

These are the owner's decisions. Do not reopen them.

| Decision | Detail |
|---|---|
| Look | Real 3D objects with real lights (three.js), not painted or shader-faked light. Chosen from three throwaway versions of a jack-o'-lantern. |
| All 18 become 3D scenes | Not only the ones where a light source is the subject. |
| Floating | No sky, no fog, no filled backdrop. Objects float over the box's own see-through background. The existing **Box opacity** setting keeps working as today. |
| Light needs somewhere to land | An invisible ground that shows only the light falling on it, as light added over whatever is behind the canvas. Unlit ground is not there. |
| Afterglow | Bright things leave a trace that fades. It must fade by time, not by frame. |
| Placement | One shared group of settings (left-right, up-down, size) that applies to whichever scene is showing. Not per effect. |
| Sound response | Light flares with the voice and settles slowly. The number of moving things follows volume and beats. |
| Thanksgiving subject | "A cornucopia spilling out with candles that flicker with my voice." |
| Thanksgiving look | The throwaway scene described under "Thanksgiving scene" below was shown live and approved as it stands. |
| Layouts | 16:9 page full-screen, 4:3 page in the corner. |
| Flag-like effects (later) | The Pride ribbons and July Fourth become lit cloth. Out of scope here; recorded so the kit does not rule it out. |

## Goals

- A scene kit that a later scene can be written against without touching the kit's internals.
- The Thanksgiving effect replaced by the approved 3D scene, selectable under the same name in the control panel.
- The scene looks the same at 30 fps, 60 fps and in a 165 Hz desktop browser.
- The scene reads clearly over both a bright and a dark game.
- The streamer can slide and resize the scene from the control panel while live.

## Non-goals

- The other 17 scenes.
- An afterglow for the Bars & Waves effects (wanted, separate small project).
- Changes to audio capture. The 64-point FFT and default mic processing found in the 10 November audit stay as they are.
- Moving the 12 existing WebGL effects onto the kit, or fixing their renderer leak.
- The 17 October audit's open findings.
- A quality or low-power mode.

## Anti-goals

These would make the result a failure even if it works:

- A dark or tinted rectangle behind the scene. The only pixels the scene may darken are the ones covered by a solid object.
- Light that ends in a hard line at the canvas edge.
- Objects that turn into black cut-outs over a dark game.
- Motion, flicker or fade speed that changes with the frame rate.
- A scene that leaks GPU memory each time it is selected.

## Constraints

- Runs as an OBS Browser Source (CEF, Chromium 127 or newer) and in a normal browser. No build step: plain `<script>` files, as today.
- three.js stays at the vendored r160 (`overlay/vendor/three.min.js`). It has no post-processing library, so the kit supplies its own passes.
- One WebGL canvas (`canvas3d`) is shared with the 12 existing WebGL effects, each of which builds its own renderer on it. The kit must leave the GL context in a clean state when a scene stops.
- Three page layouts: 300×220 (canvas 260×130), 1440×1080 (1248×624) and 1920×1080 (1728×624). Decoration toggles change the canvas height while a scene runs.
- Config arrives as full snapshots through `TIMBRE.sanitizeConfig`, which drops unknown keys and clamps numbers. New settings must be added to the shared tables in `shared/viz-config.js`.
- The repo is public. Nothing private goes in it.

## The scene kit

A new file, `overlay/scene-kit.js`, loaded after `core.js` and before the factories on all three overlay pages. It exposes one global, `TimbreScene`. Everything in this section is the builder's to shape internally; the behaviour is fixed.

### Renderer

- One `THREE.WebGLRenderer` per page for all kit scenes, created on first use on `canvas3d`, with a transparent clear colour and pixel ratio 1.
- It asks for an anti-aliased, alpha context. The kit does not need canvas anti-aliasing itself (it renders off-screen), but a WebGL context's attributes are fixed by whoever creates it first, and ten of the existing effects ask for anti-aliasing.
- A scene's `start()` gets the renderer and calls `resetState()`. Its `stop()` disposes everything the scene created (geometries, materials, textures, render targets) and calls `resetState()` again, so an existing effect that builds its own renderer next starts from default GL state.
- Selecting a kit scene twice must not grow `renderer.info.memory` or `renderer.info.programs`.

### Frame pipeline

Every frame runs four steps:

1. **Solid pass.** Render the scene's objects with all of its lights into an off-screen target with 4× multisampling and a floating-point colour format. Solid objects write alpha 1.
2. **Light-catcher pass.** Render the invisible ground into the same target, reusing the depth buffer and the shadow maps from step 1. The ground is lit only by the scene's *practical* lights (candles, lanterns, the pumpkin's candle), never by rim, fill or ambient light. It is blended so that it adds colour and leaves alpha at 0. Shadows inside a pool of light are real: they are places where no light was added.
3. **Afterglow.** Combine the new frame with the previous output. Where the previous output was light (alpha 0), keep `max(new, previous × decay)`, with the previous value tinted slightly toward red so fading light cools. Where the new frame has a solid object, show the new frame only. Where the previous frame had a solid object, carry nothing forward. So light lingers and objects never smear. "Was light" is a hard test (alpha below about 0.02), not a blend by alpha: the anti-aliased edge of a moving object is partly transparent, and letting it linger in proportion left red hatching behind every falling leaf in the spike when it ran at 60 fps in OBS.
4. **Output.** Tone-map (ACES filmic), convert to sRGB and write to the canvas. Before tone mapping, multiply light (not solid objects) by an edge mask that reaches zero at the canvas edges, over about 14% of the width on each side, 20% at the bottom and 10% at the top.

The spike did steps 1 and 2 with camera layers: objects and non-practical lights on layer 0, the ground on layer 1, practical lights on both, and `shadowMap.autoUpdate = false` with one shadow update per frame.

Glow sprites and anything else that represents light use the same "add colour, leave alpha" blend. three.js's stock `AdditiveBlending` raises alpha and must not be used for these.

`decay = exp(-dt / T)`, where `T` is the afterglow time. Default `T` is 0.35 s. The cooling is two extra decays on top of that: green fades with an additional time constant of 0.098 s and blue with 0.035 s. (The approved spike multiplied the previous frame by (1, 0.94, 0.84) every frame and was viewed at 165 Hz; these are the same rates expressed per second.) Every decay is computed from `dt`.

### Framing

Each scene declares a **reference frame**: a rectangle in scene units, centred on a look-at point, that holds everything the scene must show. At `placement.size` 100 the kit fits that rectangle inside the canvas, whatever the canvas's shape, by choosing the camera distance. A wide canvas shows extra space at the sides; a tall one shows extra space above and below. Nothing in the frame is cropped until the streamer zooms in or slides it. This is the meaning of a saved `placement.size` for all 18 scenes. (The spike used a fixed camera distance that only fitted the 2.77:1 canvas.) This rule is my call.

### Internal resolution

The 300×220 page's canvas is 260×130, far too few pixels for a 3D scene. The kit renders its off-screen targets at a whole-number multiple of the canvas size, the smallest that makes them at least 520 pixels tall, and the output step scales down to the canvas with linear filtering. The canvas buffer itself stays at its normal size. On the two large pages the multiple is 1. This is my call.

### Output mode and the OBS check

Light is written with alpha 0 and non-zero colour. In a browser this composites as pure added light. **Whether OBS's browser source composites it the same way has not been tested.** The output step therefore has one switch:

- `added` (default): alpha 0 for light, as above.
- `premultiplied`: for light pixels, alpha = the largest colour channel, clamped to 1. This is ordinary premultiplied alpha and is safe everywhere, but it is **not equivalent**: it replaces part of the game with the light's colour instead of adding to it. A half-bright candle pool over a white game becomes a visible orange patch, and over mid-grey it pulls blue below the game's own level. That breaks the first anti-goal.

**The check has been done.** On 10 November 2026 the approved spike ran as a Browser Source in OBS 33.0.1 (16:9, 1920×1080, 62 fps, WebGL 2). The owner looked at it over a bright and a dark source and confirmed the pools of candlelight brighten what is behind them cleanly. So `added` is the output mode, and the largest risk in this design is retired for this OBS version.

What remains for the build:

- Repeat the look in OBS once the real scene exists, on both of the owner's pages. It is a two-minute check and OBS updates its browser from time to time.
- Keep `premultiplied` in the kit as a switch, unused. If a future OBS breaks `added`, that is a decision for the owner, not a silent substitution.

### Placement

A new top-level config group, shared by every kit scene:

| Key | Range | Default | Meaning |
|---|---|---|---|
| `placement.x` | −100 to 100 | 0 | Slide left or right. ±100 moves the scene half a canvas width. |
| `placement.y` | −100 to 100 | 0 | Slide down or up. ±100 moves it half a canvas height. |
| `placement.size` | 40 to 200 | 100 | Zoom, as a percentage. |

It is applied as a lens shift (`camera.setViewOffset`) plus `camera.zoom`, so the whole scene slides and scales together and nothing distorts. The kit applies it; a scene does not read it.

`shared/viz-config.js` gains the group in `defaultConfig`, its ranges, and its handling in `sanitizeConfig`, plus a list of kit scenes (so the control panel knows when to show the group). `control/control.html` shows a "Scene placement" group of three sliders whenever the active effect is a kit scene, built the same way as the existing "3D model" group.

### Sound

`TimbreScene.audio()` returns a function called once per frame with `(now, dt)`. It returns:

| Signal | Behaviour |
|---|---|
| `level` | Loudness, 0 to 1, from the waveform RMS and the low FFT bins, times the global Gain. |
| `flame` | `level` with a fast rise (about 30 per second) and slow fall (about 3 per second). |
| `slow` | A long average (about 0.8 per second). |
| `kick` | Jumps to 1 on a beat, decays at about 5 per second. A beat is `level` above 1.35× its two-per-second average plus 0.07, at most once per 220 ms. |
| `burst` | Rises 0.3 per beat (capped at 1), decays at about 0.45 per second. |

All rates are per second and applied with `1 - exp(-rate × dt)`. With no mic and Idle animation on, `level` is a slow gentle swell around 0.26. With Idle animation off, `level` is 0.

### How existing global settings apply to kit scenes

These are my calls, not the owner's:

- **Gain**: scales `level`, as above.
- **Trail veil %**: sets the afterglow time. 100 (the default) gives 0.35 s; 0 gives 1.5 s; linear in between.
- **Idle animation**: as described under Sound.
- **Box opacity, Border, Decorations, Labels, Chevrons**: unchanged; they act on the box, not the scene.
- **Color speed, Color hue, Bars, Bounce**: ignored. The scenes are naturally coloured.

### Resizing

On `onResize` the kit resizes the renderer to the canvas's client size, recreates its render targets and updates the camera. A canvas height change must not throw or leave a stale buffer.

`core.js` calls `onResize` on **every** config push, not only when the size changes, and with the border off the height briefly drops and returns within one push. The kit must compare sizes and do nothing when the size it ends up with is the one it already has. Otherwise the afterglow resets on every slider tick.

## Thanksgiving scene

Effect id stays `thanksgiving-harvest`, so it keeps its place in the control panel and any saved selection still works. It moves from the 2D list to the WebGL list. Its file `overlay/factories/thanksgiving-harvest.js` is replaced.

### What is in it

All sizes are in scene units; the ground is `y = 0`.

- **Horn of plenty.** A wicker horn lying on its side. A tapering tube about 2.3 long, radius 0.08 at the tail growing to 0.95 at the mouth, the tail curling up and back. Coiled bands along its length and a woven texture. A thicker braided rim round the mouth. Double-sided, so the inside is visible. Turned so the viewer sees both the mouth and the curve of the body.
- **The spill**, fanning out of the mouth toward the viewer:
  - three pumpkins: orange (radius 0.52), deep orange (0.37), cream (0.27). Squat and boxy, twelve fat lobes with sharp creases, a stem each;
  - five apples, red and green, glossy, with a dimple and a stem;
  - two gourds, one green standing, one yellow lying down;
  - two ears of corn with husks;
  - a bunch of about 24 purple grapes, glossy;
  - seven stalks of wheat fanning out of the mouth.
- **Three candles**, cream pillar candles: a tall one (1.15) behind the spill, a medium one (0.8) to the right, a short one (0.5) in front on the left. Each has a small bright flame, a soft halo, a point light that casts shadows, and wax that glows near the flame.
- **Leaves.** Plain pointed leaves with a stem, in six autumn colours. About eight lie on the ground. Up to 38 more fall, tumbling, and shrink away as they reach the ground.
- **Lights that are not candles.** A cool directional rim light from behind, a weak warm fill from the front and a soft ambient. Their job is to keep every object readable over a dark game. They do not light the ground.
- **Camera.** Slightly above the scene looking down about 14°, drifting slowly side to side by roughly ±15°.

Two rough spots in the approved spike that the build should fix without changing the look: the wheat read as crossed sticks, and the corn had no kernels.

### How it responds

- **Candles.** Each candle follows `level` with a fast rise and its own fall rate (about 2.2, 3.4 and 4.6 per second), and its own flicker, so the three never pulse in step. A candle never goes dark: its brightness is about 0.22 at silence, rising with the voice, plus a short flare on a beat. Brightness drives the point light, the flame height and colour, the halo and the wax glow. The light's position trembles by about a hundredth of a unit, so the cast shadows shiver.
- **Leaves.** The number falling is `4 + 16 × flame + 18 × burst`, rounded, scaled by the Leaf density knob. Each beat gives every falling leaf one sideways push of between −1 and +2.5 units per second (so mostly one way), which dies away at about 1.5 per second. It is one push per beat, not one per frame.
- **Flicker jitter.** The small random part of each candle's flicker (±2.5%) is redrawn 60 times a second, not once per frame.
- **Reference frame.** About 6.8 wide by 3.1 high, centred near (−0.4, 0.75, 0.3): from the horn's tail to the right-hand candle, and from the ground to above the tall flame.
- **Afterglow.** From the kit. Candlelight on the ground and the halos linger and cool when the voice drops.

### Settings

`DEFAULT_PER_VIZ['thanksgiving-harvest']` becomes:

| Knob | Default | Meaning |
|---|---|---|
| `candleGlow` | 50 | How strongly the voice drives the candles. 0 = steady candles, 100 = twice the default swing. |
| `leafDensity` | 50 | Scales the number of falling leaves. 0 = only the leaves on the ground. |
| `cameraDrift` | 50 | Scales the camera's side-to-side drift. 0 = still. |

The old `pumpkinPulse` and `wheatSway` knobs go away; `sanitizeConfig` already drops unknown keys from saved configs. `leafDensity` keeps its name and any saved value. These three knobs are my call.

## Testing

- **Automated, in `verify-render.mjs`** (headless browser, mock Streamer.bot):
  - selecting `thanksgiving-harvest` initialises WebGL with no page errors;
  - the canvas has both lit pixels and fully transparent pixels, and a corner pixel has alpha 0;
  - moving `placement.x` moves the centroid of the opaque pixels the same way;
  - stepping `draw()` by hand for one second at `dt = 1/30` and at `dt = 1/60` leaves the candle brightness and the number of falling leaves within a small tolerance of each other;
  - selecting the scene, another effect, and the scene again leaves `renderer.info.memory` and the program count unchanged from the first selection;
  - changing the canvas height while the scene runs does not throw.
- **Automated, in `verify.mjs`**: `sanitizeConfig` clamps the `placement` group and fills its defaults.
- **Manual, by the owner in OBS**: the finished scene over a bright and a dark source, on the 16:9 page full-screen and the 4:3 page at corner size. (The spike already passed this on the 16:9 page.)
- **Performance**: time inside `draw()` stays under 4 ms per frame at 1728×624, a quarter of a 60 fps frame. The approved spike measures 2.6 ms on the owner's machine. (An earlier draft said 1.5 ms; that was an estimate made before measuring.) GPU cost is judged by eye in OBS with a game running; three shadow-casting lights at 512-pixel shadow maps is the starting point, and dropping the short front candle's shadow is the first thing to try if it is too heavy.

## Documentation

- `docs/EFFECTS.md`: a short section on writing a kit scene.
- `CHANGELOG.md`: an entry for the new scene, the placement settings and the changed Thanksgiving knobs.
- The effect count (49) does not change.

## Left to the builder

- The kit's internal API and file layout, beyond the behaviour above.
- Exact geometry construction, materials and textures, as long as the result matches the description.
- Whether helper geometry (the lobed pumpkin, the leaf) lives in the kit for reuse by later scenes. Halloween will want the pumpkin.
- Shadow bias values, light intensities and exposure, tuned by eye.

## Reference material outside the repo

The approved throwaway scenes and the gallery used to view them are on the owner's machine, outside this repo, under `_audits/2026-11-10/timbre-gallery/` in the parent workspace. `spikes/thanks-3d.js` is the approved Thanksgiving scene and `spikes/jack-3d-float.js` the approved look. They are for reference: they have no tests, no settings and no clean disposal, and the real build is written fresh.

## Calls I made that the owner has not seen

1. Effect id stays `thanksgiving-harvest`.
2. The three Thanksgiving knobs and their meanings.
3. Trail veil % sets the afterglow time; Color speed and Color hue are ignored by kit scenes.
4. Placement ranges (±100 for half a canvas, size 40 to 200%).
5. Keeping a `premultiplied` output mode in the kit as an option, though not as an automatic fallback.
6. Kit scenes share one renderer per page; the 12 existing WebGL effects are left alone.
7. Size 100 always fits the scene's whole reference frame in the canvas.
8. The small page renders internally at a higher resolution and scales down.
9. If a later OBS version breaks the added-light output, the work stops for a decision instead of switching modes.
10. This document lives in the public repo under `docs/superpowers/specs/`.
