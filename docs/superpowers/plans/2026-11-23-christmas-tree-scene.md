# Christmas Tree scene: implementation plan

**Goal:** rebuild `christmas-tree` as a kit scene: a lit fir tree in the snow that the voice
lights from the star down, with a spectrum of baubles, and that a thump shakes the snow off.

**Architecture:** `overlay/christmas-tree.js` assigns `globalThis.TimbreTree` (valid as a
classic script and as a module): arithmetic first, `definition()` last, as `rose.js`. The
factory file becomes the kit's one line. State is stepped at 1/60 s from seeded generators.

**Spec:** `docs/superpowers/specs/2026-11-23-christmas-tree-scene-design.md`.

## Global constraints

- Effect id `christmas-tree` stays; saved `lightDensity` and `starGlow` are kept; `snowSpeed`
  is retired (dropped on sanitising); new `snowfall` 50, `shakeSensitivity` 50,
  `resettleSeconds` 3 (max 10), `cameraDrift` 50.
- No `Math.random` in the module. No renderer, texture file or fetch of its own.
- Nothing solid is drawn at the canvas's edge in any frame, at any setting.
- With the mic and Idle animation off no step is taken; with the mic off nothing shakes.
- Tests never touch ports 7474 or 8080.

## Files

- Create `overlay/christmas-tree.js`; rewrite `overlay/factories/christmas-tree.js` (one line).
- `shared/viz-config.js`: add the id to `VIZ_USES_3D` and `VIZ_SCENES`; new defaults; the
  `resettleSeconds` maximum.
- The three overlay pages: load `christmas-tree.js` after `rose.js` (patched by script).
- `verify.mjs`: section `[26] christmas tree`; the config checks that name the effect.
- `verify-render.mjs`: block "The Christmas tree"; the textures table.
- `docs/EFFECTS.md`, `docs/SETUP.md`, `README.md`, `CHANGELOG.md`.

## Tasks

1. **The shape.** Checks, then `rimY`, `rimR`, `tierR`, `surfaceR`, `garland`, `baubleSpots`,
   `tierGrid`, `riseHeight`, `riseGrid`, `starPoints`: the tree's outline, the string on its
   surface with its lights evenly spaced, the baubles under the tips, the solids' grids.
2. **The settings and the sound.** `countFor`, `glowFor`, `snowFor`, `loudness`, `idle`,
   `levelOf`.
3. **The state and its step.** `createTree`, `lay`, `heard`, `shake`, `resettle`, `stepTree`,
   `advance`: the star and what it heard, the trunk's spring, the snow on each tier, the
   baubles, the flakes and the clumps.
4. **What is drawn.** `dress`: lights, glows, baubles, snow caps, flakes, the star, the two
   lights; `swayFor`, `orbitAt`.
5. **The scene.** `definition()`: build, update, debug; the factory; the config; the pages.
6. **Render checks.** The block, with the tree made again from the arithmetic frame for
   frame; one bulb, one bauble and one flake alone under their shaders.
7. **Documents, stills, one independent review, deliberate breaks.**

## Review focus

Inputs the spec implies and no single task's first checks cover:

- A thump while the snow is still coming off, or while it is settling: the snow must go
  again from wherever it is, with no jump.
- Light density changed while the tree is bare or rocking: the string is laid again and the
  rest of the state stays.
- A frame that takes half a second: six steps and no more, and everything still in the picture.
- Snowfall 0 with a thump: clumps still fall; no flake is spawned.
- The mic going off while the tree is rocking and clumps are in the air: everything stops
  where it is (Idle animation off), and goes on when the mic is back.

## Breaking it on purpose: the arithmetic

107 one-line breaks of `overlay/christmas-tree.js` against the Node section: 93 caught at
first. Of the 14 that slipped past, 13 got a check (rounding the number of lights; a tier's
tips standing out in proportion; the string hanging exactly 0.92 of the line; a held clump
dropping straight; the push toward and away from the viewer; baubles swinging both ways; a
tier with next to no snow; the flash not adding up; the star coming to rest; a fall in a
tier's sound not kicking its baubles; a landed flake starting again in the same step; the
voice's power on a light; the least of each colour in the string's light), and one was a
condition that never made a difference and was removed. Run again: all caught.

## What the review found

One independent review of the branch at `d1225dc`, by a reviewer that ran its own
simulations of the arithmetic and of the scene's update under Node. Its findings, and what
was done:

1. **A second shake snatched back clumps that were still falling** (at Resettle seconds 0,
   where a peak during the return shakes the tree again): up to 30 clumps jumped as far as
   1.96 units in one frame, because a tier's clumps were always written to the same places
   in the list. A shake now uses only the places that are free. And at Resettle seconds 0 the
   lowest tier never lost its snow, though it had thrown its clumps: snow that a shake set
   going now goes on going until it is gone, and only then settles.
2. **Falling snow and clumps moved unevenly at 50, 75, 144 and 165 frames a second**: the
   tree was drawn as it stood after its last step. What moves (the lean, the baubles, the
   flakes, the clumps) is now drawn as far on as the tree is ahead of or behind its steps,
   as the rose, the birds and the fish are. The render block runs it at 50 and at 144.
3. **A bauble hung in the red present's lid.** The present is moved clear of it; a check
   looks for any bauble in any present.
4. **Snowfall 0 still showed snow for nine seconds**: a new tree always had the usual 55
   flakes in the air. It has Snowfall's share now.
5. **A thump on a frame that took no step drew some clumps beyond where clumps keep to.**
   They are kept over the drift from the moment they are thrown.
6. **The top tier's baubles brush the boughs below when they swing inward.** Left, and said
   in the design.
7. **Every change of Light density rebuilt the string's wire, which is the same wire.** It is
   built once.

In the checks: the check that everything keeps inside the picture looked at the corners of
the snow's air where a flake is drawn at no size, and without its sway; it now looks where a
flake is still a tenth of its size, with all its sway. In the documents: Star glow at 100
does not swing the star twice as far (the star shows at most half as much again); a note
that a clump can fall beside the drift was stale; what a second peak does while the snow is
settling was not said. All corrected.
