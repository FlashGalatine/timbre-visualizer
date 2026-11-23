// Throwaway mock of Streamer.bot — lets Timbre run with NO Streamer.bot install,
// for local development and the verify suites. It mimics the two SB surfaces
// Timbre depends on, as they were measured on Streamer.bot 1.0.7:
//
//   • HTTP Server on :7474 — SB Path->Folder file serving. Maps:
//       /timbre-overlay/*  -> overlay/  (the visualizer pages + factories + assets)
//       /timbre-shared/*   -> shared/   (viz-config.js + panel-client-sb.js)
//       /timbre-control/*  -> control/  (the control panel / OBS dock page)
//       /timbre-spike/*    -> spike/    (the CEF mic-permission spike page)
//       /                  -> a small index for quick manual testing
//     Like SB, it gives .svg, .woff and .woff2 no type of their own.
//   • WebSocket Server on :8080 — speaks SB's envelope. On `Subscribe` it acks. On
//     `DoAction` it replies the way SB does (see the DoAction handler): at once, when
//     the action is QUEUED, and with an error when no action has that name. It then
//     runs a mirror of actions/timbre-push.cs: the same two-character check, the
//     config stored as sent (never sanitized here), and a broadcast to EVERY
//     subscriber, for a push and for a sync request alike.
//
// Test controls, on the HTTP port (each answers with JSON):
//   /mock/bleed?on=1|0    overlap mode. Off (the default) is an action in a blocking
//                         queue: one run at a time, each with its own arguments. On is
//                         SB's Default queue as measured: runs of one action that land
//                         together all see ONE request's arguments. Also MOCK_ARG_BLEED=1.
//   /mock/throw?on=1|0    Timbre Push throws: it broadcasts timbre:error, stores nothing.
//   /mock/missing?on=1|0  Timbre Push is "not found", as when it was never imported.
//   /mock/stats           what the mock has seen, and the stored config text.
//
// Where it differs from Streamer.bot, on purpose: it refuses WebSocket connections
// from web pages of other origins and frames over 1 MiB, because it is a development
// tool on a developer's machine. SB with authentication off does neither.
//
// Not measured, so not claimed: what SB does with a broadcast whose text is not JSON
// (the C# lets `{not json}` through). The mock sends the frame as built; no page can
// parse it.
//
// This is a REFERENCE/TEST harness. The real thing uses Streamer.bot itself (see
// docs/SETUP.md) with the same wire shapes.

import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAPS = {
  '/timbre-overlay': resolve(__dirname, 'overlay'),
  '/timbre-shared': resolve(__dirname, 'shared'),
  '/timbre-control': resolve(__dirname, 'control'),
  '/timbre-spike': resolve(__dirname, 'spike'),
};

const HTTP_PORT = Number(process.env.SB_HTTP_PORT) || 7474; // SB HTTP Server default
const WS_PORT = Number(process.env.SB_WS_PORT) || 8080; // SB WebSocket Server default
const MAX_PAYLOAD = 1024 * 1024; // bytes in one WebSocket message; a full config is a few KB

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ttf': 'font/ttf',
  // Measured on Streamer.bot 1.0.7: .svg, .woff and .woff2 are NOT given their own
  // type; they fall through to application/octet-stream. The pages have to work with that.
};

// The C# action's global-var cache: the config TEXT, exactly as the action stored
// it. null until the first control-panel push, so a fresh overlay keeps its
// built-in defaults (exactly like real SB).
let cachedConfig = null;

// SB's General.Custom envelope for a WebsocketBroadcastJson payload. `dataJson` is
// the text the C# hands to WebsocketBroadcastJson; like the C#, the mock splices
// text and does not parse it.
function customEvent(dataJson) {
  return '{"timeStamp":"1970-01-01T00:00:00.0000000","event":{"source":"General","type":"Custom"},"data":' + dataJson + '}';
}

// Resolve a request path to a file inside `base`, guarding against traversal.
function safeResolve(base, rel) {
  const file = resolve(base, '.' + rel);
  return file === base || file.startsWith(base + '\\') || file.startsWith(base + '/') ? file : null;
}

async function serveFile(res, file) {
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}

function landingHtml() {
  return `<!doctype html><meta charset="utf-8"><title>Timbre — mock Streamer.bot</title>
<style>
  body{font:15px/1.5 system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;color:#e6e6e6;background:#141414}
  h1{font-size:1.3rem} a{color:#9ad} .dim{color:#888;font-size:.85em}
  ul{margin:.2rem 0;padding-left:1.2rem} code{background:#222;padding:.1em .4em;border-radius:4px}
</style>
<h1>Timbre &mdash; mock Streamer.bot</h1>
<p>Open a page below in a tab or as an OBS Browser Source. The overlay captures its
own microphone; drive its settings from the control panel. Config cached:
<code>${cachedConfig ? 'yes (' + cachedConfig.length + ' chars)' : 'no — overlays use defaults'}</code></p>
<ul>
  <li><a href="/timbre-control/control.html?sbport=${WS_PORT}" target="_blank">Control panel</a></li>
  <li><a href="/timbre-overlay/mic-visualizers-300x220.html?sbport=${WS_PORT}" target="_blank">Overlay 300&times;220</a></li>
  <li><a href="/timbre-overlay/mic-visualizers-1440x1080.html?sbport=${WS_PORT}" target="_blank">Overlay 1440&times;1080 (4:3, fits any window size)</a></li>
  <li><a href="/timbre-overlay/mic-visualizers-1920x1080.html?sbport=${WS_PORT}" target="_blank">Overlay 1920&times;1080 (16:9, fits any window size)</a></li>
  <li><a href="/timbre-spike/mic-test.html" target="_blank">CEF mic spike</a></li>
</ul>`;
}

// ── Test controls and what the mock has seen ─────────────────────────────────
const ACTION = 'Timbre Push';
const BLEED_WINDOW_MS = 10;        // requests for the action this close together overlap
let argBleed = process.env.MOCK_ARG_BLEED === '1';
let throwPush = false;             // the action throws: timbre:error, nothing stored
let actionMissing = false;         // the action is "not found"
let pending = null;                // overlap mode: [{ args }] waiting out the window
const runLog = [];                 // [{ action, did, bled }] newest last
let totalRuns = 0, totalBroadcasts = 0;

function json(res, body) {
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

// ── HTTP server (SB HTTP Server mimic) ───────────────────────────────────────
// The handler is async, so anything it throws would be an unhandled rejection and
// end the process. Everything is inside one try: a bad request gets an answer.
const http = createServer(async (req, res) => {
  try {
    const url = req.url || '/';
    let path;
    try { path = decodeURIComponent(url.split('?')[0]); }
    catch { res.writeHead(400, { 'content-type': 'text/plain' }); res.end('bad path'); return; }
    const query = new URLSearchParams(url.split('?')[1] || '');

    if (path === '/mock/bleed') {
      if (query.has('on')) argBleed = query.get('on') === '1';
      return json(res, { argBleed });
    }
    if (path === '/mock/throw') {
      if (query.has('on')) throwPush = query.get('on') === '1';
      return json(res, { throwPush });
    }
    if (path === '/mock/missing') {
      if (query.has('on')) actionMissing = query.get('on') === '1';
      return json(res, { actionMissing });
    }
    if (path === '/mock/stats') {
      return json(res, { argBleed, throwPush, actionMissing, totalRuns, totalBroadcasts, cachedConfig, runs: runLog.slice(-50) });
    }
    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(landingHtml());
      return;
    }
    for (const [prefix, base] of Object.entries(MAPS)) {
      if (path.startsWith(prefix + '/')) {
        const file = safeResolve(base, path.slice(prefix.length));
        if (file) { await serveFile(res, file); return; }
      }
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Map ' + Object.keys(MAPS).map((p) => p.slice(1)).join(', ') + ' in SB\'s HTTP Server (or use this mock).');
  } catch (err) {
    console.error('[mock] request error:', err && err.message);
    try {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('error');
    } catch {}
  }
});

http.on('error', (err) => { console.error('[mock] HTTP error:', err.message); process.exit(1); });
http.listen(HTTP_PORT, '127.0.0.1', () => {
  console.log(`[mock] HTTP  http://127.0.0.1:${HTTP_PORT}/  (page index)`);
});

// ── WebSocket server (SB WebSocket Server mimic) ─────────────────────────────
// Who may connect: a client that sends no Origin (Node: the verify suites, scripts),
// a page this machine serves (the mock's own pages, whatever the port), and a local
// file (an OBS source added as a file sends "file://" or "null"). A page of any
// other site is refused, so a web page open in a browser cannot drive the mock.
function originAllowed(origin) {
  if (!origin || origin === 'null' || origin === 'file://') return true;
  return /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(origin);
}

const wss = new WebSocketServer({
  host: '127.0.0.1', port: WS_PORT, maxPayload: MAX_PAYLOAD,
  verifyClient: ({ origin }, done) => (originAllowed(origin) ? done(true) : done(false, 403, 'Forbidden')),
});
const clients = new Set();

wss.on('error', (err) => { console.error('[mock] WS error:', err.message); process.exit(1); });
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.subscribedCustom = false; // only a correctly-subscribed client receives broadcasts
  // Without a listener, a protocol error on one connection (a frame over the limit,
  // bad UTF-8) would end the process.
  ws.on('error', (err) => console.error('[mock] client error:', err.message));
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw.toString()); } catch { return; }
    if (!m || typeof m !== 'object') return; // `null`, a number, a string: not a request
    try { handleRequest(ws, m); }
    catch (err) { console.error('[mock] request failed:', err && err.message); }
  });
  ws.on('close', () => clients.delete(ws));
});
wss.on('listening', () => console.log(`[mock] WS    ws://127.0.0.1:${WS_PORT}  (Streamer.bot mock)`));

function handleRequest(ws, m) {
  if (m.request === 'Subscribe') {
    // Real Streamer.bot uses a LOWERCASE source key ('general') in Subscribe, while
    // delivered events carry a capitalized source ('General'). Enforce that here so
    // a wrong-case subscribe gets nothing — exactly how real SB behaves.
    const gen = m.events && m.events.general;
    ws.subscribedCustom = Array.isArray(gen) && gen.includes('Custom');
    console.log('[mock] Subscribe', ws.subscribedCustom ? 'OK (general.Custom)' : 'IGNORED (expected lowercase events.general:["Custom"])');
    ws.send(JSON.stringify({ id: m.id, status: 'ok', result: { events: m.events } }));
  } else if (m.request === 'DoAction') {
    const name = m.action && m.action.name;
    // Measured on Streamer.bot 1.0.7: an action that does not exist gets an error
    // reply; one that exists gets "ok" AT ONCE, when it is queued (not when it has
    // run), echoing the request's own args plus the queue it was put in. So the
    // reply says nothing about what the run did, or whether it has happened yet.
    if (name !== ACTION || actionMissing) {
      ws.send(JSON.stringify({ id: m.id, status: 'error', error: `The action '${name}' was not found` }));
      return;
    }
    const args = (m.args && typeof m.args === 'object' && !Array.isArray(m.args)) ? m.args : {};
    ws.send(JSON.stringify({
      id: m.id, status: 'ok',
      args: {
        ...args,
        actionId: ACTION_ID, actionName: name, queueName: argBleed ? 'Default' : 'Mock Blocking',
        runningActionId: randomUUID(), actionQueuedAt: new Date().toISOString(),
      },
    }));
    queueAction(args);
  }
}

// ── Action runs ──────────────────────────────────────────────────────────────
// Overlap mode off behaves like an action in a BLOCKING queue: one run at a time,
// in arrival order, each with its own args.
//
// Overlap mode on behaves like Streamer.bot's DEFAULT queue as measured on 1.0.7:
// runs of one action that overlap all see ONE request's arguments (the later one's,
// in 25 of 25 same-socket tries; it crosses sockets too). The mock holds each
// request for BLEED_WINDOW_MS and then runs every request that arrived in the
// window with the LAST one's args.
const ACTION_ID = randomUUID();

function queueAction(args) {
  if (!argBleed) { runTimbrePush(args, false); return; }
  if (!pending) {
    const batch = pending = [];
    setTimeout(() => {
      if (pending === batch) pending = null;
      const last = batch[batch.length - 1].args;
      for (let i = 0; i < batch.length; i++) runTimbrePush(last, batch.length > 1);
    }, BLEED_WINDOW_MS);
  }
  pending.push({ args });
}

function sendToSubscribers(dataJson) {
  totalBroadcasts++;
  const msg = customEvent(dataJson);
  for (const ws of clients) { if (ws.subscribedCustom) { try { ws.send(msg); } catch {} } }
}

// Mirror of Execute() in actions/timbre-push.cs, line for line. `did` is what the
// run came to: push | sync | sync-empty | rejected | threw.
function runTimbrePush(args, bled) {
  totalRuns++;
  const note = (did) => { runLog.push({ action: ACTION, did, bled }); if (runLog.length > 500) runLog.splice(0, runLog.length - 500); };
  if (throwPush) {
    // The C#'s catch: log, broadcast { type:"timbre:error", message }, return false.
    note('threw');
    console.log('[mock] Timbre Push ERROR (the throw switch is on)');
    sendToSubscribers('{"type":"timbre:error","message":' + JSON.stringify('mock: Timbre Push was made to throw') + '}');
    return;
  }
  // CPH.TryGetArg("config", out string) && !string.IsNullOrEmpty(cfg). The pages only
  // ever send a string; what SB makes of another type is not measured, so the mock
  // treats it as no config.
  const cfg = typeof args.config === 'string' ? args.config : '';
  let did = 'sync';
  if (cfg !== '') {
    // The C#'s whole check: trimmed, it must start with { and end with }. Nothing
    // else is looked at, and nothing is clamped: the pages sanitize what they get.
    const trimmed = cfg.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      note('rejected');
      console.log(`[mock] Timbre Push rejected non-object config arg (${cfg.length} chars)`);
      return;
    }
    cachedConfig = trimmed;
    did = 'push';
  } else if (!cachedConfig) {
    note('sync-empty');
    console.log('[mock] Timbre Push sync requested but no cached config yet — skipping');
    return;
  }
  note(did);
  // CPH.WebsocketBroadcastJson: every subscriber gets it, whoever asked.
  sendToSubscribers('{"type":"timbre:config","config":' + cachedConfig + '}');
  console.log(`[mock] broadcast timbre:config (${cachedConfig.length} chars)`);
}

// A verify suite starts the mock with a pipe on stdin and MOCK_EXIT_WITH_PARENT=1.
// When the suite goes away, however it goes, the pipe closes and the mock exits, so
// it is not left holding the ports.
if (process.env.MOCK_EXIT_WITH_PARENT === '1') {
  process.stdin.on('end', () => process.exit(0));
  process.stdin.on('close', () => process.exit(0));
  process.stdin.on('error', () => process.exit(0));
  process.stdin.resume();
}
