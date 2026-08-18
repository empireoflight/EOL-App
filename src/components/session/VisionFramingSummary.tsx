import { useConvergenceSession } from '../../hooks/useConvergenceSession'
import { useUserName } from '../../hooks/useUserName'
import { Card } from '../shared/Card'

// Orients anyone arriving to reflect with what session they're actually in
// — `framing` (scope/horizon/whyNow) is set once by whoever starts the
// session (VisionStartPage) but was previously only used to pick the
// question set, never shown, so everyone else answered blind.
export function VisionFramingSummary({ sessionId }: { sessionId: string | undefined }) {
  const { data } = useConvergenceSession(sessionId)
  const { data: initiatorName } = useUserName(data?.session.initiator_id)
  if (!data) return null

  const { scope, horizon, whyNow } = data.session.framing as { scope?: string; horizon?: string; whyNow?: string }
  if (!scope && !whyNow) return null

  return (
    <Card>
      <div className="text-[12px]" style={{ color: 'var(--color-eol-text-muted)' }}>
        <span className="font-semibold" style={{ color: 'var(--color-eol-text)' }}>
          {initiatorName ?? 'Someone'}
        </span>{' '}
        started a vision session
        {horizon && (
          <>
            {' '}
            for the next <span className="font-medium">{horizon}</span>
          </>
        )}
      </div>
      {scope && (
        <p className="m-0 mt-2 text-[13px]" style={{ color: 'var(--color-eol-text)' }}>
          <span className="font-medium">Scope:</span> {scope}
        </p>
      )}
      {whyNow && (
        <p className="m-0 mt-1.5 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
          {whyNow}
        </p>
      )}
    </Card>
  )
}
