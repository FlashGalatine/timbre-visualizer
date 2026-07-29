# Changelog

All notable changes to **Timbre** are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Nothing has been tagged since the initial release, so every change that landed
afterwards sits under **Unreleased**. Commit hashes and landing dates are noted
for traceability.

## [Unreleased]

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

[Unreleased]: https://github.com/FlashGalatine/timbre-visualizer/compare/6cfff29...main
