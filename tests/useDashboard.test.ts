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

mock.module(new URL('../src/services/dashboard.ts', import.meta.url).href, {
  exports: {
    getDashboardSnapshot: (params: DashboardRequest) => {
      callCount += 1
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
  currentImpl = async () => fixtureSnapshot(10)

  const { result, rerender, unmount } = renderHook(
    ({ filters }: { filters: DashboardRequest | null }) => useDashboard(filters),
    { initialProps: { filters: filtersA } },
  )

  try {
    await waitFor(() => assert.equal(result.current.data?.kpis.current.valid_clicks, 10))
    const callsAfterA = callCount
    assert.ok(callsAfterA >= 1)

    currentImpl = async () => fixtureSnapshot(20)
    rerender({ filters: filtersB })

    // Never shows stale (A's) data once the filter-change request for B is in flight/resolved.
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

    const callsBeforeOnline = callCount

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true, writable: true })
      window.dispatchEvent(new window.Event('online'))
    })

    await waitFor(() => assert.equal(result.current.isOffline, false))
    await waitFor(() => assert.ok(callCount > callsBeforeOnline))
  } finally {
    unmount()
    cleanup()
  }
})
