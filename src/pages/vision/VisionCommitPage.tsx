import { useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTeamVision, useVisionCommitments, useCommitToVision } from '../../hooks/useVision'
import { useTeamMembers } from '../../hooks/useMyTeams'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { PageHeader } from '../../components/shared/PageHeader'
import { TierBadge } from '../../components/shared/TierBadge'
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
      <>
        <PageHeader eyebrow="Reimagine · Team commit" title="Here's what we're committing to" />
        <div className="mx-auto flex max-w-xl flex-col gap-4 px-6 py-10">
          <Card>
            <p className="m-0 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              This vision hasn't been sent for approval yet — it's still an editable draft on the Reimagine tab.
            </p>
          </Card>
        </div>
      </>
    )
  }

  const northStar = vision.layout.nodes.find((n) => n.kind === 'north_star')
  const commitmentByUser = Object.fromEntries((commitments ?? []).map((c) => [c.user_id, c]))
  const myCommitment = user ? commitmentByUser[user.id] : undefined
  const isCommitted = vision.status === 'committed'

  return (
    <>
      <PageHeader
        eyebrow="Reimagine · Team commit"
        title={isCommitted ? 'This vision is committed' : "Here's what we're committing to"}
        subline={
          isCommitted
            ? "Everyone signed on — it's now the shared reference point for tasks, check-ins, and the cycle ahead."
            : 'Once everyone commits, this vision becomes the shared reference point for tasks, check-ins, and the cycle ahead.'
        }
        actions={<TierBadge tier={4} />}
      />
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex w-full flex-col gap-4 sm:w-[320px] sm:shrink-0">
            {northStar && (
              <div className="rounded-[18px] border p-5" style={{ background: 'var(--gradient-dawn)', borderColor: 'var(--color-eol-border)' }}>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-north-star-label)' }}>
                  North Star
                </div>
                <div className="text-[16px] leading-snug" style={{ fontFamily: 'var(--font-display)', fontWeight: 400, color: 'var(--color-eol-north-star-text)' }}>
                  {northStar.text}
                </div>
              </div>
            )}

            {!myCommitment || myCommitment.status !== 'committed' ? (
              <Card>
                <div className="text-[14px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                  Your commitment
                </div>
                <div className="mb-3 text-[12.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
                  You're signing on to this direction for the cycle ahead.
                </div>
                <Button onClick={() => commit.mutate(undefined)} loading={commit.isPending} className="w-full">
                  I'm in
                </Button>
              </Card>
            ) : (
              <Card>
                <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                  You've committed to this vision.
                </p>
              </Card>
            )}
          </div>

          <Card className="flex-1 !p-0">
            {(members ?? []).map((m, i) => {
              const c = commitmentByUser[m.user_id]
              const committed = c?.status === 'committed'
              return (
                <div
                  key={m.user_id}
                  className="flex items-center gap-3 px-5 py-4"
                  style={{
                    borderTop: i === 0 ? undefined : '1px solid var(--color-eol-border)',
                    background: committed ? undefined : 'oklch(0.975 0.01 75)',
                  }}
                >
                  {committed ? (
                    <Avatar name={m.users?.name ?? '?'} avatarUrl={m.users?.avatar_url} />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed" style={{ borderColor: 'var(--color-eol-status-empty-ring)' }} />
                  )}
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
                    className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold"
                    style={{ color: committed ? 'var(--color-eol-status-green-fg)' : 'var(--color-eol-text-muted)' }}
                  >
                    {committed ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-eol-status-green-dot)' }} />
                    ) : (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full border-[1.5px]" style={{ borderColor: 'var(--color-eol-status-empty-ring)' }} />
                    )}
                    {committed ? 'Committed' : 'Waiting'}
                  </span>
                </div>
              )
            })}
          </Card>
        </div>
      </div>
    </>
  )
}
