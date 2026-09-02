import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../shared/Button'

// Only ever rendered while the topic is still unset (see call sites in
// FrictionMitigatorPage/FrictionRespondPage) — that's the exact window
// RLS's "Initiators can cancel a friction session before it's shared"
// policy allows a delete in, since nobody else has been notified yet.
export function CancelFrictionSessionButton({ teamId, sessionId }: { teamId: string; sessionId: string }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [error, setError] = useState('')

  const handleCancel = async () => {
    if (!supabase) return
    setCanceling(true)
    setError('')
    try {
      const { error: deleteError } = await supabase.from('convergence_sessions').delete().eq('id', sessionId)
      if (deleteError) throw deleteError
      navigate(`/teams/${teamId}/friction`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't cancel this session.")
      setCanceling(false)
    }
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-center text-[12px]" style={{ color: 'var(--color-eol-text-faint)' }}>
        Cancel this session
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border px-3.5 py-3" style={{ borderColor: 'var(--color-eol-pink)' }}>
      <p className="m-0 text-[12.5px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
        Cancel this session? Nobody's been notified yet, and this can't be undone.
      </p>
      {error && (
        <p className="m-0 text-[12px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => void handleCancel()} loading={canceling} className="flex-1">
          Yes, cancel
        </Button>
        <Button variant="secondary" onClick={() => setConfirming(false)} className="flex-1">
          No, keep going
        </Button>
      </div>
    </div>
  )
}
