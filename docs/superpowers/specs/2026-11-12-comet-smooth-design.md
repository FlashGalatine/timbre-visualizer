# Comet: a smooth glowing comet

Status: the owner skipped the design questions ("see what you can come up with"), looked at a
throwaway version in the effect gallery on 12 November 2026 and said "Build it". Every choice below
is the builder's unless it says otherwise. The owner has not yet seen it with a real microphone or
in OBS; that look decides whether it is merged.

## Intent

Comet is one of the effects listed on issue #1 as drawn with stepped, pixelated blocks. This
replaces it with a smooth one.

The old Comet was not a comet. It plotted the sound wave against a delayed copy of itself as a
looping figure, in square blocks, and let the picture fade. The new one is an actual comet: a
glowing head on a looping path with a tapering tail, and it follows how loud the voice is rather
than the wave's shape. The owner was told this is the biggest change and chose to build it.

## Goals

- Smooth at every size: no square blocks, no visible joins along the tail.
- It reads as a comet at a glance, and it visibly follows the voice.
- Quiet and muted states stay calm: slow and dim, as the owner chose for DNA.
- A reaction to a real yell or a mic thump, and none to ordinary talking, as the owner chose for DNA.

## Non-goals

- Keeping the old wave figure.
- Any change to other effects, to the control panel's code, or to `TimbreHelix`.

## Anti-goals

- A tail that looks like a worm: it must always narrow away from the head.
- Flares during normal speech, or a flare the moment the mic opens.
- Anything that stops, jumps or leaves the frame.

## Constraints

- Classic script, no build step, 2D canvas only. Timed in seconds from `draw(now, dt)`; only the
  colour reads the wall clock, as the other effects do.
- Works on all three overlay pages (260×130 at scale 1, 1248×624 and 1728×624 at scale 4.8) and
  when the box changes size.
- Leaves the canvas state as it found it.
- Under 1.5 ms of script time per frame on the 16:9 page.

## The comet

**Path.** The head follows the figure the old Comet's idle animation used: three loops across, two
up and down. `x = W/2 + (W/2 − m)·reach·sin(3θ + lean)`, `y = H/2 + (H/2 − m)·reach·sin(2θ)`, with
margin `m = 18 × scale`. `lean = 0.35·sin(0.07·t)` slowly reshapes the figure; it stays well inside
±π/4, where the figure would fold into a line and the head would stop and turn back. A depth value
`z = cos(θ + 0.6)` makes the comet 18% larger at its nearest and 18% smaller at its farthest.

**Following the voice.** Levels come from `TimbreHelix.levels` (the same hearing as DNA): `loud` is
the waveform peak × 1.5 × Gain, `low` is bins 0–1, `high` is bins 2–10.

| What | Rule |
|---|---|
| Speed along the figure | `(0.2 + 0.75·loud)` radians a second, loudness smoothed over 0.12 s |
| Reach (how much of the frame the loop fills) | `0.42 + 0.58·loud`; grows over 0.3 s, shrinks over 0.9 s |
| Brightness | `0.5 + 0.5·loud`, plus the flare |
| Tail length along the path | `scale × (50 + 2.8·Trail) × (0.3 + 0.7·loud)`, loudness smoothed over 0.4 s |
| Tail half-width, `a` of the way from head (0) to tip (1) | `scale × (0.45 + (1.3 + 2.2·loud now + 1.5·loud then) × (1 − a)^1.1) × depth` |
| Tail opacity | `(0.5 + 0.3·loud now + 0.3·loud then) × (1 − a)^1.15 × (0.6 + 0.4·brightness)` |
| Glow round the head | radius `scale × (6 + 9·low + 5·loud + 9·flare) × depth`; `low` opens over 0.05 s, closes over 0.2 s |
| Sparks shed from the head | `3 + 70·high + 14·loud` a second |

"Loud then" is the loudness when the head passed that point (smoothed over 0.05 s), so syllables
travel down the tail as gentle bulges. "Loud now" swells the whole tail together and is the larger
term, so at a steady level the tail narrows all the way from head to tip, and the bulges ride on that
taper without overtaking it.

**The tail's memory.** The path is remembered as points between half a step and one step apart
(`step = max(3, 2.4 × scale)` px), whatever the frame rate: each frame's movement is cut into
sub-steps along the figure. Points older than the longest possible tail are dropped.

**Colour.** The palette runs 1.4 steps from head to tip, as the old trail did, lightened toward
white near the head. A thin white thread runs down the front 38% of the tail.

**Drawing.** Tail body: short strokes with round ends from tip to head; each first clears its own
footprint and then adds its colour, so overlaps never double and no joins show. Glow: the tail again
as up to nine wide blurred stretches laid under the body. Then the thread, sparks, flare rings and
the head (a soft radial glow and a white core).

## Quiet and muted

Mic off, or on and silent: speed 0.2, reach 0.42, brightness 0.5, a short thin tail, 2.5 sparks a
second when the mic is off. With the idle animation on and the mic off, only the glow round the head
breathes (`low = 0.22 + 0.12·sin(now/700)`).

## The flare

When the raw input peak (`micPeak`, else the waveform's peak; never scaled by Gain) reaches the
threshold, the head flares: one ring that expands to `67 × scale` and fades over 0.6 s, 44 sparks
thrown in every direction, a flash that adds to brightness and glow and decays over 0.3 s, and a
dash forward (speed × up to 2.6 while the flash lasts).

- Threshold: `TimbreHelix.threshold(Flare Sensitivity)`, the same rule as DNA's Shatter
  Sensitivity (50 → 90% of full scale, 100 → 50%, 0 → off).
- At most one flare every 0.7 s. That time counts only while the mic is on, so the mic opening on a
  loud moment cannot flare.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| `trail` (existing) | 50 | Tail length. Higher is longer. (It was the old fade speed, where higher was shorter.) |
| `flareSensitivity` (new) | 50 | How easily a peak flares the head; 0 turns flares off |

The control panel builds both sliders from the settings table; no control-panel change.

## Code

- `overlay/comet-flight.js`, `globalThis.TimbreComet`: the path, the voice rules above, the tail's
  point memory and the flare gate. Loadable under Node, like `helix.js`. Loaded by all three overlay
  pages after `helix.js`.
- `overlay/factories/comet.js`: the effect. Reads the sound, calls `TimbreComet`, draws. `probe()`
  for the tests. Random choices come from `TimbreHelix.rng(window.__cometSeed)`.
- A size change starts a fresh tail; a config push that does not change the size leaves it alone.

## Testing

- `npm run verify`: the arithmetic under Node (path stays in the frame and never stalls, the voice
  rules, the tail's memory at 10 to 165 frames a second, the flare gate) and the settings.
- `npm run verify:render`: on real pages with scripted sound (draws inside the frame on all three
  pages, louder is faster, wider, brighter and longer, quiet states, the flare and its guards,
  Trail, config push and size change, a seeded run, canvas state, cost, the control panel's sliders).
- Smoothness itself is judged by eye; no test measures it.

## Not checked by any test

- A real microphone: whether a yell reaches the threshold at the default, and whether close-mic "p"
  and "b" sounds flare it.
- The blurred glow's cost on the graphics card, and the frame rate in OBS.
- Whether the glow's off-canvas shadow trick draws in OBS's browser.
