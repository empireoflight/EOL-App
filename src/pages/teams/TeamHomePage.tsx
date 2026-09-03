import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTeamVision } from '../../hooks/useVision'
import { useTeamFrictionSessions, useMyPendingVisionSession, useOpenVisionSession } from '../../hooks/useConvergenceSession'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { LoadingScreen } from '../../components/shared/LoadingScreen'
import { OpenVisionSessionBanner } from '../../components/session/OpenVisionSessionBanner'
import { PendingFrictionBanners } from '../../components/session/PendingFrictionBanners'
import type { Experiment, TeamSignal } from '../../lib/types'

const LOOP = [
  { label: 'Reimagine', segment: 'vision' },
  { label: 'Do', segment: 'experiments' },
  { label: 'Unlearn', segment: 'friction' },
  { label: 'Evolve', segment: 'rollup' },
]

function useTeamExperiments(teamId: string | undefined) {
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

function useLatestNarrative(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-signals', teamId],
    queryFn: async (): Promise<TeamSignal[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('team_signals')
        .select('*')
        .eq('team_id', teamId as string)
        .eq('source', 'pulse')
        .eq('signal_type', 'weekly_narrative')
        .order('period_start', { ascending: false })
        .limit(1)
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

export default function TeamHomePage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { data: vision, isLoading } = useTeamVision(teamId)
  const { data: experiments } = useTeamExperiments(teamId)
  const { data: frictionSessions } = useTeamFrictionSessions(teamId)
  const { data: narratives } = useLatestNarrative(teamId)
  const { data: pendingVisionSession } = useMyPendingVisionSession(teamId)
  const { data: openVisionSession } = useOpenVisionSession(teamId)

  if (isLoading) return <LoadingScreen />

  const openExperiments = (experiments ?? []).filter((e) => e.status === 'not_started' || e.status === 'in_progress')
  const activeFrictionSessions = (frictionSessions ?? []).filter((s) => s.status !== 'closed' && s.status !== 'discussed')
  const nextExperiments = (experiments ?? []).filter((e) => e.status === 'not_started').slice(0, 2)
  const latest = narratives?.[0]?.value as { pattern?: string; visionInsight?: string | null } | undefined

  if (!vision) {
    // A session already collecting reflections (or one this person still
    // owes an answer to) makes "start a vision session" redundant — and
    // actively wrong, since starting another would fork what people have
    // already submitted. The banner above already covers both cases.
    const sessionAlreadyInFlight = !!pendingVisionSession || !!openVisionSession
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-10">
        <OpenVisionSessionBanner teamId={teamId} />
        <PendingFrictionBanners teamId={teamId} />
        {!sessionAlreadyInFlight && (
          <Card>
            <h2 className="m-0 mb-2 text-[18px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              What are we creating?
            </h2>
            <p className="m-0 mb-4 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              Start a vision session to co-create what this team is building together — everything else in the cycle takes its shape from here.
            </p>
            <Button onClick={() => navigate(`/teams/${teamId}/vision/start`)}>Start a vision session</Button>
          </Card>
        )}
      </div>
    )
  }

  const northStar = vision.layout.nodes.find((n) => n.kind === 'north_star')?.text

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <OpenVisionSessionBanner teamId={teamId} />
      <PendingFrictionBanners teamId={teamId} />

      <Link to={`/teams/${teamId}/vision`}>
        <div
          className="rounded-2xl border p-5 transition-opacity hover:opacity-90"
          style={{ background: 'var(--gradient-dawn)', borderColor: 'var(--color-eol-border)' }}
        >
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-pink-strong)' }}>
            What are we creating?
          </div>
          <div className="text-[18px] leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
            {northStar ?? 'Vision in progress'}
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-center gap-1.5">
        {LOOP.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1.5">
            <Link
              to={`/teams/${teamId}/${step.segment}`}
              className="rounded-full px-2.5 py-1 text-[10.5px] font-medium"
              style={{ background: 'var(--color-eol-surface)', color: 'var(--color-eol-text-muted)' }}
            >
              {step.label}
            </Link>
            {i < LOOP.length - 1 && (
              <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                &rarr;
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <Link to={`/teams/${teamId}/experiments`} className="min-w-[150px] flex-1">
          <Card className="transition-opacity hover:opacity-80">
            <div className="text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              {openExperiments.length}
            </div>
            <div className="text-[12px]" style={{ color: 'var(--color-eol-text-muted)' }}>
              open experiments
            </div>
          </Card>
        </Link>
        <Link to={`/teams/${teamId}/friction`} className="min-w-[150px] flex-1">
          <Card className="transition-opacity hover:opacity-80">
            <div className="text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              {activeFrictionSessions.length}
            </div>
            <div className="text-[12px]" style={{ color: 'var(--color-eol-text-muted)' }}>
              active friction sessions
            </div>
          </Card>
        </Link>
      </div>

      <Card>
        <div className="mb-2 text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          What are we learning?
        </div>
        {!latest?.pattern ? (
          <p className="m-0 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            Not enough responses to generate a team pattern yet.
          </p>
        ) : (
          <>
            <p className="m-0 mb-2 text-[13px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
              {latest.pattern}
            </p>
            {latest.visionInsight && (
              <p className="m-0 mb-2 text-[12.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
                {latest.visionInsight}
              </p>
            )}
          </>
        )}
        <Link to={`/teams/${teamId}/rollup`} className="text-[12.5px] font-semibold" style={{ color: 'var(--color-eol-accent-label)' }}>
          See the full rollup &rarr;
        </Link>
      </Card>

      <Card>
        <div className="mb-2.5 text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          What's next
        </div>
        {nextExperiments.length === 0 ? (
          <Button variant="secondary" onClick={() => navigate(`/teams/${teamId}/experiments`)} className="w-full">
            + New experiment
          </Button>
        ) : (
          <div className="flex flex-col gap-1.5">
            {nextExperiments.map((exp) => (
              <div key={exp.id} className="text-[13px]" style={{ color: 'var(--color-eol-text)' }}>
                {exp.title}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
