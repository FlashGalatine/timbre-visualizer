# Pulse Rings (ringed planet) Implementation Plan

**Goal:** Replace the square-dot Pulse Rings with a ringed planet whose rings ripple with the voice
and which explodes on a hard peak and comes back together.

**Architecture:** What Pulse Rings and the coming Orbit share lives in a new Node-loadable
`overlay/planets.js` (`globalThis.TimbrePlanets`). The explosion reuses DNA's machine,
`TimbreHelix.createShatter`, with one new option (`aim`). `overlay/factories/pulse-rings.js` reads
the sound, steps both and draws.

**Spec:** `docs/superpowers/specs/2026-11-12-pulse-rings-planet-design.md`

**How it is run:** by one builder, test-first, in this order, with one independent review of the
whole branch at the end. Orbit and Black Hole follow on their own branches, stacked on this one.
The owner's look in OBS with the real mic comes last and decides the merge.

## Global constraints

- Classic scripts, no build. Timed from `draw(now, dt)`; only colour reads the wall clock.
- Tests use side ports 7476 / 8090 only. Never ports 7474 or 8080.
- `control/control.html` is not edited. The overlay pages are patched from a script, not opened.
- The canvas state is left as it was found.
- DNA must behave exactly as before: its checks stay green untouched.

## Task 1: Settings

- `shared/viz-config.js`: `'pulse-rings': { sensitivity: 50, flow: 0, explodeSensitivity: 50,
  reconnectSeconds: 3 }`; `PER_VIZ_MAX['pulse-rings'] = { reconnectSeconds: 10 }`.
- `verify.mjs` section 2: the defaults, the clamps, an old saved `{ sensitivity: 80, flow: 30 }`
  gains the new defaults.

## Task 2: `TimbreHelix.createShatter({ aim })`

- `aim(x, y, W, H, scale, random)` returns the angle a blast pushes the piece at `(x, y)`. Used
  for the shatter and for a blast during the return; a jostle stays random.
- `verify.mjs` section 7: with `aim`, every piece's first move is along the aimed angle; without
  it, a seeded DNA blast gives the same offsets as before this change (recorded first).

## Task 3: `TimbrePlanets`

- Create `overlay/planets.js`; add its script tag after `fireflies-swarm.js` in the three pages.
- `verify.mjs` section 10, written first:
  - `place`, `reach`, `fit`: an orbit of the fitted radius stays inside the frame on three sizes.
  - `createEcho`: `heard(delay)` returns what was noted `delay` ago, at 30, 60 and 144 fps; its
    memory is bounded.
  - `createRings`: at rest every band is whole; a syllable reaches the outer edge 0.95 s after
    the inner one, at any frame rate; a blast thins the bands inner first and swells them, and
    they settle at their own radius; a refill fills inner first; Flow widens the disc.
  - `crack`: 22 convex chunks that tile the disc, none a sliver, the same for the same seed.

## Task 4: The effect

- Rewrite `overlay/factories/pulse-rings.js` to the spec, with `probe()`.
- `verify-render.mjs`, written first: the Pulse Rings checks listed in the spec, through the
  shared `effectRun` runner, and the four sliders in the control panel.

## Task 5: Documents

- `docs/EFFECTS.md`: a `TimbrePlanets` section and the `aim` option. `CHANGELOG.md`: Unreleased.
- `verify.mjs` and `verify-render.mjs` header comments.

## After the review

The whole-branch review found nothing critical or important. Fixed in one wave, each with a check
written first: the rings started to refill one or two frames before the snap, more at low frame
rates (the ring disc is now told the moment itself); a second blast while the rings were still
swollen sprang them back in one frame; the planet changed size in one frame when it came back
together; each chunk painted every cloud band whether it crossed the chunk or not. Checks were
added or tightened for what the review found untested: the rings at three frame rates to a
millionth, a blast and a refill part of the way through a long frame, the canvas state in pieces
and on the way back (with line settings and a clip check), the refill on real pages at three
frame rates, and a config push while whole. Left alone and listed in the spec: the calm wait
ending on a whole frame.

## Review focus

1. DNA after the `aim` change: any difference at all in how it shatters.
2. A size change or a config push while the planet is in pieces.
3. A very long frame (dt at its 0.1 s cap): the ripple and the refill must not skip or stall.
4. The mic opening on a loud moment: no explosion.
5. Another effect drawn straight after Pulse Rings: it must leave no clip, blend mode or transform behind.
