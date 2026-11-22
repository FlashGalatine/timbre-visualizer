# Jelly as a cube of jelly: implementation plan

**Goal:** replace the Jelly effect with a kit scene: a soft cube of layered jelly that the
voice wobbles and a mic thump knocks apart into its layers.

**Architecture:** `overlay/jelly.js` holds the arithmetic and the scene as
`globalThis.TimbreJelly` (classic script and ES module at once, like `glass-prism.js`).
`overlay/factories/jelly.js` becomes one line. The scene is written against `TimbreScene` and
uses `TimbreHelix.createShatter` for the thump.

**Tech stack:** classic scripts, three.js r160 through the scene kit, Node checks
(`npm run verify`), headless Edge checks (`npm run verify:render`).

**Spec:** `docs/superpowers/specs/2026-11-22-jelly-cube-design.md`

## Global constraints

- No build step; no new dependency.
- `jelly.js` touches no global at load time.
- Timing from `dt` only. The body steps in fixed steps of `STEP` = 1/240 s.
- Pages are patched by script, never opened or edited by hand.
- Check first: each check is seen failing before the code that satisfies it.

## Review focus

1. A very long frame (a hidden tab): the body takes at most `STEPS_MAX` steps and drops the rest.
2. Settings that are not numbers, or out of range: Stiffness falls back to 50 and is held to 0..100.
3. A thump while the slabs are dropping back: flight takes up from where each slab is drawn.
4. Scene Size enlarged: the slabs still stay in the picture.
5. Mute in the middle of a wobble, and in the middle of a thump: it comes to rest and then nothing moves.

## Files

- Create `overlay/jelly.js`; rewrite `overlay/factories/jelly.js` as one line.
- Modify `shared/viz-config.js`: `VIZ_SCENES` gains `jelly`; its settings become
  `{ stiffness: 50, shatterSensitivity: 50, reconnectSeconds: 3, cameraDrift: 50 }`;
  `PER_VIZ_MAX.jelly.reconnectSeconds` = 10.
- Modify the three overlay pages: a `<script src="jelly.js">` after `shards.js`.
- Modify `verify.mjs`: section `[22] jelly`. Modify `verify-render.mjs`: block "The jelly";
  the fresh page's "older WebGL effect" becomes Boids.
- Modify `docs/EFFECTS.md`, `CHANGELOG.md`.

## Task 1: the arithmetic (`TimbreJelly`, under Node)

Interfaces produced (all pure; `out` arguments are filled and returned):

- Sizes: `BANDS` 8, `G` 9, `SKIN` 26, `SLAB_SKIN` 14, `ROUND` 5, `LAYERS` 4, `THIN` 0.25,
  `BUBBLES` 46, `STEP` 1/240, `STEPS_MAX` 24, `ROOM` 2, `FOV` 30, `PITCH` 6, `FRAME`.
- Sound: `loudness(bins, band, gain)`, `idle(band, t)`, `settle(v)`, `firmOf(stiffness)`.
- Shape: `rounded(out, x, y, z)`, `skin(n)` -> `{ points, index }`, `normalsOf(pos, index, norm)`,
  `layerOf(y)`, `slabAt(i)`, `slabWide(i)`, `slabOf(y)`.
- Body: `createBody()`, `pull(body, bands, firm)`, `slapAt(out, n)`, `slap(body, n)`,
  `stepBody(body, firm, lift)`, `advance(body, dt, firm, lift)` -> steps taken,
  `atRest(body)`, `calm(body)`, `land(body)`, `locate(cells, fracs, at, x, y, z)`,
  `sample(...)`, `sampleOne(...)`, `measure(body)`,
  `shape(pos, lit, body, home, cells, fracs, q, gain)` -> reach.
- Springs: `spring(sw, dt, rate, damp, to)` (exact: two half steps are one whole),
  `shownSquash(q)`, `wideFor(q)`.
- Slabs: `createSlabs()`, `throwSlabs(sl, strength, random, fresh)`, `flySlabs(sl, dt)`,
  `wobbleSlabs(sl, dt, rise, bands, firm)`, `showSlabs(sl, clock)`, `startBack(sl)`,
  `backShare(u, i)`, `placeSlabs(sl, u, clock)` -> landings, `landAll(sl)`, `resumeSlabs(sl)`, `plop(sl, i)`,
  `homeSlabs(sl)`, `bent(out, x, y, z, q, bend)`, `slabPoint(out, sl, i, x, y, z)`,
  `slabHalf(out, i, q, bend)`, `reachOf(sl)`.
- Room: `limitFor(enlarged)`, `roomFor(reach, limit)`, `zoomAfter(zoom, room, dt)`.
- Camera and light: `turnAt(out, clock)`, `orbitAt(t, drift)`, `glowOf(out, flame, kick, flash)`,
  `flareOf(kick, flash)`, `pxOf(height, zoom)`.

Steps: write section `[22] jelly` in `verify.mjs` (it fails: no module); write the arithmetic;
the section passes; commit.

## Task 2: the scene and its wiring

`definition()` in `jelly.js` (build, update, debug), the shaders, the factory, the table, the
pages. `debug()` gives what the render checks read: the bands, the body's points, the slabs,
the phase, reach, room and zoom, what is drawn in which order, colours as sRGB.

Steps: write the render block (it fails: old effect); write the scene; wire it; calibrate the
measured thresholds from the first run; both suites pass; stills; commit.

## Task 3: review, breaks, documents

One independent review; its findings fixed check-first. Deliberate breaks of the arithmetic
and of the scene; a check for each real miss. `docs/EFFECTS.md` and `CHANGELOG.md`. Both
suites. Commit. Offer the switch.

## Found during the build

- A band that pulls a corner draws the whole body after it: the middle is held softly, not
  pinned, and moves a little under a third as far as the corner. The check says so.
- How far the slabs reach was first taken as each slab's distance from the middle plus the
  radius of a ball round it. That is far too much for a flat slab above or below the middle,
  and the slabs were drawn at 0.65 of their size while apart. `reachOf` now turns the
  middle's place back by the slab's own turn and takes the furthest point of the round box
  the slab fits in. It is still never less than the truth (the check tries sixty slabs,
  turned, squashed and bent, point by point) and comes within a few per cent of it.
- With the mic on and silent the clock still runs, so the cube turns and its colours drift:
  only with the mic and Idle animation both off does the picture hold still.
- A slab's squash passes through nothing a fifth of a second after a syllable, so a check
  that read it then saw no squash. It reads earlier.

## What the review found

One independent review (Opus) of the build commit. Nothing wrong in the arithmetic, the
shaders or the phases of the thump. What it found, and what was done:

1. **A loud cube left the picture with Scene Size enlarged.** Whole, the room was 2 whatever
   the size. Fixed: `limitFor(enlarged)` is one rule, whole and apart. A check runs the
   softest cube at its loudest at 125% and wants nothing at the canvas's edge.
2. **Every page loaded `jelly.js` twice** (the wiring script had been run twice). Fixed,
   with the checks Shards has for its files: loaded once and in order, the one-line factory,
   no `Math.random`.
3. **A wrong sentence in `docs/EFFECTS.md`** (a quarter for a half). Corrected.
4. **At 12 or 14 frames a second the top slab's landing was skipped**: one frame carried it
   past its landing and to the end of the return. Fixed: `landAll` counts as landed whatever
   is still in the air when the cube sets. A check runs the thump at both rates.
5. **The slabs were put in order with last frame's turn and size.** Fixed: they are arranged
   after the cube's own turn and size are set for the frame.
6. **The light behind did not shrink with the slabs.** Fixed.
7. **Small waste each frame apart** (an array and a function made anew). Fixed. The speeds
   of the body were worked out twice a frame; `measure` now does it once.
8. **A step of the body took the points one after another**, each seeing the ones before it
   already moved, so a body pulled evenly drifted out of its symmetry by about 1%. Fixed:
   every point is moved by where the others were at the start of the step. A check takes one
   step by hand.
9. **Weak checks**: two conditions that could not fail were removed or made real; a check's
   name said the slabs hang still when muted (they fly on to their places; the name now says
   so, and the flight is checked); the cost limit was three times the design's (now 2 ms).
10. **Nothing checked a page that stopped drawing while it was apart.** A check does now.
11. **Nothing held the slab's shader to `bent()`.** The checks now carry every point of
    the skin, or of the slabs as the arithmetic has them, to the canvas, and want the box
    they lie in to be the box the GPU drew: within 0.85 of a pixel as measured, 1.7 allowed.
12. **Stale wording** in this plan's interface list, in the design ("the picture does not
    change", "at any Scene Size") and in the module's header ("everything else is exact").
    Corrected.

Also since the review: the render checks make the slabs' flight and the bubbles again from
the arithmetic, frame for frame, and take up the body again once the cube has set.

## Breaking it on purpose

Each change was made to a copy of the branch and the checks run against it. A change that
nothing failed for got a check, or the line it changed was removed as doing nothing. Each run
began with nothing broken, which passed.

- **The arithmetic, first**: 151 breaks, 130 caught. Twenty of the 21 that slipped past got a
  check. The other was a small allowance added to the count of steps come due: it changed
  nothing at any frame rate tried, and was removed.
- **The arithmetic again, after the review**: those twenty and eighteen breaks of the lines
  the review changed and of the wiring. 38 breaks, 36 caught. The two: a step taken before
  all of it had come due, and the body's furthest point being only the last one looked at.
  Both have checks.
- **The scene** (`definition()` and the shaders, against the render block): 112 breaks, 102
  caught. The ten:
  1. **The bubbles not drawn at all.** Nothing had looked for them in the picture. A check
     now finds each bubble on the canvas and wants a glint brighter than the jelly round it:
     all 46 show one, by 46 to 168 of 765; with none drawn, four places do (the jelly's own
     highlights).
  2. **The time since the slabs started back not begun again.** A second thump's slabs would
     have been home at once. A check knocks the cube apart twice.
  3. **Stiffness left out of a slab's own wobble.** A check runs the thump at Stiffness 0.
  4. **A slab drawn with its squash and bend not held to their limits.** Now checked on every
     frame it is apart; the thump's own run passes the limits 44 times.
  5. **The slabs put in order before the cube's turn for the frame was set** (the review's
     fifth finding, put back). The scene now says how far each slab was from the camera when
     it was put in order, and the checks want that to be this frame's.
  6. **The flash left out of what brightens the jelly.** The one check that read it did so on
     a frame with a beat. It is now read through the thump and the return.
  7. **A bubble's size taking no account of the picture's size.** Checked with the picture
     enlarged a quarter and on the small page, whose picture is four times as sharp.
  8. **Each slab coloured as the middle of the cube.** A check reads the colour of the lowest
     and of the highest slab.
  9. **The bubbles' place in the drawing order as built.** It is set every frame, so the line
     did nothing, and is gone.
  10. **The cube counted as at rest whatever its squash and its flash.** Not caught, and it
      cannot be as the numbers stand: after a landing, a beat or a syllable the body goes on
      moving for 4.2 to 5.6 seconds, the squash for 2.1 to 4.6 and the flash for 2.6, at any
      Stiffness, so the body is never at rest first. The two conditions stay as a guard should
      a number change, and every frame of every run is now held to them: a cube whose squash
      or flash is unspent must have been worked out and sent again.

Run again against the new checks, the eleven that could be caught were.
