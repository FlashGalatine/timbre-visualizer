# Fireflies: a living swarm

Status: the owner skipped the design questions ("see what you can come up with"), looked at a
throwaway version in the effect gallery on 12 November 2026 and said "Build it". Every choice below
is the builder's unless it says otherwise. The owner has not yet seen it with a real microphone or
in OBS; that look decides whether it is merged.

## Intent

Fireflies is on the redesign list of issue #1. The old effect sprayed square particles out of the
centre in straight lines and let the picture fade. The new one is a swarm that is always there:
soft glowing fireflies wandering the whole frame, blinking, and answering the voice. The owner was
told the spray from the centre is gone and chose to build it.

## Goals

- Smooth, soft lights; no square blocks.
- It reads as fireflies at a glance, and the voice visibly moves it: syllable by syllable, not only
  on average.
- Quiet and muted states stay calm: slow, with rare dim blinks.
- A reaction to a real yell or a mic thump, and none to ordinary talking, as the owner chose for DNA
  and approved for Comet.

## Non-goals

- Keeping the spray from the centre.
- Any change to other effects, to the control panel's code, or to `TimbreHelix` / `TimbreComet`.

## Anti-goals

- Every firefly lit all the time while talking: the swarm must keep a rhythm.
- A startle during normal speech, or the moment the mic opens.
- A firefly leaving the frame, jumping, or sticking to an edge.

## Constraints

- Classic script, no build step, 2D canvas only. Timed in seconds from `draw(now, dt)`; only the
  colour reads the wall clock, as the other effects do.
- Works on all three overlay pages (260×130 at scale 1, 1248×624 and 1728×624 at scale 4.8) and
  when the box changes size.
- Leaves the canvas state as it found it.
- Under 1.5 ms of script time per frame on the 16:9 page with the largest swarm (60 fireflies, a
  loud voice); about half that at the default.

## The swarm

**How many.** `round(10 + 0.5 × Density)`: 10 at Density 0, 35 at 50, 60 at 100. A new firefly
fades in over 0.8 s; when Density drops, the extra ones fade out over 0.5 s.

**Each firefly** has a place, a depth `z` (0 far to 1 near), a heading, a palette offset (0 to 1.2
steps), and its own blink period (5 to 11 s when quiet).

**Flight.** Speed `(7 + 12·z) × scale × (1 + 2.2·loud)` px a second along its heading. The heading
wanders: two slow sine wobbles, each firefly with its own rates, turning faster with loudness
(`× (1 + loud)`). Within `14 × scale` of an edge it turns back toward the middle of the frame, more
strongly the closer it gets and, like the wandering, faster with loudness (`× (1 + loud)`), so a loud
swarm cannot out-turn it and slide along the edge. It is held 2 px inside the frame.

**Hearing.** `loud` is `TimbreHelix.levels(...).loud` (the waveform peak × 1.5 × Gain). The swarm
keeps three smoothed copies: slow (0.25 s), fast (0.04 s), and "sync" (rises over 0.8 s, falls over
1.5 s), which is how long the voice has been going.

**Blinking.** Each firefly has a charge from 0 to 1. It fills at `(1 + 3·loud) / period` a second.
At 1 the firefly flashes and the charge returns to 0. Three other things add charge:

- **A syllable.** When the fast level stands more than 0.12 above the slow one (at most once every
  0.12 s), every firefly gains `(0.08 + 0.3·fast) × a random share`.
- **A ripple.** Each flash sends out an unseen ring that grows at 0.9 frame-widths a second for
  0.55 s. A firefly the ring's front passes gains `0.2 × sync × strength × (1 − age / 0.55)`, once,
  with the ring's age taken at the middle of the frame.
  A flash a firefly makes on its own has strength 1; a flash set off within 0.15 s of a ripple's
  nudge has half the strength of that ripple; below 0.2 a flash sends no ripple. At most 40 rings.
- For 0.5 s after flashing, a firefly ignores ripples.

**A flash.** Brightness rises over 0.035 s and falls over 0.32 s:
`(1 − e^(−t/0.035)) × e^(−t/0.32) × min(1, power × (0.75 + 0.5·fast))`, where `power` is
`0.55 + 0.45·fast` at the moment of the flash. So lit fireflies also swell with the voice as it is
right now.

**Drawing**, far ones first:

- the body: a faint dot (`0.12 + 0.16·z` opacity), so the swarm shows when none is lit. It is
  skipped while the firefly's brightness is 0.5 or more, when its core hides it;
- while lit: a streak along the last 0.4 s of its flight, brightest at the firefly; a soft round
  glow of radius `core × (4 + 5·low + 3·z) × (0.55 + 0.45·brightness)`; and a white core. `core` is
  `(1.0 + 1.5·z) × scale`. `low` is the low end of the sound (opens over 0.05 s, closes over
  0.25 s). The high end (smoothed over 0.08 s) makes lit fireflies flicker by up to 35%.

## Quiet and muted

Mic off, or on and silent: loudness is 0, so the swarm drifts at its slowest and each firefly
blinks on its own 5 to 11 s rhythm at power 0.55. With the idle animation on and the mic off, only
the glow's size breathes (`low = 0.22 + 0.12·sin(now/700)`).

## The startle

When the raw input peak (`micPeak`, else the waveform's peak; never scaled by Gain) reaches the
threshold, every firefly flashes at full power and is pushed straight away from the middle of the
frame. Each is pushed 35% to 80% of the way to the edge margin in that direction, and the push dies
away over 0.45 s. All ripples are cleared.

- Threshold: `TimbreHelix.threshold(Startle Sensitivity)`, the same rule as DNA's Shatter
  Sensitivity and Comet's Flare Sensitivity (50 → 90% of full scale, 100 → 50%, 0 → off).
- At most one startle a second. That second counts only while the mic is on, so the mic opening on
  a loud moment cannot startle the swarm.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| `density` (existing) | 50 | How many fireflies: 10 to 60. (It was the spawn rate.) |
| `startleSensitivity` (new) | 50 | How easily a peak startles the swarm; 0 turns it off |

The control panel builds both sliders from the settings table; no control-panel change.
**Trail veil** no longer affects Fireflies: the canvas is cleared every frame.

## Code

- `overlay/fireflies-swarm.js`, `globalThis.TimbreSwarm`: the swarm (`createSwarm({ random })`,
  driven by `step({ dt, live, loud, peak, threshold, density, W, H, scale })`) and `count(density)`.
  Loadable under Node. Loaded by all three overlay pages after `comet-flight.js`.
- `overlay/factories/fireflies.js`: the effect. Reads the sound, steps the swarm, draws. `probe()`
  for the tests. Random choices come from `TimbreHelix.rng(window.__firefliesSeed)`.
- A size change keeps the swarm: every firefly moves to the same relative place in the new frame.

## Testing

- `npm run verify`: the swarm under Node with a seeded random source (count, staying inside the
  frame, blink rates quiet and loud, syllable bursts, the ripple's nudge and strengths, the startle
  and its guards, frame-rate independence, size and Density changes, the flash's shape) and the
  settings.
- `npm run verify:render`: on real pages with scripted sound (draws inside the frame on all three
  pages, louder is busier and brighter, syllable bursts, the startle and its guards, quiet states,
  Density, config push and size change, a seeded run, canvas state, cost, the two sliders).
- Whether it looks like fireflies is judged by eye; no test measures it.

## Known and left alone

- A syllable that lasts gives more than one push: the fast level stays above the slow one for
  about 0.4 s after a rise, so a second, larger push comes 0.12 s in. This is how the version the
  owner saw behaved; pushing once per syllable would make each burst crisper and the swarm quieter.
- A stale cache that serves the new `factories/fireflies.js` beside an old page without
  `fireflies-swarm.js` leaves Fireflies blank until another effect is picked (the rest of the
  overlay keeps working); Comet and DNA have the same exposure. Beside an old `viz-config.js` the
  startle is simply off.

## Not checked by any test

- A real microphone: whether a yell reaches the threshold at the default, whether close-mic "p" and
  "b" sounds startle the swarm, and whether real speech gives the syllable bursts the scripted
  speech does.
- The frame rate in OBS.
