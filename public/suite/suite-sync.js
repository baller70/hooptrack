/* =========================================================================
   Basketball Coach AI Suite — offline-first workspace sync
   -------------------------------------------------------------------------
   Plain browser JS (no imports / no bundler). Exposes window.createSuiteSync.

   Every Suite tool keeps a single per-user "workspace" singleton in the DB
   (SuiteDocument, key='workspace', addressed via GET/PUT /api/suite/{app}/state).
   localStorage stays the source of truth for an offline / signed-out coach;
   this layer mirrors it up and reconciles on boot.

   Guarantees (per the KIT contract):
     - boot() reconciles local <-> server once, last-write-wins on
       cfg.getLocalUpdatedAt().
     - First run (server returns 404) migrates the newest localStorage key up.
     - queueSave() is debounced 1500ms, sends an optimistic rev, and adopts
       the server rev on each ack.
     - Any fetch failure leaves localStorage authoritative (offline-safe).
     - Completely no-ops while signed out.

   Usage:
     const sync = window.createSuiteSync({
       app: 'practice-builder',
       isSignedIn: () => Boolean(window.__SUITE_SESSION__),
       getData: () => state,                       // newest in-memory snapshot
       getLocalUpdatedAt: () => state.updatedAt,   // ISO string or epoch ms
       getTitle: () => state.header.practiceTitle, // optional
       applyRemote: (data, meta) => { hydrate(data); render(); },
       legacyKeys: ['bcai-practice-builder-dry-run-v12', '...older'],
       onStatus: (status) => updateBadge(status)
     });
     sync.boot();
     // after every local mutation that already wrote localStorage:
     sync.queueSave();
   ========================================================================= */

(function () {
  'use strict';

  const DEFAULT_DEBOUNCE_MS = 1500;
  const WORKSPACE_KEY = 'workspace';

  function noop() {}

  function toMillis(value) {
    if (value == null) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function safeParse(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function safeReadStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  /* Minimal standalone fetch wrapper, used only if SuiteKit.api is absent so
     this file works even when loaded on its own. Mirrors SuiteKit.api: never
     throws on HTTP status, rejects only on network failure. */
  function fallbackApi(path, opts) {
    const options = opts || {};
    const init = Object.assign({ credentials: 'include' }, options);
    const headers = Object.assign({}, options.headers);
    if (init.body != null && typeof init.body !== 'string') {
      if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(init.body);
    }
    init.headers = headers;
    const url = /^https?:\/\//i.test(path) || String(path).startsWith('/')
      ? path
      : '/api/suite/' + String(path).replace(/^\/+/, '');
    return fetch(url, init).then(function (res) {
      return res.text().then(function (text) {
        let data = null;
        if (text) {
          try { data = JSON.parse(text); } catch (error) { data = text; }
        }
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  function createSuiteSync(cfg) {
    const config = cfg || {};
    const app = String(config.app || '').trim();
    const debounceMs = Number.isFinite(config.debounceMs) ? config.debounceMs : DEFAULT_DEBOUNCE_MS;
    const onStatus = typeof config.onStatus === 'function' ? config.onStatus : noop;
    const apiFn =
      typeof config.api === 'function'
        ? config.api
        : (typeof window !== 'undefined' && window.SuiteKit && typeof window.SuiteKit.api === 'function'
            ? window.SuiteKit.api
            : fallbackApi);

    let rev = 0;
    let docId = null;
    let serverKnown = false; // we have successfully read/created the server doc
    let booted = false;
    let saveTimer = null;
    let inFlight = false;
    let pendingSave = false;
    let lastStatus = 'idle';

    function signedIn() {
      try {
        return typeof config.isSignedIn === 'function' ? Boolean(config.isSignedIn()) : false;
      } catch (error) {
        return false;
      }
    }

    function setStatus(status) {
      lastStatus = status;
      try { onStatus(status, { rev: rev, docId: docId }); } catch (error) { /* ignore */ }
    }

    function readData() {
      try {
        return typeof config.getData === 'function' ? config.getData() : null;
      } catch (error) {
        return null;
      }
    }

    function readLocalUpdatedAt() {
      try {
        return typeof config.getLocalUpdatedAt === 'function' ? config.getLocalUpdatedAt() : null;
      } catch (error) {
        return null;
      }
    }

    function readTitle() {
      try {
        return typeof config.getTitle === 'function' ? config.getTitle() : undefined;
      } catch (error) {
        return undefined;
      }
    }

    function applyRemote(data, meta) {
      if (typeof config.applyRemote === 'function') {
        try { config.applyRemote(data, meta); } catch (error) { /* ignore */ }
      }
    }

    /* First-run seed: prefer an explicit cfg.collectSeed(); else scan
       cfg.legacyKeys (newest-first by their own timestamp); else fall back to
       the live in-memory snapshot (already the newest local state). */
    function collectSeed() {
      if (typeof config.collectSeed === 'function') {
        try {
          const seed = config.collectSeed();
          if (seed && seed.data != null) return seed;
        } catch (error) { /* fall through */ }
      }

      const keys = Array.isArray(config.legacyKeys) ? config.legacyKeys : [];
      let best = null;
      for (let i = 0; i < keys.length; i += 1) {
        const parsed = safeParse(safeReadStorage(keys[i]));
        if (!parsed) continue;
        const stamp = toMillis(parsed.updatedAt || parsed.localUpdatedAt);
        if (!best || stamp >= best.stamp) {
          best = { data: parsed, stamp: stamp, localUpdatedAt: parsed.updatedAt || parsed.localUpdatedAt || null };
        }
      }
      if (best) return { data: best.data, localUpdatedAt: best.localUpdatedAt };

      return { data: readData(), localUpdatedAt: readLocalUpdatedAt() };
    }

    function getState() {
      return apiFn(app + '/state', { method: 'GET' }).then(function (res) {
        // GET /api/suite/[app]/state wraps the document as { workspace: {...} }.
        // Unwrap it so isMissingDoc()/adoptServerDoc() see rev/data at the top
        // level. Responses without the wrapper pass through unchanged.
        if (
          res && res.ok && res.data && typeof res.data === 'object' &&
          res.data.workspace && typeof res.data.workspace === 'object'
        ) {
          return Object.assign({}, res, { data: res.data.workspace });
        }
        return res;
      });
    }

    function putState(body) {
      return apiFn(app + '/state', { method: 'PUT', body: body });
    }

    function isMissingDoc(res) {
      if (res.status === 404) return true;
      if (res.ok) {
        const data = res.data;
        if (data == null) return true;
        if (typeof data === 'object' && data.data == null && data.rev == null) return true;
      }
      return false;
    }

    function adoptServerDoc(doc) {
      if (!doc || typeof doc !== 'object') return;
      if (Number.isFinite(doc.rev)) rev = doc.rev;
      if (doc.id) docId = doc.id;
      serverKnown = true;
    }

    /* ---- boot() -------------------------------------------------------- */

    async function boot() {
      if (booted) return lastStatus;
      if (!signedIn()) {
        setStatus('signed-out');
        return 'signed-out';
      }

      setStatus('syncing');
      try {
        const res = await getState();

        if (res.status === 401) {
          setStatus('signed-out');
          return 'signed-out';
        }

        if (isMissingDoc(res)) {
          // First run on the server: migrate the newest local snapshot up.
          const seed = collectSeed();
          const created = await putState({
            data: seed.data,
            rev: 0,
            localUpdatedAt: seed.localUpdatedAt || readLocalUpdatedAt() || new Date().toISOString(),
            title: readTitle(),
            key: WORKSPACE_KEY
          });
          if (created.ok) {
            adoptServerDoc(created.data);
            setStatus('synced');
          } else if (created.status === 401) {
            setStatus('signed-out');
          } else {
            // Could not seed — localStorage stays authoritative.
            setStatus('offline');
          }
          booted = true;
          return lastStatus;
        }

        if (res.ok && res.data) {
          // Reconcile: last-write-wins on localUpdatedAt.
          adoptServerDoc(res.data);
          const serverTs = toMillis(res.data.localUpdatedAt);
          const localTs = toMillis(readLocalUpdatedAt());

          if (serverTs > localTs) {
            applyRemote(res.data.data, { rev: rev, docId: docId, localUpdatedAt: res.data.localUpdatedAt, title: res.data.title });
          } else if (localTs > serverTs) {
            // Local is ahead — push it up.
            queueSave();
          }
          setStatus('synced');
          booted = true;
          return lastStatus;
        }

        // Any other non-ok status: keep localStorage authoritative.
        setStatus('offline');
        booted = true;
        return lastStatus;
      } catch (error) {
        // Network failure — offline-safe: leave localStorage authoritative.
        setStatus('offline');
        booted = true;
        return 'offline';
      }
    }

    /* ---- queueSave() / flush ------------------------------------------- */

    function queueSave() {
      if (!signedIn()) return; // no-op when signed out
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        saveTimer = null;
        flush();
      }, debounceMs);
    }

    async function flush() {
      if (!signedIn()) return;
      if (inFlight) {
        pendingSave = true;
        return;
      }

      inFlight = true;
      setStatus('saving');

      const localUpdatedAt = readLocalUpdatedAt() || new Date().toISOString();
      const body = {
        data: readData(),
        rev: rev,
        localUpdatedAt: localUpdatedAt,
        title: readTitle(),
        key: WORKSPACE_KEY
      };

      try {
        const res = await putState(body);

        if (res.ok && res.data) {
          adoptServerDoc(res.data);
          setStatus('synced');
        } else if (res.status === 409 && res.data && res.data.server) {
          // Another writer won an optimistic race. Reconcile last-write-wins.
          const server = res.data.server;
          if (Number.isFinite(server.rev)) rev = server.rev;
          if (server.id) docId = server.id;
          serverKnown = true;
          const serverTs = toMillis(server.localUpdatedAt);
          const localTs = toMillis(localUpdatedAt);
          if (serverTs > localTs) {
            applyRemote(server.data, { rev: rev, docId: docId, localUpdatedAt: server.localUpdatedAt, title: server.title });
            setStatus('synced');
          } else {
            // Local still newer — retry the push with the fresh rev.
            pendingSave = true;
            setStatus('syncing');
          }
        } else if (res.status === 401) {
          setStatus('signed-out');
        } else {
          // Non-ok HTTP — localStorage stays authoritative.
          setStatus('offline');
        }
      } catch (error) {
        // Network failure — offline-safe. Keep the change queued for retry.
        pendingSave = true;
        setStatus('offline');
      } finally {
        inFlight = false;
        if (pendingSave) {
          pendingSave = false;
          // Coalesce: re-run after the debounce window so rapid edits batch.
          queueSave();
        }
      }
    }

    /* Force an immediate flush (e.g. on pagehide). Bypasses the debounce. */
    function saveNow() {
      if (!signedIn()) return Promise.resolve(lastStatus);
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      return flush();
    }

    function destroy() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      pendingSave = false;
    }

    return {
      boot: boot,
      queueSave: queueSave,
      saveNow: saveNow,
      destroy: destroy,
      getRev: function () { return rev; },
      getDocId: function () { return docId; },
      getStatus: function () { return lastStatus; },
      isServerKnown: function () { return serverKnown; }
    };
  }

  if (typeof window !== 'undefined') {
    window.createSuiteSync = createSuiteSync;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = createSuiteSync;
  }
})();
