import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTeamVision } from '../../hooks/useVision'
import { useTeamFrictionSessions, useMyPendingVisionSession, useOpenVisionSession } from '../../hooks/useConvergenceSession'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { PageHeader } from '../../components/shared/PageHeader'
import { LoadingScreen } from '../../components/shared/LoadingScreen'
import { OpenVisionSessionBanner } from '../../components/session/OpenVisionSessionBanner'
import { PendingFrictionBanners } from '../../components/session/PendingFrictionBanners'
import type { Action, Experiment, TeamSignal } from '../../lib/types'

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

function useTeamActions(teamId: string | undefined) {
  return useQuery({
    queryKey: ['actions', teamId],
    queryFn: async (): Promise<Action[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('actions')
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
  const { data: actions } = useTeamActions(teamId)
  const { data: frictionSessions } = useTeamFrictionSessions(teamId)
  const { data: narratives } = useLatestNarrative(teamId)
  const { data: pendingVisionSession } = useMyPendingVisionSession(teamId)
  const { data: openVisionSession } = useOpenVisionSession(teamId)

  if (isLoading) return <LoadingScreen />

  const openExperiments = (experiments ?? []).filter((e) => e.status === 'not_started' || e.status === 'in_progress')
  const openActions = (actions ?? []).filter((a) => a.status === 'not_started' || a.status === 'in_progress')
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
      <>
        <PageHeader eyebrow="Overview" title="What are we creating?" />
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-10">
          <div className="flex justify-end">
            <Link to={`/teams/${teamId}/summary`} className="text-[12px] font-medium" style={{ color: 'var(--color-eol-accent-label)' }}>
              Status summary &rarr;
            </Link>
          </div>
          <OpenVisionSessionBanner teamId={teamId} />
          <PendingFrictionBanners teamId={teamId} />
          {!sessionAlreadyInFlight && (
            <Card>
              <p className="m-0 mb-4 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
                Start a vision session to co-create what this team is building together — everything else in the cycle takes its shape from here.
              </p>
              <Button onClick={() => navigate(`/teams/${teamId}/vision/start`)}>Start a vision session</Button>
            </Card>
          )}
        </div>
      </>
    )
  }

  const northStar = vision.layout.nodes.find((n) => n.kind === 'north_star')?.text

  // Segments light up once the team has sent the vision for commitment —
  // before that, only Reimagine (the step actually in progress) is lit.
  const cycleLit = vision.status !== 'draft'

  return (
    <>
      <PageHeader
        eyebrow="What are we creating?"
        title={northStar ?? 'Vision in progress'}
        actions={
          <Link to={`/teams/${teamId}/summary`} className="text-[12px] font-medium" style={{ color: 'var(--color-eol-gold-on-dark)' }}>
            Status summary &rarr;
          </Link>
        }
      />
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <OpenVisionSessionBanner teamId={teamId} />
        <PendingFrictionBanners teamId={teamId} />

        <div className="flex items-center justify-center gap-2">
          {LOOP.map((step, i) => {
            const lit = cycleLit || step.label === 'Reimagine'
            return (
              <div key={step.label} className="flex flex-1 items-center gap-2">
                <Link to={`/teams/${teamId}/${step.segment}`} className="flex-1">
                  <div className="h-1.5 rounded-full" style={{ background: lit ? 'var(--gradient-dawn)' : 'oklch(0.91 0.012 70)' }} />
                  <div
                    className="mt-1.5 text-[13px]"
                    style={{ color: lit ? 'var(--color-eol-text)' : 'var(--color-eol-text-faint)', fontWeight: lit ? 600 : 500 }}
                  >
                    {step.label}
                  </div>
                </Link>
                {i < LOOP.length - 1 && (
                  <span className="pb-4 text-[13px]" style={{ color: 'var(--color-eol-text-faint)' }}>
                    &rarr;
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-4">
        <Link to={`/teams/${teamId}/experiments`} className="min-w-[150px] flex-1">
          <Card className="transition-opacity hover:opacity-80">
            <div className="text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              {openExperiments.length + openActions.length}
            </div>
            <div className="text-[12px]" style={{ color: 'var(--color-eol-text-muted)' }}>
              open actions/experiments
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
    </>
  )
}
