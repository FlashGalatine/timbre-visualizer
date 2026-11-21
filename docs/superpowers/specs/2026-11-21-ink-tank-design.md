# Ink: coloured ink poured into a tank of water

Issue: FlashGalatine/timbre-visualizer#1, "All WebGL visualizers: a straight-up redesign
from the ground up." Ink is the seventh of the eleven.

## Why

Today's Ink runs a fluid on a grid of 192 by 96 cells and stretches it over the canvas, so
it is drawn in blocks. It makes its own renderer and takes its colours as they come.

## What it becomes

A glass tank of clear water floats in the box, and the sound pours coloured ink into it.

- Each of the eight lowest bands of the sound has its own place along the top of the water
  and its own colour from the palette. While a band sounds, ink pours in there: the louder
  the band, the more ink and the faster it sinks.
- The ink sinks as a plume. The slow currents in the water carry it and stretch it into
  ribbons, and it thins away over eight and a half seconds.
- The louder the sound, the stronger the currents. In a pause the ink hangs, drifts and
  the water clears.
- A beat gives the whole tank a twist, one way and then the other, and sends a ring across
  the surface from where the loudest band pours.
- With the mic off and Idle animation on, bands take turns to pour a little. With both off
  nothing pours, the ink that is there thins away, and the picture comes to rest.

The ink is pigment, not light: it covers what is behind it, so it shows over a bright
backdrop as well as a dark one. Only the glass and the water's surface are drawn in light.

The owner saw this as a throwaway spike (ink as soft specks in a tank, over a plain and a
game backdrop) and said "Build it". Every choice below is the builder's.

## Decided by the builder

- **Scene kit.** It is a scene on the scene kit (`TimbreScene.factory`), so it takes the
  shared Scene placement sliders and makes no renderer of its own.
- **Arithmetic apart from the scene.** `overlay/ink.js` assigns `globalThis.TimbreInk`: the
  arithmetic first, then the shaders and the scene. `factories/ink.js` becomes one line.
  The file loads under Node, so `verify.mjs` checks the arithmetic there.
- **Specks, not a grid.** The ink is small soft specks, each a disc that covers a little of
  what is behind it; where many lie together they make a plume. A speck is poured at a
  band's place, sinks with a speed of its own that dies away, is carried by the current, is
  turned back and held in by the glass, the floor and the surface, grows and thins with
  age, and is gone after 8.5 seconds. Where specks lie over one another, the one poured
  later is drawn over the earlier.
- **The current** is worked out, not simulated: sums of sines in which no part depends on
  its own direction, so the water neither gathers nor thins the ink. It dies away toward
  the glass, the floor and the surface, and those turn ink back, harder the stronger the
  current, so that ink does not gather on them or in the tank's upright edges. The ink
  reads the current from tables made once a step, which is the same current to a
  ten-thousandth for a thirtieth of the work.
- **No more is poured than the water holds.** A speck is given to the oldest place in a
  ring. When the bands together would pour more than the specks in use can hold for their
  whole lives (loud music does), each band pours its share of what they can, so no speck
  is poured over while it is still in the water.
- **Steps.** The ink is moved in steps no longer than a sixtieth of a second, so thirty and
  sixty frames a second give the same tank.
- **Repeatable.** Where a speck is poured within its stream, its size and its shade come
  from a seeded sequence, never from `Math.random`.
- **Frame.** 5.0 wide by 4.2 tall, centred a quarter of a unit below the tank's middle,
  field of view 30, pitch 14. The tank is 3.3 across, 2.7 tall and 1.5 deep. Nothing can
  leave the picture: the ink is held inside the tank. The frame is taller than the tank
  needs so that the ink stands clear of the bands along the picture's edges where the kit
  dims whatever is not solid (changed after the review; the tank is about a ninth smaller
  in the picture than in the spike).
- **Order.** The glass's far faces are drawn before the ink, which covers them, and its near
  faces and the water's surface after it, so that their light lies over the ink.
- **Settings.** `swirl` stays (0 to 100, default 50): how strong the currents are; at 0
  there are none (a beat still twists the tank). New: `density` (0 to 100, default 50), 6,000 to 30,000 specks at
  once (the fewer, the larger and thicker each is, so the tank looks much the same),
  `glass` (0 to 100, default 50) and `cameraDrift`. The effect's name and id are unchanged.
- **Glass.** Asked for by the owner while this was being built: "can you add an option to
  show or hide box's boundaries?" `glass` is how bright the tank's glass and the water's
  surface are drawn: at 0 neither is drawn at all and the ink floats free (it is still held
  to the space the tank takes); 50 is as designed; 100 is twice as bright.
- **Colour.** A speck keeps the palette colour its band had when it was poured, so ink
  already in the water does not change colour as the palette turns.

## Known limits

- The kit's last pass, which every scene shares, treats a see-through pixel as partly
  light. So thin ink is drawn brighter than a true pigment would be, and over a bright
  backdrop it lightens what is behind it a little where a pigment would only cover it.
  Thick ink covers. This was left as it is: changing the kit would change every scene.
- Moving the Density slider while ink is in the water makes it jump: the specks no longer
  in use go at once, whatever their age, and every speck changes size.
- With the Scene Size slider well above 100 the lower part of the tank does reach the band
  the kit dims.

## Not in this change

- The other WebGL effects (Shards, Jelly, Boids, Rose).
- Ink that mixes: where two colours lie together the nearer speck covers the further, as
  drawn; they do not blend into a third colour.
- Refraction through the glass or the water: an overlay cannot see the game under it.

## How it is checked

- Node (`verify.mjs`, a section of its own): every function of the arithmetic, the table,
  the three pages' script order, the factory.
- Headless render (`verify-render.mjs`, a block of its own): the scene's numbers as the
  sound changes and what is drawn (ink that covers, each band at its place and in its
  colour, a pause that clears the water, the currents, a beat, the settings, live or
  still, frame rates, placement, cost).
- One independent review, then deliberate breaks of every line, each of which a check must
  catch.
- The owner's look in OBS with the real microphone before it is merged.
