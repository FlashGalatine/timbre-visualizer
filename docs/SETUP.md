# Timbre — Streamer.bot setup

Tested against Streamer.bot **1.0.4** on Windows. Two SB surfaces are used: the HTTP
Server (static files) and the WebSocket Server (config relay). No plugins, no Node process.

## 1. Enable the two servers

**Servers → HTTP Server**: enable, port `7474` (default). Add four Path → Folder maps
(SB's HTTP prefixes are one flat namespace shared by every component — Timbre claims
`timbre-*`):

| Path | Folder |
|---|---|
| `timbre-overlay` | `<repo>\overlay` |
| `timbre-shared`  | `<repo>\shared` |
| `timbre-control` | `<repo>\control` |
| `timbre-spike`   | `<repo>\spike` |

**Servers → WebSocket Server**: enable, `127.0.0.1:8080` (default), **authentication OFF**
(the overlay transport doesn't authenticate).

Non-default ports? Append `?sbport=<wsport>` to every page URL (http-served pages only),
or set `window.__SB_WS_URL` before the transport script loads.

## 2. Create the action

Actions → Add → name it **exactly `Timbre Push`** (the overlay calls it by name on
connect; a different name = silent no-sync). Add one sub-action:
**Core → C# → Execute C# Code**, paste all of [../actions/timbre-push.cs](../actions/timbre-push.cs),
click **Compile** — it must succeed. Uses only SB's default reference set (no
Newtonsoft, no References-tab additions).

State lives in one persisted global variable, `timbre.config` (the full config JSON as a
string). Delete it to reset every setting to defaults.

## 3. CEF mic check (do this once)

OBS's embedded Chromium has **no permission prompt** for `getUserMedia`. Before wiring
the real overlay, add a Browser Source pointed at:

```
http://127.0.0.1:7474/timbre-spike/mic-test.html
```

(width 800 × height 600, "Control audio via OBS" **unchecked**). You should see
**GRANTED**, the RMS bar moving when you speak, your device list with labels, and a
WebGL renderer string. Also worth checking while you're here:

- Add the spike **twice** — both sources should capture the same mic concurrently
  (the 300×220 and 1440×1080 / 1920×1080 overlays may run together).
- Toggle "Control audio via OBS" — the visualizer emits no audio, but confirm no
  monitoring weirdness on your build.

If it shows **DENIED — NotAllowedError**, the overlay's self-capture path won't work in
your OBS build. Fallbacks, in order: launch OBS with the
`--use-fake-ui-for-media-stream` flag (auto-accepts media requests); or run the overlay
in a normal browser window captured via Window Capture; or open an issue — a small
sender-page + relay sidecar variant is the designed fallback.

## 4. Add the OBS sources

- **Overlay** (Browser Source):
  `http://127.0.0.1:7474/timbre-overlay/mic-visualizers-300x220.html` (300×220),
  `http://127.0.0.1:7474/timbre-overlay/mic-visualizers-1440x1080.html` (1440×1080, 4:3) or
  `http://127.0.0.1:7474/timbre-overlay/mic-visualizers-1920x1080.html` (16:9 — same
  element sizes as the 4:3 page, wider canvas; **fits any source size**: set the Browser
  Source to 1920×1080, 1280×720, 960×540, 640×360 … and the page scales to it uniformly,
  letterboxing if the source isn't 16:9).
  Must be the `http://` URL — a local `file://` source could neither load the shared
  scripts nor take `?sbport=` overrides.
- **Control panel** (Docks → Custom Browser Docks):
  `http://127.0.0.1:7474/timbre-control/control.html`.

The overlay starts capturing immediately (status `LISTENING`; `MIC DENIED` in magenta if
capture failed; `WAITING` while acquiring). With Streamer.bot down the overlay still runs
on its last/default settings and reconnects with backoff.

## 5. Drive it

Everything in the control panel pushes live: effect picker, per-effect knobs, the 3D
model group (for the STL effects), matrix text, global sliders/toggles, and the mic
device. Device labels need a one-shot mic grant in the dock — click **Refresh** next to
the device dropdown.

The mic selection is part of the shared config, so **all overlay pages capture the same
configured device**. Overlays re-match the device by label if Chromium's device ids
churn, and fall back to the system default mic rather than going dark.

## Troubleshooting

- **Overlay stuck on defaults** → the `Timbre Push` action name doesn't match, the C#
  didn't compile, or SB's WS auth is on. `?sbdebug=1` on any page logs the transport flow.
- **Black overlay** → check the four HTTP maps; `/timbre-shared/viz-config.js` must load
  (absolute path — the pages break if only `timbre-overlay` is mapped).
- **No bars but LISTENING** → wrong mic selected; pick the right device in the dock.
- **A leftover `:8080` after closing SB** → known SB gotcha: child processes it spawned
  can inherit the socket; make sure nothing SB started is still running.
