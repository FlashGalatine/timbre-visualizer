// Timbre Streamer.bot transport — loaded by the overlay pages and control.html.
// Raw browser WebSocket, no @streamerbot/client and no CDN dependency, so it
// works offline inside OBS's CEF.
//
// It subscribes to General.Custom events and re-emits every broadcast whose
// `data.type` is set as a window `svc:message` CustomEvent — the render code
// doesn't know which transport delivered it.
//
// Streamer.bot has no state-on-connect replay, so after the Subscribe is
// acknowledged we fire a DoAction naming the sync action ("Timbre Push"),
// which re-broadcasts the cached config — an overlay added mid-stream paints
// with the current settings instead of the defaults.
//
// A `window.sbDoAction(name, args)` helper is exposed for the control panel to
// push config changes over the same socket. It returns false when the socket is
// not open (nothing was sent or kept), and true when the request was sent or is
// waiting its turn behind the one in flight (see "Sending" below).
//
// Config knobs (set before this script loads, or — only when served over
// http:// — via URL query; file:// OBS sources cannot take query params):
//   window.__SB_WS_URL      — Streamer.bot WebSocket Server URL (default ws://127.0.0.1:8080/)
//   ?sbport=<n>             — shorthand for ws://127.0.0.1:<n>/  (http:// sources only).
//                             Digits only, 1 to 65535; anything else is ignored and the
//                             default port is used.
//   window.__SB_SYNC_ACTION — SB action to DoAction on connect (default 'Timbre Push'; '' to skip)
//   window.__SB_DEBUG / ?sbdebug=1 — log the connection + message flow to the console.
//
// Events raised on `window` (all CustomEvents; read `event.detail`):
//   sb:connection      { connected }
//       false at page load and whenever the socket closes ("Streamer.bot offline");
//       true when the socket opens ("connected"). <body> gets the class `offline`
//       while it is false.
//   svc:message        the broadcast's data, as sent: { type, ... }
//       e.g. { type:'timbre:config', config } or { type:'timbre:error', code, message }.
//   sb:action-queued   { action, id, push, queueName, defaultQueue }
//       Streamer.bot answered a DoAction with status "ok": the action exists and
//       was put in a queue. It has NOT run yet. `queueName` is the queue's name as
//       Streamer.bot gave it (null when the reply had none); `defaultQueue` is true
//       when that name is "Default", the queue where two runs that land together
//       share one request's arguments. Raised for every reply, so a page can clear
//       a warning once the action has been moved to a blocking queue.
//   sb:action-error    { action, id, push, code, error }
//       Streamer.bot answered a DoAction with status "error". `error` is its own
//       text; `code` is 'action-missing' for "The action '<name>' was not found"
//       (never imported, or renamed) and 'error' for anything else. Nothing ran.
//   sb:action-timeout  { action, id, push, replied }
//       A DoAction was sent and no timbre:config (or timbre:error) broadcast came
//       back within 800 ms. `replied` says whether Streamer.bot had answered it.
//       For a sync (`push` false) this is normal when no config has been saved
//       yet: the action has nothing to broadcast. For a push it means the action
//       did not answer.
//   In the last three, `action` is the action's name, `id` the request id (a
//   string) and `push` is true when the request carried a config (a dock edit)
//   and false for a sync request. None of them changes `sb:connection`: the
//   socket is still open.

(function () {
  'use strict';

  const DEFAULT_WS_URL = 'ws://127.0.0.1:8080/';
  const q = (() => { try { return new URLSearchParams(location.search); } catch { return new URLSearchParams(''); } })();
  // ?sbport= goes into a URL, so it must be a port and nothing else. A value such as
  // "1@evil.example" would otherwise make 127.0.0.1 the user name and the rest the host.
  const sbport = (() => {
    const raw = q.get('sbport') || '';
    const n = /^\d{1,5}$/.test(raw) ? Number(raw) : 0;
    return n >= 1 && n <= 65535 ? n : 0;
  })();
  const WS_URL = window.__SB_WS_URL
    || (sbport ? `ws://127.0.0.1:${sbport}/` : DEFAULT_WS_URL);
  const SYNC_ACTION = (typeof window.__SB_SYNC_ACTION === 'string')
    ? window.__SB_SYNC_ACTION
    : 'Timbre Push';
  const DEBUG = /[?&]sbdebug=1/.test(location.search) || !!window.__SB_DEBUG;
  const RECONNECT_BASE_MS = 2000;
  const RECONNECT_MAX_MS = 15000;
  const RECONNECT_JITTER = 0.25;   // each wait gets up to this share of itself on top, at random
  const STABLE_OPEN_MS = 5000;     // a connection open this long counts as a good one
  const SYNC_FALLBACK_MS = 400;
  const FAILSAFE_MS = 800;         // longest one send holds up the next

  let ws = null;
  let reconnectDelay = RECONNECT_BASE_MS;
  let msgId = 0;

  function log(...args) { if (DEBUG) console.log('[panel-client-sb]', ...args); }
  function emit(type, detail) { window.dispatchEvent(new CustomEvent(type, { detail })); }

  if (q.get('sbport') && !sbport && !window.__SB_WS_URL) log('ignoring ?sbport= (not a port number); using', DEFAULT_WS_URL);

  function setOffline(isOffline) {
    if (document.body) document.body.classList.toggle('offline', isOffline);
    emit('sb:connection', { connected: !isOffline });
  }

  // ── Sending ────────────────────────────────────────────────────────────────
  // ONE DoAction in flight per page. When two runs of one action overlap in
  // Streamer.bot's Default queue they both see one request's arguments (measured
  // on 1.0.7), so a config push that lands beside a sync request is lost.
  //
  // This queue orders only THIS page's socket: the dock's push against the dock's
  // own connect-time sync, and a burst from one page. It cannot order one page's
  // send against another page's. The real fix is in Streamer.bot: put Timbre Push
  // in a blocking action queue (docs/SETUP.md, step 2). This is for an install
  // that has not done so.
  //
  // Streamer.bot replies to a DoAction when the action is QUEUED, not when it has
  // run, so the reply cannot pace the next send. What shows that a run is over is
  // the timbre:config broadcast it ends with (or timbre:error, when it threw). The
  // next send is released when the request in flight has been answered AND such a
  // broadcast has arrived since it was sent, in either order, or after FAILSAFE_MS:
  // a sync with nothing saved produces no broadcast, and nor does a config refused
  // by an action pasted before it sent timbre:error for a refusal (release 1.0.189).
  // An error reply releases at once, because nothing was queued.
  //
  // While a config push waits, a newer one for the same action takes its place:
  // each push carries the whole config, so only the newest matters. The one in
  // flight is never replaced. Everything waiting is dropped when the socket closes.
  let sendQueue = [];              // jobs not sent yet
  let inFlight = null;             // the job that was sent and not yet released
  const awaitingReply = new Map(); // request id → job, until its reply is read

  const carriesConfig = (args) => !!args && typeof args.config === 'string' && args.config !== '';
  const about = (job) => ({ action: job.name, id: job.id, push: job.push });

  // Fire a DoAction on the shared socket. Returns false when disconnected —
  // the caller can retry after the next `sb:connection` event.
  window.sbDoAction = function (name, args) {
    if (!ws || ws.readyState !== 1) return false;
    const job = { name, args: args || {}, push: carriesConfig(args), id: null, replied: false, broadcastSeen: false, timer: null };
    const older = job.push ? sendQueue.findIndex((j) => j.push && j.name === name) : -1;
    if (older >= 0) sendQueue[older] = job; else sendQueue.push(job);
    pump();
    return true;
  };

  function pump() {
    if (inFlight || !sendQueue.length || !ws || ws.readyState !== 1) return;
    const job = sendQueue.shift();
    job.id = String(++msgId);
    inFlight = job;
    awaitingReply.set(job.id, job);
    if (awaitingReply.size > 32) awaitingReply.delete(awaitingReply.keys().next().value); // replies that never came
    log('DoAction', JSON.stringify(job.name), job.push ? '(config push)' : '', 'id', job.id);
    ws.send(JSON.stringify({
      request: 'DoAction',
      id: job.id,
      action: { name: job.name },
      args: job.args,
    }));
    job.timer = setTimeout(() => {
      if (inFlight !== job) return;
      log('no broadcast within', FAILSAFE_MS, 'ms of DoAction id', job.id);
      emit('sb:action-timeout', { ...about(job), replied: job.replied });
      release(job);
    }, FAILSAFE_MS);
  }

  function release(job) {
    if (inFlight !== job) return;
    clearTimeout(job.timer);
    inFlight = null;
    pump();
  }

  function clearQueue() {
    if (inFlight) clearTimeout(inFlight.timer);
    inFlight = null;
    sendQueue = [];
    awaitingReply.clear();
  }

  // A reply to one of our DoActions (never the action's result: it has not run yet).
  function readReply(job, m) {
    if (m.status === 'error') {
      const error = typeof m.error === 'string' ? m.error : '';
      log('DoAction id', job.id, 'refused:', error);
      emit('sb:action-error', { ...about(job), code: /was not found/i.test(error) ? 'action-missing' : 'error', error });
      release(job);
      return;
    }
    job.replied = true;
    const queueName = (m.args && typeof m.args.queueName === 'string') ? m.args.queueName : null;
    emit('sb:action-queued', { ...about(job), queueName, defaultQueue: queueName === 'Default' });
    if (job.broadcastSeen) release(job);
  }

  // A run of Timbre Push has ended (its broadcast is here).
  function sawRunEnd() {
    if (!inFlight) return;
    if (inFlight.replied) release(inFlight); else inFlight.broadcastSeen = true;
  }

  // ── Connecting ─────────────────────────────────────────────────────────────
  // The wait grows by half each time, up to RECONNECT_MAX_MS, and goes back to
  // the base only once a connection has stayed open for STABLE_OPEN_MS: a server
  // that accepts and then drops is not dialled every 2 s for ever. Each wait gets
  // a random part on top, so the pages that lost Streamer.bot together do not all
  // come back (and all ask for a sync) in the same instant.
  function scheduleReconnect() {
    const delay = Math.round(reconnectDelay * (1 + RECONNECT_JITTER * Math.random()));
    reconnectDelay = Math.min(reconnectDelay * 1.5, RECONNECT_MAX_MS);
    log('reconnecting in', delay, 'ms');
    setTimeout(connect, delay);
  }

  function connect() {
    log('connecting to', WS_URL);
    let sock;
    try {
      sock = new WebSocket(WS_URL);
    } catch (err) {
      // A URL the constructor refuses. Keep trying: the transport must not die here.
      ws = null;
      log('could not open a WebSocket to', WS_URL, '-', err && err.message);
      scheduleReconnect();
      return;
    }
    ws = sock;

    let subId = null;
    let syncFired = false;
    let syncTimer = null;
    let stableTimer = null;
    let closed = false;

    function fireSync() {
      if (syncFired || closed) return;
      syncFired = true;
      if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
      if (!SYNC_ACTION) return;
      log('requesting state via DoAction', JSON.stringify(SYNC_ACTION));
      window.sbDoAction(SYNC_ACTION, { reason: 'overlay-connect' });
    }

    sock.onopen = () => {
      stableTimer = setTimeout(() => { stableTimer = null; reconnectDelay = RECONNECT_BASE_MS; }, STABLE_OPEN_MS);

      // The event-SOURCE key is LOWERCASE ('general') in the Subscribe request,
      // even though delivered events carry a capitalized source ('General'). Per
      // https://docs.streamer.bot/api/websocket/requests
      // The Subscribe goes out before the page is told it is connected, so nothing
      // a listener sends from that event can reach Streamer.bot ahead of it.
      subId = String(++msgId);
      sock.send(JSON.stringify({ request: 'Subscribe', id: subId, events: { general: ['Custom'] } }));
      log('sent Subscribe (id', subId + '); waiting for ack before sync');
      syncTimer = setTimeout(fireSync, SYNC_FALLBACK_MS);
      setOffline(false);
    };

    sock.onmessage = (evt) => {
      let m;
      try { m = JSON.parse(evt.data); } catch { return; }

      if (m && m.id && m.id === subId && !m.event) {
        log('Subscribe ack:', m.status || '(no status field)');
        fireSync();
        return;
      }

      if (m && m.id != null && !m.event && awaitingReply.has(String(m.id))) {
        const job = awaitingReply.get(String(m.id));
        awaitingReply.delete(String(m.id));
        readReply(job, m);
        return;
      }

      if (m && m.event && m.event.source === 'General' && m.event.type === 'Custom') {
        let d = m.data;
        if (typeof d === 'string') { try { d = JSON.parse(d); } catch { /* leave as string */ } }
        if (!d || typeof d !== 'object' || !d.type) { log('General.Custom with no data.type — ignored'); return; }
        log('General.Custom →', d.type);
        // The release comes before the page hears of the broadcast: a send that a
        // listener makes in answer to it is a new run, which this broadcast does not end.
        if (d.type === 'timbre:config' || d.type === 'timbre:error') sawRunEnd();
        window.dispatchEvent(new CustomEvent('svc:message', { detail: d }));
        return;
      }

      log('other message:', (m && (m.request || m.status || (m.event && (m.event.source + '.' + m.event.type)))) || '?');
    };

    sock.onclose = () => {
      if (closed) return;
      closed = true;
      if (stableTimer) { clearTimeout(stableTimer); stableTimer = null; }
      if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
      clearQueue();
      setOffline(true);
      log('connection closed; reconnecting');
      scheduleReconnect();
    };

    sock.onerror = () => {
      log('WebSocket error — is SB\'s WebSocket Server enabled on', WS_URL, 'with authentication OFF?');
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setOffline(true));
  } else {
    setOffline(true);
  }
  connect();
})();
