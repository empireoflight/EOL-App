import { Link } from 'react-router-dom'
import { Button } from '../shared/Button'
import { Textarea } from '../shared/Input'
import { TierBadge } from '../shared/TierBadge'
import { useDurableForm } from '../../hooks/useDurableForm'
import { useSaveMyProfile } from '../../hooks/useTeamProfiles'
import { isProfileComplete, KIND_HINTS } from '../../lib/teamProfiles'
import type { ProfileQuestion } from '../../lib/types'

// The answering side of team profiles: the questions the facilitator chose,
// saved per team. Rendered only once the saved profile has loaded, so
// useDurableForm's one-time initialValue is the real saved answers (a local
// unsaved draft still wins on restore, per spec §17).
export function TeamProfileForm({
  teamId,
  userId,
  questions,
  savedAnswers,
  hasProfile,
}: {
  teamId: string
  userId: string
  questions: ProfileQuestion[]
  savedAnswers: Record<string, string>
  hasProfile: boolean
}) {
  const { value: answers, setValue: setAnswers, discard, saveState } = useDurableForm<Record<string, string>>({
    formKey: `team-profile-${teamId}`,
    tier: 4,
    initialValue: savedAnswers,
    userId,
  })
  const save = useSaveMyProfile(teamId)

  const complete = isProfileComplete({ answers }, questions)
  const unchanged = hasProfile && questions.every((q) => (answers[q.id] ?? '').trim() === (savedAnswers[q.id] ?? '').trim())

  const handleSave = () => {
    const cleaned: Record<string, string> = {}
    for (const q of questions) {
      const text = (answers[q.id] ?? '').trim()
      if (text) cleaned[q.id] = text
    }
    save.mutate(cleaned, { onSuccess: () => discard() })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <TierBadge tier={4} />
        <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          {saveState === 'saving' ? 'Saving draft…' : 'Visible to everyone on this team'}
        </span>
      </div>

      {questions.length === 0 ? (
        <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
          Your team's profile is just a name and photo — no questions to answer.
        </p>
      ) : (
        questions.map((q) => (
          <Textarea
            key={q.id}
            label={q.optional ? `${q.prompt} (optional)` : q.prompt}
            hint={KIND_HINTS[q.kind] ?? undefined}
            value={answers[q.id] ?? ''}
            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
          />
        ))
      )}

      {save.isError && (
        <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
          {save.error instanceof Error ? save.error.message : "Couldn't save your profile."}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} loading={save.isPending} disabled={!complete || unchanged}>
          {hasProfile ? 'Save profile' : 'Add me to the Team board'}
        </Button>
        {save.isSuccess && (
          <Link to={`/teams/${teamId}/team`} className="text-[12.5px] font-semibold" style={{ color: 'var(--color-eol-accent-label)' }}>
            Saved — see the Team board &rarr;
          </Link>
        )}
        {!complete && (
          <span className="text-[11.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
            Answer the required questions to appear on the board.
          </span>
        )}
      </div>
    </div>
  )
}
