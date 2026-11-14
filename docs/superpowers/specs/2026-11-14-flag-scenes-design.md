# The flag effects as one 3D cloth flag: design

Date: 2026-11-14. Owner's request: "Let's look into redesigning all flag-style visualizers,
including the Pride flags", then "Skip the questions", then "Build it" after stills of a
throwaway spike. Every design choice below is the builder's, not the owner's, unless it says
otherwise.

## What this is

Five effects draw a flag today: `pride-ribbon`, `bi-pride-ribbon`, `ace-pride-ribbon`,
`trans-pride-ribbon` and `july-fourth-stripes`. All five fill the frame with stripes cut
into thin vertical slices that shift up and down, which looks stepped and pixelated. They
become one shared 3D scene on the scene kit (`overlay/scene-kit.js`), the third to seventh
kit scenes: a cloth flag flying from a pole.

They are five of the 18 Seasons, Holidays and Pride effects the owner decided would all
become floating 3D scenes (see the Thanksgiving design).

## Goals

- Smooth at any size: no stepped slices.
- The voice is the wind, and that is the whole idea. Anyone watching should be able to
  tell the flag is moved by the sound.
- Each flag is drawn correctly: its colours, its stripe proportions, the right way up.
- One implementation for all five; a sixth flag is a table entry.

## Not goals

- No cloth physics (no solver, no collisions). The cloth is a shape computed each frame.
- No new flags, and no change to which stripes the rainbow offers.
- The effect ids do not change, so saved configs and Streamer.bot actions keep working.

## Would make it a failure

- A flag drawn wrongly (wrong colours, wrong proportions, upside down, mirrored canton).
- A flag that pokes through the ground or stretches like rubber.
- Hearts or sparks that vanish in mid-air.

## The scene

A flag flies from a pole standing on a two-step round stone base. Nothing else: no sky, no
backdrop. One warm lamp, high and in front, lights it. The lamp is a practical light, so it
also reaches the kit's invisible ground: the flag's shadow moves in a pool of light under
it. A soft ambient light and a weak cool fill keep the shaded folds readable.

Sizes, in scene units: the flag is 2.3 tall (the hoist). Its length is the hoist times the
flag's aspect: 5:3 for the Pride flags, 1.9 for the United States flag. The flag's top
corner meets the pole at height 4.75; the pole stands at x = -2.5. Frame 7.8 wide by 5.6
high, centred on (-0.2, 2.65, 0), field of view 30, pitch 6. The wind blows to the right
and a little toward the viewer (the flag turns about the pole by 0.3 rad, swaying slowly).

Afterglow `cooling` is neutral (`[Infinity, Infinity, Infinity]`): light that fades keeps
its colour, so a moving shadow leaves no warm fringe.

## How the sound moves it

`audio` is the kit's envelope (`level, flame, slow, kick, burst, beat`).

- **Wind.** `blow = min(1, audio.flame × Wind / 50)`. `wind` follows `blow`, quick to rise
  (rate 5) and slow to sink (rate 0.7), so the flag does not drop between words.
- **Lift.** `fly = min(1, 0.1 + 1.3 × wind^0.75)`, plus a slow sway of ±0.03. At `fly` 1
  the flag flies straight out; at 0.1 it hangs.
- **Droop.** How far below level the cloth runs, in radians:
  `0.07 + 0.66 × min(1, 3.83 / length) × (1 − fly)^1.4`. Even a flying flag sags a little.
  The limit keeps the lowest corner of every flag clear of the ground when it hangs.
- **Gusts.** The level `blow` is remembered: 16 samples, 16 a second. The newest is at the
  pole and the oldest at the free end, so each syllable is a gust that crosses the flag in
  just under a second. Between samples the history glides, and a sample that falls inside a
  frame holds the level at its own moment, as in Winter Aurora, so the travel is the same
  at any frame rate. Along the cloth the history is smoothed, so no sharp front travels.
- **Ripples.** Two travelling waves (1.35 and 3.1 wavelengths along the flag) whose height
  at each point is `0.07 + 0.32 × gust + 0.12 × low + 0.2 × kick`, scaled by how far the
  point is from the pole (nothing moves at the pole) and by `0.3 + 0.7 × fly`. The high end
  of the sound adds a fine flutter at the free end. A hanging flag gets slow folds instead.
  The waves' phase advances by `1.6 + 6.5 × wind + 4 × kick` a second.
- **A beat** snaps the cloth: `kick` raises the ripples and speeds them for a moment.
- **Silence.** The flag hangs and still sways. It never freezes.

The cloth keeps its length. Each row is laid out column by column: the step along the
cloth is fixed, its drop comes from the droop, its depth from the ripple (limited to 85% of
what is left), and the rest goes sideways. So a ripple shortens the flag's reach instead of
stretching it.

## Each flag

Colours are today's, unchanged.

| Effect id | Shown as | Stripes, top to bottom | With it |
| --- | --- | --- | --- |
| `pride-ribbon` | Pride flag | Six equal: red, orange, yellow, green, blue, violet. With Stripe style at 50 or more: eight, black and brown above the six | Hearts |
| `bi-pride-ribbon` | Bi pride flag | Magenta 40%, purple 20%, blue 40% | Hearts |
| `ace-pride-ribbon` | Ace pride flag | Four equal: black, grey, white, purple | Hearts |
| `trans-pride-ribbon` | Trans pride flag | Five equal: light blue, pink, white, pink, light blue | Hearts |
| `july-fourth-stripes` | Fourth of July flag | Thirteen equal, red first. A blue union two fifths of the length and seven stripes tall, with 50 five-pointed stars in nine rows of six and five | Fireworks |

"Shown as" is the name in the control panel's list. Today the panel makes a name from the
id ("Pride ribbon"); a small table of display names (`VIZ_LABELS` in
`shared/viz-config.js`) now overrides it for these five.

- **Hearts** (the four Pride flags). Small solid hearts in the flag's heart colours (today's
  palettes) peel off the free half of the cloth and blow away downwind, rising, turning and
  shrinking away at the end of a flight of 2.4 to 4 seconds. How many: `0.6 + 8 × flame` a
  second, and six more on a beat, all times Heart rate / 50. At most 56 at once. A heart in
  the air always finishes its flight.
- **Fireworks** (Fourth of July). On a beat, with a chance of `Burst chance / 100 × 1.4`
  (never more often than every 0.38 s), a burst of 80 sparks goes off behind the flag in
  red, white or blue, with a flash that lights the back of the flag and the ground. Sparks
  are added light; their trails are the kit's afterglow. With the mic off and Idle
  animation on, a burst goes off every 3.2 s. The stars on the flag shine with the high end
  of the sound, scaled by Star twinkle / 50.

## Settings

| Effect | Settings |
| --- | --- |
| `pride-ribbon` | `wind` 50, `heartRate` 50, `stripeStyle` 0, `cameraDrift` 50 |
| `bi-`, `ace-`, `trans-pride-ribbon` | `wind` 50, `heartRate` 50, `cameraDrift` 50 |
| `july-fourth-stripes` | `wind` 50, `starTwinkle` 50, `burstChance` 50, `cameraDrift` 50 |

- `wind`: how strongly the voice drives the flag. 0: the flag hangs and sways whatever the
  sound. 100: it lifts at half the loudness.
- `heartRate`, `stripeStyle`, `starTwinkle`, `burstChance` keep their ids, so saved values
  carry over. `ribbonAmplitude` and `stripeAmplitude` are retired; `wind` replaces them.
- `cameraDrift`: the slow swing of the camera, as in the other scenes. 0 holds it still.
- The shared Scene placement sliders apply, as for every kit scene.

## Where the code lives

- `overlay/flag.js` (new, global `TimbreFlag`): the flag table, the stripes and stars, the
  voice history, the lift and droop rules, the cloth shape, and the scene definition. Valid
  as a classic script and as an ES module, like `planets.js`, so `verify.mjs` imports it
  under Node. The arithmetic touches nothing at load; the scene looks up `THREE` and the
  core.js globals when it is built.
- `overlay/factories/<id>.js` (five, replaced): one line each,
  `VIZ_FACTORIES[id] = TimbreScene.factory(() => TimbreFlag.definition(id))`, under a
  comment that says what the flag is.
- `shared/viz-config.js`: the five join `VIZ_USES_3D` and `VIZ_SCENES`; new settings;
  `VIZ_LABELS`.
- The three overlay pages load `flag.js` after `scene-parts.js`. `control/control.html`
  uses `VIZ_LABELS` for the list.

## Left to the builder

Light strengths, the pole and base, the heart's shape, spark speeds and anything else not
pinned above, judged from stills.

## Known and left alone

- Fireworks are added light, so they take on what is behind them: red sparks look purple
  over a blue sky.
- The voice history is a second copy of the scheme Winter Aurora uses. A kit helper is
  owed when the next scene needs it; Winter Aurora is not touched here.
- The stars shine together, not one by one.
- The cloth's normals are recomputed on the CPU every frame (about 1,300 points).
