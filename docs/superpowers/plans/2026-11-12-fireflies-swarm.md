# Fireflies (living swarm) Implementation Plan

**Goal:** Replace the square-particle Fireflies with a swarm of soft fireflies that answers the voice.

**Architecture:** The swarm lives in a new Node-loadable `overlay/fireflies-swarm.js`
(`globalThis.TimbreSwarm`); `overlay/factories/fireflies.js` reads the sound, steps it and draws.
It reuses `TimbreHelix.levels`, `follow`, `threshold`, `peakOf`, `rng` and the `micPeak` global.

**Spec:** `docs/superpowers/specs/2026-11-12-fireflies-swarm-design.md`

**How it is run:** by one builder, test-first, in this order, with one independent review of the
whole branch at the end. The owner's look in OBS with the real mic comes last and decides the merge.

## Global constraints

- Classic scripts, no build. Timed from `draw(now, dt)`; only colour reads the wall clock.
- Tests use side ports 7476 / 8090 only. Never ports 7474 or 8080.
- `control/control.html` is not edited. The overlay pages are patched from a script, not opened.
- The canvas state is left as it was found.

## Task 1: Settings

- `shared/viz-config.js`: `'fireflies': { density: 50, startleSensitivity: 50 }`.
- `verify.mjs` section 2: the defaults; an old saved `{ density: 80 }` gains the new default.

## Task 2: `TimbreSwarm`

- Create `overlay/fireflies-swarm.js`; add its script tag after `comet-flight.js` in the three pages.
- `verify.mjs` section 9, written first, with `TimbreHelix.rng` as the random source: the checks
  listed under "Testing" in the spec.

## Task 3: The effect

- Rewrite `overlay/factories/fireflies.js` to the spec, with `probe()` returning
  `{ n, lit, flashes, startles, waves, inside, loud, sync, low, high, haloScale, firstX, firstY }`.
- `verify-render.mjs`, written first: the Fireflies checks listed in the spec, through the shared
  `effectRun` runner, and the two sliders in the control panel.

## Task 4: Documents

- `docs/EFFECTS.md`: a short `TimbreSwarm` section. `CHANGELOG.md`: Unreleased entries.
- `verify.mjs` and `verify-render.mjs` header comments.

## Review focus

1. A size change or a Density change mid-flight: no firefly outside the frame, none popping.
2. A very long frame (dt at its 0.1 s cap): a ripple must not skip fireflies or nudge one twice.
3. Mic opening on a loud moment: no startle.
4. Chain reactions: ripples setting off ripples must die out, never run away.
5. Another effect drawn straight after Fireflies: it must leave no blend mode behind.
