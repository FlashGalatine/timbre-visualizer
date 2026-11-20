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

## After the review

One independent review, which replayed the listening and the sand under Node. Nothing
critical; four findings it called important. Changed, with the check written or corrected
first:

- **Short gaps added up to a pause** while the plate was changing figure, so speech in
  short bursts started a phrase a second. Quiet is now one stretch, and a phrase that comes
  during a change waits for it.
- **A steady voice only ever showed two figures**, and went there and back within a phrase.
  A new phrase now takes the nearest figure the plate neither has nor had, so a steady voice
  goes round three, and within a phrase the figure moves only when the tone has.
- **The sand's points were the wrong size** on the small page (a quarter) and under the
  Size slider. The scene sizes them itself.
- **A floor of hiss in the bins would have taken over the tone**, and a phrase took its
  tone from its first reading. The tone weighs each bin by its square and is the mean over
  a phrase's first tenth of a second; the bins are no longer followed.
- A step of the sand could be a fortieth of a second, and a grain near its place overshot
  by more the longer the step. Steps are no longer than a sixtieth, and the approach is
  exact.
- A grain was drawn at the plate's height from before its step. Each grain's random numbers
  were its neighbour's, six draws on. All 30,000 grains were uploaded every frame. With the
  mic off the tone sat on the last figure a third of the time.

Checks the review showed to be weak, strengthened: no check stepped the sand in steps of
any length but a sixtieth of a second; nothing said the sand is added light, or dimmer in
the air; the wait between throws and the rate the tone is followed were bounded loosely;
nothing covered a phrase longer than the hold, gaps during a change, the small page, or the
colour of the plate's glow.

Left for the owner's microphone, and written into the spec: a noise floor that keeps the
level above 0.1 means no pause is ever heard, and a close voice at a level above 0.9 throws
the sand while talking.

Changed by the builder after looking at the built effect: a figure is kept for 3 s within a
phrase (was 1.8), and throws are at least 2.5 s apart (was 1.2).

## Asked for by the owner after seeing it in OBS

Three settings to turn the plate, so that the old effect's view from straight above can be
had again: `rotateX`, `rotateY` and `rotateZ`, 0 to 360 degrees, all 0 by default. The
plate, its skirt and the sand are one group that the settings turn; a plate turned so that
it would leave the frame is drawn smaller and moved to the middle. Checks first, as for the
rest.

## Breaking it on purpose

Each rule was broken in a separate copy, one at a time, and the checks run against it,
after one run with nothing broken.

- **The arithmetic: 228 breaks, against the Node suite.** Of the first 130, eight failed no
  check: sideways flight on one axis, the upper limit of the walk's pull, the jostle on each
  axis and the two axes sharing one number, a hop whatever the plate's motion there, and a
  glow by the figure's value instead of its square. Each has a check. They were run again
  with 76 breaks of what the review's fixes had changed and 22 of the Rotate settings, and
  every one of those failed a check.
- **The scene: 87 breaks, against the scene's own block of the render suite.** 71 failed a
  check. One makes no difference (the grain count set at build, which the first frame sets
  again). Fifteen failed none: the blend given to the plate and to the sand; the beat left
  out of the shake, and the level taken for it instead of the followed voice; the three
  parts of noticing a beat's rise, and the count of time since the last throw; the length of
  a step at a frame rate that is no multiple of 60; the plate's bend left out of where a
  grain is drawn; the skirt's foot not following the bent edge; the plate's points not sent
  to the GPU; and sand seeded from the clock. Fourteen have checks, and each was run again
  and fails its check. The fifteenth was a guard that could never matter (nothing is thrown
  with the mic and Idle animation off, because the level is then nothing), and it was taken
  out.

Most of the fifteen were checks that read a number at a moment when the thing was at rest:
the bend was read at a whole second, when the plate is flat; the blend was read from the
voice's record and not from what the frame used.

## Found during the build

- The render checks were written before the scene but could not be run before it existed.
  On their first run all passed but four: three expectations of mine that were wrong (the
  sand gathers within a tenth of a second at a loud voice, and after two seconds of silence
  the voice has not quite died away), and the suite's table of textures a scene makes, which
  needed an entry.
- **A still picture that is not still, now and then.** The check "muted in the middle of a
  throw ... then nothing moves" failed once in the first four runs of the suite, and
  Phosphor's "the picture holds still" once later. Sunburst's and Mountains 3D's had done
  the same during Phosphor's break runs. In the failing run the scene's own numbers were
  the same before and after, and the same sequence run thirty times outside the suite never
  differed. Both failures came while live WebGL pages were open in another browser; the
  runs since those were closed have been clean. The cause is not known. The plate's
  stillness checks now report how many pixels differed, by how much and where.
- A run of the render suite takes five minutes, so 87 breaks of the scene would have taken
  seven hours. They were run against a cut of the suite made for the purpose, outside the
  repository: the suite's setup, the helpers the scene blocks share, and the plate's own
  block, 46 checks in half a minute. The suite-wide checks are not in it, so it is for
  break runs only; the whole suite was run on every commit.
- The first break run of the arithmetic was started before the review came back, and the
  review changed much of what it had broken. The second list covers what changed.
