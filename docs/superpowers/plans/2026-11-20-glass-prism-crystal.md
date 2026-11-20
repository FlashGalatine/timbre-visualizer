# Glass Prism crystal: plan

**Goal:** rebuild the Glass Prism effect as a cut crystal drawn in light on the scene kit.

**Spec:** `docs/superpowers/specs/2026-11-20-glass-prism-crystal-design.md`

**How it is built:** as the scenes before it (Sunburst, Mountains 3D, Phosphor, Chladni,
Metaball): checks first, in a worktree, off `main`; the main checkout is served live and is
not touched until the owner says "Switch it".

## Global constraints

- Classic `<script>` files, no build. `overlay/glass-prism.js` must load under Node.
- No `Math.random`: a run is repeatable.
- All timing from `dt`.
- Effect id `glass-prism` and its display name do not change. `chroma` keeps its meaning
  near enough (how strong the prism's colours are); a saved config keeps its value.
- The overlay pages are patched by script, never opened in an editor that previews them.

## Tasks

### Task 1: the arithmetic and its Node checks

`verify.mjs`, section "[19] glass prism": every function `TimbreGlassPrism` offers, with the
spec's numbers; the table; the pages' script order; the factory. Then
`overlay/glass-prism.js` up to the shader.

### Task 2: the scene and its render checks

`definition()`, the one-line factory, `VIZ_SCENES`, `cameraDrift`, the three pages.
`verify-render.mjs`, block "The glass prism": runner `prismRun`. The suite's check that
"an older WebGL effect leaves the flip flag set" used Glass Prism as its older effect; none
of those left uploads a texture, so it now uses Ink and sets the flag by hand.

### Task 3: documents

`docs/EFFECTS.md` ("The glass prism"), `CHANGELOG.md`.

### Task 4: review, fixes, breaking on purpose

One independent review of the branch. Each finding fixed with a check written first. Then
break each rule of the arithmetic and the scene on purpose and confirm a check fails.

### Task 5: the owner's look

Final stills; offer to switch the live overlay. Merge only after the owner has seen it in OBS.

## Found during the build

- The branch was started while Metaball's deliberate-break run held the suites' ports, so
  the arithmetic checks were run on their own, outside the suite, and the render checks
  were written before they could be run.
- A first `tumble` that made the crystal's own turn and then the kick's would have differed
  by about a hundredth of a radian a second between frame rates. Making half the turn
  either side of the kick's brought that to a few ten-thousandths over two seconds.

## What the review found

One independent review (it read the code, ran the arithmetic and three.js's own math under
Node, and replayed the checks' number-reading parts; no suite, no browser). It found no
defect in the arithmetic or the scene. What it did find:

- **On a beat or a loud voice the crystal smeared into a blob.** The kit's afterglow kept
  every frame's ridges. Seen in the built stills as well. The light it leaves is now gone
  in 0.06 s, and a check holds the light a loud beat leaves to a measured most (42 million
  against 57 million with the kit's usual afterglow).
- **On the small page the ridges would come out in dashes.** They are now sized for the
  page's own pixels.
- **Checks that read the scene's own numbers where they should read the picture.** New or
  changed: the copies' roll is about the line of sight (the axis, not only the angle); the
  light at the outer rim of the picture is the third palette colour; the glow inside is the
  second; a band lights its facets where they face the viewer and changes nothing where
  they face away (the facets' facing worked out from three.js's own geometry); the light in
  a pause is held to a tenth of what was measured; and two seconds of silent tumble are
  replayed step for step, which pins the moment each step's axis is taken at.
- The design said "over any backdrop" and "still"; both are now said as they are.

## Found during the build

- **The "holds still, pixel for pixel" flake is the GPU's.** This scene's check failed one
  run in four with two pixels different by one step, as the same check has now and then in
  Sunburst, Mountains 3D, Phosphor and Chladni. Twelve runs with every number in the scene
  fixed, read at 4, 5, 8, 9 and 10 seconds, showed the picture in one of two states, two
  pixels apart, changing from one to the other at any reading. So it is not in a scene's
  arithmetic or in light still fading. This scene's two stillness checks now allow up to
  eight pixels one step apart. The older scenes' checks still compare pixel for pixel.
- The spin a beat gives is 2.2 to 3.1 radians a second, not 2.2: the three parts of its
  axis are each up to 2.2.

## Breaking it on purpose

Each break is one changed line, run against the crystal's own checks (its section of
`verify`, or its block of `verify-render` cut out and run alone), in a separate copy.

- **The arithmetic and the wiring: 71 breaks.** 68 caught at once. One of the three that
  were not is the run with nothing broken; the other two got checks that their breaks then
  failed: a turn that has drifted from unit length is brought back, and the light it leaves
  behind fades as the design says.
- **The scene and the shader: 74 breaks.** 64 caught at once. One of the ten that were not
  is the run with nothing broken. The nine others each got a check:
  - the voice followed where the level should not be (a twentieth of a second into a loud
    stretch the two differ);
  - a beat's own share of the brightness;
  - a beat still dying away when the mic goes (the muted run now starts with one), which
    also catches a kick left spinning under a muted crystal;
  - the colours following apart and not jumping;
  - the glow inside being in the scene at all;
  - and three ways of losing the ridges' width on the small page, where the light the
    crystal gives is now measured: 347 thousand with whole ridges, 221 to 237 thousand with
    ridges sized for the kit's larger picture.
  Each new check was confirmed by running its break again.
