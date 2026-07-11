# Timbre — writing your own effect

Every effect is a self-registering **factory**: one plain `<script>` file that adds an
entry to `VIZ_FACTORIES`. The core (`overlay/core.js`) owns the canvases, the config, the
audio arrays, and the animation loop; a factory only draws.

## The contract

```js
// overlay/factories/my-effect.js
VIZ_FACTORIES['my-effect'] = () => {
  // one-time setup per activation (runs each time the effect is selected)
  return {
    start() {},                 // optional — after activation
    stop() {},                  // optional — before switching away (free GL resources!)
    draw(now, dt) {             // required — called every animation frame
      ctx.clearRect(0, 0, W, H);
      if (!micActive || !frequencies) { /* draw an idle state if cfgIdleAnim */ return; }
      for (let i = 0; i < cfgBars; i++) {
        const v = (frequencies[i] / 255) * cfgGain;       // 0..~2
        const [r, g, b] = getColor(now / 1000 * cfgColorSpeed + cfgColorHue + i * 0.2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(i * (W / cfgBars), H - v * H, W / cfgBars - 2, v * H);
      }
    },
    onResize() {},              // optional — canvas buffer size changed
    onConfig(cfg) {},           // optional — full config object after each apply
  };
};
```

Script-scope globals available to factories (from core.js):

| Name | Meaning |
|---|---|
| `ctx`, `canvas2d` | 2D canvas + context (visible for 2D effects) |
| `canvas3d` | WebGL canvas (visible for effects listed in `VIZ_USES_3D`) |
| `W`, `H`, `SCALE` | canvas buffer size + width-based scale factor (1.0 at 260 px wide) |
| `frequencies` | `Uint8Array(32)` FFT bins, 0–255, or `null` when no mic |
| `waveform` | `Uint8Array(64)` time-domain samples, 0–255, or `null` |
| `micActive` | mic currently captured |
| `cfgGain`, `cfgBars`, `cfgBounce`, `cfgColorSpeed`, `cfgColorHue`, `cfgIdleAnim`, `cfgEffectBgOpacity` | normalized global knobs |
| `cfgSTLObject` | the shared 3D-model knob group (STL effects) |
| `perViz['my-effect']` | your effect's own knobs |
| `getColor(t)` | palette lookup → `[r,g,b]` |
| `THREE` | three.js r160 (vendored) |

Multiply pixel-tuned constants by `SCALE` so both the 300×220 and 1440×1080 layouts look right.

## Registration (3 edits)

1. Drop the file in `overlay/factories/my-effect.js`.
2. `shared/viz-config.js`: add `'my-effect'` to `ACTIVE_VIZ_NAMES` (and to `VIZ_USES_3D`
   if it renders WebGL); add a `DEFAULT_PER_VIZ['my-effect'] = { myKnob: 50 }` entry if it
   has knobs — the control panel generates sliders from it automatically (numeric knobs
   are 0–100 unless overridden in `PER_VIZ_MAX`).
3. Add the `<script src="factories/my-effect.js">` tag to **both** overlay HTML pages.

`npm run verify` fails if a name/factory-file/defaults entry is missing — run it.

## 3D STL effects

The STL effect (`rose`) shares the
`stlObject` knob group and a hand-rolled **binary STL** parser (see
`overlay/factories/rose.js`). ASCII STL files are not supported — export binary. To swap
in your own model, replace the file in `overlay/assets/` and update the `*_STL_URL`
constant in the factory.

## Wire format (for driving Timbre from elsewhere)

Anything that can call a Streamer.bot action can drive Timbre:

```
DoAction "Timbre Push"  args: { config: "<full config JSON>" }     — set + broadcast
DoAction "Timbre Push"  args: { reason: "…" }                      — re-broadcast cached
```

The broadcast every page receives is
`{ "type": "timbre:config", "config": { …full config… } }` inside SB's `General.Custom`
envelope. The full config shape is exactly `TIMBRE.defaultConfig()` in
`shared/viz-config.js` — that file is the schema.
