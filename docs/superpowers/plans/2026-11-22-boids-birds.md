# Boids as Birds on a Wire Implementation Plan

**Goal:** Rebuild the Boids effect as a kit scene: birds that sit on three wires, fly up as a
flock with the voice, land in a pause, and are flushed by a thump of the mic.

**Architecture:** All arithmetic and the scene definition live in one classic script,
`overlay/boids.js` (`globalThis.TimbreBoids`), valid under Node so `verify` can import it. The
factory file becomes one line round the scene kit's factory. When a fright starts and ends is
`TimbreHelix.createShatter`'s machine. It follows `overlay/school-of-fish.js` closely.

**Tech stack:** three.js (vendored), the scene kit (`overlay/scene-kit.js`), `verify.mjs`
(Node) and `verify-render.mjs` (headless Edge).

**Spec:** `docs/superpowers/specs/2026-11-22-boids-birds-design.md`

## Global constraints

- Effect id `boids`, name unchanged; stays where it is in `ACTIVE_VIZ_NAMES` and in
  `VIZ_USES_3D`; joins `VIZ_SCENES` as the last listed. Still 52 effects.
- Settings: `{ cohesion: 50, density: 50, frightSensitivity: 50, settleSeconds: 3,
  cameraDrift: 50 }`; `settleSeconds` at most 10. A saved `{ cohesion }` keeps its value.
- No `Math.random` in `overlay/boids.js`. No renderer of its own.
- The flock is stepped at 1/60 s whatever the frame rate, a step coming due at its half.
- School of Fish is not touched.
- The overlay pages are patched by script, never opened or edited by hand.

## Review focus

1. Silence with the mic on: every bird ends up sitting, and then nothing at all changes.
2. Frames that come early or late, and a frame far longer than a step.
3. Density changed while birds are in the air, and while they are frightened.
4. A thump while birds are landing; the mic going off during a fright.
5. A bird must always be able to get home: no bird left circling its seat or stuck below a wire.

## Files

- Create `overlay/boids.js`. Replace `overlay/factories/boids.js`.
- Modify `shared/viz-config.js`, the three `overlay/mic-visualizers-*.html` pages (one script
  tag each), `verify.mjs` (a new section, and the lines that say what Boids was),
  `verify-render.mjs` (a new block, the textures table, and the check that used Boids as an
  older WebGL effect), `docs/EFFECTS.md`, `CHANGELOG.md`.

## Interfaces (`TimbreBoids`)

- Sizes and rates as named constants.
- `countFor(density) -> birds` (three wires' worth); `spreadFor(cohesion)`; `loudness`,
  `idle`, `settle`, `rng`.
- `birdShape() -> { points, normals, wing, index }`: one bird, beak toward +x, back toward +y.
- `createFlock(seed) -> flock`; `reseat(flock, n)`: the seats, bands and sitting birds for `n`
  birds.
- `wireY(flock, w, x)`, `seatY(flock, i)`, `wirePoints(out, flock, w)`.
- `callOf(band, flame)`; `leadAt(out, tau, flame)`.
- `takeOff(flock, i, hard, random)`; `stepFlock(flock, n, how)`; `advance(flock, n, dt, how)`;
  `fright(flock, n, random)`. `how` is `{ flame, bands, loose, spread, pulse, random }`.
- `pulseOf(flame, trail)`; `dress(A, B, flock, n, how)`.
- `orbitAt(t, drift)`, `swayFor(drift)`.
- `VERT`, `FRAG`, `WIRE_VERT`, `WIRE_FRAG`; `definition()`.

## Tasks

### Task 1: the arithmetic, check-first

A new section in `verify.mjs`, written before the code and seen to fail: the sizes; Density
and Cohesion; a bird's shape; the flock as made (rows of seats, bands low to high from left
to right, every bird sitting); the wires (their sag, the weight on them, their spring); a
bird in silence does not move at all; it takes off when its band sounds or the voice passes
its nerve; it stays up as long as it hears, comes home and lands exactly on its seat; the
flock follows the lead, keeps clear, stays in its air and above the wires; louder is faster
and wider; Cohesion; the steps (a half come due, the cap, 30/60/120 frames a second, frames
early and late); the fright; what each bird is sent; everything comes to rest in silence;
Density re-seats.

### Task 2: the scene

`definition()`: the instanced birds, the wires, the settings read live, the machine, the
frozen flock when nothing is live, `debug()`. Wire it in. The wiring checks.

### Task 3: the picture, checked

A new block in `verify-render.mjs`: a kit scene with solid birds and wires; the flock made
again from the arithmetic, frame for frame; silence is still; a band lifts its stretch of
wire; a loud voice lifts them all; they land in a pause; a thump; the settings; the mic off;
the frame rate; cost.

### Task 4: the documents

`docs/EFFECTS.md` ("The boids"), `CHANGELOG.md`.

### Task 5: review and breaks

Both suites; one independent review, its findings fixed check-first; deliberate breaks of the
arithmetic and of the scene, with a check for each one that slips past.
