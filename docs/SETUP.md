# Timbre — Streamer.bot setup

Tested against Streamer.bot **1.0.7** on Windows. Two SB surfaces are used: the HTTP
Server (static files) and the WebSocket Server (config relay). No plugins, no Node process.

## 1. Enable the two servers

**Servers → HTTP Server**: enable, port `7474` (default). Add four Path → Folder maps
(SB's HTTP prefixes are one flat namespace shared by every component — Timbre claims
`timbre-*`):

| Path | Folder | Needed for |
|---|---|---|
| `timbre-overlay` | `<repo>\overlay` | the overlay pages, and the preview inside the dock |
| `timbre-shared`  | `<repo>\shared` | the overlay pages and the dock: both load `viz-config.js` and `panel-client-sb.js` from it |
| `timbre-control` | `<repo>\control` | the dock |
| `timbre-spike`   | `<repo>\spike` | the mic check in step 3, once at setup; nothing else loads it |

The pages ask for `/timbre-shared/...` and the dock's preview for `/timbre-overlay/...` by
those exact names, so those two paths cannot be renamed. Once the mic check has passed,
the `timbre-spike` map can be removed.

**Servers → WebSocket Server**: enable, `127.0.0.1:8080` (default), **authentication OFF**
(the overlay transport doesn't authenticate).

Non-default ports? Append `?sbport=<wsport>` to every page URL (http-served pages only),
or set `window.__SB_WS_URL` before the transport script loads.

## 2. Create the action

Actions → Add → name it **exactly `Timbre Push`** (every page calls it by name; with a
different name no page gets the saved settings, and the dock's status line says
"Action missing"). Add one sub-action:
**Core → C# → Execute C# Code**, paste all of [../actions/timbre-push.cs](../actions/timbre-push.cs),
click **Compile** — it must succeed. Uses only SB's default reference set (no
Newtonsoft, no References-tab additions).

**Put the action in a blocking queue.** In Streamer.bot's action queues, add a queue
(call it `Timbre`) with **Blocking** turned on, then set that queue on `Timbre Push`.
Do not leave it in the default queue. In the default queue Streamer.bot can run two
requests for the same action at once, and when it does, both runs see one request's
arguments: a change made in the dock can be lost, or an older config can be the last one
broadcast. A blocking queue runs them one at a time, in the order they arrived. Measured
on Streamer.bot 1.0.7 with a test action: two back-to-back requests mixed their arguments
in 25 of 25 tries in the default queue, and in 0 of 25 in a blocking queue, whether they
came from one page or two.

State lives in one persisted global variable, `timbre.config` (the full config JSON as a
string). Deleting it does not reset anything that is already open. With the variable gone
the action has nothing to send, so:

- a page loaded afterwards starts on the defaults;
- overlay pages and the dock that are already open keep the settings they have until
  they are reloaded;
- the next change made in an open dock saves that dock's settings again, all of them.

To put everything back to defaults: delete the variable, then refresh every overlay
source and reload the dock before changing anything in the dock.

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
  `http://127.0.0.1:7474/timbre-overlay/mic-visualizers-1440x1080.html` (4:3) or
  `http://127.0.0.1:7474/timbre-overlay/mic-visualizers-1920x1080.html` (16:9 — same
  element sizes as the 4:3 page, wider canvas). **Both big pages fit any source size**:
  set the Browser Source to 1440×1080, 960×720, 720×540 … (4:3) or 1920×1080, 1280×720,
  960×540, 640×360 … (16:9) and the page scales to it uniformly, letterboxing if the
  source's aspect doesn't match.
  Must be the `http://` URL — a local `file://` source could neither load the shared
  scripts nor take `?sbport=` overrides.
- **Control panel** (Docks → Custom Browser Docks):
  `http://127.0.0.1:7474/timbre-control/control.html`.

The overlay starts capturing immediately (status `LISTENING`; `MIC DENIED` in magenta if
capture failed; `WAITING` while acquiring). With Streamer.bot down the overlay still runs
on its last/default settings and reconnects with backoff.

## 5. Drive it

Everything in the control panel pushes live: effect picker, per-effect knobs, scene
placement, matrix text, global sliders/toggles, the mic device and its Microphone processing toggle. Device labels need a one-shot mic grant in the dock — click **Refresh** next to
the device dropdown.

The mic selection is part of the shared config, so **all overlay pages capture the same
configured device**. Overlays re-match the device by label if Chromium's device ids
churn, and fall back to the system default mic rather than going dark.

**Microphone processing** (under the device, in the dock's Microphone section) is what the
browser does to the microphone before the overlay sees it:

- **On** (the default, and what Timbre has always done): the browser's echo cancellation,
  noise suppression and automatic gain. Quiet sounds are gated and loud and soft are evened
  out, so the effects sit still when the room is quiet.
- **Off**: the raw microphone. It is truer to the sound, but it lets room noise through in
  quiet moments (a fan, a keyboard), so an effect may stir when nobody is speaking. If the
  effects read too strong or too weak after the change, set **Gain**.

Changing it re-opens the microphone on every overlay page (`WAITING` for a moment, then
`LISTENING`). It is saved with the other settings. A microphone that cannot be opened raw
is opened with the processing on instead, and the overlay page's console says so.

## Updating

Do it in this order. The changelog entry of each release names the folders that changed
and says whether the action must be pasted again.

1. **Pages first.** If the HTTP maps point at a copy of the folders, copy the new
   `overlay`, `shared` and `control` folders over it. If they point at the checkout
   itself, pulling the new version has done this.
2. Reload the dock and refresh every overlay source, so no page from before the update
   is left open.
3. **Then the action**, and only when the changelog says so: paste all of
   `actions/timbre-push.cs` into the `Timbre Push` action again and click **Compile**.

The order matters. The action refuses a settings change that does not carry every
top-level setting, and an older dock page may not send them all: with a new action and
an old dock, every change is then refused and the dock says "not a full config".

Release 1.0.196, which adds the **Microphone processing** setting, is one where the action must be
pasted again: pages first, then re-paste. The new action asks for the new setting
(`micProcessing`) in every change, and a dock page from before that release does not send
it. In the other order every change made in the old dock page is refused, with "not a
full config" on its status line, until that page is reloaded; what is saved stays as it
was. With the pages updated and the old action still in place, everything works, the new
toggle included; the old action only does not insist on the new setting. Your saved
settings are kept either way, and settings saved before the release read as Microphone
processing on.

## Troubleshooting

### The dock's status line

The line under the title says what the dock knows. The dot is green when all is well, red
when Streamer.bot cannot be reached, and amber when it can be reached but the action is
not doing its work. While an amber line shows, the dock tries again every five seconds,
so the line clears by itself once the cause is fixed. After a refusal it stops trying
until you change a setting or it reconnects, because the same settings would be refused
again.

| The line says | What it means, and what to do |
|---|---|
| `connecting to Streamer.bot…` | The page has only just loaded. If it stays, and the effect list is empty, the dock's scripts did not load: check the `timbre-shared` map. |
| `Streamer.bot offline — retrying…` | No WebSocket connection. Check that Streamer.bot is running, that its WebSocket Server is enabled on `127.0.0.1:8080` with authentication off, and that the dock's URL has `?sbport=` if the port is not 8080. |
| `Action missing: Streamer.bot has no action named "Timbre Push". Create it (docs/SETUP.md, step 2).` | Streamer.bot answered that no action has that name. The name must match exactly, capitals and space included. |
| `Streamer.bot refused Timbre Push: …` | Streamer.bot answered the request with some other error. The text after the colon is Streamer.bot's own. |
| `Connected, but Timbre Push did not answer. Check that its C# compiled (docs/SETUP.md, step 2).` | A change was sent and did not come back. The action exists but broadcast nothing, which is what an action whose C# did not compile does. |
| `Timbre Push refused the settings: not a full config. Reload this dock; if it still happens, re-paste the Timbre Push action (docs/SETUP.md, step 2).` | The dock page and the action are from different versions. See "Updating" above. |
| `Timbre Push refused the settings: over 64 KB.` | The settings text is too long to save. The only settings that grow are the two Matrix texts: shorten them. |
| `Timbre Push refused the settings: not valid JSON.` | The action was handed text that is not one JSON object. Reload the dock; if it still happens, paste the action again. |
| `The settings saved in Streamer.bot are damaged. Change any setting here to replace them.` | The `timbre.config` global holds text the action will not send to a page. It is not deleted. Any change in the dock saves a good config over it. |
| `Timbre Push failed inside Streamer.bot — see the Streamer.bot log.` | The action threw an exception. Its text is in Streamer.bot's log, on a line that starts `[Timbre Push] ERROR`. |
| `Timbre Push failed: … — see the Streamer.bot log.` | The same, from an action pasted before release 1.0.189, which sends the exception's own text. Paste the current action. |
| `Streamer.bot connected` | The connection is open and nothing has gone wrong. |

Two things can follow a line:

- `Your changes are kept.` (or `Your changes are kept and will be sent when it is
  back.`): you changed something and no broadcast has carried it back yet. The dock holds
  the changes and sends them when it can.
- A second line, `Timbre Push is in Streamer.bot's Default queue, where a change can be
  lost. Put it in a blocking action queue: docs/SETUP.md, step 2.`: the action works, but
  it is not in a blocking queue. The line goes once it is.

### Other symptoms

- **Overlay stuck on defaults** → the `Timbre Push` action name doesn't match, the C#
  didn't compile, SB's WS auth is on, or nothing has been saved yet (no change has ever
  been made in the dock). Open the dock and change a setting: its status line then tells
  the first two apart.
  `?sbdebug=1` on any page logs the transport flow.
- **Black overlay** → check the `timbre-overlay` and `timbre-shared` maps;
  `/timbre-shared/viz-config.js` must load (absolute path — the pages break if only
  `timbre-overlay` is mapped).
- **Empty preview in the dock** → the preview is the 300×220 overlay page, so it needs
  the `timbre-overlay` map.
- **No bars but LISTENING** → wrong mic selected; pick the right device in the dock.
- **A leftover `:8080` after closing SB** → known SB gotcha: child processes it spawned
  can inherit the socket; make sure nothing SB started is still running.
