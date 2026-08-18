import { supabase, isSupabaseConfigured } from './supabase'

// Server-side draft mirror for tier 1-4 forms (form_drafts table, owner-only
// RLS). Tier 0 forms must never import this module — see localDraft.ts.

export type ServerDraftRecord<T> = {
  value: T
  updatedAt: string
}

export async function readServerDraft<T>(userId: string, formKey: string): Promise<ServerDraftRecord<T> | null> {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase
    .from('form_drafts')
    .select('payload, updated_at')
    .eq('user_id', userId)
    .eq('form_key', formKey)
    .maybeSingle()
  if (error || !data) return null
  return { value: data.payload as T, updatedAt: data.updated_at as string }
}

export async function writeServerDraft<T>(userId: string, formKey: string, value: T): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  await supabase
    .from('form_drafts')
    .upsert({ user_id: userId, form_key: formKey, payload: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,form_key' })
}

export async function clearServerDraft(userId: string, formKey: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  await supabase.from('form_drafts').delete().eq('user_id', userId).eq('form_key', formKey)
}
