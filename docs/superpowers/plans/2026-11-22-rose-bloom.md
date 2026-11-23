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

## What the review found

One independent review of the branch at `1a8d35e`, by a reviewer that ran its own
simulations (the real `definition()` under Node with a stand-in for three.js, and a copy of
the blade's shader). Five findings, each confirmed here by running the reviewer's script
before anything was changed:

1. **A petal snapped and flipped in one step when it was told to come home near its place.**
   How far it was "landing" went by its distance alone, so it jumped from 0 to 0.9 in a step;
   the shape it was drawn with followed at once (its size by 30%), and it was told to finish
   most of its turn in that step: up to 1.75 radians. 149 steps in 48 homecomings had the
   shape snap. Now how loose a petal is drawn is one number that eases, whatever the petal is
   doing; it turns at a steady rate as it comes in, lands as it is, and finishes turning on
   the head. The reviewer's script: no step with a turn over 0.3 (0.20 at most), no snap.
2. **A peak while petals were landing snapped every landing petal flat**: 7 to 14 petals each
   shrank by a quarter and jumped 0.16 to 0.32 in one step. The same easing covers it: the
   most a drawn middle now moves beyond its own motion is 0.045, and its size changes by 2%.
3. **Petals rebounded off an unseen wall at the edge of all the air**: 360 of 1680 thrown
   petals changed velocity by more than 2 a second in one step (5.6 at most). A petal was
   thrown too hard for the room there is above the head, flew too fast for the size of its
   air, and what it lost outward was given back to it at once. Now a thrown petal slows
   quickly (it is light), the throw and the cruising speed are gentler, there is more air
   above the head, the loss begins further in, and only its speed along the edge is made up.
   The reviewer's script: none over 2, 0.94 at most.
4. **A ring of the palette's colour at the foot of the golden heart.** The stem's top (kind
   0) joined the heart (kind 2), so the strip between them passed through the thorn's kind
   (1) and was coloured as a thorn's tip. The heart is now kind 1, next to the stem.
5. **After a thump the petals are not where they would be at another frame rate** (up to 2
   apart). The thump is taken in the frame that hears it, and the sound is read once a frame.
   Left as it is, and said in `docs/EFFECTS.md`: nobody sees it, and the rose is the same at
   any rate with a steady sound.

What the review found in the checks, and what was done:

- The check of the homecoming's turns passed by luck of its seed, and did not look at a
  petal's size or shape. A new check runs eighteen thumps and homecomings (three loudnesses,
  six seeds, a peak in half of them as the petals land) and bounds the turn, the drawn shift,
  the change of size and the change of shape in every step.
- Nothing watched the homecoming for the frame's edge. A petal coming home is now held
  inside all the air as a flying one is (it was not: a peak could put it back at a stroke),
  and the render block looks at the canvas's edges in every frame of the homecoming.
- "The same rose at 30 and 60 frames a second" says what it checks: a steady sound.
- Rose had none of the file checks Boids has. It has them now: the three pages load
  `rose.js` once and in order, the factory is the kit's one line, no `Math.random`.

And in the documents: a landing petal's turn, "nothing moves" with the mic and Idle
animation off (the camera and the palette go on), and when the last petals land after the
machine calls the rose whole (about two seconds, not "a little"). All corrected.

Found on the way, by the new checks:

- A petal called home as it flew through its own place stopped dead there at flight speed.
  It lands only when it is slow (`CATCH`); faster, it flies on and comes round.
- Turning to lie as it sits, a petal's face could turn twice as far in a step as the way it
  grows. The two share one limit.
- The heart read as cream once its shine was added. It is matt.
- "Just thrown, each petal flies alone to its own part of the air" made no difference that
  could be measured once places were kept inside the air. It is gone, with its three numbers.
- The soft wall at the edge of a petal's air did nothing its place (which is inside the air)
  and the edge of all the air did not already do. It is gone too.

## Breaking it on purpose

**The arithmetic, before the review.** 203 breaks of `overlay/rose.js`, one line at a time,
against the Node section: 159 caught at first. Of the 43 that slipped past, three were lines
that did nothing and were removed (a guard on which petals listen, a petal on the head
"tightening" a shape it never has there, a petal coming home loosening a shape it already
has), one was the rule at the edge of the air, which was rewritten (it gave a petal heading
straight out its speed back), and the rest got checks: a direct test of `toward`; each
petal's length, width, turn and nerve by its rank and its own share of chance; the stem's
and a leaf's handedness; how full a bare head counts; the lead's swing; a throw in the air,
each way; a folded petal growing as it flies; that loose petals keep clear of loose petals
only; the turn in a step; the tumble; the aim on the way home; what the landing step does;
a leaf's lift and its stalk. Run again: all caught.

**The arithmetic, after the review.** 41 breaks of what the fixes added or changed: 32
caught; the 8 that slipped past got checks (a petal lands at rest, hurries when far from its
place and idles at it, has its own place to one side of the lead, lands only when slow, is
nearly in its head shape and mostly turned as it touches down). Then the whole first list
again on the fixed arithmetic, where the gentler flight let nine through that had been
caught before: where a petal grows from, heart and rim; the mean throw, out and along; that
the homecoming's times vary; a place kept inside the air (`placeOf` is now a function of
its own so that it can be asked); and what a petal takes of its neighbours' way. Run again:
every break that still applies is caught.

**The scene.** 80 breaks of the scene and its shaders against the render block. The first
run was stopped after 57, when the review came back: 54 caught, and two slipped past (the
camera's field of view, which now has a check of how far away the camera stands; and a
petal's cup, which a picture of the whole rose is not told apart by, and which was pinned as
text by the Node section).

**The scene, on the code as merged.** The whole list again, and the breaks of the stalk's
rewritten shader. Every break of the scene itself was caught. Ten breaks of the shaders
slipped past: a picture of the whole rose does not tell them apart, because sixty petals
overlap in it and the checks count its pixels with room to spare. Seven had nothing holding
them at all: a petal's outline (twice: with no outline, a rectangle; and with a leaf's), the
fold of a leaf along its midrib, which side of a blade is its right (which makes its face
its back, and lights it wrongly), the lighting of a face seen from behind, a petal's pale
rim, and its darker foot together with the darker heart of the rose. Three were held only by
a pin of their text: a petal's cup, the shortening of a petal whose tip rolls back, and a
thorn's tip wearing its own band's colour (any thorn passed in the first band's).

So the render block now ends by drawing one blade alone: a petal, a leaf, and flat strips of
the stalk, each by itself under the rose's own shaders, seen square on, with a palette of
the check's own, and measured (six checks). An outline is measured as widths, a cup and a
fold as a shift seen from 45 degrees round, a face as how bright it is from each side, a
colour where it is. All ten are caught by them, and so are the two lines of the stalk's
shader that only a pin held (the heart's matt gold; green passing to gold by degrees). Then
30 more breaks of the same shaders were run against the six checks: 23 were caught at once,
and each of the seven that slipped past got a measure (a petal's duller back, its faint
ribs, its sheen when it is nearly edge on, its face following its cup; a leaf's lighting;
the stalk's lighting; the mottle of the heart's gold). Run again: all 42 are caught. The
pins in the Node section stay, as a quicker warning. Not broken: the small shine on a petal
and on a leaf, and the exact weights of the two lights.

**One failure in a full render run that is not the rose's.** A run made while two live
WebGL pages were open in the app's browser pane failed the jelly's "muted in the middle of a
wobble" stillness check by one stray pixel over what this GPU is allowed (9 against 8), as a
Boids run did. With the pages closed the next full run was clean (877 of 877).
