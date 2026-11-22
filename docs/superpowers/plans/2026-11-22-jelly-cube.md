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
  `atRest(body)`, `still(body)`, `locate(cells, fracs, at, x, y, z)`, `sample(...)`,
  `shapeBody(pos, stir, body, home, cells, fracs, squash)` -> reach, `land(body)`.
- Springs: `spring(sw, dt, rate, damp, to)` (exact: two half steps are one whole),
  `shownSquash(q)`, `wideFor(q)`.
- Slabs: `createSlabs()`, `throwSlabs(sl, strength, random, fresh)`, `flySlabs(sl, dt, firm)`,
  `wobbleSlabs(sl, dt, rise, bands, firm)`, `showSlabs(sl, clock)`, `startBack(sl)`,
  `backShare(u, i)`, `placeSlabs(sl, u, clock)` -> landings, `resumeSlabs(sl)`, `plop(sl, i)`,
  `homeSlabs(sl)`, `slabPoint(out, sl, i, x, y, z)`, `reachOf(sl)`.
- Room: `limitFor(enlarged)`, `roomFor(reach, limit)`, `zoomAfter(zoom, room, dt)`.
- Camera and light: `turnAt(out, clock)`, `orbitAt(t, drift)`, `glowOf(flame, kick, flash)`.

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
