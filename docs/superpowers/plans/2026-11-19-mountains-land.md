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

## After the review

One independent review of the branch: nothing critical. It checked `createLand()` against a
reference that keeps every row, over 8,000 random steps, and found it sound. Fixed, each
with a check written first:

- The far and right cut sides were wound to face into the block and drawn two-sided, so
  from outside the right side took the sun's light as if it faced left. It shows once the
  camera swings past the block's right edge, from about Camera drift 55. The sides are now
  arithmetic (`rim()`), every piece wound to face out, drawn one-sided, and a Node check
  holds each piece's winding to its normal and its normal to the outside.

Checks added or tightened for behaviour that nothing was watching:

- how fast the loudness a column follows rises and falls (the middle column followed by
  hand from the voice the scene saw on each frame);
- the far edge read an eighth of a second into a syllable (before, it was read only where
  the land was already at full height and no longer changing);
- the land stopping where it is when muted in the middle of a stream, and its far edge
  settling;
- the cut sides meeting the rim at every point (before, only the highest rim point);
- the land's normals being worked out again as it changes;
- the drawn land being lifted, and the sun's light, height, size and brightness, read back
  from the objects drawn (before, from what `update()` meant to draw);
- the block's height in pixels with its base;
- after a jump, what the rows hold (before, only that it took no time);
- the row-keeping check read one row too far back; it now reads the two rows the near edge
  is read from.

Left as it is and written into the spec: how much of the range a speaking voice raises and
how much of it is snow, which needs the owner's look with a real microphone; the light
coming from further left and higher than the sun's disc; a beat lifting the range within a
frame; no check for the shadows or the direction of the light. The 30 and 60 fps checks
still compare rows by their place in the grid, with durations chosen to end off a row
boundary.

The render checks for the seam and the normals were not run before their code: they read
values `debug()` did not yet report, so they could only fail. Breaking the code on purpose
is what shows them catching anything.

From breaking the arithmetic on purpose (79 breaks): 78 caught. The one that was not swaps
the far edge's loudness for the value saved from the same step, which is the same number.
Three checks were added while the list was being written: the easing of the noise, the ring
keeping a row until it has left the near edge, and a jump.

From breaking the cut sides on purpose (9 breaks against the Node suite): all caught.

From breaking the scene on purpose (43 breaks against the render suite, after one entry
with no break that had to pass, and did): 42 caught. The one that was not drew the cut
sides inside out. The block is then hollow (its near side is missing and the far side
shows from within), but it measures the same from top to bottom, which was all the check
of the base looked at. That check now also asks that the lowest rows of the block are
solid nearly all the way across, and the break is caught. Two unrelated checks (a
Sunburst one and the context-restore one) each failed once during this run, alongside the
check that was meant to fail; stills were being rendered on the same machine at the time.

The owner looked at the branch in OBS with the real microphone: "All looks right".

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
