import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDurableForm } from './useDurableForm'

describe('useDurableForm', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('tier 0 never issues a network request, even across many edits', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const { result } = renderHook(() =>
      useDurableForm({ formKey: 'friction-phase1', tier: 0, initialValue: '' })
    )

    act(() => result.current.setValue('what happened from my perspective...'))
    act(() => vi.advanceTimersByTime(1000))
    act(() => result.current.setValue('what I feel in my body...'))
    act(() => vi.advanceTimersByTime(1000))
    act(() => result.current.setValue('final answer'))
    act(() => vi.advanceTimersByTime(1000))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.current.saveState).toBe('local-only')
  })

  it('debounces rapid edits into a single localStorage write', async () => {
    const { result } = renderHook(() =>
      useDurableForm({ formKey: 'weekly-checkin', tier: 1, initialValue: '' })
    )

    act(() => result.current.setValue('a'))
    act(() => vi.advanceTimersByTime(200))
    act(() => result.current.setValue('ab'))
    act(() => vi.advanceTimersByTime(200))
    act(() => result.current.setValue('abc'))

    // Not yet past the debounce window.
    expect(localStorage.getItem('eol:draft:anon:weekly-checkin')).toBeNull()

    act(() => vi.advanceTimersByTime(700))

    const stored = JSON.parse(localStorage.getItem('eol:draft:anon:weekly-checkin')!)
    expect(stored.value).toBe('abc')
  })

  it('restores a local draft silently on mount, no confirmation step', () => {
    localStorage.setItem(
      'eol:draft:user-a:vision-reflection',
      JSON.stringify({ value: 'what we are building together', updatedAt: new Date().toISOString() })
    )

    const { result } = renderHook(() =>
      useDurableForm({ formKey: 'vision-reflection', tier: 1, initialValue: '', userId: 'user-a' })
    )

    expect(result.current.value).toBe('what we are building together')
  })

  it('does not leak one user\'s local draft into another user on the same session-scoped formKey', () => {
    // Regression test: a friction/vision session's formKey is the same
    // string for every participant (e.g. `friction-respond-${sessionId}`).
    // Without user-scoping the local storage key, whoever opens that form
    // next on the same browser (e.g. after signing out and back in as a
    // teammate) would see the previous person's answers pre-filled.
    const { result: userA } = renderHook(() =>
      useDurableForm({ formKey: 'friction-respond-session-1', tier: 4, initialValue: '', userId: 'user-a' })
    )
    act(() => userA.current.setValue("user A's private point of view"))
    act(() => vi.advanceTimersByTime(700))

    const { result: userB } = renderHook(() =>
      useDurableForm({ formKey: 'friction-respond-session-1', tier: 4, initialValue: '', userId: 'user-b' })
    )

    expect(userB.current.value).toBe('')
  })

  it('marks dirty while typing and clears dirty once the debounced save lands', () => {
    const { result } = renderHook(() =>
      useDurableForm({ formKey: 'checkin-text', tier: 0, initialValue: '' })
    )

    expect(result.current.isDirty).toBe(false)
    act(() => result.current.setValue('draining week'))
    expect(result.current.isDirty).toBe(true)

    act(() => vi.advanceTimersByTime(700))
    expect(result.current.isDirty).toBe(false)
  })

  it('discard clears the local draft', () => {
    const { result } = renderHook(() =>
      useDurableForm({ formKey: 'friction-scratch', tier: 0, initialValue: '' })
    )

    act(() => result.current.setValue('something raw'))
    act(() => vi.advanceTimersByTime(700))
    expect(localStorage.getItem('eol:draft:anon:friction-scratch')).not.toBeNull()

    act(() => result.current.discard())
    expect(localStorage.getItem('eol:draft:anon:friction-scratch')).toBeNull()
  })
})
