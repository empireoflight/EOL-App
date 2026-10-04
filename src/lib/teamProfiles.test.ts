import { describe, expect, it } from 'vitest'
import { bestMatchIds, DEFAULT_PROFILE_QUESTIONS, isProfileComplete, orderProfiles, resolveProfileQuestions } from './teamProfiles'
import type { ProfileQuestion } from './types'

const profile = (user_id: string, updated_at: string, answers: Record<string, string> = {}) => ({ user_id, updated_at, answers })

describe('resolveProfileQuestions', () => {
  it('falls back to the defaults only when nothing was saved', () => {
    expect(resolveProfileQuestions(undefined)).toBe(DEFAULT_PROFILE_QUESTIONS)
    expect(resolveProfileQuestions(null)).toBe(DEFAULT_PROFILE_QUESTIONS)
  })

  it('respects a saved empty list (name + photo only)', () => {
    expect(resolveProfileQuestions([])).toEqual([])
  })

  it('ships well-formed defaults: unique ids, at least one offer and one seek', () => {
    const ids = DEFAULT_PROFILE_QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(DEFAULT_PROFILE_QUESTIONS.some((q) => q.kind === 'offer')).toBe(true)
    expect(DEFAULT_PROFILE_QUESTIONS.some((q) => q.kind === 'seek')).toBe(true)
  })
})

describe('isProfileComplete', () => {
  const questions: ProfileQuestion[] = [
    { id: 'a', prompt: 'A', kind: 'about' },
    { id: 'b', prompt: 'B', kind: 'offer', optional: true },
  ]

  it('is false with no profile row', () => {
    expect(isProfileComplete(undefined, questions)).toBe(false)
  })

  it('requires every non-optional question, ignoring whitespace-only answers', () => {
    expect(isProfileComplete({ answers: { a: '  ' } }, questions)).toBe(false)
    expect(isProfileComplete({ answers: { a: 'hi' } }, questions)).toBe(true)
  })

  it('counts a saved row as complete when there are no required questions', () => {
    expect(isProfileComplete({ answers: {} }, [])).toBe(true)
  })
})

describe('orderProfiles', () => {
  const profiles = [
    profile('old', '2026-09-01'),
    profile('me', '2026-09-02'),
    profile('mid', '2026-09-03'),
    profile('new', '2026-09-04'),
    profile('best', '2026-09-05'),
  ]

  it('puts the viewer first, then by score, then unscored by most recently updated', () => {
    const matches = new Map([
      ['best', { score: 90 }],
      ['mid', { score: 40 }],
    ])
    expect(orderProfiles(profiles, 'me', matches).map((p) => p.user_id)).toEqual(['me', 'best', 'mid', 'new', 'old'])
  })

  it('keeps input order between profiles with identical timestamps', () => {
    const tied = [profile('x', '2026-09-01'), profile('y', '2026-09-01'), profile('z', '2026-09-01')]
    expect(orderProfiles(tied, undefined, new Map()).map((p) => p.user_id)).toEqual(['x', 'y', 'z'])
  })

  it('falls back to recency when there are no matches yet', () => {
    expect(orderProfiles(profiles, 'me', new Map()).map((p) => p.user_id)).toEqual(['me', 'best', 'new', 'mid', 'old'])
  })
})

describe('bestMatchIds', () => {
  const ordered = [{ user_id: 'me' }, { user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }, { user_id: 'd' }, { user_id: 'e' }]

  it('caps at three and applies a score floor', () => {
    const matches = new Map([
      ['a', { score: 95 }],
      ['b', { score: 80 }],
      ['c', { score: 70 }],
      ['d', { score: 66 }],
      ['e', { score: 30 }],
    ])
    expect([...bestMatchIds(ordered, 'me', matches)]).toEqual(['a', 'b', 'c'])
  })

  it('returns nothing when no one clears the floor', () => {
    expect(bestMatchIds(ordered, 'me', new Map([['a', { score: 50 }]])).size).toBe(0)
  })
})
