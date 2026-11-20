# Chladni as sand on a floating plate: implementation plan

**Goal:** rebuild `chladni` as a floating dark plate with sand that gathers into figures as
the voice shakes it, on the scene kit.

**Architecture:** one new file, `overlay/chladni.js` (`TimbreChladni`): pure arithmetic that
Node can check, including the sand's stepper over plain typed arrays, then a scene
definition for `TimbreScene.factory()`. No change to the scene kit.

**Tech stack:** classic `<script>` files, three.js r160 through the kit, no build.

**Spec:** `docs/superpowers/specs/2026-11-19-chladni-plate-design.md`.

## Global constraints

- The effect id, its display name and a saved `density` stay.
- All timing comes from `dt`; the same sound gives the same kind of figure at 30 and 60 fps.
- No `Math.random`: a run is repeatable.
- `overlay/chladni.js` loads under Node and touches nothing at load but its own tables.
- Light is added through the kit; only solid objects may darken the stream.
- Tests never connect to ports 7474 or 8080.

## Review focus

- A change of Density in mid-run, both ways.
- The mic and Idle animation both off: grains in the air must land, and then nothing but
  the camera and the palette may move.
- A grain at a crossing of two lines, where the slope is zero; a grain on the plate's edge.
- A change of figure asked for while the last blend is still running.
- A saved config with only `density`.

## Tasks

### Task 1: the arithmetic

Checks first, in `verify.mjs` section "[17] chladni": sizes; `grainCount`; `FIGURES`,
`value`, `sample`; `toneOf`, `wantFigure`; `nextFigure`; `shakeOf`; `pace`, `jostle`,
`hopChance`, `hopSpeed`; `thrown`; `createSand`, `stepSand`, `throwSand`; `bend`, `glow`;
`blendOf`; `idle`; the table; page order; the factory file. Then `overlay/chladni.js` up to
the scene.

### Task 2: the scene

Checks first, in `verify-render.mjs` block "The chladni plate": runner `plateRun(steps, opts)`.
Then `definition()`: the plate, its skirt, the sand, `debug()`.

### Task 3: wiring and documents

`shared/viz-config.js` (`VIZ_SCENES`, `cameraDrift`), the three overlay pages (by script),
the one-line factory, `docs/EFFECTS.md`, `CHANGELOG.md`.

### Task 4: review, fixes, breaking on purpose

One independent review of the branch. Each finding fixed with a check written first. Then
break each rule of the arithmetic and the scene on purpose and confirm a check fails.

### Task 5: the owner's look

Final stills; offer to switch the live overlay. Merge only after the owner has seen it in OBS.
