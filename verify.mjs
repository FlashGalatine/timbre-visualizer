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
  ok(T.VIZ_SCENES.indexOf('winter-aurora') === 1 && T.VIZ_SCENES.indexOf('thanksgiving-harvest') === 0, 'winter-aurora is the second kit scene');
  const FLAG_IDS = ['pride-ribbon', 'bi-pride-ribbon', 'ace-pride-ribbon', 'trans-pride-ribbon', 'july-fourth-stripes'];
  ok(JSON.stringify(T.VIZ_SCENES) === JSON.stringify(['thanksgiving-harvest', 'winter-aurora', ...FLAG_IDS, 'sunburst-3d', 'mountains-3d', 'phosphor', 'chladni', 'glass-prism']) && FLAG_IDS.every((n) => T.VIZ_USES_3D.includes(n)), 'the five flags are kit scenes, listed after winter-aurora');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['pride-ribbon']) === '{"wind":50,"heartRate":50,"stripeStyle":0,"cameraDrift":50}'
    && ['bi', 'ace', 'trans'].every((p) => JSON.stringify(T.DEFAULT_PER_VIZ[p + '-pride-ribbon']) === '{"wind":50,"heartRate":50,"cameraDrift":50}'), 'pride flag knobs');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['july-fourth-stripes']) === '{"wind":50,"starTwinkle":50,"burstChance":50,"cameraDrift":50}', 'fourth of july flag knobs');
  ok(JSON.stringify(T.VIZ_LABELS) === JSON.stringify({ 'pride-ribbon': 'Pride flag', 'bi-pride-ribbon': 'Bi pride flag', 'ace-pride-ribbon': 'Ace pride flag', 'trans-pride-ribbon': 'Trans pride flag', 'july-fourth-stripes': 'Fourth of July flag' })
    && FLAG_IDS.every((n) => T.ACTIVE_VIZ_NAMES.includes(n)), 'the five flags have display names, and keep their ids');
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['winter-aurora']) === '{"auroraGlow":50,"snowfall":50,"starDensity":50,"cameraDrift":50}', 'winter aurora knobs');
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
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['mountains-3d']) === '{"speed":50,"cameraDrift":50}', 'mountains knobs: speed and camera drift');
  const oldLand = T.sanitizeConfig({ activeViz: 'mountains-3d', perViz: { 'mountains-3d': { speed: 80 } } });
  ok(oldLand.activeViz === 'mountains-3d' && JSON.stringify(oldLand.perViz['mountains-3d']) === '{"speed":80,"cameraDrift":50}', 'a saved pre-redesign mountains config keeps its speed and gains the new default');
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
  ok(JSON.stringify(T.DEFAULT_PER_VIZ['phosphor']) === '{"depth":50,"cameraDrift":50}', 'phosphor knobs: depth and camera drift');
  const oldDeck = T.sanitizeConfig({ activeViz: 'phosphor', perViz: { 'phosphor': { depth: 80 } } });
  ok(oldDeck.activeViz === 'phosphor' && JSON.stringify(oldDeck.perViz['phosphor']) === '{"depth":80,"cameraDrift":50}', 'a saved pre-redesign phosphor config keeps its depth and gains the new default');
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
    ok(C.PITCH === 44 && C.FOV === 30 && JSON.stringify(C.FRAME) === '{"width":6.8,"height":4.9,"center":[0,-0.38,0]}' && C.AIR === 0.25 && near(C.V_ROOM, 2.45 * 0.86) && near(C.H_ROOM, 3.4 * 0.86),
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
    let inside = true, smallest = 1, over = 0;
    for (let i = 0; i < 400; i++) {
      const rx = (i * 37) % 360, ry = (i * 101) % 360, rz = (i * 173) % 360, pose = C.poseFor(rx, ry, rz), b = C.bounds(rx, ry, rz, pose.scale, pose.x, pose.y, pose.z), raw = C.bounds(rx, ry, rz, 1, 0, 0, 0);
      if (!(b[0] >= -C.V_ROOM * 1.04 && b[1] <= C.V_ROOM * 1.04 && b[2] >= -C.H_ROOM * 1.04 && b[3] <= C.H_ROOM * 1.04 && pose.scale <= 1 && pose.scale > 0.5)) inside = false;
      smallest = Math.min(smallest, pose.scale);
      if (raw[0] < -2.45 || raw[1] > 2.45) over++;
    }
    const b0 = C.bounds(0, 0, 0, 1, 0, 0, 0);
    ok(inside && over > 100 && smallest < 0.7 && b0[1] < C.V_ROOM && b0[0] > -C.V_ROOM && b0[3] < C.H_ROOM && near(b0[2], -b0[3]), 'however the plate is turned it stays inside the frame, with room for sand in the air');
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
