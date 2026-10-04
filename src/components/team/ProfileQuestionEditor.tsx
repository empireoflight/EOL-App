import { useState } from 'react'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'
import { DEFAULT_PROFILE_QUESTIONS, KIND_LABELS } from '../../lib/teamProfiles'
import type { ProfileQuestion, ProfileQuestionKind } from '../../lib/types'

const KINDS = Object.keys(KIND_LABELS) as ProfileQuestionKind[]

function KindSelect({ value, onChange, label }: { value: ProfileQuestionKind; onChange: (kind: ProfileQuestionKind) => void; label: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ProfileQuestionKind)}
      aria-label={label}
      className="rounded-lg border px-2 py-2 text-[12px]"
      style={{ borderColor: 'var(--color-eol-border-strong)', background: 'var(--color-eol-surface-light)', color: 'var(--color-eol-text)' }}
    >
      {KINDS.map((kind) => (
        <option key={kind} value={kind}>
          {KIND_LABELS[kind]}
        </option>
      ))}
    </select>
  )
}

function sameQuestions(a: ProfileQuestion[], b: ProfileQuestion[]) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Facilitator-side editor for a team's "get to know you" questions — the
// same up/down/remove/optional/add affordances as the vision question
// review step, plus a kind per question that tells the Team page's matching
// how to use the answer (an offer meets a seek; interests reward overlap).
export function ProfileQuestionEditor({
  saved,
  onSave,
  saving,
  error,
}: {
  saved: ProfileQuestion[]
  onSave: (questions: ProfileQuestion[]) => void
  saving: boolean
  error?: string
}) {
  const [questions, setQuestions] = useState<ProfileQuestion[]>(saved)
  const [newPrompt, setNewPrompt] = useState('')
  const [newKind, setNewKind] = useState<ProfileQuestionKind>('about')

  const update = (id: string, patch: Partial<ProfileQuestion>) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  const remove = (id: string) => setQuestions((qs) => qs.filter((q) => q.id !== id))
  const move = (index: number, direction: -1 | 1) =>
    setQuestions((qs) => {
      const target = index + direction
      if (target < 0 || target >= qs.length) return qs
      const next = [...qs]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  const add = () => {
    if (!newPrompt.trim()) return
    // Optional by default: a required question added later would instantly
    // un-complete everyone who already answered and empty the board.
    setQuestions((qs) => [...qs, { id: crypto.randomUUID(), prompt: newPrompt.trim(), kind: newKind, optional: true }])
    setNewPrompt('')
  }

  const dirty = !sameQuestions(questions, saved)
  const hasBlank = questions.some((q) => !q.prompt.trim())

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
        Name and photo are always part of a profile. These questions are shared with the whole team on the Team page. Editing a question's wording keeps people's answers;
        removing one hides them. Someone appears on the board once they've answered every required question, so new questions start as optional — making one
        required hides anyone who hasn't answered it yet.
      </p>

      {questions.length === 0 && (
        <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-text-faint)' }}>
          No questions — profiles will just be a name and photo.
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {questions.map((q, i) => (
          <div key={q.id} className="flex items-start gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--color-eol-border-strong)' }}>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="text-[13px] leading-none disabled:opacity-30"
                style={{ color: 'var(--color-eol-text-muted)' }}
              >
                &uarr;
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === questions.length - 1}
                aria-label="Move down"
                className="text-[13px] leading-none disabled:opacity-30"
                style={{ color: 'var(--color-eol-text-muted)' }}
              >
                &darr;
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Input value={q.prompt} onChange={(e) => update(q.id, { prompt: e.target.value })} aria-label="Question" />
              <div className="flex flex-wrap items-center gap-3">
                <KindSelect value={q.kind} onChange={(kind) => update(q.id, { kind })} label="How this answer is used" />
                <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-eol-text-muted)' }}>
                  <input type="checkbox" checked={!!q.optional} onChange={(e) => update(q.id, { optional: e.target.checked })} />
                  Optional
                </label>
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(q.id)}
              aria-label="Remove question"
              className="shrink-0 text-[15px] opacity-50 hover:opacity-100"
              style={{ color: 'var(--color-eol-text-muted)' }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Add a question"
          className="min-w-[180px] flex-1"
          aria-label="New question"
        />
        <KindSelect value={newKind} onChange={setNewKind} label="Kind for the new question" />
        <Button type="button" variant="secondary" onClick={add}>
          Add
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setQuestions(DEFAULT_PROFILE_QUESTIONS)}
        className="self-start text-[12px] font-semibold"
        style={{ color: 'var(--color-eol-accent-label)' }}
      >
        Reset to defaults
      </button>

      {error && (
        <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
          {error}
        </p>
      )}

      <Button onClick={() => onSave(questions.map((q) => ({ ...q, prompt: q.prompt.trim() })))} loading={saving} disabled={!dirty || hasBlank}>
        Save questions
      </Button>
    </div>
  )
}
