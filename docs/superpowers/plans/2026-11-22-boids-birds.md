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

## What changed while it was built

- **The flock hovered by its lead.** The first flight steered by pulling each bird toward its
  place, and the birds slowed to a crawl there. A bird now flies at a cruising speed and
  steers by turning, so the flock swirls about its lead.
- **Frightened, the flock was no wider.** "Loose" only loosened the pull. Frightened birds now
  each make for their own part of the air, wherever the lead is.
- **Silence was not exactly still.** The birds' colours drifted with the clock, as the fish's
  do. They no longer do: a sitting bird's colour moves only as the palette's own Colour speed
  moves it.
- **A wire's weight** was summed in single precision and came to 1.0000001 with every seat
  taken. It is counted in whole birds and divided.
- **A landing bird's wings snapped shut** in one step. It is put on its seat (`perch`) and
  folds them over the next second. `sit` is the full reset, for re-seating.
- **A floor above the top wire** did nothing the edge of the air did not already do. Gone.

## What the review found

One independent review of the branch, by a reviewer that ran its own simulations. Six
defects, each confirmed here by running its script before anything was changed:

1. **A bird spun about itself as it took off.** The shader made the bird's "right" from its
   heading and straight up, which has no answer when the heading is straight up; sitting
   birds face mostly up and leave climbing. 59 of 84 birds snapped, by up to 2.99 radians in
   one step. Now a bird in the air is drawn turning round (at most 9 radians a second) and up
   or down (never steeper than 1.2 radians), so it is always level and never heads straight
   up. The largest turn of a bird's back in a step is 0.34 radians. (A first cure carried a
   second vector for the bird's side along its path; it left birds on their backs through a
   steep climb, and was dropped for this one.)
2. **Repeated peaks threw birds out of the top of the picture.** There is now an edge to all
   the air there is (`HARD`): near it a flying bird loses its speed outward and turns along
   it. Frightened every 0.6 s for fifteen seconds, at the loudest and widest, every bird and
   its open wings stay inside the frame as the kit's camera sees it.
3. **Birds coming home flew through birds that sat, and through the other wires.** The three
   wires' seats stood in columns, and a bird came down from straight above. Now a bird leaves
   by the front and comes home round the back, over the top wire; below the top wire a flying
   bird does not cross the wires; the middle wire's seats are half a seat along; a bird that
   is called again as it lands, lands first. Coming from behind it flies toward us and
   pitches up to sit with its breast to us, as it sits. (From the front, tried first, it had
   to turn right round as it landed.)
4. **A bird dropped onto its seat at about 2 a second, dipped under its own wire and stopped
   dead.** It slows as it lands, touches down at about 0.25 a second within 0.02 of its seat,
   and does not dip under it.
5. **With the mic off and Idle animation on nearly every bird was in the air**, lifted by the
   kit's idle swell, which the scene heard as a voice. The voice is now the mic's alone, and
   the idle bands swell less and more slowly: about a third of the birds are up on the whole,
   never more than six in ten, and stretches of wire empty and fill.
6. **At Density 100 neighbours overlapped.** With less room to a seat than a bird needs,
   every bird is smaller by as much (0.72 at 84 birds), and seats are a little more even.

The edge of the air made birds hang there at first (speeds down to 0.15); a bird now keeps
what speed it can as it turns along the edge.

Also from the review: the documents said the picture is exactly still in silence, which holds
for the birds and the wires but not for the palette's own drift or the camera's sway; they
said the wires are drawn before the birds, when three.js draws see-through things after solid
ones (the picture was right, the statement and a needless `renderOrder` were not). Both are
corrected.

Left as they are, and said in `docs/EFFECTS.md`: a folded wing is drawn as nothing; Settle
seconds 0 is the machine's least wait of 0.3 s; and a bird's least nerve of 0.10 means a band
that hums at about 0.08 keeps the boldest birds of its stretch up. That last one wants a look
with a real mic.

## Breaking it on purpose

**The arithmetic.** 133 breaks of `overlay/boids.js`, one at a time, against the Node
section: 111 caught at first. The 22 that slipped past each got a check (seven new checks) or
turned out to be a line that did nothing, which was removed (the floor above the top wire; a
landing bird's "hearing nothing", which it already was). Run again, every break that still
applied was caught. After the review's fixes, 37 more breaks of what they added: 33 caught;
the other four got three checks (a bird touches down at its least landing speed, turns the
shorter way round, and keeps the way it is turned when it is wanted straight down) and one
clause was removed. Run again: all caught.

**The scene.** 69 breaks of the scene and its shaders against the render block: 56 caught.
Of the 13 that slipped past:

- three are caught by the Node section, which the run did not include (the camera's pitch,
  the afterglow's time, and a bird drawn as far on as the flock is ahead of its steps);
- five got a check in the render block: the wires with no bird on them are drawn where they
  then hang (their points were not being sent again); every bird's own size is drawn (at
  Density 100, where they are smaller); the fright's flash is over when the page has stopped
  drawing; the colours move with Colour speed; and nothing is drawn at the canvas's edge in
  any frame of six frights in a row;
- one was a count of beats that nothing read, and is gone;
- four change only how a bird looks in ways a picture is not told apart by here (a wing
  shrinking as it folds, a folded wing lying along the body, the paler under-wing, the pale
  breast). Those lines are pinned as text by the Node section, with the line that says which
  way up a bird is.

Run again after the review's fixes, with the scene's new lines: the mic-only voice and the
edge of the air are caught by the render block.

**Two failures in full render runs that are not the boids'.** One run failed "the first frame
after a WebGL context restore is not opaque" (Thanksgiving); it passed alone, after the Boids
block alone, and in the next full run. Another failed a stillness check of the jelly by one
stray pixel over what this GPU is allowed (9 against 8).
