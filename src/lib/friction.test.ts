import { describe, expect, it } from 'vitest'
import { authoredAnswerRows, FRICTION_AUTHORED_QUESTIONS, FRICTION_QUESTIONS, FRICTION_STAGES, frictionQuestionsForStage } from './frictionQuestions'
import { filterMoments, findMoment, GROUNDING_MOMENTS } from './groundingMoments'

describe('friction stages', () => {
  it('runs Ground, Reflect, Relate', () => {
    expect(FRICTION_STAGES.map((s) => s.label)).toEqual(['Ground', 'Reflect', 'Relate'])
    expect(FRICTION_STAGES.map((s) => s.id)).toEqual(['ground', 'reflect', 'relate'])
  })

  it('puts ownership and appreciation in the Relate stage', () => {
    expect(frictionQuestionsForStage('relate').map((q) => q.id)).toEqual(['ownership', 'appreciation'])
  })

  it('asks about the other people involved, the same way for two people or a team', () => {
    const q = FRICTION_QUESTIONS.find((x) => x.id === 'appreciation')
    expect(q?.prompt.two_person).toBe('What do you genuinely appreciate about the other people involved?')
    expect(q?.prompt.team).toBe(q?.prompt.two_person)
  })

  it('gives every stage at least one question', () => {
    for (const stage of FRICTION_STAGES) expect(frictionQuestionsForStage(stage.id).length).toBeGreaterThan(0)
  })
})

describe('grounding moments', () => {
  it('lists them in the intended order, friction aside', () => {
    expect(GROUNDING_MOMENTS.map((m) => m.id)).toEqual([
      'breathing',
      'dance-moment',
      'free-form-art',
      'forest-bathing',
      'walk-no-goal',
      'silent-minute',
      'guided-meditation',
      'shake-it-off',
      'binaural-beats',
    ])
  })

  it('has unique ids', () => {
    const ids = GROUNDING_MOMENTS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses the new copy for binaural beats and the dance moment', () => {
    expect(findMoment('binaural-beats')?.blurb).toBe('Headphones on. Rest or work while you listen.')
    expect(findMoment('dance-moment')?.blurb).toBe('Put on a song you love and dance it out')
  })

  it('treats the dance moment as untimed', () => {
    const dance = findMoment('dance-moment')
    expect(dance?.durationSec).toBeNull()
    expect(dance?.shell).toBe('untimed-dark')
  })

  it('keeps untimed moments out of the time filters but in "any time"', () => {
    const ids = (f: Parameters<typeof filterMoments>[1]) => filterMoments(GROUNDING_MOMENTS, f).map((m) => m.id)
    expect(ids('any')).toHaveLength(GROUNDING_MOMENTS.length)
    expect(ids('1min')).toEqual(['silent-minute', 'shake-it-off'])
    expect(ids('5min')).not.toContain('dance-moment')
    expect(ids('outside')).toEqual(['forest-bathing', 'walk-no-goal'])
  })
})

describe('point-of-view questions', () => {
  it('asks what you need first, with a hint to keep it to I statements', () => {
    expect(FRICTION_AUTHORED_QUESTIONS.map((q) => q.id)).toEqual(['needs', 'hopes', 'what_matters'])
    expect(FRICTION_AUTHORED_QUESTIONS[0].prompt).toBe('What do you desire or need in this situation? Why is that important to you?')
    expect(FRICTION_AUTHORED_QUESTIONS[0].hint).toBe('Keep this focused on your needs. I statements are best.')
  })

  it('shows current answers under the current questions, in order', () => {
    const rows = authoredAnswerRows({ needs: 'I need clear handoffs.', hopes: 'Calm.', what_matters: 'Trust.' })
    expect(rows.map((r) => r.id)).toEqual(['needs', 'hopes', 'what_matters'])
    expect(rows[0].prompt).toBe(FRICTION_AUTHORED_QUESTIONS[0].prompt)
  })

  it('keeps an answer saved before the change under the question it was actually asked', () => {
    const rows = authoredAnswerRows({ problem_summary: 'Decisions get remade.', hopes: 'Clarity.', what_matters: 'Speed.' })
    expect(rows[0]).toEqual({ id: 'problem_summary', prompt: 'How would you summarize the problem for your discussion?', answer: 'Decisions get remade.' })
  })

  it('skips blank or missing answers', () => {
    expect(authoredAnswerRows({ needs: '  ', problem_summary: null, hopes: 'Clarity.', what_matters: '' }).map((r) => r.id)).toEqual(['hopes'])
  })
})
