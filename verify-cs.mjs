// Timbre verify:cs — compiles the REAL actions/timbre-push.cs with the Windows C#
// compiler and runs its logic against a stand-in for `CPH` (tools/cs/CphStub.cs).
// Without this, no check executes the C# at all; the mock only mirrors it.
//
//   node verify-cs.mjs        (or: npm run verify:cs)
//
// Windows only: it needs csc.exe from the .NET Framework (set CSC to override the
// path). Elsewhere it says so and checks nothing. It is not part of `npm run verify`.
//
// It proves the action compiles as C# 5 against mscorlib alone and that it accepts,
// rejects, stores and broadcasts as the checks say. The table of what is accepted and what
// is refused is tools/cs/push-cases.json; verify.mjs runs the same table against the mock's
// mirror of the action. It does not replace compiling it in
// Streamer.bot, whose own compiler and reference set have the final say.
//
// The program is built into tools/cs/build/ (ignored by git), not the system temp
// folder, and is started ONCE for all the cases: an antivirus can remove a freshly
// compiled program between runs. If it cannot be started, the error is printed.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPushCases } from './tools/cs/push-cases.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CSC = process.env.CSC || 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const BUILD = join(ROOT, 'tools', 'cs', 'build');
const ACTION = 'timbre-push.cs';

console.log('Timbre — the C# action, compiled and run\n');
if (!existsSync(CSC)) {
  console.log(`SKIPPED: no C# compiler at ${CSC} (Windows with the .NET Framework is needed; set CSC to its path). The C# was not compiled and nothing was checked.`);
  process.exit(0);
}

let pass = 0, fail = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name + (detail ? ' — ' + detail : '')); }
}
function stop(message) {
  console.error('\n' + message);
  console.log(`\n${pass}/${pass + fail + 1} passed — STOPPED`);
  process.exit(1);
}

// ── Build: the stub, the harness and the action as it is in the repo ─────────
// Streamer.bot injects the `CPH` member itself; here the class is given a field of
// the stub's type. Nothing else in the action's text is changed.
rmSync(BUILD, { recursive: true, force: true });
mkdirSync(BUILD, { recursive: true });
let src = readFileSync(join(ROOT, 'actions', ACTION), 'utf8').replace(/\r\n/g, '\n');
const marker = 'public class CPHInline\n{';
if (!src.includes(marker)) stop(ACTION + ' does not declare `public class CPHInline`; the harness cannot give it a CPH.');
src = src.replace(marker, marker + '\n    public CphStub CPH;');
const actionPath = join(BUILD, ACTION), exe = join(BUILD, 'timbre-push.exe');
writeFileSync(actionPath, src, 'utf8');
// /noconfig: no default reference list, so only mscorlib is available.
const built = spawnSync(CSC, ['/nologo', '/noconfig', '/codepage:65001', '/warnaserror-', '/target:exe', '/out:' + exe,
  join(ROOT, 'tools', 'cs', 'CphStub.cs'), join(ROOT, 'tools', 'cs', 'Harness.cs'), actionPath], { encoding: 'utf8' });
if (built.error) stop('The compiler could not be started: ' + built.error.message);
ok(built.status === 0 && existsSync(exe), 'timbre-push.cs compiles as C# 5 with mscorlib alone', (built.stdout || '') + (built.stderr || ''));
if (built.status !== 0 || !existsSync(exe)) stop('Nothing was run: the action did not compile.');
ok(!/warning CS/.test((built.stdout || '') + (built.stderr || '')), 'and the compiler gives no warning', (built.stdout || '') + (built.stderr || ''));

// ── What a full config is, and the table this file and verify.mjs both run ───
await import('./shared/viz-config.js');
const T = globalThis.TIMBRE;
const table = loadPushCases(T);
const { wire, errorWire } = table;
const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');
const parsed = (text) => { try { return JSON.parse(text); } catch { return undefined; } };
const stored = (r) => r.g['timbre.config'];

// The action's own list of the keys a push must carry, read from its text. It is a list
// written out in the C#, so it can go stale; this is where that shows. (The table adds a
// row for each key of defaultConfig() too: the compiled action must refuse a config
// without it, and take a config with them all.)
{
  const m = /static readonly string\[\] RequiredKeys =\s*\{([^}]*)\}/.exec(src);
  const listed = m ? (m[1].match(/"[^"]*"/g) || []).map((q) => JSON.parse(q)) : null;
  ok(!!listed && listed.join() === table.requiredKeys.join(),
    `RequiredKeys in timbre-push.cs is the list of the top-level keys of TIMBRE.defaultConfig() in shared/viz-config.js, in its order (${table.requiredKeys.length} keys)`,
    `the C# lists ${listed ? listed.join() : 'nothing that could be read'}; defaultConfig() has ${table.requiredKeys.join()}`);
  const cap = /const int MaxConfigChars = (\d+) \* (\d+);/.exec(src);
  ok(!!cap && Number(cap[1]) * Number(cap[2]) === table.maxChars, `MaxConfigChars in timbre-push.cs is the ${table.maxChars} of the table`);
}

// ── The cases. The first group runs in order on one state. ──────────────────
// A full config as the control panel sends it: one line of JSON, with kana, an escaped
// line break, quotes and a backslash inside its strings.
const fullWith = (change) => { const c = T.defaultConfig(); change(c); return JSON.stringify(T.sanitizeConfig(c)); };
const full = fullWith((c) => { c.activeViz = 'matrix'; c.gain = 150; c.perViz.matrix.pool = 'ｱｲｳｴｵ0123456789'; c.perViz.matrix.messages = 'HELLO\n"quoted"\\backslash'; });
const other = fullWith((c) => { c.activeViz = 'dna'; });
const partial = '{"activeViz":"waveform","gain":150}';

const cases = [
  ['a sync request with nothing stored: true, no broadcast, one info line', {},
    (r) => r.ret === true && r.bc.length === 0 && r.warn === 0 && r.info === 1 && /sync requested but no cached config yet — skipping/.test(r.log[0]) && stored(r) === undefined],
  ['the same with the reason the pages send', { reason: 'overlay-connect' },
    (r) => r.ret === true && r.bc.length === 0 && stored(r) === undefined],
  ['a full config is stored as sent and broadcast as { type:"timbre:config", config:<that text> }, the shape it always had; kana, an escaped line break, quotes and a backslash survive', { config: full },
    (r) => r.ret === true && r.warn === 0 && stored(r) === full && r.bc.length === 1 && r.bc[0] === wire(full) && JSON.stringify(parsed(r.bc[0])) === JSON.stringify({ type: 'timbre:config', config: JSON.parse(full) })
      && r.log[0] === `[Timbre Push] broadcast (${full.length} chars)`],
  ['a sync request replays the stored config', { reason: 'overlay-connect' },
    (r) => r.ret === true && r.bc.length === 1 && r.bc[0] === wire(full) && stored(r) === full],
  ['an empty config argument is a sync request', { config: '' },
    (r) => r.ret === true && r.warn === 0 && r.bc.length === 1 && r.bc[0] === wire(full)],
  ['TIM-26 and TIM-31: a partial config is refused: false, one warning that names the code and the missing keys, the stored config untouched, and ONE timbre:error broadcast with the code and its fixed message (before: stored, and broadcast as a config)', { config: partial },
    (r) => r.ret === false && r.warn === 1 && r.info === 0 && /^\[Timbre Push\] refused \(partial-config\)/.test(r.log[0]) && /missing: mic, micProcessing, bars, bounce/.test(r.log[0]) && r.log[0].includes(`(${partial.length} chars)`)
      && r.bc.length === 1 && r.bc[0] === errorWire('partial-config') && stored(r) === full],
  ['TIM-05: text in braces that is not JSON is refused as bad-config, and the log line has its length and not its text (before: stored, and spliced into a broadcast no page can parse)', { config: '{not json}' },
    (r) => r.ret === false && r.warn === 1 && /^\[Timbre Push\] refused \(bad-config\)/.test(r.log[0]) && r.log[0].includes('(10 chars)') && !r.log[0].includes('not json')
      && r.bc.length === 1 && r.bc[0] === errorWire('bad-config') && stored(r) === full],
  '#throw=timbre.config',
  ['TIM-31: an exception is caught: false, one warning with the exception in it, and one timbre:error broadcast that carries the code "exception" and a fixed message, with none of the exception\'s own words (before: its message)', { config: other },
    (r) => r.ret === false && r.warn === 1 && /^\[Timbre Push\] ERROR: System\.InvalidOperationException: stub: this write was made to fail/.test(r.log[0]) && r.bc.length === 1
      && r.bc[0] === errorWire('exception') && !/stub|quoted|InvalidOperation/.test(r.bc[0]) && stored(r) === full],
  '#throw=',
  ['after the failure the action works again', { config: other },
    (r) => r.ret === true && stored(r) === other && r.bc[0] === wire(other)],
  '#reset',
  '#global timbre.config=' + full,
  ['a config already in the global (a Streamer.bot restart) is replayed to a sync request', {},
    (r) => r.ret === true && r.bc.length === 1 && r.bc[0] === wire(full)],
  '#reset',
  '#global timbre.config={not json}',
  ['TIM-05: a saved value that is not one JSON object is not replayed: false, one warning, a timbre:error with the code bad-cache, and the value is left where it is (before: spliced into a broadcast no page can parse)', { reason: 'overlay-connect' },
    (r) => r.ret === false && r.warn === 1 && /^\[Timbre Push\] refused \(bad-cache\)/.test(r.log[0]) && !r.log[0].includes('not json') && r.bc.length === 1 && r.bc[0] === errorWire('bad-cache') && stored(r) === '{not json}'],
  ['and the next full config replaces it', { config: full },
    (r) => r.ret === true && r.warn === 0 && stored(r) === full && r.bc.length === 1 && r.bc[0] === wire(full)],
];

// The table. Each row starts from nothing: a push with `other` stored, or the row's text
// stored and then a sync request.
const tableLines = [], tableChecks = [];
for (const c of table.cases) {
  const kept = table.trim(c.text);
  tableLines.push('#reset');
  if (c.where === 'cache') {
    tableLines.push('#global64 timbre.config=' + b64(c.text), '(no args)');
    tableChecks.push([`table, ${c.name}: ${c.expect}`, null, c.expect === 'replay'
      ? (r) => r.ret === true && r.warn === 0 && r.bc.length === 1 && r.bc[0] === wire(kept) && stored(r) === c.text
      : (r) => c.expect === 'bad-cache' && r.ret === false && r.warn === 1 && r.bc.length === 1 && r.bc[0] === errorWire('bad-cache') && stored(r) === c.text]);
  } else {
    tableLines.push('#global64 timbre.config=' + b64(other), '#run64 config=' + b64(c.text));
    tableChecks.push([`table, ${c.name}: ${c.expect}${c.gap ? ' (it is not JSON, and the check does not see that)' : ''}`, null, c.expect === 'accept'
      ? (r) => r.ret === true && r.warn === 0 && r.bc.length === 1 && r.bc[0] === wire(kept) && stored(r) === kept
        && (c.gap ? parsed(r.bc[0]) === undefined : JSON.stringify(parsed(r.bc[0])) === JSON.stringify({ type: 'timbre:config', config: JSON.parse(kept) }))
      : (r) => typeof table.errors[c.expect] === 'string' && c.expect !== 'bad-cache' && r.ret === false && r.warn === 1 && r.log[0].startsWith(`[Timbre Push] refused (${c.expect})`)
        && r.bc.length === 1 && r.bc[0] === errorWire(c.expect) && stored(r) === other]);
  }
}

const line = (args) => Object.entries(args).map(([k, v]) => `${k}=${v}`).join('\t') || '(no args)';
const script = join(BUILD, 'script.txt'), out = join(BUILD, 'out.txt');
writeFileSync(script, cases.map((c) => (typeof c === 'string' ? c : line(c[1]))).concat(tableLines).join('\n') + '\n', 'utf8');

// ── One run for every case ───────────────────────────────────────────────────
const ran = spawnSync(exe, [script, out], { encoding: 'utf8' });
if (ran.error) {
  stop(`The compiled program could not be started: ${ran.error.message}\n(${exe})\n`
    + (existsSync(exe) ? 'The file is still there.' : 'The file is gone: an antivirus most likely removed it after it was compiled. Allow the folder tools/cs/build/ and run again.'));
}
if (ran.status !== 0 || !existsSync(out)) stop(`The compiled program ended with code ${ran.status} and ${existsSync(out) ? 'an' : 'no'} output file.\n${ran.stderr || ran.stdout || ''}`);

// bc and the globals come escaped (tools/cs/Harness.cs), so that any text stays on its line.
const unesc = (v) => v.replace(/\\(.)/g, (_, ch) => ({ t: '\t', n: '\n', r: '\r', e: '\u001e' }[ch] || ch));
const records = readFileSync(out, 'utf8').split('\n').filter(Boolean).map((text) => {
  const rec = { g: {} };
  for (const part of text.split('\t')) {
    const e = part.indexOf('='), k = part.slice(0, e), v = part.slice(e + 1);
    if (k === 'ret') rec.ret = v === 'true';
    else if (k === 'warn') rec.warn = Number(v);
    else if (k === 'info') rec.info = Number(v);
    else if (k === 'log') rec.log = v ? v.split('\u001e') : [];
    else if (k === 'bc') rec.bc = v ? v.split('\u001e').map(unesc) : [];
    else rec.g[k] = unesc(v);
  }
  return rec;
});
const short = (r) => { const s = JSON.stringify(r) || ''; return s.length > 700 ? s.slice(0, 700) + '…' : s; };
const checks = cases.filter((c) => typeof c !== 'string').concat(tableChecks);
ok(records.length === checks.length, `one result for each of the ${checks.length} calls`, `${records.length} results`);
checks.forEach(([name, , test], i) => {
  const r = records[i];
  let good = false;
  try { good = !!r && test(r); } catch { good = false; }
  ok(good, name, short(r));
});

console.log(`\n${pass}/${pass + fail} passed${fail ? ` — ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
