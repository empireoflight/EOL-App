import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTeam, useTeamMembers } from '../../hooks/useMyTeams'
import { useMyProfileMatches, useProfileQuestions, useRefreshMatches, useTeamProfiles } from '../../hooks/useTeamProfiles'
import { bestMatchIds, isProfileComplete, orderProfiles } from '../../lib/teamProfiles'
import type { ProfileQuestion, TeamProfile, TeamProfileMatch } from '../../lib/types'
import { Avatar } from '../../components/shared/Avatar'
import { Card } from '../../components/shared/Card'
import { PageHeader } from '../../components/shared/PageHeader'
import { LoadingScreen } from '../../components/shared/LoadingScreen'

// Paper-note tints, slight tilts, and pin colors — picked per person from a
// hash of their id, so a card keeps its look from visit to visit.
const PAPER = [
  'oklch(0.985 0.02 90)',
  'oklch(0.97 0.035 350)',
  'oklch(0.97 0.03 310)',
  'oklch(0.97 0.03 200)',
  'oklch(0.97 0.035 150)',
  'oklch(0.975 0.035 60)',
]
const TILTS = [-1.4, 0.9, -0.6, 1.2, -1, 0.6]
const PINS = ['oklch(0.62 0.19 25)', 'oklch(0.62 0.17 350)', 'oklch(0.6 0.15 250)', 'oklch(0.65 0.15 150)', 'oklch(0.75 0.15 85)']

function hashOf(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return hash
}

// Anchors need their color set directly — the global `a` rule in tokens.css
// beats anything inherited from a wrapper.
const ghostLinkStyle = { color: 'var(--color-eol-heading-on-dark)', border: '1px solid rgba(255,255,255,0.22)' }
const ghostLinkClass = 'rounded-[10px] px-4 py-2.5 text-[13px] font-semibold'

function ProfileNote({
  profile,
  questions,
  isMe,
  isBestMatch,
  match,
  teamId,
}: {
  profile: TeamProfile
  questions: ProfileQuestion[]
  isMe: boolean
  isBestMatch: boolean
  match: TeamProfileMatch | undefined
  teamId: string
}) {
  const hash = hashOf(profile.user_id)
  const name = profile.users?.name ?? 'Teammate'
  const answered = questions.filter((q) => profile.answers[q.id]?.trim())

  return (
    <article
      aria-label={name}
      className="relative rounded-md px-5 pb-5 pt-7 transition-transform duration-200 [transform:rotate(var(--tilt))] hover:[transform:rotate(0deg)_translateY(-3px)] motion-reduce:transition-none motion-reduce:hover:[transform:rotate(var(--tilt))]"
      style={{
        ['--tilt' as string]: `${TILTS[hash % TILTS.length]}deg`,
        background: PAPER[hash % PAPER.length],
        boxShadow: '0 1px 0 rgba(60,40,20,0.06), 0 10px 20px -10px rgba(60,40,20,0.4)',
      }}
    >
      <span
        aria-hidden
        className="absolute left-1/2 top-2 h-3.5 w-3.5 -translate-x-1/2 rounded-full"
        style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.7), ${PINS[hash % PINS.length]} 55%)`, boxShadow: '0 2px 3px rgba(40,25,10,0.35)' }}
      />

      {isBestMatch && (
        <span
          className="absolute -right-2 -top-2 rotate-[5deg] rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: 'var(--gradient-dawn)', color: 'var(--color-eol-north-star-text)', boxShadow: '0 2px 6px rgba(60,40,20,0.25)' }}
        >
          Best match
        </span>
      )}

      <div className="flex items-center gap-3">
        <span className="rounded-full bg-white p-[3px]" style={{ boxShadow: '0 1px 4px rgba(60,40,20,0.3)' }}>
          <Avatar name={name} avatarUrl={profile.users?.avatar_url} size={52} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate text-[19px] font-semibold leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            {name}
          </h2>
          {isMe && (
            <div className="mt-0.5 flex items-center gap-2 text-[11.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
              <span>That's you</span>
              <Link to={`/teams/${teamId}/profile`} className="font-semibold" style={{ color: 'var(--color-eol-accent-label)' }}>
                Edit
              </Link>
            </div>
          )}
        </div>
      </div>

      {!isMe && match?.reason && (
        <div
          className="mt-4 rotate-[-0.8deg] rounded-sm px-3 py-2 text-[12.5px] leading-snug"
          style={{
            background: isBestMatch ? 'oklch(0.94 0.1 95)' : 'oklch(0.96 0.04 95)',
            color: 'var(--color-eol-text)',
            boxShadow: '0 1px 2px rgba(60,40,20,0.15)',
          }}
        >
          {match.reason}
        </div>
      )}

      {answered.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {answered.map((q) => (
            <div key={q.id}>
              <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                {q.prompt}
              </div>
              <p className="m-0 mt-0.5 whitespace-pre-line text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text)' }}>
                {profile.answers[q.id]}
              </p>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

export default function TeamBoardPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const { data: team, isLoading: teamLoading } = useTeam(teamId)
  const { data: members, isLoading: membersLoading } = useTeamMembers(teamId)
  const { questions, updatedAt: questionsUpdatedAt, isLoading: questionsLoading } = useProfileQuestions(teamId)
  const { data: profiles, isLoading: profilesLoading } = useTeamProfiles(teamId)
  const { data: matches, isLoading: matchesLoading } = useMyProfileMatches(teamId)

  const { refreshing } = useRefreshMatches({
    teamId,
    profiles,
    matches,
    questionsUpdatedAt,
    ready: !teamLoading && !membersLoading && !questionsLoading && !profilesLoading && !matchesLoading,
  })

  if (teamLoading || membersLoading || questionsLoading || profilesLoading) return <LoadingScreen />

  const isFacilitator = members?.find((m) => m.user_id === user?.id)?.team_role === 'facilitator'

  if (team?.is_solo) {
    return (
      <>
        <PageHeader eyebrow="Team" title="Meet the team" />
        <div className="mx-auto max-w-xl px-6 py-10">
          <Card>
            <p className="m-0 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              This space is just for you. Invite people to turn it into a team, and they'll show up here.
            </p>
          </Card>
        </div>
      </>
    )
  }

  const memberIds = new Set((members ?? []).map((m) => m.user_id))
  const complete = (profiles ?? []).filter((p) => memberIds.has(p.user_id) && isProfileComplete(p, questions))
  const matchMap = new Map((matches ?? []).filter((m) => memberIds.has(m.other_id)).map((m) => [m.other_id, m]))
  const ordered = orderProfiles(complete, user?.id, matchMap)
  const best = bestMatchIds(ordered, user?.id, matchMap)
  const iAmOnBoard = complete.some((p) => p.user_id === user?.id)
  const waiting = (members?.length ?? 0) - complete.length

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Meet the team"
        subline="Who's here, what they're into, and who you might click with."
        actions={
          <>
            {isFacilitator && (
              <Link to={`/teams/${teamId}/settings`} className={ghostLinkClass} style={ghostLinkStyle}>
                Customize questions
              </Link>
            )}
            <Link to={`/teams/${teamId}/profile`} className={ghostLinkClass} style={ghostLinkStyle}>
              {iAmOnBoard ? 'Edit my profile' : 'Add my profile'}
            </Link>
          </>
        }
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        {!iAmOnBoard && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[14px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
                  Pin yourself to the board
                </div>
                <p className="m-0 mt-0.5 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                  Answer a few questions and your teammates can find you — and you'll see who you're most likely to click with.
                </p>
              </div>
              <Link to={`/teams/${teamId}/profile`} className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold" style={{ background: 'var(--color-eol-cta)', color: 'var(--color-eol-cta-ink)' }}>
                Add my profile
              </Link>
            </div>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-[12.5px]" style={{ color: 'var(--color-eol-text-muted)' }}>
          <span>
            {complete.length === 0
              ? 'Nobody has pinned a profile yet.'
              : waiting > 0
                ? `${waiting} ${waiting === 1 ? "teammate hasn't" : "teammates haven't"} added a profile yet.`
                : 'Everyone is on the board.'}
          </span>
          {refreshing && (
            <span className="animate-pulse motion-reduce:animate-none" role="status">
              Finding your best matches…
            </span>
          )}
        </div>

        <div
          className="rounded-[20px] border p-6 sm:p-8"
          style={{
            background: 'oklch(0.94 0.03 72)',
            backgroundImage: 'radial-gradient(oklch(0.82 0.05 65 / 0.55) 1px, transparent 1.3px)',
            backgroundSize: '18px 18px',
            borderColor: 'var(--color-eol-border)',
          }}
        >
          {ordered.length === 0 ? (
            <p className="m-0 py-10 text-center text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              The board's empty — be the first to pin something up.
            </p>
          ) : (
            <div className="grid items-start gap-x-7 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
              {ordered.map((p) => (
                <ProfileNote
                  key={p.user_id}
                  profile={p}
                  questions={questions}
                  isMe={p.user_id === user?.id}
                  isBestMatch={best.has(p.user_id)}
                  match={matchMap.get(p.user_id)}
                  teamId={teamId as string}
                />
              ))}
            </div>
          )}
        </div>

        {complete.length === 1 && iAmOnBoard && (
          <p className="m-0 text-center text-[12.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            You're the first one here —{' '}
            <Link to={`/teams/${teamId}/invite`} className="font-semibold" style={{ color: 'var(--color-eol-accent-label)' }}>
              invite your teammates
            </Link>{' '}
            to fill up the board.
          </p>
        )}
      </div>
    </>
  )
}
