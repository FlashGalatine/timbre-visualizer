# Shards: a broken mirror the voice opens up — plan

**Goal:** Shards becomes a scene on the scene kit: a broken pane of mirror glass whose
shards the sound lifts, spreads and tips in ripples that start at the point of impact.

**Spec:** `docs/superpowers/specs/2026-11-21-shards-mirror-design.md`

**Architecture:** `overlay/shards.js` assigns `globalThis.TimbreShards`: the arithmetic,
then the shaders, then `definition()` for `TimbreScene.factory`.
`overlay/factories/shards.js` is one line. Checks first: a section of `verify.mjs` for the
arithmetic and the wiring, a block of `verify-render.mjs` for the picture.

## Constraints

- Classic `<script>`, no build; the file must also load under Node and touch nothing at
  load (no `document`, `THREE`, `TimbreScene` or core.js globals).
- No `Math.random`: a seeded sequence.
- All timing from `dt`.
- The effect id `shards` and its `density` setting stay, so saved configs keep working.

## The arithmetic (`TimbreShards`)

| Function | What it gives |
|---|---|
| `spokesFor(density)`, `ringsFor(density)` | how many cracks run outward, and how many rings cross them |
| `edgeAt(angle)` | how far the pane's edge is from the point of impact, in a direction |
| `crack(spokes, rings, seed)` | the shards, each a small polygon in the pane |
| `createPane(density, seed)` | every shard's place, its sector's band, its own numbers, and its corners as a mesh |
| `loudness(bins, band, gain)`, `idle(b, t)`, `settle(v)` | what a band hears |
| `amountOf(bloom)` | what the Bloom setting makes of the opening |
| `delayOf(d)`, `beatDelayOf(d)` | how long a ripple, and a beat's ring, take to reach a shard |
| `openOf(voice, band, beat, amount)` | how far open a shard is |
| `openAll(out, pane, voice, bands, beat, amount)` | that for every shard, from the histories |
| `poseOf(out, pane, i, e)` | where that puts shard `i`: its move and its turn |
| `place(pane, open, pos, norm, shown)` | every corner of every shard, and which way it faces |
| `glowOf(flame, kick)` | how bright the light behind the pane is, and how wide |
| `measure(pane, pos)` | for the checks: the box the corners lie in |

## Tasks

1. Checks of the arithmetic in `verify.mjs` (they fail), then the arithmetic.
2. The scene, the factory, the table (`VIZ_SCENES`, defaults for `density`, `bloom`,
   `cameraDrift`), the three pages' script tags.
3. The picture checks in `verify-render.mjs`, run and measured. The fresh-page check that
   uses Shards as "an older WebGL effect" moves to Jelly.
4. `docs/EFFECTS.md`, `CHANGELOG.md`.
5. One independent review; its fixes, each with a check first.
6. Deliberate breaks of every line; a check for each that nothing caught.
7. Both suites, final stills, the owner's look in OBS.

## Review focus

- A shard leaving the picture at the widest opening, or on the small page.
- A shard tipped so far that its back shows.
- The mic muted while the pane is open: it closes and the picture comes to rest.
- Density changed while the pane is open.
- The cracks: shards that overlap, or leave a hole in the pane.
