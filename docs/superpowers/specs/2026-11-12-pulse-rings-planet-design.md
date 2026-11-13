# Pulse Rings: a ringed planet

Status: the owner described the effect on 12 November 2026, skipped the design questions, looked at
a throwaway version in the effect gallery and said "Build all three" (Pulse Rings, Orbit and a new
Black Hole; this document covers Pulse Rings). Every choice below is the builder's unless it says
otherwise. The owner has not yet seen it with a real microphone or in OBS; that look decides whether
it is merged.

## Intent

Pulse Rings is on the redesign list of issue #1. The owner's brief, in their words: it "should
resemble a ripple effect around a planetary object. Sort of like the rings of Saturn. If I'm
yelling or thumping my mic, the planet explodes and then reassembles itself after a few seconds of
quiet." The old effect threw rings of square dots outward from a square in the centre.

## Goals

- A smooth glowing planet with a tilted ring disc; no square blocks.
- The voice shows as ripples travelling through the rings, syllable by syllable.
- A yell or a mic thump blows the planet apart; after a quiet wait it comes back together.
- Ordinary talking never sets the explosion off, and neither does the mic opening.

## Non-goals

- Rings that are thrown off the planet and fly away (the old motion). The rings stay and ripple.
  (The builder's choice: the owner skipped the question that asked.)
- Any change to how DNA shatters.

## Anti-goals

- Rings that all light at once while talking: the ripple must be seen to travel.
- A chunk leaving the frame or staying stuck outside the planet after the return.
- The effect going dark while the planet is in pieces: the voice must still show.

## Constraints

- Classic script, no build step, 2D canvas only. Timed in seconds from `draw(now, dt)`; only the
  colour reads the wall clock.
- Works on all three overlay pages (260×130 at scale 1, 1248×624 and 1728×624 at scale 4.8) and
  when the box changes size.
- Leaves the canvas state as it found it.
- Under 1.5 ms of script time per frame on the 16:9 page, whole or in pieces.

## The planet

Radius `24 × scale`, swelling up to 7% with the low end of the sound (opens over 0.05 s, closes over
0.25 s). It is drawn as a lit sphere in a palette colour (palette offset 0.5): a highlight up and to
the left, a dark limb, five cloud bands that follow the planet's lean, and a pale storm that moves
round it, faster with loudness (`0.25 + 1.6 × loud` rad/s). A soft glow surrounds it, brighter with
loudness.

## The rings

A flat disc from 1.34 planet radii to `3.1 + Flow / 100` planet radii, seen tilted (flattened to
0.36 of its width) and leaning 0.28 rad. It is 30 bands. The far half is drawn before the planet and
the near half after, so the planet hides part of the far half.

At rest the bands have a Saturn-like brightness: a faint inner ring, a bright broad ring, a dark
gap, a second ring, a thin outer ring.

**The ripple.** The fast loudness (0.045 s smoothing) times a gain of `0.6 + 1.1 × Sensitivity / 100`
(1.15 at the default) is fed in at the inner edge and travels to the outer edge in 0.95 s. Each
band shows the level that was fed in `0.95 × u` seconds ago (`u` is 0 at the inner edge, 1 at the
outer). A band's opacity is its rest brightness × `(0.13 + 0.87 × level)`; it is whitened by
`0.55 × level²`; and it is lifted off the disc by `level × 3.2 × scale × (0.4 + 0.6 × u)`.

**Ice.** 64 specks orbit in the disc, the inner ones faster, all faster with loudness. Their
brightness follows their band's level and glitters with the high end.

## The explosion

The whole / pieces / returning machine is DNA's (`TimbreHelix.createShatter`), given one new
option: where a blast aims each piece. Here every piece is aimed away from the middle of the frame,
give or take half a radian.

- Trigger: the raw input peak (`micPeak`, else the waveform's peak; never scaled by Gain) reaching
  `TimbreHelix.threshold(Explode Sensitivity)`: the same rule as DNA's Shatter Sensitivity.
- The planet's disc is cut into 22 chunks along random straight cracks, always splitting the
  largest chunk left, across its longest reach.
- A flash, and a shock ring that sweeps out in the plane of the rings over 0.8 s.
- The rings are blown thin. As the shock reaches each band (inner bands first) the band flares to
  full brightness, whitened and lifted like a full ripple, and swells outward by up to 35%; the
  flare and the swell die away over 0.7 s while the band falls to 42%. They keep rippling with
  the voice. A second blast while a band is still swollen from the first (only possible with a
  very short Reconnect Seconds) leaves it the larger of the two swells, so no band springs back.
- A glowing core stays where the planet was and beats with the voice.
- After `Reconnect Seconds` without a peak, the chunks drift back and snap together (DNA's return
  curve, 1.5 s). The rings fill back in from the inside out, starting at the moment the snap
  starts (78% of the way through the return), whatever the frame rate.
- The planet was cut at the size the sound had swollen it to. It comes back together at that
  size and only then relaxes (over 0.25 s) to what the sound says now.
- A peak while in pieces jostles the chunks; a peak during the return blows them out again. Both
  are DNA's rules.

## Quiet and muted

Mic on and silent: the rings rest dim, the planet glows faintly, the storm and the ice turn slowly.
Mic off with the idle animation on: a slow ripple (`0.2 + 0.25 × max(0, sin(1.4 t))³`) keeps
crossing the rings and the planet breathes. Mic off with the idle animation off: as silent.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| `sensitivity` (existing) | 50 | How strongly the rings answer the voice. (It was how easily a ring was thrown.) |
| `flow` (existing) | 0 | How far out the rings reach: 3.1 to 4.1 planet radii. (It stretched the rings sideways.) |
| `explodeSensitivity` (new) | 50 | How easily a peak blows the planet apart; 0 turns it off |
| `reconnectSeconds` (new) | 3 | Seconds without a peak before the chunks come back, up to 10 |

The control panel builds all four sliders from the settings table; no control-panel change.

## Code

- `overlay/planets.js`, `globalThis.TimbrePlanets`: what Pulse Rings and Orbit share. The tilted
  projection (`place`, `reach`, `fit`), the loudness memory (`createEcho`), the ring disc
  (`ringRest`, `createRings`), the cracks (`crack`), colour helpers, and two helpers that take the
  canvas context as an argument: `bodyFill` (a lit sphere's fill) and `paintBands` (its cloud
  bands). Loadable under Node. Loaded by all three overlay pages after `fireflies-swarm.js`.
- The ring disc is told about a blast or a refill through `step()`, with how long before the end
  of that step it happened, so both count from the moment itself.
- `overlay/helix.js`: `createShatter({ random, aim })`. Without `aim` it behaves exactly as before.
  It also exports `HANDOVER_U`, the share of the return after which the snap starts.
- `overlay/factories/pulse-rings.js`: the effect. Random choices come from
  `TimbreHelix.rng(window.__pulseRingsSeed)`. `probe()` for the tests.
- A size change while in pieces puts the planet back whole (the machine's own rule).

## Testing

- `npm run verify`: the settings; `TimbrePlanets` under Node (projection and fit, the echo at
  three frame rates, the ripple's travel, the blast and the refill, the cracks tiling the disc);
  the new `aim` option, and that DNA's blast is unchanged without it.
- `npm run verify:render`: on real pages with scripted sound (draws on all three pages, the ripple
  travels outward, louder is brighter, the low end swells the planet, the explosion and its guards,
  the return, the rings while in pieces, quiet states, the four settings, config push and size
  change, a seeded run, canvas state, cost, the four sliders).
- Whether it looks like a ringed planet is judged by eye; no test measures it.

## Known and left alone

- The calm wait before the return ends on a whole frame (DNA's machine): at some frame rates the
  return starts one frame later than at others. At 60 fps that is 0.017 s.
- Each chunk paints only the cloud bands that cross it, worked out when it is cut. A chunk still
  paints the storm only when the storm is over it.

## Not checked by any test

- A real microphone: whether a yell reaches the threshold at the default, and whether real speech
  gives ripples as clear as the scripted speech does.
- The frame rate in OBS.
