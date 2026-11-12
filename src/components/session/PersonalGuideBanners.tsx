import { Link } from 'react-router-dom'
import { useMarkConversationHad, useMyPersonalGuides } from '../../hooks/usePersonalGuides'
import { ActionBanner } from '../shared/ActionBanner'
import { Button } from '../shared/Button'
import type { PersonalFrictionGuide } from '../../lib/types'

function PersonalGuideBanner({ teamId, guide }: { teamId: string | undefined; guide: PersonalFrictionGuide }) {
  const markDone = useMarkConversationHad(teamId)
  return (
    <ActionBanner
      eyebrow="Your discussion guide"
      title={guide.topic}
      detail={
        markDone.isError ? (
          <span style={{ color: 'var(--color-eol-pink-strong)' }}>Couldn't save that. Try again.</span>
        ) : (
          'Only you can see this'
        )
      }
      actions={
        <>
          <Link to={`/teams/${teamId}/friction/guides/${guide.id}`} className="text-[13.5px] font-semibold" style={{ color: 'var(--color-eol-accent-label)' }}>
            Open guide &rarr;
          </Link>
          <Button variant="secondary" onClick={() => markDone.mutate(guide.id)} loading={markDone.isPending} className="!py-2">
            I've had this conversation
          </Button>
        </>
      }
    />
  )
}

// A prepared guide stays pinned at the top of Unlearn until the person says
// they've had the conversation, so it's easy to get back to when the time
// comes. Owner-only data (see personal_friction_guides' RLS).
export function PersonalGuideBanners({ teamId }: { teamId: string | undefined }) {
  const { data: guides } = useMyPersonalGuides(teamId)
  const open = (guides ?? []).filter((g) => !g.conversation_had_at)
  if (open.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {open.map((g) => (
        <PersonalGuideBanner key={g.id} teamId={teamId} guide={g} />
      ))}
    </div>
  )
}
