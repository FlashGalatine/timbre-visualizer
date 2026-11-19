# Mountains 3D as a block of land: implementation plan

**Goal:** rebuild `mountains-3d` as a block of alpine land on the scene kit, raised by the
voice and flowing smoothly toward the viewer.

**Architecture:** one new file, `overlay/mountains.js` (`TimbreMountains`): pure arithmetic
that Node can check, then a scene definition for `TimbreScene.factory()`. The land is a
conveyor of stored rows (`createLand()`), which is where the smooth motion comes from. No
change to the scene kit.

**Tech stack:** classic `<script>` files, three.js r160 through the kit, no build.

**Spec:** `docs/superpowers/specs/2026-11-19-mountains-land-design.md`.

## Global constraints

- The effect id, its display name and the meaning of a saved `speed` stay.
- All timing comes from `dt` or a distance; the same sound gives the same land at 30 and 60
  fps.
- `overlay/mountains.js` loads under Node and touches nothing at load.
- Light is added through the kit; only solid objects may darken the stream.
- Tests never connect to ports 7474 or 8080.

## Review focus

- A step that crosses several rows at once (a slow frame), and one that is not a distance.
- Hours of travel: the rows stay in place and the numbers stay sound.
- A duration that ends exactly on a row boundary (30 and 60 fps then differ by one row).
- The mic and Idle animation both off: nothing but the camera and the palette may move.
- A saved config with only `speed`.

## Tasks

### Task 1: the arithmetic

Checks first, in `verify.mjs` section "[15] mountains": sizes; `hash`, `noise`, `ridge`;
`columnX`, `bandOf`, `loudness`, `answer`; `rise`, `heightAt`, `lift`; `sink`; `flow`;
`shade`; `idle`; `createLand()` (`advance`, `row`, `z`, `write`, `stored`, `travel`,
`top`); the table; page order; the factory file. Then `overlay/mountains.js` up to the
scene.

### Task 2: the scene

Checks first, in `verify-render.mjs` block "The mountains": runner `landRun(steps, opts)`.
Then `definition()`: the land mesh, the cut sides, the sun's light with its shadow, the sun
and the sky's glow, `debug()`.

### Task 3: wiring and documents

`shared/viz-config.js` (`VIZ_SCENES`, `cameraDrift`), the three overlay pages (by script),
the one-line factory, `docs/EFFECTS.md`, `CHANGELOG.md`.

### Task 4: review, fixes, breaking on purpose

One independent review of the branch. Each finding fixed with a check written first. Then
break each rule of the arithmetic and the scene on purpose and confirm a check fails.

### Task 5: the owner's look

Final stills; offer to switch the live overlay. Merge only after the owner has seen it in OBS.

## Found during the build

- As with Sunburst, the render checks were written before the scene but could not be run
  before it existed: with `mountains-3d` listed as a kit scene and the old effect still in
  its file, the suite's loops over every kit scene fail first. Each check is instead shown
  to fail by breaking the code on purpose (Task 4).
- The bands first ran from the middle to the block's sides, so the highest bins drove land
  that the sink toward the sides had already lowered. They now stop at the flanks (2.6 from
  the middle), where the sink begins. This check and its code were changed together, not
  check first.
- One expectation in the checks was wrong, not the scene: 2.5 s at the default Speed is
  exactly 26 rows, so the 30 and 60 fps runs wrote a different number of rows by a rounding
  error and the comparison row by row was a row out. The check now runs 2.6 s.
- A beat adds about 10% to the light in the picture, not 15%, because most of the sun is
  behind the peaks; the check asks for 5%.
