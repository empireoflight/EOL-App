import { useCallback, useEffect, useRef, useState } from 'react'
import { readLocalDraft, writeLocalDraft, clearLocalDraft } from '../lib/localDraft'
import { readServerDraft, writeServerDraft, clearServerDraft } from '../lib/serverDraft'

export type SaveState = 'idle' | 'saving' | 'saved' | 'local-only'

export type UseDurableFormOptions<T> = {
  /** Unique key for this form, namespaces local + server drafts. */
  formKey: string
  /** Privacy tier of the content. Tier 0 is local-only and NEVER networked. */
  tier: 0 | 1 | 2 | 3 | 4
  initialValue: T
  /** Required for tier 1-4 so the server draft can be scoped to the owner. */
  userId?: string
  debounceMs?: number
}

export type UseDurableFormResult<T> = {
  value: T
  setValue: (next: T) => void
  saveState: SaveState
  /** Clears both local and server drafts (call on successful submit). */
  discard: () => void
  isDirty: boolean
}

const DEFAULT_DEBOUNCE_MS = 700

export function useDurableForm<T>({
  formKey,
  tier,
  initialValue,
  userId,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseDurableFormOptions<T>): UseDurableFormResult<T> {
  const isTierZero = tier === 0

  // Silent restore on mount — no confirmation modal, per spec §17. The local
  // draft (a synchronous localStorage read) is restored via a lazy useState
  // initializer rather than an effect, since it's a plain synchronous read,
  // not a subscription or async fetch.
  const [value, setValueState] = useState<T>(() => {
    const local = readLocalDraft<T>(formKey, userId)
    return local ? local.value : initialValue
  })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [isDirty, setIsDirty] = useState(false)
  const lastSavedRef = useRef<T>(value)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tier 1-4 only: reconcile against the server draft (device-switch case).
  // Whichever setState calls happen here run inside the promise callback,
  // not synchronously in the effect body.
  useEffect(() => {
    if (isTierZero || !userId) return

    const local = readLocalDraft<T>(formKey, userId)
    let cancelled = false
    readServerDraft<T>(userId, formKey).then((server) => {
      if (cancelled) return
      // Prefer whichever draft is more recent (device switch vs. same-device resume).
      const winner =
        local && server
          ? new Date(local.updatedAt) >= new Date(server.updatedAt)
            ? local
            : server
          : local ?? server
      if (winner) {
        setValueState(winner.value)
        lastSavedRef.current = winner.value
      }
    })
    return () => {
      cancelled = true
    }
    // Only ever runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = useCallback(
    async (next: T) => {
      writeLocalDraft(formKey, userId, next)

      if (isTierZero) {
        setSaveState('local-only')
        return
      }

      if (!userId) {
        setSaveState('local-only')
        return
      }

      setSaveState('saving')
      await writeServerDraft(userId, formKey, next)
      setSaveState('saved')
    },
    [formKey, isTierZero, userId]
  )

  const setValue = useCallback(
    (next: T) => {
      setValueState(next)
      setIsDirty(true)

      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        lastSavedRef.current = next
        setIsDirty(false)
        void persist(next)
      }, debounceMs)
    },
    [debounceMs, persist]
  )

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const discard = useCallback(() => {
    clearLocalDraft(formKey, userId)
    if (!isTierZero && userId) void clearServerDraft(userId, formKey)
    setIsDirty(false)
    setSaveState('idle')
  }, [formKey, isTierZero, userId])

  return { value, setValue, saveState, discard, isDirty }
}
