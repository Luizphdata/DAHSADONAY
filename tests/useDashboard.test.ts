import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { renderHook, waitFor, act, cleanup } from '@testing-library/react'
import type { DashboardRequest, DashboardSnapshot } from '../src/types/dashboard'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://dashboard.test/', pretendToBeVisual: true })
Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true })
Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true })
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.Event = dom.window.Event

let callCount = 0
let currentImpl: (params: DashboardRequest) => Promise<DashboardSnapshot> = async () => fixtureSnapshot(0)
// Every params object the hook actually asked for, in order. Without this, a test can only see
// THAT a request happened, not WHICH filters it carried — and the 20ms poller below means
// "a request happened" is true no matter what the code under test does.
const receivedParams: DashboardRequest[] = []

mock.module(new URL('../src/services/dashboard.ts', import.meta.url).href, {
  exports: {
    getDashboardSnapshot: (params: DashboardRequest) => {
      callCount += 1
      receivedParams.push(params)
      return currentImpl(params)
    },
  },
})
// Node's experimental module-mock `exports` are snapshotted once into plain values at import
// time (verified: a `get` accessor here is invoked exactly once, not re-evaluated per access),
// so these constants cannot vary per-test via a mutable outer binding. A single small interval
// is used for the whole file; tests that aren't specifically exercising polling use >=/>
// comparisons instead of exact call-count equality so a stray background tick can't make them
// flaky.
mock.module(new URL('../src/config/dashboard.ts', import.meta.url).href, {
  exports: {
    DASHBOARD_REFRESH_INTERVAL: 20,
    DASHBOARD_STALE_TIME: 15,
    DASHBOARD_REFRESH_DEBOUNCE: 5,
    DASHBOARD_NEW_CONTACT_BADGE_DURATION: 50,
  },
})

const { useDashboard } = await import('../src/hooks/useDashboard.ts')

function fixtureSnapshot(validClicks: number, previousAvailable = true): DashboardSnapshot {
  return {
    kpis: {
      period: { previous_available: previousAvailable },
      current: { valid_clicks: validClicks },
      previous: {},
      change: {},
    },
    breakdowns: { channels: [] },
    timeseries: { comparison: [], channels: [] },
    campaigns: { campaigns: [] },
    integrity: { core_totals_match: true },
  } as unknown as DashboardSnapshot
}

const filtersA: DashboardRequest = { preset: 'hoy', attribution_model: 'last' }
const filtersB: DashboardRequest = { preset: 'ayer', attribution_model: 'last' }

test('refetches when filters change and never shows data for a stale filter key', async () => {
  callCount = 0
  receivedParams.length = 0
  // Keyed on the REQUESTED preset, not on a mutable outer value. This is what makes the test
  // falsifiable: a background poll still carrying filtersA can only ever resolve to 10, so the
  // value 20 can appear if and only if a request was actually made with filtersB. Verified by
  // mutation — with `void request('filter')` removed from the hook's filter effect, this test
  // fails (before this change, it passed).
  currentImpl = async (params) => fixtureSnapshot(params.preset === 'ayer' ? 20 : 10)

  const { result, rerender, unmount } = renderHook(
    ({ filters }: { filters: DashboardRequest | null }) => useDashboard(filters),
    { initialProps: { filters: filtersA } },
  )

  try {
    await waitFor(() => assert.equal(result.current.data?.kpis.current.valid_clicks, 10))
    const callsAfterA = callCount
    assert.ok(callsAfterA >= 1)
    assert.ok(receivedParams.every((params) => params.preset === 'hoy'))

    rerender({ filters: filtersB })

    // The hook must drop A's data immediately on a filter change, not keep showing it while B
    // is in flight. Asserted synchronously, before any await, so a later resolution can't mask it.
    assert.equal(result.current.data, null)

    // THE discriminating assertion, and the reason it is synchronous. The filter effect calls the
    // service immediately, so by the time `rerender` has flushed effects the request for 'ayer'
    // must ALREADY exist. The 20ms poller cannot have produced it yet.
    //
    // Why neither obvious alternative works: `callCount` rises from polling alone, and keying the
    // fake on `params.preset` does not help either — the polling effect lists `filters` in its
    // deps, so with the filter refetch removed the poller itself re-subscribes and fetches 'ayer'
    // within 20ms. Timing is the only thing that separates the two paths.
    //
    // Verified by mutation: removing `void request('filter')` from the hook makes this line fail.
    assert.ok(
      receivedParams.some((params) => params.preset === 'ayer'),
      'the filter change must refetch synchronously, not wait for the next poll',
    )

    await waitFor(() => assert.equal(result.current.data?.kpis.current.valid_clicks, 20))
    assert.ok(callCount > callsAfterA)
  } finally {
    unmount()
    cleanup()
  }
})

test('polls for a background refresh without flipping loading back to true', async () => {
  callCount = 0
  currentImpl = async () => fixtureSnapshot(5)
  const loadingHistory: boolean[] = []

  function useProbe(filters: DashboardRequest | null) {
    const value = useDashboard(filters)
    loadingHistory.push(value.loading)
    return value
  }

  const { result, unmount } = renderHook(() => useProbe(filtersA))

  try {
    await waitFor(() => assert.equal(result.current.loading, false))
    assert.equal(result.current.data?.kpis.current.valid_clicks, 5)

    const callsAfterInitial = callCount
    loadingHistory.length = 0

    await waitFor(() => assert.ok(callCount > callsAfterInitial))

    assert.ok(loadingHistory.every((isLoading) => isLoading === false))
  } finally {
    unmount()
    cleanup()
  }
})

test('detects offline/online transitions via real DOM events', async () => {
  callCount = 0
  currentImpl = async () => fixtureSnapshot(7)

  const { result, unmount } = renderHook(() => useDashboard(filtersA))

  try {
    await waitFor(() => assert.equal(result.current.loading, false))
    assert.equal(result.current.isOffline, false)

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true, writable: true })
      window.dispatchEvent(new window.Event('offline'))
    })
    assert.equal(result.current.isOffline, true)

    // While offline the hook must stop requesting entirely. Waiting well past the mocked 20ms
    // polling interval proves the poll is actually suppressed rather than merely slow.
    const callsWhileOffline = callCount
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.equal(callCount, callsWhileOffline, 'no request may be issued while offline')

    const callsBeforeOnline = callCount

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true, writable: true })
      window.dispatchEvent(new window.Event('online'))
    })

    // Asserted synchronously, with no await and no timer elapsed: the hook's 'online' handler calls
    // the service directly, so the increment must already be visible. An `await waitFor(callCount >
    // before)` here would instead be satisfied by the next 20ms poll tick, and would still pass even
    // if the 'online' handler did nothing at all.
    assert.equal(callCount, callsBeforeOnline + 1, "the 'online' handler must refetch immediately")

    await waitFor(() => assert.equal(result.current.isOffline, false))
  } finally {
    unmount()
    cleanup()
  }
})
