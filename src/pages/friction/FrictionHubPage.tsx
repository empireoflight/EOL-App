import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useConvergenceSession, useMyPendingFrictionSessions, useTeamFrictionSessions } from '../../hooks/useConvergenceSession'
import { useMyPersonalGuides } from '../../hooks/usePersonalGuides'
import { PendingFrictionBanners } from '../../components/session/PendingFrictionBanners'
import { PersonalGuideBanners } from '../../components/session/PersonalGuideBanners'
import { Card } from '../../components/shared/Card'
import { PageHeader } from '../../components/shared/PageHeader'
import { LoadingScreen } from '../../components/shared/LoadingScreen'
import { GROUNDING_MOMENTS, filterMoments, type MomentFilter } from '../../lib/groundingMoments'
import type { SessionStatus } from '../../lib/sessionStateMachine'
import type { ConvergenceSession, PersonalFrictionGuide } from '../../lib/types'

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

// Deterministic pastel swatch per moment, same hashing approach
// Avatar.tsx/AppShell.tsx use for per-person/per-team color.
const SWATCH_PALETTE = ['oklch(0.9 0.05 78)', 'oklch(0.9 0.05 350)', 'oklch(0.9 0.045 220)', 'oklch(0.9 0.05 150)', 'oklch(0.9 0.05 300)']
function swatchFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return SWATCH_PALETTE[hash % SWATCH_PALETTE.length]
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

// A saved personal discussion guide, listed in the history alongside shared
// sessions. Same rail and row shape as FrictionThreadRow.
function PersonalGuideRow({ teamId, guide, isLast }: { teamId: string | undefined; guide: PersonalFrictionGuide; isLast: boolean }) {
  return (
    <Link to={`/teams/${teamId}/friction/guides/${guide.id}`} className="flex gap-4 py-5" style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-eol-border)' }}>
      <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
        <div className="h-3 w-3 rounded-full" style={{ background: 'var(--color-eol-pink)' }} />
        {!isLast && <div className="w-px flex-1" style={{ background: 'var(--color-eol-border)' }} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-text-muted)' }}>
            {guide.conversation_had_at ? 'Had this conversation' : 'Prepared a conversation'}
          </span>
          <span className="h-[3px] w-[3px] rounded-full" style={{ background: 'var(--color-eol-border-strong)' }} />
          <span className="text-[12px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            Only you can see this
          </span>
        </div>
        <div className="text-[15px] font-semibold leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          {guide.topic}
        </div>
      </div>
      <div className="shrink-0 self-center text-[13.5px] font-semibold" style={{ color: 'var(--color-eol-accent-label)' }}>
        Open guide &rarr;
      </div>
    </Link>
  )
}

const tileClass = 'flex min-h-[132px] flex-col gap-2 rounded-[16px] border p-4 transition-opacity hover:opacity-80'

export default function FrictionHubPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { data: sessions, isLoading } = useTeamFrictionSessions(teamId)
  const { data: pending } = useMyPendingFrictionSessions(teamId)
  const { data: guides } = useMyPersonalGuides(teamId)
  const [filter, setFilter] = useState<MomentFilter>('any')
  const moments = filterMoments(GROUNDING_MOMENTS, filter)

  // Shared sessions and personal guides in one history, newest first.
  const history = [
    ...(sessions ?? []).map((s) => ({ kind: 'session' as const, at: s.created_at, session: s })),
    ...(guides ?? []).map((g) => ({ kind: 'guide' as const, at: g.created_at, guide: g })),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))

  const needYou = pending?.length ?? 0

  return (
    <>
      <PageHeader eyebrow="Unlearn" title="Unlearn" subline="Unlearning is the art of processing friction and building capacity to try new things." />
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        {(pending?.length || guides?.some((g) => !g.conversation_had_at)) ? (
          <div className="flex flex-col gap-2">
            <PersonalGuideBanners teamId={teamId} />
            <PendingFrictionBanners teamId={teamId} />
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[18px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
                Pick what fits the moment
              </div>
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
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Process friction is one of the activities, first in the list. It
                gets a slightly warmer tile because it keeps a history and
                outcomes (below), and stays put whatever the time filter says. */}
            <Link
              to={`/teams/${teamId}/friction/start`}
              className={tileClass}
              style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border-strong)', boxShadow: '0 0 0 1px rgba(255,169,248,0.35)' }}
            >
              <span className="h-[30px] w-[30px] shrink-0 rounded-[8px]" style={{ background: 'var(--gradient-dawn)' }} />
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-[14px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                  Process friction
                </div>
                <div className="shrink-0 text-[12px]" style={{ color: needYou > 0 ? 'var(--color-eol-accent-label)' : 'var(--color-eol-text-muted)', fontWeight: needYou > 0 ? 600 : 400 }}>
                  {needYou > 0 ? `${needYou} need${needYou === 1 ? 's' : ''} you` : 'Take your time'}
                </div>
              </div>
              <div className="text-[11.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
                Friction is an opportunity for better connection
              </div>
            </Link>

            {moments.map((m) => (
              <Link key={m.id} to={`/teams/${teamId}/friction/tools/${m.id}`} className={tileClass} style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}>
                <span className="h-[30px] w-[30px] shrink-0 rounded-[8px]" style={{ background: swatchFor(m.id) }} />
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                    {m.name}
                  </div>
                  <div className="shrink-0 text-[12px]" style={{ color: 'var(--color-eol-text-muted)' }}>
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

        <div className="flex flex-col gap-2">
          <div className="border-b pb-3" style={{ borderColor: 'var(--color-eol-border-strong)' }}>
            <div className="text-[18px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              Friction history
            </div>
            <p className="m-0 mt-0.5 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              Conversations you've worked through, and what came out of them.
            </p>
          </div>

          {isLoading ? (
            <LoadingScreen />
          ) : history.length === 0 ? (
            <Card>
              <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                Nothing here yet. When you process something, it will show up here.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col">
              {history.map((item, i) =>
                item.kind === 'session' ? (
                  <FrictionThreadRow key={item.session.id} teamId={teamId} session={item.session} isLast={i === history.length - 1} />
                ) : (
                  <PersonalGuideRow key={item.guide.id} teamId={teamId} guide={item.guide} isLast={i === history.length - 1} />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
