# Rose: a rose the voice makes bloom

Issue: FlashGalatine/timbre-visualizer#1 (the last of "All WebGL visualizers: a straight-up
redesign from the ground up").

## Why

Rose is the last effect that is not on the scene kit. It draws the wireframe of a model file
(`overlay/assets/rose.stl`) spinning, with sparks, through its own renderer and a shared
group of "3D model" settings that no other effect uses any more. It is a turning mesh that
swells with the sound, and it does not say much about the voice.

The owner asked for an overhaul and gave its three parts:

- idle, the rose has its petals on its head;
- reacting to sound, it grows thorns and petals sprout;
- a thump of the mic is like Boids and School of Fish: the petals fly around.

The owner saw a throwaway spike of this (stills and live in the gallery) and said "Build it".
Every other choice below is the builder's.

## What it is

One rose, made in code, floating in the box: a curved stem that leans, two leaves of three
leaflets, five sepals under the head, and a head of petals set in a spiral. No model file.
Everything is solid (not light), so it shows over a bright backdrop as well as a dark one.

**In silence** it is a small, neat rose. Every petal is on the head; the stem is smooth. The
head sways a little on its stem.

**The voice makes it grow.**

- *Thorns.* Sixteen thorns stand along the stem. The stem is a spectrum: each thorn listens
  to one of the eight lowest bands, low at the foot and high under the head, and a loud
  voice brings them all out. A thorn's tip wears its band's colour of the palette. Thorns
  are the mic's alone: Idle animation does not grow them.
- *Petals.* A share of the petals are always there. The rest sprout: each has a band and a
  nerve, and unfurls from under the head when its band sounds or the voice is loud enough
  for it, the inner ones first, so a quiet word opens a few and a loud one makes a full, wide
  bloom. In a pause they fold away again. How far a petal leans out goes by its rank among
  the petals now out, so a small rose is a proper rose and not the middle of a large one.
- *Syllables.* Each syllable is a ripple from the heart of the rose out through its petals,
  and up the stem through the thorns and the leaves.
- *Loudness and beats.* The louder, the wider the bloom opens and the more the head sways.
  A beat opens it a little further for a moment.

**A thump of the mic** (the shatter machine DNA, Glass Prism, Jelly, School of Fish and Boids
use) throws every petal off the head, and they fly round the box as a flock: each keeps
clear of the others, flies the way they fly, and all follow a lead that wheels round the
box, tumbling as petals do. The bare head shows a golden heart. A peak while they are loose
throws them again. After a calm wait they come home from the heart outward, each to its own
place, and the head nods as they land. No petal leaves the picture.

**Idle** (mic off, Idle animation on): the bands swell a little in turn, so a few outer
petals open and fold; no thorns. With both off, nothing moves.

**Colour.** The petals take the palette's colour, a little deeper at the heart, and move
with Colour speed and hue as every effect does. The stem, the leaves and the sepals are
green whatever the palette is (with a little of the palette in it); the heart is gold.

## Settings

| Setting | Range, default | What it does |
|---|---|---|
| `density` | 0 to 100, 50 | How many petals: 40 to 72 (56 at 50). 43% of them are always there. |
| `thorns` | 0 to 100, 50 | How long the thorns grow; none at 0, twice as long at 100. |
| `scatterSensitivity` | 0 to 100, 50 | How hard a thump scatters the petals; never at 0. As DNA's Shatter sensitivity. |
| `regatherSeconds` | 0 to 10, 3 | The calm wait before the petals come home. |
| `cameraDrift` | 0 to 100, 50 | How far the camera sways. |

It joins the scene kit's effects, so it has the shared Scene placement sliders.

## What goes

- `overlay/assets/rose.stl` and its entry in `THIRD_PARTY_NOTICES.md`.
- The shared "3D model" settings (`stlObject`: intensity, zoom, sparks, sensitivity, jitter,
  smoothing, rotation, position, clones, arrangement, spacing, spin axis): the tables in
  `shared/viz-config.js`, `cfgSTLObject` in `overlay/core.js`, and the group in the control
  panel. A saved config that still holds `stlObject` is read as before and the key dropped.
- The effect's id (`rose`) and name stay.

## Not in this

- More than one rose, or the old clones and arrangements.
- A way to load a model.
- Petals that fall and are lost: a folded petal goes back under the head.

## What would make it wrong

- Anything that reads as a cabbage: many small petals leaning out evenly from heart to rim.
  The inner petals stand close and only the outer ones open.
- A petal, a thorn or the bloom outside the picture, at any loudness, under any number of
  thumps.
- A petal that spins about itself for a step, or lands with a jump.
- Motion that depends on the frame rate, or on `Math.random`.

## How it is made

- `overlay/rose.js` is `globalThis.TimbreRose`: arithmetic (the stem, the head, the petals'
  places, the flock, the steps) that `verify` runs under Node, and `definition()`, the scene.
  `overlay/factories/rose.js` is one line. It follows `overlay/boids.js`.
- The rose is stepped in fixed steps of 1/60 s (a step is due at its half), from a seed.
- A petal, a leaflet and a sepal are one grid, drawn once for each and shaped in the vertex
  shader from a few numbers sent with it. The stem, the thorns, the leaves' stalks and the
  heart are one mesh, worked out again each frame.
