# Shards: a broken mirror the voice opens up — design

Issue #1 asks for every WebGL visualizer to be redesigned from the ground up. This is
Shards. The owner skipped the design questions, saw a throwaway spike in the test gallery
and said "Build it"; every choice below is the builder's.

## What it is today

About 250 small tetrahedra on a sphere, each moving in and out with one bin of the sound,
drawn by a renderer of the effect's own. It reads as a ball of confetti.

## What it becomes

A pane of mirror glass floats in the box, already broken. Cracks run out from the point
where it was struck, a little left of its middle and above it, and rings of cracks cross
them, so the pane is a few hundred shards that still fit together. A light sits behind it.

**The voice opens it.** Each syllable starts at the point of impact and travels outward as
a ripple, reaching the furthest corner three quarters of a second later. The shards it
reaches lift toward the viewer, move apart and tip outward like petals, then sink back.

- A pause is a flat cracked mirror.
- A voice is a pane that blooms open from its middle in waves.
- Music is a pane that never quite closes.
- Each sector of the pane also listens to one of the eight lowest bands of the sound, so
  the bloom is uneven and changes with the sound.
- A beat sends a sharper, faster ring outward.

**The shards are mirrors.** Each shows a sky made of the palette's colours with long soft
lights in it, so every shard shows its own piece of them and the pane reads as a mirror
and not as coloured paper. A shard flashes when it tips far enough to catch one of three
lamps. No shard lies perfectly flat, even at rest. The cut edges of the glass glow in the
colour of the light behind the pane, brighter the further a shard is open.

**The shards are solid**, so the pane shows over a bright backdrop as well as a dark one.
The light behind it is light only.

With the mic off and Idle animation on, the sectors take turns to lift a little. With both
off the pane closes and the picture holds still.

## Settings

| Setting | Range | Default | What it does |
|---|---|---|---|
| `density` | 0 to 100 | 50 | How finely the pane is broken: about 110 shards at 0, 270 at 50, 480 at 100. Kept from today's effect, where it was also the number of shards. |
| `bloom` | 0 to 100 | 50 | How far the sound opens the pane. At 0 it stays shut and only its lights change. |
| `cameraDrift` | 0 to 100 | 50 | How far the camera sways. |

It also uses the shared Scene placement sliders. The effect's id `shards` and its name are
unchanged, so saved configs keep working: a saved `density` is kept.

## How it is made

- A kit scene (`TimbreScene.factory`), like the other redesigned effects; no renderer of
  its own.
- `overlay/shards.js` (`TimbreShards`): the arithmetic first (the cracks, the shards cut
  from them, how far each is open, where that puts it), then the shaders, then
  `definition()`. `overlay/factories/shards.js` becomes one line.
- The cracks come from a seeded sequence, so the pane is the same every time for a given
  Density. Changing Density breaks the pane anew.
- Every shard is a small prism with a top (the mirror), a back and cut sides. All of them
  are one mesh; each frame the arithmetic places every corner. A few hundred shards cost
  about a third of a millisecond.
- The ripple is the kit's shared voice history (`TimbreScene.createHistory`): one for the
  voice, one for each band, one for the beat. A shard reads them as long ago as the ripple
  takes to reach it.
- All timing from `dt`; no `Math.random`.

## Out of scope

- A shatter on a mic thump, as Glass Prism and DNA have. The pane is already broken; a
  loud hit opens it as far as it goes.
- Reflections of the scene itself. The sky a shard shows is made up.

## Risks to check in the build

- At the widest opening no shard may leave the picture, at any Size the kit allows by
  default, on the small page as well.
- A shard that tips too far shows its dark back or goes edge-on; the tip is held short of
  that.
- With the mic muted the levels must fall to nothing and the picture come to rest.
- Density changed while the pane is open.
