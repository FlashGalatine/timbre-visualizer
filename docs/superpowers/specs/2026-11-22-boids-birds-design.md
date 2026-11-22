# Boids as birds on a wire: design

Date: 2026-11-22. Part of issue #1 (the WebGL visualizers, redesigned one at a time).

## Why

Today's Boids is 128 flat-shaded cones that flock, drawn straight to the WebGL canvas. The
cones read as confetti. It is not on the scene kit, so it has no placement, no afterglow and
no checks of what it draws.

A first spike replaced the cones with fish. The owner had that built as an effect of its own,
School of Fish, because "Boids" sounds like birds, and asked for Boids itself as birds. A
second spike showed birds on a wire, and the owner said "Build it". Every design choice below
is the builder's; the owner skipped the questions.

## What it is

Three wires hang across the box, one above another, each sagging a little and fading out
toward its ends. In silence birds sit on them in rows, upright, wings folded: 60 of them at
the default Density.

The wires are a spectrum. Each stretch of wire listens to one of the eight lowest bands, low
at the left and high at the right, and the birds on it wear that band's colour of the palette.

The birds and the wires are solid, not light, so they show over a bright backdrop as well as
a dark one. The fish of School of Fish never rest; these birds have somewhere to sit, and what
the sound does is send them up.

## What the sound does

- **Taking off.** A bird takes off when its band sounds, or when the voice is loud enough for
  its nerve. Every bird's nerve is its own: a quiet word lifts the bold ones and a loud one
  lifts them all. As it leaves, the wire springs up.
- **In the air** the birds are a real flock: each keeps clear of the birds near it and flies
  the way they fly, and all follow a lead that wheels round the box above the wires. Louder,
  the lead goes faster and swings wider. A bird banks into its turns, beats its wings harder to
  climb and glides when it sinks.
- **A syllable** is a ripple of banking that runs back through the flock from the lead: each
  bird rolls and flashes as it passes.
- **A pause.** A bird that has heard nothing for about a second glides back to its own place
  on its wire, spreads its wings to land, and folds them. The wire dips under it and springs.
- **Silence**, with the mic on: every bird is sitting, and once the wires have stopped
  swinging the picture is exactly still.
- **With the mic off and Idle animation on**, the bands swell a little in turn, so stretches of
  wire empty and fill.
- **With both off**, nothing moves: birds in the air stop where they are.

## A thump of the mic

A hard peak is a fright. When it happens, and when it is over, is `TimbreHelix`'s shatter
machine, the one DNA, Glass Prism, Jelly and School of Fish use.

- Every bird, sitting or flying, bursts up and away at once, and the wires spring.
- While the fright lasts the birds stay in the air, however quiet it is, and fly loose: wider
  of the lead and faster.
- A peak while it lasts startles them again.
- After the calm wait the fright is over, and each bird goes by what it hears again: in
  silence they come down and land.

## Settings

| Setting | 0 | 50 | 100 |
|---|---|---|---|
| Cohesion (as before) | a loose flock, spread wide | as shown | a tight flock |
| Density | 36 birds | 60 birds | 84 birds |
| Fright sensitivity | never frightened | as DNA's Shatter sensitivity at 50 | at the lightest peak |
| Settle seconds (0 to 10, default 3) | the fright is over at once | 3 s of calm | 10 s |
| Camera drift | still | sways gently | sways twice as far |

Plus the shared Scene placement sliders. Cohesion is the one setting Boids had; a saved value
is kept. Enlarged past 100 with the Size slider the scene is cropped, as the landscape scenes
are: it is made to fill the frame at 100.

## How it is built

- `overlay/boids.js` is `globalThis.TimbreBoids`: the arithmetic (a bird's shape, the wires,
  the flock and its steps, the fright, what each bird is drawn with) and the scene's definition
  for the scene kit. `overlay/factories/boids.js` becomes one line.
- The flock is stepped at a fixed 1/60 s, a step coming due at its half, and each bird in the
  air is drawn as far on along its way as the flock is ahead of or behind its steps, as School
  of Fish does it. It takes no numbers from `Math.random`.
- The birds are one instanced mesh; the shader beats, folds, rolls and places each.
- The effect keeps its id `boids` and its name. It becomes a kit scene, the last listed.
- Changing Density re-seats the birds: the rows close up or spread, and the birds that sit
  move to their new places at once.

## Not in this design

- A murmuration of thousands. These are birds few enough to read as birds.
- Poles. The wires fade out at their ends.
- A predator.
