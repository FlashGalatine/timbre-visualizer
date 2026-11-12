# Comet (smooth) Implementation Plan

**Goal:** Replace the blocky Comet with a smooth glowing comet that follows the voice.

**Architecture:** The numbers live in a new Node-loadable `overlay/comet-flight.js`
(`globalThis.TimbreComet`); `overlay/factories/comet.js` reads the sound, calls it and draws. It
reuses `TimbreHelix.levels`, `follow`, `threshold`, `peakOf`, `rng` and the `micPeak` global.

**Spec:** `docs/superpowers/specs/2026-11-12-comet-smooth-design.md`

**How it is run:** by one builder, test-first, in this order, with one independent review of the
whole branch at the end. The owner's look in OBS with the real mic comes last and decides the merge.

## Global constraints

- Classic scripts, no build. Timed from `draw(now, dt)`; only colour reads the wall clock.
- Tests use side ports 7476 / 8090 only. Never ports 7474 or 8080.
- `control/control.html` is not edited.
- The canvas state is left as it was found.

## Task 1: Settings

- `shared/viz-config.js`: `'comet': { trail: 50, flareSensitivity: 50 }`.
- `verify.mjs` section 2: the defaults; an old saved `{ trail: 80 }` gains `flareSensitivity: 50`.

## Task 2: `TimbreComet`

- Create `overlay/comet-flight.js`; add its script tag after `helix.js` in the three overlay pages.
- `verify.mjs` section 8, written first:
  - `at()` stays inside the margin for every angle, reach and lean; the head never stalls
    (smallest speed over a full figure, for lean from −0.35 to 0.35, is above zero).
  - `speed`, `reach`, `tailLength`, `radius`, `alpha` give the spec's values at silence and at full
    loudness; `radius` and `alpha` fall from head to tip; `alpha` is 0 at the tip.
  - `createTrail` + `fly`: at 10, 30, 60 and 165 frames a second the remembered points are never
    more than one step apart, the count stays bounded, and the memory never exceeds `keep`.
  - `createFlare`: fires once on a peak, again only after 0.7 s, never with the mic off, never at
    threshold Infinity, and not when the mic opens on a peak.
  - The three pages load `comet-flight.js` after `helix.js` and before the factories.

## Task 3: The effect

- Rewrite `overlay/factories/comet.js` to the spec, with `probe()` returning
  `{ theta, speed, reach, bright, tail, points, inside, coma, sparks, rings, flares }`.
- `verify-render.mjs`, written first: turn `dnaRun` into a runner shared by DNA and Comet, then the
  Comet checks listed under "Testing" in the spec, and the two sliders in the control panel.

## Task 4: Documents

- `docs/EFFECTS.md`: a short `TimbreComet` section. `CHANGELOG.md`: Unreleased entries.
- `verify.mjs` header comment: section 8.

## After the review

The whole-branch review found nothing critical. Fixed in one wave, each with a check written first:
bulges trimmed to 1.25 times the tail nearer the head; a fresh tail tapers to nothing; a fresh head
starts at the reach the frame starts from. Checks were added for what the review found untested (the
glow, the remembered level, the low and high ends, the mic opening on a loud moment, the shadow
offset and transform left behind). Left alone and listed in the spec: the stale-cache case, the
flare's ring and sparks running off the edge, and Trail 0 on the smallest page.

## Review focus

1. A size change mid-flight: the tail must not draw at stale positions or outside the frame.
2. A very long frame (dt at its 0.1 s cap) while loud: the path must stay a smooth curve.
3. Mic opening on a loud moment: no flare.
4. Trail at 0 and at 100: a visible tail at 0; no slowdown at 100.
5. Another effect drawn straight after Comet: Comet must leave no blend mode or shadow behind.
