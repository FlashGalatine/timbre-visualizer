# Sunburst: a star with a crown of light

Date: 2026-11-14. Effect id: `sunburst-3d` (unchanged). Issue: FlashGalatine/timbre-visualizer#1,
"All WebGL visualizers: a straight-up redesign from the ground up". This is the first of the
eleven that are left.

The owner asked for the WebGL effects to be redesigned from the ground up, chose Sunburst as
the next one, and skipped the design questions, so every choice below is the builder's. The
owner saw stills of a throwaway spike and said "Build it".

## What it is for

Today's Sunburst is a white ball with hair-thin, one-pixel lines, drawn by its own renderer.
It reads as a small tuft at speech levels. The new one should read as a sun that bursts with
the voice, look soft and deep, and sit in the box like the other floating scenes.

## What it is

A small star floats in the box, built on the scene kit (`overlay/scene-kit.js`).

- **The star** is a solid ball, white-hot in the middle and palette-coloured at its limb, with
  two soft discs of added light around it (a tight one and a wide one).
- **The crown** is a set of soft, tapered beams of light, one for each of a number of
  directions spread evenly over a sphere. Each beam is a strip of added light that is turned
  to face the camera every frame, bright along its spine and dim at its edges, wide at the
  star and narrowing to 8% of that at its tip.
- Colours come from the palette exactly as they do today: a beam's colour is
  `getColor(colorT + (i / n) * 1.4)`, white near the star and its own colour further out.
- The scene has no ground light and throws no shadows. Fading light keeps its colour
  (neutral `cooling`).

## What the sound does

- **Each beam follows one band of the sound.** A beam's band comes from how far its direction
  is from the crown's middle belt: the belt hears bin 0, the poles hear bin 9, with a little
  scatter so the crown is not banded. Speech lives in the first ten of the 32 bins, so the
  bands stop there. Every beam also answers the overall loudness a little, so no beam is dead
  while someone talks: `amp = min(1, 0.7 * band + 0.45 * flame)`.
- **A beam's length** is `REACH * (0.1 + 0.9 * amp) * (1 + 0.3 * kick)`. It rises quickly (22
  a second) and falls slowly (3.5 a second).
- **Each syllable bursts outward.** The scene keeps a history of the voice (24 samples, 20 a
  second). The light at a point on a beam is as bright as the voice was when that light left
  the star: light takes 0.9 s to travel the longest reach. So a syllable is a shell of
  brightness that leaves the star and travels out along every beam.
- **A beat** (the kit's) lengthens every beam by up to 30%, widens them, brightens them and
  swells the star.
- **The low end** swells the star. **The high end** makes the outer half of each beam flicker.
- **The crown turns** about a tilted axis: `0.1 + 0.35 * flame + 0.5 * kick` radians a second
  at the default Spin. The tilt wanders slowly.
- **Mic off, Idle animation on:** the kit's slow swell drives it, and the beams breathe in a
  slow pattern. **Mic off, Idle animation off:** the star is a small still ball with short
  spikes; the crown does not turn and nothing flickers. (The camera still drifts, as in the
  other scenes.)

## Settings

- `density` (kept): how many beams, 24 at 0, 84 at 50, 144 at 100. Applies at once.
- `spin` (new): how fast the crown turns. 0 holds it still; 100 doubles the speed.
- `cameraDrift` (new): as in the other scenes. 0 holds the camera still; 100 doubles the sway.

A config saved before this change keeps its `density` and gains the two defaults. The effect
joins `VIZ_SCENES`, so the control panel shows the shared Scene placement sliders for it.
The display name does not change.

## How it is made

- `overlay/sunburst.js` (`TimbreSunburst`), loaded by the three overlay pages after `flag.js`
  and by `verify` under Node. First the arithmetic (how many beams, their directions, a
  beam's band, loudness, length and width, the strip of one beam, its brightness and colour),
  then `definition()` for `TimbreScene.factory()`. `overlay/factories/sunburst-3d.js` becomes
  one line.
- The beams are one mesh. Its positions and colours are written on the CPU every frame
  (at most 144 beams of 13 pairs of vertices). The strip arithmetic is plain numbers, so the
  Node suite checks it.
- **Kit: a voice history.** `TimbreScene.createHistory(size, hz)` gives
  `{ step(level, dt), byAge, heard(seconds) }`. It is the scheme Winter Aurora and the flags
  each carry a copy of; this scene uses the kit's. Moving those two over is separate work.
- **Kit: the camera is in place before a scene's first update.** `update()` runs before the
  kit places the camera, so on the first frame the camera was still at the origin. A scene
  that turns things to face the camera needs it from the start, so the kit now places the
  camera once when the scene is created.

## Tried in the spike and dropped

- Rings of light thrown off on a beat: the kit's afterglow keeps the brightest light a pixel
  has had, so an expanding ring leaves a filled disc behind it.
- Glints at the beam tips: moving points leave dotted trails in the afterglow.
- A light on the unseen floor under the star: a large white pool that read as a lamp.

## Known and left alone

- The afterglow smears the turning crown slightly. It reads as softness.
- Over a bright backdrop added light washes out, as in every scene; the solid star still shows.
- The beam strips cross where they leave the star; the star covers that.

## Checks

Node (`npm run verify`): the table and the saved-config case; beam count; directions; bands;
loudness; length; the strip (spine, taper, facing the camera, a beam pointing at the camera);
brightness and colour; the kit's history; page order. Render (`npm run verify:render`): the
star is solid and its light is added; louder is longer; a band drives its own beams; a
syllable travels outward; a beat; the three settings; the same at 30 and 60 fps; idle, and
nothing moving with the mic and idle off; palette colour; the camera in place on the first
frame; cost. Every check is confirmed by breaking the code on purpose.
