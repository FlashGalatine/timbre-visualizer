# Rose: a rose the voice makes bloom. Implementation plan

**Goal:** Rose becomes a scene on the scene kit: a rose made in code that grows thorns and
sprouts petals with the voice, and whose petals fly as a flock on a thump of the mic.

**Architecture:** `overlay/rose.js` (`globalThis.TimbreRose`) holds the arithmetic and
`definition()`, as `overlay/boids.js` does; the factory is one line. The model file and the
shared "3D model" settings are retired.

**Spec:** `docs/superpowers/specs/2026-11-22-rose-bloom-design.md`

## Global constraints

- No `Math.random` in the model; every random number comes from `rng(seed)`.
- Fixed steps of `STEP = 1/60` s, a step due at its half, at most `STEPS_MAX = 6` a frame.
- The module is valid as a classic script and under Node; nothing at load time touches
  `document`, `window`, `THREE` or `core.js` globals.
- Everything drawn is solid: `transparent: false`, depth tested and written.
- Never Edit or Write an `.html` page; patch pages with a Node script.
- The live checkout is not touched; work is in `.worktrees/rose-bloom` on `feat/rose-bloom`.

## Review focus

1. Repeated thumps at the loudest and widest: no petal outside the frame.
2. A petal's drawn turn in one step, flying, coming home and landing: no jump.
3. A saved config with `stlObject` in it, and one with old `rose` knobs: read without error.
4. Density changed while petals are in the air.
5. 30 fps and 165 fps: the same rose after the same seconds.

## Task 1: the Node checks, then the arithmetic

**Files:** `verify.mjs` (section `[25] rose`), `overlay/rose.js`.

Produces (all on `TimbreRose`):

- `countFor(density) -> n` (40 to 72); `keptFor(n) -> k` (`round(0.43 n)`);
  `thornFor(thorns) -> length` (0, 0.26 at 50, 0.52 at 100).
- `loudness`, `idle`, `settle`, `rng`, `callOf`, `pulseOf` as Boids has them.
- `stemAt(out, ro, t)`: where the stem is a share `t` of the way up, the way it runs, and two
  directions across it; `stemRadius(t)`.
- `createRose(seed, n) -> ro`; `lay(ro, n)`: all `n` petals on the head.
- `pose(ro, how)`: the stem's curve, the head's frame, how full the head is, and for each
  petal its base, the way it grows, its inner face and its shape.
- `scatter(ro, n, strength, random)`, `gather(ro, n, random)`.
- `stepRose(ro, n, how)`, `advance(ro, n, dt, how) -> steps`.
  `how = { flame, kick, bands, pulse, mic, random }`.
- `dress(out, ro, n, look)`: the blades' numbers; `stalk(out, ro, look)`: the stem, thorns,
  stalks and heart; `swayFor`, `orbitAt`.

Checks first: the numbers; the settings; the stem's curve and frame; the head (a petal's
place by its rank, a small rose opening as a large one's rim does); sprouting and folding;
thorns by band and mic only; the ripple; the thump, the flock (keeps clear, follows the
lead, stays in the frame under thumps every 0.6 s, measured with `TimbreScene.reach`); the
homecoming (order, speed at touch-down, no jump, the turn of a petal in a step); frame-rate
independence; stillness with nothing live; what `dress` and `stalk` send.

## Task 2: the scene and the wiring

**Files:** `overlay/rose.js` (`definition()`), `overlay/factories/rose.js`,
`shared/viz-config.js` (`VIZ_SCENES`, defaults, `PER_VIZ_MAX`), the three overlay pages
(`<script src="rose.js">`, by script).

## Task 3: what goes

**Files:** `overlay/assets/rose.stl` (removed), `THIRD_PARTY_NOTICES.md`,
`shared/viz-config.js` (`STL_OBJECT_*`, `stlObject`), `overlay/core.js` (`cfgSTLObject`),
`control/control.html` (the "3D model" group, by script), `mock-sb-server.mjs` (the `.stl`
type), `verify.mjs` and `verify-render.mjs` (their checks of the old Rose and of the group).

The render suite's two checks of "an older WebGL effect" used Rose as that effect. No older
WebGL effect is left, so the context is made there as one would have made it.

## Task 4: the render checks

**Files:** `verify-render.mjs` (block "The rose", and Rose in the textures table).

The harness re-makes the model in the page frame for frame, as Boids' does. Checks: it is
drawn and solid; silence, a word, a loud voice (petals out, thorns by band); the thump, the
flock, nothing at the canvas's edge in any frame of repeated thumps, the homecoming; Density
and Thorns; Idle; nothing live holds still; the colours.

## Task 5: the documents

`docs/EFFECTS.md` ("The rose"; the "3D STL effects" section goes), `docs/SETUP.md`,
`README.md`, `CHANGELOG.md`.

## Task 6: review, breaks, stills

One independent review of the branch; its findings fixed check-first. Then the arithmetic
and the scene are broken on purpose, one line at a time, and a check is written for every
break nothing caught. Both suites, final stills, and the switch offered to the owner.

## What changed while it was built

- **The loose petals hovered.** As in the spike, a loose petal was pulled toward its place,
  and slowed to a tumble there (0.64 a second in silence). It now flies as a bird does: at a
  cruising speed, steering by turning, so the flock keeps moving round its lead.
- **The flock came to the frame's side and top.** Its air is flatter and narrower than the
  spike's, a petal's place is kept inside it (`ROOM`), and a loose petal cannot pass the edge
  of all the air there is (`HARD`): it loses its speed outward near the edge, and is held to
  it. Thrown every 0.6 s at the loudest with the camera swung as far as it goes, the furthest
  any petal comes is 95% of the way to the frame's edge.
- **A landing petal was turned by a blend** between how it flew and how it would sit, as it
  was drawn. When the two were nearly opposite it flipped over in a step (0.69 radians). It
  is now turned in its own steps, at a limited rate, and the blend is gone.
- **Petals touched down at up to 1.25 a second.** The way home was underdamped. Near its
  place a petal now steers twice as hard for a speed that falls with the distance left, and
  touches down at about 0.3.
- **A thrown petal tumbled up to 17 radians a second.** Its tumbling counts no more than two
  cruising speeds.
- **The heart was a pale cream** once the picture's tones were mapped; it is a deeper gold.
- **Idle**: in the spike Idle animation swelled the bloom with the kit's idle level. Here the
  voice is the mic's alone, as for the boids: the bands open and fold a few petals.
- **The spike's petal colours drifted with the clock.** They move only as the palette's own
  Colour speed moves them.

Two checks of the render suite used the old Rose as "an older WebGL effect" whose renderer
had made the canvas's context. No such effect is left, so the check now makes a renderer of
its own on the canvas first, and the kit must still start cleanly after it.
