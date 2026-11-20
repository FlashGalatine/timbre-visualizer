# Metaball as a ball of liquid metal and its droplets: implementation plan

**Goal:** rebuild `metaball` as one ball of liquid metal that each band of the sound pulls a
droplet out of, on the scene kit.

**Architecture:** one new file, `overlay/metaball.js` (`TimbreMetaball`): pure arithmetic that
Node can check, including the surface's smooth union, then a scene definition for
`TimbreScene.factory()` that draws the surface by marching rays in a shader. No change to the
scene kit.

**Tech stack:** classic `<script>` files, three.js r160 through the kit, no build.

**Spec:** `docs/superpowers/specs/2026-11-20-metaball-drops-design.md`.

## Global constraints

- The effect id, its display name and a saved `chrome` stay.
- All timing comes from `dt`; the same sound gives the same blob at 30 and 60 fps.
- `overlay/metaball.js` loads under Node and touches nothing at load.
- Only the ball and its droplets may darken the stream.
- Tests never connect to ports 7474 or 8080.

## Review focus

- A droplet at every distance from inside the ball to its full reach: no hole, no crease,
  nothing cut off by the sphere it is drawn on.
- The mic and Idle animation both off: the droplets must come home, and then nothing but
  the camera and the palette may move.
- The small page and the Size slider: the soft edge must stay about a pixel wide.
- The camera at the far ends of Camera drift.
- A saved config with only `chrome`.

## Tasks

### Task 1: the arithmetic

Checks first, in `verify.mjs` section "[18] metaball": sizes; `ease`; `direction`, `swing`;
`reach`, `dropSize`, `dropAt`; `coreAt`; `smin`, `field`; `glowOf`; `pixelOf`; `loudness`;
`idle`; the shader's text; the table; page order; the factory file. Then
`overlay/metaball.js` up to the scene.

### Task 2: the scene

Checks first, in `verify-render.mjs` block "The metaball": runner `blobRun(steps, opts)`.
Then `definition()`: the sphere the surface is drawn on, its shader, `debug()`.

### Task 3: wiring and documents

`shared/viz-config.js` (`VIZ_SCENES`, `cameraDrift`), the three overlay pages (by script),
the one-line factory, `docs/EFFECTS.md`, `CHANGELOG.md`.

### Task 4: review, fixes, breaking on purpose

One independent review of the branch. Each finding fixed with a check written first. Then
break each rule of the arithmetic and the scene on purpose and confirm a check fails.

### Task 5: the owner's look

Final stills; offer to switch the live overlay. Merge only after the owner has seen it in OBS.

## Found during the build

- The branch was started on top of the Chladni branch, before that had landed, and while
  its deliberate-break run held the suites' ports. The arithmetic checks were run on their
  own, outside the suite, until the ports were free.
- The render checks were written before the suite could be run, and their first run came
  some hours after the scene existed. All passed but two: the threshold left to be measured
  (solid pixels) and one expectation (how far a droplet has drifted home half a second into
  a silence).
- **A still picture that was not still.** "Muted in the middle of a stream ... then nothing
  moves" passed once and then failed twice running, with one pixel different by one step.
  The voice's level and a beat die away for ever and never reach nothing, so the ball's
  size and the metal's glow went on changing by amounts far too small to see, and now and
  then one pixel fell the other side of a rounding. The scene now counts a level within a
  ten-thousandth of nothing as nothing, and the check has passed every time since. This may
  be part of why the same kind of check fails now and then in the older scenes.
