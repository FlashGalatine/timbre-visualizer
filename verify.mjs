// Timbre verify suite — protocol-seam + config-table tests, no browser needed.
//
//   node verify.mjs        (or: npm run verify)
//
// Sections:
//   1. Table consistency — every viz name has a factory file, per-viz defaults
//      only name known vizes, 3D set is a subset, defaultConfig is complete.
//   2. sanitizeConfig — clamping, allowlisting, string caps, unknown-key drops.
//   3. C# embed simulation — the exact string concatenation timbre-push.cs does,
//      fed a config with kana + newlines + quotes, must round-trip.
//   5. Scene kit arithmetic — the pure helpers behind the 3D scenes (sound
//      envelope and beat detector, camera fit, afterglow decay, internal render
//      scale, placement to lens shift) imported under Node, plus the placement
//      config (defaults, clamping, merging) and that all three overlay pages
//      load scene-kit.js then scene-parts.js between core.js and the factories.
//      (Numbered 5 because it was added last; it runs before section 4.)
//   6. Afterglow arithmetic — overlay/afterglow.js under Node: the fade rule,
//      bar ghosts, echo trigger, smooth-curve tracing, and that all three
//      overlay pages load it before the factories. (Also runs before section 4.)
//   4. Live transport seam — spawns mock-sb-server.mjs on side ports, loads the
//      REAL shared/panel-client-sb.js under a browser shim, and asserts:
//      Subscribe (lowercase), sync-on-connect DoAction, control push →
//      General.Custom → svc:message round-trip on a second client.
//
// What the mock CANNOT prove (needs real Streamer.bot 1.0.4 + OBS):
//   • SB's actual envelope quirks beyond what Tally/Greenroom already validated
//   • C# compile inside SB's default reference set
//   • getUserMedia inside OBS CEF (spike/mic-test.html) and WebGL perf there

import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import './shared/viz-config.js';

const T = globalThis.TIMBRE;
const __dirname = dirname(fileURLToPath(import.meta.url));

const HTTP_PORT = 7476; // side ports so a real SB on 7474/8080 doesn't collide
const WS_PORT = 8090;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name); }
}

// ── 1. Table consistency ─────────────────────────────────────────────────────
console.log('\n[1] table consistency');
{
  const factories = new Set((await readdir(resolve(__dirname, 'overlay/factories')))
    .filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)));
  const missing = T.ACTIVE_VIZ_NAMES.filter((n) => !factories.has(n));
  ok(missing.length === 0, `every viz name has a factory file${missing.length ? ' — MISSING: ' + missing.join(',') : ''}`);
  const orphan = [...factories].filter((f) => !T.ACTIVE_VIZ_NAMES.includes(f));
  ok(orphan.length === 0, `no orphan factory files${orphan.length ? ' — ORPHANS: ' + orphan.join(',') : ''}`);
  ok(T.ACTIVE_VIZ_NAMES.length === 49, `49 visualizers (${T.ACTIVE_VIZ_NAMES.length})`);
  const badPerViz = Object.keys(T.DEFAULT_PER_VIZ).filter((n) => !T.ACTIVE_VIZ_NAMES.includes(n));
  ok(badPerViz.length === 0, 'DEFAULT_PER_VIZ keys are all known vizes');
  ok(T.VIZ_USES_3D.every((n) => T.ACTIVE_VIZ_NAMES.includes(n)), 'VIZ_USES_3D ⊆ viz names');
  ok(T.VIZ_SCENES.every((n) => T.VIZ_USES_3D.includes(n)), 'VIZ_SCENES ⊆ VIZ_USES_3D');
  ok(T.VIZ_SCENES.includes('thanksgiving-harvest'), 'thanksgiving-harvest is a kit scene');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['thanksgiving-harvest']) === '{"candleGlow":50,"leafDensity":50,"cameraDrift":50}', 'thanksgiving knobs');
  ok(JSON.stringify(T.defaultConfig().placement) === '{"x":0,"y":0,"size":100}', 'defaultConfig has placement');
  ok(JSON.stringify(T.VIZ_AFTERGLOW) === '["visualizer","peak-hold","ring-bars","sine-bars","waveform","ring-waveform"]', 'the six afterglow effects');
  ok(T.VIZ_AFTERGLOW.every((n) => T.ACTIVE_VIZ_NAMES.includes(n) && !T.VIZ_USES_3D.includes(n)), 'afterglow effects are known 2D effects');
  ok(T.defaultConfig().afterglow === 1.6 && !('afterglow' in T.TOP_RANGES), 'afterglow defaults to 1.6 s and is not a global slider');
  const cfg = T.defaultConfig();
  ok(Object.keys(T.TOP_RANGES).every((k) => typeof cfg[k] === 'number'), 'defaultConfig has every numeric knob');
  ok(Object.keys(T.TOP_BOOLS).every((k) => typeof cfg[k] === 'boolean'), 'defaultConfig has every toggle');
  ok(cfg.activeViz === 'visualizer' && cfg.stlObject && cfg.perViz && cfg.mic, 'defaultConfig structure');
  ok(Object.keys(T.STL_OBJECT_DEFAULTS).every((k) => T.STL_OBJECT_RANGES[k]), 'every STL knob has a range');

  // Overlay-page parity: every shipped layout must load every factory (a factory
  // added to one page and forgotten on another silently renders nothing there),
  // and its canvas drawing buffer must match the CSS box it is drawn into.
  const OVERLAY_PAGES = ['mic-visualizers-300x220.html', 'mic-visualizers-1440x1080.html', 'mic-visualizers-1920x1080.html'];
  const pages = {};
  for (const f of OVERLAY_PAGES) pages[f] = await readFile(resolve(__dirname, 'overlay', f), 'utf8');
  for (const f of OVERLAY_PAGES) {
    const loaded = new Set([...pages[f].matchAll(/<script src="factories\/([\w-]+)\.js">/g)].map((m) => m[1]));
    const miss = T.ACTIVE_VIZ_NAMES.filter((n) => !loaded.has(n));
    ok(miss.length === 0, `${f} loads every factory${miss.length ? ' — MISSING: ' + miss.join(',') : ''}`);
    const cw = pages[f].match(/id="vizCanvas2D" width="(\d+)" height="(\d+)"/);
    const cw3 = pages[f].match(/id="vizCanvas3D" width="(\d+)" height="(\d+)"/);
    const css = pages[f].match(/\.canvas-stack \{[^}]*width: (\d+)px;\s*height: (\d+)px;/);
    ok(cw && cw3 && css && cw[1] === css[1] && cw[2] === css[2] && cw3[1] === css[1] && cw3[2] === css[2],
      `${f} canvas buffers match .canvas-stack CSS box (${cw && cw[1]}×${cw && cw[2]})`);
    ok(/<script src="core\.js"><\/script>[\s\S]*<script src="scene-kit\.js"><\/script>[\s\S]*<script src="scene-parts\.js"><\/script>[\s\S]*<script src="factories\//.test(pages[f]), `${f} loads scene-kit.js then scene-parts.js after core.js and before the factories`);
  }
  // The 16:9 page is the 4:3 page widened — same vertical metrics, SCALE pinned to the 4:3 page's value.
  ok(/^\s*SCALE = 4\.8;$/m.test(pages['mic-visualizers-1920x1080.html']) && /1728" height="624"/.test(pages['mic-visualizers-1920x1080.html']),
    '1920×1080 page: 1728×624 canvas with SCALE pinned to 4.8 (matches the 1440×1080 page)');
  // Both big pages fit themselves to the Browser Source size (uniform CSS transform
  // of the fixed layout, reference size = the page's own width/height).
  for (const [f, w] of [['mic-visualizers-1440x1080.html', 1440], ['mic-visualizers-1920x1080.html', 1920]]) {
    const html = pages[f];
    const fitRe = new RegExp('Math\\.min\\(vw / ' + w + ', vh / 1080\\)');
    ok(/transform-origin: 0 0;/.test(html) && fitRe.test(html) && /html, body \{ width: 100%; height: 100%; \}/.test(html)
       && /\.visualizer-box\.scaled \.canvas-stack canvas \{ image-rendering: auto; \}/.test(html),
      `${f} fits itself to the viewport (uniform transform from ${w}×1080, 100% body)`);
  }
}

// ── 2. sanitizeConfig ────────────────────────────────────────────────────────
console.log('\n[2] sanitizeConfig');
{
  const s = T.sanitizeConfig({
    bars: 999, gain: -5, colorSpeed: 10, activeViz: 'not-a-viz', idleAnim: 0,
    stlObject: { rotX: -999, posZ: 99, bogus: 5, intensity: 'NaN' },
    perViz: { matrix: { flow: 400, pool: 'x'.repeat(9000), nope: 1 }, 'fake-viz': { a: 1 } },
    mic: { deviceId: 42, label: 'L'.repeat(999) },
    injected: 'nope',
  });
  ok(s.bars === 32 && s.gain === 0 && s.colorSpeed === 50, 'top-level clamps (bars/gain/colorSpeed)');
  ok(s.activeViz === 'visualizer', 'unknown activeViz rejected');
  ok(s.idleAnim === false, 'boolean coercion');
  ok(s.stlObject.rotX === -180 && s.stlObject.posZ === 2, 'signed STL clamps');
  ok(!('bogus' in s.stlObject) && s.stlObject.intensity === 50, 'unknown/typed-wrong STL keys dropped');
  ok(s.perViz.matrix.flow === 100 && s.perViz.matrix.pool.length === 4096, 'perViz clamp + 4096 string cap');
  ok(!('nope' in s.perViz.matrix) && !('fake-viz' in s.perViz), 'unknown perViz keys/vizes dropped');
  ok(s.mic.deviceId === '' && s.mic.label.length === 256, 'mic field typing + cap');
  ok(!('injected' in s), 'unknown top-level keys dropped');
  const base = T.defaultConfig(); base.bounce = 77;
  ok(T.sanitizeConfig({ gain: 50 }, base).bounce === 77, 'partial merge preserves base');
}
{
  const c = T.sanitizeConfig({ placement: { x: 999, y: -999, size: 5 } });
  ok(c.placement.x === 100 && c.placement.y === -100 && c.placement.size === 40, 'placement clamps to its ranges');
  const d = T.sanitizeConfig({ placement: { x: '30', bogus: 7 } });
  ok(d.placement.x === 0 && !('bogus' in d.placement), 'placement ignores non-numbers and unknown keys');
  const e = T.sanitizeConfig({ placement: { x: 25 } }, T.sanitizeConfig({ placement: { y: 40, size: 150 } }));
  ok(e.placement.x === 25 && e.placement.y === 40 && e.placement.size === 150, 'placement merges over a base');
  ok(T.sanitizeConfig({ afterglow: 9 }).afterglow === 4 && T.sanitizeConfig({ afterglow: -1 }).afterglow === 0, 'afterglow is clamped to 0..4');
  ok(T.sanitizeConfig({ afterglow: 'long' }).afterglow === 1.6, 'a non-number afterglow is ignored');
  ok(T.sanitizeConfig({ gain: 50 }, T.sanitizeConfig({ afterglow: 2.5 })).afterglow === 2.5, 'afterglow survives a merge');
  const old = T.sanitizeConfig({ perViz: { 'thanksgiving-harvest': { pumpkinPulse: 80, leafDensity: 20, wheatSway: 10 } } });
  ok(JSON.stringify(old.perViz['thanksgiving-harvest']) === '{"candleGlow":50,"leafDensity":20,"cameraDrift":50}', 'a saved pre-redesign config keeps leafDensity and drops the retired knobs');
}

// ── 3. C# embed simulation ───────────────────────────────────────────────────
console.log('\n[3] C# raw-embed round-trip');
{
  const cfg = T.defaultConfig();
  cfg.perViz.matrix.messages = 'HELLO\n"quoted"\\backslash';
  cfg.perViz.matrix.pool = 'ｱｲｳｴｵ0123456789';
  const cfgJson = JSON.stringify(T.sanitizeConfig(cfg));
  // Exactly what timbre-push.cs broadcasts:
  const wire = '{"type":"timbre:config","config":' + cfgJson + '}';
  let parsed = null;
  try { parsed = JSON.parse(wire); } catch {}
  ok(parsed && parsed.type === 'timbre:config', 'wire string parses');
  ok(parsed && parsed.config.perViz.matrix.pool === cfg.perViz.matrix.pool, 'kana survives');
  ok(parsed && parsed.config.perViz.matrix.messages === cfg.perViz.matrix.messages, 'newlines/quotes/backslashes survive');
}

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
  const idle = G.createBarGhosts(); idle.step(0, 120, 0, 2, false);
  ok(idle.step(0, 29, 16, 2, true).length === 0, 'bars: the idle animation leaves no ghost when the mic comes on');
  const fading = G.createBarGhosts(); fading.step(0, 100, 0, 1, true); fading.step(0, 20, 100, 1, true);
  for (let t = 200; t <= 600; t += 100) s = fading.step(0, 20, t, 1, false);
  ok(s.length === 1 && s[0].strength > 0 && s[0].strength < 1, 'bars: old ghosts keep fading while the mic is off');
  const paused = G.createBarGhosts(); paused.step(0, 100, 0, 2, true);
  ok(paused.step(0, 20, 10000, 2, true).length === 0, 'bars: no ghost from before a long gap');
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
  { const r = G.createEchoes(); let most = 0;
    for (let i = 1; i <= 60 * 16; i++) { const t = i / 60; const T = t <= 8 ? 1.1 : 4;
      const a = (Math.floor(t / 0.033) * 0.033) % 0.25 < 0.12 ? 0.8 : 0.05;
      most = Math.max(most, r.step(a, t * 1000, 1 / 60, T, true, () => a).length); }
    ok(most <= G.MAX_ECHOES, 'echoes: still at most six after the slider is raised'); }
  ok(runEchoes(sudden, 60, 10, 1.6, false).count === 0, 'echoes: none while the mic is off');
  ok(runEchoes(sudden, 60, 10, 0).count === 0, 'echoes: afterglow 0 makes none');
  const shaped = runEchoes(ramp, 60, 0.7);
  ok(shaped.last.length === 1 && shaped.last[0].shape > 0.7 && shaped.last[0].strength > 0, 'echoes: the frozen shape is the loudest frame of the burst');
  // 0.9 s: one burst and its echo, ending in quiet. Then the source is hidden for 10 s.
  const e = G.createEchoes(); let before = [];
  for (let i = 1; i <= 54; i++) before = e.step(sudden(i / 60), i * 1000 / 60, 1 / 60, 1.6, true, () => 1);
  ok(before.length === 1 && e.step(0, 900 + 10000, 0.1, 1.6, true, () => 1).length === 0, 'echoes: none left after a long gap');
  // The same burst and echo, then the mic goes off at 0.9 s; read at 1.3 s.
  const e3 = G.createEchoes(); let kept = [];
  for (let i = 1; i <= 54; i++) e3.step(sudden(i / 60), i * 1000 / 60, 1 / 60, 1.6, true, () => 1);
  for (let i = 55; i <= 78; i++) kept = e3.step(0, i * 1000 / 60, 1 / 60, 1.6, false, () => 1);
  ok(kept.length === 1 && kept[0].strength > 0 && kept[0].strength < 1, 'echoes: old echoes keep fading while the mic is off');
  // Loud for 0.3 s (armed, holding a candidate), then the source is hidden for 10 s.
  const e4 = G.createEchoes(); let cut = 0;
  for (let i = 1; i <= 18; i++) cut += e4.step(0.8, i * 1000 / 60, 1 / 60, 1.6, true, () => 1).length;
  cut += e4.step(0, 300 + 10000, 0.1, 1.6, true, () => 1).length;
  for (let i = 1; i <= 30; i++) cut += e4.step(0, 10300 + i * 1000 / 60, 1 / 60, 1.6, true, () => 1).length;
  ok(cut === 0, 'echoes: no echo from a burst cut off by a long gap');
  const e2 = G.createEchoes(); e2.sync('64:1728:624'); for (let i = 1; i <= 36; i++) e2.step(sudden(i / 60), i * 1000 / 60, 1 / 60, 1.6, true, () => 1);
  e2.sync('32:1728:624');
  ok(e2.step(0, 620, 1 / 60, 1.6, true, () => 1).length === 0, 'echoes: sync with a new key starts again');

  const calls = []; const mock = { moveTo: (...a) => calls.push(['M', ...a]), lineTo: (...a) => calls.push(['L', ...a]), quadraticCurveTo: (...a) => calls.push(['Q', ...a]), closePath: () => calls.push(['Z']) };
  G.trace(mock, [0, 10, 20, 30], [5, 15, 5, 15], false);
  ok(calls[0].join() === 'M,0,5' && calls.filter((c) => c[0] === 'Q').length === 2 && calls.at(-1).join() === 'L,30,15', 'trace: an open curve starts and ends on the end samples');
  calls.length = 0; G.trace(mock, [0, 10, 10, 0], [0, 0, 10, 10], true);
  ok(calls[0].join() === 'M,0,5' && calls.filter((c) => c[0] === 'Q').length === 4 && calls.at(-1)[0] === 'Z', 'trace: a closed curve rounds every sample and closes');

  // glowLine: records what the stroke looked like at the moment each stroke() ran.
  const rec = { adds: 0, strokes: [], shadowBlur: -1, lineWidth: 0, strokeStyle: '', shadowColor: '', lineJoin: '', lineCap: '', beginPath() {}, stroke() { this.strokes.push({ blur: this.shadowBlur, width: this.lineWidth }); } };
  G.glowLine(rec, () => { rec.adds++; }, { width: 4, stroke: '#fff', glowColor: 'rgb(1,2,3)', blur: 9 });
  ok(rec.adds === 2 && rec.strokes.length === 2 && rec.strokes[0].blur === 9 && rec.strokes[0].width === 4 && rec.strokes[1].blur === 0 && near(rec.strokes[1].width, 1.4, 1e-9) && rec.shadowBlur === 0, 'glowLine: a glowing stroke, then a white core, shadow left off');

  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const at = html.indexOf('src="afterglow.js"');
    ok(at > html.indexOf('src="scene-parts.js"') && at < html.indexOf('src="factories/'), `${p} page loads afterglow.js before the factories`);
  }
}

// ── 4. Live transport seam (mock SB + real panel-client-sb.js) ───────────────
console.log('\n[4] transport seam vs mock');
{
  const mock = spawn(process.execPath, [resolve(__dirname, 'mock-sb-server.mjs')], {
    env: { ...process.env, SB_HTTP_PORT: String(HTTP_PORT), SB_WS_PORT: String(WS_PORT) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('mock did not start')), 8000);
    mock.stdout.on('data', (d) => { if (String(d).includes('Streamer.bot mock')) { clearTimeout(t); res(); } });
  });

  const { WebSocket } = await import('ws');

  // Browser shim so the REAL transport file runs unmodified under Node.
  const win = new EventTarget();
  globalThis.window = win;
  globalThis.document = { readyState: 'complete', addEventListener() {}, body: null, querySelector: () => null };
  globalThis.location = { search: '' };
  globalThis.WebSocket = WebSocket;
  win.__SB_WS_URL = `ws://127.0.0.1:${WS_PORT}/`;
  win.__SB_SYNC_ACTION = 'Timbre Push';

  const received = [];
  win.addEventListener('svc:message', (e) => received.push(e.detail));

  await import('./shared/viz-config.js');
  await import('./shared/panel-client-sb.js'); // connects immediately

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1200); // connect + Subscribe + sync fallback window

  ok(typeof win.sbDoAction === 'function', 'transport exposes sbDoAction');
  ok(received.length === 0, 'no broadcast before any config is cached (fresh-SB behavior)');

  // Simulate the control panel: push a config over a second raw client.
  const cfg = T.defaultConfig();
  cfg.activeViz = 'matrix';
  cfg.gain = 150;
  const ctl = new WebSocket(`ws://127.0.0.1:${WS_PORT}/`);
  await new Promise((r) => { ctl.onopen = r; });
  ctl.send(JSON.stringify({ request: 'DoAction', id: 'c1', action: { name: 'Timbre Push' }, args: { config: JSON.stringify(cfg) } }));
  await wait(600);

  const gotCfg = received.find((m) => m.type === 'timbre:config');
  ok(!!gotCfg, 'push → General.Custom → svc:message round-trip');
  ok(gotCfg && gotCfg.config.activeViz === 'matrix' && gotCfg.config.gain === 150, 'config values survive the trip');

  // Sync-on-connect: a NEW transport connection must receive the cached config
  // without any fresh push (via its own DoAction "Timbre Push" sync).
  const sync = await new Promise((res) => {
    const ws2 = new WebSocket(`ws://127.0.0.1:${WS_PORT}/`);
    const msgs = [];
    ws2.onopen = () => {
      ws2.send(JSON.stringify({ request: 'Subscribe', id: 's1', events: { general: ['Custom'] } }));
      ws2.send(JSON.stringify({ request: 'DoAction', id: 'd1', action: { name: 'Timbre Push' }, args: { reason: 'overlay-connect' } }));
    };
    ws2.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.event && m.event.source === 'General') { ws2.close(); res(m.data); }
    };
    setTimeout(() => res(null), 3000);
  });
  ok(sync && sync.type === 'timbre:config' && sync.config.activeViz === 'matrix', 'sync-on-connect replays cached config');

  // Wrong-case Subscribe must receive nothing (real-SB behavior the mock enforces).
  const wrongCase = await new Promise((res) => {
    const ws3 = new WebSocket(`ws://127.0.0.1:${WS_PORT}/`);
    let got = false;
    ws3.onopen = () => {
      ws3.send(JSON.stringify({ request: 'Subscribe', id: 'x1', events: { General: ['Custom'] } }));
      ws3.send(JSON.stringify({ request: 'DoAction', id: 'x2', action: { name: 'Timbre Push' }, args: { reason: 'overlay-connect' } }));
    };
    ws3.onmessage = (e) => { const m = JSON.parse(e.data); if (m.event) got = true; };
    setTimeout(() => { ws3.close(); res(got); }, 800);
  });
  ok(wrongCase === false, 'capitalized Subscribe source gets no events (case gotcha guarded)');

  ctl.close();
  mock.kill();
}

console.log(`\n${pass}/${pass + fail} passed${fail ? ` — ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
