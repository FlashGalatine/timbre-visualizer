# Pinned Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An overlay page takes its visualizer and look from its own address, and the dock can copy such an address for the look it shows now.

**Architecture:** Two pure functions in `shared/viz-config.js` turn a query string into a partial config and a config into a query string. `overlay/core.js` reads the address once and merges that partial config over every config it applies. The dock builds the address from its working config. The Timbre Push action, the saved config and the mock server do not change.

**Tech Stack:** Plain browser JavaScript (no build step), Node test suites (`verify.mjs`, `verify-render.mjs` with playwright-core).

**Spec:** `docs/superpowers/specs/2026-11-23-pinned-source-look-design.md`

## Global Constraints

- Work on a branch `feat/pinned-source-look` in a git worktree. The checkout at `C:\dev\StreamerBot\timbre-visualizer` is what OBS serves; do not switch or edit it.
- Commit the spec and this plan with Task 1's commit.
- `mic` and `micProcessing` are never read from the address.
- `sbport` and `sbdebug` keep their present meaning and are never reported as ignored.
- A value from the address goes only into the config, through `TIMBRE.sanitizeConfig`. It is never put into a URL, into HTML, or into the microphone choice.
- A wrong type, an unknown key, an unknown visualizer id or an unknown knob is ignored and changes nothing else.
- A page with no look parameters behaves exactly as today. Every existing check in both suites stays green, unchanged except the one named in Task 3.
- `control/control.html` is changed with a node patch script written with the Write tool (in the scratchpad), not with Edit or Write on the file itself.
- No change to `actions/timbre-push.cs` or `mock-sb-server.mjs`.
- Suites: `npm run verify` and `npm run verify:render`. Both print `N/N passed` and exit 0.

## Review Focus

1. **OBS serves a cached old file beside a new one.** A new page with an old `core.js` (no `startOverlay`), or a new `core.js` with an old `viz-config.js` (no `lookFromQuery`), must still draw and follow the dock. Tests in Task 2.
2. **Parameter names that every object inherits** (`constructor.x=1`, `__proto__.a=1`, `visualizer=constructor`, `toString=1`). Ignored, nothing polluted. Tests in Task 1.
3. **A pinned page gets the same broadcast again** (every page that connects makes Streamer.bot resend). It must not restart its visualizer or reset its canvas. Test in Task 2.
4. **Text knobs with `&`, `#`, `+`, `%`, spaces, kana and emoji**, and one longer than `TIMBRE.MAX_STRING`. They round-trip whole, or are cut on a whole character. Tests in Task 1.
5. **The microphone on a pinned page.** The start-up look must not touch the capture, and a later broadcast's `mic` and `micProcessing` must still reach it. Tests in Task 2.

---

### Task 1: The look in a query string (`shared/viz-config.js`)

**Files:**
- Modify: `shared/viz-config.js` (two functions before `globalThis.TIMBRE = {`, and their names in that export)
- Test: `verify.mjs` (new section 32, placed after section 2; add it to the header comment's list)

**Interfaces:**
- Produces: `TIMBRE.lookFromQuery(search: string, ignored?: string[]) -> object`. A partial config holding only what the address names. Pushes the name of each parameter it ignored onto `ignored` when given. Never throws; returns `{}` for anything that is not a usable string.
- Produces: `TIMBRE.lookToQuery(config: object) -> string`. No leading `?`. The config is passed through `sanitizeConfig` first.

- [ ] **Step 1: Write the failing tests** in a new block `// ── 32. The look in an address ──`, using the suite's `ok(cond, name)`:

```js
const L = (s, ig) => T.lookFromQuery(s, ig), J = JSON.stringify;
ok(J(L('')) === '{}' && J(L('?')) === '{}' && J(L(null)) === '{}' && J(L('?sbport=8080&sbdebug=1')) === '{}', 'no look parameters: an empty look');
ok(J(L('?visualizer=rose')) === '{"activeViz":"rose"}' && J(L('?visualizer=nope')) === '{}' && J(L('?visualizer=constructor')) === '{}', 'visualizer: a known id only');
ok(J(L('?gain=150&bars=8')) === '{"bars":8,"gain":150}' && L('?afterglow=0.8').afterglow === 0.8 && L('?placement.x=-40&placement.size=140').placement.x === -40, 'numbers');
for (const bad of ['abc', '', '1e3', 'Infinity', 'NaN', '0x10', '1,5', ' 5']) ok(J(L('?gain=' + encodeURIComponent(bad))) === '{}', `gain=${J(bad)} is ignored`);
ok(J(L('?showBorder=0&showLabels=1')) === '{"showLabels":true,"showBorder":false}' && J(L('?showBorder=true&idleAnim=no')) === '{}', 'toggles are 1 or 0 and nothing else');
ok(J(L('?rose.cameraDrift=20')) === '{"perViz":{"rose":{"cameraDrift":20}}}' && J(L('?rose.nope=1&nope.cameraDrift=1&rose.=1&.x=1')) === '{}', 'knobs: a known visualizer and a known knob only');
ok(J(L('?mic=x&mic.deviceId=x&micProcessing=0&activeViz=rose&perViz=1')) === '{}', 'the microphone and the config\'s own key names are not parameters');
{ const before = J(Object.prototype); const got = L('?constructor.x=1&__proto__.a=1&toString=1&placement.__proto__=1&rose.constructor=1');
  ok(J(got) === '{}' && J(Object.prototype) === before && ({}).a === undefined, 'names every object inherits are ignored'); }
{ const ig = []; L('?visualizer=nope&gain=abc&zzz=1&sbport=1&sbdebug=1&bars=8', ig); ok(J(ig) === '["visualizer","gain","zzz"]', 'the ignored names are reported; sbport and sbdebug are not'); }
ok(L('?gain=150&gain=20').gain === 150, 'a parameter given twice: the first is used');
// Round trip: every visualizer, every setting off its default.
for (const name of T.ACTIVE_VIZ_NAMES) {
  const cfg = T.defaultConfig(); cfg.activeViz = name; cfg.gain = 137; cfg.bars = 9; cfg.showBorder = false; cfg.idleAnim = false; cfg.afterglow = 0.7; cfg.placement = { x: -33, y: 12, size: 150 };
  for (const [k, v] of Object.entries(cfg.perViz[name] || {})) cfg.perViz[name][k] = typeof v === 'number' ? 7 : 'a&b #c+d %41 かな 🌹';
  const back = T.sanitizeConfig(L('?' + T.lookToQuery(cfg)));
  const want = T.sanitizeConfig(cfg); for (const other of Object.keys(want.perViz)) if (other !== name) want.perViz[other] = T.defaultConfig().perViz[other];
  if (J(back) !== J(want)) { ok(false, `round trip: ${name}`); break; }
  if (name === T.ACTIVE_VIZ_NAMES[T.ACTIVE_VIZ_NAMES.length - 1]) ok(true, 'lookToQuery then lookFromQuery gives back the look, for every visualizer');
}
ok(!/mic|sbport|sbdebug/.test(T.lookToQuery(T.defaultConfig())) && T.lookToQuery(T.defaultConfig()).startsWith('visualizer=visualizer&'), 'lookToQuery: visualizer first, no microphone');
ok(J(T.sanitizeConfig(L('?gain=99999&placement.size=1'))).includes('"gain":200') && T.sanitizeConfig(L('?placement.size=1')).placement.size === 40, 'out-of-range numbers are clamped by sanitizeConfig, as the dock\'s are');
```

Add one more check: a text knob (find one with `Object.entries(T.DEFAULT_PER_VIZ)` whose default is a string) given `MAX_STRING + 10` emoji comes back, through `sanitizeConfig`, as exactly `T.cutText(thatText, T.MAX_STRING)`.

- [ ] **Step 2: Run** `npm run verify`. Expected: the new checks fail with `T.lookFromQuery is not a function`.

- [ ] **Step 3: Implement both functions.** Rules the tests do not fully pin:
  - Parse with `new URLSearchParams(search)` inside `try`; read each name once with `.get` (first wins).
  - The result's keys are written in table order (the order `lookToQuery` uses), whatever the address's order. `ignored` is in the address's order, each name once.
  - A number is a value matching `/^-?\d+(\.\d+)?$/`, converted with `Number`.
  - Parameter names: `visualizer`; each own key of `TOP_RANGES`; each own key of `TOP_BOOLS`; `afterglow`; `placement.<own key of PLACEMENT_RANGES>`; `<own key of DEFAULT_PER_VIZ>.<own key of that block>`, typed by the default's type. Use the file's `own()` for every lookup.
  - `lookToQuery` order: `visualizer`, the `TOP_RANGES` keys in table order, the `TOP_BOOLS` keys in table order (`1`/`0`), `afterglow`, `placement.x`, `placement.y`, `placement.size`, then the active visualizer's knobs in table order. Build with `URLSearchParams` and return its `toString()`.

- [ ] **Step 4: Run** `npm run verify`. Expected: all passed.

- [ ] **Step 5: Commit** `shared/viz-config.js`, `verify.mjs`, the spec and this plan: `Pinned sources: the look as a query string`.

---

### Task 2: The overlay keeps the look in its address (`overlay/core.js`, the three pages)

**Files:**
- Modify: `overlay/core.js` (near `let timbreConfig`, in `applyConfig`, and a new `startOverlay`)
- Modify: `overlay/mic-visualizers-300x220.html:208`, `overlay/mic-visualizers-1440x1080.html:253`, `overlay/mic-visualizers-1920x1080.html:265` (the bootstrap line `setActiveViz('visualizer');`)
- Test: `verify.mjs` section 29 (`loadCore`)

**Interfaces:**
- Consumes: `TIMBRE.lookFromQuery(search, ignored?)` from Task 1.
- Produces: `startOverlay()` in `core.js`: selects `'visualizer'`, then applies the address's look if it has one. `window.__timbre.addressLook` (getter): the partial config read from the address, `{}` when none.

- [ ] **Step 1: Extend `loadCore`** with options `search` (string; put `location: { search }` in the sandbox only when given), `oldShared` (pass a copy of `T` without `lookFromQuery`), and make it call `see("startOverlay()")` in place of `see("setActiveViz('visualizer')")`. Then write the failing tests, each in section 29's style:

  - Pinned (`search: '?visualizer=matrix&showBorder=0&gain=150'`): after load, before any `send`, `currentVizName === 'matrix'`, `cfgGain === 1.5`, `cfgShowBorder === false`, `log.starts` ends with `'matrix'`, and `log.devices === 0 && log.processing.length === 0` (the start-up look does not touch the capture).
  - Pinned, then `send(cfgWith({ activeViz: 'visualizer', showBorder: true, gain: 100, bounce: 77, mic: { deviceId: 'abc', label: 'Mic' }, micProcessing: false }))`: `currentVizName` still `'matrix'`, `cfgGain` still `1.5`, `cfgShowBorder` still `false`, `cfgBounce === 77`, `log.devices === 1`, `log.processing` is `[false]`, and `timbreConfig.activeViz === 'matrix'`.
  - Pinned, the same `send` a second time: `log.sets2d`, `log.starts.length`, `log.configs` and `log.devices` are unchanged from after the first.
  - Look without a visualizer (`search: '?showBorder=0'`): `send(cfgWith({ activeViz: 'matrix' }))` gives `currentVizName === 'matrix'` and `cfgShowBorder === false`.
  - Unknown values (`search: '?visualizer=nope&gain=abc'`): behaves as a page with no `search` (compare `shown()` and `currentVizName` after one `send` against an unpinned `loadCore`).
  - `oldShared: true` with `search: '?visualizer=matrix'`: loads without throwing, `currentVizName === 'visualizer'`, and a `send` naming `matrix` is followed.
  - No `location` in the sandbox at all: loads without throwing and follows the dock.
  - Static, over the three page files' text: each holds `if (typeof startOverlay === 'function') startOverlay(); else setActiveViz('visualizer');` exactly once and no other `setActiveViz('visualizer')`.

- [ ] **Step 2: Run** `npm run verify`. Expected: the new checks fail (`startOverlay is not defined`).

- [ ] **Step 3: Implement in `core.js`.**
  - Read once at load: `addressLook` is `TIMBRE.lookFromQuery(location.search, ignored)` when `typeof location !== 'undefined'` and `typeof TIMBRE.lookFromQuery === 'function'`, else `{}`. `pinned` is whether it has any key. When the address has `sbdebug=1` and `ignored` is not empty, `console.log` the ignored names in one line.
  - `applyConfig(raw, opts)`: after `const cfg = TIMBRE.sanitizeConfig(raw, timbreConfig)`, when `pinned`, replace `cfg` with `TIMBRE.sanitizeConfig(addressLook, cfg)` before `configInForce(cfg)` is asked. When `opts && opts.capture === false`, skip the whole `window.timbreCapture` block.
  - `startOverlay()`: `setActiveViz('visualizer')`; then, when `pinned`, `applyConfig({}, { capture: false })` inside the same `try`/`console.warn` shape the `svc:message` handler uses.
  - Add `get addressLook()` to `window.__timbre`.

- [ ] **Step 4: Replace the bootstrap line** in the three pages with the guarded line from Step 1.

- [ ] **Step 5: Run** `npm run verify`. Expected: all passed.

- [ ] **Step 6: Commit:** `Pinned sources: the overlay keeps the look in its address`.

---

### Task 3: The dock's "Copy source address" (`control/control.html`)

**Files:**
- Modify: `control/control.html`, by a node patch script: a new `<section>` directly above the Preview `<details>`; one pure function between `// DOCK-PURE-BEGIN` and `// DOCK-PURE-END`; the wiring next to the preview's `toggle` handler
- Test: `verify.mjs` section 28 (add `sourceAddress` and `validPort` to the names its `new Function` returns) and the check at `verify.mjs:9015`

**Interfaces:**
- Consumes: `TIMBRE.lookToQuery(config)` from Task 1.
- Produces (pure): `validPort(search: string) -> number` (0 when absent or not 1–65535; `previewQuery` is rewritten to use it) and `sourceAddress(T, origin: string, page: string, cfg: object, search: string) -> string`.
- Produces (page): elements `selSourcePage`, `btnCopySource`, `txtSourceAddress`, `sourceCopyNote`.

- [ ] **Step 1: Write the failing tests** in section 28:

```js
const cfgS = T.sanitizeConfig({ activeViz: 'rose', showBorder: false, gain: 150 });
const addr = D.sourceAddress(T, 'http://127.0.0.1:7474', 'mic-visualizers-1920x1080.html', cfgS, '?sbport=9090&sbdebug=1');
ok(addr === 'http://127.0.0.1:7474/timbre-overlay/mic-visualizers-1920x1080.html?' + T.lookToQuery(cfgS) + '&sbport=9090', 'the source address: the page, the whole look, and the dock\'s own port; not the debug switch');
ok(!D.sourceAddress(T, 'http://127.0.0.1:7474', 'mic-visualizers-300x220.html', cfgS, '?sbport=1@evil.example').includes('sbport'), 'a port that is not a port is left out');
ok(D.sourceAddress(T, 'http://127.0.0.1:7474', '../../x.html', cfgS, '').includes('/timbre-overlay/mic-visualizers-1920x1080.html?'), 'a page that is not one of the three becomes the 1920×1080 page');
ok(D.validPort('?sbport=8080') === 8080 && D.validPort('?sbport=0') === 0 && D.validPort('?sbport=65536') === 0 && D.validPort('') === 0, 'validPort');
ok(/id="selSourcePage"/.test(html) && /id="btnCopySource"/.test(html) && /id="txtSourceAddress"[^>]*readonly/.test(html) && (html.match(/<option value="mic-visualizers-/g) || []).length === 3 && /<option value="mic-visualizers-1920x1080\.html" selected/.test(html), 'the dock has the page choice (1920×1080 chosen), the button and a read-only field');
```

Change the check at `verify.mjs:9015` to require `f.dataset.src + previewQuery(ownSearch)` and still exactly one `location.search` in the page.

- [ ] **Step 2: Run** `npm run verify`. Expected: the new checks fail.

- [ ] **Step 3: Write the patch script** (scratchpad, Write tool) and run it once. It makes these changes and fails loudly if any anchor is missing or found twice:
  - `const ownSearch = location.search;` read once near the top of the script; the preview handler uses `previewQuery(ownSearch)`.
  - `validPort` and `sourceAddress` in the pure part; `previewQuery` uses `validPort`.
  - The section, with this copy:
    - Heading: `OBS source for this look`
    - Options: `300×220`, `1440×1080 (4:3)`, `1920×1080 (16:9)`
    - Button: `Copy source address`
    - Hint: `Makes an address for a Browser Source that keeps the visualizer and look shown now, whatever this dock is changed to later. Every source still uses the microphone chosen here. To change a source's look, copy a new address.`
  - The click handler: build the address from `location.origin`, the chosen page, the dock's working `cfg` and `ownSearch`; put it in `txtSourceAddress`; focus and select the field; try `navigator.clipboard.writeText`, and if that is missing or rejects, `document.execCommand('copy')`. Set `sourceCopyNote` to `Copied.` on success, else `Select the address and copy it.` Text is set with `textContent` and `value` only.

- [ ] **Step 4: Run** `npm run verify`. Expected: all passed.

- [ ] **Step 5: Commit:** `Pinned sources: the dock copies a source address`.

---

### Task 4: Checks in a real browser (`verify-render.mjs`)

**Files:**
- Modify: `verify-render.mjs` (a new block on the fake-mic context `ctxt`, after the control-panel block near line 8018; add a line to the header's "Covered" list)

**Interfaces:**
- Consumes: everything above; the suite's `check(name, cond, detail)`, `pushConfig(mutate)`, `overlayUrl`, and its address for `control.html`.

- [ ] **Step 1: Write the checks.**
  - Open `overlayUrl + '?visualizer=matrix&showBorder=0&gain=150'`. Wait for `__timbre.currentVizName === 'matrix'`. Then `pushConfig` with `activeViz = 'visualizer'`, `showBorder = true`, `gain = 100`, `bounce = 77`, and wait until `__timbre.config.bounce === 77`. Check: still `matrix`, `cfgGain === 1.5`, `config.showBorder === false`, the 2D canvas has pixels, no page error.
  - On a second page with plain `overlayUrl`, the same push gives `currentVizName === 'visualizer'` and `config.showBorder === true`.
  - Open the control page, wait until it has the saved config, choose `mic-visualizers-300x220.html` in `selSourcePage`, click `btnCopySource`. Check the field's value starts with the mock's origin plus `/timbre-overlay/mic-visualizers-300x220.html?visualizer=`. Open that value in a new page; then `pushConfig` with a different `activeViz` and `gain`. Check the new page's `__timbre.config`, with `mic` and `micProcessing` left out and every other visualizer's `perViz` block left out, equals the dock's config at the click.
  - Rose in the address (`?visualizer=rose`): the WebGL canvas is the visible one and `currentVizName === 'rose'` before any push.

- [ ] **Step 2: Run** `npm run verify:render`. Expected: all passed, the new checks among them. (Edge or Chrome must be installed. If the run reports a port already answering, stop the leftover mock and run again.)

- [ ] **Step 3: Commit:** `Pinned sources: render checks`.

---

### Task 5: Documents

**Files:**
- Modify: `docs/SETUP.md` (after the list of overlay addresses near line 87), `README.md`, `CHANGELOG.md` (under `## [Unreleased]`)

- [ ] **Step 1: Write** a SETUP section "Several visualizers in one scene": the button in the dock, the parameter table from the spec, that a parameter left out follows the dock, that the microphone always follows the dock, and that each source opens its own capture and its own WebGL context. Add two sentences to the README's feature list and a `### Added` entry to the changelog saying: copy `overlay`, `shared` and `control`, refresh every Timbre source and the dock; nothing to re-paste into Streamer.bot.

- [ ] **Step 2: Run** `npm run verify` (it reads the documents in places). Expected: all passed.

- [ ] **Step 3: Commit:** `Pinned sources: setup notes and changelog`.

The version number and the release commit follow the repository's custom at merge time and are not part of this plan. The check in OBS with two and three pinned sources (the spec's "Not known yet") is the owner's, on the branch, before merge.
