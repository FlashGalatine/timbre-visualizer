# School of Fish Implementation Plan

**Goal:** Add School of Fish, a new kit scene (the 52nd effect): a flock of fish that mills,
shimmers with the voice and bolts apart on a thump of the mic.

**Architecture:** All arithmetic and the scene definition live in one classic script,
`overlay/school-of-fish.js` (`globalThis.TimbreSchool`), valid under Node so `verify` can
import it. The factory file is one line round the scene kit's factory. When the school bolts
and regroups is `TimbreHelix.createShatter`'s machine.

**Tech stack:** three.js (vendored), the scene kit (`overlay/scene-kit.js`), `verify.mjs`
(Node) and `verify-render.mjs` (headless Edge).

**Spec:** `docs/superpowers/specs/2026-11-22-school-of-fish-design.md`

## Global constraints

- Effect id `school-of-fish`; shown as "School of Fish" (`VIZ_LABELS`); listed after `boids`
  in `ACTIVE_VIZ_NAMES`; in `VIZ_USES_3D`; last in `VIZ_SCENES`. 52 effects in all.
- Settings: `{ density: 50, frightSensitivity: 50, regroupSeconds: 3, cameraDrift: 50 }`;
  `regroupSeconds` at most 10.
- No `Math.random` in `overlay/school-of-fish.js`. No renderer of its own.
- The school is stepped at 1/60 s whatever the frame rate.
- Boids is not touched.
- The overlay pages are patched by script, never opened or edited by hand.

## Review focus

1. A frame far longer than a step (a throttled tab): the steps taken are capped and the school
   does not jump or leave the picture.
2. Density changed while it runs: the fish drawn change at once, bands stay evenly shared, and
   a fish that appears is somewhere sensible.
3. The Size slider above 100, and the school apart: nothing drawn leaves the picture.
4. A thump while the fish are streaming back: they bolt again and the next shape is still the
   one after the last.
5. The mic and Idle animation both off: nothing moves, however long.

## Files

- Create `overlay/school-of-fish.js`, `overlay/factories/school-of-fish.js`.
- Modify `shared/viz-config.js` (the lists, the label, the settings, the maximum), the three
  `overlay/mic-visualizers-*.html` pages (two script tags each), `verify.mjs` (a new section
  and the counts), `verify-render.mjs` (a new block, the textures table and the counts),
  `docs/EFFECTS.md`, `README.md`, `CHANGELOG.md`.

## Interfaces (`TimbreSchool`)

- Sizes and rates as named constants (`BANDS`, `PER_MIN`, `PER_MAX`, `STEP`, `STEPS_MAX`,
  `NEAR`, `BASE`, `EGG`, `LEAN`, `FORMS`, `ROUND_S`, `FRAME`, `FOV`, `PITCH`, ...).
- `countFor(density) -> fish`; `loudness(bins, band, gain)`; `idle(band, t)`; `settle(v)`;
  `rng(seed)`.
- `fishShape() -> { points, normals, fin, index }`: one fish, nose toward +x, back toward +y.
- `createSchool(seed) -> school`: every fish's size, band, round, place and heading, as a ball.
- `steer(out, school, i, form, tight, band)`: where the school wants fish `i` to swim.
- `stepSchool(school, n, how)`: one step of `n` fish; `how` is `{ gain, apart, back, flame,
  dart, bands, random }`.
- `advance(school, n, dt, how) -> steps`: the steps that have come due, at most `STEPS_MAX`.
- `bolt(school, n, strength, random, fresh)`: the fright.
- `nextForm(form)`; `pulseOf(flame, trail)`; `heard(school, round)`; `dress(a, b, school, n,
  how)`: the per-fish numbers the shader is sent.
- `createBubbles(seed)`, `stepBubbles(bubbles, school, n, pulse)`.
- `needOf(school, n, sway) -> share of the frame`; `roomFor(need, enlarged)`;
  `zoomAfter(zoom, room, dt)`; `orbitAt(t, drift)`; `swayFor(drift)`; `pxOf(height, zoom)`.
- `VERT`, `FRAG`, `BUBBLE_VERT`, `BUBBLE_FRAG`; `definition()`.

## Tasks

### Task 1: the arithmetic, check-first

A new section in `verify.mjs`, written before the code it checks and seen to fail: the sizes;
Density to a number of fish; the fish's shape (a closed body whose normals point out, a tail
and a fin); the school as made (bands evenly shared, big fish low, every fish on its round);
`steer` for each shape; one step by hand (two fish too close part, a fish follows its
neighbours, speed follows what is asked); steps come due at 1/60 s and are capped; the same
school at 30 and 60 frames a second; each shape keeps its bounds and turns one way; louder is
faster and tighter; the bolt, the wandering, the way back and the next shape; the shimmer; the
bubbles; the room it needs and how it is drawn smaller.

### Task 2: the scene

`definition()`: the instanced fish, the bubbles, the settings read live, the machine, the
frozen school when nothing is live, and `debug()` for the checks. Wire it in: the lists and
settings, the two script tags on each page, the factory file. The wiring checks in `verify.mjs`.

### Task 3: the picture, checked

A new block in `verify-render.mjs`: it is a kit scene with solid fish and a clear corner; the
fish drawn are where the arithmetic puts them, frame for frame; louder is faster; a thump
scatters them and all of it stays in the picture; they come back as a ring with a clear
middle; Density, Fright sensitivity, Regroup seconds and Camera drift do what they say;
nothing moves with the mic and Idle animation off; the same at 30 frames a second; it costs
little to draw; its textures and memory are steady.

### Task 4: the documents

`docs/EFFECTS.md` ("The school of fish"), `README.md` (52 effects, the new row),
`CHANGELOG.md`.

### Task 5: review and breaks

Both suites; one independent review, its findings fixed check-first; then deliberate breaks of
the arithmetic and of the scene, with a check for each one that slips past.
