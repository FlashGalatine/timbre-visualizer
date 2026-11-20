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
