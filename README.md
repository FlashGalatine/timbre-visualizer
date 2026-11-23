# Timbre

A **Streamer.bot-native microphone audio visualizer** for OBS — 52 hand-built canvas/WebGL
effects in one overlay, driven live from a browser control panel (usable as an OBS dock).
**No dedicated server**: the overlay captures its own microphone with the Web Audio API,
and Streamer.bot's built-in HTTP + WebSocket servers do the hosting and config relay.

![Timbre overlay](docs/img/overlay.png)

## How it works

```
control.html ── DoAction "Timbre Push" {config} ──► Streamer.bot (C# caches + broadcasts)
                                                        │ General.Custom
                                                        ▼
                                    overlay page (OBS Browser Source)
                                    ├─ getUserMedia + AnalyserNode  ← its OWN mic capture
                                    └─ 52 self-registering effect factories
```

- **No audio crosses any wire.** Each overlay page runs its own `getUserMedia` →
  `AnalyserNode` (fftSize 64, ~30 fps). Only the settings JSON travels, via Streamer.bot.
- **One config message** (`timbre:config`) carries everything: active effect, global knobs,
  the shared 3D-model knob group, per-effect knobs, and the mic device to capture.
- **Sync-on-connect:** on WebSocket open the overlay fires `DoAction "Timbre Push"`, and the
  C# action re-broadcasts the cached config — a source added mid-stream paints correctly.
- All names/defaults/ranges live in one file (`shared/viz-config.js`) used by the overlay,
  the control panel, and the verify suites.

## Quick start (no Streamer.bot needed)

First, get the code — either `git clone https://github.com/FlashGalatine/timbre-visualizer.git`
or click **<> Code → Download ZIP** on the repo page and extract it. Then, inside the folder:

```
npm install
npm start          # mock Streamer.bot on :7474 (HTTP) + :8080 (WS)
```

Open `http://127.0.0.1:7474/` and launch the control panel + an overlay from the index.
The overlay will ask for mic permission in a normal browser.

## Quick start (real Streamer.bot)

See **[docs/SETUP.md](docs/SETUP.md)**. Summary: map four HTTP-server folders
(`timbre-overlay`, `timbre-shared`, `timbre-control`, `timbre-spike`), create one action
named exactly **`Timbre Push`** with the C# in [actions/timbre-push.cs](actions/timbre-push.cs),
put that action in a blocking action queue (the setup guide says why),
then add `http://127.0.0.1:7474/timbre-overlay/mic-visualizers-300x220.html` (or the
4:3 `mic-visualizers-1440x1080.html` / 16:9 `mic-visualizers-1920x1080.html` pages, which
scale to whatever size you give the Browser Source — 720×540, 1280×720, 960×540 …) as an
OBS Browser Source and
`.../timbre-control/control.html` as a Custom Browser Dock.

> **First: run the mic spike.** OBS's embedded browser has no permission prompt; add
> `.../timbre-spike/mic-test.html` as a Browser Source once to confirm it auto-grants
> the microphone on your OBS build (see docs/SETUP.md → "CEF mic check").

## The 52 effects

32 canvas-2D + 20 WebGL (three.js, vendored — works offline). Includes spectrum bars,
waveforms, matrix rain with custom text, seasonal/holiday scenes, Pride flags, and
floating 3D scenes that answer the voice (a rose that blooms, birds on a wire, a school
of fish, a Christmas tree whose lights carry your voice). Add your own: drop a factory file in `overlay/factories/`, register it in
`shared/viz-config.js`, add a `<script>` tag — see [docs/EFFECTS.md](docs/EFFECTS.md).

## Verification

```
npm run verify           # over 1,000 protocol/table checks, against a mock of Streamer.bot
npm run verify:render    # over 900 real-pixel checks in system Edge/Chrome (fake mic device)
npm run verify:cs        # Windows only: compiles the C# action and runs its accept/reject cases
```

`npm install` brings `playwright-core`, which `verify:render` drives. It uses the Edge or Chrome
already on the machine and downloads no browser.

The mock answers as Streamer.bot 1.0.7 was measured to: it replies when an action is queued (not
when it has run), stores a config as it was sent, and broadcasts to every connected page. It is
not Streamer.bot: the microphone check in docs/SETUP.md still has to be done in OBS. Each suite starts its own mock on
side ports (7476 and 8090), and stops with a message if something already answers there.

`verify:cs` needs `csc.exe` from the .NET Framework and is not part of `npm run verify`.

## Author & support

Built by **Ashe "Flash" Galatine**.

- Email — [AsheJunius@gmail.com](mailto:AsheJunius@gmail.com)
- X — [@FlashGalatine](https://x.com/FlashGalatine) · BlueSky — [@projectgalatine.com](https://bsky.app/profile/projectgalatine.com)
- Twitch — [FlashGalatine](https://www.twitch.tv/FlashGalatine) · Discord — [Project Galatine](https://discord.gg/K6pRfSvu2Q)
- Support — Patreon [ProjectGalatine](https://www.patreon.com/ProjectGalatine) · CashApp [$ProjectGalatine](https://cash.app/$ProjectGalatine)

## License

MIT — see [LICENSE](LICENSE). Third-party: three.js (MIT) and the Audiowide font
(SIL OFL 1.1) — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
