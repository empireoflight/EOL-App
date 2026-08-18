import { useConvergenceSession } from '../../hooks/useConvergenceSession'
import { useUserName } from '../../hooks/useUserName'
import { Card } from '../shared/Card'

// Orients whoever's arriving at Mitigator/Respond with what conversation
// they're actually in — nothing here is new privacy exposure, `framing` is
// already readable by any session participant (20260814160000's fix), this
// was purely a missing display.
export function FrictionTopicSummary({ sessionId }: { sessionId: string | undefined }) {
  const { data } = useConvergenceSession(sessionId)
  const { data: initiatorName } = useUserName(data?.session.initiator_id)
  if (!data) return null

  const { topic, frictionType } = data.session.framing as { topic?: string; frictionType?: string }
  if (!topic) return null

  return (
    <Card>
      <div className="text-[12px]" style={{ color: 'var(--color-eol-text-muted)' }}>
        <span className="font-semibold" style={{ color: 'var(--color-eol-text)' }}>
          {initiatorName ?? 'Someone'}
        </span>{' '}
        raised something about:
      </div>
      <p className="m-0 mt-1 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text)' }}>
        {topic}
      </p>
      {frictionType && (
        <span
          className="mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ background: 'var(--color-tier2-bg)', color: 'var(--color-tier2-fg)' }}
        >
          {frictionType}
        </span>
      )}
    </Card>
  )
}
