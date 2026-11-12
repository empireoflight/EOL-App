import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useDurableForm } from '../../hooks/useDurableForm'
import { FRICTION_AUTHORED_QUESTIONS } from '../../lib/frictionQuestions'
import { Button } from '../../components/shared/Button'
import { Textarea } from '../../components/shared/Input'
import { Card } from '../../components/shared/Card'
import { PageHeader } from '../../components/shared/PageHeader'
import { TierBadge } from '../../components/shared/TierBadge'
import { FrictionTypeChips } from '../../components/session/FrictionTypeChips'

type PrepareDraft = {
  topic: string
  frictionType: string | null
  problem_summary: string
  hopes: string
  what_matters: string
}

const EMPTY: PrepareDraft = { topic: '', frictionType: null, problem_summary: '', hopes: '', what_matters: '' }

// After grounding, one person getting ready for a conversation: the same
// situation + point-of-view questions a shared friction session asks, minus
// the inviting. What they write here goes to the AI to build a discussion
// guide and is saved privately for them (tier 2, AI-assisted), which is a
// different thing from the grounding answers before it (tier 0, never sent).
export default function FrictionPreparePage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { value: draft, setValue: setDraft, discard } = useDurableForm<PrepareDraft>({
    formKey: `friction-prepare-${teamId}`,
    tier: 2,
    initialValue: EMPTY,
    userId: user?.id,
  })

  const ready = draft.topic.trim() && FRICTION_AUTHORED_QUESTIONS.every((q) => draft[q.id].trim())

  const handleSubmit = async () => {
    if (!supabase || !teamId || !ready) return
    setSubmitting(true)
    setError('')
    try {
      const { data: authData } = await supabase.auth.getSession()
      const { data, error: invokeError } = await supabase.functions.invoke('prepare-friction-guide', {
        body: {
          teamId,
          topic: draft.topic.trim(),
          frictionType: draft.frictionType,
          answers: { problem_summary: draft.problem_summary.trim(), hopes: draft.hopes.trim(), what_matters: draft.what_matters.trim() },
        },
        headers: { Authorization: `Bearer ${authData.session?.access_token}` },
      })
      if (invokeError) throw invokeError
      if (!data?.id) {
        // Built but not saved (rare): there's no page to send them to, and the
        // draft is kept so they can try again.
        throw new Error("Your guide was built but couldn't be saved. Your notes are still here, so try again in a moment.")
      }
      discard()
      queryClient.invalidateQueries({ queryKey: ['personal-friction-guides', teamId] })
      navigate(`/teams/${teamId}/friction/guides/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't build the guide. Your notes are still here, so try again in a moment.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Unlearn · Prepare a conversation"
        title="Prepare for the conversation"
        subline="A few notes on what you want to say. We'll turn them into a guide for how to have it."
      />
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-6 py-10">
        {error && (
          <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
            {error}
          </div>
        )}

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <TierBadge tier={2} />
            <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
              Sent to the AI to build your guide, then saved for you only
            </span>
          </div>
          <div className="flex flex-col gap-4">
            <Textarea
              label="Describe the situation"
              hint="What's going on, in a few sentences. Include who it involves if that helps."
              required
              value={draft.topic}
              onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
            />
            <FrictionTypeChips value={draft.frictionType} onChange={(frictionType) => setDraft({ ...draft, frictionType })} />
          </div>
        </Card>

        {FRICTION_AUTHORED_QUESTIONS.map((q) => (
          <Textarea key={q.id} label={q.prompt} value={draft[q.id]} onChange={(e) => setDraft({ ...draft, [q.id]: e.target.value })} />
        ))}

        <Button onClick={handleSubmit} loading={submitting} disabled={!ready} className="w-full">
          Create my discussion guide
        </Button>
        {submitting && (
          <p className="m-0 text-center text-[12px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            This takes about half a minute.
          </p>
        )}
      </div>
    </>
  )
}
