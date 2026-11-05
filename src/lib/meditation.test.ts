import { describe, expect, it } from 'vitest'
import { DEFAULT_MEDITATION_PROMPT, resolveMeditationPrompt } from './meditation'
import { pickPendingVisionPath } from './postLogin'

describe('resolveMeditationPrompt', () => {
  it('uses the default when the session never set one', () => {
    expect(resolveMeditationPrompt(undefined)).toBe(DEFAULT_MEDITATION_PROMPT)
    expect(resolveMeditationPrompt({})).toBe(DEFAULT_MEDITATION_PROMPT)
  })

  it("uses the facilitator's prompt, trimmed", () => {
    expect(resolveMeditationPrompt({ meditationPrompt: '  Picture a quiet morning.  ' })).toBe('Picture a quiet morning.')
  })

  it('treats an empty or blank prompt as "skip the meditation"', () => {
    expect(resolveMeditationPrompt({ meditationPrompt: '' })).toBeNull()
    expect(resolveMeditationPrompt({ meditationPrompt: '   ' })).toBeNull()
    expect(resolveMeditationPrompt({ meditationPrompt: null })).toBeNull()
  })
})

describe('pickPendingVisionPath', () => {
  const row = (id: string, team_id: string, status: string, created_at: string, session_type = 'vision') => ({
    session_id: id,
    convergence_sessions: { id, team_id, session_type, status, created_at },
  })

  it('returns null when nothing is pending', () => {
    expect(pickPendingVisionPath([])).toBeNull()
  })

  it('goes to the reflect page of a vision session that is still collecting', () => {
    expect(pickPendingVisionPath([row('s1', 't1', 'collecting', '2026-10-01')])).toBe('/teams/t1/vision/sessions/s1/reflect')
  })

  it('ignores friction sessions and sessions past the collecting stage', () => {
    expect(
      pickPendingVisionPath([row('f1', 't1', 'collecting', '2026-10-01', 'friction'), row('g1', 't1', 'guide_ready', '2026-10-02'), row('c1', 't1', 'closed', '2026-10-03')])
    ).toBeNull()
  })

  it('picks the session that has been waiting longest', () => {
    expect(pickPendingVisionPath([row('new', 't2', 'collecting', '2026-10-20'), row('old', 't1', 'collecting', '2026-10-05')])).toBe('/teams/t1/vision/sessions/old/reflect')
  })

  it('tolerates a participant row whose session is not visible', () => {
    expect(pickPendingVisionPath([{ session_id: 'x', convergence_sessions: null }])).toBeNull()
  })
})
