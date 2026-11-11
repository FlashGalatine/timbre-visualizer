# Floating 3D Scenes: Scene Kit and Thanksgiving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat 2D Thanksgiving effect with a real 3D scene (a wicker cornucopia, a spilled harvest, three voice-driven candles) that floats on the see-through visualizer box, built on a reusable scene kit that the other 17 seasonal scenes will use later.

**Architecture:** A new classic script, `overlay/scene-kit.js`, owns one shared three.js renderer per page and a four-step frame pipeline: solid pass, light-catcher pass, afterglow feedback, tone-mapped output. Its arithmetic (sound envelope, camera fit, decay, placement) is pure and Node-importable, so it is tested without a browser. A scene is a plain definition object with `build` and `update` hooks. The Thanksgiving factory is the first scene.

**Tech Stack:** Plain browser JavaScript as classic `<script>` files (no build step), three.js r160 (vendored at `overlay/vendor/three.min.js`), Node 18+ for `verify.mjs`, `playwright-core` with system Edge or Chrome for `verify-render.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-10-floating-3d-scenes-thanksgiving-design.md`. Read it before starting; this plan argues from it.

## Global Constraints

- No build step. Every new file is a classic `<script>` loaded by all three overlay pages. `overlay/scene-kit.js` must also load under Node (`import './overlay/scene-kit.js'`): it may not touch `document`, `window`, `THREE` or `core.js` globals at load time, only inside functions.
- three.js stays at r160. No new dependencies in `package.json`.
- The only pixels a scene may darken are those covered by a solid object. Light is written with alpha 0. Never use three's stock `AdditiveBlending` for light; use the kit's `addLight`.
- Every rate, decay and probability is computed from `dt`. Nothing advances per frame.
- A scene's `stop()` disposes everything it created and leaves the WebGL context in default state.
- Effect id stays `thanksgiving-harvest`. The effect count stays 49.
- The 12 existing WebGL effects and all 2D effects are not modified.
- Tests use the mock on side ports only (HTTP 7476, WebSocket 8090). Never connect to 7474 or 8080: a real Streamer.bot runs there on the owner's machine.
- Change `control/control.html` with a small Node patch script, not an editor tool that auto-previews the file. On the owner's machine such previews open the page and it dials the live Streamer.bot.
- Commit messages follow the repo's style: a short imperative subject, no prefix.

## Review Focus

Conditions the spec implies but does not test, most likely first. Each has a test in the task named.

1. **A config push while the scene is running** (every slider tick sends one, and `core.js` calls `onResize` on each). The afterglow must not reset and render targets must not be rebuilt, including with the border off, where the canvas height changes and changes back inside a single push. Task 3, checks "config push does not rebuild targets" and "nor with the border off".
2. **Border off.** The canvas stretches to the whole box (1920×1080 or 1440×1080), a much squarer shape. The scene must still fit and nothing may throw. Task 3, check "border off refits".
3. **No microphone and Idle animation off.** Level is 0 for the whole session. Candles must sit at their ember level, not go dark, and only the baseline four leaves fall. Task 4, check "silent scene keeps its embers".
4. **A long frame** (the tab was hidden, `dt` arrives at `core.js`'s cap of 0.1 s). The envelope must stay finite and inside its ranges. Task 2, test "envelope survives a 0.1 s step".
5. **three.js missing or WebGL unavailable.** The scene shows nothing, and the page keeps running without an error. Task 3, check "no THREE, no throw".

---

### Task 0: Branch and baseline

**Files:**
- No source changes.

The working tree is on `fix/effect-bugs` with seven uncommitted bug fixes in `overlay/factories/` (chladni, easter-eggs, jelly, matrix, new-year-fireworks, ring-bars, shards) and the untracked `docs/superpowers/` folder. They are unrelated to this plan and must not be mixed into its commits.

- [ ] **Step 1: Commit the seven fixes on `fix/effect-bugs`**

```bash
git add overlay/factories/chladni.js overlay/factories/easter-eggs.js overlay/factories/jelly.js overlay/factories/matrix.js overlay/factories/new-year-fireworks.js overlay/factories/ring-bars.js overlay/factories/shards.js
git commit -m "Fix seven effect bugs found in the 10 November audit"
```

- [ ] **Step 2: Cut the feature branch and commit the design and plan**

```bash
git checkout -b feat/floating-scenes
git add docs/superpowers
git commit -m "Add design and plan for floating 3D scenes"
```

- [ ] **Step 3: Confirm the baseline is green**

Run: `npm run verify`
Expected: `37/37 passed`

Run: `npm install --no-save playwright-core` then `npm run verify:render`
Expected: every check passes. Note the total (39 at the 17 October audit); later tasks say how many checks they add.

---

### Task 1: Config tables

**Files:**
- Modify: `shared/viz-config.js`
- Test: `verify.mjs` (sections 1 and 2)

**Interfaces:**
- Produces, on `globalThis.TIMBRE`:
  - `VIZ_SCENES: string[]` — effects built on the scene kit. Value: `['thanksgiving-harvest']`.
  - `PLACEMENT_RANGES: { x, y, size }`, each `{ min, max, step, default }`. Values: `x` and `y` are `{ min: -100, max: 100, step: 1, default: 0 }`; `size` is `{ min: 40, max: 200, step: 1, default: 100 }`.
  - `defaultConfig().placement` — `{ x: 0, y: 0, size: 100 }`.
  - `sanitizeConfig` clamps `partial.placement` against `PLACEMENT_RANGES`, ignores non-numbers and unknown keys.
  - `VIZ_USES_3D` gains `'thanksgiving-harvest'`.
  - `DEFAULT_PER_VIZ['thanksgiving-harvest']` — `{ candleGlow: 50, leafDensity: 50, cameraDrift: 50 }`.

- [ ] **Step 1: Write the failing tests**

Add to section 1 of `verify.mjs`:

```js
ok(T.VIZ_SCENES.every((n) => T.VIZ_USES_3D.includes(n)), 'VIZ_SCENES ⊆ VIZ_USES_3D');
ok(T.VIZ_SCENES.includes('thanksgiving-harvest'), 'thanksgiving-harvest is a kit scene');
ok(JSON.stringify(T.DEFAULT_PER_VIZ['thanksgiving-harvest']) === '{"candleGlow":50,"leafDensity":50,"cameraDrift":50}', 'thanksgiving knobs');
ok(JSON.stringify(T.defaultConfig().placement) === '{"x":0,"y":0,"size":100}', 'defaultConfig has placement');
```

Add to section 2:

```js
{
  const c = T.sanitizeConfig({ placement: { x: 999, y: -999, size: 5 } });
  ok(c.placement.x === 100 && c.placement.y === -100 && c.placement.size === 40, 'placement clamps to its ranges');
  const d = T.sanitizeConfig({ placement: { x: '30', bogus: 7 } });
  ok(d.placement.x === 0 && !('bogus' in d.placement), 'placement ignores non-numbers and unknown keys');
  const e = T.sanitizeConfig({ placement: { x: 25 } }, T.sanitizeConfig({ placement: { y: 40, size: 150 } }));
  ok(e.placement.x === 25 && e.placement.y === 40 && e.placement.size === 150, 'placement merges over a base');
  const old = T.sanitizeConfig({ perViz: { 'thanksgiving-harvest': { pumpkinPulse: 80, leafDensity: 20, wheatSway: 10 } } });
  ok(JSON.stringify(old.perViz['thanksgiving-harvest']) === '{"candleGlow":50,"leafDensity":20,"cameraDrift":50}', 'a saved pre-redesign config keeps leafDensity and drops the retired knobs');
}
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run verify`
Expected: the eight new lines show `✗`; the run ends `… FAILED` (or throws on `T.VIZ_SCENES.every`, which also counts).

- [ ] **Step 3: Implement the table changes in `shared/viz-config.js`**

Add `PLACEMENT_RANGES` and `VIZ_SCENES` beside the other tables, export both, fill `cfg.placement` in `defaultConfig` from the ranges' defaults, and add a `placement` branch to `sanitizeConfig` in the style of the `stlObject` branch.

- [ ] **Step 4: Run to verify they pass**

Run: `npm run verify`
Expected: `45/45 passed`

- [ ] **Step 5: Commit**

```bash
git add shared/viz-config.js verify.mjs
git commit -m "Add scene placement config and the Thanksgiving scene's knobs"
```

---

### Task 2: Scene kit arithmetic

**Files:**
- Create: `overlay/scene-kit.js`
- Modify: `overlay/mic-visualizers-300x220.html`, `overlay/mic-visualizers-1440x1080.html`, `overlay/mic-visualizers-1920x1080.html` (one `<script src="scene-kit.js"></script>` each, on the line after `<script src="core.js"></script>` and any inline `SCALE` block, before the first factory)
- Test: `verify.mjs` (new section 5, placed before the live transport section so it runs without the mock)

**Interfaces:**
- Produces, on `globalThis.TimbreScene`:
  - `createEnvelope() → { step(level: number, nowMs: number, dt: number, micOn: boolean) → { level, flame, slow, kick, burst, beat: boolean } }`
  - `fitDistance(frameW: number, frameH: number, fovDeg: number, aspect: number) → number`
  - `afterglowTime(trailVeilPct: number) → number` (seconds)
  - `decay(dt: number, T: number) → [r, g, b]`
  - `renderScale(canvasHeight: number) → number` (integer ≥ 1)
  - `viewOffset(placement: { x, y, size }, w: number, h: number) → { x, y, zoom }`

Values from the spec:

| Function | Rule |
|---|---|
| `step` | `flame` follows `level` at 30/s rising, 3/s falling. `slow` at 0.8/s. An internal average at 2/s. A beat fires when `micOn && level > avg × 1.35 + 0.07` and at least 220 ms have passed since the last one; it sets `kick = 1`, adds 0.3 to `burst` (cap 1) and returns `beat: true` for that step only. `kick` decays at 5/s, `burst` at 0.45/s. Every follow uses `1 - exp(-rate × dt)`; every decay uses `exp(-rate × dt)`. |
| `fitDistance` | `max(frameH / 2, frameW / 2 / aspect) / tan(fov / 2)` |
| `afterglowTime` | linear: 100 → 0.35, 0 → 1.5 |
| `decay` | `r = exp(-dt / T)`, `g = r × exp(-dt / 0.098)`, `b = r × exp(-dt / 0.035)` |
| `renderScale` | the smallest whole number `n ≥ 1` with `canvasHeight × n ≥ 520` |
| `viewOffset` | `x = -(placement.x / 100) × w / 2`, `y = (placement.y / 100) × h / 2`, `zoom = placement.size / 100` |

- [ ] **Step 1: Write the failing tests**

New section in `verify.mjs`:

```js
// ── 5. Scene kit arithmetic (pure; no browser) ───────────────────────────────
console.log('\n[5] scene kit arithmetic');
await import('./overlay/scene-kit.js');
{
  const K = globalThis.TimbreScene;
  const near = (a, b, tol) => Math.abs(a - b) <= tol;

  // Same input, three frame rates: 1 s at 0.8, then 0.5 s of silence.
  const run = (fps) => {
    const env = K.createEnvelope(); let now = 0, out;
    for (let i = 0; i < Math.round(1.5 * fps); i++) { now += 1000 / fps; out = env.step(i < fps ? 0.8 : 0, now, 1 / fps, false); }
    return out;
  };
  const a = run(30), b = run(60), c = run(165);
  ok(near(a.flame, 0.8 * Math.exp(-1.5), 0.02) && near(b.flame, a.flame, 0.02) && near(c.flame, a.flame, 0.02), `flame agrees at 30/60/165 fps (${a.flame.toFixed(3)} ${b.flame.toFixed(3)} ${c.flame.toFixed(3)})`);
  ok(near(a.slow, b.slow, 0.02) && near(b.slow, c.slow, 0.02), 'slow agrees at 30/60/165 fps');

  const env = K.createEnvelope(); let now = 0;
  for (let i = 0; i < 60; i++) { now += 1000 / 60; env.step(0.1, now, 1 / 60, true); }
  now += 1000 / 60; const hit = env.step(0.9, now, 1 / 60, true);
  ok(hit.beat === true && hit.kick === 1 && near(hit.burst, 0.3, 0.01), 'a jump in level fires one beat');
  now += 1000 / 60; const next = env.step(0.9, now, 1 / 60, true);
  ok(next.beat === false, 'the beat flag lasts one step');
  for (let i = 0; i < 6; i++) { now += 1000 / 60; env.step(0.1, now, 1 / 60, true); }
  now += 1000 / 60; ok(env.step(0.95, now, 1 / 60, true).beat === false, 'no second beat inside 220 ms');
  const quiet = K.createEnvelope(); quiet.step(0.1, 16, 1 / 60, false);
  ok(quiet.step(0.9, 32, 1 / 60, false).beat === false, 'no beats without a mic');

  const big = K.createEnvelope(); let o;
  for (let i = 0; i < 50; i++) o = big.step(i % 2 ? 1 : 0, i * 100, 0.1, true);
  ok([o.flame, o.slow, o.kick, o.burst].every((v) => Number.isFinite(v) && v >= 0 && v <= 1), 'envelope survives a 0.1 s step');

  ok(near(K.fitDistance(6.8, 3.1, 30, 2.77), 5.785, 0.01), 'fit: wide canvas is height-limited');
  ok(near(K.fitDistance(6.8, 3.1, 30, 2.0), 6.344, 0.01), 'fit: 2:1 canvas is width-limited');
  ok(near(K.fitDistance(6.8, 3.1, 30, 4 / 3), 9.517, 0.01), 'fit: 4:3 canvas backs off further');
  ok(K.afterglowTime(100) === 0.35 && K.afterglowTime(0) === 1.5 && near(K.afterglowTime(50), 0.925, 1e-9), 'afterglow time from Trail veil');
  const d60 = K.decay(1 / 60, 0.35), d30 = K.decay(1 / 30, 0.35), d165 = K.decay(1 / 165, 0.35);
  ok([0, 1, 2].every((i) => near(d60[i] * d60[i], d30[i], 1e-9)), 'two 60 fps decays equal one 30 fps decay');
  ok(near(d165[1] / d165[0], 0.94, 0.002) && near(d165[2] / d165[0], 0.84, 0.002), 'cooling matches the approved look at 165 Hz');
  ok(K.renderScale(130) === 4 && K.renderScale(170) === 4 && K.renderScale(180) === 3 && K.renderScale(624) === 1 && K.renderScale(1080) === 1, 'internal render scale');
  const v = K.viewOffset({ x: 100, y: -50, size: 200 }, 1728, 624);
  ok(v.x === -864 && v.y === -156 && v.zoom === 2, 'placement to lens shift');
}
```

Add to the per-page loop in section 1:

```js
ok(/<script src="core\.js"><\/script>[\s\S]*<script src="scene-kit\.js"><\/script>[\s\S]*<script src="factories\//.test(pages[f]), `${f} loads scene-kit.js after core.js and before the factories`);
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run verify`
Expected: throws `Cannot find module … overlay/scene-kit.js`.

- [ ] **Step 3: Implement the six functions in `overlay/scene-kit.js` and add the script tag to the three pages**

Use the same wrapper as `shared/viz-config.js`: an IIFE that assigns `globalThis.TimbreScene`.

- [ ] **Step 4: Run to verify they pass**

Run: `npm run verify`
Expected: `63/63 passed`

- [ ] **Step 5: Commit**

```bash
git add overlay/scene-kit.js overlay/mic-visualizers-300x220.html overlay/mic-visualizers-1440x1080.html overlay/mic-visualizers-1920x1080.html verify.mjs
git commit -m "Add scene kit arithmetic: sound envelope, camera fit, decay, placement"
```

---

### Task 3: Scene kit runtime, proven with three candles

**Files:**
- Modify: `overlay/scene-kit.js` (add the runtime below the arithmetic)
- Modify: `overlay/core.js` (one getter on `window.__timbre`)
- Replace: `overlay/factories/thanksgiving-harvest.js` (three candles only in this task)
- Test: `verify-render.mjs`

**Interfaces:**
- Consumes: Task 1's `TIMBRE.VIZ_SCENES` and `config.placement`; Task 2's six functions.
- Produces:
  - `TimbreScene.testLevel: number | null` — test hook. When a number, `readLevel` returns it.
  - `TimbreScene.readLevel(nowMs) → number` — 0 to 1. With a mic: `min(1, max(RMS(waveform) × 3, mean(frequencies[0..5]) / 255 × 1.1) × cfgGain)`. Without one and `cfgIdleAnim` on: `0.26 + 0.2 × sin(now / 900) × sin(now / 2300 + 1)`. Otherwise 0.
  - `TimbreScene.create(def) → handle | null` — `null` when `THREE` is undefined or the renderer cannot be created.
  - `handle: { draw(now, dt), resize(), dispose() }`
  - `TimbreScene.debug() → null | { active: true, renderScale, targetSize: [w, h], targetGeneration, afterglowT, memory: { geometries, textures }, programs, state }` — `targetGeneration` counts how many times the render targets have been created; `state` is the scene's own `def.debug()`.
  - `window.__timbre.scene` — getter returning `TimbreScene.debug()`.
- Scene definition, the contract for all later scenes:

```js
def = {
  frame: { width, height, center: [x, y, z] },  // reference frame, scene units
  fov: 30,                                       // vertical field of view, degrees
  pitch: 14,                                     // degrees the camera looks down
  groundColor: 0x7a6f66,                         // light-catcher albedo (optional)
  build(k) {},                                   // create objects; add them to k.scene
  update(k, audio, now, dt) {},                  // every frame, before rendering
  debug() { return {}; },                        // optional
};
k = {
  THREE, scene, camera,
  orbit: 0,                 // radians; the scene sets it in update() to drift the camera
  keep(obj),                // returns obj; geometry, material or texture, disposed on dispose()
  practical(light),         // returns light; marks it as one the ground sees
  addLight(material),       // returns material; "add colour, leave alpha" blending
  glowTexture(r, g, b),     // soft radial sprite texture, kept
};
```

Runtime facts the tests do not determine:

- **Renderer.** One per page, created on first `create()` with `{ canvas: canvas3d, alpha: true, antialias: true }`, pixel ratio 1, clear colour `(0x000000, 0)`, `autoClear = false`, shadow maps on (`PCFSoftShadowMap`, `autoUpdate = false`), `ACESFilmicToneMapping`, exposure 1.1. `create()` and `dispose()` each call `renderer.resetState()`.
- **Camera.** `position = center + d × (sin(orbit) cos(pitch), sin(pitch), cos(orbit) cos(pitch))`, looking at `center`, with `d = fitDistance(frame.width, frame.height, fov, aspect)`. Placement comes from `viewOffset(timbreConfig.placement, w, h)`, applied with `camera.zoom` and `camera.setViewOffset(w, h, x, y, w, h)` every frame.
- **Layers.** Scene objects and non-practical lights stay on layer 0. The ground (a 60×60 plane at `y = 0`, `receiveShadow`, `addLight` blending) is on layer 1 only. `practical(light)` enables layer 1 on the light.
- **Frame.** Set `shadowMap.needsUpdate = true`. Render layer 0 then layer 1 into a `HalfFloatType` target with `samples: 4`, sized `canvas client size × renderScale(client height)`. Run the afterglow shader into a second target of the same size, reading the previous output from a third; swap those two each frame. Run the output shader to the canvas.
- **Resize.** `resize()` only sets a flag. At the start of the next `draw()` the kit compares the canvas client size with the size its targets have, and only a real difference recreates them and increments `targetGeneration`. `core.js` calls `onResize` several times inside one config push, sometimes with a height that changes and changes back; reconciling at draw time makes all of that free.
- **Output mode.** `TimbreScene.outputMode` is `'added'` (the default, confirmed in OBS 33.0.1) or `'premultiplied'`. In `premultiplied` the output shader raises a light pixel's alpha to its largest colour channel. Nothing sets it; it exists so a future OBS change is a one-line switch for the owner to decide on.
- **Scaling down.** When `renderScale` is above 1, the output pass samples the larger target with linear filtering into the canvas-sized buffer.
- **`addLight`.** `CustomBlending`, `AddEquation`, `blendSrc = SrcAlphaFactor`, `blendDst = OneFactor`, `blendSrcAlpha = ZeroFactor`, `blendDstAlpha = OneFactor`, `transparent = true`, `depthWrite = false`.

Afterglow fragment shader (`uCool` is `decay(dt, afterglowTime(cfgEffectBgOpacity × 100))`):

```glsl
vec4 c = texture2D(uCur, vUv), p = texture2D(uPrev, vUv);
vec3 glow = p.rgb * step(p.a, 0.02) * uCool;   // only light lingers; a hard test, not a blend
gl_FragColor = vec4(mix(max(c.rgb, glow), c.rgb, c.a), c.a);
```

Output fragment shader:

```glsl
gl_FragColor = texture2D(uTex, vUv);
float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x)
           * smoothstep(0.0, 0.20, vUv.y) * smoothstep(1.0, 0.90, vUv.y);
gl_FragColor.rgb *= mix(edge, 1.0, gl_FragColor.a);   // fade light, never objects
if (uPremultiplied > 0.5) gl_FragColor.a = max(gl_FragColor.a, min(1.0, max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b))));
#include <tonemapping_fragment>
#include <colorspace_fragment>
```

Both run on a full-screen quad with `NoBlending` and no depth test. The afterglow material sets `toneMapped: false`.

**The candle stage of the factory.** `frame: { width: 6.8, height: 3.1, center: [-0.4, 0.75, 0.3] }`. Three cream pillar candles (radius 0.13), at `(x, z, height, fall rate, flicker phase)`: `(0.3, -0.75, 1.15, 2.2, 0.0)`, `(2.55, -0.05, 0.8, 3.4, 2.1)`, `(-1.15, 1.55, 0.5, 4.6, 4.3)`. Each has a practical `PointLight` (shadow map 512, starting colour `0xffa040`, intensity `0.8 + 10 × brightness`) 0.16 above the wax, a small bright flame mesh and a glow sprite using `addLight`. Each candle keeps its own follow value: it rises toward `audio.level` at 30/s and falls at its own rate. `brightness = min(1.5, (0.22 + 0.78 × follow) × flicker + 0.35 × kick)`, where flicker is `0.82 + 0.18 × (0.5 + 0.5 × sin(15.3 t + phase) × sin(6.7 t + 2 × phase))` plus a ±2.5% random part redrawn at a fixed 60 times a second. `debug()` returns `{ candles: [brightness × 3], follow: [follow × 3] }`. The wax does not cast shadows.

- [ ] **Step 1: Write the failing checks**

Add a section to `verify-render.mjs` as the **last** thing done with the `wide` page (just before the 1440×1080 block). It stops that page's animation loop part-way through, so nothing after it may rely on `wide` animating by itself.

```js
// ── Scene kit + Thanksgiving (1920×1080 page) ─────────────────────────────
const sceneState = () => wide.evaluate(() => window.__timbre.scene);
// Draw one frame by hand and read the canvas in the same task (the buffer is cleared after compositing).
const probe = () => wide.evaluate(() => {
  currentViz.draw(performance.now(), 1 / 60);
  const c = document.getElementById('vizCanvas3D'), gl = c.getContext('webgl2');
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let solid = 0, light = 0, sx = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] > 250) { solid++; sx += (i / 4) % w; }
    else if (px[i + 3] < 5 && px[i] + px[i + 1] + px[i + 2] > 12) light++;
  }
  return { w, h, solid, light, cornerAlpha: px[3], centroidX: solid ? sx / solid : 0 };
});
const activate = async (name) => { await pushConfig((c) => { c.activeViz = name; }); await wide.waitForFunction((n) => window.__timbre.currentVizName === n, name, { timeout: 5000 }); await wide.waitForTimeout(500); };

await activate('thanksgiving-harvest');
const s0 = await sceneState();
check('scene activates on the WebGL canvas', !!s0 && s0.active === true && await wide.evaluate(() => document.getElementById('vizCanvas3D').style.display !== 'none'));
check('targets are canvas-sized at scale 1', s0.renderScale === 1 && s0.targetSize[0] === 1728 && s0.targetSize[1] === 624, JSON.stringify(s0.targetSize));
const p0 = await probe();
check('scene has solid pixels, added light and a transparent corner', p0.solid > 3000 && p0.light > 20000 && p0.cornerAlpha === 0, JSON.stringify(p0));

await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; c.placement.x = 30; });   // 30% of half of 1728 px is 259
await wide.waitForTimeout(400);
const p1 = await probe();
check('placement.x slides the scene right', p1.centroidX - p0.centroidX > 150, `${p0.centroidX.toFixed(0)} → ${p1.centroidX.toFixed(0)}`);
check('config push does not rebuild targets', (await sceneState()).targetGeneration === s0.targetGeneration);

await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; c.placement.x = -100; c.placement.y = 100; c.placement.size = 200; });
await wide.waitForTimeout(300); await probe();
await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; c.showLabels = false; });
await wide.waitForTimeout(400);
check('a canvas height change resizes the targets', (await sceneState()).targetSize[1] === 816, JSON.stringify((await sceneState()).targetSize));
await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; c.showBorder = false; });
await wide.waitForTimeout(400);
const sb = await sceneState(); await probe();
check('border off refits', sb.targetSize[0] === 1920 && sb.targetSize[1] === 1080, JSON.stringify(sb.targetSize));
await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; c.showBorder = false; c.gain = 110; });
await wide.waitForTimeout(300); await probe();
check('nor with the border off', (await sceneState()).targetGeneration === sb.targetGeneration);
await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; c.effectBgOpacity = 0; });
await wide.waitForTimeout(300); await probe();
check('Trail veil 0 gives a 1.5 s afterglow', (await sceneState()).afterglowT === 1.5);
await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; });
await wide.waitForTimeout(300);
const plain = await probe();
await wide.evaluate(() => { TimbreScene.outputMode = 'premultiplied'; });
const pm = await probe();
await wide.evaluate(() => { TimbreScene.outputMode = 'added'; });
check('premultiplied mode gives light an alpha', pm.light < plain.light / 10, `${plain.light} → ${pm.light}`);

// Frame-rate independence: stop the page's own loop, drive a fixed level by hand.
const stepped = (fps) => wide.evaluate(async (fps) => {
  window.frame = function () {};
  TimbreScene.testLevel = 0;
  setActiveViz('visualizer'); setActiveViz('thanksgiving-harvest');
  let now = performance.now();
  for (let i = 0; i < Math.round(1.5 * fps); i++) { TimbreScene.testLevel = i < fps ? 0.8 : 0; now += 1000 / fps; currentViz.draw(now, 1 / fps); }
  return window.__timbre.scene.state;
}, fps);
await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; });
await wide.waitForTimeout(300);
const f30 = await stepped(30), f60 = await stepped(60);
const want = [2.2, 3.4, 4.6].map((r) => 0.8 * Math.exp(-r * 0.5));
check('candles fall at their own rates, the same at 30 and 60 fps',
  want.every((w, i) => Math.abs(f30.follow[i] - w) < 0.02 && Math.abs(f60.follow[i] - w) < 0.02), JSON.stringify({ want, f30: f30.follow, f60: f60.follow }));

const leakBefore = await wide.evaluate(() => { currentViz.draw(performance.now(), 1 / 60); const s = window.__timbre.scene; return [s.memory.geometries, s.memory.textures, s.programs]; });
const leakAfter = await wide.evaluate(() => { setActiveViz('visualizer'); setActiveViz('thanksgiving-harvest'); currentViz.draw(performance.now(), 1 / 60); const s = window.__timbre.scene; return [s.memory.geometries, s.memory.textures, s.programs]; });
check('re-selecting the scene does not grow GPU resources', JSON.stringify(leakBefore) === JSON.stringify(leakAfter), `${leakBefore} → ${leakAfter}`);

const roseOk = await wide.evaluate(async () => { setActiveViz('rose'); await new Promise((r) => setTimeout(r, 1200)); currentViz.draw(performance.now()); const gl = document.getElementById('vizCanvas3D').getContext('webgl2'); return gl.getError() === 0 && !gl.isContextLost(); });
check('an existing WebGL effect runs cleanly after a scene', roseOk);

const noThree = await wide.evaluate(() => { const T3 = window.THREE; window.THREE = undefined; let threw = false; try { setActiveViz('visualizer'); setActiveViz('thanksgiving-harvest'); currentViz.draw(performance.now(), 1 / 60); } catch { threw = true; } window.THREE = T3; setActiveViz('visualizer'); return threw; });
check('no THREE, no throw', noThree === false);
await wide.evaluate(() => { TimbreScene.testLevel = null; });
check('no page errors from the scene checks', wideErrors.length === 0, wideErrors.join(' | '));
```

And one check on the small page, in the first block (the `page` on the 300×220 layout), before it is switched back to `visualizer`:

```js
await pushConfig((c) => { c.activeViz = 'thanksgiving-harvest'; });
await page.waitForFunction(() => window.__timbre.scene && window.__timbre.scene.active, { timeout: 5000 }).catch(() => {});
const small = await page.evaluate(() => window.__timbre.scene);
check('small page renders the scene at 4× internally', !!small && small.renderScale === 4 && small.targetSize[0] === 1040 && small.targetSize[1] === 520, JSON.stringify(small && small.targetSize));
```

Each `pushConfig` starts from the defaults, so labels are on and that page's canvas is 130 px tall here.

- [ ] **Step 2: Run to verify they fail**

Run: `npm run verify:render`
Expected: `scene activates on the WebGL canvas` fails (`window.__timbre.scene` is undefined), and the checks after it fail or throw.

- [ ] **Step 3: Add the `scene` getter to `window.__timbre` in `overlay/core.js`**

`get scene() { return (typeof TimbreScene !== 'undefined' && TimbreScene.debug) ? TimbreScene.debug() : null; }`

- [ ] **Step 4: Implement `testLevel`, `readLevel`, `create` and `debug` in `overlay/scene-kit.js`**

- [ ] **Step 5: Replace `overlay/factories/thanksgiving-harvest.js` with the three-candle scene**

The factory shape, which every later scene copies:

```js
VIZ_FACTORIES['thanksgiving-harvest'] = function () {
  let scene = null;
  return {
    start() { scene = TimbreScene.create(definition()); },
    stop() { if (scene) scene.dispose(); scene = null; },
    onResize() { if (scene) scene.resize(); },
    draw(now, dt) { if (scene) scene.draw(now, dt); },
  };
};
```

- [ ] **Step 6: Run to verify they pass**

Run: `npm run verify:render`
Expected: every check passes; the total is 16 higher than the Task 0 baseline.

Run: `npm run verify`
Expected: `63/63 passed`

- [ ] **Step 7: Commit**

```bash
git add overlay/scene-kit.js overlay/core.js overlay/factories/thanksgiving-harvest.js verify-render.mjs
git commit -m "Add scene kit runtime and rebuild Thanksgiving as three candles"
```

---

### Task 4: The Thanksgiving scene

**Files:**
- Create: `overlay/scene-parts.js` (shared geometry, loaded after `scene-kit.js` on all three pages)
- Modify: `overlay/factories/thanksgiving-harvest.js`
- Modify: the three overlay pages (one script tag each)
- Test: `verify-render.mjs`, `verify.mjs`

**Interfaces:**
- Consumes: Task 3's `TimbreScene.create`, `k`, and the factory shape.
- Produces, on `TimbreScene.parts`:
  - `pumpkin(THREE, radius: number, lobes: number) → BufferGeometry` — sits on `y = 0`.
  - `leaf(THREE) → BufferGeometry` — flat in the XZ plane, about 0.23 wide and 0.57 long with its stem.
- The scene's `debug()` gains `leafTarget: number` and `falling: number`.

**Shapes** (the spec's descriptions, with the approved numbers):

- **Pumpkin.** Start from a 1-radius sphere with `lobes × 12` by 40 segments. For each vertex with longitude `φ` and polar angle `θ`: `lobe = |cos(φ × lobes / 2)|^0.55`; horizontal radius `= radius × 1.12 × sin(θ)^0.58 × (1 − 0.15 × (1 − lobe) × sin(θ)^0.25)`; height `= sign(cos θ) × |cos θ|^0.8 × 0.8 × (0.9 + 0.1 × lobe) × (1 − 0.22 × exp(−sin²θ / 0.04)) × radius`, then raised by `0.74 × radius` so it rests on the ground.
- **Leaf.** Half-outline points `(x, z)`: `(0.012, −0.3)`, `(0.012, −0.2)`, `(0.07, −0.13)`, `(0.115, −0.02)`, `(0.105, 0.09)`, `(0.06, 0.19)`, `(0, 0.27)`, mirrored in x.
- **Horn.** Centre line for `t` from 0 (tail) to 1 (mouth): `(−2.3(1 − t), 0.08 + 0.87t^1.2 + 0.8(1 − t)^2.4, −0.7(1 − t)²)`. Radius `0.08 + 0.87t^1.2`, modulated ±4% in bands along its length. Double-sided, woven texture repeated about 10 × 18. A torus rim (radius 0.97, tube 0.075) at the mouth. The horn group sits at `(−1.25, 0, −0.35)` turned `−0.22` radians about y.

**Placement** (`x, z` on the ground unless a `y` is given):

| Object | Position | Notes |
|---|---|---|
| Pumpkin, orange `0xe8741a` | (−0.3, 0.3) | radius 0.52, 12 lobes |
| Pumpkin, deep orange `0xc9521a` | (0.75, 0.85) | radius 0.37 |
| Pumpkin, cream `0xe9dcc0` | (1.55, 0.4) | radius 0.27 |
| Apples, radius 0.17, roughness 0.28 | (0.1, 1.25) red, (0.55, 1.6) green, (1.95, 1.2) red, (2.2, 0.55) red, (1.2, −0.75) green | red `0xb01c26`, green `0x8fae2c` |
| Gourd, green `0x7d9426`, standing | (1.0, −0.1) | about 0.87 tall |
| Gourd, yellow `0xdba42a`, lying | (1.75, −0.35), y 0.22 | |
| Corn, `0xeab82e` | (1.1, 1.65) turned 0.5; (−0.55, 1.35) turned −0.8 | 0.67 long, with kernels and a pale husk |
| Grapes, `0x4a2468`, roughness 0.25 | centred (1.42, 1.08) | about 24, radius 0.07, piled |
| Wheat | from the mouth near (−0.95, 0.55, −0.2), fanning to the front right | 7 stalks; each head must read as an ear of grain |
| Ground leaves | 8, scattered over x −4.2 to 3.8, z −1.6 to 2.4 | |

Leaf colours: `0xd9541e`, `0xe8a13a`, `0xb5261e`, `0xc9781f`, `0x8a3b12`, `0xe0c040`.

**Lights that are not candles** (not practical): a directional rim `0x8fa6ff`, intensity 1.6, from `(−3, 5, −6)`; a directional fill `0xffe2c0`, 0.5, from `(2, 3, 6)`; ambient `0x6a5648`, 1.1. Candle colours: `0xffa040`, `0xff9438`, `0xffac50`.

**Behaviour:**

- `g = candleGlow / 50`. Candle brightness becomes `min(1.5, (0.22 + 0.78 × follow × g) × flicker + 0.35 × kick × g)`.
- `leafTarget = min(38, round((4 + 16 × flame + 18 × burst) × leafDensity / 50))`. Falling leaves beyond the target finish their fall and are not respawned. A leaf falls at 0.45 to 0.95 units/s from about y 4.2, sways and tumbles, and scales to nothing over its last third of a unit.
- On a step where `audio.beat` is true, every falling leaf gets one sideways velocity between −1 and +2.5 units/s, which decays at 1.5/s.
- `k.orbit = sin(0.2 t) × 0.26 × cameraDrift / 50`.
- The wax's glow near the flame, the flame's height and the glow sprite's size and opacity all follow that candle's brightness.

Fix the two rough spots the spec names: the wheat must not read as crossed sticks, and the corn must show kernels. Do not otherwise change the look.

- [ ] **Step 1: Write the failing checks**

In the scene section of `verify-render.mjs`, after the frame-rate check:

```js
check('falling-leaf count is the same at 30 and 60 fps', Math.abs(f30.leafTarget - f60.leafTarget) <= 1, `${f30.leafTarget} vs ${f60.leafTarget}`);
const knobs = await wide.evaluate(() => {
  window.frame = function () {};
  const run = (leafDensity, candleGlow) => {
    perViz['thanksgiving-harvest'].leafDensity = leafDensity; perViz['thanksgiving-harvest'].candleGlow = candleGlow;
    TimbreScene.testLevel = 0.8; setActiveViz('visualizer'); setActiveViz('thanksgiving-harvest');
    let now = performance.now(); for (let i = 0; i < 60; i++) { now += 1000 / 60; currentViz.draw(now, 1 / 60); }
    return window.__timbre.scene.state;
  };
  const none = run(0, 50), full = run(100, 50), steady = run(50, 0);
  perViz['thanksgiving-harvest'].leafDensity = 50; perViz['thanksgiving-harvest'].candleGlow = 50; TimbreScene.testLevel = null;
  return { none: none.leafTarget, full: full.leafTarget, steady: steady.candles };
});
check('Leaf density 0 stops the fall; 100 doubles it', knobs.none === 0 && knobs.full >= 30, JSON.stringify(knobs));
check('Candle glow 0 holds the candles at ember level', knobs.steady.every((b) => b > 0.15 && b < 0.3), JSON.stringify(knobs.steady));
const full = await probe();
check('the full scene covers far more of the canvas than three candles', full.solid > 60000, String(full.solid));
```

In the mic-denied block (the `dpage`), which has no microphone:

```js
await dpage.evaluate(() => { cfgIdleAnim = false; setActiveViz('thanksgiving-harvest'); });
await dpage.waitForTimeout(1500);
const silent = await dpage.evaluate(() => window.__timbre.scene && window.__timbre.scene.state);
check('silent scene keeps its embers', !!silent && silent.candles.every((b) => b > 0.15 && b < 0.3) && silent.leafTarget === 4, JSON.stringify(silent));
```

In silence the formula gives its baseline of four leaves. That is the approved look; do not add a rule that stops them.

In `verify.mjs`, extend the page-order check from Task 2 to require `scene-parts.js` between `scene-kit.js` and the factories.

- [ ] **Step 2: Run to verify they fail**

Run: `npm run verify:render`
Expected: the five new checks fail (`leafTarget` is undefined; `solid` is a few thousand).

- [ ] **Step 3: Implement `TimbreScene.parts.pumpkin` and `.leaf` in `overlay/scene-parts.js`; add its script tag to the three pages**

- [ ] **Step 4: Build the full scene in `overlay/factories/thanksgiving-harvest.js`**

- [ ] **Step 5: Run to verify they pass**

Run: `npm run verify:render`
Expected: every check passes; the total is 5 higher than after Task 3.

Run: `npm run verify`
Expected: `63/63 passed`

- [ ] **Step 6: Look at it**

Run: `npm start`, open `http://127.0.0.1:7474/timbre-overlay/mic-visualizers-1920x1080.html` in a browser **only if nothing else is using port 7474** (on the owner's machine Streamer.bot is; use `SB_HTTP_PORT=7478 SB_WS_PORT=8092 npm start` and add `?sbport=8092`). Select the effect from the control page on the same ports. Compare against the description in the spec: horn showing both mouth and body, three candles out of step, leaves falling, light pools with real shadows, no hard edge to the light.

- [ ] **Step 7: Commit**

```bash
git add overlay/scene-parts.js overlay/factories/thanksgiving-harvest.js overlay/mic-visualizers-300x220.html overlay/mic-visualizers-1440x1080.html overlay/mic-visualizers-1920x1080.html verify-render.mjs verify.mjs
git commit -m "Build the Thanksgiving cornucopia scene"
```

---

### Task 5: Scene placement in the control panel

**Files:**
- Modify: `control/control.html` (by Node patch script; see Global Constraints)
- Test: `verify-render.mjs` (the control-panel block)

**Interfaces:**
- Consumes: `TIMBRE.VIZ_SCENES`, `TIMBRE.PLACEMENT_RANGES`, `cfg.placement`.
- Produces: a `<div id="scenePlacement" hidden>` holding an `<h2>Scene placement</h2>` and three slider rows with input ids `place-x`, `place-y`, `place-size`, labelled "Left-right", "Up-down" and "Size %". It is visible exactly when `VIZ_SCENES` includes the active effect. It sits directly after the existing `#stlKnobs` group.

- [ ] **Step 1: Write the failing checks**

In the control-panel block of `verify-render.mjs`, after the existing `waveform` checks:

```js
check('placement group is hidden for a non-scene effect', await ctlPage.evaluate(() => document.getElementById('scenePlacement').hidden === true));
await ctlPage.selectOption('#activeViz', 'thanksgiving-harvest');
check('placement group shows for a scene', await ctlPage.evaluate(() => document.getElementById('scenePlacement').hidden === false));
await ctlPage.evaluate(() => { const e = document.getElementById('place-x'); e.value = '40'; e.dispatchEvent(new Event('input', { bubbles: true })); });
const placed = await new Promise((res) => {
  const t0 = Date.now();
  const iv = setInterval(() => {
    const hit = observed.find((m) => m.type === 'timbre:config' && m.config && m.config.placement && m.config.placement.x === 40);
    if (hit || Date.now() - t0 > 5000) { clearInterval(iv); res(!!hit); }
  }, 100);
});
check('moving Left-right pushes placement.x', placed);
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run verify:render`
Expected: the three new checks fail (`scenePlacement` is null).

- [ ] **Step 3: Add the group to `control/control.html`**

Build the rows with the existing `sliderRow` helper from `T.PLACEMENT_RANGES`, register each row's `refresh` in `refreshers`, and toggle the group's `hidden` in `renderVizKnobs` beside the `stlKnobs` line.

- [ ] **Step 4: Run to verify they pass**

Run: `npm run verify:render`
Expected: every check passes; the total is 3 higher than after Task 4.

- [ ] **Step 5: Commit**

```bash
git add control/control.html verify-render.mjs
git commit -m "Add scene placement sliders to the control panel"
```

---

### Task 6: Documentation, performance and the OBS look

**Files:**
- Modify: `docs/EFFECTS.md`, `CHANGELOG.md`, `verify.mjs` (header comment), `verify-render.mjs` (header comment, one check)

- [ ] **Step 1: Add a performance check to `verify-render.mjs`**

In the scene section, after the full-scene check:

```js
const cost = await wide.evaluate(() => { let now = performance.now(), acc = 0; for (let i = 0; i < 120; i++) { now += 1000 / 60; const t = performance.now(); currentViz.draw(now, 1 / 60); acc += performance.now() - t; } return acc / 120; });
check(`draw() averages under 4 ms (${cost.toFixed(2)} ms)`, cost < 4);
```

Run: `npm run verify:render`
Expected: every check passes; the total is 1 higher than after Task 5. The approved throwaway scene measured 2.6 ms on the owner's machine. If the real scene is over 4 ms, the first thing to try is turning off shadows on the short front candle.

- [ ] **Step 2: Write the docs**

- `docs/EFFECTS.md`: a section "Kit scenes (floating 3D)" after "3D STL effects". It must state: the factory shape from Task 3; the `def` and `k` contract; the rule that light uses `k.addLight` and practical lights use `k.practical`; that everything is per second and computed from `dt`; the reference-frame rule (size 100 fits the frame in any canvas); and registration (add the id to `VIZ_SCENES` and `VIZ_USES_3D`). Also change "to **both** overlay HTML pages" in the Registration section to "to all three overlay HTML pages".
- `CHANGELOG.md`, under `[Unreleased]`: an **Added** entry for the scene kit and the Scene placement settings, and a **Changed** entry saying Thanksgiving Harvest is now a 3D scene, that its knobs are Candle glow, Leaf density and Camera drift, and that Pumpkin pulse and Wheat sway are gone.
- The header comments of `verify.mjs` and `verify-render.mjs`: add the new sections to their lists.

- [ ] **Step 3: Run both suites**

Run: `npm run verify` — Expected: `63/63 passed`
Run: `npm run verify:render` — Expected: every check passes, 25 more than the Task 0 baseline

- [ ] **Step 4: Commit**

```bash
git add docs/EFFECTS.md CHANGELOG.md verify.mjs verify-render.mjs
git commit -m "Document kit scenes and the Thanksgiving redesign"
```

- [ ] **Step 5: Hand the OBS look to the owner**

This step is the owner's, not the implementer's. Ask them to select Thanksgiving Harvest in the real control dock and look at it in OBS on the 16:9 page full-screen and on the 4:3 page at corner size, over a bright source and a dark one, and to try the three placement sliders. Record what they report. Do not merge the branch before this is done.

---

## Out of scope

The other 17 scenes, the Bars & Waves afterglow, audio-capture changes, moving the 12 existing WebGL effects onto the kit, and the findings of the 17 October and 10 November audits beyond the seven fixes committed in Task 0.
