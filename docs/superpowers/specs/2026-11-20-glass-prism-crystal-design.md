# Glass Prism: a cut crystal turning in the light

Part of issue #1 ("All WebGL visualizers: a straight-up redesign from the ground up"). The
owner skipped the design questions, so every choice here is the builder's, shown first as a
throwaway spike in the gallery and approved with "Build both" (Metaball and Glass Prism).

## Why

The present Glass Prism is a physically shaded icosahedron with transmission, lit from a
small built-in colour map. It makes its own renderer, sits on an opaque-looking body that
reads poorly over a game, keeps its own colours instead of the palette's, and ignores the
Scene placement sliders. On the small overlay page its edges are coarse.

## What it becomes

A twenty-sided crystal floats in the box and tumbles. It is drawn in light only, so it reads
as glass over any backdrop:

- its ridges glow, with a little light bleeding in from each ridge;
- a facet flashes as it turns to mirror one of two lamps toward the eye;
- you see through it to the far facets, which are dimmer;
- each facet belongs to one of ten bands of the sound and brightens when that band sounds;
- a soft glow sits inside it and swells with the voice.

Like light through a prism, its colours come apart. The crystal is drawn three times, in
three neighbouring palette colours, and the three copies drift apart (in size, in roll and
sideways) with the high end of the sound and on a beat, so its edges split into coloured
fringes. In silence the copies all but coincide and the crystal is nearly one colour of
light.

The voice turns it faster. A beat kicks its tumble about a new axis each time, and the kick
dies away. With the mic off and Idle animation on it tumbles slowly and the facets take
turns. With both off it stops turning and is still (its colours still move through the
palette).

## Decided by the builder

- **Scene kit.** It is the thirteenth scene on the scene kit (`TimbreScene.factory`), so it
  gets the kit's renderer, smoothing, afterglow, Scene placement and camera for nothing. The
  old factory and its renderer go.
- **Arithmetic apart from the scene.** `overlay/glass-prism.js` assigns
  `globalThis.TimbreGlassPrism`: the numbers first (plain functions the Node suite imports),
  then the shader, then `definition()`. Nothing touches `document`, `THREE` or core globals
  at load time.
- **Frame.** 5.2 wide by 4.2 tall about the origin, field of view 30, pitch 8. The crystal's
  corners are 1.3 from its middle.
- **Bands.** The ten lowest bins, each times Gain, followed at 20 a second up and 5 down.
  Facet `f` answers band `f mod 10`. "The high end" is the mean of bands 5 to 9.
- **The tumble.** About an axis that wanders slowly with the scene's clock, at
  0.25 + 1.5 × voice radians a second. A beat sets a spin of 2.2 to 3.1 radians a second about
  an axis taken from a fixed sequence (no random numbers), which dies away at 2.5 a second. The
  angle a dying spin turns in a step is worked out exactly, so the same sound gives the same
  tumble at any frame rate (to within the slow wander of the axis).
- **Coming apart.** `apart = (0.018 + 0.1 × high + 0.08 × beat) × chroma / 50`, followed at
  10 a second. Copy `c` (0, 1, 2) is `off = (c − 1) × apart` larger, rolled `0.9 × off`
  radians about the line of sight, and moved `0.5 × off` to the camera's right.
- **Colours.** Copy `c` takes the palette colour at `colorT + c`; the glow inside takes
  `colorT + 1`. No colours of its own.
- **Settings.** `chroma` stays (0 to 100, default 50): how far the colours come apart; at 0
  they do not. `cameraDrift` is new (default 50), as in the other scenes. No Rotate sliders:
  the crystal tumbles through every side by itself.
- **Stillness.** A level within a ten-thousandth of nothing is nothing (as in Metaball), so
  with the mic and Idle animation off the picture comes to rest.

## Not in this change

- The other WebGL effects (Ink, Shards, Jelly, Boids, Rose).
- Refraction of what is behind the crystal: an overlay cannot see the game under it.

## How it is checked

- Node (`verify.mjs`, a section of its own): every function of the arithmetic, the table
  (`VIZ_SCENES`, defaults, a saved pre-redesign config), the three pages' script order, the
  factory.
- Headless render (`verify-render.mjs`, a block of its own): the scene's numbers as the
  sound changes, what is drawn (light only, three colours that come apart, facets that
  answer their bands), the settings, live or still, frame rates, placement, cost.
- One independent review, then deliberate breaks of every line, each of which a check must
  catch.
- The owner's look in OBS with the real microphone before it is merged.
