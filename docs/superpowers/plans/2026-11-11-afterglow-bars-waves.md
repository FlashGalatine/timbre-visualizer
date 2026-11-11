# Afterglow for the Bar and Wave Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Six 2D effects leave a dimmer, fading copy of each loud moment, and the two waveform effects become smooth glowing lines.

**Architecture:** One new file, `overlay/afterglow.js`, holds the pure arithmetic (fade rule, bar-ghost bookkeeping, echo trigger, smooth-curve path) as a global `TimbreGlow` that also loads under Node. Each of the six factories calls it from `draw(now, dt)` and draws its own ghosts behind its live shape. One new config key, `afterglow` (seconds), is shown in the control dock only for these six effects.

**Tech Stack:** Plain classic `<script>` files, 2D canvas, no build step. Tests: `node verify.mjs` (Node only) and `node verify-render.mjs` (playwright-core driving system Edge/Chrome against `mock-sb-server.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-11-afterglow-bars-waves-design.md`. Read it before any task; where this plan and the spec disagree, the spec wins.

## Global Constraints

- No build step, no new dependency. `overlay/afterglow.js` must be valid as both a classic script and an ES module, and touch no `document`, `window`, `ctx` or `core.js` global at load time (the pattern at the top of `overlay/scene-kit.js`).
- Ghosts are redrawn every frame from remembered values. Never fade the previous frame's pixels.
- All timing comes from `draw(now, dt)`: `now` in milliseconds, `dt` in seconds. Never count frames.
- The ghost is always drawn before (behind) the live shape. Ceilings: bar ghost `0.42`, bar tip copy `0.63`, echo stroke `0.6`, echo fill `0.07`, each times the ghost's strength.
- Fade rule: strength 1 for the first 15% of `T`; then `(1 − (age − 0.15·T) / (0.85·T))²`; 0 at `age ≥ T`.
- `afterglow` is seconds, range 0 to 4, step 0.1, default 1.6. 0 means off.
- No new ghosts while `micActive` is false. Ghosts reset only when the effect is re-created or the bar count, sample count or canvas size actually changes, detected at draw time. Never reset in `onResize`.
- The live bars of the four bar effects must draw exactly as they do today. `spectrogram`, `pulse-rings` and the ribbon in `sine-bars` are not touched.
- Tests use the side ports already in the suites (7476 and 8090). Never connect anything to ports 7474 or 8080.
- Change `control/control.html` only with a small Node patch script (write it, run it, delete it). Do not use an editor tool that auto-previews the file: the preview connects to a live Streamer.bot.
- The repo is public. Nothing private goes in it. Do not copy code from outside the repo.
- Baseline before Task 1: `npm run verify` prints `63/63 passed`, `npm run verify:render` prints `69/69 passed` (needs `npm install --no-save playwright-core` once).

## Review Focus

Conditions the spec implies that are most likely to bite, each pinned by a test in the task named:

1. **A config push while ghosts are showing** (any slider moved, this one included) must not wipe them, although `core.js` calls `onResize` on every push. Task 3, check "a config push does not wipe ghosts".
2. **The Bars count changed mid-ghost** must not leave ghosts at the old bar positions or throw. Task 3, check "changing the Bars count starts again".
3. **Gain at 200%** pushes loudness to 2. The echo trigger must behave as at 1. Task 2, check "echoes: gain at 200% changes nothing".
4. **The source was hidden and comes back** (`now` jumps by seconds, `dt` is capped at 0.1). Nothing may linger or go negative. Task 2, check "echoes: none left after a long gap".
5. **Mic lost while a loud shape is showing.** The drop to idle must not be recorded as a ghost. Tasks 3 to 6, check "no ghost while the mic is off".

---

## File map

| File | Change | Responsibility |
|---|---|---|
| `shared/viz-config.js` | modify | `afterglow` key, `AFTERGLOW_RANGE`, `VIZ_AFTERGLOW` |
| `overlay/core.js` | modify | `cfgAfterglow` global, set in `applyConfig` |
| `control/control.html` | modify (Node script) | "Afterglow" group with one slider |
| `overlay/afterglow.js` | create | `TimbreGlow`: `fade`, `createBarGhosts`, `createEchoes`, `trace`, the ceilings |
| `overlay/mic-visualizers-{300x220,1440x1080,1920x1080}.html` | modify | load `afterglow.js` after `scene-parts.js` |
| `overlay/factories/{visualizer,sine-bars,ring-bars,peak-hold}.js` | modify | bar ghosts; Peak Hold's marker in seconds |
| `overlay/factories/{waveform,ring-waveform}.js` | rewrite `draw` | smooth line and echoes |
| `verify.mjs`, `verify-render.mjs` | modify | tests below |
| `docs/EFFECTS.md`, `CHANGELOG.md`, `README.md` | modify | Task 7 |

---

### Task 1: The `afterglow` setting, end to end

**Files:**
- Modify: `shared/viz-config.js`, `overlay/core.js`, `control/control.html`
- Test: `verify.mjs` (sections 1 and 2), `verify-render.mjs` (control-panel block, after the "moving Left-right pushes placement.x" check)

**Interfaces:**
- Produces: `TIMBRE.VIZ_AFTERGLOW` (array of six names), `TIMBRE.AFTERGLOW_RANGE = { min: 0, max: 4, step: 0.1, default: 1.6 }`, `config.afterglow` (number), the `core.js` global `cfgAfterglow` (seconds), DOM ids `afterglowGroup` and `afterglow`.

`git show 647a448 d3e2088` shows every place the `placement` setting touched. `afterglow` needs the same places, as a single number instead of a group.

- [ ] **Step 1: Write the failing config tests** in `verify.mjs`, next to the `VIZ_SCENES` and placement checks:

```js
ok(JSON.stringify(T.VIZ_AFTERGLOW) === '["visualizer","peak-hold","ring-bars","sine-bars","waveform","ring-waveform"]', 'the six afterglow effects');
ok(T.VIZ_AFTERGLOW.every((n) => T.ACTIVE_VIZ_NAMES.includes(n) && !T.VIZ_USES_3D.includes(n)), 'afterglow effects are known 2D effects');
ok(T.defaultConfig().afterglow === 1.6 && !('afterglow' in T.TOP_RANGES), 'afterglow defaults to 1.6 s and is not a global slider');
ok(T.sanitizeConfig({ afterglow: 9 }).afterglow === 4 && T.sanitizeConfig({ afterglow: -1 }).afterglow === 0, 'afterglow is clamped to 0..4');
ok(T.sanitizeConfig({ afterglow: 'long' }).afterglow === 1.6, 'a non-number afterglow is ignored');
ok(T.sanitizeConfig({ gain: 50 }, T.sanitizeConfig({ afterglow: 2.5 })).afterglow === 2.5, 'afterglow survives a merge');
```

- [ ] **Step 2: Run** `npm run verify`. Expected: the six new checks fail, everything else passes.

- [ ] **Step 3: Implement in `shared/viz-config.js`.** Add `VIZ_AFTERGLOW` and `AFTERGLOW_RANGE`, set `cfg.afterglow` in `defaultConfig`, accept it in `sanitizeConfig` only when `typeof partial.afterglow === 'number'` (clamped), and export both tables on `globalThis.TIMBRE`.

- [ ] **Step 4: Implement in `overlay/core.js`.** `let cfgAfterglow = 1.6;` beside `cfgEffectBgOpacity`, and `cfgAfterglow = cfg.afterglow;` in `applyConfig`.

- [ ] **Step 5: Run** `npm run verify`. Expected: `69/69 passed`.

- [ ] **Step 6: Write the failing control-panel tests** in `verify-render.mjs`, right after the placement checks. At that point the control page has `thanksgiving-harvest` selected and `observed` collects broadcasts:

```js
check('afterglow group is hidden for another effect', await ctlPage.evaluate(() => document.getElementById('afterglowGroup').hidden === true));
await ctlPage.selectOption('#activeViz', 'ring-bars');
check('afterglow group shows for one of the six', await ctlPage.evaluate(() => document.getElementById('afterglowGroup').hidden === false));
await ctlPage.evaluate(() => { const e = document.getElementById('afterglow'); e.value = '3'; e.dispatchEvent(new Event('input', { bubbles: true })); });
const glowPushed = await new Promise((res) => {
  const t0 = Date.now();
  const iv = setInterval(() => {
    const hit = observed.find((m) => m.type === 'timbre:config' && m.config && m.config.afterglow === 3);
    if (hit || Date.now() - t0 > 5000) { clearInterval(iv); res(!!hit); }
  }, 100);
});
check('moving Afterglow pushes afterglow', glowPushed);
check('the overlay takes the afterglow setting', await page.waitForFunction(() => cfgAfterglow === 3, { timeout: 5000 }).then(() => true).catch(() => false));
```

The lines after this block put the shared mock state back; make sure they also leave `afterglow` at its default (they push a default config, so check rather than assume).

- [ ] **Step 7: Run** `npm run verify:render`. Expected: the four new checks fail.

- [ ] **Step 8: Patch `control/control.html` with a Node script.** Add `<div id="afterglowGroup" hidden><h2>Afterglow</h2><div id="afterglowRows"></div></div>` after the `scenePlacement` div; build one `sliderRow('afterglow', 'Afterglow (seconds)', T.AFTERGLOW_RANGE, () => cfg.afterglow, (v) => { cfg.afterglow = v; })` into `afterglowRows` and register its `refresh`; set `$('afterglowGroup').hidden = !T.VIZ_AFTERGLOW.includes(cfg.activeViz);` in `renderVizKnobs`. Check how `sliderRow` displays a 0.1 step (the 3D-model group has a 0.05-step slider with a formatter) and show one decimal.

- [ ] **Step 9: Run** `npm run verify:render`. Expected: `73/73 passed`.

- [ ] **Step 10: Commit**

```bash
git add shared/viz-config.js overlay/core.js control/control.html verify.mjs verify-render.mjs
git commit -m "Add the afterglow setting and its control panel slider"
```

---

### Task 2: `TimbreGlow`, the shared arithmetic

**Files:**
- Create: `overlay/afterglow.js`
- Modify: the three `overlay/mic-visualizers-*.html` pages (one `<script src="afterglow.js"></script>` after `scene-parts.js`)
- Test: `verify.mjs`, new section 6 placed after section 5

**Interfaces (produced; Tasks 3 to 6 rely on these exactly):**

```
TimbreGlow.BAR = 0.42, .BAR_TIP = 0.63, .ECHO = 0.6, .ECHO_FILL = 0.07, .MAX_ECHOES = 6

TimbreGlow.fade(ageSec, T) → number 0..1
    // 1 when ageSec < 0; 0 when T <= 0 or ageSec >= T

TimbreGlow.createBarGhosts() → {
  sync(key),                       // forget everything if key differs from the last key given
  step(i, height, nowMs, T, record) → [{ lo, hi, strength }]
      // bookkeeping for bar i, then its strips: nearest the live bar first, tallest/oldest last.
      // lo..hi are heights in the caller's own units. [] when T <= 0 (and bar i is forgotten).
      // record false: no new ghost is added this frame (old ones still fade).
}

TimbreGlow.createEchoes() → {
  sync(key),
  step(loudness, nowMs, dt, T, record, snapshot) → [{ shape, strength, born }]   // oldest first
      // snapshot: () => any. Called whenever this frame is the loudest of the current burst;
      // its return value becomes the echo's `shape`. [] when T <= 0 (and all is forgotten).
      // record false: nothing is tracked or frozen this frame (old echoes still fade).
}

TimbreGlow.trace(ctx, xs, ys, closed)
    // Adds a smooth curve through the points to ctx's current path. Open: moveTo the first
    // point, a quadratic through each inner point to the midpoint with the next, lineTo the
    // last point. Closed: moveTo the midpoint of last and first, a quadratic through every
    // point to the midpoint with the next (wrapping), closePath. Never begins or strokes.
```

Bar-ghost bookkeeping, per bar, in this order: forget ghosts with height ≤ the live height; if the previous frame's height was greater than the live height and `record` is true, add `{ height: previous, born: nowMs }`; forget ghosts with age ≥ `T`. The strip for a ghost runs from the next lower ghost's height (or the live height) up to its own, at that ghost's strength.

Echo trigger (spec section "Echoes"): clamp loudness to 0..1; `follower = max(loudness, follower × exp(−dt / 0.15))`; armed → track the follower's peak and call `snapshot()` whenever loudness exceeds the burst's loudest so far; when peak > 0.1 and follower < 0.6 × peak, freeze the snapshot as an echo unless the last echo is younger than `T / 6` seconds, then disarm either way; disarmed → track the follower's low and re-arm when it rises 0.08 above it. Drop echoes at age ≥ `T`.

- [ ] **Step 1: Write the failing tests** as a new section in `verify.mjs`, after section 5, and add it to the header comment:

```js
// ── 6. Afterglow arithmetic (pure; no browser) ───────────────────────────────
console.log('\n[6] afterglow arithmetic');
await import('./overlay/afterglow.js');
{
  const G = globalThis.TimbreGlow;
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  ok(G.fade(0, 2) === 1 && G.fade(0.3, 2) === 1 && near(G.fade(1.15, 2), 0.25, 1e-9) && G.fade(2, 2) === 0 && G.fade(5, 2) === 0, 'fade: holds 15%, eases out, ends at T');
  ok(G.fade(-1, 2) === 1 && G.fade(0.1, 0) === 0, 'fade: a negative age is full strength, T of 0 is off');

  const g = G.createBarGhosts();
  g.step(0, 100, 0, 2, true);
  let s = g.step(0, 20, 100, 2, true);
  ok(s.length === 1 && s[0].lo === 20 && s[0].hi === 100 && s[0].strength === 1, 'bars: a drop leaves a ghost at the old height');
  g.step(0, 60, 600, 2, true);
  s = g.step(0, 20, 700, 2, true);
  ok(s.length === 2 && s[0].lo === 20 && s[0].hi === 60 && s[1].lo === 60 && s[1].hi === 100 && s[0].strength > s[1].strength, 'bars: a lower later peak sits in front, brighter');
  ok(g.step(0, 100, 800, 2, true).length === 0, 'bars: rising past the ghosts clears them');
  g.step(0, 20, 900, 2, true);
  ok(g.step(0, 20, 2900, 2, true).length === 0, 'bars: ghosts are gone at T');
  g.step(1, 50, 0, 2, false);
  ok(g.step(1, 10, 100, 2, false).length === 0, 'bars: nothing is recorded while the mic is off');
  const off = G.createBarGhosts(); off.step(0, 100, 0, 0, true);
  ok(off.step(0, 20, 100, 0, true).length === 0, 'bars: afterglow 0 keeps no ghosts');
  const k = G.createBarGhosts(); k.sync('20:1728:624'); k.step(0, 100, 0, 2, true); k.step(0, 20, 100, 2, true);
  k.sync('20:1728:624');
  ok(k.step(0, 20, 200, 2, true).length === 1, 'bars: sync with the same key keeps ghosts');
  k.sync('8:1728:624');
  ok(k.step(0, 20, 300, 2, true).length === 0, 'bars: sync with a new key starts again');
  // The sound changes every 33 ms whatever the frame rate: loud for 1 s, then quiet.
  const runBars = (fps) => { const b = G.createBarGhosts(); let out = [];
    for (let i = 1; i <= Math.round(1.5 * fps); i++) { const t = i / fps; out = b.step(0, Math.floor(t / 0.033) * 0.033 < 1 ? 100 : 20, t * 1000, 2, true); }
    return out; };
  const [b30, b60, b165] = [30, 60, 165].map(runBars);
  ok([b30, b60, b165].every((x) => x.length === 1 && x[0].hi === 100) && near(b30[0].strength, b60[0].strength, 0.05) && near(b60[0].strength, b165[0].strength, 0.05), 'bars: the same ghost at 30/60/165 fps');

  const runEchoes = (amp, fps, secs, T = 1.6, record = true) => { const e = G.createEchoes(); const born = new Set(); let most = 0, last = [];
    for (let i = 1; i <= Math.round(secs * fps); i++) { const t = i / fps; const a = amp(Math.floor(t / 0.033) * 0.033);
      last = e.step(a, t * 1000, 1 / fps, T, record, () => a); for (const x of last) born.add(x.born); most = Math.max(most, last.length); }
    return { count: born.size, most, last }; };
  const sudden = (t) => (t % 1 < 0.4 ? 0.8 : 0.02);
  const ramp = (t) => (t % 1 < 0.4 ? 0.8 * ((t % 1) / 0.4) : 0.02);
  const fast = (t) => (t % 0.2 < 0.1 ? 0.8 : 0.05);
  ok([30, 60, 165].every((f) => runEchoes(sudden, f, 10).count === 10), 'echoes: one per sudden burst at 30/60/165 fps');
  ok([30, 60, 165].every((f) => runEchoes(ramp, f, 10).count === 10), 'echoes: one per ramped burst at 30/60/165 fps');
  ok(runEchoes((t) => sudden(t) * 2.5, 60, 10).count === 10, 'echoes: gain at 200% changes nothing');
  ok(runEchoes(fast, 60, 20, 4).most <= G.MAX_ECHOES && runEchoes(fast, 165, 20, 1.6).most <= G.MAX_ECHOES, 'echoes: never more than six alive');
  ok(runEchoes(sudden, 60, 10, 1.6, false).count === 0, 'echoes: none while the mic is off');
  ok(runEchoes(sudden, 60, 10, 0).count === 0, 'echoes: afterglow 0 makes none');
  const shaped = runEchoes(ramp, 60, 0.7);
  ok(shaped.last.length === 1 && shaped.last[0].shape > 0.7 && shaped.last[0].strength > 0, 'echoes: the frozen shape is the loudest frame of the burst');
  // 0.9 s: one burst and its echo, ending in quiet. Then the source is hidden for 10 s.
  const e = G.createEchoes(); let before = [];
  for (let i = 1; i <= 54; i++) before = e.step(sudden(i / 60), i * 1000 / 60, 1 / 60, 1.6, true, () => 1);
  ok(before.length === 1 && e.step(0, 900 + 10000, 0.1, 1.6, true, () => 1).length === 0, 'echoes: none left after a long gap');
  const e2 = G.createEchoes(); e2.sync('64:1728:624'); for (let i = 1; i <= 36; i++) e2.step(sudden(i / 60), i * 1000 / 60, 1 / 60, 1.6, true, () => 1);
  e2.sync('32:1728:624');
  ok(e2.step(0, 620, 1 / 60, 1.6, true, () => 1).length === 0, 'echoes: sync with a new key starts again');

  const calls = []; const mock = { moveTo: (...a) => calls.push(['M', ...a]), lineTo: (...a) => calls.push(['L', ...a]), quadraticCurveTo: (...a) => calls.push(['Q', ...a]), closePath: () => calls.push(['Z']) };
  G.trace(mock, [0, 10, 20, 30], [5, 15, 5, 15], false);
  ok(calls[0].join() === 'M,0,5' && calls.filter((c) => c[0] === 'Q').length === 2 && calls.at(-1).join() === 'L,30,15', 'trace: an open curve starts and ends on the end samples');
  calls.length = 0; G.trace(mock, [0, 10, 10, 0], [0, 0, 10, 10], true);
  ok(calls[0].join() === 'M,0,5' && calls.filter((c) => c[0] === 'Q').length === 4 && calls.at(-1)[0] === 'Z', 'trace: a closed curve rounds every sample and closes');

  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const at = html.indexOf('src="afterglow.js"');
    ok(at > html.indexOf('src="scene-parts.js"') && at < html.indexOf('src="factories/'), `${p} page loads afterglow.js before the factories`);
  }
}
```

- [ ] **Step 2: Run** `npm run verify`. Expected: it stops at the import of `./overlay/afterglow.js` (file not found).

- [ ] **Step 3: Create `overlay/afterglow.js`** with the interface above, and add the script tag to the three pages.

- [ ] **Step 4: Run** `npm run verify`. Expected: `94/94 passed`.

- [ ] **Step 5: Commit**

```bash
git add overlay/afterglow.js overlay/mic-visualizers-300x220.html overlay/mic-visualizers-1440x1080.html overlay/mic-visualizers-1920x1080.html verify.mjs
git commit -m "Add afterglow arithmetic: fade, bar ghosts, echoes, smooth curve"
```

---

### Task 3: Bar ghosts on `visualizer`, `sine-bars` and `ring-bars`

**Files:**
- Modify: `overlay/factories/visualizer.js`, `overlay/factories/sine-bars.js`, `overlay/factories/ring-bars.js`
- Test: `verify-render.mjs`, a new "afterglow" section on the `wide` page (1728×624), placed immediately before the scene-kit section (which must stay the last thing done with `wide`)

**Interfaces:**
- Consumes: `TimbreGlow.createBarGhosts`, `.BAR`, `.BAR_TIP`, `cfgAfterglow`.
- Produces: the test helpers `glowRun` and `glowChecks` below, which Tasks 4 to 7 reuse.

In each factory: create one `createBarGhosts()` per factory instance; change `draw()` to `draw(now)`; each frame call `ghosts.sync(count + ':' + W + ':' + H)`; for each bar call `step(i, height, now, cfgAfterglow, micActive && !!frequencies)` with the same stepped height the live bar uses, draw the returned strips, then draw the live bar unchanged.

- **`visualizer`**: each strip is a `fillRect` from `H − hi` to `H − lo` in the bar's colour at `BAR × strength`. The last strip (tallest) also gets the tip: `STEP` tall at its top, in the tip colour, at `BAR_TIP × strength`.
- **`sine-bars`**: the same, with both opacities multiplied by the live bar's own (0.55 for the body, 0.9 for the tip). The ribbon code is not touched.
- **`ring-bars`**: the height is the spoke's stepped `len`. For each strip, continue the live spoke's row of squares (`r` from `INNER_R + lo` while `r < INNER_R + hi`, step `STEP`) at `BAR × strength`; the last strip also gets the tip square at `INNER_R + hi` at `BAR_TIP × strength`.

Use `ctx.globalAlpha` for the ghost and set it back to 1 before the live shape.

- [ ] **Step 1: Add the helpers and the failing checks** to `verify-render.mjs`:

```js
// Drive one effect with a scripted sound, stepping draw() by hand inside ONE evaluate so the
// 33 ms capture timer cannot overwrite the arrays in between. One reading per step.
const glowRun = (pg, name, steps, fps = 60) => pg.evaluate(({ name, steps, fps }) => {
  currentViz = VIZ_FACTORIES[name](); if (currentViz.start) currentViz.start();
  const f = new Uint8Array(32), w = new Uint8Array(64), out = [];
  let now = performance.now();
  for (const s of steps) {
    if (s.config) applyConfig(s.config);
    f.fill(Math.round(s.level * 255));
    for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * s.level * 127);
    frequencies = f; waveform = w; micActive = s.mic !== false;
    for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) { now += 1000 / fps; currentViz.draw(now, 1 / fps); }
    const d = ctx.getImageData(0, 0, W, H).data; let ink = 0, alpha = 0, top = -1;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) { ink++; alpha += d[i]; if (top < 0) top = Math.floor(i / 4 / W); }
    out.push({ ink, alpha, top });
  }
  return out;
}, { name, steps, fps });

// The four checks every afterglow effect must pass. slack: live pixels that legitimately
// differ from the quiet baseline (Peak Hold's marker). tweak: extra config for this effect.
async function glowChecks(pg, name, { maxGhostAlpha, slack = 0, tweak } = {}) {
  const T = 1;
  const set = async (seconds) => {
    await pushConfig((c) => { c.activeViz = name; c.afterglow = seconds; c.idleAnim = false; if (tweak) tweak(c); });
    await pg.waitForFunction(({ n, s }) => window.__timbre.currentVizName === n && cfgAfterglow === s, { n: name, s: seconds });
  };
  const loudThenQuiet = [{ secs: 0.5, level: 0 }, { secs: 0.3, level: 0.8 }, { secs: 0.15, level: 0 }];
  await set(T);
  const [q, , d, a, , m] = await glowRun(pg, name, [...loudThenQuiet, { secs: T + 0.2, level: 0 }, { secs: 0.3, level: 0.8 }, { secs: 0.15, level: 0, mic: false }]);
  const ghostPx = d.ink - q.ink;
  check(`${name}: a drop leaves a dimmer ghost`, ghostPx > 1000 && (d.alpha - q.alpha) / ghostPx < maxGhostAlpha, `${ghostPx} px, mean alpha ${((d.alpha - q.alpha) / ghostPx).toFixed(0)}`);
  check(`${name}: the ghost is gone after the afterglow time`, Math.abs(a.ink - q.ink) <= slack, `${q.ink} → ${a.ink}`);
  check(`${name}: no ghost while the mic is off`, Math.abs(m.ink - q.ink) <= slack, `${q.ink} → ${m.ink}`);
  await set(0);
  const [q0, , d0] = await glowRun(pg, name, loudThenQuiet);
  check(`${name}: afterglow 0 leaves no ghost`, Math.abs(d0.ink - q0.ink) <= slack, `${q0.ink} → ${d0.ink}`);
}

// ── Afterglow (bar and wave effects), on the 16:9 page ──
for (const name of ['visualizer', 'sine-bars', 'ring-bars']) await glowChecks(wide, name, { maxGhostAlpha: 135 });
await pushConfig((c) => { c.activeViz = 'visualizer'; c.afterglow = 2; c.idleAnim = false; });
await wide.waitForFunction(() => window.__timbre.currentVizName === 'visualizer' && cfgAfterglow === 2);
const [gq, , gd, gp, gb1, gb2] = await glowRun(wide, 'visualizer', [
  { secs: 0.5, level: 0 }, { secs: 0.3, level: 0.8 }, { secs: 0.15, level: 0 },
  { secs: 0.1, level: 0, config: { gain: 100 } },
  { secs: 0.1, level: 0, config: { bars: 8 } }, { secs: 2.2, level: 0 },
]);
check('a config push does not wipe ghosts', gp.ink - gq.ink > (gd.ink - gq.ink) * 0.8, `${gd.ink - gq.ink} → ${gp.ink - gq.ink} ghost px`);
check('changing the Bars count starts again', gb1.ink === gb2.ink, `${gb1.ink} vs ${gb2.ink}`);
```

`maxGhostAlpha: 135` is `0.42 × 255` plus room for the tip strip. If `micActive`, `frequencies`, `waveform`, `currentViz`, `ctx`, `W` or `H` cannot be reached by name from `evaluate`, check how `core.js` declares them before changing the helper.

- [ ] **Step 2: Run** `npm run verify:render`. Expected: every new "a drop leaves a dimmer ghost" check fails (no ghost pixels) and "a config push does not wipe ghosts" fails; the rest pass.

- [ ] **Step 3: Implement the three factories** as described above.

- [ ] **Step 4: Run** `npm run verify:render`. Expected: `87/87 passed`. Also run `npm run verify`: `94/94 passed`.

- [ ] **Step 5: Commit**

```bash
git add overlay/factories/visualizer.js overlay/factories/sine-bars.js overlay/factories/ring-bars.js verify-render.mjs
git commit -m "Add bar ghosts to Bars, Sine Bars and Ring Bars"
```

---

### Task 4: `peak-hold`: ghost bars and a marker timed in seconds

**Files:**
- Modify: `overlay/factories/peak-hold.js`
- Test: `verify-render.mjs`, afterglow section

**Interfaces:**
- Consumes: `TimbreGlow.createBarGhosts`, `.BAR`, `cfgAfterglow`, `glowRun`, `glowChecks`.

Ghosts: as `visualizer`, without the tip copy.

Marker, replacing `PEAK_HOLD_FRAMES` and the per-frame fall. Per bar keep `{ y, heldUntil }`:

- If the live bar's top `y` is at or above the marker (`y <= peak.y`): `peak.y = y; peak.heldUntil = now + 300`.
- Otherwise, once `now >= peak.heldUntil`: `peak.y = min(H − PEAK_THICKNESS, peak.y + (12 + 1.08 × fallSpeed) × SCALE × dt)`.

So the marker holds for 0.3 s after the last frame the bar reached it. It is drawn as today, and works with the afterglow on or off. `draw` becomes `draw(now, dt)`.

- [ ] **Step 1: Add the failing checks** after Task 3's:

```js
// The marker is live, not a ghost: allow its pixels (one thin strip per bar) as slack, and
// let it land before the "gone" reading by using the fastest fall.
await glowChecks(wide, 'peak-hold', { maxGhostAlpha: 135, slack: 1728 * 12, tweak: (c) => { c.perViz['peak-hold'].fallSpeed = 100; } });
await pushConfig((c) => { c.activeViz = 'peak-hold'; c.afterglow = 0; c.idleAnim = false; });   // fallSpeed 50
await wide.waitForFunction(() => window.__timbre.currentVizName === 'peak-hold' && cfgAfterglow === 0);
const peakRun = (fps) => glowRun(wide, 'peak-hold', [{ secs: 0.3, level: 0.8 }, { secs: 0.25, level: 0 }, { secs: 0.5, level: 0 }], fps);
const [l60, h60, f60] = await peakRun(60);
const [, , f30] = await peakRun(30);
check('peak-hold: the marker holds for 0.3 s', h60.top === l60.top, `${l60.top} → ${h60.top}`);
// 0.75 s after the drop: 0.45 s of falling at (12 + 1.08 × 50) × 4.8 = 316.8 px/s = 142.6 px.
check('peak-hold: the marker falls at the same speed at 30 and 60 fps', Math.abs(f60.top - l60.top - 142.6) <= 16 && Math.abs(f30.top - f60.top) <= 16, `60 fps ${f60.top - l60.top} px, 30 fps ${f30.top - l60.top} px`);
```

- [ ] **Step 2: Run** `npm run verify:render`. Expected: "a drop leaves a dimmer ghost" and both marker checks fail for `peak-hold`.

- [ ] **Step 3: Implement** `overlay/factories/peak-hold.js`.

- [ ] **Step 4: Run** `npm run verify:render`. Expected: `93/93 passed`.

- [ ] **Step 5: Commit**

```bash
git add overlay/factories/peak-hold.js verify-render.mjs
git commit -m "Add ghost bars to Peak Hold and time its marker in seconds"
```

---

### Task 5: `waveform` as a smooth line with echoes

**Files:**
- Modify: `overlay/factories/waveform.js` (the body of the factory is replaced)
- Test: `verify-render.mjs`, afterglow section

**Interfaces:**
- Consumes: `TimbreGlow.createEchoes`, `.trace`, `.ECHO`, `.ECHO_FILL`, `cfgAfterglow`, `glowChecks`.

`draw(now, dt)`, in this order (spec sections "The line" and "Echoes" hold every number):

1. Clear. Build `xs[i] = (i / (n − 1)) × W` and `ys[i] = MID − sample × MID`, clamped to `[LW, H − LW]`, with `LW = max(1.5, 2.2 × SCALE)` and no snapping. Sample values and the idle and silent cases are computed exactly as today. Loudness is the largest `|sample|`.
2. Build the nine-stop horizontal gradient from the palette. Draw the faint centre line as today.
3. `echoes.sync(n + ':' + W + ':' + H)`, then `echoes.step(loudness, now, dt, cfgAfterglow, micActive && !!waveform, () => Float32Array.from(ys))`. For each echo, oldest first: its fill to the centre line at `ECHO_FILL × strength`, then its stroke at `0.8 × LW` and `ECHO × strength`, in the current gradient, with no shadow.
4. The live line: fill to the centre line at 0.12; stroke at `LW` with `shadowBlur = 8 × SCALE` in the palette colour at the middle of the gradient; then the core, white at 0.7, `0.35 × LW`, no shadow.

Every path is `ctx.beginPath(); TimbreGlow.trace(ctx, xs, ys, false);`, with `lineTo(W, MID); lineTo(0, MID); closePath()` added for a fill. Round joins and caps. Reset `globalAlpha` and `shadowBlur` before returning.

- [ ] **Step 1: Add the failing check** after Task 4's:

```js
await glowChecks(wide, 'waveform', { maxGhostAlpha: 165 });
```

(`165` is `0.6 × 255` plus room for edge blending. The echo's wide faint fill pulls the real mean far below it.)

- [ ] **Step 2: Run** `npm run verify:render`. Expected: `waveform: a drop leaves a dimmer ghost` fails.

- [ ] **Step 3: Implement** `overlay/factories/waveform.js`.

- [ ] **Step 4: Run** `npm run verify:render`. Expected: `97/97 passed`. An earlier check in the file switches to `waveform` and expects pixels; it must still pass.

- [ ] **Step 5: Commit**

```bash
git add overlay/factories/waveform.js verify-render.mjs
git commit -m "Redraw Waveform as a smooth line with fading echoes"
```

---

### Task 6: `ring-waveform` as a smooth ring with echoes

**Files:**
- Modify: `overlay/factories/ring-waveform.js`
- Test: `verify-render.mjs`, afterglow section

**Interfaces:**
- Consumes: the same as Task 5.

As Task 5, with these differences:

- Points are `(CX + cos(angle) × r, CY + sin(angle) × r)` with `r = BASE_R + sample × AMPLITUDE`, as today but without `snap()`. `GRID`, `snap` and `drawSteppedLine` are deleted.
- Every path is closed: `TimbreGlow.trace(ctx, xs, ys, true)`.
- The nine-stop gradient runs around the ring instead of across the page: `ctx.createConicGradient(-Math.PI / 2, CX, CY)` with the same nine palette stops. The colour jumps where the ring closes at the top, as the stepped ring's colours did.
- The live ring keeps its guide circle, its 10% fill (now the smooth closed path), its centre square and highlight, and the Amplitude knob.
- An echo's shape is `{ xs, ys }`, both copied. It is stroked at `0.8 × LW` and `ECHO × strength`, with no fill.
- The sync key also carries the amplitude knob: `n + ':' + W + ':' + H + ':' + perViz['ring-waveform'].amplitude`.

- [ ] **Step 1: Add the failing check:**

```js
await glowChecks(wide, 'ring-waveform', { maxGhostAlpha: 165 });
```

- [ ] **Step 2: Run** `npm run verify:render`. Expected: `ring-waveform: a drop leaves a dimmer ghost` fails.

- [ ] **Step 3: Implement** `overlay/factories/ring-waveform.js`.

- [ ] **Step 4: Run** `npm run verify:render`. Expected: `101/101 passed`. The existing check that a ring effect stays inside the 1728×624 canvas must still pass.

- [ ] **Step 5: Commit**

```bash
git add overlay/factories/ring-waveform.js verify-render.mjs
git commit -m "Redraw Ring Waveform as a smooth ring with fading echoes"
```

---

### Task 7: Speed check, documentation, and the owner's look

**Files:**
- Modify: `verify-render.mjs` (one check and the "Covered" header comment), `docs/EFFECTS.md`, `CHANGELOG.md`, `README.md`

- [ ] **Step 1: Add the speed check** at the end of the afterglow section:

```js
await pushConfig((c) => { c.activeViz = 'visualizer'; c.afterglow = 1.6; c.idleAnim = false; });
await wide.waitForFunction(() => cfgAfterglow === 1.6);
const costs = await wide.evaluate((names) => names.map((name) => {
  currentViz = VIZ_FACTORIES[name](); if (currentViz.start) currentViz.start();
  const f = new Uint8Array(32), w = new Uint8Array(64); frequencies = f; waveform = w; micActive = true;
  let now = performance.now(); const t0 = performance.now();
  for (let k = 0; k < 300; k++) {
    const level = k % 30 < 15 ? 0.8 : 0;                       // loud and quiet, a quarter second each
    f.fill(level * 255); for (let i = 0; i < 64; i++) w[i] = 128 + Math.round(Math.sin(i * 0.4) * level * 127);
    now += 1000 / 60; currentViz.draw(now, 1 / 60);
  }
  return [name, (performance.now() - t0) / 300];
}), T.VIZ_AFTERGLOW);
check('afterglow effects draw in under 0.5 ms', costs.every(([, ms]) => ms < 0.5), costs.map(([n, ms]) => `${n} ${ms.toFixed(3)}`).join(', '));
```

- [ ] **Step 2: Run** `npm run verify:render`. Expected: `102/102 passed`. If only this check fails, report the six numbers; do not raise the limit.

- [ ] **Step 3: Document.**
  - `docs/EFFECTS.md`: a section "Afterglow (bar and wave effects)" covering what `TimbreGlow` offers (the Task 2 interface), the rules an effect must follow to use it (draw ghosts first, use `now` and `dt`, `sync` at draw time, never reset in `onResize`, no new ghosts while the mic is off), and how to add an effect to `VIZ_AFTERGLOW`. Add `afterglow` to the wire-format section. Note in the contract section that `draw` receives `(now, dt)`.
  - `CHANGELOG.md`, under `[Unreleased]`: **Added** the afterglow and its setting; **Changed** Waveform and Ring Waveform are now smooth lines (the stepped look is gone), and Peak Hold's marker is timed in seconds and scaled to the page, so it falls faster than before on the two large pages.
  - `README.md`: correct any description of these six effects that the change makes untrue.

- [ ] **Step 4: Run both suites.** Expected: `npm run verify` → `94/94 passed`; `npm run verify:render` → `102/102 passed`.

- [ ] **Step 5: Commit**

```bash
git add verify-render.mjs docs/EFFECTS.md CHANGELOG.md README.md
git commit -m "Document the afterglow and check its cost"
```

- [ ] **Step 6: The owner's look.** This step is the owner's, not the implementer's. Ask them to look at the six effects in OBS over a bright and a dark source, talking and with music, and to try the Afterglow slider at 0, 1.6 and 4. The echoes in particular need their eye: the rule was corrected after they chose it. Record what they report. Do not merge the branch before this is done.
