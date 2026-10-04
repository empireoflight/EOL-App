import type { ProfileQuestion, ProfileQuestionKind, TeamProfile, TeamProfileMatch } from './types'

export const KIND_LABELS: Record<ProfileQuestionKind, string> = {
  about: 'Getting to know you',
  interest: 'Shared interest',
  offer: 'Something I can offer',
  seek: "Something I'm looking for",
}

// Shown under a question while answering, so people know why a thoughtful
// answer pays off — the kind drives how matching uses it.
export const KIND_HINTS: Record<ProfileQuestionKind, string | null> = {
  about: null,
  interest: 'Helps your team find people who share this.',
  offer: 'Helps suggest teammates who could use this.',
  seek: 'Helps suggest teammates who might be able to help.',
}

// Pre-tagged so matching works out of the box: interests/about-you prompts
// for common ground, and offer + seek questions for the "their offer meets
// my need" side of complementary.
export const DEFAULT_PROFILE_QUESTIONS: ProfileQuestion[] = [
  { id: 'obsession', prompt: 'What are you currently obsessed with?', kind: 'interest' },
  { id: 'hidden_hobby', prompt: "What's a hobby or talent most people don't know you have?", kind: 'about', optional: true },
  { id: 'local_spot', prompt: "What's your favorite local spot, and why?", kind: 'interest', optional: true },
  { id: 'want_more', prompt: "What's something you'd love more of in your life or your village right now?", kind: 'seek' },
  { id: 'need_help', prompt: "What's something you could use help with?", kind: 'seek' },
  { id: 'offer', prompt: "What's something you'd be happy to offer or share?", kind: 'offer' },
]

// A saved row (even an empty list — a facilitator may want name + photo
// only) always wins; the built-in list only covers teams that never
// customized anything.
export function resolveProfileQuestions(saved: ProfileQuestion[] | null | undefined): ProfileQuestion[] {
  return saved ?? DEFAULT_PROFILE_QUESTIONS
}

export function hasAnswer(answers: Record<string, string> | undefined, questionId: string): boolean {
  return !!answers?.[questionId]?.trim()
}

// A profile appears on the board once it exists and every required question
// has an answer. With no required questions, simply saving it is enough.
export function isProfileComplete(profile: Pick<TeamProfile, 'answers'> | undefined, questions: ProfileQuestion[]): boolean {
  if (!profile) return false
  return questions.every((q) => q.optional || hasAnswer(profile.answers, q.id))
}

export function hasAnyAnswer(profile: Pick<TeamProfile, 'answers'> | undefined): boolean {
  return !!profile && Object.values(profile.answers).some((a) => a?.trim())
}

// Viewer's own card first, then everyone else by match score (best first),
// then anyone without a score yet by most recently updated — so the board
// is already sensible before the first match computation lands.
export function orderProfiles<T extends Pick<TeamProfile, 'user_id' | 'updated_at'>>(
  profiles: T[],
  viewerId: string | undefined,
  matches: Map<string, Pick<TeamProfileMatch, 'score'>>
): T[] {
  const rank = (p: T) => (p.user_id === viewerId ? 0 : matches.has(p.user_id) ? 1 : 2)
  return [...profiles].sort((a, b) => {
    const byRank = rank(a) - rank(b)
    if (byRank !== 0) return byRank
    if (rank(a) === 1) return (matches.get(b.user_id)?.score ?? 0) - (matches.get(a.user_id)?.score ?? 0)
    // Equal timestamps (profiles saved in one batch) must compare as equal,
    // not "a before b" both ways, or the order is arbitrary between renders.
    return a.updated_at === b.updated_at ? 0 : a.updated_at < b.updated_at ? 1 : -1
  })
}

export const BEST_MATCH_MIN_SCORE = 65
export const BEST_MATCH_COUNT = 3

// The few strongest matches get called out visually; a lukewarm top result
// isn't a "best match", so there's a floor as well as a cap.
export function bestMatchIds(ordered: Pick<TeamProfile, 'user_id'>[], viewerId: string | undefined, matches: Map<string, Pick<TeamProfileMatch, 'score'>>): Set<string> {
  return new Set(
    ordered
      .filter((p) => p.user_id !== viewerId && (matches.get(p.user_id)?.score ?? 0) >= BEST_MATCH_MIN_SCORE)
      .slice(0, BEST_MATCH_COUNT)
      .map((p) => p.user_id)
  )
}
