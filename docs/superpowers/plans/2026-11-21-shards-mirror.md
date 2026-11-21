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
| `spokesFor(density)`, `ringsFor(density)` | how many cracks are asked for outward, and how many rings cross them |
| `edgeAt(angle)` | how far the pane's edge is from the point of impact, in a direction |
| `crack(spokes, rings, seed)` | the shards, each a small polygon in the pane |
| `createPane(density, seed)` | every shard's place, its sector's band, its own numbers, and its corners as a mesh |
| `loudness(bins, band, gain)`, `idle(b, t)`, `settle(v)` | what a band hears (nothing, below `QUIET`) |
| `amountOf(bloom)` | what the Bloom setting makes of the opening |
| `delayOf(d)`, `beatDelayOf(d)` | how long a ripple, and a beat's ring, take to reach a shard |
| `openOf(voice, band, beat, amount)` | how far open a shard is |
| `openAll(out, pane, voice, bands, beat, amount)` | that for every shard, from the histories |
| `poseOf(out, pane, i, e)` | where that puts shard `i`: its move and its turn |
| `place(pane, open, pos, norm, shown)` | every corner of every shard, and which way it faces |
| `glowOf(out, flame, kick)` | how bright the light behind the pane is, and how wide |
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

## Found during the build

- **A plain sky made coloured paper of the mirror.** In the spike a shard showed one smooth
  colour, and the pane read as flat polygons. Long soft lights in the sky, which each
  shard shows its own piece of, made it a mirror.
- **The light behind the pane blew its middle out to white** at the spike's first
  strength. It is about half that.
- **A shard tipped as far as the spike first allowed went edge-on** and all but vanished.
  Its lean from the pane is held to 0.95 of a radian.
- **The widest opening did not fit the picture.** What lifts toward the camera grows, so
  the frame was sized by projecting every corner from where the kit puts the camera, and
  is larger than the spike's: the pane is about a ninth smaller in the picture.

## What the review found

One independent review (it ran the arithmetic under Node, loaded three.js there for the
matrices and the camera, and sampled a quarter of a million places in the panes; no suite,
no browser). Each of these was fixed with a check first:

- **With the camera swayed, shards showed their dark backs.** The lean from the pane was
  held, but the pane is turned and the camera sways: swung right, it sees a shard that is
  wide open on the left from behind. At the usual Camera drift that began at an opening
  of about 1.15; at the widest opening and the furthest sway, 89 shards of 280. A shard's
  back is now a mirror too, dimmer, which looks the same from either side of edge-on. The
  check that claimed "so its back does not show" only measured the lean, and says so now.
- **Nothing kept a room's hiss from holding the pane a little open**, and the lights in the
  mirror make much of a small tilt. A band quieter than 0.08 is not heard, as in the ink.
  (The checks had only ever driven exact silence.)
- **The palette could be read one past its last colour** for a value a hair under a whole
  number. The index is held to the last.
- **The cut sides were said to glow in the colour of the light behind**, and did only at
  first: their colour drifted with the sky's. They keep that colour now, and the sky's
  drift stays a share of once round the palette where it grew without end.
- **Every new Density value broke the pane anew**, though Density picks one of only 27
  panes. It is broken anew when the cracks asked for change.
- **Checks that covered one pane now cover every pane there is**: that the shards fill it
  exactly, are convex, turn one way and keep its corners; and that a place in the pane
  lies in one shard and no more (areas that add up could hide an overlap that makes up
  for a hole). The widest opening is projected for nine Densities, not one, and the
  picture of it is read with the camera swung each way.
- "More Density is more of them" was not true between neighbouring values (311 shards,
  then 309), and the check now says which values it compares.
- The documents: corners "shared with neighbours" (a crack may stop halfway along a
  neighbour's edge), 13,000 corners (the most is 11,418), and "the picture holds still"
  with the mic off (the camera's sway and the palette go on, as in every scene).

Left as it is: the same sound gives openings up to 0.4 apart at 30 and at 60 frames a
second for the frame or two in which a ripple's front arrives (the onset lands a frame
apart), and the same within 0.03 after it. Above a Scene Size of about 107 the widest
opening reaches the picture's top and bottom.
