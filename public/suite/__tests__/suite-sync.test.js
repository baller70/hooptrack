/** @jest-environment jsdom */
/**
 * Unit tests for the suite-sync client (public/suite/suite-sync.js).
 *
 * Pins the GET /api/suite/[app]/state contract: the route wraps the document
 * as { workspace: {...} } (app/api/suite/[app]/state/route.ts), and getState()
 * must unwrap it — otherwise an existing server doc is misdetected as missing
 * and boot() seeds a PUT that overwrites the server data. Also pins backward
 * compatibility with bare (unwrapped) responses, getDocId(), and the
 * signed-out no-op guarantee every static tool relies on.
 */
const createSuiteSync = require('../suite-sync.js')

/** Fake SuiteKit.api-shaped transport: records calls, replays canned responses. */
function makeApi(responses) {
  const calls = []
  const api = jest.fn((path, opts) => {
    const method = (opts && opts.method) || 'GET'
    calls.push({ path, method, body: opts && opts.body })
    const key = method + ' ' + path
    const res = responses[key]
    if (!res) return Promise.reject(new Error('unexpected call: ' + key))
    return Promise.resolve(typeof res === 'function' ? res(opts) : res)
  })
  api.calls = calls
  return api
}

const doc = (over) =>
  Object.assign(
    { id: 'doc-1', rev: 3, data: { hello: 'server' }, localUpdatedAt: '2026-07-04T10:00:00.000Z', title: 'T' },
    over,
  )

function makeSync(api, over) {
  return createSuiteSync(
    Object.assign(
      {
        app: 'practice-builder',
        api,
        isSignedIn: () => true,
        getData: () => ({ hello: 'local' }),
        getLocalUpdatedAt: () => '2026-07-04T09:00:00.000Z',
        legacyKeys: [],
      },
      over,
    ),
  )
}

describe('suite-sync boot() against the wrapped { workspace } GET response', () => {
  it('adopts an existing wrapped doc instead of seeding a PUT over it', async () => {
    const api = makeApi({
      'GET practice-builder/state': { ok: true, status: 200, data: { workspace: doc() } },
    })
    const applied = []
    const sync = makeSync(api, { applyRemote: (data) => applied.push(data) })

    const status = await sync.boot()

    expect(status).toBe('synced')
    // No PUT happened — the existing doc was NOT misread as missing.
    expect(api.calls.map((c) => c.method)).toEqual(['GET'])
    expect(sync.getRev()).toBe(3)
    expect(sync.getDocId()).toBe('doc-1')
    expect(sync.isServerKnown()).toBe(true)
    // Server timestamp is newer than local -> remote data applied.
    expect(applied).toEqual([{ hello: 'server' }])
  })

  it('still understands a bare (unwrapped) document response', async () => {
    const api = makeApi({
      'GET practice-builder/state': { ok: true, status: 200, data: doc({ id: 'doc-2', rev: 7 }) },
    })
    const sync = makeSync(api)

    expect(await sync.boot()).toBe('synced')
    expect(api.calls.map((c) => c.method)).toEqual(['GET'])
    expect(sync.getRev()).toBe(7)
    expect(sync.getDocId()).toBe('doc-2')
  })

  it('seeds the newest local snapshot when the server truly 404s', async () => {
    const api = makeApi({
      'GET practice-builder/state': { ok: false, status: 404, data: { error: 'No workspace yet' } },
      'PUT practice-builder/state': (opts) => ({
        ok: true,
        status: 200,
        data: { rev: 1, id: 'doc-new' },
      }),
    })
    const sync = makeSync(api)

    expect(await sync.boot()).toBe('synced')
    expect(api.calls.map((c) => c.method)).toEqual(['GET', 'PUT'])
    expect(api.calls[1].body.data).toEqual({ hello: 'local' })
    expect(sync.getDocId()).toBe('doc-new')
    expect(sync.getRev()).toBe(1)
  })

  it('is a complete no-op while signed out (boot + queueSave + saveNow)', async () => {
    const api = makeApi({})
    const sync = makeSync(api, { isSignedIn: () => false })

    expect(await sync.boot()).toBe('signed-out')
    sync.queueSave()
    await sync.saveNow()
    expect(api.calls).toHaveLength(0)
  })
})

describe('suite-sync saveNow()', () => {
  it('PUTs the current data with the adopted rev and re-adopts the ack', async () => {
    const api = makeApi({
      'GET practice-builder/state': { ok: true, status: 200, data: { workspace: doc() } },
      'PUT practice-builder/state': { ok: true, status: 200, data: { rev: 4, id: 'doc-1' } },
    })
    const sync = makeSync(api, { getLocalUpdatedAt: () => '2026-07-04T11:00:00.000Z' })

    await sync.boot()
    await sync.saveNow()

    const put = api.calls.find((c) => c.method === 'PUT')
    expect(put.body).toMatchObject({ data: { hello: 'local' }, rev: 3, key: 'workspace' })
    expect(sync.getRev()).toBe(4)
  })
})
