# Phosphor as a deck of glowing traces: implementation plan

**Goal:** rebuild `phosphor` as a deck of dark slices with glowing traces on the scene kit:
the voice at the front and its echoes behind.

**Architecture:** one new file, `overlay/phosphor.js` (`TimbrePhosphor`): pure arithmetic
that Node can check, then a scene definition for `TimbreScene.factory()`. The voice is kept
in the kit's histories. No change to the scene kit.

**Tech stack:** classic `<script>` files, three.js r160 through the kit, no build.

**Spec:** `docs/superpowers/specs/2026-11-19-phosphor-deck-design.md`.

## Global constraints

- The effect id, its display name and a saved `depth` stay.
- All timing comes from `dt`; the same sound gives the same deck at 30 and 60 fps.
- `overlay/phosphor.js` loads under Node and touches nothing at load.
- Light is added through the kit; only solid objects may darken the stream.
- Tests never connect to ports 7474 or 8080.

## Review focus

- A change of Depth in mid-run, both ways.
- The mic and Idle animation both off: the waves must stop, the echoes must die, and then
  nothing but the camera and the palette may move.
- A trace point directly below the camera, or with the camera in the slice's plane.
- Silence for longer than the deck holds; a first frame with no history.
- A saved config with only `depth`.

## Tasks

### Task 1: the arithmetic

Checks first, in `verify.mjs` section "[16] phosphor": sizes; `sliceCount`; `backOf`,
`ageOf`, `zOf`; `waves`, `pace`, `weight`; `loudness`; `shape`; `stand`, `heightOf`; `pin`,
`ends`; `strip`; `wall`; `fade`, `bright`, `hot`, `halfWidth`, `under`, `tint`; `idle`;
the table; page order; the factory file. Then `overlay/phosphor.js` up to the scene.

### Task 2: the scene

Checks first, in `verify-render.mjs` block "The phosphor": runner `deckRun(steps, opts)`.
Then `definition()`: the slices, the traces, the histories, `debug()`.

### Task 3: wiring and documents

`shared/viz-config.js` (`VIZ_SCENES`, `cameraDrift`), the three overlay pages (by script),
the one-line factory, `docs/EFFECTS.md`, `CHANGELOG.md`.

### Task 4: review, fixes, breaking on purpose

One independent review of the branch. Each finding fixed with a check written first. Then
break each rule of the arithmetic and the scene on purpose and confirm a check fails.

### Task 5: the owner's look

Final stills; offer to switch the live overlay. Merge only after the owner has seen it in OBS.

## Found during the build

- The branch was started on top of the Mountains 3D branch, before that had landed, and
  while its deliberate-break run held the suites' ports. The arithmetic checks were run on
  their own, outside the suite, until the ports were free.
