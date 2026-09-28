import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DASHBOARD_NEW_CONTACT_BADGE_DURATION,
  DASHBOARD_REFRESH_DEBOUNCE,
  DASHBOARD_REFRESH_INTERVAL,
  DASHBOARD_STALE_TIME,
} from '../config/dashboard'
import { getDashboardSnapshot } from '../services/dashboard'
import type { DashboardRequest, DashboardSnapshot } from '../types/dashboard'

type RefreshSource = 'initial' | 'filter' | 'manual' | 'polling' | 'visibility' | 'focus' | 'online'

export function useDashboard(filters: DashboardRequest | null) {
  const [data, setData] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [backgroundError, setBackgroundError] = useState(false)
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  const [newContacts, setNewContacts] = useState(0)
  const requestSequence = useRef(0)
  const hasData = useRef(false)
  const inFlight = useRef(false)
  const lastSuccessfulUpdateAt = useRef<number | null>(null)
  const lastRefreshTriggerAt = useRef(0)
  const currentSnapshot = useRef<DashboardSnapshot | null>(null)
  const loadedFilterKey = useRef<string | null>(null)
  const badgeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filterKey = useMemo(() => (filters ? JSON.stringify(filters) : null), [filters])

  const clearNewContacts = useCallback(() => {
    if (badgeTimeout.current) {
      clearTimeout(badgeTimeout.current)
      badgeTimeout.current = null
    }
    setNewContacts(0)
  }, [])

  const showNewContacts = useCallback((difference: number) => {
    if (badgeTimeout.current) clearTimeout(badgeTimeout.current)
    setNewContacts(difference)
    badgeTimeout.current = setTimeout(() => {
      setNewContacts(0)
      badgeTimeout.current = null
    }, DASHBOARD_NEW_CONTACT_BADGE_DURATION)
  }, [])

  const request = useCallback(async (source: RefreshSource) => {
    if (source !== 'filter' && inFlight.current) return

    if (!filters) {
      setLoading(false)
      setRefreshing(false)
      setError(false)
      setBackgroundError(false)
      return
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true)
      setLoading(false)
      setRefreshing(false)
      if (hasData.current) setBackgroundError(true)
      else setError(true)
      return
    }

    const requestId = ++requestSequence.current
    inFlight.current = true
    setIsOffline(false)

    if (hasData.current) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    if (source !== 'filter') setError(false)

    try {
      const snapshot = await getDashboardSnapshot(filters)

      if (requestId !== requestSequence.current) return

      const previousSnapshot = currentSnapshot.current
      const isAutomaticRefresh = source === 'polling'
        || source === 'visibility'
        || source === 'focus'
        || source === 'online'
      const canCompare = isAutomaticRefresh
        && loadedFilterKey.current === filterKey
        && previousSnapshot !== null
      const previousTotal = previousSnapshot?.kpis.current.valid_clicks ?? 0
      const difference = snapshot.kpis.current.valid_clicks - previousTotal

      setData(snapshot)
      hasData.current = true
      currentSnapshot.current = snapshot
      loadedFilterKey.current = filterKey
      lastSuccessfulUpdateAt.current = Date.now()
      setError(false)
      setBackgroundError(false)

      if (canCompare && difference > 0) showNewContacts(difference)
    } catch (caughtError) {
      if (requestId !== requestSequence.current) return

      if (import.meta.env.DEV) {
        console.error('[Adonay Dashboard] No fue posible actualizar el snapshot.', caughtError)
      }
      if (hasData.current) setBackgroundError(true)
      else setError(true)
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false)
        setRefreshing(false)
        inFlight.current = false
      }
    }
  }, [filterKey, filters, showNewContacts])

  const reload = useCallback(async () => {
    await request('manual')
  }, [request])

  const refreshIfStale = useCallback((source: Exclude<RefreshSource, 'initial' | 'filter' | 'manual' | 'polling'>) => {
    if (!filters || isOffline || typeof document === 'undefined' || document.visibilityState !== 'visible') return
    if (inFlight.current) return

    const now = Date.now()
    const lastUpdate = lastSuccessfulUpdateAt.current
    if (lastUpdate !== null && now - lastUpdate < DASHBOARD_STALE_TIME) return
    if (now - lastRefreshTriggerAt.current < DASHBOARD_REFRESH_DEBOUNCE) return

    lastRefreshTriggerAt.current = now
    void request(source)
  }, [filters, isOffline, request])

  useEffect(() => {
    requestSequence.current += 1
    currentSnapshot.current = null
    loadedFilterKey.current = null
    lastSuccessfulUpdateAt.current = null
    clearNewContacts()
    setData(null)
    hasData.current = false
    setLoading(Boolean(filters))
    setError(false)
    setBackgroundError(false)

    if (!filters) {
      setData(null)
      hasData.current = false
      setLoading(false)
      setRefreshing(false)
      setError(false)
      return
    }

    void request('filter')
  }, [clearNewContacts, filters, request])

  useEffect(() => {
    if (!filters) return

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !isOffline) void request('polling')
    }, DASHBOARD_REFRESH_INTERVAL)

    return () => window.clearInterval(intervalId)
  }, [filters, isOffline, request])

  useEffect(() => {
    if (!filters) return

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') refreshIfStale('visibility')
    }

    function handleFocus() {
      refreshIfStale('focus')
    }

    function handleOffline() {
      setIsOffline(true)
    }

    function handleOnline() {
      setIsOffline(false)
      if (document.visibilityState === 'visible') {
        if (inFlight.current) return
        lastRefreshTriggerAt.current = Date.now()
        void request('online')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [filters, refreshIfStale, request])

  useEffect(() => () => {
    if (badgeTimeout.current) clearTimeout(badgeTimeout.current)
  }, [])

  const visibleData = loadedFilterKey.current === filterKey ? data : null
  return { data: visibleData, loading, error, backgroundError, reload, refreshing, newContacts, isOffline }
}
