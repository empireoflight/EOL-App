import { useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTeamVision, useVisionCommitments, useCommitToVision } from '../../hooks/useVision'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { Avatar } from '../../components/shared/Avatar'
import { LoadingScreen } from '../../components/shared/LoadingScreen'

export default function VisionCommitPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const { data: vision, isLoading: visionLoading } = useTeamVision(teamId)
  const { data: members, isLoading: membersLoading } = useTeamMembers(teamId)
  const { data: commitments } = useVisionCommitments(vision?.id)
  const commit = useCommitToVision(vision?.id, teamId)

  if (visionLoading || membersLoading) return <LoadingScreen />
  if (!vision) return null

  if (vision.status === 'draft') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-6 py-10">
        <Card>
          <p className="m-0 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            This vision hasn't been sent for approval yet — it's still an editable draft on the Reimagine tab.
          </p>
        </Card>
      </div>
    )
  }

  const northStar = vision.layout.nodes.find((n) => n.kind === 'north_star')
  const commitmentByUser = Object.fromEntries((commitments ?? []).map((c) => [c.user_id, c]))
  const myCommitment = user ? commitmentByUser[user.id] : undefined
  const isCommitted = vision.status === 'committed'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="m-0 text-[24px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          {isCommitted ? 'This vision is committed' : "Here's what we're committing to"}
        </h1>
        <p className="m-0 mt-1 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          {isCommitted
            ? "Everyone signed on — it's now the shared reference point for tasks, check-ins, and the cycle ahead."
            : 'Once everyone commits, this vision becomes the shared reference point for tasks, check-ins, and the cycle ahead.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        {northStar && (
          <div
            className="w-[260px] shrink-0 rounded-2xl border p-5"
            style={{ background: 'var(--gradient-dawn)', borderColor: 'var(--color-eol-border)' }}
          >
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-pink-strong)' }}>
              North Star
            </div>
            <div className="text-[16px] leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              {northStar.text}
            </div>
          </div>
        )}

        <div className="flex min-w-[260px] flex-1 flex-col gap-2.5">
          {(members ?? []).map((m) => {
            const c = commitmentByUser[m.user_id]
            const committed = c?.status === 'committed'
            return (
              <div key={m.user_id} className="flex items-center gap-3 rounded-lg border px-3.5 py-2.5" style={{ borderColor: 'var(--color-eol-border)', background: 'var(--color-eol-surface-light)' }}>
                <Avatar name={m.users?.name ?? '?'} avatarUrl={m.users?.avatar_url} />
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: 'var(--color-eol-text)' }}>
                    {m.users?.name}
                  </div>
                  {!committed && c?.note && (
                    <div className="text-[11.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
                      {c.note}
                    </div>
                  )}
                </div>
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={
                    committed
                      ? { background: 'var(--color-tier3-bg)', color: 'var(--color-tier3-fg)' }
                      : { border: '1px solid var(--color-eol-border-strong)', color: 'var(--color-eol-text-muted)' }
                  }
                >
                  {committed ? 'Committed' : 'Waiting'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {!myCommitment || myCommitment.status !== 'committed' ? (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[14px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                Your commitment
              </div>
              <div className="text-[12.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
                You're signing on to this direction for the cycle ahead.
              </div>
            </div>
            <Button onClick={() => commit.mutate(undefined)} loading={commit.isPending}>
              I'm in
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
            You've committed to this vision.
          </p>
        </Card>
      )}
    </div>
  )
}
