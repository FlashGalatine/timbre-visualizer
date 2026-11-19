# Phosphor: glowing traces on a deck of dark slices

Date: 2026-11-19. Effect id: `phosphor` (unchanged). Issue: FlashGalatine/timbre-visualizer#1,
"All WebGL visualizers: a straight-up redesign from the ground up". This is the third of the
eleven, after Sunburst and Mountains 3D.

The owner chose Phosphor as the next one, so every choice below is the builder's. The owner
saw stills of a throwaway spike, and the spike running beside today's effect, and said
"Build it".

## What it is for

Today's Phosphor is a tape of one-pixel lines drawn by its own renderer. Each line is the raw
waveform Timbre captures, which is 64 samples, about a thousandth of a second: a fragment of
one cycle of a voice. So every line jitters, and the tape moves one line per frame whatever
the frame rate. The new one should read as an oscilloscope trace with its echoes, move
smoothly, and sit in the box like the other floating scenes.

## What it is

A deck of thin slices stands in the box, one behind another, built on the scene kit
(`overlay/scene-kit.js`).

- **A slice** is a thin, solid, nearly black wall, 6.4 wide. Its top edge is the trace.
- **The trace** is a soft strip of added light along that edge, lying flat just in front
  of its slice, white-hot on the nearest slices and palette-coloured further back. It fades out toward
  its two ends, where the slice comes down to a low foot.
- **Under each trace** the slice glows faintly in the trace's colour, down to 0.28 below
  the trace. Below that it is dark.
- **The deck** is 3.6 deep. Slices are solid, so a tall one hides the traces behind it; the
  deck therefore shows over a bright backdrop, where added light alone washes out.
- **Colours** come from the palette: the slice at `back` (0 at the front, 1 at the back)
  takes `getColor(colorT + back * 0.8)`, as the old tape did by age.
- Fading light keeps its colour (neutral `cooling`). There is no ground light.

## What the sound does

- **The front trace is the voice now, and each one behind it is the same trace earlier.**
  The deck holds 2.2 s of the voice from front to back. Nothing in the deck moves from
  place to place: each slice stays where it is and its shape changes.
- **How tall a trace stands is how loud the voice was** at that slice's moment. In silence
  every slice is a low foot, 0.14 high.
- **The shape of a trace comes from the sound's bands**, not from the raw waveform. Each of
  the first ten bins (where speech lives) is one sine across the width: the lowest bin 1.2
  waves, each next bin 0.9 more, each running along the trace at its own steady pace,
  alternately one way and the other. A bin's sine is as strong as the bin is loud (the higher bins count
  a little less), and the whole is scaled to the bins' total, so the shape says which bands
  are sounding and the height says how loud. Each band is followed, quick to rise and
  slower to fall, because the bins are read only 30 times a second. So the low end makes
  broad waves and the higher bands fine ripples, and the trace changes smoothly enough to
  see.
- **The echoes are true delayed copies:** a slice 1 s back shows what the front showed 1 s
  ago: the place of every wave exactly (while the scene stays live), and the loudness and
  the bands as the history kept them (24 samples a second, read between samples).
- **A beat** (the kit's) flashes the nearest traces, widens them and lifts them a little,
  less the further back, and as deep into the deck whatever the Depth.
- **Mic off, Idle animation on:** the kit's slow swell drives the height and a slow pattern
  drives the bands. **Mic off, Idle animation off:** the waves stop running and the echoes
  die away over about four seconds (the voice's own release, then the 2.2 s the deck
  holds); then the deck is flat and still. (The camera
  still drifts, as in the other scenes, and the colours still move through the palette, as
  they did in the old effect.)

## Settings

- `depth` (kept): how many slices, 12 at 0, 24 at 50, 36 at 100. The deck stays the same
  size and holds the same 2.2 s; more slices are closer together. Applies at once.
- `cameraDrift` (new): as in the other scenes. 0 holds the camera still; 100 doubles the
  sway.

A config saved before this change keeps its `depth` and gains the default drift. The effect
joins `VIZ_SCENES`, so the control panel shows the shared Scene placement sliders for it.
The display name does not change.

## How it is made

- `overlay/phosphor.js` (`TimbrePhosphor`), loaded by the three overlay pages after
  `mountains.js` and by `verify` under Node. First the arithmetic (how many slices, where a
  slice is and how old, a band's wave, the shape of a trace, how tall it stands, its strip
  of light, a slice's wall, brightness and colour), then `definition()` for
  `TimbreScene.factory()`. `overlay/factories/phosphor.js` becomes one line.
- The voice is kept in the kit's histories (`TimbreScene.createHistory`): one for the
  loudness and one for each of the ten bands, 56 samples at 24 a second.
- The traces are one mesh and the slices another. Their positions and colours are written
  on the CPU every frame (at most 36 slices of 96 points).
- The effect no longer draws the raw `waveform`. (The kit still measures loudness from it.)

## Tried in the spike and dropped

- A dark plate under the deck: a large black slab on the stream.
- A slice lit over its whole height: the front slice became a solid block of colour that
  hid everything behind it.
- Traces pinned to the foot by a square-root curve: their steep ends piled up into teeth.
- A figure drawn from the raw waveform against itself (a phase portrait): the 64 samples
  are too short a piece of the sound to make one.

## Known and left alone

- A tall front trace hides part of the deck behind it. The camera looks down at 30 degrees
  so the echoes show over it.
- The slices' ends are a row of low dark feet.
- In silence the 24 feet overlap on screen into one near-black sheet, about a quarter of
  the canvas. The owner saw this in the spike's stills. A lower foot (`LOW`, 0.14) would
  open gaps between them; it is one number.
- Where a loud high band makes crests tighter than the trace is wide, the strip folds on
  itself there and is brighter.
- After the scene has been muted and is live again, slices that still show sound from
  before the mute have their waves shifted by the time it was muted.
- Over a bright backdrop the traces' added light washes out; the dark slices still show.
- A change of Depth re-reads the same history at new ages, so the deck redraws in one
  frame; the old traces' light fades with the afterglow.

## Checks

Node (`npm run verify`): the table and the saved-config case; slice count; a slice's place
and age; the waves, their pace and weight; loudness; the shape of a trace; how tall it
stands; the pin and the fade at the ends; the strip (along the trace, in the plane of its slice);
the wall; brightness, width and colour; the idle pattern; page order. Render
(`npm run verify:render`): the slices are solid and the traces are added light; louder is
taller; silence; a syllable travelling back; an echo keeping the bands of its own moment; a band driving its own waves, and followed; Gain; a beat and how deep it reaches; the
Depth setting; Camera drift; the same at 30 and 60 fps; idle, and nothing moving with the
mic and idle off, from a fresh scene and once the echoes of a voice have died; palette colour; placement; cost. Every check is
confirmed by breaking the code on purpose.
