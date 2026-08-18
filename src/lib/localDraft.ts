// Namespaced localStorage helpers backing useDurableForm's local mirror.
// Tier 0 forms use only this file — never anything network-capable.

export type LocalDraftRecord<T> = {
  value: T
  updatedAt: string
}

// Keyed by user as well as formKey: a session/team-scoped formKey (e.g. a
// friction session's respond form) is the same string for every
// participant, so without the user segment one participant's local draft
// leaks into the next person who opens that form on the same browser
// (e.g. signing out and back in as someone else).
function storageKey(formKey: string, userId: string | undefined) {
  return `eol:draft:${userId ?? 'anon'}:${formKey}`
}

export function readLocalDraft<T>(formKey: string, userId: string | undefined): LocalDraftRecord<T> | null {
  try {
    const raw = localStorage.getItem(storageKey(formKey, userId))
    return raw ? (JSON.parse(raw) as LocalDraftRecord<T>) : null
  } catch {
    return null
  }
}

export function writeLocalDraft<T>(formKey: string, userId: string | undefined, value: T, updatedAt = new Date().toISOString()) {
  try {
    localStorage.setItem(storageKey(formKey, userId), JSON.stringify({ value, updatedAt }))
  } catch {
    // localStorage unavailable (private browsing, quota) — degrade silently,
    // in-memory state still works for the current tab session.
  }
}

export function clearLocalDraft(formKey: string, userId: string | undefined) {
  try {
    localStorage.removeItem(storageKey(formKey, userId))
  } catch {
    // ignore
  }
}
