import { describe, expect, it } from 'vitest'
import { formatPersonalGuideAsText, normalizePersonalGuide, PERSONAL_GUIDE_STEPS } from '../../supabase/functions/_shared/ai/personalGuide'

const IDS = ['share', 'reflect_back', 'their_turn', 'common_ground', 'resolution']

describe('normalizePersonalGuide', () => {
  it('always returns the five steps, in order, with our titles', () => {
    const guide = normalizePersonalGuide({ summary: 's', opener: 'o', steps: [] })
    expect(guide.steps.map((s) => s.id)).toEqual(IDS)
    expect(guide.steps.map((s) => s.title)).toEqual(PERSONAL_GUIDE_STEPS.map((s) => s.title))
  })

  it('puts shuffled steps back in order and ignores ones we do not know', () => {
    const guide = normalizePersonalGuide({
      summary: 's',
      opener: 'o',
      steps: [
        { id: 'resolution', guidance: 'R', prompts: ['r1'] },
        { id: 'made_up', guidance: 'X', prompts: ['x'] },
        { id: 'share', guidance: 'S', prompts: ['s1', 's2'] },
      ],
    })
    expect(guide.steps.map((s) => s.id)).toEqual(IDS)
    expect(guide.steps[0]).toMatchObject({ guidance: 'S', prompts: ['s1', 's2'] })
    expect(guide.steps[4]).toMatchObject({ guidance: 'R', prompts: ['r1'] })
    expect(JSON.stringify(guide)).not.toContain('made_up')
  })

  it('fills a missing step with safe default guidance and no prompts', () => {
    const guide = normalizePersonalGuide({ steps: [{ id: 'share', guidance: 'S', prompts: ['a'] }] })
    const missing = guide.steps.find((s) => s.id === 'common_ground')
    expect(missing?.guidance).toBe(PERSONAL_GUIDE_STEPS.find((s) => s.id === 'common_ground')?.fallbackGuidance)
    expect(missing?.prompts).toEqual([])
  })

  it('trims text, drops non-strings and blanks, and caps prompts per step', () => {
    const guide = normalizePersonalGuide({
      summary: '  hello  ',
      opener: 42,
      steps: [{ id: 'share', guidance: '  g  ', prompts: [' a ', '', null, 5, 'b', 'c', 'd', 'e', 'f', 'g'] }],
    })
    expect(guide.summary).toBe('hello')
    expect(guide.opener).toBe('')
    expect(guide.steps[0].guidance).toBe('g')
    expect(guide.steps[0].prompts).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it.each([null, undefined, 'a string', 7, []])('survives garbage input: %s', (raw) => {
    const guide = normalizePersonalGuide(raw)
    expect(guide.steps).toHaveLength(5)
    expect(guide.summary).toBe('')
  })
})

describe('formatPersonalGuideAsText', () => {
  it('numbers the steps and lists the example lines', () => {
    const text = formatPersonalGuideAsText(
      normalizePersonalGuide({ summary: 'Sum.', opener: 'Can we talk?', steps: [{ id: 'share', guidance: 'Say it.', prompts: ['I felt left out.'] }] })
    )
    expect(text).toContain('Sum.')
    expect(text).toContain('"Can we talk?"')
    expect(text).toContain('1. Share your point of view')
    expect(text).toContain('   - I felt left out.')
    expect(text).toContain('5. Find a resolution')
  })

  it('leaves out an empty summary and opener', () => {
    const text = formatPersonalGuideAsText(normalizePersonalGuide({}))
    expect(text.startsWith('1. Share your point of view')).toBe(true)
    expect(text).not.toContain('To ask for the conversation')
  })
})
