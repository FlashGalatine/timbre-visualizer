# Winter Aurora scene: implementation plan

**Goal:** Replace the Winter Aurora shader with a floating 3D scene on the scene kit, after
doing the kit work that was put off until a second scene existed.

**Architecture:** The kit (`overlay/scene-kit.js`) gains six small things (upload flags reset
before the renderer is made, a disposal sweep, public `follow` / `fall`, a `factory` helper,
a per-scene afterglow `cooling`, and a contract test for `TimbreScene.parts`). The scene is
one factory file written against the kit, like `thanksgiving-harvest.js`.

**Tech stack:** Plain `<script>` files, three.js r160 (vendored), `verify.mjs` (Node) and
`verify-render.mjs` (headless browser).

**Spec:** `docs/superpowers/specs/2026-11-13-winter-aurora-scene-design.md`

## Global constraints

- No build step; the kit stays loadable under Node (nothing touches `document`, `window`,
  `THREE` or core.js globals at load time).
- Light is added with alpha 0 (`k.addLight`), never three's `AdditiveBlending`.
- Everything is per second, from `dt`.
- The suites use the side ports only; nothing connects to a live Streamer.bot.
- Overlay `.html` pages are not edited: the script tag for `winter-aurora.js` is already on
  all three.

## Review focus

1. An older WebGL effect before the first scene, and between two scenes.
2. A scene object that never went through `k.keep()`.
3. A definition with a bad `cooling` (not an array, wrong length, zero, negative, NaN).
4. A very long frame (0.1 s and more): the history must not skip or smear, the snow must
   not tunnel through the land.
5. Settings at 0 and 100, and a saved config from before the redesign.

## Tasks

### Task 1: kit arithmetic made public, and cooling (Node)

- `verify.mjs` section 5: `follow(0, 1, rate, dt) === 1 - exp(-rate × dt)`, two half steps
  equal one step, `fall` likewise; `decay(dt, T)` unchanged; `decay(dt, T, [0.05, Infinity,
  0.25])` leaves green at the plain decay, red below it, and two 60 fps steps equal one
  30 fps step; `cooling(x)` returns the default for a bad value.
- `scene-kit.js`: export `follow`, `fall`, `cooling(value)` (the validated triple); `decay`
  takes the triple as a third argument; `create()` reads `def.cooling` through it.

### Task 2: the factory helper (Node and browser)

- `verify.mjs`: with no three.js, `TimbreScene.factory(() => ({}))()` gives an object whose
  `start`, `draw`, `onResize` and `stop` do not throw.
- `scene-kit.js`: `factory(definition)`.

### Task 3: upload flags, disposal sweep, parts contract (browser)

- `verify-render.mjs`: on a fresh 16:9 page, run an older WebGL effect that leaves the flip
  flag set, then a scene: no GL error, the scene is active. A scene whose `build()` adds a
  mesh with a texture, none of it kept: all three are freed by `dispose()`. Each part: a
  fresh geometry per call, with `position`, `normal` and `uv`, finite, at its stated size.
- `scene-kit.js`: reset the flags before constructing the renderer; sweep on dispose.

### Task 4: the tables

- `verify.mjs`: `winter-aurora` is in `VIZ_SCENES`; its defaults are
  `{"auroraGlow":50,"snowfall":50,"starDensity":50,"cameraDrift":50}`; a saved
  `{ ribbonCount, starDensity: 20, mountainOpacity }` keeps `starDensity` and drops the rest.
- `shared/viz-config.js`.

### Task 5: the scene

- `verify-render.mjs`: the scene checks listed in the spec, each written and seen to fail
  first.
- `overlay/factories/winter-aurora.js`, replaced.

### Task 6: documents

- `docs/EFFECTS.md` (kit section), `CHANGELOG.md`.

### Task 7: review

- Both suites; stills; one independent review of the branch; fixes with a check first, each
  confirmed by breaking it on purpose.
