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
as glass over a dark or mid-toned backdrop (light adds to what is behind it, so over white
it cannot show):

- its ridges glow, with a little light bleeding in from each ridge;
- a facet flashes as it turns to mirror one of two lamps toward the eye;
- you see through it to the far facets, which are dimmer;
- each facet belongs to one of ten bands of the sound and brightens when that band sounds;
- a soft glow sits inside it and swells with the voice.

Like light through a prism, its colours come apart. The crystal is drawn three times, in
three neighbouring palette colours, and the three copies drift apart (in size, in roll and
sideways) with the high end of the sound and on a beat, so its edges split into coloured
fringes. In silence the copies are close together, a few pixels apart, and where they lie on
one another their three colours add up to one pale light.

The voice turns it faster. A beat kicks its tumble about a new axis each time, and the kick
dies away. With the mic off and Idle animation on it tumbles slowly and the facets take
turns. With both off it stops turning (the camera still drifts, as in the other scenes, and
its colours still move through the palette).

## Decided by the builder

- **Scene kit.** It is a scene on the scene kit (`TimbreScene.factory`), so it
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
- **Stillness.** A level within a ten-thousandth of nothing is nothing, so with the mic and
  Idle animation off every number in the scene comes to rest.
- **The light it leaves behind** is gone in 0.06 s, all colours alike (changed after the
  review). With the kit's usual afterglow a fast tumble left every frame's ridges behind
  it, and on a beat or a loud voice the crystal smeared into a blob of light.
- **Ridges are drawn for the page's pixels**, never thinner than three quarters of one
  (changed after the review). On the small page the kit draws into a picture four times the
  page and shows only the middle of each block of sixteen, so a ridge two of those pixels
  wide came out in dashes.

## Added after the owner's first look: the pulse and the shatter

The owner, looking at it in OBS: "I think the prism should also expand and contract based
on the beat of the sound. Maybe it can shatter when I thump the mic and then reform itself
after a while." The choices below are the builder's.

- **The pulse.** A beat sets the crystal swinging like a spring let go: about 18% larger
  in a tenth of a second, then about 5% smaller than it was, then still, all within two
  seconds. It is a damped spring (14 radians a second, damping 0.35) worked out exactly, so
  it is the same at any frame rate; a beat is a push of `4 × pulse / 50`. Beats one after
  another add up. Its size is never under 0.7 or over 1.6.
- **The shatter.** A hard peak on the mic breaks the crystal into its twenty facets. Each
  is pushed outward (give or take) and set spinning about its own middle; the push and the
  spin die away in 0.38 s and a slow drift carries on. A peak while it is in pieces jostles
  them; after Reconnect seconds of calm they are carried home over a second and a half, the
  short way round and each in its own time, and the crystal is whole again, corner for
  corner. A peak during the return blows them out again. A shatter, a jostle and the moment
  it is whole again each come with a flash.
- **When it breaks is DNA's rule.** The state machine is `TimbreHelix.createShatter`, the
  one DNA and Pulse Rings use, so all three hear the same thing: the raw peak of the mic,
  before Gain, against the Shatter sensitivity setting; the mic must have been on and the
  crystal whole for 0.4 s; never with the mic off. How the facets fly is this scene's own,
  in 3D and in the crystal's own frame, so the pieces go on tumbling together.
- **Nothing leaves the picture.** No facet is drawn further than 3.2 from its place. The
  whole crystal is drawn smaller by just as much as keeps its largest copy within 2 of the
  middle (the picture takes a ball that size on every page, wherever the camera is). So a
  shatter looks like the camera pulling back, and in pieces the facets are about four
  tenths of their size. Once it is in pieces a fifth of the room is kept for the pulse, so
  a beat still swells it. What the pieces need is held: it shrinks at once and grows back
  at 2 a second. What a beat's swell needs on top of that is taken as it comes, both ways.
  This holds with Scene placement in the middle. The Size slider enlarges the picture, so
  above 100 the room is less by as much (2 over the enlargement), but never less than the
  whole crystal itself takes: enlarged until the crystal fills the picture, its pieces have
  no more room than it had. Slid to one side with the placement sliders, it can be cut off
  as any scene can. The kit also dims light near the edges of the picture (the bottom
  fifth, the top tenth, a seventh at each side), so the outermost pieces are fainter.
- **A long din.** A peak while it is in pieces pushes each facet any way at all, but one
  that has flown beyond 3.2 is pushed back toward its place, so that minutes of loud music
  do not gather every facet at its limit.
- **The source hidden.** If the page stops drawing for a second or more while it is in
  pieces (the source hidden in OBS), it is whole and its own size at once when it draws
  again, without a flash.
- **Settings.** `pulse` (0 to 100, default 50; 0 is none), `shatterSensitivity` (0 to 100,
  default 50; 0 never shatters) and `reconnectSeconds` (0 to 10, default 3), the last two
  named and scaled as DNA's are.
- **Repeatable.** The facets' flight takes its numbers from a seeded generator, a new seed
  for each shatter, never from `Math.random`.

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
