# Rotate settings for Mountains 3D and Phosphor: implementation plan

**Goal:** give Mountains 3D and Phosphor the three Rotate settings Chladni has.

**Architecture:** the turning's arithmetic moves into `overlay/scene-kit.js`
(`TimbreScene.turn`, `reach`, `poseFor`); Chladni calls it from there; each of the two
scenes gains a group that the settings turn and a box for the kit to keep in the frame.

**Tech stack:** classic `<script>` files, three.js r160 through the kit, no build.

**Spec:** `docs/superpowers/specs/2026-11-20-scene-rotation-design.md`.

## Global constraints

- With all three settings at 0, each scene is drawn exactly as before.
- Chladni behaves as before.
- The effect ids, display names and saved settings stay.
- Tests never connect to ports 7474 or 8080.

## Review focus

- The land's lights and shadows when the block is turned and drawn smaller.
- The deck seen from behind, from the side and from above.
- A scene on the 4:3 page, where the frame is narrower.
- A change of rotation in mid-run, both ways.
- A saved config without the new settings.

## Tasks

### Task 1: the kit

Checks in `verify.mjs` section "[5] scene kit arithmetic": `turn`, `reach`, `poseFor`. Then
the three functions, and Chladni's calling them.

### Task 2: the two scenes

Checks in each scene's Node section (its box and view; unturned, where it was; turned every
way, inside the frame) and in each scene's render block (no rotation; turned; a change in
mid-run). Then the group, the settings and the read-outs in `overlay/mountains.js` and
`overlay/phosphor.js`, and the settings in `shared/viz-config.js`.

### Task 3: documents

`docs/EFFECTS.md`, `CHANGELOG.md`.

### Task 4: review, fixes, breaking on purpose

One independent review of the branch. Each finding fixed with a check written first. Then
break each rule on purpose and confirm a check fails.

### Task 5: the owner's look

Stills of each scene turned; offer to switch the live overlay. Merge only after the owner
has seen it in OBS.

## Found during the build

- This was a move of working code more than new code, and the code was moved before its
  new checks were written. Breaking it on purpose (Task 4) is what shows them catching
  anything.
- A scene's read-outs of its rotation were arrays kept from frame to frame, so a run of
  several steps reported the last step's rotation for every step. They are handed back as
  copies.
- The placement did not settle for a box wider than its frame: placing it after sizing it
  changed its size on the picture again. It now sizes first and then places, four times.
  The three real scenes stay inside their frames over two thousand rotations each.
