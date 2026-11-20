# Metaball as a ball of liquid metal and its droplets: implementation plan

**Goal:** rebuild `metaball` as one ball of liquid metal that each band of the sound pulls a
droplet out of, on the scene kit.

**Architecture:** one new file, `overlay/metaball.js` (`TimbreMetaball`): pure arithmetic that
Node can check, including the surface's smooth union, then a scene definition for
`TimbreScene.factory()` that draws the surface by marching rays in a shader. No change to the
scene kit.

**Tech stack:** classic `<script>` files, three.js r160 through the kit, no build.

**Spec:** `docs/superpowers/specs/2026-11-20-metaball-drops-design.md`.

## Global constraints

- The effect id, its display name and a saved `chrome` stay.
- All timing comes from `dt`; the same sound gives the same blob at 30 and 60 fps.
- `overlay/metaball.js` loads under Node and touches nothing at load.
- Only the ball and its droplets may darken the stream.
- Tests never connect to ports 7474 or 8080.

## Review focus

- A droplet at every distance from inside the ball to its full reach: no hole, no crease,
  nothing cut off by the sphere it is drawn on.
- The mic and Idle animation both off: the droplets must come home, and then nothing but
  the camera and the palette may move.
- The small page and the Size slider: the soft edge must stay about a pixel wide.
- The camera at the far ends of Camera drift.
- A saved config with only `chrome`.

## Tasks

### Task 1: the arithmetic

Checks first, in `verify.mjs` section "[18] metaball": sizes; `ease`; `direction`, `swing`;
`reach`, `dropSize`, `dropAt`; `coreAt`; `smin`, `field`; `glowOf`; `pixelOf`; `loudness`;
`idle`; the shader's text; the table; page order; the factory file. Then
`overlay/metaball.js` up to the scene.

### Task 2: the scene

Checks first, in `verify-render.mjs` block "The metaball": runner `blobRun(steps, opts)`.
Then `definition()`: the sphere the surface is drawn on, its shader, `debug()`.

### Task 3: wiring and documents

`shared/viz-config.js` (`VIZ_SCENES`, `cameraDrift`), the three overlay pages (by script),
the one-line factory, `docs/EFFECTS.md`, `CHANGELOG.md`.

### Task 4: review, fixes, breaking on purpose

One independent review of the branch. Each finding fixed with a check written first. Then
break each rule of the arithmetic and the scene on purpose and confirm a check fails.

### Task 5: the owner's look

Final stills; offer to switch the live overlay. Merge only after the owner has seen it in OBS.

## Found during the build

- The branch was started on top of the Chladni branch, before that had landed, and while
  its deliberate-break run held the suites' ports. The arithmetic checks were run on their
  own, outside the suite, until the ports were free.
- The render checks were written before the suite could be run, and their first run came
  some hours after the scene existed. All passed but two: the threshold left to be measured
  (solid pixels) and one expectation (how far a droplet has drifted home half a second into
  a silence).
- **A still picture that was not still.** "Muted in the middle of a stream ... then nothing
  moves" passed once and then failed twice running, with one pixel different by one step.
  The voice's level and a beat die away for ever and never reach nothing, so the ball's
  size and the metal's glow went on changing by amounts far too small to see, and now and
  then one pixel fell the other side of a rounding. The scene now counts a level within a
  ten-thousandth of nothing as nothing, and the check has passed every time since. This may
  be part of why the same kind of check fails now and then in the older scenes.

## What the review found

One independent review (it read the code and ran the arithmetic, with its own copy of the
shader's ray march in JavaScript; it ran no suite and no browser). Each finding below was
confirmed here before it was fixed, and each fix has a check that failed first.

- **See-through holes along droplet outlines.** A ray that passed close to a droplet crept
  past it in small steps and ran out of its 64 before it reached the metal behind. A new
  check sends a ray through every fourth pixel and every pixel of the soft edge and asks
  the arithmetic whether the metal is there: on the old shader it found 16 to 146 holes in
  a frame. The march now has 128 steps and ends where the ray leaves the sphere, and the
  check finds none.
- **A droplet cut by the canvas on a beat.** With its band full, a beat threw the lowest
  droplet to 1.06 of the picture's half-height. The frame is now 4.8 tall (0.92). The check
  is in Node, over every clock and the widest camera drift, because a render run only sees
  one moment.
- **Hard outlines inside the blob.** Where a droplet passes in front of the ball the outline
  was a hard step. Such a pixel is now a blend of the two, by how nearly its ray missed the
  droplet. The check measures how far each outline pixel is from the nearer of the two
  colours it parts: 0.08 to 0.10 of the step without the blend, 0.30 to 0.38 with it.
- **A step on the inside of the soft edge**, and a march that gave up 30 from the camera
  whatever the page: both went with the same rewrite of the shader's ending.
- **The faintest part of the edge might linger as light** (the kit's afterglow takes
  anything under 2% for light). Looked for and not found: it is under 5 parts in 255, and
  not drawing it changed no picture. Nothing was changed for it; a check now watches for
  light behind a droplet going home.
- **The shader ran on a sphere of radius 2.5 whatever the blob was doing**, so in a pause
  nine tenths of its work was on empty pixels. The sphere is now 0.16 past the blob.
- **Checks that read numbers where they should read the picture.** The ball's width in
  pixels is pinned to what the arithmetic gives; the glow and the body's colour are
  measured in the picture; the ball's bob is measured in the picture; the camera's place
  and pitch are checked; a frame is timed with the GPU's work included (about 2 ms).
- Left alone, and written down in the design: the soft edge comes out a little brighter
  than a true blend over mid-tone footage, as the kit's own edges do.

## Breaking it on purpose

Each break is one changed line, run against the Metaball's own checks (its section of
`verify`, or its block of `verify-render` cut out and run alone), in a separate copy.

- **The arithmetic: 75 breaks.** 71 caught at once. Four were not, and each got a check
  that its break then failed: the eased size of a droplet at a band where easing matters;
  the 0.42 the surface is smoothed by, at the point midway between the ball and a droplet;
  the surface going with the ball as it bobs; and the smallest droplet counting toward the
  sphere the surface is drawn on.
- **The scene and the shader: 54 breaks before the review's fixes, 73 after.** After: 67
  caught at once. Of the six that were not:
  - a beat still dying away when the mic goes was never settled to nothing in a checked
    run (no beat had struck in it); the muted run now starts with one;
  - a droplet was counted as out however quiet its band; the Gain check now counts them;
  - the soft edge's width was only measured at full size, where a fixed width passes; it is
    now measured at half size too;
  - one line of the shader (the last sample of a ray that never turned back from the
    metal) could not be reached by any ray: removed;
  - not drawing the faintest 2% of the edge changed nothing: taken back out;
  - the sixth is the run with nothing broken.
  Each new check was confirmed by running its break again.
- Before the fixes, the first run of 54 missed six, among them the glow (no check read it
  from the picture), the camera's pitch, and the smooth union replaced by a plain one in
  the shader. Those are what the picture-against-arithmetic check and the others in "What
  the review found" are for, and all six are caught now.
