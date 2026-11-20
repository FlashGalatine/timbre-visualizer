# Rotate settings for Mountains 3D and Phosphor

Date: 2026-11-20. Effect ids: `mountains-3d` and `phosphor` (unchanged).

The owner asked for Chladni's plate to be turnable, saw it in OBS, and then asked for the
same on any other visualizer that would gain from it. Which ones is the builder's choice,
told to the owner: the two other scenes that are a single object seen from one fixed side,
the block of land and the deck of slices. The star, the flags and the two landscape scenes
are left out unless the owner asks.

## What it is for

A streamer can choose the side a scene is seen from: the land from above like a map, the
deck from its end, either turned to suit where it sits on the stream.

## What it is

- `rotateX`, `rotateY` and `rotateZ` on both effects: 0 to 360 degrees, all 0 by default,
  the same three settings Chladni has. Rotate Y spins the thing in its own plane, Rotate Z
  rolls it to one side, Rotate X tilts its top toward the viewer; they apply in that order.
- With all three at 0 nothing changes: each scene is drawn exactly as before.
- Everything a scene shows turns together. For the land that is the block, its cut sides,
  the sun and the sky's glow, and the lights, so the land is lit and shadowed the same way
  whichever way it is turned. For the deck it is the slices and their traces.
- A scene turned so that it would leave the frame is drawn smaller and moved to sit where
  the unturned scene does. It may reach as far from the middle of the frame as it did
  unturned, or 86% of the way to the frame's edge if that is further.
- They apply at once.

A config saved before this change gains the three defaults.

## How it is made

- The arithmetic moves from `overlay/chladni.js` into the scene kit, so that all three
  scenes turn the same way: `TimbreScene.turn`, `TimbreScene.reach` (how far a turned box
  reaches on the picture) and `TimbreScene.poseFor` (where to put it and how large to draw
  it). Chladni's own `turn`, `bounds` and `poseFor` now call them.
- Each of the two scenes puts what it shows in one group, with three.js's `'XZY'` order,
  and describes itself as a box for the kit to keep in the frame: the block from its base
  to 1.2 times its tallest peak, the deck from its feet to its tallest trace on a beat.
- The placement now settles the size first and then the place, four times over; for
  Chladni it settled the place first, three times. Chladni's results differ in the third
  decimal place.

## Known and left alone

- Seen from straight above, the deck's slices are edge on and there is little to see. That
  is what a deck of upright slices looks like from above.
- The deck's traces lie flat in the plane of their slices, which suited a camera always in
  front of the deck. From behind or from the side they are seen thinner.
- The land's sun is behind the range. With the land turned round it is in front.
- The box a scene is kept in the frame by is its solid part. The sky's glow behind the
  land may reach past it; the kit already fades light toward the frame's edge.
- A scene wider than 86% of its frame unturned (both are, on a narrow page) keeps the room
  it had; turned, it can pass that by a few hundredths but never passes the top or bottom
  of the frame.

## Checks

Node (`npm run verify`): the kit's `turn`, `reach` against the camera worked out
separately, and `poseFor`; each scene's box and view, that unturned it is where it was,
and that turned every way it stays between the top and bottom of its frame; the settings'
defaults, their limit and the saved-config case. Render (`npm run verify:render`): with no
rotation each scene is where it was; turned, a corner is where the settings put it and the
picture stays inside the canvas; a change applies at once, both ways. Chladni's own checks
of its rotation still pass. Every check is confirmed by breaking the code on purpose.
