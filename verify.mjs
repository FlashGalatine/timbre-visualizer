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
//  13. Flags — overlay/flag.js under Node: the five flags (colours, shares,
//      the union and its stars), painting them, the voice history (travel,
//      glide, frame rates), lift and droop, the cloth (constant length, pinned
//      at the pole, clear of the ground, ripples), and that all three overlay
//      pages load it after scene-parts.js and before the factories. (Also runs
//      before section 4.)
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
  ok(T.ACTIVE_VIZ_NAMES.length === 52, `52 visualizers (${T.ACTIVE_VIZ_NAMES.length})`);
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
  ok(T.VIZ_SCENES.indexOf('winter-aurora') === 1 && T.VIZ_SCENES.indexOf('thanksgiving-harvest') === 0, 'winter-aurora is the second kit scene');
  const FLAG_IDS = ['pride-ribbon', 'bi-pride-ribbon', 'ace-pride-ribbon', 'trans-pride-ribbon', 'july-fourth-stripes'];
  ok(JSON.stringify(T.VIZ_SCENES) === JSON.stringify(['thanksgiving-harvest', 'winter-aurora', ...FLAG_IDS, 'sunburst-3d', 'mountains-3d', 'phosphor', 'chladni', 'glass-prism', 'metaball', 'ink', 'shards', 'jelly', 'school-of-fish', 'boids', 'rose', 'christmas-tree']) && FLAG_IDS.every((n) => T.VIZ_USES_3D.includes(n)), 'the five flags are kit scenes, listed after winter-aurora');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['pride-ribbon']) === '{"wind":50,"heartRate":50,"stripeStyle":0,"cameraDrift":50}'
    && ['bi', 'ace', 'trans'].every((p) => JSON.stringify(T.DEFAULT_PER_VIZ[p + '-pride-ribbon']) === '{"wind":50,"heartRate":50,"cameraDrift":50}'), 'pride flag knobs');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['july-fourth-stripes']) === '{"wind":50,"starTwinkle":50,"burstChance":50,"cameraDrift":50}', 'fourth of july flag knobs');
  ok(JSON.stringify(T.VIZ_LABELS) === JSON.stringify({ 'pride-ribbon': 'Pride flag', 'bi-pride-ribbon': 'Bi pride flag', 'ace-pride-ribbon': 'Ace pride flag', 'trans-pride-ribbon': 'Trans pride flag', 'july-fourth-stripes': 'Fourth of July flag', 'school-of-fish': 'School of Fish' })
    && FLAG_IDS.every((n) => T.ACTIVE_VIZ_NAMES.includes(n)), 'the five flags have display names, and keep their ids; School of Fish has its capitals');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['winter-aurora']) === '{"auroraGlow":50,"snowfall":50,"starDensity":50,"cameraDrift":50}', 'winter aurora knobs');
  ok(JSON.stringify(T.defaultConfig().placement) === '{"x":0,"y":0,"size":100}', 'defaultConfig has placement');
  ok(JSON.stringify(T.VIZ_AFTERGLOW) === '["visualizer","peak-hold","ring-bars","sine-bars","waveform","ring-waveform"]', 'the six afterglow effects');
  ok(T.VIZ_AFTERGLOW.every((n) => T.ACTIVE_VIZ_NAMES.includes(n) && !T.VIZ_USES_3D.includes(n)), 'afterglow effects are known 2D effects');
  ok(T.defaultConfig().afterglow === 1.6 && !('afterglow' in T.TOP_RANGES), 'afterglow defaults to 1.6 s and is not a global slider');
  const cfg = T.defaultConfig();
  ok(Object.keys(T.TOP_RANGES).every((k) => typeof cfg[k] === 'number'), 'defaultConfig has every numeric knob');
  ok(Object.keys(T.TOP_BOOLS).every((k) => typeof cfg[k] === 'boolean'), 'defaultConfig has every toggle');
  ok(cfg.activeViz === 'visualizer' && cfg.perViz && cfg.mic, 'defaultConfig structure');
  ok(!('stlObject' in cfg) && T.STL_OBJECT_DEFAULTS === undefined && T.STL_OBJECT_RANGES === undefined, 'the 3D-model settings went with the model: no table of them, and none in a config');

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
  ok(!('stlObject' in s), "a saved config's old 3D-model settings are read without error and dropped");
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
  const oldFlags = T.sanitizeConfig({ activeViz: 'pride-ribbon', perViz: { 'pride-ribbon': { ribbonAmplitude: 90, heartRate: 20, stripeStyle: 80 }, 'bi-pride-ribbon': { ribbonAmplitude: 10, heartRate: 70 }, 'july-fourth-stripes': { stripeAmplitude: 90, starTwinkle: 10, burstChance: 300 } } });
  ok(oldFlags.activeViz === 'pride-ribbon' && JSON.stringify(oldFlags.perViz['pride-ribbon']) === '{"wind":50,"heartRate":20,"stripeStyle":80,"cameraDrift":50}'
    && JSON.stringify(oldFlags.perViz['bi-pride-ribbon']) === '{"wind":50,"heartRate":70,"cameraDrift":50}'
    && JSON.stringify(oldFlags.perViz['july-fourth-stripes']) === '{"wind":50,"starTwinkle":10,"burstChance":100,"cameraDrift":50}', 'a saved pre-redesign flag config keeps its hearts, stripes, stars and bursts, drops the retired amplitudes and clamps');
  const oldAurora = T.sanitizeConfig({ perViz: { 'winter-aurora': { ribbonCount: 80, starDensity: 20, mountainOpacity: 10, snowfall: 400 } } });
  ok(JSON.stringify(oldAurora.perViz['winter-aurora']) === '{"auroraGlow":50,"snowfall":100,"starDensity":20,"cameraDrift":50}', 'a saved pre-redesign winter-aurora config keeps starDensity, drops the retired knobs and clamps');
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

  // Turning what a scene shows.
  {
    const p = [0, 0, 0], t3 = (x, y, z, rx, ry, rz) => Array.from(K.turn(p, x, y, z, rx, ry, rz)), eq = (a, b) => a.every((v, i) => near(v, b[i], 1e-9));
    ok(eq(t3(1, 2, 3, 0, 0, 0), [1, 2, 3]) && eq(t3(0, 1, 0, 90, 0, 0), [0, 0, 1]) && eq(t3(0, 0, 1, 90, 0, 0), [0, -1, 0]) && eq(t3(1, 0, 0, 0, 90, 0), [0, 0, -1]) && eq(t3(0, 0, 1, 0, 90, 0), [1, 0, 0])
      && eq(t3(1, 0, 0, 0, 0, 90), [0, 1, 0]) && eq(t3(0, 1, 0, 0, 0, 90), [-1, 0, 0]) && eq(t3(1, 2, 3, 360, 360, 360), [1, 2, 3]) && K.turn(p, 1, 0, 0, 0, 0, 0) === p,
      'turn: about x the top tilts toward the viewer, about y the thing spins in its own plane, about z it rolls to one side');
    ok(eq(t3(1, 0, 0, 90, 90, 0), [0, 1, 0]) && eq(t3(1, 0, 0, 0, 90, 90), [0, 0, -1]) && eq(t3(0, 1, 0, 90, 0, 90), [-1, 0, 0]), 'turn: the spin comes first, then the roll, then the tilt');
    // A box and a view, and its reach worked out here from the camera's own place.
    const box = { min: [-2.5, -0.5, -1.5], max: [2.5, 1.5, 1.5] }, view = { frame: { width: 8, height: 5, center: [0.2, 0.7, -0.1] }, fov: 30, pitch: 20 };
    const P = 20 * Math.PI / 180, dist = 2.5 / Math.tan(15 * Math.PI / 180), cam = [0.2, 0.7 + dist * Math.sin(P), -0.1 + dist * Math.cos(P)];
    const seen = (rx, ry, rz, scale, at) => {
      const b = [Infinity, -Infinity, Infinity, -Infinity];
      for (const x of [-2.5, 2.5]) for (const y of [-0.5, 1.5]) for (const z of [-1.5, 1.5]) {
        const c = t3(x, y, z, rx, ry, rz).map((v, i) => v * scale + at[i]), d = [c[0] - cam[0], c[1] - cam[1], c[2] - cam[2]];
        const depth = -(d[1] * Math.sin(P) + d[2] * Math.cos(P)), v = (d[1] * Math.cos(P) - d[2] * Math.sin(P)) * dist / depth, h = d[0] * dist / depth;
        b[0] = Math.min(b[0], v); b[1] = Math.max(b[1], v); b[2] = Math.min(b[2], h); b[3] = Math.max(b[3], h);
      }
      return b;
    };
    const cases = [[0, 0, 0, 1, [0, 0, 0]], [70, 0, 0, 1, [0, 0, 0]], [30, 70, 200, 0.7, [0.3, -0.2, 0.1]], [300, 10, 45, 1, [0, 0.4, -0.3]]];
    ok(cases.every(([rx, ry, rz, scale, at]) => K.reach(box, view, rx, ry, rz, scale, at[0], at[1], at[2]).every((v, i) => near(v, seen(rx, ry, rz, scale, at)[i], 1e-9))),
      'reach: how far a turned box reaches on the picture is that of its eight corners as the resting camera sees them');
    // The same with the camera swung round the middle of the frame, worked out from where the camera then is.
    const swung = (o, rx, ry, rz, scale, at) => {
      const cm = [0.2 + dist * Math.sin(o) * Math.cos(P), 0.7 + dist * Math.sin(P), -0.1 + dist * Math.cos(o) * Math.cos(P)], f = [(0.2 - cm[0]) / dist, (0.7 - cm[1]) / dist, (-0.1 - cm[2]) / dist];
      const sl = Math.hypot(f[0], f[2]), side = [-f[2] / sl, 0, f[0] / sl], upv = [side[1] * f[2] - side[2] * f[1], side[2] * f[0] - side[0] * f[2], side[0] * f[1] - side[1] * f[0]];
      const b = [Infinity, -Infinity, Infinity, -Infinity];
      for (const x of [-2.5, 2.5]) for (const y of [-0.5, 1.5]) for (const z of [-1.5, 1.5]) {
        const c = t3(x, y, z, rx, ry, rz).map((v, i) => v * scale + at[i]), d = [c[0] - cm[0], c[1] - cm[1], c[2] - cm[2]];
        const depth = d[0] * f[0] + d[1] * f[1] + d[2] * f[2], v = (d[0] * upv[0] + d[1] * upv[1] + d[2] * upv[2]) * dist / depth, h = (d[0] * side[0] + d[1] * side[1] + d[2] * side[2]) * dist / depth;
        b[0] = Math.min(b[0], v); b[1] = Math.max(b[1], v); b[2] = Math.min(b[2], h); b[3] = Math.max(b[3], h);
      }
      return b;
    };
    const swings = [[0.3, 30, 70, 200, 0.7, [0.3, -0.2, 0.1]], [-0.5, 300, 10, 45, 1, [0, 0.4, -0.3]], [0, 70, 0, 0, 1, [0, 0, 0]], [0.28, 0, 0, 0, 1, [0, 0, 0]]];
    ok(swings.every(([o, rx, ry, rz, scale, at]) => K.reach(box, view, rx, ry, rz, scale, at[0], at[1], at[2], o).every((v, i) => near(v, swung(o, rx, ry, rz, scale, at)[i], 1e-9)))
      && !K.reach(box, view, 30, 70, 200, 0.7, 0.3, -0.2, 0.1, 0.3).every((v, i) => near(v, K.reach(box, view, 30, 70, 200, 0.7, 0.3, -0.2, 0.1)[i], 0.01)),
      'reach: with the camera swung round the middle of the frame, it is as the camera sees the box from there');
    {
      const all = [-0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4].map((o) => K.reach(box, view, 30, 70, 200, 0.7, 0.3, -0.2, 0.1, o)), swept = K.sweep(box, view, 30, 70, 200, 0.7, 0.3, -0.2, 0.1, 0.4);
      const want = [Math.min(...all.map((r) => r[0])), Math.max(...all.map((r) => r[1])), Math.min(...all.map((r) => r[2])), Math.max(...all.map((r) => r[3]))];
      ok(swept.every((v, i) => v === want[i]) && K.sweep(box, view, 30, 70, 200, 0.7, 0.3, -0.2, 0.1, 0).every((v, i) => v === all[4][i]) && K.sweep(box, view, 30, 70, 200, 0.7, 0.3, -0.2, 0.1).every((v, i) => v === all[4][i]) && swept[3] > all[4][3] + 0.1,
        'sweep: the reach of a box over a camera that sways is the furthest it reaches from anywhere the camera comes to');
      // A corner at the camera, or behind it, has no place on the picture; the arithmetic must not fall over.
      const through = { min: [-1, -1, -1], max: [1, 1, dist + 3] }, onPlane = { min: [-1, -1, -1], max: [1, 1, dist * Math.cos(P)] };
      const finite = (p) => [p.scale, p.x, p.y, p.z].every(Number.isFinite) && p.scale > 0;
      // (Held just in front of the camera, a corner off to one side is far off to that side, not flipped to the other.)
      ok(K.reach(through, view, 0, 0, 0, 1, 0, 0, 0)[3] > 10 && K.reach(through, view, 0, 0, 0, 1, 0, 0, 0)[2] < -10 && K.reach(through, view, 0, 0, 0, 1, 0, 0, 0).every(Number.isFinite) && K.reach(onPlane, view, 0, 0, 0, 1, 0, 0, 0).every(Number.isFinite) && finite(K.poseFor(through, view, 0, 0, 0)) && finite(K.poseFor(onPlane, view, 20, 30, 40)) && finite(K.poseFor(through, view, 80, 30, 40, 0.3)),
        'reach and poseFor: a box that reaches the camera still gets numbers');
    }
    // What a turned box is held to. At rest: `size` is how tall and wide it may be (what it was unturned, or 86% of
    // the frame), `home` where its middle belongs (where the unturned box's is), `room` how far out it may reach
    // (as far as it did unturned, or 86% of the way to the edge). `swayed`: how far out it may reach wherever a
    // camera that sways comes to (the frame's edge, or as far as the unturned box reaches from there).
    const heldTo = (bx, vw, sway) => {
      const r = K.reach(bx, vw, 0, 0, 0, 1, 0, 0, 0), s = K.sweep(bx, vw, 0, 0, 0, 1, 0, 0, 0, sway), hv = vw.frame.height / 2, hh = vw.frame.width / 2;
      return { size: [Math.max(1.72 * hv, r[1] - r[0]), Math.max(1.72 * hh, r[3] - r[2])], home: [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2],
        room: [Math.min(r[0], -0.86 * hv), Math.max(r[1], 0.86 * hv), Math.min(r[2], -0.86 * hh), Math.max(r[3], 0.86 * hh)],
        swayed: [Math.min(s[0], -hv), Math.max(s[1], hv), Math.min(s[2], -hh), Math.max(s[3], hh)] };
    };
    // Every rotation on a grid (every `step` degrees each way, off the round numbers). All of these should be nothing:
    // big: how much taller or wider than its size a box as posed is. outside: how far it passes its room at rest, or
    // (swayed) passes the frame from any of the nine places the sway is measured at. between: the same from
    // seventeen places. slack: of the boxes drawn smaller, the most that one could still have grown. astray: how
    // far a box's middle is from home when the camera is still and it had room to be there.
    const fits = (bx, vw, sway, step) => {
      const h = heldTo(bx, vw, sway), out = { big: 0, outside: 0, between: 0, slack: 0, astray: 0, smallest: 1, shrunk: 0, n: 0, held: h };
      const past = (r, w) => Math.max(w[0] - r[0], r[1] - w[1], w[2] - r[2], r[3] - w[3]);
      for (let rx = 7; rx < 360; rx += step) for (let ry = 3; ry < 360; ry += step) for (let rz = 11; rz < 360; rz += step) {
        const p = K.poseFor(bx, vw, rx, ry, rz, sway), r = K.reach(bx, vw, rx, ry, rz, p.scale, p.x, p.y, p.z), s = K.sweep(bx, vw, rx, ry, rz, p.scale, p.x, p.y, p.z, sway);
        out.n++; out.smallest = Math.min(out.smallest, p.scale);
        if (!(p.scale <= 1 && p.scale > 0)) out.big = Infinity;
        out.big = Math.max(out.big, r[1] - r[0] - h.size[0], r[3] - r[2] - h.size[1]);
        out.outside = Math.max(out.outside, past(s, h.swayed), sway > 0 ? 0 : past(r, h.room));
        for (let i = -8; i <= 8; i++) out.between = Math.max(out.between, past(K.reach(bx, vw, rx, ry, rz, p.scale, p.x, p.y, p.z, sway * i / 8), h.swayed));
        if (p.scale < 1) { out.shrunk++; out.slack = Math.max(out.slack, Math.min(h.size[0] - (r[1] - r[0]), h.size[1] - (r[3] - r[2]), sway > 0 ? h.swayed[1] - h.swayed[0] - (s[1] - s[0]) : Infinity, sway > 0 ? h.swayed[3] - h.swayed[2] - (s[3] - s[2]) : Infinity)); }
        if (!(sway > 0)) {
          const halfV = (r[1] - r[0]) / 2, halfH = (r[3] - r[2]) / 2;
          if (h.home[0] - halfV >= h.room[0] && h.home[0] + halfV <= h.room[1]) out.astray = Math.max(out.astray, Math.abs((r[0] + r[1]) / 2 - h.home[0]));
          if (h.home[1] - halfH >= h.room[2] && h.home[1] + halfH <= h.room[3]) out.astray = Math.max(out.astray, Math.abs((r[2] + r[3]) / 2 - h.home[1]));
        }
      }
      return out;
    };
    const sound = (r) => r.big < 1e-6 && r.outside < 1e-6 && r.between < 0.02 && r.slack < 1e-6 && r.astray < 1e-6;
    // This box fits its frame at rest, so it has 86% of the frame for room; a larger one keeps the room it had.
    const rest = K.reach(box, view, 0, 0, 0, 1, 0, 0, 0), still = K.poseFor(box, view, 0, 0, 0), swayed = K.poseFor(box, view, 0, 0, 0, 0.5);
    const big = { min: [-3.9, -0.5, -2], max: [3.9, 2, 2] }, bigRest = K.reach(big, view, 0, 0, 0, 1, 0, 0, 0), bigStill = K.poseFor(big, view, 0, 0, 0), bigSwayed = K.poseFor(big, view, 0, 0, 0, 0.5);
    const exact = (p) => Object.is(p.scale, 1) && Object.is(p.x, 0) && Object.is(p.y, 0) && Object.is(p.z, 0);
    ok(K.FILL === 0.86 && exact(still) && exact(swayed) && exact(bigStill) && exact(bigSwayed) && bigRest[3] > 0.86 * 4 && rest[3] < 0.86 * 4 && near(heldTo(box, view, 0).room[1], 0.86 * 2.5, 1e-9) && near(heldTo(big, view, 0).room[3], bigRest[3], 1e-9),
      'poseFor: with no rotation a box is where it was at full size, even one that already reaches past 86% of its frame, and whether or not the camera sways');
    const plain = fits(box, view, 0, 24), drifting = fits(box, view, 0.3, 24);
    // A box taller than 86% of its frame unturned, one wider, and one that comes halfway to the camera.
    const tallBox = { min: [-1, -1.6, -0.5], max: [1, 3, 0.5] }, tallRest = K.reach(tallBox, view, 0, 0, 0, 1, 0, 0, 0), deep = { min: [-0.5, -0.5, -0.5], max: [1.5, 0.5, 5.5] };
    ok(tallRest[1] - tallRest[0] > 1.72 * 2.5 && tallRest[1] < 2.5 && tallRest[0] > -2.5 && exact(K.poseFor(tallBox, view, 0, 0, 0)) && exact(K.poseFor(tallBox, view, 0, 0, 0, 0.3)) && sound(fits(tallBox, view, 0, 45)),
      'poseFor: a box taller than 86% of its frame keeps the height it had');
    {
      const wideFits = fits(big, view, 0, 40), wideSway = fits(big, view, 0.3, 40), deepFits = fits(deep, view, 0, 40), deepSway = fits(deep, view, 0.3, 40);
      ok(sound(wideFits) && sound(wideSway) && wideFits.shrunk > 100, 'poseFor: a box wider than 86% of its frame is held to the room it had, and no more: ' + JSON.stringify([wideFits.outside, wideFits.astray, wideSway.outside]));
      ok(sound(deepFits) && sound(deepSway) && deepFits.shrunk > 100, 'poseFor: a box that comes halfway to the camera, where a move shows twice as large, still settles: ' + JSON.stringify([deepFits.outside, deepFits.big, deepFits.astray, deepSway.outside, deepSway.between]));
    }
    {
      // A box is moved across the picture, never toward the camera or away from it.
      let along = 0, moved = 0;
      for (const [rx, ry, rz] of [[72, 45, 0], [30, 70, 200], [300, 10, 45], [159, 54, 0], [10, 20, 30]]) { const p = K.poseFor(box, view, rx, ry, rz); along = Math.max(along, Math.abs(p.y * Math.sin(P) + p.z * Math.cos(P))); moved = Math.max(moved, Math.abs(p.y)); }
      ok(along < 1e-9 && moved > 0.3, 'poseFor: a box is moved across the picture, never toward the camera or away from it');
    }
    ok(sound(plain) && plain.smallest < 0.8 && plain.smallest > 0.4 && plain.shrunk > 0.5 * plain.n && plain.n === 3375, 'poseFor: however a box is turned it is no larger than it may be, as large as that lets it be, where the unturned box sits, and inside its room: ' + JSON.stringify(plain));
    ok(sound(drifting) && drifting.smallest <= plain.smallest && drifting.smallest > 0.3 && drifting.held.swayed[1] === 2.5, 'poseFor: with a camera that sways it is inside the frame wherever the camera comes to: ' + JSON.stringify(drifting));
    {
      // A turn the old four rounds left a long way from home: the answer is one that a further round does not change.
      const p = K.poseFor(box, view, 72, 45, 0), h = heldTo(box, view, 0), r = K.reach(box, view, 72, 45, 0, p.scale, p.x, p.y, p.z);
      ok(p.scale < 0.95 && Math.abs(r[1] - r[0] - h.size[0]) < 1e-8 && Math.abs(r[0] - h.room[0]) < 1e-8 && Math.abs(r[1] - h.room[1]) < 1e-8 && Math.abs((r[2] + r[3]) / 2 - h.home[1]) < 1e-8 && h.home[0] < -0.3,
        'poseFor: it goes on until a round changes nothing; this box fills its room from top to bottom, so it cannot sit as low as the unturned box does');
    }
    globalThis.__fits = fits; globalThis.__sound = sound;
  }
  // A scene's own box, turned every way, with the camera still and with it swaying as far as Camera drift at 100
  // takes it: at rest it is inside its room, which is inside the frame; swaying, it is inside the frame (or reaches
  // no further than the unturned box does).
  globalThis.__turnedInFrame = (M, sway) => {
    const view = { frame: M.FRAME, fov: M.FOV, pitch: M.PITCH }, calm = globalThis.__fits(M.BOX, view, 0, 30), swaying = globalThis.__fits(M.BOX, view, sway, 30);
    const H = M.FRAME.height / 2;
    return globalThis.__sound(calm) && globalThis.__sound(swaying) && calm.held.room[0] > -H && calm.held.room[1] < H && calm.smallest > 0.4 && calm.smallest < 0.9 && swaying.smallest > 0.3 && swaying.smallest <= calm.smallest && swaying.n === 1728;
  };
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

  // The smoothing formulas a scene may use for its own values.
  ok(typeof K.follow === 'function' && near(K.follow(0, 1, 3, 0.25), 1 - Math.exp(-0.75), 1e-12) && K.follow(0.4, 0.4, 9, 1) === 0.4, 'follow closes the gap by 1 - exp(-rate × dt)');
  ok(typeof K.follow === 'function' && near(K.follow(K.follow(0.2, 0.9, 5, 1 / 60), 0.9, 5, 1 / 60), K.follow(0.2, 0.9, 5, 1 / 30), 1e-12), 'two 60 fps follows equal one 30 fps follow');
  ok(typeof K.fall === 'function' && near(K.fall(0.8, 2, 0.5), 0.8 * Math.exp(-1), 1e-12) && near(K.fall(K.fall(0.8, 2, 0.25), 2, 0.25), K.fall(0.8, 2, 0.5), 1e-12), 'fall decays by exp(-rate × dt), the same in one step or two');

  // How an afterglow cools is the scene's choice: three extra fade times, one per channel.
  const warm = K.decay(1 / 60, 0.35), same = typeof K.cooling === 'function' ? K.decay(1 / 60, 0.35, K.cooling(undefined)) : [];
  ok([0, 1, 2].every((i) => warm[i] === same[i]), 'the default cooling is the candlelight one');
  const AURORA = [0.05, Infinity, 0.25];
  const c60 = K.decay(1 / 60, 0.35, AURORA), c30 = K.decay(1 / 30, 0.35, AURORA), plain = Math.exp(-(1 / 60) / 0.35);
  ok(near(c60[1], plain, 1e-12) && c60[0] < c60[2] && c60[2] < c60[1] && near(c60[0], plain * Math.exp(-(1 / 60) / 0.05), 1e-12), 'a cooling fades each channel by its own extra time; Infinity adds none');
  ok([0, 1, 2].every((i) => near(c60[i] * c60[i], c30[i], 1e-12)), 'a cooled decay is the same in one 30 fps step or two 60 fps steps');
  const isDefault = (t) => Array.isArray(t) && t.length === 3 && t[0] === Infinity && t[1] === 0.098 && t[2] === 0.035;
  ok(typeof K.cooling === 'function' && [undefined, null, 'warm', 7, [], [1, 2], [1, 2, 3, 4], [0, 1, 1], [-1, 1, 1], [NaN, 1, 1], [1, '2', 3]].every((bad) => isDefault(K.cooling(bad))),
    'a cooling that is not three positive numbers is ignored for the default');
  ok(typeof K.cooling === 'function' && JSON.stringify(K.cooling([0.05, Infinity, 0.25]).map(String)) === '["0.05","Infinity","0.25"]' && K.cooling(AURORA) !== AURORA, 'a good cooling is taken as given, as a copy');

  // The factory every scene would otherwise write by hand; with no three.js it draws nothing.
  let threw = null, made = null, calls = 0;
  try {
    made = K.factory(() => { calls++; return { frame: { width: 1, height: 1, center: [0, 0, 0] }, fov: 30, pitch: 0, build() {}, update() {} }; })();
    made.start(); made.draw(16, 1 / 60); made.onResize(); made.stop(); made.stop(); made.draw(32, 1 / 60);
  } catch (e) { threw = String(e); }
  ok(threw === null && made && ['start', 'stop', 'onResize', 'draw'].every((m) => typeof made[m] === 'function') && calls === 1,
    `factory(definition) gives start/stop/onResize/draw that are safe with no scene${threw ? ' — ' + threw : ''}`);
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
    let cyStep = 0, everHeld = false, liftOff = 0, mostBlink = 0, last = null;
    const rolls = [], snows = [];
    for (const s of script) for (let k = 0, n = Math.round(s.secs * fps); k < n; k++) {
      t += 1 / fps;
      const W = s.W ?? W0, H = s.H ?? H0, loud = typeof s.loud === 'function' ? s.loud(t) : (s.loud ?? 0);
      v.step({ dt: 1 / fps, live: s.live !== false, level: { loud, low: s.low ?? 0, high: s.high ?? 0 }, bounce: s.bounce ?? o.bounce ?? 50, idle: !!s.idle, W, H, scale });
      if (![v.lift, v.cy, v.tilt, v.wag, v.open, v.k, v.roll, v.speaker, v.dials[0], v.dials[1], v.snow, v.blink, v.look].every(Number.isFinite)) bad = true;
      // Measured from its drawing: an antenna's ball, straight up, reaches 53.4 units above its middle, and the
      // corner of a foot, at its largest tilt, 38.4 below. Both stay 3 px × scale inside the frame.
      const room = H / 2 - 3 * scale + 1e-6;
      if (v.cy - 53.4 * v.k < -room || v.cy + 38.4 * v.k > room) outside = true;
      if (v.held) everHeld = true;
      // lift is how far above its resting place (which hovers) it is drawn.
      if (!v.held) liftOff = Math.max(liftOff, Math.abs(v.lift - ((5 + Math.sin(v.ears.clock * 1.7) * 2.2 * v.ears.awake) * scale - v.cy)));
      mostBlink = Math.max(mostBlink, v.blink);
      if (last !== null) cyStep = Math.max(cyStep, Math.abs(v.cy - last));
      last = v.cy;
      snows.push(v.snow);
      if (Math.abs(v.tilt) > 0.3 + 1e-9) bad = true;   // the tilt its reach above and below allows for
      mostLift = Math.max(mostLift, v.lift); mostWag = Math.max(mostWag, Math.abs(v.wag)); mostTilt = Math.max(mostTilt, v.tilt); leastTilt = Math.min(leastTilt, v.tilt);
      highest = Math.min(highest, v.cy); lowest = Math.max(lowest, v.cy);
      rolls.push(v.roll);
    }
    return { v, outside, bad, mostLift, mostWag, mostTilt, leastTilt, highest, lowest, rolls, snows, cyStep, everHeld, liftOff, mostBlink };
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
    // Still means still: with the mic and the idle animation both off the band on its screen stops, its static holds one
    // picture and it does not blink. With the idle animation on the static changes 20 times a second, by the clock.
    const offTail = tv([{ secs: 4, live: false }], { tv: off.v }), [s30, s144] = [30, 144].map((fps) => tv([{ secs: 3, live: false, idle: true }], { fps }));
    ok(new Set(offTail.rolls).size === 1 && new Set(offTail.snows).size === 1 && off.mostBlink === 0 && offTail.mostBlink === 0
      && near(idling.snows.at(-1) - idling.snows[0], 160, 2) && idling.rolls.some((x, i) => i > 0 && x < idling.rolls[i - 1]) && Math.abs(s30.v.snow - s144.v.snow) <= 1 && silent.mostBlink > 0.8,
      'with the mic and the idle animation both off its screen holds still and it does not blink; asleep with the idle animation on, its static changes 20 times a second at any frame rate');
    // The hover eases in and out with the mic: it does not jump.
    const woken = tv([{ secs: 1, live: false }, { secs: 1 }]), dozed = tv([{ secs: 1 }, { secs: 2.5, live: false }]);
    ok(woken.cyStep < 0.3 * scale && dozed.cyStep < 0.3 * scale && near(dozed.v.cy, 5 * scale, 0.01 * scale),
      `the mic coming on or going off does not make it jump (at most ${(Math.max(woken.cyStep, dozed.cyStep) / scale).toFixed(2)} px × scale in a frame)`);
    const voiced = tv([{ secs: 3, loud: 0.5, low: 0.6, high: 0.3 }]).v, loud = tv([{ secs: 3, loud: 0.9 }]).v;
    ok(near(voiced.open, 0.7, 1e-3) && near(voiced.speaker, 0.5, 1e-3) && near(voiced.dials[0], 0.6, 1e-3) && near(voiced.dials[1], 0.3, 1e-3) && near(voiced.smile, 0, 1e-6) && loud.open === 1 && loud.ears.happy === true,
      'a voice opens its mouth, lights its speaker and turns its dials: one with the low end, one with the high');
    const hop = tv([{ secs: 1 }, { secs: 0.3, loud: 0.9 }]), landed = tv([{ secs: 1 }, { secs: 6, loud: 0.9 }]);
    ok(hop.mostLift > 3 * scale && hop.mostWag > 0.2 && hop.mostWag < 1 && Math.abs(landed.v.lift) < 0.3 * scale && Math.abs(landed.v.wag) < 0.02,
      `a syllable bounces it (${(hop.mostLift / scale).toFixed(1)} px × scale up) and springs its antennae, and both settle`);
    ok(hop.liftOff < 1e-9 && landed.liftOff < 1e-9 && !hop.everHeld && 5 * scale - hop.highest > 3 * scale, 'the bounce is in what is drawn: its middle rises by the lift');
    const stopped = tv([{ secs: 1 }, { secs: 0.15, loud: 0.9, low: 0.1, high: 0.9 }, { secs: 1 / 60, loud: 0.9, low: 0.1, high: 0.9, bounce: 0 }]).v;
    ok(stopped.lift === 0 && stopped.tilt === 0 && stopped.wag === 0 && stopped.ears.lean > 0.05, 'Bounce set to 0 in the middle of a bounce stops the bounce, the tilt and the antennae at once');
    const lowish = tv([{ secs: 3, loud: 0.5, low: 0.8, high: 0.1 }]).v, highish = tv([{ secs: 3, loud: 0.5, low: 0.1, high: 0.8 }]).v;
    const stillOne = tv([{ secs: 1 }, { secs: 3, loud: 0.9, low: 0.1, high: 0.8 }], { bounce: 0 });
    ok(near(lowish.tilt, -0.1, 0.01) && near(highish.tilt, 0.1, 0.01) && lowish.wag < -0.01 && highish.wag > 0.01 && stillOne.mostLift === 0 && stillOne.mostTilt === 0 && stillOne.leastTilt === 0 && stillOne.mostWag === 0
      && near(stillOne.lowest - stillOne.highest, 2 * 2.2 * scale, 0.05 * scale) && stillOne.v.open === 1,
      'it tilts, and its antennae lean, toward the end of the sound that is winning; at Bounce 0 it only hovers and talks');
    const r = silent.rolls, wraps = r.filter((x, i) => i > 0 && x < r[i - 1]).length;
    ok(r.every((x) => x >= 0 && x < 1) && wraps >= 2 && wraps <= 3, 'the band on its screen rolls down once in about three seconds');
    const hard = SIZES.map((size) => tv([{ secs: 20, loud: (t) => (t % 0.5 < 0.2 ? 1 : 0), low: 0.1, high: 0.9 }], { size, bounce: 100 }));
    ok(hard.every((x) => !x.outside && !x.bad && x.mostLift > 0), 'at Bounce 100 and full voice no part of it leaves the frame, on all three pages');
    ok(C.TV_UP >= 53.4 && C.TV_BELOW >= 38.4, 'the reach it is fitted by covers its antennae and its feet however it tilts');
    const shorts = [[260, 60, 1], [260, 100, 1], [1728, 300, 4.8]].flatMap((size) => [[0.9, 0.1], [0.1, 0.9]].map(([low, high]) => tv([{ secs: 12, loud: (t) => (t % 0.5 < 0.3 ? 1 : 0.5), low, high }], { size, bounce: 100 })));
    ok(shorts.every((x) => !x.outside && !x.bad && x.everHeld) && shorts[0].v.shrink < 1 && shorts[4].v.shrink < 1, 'in a short frame, tilting at Bounce 100, it is drawn smaller and nothing is cut off');
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

// ── 13. Flags (pure; no browser) ─────────────────────────────────────────────
console.log('\n[13] flags');
await import('./overlay/flag.js');
{
  const F = globalThis.TimbreFlag;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const IDS = ['pride-ribbon', 'bi-pride-ribbon', 'ace-pride-ribbon', 'trans-pride-ribbon', 'july-fourth-stripes'];
  ok(F.HIST === 16 && F.HIST_HZ === 16 && F.NU === 56 && F.NV === 22 && F.HOIST === 2.3 && F.TOP === 4.75 && F.POLE_X === -2.5, 'the sizes: 16 history samples at 16 a second, a 56 by 22 cloth, hoist 2.3, top at 4.75');
  ok(JSON.stringify(Object.keys(F.FLAGS)) === JSON.stringify(IDS), 'one flag for each of the five effects');

  // The flags themselves.
  const rgb = (id, eight) => F.stripesOf(F.FLAGS[id], eight).map((s) => s.slice(0, 3).join(','));
  const shares = (id, eight) => { const st = F.stripesOf(F.FLAGS[id], eight), total = st.reduce((a, s) => a + s[3], 0); return st.map((s) => s[3] / total); };
  const SIX = ['228,30,38', '243,137,36', '254,224,53', '120,184,60', '0,130,200', '120,73,152'];
  ok(JSON.stringify(rgb('pride-ribbon', false)) === JSON.stringify(SIX) && shares('pride-ribbon', false).every((s) => near(s, 1 / 6)), 'rainbow: six equal stripes, red at the top, violet at the bottom');
  ok(JSON.stringify(rgb('pride-ribbon', true)) === JSON.stringify(['40,25,25', '120,80,60', ...SIX]) && shares('pride-ribbon', true).every((s) => near(s, 1 / 8)), 'rainbow, eight stripes: black and brown above the six');
  ok(IDS.slice(1).every((id) => JSON.stringify(rgb(id, true)) === JSON.stringify(rgb(id, false))), 'only the rainbow has an eight-stripe form');
  ok(JSON.stringify(rgb('bi-pride-ribbon')) === JSON.stringify(['214,2,112', '155,79,150', '0,56,168']) && shares('bi-pride-ribbon').every((s, i) => near(s, [0.4, 0.2, 0.4][i])), 'bi: magenta 40%, purple 20%, blue 40%');
  ok(JSON.stringify(rgb('ace-pride-ribbon')) === JSON.stringify(['22,22,22', '165,165,165', '240,240,240', '128,0,128']) && shares('ace-pride-ribbon').every((s) => near(s, 0.25)), 'ace: four equal stripes, black, grey, white, purple');
  const trans = rgb('trans-pride-ribbon');
  ok(JSON.stringify(trans) === JSON.stringify(['91,206,250', '245,169,184', '255,255,255', '245,169,184', '91,206,250']) && shares('trans-pride-ribbon').every((s) => near(s, 0.2))
    && JSON.stringify(trans) === JSON.stringify(trans.slice().reverse()), 'trans: five equal stripes, the same read from either end');
  const july = F.FLAGS['july-fourth-stripes'];
  ok(rgb('july-fourth-stripes').length === 13 && rgb('july-fourth-stripes').every((c, i) => c === (i % 2 === 0 ? '201,36,50' : '248,248,250')) && shares('july-fourth-stripes').every((s) => near(s, 1 / 13)),
    'fourth of july: thirteen equal stripes, red first and last');
  ok(july.aspect === 1.9 && july.canton && near(july.canton.width, 0.4) && near(july.canton.height, 7 / 13) && july.canton.color.join(',') === '22,56,130'
    && IDS.slice(0, 4).every((id) => near(F.FLAGS[id].aspect, 5 / 3) && !F.FLAGS[id].canton), 'the union is two fifths of the length and seven stripes tall; the pride flags are 5:3 with none');
  const stars = F.starPoints(), rows = [...new Set(stars.map((p) => p[1].toFixed(6)))].sort();
  ok(stars.length === 50 && rows.length === 9 && rows.every((y, r) => stars.filter((p) => p[1].toFixed(6) === y).length === (r % 2 === 0 ? 6 : 5))
    && stars.every(([x, y]) => x > 0.04 && x < 0.96 && y > 0.04 && y < 0.96)
    && stars.every(([x, y]) => stars.some(([x2, y2]) => near(x2, 1 - x, 1e-9) && near(y2, y, 1e-9))), 'fifty stars in nine rows of six and five, inside the union, the same left and right');
  const triples = (list) => Array.isArray(list) && list.length >= 3 && list.every((c) => c.length === 3 && c.every((v) => Number.isInteger(v) && v >= 0 && v <= 255));
  ok(IDS.slice(0, 4).every((id) => triples(F.FLAGS[id].hearts) && !F.FLAGS[id].sparks) && triples(july.sparks) && july.sparks.length === 3 && !july.hearts
    && JSON.stringify(F.FLAGS['trans-pride-ribbon'].hearts) === '[[91,206,250],[245,169,184],[255,255,255],[255,200,220],[140,220,255]]', 'pride flags have heart colours, the fourth of july has three spark colours');

  // Painting, on a context that only records what it is asked to draw.
  const recorder = () => {
    const c = { fillStyle: '', rects: [], fills: 0, points: 0, at: [], inks: new Set(), fillRect(x, y, w, h) { c.rects.push([c.fillStyle, x, y, w, h]); }, beginPath() {},
      moveTo(x, y) { c.points++; c.at.push([x, y]); }, lineTo(x, y) { c.points++; c.at.push([x, y]); }, closePath() {}, fill() { c.fills++; c.inks.add(c.fillStyle); } };
    return c;
  };
  {
    const c = recorder();
    F.paint(c, 1000, 600, F.FLAGS['bi-pride-ribbon'], false);
    const [a, b, d] = c.rects;
    ok(c.rects.length === 3 && a[0] === 'rgb(214,2,112)' && b[0] === 'rgb(155,79,150)' && d[0] === 'rgb(0,56,168)'
      && a[1] === 0 && a[3] === 1000 && Math.abs(a[2]) < 1 && Math.abs(b[2] - 240) < 1 && Math.abs(d[2] - 360) < 1 && a[4] >= 240 && b[4] >= 120 && d[2] + d[4] >= 600 && c.fills === 0,
      'painting draws the stripes top to bottom at their shares of the height, full width');
    const e = recorder();
    F.paint(e, 1300, 700, july, false);
    const union = e.rects[13];
    ok(e.rects.length === 14 && union[0] === 'rgb(22,56,130)' && union[1] === 0 && union[2] === 0 && near(union[3], 520, 1e-6) && near(union[4], 700 * 7 / 13, 1e-6) && e.fills === 50 && e.points === 500,
      'the union is painted over the stripes at the top by the pole, with fifty five-pointed stars');
    const mean = (list, k) => list.reduce((a, p) => a + p[k], 0) / list.length;
    ok(e.at.length === 500 && e.at.every(([x, y]) => x > 0 && x < 520 && y > 0 && y < 700 * 7 / 13) && near(mean(e.at, 0), 260, 1) && near(mean(e.at, 1), 350 * 7 / 13, 1)
      && [...e.inks].join() === 'rgb(248,248,250)', 'the stars lie inside the union, centred in it, in the white of the stripes');
    const g = recorder();
    F.paintStars(g, 1300, 700, july);
    ok(g.rects.length === 1 && g.rects[0][0] === 'rgb(0,0,0)' && g.rects[0][3] === 1300 && g.rects[0][4] === 700 && g.fills === 50
      && [...g.inks].join() === 'rgb(255,255,255)' && g.at.every(([x, y], i) => near(x, e.at[i][0]) && near(y, e.at[i][1])), 'the star map is black with the fifty stars alone, where the painted stars are');
    const eight = recorder();
    F.paint(eight, 800, 480, F.FLAGS['pride-ribbon'], true);
    ok(eight.rects.length === 8 && eight.rects[0][0] === 'rgb(40,25,25)' && eight.rects[7][0] === 'rgb(120,73,152)' && Math.abs(eight.rects[2][2] - 120) < 1, 'eight stripes paint as eight');
  }

  // The voice history: newest at index 0, 16 samples a second.
  const history = (fps, steps, trace) => {
    const h = F.createHistory();
    let jump = 0, before = null;
    for (const [level, secs] of steps) for (let i = 0, n = Math.round(secs * fps); i < n; i++) {
      h.step(level, 1 / fps);
      if (trace) { if (before) for (let j = 2; j < F.HIST; j++) jump = Math.max(jump, Math.abs(h.byAge[j] - before[j])); before = Array.from(h.byAge); }
    }
    return { byAge: Array.from(h.byAge), jump };
  };
  const peak = (a) => { let at = -1, top = 0; a.forEach((v, i) => { if (v > top) { top = v; at = i; } }); return { at, top }; };
  {
    const burst = [[0, 0.5], [0.9, 4 / 60]];
    const soon = history(60, [...burst, [0, 0.25]], true), later = history(60, [...burst, [0, 0.75]], true);
    ok(soon.byAge.length === 16 && peak(soon.byAge).at === 4 && peak(later.byAge).at === 12 && peak(soon.byAge).top > 0.5 && peak(later.byAge).top > 0.5,
      `a burst of voice travels at 16 samples a second (at ${peak(soon.byAge).at} after a quarter second, ${peak(later.byAge).at} after three quarters)`);
    ok(soon.jump > 0.02 && soon.jump < 0.35 && later.jump < 0.35, `the history glides between samples (largest step ${soon.jump.toFixed(3)})`);
    const steady = history(60, [[0.6, 2]]);
    ok(steady.byAge.every((v) => near(v, 0.6, 1e-6)), 'a steady level fills the history with that level');
    const fpsSteps = [[0.8, 1], [0, 16 / 30]], h30 = history(30, fpsSteps).byAge, h60 = history(60, fpsSteps).byAge;
    ok(h60.some((v) => v > 0.7) && h60.every((v, i) => Math.abs(v - h30[i]) < 0.04), 'the history is the same at 30 and 60 fps');
    // At 10 fps a frame holds more than one sample. Each must hold the level at its own moment:
    // a level that rises steadily gives evenly spaced samples, none written twice.
    const ramp = F.createHistory();
    for (let i = 1; i <= 8; i++) ramp.step(i / 10, 0.1);
    const gaps = Array.from(ramp.byAge).slice(0, 12).map((v, i) => v - ramp.byAge[i + 1]);
    ok(gaps.every((d) => near(d, 1 / 16, 1e-6)), `a 10 fps frame writes each sample at its own moment (steps of ${gaps[0].toFixed(4)}, ${gaps[5].toFixed(4)}, ${gaps[11].toFixed(4)})`);
    // The scene feeds it the kit's envelope (quick to rise, slow to fall), not a raw step.
    const shaped = (fps) => {
      const h = F.createHistory();
      let flame = 0;
      for (const [level, secs] of [[0, 0.5], [0.9, 0.3], [0, 0.5]]) for (let i = 0, n = Math.round(secs * fps); i < n; i++) {
        flame += (level - flame) * (1 - Math.exp(-(level > flame ? 30 : 3) / fps));
        h.step(flame, 1 / fps);
      }
      return Array.from(h.byAge);
    };
    const h10 = shaped(10), hFast = shaped(60), smear = Math.max(...hFast.map((v, i) => Math.abs(v - h10[i])));
    ok(smear < 0.22 && hFast.some((v) => v > 0.85), `a syllable's history at 10 fps stays close to the one at 60 fps (${smear.toFixed(3)} apart at most)`);
    const stalled = F.createHistory();
    stalled.step(0.5, 1 / 60); stalled.step(0.5, 30);
    ok(Array.from(stalled.byAge).every((v) => Number.isFinite(v) && v >= 0 && v <= 0.5 + 1e-6), 'a frame longer than the whole history leaves it finite');
    // After such a frame the history travels as before: a burst is four samples old a quarter second later.
    const woken = F.createHistory();
    woken.step(0, 1 / 60); woken.step(0, 30);
    for (let i = 0; i < 4; i++) woken.step(0.9, 1 / 60);
    for (let i = 0; i < 15; i++) woken.step(0, 1 / 60);
    ok(peak(Array.from(woken.byAge)).at === 4 && peak(Array.from(woken.byAge)).top > 0.5 && Array.from(woken.byAge).slice(6).every((v) => v === 0), `after a stalled frame a burst travels as before (at ${peak(Array.from(woken.byAge)).at})`);
    // A two-second frame in which the level rose from 0 to 1 holds its last second, not its first.
    const long = F.createHistory();
    long.step(0, 1 / 60); long.step(1, 2);
    ok(Array.from(long.byAge).every((v, i) => near(v, 1 - i / 32, 0.01)), `a frame longer than the history keeps the newest of it (${Array.from(long.byAge).slice(0, 4).map((v) => v.toFixed(2)).join(', ')})`);
  }

  // Along the cloth: the history spread over the columns and smoothed.
  {
    const flat = F.gusts(new Float32Array(16).fill(0.5), new Float32Array(F.NU + 1));
    ok(flat.length === F.NU + 1 && Array.from(flat).every((v) => near(v, 0.5, 1e-6)), 'a steady history is a steady gust along the whole cloth');
    const spike = new Float32Array(16); spike[4] = 0.9;
    const g = Array.from(F.gusts(spike, new Float32Array(F.NU + 1)));
    const step = Math.max(...g.slice(1).map((v, i) => Math.abs(v - g[i])));
    // Unsmoothed, one sample of 0.9 would be a step of 0.24 from one column to the next.
    ok(Math.abs(peak(g).at - (4 / 15) * F.NU) <= 2 && peak(g).top > 0.3 && step < 0.18 && g[F.NU] < 0.01,
      `a gust sits where its age puts it, with no sharp front (peak at column ${peak(g).at}, largest step ${step.toFixed(3)})`);
  }

  // Lift and droop.
  ok(near(F.lift(0), 0.1) && F.lift(1) === 1 && F.lift(0.45) > 0.8 && [0.1, 0.2, 0.3, 0.5].every((w) => F.lift(w) > F.lift(w - 0.05)) && F.lift(0.8) === 1 && F.lift(3) === 1 && F.lift(-1) === F.lift(0),
    'the flag hangs in silence (0.1), flies in ordinary speech and never passes 1');
  ok(near(F.droop(1, 3.8), 0.07) && near(F.droop(0.1, F.HOIST * 5 / 3), 0.07 + 0.66 * Math.pow(0.9, 1.4), 1e-6) && F.droop(0.1, F.HOIST * 1.9) < F.droop(0.1, F.HOIST * 5 / 3) && F.droop(0.5, 3.8) < F.droop(0.2, 3.8)
    && near(F.droop(-2, 3.8), F.droop(0, 3.8)) && near(F.droop(5, 3.8), 0.07), 'a flying flag sags a little, a hanging one droops, a longer one droops less');

  // The cloth.
  const cloth = (id, o = {}) => {
    const length = F.HOIST * F.FLAGS[id].aspect, fly = o.fly === undefined ? 1 : o.fly;
    const gust = new Float32Array(F.NU + 1).fill(o.gust || 0);
    const out = F.shape(new Float32Array((F.NU + 1) * (F.NV + 1) * 3), { length, fly, droop: F.droop(fly, length), phase: o.phase || 0, t: o.t || 0, gust, low: o.low || 0, high: o.high || 0, kick: o.kick || 0 });
    return { out, length, m: F.measure(out) };
  };
  const rowLength = (out, j) => {
    let len = 0;
    for (let i = 1; i <= F.NU; i++) { const a = (j * (F.NU + 1) + i) * 3, b = a - 3; len += Math.hypot(out[a] - out[b], out[a + 1] - out[b + 1], out[a + 2] - out[b + 2]); }
    return len;
  };
  {
    let worst = 0, pole = 0, bad = 0;
    for (const id of IDS) for (const fly of [0.07, 0.4, 1]) for (const gust of [0, 1]) for (const phase of [0, 1.3, 4.1]) {
      const c = cloth(id, { fly, gust, phase, t: phase * 3, low: gust, high: gust, kick: gust });
      for (let j = 0; j <= F.NV; j++) {
        worst = Math.max(worst, Math.abs(rowLength(c.out, j) - c.length));
        const o = j * (F.NU + 1) * 3;
        pole = Math.max(pole, Math.abs(c.out[o]), Math.abs(c.out[o + 2]), Math.abs(c.out[o + 1] + (j / F.NV) * F.HOIST));
      }
      if (!Array.from(c.out).every(Number.isFinite)) bad++;
    }
    ok(worst < 1e-4 && bad === 0, `the cloth keeps its length whatever the wind does (worst row off by ${worst.toExponential(1)})`);
    ok(pole < 1e-5, 'the edge at the pole never moves');
    // Down its height the cloth keeps its length too, to within 2% (the ripples slant a little).
    let tall = 0, short = 9;
    const columnLength = (out, i) => {
      let len = 0;
      for (let j = 1; j <= F.NV; j++) { const a = (j * (F.NU + 1) + i) * 3, b = a - (F.NU + 1) * 3; len += Math.hypot(out[a] - out[b], out[a + 1] - out[b + 1], out[a + 2] - out[b + 2]); }
      return len;
    };
    for (const id of IDS) for (const [fly, gust] of [[0.07, 0], [1, 0.6], [1, 1]]) for (const phase of [0, 0.7, 1.9, 3.3, 4.6, 5.9]) {
      const c = cloth(id, { fly, gust, phase, t: phase * 2, low: gust, high: gust, kick: gust === 1 ? 1 : 0 });
      for (let i = 0; i <= F.NU; i++) { const r = columnLength(c.out, i) / F.HOIST; tall = Math.max(tall, r); short = Math.min(short, r); }
    }
    ok(tall < 1.02 && short > 0.999, `the cloth does not stretch down its height either (its tallest column is ${tall.toFixed(3)} of the hoist)`);
    // Ripples grow from nothing at the pole.
    const loud = cloth('pride-ribbon', { fly: 1, gust: 1, low: 1, high: 1, kick: 1, phase: 1.9 }).out;
    const depth = (i) => { let d = 0; for (let j = 0; j <= F.NV; j++) d = Math.max(d, Math.abs(loud[(j * (F.NU + 1) + i) * 3 + 2])); return d; };
    ok(depth(1) < 0.03 && depth(3) < 0.09 && depth(F.NU) > 0.3, `next to the pole the cloth barely moves, however loud (${depth(1).toFixed(3)} at the first column, ${depth(F.NU).toFixed(2)} at the free end)`);
  }
  {
    const flying = IDS.map((id) => cloth(id, { fly: 1 })), hanging = IDS.map((id) => cloth(id, { fly: 0.07 }));
    ok(flying.every((c) => c.m.endX > 0.9 * c.length && c.m.endY > -0.4 && c.m.endY < 0), 'a flying flag reaches at least nine tenths of its length, sagging a little');
    ok(hanging.every((c, i) => c.m.endY < -1.5 && c.m.endX < flying[i].m.endX - 0.5), 'a hanging flag droops and reaches less far');
    const lowest = Math.min(...IDS.flatMap((id) => [0, 2, 5].map((t) => cloth(id, { fly: 0.07, t, phase: t }).m.lowest)));
    ok(F.TOP + lowest >= 0.3, `the lowest corner of a hanging flag stays clear of the ground (${(F.TOP + lowest).toFixed(2)} above it)`);
    const calm = cloth('pride-ribbon', { fly: 1, phase: 1 }).m.ripple, gusty = cloth('pride-ribbon', { fly: 1, phase: 1, gust: 1 }).m.ripple;
    const kicked = cloth('pride-ribbon', { fly: 1, phase: 1, gust: 1, kick: 1 }).m.ripple, deep = cloth('pride-ribbon', { fly: 1, phase: 1, low: 1 }).m.ripple;
    ok(calm > 0.02 && gusty > 2 * calm && kicked > gusty * 1.2 && deep > calm * 1.5, `a gust deepens the ripples, a beat more still, and so does the low end (${[calm, gusty, kicked, deep].map((v) => v.toFixed(2)).join(', ')})`);
    const a = cloth('pride-ribbon', { fly: 1, phase: 1, gust: 0.5 }).out, b = cloth('pride-ribbon', { fly: 1, phase: 1, gust: 0.5, high: 1 }).out;
    const moved = (i) => Math.abs(a[(11 * (F.NU + 1) + i) * 3 + 2] - b[(11 * (F.NU + 1) + i) * 3 + 2]);
    const flutterEnd = Math.max(moved(F.NU), moved(F.NU - 1), moved(F.NU - 2), moved(F.NU - 3)), flutterPole = Math.max(moved(4), moved(8), moved(12));
    ok(flutterEnd > 0.01 && flutterPole < flutterEnd / 10, 'the high end of the sound flutters the free end, not the pole end');
    ok(cloth('pride-ribbon', { fly: 0.1, t: 1 }).m.ripple > 0.05, 'a hanging flag has folds');
    const p1 = cloth('pride-ribbon', { fly: 1, gust: 0.5, phase: 0 }).out, p2 = cloth('pride-ribbon', { fly: 1, gust: 0.5, phase: 0.8 }).out;
    ok(Array.from(p1).some((v, i) => Math.abs(v - p2[i]) > 0.03), 'the ripples travel as the phase advances');
  }

  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="flag.js"');
    order.push(pos > html.indexOf('src="scene-parts.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load flag.js after scene-parts.js and before the factories');
  const control = await readFile(resolve(__dirname, 'control/control.html'), 'utf8');
  ok(/T\.VIZ_LABELS\[name\] \|\| nice\(/.test(control), 'the control panel lists an effect by its display name when it has one');
}

// ── 14. Sunburst (pure; no browser) ─────────────────────────────────────────
console.log('\n[14] sunburst');
await import('./overlay/sunburst.js');
{
  const K = globalThis.TimbreScene, S = globalThis.TimbreSunburst;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const peak = (a) => { let at = -1, top = 0; a.forEach((v, i) => { if (v > top) { top = v; at = i; } }); return { at, top }; };

  // The kit's voice history: 24 samples, 20 a second.
  {
    const history = (fps, steps, trace) => {
      const h = K.createHistory(24, 20);
      let jump = 0, before = null;
      for (const [level, secs] of steps) for (let i = 0, n = Math.round(secs * fps); i < n; i++) {
        h.step(level, 1 / fps);
        if (trace) { if (before) for (let j = 2; j < 24; j++) jump = Math.max(jump, Math.abs(h.byAge[j] - before[j])); before = Array.from(h.byAge); }
      }
      return { byAge: Array.from(h.byAge), jump, h };
    };
    const burst = [[0, 0.5], [0.9, 4 / 60]];
    const soon = history(60, [...burst, [0, 0.25]], true), later = history(60, [...burst, [0, 0.75]], true);
    ok(soon.byAge.length === 24 && peak(soon.byAge).at === 5 && peak(later.byAge).at === 15 && peak(soon.byAge).top > 0.5 && peak(later.byAge).top > 0.5,
      `kit history: a burst of voice travels at the rate asked for (at ${peak(soon.byAge).at} after a quarter second, ${peak(later.byAge).at} after three quarters)`);
    ok(soon.jump > 0.02 && soon.jump < 0.4 && later.jump < 0.4, `kit history: it glides between samples (largest step ${soon.jump.toFixed(3)})`);
    ok(history(60, [[0.6, 2]]).byAge.every((v) => near(v, 0.6, 1e-6)), 'kit history: a steady level fills it with that level');
    const fpsSteps = [[0.8, 1], [0, 0.5]], h30 = history(30, fpsSteps).byAge, h60 = history(60, fpsSteps).byAge;
    ok(h60.some((v) => v > 0.7) && h60.some((v) => v < 0.05) && h60.every((v, i) => Math.abs(v - h30[i]) < 0.04), 'kit history: the same at 30 and 60 fps');
    const ramp = K.createHistory(24, 20);
    for (let i = 1; i <= 8; i++) ramp.step(i / 10, 0.1);
    const gaps = Array.from(ramp.byAge).slice(0, 12).map((v, i) => v - ramp.byAge[i + 1]);
    ok(gaps.every((d) => near(d, 1 / 20, 1e-6)), `kit history: a 10 fps frame writes each sample at its own moment (steps of ${gaps[0].toFixed(4)}, ${gaps[5].toFixed(4)}, ${gaps[11].toFixed(4)})`);
    const stalled = K.createHistory(24, 20);
    stalled.step(0.5, 1 / 60); stalled.step(0.5, 30);
    ok(Array.from(stalled.byAge).every((v) => Number.isFinite(v) && v >= 0 && v <= 0.5 + 1e-6), 'kit history: a frame longer than the whole history leaves it finite');
    const woken = K.createHistory(24, 20);
    woken.step(0, 1 / 60); woken.step(0, 30);
    for (let i = 0; i < 3; i++) woken.step(0.9, 1 / 60);
    for (let i = 0; i < 15; i++) woken.step(0, 1 / 60);
    ok(peak(Array.from(woken.byAge)).at === 5 && peak(Array.from(woken.byAge)).top > 0.5 && Array.from(woken.byAge).slice(8).every((v) => v === 0), `kit history: after a stalled frame a burst travels as before (at ${peak(Array.from(woken.byAge)).at})`);
    const long = K.createHistory(24, 20);
    long.step(0, 1 / 60); long.step(1, 2);
    ok(Array.from(long.byAge).every((v, i) => near(v, 1 - i / 40, 0.01)), `kit history: a frame longer than the history keeps the newest of it (${Array.from(long.byAge).slice(0, 4).map((v) => v.toFixed(2)).join(', ')})`);
    const fresh = K.createHistory(24, 20);
    fresh.step(0, 0.05); fresh.step(0.8, 0.01);
    ok(near(fresh.byAge[0], 0.8, 1e-6) && near(fresh.heard(0), 0.8, 1e-6) && fresh.byAge[1] < 0.2, `kit history: the newest place holds the level now, before a sample of it is stored (${fresh.byAge[0].toFixed(3)})`);
    // heard(seconds): the level that long ago, read between samples, held at both ends.
    ok(near(ramp.heard(0), ramp.byAge[0]) && near(ramp.heard(0.1), ramp.byAge[2]) && near(ramp.heard(0.125), (ramp.byAge[2] + ramp.byAge[3]) / 2)
      && near(ramp.heard(-3), ramp.byAge[0]) && near(ramp.heard(99), ramp.byAge[23]) && near(ramp.heard(NaN), ramp.byAge[0]), 'kit history: heard(seconds) reads between samples and holds at both ends');
    const odd = K.createHistory(0, -1);
    odd.step(0.5, 0.2); odd.step(NaN, NaN); odd.step(7, -1);
    ok(odd.byAge.length >= 2 && Array.from(odd.byAge).every((v) => Number.isFinite(v) && v >= 0 && v <= 1) && Number.isFinite(odd.heard(0.1)), 'kit history: odd sizes, rates, levels and frame times leave it sound');
    const two = K.createHistory(8, 4);
    for (let i = 0; i < 18; i++) two.step(0.9, 1 / 60);
    for (let i = 0; i < 60; i++) two.step(0, 1 / 60);
    ok(two.byAge.length === 8 && peak(Array.from(two.byAge)).at === 4, 'kit history: each history has its own size and rate');
  }

  ok(S.RAYS_MIN === 24 && S.RAYS_MAX === 144 && S.SEG === 12 && S.HIST === 25 && S.HIST_HZ === 20 && S.CORE === 0.6 && S.REACH === 3 && S.HEIGHT === 3.6 && S.BANDS === 9 && S.TRAVEL === 0.9,
    'the sizes: 24 to 144 beams of 12 pieces, 25 history samples at 20 a second, a star of 0.6 with beams up to 3, light taking 0.9 s to cross them');
  ok((S.HIST - 1) / S.HIST_HZ >= ((S.lengthOf(1, 1) / S.REACH) * S.TRAVEL), 'the history reaches back as far as the tip of the longest beam on a beat');
  ok(S.rayCount(0) === 24 && S.rayCount(50) === 84 && S.rayCount(100) === 144 && S.rayCount(-20) === 24 && S.rayCount(900) === 144 && S.rayCount(NaN) === 84 && S.rayCount(undefined) === 84,
    'Density 0 is 24 beams, 50 is 84, 100 is 144; anything else is held to that range, and no setting at all is the default');

  // Directions: spread evenly over a sphere, from one pole to the other.
  for (const n of [24, 84, 144]) {
    const d = S.directions(n), at = (i) => [d[i * 3], d[i * 3 + 1], d[i * 3 + 2]];
    const unit = Array.from({ length: n }, (_, i) => Math.hypot(...at(i))).every((l) => near(l, 1, 1e-6));
    const ys = Array.from({ length: n }, (_, i) => d[i * 3 + 1]);
    const sum = [0, 1, 2].map((c) => Array.from({ length: n }, (_, i) => d[i * 3 + c]).reduce((a, b) => a + b, 0) / n);
    let closest = Infinity, loneliest = 0;
    for (let i = 0; i < n; i++) {
      let nearest = Infinity;
      for (let j = 0; j < n; j++) if (j !== i) { const a = at(i), b = at(j); nearest = Math.min(nearest, Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])))); }
      closest = Math.min(closest, nearest); loneliest = Math.max(loneliest, nearest);
    }
    const ideal = Math.sqrt((4 * Math.PI) / n);
    ok(d.length === n * 3 && unit && ys.every((y, i) => i === 0 || y < ys[i - 1]) && ys[0] > 0.9 && ys[n - 1] < -0.9 && Math.hypot(...sum) < 0.05
      && closest > 0.45 * ideal && loneliest < 1.4 * ideal, `${n} directions: unit vectors from pole to pole, evenly spread (nearest neighbours ${(closest / ideal).toFixed(2)} to ${(loneliest / ideal).toFixed(2)} of the even spacing)`);
  }

  // Each beam's band of the sound.
  const scat = Array.from({ length: 144 }, (_, i) => S.scatter(i));
  ok(scat.every((v) => v >= 0 && v < 1) && scat.every((v, i) => v === S.scatter(i)) && new Set(scat.map((v) => v.toFixed(4))).size > 100
    && Math.abs(scat.reduce((a, b) => a + b, 0) / 144 - 0.5) < 0.15, 'each beam has its own fixed scatter between 0 and 1');
  ok(S.bandOf(0, 0.5) === 0 && near(S.bandOf(1, 0.5), 9) && near(S.bandOf(-1, 0.5), 9) && S.bandOf(0.3, 0.5) < S.bandOf(0.6, 0.5) && S.bandOf(0.6, 0.5) < S.bandOf(0.9, 0.5)
    && near(S.bandOf(-0.6, 0.5), S.bandOf(0.6, 0.5)), 'the belt round the middle hears bin 0 and both poles hear bin 9');
  ok(near(S.bandOf(0.5, 1) - S.bandOf(0.5, 0), 2) && S.bandOf(0, 0) === 0 && S.bandOf(0.05, 0) === 0, 'the scatter moves a beam one bin either way, never below bin 0');
  ok(near(S.bandOf(0.5, 0.5), 9 * Math.pow(0.5, 1.2)) && S.bandOf(0.5, 0.5) < 4, 'the bands crowd toward the belt: half way to a pole a beam hears bin 3.9, not 4.5');
  const bins = new Uint8Array(32); bins[3] = 255; bins[31] = 51;
  ok(S.loudness(bins, 3, 1) === 1 && near(S.loudness(bins, 3.5, 1), 0.5) && S.loudness(bins, 4, 1) === 0 && S.loudness(bins, 3.5, 2) === 1 && near(S.loudness(bins, 3.5, 0.5), 0.25)
    && near(S.loudness(bins, 60, 1), 0.2) && S.loudness(bins, 3, 3) === 1 && S.loudness(bins, -4, 1) === 0 && S.loudness(null, 3, 1) === 0 && S.loudness(new Uint8Array(0), 3, 1) === 0,
    'a band\'s loudness is read between two bins, times Gain, held to 0..1; no bins is silence');
  ok(S.answer(0, 0) === 0 && near(S.answer(1, 0), 0.7) && near(S.answer(0, 1), 0.45) && S.answer(1, 1) === 1 && near(S.answer(0.5, 0.5), 0.575), 'every beam answers its own band most and the voice as a whole a little');

  // A beam's size.
  ok(near(S.lengthOf(0, 0), 0.3) && near(S.lengthOf(1, 0), 3) && near(S.lengthOf(0.5, 0), 1.65) && near(S.lengthOf(1, 1), 3.9) && near(S.lengthOf(0, 1), 0.39),
    'a beam is a tenth of its reach in silence, its whole reach at full, and 30% longer on a beat');
  ok(near(S.widthOf(0, 0), 0.13 * 0.55) && near(S.widthOf(1, 0), 0.13 * 1.3) && near(S.widthOf(1, 1), 0.13 * 1.3 * 1.4), 'a louder beam is wider, and wider still on a beat');

  // The strip of one beam.
  {
    const N = (S.SEG + 1) * 2, centre = [0, S.HEIGHT, 0], cam = [0, S.HEIGHT, 12];
    const strip = (dir, at = 0, len = 2, width = 0.2) => { const out = new Float32Array((N + at + 4) * 3).fill(7); S.strip(out, at, centre, dir, cam, len, width); return out; };
    const read = (out, at = 0) => Array.from({ length: S.SEG + 1 }, (_, j) => {
      const a = (at + j * 2) * 3, p = [out[a], out[a + 1], out[a + 2]], q = [out[a + 3], out[a + 4], out[a + 5]];
      return { mid: p.map((v, c) => (v + q[c]) / 2), across: q.map((v, c) => v - p[c]) };
    });
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len3 = (a) => Math.hypot(a[0], a[1], a[2]);
    const side = read(strip([1, 0, 0]));
    ok(side.every((s, j) => near(s.mid[0], S.CORE * 0.7 + (2 + S.CORE * 0.3) * (j / S.SEG), 1e-5) && near(s.mid[1], S.HEIGHT, 1e-5) && near(s.mid[2], 0, 1e-5)),
      'a beam\'s spine runs straight out from inside the star to its length beyond the star\'s surface');
    ok(near(len3(side[0].across), 0.2, 1e-5) && near(len3(side[S.SEG].across), 0.2 * 0.08, 1e-5) && side.every((s, j) => j === 0 || len3(s.across) < len3(side[j - 1].across)),
      'it is its full width at the star and tapers to 8% of that at its tip');
    ok(side.every((s) => Math.abs(dot(s.across, [1, 0, 0])) < 1e-5 && Math.abs(dot(s.across, [cam[0] - s.mid[0], cam[1] - s.mid[1], cam[2] - s.mid[2]])) < 1e-5),
      'its width lies across the beam and across the line of sight, so it faces the camera');
    const slant = read(strip([0.6, 0.64, -0.48]));
    ok(slant.every((s) => Math.abs(dot(s.across, [0.6, 0.64, -0.48])) < 1e-5 && Math.abs(dot(s.across, [cam[0] - s.mid[0], cam[1] - s.mid[1], cam[2] - s.mid[2]])) < 1e-4),
      'a beam at a slant faces the camera too');
    const at = read(strip([0, 0, 1]));   // straight at the camera
    ok(strip([0, 0, 1]).every(Number.isFinite) && at.every((s, j) => near(len3(s.across), 0.2 * (1 - 0.92 * (j / S.SEG)), 1e-5)), 'a beam pointing straight at the camera keeps its width and stays finite');
    const offset = strip([1, 0, 0], 5);
    ok(Array.from(offset.subarray(0, 15)).every((v) => v === 7) && Array.from(offset.subarray((5 + N) * 3)).every((v) => v === 7) && Array.from(offset.subarray(15, (5 + N) * 3)).every((v) => v !== 7)
      && near(read(offset, 5)[0].mid[0], S.CORE * 0.7, 1e-5), 'a strip is written at its own place among the others and nowhere else');
  }

  // Brightness and colour along a beam.
  ok(near(S.glow(0, 0, 0, 0, 1), 0.12 * 0.6) && S.glow(1, 1, 1, 1, 1) === 0 && [0.1, 0.3, 0.5, 0.7, 0.9].every((u) => S.glow(u, 0.5, 0.5, 0, 1) > S.glow(u + 0.1, 0.5, 0.5, 0, 1)),
    'a beam is brightest at the star and fades to nothing at its tip');
  ok(near(S.glow(0, 0.5, 0, 0, 1), (0.12 + 1.9 * Math.pow(0.5, 1.4)) * 0.6) && S.glow(0.3, 1, 0.5, 0, 1) > 8 * S.glow(0.3, 0, 0.5, 0, 1) && S.glow(0.3, 0.5, 0.5, 0, 1) > 2 * S.glow(0.3, 0, 0.5, 0, 1) && S.glow(0.3, 0.2, 0.5, 1, 1) > S.glow(0.3, 0.2, 0.5, 0, 1)
    && S.glow(0.3, 0.2, 1, 0, 1) > S.glow(0.3, 0.2, 0, 0, 1) && near(S.glow(0.3, 0.2, 0.5, 0, 1.5), 1.5 * S.glow(0.3, 0.2, 0.5, 0, 1)),
    'the voice that left the star brightens it most; a beat, a louder band and the flicker add to that');
  ok(S.shimmer(0, 0.7, 1) === 1 && near(S.shimmer(1, 1, 1), 1.9) && near(S.shimmer(1, 1, -1), 0.1) && S.shimmer(1, 0, 1) === 1 && S.shimmer(1, 0, -1) === 1 && near(S.shimmer(0.5, 0.5, 1), 1.225)
    && S.glow(0.5, 0, 0, 0, S.shimmer(1, 1, -1)) > 0, 'the high end makes a beam flicker more the further out, never at the star and never below nothing');
  const t3 = (u, b) => Array.from(S.tint([0, 0, 0], [0.2, 0.4, 0.8], u, b));
  ok(t3(0, 1).every((v) => near(v, 1)) && t3(0.5, 1).every((v, c) => near(v, [0.2, 0.4, 0.8][c])) && t3(1, 1).every((v, c) => near(v, [0.2, 0.4, 0.8][c]))
    && t3(0.2, 1).every((v, c) => near(v, 1 + ([0.2, 0.4, 0.8][c] - 1) * 0.44)) && t3(0.5, 2).every((v, c) => near(v, 2 * [0.2, 0.4, 0.8][c])),
    'a beam is white at the star and its own colour from under half way out');

  // The table.
  ok(T.VIZ_SCENES.indexOf('sunburst-3d') === T.VIZ_SCENES.indexOf('july-fourth-stripes') + 1 && T.VIZ_USES_3D.includes('sunburst-3d'), 'sunburst-3d is a kit scene, listed after the flags');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['sunburst-3d']) === '{"density":50,"spin":50,"cameraDrift":50}', 'sunburst knobs: density, spin, camera drift');
  const oldSun = T.sanitizeConfig({ activeViz: 'sunburst-3d', perViz: { 'sunburst-3d': { density: 80 } } });
  ok(oldSun.activeViz === 'sunburst-3d' && JSON.stringify(oldSun.perViz['sunburst-3d']) === '{"density":80,"spin":50,"cameraDrift":50}', 'a saved pre-redesign sunburst config keeps its density and gains the new defaults');
  ok(!('sunburst-3d' in T.VIZ_LABELS), 'sunburst keeps the name it is listed by');

  // The files.
  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="sunburst.js"');
    order.push(pos > html.indexOf('src="flag.js"') && pos > html.indexOf('src="scene-kit.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load sunburst.js after the scene kit and flag.js and before the factories');
  const factory = await readFile(resolve(__dirname, 'overlay/factories/sunburst-3d.js'), 'utf8');
  ok(/VIZ_FACTORIES\['sunburst-3d'\] = TimbreScene\.factory\(\(\) => TimbreSunburst\.definition\(\)\);/.test(factory) && !/WebGLRenderer/.test(factory), 'the effect is the kit\'s factory around the sunburst\'s definition, with no renderer of its own');
}

console.log('\n[15] mountains');
await import('./overlay/mountains.js');
{
  const M = globalThis.TimbreMountains;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const NC = M.NX + 1, NR = M.NZ + 2, SP = M.SP;
  const flat = (v) => new Float32Array(NC).fill(v);
  const ease = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  ok(M.W === 7 && M.D === 4.4 && M.NX === 80 && M.NZ === 52 && near(M.SP, 4.4 / 52) && M.HMAX === 2.15 && M.FOOT === 0.15 && M.EDGE === 0.14 && M.BASE === 0.26 && M.SNOW === 1.05 && M.BANDS === 9 && M.FLANK === 2.6 && near(M.W / 2 - M.FLANK, 0.9) && M.CROSS === 5,
    'the sizes: a block 7 wide and 4.4 deep, 80 columns and 52 stored rows, peaks up to 2.15, snow from 1.05, land crossing in 5 s');

  // The shape of the land before the voice scales it.
  {
    const samples = [];
    for (let i = 0; i < 400; i++) samples.push(M.noise(i * 0.137 - 20, i * 0.291 + 3));
    ok(samples.every((v) => v >= 0 && v <= 1) && Math.max(...samples) > 0.8 && Math.min(...samples) < 0.2, 'noise stays within 0 to 1 and uses the range');
    ok(near(M.noise(3, -7), M.hash(3, -7)) && near(M.noise(3.5, -7), (M.hash(3, -7) + M.hash(4, -7)) / 2) && near(M.noise(3, -6.5), (M.hash(3, -7) + M.hash(3, -6)) / 2),
      'noise is the lattice value at a lattice point and half way between two of them at the middle');
    {
      const a = M.hash(3, -7), b = M.hash(4, -7), c = M.hash(3, -6), d = M.hash(4, -6), q = 0.25 * 0.25 * (3 - 2 * 0.25);
      ok(near(M.noise(3.25, -7), a + (b - a) * q) && near(M.noise(3, -6.75), a + (c - a) * q) && near(M.noise(3.5, -6.5), (a + b + c + d) / 4) && near(M.noise(3.25, -6.75), a + (b - a) * q + (c - a) * q + (a - b - c + d) * q * q),
        'noise is eased between lattice points, both ways: a quarter of the way along is 15.6% of the way in value');
    }
    ok(Math.abs(M.noise(1.2345, 5.4321) - M.noise(1.2346, 5.4321)) < 1e-3 && Math.abs(M.noise(1.99999, 5.5) - M.noise(2.00001, 5.5)) < 1e-4, 'noise has no steps in it, across a lattice line or within a cell');
    const want = (x, w) => {
      const r1 = 1 - Math.abs(2 * M.noise(x * 0.62 + 11.3, w * 0.62) - 1), r2 = 1 - Math.abs(2 * M.noise(x * 1.7 + 3.1, w * 1.7 + 7.7) - 1), r3 = M.noise(x * 4.6 + 1.9, w * 4.6 + 5.2);
      return 0.16 + 0.6 * Math.pow(r1, 1.45) + 0.2 * r2 * (0.35 + 0.65 * r1) + 0.04 * r3;
    };
    const field = [];
    let same = true;
    for (let i = 0; i < 600; i++) { const x = -3.5 + (i % 30) * 0.24, w = Math.floor(i / 30) * 0.31 - 2; field.push(M.ridge(x, w)); if (!near(M.ridge(x, w), want(x, w))) same = false; }
    ok(same && field.every((v) => v >= 0.16 && v <= 1) && Math.max(...field) > 0.85 && Math.min(...field) < 0.3,
      'the land is crests of three sizes on a floor of 0.16: never under the floor, never over 1, and both valleys and peaks in it');
  }

  // Columns, bands and loudness.
  ok(near(M.columnX(0), -3.5) && near(M.columnX(80), 3.5) && near(M.columnX(40), 0) && near(M.columnX(20), -1.75), 'the columns run from one side of the block to the other');
  ok(M.bandOf(0) === 0 && near(M.bandOf(2.6), 9) && near(M.bandOf(-2.6), 9) && near(M.bandOf(1.3), 4.5) && near(M.bandOf(-1.3), 4.5) && near(M.bandOf(3.5), 9) && near(M.bandOf(40), 9) && near(M.sink(2.6, 0), 1) && M.sink(2.7, 0) < 1,
    'the middle of the range hears bin 0 and both flanks bin 9, the same on either side; the flanks are where the land begins to sink toward the sides');
  {
    const bins = new Uint8Array(32); bins[0] = 255; bins[1] = 51; bins[9] = 102;
    ok(near(M.loudness(bins, 0, 1), 1) && near(M.loudness(bins, 1, 1), 0.2) && near(M.loudness(bins, 0.5, 1), 0.6) && near(M.loudness(bins, 9, 1), 0.4) && near(M.loudness(bins, 8.5, 1), 0.2),
      'loudness reads a band between two bins');
    ok(near(M.loudness(bins, 1, 2), 0.4) && M.loudness(bins, 9, 3) === 1 && M.loudness(bins, 1, 0) === 0 && M.loudness(null, 3, 1) === 0 && M.loudness(new Uint8Array(0), 3, 1) === 0 && near(M.loudness(bins, -4, 1), 1) && M.loudness(bins, 99, 1) === 0,
      'loudness is scaled by Gain, held to 1, and nothing with no bins; a band off either end reads the end bin');
  }
  ok(near(M.answer(0, 0), 0) && near(M.answer(1, 0), 0.7) && near(M.answer(0, 1), 0.45) && M.answer(1, 1) === 1 && near(M.answer(0.5, 0.4), 0.53), 'a column answers its own band most and the whole voice a little, held to 1');

  // How high the voice lifts the land.
  ok(near(M.rise(0), 0.15) && near(M.rise(1), 1) && M.rise(5) <= 1 + 1e-12 && near(M.rise(1 / 1.3), 1) && near(M.rise(0.5), 0.15 + 0.85 * Math.pow(0.65, 0.85)) && near(M.rise(-2), 0.15) && near(M.rise(0.2), 0.15 + 0.85 * Math.pow(0.26, 0.85)) && M.rise(0.3) > M.rise(0.2),
    'in silence the land keeps 15% of its height; it is at full height from a loudness of 1/1.3 and never over it');
  ok(near(M.heightAt(1.3, 4.2, 0.5), 2.15 * M.rise(0.5) * M.ridge(1.3, 4.2)) && near(M.heightAt(-2, -9, 0), 2.15 * 0.15 * M.ridge(-2, -9)) && M.heightAt(0.4, 1, 1) <= 2.15,
    'a point of land is the shape of the land there, times what the voice lifts, times the tallest peak');
  ok(near(M.lift(0, 0), 0.86) && near(M.lift(1, 0), 1.1) && near(M.lift(0, 1), 1.02) && near(M.lift(1, 1), 1.26) && near(M.lift(0.5, 0.25), 1.02), 'the whole range lifts with the voice and jumps on a beat');

  // The land sinks toward the block's edges.
  ok(near(M.sink(0, 0), 1) && near(M.sink(-3.5, 0), 0.14) && near(M.sink(3.5, 0), 0.14) && near(M.sink(0, 2.2), 0.14) && near(M.sink(0, -2.2), 0.14) && near(M.sink(2, 0.5), M.sink(-2, 0.5)),
    'the land is whole in the middle and keeps 14% of its height at all four edges');
  ok(near(M.sink(0, -2.2 + 0.5), 1) && M.sink(0, 2.2 - 0.5) < 0.95 && near(M.sink(0, 2.2 - 0.85), 1) && near(M.sink(3.5 - 0.9, 0), 1) && M.sink(3.5 - 0.45, 0) < 0.7
    && near(M.sink(3.5 - 0.45, 2.2 - 0.425), 0.14 + 0.86 * ease(0, 0.9, 0.45) * ease(0, 0.85, 0.425)),
    'it rises over 0.5 from the far edge, 0.85 from the near edge and 0.9 from each side');

  // Speed.
  ok(near(M.flow(50), 4.4 / 5) && near(M.flow(0), 0.25 * 4.4 / 5) && near(M.flow(100), 1.75 * 4.4 / 5) && near(M.flow(-30), M.flow(0)) && near(M.flow(400), M.flow(100)) && near(M.flow(NaN), M.flow(50)) && near(M.flow(undefined), M.flow(50)),
    'Speed 50 crosses the block in 5 s, 0 in 20 s, 100 in under 3 s; anything else is held to that range, and no setting is the default');

  // Colour.
  {
    const c3 = (h) => Array.from(M.shade([0, 0, 0], [0.2, 0.4, 0.8], h));
    const rock = (h) => 0.2 + 0.8 * ease(0, 1.05, h), snow = (h) => ease(1.05 - 0.08, 1.05 + 0.3, h);
    ok(c3(0).every((v, i) => near(v, [0.2, 0.4, 0.8][i] * 0.2)) && c3(0.5).every((v, i) => near(v, [0.2, 0.4, 0.8][i] * rock(0.5))) && c3(0.97).every((v, i) => near(v, [0.2, 0.4, 0.8][i] * rock(0.97))),
      'below the snow line the land is its own colour, dark in the valleys and full at the snow line');
    ok(c3(1.35).every((v, i) => near(v, [0.93, 0.95, 1][i])) && c3(3).every((v, i) => near(v, [0.93, 0.95, 1][i])) && c3(1.15).every((v, i) => near(v, [0.2, 0.4, 0.8][i] * (1 - snow(1.15)) + [0.93, 0.95, 1][i] * snow(1.15))) && snow(1.15) > 0.3 && snow(1.15) < 0.7,
      'above the snow line it turns white, fully white from 0.3 above it');
    const out = [9, 9, 9];
    ok(M.shade(out, [1, 1, 1], 0) === out, 'the colour is written into the array it is given');
  }
  {
    const row = Array.from({ length: NC }, (_, c) => M.idle(c, 3)), later = Array.from({ length: NC }, (_, c) => M.idle(c, 9));
    ok(row.every((v) => v >= 0 && v <= 1) && Math.max(...row) - Math.min(...row) > 0.3 && row.some((v, c) => Math.abs(v - later[c]) > 0.2) && near(M.idle(10, 2), Math.max(0, Math.min(1, 0.34 + 0.26 * Math.sin(0.9 + 1) + 0.14 * Math.sin(2.3 - 0.62)))),
      'with the mic off the land is a slow swell that differs across the range and changes with time');
  }

  // The land itself: rows that ride with the terrain.
  {
    const land = M.createLand();
    ok(land.travel === 0 && land.top === 0 && near(land.z(0), -2.2) && near(land.z(NR - 1), 2.2) && near(land.z(1), -2.2) && near(land.z(2), -2.2 + SP)
      && Array.from(land.row(5)).every((h, c) => near(h, M.heightAt(M.columnX(c), -4 * SP, 0), 1e-6)), 'new land is foothills from the far edge to the near edge');
    land.advance(0.5 * SP, flat(0.6));
    ok(near(land.travel, 0.5 * SP) && land.top === 0 && near(land.z(0), -2.2) && near(land.z(1), -2.2 + 0.5 * SP) && near(land.z(2), -2.2 + 1.5 * SP) && near(land.z(NR - 1), 2.2)
      && Array.from(land.row(0)).every((h, c) => near(h, M.heightAt(M.columnX(c), 0.5 * SP, 0.6), 1e-6)), 'the far edge stays where it is and holds the voice as it is now, while the rows behind it move on');
    land.advance(0.75 * SP, flat(0.2));
    const written = Array.from(land.row(1));
    ok(land.top === 1 && near(land.z(1), -2.2 + 0.25 * SP) && written.every((h, c) => near(h, M.heightAt(M.columnX(c), SP, 0.6 + (0.2 - 0.6) * (2 / 3)), 1e-6)),
      'a row is written as it leaves the far edge, with the voice as it was at that moment of the step');
    land.advance(2.5 * SP, flat(0.9));
    land.advance(0.3 * SP, flat(0.1));
    ok(land.top === 4 && Array.from(land.row(4)).every((h, c) => near(h, written[c])) && near(land.z(4), -2.2 + 0.25 * SP + 2.8 * SP), 'a written row keeps its heights and rides toward the viewer at the speed of the land');
    ok([2, 3].every((j) => Array.from(land.row(j)).every((h, c) => near(h, M.heightAt(M.columnX(c), (5 - j) * SP, 0.2 + 0.7 * (((5 - j) * SP - 1.25 * SP) / (2.5 * SP))), 1e-6)))
      && Array.from(land.row(1)).every((h, c) => near(h, M.heightAt(M.columnX(c), 4 * SP, 0.9 + (0.1 - 0.9) * (0.25 / 0.3)), 1e-6)),
      'a long step writes each row it passes at that row\'s own moment');
    const f = land.travel / SP - land.top, a = land.row(NR - 2), b = land.row(NR - 1), older = land.stored(land.top - M.NZ);
    ok(near(land.z(NR - 2), 2.2 - (1 - f) * SP) && land.z(NR - 2) <= 2.2 && near(land.z(NR - 1), 2.2), 'the near edge stays where it is; the last riding row is within a row of it');
    ok(a === land.stored(land.top - M.NZ + 1) && Array.from(b).every((h, c) => near(h, a[c] + (older[c] - a[c]) * (1 - f), 1e-6)) && Array.from(b).some((h, c) => Math.abs(h - a[c]) > 1e-4),
      'the near edge is read between the two rows either side of it');
    const before = M.createLand(), after = M.createLand(), ramp = (v) => flat(v);
    before.advance(3.2 * SP, ramp(0.5)); after.advance(3.2 * SP, ramp(0.5));
    const pa = new Float32Array(NR * NC * 3), pb = new Float32Array(NR * NC * 3), ha = new Float32Array(NR * NC), hb = new Float32Array(NR * NC);
    before.advance(0.7999 * SP, ramp(0.5)); after.advance(0.8001 * SP, ramp(0.5));
    before.write(pa, ha, 1); after.write(pb, hb, 1);
    let jump = 0;
    for (let c = 0; c < NC; c++) for (const j of [0, NR - 1]) jump = Math.max(jump, Math.abs(pa[(j * NC + c) * 3 + 1] - pb[(j * NC + c) * 3 + 1]));
    let inner = 0;   // the riding rows: the same land, one mesh row further on
    for (let j = 2; j < NR - 1; j++) for (let c = 0; c < NC; c++) inner = Math.max(inner, Math.abs(before.row(j - 1)[c] - after.row(j)[c]));
    ok(before.top === 3 && after.top === 4 && jump < 2e-3 && inner < 1e-6 && Math.abs(after.z(1) - (-2.2)) < 1e-3 * SP + 1e-9 && Array.from(after.row(1)).every((h, c) => Math.abs(h - after.row(0)[c]) < 2e-3),
      'nothing jumps when a row is written: the new row starts at the far edge with the far edge\'s heights');
  }
  {
    // The same sound gives the same land whatever the frame rate.
    const run = (fps) => {
      const land = M.createLand(), amps = new Float32Array(NC);
      for (let i = 1; i <= 2 * fps; i++) { const t = i / fps; for (let c = 0; c < NC; c++) amps[c] = 0.3 * t * (0.5 + c / NC); land.advance(M.flow(50) / fps, amps); }
      const out = [];
      for (let j = 1; j < 12; j++) out.push(Array.from(land.row(j)));
      return { out, top: land.top, travel: land.travel, z: land.z(3) };
    };
    const a = run(30), b = run(60), c = run(10);
    let worst = 0, worst10 = 0;
    for (let j = 0; j < a.out.length; j++) for (let i = 0; i < NC; i++) { worst = Math.max(worst, Math.abs(a.out[j][i] - b.out[j][i])); worst10 = Math.max(worst10, Math.abs(a.out[j][i] - c.out[j][i])); }
    ok(a.top === b.top && a.top === c.top && near(a.travel, b.travel, 1e-9) && near(a.z, b.z, 1e-9) && worst < 1e-4 && worst10 < 1e-4, 'the same sound writes the same land at 10, 30 and 60 frames a second');
  }
  {
    const land = M.createLand(), pos = new Float32Array(NR * NC * 3), high = new Float32Array(NR * NC);
    for (let i = 0; i < 400; i++) land.advance(M.flow(50) / 60, flat(1));
    const peak = land.write(pos, high, 1.2);
    let okPos = true, top = 0, edge = 0;
    for (let j = 0; j < NR; j++) for (let c = 0; c < NC; c++) {
      const a = (j * NC + c) * 3, h = land.row(j)[c] * M.sink(M.columnX(c), land.z(j));
      if (!near(pos[a], M.columnX(c), 1e-6) || !near(pos[a + 2], land.z(j), 1e-6) || !near(pos[a + 1], h * 1.2, 1e-5) || !near(high[j * NC + c], h, 1e-5)) okPos = false;
      top = Math.max(top, h);
      if (j === 0 || j === NR - 1 || c === 0 || c === NC - 1) edge = Math.max(edge, h);
    }
    ok(okPos && near(peak, top, 1e-6), 'the land is drawn as its rows, each point sunk toward the edges and lifted by the voice; the heights for colouring are before the lift');
    ok(peak > 1.6 && peak > M.SNOW + 0.3 && edge <= 0.14 * 2.15 + 1e-6, 'a loud voice raises peaks well above the snow line, and the cut edges stay low');
    const hush = M.createLand();
    for (let i = 0; i < 400; i++) hush.advance(M.flow(50) / 60, flat(0));
    ok(hush.write(pos, high, 1) <= 2.15 * 0.15 + 1e-6 && hush.write(pos, high, 1) > 0.15, 'in silence the land is foothills');
    const odd = M.createLand();
    odd.advance(NaN, flat(0.5)); odd.advance(-3, flat(0.5)); odd.advance(Infinity, flat(0.5)); odd.advance(0, flat(0.5));
    ok(odd.travel === 0 && odd.top === 0 && Number.isFinite(odd.write(pos, high, 1)) && pos.every(Number.isFinite), 'a step that is not a distance moves nothing and leaves the land sound');
    const kept = M.createLand();
    for (let i = 0; i < 70; i++) kept.advance(1.01 * SP, flat(1));   // a little over a row a step, so that rounding cannot hold a row back
    for (let i = 0; i < 3; i++) kept.advance(1.01 * SP, flat(0));
    ok(kept.top === 73 && [kept.top - M.NZ + 1, kept.top - M.NZ].every((i) => Array.from(kept.stored(i)).every((h, c) => near(h, M.heightAt(M.columnX(c), i * SP, 1), 1e-6))),
      'a row is kept until it has left the near edge: the newest rows never overwrite the two the near edge is read from');
    const far = M.createLand(), jumpStart = Date.now();
    far.advance(40000, flat(0.5));
    ok(Date.now() - jumpStart < 1000 && far.top === Math.floor(40000 / SP), 'a jump writes only the rows still in the block, so it takes no time');
    ok([1, 20, M.NZ, M.NZ + 1].every((n) => { const i = far.top - (n - 1); return Array.from(far.stored(i)).every((h, c) => near(h, M.heightAt(M.columnX(c), i * SP, 0.5 * ((i * SP) / 40000)), 1e-5)); }),
      'after a jump every row the block shows, and the two the near edge is read from, is the land that belongs there');
    for (let i = 0; i < 30; i++) far.advance(0.011, flat(0.5));
    ok(Number.isFinite(far.write(pos, high, 1)) && pos.every(Number.isFinite) && near(far.z(NR - 1), 2.2) && far.z(1) >= -2.2 - 1e-9 && far.z(1) < -2.2 + SP, 'after hours of travel, and after a jump, the rows are still in place');
  }

  // The cut sides of the block.
  {
    const R = M.rim(), land = M.createLand(), pos = new Float32Array(NR * NC * 3), high = new Float32Array(NR * NC);
    for (let i = 0; i < 200; i++) land.advance(M.flow(50) / 60, flat(0.7));
    land.write(pos, high, 1);
    const at = (i) => { const v = R.from[i] * 3; return [pos[v], i & 1 ? -M.BASE : pos[v + 1], pos[v + 2]]; };
    let faces = 0, agree = true, outward = true;
    for (let t = 0; t < R.index.length; t += 3) {
      const a = at(R.index[t]), b = at(R.index[t + 1]), c = at(R.index[t + 2]);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(n[0], n[1], n[2]);
      const s = [0, 1, 2].map((k) => R.normals[R.index[t] * 3 + k]);
      faces++;
      if (l < 1e-9 || (n[0] * s[0] + n[1] * s[1] + n[2] * s[2]) / l < 0.999) agree = false;                        // wound to face the way its normal says
      if (s[0] * (a[0] + b[0] + c[0]) + s[2] * (a[2] + b[2] + c[2]) <= 0 || s[1] !== 0) outward = false;             // and that way is out of the block
    }
    const onRim = Array.from(R.from).every((v) => { const j = Math.floor(v / NC), c = v % NC; return j === 0 || j === NR - 1 || c === 0 || c === NC - 1; });
    const paired = Array.from(R.from).every((v, i) => (i & 1 ? v === R.from[i - 1] : true));
    ok(R.from.length === 2 * (2 * NC + 2 * NR) && R.normals.length === R.from.length * 3 && faces === 2 * (2 * (NC - 1) + 2 * (NR - 1)) && onRim && paired,
      'the cut sides are a wall below every point of the land\'s rim: each rim point and the point under it on the base');
    ok(agree && outward, 'every piece of the cut sides faces out of the block, and is wound the way its normal points');
  }

  // The table.
  ok(T.VIZ_SCENES.indexOf('mountains-3d') === T.VIZ_SCENES.indexOf('sunburst-3d') + 1 && T.VIZ_USES_3D.includes('mountains-3d'), 'mountains-3d is a kit scene, listed after the sunburst');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['mountains-3d']) === '{"speed":50,"cameraDrift":50,"rotateX":0,"rotateY":0,"rotateZ":0}' && JSON.stringify(T.PER_VIZ_MAX['mountains-3d']) === '{"rotateX":360,"rotateY":360,"rotateZ":360}',
    'mountains knobs: speed, camera drift, and three rotations of up to 360 degrees that start at none');
  {
    const Mo = globalThis.TimbreMountains, K = globalThis.TimbreScene, view = { frame: Mo.FRAME, fov: Mo.FOV, pitch: Mo.PITCH }, still = K.poseFor(Mo.BOX, view, 0, 0, 0), over = K.poseFor(Mo.BOX, view, 72, 45, 0);
    ok(Mo.FOV === 30 && Mo.PITCH === 18 && JSON.stringify(Mo.FRAME) === '{"width":8.8,"height":5.4,"center":[0,0.8,0.2]}' && JSON.stringify(Mo.BOX) === JSON.stringify({ min: [-3.5, -0.26, -2.2], max: [3.5, 2.15 * 1.26, 2.2] })
      && still.scale === 1 && still.x === 0 && still.y === 0 && still.z === 0 && over.scale < 0.9 && over.scale > 0.4 && globalThis.__turnedInFrame(Mo, 0.56)
      && Mo.SWAY === 0.28 && Mo.lift(1, 1) <= 1.26 && Mo.lift(1, 1) > 1.2,
      'the block of land is a box the Rotate settings keep in the frame: unturned it is where it was, seen from above as a diamond it is drawn smaller, and however it is turned, wherever the camera drifts to, it reaches no further than it did unturned or 86% of the way to the edge of the frame');
  }
  const oldLand = T.sanitizeConfig({ activeViz: 'mountains-3d', perViz: { 'mountains-3d': { speed: 80 } } });
  ok(oldLand.activeViz === 'mountains-3d' && JSON.stringify(oldLand.perViz['mountains-3d']) === '{"speed":80,"cameraDrift":50,"rotateX":0,"rotateY":0,"rotateZ":0}', 'a saved pre-redesign mountains config keeps its speed and gains the new defaults');
  ok(!('mountains-3d' in T.VIZ_LABELS), 'mountains keeps the name it is listed by');

  // The files.
  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="mountains.js"');
    order.push(pos > html.indexOf('src="sunburst.js"') && pos > html.indexOf('src="scene-kit.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load mountains.js after the scene kit and sunburst.js and before the factories');
  const factory = await readFile(resolve(__dirname, 'overlay/factories/mountains-3d.js'), 'utf8');
  ok(/VIZ_FACTORIES\['mountains-3d'\] = TimbreScene\.factory\(\(\) => TimbreMountains\.definition\(\)\);/.test(factory) && !/WebGLRenderer/.test(factory), 'the effect is the kit\'s factory around the mountains\' definition, with no renderer of its own');
}

console.log('\n[16] phosphor');
await import('./overlay/phosphor.js');
{
  const Ph = globalThis.TimbrePhosphor;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const ease = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const P = Ph.P, K = Ph.K;

  ok(Ph.SLICES_MIN === 12 && Ph.SLICES_MAX === 36 && Ph.P === 96 && Ph.K === 10 && Ph.W === 6.4 && Ph.D === 3.6 && Ph.SPAN === 2.2 && Ph.HZ === 24 && Ph.HIST === 56 && Ph.LOW === 0.14 && Ph.TALL === 1.5 && Ph.GLOW === 0.28 && Ph.FRONT === 0.006 && Ph.RISE === 20 && Ph.FALL === 8,
    'the sizes: 12 to 36 slices of 96 points, a deck 6.4 wide and 3.6 deep holding 2.2 s, ten bands, 56 history samples at 24 a second');
  ok((Ph.HIST - 1) / Ph.HZ >= Ph.SPAN, 'the history reaches back as far as the last slice');
  ok(Ph.sliceCount(0) === 12 && Ph.sliceCount(50) === 24 && Ph.sliceCount(100) === 36 && Ph.sliceCount(-9) === 12 && Ph.sliceCount(500) === 36 && Ph.sliceCount(NaN) === 24 && Ph.sliceCount(undefined) === 24 && Ph.sliceCount(25) === 18,
    'Depth 0 is 12 slices, 50 is 24, 100 is 36; anything else is held to that range, and no setting at all is the default');

  // Where a slice is, and how old.
  ok(Ph.backOf(0, 24) === 0 && Ph.backOf(23, 24) === 1 && near(Ph.backOf(5, 12), 5 / 11) && Ph.backOf(0, 1) === 0, 'the front slice is at 0 and the last at 1, however many there are');
  ok(Ph.ageOf(0) === 0 && near(Ph.ageOf(1), 2.2) && near(Ph.ageOf(0.5), 1.1) && near(Ph.zOf(0), 1.8) && near(Ph.zOf(1), -1.8) && near(Ph.zOf(0.25), 0.9),
    'the front slice is the voice now and nearest the viewer; the last is 2.2 s old and 3.6 further back');
  ok(near(Ph.xOf(0), -3.2) && near(Ph.xOf(95), 3.2) && near(Ph.xOf(19), (19 / 95 - 0.5) * 6.4), 'a trace runs the width of the deck');

  // The bands.
  ok(near(Ph.waves(0), 1.2) && near(Ph.waves(1), 2.1) && near(Ph.waves(9), 9.3) && near(Ph.pace(0), 0.9) && near(Ph.pace(1), -1.45) && near(Ph.pace(2), 2) && near(Ph.pace(9), -5.85)
    && Ph.weight(0) === 1 && near(Ph.weight(9), 1 / 2.35) && near(Ph.weight(4), 1 / 1.6),
    'each band is a sine across the width: the lowest 1.2 waves and 0.9 more for each band, running alternately one way and the other, the higher ones faster and a little weaker');
  {
    const bins = new Uint8Array(32); bins[0] = 255; bins[1] = 51; bins[9] = 102;
    ok(near(Ph.loudness(bins, 0, 1), 1) && near(Ph.loudness(bins, 1, 1), 0.2) && near(Ph.loudness(bins, 9, 1), 0.4) && near(Ph.loudness(bins, 1, 2), 0.4) && Ph.loudness(bins, 9, 3) === 1
      && Ph.loudness(bins, 1, 0) === 0 && Ph.loudness(null, 3, 1) === 0 && Ph.loudness(new Uint8Array(0), 3, 1) === 0 && Ph.loudness(bins, 40, 1) === 0,
      'a band is as loud as its bin, times Gain, held to 1; nothing with no bins or a band past the last bin');
  }

  // The shape of a trace.
  {
    const none = new Float32Array(K), phases = new Float64Array(K), one = new Float32Array(K), two = new Float32Array(K);
    one[3] = 1; two[0] = 0.5; two[6] = 0.8;
    const w3 = Ph.weight(3), f3 = Ph.waves(3);
    ok(Ph.shape(0.3, none, phases) === 0 && near(Ph.shape(0.3, one, phases), (w3 * Math.sin(2 * Math.PI * f3 * 0.3)) / (0.15 + w3)) && near(Ph.shape(0, one, phases), 0),
      'with no sound a trace is flat; one band alone is that band\'s sine, a little short of full swing');
    phases[3] = 1.1;
    ok(near(Ph.shape(0.3, one, phases), (w3 * Math.sin(2 * Math.PI * f3 * 0.3 + 1.1)) / (0.15 + w3)), 'a band\'s phase moves its wave along the trace');
    const p2 = new Float64Array(K); p2[0] = 0.4; p2[6] = -2;
    const want = (0.5 * Ph.weight(0) * Math.sin(2 * Math.PI * Ph.waves(0) * 0.7 + 0.4) + 0.8 * Ph.weight(6) * Math.sin(2 * Math.PI * Ph.waves(6) * 0.7 - 2)) / (0.15 + 0.5 * Ph.weight(0) + 0.8 * Ph.weight(6));
    ok(near(Ph.shape(0.7, two, p2), want, 1e-7), 'bands add, each weighed by how loud it is, and the whole is scaled to the bands\' total');
    const full = new Float32Array(K).fill(1);
    let worst = 0;
    for (let i = 0; i < 500; i++) { for (let b = 0; b < K; b++) p2[b] = i * 0.37 * (b + 1); worst = Math.max(worst, Math.abs(Ph.shape((i * 0.0137) % 1, full, p2))); }
    ok(worst < 1 && worst > 0.4, 'the shape stays within one either way, however the waves fall');
  }

  // How tall a trace stands.
  ok(Ph.stand(0, 0, 0) === 0 && near(Ph.stand(1, 0, 0), 1) && near(Ph.stand(0.5, 0, 0.3), Math.pow(0.5, 0.9)) && near(Ph.stand(1, 1, 0), 1.25) && near(Ph.stand(1, 1, 4 / 23), 1 + 0.25 * Math.exp(-1)) && near(Ph.stand(1, 1, 1), 1 + 0.25 * Math.exp(-5.75)) && Ph.stand(-2, 0, 0) === 0
    && near(Ph.stand(0.5, 1, 0), Math.pow(0.5, 0.9) * 1.25), 'a trace stands as tall as the voice was loud; a beat lifts the nearest ones by up to a quarter, less the further back');
  ok(near(Ph.heightOf(0, 1, 0.3), 0.14) && near(Ph.heightOf(1, 1, 1), 1.64) && near(Ph.heightOf(1, 1, -1), 0.14 + 1.5 * 0.1) && near(Ph.heightOf(1, 0, 1), 0.14) && near(Ph.heightOf(0.5, 0.5, 0), 0.14 + 1.5 * 0.25 * 0.55),
    'in silence a slice is a foot 0.14 high; a loud voice adds up to 1.5, more where the wave is up and less where it is down, and nothing at the pinned ends');
  ok(Ph.pin(0) === 0 && Ph.pin(1) === 0 && near(Ph.pin(0.5), 1) && near(Ph.pin(0.16), 1) && near(Ph.pin(0.84), 1) && near(Ph.pin(0.08), 0.5) && near(Ph.pin(0.92), 0.5) && near(Ph.pin(0.04), ease(0, 0.16, 0.04)),
    'a trace is held down at its two ends and free from 16% of the way in');
  ok(Ph.ends(0) === 0 && Ph.ends(1) === 0 && near(Ph.ends(0.5), 1) && near(Ph.ends(0.16 / 2.2), 1) && near(Ph.ends(0.08 / 2.2), 0.5) && near(Ph.ends(1 - 0.08 / 2.2), 0.5), 'its light fades out over the last 7% at each end');

  // The strip of light along a trace, and the wall under it.
  {
    const xs = new Float32Array(P), flat = new Float32Array(P).fill(1), slant = new Float32Array(P), out = new Float32Array((P + 3) * 6);
    for (let j = 0; j < P; j++) { xs[j] = Ph.xOf(j); slant[j] = 1 + 0.5 * xs[j]; }
    const pairs = (ys, z, half, at = 0) => {
      out.fill(NaN);
      Ph.strip(out, at, xs, ys, z, half);
      let onTrace = true, wide = true, across = true, facing = true;
      for (let j = 0; j < P; j++) {
        const a = (at + j * 2) * 3, p = [out[a], out[a + 1], out[a + 2]], q = [out[a + 3], out[a + 4], out[a + 5]];
        const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2], d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
        if (!near(m[0], xs[j], 1e-5) || !near(m[1], ys[j], 1e-5) || !near(m[2], z, 1e-5)) onTrace = false;
        if (!near(Math.hypot(d[0], d[1], d[2]), 2 * half, 1e-5)) wide = false;
        const j0 = Math.max(0, j - 1), j1 = Math.min(P - 1, j + 1), t = [xs[j1] - xs[j0], ys[j1] - ys[j0], 0];
        if (Math.abs(d[0] * t[0] + d[1] * t[1] + d[2] * t[2]) > 1e-5) across = false;
        if (d[2] !== 0 || out[a + 2] !== Math.fround(z) || !(q[1] > p[1])) facing = false;   // in the slice's plane, the second point of a pair the upper one
      }
      return { onTrace, wide, across, facing, untouched: Number.isNaN(out[(at + P * 2) * 3]) && (at === 0 || Number.isNaN(out[(at - 1) * 3])) };
    };
    const a = pairs(flat, 0.5, 0.06), b = pairs(slant, -1, 0.1, 4);
    ok(a.onTrace && a.wide && a.across && a.facing && b.onTrace && b.wide && b.across && b.facing && a.untouched && b.untouched,
      'a trace is a strip of pairs of points: each pair is centred on the trace, as far apart as the strip is wide, across the trace, and in the plane of its slice');
    const w = new Float32Array((P + 2) * 9).fill(NaN), ys = new Float32Array(P).fill(1); ys[10] = 0.14; ys[11] = 0.3;
    Ph.wall(w, 2, xs, ys, 0.7);
    const tri = (j) => Array.from(w.subarray((2 + j * 3) * 3, (2 + j * 3) * 3 + 9));
    ok(tri(0).every((v, i) => near(v, [xs[0], 1, 0.7, xs[0], 0.72, 0.7, xs[0], 0, 0.7][i], 1e-6)) && tri(10).every((v, i) => near(v, [xs[10], 0.14, 0.7, xs[10], 0, 0.7, xs[10], 0, 0.7][i], 1e-6))
      && near(tri(11)[4], 0.02, 1e-6) && Number.isNaN(w[0]) && Number.isNaN(w[(2 + P * 3) * 3]),
      'a slice is three points under each point of its trace: the top edge, where the glow ends 0.28 below it (never under the foot), and the foot');
  }

  // Brightness, width and colour.
  ok(Ph.fade(0) === 1 && near(Ph.fade(1), 0.12) && near(Ph.fade(0.5), 0.12 + 0.88 * Math.pow(0.5, 1.3)) && Ph.fade(0.3) > Ph.fade(0.6), 'the traces dim toward the back of the deck, to 12%');
  ok(near(Ph.bright(0, 0, 0), 0.3) && near(Ph.bright(1, 0, 0), 1.7) && near(Ph.bright(1, 1, 0), 2.6) && near(Ph.bright(1, 1, 3 / 23), (1.7 + 0.9 * Math.exp(-1)) * Ph.fade(3 / 23)) && near(Ph.bright(1, 0, 0.5), 1.7 * Ph.fade(0.5)),
    'a trace is brighter the louder the voice was, and a beat flashes the nearest ones');
  ok(near(Ph.hot(0), 0.55) && near(Ph.hot(5 / 23), 0.55 * Math.exp(-2)) && Ph.hot(20 / 23) < 0.001, 'the nearest traces are white-hot, whatever the number of slices');
  ok(near(Ph.halfWidth(0, 0, 0), 0.045) && near(Ph.halfWidth(1, 0, 0), 0.08) && near(Ph.halfWidth(1, 1, 0), 0.11) && near(Ph.halfWidth(1, 1, 3 / 23), (0.08 + 0.03 * Math.exp(-1)) * (1 - 0.35 * 3 / 23)) && near(Ph.halfWidth(1, 0, 1), 0.08 * 0.65),
    'a trace is wider when the voice was louder and on a beat, and narrower toward the back');
  ok(near(Ph.under(0, 0), 0.03) && near(Ph.under(1, 0), 0.23) && near(Ph.under(1, 1), 0.23 * 0.12), 'a slice glows under its trace, more when the voice was louder, dimmer toward the back');
  {
    const t3 = (hot, b) => Array.from(Ph.tint([0, 0, 0], [0.2, 0.4, 0.8], hot, b));
    const out = [9, 9, 9];
    ok(t3(0, 2).every((v, c) => near(v, 2 * [0.2, 0.4, 0.8][c])) && t3(1, 2).every((v) => near(v, 2)) && t3(0.5, 1).every((v, c) => near(v, [0.6, 0.7, 0.9][c])) && Ph.tint(out, [1, 1, 1], 0, 1) === out,
      'a trace is its own colour, mixed toward white where it is hot, times its brightness');
  }
  ok(near(Ph.idle(2, 3), Math.max(0, 0.3 + 0.25 * Math.sin(0.7 * 3 + 1.3 * 2))) && near(Ph.idle(7, 3), 0.4 * Math.max(0, 0.3 + 0.25 * Math.sin(0.7 * 3 + 1.3 * 7))) && [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].every((b) => Ph.idle(b, 11.3) >= 0 && Ph.idle(b, 11.3) <= 1)
    && Math.abs(Ph.idle(1, 0) - Ph.idle(1, 2)) > 0.05, 'with the mic off the bands follow a slow pattern, the higher ones weaker');

  // The table.
  ok(T.VIZ_SCENES[T.VIZ_SCENES.indexOf('mountains-3d') + 1] === 'phosphor' && T.VIZ_USES_3D.includes('phosphor'), 'phosphor is a kit scene, listed after the mountains');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['phosphor']) === '{"depth":50,"cameraDrift":50,"rotateX":0,"rotateY":0,"rotateZ":0}' && JSON.stringify(T.PER_VIZ_MAX['phosphor']) === '{"rotateX":360,"rotateY":360,"rotateZ":360}',
    'phosphor knobs: depth, camera drift, and three rotations of up to 360 degrees that start at none');
  {
    const K = globalThis.TimbreScene, view = { frame: Ph.FRAME, fov: Ph.FOV, pitch: Ph.PITCH }, still = K.poseFor(Ph.BOX, view, 0, 0, 0), over = K.poseFor(Ph.BOX, view, 60, 45, 0);
    ok(Ph.FOV === 30 && Ph.PITCH === 30 && JSON.stringify(Ph.FRAME) === '{"width":7.6,"height":4.4,"center":[0,0.55,0]}' && JSON.stringify(Ph.BOX) === JSON.stringify({ min: [-3.2, 0, -1.8], max: [3.2, 0.14 + 1.5 * 1.25, 1.8] })
      && still.scale === 1 && still.x === 0 && still.y === 0 && still.z === 0 && over.scale < 0.9 && over.scale > 0.4 && globalThis.__turnedInFrame(Ph, 0.52) && Ph.SWAY === 0.26,
      'the deck is a box the Rotate settings keep in the frame: unturned it is where it was, seen from above as a diamond it is drawn smaller, and however it is turned, wherever the camera drifts to, it reaches no further than it did unturned or 86% of the way to the edge of the frame');
  }
  ok(Ph.behind(0, 0, 0, 0) === false && Ph.behind(0, 180, 0, 0) === true && Ph.behind(0, 170, 0, 0) === true && Ph.behind(0, 80, 0, 0) === false && Ph.behind(0, 100, 0, 0) === true
    && Ph.behind(0, 90, 0, 0.1) === false && Ph.behind(0, 90, 0, -0.1) === true && Ph.behind(180, 0, 0, 0) === true && Ph.behind(50, 0, 0, 0) === false && Ph.behind(70, 0, 0, 0) === true && Ph.behind(250, 0, 0, 0) === false && Ph.behind(0, 0, 180, 0) === false,
    'the camera sees the deck from behind when the deck has been turned round, tipped forward past 60 degrees (it looks down at 30), or the camera has swung past its end');
  const oldDeck = T.sanitizeConfig({ activeViz: 'phosphor', perViz: { 'phosphor': { depth: 80 } } });
  ok(oldDeck.activeViz === 'phosphor' && JSON.stringify(oldDeck.perViz['phosphor']) === '{"depth":80,"cameraDrift":50,"rotateX":0,"rotateY":0,"rotateZ":0}', 'a saved pre-redesign phosphor config keeps its depth and gains the new defaults');
  ok(!('phosphor' in T.VIZ_LABELS), 'phosphor keeps the name it is listed by');

  // The files.
  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="phosphor.js"');
    order.push(pos > html.indexOf('src="mountains.js"') && pos > html.indexOf('src="scene-kit.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load phosphor.js after the scene kit and mountains.js and before the factories');
  const factory = await readFile(resolve(__dirname, 'overlay/factories/phosphor.js'), 'utf8');
  ok(/VIZ_FACTORIES\['phosphor'\] = TimbreScene\.factory\(\(\) => TimbrePhosphor\.definition\(\)\);/.test(factory) && !/WebGLRenderer/.test(factory), 'the effect is the kit\'s factory around the phosphor\'s definition, with no renderer of its own');
}

console.log('\n[17] chladni');
await import('./overlay/chladni.js');
{
  const C = globalThis.TimbreChladni;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const F = C.FIGURES, PI = Math.PI;
  const exact = (fig, x, z) => Math.cos(fig[0] * PI * x) * Math.cos(fig[1] * PI * z) + fig[2] * Math.cos(fig[1] * PI * x) * Math.cos(fig[0] * PI * z);

  ok(C.GRAINS_MIN === 6000 && C.GRAINS_MAX === 30000 && C.HALF === 2.2 && C.THICK === 0.09 && C.G === 48 && C.T === 2048 && C.BANDS === 16 && C.BLEND === 0.8 && C.PAUSE === 0.45 && C.HOLD === 3 && C.REST === 2.5
    && C.HUSH === 0.1 && C.LOUD === 0.22 && C.HUM === 0.04 && C.GRAV === 9 && C.REACH === 0.04 && C.SPREAD === 0.024 && C.TONE_LOW === 0.4 && C.TONE_SPAN === 2.6 && C.FLEX === 0.035 && C.BEAT === 4 && C.RIM === 0.16 && C.ONSET === 0.1 && C.STEPS_MAX === 6 && C.TONE_RATE === 2.5 && C.LIFT === 0.014 && C.SIZE === 0.085 && C.RINGS === 32,
    'the sizes: 6,000 to 30,000 grains on a plate 4.4 on a side and 0.09 thick, a grid of 48, tables of 2,048, 16 bands, a blend of 0.8 s, a pause of 0.45 s, a hold of 3 s, a rest of 2.5 s between throws');
  ok(C.grainCount(0) === 6000 && C.grainCount(50) === 18000 && C.grainCount(100) === 30000 && C.grainCount(-9) === 6000 && C.grainCount(500) === 30000 && C.grainCount(NaN) === 18000 && C.grainCount(undefined) === 18000 && C.grainCount(25) === 12000,
    'Density 0 is 6,000 grains, 50 is 18,000, 100 is 30,000; anything else is held to that range, and no setting at all is the default');

  // The figures.
  ok(JSON.stringify(F) === '[[1,2,-1],[1,2,1],[1,3,1],[2,3,-1],[2,3,1],[1,4,-1],[3,4,-1],[2,5,1],[3,5,-1],[4,5,1]]' && F.every((f, i) => i === 0 || f[0] + f[1] >= F[i - 1][0] + F[i - 1][1]),
    'ten figures, the simplest first');
  ok(C.value(F[0], 0, 0) === 0 && C.value(F[1], 0, 0) === 2 && near(C.value(F[3], 0.3, -0.7), exact(F[3], 0.3, -0.7)) && near(C.value(F[7], -0.81, 0.13), exact(F[7], -0.81, 0.13)),
    'a figure is the two halves of the plate\'s motion, added or taken from each other');
  ok(F.every((f) => near(C.value(f, 0.37, 0.61), C.value(f, -0.37, 0.61)) && near(C.value(f, 0.37, 0.61), C.value(f, 0.37, -0.61)) && near(C.value(f, 0.37, 0.61), f[2] * C.value(f, 0.61, 0.37))
    && (f[2] > 0 || near(C.value(f, 0.44, 0.44), 0))), 'every figure is the same left and right, near and far, and across the diagonals (a line of the figure, where the halves are taken from each other)');
  ok(C.cell(-1) === 0 && C.cell(1) === 2047 && C.cell(-5) === 0 && C.cell(5) === 2047 && C.cell(0) === 1024 && C.cell(0.5) === Math.floor(1.5 * 0.5 * 2047 + 0.5), 'a place on the plate is one of 2,048 table cells, held to the plate');
  {
    const out = [0, 0, 0], e = 1e-5;
    let worstF = 0, worstS = 0, steep = 0;
    for (const f of F) for (let i = 0; i < 60; i++) {
      const x = Math.sin(i * 1.7) * 0.98, z = Math.cos(i * 2.9) * 0.98;
      C.sample(f, C.cell(x), C.cell(z), out);
      worstF = Math.max(worstF, Math.abs(out[0] - exact(f, x, z)));
      const sx = (exact(f, x + e, z) - exact(f, x - e, z)) / (2 * e), sz = (exact(f, x, z + e) - exact(f, x, z - e)) / (2 * e);
      worstS = Math.max(worstS, Math.abs(out[1] - sx), Math.abs(out[2] - sz));
      steep = Math.max(steep, Math.abs(sx));
    }
    ok(worstF < 0.02 && worstS < 0.3 && steep > 10, 'the tables give a figure\'s value and its slope each way, to within a cell');
  }

  {
    const bins = new Uint8Array(32); bins[0] = 255; bins[1] = 51; bins[9] = 102;
    ok(near(C.loudness(bins, 0, 1), 1) && near(C.loudness(bins, 1, 1), 0.2) && near(C.loudness(bins, 9, 1), 0.4) && near(C.loudness(bins, 1, 2), 0.4) && C.loudness(bins, 9, 3) === 1
      && C.loudness(bins, 1, 0) === 0 && C.loudness(null, 3, 1) === 0 && C.loudness(new Uint8Array(0), 3, 1) === 0 && C.loudness(bins, 40, 1) === 0,
      'a band is as loud as its bin, times Gain, held to 1; nothing with no bins or a band past the last bin');
  }

  // The tone, and which figure.
  {
    const bands = new Float32Array(16);
    const none = C.toneOf(bands);
    bands[3] = 0.1;
    const faint = C.toneOf(bands);
    bands.fill(0); bands[0] = 1;
    const low = C.toneOf(bands);
    bands.fill(0); bands[9] = 1;
    const high = C.toneOf(bands);
    bands.fill(0); bands[1] = 0.5; bands[2] = 0.5;
    const mid = C.toneOf(bands);
    bands.fill(0); bands[2] = 0.9; bands[5] = 0.3;
    const lean = C.toneOf(bands);
    ok(none === -1 && faint === -1 && low === 0 && high === 1 && near(mid, 1.1 / 2.6) && near(lean, (2.3 - 0.4) / 2.6, 1e-6),
      'the tone is where the sound\'s weight sits among the 16 lowest bins, each weighing as its square, 0 to 1; with too little sound there is none');
    // A floor of hiss in every bin under a low voice: the tone stays near the voice's. (Weighed plainly, it would be 1.)
    bands.fill(0); bands[1] = 0.8;
    const clean = C.toneOf(bands);
    bands.fill(0.05); bands[1] = 0.8;
    const hissy = C.toneOf(bands);
    ok(near(clean, 0.6 / 2.6, 1e-6) && hissy > clean && hissy - clean < 0.15, 'a floor of hiss under the voice barely moves the tone');
    ok(C.meanOf(0.2, 1, 0, 0.01) === 1 && near(C.meanOf(1, 0, 0.05, 0.05), 0.5) && near(C.meanOf(0.4, 0.4, 0.3, 0.1), 0.4) && near(C.meanOf(0, 1, 0.09, 0.01), 0.1) && C.meanOf(0.7, 0.3, 0, 0) === 0.3,
      'a running mean: what there was, for as long as it lasted, and the new value for its moment');
    ok(C.wantFigure(0) === 0 && C.wantFigure(0.05) === 0 && C.wantFigure(0.1) === 1 && C.wantFigure(0.45) === 4 && C.wantFigure(0.999) === 9 && C.wantFigure(1) === 9 && C.wantFigure(-1) === 0 && C.wantFigure(NaN) === 0,
      'a low tone asks for a simple figure and a high one for an intricate one');
  }
  {
    const dt = 1 / 60, run = (st, level, want, secs) => { for (let i = 0, n = Math.round(secs * 60); i < n; i++) C.listen(st, level, want, dt); return st; };
    const st = C.voice();
    ok(st.figure === 0 && st.from === 0 && st.since >= 0.8 && st.quiet > 0.45 && st.pending === false && st.changes === 0 && st.phrases === 0, 'a plate starts on the simplest figure, in a pause');
    C.listen(st, 0.5, 4, dt);
    ok(st.figure === 4 && st.from === 0 && st.asked === 4 && st.since === 0 && st.quiet === 0 && st.pending === false && st.changes === 1 && st.phrases === 1, 'when the voice comes back after a pause, the plate takes the figure for its tone');
    run(st, 0.5, 7, 2.9);
    const held = st.figure === 4 && st.changes === 1;
    run(st, 0.5, 7, 0.3);
    ok(held && st.figure === 7 && st.from === 4 && st.asked === 7 && st.changes === 2 && st.since < 0.25, 'within a phrase the figure follows a tone that has moved, but not within 3 s of the last change');
    const fresh = C.voice();
    C.listen(fresh, 0.5, 0, dt);
    ok(fresh.figure === 0 && fresh.changes === 0 && fresh.phrases === 1 && fresh.quiet === 0, 'a plate\'s first phrase takes the figure its tone asks for, even the one it starts on');

    // A voice that keeps its tone.
    const steady = C.voice();
    C.listen(steady, 0.5, 3, dt); run(steady, 0, 3, 0.6); run(steady, 0.5, 3, 8);
    ok(steady.figure === 4 && steady.from === 3 && steady.asked === 3 && steady.changes === 2 && steady.phrases === 2, 'a phrase on the tone the plate already shows takes the next figure along, and keeps it however long the phrase');
    const seen = [];
    for (let i = 0; i < 6; i++) { run(steady, 0, 3, 0.6); run(steady, 0.5, 3, 1); seen.push(steady.figure); }
    ok(seen.join() === '5,3,4,5,3,4', 'a voice that keeps its tone goes round three figures, phrase after phrase');
    ok(C.phraseFigure(3, 3, 0) === 4 && C.phraseFigure(3, 4, 3) === 5 && C.phraseFigure(3, 5, 4) === 3 && C.phraseFigure(9, 9, 2) === 8 && C.phraseFigure(9, 8, 9) === 7 && C.phraseFigure(8, 8, 7) === 6 && C.phraseFigure(7, 7, 7) === 8
      && C.phraseFigure(0, 5, 6) === 0 && C.phraseFigure(0, 0, 1) === 2, 'a new phrase takes the figure its tone asks for, or the nearest one along that the plate neither has nor had; from the last two figures it goes down the list');

    // Gaps and pauses.
    const bursts = C.voice();
    C.listen(bursts, 0.5, 3, dt);
    for (let i = 0; i < 16; i++) { run(bursts, 0, 3, 0.3); run(bursts, 0.5, 3, 0.2); }
    ok(bursts.figure === 3 && bursts.changes === 1 && bursts.phrases === 1 && bursts.pending === false, 'short gaps do not add up to a pause, even while the plate is changing figure');
    const gap = C.voice(); gap.figure = 3; gap.asked = 3; gap.since = 1; gap.quiet = 0.3; gap.phrases = 1;
    C.listen(gap, 0.5, 3, dt);
    ok(gap.figure === 3 && gap.changes === 0 && gap.quiet === 0 && gap.pending === false, 'a gap shorter than a pause is not a new phrase');
    const murmur = C.voice(); murmur.figure = 3; murmur.asked = 3; murmur.phrases = 1; murmur.quiet = 0;
    run(murmur, 0.15, 6, 0.5);
    const unmoved = murmur.figure === 3 && murmur.quiet === 0;
    run(murmur, 0.05, 6, 0.5);
    ok(unmoved && murmur.figure === 3 && near(murmur.quiet, 0.5, 1e-9), 'a voice neither loud nor hushed changes nothing; a hushed one counts as quiet');
    run(murmur, 0.15, 6, 0.5);
    const noStart = murmur.figure === 3 && murmur.pending === false && near(murmur.quiet, 0.5, 1e-9) && murmur.phrases === 1;
    C.listen(murmur, 0.5, 6, dt);
    ok(noStart && murmur.figure === 6 && murmur.phrases === 2 && murmur.quiet === 0, 'after a pause, a voice neither loud nor hushed does not start a phrase; a loud one does');
    const soon = C.voice(); soon.figure = 3; soon.asked = 3; soon.phrases = 1; soon.since = 0.2; soon.quiet = 1;
    C.listen(soon, 0.5, 5, 0.1);
    const waited = soon.figure === 3 && soon.pending === true && soon.quiet === 0;
    for (let i = 0; i < 6; i++) C.listen(soon, 0.5, 5, 0.1);
    ok(waited && soon.figure === 5 && soon.changes === 1 && soon.pending === false, 'a new phrase that comes while the plate is still changing waits until it has finished');
    const mute = C.voice(); mute.figure = 3; mute.asked = 3; mute.phrases = 1;
    run(mute, 0.5, -1, 0.5);
    const waiting = mute.figure === 3 && mute.pending === true && mute.phrases === 1;
    C.listen(mute, 0.5, 6, dt);
    ok(waiting && mute.figure === 6 && mute.phrases === 2 && mute.pending === false, 'a sound with no tone to speak of starts no phrase; the phrase starts when it has one');
  }
  ok(C.blendOf(0) === 0 && near(C.blendOf(0.4), 0.5) && C.blendOf(0.8) === 1 && C.blendOf(9) === 1 && near(C.blendOf(0.2), 0.15625), 'the plate changes figure over 0.8 s, easing in and out');

  // How hard the plate shakes, and what that does to a grain.
  ok(C.shakeOf(0, 0, true) === 0.04 && near(C.shakeOf(0.5, 0, true), 0.54) && near(C.shakeOf(0.5, 0.5, true), 0.74) && C.shakeOf(1, 1, true) === 1.2 && C.shakeOf(0.8, 0.5, false) === 0,
    'the plate shakes as hard as the voice is loud, a little more on a beat and never less than a hum; with the mic and Idle animation off it does not shake');
  ok(C.pace(0) === 0.5 && near(C.pace(1), 2.7) && C.jostle(0, 1 / 60) === 0 && near(C.jostle(1, 1 / 60), 0.07 * Math.sqrt(0.2)) && near(C.jostle(0.5, 1 / 30), 0.035 * Math.sqrt(0.4))
    && near(C.hopChance(1, 1 / 60), 0.1) && near(C.hopChance(0.5, 1 / 30), 0.1) && near(C.hopSpeed(1, 1, 0), 0.6) && near(C.hopSpeed(1, 1, 1), 1.8) && near(C.hopSpeed(0.25, 0.5, 0.5), 0.3),
    'louder, a grain walks faster, is jostled more, and hops more often and higher');
  ok(C.thrown(1, true, 9) === 1 && near(C.thrown(0.95, true, 9), 0.5) && C.thrown(0.9, true, 9) === 0 && C.thrown(1, false, 9) === 0 && C.thrown(1, true, 1) === 0 && C.thrown(1, true, 2.4) === 0 && C.thrown(1, true, 2.6) === 1 && C.thrown(2, true, 9) === 1,
    'a beat with the level above 0.9 throws the sand, harder the nearer 1, and not within 2.5 s of the last throw');
  ok(C.stepsFor(1 / 60) === 1 && C.stepsFor(1 / 30) === 2 && C.stepsFor(1 / 120) === 1 && C.stepsFor(1 / 144) === 1 && C.stepsFor(1 / 45) === 2 && C.stepsFor(1 / 50) === 2 && C.stepsFor(0.1) === 6 && C.stepsFor(1) === 6 && C.stepsFor(0) === 1,
    'the sand moves in steps no longer than a sixtieth of a second, at most six a frame');

  // The sand.
  {
    const N = 4000, h = 1 / 60;
    const a = C.createSand(N, 7), b = C.createSand(N, 7), c = C.createSand(N, 8);
    let inside = true, quad = 0, offMax = 0, offSum = 0;
    for (let i = 0; i < N; i++) {
      if (!(Math.abs(a.x[i]) <= 1 && Math.abs(a.z[i]) <= 1) || a.y[i] !== 0) inside = false;
      if (a.x[i] > 0 && a.z[i] > 0) quad++;
      offMax = Math.max(offMax, Math.abs(a.off[i])); offSum += a.off[i];
    }
    const same = (p, q) => p.x.every((v, i) => v === q.x[i]) && p.z.every((v, i) => v === q.z[i]) && p.y.every((v, i) => v === q.y[i]);
    const seeds0 = Uint32Array.from(a.rng);
    ok(a.n === N && inside && Math.abs(quad / N - 0.25) < 0.03 && offMax <= 1.5 * 0.024 && offMax > 0.02 && Math.abs(offSum / N) < 0.002 && same(a, b) && !same(a, c) && a.rng.every((s) => s !== 0) && new Set(a.rng).size > 0.99 * N && a.rng.every((s, i) => s === b.rng[i]) && a.rng.filter((s, i) => s === c.rng[i]).length < 0.01 * N,
      'sand starts spread evenly over the plate, each grain with its own place beside a line and its own random numbers; the same seed gives the same sand');

    {
      const draw = (s) => (Math.imul(s, 1664525) + 1013904223) >>> 0;
      let shifted = 0;
      for (let i = 0; i < 200; i++) { let s = a.rng[i], u = a.rng[i + 1]; for (let k = 0; k < 40; k++) { s = draw(s); u = draw(u); if (s === a.rng[i + 1] || u === a.rng[i]) shifted++; } }
      ok(shifted === 0, 'no grain\'s run of random numbers is its neighbour\'s a few draws on');
    }
    const fig = F[2], first = C.measure(a, N, fig, fig, 1);
    // One grain, with the plate shaking so little that nothing jostles it: far from its place it walks straight
    // down the slope at the plate's pace, whichever side of the line it is on; within reach of its place the
    // distance left dies away at pace / reach a second, whatever the length of the step.
    {
      const one = C.createSand(1, 2), out = [0, 0, 0];
      const farAt = (x, z) => { C.sample(fig, C.cell(x), C.cell(z), out); return out[0] / Math.hypot(out[1], out[2]); };
      const walkFrom = (x, z, off, step) => {
        one.x[0] = x; one.z[0] = z; one.y[0] = 0; one.off[0] = off;
        C.sample(fig, C.cell(x), C.cell(z), out);
        const v = out[0], sx = out[1], sz = out[2], steep = Math.hypot(sx, sz);
        C.stepSand(one, 1, fig, fig, 1, 0, true, step);
        const dx = one.x[0] - x, dz = one.z[0] - z;
        C.sample(fig, C.cell(one.x[0]), C.cell(one.z[0]), out);
        return { far: v / steep - off, moved: Math.hypot(dx, dz), down: -(dx * sx + dz * sz) * Math.sign(v / steep - off) / (Math.hypot(dx, dz) * steep || 1), f: one.f[0], v, now: out[0] };
      };
      // A place well to each side of a line.
      let above = null, below = null;
      for (let i = 0; i < 400 && !(above && below); i++) { const x = 0.05 + 0.9 * ((i * 0.618) % 1), z = 0.05 + 0.9 * ((i * 0.377) % 1), d = farAt(x, z); if (!above && d > 0.14 && d < 0.3) above = [x, z]; if (!below && d < -0.14 && d > -0.3) below = [x, z]; }
      const up = walkFrom(above[0], above[1], 0, 0.01), down = walkFrom(below[0], below[1], 0, 0.01), own = walkFrom(above[0], above[1], 0.03, 0.01), long = walkFrom(above[0], above[1], 0, 0.04);
      ok(up.far > 0.05 && down.far < -0.05 && near(up.moved, 0.005, 1e-5) && near(down.moved, 0.005, 1e-5) && up.down > 0.999 && down.down > 0.999,
        'a grain far from its place walks straight down the slope toward it, at the plate\'s pace, from either side of the line');
      ok(near(own.moved, 0.005, 1e-5) && Math.abs(own.far - (up.far - 0.03)) < 1e-6, 'a grain\'s place is its own: as far from the line as its offset');
      ok(near(long.moved, 0.02, 1e-5) && Math.abs(long.f - long.now) < 0.02 && Math.abs(long.now - long.v) > 0.04, 'after its step a grain keeps the plate\'s value where it now is');
      // The same walk in steps of two lengths: as far along its path, and as near its place at the end.
      const path = (step, secs) => { let p = [above[0], above[1]], length = 0, w = null; for (let i = 0, n = Math.round(secs / step); i < n; i++) { w = walkFrom(p[0], p[1], 0, step); length += w.moved; p = [one.x[0], one.z[0]]; } return { length, left: farAt(p[0], p[1]) }; };
      const coarse = path(1 / 60, 0.1), fine = path(1 / 240, 0.1);
      ok(near(coarse.length, 0.05, 1e-4) && near(fine.length, 0.05, 1e-4), 'far from its place a grain goes as far in a tenth of a second whatever the length of the step');
      // Walk in until the grain is within reach of its place; from there, a twentieth of a second in one step and in
      // twelve: either way the distance left is what dying away at 0.5 / 0.04 a second leaves of it.
      let p = [above[0], above[1]];
      for (let i = 0; i < 400 && !(farAt(p[0], p[1]) < 0.03); i++) { walkFrom(p[0], p[1], 0, 1 / 240); p = [one.x[0], one.z[0]]; }
      const within = farAt(p[0], p[1]);
      walkFrom(p[0], p[1], 0, 0.05);
      const oneStep = farAt(one.x[0], one.z[0]);
      let q = p;
      for (let i = 0; i < 12; i++) { walkFrom(q[0], q[1], 0, 0.05 / 12); q = [one.x[0], one.z[0]]; }
      const twelve = farAt(q[0], q[1]), left = within * Math.exp(-0.625);
      ok(within > 0.02 && within < 0.03 && Math.abs(oneStep - left) < 0.12 * left && Math.abs(twelve - left) < 0.12 * left,
        'within reach of its place the distance left dies away at the same rate whatever the length of the step');
      // In the air: a grain flies on sideways and falls, in the same time whatever the length of the step.
      const fly = (step) => {
        one.x[0] = 0.1; one.z[0] = 0.2; one.y[0] = 1e-4; one.vx[0] = 0.3; one.vy[0] = 1.5; one.vz[0] = -0.2;
        let time = 0, top = 0;
        while (one.y[0] > 0 && time < 2) { C.stepSand(one, 1, fig, fig, 1, 0, false, step); time += step; top = Math.max(top, one.y[0]); }
        return { time, top, x: one.x[0] - 0.1, z: one.z[0] - 0.2 };
      };
      const f60 = fly(1 / 60), f240 = fly(1 / 240);
      ok([f60, f240].every((r) => Math.abs(r.time - 1 / 3) < 0.02 && Math.abs(r.top - 0.125) < 0.015 && Math.abs(r.x - 0.3 * r.time) < 1e-4 && Math.abs(r.z + 0.2 * r.time) < 1e-4),
        'a grain in the air flies on sideways and falls at 9 a second each second, in the same time whatever the length of the step');
    }
    // A jostle is as wide each way as jostle() says, and one way has nothing to do with the other; a grain lying
    // on its line, where the plate hardly moves, hardly ever hops.
    {
      const j = C.createSand(N, 31);
      for (let i = 0; i < 240; i++) C.stepSand(j, N, fig, fig, 1, 0.5, true, h);
      for (let i = 0; i < 180; i++) C.stepSand(j, N, fig, fig, 1, 0.04, true, h);
      const x0 = Float32Array.from(j.x), z0 = Float32Array.from(j.z);
      C.stepSand(j, N, fig, fig, 1, 1, true, h);
      let n = 0, sx = 0, sz = 0, sxx = 0, szz = 0, sxz = 0, up = 0;
      for (let i = 0; i < N; i++) {
        if (j.y[i] > 0) up++;
        if (Math.abs(j.x[i]) === 1 || Math.abs(j.z[i]) === 1) continue;
        const dx = j.x[i] - x0[i], dz = j.z[i] - z0[i];
        n++; sx += dx; sz += dz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz;
      }
      const sdx = Math.sqrt(sxx / n - (sx / n) ** 2), sdz = Math.sqrt(szz / n - (sz / n) ** 2), corr = (sxz / n - (sx / n) * (sz / n)) / (sdx * sdz), want = C.jostle(1, h) / Math.sqrt(12);
      ok(Math.abs(sdx - want) < 0.15 * want && Math.abs(sdz - want) < 0.15 * want && Math.abs(corr) < 0.1, 'a grain is jostled as far each way as the shake says, and one way has nothing to do with the other');
      ok(up / N < 0.03, 'a grain lying on its line, where the plate hardly moves, hardly ever hops');
    }
    // Sand lying where the plate moves hops, more when the plate shakes harder.
    {
      const hop = C.createSand(N, 21), calm = C.createSand(N, 21);
      for (let i = 0; i < 6; i++) { C.stepSand(hop, N, fig, fig, 1, 1, true, h); C.stepSand(calm, N, fig, fig, 1, 0.1, true, h); }
      const hopping = C.measure(hop, N, fig, fig, 1), calmer = C.measure(calm, N, fig, fig, 1);
      ok(hopping.air > 0.03 && hopping.top > 0.01 && hopping.top < 0.2 && calmer.air < hopping.air / 3, 'sand lying where the plate moves hops, more often and higher the harder the plate shakes');
      // A grain that hops goes on through the air as fast as it was walking: the plate's pace, at most.
      const leap = C.createSand(N, 22);
      C.stepSand(leap, N, fig, fig, 1, 1, true, h);
      let fastest = 0, leapt = 0;
      for (let i = 0; i < N; i++) if (leap.y[i] > 0) { leapt++; fastest = Math.max(fastest, Math.hypot(leap.vx[i], leap.vz[i])); }
      ok(leapt > 20 && fastest > 0.98 * C.pace(1) && fastest <= C.pace(1) + 1e-6, 'a grain that hops goes on through the air as fast as it was walking');
    }
    for (let i = 0; i < 240; i++) { C.stepSand(a, N, fig, fig, 1, 0.5, true, h); C.stepSand(b, N, fig, fig, 1, 0.5, true, h); }
    const loud = C.measure(a, N, fig, fig, 1);
    let onPlate = true, finite = true;
    for (let i = 0; i < N; i++) { if (!(Math.abs(a.x[i]) <= 1 && Math.abs(a.z[i]) <= 1 && a.y[i] >= 0)) onPlate = false; if (!Number.isFinite(a.x[i] + a.z[i] + a.y[i])) finite = false; }
    ok(first.settled < 0.3 && loud.settled > 0.75 && loud.spread < first.spread / 4 && onPlate && finite && same(a, b) && a.rng.every((s, i) => s !== seeds0[i]),
      'shaken, the sand gathers on the lines of the figure and stays on the plate; a run is repeatable', JSON.stringify([first, loud]));
    {
      const fine = C.createSand(N, 7);
      for (let i = 0; i < 960; i++) C.stepSand(fine, N, fig, fig, 1, 0.5, true, h / 4);
      const finer = C.measure(fine, N, fig, fig, 1);
      ok(finer.settled > 0.75 && Math.abs(finer.spread - loud.spread) < 0.3 * loud.spread && Math.abs(finer.air - loud.air) < 0.02, 'in steps a quarter as long the sand gathers into the same kind of figure');
    }
    for (let i = 0; i < 120; i++) C.stepSand(a, N, fig, fig, 1, 0.04, true, h);
    const hum = C.measure(a, N, fig, fig, 1);
    ok(hum.settled > 0.93 && hum.spread < loud.spread / 2 && hum.air < 0.01, 'at a hum the sand finishes gathering and the lines are sharp; louder they are fuzzier', JSON.stringify([loud, hum]));
    // Each grain lies at its own place beside the line: how far it is from the line goes with its own offset.
    let sxy = 0, sxx = 0;
    const out = [0, 0, 0];
    for (let i = 0; i < N; i++) { C.sample(fig, C.cell(a.x[i]), C.cell(a.z[i]), out); const d = out[0] / (Math.hypot(out[1], out[2]) + 1e-3); sxy += d * a.off[i]; sxx += a.off[i] * a.off[i]; }
    ok(sxy / sxx > 0.8 && sxy / sxx < 1.2, 'a settled grain lies as far from its line as its own place says, so a line is a band of sand', String(sxy / sxx));

    // Not shaken, nothing on the plate moves (once the few grains in mid-hop have landed).
    for (let i = 0; i < 5; i++) C.stepSand(a, N, fig, fig, 1, 0, false, h);
    const before ={ x: Float32Array.from(a.x), z: Float32Array.from(a.z), y: Float32Array.from(a.y) };
    const seeds = Uint32Array.from(a.rng);
    for (let i = 0; i < 30; i++) C.stepSand(a, N, fig, fig, 1, 0, false, h);
    ok(same(a, before) && a.rng.every((s, i) => s === seeds[i]), 'with the plate still, sand lying on it does not move');

    // A throw.
    C.throwSand(a, N, 1);
    let up = true, vmin = 9, vmax = 0, side = 0, sideX = 0, sideZ = 0;
    for (let i = 0; i < N; i++) { if (!(a.y[i] > 0)) up = false; vmin = Math.min(vmin, a.vy[i]); vmax = Math.max(vmax, a.vy[i]); sideX = Math.max(sideX, Math.abs(a.vx[i])); sideZ = Math.max(sideZ, Math.abs(a.vz[i])); }
    side = Math.max(sideX, sideZ);
    for (let i = 0; i < 6; i++) C.stepSand(a, N, fig, fig, 1, 0, false, h);
    const flying = C.measure(a, N, fig, fig, 1);
    for (let i = 0; i < 40; i++) C.stepSand(a, N, fig, fig, 1, 0, false, h);
    const landed = C.measure(a, N, fig, fig, 1);
    let rest = true;
    for (let i = 0; i < N; i++) if (a.y[i] !== 0 || a.vx[i] !== 0 || a.vy[i] !== 0 || a.vz[i] !== 0) rest = false;
    ok(up && vmin >= 0.75 && vmax <= 2.25 && vmax > 2 && side <= 0.65 && sideX > 0.5 && sideZ > 0.5 && flying.air > 0.95 && flying.top > 0.1 && flying.top < 0.3 && landed.air === 0 && rest && landed.settled < hum.settled - 0.2,
      'a throw sends every grain up and a little sideways; with the plate still they land scattered and lie where they fall', JSON.stringify({ vmin, vmax, side, flying, landed }));
    const half = C.createSand(200, 3);
    C.throwSand(half, 200, 0.5);
    ok(Math.max(...half.vy) <= 1.125 && Math.max(...half.vy) > 1, 'a weaker throw is lower');
    C.throwSand(half, 200, 1);
    ok(Math.max(...half.vy) <= 1.125, 'sand already in the air is not thrown again');

    // The awkward places: a crossing of lines, where there is no slope, and the plate's edge.
    const odd = C.createSand(4, 5);
    odd.x[0] = 0; odd.z[0] = 0; odd.x[1] = 1; odd.z[1] = 1; odd.x[2] = -1; odd.z[2] = 0.3; odd.x[3] = 0.5; odd.z[3] = 0.5;
    for (let i = 0; i < 300; i++) C.stepSand(odd, 4, F[0], F[0], 1, 1.2, true, h);
    ok([0, 1, 2, 3].every((i) => Number.isFinite(odd.x[i] + odd.z[i] + odd.y[i]) && Math.abs(odd.x[i]) <= 1 && Math.abs(odd.z[i]) <= 1 && odd.y[i] >= 0), 'a grain beside a crossing of lines, where the slope is all but nothing, or on the plate\'s edge stays on the plate');

    // The blend: halfway between two figures the sand gathers on neither.
    const mix = C.createSand(N, 11);
    for (let i = 0; i < 240; i++) C.stepSand(mix, N, F[0], F[4], 0.5, 0.5, true, h);
    const onMix = C.measure(mix, N, F[0], F[4], 0.5), onOld = C.measure(mix, N, F[0], F[0], 1), onNew = C.measure(mix, N, F[4], F[4], 1);
    ok(onMix.settled > 0.75 && onOld.settled < 0.5 && onNew.settled < 0.5, 'while the plate changes figure the sand follows the blend of the two', JSON.stringify([onMix.settled, onOld.settled, onNew.settled]));
    // Only the grains drawn are stepped.
    const part = C.createSand(100, 9), kept = Float32Array.from(part.x);
    for (let i = 0; i < 30; i++) C.stepSand(part, 40, fig, fig, 1, 0.8, true, h);
    C.throwSand(part, 40, 1);
    ok(part.x.subarray(40).every((v, i) => v === kept[40 + i]) && !part.x.subarray(0, 40).every((v, i) => v === kept[i]) && part.y.subarray(40).every((v) => v === 0) && part.y.subarray(0, 40).every((v) => v > 0),
      'grains beyond the Density setting are left where they lie, and are not thrown');
  }

  // The plate, and the sand's colour.
  ok(C.bend(1, 0) === 0 && near(C.bend(1, 1 / 16), 0.035) && near(C.bend(0.5, 3 / 16), -0.0175) && C.bend(0, 0.1) === 0, 'the plate bends four times a second, further the harder it shakes');
  ok(C.glow(0, 1) === 0 && near(C.glow(2, 1), 0.1) && near(C.glow(1, 0.5), 0.025) && near(C.glow(0.5, 1), 0.0125) && near(C.glow(2, 3), 0.1) && near(C.glow(-2, 1), 0.1) && C.glow(2, 0) === 0, 'the plate glows where it moves, more the harder it shakes, and not at all on a line');
  ok(near(C.sandBright(0, false), 0.55) && near(C.sandBright(1, false), 0.85) && near(C.sandBright(2, false), 0.85) && near(C.sandBright(1, true), 0.595), 'the sand is brighter the harder the plate shakes, and dimmer in the air');
  {
    const out = [9, 9, 9];
    ok(C.pale(out, [0.2, 0.4, 1]) === out && near(out[0], 0.52) && near(out[1], 0.64) && out[2] === 1, 'the sand is its palette colour, 40% of the way to white');
  }
  ok(C.radius(0, 0) === 0 && near(C.radius(1, 1), 1) && near(C.radius(1, 0), Math.SQRT1_2) && near(C.radius(-0.5, 0.5), 0.5), 'a grain\'s colour goes by how far it is from the middle of the plate, 1 at a corner');
  {
    const centre = (s) => 0.4 + 2.6 * (0.5 + 0.5 * Math.sin(0.08 * s)), toneAt = (s) => { const b = new Float32Array(16); for (let i = 0; i < 16; i++) b[i] = C.idle(i, s); return C.toneOf(b); };
    const quarter = Math.PI / 2 / 0.08;
    ok(near(C.idle(2, 0), Math.exp(-0.09 / 1.5)) && near(C.idle(4, 10), Math.exp(-Math.pow(4 - centre(10), 2) / 1.5)) && [0, 5, 10, 15].every((b) => C.idle(b, 33) >= 0 && C.idle(b, 33) <= 1)
      && Math.abs(toneAt(0) - 0.5) < 0.05 && toneAt(quarter) > 0.95 && toneAt(3 * quarter) < 0.1 && toneAt(quarter / 2) > toneAt(0) && toneAt(quarter / 2) < 0.95 && toneAt(2.5 * quarter) < toneAt(2 * quarter) && toneAt(2.5 * quarter) > 0.05,
      'with the mic off the tone drifts slowly from one end of the figures to the other and back, without stopping at either');
  }
  ok(C.grainSize(1, 1) === 0.085 && near(C.grainSize(4, 1), 0.34) && near(C.grainSize(1, 0.5), 0.0425) && near(C.grainSize(2, 2), 0.34), 'a grain is drawn larger by as much as the picture it is drawn into is larger than the canvas, and by the camera\'s zoom');

  // The three Rotate settings.
  {
    const p = [0, 0, 0], t3 = (x, y, z, rx, ry, rz) => Array.from(C.turn(p, x, y, z, rx, ry, rz)), eq = (a, b) => a.every((v, i) => near(v, b[i], 1e-9));
    ok(eq(t3(1, 2, 3, 0, 0, 0), [1, 2, 3]) && eq(t3(0, 1, 0, 90, 0, 0), [0, 0, 1]) && eq(t3(0, 0, 1, 90, 0, 0), [0, -1, 0]) && eq(t3(1, 0, 0, 0, 90, 0), [0, 0, -1]) && eq(t3(0, 0, 1, 0, 90, 0), [1, 0, 0])
      && eq(t3(1, 0, 0, 0, 0, 90), [0, 1, 0]) && eq(t3(0, 1, 0, 0, 0, 90), [-1, 0, 0]) && eq(t3(1, 2, 3, 360, 360, 360), [1, 2, 3]) && C.turn(p, 1, 0, 0, 0, 0, 0) === p,
      'Rotate X tilts the plate\'s top toward the viewer, Rotate Y spins it in its own plane, Rotate Z rolls it to one side');
    ok(eq(t3(1, 0, 0, 90, 90, 0), [0, 1, 0]) && eq(t3(1, 0, 0, 0, 90, 90), [0, 0, -1]) && eq(t3(0, 1, 0, 90, 0, 90), [-1, 0, 0]), 'the plate spins first, then rolls, then tilts');
    ok(C.PITCH === 44 && C.FOV === 30 && JSON.stringify(C.FRAME) === '{"width":6.8,"height":4.9,"center":[0,-0.38,0]}' && C.AIR === 0.25 && JSON.stringify(C.BOX) === JSON.stringify({ min: [-2.2, -0.09, -2.2], max: [2.2, 0.25, 2.2] }) && globalThis.TimbreScene.FILL === 0.86,
      'the camera looks down at 44 degrees on a frame 6.8 by 4.9, and the plate is kept within 86% of it');
    // Rotate X at 46 turns the plate's face to the camera, which looks down at 44 degrees.
    const up = t3(0, 1, 0, 46, 0, 0);
    ok(near(up[1] * Math.sin(44 * Math.PI / 180) + up[2] * Math.cos(44 * Math.PI / 180), 1), 'Rotate X at 46 turns the plate to face the camera');
    const rest = C.poseFor(0, 0, 0), face = C.poseFor(46, 0, 0), diamond = C.poseFor(46, 45, 0), spun = C.poseFor(0, 45, 0), full = C.poseFor(360, 360, 360);
    ok(rest.scale === 1 && rest.x === 0 && rest.y === 0 && rest.z === 0 && near(full.scale, 1, 1e-9) && Math.abs(full.y) < 1e-9, 'with no rotation the plate is where it was, at full size');
    ok(face.scale < 1 && face.scale > 0.85 && diamond.scale < 0.8 * face.scale && diamond.scale > 0.55 && spun.scale < 1 && spun.scale > 0.6 && near(face.x, 0) && face.y < 0, 'a plate turned so that it would not fit is drawn smaller, and moved to the middle of the frame');
    // The same bounds worked out here from the camera's own place: each of the eight corners as seen from 9.14 away,
    // looking down at 44 degrees.
    {
      const P = 44 * Math.PI / 180, dist = 2.45 / Math.tan(15 * Math.PI / 180), cam = [0, -0.38 + dist * Math.sin(P), dist * Math.cos(P)];
      const seen = (rx, ry, rz, scale, at) => {
        const b = [Infinity, -Infinity, Infinity, -Infinity];
        for (const x of [-2.2, 2.2]) for (const y of [-0.09, 0.25]) for (const z of [-2.2, 2.2]) {
          const c = t3(x, y, z, rx, ry, rz).map((v, i) => v * scale + at[i]), d = [c[0] - cam[0], c[1] - cam[1], c[2] - cam[2]];
          const depth = -(d[1] * Math.sin(P) + d[2] * Math.cos(P)), v = (d[1] * Math.cos(P) - d[2] * Math.sin(P)) * dist / depth, h = d[0] * dist / depth;
          b[0] = Math.min(b[0], v); b[1] = Math.max(b[1], v); b[2] = Math.min(b[2], h); b[3] = Math.max(b[3], h);
        }
        return b;
      };
      const cases = [[0, 0, 0, 1, [0, 0, 0]], [46, 0, 0, 1, [0, 0, 0]], [30, 70, 200, 0.7, [0.3, -0.2, 0.1]], [300, 10, 45, 1, [0, 0.4, -0.3]]];
      ok(cases.every(([rx, ry, rz, scale, at]) => C.bounds(rx, ry, rz, scale, at[0], at[1], at[2]).every((v, i) => near(v, seen(rx, ry, rz, scale, at)[i], 1e-9))),
        'the plate\'s reach on the picture is that of its eight corners, the top ones raised for sand in the air, as the resting camera sees them');
    }
    // Whatever the rotation, the plate as posed is inside its room; left as it was, it often is not.
    const V_ROOM = 2.45 * 0.86, H_ROOM = 3.4 * 0.86;   // 86% of the way to the frame's edge
    let inside = true, smallest = 1, over = 0;
    for (let i = 0; i < 400; i++) {
      const rx = (i * 37) % 360, ry = (i * 101) % 360, rz = (i * 173) % 360, pose = C.poseFor(rx, ry, rz), b = C.bounds(rx, ry, rz, pose.scale, pose.x, pose.y, pose.z), raw = C.bounds(rx, ry, rz, 1, 0, 0, 0);
      if (!(b[0] >= -V_ROOM * 1.04 && b[1] <= V_ROOM * 1.04 && b[2] >= -H_ROOM * 1.04 && b[3] <= H_ROOM * 1.04 && pose.scale <= 1 && pose.scale > 0.5)) inside = false;
      smallest = Math.min(smallest, pose.scale);
      if (raw[0] < -2.45 || raw[1] > 2.45) over++;
    }
    const b0 = C.bounds(0, 0, 0, 1, 0, 0, 0);
    ok(inside && over > 100 && smallest < 0.7 && b0[1] < V_ROOM && b0[0] > -V_ROOM && b0[3] < H_ROOM && near(b0[2], -b0[3]), 'however the plate is turned it stays inside the frame, with room for sand in the air');
    {
      const swayed = C.poseFor(46, 0, 0, 0.28), facing = C.poseFor(46, 0, 0), calm = C.poseFor(46, 45, 0), seen = C.bounds(46, 45, 0, calm.scale, calm.x, calm.y, calm.z, 0.5), K = globalThis.TimbreScene;
      ok(C.SWAY === 0.28 && globalThis.__turnedInFrame(C, 0.56) && swayed.scale < facing.scale && swayed.scale > 0.97 * facing.scale && seen.every((v, i) => v === K.reach(C.BOX, { frame: C.FRAME, fov: C.FOV, pitch: C.PITCH }, 46, 45, 0, calm.scale, calm.x, calm.y, calm.z, 0.5)[i])
        && seen[3] !== C.bounds(46, 45, 0, calm.scale, calm.x, calm.y, calm.z)[3],
        'with a camera that sways the plate is kept in wherever the camera is: turned to face the camera, it is drawn a hair smaller for it');
    }
  }

  // The table.
  ok(T.VIZ_SCENES[T.VIZ_SCENES.indexOf('phosphor') + 1] === 'chladni' && T.VIZ_USES_3D.includes('chladni'), 'chladni is a kit scene, listed after phosphor');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['chladni']) === '{"density":50,"cameraDrift":50,"rotateX":0,"rotateY":0,"rotateZ":0}' && JSON.stringify(T.PER_VIZ_MAX['chladni']) === '{"rotateX":360,"rotateY":360,"rotateZ":360}',
    'chladni knobs: density, camera drift, and three rotations of up to 360 degrees that start at none');
  const turnedPlate = T.sanitizeConfig({ perViz: { 'chladni': { rotateX: 46, rotateY: 400, rotateZ: -5 } } });
  ok(JSON.stringify(turnedPlate.perViz['chladni']) === '{"density":50,"cameraDrift":50,"rotateX":46,"rotateY":360,"rotateZ":0}', 'a rotation is held to 0 to 360');
  const oldPlate = T.sanitizeConfig({ activeViz: 'chladni', perViz: { 'chladni': { density: 80 } } });
  ok(oldPlate.activeViz === 'chladni' && JSON.stringify(oldPlate.perViz['chladni']) === '{"density":80,"cameraDrift":50,"rotateX":0,"rotateY":0,"rotateZ":0}', 'a saved pre-redesign chladni config keeps its density and gains the new defaults');
  ok(!('chladni' in T.VIZ_LABELS), 'chladni keeps the name it is listed by');

  // The files.
  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="chladni.js"');
    order.push(pos > html.indexOf('src="phosphor.js"') && pos > html.indexOf('src="scene-kit.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load chladni.js after the scene kit and phosphor.js and before the factories');
  const factory = await readFile(resolve(__dirname, 'overlay/factories/chladni.js'), 'utf8');
  ok(/VIZ_FACTORIES\['chladni'\] = TimbreScene\.factory\(\(\) => TimbreChladni\.definition\(\)\);/.test(factory) && !/WebGLRenderer/.test(factory) && !/Math\.random/.test(factory), 'the effect is the kit\'s factory around the plate\'s definition, with no renderer of its own');
  ok(!/Math\.random/.test(await readFile(resolve(__dirname, 'overlay/chladni.js'), 'utf8')), 'the sand takes no numbers from Math.random, so a run is repeatable');
}

console.log('\n[19] glass prism');
await import('./overlay/glass-prism.js');
{
  const P = globalThis.TimbreGlassPrism;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  // A vector turned by a quaternion [x, y, z, w].
  const spun = (q, v) => { const [x, y, z, w] = q, [a, b, c] = v, tx = 2 * (y * c - z * b), ty = 2 * (z * a - x * c), tz = 2 * (x * b - y * a); return [a + w * tx + (y * tz - z * ty), b + w * ty + (z * tx - x * tz), c + w * tz + (x * ty - y * tx)]; };
  const same = (a, b, tol = 1e-9) => a.length === b.length && a.every((v, i) => near(v, b[i], tol));
  const long = (v) => Math.hypot(...v);

  ok(P.FACETS === 20 && P.BANDS === 10 && P.R === 1.3 && P.RISE === 20 && P.FALL === 5 && P.FOV === 30 && P.PITCH === 8 && JSON.stringify(P.FRAME) === '{"width":5.2,"height":4.2,"center":[0,0,0]}',
    'the sizes: a crystal of twenty facets, its corners 1.3 from its middle, answering ten bands');
  {
    const count = new Array(10).fill(0);
    for (let f = 0; f < 20; f++) count[P.bandOf(f)]++;
    ok(P.bandOf(0) === 0 && P.bandOf(9) === 9 && P.bandOf(10) === 0 && P.bandOf(17) === 7 && count.every((n) => n === 2), 'a facet answers one band, and each band has two facets');
  }

  // The sound.
  {
    const bins = new Uint8Array(32); bins[0] = 255; bins[1] = 51; bins[9] = 102;
    ok(near(P.loudness(bins, 0, 1), 1) && near(P.loudness(bins, 1, 1), 0.2) && near(P.loudness(bins, 9, 1), 0.4) && near(P.loudness(bins, 1, 2), 0.4) && P.loudness(bins, 9, 3) === 1 && P.loudness(bins, 1, 0) === 0
      && P.loudness(null, 0, 1) === 0 && P.loudness(new Uint8Array(4).fill(255), 9, 1) === 0, 'a band is as loud as its bin, times Gain, up to 1; a band there is no bin for is silent');
  }
  ok(near(P.idle(0, 0), 0.3) && near(P.idle(2, 3), 0.3 + 0.3 * Math.sin(4.6)) && near(P.idle(0, Math.PI / 1.2), 0.6) && P.idle(1, 2) !== P.idle(4, 2) && P.idle(3, 1) !== P.idle(3, 2),
    'with the mic off the bands take turns, each rising and falling between nothing and 0.6');
  ok(P.highOf([1, 1, 1, 1, 1, 0, 0, 0, 0, 0]) === 0 && P.highOf([0, 0, 0, 0, 0, 1, 1, 1, 1, 1]) === 1 && near(P.highOf([0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0]), 0.1) && near(P.highOf([9, 9, 9, 9, 9, 0.2, 0.4, 0, 0, 1]), 0.32),
    'the high end is the mean of the five highest bands');
  ok(P.definition().cooling.length === 3 && P.definition().cooling.every((v) => v === 0.06) && P.LINGER === 0.06, 'the light it leaves behind is gone in a twentieth of a second, all colours alike, so a fast tumble does not smear');
  ok(/uniform float uBright, uScale;/.test(P.FRAG) && /fwidth\(m\) \* uScale/.test(P.FRAG) && /max\(0\.007, 0\.75 \* w\)/.test(P.FRAG), 'a ridge is drawn for the pixels of the page: never thinner than three quarters of one');
  ok(P.settle(0) === 0 && P.settle(9e-5) === 0 && P.settle(1e-4) === 1e-4 && P.settle(0.3) === 0.3 && P.settle(1) === 1, 'a level within a ten-thousandth of nothing is nothing');

  // The colours coming apart.
  ok(near(P.apartOf(0, 0, 50), 0.018) && near(P.apartOf(1, 0, 50), 0.118) && near(P.apartOf(0, 1, 50), 0.098) && near(P.apartOf(0.5, 0.5, 50), 0.108) && near(P.apartOf(1, 1, 100), 0.396) && P.apartOf(1, 1, 0) === 0 && near(P.apartOf(0, 0, 25), 0.009),
    'the colours come apart with the high end and on a beat, and by as much as the Chroma setting says: not at all at 0');
  {
    const at = (c, apart) => Array.from(P.copyAt([0, 0, 0], c, apart));
    ok(same(at(1, 0.1), [1, 0, 0]) && same(at(0, 0.1), [0.9, -0.09, -0.05]) && same(at(2, 0.1), [1.1, 0.09, 0.05]) && same(at(2, 0.4), [1.4, 0.36, 0.2]) && same(at(0, 0), [1, 0, 0]),
      'the middle copy stays put; the first is smaller, rolled one way and moved one way, the third larger and the other way');
  }

  // Light.
  ok(near(P.brightOf(0, 0), 0.26) && near(P.brightOf(1, 0), 0.46) && near(P.brightOf(0, 1), 0.44) && near(P.brightOf(0.5, 1), 0.54), 'the crystal is brighter with the voice and on a beat');
  ok(same(Array.from(P.heartOf([0, 0], 0, 0)), [0.03, 1.8]) && same(Array.from(P.heartOf([0, 0], 1, 0)), [0.13, 2.8]) && same(Array.from(P.heartOf([0, 0], 0, 1)), [0.15, 2.4]) && same(Array.from(P.heartOf([0, 0], 1, 1)), [0.25, 3.4]),
    'the glow inside is faint in silence, and swells and brightens with the voice and on a beat');

  // The tumble.
  ok(near(P.turnRate(0), 0.25) && near(P.turnRate(1), 1.75) && near(P.turnRate(0.4), 0.85), 'it turns a quarter of a radian a second in silence and up to seven times as fast with the voice');
  {
    const a0 = Array.from(P.axisAt([0, 0, 0], 0)), a5 = Array.from(P.axisAt([0, 0, 0], 5)), l5 = Math.hypot(Math.sin(1.05), 1, 0.6 * Math.cos(0.85));
    let unit = true;
    for (let c = 0; c < 60; c += 1.7) if (!near(long(P.axisAt([0, 0, 0], c)), 1)) unit = false;
    ok(unit && same(a0, [0, 1 / Math.hypot(1, 0.6), 0.6 / Math.hypot(1, 0.6)]) && same(a5, [Math.sin(1.05) / l5, 1 / l5, 0.6 * Math.cos(0.85) / l5]), 'the axis it turns about is mostly upright and wanders slowly');
    const k1 = Array.from(P.kickAt([0, 0, 0], 1)), k2 = Array.from(P.kickAt([0, 0, 0], 2)), k1b = Array.from(P.kickAt([9, 9, 9], 1));
    ok(same(k1, [2.2 * Math.cos(2.4), 2.2 * Math.sin(4.08), 2.2 * Math.sin(2.4)]) && same(k2, [2.2 * Math.cos(4.8), 2.2 * Math.sin(8.16), 2.2 * Math.sin(4.8)]) && same(k1, k1b) && Math.abs(k1[0] - k2[0]) > 1,
      'a beat kicks it about an axis taken from a fixed sequence: the same for the same beat, another for the next');
    ok(P.kickAngle(2.2, 0) === 0 && near(P.kickAngle(2.2, 0.1), 2.2 * (1 - Math.exp(-0.25)) / 2.5) && near(P.kickAngle(2.2, 0.1), P.kickAngle(2.2, 0.05) + P.kickAngle(2.2 * Math.exp(-0.125), 0.05)) && near(P.kickAngle(2.2, 100), 0.88) && near(P.kickAngle(1, 0.2), (1 - Math.exp(-0.5)) / 2.5),
      'a kick dies away at 2.5 a second, and the angle it turns in a step is exact: two half steps turn as far as one whole');
  }
  {
    const q = [0, 0, 0, 1], h = Math.SQRT1_2;
    ok(P.turn(q, 0, 1, 0, Math.PI / 2) === q && same(q, [0, h, 0, h]) && same(spun(q, [0, 0, 1]), [1, 0, 0]), 'a turn about the upright axis carries what faced the viewer round to the side');
    P.turn(q, 1, 0, 0, Math.PI / 2);
    ok(same(spun(q, [0, 0, 1]), [1, 0, 0]) && same(spun(q, [0, 1, 0]), [0, 0, 1]) && same(spun(q, [1, 0, 0]), [0, 1, 0]), 'a later turn is about the world\'s axes, not the crystal\'s own');
    const far = [0.3, 0.1, 0.2, 0.9]; { const l = long(far); for (let i = 0; i < 4; i++) far[i] /= l; }
    for (let i = 0; i < 20000; i++) P.turn(far, 0.6, 0, 0.8, 0.37);
    ok(near(long(far), 1, 1e-12) && same(Array.from(P.turn([0, 0, 0, 1], 0, 0, 1, 0)), [0, 0, 0, 1]) && near(long(P.turn([0, 0, 0, 1.5], 0, 1, 0, 0.3)), 1, 1e-12) && same(Array.from(P.turn([0, 0, 0, 1.5], 0, 1, 0, 0.3)), Array.from(P.turn([0, 0, 0, 1], 0, 1, 0, 0.3))),
      'however many turns it has made it is still a turn and nothing else: one that has drifted is brought back');
  }
  {
    // One step with no kick is a turn about the axis at the step's middle.
    const q = [0, 0, 0, 1], spin = [0, 0, 0], ax = P.axisAt([0, 0, 0], 3.2), want = P.turn([0, 0, 0, 1], ax[0], ax[1], ax[2], P.turnRate(0.4) * 0.05);
    ok(P.tumble(q, spin, 3.2, 0.4, 0.05) === q && same(q, want, 1e-12) && spin.every((v) => v === 0), 'with no kick, a step turns it about the wandering axis by its rate times the step');
    // A kick alone: it turns about the kick's own axis by the exact angle, and the kick dies away.
    const kicked = [0, 0, 0, 1], k = P.kickAt([0, 0, 0], 3), k0 = k.slice(), w = long(k0);
    P.tumble(kicked, k, 0, 0, 0.1);
    const only = P.turn(P.turn(P.turn([0, 0, 0, 1], ...P.axisAt([0, 0, 0], 0), 0.0125), k0[0] / w, k0[1] / w, k0[2] / w, P.kickAngle(w, 0.1)), ...P.axisAt([0, 0, 0], 0), 0.0125);
    ok(same(kicked, only, 1e-12) && same(k, k0.map((v) => v * Math.exp(-0.25)), 1e-12), 'a kicked step turns it about the kick\'s axis too, between two halves of its own turn, and the kick is weaker after');
    const dying = [1e-4, 0, 0]; P.tumble([0, 0, 0, 1], dying, 0, 0, 0.1);
    const dead = [0, 0, 0], rest = [0, 0, 0, 1]; P.tumble(rest, dead, 0, 0, 0.1);
    ok(dying.every((v) => v === 0) && dead.every((v) => v === 0) && rest.every(Number.isFinite), 'a kick that has all but died is none');
    // The same two seconds at three frame rates.
    const run = (fps) => { const qq = [0, 0, 0, 1], sp = P.kickAt([0, 0, 0], 1); let clock = 0; for (let i = 0; i < 2 * fps; i++) { clock += 1 / fps; P.tumble(qq, sp, clock - 0.5 / fps, 0.6, 1 / fps); } return qq; };
    const slow = run(30), usual = run(60), fast = run(240), dot = (a, b) => Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
    ok(dot(slow, fast) > 1 - 5e-8 && dot(usual, fast) > 1 - 5e-9 && dot(usual, [0, 0, 0, 1]) < 0.9, 'the same sound gives the same tumble at 30, 60 and 240 frames a second');
  }

  // The pulse: a beat sets the crystal swinging, larger and then smaller, like a spring let go.
  {
    ok(P.PULSE_RATE === 14 && P.PULSE_DAMP === 0.35 && P.PULSE_PUSH === 4 && P.pushOf(50) === 4 && P.pushOf(0) === 0 && P.pushOf(100) === 8 && near(P.pushOf(25), 2),
      'a beat pushes it by as much as the Pulse setting says: not at all at 0, twice as hard at 100');
    const a = 0.35 * 14, wd = 14 * Math.sqrt(1 - 0.35 * 0.35), at = (t) => (4 / wd) * Math.exp(-a * t) * Math.sin(wd * t);
    const one = P.swing([0, 4], 0.1), two = P.swing(P.swing([0, 4], 0.05), 0.05), held = [0.2, 0];
    ok(near(one[0], at(0.1), 1e-12) && same(Array.from(one), Array.from(two), 1e-12) && P.swing([0, 0], 0.1).every((v) => v === 0) && P.swing(held, 0.01) === held && held[0] < 0.2 && held[1] < 0,
      'the swing is exact: a step is where the spring would be, two half steps are one whole, and held out it pulls back');
    // The whole swing after one beat, at 240 steps a second.
    let top = 0, topAt = 0, low = 0, lowAt = 0, restAt = null; const sw = [0, 4];
    for (let i = 1; i <= 240 * 3; i++) { P.swing(sw, 1 / 240); if (sw[0] > top) { top = sw[0]; topAt = i / 240; } if (sw[0] < low) { low = sw[0]; lowAt = i / 240; } if (restAt === null && sw[0] === 0 && sw[1] === 0) restAt = i / 240; }
    ok(top > 0.17 && top < 0.19 && topAt > 0.08 && topAt < 0.11 && low < -0.045 && low > -0.07 && lowAt > 0.3 && lowAt < 0.37 && restAt !== null && restAt > 0.5 && restAt < 2,
      'a beat swells it by about 18% in a tenth of a second, then it shrinks to about 5% under its size, and within two seconds it is at rest');
    // Three quarters of a second on it is still swinging, by a third of a hundredth: it does not stop before it has all but stopped.
    const late = [0, 4]; for (let i = 0; i < 45; i++) P.swing(late, 1 / 60);
    ok(near(late[0], at(0.75), 1e-9) && Math.abs(late[0]) > 0.002, 'the swing goes on until it has all but stopped, not before');
    ok(P.sizeOf(0) === 1 && near(P.sizeOf(0.18), 1.18) && near(P.sizeOf(-0.05), 0.95) && P.sizeOf(-0.9) === 0.7 && P.sizeOf(2) === 1.6 && P.SMALLEST === 0.7 && P.LARGEST === 1.6, 'its size is one and the swing, and never under 0.7 or over 1.6');
    // Beats as fast as the kit gives them (every 13 frames is 217 ms), at Pulse 100, for ten seconds.
    const quick = [0, 0]; let most = 0, least = 0;
    for (let i = 0; i < 600; i++) { if (i % 13 === 0) quick[1] += P.pushOf(100); P.swing(quick, 1 / 60); most = Math.max(most, quick[0]); least = Math.min(least, quick[0]); }
    ok(most > 0.3 && most < 0.45 && least > -0.1 && least <= 0, 'beats as fast as they can come, at Pulse 100, do not take it to either limit');
    const rate = (fps) => { const w = [0, 0]; for (let i = 0; i < 1.2 * fps; i++) { if (i === 0 || i === fps) w[1] += 4; P.swing(w, 1 / fps); } return w; };
    ok(same(rate(30), rate(240), 1e-9) && same(rate(60), rate(240), 1e-9) && Math.abs(rate(60)[0]) > 0.01, 'the same beats give the same swing at 30, 60 and 240 frames a second');
  }

  // The shatter. Twenty facets like the crystal's: each a triangle 1.033 from the middle, facing straight out.
  await import('./overlay/helix.js');
  await import('./overlay/scene-kit.js');
  {
    const HX = globalThis.TimbreHelix, N = 20, home = new Float32Array(N * 9), homeN = new Float32Array(N * 9);
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), ang = 2.39996 * i, n = [r * Math.cos(ang), y, r * Math.sin(ang)];
      const u = [-n[2], 0, n[0]], ul = long(u), uu = u.map((v) => v / ul), w = [n[1] * uu[2] - n[2] * uu[1], n[2] * uu[0] - n[0] * uu[2], n[0] * uu[1] - n[1] * uu[0]];
      for (let v = 0; v < 3; v++) for (let c = 0; c < 3; c++) { home[i * 9 + v * 3 + c] = 1.033 * n[c] + 0.789 * (uu[c] * Math.cos(v * 2.0944) + w[c] * Math.sin(v * 2.0944)); homeN[i * 9 + v * 3 + c] = n[c]; }
    }
    const lay = P.layout(home), at = (arr, i) => [arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]], dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    let laid = lay.centres.length === 60 && lay.normals.length === 60;
    for (let i = 0; i < N; i++) if (!near(long(at(lay.centres, i)), 1.033, 1e-4) || !near(long(at(lay.normals, i)), 1, 1e-9) || !near(dot(at(lay.normals, i), at(homeN, i * 3)), 1, 1e-4)) laid = false;
    ok(laid, 'a facet\'s middle is the mean of its three corners, and it faces straight out from the crystal\'s middle');

    ok(P.SPEED_MIN === 2.4 && P.SPEED_RANGE === 4.6 && P.SCATTER === 0.5 && P.SHARD_SPIN === 9 && P.SLOW_S === 0.38 && P.DRIFT_MIN === 0.05 && P.DRIFT_RANGE === 0.1 && P.DRIFT_SPIN === 0.7 && P.FLY_MAX === 3.2 && P.REBLAST === 0.7 && P.JOSTLE === 0.4 && P.ROOM === 2 && P.ZOOM_BACK === 2 && P.FLASH_S === 0.25,
      'the shatter\'s sizes: how hard a blast pushes, how soon the push dies, how far a facet may go and how much room there is');
    const fresh = P.createShards();
    ok(['off', 'vel', 'drift', 'axis', 'from', 'shown'].every((k) => fresh[k].length === 60 && fresh[k].every((v) => v === 0)) && ['ang', 'spin', 'dspin', 'fromAng', 'turned'].every((k) => fresh[k].length === 20 && fresh[k].every((v) => v === 0)) && fresh.lag.length === 20 && fresh.lag.every((v) => v === 1),
      'the facets start in their places, at rest');

    // A blast.
    const sh = P.createShards(), sh2 = P.createShards();
    P.blast(sh, lay.normals, 1, HX.rng(1001), true, true); P.blast(sh2, lay.normals, 1, HX.rng(1001), true, true);
    let out = true, speeds = true, axes = true, spins = true, drifts = true;
    for (let i = 0; i < N; i++) {
      const v = at(sh.vel, i), d = at(sh.drift, i), sp = long(v);
      if (!(dot(v, at(lay.normals, i)) > 0.4 * sp)) out = false;
      if (!(sp >= 2.4 - 1e-9 && sp <= 7 + 1e-9)) speeds = false;
      if (!near(long(at(sh.axis, i)), 1, 1e-9)) axes = false;
      if (!(Math.abs(sh.spin[i]) <= 4.5 && Math.abs(sh.dspin[i]) <= 0.35)) spins = false;
      if (!(long(d) >= 0.05 - 1e-9 && long(d) <= 0.15 + 1e-9 && near(dot(d, v), long(d) * sp, 1e-9))) drifts = false;
    }
    // Give or take: most are pushed well off straight out, none by more than the scatter allows (30 degrees).
    let off5 = 0, off30 = 0;
    for (let i = 0; i < N; i++) { const v = at(sh.vel, i), cos = dot(v, at(lay.normals, i)) / long(v); if (cos < Math.cos(5 * Math.PI / 180)) off5++; if (cos < Math.cos(30.01 * Math.PI / 180)) off30++; }
    ok(off5 >= 12 && off30 === 0, 'a blast pushes a facet up to 30 degrees off straight out, and most of them well off it');
    {
      // Any way at all: one long, to every side alike.
      const rnd = HX.rng(3), sum = [0, 0, 0], w = [0, 0, 0]; let unit = true, low = 0;
      for (let i = 0; i < 4000; i++) { P.anyWay(w, rnd); if (!near(long(w), 1, 1e-12)) unit = false; if (w[2] < 0) low++; for (let a = 0; a < 3; a++) sum[a] += w[a] / 4000; }
      ok(unit && sum.every((v) => Math.abs(v) < 0.04) && low > 1850 && low < 2150 && P.anyWay(w, rnd) === w, 'a direction taken any way at all is one long and as likely to any side as another');
    }
    const spread = (k) => Math.max(...Array.from(sh[k])) - Math.min(...Array.from(sh[k]));
    const fastest = Math.max(...Array.from({ length: N }, (_, i) => long(at(sh.vel, i)))), slowest = Math.min(...Array.from({ length: N }, (_, i) => long(at(sh.vel, i))));
    ok(out && speeds && axes && spins && drifts && spread('spin') > 4 && fastest - slowest > 2.5 && same(Array.from(sh.vel), Array.from(sh2.vel)) && same(Array.from(sh.axis), Array.from(sh2.axis)) && sh.off.every((v) => v === 0),
      'a blast pushes every facet outward, give or take, at its own speed and with its own spin about its own axis; the same blast is the same again');
    const other = P.createShards(); P.blast(other, lay.normals, 1, HX.rng(1002), true, true);
    const half = P.createShards(); P.blast(half, lay.normals, 0.5, HX.rng(1001), true, true);
    ok(!same(Array.from(other.vel), Array.from(sh.vel), 0.1) && same(Array.from(half.vel), Array.from(sh.vel).map((v) => v / 2), 1e-12) && same(Array.from(half.spin), Array.from(sh.spin).map((v) => v / 2), 1e-12) && same(Array.from(half.drift), Array.from(sh.drift), 1e-12),
      'the next shatter is another; a weaker blast pushes and spins less, and the drift that lasts is the same');

    // Flight.
    const t1 = P.createShards(), t2 = P.createShards();
    for (const s of [t1, t2]) P.blast(s, lay.normals, 1, HX.rng(1001), true, true);
    const v0 = Array.from(t1.vel), d0 = Array.from(t1.drift), w0 = Array.from(t1.spin), dw0 = Array.from(t1.dspin);
    P.fly(t1, 0.2); P.fly(t2, 0.1); P.fly(t2, 0.1);
    const gone = 0.38 * (1 - Math.exp(-0.2 / 0.38));
    ok(same(Array.from(t1.off), v0.map((v, i) => v * gone + d0[i] * 0.2), 1e-12) && same(Array.from(t1.ang), w0.map((v, i) => v * gone + dw0[i] * 0.2), 1e-12) && same(Array.from(t1.vel), v0.map((v) => v * Math.exp(-0.2 / 0.38)), 1e-12)
      && same(Array.from(t1.off), Array.from(t2.off), 1e-12) && same(Array.from(t1.ang), Array.from(t2.ang), 1e-12) && same(Array.from(t1.turned), Array.from(t1.ang)),
      'in flight the push and the spin die away and the drift carries on, exactly: two half steps are one whole');
    let capped = true, shrunk = 0;
    for (let i = 0; i < N; i++) { const o = at(t1.off, i), s = at(t1.shown, i), l = long(o); if (!near(long(s), 3.2 * Math.tanh(l / 3.2), 1e-12) || !near(dot(o, s), l * long(s), 1e-9)) capped = false; if (long(s) < l) shrunk++; }
    for (let i = 0; i < 6000; i++) P.fly(t1, 1 / 60);
    let within = true; for (let i = 0; i < N; i++) if (!(long(at(t1.shown, i)) <= 3.2)) within = false;
    ok(capped && shrunk === N && within && long(at(t1.off, 0)) > 5, 'a facet is shown the way it has flown but never further than 3.2 from its place, however long it drifts');

    // A jostle, and a blast while it is in pieces: its axes stay as they are.
    const j = P.createShards(); P.blast(j, lay.normals, 1, HX.rng(1001), true, true); P.fly(j, 0.5);
    const axis0 = Array.from(j.axis), vel0 = Array.from(j.vel); P.blast(j, lay.normals, 0.4, HX.rng(5), false, false);
    let inward = 0; for (let i = 0; i < N; i++) if (dot([j.vel[i * 3] - vel0[i * 3], j.vel[i * 3 + 1] - vel0[i * 3 + 1], j.vel[i * 3 + 2] - vel0[i * 3 + 2]], at(lay.normals, i)) < 0) inward++;
    // The same jostle on facets at rest: what it adds is the same, whatever they had.
    const bare = P.createShards(); P.blast(bare, lay.normals, 0.4, HX.rng(5), false, false);
    const j2 = P.createShards(); P.blast(j2, lay.normals, 1, HX.rng(1001), true, true); P.fly(j2, 0.5); const spin0 = Array.from(j2.spin); P.blast(j2, lay.normals, 0.4, HX.rng(5), false, false);
    ok(same(Array.from(j.axis), axis0) && inward >= 4 && inward <= 16 && same(Array.from(j.vel), vel0.map((v, i) => v + bare.vel[i]), 1e-12) && same(Array.from(j2.spin), spin0.map((v, i) => v + bare.spin[i]), 1e-12) && Math.max(...spin0.map(Math.abs)) > 0.5
      && same(Array.from(j.drift), Array.from(bare.drift), 1e-12) && same(Array.from(j.dspin), Array.from(bare.dspin), 1e-12) && bare.axis.every((v) => v === 0),
      'a jostle pushes each facet any way at all, on top of the speed and spin it has; the drift that lasts is the jostle\'s own, and its axis stays as it was');

    // A long din: a jostle every 0.7 s for a minute. A facet far out is pushed back in, so they are not all pinned at their limit.
    {
      const din = P.createShards(), rnd = HX.rng(1001); P.blast(din, lay.normals, 1, rnd, true, true);
      let sum = 0, n = 0, furthest = 0;
      for (let k = 0; k < 86; k++) { for (let i = 0; i < 42; i++) P.fly(din, 1 / 60); P.blast(din, lay.normals, 0.4, rnd, false, false);
        if (k >= 40) for (let i = 0; i < N; i++) { sum += long(at(din.shown, i)); n++; furthest = Math.max(furthest, long(at(din.off, i))); } }
      ok(sum / n < 2.7 && sum / n > 1.2 && furthest < 3.2 + 2, 'through a long din the facets stay spread through their room: one far out is pushed back in, not pinned at its limit');
      // Such a push: a facet beyond its limit, jostled, is pushed inward whatever way the jostle was going.
      let inwards = 0;
      for (let seed = 1; seed <= 40; seed++) { const far = P.createShards(); far.off[0] = 4; far.off[3] = 1; P.blast(far, lay.normals, 0.4, HX.rng(seed), false, false); if (far.vel[0] < 0) inwards++; if (far.drift[0] > 0) inwards = -99; }
      let either = 0; for (let seed = 1; seed <= 40; seed++) { const mid = P.createShards(); mid.off[3] = 1; P.blast(mid, lay.normals, 0.4, HX.rng(seed), false, false); if (mid.vel[3] < 0) either++; }
      ok(inwards === 40 && either > 8 && either < 32, 'a facet beyond its limit is jostled back toward its place, and one within it any way at all');
    }

    // The return.
    const r = P.createShards(); P.blast(r, lay.normals, 1, HX.rng(1001), true, true); for (let i = 0; i < 90; i++) P.fly(r, 1 / 60);
    r.ang[0] = 7; r.ang[1] = -3.5; P.fly(r, 0);
    const shown0 = Array.from(r.shown), turned0 = Array.from(r.turned);
    P.startReturn(r, HX.rng(9));
    const short = (v) => v - 2 * Math.PI * Math.round(v / (2 * Math.PI));
    ok(same(Array.from(r.from), shown0) && same(Array.from(r.fromAng), turned0.map(short), 1e-12) && near(r.fromAng[0], 7 - 2 * Math.PI) && near(r.fromAng[1], -3.5 + 2 * Math.PI) && r.vel.every((v) => v === 0) && r.spin.every((v) => v === 0)
      && Array.from(r.lag).every((v) => v >= 0.6 && v <= 1) && Math.max(...r.lag) - Math.min(...r.lag) > 0.2 && P.shortWay(0) === 0 && near(P.shortWay(Math.PI + 0.1), -Math.PI + 0.1),
      'the return starts from where each facet is shown, turning back the short way, each with its own lag');
    P.place(r, 0, HX.returnShare);
    const start = same(Array.from(r.shown), shown0) && same(Array.from(r.turned), Array.from(r.fromAng));
    P.place(r, 0.5, HX.returnShare);
    let part = true; for (let i = 0; i < N; i++) { const e = HX.returnShare(0.5, r.lag[i]).e; if (!same(at(r.shown, i), at(r.from, i).map((v) => v * (1 - e)), 1e-12) || !near(r.turned[i], r.fromAng[i] * (1 - e), 1e-12) || !(e > 0.2 && e < 0.73)) part = false; }
    // A blast while it is coming back: flight takes up from where the return had got to.
    const mid = Array.from(r.shown), midTurn = Array.from(r.turned); P.resume(r); P.fly(r, 0);
    const resumed = same(Array.from(r.shown), mid, 1e-9) && same(Array.from(r.ang), midTurn) && Array.from(r.off).every(Number.isFinite);
    const far = P.createShards(); far.shown[0] = 3.2; P.resume(far);
    P.place(r, 1, HX.returnShare);
    ok(start && part && resumed && Number.isFinite(far.off[0]) && far.off[0] > 10 && r.shown.every((v) => Math.abs(v) < 1e-12) && r.turned.every((v) => Math.abs(v) < 1e-12), 'the return carries each facet home by its share of the way; broken off, the flight takes up where it had got to; at its end every facet is home');
    for (const k of Object.keys(r)) if (k !== 'axis') r[k].fill(0.5);
    P.home(r);
    ok(['off', 'vel', 'drift', 'from', 'shown', 'ang', 'spin', 'dspin', 'fromAng', 'turned'].every((k) => r[k].every((v) => v === 0)) && r.lag.every((v) => v === 1), 'home, the facets are at rest again, whatever they were doing');

    // What is drawn.
    const pos = new Float32Array(N * 9), nor = new Float32Array(N * 9), whole = P.createShards();
    const reach0 = P.shape(pos, nor, home, homeN, lay.centres, whole);
    let most0 = 0; for (let k = 0; k < N * 3; k++) most0 = Math.max(most0, long(at(home, k)));
    ok(same(Array.from(pos), Array.from(home), 1e-6) && same(Array.from(nor), Array.from(homeN), 1e-6) && near(reach0, most0, 1e-6) && near(most0, Math.hypot(1.033, 0.789), 1e-3), 'with every facet home the crystal is drawn as it is, and reaches as far as its corners');
    const m = P.createShards(), o2 = at(lay.normals, 2).map((v) => v * 0.5); m.shown.set(o2, 6); m.axis.set(at(lay.normals, 5), 15); m.turned[5] = Math.PI / 2; m.axis[0] = 0; m.axis[1] = 1; m.axis[2] = 0; m.turned[0] = 1.1;
    const reach1 = P.shape(pos, nor, home, homeN, lay.centres, m);
    let moved = true, turned = true, others = true, furthest = 0;
    for (let k = 0; k < N * 3; k++) furthest = Math.max(furthest, long(at(pos, k)));
    for (let v = 0; v < 3; v++) {
      if (!same(at(pos, 6 + v), at(home, 6 + v).map((x, a) => x + o2[a]), 1e-6) || !same(at(nor, 6 + v), at(homeN, 6 + v), 1e-6)) moved = false;
      // Facet 5 a quarter turn about its own normal: its corners keep their distance from its middle and from one another, and it faces the same way.
      const c = at(lay.centres, 5), p = at(pos, 15 + v), h = at(home, 15 + v), q = at(pos, 15 + ((v + 1) % 3)), rel = p.map((x, a) => x - c[a]), was = h.map((x, a) => x - c[a]);
      if (!near(long(rel), 0.789, 1e-4) || !near(dot(rel, was), 0, 1e-4) || !near(long(p.map((x, a) => x - q[a])), 0.789 * Math.sqrt(3), 1e-4) || !same(at(nor, 15 + v), at(homeN, 15 + v), 1e-5)) turned = false;
      // Facet 0 turned about the upright axis: so is the way it faces, and it is still square to the facet.
      const n0 = at(nor, v), p0 = at(pos, v), p1 = at(pos, (v + 1) % 3), hn = at(homeN, v);
      if (!near(long(n0), 1, 1e-6) || !near(dot(n0, p0.map((x, a) => x - p1[a])), 0, 1e-5) || !near(n0[1], hn[1], 1e-6) || !same([n0[0], n0[2]], [hn[0] * Math.cos(1.1) + hn[2] * Math.sin(1.1), hn[2] * Math.cos(1.1) - hn[0] * Math.sin(1.1)], 1e-6)) turned = false;
    }
    for (let k = 9; k < N * 3; k++) if (k !== 15 && k !== 16 && k !== 17 && !same(at(pos, k), at(home, k), 1e-6)) others = false;
    ok(moved && turned && others && near(reach1, furthest, 1e-6) && reach1 > reach0, 'a facet in flight is drawn whole: moved by how far it has flown and turned about its own middle, the way it faces turned with it; the reach is the furthest corner');

    // Room: nothing is drawn further than 2 from the middle, and the picture takes that at any page shape.
    ok(P.HEAD === 0.2 && P.HEAD_OVER === 0.5 && P.headFor(1.3) === 1 && P.headFor(1) === 1 && near(P.headFor(1.55), 1.1) && near(P.headFor(1.8), 1.2) && near(P.headFor(3.5), 1.2),
      'once it is in pieces, room is kept for a beat to swell it by a fifth: none while it is whole, all of it once the pieces are half a unit out');
    ok(P.roomFor(1.3, 1, 0.118) === 1 && P.roomFor(1.3, 1.18, 0.118) === 1 && near(P.roomFor(1.3, 1, 0.396), 2 / (1.3 * 1.396 + 0.198)) && near(P.roomFor(3, 1.1, 0.1), 2 / (3 * 1.2 * 1.1 + 0.05)) && near(P.roomFor(3, 1.4, 0.1), 2 / (3 * 1.4 * 1.1 + 0.05)) && P.roomFor(0, 1, 0) === 1
      && near(P.roomFor(3, 1.1, 0.1, 1.5), 1.5 / (3 * 1.2 * 1.1 + 0.05)) && P.roomFor(1.3, 1, 0.1, 1.5) === 1 && P.roomFor(3, 1.1, 0.1, 2) === P.roomFor(3, 1.1, 0.1),
      'the crystal is drawn smaller when it would not fit: by just enough that its largest copy stays within 2 of the middle, swollen by a beat or not');
    ok(P.limitFor(1, 0.1) === 2 && P.limitFor(0.5, 0.1) === 2 && near(P.limitFor(1.25, 0.03), 1.6) && near(P.limitFor(1.5, 0.03), 1.3 * 1.03 + 0.015) && near(P.limitFor(2, 0), 1.3) && near(P.limitFor(1, 0.396), 1.3 * 1.396 + 0.198) && P.limitFor(1, 0.396) > 2,
      'the room is less by as much as the Scene Size slider enlarges the picture, but never less than the whole crystal takes with its colours where they are');
    let fits = true;
    for (const aspect of [300 / 220, 1440 / 1080, 1728 / 1080, 1920 / 1080]) {
      const d = globalThis.TimbreScene.fitDistance(P.FRAME.width, P.FRAME.height, P.FOV, aspect), up = Math.tan((P.FOV * Math.PI) / 360), cone = Math.tan(Math.asin(P.ROOM / d));
      if (!(cone < 0.99 * up && cone < 0.99 * up * aspect)) fits = false;
      // And the whole crystal with its colours as far apart as they go, which is a little more.
      if (!(Math.tan(Math.asin(P.limitFor(1, 0.396) / d)) < up)) fits = false;
    }
    ok(fits, 'a ball of that size about the middle is inside the picture on every page, wherever the camera has drifted to');
    ok(P.zoomAfter(1, 0.6, 1 / 60) === 0.6 && near(P.zoomAfter(0.6, 1, 0.5), 0.6 + 0.4 * (1 - Math.exp(-1))) && P.zoomAfter(0.6, 0.8, 100) === 0.8 && P.zoomAfter(0.99995, 1, 1 / 60) === 1 && P.zoomAfter(1, 1, 1 / 60) === 1 && P.zoomAfter(0.9, 0.95, 0) === 0.9
      && near(P.zoomAfter(P.zoomAfter(0.5, 1, 0.1), 1, 0.1), P.zoomAfter(0.5, 1, 0.2), 1e-12), 'it is drawn smaller at once when it must be, and comes back to its size over about a second: exactly, and all the way');

    // A whole shatter, start to end, with the worst the sound can do: nothing is ever drawn outside the room.
    let inside = true, smallest = 1, widest = 0, dipped = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const rnd = HX.rng(1000 + seed), s = P.createShards(), swing = [0, 0], enlarged = seed % 3 === 0 ? 1.4 : 1; let zoom = 1, held = 1;
      P.blast(s, lay.normals, 1, rnd, true, true);
      const step = (returning, u, dt, i) => {
        if (i % 13 === 0) swing[1] += P.pushOf(100);
        P.swing(swing, dt);
        if (returning) P.place(s, u, HX.returnShare); else P.fly(s, dt);
        const reach = P.shape(pos, nor, home, homeN, lay.centres, s), size = P.sizeOf(swing[0]), apart = 0.396;
        // As the scene does: the room with the pulse aside is held, shrinking at once and growing back slowly; the pulse's share is taken as it comes.
        const limit = P.limitFor(enlarged, apart), room = P.roomFor(reach, size, apart, limit);
        held = P.zoomAfter(held, P.roomFor(reach, 1, apart, limit), dt);
        zoom = Math.min(held, room);
        if (zoom * (reach * size * (1 + apart) + 0.5 * apart) > limit + 1e-9 || limit > 2.02) inside = false;
        if (zoom < held) dipped++;
        smallest = Math.min(smallest, zoom); widest = Math.max(widest, reach);
      };
      for (let i = 0; i < 240; i++) { if (i === 60) P.blast(s, lay.normals, 0.4, rnd, false, false); if (i === 150) P.blast(s, lay.normals, 0.7, rnd, true, false); step(false, 0, 1 / 60, i); }
      P.startReturn(s, rnd);
      for (let i = 0; i <= 90; i++) step(true, i / 90, 1 / 60, i);
    }
    ok(inside && dipped > 50 && smallest < 0.35 && smallest > 0.15 && widest > 3.5 && widest < 1.033 + 3.2 + 0.789 + 1e-6, 'through a whole shatter with jostles, beats and the colours as far apart as they go, nothing is ever drawn outside the room');
  }

  // Light.
  ok(near(P.brightOf(0, 0, 1), 0.51) && near(P.brightOf(0.5, 1, 0.4), 0.64) && P.brightOf(0.3, 0.2) === P.brightOf(0.3, 0.2, 0) && same(Array.from(P.heartOf([0, 0], 0, 0, 1)), [0.28, 2.3]) && same(Array.from(P.heartOf([0, 0], 1, 1, 1)), [0.5, 3.9]) && same(Array.from(P.heartOf([0, 0], 1, 1)), [0.25, 3.4]),
    'a shatter is a flash: the crystal and the glow inside are brighter for a moment, and the glow larger');

  // The table.
  ok(T.VIZ_SCENES.indexOf('glass-prism') > T.VIZ_SCENES.indexOf('chladni') && T.VIZ_USES_3D.includes('glass-prism'), 'glass-prism is a kit scene, listed after chladni');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['glass-prism']) === '{"chroma":50,"pulse":50,"shatterSensitivity":50,"reconnectSeconds":3,"cameraDrift":50}' && JSON.stringify(T.PER_VIZ_MAX['glass-prism']) === '{"reconnectSeconds":10}',
    'glass-prism knobs: chroma, pulse, shatter sensitivity and camera drift, 0 to 100, and reconnect seconds, 0 to 10');
  const oldPrism = T.sanitizeConfig({ activeViz: 'glass-prism', perViz: { 'glass-prism': { chroma: 80 } } });
  ok(oldPrism.activeViz === 'glass-prism' && JSON.stringify(oldPrism.perViz['glass-prism']) === '{"chroma":80,"pulse":50,"shatterSensitivity":50,"reconnectSeconds":3,"cameraDrift":50}', 'a saved pre-redesign glass-prism config keeps its chroma and gains the new defaults');
  {
    const c = T.sanitizeConfig({ perViz: { 'glass-prism': { pulse: 250, shatterSensitivity: -4, reconnectSeconds: 99 } } }).perViz['glass-prism'];
    ok(c.pulse === 100 && c.shatterSensitivity === 0 && c.reconnectSeconds === 10, 'glass-prism knobs clamp: pulse to 100, sensitivity to 0, reconnect to 10');
  }
  ok(!('glass-prism' in T.VIZ_LABELS), 'glass-prism keeps the name it is listed by');

  // The files.
  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="glass-prism.js"');
    order.push(pos > html.indexOf('src="chladni.js"') && pos > html.indexOf('src="scene-kit.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load glass-prism.js after the scene kit and chladni.js and before the factories');
  const factory = await readFile(resolve(__dirname, 'overlay/factories/glass-prism.js'), 'utf8');
  ok(/VIZ_FACTORIES\['glass-prism'\] = TimbreScene\.factory\(\(\) => TimbreGlassPrism\.definition\(\)\);/.test(factory) && !/WebGLRenderer/.test(factory), 'the effect is the kit\'s factory around the crystal\'s definition, with no renderer of its own');
  ok(!/Math\.random/.test(await readFile(resolve(__dirname, 'overlay/glass-prism.js'), 'utf8')), 'the crystal takes no numbers from Math.random, so a run is repeatable');
}

console.log('\n[18] metaball');
await import('./overlay/metaball.js');
{
  const M = globalThis.TimbreMetaball;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const D = M.DROPS;

  ok(M.DROPS === 8 && M.REACH === 1.6 && M.ROOM === 0.16 && M.SKIN === 1.02 && M.SKIN * Math.cos(Math.PI / 24) * Math.cos(Math.PI / 32) > 1 && M.CORE === 0.74 && M.SMOOTH === 0.42 && M.RISE === 12 && M.FALL === 2.2 && M.FOV === 30 && M.PITCH === 12 && JSON.stringify(M.FRAME) === '{"width":5.2,"height":4.8,"center":[0,0,0]}' && !('BOUND' in M),
    'the sizes: a ball 0.74 in radius with eight droplets that reach 1.6 from its middle, joined over 0.42, in a frame 4.8 tall');
  ok(M.definition().cooling.length === 3 && M.definition().cooling.every((v) => v === Infinity), 'light that lingers keeps its colour');
  ok(M.ease(0) === 0 && M.ease(1) === 1 && near(M.ease(0.5), 0.5) && near(M.ease(0.25), 0.15625) && M.ease(-3) === 0 && M.ease(7) === 1, 'a band is eased: slow to leave and slow to arrive');

  // Where a droplet leaves the ball.
  {
    const dirs = [];
    for (let b = 0; b < D; b++) dirs.push(Array.from(M.direction([0, 0, 0], b)));
    const sum = dirs.reduce((s, d) => [s[0] + d[0], s[1] + d[1], s[2] + d[2]], [0, 0, 0]);
    let closest = 9;
    for (let a = 0; a < D; a++) for (let b = a + 1; b < D; b++) closest = Math.min(closest, Math.hypot(dirs[a][0] - dirs[b][0], dirs[a][1] - dirs[b][1], dirs[a][2] - dirs[b][2]));
    const flat = (y) => Math.hypot(Math.sqrt(1 - y * y), 0.75 * y);
    ok(dirs.every((d) => near(Math.hypot(d[0], d[1], d[2]), 1)) && near(dirs[0][1], 0.75 * 0.875 / flat(0.875)) && near(dirs[7][1], -dirs[0][1]) && Math.hypot(sum[0], sum[1], sum[2]) < 0.6 && closest > 0.55
      && near(dirs[1][0], Math.cos(2.39996) * Math.sqrt(1 - 0.625 * 0.625) / flat(0.625)),
      'the eight droplets leave the ball in eight ways spread evenly round it, the lowest band near the top and the eighth near the bottom');
    ok(M.swing(0, 0) === 0 && near(M.swing(2, 0), 0.3 * Math.sin(2)) && near(M.swing(3, 10), 2.2 + 0.3 * Math.sin(10)) && M.swing(1, 5) !== M.swing(2, 5), 'they turn slowly round the ball, each a little ahead of or behind the rest');
  }

  // How far a droplet goes and how large it is.
  ok(M.reach(0, 0) === 0 && near(M.reach(1, 0), 1.6) && near(M.reach(0.5, 0), 0.8) && near(M.reach(1, 1), 1.888) && near(M.reach(0.25, 0), 0.25) && M.reach(0, 1) === 0 && near(M.reach(3, 0), 1.6),
    'a droplet goes as far from the middle as its band is loud, eased, up to 1.6; a beat throws it 18% further');
  ok(near(M.dropSize(0, 1), 0.44) && near(M.dropSize(7, 1), 0.23) && near(M.dropSize(0, 0), 0.242) && near(M.dropSize(3, 0.5), 0.35 * 0.775) && near(M.dropSize(3, 0.25), 0.35 * (0.55 + 0.45 * 0.15625)) && M.dropSize(2, 1) > M.dropSize(5, 1), 'low bands are large drops and high bands small ones; a droplet still inside the ball is 55% of its size');
  {
    const out = new Float32Array(8), p = (b, band, kick, clock, at = 0) => { out.fill(NaN); M.dropAt(out, at, b, band, kick, clock); return Array.from(out.subarray(at, at + 4)); };
    const d0 = M.direction([0, 0, 0], 3), still = p(3, 1, 0, 0), a = M.swing(3, 0);
    const want = [(d0[0] * Math.cos(a) + d0[2] * Math.sin(a)) * 1.6, d0[1] * 1.6 + 0.06 * Math.sin(6.3), (-d0[0] * Math.sin(a) + d0[2] * Math.cos(a)) * 1.6, 0.35];
    ok(still.every((v, i) => near(v, want[i], 1e-6)) && p(3, 0, 0, 0).slice(0, 3).every((v) => v === 0) && near(p(3, 0, 0, 0)[3], 0.35 * 0.55, 1e-6),
      'a droplet is out along its own way, turned round the ball by its swing, bobbing a little; with its band silent it is at the middle');
    const later = p(3, 1, 0, 5), kicked = p(3, 1, 1, 0), second = p(5, 0.7, 0, 2, 4);
    ok(near(Math.hypot(later[0], later[2]), Math.hypot(still[0], still[2]), 1e-5) && Math.abs(later[0] - still[0]) > 0.1 && near(Math.hypot(kicked[0], kicked[2]), 1.18 * Math.hypot(still[0], still[2]), 1e-5) && near(kicked[3], 0.35, 1e-6)
      && Number.isNaN(out[0]) && Number.isFinite(second[0]) && near(second[3], M.dropSize(5, 0.7), 1e-6), 'as time passes it goes round the ball at the same distance; a beat throws it further; it is written where it is asked for');
    const core = Array.from(M.coreAt(new Float32Array(4), 0, 0, 0, 0)), loud = Array.from(M.coreAt(new Float32Array(4), 0, 1, 1, 2));
    ok(core[0] === 0 && core[1] === 0 && core[2] === 0 && near(core[3], 0.74, 1e-6) && near(loud[3], 0.91, 1e-6) && near(loud[1], 0.04 * Math.sin(2.6), 1e-6) && loud[0] === 0,
      'the ball sits in the middle, bobbing a hair; loudness swells it by up to 0.1 and a beat by 0.07 more');
  }

  // The smooth union, and the surface it makes.
  ok(M.smin(1, 2, 0.42) === 1 && M.smin(2, 1, 0.42) === 1 && near(M.smin(0.3, 0.3, 0.42), 0.3 - 0.105) && near(M.smin(0.3, 0.5, 0.42), M.smin(0.5, 0.3, 0.42)) && M.smin(0.3, 0.5, 0.42) < 0.3 && M.smin(0.3, 0.5, 0.42) > 0.2,
    'two surfaces further apart than 0.42 leave each other alone; nearer, they flow together');
  {
    const balls = new Float32Array(36);
    const set = (bands, flame = 0, kick = 0, clock = 0) => { M.coreAt(balls, 0, flame, kick, clock); for (let b = 0; b < D; b++) M.dropAt(balls, 4 + b * 4, b, bands[b], kick, clock); };
    const none = new Array(D).fill(0), all = new Array(D).fill(1);
    // With every band silent the surface is the ball alone: round, 0.74 out, whichever way one looks.
    set(none);
    let round = true;
    for (let i = 0; i < 40; i++) { const a = i * 1.7, y = Math.sin(i * 0.9), r = Math.sqrt(1 - y * y), p = [Math.cos(a) * r, y, Math.sin(a) * r]; if (Math.abs(M.field(p[0] * 0.74, p[1] * 0.74, p[2] * 0.74, balls)) > 1e-6 || !near(M.field(p[0] * 2, p[1] * 2, p[2] * 2, balls), 1.26, 1e-6)) round = false; }
    ok(round && near(M.field(0, 0, 0, balls), -0.74, 1e-6), 'with every band silent the droplets are inside the ball and the surface is the ball alone, round');
    // One droplet at three distances: along the line from the middle to the droplet's own middle.
    const along = (b, band) => { const bands = none.slice(); bands[b] = band; set(bands); const c = balls.subarray(4 + b * 4, 8 + b * 4), far = Math.hypot(c[0], c[1], c[2]); let worst = -9, at = 0; for (let s = 0; s <= 200; s++) { const u = s / 200, v = M.field(c[0] * u, c[1] * u, c[2] * u, balls); if (v > worst) { worst = v; at = u * far; } } return { worst, at, far, own: M.field(c[0], c[1], c[2], balls), size: c[3] }; };
    const bulge = along(2, 0.45), neck = along(2, 0.65), apart = along(2, 1), small = along(7, 1), large = along(0, 1);
    ok(bulge.worst < -0.2 && bulge.far > 0.4, 'a droplet partly out is a bulge on the ball: metal all the way from the middle to it');
    ok(neck.worst < 0 && neck.worst > -0.15 && neck.at > 0.74 && neck.at < neck.far - neck.size, 'further out it is joined to the ball by a neck, thinnest between them');
    ok(apart.worst > 0.05 && apart.own < 0 && small.worst > 0.15 && small.own < 0 && large.worst > 0.05 && large.own < 0 && near(apart.far, 1.6, 0.07) && near(large.far, 1.6, 0.07), 'right out it has pinched off, the largest droplet too: there is a gap between it and the ball');
    // The surface goes with the ball as it bobs.
    set(none, 0, 0, 1.2);
    const bob = 0.04 * Math.sin(1.56);
    ok(near(M.field(0, bob + 0.74, 0, balls), 0, 1e-6) && near(M.field(0, bob - 0.74, 0, balls), 0, 1e-6) && near(M.field(0.74, bob, 0, balls), 0, 1e-6) && bob > 0.03, 'the surface goes with the ball as it bobs');
    // Where the ball and a droplet are as near as each other, the surface is a quarter of 0.42 nearer than either.
    {
      const bands = none.slice(); bands[2] = 1; set(bands);
      const c = balls.subarray(12, 16), away = Math.hypot(c[0], c[1], c[2]), u = (away + 0.74 - c[3]) / (2 * away), each = (away - 0.74 - c[3]) / 2;
      ok(near(M.field(c[0] * u, c[1] * u, c[2] * u, balls), each - 0.105, 1e-6) && each > 0.2, 'midway between the ball and a droplet that has pinched off, the surface is a quarter of 0.42 nearer than either');
    }
    // The sphere the surface is drawn on: no larger than it has to be.
    set(none);
    ok(near(M.boundOf(balls), 0.9, 1e-6), 'in a pause the sphere the surface is drawn on is only a little larger than the ball');
    set([0, 0, 0, 0, 0, 0, 0, 1]);
    ok(near(M.boundOf(balls), Math.hypot(balls[32], balls[33], balls[34]) + balls[35] + 0.16, 1e-9) && M.boundOf(balls) > 1.9, 'the smallest droplet, alone and right out, is inside it too');
    {
      let inside = true, most = 0, least = 9;
      for (let n = 0; n < 60; n++) {
        const bands = none.map((_, b) => (n < 3 ? [0, 0.5, 1][n] : ((n * 7 + b * 13) % 11) / 10));
        set(bands, (n % 5) / 4, (n % 3) / 2, n * 0.37);
        const R = M.boundOf(balls);
        let furthest = 0;
        for (let i = 0; i < 9; i++) furthest = Math.max(furthest, Math.hypot(balls[i * 4], balls[i * 4 + 1], balls[i * 4 + 2]) + balls[i * 4 + 3]);
        if (!near(R, furthest + 0.16, 1e-9)) inside = false;
        most = Math.max(most, R);
        for (let i = 0; i < 80; i++) { const a = i * 2.39996, y = 1 - (2 * (i + 0.5)) / 80, r = Math.sqrt(1 - y * y), v = M.field(Math.cos(a) * r * R, y * R, Math.sin(a) * r * R, balls); least = Math.min(least, v); }
      }
      ok(inside && least > 0.04 && most > 2.3 && most < 2.7, 'it is 0.16 past the furthest reach of the ball or any droplet, and however they stand the surface is inside it with room for its soft edge');
    }
    // With every band full, on a beat, at any camera drift: nothing reaches the top or bottom of the picture.
    {
      const p = M.PITCH * Math.PI / 180, half = Math.tan(M.FOV * Math.PI / 360), d = M.FRAME.height / 2 / half;
      let highest = 0;
      for (const o of [-0.76, 0, 0.76]) {
        const cam = [d * Math.sin(o) * Math.cos(p), d * Math.sin(p), d * Math.cos(o) * Math.cos(p)], f = cam.map((v) => -v / d);
        const side = [f[2] / Math.hypot(f[0], f[2]), 0, -f[0] / Math.hypot(f[0], f[2])], up = [f[1] * side[2] - f[2] * side[1], f[2] * side[0] - f[0] * side[2], f[0] * side[1] - f[1] * side[0]];
        for (let clock = 0; clock < 40; clock += 0.1) {
          set(all, 1, 1, clock);
          for (let i = 0; i < 9; i++) {
            const v = [balls[i * 4] - cam[0], balls[i * 4 + 1] - cam[1], balls[i * 4 + 2] - cam[2]], el = Math.atan2(v[0] * up[0] + v[1] * up[1] + v[2] * up[2], v[0] * f[0] + v[1] * f[1] + v[2] * f[2]), wide = Math.asin(balls[i * 4 + 3] / Math.hypot(...v));
            highest = Math.max(highest, Math.abs(Math.tan(el + wide)) / half, Math.abs(Math.tan(el - wide)) / half);
          }
        }
      }
      ok(highest < 0.94 && highest > 0.85, 'with every band full, on a beat, at any camera drift, nothing reaches the top or bottom of the picture');
    }
  }

  // Light, the edge, and the bands.
  ok(M.glowOf(0, 0) === 0 && near(M.glowOf(1, 0), 0.25) && near(M.glowOf(0.4, 1), 0.6), 'the metal glows with the voice, and more on a beat');
  ok(M.settle(0) === 0 && M.settle(9e-5) === 0 && M.settle(1e-4) === 1e-4 && M.settle(0.3) === 0.3 && M.settle(1) === 1, 'a level within a ten-thousandth of nothing is nothing');
  ok(near(M.pixelOf(624, 1), (2 * Math.tan(15 * Math.PI / 180) / 624) * 1.5) && near(M.pixelOf(520, 1), M.pixelOf(1040, 1) * 2) && near(M.pixelOf(624, 2), M.pixelOf(624, 1) / 2) && M.pixelOf(0, 1) === M.pixelOf(1, 1),
    'the soft edge is a pixel and a half wide: narrower in a taller picture, and with the camera zoomed in');
  {
    const bins = new Uint8Array(32); bins[0] = 255; bins[1] = 51; bins[7] = 102;
    ok(near(M.loudness(bins, 0, 1), 1) && near(M.loudness(bins, 1, 1), 0.2) && near(M.loudness(bins, 7, 1), 0.4) && near(M.loudness(bins, 1, 2), 0.4) && M.loudness(bins, 7, 3) === 1 && M.loudness(bins, 1, 0) === 0
      && M.loudness(null, 3, 1) === 0 && M.loudness(new Uint8Array(0), 3, 1) === 0 && M.loudness(bins, 40, 1) === 0, 'a band is as loud as its bin, times Gain, held to 1; nothing with no bins or a band past the last bin');
  }
  ok(near(M.idle(2, 3), Math.max(0, 0.34 + 0.34 * Math.sin(1.5 + 3.8))) && near(M.idle(6, 3), 0.6 * Math.max(0, 0.34 + 0.34 * Math.sin(1.5 + 11.4))) && [0, 1, 2, 3, 4, 5, 6, 7].every((b) => M.idle(b, 11.3) >= 0 && M.idle(b, 11.3) <= 1)
    && Math.abs(M.idle(1, 0) - M.idle(1, 3)) > 0.05, 'with the mic off the bands follow a slow pattern, the higher ones weaker');
  ok(typeof M.FRAG === 'string' && M.FRAG.includes('uBall[9]') && M.FRAG.includes('0.42') && M.FRAG.includes('i < 9') && M.FRAG.includes('i < 128') && M.FRAG.includes('uBound') && typeof M.VERT === 'string' && !/gl_FragDepth/.test(M.FRAG),
    'the shader joins the ball and its eight droplets with the same smooth union');

  // The table.
  ok(T.VIZ_SCENES.indexOf('metaball') > T.VIZ_SCENES.indexOf('chladni') && T.VIZ_USES_3D.includes('metaball'), 'metaball is a kit scene, listed after chladni');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['metaball']) === '{"chrome":50,"cameraDrift":50}', 'metaball knobs: chrome and camera drift');
  const oldBlob = T.sanitizeConfig({ activeViz: 'metaball', perViz: { 'metaball': { chrome: 80 } } });
  ok(oldBlob.activeViz === 'metaball' && JSON.stringify(oldBlob.perViz['metaball']) === '{"chrome":80,"cameraDrift":50}', 'a saved pre-redesign metaball config keeps its chrome and gains the new default');
  ok(!('metaball' in T.VIZ_LABELS), 'metaball keeps the name it is listed by');

  // The files.
  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="metaball.js"');
    order.push(pos > html.indexOf('src="chladni.js"') && pos > html.indexOf('src="scene-kit.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load metaball.js after the scene kit and chladni.js and before the factories');
  const factory = await readFile(resolve(__dirname, 'overlay/factories/metaball.js'), 'utf8');
  ok(/VIZ_FACTORIES\['metaball'\] = TimbreScene\.factory\(\(\) => TimbreMetaball\.definition\(\)\);/.test(factory) && !/WebGLRenderer/.test(factory), 'the effect is the kit\'s factory around the metaball\'s definition, with no renderer of its own');
}

console.log('\n[20] ink');
await import('./overlay/ink.js');
{
  const K = globalThis.TimbreInk;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const same = (a, b, tol = 1e-9) => a.length === b.length && a.every((v, i) => near(v, b[i], tol));
  const long = (v) => Math.hypot(...v);
  const at = (arr, i) => [arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]];

  ok(K.BANDS === 8 && K.W === 3.3 && K.H === 2.7 && K.D === 1.5 && near(K.TOP, 1.13) && near(K.FLOOR, -1.3) && near(K.WALL_X, 1.59) && near(K.WALL_Z, 0.69) && K.LIFE === 8.5 && K.POUR === 1300 && K.QUIET === 0.08
    && K.RISE === 14 && K.FALL === 4 && K.STREAM === 0.05 && K.TWIST === 1.6 && K.TWIST_FALL === 1.6 && K.SINK_FALL === 0.75 && K.STEPS_MAX === 6 && K.FOV === 30 && K.PITCH === 14 && JSON.stringify(K.FRAME) === '{"width":5,"height":4.2,"center":[0,-0.25,0]}' && K.GLASS_GAIN === 3 && K.BUDGET === 0.97,
    'the sizes: a tank 3.3 across, 2.7 tall and 1.5 deep, eight bands, ink that lasts eight and a half seconds');
  ok(K.speckCount(0) === 6000 && K.speckCount(50) === 18000 && K.speckCount(100) === 30000 && K.speckCount(-5) === 6000 && K.speckCount(400) === 30000 && K.speckCount(undefined) === 18000 && K.speckCount(12.345) === 8963 && Number.isInteger(K.speckCount(33.3))
    && K.SPECKS_MIN === 6000 && K.SPECKS_MAX === 30000 && near(K.shareOf(18000), 0.6) && K.shareOf(30000) === 1 && near(K.shareOf(6000), 0.2), 'Density gives 6,000 to 30,000 specks, and their share of the most');

  // The sound.
  {
    const bins = new Uint8Array(32); bins[0] = 255; bins[1] = 51; bins[7] = 102;
    ok(near(K.loudness(bins, 0, 1), 1) && near(K.loudness(bins, 1, 1), 0.2) && near(K.loudness(bins, 7, 1), 0.4) && near(K.loudness(bins, 1, 2), 0.4) && K.loudness(bins, 7, 3) === 1 && K.loudness(bins, 1, 0) === 0
      && K.loudness(null, 0, 1) === 0 && K.loudness(new Uint8Array(4).fill(255), 7, 1) === 0, 'a band is as loud as its bin, times Gain, up to 1; a band there is no bin for is silent');
  }
  {
    let pouring = 0, most = 0, least = 9, turns = new Set();
    for (let t = 0; t < 120; t += 0.25) for (let b = 0; b < 8; b++) { const v = K.idle(b, t); if (v > 0.08) { pouring++; turns.add(b); } most = Math.max(most, v); least = Math.min(least, v); }
    ok(least === 0 && most > 0.5 && most <= 0.55 && turns.size === 8 && pouring > 0.1 * 480 * 8 && pouring < 0.4 * 480 * 8 && near(K.idle(1, 1), 0.05 + 0.5 * Math.sin(2.75)) && K.idle(3, 5) === 0 && near(K.idle(0, 2), Math.max(0, 0.05 + 0.5 * Math.sin(0.9)) * (Math.sin(0.46) > 0.2 ? 1 : 0)),
      'with the mic off the bands take turns to pour a little: each of them some of the time, none of them most of it');
  }
  ok(K.settle(0) === 0 && K.settle(9e-5) === 0 && K.settle(1e-4) === 1e-4 && K.settle(0.3) === 0.3, 'a level within a ten-thousandth of nothing is nothing');

  // Where a band pours, how much, and how strong the water is.
  {
    const p0 = Array.from(K.placeOf([0, 0], 0, 0)), p7 = Array.from(K.placeOf([0, 0], 7, 0)), p3 = Array.from(K.placeOf([0, 0], 3, 10));
    let inOrder = true, inside = true;
    for (let c = 0; c < 200; c += 1.3) { let lastX = -9; for (let b = 0; b < 8; b++) { const p = K.placeOf([0, 0], b, c); if (!(p[0] > lastX + 0.15)) inOrder = false; lastX = p[0]; if (!(Math.abs(p[0]) < K.WALL_X - 0.4 && Math.abs(p[1]) < K.WALL_Z - 0.45)) inside = false; } }
    ok(same(p0, [-1.24 + 0.5 * 0.31, 0.05]) && same(p7, [-1.24 + 7.5 * 0.31 + 0.07 * Math.sin(11.9), 0.12 * Math.sin(14.7) + 0.05 * Math.cos(7)]) && same(p3, [-1.24 + 3.5 * 0.31 + 0.07 * Math.sin(3.1 + 5.1), 0.12 * Math.sin(6.3) + 0.05 * Math.cos(2.7 + 3)])
      && inOrder && inside, 'each band pours at its own place along the top, low bands at one end and high at the other, wandering a little and well inside the glass');
  }
  ok(K.pourRate(0, 1) === 0 && K.pourRate(0.079, 1) === 0 && near(K.pourRate(0.08, 1), 1300 * 0.08 * Math.sqrt(0.08)) && near(K.pourRate(1, 1), 1300) && near(K.pourRate(1, 0.6), 780) && near(K.pourRate(0.25, 0.2), 1300 * 0.2 * 0.125),
    'a band pours more the louder it is, nothing when it is all but silent, and by the share of specks there are');
  {
    const most = 0.97 * 18000 / 8.5;
    ok(K.pourShare(0, 18000) === 1 && K.pourShare(most, 18000) === 1 && K.pourShare(1000, 18000) === 1 && near(K.pourShare(2 * most, 18000), 0.5) && near(K.pourShare(2 * most, 6000), 1 / 6) && near(K.pourShare(8 * K.pourRate(1, 0.6), 18000) * 8 * K.pourRate(1, 0.6), most),
      'when the bands together would pour more than the specks there are can hold for their whole lives, each pours its share of what they can');
    // Every band full for twenty-five seconds: no speck is poured over while it is still in the water, and the ink lives its whole life.
    const count = 6000, ink = K.createInk(count, K.SEED), share = K.shareOf(count), owed = new Float32Array(8); let clock = 0, over = 0, oldest = 0, fullest = 0;
    for (let f = 0; f < 60 * 25; f++) { const h = 1 / 60; clock += h; const rate = K.pourRate(1, share), k = K.pourShare(8 * rate, count);
      for (let b = 0; b < 8; b++) { owed[b] += rate * k * h; while (owed[b] >= 1) { owed[b] -= 1; if (ink.age[ink.next] <= K.LIFE) over++; K.pour(ink, count, b, 1, clock, [1, 0.5, 0.25]); } }
      const left = K.stepInk(ink, count, h, clock, K.strengthOf(1, 50), 0); fullest = Math.max(fullest, left);
      if (f > 600) for (let i = 0; i < count; i += 7) if (ink.age[i] <= K.LIFE && ink.age[i] > oldest) oldest = ink.age[i]; }
    ok(over === 0 && oldest > 8.3 && fullest > 0.93 * count && fullest <= count, 'with every band full, no speck is poured over while it is still in the water, and the ink lives its whole life (' + over + ' poured over, the oldest ' + oldest.toFixed(2) + ' s)');
  }
  ok(near(K.strengthOf(0, 50), 0.1) && near(K.strengthOf(1, 50), 0.65) && near(K.strengthOf(0.4, 100), 0.64) && K.strengthOf(1, 0) === 0, 'the currents are slow in silence, stronger with the voice, and as strong as Swirl says: none at 0');
  ok(near(K.glassOf(50, 0, 0), 0.5) && near(K.glassOf(50, 1, 1), 1.1) && near(K.glassOf(100, 0, 0), 1) && K.glassOf(0, 1, 1) === 0 && near(K.surfaceOf(50, 0, 0), 0.5) && near(K.surfaceOf(50, 1, 1), 1.3) && K.surfaceOf(0, 1, 1) === 0 && near(K.surfaceOf(25, 0.5, 0), 0.325),
    'the glass and the water\'s surface are brighter with the voice and on a beat, and as bright as Glass says: not drawn at all at 0');

  // The current.
  {
    const c = Array.from(K.current([0, 0, 0], 0.3, -0.4, 0.2, 2, 0.5)), tt = 0.7;
    const want = [0.5 * (Math.sin(1.9 * -0.4 + tt) * Math.cos(2.3 * 0.2 - 0.7 * tt) + 0.5 * Math.sin(3.7 * 0.2 + 1.3 * tt + 1)), 0.5 * 0.55 * (Math.sin(1.6 * 0.2 + 0.8 * tt) * Math.cos(2.1 * 0.3 + 0.5 * tt) + 0.5 * Math.sin(3.3 * 0.3 - 1.1 * tt)),
      0.5 * 0.8 * (Math.sin(2.0 * 0.3 - 0.6 * tt) * Math.cos(1.7 * -0.4 + 0.9 * tt) + 0.5 * Math.sin(3.9 * -0.4 + 0.7 * tt + 2))];
    // Each part does not change along its own direction, so the water neither gathers nor thins.
    let own = true, moves = false, bounded = true;
    for (let n = 0; n < 60; n++) { const x = Math.sin(n) * 1.5, y = Math.cos(1.7 * n) * 1.2, z = Math.sin(2.3 * n) * 0.6, a = Array.from(K.current([0, 0, 0], x, y, z, n * 0.37, 0.4));
      if (K.current([0, 0, 0], x + 0.3, y, z, n * 0.37, 0.4)[0] !== a[0] || K.current([0, 0, 0], x, y + 0.3, z, n * 0.37, 0.4)[1] !== a[1] || K.current([0, 0, 0], x, y, z + 0.3, n * 0.37, 0.4)[2] !== a[2]) own = false;
      if (K.current([0, 0, 0], x, y, z, n * 0.37 + 3, 0.4)[0] !== a[0]) moves = true;
      if (!(Math.abs(a[0]) <= 0.6 + 1e-9 && Math.abs(a[1]) <= 0.33 + 1e-9 && Math.abs(a[2]) <= 0.48 + 1e-9)) bounded = false; }
    ok(same(c, want, 1e-12) && own && moves && bounded && K.current([0, 0, 0], 0.3, -0.4, 0.2, 2, 0).every((v) => v === 0) && same(Array.from(K.current([0, 0, 0], 0.3, -0.4, 0.2, 2, 1)), want.map((v) => v * 2), 1e-12),
      'the current is worked out from where and when: no part of it changes along its own direction, it shifts with time, and it is as strong as it is told');
    // The ink reads the current from tables made once a step, not by working nine sines out for every speck: the same current, to a ten-thousandth.
    {
      const tab = K.tabulate(new Float32Array(9 * (K.TAB + 1)), 3.7); let worst = 0, own2 = true;
      for (let n = 0; n < 400; n++) { const x = (n % 2 ? 1 : -1) * 1.59 * Math.abs(Math.sin(n * 1.3)), y = -1.3 + 2.43 * Math.abs(Math.sin(n * 0.7)), z = 0.69 * Math.sin(n * 2.9), a = K.current([0, 0, 0], x, y, z, 3.7, 0.8), b = K.flow([0, 0, 0], tab, x, y, z, 0.8);
        for (let i = 0; i < 3; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
        if (K.flow([0, 0, 0], tab, x, Math.min(1.13, y + 0.01), z, 0.8)[1] !== b[1]) own2 = false; }
      const corner = Array.from(K.flow([0, 0, 0], tab, 1.59, 1.13, 0.69, 0.8)), exact = Array.from(K.current([0, 0, 0], 1.59, 1.13, 0.69, 3.7, 0.8)), beyond = Array.from(K.flow([0, 0, 0], tab, 9, 9, 9, 0.8));
      const later = K.tabulate(new Float32Array(9 * (K.TAB + 1)), 9), moved = K.flow([0, 0, 0], later, 0.3, -0.4, 0.2, 0.8)[0] !== K.flow([0, 0, 0], tab, 0.3, -0.4, 0.2, 0.8)[0];
      ok(K.TAB === 512 && worst < 1e-4 && own2 && same(corner, exact, 1e-4) && same(beyond, corner) && moved && K.flow([0, 0, 0], tab, 0.3, -0.4, 0.2, 0).every((v) => v === 0), 'read from its tables the current is the same to a ten-thousandth, everywhere in the tank and at its glass (' + worst.toExponential(1) + ' at most)');
    }
    const mid = Array.from(K.nearGlass([0, 0, 0], 0, 0, 0)), wall = Array.from(K.nearGlass([0, 0, 0], 1.59, -1.3, -0.69)), part = Array.from(K.nearGlass([0, 0, 0], 1.59 - 0.175, 1.13 - 0.125, 0.69 - 0.15)), low = Array.from(K.nearGlass([0, 0, 0], 0, -1.3 + 0.15, 0));
    ok(same(mid, [1, 1, 1]) && same(wall, [0.05, 0.05, 0.05]) && same(part, [0.5, 0.5, 0.5], 1e-9) && same(low, [1, 0.5, 1], 1e-9) && same(Array.from(K.nearGlass([0, 0, 0], -9, 9, 9)), [0.05, 0.05, 0.05]),
      'the current dies away toward the glass, the floor and the surface, to a twentieth of itself');
  }
  {
    const open = Array.from(K.fromGlass([0, 0, 0], 0.4, 0.1, -0.2)), atGlass = Array.from(K.fromGlass([0, 0, 0], 1.59, -1.3, -0.69)), part = Array.from(K.fromGlass([0, 0, 0], -(1.59 - 0.175), 1.13 - 0.125, 0.69 - 0.15)), past = Array.from(K.fromGlass([0, 0, 0], 9, 9, 9));
    ok(K.GLASS_PUSH === 0.25 && same(open, [0, 0, 0]) && same(atGlass, [-0.25, 0.25, 0.25]) && same(part, [0.0625, -0.0625, -0.0625], 1e-9) && same(past, [-0.25, -0.25, -0.25]) && same(Array.from(K.fromGlass([0, 0, 0], 0, 0, 0)), [0, 0, 0])
      && same(Array.from(K.fromGlass([0, 0, 0], 0, -1.3 + 0.15, 0)), [0, 0.0625, 0], 1e-9),
      'the glass, the floor and the surface turn ink back: not at all in open water, more the nearer it is, a quarter of a unit a second at the glass itself');
    // A long noisy run: every band pouring, a beat twice a second. The ink does not gather at the glass or in the tank's upright edges.
    const noisy = (swirl, every, first, secs) => { const count = 6000, ink = K.createInk(count, K.SEED), share = K.shareOf(count), owed = new Float32Array(8), rate = new Float32Array(8); let clock = 0, whirl = 0, beats = 0, edge = 0, glass = 0, floor = 0, nearSide = 0, n = 0;
      for (let f = 0; f < 60 * secs; f++) { const h = 1 / 60; clock += h; if (every && f % every === first) whirl = K.twistOf(whirl, ++beats); whirl = K.whirlAfter(whirl, h);
        let total = 0; for (let b = 0; b < 8; b++) { rate[b] = K.pourRate(0.35 + 0.3 * Math.sin(0.7 * clock + b), share); total += rate[b]; }
        const k = K.pourShare(total, count);
        for (let b = 0; b < 8; b++) { owed[b] += rate[b] * k * h; while (owed[b] >= 1) { owed[b] -= 1; K.pour(ink, count, b, 0.35 + 0.3 * Math.sin(0.7 * clock + b), clock, [1, 0.5, 0.25]); } }
        K.stepInk(ink, count, h, clock, K.strengthOf(0.6, swirl), whirl);
        if (f % 60 === 59 && f > 300) { let alive = 0, e = 0, g = 0, fl = 0, sd = 0; for (let i = 0; i < count; i++) { if (ink.age[i] > K.LIFE) continue; alive++; const x = Math.abs(ink.pos[i * 3]), z = Math.abs(ink.pos[i * 3 + 2]);
          if (x > K.WALL_X - 0.12 && z > K.WALL_Z - 0.12) e++; if (x > K.WALL_X - 0.02 || z > K.WALL_Z - 0.02) g++; if (ink.pos[i * 3 + 1] < K.FLOOR + 0.02) fl++; if (x > K.WALL_X - 0.4) sd++; }
          edge = Math.max(edge, e / alive); glass = Math.max(glass, g / alive); floor = Math.max(floor, fl / alive); nearSide += sd / alive; n++; } }
      return { edge, glass, floor, nearSide: nearSide / n }; };
    // (Swirl; a beat every so many frames, the first at which; seconds.) The upright edges are 1.3% of the tank, and the quarter of it nearest its ends 25%.
    const runs = [[50, 30, 0, 30], [50, 30, 7, 30], [50, 30, 0, 60], [75, 30, 0, 30], [100, 30, 0, 30], [100, 0, 0, 30], [0, 30, 0, 30]].map((r) => noisy(...r));
    ok(runs.every((r) => r.edge < 0.04 && r.glass < 0.03 && r.floor < 0.03) && runs.slice(0, 6).every((r) => r.nearSide > 0.06), 'through long noisy runs, at every strength of current and timing of the beat, the ink does not gather on the glass, in the upright edges of the tank or on its floor, nor is it kept from the ends of the tank ('
      + runs.map((r) => (100 * r.edge).toFixed(1) + '/' + (100 * r.glass).toFixed(1) + '/' + (100 * r.floor).toFixed(1) + '/' + (100 * r.nearSide).toFixed(0)).join(' ') + ')');
  }
  ok(K.twistOf(0, 1) === 1.6 && K.twistOf(0, 2) === -1.6 && near(K.twistOf(0.5, 3), 2.1) && near(K.twistOf(0.5, 4), -1.1) && near(K.whirlAfter(1.6, 0.5), 1.6 * Math.exp(-0.8)) && near(K.whirlAfter(K.whirlAfter(1.6, 0.25), 0.25), K.whirlAfter(1.6, 0.5), 1e-12)
    && K.whirlAfter(9e-5, 0.01) === 0 && K.whirlAfter(-9e-5, 0.01) === 0 && K.whirlAfter(-1, 0.1) < 0, 'a beat twists the tank one way and the next the other; the twist dies away, exactly, and all but none is none');
  ok(K.stepsFor(1 / 60) === 1 && K.stepsFor(1 / 30) === 2 && K.stepsFor(1 / 144) === 1 && K.stepsFor(0.05) === 3 && K.stepsFor(1) === 6 && K.stepsFor(0) === 1 && K.stepsFor(0.02) === 2 && K.stepsFor(0.0168) === 2, 'the ink moves in steps no longer than a sixtieth of a second, six at most in a frame');

  // The ink.
  const red = [1, 0.5, 0.25];
  {
    const ink = K.createInk(100, 7);
    ok(ink.pos.length === 300 && ink.vel.length === 300 && ink.tint.length === 300 && ink.age.length === 100 && ink.size.length === 100 && ink.band.length === 100 && ink.next === 0 && ink.poured === 0 && Array.from(ink.age).every((v) => v > K.LIFE)
      && K.measure(ink, 100).alive === 0, 'a new tank has no ink in it');
    K.pour(ink, 100, 2, 0.5, 3, red);
    const p = at(ink.pos, 0), v = at(ink.vel, 0), place = K.placeOf([0, 0], 2, 3), r = Math.hypot(p[0] - place[0], p[2] - place[1]);
    ok(ink.next === 1 && ink.poured === 1 && ink.age[0] === 0 && ink.band[0] === 2 && r <= 0.05 * (0.6 + 0.45) + 1e-6 && p[1] <= K.TOP && p[1] >= K.TOP - 0.02 - 1e-6 && v[1] < 0 && ink.size[0] >= 0.04 && ink.size[0] <= 0.075 + 1e-6
      && ink.tint[0] <= 1 && ink.tint[0] >= 0.78 - 1e-6 && near(ink.tint[1] / ink.tint[0], 0.5, 1e-5) && near(ink.tint[2] / ink.tint[0], 0.25, 1e-5) && K.measure(ink, 100).alive === 1 && same(K.measure(ink, 100).sum, p, 1e-6),
      'a speck is poured just under the surface at its band\'s place, sinking, in the colour it is given, a little uneven in shade');
    // Many: the middle of the stream sinks fastest, and its edge moves outward.
    const many = K.createInk(4000, 7), again = K.createInk(4000, 7), other = K.createInk(4000, 8);
    for (let i = 0; i < 4000; i++) { K.pour(many, 4000, 4, 1, 0, red); K.pour(again, 4000, 4, 1, 0, red); K.pour(other, 4000, 4, 1, 0, red); }
    const mp = K.placeOf([0, 0], 4, 0);
    let fastMid = 0, nMid = 0, fastEdge = 0, nEdge = 0, outward = true, widest = 0, sx = 0, sz = 0, sizes = [9, 0], shades = [9, 0], inner = 0, slowEdge = 9;
    for (let i = 0; i < 4000; i++) { const q = at(many.pos, i), w = at(many.vel, i), dx = q[0] - mp[0], dz = q[2] - mp[1], rr = Math.hypot(dx, dz); widest = Math.max(widest, rr); sx += dx / 4000; sz += dz / 4000;
      if (rr < 0.02) { fastMid += -w[1]; nMid++; } else if (rr > 0.06) { fastEdge += -w[1]; nEdge++; slowEdge = Math.min(slowEdge, (w[0] * dx + w[2] * dz) / rr); }
      if (rr < 0.0375) inner++;
      if (rr > 1e-4 && !(w[0] * dx + w[2] * dz >= -1e-9)) outward = false;
      sizes = [Math.min(sizes[0], many.size[i]), Math.max(sizes[1], many.size[i])]; shades = [Math.min(shades[0], many.tint[i * 3]), Math.max(shades[1], many.tint[i * 3])]; }
    ok(inner > 0.2 * 4000 && inner < 0.3 * 4000 && slowEdge > 0.12 && nMid > 100 && nEdge > 100 && fastMid / nMid > 1.6 && fastMid / nMid <= 1.8 + 1e-6 && fastEdge / nEdge < 0.75 * fastMid / nMid && outward && widest <= 0.075 + 1e-6 && widest > 0.07 && Math.abs(sx) < 0.004 && Math.abs(sz) < 0.004
      && sizes[0] < 0.045 && sizes[1] > 0.07 && shades[0] < 0.82 && shades[1] > 0.96 && same(Array.from(many.pos), Array.from(again.pos)) && !same(Array.from(many.pos), Array.from(other.pos), 0.01),
      'in a stream the middle sinks fastest and the edge lags and moves outward; the same pour is the same again, and another seed another');
    // A quiet band's stream is thinner and slower.
    const thin = K.createInk(2000, 7); for (let i = 0; i < 2000; i++) K.pour(thin, 2000, 4, 0.1, 0, red);
    let thinWide = 0, thinFast = 0; for (let i = 0; i < 2000; i++) { const q = at(thin.pos, i); thinWide = Math.max(thinWide, Math.hypot(q[0] - mp[0], q[2] - mp[1])); thinFast = Math.max(thinFast, -thin.vel[i * 3 + 1]); }
    ok(thinWide <= 0.05 * 0.69 + 1e-6 && thinWide > 0.03 && thinFast <= 0.63 + 1e-6 && thinFast > 0.55, 'a quiet band pours a thinner, slower stream');
    // The ring: once every speck is in use, the oldest is poured over.
    const ring = K.createInk(10, 7); for (let i = 0; i < 13; i++) K.pour(ring, 10, i % 8, 0.5, 0, red);
    ok(ring.next === 3 && ring.poured === 13 && Array.from(ring.band).join() === '2,3,4,3,4,5,6,7,0,1', 'when every speck is in the water, the oldest is poured over');
  }

  // A step.
  {
    // Still water (Swirl 0, no twist): a speck sinks by its own speed, which dies away, and nothing else moves it.
    const ink = K.createInk(1, 7); K.pour(ink, 1, 3, 0.5, 0, red);
    ink.pos[1] = 0.5; const p0 = at(ink.pos, 0), v0 = at(ink.vel, 0), left = K.stepInk(ink, 1, 0.01, 0, 0, 0), keep = Math.exp(-0.0075), n = K.nearGlass([0, 0, 0], ...p0);
    ok(left === 1 && near(ink.age[0], 0.01, 1e-7) && same(at(ink.vel, 0), v0.map((v) => v * keep), 1e-6) && same(at(ink.pos, 0), [p0[0] + v0[0] * keep * 0.01, Math.min(K.TOP - 0.01, p0[1] + (v0[1] * keep - 0.03 * n[1]) * 0.01), p0[2] + v0[2] * keep * 0.01], 1e-6),
      'in still water a speck sinks by its own speed, which dies away, and settles very slowly besides');
    // With a current: it is carried by it, less near the glass.
    const two = K.createInk(2, 7); K.pour(two, 2, 3, 0.5, 0, red); K.pour(two, 2, 3, 0.5, 0, red);
    two.pos.set([0.2, 0.1, 0.1, 0.2, 0.1, 0.1]); two.vel.fill(0);
    const c = K.current([0, 0, 0], 0.2, 0.1, 0.1, 5, 0.4);
    K.stepInk(two, 2, 0.01, 5, 0.4, 0);
    ok(same(at(two.pos, 0), [0.2 + c[0] * 0.01, 0.1 + (c[1] - 0.03) * 0.01, 0.1 + c[2] * 0.01], 3e-6) && same(at(two.pos, 0), at(two.pos, 1)), 'the current carries a speck; two in one place go the same way');
    // Near the glass: the current is weaker there, and the glass turns the ink back, harder in a stronger current.
    const ng = K.createInk(1, 7); K.pour(ng, 1, 3, 0.5, 0, red); ng.pos.set([1.59 - 0.175, 0.2, 0.1]); ng.vel.fill(0);
    const cg = Array.from(K.current([0, 0, 0], 1.59 - 0.175, 0.2, 0.1, 5, 0.4));
    K.stepInk(ng, 1, 0.01, 5, 0.4, 0);
    ok(same(at(ng.pos, 0), [1.59 - 0.175 + (cg[0] * 0.5 - 0.0625 * (1 + 3 * 0.4)) * 0.01, 0.2 + (cg[1] - 0.03) * 0.01, 0.1 + cg[2] * 0.01], 3e-6), 'near the glass the current is weaker and the glass turns the ink back, harder the stronger the current');
    // Near the floor: the ink's settling dies away as the current does, and the floor turns it back.
    const nf = K.createInk(1, 7); K.pour(nf, 1, 3, 0.5, 0, red); nf.pos.set([0.2, -1.3 + 0.15, 0.1]); nf.vel.fill(0);
    K.stepInk(nf, 1, 0.01, 5, 0, 0);
    ok(same(at(nf.pos, 0), [0.2, -1.3 + 0.15 + (-0.03 * 0.5 + 0.0625) * 0.01, 0.1], 1e-6), 'near the floor ink settles more slowly, and the floor turns it back');
    // And in a current: the floor turns it back harder, as the glass does.
    const nf2 = K.createInk(1, 7); K.pour(nf2, 1, 3, 0.5, 0, red); nf2.pos.set([0.2, -1.3 + 0.15, 0.1]); nf2.vel.fill(0);
    const cf = Array.from(K.current([0, 0, 0], 0.2, -1.3 + 0.15, 0.1, 5, 0.4));
    K.stepInk(nf2, 1, 0.01, 5, 0.4, 0);
    ok(same(at(nf2.pos, 0), [0.2 + cf[0] * 0.01, -1.3 + 0.15 + ((cf[1] - 0.03) * 0.5 + 0.0625 * (1 + 3 * 0.4)) * 0.01, 0.1 + cf[2] * 0.01], 3e-6), 'in a current the floor turns ink back harder, as the glass does');
    // A twist turns the tank about its upright axis.
    const tw = K.createInk(1, 7); K.pour(tw, 1, 3, 0.5, 0, red); tw.pos.set([0.5, 0, 0.2]); tw.vel.fill(0);
    K.stepInk(tw, 1, 0.01, 0, 0, 1.6);
    ok(same(at(tw.pos, 0), [0.5 - 1.6 * 0.2 * 0.9 * 0.01, 0 - 0.03 * 0.01, 0.2 + 1.6 * 0.5 * 0.4 * 0.01], 1e-6), 'a twist carries the ink round the tank\'s upright axis');
    // The floor turns sinking ink outward; the glass and the surface hold it in.
    const fl = K.createInk(1, 7); K.pour(fl, 1, 3, 0.5, 0, red); fl.pos.set([0.3, K.FLOOR + 0.001, 0.1]); fl.vel.set([0.3, -1, 0.4]);
    K.stepInk(fl, 1, 0.01, 0, 0, 0);
    const k2 = Math.exp(-0.0075);
    ok(near(fl.pos[1], K.FLOOR, 1e-6) && fl.vel[1] === 0 && near(fl.vel[0], 0.3 * k2, 1e-6) && near(fl.vel[2], 0.4 * k2, 1e-6), 'ink that reaches the floor stops sinking and stays above it');
    const held = K.createInk(3, 7); for (let i = 0; i < 3; i++) K.pour(held, 3, 3, 0.5, 0, red);
    held.pos.set([1.58, 0, 0, 0, 1.12, 0.68, -1.58, -1.29, -0.68]); held.vel.set([5, 0, 0, 0, 5, 5, -5, -5, -5]);
    for (let i = 0; i < 30; i++) K.stepInk(held, 3, 1 / 60, i / 60, 0.65, 3);
    const box = K.measure(held, 3).box;
    ok(box[0] >= -K.WALL_X - 1e-6 && box[1] <= K.WALL_X + 1e-6 && box[2] >= K.FLOOR - 1e-6 && box[3] <= K.TOP - 0.01 + 1e-6 && box[4] >= -K.WALL_Z - 1e-6 && box[5] <= K.WALL_Z + 1e-6 && near(held.pos[0], K.WALL_X, 1e-6), 'the glass, the floor and the surface hold the ink in, however hard it is thrown');
    // It lasts LIFE seconds and no longer.
    const old = K.createInk(2, 7); K.pour(old, 2, 1, 0.5, 0, red); K.pour(old, 2, 1, 0.5, 0, red); old.age[0] = 8.49; old.age[1] = 8.4;
    const leftNow = K.stepInk(old, 2, 0.02, 0, 0.3, 0), posGone = at(old.pos, 0), ageGone = old.age[0];
    K.stepInk(old, 2, 0.02, 0, 0.3, 0);
    ok(leftNow === 1 && old.age[0] > K.LIFE && old.age[0] === ageGone && same(at(old.pos, 0), posGone) && K.measure(old, 2).alive === 1, 'a speck is gone after eight and a half seconds, and moves no more');
  }

  // How a speck is drawn.
  {
    const all = K.lookFor([0, 0], 1), fifth = K.lookFor([0, 0], 0.2);
    ok(same(Array.from(all), [1.5, 0.15]) && same(Array.from(fifth), [1.5 * Math.pow(0.2, -0.3), Math.min(0.5, 0.15 / Math.sqrt(0.2))]) && K.lookFor([0, 0], 0.01)[1] === 0.5, 'with fewer specks each is larger and covers more, up to half');
    const young = Array.from(K.lookOf([0, 0], 0.05, 0.05, all)), half = Array.from(K.lookOf([0, 0], 4.25, 0.05, all)), end = Array.from(K.lookOf([0, 0], 8.5, 0.05, all)), gone = Array.from(K.lookOf([0, 0], 8.6, 0.05, all)), few = Array.from(K.lookOf([0, 0], 4.25, 0.05, fifth)), faint = Array.from(K.lookOf([0, 0], 8.2, 0.05, all));
    ok(near(young[0], 0.075 * (1 + 3.2 * 0.05 / 8.5)) && near(young[1], 0.15 * 0.3 * Math.pow(1 - 0.05 / 8.5, 1.5) / (0.6 + 0.4 * (1 + 3.2 * 0.05 / 8.5))) && near(half[0], 0.075 * 2.6) && near(half[1], 0.15 * Math.pow(0.5, 1.5) / (0.6 + 0.4 * 2.6))
      && end[0] === 0 && end[1] === 0 && gone[0] === 0 && gone[1] === 0 && Number.isFinite(gone[1]) && near(few[0], half[0] * Math.pow(0.2, -0.3)) && near(few[1], Math.min(0.5, 0.15 / Math.sqrt(0.2)) * Math.pow(0.5, 1.5) / (0.6 + 0.4 * 2.6))
      && faint[0] === 0 && faint[1] === 0 && K.lookOf([0, 0], 7, 0.05, all)[1] > 0.002 && K.lookOf([0, 0], 7, 0.05, all)[0] > 0.2, 'a speck fades in, spreads and thins with age, and is nothing once it is gone or too thin to see');
    ok(near(K.pxOf(624, 1), 624 / (2 * Math.tan(15 * Math.PI / 180))) && near(K.pxOf(624, 0.5), 0.5 * K.pxOf(624, 1)) && near(K.pxOf(1248, 2), 4 * K.pxOf(624, 1)), 'a unit, one unit from the camera, is as many pixels as the picture\'s height and the camera\'s zoom make it');
    ok(near(K.litOf(K.FLOOR), 0.72) && near(K.litOf(K.TOP), 1.12) && near(K.litOf((K.TOP + K.FLOOR) / 2), 0.92), 'ink near the surface is in more light than ink at the floor');
  }

  // A whole run: a band pours for two seconds, at 30 and at 60 frames a second, and the water is left to clear.
  {
    const run = (fps, secs, swirl) => { const count = 18000, ink = K.createInk(count, K.SEED), share = K.shareOf(count); let clock = 0, owed = 0, whirl = 0, step = 0;
      for (let f = 0; f < secs * fps; f++) { const dt = 1 / fps, steps = K.stepsFor(dt), h = dt / steps;
        if (f === fps) whirl = K.twistOf(whirl, 1);
        for (let s2 = 0; s2 < steps; s2++) { const lvl = step++ < 120 ? 0.8 : 0; clock += h; whirl = K.whirlAfter(whirl, h); owed += K.pourRate(lvl, share) * h; while (owed >= 1) { owed -= 1; K.pour(ink, count, 2, lvl, clock, red); } K.stepInk(ink, count, h, clock, K.strengthOf(0.5, swirl), whirl); } }
      return { ink, m: K.measure(ink, count) }; };
    const a30 = run(30, 4, 50), a60 = run(60, 4, 50), straight = run(60, 4, 0), cleared = run(60, 11, 50);
    const want = Math.floor(K.pourRate(0.8, 0.6) * 2);
    ok(Math.abs(a60.ink.poured - want) <= 2 && a30.ink.poured === a60.ink.poured && a60.m.alive === a60.ink.poured && a60.m.perBand[2] === a60.m.alive && a60.m.perBand[3] === 0 && same(Array.from(a30.ink.pos), Array.from(a60.ink.pos), 1e-4),
      'the same sound pours the same ink to the same places at 30 and at 60 frames a second');
    const place = K.placeOf([0, 0], 2, 1);
    ok(a60.m.box[2] < 0 && a60.m.box[3] <= K.TOP && a60.m.box[1] - a60.m.box[0] > straight.m.box[1] - straight.m.box[0] + 0.15 && straight.m.box[1] - straight.m.box[0] < 0.9 && Math.abs(straight.m.meanX[2] - place[0]) < 0.2 && Math.abs(a60.m.meanX[2] - straight.m.meanX[2]) > 0.02
      && a60.m.box[0] >= -K.WALL_X && a60.m.box[1] <= K.WALL_X && a60.m.box[4] >= -K.WALL_Z && a60.m.box[5] <= K.WALL_Z, 'the ink sinks from its band\'s place; the currents carry and spread it, and with Swirl at 0 it sinks straight');
    ok(cleared.m.alive === 0 && cleared.ink.poured === a60.ink.poured, 'left alone for eight and a half seconds, the water is clear again');
  }

  // The shaders.
  ok(/gl_PointSize = max\(1\.0, look\.x \* uPx \/ -mv\.z\);/.test(K.INK_VERT) && /if \(a <= 0\.002\) discard;/.test(K.INK_FRAG) && /exp\(-3\.0 \* r \* r\) \* \(1\.0 - smoothstep\(0\.75, 1\.0, r\)\)/.test(K.INK_FRAG) && /fwidth\(m\)/.test(K.GLASS_FRAG) && /uRing\[4\]/.test(K.SURFACE_FRAG),
    'a speck is drawn as a soft disc sized for the picture; the glass has edges of an even width; the surface carries four rings');

  // What the kit is told.
  {
    const def = K.definition();
    ok(JSON.stringify(def.frame) === JSON.stringify(K.FRAME) && def.frame.center !== K.FRAME.center && def.fov === 30 && def.pitch === 14 && def.cooling.length === 3 && def.cooling.every((v) => v === 0.08) && typeof def.build === 'function' && typeof def.update === 'function',
      'the kit is given the frame, the camera, and a short afterglow for the light a ring leaves');
  }

  // The table.
  ok(T.VIZ_SCENES.includes('ink') && T.VIZ_USES_3D.includes('ink'), 'ink is a kit scene');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['ink']) === '{"swirl":50,"density":50,"glass":50,"cameraDrift":50}' && !('ink' in T.PER_VIZ_MAX), 'ink knobs: swirl, density, glass and camera drift, all 0 to 100');
  const oldInk = T.sanitizeConfig({ activeViz: 'ink', perViz: { 'ink': { swirl: 80 } } });
  ok(oldInk.activeViz === 'ink' && JSON.stringify(oldInk.perViz['ink']) === '{"swirl":80,"density":50,"glass":50,"cameraDrift":50}', 'a saved pre-redesign ink config keeps its swirl and gains the new defaults');
  ok(!('ink' in T.VIZ_LABELS), 'ink keeps the name it is listed by');

  // The files.
  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="ink.js"');
    order.push(pos > html.indexOf('src="metaball.js"') && pos > html.indexOf('src="scene-kit.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load ink.js after the scene kit and metaball.js and before the factories');
  const factory = await readFile(resolve(__dirname, 'overlay/factories/ink.js'), 'utf8');
  ok(/VIZ_FACTORIES\['ink'\] = TimbreScene\.factory\(\(\) => TimbreInk\.definition\(\)\);/.test(factory) && !/WebGLRenderer/.test(factory), 'the effect is the kit\'s factory around the tank\'s definition, with no renderer of its own');
  ok(!/Math\.random/.test(await readFile(resolve(__dirname, 'overlay/ink.js'), 'utf8')), 'the ink takes no numbers from Math.random, so a run is repeatable');
}

console.log('\n[21] shards');
await import('./overlay/scene-kit.js');
await import('./overlay/shards.js');
{
  const K = globalThis.TimbreShards, S = globalThis.TimbreScene;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const TAU = 2 * Math.PI;
  const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };
  const FAR = Math.hypot(1.8 + 0.38, 1.15 + 0.14);   // from the point of impact to the furthest corner

  ok(K.BANDS === 8 && K.PW === 3.6 && K.PH === 2.3 && K.IX === -0.38 && K.IY === 0.14 && K.THICK === 0.05 && K.GAP === 0.011 && K.TRAVEL === 0.75 && K.BEAT_TRAVEL === 0.41 && K.LIFT === 1 && K.SPREAD === 0.22 && K.TIP === 0.6
    && K.TILT_MAX === 0.95 && K.OPEN_MAX === 1.7 && K.RISE === 20 && K.FALL === 4 && K.HISTORY === 24 && K.HISTORY_HZ === 24 && K.SHARDS_MAX === 640 && K.SECTORS === 16 && K.FOV === 30 && K.PITCH === 5
    && JSON.stringify(K.FRAME) === '{"width":6,"height":4.4,"center":[0,-0.05,0.4]}' && JSON.stringify(K.TURN) === '[-0.05,-0.26,0.03]' && near(K.FAR, FAR) && K.GLOW_PLANE === 6.4 && K.GLOW_Z === -0.55 && K.QUIET === 0.08,
    'the sizes: a pane 3.6 across and 2.3 tall, struck left of its middle and above it; a ripple crosses it in three quarters of a second');

  // How finely the pane is broken.
  ok(K.spokesFor(0) === 12 && K.spokesFor(50) === 22 && K.spokesFor(100) === 32 && K.spokesFor(-9) === 12 && K.spokesFor(900) === 32 && K.spokesFor(undefined) === 22 && K.spokesFor(NaN) === 22 && K.spokesFor(33.3) === 19 && Number.isInteger(K.spokesFor(47.7))
    && K.ringsFor(0) === 5 && K.ringsFor(50) === 8 && K.ringsFor(100) === 11 && K.ringsFor(-9) === 5 && K.ringsFor(900) === 11 && K.ringsFor(undefined) === 8 && K.ringsFor(33.3) === 7 && Number.isInteger(K.ringsFor(47.7)),
    'Density asks for 12 to 32 cracks outward and 5 to 11 rings across them');
  ok(near(K.edgeAt(0), 2.18) && near(K.edgeAt(Math.PI / 2), 1.01) && near(K.edgeAt(Math.PI), 1.42) && near(K.edgeAt(-Math.PI / 2), 1.29) && near(K.edgeAt(3 * Math.PI / 2), 1.29)
    && near(K.edgeAt(Math.atan2(1.01, 2.18)), Math.hypot(1.01, 2.18)) && near(K.edgeAt(Math.atan2(-1.29, -1.42)), Math.hypot(1.29, 1.42)) && near(K.edgeAt(0.2), 2.18 / Math.cos(0.2)) && near(K.edgeAt(1.2), 1.01 / Math.sin(1.2)),
    'how far the pane\'s edge is from the point of impact, in every direction');

  // The cracks.
  {
    const polys = K.crack(22, 8, K.SEED), again = K.crack(22, 8, K.SEED), other = K.crack(22, 8, K.SEED + 1);
    let total = 0, least = Infinity, inside = true, convex = true, turned = true, corners = true, atImpact = 0, onEdge = 0, widest = 0;
    for (const p of polys) {
      const a = area(p); total += a; if (a < least) least = a;
      if (!(a > 0)) turned = false;
      if (p.length !== 3 && p.length !== 4) corners = false;
      for (let i = 0; i < p.length; i++) {
        const [x, y] = p[i], q = p[(i + 1) % p.length], r = p[(i + 2) % p.length];
        if (Math.abs(x) > 1.8 + 1e-9 || Math.abs(y) > 1.15 + 1e-9) inside = false;
        if ((q[0] - x) * (r[1] - q[1]) - (q[1] - y) * (r[0] - q[0]) < -1e-9) convex = false;
        if (x === K.IX && y === K.IY) atImpact++;
        if (Math.abs(Math.abs(x) - 1.8) < 1e-9 || Math.abs(Math.abs(y) - 1.15) < 1e-9) onEdge++;
        widest = Math.max(widest, Math.hypot(q[0] - x, q[1] - y));
      }
    }
    const has = (x, y) => polys.some((p) => p.some((c) => near(c[0], x, 1e-9) && near(c[1], y, 1e-9)));
    ok(polys.length === 280 && corners && turned && convex && inside && near(total, 3.6 * 2.3, 1e-9) && least > 2e-4 && atImpact === 22 && onEdge > 40 && widest < 1.0
      && has(1.8, 1.15) && has(-1.8, 1.15) && has(-1.8, -1.15) && has(1.8, -1.15),
      'the cracks cut the pane into shards of three or four corners that fill it exactly: none overlaps, none is left out, and the pane keeps its four corners (' + polys.length + ' shards, the smallest ' + least.toExponential(2) + ')');
    ok(JSON.stringify(polys) === JSON.stringify(again) && JSON.stringify(polys) !== JSON.stringify(other) && near(other.reduce((s, p) => s + area(p), 0), 3.6 * 2.3, 1e-9), 'the same seed breaks the pane the same way, another seed another way');
    const sumOf = (ps) => { let s = 0, k = 0; for (const p of ps) for (const c of p) { s += c[0] * ((k % 7) + 1) + c[1] * ((k % 5) + 1); k++; } return s; };
    ok(near(sumOf(polys), -773.2145057604686, 1e-9) && near(polys[0][1][0], -0.30570078609633966, 1e-12) && near(polys[150][2][1], -0.3766502828719156, 1e-12), 'the pane breaks as it was measured to: every corner of every shard is where it was');
    const few = K.crack(2, 3, K.SEED);
    ok(few.length === 14 && few.filter((p) => p.some((c) => c[0] === K.IX && c[1] === K.IY)).length === 4 && near(few.reduce((s, p) => s + area(p), 0), 8.28, 1e-9)
      && [[1.8, 1.15], [-1.8, 1.15], [-1.8, -1.15], [1.8, -1.15]].every(([x, y]) => few.some((p) => p.some((c) => near(c[0], x) && near(c[1], y)))),
      'asked for fewer cracks than the pane has corners, a crack still runs to each corner and no more, and the shards still fill the pane');
    const coarse = K.crack(12, 5, K.SEED), fine = K.crack(32, 11, K.SEED);
    ok(coarse.length === K.COUNT_MIN && fine.length === K.COUNT_MAX && coarse.length < 150 && coarse.length > 80 && fine.length > 420 && fine.length <= K.SHARDS_MAX && near(coarse.reduce((s, p) => s + area(p), 0), 8.28, 1e-9) && near(fine.reduce((s, p) => s + area(p), 0), 8.28, 1e-9),
      'the coarsest pane and the finest: ' + coarse.length + ' and ' + fine.length + ' shards, each filling the pane');
    let most = 0, growing = true, last = 0, whole = true;
    for (let d = 0; d <= 100; d++) { const n = K.crack(K.spokesFor(d), K.ringsFor(d), K.SEED).length; if (n > most) most = n; if (d % 25 === 0) { if (!(n > last)) growing = false; last = n; } if (!Number.isInteger(n)) whole = false; }
    ok(most <= K.SHARDS_MAX && growing && whole, 'at every Density there is room for the shards, and Density 0, 25, 50, 75 and 100 each give more than the last (the most: ' + most + ')');
    // Every pane there is (Density picks one of 27), not only the usual one.
    let every = true, covered = true; const pairs = new Set();
    for (let d = 0; d <= 100; d += 0.5) {
      const sp = K.spokesFor(d), rg = K.ringsFor(d), ps = K.crack(sp, rg, K.SEED); let tot = 0;
      pairs.add(sp + ' ' + rg);
      for (const p of ps) {
        const a = area(p); tot += a;
        if (!(a > 1e-5) || (p.length !== 3 && p.length !== 4)) every = false;
        for (let i = 0; i < p.length; i++) { const [x, y] = p[i], q = p[(i + 1) % p.length], r = p[(i + 2) % p.length]; if (Math.abs(x) > 1.8 + 1e-9 || Math.abs(y) > 1.15 + 1e-9 || (q[0] - x) * (r[1] - q[1]) - (q[1] - y) * (r[0] - q[0]) < -1e-9) every = false; }
      }
      if (!near(tot, 8.28, 1e-9) || ![[1.8, 1.15], [-1.8, 1.15], [-1.8, -1.15], [1.8, -1.15]].every(([x, y]) => ps.some((p) => p.some((c) => near(c[0], x) && near(c[1], y))))) every = false;
      // Areas that add up could hide an overlap that makes up for a hole: so, places all over the pane, each in one shard and no more.
      if (d % 25 === 0) for (let gy = 0; gy < 37; gy++) for (let gx = 0; gx < 59; gx++) {
        const x = -1.8 + ((gx + 0.3183) * 3.6) / 59, y = -1.15 + ((gy + 0.7071) * 2.3) / 37; let inside = 0;
        for (const p of ps) { let all = true; for (let i = 0; i < p.length && all; i++) { const a = p[i], b = p[(i + 1) % p.length]; if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) all = false; } if (all) inside++; }
        if (inside !== 1) covered = false;
      }
    }
    ok(every && pairs.size === 27, 'every pane there is, of ' + pairs.size + ': its shards have three or four corners, turn the same way, bulge nowhere inward, lie in the pane, fill it exactly and keep its four corners');
    ok(covered, 'and a place in the pane is in one shard and no more: nothing overlaps and nothing is left out');
  }

  // The pane: every shard's place and numbers, and its corners as a mesh.
  {
    const polys = K.crack(22, 8, K.SEED), P = K.createPane(50, K.SEED);
    let verts = 0, indices = 0; for (const p of polys) { verts += 6 * p.length; indices += 12 * p.length - 12; }
    ok(P.count === 280 && P.verts === verts && P.indices === indices && P.local.length === verts * 3 && P.lnorm.length === verts * 3 && P.kind.length === verts && !('tone' in P) && P.index.length === indices
      && P.start.length === P.count + 1 && P.start[0] === 0 && P.start[P.count] === verts && P.spokes === 22 && P.rings === 8, 'a pane of ' + P.count + ' shards: ' + verts + ' corners and ' + indices / 3 + ' triangles');
    let placed = true, away = true, ranges = true; const bandsUsed = new Set();
    for (let i = 0; i < P.count; i++) {
      const p = polys[i], n = p.length, cx = p.reduce((s, c) => s + c[0], 0) / n, cy = p.reduce((s, c) => s + c[1], 0) / n, dist = Math.hypot(cx - K.IX, cy - K.IY);
      if (!(near(P.cx[i], cx, 1e-6) && near(P.cy[i], cy, 1e-6) && near(P.dist[i], dist, 1e-6) && near(P.d[i], dist / FAR, 1e-6) && P.start[i + 1] - P.start[i] === 6 * n)) placed = false;
      if (!(near(Math.hypot(P.ux[i], P.uy[i]), 1, 1e-5) && near(P.ux[i] * dist, cx - K.IX, 1e-5) && near(P.uy[i] * dist, cy - K.IY, 1e-5) && P.d[i] > 0 && P.d[i] < 1)) away = false;
      const ang = (Math.atan2(cy - K.IY, cx - K.IX) + TAU) % TAU;
      if (P.band[i] !== (Math.floor((ang / TAU) * 16) * 3) % 8) placed = false;
      bandsUsed.add(P.band[i]);
      if (!(P.liftK[i] >= 0.75 && P.liftK[i] <= 1.25 && P.tipK[i] >= 0.6 && P.tipK[i] <= 1.2 && Math.abs(P.side[i]) <= 0.45 && Math.abs(P.twist[i]) <= 0.4 && Math.abs(P.restX[i]) <= 0.055 && Math.abs(P.restY[i]) <= 0.055)) ranges = false;
    }
    const spread = (a) => { let lo = Infinity, hi = -Infinity; for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v; } return hi - lo; };
    ok(placed && away && bandsUsed.size === 8, 'each shard knows its middle, how far it is from the point of impact and which way that is, and its sector\'s band; all eight bands have sectors');
    ok(ranges && spread(P.liftK) > 0.4 && spread(P.tipK) > 0.5 && spread(P.side) > 0.8 && spread(P.twist) > 0.7 && spread(P.restX) > 0.09 && spread(P.restY) > 0.09,
      'each shard has numbers of its own: how far it lifts and tips, a lean, a twist, and how it lies at rest');
    ok(near(P.liftK[0], 1.1726065874099731, 1e-6) && near(P.tipK[7], 1.0768808126449585, 1e-6) && near(P.side[100], -0.35313478112220764, 1e-6) && near(P.twist[200], -0.31332534551620483, 1e-6) && near(P.restX[279], -0.027324281632900238, 1e-6) && near(P.restY[33], 0.013727881945669651, 1e-6),
      'and they are the numbers they were measured to be: they go on in the sequence where the cracks left it');
    // The mesh of one shard at a time.
    let tops = true, backs = true, sides = true, drawnIn = true, wound = true, within = true;
    const L = (v) => [P.local[v * 3], P.local[v * 3 + 1], P.local[v * 3 + 2]], N = (v) => [P.lnorm[v * 3], P.lnorm[v * 3 + 1], P.lnorm[v * 3 + 2]];
    let ix = 0;
    for (let i = 0; i < P.count; i++) {
      const p = polys[i], n = p.length, s0 = P.start[i];
      for (let c = 0; c < n; c++) {
        const dx = p[c][0] - P.cx[i], dy = p[c][1] - P.cy[i], len = Math.hypot(dx, dy), f = Math.max(0.55, 1 - 0.011 / len), t = L(s0 + c), b = L(s0 + n + c);
        if (!(near(t[0], dx * f, 1e-6) && near(t[1], dy * f, 1e-6) && near(t[2], 0.025, 1e-7))) drawnIn = false;
        if (!(N(s0 + c)[2] === 1 && N(s0 + c)[0] === 0 && P.kind[s0 + c] === 0)) tops = false;
        if (!(near(b[0], t[0], 1e-7) && near(b[1], t[1], 1e-7) && near(b[2], -0.025, 1e-7) && N(s0 + n + c)[2] === -1 && P.kind[s0 + n + c] === 0)) backs = false;
        for (let q = 0; q < 4; q++) {
          const v = s0 + 2 * n + c * 4 + q, nv = N(v), lv = L(v);
          if (!(P.kind[v] === 1 && nv[2] === 0 && near(Math.hypot(nv[0], nv[1]), 1, 1e-5) && nv[0] * lv[0] + nv[1] * lv[1] > 0 && near(Math.abs(lv[2]), 0.025, 1e-7))) sides = false;
        }
      }
      const tris = (12 * n - 12) / 3;
      for (let t = 0; t < tris; t++) {
        const a = P.index[ix++], b = P.index[ix++], c = P.index[ix++];
        if (a < s0 || b < s0 || c < s0 || a >= P.start[i + 1] || b >= P.start[i + 1] || c >= P.start[i + 1]) within = false;
        const A = L(a), B = L(b), C = L(c), u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], w = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
        const nx = u[1] * w[2] - u[2] * w[1], ny = u[2] * w[0] - u[0] * w[2], nz = u[0] * w[1] - u[1] * w[0], nn = N(a);
        if (!(nx * nn[0] + ny * nn[1] + nz * nn[2] > 0)) wound = false;   // every triangle faces the way its corners say
      }
    }
    ok(tops && backs && drawnIn, 'a shard has a top and a back, both mirrors, half the glass\'s thickness either side of the pane, drawn in from its cracks by the gap');
    ok(sides && within && wound && ix === P.indices, 'and a cut side along each edge, facing outward; every triangle is the shard\'s own and faces the way its corners say');
    const Q = K.createPane(50, K.SEED), R = K.createPane(0, K.SEED), U = K.createPane(100, K.SEED);
    ok(Q.count === P.count && Q.local.every((v, i) => v === P.local[i]) && Q.side.every((v, i) => v === P.side[i]) && R.count === K.COUNT_MIN && U.count === K.COUNT_MAX && R.spokes === 12 && R.rings === 5 && U.spokes === 32 && U.rings === 11 && U.verts <= K.SHARDS_MAX * 24 && U.indices <= K.SHARDS_MAX * 36,
      'the same Density makes the same pane, and Density 0 and 100 the coarsest and the finest');
  }

  // The sound.
  {
    const bins = new Uint8Array(32); bins[0] = 255; bins[1] = 51; bins[7] = 102; bins[3] = 20; bins[4] = 21;
    ok(near(K.loudness(bins, 0, 1), 1) && near(K.loudness(bins, 1, 1), 0.2) && near(K.loudness(bins, 7, 1), 0.4) && near(K.loudness(bins, 1, 2), 0.4) && K.loudness(bins, 7, 3) === 1 && K.loudness(bins, 1, 0) === 0
      && K.loudness(null, 0, 1) === 0 && K.loudness(new Uint8Array(4).fill(255), 7, 1) === 0, 'a band is as loud as its bin, times Gain, up to 1; a band there is no bin for is silent');
    ok(K.loudness(bins, 3, 1) === 0 && near(K.loudness(bins, 4, 1), 21 / 255) && near(K.loudness(bins, 3, 2), 40 / 255) && K.loudness(bins, 4, 0.9) === 0 && K.loudness(bins, 5, 1) === 0 && K.loudness(bins, 0, 0.08) === 0.08 && K.loudness(bins, 0, 0.0799) === 0,
      'a band quieter than 0.08 is not heard at all, so the hiss of a room does not hold the pane open');
    let most = 0, least = 9, apart = 0;
    for (let t = 0; t < 60; t += 0.25) { for (let b = 0; b < 8; b++) { const v = K.idle(b, t); most = Math.max(most, v); least = Math.min(least, v); } apart = Math.max(apart, Math.abs(K.idle(0, t) - K.idle(3, t))); }
    ok(least === 0 && most > 0.5 && most <= 0.52 && apart > 0.4 && near(K.idle(2, 3), Math.max(0, 0.22 + 0.3 * Math.sin(2.1 + 2.8))) && near(K.idle(0, 1), 0.22 + 0.3 * Math.sin(0.7)) && K.idle(5, 0) === Math.max(0, 0.22 + 0.3 * Math.sin(7)),
      'with the mic off the bands rise and fall in turn, each on its own time');
    ok(K.settle(0) === 0 && K.settle(9e-5) === 0 && K.settle(1e-4) === 1e-4 && K.settle(0.3) === 0.3, 'a level within a ten-thousandth of nothing is nothing');
  }

  // How far open a shard is.
  ok(K.amountOf(50) === 1 && K.amountOf(0) === 0 && K.amountOf(100) === 2 && K.amountOf(25) === 0.5 && K.amountOf(-5) === 0 && K.amountOf(500) === 2 && K.amountOf(undefined) === 1 && K.amountOf(NaN) === 1, 'Bloom: none at 0, as designed at 50, twice that at 100');
  ok(K.delayOf(0) === 0 && near(K.delayOf(1), 0.75) && near(K.delayOf(0.4), 0.3) && K.beatDelayOf(0) === 0 && near(K.beatDelayOf(1), 0.41) && near(K.beatDelayOf(0.5), 0.205), 'a ripple reaches the furthest corner in three quarters of a second, a beat\'s ring in rather more than half that');
  ok(K.openOf(0, 0, 0, 1) === 0 && near(K.openOf(1, 0, 0, 1), 0.5) && near(K.openOf(0, 1, 0, 1), 0.65) && near(K.openOf(1, 1, 0, 1), 1.15) && near(K.openOf(0.4, 0.2, 0, 1), 0.33) && near(K.openOf(0, 0, 1, 1), 0.5) && near(K.openOf(1, 1, 1, 1), 1.65)
    && near(K.openOf(1, 1, 0.5, 1), 1.4) && near(K.openOf(0.4, 0.2, 0.2, 2), 0.86) && K.openOf(1, 1, 1, 2) === 1.7 && near(K.openOf(1, 0, 0, 0.5), 0.25) && K.openOf(1, 1, 1, 0) === 0 && near(K.openOf(2, 2, 0, 1), 1.2) && near(K.openOf(2, 2, 1, 1), 1.7) && near(K.openOf(2, 2, 0, 0.5), 0.6) && near(K.openOf(1, 0.3, 0, 2), 1.39),
    'a shard is as far open as the voice and its band say, further on a beat, by as much as Bloom says, and no further than the widest');
  {
    const P = K.createPane(50, K.SEED), out = new Float32Array(P.count), mk = () => S.createHistory(K.HISTORY, K.HISTORY_HZ);
    const voice = mk(), beat = mk(), bands = []; for (let b = 0; b < 8; b++) bands.push(mk());
    // A tenth of a second of voice, then silence: the ripple leaves the point of impact and crosses the pane.
    const step = (v, secs) => { for (let i = 0; i < Math.round(secs * 120); i++) { voice.step(v, 1 / 120); beat.step(0, 1 / 120); for (const h of bands) h.step(0, 1 / 120); } };
    step(1, 0.1);
    const m0 = K.openAll(out, P, voice, bands, beat, 1), a0 = Array.from(out);
    step(0, 0.35);
    const m1 = K.openAll(out, P, voice, bands, beat, 1), a1 = Array.from(out);
    step(0, 0.3);
    const m2 = K.openAll(out, P, voice, bands, beat, 1), a2 = Array.from(out);
    const mean = (a, test) => { let s = 0, n = 0; for (let i = 0; i < P.count; i++) if (test(P.d[i])) { s += a[i]; n++; } return n ? s / n : 0; };
    const inner = (d) => d < 0.12, mid = (d) => d > 0.42 && d < 0.55, outer = (d) => d > 0.85;
    ok(mean(a0, inner) > 0.3 && mean(a0, mid) === 0 && mean(a0, outer) === 0 && mean(a1, inner) < 0.02 && mean(a1, mid) > 0.25 && mean(a1, outer) === 0 && mean(a2, inner) === 0 && mean(a2, mid) === 0 && mean(a2, outer) > 0.1
      && near(m0, a0.reduce((s, v) => s + v, 0) / P.count, 1e-6) && near(m1, a1.reduce((s, v) => s + v, 0) / P.count, 1e-6) && m2 > 0,
      'a syllable is a ripple: it opens the shards at the point of impact first, then those further out, and the far corners last (' + [mean(a0, inner), mean(a1, mid), mean(a2, outer)].map((v) => v.toFixed(2)).join(', ') + ')');
    let exact = true;
    for (let i = 0; i < P.count; i++) if (!near(a2[i], K.openOf(voice.heard(K.delayOf(P.d[i])), bands[P.band[i]].heard(K.delayOf(P.d[i])), beat.heard(K.beatDelayOf(P.d[i])), 1), 1e-6)) exact = false;   // (the histories are still as they were for a2)
    for (let i = 0; i < P.count; i++) if (a0[i] < 0 || a0[i] > 0.5 + 1e-6 || a1[i] < 0 || a1[i] > 0.5 + 1e-6) exact = false;
    // One band sounding: only its sectors open. And a beat's ring runs ahead of the ripple.
    const voice2 = mk(), beat2 = mk(), bands2 = []; for (let b = 0; b < 8; b++) bands2.push(mk());
    for (let i = 0; i < 240; i++) { voice2.step(0, 1 / 120); beat2.step(0, 1 / 120); bands2.forEach((h, b) => h.step(b === 2 ? 0.8 : 0, 1 / 120)); }
    K.openAll(out, P, voice2, bands2, beat2, 1);
    let own = true, others = true; for (let i = 0; i < P.count; i++) { if (P.band[i] === 2) { if (!near(out[i], 0.52, 1e-6)) own = false; } else if (out[i] !== 0) others = false; }
    K.openAll(out, P, voice2, bands2, beat2, 2);
    let doubled = true; for (let i = 0; i < P.count; i++) if (P.band[i] === 2 && !near(out[i], 1.04, 1e-6)) doubled = false;
    const voice3 = mk(), beat3 = mk(), bands3 = []; for (let b = 0; b < 8; b++) bands3.push(mk());
    for (let i = 0; i < 12; i++) { voice3.step(1, 1 / 120); beat3.step(1, 1 / 120); bands3.forEach((h) => h.step(0, 1 / 120)); }
    for (let i = 0; i < 24; i++) { voice3.step(0, 1 / 120); beat3.step(0, 1 / 120); bands3.forEach((h) => h.step(0, 1 / 120)); }
    K.openAll(out, P, voice3, bands3, beat3, 1);   // 0.3 s on: the voice's ripple is at d = 0.27 to 0.4, the beat's ring at 0.49 to 0.73
    const ring = mean(Array.from(out), (d) => d > 0.55 && d < 0.68), ripple = mean(Array.from(out), (d) => d > 0.3 && d < 0.36), ahead = mean(Array.from(out), (d) => d > 0.9);   // (what is remembered is read between samples a twenty-fourth of a second apart, so the ring's front is that soft)
    ok(exact && own && others && doubled && ring > 0.3 && ripple > 0.3 && ahead === 0, 'each sector opens with its own band, by as much as Bloom says, and a beat\'s ring runs ahead of the voice\'s ripple ' + JSON.stringify({ exact, own, others, doubled, ring, ripple, ahead }));
  }

  // Where being open puts a shard.
  {
    const P = K.createPane(50, K.SEED), o = new Float64Array(12);
    const ortho = (m) => { const r = [[m[3], m[4], m[5]], [m[6], m[7], m[8]], [m[9], m[10], m[11]]]; let worst = 0;
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) worst = Math.max(worst, Math.abs(r[a][0] * r[b][0] + r[a][1] * r[b][1] + r[a][2] * r[b][2] - (a === b ? 1 : 0)));
      const det = r[0][0] * (r[1][1] * r[2][2] - r[1][2] * r[2][1]) - r[0][1] * (r[1][0] * r[2][2] - r[1][2] * r[2][0]) + r[0][2] * (r[1][0] * r[2][1] - r[1][1] * r[2][0]);
      return worst < 1e-9 && near(det, 1, 1e-9); };
    let rest = true, moved = true, turns = true, outward = 0, held = true, atMost = 0, flatAtRest = 0;
    for (let i = 0; i < P.count; i++) {
      K.poseOf(o, P, i, 0);
      const tilt0 = Math.acos(Math.min(1, o[11]));
      if (!(near(o[0], P.cx[i], 1e-6) && near(o[1], P.cy[i], 1e-6) && o[2] === 0 && ortho(o) && near(tilt0, Math.hypot(P.restX[i], P.restY[i]), 1e-6))) rest = false;
      if (tilt0 > 0.005) flatAtRest++;
      K.poseOf(o, P, i, 1);
      if (!(near(o[0], P.cx[i] + P.ux[i] * 0.22 * P.dist[i], 1e-6) && near(o[1], P.cy[i] + P.uy[i] * 0.22 * P.dist[i], 1e-6) && near(o[2], (0.3 + 0.7 * (1 - P.d[i])) * P.liftK[i], 1e-6))) moved = false;
      if (!ortho(o)) turns = false;
      // The mirror's face is the turn's third column: it leans away from the point of impact.
      if (o[5] * P.ux[i] + o[8] * P.uy[i] > 0.2) outward++;
      K.poseOf(o, P, i, 0.5);
      if (!(near(o[2], 0.5 * (0.3 + 0.7 * (1 - P.d[i])) * P.liftK[i], 1e-6) && near(o[0], P.cx[i] + P.ux[i] * 0.11 * P.dist[i], 1e-6))) moved = false;
      K.poseOf(o, P, i, 1.7);
      const tilt = Math.acos(Math.max(-1, Math.min(1, o[11])));
      if (!(tilt <= 0.95 + 1e-6 && ortho(o))) held = false;
      if (tilt > 0.8) atMost++;
    }
    ok(rest && flatAtRest > 0.9 * P.count, 'shut, a shard is in its place in the pane, turned only by the little it does not lie flat');
    ok(moved && turns && outward > 0.9 * P.count, 'open, it has lifted toward the viewer (most near the point of impact), moved away from that point, and tipped outward like a petal (' + outward + ' of ' + P.count + ')');
    ok(held && atMost > 0.5 * P.count, 'however far open, it tips no further than 0.95 of a radian, however the camera then sees it (' + atMost + ' are within 0.15 of that at the widest)');
    // One shard, by hand: its turn is about the one axis its tip, lean, twist and rest make together.
    const i = 100, e = 0.8, a = 0.6 * e * P.tipK[i], b = e * P.side[i];
    const rx = -P.uy[i] * a + P.ux[i] * b + P.restX[i], ry = P.ux[i] * a + P.uy[i] * b + P.restY[i], rz = e * P.twist[i], ang = Math.hypot(rx, ry, rz), x = rx / ang, y = ry / ang, z = rz / ang, c = Math.cos(ang), sn = Math.sin(ang), t = 1 - c;
    K.poseOf(o, P, i, e);
    ok(Math.hypot(rx, ry) < 0.95 && near(o[3], c + x * x * t, 1e-9) && near(o[4], x * y * t - z * sn, 1e-9) && near(o[5], x * z * t + y * sn, 1e-9) && near(o[6], y * x * t + z * sn, 1e-9) && near(o[7], c + y * y * t, 1e-9) && near(o[8], y * z * t - x * sn, 1e-9)
      && near(o[9], z * x * t - y * sn, 1e-9) && near(o[10], z * y * t + x * sn, 1e-9) && near(o[11], c + z * z * t, 1e-9), 'a shard\'s turn is one turn about the axis that its tip, its lean, its twist and its rest make together');
    // Every shard at the widest opening, by hand: only what leans it from the pane is held back, and its twist is left alone.
    let widest = true, heldBack = 0, free = 0;
    for (let k = 0; k < P.count; k++) {
      const e2 = 1.7, a2 = 0.6 * e2 * P.tipK[k], b2 = e2 * P.side[k];
      let qx = -P.uy[k] * a2 + P.ux[k] * b2 + P.restX[k], qy = P.ux[k] * a2 + P.uy[k] * b2 + P.restY[k];
      const qz = e2 * P.twist[k], lean = Math.hypot(qx, qy);
      if (lean > 0.95) { qx *= 0.95 / lean; qy *= 0.95 / lean; heldBack++; } else free++;
      const g = Math.hypot(qx, qy, qz), X = qx / g, Y = qy / g, Z = qz / g, C = Math.cos(g), Sn = Math.sin(g), Tt = 1 - C;
      K.poseOf(o, P, k, e2);
      if (!(near(o[3], C + X * X * Tt, 1e-9) && near(o[5], X * Z * Tt + Y * Sn, 1e-9) && near(o[8], Y * Z * Tt - X * Sn, 1e-9) && near(o[10], Z * Y * Tt + X * Sn, 1e-9) && near(o[11], C + Z * Z * Tt, 1e-9))) widest = false;
    }
    ok(widest && heldBack > 0.5 * P.count && free > 5, 'at the widest opening a shard\'s lean from the pane is held to 0.95 of a radian and its twist is left as it is (' + heldBack + ' held, ' + free + ' not)');
  }
  {
    const P = K.createPane(50, K.SEED), open = new Float32Array(P.count), pos = new Float32Array(P.verts * 3), norm = new Float32Array(P.verts * 3), shown = new Float32Array(P.verts), o = new Float64Array(12);
    for (let i = 0; i < P.count; i++) open[i] = (i % 5) * 0.3;
    K.place(P, open, pos, norm, shown);
    let right = true, units = true, marks = true;
    for (let i = 0; i < P.count; i += 3) {
      K.poseOf(o, P, i, open[i]);
      for (let v = P.start[i]; v < P.start[i + 1]; v++) {
        const j = v * 3, lx = P.local[j], ly = P.local[j + 1], lz = P.local[j + 2], nx = P.lnorm[j], ny = P.lnorm[j + 1], nz = P.lnorm[j + 2];
        if (!(near(pos[j], o[0] + o[3] * lx + o[4] * ly + o[5] * lz, 1e-5) && near(pos[j + 1], o[1] + o[6] * lx + o[7] * ly + o[8] * lz, 1e-5) && near(pos[j + 2], o[2] + o[9] * lx + o[10] * ly + o[11] * lz, 1e-5))) right = false;
        if (!(near(norm[j], o[3] * nx + o[4] * ny + o[5] * nz, 1e-5) && near(norm[j + 1], o[6] * nx + o[7] * ny + o[8] * nz, 1e-5) && near(norm[j + 2], o[9] * nx + o[10] * ny + o[11] * nz, 1e-5) && near(Math.hypot(norm[j], norm[j + 1], norm[j + 2]), 1, 1e-5))) units = false;
        if (shown[v] !== open[i]) marks = false;
      }
    }
    ok(right && units && marks, 'every corner of a shard goes where the shard\'s move and turn put it, faces the way they turn it, and carries how far open the shard is');
    open.fill(0); K.place(P, open, pos, norm, shown);
    const shut = K.measure(P, pos);
    open.fill(1.7); K.place(P, open, pos, norm, shown);
    const wide = K.measure(P, pos);
    const spots = [0, 8.5, 20, 35, 50, 65, 75, 90, 100].map((dn) => { const Q = K.createPane(dn, K.SEED), o2 = new Float32Array(Q.count).fill(1.7), p2 = new Float32Array(Q.verts * 3); K.place(Q, o2, p2, new Float32Array(Q.verts * 3), new Float32Array(Q.verts)); return [Q, p2]; });
    ok(shut[0] >= -1.8 - 0.01 && shut[1] <= 1.8 + 0.01 && shut[2] >= -1.15 - 0.01 && shut[3] <= 1.15 + 0.01 && shut[4] > -0.06 && shut[5] < 0.06 && shut[1] - shut[0] > 3.5 && shut[3] - shut[2] > 2.2
      && wide[0] < -2.1 && wide[1] > 2.4 && wide[2] < -1.4 && wide[3] > 1.3 && wide[5] > 1.8 && wide[5] < 2.4 && wide[4] > -0.4, 'shut, the shards lie in the pane; wide open they reach out beyond it and toward the viewer (' + Array.from(wide).map((v) => v.toFixed(2)).join(', ') + ')');
    // The widest opening still fits the picture: from where the kit puts the camera, on the wide page and the small one, however the camera has drifted.
    const [tx, ty, tz] = K.TURN, cx = Math.cos(tx), sx = Math.sin(tx), cy = Math.cos(ty), sy = Math.sin(ty), cz = Math.cos(tz), sz = Math.sin(tz);
    const turn = (x, y, z) => { const x1 = cz * x - sz * y, y1 = sz * x + cz * y; const x2 = cy * x1 + sy * z, z2 = -sy * x1 + cy * z; return [x2, cx * y1 - sx * z2, sx * y1 + cx * z2]; };   // three.js turns about z, then y, then x
    const worst = (aspect, orbit) => {
      const d = S.fitDistance(K.FRAME.width, K.FRAME.height, K.FOV, aspect), pitch = (K.PITCH * Math.PI) / 180, C = K.FRAME.center;
      const eye = [C[0] + d * Math.sin(orbit) * Math.cos(pitch), C[1] + d * Math.sin(pitch), C[2] + d * Math.cos(orbit) * Math.cos(pitch)];
      const f = [C[0] - eye[0], C[1] - eye[1], C[2] - eye[2]], fl = Math.hypot(...f); f[0] /= fl; f[1] /= fl; f[2] /= fl;
      const r = [-f[2], 0, f[0]], rl = Math.hypot(...r); r[0] /= rl; r[2] /= rl;   // right = forward x up, up being +y
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      const th = Math.tan((K.FOV * Math.PI) / 360); let mx = 0, my = 0;
      for (const [Q, pos2] of spots) for (let v = 0; v < Q.verts; v++) {
        const w = turn(pos2[v * 3], pos2[v * 3 + 1], pos2[v * 3 + 2]), p = [w[0] - eye[0], w[1] - eye[1], w[2] - eye[2]];
        const depth = p[0] * f[0] + p[1] * f[1] + p[2] * f[2], x = (p[0] * r[0] + p[1] * r[1] + p[2] * r[2]) / (depth * th * aspect), y = (p[0] * u[0] + p[1] * u[1] + p[2] * u[2]) / (depth * th);
        mx = Math.max(mx, Math.abs(x)); my = Math.max(my, Math.abs(y));
      }
      return [mx, my];
    };
    const views = [];
    for (const aspect of [1728 / 624, 300 / 220, 1440 / 1080]) for (const orbit of [-0.5, -0.25, 0, 0.25, 0.5]) views.push(worst(aspect, orbit));
    const mx = Math.max(...views.map((v) => v[0])), my = Math.max(...views.map((v) => v[1]));
    ok(mx < 0.97 && my < 0.97 && my > 0.9 && mx > 0.9, 'wide open, every shard is still in the picture, at any Density, on every page and however far the camera has drifted (the furthest: ' + mx.toFixed(3) + ' across, ' + my.toFixed(3) + ' up, of 1)');
  }

  // The light behind the pane.
  {
    const g = [0, 0];
    ok(near(K.glowOf(g, 0, 0)[0], 0.05) && near(g[1], 3.8) && near(K.glowOf(g, 1, 0)[0], 0.31) && near(g[1], 4.8) && near(K.glowOf(g, 0, 1)[0], 0.35) && near(g[1], 4.6) && near(K.glowOf(g, 0.5, 0.5)[0], 0.33) && near(g[1], 4.7) && K.glowOf(g, 1, 1)[1] <= K.GLOW_PLANE,
      'the light behind the pane is faint in silence, brighter and wider with the voice and on a beat, and never wider than the sheet it is drawn on');
  }

  // The shaders.
  ok(/uniform vec3 uPal\[6\];/.test(K.MIRROR_FRAG) && /reflect\(-v, n\)/.test(K.MIRROR_FRAG) && /sin\(17\.0 \* r\.y \+ 5\.0 \* r\.x \+ 1\.0\)/.test(K.MIRROR_FRAG) && /gl_FragColor = vec4\(col, 1\.0\);/.test(K.MIRROR_FRAG) && /attribute float kind, open;/.test(K.MIRROR_VERT)
    && /exp\(-4\.8 \* r\)/.test(K.GLOW_FRAG) && /uSize/.test(K.GLOW_FRAG), 'a shard is drawn solid, as a mirror of a sky of six palette colours with long soft lights in it; the light behind falls away from its middle');
  ok(/int i = min\(int\(floor\(u\)\), 5\);/.test(K.MIRROR_FRAG) && /abs\(dot\(n, v\)\)/.test(K.MIRROR_FRAG) && /if \(vKind > 0\.5\) \{\s+col = uPal\[3\] \*/.test(K.MIRROR_FRAG) && !/vTone/.test(K.MIRROR_FRAG + K.MIRROR_VERT),
    'a shard\'s back is the same mirror as its top, so one that has tipped past edge-on still reads as glass; its cut sides are the colour of the light behind; the palette is never read past its sixth colour');

  // What the kit is told.
  {
    const def = K.definition();
    ok(JSON.stringify(def.frame) === JSON.stringify(K.FRAME) && def.frame.center !== K.FRAME.center && def.fov === 30 && def.pitch === 5 && def.cooling.length === 3 && def.cooling.every((v) => v === 0.08) && typeof def.build === 'function' && typeof def.update === 'function',
      'the kit is given the frame, the camera, and a short afterglow for the light behind the pane');
  }

  // The table.
  ok(T.VIZ_SCENES.includes('shards') && T.VIZ_USES_3D.includes('shards'), 'shards is a kit scene');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['shards']) === '{"density":50,"bloom":50,"cameraDrift":50}' && !('shards' in T.PER_VIZ_MAX), 'shards knobs: density, bloom and camera drift, all 0 to 100');
  const oldShards = T.sanitizeConfig({ activeViz: 'shards', perViz: { 'shards': { density: 80 } } });
  ok(oldShards.activeViz === 'shards' && JSON.stringify(oldShards.perViz['shards']) === '{"density":80,"bloom":50,"cameraDrift":50}', 'a saved pre-redesign shards config keeps its density and gains the new defaults');
  ok(!('shards' in T.VIZ_LABELS), 'shards keeps the name it is listed by');

  // The files.
  const order = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="shards.js"');
    order.push(pos > html.indexOf('src="ink.js"') && pos > html.indexOf('src="scene-kit.js"') && pos < html.indexOf('src="factories/'));
  }
  ok(order.every(Boolean), 'all three overlay pages load shards.js after the scene kit and ink.js and before the factories');
  const factory = await readFile(resolve(__dirname, 'overlay/factories/shards.js'), 'utf8');
  ok(/VIZ_FACTORIES\['shards'\] = TimbreScene\.factory\(\(\) => TimbreShards\.definition\(\)\);/.test(factory) && !/WebGLRenderer/.test(factory), 'the effect is the kit\'s factory around the pane\'s definition, with no renderer of its own');
  ok(!/Math\.random/.test(await readFile(resolve(__dirname, 'overlay/shards.js'), 'utf8')), 'the pane takes no numbers from Math.random, so it breaks the same way every time');
}

console.log('\n[22] jelly');
await import('./overlay/scene-kit.js');
await import('./overlay/jelly.js');
{
  const K = globalThis.TimbreJelly;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const NN = K.G * K.G * K.G, idx = (i, j, k) => i + K.G * (j + K.G * k);
  const MID = idx(4, 4, 4);
  const most = (a) => { let m = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i]) > m) m = Math.abs(a[i]); return m; };
  const finite = (a) => { for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return false; return true; };
  const quiet = new Float32Array(8);
  // A body pulled by these bands for `secs`, in frames of 1/fps.
  const run = (body, bands, secs, fps = 60, firm = 1, lift = 0) => { K.pull(body, bands, firm); for (let i = 0, n = Math.round(secs * fps); i < n; i++) K.advance(body, 1 / fps, firm, lift); return body; };
  const cornerNode = (c) => idx(c & 1 ? 8 : 0, c & 4 ? 8 : 0, c & 2 ? 8 : 0);
  const WHOLE = Math.sqrt(3) * Math.pow(3, -1 / 5);

  ok(K.BANDS === 8 && K.G === 9 && K.SKIN === 26 && K.SLAB_SKIN === 14 && K.ROUND === 5 && K.LAYERS === 4 && K.THIN === 0.25 && K.BUBBLES === 46
    && K.SPRING === 520 && K.HOLD === 260 && K.HOLD_WITHIN === 0.8 && K.REST === 5 && K.DAMP === 3 && K.VISC === 7 && K.STEP === 1 / 240 && K.STEPS_MAX === 24
    && K.RISE === 20 && K.FALL === 5 && K.QUIET === 0.06 && K.PULL === 40 && K.PULL_NEAR === 0.5 && K.SLAP === 3.4 && K.SLAP_NEAR === 0.6 && K.JOLT === 0.34 && K.TRAIL === 2.5
    && K.SQUASH_RATE === 14.5 && K.SQUASH_DAMP === 0.17 && K.SQUASH_MAX === 0.3 && K.SQUASH_BEAT === 2.6 && K.SQUASH_VOICE === 3.8
    && K.ROOM === 2 && near(K.WHOLE, WHOLE) && K.ZOOM_BACK === 2 && K.FLY_MAX === 2.4 && K.FOV === 30 && K.PITCH === 6 && JSON.stringify(K.FRAME) === '{"width":5.4,"height":4.2,"center":[0,0,0]}'
    && K.FLASH_S === 0.3 && K.REBLAST === 0.8 && K.JOSTLE === 0.55 && K.BACK_LAG === 0.16 && K.BACK_DROP === 0.48 && K.SWAY === 0.1 && K.LOOSEN === 3,
    'the sizes: a lattice of nine points an edge, four layers, steps of 1/240 s, and room for a ball of 2');
  ok(K.STIR === 0.22 && K.STIR_BUBBLE === 0.45 && K.SEED === 20261122 && K.LINGER === 0.08 && K.definition().cooling.join() === '0.08,0.08,0.08' && K.APART === 0.9 && K.SCATTER === 1.3 && K.SCATTER_UP === 0.3 && K.TILT === 1.1 && K.TWIST === 1.5
    && K.THROW === 5 && K.SPIN === 7 && K.FLY_RATE === 6.5 && K.FLY_DAMP === 0.355 && K.TURN_RATE === 5 && K.TURN_DAMP === 0.3 && K.KNOCKED === 0.24 && K.SLAB_RATE === 16 && K.SLAB_DAMP === 0.19 && K.BEND_RATE === 11 && K.BEND_DAMP === 0.146
    && K.SLAB_KICK === 4 && K.BEND_KICK === 5 && K.BEND_KICK_RANGE === 5 && K.PLOP === 3.6 && K.PLOP_BEND === 3 && K.SHAKE === 1.6 && K.SHAKE_BEND === 1.5 && K.LAND_NEAR === 0.8 && K.LAND_AT === 0.9
    && near(K.pxOf(624, 1), 624 / (2 * Math.tan(Math.PI / 12))) && near(K.pxOf(624, 2), 2 * K.pxOf(624, 1)) && near(K.pxOf(312, 1), K.pxOf(624, 1) / 2),
    'the rest of its numbers: how it brightens, where its bubbles are, how a slab is thrown, flies, flaps and lands; and how many pixels a unit is');

  // The settings and the sound.
  ok(near(K.firmOf(0), 0.5) && K.firmOf(50) === 1 && near(K.firmOf(100), 2) && near(K.firmOf(-40), 0.5) && near(K.firmOf(400), 2) && K.firmOf(undefined) === 1 && K.firmOf(NaN) === 1 && K.firmOf('9') === 1 && near(K.firmOf(75), Math.SQRT2),
    'Stiffness 0 is half as firm, 100 twice; anything that is not a number is 50');
  ok(K.loudness(null, 0, 1) === 0 && K.loudness([255], 3, 1) === 0 && near(K.loudness([51, 255], 0, 1), 0.2) && K.loudness([51, 255], 1, 2) === 1 && near(K.loudness([51], 0, 2), 0.4)
    && K.idle(0, 0) >= 0 && [0, 1, 2, 3, 4, 5, 6, 7].every((b) => [0, 1.3, 7.7, 40].every((t) => K.idle(b, t) >= 0 && K.idle(b, t) <= 0.46 + 1e-9 && near(K.idle(b, t), Math.max(0, 0.16 + 0.3 * Math.sin(0.9 * t + 1.4 * b)))))
    && K.settle(0.00009) === 0 && K.settle(0.0002) === 0.0002 && K.settle(0) === 0,
    'a band is as loud as its bin, times Gain; idle bands swell a little in turn; all but silent is silent');

  // The shape.
  {
    const o = [0, 0, 0], on = (p) => Math.pow(Math.abs(p[0]), 5) + Math.pow(Math.abs(p[1]), 5) + Math.pow(Math.abs(p[2]), 5);
    const face = K.rounded([0, 0, 0], 1, 0, 0).slice(), corner = K.rounded([0, 0, 0], 1, -1, 1).slice(), edge = K.rounded([0, 0, 0], 1, 1, 0).slice(), any = K.rounded(o, 0.3, -1, 0.7);
    ok(near(face[0], 1) && face[1] === 0 && face[2] === 0 && near(corner[0], Math.pow(3, -0.2)) && near(corner[1], -Math.pow(3, -0.2)) && near(corner[2], Math.pow(3, -0.2))
      && near(edge[0], Math.pow(2, -0.2)) && near(edge[1], Math.pow(2, -0.2)) && edge[2] === 0 && near(on(any), 1) && any === o && near(any[0] / any[2], 0.3 / 0.7) && any[1] < 0,
      'a point of a cube is drawn in toward the middle onto the rounded cube: a face\'s middle stays, a corner comes in most');
  }
  {
    const closed = (sk) => {
      const edges = new Map(); let outward = true, inRange = true;
      const P = sk.points, I = sk.index, n = P.length / 3;
      for (let t = 0; t < I.length; t += 3) {
        const a = I[t], b = I[t + 1], c = I[t + 2];
        if (a >= n || b >= n || c >= n) inRange = false;
        for (const [p, q] of [[a, b], [b, c], [c, a]]) edges.set(p + '>' + q, (edges.get(p + '>' + q) || 0) + 1);
        const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        if (!(nx * (P[a * 3] + P[b * 3] + P[c * 3]) + ny * (P[a * 3 + 1] + P[b * 3 + 1] + P[c * 3 + 1]) + nz * (P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) > 0)) outward = false;
      }
      let paired = true;
      for (const [key, count] of edges) { const [p, q] = key.split('>'); if (count !== 1 || edges.get(q + '>' + p) !== 1) paired = false; }
      let onIt = true; const seen = new Set();
      for (let i = 0; i < n; i++) {
        if (!near(Math.pow(Math.abs(P[i * 3]), 5) + Math.pow(Math.abs(P[i * 3 + 1]), 5) + Math.pow(Math.abs(P[i * 3 + 2]), 5), 1, 1e-5)) onIt = false;
        seen.add(P[i * 3].toFixed(5) + ',' + P[i * 3 + 1].toFixed(5) + ',' + P[i * 3 + 2].toFixed(5));
      }
      return { n, tris: I.length / 3, outward, inRange, paired, onIt, distinct: seen.size === n };
    };
    const small = closed(K.skin(2)), full = closed(K.skin(K.SKIN)), slab = closed(K.skin(K.SLAB_SKIN));
    ok(small.n === 26 && small.tris === 48 && full.n === 6 * 26 * 26 + 2 && full.tris === 12 * 26 * 26 && slab.n === 6 * 14 * 14 + 2
      && [small, full, slab].every((c) => c.outward && c.inRange && c.paired && c.onIt && c.distinct),
      'the skin is one closed sheet on the rounded cube: every point shared, every edge between exactly two triangles, every triangle facing out');
    const sk = K.skin(K.SKIN), norm = new Float32Array(sk.points.length);
    K.normalsOf(sk.points, sk.index, norm);
    let worst = 1, unit = true;
    for (let i = 0; i < sk.points.length; i += 3) {
      const g = [0, 1, 2].map((a) => Math.sign(sk.points[i + a]) * Math.pow(Math.abs(sk.points[i + a]), 4)), l = Math.hypot(g[0], g[1], g[2]);
      const d = (norm[i] * g[0] + norm[i + 1] * g[1] + norm[i + 2] * g[2]) / l;
      if (d < worst) worst = d;
      if (!near(Math.hypot(norm[i], norm[i + 1], norm[i + 2]), 1, 1e-5)) unit = false;
    }
    ok(unit && worst > 0.985, 'the way each point of the skin faces, found from the triangles round it, is the way the rounded cube faces there (worst ' + worst.toFixed(4) + ')');
  }
  ok(K.layerOf(-1) === 0 && K.layerOf(-0.75) === 0 && near(K.layerOf(-0.5), 0.5) && K.layerOf(-0.25) === 1 && near(K.layerOf(0), 1.5) && K.layerOf(0.25) === 2 && near(K.layerOf(0.5), 2.5) && K.layerOf(0.75) === 3 && K.layerOf(1) === 3 && K.layerOf(9) === 3 && K.layerOf(-9) === 0
    && near(K.layerOf(-0.45), 0.944606, 1e-5) && near(K.layerOf(-0.55), 0.055394, 1e-5) && K.layerOf(-0.42) === 1 && K.layerOf(-0.58) === 0
    && [0, 1, 2, 3].every((i) => near(K.slabAt(i), -0.75 + 0.5 * i) && K.slabOf(K.slabAt(i)) === i && K.layerOf(K.slabAt(i)) === i)
    && K.slabOf(-1) === 0 && K.slabOf(1) === 3 && K.slabOf(-0.51) === 0 && K.slabOf(-0.49) === 1 && K.slabOf(7) === 3 && K.slabOf(-7) === 0
    && near(K.slabWide(0), Math.pow(1 - Math.pow(0.75, 5), 0.2)) && K.slabWide(0) === K.slabWide(3) && near(K.slabWide(1), Math.pow(1 - Math.pow(0.25, 5), 0.2)) && K.slabWide(1) === K.slabWide(2) && K.slabWide(1) > K.slabWide(0),
    'four layers of equal height, each running softly into the next over a narrow band; a slab is one layer, as wide as the cube is at its height');

  // The body.
  {
    const body = K.createBody();
    let pairs = true, counts = true;
    for (let k = 0; k < 9; k++) for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) {
      const n = idx(i, j, k); let c = 0;
      for (let e = 0; e < 6; e++) { const m = body.near[n * 6 + e]; if (m < 0) break; c++; let back = false; for (let f = 0; f < 6; f++) if (body.near[m * 6 + f] === n) back = true; if (!back) pairs = false; }
      const want = (i > 0) + (i < 8) + (j > 0) + (j < 8) + (k > 0) + (k < 8);
      if (c !== want) counts = false;
      if (!near(body.home[n * 3], -1 + i / 4) || !near(body.home[n * 3 + 1], -1 + j / 4) || !near(body.home[n * 3 + 2], -1 + k / 4)) counts = false;
    }
    ok(body.u.length === NN * 3 && body.vel.length === NN * 3 && body.force.length === NN * 3 && body.near.length === NN * 6 && pairs && counts && body.left === 0 && body.pulled === false
      && near(body.hold[MID], K.REST + K.HOLD) && body.hold[cornerNode(0)] === K.REST && body.hold[idx(8, 4, 4)] === K.REST && near(body.hold[idx(5, 4, 4)], K.REST + K.HOLD * Math.pow(1 - 0.25 / 0.8, 2))
      && body.corner.length === 8 && [0, 1, 2, 3, 4, 5, 6, 7].every((c) => body.corner[c].w[cornerNode(c)] === 1 && body.corner[c].w[cornerNode(7 - c)] < 1e-10
        && near(body.corner[c].way[0], (c & 1 ? 1 : -1) / Math.sqrt(3)) && near(body.corner[c].way[1], (c & 4 ? 1 : -1) / Math.sqrt(3)) && near(body.corner[c].way[2], (c & 2 ? 1 : -1) / Math.sqrt(3))),
      'the body: each point joined to the neighbours it has, held hard at the middle and hardly at all from 0.8 out');
    const bits = (c) => (c & 1) + ((c >> 1) & 1) + ((c >> 2) & 1);
    ok(K.CORNER.slice().sort().join() === '0,1,2,3,4,5,6,7' && [0, 1, 2, 3, 4, 5, 6].every((b) => bits(K.CORNER[b] ^ K.CORNER[b + 1]) >= 2),
      'each band has a corner of its own, and neighbours in pitch never pull corners that share an edge');

    K.pull(body, quiet, 1);
    const none = most(body.force) === 0 && body.pulled === false;
    const one = new Float32Array(8); one[0] = 1;
    K.pull(body, one, 1);
    const c0 = cornerNode(K.CORNER[0]), w0 = body.corner[K.CORNER[0]].way, f0 = [body.force[c0 * 3], body.force[c0 * 3 + 1], body.force[c0 * 3 + 2]];
    const amp = K.PULL * (1 - K.QUIET);
    const far0 = cornerNode(7 - K.CORNER[0]);
    const hush = new Float32Array(8).fill(0.06); K.pull(body, hush, 1); const hushed = most(body.force) === 0 && body.pulled === false;
    const firm = K.createBody(); K.pull(firm, one, 4);
    ok(none && hushed && body.pulled === false && near(f0[0], amp * w0[0], 1e-9) && near(f0[1], amp * w0[1], 1e-9) && near(f0[2], amp * w0[2], 1e-9)
      && near(firm.force[c0 * 3], 2 * f0[0], 1e-9) && firm.pulled === true && Math.abs(firm.force[far0 * 3]) < 1e-8,
      'a band pulls its corner outward by as much as it is louder than 0.06, and pulls a firmer body harder so that it still shows');
  }
  {
    const p = [0, 0, 0], places = [];
    for (let n = 0; n < 12; n++) places.push(K.slapAt([0, 0, 0], n).slice());
    const again = K.slapAt(p, 5);
    const apart = places.every((a, i) => i === 0 || Math.hypot(a[0] - places[i - 1][0], a[1] - places[i - 1][1], a[2] - places[i - 1][2]) > 0.5);
    ok(again === p && again.join() === places[5].join() && places.every((a) => Math.abs(a[1]) <= 0.63 + 1e-9 && Math.hypot(a[0], a[2]) <= 0.9 + 1e-9 && Math.hypot(a[0], a[1], a[2]) > 0.75) && apart,
      'a beat slaps the next of a fixed round of places on the body\'s sides, each well away from the last');
    const body = K.createBody(); K.slap(body, 0);
    const at = places[0], l = Math.hypot(at[0], at[1], at[2]);
    let inward = true, nearest = -1, nd = Infinity, fastest = 0;
    for (let n = 0; n < NN; n++) {
      const d = Math.hypot(body.home[n * 3] - at[0], body.home[n * 3 + 1] - at[1], body.home[n * 3 + 2] - at[2]);
      const v = [body.vel[n * 3], body.vel[n * 3 + 1], body.vel[n * 3 + 2]], sp = Math.hypot(v[0], v[1], v[2]);
      if (d < nd) { nd = d; nearest = n; }
      if (sp > fastest) fastest = sp;
      if (!near(sp, K.SLAP * Math.exp(-d * d / (2 * K.SLAP_NEAR * K.SLAP_NEAR)), 1e-9)) inward = false;
      if (sp > 1e-12 && !near((v[0] * at[0] + v[1] * at[1] + v[2] * at[2]) / (sp * l), -1, 1e-9)) inward = false;
    }
    const farSide = idx(at[0] > 0 ? 0 : 8, 4, at[2] > 0 ? 0 : 8);
    ok(inward && most(body.u) === 0 && Math.hypot(body.vel[nearest * 3], body.vel[nearest * 3 + 1], body.vel[nearest * 3 + 2]) === fastest && fastest <= K.SLAP && fastest > 0.9 * K.SLAP
      && Math.hypot(body.vel[farSide * 3], body.vel[farSide * 3 + 1], body.vel[farSide * 3 + 2]) < 0.05,
      'a slap sets the body moving toward its middle, hardest at the place struck and hardly at all on the far side');
  }
  {
    // One step of the body, by hand.
    const h = 1 / 240, a = K.createBody();
    for (let n = 0; n < NN; n++) a.vel[n * 3 + 1] = 1;
    K.stepBody(a, 1, 0);
    const moved = [MID, cornerNode(3), idx(8, 4, 2)].every((n) => near(a.vel[n * 3 + 1], 1 - 3 * h, 1e-15) && near(a.u[n * 3 + 1], h * (1 - 3 * h), 1e-15) && a.u[n * 3] === 0 && a.vel[n * 3 + 2] === 0);
    const lifted = (firm, lift) => { const b = K.createBody(); for (let n = 0; n < NN; n++) b.u[n * 3 + 1] = 0.1; return K.stepBody(b, firm, lift); };
    const b = lifted(1, 0), b2 = lifted(2, 0), b3 = lifted(1, 0.1);
    const held = near(b.vel[MID * 3 + 1], -h * 265 * 0.1, 1e-15) && near(b.vel[cornerNode(0) * 3 + 1], -h * 5 * 0.1, 1e-15) && near(b2.vel[MID * 3 + 1], 2 * b.vel[MID * 3 + 1], 1e-15) && most(b3.vel) < 1e-15;   // not nothing: six tenths added up are not six times a tenth, to the last digit
    const c = K.createBody(); c.u[MID * 3 + 1] = 0.1;
    K.stepBody(c, 1, 0);
    const up = idx(4, 5, 4), side = idx(5, 4, 4), before = idx(3, 4, 4), far = idx(6, 4, 4);
    const joined = near(c.vel[MID * 3 + 1], -h * (6 * 520 + 265) * 0.1, 1e-13) && near(c.vel[up * 3 + 1], h * 520 * 0.1, 1e-15) && c.vel[side * 3 + 1] === c.vel[up * 3 + 1] && c.vel[before * 3 + 1] === c.vel[up * 3 + 1] && c.vel[far * 3 + 1] === 0 && c.vel[side * 3] === 0;
    const d = K.createBody(); d.vel[MID * 3] = 1;
    K.stepBody(d, 1, 0);
    const slowed = near(d.vel[MID * 3], 1 - h * (6 * 7 + 3), 1e-15) && near(d.vel[side * 3], h * 7, 1e-15) && d.vel[before * 3] === d.vel[side * 3] && d.vel[up * 3] === d.vel[side * 3] && d.vel[far * 3] === 0;
    ok(moved && held && joined && slowed, 'one step of the body, by hand: it moves as fast as it is going and slows by 3 a second; a point is drawn to its place by its hold (twice as hard in jelly twice as firm) and not at all when the lift is where it is; '
      + 'to its neighbours by the spring between them; and a point moving against its neighbours is slowed by them and carries them with it, each alike');
    // What is not rest.
    const faint = K.createBody(), fb = new Float32Array(8); fb[0] = 0.0602; run(faint, fb, 4);
    const raised = run(K.createBody(), quiet, 4, 60, 1, 5e-5);
    const drifting = K.createBody(); for (let n = 0; n < NN; n++) drifting.vel[n * 3 + 1] = 0.01;
    K.pull(drifting, quiet, 1); K.advance(drifting, h, 1, 0);
    const stillMoving = !K.atRest(drifting) && most(drifting.u) < 1e-4;
    for (let i = 0; i < 24; i++) K.advance(drifting, h, 1, 0);
    ok(faint.pulled && most(faint.u) > 3e-5 && most(faint.u) < 1e-4 && !K.atRest(faint) && near(raised.u[MID * 3 + 1], 5e-5, 5e-6) && stillMoving && most(drifting.u) > 5e-4,
      'a faint pull, a small lift and a slow drift are not taken for rest (the pull holds it ' + most(faint.u).toExponential(1) + ' out)');
  }
  {
    // At rest it stays at rest, to the last digit.
    const body = K.createBody();
    run(body, quiet, 2);
    const still = most(body.u) === 0 && most(body.vel) === 0 && K.atRest(body);
    // The steps: fixed, whatever the frame.
    const count = (fps, secs) => { const b = K.createBody(); let n = 0, each = new Set(); for (let i = 0; i < Math.round(fps * secs); i++) { const k = K.advance(b, 1 / fps, 1, 0); n += k; each.add(k); } return { n, each: [...each].sort().join(), left: b.left }; };
    const c60 = count(60, 1), c30 = count(30, 1), c144 = count(144, 1), c240 = count(240, 1), c1000 = count(1000, 1);
    const long = K.createBody(), took = K.advance(long, 1, 1, 0), took2 = K.advance(long, 0, 1, 0), took3 = K.advance(long, NaN, 1, 0), took4 = K.advance(long, -1, 1, 0);
    const part = K.createBody(), part1 = K.advance(part, 0.75 * K.STEP, 1, 0), partLeft = part.left, part2 = K.advance(part, 0.5 * K.STEP, 1, 0);
    ok(still && c60.n === 240 && c60.each === '4' && c30.n === 240 && c30.each === '8' && c144.n === 240 && c240.n === 240 && c240.each === '1' && Math.abs(c1000.n - 240) <= 1
      && took === K.STEPS_MAX && long.left === 0 && took2 === 0 && took3 === 0 && took4 === 0 && long.left === 0
      && part1 === 0 && near(partLeft, 0.75 * K.STEP, 1e-15) && part2 === 1 && near(part.left, 0.25 * K.STEP, 1e-12),
      'the body is stepped 240 times a second at any frame rate, a step only once all of it has come due; a frame of a whole second takes 24 steps and lets the rest go');
  }
  {
    // The same sound, the same wobble at 30 and 60 frames a second: to the last digit when what pulls it does not change.
    const bands = new Float32Array([0.9, 0.2, 0.6, 0, 0.4, 0.8, 0.1, 0.5]);
    const a = K.createBody(), b = K.createBody(), c = K.createBody();
    K.slap(a, 3); K.slap(b, 3); K.slap(c, 3);
    run(a, bands, 1.5, 60, 1, 0.1); run(b, bands, 1.5, 30, 1, 0.1); run(c, bands, 1.5, 120, 1, 0.1);
    let same = true; for (let i = 0; i < a.u.length; i++) if (a.u[i] !== b.u[i] || a.u[i] !== c.u[i] || a.vel[i] !== b.vel[i]) same = false;
    ok(same && most(a.u) > 0.05 && finite(a.u), 'the same pull, slap and lift give the same body at 30, 60 and 120 frames a second, to the last digit');
  }
  {
    // A slap rings and dies away; the body ends exactly at rest.
    const body = K.createBody(); K.slap(body, 0);
    const at = K.slapAt([0, 0, 0], 0);
    const nearNode = idx(Math.round((at[0] + 1) * 4), Math.round((at[1] + 1) * 4), Math.round((at[2] + 1) * 4)), farNode = idx(8 - Math.round((at[0] + 1) * 4), Math.round((at[1] + 1) * 4), 8 - Math.round((at[2] + 1) * 4));
    const mag = (n) => Math.hypot(body.u[n * 3], body.u[n * 3 + 1], body.u[n * 3 + 2]);
    let tNear = -1, tFar = -1, peakFar = 0, peak = 0;
    K.pull(body, quiet, 1);
    for (let i = 0; i < 240; i++) {
      K.advance(body, 1 / 240, 1, 0);
      if (tNear < 0 && mag(nearNode) > 0.02) tNear = i; if (tFar < 0 && mag(farNode) > 0.02) tFar = i;
      peakFar = Math.max(peakFar, mag(farNode)); peak = Math.max(peak, most(body.u));
    }
    const ringing = !K.atRest(body);
    for (let i = 0; i < 60 * 14; i++) K.advance(body, 1 / 60, 1, 0);
    ok(tNear >= 0 && tFar > tNear + 20 && tFar < 150 && peakFar > 0.02 && peak > 0.1 && peak < 0.6 && ringing && K.atRest(body) && most(body.u) === 0 && most(body.vel) === 0,
      'a slap\'s wave reaches the far side a good tenth of a second after the near (near at step ' + tNear + ', far at ' + tFar + ', most ' + peak.toFixed(3) + '), rings, and leaves the body exactly at rest');
  }
  {
    // Held at the middle: a pull on a corner moves the corner, not the middle; let go, it comes back.
    const one = new Float32Array(8); one[2] = 1;
    const c = K.CORNER[2], node = cornerNode(c), body = run(K.createBody(), one, 4), way = body.corner[c].way;
    const cu = [body.u[node * 3], body.u[node * 3 + 1], body.u[node * 3 + 2]], along = cu[0] * way[0] + cu[1] * way[1] + cu[2] * way[2], off = Math.hypot(cu[0] - along * way[0], cu[1] - along * way[1], cu[2] - along * way[2]);
    const mid = Math.hypot(body.u[MID * 3], body.u[MID * 3 + 1], body.u[MID * 3 + 2]);
    const opposite = cornerNode(7 - c), opp = Math.hypot(body.u[opposite * 3], body.u[opposite * 3 + 1], body.u[opposite * 3 + 2]);
    const soft = run(K.createBody(), one, 4, 60, 0.5), hard = run(K.createBody(), one, 4, 60, 2);
    const dAt = (b) => Math.hypot(b.u[node * 3], b.u[node * 3 + 1], b.u[node * 3 + 2]);
    run(body, quiet, 14);
    ok(along > 0.3 && along < 0.5 && off < 1e-6 && mid < along / 3 && mid > along / 5 && opp < along / 3 && near(dAt(soft) / along, Math.SQRT2, 0.01) && near(dAt(hard) / along, Math.SQRT1_2, 0.01) && K.atRest(body) && most(body.u) === 0,
      'a band at full pulls its corner out by ' + along.toFixed(3) + ' along the corner\'s own line, and the softly held middle after it by under a third of that (' + mid.toFixed(3) + '); softer jelly goes 1.4 times as far, firmer 0.7; let go, it comes back to rest');
  }
  {
    // Lifted at the middle, the whole body follows, the outside last.
    const body = K.createBody(); K.pull(body, quiet, 1);
    let midFirst = -1, cornFirst = -1; const cn = cornerNode(5);
    for (let i = 0; i < 240; i++) { K.advance(body, 1 / 240, 1, 0.2); if (midFirst < 0 && body.u[MID * 3 + 1] > 0.1) midFirst = i; if (cornFirst < 0 && body.u[cn * 3 + 1] > 0.1) cornFirst = i; }
    for (let i = 0; i < 60 * 12; i++) K.advance(body, 1 / 60, 1, 0.2);
    let all = true; for (let n = 0; n < NN; n++) if (!near(body.u[n * 3 + 1], 0.2, 2e-4) || Math.abs(body.u[n * 3]) > 2e-4 || Math.abs(body.u[n * 3 + 2]) > 2e-4) all = false;
    ok(midFirst >= 0 && cornFirst > midFirst + 15 && all && !K.atRest(body), 'a lift of the middle carries the whole body with it, the corners a good while after the middle (' + midFirst + ' and ' + cornFirst + ' steps)');
  }
  {
    // Fine ripples die before slow wobbles do.
    const fine = K.createBody(), slow = K.createBody();
    for (let k = 0; k < 9; k++) for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { const n = idx(i, j, k); fine.u[n * 3 + 1] = ((i + j + k) % 2 ? 0.1 : -0.1); slow.u[n * 3 + 1] = 0.1 * Math.sin(Math.PI * i / 8); }
    const energy = (b) => { let e = 0; for (let i = 0; i < b.u.length; i++) e += b.u[i] * b.u[i] + b.vel[i] * b.vel[i] / K.SPRING; return e; };
    const f0 = energy(fine), s0 = energy(slow);
    run(fine, quiet, 0.25, 240); run(slow, quiet, 0.25, 240);
    ok(energy(fine) / f0 < 0.02 && energy(slow) / s0 > 0.15 && energy(slow) / s0 > 10 * energy(fine) / f0, 'a quarter of a second on, a point-to-point ripple has all but gone and a slow wobble has not ('
      + (energy(fine) / f0).toFixed(4) + ' and ' + (energy(slow) / s0).toFixed(3) + ' of what they had)');
  }
  {
    // The loudest din, the softest and the firmest jelly: it never runs away.
    const worst = (firm) => { const b = K.createBody(), full = new Float32Array(8).fill(1); let m = 0; K.pull(b, full, firm); for (let i = 0; i < 60 * 20; i++) { if (i % 14 === 0) K.slap(b, i / 14); K.advance(b, 1 / 60, firm, i % 30 < 15 ? K.JOLT : 0); m = Math.max(m, most(b.u)); } return { m, ok: finite(b.u) && finite(b.vel) }; };
    const a = worst(0.5), b = worst(1), c = worst(2), d = worst(2.0001);
    ok(a.ok && b.ok && c.ok && d.ok && a.m < 1.6 && b.m < 1.2 && c.m < 0.9 && c.m < b.m && b.m < a.m, 'twenty seconds of every band at full, a slap four times a second and the middle thrown up and down: the body stays whole at Stiffness 0, 50 and 100 (it moves at most '
      + a.m.toFixed(2) + ', ' + b.m.toFixed(2) + ' and ' + c.m.toFixed(2) + ')');
  }
  {
    // Reading the lattice between its points.
    const body = K.createBody(), lin = (x, y, z) => [0.1 * x - 0.2 * y + 0.05 * z + 0.3, 0.15 * x + 0.4 * y - 0.1 * z, 0.1 * x + 0.2 * y - 0.3 * z];
    for (let n = 0; n < NN; n++) { const v = lin(body.home[n * 3], body.home[n * 3 + 1], body.home[n * 3 + 2]); body.u[n * 3] = v[0]; body.u[n * 3 + 1] = v[1]; body.u[n * 3 + 2] = v[2]; }
    const pts = [[0, 0, 0], [0.33, -0.71, 0.12], [1, 1, 1], [-1, -1, -1], [0.999, -0.5, 0.25], [-0.125, 0.875, -1]];
    const cells = new Int32Array(pts.length), fracs = new Float32Array(pts.length * 3), out = [0, 0, 0];
    let exact = true, inCell = true;
    pts.forEach((p, i) => {
      K.locate(cells, fracs, i, p[0], p[1], p[2]);
      const got = K.sample(out, body.u, cells[i], fracs[i * 3], fracs[i * 3 + 1], fracs[i * 3 + 2]), want = lin(p[0], p[1], p[2]);
      if (got !== out || !near(got[0], want[0], 3e-5) || !near(got[1], want[1], 3e-5) || !near(got[2], want[2], 3e-5)) exact = false;   // a point on the cube's far sides is read a ten-thousandth of a cell inside
      const ci = cells[i] % 9, cj = Math.floor(cells[i] / 9) % 9, ck = Math.floor(cells[i] / 81);
      if (ci > 7 || cj > 7 || ck > 7 || fracs[i * 3] < 0 || fracs[i * 3] > 1 || fracs[i * 3 + 1] > 1 || fracs[i * 3 + 2] > 1) inCell = false;
    });
    K.locate(cells, fracs, 0, 5, -5, 0); const held = K.sample(out, body.u, cells[0], fracs[0], fracs[1], fracs[2]).slice(), edge = lin(1, -1, 0);
    const speed = new Float64Array(NN); for (let n = 0; n < NN; n++) speed[n] = 2 + body.home[n * 3];
    K.locate(cells, fracs, 1, 0.3, 0.1, -0.6);
    ok(exact && inCell && near(held[0], edge[0], 1e-3) && near(held[1], edge[1], 1e-3) && near(K.sampleOne(speed, cells[1], fracs[3], fracs[4], fracs[5]), 2.3, 1e-5),
      'between its points the lattice is read off evenly: a field that changes evenly is read back exactly anywhere in the cube, and a point outside is read at the cube\'s side');
  }
  {
    // The skin drawn from the body.
    const sk = K.skin(K.SKIN), V = sk.points.length / 3, cells = new Int32Array(V), fracs = new Float32Array(V * 3), pos = new Float32Array(V * 3), stir = new Float32Array(V);
    for (let i = 0; i < V; i++) K.locate(cells, fracs, i, sk.points[i * 3], sk.points[i * 3 + 1], sk.points[i * 3 + 2]);
    const body = K.createBody();
    const r0 = K.shape(pos, stir, body, sk.points, cells, fracs, 0, 0.22);
    let same = true; for (let i = 0; i < pos.length; i++) if (pos[i] !== sk.points[i]) same = false;
    const r1 = K.shape(pos, stir, body, sk.points, cells, fracs, 0.2, 0.22);
    let squashed = true; const wide = 1 / Math.sqrt(0.8);
    for (let i = 0; i < V; i++) if (!near(pos[i * 3], sk.points[i * 3] * wide, 1e-6) || !near(pos[i * 3 + 1], sk.points[i * 3 + 1] * 0.8, 1e-6) || !near(pos[i * 3 + 2], sk.points[i * 3 + 2] * wide, 1e-6)) squashed = false;
    for (let n = 0; n < NN; n++) { body.u[n * 3] = 0.1; body.vel[n * 3 + 2] = 2; }
    const measured = K.measure(body) === body && body.speed[MID] === 2 && body.speed[0] === 2 && near(body.most, 0.1, 1e-12);
    const one = K.createBody(); one.u[0] = 0.3; one.u[1] = 0.4; K.measure(one);
    const firstFar = near(one.most, 0.5, 1e-6);   // the furthest point is the furthest, wherever in the body it is
    const r2 = K.shape(pos, stir, body, sk.points, cells, fracs, 0, 0.22);
    let moved = true; for (let i = 0; i < V; i++) if (!near(pos[i * 3], sk.points[i * 3] + 0.1, 1e-6) || !near(pos[i * 3 + 1], sk.points[i * 3 + 1], 1e-6) || !near(stir[i], 0.44, 1e-6)) moved = false;
    for (let n = 0; n < NN; n++) body.u[n * 3] = -0.1;
    const r3 = K.shape(pos, stir, body, sk.points, cells, fracs, 0, 0.22); let far3 = 0; for (let i = 0; i < V; i++) far3 = Math.max(far3, Math.hypot(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
    const r4 = K.shape(pos, stir, body, sk.points, cells, fracs, 0.9, 0.22), r5 = K.shape(pos, stir, body, sk.points, cells, fracs, 0.3, 0.22), r6 = K.shape(pos, stir, body, sk.points, cells, fracs, -0.9, 0.22), r7 = K.shape(pos, stir, body, sk.points, cells, fracs, -0.3, 0.22);
    for (let n = 0; n < NN; n++) body.vel[n * 3 + 2] = 50;
    K.measure(body);
    K.shape(pos, stir, body, sk.points, cells, fracs, 0, 0.22);
    ok(same && measured && firstFar && near(r0, WHOLE, 1e-6) && most(stir) === 1 && squashed && r1 > r0 && moved && r2 > r0 && near(body.most, 0.1, 1e-9) && near(r3, far3, 1e-6) && r3 > r0 && r4 === r5 && r6 === r7 && Number.isFinite(r4) && r6 !== r4
      && K.shownSquash(0.2) === 0.2 && K.shownSquash(0.9) === 0.3 && K.shownSquash(-0.9) === -0.3 && near(K.wideFor(0.2) * K.wideFor(0.2) * (1 - 0.2), 1) && near(K.wideFor(-0.3) * K.wideFor(-0.3) * 1.3, 1) && K.wideFor(0) === 1,
      'at rest the skin is the rounded cube, its furthest point ' + r0.toFixed(4) + ' from the middle; squashed it is flatter and wider by as much as keeps its volume; it brightens where the body is moving');
  }

  // A spring let go.
  {
    const a = [1, 0], b = [1, 0]; K.spring(a, 0.2, 12, 0.3); K.spring(b, 0.1, 12, 0.3); K.spring(b, 0.1, 12, 0.3);
    const c = [0, 3], d = [0, 3]; K.spring(c, 0.07, 9, 0.2, 0.5); for (let i = 0; i < 7; i++) K.spring(d, 0.01, 9, 0.2, 0.5);
    const e = [1, 0]; let low = 0; for (let i = 0; i < 4000; i++) { K.spring(e, 0.001, 10, 0.25); if (e[0] < low) low = e[0]; }
    const g = [0.3, -2]; for (let i = 0; i < 600; i++) K.spring(g, 1 / 60, 14.5, 0.17, 0.25);
    const h = [0.25, 0]; K.spring(h, 0.5, 8, 0.4, 0.25);
    const ret = K.spring(a, 0, 12, 0.3);
    ok(near(a[0], b[0], 1e-12) && near(a[1], b[1], 1e-12) && near(c[0], d[0], 1e-12) && near(c[1], d[1], 1e-12) && near(low, -Math.exp(-Math.PI * 0.25 / Math.sqrt(1 - 0.0625)), 2e-3)
      && g[0] === 0.25 && g[1] === 0 && h[0] === 0.25 && h[1] === 0 && ret === a,
      'a spring let go swings past where it is going by a share its damping sets, and comes to rest there exactly; two half steps are one whole');
  }

  // The slabs.
  {
    const sl = K.createSlabs(), zero = ['p', 'v', 'r', 'rv', 'tp', 'tr', 'from', 'fromR', 'shown', 'turned'].every((k) => sl[k].length === 12 && most(sl[k]) === 0)
      && ['q', 'qv', 'bend', 'bv', 'loose', 'looseFrom'].every((k) => sl[k].length === 4 && most(sl[k]) === 0) && sl.landed.length === 4;
    const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
    K.throwSlabs(sl, 1, K.rng(1001), true);
    const sl2 = K.createSlabs(); K.throwSlabs(sl2, 1, K.rng(1001), true);
    const sl3 = K.createSlabs(); K.throwSlabs(sl3, 1, K.rng(1002), true);
    let bounds = true, kicked = true;
    for (let i = 0; i < 4; i++) {
      const j = i * 3;
      if (Math.abs(sl.tp[j]) > 0.65 || Math.abs(sl.tp[j + 2]) > 0.65 || Math.abs(sl.tp[j + 1] - 0.9 * K.slabAt(i)) > 0.15 || Math.abs(sl.tr[j]) > 0.55 || Math.abs(sl.tr[j + 1]) > 0.75 || Math.abs(sl.tr[j + 2]) > 0.55) bounds = false;
      for (let a = 0; a < 3; a++) if (!near(sl.v[j + a], 5 * sl.tp[j + a], 1e-12) || Math.abs(sl.rv[j + a]) > 3.5 || sl.p[j + a] !== 0 || sl.r[j + a] !== 0) kicked = false;
      if (sl.q[i] !== 0.24 || sl.qv[i] !== -4 || sl.bend[i] !== 0 || Math.abs(sl.bv[i]) < 5 || Math.abs(sl.bv[i]) > 10 || sl.landed[i] !== 0 || sl.loose[i] !== 0) kicked = false;
    }
    const ordered = [0, 1, 2].every((i) => K.slabAt(i) + sl.tp[i * 3 + 1] < K.slabAt(i + 1) + sl.tp[i * 3 + 4]);
    // Thrown again, not fresh: on top of what it has, from where it is.
    const was = { v: Array.from(sl.v), q: Array.from(sl.q), qv: Array.from(sl.qv), rv: Array.from(sl.rv), bv: Array.from(sl.bv) };
    for (let i = 0; i < 12; i++) sl.p[i] = 0.1;
    K.throwSlabs(sl, 0.5, seq([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.9, 0.9, 0.9, 0.2, 0.5]), false);   // for each slab: its place, its turn, its spin, which way it flaps, how hard
    let again = true;
    for (let i = 0; i < 4; i++) { const j = i * 3; if (!near(sl.tp[j], 0) || !near(sl.tp[j + 1], 0.9 * K.slabAt(i)) || !near(sl.v[j], was.v[j] + (0 - 0.1) * 5 * 0.5, 1e-12) || sl.q[i] !== was.q[i] || !near(sl.qv[i], was.qv[i] - 2, 1e-12) || sl.p[j] !== 0.1
      || !near(sl.rv[j], was.rv[j] + 1.4, 1e-12) || !near(sl.rv[j + 2], was.rv[j + 2] + 1.4, 1e-12) || !near(sl.bv[i], was.bv[i] - 3.75, 1e-12)) again = false; }
    const lo = K.createSlabs(); lo.loose.fill(1); lo.landed.fill(1); lo.p.fill(3); lo.bend.fill(0.2); K.throwSlabs(lo, 1, K.rng(5), true);
    const afresh = most(lo.loose) === 0 && most(lo.landed) === 0 && most(lo.p) === 0 && most(lo.bend) === 0;
    ok(zero && bounds && kicked && ordered && Array.from(sl2.tp).join() !== Array.from(sl3.tp).join() && Array.from(sl2.bv).join() !== Array.from(sl3.bv).join() && (() => { const f = K.createSlabs(); K.throwSlabs(f, 1, K.rng(1001), true); return Array.from(f.tp).join() === Array.from(sl2.tp).join() && Array.from(f.rv).join() === Array.from(sl2.rv).join(); })() && again && afresh,
      'a thump throws each slab toward a place of its own, still in the stack\'s order, squashed and set flapping; the same thump is the same throw; a second throw adds to the first');
  }
  {
    const sl = K.createSlabs(), half = K.createSlabs();
    K.throwSlabs(sl, 1, K.rng(1003), true); K.throwSlabs(half, 1, K.rng(1003), true);
    let over = 0;
    K.flySlabs(sl, 0.2); K.flySlabs(half, 0.1); K.flySlabs(half, 0.1);
    let exact = true; for (let i = 0; i < 12; i++) if (!near(sl.p[i], half.p[i], 1e-12) || !near(sl.r[i], half.r[i], 1e-12) || !near(sl.v[i], half.v[i], 1e-11)) exact = false;
    const loose = near(sl.loose[0], 1 - Math.exp(-0.6), 1e-12) && near(half.loose[0], sl.loose[0], 1e-12);
    for (let i = 0; i < 600; i++) { K.flySlabs(sl, 1 / 60); for (let j = 0; j < 12; j++) if (Math.abs(sl.tp[j]) > 0.2) over = Math.max(over, sl.p[j] / sl.tp[j]); }
    let there = true; for (let i = 0; i < 12; i++) if (sl.p[i] !== sl.tp[i] || sl.r[i] !== sl.tr[i] || sl.v[i] !== 0 || sl.rv[i] !== 0) there = false;
    ok(exact && loose && over > 1.2 && over < 1.7 && there && near(sl.loose[3], 1, 1e-6), 'thrown, a slab swings out past its place (by up to ' + (over * 100 - 100).toFixed(0) + '%) and settles on it exactly; its flight is the same in one step or two');
  }
  {
    // What is drawn: never further than FLY_MAX from its place, and swaying a little once it is loose.
    const sl = K.createSlabs();
    sl.p.set([0.1, 0, 0, 0, 9, 0, 3, 4, 0, -100, 100, 100]); sl.r.set([0.2, 0.3, 0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0]); sl.loose.set([0, 1, 0.5, 1]);
    K.showSlabs(sl, 2);
    const long = (i) => Math.hypot(sl.shown[i * 3], sl.shown[i * 3 + 1], sl.shown[i * 3 + 2]);
    const sway = [0, 0, 0]; K.swayAt(sway, 1, 2);
    ok(near(long(0), 2.4 * Math.tanh(0.1 / 2.4)) && near(long(1), 2.4 * Math.tanh(9 / 2.4)) && near(long(2), 2.4 * Math.tanh(5 / 2.4)) && near(sl.shown[6] / sl.shown[7], 0.75) && long(3) <= 2.4 && long(3) > 2.39 && sl.shown[9] < 0
      && sl.turned[0] === 0.2 && sl.turned[1] === 0.3 && sl.turned[2] === 0.4 && near(sl.turned[3], 0.1 * Math.sin(0.9 * 2 + 1)) && sl.turned[4] === 0 && near(sl.turned[5], 0.1 * Math.sin(0.7 * 2 + 2))
      && near(sway[0], sl.turned[3]) && sway[1] === 0 && near(sway[2], sl.turned[5]) && near(sl.turned[6], 0.05 * Math.sin(0.9 * 2 + 2)),
      'a slab is drawn the way it has flown but never further than 2.4 from its place, and once loose it sways a little');
  }
  {
    // The way back: from the bottom up, each speeding up into its landing.
    ok(K.backShare(0, 0) === 0 && near(K.backShare(0.24, 0), 0.5) && K.backShare(0.48, 0) === 1 && K.backShare(1, 0) === 1 && K.backShare(0.16, 1) === 0 && near(K.backShare(0.4, 1), 0.5) && K.backShare(0.64, 1) === 1
      && K.backShare(0.48, 3) === 0 && near(K.backShare(0.72, 3), 0.5) && near(K.backShare(0.96, 3), 1) && K.backShare(1, 3) === 1 && K.backShare(-1, 0) === 0,
      'on the way back the bottom slab sets off first and each of the others 0.16 of the way later; each takes 0.48 of the way, so the top one lands just before the end');
    const sl = K.createSlabs(); K.throwSlabs(sl, 1, K.rng(1004), true);
    for (let i = 0; i < 120; i++) K.flySlabs(sl, 1 / 60);
    K.showSlabs(sl, 5);
    const shown = Array.from(sl.shown), turned = Array.from(sl.turned), loose = Array.from(sl.loose);
    const r4 = sl.r[4]; sl.r[4] = 2 * Math.PI + 0.3; sl.landed.fill(1);
    K.startBack(sl);
    const started = Array.from(sl.from).join() === shown.join() && near(sl.fromR[4], 0.3, 1e-12) && near(sl.fromR[0], sl.r[0]) && most(sl.v) === 0 && most(sl.rv) === 0 && most(sl.landed) === 0 && Array.from(sl.looseFrom).join() === loose.join();
    sl.fromR[4] = r4; sl.r[4] = r4;
    const n0 = K.placeSlabs(sl, 0, 5);
    let atStart = n0 === 0; for (let i = 0; i < 12; i++) if (!near(sl.shown[i], shown[i], 1e-12) || !near(sl.turned[i], turned[i], 1e-9)) atStart = false;
    const heights = []; let landings = 0, order = [], smooth = true, last = Array.from(sl.shown);
    for (let k = 1; k <= 400; k++) {
      const got = K.placeSlabs(sl, k / 400, 5);
      for (let i = 0; i < 4; i++) if (sl.landed[i] && !order.includes(i)) order.push(i);
      landings += got;
      for (let i = 0; i < 12; i++) { if (Math.abs(sl.shown[i] - last[i]) > 0.02) smooth = false; last[i] = sl.shown[i]; }
      if (k === 96) heights.push(Math.hypot(sl.shown[0], sl.shown[1], sl.shown[2]) / Math.hypot(shown[0], shown[1], shown[2]));
    }
    const quarter = K.createSlabs(); K.throwSlabs(quarter, 1, K.rng(1004), true); for (let i = 0; i < 120; i++) K.flySlabs(quarter, 1 / 60); K.showSlabs(quarter, 5); K.startBack(quarter);
    K.placeSlabs(quarter, 0.12, 5); const early = Math.hypot(quarter.shown[0], quarter.shown[1], quarter.shown[2]) / Math.hypot(shown[0], shown[1], shown[2]);
    ok(started && atStart && landings === 4 && order.join() === '0,1,2,3' && smooth && most(sl.shown) === 0 && most(sl.turned) === 0 && most(sl.r) === 0 && most(sl.loose) === 0 && near(heights[0], 0.75, 1e-9) && near(early, 1 - 0.0625, 1e-9),
      'coming back, each slab starts from where it was drawn and turns the short way home; it has come a sixteenth of the way after a quarter of its time and a quarter after half; they land in order, once each, flat and in place');
  }
  {
    // A landing: the slab squashes, and the ones beneath are shaken; the ones above are not.
    const sl = K.createSlabs(); K.plop(sl, 2);
    ok(sl.landed[2] === 1 && sl.qv[2] === 3.6 && sl.bv[2] === 3 && sl.qv[0] === 1.6 && sl.qv[1] === 1.6 && sl.bv[0] === -1.5 && sl.bv[1] === 1.5 && sl.qv[3] === 0 && sl.bv[3] === 0 && sl.landed[0] === 0
      && (() => { const t = K.createSlabs(); K.plop(t, 1); return t.bv[1] === -3 && t.bv[0] === -1.5 && t.qv[2] === 0; })(),
      'a slab that lands squashes and flaps, and shakes the slabs beneath it less; a slab above it feels nothing');
    // Slabs still in the air when the cube sets (a frame so long that it carried the last one past its landing) have landed all the same.
    const late = K.createSlabs(); K.plop(late, 0); K.plop(late, 1);
    const n1 = K.landAll(late), n2 = K.landAll(late), n3 = K.landAll(K.createSlabs());
    ok(n1 === 2 && n2 === 0 && n3 === 4 && Array.from(late.landed).join() === '1,1,1,1' && late.qv[3] === 0, 'slabs that had not landed when the cube sets are counted as landed, once');
    // The voice and the bands still move a slab in the air.
    const a = K.createSlabs(), b = K.createSlabs(), bands = new Float32Array([0.9, 0.1, 0.2, 0.2, 0, 0.8, 0.5, 0.5]);
    K.wobbleSlabs(a, 0.12, 0.3, bands, 1); K.wobbleSlabs(b, 0.06, 0.3, bands, 1); K.wobbleSlabs(b, 0.06, 0, bands, 1);
    const c = K.createSlabs(); for (let i = 0; i < 900; i++) K.wobbleSlabs(c, 1 / 60, 0, bands, 1);
    const d = K.createSlabs(), e = K.createSlabs(); K.wobbleSlabs(d, 0.05, 1, quiet, 1); K.wobbleSlabs(e, 0.05, 1, quiet, 4);
    ok(near(a.q[0], b.q[0], 1e-12) && near(a.bend[0], b.bend[0], 1e-12) && near(a.bv[3], b.bv[3], 1e-12) && a.q[0] > 0 && a.q[1] === a.q[0]
      && near(c.bend[0], K.BEND_LEAN * 0.8, 1e-7) && c.bend[1] === 0 && near(c.bend[2], K.BEND_LEAN * -0.8, 1e-7) && c.bend[3] === 0 && c.bv[0] === 0 && c.q[0] === 0
      && d.bend[0] > 0 && d.bend[1] < 0 && near(d.bend[0], -d.bend[1], 1e-12) && e.q[0] < d.q[0] * 0.95 && e.bend[0] < d.bend[0] * 0.9 && K.BEND_LEAN === 0.21 && K.SLAB_VOICE === 2.2 && K.BEND_VOICE === 3,
      'in the air a slab still squashes with each syllable and leans with its own two bands, by 0.21 of how much louder one is than the other; a firmer slab springs back sooner');
  }
  {
    // Coming back, thrown again: flight takes up from where each slab is drawn.
    const sl = K.createSlabs(); K.throwSlabs(sl, 1, K.rng(1005), true);
    for (let i = 0; i < 90; i++) K.flySlabs(sl, 1 / 60);
    K.showSlabs(sl, 3); K.startBack(sl); K.placeSlabs(sl, 0.55, 3);
    const shown = Array.from(sl.shown), turned = Array.from(sl.turned), landed = Array.from(sl.landed).join();
    K.resumeSlabs(sl); K.showSlabs(sl, 3);
    let same = true; for (let i = 0; i < 12; i++) if (!near(sl.shown[i], shown[i], 1e-9) || !near(sl.turned[i], turned[i], 1e-9)) same = false;
    ok(same && landed === '1,0,0,0' && most(sl.landed) === 0 && most(sl.v) === 0, 'a slab on its way back that is thrown again is drawn, at that moment, exactly where it was, and one that had landed is in the air again');
    sl.landed.fill(1);
    const home = K.homeSlabs(sl);
    ok(home === sl && ['p', 'v', 'r', 'rv', 'tp', 'tr', 'from', 'fromR', 'shown', 'turned', 'q', 'qv', 'bend', 'bv', 'loose', 'looseFrom', 'landed'].every((k) => most(sl[k]) === 0), 'set into one cube again, nothing is left of the slabs\' flight');
  }
  {
    // Where a point of a slab is drawn: turned about the slab's middle (about z, then y, then x, as three.js turns a group), then moved.
    const sl = K.createSlabs(), o = [0, 0, 0];
    const at = K.slabPoint(o, sl, 2, 0.3, 0.1, -0.2).slice();
    sl.shown.set([0.5, -0.25, 1], 3);
    const moved = K.slabPoint([0, 0, 0], sl, 1, 0.3, 0.1, -0.2);
    sl.turned.set([Math.PI / 2, 0, 0], 0);
    const rx = K.slabPoint([0, 0, 0], sl, 0, 0, 0, 1);
    sl.turned.set([0, Math.PI / 2, 0], 0);
    const ry = K.slabPoint([0, 0, 0], sl, 0, 0, 0, 1);
    sl.turned.set([0, 0, Math.PI / 2], 0);
    const rz = K.slabPoint([0, 0, 0], sl, 0, 1, 0, 0);
    sl.turned.set([0.4, -0.7, 1.1], 0);
    const all = K.slabPoint([0, 0, 0], sl, 0, 0.3, 0.2, -0.5);
    const Rz = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]], Ry = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)], Rx = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
    const want = Rx(Ry(Rz([0.3, 0.2, -0.5], 1.1), -0.7), 0.4);
    ok(near(at[0], 0.3) && near(at[1], 0.1 + 0.25) && near(at[2], -0.2) && near(moved[0], 0.8) && near(moved[1], 0.1 - 0.25 - 0.25) && near(moved[2], 0.8)
      && near(rx[0], 0) && near(rx[1], -1 - 0.75) && near(rx[2], 0, 1e-9) && near(ry[0], 1) && near(ry[1], -0.75) && near(ry[2], 0, 1e-9) && near(rz[0], 0, 1e-9) && near(rz[1], 1 - 0.75) && near(rz[2], 0)
      && near(all[0], want[0]) && near(all[1], want[1] - 0.75) && near(all[2], want[2]),
      'a point of a slab is turned about the slab\'s own middle and carried with it');
  }
  {
    // How far anything of the slabs is from the middle: nothing drawn is further.
    const sk = K.skin(K.SLAB_SKIN), o = [0, 0, 0], random = K.rng(77);
    let covers = true, tight = 0, flat = K.reachOf(K.createSlabs());
    for (let t = 0; t < 60; t++) {
      const sl = K.createSlabs();
      for (let i = 0; i < 12; i++) { sl.shown[i] = (random() - 0.5) * 3; sl.turned[i] = (random() - 0.5) * 6; }
      for (let i = 0; i < 4; i++) { sl.q[i] = (random() - 0.5) * 1.2; sl.bend[i] = (random() - 0.5) * 1.2; }
      const reach = K.reachOf(sl); let far = 0;
      for (let i = 0; i < 4; i++) for (let j = 0; j < sk.points.length; j += 3) {
        const w = K.slabWide(i);
        K.bent(o, sk.points[j] * w, sk.points[j + 1] * K.THIN, sk.points[j + 2] * w, sl.q[i], sl.bend[i]);
        K.slabPoint(o, sl, i, o[0], o[1], o[2]);
        far = Math.max(far, Math.hypot(o[0], o[1], o[2]));
      }
      if (far > reach + 1e-9) covers = false;
      tight = Math.max(tight, far / reach);
    }
    const b0 = K.bent([0, 0, 0], 0.5, 0.1, -0.5, 0, 0).join(), b1 = K.bent([0, 0, 0], 1, 0.1, 0, 0, 0.2), b2 = K.bent([0, 0, 0], 1, 0.2, 0.5, 0.19, 0), b3 = K.bent([0, 0, 0], 1, 0.2, 0, 0.9, 0.9), b4 = K.bent([0, 0, 0], 1, 0.2, 0, 0.3, 0.3);
    const h0 = K.slabHalf([0, 0], 0, 0, 0), h1 = K.slabHalf([0, 0], 1, 0.2, -0.9);
    ok(covers && tight > 0.93 && near(flat, Math.hypot(h0[0], 1)) && near(h0[0], Math.SQRT2 * Math.pow(2, -0.2) * K.slabWide(0)) && h0[1] === 0.25
      && near(h1[0], Math.SQRT2 * Math.pow(2, -0.2) * K.slabWide(1) / Math.sqrt(0.8)) && near(h1[1], (0.25 + 0.3 * K.BEND_SPAN) * 0.8) && K.BEND_SPAN === 0.82 && K.BEND_MAX === 0.3
      && b0 === '0.5,0.1,-0.5' && near(b1[1], 0.1 + 0.2 * 0.3) && b1[0] === 1 && near(b2[0], 1 / Math.sqrt(0.81)) && near(b2[1], 0.2 * 0.81) && near(b2[2], 0.5 / Math.sqrt(0.81)) && b3.join() === b4.join(),
      'however the slabs lie, turned, squashed and bent, no point of any is further from the middle than the reach worked out for them (the furthest came to ' + (tight * 100).toFixed(0) + '% of it)');
  }

  // Room in the picture.
  {
    const z = [1]; let t = 0.6; const steps = []; for (let i = 0; i < 5; i++) { t = K.zoomAfter(t, 1, 0.1); steps.push(t); }
    let back = 0.5, n = 0; while (back !== 1 && n < 2000) { back = K.zoomAfter(back, 1, 1 / 60); n++; }
    ok(K.limitFor(1) === 2 && K.limitFor(0.4) === 2 && near(K.limitFor(1.25), 1.6) && near(K.limitFor(2), K.WHOLE) && near(K.limitFor(9), K.WHOLE) && K.limitFor(undefined) === 2 && K.limitFor(NaN) === 2 && K.limitFor.length === 1
      && K.roomFor(1.5, 2) === 1 && K.roomFor(2, 2) === 1 && near(K.roomFor(4, 2), 0.5) && near(K.roomFor(3, 1.5), 0.5) && K.roomFor(3) === 2 / 3
      && K.zoomAfter(1, 0.7, 0.01) === 0.7 && K.zoomAfter(0.9, 0.7, 5) === 0.7 && near(K.zoomAfter(0.6, 1, 0.1), 0.6 + 0.4 * (1 - Math.exp(-0.2))) && steps.every((v, i) => i === 0 || v > steps[i - 1]) && back === 1 && n < 600
      && near(K.zoomAfter(K.zoomAfter(0.6, 1, 0.05), 1, 0.05), K.zoomAfter(0.6, 1, 0.1), 1e-12) && K.zoomAfter(0.5, 0.8, 0) === 0.5,
      'it has room for a ball of 2, less by as much as the Scene Size slider enlarges the picture, but never less than the cube at rest takes; it is drawn smaller at once and grows back slowly, to exactly its size');
  }
  {
    // The cube set again: the last landing shakes it from the top.
    const body = K.createBody(); body.u.fill(0.3); body.vel.fill(1); body.left = 0.003; body.pulled = true;
    const got = K.land(body), top = idx(4, 8, 4), bottom = idx(4, 0, 4);
    ok(got === body && most(body.u) === 0 && body.left === 0 && body.vel[top * 3 + 1] < -3 && body.vel[top * 3 + 1] >= -K.LAND && body.vel[top * 3] === 0 && body.vel[top * 3 + 2] === 0 && Math.abs(body.vel[bottom * 3 + 1]) < 0.3
      && near(body.vel[top * 3 + 1], -K.LAND * Math.exp(-0.01 / (2 * 0.64))) && K.LAND === 3.2 && K.LAND_SQUASH === 2.6 && !K.atRest(body),
      'when the last slab lands the cube is whole and where it belongs, and moving down at its top');
    const b2 = K.createBody(); b2.u.fill(0.2); b2.vel.fill(2); b2.left = 0.001; K.calm(b2);
    ok(most(b2.u) === 0 && most(b2.vel) === 0 && b2.left === 0 && K.atRest(b2), 'and calmed, it is at rest');
  }

  // The camera, the light, the bubbles.
  {
    const t0 = K.turnAt([0, 0, 0], 0), t1 = K.turnAt([0, 0, 0], 13.7), g = K.glowOf([0, 0], 0.5, 0.2, 0.4);
    const bub = K.bubblesAt(K.SEED), bub2 = K.bubblesAt(K.SEED), bub3 = K.bubblesAt(K.SEED + 1);
    let inside = true; for (let i = 0; i < 46; i++) { for (let a = 0; a < 3; a++) if (Math.abs(bub.home[i * 3 + a]) > 0.7) inside = false; if (bub.size[i] < 0.035 || bub.size[i] > 0.11 || bub.slab[i] !== K.slabOf(bub.home[i * 3 + 1])) inside = false; }
    ok(near(t0[0], 0.42 + 0.06 * Math.sin(1)) && t0[1] === 0.62 && t0[2] === 0 && near(t1[0], 0.42 + 0.06 * Math.sin(0.11 * 13.7 + 1)) && near(t1[1], 0.62 + 0.35 * Math.sin(0.17 * 13.7))
      && K.orbitAt(7, 0) === 0 && near(K.orbitAt(7, 50), 0.1 * Math.sin(0.13 * 7)) && near(K.orbitAt(7, 100), 0.2 * Math.sin(0.13 * 7))
      && near(g[0], 0.04 + 0.06 + 0.04 + 0.2) && g[1] === 5.2 && K.glowOf([0, 0], 0, 0, 0)[0] === 0.04 && K.flareOf(0.2, 0.5) === 0.5 && K.flareOf(0.7, 0.5) === 0.7
      && bub.home.length === 138 && bub.size.length === 46 && inside && Array.from(bub.home).join() === Array.from(bub2.home).join() && Array.from(bub.home).join() !== Array.from(bub3.home).join()
      && new Set(Array.from(bub.slab)).size === 4,
      'it turns slowly to and fro, the camera sways by the Camera drift setting, its own light grows with the voice, and its 46 bubbles are the same every time, some in every layer');
    ok(typeof K.VERT === 'string' && typeof K.SLAB_VERT === 'string' && typeof K.FRAG === 'string' && typeof K.BUBBLE_VERT === 'string' && typeof K.BUBBLE_FRAG === 'string' && typeof K.definition === 'function'
      && K.FRAG.includes('uLayer') && K.SLAB_VERT.includes('uSquash') && K.SLAB_VERT.includes('uBend') && typeof K.definition().build === 'function' && K.definition().fov === 30 && K.definition().pitch === 6
      && JSON.stringify(K.definition().frame) === JSON.stringify(K.FRAME) && K.definition().frame !== K.FRAME && K.definition().frame.center !== K.FRAME.center,
      'the scene definition gives the kit its frame, its camera and its two halves, and a frame of its own each time');
  }
  ok(T.VIZ_SCENES.includes('jelly') && T.VIZ_USES_3D.includes('jelly') && JSON.stringify(T.DEFAULT_PER_VIZ['jelly']) === '{"stiffness":50,"shatterSensitivity":50,"reconnectSeconds":3,"cameraDrift":50}' && JSON.stringify(T.PER_VIZ_MAX['jelly']) === '{"reconnectSeconds":10}',
    'jelly is a kit scene, with Stiffness, the two thump settings and Camera drift');
  ok(!('jelly' in T.VIZ_LABELS), 'jelly keeps the name it is listed by');
  // The files.
  const pages = [];
  for (const p of ['300x220', '1440x1080', '1920x1080']) {
    const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
    const pos = html.indexOf('src="jelly.js"');
    pages.push(pos > html.indexOf('src="shards.js"') && pos > html.indexOf('src="scene-kit.js"') && pos < html.indexOf('src="factories/') && html.split('src="jelly.js"').length === 2 && html.split('src="factories/jelly.js"').length === 2 && html.includes('src="helix.js"'));
  }
  ok(pages.every(Boolean), 'all three overlay pages load jelly.js once, after the scene kit and shards.js and before the factories, and the shatter machine it uses');
  const jellyFactory = await readFile(resolve(__dirname, 'overlay/factories/jelly.js'), 'utf8');
  ok(/VIZ_FACTORIES\['jelly'\] = TimbreScene\.factory\(\(\) => TimbreJelly\.definition\(\)\);/.test(jellyFactory) && !/WebGLRenderer/.test(jellyFactory), 'the effect is the kit\'s factory around the jelly\'s definition, with no renderer of its own');
  ok(!/Math\.random/.test(await readFile(resolve(__dirname, 'overlay/jelly.js'), 'utf8')), 'the jelly takes no numbers from Math.random, so a thump throws its slabs the same way every time');
  const oldJelly = T.sanitizeConfig({ activeViz: 'jelly', perViz: { 'jelly': { stiffness: 80, reconnectSeconds: 99 } } });
  ok(oldJelly.activeViz === 'jelly' && JSON.stringify(oldJelly.perViz['jelly']) === '{"stiffness":80,"shatterSensitivity":50,"reconnectSeconds":10,"cameraDrift":50}', 'a saved pre-redesign jelly config keeps its stiffness and gains the new defaults; Reconnect seconds is held to 10');
}

console.log('\n[23] school of fish');
await import('./overlay/scene-kit.js');
await import('./overlay/school-of-fish.js');
{
  const K = globalThis.TimbreSchool;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const quiet = new Float32Array(8);
  const finite = (a) => { for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return false; return true; };
  const how = (over = {}) => Object.assign({ gain: 1, apart: false, back: false, flame: 0, dart: 0, bands: quiet, pulse: 0, random: K.rng(3) }, over);
  const run = (school, n, secs, h, fps = 60) => { let steps = 0; for (let i = 0, m = Math.round(secs * fps); i < m; i++) steps += K.advance(school, n, 1 / fps, h); return steps; };
  const at = (a, i) => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]];
  const put = (a, i, v) => { a[i * 3] = v[0]; a[i * 3 + 1] = v[1]; a[i * 3 + 2] = v[2]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(a[0], a[1], a[2]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  // Into the school's own leaning space, and out of it.
  const lean = (v, form) => { const c = Math.cos(K.LEAN[form]), s = Math.sin(K.LEAN[form]); return [v[0], v[1] * c + v[2] * s, -v[1] * s + v[2] * c]; };
  const unlean = (v, form) => { const c = Math.cos(K.LEAN[form]), s = Math.sin(K.LEAN[form]); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
  const mean = (n, f) => { let t = 0; for (let i = 0; i < n; i++) t += f(i); return t / n; };
  const egg = (p) => (p[0] / K.EGG[0]) ** 2 + (p[1] / K.EGG[1]) ** 2 + (p[2] / K.EGG[2]) ** 2;
  const N = 96;

  ok(K.BANDS === 8 && K.PER_MIN === 12 && K.PER_MAX === 60 && K.FISH_MAX === 480 && K.SEED === 20261122 && K.STEP === 1 / 60 && K.STEPS_MAX === 6
    && K.NEAR === 0.46 && K.CLEAR === 0.11 && K.BASE === 1.05 && K.LEN === 0.17 && K.TAIL === 1.62 && JSON.stringify(K.EGG) === '[2,1.4,1.2]' && JSON.stringify(K.LEAN) === '[0.3,0.58,0.14]'
    && JSON.stringify(K.FORMS) === '["ball","ring","column"]' && K.RISE === 20 && K.FALL === 5 && K.TRAIL === 8 && K.PULSE === 5 && K.ROUND_S === 0.7 && K.FADE === 0.45 && K.HISTORY === 64
    && K.ROLL === 1.15 && K.DART_S === 0.25 && K.FLASH_S === 0.3 && K.FLASH_KEEP_S === 0.085 && K.BUBBLES === 90 && K.BUBBLE_S === 2.6 && K.BUBBLE_RATE === 26
    && K.FILL === 0.96 && K.ZOOM_BACK === 2 && K.FOV === 30 && K.PITCH === 6 && JSON.stringify(K.FRAME) === '{"width":5,"height":3.9,"center":[0,0,0]}' && K.LINGER === 0.08,
    'the sizes: eight bands, 12 to 60 fish to a band, steps of 1/60 s, an egg to wander in and a frame of 5 by 3.9');
  ok(JSON.stringify(K.BALL) === '[0.4,0.82]' && K.AXIS_TILT === 1.3 && K.RING === 1.2 && K.RING_WIDE === 0.18 && K.RING_HIGH === 0.2 && JSON.stringify(K.COLUMN) === '[0.3,0.26]' && K.COLUMN_WIDE === 0.1 && K.COLUMN_HIGH === 1.1
    && K.SWING === 0.15 && K.TIGHT === 0.2 && K.PULL === 2.4 && K.PULL_MAX === 1.4 && K.STAY === 0.5 && K.WITH === 0.9 && K.STAY_APART === 0.05 && K.WITH_APART === 0.3 && K.PART === 2.2
    && K.TURN === 2.4 && K.TURN_LOUD === 2.5 && K.TURN_APART === 1 && K.TURN_BACK === 2 && K.HURRY === 1.5 && K.BOLT_FAST === 1.6 && K.BOLT_STIFF === 2 && K.SPEED_RATE === 2.6 && K.DASH === 6 && K.START === 0.5 && K.BEAT === 5 && K.BEAT_FAST === 11
    && JSON.stringify(K.BOLT) === '[0.5,0.45]' && K.REBOLT === 0.8 && K.JOSTLE === 0.6 && K.ARRIVE === 0.3 && K.LOITER === 0.4 && K.ROAM === 0.92 && K.JOIN === 0.15 && K.WALL === 3 && K.WALL_FROM === 0.9 && K.WALL_SLOW === 0.88
    && K.SWAY === 0.16 && K.ORBIT_RATE === 0.13 && near(K.pxOf(624, 1), 624 / (2 * Math.tan(Math.PI / 12))) && near(K.pxOf(624, 2), 2 * K.pxOf(624, 1)) && near(K.pxOf(312, 1), K.pxOf(624, 1) / 2),
    'the rest of its numbers: the three shapes, how a fish steers, turns and bolts, how the camera sways; and how many pixels a unit is');

  // The settings and the sound.
  ok(K.countFor(0) === 96 && K.countFor(50) === 288 && K.countFor(100) === 480 && K.countFor(25) === 192 && K.countFor(-9) === 96 && K.countFor(900) === 480 && K.countFor(undefined) === 288 && K.countFor(NaN) === 288 && K.countFor('7') === 288
    && [0, 1, 13, 37, 50, 77, 99, 100].every((d) => K.countFor(d) % 8 === 0),
    'Density 0 is 96 fish, 50 is 288 and 100 is 480, always the same number to each band; anything that is not a number is 50');
  ok(K.loudness(null, 0, 1) === 0 && K.loudness([255], 3, 1) === 0 && near(K.loudness([51, 255], 0, 1), 0.2) && K.loudness([51, 255], 1, 2) === 1 && near(K.loudness([51, 255], 0, 2), 0.4)
    && near(K.idle(0, 0), 0.16) && near(K.idle(3, 2), Math.max(0, 0.16 + 0.3 * Math.sin(0.9 * 2 + 1.4 * 3))) && K.idle(2, 1.6) === 0
    && K.settle(5e-5) === 0 && K.settle(-5e-5) === 0 && K.settle(0.3) === 0.3,
    'a band is its bin of 255 times Gain, at most 1; idle, the bands swell in turn; all but nothing is nothing');
  {
    const a = K.rng(5), b = K.rng(5), c = K.rng(6), xs = [a(), a(), a()], ys = [b(), b(), b()], zs = [c(), c(), c()];
    ok(xs.join() === ys.join() && xs.join() !== zs.join() && xs.every((v) => v >= 0 && v < 1), 'its random numbers are the same for the same seed');
  }

  // One fish.
  {
    const f = K.fishShape(), V = f.points.length / 3, T3 = f.index.length / 3, BODY = 15 * 10;
    let unitLong = true, outward = true, wound = true, far = [0, 0, 0], least = 9;
    for (let v = 0; v < V; v++) {
      const p = at(f.points, v), n = at(f.normals, v);
      if (!near(len(n), 1, 1e-5)) unitLong = false;
      if (v < BODY && Math.hypot(p[1], p[2]) > 1e-6 && n[1] * p[1] + n[2] * p[2] <= 0) outward = false;
      for (let c = 0; c < 3; c++) far[c] = Math.max(far[c], Math.abs(p[c]));
      least = Math.min(least, p[0]);
    }
    for (let t = 0; t < T3; t++) {
      const [i, j, k] = [f.index[t * 3], f.index[t * 3 + 1], f.index[t * 3 + 2]];
      if (i >= BODY) continue;
      const a = at(f.points, i), b = at(f.points, j), c = at(f.points, k), face = cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]);
      const mid = [0, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      if (len(face) > 1e-9 && dot(face, mid) < 0) wound = false;
    }
    const fins = Array.from(f.fin);
    ok(V === 158 && T3 === 284 && fins.slice(0, BODY).every((v) => v === 0) && fins.slice(BODY).every((v) => v === 1) && unitLong && outward && wound
      && near(far[0], 1.62, 1e-6) && least === -Math.fround(1.62) && far[1] > 0.55 && far[1] < 0.65 && far[2] > 0.14 && far[2] < 0.18
      && [140, 141, 149].every((v) => near(f.points[v * 3], 1, 1e-6) && near(f.points[v * 3 + 1], 0, 1e-6) && near(f.points[v * 3 + 2], 0, 1e-6))
      && at(f.normals, 150).join() === '0,0,1' && at(f.normals, 157).join() === '0,0,1' && f.points[150 * 3 + 2] === 0 && f.points[157 * 3 + 2] === 0,
      'one fish: a body of 150 points that closes at the nose, faces outward everywhere and is taller than it is wide, a forked tail and a fin on its back, both flat');
  }

  // The school as it is made.
  {
    const a = K.createSchool(), b = K.createSchool(K.SEED), c = K.createSchool(7);
    let onRound = true, bands = true, sizes = true, heading = true;
    for (let i = 0; i < K.FISH_MAX; i++) {
      const q = lean(at(a.p, i), 0), d = lean(at(a.d, i), 0), ax = at(a.axis, i), R = K.BALL[0] + K.BALL[1] * a.shell[i];
      if (!near(len(q), R, 1e-5) || !near(dot(q, ax), 0, 1e-5) || !near(len(ax), 1, 1e-5) || ax[1] < Math.cos(K.AXIS_TILT) - 1e-6) onRound = false;
      const tangent = unit(cross(ax, q));
      if (!near(len(d), 1, 1e-5) || !near(dot(d, tangent), 1, 1e-4)) heading = false;
      if (a.band[i] !== i % 8) bands = false;
      const mid = 1.5 - 0.95 * (a.band[i] / 7);
      if (a.size[i] < 0.88 * mid - 1e-6 || a.size[i] > 1.12 * mid + 1e-6 || a.shell[i] < 0 || a.shell[i] > 1 || Math.abs(a.high[i]) > 1 || Math.abs(a.off[i]) > 1 || Math.abs(a.off2[i]) > 1 || Math.abs(a.side[i]) !== 1 || a.sp[i] !== Math.fround(K.BASE * K.START)) sizes = false;
    }
    ok(onRound && heading && bands && sizes && a.form === 0 && a.left === 0 && a.p.join() === b.p.join() && a.size.join() === b.size.join() && a.p.join() !== c.p.join()
      && mean(K.FISH_MAX, (i) => a.shell[i] ** 3) > 0.42 && mean(K.FISH_MAX, (i) => a.shell[i] ** 3) < 0.58 && mean(K.FISH_MAX, (i) => a.side[i]) > -0.2 && mean(K.FISH_MAX, (i) => a.side[i]) < 0.2,
      'the school as made: a ball, every fish on its own tilted round and heading along it, the bands shared out in turn, big fish for the low bands; the same every time');
  }

  // Where the school wants a fish to swim.
  {
    const sc = K.createSchool(), out = [0, 0, 0], i = 11, q = lean(at(sc.p, i), 0), ax = at(sc.axis, i), tangent = unit(cross(ax, q)), qh = unit(q), R = len(q);
    const awayHome = K.steer(out, sc, i, 0, 1, 0);
    const home = lean(out, 0);
    K.steer(out, sc, i, 0, 1, 1);
    const loud = lean(out, 0);
    K.steer(out, sc, i, 0, 1 - K.TIGHT, 0);
    const tight = lean(out, 0);
    put(sc.p, i, unlean([q[0] * 1.5, q[1] * 1.5, q[2] * 1.5], 0));
    const awayOutside = K.steer(out, sc, i, 0, 1, 0);
    const outside = lean(out, 0);
    put(sc.p, i, unlean([q[0] * 9, q[1] * 9, q[2] * 9], 0));
    K.steer(out, sc, i, 0, 1, 0);
    const far = lean(out, 0);
    put(sc.p, i, unlean([q[0] + 0.2 * ax[0], q[1] + 0.2 * ax[1], q[2] + 0.2 * ax[2]], 0));
    K.steer(out, sc, i, 0, 1, 0);
    const lifted = lean(out, 0);
    ok(near(dot(home, tangent), 1, 1e-4) && near(len(home), 1, 1e-4)
      && near(dot(loud, qh), K.PULL * K.SWING, 1e-4) && near(dot(loud, tangent), 1, 1e-4)
      && near(dot(tight, qh), -K.PULL * K.TIGHT * R, 1e-4)
      && near(dot(outside, qh), -K.PULL * 0.5 * R, 1e-4) && near(dot(outside, tangent), 1, 1e-4)
      && near(dot(far, qh), -K.PULL * K.PULL_MAX, 1e-3)
      && dot(lifted, ax) < -0.3 && awayHome < 1e-5 && near(awayOutside, 0.5 * R, 1e-5),
      'in the ball a fish in its place swims along its round; out of place it also makes for its place, by 2.4 for each unit, at most 1.4 units\' worth; its band swings it 0.15 wider and loudness draws it in');
  }
  {
    const sc = K.createSchool(), out = [0, 0, 0], i = 21;
    const ringR = K.RING + K.RING_WIDE * sc.off[i], ringY = K.RING_HIGH * sc.off2[i];
    put(sc.p, i, unlean([ringR, ringY, 0], 1));
    K.steer(out, sc, i, 1, 1, 0);
    const ring = lean(out, 1);
    put(sc.p, i, unlean([0, ringY + 0.1, ringR + 0.1], 1));
    K.steer(out, sc, i, 1, 1, 0);
    const ringOff = lean(out, 1);
    const colR = K.COLUMN[0] + K.COLUMN[1] * (sc.high[i] + 1) + K.COLUMN_WIDE * sc.off[i], colY = K.COLUMN_HIGH * sc.high[i];
    put(sc.p, i, unlean([0, colY, -colR], 2));
    K.steer(out, sc, i, 2, 1, 0);
    const col = lean(out, 2);
    put(sc.p, i, unlean([0, colY, -colR], 2));
    K.steer(out, sc, i, 2, 1, 1);
    const colLoud = lean(out, 2);
    ok(near(ring[0], 0, 1e-4) && near(ring[1], 0, 1e-4) && near(ring[2], -1, 1e-4)
      && near(ringOff[0], 1, 1e-4) && near(ringOff[1], -K.PULL * 0.1, 1e-4) && near(ringOff[2], -K.PULL * 0.1, 1e-4)
      && near(col[0], -1, 1e-4) && near(col[1], 0, 1e-4) && near(col[2], 0, 1e-4)
      && near(colLoud[2], -K.PULL * K.SWING, 1e-4) && near(colLoud[0], -1, 1e-4),
      'in the ring and in the column a fish goes round the upright the same way, and makes for its own distance from it and its own height; the column is a funnel, 0.52 wider at the top than at the foot');
  }

  // What its neighbours do to a fish.
  {
    const sc = K.createSchool(), out = [0, 0, 0];
    sc.size[0] = sc.size[1] = sc.size[2] = 1;
    put(sc.p, 0, [0, 0, 0]); put(sc.d, 0, [1, 0, 0]);
    put(sc.p, 1, [0.3, 0, 0]); put(sc.d, 1, [0, 1, 0]);
    put(sc.p, 2, [0, 0, K.NEAR + 0.01]); put(sc.d, 2, [0, 0, 1]);
    K.flock(out, sc, 3, 0, true, 0.4, 1);
    const whole = out.slice();
    K.flock(out, sc, 3, 0, true, 0.4, 0.5);
    const half = out.slice();
    K.flock(out, sc, 3, 0, false, 0.4, 0);
    const apart = out.slice();
    put(sc.p, 1, [0.1, 0, 0]);
    K.flock(out, sc, 3, 0, true, 0, 1);
    const close = out.slice(), w = (1 - 0.1 / 0.22) / 0.1;
    K.flock(out, sc, 1, 0, true, 0, 1);
    const alone = out.slice();
    ok(near(whole[0], K.STAY * 1.4 * 0.3 - K.WITH, 1e-6) && near(whole[1], K.WITH, 1e-6) && whole[2] === 0
      && near(half[0], K.STAY * 1.4 * 0.5 * 0.3 - K.WITH, 1e-6)
      && near(apart[0], K.STAY_APART * 0.3 - K.WITH_APART, 1e-6) && near(apart[1], K.WITH_APART, 1e-6)
      && near(close[0], -K.PART * 0.1 * w + K.STAY * 0.1 - K.WITH, 1e-5) && near(close[1], K.WITH, 1e-6)
      && alone.join() === '0,0,0',
      'a fish is drawn toward the fish within 0.46 of it and turned the way they swim, and pushed off any that is too close; one further away than that does nothing to it');
  }

  // How fast a fish wants to swim.
  ok(near(K.wantOf(1, 1, 0, 0, 0, 0), K.BASE * 0.42 * 0.94) && near(K.wantOf(1, 1, 0, 1, 0, 0), K.BASE * 1.42 * 0.94) && near(K.wantOf(1, 1, 0, 0, 1, 0), K.BASE * 1.17 * 0.94) && near(K.wantOf(1, 1, 0, 0, 0, 1), K.BASE * 1.72 * 0.94)
    && near(K.wantOf(1.5, 1, 0, 0, 0, 0), K.BASE * 0.42 * 0.85) && near(K.wantOf(0.5, 1, 0, 0, 0, 0), K.BASE * 0.42 * 1.03)
    && near(K.wantOf(1, 0, 0, 0, 0, 0), K.BASE * 0.40 * 0.94) && near(K.wantOf(1, 0, 0, 1, 1, 1), K.BASE * 1.40 * 0.94)
    && near(K.wantOf(1, 0.5, 1, 0, 0, 0), K.BASE * 0.41 * 0.94 * 2.5) && near(K.wantOf(1, 0.5, 0, 0, 0, 0), K.BASE * 0.41 * 0.94) && near(K.wantOf(1, 1, 0.4, 0, 0, 0), 1.6 * K.wantOf(1, 1, 0, 0, 0, 0)),
    'a fish swims faster the louder the sound and its own band, and on a beat; a small fish is quicker than a big one; alone it ambles; streaming back it hurries for as long as it is far from its place, two and a half times as fast a unit away or more');

  // One step, by hand: a fish alone, in its place.
  {
    const sc = K.createSchool(), i = 0, p0 = at(sc.p, i), d0 = at(sc.d, i), sp0 = sc.sp[i], beat0 = sc.beat[i], other = at(sc.p, 1);
    K.stepSchool(sc, 1, how());
    const want = K.wantOf(sc.size[i], 1, 0, 0, 0, 0), sp1 = sp0 + (want - sp0) * K.SPEED_RATE * K.STEP, p1 = at(sc.p, i), d1 = at(sc.d, i);
    ok(near(sc.sp[i], sp1, 1e-6) && near(dot(d1, d0), 1, 1e-5) && near(len(d1), 1, 1e-5) && [0, 1, 2].every((c) => near(p1[c], p0[c] + d0[c] * sp1 * K.STEP, 1e-5))
      && near(sc.beat[i], beat0 + K.STEP * (K.BEAT + K.BEAT_FAST * sp1) / Math.sqrt(sc.size[i]), 1e-4) && at(sc.p, 1).join() === other.join(),
      'one step of a fish alone in its place: it keeps its heading, its speed moves 2.6 a second toward what it wants, it moves as fast as it is going, and its tail beats faster the faster it swims; a fish that is not counted is left alone');
  }
  {
    // A fish streaming back hurries by how far it is from its place.
    const sc = K.createSchool(), i = 3, q = lean(at(sc.p, i), 0), S3 = [0, 0, 0];
    put(sc.p, i, unlean([q[0] * 1.6, q[1] * 1.6, q[2] * 1.6], 0));
    const away = K.steer(S3, sc, i, 0, 1, 0), sp0 = sc.sp[i];
    for (let c = 0; c < 3; c++) sc.roam[i * 3 + c] = sc.p[i * 3 + c] + 1;   // somewhere to be making for, were it alone
    const only = K.createSchool(); put(only.p, 0, at(sc.p, i)); put(only.d, 0, at(sc.d, i)); put(only.roam, 0, at(sc.roam, i)); put(only.axis, 0, at(sc.axis, i)); only.size[0] = sc.size[i]; only.shell[0] = sc.shell[i]; only.sp[0] = sp0;
    K.stepSchool(only, 1, how({ gain: 0.5, back: true }));
    const want = K.wantOf(only.size[0], 0.5, Math.min(1, away), 0, 0, 0);
    ok(away > 0.2 && away < 1 && near(only.sp[0], sp0 + (want - sp0) * K.SPEED_RATE * K.STEP, 1e-6) && want > 1.2 * K.wantOf(only.size[0], 0.5, 0, 0, 0, 0),
      'a fish streaming back wants to swim faster by how far it still is from its place');
  }
  {
    // Two fish too close, side by side: they part.
    const sc = K.createSchool();
    put(sc.p, 1, [sc.p[0] + 0.03 * sc.axis[0], sc.p[1] + 0.03 * sc.axis[1], sc.p[2] + 0.03 * sc.axis[2]]); put(sc.d, 1, at(sc.d, 0));
    const h = how(), gap = () => len([sc.p[3] - sc.p[0], sc.p[4] - sc.p[1], sc.p[5] - sc.p[2]]), before = gap();
    for (let n = 0; n < 40; n++) K.stepSchool(sc, 2, h);
    // Alone, a fish turns toward where it is making for a little each step, and one that is bolting hardly at all.
    const one = K.createSchool(), two = K.createSchool(), d0 = at(one.d, 5), lone = () => how({ gain: 0, apart: true, random: K.rng(5) });
    two.sp[5] = 5;
    K.stepSchool(one, 6, lone()); K.stepSchool(two, 6, lone());
    const turned = Math.acos(Math.min(1, dot(at(one.d, 5), d0))), stiff = Math.acos(Math.min(1, dot(at(two.d, 5), d0)));
    // In the school a fast fish turns as readily as a slow one.
    const slow = K.createSchool(), fast = K.createSchool(), q = lean(at(slow.p, 5), 0);
    put(slow.p, 5, unlean([q[0] * 1.8, q[1] * 1.8, q[2] * 1.8], 0)); put(fast.p, 5, at(slow.p, 5)); fast.sp[5] = 5;
    K.stepSchool(slow, 6, how()); K.stepSchool(fast, 6, how());
    const inSchool = Math.acos(Math.min(1, dot(at(slow.d, 5), d0))), inSchoolFast = Math.acos(Math.min(1, dot(at(fast.d, 5), d0)));
    ok(before < 0.031 && gap() > 0.12 && turned > 0.01 && turned < 2 * (K.TURN + K.TURN_APART) * K.STEP && stiff > 0 && stiff < turned / 5 && near(len(at(two.d, 5)), 1, 1e-5)
      && inSchool > 0.01 && inSchool < 2 * K.TURN * K.STEP && near(inSchoolFast, inSchool, 1e-6),
      'two fish too close part; a fish turns toward where it is making for a little each step; alone, one that is bolting hardly turns until it has slowed, but in the school a fast fish turns as readily as a slow one');
  }

  // The steps come due at 1/60 s, whatever the frame rate.
  {
    const sc = K.createSchool(), h = how();
    const a = K.advance(sc, N, 0.4 * K.STEP, h), leftA = sc.left, b = K.advance(sc, N, 0.2 * K.STEP, h), leftB = sc.left, c = K.advance(sc, N, 0, h), d = K.advance(sc, N, 0.8 * K.STEP, h), leftD = sc.left;
    const long = K.createSchool(), before = Array.from(long.p.subarray(0, N * 3)), taken = K.advance(long, N, 5, h);
    const over = K.createSchool(), overTaken = K.advance(over, N, 6.7 * K.STEP, h), overLeft = over.left, under = K.createSchool(), underTaken = K.advance(under, N, 6.3 * K.STEP, h), underLeft = under.left;
    let furthest = 0;
    for (let i = 0; i < N; i++) furthest = Math.max(furthest, len([long.p[i * 3] - before[i * 3], long.p[i * 3 + 1] - before[i * 3 + 1], long.p[i * 3 + 2] - before[i * 3 + 2]]));
    const s60 = K.createSchool(), s30 = K.createSchool(), s120 = K.createSchool(), loud = () => how({ flame: 0.5, bands: new Float32Array([0.6, 0, 0.3, 0, 0, 0.2, 0, 0]) });
    const n60 = run(s60, N, 2, loud(), 60), n30 = run(s30, N, 2, loud(), 30), n120 = run(s120, N, 2, loud(), 120);
    ok(a === 0 && near(leftA, 0.4 * K.STEP, 1e-15) && b === 1 && near(leftB, -0.4 * K.STEP, 1e-12) && c === 0 && d === 0 && near(leftD, 0.4 * K.STEP, 1e-12)
      && taken === K.STEPS_MAX && long.left === 0 && furthest < K.STEPS_MAX * K.STEP * 1.2 && overTaken === 6 && overLeft === 0 && underTaken === 6 && near(underLeft, 0.3 * K.STEP, 1e-12)
      && n60 === 120 && n30 === 120 && n120 === 120 && s60.p.join() === s30.p.join() && s60.p.join() === s120.p.join() && s60.beat.join() === s30.beat.join(),
      'a step is taken once half of it has come due, six at most in a frame and the rest forgotten; the school is the same, fish for fish, at 30, 60 and 120 frames a second');
    // Frames never come exactly on time. One step a frame at 60 a second and two at 30, though each frame is early or late.
    const steady = (fps, wobble, frames) => {
      const sch = K.createSchool(), r = K.rng(8), hw = how(), per = Math.round(60 / fps);
      let last = 0, odd = 0;
      for (let k = 1; k <= frames; k++) { const at = k / fps + wobble * K.STEP * (2 * r() - 1); if (K.advance(sch, 8, at - last, hw) !== per) odd++; last = at; }
      return odd;
    };
    const exact = (fps, frames) => { const sch = K.createSchool(), hw = how(); let odd = 0, clock = 0, last = 0; for (let k = 1; k <= frames; k++) { clock = Math.round(k * 1000 / fps * 10) / 10; if (K.advance(sch, 8, (clock - last) / 1000, hw) !== Math.round(60 / fps)) odd++; last = clock; } return odd; };
    ok(steady(60, 0.2, 600) === 0 && steady(30, 0.2, 300) === 0 && steady(60, 0.02, 600) === 0 && exact(60, 600) === 0 && exact(30, 300) === 0,
      'frames never come exactly on time: with each a fifth of a step early or late, and with a clock that counts in tenths of a millisecond, it is still one step a frame at 60 frames a second and two at 30');
  }

  // Each shape holds, and turns one way.
  {
    const ball = K.createSchool(); run(ball, N, 15, how({ flame: 0.3 }));
    let inBall = true;
    for (let i = 0; i < N; i++) if (len(at(ball.p, i)) > K.BALL[0] + K.BALL[1] + 0.3) inBall = false;
    const round = mean(N, (i) => { const q = lean(at(ball.p, i), 0); return dot(at(ball.axis, i), cross(unit(q), lean(at(ball.d, i), 0))); });
    const ring = K.createSchool(); ring.form = 1; run(ring, N, 15, how({ flame: 0.3 }));
    let inRing = true;
    for (let i = 0; i < N; i++) { const q = lean(at(ring.p, i), 1), rho = Math.hypot(q[0], q[2]); if (rho < K.RING - 0.55 || rho > K.RING + 0.55 || Math.abs(q[1]) > 0.5) inRing = false; }
    const ringRound = mean(N, (i) => { const q = lean(at(ring.p, i), 1), d = lean(at(ring.d, i), 1); return (q[2] * d[0] - q[0] * d[2]) / Math.hypot(q[0], q[2]); });
    const col = K.createSchool(); col.form = 2; run(col, N, 15, how({ flame: 0.3 }));
    let inCol = true, top = 0, foot = 0, tops = 0, feet = 0;
    for (let i = 0; i < N; i++) {
      const q = lean(at(col.p, i), 2), rho = Math.hypot(q[0], q[2]);
      if (rho > K.COLUMN[0] + 2 * K.COLUMN[1] + 0.45 || Math.abs(q[1]) > K.COLUMN_HIGH + 0.35) inCol = false;
      if (q[1] > 0.6) { top += rho; tops++; } else if (q[1] < -0.6) { foot += rho; feet++; }
    }
    const colRound = mean(N, (i) => { const q = lean(at(col.p, i), 2), d = lean(at(col.d, i), 2); return (q[2] * d[0] - q[0] * d[2]) / Math.hypot(q[0], q[2]); });
    ok(inBall && round > 0.6 && inRing && ringRound > 0.8 && inCol && colRound > 0.7 && tops > 10 && feet > 10 && top / tops > foot / feet + 0.2
      && finite(ball.p) && finite(ring.p) && finite(col.p),
      'after a quarter of a minute each shape still holds: a ball, a ring with a clear middle, a column wider at the top; and every one turns one way');
  }

  // Louder: faster and tighter. A fish's own band: faster and wider.
  {
    const soft = K.createSchool(), loud = K.createSchool(), bass = K.createSchool(), one = new Float32Array(8); one[0] = 1;
    run(soft, N, 8, how()); run(loud, N, 8, how({ flame: 0.9 })); run(bass, N, 8, how({ bands: one }));
    const speed = (sc, pick = () => true) => { let t = 0, c = 0; for (let i = 0; i < N; i++) if (pick(i)) { t += sc.sp[i]; c++; } return t / c; };
    const out = (sc, pick = () => true) => { let t = 0, c = 0; for (let i = 0; i < N; i++) if (pick(i)) { t += len(at(sc.p, i)); c++; } return t / c; };
    const low = (i) => i % 8 === 0, rest = (i) => i % 8 !== 0;
    ok(speed(loud) > 2.5 * speed(soft) && out(loud) < out(soft) - 0.05
      && speed(bass, low) > 2 * speed(soft, low) && out(bass, low) > out(soft, low) + 0.1 && Math.abs(speed(bass, rest) - speed(soft, rest)) < 0.02,
      'louder, the school swims faster and packs tighter; while one band sounds, its fish and only they swim faster and swing wider');
  }

  // The fright.
  {
    const made = () => { const sc = K.createSchool(); run(sc, N, 3, how({ flame: 0.4 })); return sc; };
    const middle = (sc) => { const c = [0, 0, 0]; for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) c[k] += sc.p[i * 3 + k] / N; return c; };
    const spreadOf = (sc) => { const c = middle(sc); return mean(N, (i) => len([sc.p[i * 3] - c[0], sc.p[i * 3 + 1] - c[1], sc.p[i * 3 + 2] - c[2]])); };
    const fromHome = (sc, i) => len([sc.p[i * 3] - sc.home[i * 3], sc.p[i * 3 + 1] - sc.home[i * 3 + 1], sc.p[i * 3 + 2] - sc.home[i * 3 + 2]]);
    const sc = made(), twin = made(), other = made();
    const before = Array.from(sc.sp.subarray(0, N)), kept = at(sc.p, N), keptHome = at(sc.home, N), c = middle(sc), spread0 = spreadOf(sc);
    K.bolt(sc, N, 1, K.rng(1001), true); K.bolt(twin, N, 1, K.rng(1001), true); K.bolt(other, N, 1, K.rng(1002), true);
    const boltedD = sc.d.join(), boltedHome = sc.home.join();
    let away = 0, far = true, speeds = true, units = true, homes = true, inside = 0;
    for (let i = 0; i < N; i++) {
      const d = at(sc.d, i), p = at(sc.p, i), h = at(sc.home, i), reach = K.toEdge(sc, i), gone = fromHome(sc, i);
      if (dot(d, [p[0] - c[0], p[1] - c[1], p[2] - c[2]]) > 0) away++;
      if (reach > 0) { inside++; if (gone < K.BOLT[0] * reach - 1e-4 || gone > (K.BOLT[0] + K.BOLT[1]) * reach + 1e-4) far = false; }
      if (!(gone > 0) || !near(dot(unit([h[0] - p[0], h[1] - p[1], h[2] - p[2]]), d), 1, 1e-4)) far = false;
      if (!near(sc.sp[i], Math.max(before[i], K.DASH * gone), 1e-4)) speeds = false;
      if (!near(len(d), 1, 1e-5)) units = false;
      if (egg(h) > 1 + 1e-4 || at(sc.roam, i).join() !== h.join()) homes = false;
    }
    // How far a fish can go before the edge of the egg; and one caught outside it bolts back in.
    const probe = K.createSchool();
    put(probe.p, 0, [0, 0, 0]); put(probe.d, 0, [1, 0, 0]); put(probe.p, 1, [1, 0, 0]); put(probe.d, 1, [-1, 0, 0]); put(probe.p, 2, [0, 0.4, 0]); put(probe.d, 2, [0, 1, 0]); put(probe.p, 3, [3, 0, 0]); put(probe.d, 3, [1, 0, 0]);
    const edges = near(K.toEdge(probe, 0), 2, 1e-6) && near(K.toEdge(probe, 1), 3, 1e-6) && near(K.toEdge(probe, 2), 1, 1e-6) && K.toEdge(probe, 3) === 0;
    put(probe.p, 0, [0, 0, 2.4]); probe.sp[0] = 0;
    K.bolt(probe, 1, 1, K.rng(4), false);
    const hz = probe.home[2], back = probe.home[0] === 0 && probe.home[1] === 0 && hz >= 2.4 * K.ROAM * K.BOLT[0] / 2 - 1e-5 && hz <= 2.4 * K.ROAM * (K.BOLT[0] + K.BOLT[1]) / 2 + 1e-5
      && at(probe.d, 0).join() === '0,0,-1' && near(probe.sp[0], K.DASH * (2.4 - hz), 1e-4);
    // Then they are apart: each goes to where its fright sends it, and loiters there.
    const h = how({ gain: 0, apart: true, flame: 0.4, random: K.rng(5) });
    run(sc, N, 1, h);
    const spread1 = spreadOf(sc), arrived = mean(N, (i) => fromHome(sc, i)), was = Array.from(sc.p.subarray(0, N * 3));
    run(sc, N, 12, h);
    let inEgg = true, nearHome = true, moved = 0;
    for (let i = 0; i < N; i++) { if (egg(at(sc.p, i)) > 1.45) inEgg = false; if (fromHome(sc, i) > K.LOITER + 0.8) nearHome = false; moved += len([sc.p[i * 3] - was[i * 3], sc.p[i * 3 + 1] - was[i * 3 + 1], sc.p[i * 3 + 2] - was[i * 3 + 2]]); }
    ok(away > 0.85 * N && inside > 0.9 * N && far && speeds && units && homes && edges && back && at(sc.p, N).join() === kept.join() && at(sc.home, N).join() === keptHome.join()
      && spread1 > spread0 + 0.3 && arrived < 0.3 && inEgg && nearHome && spreadOf(sc) > spread0 + 0.25 && moved / N > 0.1 && mean(N, (i) => sc.sp[i]) < 1 && finite(sc.p),
      'a fright: every fish bolts away from the middle, between half and nearly all of the way to the edge of the egg, at the speed that takes it there in a dash, and one caught outside the egg bolts back in; then each loiters where it ended up, so the school stays scattered');
    ok(twin.d.join() === boltedD && twin.home.join() === boltedHome && twin.sp.join() === (() => { const again = made(); K.bolt(again, N, 1, K.rng(1001), true); return again.sp.join(); })() && twin.home.join() !== other.home.join() && twin.d.join() !== other.d.join(),
      'the same thump scatters the same school the same way, and another thump another way');
    // A peak while they are apart: each bolts again, its own way, less hard.
    const sp0 = Array.from(sc.sp.subarray(0, N)), d0 = Array.from(sc.d.subarray(0, N * 3));
    K.bolt(sc, N, K.JOSTLE, K.rng(9), false);
    let again = true, changed = 0;
    for (let i = 0; i < N; i++) {
      const reach = K.toEdge(sc, i), gone = fromHome(sc, i);
      if (reach > 0 && (gone < K.JOSTLE * K.BOLT[0] * reach - 1e-4 || gone > K.JOSTLE * (K.BOLT[0] + K.BOLT[1]) * reach + 1e-4)) again = false;
      if (!near(sc.sp[i], Math.max(sp0[i], K.DASH * gone), 1e-4)) again = false;
      if (dot(at(sc.d, i), at(d0, i)) < 0.99) changed++;
    }
    ok(again && changed > 0.9 * N, 'a peak while they are apart sends each off a new way, 0.6 as far');
  }

  // The way back, and the next shape.
  {
    const sc = K.createSchool(); run(sc, N, 2, how());
    K.bolt(sc, N, 1, K.rng(1001), true);
    run(sc, N, 3, how({ gain: 0, apart: true, random: K.rng(5) }));
    sc.form = K.nextForm(sc.form);
    const ease = (t) => t * t * (3 - 2 * t), r = K.rng(5);
    for (let n = 0; n < 90; n++) K.advance(sc, N, K.STEP, how({ gain: ease(n / 90), back: true, random: r }));
    run(sc, N, 8, how());
    let inRing = true;
    for (let i = 0; i < N; i++) { const q = lean(at(sc.p, i), 1), rho = Math.hypot(q[0], q[2]); if (rho < K.RING - 0.55 || rho > K.RING + 0.55 || Math.abs(q[1]) > 0.5) inRing = false; }
    ok(K.nextForm(0) === 1 && K.nextForm(1) === 2 && K.nextForm(2) === 0 && sc.form === 1 && inRing,
      'the shapes go round: ball, ring, column, ball; the fish that scattered from a ball stream back into a ring');
  }

  // The shimmer.
  {
    const sc = K.createSchool(), h = how();
    ok(K.pulseOf(0.5, 0.5) === 0 && K.pulseOf(0.2, 0.5) === 0 && near(K.pulseOf(0.6, 0.5), 0.5) && K.pulseOf(1, 0.2) === 1, 'a syllable is how much louder it has just become, five times over, at most 1');
    h.pulse = 1; K.advance(sc, N, K.STEP, h);
    h.pulse = 0.5; K.advance(sc, N, K.STEP, h);
    h.pulse = 0;
    for (let n = 0; n < 10; n++) K.advance(sc, N, K.STEP, h);
    const stepsRound = K.ROUND_S / K.STEP, r10 = 10.5 / stepsRound, r11 = 11.5 / stepsRound, r5 = 5.5 / stepsRound;
    put(sc.p, 0, unlean([1, 0.3, 0], 0)); put(sc.p, 1, unlean([0, -0.2, 2], 0)); put(sc.p, 2, unlean([-0.5, 0, 0], 0)); put(sc.p, 3, unlean([0, 0, -1], 0)); put(sc.p, 4, unlean([1, 0, 1], 0));
    ok(K.heard(sc, 0) === 0 && near(K.heard(sc, r10), 0.5 * (1 - K.FADE * r10), 1e-6) && near(K.heard(sc, r11), 1 - K.FADE * r11, 1e-6) && K.heard(sc, r5) === 0 && K.heard(sc, 0.999) === 0
      && (K.roundOf(sc, 0, 0) < 1e-6 || K.roundOf(sc, 0, 0) > 1 - 1e-6) && K.roundOf(sc, 0, 0) < 1 && near(K.roundOf(sc, 1, 0), 0.25, 1e-6) && near(K.roundOf(sc, 2, 0), 0.5, 1e-6) && near(K.roundOf(sc, 3, 0), 0.75, 1e-6) && near(K.roundOf(sc, 4, 0), 0.125, 1e-6),
      'the shimmer goes once round the school in 0.7 s: a fish a quarter of the way round hears a syllable a quarter of that later, and fainter the further round it is');
    // What each fish is sent.
    const A = new Float32Array(K.FISH_MAX * 4), B = new Float32Array(K.FISH_MAX * 4), bands = new Float32Array([0.5, 1, 0, 0, 0, 0, 0, 0]);
    put(sc.p, 5, unlean([Math.cos(2 * Math.PI * r11), 0, Math.sin(2 * Math.PI * r11)], 0));
    sc.sp[5] = 0.75; sc.sp[6] = 9;
    K.dress(A, B, sc, 8, { whole: true, dart: 0, flash: 0, bands, dt: K.STEP });
    const f5 = 1 - K.FADE * r11, first = Array.from(A.subarray(20, 24)).concat(Array.from(B.subarray(20, 24))), untouched = A[8 * 4];
    K.dress(A, B, sc, 8, { whole: true, dart: 0, flash: 0, bands, dt: 0 });
    const held = B[20];
    h.pulse = 0; for (let n = 0; n < 3; n++) K.advance(sc, 1, K.STEP, h);   // the syllable has passed fish 5 by
    const here = K.roundOf(sc, 5, 0);
    put(sc.p, 5, unlean([Math.cos(2 * Math.PI * 0.9), 0, Math.sin(2 * Math.PI * 0.9)], 0));
    K.dress(A, B, sc, 8, { whole: true, dart: 0, flash: 0, bands, dt: 0.05 });
    const faded = B[20];
    K.dress(A, B, sc, 8, { whole: true, dart: 0.5, flash: 0, bands, dt: 1 });
    const kicked = B[20];
    K.dress(A, B, sc, 8, { whole: false, dart: 0, flash: 0.8, bands, dt: 1 });
    const fright = B[20];
    K.dress(A, B, sc, 8, { whole: false, dart: 0, flash: 0, bands, dt: 9 });
    const C = new Float32Array(K.FISH_MAX * 4), E = new Float32Array(K.FISH_MAX * 4);
    K.dress(C, E, sc, 8, { whole: false, dart: 0, flash: 0, bands, dt: 0, lead: 0.004 });
    K.dress(A, B, sc, 8, { whole: false, dart: 0, flash: 0, bands, dt: 0, lead: -0.004 });
    const led = near(C[21], sc.beat[5] + 0.004 * (K.BEAT + K.BEAT_FAST * sc.sp[5]) / Math.sqrt(sc.size[5]), 1e-4) && near(E[23], 0.004 * sc.sp[5], 1e-7) && near(E[27], 0.004 * 9, 1e-6) && near(B[23], -0.004 * sc.sp[5], 1e-7) && near(A[21], sc.beat[5] - 0.004 * (K.BEAT + K.BEAT_FAST * sc.sp[5]) / Math.sqrt(sc.size[5]), 1e-4);
    ok(near(first[0], sc.size[5], 1e-6) && near(first[1], sc.beat[5], 1e-3) && near(first[2], sc.side[5] * K.ROLL * f5, 1e-5) && first[3] === 5 && near(first[4], f5, 1e-5) && near(first[5], 0, 1e-6) && near(first[6], 0.15, 1e-6) && first[7] === 0
      && near(B[1], 0.65, 1e-6) && B[5] === 1 && near(B[6 * 4 + 2], 0.2, 1e-6) && untouched === 0 && near(held, f5, 1e-5)
      && here > 0 && near(faded, f5 * Math.exp(-0.05 / K.FLASH_KEEP_S), 1e-5) && near(kicked, 0.3, 1e-6) && near(fright, 0.8, 1e-6) && B[20] === 0 && A[22] === 0 && led,
      'what a fish is sent: its size, its tail\'s beat, its band, a roll onto its side as far as it flashes, a glow as loud as its band and a tail that swings wider the faster it swims; a flash lingers a moment, a beat flashes every fish by 0.6 of it, and apart only the fright does; and it is sent how far to draw it on along its way, and its tail on in its beat, for the time the school is ahead of or behind its steps');
  }

  // The bubbles.
  {
    const sc = K.createSchool(), b = K.createBubbles(), b2 = K.createBubbles(), b3 = K.createBubbles(9);
    const none = Array.from(b.lit).every((v) => v === 0) && Array.from(b.life).every((v) => v === 0) && [0, 1, 2].every((j) => b.p[j * 3 + 1] === 99);
    K.stepBubbles(b, sc, N, 1); K.stepBubbles(b, sc, N, 1);
    const stillNone = Array.from(b.life).every((v) => v === 0);
    K.stepBubbles(b, sc, N, 1);
    const born = Array.from(b.life).filter((v) => v > 0).length, life1 = b.life[0], y1 = b.p[1];
    let from = -1;
    for (let i = 0; i < N; i++) if (near(sc.p[i * 3], b.p[0], 0.01) && near(sc.p[i * 3 + 2], b.p[2], 1e-6)) from = i;
    K.stepBubbles(b, sc, N, 0);
    const rose = b.p[1] - y1, life2 = b.life[0];
    for (let n = 0; n < Math.ceil(K.BUBBLE_S / K.STEP) + 2; n++) K.stepBubbles(b, sc, N, 0);
    const dead = b.life[0] <= 0 && b.lit[0] === 0 && b.p[1] === 99;
    for (let n = 0; n < 600; n++) K.stepBubbles(b2, sc, N, 1);
    const live = Array.from(b2.life).filter((v) => v > 0).length;
    ok(none && stillNone && born === 1 && near(life1, 1 - K.STEP / K.BUBBLE_S, 1e-6) && from >= 0 && near(rose, (0.35 + 6 * b.size[0]) * K.STEP, 1e-5) && near(life2, 1 - 2 * K.STEP / K.BUBBLE_S, 1e-6) && dead
      && live > 55 && live <= K.BUBBLES && Array.from(b2.lit).every((v) => v >= 0 && v <= 1) && b.size.join() === b2.size.join() && b.size.join() !== b3.size.join() && Array.from(b.size).every((v) => v >= 0.03 && v <= 0.08) && finite(b2.p),
      'bubbles leave the school on a syllable, 26 a second at its loudest, each from where a fish is; a bubble rises, lasts 2.6 s and is then put away');
  }

  // The room it needs.
  {
    const sc = K.createSchool(), D = (K.FRAME.height / 2) / Math.tan((K.FOV * Math.PI) / 360);
    put(sc.p, 0, [1, 0.5, 0.4]); sc.size[0] = 1;
    const reach = K.TAIL * K.LEN, persp = D / (D - 0.4);
    const ex = (1 + 0.4 * Math.sin(0.2) + reach) * persp / (K.FRAME.width / 2), ey = (0.5 + 0.4 * Math.sin((K.PITCH * Math.PI) / 180) + reach) * persp / (K.FRAME.height / 2);
    const one = K.needOf(sc, 1, 0.2);
    put(sc.p, 0, [0.2, -1.5, -0.4]);
    const low = K.needOf(sc, 1, 0), eyLow = (1.5 + 0.4 * Math.sin((K.PITCH * Math.PI) / 180) + reach) * (D / (D + 0.4)) / (K.FRAME.height / 2);
    const fresh = K.createSchool(), ring = K.createSchool(); ring.form = 1; run(ring, N, 12, how({ flame: 0.3 }));
    ok(near(one, Math.max(ex, ey), 1e-6) && ex > ey && near(low, eyLow, 1e-6) && K.needOf(fresh, K.FISH_MAX, K.swayFor(100)) < K.FILL && K.needOf(ring, N, K.swayFor(100)) < 1.1 && K.needOf(fresh, 0, 0) === 0
      && K.roomFor(0.5, 1) === 1 && K.roomFor(K.FILL, 1) === 1 && near(K.roomFor(1.92, 1), 0.5) && near(K.roomFor(0.96, 2), 0.5) && near(K.roomFor(0.6, 1.25), 1) && near(K.roomFor(0.8, 1.5), 0.8)
      && K.zoomAfter(1, 0.7, 0.016) === 0.7 && near(K.zoomAfter(0.5, 1, 0.1), 0.5 + 0.5 * (1 - Math.exp(-K.ZOOM_BACK * 0.1))) && K.zoomAfter(0.5, 1, 0) === 0.5 && K.zoomAfter(0.9995, 1, 0.016) === 1 && K.zoomAfter(0.8, 0.8, 1) === 0.8,
      'how much of the frame the school needs: the furthest any fish reaches, tail and all, as the swaying camera sees it; needing more than 0.96 of it, or enlarged, it is drawn smaller at once, and grows back at 2 a second');
    ok(K.orbitAt(3, 0) === 0 && near(K.orbitAt(3, 50), K.SWAY * Math.sin(K.ORBIT_RATE * 3)) && near(K.orbitAt(3, 100), 2 * K.orbitAt(3, 50)) && near(K.orbitAt(3, undefined), K.orbitAt(3, 50)) && near(K.orbitAt(3, 'x'), K.orbitAt(3, 50)) && near(K.orbitAt(3, 400), K.orbitAt(3, 100)) && K.orbitAt(3, -5) === 0
      && K.swayFor(0) === 0 && near(K.swayFor(50), K.SWAY) && near(K.swayFor(100), 2 * K.SWAY) && near(K.swayFor(NaN), K.SWAY),
      'Camera drift: none at 0, a sway of 0.16 radians each way at 50, twice that at 100');
  }

  // The loudest it gets, with every fish.
  {
    const sc = K.createSchool(), all = new Float32Array(8).fill(1), b = K.createBubbles();
    run(sc, K.FISH_MAX, 6, how({ flame: 1, dart: 1, bands: all, pulse: 1, bubbles: b }));
    const some = Array.from(b.life).filter((v) => v > 0).length;
    ok(finite(sc.p) && finite(sc.d) && finite(sc.sp) && K.needOf(sc, K.FISH_MAX, K.swayFor(100)) < 1.25 && mean(K.FISH_MAX, (i) => sc.sp[i]) > 2 && some > 55 && near(K.heard(sc, 0), 1),
      'as loud as it gets, with all 480 fish: every number is still a number, the school is still about the size of the frame, and the bubbles and the shimmer were stepped with it');
  }

  // What breaking it on purpose slipped past the checks above.
  {
    ok(K.countFor(36) === 232 && K.countFor(37) === 240 && K.countFor(38) === 240 && K.settle(5e-3) === 5e-3 && K.settle(-0.3) === -0.3 && K.settle(-5e-3) === -5e-3,
      'Density rounds to the nearest whole fish to a band; only what is within a ten-thousandth of nothing is nothing, on either side');
    const f = K.fishShape();
    ok(f.points[152 * 3] === Math.fround(-1.62) && f.points[152 * 3 + 1] === Math.fround(0.46) && f.points[153 * 3 + 1] === Math.fround(-0.46) && f.points[154 * 3] === Math.fround(-1.3) && f.points[154 * 3 + 1] === 0 && f.points[150 * 3 + 1] === Math.fround(0.045),
      'the tail is forked: its two tips are 0.46 above and below the middle, and the notch between them is 1.3 behind it');
    // How far apart two fish keep is by their two sizes.
    const sc = K.createSchool(), out = [0, 0, 0];
    sc.size[0] = 1; sc.size[1] = 1.5;
    put(sc.p, 0, [0, 0, 0]); put(sc.d, 0, [1, 0, 0]); put(sc.p, 1, [0.25, 0, 0]); put(sc.d, 1, [1, 0, 0]);
    K.flock(out, sc, 2, 0, true, 0, 1);
    const clear = K.CLEAR * 2.5, w = (1 - 0.25 / clear) / 0.25;
    ok(near(out[0], -K.PART * 0.25 * w + K.STAY * 0.25, 1e-6) && out[1] === 0 && out[2] === 0, 'a big fish is given more room: 0.11 for each unit of the two sizes added');
  }
  {
    // A fish alone: its place, a new one once it is there, and the wall of the egg.
    const sc = K.createSchool(), W = [0, 0, 0];
    put(sc.p, 0, [1, 0, 0]); put(sc.d, 0, [1, 0, 0]); put(sc.home, 0, [1.2, 0.3, 0]); put(sc.roam, 0, [1, 1, 0]);
    const leaving1 = K.wander(W, sc, 0, K.rng(4)), far = W.slice(), kept = at(sc.roam, 0).join();
    put(sc.roam, 0, [1.1, 0.1, 0]);
    const leaving2 = K.wander(W, sc, 0, K.rng(4)), next = at(sc.roam, 0), toNext = W.slice(), want = unit([next[0] - 1, next[1], next[2]]), fromHome = len([next[0] - sc.home[0], next[1] - sc.home[1], next[2] - sc.home[2]]);
    put(sc.p, 0, [2.4, 0, 0]); put(sc.roam, 0, [2.4, 1, 0]);
    const leaving3 = K.wander(W, sc, 0, K.rng(4)), pushed = W.slice();
    put(sc.d, 0, [-1, 0, 0]);
    const leaving4 = K.wander(W, sc, 0, K.rng(4));
    ok(leaving1 === false && near(far[0], 0, 1e-6) && near(far[1], 1, 1e-6) && far[2] === 0 && kept === '1,1,0'
      && leaving2 === false && len([next[0] - 1.1, next[1] - 0.1, next[2]]) > 1e-3 && fromHome > 0 && fromHome <= K.LOITER + 1e-6 && [0, 1, 2].every((c) => near(toNext[c], want[c], 1e-6))
      && leaving3 === true && near(pushed[0], -K.WALL * (1.2 - K.WALL_FROM), 1e-5) && near(pushed[1], 1, 1e-6) && leaving4 === false,
      'alone, a fish makes for its place; within 0.3 of it, it is given another within 0.4 of where its fright left it; outside the egg it is turned back, 3 for each tenth it is past nine tenths of the way out, and says whether it is still heading out');
  }
  {
    // One step's turning and speed, by hand: in the school, streaming back, and alone.
    const expected = (d0, des, turn) => unit([0, 1, 2].map((c) => d0[c] + (des[c] - d0[c]) * turn));
    const S = [0, 0, 0], W = [0, 0, 0];
    // In the school, out of its place, with the sound at half and a beat: it does not hurry.
    const a = K.createSchool(), qa = lean(at(a.p, 0), 0);
    put(a.p, 0, unlean([qa[0] * 1.6, qa[1] * 1.6, qa[2] * 1.6], 0));
    const da = at(a.d, 0), spa = a.sp[0];
    K.steer(S, a, 0, 0, 1 - K.TIGHT * 0.5, 0);
    const wantA = expected(da, unit(S), (K.TURN + K.TURN_LOUD * 0.5) * K.STEP);
    K.stepSchool(a, 1, how({ flame: 0.5, dart: 1 }));
    const okA = [0, 1, 2].every((c) => near(a.d[c], wantA[c], 1e-5)) && near(a.sp[0], spa + (K.wantOf(a.size[0], 1, 0, 0.5, 0, 1) - spa) * K.SPEED_RATE * K.STEP, 1e-5);
    // Streaming back, half way to being a school, far from its place: it steers half by the school and half as a fish alone, turns faster, and hurries as for one unit.
    const b = K.createSchool(), qb = lean(at(b.p, 0), 0);
    put(b.p, 0, unlean([qb[0] * 4, qb[1] * 4, qb[2] * 4], 0)); put(b.roam, 0, [b.p[0], b.p[1] + 2, b.p[2]]);
    const db = at(b.d, 0), spb = b.sp[0], away = K.steer(S, b, 0, 0, 1, 0);
    K.wander(W, b, 0, K.rng(4));
    const wantB = expected(db, unit([0, 1, 2].map((c) => 0.5 * S[c] + 0.5 * W[c])), (K.TURN + K.TURN_BACK) * K.STEP);
    K.stepSchool(b, 1, how({ gain: 0.5, back: true }));
    const okB = away > 1 && [0, 1, 2].every((c) => near(b.d[c], wantB[c], 1e-5)) && near(b.sp[0], spb + (K.wantOf(b.size[0], 0.5, 1, 0, 0, 0) - spb) * K.SPEED_RATE * K.STEP, 1e-5);
    // Alone and fast: it turns as a fish alone does, the less the faster it is going, and slows in a dash.
    const c3 = K.createSchool();
    put(c3.roam, 0, [c3.p[0], c3.p[1] + 2, c3.p[2]]); c3.sp[0] = 3;
    const dc = at(c3.d, 0);
    K.wander(W, c3, 0, K.rng(4));
    const wantC = expected(dc, W, (K.TURN + K.TURN_APART) * K.STEP / (1 + K.BOLT_STIFF * (3 - K.BOLT_FAST)));
    K.stepSchool(c3, 1, how({ gain: 0, apart: true }));
    const okC = [0, 1, 2].every((c) => near(c3.d[c], wantC[c], 1e-5)) && near(c3.sp[0], 3 + (K.wantOf(c3.size[0], 0, 0, 0, 0, 0) - 3) * K.DASH * K.STEP, 1e-5);
    ok(okA && okB && okC, 'one step by hand: in the school a fish turns 2.4 a second toward where it is steered, and 2.5 more at the loudest, and does not hurry however far from its place; streaming back it steers by its share of each, turns 2 a second faster and hurries as for a unit at most; alone it turns 1 a second faster, less the faster it goes');
  }
  {
    // Already apart, the way a fish bolts has nothing to do with where it is. And the fish do not all go as far.
    const b1 = K.createSchool(), b2 = K.createSchool(), b3 = K.createSchool();
    run(b2, N, 2, how({ flame: 0.4 })); run(b3, N, 2, how({ flame: 0.4 }));
    K.bolt(b1, N, K.JOSTLE, K.rng(9), false); K.bolt(b2, N, K.JOSTLE, K.rng(9), false); K.bolt(b3, N, 1, K.rng(1001), true);
    let sameWay = 0, least = 9, most = 0;
    for (let i = 0; i < N; i++) {
      if (dot(at(b1.d, i), at(b2.d, i)) > 1 - 1e-6) sameWay++;
      const reach = K.toEdge(b3, i);
      if (reach > 0) { const share = len([b3.home[i * 3] - b3.p[i * 3], b3.home[i * 3 + 1] - b3.p[i * 3 + 1], b3.home[i * 3 + 2] - b3.p[i * 3 + 2]]) / reach; least = Math.min(least, share); most = Math.max(most, share); }
    }
    ok(sameWay > 0.9 * N && least < 0.56 && most > 0.89, 'already apart, the way a fish bolts has nothing to do with where it is; and from a school some fish go half way to the edge and some nearly all of it');
  }
  {
    // Apart, a fish hears no shimmer. And a flash that has all but gone is gone.
    const sc = K.createSchool(), A = new Float32Array(K.FISH_MAX * 4), B = new Float32Array(K.FISH_MAX * 4), h = how({ pulse: 1 });
    K.advance(sc, 1, K.STEP, h);
    put(sc.p, 3, unlean([1, 0, 0.001], 0));
    K.dress(A, B, sc, 8, { whole: false, dart: 0, flash: 0, bands: quiet, dt: K.STEP });
    const apart = B[12];
    K.dress(A, B, sc, 8, { whole: true, dart: 0, flash: 0, bands: quiet, dt: K.STEP });
    const whole = B[12];
    K.dress(A, B, sc, 8, { whole: false, dart: 0, flash: 5e-5, bands: quiet, dt: 60 });
    ok(apart === 0 && whole > 0.99 && B[12] === 0 && sc.flash[3] === 0, 'apart, a fish hears no shimmer; and a flash that has all but gone is gone');
    // Bubbles: from different fish, none in a pause, none with no fish.
    const live = (b) => Array.from(b.life).filter((v) => v > 0).length;
    const still = K.createSchool(), q1 = K.createBubbles(), q0 = K.createBubbles();
    for (let n = 0; n < 8; n++) K.stepBubbles(q1, still, N, 1);
    const xs = [0, 1, 2].map((j) => q1.p[j * 3]), born = live(q1);
    for (let n = 0; n < 30; n++) K.stepBubbles(q1, still, N, 0);
    for (let n = 0; n < 10; n++) K.stepBubbles(q0, still, 0, 1);
    ok(born === 3 && live(q1) === 3 && Math.max(...xs) - Math.min(...xs) > 0.05 && live(q0) === 0 && q0.owed < 1 && q0.p[1] === 99,
      'bubbles leave from different fish, none leaves in a pause, and none when there are no fish');
    // The room a big fish needs is by its size. And how it is drawn smaller in a frame of no time.
    const big = K.createSchool(), D = (K.FRAME.height / 2) / Math.tan((K.FOV * Math.PI) / 360);
    put(big.p, 0, [1, 0.5, 0.4]); big.size[0] = 1.4;
    const reach = K.TAIL * K.LEN * Math.fround(1.4), persp = D / (D - Math.fround(0.4));
    ok(near(K.needOf(big, 1, 0), Math.max((1 + reach) * persp / (K.FRAME.width / 2), (0.5 + Math.fround(0.4) * Math.sin((K.PITCH * Math.PI) / 180) + reach) * persp / (K.FRAME.height / 2)), 1e-6)
      && K.zoomAfter(1, 0.7, 0) === 0.7 && K.zoomAfter(0.9995, 1, 0) === 0.9995,
      'a big fish needs more room, by its size; needing less room it is drawn smaller at once, even in a frame of no time, and in such a frame it does not grow back');
  }

  // Density raised: the fish that join are put among the living, not where they were left.
  {
    const sc = K.createSchool(); run(sc, N, 2, how({ flame: 0.4 }));
    K.bolt(sc, N, 1, K.rng(1001), true);
    const apart = how({ gain: 0, apart: true, flame: 0.4, random: K.rng(5) });
    run(sc, N, 2, apart);
    const stale = at(sc.p, 200), old = Array.from(sc.p.subarray(0, N * 3));
    sc.flash[200] = 0.7;   // left over from when it last swam
    K.join(sc, N, K.FISH_MAX);
    let beside = true, kept = true;
    for (let i = N; i < K.FISH_MAX; i++) {
      const j = i % N, off = [K.JOIN * sc.off[i], K.JOIN * sc.off2[i], K.JOIN * sc.high[i]];
      for (let c = 0; c < 3; c++) if (!near(sc.p[i * 3 + c], sc.p[j * 3 + c] + off[c], 1e-5) || !near(sc.home[i * 3 + c], sc.home[j * 3 + c] + off[c], 1e-5) || !near(sc.roam[i * 3 + c], sc.roam[j * 3 + c] + off[c], 1e-5) || sc.d[i * 3 + c] !== sc.d[j * 3 + c]) beside = false;
      if (sc.sp[i] !== sc.sp[j] || sc.flash[i] !== 0 || sc.band[i] !== sc.band[j]) beside = false;
    }
    for (let i = 0; i < N * 3; i++) if (sc.p[i] !== old[i]) kept = false;
    run(sc, K.FISH_MAX, 3, apart);
    const out = (from, to) => { let s = 0; for (let i = from; i < to; i++) s += len(at(sc.p, i)); return s / (to - from); };
    const none = K.createSchool(), was = none.p.join(); K.join(none, 0, 96); K.join(none, 96, 96); K.join(none, 96, 8);
    ok(beside && kept && len([stale[0] - sc.p[600], stale[1] - sc.p[601], stale[2] - sc.p[602]]) > 0.05 && Math.abs(out(N, K.FISH_MAX) - out(0, N)) < 0.2 && out(N, K.FISH_MAX) > 1 && none.p.join() === was && finite(sc.p),
      'fish that join when Density is raised are put beside the fish already there, of their own band, heading and swimming as they do and with their places to loiter; so a scattered school stays scattered');
  }

  // The scene.
  {
    const def = K.definition();
    ok(def.fov === 30 && def.pitch === 6 && def.cooling.join() === '0.08,0.08,0.08' && typeof def.build === 'function' && typeof def.update === 'function' && typeof def.debug === 'function'
      && JSON.stringify(def.frame) === JSON.stringify(K.FRAME) && def.frame !== K.FRAME && def.frame.center !== K.FRAME.center && K.definition().frame !== def.frame
      && ['iPos', 'iFwd', 'iA', 'iB', 'modelMatrix', 'fin', 'f * iB.w'].every((w) => K.VERT.includes(w)) && ['uPal', 'uShift', 'uT', 'gl_FrontFacing'].every((w) => K.FRAG.includes(w)) && /gl_FragColor = vec4\(col, 1\.0\)/.test(K.FRAG)
      && K.BUBBLE_VERT.includes('uPx') && K.BUBBLE_FRAG.includes('uColor'),
      'the scene definition gives the kit its frame, its camera and its two halves, and a frame of its own each time; the fish are drawn solid');
  }
  ok(T.ACTIVE_VIZ_NAMES.length === 52 && T.ACTIVE_VIZ_NAMES.indexOf('school-of-fish') === T.ACTIVE_VIZ_NAMES.indexOf('boids') + 1 && T.VIZ_USES_3D.includes('school-of-fish')
    && T.VIZ_SCENES.includes('school-of-fish') && T.VIZ_LABELS['school-of-fish'] === 'School of Fish'
    && JSON.stringify(T.DEFAULT_PER_VIZ['school-of-fish']) === '{"density":50,"frightSensitivity":50,"regroupSeconds":3,"cameraDrift":50}' && JSON.stringify(T.PER_VIZ_MAX['school-of-fish']) === '{"regroupSeconds":10}',
    'school-of-fish is the 52nd effect, listed after boids as "School of Fish": a kit scene, with Density, the two thump settings and Camera drift');
  // The files.
  {
    const pages = [];
    for (const p of ['300x220', '1440x1080', '1920x1080']) {
      const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
      const pos = html.indexOf('src="school-of-fish.js"');
      pages.push(pos > html.indexOf('src="jelly.js"') && pos > html.indexOf('src="scene-kit.js"') && html.includes('src="helix.js"') && pos < html.indexOf('src="factories/') && html.split('src="school-of-fish.js"').length === 2 && html.split('src="factories/school-of-fish.js"').length === 2
        && html.indexOf('src="factories/school-of-fish.js"') > html.indexOf('src="factories/boids.js"'));
    }
    ok(pages.every(Boolean), 'all three overlay pages load school-of-fish.js once, after the scene kit and jelly.js and before the factories, and the shatter machine it uses');
    const factory = await readFile(resolve(__dirname, 'overlay/factories/school-of-fish.js'), 'utf8');
    ok(/VIZ_FACTORIES\['school-of-fish'\] = TimbreScene\.factory\(\(\) => TimbreSchool\.definition\(\)\);/.test(factory) && !/WebGLRenderer/.test(factory), 'the effect is the kit\'s factory around the school\'s definition, with no renderer of its own');
    ok(!/Math\.random/.test(await readFile(resolve(__dirname, 'overlay/school-of-fish.js'), 'utf8')), 'the school takes no numbers from Math.random, so a thump scatters the fish the same way every time');
    const saved = T.sanitizeConfig({ activeViz: 'school-of-fish', perViz: { 'school-of-fish': { density: 80, regroupSeconds: 99, frightSensitivity: -4 } } });
    ok(saved.activeViz === 'school-of-fish' && JSON.stringify(saved.perViz['school-of-fish']) === '{"density":80,"frightSensitivity":0,"regroupSeconds":10,"cameraDrift":50}', 'a saved config is kept; Regroup seconds is held to 10 and Fright sensitivity to 0 and up');
  }
}

console.log('\n[24] boids');
await import('./overlay/scene-kit.js');
await import('./overlay/boids.js');
{
  const K = globalThis.TimbreBoids;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const quiet = new Float32Array(8);
  const finite = (a) => { for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return false; return true; };
  const how = (over = {}) => Object.assign({ flame: 0, bands: quiet, loose: false, spread: 1, pulse: 0, random: K.rng(3) }, over);
  const run = (fl, n, secs, h, fps = 60) => { let steps = 0; for (let i = 0, m = Math.round(secs * fps); i < m; i++) steps += K.advance(fl, n, 1 / fps, h); return steps; };
  const at = (a, i) => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]];
  const put = (a, i, v) => { a[i * 3] = v[0]; a[i * 3 + 1] = v[1]; a[i * 3 + 2] = v[2]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(a[0], a[1], a[2]);
  const mean = (n, f) => { let t = 0; for (let i = 0; i < n; i++) t += f(i); return t / n; };
  const count = (fl, n, st) => { let c = 0; for (let i = 0; i < n; i++) if (fl.state[i] === st) c++; return c; };
  // Everything that is drawn of a flock, to tell whether anything has changed.
  const snapshot = (fl) => [fl.p, fl.v, fl.head, fl.fold, fl.flap, fl.roll, fl.bounce, fl.bounceV, fl.state].map((a) => Array.from(a).join()).join('|');
  const loudBands = (v) => new Float32Array(8).fill(v);
  const N = 60;

  ok(K.BANDS === 8 && K.WIRES === 3 && K.PER_MIN === 12 && K.PER_MAX === 28 && K.BIRDS_MAX === 84 && K.SEED === 20261123 && K.STEP === 1 / 60 && K.STEPS_MAX === 6
    && JSON.stringify(K.WIRE_Y) === '[-0.45,-0.95,-1.45]' && K.SPAN === 2 && K.REACH === 1.65 && K.SAG === 0.12 && K.LOAD_SAG === 0.03 && K.SEG === 48 && K.WIRE_HALF === 0.011 && K.FADE === 0.45
    && K.SPRING === 300 && K.SPRING_DAMP === 6 && K.LEAVE === 0.18 && K.LAND_KICK === 0.25 && K.BOUNCE_MAX === 0.08 && K.SIZE === 0.25 && K.PERCH === 0.34 && K.FIT === 0.14 && K.JITTER === 0.15
    && JSON.stringify(K.AIR) === '[1.75,0.7,0.75]' && K.AIR_Y === 0.62 && JSON.stringify(K.HARD) === '[2.15,0.8,1]' && K.HARD_FROM === 0.8 && K.KEEP === 3 && K.FOV === 30 && K.PITCH === 6 && JSON.stringify(K.FRAME) === '{"width":5,"height":3.9,"center":[0,0,0]}' && K.LINGER === 0.08,
    'the sizes: three wires, 12 to 28 birds to a wire, steps of 1/60 s, an egg of air above the wires and a frame of 5 by 3.9');
  ok(JSON.stringify(K.CRUISE) === '[1.1,1]' && K.LOOSE_FAST === 1.3 && JSON.stringify(K.LEAD_RATE) === '[0.45,0.9]' && JSON.stringify(K.LEAD) === '[1,0.3,0.45]' && JSON.stringify(K.LEAD_WIDE) === '[0.7,0.3]'
    && JSON.stringify(K.PLACE) === '[0.8,0.4,0.5]' && JSON.stringify(K.TURN) === '[3.5,2]' && K.SPEED_RATE === 3 && K.LEVEL === 0.7 && K.ALIGN === 0.7 && K.NEAR === 0.7 && K.CLEAR === 0.4 && K.PART === 2.5 && K.WALL === 8 && K.WALL_FROM === 0.95 && K.WALL_OUT === 1.1 && K.WALL_SLOW === 0.85 && K.ROOM === 0.85 && K.TOP === 4.2
    && K.HOME_HIGH === 0.3 && K.HOME_BACK === 0.45 && K.HOME_NEAR === 0.55 && K.HOME_OVER === 0.35 && K.HOME_CLEAR === 0.3 && K.HOME_FAST === 2 && JSON.stringify(K.HOME_SLOW) === '[0.25,2.5]' && JSON.stringify(K.HOME_SEEK) === '[5,10]' && K.LANDED === 0.02
    && JSON.stringify(K.UP) === '[1.7,0.5,0.9,1]' && JSON.stringify(K.UP_HARD) === '[1.8,0.6,3,1.6]' && JSON.stringify(K.OFF) === '[0,0.6,0.8]' && JSON.stringify(K.PANE) === '[0.1,0.25]' && K.YAW_MAX === 9 && K.PITCH_MAX === 1.2
    && K.BANK === 0.22 && K.BANK_MAX === 1.1 && K.BANK_RATE === 6 && K.FLAP_RATE === 7 && JSON.stringify(K.BEAT) === '[13,9]' && K.FOLD_RATE === 6 && K.UNFOLD_RATE === 12 && K.TURN_HEAD === 10 && K.FACE_RATE === 8
    && JSON.stringify(K.NERVE) === '[0.1,0.42]' && JSON.stringify(K.STAY) === '[0.5,0.8]' && JSON.stringify(K.CALL) === '[1.25,0.7]' && K.RISE === 20 && K.FALL === 5 && K.TRAIL === 8 && K.PULSE === 5
    && K.HISTORY === 64 && K.WAVE === 22 && K.WAVE_MAX === 40 && K.WAVE_ROLL === 0.8 && K.KICK_FLASH === 0.5 && K.FLASH_S === 0.3 && K.SWAY === 0.12 && K.ORBIT_RATE === 0.13,
    'the rest of its numbers: how the lead wheels, how a bird flies, comes home, banks and beats, what it hears, and how the camera sways');

  // The settings and the sound.
  ok(K.countFor(0) === 36 && K.countFor(50) === 60 && K.countFor(100) === 84 && K.countFor(25) === 48 && K.countFor(3) === 36 && K.countFor(4) === 39 && K.countFor(-9) === 36 && K.countFor(900) === 84 && K.countFor(undefined) === 60 && K.countFor(NaN) === 60 && K.countFor('7') === 60
    && [0, 1, 13, 37, 50, 77, 99, 100].every((d) => K.countFor(d) % 3 === 0),
    'Density 0 is 36 birds, 50 is 60 and 100 is 84, the same number to each wire, to the nearest whole bird; anything that is not a number is 50');
  ok(K.spreadFor(0) === 2 && K.spreadFor(50) === 1 && K.spreadFor(100) === 0.5 && near(K.spreadFor(75), Math.SQRT1_2) && K.spreadFor(-20) === 2 && K.spreadFor(300) === 0.5 && K.spreadFor(undefined) === 1 && K.spreadFor('x') === 1,
    'Cohesion 0 is a flock spread twice as wide, 100 one half as wide; anything that is not a number is 50');
  ok(K.loudness(null, 0, 1) === 0 && K.loudness([255], 3, 1) === 0 && near(K.loudness([51, 255], 0, 1), 0.2) && K.loudness([51, 255], 1, 2) === 1 && near(K.loudness([51, 255], 0, 2), 0.4)
    && K.idle(0, 0) === 0 && near(K.idle(0, 3), 0.45 * Math.sin(1.35) - 0.2) && K.idle(3, 5) === 0 && near(K.idle(1, 1), 0.45 * Math.sin(0.45 + 1.4) - 0.2) && K.idle(2, 1.6) === 0 && near(K.idle(0, Math.PI / 0.9), 0.25)
    && K.settle(5e-5) === 0 && K.settle(-5e-5) === 0 && K.settle(0.3) === 0.3 && K.settle(5e-3) === 5e-3 && K.settle(-0.3) === -0.3
    && near(K.callOf(0.4, 0), 0.5) && near(K.callOf(0, 0.6), 0.42) && near(K.callOf(0.4, 0.9), 0.63) && near(K.callOf(0.6, 0.9), 0.75)
    && K.pulseOf(0.5, 0.5) === 0 && K.pulseOf(0.2, 0.5) === 0 && near(K.pulseOf(0.6, 0.5), 0.5) && K.pulseOf(1, 0.2) === 1,
    'a band is its bin of 255 times Gain, at most 1; idle, the bands swell in turn, a quarter at most and each for about a third of the time; all but nothing is nothing; a bird\'s call is its band and a quarter more, or seven tenths of the voice, whichever is louder; a syllable is how much louder it has just become');
  {
    const a = K.rng(5), b = K.rng(5), c = K.rng(6), xs = [a(), a(), a()], ys = [b(), b(), b()], zs = [c(), c(), c()];
    ok(xs.join() === ys.join() && xs.join() !== zs.join() && xs.every((v) => v >= 0 && v < 1), 'its random numbers are the same for the same seed');
  }

  // One bird.
  {
    const f = K.birdShape(), V = f.points.length / 3, T3 = f.index.length / 3, BODY = 13 * 8;
    let unitLong = true, outward = true, far = [0, 0, 0], least = 9;
    for (let v = 0; v < V; v++) {
      const p = at(f.points, v), n = at(f.normals, v);
      if (!near(len(n), 1, 1e-5)) unitLong = false;
      if (v < BODY && Math.hypot(p[1], p[2]) > 1e-6 && n[1] * p[1] + n[2] * p[2] <= 0) outward = false;
      for (let c = 0; c < 3; c++) far[c] = Math.max(far[c], Math.abs(p[c]));
      least = Math.min(least, p[0]);
    }
    const w = Array.from(f.wing), R = BODY + 8, L = R + 5;
    ok(V === 122 && T3 === 201 && w.slice(0, R).every((v) => v === 0) && w.slice(R, L).every((v) => v > 0) && w.slice(L).every((v) => v < 0) && near(w[R + 4], 1, 1e-6) && near(w[L + 4], -1, 1e-6) && near(w[R + 2], 0.5, 1e-6) && w[R] > 0 && w[R] < 0.01
      && unitLong && outward && near(far[0], 0.98, 1e-6) && least === -Math.fround(0.98) && near(far[2], 1.2, 1e-6) && f.points[(R + 4) * 3 + 2] === Math.fround(1.2) && f.points[(L + 4) * 3 + 2] === -Math.fround(1.2)
      && f.points[(BODY + 5) * 3] === Math.fround(0.68) && [R, R + 4, L, L + 4, BODY].every((v) => at(f.normals, v).join() === '0,1,0')
      && [0, 3, 7].every((v) => near(f.points[v * 3], -0.5, 1e-6) && Math.hypot(f.points[v * 3 + 1], f.points[v * 3 + 2]) < 1e-6) && [96, 100, 103].every((v) => near(f.points[v * 3], 0.5, 1e-6) && Math.hypot(f.points[v * 3 + 1], f.points[v * 3 + 2]) < 1e-6),
      'one bird: a body of 104 points closed at both ends and facing outward, with a head; a tail and a beak; and two wings of five points each that reach 1.2 to either side, their tops facing up, each point saying how far out along its wing it is');
  }

  // The flock as it is made.
  {
    const a = K.createFlock(), b = K.createFlock(K.SEED, 60), c = K.createFlock(7, 60);
    let rows = true, seated = true, made = true;
    const bandsSeen = new Set();
    for (let i = 0; i < 60; i++) {
      if (a.wire[i] !== i % 3 || a.slot[i] !== Math.floor(i / 3)) rows = false;
      if (Math.abs(a.seatX[i]) > K.REACH + 0.05 || (i >= 3 && a.seatX[i] <= a.seatX[i - 3]) || a.band[i] !== Math.min(7, Math.floor(8 * a.slot[i] / 20))) rows = false;
      bandsSeen.add(a.band[i]);
      const y = K.WIRE_Y[a.wire[i]] - (K.SAG + K.LOAD_SAG) * (1 - (a.seatX[i] / K.SPAN) ** 2) + K.PERCH * K.SIZE * a.size[i];
      if (a.state[i] !== 0 || a.p[i * 3] !== a.seatX[i] || !near(a.p[i * 3 + 1], y, 1e-6) || a.p[i * 3 + 2] !== 0 || len(at(a.v, i)) !== 0 || a.fold[i] !== 1 || a.flap[i] !== 0 || a.roll[i] !== 0 || at(a.head, i).join() !== at(a.face, i).join()) seated = false;
      if (!near(len(at(a.face, i)), 1, 1e-5) || a.face[i * 3 + 1] < 0.85 || a.face[i * 3 + 2] <= 0 || a.size[i] < 0.85 || a.size[i] > 1.2001 || a.nerve[i] < K.NERVE[0] || a.nerve[i] > K.NERVE[0] + K.NERVE[1] + 1e-6 || a.stay[i] < K.STAY[0] || a.stay[i] > K.STAY[0] + K.STAY[1] + 1e-6
        || Math.abs(a.off[i * 3]) > 1 || Math.abs(a.off[i * 3 + 1]) > 1 || Math.abs(a.off[i * 3 + 2]) > 1) made = false;
    }
    ok(rows && seated && made && a.n === 60 && a.per === 20 && bandsSeen.size === 8 && a.load.join() === '1,1,1' && a.bounce.join() === '0,0,0' && a.left === 0 && a.sitting === 60 && a.flying === 0
      && a.seatX.join() === b.seatX.join() && a.nerve.join() === b.nerve.join() && a.nerve.join() !== c.nerve.join()
      && mean(60, (i) => a.face[i * 3]) > -0.15 && mean(60, (i) => a.face[i * 3]) < 0.15 && mean(60, (i) => a.nerve[i]) < 0.3,
      'the flock as made: 60 birds in three rows of 20 along the wires, each sitting upright in its own seat with its wings folded, the bands running from low at the left to high at the right; the same every time');
  }

  // The wires.
  {
    const fl = K.createFlock();
    fl.load[0] = 0; fl.load[1] = 0.5; fl.bounce[2] = 0.05;
    const pts = new Float32Array((K.SEG + 1) * 6);
    K.wirePoints(pts, fl, 1);
    let ribbon = true;
    for (let j = 0; j <= K.SEG; j++) { const x = -K.SPAN + 2 * K.SPAN * j / K.SEG, y = K.wireY(fl, 1, x); if (!near(pts[j * 6], x, 1e-6) || !near(pts[j * 6 + 1], y + K.WIRE_HALF, 1e-6) || pts[j * 6 + 2] !== 0 || !near(pts[j * 6 + 3], x, 1e-6) || !near(pts[j * 6 + 4], y - K.WIRE_HALF, 1e-6) || pts[j * 6 + 5] !== 0) ribbon = false; }
    ok(near(K.wireY(fl, 0, K.SPAN), K.WIRE_Y[0], 1e-9) && near(K.wireY(fl, 0, -K.SPAN), K.WIRE_Y[0], 1e-9) && near(K.wireY(fl, 0, 0), K.WIRE_Y[0] - K.SAG, 1e-9) && near(K.wireY(fl, 0, 1), K.WIRE_Y[0] - K.SAG * 0.75, 1e-9)
      && near(K.wireY(fl, 1, 0), K.WIRE_Y[1] - K.SAG - 0.5 * K.LOAD_SAG, 1e-9) && near(K.wireY(fl, 2, 0), K.WIRE_Y[2] - K.SAG - K.LOAD_SAG + 0.05, 1e-7) && near(K.wireY(fl, 2, 1), K.WIRE_Y[2] - (K.SAG + K.LOAD_SAG) * 0.75 + 0.05 * Math.cos(Math.PI / 4), 1e-7)
      && near(K.seatY(fl, 4), K.wireY(fl, 1, fl.seatX[4]) + K.PERCH * K.SIZE * fl.fit * fl.size[4], 1e-9) && ribbon,
      'a wire hangs from its two ends and sags 0.12 in the middle, a little more for the birds on it, and swings most in the middle; a bird sits a third of its length above its wire; the wire is drawn as a ribbon 0.022 thick');
  }

  // In silence nothing moves at all.
  {
    const fl = K.createFlock(), was = snapshot(fl), steps = run(fl, N, 3, how());
    ok(steps === 180 && snapshot(fl) === was && count(fl, N, 0) === N && fl.sitting === N && fl.flying === 0 && fl.coming === 0, 'in silence every bird sits, and after three seconds nothing of the flock or the wires has changed at all');
  }

  // Taking off.
  {
    const fl = K.createFlock(), bands = new Float32Array(8), i = 31, b = fl.band[i];
    bands[b] = (fl.nerve[i] + 0.01) / K.CALL[0];
    const h = how({ bands });
    K.stepFlock(fl, N, h);
    let onlyBold = true;
    for (let j = 0; j < N; j++) { const up = fl.band[j] === b && K.CALL[0] * bands[b] > fl.nerve[j]; if ((fl.state[j] === 1) !== up) onlyBold = false; }
    const w = fl.wire[i], sameWire = count(fl, N, 1), v1 = at(fl.v, i), kicked = fl.bounceV[w] > 0, heardNow = fl.heard[i] === fl.stay[i];
    K.stepFlock(fl, N, h);
    const voice = K.createFlock(); K.stepFlock(voice, N, how({ flame: 0.3 }));
    let byNerve = true;
    for (let j = 0; j < N; j++) if ((voice.state[j] === 1) !== (K.CALL[1] * 0.3 > voice.nerve[j])) byNerve = false;
    const all = K.createFlock(), loudest = how({ flame: 1 }); K.stepFlock(all, N, loudest); K.stepFlock(all, N, loudest);
    ok(fl.state[i] === 1 && onlyBold && sameWire >= 1 && v1[1] >= 1.7 - 1e-6 && v1[1] <= 2.2 + 1e-6 && Math.abs(v1[0]) <= 0.45 + 1e-6 && fl.p[i * 3 + 1] > K.seatY(fl, i) + 0.02 && kicked && fl.bounce[w] > 0
      && heardNow && byNerve && count(voice, N, 1) > 3 && count(voice, N, 1) < N - 3 && count(all, N, 1) === N && all.flying === N && all.sitting === 0 && all.load.join() === '0,0,0',
      'a bird takes off when its band is louder than its nerve, and only then; or when the voice is: a quiet voice lifts the bold ones and a loud one lifts them all. It leaves upward, and the wire springs up after it');
  }

  // It stays up as long as it hears, then comes home and lands exactly on its seat.
  {
    const fl = K.createFlock(), bands = new Float32Array(8), i = 31;
    bands[fl.band[i]] = 0.8;
    run(fl, N, 1, how({ bands }));
    const up = fl.state[i] === 1, h = how();
    K.advance(fl, N, K.STEP, h);
    const justAfter = fl.state[i], stay = fl.stay[i];
    run(fl, N, stay - 3 * K.STEP, h);
    const still = fl.state[i];
    run(fl, N, 5 * K.STEP, h);
    const turned = fl.state[i];
    let landedAt = -1, fromFar = 9, atSpeed = 9, wingsOpen = 9;
    for (let k = 0; k < 600 && landedAt < 0; k++) {
      const far = len([fl.seatX[i] - fl.p[i * 3], K.seatY(fl, i) - fl.p[i * 3 + 1], fl.p[i * 3 + 2]]), sp = len(at(fl.v, i));
      K.advance(fl, N, K.STEP, h);
      if (fl.state[i] === 0) { landedAt = k; fromFar = far; atSpeed = sp; wingsOpen = fl.fold[i]; }
    }
    const home = fl.p[i * 3] === fl.seatX[i] && fl.p[i * 3 + 2] === 0 && near(fl.p[i * 3 + 1], K.seatY(fl, i), 1e-6) && len(at(fl.v, i)) === 0;
    run(fl, N, 6, h);
    ok(up && justAfter === 1 && still === 1 && turned === 2 && landedAt >= 0 && landedAt < 300 && fromFar < K.LANDED + 0.02 && atSpeed < 0.7 && wingsOpen < 0.05 && home && fl.fold[i] === 1 && fl.flap[i] === 0 && fl.roll[i] === 0 && at(fl.head, i).join() === at(fl.face, i).join() && count(fl, N, 0) === N,
      'a bird stays in the air for as long as it hears its call and for its own while after, then makes for home, comes down slowly onto its seat, lands exactly on it within five seconds with its wings still open, folds them and sits as it sat before');
  }

  // Everything comes to rest.
  {
    const fl = K.createFlock();
    run(fl, N, 2, how({ flame: 0.9, bands: loudBands(0.7) }));
    const allUp = count(fl, N, 1) === N, h = how();
    let kicked = false;
    for (let k = 0; k < 720; k++) { K.advance(fl, N, K.STEP, h); if (Math.abs(fl.bounce[0]) > 0.004) kicked = true; }
    const a = snapshot(fl);
    run(fl, N, 2, h);
    ok(allUp && kicked && count(fl, N, 0) === N && snapshot(fl) === a && fl.bounce.join() === '0,0,0' && fl.bounceV.join() === '0,0,0' && fl.load.join() === '1,1,1' && finite(fl.p),
      'after a loud moment and twelve seconds of silence every bird has landed, the wires that sprang under them hang still, and nothing changes any more');
  }

  // The flock in the air.
  {
    const fl = K.createFlock(), h = how({ flame: 0.7, bands: loudBands(0.6) });
    run(fl, N, 4, h);
    let inAir = true, closest = 9, fromLead = 0, sane = true;
    for (let k = 0; k < 240; k++) {
      K.advance(fl, N, K.STEP, h);
      for (let i = 0; i < N; i++) {
        const p = at(fl.p, i), sp = len(at(fl.v, i));
        if (Math.abs(p[0]) > 2.3 || p[1] > 1.8 || p[1] < K.WIRE_Y[0] || Math.abs(p[2]) > 1.3) inAir = false;
        if (sp < 0.3 || sp > K.TOP + 1e-5 || !near(len(at(fl.head, i)), 1, 1e-4) || Math.abs(fl.roll[i]) > K.BANK_MAX + 1e-6 || fl.flap[i] < 0.1 || fl.flap[i] > 1 + 1e-6 || fl.fold[i] > 0.01) sane = false;
      }
    }
    for (let i = 0; i < N; i++) { fromLead += len([fl.p[i * 3] - fl.lead[0], fl.p[i * 3 + 1] - fl.lead[1], fl.p[i * 3 + 2] - fl.lead[2]]) / N; for (let j = i + 1; j < N; j++) closest = Math.min(closest, len([fl.p[i * 3] - fl.p[j * 3], fl.p[i * 3 + 1] - fl.p[j * 3 + 1], fl.p[i * 3 + 2] - fl.p[j * 3 + 2]])); }
    const out = [0, 0, 0], out1 = [0, 0, 0];
    K.leadAt(out, 1, 0); K.leadAt(out1, 1, 1);
    const slow = K.createFlock(), fast = K.createFlock();
    run(slow, N, 6, how({ flame: 0.3, bands: loudBands(0.6) })); run(fast, N, 6, how({ flame: 0.9, bands: loudBands(0.6) }));
    const speed = (f) => mean(N, (i) => len(at(f.v, i)));
    ok(count(fl, N, 1) === N && inAir && sane && closest > 0.08 && fromLead < 1.4 && finite(fl.p)
      && near(out[0], K.LEAD[0] * 0.7 * Math.sin(0.62), 1e-9) && near(out[1], K.AIR_Y + K.LEAD[1] * Math.sin(1.97), 1e-9) && near(out[2], K.LEAD[2] * 0.7 * Math.sin(1.67), 1e-9) && near(out1[0], K.LEAD[0] * Math.sin(0.62), 1e-9)
      && near(slow.tau, 6 * (K.LEAD_RATE[0] + 0.3 * K.LEAD_RATE[1]), 1e-6) && near(fast.tau, 6 * (K.LEAD_RATE[0] + 0.9 * K.LEAD_RATE[1]), 1e-6) && speed(fast) > 1.2 * speed(slow),
      'in the air the flock follows a lead that wheels above the wires, each bird clear of the others, inside its air and above the wires; louder, the lead goes faster and swings wider and the birds fly faster');
    const tight = K.createFlock(), wide = K.createFlock();
    const round = (f) => mean(N, (i) => len([f.p[i * 3] - f.lead[0], f.p[i * 3 + 1] - f.lead[1], f.p[i * 3 + 2] - f.lead[2]]));
    const over = (f, spread) => { const hh = how({ flame: 0.6, bands: loudBands(0.6), spread }); run(f, N, 4, hh); let s = 0; for (let k = 0; k < 480; k++) { K.advance(f, N, K.STEP, hh); s += round(f) / 480; } return s; };
    const wideBy = over(wide, 2), tightBy = over(tight, 0.5);
    ok(wideBy > 1.15 * tightBy, 'Cohesion: over eight seconds a loose flock flies wider of its lead than a tight one — ' + [wideBy, tightBy].map((v) => v.toFixed(3)));
  }

  // The steps come due at 1/60 s, whatever the frame rate.
  {
    const fl = K.createFlock(), h = how();
    const a = K.advance(fl, N, 0.4 * K.STEP, h), leftA = fl.left, b = K.advance(fl, N, 0.2 * K.STEP, h), leftB = fl.left, c = K.advance(fl, N, 0, h), d = K.advance(fl, N, 0.8 * K.STEP, h), leftD = fl.left;
    const long = K.createFlock(), taken = K.advance(long, N, 5, h), over = K.createFlock(), overTaken = K.advance(over, N, 6.7 * K.STEP, h), overLeft = over.left, under = K.createFlock(), underTaken = K.advance(under, N, 6.3 * K.STEP, h);
    const loud = () => how({ flame: 0.5, bands: new Float32Array([0.6, 0, 0.3, 0, 0, 0.2, 0, 0]) });
    const s60 = K.createFlock(), s30 = K.createFlock(), s120 = K.createFlock();
    const n60 = run(s60, N, 2, loud(), 60), n30 = run(s30, N, 2, loud(), 30), n120 = run(s120, N, 2, loud(), 120);
    const steady = (fps, wobble, frames) => { const f = K.createFlock(), r = K.rng(8), hw = how(), per = Math.round(60 / fps); let last = 0, odd = 0; for (let k = 1; k <= frames; k++) { const t = k / fps + wobble * K.STEP * (2 * r() - 1); if (K.advance(f, 6, t - last, hw) !== per) odd++; last = t; } return odd; };
    ok(a === 0 && near(leftA, 0.4 * K.STEP, 1e-15) && b === 1 && near(leftB, -0.4 * K.STEP, 1e-12) && c === 0 && d === 0 && near(leftD, 0.4 * K.STEP, 1e-12)
      && taken === K.STEPS_MAX && long.left === 0 && overTaken === 6 && overLeft === 0 && underTaken === 6 && near(under.left, 0.3 * K.STEP, 1e-12)
      && n60 === 120 && n30 === 120 && n120 === 120 && snapshot(s60) === snapshot(s30) && snapshot(s60) === snapshot(s120) && count(s60, N, 1) > 5
      && steady(60, 0.2, 600) === 0 && steady(30, 0.2, 300) === 0,
      'a step is taken once half of it has come due, six at most in a frame and the rest forgotten; the flock is the same, bird for bird, at 30, 60 and 120 frames a second; and frames a fifth early or late are still one step each at 60 and two at 30');
  }

  // The fright.
  {
    const fl = K.createFlock(), twin = K.createFlock(), other = K.createFlock();
    K.fright(fl, N, K.rng(1001)); K.fright(twin, N, K.rng(1001)); K.fright(other, N, K.rng(1002));
    let burst = true;
    for (let i = 0; i < N; i++) if (fl.state[i] !== 1 || fl.v[i * 3 + 1] < 1.8 - 1e-6 || fl.v[i * 3 + 1] > 2.4 + 1e-6 || Math.abs(fl.v[i * 3]) > 1.5 + 1e-6) burst = false;
    const kicks = fl.bounceV.join() === [20 * K.LEAVE, 20 * K.LEAVE, 20 * K.LEAVE].map((v) => Math.fround(v)).join() || fl.bounceV.every((v) => near(v, 20 * K.LEAVE, 1e-5));
    const loose = how({ loose: true });
    let inPicture = true;
    for (let k = 0; k < 180; k++) { K.advance(fl, N, K.STEP, loose); for (let i = 0; i < N; i++) if (Math.abs(fl.p[i * 3]) > 2.35 || fl.p[i * 3 + 1] > 1.85 || fl.p[i * 3 + 1] < K.WIRE_Y[2] - 0.2) inPicture = false; }
    let above = true;
    for (let i = 0; i < N; i++) if (fl.p[i * 3 + 1] < K.WIRE_Y[0]) above = false;
    const stillUp = count(fl, N, 1) === N, round = (f) => mean(N, (i) => len([f.p[i * 3] - f.lead[0], f.p[i * 3 + 1] - f.lead[1], f.p[i * 3 + 2] - f.lead[2]]));
    // In the air already: a fright throws a bird off its way. Coming home: it is up again.
    const air = K.createFlock(); run(air, N, 2, how({ flame: 0.9, bands: loudBands(0.7) }));
    run(air, N, 1.2, how());
    const coming = count(air, N, 2), v0 = Array.from(air.v.subarray(0, N * 3));
    K.fright(air, N, K.rng(5));
    let thrown = 0;
    for (let i = 0; i < N; i++) if (len([air.v[i * 3] - v0[i * 3], air.v[i * 3 + 1] - v0[i * 3 + 1], air.v[i * 3 + 2] - v0[i * 3 + 2]]) > 0.5) thrown++;
    run(fl, N, 8, how());
    ok(burst && kicks && twin.v.join() === (() => { const again = K.createFlock(); K.fright(again, N, K.rng(1001)); return again.v.join(); })() && twin.v.join() !== other.v.join()
      && inPicture && above && stillUp && coming > 5 && count(air, N, 1) === N && thrown > 0.9 * N && count(fl, N, 0) === N,
      'a fright: every bird bursts upward at once, the same way for the same thump, and the wires spring; while it lasts they stay in the air however quiet it is, and inside the picture; a bird already flying is thrown off its way and one coming home is up again; and when it is over, in silence, they all land');
    // Frightened, a bird makes for its own part of the air, wherever the lead is, and flies faster.
    const pl = K.createFlock(), q = [0, 0, 0], e = (v) => Math.hypot(v[0] / K.AIR[0], (v[1] - K.AIR_Y) / K.AIR[1], v[2] / K.AIR[2]);
    let byLead = true, own = true, kept = true;
    for (const lead of [[0.5, 0.7, -0.2], [-0.9, 0.5, 0.3]]) {
      pl.lead[0] = lead[0]; pl.lead[1] = lead[1]; pl.lead[2] = lead[2];
      for (let i = 0; i < N; i++) {
        const o = at(pl.off, i);
        for (const wide of [1, 2]) {
          K.placeOf(q, pl, i, wide, false);
          let want = [lead[0] + K.PLACE[0] * wide * o[0], lead[1] + K.PLACE[1] * wide * o[1], lead[2] + K.PLACE[2] * wide * o[2]];
          const far = e(want);
          if (far > K.ROOM) want = [want[0] * K.ROOM / far, K.AIR_Y + (want[1] - K.AIR_Y) * K.ROOM / far, want[2] * K.ROOM / far];
          if (!near(q[0], want[0], 1e-9) || !near(q[1], want[1], 1e-9) || !near(q[2], want[2], 1e-9)) byLead = false;
          if (e(q) > K.ROOM + 1e-9) kept = false;
        }
        K.placeOf(q, pl, i, 1, true);
        let part = [K.AIR[0] * o[0], K.AIR_Y + K.AIR[1] * o[1], K.AIR[2] * o[2]];
        const far = e(part);
        if (far > K.ROOM) part = [part[0] * K.ROOM / far, K.AIR_Y + (part[1] - K.AIR_Y) * K.ROOM / far, part[2] * K.ROOM / far];
        if (!near(q[0], part[0], 1e-9) || !near(q[1], part[1], 1e-9) || !near(q[2], part[2], 1e-9) || e(q) > K.ROOM + 1e-9) own = false;
      }
    }
    const speedOf = (f) => mean(N, (i) => len(at(f.v, i)));
    const looseFlock = (() => { const f = K.createFlock(); K.fright(f, N, K.rng(1001)); run(f, N, 5, how({ loose: true, flame: 0.5 })); return speedOf(f); })();
    const tameFlock = (() => { const f = K.createFlock(); K.fright(f, N, K.rng(1001)); run(f, N, 5, how({ flame: 0.5, bands: loudBands(0.9) })); return speedOf(f); })();
    ok(byLead && own && kept && looseFlock > 1.15 * tameFlock, 'a bird\'s place is by the lead, wider of it for a loose flock, and always inside the air; frightened, it makes for its own part of the air wherever the lead is, and flies faster');
  }

  // What each bird is sent.
  {
    const fl = K.createFlock(), A = new Float32Array(K.BIRDS_MAX * 4), B = new Float32Array(K.BIRDS_MAX * 4), h = how({ flame: 0.9, bands: loudBands(0.7) });
    K.dress(A, B, fl, N, { kick: 1, flash: 1, lead: 0.004 });
    const sitting = Array.from(A.subarray(20, 24)).concat(Array.from(B.subarray(20, 24))), beat5 = fl.beat[5];
    run(fl, N, 2, h);
    h.pulse = 1; K.advance(fl, N, K.STEP, h); h.pulse = 0;
    for (let k = 0; k < 5; k++) K.advance(fl, N, K.STEP, h);
    // Put two birds a known way behind the lead: one hears the syllable now, one has not yet.
    put(fl.p, 4, [fl.lead[0] + 5.5 / K.WAVE, fl.lead[1], fl.lead[2]]); put(fl.p, 5, [fl.lead[0] + 9.5 / K.WAVE, fl.lead[1], fl.lead[2]]); put(fl.p, 6, [fl.lead[0] + (K.HISTORY + 5.5) / K.WAVE, fl.lead[1], fl.lead[2]]); fl.state[8] = 0; put(fl.p, 8, [fl.lead[0], fl.lead[1], fl.lead[2] + 5.5 / K.WAVE]); fl.roll[8] = 0.1;
    fl.roll[4] = 0.2; fl.roll[5] = 0.2; fl.flap[4] = 0.6;
    K.dress(A, B, fl, N, { kick: 0, flash: 0, lead: 0 });
    const heard = [A[4 * 4 + 2], B[4 * 4 + 2], A[5 * 4 + 2], B[5 * 4 + 2], B[6 * 4 + 2]], beat0 = A[4 * 4 + 1], sat = near(A[8 * 4 + 2], 0.1, 1e-6) && B[8 * 4 + 2] === 0, banded = A[30 * 4 + 3] === fl.band[30] && fl.band[30] > 0;
    K.dress(A, B, fl, N, { kick: 0.6, flash: 0.2, lead: 0.004 });
    ok(near(sitting[0], fl.size[5], 1e-6) && near(sitting[1], beat5, 1e-6) && sitting[2] === 0 && sitting[3] === fl.band[5] && sitting[4] === 0 && sitting[5] === 1 && sitting[6] === 0 && sitting[7] === 0
      && near(heard[0], 0.2 - K.WAVE_ROLL, 1e-5) && near(heard[1], 1, 1e-6) && near(heard[2], 0.2, 1e-6) && heard[3] === 0 && heard[4] === 0 && sat && banded
      && near(B[5 * 4 + 2], 0.3, 1e-6) && near(B[4 * 4 + 2], 1, 1e-6) && near(A[4 * 4 + 1], beat0 + 0.004 * (K.BEAT[0] + K.BEAT[1] * 0.6) / Math.sqrt(fl.size[4]), 1e-4) && near(B[4 * 4], 0.6, 1e-6) && B[4 * 4 + 1] < 0.01,
      'what a bird is sent: its size, its wings\' beat, its roll and its band, how hard it beats and how folded it is, and a flash. Sitting, no beat or fright flashes it. In the air the ripple reaches it later the further behind the lead it is, rolling it one way or the other, and a beat flashes it by half');
  }

  // Density re-seats.
  {
    const fl = K.createFlock(), bands = new Float32Array(8); bands[0] = 0.9;
    run(fl, N, 0.5, how({ bands }));
    const flier = [0, 1, 2, 3, 4, 5].find((i) => fl.state[i] === 1), where = at(fl.p, flier);
    K.reseat(fl, 84);
    let rows = true, sit = true;
    for (let i = 0; i < 84; i++) {
      if (fl.band[i] !== Math.min(7, Math.floor(8 * fl.slot[i] / 28)) || Math.abs(fl.seatX[i]) > K.REACH + 0.05 || (i >= 3 && fl.seatX[i] <= fl.seatX[i - 3])) rows = false;
      if (fl.state[i] === 0 && (fl.p[i * 3] !== fl.seatX[i] || !near(fl.p[i * 3 + 1], K.seatY(fl, i), 1e-6) || fl.fold[i] !== 1)) sit = false;
      if (i >= 60 && fl.state[i] !== 0) sit = false;
    }
    const loads = [0, 1, 2].map((w) => { let c = 0; for (let i = 0; i < 84; i++) if (fl.wire[i] === w && fl.state[i] === 0) c++; return c / 28; }), load84 = Array.from(fl.load), n84 = fl.n, per84 = fl.per;
    K.reseat(fl, 36);
    ok(flier !== undefined && rows && sit && at(fl.p, flier).join() === where.join() && fl.state[flier] === 1 && loads.every((v, w) => near(v, load84[w], 1e-6)) && loads.some((v) => v < 1) && n84 === 84 && per84 === 28 && fl.n === 36 && fl.per === 12 && fl.band[35] === 7 && fl.band[0] === 0
      && (() => { const g = K.createFlock(); K.reseat(g, 84); return g.load.join() === '1,1,1' && g.n === 84 && g.per === 28 && g.sitting === 84; })(),
      'Density changed: the rows close up or spread, the bands still run from low to high, the birds that sit are in their new seats and the new ones sit; a bird in the air flies on');
  }

  // The loudest it gets, with every bird, frightened.
  {
    const fl = K.createFlock(K.SEED, 84);
    K.fright(fl, 84, K.rng(1001));
    run(fl, 84, 8, how({ flame: 1, bands: loudBands(1), loose: true, pulse: 1, spread: 2 }));
    let inside = true;
    for (let i = 0; i < 84; i++) if (Math.abs(fl.p[i * 3]) > 2.45 || fl.p[i * 3 + 1] > 1.9 || fl.p[i * 3 + 1] < K.WIRE_Y[0] - 0.2) inside = false;
    ok(finite(fl.p) && finite(fl.v) && finite(fl.head) && finite(fl.roll) && inside && count(fl, 84, 1) === 84 && near(fl.hist[(fl.at + K.HISTORY - 1) % K.HISTORY], 1),
      'as loud as it gets, with all 84 birds frightened and the flock at its loosest: every number is still a number and every bird is still inside the frame');
    ok(K.orbitAt(3, 0) === 0 && near(K.orbitAt(3, 50), K.SWAY * Math.sin(K.ORBIT_RATE * 3)) && near(K.orbitAt(3, 100), 2 * K.orbitAt(3, 50)) && near(K.orbitAt(3, undefined), K.orbitAt(3, 50)) && near(K.orbitAt(3, 400), K.orbitAt(3, 100)) && K.orbitAt(3, -5) === 0
      && K.swayFor(0) === 0 && near(K.swayFor(50), K.SWAY) && near(K.swayFor(100), 2 * K.SWAY) && near(K.swayFor(NaN), K.SWAY),
      'Camera drift: none at 0, a sway of 0.12 radians each way at 50, twice that at 100');
  }

  // What breaking it on purpose slipped past the checks above.
  {
    // A bird that was in the air when Density took it away.
    const fl = K.createFlock();
    run(fl, N, 2, how({ flame: 0.9, bands: loudBands(0.7) }));
    K.reseat(fl, 36);
    const hidden = fl.state[40] === 1 && fl.flap[40] > 0.1 && fl.heard[40] > 0;
    K.reseat(fl, 84);
    ok(hidden && fl.state[40] === 0 && fl.fold[40] === 1 && fl.flap[40] === 0 && fl.roll[40] === 0 && fl.heard[40] === 0 && len(at(fl.v, 40)) === 0 && at(fl.head, 40).join() === at(fl.face, 40).join() && fl.p[120] === fl.seatX[40] && fl.state[0] === 1,
      'a bird that was in the air when Density took it away sits when Density brings it back: folded, still, and hearing nothing');
    // The weight on each wire, and the count of who is doing what.
    const w = K.createFlock(); w.state[0] = 1; w.state[3] = 2; K.weigh(w);
    const one = K.createFlock(); K.stepFlock(one, N, how({ flame: 0.3 }));
    const big = K.createFlock(K.SEED, 84); K.fright(big, 84, K.rng(1));
    const flushed = big.flying === 84 && big.sitting === 0 && big.load.join() === '0,0,0';
    let swing = 0;
    for (let k = 0; k < 60; k++) { K.advance(big, 84, K.STEP, how({ loose: true })); swing = Math.max(swing, Math.abs(big.bounce[0]), Math.abs(big.bounce[2])); }
    ok(near(w.load[0], 18 / 20, 1e-6) && w.load[1] === 1 && w.load[2] === 1 && w.sitting === 58 && w.flying === 1 && w.coming === 1 && one.flying > 0 && one.flying === count(one, N, 1) && one.sitting === count(one, N, 0)
      && flushed && swing === Math.fround(K.BOUNCE_MAX),
      'each wire is weighed by its own birds; the count of who sits and who flies is kept each step and after a fright; and however many leave at once a wire swings no further than 0.08');
  }
  {
    // A bird that sits rides its wire. And one that has just landed is sitting exactly as it sits within a second and a half.
    const r = K.createFlock(), b = new Float32Array(8), j = 57; b[0] = 0.9;
    const hb = how({ bands: b }), y0 = r.p[j * 3 + 1];
    for (let k = 0; k < 3; k++) K.stepFlock(r, N, hb);
    const p = K.createFlock(), i = 10;
    p.fold[i] = 0; p.flap[i] = 0.5; p.roll[i] = 0.5; put(p.head, i, [1, 0, 0]);
    for (let k = 0; k < 90; k++) K.stepFlock(p, N, how());
    ok(r.state[j] === 0 && r.wire[j] === 0 && r.bounce[0] > 0 && near(r.p[j * 3 + 1], K.seatY(r, j), 1e-7) && Math.abs(r.p[j * 3 + 1] - y0) > 1e-4
      && p.fold[i] === 1 && p.flap[i] === 0 && p.roll[i] === 0 && at(p.head, i).join() === at(p.face, i).join(),
      'a bird that sits rides its wire as it swings; and one with its wings open and turned aside is sitting exactly as it sits within a second and a half');
    // Coming home, a bird that hears its call again is up again.
    const c = K.createFlock(), bands = new Float32Array(8), ci = 31; bands[c.band[ci]] = 0.8;
    run(c, N, 0.5, how({ bands })); run(c, N, c.stay[ci] + 0.1, how());
    const coming = c.state[ci] === 2;
    K.stepFlock(c, N, how({ bands }));
    ok(coming && c.state[ci] === 1, 'a bird on its way home that hears its call again flies again');
  }
  {
    // Frightened, the birds take no notice of the lead. And a bird in the air takes no notice of one that sits.
    const made = (tau, h) => { const f = K.createFlock(); K.fright(f, N, K.rng(1001)); f.tau = tau; run(f, N, 2, h()); return f.p.join(); };
    const near1 = (seat) => { const f = K.createFlock(K.SEED, 36); f.seatX[0] = seat; K.sit(f, 0); f.state[1] = 1; f.heard[1] = 1; put(f.p, 1, [0.5, -0.35, 0]); put(f.v, 1, [1, 0, 0]); K.stepFlock(f, 2, how()); return at(f.v, 1).join(); };
    ok(made(0, () => how({ loose: true })) === made(5, () => how({ loose: true })) && made(0, () => how({ flame: 1 })) !== made(5, () => how({ flame: 1 })) && near1(0.45) === near1(-1.6),
      'frightened, the birds fly the same wherever the lead is; and a bird in the air takes no notice of one that is sitting');
    // No bird flies faster than 4.2, however it was thrown.
    const t = K.createFlock(); run(t, N, 2, how({ flame: 0.9, bands: loudBands(0.7) })); K.fright(t, N, K.rng(3)); put(t.v, 5, [6, 2, 0]);
    let over = 0, fastest = 0;
    for (let i = 0; i < N; i++) if (len(at(t.v, i)) > K.TOP) over++;
    K.stepFlock(t, N, how({ loose: true }));
    for (let i = 0; i < N; i++) fastest = Math.max(fastest, len(at(t.v, i)));
    ok(over > 0 && fastest <= K.TOP + 1e-5, 'no bird flies faster than 4.2, however a fright threw it');
  }
  {
    // One step of a bird in the air, by hand.
    const f = K.createFlock(K.SEED, 36), flame = 0.5, p0 = [0.2, 0.7, 0.1], v0 = [1.2, 0.1, 0], Q = [0, 0, 0];
    f.state[0] = 1; f.heard[0] = 1; put(f.p, 0, p0); put(f.v, 0, v0); f.flap[0] = 0.5;
    const beat0 = f.beat[0], pf = at(f.p, 0), vf = at(f.v, 0), sp0 = len(vf), h0 = vf.map((c) => c / sp0);
    K.stepFlock(f, 1, how({ flame }));
    K.placeOf(Q, f, 0, 1, false);
    const t3 = [Q[0] - pf[0], Q[1] - pf[1], Q[2] - pf[2]], tl = len(t3), d = [t3[0] / tl, K.LEVEL * t3[1] / tl, t3[2] / tl], dl = len(d), turn = (K.TURN[0] + K.TURN[1] * flame) * K.STEP;
    const hn = h0.map((c, k) => c + (d[k] / dl - c) * turn), hl = len(hn), cruise = K.CRUISE[0] + K.CRUISE[1] * flame;
    const sp1 = sp0 + (cruise * Math.max(0.8, Math.min(1.3, 0.7 + 0.5 * tl)) - sp0) * K.SPEED_RATE * K.STEP, v1 = hn.map((c) => (c / hl) * sp1), acc = v1.map((c, k) => (c - vf[k]) / K.STEP);
    const want = v1[1] < -0.45 ? 0.16 : Math.max(0.4, Math.min(1, 0.5 + 0.35 * v1[1] + 0.03 * len(acc))), flap1 = 0.5 + (want - 0.5) * K.FLAP_RATE * K.STEP;
    ok(tl > 0.3 && [0, 1, 2].every((k) => near(f.v[k], v1[k], 1e-5) && near(f.p[k], pf[k] + v1[k] * K.STEP, 1e-5)) && near(f.flap[0], flap1, 1e-5) && near(f.beat[0], beat0 + K.STEP * (K.BEAT[0] + K.BEAT[1] * flap1) / Math.sqrt(f.size[0]), 1e-4) && f.fold[0] < 1 && f.state[0] === 1,
      'one step of a bird in the air, by hand: it turns 3.5 radians a second (and 2 more at the loudest) toward its place, more level than straight at it; its speed goes 3 a second toward its cruising speed; it moves; and its wings beat, harder the harder it works');
  }

  // What the review found.
  {
    // A bird never spins about itself. Its drawn up, as the shader makes it from its heading and its roll.
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], unit = (v) => { const l = len(v) || 1; return v.map((c) => c / l); };
    const upOf = (fl, i, roll) => { const f = at(fl.head, i), r = unit(cross(f, [0, 1, 0])), u = cross(r, f), c = Math.cos(roll), s = Math.sin(roll); return [0, 1, 2].map((k) => u[k] * c + r[k] * s); };
    const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
    let upTurn = 0, headTurn = 0, steepest = 0, flew = 0;
    for (const fright of [false, true]) {
      const n = 84, fl = K.createFlock(K.SEED, n), h = how({ flame: 0.9, bands: loudBands(0.9), loose: fright }), A = new Float32Array(n * 4), B = new Float32Array(n * 4);
      if (fright) K.fright(fl, n, K.rng(1001));
      let was = null;
      for (let k = 0; k < 480; k++) {
        if (k === 240) { h.flame = 0; h.bands = new Float32Array(8); h.loose = false; }
        K.advance(fl, n, K.STEP, h);
        K.dress(A, B, fl, n, { kick: 0, flash: 0, lead: 0 });
        const now = [];
        for (let i = 0; i < n; i++) { now.push([upOf(fl, i, A[i * 4 + 2]), at(fl.head, i)]); if (fl.state[i] !== 0) { flew++; steepest = Math.max(steepest, Math.abs(fl.head[i * 3 + 1])); } }
        if (was) for (let i = 0; i < n; i++) { upTurn = Math.max(upTurn, angle(was[i][0], now[i][0])); headTurn = Math.max(headTurn, angle(was[i][1], now[i][1])); }
        was = now;
      }
    }
    ok(flew > 40000 && upTurn < 0.4 && headTurn < 0.3 && steepest <= Math.sin(K.PITCH_MAX) + 1e-6 && steepest > 0.9,
      'a bird never spins about itself: taking off, in a fright and landing, its back turns less than 0.4 radians in a step and its heading less than 0.3, and it never heads steeper than 1.2 radians — ' + [upTurn, headTurn, steepest].map((v) => v.toFixed(3)));
  }
  {
    // No bird leaves the picture, as the kit's camera frames it, however often it is frightened.
    const view = { frame: K.FRAME, fov: K.FOV, pitch: K.PITCH }, sway = K.swayFor(100);
    let high = 0, wide = 0, low = 0, outOfAir = 0;
    const watch = (fl, n) => {
      for (let i = 0; i < n; i++) {
        const m = K.SIZE * fl.fit * fl.size[i] * (fl.state[i] === 0 ? 0.98 : 1.2), box = { min: [-m, -m, -m], max: [m, m, m] };   // room for its tail, or for its open wings
        for (const o of [-sway, 0, sway]) { const b = TimbreScene.reach(box, view, 0, 0, 0, 1, fl.p[i * 3], fl.p[i * 3 + 1], fl.p[i * 3 + 2], o); high = Math.max(high, b[1]); low = Math.min(low, b[0]); wide = Math.max(wide, -b[2], b[3]); }
        if (fl.state[i] === 1 && fl.p[i * 3 + 1] > K.AIR_Y) outOfAir = Math.max(outOfAir, len([fl.p[i * 3] / K.HARD[0], (fl.p[i * 3 + 1] - K.AIR_Y) / K.HARD[1], fl.p[i * 3 + 2] / K.HARD[2]]));
      }
    };
    const loud = K.createFlock(K.SEED, 84), hl = how({ flame: 1, bands: loudBands(1), spread: 2 });
    for (let k = 0; k < 900; k++) { K.advance(loud, 84, K.STEP, hl); watch(loud, 84); }
    const scared = K.createFlock(K.SEED, 84), hs = how({ flame: 1, bands: loudBands(1), spread: 2, loose: true });
    K.fright(scared, 84, K.rng(1003));
    for (let k = 0; k < 900; k++) { if (k % 36 === 0 && k) K.fright(scared, 84, hs.random); K.advance(scared, 84, K.STEP, hs); watch(scared, 84); }
    ok(high < K.FRAME.height / 2 && low > -K.FRAME.height / 2 && wide < K.FRAME.width / 2 && high > 1.6 && outOfAir < 1.02 && outOfAir > 0.9,
      'no bird leaves the picture: at the loudest and widest, and frightened again every 0.6 s for fifteen seconds, every bird and its open wings stay inside the frame of 5 by 3.9 as the camera sways, and no bird\'s middle leaves all the air there is — ' + [high, low, wide, outOfAir].map((v) => v.toFixed(3)));
  }
  {
    // Coming home and taking off, a bird keeps clear of the birds that sit and of the other wires; it comes home from behind and lands softly.
    let closest = 9, wireCrossed = 0, inFront = -9, towardUs = 0, landings = 0, fastest = 0, slowest = 9, jump = 0, dip = 0, belowWire = 0;
    const watch = (n, quiet) => {
      const fl = K.createFlock(K.SEED, n), h = how();
      for (let k = 0; k < 1320; k++) {
        const loudNow = quiet ? k < 720 && k % 240 < 120 : k < 180;
        h.flame = loudNow ? (quiet ? 0.3 : 0.9) : 0; h.bands = loudNow && !quiet ? loudBands(0.8) : new Float32Array(8);
        const before = Int8Array.from(fl.state), pb = Float32Array.from(fl.p), vb = Float32Array.from(fl.v);
        K.advance(fl, n, K.STEP, h);
        for (let i = 0; i < n; i++) {
          const p = at(fl.p, i);
          if (before[i] === 2 && fl.state[i] === 0) { landings++; if (vb[i * 3 + 2] > 0) towardUs++; fastest = Math.max(fastest, len(at(vb, i))); slowest = Math.min(slowest, len(at(vb, i))); jump = Math.max(jump, len([p[0] - pb[i * 3], p[1] - pb[i * 3 + 1], p[2] - pb[i * 3 + 2]])); }
          if (fl.state[i] === 0) continue;
          for (let j = 0; j < n; j++) if (fl.state[j] === 0) closest = Math.min(closest, len([fl.p[j * 3] - p[0], fl.p[j * 3 + 1] - p[1], fl.p[j * 3 + 2] - p[2]]));
          for (let w = 0; w < 3; w++) if (w !== fl.wire[i] && Math.abs(p[0]) < K.SPAN - K.FADE && Math.abs(p[2]) < 0.04 && Math.abs(p[1] - K.wireY(fl, w, p[0])) < 0.06) wireCrossed++;
          if (fl.state[i] !== 2) continue;
          const sy = K.seatY(fl, i), d = len([fl.seatX[i] - p[0], sy - p[1], p[2]]);
          if (d < 0.3) inFront = Math.max(inFront, p[2]);
          if (Math.abs(p[0] - fl.seatX[i]) < 0.15 && Math.abs(p[2]) < 0.15) { dip = Math.max(dip, sy - p[1]); if (p[1] < K.wireY(fl, fl.wire[i], p[0])) belowWire++; }
        }
      }
      return fl.sitting === n;
    };
    const home = watch(60, false) && watch(84, false) && watch(60, true) && watch(84, true);
    ok(home && landings > 250 && closest > 0.07 && wireCrossed === 0 && inFront < 0.05 && towardUs > 0.9 * landings && fastest < 0.3 && slowest > 0.2 && jump <= K.LANDED + 1e-6 && dip < 0.02 && belowWire === 0,
      'coming home and taking off, no bird comes within 0.07 of one that sits or crosses another wire; a bird near its seat is never in front of it, and nine in ten touch down flying toward us; it comes down at between 0.2 and 0.3 a second, lands within 0.02 of its seat, and never dips under it — ' + [landings, closest.toFixed(3), wireCrossed, inFront.toFixed(3), towardUs, fastest.toFixed(3), slowest.toFixed(3), jump.toFixed(4), dip.toFixed(4), belowWire]);
  }
  {
    // A bird leaves its wire the way it faces and forward; frightened, any way. Among the wires a flying bird makes for the side of them it is on. One called again as it lands, lands first.
    const fl = K.createFlock(), rnd = K.rng(5);
    let faced = true, forward = true, hardAny = [9, -9];
    for (let i = 0; i < 30; i++) { K.takeOff(fl, i, false, rnd); const v = at(fl.v, i); if (v[0] * fl.face[i * 3] < 0 || Math.abs(v[0]) > 0.45 + 1e-6 || v[1] < 1.7 || v[1] > 2.2 + 1e-6) faced = false; if (v[2] < 0.5 - 1e-6 || v[2] > 1 + 1e-6) forward = false; }
    for (let i = 30; i < 60; i++) { K.takeOff(fl, i, true, rnd); hardAny = [Math.min(hardAny[0], fl.v[i * 3 + 2]), Math.max(hardAny[1], fl.v[i * 3 + 2])]; }
    const side = (z, loose) => { const f = K.createFlock(K.SEED, 36); f.state[0] = 1; f.heard[0] = 1; put(f.p, 0, [0.4, -0.8, z]); put(f.v, 0, [0, 1.2, 0]); for (let k = 0; k < 20; k++) K.stepFlock(f, 1, how({ loose })); return f.v[2]; };
    const c = K.createFlock(), bands = new Float32Array(8), ci = 31; bands[c.band[ci]] = 0.8;
    run(c, N, 0.5, how({ bands }));
    let k = 0;
    const far = () => len([c.seatX[ci] - c.p[ci * 3], K.seatY(c, ci) - c.p[ci * 3 + 1], c.p[ci * 3 + 2]]);
    while (k++ < 600 && !(c.state[ci] === 2 && far() < K.HOME_NEAR - 0.05 && c.p[ci * 3 + 2] < 0)) K.stepFlock(c, N, how());
    const landing = c.state[ci] === 2;
    K.stepFlock(c, N, how({ bands }));
    const still = c.state[ci] === 2;
    let sat = -1, leftAt = -1;
    for (let j = 0; j < 200 && leftAt < 0; j++) { K.stepFlock(c, N, how({ bands })); if (c.state[ci] === 0 && sat < 0) sat = j; else if (sat >= 0 && c.state[ci] === 1) leftAt = j; }
    const scared = K.createFlock(); run(scared, N, 0.5, how({ bands })); k = 0;
    const farS = () => len([scared.seatX[ci] - scared.p[ci * 3], K.seatY(scared, ci) - scared.p[ci * 3 + 1], scared.p[ci * 3 + 2]]);
    while (k++ < 600 && !(scared.state[ci] === 2 && farS() < K.HOME_NEAR - 0.05 && scared.p[ci * 3 + 2] < 0)) K.stepFlock(scared, N, how());
    K.stepFlock(scared, N, how({ loose: true }));
    ok(faced && forward && hardAny[0] < -0.1 && hardAny[1] > 1 && side(0.05, false) > 0.5 && side(-0.05, false) < -0.5 && Math.abs(side(0.05, true)) < 0.2
      && landing && still && sat >= 0 && leftAt === sat + 1 && scared.state[ci] === 1,
      'a bird leaves its wire up, the way it faces and forward, and in a fright any way; among the wires a flying bird makes for the side of them it is on; and one called again as it lands, lands first and leaves from its seat, unless it is a fright');
  }
  {
    // Idle: the bands alone, and they leave most of the birds sitting. Crowded, every bird is smaller. The rows are staggered.
    const fl = K.createFlock(), bands = new Float32Array(8), h = how({ bands });
    let most = 0, least = 99, sum = 0; const flew = new Set(), back = new Set();
    for (let k = 0; k < 3600; k++) {
      for (let b = 0; b < 8; b++) { const v = K.idle(b, k / 60); bands[b] += (v - bands[b]) * (1 - Math.exp(-(v > bands[b] ? K.RISE : K.FALL) / 60)); if (v === 0) bands[b] = K.settle(bands[b]); }
      K.advance(fl, N, K.STEP, h);
      const up = N - fl.sitting; most = Math.max(most, up); least = Math.min(least, up); sum += up / 3600;
      for (let i = 0; i < N; i++) { if (fl.state[i] !== 0) flew.add(i); else if (flew.has(i)) back.add(i); }
    }
    let room = true, staggered = true; const fits = [];
    for (const n of [36, 48, 60, 72, 84]) {
      const f = K.createFlock(K.SEED, n), seat = (2 * K.REACH) / (n / 3);
      fits.push(f.fit);
      for (let i = 0; i + 3 < n; i++) if (f.seatX[i + 3] - f.seatX[i] < K.FIT * f.fit - 1e-6) room = false;
      for (let i = 1; i < n; i += 3) if (Math.abs(f.seatX[i] - f.seatX[i - 1]) < (0.5 - K.JITTER) * seat - 1e-6 || Math.abs(f.seatX[i] - f.seatX[i + 1]) < (0.5 - K.JITTER) * seat - 1e-6 || Math.abs(f.seatX[i]) > K.REACH) staggered = false;
    }
    const big = K.createFlock(K.SEED, 84), A = new Float32Array(84 * 4), B = new Float32Array(84 * 4);
    K.dress(A, B, big, 84, { kick: 0, flash: 0, lead: 0 });
    ok(most <= 36 && least === 0 && sum > 15 && sum < 30 && flew.size >= 45 && back.size === flew.size
      && fits[0] === 1 && fits[2] === 1 && near(fits[3], (3.3 / 24) * 0.85 / 0.14, 1e-9) && near(fits[4], (3.3 / 28) * 0.85 / 0.14, 1e-9) && room && staggered
      && near(A[5 * 4], big.fit * big.size[5], 1e-6) && near(K.seatY(big, 5), K.wireY(big, big.wire[5], big.seatX[5]) + K.PERCH * K.SIZE * big.fit * big.size[5], 1e-9),
      'idle, the bands alone send the birds up: over a minute never more than six in ten are off the wires, about a third on the whole, and most fly at some time and sit again; with less room to a seat than a bird needs every bird is smaller, by as much; and the middle wire\'s seats are between the others\' — ' + [most, least, sum.toFixed(1), flew.size, back.size, fits.map((v) => v.toFixed(3))]);
  }

  {
    // A bird turns the shorter way round; and one that is wanted straight down keeps the way it is turned.
    const yawOf = (f, i) => Math.atan2(f.head[i * 3 + 2], f.head[i * 3]);
    const f = K.createFlock(K.SEED, 36);
    f.state[0] = 1; f.heard[0] = 1; put(f.p, 0, [0, 0.7, 0]); put(f.v, 0, [1.5 * Math.cos(-3), 0, 1.5 * Math.sin(-3)]); put(f.head, 0, [Math.cos(3), 0, Math.sin(3)]);
    K.stepFlock(f, 1, how());
    const went = yawOf(f, 0), wanted = Math.atan2(f.v[2], f.v[0]);
    const g = K.createFlock(K.SEED, 36), sy = K.seatY(g, 0);
    g.state[0] = 2; put(g.p, 0, [g.seatX[0], sy + 1.5, -K.HOME_BACK]); put(g.v, 0, [0, -1, 0]); put(g.head, 0, [Math.cos(0.3) * Math.cos(1), Math.sin(0.3), Math.cos(0.3) * Math.sin(1)]);
    K.stepFlock(g, 1, how());
    ok(wanted < -2.8 && went > 3 && went < 3 + K.YAW_MAX * K.STEP + 1e-6 && near(went, 3 + (wanted + 2 * Math.PI - 3) * K.TURN_HEAD * K.STEP, 1e-4)
      && g.state[0] === 2 && Math.abs(g.v[0]) < 1e-6 && Math.abs(g.v[2]) < 1e-6 && near(yawOf(g, 0), 1, 1e-6) && g.head[1] < Math.sin(0.3) - 0.1,
      'a bird in the air turns the shorter way round to head the way it flies; and one that flies straight down keeps the way it is turned, and only noses down — ' + [wanted, went, yawOf(g, 0), g.head[1]].map((v) => v.toFixed(4)));
  }

  // The scene.
  {
    const def = K.definition();
    ok(def.fov === 30 && def.pitch === 6 && def.cooling.join() === '0.08,0.08,0.08' && typeof def.build === 'function' && typeof def.update === 'function' && typeof def.debug === 'function'
      && JSON.stringify(def.frame) === JSON.stringify(K.FRAME) && def.frame !== K.FRAME && def.frame.center !== K.FRAME.center && K.definition().frame !== def.frame
      && ['iPos', 'iVel', 'iFwd', 'iA', 'iB', 'uLead', 'modelMatrix', 'wing', 'iVel * uLead', 'iA.x * uLen', '(1.0 - 0.94 * iB.y)', 'mix(p.x, -0.02 - 0.42 * t, iB.y)', 'float ang = (1.0 - iB.y) * (', 'cross(f, vec3(0.0, 1.0, 0.0))'].every((w) => K.VERT.includes(w)) && ['(under ? below : top)', 'smoothstep(-0.35, 0.45, vUp)'].every((w) => K.FRAG.includes(w)) && ['uPal', 'vBand / 8.0', 'gl_FrontFacing'].every((w) => K.FRAG.includes(w)) && !K.FRAG.includes('uShift') && /gl_FragColor = vec4\(col, 1\.0\)/.test(K.FRAG)
      && K.WIRE_VERT.includes('fade') && K.WIRE_FRAG.includes('uColor'),
      'the scene definition gives the kit its frame, its camera and its two halves, and a frame of its own each time; the birds are drawn solid');
  }
  ok(T.ACTIVE_VIZ_NAMES.length === 52 && T.ACTIVE_VIZ_NAMES.indexOf('boids') === T.ACTIVE_VIZ_NAMES.indexOf('jelly') + 1 && T.VIZ_USES_3D.includes('boids')
    && T.VIZ_SCENES.indexOf('boids') === T.VIZ_SCENES.indexOf('school-of-fish') + 1 && !('boids' in T.VIZ_LABELS)
    && JSON.stringify(T.DEFAULT_PER_VIZ['boids']) === '{"cohesion":50,"density":50,"frightSensitivity":50,"settleSeconds":3,"cameraDrift":50}' && JSON.stringify(T.PER_VIZ_MAX['boids']) === '{"settleSeconds":10}',
    'boids keeps its id, its name and its place in the list, and is now a kit scene, listed after the school of fish, with Cohesion, Density, the two thump settings and Camera drift');
  // The files.
  {
    const pages = [];
    for (const p of ['300x220', '1440x1080', '1920x1080']) {
      const html = await readFile(resolve(__dirname, `overlay/mic-visualizers-${p}.html`), 'utf8');
      const pos = html.indexOf('src="boids.js"');
      pages.push(pos > html.indexOf('src="school-of-fish.js"') && pos > html.indexOf('src="scene-kit.js"') && html.includes('src="helix.js"') && pos < html.indexOf('src="factories/') && html.split('src="boids.js"').length === 2 && html.split('src="factories/boids.js"').length === 2);
    }
    ok(pages.every(Boolean), 'all three overlay pages load boids.js once, after the scene kit and school-of-fish.js and before the factories, and the shatter machine it uses');
    const factory = await readFile(resolve(__dirname, 'overlay/factories/boids.js'), 'utf8');
    ok(/VIZ_FACTORIES\['boids'\] = TimbreScene\.factory\(\(\) => TimbreBoids\.definition\(\)\);/.test(factory) && !/WebGLRenderer/.test(factory), 'the effect is the kit\'s factory around the flock\'s definition, with no renderer of its own');
    ok(!/Math\.random/.test(await readFile(resolve(__dirname, 'overlay/boids.js'), 'utf8')), 'the flock takes no numbers from Math.random, so a thump flushes the birds the same way every time');
    const old = T.sanitizeConfig({ activeViz: 'boids', perViz: { 'boids': { cohesion: 80, settleSeconds: 99 } } });
    ok(old.activeViz === 'boids' && JSON.stringify(old.perViz['boids']) === '{"cohesion":80,"density":50,"frightSensitivity":50,"settleSeconds":10,"cameraDrift":50}', 'a saved pre-redesign boids config keeps its Cohesion and gains the new defaults; Settle seconds is held to 10');
  }
}

console.log('\n[25] rose');
await import('./overlay/scene-kit.js');
await import('./overlay/rose.js');
{
  const K = globalThis.TimbreRose, KIT = globalThis.TimbreScene;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const quiet = new Float32Array(8);
  const loudBands = (v) => new Float32Array(8).fill(v);
  const oneBand = (b, v) => { const a = new Float32Array(8); a[b] = v; return a; };
  const finite = (a) => { for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return false; return true; };
  const how = (over = {}) => Object.assign({ flame: 0, kick: 0, bands: quiet, pulse: 0, mic: true }, over);
  const run = (ro, n, secs, h, fps = 60) => { let steps = 0; for (let i = 0, m = Math.round(secs * fps); i < m; i++) steps += K.advance(ro, n, 1 / fps, h); return steps; };
  const at = (a, i) => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(a[0], a[1], a[2]), sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (len(a) * len(b) || 1))));
  const unit3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const count = (ro, n, st) => { let c = 0; for (let i = 0; i < n; i++) if (ro.state[i] === st) c++; return c; };
  // How far petal i leans out from the head's axis, in radians, as it is posed.
  const leanOf = (ro, i) => Math.atan2(dot(at(ro.grow, i), at(ro.out, i)), dot(at(ro.grow, i), ro.top));
  // Everything a step changes, to tell whether anything has.
  const snapshot = (ro) => [ro.p, ro.v, ro.fwd, ro.nrm, ro.grown, ro.heard, ro.loose, ro.thorn, ro.state, ro.head, ro.headV, [ro.bloom, ro.full, ro.time, ro.tau, ro.left]].map((a) => Array.from(a).join()).join('|');
  const blades = () => ({ pos: new Float32Array(K.BLADES_MAX * 3), fwd: new Float32Array(K.BLADES_MAX * 3), nrm: new Float32Array(K.BLADES_MAX * 3), A: new Float32Array(K.BLADES_MAX * 4), B: new Float32Array(K.BLADES_MAX * 4), C: new Float32Array(K.BLADES_MAX * 4) });
  const stalks = () => ({ pos: new Float32Array(K.STALK_POINTS * 3), nrm: new Float32Array(K.STALK_POINTS * 3), tone: new Float32Array(K.STALK_POINTS * 3) });
  const N = 56, KEPT = 24;

  // CONSTANTS
  ok(K.BANDS === 8 && K.PETALS_MIN === 40 && K.PETALS_MAX === 72 && K.KEPT === 0.43 && K.SEPALS === 5 && K.LEAVES === 2 && K.LEAFLETS === 3 && K.FIXED === 11 && K.BLADES_MAX === 83 && K.THORNS === 16 && K.SEED === 20261124 
    && K.STEP === 1 / 60 && K.STEPS_MAX === 6 && K.NS === 8 && K.NT === 14 && K.TIP === 1.9 && JSON.stringify(K.FOOT) === '[-0.95,-1.5,-0.1]' && JSON.stringify(K.BEND) === '[-0.95,-0.7,0.1]' && JSON.stringify(K.HEAD) === '[0.3,0.3,0.25]' 
    && JSON.stringify(K.RUN) === '[0.3,0.7,0.65]' && K.NECK === 0.95 && JSON.stringify(K.HEAD_TURN) === '[0.6,0.5]' && K.BEND_SHARE === 0.3 && JSON.stringify(K.STEM_R) === '[0.052,0.016,0.07]' && K.FLARE === 0.92 
    && K.STEM_RINGS === 44 && K.DOME_RINGS === 5 && K.STEM_AROUND === 10 && K.THORN_RINGS === 4 && K.THORN_AROUND === 6 && K.STALK_RINGS === 4 && K.STALK_AROUND === 5 && K.STALK_POINTS === 914 && JSON.stringify(K.DOME) === '[0.012,0.06,0.55]' 
    && JSON.stringify(K.BARE) === '[0.25,0.9]' && K.FOV === 30 && K.PITCH === 10 && JSON.stringify(K.FRAME) === '{"width":5.6,"height":3.2,"center":[0,-0.2,0]}' && K.LINGER === 0.08,
    'the sizes: 40 to 72 petals of which 43% are always out, five sepals, two leaves of three leaflets, sixteen thorns, steps of 1/60 s, a blade of 8 by 14, the stem from its foot to the head, and a frame of 5.6 by 3.2');
  ok(JSON.stringify(K.HEAD_SWAY) === '[0.1,0.02,0.04]' && JSON.stringify(K.HEAD_RATE) === '[0.8,1.3,0.55]' && K.HEAD_QUIET === 0.25 && K.HEAD_LIFT === 0.05 && K.HEAD_SPRING === 60 && K.HEAD_DAMP === 9 && K.NOD === 1.1 
    && K.NOD_LAND === 0.05 && K.GOLDEN === 2.39996 && K.TURN0 === 0.3 && K.TURN_VARY === 0.2 && JSON.stringify(K.LONG) === '[0.4,0.38,1.2]' && JSON.stringify(K.WIDE) === '[0.8,0.25]' && K.VARY === 0.1 && JSON.stringify(K.ROOT) === '[0.015,0.085]' 
    && JSON.stringify(K.ROOT_UP) === '[0.07,-0.01]' && JSON.stringify(K.LEAN) === '[-0.06,0.4,0.72]' && JSON.stringify(K.LEAN_FROM) === '[0.5,1.05]' && K.LEAN_TOP === 1.12 && JSON.stringify(K.OPEN) === '[0.8,0.28]' 
    && K.GROWING === 0.35 && JSON.stringify(K.WRAP) === '[0.065,0.62,1.1]' && K.WRAP_MAX === 4.4 && K.WRAP_TOP === 1.05 && JSON.stringify(K.CUP) === '[0.1,0.1]' && JSON.stringify(K.ROLL) === '[0.02,0.3,1.5]' 
    && K.ROLL_TOP === 1.1 && K.FULL_MIN === 0.3 && K.FULL_RATE === 4 && JSON.stringify(K.BLOOM_RATE) === '[6,1.6]' && K.KICK_BLOOM === 0.25 && JSON.stringify(K.NERVE) === '[0.1,0.46,1.15,0.06]' && JSON.stringify(K.STAY) === '[0.7,0.9]' 
    && JSON.stringify(K.CALL) === '[1.25,0.85]' && JSON.stringify(K.GROW) === '[7,1.5]' && K.REGROW === 8 && K.LANDED_STAY === 1.2 && K.WAVE_SPAN === 16 && K.WAVE_LEAN === 0.1 && K.WAVE_FLASH === 0.6 && K.KICK_FLASH === 0.35 
    && K.LOOSE_FLASH === 0.5 && K.FLASH_S === 0.25 && K.RISE === 20 && K.FALL === 5 && K.TRAIL === 8 && K.PULSE === 5 && K.HISTORY === 64,
    'the head: how it sways and nods, how its petals are set, lean, wrap, cup and roll, how the bloom opens, what a petal hears and how it grows, and the ripple');
  ok(JSON.stringify(K.THORN_SPAN) === '[0.07,0.78]' && JSON.stringify(K.THORN_TURN) === '[2.4,0.5]' && JSON.stringify(K.THORN_CALL) === '[1.3,1.1,0.12,0.02]' && JSON.stringify(K.THORN_RATE) === '[16,2.2]' 
    && K.THORN_LONG === 0.26 && JSON.stringify(K.THORN_WIDE) === '[0.014,0.2]' && JSON.stringify(K.THORN_HOOK) === '[0.76,0.38]' && K.THORN_WAVE === 0.5 && K.THORN_MOST === 1.3 && JSON.stringify(K.STEM_WAVE) === '[8,26]' 
    && JSON.stringify(K.LEAF_AT) === '[0.36,0.6]' && JSON.stringify(K.LEAF_TURN) === '[2.5,5.6]' && JSON.stringify(K.LEAF_OUT) === '[0.85,0.5]' && JSON.stringify(K.LEAF_STALK) === '[0.24,0.15,0.018,0.006]' 
    && JSON.stringify(K.LEAF_SWAY) === '[0.1,1.7,0.3]' && K.LEAF_WAVE === 0.3 && K.LEAF_DROOP === 0.18 && JSON.stringify(K.LEAFLET) === '[[0.6,0.34],[0.44,0.26]]' && JSON.stringify(K.LEAF_FAN) === '[0.55,0.83]' 
    && JSON.stringify(K.LEAF_SHAPE) === '[0.5,-0.06,0.06]' && JSON.stringify(K.SEPAL) === '[0.34,0.14,0.4,-0.08,0.1]' && JSON.stringify(K.SEPAL_AT) === '[1.2566,0.4,-0.015,0.085]' && JSON.stringify(K.SEPAL_OUT) === '[0.9,-0.42]',
    'the thorns, the leaves and the sepals: where they grow, what a thorn hears, how long and how hooked it is, how a leaf lifts');
  ok(JSON.stringify(K.AIR) === '[1.8,0.7,0.6]' && JSON.stringify(K.AIR_C) === '[0,-0.1,0]' && JSON.stringify(K.HARD) === '[2,0.85,0.75]' && K.HARD_FROM === 0.7 && K.KEEP === 1.5 && JSON.stringify(K.CRUISE) === '[1.1,0.9]' 
    && JSON.stringify(K.LEAD_RATE) === '[0.45,0.9]' && JSON.stringify(K.LEAD) === '[0.9,0.3,0.4]' && JSON.stringify(K.LEAD_WIDE) === '[0.7,0.3]' && K.LEAD_UP === 0.05 && JSON.stringify(K.PLACE) === '[1.1,0.45,0.45]' 
    && K.ROOM === 0.85 && JSON.stringify(K.TURN) === '[3.5,2]' && K.SPEED_RATE === 3 && K.BRAKE === 8 && K.ALIGN === 0.7 && K.NEAR === 0.9 && K.CLEAR === 0.5 && K.PART === 2.5 && K.TOP === 3.2 && JSON.stringify(K.THROW) === '[1.2,1.6,0.3,1.2,1.2]' 
    && JSON.stringify(K.THROWN) === '[3,2.2,2,0.3]' && K.JOSTLE === 0.6 && K.HOME_OVER === 2 && K.HOME_VARY === 0.25 && K.HOME_NEAR === 0.5 && K.HOME_AHEAD === 0.45 && K.HOME_FAST === 2.4 && JSON.stringify(K.HOME_SLOW) === '[0.3,2.5]' 
    && JSON.stringify(K.HOME_SEEK) === '[5,10]' && K.LANDED === 0.03 && K.CATCH === 0.6 && K.TURN_HEAD === 6 && JSON.stringify(K.TUMBLE) === '[0.5,0.5,2]' && K.LAND_TURN === 6 && K.SEAT_TURN === 12 && JSON.stringify(K.SPIN) === '[3,4]' 
    && K.ROCK === 0.45 && K.ROCK_RATE === 0.6 && K.LOOSEN === 6 && K.AWAY === 0.74 && JSON.stringify(K.FLAT) === '[1.3,0.13,0.1]' && K.SWAY === 0.14 && K.ORBIT_RATE === 0.13 && K.PETAL_HUES === 0.03 && JSON.stringify(K.GREEN) === '[0.07,0.29,0.14]' 
    && K.GREEN_PALETTE === 0.05,
    'the air: where loose petals keep, how the lead wheels, how a petal flies, is thrown, comes home and tumbles, how it is drawn loose, the colours and the camera');

  // The settings and the sound.
  {
    const clamped = T.sanitizeConfig({ perViz: { rose: { density: 400, thorns: -3, scatterSensitivity: 77, regatherSeconds: 99, cameraDrift: 12, clones: 4, bogus: 1 } } }).perViz.rose;
    ok(JSON.stringify(T.DEFAULT_PER_VIZ.rose) === '{"density":50,"thorns":50,"scatterSensitivity":50,"regatherSeconds":3,"cameraDrift":50}' && JSON.stringify(T.PER_VIZ_MAX.rose) === '{"regatherSeconds":10}'
      && T.VIZ_SCENES.indexOf('rose') === T.VIZ_SCENES.indexOf('boids') + 1 && T.VIZ_USES_3D.includes('rose') && T.ACTIVE_VIZ_NAMES.length === 52
      && T.ACTIVE_VIZ_NAMES.indexOf('rose') === T.ACTIVE_VIZ_NAMES.indexOf('school-of-fish') + 1 && !('rose' in T.VIZ_LABELS) && T.VIZ_USES_3D.every((n) => T.VIZ_SCENES.includes(n))
      && JSON.stringify(clamped) === '{"density":100,"thorns":0,"scatterSensitivity":77,"regatherSeconds":10,"cameraDrift":12}',
      "Rose's settings: Density, Thorns, Scatter sensitivity, Regather seconds (up to 10) and Camera drift; it keeps its id, its name and its place in the list, and is a scene, listed after the birds, as every WebGL effect now is; a setting it does not have is dropped");
  }
  ok(K.countFor(0) === 40 && K.countFor(50) === 56 && K.countFor(100) === 72 && K.countFor(25) === 48 && K.countFor(1) === 40 && K.countFor(2) === 41 && K.countFor(-9) === 40 && K.countFor(900) === 72
    && K.countFor(undefined) === 56 && K.countFor(NaN) === 56 && K.countFor('7') === 56,
    'Density 0 is 40 petals, 50 is 56 and 100 is 72, to the nearest whole petal; anything that is not a number is 50');
  ok(K.keptFor(40) === 17 && K.keptFor(56) === 24 && K.keptFor(72) === 31 && K.keptFor(41) === 18,
    'of 40 petals 17 are always out, of 56 it is 24 and of 72 it is 31');
  ok(K.thornFor(0) === 0 && near(K.thornFor(50), 0.26) && near(K.thornFor(100), 0.52) && near(K.thornFor(25), 0.13) && K.thornFor(-5) === 0 && near(K.thornFor(400), 0.52) && near(K.thornFor(undefined), 0.26) && near(K.thornFor('x'), 0.26),
    'Thorns 0 is no thorns, 50 is thorns 0.26 long and 100 twice that; anything that is not a number is 50');
  ok(K.loudness(null, 0, 1) === 0 && K.loudness([255], 3, 1) === 0 && near(K.loudness([51, 255], 0, 1), 0.2) && K.loudness([51, 255], 1, 2) === 1 && near(K.loudness([51, 255], 0, 2), 0.4) && K.loudness([0, 0], 1, 9) === 0,
    'a band is as loud as its bin of 255, times Gain, at most 1; with no bins, or none for it, it is silent');
  {
    let most = 0, up = 0, all = 0;
    for (let b = 0; b < 8; b++) for (let t = 0; t < 60; t += 0.05) { const v = K.idle(b, t); all++; if (v > 0) up++; if (v > most) most = v; }
    ok(near(most, 0.25, 1e-3) && up / all > 0.25 && up / all < 0.4 && K.idle(0, 0) !== K.idle(1, 0) && K.idle(3, 2) === Math.max(0, 0.45 * Math.sin(0.45 * 2 + 1.4 * 3) - 0.2),
      'with the mic off and Idle animation on, a band swells to a quarter at most, for about a third of the time, each in its turn — ' + [most.toFixed(3), (up / all).toFixed(3)]);
  }
  ok(K.settle(0.00009) === 0 && K.settle(-0.00009) === 0 && K.settle(0.0001) === 0.0001 && K.settle(0.5) === 0.5 && K.settle(-0.3) === -0.3,
    'all but nothing is nothing: less than a ten-thousandth either way is 0');
  {
    const a = K.rng(5), b = K.rng(5), c = K.rng(6), xs = [a(), a(), a()], ys = [b(), b(), b()], zs = [c(), c(), c()];
    ok(xs.join() === ys.join() && xs.join() !== zs.join() && xs.every((v) => v >= 0 && v < 1) && new Set(xs).size === 3, 'the same seed gives the same numbers, from 0 to 1, and another seed gives others');
  }
  ok(near(K.callOf(0.2, 0), 0.25) && near(K.callOf(0, 0.4), 0.34) && near(K.callOf(0.2, 0.4), 0.34) && near(K.callOf(0.4, 0.2), 0.5) && K.callOf(0, 0) === 0,
    "a sprouting petal's call is its band (times 1.25) or the voice (times 0.85), whichever is more");
  ok(near(K.thornCall(0.5, 0, 0), 0.65) && near(K.thornCall(0, 1, 0), 0.98) && near(K.thornCall(0, 1, 4), 0.90) && near(K.thornCall(0, 1, 5), 0.98) && near(K.thornCall(0, 1, 7), 0.94) && K.thornCall(0, 0.1, 0) === 0 && K.thornCall(1, 1, 0) === 1 && near(K.thornCall(0.2, 0.5, 1), 0.41),
    'a thorn is called out by its band (times 1.3) or by a loud voice (times 1.1, less 0.12, and less 0.02 more for each of five in turn), never past 1 and never below 0');
  ok(K.pulseOf(0.5, 0.5) === 0 && near(K.pulseOf(0.6, 0.5), 0.5) && K.pulseOf(0.9, 0.5) === 1 && K.pulseOf(0.2, 0.5) === 0, 'a syllable is how much louder it has just become, five for one, from 0 to 1');

  // The stem.
  {
    const ro = K.createRose(K.SEED, N), foot = K.stemAt(ro, 0), top = K.stemAt(ro, 1), mid = K.stemAt(ro, 0.5);
    let long = 0, straightest = 1, last = foot.at, frames = true;
    for (let j = 1; j <= 200; j++) {
      const s = K.stemAt(ro, j / 200); long += len(sub(s.at, last)); last = s.at;
      if (!near(len(s.run), 1, 1e-9) || !near(len(s.e1), 1, 1e-9) || !near(len(s.e2), 1, 1e-9) || Math.abs(dot(s.run, s.e1)) > 1e-9 || Math.abs(dot(s.run, s.e2)) > 1e-9 || Math.abs(dot(s.e1, s.e2)) > 1e-9 || s.e1[0] <= 0) frames = false;
      straightest = Math.min(straightest, dot(s.run, foot.run));
    }
    ok(foot.at.join() === K.FOOT.join() && near(len(sub(top.at, ro.c3)), 0, 1e-12) && frames && near(angle(top.run, ro.top), 0, 1e-6) && long > 2.2 && long < 2.9 && straightest < 0.9 && straightest > 0.2
      && mid.at[0] > K.FOOT[0] - 0.2 && mid.at[0] < K.HEAD[0] && mid.at[1] > K.FOOT[1] && mid.at[1] < K.HEAD[1],
      'the stem runs from its foot to the head in one curve, about two and a half long, and runs into the head the way the head faces; across it there are two directions square to it and to each other, the first toward the right — ' + [long.toFixed(3), straightest.toFixed(3)]);
    ok(near(K.stemRadius(0), 0.052) && near(K.stemRadius(0.5), 0.044) && near(K.stemRadius(0.92), 0.052 - 0.016 * 0.92) && near(K.stemRadius(1), 0.106) && K.stemRadius(0.96) > K.stemRadius(0.92) && K.stemRadius(0.96) < K.stemRadius(1) && K.stemRadius(0.3) > K.stemRadius(0.6),
      'the stem is 0.052 thick at its foot, thinner toward its top, and widens into the head over the last twelfth to 0.106');
    // The head swayed to one side.
    ro.head[0] = 0.1; ro.head[1] = -0.04; ro.head[2] = 0.02; K.curve(ro);
    const want = [K.RUN[0] + 0.6 * 0.1, K.RUN[1] + 0.5 * -0.04, K.RUN[2]], wl = len(want);
    ok(near(ro.c3[0], K.HEAD[0] + 0.1) && near(ro.c3[1], K.HEAD[1] - 0.04) && near(ro.c3[2], K.HEAD[2] + 0.02) && [0, 1, 2].every((k) => near(ro.top[k], want[k] / wl, 1e-12) && near(ro.c2[k], ro.c3[k] - K.NECK * ro.top[k], 1e-12))
      && near(ro.c1[0], K.BEND[0] + 0.03) && near(ro.c1[1], K.BEND[1] - 0.012) && near(ro.c1[2], K.BEND[2] + 0.006) && ro.c0.join() === K.FOOT.join()
      && near(len(ro.hx), 1) && near(len(ro.hy), 1) && Math.abs(dot(ro.hx, ro.top)) < 1e-12 && Math.abs(dot(ro.hy, ro.top)) < 1e-12 && Math.abs(dot(ro.hx, ro.hy)) < 1e-12 && ro.hx[0] > 0
      && near(dot([ro.hx[1] * ro.hy[2] - ro.hx[2] * ro.hy[1], ro.hx[2] * ro.hy[0] - ro.hx[0] * ro.hy[2], ro.hx[0] * ro.hy[1] - ro.hx[1] * ro.hy[0]], ro.top), 1, 1e-9),
      'a head that has swayed takes the top of the stem with it, the bend a third as far, and faces a little the way it has swayed; its two directions across are square to its axis and each other');
  }

  // The head.
  {
    const ro = K.createRose(K.SEED, N), again = K.createRose(K.SEED, N), other = K.createRose(K.SEED + 1, N);
    let seated = true, bandsOk = true, rising = 0, nerveOk = true, shapes = true;
    for (let i = 0; i < N; i++) {
      if (ro.state[i] !== 0 || ro.grown[i] !== (i < KEPT ? 1 : 0) || ro.loose[i] !== 0 || at(ro.p, i).join() !== at(ro.base, i).join() || at(ro.fwd, i).join() !== at(ro.grow, i).join() || at(ro.nrm, i).join() !== at(ro.face, i).join() || len(at(ro.v, i)) !== 0) seated = false;
      if (ro.band[i] !== i % 8) bandsOk = false;
      if (i > 0 && ro.len[i] > ro.len[i - 1]) rising++;
      if (i >= KEPT && (ro.nerve[i] < 0.10 || ro.nerve[i] > 0.62 + 1e-6)) nerveOk = false;
      if (!(ro.wid[i] > 0.7 * ro.len[i] && ro.wid[i] < 1.2 * ro.len[i]) || !(ro.len[i] > 0.37 && ro.len[i] < 0.83)) shapes = false;
    }
    const innerNerve = (ro.nerve[KEPT] + ro.nerve[KEPT + 1] + ro.nerve[KEPT + 2]) / 3, outerNerve = (ro.nerve[N - 1] + ro.nerve[N - 2] + ro.nerve[N - 3]) / 3;
    ok(ro.n === N && ro.kept === KEPT && seated && bandsOk && nerveOk && shapes && rising > 35 && ro.len[N - 1] > 1.6 * ro.len[0] && innerNerve < 0.2 && outerNerve > 0.5 && near(ro.full, KEPT / N, 1e-7)
      && ro.attached === N && ro.flying === 0 && ro.coming === 0 && ro.open === KEPT && ro.homing === false && ro.time === 0,
      'a rose of 56 petals: all on the head, 24 out and 32 folded away; petals longer and wider toward the rim; petal i listens to band i % 8; a folded petal nearer the rim has more nerve — ' + [rising, innerNerve.toFixed(3), outerNerve.toFixed(3)]);
    ok(snapshot(ro) === snapshot(again) && Array.from(ro.len).join() === Array.from(again.len).join() && Array.from(ro.nerve).join() === Array.from(again.nerve).join() && Array.from(ro.len).join() !== Array.from(other.len).join() && Array.from(ro.spin).join() !== Array.from(other.spin).join(),
      'the same seed makes the same rose, and another seed another');
    let square = true, inward = true, rooted = true, turned = 0;
    for (let i = 0; i < N; i++) {
      const g = at(ro.grow, i), f = at(ro.face, i), o = at(ro.out, i), b = sub(at(ro.base, i), ro.c3), along = dot(b, ro.top), off = len(sub(b, ro.top.map((v) => v * along)));
      if (!near(len(g), 1, 1e-6) || !near(len(f), 1, 1e-6) || !near(len(o), 1, 1e-6) || Math.abs(dot(g, f)) > 1e-6 || Math.abs(dot(o, ro.top)) > 1e-6) square = false;
      if (dot(f, o) >= 0) inward = false;
      if (off < 0.015 - 1e-6 || off > 0.1 + 1e-6 || along < -0.011 || along > 0.071) rooted = false;
      if (i > 0) { let d = (ro.turn[i] - ro.turn[i - 1]) % (2 * Math.PI); if (Math.abs(d - K.GOLDEN) < 0.21) turned++; }
    }
    const rootOf = (r, i) => { const b = sub(at(r.base, i), r.c3), along = dot(b, r.top); return [len(sub(b, r.top.map((v) => v * along))), along]; };
    const grownAll = K.createRose(K.SEED, N); for (let i = 0; i < N; i++) grownAll.grown[i] = 1; grownAll.full = 1; K.pose(grownAll);
    const heartRoot = rootOf(grownAll, 0), rimRoot = rootOf(grownAll, N - 1);
    ok(square && inward && rooted && turned === N - 1 && near(heartRoot[0], K.ROOT[0], 1e-6) && near(heartRoot[1], K.ROOT_UP[0] + K.ROOT_UP[1], 1e-6) && near(rimRoot[0], K.ROOT[0] + K.ROOT[1], 1e-6) && near(rimRoot[1], K.ROOT_UP[1], 1e-6),
      "each petal grows from near the head's axis (0.015 from it and 0.06 up at the heart, 0.1 from it and a little below at the rim), its inner face toward the axis and square to the way it grows; each is about 137.5 degrees further round than the last");
    // How far a petal leans goes by its rank among the petals now out.
    const small = leanOf(ro, KEPT - 1), heart = leanOf(ro, 0);
    const full = K.createRose(K.SEED, N); for (let i = 0; i < N; i++) full.grown[i] = 1; full.full = 1; K.pose(full);
    const rim = leanOf(full, N - 1), sameInFull = leanOf(full, KEPT - 1), halfway = leanOf(full, 40);
    ok(heart < 0 && heart > -0.08 && small > 0.7 && small < 0.9 && rim > 0.75 && rim < 0.9 && Math.abs(small - rim) < 0.06 && sameInFull > 0 && sameInFull < 0.15 && halfway > sameInFull && halfway < 0.5 * rim
      && near(ro.shape[0], K.WRAP_MAX, 1e-6) && full.shape[(N - 1) * 3] < 1.9 && full.shape[(N - 1) * 3] > 1.2 && full.shape[(N - 1) * 3 + 1] > full.shape[1] && full.shape[(N - 1) * 3 + 2] > 5 * full.shape[2],
      'the outermost petal of a small rose leans out as far as the outermost of a full one (about 47 degrees), while the same petal in the full rose stands close; a petal at the heart leans in, is wrapped right round, and its tip barely rolls; the inner petals stand close and only the outer ones open — ' + [heart, small, rim, sameInFull, halfway].map((v) => v.toFixed(3)));
    // A petal that is still growing stands closer in, and the loudest voice opens the bloom by a third.
    const half = K.createRose(K.SEED, N); for (let i = 0; i < N; i++) half.grown[i] = 1; half.full = 1; half.grown[N - 1] = 0; K.pose(half);
    const loud = K.createRose(K.SEED, N); for (let i = 0; i < N; i++) loud.grown[i] = 1; loud.full = 1; loud.bloom = 1; K.pose(loud);
    ok(near(leanOf(half, N - 1), K.GROWING * rim, 1e-6) && near(leanOf(loud, N - 1), rim * (K.OPEN[0] + K.OPEN[1]) / K.OPEN[0], 1e-6) && near(leanOf(half, N - 2), leanOf(full, N - 2), 1e-9),
      'a petal that has only begun to grow leans out a third as far as it will, and the loudest voice opens every petal by a third more');
  }

  // Sprouting and folding.
  {
    const ro = K.createRose(K.SEED, N);
    run(ro, N, 2, how());
    const still = ro.open === KEPT && Array.from(ro.grown.subarray(KEPT, N)).every((g) => g === 0) && near(ro.full, KEPT / N, 1e-4);
    // One band sounds, a little.
    run(ro, N, 1, how({ bands: oneBand(3, 0.2) }));
    let ownOut = 0, own = 0, othersOut = 0, bold = true;
    for (let i = KEPT; i < N; i++) {
      if (ro.band[i] === 3) { own++; if (ro.grown[i] > 0.9) { ownOut++; if (ro.nerve[i] >= 0.25) bold = false; } else if (ro.nerve[i] < 0.25) bold = false; }
      else if (ro.grown[i] > 0) othersOut++;
    }
    ok(still && own === 4 && ownOut >= 1 && ownOut < own && othersOut === 0 && bold,
      'in silence only the 24 are out; when one band sounds a little, the folded petals of that band with nerve enough unfurl, and no other does — ' + [ownOut, own, othersOut]);
    // A quiet word, then a loud voice.
    const word = K.createRose(K.SEED, N); run(word, N, 1.5, how({ flame: 0.3 }));
    let out = 0, meanOut = 0, meanIn = 0;
    for (let i = KEPT; i < N; i++) { if (word.grown[i] > 0.9) { out++; meanOut += i; } else meanIn += i; }
    meanOut /= out || 1; meanIn /= (N - KEPT - out) || 1;
    const shout = K.createRose(K.SEED, N); run(shout, N, 1.5, how({ flame: 0.9 }));
    ok(out >= 6 && out <= 16 && meanOut < meanIn - 6 && word.open === KEPT + out && shout.open === N && Array.from(shout.grown.subarray(0, N)).every((g) => g > 0.99 && g <= 1) && shout.full > 0.97 && word.full > KEPT / N + 0.05 && word.full < 0.8,
      'a quiet word opens a few of the folded petals, the inner ones; a loud voice opens them all, and the head is then full — ' + [out, meanOut.toFixed(1), meanIn.toFixed(1), word.full.toFixed(3), shout.full.toFixed(3)]);
    // In the pause after, each stays out for its own time and then folds away, to nothing.
    run(shout, N, 0.5, how());
    const held = Array.from(shout.grown.subarray(KEPT, N)).every((g) => g > 0.99);
    run(shout, N, 1.4, how());
    let folding = 0, yet = 0;
    for (let i = KEPT; i < N; i++) { if (shout.grown[i] < 0.95) folding++; if (shout.grown[i] > 0.99) yet++; }
    run(shout, N, 9, how());
    ok(held && folding > 20 && folding < N - KEPT + 1 && Array.from(shout.grown.subarray(KEPT, N)).every((g) => g === 0) && Array.from(shout.grown.subarray(0, KEPT)).every((g) => g === 1) && shout.open === KEPT && near(shout.full, KEPT / N, 1e-4) && shout.bloom === 0,
      'in the pause each stays out for a while (0.7 to 1.6 s), then folds away until it is exactly gone; the 24 never fold, and the bloom closes exactly — ' + [folding, yet]);
    // The bloom: how fast it opens and closes, and what a beat adds.
    const b = K.createRose(K.SEED, N);
    K.stepRose(b, N, how({ flame: 0.5 })); const one = b.bloom;
    K.stepRose(b, N, how({ flame: 0.5, kick: 1 })); const two = b.bloom;
    K.stepRose(b, N, how({ flame: 0 })); const three = b.bloom;
    ok(near(one, 0.5 * 6 / 60, 1e-7) && near(two, one + (0.75 - one) * 6 / 60, 1e-7) && near(three, two - two * 1.6 / 60, 1e-7),
      'the bloom follows the voice, six a second opening and 1.6 a second closing, and a beat opens it a quarter further');
  }

  // The thorns.
  {
    const ro = K.createRose(K.SEED, N);
    run(ro, N, 1, how({ bands: oneBand(2, 0.5) }));
    let own = true, others = true;
    for (let j = 0; j < K.THORNS; j++) { const b = Math.floor(j / 2); if (b === 2) { if (!near(ro.thorn[j], 0.65, 1e-3)) own = false; } else if (ro.thorn[j] !== 0) others = false; }
    const loud = K.createRose(K.SEED, N); run(loud, N, 1, how({ flame: 1 }));
    const allOut = Array.from(loud.thorn).every((v, j) => near(v, K.thornCall(0, 1, j), 1e-3));
    const first = K.createRose(K.SEED, N); K.stepRose(first, N, how({ flame: 1 })); const grew = first.thorn[0];
    K.stepRose(first, N, how()); const drew = first.thorn[0];
    run(loud, N, 6, how());
    const off = K.createRose(K.SEED, N); run(off, N, 2, how({ mic: false, bands: loudBands(0.25) }));
    ok(own && others && allOut && near(grew, 0.98 * 16 / 60, 1e-6) && near(drew, grew - grew * 2.2 / 60, 1e-6) && Array.from(loud.thorn).every((v) => v === 0) && Array.from(off.thorn).every((v) => v === 0) && off.open > KEPT,
      'a thorn comes out when its band sounds (two thorns to a band, low at the foot) and all come out for a loud voice, quickly, and draw in slowly to exactly nothing; with the mic off no thorn grows, though petals sprout');
    const r = K.createRose(K.SEED, N); r.thorn[5] = 0.5;
    const plain = K.thornLength(r, 5, 0.26);
    const t5 = K.THORN_SPAN[0] + K.THORN_SPAN[1] * 5.5 / 16, ago = Math.floor(K.STEM_WAVE[0] + K.STEM_WAVE[1] * (1 - t5));
    r.hist[(r.at - 1 - ago + 128) % 64] = 1;
    const rippled = K.thornLength(r, 5, 0.26); r.thorn[5] = 1; const most = K.thornLength(r, 5, 0.26);
    ok(near(plain, 0.13, 1e-7) && near(rippled, 0.13 * 1.5, 1e-7) && near(most, 0.26 * 1.3, 1e-7) && K.thornLength(r, 5, 0) === 0 && K.thornLength(r, 4, 0.26) === 0,
      'a thorn is drawn as long as it is out, half as much again as a syllable passes it, and never more than 1.3 of its full length');
  }

  // The ripple.
  {
    const ro = K.createRose(K.SEED, N); for (let i = 0; i < N; i++) ro.grown[i] = 1; ro.full = 1;
    const calm = K.createRose(K.SEED, N); for (let i = 0; i < N; i++) calm.grown[i] = 1; calm.full = 1;
    const loud = how({ flame: 0.9 });
    K.stepRose(ro, N, Object.assign({}, loud, { pulse: 1 })); K.stepRose(calm, N, loud);
    const now = K.rippleAt(ro, 0);
    let rimAt = -1, midAt = -1;
    for (let s = 1; s <= 30; s++) {
      K.stepRose(ro, N, loud); K.stepRose(calm, N, loud);
      if (rimAt < 0 && leanOf(ro, N - 1) - leanOf(calm, N - 1) > 0.05) rimAt = s;
      if (midAt < 0 && leanOf(ro, 28) - leanOf(calm, 28) > 0.01) midAt = s;
    }
    const gone = Math.abs(leanOf(ro, N - 1) - leanOf(calm, N - 1)) < 1e-9;
    ok(now === 1 && K.rippleAt(ro, 30) === 1 && K.rippleAt(ro, 29) === 0 && K.rippleAt(ro, 31) === 0 && midAt === 9 && rimAt === 17 && gone && K.rippleAt(ro, -5) === K.rippleAt(ro, 0) && K.rippleAt(ro, 500) === K.rippleAt(ro, 60),
      'a syllable is a ripple from the heart outward: it reaches a petal halfway out after 8 steps and the rim after 16, leans each out a little as it passes, and is gone — ' + [midAt, rimAt]);
  }

  // The head on its stem.
  {
    const ro = K.createRose(K.SEED, N);
    let quietMost = 0; for (let i = 0; i < 1200; i++) { K.stepRose(ro, N, how()); quietMost = Math.max(quietMost, Math.abs(ro.head[0])); }
    const loud = K.createRose(K.SEED, N);
    let loudMost = 0, lift = 0; for (let i = 0; i < 1200; i++) { K.stepRose(loud, N, how({ flame: 1 })); loudMost = Math.max(loudMost, Math.abs(loud.head[0])); lift += loud.head[1] / 1200; }
    const hit = K.createRose(K.SEED, N), calm = K.createRose(K.SEED, N); run(hit, N, 2, how()); run(calm, N, 2, how());
    K.scatter(hit, N, 1, K.rng(1)); const knocked = hit.headV[1] - calm.headV[1];
    let dip = 0; for (let i = 0; i < 150; i++) { K.stepRose(hit, N, how()); K.stepRose(calm, N, how()); dip = Math.min(dip, hit.head[1] - calm.head[1]); }
    ok(quietMost > 0.015 && quietMost < 0.035 && loudMost > 0.08 && loudMost < 0.12 && lift > 0.04 && lift < 0.06 && near(knocked, -K.NOD, 1e-9) && dip < -0.05 && dip > -0.1 && Math.abs(hit.head[1] - calm.head[1]) < 1e-3 && Math.abs(hit.head[0] - calm.head[0]) < 1e-9,
      'the head sways on its stem, a quarter as far in silence as at the loudest, and a loud voice lifts it; a thump knocks it down and it springs back — ' + [quietMost, loudMost, lift, dip].map((v) => v.toFixed(3)));
  }

  // The thump.
  {
    const ro = K.createRose(K.SEED, N); run(ro, N, 1, how({ flame: 0.9 }));
    const twin = K.createRose(K.SEED, N); run(twin, N, 1, how({ flame: 0.9 }));
    K.scatter(ro, N, 1, K.rng(1001)); K.scatter(twin, N, 1, K.rng(1001));
    let outward = true, fastest = 0, slowest = 9, meanOut = 0, meanAlong = 0;
    for (let i = 0; i < N; i++) {
      const v = at(ro.v, i), o = dot(v, at(ro.out, i)), u = dot(v, ro.top), s = len(v);
      if (o < K.THROW[0] - 1.4 || o > K.THROW[0] + K.THROW[1] + 1.4 || u < K.THROW[2] - 1.4 || u > K.THROW[2] + K.THROW[3] + 1.4) outward = false;
      fastest = Math.max(fastest, s); slowest = Math.min(slowest, s); meanOut += o / N; meanAlong += u / N;
    }
    const soft = K.createRose(K.SEED, N); run(soft, N, 1, how({ flame: 0.9 })); K.scatter(soft, N, 0.5, K.rng(1001));
    const halved = [0, 7, 30, 55].every((i) => [0, 1, 2].every((k) => near(soft.v[i * 3 + k], 0.5 * ro.v[i * 3 + k], 1e-6)));
    ok(count(ro, N, 1) === N && ro.flying === N && ro.attached === 0 && outward && Math.abs(meanOut - (K.THROW[0] + K.THROW[1] / 2)) < 0.25 && Math.abs(meanAlong - (K.THROW[2] + K.THROW[3] / 2)) < 0.25 && slowest > 0.6 && fastest < 4.6 && ro.homing === false && snapshot(ro) === snapshot(twin) && halved && near(soft.headV[1] - ro.headV[1], 0.5 * K.NOD, 1e-6),
      'a thump throws every petal off the head, out from its axis and along it; the same thump throws them the same way again, and a peak half as hard throws them half as fast — ' + [slowest.toFixed(2), fastest.toFixed(2)]);
    // Thrown again in the air.
    run(ro, N, 0.5, how({ flame: 0.5 }));
    const was = Array.from(ro.v); K.scatter(ro, N, K.JOSTLE, K.rng(4));
    let changed = 0, most = 0; for (let i = 0; i < N; i++) { const d = len(sub(at(ro.v, i), at(was, i))); if (d > 0.05) changed++; most = Math.max(most, d); }
    ok(changed > N - 4 && most < K.JOSTLE * Math.hypot(K.THROWN[0] / 2, K.THROWN[1] * (1 - K.THROWN[3]), K.THROWN[2] / 2) + 1e-6 && count(ro, N, 1) === N, 'a peak while they are loose throws each off its way, less hard — ' + [changed, most.toFixed(2)]);
  }

  // The flock.
  {
    const ro = K.createRose(K.SEED, N); run(ro, N, 1, how({ flame: 0.9 }));
    K.scatter(ro, N, 1, K.rng(1001));
    const h = how({ flame: 0.5 });
    let top = 0, closest = 9, ok1 = true;
    for (let s = 0; s < 360; s++) {
      K.stepRose(ro, N, h);
      for (let i = 0; i < N; i++) { top = Math.max(top, len(at(ro.v, i))); }
      if (!finite(ro.p) || !finite(ro.v) || !finite(ro.fwd) || !finite(ro.nrm)) ok1 = false;
    }
    // After their alarm they are a flock by the lead, each at its own place.
    let apart = 0, pairs = 0, off = 0, tooNear = 0, width = 0;
    const mid = [0, 0, 0];
    for (let i = 0; i < N; i++) { for (let k = 0; k < 3; k++) mid[k] += ro.p[i * 3 + k] / N; }
    for (let i = 0; i < N; i++) width += Math.abs(ro.p[i * 3] - mid[0]) / N;
    for (let i = 0; i < N; i++) {
      let nearest = 9;
      for (let j = 0; j < N; j++) if (j !== i) nearest = Math.min(nearest, len(sub(at(ro.p, i), at(ro.p, j))));
      apart += nearest / N; closest = Math.min(closest, nearest); if (nearest < 0.12) tooNear++;
    }
    const lead = ro.lead.slice(); run(ro, N, 2, h);
    const moved = len(sub(ro.lead, lead));
    let unitOk = true, squareOk = true, heading = 0;
    for (let i = 0; i < N; i++) { const f = at(ro.fwd, i), nn = at(ro.nrm, i); heading += dot(f, at(ro.v, i)) / len(at(ro.v, i)) / N; if (!near(len(f), 1, 1e-4) || !near(len(nn), 1, 1e-4)) unitOk = false; if (Math.abs(dot(f, nn)) > 1e-3) squareOk = false; }
    ok(ok1 && count(ro, N, 1) === N && top <= K.TOP + 1e-6 && len(sub(mid, lead)) < 0.6 && width > 0.35 && apart > 0.19 && tooNear <= 14 && moved > 0.3 && unitOk && squareOk && heading > 0.6 && Array.from(ro.loose.subarray(0, N)).every((l) => l > 0.99) && Array.from(ro.grown.subarray(0, N)).every((g) => g > 0.99),
      'loose, the petals are a flock: they gather by the lead, which wheels on, each keeps clear of the others, none flies faster than 5, every one is fully grown, and each heads one way with its face square to it — ' + [len(sub(mid, lead)).toFixed(2), apart.toFixed(2), closest.toFixed(2), tooNear, moved.toFixed(2), heading.toFixed(3), width.toFixed(3)]);
  }

  // Nothing leaves the picture.
  {
    const view = { pitch: K.PITCH, fov: K.FOV, frame: K.FRAME };
    const inside = (c, r, orbit) => { const b = KIT.reach({ min: [c[0] - r, c[1] - r, c[2] - r], max: [c[0] + r, c[1] + r, c[2] + r] }, view, 0, 0, 0, 1, 0, 0, 0, orbit); return b[0] >= -K.FRAME.height / 2 && b[1] <= K.FRAME.height / 2 && b[2] >= -K.FRAME.width / 2 && b[3] <= K.FRAME.width / 2; };
    let out = 0, checked = 0, edge = 0, outward = 0, slowest = 9;
    for (const n of [40, 72]) {
      const ro = K.createRose(K.SEED, n), random = K.rng(77), h = how({ flame: 1, bands: loudBands(1) });
      for (let s = 0; s < 900; s++) {
        if (s % 36 === 0) K.scatter(ro, n, 1, random);
        h.kick = s % 20 === 0 ? 1 : 0.5;
        K.stepRose(ro, n, h);
        const orbit = 2 * K.SWAY * Math.sin(s / 40);
        for (let i = 0; i < n; i++) {
          const r = 0.5 * Math.hypot(ro.len[i], ro.wid[i]) * K.AWAY;
          checked++; if (!inside(at(ro.p, i), r, orbit)) out++;
          const g = [(ro.p[i * 3] - K.AIR_C[0]) / K.HARD[0], (ro.p[i * 3 + 1] - K.AIR_C[1]) / K.HARD[1], (ro.p[i * 3 + 2] - K.AIR_C[2]) / K.HARD[2]];
          edge = Math.max(edge, len(g));
          if (len(g) > 0.99) { const nn = [g[0] / K.HARD[0], g[1] / K.HARD[1], g[2] / K.HARD[2]], nl = len(nn); outward = Math.max(outward, dot(at(ro.v, i), nn) / nl); }
          if (len(g) > 0.9 && s % 36 > 12) slowest = Math.min(slowest, len(at(ro.v, i)));
        }
      }
    }
    ok(out === 0 && checked > 90000 && edge > 0.9 && edge <= 1 + 1e-6 && outward < 1.5 && slowest > 1.12, 'thrown again and again at the loudest, with the camera swung as far as it goes, no petal leaves the picture: near the edge of all the air there is it loses its speed outward, and it does not pass it; it is turned along the edge, not stopped — ' + [out, checked, edge.toFixed(3), outward.toFixed(3), slowest.toFixed(3)]);
    // The rose itself, at its fullest and loudest, with thorns at their longest.
    let outside = 0, reach = 0;
    for (const n of [40, 72]) {
      const ro = K.createRose(K.SEED, n), h = how({ flame: 1, bands: loudBands(1), kick: 1, pulse: 1 }), sent = blades(), st = stalks();
      for (let s = 0; s < 600; s++) {
        K.stepRose(ro, n, h);
        if (s % 7) continue;
        K.dress(sent, ro, n, { flame: 1, kick: 1, flash: 0, lead: 0 }); K.stalk(st, ro, { thorn: K.thornFor(100), flame: 1 });
        const orbit = 2 * K.SWAY * Math.sin(s / 40);
        for (let j = 0; j < K.FIXED + n; j++) {
          const L = sent.A[j * 4] * sent.C[j * 4], c = [0, 1, 2].map((k) => sent.pos[j * 3 + k] + 0.5 * L * sent.fwd[j * 3 + k]), r = 0.5 * Math.max(L, sent.A[j * 4 + 1] * sent.C[j * 4]);
          if (j >= K.FIXED) reach = Math.max(reach, len(sub(c, ro.c3)) + r);
          if (!inside(c, r, orbit)) outside++;
        }
        for (let q = 0; q < K.STALK_POINTS; q++) if (!inside(at(st.pos, q), 0, orbit)) outside++;
      }
    }
    ok(outside === 0 && reach > 0.8 && reach < 1.0, 'the rose at its fullest and loudest, thorns at their longest, is inside the picture with the camera swung as far as it goes — ' + [outside, reach.toFixed(3)]);
  }

  // Coming home.
  {
    const ro = K.createRose(K.SEED, N); run(ro, N, 1, how({ flame: 0.9 }));
    K.scatter(ro, N, 1, K.rng(1001)); run(ro, N, 3, how({ flame: 0.4 }));
    const t0 = ro.time; K.gather(ro, N, K.rng(5));
    let ordered = true, within = true, late = 0, soon = 9;
    for (let i = 0; i < N; i++) { const due = ro.homeAt[i] - t0, base = 2 * i / (N - 1); if (due < base - 1e-6 || due > base + 0.25 + 1e-6) within = false; late = Math.max(late, due - base); soon = Math.min(soon, due - base); }
    if (!(late > 0.2 && soon < 0.05)) within = false;
    const sent = blades(), look = { flame: 0.4, kick: 0, flash: 0, lead: 0 }, landedAt = new Float32Array(N).fill(-1), prevF = new Float32Array(N * 3), prevN = new Float32Array(N * 3), prevP = new Float32Array(N * 3);
    let fastest = 0, slowest = 9, jump = 0, turn = 0, faceTurn = 0, shift = 0, early = 0, h = how({ flame: 0.4 }), nods = 0, looseLanding = 0, leftLanding = 0, leftMean = 0;
    K.dress(sent, ro, N, look);
    for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) { prevF[i * 3 + k] = sent.fwd[(K.FIXED + i) * 3 + k]; prevN[i * 3 + k] = sent.nrm[(K.FIXED + i) * 3 + k]; prevP[i * 3 + k] = sent.pos[(K.FIXED + i) * 3 + k]; }
    for (let s = 0; s < 600; s++) {
      const was = Array.from(ro.state.subarray(0, N)), p0 = Array.from(ro.p), v0 = Array.from(ro.v), hv = ro.headV[1];
      K.stepRose(ro, N, h);
      K.dress(sent, ro, N, look);
      let landedNow = 0;
      for (let i = 0; i < N; i++) {
        if (was[i] === 1 && ro.state[i] === 2 && ro.time - K.STEP < ro.homeAt[i] - 1e-6) early++;
        if (was[i] === 2 && ro.state[i] === 0) {
          landedAt[i] = s; landedNow++;
          const sp = len(at(v0, i)); fastest = Math.max(fastest, sp); slowest = Math.min(slowest, sp);
          jump = Math.max(jump, len(sub(at(ro.p, i), at(p0, i))));
          looseLanding = Math.max(looseLanding, ro.loose[i]); { const left = Math.max(angle(at(ro.fwd, i), at(ro.grow, i)), angle(at(ro.nrm, i), at(ro.face, i))); leftLanding = Math.max(leftLanding, left); leftMean += left / N; }
          if (len(at(ro.v, i)) !== 0) jump = 9;
        }
        const f = at(sent.fwd, K.FIXED + i), nn = at(sent.nrm, K.FIXED + i), pp = at(sent.pos, K.FIXED + i);
        turn = Math.max(turn, angle(f, at(prevF, i))); faceTurn = Math.max(faceTurn, angle(nn, at(prevN, i))); shift = Math.max(shift, len(sub(pp, at(prevP, i))));
        for (let k = 0; k < 3; k++) { prevF[i * 3 + k] = f[k]; prevN[i * 3 + k] = nn[k]; prevP[i * 3 + k] = pp[k]; }
      }
      if (landedNow) nods += landedNow;
    }
    let inner = 0, outer = 0; for (let i = 0; i < N; i++) { if (i < N / 2) inner += landedAt[i] / (N / 2); else outer += landedAt[i] / (N / 2); }
    ok(ro.homing === true && within && early === 0 && Array.from(landedAt).every((v) => v >= 0) && ro.attached === N && ro.coming === 0 && inner < outer - 30 && nods === N
      && fastest < 0.5 && slowest > 0.2 && jump <= K.LANDED + 1e-6 && looseLanding < 0.3 && leftLanding < 2.2 && leftMean < 0.4 && Array.from(ro.loose.subarray(0, N)).every((l) => l === 0),
      'after the calm wait the petals start for home over two seconds, from the heart outward, and every one lands in its own place, slowly (under half a unit a second), with no jump, by then nearly in the shape it has on the head and, most of them, lying as they sit — ' + [inner.toFixed(0), outer.toFixed(0), slowest.toFixed(3), fastest.toFixed(3), jump.toFixed(4), looseLanding.toFixed(3), leftLanding.toFixed(3), leftMean.toFixed(3)]);
    ok(turn < 0.5 && faceTurn < 0.5 && shift < 0.12,
      'no petal is drawn turning about itself, or moved, by more than a little in one step: not flying, not coming home, and not as it lands — ' + [turn, faceTurn, shift].map((v) => v.toFixed(3)));
    // Once landed it stays out a while, then answers to the sound again.
    const landed = K.createRose(K.SEED, N); K.scatter(landed, N, 1, K.rng(2)); run(landed, N, 1, how()); K.gather(landed, N, K.rng(5)); run(landed, N, 9, how());
    const stillOut = landed.attached === N ? Array.from(landed.grown.subarray(KEPT, N)).filter((g) => g > 0).length : -1;
    run(landed, N, 8, how());
    ok(landed.attached === N && stillOut > 0 && landed.open === KEPT && Array.from(landed.grown.subarray(KEPT, N)).every((g) => g === 0),
      'a petal that has landed stays out for a moment, and in silence then folds away like any other — ' + stillOut);
    // The same from the scatter on, drawn turn by turn: nothing spins as it leaves the head.
    const leave = K.createRose(K.SEED, N); run(leave, N, 1, how({ flame: 0.9 }));
    K.dress(sent, leave, N, look);
    const f0 = Array.from(sent.fwd), n0 = Array.from(sent.nrm), p1 = Array.from(sent.pos);
    K.scatter(leave, N, 1, K.rng(1001)); K.stepRose(leave, N, how({ flame: 0.9 })); K.dress(sent, leave, N, look);
    let leaveTurn = 0, leaveShift = 0;
    for (let i = 0; i < N; i++) { const j = K.FIXED + i; leaveTurn = Math.max(leaveTurn, angle(at(sent.fwd, j), at(f0, j)), angle(at(sent.nrm, j), at(n0, j))); leaveShift = Math.max(leaveShift, len(sub(at(sent.pos, j), at(p1, j)))); }
    ok(leaveTurn < 0.5 && leaveShift < 0.2, 'a petal thrown off the head is drawn leaving from where it was, turned as it was — ' + [leaveTurn.toFixed(3), leaveShift.toFixed(3)]);
  }

  // Steps.
  {
    const a = K.createRose(K.SEED, N), b = K.createRose(K.SEED, N), c = K.createRose(K.SEED, N), h = how({ flame: 0.6, bands: oneBand(1, 0.4) });
    K.scatter(a, N, 1, K.rng(9)); K.scatter(b, N, 1, K.rng(9)); K.scatter(c, N, 1, K.rng(9));
    const sa = run(a, N, 4, h, 60), sb = run(b, N, 4, h, 30), sc = run(c, N, 4, h, 165);
    const far = (x, y) => { let m = 0; for (let i = 0; i < N * 3; i++) m = Math.max(m, Math.abs(x.p[i] - y.p[i])); return m; };
    const long = K.createRose(K.SEED, N), took = K.advance(long, N, 1, h), left = long.left;
    const tiny = K.createRose(K.SEED, N), none = K.advance(tiny, N, 0.008, h), one = K.advance(tiny, N, 0.001, h);
    const stopped = K.createRose(K.SEED, N), before = snapshot(stopped), zero = K.advance(stopped, N, 0, h);
    ok(sa === 240 && sb === 240 && snapshot(a) === snapshot(b) && Math.abs(sc - 240) <= 1 && far(a, c) < 0.2 && took === K.STEPS_MAX && left === 0 && none === 0 && one === 1 && near(tiny.left, 0.009 - K.STEP, 1e-12) && zero === 0 && snapshot(stopped) === before,
      'the rose is stepped in sixtieths of a second whatever the frame rate: with a steady sound, the same rose at 30 and 60 frames a second; a step taken when half of it is due, at most six in a frame, and none when no time passes — ' + [sa, sb, sc, far(a, c).toFixed(3)]);
    const realRandom = Math.random; let used = 0; Math.random = () => { used++; return realRandom(); };
    const r1 = K.createRose(K.SEED, N); run(r1, N, 1, h); K.scatter(r1, N, 1, K.rng(3)); run(r1, N, 2, h); K.gather(r1, N, K.rng(3)); run(r1, N, 5, h);
    const sent = blades(), st = stalks(); K.dress(sent, r1, N, { flame: 0.6, kick: 0.3, flash: 0.2, lead: 0.004 }); K.stalk(st, r1, { thorn: 0.26, flame: 0.6 });
    Math.random = realRandom;
    const r2 = K.createRose(K.SEED, N); run(r2, N, 1, h); K.scatter(r2, N, 1, K.rng(3)); run(r2, N, 2, h); K.gather(r2, N, K.rng(3)); run(r2, N, 5, h);
    ok(used === 0 && snapshot(r1) === snapshot(r2) && finite(sent.pos) && finite(sent.fwd) && finite(sent.nrm) && finite(sent.A) && finite(sent.B) && finite(sent.C) && finite(st.pos) && finite(st.nrm) && finite(st.tone),
      'nothing in the rose is left to chance: the same sounds and thumps make the same rose, and every number drawn is a number');
    // Density changed, with petals in the air.
    const d = K.createRose(K.SEED, N); K.scatter(d, N, 1, K.rng(3)); run(d, N, 1, h); K.gather(d, N, K.rng(4)); K.lay(d, 72);
    ok(d.n === 72 && d.kept === 31 && d.attached === 72 && d.flying === 0 && d.homing === false && d.open === 31 && near(d.full, 31 / 72, 1e-7) && Array.from(d.loose.subarray(0, 72)).every((l) => l === 0)
      && Array.from(d.grown.subarray(0, 72)).every((g, i) => g === (i < 31 ? 1 : 0)) && [0, 40, 71].every((i) => at(d.p, i).join() === at(d.base, i).join()),
      'when Density changes the head is laid again: every petal back on it, the right number out');
  }

  // What is drawn: the blades.
  {
    const ro = K.createRose(K.SEED, N); run(ro, N, 1, how({ flame: 0.9 }));
    for (let s = 0; s < 4; s++) K.stepRose(ro, N, how({ flame: 0.9, pulse: 1 }));
    const sent = blades(); K.dress(sent, ro, N, { flame: 0.9, kick: 0.5, flash: 0.8, lead: 0.005 });
    let leaves = true, petals = true, rippling = 0;
    for (let j = 0; j < K.FIXED; j++) if (sent.B[j * 4 + 2] !== 1 || sent.C[j * 4] !== 1 || sent.B[j * 4 + 3] !== 0 || sent.C[j * 4 + 2] !== 0 || !near(len(at(sent.fwd, j)), 1, 1e-6) || !near(len(at(sent.nrm, j)), 1, 1e-6) || Math.abs(dot(at(sent.fwd, j), at(sent.nrm, j))) > 0.2) leaves = false;
    for (let i = 0; i < N; i++) {
      const j = K.FIXED + i, q = j * 4, a = i * 3;
      if (sent.B[q + 2] !== 0 || !near(sent.B[q + 1], i / (N - 1), 1e-6) || sent.C[q + 1] !== i % 8 || sent.C[q + 2] !== 0 || !near(sent.A[q], ro.len[i], 1e-7) || !near(sent.A[q + 1], ro.wid[i], 1e-7)
        || !near(sent.A[q + 2], ro.shape[a], 1e-7) || !near(sent.A[q + 3], ro.shape[a + 1], 1e-7) || !near(sent.B[q], ro.shape[a + 2], 1e-7) || at(sent.pos, j).join() !== at(ro.base, i).join() || at(sent.fwd, j).join() !== at(ro.grow, i).join() || at(sent.nrm, j).join() !== at(ro.face, i).join()
        || !near(sent.B[q + 3], Math.max(ro.flash[i], 0.6 * K.rippleAt(ro, 16 * i / (N - 1)) + 0.35 * 0.5), 1e-6) || !near(sent.C[q], ro.grown[i] * ro.grown[i] * (3 - 2 * ro.grown[i]), 1e-6)) petals = false;
      if (K.rippleAt(ro, 16 * i / (N - 1)) === 1) rippling++;
    }
    let sepals = true;
    for (let j = 0; j < K.SEPALS; j++) { const f = at(sent.fwd, j), b = sub(at(sent.pos, j), ro.c3); if (dot(f, ro.top) >= 0 || !near(sent.A[j * 4], 0.34, 1e-7) || !near(sent.A[j * 4 + 1], 0.14, 1e-7) || len(b) > 0.1 || dot(f, sub(b, ro.top.map((v) => v * dot(b, ro.top)))) <= 0) sepals = false; }
    const leaf = K.leafAt(ro, 0, 0.9), end = K.SEPALS, side = K.SEPALS + 1;
    const droop = [leaf.run[0], leaf.run[1] - K.LEAF_DROOP, leaf.run[2]], dl = len(droop);
    ok(leaves && petals && rippling > 5 && rippling < 20 && sepals && at(sent.pos, end).every((v, k) => near(v, leaf.tip[k], 1e-6)) && at(sent.fwd, end).every((v, k) => near(v, droop[k] / dl, 1e-6)) && near(sent.A[end * 4], 0.60, 1e-7) && near(sent.A[side * 4], 0.44, 1e-7)
      && at(sent.pos, side).every((v, k) => near(v, leaf.root[k] + 0.15 * leaf.run[k], 1e-6)) && dot(at(sent.fwd, side), leaf.side) > 0.5 && dot(at(sent.fwd, side + 1), leaf.side) < -0.5 && near(len(sub(leaf.tip, leaf.root)), 0.24, 1e-6),
      'what is drawn first is five sepals (out from under the head and down) and two leaves of three leaflets on their stalks, then each petal: on the head, at its base, growing its own way, with its own length, width, wrap, cup and roll, its rank, its band, and how grown it is; it flashes with the ripple and the beat');
    // In the air.
    K.scatter(ro, N, 1, K.rng(1001)); run(ro, N, 1, how({ flame: 0.5 }));
    K.dress(sent, ro, N, { flame: 0.5, kick: 0.5, flash: 0.8, lead: 0.005 });
    const zero = blades(); K.dress(zero, ro, N, { flame: 0.5, kick: 0.5, flash: 0.8, lead: 0 });
    let flying = true, ahead = true;
    for (let i = 0; i < N; i++) {
      const j = K.FIXED + i, q = j * 4, a = i * 3, l = ro.loose[i];
      if (!near(sent.C[q + 2], l, 1e-6) || l < 0.99 || !near(sent.A[q], ro.len[i] * (1 - 0.26 * l), 1e-6) || !near(sent.A[q + 1], ro.wid[i] * (1 - 0.26 * l), 1e-6) || !near(sent.A[q + 2], ro.shape[a] + (1.3 - ro.shape[a]) * l, 1e-6) || !near(sent.A[q + 3], ro.shape[a + 1] + (0.13 - ro.shape[a + 1]) * l, 1e-6)
        || !near(sent.B[q], ro.shape[a + 2] + (0.10 - ro.shape[a + 2]) * l, 1e-6) || !near(sent.B[q + 3], Math.max(ro.flash[i], 0.5 * 0.8), 1e-6) || !near(angle(at(sent.fwd, j), at(ro.fwd, i)), Math.abs(0.45 * l * Math.sin(0.6 * ro.psi[i] + i)), 2e-3) || Math.abs(dot(at(sent.fwd, j), at(sent.nrm, j))) > 1e-3) flying = false;
      // Its middle is where the petal is.
      const mid = [0, 1, 2].map((k) => zero.pos[j * 3 + k] + 0.5 * zero.A[q] * l * zero.fwd[j * 3 + k]);
      if (len(sub(mid, at(ro.p, i))) > 1e-5 || !at(sent.pos, j).every((v, k) => near(v - zero.pos[j * 3 + k], 0.005 * ro.v[a + k], 1e-6))) ahead = false;
    }
    ok(flying && ahead, 'a petal in the air is drawn three-quarters of its size and flatter, about its own middle, rocking a little as it tumbles, and as far on its way as the rose is ahead of its steps; it flashes with the thump');
  }

  // What is drawn: the stalk.
  {
    const ro = K.createRose(K.SEED, N); run(ro, N, 1, how({ flame: 1, bands: loudBands(1) }));
    const st = stalks(), index = K.stalkIndex(); K.stalk(st, ro, { thorn: 0.26, flame: 1 });
    const stemPoints = K.STEM_RINGS * K.STEM_AROUND, domePoints = K.DOME_RINGS * K.STEM_AROUND, thornPoints = K.THORNS * K.THORN_RINGS * K.THORN_AROUND;
    let kinds = true, normals = true, most = 0;
    for (let q = 0; q < K.STALK_POINTS; q++) {
      const kind = st.tone[q * 3], want = q < stemPoints ? 0 : q < stemPoints + domePoints ? 1 : q < stemPoints + domePoints + thornPoints ? 2 : 0;
      if (kind !== want) kinds = false;
      if (!near(len(at(st.nrm, q)), 1, 1e-5)) normals = false;
    }
    for (let q = 0; q < index.length; q++) most = Math.max(most, index[q]);
    // No triangle joins a thorn to anything that is not a thorn, so nothing between two kinds is ever coloured as a thorn's tip.
    let straddled = 0;
    for (let q = 0; q < index.length; q += 3) { const ks = [st.tone[index[q] * 3], st.tone[index[q + 1] * 3], st.tone[index[q + 2] * 3]]; if (Math.min(...ks) < 2 && Math.max(...ks) >= 2) straddled++; if (Math.min(...ks) < 1 && Math.max(...ks) > 1) straddled++; }
    const foot = [0, 0, 0]; for (let a = 0; a < K.STEM_AROUND; a++) for (let k = 0; k < 3; k++) foot[k] += st.pos[a * 3 + k] / K.STEM_AROUND;
    let round = true; for (let a = 0; a < K.STEM_AROUND; a++) if (!near(len(sub(at(st.pos, a), foot)), 0.052, 1e-5)) round = false;
    // Each thorn: its tip stands off the stem by about its length, hooked toward the foot, and wears its band.
    let thorns = true, hooked = 0;
    for (let j = 0; j < K.THORNS; j++) {
      const first = stemPoints + domePoints + j * K.THORN_RINGS * K.THORN_AROUND, tipAt = first + (K.THORN_RINGS - 1) * K.THORN_AROUND, t = K.THORN_SPAN[0] + K.THORN_SPAN[1] * (j + 0.5) / K.THORNS, s = K.stemAt(ro, t), L = K.thornLength(ro, j, 0.26);
      const tip = at(st.pos, tipAt), off = sub(tip, s.at), down = dot(off, s.run), away = len(sub(off, s.run.map((v) => v * down)));
      if (!near(away, K.stemRadius(t) * 0.6 + L, 2e-3) || !near(down, -0.38 * L, 2e-3) || st.tone[tipAt * 3 + 2] !== Math.floor(j / 2) || !near(st.tone[tipAt * 3 + 1], 1, 1e-6) || st.tone[first * 3 + 1] !== 0 || L < 0.2) thorns = false;
      if (down < 0) hooked++;
    }
    ok(K.STALK_POINTS === 914 && index.length === 4788 && most === K.STALK_POINTS - 1 && kinds && straddled === 0 && normals && round && near(len(sub(foot, K.FOOT)), 0, 1e-6) && thorns && hooked === K.THORNS,
      'the stalk is one mesh of 914 points: the stem (round, 0.052 at its foot), the heart on its top and numbered next to it, sixteen thorns (each as long as it is out, hooked toward the foot, its tip in its band, joined to nothing else) and the two leaf stalks');
    // No thorns at Thorns 0, and in silence; and the heart stands up when the head is bare.
    const none = stalks(); K.stalk(none, ro, { thorn: 0, flame: 1 });
    let hidden = true;
    for (let j = 0; j < K.THORNS; j++) { const first = stemPoints + domePoints + j * K.THORN_RINGS * K.THORN_AROUND, t = K.THORN_SPAN[0] + K.THORN_SPAN[1] * (j + 0.5) / K.THORNS, s = K.stemAt(ro, t); for (let q = first; q < first + K.THORN_RINGS * K.THORN_AROUND; q++) if (len(sub(at(none.pos, q), s.at)) > K.stemRadius(t) * 0.6 + 1e-3) hidden = false; }
    const domeTop = (o) => { const c = [0, 0, 0], first = stemPoints + (K.DOME_RINGS - 1) * K.STEM_AROUND; for (let a = 0; a < K.STEM_AROUND; a++) for (let k = 0; k < 3; k++) c[k] += o.pos[(first + a) * 3 + k] / K.STEM_AROUND; return dot(sub(c, ro.c3), ro.top); };
    const domeWide = (o) => len(sub(at(o.pos, stemPoints), ro.c3));
    const covered = [domeTop(st), domeWide(st)];
    K.scatter(ro, N, 1, K.rng(1)); K.stalk(st, ro, { thorn: 0.26, flame: 1 });
    ok(hidden && near(covered[0], 0.012, 1e-5) && near(domeTop(st), 0.072, 1e-5) && domeWide(st) > 1.5 * covered[1],
      'at Thorns 0 every thorn is inside the stem; the golden heart lies low and narrow under the petals and stands up when the head is bare');
    // The leaves.
    const calm = K.createRose(K.SEED, N), l0 = K.leafAt(calm, 0, 0), l1 = K.leafAt(calm, 1, 0);
    calm.hist[(calm.at - 1 - Math.floor(K.STEM_WAVE[0] + K.STEM_WAVE[1] * (1 - K.LEAF_AT[0])) + 128) % 64] = 1;
    const lifted = K.leafAt(calm, 0, 0), s0 = K.stemAt(calm, K.LEAF_AT[0]);
    ok(near(len(l0.run), 1, 1e-9) && near(len(l0.up), 1, 1e-9) && Math.abs(dot(l0.run, l0.up)) < 1e-9 && Math.abs(dot(l0.side, l0.run)) < 1e-9 && dot(l0.up, s0.run) > 0.5 && near(len(sub(l0.root, s0.at)), K.stemRadius(K.LEAF_AT[0]) * 0.8, 1e-9)
      && dot(lifted.run, s0.run) > dot(l0.run, s0.run) + 0.1 && dot(l0.run, l1.run) < 0.5 && l1.root[1] > l0.root[1],
      'a leaf grows out from the stem and a little up it, its upper face up the stem; the two grow at different heights and sides, and a leaf lifts as a syllable passes it');
  }

  // What breaking it on purpose slipped past.
  {
    const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const out = [0, 0, 0];
    K.toward(out, 1, 0, 0, 0, 1, 0, 0.3, 0, 0, 1); const part = out.slice();
    K.toward(out, 1, 0, 0, Math.cos(0.2), Math.sin(0.2), 0, 0.3, 0, 0, 1); const all = out.slice();
    K.toward(out, 1, 0, 0, -1, 0, 0, 0.3, 0, 0, 2); const opposite = out.slice();
    K.toward(out, 0, 0, 1, 0.6, 0, 0.8, 0.1, 1, 0, 0); const slant = out.slice();
    ok(near(part[0], Math.cos(0.3)) && near(part[1], Math.sin(0.3)) && part[2] === 0 && near(all[0], Math.cos(0.2)) && near(all[1], Math.sin(0.2)) && near(opposite[0], Math.cos(0.3)) && opposite[1] === 0 && near(opposite[2], Math.sin(0.3))
      && near(len(slant), 1) && near(angle(slant, [0, 0, 1]), 0.1, 1e-9) && slant[0] > 0 && slant[1] === 0,
      'one way is turned toward another by so much at most, all the way when it is nearer than that, and by way of a given side when the two are opposite; it stays a unit long');

    const ro = K.createRose(K.SEED, N), s = K.stemAt(ro, 0.4), leaf = K.leafAt(ro, 0, 0);
    let exact = true, ranged = true;
    const signs = [0, 0];
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1), o = Math.max(0, i - KEPT) / (N - KEPT), q = i * 4, L = (K.LONG[0] + K.LONG[1] * Math.pow(u, K.LONG[2])) * (1 - K.VARY / 2 + K.VARY * ro.vary[q]);
      if (!near(ro.len[i], L, 1e-6) || !near(ro.wid[i], L * (K.WIDE[0] + K.WIDE[1] * u) * (1 - K.VARY / 2 + K.VARY * ro.vary[q + 1]), 1e-6) || !near(ro.turn[i], i * K.GOLDEN + K.TURN0 + K.TURN_VARY * (ro.vary[q + 2] - 0.5), 1e-4)
        || !near(ro.nerve[i], K.NERVE[0] + K.NERVE[1] * Math.pow(o, K.NERVE[2]) + K.NERVE[3] * ro.vary[q + 3], 1e-6)) exact = false;
      signs[ro.spin[i] > 0 ? 0 : 1]++;
      if (Math.abs(ro.spin[i]) < K.SPIN[0] || Math.abs(ro.spin[i]) > K.SPIN[0] + K.SPIN[1] || ro.stayFor[i] < K.STAY[0] || ro.stayFor[i] > K.STAY[0] + K.STAY[1]) ranged = false;
    }
    ok(near(dot(cr(s.run, s.e1), s.e2), 1, 1e-9) && near(dot(cr(leaf.run, leaf.up), leaf.side), 1, 1e-9) && exact && ranged && signs[0] > 15 && signs[1] > 15 && new Set(Array.from(ro.stayFor.subarray(0, N))).size > 40,
      "the stem's two directions across, and a leaf's, are right-handed with the way they run; each petal's length, width, place round the head and nerve are what its rank and its own share of chance make them; petals tumble either way, 3 to 7 radians a second, and stay out 0.7 to 1.6 s — " + signs);

    const f = K.createRose(K.SEED, N); for (let i = 0; i < N; i++) f.state[i] = 1; const none = K.fullOf(f);
    for (let i = 0; i < 28; i++) f.state[i] = 2; const half = K.fullOf(f);
    for (let i = 0; i < N; i++) f.state[i] = 2; const whole = K.fullOf(f);
    const l = [0, 0, 0]; K.leadAt(l, Math.PI / 2 / 0.62, 0); const quietX = l[0]; K.leadAt(l, Math.PI / 2 / 0.62, 1); const loudX = l[0]; K.leadAt(l, 0, 0);
    ok(none === K.FULL_MIN && near(half, 0.5) && whole === 1 && near(quietX, K.AIR_C[0] + K.LEAD[0] * 0.7, 1e-9) && near(loudX, K.AIR_C[0] + K.LEAD[0], 1e-9) && near(l[0], K.AIR_C[0]) && near(l[1], K.AIR_C[1] + K.LEAD_UP + K.LEAD[1] * Math.sin(1)) && near(l[2], K.AIR_C[2] + K.LEAD[2] * 0.7 * Math.sin(0.4)),
      'a bare head counts as three-tenths full and petals on their way home as there already; the lead swings wider the louder it is, seven-tenths as far in silence');

    // Thrown in the air, each way; and a thump as they start for home calls that off.
    const sc = K.createRose(K.SEED, N); K.scatter(sc, N, 1, K.rng(1)); run(sc, N, 0.5, how());
    K.gather(sc, N, K.rng(2)); const was = Array.from(sc.v), homingWas = sc.homing; K.scatter(sc, N, 1, K.rng(4));
    let dx = 0, dy = 0, dz = 0, inBounds = true;
    for (let i = 0; i < N; i++) { const d = sub(at(sc.v, i), at(was, i)); dx += Math.abs(d[0]) / N; dy += Math.abs(d[1]) / N; dz += Math.abs(d[2]) / N; if (Math.abs(d[0]) > K.THROWN[0] / 2 + 1e-5 || d[1] < -K.THROWN[3] * K.THROWN[1] - 1e-5 || d[1] > (1 - K.THROWN[3]) * K.THROWN[1] + 1e-5 || Math.abs(d[2]) > K.THROWN[2] / 2 + 1e-5) inBounds = false; }
    const g2 = K.createRose(K.SEED, N); K.gather(g2, N, K.rng(2)); const g2was = g2.homing; K.lay(g2, N);
    const b2 = K.createRose(K.SEED, N); run(b2, N, 2, how({ flame: 1, kick: 1 }));
    ok(homingWas === true && sc.homing === false && dx > 0.6 && dy > 0.45 && dz > 0.35 && inBounds && g2was === true && g2.homing === false && b2.bloom <= 1 && b2.bloom > 0.99,
      'a petal in the air is thrown each way (up to 1.5 sideways, from 0.66 down to 1.54 up, up to 1 in depth); a thump, or the head laid again, calls off a homecoming; the bloom is never more than wide open — ' + [dx, dy, dz].map((v) => v.toFixed(2)));

    // A folded petal thrown off the head grows as it flies.
    const fresh = K.createRose(K.SEED, N); K.scatter(fresh, N, 1, K.rng(3)); const folded = fresh.grown[N - 1]; run(fresh, N, 1, how());
    ok(folded === 0 && Array.from(fresh.grown.subarray(0, N)).every((g) => g > 0.99), 'a petal that was folded away when the thump came is out within a second of leaving the head');

    // One petal in the air by the head, the rest on it: it steers by nothing but its own place.
    const A1 = K.createRose(K.SEED, N), B1 = K.createRose(K.SEED, N); K.lay(B1, 1);
    for (const r of [A1, B1]) { r.state[0] = 1; r.p[0] = 0.3; r.p[1] = 0.1; r.p[2] = 0.2; r.v[0] = 1; r.v[1] = 0.2; r.v[2] = 0; }
    const before = unit3([1, 0.2, 0]);
    K.stepRose(A1, N, how()); K.stepRose(B1, 1, how());
    const turned = angle(at(A1.v, 0), before);
    ok([0, 1, 2].every((k) => near(A1.v[k], B1.v[k], 1e-6) && near(A1.p[k], B1.p[k], 1e-6)) && turned > 0.01 && turned <= Math.asin((K.TURN[0] / 60) / (1 - K.TURN[0] / 60)) + 1e-6,
      'a loose petal keeps clear of loose petals only, not of those on the head; and it steers by turning, 3.5 radians a second at most in silence — ' + turned.toFixed(4));

    // At the edge of all the air: a petal heading out and along loses its speed outward by degrees, and keeps its speed along the edge.
    const edgeRun = (share, vx, vy) => { const r = K.createRose(K.SEED, N); K.lay(r, 1); r.state[0] = 1; r.p[0] = K.AIR_C[0] + share * K.HARD[0]; r.p[1] = K.AIR_C[1]; r.p[2] = K.AIR_C[2]; r.v[0] = vx; r.v[1] = vy; r.v[2] = 0; K.stepRose(r, 1, how()); return at(r.v, 0); };
    const inside = edgeRun(0.3, 2, 1), halfway = edgeRun(0.9, 2, 1), atEdge = edgeRun(0.999, 2, 1), straight = edgeRun(0.9, 2, 0), inward = edgeRun(0.95, -2, 1);
    ok(inside[0] > 1.6 && halfway[0] > 0.6 && halfway[0] < 1.3 && len(halfway) > 0.75 * len(inside) && halfway[1] > 1.3 * inside[1] && halfway[1] < 1.6 * inside[1] && atEdge[0] < 0.1 && atEdge[0] >= 0 && len(atEdge) > 0.6 * len(inside) && atEdge[1] < 1.6 * inside[1] && straight[0] > 0.6 && straight[0] < 1.3 && len(straight) < 1.4 && inward[0] < -1.5,
      'nine-tenths of the way to the edge of all the air a petal has lost half its speed outward, and at the edge all of it; what it had along the edge is made up toward the speed it had, by half as much again at most, so it turns along the edge; one heading straight out has nothing to make up; one heading in is left alone — ' + [inside, halfway, atEdge, straight].map((v) => v.map((x) => x.toFixed(2)).join(' ')).join(' | '));

    // Its tumbling: by its own spin, more the faster it flies, twice the cruising speed counted at most.
    const tm = K.createRose(K.SEED, N); K.lay(tm, 1);
    tm.state[0] = 1; tm.p[0] = 0; tm.p[1] = -0.2; tm.p[2] = 0; tm.v[0] = 1.3; tm.v[1] = 0; tm.v[2] = 0; tm.fwd[0] = 1; tm.fwd[1] = 0; tm.fwd[2] = 0; tm.nrm[0] = 0; tm.nrm[1] = 1; tm.nrm[2] = 0;
    K.stepRose(tm, 1, how()); const slow = [tm.psi[0], len(at(tm.v, 0)), angle(at(tm.nrm, 0), [0, 1, 0])];
    const tf = K.createRose(K.SEED, N); K.lay(tf, 1);
    tf.state[0] = 1; tf.p[0] = 0; tf.p[1] = -0.2; tf.p[2] = 0; tf.v[0] = 4.5; tf.v[1] = 0; tf.v[2] = 0; tf.fwd[0] = 1; tf.fwd[1] = 0; tf.fwd[2] = 0; tf.nrm[0] = 0; tf.nrm[1] = 1; tf.nrm[2] = 0;
    K.stepRose(tf, 1, how()); const fast = tf.psi[0];
    ok(near(slow[0], K.STEP * tm.spin[0] * (K.TUMBLE[0] + K.TUMBLE[1] * Math.min(slow[1] / K.CRUISE[0], K.TUMBLE[2])), 1e-6) && Math.abs(slow[0]) > 0.04 && near(slow[2], Math.abs(slow[0]), 0.02) && near(fast, K.STEP * tf.spin[0] * (K.TUMBLE[0] + K.TUMBLE[1] * K.TUMBLE[2]), 1e-6),
      'a loose petal tumbles about the way it flies by its own spin, half of it at rest and more the faster it goes, counting no more than twice its cruising speed — ' + [slow[0], fast].map((v) => v.toFixed(4)));

    // Coming home: from far off it makes for a point a little way along the way it will grow.
    const hm = K.createRose(K.SEED, N); hm.state[30] = 2; hm.homing = true; hm.loose[30] = 1; hm.p[90] = -1.5; hm.p[91] = -0.8; hm.p[92] = 0.2;
    K.stepRose(hm, N, how());
    const aim = sub([0, 1, 2].map((k) => hm.base[90 + k] + K.HOME_AHEAD * hm.grow[90 + k]), [-1.5, -0.8, 0.2]);
    ok(hm.state[30] === 2 && angle(at(hm.v, 30), aim) < 1e-3 && near(len(at(hm.v, 30)), K.HOME_FAST * K.HOME_SEEK[0] * K.STEP, 1e-6),
      'a petal coming home from far off makes for a point 0.45 along the way it will grow, at 2.4 a second at least');

    // Landing: what the step it lands in does; and its flash dies away to nothing.
    const one = K.createRose(K.SEED, N), calm = K.createRose(K.SEED, N); run(one, N, 0.5, how()); run(calm, N, 0.5, how());
    one.state[40] = 2; one.homing = true; one.grown[40] = 1; one.loose[40] = 1; one.p[120] = one.base[120] + 0.01; one.p[121] = one.base[121]; one.p[122] = one.base[122];
    K.stepRose(one, N, how()); K.stepRose(calm, N, how());
    const sent = blades(); K.dress(sent, one, N, { flame: 0, kick: 0, flash: 0, lead: 0 });
    const landed = [one.state[40], one.flash[40], one.heard[40], one.headV[1] - calm.headV[1], one.loose[40], sent.B[(K.FIXED + 40) * 4 + 3]];
    run(one, N, 0.25, how()); const dying = one.flash[40]; run(one, N, 3, how());
    ok(landed[0] === 0 && landed[1] === 1 && near(landed[2], K.LANDED_STAY, 1e-6) && near(landed[3], -K.NOD_LAND, 1e-9) && landed[4] === 1 && landed[5] === 1 && near(dying, Math.exp(-1), 0.03) && one.flash[40] === 0 && one.loose[40] === 0,
      'a petal that lands flashes, is counted out for 1.2 s more and nods the head a little; it lands with the shape it had and loses that on the head; its flash is gone in under a second, exactly');

    // One that starts to land almost on its place, turned right round or lying face out: it is never turned at a
    // stroke. It turns as it comes, lands as it is, and finishes turning on the head.
    const lateTurn = (faceOnly) => {
      const r = K.createRose(K.SEED, N); run(r, N, 0.2, how());
      r.state[50] = 2; r.homing = true; r.grown[50] = 1; r.loose[50] = 1;
      for (let k = 0; k < 3; k++) { r.p[150 + k] = r.base[150 + k] + 0.08 * r.grow[150 + k]; r.v[150 + k] = -0.3 * r.grow[150 + k]; r.fwd[150 + k] = (faceOnly ? 1 : -1) * r.grow[150 + k]; r.nrm[150 + k] = -r.face[150 + k]; }
      let most = 0, landedAt = -1, leftAtLanding = 0, doneAt = -1;
      for (let s = 0; s < 120; s++) {
        const f0 = at(r.fwd, 50), n0 = at(r.nrm, 50), was = r.state[50];
        K.stepRose(r, N, how());
        most = Math.max(most, angle(at(r.fwd, 50), f0), angle(at(r.nrm, 50), n0));
        if (was === 2 && r.state[50] === 0) { landedAt = s; leftAtLanding = Math.max(angle(at(r.fwd, 50), at(r.grow, 50)), angle(at(r.nrm, 50), at(r.face, 50))); }
        if (doneAt < 0 && r.state[50] === 0 && at(r.fwd, 50).join() === at(r.grow, 50).join() && at(r.nrm, 50).join() === at(r.face, 50).join()) doneAt = s;
      }
      return { most, landedAt, leftAtLanding, doneAt, loose: r.loose[50] };
    };
    const round = lateTurn(false), faceOut = lateTurn(true);
    ok([round, faceOut].every((r) => r.landedAt > 3 && r.landedAt < 60 && r.most <= K.SEAT_TURN * K.STEP + 0.02 && r.leftAtLanding > 0.5 && r.doneAt > r.landedAt && r.doneAt < r.landedAt + 40 && r.loose === 0),
      'a petal that starts to land almost on its place, turned right round or lying face out, is never turned by more than a fifth of a radian in a step: it lands as it is and finishes turning on the head, where it then lies exactly as it sits — ' + [round, faceOut].map((r) => [r.most.toFixed(3), r.landedAt, r.leftAtLanding.toFixed(2), r.doneAt].join(' ')).join(' | '));

    // A leaf lifts more for a loud voice; and its stalk runs from the stem to where its end leaflet grows.
    const lf = K.createRose(K.SEED, N); run(lf, N, 0.5, how());
    const s0 = K.stemAt(lf, K.LEAF_AT[0]), quiet0 = K.leafAt(lf, 0, 0), loud0 = K.leafAt(lf, 0, 1), st = stalks(); K.stalk(st, lf, { thorn: 0.26, flame: 0 });
    const lastRing = (K.STEM_RINGS + K.DOME_RINGS) * K.STEM_AROUND + K.THORNS * K.THORN_RINGS * K.THORN_AROUND + (K.STALK_RINGS - 1) * K.STALK_AROUND, c = [0, 0, 0];
    for (let a = 0; a < K.STALK_AROUND; a++) for (let k = 0; k < 3; k++) c[k] += st.pos[(lastRing + a) * 3 + k] / K.STALK_AROUND;
    ok(Math.abs(dot(loud0.run, s0.run) - dot(quiet0.run, s0.run)) > 0.02 && len(sub(c, quiet0.tip)) < 1e-6 && len(sub(quiet0.tip, quiet0.root)) > 0.2,
      "a leaf lifts and falls further for a loud voice, and its stalk is drawn from the stem to where its end leaflet grows");
  }

  // What the review found.
  {
    // What a petal is drawn with, step to step, through a thump, the flight, the homecoming and the landing, for
    // many thumps and homecomings: how far it turns, how far it moves beyond its own motion, and how much its
    // size and its shape change. A peak at any moment of the homecoming must not change them at a stroke either.
    const sent = blades(), prev = blades(), look = { flame: 0, kick: 0, flash: 0, lead: 0 };
    const worst = { turn: 0, face: 0, shift: 0, loose: 0, size: 0, landed: 0 };
    const watch = (r, n, steps, h, peakAt = -1, strength = 1, random = null) => {
      K.dress(prev, r, n, look);
      for (let s = 0; s < steps; s++) {
        if (s === peakAt) K.scatter(r, n, strength, random);
        K.stepRose(r, n, h); K.dress(sent, r, n, look);
        for (let i = 0; i < n; i++) {
          const j = K.FIXED + i, q = j * 4, moved = len(at(r.v, i)) * K.STEP;
          worst.turn = Math.max(worst.turn, angle(at(sent.fwd, j), at(prev.fwd, j))); worst.face = Math.max(worst.face, angle(at(sent.nrm, j), at(prev.nrm, j)));
          // Its middle, as it is drawn (its base, and half its length on along the way it grows).
          const mid = [0, 1, 2].map((k) => sent.pos[j * 3 + k] + 0.5 * sent.A[q] * sent.fwd[j * 3 + k]), was = [0, 1, 2].map((k) => prev.pos[j * 3 + k] + 0.5 * prev.A[q] * prev.fwd[j * 3 + k]);
          worst.shift = Math.max(worst.shift, len(sub(mid, was)) - moved);
          worst.loose = Math.max(worst.loose, Math.abs(sent.C[q + 2] - prev.C[q + 2]));
          worst.size = Math.max(worst.size, Math.abs(sent.A[q] - prev.A[q]) / r.len[i]);
        }
        const tmp = Object.assign({}, prev); Object.assign(prev, sent); Object.assign(sent, tmp);
      }
    };
    for (const flame of [0, 0.4, 0.9]) for (let seed = 1; seed <= 6; seed++) {
      const r = K.createRose(K.SEED, N), h = how({ flame }), random = K.rng(1000 + seed);
      run(r, N, 0.5, h);
      watch(r, N, 100 + 17 * seed, h, 0, 1, random);     // the thump, and the flight
      K.gather(r, N, K.rng(seed));
      // On every other run a peak comes at some moment of the homecoming, and they come home again after it.
      if (seed % 2) { watch(r, N, 40 + 22 * seed, h); watch(r, N, 60, h, 0, seed % 3 ? K.JOSTLE : 1, random); K.gather(r, N, K.rng(50 + seed)); }
      watch(r, N, 420, h);
      if (r.attached === N && Array.from(r.loose.subarray(0, N)).every((l) => l === 0)) worst.landed++;
    }
    ok(worst.landed === 18 && worst.turn < 0.3 && worst.face < 0.3 && worst.shift < 0.1 && worst.loose < 0.11 && worst.size < 0.04,
      'through eighteen thumps and homecomings, some with a peak as the petals land, no petal is drawn turned by more than 0.3 of a radian in a step, moved by more than a tenth beyond its own motion, or changed in size by more than a twenty-fifth: its shape eases, whatever it is doing; and every one lands — ' + [worst.landed, worst.turn, worst.face, worst.shift, worst.loose, worst.size].map((v) => (typeof v === 'number' && v % 1 ? v.toFixed(3) : v)));

    // At the edge of the air no petal's velocity changes by much in a step: it is turned, it does not rebound.
    let corner = 0, cornerInside = 0, fastest = 0;
    for (const n of [40, 72]) {
      const r = K.createRose(K.SEED, n), random = K.rng(77), h = how({ flame: 1, bands: loudBands(1) });
      for (let s = 0; s < 900; s++) {
        if (s % 36 === 0) K.scatter(r, n, 1, random);
        const v0 = Array.from(r.v), p0 = Array.from(r.p);
        K.stepRose(r, n, h);
        for (let i = 0; i < n; i++) {
          const q = Math.hypot((p0[i * 3] - K.AIR_C[0]) / K.HARD[0], (p0[i * 3 + 1] - K.AIR_C[1]) / K.HARD[1], (p0[i * 3 + 2] - K.AIR_C[2]) / K.HARD[2]), dv = len(sub(at(r.v, i), at(v0, i)));
          if (s % 36 === 0) continue;   // the step it was thrown in: the throw is a blow, and is tamed at once
          if (q > K.HARD_FROM) corner = Math.max(corner, dv); else cornerInside = Math.max(cornerInside, dv);
          fastest = Math.max(fastest, len(at(r.v, i)));
        }
      }
    }
    ok(corner < 1.5 && cornerInside < 0.6 && fastest <= K.TOP + 1e-6, 'thrown again and again at the loudest, no petal changes its velocity by more than 1.5 in a step once it has been thrown (0.6 away from the edge of the air): it is slowed and turned along the edge, and does not rebound — ' + [corner.toFixed(2), cornerInside.toFixed(2), fastest.toFixed(2)]);

    // A petal that is beyond the edge of all the air, flying or coming home, is put back on it.
    const beyond = (state) => { const r = K.createRose(K.SEED, N); r.state[20] = state; r.homing = state === 2; r.loose[20] = 1; r.p[60] = K.AIR_C[0] - 1.3 * K.HARD[0]; r.p[61] = K.AIR_C[1]; r.p[62] = K.AIR_C[2]; r.v[60] = -0.5; K.stepRose(r, N, how()); return Math.hypot((r.p[60] - K.AIR_C[0]) / K.HARD[0], (r.p[61] - K.AIR_C[1]) / K.HARD[1], (r.p[62] - K.AIR_C[2]) / K.HARD[2]); };
    ok(near(beyond(1), 1, 1e-6) && near(beyond(2), 1, 1e-6), 'a petal beyond the edge of all the air, flying or coming home, is put back on the edge');

    // A thrown petal is light: it slows to its cruising speed in a fraction of a second.
    const fastOne = K.createRose(K.SEED, N); K.lay(fastOne, 1);
    fastOne.state[0] = 1; fastOne.p[0] = -0.5; fastOne.p[1] = -0.1; fastOne.p[2] = 0; fastOne.v[0] = 3; fastOne.v[1] = 0; fastOne.v[2] = 0;
    K.stepRose(fastOne, 1, how()); const first = len(at(fastOne.v, 0)); run(fastOne, 1, 0.4, how()); const later = len(at(fastOne.v, 0));
    const slowOne = K.createRose(K.SEED, N); K.lay(slowOne, 1);
    slowOne.state[0] = 1; slowOne.p[0] = -0.5; slowOne.p[1] = -0.1; slowOne.p[2] = 0; slowOne.v[0] = 0.2; slowOne.v[1] = 0; slowOne.v[2] = 0;
    K.stepRose(slowOne, 1, how()); const picked = len(at(slowOne.v, 0));
    ok(first < 3 - 0.15 && first > 3 - 0.3 && later < 1.7 && picked > 0.2 && picked < 0.2 + 0.09, 'a petal thrown faster than it flies slows to its cruising speed quickly (8 a second), and one slower than it flies picks up more gently (3 a second) — ' + [first, later, picked].map((v) => v.toFixed(3)));

    // A petal far from its place hurries, and one at its place idles.
    const paced = (dx) => { const r = K.createRose(K.SEED, N); K.lay(r, 1); r.off[0] = r.off[1] = r.off[2] = 0; const l = [0, 0, 0]; K.leadAt(l, K.STEP * K.LEAD_RATE[0], 0); r.state[0] = 1; r.p[0] = l[0] + dx; r.p[1] = l[1]; r.p[2] = l[2]; r.v[0] = K.CRUISE[0]; r.v[1] = 0; r.v[2] = 0; K.stepRose(r, 1, how()); return len(at(r.v, 0)); };
    const hurried = paced(-1.1), idled = paced(0);
    ok(near(hurried, K.CRUISE[0] + (K.CRUISE[0] * 1.25 - K.CRUISE[0]) * K.SPEED_RATE * K.STEP, 1e-4) && near(idled, K.CRUISE[0] + (K.CRUISE[0] * 0.8 - K.CRUISE[0]) * K.BRAKE * K.STEP, 1e-4),
      'a loose petal far from its own place flies up to three-tenths faster than its cruising speed, and one at its place a fifth slower — ' + [hurried, idled].map((v) => v.toFixed(4)));

    // Each has its own place by the lead: one whose place is to the right turns right, one whose place is to the left turns left.
    const sided = (ox) => { const r = K.createRose(K.SEED, N); K.lay(r, 1); r.off[0] = ox; r.off[1] = r.off[2] = 0; const l = [0, 0, 0]; K.leadAt(l, K.STEP * K.LEAD_RATE[0], 0); r.state[0] = 1; r.p[0] = l[0]; r.p[1] = l[1]; r.p[2] = l[2]; r.v[0] = 0; r.v[1] = K.CRUISE[0]; r.v[2] = 0; K.stepRose(r, 1, how()); return r.v[0]; };
    ok(sided(1) > 0.03 && sided(-1) < -0.03 && near(sided(1), -sided(-1), 1e-4), 'each petal has its own place by the lead, to one side of it or the other, and turns toward it — ' + sided(1).toFixed(4));

    // A petal that passes its place too fast to land flies on, and lands when it comes back slowly.
    const pass = K.createRose(K.SEED, N); run(pass, N, 0.2, how());
    pass.state[45] = 2; pass.homing = true; pass.grown[45] = 1; pass.loose[45] = 1;
    for (let k = 0; k < 3; k++) { pass.p[135 + k] = pass.base[135 + k] + 0.02 * pass.out[135 + k]; pass.v[135 + k] = -2 * pass.out[135 + k]; }
    K.stepRose(pass, N, how()); const flewOn = pass.state[45];
    let landedAt = -1, landedSpeed = 9;
    for (let s = 0; s < 240 && landedAt < 0; s++) { const sp = len(at(pass.v, 45)); K.stepRose(pass, N, how()); if (pass.state[45] === 0) { landedAt = s; landedSpeed = sp; } }
    ok(flewOn === 2 && landedAt > 3 && landedSpeed < K.CATCH, 'a petal that passes its place faster than 0.6 a second does not stop dead there: it flies on, comes round and lands when it is slow — ' + [landedAt, landedSpeed.toFixed(3)]);

    // Lines of the shaders that a picture of the whole rose is not told apart by. The render suite draws one blade and strips of the
    // stalk alone to measure them; they are held here too, so that a change to one shows in this suite, which takes seconds.
    ok(K.BLADE_VERT.includes('p.z -= iA.w * iA.x * sin(3.14159 * pow(t, 0.8));') && K.BLADE_VERT.includes('p.y -= 0.5 * iB.x * iA.x * tip;') && K.STALK_FRAG.includes('float heart = vTone.x > 1.5 ? 0.0 : smoothstep(0.35, 0.65, vTone.x);') && K.STALK_FRAG.includes('spec * 0.18 * (1.0 - 0.85 * heart)')
      && K.STALK_FRAG.includes('if (vTone.x > 1.5) c = mix(uGreen * 0.8, mix(pal(vTone.z / 8.0), vec3(1.0), 0.22), pow(vTone.y, 1.2));'),
      'a petal is cupped along its length, and is a little shorter for its tip rolling back; the heart is gold where the stalk is numbered 1 and green toward the stem, with next to no shine; a thorn (numbered 2) wears its band at its tip');

    // A petal's own place: to either side of the lead, above or below it, and inside the air however far that is.
    const pl = K.createRose(K.SEED, N), spot = [0, 0, 0];
    let sidesSeen = [0, 0, 0, 0, 0, 0], placed = true;
    for (let i = 0; i < K.PETALS_MAX; i++) for (let c = 0; c < 3; c++) { if (pl.off[i * 3 + c] < -0.5) sidesSeen[c * 2]++; if (pl.off[i * 3 + c] > 0.5) sidesSeen[c * 2 + 1]++; if (Math.abs(pl.off[i * 3 + c]) > 1) placed = false; }
    pl.off[0] = 0.5; pl.off[1] = -0.5; pl.off[2] = 0.5; K.placeOf(spot, pl, 0);
    const plain = [0, 1, 2].every((k) => near(spot[k], pl.lead[k] + K.PLACE[k] * pl.off[k], 1e-6));
    K.leadAt(pl.lead, Math.PI / 2 / 0.62, 1); pl.off[0] = 1; pl.off[1] = 1; pl.off[2] = 1; K.placeOf(spot, pl, 0);
    const raw = [0, 1, 2].map((k) => pl.lead[k] + K.PLACE[k] - K.AIR_C[k]), rawRoom = Math.hypot(raw[0] / K.AIR[0], raw[1] / K.AIR[1], raw[2] / K.AIR[2]);
    const room = Math.hypot((spot[0] - K.AIR_C[0]) / K.AIR[0], (spot[1] - K.AIR_C[1]) / K.AIR[1], (spot[2] - K.AIR_C[2]) / K.AIR[2]);
    ok(placed && sidesSeen.every((c) => c > 8) && plain && rawRoom > 1 && near(room, K.ROOM, 1e-6) && [0, 1, 2].every((k) => near((spot[k] - K.AIR_C[k]) * rawRoom, raw[k] * K.ROOM, 1e-6)),
      "a petal's own place is by the lead, to either side of it, above or below, nearer or further; a place that would be outside the air is drawn in toward the middle of the air until it is inside — " + sidesSeen + ' ' + rawRoom.toFixed(2));

    // It takes the way the petals near it fly: one flying straight for its place, with another beside it flying across, turns that way.
    const withNeighbour = (there) => {
      const r = K.createRose(K.SEED, N); K.lay(r, 2); r.off.fill(0, 0, 6);
      const l = [0, 0, 0]; K.leadAt(l, K.STEP * K.LEAD_RATE[0], 0);
      r.state[0] = 1; r.p[0] = l[0] - 0.6; r.p[1] = l[1]; r.p[2] = l[2]; r.v[0] = K.CRUISE[0]; r.v[1] = 0; r.v[2] = 0;
      r.state[1] = there ? 1 : 0; r.p[3] = l[0] - 0.6; r.p[4] = l[1] - 0.7; r.p[5] = l[2]; r.v[3] = 0; r.v[4] = K.CRUISE[0]; r.v[5] = 0;
      K.stepRose(r, 2, how()); return at(r.v, 0);
    };
    const led = withNeighbour(true), alone = withNeighbour(false);
    ok(Math.abs(alone[1]) < 1e-4 && led[1] > 0.02 && near(Math.atan2(led[1], led[0]), Math.atan2(K.TURN[0] * K.STEP * K.ALIGN / Math.hypot(1 - K.ALIGN, K.ALIGN), 1 - K.TURN[0] * K.STEP * (1 - (1 - K.ALIGN) / Math.hypot(1 - K.ALIGN, K.ALIGN))), 1e-4),
      'a loose petal takes the way the petals near it fly, seven-tenths of it: flying straight for its place with another beside it flying across, it turns that way — ' + [alone[1], led[1]].map((v) => v.toFixed(4)));

    // The files.
    const pages = [];
    for (const p of ['300x220', '1440x1080', '1920x1080']) {
      const html = await readFile(resolve(__dirname, 'overlay/mic-visualizers-' + p + '.html'), 'utf8');
      const pos = html.indexOf('src="rose.js"');
      pages.push(pos > html.indexOf('src="boids.js"') && pos > html.indexOf('src="scene-kit.js"') && html.includes('src="helix.js"') && pos < html.indexOf('src="factories/') && html.split('src="rose.js"').length === 2 && html.split('src="factories/rose.js"').length === 2);
    }
    const factory = await readFile(resolve(__dirname, 'overlay/factories/rose.js'), 'utf8'), source = await readFile(resolve(__dirname, 'overlay/rose.js'), 'utf8');
    ok(pages.every(Boolean) && /VIZ_FACTORIES\['rose'\] = TimbreScene\.factory\(\(\) => TimbreRose\.definition\(\)\);/.test(factory) && !/WebGLRenderer|fetch\(|\.stl/.test(factory) && !/Math\.random/.test(source) && !/fetch\(|\.stl|cfgSTLObject/.test(source),
      "all three overlay pages load rose.js once, after the scene kit and boids.js and before the factories, and the shatter machine it uses; the effect is the kit's factory around the rose's definition, with no renderer or model file of its own; and the rose takes no numbers from Math.random");
  }

  // The blade's grid, and the camera.
  {
    const g = K.bladeGrid();
    let rows = true, wound = true, last = -1;
    for (let j = 0; j <= K.NT; j++) { const t = g.points[j * (K.NS + 1) * 3 + 1]; if (!(t > last)) rows = false; if (j > 1 && !(t - last < last - g.points[(j - 2) * (K.NS + 1) * 3 + 1])) rows = false; last = t; }
    for (let t = 0; t < g.index.length; t += 3) {
      const a = g.index[t] * 3, b = g.index[t + 1] * 3, c = g.index[t + 2] * 3;
      if ((g.points[b] - g.points[a]) * (g.points[c + 1] - g.points[a + 1]) - (g.points[b + 1] - g.points[a + 1]) * (g.points[c] - g.points[a]) <= 0) wound = false;
    }
    ok(g.points.length === 9 * 15 * 3 && g.index.length === 8 * 14 * 6 && rows && wound && g.points[0] === -1 && g.points[1] === 0 && g.points[8 * 3] === 1 && g.points[(14 * 9) * 3 + 1] === 1 && near(g.points[9 * 3 + 1], 1 - Math.pow(13 / 14, 1.9), 1e-7),
      'a blade is a grid of 9 by 15 points, across from -1 to 1 and along from its base to its tip, its rows closer together toward the tip, every triangle facing the same way');
    ok(K.swayFor(0) === 0 && near(K.swayFor(50), 0.14) && near(K.swayFor(100), 0.28) && near(K.swayFor(undefined), 0.14) && K.orbitAt(0, 50) === 0 && near(K.orbitAt(Math.PI / 2 / 0.13, 50), 0.14) && near(K.orbitAt(3, 100), 0.28 * Math.sin(0.39)),
      'the camera sways 0.14 radians each way at Camera drift 50, not at all at 0 and twice as far at 100, once in about 48 seconds');
  }
}

console.log('\n[26] christmas tree');
await import('./overlay/scene-kit.js');
await import('./overlay/christmas-tree.js');
{
  const K = globalThis.TimbreTree, KIT = globalThis.TimbreScene;
  const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
  const T6 = K.TIERS.length, TAU = Math.PI * 2;
  const quiet = new Float32Array(8);
  const loudBands = (v) => new Float32Array(8).fill(v);
  const oneBand = (b, v) => { const a = new Float32Array(8); a[b] = v; return a; };
  const finite = (a) => { for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return false; return true; };
  const how = (over = {}) => Object.assign({ flame: 0, kick: 0, burst: 0, bands: quiet, snow: 1 }, over);
  const mk = (n = 96) => K.createTree(K.SEED, n);
  const run = (tr, secs, h, fps = 60) => { let steps = 0; for (let i = 0, m = Math.round(secs * fps); i < m; i++) steps += K.advance(tr, 1 / fps, h); return steps; };
  const steps = (tr, n, h) => { for (let i = 0; i < n; i++) K.stepTree(tr, h); };
  const sheet = () => ({ bright: new Float32Array(K.LIGHTS_MAX), bulb: new Float32Array(K.LIGHTS_MAX * 3), halo: new Float32Array(K.LIGHTS_MAX * 3), haloSize: new Float32Array(K.LIGHTS_MAX),
    ball: new Float32Array(K.BAUBLES * 3), ballCol: new Float32Array(K.BAUBLES * 3), ballHow: new Float32Array(K.BAUBLES * 2), cap: new Float32Array(T6 * 2), flake: new Float32Array(K.FLAKES * 4),
    star: new Float32Array(8), string: new Float32Array(4) });
  // A palette for the checks: light k of the string's five is (k + 1) / 10 red and half that green; bauble k of seven is (k + 1) / 10 blue.
  const look = (over = {}) => { const pal = new Float32Array(K.HUES[0] * 3), balls = new Float32Array(K.HUES[1] * 3); for (let k = 0; k < K.HUES[0]; k++) { pal[k * 3] = (k + 1) / 10; pal[k * 3 + 1] = (k + 1) / 20; } for (let k = 0; k < K.HUES[1]; k++) balls[k * 3 + 2] = (k + 1) / 10; return Object.assign({ pal, balls, kick: 0, glow: 1 }, over); };
  const snapshot = (tr) => [tr.hist, tr.lean, tr.snow, tr.wait, tr.level, tr.swing, tr.swingV, tr.glow, tr.flake, tr.flakeV, tr.on, [tr.star, tr.time, tr.left, tr.flash, tr.lying, tr.histAt, tr.falling, tr.clumps]].map((a) => Array.from(a).join()).join('|');
  const clumpsOn = (tr) => { let c = 0; for (let i = K.FALLING_MAX; i < K.FLAKES; i++) c += tr.on[i]; return c; };
  const fallingOn = (tr) => { let c = 0; for (let i = 0; i < K.FALLING_MAX; i++) c += tr.on[i]; return c; };
  const fl = Math.fround;

  // CONSTANTS

  // THE SHAPE
  {
    let rims = true, tips = true, tops = true, turned = true;
    for (let i = 0; i < T6; i++) {
      const [R, h, base] = K.TIERS[i], y = K.rimY(i);
      if (!near(y, base - K.DROOP * h)) rims = false;
      for (let a = 0; a < 64; a++) {
        const phi = (a / 64) * TAU;
        if (!near(K.tierR(i, y, phi), K.rimR(i, phi), 1e-9)) rims = false;
        if (!near(K.rimR(i, phi), R * (1 + K.SCALLOP * Math.cos(K.LOBES * (phi + i * K.TURN))))) rims = false;
        if (K.tierR(i, base + h, phi) !== 0 || K.tierR(i, base + h + 0.01, phi) !== 0 || K.tierR(i, y - 0.01, phi) !== 0) tops = false;
        if (!(K.tierR(i, base + 0.5 * h, phi) > 0 && K.tierR(i, base + 0.5 * h, phi) < K.tierR(i, base, phi) && K.tierR(i, base, phi) < K.rimR(i, phi) * 1.0001)) tops = false;
      }
      // Seven tips, the first of them turned back by the tier's turn.
      for (let j = 0; j < K.LOBES; j++) if (!near(K.rimR(i, (TAU * j) / K.LOBES - i * K.TURN), R * (1 + K.SCALLOP))) tips = false;
      if (i && !(K.TIERS[i][0] < K.TIERS[i - 1][0] && K.TIERS[i][2] > K.TIERS[i - 1][2] && K.rimY(i) < K.TIERS[i - 1][2] + K.TIERS[i - 1][1])) turned = false;
    }
    ok(rims && tips && tops && turned, 'a tier is a skirt of boughs: nothing at its top, widening down to a rim of seven tips a fifth of its height below its base; each tier is narrower and higher than the one below, and hangs over it');

    {
      const tMid = (-1 + Math.sqrt(1 + 4 * K.DROOP)) / (2 * K.DROOP), [R0, , base0] = K.TIERS[0];
      const y = (K.rimY(0) + K.rimY(1)) / 2, phi = 0.3, boughs = Math.max(...K.TIERS.map((t, i) => K.tierR(i, y, phi))), line = (K.rimR(0, phi) + K.rimR(1, phi)) / 2;
      ok(near(K.tierR(0, base0, 0), R0 * tMid * (1 + K.SCALLOP * tMid), 1e-12) && near(K.tierR(0, base0, Math.PI / K.LOBES), R0 * tMid * (1 - K.SCALLOP * tMid), 1e-12) && boughs < K.LINE * line && K.surfaceR(y, phi) === K.LINE * line,
        'the tips of a tier stand out less the higher up the tier, in proportion; halfway between two rims, where the boughs are further in, the tree reaches exactly 0.92 of the line from rim to rim');
    }
    let covers = true, hangs = true, over = true;
    for (let a = 0; a < 48; a++) {
      const phi = (a / 48) * TAU;
      for (let y = 0.34; y < 2.75; y += 0.013) {
        const r = K.surfaceR(y, phi);
        for (let i = 0; i < T6; i++) if (r < K.tierR(i, y, phi) - 1e-12) covers = false;
        for (let i = 0; i < T6 - 1; i++) { const lo = K.rimY(i), hi = K.rimY(i + 1); if (y >= lo && y <= hi) { const f = (y - lo) / (hi - lo); if (r < K.LINE * (K.rimR(i, phi) * (1 - f) + K.rimR(i + 1, phi) * f) - 1e-12) hangs = false; } }
        if (y > K.rimY(T6 - 1)) { let most = 0; for (let i = 0; i < T6; i++) most = Math.max(most, K.tierR(i, y, phi)); if (r !== most) over = false; }
      }
    }
    ok(covers && hangs && over && K.surfaceR(3.2, 1) === 0 && K.surfaceR(0.1, 1) === 0,
      'how far out the tree reaches: as far as its boughs, and between one rim and the next at least 0.92 of the line from rim to rim, where a string hangs; above the highest rim it is the boughs alone, and beyond the tree nothing');
  }
  {
    const g = K.garland(96), g2 = K.garland(48), g3 = K.garland(128);
    let onSurface = true, down = true, even = true, round = true, lastPhi = null, turns = 0, least = 9, most = 0;
    for (let j = 0; j < 96; j++) {
      const x = g.at[j * 3], y = g.at[j * 3 + 1], z = g.at[j * 3 + 2], phi = Math.atan2(z, x), r = Math.hypot(x, z);
      if (!near(r, K.surfaceR(y, phi) + K.PROUD, 2e-3)) onSurface = false;
      if (j && !(y < g.at[(j - 1) * 3 + 1] && g.u[j] > g.u[j - 1])) down = false;
      if (j) { const d = Math.hypot(x - g.at[(j - 1) * 3], y - g.at[(j - 1) * 3 + 1], z - g.at[(j - 1) * 3 + 2]); if (d < least) least = d; if (d > most) most = d; let dp = phi - lastPhi; while (dp < -Math.PI) dp += TAU; while (dp > Math.PI) dp -= TAU; if (!(dp > 0)) round = false; turns += dp / TAU; }
      lastPhi = phi;
    }
    if (!(most < 1.25 * g.length / 96 && least > 0.5 * g.length / 96)) even = false;
    ok(g.n === 96 && g.at.length === 96 * 3 && g.u.length === 96 && onSurface && down && even && round && near(g.u[0], 0.5 / 96, 1e-3) && near(g.u[95], 95.5 / 96, 1e-3) && g.at[1] < K.STRING[0] && g.at[1] > K.STRING[0] - 0.08 && g.at[95 * 3 + 1] > K.STRING[1] && g.at[95 * 3 + 1] < K.STRING[1] + 0.05
      && near(turns, (K.STRING[0] - K.STRING[1]) / K.DROP * (95 / 96), 0.12) && g.length > 15 && g.length < 26,
      'the string of lights winds down the tree, 0.42 lower each turn, a little proud of its surface; its lights are evenly along it, the first under the star and the last at the lowest boughs');
    ok(g2.n === 48 && g3.n === 128 && near(g2.length, g.length, 1e-9) && near(g3.length, g.length, 1e-9) && g2.at[1] < g.at[1] && g3.at[1] > g.at[1] && Array.from(g.wire).join() === Array.from(g2.wire).join() && g.wire.length % 3 === 0 && g.wire.length / 3 === Math.floor(K.STRING_STEPS / K.WIRE_EVERY) + 1
      && near(g.wire[1], K.STRING[0], 1e-6) && near(g.wire[g.wire.length - 2], K.STRING[1], 1e-6) && finite(g.wire) && finite(g3.at),
      'however many lights there are the string is the same string: the same length and the same wire, from top to bottom');

    const sp = K.baubleSpots();
    let under = true, smaller = true; const hues = new Set(), perTier = new Array(T6).fill(0);
    for (let b = 0; b < K.BAUBLES; b++) {
      const i = sp.tier[b]; perTier[i]++; hues.add(sp.hue[b]);
      if (!near(K.rimR(i, sp.phi[b]), K.TIERS[i][0] * (1 + K.SCALLOP), 1e-6)) under = false;
      if (!near(sp.r[b], K.BAUBLE_R[0] - K.BAUBLE_R[1] * i, 1e-7)) smaller = false;
      if (!(sp.hue[b] >= 0 && sp.hue[b] < K.HUES[1])) under = false;
    }
    ok(K.BAUBLES === 42 && sp.tier.length === 42 && perTier.every((c) => c === 7) && under && smaller && hues.size === 7, 'there are 42 baubles, seven to a tier, one under the tip of every bough, smaller toward the top, in seven colours');
  }
  {
    const b = K.tierGrid(false), s = K.tierGrid(true), [M, N] = K.TIER_GRID;
    let apex = true, rim = true, lies = true, wound = b.index.length === M * N * 6;
    for (let i = 0; i <= N; i++) {
      const top = i * 3, edge = (M * (N + 1) + i) * 3, phi = (i / N) * TAU;
      if (!(b.points[top] === 0 && near(b.points[top + 1], 1, 1e-7) && b.points[top + 2] === 0)) apex = false;
      if (!(near(b.points[edge + 1], -K.DROOP, 1e-6) && near(Math.hypot(b.points[edge], b.points[edge + 2]), 1 + K.SCALLOP * Math.cos(K.LOBES * phi), 1e-6))) rim = false;
      // The snow ends short of the rim, stands a little proud, and reaches an uneven way down.
      const sy = s.points[edge + 1], sr = Math.hypot(s.points[edge], s.points[edge + 2]), down = K.SNOW_LIES[0] + K.SNOW_LIES[1] * Math.cos(K.LOBES * phi + 1.3) + K.SNOW_LIES[2] * Math.cos(3 * phi);
      if (!(near(sy, 1 - down - K.DROOP * down * down + K.SNOW_PROUD[1], 1e-6) && near(sr, down * (1 + K.SCALLOP * down * Math.cos(K.LOBES * phi)) * K.SNOW_PROUD[0], 1e-6) && down < 0.9 && down > 0.55)) lies = false;
    }
    ok(b.points.length === (M + 1) * (N + 1) * 3 && s.points.length === b.points.length && s.index.length === b.index.length && apex && rim && lies && wound,
      'a tier of boughs is a grid from its top to its drooping rim of seven tips; the snow on it is the same skirt, a little proud of the boughs, ending an uneven way short of the rim');

    const d = K.driftGrid();
    let inside = true;
    for (let i = 0; i < d.points.length - 73 * 3; i += 3) if (!near(d.points[i + 1], K.driftHeight(d.points[i], d.points[i + 2]), 1e-4)) inside = false;
    for (let i = d.points.length - 73 * 3; i < d.points.length; i += 3) if (!(d.points[i + 1] < 1e-6 && near(Math.hypot(d.points[i] / K.DRIFT[0], d.points[i + 2] / K.DRIFT[2]), 1, 1e-6))) inside = false;
    ok(K.driftHeight(0, 0) > 0.19 && K.driftHeight(0, 0) < 0.25 && K.driftHeight(K.DRIFT[0], 0) === 0 && K.driftHeight(0, K.DRIFT[2] + 0.01) === 0 && K.driftHeight(9, 9) === 0 && K.driftHeight(1.2, 0.5) > 0 && K.driftHeight(1.2, 0.5) < K.driftHeight(0, 0)
      && inside && d.points.length === 27 * 73 * 3 && d.index.length === 26 * 72 * 6 && near(K.FOOT, K.driftHeight(0, -K.DRIFT_Z) - K.SINK) && K.FOOT > 0.15 && K.FOOT < 0.22
      && K.snowAt(0, K.DRIFT_Z) === K.driftHeight(0, 0) && K.snowAt(9, 9) === K.FLOOR && K.snowAt(K.DRIFT[0] - 0.01, K.DRIFT_Z) === K.FLOOR,
      'the drift is a low uneven dome of snow, nothing beyond its rim; the tree stands in it, a little sunk; falling snow lands on it, or beyond it a little above the unseen ground');

    const st = K.starPoints();
    let out = true, tipsAt = 0, innerAt = 0;
    for (let t = 0; t < st.length; t += 9) {
      const A = [st[t], st[t + 1], st[t + 2]], B = [st[t + 3], st[t + 4], st[t + 5]], C = [st[t + 6], st[t + 7], st[t + 8]];
      const nz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
      const mid = (A[2] + B[2] + C[2]) / 3;
      if (!(nz * mid > 0)) out = false;
    }
    for (let v = 0; v < st.length; v += 3) { const r = Math.hypot(st[v], st[v + 1]); if (st[v + 2] === 0 && near(r, K.STAR[0], 1e-6)) tipsAt++; if (st[v + 2] === 0 && near(r, K.STAR[1], 1e-6)) innerAt++; }
    let up = false;
    for (let v = 0; v < st.length; v += 3) if (near(st[v], 0, 1e-6) && near(st[v + 1], K.STAR[0], 1e-6)) up = true;
    ok(st.length === 20 * 9 && out && tipsAt === 20 && innerAt === 20 && up, 'the star has five points, one straight up, and a raised middle front and back: twenty faces, each facing outward');
  }

  // THE SETTINGS AND THE SOUND
  ok(K.countFor(0) === 48 && K.countFor(60) === 96 && K.countFor(100) === 128 && K.countFor(50) === 88 && K.countFor(undefined) === 96 && K.countFor(NaN) === 96 && K.countFor(-5) === 48 && K.countFor(400) === 128 && K.countFor(37) === 78,
    'Light density is how many lights are on the string: 48 to 128, 96 at its default of 60');
  ok(K.glowFor(0) === 0 && K.glowFor(50) === 1 && K.glowFor(100) === 2 && K.glowFor(undefined) === 1 && K.snowFor(0) === 0 && K.snowFor(50) === 1 && K.snowFor(100) === 2 && K.snowFor('x') === 1 && K.snowFor(250) === 2,
    'Star glow and Snowfall are shares of their defaults: none at 0, twice at 100');
  {
    const bins = new Uint8Array(32); bins[3] = 128; bins[5] = 255;
    let turns = true, mostIdle = 0;
    for (let b = 0; b < 8; b++) { let zero = 0, some = 0; for (let t = 0; t < 40; t += 0.05) { const v = K.idle(b, t); if (v === 0) zero++; else some++; if (v > mostIdle) mostIdle = v; if (v < 0) turns = false; } if (!(zero > some && some > 100)) turns = false; }
    // The swell climbs the tree: a band is at its most a little after the one below it.
    const peakAt = (b) => { let best = -1, at = 0; for (let t = 0; t < 2 * Math.PI / 0.5; t += 0.01) { const v = K.idle(b, t); if (v > best) { best = v; at = t; } } return at; };
    ok(near(K.loudness(bins, 3, 1), 128 / 255) && K.loudness(bins, 5, 2) === 1 && near(K.loudness(bins, 3, 0.5), 64 / 255) && K.loudness(bins, 40, 1) === 0 && K.loudness(null, 0, 1) === 0
      && turns && near(mostIdle, 0.35, 1e-3) && near(peakAt(1) - peakAt(0), 0.9 / 0.5, 0.02),
      'a band is as loud as its bin, times Gain, at most 1; with the mic off the bands swell in turn up the tree, each still for most of the time');
    const lv = (bands) => Array.from({ length: T6 }, (v, i) => K.levelOf(bands, i));
    const flat = lv(loudBands(0.4)), low = lv(oneBand(0, 1)), high = lv(oneBand(7, 1)), mid = lv(oneBand(3, 1));
    ok(flat.every((v) => near(v, 0.4, 1e-7)) && near(low[0], 5 / 6, 1e-6) && low[1] === 0 && low.slice(2).every((v) => v === 0) && near(high[5], 5 / 6, 1e-6) && high.slice(0, 4).every((v) => v === 0)
      && near(mid[2], 1 - Math.abs(2.5 * 8 / 6 - 0.5 - 3), 1e-6) && mid[3] === 0 && mid[1] === 0 && mid[0] === 0 && mid[5] === 0 && near(K.levelOf(oneBand(1, 1), 0), 1 / 6, 1e-6) && near(K.levelOf(oneBand(1, 1), 1), 0.5, 1e-6),
      'each tier listens to its own part of the eight bands, the lowest at the foot and the highest under the star, sliding from one band to the next between tiers');
  }

  // THE TREE'S STATE
  {
    const tr = mk(), again = mk();
    let spread = true, lowest = 9, highest = 0, inAir = true;
    for (let i = 0; i < K.FALLING_MAX; i++) if (tr.on[i]) { const x = tr.flake[i * 4], y = tr.flake[i * 4 + 1], z = tr.flake[i * 4 + 2]; if (y < lowest) lowest = y; if (y > highest) highest = y; if (!(Math.abs(x) <= K.SKY[0] && z >= K.SKY[3] && z <= K.SKY[4] && tr.flake[i * 4 + 3] >= K.FLAKE[0] && tr.flake[i * 4 + 3] <= K.FLAKE[0] + K.FLAKE[1])) inAir = false; }
    if (!(lowest < 1.2 && highest > 2.8)) spread = false;
    let own = true;
    for (let j = 0; j < K.LIGHTS_MAX; j++) if (!(tr.twinkle[j * 3] >= K.TWINKLE_RATE[0] && tr.twinkle[j * 3] <= K.TWINKLE_RATE[0] + K.TWINKLE_RATE[1] && tr.twinkle[j * 3 + 1] >= 0 && tr.twinkle[j * 3 + 1] < TAU && tr.twinkle[j * 3 + 2] >= 0 && tr.twinkle[j * 3 + 2] < 1)) own = false;
    let signs = 0; for (let b = 0; b < K.BAUBLES; b++) { if (Math.abs(tr.sign[b]) !== 1) own = false; signs += tr.sign[b]; }
    ok(tr.n === 96 && tr.string.n === 96 && Array.from(tr.snow).every((v) => v === 1) && tr.lying === 1 && Array.from(tr.lean).every((v) => v === 0) && tr.star === 0 && tr.flash === 0 && tr.time === 0 && tr.left === 0
      && fallingOn(tr) === K.SNOWING[0] && tr.falling === K.SNOWING[0] && clumpsOn(tr) === 0 && spread && inAir && own && Math.abs(signs) < K.BAUBLES && Array.from(tr.hist).every((v) => v === 0) && snapshot(tr) === snapshot(again) && finite(tr.flake),
      'a new tree stands still with the snow lying on every tier, 55 flakes already in the air at every height, and each light and bauble with its own ways; the same tree every time');

    const t60 = mk(), t30 = mk(), h = how({ flame: 0.5, bands: loudBands(0.5) });
    const s60 = run(t60, 2, h, 60), s30 = run(t30, 2, h, 30), slow = mk(), early = mk();
    const big = K.advance(slow, 0.5, h), afterBig = slow.left, one = K.advance(early, 0.8 / 60, h), two = K.advance(early, 0.8 / 60, h);
    ok(s60 === 120 && s30 === 120 && snapshot(t60) === snapshot(t30) && near(t60.time, 2, 1e-9) && big === K.STEPS_MAX && afterBig === 0 && one === 1 && two === 1 && near(early.left, 1.6 / 60 - 2 / 60, 1e-12),
      'the tree is stepped 60 times a second whatever the frame rate, a step being taken once half of it is due: the same tree at 30 and at 60 frames a second; a frame of half a second is six steps and the rest is let go');
  }
  {
    const tr = mk();
    for (let i = 1; i <= 10; i++) K.stepTree(tr, how({ flame: i / 10 }));
    const up = mk(); steps(up, 6, how({ flame: 1 })); const upTo = up.star; steps(up, 30, how());
    ok(near(K.heard(tr, 0), fl(1.0), 1e-7) && near(K.heard(tr, 3), fl(0.7), 1e-7) && near(K.heard(tr, 2.5), (fl(0.7) + fl(0.8)) / 2, 1e-7) && K.heard(tr, 50) === 0 && K.heard(tr, -4) === K.heard(tr, 0) && K.heard(tr, 9999) === K.heard(tr, K.HISTORY - 2)
      && near(upTo, 1 - Math.exp(-K.STAR_RATE[0] * 6 / 60), 1e-9) && near(up.star, upTo * Math.exp(-K.STAR_RATE[1] * 30 / 60), 1e-9) && near(tr.time, 10 / 60, 1e-12),
      'the tree keeps what the star heard at each of its last steps, and can say what it heard any number of steps ago, between two steps too; the star itself rises to the voice quickly and falls slowly');
    const still = mk(); steps(still, 10, how({ flame: 1 })); steps(still, 600, how());
    ok(still.star === 0 && K.heard(still, 0) === 0, 'in silence the star comes to rest');
  }
  {
    // The baubles.
    const tr = mk(), h = how({ bands: oneBand(0, 0.6) });
    K.stepTree(tr, h);
    const lv0 = K.levelOf(h.bands, 0);
    let kicked = true, others = true;
    for (let b = 0; b < K.BAUBLES; b++) {
      const i = tr.spots.tier[b];
      if (i === 0) { if (!(Math.sign(tr.swingV[b]) === tr.sign[b] && Math.abs(tr.swingV[b]) > 0.9 * K.SWING_BAND * lv0 && Math.abs(tr.swingV[b]) <= K.SWING_BAND * lv0 && near(tr.glow[b], lv0 * (1 - Math.exp(-K.GLOW_RATE[0] / 60)), 1e-6))) kicked = false; }
      else if (i > 1 && (tr.swingV[b] !== 0 || tr.glow[b] !== 0 || tr.swing[b] !== 0)) others = false;
    }
    const v1 = Math.abs(tr.swingV[0]);
    steps(tr, 600, h);   // a steady level kicks no more
    const settledV = Math.abs(tr.swingV[0]), lit = tr.glow[0];
    steps(tr, 12, how());
    ok(kicked && others && settledV < 0.05 * v1 && near(lit, lv0, 1e-4) && near(tr.glow[0], lit * Math.exp(-K.GLOW_RATE[1] * 12 / 60), 1e-4) && Math.abs(tr.swingV[0]) < 0.05 * v1,
      'a tier\'s baubles light as far as its part of the sound is loud, quickly, and fade slowly; a rise in it sets them swinging, each its own way, and a steady sound or a fall in it does not');
    // The swing is a spring: it crosses its rest about 4.4 times a second, dies away, and is never wild.
    const sw = mk(); sw.swingV[5] = 6;
    let crossings = 0, last = 0, most = 0;
    for (let i = 0; i < 120; i++) { K.stepTree(sw, how()); if (last * sw.swing[5] < 0) crossings++; if (sw.swing[5] !== 0) last = sw.swing[5]; if (Math.abs(sw.swing[5]) > most) most = Math.abs(sw.swing[5]); }
    const wild = mk(); wild.swingV[5] = 500; steps(wild, 3, how()); const held = Math.abs(wild.swing[5]);
    steps(sw, 900, how());
    ok(crossings >= 8 && crossings <= 9 && most > 0.3 && most < 6 / Math.sqrt(K.SWING[0]) && held <= K.SWING_MOST && sw.swing[5] === 0 && sw.swingV[5] === 0,
      'a bauble swings on its string about 2.2 times a second, less each time, comes to rest, and is never thrown further than 1.2 radians');
  }
  {
    // The thump.
    const tr = mk(), before = Array.from(tr.snow);
    K.shake(tr, 1, K.rng(1001));
    let swinging = true, placed = true, moving = true;
    for (let b = 0; b < K.BAUBLES; b++) if (!(Math.abs(tr.swingV[b]) >= K.SWING_THUMP[0] && Math.abs(tr.swingV[b]) <= K.SWING_THUMP[0] + K.SWING_THUMP[1])) swinging = false;
    for (let c = K.FALLING_MAX; c < K.FLAKES; c++) {
      const i = Math.floor((c - K.FALLING_MAX) / K.CLUMPS_EACH), [R, h, base] = K.TIERS[i], x = tr.flake[c * 4], y = tr.flake[c * 4 + 1] - K.FOOT, z = tr.flake[c * 4 + 2], r = Math.hypot(x, z);
      if (!(tr.on[c] === 1 && r <= R * 1.0001 && r >= R * K.CLUMP_AT[0] * 0.999 && y <= base + h && y >= K.rimY(i) && tr.flake[c * 4 + 3] >= K.CLUMP[0] && tr.flake[c * 4 + 3] <= K.CLUMP[0] + K.CLUMP[1])) placed = false;
      const out = (tr.flakeV[c * 3] * x + tr.flakeV[c * 3 + 2] * z) / r;
      if (!(out >= K.CLUMP_OUT[0] * 0.999 && out <= (K.CLUMP_OUT[0] + K.CLUMP_OUT[1]) * 1.001 && tr.flakeV[c * 3 + 1] <= 0 && tr.flakeV[c * 3 + 1] >= -K.CLUMP_DOWN)) moving = false;
    }
    ok(Math.abs(tr.lean[1]) >= K.ROCK[0] && Math.abs(tr.lean[1]) <= K.ROCK[0] + K.ROCK[1] && Math.abs(tr.lean[3]) <= K.ROCK[2] / 2 && tr.lean[0] === 0 && swinging && tr.lying === 0 && tr.flash === 1 && clumpsOn(tr) === K.CLUMPS && K.CLUMPS === K.CLUMPS_EACH * T6
      && placed && moving && Array.from(tr.snow).join() === before.join() && Array.from(tr.wait).every((w, i) => near(w, K.SNOW_WAIT * (T6 - 1 - i), 1e-7)),
      'a thump gives the trunk a push, sets every bauble swinging, and throws eighteen clumps of snow off every tier, outward and down from where the snow lay; the snow itself starts to go a moment later, the top tiers first');

    {
      const toward = [0, 0]; let inRange = true, oneWay = 0;
      for (let seed = 1; seed <= 40; seed++) { const t = mk(); K.shake(t, 1, K.rng(seed)); toward[t.lean[3] > 0 ? 0 : 1]++; if (Math.abs(t.lean[3]) > K.ROCK[2] / 2) inRange = false; if (seed === 1) for (let b = 0; b < K.BAUBLES; b++) if (t.swingV[b] > 0) oneWay++; }
      const thin = mk(); thin.snow.fill(0.1); thin.wait.fill(-1); K.shake(thin, 1, K.rng(3));
      const twice = mk(); K.shake(twice, 1, K.rng(1)); K.shake(twice, K.JOSTLE, K.rng(2));
      ok(toward[0] >= 8 && toward[1] >= 8 && inRange && oneWay >= 8 && oneWay <= 34 && clumpsOn(thin) === 0 && Array.from(thin.wait).every((w) => w === -1) && thin.lying === 0 && twice.flash === 1,
        'a thump pushes the tree toward the viewer as often as away, and sets some baubles swinging one way and some the other; a tier with next to no snow on it throws no clumps; the flash of a second shake does not add to the first');
    }
    // The snow comes off, the top first.
    steps(tr, 4, how());
    const early = Array.from(tr.snow);
    steps(tr, 41, how());
    const gone = Array.from(tr.snow);
    steps(tr, 600, how());
    ok(early[5] < 0.6 && early[0] === 1 && early[5] < early[4] && early[4] <= early[3] && gone.every((v) => v < 0.03) && Array.from(tr.snow).every((v) => v === 0) && tr.lying === 0,
      'the snow goes from the top tier first and from the lowest last, is all gone within three quarters of a second, and stays off until the tree is told the snow may settle');

    // The trunk is a spring.
    const rock = mk(); K.shake(rock, 1, K.rng(1001));
    const push = Math.abs(rock.lean[1]);
    let crossings = 0, last = 0, most = 0;
    for (let i = 0; i < 60; i++) { K.stepTree(rock, how()); if (last * rock.lean[0] < 0) crossings++; if (rock.lean[0] !== 0) last = rock.lean[0]; if (Math.abs(rock.lean[0]) > most) most = Math.abs(rock.lean[0]); }
    const after1 = Math.hypot(rock.lean[0], rock.lean[2]);
    steps(rock, 600, how());
    ok(crossings >= 5 && crossings <= 7 && most > 0.6 * push / Math.sqrt(K.SPRING[0]) && most < push / Math.sqrt(K.SPRING[0]) && after1 < 0.2 * most && Array.from(rock.lean).every((v) => v === 0) && rock.flash === 0,
      'the tree rocks on its trunk about three times a second, a few degrees at most, less each time, and comes to rest; the flash of the thump is gone in a moment');

    // The clumps fall and end at the snow, and keep over the drift.
    const fall = mk(); K.shake(fall, 1, K.rng(1003));
    let kept = true, above = true, firstGone = -1, held = 0, straight = true;
    for (let i = 0; i < 180; i++) {
      K.stepTree(fall, how());
      for (let c = K.FALLING_MAX; c < K.FLAKES; c++) if (fall.on[c]) {
        const x = fall.flake[c * 4], y = fall.flake[c * 4 + 1], z = fall.flake[c * 4 + 2];
        if (Math.hypot(x / K.KEEP[0], (z - K.DRIFT_Z) / K.KEEP[1]) > 1 + 1e-6) kept = false;
        if (Math.hypot(x / K.KEEP[0], (z - K.DRIFT_Z) / K.KEEP[1]) > 1 - 1e-6) { held++; if (fall.flakeV[c * 3] !== 0 || fall.flakeV[c * 3 + 2] !== 0) straight = false; }
        if (y < K.driftHeight(x, z - K.DRIFT_Z)) above = false;
      }
      if (firstGone < 0 && clumpsOn(fall) < K.CLUMPS) firstGone = i;
    }
    const drop = mk(); K.shake(drop, 1, K.rng(1003)); const c0 = K.FLAKES - 1, y0 = drop.flake[c0 * 4 + 1], vy0 = drop.flakeV[c0 * 3 + 1]; steps(drop, 12, how());
    ok(kept && above && held > 0 && straight && clumpsOn(fall) === 0 && fall.clumps === 0 && firstGone > 3 && firstGone < 40 && near(drop.flakeV[c0 * 3 + 1], vy0 - K.GRAVITY * 12 / 60, 1e-5) && drop.flake[c0 * 4 + 1] < y0 - 0.5 * K.GRAVITY * 0.2 * 0.2 * 0.9,
      'a clump falls faster and faster and ends where it meets the snow, the lowest tier\'s first; none is left after three seconds, and none falls beyond the drift: one that would drops straight down at its edge');

    // The snow settles again, slowly; a thump in the middle of it sends off what has settled.
    K.resettle(tr);
    steps(tr, 60, how());
    const after1s = tr.snow[0];
    const half = Array.from(tr.snow);
    K.shake(tr, 1, K.rng(1002));
    const thrown = clumpsOn(tr), same = Array.from(tr.snow).join() === half.join();
    steps(tr, 60, how());
    const offAgain = Array.from(tr.snow).every((v) => v < 0.01);
    K.resettle(tr); steps(tr, 60 * 14, how());
    ok(near(after1s, 1 - Math.exp(-K.SNOW_RATE[1]), 1e-4) && same && thrown === T6 * Math.round(K.CLUMPS_EACH * after1s) && thrown > 30 && thrown < 60 && offAgain && Array.from(tr.snow).every((v) => v === 1) && tr.lying === 1,
      'told it may, the snow settles on the boughs again over a few seconds and comes to rest whole; a thump while it is settling throws off as many clumps as there is snow, and the snow goes again from where it was, with no jump');
    const bare = mk(); K.shake(bare, 1, K.rng(1)); steps(bare, 200, how());
    const leanV = bare.lean[1]; K.shake(bare, K.JOSTLE, K.rng(2));
    let gentler = true; const sw2 = mk(); K.shake(sw2, K.JOSTLE, K.rng(1001));
    for (let b = 0; b < K.BAUBLES; b++) if (!(Math.abs(sw2.swingV[b]) >= K.JOSTLE * K.SWING_THUMP[0] - 1e-6 && Math.abs(sw2.swingV[b]) <= K.JOSTLE * (K.SWING_THUMP[0] + K.SWING_THUMP[1]) + 1e-6)) gentler = false;
    ok(clumpsOn(bare) === 0 && Math.abs(bare.lean[1] - leanV) >= K.JOSTLE * K.ROCK[0] - 1e-6 && Math.abs(bare.lean[1] - leanV) <= K.JOSTLE * (K.ROCK[0] + K.ROCK[1]) + 1e-6 && bare.flash === K.JOSTLE && gentler && near(Math.abs(sw2.lean[1]), K.JOSTLE * Math.abs(mkShake().lean[1]), 1e-6),
      'a peak while the tree is bare rocks it again, 0.6 as hard, and throws no snow, for there is none');
    function mkShake() { const t = mk(); K.shake(t, 1, K.rng(1001)); return t; }
  }
  {
    // The falling snow.
    const tr = mk(), speeds = [];
    for (let i = 0; i < K.FALLING_MAX; i++) speeds.push(tr.flakeV[i * 3]);
    const i0 = Array.from(tr.on).findIndex((v, i) => v && tr.flake[i * 4 + 1] > 2), y0 = tr.flake[i0 * 4 + 1], x0 = tr.flake[i0 * 4];
    steps(tr, 30, how());
    const fell = y0 - tr.flake[i0 * 4 + 1], swayed = Math.abs(tr.flake[i0 * 4] - x0);
    const count = (h, secs) => { const t = mk(); steps(t, 60 * secs, h); return fallingOn(t); };
    const silent = count(how(), 20), loud = count(how({ flame: 1 }), 20), beats = count(how({ flame: 1, burst: 1 }), 20), none = count(how({ snow: 0 }), 20), twice = count(how({ snow: 2 }), 20), most = count(how({ flame: 1, burst: 1, snow: 2 }), 20);
    // A flake that lands starts again at the top, inside its air; at most two start in a step.
    const fresh = mk(); let spawnedMost = 0, tops = true;
    for (let s = 0; s < 240; s++) { const was = Array.from(fresh.on); K.stepTree(fresh, how({ flame: 1, burst: 1, snow: 2 })); let spawned = 0; for (let i = 0; i < K.FALLING_MAX; i++) if (!was[i] && fresh.on[i]) { spawned++; const x = fresh.flake[i * 4], y = fresh.flake[i * 4 + 1], z = fresh.flake[i * 4 + 2]; if (!(Math.abs(x) <= K.SKY[0] && y >= K.SKY[1] && y <= K.SKY[1] + K.SKY[2] && z >= K.SKY[3] && z <= K.SKY[4])) tops = false; } if (spawned > spawnedMost) spawnedMost = spawned; }
    const steady = mk(); let fewest = 999;
    for (let s = 0; s < 1200; s++) { K.stepTree(steady, how()); fewest = Math.min(fewest, fallingOn(steady)); }
    ok(speeds.every((v) => v >= K.FLAKE_FALL[0] && v <= K.FLAKE_FALL[0] + K.FLAKE_FALL[1]) && fewest === K.SNOWING[0] && near(fell, 0.5 * speeds[i0], 1e-5) && swayed > 0 && swayed < 0.5 * K.FLAKE_SWAY[1] + 1e-6
      && silent === K.SNOWING[0] && loud === K.SNOWING[0] + K.SNOWING[1] && beats === K.SNOWING[0] + K.SNOWING[1] + K.SNOWING[2] && none === 0 && twice === 2 * K.SNOWING[0] && most === K.FALLING_MAX && K.FALLING_MAX === 2 * (K.SNOWING[0] + K.SNOWING[1] + K.SNOWING[2])
      && spawnedMost === K.SPAWN && tops,
      'snow falls: each flake at its own speed, swaying; 55 flakes in silence, 110 at the loudest and 40 more after beats, none at Snowfall 0 and twice as many at 100; a flake that lands starts again at the top in the same step, so there are never fewer; when there should be more, two at most start in a step');
    const dry = mk(); steps(dry, 60 * 20, how({ snow: 0 })); K.shake(dry, 1, K.rng(5));
    ok(fallingOn(dry) === 0 && clumpsOn(dry) === K.CLUMPS, 'with Snowfall at 0 a thump still knocks the snow off the boughs');
  }
  {
    // The string laid again; everything laid again.
    const tr = mk(); K.shake(tr, 1, K.rng(9)); steps(tr, 20, how({ flame: 0.7, bands: loudBands(0.5) }));
    const before = snapshot(tr), tw = Array.from(tr.twinkle);
    K.restring(tr, 128);
    const kept = snapshot(tr) === before && Array.from(tr.twinkle).join() === tw.join();
    K.lay(tr, 128);
    ok(kept && tr.n === 128 && tr.string.n === 128 && snapshot(tr) === snapshot(K.createTree(K.SEED, 128)) && snapshot(tr).replace(/\|[^|]*$/, '') === snapshot(mk(96)).replace(/\|[^|]*$/, ''),
      'when Light density changes the string is laid again and nothing else is touched; laid again whole, the tree is as it was made, whatever happened to it');
    const long = mk(); let fine = true;
    for (let i = 0; i < 1800; i++) { if (i % 90 === 0) K.shake(long, i % 180 ? K.JOSTLE : 1, K.rng(i)); if (i % 300 === 150) K.resettle(long); K.stepTree(long, how({ flame: (i % 7) / 6, kick: i % 30 ? 0 : 1, burst: 1, bands: loudBands((i % 5) / 4), snow: 2 })); if (!(finite(long.flake) && finite(long.lean) && finite(long.swing) && finite(long.snow) && Math.hypot(long.lean[0], long.lean[2]) < 0.4)) fine = false; }
    ok(fine && fallingOn(long) <= K.FALLING_MAX, 'thumped again and again while it is loud, the tree never leans far and every number stays a number');
  }

  // WHAT IS DRAWN
  {
    const tr = mk(), o = sheet(), L = look();
    K.dress(o, tr, L);
    let silent = true, own = true;
    for (let j = 0; j < 96; j++) {
      const b = K.TWINKLE[0] + K.TWINKLE[1] * (0.5 + 0.5 * Math.sin(tr.twinkle[j * 3 + 1])), k = j % K.HUES[0], red = (k + 1) / 10;
      if (!(near(o.bright[j], b, 1e-6) && near(o.bulb[j * 3], red * (K.CORE[0] + K.CORE[1] * b) + K.CORE[2] * b * b, 1e-5) && near(o.bulb[j * 3 + 1], 0.5 * red * (K.CORE[0] + K.CORE[1] * b) + K.CORE[2] * b * b, 1e-5) && near(o.bulb[j * 3 + 2], K.CORE[2] * b * b, 1e-6)
        && near(o.halo[j * 3], red * (K.HALO[0] + K.HALO[1] * b), 1e-6) && o.halo[j * 3 + 2] === 0 && near(o.haloSize[j], K.HALO_SIZE[0] + K.HALO_SIZE[1] * b, 1e-6))) silent = false;
      if (!(b >= K.TWINKLE[0] && b <= K.TWINKLE[0] + K.TWINKLE[1])) own = false;
    }
    steps(tr, 37, how()); K.dress(o, tr, L);
    const later = K.TWINKLE[0] + K.TWINKLE[1] * (0.5 + 0.5 * Math.sin(tr.time * tr.twinkle[3] + tr.twinkle[4]));
    ok(silent && own && near(o.bright[1], later, 1e-5) && o.bright[96] === 0, 'in silence every light of the string glows low and twinkles in its own time, in its own colour of five in turn, with a small glow round it');

    // The voice runs down the string.
    const v = mk(); steps(v, 6, how({ flame: 1 })); steps(v, 30, how()); K.dress(o, v, L);
    let best = 0; for (let j = 1; j < 96; j++) if (o.bright[j] > o.bright[best]) best = j;
    const want = (30 + 3) / K.RUN, at = v.string.u[best];
    const v2 = mk(); steps(v2, 6, how({ flame: 1 })); steps(v2, 50, how()); K.dress(sheet(), v2, L); const o2 = sheet(); K.dress(o2, v2, L);
    let best2 = 0; for (let j = 1; j < 96; j++) if (o2.bright[j] > o2.bright[best2]) best2 = j;
    const loudAll = mk(); steps(loudAll, 120, how({ flame: 1 })); const o3 = sheet(); K.dress(o3, loudAll, L);
    const halfAll = mk(); steps(halfAll, 120, how({ flame: 0.5 })); const o4 = sheet(); K.dress(o4, halfAll, L);
    ok(K.RUN === Math.round(K.RUN_S / K.STEP) && near(o4.bright[40], K.TWINKLE[0] + K.TWINKLE[1] * (0.5 + 0.5 * Math.sin(halfAll.time * halfAll.twinkle[120] + halfAll.twinkle[121])) + K.VOICE[0] * Math.pow(0.5, K.VOICE[1]), 1e-4) && Math.abs(at - want) < 0.06 && o.bright[best] > 1 && o.bright[0] < 0.45 && o.bright[95] < 0.4 && best2 > best + 20 && near(v2.string.u[best2], (50 + 3) / K.RUN, 0.06)
      && near(o3.bright[40], K.TWINKLE[0] + K.TWINKLE[1] * (0.5 + 0.5 * Math.sin(loudAll.time * loudAll.twinkle[120] + loudAll.twinkle[121])) + K.VOICE[0], 1e-4) && near(o3.haloSize[40], K.HALO_SIZE[0] + K.HALO_SIZE[1] * Math.min(o3.bright[40], K.HALO_SIZE[2]), 1e-6) && near(Math.max(...o3.haloSize), K.HALO_SIZE[0] + K.HALO_SIZE[1] * K.HALO_SIZE[2], 1e-6),
      'what the star heard runs down the string, from the star to the lowest boughs in 1.1 seconds: a syllable is a pulse of light that is halfway down after half that time; a light\'s glow grows with it, up to a size');

    // A beat, and the flicker while the tree rocks.
    const beat = mk(), ob = sheet(); K.dress(o, beat, L); K.dress(ob, beat, look({ kick: 1 }));
    let shares = true; for (let j = 0; j < 96; j++) if (!near(ob.bright[j] - o.bright[j], K.BEAT * beat.twinkle[j * 3 + 2], 1e-6)) shares = false;
    const rocking = mk(), of = sheet(); rocking.lean[0] = 0.05; K.dress(of, rocking, L);
    let dimmer = true, some = 0; for (let j = 0; j < 96; j++) { const r = of.bright[j] / o.bright[j], wantR = 1 - K.FLICKER[0] * Math.min(1, K.FLICKER[1] * 0.05) * (0.5 + 0.5 * Math.sin(K.FLICKER[3] * rocking.twinkle[j * 3 + 1])); if (!near(r, wantR, 1e-5)) dimmer = false; if (r < 0.7) some++; }
    ok(shares && dimmer && some > 20 && some < 80, 'a beat brightens each light by its own share; while the tree rocks its lights flicker, each in its own time, and at rest they do not');

    // The light the string throws.
    K.dress(o, mk(), L);
    let mean = 0, mr = 0, mg = 0; for (let j = 0; j < 96; j++) { mean += o.bright[j] / 96; mr += ((j % 5) + 1) / 10 * o.bright[j]; mg += ((j % 5) + 1) / 20 * o.bright[j]; }
    const blue = look(); for (let k = 0; k < K.HUES[0]; k++) { blue.pal[k * 3] = 0.1; blue.pal[k * 3 + 1] = 0.2; blue.pal[k * 3 + 2] = 0.4; }
    const ob2 = sheet(); K.dress(ob2, mk(), blue);
    ok(near(ob2.string[0], K.STRING_LIGHT[2] + (1 - K.STRING_LIGHT[2]) * 0.25, 1e-6) && near(ob2.string[1], K.STRING_LIGHT[2] + (1 - K.STRING_LIGHT[2]) * 0.5, 1e-6) && near(ob2.string[2], 1, 1e-6) && near(o.string[3], K.STRING_LIGHT[0] + K.STRING_LIGHT[1] * mean, 1e-5) && near(o.string[0], 1, 1e-6) && near(o.string[1], K.STRING_LIGHT[2] + (1 - K.STRING_LIGHT[2]) * mg / mr, 1e-5) && near(o.string[2], K.STRING_LIGHT[2], 1e-6) && o3.string[3] > o.string[3] + 5,
      'the string throws one light, in the mean colour of its lights (kept from being a pure colour) and as bright as they are');
  }
  {
    // The baubles, the snow on the tiers, the flakes and the star.
    const tr = mk(), o = sheet(), L = look();
    tr.glow[3] = 0.5; tr.flash = 0.4; tr.swing[10] = 0.6;
    K.dress(o, tr, L);
    let hang = true;
    for (let b = 0; b < K.BAUBLES; b++) {
      const i = tr.spots.tier[b], phi = tr.spots.phi[b], r = tr.spots.r[b], len = K.HANG + r, a = tr.swing[b], tipR = K.rimR(i, phi) * K.TIP_IN, tip = [tipR * Math.cos(phi), K.rimY(i) + K.TIP_UP, tipR * Math.sin(phi)];
      const p = [o.ball[b * 3], o.ball[b * 3 + 1], o.ball[b * 3 + 2]];
      if (!near(Math.hypot(p[0] - tip[0], p[1] - tip[1], p[2] - tip[2]), len, 1e-5)) hang = false;
      if (a === 0 && !(near(p[0], tip[0], 1e-6) && near(p[1], tip[1] - len, 1e-6) && near(p[2], tip[2], 1e-6))) hang = false;
      if (!(o.ballCol[b * 3] === 0 && near(o.ballCol[b * 3 + 2], (tr.spots.hue[b] + 1) / 10, 1e-6) && near(o.ballHow[b * 2], r, 1e-7) && near(o.ballHow[b * 2 + 1], K.BALL_GLOW[0] + K.BALL_GLOW[1] * tr.glow[b] + K.BALL_GLOW[2] * 0.4, 1e-5))) hang = false;
    }
    const out10 = Math.hypot(o.ball[30], o.ball[32]) - K.rimR(tr.spots.tier[10], tr.spots.phi[10]) * K.TIP_IN;
    ok(hang && near(out10, (K.HANG + tr.spots.r[10]) * Math.sin(0.6), 1e-5), 'a bauble hangs a string\'s length under the tip of its bough and swings out from the tree on it; it has its own colour of seven, and is lit inside by its tier and by a thump');

    tr.snow[2] = 0.25; K.dress(o, tr, L);
    ok(near(o.cap[0], K.TIERS[0][2], 1e-6) && o.cap[1] === 1 && near(o.cap[4], K.TIERS[2][2] + K.TIERS[2][1] * 0.75, 1e-6) && o.cap[5] === 0.25, 'the snow on a tier draws in toward the tier\'s top as it goes: its top stays where it is');

    const f = mk(), of = sheet();
    f.on.fill(0);
    const put = (i, x, y, z, size) => { f.on[i] = 1; f.flake[i * 4] = x; f.flake[i * 4 + 1] = y; f.flake[i * 4 + 2] = z; f.flake[i * 4 + 3] = size; };
    put(0, 1, 2, 0, 0.02); put(1, 2.725, 2, 0, 0.02); put(2, K.SIDE[1], 2, 0, 0.02); put(3, 1, K.ROOF[0], 0, 0.02); put(4, 1, (K.ROOF[0] + K.ROOF[1]) / 2, 0, 0.02); put(5, 0.5, K.driftHeight(0.5, -K.DRIFT_Z) + 0.125, 0, 0.02); put(6, 0.5, K.driftHeight(0.5, -K.DRIFT_Z), 0, 0.02);
    put(K.FALLING_MAX, K.SIDE[1], K.ROOF[0], 0, 0.05); put(K.FALLING_MAX + 1, 0.5, K.driftHeight(0.5, -K.DRIFT_Z) + 0.125, 0, 0.05);
    K.dress(of, f, L);
    ok(near(of.flake[3], 0.02, 1e-7) && of.flake[0] === 1 && of.flake[1] === 2 && of.flake[4 + 3] > 0.008 && of.flake[4 + 3] < 0.012 && of.flake[8 + 3] === 0 && of.flake[12 + 3] === 0 && near(of.flake[16 + 3], 0.01, 1e-6) && near(of.flake[20 + 3], 0.01, 1e-6) && of.flake[24 + 3] < 1e-6 && of.flake[28 + 3] === 0
      && near(of.flake[K.FALLING_MAX * 4 + 3], 0.05, 1e-7) && near(of.flake[(K.FALLING_MAX + 1) * 4 + 3], 0.025, 1e-6) && K.SIDE[1] < K.SKY[0] + 0.3 && K.ROOF[0] < K.SKY[1],
      'a flake is drawn its own size in the open air, and smaller to nothing toward the sides and the top of its air and over its last quarter unit above the snow, so that none is cut by the picture\'s edge; a clump shrinks only as it lands');

    const st = mk(), os = sheet();
    K.dress(os, st, L);
    const silent = Array.from(os.star);
    st.star = 1; K.dress(os, st, L); const loud = Array.from(os.star);
    K.dress(os, st, look({ glow: 0, kick: 1 })); const plain = Array.from(os.star);
    K.dress(os, st, look({ glow: 2 })); const most = Array.from(os.star);
    st.star = 0; st.flash = 0.5; K.dress(os, st, look({ kick: 0.5 })); const burst = Array.from(os.star);
    st.flash = 0; st.time = 2; K.dress(os, st, L);
    ok(near(silent[0], K.STAR_GOLD[0], 1e-6) && near(silent[1], K.STAR_GLOW[0], 1e-6) && near(silent[2], K.STAR_GLOW_A[0], 1e-6) && near(silent[3], K.STAR_RAYS[0], 1e-6) && near(silent[4], K.STAR_RAYS_A[0], 1e-6) && silent[5] === 0 && silent[6] === 0 && near(silent[7], K.STAR_LIGHT[0], 1e-6)
      && near(loud[0], K.STAR_GOLD[0] + K.STAR_GOLD[1], 1e-5) && near(loud[1], K.STAR_GLOW[0] + K.STAR_GLOW[1], 1e-6) && near(loud[2], K.STAR_GLOW_A[0] + K.STAR_GLOW_A[1], 1e-6) && near(loud[3], K.STAR_RAYS[0] + K.STAR_RAYS[1], 1e-6) && near(loud[4], K.STAR_RAYS_A[0] + K.STAR_RAYS_A[1], 1e-6) && near(loud[7], K.STAR_LIGHT[0] + K.STAR_LIGHT[1], 1e-5)
      && plain.join() === silent.join() && near(most[1], K.STAR_GLOW[0] + K.STAR_GLOW[1] * K.STAR_MOST, 1e-6) && near(most[7], K.STAR_LIGHT[0] + K.STAR_LIGHT[1] * K.STAR_MOST, 1e-5)
      && near(burst[0], K.STAR_GOLD[0] + K.STAR_GOLD[2], 1e-6) && near(burst[3], K.STAR_RAYS[0] + K.STAR_RAYS[2], 1e-6) && near(burst[7], K.STAR_LIGHT[0] + K.STAR_LIGHT[2], 1e-6)
      && near(os.star[5], K.STAR_TURN[0] * Math.sin(K.STAR_TURN[1] * 2), 1e-6) && near(os.star[6], K.STAR_TURN[2] * Math.sin(K.STAR_TURN[3] * 2), 1e-6),
      'the star: in silence a gold star with a small glow, faint rays and a low light; with the voice its gold, its glow, its rays and the light it throws all grow, by Star glow (not at all at 0, at most half as far again as a full voice at 50); a beat or a thump flares it; it turns a little from side to side');
  }
  {
    // Inside the picture: where a point falls on the canvas, as the kit places the camera (-1 to 1 each way).
    const see = (p, aspect, orbit) => {
      const d = KIT.fitDistance(K.FRAME.width, K.FRAME.height, K.FOV, aspect), tilt = K.TILT * Math.PI / 180, c = K.FRAME.center;
      const cam = [c[0] + d * Math.sin(orbit) * Math.cos(tilt), c[1] + d * Math.sin(tilt), c[2] + d * Math.cos(orbit) * Math.cos(tilt)];
      const f = [c[0] - cam[0], c[1] - cam[1], c[2] - cam[2]].map((v) => v / d), r = [-f[2], 0, f[0]], rl = Math.hypot(r[0], r[2]);
      const right = [r[0] / rl, 0, r[2] / rl], up = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]];
      const v = [p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]], depth = v[0] * f[0] + v[1] * f[1] + v[2] * f[2], t = Math.tan(K.FOV * Math.PI / 360);
      return [(v[0] * right[0] + v[2] * right[2]) / depth / (t * aspect), (v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) / depth / t];
    };
    let worst = 0;
    const look2 = (p) => { for (const aspect of [1728 / 624, 16 / 9, 4 / 3, 300 / 220]) for (const orbit of [-2 * K.SWAY, 0, 2 * K.SWAY]) { const [x, y] = see(p, aspect, orbit); worst = Math.max(worst, Math.abs(x), Math.abs(y)); } };
    // The drift's rim, the presents, the star leaning as far as a thump leans it, the lowest tips, the air of the flakes where they are drawn, and where clumps may fall.
    for (let a = 0; a < 64; a++) { const g = (a / 64) * TAU; look2([K.DRIFT[0] * Math.cos(g), 0, K.DRIFT_Z + K.DRIFT[2] * Math.sin(g)]); look2([K.KEEP[0] * Math.cos(g), 0, K.DRIFT_Z + K.KEEP[1] * Math.sin(g)]); look2([K.rimR(0, g) * Math.cos(g), K.FOOT + K.rimY(0) - 0.16, K.rimR(0, g) * Math.sin(g)]); }
    for (const [x, z, w, h, dd] of K.PRESENTS) for (const sx of [-1, 1]) for (const sz of [-1, 1]) look2([x + sx * 0.75 * w, h + 0.3, z + sz * 0.75 * dd]);
    for (const lx of [-0.12, 0.12]) for (const lz of [-0.12, 0.12]) look2([-(K.STAR_Y + K.STAR[0]) * Math.sin(lx), K.FOOT + (K.STAR_Y + K.STAR[0]) * Math.cos(lx) * Math.cos(lz), (K.STAR_Y + K.STAR[0]) * Math.sin(lz)]);
    for (const x of [-K.SIDE[1], K.SIDE[1]]) for (const y of [K.FLOOR, K.ROOF[0]]) for (const z of [K.SKY[3], K.SKY[4]]) look2([x, y, z]);
    ok(worst < 0.985 && worst > 0.8, 'everything solid keeps inside the picture on every page, with the camera swaying its furthest: the drift, the presents, the star as far as a thump leans it, the snow in the air where it is drawn, and the clumps (the furthest reaches ' + worst.toFixed(3) + ' of the way to an edge)');
    ok(K.swayFor(0) === 0 && near(K.swayFor(50), K.SWAY) && near(K.swayFor(100), 2 * K.SWAY) && near(K.swayFor(undefined), K.SWAY) && K.orbitAt(0, 50) === 0 && near(K.orbitAt(Math.PI / 2 / K.ORBIT_RATE, 50), K.SWAY) && near(K.orbitAt(3, 100), 2 * K.SWAY * Math.sin(3 * K.ORBIT_RATE)),
      'the camera sways 0.14 radians each way at Camera drift 50, not at all at 0 and twice as far at 100, once in about 48 seconds');
  }
  {
    // The files and the settings.
    const pages = [];
    for (const name of ['mic-visualizers-1920x1080.html', 'mic-visualizers-1440x1080.html', 'mic-visualizers-300x220.html']) {
      const html = await readFile(resolve(__dirname, 'overlay', name), 'utf8'), pos = html.indexOf('src="christmas-tree.js"');
      pages.push(pos > html.indexOf('src="rose.js"') && pos > html.indexOf('src="scene-kit.js"') && html.includes('src="helix.js"') && pos < html.indexOf('src="factories/') && html.split('src="christmas-tree.js"').length === 2 && html.split('src="factories/christmas-tree.js"').length === 2);
    }
    const factory = await readFile(resolve(__dirname, 'overlay/factories/christmas-tree.js'), 'utf8'), source = await readFile(resolve(__dirname, 'overlay/christmas-tree.js'), 'utf8');
    ok(pages.every(Boolean) && /VIZ_FACTORIES\['christmas-tree'\] = TimbreScene\.factory\(\(\) => TimbreTree\.definition\(\)\);/.test(factory) && !/WebGLRenderer|fetch\(|ctx\./.test(factory) && !/Math\.random/.test(source) && !/fetch\(|WebGLRenderer/.test(source),
      "all three overlay pages load christmas-tree.js once, after the scene kit and rose.js and before the factories, and the shatter machine it uses; the effect is the kit's factory around the tree's definition, with no renderer of its own and nothing drawn on the 2D canvas; and the tree takes no numbers from Math.random");
    const old = T.sanitizeConfig({ activeViz: 'christmas-tree', perViz: { 'christmas-tree': { lightDensity: 80, snowSpeed: 20, starGlow: 10, resettleSeconds: 99, shakeSensitivity: -4, bogus: 1 } } });
    ok(JSON.stringify(T.DEFAULT_PER_VIZ['christmas-tree']) === '{"lightDensity":60,"starGlow":50,"snowfall":50,"shakeSensitivity":50,"resettleSeconds":3,"cameraDrift":50}' && JSON.stringify(T.PER_VIZ_MAX['christmas-tree']) === '{"resettleSeconds":10}'
      && T.VIZ_SCENES[T.VIZ_SCENES.length - 1] === 'christmas-tree' && T.VIZ_USES_3D.includes('christmas-tree') && T.ACTIVE_VIZ_NAMES.indexOf('christmas-tree') === T.ACTIVE_VIZ_NAMES.indexOf('halloween-jack') + 1
      && old.activeViz === 'christmas-tree' && JSON.stringify(old.perViz['christmas-tree']) === '{"lightDensity":80,"starGlow":10,"snowfall":50,"shakeSensitivity":0,"resettleSeconds":10,"cameraDrift":50}',
      'the Christmas tree is a kit scene, the last listed, in its old place in the list of effects; its settings are Light density (60), Star glow, Snowfall, Shake sensitivity, Resettle seconds (3, at most 10) and Camera drift; a saved Light density and Star glow are kept, and the retired Snow speed is dropped');
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
