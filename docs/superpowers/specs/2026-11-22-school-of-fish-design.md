# School of Fish, a new effect: design

Date: 2026-11-22. A new effect, the 52nd. It came out of issue #1 (the WebGL visualizers,
redesigned one at a time).

## Why

The next effect on the list was Boids: 128 flat-shaded cones that flock, drawn straight to the
WebGL canvas. The cones read as confetti. A throwaway spike tried a school of fish in their
place, and the owner said to build it.

"Boids" sounds like birds, though, so the owner ruled that the fish are an effect of their own,
called **School of Fish**. Boids keeps its name and its id and is left as it is; it is to be
redesigned as a flock of birds later. Every other design choice below is the builder's; the
owner skipped the questions.

## What it is

A school of fish swims in the box. Each fish is a small solid body with a forked tail, a fin on
its back and an eye; a wave runs down it as it swims. The fish are solid, not light, so they
show over a bright backdrop as well as a dark one. A few bubbles rise from the school; those
are light.

It is a real flock. Each fish looks only at the fish near it: it keeps clear of them, swims
the way they swim, and stays with them. What holds the school in the picture is that it
*mills*: every fish also swims round with the rest and makes for its own place in the school,
so the school turns as one body.

The school has one of three shapes:

- **a ball**: each fish goes round the middle on its own tilted round, as in a bait ball;
- **a ring**: all go round one circle, leaning toward the viewer so that it shows as an oval;
- **a column**: a funnel, narrow at the foot and wide at the top.

It starts as a ball.

## What the sound does

- **Loudness.** Louder, the school swims faster and draws in. In silence, with the mic on,
  it goes on milling slowly.
- **A syllable** is a shimmer that runs once round the school. Where it passes, fish roll onto
  their sides and their flanks flash. It starts at one side and has faded a good deal by the
  time it has gone round. A few bubbles leave the school.
- **Each fish listens to one of the eight lowest bands** and wears that band's colour of the
  palette. The low bands are big fish and the high bands small fry. While its band sounds, a
  fish glows, swims faster and swings wider of the middle.
- **A beat** makes the whole school dart forward, and flash.
- **With the mic off and Idle animation on**, the bands swell a little in turn.
- **With both off**, nothing moves: the fish stop where they are, and the picture does not
  change (with Camera drift at 0 and the palette's Colour speed at 0, which follow the clock
  in every kit scene).

## A thump of the mic

A hard peak is a fright. When it happens, and when it is over, is `TimbreHelix`'s shatter
machine, the one DNA, Glass Prism and Jelly use.

- Every fish bolts away from the middle of the school. Each dashes between half and nearly
  all of the way to the edge of an egg-shaped space in the box.
- Then each fish loiters about where it ended up, so the school stays scattered.
- A peak while they are apart makes them bolt again, each its own way, less hard.
- After the calm wait they stream back, and they come back as the **next** shape: ball, ring,
  column, and round again. A fish hurries while it is far from its place and slows as it
  nears it. Frightened again on the way, they still come back as that same next shape.
- All of it stays in the picture: everything is drawn as much smaller as that takes, at once,
  and grows back slowly. The same rule holds a school in the picture when the Size slider
  enlarges it.

## Settings

| Setting | 0 | 50 | 100 |
|---|---|---|---|
| Density | 96 fish | 288 fish | 480 fish |
| Fright sensitivity | never bolts | as DNA's Shatter sensitivity at 50 | bolts at the lightest peak |
| Regroup seconds (0 to 10, default 3) | back at once | 3 s of calm | 10 s |
| Camera drift | still | sways gently | sways twice as far |

Plus the shared Scene placement sliders. The names are the builder's: the two thump settings
work exactly as Shatter sensitivity and Reconnect seconds do elsewhere, but nothing shatters
here.

## How it is built

- `overlay/school-of-fish.js` is `globalThis.TimbreSchool`: the arithmetic (the fish's shape,
  the school and its steps, the shimmer, the bubbles, how much room it needs) and the scene's
  definition for the scene kit. `overlay/factories/school-of-fish.js` is one line.
- The school is stepped at a fixed 1/60 s, so it swims the same at any frame rate. It takes
  no numbers from `Math.random`: a thump scatters the fish the same way every time.
- The fish are one instanced mesh; where each is, the way it faces, its roll, its tail's beat
  and its glow are per-fish numbers sent each frame, and the shader bends and places it.
- Effect id `school-of-fish`, shown as "School of Fish". It is listed after Boids. It is a
  kit scene, the last listed.

## Not in this design

- Boids itself. It stays as it is until its own redesign.
- A predator, or anything else that would chase the fish.
- Fish that eat, or that differ in kind. They differ only in size and colour.
