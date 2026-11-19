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

## After the review

One independent review, made before either suite could run. It replayed the scene checks
frame by frame under Node with the real kit, and drew the picture with a rasterizer of its
own to predict the pixel counts. Nothing critical. Changed, with the check written or
corrected first:

- **A strip turned to face the camera** put half of itself behind its own slice on a steep
  flank when the camera swung. A trace now lies flat, 0.006 in front of its slice.
- **The bands were read raw**, 30 times a second, so the front trace changed shape in
  steps. Each band is now followed (up at 20 a second, down at 8) before it is kept.
- **The beat and the white heat went by a slice's number**, so at Depth 100 they reached a
  third as deep as at Depth 0. They go by how far back a slice is.

Checks the review showed to be wrong as written, corrected before their first run: louder
doubling the solid pixels (the feet already overlap into one sheet in silence; the check
compares the deck's height); the tallest slice by peak being the tallest by loudness (a
wave's crest can put the neighbour first; one slice either way is allowed); more slices
giving more light (fewer leave gaps that the traces glow into); a muted deck being flat
after 3.5 s (it takes about four: the voice's release, then the 2.2 s the deck holds); and
two thresholds for dim light.

Checks added for behaviour that nothing was watching: an echo keeping the bands of its own
moment (the review swapped in the bands as they are now and no check noticed); a band
being followed, by its rates; the beat reaching the nearest slices and less the further
back, at three depths, from the loudness each slice heard; the picture holding still after
a voice's echoes have died (before, only from a scene that had heard nothing).

Left as it is and written into the spec: in silence the feet overlap into one near-black
sheet about a quarter of the canvas, which the owner saw in the spike's stills; the strip
folding at crests tighter than it is wide; echoes of sound from before a mute being
shifted by the time muted.

## Found during the build

- The branch was started on top of the Mountains 3D branch, before that had landed, and
  while its deliberate-break run held the suites' ports. The arithmetic checks were run on
  their own, outside the suite, until the ports were free. The branch was rebased onto
  `main` once Mountains 3D was there.
- As with the two before it, the render checks were written before the scene but could
  not be run before it existed. Here they could not be run for some hours after it existed
  either, so the review came first and corrected six of them on paper. On their first run
  all passed but three: the two thresholds left to be measured (solid pixels and textures)
  and one for dim light (the muted deck shows 16 pixels of light over the background, not
  the 20 asked for). Breaking the code on purpose (Task 4) is what shows each one catching
  anything.
