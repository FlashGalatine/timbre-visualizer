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
//      flying outward and staying in the frame, the optional aim (and that a
//      blast without one is unchanged), and that all three overlay
//      pages load it after afterglow.js and before the factories. (Also runs
//      before section 4.)
//   8. Comet arithmetic — overlay/comet-flight.js under Node: the path (inside
//      the frame, never stalling), the rules that follow the voice, the tail's
//      point memory at any frame rate, the flare gate, and that all three
//      overlay pages load it after helix.js and before the factories. (Also
//      runs before section 4.)
//   9. Fireflies swarm — overlay/fireflies-swarm.js under Node with a seeded
//      random source: how many, staying in the frame, blink rates quiet and
//      loud, syllable bursts, the ripple's nudge, the startle and its guards,
//      frame-rate independence, size and Density changes, the flash's shape,
//      and that all three overlay pages load it after comet-flight.js and
//      before the factories. (Also runs before section 4.)
//  10. Planets — overlay/planets.js under Node: the tilted projection and the
//      largest orbit that fits a frame, the loudness memory at any frame rate,
//      the ring disc (the ripple's travel, the blast, the refill, Flow), the
//      cracks that cut a planet into chunks, the sun-and-planets system (how
//      many, fading in and out, orbits inside the frame, inner planets lapping
//      faster, speed quiet and loud at any frame rate, the flare and its
//      guards, a size change), and that all three overlay pages
//      load it after fireflies-swarm.js and before the factories. (Also runs
//      before section 4.)
//  11. Infall — overlay/infall.js under Node with a seeded random source: how
//      much falls into the black hole and how often, where things start, the
//      spiral speeding up close in, the population quiet and loud and its
//      limit, the syllable burst, the gulp and its guards, frame-rate
//      independence, long frames, the trail memory, and that all three overlay
//      pages load it after planets.js and before the factories. (Also runs
//      before section 4.)
//  12. Characters — overlay/characters.js under Node: what Blob, Owl and
//      Television share (the hearing, the bounce spring solved exactly at any
//      frame rate, the blink, the Bounce setting) and each character's pose
//      (size and bounce with the voice, staying in the frame on three pages,
//      quiet states), and that all three overlay pages load it after infall.js
//      and before the factories. (Also runs before section 4.)
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
  ok(T.ACTIVE_VIZ_NAMES.length === 51, `51 visualizers (${T.ACTIVE_VIZ_NAMES.length})`);
  ok(T.ACTIVE_VIZ_NAMES.indexOf('television') === T.ACTIVE_VIZ_NAMES.indexOf('owl') + 1 && T.ACTIVE_VIZ_NAMES.indexOf('owl') === T.ACTIVE_VIZ_NAMES.indexOf('blob') + 1
    && !T.VIZ_USES_3D.includes('television') && JSON.stringify(T.DEFAULT_PER_VIZ.television) === '{}' && T.sanitizeConfig({ activeViz: 'television' }).activeViz === 'television',
    'television is listed after blob and owl, as a 2D effect with no settings of its own');
  ok(T.ACTIVE_VIZ_NAMES.indexOf('black-hole') === T.ACTIVE_VIZ_NAMES.indexOf('pulse-rings') + 1 && !T.VIZ_USES_3D.includes('black-hole'), 'black-hole is listed after pulse-rings, as a 2D effect');
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
ok(JSON.stringify(T.defaultConfig().perViz.fireflies) === JSON.stringify({ density: 50, startleSensitivity: 50 }), 'fireflies defaults: density 50, startleSensitivity 50');
{
  const c = T.sanitizeConfig({ perViz: { fireflies: { density: 250, startleSensitivity: -4 } } });
  ok(c.perViz.fireflies.density === 100 && c.perViz.fireflies.startleSensitivity === 0, 'fireflies knobs clamp to 0..100');
  const old = T.sanitizeConfig({ perViz: { fireflies: { density: 80 } } });   // a config saved before this change
  ok(old.perViz.fireflies.density === 80 && old.perViz.fireflies.startleSensitivity === 50, 'an old saved fireflies config gains the new default');
}
ok(JSON.stringify(T.defaultConfig().perViz['pulse-rings']) === JSON.stringify({ sensitivity: 50, flow: 0, explodeSensitivity: 50, reconnectSeconds: 3 }),
  'pulse-rings defaults: sensitivity 50, flow 0, explodeSensitivity 50, reconnectSeconds 3');
{
  const c = T.sanitizeConfig({ perViz: { 'pulse-rings': { sensitivity: 250, flow: -4, explodeSensitivity: 250, reconnectSeconds: 99 } } });
  const p = c.perViz['pulse-rings'];
  ok(p.sensitivity === 100 && p.flow === 0 && p.explodeSensitivity === 100 && p.reconnectSeconds === 10, 'pulse-rings knobs clamp: the sliders to 0..100, reconnect to 10');
  const old = T.sanitizeConfig({ perViz: { 'pulse-rings': { sensitivity: 80, flow: 30 } } }).perViz['pulse-rings'];   // a config saved before this change
  ok(old.sensitivity === 80 && old.flow === 30 && old.explodeSensitivity === 50 && old.reconnectSeconds === 3, 'an old saved pulse-rings config gains the new defaults');
}
ok(JSON.stringify(T.defaultConfig().perViz.orbit) === JSON.stringify({ planets: 6, flareSensitivity: 50 }), 'orbit defaults: planets 6, flareSensitivity 50');
{
  const c = T.sanitizeConfig({ perViz: { orbit: { planets: 40, flareSensitivity: 250 } } }).perViz.orbit;
  const low = T.sanitizeConfig({ perViz: { orbit: { planets: -3, flareSensitivity: -4 } } }).perViz.orbit;
  ok(c.planets === 9 && c.flareSensitivity === 100 && low.planets === 0 && low.flareSensitivity === 0, 'orbit knobs clamp: planets to 0..9, sensitivity to 0..100');
  const old = T.sanitizeConfig({ perViz: { orbit: { density: 80 } } }).perViz.orbit;   // a config saved before this change
  ok(!('density' in old) && old.planets === 6 && old.flareSensitivity === 50, 'an old saved orbit config loses the retired density and gains the new defaults');
}
ok(JSON.stringify(T.defaultConfig().perViz['black-hole']) === JSON.stringify({ density: 50, gulpSensitivity: 50 }), 'black-hole defaults: density 50, gulpSensitivity 50');
{
  const c = T.sanitizeConfig({ activeViz: 'black-hole', perViz: { 'black-hole': { density: 250, gulpSensitivity: -4, nope: 1 } } });
  ok(c.activeViz === 'black-hole' && c.perViz['black-hole'].density === 100 && c.perViz['black-hole'].gulpSensitivity === 0 && !('nope' in c.perViz['black-hole']), 'black-hole is an accepted effect name, and its knobs clamp to 0..100');
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

  // Without an aim, a seeded blast is exactly what it was before the aim option existed
  // (recorded from the code as it stood then), so DNA shatters as it always did.
  {
    const p = runHelix(60, [quiet, hit, { secs: 0.5, peak: 0.3 }]).m.pieces;
    const sum = (f) => p.reduce((s, q) => s + f(q), 0);
    ok(p.length === 120 && near(sum((q) => q.ox), 459.405909, 1e-5) && near(sum((q) => q.oy), 238.736035, 1e-5)
      && near(sum((q) => Math.hypot(q.ox, q.oy)), 13232.615726, 1e-5) && near(sum((q) => q.rot), 3.383599, 1e-5)
      && near(p[0].ox, 24.661886, 1e-5) && near(p[0].oy, -26.227207, 1e-5), 'without an aim, a seeded blast is unchanged');
  }
  // With an aim, a blast pushes each piece the way the aim says; a jostle stays random.
  {
    const W = 1728, H = 624, scale = 4.8, seen = [];
    const cut = () => Array.from({ length: 20 }, (_, i) => ({ cx: W / 2 + (i - 10) * 6, cy: H / 2 + ((i % 5) - 2) * 9 }));
    const m = HX.createShatter({ random: HX.rng(3), aim: (x, y, w, h, s, random) => { seen.push([x, y, w, h, s, typeof random]); return 0; } });
    let now = 0;
    const run = (secs, peak) => { for (let k = 0, n = Math.round(secs * 60); k < n; k++) { now += 1000 / 60; m.step({ now, dt: 1 / 60, live: true, peak, threshold: 0.9, reconnectS: 100, W, H, scale, cut }); } };
    run(1, 0.3); run(0.05, 0.95); run(0.4, 0.3);
    const blown = m.pieces.map((p) => [p.ox, p.oy]);
    ok(seen.length === 20 && seen.every((a) => a[2] === W && a[3] === H && a[4] === scale && a[5] === 'function') && seen[0][0] === W / 2 - 60
      && blown.every(([ox, oy]) => ox > 5 * scale && Math.abs(oy) < 1e-6), 'an aim sends every piece of a blast the way it says');
    run(0.4, 0.3); run(0.05, 0.95); run(0.3, 0.3);
    ok(seen.length === 20 && m.pieces.some((p) => Math.abs(p.oy) > scale), 'a jostle is still random, and asks no aim');
    // A peak during the return blasts again, by the aim.
    const back = HX.createShatter({ random: HX.rng(3), aim: () => Math.PI / 2 });
    let t = 0, events = [];
    const go = (secs, peak) => { for (let k = 0, n = Math.round(secs * 60); k < n; k++) { t += 1000 / 60; const e = back.step({ now: t, dt: 1 / 60, live: true, peak, threshold: 0.9, reconnectS: 1, W, H, scale, cut }); if (e) events.push(e); } };
    go(1, 0.3); go(0.05, 0.95); go(1.6, 0.3);
    const before = back.pieces.map((p) => p.oy);
    go(0.05, 0.95); go(0.2, 0.3);
    ok(events.join() === 'shatter,return,jostle' && back.pieces.every((p, i) => p.oy > before[i] + scale), 'a peak during the return blasts again, by the aim');
  }

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

// ── 9. Fireflies swarm (pure; no browser) ────────────────────────────────────
console.log('\n[9] fireflies swarm');
await import('./overlay/fireflies-swarm.js');
{
  const S = globalThis.TimbreSwarm, HX = globalThis.TimbreHelix;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const SIZES = [[260, 130, 1], [1248, 624, 4.8], [1728, 624, 4.8]];
  const WIDE = SIZES[2];
  const isLit = (f) => f.env > 0.15;
  // script: [{ secs, loud (a number or a function of the time in seconds), peak, live = true, density, W, H }]
  function runSwarm(script, o = {}) {
    const [W0, H0, scale] = o.size ?? WIDE, fps = o.fps ?? 60;
    const swarm = o.swarm ?? S.createSwarm({ random: HX.rng(o.seed ?? 1) });
    let t = 0, bad = false, longHist = false, mostWaves = 0, path = 0, pinned = 0, flyTime = 0, longestPin = 0;
    const pinFor = new Map();
    const events = [], lit = [], glow = [], fired = [];
    for (const s of script) {
      for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) {
        t += 1 / fps;
        const W = s.W ?? W0, H = s.H ?? H0, before = swarm.flies.map((f) => [f, f.x, f.y]);
        const e = swarm.step({ dt: 1 / fps, live: s.live !== false, loud: typeof s.loud === 'function' ? s.loud(t) : (s.loud ?? 0),
          peak: s.peak === undefined ? 0 : s.peak, threshold: o.threshold ?? 0.9, density: s.density ?? o.density ?? 50, W, H, scale });
        if (e) events.push({ e, t });
        for (const f of swarm.flies) {
          if (!(f.x >= 0 && f.x <= W && f.y >= 0 && f.y <= H) || !(f.env >= 0 && f.env <= 1) || !(f.born >= 0 && f.born <= 1)) bad = true;
          if (f.hist.length > 11) longHist = true;                   // a streak is a handful of remembered places, whatever the frame rate
          // Held against the edge: on the line the swarm keeps every firefly inside.
          flyTime += 1 / fps;
          if (f.x <= S.HOLD || f.x >= W - S.HOLD || f.y <= S.HOLD || f.y >= H - S.HOLD) {
            const run = (pinFor.get(f) || 0) + 1 / fps;
            pinFor.set(f, run); pinned += 1 / fps; longestPin = Math.max(longestPin, run);
          } else pinFor.delete(f);
        }
        for (const [f, x, y] of before) path += Math.hypot(f.x - x, f.y - y);
        mostWaves = Math.max(mostWaves, swarm.waves.length);
        lit.push(swarm.flies.filter(isLit).length);
        glow.push(swarm.flies.reduce((sum, f) => sum + f.env, 0));
        fired.push(swarm.flashes);
      }
    }
    return { swarm, events, bad, longHist, lit, glow, fired, mostWaves, path, secs: t, pinnedShare: pinned / flyTime, longestPin };
  }
  const rate = (r, n = 35) => r.swarm.flashes / (n * r.secs);       // flashes per firefly per second

  ok(S.count(0) === 10 && S.count(50) === 35 && S.count(100) === 60 && S.count(250) === 60 && S.count(-5) === 10 && S.count(NaN) === 35, 'count: 10 at Density 0, 35 at 50, 60 at 100');
  {
    const r = runSwarm([{ secs: 0.02 }]);
    ok(r.swarm.flies.length === 35 && r.swarm.flies.every((f) => f.born < 0.1 && f.z >= 0 && f.z <= 1), 'the swarm starts with every firefly, fading in');
    const up = runSwarm([{ secs: 2 }, { secs: 1 / 60, density: 100 }]);
    const grown = up.swarm.flies.length, fresh = up.swarm.flies.filter((f) => f.born < 0.1).length;
    const down = runSwarm([{ secs: 2, density: 100 }, { secs: 1 / 60, density: 0 }]);
    const stillThere = down.swarm.flies.length;
    const settled = runSwarm([{ secs: 1, density: 0 }], { swarm: down.swarm });
    ok(grown === 60 && fresh === 25 && stillThere === 60 && settled.swarm.flies.length === 10 && !settled.bad,
      `Density up adds fireflies that fade in; Density down fades the extra ones out (${grown}, ${fresh} new; ${stillThere} then ${settled.swarm.flies.length})`);
  }

  // Loud talk with a yell every three seconds, on every page: nothing leaves the frame.
  const syllables = (t) => (t % 0.6 < 0.18 ? 0.7 : 0.05);
  {
    const yells = [];
    for (let i = 0; i < 6; i++) yells.push({ secs: 2.9, loud: syllables, peak: 0.4 }, { secs: 0.1, loud: 1, peak: 0.95 });
    const runs = SIZES.map((size) => runSwarm(yells, { size, density: 100 }));
    ok(runs.every((r) => !r.bad), 'every firefly stays inside the frame through talk and startles, on all three pages');
    ok(runs.every((r) => r.events.length === 6 && r.events.every((x) => x.e === 'startle')), 'each yell startles the swarm once');
    ok(runs.every((r) => r.mostWaves <= S.MAX_WAVES), `the ripples never pass ${S.MAX_WAVES} at once`);
  }

  // No sticking: "inside the frame" alone is guaranteed by the hold line, so this measures how
  // long fireflies spend ON that line. With no edge steering it is about 40% of the time, in
  // runs of up to 40 s; a steady full voice is the hardest case, because they turn fastest then.
  {
    const runs = SIZES.map((size) => runSwarm([{ secs: 120, loud: 1 }], { size }));
    ok(S.HOLD === 2, 'the hold line is 2 px inside the frame');
    const share = Math.max(...runs.map((r) => r.pinnedShare)), longest = Math.max(...runs.map((r) => r.longestPin));
    ok(share < 0.005 && longest < 0.6, `no firefly sticks to an edge, even at full voice (on the line ${(share * 100).toFixed(2)}% of the time, ${longest.toFixed(2)} s at most)`);
    const calm = SIZES.map((size) => runSwarm([{ secs: 120, loud: 0 }], { size }));
    ok(Math.max(...calm.map((r) => r.pinnedShare)) < 0.005 && Math.max(...calm.map((r) => r.longestPin)) < 0.6, 'nor in silence');
  }

  // Rhythm.
  const quiet = runSwarm([{ secs: 120, loud: 0 }]), micOff = runSwarm([{ secs: 120, live: false }]);
  ok(rate(quiet) > 0.09 && rate(quiet) < 0.18 && rate(micOff) > 0.09 && rate(micOff) < 0.18,
    `silent or muted, each firefly blinks about once every 8 s (${rate(quiet).toFixed(3)} and ${rate(micOff).toFixed(3)} a second)`);
  const steady = runSwarm([{ secs: 60, loud: 0.6 }]);
  ok(rate(steady) > 2 * rate(quiet), `a steady voice makes them blink more (${rate(steady).toFixed(3)} a second)`);
  {
    const r = runSwarm([{ secs: 60, loud: syllables }]);
    // A syllable starts every 0.6 s. Flashes spread evenly would put a third of them in its first
    // 0.2 s; the swarm's glow is its fireflies' brightness added up.
    let before = 0, after = 0, n = 0, early = 0, all = 0;
    for (let c = 10; c < 98; c++) {
      const i0 = c * 36;                                             // the frame the syllable starts on
      const mean = (from, to) => { let sum = 0; for (let i = from; i < to; i++) sum += r.glow[i]; return sum / (to - from); };
      before += mean(i0 - 12, i0); after += mean(i0 + 3, i0 + 18); n++;
      early += r.fired[i0 + 12] - r.fired[i0 - 2]; all += r.fired[i0 + 34] - r.fired[i0 - 2];   // from just before it starts: the first flashes come on its first frame
    }
    const share = r.lit.slice(360).reduce((a, b) => a + b, 0) / (r.lit.length - 360) / 35;
    ok(early / all > 0.5 && after / n > 1.3 * (before / n),
      `each syllable sets off a burst of flashes (${Math.round((100 * early) / all)}% of flashes start in its first 0.2 s; glow ${(before / n).toFixed(1)} before, ${(after / n).toFixed(1)} after)`);
    ok(share > 0.2 && share < 0.5, `talking keeps a rhythm: on average ${(share * 100).toFixed(0)}% of the swarm is lit, not all of it`);
    const r30 = runSwarm([{ secs: 60, loud: syllables }], { fps: 30 }), r144 = runSwarm([{ secs: 60, loud: syllables }], { fps: 144 });
    ok(Math.abs(rate(r30) - rate(r)) < 0.1 * rate(r) && Math.abs(rate(r144) - rate(r)) < 0.1 * rate(r),
      `and the rhythm under speech is the same at 30, 60 and 144 fps (${rate(r30).toFixed(3)}, ${rate(r).toFixed(3)}, ${rate(r144).toFixed(3)} flashes a second each)`);
  }

  // The ripple. Ten fireflies; the voice has been steady for five seconds, so the swarm is coupled.
  const coupled = (fps) => {
    const swarm = S.createSwarm({ random: HX.rng(3) }), [W, H, scale] = WIDE;
    const go = (secs) => { for (let i = 0, n = Math.round(secs * fps); i < n; i++) swarm.step({ dt: 1 / fps, live: true, loud: 0.6, peak: 0, threshold: 0.9, density: 0, W, H, scale }); };
    go(5);
    for (const f of swarm.flies) { f.period = 1e9; f.charge = 0; f.rest = 0; f.nudged = 0; }
    go(0.7);                                                         // any ripple still spreading dies out
    return { swarm, go };
  };
  for (const fps of [120, 10]) {
    const { swarm, go } = coupled(fps), fl = swarm.flies, flashes0 = swarm.flashes;
    for (const f of fl) { f.x = 1600; f.y = 560; }                   // park the rest far away
    const [a, b, d] = fl;
    a.x = 400; a.y = 300; a.charge = 1;                              // a fires on the next step
    b.x = 700; b.y = 300; b.charge = 0.5;                            // 300 px away
    d.x = 600; d.y = 300; d.charge = 0.5; d.rest = 5;                // resting: it ignores ripples
    go(0.45);
    const gain = (b.charge - 0.5) / (S.PUSH * swarm.sync);           // as a share of a full-strength nudge
    const after = b.charge;
    go(0.4);
    ok(swarm.flashes === flashes0 + 1 && gain > 0.45 && gain < 0.8 && near(b.charge, after, 1e-6) && near(d.charge, 0.5, 1e-6) && swarm.waves.length === 0,
      `a flash's ripple nudges a firefly it passes once, and not one that is resting (at ${fps} fps: ${(gain * 100).toFixed(0)}% of a full nudge)`);
  }
  {
    const { swarm, go } = coupled(120), fl = swarm.flies;
    for (const f of fl) { f.x = 1600; f.y = 560; }
    const [a, c] = fl;
    a.x = 400; a.y = 300; a.charge = 1;
    c.x = 500; c.y = 300; c.charge = 0.97;                           // the ripple will set this one off
    go(0.2);
    const strengths = swarm.waves.map((w) => w.strength).sort();
    ok(strengths.length === 2 && near(strengths[0], 0.5) && near(strengths[1], 1) && c.lit < 0.2, 'a flash set off by a ripple sends a ripple of half the strength');
    // The largest swarm in full flow, then every firefly's own rhythm switched off: the flashes
    // already on their way finish and the swarm falls still (about 60 more). If set-off flashes
    // sent full-strength ripples, it would keep itself going (over 400 in ten seconds).
    const all = S.createSwarm({ random: HX.rng(5) });
    const runAll = (secs) => { for (let i = 0, n = Math.round(secs * 120); i < n; i++) all.step({ dt: 1 / 120, live: true, loud: 0.9, peak: 0, threshold: 0.9, density: 100, W: WIDE[0], H: WIDE[1], scale: WIDE[2] }); };
    runAll(5);
    for (const f of all.flies) f.period = 1e9;
    const f0 = all.flashes;
    runAll(10);
    ok(all.flies.length === 60 && all.flashes - f0 > 0 && all.flashes - f0 <= 150 && all.waves.length === 0, `a chain reaction dies out (${all.flashes - f0} more flashes among ${all.flies.length} in ten seconds)`);
  }

  // The startle.
  const calm = { secs: 1.5, loud: 0.3, peak: 0.3 }, yell = { secs: 0.05, loud: 1, peak: 0.95 };
  {
    const r = runSwarm([calm, { secs: 1 / 60, loud: 1, peak: 0.95 }]);
    const fl = r.swarm.flies;
    const dot = (f) => f.kx * (f.x - 864) + f.ky * (f.y - 312);
    const away = fl.filter((f) => dot(f) > 0).length, inward = fl.filter((f) => dot(f) < 0).length;
    ok(r.events.length === 1 && r.events[0].e === 'startle' && near(r.events[0].t, 1.5 + 1 / 60, 1e-6) && r.swarm.startles === 1
      && fl.every((f) => f.lit < 0.02 && f.power === 1) && away >= 0.6 * fl.length && inward === 0 && r.swarm.waves.length === 0,
      `a peak startles the swarm: all flash, and they are pushed away from the middle (${away} of ${fl.length}; the rest are already at the edge)`);
    const later = runSwarm([{ secs: 4, loud: 0.3, peak: 0.3 }], { swarm: r.swarm });
    ok(!later.bad && later.swarm.flies.every((f) => Math.hypot(f.kx, f.ky) < 1), 'the push dies away and nobody leaves the frame');
    ok(runSwarm([calm, { secs: 5, loud: 0.6, peak: 0.6 }]).events.length === 0, 'talking below the threshold never startles');
    const held = runSwarm([calm, { secs: 2.5, loud: 1, peak: 0.95 }]).events.map((x) => x.t);
    ok(held.length === 3 && held.every((x, i) => i === 0 || x - held[i - 1] >= S.REARM_S - 1e-6), `a held peak startles again only after ${S.REARM_S} s (${held.map((x) => x.toFixed(2)).join(', ')})`);
    ok(runSwarm([calm, { secs: 2, live: false, peak: 0.95 }]).events.length === 0, 'no startle with the mic off');
    ok(runSwarm([calm, { secs: 2, loud: 1, peak: 1 }], { threshold: Infinity }).events.length === 0, 'no startle when the threshold is off');
    ok(runSwarm([calm, { secs: 1, loud: 1, peak: NaN }, { secs: 1, loud: 1, peak: null }]).events.length === 0, 'a missing peak never startles');
    ok(runSwarm([{ secs: 2, live: false, peak: 0.95 }, { secs: 0.5, loud: 1, peak: 0.95 }, { secs: 1, loud: 0.3, peak: 0.3 }]).events.length === 0
      && runSwarm([{ secs: 2, live: false }, calm, yell]).events.length === 1, 'the mic opening on a peak does not startle');
  }

  // The same at any frame rate.
  {
    const at = (fps) => runSwarm([{ secs: 120, loud: 0 }], { fps });
    const r30 = at(30), r165 = at(165), base = rate(quiet);
    ok(!r30.longHist && !quiet.longHist && !r165.longHist && r165.swarm.flies.every((f) => f.hist.length >= 2 && r165.secs - f.hist[0].t <= S.TRAIL_S + S.TRAIL_S / 8 + 1e-6), 'a streak remembers no more than eleven places over its 0.4 s, at 30, 60 and 165 fps');
    ok(Math.abs(rate(r30) - base) < 0.25 * base && Math.abs(rate(r165) - base) < 0.25 * base, `the blink rate is the same at 30, 60 and 165 fps (${rate(r30).toFixed(3)}, ${base.toFixed(3)}, ${rate(r165).toFixed(3)})`);
    const speed = (r) => r.path / (35 * r.secs);
    ok(Math.abs(speed(r30) - speed(quiet)) < 0.03 * speed(quiet) && Math.abs(speed(r165) - speed(quiet)) < 0.03 * speed(quiet)
      && speed(quiet) > 7 * 4.8 && speed(quiet) < 19 * 4.8, `they fly at the same speed at 30, 60 and 165 fps (${speed(r30).toFixed(1)}, ${speed(quiet).toFixed(1)}, ${speed(r165).toFixed(1)} px a second)`);
    const startle = (fps) => runSwarm([calm, yell], { fps }).events[0].t;
    ok(near(startle(30), 1.5, 2 / 30) && near(startle(165), 1.5, 2 / 165), 'the startle comes at the same moment at 30 and 165 fps');
  }

  // A size change keeps the swarm: everyone moves to the same relative place.
  {
    const r = runSwarm([{ secs: 3, loud: 0.5 }]);
    const where = r.swarm.flies.map((f) => [f.x / 1728, f.y / 624]);
    const small = runSwarm([{ secs: 1 / 60, loud: 0.5, W: 864, H: 312 }], { swarm: r.swarm });
    const moved = small.swarm.flies.every((f, i) => Math.abs(f.x / 864 - where[i][0]) < 0.03 && Math.abs(f.y / 312 - where[i][1]) < 0.05);
    ok(!small.bad && small.swarm.flies.length === 35 && moved && small.swarm.flies.every((f) => f.hist.length <= 2) && small.swarm.waves.every((w) => w.age < 0.02),
      'a size change keeps every firefly, at the same relative place, with no streak left from the old frame');
    ok(!runSwarm([{ secs: 5, loud: syllables, W: 864, H: 312 }], { swarm: small.swarm }).bad, 'and they stay inside the new frame');
  }

  // One flash, in quiet: up quickly, down slowly.
  {
    const r = runSwarm([{ secs: 1 }], { density: 0 });
    const f = r.swarm.flies[0];
    f.period = 1e9; f.charge = 1; f.rest = 0;
    const env = [];
    for (let i = 0; i < 90; i++) { r.swarm.step({ dt: 1 / 60, live: true, loud: 0, peak: 0, threshold: 0.9, density: 0, W: 1728, H: 624, scale: 4.8 }); env.push(f.env); }
    const top = Math.max(...env), topAt = env.indexOf(top) / 60;
    ok(near(f.power, 0.55) && top > 0.25 && top < 0.42 && topAt < 0.15 && env[89] < 0.01 && env[6] > env[40],
      `a quiet flash rises within ${topAt.toFixed(2)} s to ${top.toFixed(2)} and fades inside a second and a half`);
  }

  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="fireflies-swarm.js"');
    order.push(pos > html.indexOf('src="comet-flight.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load fireflies-swarm.js after comet-flight.js and before the factories');
}

// ── 10. Planets (pure; no browser) ───────────────────────────────────────────
console.log('\n[10] planets');
await import('./overlay/planets.js');
{
  const P = globalThis.TimbrePlanets, HX = globalThis.TimbreHelix;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const SIZES = [[260, 130, 1], [1248, 624, 4.8], [1728, 624, 4.8]];
  const TURN = 2 * Math.PI;

  // The tilted projection.
  {
    const a = P.place(100, 0, 0.36, -0.28), top = P.place(100, -Math.PI / 2, 0.36, 0), near1 = P.place(100, Math.PI / 2, 0.36, 0);
    ok(near(a.x, 100 * Math.cos(-0.28)) && near(a.y, 100 * Math.sin(-0.28)) && near(a.z, 0) && near(top.y, -36) && near(top.z, -1) && near(near1.y, 36) && near(near1.z, 1),
      'place: a point on a tilted, leaning circle; the far half is up and behind, the near half down and in front');
    let fits = true, tight = true;
    for (const [W, H, scale] of SIZES) {
      for (const [k, roll] of [[0.36, -0.28], [0.29, 0.14], [0.41, -0.36], [0.36, 0]]) {
        const edge = 9 * scale, r = P.fit(W, H, edge, k, roll), reach = P.reach(k, roll);
        let mx = 0, my = 0;
        for (let i = 0; i < 720; i++) { const p = P.place(r, i / 720 * TURN, k, roll); mx = Math.max(mx, Math.abs(p.x)); my = Math.max(my, Math.abs(p.y)); }
        if (mx > W / 2 - edge + 1e-6 || my > H / 2 - edge + 1e-6) fits = false;
        if (Math.min(W / 2 - edge - mx, H / 2 - edge - my) > 0.01 * r) tight = false;
        if (!near(reach.x * r, mx, 0.002 * r) || !near(reach.y * r, my, 0.002 * r)) fits = false;
      }
    }
    ok(fits && tight, 'fit: the largest orbit that stays inside the frame, on every page and for every tilt');
  }

  // The loudness memory.
  {
    const run = (fps) => {
      const e = P.createEcho(1);
      let t = 0, worst = 0, most = 0;
      for (let k = 0; k < 4 * fps; k++) {
        t += 1 / fps; e.note(t, t);
        most = Math.max(most, e.size);
        if (t > 1.2) for (const d of [0, 0.3, 0.95]) worst = Math.max(worst, Math.abs(e.heard(t, d) - (t - d)));
      }
      return { worst, most, old: e.heard(t, 50), now: e.heard(t, 0), t };
    };
    const r30 = run(30), r60 = run(60), r144 = run(144);
    ok([r30, r60, r144].every((r) => r.worst < 1e-9 && near(r.now, r.t)), 'echo: what was heard a moment ago, exactly, at 30, 60 and 144 fps');
    const still = P.createEcho(1);
    for (let i = 0; i < 5000; i++) still.note(2, i);
    ok(still.size === 1 && still.heard(2, 0) === 4999, 'echo: a moment noted again and again is kept once, with its last level');
    ok(r30.most <= 30 * 1.2 + 3 && r144.most <= 144 * 1.2 + 3 && r60.old > r60.t - 1.3 && r60.old <= r60.t - 1 && P.createEcho(1).heard(5, 0.2) === 0,
      `echo: its memory is bounded (${r30.most}, ${r60.most}, ${r144.most} notes), older than that gives the oldest, and none gives silence`);
  }

  // The ring disc.
  const ring = (fps, script, o = {}) => {
    const rings = o.rings ?? P.createRings();
    let t = 0; const log = [];
    for (const s of script) {
      for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) {
        t += 1 / fps;
        // A blast or a refill named on a stage happens at the start of its first frame, unless the stage says how long before that frame's end (blastAgo, refillAgo).
        const first = k === 0;
        rings.step({ dt: 1 / fps, level: s.level ?? 0, flow: s.flow ?? 0,
          blastAgo: first && s.blast ? (s.blastAgo ?? 1 / fps) : undefined, refillAgo: first && s.refill ? (s.refillAgo ?? 1 / fps) : undefined });
        log.push({ t, level: rings.bands.map((b) => b.level), show: rings.bands.map((b) => b.show), radius: rings.bands.map((b) => b.radius) });
      }
    }
    return { rings, log, last: log[log.length - 1] };
  };
  ok(near(P.outer(0), 3.1) && near(P.outer(100), 4.1) && near(P.outer(250), 4.1) && near(P.outer(NaN), 3.1) && near(P.gain(0), 0.6) && near(P.gain(50), 1.15) && near(P.gain(100), 1.7),
    'Flow sets how far the rings reach (3.1 to 4.1 planet radii); Sensitivity sets the ripple gain (0.6 to 1.7)');
  ok(P.ringRest(0.3) > 0.9 && P.ringRest(0.58) < 0.1 && P.ringRest(0.75) > 0.5 && P.ringRest(0.05) < P.ringRest(0.3) && [0, 0.5, 1].every((u) => P.ringRest(u) >= 0 && P.ringRest(u) <= 1),
    'the disc at rest: a bright broad ring, a dark gap, a second ring');
  {
    const r = ring(60, [{ secs: 2 }]);
    const b = r.rings.bands;
    ok(b.length === 30 && b.every((x, i) => near(x.u, (i + 0.5) / 30) && x.show === 1 && x.level === 0 && x.lift === 0 && near(x.radius, 1.34 + x.u * (3.1 - 1.34)))
      && b.every((x, i) => i === 0 || x.radius > b[i - 1].radius), 'at rest: 30 whole bands from 1.34 to 3.1 planet radii, none lit, none lifted');
    const wide = ring(60, [{ secs: 1, flow: 100 }]).rings.bands;
    ok(near(wide[0].radius, 1.34 + (0.5 / 30) * (4.1 - 1.34)) && near(wide[29].radius, 1.34 + (29.5 / 30) * (4.1 - 1.34)), 'Flow at 100 spreads the same 30 bands out to 4.1 planet radii');
  }
  // A syllable: a tenth of a second of voice, then quiet. It reaches each band in turn.
  {
    const arrive = (fps) => {
      const r = ring(fps, [{ secs: 1 }, { secs: 0.1, level: 1 }, { secs: 1.6 }]);
      const peakAt = (i) => { let best = 0, at = 0; for (const f of r.log) if (f.level[i] > best) { best = f.level[i]; at = f.t; } return { best, at }; };
      const mid = r.log.find((f) => f.t >= 1.05 + 0.5 * 0.95);
      return { inner: peakAt(0), outer: peakAt(29), mid, bad: r.log.some((f) => f.level.some((v) => !(v >= 0 && v <= 1))) };
    };
    const a60 = arrive(60), a30 = arrive(30), a144 = arrive(144), a10 = arrive(10);
    const travel = (a) => a.outer.at - a.inner.at;
    ok(a60.inner.best === 1 && a60.outer.best === 1 && near(travel(a60), 0.95 * 29 / 30, 2 / 60) && !a60.bad,
      `a syllable reaches the outer edge ${travel(a60).toFixed(3)} s after the inner one`);
    ok(near(travel(a30), travel(a60), 2 / 30) && near(travel(a144), travel(a60), 2 / 60) && near(travel(a10), travel(a60), 0.11) && a10.outer.best > 0.5,
      `at the same speed at 30, 144 and 10 fps (${travel(a30).toFixed(3)}, ${travel(a144).toFixed(3)}, ${travel(a10).toFixed(3)} s)`);
    ok(a60.mid.level[14] > 0.8 && a60.mid.level[0] < 0.05 && a60.mid.level[29] < 0.05, 'while it crosses the middle of the disc, the inner and outer bands are dark: the ripple travels');
    const lifted = ring(60, [{ secs: 1 }, { secs: 0.1, level: 1 }, { secs: 0.4 }]).rings.bands;
    const top = lifted.reduce((m, b) => (b.lift > m.lift ? b : m));
    ok(top.lift > 0.5 && top.lift <= 1 && near(top.lift, top.level * (0.4 + 0.6 * top.u)), 'a lit band is lifted off the disc, the outer ones farther');
  }
  // A blast thins the rings from the inside out and swells them; a refill fills them the same way.
  {
    const steps = [{ secs: 1 }, { secs: 0.1, blast: true }];
    const early = ring(60, steps).last;
    const blown = ring(60, [...steps, { secs: 2 }]);
    const most = Math.max(...ring(60, [...steps, { secs: 2 }]).log.map((f) => Math.max(...f.radius.map((v, i) => v / (1.34 + (i + 0.5) / 30 * 1.76)))));
    ok(early.show[0] < 0.85 && early.show[29] === 1 && blown.last.show.every((v) => near(v, P.GHOST, 0.01)),
      `a blast thins the rings to ${P.GHOST}, the inner ones first`);
    ok(most > 1.25 && most < 1.4 && blown.last.radius.every((v, i) => near(v, 1.34 + (i + 0.5) / 30 * 1.76, 1e-6)), `and swells each band outward as it passes (by up to ${((most - 1) * 100).toFixed(0)}%), after which it settles where it was`);
    const filling = ring(60, [{ secs: 0.3, refill: true }], { rings: blown.rings }).last;
    const full = ring(60, [{ secs: 2.5 }], { rings: blown.rings }).last;
    ok(filling.show[0] > filling.show[29] + 0.2 && full.show.every((v) => v > 0.99), 'a refill fills the rings back in, the inner ones first');
    // Read a fifth of a second after the blast, while the outer bands are still falling: a band
    // that started thinning a frame late or early would show here.
    const at = (fps) => ring(fps, [{ secs: 1 }, { secs: 0.2, blast: true }]).last.show;
    const s10 = at(10), s30 = at(30), s150 = at(150);   // rates at which a fifth of a second is a whole number of frames
    ok(s30.every((v, i) => near(v, s150[i], 1e-6)) && s10.every((v, i) => near(v, s150[i], 1e-6)) && s30[0] < 0.7 && s30[29] === 1, 'exactly the same at 10, 30 and 150 fps');
    // A blast or a refill that happened part of the way through a frame counts from that moment.
    // At ten frames a second, a blast 0.04 s before the end of its frame, read 0.3 s after that frame:
    // the same as a blast 0.34 s ago at two hundred frames a second.
    const lateA = ring(10, [{ secs: 1 }, { secs: 0.1, blast: true, blastAgo: 0.04 }, { secs: 0.3 }]).last.show;
    const lateB = ring(200, [{ secs: 1 }, { secs: 0.34, blast: true }]).last.show;
    ok(lateA.every((v, i) => near(v, lateB[i], 1e-6)) && lateA[0] < 0.6, 'a blast part of the way through a long frame thins the rings from that moment');
    // The same for a refill, 0.1 s and 0.03 s before the end of its frame, read 0.3 s after that frame.
    const thinned = () => ring(200, [{ secs: 1 }, { secs: 2, blast: true }]).rings;
    const fillOf = (fps, ago, more) => ring(fps, [{ secs: 1 / fps, refill: true, refillAgo: ago }, { secs: more }], { rings: thinned() }).last.show;
    const fillA = fillOf(10, 0.1, 0.3), fillB = fillOf(10, 0.03, 0.3), refA = fillOf(200, 1 / 200, 0.4 - 1 / 200), refB = fillOf(200, 1 / 200, 0.33 - 1 / 200);
    ok(fillA.every((v, i) => near(v, refA[i], 1e-6)) && fillB.every((v, i) => near(v, refB[i], 1e-6)) && fillB[0] < fillA[0] - 0.02 && fillA[0] > 0.8,
      'a refill counts from the moment it began, however long the frame');
    // A second blast while the rings are still swollen from the first (a very short reconnect
    // wait): no band may spring back to its resting radius in one frame.
    {
      const rings = P.createRings();
      const radius = () => rings.bands.map((b) => b.radius);
      let most = 0, last = null;
      const go = (secs, blast) => { for (let k = 0, n = Math.round(secs * 144); k < n; k++) { rings.step({ dt: 1 / 144, level: 0, flow: 0, blastAgo: blast && k === 0 ? 0 : undefined }); const r = radius(); if (last) for (let i = 0; i < r.length; i++) most = Math.max(most, Math.abs(r[i] - last[i])); last = r; } };
      go(0.5); go(0.45, true); go(1.5, true);
      ok(most < 0.05 && rings.bands.every((b) => near(b.radius, 1.34 + b.u * 1.76, 1e-6)), `a second blast while the rings are still swollen moves no band more than ${most.toFixed(3)} planet radii in a frame`);
    }
    const voiced = ring(60, [...steps, { secs: 1 }, { secs: 0.1, level: 1 }, { secs: 0.3 }]).last;
    ok(Math.max(...voiced.level) > 0.9, 'thinned rings still carry the voice');
    const again = ring(60, [{ secs: 0.5 }], { rings: (() => { const r = P.createRings(); r.step({ dt: 0.5, level: 0, flow: 0, blastAgo: 0.5 }); r.reset(); return r; })() }).last;
    ok(again.show.every((v) => v === 1), 'a reset puts every band back whole');
  }

  // The cracks.
  {
    const R = 115, pieces = P.crack(R, 22, HX.rng(4));
    const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; s += p[i][0] * q[1] - q[0] * p[i][1]; } return s / 2; };
    const convex = (p) => { let sign = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length]; const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (Math.abs(z) < 1e-9) continue; if (!sign) sign = Math.sign(z); else if (Math.sign(z) !== sign) return false; } return true; };
    const areas = pieces.map((p) => Math.abs(area(p.pts))), total = areas.reduce((a, b) => a + b, 0);
    const disc = 0.5 * 56 * R * R * Math.sin(TURN / 56);
    ok(pieces.length === 22 && near(total, disc, 1e-6 * disc) && pieces.every((p) => convex(p.pts) && p.pts.every((v) => Math.hypot(v[0], v[1]) <= R * (1 + 1e-9))),
      'crack: 22 convex chunks that tile the planet exactly');
    const mean = total / 22;
    // A sliver is a chunk much longer than it is wide: its area is a small share of the circle its longest reach would sweep.
    const stout = pieces.map((p, i) => { let far = 0; for (const v of p.pts) far = Math.max(far, Math.hypot(v[0] - p.cx, v[1] - p.cy)); return areas[i] / (Math.PI * far * far); });
    ok(Math.min(...areas) > 0.3 * mean && Math.max(...areas) < 2.2 * mean && Math.min(...stout) > 0.12,
      `no slivers: the smallest chunk is ${(Math.min(...areas) / mean).toFixed(2)} of the average, the thinnest fills ${(Math.min(...stout) * 100).toFixed(0)}% of its own reach`);
    const again = P.crack(R, 22, HX.rng(4)), other = P.crack(R, 22, HX.rng(5));
    ok(JSON.stringify(again) === JSON.stringify(pieces) && JSON.stringify(other) !== JSON.stringify(pieces)
      && pieces.every((p) => near(p.rm, Math.hypot(p.cx, p.cy)) && p.rm < R), 'crack: the same seed gives the same chunks');
    for (const seed of [1, 2, 3, 6, 7, 8, 9, 10]) {
      const ps = P.crack(R, 22, HX.rng(seed));
      if (ps.length !== 22 || !ps.every((p) => convex(p.pts))) { ok(false, `crack: seed ${seed} gives 22 convex chunks`); }
    }
  }

  // The sun-and-planets system.
  {
    const WIDE = SIZES[2];
    // script: [{ secs, loud (a number or a function of the time in seconds), peak, live = true, count, W, H }]
    const orbit = (script, o = {}) => {
      const [W0, H0, scale] = o.size ?? WIDE, fps = o.fps ?? 60;
      const sys = o.sys ?? P.createSystem({ random: HX.rng(o.seed ?? 1) });
      let t = 0, bad = false, mostStep = 0; const events = [];
      for (const s of script) {
        for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) {
          t += 1 / fps;
          const W = s.W ?? W0, H = s.H ?? H0, was = sys.planets.map((p) => [p, p.turned]);
          const e = sys.step({ dt: 1 / fps, live: s.live !== false, loud: typeof s.loud === 'function' ? s.loud(t) : (s.loud ?? 0), peak: s.peak ?? 0,
            threshold: o.threshold ?? 0.9, count: s.count ?? o.count ?? 6, W, H, scale });
          if (e) events.push({ e, t });
          for (const p of sys.planets) {
            if (!(Math.abs(p.x) + p.r <= W / 2 && Math.abs(p.y) + p.r <= H / 2) || !(p.born >= 0 && p.born <= 1) || !(p.th >= 0 && p.th < TURN) || !(p.r > 0)) bad = true;
          }
          for (const [p, turned] of was) mostStep = Math.max(mostStep, p.turned - turned);
        }
      }
      return { sys, events, bad, mostStep, secs: t };
    };
    const here = (r) => r.sys.planets.filter((p) => !p.leaving);

    ok(P.planetCount(0) === 0 && P.planetCount(6) === 6 && P.planetCount(9) === 9 && P.planetCount(12) === 9 && P.planetCount(-3) === 0 && P.planetCount(2.6) === 3 && P.planetCount(NaN) === 6,
      'planetCount: 0 to 9, and 6 when the setting is missing');
    {
      const r = orbit([{ secs: 0.02 }]);
      const ps = r.sys.planets, scale = WIDE[2];
      ok(ps.length === 6 && ps.every((p) => p.born < 0.1) && ps.every((p, i) => i === 0 || p.a > ps[i - 1].a) && near(ps[0].a, 2.7 * 12 * scale) && near(ps[5].a, r.sys.aMax)
        && r.sys.aMax > 80 * scale, `the system starts with six planets fading in, spaced from 2.7 sun radii out to the largest orbit that fits (${(r.sys.aMax / scale).toFixed(0)} px × scale)`);
      ok(ps.every((p) => p.k >= 0.29 && p.k <= 0.41 && p.roll >= -0.36 && p.roll <= -0.04 && Math.abs(p.axis) <= 0.6) && new Set(ps.map((p) => p.k.toFixed(3))).size === 6
        && new Set(ps.map((p) => p.roll.toFixed(3))).size === 6 && new Set(ps.map((p) => p.axis.toFixed(3))).size === 6,
        'every orbit is tilted and leans a little differently, and every planet leans on its own axis');
      ok(ps[3].ringed && ps.filter((p) => p.ringed).length === 1 && ps.filter((p) => p.striped).length === 4 && ps.every((p) => p.size >= 2.9 * scale && p.size <= 6.9 * scale), 'the fourth planet has rings; two in three have cloud bands');
      const up = orbit([{ secs: 2 }, { secs: 1 / 60, count: 9 }]);
      const down = orbit([{ secs: 2, count: 9 }, { secs: 1 / 60, count: 3 }]);
      const listed = down.sys.planets.length, leaving = down.sys.planets.filter((p) => p.leaving).length;
      const settled = orbit([{ secs: 1, count: 3 }], { sys: down.sys });
      // The same system carries on below, so what it holds now is noted first.
      const stayed = settled.sys.planets.length, respaced = here(settled).map((p) => p.a), spread = settled.sys.aMax;
      const none = orbit([{ secs: 1.2, count: 0 }], { sys: settled.sys });
      ok(up.sys.planets.length === 9 && up.sys.planets.filter((p) => p.born < 0.1).length === 3 && listed === 9 && leaving === 6 && stayed === 3
        && none.sys.planets.length === 0 && !up.bad && !down.bad && !settled.bad && !none.bad, 'more planets fade in; fewer fade out and are then gone; none leaves the sun alone');
      ok(near(respaced[0], 2.7 * 12 * scale, 0.02 * scale) && respaced[2] > 0.9 * spread, 'the planets that stay spread back out over the whole system');
    }
    // Full voice with a yell every three seconds, nine planets, on every page: nothing leaves the frame.
    {
      const yells = Array.from({ length: 20 }, () => [{ secs: 2.9, loud: 1 }, { secs: 0.1, loud: 1, peak: 0.95 }]).flat();
      const runs = SIZES.map((size) => orbit(yells, { size, count: 9 }));
      ok(runs.every((r) => !r.bad && r.events.length === 20), 'nine planets at full voice, with a flare every three seconds, stay inside the frame on all three pages');
    }
    // Speed.
    {
      const lap = TURN / 9;
      const silent = orbit([{ secs: 20 }]), loud = orbit([{ secs: 20, loud: 1 }]), steady = orbit([{ secs: 30, loud: 0.5 }]);
      const ps = here(steady);
      ok(near(here(silent)[0].turned, 20 * lap * 0.4, 0.01 * 20 * lap * 0.4) && near(silent.sys.speed, 0.4, 1e-6),
        `silent, the innermost planet laps in ${(TURN / (here(silent)[0].turned / 20)).toFixed(1)} s`);
      ok(near(loud.sys.speed, 3.7, 0.01) && here(loud)[0].turned > 8.5 * here(silent)[0].turned, `at full voice it goes ${(here(loud)[0].turned / here(silent)[0].turned).toFixed(1)} times as fast`);
      ok(ps.every((p, i) => i === 0 || p.turned < ps[i - 1].turned) && near(ps[0].turned / ps[5].turned, Math.pow(steady.sys.aMax / steady.sys.aMin, 0.8), 0.05 * ps[0].turned / ps[5].turned),
        `inner planets lap faster: the innermost turns ${(ps[0].turned / ps[5].turned).toFixed(2)} times as far as the outermost`);
      // Syllables of 0.2 s every 0.6 s. Their edges fall on frame boundaries at all three rates (the
      // sound a frame hears is the sound of the stretch it covers), so each rate hears the same thing.
      const syllables = (fps) => (t) => ((Math.round(t * 120) - 120 / fps + 72000) % 72 < 24 ? 0.9 : 0);
      const [a30, a60, a120] = [30, 60, 120].map((fps) => here(orbit([{ secs: 10.2, loud: syllables(fps) }], { fps }))[0].turned);
      ok(near(a30, a60, 0.01 * a60) && near(a120, a60, 0.01 * a60), `the same at 30, 60 and 120 fps (${a30.toFixed(3)}, ${a60.toFixed(3)}, ${a120.toFixed(3)} rad in ten seconds of speech)`);
      const slow = orbit([{ secs: 5, loud: 1 }, { secs: 0.5, loud: 1, peak: 0.95 }], { fps: 10, count: 9 });
      ok(!slow.bad && slow.mostStep < 0.5 * TURN && slow.events.length === 1, `at ten frames a second, at full voice and flaring, no planet turns more than ${(slow.mostStep / TURN).toFixed(2)} of a lap in a frame`);
      const p = here(orbit([{ secs: 40, loud: 1 }]))[0];
      const sizes = []; const sys = P.createSystem({ random: HX.rng(1) });
      for (let i = 0; i < 2400; i++) { sys.step({ dt: 1 / 60, live: true, loud: 1, peak: 0, threshold: 0.9, count: 6, W: 1728, H: 624, scale: 4.8 }); sizes.push([sys.planets[0].r, sys.planets[0].z]); }
      const big = sizes.reduce((m, s) => (s[0] > m[0] ? s : m)), small = sizes.reduce((m, s) => (s[0] < m[0] ? s : m));
      ok(p.turned > 4 * TURN && near(big[0] / small[0], 1.5, 0.02) && big[1] > 0.98 && small[1] < -0.98, 'a planet is drawn largest at its nearest and smallest at its farthest');
    }
    // The flare.
    {
      const one = orbit([{ secs: 1.5, loud: 0.5 }, { secs: 0.1, loud: 0.5, peak: 0.95 }]);
      const before = orbit([{ secs: 1.5, loud: 0.5 }]).sys.speed, surge = one.sys.speed;   // the same system carries on below
      const after = orbit([{ secs: 3, loud: 0.5 }], { sys: one.sys });
      ok(one.events.length === 1 && one.events[0].e === 'flare' && near(one.events[0].t, 1.5, 2 / 60) && one.sys.flares === 1 && surge > before + 1.8
        && near(after.sys.speed, before, 0.05) && after.sys.flare < 0.01, 'a peak flares the sun and the planets surge, then settle');
      const held = orbit([{ secs: 1.5, loud: 0.5 }, { secs: 2.5, loud: 0.5, peak: 0.95 }]);
      ok(held.events.length === 3 && near(held.events[1].t - held.events[0].t, 1, 2 / 60), 'a held yell flares again only once a second');
      const opened = orbit([{ secs: 2, peak: 0.95, live: false }, { secs: 0.3, loud: 0.5, peak: 0.95 }]);
      const off = orbit([{ secs: 5, loud: 0.5, peak: 1 }], { threshold: Infinity });
      const talk = orbit([{ secs: 30, loud: 1, peak: 0.7 }]);
      ok(opened.events.length === 0 && off.events.length === 0 && talk.events.length === 0, 'no flare when the mic opens on a peak, at sensitivity 0, or from talking');
      const micOff = orbit([{ secs: 2, loud: 1 }, { secs: 3, loud: 1, live: false }]);
      ok(near(micOff.sys.speed, 0.4, 0.01) && micOff.sys.loud < 0.01, 'mic off, the planets drift at their slowest whatever the sound arrays hold');
    }
    // What the review found untested.
    {
      // A flare's push on the planets, at any frame rate: how far the innermost planet gets in five seconds with one flare in them.
      const run = (fps) => here(orbit([{ secs: 2, loud: 0.5 }, { secs: 0.1, loud: 0.5, peak: 0.95 }, { secs: 2.9, loud: 0.5 }], { fps }))[0].turned;
      const t10 = run(10), t30 = run(30), t144 = run(144);
      ok(near(t10, t144, 0.004 * t144) && near(t30, t144, 0.004 * t144), `a flare pushes the planets as far at 10, 30 and 144 fps (${t10.toFixed(3)}, ${t30.toFixed(3)}, ${t144.toFixed(3)} rad)`);
      const gap = (fps) => { const r = orbit([{ secs: 1.5, loud: 0.5 }, { secs: 2.6, loud: 0.5, peak: 0.95 }], { fps }); return r.events[1].t - r.events[0].t; };
      ok(near(gap(10), 1, 1e-6) && near(gap(30), 1, 1e-6) && near(gap(60), 1, 1e-6), 'a held yell flares again after exactly one second, at 10, 30 and 60 fps');
      const reopened = orbit([{ secs: 3, loud: 0.5 }, { secs: 2, loud: 0.5, live: false }, { secs: 0.3, loud: 0.5, peak: 0.95 }]);
      ok(reopened.events.length === 0, 'talk, mute, then unmute on a yell: no flare (the wait starts again when the mic opens)');
      // A frame too small to hold any orbit, then the usual one: nothing is left broken.
      const tiny = orbit([{ secs: 1, loud: 0.5 }, { secs: 1 / 60, loud: 0.5, H: 80 }, { secs: 2, loud: 0.5 }]);
      ok(!tiny.bad && tiny.sys.planets.length === 6 && tiny.sys.planets.every((p) => Number.isFinite(p.th) && Number.isFinite(p.x) && Number.isFinite(p.turned) && p.a > 0), 'a frame too small for any orbit breaks nothing: the planets carry on when it grows back');
      // Dragging the Planets slider: a planet on its way out is brought back before a new one is made.
      const drag = orbit([{ secs: 2 }, { secs: 1 / 60, count: 3 }, { secs: 1 / 60, count: 6 }]);
      let most = 0; const sys = P.createSystem({ random: HX.rng(1) });
      for (let i = 0; i < 600; i++) { sys.step({ dt: 1 / 60, live: true, loud: 0.5, peak: 0, threshold: 0.9, count: [9, 2, 7, 1, 9, 4][Math.floor(i / 3) % 6], W: 1728, H: 624, scale: 4.8 }); most = Math.max(most, sys.planets.length); }
      ok(drag.sys.planets.length === 6 && drag.sys.planets.every((p) => !p.leaving) && most <= 9, `a quick drag of Planets never leaves more than nine planets (${most} at most), and brings back the ones on their way out`);
      // Depth: how near a planet really is, which is what decides which of two overlapping planets is in front.
      const deep = orbit([{ secs: 3, loud: 0.5 }]).sys.planets;
      ok(deep.every((p) => near(p.depth, p.a * p.z * Math.sqrt(1 - p.k * p.k), 1e-9)) && deep.some((p, i) => deep.some((q, j) => i !== j && (p.z - q.z) * (p.depth - q.depth) < 0)),
        'each planet reports how near it really is, which is not the same order as how far round its own orbit it is');
      // The ringed planet's rings, when it is the outermost, stay inside the frame too.
      const ringed = SIZES.every(([W, H, scale]) => {
        const s = P.createSystem({ random: HX.rng(2) }); let okAll = true;
        for (let i = 0; i < 3600; i++) { s.step({ dt: 1 / 60, live: true, loud: 1, peak: 0, threshold: 0.9, count: 4, W, H, scale }); const p = s.planets[3]; if (!(Math.abs(p.x) + 1.9 * p.r <= W / 2 && Math.abs(p.y) + 1.9 * p.r <= H / 2)) okAll = false; }
        return okAll && s.planets[3].ringed;
      });
      ok(ringed, 'with four planets the ringed one is outermost, and its rings stay inside the frame on all three pages');
    }
    // The box shrinks: a planet that is still inside the new frame carries on from where it is
    // (its orbit tightens over the next second), and only one left outside is brought in at once.
    {
      const r = orbit([{ secs: 5, loud: 0.6 }], { count: 9 });
      const was = r.sys.planets.map((p) => ({ x: p.x, y: p.y, r: p.r }));
      orbit([{ secs: 1 / 60, loud: 0.6, W: 1248, H: 360 }], { sys: r.sys, count: 9 });   // a frame not much more than half as tall
      const edge = 9 * 4.8;
      const stayed = [], brought = [];
      r.sys.planets.forEach((p, i) => { const d = Math.hypot(p.x - was[i].x, p.y - was[i].y); (Math.abs(was[i].x) <= 624 - edge && Math.abs(was[i].y) <= 180 - edge ? stayed : brought).push(d); });
      ok(stayed.length >= 3 && brought.length >= 1 && Math.max(...stayed) < 15, `when the frame shrinks, a planet still inside it moves no more than ${Math.max(...stayed).toFixed(1)} px that frame (${brought.length} left outside were brought in)`);
    }
    // The box changes size: every planet is inside the new frame at once, and none jumps round its orbit.
    {
      const r = orbit([{ secs: 5, loud: 0.6 }], { count: 9 });
      const before = r.sys.planets.map((p) => p.th), wideMax = r.sys.aMax;   // the same system carries on, so each stage is noted as it ends
      const shrunk = orbit([{ secs: 1 / 60, loud: 0.6, W: 1248, H: 480 }], { sys: r.sys, count: 9 });
      const moved = shrunk.sys.planets.map((p, i) => { const d = Math.abs(p.th - before[i]); return Math.min(d, TURN - d); });   // the short way round: an angle may wrap past 2π
      const later = orbit([{ secs: 3, loud: 0.6, W: 1248, H: 480 }], { sys: r.sys, count: 9 });
      const smallMax = later.sys.aMax, smallOuter = here(later)[8].a;
      const grown = orbit([{ secs: 3, loud: 0.6, W: 1728, H: 816 }], { sys: r.sys, count: 9 });
      ok(!shrunk.bad && moved.every((d) => d < 0.2) && !later.bad && near(smallOuter, smallMax, 0.01 * smallMax) && smallMax < wideMax
        && !grown.bad && near(here(grown)[8].a, grown.sys.aMax, 0.01 * grown.sys.aMax) && grown.sys.aMax > smallMax, 'a size change keeps every planet inside the new frame and on its way round');
    }
    {
      const a = orbit([{ secs: 5, loud: 0.7 }], { seed: 7 }), b = orbit([{ secs: 5, loud: 0.7 }], { seed: 7 }), c = orbit([{ secs: 5, loud: 0.7 }], { seed: 8 });
      const where = (r) => r.sys.planets.map((p) => [p.x.toFixed(6), p.y.toFixed(6)]).join();
      ok(where(a) === where(b) && where(a) !== where(c), 'a seeded system repeats');
    }
  }

  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="planets.js"');
    order.push(pos > html.indexOf('src="fireflies-swarm.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load planets.js after fireflies-swarm.js and before the factories');
}

// ── 11. Infall (pure; no browser) ────────────────────────────────────────────
console.log('\n[11] infall');
await import('./overlay/infall.js');
{
  const I = globalThis.TimbreInfall, P = globalThis.TimbrePlanets, HX = globalThis.TimbreHelix;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const SIZES = [[260, 130, 1], [1248, 624, 4.8], [1728, 624, 4.8]];
  const WIDE = SIZES[2];
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  // script: [{ secs, loud (a number or a function of the time in seconds), peak, live = true, density, W, H }]
  function fall(script, o = {}) {
    const [W0, H0, scale] = o.size ?? WIDE, fps = o.fps ?? 60;
    const inf = o.inf ?? I.createInfall({ random: HX.rng(o.seed ?? 1) });
    const seen = o.seen ?? new Map();   // thing -> { born, r0, r, turned }
    let t = o.t ?? 0, bad = false, most = 0, longHist = 0, mostTurn = 0, inside = 0, mostSunk = 0;
    const events = [], pop = [], lives = [], far = [], close = [], sunkAt = new Map(), sunkFor = [];
    for (const s of script) {
      for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) {
        t += 1 / fps;
        const W = s.W ?? W0, H = s.H ?? H0;
        const e = inf.step({ dt: 1 / fps, live: s.live !== false, loud: typeof s.loud === 'function' ? s.loud(t) : (s.loud ?? 0), peak: s.peak ?? 0,
          threshold: o.threshold ?? 0.9, density: s.density ?? o.density ?? 50, W, H, scale });
        if (e) events.push({ e, t });
        const falling = inf.things.filter((th) => !th.sunk), here = new Set(falling);
        for (const [thing, was] of seen) if (!here.has(thing)) { lives.push(t - was.born); seen.delete(thing); }
        // A swallowed thing stays listed, sunk, only while its trail drains into the hole.
        const listed = new Set(inf.things);
        for (const [th, first] of sunkAt) if (!listed.has(th)) { sunkFor.push(t - first); sunkAt.delete(th); }
        for (const th of inf.things) {
          if (!th.sunk) continue;
          const first = sunkAt.get(th) ?? t; sunkAt.set(th, first);
          mostSunk = Math.max(mostSunk, inf.things.length - falling.length);
          if (t - first > I.TRAIL[th.kind] + 2 / fps + 1e-9 || !(th.fade >= 0 && th.fade <= 1) || ![th.x, th.y].every(Number.isFinite)) bad = true;
        }
        for (const th of falling) {
          if (![th.r, th.th, th.x, th.y, th.z, th.born].every(Number.isFinite) || !(th.r > 0) || !(th.born >= 0 && th.born <= 1) || th.fade !== 1) bad = true;
          if (!seen.has(th) && !(Math.abs(th.x) >= W / 2 + 5 * scale || Math.abs(th.y) >= H / 2 + 5 * scale)) inside++;   // first seen: it must be beyond the frame
          const was = seen.get(th);
          if (!was) seen.set(th, { born: t, r0: th.r, r: th.r, turned: th.turned });
          else {
            if (th.r > was.r + 1e-9 || th.turned < was.turned) bad = true;            // always inward, always the same way round
            const w = (th.turned - was.turned) * fps;
            mostTurn = Math.max(mostTurn, th.turned - was.turned);
            if (th.r > 10 * I.HOLE_R * scale) far.push(w); else if (th.r < 3 * I.HOLE_R * scale) close.push(w);
            was.r = th.r; was.turned = th.turned;
          }
          longHist = Math.max(longHist, th.hist.length);
        }
        most = Math.max(most, falling.length);
        pop.push(falling.length);
      }
    }
    return { inf, events, bad, most, longHist, mostTurn, pop, lives, far, close, seen, inside, mostSunk, sunkFor, t, secs: t - (o.t ?? 0), falling: () => inf.things.filter((th) => !th.sunk) };
  }

  ok(I.most(0) === 30 && I.most(50) === 65 && I.most(100) === 100 && I.most(250) === 100 && I.most(NaN) === 65
    && near(I.rate(0), 0.4) && near(I.rate(50), 1) && near(I.rate(100), 1.6) && near(I.rate(NaN), 1), 'Density sets the most there can be (30 to 100) and how often things arrive (0.4 to 1.6 times)');
  {
    const fresh = I.createInfall({ random: HX.rng(1) });
    const silent = fall([{ secs: 60 }]);
    const settled = mean(silent.pop.slice(-20 * 60)), life = mean(silent.lives);
    ok(fresh.things.length === 0 && !silent.bad && silent.inf.eaten > 20 && settled > 10 && settled < 40,
      `silent, a trickle keeps falling in: about ${settled.toFixed(0)} things at a time, ${silent.inf.eaten} swallowed in a minute`);
    const starts = SIZES.map((size) => fall([{ secs: 60, loud: 0.5 }], { size, seed: 2 }));
    ok(starts.every((r) => r.inside === 0 && r.inf.eaten > 50 && !r.bad), 'every thing starts beyond the frame itself (past a side, or past the top or bottom), on all three pages');
    // It is kept for as long as its kind's trail holds (0.16 s for a firefly, 0.6 s for a comet), no less and no more.
    const kept = starts[2].sunkFor;
    ok(silent.mostSunk >= 1 && silent.mostSunk < 15 && starts.every((r) => r.mostSunk < 20) && kept.length > 50 && Math.min(...kept) > 0.12 && Math.max(...kept) < 0.66 && mean(kept) > 0.3,
      `a swallowed thing is kept while its trail drains into the hole, ${Math.min(...kept).toFixed(2)} to ${Math.max(...kept).toFixed(2)} s, and no longer (at most ${Math.max(silent.mostSunk, ...starts.map((r) => r.mostSunk))} at once)`);
    ok(mean(silent.close) > 5 * mean(silent.far) && silent.far.length > 100 && silent.close.length > 100 && life > 8 && life < 16,
      `they spiral faster close in (${mean(silent.far).toFixed(2)} rad/s far out, ${mean(silent.close).toFixed(2)} near the hole) and take about ${life.toFixed(0)} s to fall when it is silent`);
    const kinds = {}; { const inf = I.createInfall({ random: HX.rng(3) }); const all = new Set();
      for (let i = 0; i < 6000; i++) { inf.step({ dt: 1 / 60, live: true, loud: 1, peak: 0, threshold: 0.9, density: 100, W: 1728, H: 624, scale: 4.8 }); for (const th of inf.things) all.add(th); }
      for (const th of all) kinds[th.kind] = (kinds[th.kind] || 0) + 1; kinds.n = all.size; }
    ok(kinds.streak > 0.4 * kinds.n && kinds.comet > 0.12 * kinds.n && kinds.firefly > 0.18 * kinds.n && kinds.streak + kinds.comet + kinds.firefly === kinds.n,
      `streaks of light, comets and fireflies fall in (${kinds.streak}, ${kinds.comet}, ${kinds.firefly} of ${kinds.n})`);
  }
  // Louder: more falls in, and faster.
  {
    const silent = fall([{ secs: 30 }]), loud = fall([{ secs: 30, loud: 1 }]);
    ok(!loud.bad && loud.inf.eaten > 4 * silent.inf.eaten && mean(loud.lives) < 0.35 * mean(fall([{ secs: 60 }]).lives) && loud.most <= 65 && near(loud.inf.pull, 0.45 + 1.9 + 0.8, 0.01) && near(silent.inf.pull, 0.45, 1e-6),
      `at full voice ${(loud.inf.eaten / silent.inf.eaten).toFixed(1)} times as much is swallowed, each thing falling in about ${mean(loud.lives).toFixed(1)} s`);
    const few = fall([{ secs: 30, loud: 1 }], { density: 0 }), many = fall([{ secs: 30, loud: 1 }], { density: 100 });
    ok(few.most <= 30 && few.most > 10 && many.most <= 100 && many.most > 65 && !few.bad && !many.bad, `Density limits how many there are at once (${few.most} at 0, ${loud.most} at 50, ${many.most} at 100)`);
    const micOff = fall([{ secs: 5, loud: 1, live: false }]);
    ok(near(micOff.inf.pull, 0.45, 1e-6) && micOff.inf.loud === 0, 'mic off, the hole pulls at its gentlest whatever the sound arrays hold');
    // A syllable starting throws in a handful at once.
    const base = fall([{ secs: 3 }]);
    const before = base.falling().length;
    const burst = fall([{ secs: 0.1, loud: 0.9 }], { inf: base.inf, seen: base.seen, t: base.t });
    ok(burst.falling().length - before >= 3, `a syllable starting throws in a handful at once (${burst.falling().length - before} more within a tenth of a second)`);
  }
  // The gulp.
  {
    const lead = fall([{ secs: 4, loud: 0.5 }]);
    const there = new Set(lead.falling());
    const hit = fall([{ secs: 0.1, loud: 0.5, peak: 0.95 }], { inf: lead.inf, seen: lead.seen, t: lead.t });
    const jetEarly = hit.inf.jet, gulpNow = hit.inf.gulp;
    const soon = fall([{ secs: 0.25, loud: 0.5 }], { inf: lead.inf, seen: lead.seen, t: hit.t });
    const jetUp = soon.inf.jet;
    const later = fall([{ secs: 0.9, loud: 0.5 }], { inf: lead.inf, seen: lead.seen, t: soon.t });
    const left = lead.falling().filter((th) => there.has(th)).length, fed = lead.inf.eaten;
    const after = fall([{ secs: 3, loud: 0.5 }], { inf: lead.inf, seen: lead.seen, t: later.t });
    ok(hit.events.length === 1 && hit.events[0].e === 'gulp' && there.size > 10 && left <= 0.1 * there.size && gulpNow > 0.6 && jetEarly === 0 && jetUp > 0.55
      && after.inf.jet < 0.01 && after.inf.gulp < 0.01 && after.inf.gulps === 1 && !hit.bad && !later.bad && fed >= there.size - left,
      `a peak makes the hole gulp: ${there.size - left} of the ${there.size} things in sight are swallowed within a second and a quarter, and the jets fire a fifth of a second in`);
    const held = fall([{ secs: 2, loud: 0.5 }, { secs: 3.5, loud: 0.5, peak: 0.95 }]);
    ok(held.events.length === 3 && near(held.events[1].t - held.events[0].t, 1.5, 2 / 60), 'a held yell gulps again only every second and a half');
    const gap = (fps) => { const r = fall([{ secs: 2, loud: 0.5 }, { secs: 3.6, loud: 0.5, peak: 0.95 }], { fps }); return r.events[1].t - r.events[0].t; };
    ok(near(gap(10), 1.5, 1e-6) && near(gap(30), 1.5, 1e-6) && near(gap(60), 1.5, 1e-6), 'after exactly a second and a half, at 10, 30 and 60 fps');
    // A gulp is as strong, and its jets as punctual, at any frame rate: what is left in sight 0.4 s
    // after it, and how far the jets have faded half a second after it.
    const gulpAt = (fps) => {
      const a = fall([{ secs: 4, loud: 0.5 }], { fps }), there = new Set(a.falling());
      // The peak lasts one frame, at whose end the gulp begins; the reading is 0.4 s after that.
      const b = fall([{ secs: 1 / fps, loud: 0.5, peak: 0.95 }, { secs: 0.4, loud: 0.5 }], { fps, inf: a.inf, seen: a.seen, t: a.t });
      return { left: b.falling().filter((th) => there.has(th)).length / there.size, jet: b.inf.jet, n: there.size };
    };
    const g10 = gulpAt(10), g60 = gulpAt(60), g150 = gulpAt(150);
    ok(g60.n > 10 && Math.abs(g10.left - g150.left) < 0.12 && Math.abs(g60.left - g150.left) < 0.12 && near(g10.jet, g150.jet, 0.04) && near(g60.jet, g150.jet, 0.04) && near(g150.jet, Math.exp(-(0.4 - 0.22) / 0.3), 0.02),
      `a gulp is as strong and its jets as punctual at 10, 60 and 150 fps (${(g10.left * 100).toFixed(0)}%, ${(g60.left * 100).toFixed(0)}%, ${(g150.left * 100).toFixed(0)}% left in sight after 0.4 s; jets at ${g10.jet.toFixed(2)}, ${g60.jet.toFixed(2)}, ${g150.jet.toFixed(2)})`);
    const opened = fall([{ secs: 2, peak: 0.95, live: false }, { secs: 0.3, loud: 0.5, peak: 0.95 }]);
    const off = fall([{ secs: 5, loud: 0.5, peak: 1 }], { threshold: Infinity });
    const talk = fall([{ secs: 30, loud: 1, peak: 0.7 }]);
    ok(opened.events.length === 0 && off.events.length === 0 && talk.events.length === 0, 'no gulp when the mic opens on a peak, at sensitivity 0, or from talking');
  }
  // Any frame rate, and very long frames.
  {
    const [e30, e60, e144] = [30, 60, 144].map((fps) => fall([{ secs: 40 }], { fps }).inf.eaten);
    ok(Math.abs(e30 - e60) <= 2 && Math.abs(e144 - e60) <= 2 && e60 > 10, `the same at 30, 60 and 144 fps (${e30}, ${e60}, ${e144} swallowed in forty silent seconds)`);
    // And in speech: syllables of 0.2 s every 0.6 s, their edges on frame boundaries at all three rates.
    const syllables = (fps) => (t) => ((Math.round(t * 120) - 120 / fps + 72000) % 72 < 24 ? 0.9 : 0);
    const [v30, v60, v120] = [30, 60, 120].map((fps) => fall([{ secs: 30, loud: syllables(fps) }], { fps }).inf.eaten);
    ok(Math.abs(v30 - v60) <= 0.03 * v60 && Math.abs(v120 - v60) <= 0.03 * v60 && v60 > 100, `and in speech (${v30}, ${v60}, ${v120} swallowed in thirty seconds at 30, 60 and 120 fps)`);
    const yells = Array.from({ length: 6 }, () => [{ secs: 2.8, loud: 1 }, { secs: 0.2, loud: 1, peak: 0.95 }]).flat();
    const slow = fall(yells, { fps: 10, density: 100 });
    ok(!slow.bad && slow.events.length === 6 && slow.inf.eaten > 100 && slow.mostTurn <= 1.4 + 1e-9, `at ten frames a second, at full voice and gulping, nothing goes astray (${slow.inf.eaten} swallowed, at most ${slow.mostTurn.toFixed(2)} rad a frame)`);
    const h30 = fall([{ secs: 20, loud: 1 }], { fps: 30 }).longHist, h144 = fall([{ secs: 20, loud: 1 }], { fps: 144 }).longHist;
    ok(h30 <= Math.ceil(0.6 * 30) + 2 && h144 <= Math.ceil(0.6 * 30) + 2 && h144 >= 15 && slow.longHist <= 8, `a trail is a handful of remembered places, whatever the frame rate (${h30}, ${h144}; ${slow.longHist} at ten frames a second)`);
    const sized = fall([{ secs: 5, loud: 0.6 }, { secs: 5, loud: 0.6, W: 1248, H: 480 }, { secs: 5, loud: 0.6, W: 1728, H: 816 }]);
    ok(!sized.bad && sized.inf.eaten > 5, 'a size change leaves everything falling');
    const where = (r) => r.inf.things.map((th) => [th.x.toFixed(6), th.y.toFixed(6), th.hist.length, th.hist.every((h) => Number.isFinite(h.z))]).join();
    const a = fall([{ secs: 6, loud: 0.7 }], { seed: 7 }), b = fall([{ secs: 6, loud: 0.7 }], { seed: 7 }), c = fall([{ secs: 6, loud: 0.7 }], { seed: 8 });
    ok(where(a) === where(b) && where(a) !== where(c) && a.inf.things.length > 5, 'a seeded infall repeats');
    const small = SIZES.map((size) => fall([{ secs: 20, loud: 0.8 }, { secs: 0.1, loud: 0.8, peak: 0.95 }, { secs: 3, loud: 0.8 }], { size }));
    ok(small.every((r) => !r.bad && r.inf.eaten > 10 && r.events.length === 1), 'it works on all three pages');
  }

  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="infall.js"');
    order.push(pos > html.indexOf('src="planets.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load infall.js after planets.js and before the factories');
}

// ── 12. Characters (pure; no browser) ────────────────────────────────────────
console.log('\n[12] characters');
await import('./overlay/characters.js');
{
  const C = globalThis.TimbreCharacters;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const SIZES = [[260, 130, 1], [1248, 624, 4.8], [1728, 624, 4.8]];
  const WIDE = SIZES[2];
  const TURN = 2 * Math.PI;
  // Syllables of 0.2 s every 0.6 s, their edges on frame boundaries at 30, 60 and 120 fps.
  const syllables = (fps, level = 0.9) => (t) => ((Math.round(t * 120) - 120 / fps + 72000) % 72 < 24 ? level : 0);

  // The spring: solved exactly, so a push that lasts whole frames moves it the same at any frame rate.
  {
    const run = (fps, secs, force) => { const s = C.createSpring(2.6, 0.22); let t = 0, most = 0; for (let k = 0, n = Math.round(secs * fps); k < n; k++) { s.step(1 / fps, force(t)); t += 1 / fps; most = Math.max(most, Math.abs(s.x)); } return { s, most }; };
    const kick = (t) => (t < 0.2 - 1e-9 ? 100 : 0);
    const a = run(10, 1, kick).s, b = run(50, 1, kick).s, c = run(200, 1, kick).s;
    ok(near(a.x, c.x, 1e-9) && near(b.x, c.x, 1e-9) && near(a.v, c.v, 1e-7) && near(b.v, c.v, 1e-7) && Math.abs(c.x) > 1e-3,
      `the spring is where it should be at 10, 50 and 200 fps alike (${a.x.toFixed(6)}, ${b.x.toFixed(6)}, ${c.x.toFixed(6)})`);
    const held = run(60, 6, () => 100).s, w = TURN * 2.6;
    const rung = run(60, 6, kick), settled = run(60, 6, kick).s;
    ok(near(held.x, 100 / (w * w), 1e-4) && Math.abs(held.v) < 1e-2 && Math.abs(settled.x) < 1e-3 && rung.most > 100 / (w * w),
      'a steady push holds it at push / stiffness; let go, it rings and comes to rest');
    const s = C.createSpring(2.6, 0.22);
    s.step(0.1, 5000); s.step(0, 5000); const x0 = s.x; s.step(0.1, 0); s.step(0.1, 0);
    ok([s.x, s.v].every(Number.isFinite) && Math.abs(s.x) < 40 && Number.isFinite(x0), 'very long frames and frames of no length leave it sane');
    s.reset();
    ok(s.x === 0 && s.v === 0, 'and a reset puts it at rest');
    const refused = [[2.6, 1], [2.6, 1.2], [0, 0.2], [-1, 0.2], [2.6, -0.1], [NaN, 0.2]].every(([hz, d]) => { try { C.createSpring(hz, d); return false; } catch (e) { return e instanceof RangeError; } });
    ok(refused && Number.isFinite(run(60, 1, kick).s.x), 'a spring that could not ring (damping of 1 or more, or no frequency) is refused when it is made');
  }

  ok(C.bounce(0) === 0 && C.bounce(50) === 1 && C.bounce(100) === 2 && C.bounce(250) === 2 && C.bounce(-5) === 0 && C.bounce(NaN) === 1, 'Bounce: 0 stills a character, 50 is the usual bounce, 100 is double');
  {
    let shut = 0, most = 0, n = 0;
    for (let t = 0; t < 35; t += 0.001) { const b = C.blink(t, 3.5, 0); if (b > 0) shut++; most = Math.max(most, b); n++; if (!(b >= 0 && b <= 1)) most = 9; }
    ok(near(shut / n, 0.16 / 3.5, 0.002) && near(most, 1, 0.02) && C.blink(1, 3.5, 0) === 0 && near(C.blink(0.08, 3.5, 0), 1, 1e-9) && near(C.blink(3.58, 3.5, 0), 1, 1e-9) && near(C.blink(0.08, 3.5, 1), C.blink(1.08, 3.5, 0)),
      'a blink: shut for 0.16 s every few seconds, open the rest of the time');
  }

  // The hearing.
  const hear = (fps, script) => {
    const e = C.createEars(); let t = 0; const log = [];
    for (const s of script) for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) {
      t += 1 / fps;
      e.step({ dt: 1 / fps, live: s.live !== false, idle: !!s.idle, loud: typeof s.loud === 'function' ? s.loud(t) : (s.loud ?? 0), low: s.low ?? 0, high: s.high ?? 0 });
      log.push({ t, rise: e.rise, loud: e.loud, happy: e.happy, awake: e.awake, rest: e.rest });
    }
    return { e, log };
  };
  {
    const start = hear(60, [{ secs: 1 }, { secs: 0.1, loud: 1 }]).e, steady = hear(60, [{ secs: 4, loud: 1 }]).e;
    ok(start.rise > 0.5 && start.fast > start.loud && steady.rise < 0.01 && near(steady.loud, 1, 1e-3) && near(steady.fast, 1, 1e-6) && hear(60, [{ secs: 2 }]).e.rise === 0,
      'a syllable starting is heard as a rise; a steady voice and silence are not');
    const lowish = hear(60, [{ secs: 2, loud: 0.5, low: 0.8, high: 0.1 }]).e, highish = hear(60, [{ secs: 2, loud: 0.5, low: 0.1, high: 0.8 }]).e, faint = hear(60, [{ secs: 2, loud: 0.5, low: 0.1, high: 0.8 }, { secs: 3, loud: 0.01, low: 0.1, high: 0.8 }]).e;
    ok(lowish.lean < -0.8 && highish.lean > 0.8 && Math.abs(faint.lean) < 0.01 && lowish.lean >= -1 && highish.lean <= 1, 'it leans toward whichever end of the sound is winning, and not at all when the voice is faint');
    const mood = hear(60, [{ secs: 3, loud: 0.5 }, { secs: 3, loud: 0.4 }, { secs: 3, loud: 0.3 }, { secs: 3, loud: 0.4 }]).log;
    const at = (t) => mood.find((m) => m.t >= t);
    ok(at(2.9).happy === true && at(5.9).happy === true && at(8.9).happy === false && at(11.9).happy === false && hear(60, [{ secs: 3, loud: 0.44 }]).e.happy === false,
      'happy once the voice passes 0.45, and until it falls below 0.35');
    const off = hear(60, [{ secs: 2, loud: 1, low: 1, high: 1 }, { secs: 3, loud: 1, low: 1, high: 1, live: false }]).e;
    ok(off.live === false && off.loud < 1e-4 && off.low < 1e-4 && off.rise === 0 && off.happy === false, 'mic off, it hears silence whatever the sound arrays hold');
    // Awake while the mic is on or the idle animation is; resting (breathing, swaying) with the mic
    // off and the idle animation on. Both start where they belong and ease over when things change.
    const on = hear(60, [{ secs: 1 / 60 }]).e, offNoIdle = hear(60, [{ secs: 1 / 60, live: false }]).e, offIdle = hear(60, [{ secs: 1 / 60, live: false, idle: true }]).e;
    const waking = hear(60, [{ secs: 2, live: false }, { secs: 0.1 }]).log, dozing = hear(60, [{ secs: 2 }, { secs: 0.1, live: false, idle: true }]).log;
    ok(on.awake === 1 && on.rest === 0 && offNoIdle.awake === 0 && offNoIdle.rest === 0 && offIdle.awake === 1 && offIdle.rest === 1
      && waking[120].awake > 0 && waking[120].awake < 0.1 && waking[125].awake > waking[120].awake && dozing[120].rest > 0 && dozing[120].rest < 0.1 && dozing[125].awake === 1,
      'it is awake while the mic or the idle animation is on, and resting with the mic off and the idle animation on; both ease over');
    const [a, b, c] = [30, 60, 120].map((fps) => hear(fps, [{ secs: 6.6, loud: syllables(fps) }]).e);
    ok(near(a.loud, b.loud, 1e-9) && near(c.loud, b.loud, 1e-9) && near(a.fast, c.fast, 1e-9) && near(a.clock, 6.6, 1e-6), 'the same at 30, 60 and 120 fps');
  }

  // The Blob's pose. script: [{ secs, loud, low, high, bins, bounce, idle, live = true, W, H }]
  const blob = (script, o = {}) => {
    const [W0, H0, scale] = o.size ?? WIDE, fps = o.fps ?? 60;
    const b = o.blob ?? C.createBlob();
    let t = 0, outside = false, bad = false, mostStretch = 0, leastStretch = 0, mostLift = -Infinity, leastRadius = Infinity, mostRadius = 0;
    let highest = Infinity, stretchStep = 0, radiusStep = 0, pinned = 0, everHeld = false, liftOff = 0, offCentre = 0, last = null;
    const lifts = [];
    for (const s of script) for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) {
      t += 1 / fps;
      const W = s.W ?? W0, H = s.H ?? H0, loud = typeof s.loud === 'function' ? s.loud(t) : (s.loud ?? 0);
      b.step({ dt: 1 / fps, live: s.live !== false, level: { loud, low: s.low ?? loud, high: s.high ?? 0 }, bins: s.bins ?? null, gain: 1, bounce: s.bounce ?? o.bounce ?? 50, idle: !!s.idle, W, H, scale });
      for (let i = 0; i < b.px.length; i++) { if (!Number.isFinite(b.px[i]) || !Number.isFinite(b.py[i])) bad = true; if (Math.abs(b.px[i]) > W / 2 - 3 * scale + 1e-6 || Math.abs(b.py[i]) > H / 2 - 3 * scale + 1e-6) outside = true; }   // 3 px × scale inside the frame
      mostStretch = Math.max(mostStretch, b.stretch); leastStretch = Math.min(leastStretch, b.stretch);
      mostLift = Math.max(mostLift, b.lift); leastRadius = Math.min(leastRadius, b.radius); mostRadius = Math.max(mostRadius, b.radius);
      lifts.push(b.lift);
      highest = Math.min(highest, b.cy);
      if (Math.abs(b.stretch) >= 0.13 - 1e-9) pinned++;
      if (b.held) everHeld = true;
      if (!b.held && b.shrink === 1) liftOff = Math.max(liftOff, Math.abs(b.lift - (4 * scale - b.cy)));   // lift is how far above its resting place it is drawn
      offCentre = Math.max(offCentre, Math.abs(b.py.reduce((a, y) => a + y, 0) / b.py.length - b.cy));      // with no bulge its outline is centred on cy
      if (last) { stretchStep = Math.max(stretchStep, Math.abs(b.stretch - last.stretch)); radiusStep = Math.max(radiusStep, Math.abs(b.radius - last.radius)); }
      last = { stretch: b.stretch, radius: b.radius };
    }
    return { b, outside, bad, mostStretch, leastStretch, mostLift, leastRadius, mostRadius, lifts, highest, stretchStep, radiusStep, pinned, everHeld, liftOff, offCentre };
  };
  {
    const scale = WIDE[2];
    const rest = blob([{ secs: 2 }]).b;
    const reach = Array.from(rest.px, (x, i) => Math.hypot(x, rest.py[i] - rest.cy));
    ok(rest.px.length === 32 && near(rest.radius, 25 * scale, 1e-6) && rest.lift === 0 && rest.stretch === 0 && rest.shrink === 1 && reach.every((r) => r > 0.9 * 25 * scale && r < 1.1 * 25 * scale) && near(rest.cy, 4 * scale),
      'at rest: 32 points round a body of 25 px × scale, a little below the middle of the frame, with a slight wobble');
    const loud = blob([{ secs: 4, loud: 1 }]).b, loudHigh = blob([{ secs: 4, loud: 1 }], { bounce: 100 }).b, loudNone = blob([{ secs: 4, loud: 1 }], { bounce: 0 });
    ok(near(loud.radius, 38 * scale, 0.05 * scale) && loudHigh.radius > 45 * scale && near(loudNone.b.radius, 25 * scale, 1e-6) && loudNone.mostLift === 0 && loudNone.lifts.every((v) => v === 0) && loudNone.mostStretch === 0,
      'it swells with the voice, more at a higher Bounce; at Bounce 0 it neither swells nor bounces');
    const hop = blob([{ secs: 1 }, { secs: 0.3, loud: 0.9 }]), landed = blob([{ secs: 1 }, { secs: 4, loud: 0.9 }]);
    ok(hop.mostLift > 3 * scale && hop.mostStretch > 0.03 && landed.leastStretch < -0.01 && Math.abs(landed.b.lift) < 0.3 * scale && Math.abs(landed.b.stretch) < 0.005 && landed.mostStretch <= 0.13 && landed.leastStretch >= -0.13,
      `a syllable bounces it (${(hop.mostLift / scale).toFixed(1)} px × scale up), stretching on the way up and squashing on the way down, and it settles`);
    ok(4 * scale - hop.highest > 3 * scale && hop.liftOff < 1e-9 && landed.liftOff < 1e-9 && hop.offCentre < 1e-6 && landed.offCentre < 1e-6, 'the bounce is in what is drawn: its middle rises by the lift, and its outline with it');
    ok(landed.stretchStep < 0.04 && landed.pinned === 0 && landed.mostStretch > 0.05 && landed.leastStretch < -0.03,
      `the stretch follows the bounce smoothly: at most ${landed.stretchStep.toFixed(3)} in a frame, and never held at its limit`);
    const stopped = blob([{ secs: 1 }, { secs: 0.15, loud: 0.9 }, { secs: 1 / 60, loud: 0.9, bounce: 0 }]).b;
    ok(stopped.stretch === 0 && stopped.lift === 0 && near(stopped.cy, 4 * scale), 'Bounce set to 0 in the middle of a bounce stills it at once');
    // The sound shapes it: the low end at the top, the high end at the bottom, the same on both sides.
    const bins = (from, to) => { const f = new Uint8Array(32); for (let i = from; i <= to; i++) f[i] = 255; return f; };
    const top = blob([{ secs: 1, loud: 0.5, bins: bins(0, 1) }]).b, bottom = blob([{ secs: 1, loud: 0.5, bins: bins(7, 10) }]).b;
    const sym = (b) => Array.from(b.bulge).every((v, i) => i === 0 || near(v, b.bulge[32 - i]));
    ok(top.bulge[0] > 0.9 && top.bulge[16] < 0.01 && bottom.bulge[16] > 0.9 && bottom.bulge[0] < 0.01 && sym(top) && sym(bottom) && blob([{ secs: 1, loud: 0.5, bins: bins(0, 31), bounce: 0 }]).b.shrink === 1,
      'the low end pushes out its top and the high end its bottom, the same on both sides');
    const still = blob([{ secs: 3, live: false }]), breathing = blob([{ secs: 6, live: false, idle: true }]);
    ok(still.mostRadius === still.leastRadius && breathing.mostRadius - breathing.leastRadius > 2 * scale && breathing.mostRadius - breathing.leastRadius < 2.6 * scale && breathing.mostLift === 0,
      'mic off it is still; with the idle animation on it breathes');
    // Still means still: with the mic and the idle animation both off, no point of its outline moves, its eyes do not wander and it does not blink.
    {
      const b = C.createBlob(), [W, H] = WIDE, go = (secs) => { for (let k = 0; k < secs * 60; k++) b.step({ dt: 1 / 60, live: false, level: { loud: 0, low: 0, high: 0 }, bins: null, gain: 1, bounce: 50, idle: false, W, H, scale }); };
      go(1); const x0 = Array.from(b.px), y0 = Array.from(b.py); let moved = 0, looked = 0, blinked = 0;
      for (let k = 0; k < 600; k++) { go(1 / 60); for (let i = 0; i < 32; i++) moved = Math.max(moved, Math.abs(b.px[i] - x0[i]), Math.abs(b.py[i] - y0[i])); looked = Math.max(looked, Math.abs(b.look)); blinked = Math.max(blinked, b.blink); }
      const silent = blob([{ secs: 10 }]).b;
      ok(moved < 1e-9 && looked === 0 && blinked === 0 && Math.abs(silent.look) > 0 && Array.from(silent.px).some((x, i) => Math.abs(Math.hypot(x, silent.py[i] - silent.cy) - 25 * scale) > 0.2 * scale),
        'with the mic and the idle animation both off nothing about it moves; mic on and silent, it still wobbles a little and looks about');
    }
    // The idle breathing eases in and out: the mic coming on while it breathes does not make it jump.
    const woken = blob([{ secs: 3.2, live: false, idle: true }, { secs: 1, idle: true }]);
    ok(woken.radiusStep < 0.25 * scale && near(woken.b.radius, 25 * scale, 0.05 * scale), `the mic coming on while it breathes does not make it jump (at most ${(woken.radiusStep / scale).toFixed(2)} px × scale in a frame)`);
    // Bounce at its highest, a full voice in syllables, on every page: no part of it leaves the frame.
    const hard = SIZES.map((size) => blob([{ secs: 20, loud: (t) => (t % 0.5 < 0.2 ? 1 : 0), bins: bins(0, 31) }], { size, bounce: 100 }));
    ok(hard.every((r) => !r.outside && !r.bad && r.mostLift > 0 && r.everHeld) && !blob([{ secs: 5, loud: syllables(60) }]).everHeld, 'at Bounce 100 and full voice the frame has to hold it back, and no part of it leaves the frame, on all three pages');
    const narrow = blob([{ secs: 3, loud: 1, bins: bins(0, 31) }], { size: [200, 624, 4.8], bounce: 100 });
    ok(!narrow.outside && !narrow.bad && narrow.b.shrink < 1, 'a frame too narrow for it draws it smaller, by its true width');
    const lone = (fps) => blob([{ secs: 1 }, { secs: 0.2, loud: 0.9 }, { secs: 1 }], { fps }).mostLift;
    ok(near(lone(10), lone(60), 0.08 * lone(60)) && near(lone(144), lone(60), 0.02 * lone(60)), `one syllable lifts it as high at 10 and 144 fps as at 60 (${(lone(10) / scale).toFixed(2)}, ${(lone(144) / scale).toFixed(2)}, ${(lone(60) / scale).toFixed(2)} px × scale)`);
    const [f30, f60, f120] = [30, 60, 120].map((fps) => blob([{ secs: 6.6, loud: syllables(fps) }], { fps }));
    ok(near(f30.mostLift, f60.mostLift, 0.06 * f60.mostLift) && near(f120.mostLift, f60.mostLift, 0.06 * f60.mostLift) && near(f30.b.radius, f120.b.radius, 1e-6),
      `it bounces as high at 30, 60 and 120 fps (${(f30.mostLift / scale).toFixed(2)}, ${(f60.mostLift / scale).toFixed(2)}, ${(f120.mostLift / scale).toFixed(2)} px × scale)`);
    const resized = blob([{ secs: 2, loud: 0.6 }, { secs: 2, loud: 0.6, W: 1248, H: 480 }, { secs: 2, loud: 0.6, W: 260, H: 60 }]);
    ok(!resized.outside && !resized.bad && resized.b.shrink < 1, 'a frame too short for it draws it smaller, not cut off');
  }

  // The Owl's pose. script: [{ secs, loud, low, high, bounce, idle, live = true, W, H }]
  const owl = (script, o = {}) => {
    const [W0, H0, scale] = o.size ?? WIDE, fps = o.fps ?? 60;
    const w = o.owl ?? C.createOwl();
    let t = 0, outside = false, bad = false, mostLift = -Infinity, mostWing = 0, leastWing = 9, mostTilt = 0, leastTilt = 0;
    let tiltStep = 0, cyStep = 0, noteStep = 0, everHeld = false, liftOff = 0, last = null;
    const noteY = [];
    // The ends of its drawing, in its own units, with half the stroke round each: the tops of its
    // ear tufts, the top of its head, the ends of its outer toes and its tail.
    const ENDS = [[21.4, -41.5, 0.65], [-21.4, -41.5, 0.65], [23, -41, 0.65], [-23, -41, 0.65], [0, -35.5, 0.65], [11.2, 38.5, 1.1], [-11.2, 38.5, 1.1], [0, 36, 0.65]];
    for (const s of script) for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) {
      t += 1 / fps;
      const W = s.W ?? W0, H = s.H ?? H0, loud = typeof s.loud === 'function' ? s.loud(t) : (s.loud ?? 0);
      w.step({ dt: 1 / fps, live: s.live !== false, level: { loud, low: s.low ?? 0, high: s.high ?? 0 }, bounce: s.bounce ?? o.bounce ?? 50, idle: !!s.idle, W, H, scale });
      if (![w.lift, w.cy, w.tilt, w.wing, w.open, w.sing, w.k, w.blink, w.look].every(Number.isFinite)) bad = true;
      // The ends of its drawing, leaning as it leans, and every note that shows, stay 3 px × scale inside the frame's top and bottom.
      const room = H / 2 - 3 * scale + 1e-6, cos = Math.cos(w.tilt), sin = Math.sin(w.tilt);
      for (const [x, y, r] of ENDS) { const at = w.cy + (x * sin + y * cos) * w.k; if (at - r * w.k < -room || at + r * w.k > room) outside = true; }
      for (const note of w.notes) if (note.a > 0 && (Math.abs(note.x) > W / 2 || note.y - 11 * scale * w.shrink < -room || note.y > H / 2)) outside = true;   // a note's stem stands 11 px × scale above it
      if (w.held) everHeld = true;
      if (!w.held && !s.idle) liftOff = Math.max(liftOff, Math.abs(w.lift - (4 * scale - w.cy)));   // lift is how far above its resting place it is drawn
      if (last) {
        tiltStep = Math.max(tiltStep, Math.abs(w.tilt - last.tilt)); cyStep = Math.max(cyStep, Math.abs(w.cy - last.cy));
        w.notes.forEach((note, i) => { noteStep = Math.max(noteStep, note.a - last.notes[i]); });
      }
      last = { tilt: w.tilt, cy: w.cy, notes: w.notes.map((note) => note.a) };
      mostLift = Math.max(mostLift, w.lift); mostWing = Math.max(mostWing, w.wing); leastWing = Math.min(leastWing, w.wing);
      mostTilt = Math.max(mostTilt, w.tilt); leastTilt = Math.min(leastTilt, w.tilt);
      noteY.push(w.notes[0].y);
    }
    return { w, outside, bad, mostLift, mostWing, leastWing, mostTilt, leastTilt, noteY, tiltStep, cyStep, noteStep, everHeld, liftOff };
  };
  {
    const scale = WIDE[2];
    const rest = owl([{ secs: 2 }]).w;
    ok(rest.lift === 0 && near(rest.cy, 4 * scale) && near(rest.wing, 0.12) && rest.open === 0 && rest.sing === 0 && rest.tilt === 0 && near(rest.k, 1.05 * scale) && rest.shrink === 1
      && rest.notes.length === 3 && rest.notes.every((n) => n.a === 0), 'the owl at rest: wings folded, beak shut, upright, no notes');
    const voiced = owl([{ secs: 3, loud: 0.5 }]), still = owl([{ secs: 3, loud: 0.5 }], { bounce: 0 }), wide = owl([{ secs: 3, loud: 0.5 }], { bounce: 100 });
    ok(near(voiced.w.flap, 0.85, 1e-3) && voiced.w.wing > 0.12 + 1.15 * 0.85 - 0.07 && voiced.w.wing < 0.12 + 1.15 * 0.85 + 0.07 && near(voiced.w.open, 0.7, 1e-3) && near(wide.w.flap, 1, 1e-6)
      && still.w.flap === 0 && near(still.w.wing, 0.12) && still.mostLift === 0 && still.w.tilt === 0 && near(still.w.open, 0.7, 1e-3),
      'a voice lifts its wings and opens its beak; at Bounce 0 only the beak (and the face) answers');
    const quietWing = owl([{ secs: 3, loud: 0.2 }]), loudWing = owl([{ secs: 3, loud: 0.5 }]);
    ok(quietWing.mostWing - quietWing.leastWing < 0.4 && (() => { const r = owl([{ secs: 2, loud: 0.5 }]); const tail = owl([{ secs: 1, loud: 0.5 }], { owl: r.w }); return tail.mostWing - tail.leastWing > 0.1; })()
      && (() => { const r = owl([{ secs: 2, loud: 0.2 }]); const tail = owl([{ secs: 1, loud: 0.2 }], { owl: r.w }); return tail.mostWing - tail.leastWing < 1e-3; })() && loudWing.mostWing > quietWing.mostWing,
      'its wings flutter while the voice is loud, and hold still when it is soft');
    // The flutter is scaled by Bounce up to its usual strength: a fifth of it at Bounce 10, no more at Bounce 100.
    const flutter = (bounce) => { const r = owl([{ secs: 2, loud: 0.5 }], { bounce }); const tail = owl([{ secs: 1, loud: 0.5 }], { owl: r.w, bounce }); return tail.mostWing - tail.leastWing; };
    ok(near(flutter(50), 0.12, 0.01) && near(flutter(10), 0.2 * flutter(50), 0.005) && near(flutter(100), flutter(50), 0.005),
      `the flutter follows Bounce up to its usual strength (${flutter(10).toFixed(3)}, ${flutter(50).toFixed(3)}, ${flutter(100).toFixed(3)} rad at Bounce 10, 50, 100)`);
    const lowish = owl([{ secs: 2, loud: 0.5, low: 0.8, high: 0.1 }]).w, highish = owl([{ secs: 2, loud: 0.5, low: 0.1, high: 0.8 }]).w;
    ok(Math.abs(lowish.look) <= 1 && Math.abs(highish.look) <= 1 && lowish.look < -0.9 && highish.look > 0.9, 'its eyes turn the way it leans, and no further than they can');
    // The idle sway and breathing ease in and out: the mic coming on does not make it jump.
    const woken = owl([{ secs: 2.2, live: false, idle: true }, { secs: 1.5, idle: true }]);
    ok(woken.tiltStep < 0.004 && woken.cyStep < 0.25 * scale && Math.abs(woken.w.tilt) < 1e-3 && near(woken.w.cy, 4 * scale, 0.02 * scale),
      `the mic coming on while it sways does not make it jump (at most ${woken.tiltStep.toFixed(4)} rad and ${(woken.cyStep / scale).toFixed(2)} px × scale in a frame)`);
    // With the mic and the idle animation both off it does not blink either.
    const asleep = owl([{ secs: 1, live: false }]).w; let blinked = 0;
    for (let k = 0; k < 600; k++) { asleep.step({ dt: 1 / 60, live: false, level: { loud: 0, low: 0, high: 0 }, bounce: 50, idle: false, W: WIDE[0], H: WIDE[1], scale }); blinked = Math.max(blinked, asleep.blink); }
    const awake = owl([{ secs: 1 }]).w; let blinkedAwake = 0;
    for (let k = 0; k < 600; k++) { awake.step({ dt: 1 / 60, live: true, level: { loud: 0, low: 0, high: 0 }, bounce: 50, idle: false, W: WIDE[0], H: WIDE[1], scale }); blinkedAwake = Math.max(blinkedAwake, awake.blink); }
    ok(blinked === 0 && blinkedAwake > 0.8, 'it blinks while the mic is on, and not with the mic and the idle animation both off');
    const idleSway = owl([{ secs: 10, live: false, idle: true }]), idleOff = owl([{ secs: 10, live: false }]);
    ok(near(lowish.tilt, -0.16, 0.01) && near(highish.tilt, 0.16, 0.01) && idleSway.mostTilt > 0.045 && idleSway.leastTilt < -0.045 && idleSway.mostTilt < 0.051 && idleOff.mostTilt === 0 && idleOff.leastTilt === 0
      && idleSway.mostLift === 0, 'it leans toward the end of the sound that is winning; mic off it is still, and with the idle animation it sways');
    const hop = owl([{ secs: 1 }, { secs: 0.3, loud: 0.9 }]), landed = owl([{ secs: 1 }, { secs: 4, loud: 0.9 }]);
    ok(hop.mostLift > 3 * scale && Math.abs(landed.w.lift) < 0.3 * scale, `a syllable bobs it (${(hop.mostLift / scale).toFixed(1)} px × scale up), and it settles`);
    ok(hop.liftOff < 1e-9 && landed.liftOff < 1e-9 && !hop.everHeld, 'the bob is in what is drawn: its middle rises by the lift');
    const stopped = owl([{ secs: 1 }, { secs: 0.15, loud: 0.9, low: 0.1, high: 0.9 }, { secs: 1 / 60, loud: 0.9, low: 0.1, high: 0.9, bounce: 0 }]).w;
    ok(stopped.lift === 0 && stopped.tilt === 0 && near(stopped.cy, 4 * scale) && stopped.ears.lean > 0.05, 'Bounce set to 0 in the middle of a bob stops the bob and the lean at once');
    const soft = owl([{ secs: 3, loud: 0.2 }]).w, singing = owl([{ secs: 6, loud: 0.6 }]);
    const rising = singing.noteY.slice(-200), drops = rising.filter((y, i) => i > 0 && y > rising[i - 1] + 5 * scale).length, climbs = rising.filter((y, i) => i > 0 && y < rising[i - 1]).length;
    ok(soft.sing === 0 && soft.notes.every((n) => n.a === 0) && near(singing.w.sing, 1, 1e-3) && singing.w.notes.some((n) => n.a > 0.3) && singing.w.notes.every((n) => n.a >= 0 && n.a <= 1)
      && climbs > 190 && drops >= 1 && drops <= 3, 'music notes float up beside it while the voice is loud, each starting again from below');
    const sung = owl([{ secs: 3, loud: 0.6 }]), later = owl([{ secs: 5, loud: 0.6 }], { owl: sung.w });
    ok(later.noteStep < 0.15 && later.w.notes.some((n) => n.a > 0.3), `a note fades in where it starts, it does not pop in (at most ${later.noteStep.toFixed(3)} in a frame)`);
    ok(Math.hypot(11.2, 38.5) + 1.1 <= C.OWL_BELOW && Math.hypot(23, 41) + 0.65 <= C.OWL_UP, 'the reach it is fitted by covers its toes and its ear tufts however it leans');
    const hard = SIZES.map((size) => owl([{ secs: 20, loud: (t) => (t % 0.5 < 0.2 ? 1 : 0), low: 0.2, high: 0.9 }], { size, bounce: 100 }));
    const hardLow = SIZES.map((size) => owl([{ secs: 20, loud: (t) => (t % 0.5 < 0.2 ? 1 : 0), low: 0.9, high: 0.1 }], { size, bounce: 100 }));
    ok([...hard, ...hardLow].every((r) => !r.outside && !r.bad && r.mostLift > 12 * r.w.k / 1.05), 'at Bounce 100 and full voice, leaning either way, no part of it, and no note, leaves the frame, on all three pages');
    const short = owl([{ secs: 2, loud: 0.6 }, { secs: 2, loud: 0.6, W: 260, H: 60 }]);
    ok(!short.outside && !short.bad && short.w.shrink < 1 && short.w.k < 1.05 * scale, 'a frame too short for it draws it smaller, not cut off');
    // Short frames at the small page's scale, leaning either way, singing, at Bounce 100: nothing is cut off, and no note leaves the top.
    const shorts = [[260, 60, 1], [260, 100, 1], [1728, 300, 4.8]].flatMap((size) => [[0.9, 0.1], [0.1, 0.9]].map(([low, high]) => owl([{ secs: 12, loud: (t) => (t % 0.5 < 0.3 ? 1 : 0.5), low, high }], { size, bounce: 100 })));
    ok(shorts.every((r) => !r.outside && !r.bad && r.everHeld) && shorts[0].w.shrink < 1 && shorts[4].w.shrink < 1 && shorts.every((r) => r.w.sing > 0.5),
      'in a short frame, leaning and singing at Bounce 100, the frame holds it back, it is drawn smaller, and neither it nor a note is cut off');
    const [f30, f60, f120] = [30, 60, 120].map((fps) => owl([{ secs: 6.6, loud: syllables(fps) }], { fps }));
    ok(near(f30.mostLift, f60.mostLift, 0.06 * f60.mostLift) && near(f120.mostLift, f60.mostLift, 0.06 * f60.mostLift) && near(f30.w.flap, f120.w.flap, 0.02),
      `it bobs as high at 30, 60 and 120 fps (${(f30.mostLift / scale).toFixed(2)}, ${(f60.mostLift / scale).toFixed(2)}, ${(f120.mostLift / scale).toFixed(2)} px × scale)`);
  }

  // The Television's pose. script: [{ secs, loud, low, high, bounce, idle, live = true, W, H }]
  const tv = (script, o = {}) => {
    const [W0, H0, scale] = o.size ?? WIDE, fps = o.fps ?? 60;
    const v = o.tv ?? C.createTelevision();
    let t = 0, outside = false, bad = false, mostLift = -Infinity, mostWag = 0, mostTilt = 0, leastTilt = 0, highest = Infinity, lowest = -Infinity;
    const rolls = [];
    for (const s of script) for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) {
      t += 1 / fps;
      const W = s.W ?? W0, H = s.H ?? H0, loud = typeof s.loud === 'function' ? s.loud(t) : (s.loud ?? 0);
      v.step({ dt: 1 / fps, live: s.live !== false, level: { loud, low: s.low ?? 0, high: s.high ?? 0 }, bounce: s.bounce ?? o.bounce ?? 50, idle: !!s.idle, W, H, scale });
      if (![v.lift, v.cy, v.tilt, v.wag, v.open, v.k, v.roll, v.speaker, v.dials[0], v.dials[1]].every(Number.isFinite)) bad = true;
      if (v.cy - C.TV_UP * v.k < -H / 2 || v.cy + C.TV_BELOW * v.k > H / 2) outside = true;   // its antennae tips and its feet
      if (Math.abs(v.tilt) > 0.3 + 1e-9) bad = true;   // the tilt its reach above and below allows for
      mostLift = Math.max(mostLift, v.lift); mostWag = Math.max(mostWag, Math.abs(v.wag)); mostTilt = Math.max(mostTilt, v.tilt); leastTilt = Math.min(leastTilt, v.tilt);
      highest = Math.min(highest, v.cy); lowest = Math.max(lowest, v.cy);
      rolls.push(v.roll);
    }
    return { v, outside, bad, mostLift, mostWag, mostTilt, leastTilt, highest, lowest, rolls };
  };
  {
    const scale = WIDE[2];
    const silent = tv([{ secs: 8 }]);
    ok(silent.mostLift === 0 && silent.v.tilt === 0 && silent.mostWag === 0 && silent.v.asleep === false && silent.v.open === 0 && near(silent.v.smile, 1) && near(silent.v.k, 0.92 * scale) && silent.v.shrink === 1
      && near(silent.lowest - silent.highest, 2 * 2.2 * scale, 0.05 * scale) && near((silent.lowest + silent.highest) / 2, 5 * scale, 0.05 * scale),
      'the television, mic on and silent: awake, level, and hovering a little below the middle of the frame');
    const off = tv([{ secs: 8, live: false }]), idling = tv([{ secs: 8, live: false, idle: true }]);
    ok(off.v.asleep === true && off.lowest === off.highest && near(off.v.cy, 5 * scale) && idling.v.asleep === true && near(idling.lowest - idling.highest, 2 * 2.2 * scale, 0.05 * scale),
      'mic off it is asleep and still; with the idle animation it hovers in its sleep');
    const voiced = tv([{ secs: 3, loud: 0.5, low: 0.6, high: 0.3 }]).v, loud = tv([{ secs: 3, loud: 0.9 }]).v;
    ok(near(voiced.open, 0.7, 1e-3) && near(voiced.speaker, 0.5, 1e-3) && near(voiced.dials[0], 0.6, 1e-3) && near(voiced.dials[1], 0.3, 1e-3) && near(voiced.smile, 0, 1e-6) && loud.open === 1 && loud.ears.happy === true,
      'a voice opens its mouth, lights its speaker and turns its dials: one with the low end, one with the high');
    const hop = tv([{ secs: 1 }, { secs: 0.3, loud: 0.9 }]), landed = tv([{ secs: 1 }, { secs: 6, loud: 0.9 }]);
    ok(hop.mostLift > 3 * scale && hop.mostWag > 0.2 && hop.mostWag < 1 && Math.abs(landed.v.lift) < 0.3 * scale && Math.abs(landed.v.wag) < 0.02,
      `a syllable bounces it (${(hop.mostLift / scale).toFixed(1)} px × scale up) and springs its antennae, and both settle`);
    const lowish = tv([{ secs: 3, loud: 0.5, low: 0.8, high: 0.1 }]).v, highish = tv([{ secs: 3, loud: 0.5, low: 0.1, high: 0.8 }]).v;
    const stillOne = tv([{ secs: 1 }, { secs: 3, loud: 0.9, low: 0.1, high: 0.8 }], { bounce: 0 });
    ok(near(lowish.tilt, -0.1, 0.01) && near(highish.tilt, 0.1, 0.01) && lowish.wag < -0.01 && highish.wag > 0.01 && stillOne.mostLift === 0 && stillOne.mostTilt === 0 && stillOne.leastTilt === 0 && stillOne.mostWag === 0
      && near(stillOne.lowest - stillOne.highest, 2 * 2.2 * scale, 0.05 * scale) && stillOne.v.open === 1,
      'it tilts, and its antennae lean, toward the end of the sound that is winning; at Bounce 0 it only hovers and talks');
    const r = silent.rolls, wraps = r.filter((x, i) => i > 0 && x < r[i - 1]).length;
    ok(r.every((x) => x >= 0 && x < 1) && wraps >= 2 && wraps <= 3, 'the band on its screen rolls down once in about three seconds');
    const hard = SIZES.map((size) => tv([{ secs: 20, loud: (t) => (t % 0.5 < 0.2 ? 1 : 0), low: 0.1, high: 0.9 }], { size, bounce: 100 }));
    ok(hard.every((x) => !x.outside && !x.bad && x.mostLift > 0), 'at Bounce 100 and full voice no part of it leaves the frame, on all three pages');
    const short = tv([{ secs: 2, loud: 0.6 }, { secs: 2, loud: 0.6, W: 260, H: 60 }]);
    ok(!short.outside && !short.bad && short.v.shrink < 1 && short.v.k < 0.92 * scale, 'a frame too short for it draws it smaller, not cut off');
    const [f30, f60, f120] = [30, 60, 120].map((fps) => tv([{ secs: 6.6, loud: syllables(fps) }], { fps }));
    ok(near(f30.mostLift, f60.mostLift, 0.06 * f60.mostLift) && near(f120.mostLift, f60.mostLift, 0.06 * f60.mostLift) && near(f30.mostWag, f120.mostWag, 0.08 * f120.mostWag),
      `it bounces as high at 30, 60 and 120 fps (${(f30.mostLift / scale).toFixed(2)}, ${(f60.mostLift / scale).toFixed(2)}, ${(f120.mostLift / scale).toFixed(2)} px × scale)`);
  }

  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="characters.js"');
    order.push(pos > html.indexOf('src="infall.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load characters.js after infall.js and before the factories');
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
