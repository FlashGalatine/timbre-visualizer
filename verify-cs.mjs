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
// rejects, stores and broadcasts as the checks say. It does not replace compiling it in
// Streamer.bot, whose own compiler and reference set have the final say.
//
// The program is built into tools/cs/build/ (ignored by git), not the system temp
// folder, and is started ONCE for all the cases: an antivirus can remove a freshly
// compiled program between runs. If it cannot be started, the error is printed.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// ── The cases. They run in order on one state. ───────────────────────────────
// A full config as the control panel sends it: one line of JSON, with kana, an escaped
// line break, quotes and a backslash inside its strings.
const full = JSON.stringify({ activeViz: 'matrix', gain: 150, perViz: { matrix: { pool: 'ｱｲｳｴｵ0123456789', messages: 'HELLO\n"quoted"\\backslash' } } });
const padded = '  {"activeViz":"matrix","bars":999,"notAKnob":true}  ';
const wire = (text) => '{"type":"timbre:config","config":' + text + '}';
const THROW_MESSAGE = 'stub: this write was made to fail: "quoted" back\\slash\ttab\nline \u0001 end'; // CphStub.ThrowMessage
const parsed = (text) => { try { return JSON.parse(text); } catch { return undefined; } };
const stored = (r) => r.g['timbre.config'];
const rejected = (text, was) => [`a config of ${JSON.stringify(text)} is refused: false, one warning with its length, no broadcast, the stored config untouched`, { config: text },
  (r) => r.ret === false && r.warn === 1 && r.log[0] === `[Timbre Push] rejected non-object config arg (${text.length} chars)` && r.bc.length === 0 && stored(r) === was];

const cases = [
  ['a sync request with nothing stored: true, no broadcast, one info line', {},
    (r) => r.ret === true && r.bc.length === 0 && r.warn === 0 && r.info === 1 && /sync requested but no cached config yet — skipping/.test(r.log[0]) && stored(r) === undefined],
  ['the same with the reason the pages send', { reason: 'overlay-connect' },
    (r) => r.ret === true && r.bc.length === 0 && stored(r) === undefined],
  ['a config is stored as sent and broadcast as { type:"timbre:config", config:<that text> }; kana, an escaped line break, quotes and a backslash survive', { config: full },
    (r) => r.ret === true && r.warn === 0 && stored(r) === full && r.bc.length === 1 && r.bc[0] === wire(full) && JSON.stringify(parsed(r.bc[0])) === JSON.stringify({ type: 'timbre:config', config: JSON.parse(full) })
      && r.log[0] === `[Timbre Push] broadcast (${full.length} chars)`],
  ['a sync request replays the stored config', { reason: 'overlay-connect' },
    (r) => r.ret === true && r.bc.length === 1 && r.bc[0] === wire(full) && stored(r) === full],
  ['a config with spaces round it is stored trimmed, and nothing in it is clamped or dropped (the pages do that)', { config: padded },
    (r) => r.ret === true && stored(r) === padded.trim() && r.bc[0] === wire(padded.trim()) && parsed(r.bc[0]).config.bars === 999 && parsed(r.bc[0]).config.notAKnob === true],
  rejected('[1,2]', padded.trim()),
  rejected('{"a":1', padded.trim()),
  rejected('"a":1}', padded.trim()),
  rejected('   ', padded.trim()),
  rejected('null', padded.trim()),
  rejected('{} x', padded.trim()),
  ['an empty config argument is a sync request', { config: '' },
    (r) => r.ret === true && r.warn === 0 && r.bc.length === 1 && r.bc[0] === wire(padded.trim())],
  ['TIM-05, as it stands: text in braces that is not JSON passes the check, is stored, and is spliced into a broadcast no page can parse', { config: '{not json}' },
    (r) => r.ret === true && r.warn === 0 && stored(r) === '{not json}' && r.bc.length === 1 && r.bc[0] === wire('{not json}') && parsed(r.bc[0]) === undefined],
  '#throw=timbre.config',
  ['an exception is caught: false, one warning, and one { type:"timbre:error", message } broadcast whose message survives the hand-written JSON encoder (quote, backslash, tab, line break, control character)', { config: '{"a":1}' },
    (r) => r.ret === false && r.warn === 1 && /^\[Timbre Push\] ERROR: System\.InvalidOperationException/.test(r.log[0]) && r.bc.length === 1
      && JSON.stringify(parsed(r.bc[0])) === JSON.stringify({ type: 'timbre:error', message: THROW_MESSAGE }) && stored(r) === '{not json}'],
  '#throw=',
  ['after the failure the action works again', { config: full },
    (r) => r.ret === true && stored(r) === full && r.bc[0] === wire(full)],
  '#reset',
  '#global timbre.config=' + full,
  ['a config already in the global (a Streamer.bot restart) is replayed to a sync request', {},
    (r) => r.ret === true && r.bc.length === 1 && r.bc[0] === wire(full)],
];

const line = (args) => Object.entries(args).map(([k, v]) => `${k}=${v}`).join('\t') || '(no args)';
const script = join(BUILD, 'script.txt'), out = join(BUILD, 'out.txt');
writeFileSync(script, cases.map((c) => (typeof c === 'string' ? c : line(c[1]))).join('\n') + '\n', 'utf8');

// ── One run for every case ───────────────────────────────────────────────────
const ran = spawnSync(exe, [script, out], { encoding: 'utf8' });
if (ran.error) {
  stop(`The compiled program could not be started: ${ran.error.message}\n(${exe})\n`
    + (existsSync(exe) ? 'The file is still there.' : 'The file is gone: an antivirus most likely removed it after it was compiled. Allow the folder tools/cs/build/ and run again.'));
}
if (ran.status !== 0 || !existsSync(out)) stop(`The compiled program ended with code ${ran.status} and ${existsSync(out) ? 'an' : 'no'} output file.\n${ran.stderr || ran.stdout || ''}`);

const records = readFileSync(out, 'utf8').split('\n').filter(Boolean).map((text) => {
  const rec = { g: {} };
  for (const part of text.split('\t')) {
    const e = part.indexOf('='), k = part.slice(0, e), v = part.slice(e + 1);
    if (k === 'ret') rec.ret = v === 'true';
    else if (k === 'warn') rec.warn = Number(v);
    else if (k === 'info') rec.info = Number(v);
    else if (k === 'log') rec.log = v ? v.split('\u001e') : [];
    else if (k === 'bc') rec.bc = v ? v.split('\u001e') : [];
    else rec.g[k] = v;
  }
  return rec;
});
const checks = cases.filter((c) => typeof c !== 'string');
ok(records.length === checks.length, `one result for each of the ${checks.length} calls`, `${records.length} results`);
checks.forEach(([name, , test], i) => {
  const r = records[i];
  let good = false;
  try { good = !!r && test(r); } catch { good = false; }
  ok(good, name, JSON.stringify(r));
});

console.log(`\n${pass}/${pass + fail} passed${fail ? ` — ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
