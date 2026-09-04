import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTeamVision } from '../../hooks/useVision'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { Input, Textarea } from '../../components/shared/Input'
import { Avatar } from '../../components/shared/Avatar'
import { LearningPrompt } from '../../components/experiments/LearningPrompt'
import { TaskTypeBadge } from '../../components/shared/TaskTypeBadge'
import { STATUS_LABEL, type TaskStatus } from '../../lib/taskStatus'
import type { Action, Experiment } from '../../lib/types'

type TaskRow = { kind: 'action'; data: Action } | { kind: 'experiment'; data: Experiment }

type SortKey = 'title' | 'type' | 'assignee' | 'status' | 'due_date'
type SortState = { key: SortKey; dir: 'asc' | 'desc' }

// Lifecycle order, not alphabetical — sorting by status should read as
// "how far along," not a-to-z.
const STATUS_ORDER: Record<TaskStatus, number> = { not_started: 0, in_progress: 1, done: 2, dropped: 3 }

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

function useExperiments(teamId: string | undefined) {
  return useQuery({
    queryKey: ['experiments', teamId],
    queryFn: async (): Promise<Experiment[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .eq('team_id', teamId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

// Rows with no due date (or no assignee, when sorting by "who") always sink
// to the bottom regardless of sort direction — there's nothing to compare
// them against, so flipping direction shouldn't yank blank rows to the top.
function compareRows(a: TaskRow, b: TaskRow, sort: SortState, getAssigneeName: (id: string | null) => string | null): number {
  const dir = sort.dir === 'asc' ? 1 : -1
  switch (sort.key) {
    case 'title':
      return dir * a.data.title.localeCompare(b.data.title)
    case 'type':
      return dir * a.kind.localeCompare(b.kind)
    case 'status':
      return dir * (STATUS_ORDER[a.data.status] - STATUS_ORDER[b.data.status])
    case 'assignee': {
      const an = getAssigneeName(a.data.assignee_id)
      const bn = getAssigneeName(b.data.assignee_id)
      if (!an && !bn) return 0
      if (!an) return 1
      if (!bn) return -1
      return dir * an.localeCompare(bn)
    }
    case 'due_date': {
      const ad = a.data.due_date
      const bd = b.data.due_date
      if (!ad && !bd) return 0
      if (!ad) return 1
      if (!bd) return -1
      return dir * (ad < bd ? -1 : ad > bd ? 1 : 0)
    }
  }
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string
  sortKey: SortKey
  sort: SortState
  onSort: (key: SortKey) => void
  className: string
}) {
  const active = sort.key === sortKey
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`${className} shrink-0 flex items-center gap-1 text-left`}
      style={{ color: active ? 'var(--color-eol-text-secondary)' : 'inherit' }}
    >
      {label}
      <span style={{ opacity: active ? 1 : 0.35 }}>{active && sort.dir === 'desc' ? '▼' : '▲'}</span>
    </button>
  )
}

export default function ExperimentsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const location = useLocation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: vision } = useTeamVision(teamId)
  const { data: members } = useTeamMembers(teamId)
  const { data: experiments, isLoading: experimentsLoading } = useExperiments(teamId)
  const { data: actions, isLoading: actionsLoading } = useActions(teamId)

  const pillars = (vision?.layout.nodes ?? []).filter((n) => n.kind === 'pillar')
  const memberName = (id: string | null) => members?.find((m) => m.user_id === id)?.users?.name ?? null
  const memberAvatarUrl = (id: string | null) => members?.find((m) => m.user_id === id)?.users?.avatar_url

  const [sort, setSort] = useState<SortState>({ key: 'due_date', dir: 'asc' })
  const toggleSort = (key: SortKey) => setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const rows: TaskRow[] = [
    ...(experiments ?? []).map((data): TaskRow => ({ kind: 'experiment', data })),
    ...(actions ?? []).map((data): TaskRow => ({ kind: 'action', data })),
  ].sort((a, b) => compareRows(a, b, sort, memberName))

  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const prefillTitle = (location.state as { prefillTitle?: string } | null)?.prefillTitle
  const [newFormKind, setNewFormKind] = useState<'action' | 'experiment' | null>(prefillTitle ? 'experiment' : null)
  const [justCompletedIds, setJustCompletedIds] = useState<Set<string>>(new Set())

  // Experiment create/edit form state
  const [expTitle, setExpTitle] = useState(prefillTitle ?? '')
  const [expHypothesis, setExpHypothesis] = useState('')
  const [expPillarNodeId, setExpPillarNodeId] = useState('')
  const [expAssigneeId, setExpAssigneeId] = useState('')
  const [expDueDate, setExpDueDate] = useState('')

  // Action create form state
  const [actTitle, setActTitle] = useState('')
  const [actAssigneeId, setActAssigneeId] = useState('')
  const [actDueDate, setActDueDate] = useState('')

  const [editing, setEditing] = useState<{ kind: 'action' | 'experiment'; id: string } | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', hypothesis: '', pillarNodeId: '', assigneeId: '', dueDate: '' })

  const startEdit = (row: TaskRow) => {
    setEditing({ kind: row.kind, id: row.data.id })
    setEditDraft({
      title: row.data.title,
      hypothesis: row.kind === 'experiment' ? row.data.hypothesis ?? '' : '',
      pillarNodeId: row.kind === 'experiment' ? row.data.pillar_node_id ?? '' : '',
      assigneeId: row.data.assignee_id ?? '',
      dueDate: row.data.due_date ?? '',
    })
  }

  const createExperiment = useMutation({
    mutationFn: async () => {
      if (!supabase || !teamId || !user) throw new Error('Not ready')
      const { error } = await supabase.from('experiments').insert({
        team_id: teamId,
        vision_id: vision?.id ?? null,
        pillar_node_id: expPillarNodeId || null,
        title: expTitle,
        hypothesis: expHypothesis || null,
        assignee_id: expAssigneeId || null,
        due_date: expDueDate || null,
        created_by: user.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setExpTitle('')
      setExpHypothesis('')
      setExpPillarNodeId('')
      setExpAssigneeId('')
      setExpDueDate('')
      setNewFormKind(null)
      queryClient.invalidateQueries({ queryKey: ['experiments', teamId] })
    },
  })

  const createAction = useMutation({
    mutationFn: async () => {
      if (!supabase || !teamId || !user) throw new Error('Not ready')
      const { error } = await supabase.from('actions').insert({
        team_id: teamId,
        vision_id: vision?.id ?? null,
        title: actTitle,
        assignee_id: actAssigneeId || null,
        due_date: actDueDate || null,
        created_by: user.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setActTitle('')
      setActAssigneeId('')
      setActDueDate('')
      setNewFormKind(null)
      queryClient.invalidateQueries({ queryKey: ['actions', teamId] })
    },
  })

  const updateExperimentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Experiment['status'] }) => {
      if (!supabase) throw new Error('Not ready')
      const { error } = await supabase.from('experiments').update({ status }).eq('id', id)
      if (error) throw error
      return { id, status }
    },
    onSuccess: ({ id, status }) => {
      if (status === 'done') setJustCompletedIds((prev) => new Set(prev).add(id))
      queryClient.invalidateQueries({ queryKey: ['experiments', teamId] })
    },
  })

  const updateActionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Action['status'] }) => {
      if (!supabase) throw new Error('Not ready')
      const { error } = await supabase.from('actions').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actions', teamId] }),
  })

  const updateExperiment = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Not ready')
      const { error } = await supabase
        .from('experiments')
        .update({
          title: editDraft.title,
          hypothesis: editDraft.hypothesis || null,
          pillar_node_id: editDraft.pillarNodeId || null,
          assignee_id: editDraft.assigneeId || null,
          due_date: editDraft.dueDate || null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      setEditing(null)
      queryClient.invalidateQueries({ queryKey: ['experiments', teamId] })
    },
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
      setEditing(null)
      queryClient.invalidateQueries({ queryKey: ['actions', teamId] })
    },
  })

  const pillarLabel = (id: string | null) => pillars.find((p) => p.id === id)?.text ?? null

  const assigneeSelect = (value: string, onChange: (v: string) => void) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
  )

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="m-0 text-[24px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Bring the vision to life
        </h1>
        <p className="m-0 mt-1 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          Track what's moving the vision forward — quick actions, and experiments that trace back to a pillar.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setNewFormKind(newFormKind === 'action' ? null : 'action')}>
          + New action
        </Button>
        <Button variant="secondary" onClick={() => setNewFormKind(newFormKind === 'experiment' ? null : 'experiment')}>
          + New experiment
        </Button>
      </div>

      {newFormKind === 'action' && (
        <Card>
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
            <Input label="Title" required value={actTitle} onChange={(e) => setActTitle(e.target.value)} placeholder="e.g. Send the agenda around" />
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                Assignee
              </span>
              {assigneeSelect(actAssigneeId, setActAssigneeId)}
            </label>
            <Input label="Due date" type="date" value={actDueDate} onChange={(e) => setActDueDate(e.target.value)} />
            <Button type="submit" loading={createAction.isPending} className="w-full">
              Add action
            </Button>
          </form>
        </Card>
      )}

      {newFormKind === 'experiment' && (
        <Card>
          <div className="mb-3.5 text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            New experiment
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createExperiment.mutate()
            }}
            className="flex flex-col gap-3.5"
          >
            <Input label="Title" required value={expTitle} onChange={(e) => setExpTitle(e.target.value)} placeholder="e.g. Ship the draft by Friday" />
            <Textarea
              label="What are we trying to learn?"
              value={expHypothesis}
              onChange={(e) => setExpHypothesis(e.target.value)}
              placeholder="e.g. Does async review speed up cycle time without losing quality?"
            />
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                We're testing
              </span>
              <select
                value={expPillarNodeId}
                onChange={(e) => setExpPillarNodeId(e.target.value)}
                className="rounded-lg border px-3 py-2.5 text-[13px]"
                style={{ borderColor: 'var(--color-eol-border-strong)', background: 'var(--color-eol-surface-light)' }}
              >
                <option value="">No linked pillar</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.text}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                Assignee
              </span>
              {assigneeSelect(expAssigneeId, setExpAssigneeId)}
            </label>
            <Input label="Due date" type="date" value={expDueDate} onChange={(e) => setExpDueDate(e.target.value)} />
            <Button type="submit" loading={createExperiment.isPending} className="w-full">
              Add to this cycle
            </Button>
          </form>
        </Card>
      )}

      {experimentsLoading || actionsLoading ? null : rows.length === 0 ? (
        <Card>
          <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            No actions or experiments yet.
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--color-eol-border)' }}>
          <div
            className="flex items-center gap-3 px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide"
            style={{ background: 'var(--color-eol-surface)', color: 'var(--color-eol-text-faint)' }}
          >
            <div className="flex-1 min-w-0">Title</div>
            <SortHeader label="Type" sortKey="type" sort={sort} onSort={toggleSort} className="w-[92px]" />
            <SortHeader label="Who" sortKey="assignee" sort={sort} onSort={toggleSort} className="w-[36px]" />
            <SortHeader label="Status" sortKey="status" sort={sort} onSort={toggleSort} className="w-[128px]" />
            <SortHeader label="Due" sortKey="due_date" sort={sort} onSort={toggleSort} className="w-[92px]" />
            <div className="w-[36px] shrink-0" />
          </div>

          {rows.map((row) => {
            const isEditing = editing?.kind === row.kind && editing.id === row.data.id
            if (isEditing) {
              return (
                <div key={`${row.kind}-${row.data.id}`} className="border-t px-4 py-3.5" style={{ borderColor: 'var(--color-eol-border)' }}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (row.kind === 'experiment') updateExperiment.mutate(row.data.id)
                      else updateAction.mutate(row.data.id)
                    }}
                    className="flex flex-col gap-3.5"
                  >
                    <Input label="Title" required value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} />
                    {row.kind === 'experiment' && (
                      <>
                        <Textarea
                          label="What are we trying to learn?"
                          value={editDraft.hypothesis}
                          onChange={(e) => setEditDraft({ ...editDraft, hypothesis: e.target.value })}
                        />
                        <label className="flex flex-col gap-1.5 text-left">
                          <span className="text-[11px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                            We're testing
                          </span>
                          <select
                            value={editDraft.pillarNodeId}
                            onChange={(e) => setEditDraft({ ...editDraft, pillarNodeId: e.target.value })}
                            className="rounded-lg border px-3 py-2.5 text-[13px]"
                            style={{ borderColor: 'var(--color-eol-border-strong)', background: 'var(--color-eol-surface-light)' }}
                          >
                            <option value="">No linked pillar</option>
                            {pillars.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.text}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                    <label className="flex flex-col gap-1.5 text-left">
                      <span className="text-[11px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                        Assignee
                      </span>
                      {assigneeSelect(editDraft.assigneeId, (v) => setEditDraft({ ...editDraft, assigneeId: v }))}
                    </label>
                    <Input label="Due date" type="date" value={editDraft.dueDate} onChange={(e) => setEditDraft({ ...editDraft, dueDate: e.target.value })} />
                    <div className="flex gap-2">
                      <Button type="submit" loading={row.kind === 'experiment' ? updateExperiment.isPending : updateAction.isPending} className="flex-1">
                        Save
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setEditing(null)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )
            }

            const rowKey = `${row.kind}-${row.data.id}`
            const expanded = expandedKey === rowKey

            return (
              <div key={rowKey} className="border-t" style={{ borderColor: 'var(--color-eol-border)' }}>
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3"
                  onClick={() => setExpandedKey(expanded ? null : rowKey)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium" style={{ color: 'var(--color-eol-text)' }}>
                      {row.data.title}
                    </div>
                    {row.kind === 'experiment' && (pillarLabel(row.data.pillar_node_id) || row.data.hypothesis) && (
                      <div className="mt-0.5 truncate text-[11.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                        {pillarLabel(row.data.pillar_node_id) && <>We're testing: {pillarLabel(row.data.pillar_node_id)}. </>}
                        {row.data.hypothesis}
                      </div>
                    )}
                  </div>
                  <div className="w-[92px] shrink-0">
                    <TaskTypeBadge type={row.kind} />
                  </div>
                  <div className="w-[36px] shrink-0">
                    {row.data.assignee_id && <Avatar name={memberName(row.data.assignee_id) ?? '?'} avatarUrl={memberAvatarUrl(row.data.assignee_id)} size={22} />}
                  </div>
                  <div className="w-[128px] shrink-0" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={row.data.status}
                      onChange={(e) => {
                        const status = e.target.value as Action['status']
                        if (row.kind === 'experiment') updateExperimentStatus.mutate({ id: row.data.id, status })
                        else updateActionStatus.mutate({ id: row.data.id, status })
                      }}
                      className="w-full rounded-full border-none px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: 'var(--color-tier2-bg)', color: 'var(--color-tier2-fg)' }}
                    >
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-[92px] shrink-0 text-[11.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
                    {row.data.due_date ?? '—'}
                  </div>
                  <div className="w-[36px] shrink-0 text-right" onClick={(e) => e.stopPropagation()}>
                    {row.data.status !== 'done' && (
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="text-[11.5px] font-medium"
                        style={{ color: 'var(--color-eol-accent-label)' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t px-4 py-3" style={{ borderColor: 'var(--color-eol-border)', background: 'var(--color-eol-surface)' }}>
                    <div className="flex flex-col gap-1.5 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                      {row.kind === 'experiment' ? (
                        <>
                          <div>
                            <span style={{ color: 'var(--color-eol-text-muted)' }}>We're testing: </span>
                            {pillarLabel(row.data.pillar_node_id) ?? 'No linked pillar'}
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-eol-text-muted)' }}>What we're trying to learn: </span>
                            {row.data.hypothesis || 'Not set'}
                          </div>
                        </>
                      ) : (
                        <div style={{ color: 'var(--color-eol-text-faint)' }}>Actions don't carry extra detail beyond what's shown above.</div>
                      )}
                      <div>
                        <span style={{ color: 'var(--color-eol-text-muted)' }}>Assignee: </span>
                        {memberName(row.data.assignee_id) ?? 'Unassigned'}
                      </div>
                    </div>
                  </div>
                )}

                {row.kind === 'experiment' && row.data.status === 'done' && (
                  <div className="border-t px-4 py-3" style={{ borderColor: 'var(--color-eol-border)' }}>
                    <LearningPrompt
                      experimentId={row.data.id}
                      learning={row.data.learning}
                      autoOpen={justCompletedIds.has(row.data.id)}
                      onSaved={() => queryClient.invalidateQueries({ queryKey: ['experiments', teamId] })}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
