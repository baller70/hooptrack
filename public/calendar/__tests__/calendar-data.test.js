/** @jest-environment jsdom */
/**
 * Unit tests for the Smart Calendar data layer
 * (public/calendar/calendar-data.js — toTask / mapEvents).
 *
 * Pins the LIVE contract of GET /api/suite/calendar/data
 * (app/api/suite/calendar/data/route.ts):
 *   { events:[{ id, source, type, title, start, end, ..., rsvp }], venues:[] }
 * app.js previously rendered a hardcoded fake October-2025 seed; these tests
 * pin that real payload rows coerce into the internal task shape app.js renders
 * (day/month/year/time/duration/type/icon) and that unplaceable rows drop.
 *
 * Dates are asserted with get-based expectations derived from the same local
 * Date the mapper uses, so the test is timezone-agnostic (no fixed HH:MM).
 */
const { toTask, mapEvents } = require('../calendar-data.js')

/** Trimmed copy of the real prod payload (fetched 2026-07-04). */
function livePayload() {
  return {
    events: [
      {
        id: 'cmr0e9pnn00cy13urfumx82m8',
        source: 'event',
        type: 'game',
        title: 'vs Westfield HS',
        start: '2026-04-28T17:00:00.000Z',
        end: '2026-04-28T19:00:00.000Z',
        arrival: null,
        location: 'Home',
        opponent: 'Westfield HS',
        home: true,
        fixed: true,
        recurrence: null,
        venueId: null,
        notes: null,
        rsvp: { going: 0, maybe: 0, no: 0, noResponse: 6 },
      },
      {
        id: 'cmr0e9ozd000f13urdzazq8f3',
        source: 'practice',
        type: 'practice',
        title: 'Skills Practice 1',
        start: '2026-06-01T20:30:00.000Z',
        end: null,
        arrival: null,
        location: null,
        opponent: null,
        home: null,
        fixed: false,
        recurrence: null,
        venueId: null,
        notes: null,
        rsvp: { going: 0, maybe: 0, no: 0, noResponse: 6 },
      },
    ],
    venues: [],
  }
}

describe('toTask', () => {
  it('maps a real GAME row into the internal task shape', () => {
    const ev = livePayload().events[0]
    const d = new Date(ev.start)
    const task = toTask(ev)
    expect(task).toMatchObject({
      id: 'cmr0e9pnn00cy13urfumx82m8', // server id preserved (not a fresh uuid)
      title: 'vs Westfield HS',
      type: 'Game',
      icon: 'flame',
      duration: 120, // 17:00Z -> 19:00Z = 2h from start/end
      source: 'event',
      serverType: 'game',
      opponent: 'Westfield HS',
      repeat: 'vs Westfield HS', // home !== false
    })
    // day/month/year track the browser-local Date the renderers also use.
    expect(task.day).toBe(d.getDate())
    expect(task.month).toBe(d.getMonth())
    expect(task.year).toBe(d.getFullYear())
    expect(task.time).toBe(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'))
  })

  it('maps a PRACTICE row with no end to a 90-min default', () => {
    const ev = livePayload().events[1]
    const task = toTask(ev)
    expect(task).toMatchObject({
      id: 'cmr0e9ozd000f13urdzazq8f3',
      title: 'Skills Practice 1',
      type: 'Practice',
      icon: 'activity',
      duration: 90,
      source: 'practice',
      serverType: 'practice',
      repeat: 'Practice plan linked',
    })
  })

  it('derives Away framing when home === false', () => {
    const task = toTask({ id: 'x', type: 'game', title: 'at Rival', start: '2026-05-01T17:00:00.000Z', end: '2026-05-01T19:00:00.000Z', opponent: 'Rival', home: false })
    expect(task.repeat).toBe('Away vs Rival')
  })

  it('drops an unplaceable row (missing/invalid start)', () => {
    expect(toTask(null)).toBeNull()
    expect(toTask({ id: 'a', type: 'event', title: 'No date' })).toBeNull()
    expect(toTask({ id: 'b', type: 'event', title: 'Bad date', start: 'not-a-date' })).toBeNull()
  })
})

describe('mapEvents', () => {
  it('maps + chronologically sorts the payload, dropping bad rows', () => {
    const payload = livePayload()
    payload.events.push({ id: 'bad', type: 'event', title: 'undated' }) // unplaceable
    const tasks = mapEvents(payload)
    expect(tasks).toHaveLength(2) // bad row dropped
    // April game sorts before June practice regardless of input order.
    expect(tasks[0].title).toBe('vs Westfield HS')
    expect(tasks[1].title).toBe('Skills Practice 1')
  })

  it('is tolerant of a missing events field (empty state)', () => {
    expect(mapEvents(null)).toEqual([])
    expect(mapEvents({})).toEqual([])
    expect(mapEvents({ events: 'nope' })).toEqual([])
  })
})
