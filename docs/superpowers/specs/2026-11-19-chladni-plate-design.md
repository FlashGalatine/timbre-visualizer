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
  one. A bin weighs as its square, so the bins that sound decide the tone and a floor of
  hiss under them does not. When the voice comes back after 0.45 s of quiet in one stretch
  (the level below 0.1, then above 0.22) a new phrase starts. The plate weighs the tone
  over the phrase's first tenth of a second and takes the figure it asks for or, if the
  plate has that figure or had it last, the nearest one along that it neither has nor had.
  So a voice that keeps its tone goes round three figures. Within a phrase the figure is
  kept, unless the tone (followed at 2.5 a second) comes to ask for another, and then not
  within 3 s of the last change. A plate's first phrase takes what the tone asks for, even
  the figure it starts on. A sound with too little in its bins to have a tone starts no
  phrase; the plate keeps its figure.
- **The plate changes figure over 0.8 s**, as a blend of the old one and the new, and the
  sand walks from one to the other. A change waits until the last one has finished.
- **The plate bends and glows where it moves.** It bends by 0.035 times the figure's value
  at full voice (0.042 on a beat), four times a second, and glows in a palette colour, both
  more the louder the voice.
- **A yell or a mic thump throws all the sand into the air.** A beat (the kit's) with the
  level above 0.9 throws every grain on the plate up and a little sideways, harder the
  nearer the level is to 1, not more than once in 2.5 s. The sand lands scattered and walks
  back.
- **Mic off, Idle animation on:** the kit's slow swell shakes the plate and the tone drifts
  slowly from one end of the figures to the other and back. **Mic off, Idle animation off:** the plate is
  still and flat, grains in the air land, and the sand lies where it is. (The camera still
  drifts, as in the other scenes, and the colours still move through the palette, as they
  did in the old effect.)

## Settings

- `density` (kept): how much sand. 6,000 grains at 0, 18,000 at 50, 30,000 at 100. It
  applies at once; grains that were not drawn are where they last lay.
- `cameraDrift` (new): as in the other scenes. 0 holds the camera still; 100 doubles the
  sway.
- `rotateX`, `rotateY`, `rotateZ` (new, asked for by the owner after seeing the scene in
  OBS): the plate turned about each axis, 0 to 360 degrees, all 0 by default. Rotate Y
  spins the plate in its own plane, Rotate Z rolls it to one side, and Rotate X tilts its
  top toward the viewer; they apply in that order. Rotate X at 46 turns the plate to face
  the camera, the view the old effect had (with Camera drift at 0 it is square on). The
  sand, the bend and the glow turn with the plate. A plate turned so that it would leave
  the frame is drawn smaller and moved to the middle: it is kept within 86% of the frame,
  with room above it for sand in the air. They apply at once.

A config saved before this change keeps its `density` and gains the defaults of the rest. The
effect joins `VIZ_SCENES`, so the control panel shows the shared Scene placement sliders for
it. The display name does not change.

## How it is made

- `overlay/chladni.js` (`TimbreChladni`), loaded by the three overlay pages after
  `phosphor.js` and by `verify` under Node. First the arithmetic (how many grains, the
  figures and their slope, the tone, which figure, how hard the plate shakes, how the sand
  walks, hops and is thrown, the plate's bend and glow, the sand's colour), then
  `definition()` for `TimbreScene.factory()`. `overlay/factories/chladni.js` becomes one
  line.
- **The sand is stepped on the CPU** in steps no longer than a sixtieth of a second (a frame
  of 1/30 s is two steps), and within reach of its place a grain's distance from it dies
  away at a rate that does not depend on the step. So the same sound gives the same kind of
  figure at any frame rate. Each grain has its own run of random numbers, started from a
  scramble of its number, so a run is repeatable and no grain's path depends on the order
  grains are stepped in.
- **The sand's points are sized by hand each frame.** three.js sizes a point by the height
  of the canvas, not of the picture the kit draws into (four times taller on the small page)
  and not by the camera's zoom (the Size slider); the scene puts both back.
- A figure's value and slope are read from tables of the cosines and sines (2,048 cells
  across the plate), built once.
- The plate is a grid of 48 by 48 cells with a skirt round its edge; its points and
  colours, and the sand's, are written every frame.
- The effect no longer makes a renderer of its own, and no longer uses `Math.random`.

## Tried in the spike and changed

- 16,000 grains with strong jostling: music never let a figure form. The jostling is a
  third of what it was, the walk faster and hops rarer.
- A throw on every beat above 0.8: music threw the sand twice a second. It now takes a
  level above 0.9 and waits 2.5 s (1.2 s still had music throwing it every third beat).
- A figure kept for 1.8 s within a phrase: the simulated voice changed figure three times
  in one phrase, and the sand had a second of rest between changes. It is kept for 3 s.

## Changed after the review

- Quiet was counted across gaps while the plate was changing figure, so words in short
  bursts started a phrase a second. Quiet is one stretch; a phrase that comes during a
  change waits for it.
- A phrase on the tone the plate already showed took the next figure along, and the tone
  took it straight back, so a steady voice only ever showed two figures. It goes round three,
  and within a phrase the figure moves only when the tone has.
- The tone was the first reading of a phrase, weighed plainly, with each bin followed. It is
  the mean over a tenth of a second, weighed by squares, and the bins are read as they are.
  Weighed by squares a voice sits lower, so the tone now runs from bin 0.4 to bin 3 (it ran
  from 1.3 to 5.5).
- With the mic off the tone sat on the last figure for a third of the time and jumped from
  it to the first. It now drifts between the two ends and stops at neither.
- A step of the sand could be as long as a fortieth of a second, and a grain near its place
  overshot it by more the longer the step.
- A grain was drawn at the plate's height where it had been before its step, and could be
  under the bent plate.
- Each grain's random numbers were its neighbour's, six draws on.
- The sand's points were a quarter of their size on the small page and did not follow the
  Size slider.
- All 30,000 grains were sent to the GPU every frame whatever the Density.
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
- A pause is heard only when the level drops below 0.1. A microphone whose noise keeps the
  level above that never pauses, and the figure then changes only with the tone. To be
  looked at with the owner's microphone (`HUSH`).
- A close voice that sits at a level above 0.9 throws the sand while just talking. Also to
  be looked at with the owner's microphone.
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
