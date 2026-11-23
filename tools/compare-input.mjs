// Development tool: what a change to the audio input does to every effect.
//
// It feeds the same recorded signals, sample for sample, to two builds of the overlay (a git
// ref, "old", and the working tree, "new") and reports, per effect, the levels each reader
// derives from the sound and the pixels that differ.
//
//   node tools/compare-input.mjs [--ref <git ref>] [--out <folder>] [--steps a,b,...]
//                                [--signals a,b,...] [--only effect,effect,...] [--db]
//
//   --ref      the old build (default: HEAD). Its overlay/ and shared/ are read out of git.
//   --out      where everything is written (default: a folder in the system's temp folder).
//   --steps    record, levels, render, floor, compare, sheets, expect (default: the first five but floor)
//                record   traces/<build>-<signal>.json: what each sampler published per look
//                levels   levels.txt: the 32 values and every reader's derived level, old against new
//                render   shots/<effect>/<signal>-t<time>-<build>.png and numbers.json
//                floor    the old build rendered a second time (how much two runs of the same
//                         build differ: the noise under the comparison)
//                compare  compare.txt and compare.json: per effect the share of pixels that
//                         differ and the change in light, sorted from most changed to least
//                sheets   sheets/<effect>.png: old on the left, new on the right, the first
//                         picture signal above the second
//                expect   writes tools/input-expectations.json from this run's record and render
//                         of the working tree: the numbers verify-render.mjs holds the guarded
//                         effects to (GUARD in tools/input-replay.mjs). Run it, with record and
//                         render, only after a look was changed on purpose, and say so.
//   --signals  which signals (default: all six for record and levels; speech and kick for pictures)
//   --only     only these effects, for render, compare and sheets
//   --db       record also keeps the fine spectrum of every look (large files; for fitting)
//
// It serves the pages itself on the suites' side port (7476) and nothing listens on 8090,
// so it must not run while a suite or the mock does. It never touches 8080 or 7474.
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { SIGNALS, SECONDS, TIMES, GUARD, signalInit, recordInPage, replayInPage, soundSummary } from './input-replay.mjs';
import { readers, kitBeats, barEffects, barValues, oldBarValues, mirrored } from './input-readers.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 7476, WS_PORT = 8090;
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i < 0 ? fallback : args[i + 1]; };
const list = (name, fallback) => { const v = opt(name, null); return v ? v.split(',').filter(Boolean) : fallback; };
const REF = opt('ref', 'HEAD');
const OUT = resolve(opt('out', resolve(tmpdir(), 'timbre-compare-input')));
const STEPS = list('steps', ['record', 'levels', 'render', 'compare', 'sheets']);
const ALL_SIGNALS = list('signals', SIGNALS);
const PICTURE_SIGNALS = list('signals', ['speech', 'kick']).filter((s) => TIMES[s]);
const ONLY = list('only', null);
const WITH_DB = args.includes('--db');
for (const s of ALL_SIGNALS) if (!SIGNALS.includes(s)) { console.error('unknown signal ' + s); process.exit(1); }

await import('file:///' + resolve(ROOT, 'shared/viz-config.js').replace(/\\/g, '/'));
const NAMES = globalThis.TIMBRE.ACTIVE_VIZ_NAMES.filter((n) => !ONLY || ONLY.includes(n));
const USES_3D = new Set(globalThis.TIMBRE.VIZ_USES_3D);

// ── The two builds ───────────────────────────────────────────────────────────
const git = (...a) => execFileSync('git', ['-c', 'core.autocrlf=false', ...a], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
let oldFiles = null;
function loadOld() {
  if (oldFiles) return oldFiles;
  oldFiles = new Map();
  const names = git('ls-tree', '-r', '--name-only', REF, 'overlay', 'shared').toString('utf8').split('\n').filter(Boolean);
  for (const name of names) oldFiles.set(name, git('show', `${REF}:${name}`));
  return oldFiles;
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.woff2': 'application/octet-stream', '.txt': 'text/plain' };
let serving = 'new';
function portAnswers(port) {
  return new Promise((done) => { const s = connect({ port, host: '127.0.0.1' }); s.once('connect', () => { s.destroy(); done(true); }); s.once('error', () => done(false)); });
}
async function startServer() {
  if (await portAnswers(PORT) || await portAnswers(WS_PORT)) throw new Error(`something already answers on 127.0.0.1:${PORT} or :${WS_PORT} (a suite, the mock, or this tool). Stop it and run again.`);
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const m = /^\/timbre-(overlay|shared)\/(.+)$/.exec(path);
      if (!m || m[2].includes('..')) { res.writeHead(404); res.end('no'); return; }
      const rel = `${m[1]}/${m[2]}`;
      const body = serving === 'old' ? loadOld().get(rel) : await readFile(resolve(ROOT, rel));
      if (!body) { res.writeHead(404); res.end('no'); return; }
      res.writeHead(200, { 'content-type': MIME[extname(rel).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end('no'); }
  });
  await new Promise((ok, no) => { server.once('error', no); server.listen(PORT, '127.0.0.1', ok); });
  return server;
}
async function launch() {
  for (const channel of ['msedge', 'chrome']) { try { return await chromium.launch({ headless: true, channel }); } catch {} }
  return chromium.launch({ headless: true });
}
const pageUrl = `http://127.0.0.1:${PORT}/timbre-overlay/mic-visualizers-1920x1080.html?sbport=${WS_PORT}`;
const tracePath = (build, signal) => resolve(OUT, 'traces', `${build}-${signal}.json`);
const loadTrace = (build, signal) => JSON.parse(readFileSync(tracePath(build, signal), 'utf8'));
const shotPath = (name, signal, t, build) => resolve(OUT, 'shots', name, `${signal}-t${t.toFixed(2)}-${build}.png`);

// ── record ───────────────────────────────────────────────────────────────────
async function record(browser) {
  await mkdir(resolve(OUT, 'traces'), { recursive: true });
  for (const build of ['old', 'new']) for (const signal of ALL_SIGNALS) {
    serving = build;
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.addInitScript(signalInit, { signal, seconds: SECONDS });
    await page.goto(pageUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__input.sampler && window.__input.ctx, null, { timeout: 8000 });
    const trace = await page.evaluate(recordInPage, { db: WITH_DB });
    await writeFile(tracePath(build, signal), JSON.stringify(trace));
    console.log(`recorded ${build} ${signal}: ${trace.ticks.length} looks; peak ${trace.stats.peak.toFixed(3)}, rms ${trace.stats.rms.toFixed(4)}; microphone asked for with ${trace.asked.join(' | ')}${errors.length ? ' ERRORS ' + errors.join(' | ') : ''}`);
    await context.close();
  }
}

// ── levels ───────────────────────────────────────────────────────────────────
// The LOG_GAIN constant of a bar effect's file.
function logGain(file) {
  const m = /const LOG_GAIN = ([\d.]+);/.exec(readFileSync(resolve(ROOT, file), 'utf8'));
  if (!m) throw new Error('no LOG_GAIN in ' + file);
  return Number(m[1]);
}
const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const p95 = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length * 0.95)] || 0;
async function levels() {
  const lines = [], json = {};
  for (const [file, text] of mirrored) if (!readFileSync(resolve(ROOT, file), 'utf8').includes(text)) lines.push(`WARNING: ${file} no longer holds the line tools/input-readers.mjs mirrors: ${text}`);
  const say = (s = '') => lines.push(s);
  const edges = Array.from({ length: 33 }, (_, k) => 60 * Math.pow(200, k / 32));
  for (const signal of ALL_SIGNALS) {
    const o = loadTrace('old', signal).ticks, n = loadTrace('new', signal).ticks;
    say(`\n=== ${signal} ===`);
    say('idx | old value (centre Hz)   mean  max | new slice  mean  max   worst gap  mean gap | new band (Hz)      mean  max');
    for (let i = 0; i < 32; i++) {
      const om = mean(o.map((t) => t.f[i])), ox = Math.max(...o.map((t) => t.f[i]));
      const sm = n[0].s ? mean(n.map((t) => t.s[i])) : NaN, sx = n[0].s ? Math.max(...n.map((t) => t.s[i])) : NaN;
      const gaps = n[0].s ? n.map((t, k) => Math.abs(t.s[i] - o[k].f[i])) : [NaN];
      const nm = mean(n.map((t) => t.f[i])), nx = Math.max(...n.map((t) => t.f[i]));
      say(`${String(i).padStart(2)}  | ${String(i * 750).padStart(18)} ${om.toFixed(1).padStart(7)} ${String(ox).padStart(4)} | ${sm.toFixed(1).padStart(15)} ${String(sx).padStart(4)} ${Math.max(...gaps).toFixed(0).padStart(10)} ${mean(gaps).toFixed(1).padStart(9)} | ${edges[i].toFixed(0).padStart(5)}-${edges[i + 1].toFixed(0).padEnd(5)} ${nm.toFixed(1).padStart(8)} ${String(nx).padStart(4)}`);
    }
    say('');
    say('group  reader                                              old mean  old p95 | new mean  new p95 |  change   limit  verdict');
    json[signal] = { readers: [], beats: null, bars: [] };
    for (const r of readers) {
      const a = o.map((t) => r.old(t)), b = n.map((t) => r.new(t));
      const ma = mean(a), mb = mean(b), change = ma > 0.005 ? (mb - ma) / ma : (mb > 0.005 ? Infinity : 0);
      const judged = r.limit != null && (!r.signals || r.signals.includes(signal));
      const verdict = !judged ? '' : Math.abs(change) <= r.limit + 1e-9 ? 'within' : 'MISS';
      json[signal].readers.push({ group: r.group, name: r.name, effects: r.effects, old: ma, new: mb, oldP95: p95(a), newP95: p95(b), change, limit: judged ? r.limit : null, verdict });
      say(`${String(r.group).padEnd(6)} ${r.name.padEnd(50)} ${ma.toFixed(3).padStart(8)} ${p95(a).toFixed(3).padStart(8)} | ${mb.toFixed(3).padStart(8)} ${p95(b).toFixed(3).padStart(8)} | ${(Number.isFinite(change) ? (change >= 0 ? '+' : '') + (change * 100).toFixed(1) + '%' : 'new').padStart(7)} ${(judged ? (r.limit * 100).toFixed(0) + '%' : '').padStart(7)}  ${verdict}`);
    }
    if (n[0].b) {
      say('');
      for (const k of ['bass', 'mid', 'treble', 'rms', 'centroid', 'level']) say(`new micBands.${k.padEnd(9)} mean ${mean(n.map((t) => t.b[k])).toFixed(3)}  p95 ${p95(n.map((t) => t.b[k])).toFixed(3)}`);
      const nb = n.filter((t) => t.b.beat).map((t) => t.t.toFixed(2)), ob = kitBeats(o);
      say(`beats, new (the sampler's count): ${nb.length} at ${nb.join(' ')}`);
      say(`beats, old (the scene kit's own detector at 60 fps on the old level): ${ob.length} at ${ob.join(' ')}`);
      say(`beats: ${nb.length === ob.length ? 'the same number' : 'NOT the same number'}`);
      json[signal].beats = { old: ob, new: nb };
    }
    // Group 4: what the bars read (their light is judged on the pictures, by the compare step).
    say('');
    say('group 4: the bars                                   old mean height | new mean height | brightest bar, start to end of the signal (old | new)');
    for (const e of barEffects) {
      const gain = logGain(e.file);
      const a = o.map((t) => mean(oldBarValues(t, e)) / 255), b = n.map((t) => mean(barValues(t, e, gain)) / 255);
      const top = (values) => values.indexOf(Math.max(...values));
      const path = (ticks, fn) => [10, 45, 90, 135, 170].map((k) => { const v = fn(ticks[Math.min(ticks.length - 1, k)]); return Math.max(...v) > 0 ? top(v) : '-'; }).join(' ');
      const row = { name: e.name, what: e.what, gain, old: mean(a), new: mean(b), oldPath: path(o, (t) => oldBarValues(t, e)), newPath: path(n, (t) => barValues(t, e, gain)) };
      if (signal === 'sweep') {
        // Under the rising tone the brightest bar must go from the first bar to the last and never back.
        const tops = n.map((t) => barValues(t, e, gain)).filter((v) => Math.max(...v) > 0).map(top);
        row.sweep = tops[0] === 0 && tops[tops.length - 1] === e.count - 1 && tops.every((v, k) => k === 0 || v >= tops[k - 1]);
        row.sweepSeen = new Set(tops).size;
      }
      json[signal].bars.push(row);
      say(`4      ${(e.name + ', ' + e.what + ', gain ' + gain).padEnd(58)} ${row.old.toFixed(3).padStart(8)} | ${row.new.toFixed(3).padStart(8)}        | ${row.oldPath}  |  ${row.newPath}${signal === 'sweep' ? (row.sweep ? `   first to last, never back (${row.sweepSeen} of ${e.count} bars were the brightest in turn)` : '   NOT first to last') : ''}`);
    }
  }
  await writeFile(resolve(OUT, 'levels.txt'), lines.join('\n') + '\n');
  await writeFile(resolve(OUT, 'levels.json'), JSON.stringify(json, null, 1));
  console.log(lines.join('\n'));
}

// ── render ───────────────────────────────────────────────────────────────────
async function render(browser, runAs) {
  const build = runAs === 'old2' ? 'old' : runAs;
  serving = build;
  const numbersFile = resolve(OUT, 'numbers.json');
  const numbers = existsSync(numbersFile) ? JSON.parse(readFileSync(numbersFile, 'utf8')) : {};
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  let page = null;
  const open = async () => {
    if (page) await page.close().catch(() => {});
    page = await context.newPage();
    page.on('pageerror', (e) => console.log('  pageerror:', String(e).slice(0, 200)));
    await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => new Promise(() => {}); });   // no microphone: the tool feeds the sound
    await page.goto(pageUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__timbre && typeof currentViz !== 'undefined' && currentViz, null, { timeout: 15000 });
  };
  await open();
  const failures = [];
  for (const signal of PICTURE_SIGNALS) {
    const ticks = loadTrace(build, signal).ticks.map(({ t, f, w, p, b, s }) => ({ t, f, w, p, b, s }));
    for (const name of NAMES) {
      await mkdir(resolve(OUT, 'shots', name), { recursive: true });
      let res = null;
      for (let attempt = 0; attempt < 2 && !res; attempt++) {
        try { res = await page.evaluate(replayInPage, { name, ticks, times: TIMES[signal], fps: 60, pictures: true }); }
        catch (e) { console.log(`  ${name} ${signal}: ${String(e).slice(0, 200)} (attempt ${attempt + 1})`); await open(); }
      }
      if (!res || res.frames.length !== TIMES[signal].length) { failures.push(`${name} ${signal}`); continue; }
      for (let i = 0; i < res.frames.length; i++) await writeFile(shotPath(name, signal, TIMES[signal][i], runAs), Buffer.from(res.frames[i].png.split(',')[1], 'base64'));
      ((numbers[name] = numbers[name] || {})[signal] = numbers[name][signal] || {})[runAs] = res.frames.map(({ light, lit, grid }) => ({ light, lit, grid }));
      console.log(`rendered ${runAs} ${signal} ${name}: ${res.size.join('x')}, ${Math.round(res.ms)} ms`);
    }
  }
  await context.close();
  await writeFile(numbersFile, JSON.stringify(numbers));
  if (failures.length) console.log('NOT CAPTURED: ' + failures.join(', '));
}

// ── compare ──────────────────────────────────────────────────────────────────
function decodePng(file) {
  const b = readFileSync(file); let p = 8, w = 0, h = 0, type = 0; const idat = [];
  while (p < b.length) { const len = b.readUInt32BE(p), kind = b.toString('latin1', p + 4, p + 8), data = b.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; if (data[8] !== 8 || (type !== 6 && type !== 2) || data[12] !== 0) throw new Error('png kind ' + file); }
    else if (kind === 'IDAT') idat.push(data);
    p += 12 + len; }
  const bpp = type === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = y * stride, src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[row + x - bpp] : 0, up = y ? out[row - stride + x] : 0, c = x >= bpp && y ? out[row - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pa = Math.abs(up - c), pb = Math.abs(a - c), pc = Math.abs(a + up - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[row + x] = v & 255;
    }
  }
  return { w, h, bpp, px: out };
}
// The share of pixels whose red, green or blue differs by more than 8 of 255, and each frame's light.
function diff(A, B) {
  if (A.w !== B.w || A.h !== B.h) return { share: 1, lightA: 0, lightB: 0, litA: 0, litB: 0 };
  let n = 0, la = 0, lb = 0, litA = 0, litB = 0;
  for (let i = 0, j = 0, k = 0; k < A.w * A.h; k++, i += A.bpp, j += B.bpp) {
    const a = A.px[i] + A.px[i + 1] + A.px[i + 2], b = B.px[j] + B.px[j + 1] + B.px[j + 2];
    if (Math.abs(A.px[i] - B.px[j]) > 8 || Math.abs(A.px[i + 1] - B.px[j + 1]) > 8 || Math.abs(A.px[i + 2] - B.px[j + 2]) > 8) n++;
    la += a; lb += b; if (a > 24) litA++; if (b > 24) litB++;
  }
  return { share: n / (A.w * A.h), lightA: la, lightB: lb, litA: litA / (A.w * A.h), litB: litB / (A.w * A.h) };
}
async function compare() {
  const rows = [];
  for (const name of NAMES) {
    const row = { name, gl: USES_3D.has(name) };
    for (const signal of PICTURE_SIGNALS) {
      let share = 0, worst = 0, la = 0, lb = 0, litA = 0, litB = 0, floor = 0, got = 0, hasFloor = true;
      for (const t of TIMES[signal]) {
        const f = (v) => shotPath(name, signal, t, v);
        if (!existsSync(f('old')) || !existsSync(f('new'))) continue;
        const o = decodePng(f('old')), n = decodePng(f('new')), d = diff(o, n);
        share += d.share; worst = Math.max(worst, d.share); la += d.lightA; lb += d.lightB; litA += d.litA; litB += d.litB; got++;
        if (existsSync(f('old2'))) floor += diff(o, decodePng(f('old2'))).share; else hasFloor = false;
      }
      row[signal] = got ? { share: share / got, worst, light: la ? (lb - la) / la : (lb ? Infinity : 0), litOld: litA / got, litNew: litB / got, floor: hasFloor ? floor / got : null, frames: got } : null;
    }
    rows.push(row);
  }
  const key = (r) => mean(PICTURE_SIGNALS.map((s) => (r[s] ? r[s].share : 0)));
  rows.sort((a, b) => key(b) - key(a));
  await writeFile(resolve(OUT, 'compare.json'), JSON.stringify(rows, null, 1));
  const pct = (v) => (v === null || v === undefined ? '  n/a' : (v * 100).toFixed(1).padStart(5) + '%');
  const sgn = (v) => (!Number.isFinite(v) ? '  new' : (v >= 0 ? '+' : '') + (v * 100).toFixed(0) + '%').padStart(6);
  const lines = ['px>8: the share of pixels whose red, green or blue differs by more than 8 of 255, the mean over the frames looked at.',
    'light: the change in total light. lit: the share of pixels that are not dark. floor: the same share between two runs of the old build.', '',
    'effect                    kind | ' + PICTURE_SIGNALS.map((s) => `${s}: px>8  light   lit old→new  floor`).join(' | ')];
  for (const r of rows) {
    const c = (s) => (s ? `${pct(s.share)} ${sgn(s.light)}  ${pct(s.litOld)}→${pct(s.litNew)} ${pct(s.floor)}` : 'missing');
    lines.push(`${r.name.padEnd(25)} ${r.gl ? 'GL' : '2D'}   | ${PICTURE_SIGNALS.map((s) => c(r[s])).join(' | ')}`);
  }
  await writeFile(resolve(OUT, 'compare.txt'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
}

// ── sheets ───────────────────────────────────────────────────────────────────
async function sheets(browser) {
  await mkdir(resolve(OUT, 'sheets'), { recursive: true });
  const two = PICTURE_SIGNALS.slice(0, 2);
  const page = await browser.newPage();
  for (const name of NAMES) {
    const cells = [];
    for (const signal of two) {
      const t = TIMES[signal][Math.min(1, TIMES[signal].length - 1)];
      for (const v of ['old', 'new']) {
        if (!existsSync(shotPath(name, signal, t, v))) continue;
        cells.push({ label: `${name} | ${signal} t=${t.toFixed(2)}s | ${v === 'old' ? 'old (' + REF + ')' : 'new'}`, url: 'data:image/png;base64,' + readFileSync(shotPath(name, signal, t, v)).toString('base64') });
      }
    }
    if (cells.length !== two.length * 2) { console.log(`  no sheet for ${name}: pictures missing`); continue; }
    const png = await page.evaluate(async (cells) => {
      const c = document.createElement('canvas'); c.width = 1728; c.height = 312 * (cells.length / 2); const x = c.getContext('2d');
      for (let i = 0; i < cells.length; i++) {
        const img = new Image(); img.src = cells[i].url; await img.decode();
        const cx = (i % 2) * 864, cy = Math.floor(i / 2) * 312;
        x.drawImage(img, cx, cy, 864, 312);
        x.strokeStyle = '#555'; x.strokeRect(cx + 0.5, cy + 0.5, 863, 311);
        x.font = '16px sans-serif'; x.fillStyle = '#000'; x.fillRect(cx + 4, cy + 4, x.measureText(cells[i].label).width + 8, 22); x.fillStyle = '#fff'; x.fillText(cells[i].label, cx + 8, cy + 21);
      }
      return c.toDataURL('image/png');
    }, cells);
    await writeFile(resolve(OUT, 'sheets', `${name}.png`), Buffer.from(png.split(',')[1], 'base64'));
  }
  await page.close();
  console.log('sheets in ' + resolve(OUT, 'sheets'));
}

// ── expect ───────────────────────────────────────────────────────────────────
async function expect() {
  const numbers = JSON.parse(readFileSync(resolve(OUT, 'numbers.json'), 'utf8'));
  const at = TIMES[GUARD.signal].indexOf(GUARD.time), round = (v) => Math.round(v * 100000) / 100000;
  const lines = [];
  for (const name of GUARD.effects) {
    const frame = numbers[name] && numbers[name][GUARD.signal] && numbers[name][GUARD.signal].new && numbers[name][GUARD.signal].new[at];
    if (!frame) throw new Error(`no rendered frame of ${name} under ${GUARD.signal}: run the record and render steps first, without --only or with it naming every guarded effect`);
    lines.push(`    ${JSON.stringify(name)}: ${JSON.stringify({ light: round(frame.light), lit: round(frame.lit), grid: frame.grid.map(round) })}`);
  }
  const text = `{
  "note": "Written by: node tools/compare-input.mjs --steps record,render,expect. A frame of each guarded effect (GUARD in tools/input-replay.mjs) on the 1920x1080 page with no config pushed, ${GUARD.time} s into the recorded '${GUARD.signal}' signal: light is the mean of red + green + blue over the frame (0 black, 1 white), lit the share of pixels that are not dark, grid the same mean in ${GUARD.cols} x ${GUARD.rows} cells, row by row. sound is what the sampler published over the recording.",
  "signal": ${JSON.stringify(GUARD.signal)}, "time": ${GUARD.time}, "cols": ${GUARD.cols}, "rows": ${GUARD.rows},
  "sound": ${JSON.stringify(soundSummary(loadTrace('new', GUARD.signal).ticks))},
  "effects": {
${lines.join(',\n')}
  }
}
`;
  await writeFile(resolve(ROOT, 'tools/input-expectations.json'), text.replace(/\n/g, '\r\n'));
  console.log('wrote tools/input-expectations.json for ' + GUARD.effects.length + ' effects');
}

// ── run ──────────────────────────────────────────────────────────────────────
await mkdir(OUT, { recursive: true });
const needsPages = STEPS.some((s) => ['record', 'render', 'floor'].includes(s)), needsBrowser = needsPages || STEPS.includes('sheets');
let server = null, browser = null;
try {
  if (needsPages) { loadOld(); server = await startServer(); }
  if (needsBrowser) browser = await launch();
  if (STEPS.includes('record')) await record(browser);
  if (STEPS.includes('levels')) await levels();
  if (STEPS.includes('render')) { await render(browser, 'old'); await render(browser, 'new'); }
  if (STEPS.includes('floor')) await render(browser, 'old2');
  if (STEPS.includes('compare')) await compare();
  if (STEPS.includes('sheets')) await sheets(browser);
  if (STEPS.includes('expect')) await expect();
  console.log('\nwritten to ' + OUT);
} catch (e) {
  console.error(e); process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) await new Promise((r) => server.close(r));
}
