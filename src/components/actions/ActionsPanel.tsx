import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTeamVision } from '../../hooks/useVision'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { STATUS_LABEL } from '../../lib/taskStatus'
import { Card } from '../shared/Card'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'
import { Avatar } from '../shared/Avatar'
import type { Action } from '../../lib/types'

function useActions(teamId: string | undefined) {
  return useQuery({
    queryKey: ['actions', teamId],
    queryFn: async (): Promise<Action[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('team_id', teamId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

// Lighter sibling to ExperimentsPage.tsx — same list+form-sidebar layout
// and local-hook-plus-inline-mutations pattern, but no pillar select and
// no hypothesis/learning fields, since actions are plain to-dos.
export function ActionsPanel({ teamId }: { teamId: string | undefined }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: vision } = useTeamVision(teamId)
  const { data: members } = useTeamMembers(teamId)
  const { data: actions, isLoading } = useActions(teamId)

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', assigneeId: '', dueDate: '' })

  const startEdit = (action: Action) => {
    setEditingId(action.id)
    setEditDraft({ title: action.title, assigneeId: action.assignee_id ?? '', dueDate: action.due_date ?? '' })
  }

  const createAction = useMutation({
    mutationFn: async () => {
      if (!supabase || !teamId || !user) throw new Error('Not ready')
      const { error } = await supabase.from('actions').insert({
        team_id: teamId,
        vision_id: vision?.id ?? null,
        title,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        created_by: user.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setTitle('')
      setAssigneeId('')
      setDueDate('')
      queryClient.invalidateQueries({ queryKey: ['actions', teamId] })
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Action['status'] }) => {
      if (!supabase) throw new Error('Not ready')
      const { error } = await supabase.from('actions').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actions', teamId] }),
  })

  const updateAction = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Not ready')
      const { error } = await supabase
        .from('actions')
        .update({ title: editDraft.title, assignee_id: editDraft.assigneeId || null, due_date: editDraft.dueDate || null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['actions', teamId] })
    },
  })

  const memberName = (id: string | null) => members?.find((m) => m.user_id === id)?.users?.name

  return (
    <div className="flex flex-wrap gap-6">
      <div className="min-w-[320px] flex-1">
        {isLoading || !actions || actions.length === 0 ? (
          <Card>
            <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
              No actions yet.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {actions.map((action) =>
              editingId === action.id ? (
                <Card key={action.id}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      updateAction.mutate(action.id)
                    }}
                    className="flex flex-col gap-3.5"
                  >
                    <Input label="Title" required value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} />
                    <label className="flex flex-col gap-1.5 text-left">
                      <span className="text-[11px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                        Assignee
                      </span>
                      <select
                        value={editDraft.assigneeId}
                        onChange={(e) => setEditDraft({ ...editDraft, assigneeId: e.target.value })}
                        className="rounded-lg border px-3 py-2.5 text-[13px]"
                        style={{ borderColor: 'var(--color-eol-border-strong)', background: 'var(--color-eol-surface-light)' }}
                      >
                        <option value="">Unassigned</option>
                        {(members ?? []).map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.users?.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Input label="Due date" type="date" value={editDraft.dueDate} onChange={(e) => setEditDraft({ ...editDraft, dueDate: e.target.value })} />
                    <div className="flex gap-2">
                      <Button type="submit" loading={updateAction.isPending} className="flex-1">
                        Save
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setEditingId(null)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <Card key={action.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[14.5px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                      {action.title}
                    </div>
                    {action.status !== 'done' && (
                      <button
                        type="button"
                        onClick={() => startEdit(action)}
                        className="shrink-0 text-[11.5px] font-medium"
                        style={{ color: 'var(--color-eol-accent-label)' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  <div
                    className="mt-3 flex items-center gap-3 border-t pt-2.5 text-[11.5px]"
                    style={{ borderColor: 'var(--color-eol-border)', color: 'var(--color-eol-text-muted)' }}
                  >
                    {action.assignee_id && (
                      <span className="flex items-center gap-1.5">
                        <Avatar name={memberName(action.assignee_id) ?? '?'} size={20} />
                      </span>
                    )}
                    <select
                      value={action.status}
                      onChange={(e) => updateStatus.mutate({ id: action.id, status: e.target.value as Action['status'] })}
                      className="shrink-0 rounded-full border-none px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: 'var(--color-tier2-bg)', color: 'var(--color-tier2-fg)' }}
                    >
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {action.due_date && <span className="ml-auto">{action.due_date}</span>}
                  </div>
                </Card>
              )
            )}
          </div>
        )}
      </div>

      <Card className="w-[300px] shrink-0">
        {!showForm ? (
          <Button variant="secondary" className="w-full" onClick={() => setShowForm(true)}>
            + New action
          </Button>
        ) : (
          <>
            <div className="mb-3.5 text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              New action
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createAction.mutate()
              }}
              className="flex flex-col gap-3.5"
            >
              <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Send the agenda around" />
              <label className="flex flex-col gap-1.5 text-left">
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                  Assignee
                </span>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="rounded-lg border px-3 py-2.5 text-[13px]"
                  style={{ borderColor: 'var(--color-eol-border-strong)', background: 'var(--color-eol-surface-light)' }}
                >
                  <option value="">Unassigned</option>
                  {(members ?? []).map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.users?.name}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <Button type="submit" loading={createAction.isPending} className="w-full">
                Add action
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  )
}
