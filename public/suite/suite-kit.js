/* =========================================================================
   Basketball Coach AI Suite — shared template kit helpers
   -------------------------------------------------------------------------
   Plain browser JS (no imports / no bundler). Loaded via <script src> before
   each tool's own script. Exposes a single global: window.SuiteKit.

   Factors the EXACT Practice Builder primitives out of
   public/practice-builder/practice-builder.js so every new tool stays 1:1:
     - escaping + id + format + color helpers
     - onAction(root, map): data-* click delegator
     - buildPrintBooklet(opts) + printActive()/printBooklet(): the dual
       print path with afterprint cleanup
     - createResizer(root, cfg): the pointer-capture resize pattern
     - api(path, opts): fetch wrapper around /api/suite (credentials included)
   ========================================================================= */

(function () {
  'use strict';

  /* ---- escaping ---------------------------------------------------------- */

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  /* ---- ids --------------------------------------------------------------- */

  function createId() {
    return 'id-' + Math.random().toString(36).slice(2, 9);
  }

  /* ---- number / time formatting ----------------------------------------- */

  function formatMinutes(minutes) {
    const safeMinutes = Math.max(0, Math.round(Number(minutes || 0)));
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    if (hours && mins) return `${hours}h ${mins}min`;
    if (hours) return `${hours}h`;
    return `${mins}min`;
  }

  function formatClock(minutes) {
    const safeMinutes = Math.max(0, Math.round(Number(minutes || 0)));
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
  }

  function formatTimer(seconds) {
    const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)));
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }

  function formatDisplayDate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const [year, month, day] = value.split('-');
    return `${month}/${day}/${year}`;
  }

  function parseTime(value) {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  function formatDisplayTime(value) {
    const minutes = parseTime(value);
    if (minutes == null) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour = hours % 12 || 12;
    return `${String(hour).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
  }

  /* ---- color ------------------------------------------------------------- */

  function normalizeHexColor(value, fallback) {
    const text = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
  }

  function getReadableTextColor(hexColor) {
    const color = normalizeHexColor(hexColor, '#ffffff').replace('#', '');
    const red = parseInt(color.slice(0, 2), 16);
    const green = parseInt(color.slice(2, 4), 16);
    const blue = parseInt(color.slice(4, 6), 16);
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return luminance > 0.62 ? '#111827' : '#ffffff';
  }

  /* ---- dom helpers ------------------------------------------------------- */

  function resolveEl(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    if (target.nodeType === 1) return target;
    return null;
  }

  /* ---- data-* click delegator -------------------------------------------
     onAction(root, map) wires ONE delegated click listener on root. Each
     [data-action="x"] click invokes map.x(ctx). ctx carries the resolved
     target plus the nearest data-section-id / data-drill-id / data-id so a
     handler rarely has to walk the DOM. Mirrors handleAction() in the
     Practice Builder (SELECT elements are ignored — they fire change). A
     `default` key catches unmapped actions; `miss` fires on no-match clicks.
     Returns a teardown function.
     --------------------------------------------------------------------- */

  function onAction(rootEl, map, options) {
    const root = resolveEl(rootEl);
    const config = map || {};
    const opts = options || {};
    if (!root) return function () {};

    const handler = (event) => {
      const target = event.target.closest('[data-action]');
      if (!target || !root.contains(target)) {
        if (typeof config.miss === 'function') config.miss({ event, root });
        return;
      }
      if (opts.includeSelect !== true && target.tagName === 'SELECT') return;

      const action = target.dataset.action;
      const fn = config[action] || config.default;
      if (typeof fn !== 'function') return;

      const sectionEl = target.closest('[data-section-id]');
      const drillEl = target.closest('[data-drill-id]');
      const itemEl = target.closest('[data-id]');
      fn({
        action,
        target,
        event,
        root,
        dataset: target.dataset,
        sectionId: sectionEl ? sectionEl.dataset.sectionId : undefined,
        drillId: drillEl ? drillEl.dataset.drillId : undefined,
        id: itemEl ? itemEl.dataset.id : undefined
      });
    };

    root.addEventListener('click', handler);
    return function () {
      root.removeEventListener('click', handler);
    };
  }

  /* ---- pointer-capture resizer factory ----------------------------------
     createResizer(root, { handles: [{ selector, start, move, end }] })
     factors the handleResizeStart / handleResizeMove / handleResizeEnd
     pointer-capture pattern (column / row / header-row resizers). On
     pointerdown inside root, the first matching handle's start(handleEl,
     event) returns an opaque `data` object (or null to skip); move(data,
     event) runs on every pointermove; end(data, event) runs once on
     pointerup. Returns a destroy() function.
     --------------------------------------------------------------------- */

  function createResizer(rootEl, config) {
    const root = resolveEl(rootEl);
    const handles = (config && config.handles) || [];
    if (!root) return function () {};

    let active = null;

    const onDown = (event) => {
      for (let i = 0; i < handles.length; i += 1) {
        const handle = handles[i];
        const handleEl = event.target.closest(handle.selector);
        if (!handleEl || !root.contains(handleEl)) continue;
        const data = typeof handle.start === 'function' ? handle.start(handleEl, event) : {};
        if (data === null || data === false) return;
        active = { handle, data };
        if (typeof handleEl.setPointerCapture === 'function') {
          try { handleEl.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
        }
        event.preventDefault();
        return;
      }
    };

    const onMove = (event) => {
      if (!active) return;
      event.preventDefault();
      if (typeof active.handle.move === 'function') active.handle.move(active.data, event);
    };

    const onUp = (event) => {
      if (!active) return;
      const finished = active;
      active = null;
      if (typeof finished.handle.end === 'function') finished.handle.end(finished.data, event);
    };

    root.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return function () {
      root.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      active = null;
    };
  }

  /* ---- print booklet builder --------------------------------------------
     buildPrintBooklet(opts) returns the booklet-* HTML string consumed by
     the print CSS in suite-kit.css. Factored from renderBookletPrintArea /
     renderBookletPractice / renderBookletSection. opts:
       { kicker, teamName, title,
         summary: [{ label, value }],            // cover dl (3 cells)
         index:   [{ n, title, date, note }],    // cover index rows
         practices: [{
           logoSrc, kicker, title, subtitle,
           meta:  [{ label, value }],            // header dl
           stats: [{ label, value }],            // stat grid
           statusLine,                           // optional event status
           sections: [{
             title, timer,
             head: ['Time','Exercises','Notes'], // optional column heads
             rows: [{ time, title, notes } | { cells: [...] }]
           }]
         }] }
     --------------------------------------------------------------------- */

  function buildBookletRow(row) {
    if (row && Array.isArray(row.cells)) {
      return `<div class="booklet-row">${row.cells
        .map((cell) => `<span>${escapeHtml(cell)}</span>`)
        .join('')}</div>`;
    }
    const source = row || {};
    return `
      <div class="booklet-row">
        <span><strong>${escapeHtml(source.time == null ? '' : source.time)}</strong> min</span>
        <span>${escapeHtml(source.title || '')}</span>
        <span>${escapeHtml(source.notes || '')}</span>
      </div>`;
  }

  function buildBookletSection(section) {
    const data = section || {};
    const head = Array.isArray(data.head) && data.head.length ? data.head : ['Time', 'Exercises', 'Notes'];
    const rows = Array.isArray(data.rows) ? data.rows : [];
    return `
      <section class="booklet-section">
        <header>
          <h2>${escapeHtml(data.title || 'SECTION')}</h2>
          <strong>${escapeHtml(data.timer == null ? '' : data.timer)}</strong>
        </header>
        <div class="booklet-table">
          <div class="booklet-row booklet-head">
            ${head.map((label) => `<span>${escapeHtml(label)}</span>`).join('')}
          </div>
          ${rows.map(buildBookletRow).join('')}
        </div>
      </section>`;
  }

  function buildBookletPractice(practice) {
    const data = practice || {};
    const meta = Array.isArray(data.meta) ? data.meta : [];
    const stats = Array.isArray(data.stats) ? data.stats : [];
    const sections = Array.isArray(data.sections) ? data.sections : [];
    return `
      <article class="booklet-practice">
        <header class="booklet-practice-header">
          <div class="booklet-logo-wrap">
            ${data.logoSrc ? `<img src="${escapeAttribute(data.logoSrc)}" alt="">` : ''}
          </div>
          <div class="booklet-title-block">
            <span>${escapeHtml(data.kicker || '')}</span>
            <h1>${escapeHtml(data.title || 'Practice Plan')}</h1>
            <p>${escapeHtml(data.subtitle || '')}</p>
          </div>
          <dl class="booklet-meta">
            ${meta.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join('')}
          </dl>
        </header>
        <div class="booklet-stat-grid">
          ${stats.map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('')}
        </div>
        ${data.statusLine ? `<p class="booklet-event-status">${escapeHtml(data.statusLine)}</p>` : ''}
        ${sections.map(buildBookletSection).join('')}
      </article>`;
  }

  function buildPrintBooklet(opts) {
    const data = opts || {};
    const summary = Array.isArray(data.summary) ? data.summary : [];
    const index = Array.isArray(data.index) ? data.index : [];
    const practices = Array.isArray(data.practices) ? data.practices : [];
    return `
      <article class="booklet-cover">
        <div>
          <span>${escapeHtml(data.kicker || 'Suite Package')}</span>
          <h1>${escapeHtml(data.teamName || 'Team Basketball')}</h1>
          <p>${escapeHtml(data.title || '')}</p>
        </div>
        <dl>
          ${summary.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join('')}
        </dl>
        <div class="booklet-index">
          <h2>${escapeHtml(data.indexLabel || 'Index')}</h2>
          ${index.map((row, position) => `
            <div>
              <span>${escapeHtml(row.n == null ? position + 1 : row.n)}</span>
              <strong>${escapeHtml(row.title || '')}</strong>
              <em>${escapeHtml(row.date || '')}</em>
              <small>${escapeHtml(row.note || '')}</small>
            </div>
          `).join('')}
        </div>
      </article>
      ${practices.map(buildBookletPractice).join('')}`;
  }

  /* ---- dual print path --------------------------------------------------
     printActive(opts?)  — print the live page (no booklet). Clears any stale
                           booklet markup first so it never bleeds through.
     printBooklet(opts)  — render a booklet into the print area, flip
                           body.print-booklet-mode, and print.
     An afterprint listener (installed once) tears the booklet mode back down.
     opts.area selects the booklet container (element | selector); defaults
     to .booklet-print-area / #bookletPrintArea.
     --------------------------------------------------------------------- */

  let activePrintMode = 'active';
  let printCleanupInstalled = false;

  function resolveBookletArea(area) {
    return (
      resolveEl(area) ||
      document.querySelector('.booklet-print-area') ||
      document.getElementById('bookletPrintArea')
    );
  }

  function clearPrintMode() {
    if (activePrintMode === 'booklet') {
      document.body.classList.remove('print-booklet-mode');
      const area = resolveBookletArea();
      if (area) area.innerHTML = '';
    }
    activePrintMode = 'active';
  }

  function ensurePrintCleanup() {
    if (printCleanupInstalled) return;
    printCleanupInstalled = true;
    window.addEventListener('afterprint', clearPrintMode);
  }

  function printActive(opts) {
    const options = opts || {};
    ensurePrintCleanup();
    if (typeof options.onBeforePrint === 'function') options.onBeforePrint();
    activePrintMode = 'active';
    document.body.classList.remove('print-booklet-mode');
    const area = resolveBookletArea(options.area);
    if (area) area.innerHTML = '';
    window.print();
  }

  function printBooklet(opts) {
    const options = opts || {};
    ensurePrintCleanup();
    const area = resolveBookletArea(options.area);
    if (!area) return false;

    const html = typeof options.html === 'string' ? options.html : buildPrintBooklet(options.booklet || options);
    area.innerHTML = html;
    if (typeof options.onBeforePrint === 'function') options.onBeforePrint();
    activePrintMode = 'booklet';
    document.body.classList.add('print-booklet-mode');
    window.print();
    return true;
  }

  /* ---- /api/suite fetch wrapper -----------------------------------------
     api(path, opts) — credentials always included. `path` may be a bare
     resource ('practice-builder/state'), a root-absolute API path
     ('/api/suite/...'), or a full URL. Object bodies are JSON-encoded.
     Never throws on HTTP status — resolves { ok, status, data, headers } so
     callers (and suite-sync) can branch on 404 / 409. Network failures still
     reject, which callers treat as "offline".
     --------------------------------------------------------------------- */

  function resolveApiUrl(path) {
    const value = String(path || '');
    if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value;
    return '/api/suite/' + value.replace(/^\/+/, '');
  }

  async function readBody(res) {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      return text;
    }
  }

  async function api(path, opts) {
    const options = opts || {};
    const init = Object.assign({ credentials: 'include' }, options);
    const headers = Object.assign({}, options.headers);

    if (
      init.body != null &&
      typeof init.body !== 'string' &&
      !(typeof FormData !== 'undefined' && init.body instanceof FormData) &&
      !(typeof URLSearchParams !== 'undefined' && init.body instanceof URLSearchParams)
    ) {
      if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(init.body);
    }
    init.headers = headers;

    const res = await fetch(resolveApiUrl(path), init);
    const data = await readBody(res);
    return { ok: res.ok, status: res.status, data, headers: res.headers };
  }

  /* ---- export ------------------------------------------------------------ */

  const SuiteKit = {
    escapeHtml,
    escapeAttribute,
    createId,
    formatMinutes,
    formatClock,
    formatTimer,
    formatDisplayDate,
    formatDisplayTime,
    parseTime,
    normalizeHexColor,
    getReadableTextColor,
    onAction,
    createResizer,
    buildPrintBooklet,
    printActive,
    printBooklet,
    clearPrintMode,
    api
  };

  if (typeof window !== 'undefined') {
    window.SuiteKit = SuiteKit;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SuiteKit;
  }
})();
