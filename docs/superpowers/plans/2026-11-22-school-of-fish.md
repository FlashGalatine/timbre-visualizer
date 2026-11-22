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
- `join(school, from, to)`: fish that come in when Density is raised (added after the review).
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

## What changed while it was built

The first runs of the checks, before any review, changed the design in four places:

- A syllable's shimmer went on for over a second. The loudness just past is now forgotten at 8
  a second, not 2.5, and the shimmer is over in about a third of a second.
- The scattered fish drifted into a knot in the middle of the box. Each now loiters about the
  place its fright left it, so the school stays scattered.
- A bolt was not a dash when the school was already swimming fast. A lone fish's speed now goes
  to what it wants at 6 a second, and a bolt gives it the speed that gets it to its place.
- Fish streaming back overshot their places and the school swelled to twice the frame. A fish
  now hurries only while it is far from its place, and turns faster on the way.

The ring and the column were also made a little smaller, so that a loud school fits the frame.

## What the review found

One independent review of the branch. Three defects, each fixed check-first:

1. **The fish would judder at 60 frames a second.** A step was taken only when all of it had
   come due, and frames never come exactly on time, so a frame a hair early took no step and
   the next took two. A step is now taken once half of it has come due, and each fish is drawn
   as far on along its way as the school is ahead of or behind its steps.
2. **With the mic and Idle animation off while the school was scattered, the picture went on
   changing**: the calm wait ran out, the shape moved on and a flash was shown, with no fish
   moving. No time now passes for the fright when nothing is live.
3. **Fish that appeared when Density was raised were where they had been left**, or had never
   been anywhere: in a knot at the middle of a scattered school, or inside a ring. They are now
   put beside fish already there, of their own band.

Two smaller things were put right with them: the way a fish faces along its swimming wave, and
a fish heading exactly straight up or down, which had no side to roll about.

Left as they are, and known:

- A fish's back is found from the upright each frame, so one whose heading passes through
  straight up or down rolls over quickly. The review measured one such roll in ten seconds
  among 288 fish in the ball, and none in the ring or the column.
- The body is open at its tail end, a hole a few pixels across that the tail fin crosses.
- The Size slider is allowed for a frame late, as in Jelly.

## Breaking it on purpose

Each change was made to a copy of the branch and the checks run against it. A change that
nothing failed for got a check, or the line it changed was removed as doing nothing. Each run
began with nothing broken, which passed.

- **The arithmetic** (against the Node section): 157 breaks, 132 caught at first. The 25 that
  slipped past each got a check: how Density rounds; what counts as nothing; the fork of the
  tail; the room a big fish is given; a lone fish's next place and the wall of the egg; how
  fast a fish turns in the school, streaming back and alone; when it hurries; a beat in its
  speed; that a fish already apart bolts with no regard to where it is; that fish do not all
  bolt as far; that a fish apart hears no shimmer; a flash that has all but gone; where
  bubbles come from, and that none leaves in a pause or with no fish; the room a big fish
  needs; being drawn smaller in a frame of no time.
- **The arithmetic the review's fixes added**: 21 breaks, 19 caught. The two: what is
  forgotten after six steps, and a flash left over on a fish that joins. Both have checks.
- **The arithmetic again, against the final checks**: 175 breaks in all, every one caught.
- **The scene** (`definition()` and the shaders, against the render block): an early part-run
  showed four gaps before the review's fixes went in. Three got checks: that a fish is drawn
  its own size, that a glow is seen, and that a flash is seen. The fourth was a line that set
  how many fish are drawn before the first frame, which the first frame sets anyway; it is gone.
  Then 57 breaks against the fixed scene, 55 caught. The two: the page stopping while the fish
  are streaming back (the shape they were coming back to is the one the school then is), and
  the mic going off while they are streaming back (they stop as much of a school as they had
  become). Both have checks, and both breaks are now caught.

Not caught by any check, and known:

- **The bubbles' fading in and out.** A bubble that is put away is far outside the picture, so
  only the first and last quarter second of its life differ. Too little to tell in a picture.
- **A fish drawn further on between steps.** The numbers it is sent are checked to the last
  digit; that the shader moves it by them is a pixel or less, and only its wording is checked.
- **That a fish is the right way up and not mirrored.** Nothing in the picture checks tell a
  fish from its mirror image.
