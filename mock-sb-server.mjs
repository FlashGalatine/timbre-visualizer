// Throwaway mock of Streamer.bot — lets Timbre run with NO Streamer.bot install,
// for local development and the verify suites. It faithfully mimics the two SB
// surfaces Timbre depends on:
//
//   • HTTP Server on :7474 — SB Path->Folder file serving. Maps:
//       /timbre-overlay/*  -> overlay/  (the visualizer pages + factories + assets)
//       /timbre-shared/*   -> shared/   (viz-config.js + panel-client-sb.js)
//       /timbre-control/*  -> control/  (the control panel / OBS dock page)
//       /timbre-spike/*    -> spike/    (the CEF mic-permission spike page)
//       /                  -> a small index for quick manual testing
//   • WebSocket Server on :8080 — speaks SB's envelope. On `Subscribe` it acks; on
//     `DoAction "Timbre Push"` it acks AND caches/broadcasts the config (mimicking
//     the C# action), which is what recreates sync-on-connect.
//
// This is a REFERENCE/TEST harness. The real thing uses Streamer.bot itself (see
// docs/SETUP.md) with the same wire shapes.

import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import './shared/viz-config.js'; // side-effect: globalThis.TIMBRE (same tables the pages use)

const { sanitizeConfig } = globalThis.TIMBRE;

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAPS = {
  '/timbre-overlay': resolve(__dirname, 'overlay'),
  '/timbre-shared': resolve(__dirname, 'shared'),
  '/timbre-control': resolve(__dirname, 'control'),
  '/timbre-spike': resolve(__dirname, 'spike'),
};

const HTTP_PORT = Number(process.env.SB_HTTP_PORT) || 7474; // SB HTTP Server default
const WS_PORT = Number(process.env.SB_WS_PORT) || 8080; // SB WebSocket Server default

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.stl': 'application/octet-stream',
};

// The C# action's global-var cache: null until the first control-panel push,
// so a fresh overlay keeps its built-in defaults (exactly like real SB).
let cachedConfig = null;

// SB's General.Custom envelope for a WebsocketBroadcastJson payload.
function customEvent(data) {
  return JSON.stringify({
    timeStamp: '1970-01-01T00:00:00.0000000',
    event: { source: 'General', type: 'Custom' },
    data,
  });
}

function configMessage() {
  // The C# action embeds the cached JSON string raw, so on the wire `config`
  // is an object — parse before wrapping to match.
  return customEvent({ type: 'timbre:config', config: JSON.parse(cachedConfig) });
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
  <li><a href="/timbre-overlay/mic-visualizers-1440x1080.html?sbport=${WS_PORT}" target="_blank">Overlay 1440&times;1080</a></li>
  <li><a href="/timbre-spike/mic-test.html" target="_blank">CEF mic spike</a></li>
</ul>`;
}

// ── HTTP server (SB HTTP Server mimic) ───────────────────────────────────────
const http = createServer(async (req, res) => {
  const url = req.url || '/';
  const path = decodeURIComponent(url.split('?')[0]);

  if (path === '/' || path === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(landingHtml());
    return;
  }
  for (const [prefix, base] of Object.entries(MAPS)) {
    if (path.startsWith(prefix + '/')) {
      const file = safeResolve(base, path.slice(prefix.length));
      if (file) return serveFile(res, file);
    }
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Map ' + Object.keys(MAPS).map((p) => p.slice(1)).join(', ') + ' in SB\'s HTTP Server (or use this mock).');
});

http.on('error', (err) => { console.error('[mock] HTTP error:', err.message); process.exit(1); });
http.listen(HTTP_PORT, '127.0.0.1', () => {
  console.log(`[mock] HTTP  http://127.0.0.1:${HTTP_PORT}/  (page index)`);
});

// ── WebSocket server (SB WebSocket Server mimic) ─────────────────────────────
const wss = new WebSocketServer({ host: '127.0.0.1', port: WS_PORT });
const clients = new Set();

wss.on('error', (err) => { console.error('[mock] WS error:', err.message); process.exit(1); });
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.subscribedCustom = false; // only a correctly-subscribed client receives broadcasts
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.request === 'Subscribe') {
      // Real Streamer.bot uses a LOWERCASE source key ('general') in Subscribe, while
      // delivered events carry a capitalized source ('General'). Enforce that here so
      // a wrong-case subscribe gets nothing — exactly how real SB behaves.
      const gen = m.events && m.events.general;
      ws.subscribedCustom = Array.isArray(gen) && gen.includes('Custom');
      console.log('[mock] Subscribe', ws.subscribedCustom ? 'OK (general.Custom)' : 'IGNORED (expected lowercase events.general:["Custom"])');
      ws.send(JSON.stringify({ id: m.id, status: 'ok', result: { events: m.events } }));
    } else if (m.request === 'DoAction') {
      ws.send(JSON.stringify({ id: m.id, status: 'ok' }));
      const name = m.action && m.action.name;
      if (name !== 'Timbre Push') return;
      const cfgArg = m.args && m.args.config;
      if (typeof cfgArg === 'string' && cfgArg.trim().startsWith('{')) {
        // Control-panel push: mimic the C# cache. The mock additionally runs the
        // shared sanitizer so a bad payload is visible during development (real SB
        // stores it verbatim; the overlay sanitizes on receipt either way).
        let parsed = null;
        try { parsed = JSON.parse(cfgArg); } catch {}
        cachedConfig = JSON.stringify(parsed ? sanitizeConfig(parsed) : sanitizeConfig(null));
        broadcast();
      } else if (cachedConfig && ws.subscribedCustom) {
        ws.send(configMessage()); // sync-on-connect replay to just this client
      }
    }
  });
  ws.on('close', () => clients.delete(ws));
});
wss.on('listening', () => console.log(`[mock] WS    ws://127.0.0.1:${WS_PORT}  (Streamer.bot mock)`));

function broadcast() {
  if (!cachedConfig) return;
  const msg = configMessage();
  for (const ws of clients) { if (ws.subscribedCustom) { try { ws.send(msg); } catch {} } }
  console.log(`[mock] broadcast timbre:config (${cachedConfig.length} chars)`);
}
