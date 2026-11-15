# Sunburst star implementation plan

**Goal:** Rebuild `sunburst-3d` as a star with a crown of light on the scene kit.

**Architecture:** Plain arithmetic in `overlay/sunburst.js` (`TimbreSunburst`), checked under
Node, plus `definition()` for `TimbreScene.factory()`. Two small additions to the kit: a voice
history and the camera placed at creation. The factory file becomes one line.

**Tech stack:** classic scripts, three.js r160 as loaded by the pages, `verify.mjs` (Node) and
`verify-render.mjs` (headless Edge or Chrome).

**Spec:** `docs/superpowers/specs/2026-11-14-sunburst-star-design.md`

## Global constraints

- The effect id stays `sunburst-3d`. `density` keeps its name.
- All timing comes from `dt`; the same sound gives the same picture at any frame rate.
- `sunburst.js` touches no page global at load time, so Node can import it.
- No change to what the other scenes draw. The two kit additions add; they change no formula.
- Control and overlay pages are patched by script, never opened.

## Review focus

- A beam that points straight at the camera (its strip has no width direction).
- A frame longer than the whole voice history.
- Density changed while running (more beams than a moment ago, and fewer).
- The first frame after the effect is selected.
- Mic off with Idle animation off: nothing may move or flicker.

## Tasks

### Task 1: the kit's voice history and first-frame camera

Files: `overlay/scene-kit.js`, `verify.mjs`, `verify-render.mjs`.

- [ ] Node checks first: `createHistory(size, hz)` travels at `hz` samples a second, glides
  between samples, agrees at 30 and 60 fps, writes each sample at its own moment in a long
  frame, survives a frame longer than itself and keeps its newest part, and `heard(seconds)`
  reads between samples and clamps at both ends.
- [ ] Run them: they fail (`createHistory` is not a function).
- [ ] Add `createHistory` to the kit and export it.
- [ ] Render check first: a small scene records the camera's distance from the origin in its
  first `update()`; it must be more than 1.
- [ ] Place the camera once at the end of `create()`.

### Task 2: the arithmetic

Files: `overlay/sunburst.js` (new), `verify.mjs`, `shared/viz-config.js`.

Interfaces produced: `RAYS_MIN, RAYS_MAX, SEG, HIST, HIST_HZ, CORE, REACH, HEIGHT, BANDS,
TRAVEL, rayCount(density), directions(n), scatter(i), bandOf(y, scatter), loudness(bins, band,
gain), answer(band, flame), lengthOf(amp, kick), widthOf(amp, kick), strip(out, at, centre,
dir, cam, len, width), glow(u, pulse, amp, kick, shimmer), shimmer(high, u, wave), tint(out,
rgb, u, b), definition()`.

- [ ] Node checks first for each of them, and for the table (`VIZ_SCENES`, the three settings,
  a saved config with only `density`).
- [ ] Run them: they fail.
- [ ] Write the arithmetic and the table entries.

### Task 3: the scene

Files: `overlay/sunburst.js`, `overlay/factories/sunburst-3d.js`, the three overlay pages,
`verify-render.mjs`.

- [ ] Render checks first (the list in the spec), with their own runner that drives the level
  and the 32 bins by hand and reads the canvas and the scene's `debug()`.
- [ ] Write `definition()`; the factory becomes
  `VIZ_FACTORIES['sunburst-3d'] = TimbreScene.factory(() => TimbreSunburst.definition());`.
- [ ] Add `<script src="sunburst.js"></script>` after `flag.js` in the three pages (by script).
- [ ] Both suites green.

### Task 4: documents

`docs/EFFECTS.md` (the kit's history, the first-frame camera, "The sunburst"), `CHANGELOG.md`,
`README.md` if it describes the effect.

### Task 5: review, fixes, breaking on purpose

One independent review of the branch. Each finding fixed with a check written first. Then
break each rule of the arithmetic and the scene on purpose and confirm a check fails.

### Task 6: the owner's look

Final stills; offer to switch the live overlay. Merge only after the owner has seen it in OBS.
