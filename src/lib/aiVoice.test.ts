import { describe, expect, it } from 'vitest'
import { findAiSpeak, VISION_VOICE_RULES } from '../../supabase/functions/_shared/ai/voice'

describe('findAiSpeak', () => {
  it.each([
    ['A desire not just for playdates but for mutual cultural exchange.', 'not just'],
    ["It isn't a program, it's a family.", "isn't a program, it's"],
    ['This is not about a schedule, but about showing up.', 'not about a schedule'],
    ['Something recurring and low-pressure rather than a one-off event.', 'rather than'],
    ['Naming what went wrong out loud instead of letting it fester.', 'instead of'],
    ['It feels less like a place we live and more like a place we belong.', 'less like'],
    ["It's more than a group chat, it's a lifeline.", 'more than'],
    ['A multi-night-a-week ecosystem with big gatherings.', 'ecosystem'],
    ['Kids woven into the fabric of the whole thing.', 'fabric of'],
    ['A journey toward a more vibrant neighborhood.', 'journey'],
    ['Room for kids, not around them.', ', not around them'],
    ['Kids folded into it, not off to the side.', ', not off to the side'],
  ])('flags: %s', (text, expected) => {
    const hits = findAiSpeak(text)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.join(' | ').toLowerCase()).toContain(expected.toLowerCase())
  })

  it.each([
    'A village where asking for help is as normal as asking for the salt.',
    'Kids running between three backyards while the parents sit on a porch with too much food.',
    'A standing Tuesday dinner. You show up if you can.',
    'Newcomers feel at home on the first visit.',
    'Most people want something small and regular.',
  ])('leaves plain, specific writing alone: %s', (text) => {
    expect(findAiSpeak(text)).toEqual([])
  })

  it("ignores the team's own words when they're quoted back", () => {
    expect(findAiSpeak('Several people say they want “less a place we live and more a place we belong” to be true here.')).toEqual([])
    expect(findAiSpeak('One answer asks for "not just events, but friends".')).toEqual([])
  })

  it('returns each snippet once, trimmed short', () => {
    const hits = findAiSpeak('Not just meals, not just walks, not just games, and none of it a journey. A journey.')
    expect(new Set(hits).size).toBe(hits.length)
    expect(hits.every((h) => h.length <= 70)).toBe(true)
  })
})

describe('VISION_VOICE_RULES', () => {
  it('bans the contrast construction by name and asks for the team’s own words', () => {
    expect(VISION_VOICE_RULES).toContain('not X, but Y')
    expect(VISION_VOICE_RULES).toMatch(/own language/i)
  })
})
