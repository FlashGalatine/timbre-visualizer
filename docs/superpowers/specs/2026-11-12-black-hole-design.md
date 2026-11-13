# Black Hole: light, comets and fireflies falling in

Status: the owner proposed the effect on 12 November 2026 as a variant of the new Pulse Rings and
Orbit, skipped the design questions, looked at a throwaway version in the effect gallery and said
"Build all three" (this document covers Black Hole). Every choice below is the builder's unless it
says otherwise. The owner has not yet seen it with a real microphone or in OBS; that look decides
whether it is merged. This branch is stacked on the Orbit branch.

## Intent

A new effect, the fiftieth. The owner's brief, in their words: "another variant similar to these
two and call it Black Hole where light effects, comets, and fireflies are sucked into center."
What the voice does was not said; the choices below are the builder's and the owner was told so.

## Goals

- A black hole that reads as one at a glance: a dark disc, a bright rim, a tilted disc of gas.
- Streaks of light, small comets and fireflies visibly spiral in and vanish into it.
- The voice visibly feeds it: more falls in, faster, and each syllable shows.
- A reaction to a real yell or a mic thump, and none to ordinary talking.

## Non-goals

- Reusing the Comet or Fireflies effects' own behaviour. The comets and fireflies here are
  look-alikes drawn by this effect.
- Physically correct bending of light.

## Anti-goals

- An empty frame while someone is talking.
- Things that pile up without limit, or a hole that stops swallowing.
- A gulp during normal speech, or the moment the mic opens.

## Constraints

- Classic script, no build step, 2D canvas only. Timed in seconds from `draw(now, dt)`; only the
  colour reads the wall clock.
- Works on all three overlay pages (260×130 at scale 1, 1248×624 and 1728×624 at scale 4.8) and
  when the box changes size.
- Leaves the canvas state as it found it.
- Under 1.5 ms of script time per frame on the 16:9 page at the highest Density with a loud voice.
- The hole is drawn solid black. Every other effect in this family only adds light; this one
  hides what is behind its centre. The owner was told.

## The hole

Radius `12 × scale`, swelling up to 12% with the low end of the sound and up to 10% more while it
is feeding. A solid black disc, a thin bright rim, and a soft ring of light round it (the light
bent round the hole), all brighter the louder the voice and the more it has just swallowed.

**The gas.** A flat disc from 1.5 to 4.4 hole radii, seen tilted (flattened to 0.36 of its width)
and leaning 0.2 rad, in 16 bands, brighter toward the hole, lit in lumps that turn (the inner
bands faster), faster with loudness. The far half is drawn before the hole and the near half
after. The loudness is fed in at the outer edge and travels to the inner edge in 0.8 s, so each
syllable is a ripple running into the hole: the reverse of Pulse Rings.

## What falls in

Three kinds of thing: streaks of light (half of them), small comets with a glowing head and a
tail (about a fifth), and fireflies that blink and flicker with the high end (the rest).

- **Where they start.** Beyond the sides of the frame: each on its own tilted circle (flattened
  to 0.28 to 0.52, leaning −0.2 ± 0.25 rad) of a radius that puts it at least 10 px × scale
  outside the frame's sides. They fade in over half a second.
- **How they fall.** All go the same way round. A thing at radius `r` turns at
  `1.6 × (4 hole radii / r)^1.5 × whirl` rad/s (at most 14) and its radius shrinks at
  `r × (0.26 × pull + 2.2 × min(1, 2 hole radii / r)³ × (0.5 + 0.5 × min(pull, 4)))` a second:
  slowly far out, a plunge close in. `pull = 0.45 + 1.9 × loud + 0.8 × fast + 25 × gulp` and
  `whirl = 0.6 + 0.5 × min(pull, 4)`.
- **Trails.** Each leaves a ribbon along where it has just been (0.45 s for a streak, 0.6 s for a
  comet, 0.16 s for a firefly), from places remembered every thirtieth of a second.
- **The end.** Inside 1.12 hole radii it is gone, and the hole's rim flares (`feed`, which falls
  away over 0.3 s).
- **How many.** New things arrive at `(1.3 + 10 × loud) × rate` a second, plus a handful
  (`(3 + 5 × fast) × rate`) when a syllable starts. `rate` is 0.4 to 1.6 by Density (1 at 50).
  There are never more than 30 to 100 by Density (65 at 50).

## The gulp (the builder's addition)

When the raw input peak (`micPeak`, else the waveform's peak; never scaled by Gain) reaches
`TimbreHelix.threshold(Gulp Sensitivity)`, the hole gulps: `gulp` jumps to 1 and falls away over
0.3 s, which pulls everything in sight into the hole within about a second. A fifth of a second
later a jet of light fires from each pole (along the gas disc's axis) and a ring of light sweeps
out through the gas; both fade within about a second. At most one gulp every 1.5 s, counted only
while the mic is on. `gulpSensitivity` 0 turns it off.

## Quiet and muted

Mic on and silent, or mic off: a slow trickle keeps drifting in (about 1.3 things a second at the
default Density, each taking some twenty seconds to fall). Mic off with the idle animation on:
the hole breathes (`low = 0.2 + 0.12 × sin(now / 800)`).

## Settings

| Setting | Default | Meaning |
|---|---|---|
| `density` | 50 | How much falls in: how often things arrive and the most there can be |
| `gulpSensitivity` | 50 | How easily a peak makes the hole gulp; 0 turns it off |

The effect is listed after Pulse Rings. The control panel builds both sliders and the list entry
from the settings table; no control-panel change.

## Code

- `overlay/infall.js`, `globalThis.TimbreInfall`: what falls in (`createInfall({ random })`,
  driven by `step({ dt, live, loud, peak, threshold, density, W, H, scale })`, which returns
  `'gulp'` on the frame the hole gulps), and `most(density)`, `rate(density)`. Loadable under
  Node; uses `TimbrePlanets.place`. Loaded by all three overlay pages after `planets.js`.
- `overlay/factories/black-hole.js`: the effect. Random choices come from
  `TimbreHelix.rng(window.__blackHoleSeed)`. `probe()` for the tests.
- `shared/viz-config.js`: the name `black-hole` after `pulse-rings`, and its two settings.
- README, `package.json` and the tests' effect count: 50.

## Testing

- `npm run verify`: the tables and settings; the infall under Node with a seeded random source
  (how many and how often, where things start, falling faster close in, the population quiet and
  loud, the limit, the syllable burst, the gulp and its guards, frame-rate independence, long
  frames, the trail memory).
- `npm run verify:render`: on real pages with scripted sound (draws on all three pages, the
  centre is solid black, louder feeds it more, the ripple runs inward, the low end swells the
  hole, the gulp and its guards, quiet states, Density, config push and size change, a seeded
  run, canvas state, cost, the two sliders and the list entry).
- Whether it looks like a black hole is judged by eye; no test measures it.

## Not checked by any test

- A real microphone: whether real speech keeps the frame full, and whether a yell reaches the
  threshold at the default.
- The frame rate in OBS, where this effect draws the most of the three.
- OBS's own browser: the turning lumps in the gas use `createConicGradient`; where that is
  missing the gas is drawn evenly lit instead.
