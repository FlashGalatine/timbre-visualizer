# Orbit: planets round a sun

Status: the owner described the effect on 12 November 2026, skipped the design questions, looked at
a throwaway version in the effect gallery and said "Build all three" (Pulse Rings, Orbit and a new
Black Hole; this document covers Orbit). Every choice below is the builder's unless it says
otherwise. The owner has not yet seen it with a real microphone or in OBS; that look decides whether
it is merged. This branch is stacked on the Pulse Rings branch, whose `overlay/planets.js` it uses.

## Intent

Orbit is on the redesign list of issue #1. The owner's brief, in their words: "planets orbiting
around a sun-like object. The sound would influence the speed that the planets are orbiting. Note
that each planet should have a slightly different tilted axis. The number of planets are
configurable in the settings. Sound sources with a lot of bass would make the sun expand and
contract." The old effect was short-lived square dots circling a square core.

## Goals

- A glowing sun and smooth planets that visibly go round it, behind it and in front of it.
- Louder sound makes every planet orbit faster.
- Each orbit is tilted a little differently, and each planet leans on its own axis.
- A setting for how many planets there are.
- The low end of the sound makes the sun swell and shrink.

## Non-goals

- Telling real bass apart from a speaking voice. The plugin's sound data is 32 bands of 750 Hz,
  so the "low end" (the first two bands) holds most of a voice as well as bass. The owner was
  told; finer sound data is a change to the capture code, not to this effect.
- A planet that explodes (that is Pulse Rings).

## Anti-goals

- A planet leaving the frame, or popping in or out when the number changes.
- Planets that jump when the box changes size.
- A flare during normal speech, or the moment the mic opens.

## Constraints

- Classic script, no build step, 2D canvas only. Timed in seconds from `draw(now, dt)`; only the
  colour reads the wall clock.
- Works on all three overlay pages (260×130 at scale 1, 1248×624 and 1728×624 at scale 4.8) and
  when the box changes size.
- Leaves the canvas state as it found it.
- Under 1.5 ms of script time per frame on the 16:9 page with nine planets and a loud voice.

## The system

**How many.** The `planets` setting, 0 to 9 (default 6). 0 leaves the sun alone. A new planet
fades in over 0.8 s; a removed one fades out over 0.5 s. A planet still fading out is brought
back before a new one is made, so dragging the setting never shows more than nine.

**Orbits.** Each planet has its own orbit: a circle seen tilted (flattened to `0.35 ± 0.06` of its
width) and leaning (`-0.2 ± 0.16` rad). The innermost orbit has a radius of 2.7 sun radii (or half
the outermost, if that is less); the outermost is the largest that keeps the most tilted orbit
there is, fading ones included, 9 px × scale inside the frame; the rest are spaced between them
(`(j / (n − 1))^0.9`). A single planet sits 45% of the way out. The planet with rings keeps
7 px × scale farther from the frame, so its rings stay inside too.

When the number of planets or the frame changes, each orbit's radius eases to its new value
(time constant 0.5 s, so it has settled after about a second and a half); angles are kept. A new
planet starts on its final orbit. When the frame shrinks, an orbit that is now too wide tightens
the same way, and meanwhile each planet is held inside the frame where it is on its orbit: only a
planet the shrink left outside the frame moves at once.

**Motion.** All planets go the same way round. Planet `j` turns at
`(2π / 9) × (innermost radius / its radius)^0.8 × speed` rad/s, so inner planets lap faster.
`speed = 0.4 + 2.3 × loud + 1.0 × fast + 2.5 × flare`, where `loud` is the loudness smoothed over
0.25 s and `fast` over 0.05 s. Silent, the innermost planet laps in 22.5 s; at full voice in about
2.4 s.

**Depth.** The lower half of an orbit is nearer the viewer. A planet is drawn 20% larger at its
nearest and 20% smaller at its farthest. The far half of every orbit, with whatever is on it, is
drawn before the sun and the near half after, so the sun hides what passes behind it. Within each
half the planets are drawn from the farthest to the nearest by how near they really are (their
orbit's radius × how far round it they are × the orbit's tilt), each with its streak, so of two
that overlap the nearer one is in front.

**Planets.** Radii from about 3 to 6.9 px × scale (nine sizes, each give or take a quarter). Each
has a soft glow, which is smaller near the frame's edge so it is not cut off. Each takes a palette colour of its own, is lit
from the sun's side (the side facing the sun is bright; a planet on the near side of its orbit
shows mostly its dark side), and leans on its own axis (up to 0.6 rad either way). Two in three
have cloud bands; the fourth has rings, which lean with it.

**Streaks.** Each planet leaves a streak of light along its orbit, as long as it flies in 0.5 s
(from 0.04 to 1.5 rad), so faster planets have longer streaks. Each orbit is also drawn as a faint
line.

**The sun.** Radius `12 × scale × (1 + 0.42 × low)`, where `low` is the low end of the sound
(opens over 0.05 s, closes over 0.22 s). A white-hot disc in the first palette colour, a corona
that swells with it, and 16 rays that flicker with the high end. The corona and the rays fade out
short of the frame's edge, however much a flare swells them.

## The flare (the builder's addition)

When the raw input peak (`micPeak`, else the waveform's peak; never scaled by Gain) reaches
`TimbreHelix.threshold(Flare Sensitivity)`, the sun flares: it swells by a quarter, its rays
lengthen, a ring of light sweeps out across the orbits over 0.9 s, and the planets surge forward
(`2.5 × flare` added to the speed, `flare` falling from 1 with a 0.45 s time constant; the push
starts on the frame after the peak, so it is the same at any frame rate). At most one flare a
second, counted only while the mic is on. The owner did not ask for a peak reaction
here and was told it can be removed; `flareSensitivity` 0 turns it off.

## Quiet and muted

Mic on and silent, or mic off: the planets drift round at their slowest. Mic off with the idle
animation on: the sun breathes (`low = 0.22 + 0.14 × sin(now / 800)`).

## Settings

| Setting | Default | Meaning |
|---|---|---|
| `planets` (new) | 6 | How many planets, 0 to 9 |
| `flareSensitivity` (new) | 50 | How easily a peak flares the sun; 0 turns it off |

`density` (the old spawn rate) is retired; a saved value is dropped. The control panel builds both
sliders from the settings table; no control-panel change.

## Code

- `overlay/planets.js`: adds `createSystem({ random })`, driven by
  `step({ dt, live, loud, peak, threshold, count, W, H, scale })`, which returns `'flare'` on the
  frame the sun flares, and `planetCount(setting)`.
- `overlay/factories/orbit.js`: the effect. Reads the sound, steps the system, draws. Random
  choices come from `TimbreHelix.rng(window.__orbitSeed)`. `probe()` for the tests.

## Testing

- `npm run verify`: the settings; the system under Node with a seeded random source (how many,
  fading in and out, every orbit inside the frame on three pages, inner planets lapping faster,
  speed quiet and loud, frame-rate independence, the flare and its guards, tilts that differ, a
  size change).
- `npm run verify:render`: on real pages with scripted sound (draws inside the frame on all three
  pages, louder is faster with longer streaks, the low end swells the sun, the flare and its
  guards, quiet states, the Planets setting, config push and size change, a seeded run, canvas
  state, cost, the two sliders).
- Whether it looks like a sun and planets is judged by eye; no test measures it.

## Known and left alone

- A frame too short to hold any orbit (under 18 px × scale) parks every planet on the sun until
  the frame grows back. No shipped page is that short.
- While the frame is shrinking, an orbit's faint line and a streak can reach past the frame for
  up to a second and a half; the planets themselves do not.

## Not checked by any test

- A real microphone: how much the sun moves with real speech and with music.
- The frame rate in OBS.
