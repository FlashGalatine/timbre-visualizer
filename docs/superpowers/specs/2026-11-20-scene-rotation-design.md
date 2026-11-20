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
- Everything a scene shows turns together. For the land that is the block, its cut sides
  and its underside, the sun and the sky's glow, and the lights, so the land is lit and
  shadowed the same way whichever way it is turned. For the deck it is the slices and
  their traces.
- Seen from where the camera rests, a turned scene may be as tall and as wide as it was
  unturned, or 86% of the frame if that is more. If it is too large for that it is drawn
  smaller. It sits where the unturned scene does, but never reaches further out than the
  unturned scene did (or 86% of the way to the frame's edge).
- The camera sways with Camera drift. Wherever it comes to, a turned scene is inside the
  frame (or reaches no further than the unturned scene does from there): it is drawn a
  little smaller again if it must be, and moved over.
- The block of land is solid from every side: it has an underside.
- The deck's traces lie on whichever side of their slices the camera sees.
- They apply at once.

A config saved before this change gains the three defaults.

## How it is made

- The arithmetic moves from `overlay/chladni.js` into the scene kit, so that all three
  scenes turn the same way: `TimbreScene.turn`, `TimbreScene.reach` (how far a turned box
  reaches on the picture) and `TimbreScene.poseFor` (where to put it and how large to draw
  it). Chladni's own `turn`, `bounds` and `poseFor` now call them.
- Each of the two scenes puts what it shows in one group, with three.js's `'XZY'` order,
  and describes itself as a box for the kit to keep in the frame: the block from its base
  to 1.26 times its tallest peak (as far as a loud voice on a beat lifts it), the deck from
  its feet to its tallest trace on a beat.
- The placement settles the size and then the place, round after round, until a round
  changes nothing (a move on the picture is larger than the move in the scene for anything
  nearer than the frame, so each round measures how much larger). For Chladni it settled
  the place first, three times, and stopped there, a little short of home; and it took no
  account of the camera's sway. So Chladni's turned plate changes a little: at Camera
  drift 50 its size by up to 0.05 and its place by up to 0.2 (in a frame 4.9 tall) at the
  worst rotations. Turned to face the camera (Rotate X at 46) it is 0.8% smaller and 0.03
  from where it was. With no rotation nothing changes.
- The sky's light is a three.js `HemisphereLight`, which takes its direction from where it
  is in the scene. Inside the turning group the group's own place would leak into that
  direction, so it stays outside and is put above the land each frame. The fill light's
  target is in the group (a target left out of the scene stays at the origin).
- The sun's shadows are measured in the scene's units, so their reach and their bias
  shrink with the block.

## Known and left alone

- Seen from straight above or from its end (Rotate Y near 90), the deck's slices are edge
  on and there is little to see. That is what a deck of upright slices looks like from
  there.
- The land's sun is behind the range. With the land turned round it is in front, and with
  the land seen from above like a map (Rotate X from about 70) the sun is over the top of
  the picture and out of it. Its glow is a sprite, which stays upright on the screen and
  does not roll with the land.
- Seen from below, the block is its dark underside.
- The box a scene is kept in the frame by is its solid part. The sky's glow behind the
  land may reach past it; the kit already fades light toward the frame's edge.
- A scene that already reaches past 86% of its frame unturned keeps the room it had. Both
  boxes do, sideways: they are loose (the deck's traces are pinned low at their ends, and
  the land sinks at its cut edges), so the box's top corners reach further than anything
  drawn.
- The fit takes the camera to be as far away as the frame's height asks, which it is on
  any page at least as wide as the frame (all three pages are, at 2:1 or wider).
- With Camera drift turned up, the unturned scenes already dip a near corner below the
  picture at the far ends of the camera's sway: at 50 the deck's front foot, by a
  twentieth of the picture's half-height; at 100 the deck, the block and the plate. That
  was so before this change, and a turned scene is allowed no more than the unturned one.

## Checks

Node (`npm run verify`): the kit's `turn`, `reach` against the camera worked out
separately, and `poseFor`; each scene's box and view, that unturned it is where it was,
and that turned every way it is no larger than it may be, as large as that allows, where
the unturned scene sits and inside the frame, with the camera still and with it swaying; the settings'
defaults, their limit and the saved-config case. Render (`npm run verify:render`): with no
rotation each scene is where it was, and the land's lights with it; turned, a corner is
where the settings put it (by three.js's own angles) and the picture stays inside the
canvas; the land's lights, shadows and sun turn with it; turned right over it is still a
solid block; the deck's traces show from behind; more Camera drift gives a turned scene
more room; a change applies at once, both ways. Chladni's own checks
of its rotation still pass. Every check is confirmed by breaking the code on purpose.
