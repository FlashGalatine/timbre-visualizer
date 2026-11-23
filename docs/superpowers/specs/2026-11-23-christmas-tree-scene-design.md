# Christmas Tree, as a lit tree in the snow

Date: 2026-11-23. Effect id: `christmas-tree` (unchanged). One of the eighteen seasonal
scenes that are being rebuilt as floating 3D scenes on the scene kit.

The owner asked for it next and gave no direction, so every choice here is the builder's.
A throwaway spike was shown in the gallery (silence, talking, the voice on the string, a
thump, the bare tree, the snow settling, idle), and the owner said "Build it".

## What it replaces

A flat tree of four triangles drawn in pixels over a dark blue sky: each tier listened to a
part of the sound and its square lights brightened, the star pulsed with the loudness, and
square snow fell. Settings: `lightDensity`, `snowSpeed`, `starGlow`.

## What it is

A fir tree stands on a low drift of snow, with five presents round its foot. It has six
tiers of boughs with snow lying on them, a gold star on its top, a string of lights wound
round it from under the star to its lowest boughs, and a bauble hanging under the tip of
every bough (seven tips to a tier, forty-two baubles). Snow falls all the while.

Everything is solid but the glows, so the tree shows over a bright game as well as a dark
one. Only light is added light: the glow round each light of the string, the star's glow and
rays, and the light that lands on the kit's unseen ground.

## What the sound does

- **The star hears the voice.** It flares at once as you speak: its gold brightens, its glow
  and its rays grow, and the light it throws on the snow rises.
- **The voice runs down the string.** What the star heard travels down the string of lights,
  from the star to the lowest boughs in 1.1 seconds, so each syllable is a pulse of light
  winding round the tree. In silence every light glows low and twinkles in its own time. A
  beat brightens some of them for a moment.
- **The baubles are a spectrum.** Each tier listens to a part of the sound, the lowest of the
  eight lowest bands at the foot and the highest under the star. Its baubles light from
  inside as far as it is loud, and a rise in it sets them swinging.
- **The star and the string are real lights.** The star is a light that casts shadows: it
  lights the snow round the tree, and the tree and the presents throw shadows on it. The
  string is one more light in front of the tree, in the mean colour of its lights and as
  bright as they are, so the tree's front and the presents take their colours.
- **A thump shakes the tree.** A hard peak of the mic (the shatter machine, as DNA and the
  rest hear it) rocks the tree on its trunk, sets every bauble swinging, makes the lights
  flicker while it rocks, and knocks the snow off every bough: it comes away as clumps that
  fall, the top tiers first. A peak while the tree is bare shakes it again, less. After a
  calm wait the snow settles on the boughs again, slowly.
- **Snow falls**, a little more when you speak and after beats.

With the mic off and Idle animation on, the kit's slow swell stands in for the voice (the
star and the string breathe), the bands swell in turn up the tree, and nothing shakes it.
With the mic and Idle animation both off nothing on the tree moves and the snow hangs in the
air; the camera and the palette go on, as in every scene.

## Colours

The lights of the string run through five colours taken evenly from round the palette, and
the baubles through seven; they move as the palette's own Colour speed and Colour hue move
them. The tree is always green, the star always gold, the snow white, and the presents keep
their own papers and ribbons.

## Settings

| Setting | Range, default | What it does |
| --- | --- | --- |
| `lightDensity` | 0 to 100, 60 | How many lights are on the string: 48 to 128 (96 at 60). Kept, with any saved value. |
| `starGlow` | 0 to 100, 50 | How far the voice swings the star, its rays and the light it throws: not at all at 0 (a plain gold star with a faint glow), twice as far at 100. Kept. |
| `snowfall` | 0 to 100, 50 | How much snow falls: none at 0, twice as much at 100. New; it takes the place of `snowSpeed`, which is retired (a saved value is dropped). |
| `shakeSensitivity` | 0 to 100, 50 | How hard a peak must be to shake the tree, by DNA's rule; never at 0. |
| `resettleSeconds` | 0 to 10, 3 | The calm wait before the snow settles on the boughs again. |
| `cameraDrift` | 0 to 100, 50 | How far the camera sways. |

The shared Scene placement sliders apply.

## How it is made

`overlay/christmas-tree.js` is `globalThis.TimbreTree`, in the manner of `rose.js` and
`boids.js`: everything but `definition()` is arithmetic that runs under Node, and the
factory file is the kit's one line.

- **The tree's shape** is arithmetic: a tier is a skirt of boughs (Winter Aurora's pine tier)
  with a rim of seven tips, each tier turned from the one below; `surfaceR(y, phi)` says how
  far out the tree reaches at a height and a way round, taking the line from one rim to the
  next where a string would hang. The string is a spiral on that surface with its lights
  evenly along it (`garland(n)`), and the baubles hang under the rim tips.
- **The tree's state** (`createTree`) is stepped at 1/60 s, a step due at its half and at
  most six a frame, like the rose: what the star heard (a ring of the last 96 steps), the
  star's own level, the lean of the trunk (a spring), each tier's snow (0 to 1), each
  bauble's swing (a spring) and glow, every falling flake and every clump, and a flash after
  a thump. It takes no numbers from `Math.random`: flakes and thumps draw from seeded
  generators, so the render checks can make the tree again frame for frame.
- **What is drawn** (`dress`) is arithmetic too: each light's colour and its glow's colour and
  size, each bauble's place, colour and inner light, each tier's snow, every flake, the
  star's numbers and the two lights' colours and strengths.
- **The scene** builds the solids with three.js's own lit materials (boughs, snow, trunk,
  drift, presents, star), and four small shaders of its own for what is drawn many times
  over: a light of the string, its glow (added light), a bauble, and a snowflake.

## Left alone, and known

- Clumps of snow fall straight through the boughs below them; in the picture they are lost
  among the boughs and reappear under them.
- The lowest boughs reach a little past the drift at the front, so a clump can fall beside
  the drift and end at the unseen ground.
- With a palette colour near green, green lights and baubles hang on a green tree.
- The star's shadows are drawn again every frame, like every scene's.
