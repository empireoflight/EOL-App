import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Button } from '../shared/Button'
import { Textarea } from '../shared/Input'

type LearningPromptProps = {
  experimentId: string
  learning: string | null
  autoOpen: boolean
  onSaved: () => void
}

// Shown on any 'done' experiment, on both the Do tab and the vibe check's
// task review. `autoOpen` is true right after a live status change to
// 'done' so the prompt appears in the moment; otherwise it collapses to a
// small link so already-done items don't nag on every visit.
export function LearningPrompt({ experimentId, learning, autoOpen, onSaved }: LearningPromptProps) {
  const [open, setOpen] = useState(autoOpen)
  const [text, setText] = useState(learning ?? '')

  const save = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Not ready')
      const { error } = await supabase.from('experiments').update({ learning: text.trim() || null }).eq('id', experimentId)
      if (error) throw error
    },
    onSuccess: () => {
      setOpen(false)
      onSaved()
    },
  })

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-[11.5px] font-medium"
        style={{ color: learning ? 'var(--color-eol-text-secondary)' : 'var(--color-eol-accent-label)' }}
      >
        {learning ? `What we learned: ${learning}` : '+ What did we learn?'}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What did we learn from this?"
        className="!min-h-0"
        rows={2}
      />
      <div className="flex gap-2">
        <Button onClick={() => save.mutate()} loading={save.isPending}>
          Save
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Skip
        </Button>
      </div>
    </div>
  )
}
