import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  useTeamVision,
  useSaveVisionLayout,
  useVisionAnswers,
  useVisionCommitments,
  useSendVisionForApproval,
  useReviseVision,
} from '../../hooks/useVision'
import { useConvergenceSession, useOpenVisionSession, useSynthesisJobPolling, useLatestGuideCompletion } from '../../hooks/useConvergenceSession'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { useAuth } from '../../hooks/useAuth'
import { resolveVisionQuestions, type VisionQuestion } from '../../lib/visionQuestions'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { Input } from '../../components/shared/Input'
import { TierBadge } from '../../components/shared/TierBadge'
import { LoadingScreen } from '../../components/shared/LoadingScreen'
import { Avatar } from '../../components/shared/Avatar'
import { ReadinessBanner } from '../../components/session/ReadinessBanner'
import type { Vision, VisionNode } from '../../lib/types'

// Click-to-edit span/textarea, saves on blur. `draft` only ever gets
// (re)seeded from `value` at the moment editing starts (an event handler),
// not via an effect — so there's no local/server sync to fight with.
function EditableText({
  value,
  onSave,
  editable,
  placeholder,
  textClassName,
  textStyle,
}: {
  value: string
  onSave: (text: string) => void
  editable: boolean
  placeholder?: string
  textClassName?: string
  textStyle?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (editable && editing) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (draft.trim() && draft !== value) onSave(draft.trim())
        }}
        rows={3}
        className="w-full resize-none rounded-lg border px-2 py-1.5 text-[13.5px]"
        style={{ borderColor: 'var(--color-eol-border-strong)', background: 'var(--color-eol-surface-light)' }}
      />
    )
  }

  return (
    <div
      onClick={() => {
        if (!editable) return
        setDraft(value)
        setEditing(true)
      }}
      className={textClassName}
      style={{ ...textStyle, cursor: editable ? 'text' : 'default' }}
    >
      {value || placeholder}
    </div>
  )
}

function EditableNodeList({
  nodes,
  kind,
  editable,
  onChange,
  addLabel,
  chip,
}: {
  nodes: VisionNode[]
  kind: VisionNode['kind']
  editable: boolean
  onChange: (nodes: VisionNode[]) => void
  addLabel: string
  chip?: boolean
}) {
  const [newText, setNewText] = useState('')
  const items = nodes.filter((n) => n.kind === kind)

  const updateText = (id: string, text: string) => onChange(nodes.map((n) => (n.id === id ? { ...n, text } : n)))
  const remove = (id: string) => onChange(nodes.filter((n) => n.id !== id))
  const add = () => {
    if (!newText.trim()) return
    onChange([...nodes, { id: crypto.randomUUID(), kind, text: newText.trim(), x: 0, y: 0 }])
    setNewText('')
  }

  if (chip) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {items.map((p) => (
          <span
            key={p.id}
            className="flex items-center gap-1.5 rounded-full py-1 pl-3 pr-2 text-[12px] font-medium"
            style={{ background: 'var(--color-tier2-bg)', color: 'var(--color-tier2-fg)' }}
          >
            <EditableText value={p.text} editable={editable} onSave={(t) => updateText(p.id, t)} />
            {editable && (
              <button type="button" onClick={() => remove(p.id)} aria-label="Remove" className="text-[13px] leading-none opacity-60 hover:opacity-100">
                &times;
              </button>
            )}
          </span>
        ))}
        {editable && (
          <span className="flex items-center gap-1">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder={addLabel}
              className="w-28 rounded-full border px-2.5 py-1 text-[12px]"
              style={{ borderColor: 'var(--color-eol-border-strong)', background: 'var(--color-eol-surface-light)' }}
            />
            <Button variant="secondary" onClick={add}>
              +
            </Button>
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && !editable && (
        <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          Not generated yet.
        </p>
      )}
      {items.map((n) => (
        <div key={n.id} className="flex items-start gap-2">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--color-eol-text-faint)' }} />
          <EditableText
            value={n.text}
            editable={editable}
            onSave={(t) => updateText(n.id, t)}
            textClassName="flex-1 text-[13.5px] leading-relaxed"
            textStyle={{ color: 'var(--color-eol-text-secondary)' }}
          />
          {editable && (
            <button type="button" onClick={() => remove(n.id)} aria-label="Remove" className="shrink-0 text-[13px] opacity-50 hover:opacity-100">
              &times;
            </button>
          )}
        </div>
      ))}
      {editable && (
        <div className="mt-1 flex items-center gap-2">
          <Input value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={addLabel} />
          <Button variant="secondary" onClick={add}>
            Add
          </Button>
        </div>
      )}
    </div>
  )
}

function RawAnswers({ sessionId }: { sessionId: string | null }) {
  const { data: answers, isLoading } = useVisionAnswers(sessionId ?? undefined)
  const { data: sessionData } = useConvergenceSession(sessionId ?? undefined)
  const questions = resolveVisionQuestions(sessionData?.session.framing as { horizon?: string; questions?: VisionQuestion[] } | undefined)
  if (!sessionId) return null
  if (isLoading) return null
  if (!answers || answers.length === 0) return null

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="m-0 text-[16px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Raw answers
        </h2>
        <TierBadge tier={4} />
      </div>
      <div className="flex flex-col gap-4">
        {answers.map((a) => (
          <Card key={a.userId}>
            <div className="mb-3 flex items-center gap-2.5">
              <Avatar name={a.userName} size={24} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                {a.userName}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {questions.filter((q) => a.content[q.id]?.trim()).map((q) => (
                <div key={q.id}>
                  <div className="text-[11.5px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                    {q.prompt}
                  </div>
                  <div className="mt-0.5 text-[13px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
                    {a.content[q.id]}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Shared data/mutation for the readiness-and-generate flow — used by both
// the pre-guide in-progress view and the post-guide "still draft" panel
// (facilitator inviting more people after generating is a real case —
// accept_team_invite adds them to the still-open session, so both spots
// need this, not two copies that can drift apart).
function useVisionSessionProgress(sessionId: string, teamId: string | undefined) {
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useConvergenceSession(sessionId)
  const jobQuery = useSynthesisJobPolling(sessionId, data?.session.status, teamId)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  const handleGenerate = async () => {
    if (!supabase) return
    setStarting(true)
    setError('')
    try {
      const { data: job, error: jobError } = await supabase
        .from('synthesis_jobs')
        .insert({ session_id: sessionId })
        .select()
        .single()
      if (jobError) throw jobError

      await supabase.from('convergence_sessions').update({ status: 'synthesizing' }).eq('id', sessionId)

      const { data: authData } = await supabase.auth.getSession()
      const { error: invokeError } = await supabase.functions.invoke('process-synthesis-job', {
        body: { jobId: job.id },
        headers: { Authorization: `Bearer ${authData.session?.access_token}` },
      })
      if (invokeError) {
        // The edge function never got to run — its own failure path (which
        // falls back to 'ready') never fires either, so without this the
        // session gets stuck at 'synthesizing' forever with no retry path.
        await supabase.from('convergence_sessions').update({ status: 'ready' }).eq('id', sessionId)
        throw invokeError
      }

      // VisionHomePage's canvas gate (blockedFromCanvas) also reads
      // useOpenVisionSession, useTeamVision, and useLatestGuideCompletion —
      // three separate query-cache entries this function never touches.
      // Refetching only convergence-session left those stale, so the page
      // would briefly compute an inconsistent combination of fresh/stale
      // signals (canvas flashing in, then blockedFromCanvas re-locking once
      // one of the others caught up on its own schedule). Invalidate the
      // whole cluster together so they land in the same render.
      await refetch()
      if (teamId) queryClient.invalidateQueries({ queryKey: ['vision', teamId] })
      queryClient.invalidateQueries({ queryKey: ['open-vision-session', teamId] })
      queryClient.invalidateQueries({ queryKey: ['latest-guide-completion', sessionId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start synthesis.")
    } finally {
      setStarting(false)
    }
  }

  return {
    data,
    isLoading,
    error,
    handleGenerate,
    generating: starting || data?.session.status === 'synthesizing' || jobQuery.data?.status === 'running',
  }
}

// Pre-guide in-progress view — no canvas exists yet, so this is the whole
// page. `canManage` (team facilitator, or the vision's original creator once
// one exists) drives the generate button, replacing the old per-session
// "session.initiator_id === me" check so this and the canvas-visibility
// gate below use one consistent notion of "who's managing this."
function VisionSessionProgress({ teamId, sessionId, canManage }: { teamId: string | undefined; sessionId: string; canManage: boolean }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading, error, handleGenerate, generating } = useVisionSessionProgress(sessionId, teamId)

  if (isLoading || !data) return <LoadingScreen />

  const { session, participants, submittedCount, totalParticipants, gateMet, participantNames } = data
  const myParticipant = participants.find((p) => p.user_id === user?.id)

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
          {error}
        </div>
      )}

      {myParticipant && !myParticipant.submitted_at && (
        <Card>
          <p className="m-0 mb-3 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            You haven't submitted your reflection yet.
          </p>
          <Button onClick={() => navigate(`/teams/${teamId}/vision/sessions/${sessionId}/reflect`)} className="w-full">
            Submit your reflection
          </Button>
        </Card>
      )}

      <ReadinessBanner
        submittedCount={submittedCount}
        totalParticipants={totalParticipants}
        gateMet={gateMet}
        isFacilitator={canManage}
        onGenerate={handleGenerate}
        generating={generating}
        regenerate={session.status === 'guide_ready'}
        allowBeforeGateMet
      />
      {Object.keys(participantNames).length > 0 && (
        <Card>
          <div className="flex flex-wrap gap-3">
            {Object.entries(participantNames).map(([id, name]) => (
              <div key={id} className="flex items-center gap-2">
                <Avatar name={name} size={26} />
                <span className="text-[12px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// Post-guide, still-draft status: readiness/regenerate + participants +
// "ready to commit?", collapsed into one card the facilitator can hide
// during a live workshop to just look at the canvas. Only ever rendered
// when vision.status === 'draft', so unlike VisionSessionProgress this also
// owns the "send for approval" action (CommitmentPanel below only handles
// pending_commitment/committed now).
function VisionStatusPanel({
  teamId,
  sessionId,
  vision,
  canManage,
}: {
  teamId: string | undefined
  sessionId: string
  vision: Vision
  canManage: boolean
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const { data, isLoading, error, handleGenerate, generating } = useVisionSessionProgress(sessionId, teamId)
  const sendForApproval = useSendVisionForApproval(vision.id, teamId)

  if (isLoading || !data) return <LoadingScreen />

  const { session, participants, submittedCount, totalParticipants, gateMet, participantNames } = data
  const myParticipant = participants.find((p) => p.user_id === user?.id)
  const regenerate = session.status === 'guide_ready'

  return (
    <Card>
      <button type="button" onClick={() => setCollapsed((c) => !c)} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
          Vision status &middot; {submittedCount} of {totalParticipants} submitted
        </div>
        <span className="shrink-0 text-[11px] font-semibold" style={{ color: 'var(--color-eol-accent-label)' }}>
          {collapsed ? 'Show' : 'Hide'}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-4 flex flex-col gap-4 border-t pt-4" style={{ borderColor: 'var(--color-eol-border)' }}>
          {error && (
            <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
              {error}
            </div>
          )}

          {myParticipant && !myParticipant.submitted_at && (
            <div>
              <p className="m-0 mb-3 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                You haven't submitted your reflection yet.
              </p>
              <Button onClick={() => navigate(`/teams/${teamId}/vision/sessions/${sessionId}/reflect`)} className="w-full">
                Submit your reflection
              </Button>
            </div>
          )}

          {canManage && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="self-start rounded-lg px-4 py-2 text-[13px] font-semibold disabled:opacity-60"
              style={{ background: 'var(--color-eol-accent)', color: 'var(--color-eol-ink)' }}
            >
              {generating
                ? regenerate
                  ? 'Regenerating…'
                  : 'Generating…'
                : regenerate
                  ? 'Regenerate discussion guide'
                  : !gateMet
                    ? 'Generate now anyway'
                    : 'Generate discussion guide'}
            </button>
          )}
          {gateMet && !canManage && (
            <div className="text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
              Waiting on the facilitator to generate the guide
            </div>
          )}

          {Object.keys(participantNames).length > 0 && (
            <div className="flex flex-wrap gap-3">
              {Object.entries(participantNames).map(([id, name]) => (
                <div key={id} className="flex items-center gap-2">
                  <Avatar name={name} size={26} />
                  <span className="text-[12px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {canManage && (
            <div className="flex items-center justify-between gap-4 border-t pt-4" style={{ borderColor: 'var(--color-eol-border)' }}>
              <div>
                <div className="text-[14px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                  Ready for the team to commit?
                </div>
                <div className="text-[12.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
                  This sends the vision above to everyone for approval and locks editing until it's resolved.
                </div>
              </div>
              <Button onClick={() => sendForApproval.mutate()} loading={sendForApproval.isPending}>
                Send to everyone for approval
              </Button>
            </div>
          )}
          {sendForApproval.isError && (
            <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
              {sendForApproval.error instanceof Error ? sendForApproval.error.message : "Couldn't send for approval."}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

// Pending: everyone (including the sender) sees who's committed and can add
// their own commitment. Committed: read-only, with a way back to draft.
// Draft is handled by VisionStatusPanel above instead — this is never
// called with vision.status === 'draft'.
function CommitmentPanel({ teamId, vision, canManage }: { teamId: string | undefined; vision: Vision; canManage: boolean }) {
  const { user } = useAuth()
  const { data: commitments } = useVisionCommitments(vision.id)
  const revise = useReviseVision(vision.id, teamId)

  const committedCount = (commitments ?? []).filter((c) => c.status === 'committed').length
  const myCommitment = user ? (commitments ?? []).find((c) => c.user_id === user.id) : undefined
  const iveCommitted = myCommitment?.status === 'committed'

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[14px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
            {vision.status === 'committed' ? 'This vision is committed' : 'Pending everyone’s commitment'}
          </div>
          <div className="text-[12.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
            {vision.status === 'committed'
              ? `${committedCount} committed — it's the shared reference point for the cycle ahead.`
              : `${committedCount} committed so far.`}
            {vision.status === 'pending_commitment' && !iveCommitted && ' Your commitment is still needed.'}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {vision.status === 'pending_commitment' && (
            <Link to={`/teams/${teamId}/vision/commit`}>
              <Button>{iveCommitted ? 'View status' : 'Review & commit'}</Button>
            </Link>
          )}
          {vision.status === 'committed' && (
            <>
              <Link to={`/teams/${teamId}/vision/commit`}>
                <Button variant="secondary">View commitments</Button>
              </Link>
              {canManage && (
                <Button variant="secondary" onClick={() => revise.mutate()} loading={revise.isPending}>
                  Revise this vision
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function VisionHomePage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const { data: vision, isLoading } = useTeamVision(teamId)
  const { data: openSession, isLoading: openSessionLoading } = useOpenVisionSession(teamId)
  const { data: openSessionData } = useConvergenceSession(openSession?.id)
  const { data: lastGuideCompletedAt } = useLatestGuideCompletion(openSession?.id)
  const { data: members } = useTeamMembers(teamId)
  const saveLayout = useSaveVisionLayout(vision?.id, teamId)

  if (isLoading || openSessionLoading) return <LoadingScreen />

  const myMembership = user ? (members ?? []).find((m) => m.user_id === user.id) : undefined
  const isTeamFacilitator = myMembership?.team_role === 'facilitator'
  const canManage = isTeamFacilitator || (!!vision && vision.created_by === user?.id)

  // Two reasons nobody should see the canvas, facilitator included: (1) no
  // guide exists yet for the currently open session; or (2) one does, but
  // at least one participant's submission happened *after* the last
  // successful generation completed — the existing guide doesn't reflect
  // it. Nobody sees stale content in this case — the moment a guide exists
  // that postdates every current submission, everyone sees it together.
  // Also covers a stale vision left over from an earlier committed cycle
  // (visions.team_id has no uniqueness) — this is the only "in progress"
  // messaging on this page now, the old separate status page is gone.
  //
  // Deliberately NOT also requiring the readiness gate to currently be met:
  // ReadinessBanner's "Generate now anyway" lets a facilitator generate
  // before everyone's submitted, and a hard gate-met requirement here
  // defeated that entirely — the guide would generate successfully but the
  // canvas would stay permanently locked (gate never becomes "met" just
  // because a guide exists), which is exactly the flash-then-revert bug a
  // facilitator hit on staging. A late-joining, not-yet-submitted
  // participant not being reflected in an early guide is the accepted
  // tradeoff of generating early, not a staleness case — guideStale below
  // still catches anyone who actually submitted after generation.
  const guideStale =
    !!lastGuideCompletedAt &&
    (openSessionData?.participants ?? []).some((p) => p.submitted_at && new Date(p.submitted_at) > new Date(lastGuideCompletedAt))
  const blockedFromCanvas = !!openSession && (openSession.status !== 'guide_ready' || guideStale)
  if (blockedFromCanvas) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
        <div>
          <h1 className="m-0 text-[24px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            Vision creation process is in progress
          </h1>
        </div>
        <VisionSessionProgress teamId={teamId} sessionId={openSession.id} canManage={canManage} />
      </div>
    )
  }

  if (!vision) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
        <div>
          <h1 className="m-0 text-[24px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            What are we creating?
          </h1>
          <p className="m-0 mt-1 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            No vision yet — everything else in this cycle takes its shape from here.
          </p>
        </div>
        <Card>
          <div className="flex items-center justify-between gap-4">
            <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              Start a vision session to co-create a shared north star with your team.
            </p>
            <Link to={`/teams/${teamId}/vision/start`}>
              <Button>Start</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const northStar = vision.layout.nodes.find((n) => n.kind === 'north_star')
  const editable = vision.status === 'draft'
  const updateNodes = (nodes: VisionNode[]) => saveLayout.mutate({ nodes, edges: vision.layout.edges })

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      {/* openSession is only ever non-null here once its guide is ready and
          blockedFromCanvas above already excluded the "not everyone's in
          yet" case for non-managers — this is the regenerate path, letting
          a manager who invited more people after generating re-run
          synthesis with their input included. */}
      {openSession && vision.status === 'draft' && (
        <VisionStatusPanel teamId={teamId} sessionId={openSession.id} vision={vision} canManage={canManage} />
      )}
      {vision.status !== 'draft' && <CommitmentPanel teamId={teamId} vision={vision} canManage={canManage} />}

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-accent-label)' }}>
          What are we creating?
        </div>
        <div
          className="rounded-2xl border p-6"
          style={{ background: 'var(--gradient-dawn)', borderColor: 'var(--color-eol-border)' }}
        >
          {northStar ? (
            <EditableText
              value={northStar.text}
              editable={editable}
              onSave={(text) => updateNodes(vision.layout.nodes.map((n) => (n.id === northStar.id ? { ...n, text } : n)))}
              textClassName="text-[22px] leading-snug"
              textStyle={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}
            />
          ) : (
            <div className="text-[22px] leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              No north star yet.
            </div>
          )}
        </div>
        <EditableNodeList nodes={vision.layout.nodes} kind="pillar" editable={editable} onChange={updateNodes} addLabel="Add a pillar" chip />
        <p className="m-0 mt-3 text-[12px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          Synthesized from your team's reflections below.
        </p>
        {!editable && (
          <p className="m-0 mt-1 text-[11.5px] font-medium" style={{ color: 'var(--color-eol-text-faint)' }}>
            {vision.status === 'committed'
              ? "This vision has been committed — it's read-only now."
              : "This vision is pending everyone's commitment — it's read-only until that's resolved."}
          </p>
        )}
      </div>

      <div>
        <h2 className="m-0 mb-3 text-[16px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          What does that mean in practice?
        </h2>
        <EditableNodeList nodes={vision.layout.nodes} kind="practice" editable={editable} onChange={updateNodes} addLabel="Add a practice" />
      </div>

      <div>
        <h2 className="m-0 mb-3 text-[16px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          How will we know we're becoming this?
        </h2>
        <EditableNodeList nodes={vision.layout.nodes} kind="signal" editable={editable} onChange={updateNodes} addLabel="Add a signal" />
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="m-0 text-[16px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            AI synthesis
          </h2>
          <TierBadge tier={4} />
        </div>
        {vision.alignment_guide ? (
          <Card>
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-accent-label)' }}>
                  Where there's alignment
                </div>
                <p className="m-0 text-[12.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
                  {vision.alignment_guide.alignment}
                </p>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-pink-strong)' }}>
                  Where there's disconnect
                </div>
                <p className="m-0 text-[12.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
                  {vision.alignment_guide.disconnect}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            No alignment guide generated yet — individual answers stay private until it's ready.
          </p>
        )}
      </div>

      {vision.alignment_guide && <RawAnswers sessionId={vision.session_id} />}
    </div>
  )
}
