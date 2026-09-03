import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useConvergenceSession, useTeamFrictionSessions } from '../../hooks/useConvergenceSession'
import { PendingFrictionBanners } from '../../components/session/PendingFrictionBanners'
import { Card } from '../../components/shared/Card'
import { LoadingScreen } from '../../components/shared/LoadingScreen'
import { GROUNDING_MOMENTS, filterMoments, type MomentFilter } from '../../lib/groundingMoments'
import type { SessionStatus } from '../../lib/sessionStateMachine'
import type { ConvergenceSession } from '../../lib/types'

const FILTERS: { value: MomentFilter; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: '1min', label: '1 min' },
  { value: '5min', label: '5 min' },
  { value: 'outside', label: 'Outside' },
]

// Display labels only — SessionStatus itself is unchanged. "Discussing"
// covers guide_ready/scheduled (a guide exists, nothing to join since
// there's no meeting scheduling yet — see FrictionSessionStatusPage's own
// "Copy for calendar invite" fallback for that), "Settled" is closed (with
// or without an outcome recorded).
const STATUS_LABEL: Record<SessionStatus, string> = {
  draft: 'Draft',
  collecting: 'Collecting',
  ready: 'Ready',
  synthesizing: 'Generating',
  guide_ready: 'Discussing',
  scheduled: 'Discussing',
  discussed: 'Wrapping up',
  closed: 'Settled',
}

const RAIL_DOT: Record<SessionStatus, string> = {
  draft: 'var(--color-eol-text-faint)',
  collecting: 'var(--color-eol-accent)',
  ready: 'var(--color-eol-accent)',
  synthesizing: 'var(--color-eol-accent)',
  guide_ready: 'var(--color-eol-pink)',
  scheduled: 'var(--color-eol-pink)',
  discussed: 'var(--color-eol-pink)',
  closed: 'var(--color-eol-text-faint)',
}

function FrictionThreadRow({ teamId, session, isLast }: { teamId: string | undefined; session: ConvergenceSession; isLast: boolean }) {
  const { user } = useAuth()
  const { data } = useConvergenceSession(session.id)
  const topic = (session.framing as { topic?: string }).topic
  const outcome = (session.framing as { outcome?: string }).outcome

  // "Add yours" only makes sense for the one person who hasn't actually
  // submitted yet — showing it to everyone regardless of their own
  // submission status (the original bug here) sends someone who already
  // answered to a page with nothing left for them to add.
  const myParticipant = data?.participants.find((p) => p.user_id === user?.id)
  const iStillNeedToSubmit = !data?.session.discussion_guide && session.status !== 'closed' && myParticipant && !myParticipant.submitted_at

  const target = iStillNeedToSubmit ? `/teams/${teamId}/friction/sessions/${session.id}/mitigate` : `/teams/${teamId}/friction/sessions/${session.id}`
  const ctaLabel = iStillNeedToSubmit
    ? 'Add yours'
    : session.status === 'closed'
      ? 'Read outcome'
      : session.status === 'guide_ready' || session.status === 'scheduled' || session.status === 'discussed'
        ? 'Continue'
        : 'View'

  return (
    <Link to={target} className="flex gap-4 py-5" style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-eol-border)' }}>
      <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
        <div className="h-3 w-3 rounded-full" style={{ background: RAIL_DOT[session.status] }} />
        {!isLast && <div className="w-px flex-1" style={{ background: 'var(--color-eol-border)' }} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-text-muted)' }}>
            {STATUS_LABEL[session.status]}
          </span>
          {data && (
            <>
              <span className="h-[3px] w-[3px] rounded-full" style={{ background: 'var(--color-eol-border-strong)' }} />
              <span className="text-[12px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                {data.submittedCount} of {data.totalParticipants} collected
              </span>
            </>
          )}
        </div>
        <div className="text-[15px] font-semibold leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          {topic || 'Untitled'}
        </div>
        {session.status === 'closed' && outcome && (
          <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border px-3.5 py-3" style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border-strong)' }}>
            <div className="shrink-0 pt-0.5 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-accent-label)' }}>
              Outcome
            </div>
            <div className="text-[13px] leading-relaxed" style={{ color: 'var(--color-eol-text)' }}>
              {outcome}
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 self-center text-[13.5px] font-semibold" style={{ color: 'var(--color-eol-accent-label)' }}>
        {ctaLabel} &rarr;
      </div>
    </Link>
  )
}

export default function FrictionHubPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { data: sessions, isLoading } = useTeamFrictionSessions(teamId)
  const [filter, setFilter] = useState<MomentFilter>('any')
  const moments = filterMoments(GROUNDING_MOMENTS, filter)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="m-0 text-[24px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Unlearn
        </h1>
        <p className="m-0 mt-1 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          Unlearning is the art of processing friction and building capacity to try new things.
        </p>
      </div>

      <PendingFrictionBanners teamId={teamId} />

      {/* Friction is the primary content — it's the thing most likely to
          need someone's action — with the grounding moments as a lighter
          sidebar rather than a big grid ahead of it, so the friction log
          isn't buried below nine cards on the way in. */}
      <div className="flex flex-col items-start gap-8 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-end justify-between gap-4 border-b pb-3" style={{ borderColor: 'var(--color-eol-border-strong)' }}>
            <div>
              <div className="text-[18px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
                Process friction
              </div>
              <p className="m-0 mt-0.5 text-[13px] italic" style={{ color: 'var(--color-eol-text-secondary)' }}>
                Friction is an opportunity for better connection
              </p>
            </div>
            <Link
              to={`/teams/${teamId}/friction/start`}
              className="shrink-0 rounded-full px-4 py-2.5 text-[13.5px] font-semibold"
              style={{ background: 'var(--color-eol-accent)', color: 'var(--color-eol-ink)' }}
            >
              Raise something &rarr;
            </Link>
          </div>

          {isLoading ? (
            <LoadingScreen />
          ) : !sessions || sessions.length === 0 ? (
            <Card>
              <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                No friction sessions yet.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col">
              {sessions.map((s, i) => (
                <FrictionThreadRow key={s.id} teamId={teamId} session={s} isLast={i === sessions.length - 1} />
              ))}
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-[280px] lg:shrink-0">
          <div>
            <div className="text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              Take a moment first
            </div>
            <p className="m-0 mt-0.5 text-[12px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              No tracking, no streaks.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                style={
                  filter === f.value
                    ? { background: 'var(--color-eol-ink)', color: 'var(--color-eol-bg)' }
                    : { border: '1px solid var(--color-eol-border-strong)', color: 'var(--color-eol-text-secondary)' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {moments.map((m) => (
              <Link
                key={m.id}
                to={`/teams/${teamId}/friction/tools/${m.id}`}
                className="flex flex-col gap-1 rounded-xl border p-3"
                style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[13.5px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
                    {m.name}
                  </div>
                  <div className="shrink-0 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-accent-label)' }}>
                    {m.meta}
                  </div>
                </div>
                <div className="text-[11.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
                  {m.blurb}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
