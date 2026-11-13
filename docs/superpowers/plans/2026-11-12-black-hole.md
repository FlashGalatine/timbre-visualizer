# Black Hole Implementation Plan

**Goal:** Add a new effect, Black Hole: light, comets and fireflies spiral into a dark centre,
fed by the voice.

**Architecture:** What falls in (arrival, the spiral, trails, the end, the gulp gate) is a new
Node-loadable `overlay/infall.js` (`globalThis.TimbreInfall`). `overlay/factories/black-hole.js`
reads the sound, steps it and draws the hole, its gas and everything falling. It reuses
`TimbrePlanets.place` and `createEcho`, and `TimbreHelix`'s levels, threshold and random source.

**Spec:** `docs/superpowers/specs/2026-11-12-black-hole-design.md`

**How it is run:** by one builder, test-first, with one independent review of this branch's own
changes at the end. Stacked on `feat/orbit-planets`.

## Global constraints

- Classic scripts, no build. Timed from `draw(now, dt)`; only colour reads the wall clock.
- Tests use side ports 7476 / 8090 only. Never ports 7474 or 8080.
- `control/control.html` is not edited. The overlay pages are patched from a script, not opened.
- The canvas state is left as it was found.

## Task 1: Tables and settings

- `shared/viz-config.js`: `'black-hole'` after `'pulse-rings'` in `ACTIVE_VIZ_NAMES`;
  `'black-hole': { density: 50, gulpSensitivity: 50 }`.
- `verify.mjs`: 50 visualizers; the defaults and clamps. A factory file and a script tag on all
  three pages are needed for section 1 to pass (Task 3).

## Task 2: `TimbreInfall`

- Create `overlay/infall.js`; add its script tag after `planets.js` in the three pages.
- `verify.mjs` section 11, written first: the checks listed under "Testing" in the spec.

## Task 3: The effect

- Create `overlay/factories/black-hole.js` with `probe()`; add its script tag after
  `factories/pulse-rings.js` in the three pages.
- `verify-render.mjs`, written first: the Black Hole checks listed in the spec, through the
  shared `effectRun` runner, the two sliders and the list entry.

## Task 4: Documents

- `docs/EFFECTS.md` ("Infall"), `CHANGELOG.md` (Unreleased), README and `package.json` (50
  effects), the two test files' headers.

## After the review

The review of this branch found two important things and several small ones. Fixed in one wave,
each with a check written first: a quarter to nearly half of the things appeared inside the frame
(only their circles reached beyond it); a swallowed thing vanished in one frame with its whole
trail at full brightness (it now stops and its trail drains in); the jets lasted two seconds
where the spec said about one; the far half of the gulp's ring was drawn in front of the hole; a
trail was drawn wholly on its head's side of the hole; a gulp pulled harder, and its jets fired
later, at low frame rates. The effect also draws less: the gas's three gradients are made once a
frame, nothing is sorted, the bent light no longer paints under the hole, and distant trails use
half their points. Checks were added for what the review found untested: where each thing starts,
the hole black across its upper half, the trails and the jets on the canvas, the canvas state on
gulp frames with unusual line settings, speech at three frame rates, and a gulp at three frame
rates. Left alone and listed in the spec: a lasting syllable's extra handfuls, and things
crossing in front of the hole.

## Review focus

1. Things that never reach the hole, or a population that only grows.
2. A very long frame (dt at its 0.1 s cap) during a gulp: nothing may jump past the hole or go negative.
3. The mic opening on a loud moment: no gulp.
4. A size change with things in flight.
5. Another effect drawn straight after Black Hole: no blend mode, alpha or transform left behind.
