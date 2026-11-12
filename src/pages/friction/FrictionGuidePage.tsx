import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDeletePersonalGuide, usePersonalGuide } from '../../hooks/usePersonalGuides'
import { authoredAnswerRows } from '../../lib/frictionQuestions'
import { formatPersonalGuideAsText } from '../../../supabase/functions/_shared/ai/personalGuide'
import { Button } from '../../components/shared/Button'
import { Card } from '../../components/shared/Card'
import { PageHeader } from '../../components/shared/PageHeader'
import { TierBadge } from '../../components/shared/TierBadge'
import { LoadingScreen } from '../../components/shared/LoadingScreen'

function StepBadge({ step }: { step: number }) {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
      style={{ background: 'var(--color-eol-accent)', color: 'var(--color-eol-ink)' }}
    >
      {step}
    </span>
  )
}

// A saved personal discussion guide. Owner-only: RLS returns nothing for
// anyone else, which this page shows as "not found".
export default function FrictionGuidePage() {
  const { teamId, guideId } = useParams<{ teamId: string; guideId: string }>()
  const navigate = useNavigate()
  const { data: saved, isLoading } = usePersonalGuide(guideId)
  const deleteGuide = useDeletePersonalGuide(teamId)
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (isLoading) return <LoadingScreen />

  if (!saved) {
    return (
      <>
        <PageHeader eyebrow="Unlearn" title="Discussion guide" />
        <div className="mx-auto flex max-w-xl flex-col gap-4 px-6 py-10">
          <Card>
            <p className="m-0 text-[13.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              We couldn't find that guide. It may have been deleted.
            </p>
          </Card>
          <Link to={`/teams/${teamId}/friction`} className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-accent-label)' }}>
            &larr; Back to Unlearn
          </Link>
        </div>
      </>
    )
  }

  const { guide } = saved

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatPersonalGuideAsText(guide))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    await deleteGuide.mutateAsync(saved.id)
    navigate(`/teams/${teamId}/friction`)
  }

  return (
    <>
      <PageHeader
        eyebrow="Unlearn · Your discussion guide"
        title="Your discussion guide"
        subline="A way to have the conversation. Take what helps and leave the rest."
        actions={
          <Button variant="ghost-on-dark" onClick={() => void handleCopy()}>
            {copied ? 'Copied' : 'Copy the guide'}
          </Button>
        }
      />
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
        <div className="flex items-center gap-2">
          <TierBadge tier={2} />
          <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            Only you can see this
          </span>
        </div>

        <Card>
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-accent-label)' }}>
            What this is about
          </div>
          <p className="m-0 mt-1 text-[14px] leading-relaxed" style={{ color: 'var(--color-eol-text)' }}>
            {saved.topic}
          </p>
          {saved.friction_type && (
            <span className="mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: 'var(--color-tier2-bg)', color: 'var(--color-tier2-fg)' }}>
              {saved.friction_type}
            </span>
          )}
          {guide.summary && (
            <p className="m-0 mt-3 border-t pt-3 text-[13.5px] leading-relaxed" style={{ borderColor: 'var(--color-eol-border)', color: 'var(--color-eol-text-secondary)' }}>
              {guide.summary}
            </p>
          )}
        </Card>

        {guide.opener && (
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-accent-label)' }}>
              To ask for the conversation
            </div>
            <p className="m-0 mt-1 text-[15px] leading-relaxed" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
              &ldquo;{guide.opener}&rdquo;
            </p>
          </Card>
        )}

        {guide.steps.map((step, i) => (
          <Card key={step.id}>
            <div className="mb-2 flex items-center gap-2.5">
              <StepBadge step={i + 1} />
              <div className="text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
                {step.title}
              </div>
            </div>
            <p className="m-0 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
              {step.guidance}
            </p>
            {step.prompts.length > 0 && (
              <ul className="m-0 mt-2.5 flex flex-col gap-1.5 pl-5 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-eol-text)' }}>
                {step.prompts.map((p, j) => (
                  <li key={j}>{p}</li>
                ))}
              </ul>
            )}
          </Card>
        ))}

        <Card>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-text-muted)' }}>
            What you wrote
          </div>
          <div className="flex flex-col gap-3">
            {authoredAnswerRows(saved.answers).map((q) => (
              <div key={q.id}>
                <div className="text-[11.5px] font-medium" style={{ color: 'var(--color-eol-text-muted)' }}>
                  {q.prompt}
                </div>
                <p className="m-0 mt-0.5 whitespace-pre-line text-[13px] leading-relaxed" style={{ color: 'var(--color-eol-text-secondary)' }}>
                  {q.answer}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col items-start gap-3">
          <Link to={`/teams/${teamId}/friction`} className="text-[13px] font-semibold" style={{ color: 'var(--color-eol-accent-label)' }}>
            &larr; Back to Unlearn
          </Link>
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} className="text-[12.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
              Delete this guide
            </button>
          ) : (
            <div className="flex w-full flex-col gap-2.5 rounded-lg border px-3.5 py-3" style={{ borderColor: 'var(--color-eol-pink)' }}>
              <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
                Delete this guide and what you wrote for it? This can't be undone.
              </p>
              {deleteGuide.isError && (
                <p className="m-0 text-[12px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
                  {deleteGuide.error instanceof Error ? deleteGuide.error.message : "Couldn't delete it."}
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => void handleDelete()} loading={deleteGuide.isPending} className="flex-1">
                  Yes, delete
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)} className="flex-1">
                  Keep it
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
