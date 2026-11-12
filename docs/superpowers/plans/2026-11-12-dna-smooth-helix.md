# Smooth DNA Helix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pixelated `dna` effect with a smooth glowing double helix that follows the voice, shatters into pieces on a yell or a mic thump, and reassembles after a calm wait.

**Architecture:** One new file, `overlay/helix.js`, holds everything that is plain arithmetic (the shatter threshold, the three sound levels, the whole / pieces / returning state machine with the motion of the pieces, the return curve, a seedable random source) as a global `TimbreHelix` that also loads under Node. `overlay/factories/dna.js` is rewritten to own the geometry and the drawing and to ask `TimbreHelix` what state it is in. `overlay/audio-capture.js` gains one measurement, `micPeak`, the loudest sample across each 33 ms interval.

**Tech Stack:** Plain classic `<script>` files, 2D canvas, no build step. Tests: `node verify.mjs` (Node only) and `node verify-render.mjs` (playwright-core driving system Edge/Chrome against `mock-sb-server.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-12-dna-smooth-helix-design.md`. Read it before any task; where this plan and the spec disagree, the spec wins.

## Global Constraints

- Work in a git worktree, never in the main checkout: Streamer.bot serves the main checkout to the owner's live OBS.
- No build step, no new dependency. `overlay/helix.js` must be valid as both a classic script and an ES module, and touch no `document`, `window`, `ctx` or `core.js` global at load time (the pattern at the top of `overlay/afterglow.js`).
- Every frame is cleared and redrawn from remembered state. Never fade the previous frame's pixels.
- Everything that moves uses `draw(now, dt)`: `now` in milliseconds, `dt` in seconds. Never count frames. Colour alone reads `Date.now()`, with the same `colorT` expression as `overlay/factories/visualizer.js`.
- A shatter is judged on the raw peak level, never multiplied by Gain.
- Calm means no peak: the mic is off, or the peak level is below the threshold. Talking is calm.
- A config push must change nothing about the helix's state. `core.js` calls `onResize` on every push; detect a real size change by comparing `W` and `H` at draw time.
- Smooth curves only. No snapping to a grid.
- The effect keeps the name `dna`. No change to `ACTIVE_VIZ_NAMES`, and none expected to `control/control.html`. If a control change turns out to be needed, make it with a small Node patch script (write it, run it, delete it); do not use an editor tool that auto-previews the file, because the preview connects to a live Streamer.bot.
- Tests use the side ports already in the suites (7476 and 8090). Never connect anything to ports 7474 or 8080.
- The repo is public. Nothing private goes in it. The throwaway version named in the spec's Reference section is outside the repo: read it for the look, do not copy it in.
- Baseline before Task 1: `npm run verify` prints `101/101 passed`, `npm run verify:render` prints `108/108 passed` (needs `npm install --no-save playwright-core` once). Each task says how many checks it adds.

## Review Focus

Conditions the spec implies that are most likely to bite, each pinned by a test in the task named:

1. **Talking straight after a shatter.** The owner keeps talking; the helix must still come back. Task 3, check "talking after a shatter still returns".
2. **A long yell.** Ten seconds of continuous peaks must not empty the frame or line the pieces up on its edges. Task 3, check "the pieces stay inside; a long yell spreads them".
3. **A slider moved while in pieces** (a config push, which calls `onResize`). The pieces must not jump or reset. Task 5, check "a config push leaves the pieces alone".
4. **The source hidden and shown again while in pieces** (`now` jumps by seconds, `dt` is capped at 0.1). The helix must resume whole, not hang in pieces or finish a stale return. Task 3, check "a size change and a gap resume whole"; Task 5, check "a hidden source comes back whole".
5. **`micPeak` missing** (the mic was denied, or an older capture file is cached in OBS). The helix must still draw, and still shatter from `waveform` when there is one. Task 5, check "falls back to the waveform peak".

---

## File map

| File | Change | Responsibility |
|---|---|---|
| `shared/viz-config.js` | modify | `shatterSensitivity`, `reconnectSeconds`, `PER_VIZ_MAX.dna` |
| `overlay/core.js` | modify | `micPeak` global and its `window.__timbre` getter |
| `overlay/audio-capture.js` | modify | measure `micPeak` on each tick |
| `overlay/helix.js` | create | `TimbreHelix`: threshold, levels, state machine and piece motion, return curve, seedable random |
| `overlay/mic-visualizers-{300x220,1440x1080,1920x1080}.html` | modify | load `helix.js` after `afterglow.js` |
| `overlay/factories/dna.js` | rewrite | helix geometry, drawing, cutting into pieces, sparks |
| `verify.mjs`, `verify-render.mjs` | modify | tests below |
| `docs/EFFECTS.md`, `CHANGELOG.md` | modify | Task 6 |

---

### Task 1: The two new settings

**Files:**
- Modify: `shared/viz-config.js` (`DEFAULT_PER_VIZ`, `PER_VIZ_MAX`)
- Test: `verify.mjs` (section 2), `verify-render.mjs` (control-panel block, after the "the overlay takes the afterglow setting" check and before the afterglow slider is put back)

**Interfaces:**
- Produces: `perViz.dna = { helixFreq: 50, shatterSensitivity: 50, reconnectSeconds: 3 }`; `T.PER_VIZ_MAX.dna = { reconnectSeconds: 10 }`. The control panel builds the sliders by itself, with input ids `pv-dna-helixFreq`, `pv-dna-shatterSensitivity`, `pv-dna-reconnectSeconds`.

- [ ] **Step 1: Write the failing tests.** In `verify.mjs` section 2 (3 checks):

```js
ok(JSON.stringify(T.defaultConfig().perViz.dna) === JSON.stringify({ helixFreq: 50, shatterSensitivity: 50, reconnectSeconds: 3 }), 'dna defaults: helixFreq 50, shatterSensitivity 50, reconnectSeconds 3');
{
  const c = T.sanitizeConfig({ perViz: { dna: { shatterSensitivity: 250, reconnectSeconds: 99 } } });
  ok(c.perViz.dna.shatterSensitivity === 100 && c.perViz.dna.reconnectSeconds === 10, 'dna knobs clamp: sensitivity to 100, reconnect to 10');
  const old = T.sanitizeConfig({ perViz: { dna: { helixFreq: 80 } } });   // a config saved before this change
  ok(old.perViz.dna.helixFreq === 80 && old.perViz.dna.shatterSensitivity === 50 && old.perViz.dna.reconnectSeconds === 3, 'an old saved dna config gains the new defaults');
}
```

In `verify-render.mjs` (2 checks), following the pattern of the afterglow slider checks beside it:

```js
await ctlPage.selectOption('#activeViz', 'dna');
check('DNA shows its three sliders', await ctlPage.evaluate(() =>
  ['Helix Freq', 'Shatter Sensitivity', 'Reconnect Seconds'].every((t) => [...document.querySelectorAll('#perVizKnobs label')].some((l) => l.textContent === t))
  && document.getElementById('pv-dna-reconnectSeconds').max === '10'));
await ctlPage.evaluate(() => { const e = document.getElementById('pv-dna-reconnectSeconds'); e.value = '7'; e.dispatchEvent(new Event('input', { bubbles: true })); });
check('moving Reconnect Seconds reaches the overlay', await page.waitForFunction(() => window.__timbre.config.perViz.dna.reconnectSeconds === 7, { timeout: 5000 }).then(() => true).catch(() => false));
```

Then put the value back to 3 and wait for the push, the way the afterglow value is put back.

- [ ] **Step 2: Run** `npm run verify` and `npm run verify:render`. Expected: the five new checks fail, nothing else does.
- [ ] **Step 3: Add the keys** to `DEFAULT_PER_VIZ.dna` and `PER_VIZ_MAX`.
- [ ] **Step 4: Run both suites.** Expected: `104/104 passed` and `110/110 passed`.
- [ ] **Step 5: Commit** `git commit -m "Add the DNA shatter and reconnect settings"`

---

### Task 2: `micPeak`, the loudest moment of each interval

**Files:**
- Modify: `overlay/core.js` (beside `let waveform = null;`, and in `window.__timbre`), `overlay/audio-capture.js`
- Test: `verify-render.mjs` (fake-mic block, after the "frequencies" wait; mic-denied block, after the "MIC DENIED" check)

**Interfaces:**
- Produces: script-scope `let micPeak = null;` in `core.js`. A number 0 to 1 while the mic is captured: the largest `|sample − 128| / 127` over a window covering the whole sample interval, clamped to 1. `null` whenever `waveform` is `null`. Also `window.__timbre.micPeak`.

- [ ] **Step 1: Write the failing tests** (2 checks):

```js
check('micPeak is a level between 0 and 1 while listening', await page.waitForFunction(
  () => typeof window.__timbre.micPeak === 'number' && window.__timbre.micPeak > 0 && window.__timbre.micPeak <= 1, { timeout: 5000 }).then(() => true).catch(() => false));
// in the mic-denied block:
check('micPeak is null with no mic', await dpage.evaluate(() => window.__timbre.micPeak === null));
```

- [ ] **Step 2: Run** `npm run verify:render`. Expected: both fail (`micPeak` is `undefined`).
- [ ] **Step 3: Implement.** In `acquire()`, connect a second `AnalyserNode` to the same source. Its `fftSize` is the smallest power of two that is at least `audioCtx.sampleRate × SAMPLE_MS / 1000` samples, never under 256 nor over 32768 (2048 at 48 kHz). On each tick read its time-domain bytes into a buffer allocated once per acquire, and set `micPeak`. `teardownStream()` sets `micPeak = null` and drops the analyser. `frequencies`, `waveform` and the first analyser are untouched.
- [ ] **Step 4: Run both suites.** Expected: `104/104 passed` and `112/112 passed`.
- [ ] **Step 5: Commit** `git commit -m "Measure the mic's loudest moment across each sample interval"`

---

### Task 3: `TimbreHelix`, the arithmetic

**Files:**
- Create: `overlay/helix.js`
- Modify: the three overlay pages (one `<script src="helix.js"></script>` line straight after `afterglow.js`)
- Test: `verify.mjs`, a new section 7 placed after section 6, plus its line in the header comment

**Interfaces:**
- Produces `globalThis.TimbreHelix`:

| Member | Meaning |
|---|---|
| `threshold(sensitivity) → number` | `Infinity` for `sensitivity ≤ 0`; 1.0 at 1 (and anything between 0 and 1); straight line to 0.90 at 50; straight line to 0.50 at 100. |
| `peakOf(samples) → number` | Largest `|v − 128| / 127`, clamped to 1. `0` for `null` or empty. |
| `levels(frequencies, waveform, gain) → { loud, low, high }` | `loud = min(1, peakOf(waveform) × 1.5 × gain)`; `low = min(1, mean(f[0..1]) / 255 × 1.3 × gain)`; `high = min(1, mean(f[2..10]) / 255 × 3 × gain)`. All 0 for `null` inputs. |
| `twist(loud) → number` | `0.7 + 5.8 × loud`, radians per second. |
| `radius(level) → number` | `12 + 22 × level`, before `SCALE`. |
| `follow(current, target, dt, tau) → number` | `current + (target − current) × (1 − exp(−dt / tau))`. |
| `returnShare(u, lag) → { e, heat }` | `u` is 0 to 1 through the return, `lag` 0.6 to 1. For `u < 0.78`: `e = 0.72 × ease(min(1, u / (0.78 × lag)))`, `heat = 0`, with `ease(t) = t²(3 − 2t)`. Otherwise `v = (u − 0.78) / 0.22`, `e = 0.72 + 0.28v³`, `heat = 0.8v³`. `e` is the share of the way home. |
| `rng(seed) → () => number` | A seeded generator (0 to 1) for a finite `seed`; `Math.random` otherwise. |
| `createShatter({ random }) → machine` | See below. `random` defaults to `Math.random`. |
| `RETURN_S`, `MIN_CALM_S`, `REARM_S`, `JOSTLE_GAP_S`, `GAP_MS` | `1.5`, `0.3`, `0.4`, `0.6`, `1000`. |

The machine:

| Member | Meaning |
|---|---|
| `state` | `'whole'`, `'pieces'` or `'returning'`. |
| `pieces` | `null` while whole. Otherwise the array `cut()` returned. The machine writes `ox`, `oy` (offset from home, px), `rot` (radians) and `heat` (0 to 1) on each piece every step; the caller draws a piece at `(cx + ox, cy + oy)`. |
| `step({ now, dt, live, peak, threshold, reconnectS, W, H, scale, cut }) → event` | Advances one frame. `cut()` is called only at the moment of a shatter and returns the pieces, each with at least `cx` and `cy` (home centre, px). Returns `'shatter'`, `'jostle'`, `'return'`, `'whole'` (a return finished), `'reset'` (became whole with no animation) or `null`. |
| `reset()` | Whole at once; drops the pieces. |

Rules for `step`, in this order:

1. If the state is not whole and either `W` or `H` differs from the previous step's, or `now` is more than `GAP_MS` after the previous step's: `reset()`, return `'reset'`.
2. A **peak** is `live && peak >= threshold`.
3. **Whole:** count the time whole. On a peak after at least `REARM_S` whole: take `cut()`; if it is empty stay whole; otherwise blast at strength 1, calm count 0, state `'pieces'`, return `'shatter'`.
4. **Pieces:** on a peak at least `JOSTLE_GAP_S` after the last blast or jostle, jostle at strength 0.4 and return `'jostle'`. Calm count: 0 on any peak frame, otherwise `+= dt`. Move the pieces. When the calm count reaches `max(MIN_CALM_S, reconnectS)`: record where each piece is, give it a `lag` of `0.6 + 0.4 × random()`, state `'returning'`, return `'return'`.
5. **Returning:** on a peak, blast at strength 0.7 from where the pieces are, calm count 0, state `'pieces'`, return `'jostle'`. Otherwise advance by `dt / RETURN_S` and place each piece with `returnShare` (offset and rotation scaled by `1 − e`, rotation taken the short way round). At 1: `pieces = null`, state `'whole'`, time whole 0, return `'whole'`.

Motion of the pieces (the spec allows tuning these until the containment checks pass; report any number you change):

| Quantity | Value |
|---|---|
| Blast speed | `(30 + 90 × random()) × scale × strength` px/s, added to the piece's velocity |
| Blast direction | strength 1 and 0.7: away from the axis, `atan2((y − H/2) + (random() − 0.5) × 44 × scale, (x − W/2) × 0.25 + (random() − 0.5) × 34 × scale)`. Strength 0.4 (a jostle): any direction, `random() × 2π`. |
| Spin | `(random() − 0.5) × 9 × strength` rad/s added |
| Slow-down | velocity and spin decay with a time constant of 0.38 s |
| Lasting drift | `(2 + 4 × random()) × scale` px/s along the blast direction, and `(random() − 0.5) × 0.7` rad/s; replaced on each blast or jostle |
| Heat | 1 on a blast or jostle, decaying with a time constant of 0.35 s |
| Keeping in the frame | margin `8 × scale`. Past it on any side: move the piece back toward the margin by `1 − exp(−dt / 0.3)` of the overshoot, point that axis of its lasting drift inward, and if its velocity on that axis still points outward multiply it by `exp(−dt / 0.08)`. |

- [ ] **Step 1: Write the failing tests** in `verify.mjs` section 7 (22 checks). Shared helpers:

```js
await import('./overlay/helix.js');
const HX = globalThis.TimbreHelix;
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const cutFor = (W, H, scale) => () => Array.from({ length: 120 }, (_, i) => ({ cx: (i + 0.5) / 120 * W, cy: H / 2 + (i % 2 ? 1 : -1) * 34 * scale * Math.sin(i) }));
// script: [{ secs, peak, live = true, reconnectS, W, H, jump }]; returns the events with their times in seconds
function runHelix(fps, script, o = {}) {
  const W = o.W ?? 1728, H = o.H ?? 624, scale = o.scale ?? 4.8;
  const m = o.machine ?? HX.createShatter({ random: HX.rng(o.seed ?? 1) });
  let now = 0, minInside = 1; const events = [];
  for (const s of script) {
    if (s.jump) now += s.jump * 1000;
    for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) {
      now += 1000 / fps;
      const e = m.step({ now, dt: 1 / fps, live: s.live !== false, peak: s.peak, threshold: o.threshold ?? 0.9,
        reconnectS: s.reconnectS ?? o.reconnectS ?? 3, W: s.W ?? W, H: s.H ?? H, scale, cut: cutFor(W, H, scale) });
      if (e) events.push({ e, t: now / 1000 });
      if (m.pieces) minInside = Math.min(minInside, m.pieces.filter((p) => p.cx + p.ox >= 0 && p.cx + p.ox <= W && p.cy + p.oy >= 0 && p.cy + p.oy <= H).length / m.pieces.length);
    }
  }
  return { events, minInside, m };
}
const shape = (r) => r.events.map((x) => x.e).join(',');
const at = (r, i) => r.events[i] ? r.events[i].t : NaN;
const quiet = { secs: 1, peak: 0.3 }, hit = { secs: 0.1, peak: 0.95 };
```

The checks, by name and assertion:

| Check | Assertion |
|---|---|
| threshold: off at 0 | `HX.threshold(0) === Infinity` |
| threshold: 1, 50, 75, 100 | `near(HX.threshold(1), 1) && near(HX.threshold(50), 0.9) && near(HX.threshold(75), 0.7) && near(HX.threshold(100), 0.5)` |
| peakOf: silence, half, clipped, none | `peakOf` of 64 bytes of 128 is 0; with one byte at 192 it is `near(…, 64/127)`; with one byte at 0 it is exactly 1; `peakOf(null) === 0` |
| levels: silence is zero | all three 0 for zeroed arrays, and for `null` arrays |
| levels: low and high read their own bins | frequencies with only bins 0 and 1 at 255 → `low === 1 && high === 0`; only bins 2 to 10 at 255 → `low === 0 && high === 1`; bins 11 to 31 at 255 → both 0 |
| levels: Gain scales loudness and clamps | waveform peak 64/127 → `near(loud, 64/127 × 1.5)` at gain 1, `loud === 1` at gain 2, and `peakOf` of the same waveform unchanged |
| twist and radius at the ends | `near(HX.twist(0), 0.7) && near(HX.twist(1), 6.5) && HX.radius(0) === 12 && HX.radius(1) === 34` |
| follow is frame-rate independent | stepping `follow(0, 1, dt, 0.2)` for 0.5 s at 30 and at 165 fps agree within `1e-6`, and equal `1 − exp(−2.5)` within `1e-6` |
| returnShare: ends and the hand-over | `returnShare(0, 1).e === 0`; `near(returnShare(0.78, 1).e, 0.72)`; `returnShare(1, 1)` is `e` 1 (within `1e-12`), `heat` 0.8; `returnShare(0.5, 1).heat === 0` |
| returnShare never goes backward | for `lag` 0.6 and 1, `e` is non-decreasing over `u = 0, 0.01, … 1` |
| rng: seeded runs repeat | two `rng(7)` generators give the same first 5 numbers, all in `[0, 1)`; `rng(undefined) === Math.random` |
| one peak: shatter, return, whole | `runHelix(60, [quiet, hit, { secs: 6, peak: 0.3 }])` → `shape === 'shatter,return,whole'`, times within 0.07 of 1.0, 4.1, 5.6, and `m.state === 'whole' && m.pieces === null` |
| the same at 30 and 165 fps | the same script at both rates gives the same shape and the same three times within 0.07 |
| talking never shatters | `runHelix(60, [{ secs: 60, peak: 0.7 }]).events.length === 0` |
| talking after a shatter still returns | `[quiet, hit, { secs: 6, peak: 0.7 }]` → `'shatter,return,whole'`, return within 0.07 of 4.1 |
| a peak in pieces restarts the wait | `[quiet, hit, { secs: 2, peak: 0.3 }, hit, { secs: 6, peak: 0.3 }]` → `'shatter,jostle,return,whole'`, return within 0.07 of 6.2 |
| a peak during the return scatters again | `[quiet, hit, { secs: 3.5, peak: 0.3 }, hit, { secs: 6, peak: 0.3 }]` → `'shatter,return,jostle,return,whole'`, second return within 0.07 of 7.7 |
| mic off in pieces returns | `[quiet, hit, { secs: 6, peak: 0.95, live: false }]` → `'shatter,return,whole'` |
| sensitivity 0 never shatters; reconnect 0 waits 0.3 s | with `threshold: Infinity`, `[{ secs: 5, peak: 1 }]` gives no events; with `reconnectS: 0`, `[quiet, hit, { secs: 3, peak: 0.3 }]` returns within 0.07 of 1.4 |
| a new reconnect time applies to the running wait | `[quiet, hit, { secs: 1, peak: 0.3, reconnectS: 10 }, { secs: 3, peak: 0.3, reconnectS: 1 }]` → return within 0.07 of 2.1 |
| a size change and a gap resume whole | `[quiet, hit, { secs: 0.5, peak: 0.3 }, { secs: 0.1, peak: 0.3, H: 816 }]` ends `'shatter,reset'` with `m.state === 'whole'`; `[quiet, hit, { secs: 0.5, peak: 0.3 }, { secs: 0.1, peak: 0.3, jump: 5 }]` likewise |
| the pieces stay inside; a long yell spreads them | at `(260, 130, 1)` and `(1728, 624, 4.8)`, with `reconnectS: 100`: `[quiet, hit, { secs: 10, peak: 0.3 }]` and `[quiet, { secs: 10, peak: 0.95 }]` both give `minInside >= 0.9`; and after the second run fewer than half the pieces are within `16 × scale` of the top or bottom edge |

Add to section 7 the page-order check, in the style of section 6's: all three overlay pages load `helix.js` after `afterglow.js` and before the first `factories/` script (1 more check, 23 in all).

- [ ] **Step 2: Run** `npm run verify`. Expected: fails at the import (`overlay/helix.js` does not exist).
- [ ] **Step 3: Implement `overlay/helix.js`** to the interface above, with a header comment like `afterglow.js`'s saying what the file holds and that it must stay loadable under Node. Add the script line to the three pages.
- [ ] **Step 4: Run** `npm run verify`. Expected: `127/127 passed`. If only the containment check fails, tune the motion table's numbers, not the check.
- [ ] **Step 5: Commit** `git commit -m "Add the helix arithmetic: levels, shatter state machine, piece motion"`

---

### Task 4: The calm helix

**Files:**
- Rewrite: `overlay/factories/dna.js`
- Test: `verify-render.mjs`, a new DNA section placed after the 4:3 page (`p43`) is opened, so all three overlay pages are available, and its line in the "Covered" header comment

**Interfaces:**
- Consumes: `TimbreHelix.levels`, `twist`, `radius`, `follow`, `peakOf`, `threshold`, `rng`, `createShatter` (Task 3); `micPeak` (Task 2); `perViz.dna` (Task 1); `TimbreGlow.trace` if useful.
- Produces: `VIZ_FACTORIES['dna']()` returns `{ draw(now, dt), probe() }`. `probe()` is the test surface: `{ state, phase, ra, rb, bright, pieces, inside }` with `ra` and `rb` the two strand radii in px, `bright` the 0 to 1 brightness, `pieces` the piece count (0 while whole) and `inside` how many piece centres are inside the canvas. The factory reads `window.__dnaSeed` once, when created, and passes it to `TimbreHelix.rng`.

What `draw` does while whole is the spec's sections "The helix" and "Quiet and muted". The values the spec pins: strand width `1.5 × SCALE` (back) to `3.3 × SCALE` (front); opacity 0.32 to 1.0 of the brightness; nine rungs per turn, `1.5 × SCALE` wide, hidden where `|sin θ| < 0.14`, two halves meeting at the axis; palette offsets 0 (strand A) and 1.5 (strand B) with about 1.2 palette steps along the length; brightness `0.5 + 0.5 × loud`; blur `(3 + 11 × loud) × SCALE`; loudness smoothed over 0.12 s; radius opening over 0.05 s and closing over 0.2 s; idle levels `0.22 + 0.12 × sin(now / 700)` and `0.22 + 0.12 × sin(now / 540 + 1.2)` with loudness 0.

- [ ] **Step 1: Write the failing tests** (10 checks). One helper beside `glowRun`:

```js
// steps: [{ secs, wave, low, high, peak, mic, config, jump }] — wave/low/high/peak are 0..1; low fills frequency bins 0-1, high bins 2-10.
// After each step returns probe() plus pixel facts: ink (pixels with alpha), alpha (summed), top and bottom rows with ink, emptyCols.
const dnaRun = (pg, steps, { fps = 60, seed = 1, fresh = true } = {}) => pg.evaluate(({ steps, fps, seed, fresh }) => { /* same save/restore shape as glowRun; also saves and restores micPeak; sets window.__dnaSeed = seed before creating the factory when fresh; `now` persists on window.__dnaNow between calls when not fresh */ }, { steps, fps, seed, fresh });
const talk = { wave: 0.5, low: 0.5, high: 0.3, peak: 0.5 }, silence = { wave: 0, low: 0, high: 0, peak: 0 };
```

Before the checks: `pushConfig` to `activeViz: 'dna'`, `idleAnim: false`, DNA's knobs at their defaults, and wait for `currentVizName === 'dna'`.

| Check | Page | Assertion |
|---|---|---|
| the helix draws edge to edge | `page`, `p43`, `wide` (one check each, 3 in all) | after `[{ secs: 1, ...talk }]`: `ink > 0`, `emptyCols === 0`, `state === 'whole'` |
| louder is wider and brighter | `wide` | `[{ secs: 1, ...silence }, { secs: 1, wave: 0.6, low: 0.8, high: 0.8, peak: 0.6 }]`: second step has larger `ra`, `rb`, `bright`, `alpha` and `bottom − top` than the first |
| the quiet helix is narrow, dim and slow | `wide` | after 2 s of silence: `ra` and `rb` within 5% of `12 × SCALE`, `bright` within 0.02 of 0.5, and `phase` advances by 0.7 ± 0.05 over the next second |
| a loud helix turns at 6.5 radians a second | `wide` | 1 s at `wave: 0.7, low: 0.5, high: 0.5, peak: 0.7` (loudness clamps to 1) to settle, then `phase` advances by 6.5 ± 0.15 over the next second |
| the twist is the same at 30 and 165 fps | `wide` | the previous measurement at both rates agrees within 0.05 |
| low sound opens strand A, high sound strand B | `wide` | `[{ secs: 1, wave: 0.3, low: 0.9, high: 0, peak: 0.3 }]` → `ra > rb × 1.5`; with `low: 0, high: 0.9` → `rb > ra × 1.5` |
| mic off with idle animation: only the widths breathe | `wide` | with `idleAnim: true` and `mic: false`, sampling every 0.25 s for 4 s: `ra` ranges over more than `2 × SCALE`, `bright` stays within 0.02 of 0.5, and `phase` advances by 2.8 ± 0.2 |
| mic off without idle animation is the quiet helix | `wide` | `idleAnim: false`, `mic: false`, 2 s: `ra` and `rb` within 5% of `12 × SCALE` |

- [ ] **Step 2: Run** `npm run verify:render`. Expected: the new checks fail (`probe` is not a function).
- [ ] **Step 3: Rewrite `overlay/factories/dna.js`** for the whole state. Build the strands as ribbons whose half-width follows depth, split at the turning points so back runs draw first, then rungs, then front runs with the white core. Create the machine with `createShatter({ random })` and call `step` every frame with a `cut` that returns `[]` for now, so the helix cannot shatter yet.
- [ ] **Step 4: Run both suites.** Expected: `127/127 passed` and `122/122 passed`.
- [ ] **Step 5: Commit** `git commit -m "Redraw DNA as a smooth glowing double helix"`

---

### Task 5: The shatter and the return

**Files:**
- Modify: `overlay/factories/dna.js`
- Test: `verify-render.mjs` (DNA section)

**Interfaces:**
- Consumes: the machine's `step` events and `pieces` (Task 3); `dnaRun`, `talk`, `silence` (Task 4).
- Produces: nothing new; `probe()` now reports real `pieces` and `inside`.

What to build, from the spec's "The shatter": `cut()` slices each strand into runs of 2% to 4% of the canvas width and turns each rung half into a piece, each keeping its shape, colour, depth and home centre (under 200 pieces at any winding; widen the slices if a tight winding would exceed it). Pieces draw in back, rungs, front order at `(cx + ox, cy + oy)` rotated by `rot`, brighter than the calm helix, with a white overlay of `heat`. About 46 sparks on `'shatter'`, gone within a second. The twist does not advance unless the state is whole. On `'whole'`, one flash that decays over about 0.25 s and adds to brightness and blur. Peak for the machine: `micPeak` when it is a number (test it with `typeof micPeak === 'number'`, so a cached older `core.js` that never declared it cannot throw), otherwise `TimbreHelix.peakOf(waveform)`; `live` is `micActive && !!waveform`; `threshold` from `perViz.dna.shatterSensitivity`; `reconnectS` from `perViz.dna.reconnectSeconds`.

- [ ] **Step 1: Write the failing tests** (11 checks), all on `wide` unless noted, with `reconnectSeconds` pushed to 1 for this block and restored to 3 after it. `blast = [{ secs: 1, ...talk }, { secs: 0.1, ...talk, peak: 0.95 }]`.

| Check | Assertion |
|---|---|
| a peak shatters the helix | after `[...blast, { secs: 0.5, ...talk }]`: `state === 'pieces'`, `60 <= pieces && pieces < 200`, `inside >= 0.9 × pieces`, and `bottom − top` is more than 1.5 times what it was after the first step |
| the same on the small page | `page`: the same assertions |
| the pieces come back | `[...blast, { secs: 1.2, ...talk }]` leaves `state === 'returning'`; a further 1.6 s leaves `state === 'whole'`, `pieces === 0`, and `bottom − top` back under the shattered height × 0.8 |
| the twist waits while in pieces | `phase` is identical after the blast and 0.5 s later |
| talking with Gain at 200% does not shatter | `gain: 200` pushed, `[{ secs: 5, wave: 0.6, low: 0.6, high: 0.6, peak: 0.6 }]` → `state === 'whole'` |
| sensitivity 0 never shatters | `shatterSensitivity: 0`, `[{ secs: 1, ...talk }, { secs: 1, ...talk, peak: 1 }]` → `state === 'whole'` |
| falls back to the waveform peak | `[{ secs: 1, ...talk }, { secs: 0.1, wave: 0.95, low: 0.5, high: 0.3, peak: null }]` → `state === 'pieces'` |
| a config push leaves the pieces alone | blast, 0.3 s, record `probe()`; `applyConfig` with `perViz.dna.reconnectSeconds` changed to 2 and `bounce` changed; one more frame via `dnaRun(..., { fresh: false })` with `{ secs: 1 / 60, ...talk }` → still `'pieces'`, the same `pieces` count, and `ink` within 5% of the frame before |
| a real size change comes back whole | blast, 0.3 s, then a step with `config: { showLabels: false }` (the canvas grows) and one frame → `state === 'whole'`; restore `showLabels` |
| a hidden source comes back whole | blast, 0.3 s, then `{ secs: 1 / 60, ...talk, jump: 5 }` → `state === 'whole'` |
| a seeded shatter repeats | two fresh runs of `[...blast, { secs: 0.5, ...talk }]` with `seed: 7` give identical `inside` and identical `ink` |

- [ ] **Step 2: Run** `npm run verify:render`. Expected: the new checks fail (the helix never leaves `'whole'`).
- [ ] **Step 3: Implement** the real `cut()`, the piece and spark drawing, the frozen twist and the flash.
- [ ] **Step 4: Run both suites.** Expected: `127/127 passed` and `133/133 passed`.
- [ ] **Step 5: Commit** `git commit -m "Shatter the DNA helix on a peak and bring it back"`

---

### Task 6: Speed check, documentation, and the owner's test

**Files:**
- Modify: `verify-render.mjs` (one check and the "Covered" header comment), `docs/EFFECTS.md`, `CHANGELOG.md`

- [ ] **Step 1: Add the speed check** at the end of the DNA section, on `wide` (1 check). With a fresh factory and seed 1, time `draw` over: 300 frames of `talk`; the single frame on which a `peak: 0.95` shatters it; 150 frames in pieces. Assert the two means are under 1 ms and the blast frame under 4 ms; print all three.

```js
check('DNA draws in under 1 ms, and its blast frame in under 4', cost.whole < 1 && cost.pieces < 1 && cost.blast < 4, `whole ${cost.whole.toFixed(3)}, pieces ${cost.pieces.toFixed(3)}, blast ${cost.blast.toFixed(2)}`);
```

- [ ] **Step 2: Run** `npm run verify:render`. Expected: `134/134 passed`. If only this check fails, report the three numbers; do not raise the limits.
- [ ] **Step 3: Document.**
  - `docs/EFFECTS.md`: add `micPeak` to the table of script-scope globals ("loudest input sample since the last look, 0 to 1, before Gain, or `null` when no mic"). Add a short section "Helix arithmetic (`TimbreHelix`)" naming what it offers (the Task 3 table, in brief) and that it must stay loadable under Node.
  - `CHANGELOG.md`, under `[Unreleased]`: **Changed** DNA is now a smooth glowing double helix that twists faster and glows brighter with loudness, opens its two strands with the low and high end of the sound, and shatters on a hard peak; the stepped look is gone. **Added** the `shatterSensitivity` and `reconnectSeconds` settings, and the `micPeak` measurement.
- [ ] **Step 4: Run both suites.** Expected: `npm run verify` → `127/127 passed`; `npm run verify:render` → `134/134 passed`.
- [ ] **Step 5: Commit** `git commit -m "Document the DNA helix and check its cost"`
- [ ] **Step 6: The owner's test.** This step is the owner's, not the implementer's, and it is the one that decides the result. No version has been driven by a real microphone yet. Ask them to load the branch in OBS and, with their own mic: talk normally for a few minutes (it must never shatter); yell once and thump the mic once (each must shatter it); keep talking afterwards (the pieces must come back after the Reconnect Seconds delay); watch for stutter in both states; try Shatter Sensitivity at 0 and at 100. If a yell does not shatter it at the default, the default sensitivity moves; record what they report and the value that worked. Do not merge the branch before this is done.
