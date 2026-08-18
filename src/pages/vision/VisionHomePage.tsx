import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  useTeamVision,
  useSaveVisionLayout,
  useVisionAnswers,
  useVisionCommitments,
  useSendVisionForApproval,
  useReviseVision,
} from '../../hooks/useVision'
import { useConvergenceSession, useOpenVisionSession } from '../../hooks/useConvergenceSession'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { useAuth } from '../../hooks/useAuth'
import { getVisionQuestions } from '../../lib/visionQuestions'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { Input } from '../../components/shared/Input'
import { TierBadge } from '../../components/shared/TierBadge'
import { LoadingScreen } from '../../components/shared/LoadingScreen'
import { Avatar } from '../../components/shared/Avatar'
import { OpenVisionSessionBanner } from '../../components/session/OpenVisionSessionBanner'
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
  const horizon = (sessionData?.session.framing as { horizon?: string } | undefined)?.horizon
  const questions = getVisionQuestions(horizon)
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

// Draft: facilitator/creator can send it for approval. Pending: everyone
// (including the sender) sees who's committed and can add their own
// commitment. Committed: read-only, with a way back to draft.
function CommitmentPanel({ teamId, vision, canManage }: { teamId: string | undefined; vision: Vision; canManage: boolean }) {
  const { user } = useAuth()
  const { data: commitments } = useVisionCommitments(vision.status === 'draft' ? undefined : vision.id)
  const sendForApproval = useSendVisionForApproval(vision.id, teamId)
  const revise = useReviseVision(vision.id, teamId)

  if (vision.status === 'draft') {
    if (!canManage) return null
    return (
      <Card>
        <div className="flex items-center justify-between gap-4">
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
        {sendForApproval.isError && (
          <p className="m-0 mt-3 text-[12.5px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
            {sendForApproval.error instanceof Error ? sendForApproval.error.message : "Couldn't send for approval."}
          </p>
        )}
      </Card>
    )
  }

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
  const { data: members } = useTeamMembers(teamId)
  const saveLayout = useSaveVisionLayout(vision?.id, teamId)

  if (isLoading || openSessionLoading) return <LoadingScreen />

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
        <OpenVisionSessionBanner teamId={teamId} />
        {!openSession && (
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
        )}
      </div>
    )
  }

  const northStar = vision.layout.nodes.find((n) => n.kind === 'north_star')
  const editable = vision.status === 'draft'
  const myMembership = user ? (members ?? []).find((m) => m.user_id === user.id) : undefined
  const canManage = myMembership?.team_role === 'facilitator' || vision.created_by === user?.id
  const updateNodes = (nodes: VisionNode[]) => saveLayout.mutate({ nodes, edges: vision.layout.edges })

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      {/* CommitmentPanel already covers "there's a vision in flight" once it's
          awaiting commitment — showing both is redundant, two banners saying
          the same thing two different ways. */}
      {vision.status !== 'pending_commitment' && <OpenVisionSessionBanner teamId={teamId} />}
      <CommitmentPanel teamId={teamId} vision={vision} canManage={canManage} />

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-accent-label)' }}>
          What are we creating?
        </div>
        <div
          className="rounded-2xl border p-6"
          style={{ background: 'linear-gradient(135deg, #fff6ad, #ffd1d9 55%, #ffa9f8)', borderColor: 'var(--color-eol-border)' }}
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
