# Jelly as a cube of jelly the voice wobbles: design

Date: 2026-11-22. Part of issue #1 (the WebGL visualizers, redesigned one at a time).

## Why

Today's Jelly is a 6 x 6 x 6 lattice of small balls joined by lines, drawn straight to the
WebGL canvas. It shows the machinery of a soft body and not the body. It does not sit in the
scene kit, so it has no placement, no afterglow and no checks of what it draws.

The owner saw a throwaway spike of a cube of jelly, asked for something to happen on a mic
thump, saw that too, and said "Build it". Every design choice below is the builder's; the
owner skipped the questions.

## What it is

A rounded cube of clear jelly floats in the box. It was set in four layers, each a colour of
the palette, running softly into the next. Small bubbles are caught inside it. It is drawn as
a solid you can see through, not as light, so it shows over a bright backdrop too: its far
side first, then the bubbles (these are light), then its near side with its highlights.

It is a real soft body. A lattice of 9 x 9 x 9 points fills the cube. Each point is joined to
its neighbours by springs and the lattice is held only near its middle, so whatever moves the
jelly reaches the outside late, and the outside overshoots and wobbles. Fine ripples die
before slow wobbles do. The skin is drawn from the lattice.

## What the sound does

- **A syllable** jolts the middle of the cube up, and the body follows late. It also squashes
  the whole body, which springs back. The squash keeps the jelly's volume: flatter is wider.
- **Each of the eight lowest bands** pulls one of the eight corners outward. Neighbours in
  pitch pull corners far apart on the cube. A band quieter than 0.06 pulls nothing.
- **A beat** slaps a face, at the next of a fixed round of places. A wave runs through the
  body, the skin brightens where it is moving and the bubbles light as it passes.
- **A pause** lets it wobble to rest. At rest it is exactly still.
- **With the mic off and Idle animation on**, the corners swell a little in turn.
- **With both off**, it rests and the picture does not change.

## A thump of the mic

A hard peak knocks the cube apart into its four layers. When that happens, and when it comes
back, is `TimbreHelix`'s shatter machine, the one DNA and Glass Prism use, so it has their two
settings.

- Each layer is a slab of jelly of one colour. It is thrown clear of the stack, tumbles, and
  goes on squashing and flapping with the voice. The bubbles stay in their slab.
- A peak while it is apart throws the slabs again, less hard.
- After the calm wait the slabs drop back onto the stack one at a time, from the bottom up.
  Each speeds up into its landing and lands with a plop that squashes it and shakes the slabs
  already there.
- When the last has landed they are one cube again, which wobbles from the landing.
- While it is apart everything is drawn as much smaller as keeps all of it in the picture. It
  shrinks at once and grows back slowly.

## Settings

| Setting | 0 | 50 | 100 |
|---|---|---|---|
| Stiffness (kept) | soft: slow, large wobbles | as designed | firm: quick, small shivers |
| Shatter sensitivity | never comes apart | as DNA | comes apart easily |
| Reconnect seconds (0 to 10) | back at once | 3 | 10 |
| Camera drift | camera still | as designed | twice the sway |

It joins the kit scenes, so the shared Scene placement sliders apply to it.

## What must hold

- All timing comes from the caller's `dt`. The soft body is stepped in fixed steps of 1/240 s
  with what is left carried to the next frame, so the same sound gives the same wobble at 30
  and at 60 frames a second. Everything else is exact for any step.
- Nothing is drawn outside the picture, whole or apart, at any Scene Size.
- At rest nothing changes: no number, and no pixel beyond the GPU's stray one.
- The arithmetic is separate from the drawing, as `globalThis.TimbreJelly`, importable under
  Node, with no global touched at load time.
- No per-frame allocation that grows; one draw stays near a millisecond of script time.

## Not in this change

- The slabs are rounded tiles of their own; the stack of four does not match the cube's skin
  point for point. The knock and the last landing hide the change.
- No shadow and no floor.
