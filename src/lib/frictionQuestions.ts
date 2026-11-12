// Friction session questions (spec §16). Sequence matters and must not be
// reordered: Q1-6 move event -> somatic -> emotional -> cognitive -> need ->
// ownership; Q7 (appreciation) immediately precedes the shared phase so the
// participant softens before they author something shared.
//
// Q1-7 are tier 0 — rendered by FrictionMitigatorPage via useDurableForm's
// local-only path, never sent to the server. Q8-10 are tier 4, authored
// knowing they'll be shared, submitted by FrictionRespondPage.

export type FrictionVariant = 'two_person' | 'team'

export type FrictionStage = 'ground' | 'reflect' | 'relate'

export type FrictionQuestion = {
  id: string
  stage: FrictionStage
  prompt: Record<FrictionVariant, string>
}

export const FRICTION_STAGES: { id: FrictionStage; label: string }[] = [
  { id: 'ground', label: 'Ground' },
  { id: 'reflect', label: 'Reflect' },
  { id: 'relate', label: 'Relate' },
]

export const FRICTION_QUESTIONS: FrictionQuestion[] = [
  {
    id: 'event',
    stage: 'ground',
    prompt: {
      two_person: 'What happened from your perspective?',
      team: 'What happened from your perspective?',
    },
  },
  {
    id: 'somatic',
    stage: 'ground',
    prompt: {
      two_person: 'What do you feel in your body right now? (close your eyes, notice tightness, knots, energy)',
      team: 'What do you feel in your body right now? (close your eyes, notice tightness, knots, energy)',
    },
  },
  {
    id: 'emotions',
    stage: 'reflect',
    prompt: {
      two_person: 'What emotions are coming up for you?',
      team: 'What emotions are coming up for you?',
    },
  },
  {
    id: 'story',
    stage: 'reflect',
    prompt: {
      two_person: 'What story or assumptions are you holding about this situation?',
      team: 'What story or assumptions are you holding about this situation?',
    },
  },
  {
    id: 'need',
    stage: 'reflect',
    prompt: {
      two_person: 'What do you actually need here?',
      team: 'What do you actually need here?',
    },
  },
  {
    id: 'ownership',
    stage: 'relate',
    prompt: {
      two_person: 'What are you willing to take responsibility for?',
      team: 'What are you willing to take responsibility for?',
    },
  },
  {
    id: 'appreciation',
    stage: 'relate',
    prompt: {
      two_person: 'What do you genuinely appreciate about the other people involved?',
      team: 'What do you genuinely appreciate about the other people involved?',
    },
  },
]

export function frictionQuestionsForStage(stage: FrictionStage): FrictionQuestion[] {
  return FRICTION_QUESTIONS.filter((q) => q.stage === stage)
}

// Q8-10, tier 4 — authored, shared verbatim (spec §16). One variant; these
// are written knowing exactly who will read them either way.
export const FRICTION_AUTHORED_QUESTIONS: { id: 'needs' | 'hopes' | 'what_matters'; prompt: string; hint?: string }[] = [
  {
    id: 'needs',
    prompt: 'What do you desire or need in this situation? Why is that important to you?',
    hint: 'Keep this focused on your needs. I statements are best.',
  },
  { id: 'hopes', prompt: 'What do you hope this conversation creates?' },
  { id: 'what_matters', prompt: 'What matters most to you moving forward?' },
]

// Before "needs" existed, the first authored question was this one, and
// responses saved then still hold their answer under `problem_summary`. They
// keep being shown under the question they were actually asked.
const LEGACY_FIRST_QUESTION = 'How would you summarize the problem for your discussion?'

export type AuthoredAnswers = { needs?: string | null; problem_summary?: string | null; hopes?: string | null; what_matters?: string | null }

// The answers worth showing for one saved response, in order, each paired with
// the prompt it answered. Works for shared friction responses and for saved
// personal guides, new shape or old.
export function authoredAnswerRows(answers: AuthoredAnswers): { id: string; prompt: string; answer: string }[] {
  const rows: { id: string; prompt: string; answer: string | null | undefined }[] = [
    answers.needs
      ? { id: 'needs', prompt: FRICTION_AUTHORED_QUESTIONS[0].prompt, answer: answers.needs }
      : { id: 'problem_summary', prompt: LEGACY_FIRST_QUESTION, answer: answers.problem_summary },
    { id: 'hopes', prompt: FRICTION_AUTHORED_QUESTIONS[1].prompt, answer: answers.hopes },
    { id: 'what_matters', prompt: FRICTION_AUTHORED_QUESTIONS[2].prompt, answer: answers.what_matters },
  ]
  return rows.filter((r): r is { id: string; prompt: string; answer: string } => !!r.answer?.trim())
}
