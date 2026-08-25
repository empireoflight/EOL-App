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
import { ActionsPanel } from '../../components/actions/ActionsPanel'
import { STATUS_LABEL } from '../../lib/taskStatus'
import type { Experiment } from '../../lib/types'

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

export default function ExperimentsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const location = useLocation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: vision } = useTeamVision(teamId)
  const { data: members } = useTeamMembers(teamId)
  const { data: experiments, isLoading } = useExperiments(teamId)

  const pillars = (vision?.layout.nodes ?? []).filter((n) => n.kind === 'pillar')

  const prefillTitle = (location.state as { prefillTitle?: string } | null)?.prefillTitle
  const [showForm, setShowForm] = useState(!!prefillTitle)
  const [title, setTitle] = useState(prefillTitle ?? '')
  const [hypothesis, setHypothesis] = useState('')
  const [pillarNodeId, setPillarNodeId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [justCompletedIds, setJustCompletedIds] = useState<Set<string>>(new Set())

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', hypothesis: '', pillarNodeId: '', assigneeId: '', dueDate: '' })

  const startEdit = (exp: Experiment) => {
    setEditingId(exp.id)
    setEditDraft({
      title: exp.title,
      hypothesis: exp.hypothesis ?? '',
      pillarNodeId: exp.pillar_node_id ?? '',
      assigneeId: exp.assignee_id ?? '',
      dueDate: exp.due_date ?? '',
    })
  }

  const createExperiment = useMutation({
    mutationFn: async () => {
      if (!supabase || !teamId || !user) throw new Error('Not ready')
      const { error } = await supabase.from('experiments').insert({
        team_id: teamId,
        vision_id: vision?.id ?? null,
        pillar_node_id: pillarNodeId || null,
        title,
        hypothesis: hypothesis || null,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        created_by: user.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setTitle('')
      setHypothesis('')
      setPillarNodeId('')
      setAssigneeId('')
      setDueDate('')
      queryClient.invalidateQueries({ queryKey: ['experiments', teamId] })
    },
  })

  const updateStatus = useMutation({
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
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['experiments', teamId] })
    },
  })

  const pillarLabel = (id: string | null) => pillars.find((p) => p.id === id)?.text ?? null
  const memberName = (id: string | null) => members?.find((m) => m.user_id === id)?.users?.name

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

      <div>
        <h2 className="m-0 mb-3 text-[16px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Actions
        </h2>
        <ActionsPanel teamId={teamId} />
      </div>

      <div>
        <h2 className="m-0 mb-3 text-[16px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Experiments
        </h2>
        <div className="flex flex-wrap gap-6">
        <div className="min-w-[320px] flex-1">
          {isLoading || !experiments || experiments.length === 0 ? (
            <Card>
              <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                No experiments yet.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {experiments.map((exp) =>
                editingId === exp.id ? (
                  <Card key={exp.id}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        updateExperiment.mutate(exp.id)
                      }}
                      className="flex flex-col gap-3.5"
                    >
                      <Input
                        label="Title"
                        required
                        value={editDraft.title}
                        onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                      />
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
                      <Input
                        label="Due date"
                        type="date"
                        value={editDraft.dueDate}
                        onChange={(e) => setEditDraft({ ...editDraft, dueDate: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <Button type="submit" loading={updateExperiment.isPending} className="flex-1">
                          Save
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setEditingId(null)} className="flex-1">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Card>
                ) : (
                  <Card key={exp.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[14.5px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                        {exp.title}
                      </div>
                      {exp.status !== 'done' && (
                        <button
                          type="button"
                          onClick={() => startEdit(exp)}
                          className="shrink-0 text-[11.5px] font-medium"
                          style={{ color: 'var(--color-eol-accent-label)' }}
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {pillarLabel(exp.pillar_node_id) && (
                      <div className="mt-2 text-[12.5px]" style={{ color: 'var(--color-tier2-fg)' }}>
                        We're testing: <span className="font-medium">{pillarLabel(exp.pillar_node_id)}</span>
                      </div>
                    )}
                    {exp.hypothesis && (
                      <div className="mt-1 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                        What we're trying to learn: {exp.hypothesis}
                      </div>
                    )}

                    {exp.status === 'done' && (
                      <div className="mt-2">
                        <LearningPrompt
                          experimentId={exp.id}
                          learning={exp.learning}
                          autoOpen={justCompletedIds.has(exp.id)}
                          onSaved={() => queryClient.invalidateQueries({ queryKey: ['experiments', teamId] })}
                        />
                      </div>
                    )}

                    <div
                      className="mt-3 flex items-center gap-3 border-t pt-2.5 text-[11.5px]"
                      style={{ borderColor: 'var(--color-eol-border)', color: 'var(--color-eol-text-muted)' }}
                    >
                      {exp.assignee_id && (
                        <span className="flex items-center gap-1.5">
                          <Avatar name={memberName(exp.assignee_id) ?? '?'} size={20} />
                        </span>
                      )}
                      <select
                        value={exp.status}
                        onChange={(e) => updateStatus.mutate({ id: exp.id, status: e.target.value as Experiment['status'] })}
                        className="shrink-0 rounded-full border-none px-2.5 py-1 text-[11px] font-semibold"
                        style={{ background: 'var(--color-tier2-bg)', color: 'var(--color-tier2-fg)' }}
                      >
                        {Object.entries(STATUS_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {exp.due_date && <span className="ml-auto">{exp.due_date}</span>}
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
              + New experiment
            </Button>
          ) : (
            <>
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
                <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ship the draft by Friday" />
                <Textarea
                  label="What are we trying to learn?"
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  placeholder="e.g. Does async review speed up cycle time without losing quality?"
                />
                <label className="flex flex-col gap-1.5 text-left">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                    We're testing
                  </span>
                  <select
                    value={pillarNodeId}
                    onChange={(e) => setPillarNodeId(e.target.value)}
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
                <Button type="submit" loading={createExperiment.isPending} className="w-full">
                  Add to this cycle
                </Button>
              </form>
            </>
          )}
        </Card>
        </div>
      </div>
    </div>
  )
}
