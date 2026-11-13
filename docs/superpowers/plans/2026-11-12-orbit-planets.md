# Orbit (planets round a sun) Implementation Plan

**Goal:** Replace the square-dot Orbit with a sun and planets on tilted orbits that speed up with
the sound.

**Architecture:** The system (how many planets, their orbits, speeds, fading and the flare gate)
is `TimbrePlanets.createSystem` in `overlay/planets.js`, which the Pulse Rings branch created.
`overlay/factories/orbit.js` reads the sound, steps it and draws, using the same projection and
sphere shading as Pulse Rings.

**Spec:** `docs/superpowers/specs/2026-11-12-orbit-planets-design.md`

**How it is run:** by one builder, test-first, with one independent review of this branch's own
changes at the end. Stacked on `feat/pulse-rings-planet`.

## Global constraints

- Classic scripts, no build. Timed from `draw(now, dt)`; only colour reads the wall clock.
- Tests use side ports 7476 / 8090 only. Never ports 7474 or 8080.
- `control/control.html` is not edited. No overlay page changes (no new file is loaded).
- The canvas state is left as it was found.

## Task 1: Settings

- `shared/viz-config.js`: `'orbit': { planets: 6, flareSensitivity: 50 }`;
  `PER_VIZ_MAX.orbit = { planets: 9 }`.
- `verify.mjs` section 2: the defaults, the clamps, an old saved `{ density: 80 }` loses it.

## Task 2: `TimbrePlanets.createSystem`

- `verify.mjs` section 10, written first: the checks listed under "Testing" in the spec.

## Task 3: The effect

- Rewrite `overlay/factories/orbit.js` to the spec, with `probe()`.
- `verify-render.mjs`, written first: the Orbit checks listed in the spec, through the shared
  `effectRun` runner, and the two sliders in the control panel.

## Task 4: Documents

- `docs/EFFECTS.md` ("Planets"), `CHANGELOG.md` (Unreleased), the two test files' headers.

## Review focus

1. The number of planets moved while they fly: none popping, none left behind, none drawn twice.
2. A size change: no planet outside the new frame, no jump.
3. A very long frame (dt at its 0.1 s cap) at full voice: no planet may skip past the wrap.
4. The mic opening on a loud moment: no flare.
5. Another effect drawn straight after Orbit: no clip, blend mode, alpha or transform left behind.
