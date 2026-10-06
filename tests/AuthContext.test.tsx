import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://dashboard.test/', pretendToBeVisual: true })
Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true })
Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true })
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.Event = dom.window.Event

function fakeClient(session: Session | null, authStateCalls: { count: number }) {
  return {
    auth: {
      onAuthStateChange: () => {
        authStateCalls.count += 1
        return { data: { subscription: { unsubscribe() {} } } }
      },
      getSession: async () => ({ data: { session } }),
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    },
  }
}

// Note on scope: with `supabase` mocked to null there is no client on which `onAuthStateChange`
// could be called, so "no subscription is created" is structurally guaranteed rather than something
// this test can observe. A counter asserted to be 0 here would be vacuous — it could never fail.
// What this test does verify is the branch's observable output: loading settles, session and user
// stay null, and configurationError is propagated to consumers (which is what drives
// ConfigurationErrorScreen).
test('when Supabase is not configured, loading resolves false immediately and the configuration error reaches consumers', async (t) => {
  t.mock.module(new URL('../src/lib/supabase.ts', import.meta.url).href, {
    exports: {
      supabase: null,
      supabaseConfigError: 'not configured',
    },
  })
  const { AuthProvider, useAuth } = await import('../src/contexts/AuthContext.tsx?case=unconfigured')

  const { result, unmount } = renderHook(() => useAuth(), { wrapper: AuthProvider })

  try {
    await waitFor(() => assert.equal(result.current.loading, false))
    assert.equal(result.current.session, null)
    assert.equal(result.current.user, null)
    assert.equal(result.current.configurationError, 'not configured')
  } finally {
    unmount()
    cleanup()
  }
})

test('when Supabase is configured, restores the existing session and subscribes to auth changes', async (t) => {
  const authStateCalls = { count: 0 }
  const fixtureSession = {
    user: { id: 'user-1', email: 'cliente@adonay.test' },
    access_token: 'fixture-token',
  } as unknown as Session

  t.mock.module(new URL('../src/lib/supabase.ts', import.meta.url).href, {
    exports: {
      supabase: fakeClient(fixtureSession, authStateCalls),
      supabaseConfigError: null,
    },
  })
  const { AuthProvider, useAuth } = await import('../src/contexts/AuthContext.tsx?case=configured')

  const { result, unmount } = renderHook(() => useAuth(), { wrapper: AuthProvider })

  try {
    await waitFor(() => assert.equal(result.current.loading, false))
    assert.equal(result.current.session?.user.id, 'user-1')
    assert.equal(result.current.user?.id, 'user-1')
    assert.equal(result.current.configurationError, null)
    assert.equal(authStateCalls.count, 1)
  } finally {
    unmount()
    cleanup()
  }
})
