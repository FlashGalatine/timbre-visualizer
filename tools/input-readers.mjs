// The readers: how each group of effects turns the sound into a level, before the audio input
// changed (from the 32 values 750 Hz apart, `f` of an old recording) and after (from the log
// bands `f`, the slices `s` and micBands `b` of a new one). All at Gain 1. Used by
// tools/compare-input.mjs for its level tables.
//
// The new side calls overlay/helix.js itself for everything that lives there. What lives in
// an effect file is written out again here, with the line of the effect it mirrors beside it
// (`mirrors`): verify.mjs checks that every such line is still in its file, so a reader here
// cannot drift from the effect unnoticed.
import '../overlay/helix.js';
import '../overlay/chladni.js';
import '../overlay/phosphor.js';
const HX = globalThis.TimbreHelix, PLATE = globalThis.TimbreChladni, DECK = globalThis.TimbrePhosphor;

const clamp01 = (v) => (v > 1 ? 1 : v > 0 ? v : 0);
const avg = (f, from, to) => { let sum = 0; for (let i = from; i < to; i++) sum += f[i]; return sum / ((to - from) * 255); };
const rms64 = (w) => Math.sqrt(w.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / w.length);
const slice = (t, k) => (t.s ? t.s[k] : NaN);
const sliceAvg = (t, from, to) => (t.s ? avg(t.s, from, to) : NaN);

const SEASONAL = ['autumn-leaves', 'dia-de-muertos-calavera', 'easter-eggs', 'halloween-jack', 'lunar-new-year-lanterns', 'new-year-fireworks', 'spring-blossoms', 'st-patricks-shamrocks', 'summer-tide', 'valentines-hearts'];
const HELIX = ['dna', 'comet', 'fireflies', 'pulse-rings', 'orbit', 'black-hole', 'blob', 'owl', 'television'];
// Which scene modules read each slice (their BANDS, or the bands their columns and beams are given).
const MODULES = { 8: ['boids', 'christmas-tree', 'ink', 'jelly', 'rose', 'school-of-fish', 'shards', 'metaball'], 9: ['mountains-3d', 'sunburst-3d'], 10: ['glass-prism'] };
const modulesFor = (k) => Object.entries(MODULES).filter(([n]) => k < Number(n)).flatMap(([, names]) => names);

// limit: how far the mean may move (a share of the old mean); signals: the signals the limit is
// judged on (all when left out). A reader with no limit is reported only.
export const readers = [
  // Group 1: levels() in overlay/helix.js.
  { group: 1, name: 'levels() low', effects: HELIX, limit: 0.10, signals: ['speech', 'speech220', 'kick'],
    old: (t) => clamp01(avg(t.f, 0, 2) * 1.3), new: (t) => HX.levels(t.f, t.w, 1).low },
  { group: 1, name: 'levels() high', effects: HELIX, limit: 0.10, signals: ['speech', 'speech220', 'kick'],
    old: (t) => clamp01(avg(t.f, 2, 11) * 3), new: (t) => HX.levels(t.f, t.w, 1).high },
  { group: 1, name: 'levels() loud (the waveform: not changed)', effects: HELIX,
    old: (t) => HX.levels(null, t.w, 1).loud, new: (t) => HX.levels(null, t.w, 1).loud },
  { group: 1, name: "blob's outline: values 0-10, now the slices", effects: ['blob'], limit: 0.10,
    mirrors: [['overlay/factories/blob.js', 'bins: live ? slices : null,']],
    old: (t) => avg(t.f, 0, 11), new: (t) => sliceAvg(t, 0, 11) },

  // Group 2: "bass" and "high" in the effect files.
  { group: 2, name: 'bass (was values 0-3)', effects: ['galaxy-ripple', 'matrix', 'peaks-mirror'], limit: 0.10, signals: ['speech', 'speech220', 'kick'],
    mirrors: [['overlay/factories/galaxy-ripple.js', "bassInst = TimbreHelix.heard('bass', micBands) * cfgGain;"], ['overlay/factories/peaks-mirror.js', "bassInst = TimbreHelix.heard('bass', micBands) * cfgGain;"],
      ['overlay/factories/matrix.js', "bass = TimbreHelix.heard('bass', micBands) * cfgGain;"]],
    old: (t) => avg(t.f, 0, 4), new: (t) => HX.heard('bass', t.b) },
  { group: 2, name: 'low (was values 0-3, at most 1)', effects: ['winter-aurora', 'the flag (five effects)', 'sunburst-3d'], limit: 0.10, signals: ['speech', 'speech220', 'kick'],
    mirrors: [['overlay/flag.js', "low = Math.min(1, TimbreHelix.heard('bass', micBands) * cfgGain);"], ['overlay/factories/winter-aurora.js', "low = Math.min(1, TimbreHelix.heard('bass', micBands) * cfgGain);"],
      ['overlay/sunburst.js', "low = Math.min(1, TimbreHelix.heard('bass', micBands) * cfgGain);"]],
    old: (t) => Math.min(1, avg(t.f, 0, 4)), new: (t) => Math.min(1, HX.heard('bass', t.b)) },
  { group: 2, name: 'high (was values 8-31 x 3)', effects: ['winter-aurora', 'the flag (five effects)'], limit: 0.10, signals: ['speech', 'speech220', 'kick'],
    mirrors: [['overlay/flag.js', 'high = Math.min(1, TimbreHelix.bandMean(frequencies, 29, 32) * cfgGain * 3);'], ['overlay/factories/winter-aurora.js', 'high = Math.min(1, TimbreHelix.bandMean(frequencies, 29, 32) * cfgGain * 3);']],
    old: (t) => Math.min(1, avg(t.f, 8, 32) * 3), new: (t) => Math.min(1, HX.bandMean(t.f, 29, 32) * 3) },
  { group: 2, name: 'high (was values 5-14 x 2.5)', effects: ['sunburst-3d'], limit: 0.10, signals: ['speech', 'speech220', 'kick'],
    mirrors: [['overlay/sunburst.js', 'high = Math.min(1, TimbreHelix.bandMean(frequencies, 24, 31) * cfgGain * 2.38);']],
    old: (t) => Math.min(1, avg(t.f, 5, 15) * 2.5), new: (t) => Math.min(1, HX.bandMean(t.f, 24, 31) * 2.38) },
  { group: 2, name: 'overall loudness (was all 32 values)', effects: ['matrix', 'tunnel', 'vaporwave'], limit: 0.10, signals: ['speech', 'speech220', 'kick'],
    mirrors: [['overlay/factories/matrix.js', "loudness = TimbreHelix.heard('all', micBands) * cfgGain;"], ['overlay/factories/tunnel.js', "loudness = TimbreHelix.heard('all', micBands) * cfgGain;"],
      ['overlay/factories/vaporwave.js', "return TimbreHelix.heard('all', micBands) * cfgGain;"]],
    old: (t) => avg(t.f, 0, 32), new: (t) => HX.heard('all', t.b) },

  // Group 3: the scene modules' loudness(bins, band, gain) = min(1, bins[band] / 255 × gain), now of the slices.
  ...Array.from({ length: 10 }, (_, k) => ({ group: 3, name: `loudness of value ${k}, now slice ${k}`, effects: modulesFor(k), limit: 0.10,
    old: (t) => Math.min(1, t.f[k] / 255), new: (t) => Math.min(1, slice(t, k) / 255) })),

  // Group 5: the seasonal effects' bandAverage(lo, hi), now of the slices.
  { group: 5, name: 'bandAverage(0, 0.18): values 0-4', effects: SEASONAL, limit: 0.10, old: (t) => avg(t.f, 0, 5), new: (t) => sliceAvg(t, 0, 5) },
  { group: 5, name: 'bandAverage(0.18, 0.55): values 5-16', effects: SEASONAL.filter((n) => n !== 'autumn-leaves' && n !== 'new-year-fireworks'), limit: 0.10, old: (t) => avg(t.f, 5, 17), new: (t) => sliceAvg(t, 5, 17) },
  { group: 5, name: 'bandAverage(0.55, 1): values 17-31', effects: SEASONAL, limit: 0.10, old: (t) => avg(t.f, 17, 32), new: (t) => sliceAvg(t, 17, 32) },

  // Group 6: the scene kit's level.
  { group: 6, name: "the scene kit's level", effects: ['every kit scene (20 effects)'], limit: 0.05,
    mirrors: [['overlay/scene-kit.js', 'if (bands) return Math.min(1, bands.level * cfgGain);']],
    old: (t) => Math.min(1, Math.max(rms64(t.w) * 3, avg(t.f, 0, 6) * 1.1)), new: (t) => (t.b ? Math.min(1, t.b.level) : NaN) },

  // Group 7: the chladni plate's tone, which picks its figure (0 where the sound has none). It was where the weight
  // of slices 0 to 15 sat, 0 at 0.4 and 1 at 3; it is where the weight of log bands 0 to 11 sits, as toneOf() has it.
  // Different on purpose, so it has no limit: `--steps state --only chladni --watch tone,want,figure` shows what it does.
  { group: 7, name: "chladni's tone (was slices 0-15, now log bands 0-11)", effects: ['chladni'],
    mirrors: [['overlay/chladni.js', 'if (micActive) { for (let b = 0; b < BANDS; b++) bands[b] = loudness(frequencies, b, 1); heard = toneOf(bands, cfgGain); }']],
    old: (t) => { if (!t.s) return NaN; let sum = 0, moment = 0; for (let b = 0; b < 16; b++) { const w = (t.s[b] / 255) ** 2; sum += w; moment += b * w; } return sum > 0.02 ? clamp01((moment / sum - 0.4) / 2.6) : 0; },
    new: (t) => Math.max(0, PLATE.toneOf(Float32Array.from({ length: PLATE.BANDS }, (_, b) => PLATE.loudness(t.f, b, 1)))) },

  // Group 8: the phosphor's ten bands, which shape its traces. Band b was slice b; it is the mean of a run of log bands
  // (runOf(b)) times BAND_GAIN, as its loudness() has it. Each band is different on purpose, so it has no limit. Their
  // total, each band times its weight() (the sum in shape()), is held to a tenth of what it was under the two voices.
  // `--steps state --only phosphor --watch now,flame,kick,stands,heard --frames` reads the bands as the scene follows them.
  ...Array.from({ length: DECK.K }, (_, b) => ({ group: 8, name: `phosphor's band ${b} (was slice ${b}, now log bands ${DECK.runOf(b)[0]}-${DECK.runOf(b)[1] - 1})`, effects: ['phosphor'],
    old: (t) => (t.s ? Math.min(1, t.s[b] / 255) : NaN), new: (t) => DECK.loudness(t.f, b, 1) })),
  { group: 8, name: "phosphor's bands, each times its weight, added", effects: ['phosphor'], limit: 0.10, signals: ['speech', 'speech220'],
    mirrors: [['overlay/phosphor.js', 'if (micActive) v = loudness(frequencies, b, cfgGain);']],
    old: (t) => { if (!t.s) return NaN; let sum = 0; for (let b = 0; b < DECK.K; b++) sum += Math.min(1, t.s[b] / 255) * DECK.weight(b); return sum; },
    new: (t) => { let sum = 0; for (let b = 0; b < DECK.K; b++) sum += DECK.loudness(t.f, b, 1) * DECK.weight(b); return sum; } },
];

// Group 4: the bar and spectrum effects. Each lays `count` bars over the spectrum; `gain` is
// the LOG_GAIN constant of its file (read out of the file by the tool).
export const barEffects = [
  { name: 'visualizer', file: 'overlay/factories/visualizer.js', count: 20, what: '20 bars (the default)', mirrors: 'value = TimbreHelix.spread(frequencies, i, numBars) * LOG_GAIN * cfgGain;', oldIndex: (i) => i },
  { name: 'peak-hold', file: 'overlay/factories/peak-hold.js', count: 20, what: '20 bars (the default)', mirrors: 'value = TimbreHelix.spread(frequencies, i, numBars) * LOG_GAIN * cfgGain;', oldIndex: (i) => i },
  { name: 'sine-bars', file: 'overlay/factories/sine-bars.js', count: 20, what: '20 bars (the default)', mirrors: 'value = TimbreHelix.spread(frequencies, i, numBars) * LOG_GAIN * cfgGain;', oldIndex: (i) => i },
  { name: 'ring-bars', file: 'overlay/factories/ring-bars.js', count: 15, what: '15 spokes a side (30 spokes, the default)', mirrors: 'return TimbreHelix.spread(frequencies, Math.min(offset, Math.ceil(half) - 1), half) * LOG_GAIN * cfgGain;', oldIndex: (i) => Math.min(31, Math.floor(i / 15 * 32)) },
  { name: 'spectrogram', file: 'overlay/factories/spectrogram.js', count: 32, what: '32 rows', mirrors: 'return frequencies.map(v => Math.min(255, v * LOG_GAIN * cfgGain));', oldIndex: (i) => i },
  { name: 'tunnel', file: 'overlay/factories/tunnel.js', count: 14, what: '14 rails', mirrors: 'return Math.min(1, (TimbreHelix.spread(frequencies, s, STREAKS) / 255) * LOG_GAIN * cfgGain);', oldIndex: (i) => Math.min(31, Math.floor(i * 32 / 14)) },
  { name: 'peaks-mirror', file: 'overlay/factories/peaks-mirror.js', count: 11, what: '11 columns a side', mirrors: 'const v = TimbreHelix.spread(frequencies, dist, mid + 0.5) / 255 * LOG_GAIN * cfgGain;', oldIndex: (i) => Math.min(31, Math.floor(i / 10 * 31)) },
  { name: 'mountains-2d', file: 'overlay/factories/mountains-2d.js', count: 11, what: '11 columns a side', mirrors: 'const v = TimbreHelix.spread(frequencies, dist, mid + 0.5) / 255 * LOG_GAIN * cfgGain;', oldIndex: (i) => Math.min(31, Math.floor(i / 10 * 31)) },
  { name: 'vaporwave', file: 'overlay/factories/vaporwave.js', count: 11, what: '11 columns a side', mirrors: 'const v = TimbreHelix.spread(frequencies, dist, mid + 0.5) / 255 * LOG_GAIN * cfgGain;', oldIndex: (i) => Math.min(31, Math.floor(i / 10 * 31)) },
];
export const barValues = (t, effect, gain) => Array.from({ length: effect.count }, (_, i) => Math.min(255, HX.spread(t.f, i, effect.count) * gain));
export const oldBarValues = (t, effect) => Array.from({ length: effect.count }, (_, i) => t.f[effect.oldIndex(i)]);

// Every line of an effect this file mirrors: [file, text].
export const mirrored = [...readers.flatMap((r) => r.mirrors || []), ...barEffects.map((e) => [e.file, e.mirrors])];

// The scene kit's own beat detector, as it ran on every frame before the sampler found the
// beats: at 60 frames a second over the old level. Returns the beats' times, in seconds.
export function kitBeats(ticks) {
  const level = readers.find((r) => r.group === 6).old;
  let average = 0, seeded = false, last = -Infinity; const at = [];
  const frames = Math.floor(ticks[ticks.length - 1].t * 60);
  for (let frame = 0; frame < frames; frame++) {
    const ms = frame * 1000 / 60, t = ticks[Math.min(ticks.length - 1, Math.max(0, Math.floor(ms / 33) - 1))], lv = level(t);
    if (!seeded) { average = lv; seeded = true; }
    if (lv > average * 1.35 + 0.07 && ms - last >= 220) { at.push((ms / 1000).toFixed(2)); last = ms; }
    average += (lv - average) * (1 - Math.exp(-2 / 60));
  }
  return at;
}
