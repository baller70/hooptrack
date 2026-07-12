/* =========================================================================
   Smart Calendar — data layer (calendar-data.js owns the fetch + mapping)
   -------------------------------------------------------------------------
   Part of the Basketball Coach AI Suite. Self-contained browser JS (no
   bundler); app.js loads AFTER this and reads window.SuiteCalendarData.

   WHY THIS EXISTS
     app.js used to render a hardcoded fake October-2025 seed with zero
     network. Meanwhile GET /api/suite/calendar/data serves the REAL,
     tenant-scoped schedule (CalendarEvent + dated Practice-Builder practices,
     merged + RSVP-rolled). This module fetches that payload and maps it into
     the internal "task" shape app.js already renders (day/month/year/time/
     duration/type/icon), so the sidebar Calendar shows real events.

   LIVE CONTRACT — GET /api/suite/calendar/data
     (app/api/suite/calendar/data/route.ts, tenant-guarded via suiteAuth):
       { events: [{ id, source: 'event'|'practice',
                    type: 'practice'|'game'|'event', title,
                    start: ISO, end: ISO|null, arrival, location, opponent,
                    home: bool|null, fixed, recurrence, venueId, notes,
                    rsvp: { going, maybe, no, noResponse } }],
         venues: [{ id, name, address, courtType }] }

   FAIL-SOFT (matches branding-boot.js): a 401 (signed-out) or any network /
   parse error resolves to { ok:false, tasks:[] } — an EMPTY state, never the
   old fake seed. load() never rejects, so callers need no error handling.
   ========================================================================= */
(function (root) {
  'use strict';

  var DATA_URL = '/api/suite/calendar/data';

  var TYPE_LABEL = { practice: 'Practice', game: 'Game', event: 'Event' };
  var TYPE_ICON = { practice: 'activity', game: 'flame', event: 'calendar' };

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function makeId() {
    if (typeof root.crypto !== 'undefined' && typeof root.crypto.randomUUID === 'function') {
      return root.crypto.randomUUID();
    }
    return 'evt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  /* One server event -> the internal task shape app.js renders. Dates are read
     in the browser's local zone (the same zone every existing renderer uses via
     new Date(year, month, day)), so day/month/year/time stay mutually
     consistent. Returns null for a payload row we can't place on a calendar. */
  function toTask(ev) {
    if (!ev || !ev.start) return null;
    var start = new Date(ev.start);
    if (isNaN(start.getTime())) return null;

    var serverType = String(ev.type || 'event');

    var duration = serverType === 'practice' ? 90 : 60;
    if (ev.end) {
      var end = new Date(ev.end);
      if (!isNaN(end.getTime())) {
        var diff = Math.round((end.getTime() - start.getTime()) / 60000);
        if (diff > 0) duration = diff;
      }
    }

    var repeat;
    if (serverType === 'game') {
      if (ev.opponent) repeat = (ev.home === false ? 'Away vs ' : 'vs ') + ev.opponent;
      else repeat = ev.location || 'Game';
    } else if (serverType === 'practice') {
      repeat = 'Practice plan linked';
    } else {
      repeat = ev.location || 'Team event';
    }

    return {
      id: ev.id || makeId(),
      title: String(ev.title == null ? 'Untitled event' : ev.title) || 'Untitled event',
      day: start.getDate(),
      month: start.getMonth(),
      year: start.getFullYear(),
      time: pad(start.getHours()) + ':' + pad(start.getMinutes()),
      duration: duration,
      icon: TYPE_ICON[serverType] || 'calendar',
      type: TYPE_LABEL[serverType] || 'Event',
      repeat: repeat,
      complete: false,
      active: false,
      // Carry the real domain fields through untouched for future surfacing.
      source: ev.source || null,
      serverType: serverType,
      location: ev.location || null,
      opponent: ev.opponent || null,
      notes: ev.notes || null,
      playerId: ev.playerId || ev.player_id || null,
      playerName: ev.playerName || ev.player_name || null,
      rsvp: ev.rsvp || null,
    };
  }

  /* Whole payload -> sorted array of tasks (chronological, unplaceable rows
     dropped). Tolerant of a missing/!array events field. */
  function mapEvents(payload) {
    var events = payload && Array.isArray(payload.events) ? payload.events : [];
    var tasks = [];
    for (var i = 0; i < events.length; i++) {
      var task = toTask(events[i]);
      if (task) tasks.push(task);
    }
    tasks.sort(function (a, b) {
      var ay = a.year - b.year;
      if (ay) return ay;
      var am = a.month - b.month;
      if (am) return am;
      var ad = a.day - b.day;
      if (ad) return ad;
      return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
    });
    return tasks;
  }

  /* Fetch + map. Always resolves (signed-out / offline is a normal empty
     state), never rejects. */
  function load() {
    if (typeof root.fetch !== 'function') return Promise.resolve({ ok: false, tasks: [], venues: [] });
    return root
      .fetch(DATA_URL, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) return { ok: false, tasks: [], venues: [] }; // 401 / 5xx -> empty state
        return res.json().then(function (json) {
          return {
            ok: true,
            tasks: mapEvents(json),
            venues: json && Array.isArray(json.venues) ? json.venues : [],
          };
        });
      })
      .catch(function () { return { ok: false, tasks: [], venues: [] }; });
  }

  var API = { load: load, mapEvents: mapEvents, toTask: toTask };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.SuiteCalendarData = API;
})(typeof self !== 'undefined' ? self : this);
