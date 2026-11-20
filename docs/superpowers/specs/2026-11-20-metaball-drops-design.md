# Metaball: a ball of liquid metal and its droplets

Date: 2026-11-20. Effect id: `metaball` (unchanged). Issue: FlashGalatine/timbre-visualizer#1,
"All WebGL visualizers: a straight-up redesign from the ground up". This is the fifth of the
eleven, after Sunburst, Mountains 3D, Phosphor and Chladni.

The owner chose Metaball and Glass Prism as the next two, so every choice below is the
builder's. The owner saw stills of a throwaway spike, and the spike running beside today's
effect, and said "Build both". They are built one at a time; this is the first.

## What it is for

Today's Metaball is four spheres that wander and merge, drawn by its own renderer across
the whole canvas in colours that are not the palette's. The voice only swells it. The new
one should show the sound in what the blob does, take its colours from the palette, and
sit in the box like the other floating scenes.

## What it is

One ball of liquid metal floats in the box, built on the scene kit (`overlay/scene-kit.js`).

- **The ball** is 0.74 in radius. It is solid, so it shows over a bright backdrop.
- **The metal** mirrors a sky that is not there: one palette colour overhead, another along
  a bright horizon, the ball's own colour dimly below, and two soft white lamps. Its own
  colour is `getColor(colorT)`, the horizon `colorT + 1` and the sky `colorT + 2`.
- **Eight droplets** live inside the ball, one for each of the eight lowest bins of the
  sound. Each has its own way out of the ball, the eight spread evenly round it, and they
  turn slowly round the ball together.
- The ball and its droplets are one surface: where two are close they flow into each other
  (a smooth union, 0.42 wide), so a droplet leaving the ball bulges, draws a neck and
  pinches off.
- Fading light keeps its colour (neutral `cooling`). There is no ground light.

## What the sound does

- **A band pulls its droplet out.** A droplet's distance from the middle of the ball is how
  loud its band is, eased, up to 1.6. Its band is followed, quick to rise (12 a second) and
  slow to fall (2.2 a second), so a droplet shoots out with a syllable and drifts home.
- **Low bands are large drops and high bands small ones**: 0.44 in radius for the lowest
  down to 0.23 for the eighth, at full band; a droplet still inside the ball is 55% of that.
- **A pause is one calm ball**, a voice a ball with a few drops round it, music a cluster.
- **Loudness swells the ball** (by up to 0.1) and makes the metal glow in its own colour.
- **A beat** (the kit's) makes everything jump outward (every droplet 18% further, the ball
  0.07 larger) and the metal glow more.
- **Mic off, Idle animation on:** the bands follow a slow pattern, so droplets come and go.
  **Mic off, Idle animation off:** the droplets drift home and the ball is still. (The
  camera still drifts, as in the other scenes, and the colours still move through the
  palette, as they did in the old effect.)

## Settings

- `chrome` (kept): how much of a mirror the metal is. At 0 it is a quarter mirror over a
  soft shaded body; at 100 all mirror.
- `cameraDrift` (new): as in the other scenes. 0 holds the camera still; 100 doubles the
  sway.

A config saved before this change keeps its `chrome` and gains the default drift. The
effect joins `VIZ_SCENES`, so the control panel shows the shared Scene placement sliders
for it. The display name does not change.

## How it is made

- `overlay/metaball.js` (`TimbreMetaball`), loaded by the three overlay pages after
  `chladni.js` and by `verify` under Node. First the arithmetic (where a droplet is and how
  large, the ball, the smooth union and the surface it makes, the glow, the idle pattern),
  then `definition()` for `TimbreScene.factory()`. `overlay/factories/metaball.js` becomes
  one line.
- **The surface is drawn by marching rays in a shader**, on a sphere of radius 2.5 that
  holds the ball and every droplet at its furthest. So it is smooth at any size, where a
  mesh would show its facets. The shader's union is the module's own, written once in
  JavaScript for the checks and once in GLSL from the same numbers.
- A ray that only just misses the surface gives a soft edge a pixel and a half wide, since
  a surface drawn in a shader has no edge for the kit's multisampling to smooth.
- The effect no longer makes a renderer of its own.

## Tried in the spike and changed

- A sky and a body one palette step apart: the ball read as glossy plastic of one colour.
  They are a whole palette colour apart, with a dark floor and a bright horizon line.
- A reach of 1.75 in a frame 5.6 wide: the ball was small. The reach is 1.6 and the frame
  5.2 by 4.2.

## Known and left alone

- The palette decides how metallic it looks: with a sky and a body close in hue it reads
  more as glossy plastic than as chrome.
- A voice reaches the three or four lowest bands, so speech pulls out the large drops;
  the small ones come out with music and sibilants.
- The surface's soft edge is fractional alpha, so along the edge the stream shows through
  by a pixel.
- The droplets pass in front of and behind the ball as they turn; one behind it is hidden.

## Checks

Node (`npm run verify`): the table and the saved-config case; where a droplet leaves the
ball; how far it goes and how large it is; the ball; the smooth union; that a droplet
inside the ball leaves the ball round, one half out is joined to it and one right out is
apart; that nothing reaches past the sphere it is drawn on; the glow; the edge's width; the
idle pattern; page order. Render (`npm run verify:render`): the ball is solid with a
transparent corner; a pause is one round ball; a band pulls its own droplet out, quick out
and slow home; Gain; louder swells the ball; a beat; the Chrome setting; Camera drift; the
same at 30 and 60 fps; idle, and nothing moving with the mic and idle off; palette colours;
placement; cost. Every check is confirmed by breaking the code on purpose.
