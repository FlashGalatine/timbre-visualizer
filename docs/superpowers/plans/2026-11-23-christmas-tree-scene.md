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
