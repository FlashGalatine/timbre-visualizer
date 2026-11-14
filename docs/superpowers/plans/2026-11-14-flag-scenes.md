# Flag scenes implementation plan

**Goal:** the five flag effects become one 3D cloth flag on the scene kit.

**Architecture:** the arithmetic (flag table, voice history, lift, droop, cloth shape) and
the scene definition live in `overlay/flag.js` (`TimbreFlag`), importable under Node. Each
of the five factory files is one line. The kit is not changed.

**Tech stack:** classic scripts, no build; three.js r160 (vendored); `npm run verify`
(Node) and `npm run verify:render` (headless Edge or Chrome).

**Spec:** `docs/superpowers/specs/2026-11-14-flag-scenes-design.md`

## Global constraints

- Effect ids unchanged. `heartRate`, `stripeStyle`, `starTwinkle`, `burstChance` unchanged.
- No change to `overlay/scene-kit.js`, `scene-parts.js` or any other effect.
- Overlay and control `.html` pages are patched with a Node script, never edited by hand.
- Every rate is per second: the same sound gives the same picture at 30 and 60 fps.
- Checks are written and seen to fail before the code they check.

## Review focus

1. A flag hanging in silence must not reach the ground, for the longest flag (1.9).
2. The texture must be the right way up and not mirrored on the side facing the viewer.
3. A long frame (10 fps) must not smear the travelling gust.
4. Hearts and sparks in the air when the sound stops, or when a setting drops to 0.
5. Switching Stripe style back and forth must not grow GPU memory.

## Task 1: tables

`shared/viz-config.js`, `verify.mjs` sections 1 and 2.

- The five ids are in `VIZ_USES_3D` and `VIZ_SCENES` (after `winter-aurora`, in the order
  `pride-ribbon`, `bi-`, `ace-`, `trans-pride-ribbon`, `july-fourth-stripes`).
- `DEFAULT_PER_VIZ` as in the spec's Settings table, in that key order.
- `VIZ_LABELS`: the five display names; exported on `TIMBRE`.
- A saved pre-redesign config keeps `heartRate`, `stripeStyle`, `starTwinkle` and
  `burstChance` and drops `ribbonAmplitude` and `stripeAmplitude`.

## Task 2: `TimbreFlag` arithmetic

`overlay/flag.js`, a new section in `verify.mjs` (imported under Node).

- `HIST = 16`, `HIST_HZ = 16`, `NU = 56`, `NV = 22`, `HOIST = 2.3`, `TOP = 4.75`,
  `POLE_X = -2.5`.
- `FLAGS[id]` → `{ aspect, stripes, stripes8?, canton?, hearts?, sparks? }`; a stripe is
  `[r, g, b, share]`.
- `stripesOf(spec, eight)` → the stripe list in use.
- `starPoints()` → 50 `[x, y]` in fractions of the union (rows of 6 and 5).
- `paint(ctx, w, h, spec, eight)` and `paintStars(ctx, w, h, spec)` draw on the context
  they are handed.
- `createHistory()` → `{ step(level, dt), byAge }` (`byAge` is a `Float32Array(HIST)`,
  index 0 is now).
- `gusts(byAge, out)` → `out[0..NU]`, the history along the cloth, smoothed.
- `lift(wind)` → `fly` without the sway; `droop(fly, length)` → radians.
- `shape(out, p)` with `p = { length, fly, droop, phase, t, gust, low, high, kick }` writes
  `(NU + 1) × (NV + 1) × 3` numbers, rows top to bottom, columns pole to free end, origin at
  the top pole corner, and returns `out`.
- `measure(positions)` → `{ endX, endY, lowest, ripple }` (free end's top corner, lowest y,
  largest depth).

Checks: every row's length is the flag's length to 1e-6 whatever the ripple; the pole
column never moves; a flying flag reaches at least 0.9 of its length; a hanging one drops
and stays above the ground for every flag; a gust raises the ripple and a kick raises it
more; the history travels at 16 samples a second, glides, agrees at 30 and 60 fps and
survives a 10 fps frame; the flag table (colours, shares, palindrome, 13 stripes, 50
stars); all three pages load `flag.js` after `scene-parts.js` and before the factories.

## Task 3: the scene and the five factories

`overlay/flag.js` (`definition(id)`), the five files in `overlay/factories/`, the three
pages, `verify-render.mjs`.

`debug()` returns the state the checks read: `wind, fly, droop, kick, low, high, orbit,
phase, hist, hearts, heartsMade, heartFrom, sparks, bursts, flash, shine, stripes`, and
`endX, endY, lowest, ripple` from `measure`.

Checks (render suite, a `flagRun(id, steps, { fps, knobs })` helper like `auroraRun`):
each of the five is a kit scene with solid pixels, light on the ground and a transparent
corner; the flag is the right way up (rainbow: red above violet; July: blue at the top by
the pole); louder flies higher; silence still moves; the gust travels; 30 and 60 fps
agree; a beat snaps the cloth; Wind 0 and 100; Heart rate 0, 50, 100; hearts keep flying
when the sound stops; heart colours come from the flag's palette; Stripe style switches
six and eight stripes without growing GPU memory; Burst chance 0 and 100; sparks die out;
Star twinkle; Camera drift; placement; script time under 4 ms.

## Task 4: control panel names

`control/control.html` (Node patch): the list shows `T.VIZ_LABELS[name]` when there is
one.

## Task 5: documents

`docs/EFFECTS.md`, `CHANGELOG.md`, `README.md` where it describes these effects.

## Found during the build

- The Node check that compared the voice history at 10 and 60 fps fed it a raw step, which
  the scene never does (it feeds the kit's envelope). It is now two checks: a steadily
  rising level at 10 fps gives evenly spaced samples (none written twice), and a syllable
  shaped by the envelope stays within 0.22 of the 60 fps history (measured 0.18, all of it
  in the one sample at the attack).
- Ripples shorten a flying flag's reach, so the render check tells flying from hanging by
  the free end's height alone.
- A level that stays loud is two or three beats to the kit, because its running average
  takes a moment to catch up. So a long loud note sets off up to three bursts, not one.
- A flag makes five GL textures (three render targets, a shadow map, its picture), so the
  kit's "a scene deletes every GL texture it made" check now asks for more than three made,
  where it asked for more than five.
- Thresholds measured on the 16:9 page (1728 by 624 canvas) and set to 60%: about 109,000
  solid pixels, 118,000 pixels of light on the ground, 12,300 dark pixels in the black
  stripe of the eight-stripe rainbow.
- The first render run was not made before the scene existed: with the five ids listed as
  kit scenes and still drawn in 2D, the suite's own loops over `VIZ_SCENES` crash. The
  render checks were first run against the finished scene; what each one catches is shown
  by breaking the code on purpose after the review.

## Task 6: review

One independent review of the branch, then fixes, each with a check first.
