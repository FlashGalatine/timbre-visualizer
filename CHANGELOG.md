# Changelog

All notable changes to **Timbre** are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the patch number
tracks the repository's commit count at release time.

Nothing was tagged between the initial release and 1.0.9, so that release
collects every change in between. Commit hashes and landing dates are noted for
traceability.

## [Unreleased]

### Added

- **Orbit settings**: `planets` (0 to 9, default 6) and `flareSensitivity` (0 to 100, default
  50; 0 turns the sun's flare off) for the Orbit effect. The system behind the new Orbit is
  `TimbrePlanets.createSystem` in `overlay/planets.js`.
- **Pulse Rings settings**: `explodeSensitivity` (0 to 100, default 50; 0 turns the explosion
  off) and `reconnectSeconds` (0 to 10, default 3) for the Pulse Rings effect. What the new
  Pulse Rings shares with the other planet effects is in `overlay/planets.js`
  (`TimbrePlanets`), loaded by all three overlay pages and by `verify` under Node, and
  documented in `docs/EFFECTS.md` ("Planets"). `TimbreHelix.createShatter` takes an optional
  `aim`; without it DNA shatters exactly as before.
- **Fireflies setting**: `startleSensitivity` (0 to 100, default 50; 0 turns the startle off)
  for the Fireflies effect. The swarm behind the new Fireflies is in
  `overlay/fireflies-swarm.js` (`TimbreSwarm`), loaded by all three overlay pages and by
  `verify` under Node, and documented in `docs/EFFECTS.md` ("Fireflies swarm").
- **Comet setting**: `flareSensitivity` (0 to 100, default 50; 0 turns flares off) for the
  Comet effect. The arithmetic behind the new Comet is in `overlay/comet-flight.js`
  (`TimbreComet`), loaded by all three overlay pages and by `verify` under Node, and
  documented in `docs/EFFECTS.md` ("Comet flight").
- **DNA settings and measurement**: the `shatterSensitivity` and `reconnectSeconds`
  settings for the DNA effect, and the `micPeak` measurement (the loudest input sample
  over at least the last two looks, before Gain) that the shatter reads.
- **Scene kit** — `overlay/scene-kit.js` and `overlay/scene-parts.js`: a shared base
  for floating 3D scenes that sit over the stream with no backdrop. A scene supplies a
  `frame`, a `build()` and an `update()`; the kit supplies the renderer, camera
  framing for any canvas shape, shadows, a light-only afterglow (length follows Trail
  veil), frame-rate-independent audio smoothing and beat detection, and full disposal.
  Light is written with alpha 0 so it adds to the picture behind it and only solid
  objects darken it. Loaded by all three overlay pages; the kit also loads under Node
  for `verify`. Documented in `docs/EFFECTS.md` ("Kit scenes (floating 3D)").
- **Afterglow for the bar and wave effects** — Bars, Peak Hold, Ring Bars, Sine Bars,
  Waveform and Ring Waveform leave a fading trace of what they just drew: bars keep ghosts
  of their recent peaks, and the two wave effects keep fading echoes of their loudest
  moments. New **Afterglow** setting (`afterglow`, 0 to 4 seconds, default 1.6, 0 is off),
  shown in the control panel for those six effects. The arithmetic is in
  `overlay/afterglow.js` (`TimbreGlow`), loaded by all three overlay pages and by `verify`
  under Node. Live bars draw exactly as before. Documented in `docs/EFFECTS.md`
  ("Afterglow (bar and wave effects)"). `verify:render` checks the ghosts, the setting and
  the cost (the six effects draw in under 0.5 ms; about 0.1 ms or less measured).
- **Scene placement settings** — a "Scene placement" group in the control panel,
  shown for kit scenes: Left-right, Up-down and Size % (new `placement` in the
  config, clamped by `PLACEMENT_RANGES`). They move and scale the scene through the
  camera, live, without rebuilding it.
- `verify` gains scene-kit arithmetic, placement-config and page-load checks;
  `verify:render` gains scene checks (internal scale, placement, resize without
  rebuilds, fps independence, no GPU growth on re-select, clean hand-off to the
  other WebGL effects, no-THREE fallback) and a per-frame cost check (`draw()`
  averaging under 4 ms; about 1.6 ms measured).
- **`overlay/mic-visualizers-1920x1080.html`** — a 16:9 overlay page alongside the
  300×220 and 1440×1080 (4:3) ones. It is the 4:3 page widened by 480px: identical
  border, type, chevrons and 624px-tall canvas, with a 1728×624 drawing buffer.
  `SCALE` is pinned to the 4:3 page's 4.8 (rather than `W/260` = 6.65) so
  radii/amplitudes sized off `SCALE` don't outgrow the canvas height — bar, column
  and scrolling effects simply get the extra width. Serve it at
  `http://127.0.0.1:7474/timbre-overlay/mic-visualizers-1920x1080.html`.
- **The 16:9 page fits any source size.** It lays out at 1920×1080 and CSS-scales
  itself (uniformly, centred/letterboxed if not 16:9) to the Browser Source's
  width × height — one page serves 1280×720, 960×540, 640×360 … The canvas still
  renders at 1728×624 and is filtered on the downscale, so small sources stay
  sharp and effect geometry is identical at every size. `core.js` now sizes the
  no-border canvas buffer from layout (`offsetHeight`) instead of screen rects so
  it stays correct under the transform. Render suite covers 1280×720 / 640×360 /
  4:3 letterbox / no-border-while-scaled.
- **The 1440×1080 (4:3) page fits any source size too** — same mechanism, 1440×1080
  reference, 1248×624 buffer untouched: 960×720, 720×540, 480×360 … from one page.
  `verify` 37/37, `verify:render` 39/39 (adds 720×540 fit, 16:9 letterbox, no-border
  while scaled; writes `test-render-720.png`).
- `window.__timbre` now exposes `SCALE`, `W` and `H` for the render suite.
- `verify` gains overlay-page parity checks (every page loads every factory; canvas
  buffers match their CSS box; the 16:9 page's pin) → 35/35. `verify:render` adds a
  1920×1080 pass (buffer/`SCALE` geometry, ring-bars stays inside the canvas,
  decoration + no-border toggles rescale); writes `test-render-1920.png` /
  `test-render-640.png`.

### Changed

- **Orbit is now a sun with planets.** A glowing sun and up to nine planets, each on its own
  slightly different tilted orbit and leaning on its own axis, passing behind the sun and in
  front of it. Louder sound makes every planet orbit faster and leave a longer streak of light;
  the low end makes the sun swell and shrink. A hard peak flares the sun and the planets surge
  for a moment. The old Orbit was short-lived square dots circling a square core. Its
  **Density** setting is retired (a saved value is dropped); **Planets** sets how many planets
  there are.
- **Pulse Rings is now a ringed planet.** A glowing planet with a tilted ring disc. Each
  syllable is a bright ripple that starts at the inner edge of the rings and travels outward;
  louder, the planet glows brighter and its storm and the ice in the rings turn faster. A hard
  peak blows the planet into chunks and thins the rings; after a calm wait the chunks drift back
  and snap together, and the rings fill back in. The old Pulse Rings threw rings of square dots
  outward from the centre; nothing is thrown off any more. **Sensitivity** now sets how strongly
  the rings answer the voice (it was how easily a ring was thrown), and **Flow** how far out the
  rings reach (it stretched the rings sideways).
- **Fireflies is now a living swarm.** Soft glowing fireflies wander the whole frame,
  each blinking on its own slow rhythm and leaving a short streak of light. Louder, they
  blink more, glow brighter and fly faster; each syllable sets off a burst of flashes,
  and a hard peak makes the whole swarm flash and scatter. The old Fireflies sprayed
  square particles out of the centre; that spray is gone. **Density** now sets how many
  fireflies there are, 10 to 60 (it was the spawn rate). **Trail veil** no longer affects
  Fireflies.
- **Comet is now a smooth glowing comet.** A glowing head flies a slow looping path with
  a tapering tail; louder, it flies faster and wider, glows brighter and trails longer.
  The tail is thicker where the voice was louder as the head passed, the high end of the
  sound sheds sparks, and a hard peak flares the head. The old Comet plotted the sound
  wave as a stepped looping figure; that figure is gone. **Trail** now sets the tail's
  length and a higher value is a longer tail (it was the fade speed, where higher was
  shorter). **Trail veil** no longer affects Comet.
- **DNA is now a smooth glowing double helix** that twists faster and glows brighter
  with loudness, opens its two strands with the low and high end of the sound, and
  shatters on a hard peak, then reassembles. The stepped look is gone.
- **Thanksgiving Harvest is now a 3D scene** on the scene kit: a wicker cornucopia
  spilling pumpkins, apples, gourds, corn, grapes and wheat toward the viewer, with
  three candles that flicker with the voice and cast real light and shadow, and autumn
  leaves that fall more with volume and beats. Its knobs are now **Candle glow**,
  **Leaf density** and **Camera drift**; **Pumpkin pulse** and **Wheat sway** are gone
  (saved values for them are dropped on load). The effect id and count are unchanged.
- **Waveform and Ring Waveform are now smooth lines.** The stepped look is gone: the
  line is a smooth curve that follows the samples, with a glow and a thin white core.
- **Peak Hold's marker is timed in seconds and scaled to the page**, so it looks the same
  at any frame rate. It falls faster than before on the two large pages (1440×1080 and
  1920×1080).

## [1.0.9] — 2026-07-29

### Changed

- **Tunnel visualizer reworked** from spider-web spokes into a circular neon
  pipe. The ribs are true `arc()` circles (a constant-z ring projects to an
  exact circle), the rails taper and fade into the bore with width and alpha
  scaling as 1/z, loudness pulses ride the ribs in from the far end as radius
  bulges, and there's slow axial roll, a vanishing-point glow and a faint wall
  wash. Same bend knob and config surface. `verify` 28/28, render 14/14.
  (`6be9219`, 2026-07-11)
- **`rose.stl` replaced with the author's own CC-BY-4.0 mesh**, generated with
  Meshy.ai and converted from the Bambu 3MF (Z-up → Y-up, so the default spin
  axis is the stem). 4,558 triangles, renders as a clean wireframe rose. All
  STL provenance concerns are now resolved. (`0cfeefc`, 2026-07-11)

### Removed

- **Japandi Rose visualizer** — its source model is CC BY-NC-ND: the ND term
  blocks redistributing the processed mesh and NC conflicts with monetized
  stream use. Down to **49 effects** (37 2D + 12 WebGL). (`07a9fe1`,
  2026-07-11)
- **Lightning Sword and Save the Queen visualizers** — copyrighted source
  assets. Down to 50 effects (37 2D + 13 WebGL) at the time; the STL group
  remains. (`9cc7f9f`, 2026-07-11)

### Documentation

- README: clone / Download-ZIP as the first setup step. (`81bb0c9`, 2026-07-21)
- Author & support section added; the CC-BY-4.0 rose model credited in the
  README license section; support links point at the personal Discord server.
  (`3e07989` / `5214aaf`, 2026-07-20)

## [0.1.0] — 2026-07-11

Initial release — Streamer.bot-native mic visualizer for OBS, ported from the
StreamService / ControlPanel toolkit. (`6cfff29`)

### Added

- **52 visualizer effects** (2D canvas and WebGL) driven by the microphone.
  See *Removed* above — the shipping count is now 49.
- **Self-capturing overlay** — the overlay captures the mic itself via
  `getUserMedia` inside OBS CEF, so only configuration JSON crosses the wire
  over the Streamer.bot WebSocket. No audio ever travels the bus.
- Single source of truth for settings in `shared/viz-config.js`, with a control
  page and a `spike/` permission-check page.
- Public STL swords are CC0 procedural replacements.

Verified offline: `verify` 28/28, `verify:render` 14/14.

[1.0.9]: https://github.com/FlashGalatine/timbre-visualizer/compare/6cfff29...main
