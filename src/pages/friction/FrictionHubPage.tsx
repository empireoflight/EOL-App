import { Link, useParams } from 'react-router-dom'
import { useMyPendingFrictionSessions, useTeamFrictionSessions } from '../../hooks/useConvergenceSession'
import { useUserName } from '../../hooks/useUserName'
import { Card } from '../../components/shared/Card'
import { LoadingScreen } from '../../components/shared/LoadingScreen'
import type { ConvergenceSession } from '../../lib/types'

function PendingFrictionBanner({ teamId, session }: { teamId: string | undefined; session: ConvergenceSession }) {
  const topic = (session.framing as { topic?: string | null }).topic
  const { data: initiatorName } = useUserName(topic ? undefined : session.initiator_id)
  return (
    <Link
      to={`/teams/${teamId}/friction/sessions/${session.id}/mitigate`}
      className="flex items-center justify-between gap-3 rounded-2xl border p-4"
      style={{ background: 'var(--color-tier2-bg)', borderColor: 'var(--color-eol-border)' }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[11px]" style={{ color: 'var(--color-tier2-fg)', opacity: 0.75 }}>
          You've been included in a friction conversation
        </div>
        <div className="truncate text-[13.5px] font-semibold" style={{ color: 'var(--color-tier2-fg)' }}>
          {topic || (initiatorName ? `Waiting on ${initiatorName} to describe it` : 'Waiting on the initiator to describe it')}
        </div>
      </div>
      <span className="shrink-0 text-[12.5px] font-semibold" style={{ color: 'var(--color-tier2-fg)' }}>
        Process it &rarr;
      </span>
    </Link>
  )
}

export default function FrictionHubPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { data: sessions, isLoading } = useTeamFrictionSessions(teamId)
  const { data: pendingSessions } = useMyPendingFrictionSessions(teamId)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="m-0 text-[24px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Unlearn
        </h1>
        <p className="m-0 mt-1 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          Unlearning is the art of processing friction and building capacity to try new things.
        </p>
      </div>

      {pendingSessions && pendingSessions.length > 0 && (
        <div className="flex flex-col gap-2">
          {pendingSessions.map((session) => (
            <PendingFrictionBanner key={session.id} teamId={teamId} session={session} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
            Process Friction
          </div>
          <p className="m-0 mt-0.5 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            Friction is information, not failure.
          </p>
        </div>

        <Link
          to={`/teams/${teamId}/friction/start`}
          className="flex items-center justify-between gap-3 rounded-2xl border p-4"
          style={{ background: 'var(--color-tier2-bg)', borderColor: 'var(--color-eol-border)' }}
        >
          <div>
            <div className="text-[13.5px] font-semibold" style={{ color: 'var(--color-tier2-fg)' }}>
              What's getting in the way?
            </div>
            <div className="mt-0.5 text-[12px]" style={{ color: 'var(--color-tier2-fg)' }}>
              Notice something? Start here.
            </div>
          </div>
          <span className="shrink-0 text-[12.5px] font-semibold" style={{ color: 'var(--color-tier2-fg)' }}>
            Raise it &rarr;
          </span>
        </Link>

        {isLoading ? (
          <LoadingScreen />
        ) : !sessions || sessions.length === 0 ? (
          <Card>
            <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
              No friction sessions yet.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-[12px] font-semibold" style={{ color: 'var(--color-eol-text-muted)' }}>
              Active Friction {sessions.length === 1 ? 'Session' : 'Sessions'}
            </div>
            {sessions.map((s) => {
              const topic = (s.framing as { topic?: string }).topic
              return (
                <Link key={s.id} to={`/teams/${teamId}/friction/sessions/${s.id}`}>
                  <Card className="transition-opacity hover:opacity-80">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 truncate text-[13px]" style={{ color: 'var(--color-eol-text)' }}>
                        {topic || 'Untitled'}
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
                        style={{ background: 'var(--color-tier2-bg)', color: 'var(--color-tier2-fg)' }}
                      >
                        {s.status}
                      </span>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
          Create space
        </div>

        <Link
          to={`/teams/${teamId}/friction/tools`}
          className="flex items-center justify-between gap-3 rounded-2xl border p-4"
          style={{ background: 'var(--color-eol-surface)', borderColor: 'var(--color-eol-border)' }}
        >
          <div className="text-[12px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            Grounding tools and activities — pick whatever fits the moment.
          </div>
          <span className="shrink-0 text-[12.5px] font-semibold" style={{ color: 'var(--color-eol-text-muted)' }}>
            Open &rarr;
          </span>
        </Link>
      </div>
    </div>
  )
}
