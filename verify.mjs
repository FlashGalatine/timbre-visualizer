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
//   7. Helix arithmetic — overlay/helix.js under Node: the shatter threshold,
//      the sound levels, the return curve, the seeded random source, the
//      whole / pieces / returning state machine with its timers, the pieces
//      flying outward and staying in the frame, and that all three overlay
//      pages load it after afterglow.js and before the factories. (Also runs
//      before section 4.)
//   8. Comet arithmetic — overlay/comet-flight.js under Node: the path (inside
//      the frame, never stalling), the rules that follow the voice, the tail's
//      point memory at any frame rate, the flare gate, and that all three
//      overlay pages load it after helix.js and before the factories. (Also
//      runs before section 4.)
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
ok(JSON.stringify(T.defaultConfig().perViz.dna) === JSON.stringify({ helixFreq: 50, shatterSensitivity: 50, reconnectSeconds: 3 }), 'dna defaults: helixFreq 50, shatterSensitivity 50, reconnectSeconds 3');
{
  const c = T.sanitizeConfig({ perViz: { dna: { shatterSensitivity: 250, reconnectSeconds: 99 } } });
  ok(c.perViz.dna.shatterSensitivity === 100 && c.perViz.dna.reconnectSeconds === 10, 'dna knobs clamp: sensitivity to 100, reconnect to 10');
  const old = T.sanitizeConfig({ perViz: { dna: { helixFreq: 80 } } });   // a config saved before this change
  ok(old.perViz.dna.helixFreq === 80 && old.perViz.dna.shatterSensitivity === 50 && old.perViz.dna.reconnectSeconds === 3, 'an old saved dna config gains the new defaults');
}
ok(JSON.stringify(T.defaultConfig().perViz.comet) === JSON.stringify({ trail: 50, flareSensitivity: 50 }), 'comet defaults: trail 50, flareSensitivity 50');
{
  const c = T.sanitizeConfig({ perViz: { comet: { trail: 250, flareSensitivity: -4 } } });
  ok(c.perViz.comet.trail === 100 && c.perViz.comet.flareSensitivity === 0, 'comet knobs clamp to 0..100');
  const old = T.sanitizeConfig({ perViz: { comet: { trail: 80 } } });   // a config saved before this change
  ok(old.perViz.comet.trail === 80 && old.perViz.comet.flareSensitivity === 50, 'an old saved comet config gains the new default');
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

// ── 7. Helix arithmetic (pure; no browser) ───────────────────────────────────
console.log('\n[7] helix arithmetic');
await import('./overlay/helix.js');
{
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

  ok(HX.threshold(0) === Infinity, 'threshold: off at 0');
  ok(near(HX.threshold(1), 1) && near(HX.threshold(50), 0.9) && near(HX.threshold(75), 0.7) && near(HX.threshold(100), 0.5), 'threshold: 1, 50, 75, 100');

  // A waveform sample of 128 is the centre line, so a waveform full of 128s is silence.
  const centred = () => new Uint8Array(64).fill(128);
  const half = centred(); half[20] = 192;
  const clipped = centred(); clipped[40] = 0;
  ok(HX.peakOf(centred()) === 0 && near(HX.peakOf(half), 64 / 127) && HX.peakOf(clipped) === 1 && HX.peakOf(null) === 0, 'peakOf: silence, half, clipped, none');
  const z = HX.levels(new Uint8Array(32), centred(), 1), none = HX.levels(null, null, 1);
  ok(z.loud === 0 && z.low === 0 && z.high === 0 && none.loud === 0 && none.low === 0 && none.high === 0, 'levels: silence is zero');
  const bins = (from, to) => { const f = new Uint8Array(32); for (let i = from; i <= to; i++) f[i] = 255; return f; };
  const lo = HX.levels(bins(0, 1), centred(), 1), hi = HX.levels(bins(2, 10), centred(), 1), top = HX.levels(bins(11, 31), centred(), 1);
  ok(lo.low === 1 && lo.high === 0 && hi.low === 0 && hi.high === 1 && top.low === 0 && top.high === 0, 'levels: low and high read their own bins');
  const g1 = HX.levels(new Uint8Array(32), half, 1), g2 = HX.levels(new Uint8Array(32), half, 2);
  ok(near(g1.loud, 64 / 127 * 1.5) && g2.loud === 1 && near(HX.peakOf(half), 64 / 127), 'levels: Gain scales loudness and clamps');
  ok(near(HX.twist(0), 0.7) && near(HX.twist(1), 6.5) && HX.radius(0) === 12 && HX.radius(1) === 34, 'twist and radius at the ends');
  // 0.5 s is 82.5 frames at 165 fps, so the last step is the part-frame left over.
  const followFor = (fps) => { let v = 0, t = 0; while (t < 0.5 - 1e-12) { const dt = Math.min(1 / fps, 0.5 - t); v = HX.follow(v, 1, dt, 0.2); t += dt; } return v; };
  const f30 = followFor(30), f165 = followFor(165);
  ok(near(f30, f165, 1e-6) && near(f30, 1 - Math.exp(-2.5), 1e-6) && near(f165, 1 - Math.exp(-2.5), 1e-6), 'follow is frame-rate independent');

  const end = HX.returnShare(1, 1);
  ok(HX.returnShare(0, 1).e === 0 && near(HX.returnShare(0.78, 1).e, 0.72) && near(end.e, 1, 1e-12) && near(end.heat, 0.8, 1e-12) && HX.returnShare(0.5, 1).heat === 0, 'returnShare: ends and the hand-over');
  const forward = (lag) => { let last = -Infinity; for (let i = 0; i <= 100; i++) { const e = HX.returnShare(i / 100, lag).e; if (e < last) return false; last = e; } return true; };
  ok(forward(0.6) && forward(1), 'returnShare never goes backward');
  const ra = HX.rng(7), rb = HX.rng(7);
  const xa = Array.from({ length: 5 }, () => ra()), xb = Array.from({ length: 5 }, () => rb());
  ok(xa.join() === xb.join() && xa.every((x) => x >= 0 && x < 1) && HX.rng(undefined) === Math.random, 'rng: seeded runs repeat');

  const onePeak = [quiet, hit, { secs: 6, peak: 0.3 }];
  const one = runHelix(60, onePeak);
  ok(shape(one) === 'shatter,return,whole' && near(at(one, 0), 1.0, 0.07) && near(at(one, 1), 4.1, 0.07) && near(at(one, 2), 5.6, 0.07)
    && one.m.state === 'whole' && one.m.pieces === null, 'one peak: shatter, return, whole');
  const s30 = runHelix(30, onePeak), s165 = runHelix(165, onePeak);
  ok(shape(s30) === 'shatter,return,whole' && shape(s165) === shape(s30) && [0, 1, 2].every((i) => near(at(s30, i), at(s165, i), 0.07)), 'the same at 30 and 165 fps');
  ok(runHelix(60, [{ secs: 60, peak: 0.7 }]).events.length === 0, 'talking never shatters');
  const talk = runHelix(60, [quiet, hit, { secs: 6, peak: 0.7 }]);
  ok(shape(talk) === 'shatter,return,whole' && near(at(talk, 1), 4.1, 0.07), 'talking after a shatter still returns');
  const again = runHelix(60, [quiet, hit, { secs: 2, peak: 0.3 }, hit, { secs: 6, peak: 0.3 }]);
  ok(shape(again) === 'shatter,jostle,return,whole' && near(at(again, 2), 6.2, 0.07), 'a peak in pieces restarts the wait');
  const back = runHelix(60, [quiet, hit, { secs: 3.5, peak: 0.3 }, hit, { secs: 6, peak: 0.3 }]);
  ok(shape(back) === 'shatter,return,jostle,return,whole' && near(at(back, 3), 7.7, 0.07), 'a peak during the return scatters again');
  ok(shape(runHelix(60, [quiet, hit, { secs: 6, peak: 0.95, live: false }])) === 'shatter,return,whole', 'mic off in pieces returns');
  // The 0.4 s the helix must be whole counts only time with the mic on, so the moment the mic opens
  // (a reload, a device switch) cannot shatter it at once; 1 s of mic on is still enough.
  const opened = runHelix(60, [{ secs: 2, peak: 0.95, live: false }, { secs: 0.2, peak: 0.95 }, { secs: 1, peak: 0.3 }]);
  const openedQuiet = runHelix(60, [{ secs: 2, peak: 0.3, live: false }, { secs: 1, peak: 0.3 }, hit, { secs: 0.5, peak: 0.3 }]);
  ok(opened.events.length === 0 && shape(openedQuiet) === 'shatter', 'the mic opening on a peak does not shatter');
  const off = runHelix(60, [{ secs: 5, peak: 1 }], { threshold: Infinity });
  const soon = runHelix(60, [quiet, hit, { secs: 3, peak: 0.3 }], { reconnectS: 0 });
  ok(off.events.length === 0 && shape(soon) === 'shatter,return,whole' && near(at(soon, 1), 1.4, 0.07), 'sensitivity 0 never shatters; reconnect 0 waits 0.3 s');
  const moved = runHelix(60, [quiet, hit, { secs: 1, peak: 0.3, reconnectS: 10 }, { secs: 3, peak: 0.3, reconnectS: 1 }]);
  ok(moved.events[1] && moved.events[1].e === 'return' && near(at(moved, 1), 2.1, 0.07), 'a new reconnect time applies to the running wait');
  const resized = runHelix(60, [quiet, hit, { secs: 0.5, peak: 0.3 }, { secs: 0.1, peak: 0.3, H: 816 }]);
  const hidden = runHelix(60, [quiet, hit, { secs: 0.5, peak: 0.3 }, { secs: 0.1, peak: 0.3, jump: 5 }]);
  ok(shape(resized) === 'shatter,reset' && resized.m.state === 'whole' && resized.m.pieces === null
    && shape(hidden) === 'shatter,reset' && hidden.m.state === 'whole' && hidden.m.pieces === null, 'a size change and a gap resume whole');
  const contained = [[260, 130, 1], [1728, 624, 4.8]].every(([W, H, scale]) => {
    const calm = runHelix(60, [quiet, hit, { secs: 10, peak: 0.3 }], { W, H, scale, reconnectS: 100 });
    const yell = runHelix(60, [quiet, { secs: 10, peak: 0.95 }], { W, H, scale, reconnectS: 100 });
    if (shape(calm) !== 'shatter' || !yell.m.pieces) return false;
    const atEdge = yell.m.pieces.filter((p) => p.cy + p.oy < 16 * scale || p.cy + p.oy > H - 16 * scale).length;
    return calm.minInside >= 0.9 && yell.minInside >= 0.9 && atEdge < yell.m.pieces.length / 2;
  });
  ok(contained, 'the pieces stay inside; a long yell spreads them');
  // Half a second after a blast the pieces are well away from home, and most are farther from the
  // axis than they started (measured: 23.0 × scale, 95%). Pieces that never move meet neither;
  // pieces thrown inward travel as far but fail the second (17%).
  const thrown = runHelix(60, [quiet, hit, { secs: 0.5, peak: 0.3 }]).m.pieces;
  ok(!!thrown && thrown.reduce((sum, p) => sum + Math.hypot(p.ox, p.oy), 0) / thrown.length > 20 * 4.8
    && thrown.filter((p) => Math.abs(p.cy + p.oy - 624 / 2) > Math.abs(p.cy - 624 / 2)).length > 0.7 * thrown.length, 'a blast throws the pieces outward');

  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="helix.js"');
    order.push(pos > html.indexOf('src="afterglow.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load helix.js after afterglow.js and before the factories');
}

// ── 8. Comet arithmetic (pure; no browser) ───────────────────────────────────
console.log('\n[8] comet arithmetic');
await import('./overlay/comet-flight.js');
{
  const C = globalThis.TimbreComet;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const SIZES = [[260, 130, 1], [1248, 624, 4.8], [1728, 624, 4.8]];
  const WIDE = SIZES[2];

  // The path: inside the margin everywhere, and the head never stops. Speed is in px per radian
  // per unit of scale; the slowest moment is about 11 (silent reach, lean at its limit). A figure
  // folded into a line (lean at a quarter turn) drops to 0.
  let inside = true, slowest = Infinity;
  for (const [W, H, scale] of SIZES) {
    const m = C.MARGIN * scale, N = 2000, dTh = (2 * Math.PI) / N;
    for (const lean of [-C.LEAN_MAX, -0.2, 0, 0.2, C.LEAN_MAX]) {
      for (const reach of [C.REACH_MIN, 0.7, 1]) {
        let prev = C.at(0, reach, lean, W, H, scale);
        for (let i = 1; i <= N; i++) {
          const p = C.at(i * dTh, reach, lean, W, H, scale);
          if (p.x < m - 1e-6 || p.x > W - m + 1e-6 || p.y < m - 1e-6 || p.y > H - m + 1e-6 || Math.abs(p.z) > 1) inside = false;
          slowest = Math.min(slowest, Math.hypot(p.x - prev.x, p.y - prev.y) / dTh / scale);
          prev = p;
        }
      }
    }
  }
  ok(inside, 'the path stays inside the margin on all three pages');
  ok(slowest > 8, `the head never stalls (slowest ${slowest.toFixed(1)} px per radian per scale)`);
  ok(Math.abs(C.lean(0)) <= C.LEAN_MAX && [10, 100, 1000, 12345].every((s) => Math.abs(C.lean(s)) <= C.LEAN_MAX) && C.LEAN_MAX < Math.PI / 4 - 0.3,
    'the lean stays well clear of the fold at a quarter turn');
  {
    const c = C.at(0, 1, 0, 1728, 624, 4.8), far = C.at(Math.PI / 6, 1, 0, 1728, 624, 4.8);
    ok(near(c.x, 864) && near(c.y, 312) && near(far.x, 1728 - C.MARGIN * 4.8, 1e-6), 'the figure is centred and reaches the margin at full reach');
  }

  // Following the voice.
  ok(near(C.speed(0), 0.2) && near(C.speed(1), 0.95) && near(C.speed(1, 1), 0.95 * 2.6) && C.speed(0.5) > C.speed(0.2), 'speed: 0.2 silent, 0.95 loud, a flare adds a dash');
  ok(near(C.reach(0), 0.42) && near(C.reach(1), 1) && C.reach(0.5) > C.reach(0.2), 'reach: 0.42 silent, the whole frame when loud');
  ok(near(C.tailLength(50, 0, 4.8), 4.8 * 190 * 0.3) && near(C.tailLength(50, 1, 4.8), 4.8 * 190) && C.tailLength(0, 0, 1) > 10
    && C.tailLength(100, 1, 1) > C.tailLength(50, 1, 1) && near(C.keep(4.8), C.tailLength(100, 1, 4.8)), 'tail length grows with Trail and with loudness; keep is the longest tail');
  ok(near(C.radius(0, 0, 0, 1, 1), 1.75) && near(C.radius(0, 1, 1, 1, 1), 5.45) && near(C.radius(1, 1, 1, 1, 1), 0.45)
    && near(C.radius(0, 0, 0, -1, 4.8), 1.75 * 0.64 * 4.8) && C.radius(0.3, 0.5, 1, 0, 1) > C.radius(0.3, 0.5, 0, 0, 1), 'tail width: thin when silent, wide when loud, wider where the voice was louder, smaller far away');
  {
    let falls = true;
    for (const lv of [0, 0.5, 1]) for (let i = 1; i <= 20; i++) {
      if (!(C.radius(i / 20, lv, lv, 0, 1) < C.radius((i - 1) / 20, lv, lv, 0, 1))) falls = false;
      if (!(C.alpha(i / 20, lv, lv) < C.alpha((i - 1) / 20, lv, lv) || C.alpha((i - 1) / 20, lv, lv) === 1)) falls = false;
    }
    ok(falls, 'at a steady level the tail narrows and fades from head to tip');
  }
  ok(C.alpha(1, 1, 1) === 0 && near(C.alpha(0, 0, 0), 0.5) && C.alpha(0, 1, 1) === 1, 'tail opacity: half when silent, full when loud, nothing at the tip');

  // Bulges: a stretch remembered as loud may stand out, but never by more than BULGE over any
  // point nearer the head. Widths run from the tip (first) to the head (last).
  {
    const capped = C.capBulges([1, 2, 6, 2, 3, 5, 4, 8, 9, 10]);
    ok(JSON.stringify(capped) === JSON.stringify([1, 2, 2.5, 2, 3, 5, 4, 8, 9, 10]) && C.BULGE === 1.25, 'capBulges trims a bulge to 1.25 times the narrowest point nearer the head');
    const taper = [0.5, 1, 2, 3, 4.5, 6];
    ok(JSON.stringify(C.capBulges([...taper])) === JSON.stringify(taper) && C.capBulges([]).length === 0 && C.capBulges([3])[0] === 3, 'capBulges leaves a tail that only narrows alone');
    // Syllables through the real rules: 0.18 s loud, 0.12 s quiet, at 60 fps on the 16:9 page.
    const [W, H, scale] = WIDE, trail = C.createTrail({ step: C.step(scale), keep: C.keep(scale) });
    const follow = (cur, want, dt, tau) => cur + (want - cur) * (1 - Math.exp(-dt / tau));
    let theta = 0.6, loud = 0, then = 0, len = 0, worstRaw = 0, worstCapped = 0, bulges = 0;
    for (let k = 0; k < 600; k++) {
      const dt = 1 / 60, level = (k / 60) % 0.3 < 0.18 ? 0.75 : 0;
      loud = follow(loud, level, dt, 0.12); then = follow(then, level, dt, 0.05); len = follow(len, level, dt, 0.4);
      const dTheta = C.speed(loud) * dt;
      C.fly(trail, { theta, dTheta, reach0: 0.8, reach1: 0.8, lean0: 0, lean1: 0, W, H, scale, level: then });
      theta += dTheta;
      if (k < 120) continue;
      const pts = trail.points, first = trail.first(C.tailLength(50, len, scale)), span = trail.travelled - pts[first].s;
      const raw = [];
      for (let i = first; i < pts.length; i++) raw.push(C.radius((trail.travelled - pts[i].s) / span, loud, pts[i].level, 0, scale));
      const cap = C.capBulges([...raw]);
      const worst = (r) => { let most = 0, least = Infinity; for (let i = r.length - 1; i >= 0; i--) { least = Math.min(least, r[i]); most = Math.max(most, r[i] / least); } return most; };
      worstRaw = Math.max(worstRaw, worst(raw)); worstCapped = Math.max(worstCapped, worst(cap));
      if (cap.some((r, i) => i < cap.length - 1 && r > cap[i + 1] * 1.05)) bulges++;
    }
    ok(worstCapped <= C.BULGE + 1e-9 && worstRaw > 1.3 && bulges > 100,
      `syllables still ride the tail as bulges, none more than 1.25 times the tail nearer the head (uncapped ${worstRaw.toFixed(2)}, capped ${worstCapped.toFixed(2)}, ${bulges} of 480 frames with a bulge)`);
  }

  // The tail's memory. A flight at a steady loudness on a page of the given size.
  const flight = (fps, secs, loud, [W, H, scale] = WIDE) => {
    const step = C.step(scale), keep = C.keep(scale), trail = C.createTrail({ step, keep });
    let theta = 0.6, clock = 0, maxPoints = 0, kept = 0, out = false;
    const reach = C.reach(loud), m = C.MARGIN * scale;
    for (let k = 0, n = Math.round(secs * fps); k < n; k++) {
      const dt = 1 / fps, dTheta = C.speed(loud) * dt, lean0 = C.lean(clock);
      clock += dt;
      const head = C.fly(trail, { theta, dTheta, reach0: reach, reach1: reach, lean0, lean1: C.lean(clock), W, H, scale, level: loud });
      theta += dTheta;
      const last = trail.points[trail.points.length - 1];
      if (!near(head.x, last.x) || !near(head.y, last.y)) out = true;       // the head is the last point
      maxPoints = Math.max(maxPoints, trail.points.length);
      kept = Math.max(kept, trail.travelled - trail.points[0].s);
    }
    let maxGap = 0, minGap = Infinity;
    const pts = trail.points;
    for (let i = 1; i < pts.length; i++) {
      const gap = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      maxGap = Math.max(maxGap, gap);
      if (i < pts.length - 1) minGap = Math.min(minGap, gap);                // the last point is the live head
      if (pts[i].x < m - 1e-6 || pts[i].x > W - m + 1e-6 || pts[i].y < m - 1e-6 || pts[i].y > H - m + 1e-6) out = true;
    }
    return { trail, step, keep, maxGap, minGap, maxPoints, kept, out };
  };
  {
    const runs = [];
    for (const fps of [10, 30, 60, 165]) for (const loud of [0, 1]) for (const size of [SIZES[0], WIDE]) runs.push(flight(fps, 12, loud, size));
    ok(runs.every((r) => r.maxGap <= r.step * 1.0001), `the remembered path has no gap longer than a step at 10 to 165 fps (worst ${Math.max(...runs.map((r) => r.maxGap / r.step)).toFixed(3)} steps)`);
    ok(runs.every((r) => r.minGap >= r.step * 0.4999), 'remembered points are at least half a step apart, whatever the frame rate');
    // The oldest point kept is at most a step past the longest tail, and the head moves up to half a step more before the next trim.
    ok(runs.every((r) => r.kept <= r.keep + 1.5 * r.step && r.maxPoints <= (2 * r.keep) / r.step + 3), 'the memory holds no more than the longest tail');
    ok(runs.every((r) => !r.out), 'every remembered point is inside the margin, and the head is the last point');
  }
  {
    const { trail, keep } = flight(60, 12, 1);
    const L = keep / 2, i = trail.first(L);
    ok(trail.travelled - trail.points[i].s <= L && i > 0 && trail.travelled - trail.points[i - 1].s > L && trail.first(keep * 10) === 0,
      'first(length) is the oldest point within that length of the head');
    trail.clear();
    ok(trail.points.length === 0 && trail.travelled === 0, 'clear() empties the memory');
  }
  {
    // One second silent, then loud: the points remember the level the head passed them at.
    const [W, H, scale] = WIDE, trail = C.createTrail({ step: C.step(scale), keep: C.keep(scale) });
    let theta = 0.6;
    for (const level of [0, 1]) for (let k = 0; k < 60; k++) {
      const dTheta = C.speed(level) / 60;
      C.fly(trail, { theta, dTheta, reach0: 0.7, reach1: 0.7, lean0: 0, lean1: 0, W, H, scale, level });
      theta += dTheta;
    }
    const pts = trail.points;
    ok(pts[0].level === 0 && pts[pts.length - 1].level === 1 && pts.every((p, i) => i === 0 || p.level >= pts[i - 1].level), 'each point remembers how loud the voice was when the head passed');
  }
  {
    // A frame at the 0.1 s cap while the reach is changing fast still leaves a gap-free path.
    const [W, H, scale] = WIDE, step = C.step(scale), trail = C.createTrail({ step, keep: C.keep(scale) });
    C.fly(trail, { theta: 0.6, dTheta: 0, reach0: 0.42, reach1: 0.42, lean0: 0, lean1: 0, W, H, scale, level: 0 });
    C.fly(trail, { theta: 0.6, dTheta: C.speed(1, 1) * 0.1, reach0: 0.42, reach1: 1, lean0: 0, lean1: 0.007, W, H, scale, level: 1 });
    let maxGap = 0;
    for (let i = 1; i < trail.points.length; i++) maxGap = Math.max(maxGap, Math.hypot(trail.points[i].x - trail.points[i - 1].x, trail.points[i].y - trail.points[i - 1].y));
    ok(trail.points.length > 10 && maxGap <= step * 1.0001, 'a long frame with the reach growing leaves no gap');
  }

  // The flare gate. script: [{ secs, peak, live = true }]; returns the times it fired, in seconds.
  const flares = (script, { threshold = 0.9, fps = 60 } = {}) => {
    const gate = C.createFlare(), times = [];
    let t = 0;
    for (const s of script) for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) {
      t += 1 / fps;
      if (gate.step({ dt: 1 / fps, live: s.live !== false, peak: s.peak, threshold })) times.push(t);
    }
    return times;
  };
  const quiet = { secs: 1, peak: 0.3 }, hit = { secs: 0.1, peak: 0.95 };
  {
    const once = flares([quiet, hit, quiet]);
    ok(once.length === 1 && near(once[0], 1 + 1 / 60, 1e-6), 'a peak flares once, on its first frame');
    ok(flares([quiet, { secs: 5, peak: 0.6 }]).length === 0, 'talking below the threshold never flares');
    const held = flares([quiet, { secs: 2, peak: 0.95 }]);
    ok(held.length === 3 && held.every((x, i) => i === 0 || x - held[i - 1] >= C.REARM_S - 1e-6), `a held peak flares again only after ${C.REARM_S} s (${held.map((x) => x.toFixed(2)).join(', ')})`);
    ok(flares([quiet, { secs: 2, peak: 0.95, live: false }]).length === 0, 'no flare with the mic off');
    ok(flares([quiet, { secs: 2, peak: 1 }], { threshold: Infinity }).length === 0, 'no flare when the threshold is off');
    ok(flares([quiet, { secs: 1, peak: NaN }, { secs: 1, peak: null }, { secs: 1, peak: undefined }]).length === 0, 'a missing peak never flares');
    // The 0.7 s counts only time with the mic on, so the mic opening on a loud moment cannot flare.
    ok(flares([{ secs: 2, peak: 0.95, live: false }, { secs: 0.2, peak: 0.95 }, { secs: 1, peak: 0.3 }]).length === 0
      && flares([{ secs: 2, peak: 0.3, live: false }, quiet, hit]).length === 1, 'the mic opening on a peak does not flare');
    const t30 = flares([quiet, hit], { fps: 30 })[0], t165 = flares([quiet, hit], { fps: 165 })[0];
    ok(near(t30, 1, 1 / 30 + 1e-6) && near(t165, 1, 1 / 165 + 1e-6), 'the flare comes at the same moment at 30 and 165 fps');
  }

  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="comet-flight.js"');
    order.push(pos > html.indexOf('src="helix.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load comet-flight.js after helix.js and before the factories');
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
