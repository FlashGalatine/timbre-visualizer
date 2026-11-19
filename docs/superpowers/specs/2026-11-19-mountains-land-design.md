# Mountains 3D: a block of land that the voice raises

Date: 2026-11-19. Effect id: `mountains-3d` (unchanged). Issue: FlashGalatine/timbre-visualizer#1,
"All WebGL visualizers: a straight-up redesign from the ground up". This is the second of
the eleven; Sunburst was the first.

The owner chose Mountains 3D as the next one and skipped the design questions, so every
choice below is the builder's. The owner saw stills of a throwaway spike, and the spike
running beside today's effect, and said "Build it".

## What it is for

Today's Mountains 3D is a coarse, flat-shaded sheet of terrain in one colour, drawn by its
own renderer. Its rows jump a whole step at a time, and it fills its canvas edge to edge
with no shape of its own. The new one should read as mountains, move smoothly, and sit in
the box like the other floating scenes.

## What it is

A block of alpine land floats in the box, built on the scene kit (`overlay/scene-kit.js`).

- **The block** is cut square like a terrain model: 7 wide and 4.4 deep, with a thin base
  and dark cut sides.
- **The land** on it is long connected crests with smaller ones riding on them. It is lit
  from behind and to the left by a low sun, so the peaks throw their shadows across the
  land toward the viewer.
- **The land sinks toward all four edges** of the block, to 14% of its height, so the cut
  sides stay low and the mountains stand in the middle.
- **Snow.** Land above the snow line is white.
- **Colours** come from the palette: a column's colour is `getColor(colorT + (c / 80) * 1.2)`,
  dark in the valleys and full at the snow line.
- **The sun** is a soft disc of added light behind the range, with a wide faint glow of
  sky round it. The scene has no ground light. Fading light keeps its colour (neutral
  `cooling`).

## What the sound does

- **The land flows toward the viewer.** New land enters at the far edge and takes 5 s to
  cross the block at the default Speed. It moves smoothly: a row of land is written once,
  as it leaves the far edge, and after that it only travels.
- **How high new land stands is how loud the voice is.** The far edge is the voice right
  now. The loudness a column follows rises in about a quarter of a second and falls over
  more than one, so a phrase, not a syllable, makes a mountain, and a pause leaves a valley
  of foothills. In silence the land keeps 15% of its height.
- **Each column follows one band of the sound.** The middle of the range hears bin 0 and
  the flanks hear bin 9; speech lives in the first ten of the 32 bins. Every column also
  answers the overall loudness a little: `amp = min(1, 0.7 * band + 0.45 * flame)`.
- **Loud land is snow-capped.** The snow line is at 1.05 of a tallest peak of 2.15, so
  speech puts snow on the higher peaks and music on most of the range.
- **The light answers at once.** The sun and its light on the land brighten with each
  syllable; the sun climbs with the slow average of the voice. The whole range lifts a
  little with the voice (from 86% to 110% of its height).
- **A beat** (the kit's) lifts the range further, flares the sun and brightens its light.
- **Mic off, Idle animation on:** the land keeps flowing, raised by a slow swell that
  differs across the range. **Mic off, Idle animation off:** the land stands still.
  (The camera still drifts, as in the other scenes, and the colours still move through the
  palette, as they did in the old effect.)

## Settings

- `speed` (kept): how fast the land flows. 50 crosses the block in 5 s, 0 in 20 s, 100 in
  just under 3 s. It applies at once.
- `cameraDrift` (new): as in the other scenes. 0 holds the camera still; 100 doubles the
  sway.

A config saved before this change keeps its `speed` and gains the default drift. The effect
joins `VIZ_SCENES`, so the control panel shows the shared Scene placement sliders for it.
The display name does not change.

## How it is made

- `overlay/mountains.js` (`TimbreMountains`), loaded by the three overlay pages after
  `sunburst.js` and by `verify` under Node. First the arithmetic (the shape of the land, a
  column's band, loudness, how high the voice lifts the land, the sink toward the edges,
  the flow, the colour, and the land itself), then `definition()` for
  `TimbreScene.factory()`. `overlay/factories/mountains-3d.js` becomes one line.
- **The land is a set of rows that ride with the terrain** (`createLand()`). The grid's
  first and last rows stay on the block's far and near edges; the 52 rows between are the
  stored rows, which slide toward the viewer. So no point of land is ever read between
  two samples as it moves, and nothing swims. A row is written with the loudness of each
  column at the moment the far edge passed its place, worked out within the frame, so the
  same sound writes the same land at any frame rate.
- The land is one mesh of 54 rows of 81 points. Its positions and colours are written on
  the CPU every frame and its normals recomputed. The cut sides are a second mesh that
  follows the land's rim.
- The sun's light is one directional light with a 1024 shadow map. It is not a practical:
  it lights the land, not the unseen ground.

## Tried in the spike and dropped

- Land at full height up to the block's edges: the near cut face becomes a tall black wall
  that hides the range.
- A far edge at full height: a syllable's onset there is a thin fin. The land now rises
  over half a unit from the far edge.
- Heights that follow each syllable: the land comes out as thin blades across the block,
  not mountains.
- A large sun: it washed out to a white patch. It is small now and mostly behind the peaks.

## Known and left alone

- The far edge answers the voice at once but is sunk to 14%, so the land's own answer shows
  about half a second later, as it rises coming in. The light and the lift are what answer
  at once.
- With the mic and Idle animation off, the loudness each column follows still dies away
  over a few seconds, so the far edge settles before the picture holds still.
- Smooth shading softens the creases between rows. It reads as snow and scree.
- Over a bright backdrop the sun's added light washes out, as in every scene; the solid
  land still shows.
- No check covers the fill light, the colour of the cut sides, the colour of the sun and
  its sky glow, or the neutral `cooling`.

## Checks

Node (`npm run verify`): the table and the saved-config case; the noise and the shape of
the land; columns, bands and loudness; the rise, the lift and the sink; Speed; colour and
snow; the idle swell; the land's rows (written at their own moment, riding unchanged, the
two edges fixed, nothing jumping when a row is written, the same at 10, 30 and 60 frames a
second, odd steps, hours of travel); page order. Render (`npm run verify:render`): the
block is solid and the sun's light is added; louder is higher; silence; snow; a band
drives its own part of the range; Gain; the flow and the Speed setting; the rows in place;
the far edge; a phrase travelling; the cut edges and the base; the light and the lift; a
beat; Camera drift; the same at 30 and 60 fps; idle, and nothing moving with the mic and
idle off; palette colour; placement; cost. Every check is confirmed by breaking the code
on purpose.
