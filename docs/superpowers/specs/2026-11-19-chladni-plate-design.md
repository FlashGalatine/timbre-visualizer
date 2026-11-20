# Chladni: sand on a floating plate

Date: 2026-11-19. Effect id: `chladni` (unchanged). Issue: FlashGalatine/timbre-visualizer#1,
"All WebGL visualizers: a straight-up redesign from the ground up". This is the fourth of
the eleven, after Sunburst, Mountains 3D and Phosphor.

The owner chose Chladni as the next one, so every choice below is the builder's. The owner
saw stills of a throwaway spike, and the spike running beside today's effect, and said
"Build it".

## What it is for

Today's Chladni is a flat field of hard dots drawn straight onto the screen by its own
renderer. It fills its canvas edge to edge, the dots pile up into white blobs, a beat
scatters every dot at random, and the figure is chosen in whole steps so it jumps. The new
one should read as sand on a vibrating plate, move smoothly, and sit in the box like the
other floating scenes.

## What it is

A square plate floats in the box, seen from above at an angle, built on the scene kit
(`overlay/scene-kit.js`).

- **The plate** is solid and nearly black, 4.4 on a side and 0.09 thick, with a soft
  palette-coloured rim. It is solid, so the sand shows over a bright backdrop.
- **The sand** is grains of added light lying on the plate: pale, tinted by the palette
  from the centre of the plate outward (`getColor(colorT + r * 1.4)`, 40% toward white).
- **A figure** is a pattern of lines on the plate where it does not move: the lines where
  `cos(n·π·x)·cos(m·π·z) ± cos(m·π·x)·cos(n·π·z)` is zero, for x and z from -1 to 1 across
  the plate. There are ten, from simple to intricate: (1,2,−), (1,2,+), (1,3,+), (2,3,−),
  (2,3,+), (1,4,−), (3,4,−), (2,5,+), (3,5,−), (4,5,+).
- Fading light keeps its colour (neutral `cooling`). There is no ground light.

## What the sound does

- **Loudness shakes the plate.** A grain that lies where the plate moves walks toward the
  nearest line of the figure, faster the louder the voice, and is jostled as it goes. So the
  sand gathers into the figure, and the louder the voice the fuzzier its lines.
- **Each grain has its own place beside a line**, up to 0.036 either side of it (the plate
  is 2 across), so a settled figure is a band of sand and not a hair.
- **Sand hops where the plate moves.** A grain away from a line is now and then thrown a
  little way up, more often and higher the louder the voice, and travels on while in the air.
- **A pause leaves a sharp figure.** With the mic on and no sound the plate still hums a
  little (4% of full), enough for the sand to finish gathering and then lie almost still.
- **Each phrase draws a new figure, and the tone picks which.** The tone is where the
  sound's weight sits among the 16 lowest bins: low gives a simple figure, high an intricate
  one. When the voice comes back after 0.45 s of quiet (the level below 0.1, then above
  0.22) the plate takes the figure for the tone at that moment, or the next one along if
  that is the figure it already has. Within a phrase the figure follows the tone (itself
  followed at 2.5 a second), but not within 1.8 s of the last change. A plate's first
  phrase takes what the tone asks for, even the figure it starts on. A sound with too
  little in its bins to have a tone starts no phrase; the plate keeps its figure.
- **The plate changes figure over 0.8 s**, as a blend of the old one and the new, and the
  sand walks from one to the other. A change waits until the last one has finished.
- **The plate bends and glows where it moves.** It bends by up to 0.035 times the figure's
  value, four times a second, and glows in a palette colour, both more the louder the voice.
- **A yell or a mic thump throws all the sand into the air.** A beat (the kit's) with the
  level above 0.9 throws every grain on the plate up and a little sideways, harder the
  nearer the level is to 1, not more than once in 1.2 s. The sand lands scattered and walks
  back.
- **Mic off, Idle animation on:** the kit's slow swell shakes the plate and the tone drifts
  slowly up and down through the figures. **Mic off, Idle animation off:** the plate is
  still and flat, grains in the air land, and the sand lies where it is. (The camera still
  drifts, as in the other scenes, and the colours still move through the palette, as they
  did in the old effect.)

## Settings

- `density` (kept): how much sand. 6,000 grains at 0, 18,000 at 50, 30,000 at 100. It
  applies at once; grains that were not drawn are where they last lay.
- `cameraDrift` (new): as in the other scenes. 0 holds the camera still; 100 doubles the
  sway.

A config saved before this change keeps its `density` and gains the default drift. The
effect joins `VIZ_SCENES`, so the control panel shows the shared Scene placement sliders for
it. The display name does not change.

## How it is made

- `overlay/chladni.js` (`TimbreChladni`), loaded by the three overlay pages after
  `phosphor.js` and by `verify` under Node. First the arithmetic (how many grains, the
  figures and their slope, the tone, which figure, how hard the plate shakes, how the sand
  walks, hops and is thrown, the plate's bend and glow, the sand's colour), then
  `definition()` for `TimbreScene.factory()`. `overlay/factories/chladni.js` becomes one
  line.
- **The sand is stepped on the CPU** in steps of about a sixtieth of a second (a frame of
  1/30 s is two steps), so the same sound gives the same kind of figure at any frame rate.
  Each grain has its own random numbers, seeded once, so a run is repeatable and no grain's
  path depends on the order grains are stepped in.
- A figure's value and slope are read from tables of the cosines and sines (2,048 cells
  across the plate), built once.
- The plate is a grid of 48 by 48 cells with a skirt round its edge; its points and
  colours, and the sand's, are written every frame.
- The effect no longer makes a renderer of its own, and no longer uses `Math.random`.

## Tried in the spike and changed

- 16,000 grains with strong jostling: music never let a figure form. The jostling is a
  third of what it was, the walk faster and hops rarer.
- A throw on every beat above 0.8: music threw the sand twice a second. It now takes a
  level of 0.9 and waits 1.2 s.
- A plate seen from 50 degrees with a wider sway: its near corner left the canvas. The
  camera looks down at 44 degrees and sways less.
- Grains in the air brighter than those lying: their afterglow beyond the plate's edge
  read as tufts. They are dimmer than those lying.

## Known and left alone

- Sand cannot leave the plate: a grain that reaches the edge stays on it.
- Sand thrown near the plate's far edges is seen against the stream, where its light
  lingers with the afterglow; over the plate it does not.
- Two frame rates give the same kind of figure, not the same grains: a grain's hops depend
  on chances taken each step.
- A square plate is limited by the height of the box, so the scene is smaller than the
  wide ones.
- Which figures a real voice reaches depends on the microphone; the two numbers of the
  tone (`TONE_LOW`, `TONE_SPAN`) are the ones to tune.
- Over a bright backdrop the plate's glow and rim still show, being solid; sand in the air
  beyond the plate washes out.

## Checks

Node (`npm run verify`): the table and the saved-config case; grain count; the figures,
their values and slopes against the tables; the tone; which figure; the shake; the walk,
the jostle and the hop; a throw; that sand gathers on the lines, stays on the plate and is
repeatable; the plate's bend, glow and rim; the sand's colour; the idle pattern; page order.
Render (`npm run verify:render`): the plate is solid and the sand is added light; sand
gathers when the voice sounds and lies still when it stops; louder is fuzzier; the tone
picks the figure; a phrase draws a new one; the blend; the bend and the glow; a throw and
the landing; the Density setting; Camera drift; the same at 30 and 60 fps; idle, and
nothing moving with the mic and idle off; palette colour; placement; cost. Every check is
confirmed by breaking the code on purpose.
