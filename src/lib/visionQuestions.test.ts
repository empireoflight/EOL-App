import { describe, expect, it } from 'vitest'
import { getVisionQuestions, resolveVisionQuestions } from './visionQuestions'

const arrivalPrompts = (horizon: string | null | undefined) =>
  getVisionQuestions(horizon)
    .filter((q) => q.id === 'arrival_notice' || q.id === 'arrival_feel')
    .map((q) => q.prompt)

describe('getVisionQuestions', () => {
  it('anchors the arrival questions to the chosen horizon', () => {
    const prompts = arrivalPrompts('18 months')
    expect(prompts).toHaveLength(2)
    expect(prompts.every((p) => p.includes('18 months from now'))).toBe(true)
  })

  it('treats undefined as the old default of 12 months', () => {
    expect(arrivalPrompts(undefined).every((p) => p.includes('12 months from now'))).toBe(true)
  })

  it('drops every time reference when there is no horizon', () => {
    for (const none of [null, '']) {
      const prompts = arrivalPrompts(none)
      expect(prompts).toHaveLength(2)
      expect(prompts.some((p) => /from now|months|years/i.test(p))).toBe(false)
    }
  })

  it('keeps the same question ids and count either way', () => {
    expect(getVisionQuestions(null).map((q) => q.id)).toEqual(getVisionQuestions('6 months').map((q) => q.id))
  })
})

describe('resolveVisionQuestions', () => {
  it('uses the session\'s saved questions when present', () => {
    const saved = [{ id: 'x', prompt: 'Custom?' }]
    expect(resolveVisionQuestions({ horizon: null, questions: saved })).toBe(saved)
  })

  it('falls back to horizon-free defaults for a session with no horizon and no saved questions', () => {
    const q = resolveVisionQuestions({ horizon: null })
    expect(q.some((x) => /from now/i.test(x.prompt))).toBe(false)
  })

  it('falls back to the 12-month defaults for a session that predates the setting', () => {
    expect(resolveVisionQuestions({}).find((x) => x.id === 'arrival_notice')?.prompt).toContain('12 months from now')
  })
})
