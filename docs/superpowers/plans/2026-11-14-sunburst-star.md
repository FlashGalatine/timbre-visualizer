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

## After the review

One independent review of the branch: nothing critical. Fixed, each with a check written
first:

- Beams that came back when Density was raised started at the length they had when they were
  last drawn, so they could appear long and shrink with the mic off. They now start from
  nothing.
- Spin 0 held the turn but the crown's tilt still wandered. Spin now scales the tilt's
  wander too, and a check holds the reference beam's direction still at Spin 0.
- The spec said the outer half of a beam flickers; the flicker grows steadily from the star
  outward. The spec now says so, and a check holds the beam steady at the star.
- The history was one sample short of the tip of the longest beam on a beat. It is 25
  samples now.

Checks added or tightened for behaviour that nothing was watching: the scene's own clock at
30 and 60 fps; the picture holding still, pixel for pixel, with the mic and Idle animation
off (the earlier check read numbers only); a beat widening and brightening the beams and
spreading the glow; the speed of the light pinned for every piece of a beam, whatever the
beam's length; the crown itself turning as far as its spin says; the strips facing the
kit's own camera position (the earlier check compared distances only, which a swapped axis
would pass). `TimbreScene.debug()` now reports the camera's position for that.

Left as it is and written into the spec: on the first frame the camera is at its distance
with no swing yet; the colours still move through the palette with the mic and Idle
animation off.

From breaking the arithmetic on purpose (50 breaks, 46 caught): checks for the power in the
band formula, for loudness held to 1, for the power in the brightness of a pulse, and for
the newest place in the history holding the level now. Run again after those: all 50 caught.

From breaking the scene on purpose (41 breaks against the render suite, after one entry
with no break that had to pass, and did): all 41 caught, no check added. Two are caught
less directly than the rest: leaving the star's two glows out of the scene is caught by the
count of GL textures made and deleted, not by a check of the picture; and writing every
beam's strip into the first beam's place is caught by the Density checks.

The owner looked at the branch in OBS with the real microphone: "All looks right".

## Found during the build

- The render checks were written before the scene but could not be run before it existed:
  with `sunburst-3d` listed as a kit scene and the old effect still in its file, the suite's
  loops over every kit scene fail first. Each check is instead shown to fail by breaking the
  code on purpose (Task 5).
- Two expectations in the checks were wrong, not the scene: at a steady 0.8 in every band a
  beam answers 0.92 of its reach (2.78), not all of it; and 0.6 s after a syllable the shell
  is at piece 9 or 10 of 12 depending on how far the beam has drawn back, so the check asks
  for "at least four pieces further out" instead of a fixed place.
- A burst shorter than one history sample can fall between two samples and leave no trace.
  The history is fed the kit's envelope, which holds a syllable for longer than a sample, so
  this does not happen in the scene; the check for a history of another size uses a longer
  burst.
