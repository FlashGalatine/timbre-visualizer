# Pinned sources: a visualizer and a look in the address

Date: 2026-11-23. Status: waiting for the owner's approval.

## Why

Today the dock saves one config and every overlay page shows it, so every Browser
Source shows the same visualizer with the same look. The owner wants one OBS scene
built from several sources, each with its own visualizer and its own look.

## Goals

- An overlay page can be told in its address which visualizer to show and how it looks.
- The dock can produce that address from the look it is showing now.
- A source with no such parameters behaves exactly as it does today.

## Non-goals

- Named looks stored in Streamer.bot, or live editing of a pinned source from the dock.
- Any change to the Timbre Push action, the saved config's shape, or the mock server's protocol.
- One shared microphone capture for several sources. Each page still opens its own.

## Anti-goals

- A parameter must never reach anything but the settings table: no value from the address
  goes into a URL, into HTML, or into the microphone choice.
- A bad or unknown parameter must never stop the page or change a setting it does not name.

## Approaches considered

1. **Everything in the address.** Parameters override the dock's config. Only the overlay
   changes, but a look is tuned by editing a long address by hand.
2. **The address plus a "Copy source address" button in the dock (chosen by the owner).**
   Same mechanism as 1; the look is tuned with the dock's sliders and preview, then copied.
   Changing a source's look later means copying a new address.
3. **Named looks in Streamer.bot** (`?look=left`). Every source stays live-editable, but the
   action, the saved config, the dock, the mock server and the suites all change.

## Design

### Parameters

Each is optional. One that is present overrides the dock for that setting on that page;
one that is absent follows the dock as today.

| Parameter | Value | Example |
|---|---|---|
| `visualizer` | an id in `TIMBRE.ACTIVE_VIZ_NAMES` | `visualizer=rose` |
| a `TOP_RANGES` key | a number, clamped to its range | `gain=150` |
| a `TOP_BOOLS` key | `1` or `0` | `showBorder=0` |
| `afterglow` | a number, clamped | `afterglow=0.8` |
| `placement.x`, `placement.y`, `placement.size` | a number, clamped | `placement.size=140` |
| `<visualizer id>.<knob>` | a number or text, as the knob's type | `rose.cameraDrift=20` |

- `mic` and `micProcessing` are never read from the address. Every source uses the dock's microphone.
- `sbport` and `sbdebug` keep their present meaning.
- A value of the wrong type, an unknown key, an unknown visualizer id or an unknown knob is
  ignored. With `sbdebug=1` the page logs what it ignored.
- Text knobs (Matrix's text, for one) are URL-encoded and cut to `TIMBRE.MAX_STRING`.

### Shared code (`shared/viz-config.js`)

Two new functions on `TIMBRE`, so that the dock, the overlay and the suites use one copy:

- `lookFromQuery(search)` returns a partial config holding only what the address names.
- `lookToQuery(config)` returns the query string for a whole look: `visualizer`, every
  top-level setting, `afterglow`, `placement`, and the knobs of the active visualizer only.

`lookFromQuery(lookToQuery(cfg))` merged over the defaults must give back `cfg`'s look.

### Overlay (`overlay/core.js`)

- The address is read once at load.
- At start-up the page applies the address's look over the defaults, so a pinned source
  shows its visualizer before Streamer.bot answers, and when it is not running.
- In `applyConfig`, the address's look is merged over each incoming config with
  `sanitizeConfig` before `configInForce` is asked. The dock's `activeViz` therefore never
  moves a pinned page.
- No change to the three page files beyond what the start-up needs.

### Dock (`control/control.html`)

In the preview section: a page-size choice (300×220, 1440×1080, 1920×1080; default
1920×1080), a "Copy source address" button, and a read-only text field.

- The button builds `origin + /timbre-overlay/<page> + lookToQuery(the dock's current config)`,
  adding `sbport` when the dock's own address has a valid one.
- It puts the address in the text field, selects it, and tries the clipboard. The field is
  there because the clipboard may be refused inside an OBS dock.
- The dock's own preview is unchanged.

## Builder's calls (mine, not the owner's)

- Dotted names for placement and knobs; `1`/`0` for toggles.
- The button copies the whole look, so a pinned source is fully frozen. Trimming the
  address by hand makes those settings follow the dock again.
- The page-size choice and the text field beside the button.
- Parameters work without `visualizer` (`?showBorder=0` alone follows the dock's visualizer).

## Left to the builder

- Tests: in `verify.mjs`, the round trip, clamping, and every kind of bad parameter; in
  `verify-render.mjs`, a pinned page that keeps its visualizer and look through a
  broadcast naming another, and an unpinned page that still follows.
- `control/control.html` is patched with a node script, not the Edit tool.
- `docs/SETUP.md`, `README.md`, the changelog and the version.

## Not known yet

How several sources behave in one OBS: each opens its own microphone capture and loads
every effect, and each WebGL visualizer has its own GL context. To be checked in OBS with
two and three pinned sources once built.
