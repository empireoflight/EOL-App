// Friction session questions (spec §16). Sequence matters and must not be
// reordered: Q1-6 move event -> somatic -> emotional -> cognitive -> need ->
// ownership; Q7 (appreciation) immediately precedes the shared phase so the
// participant softens before they author something shared.
//
// Q1-7 are tier 0 — rendered by FrictionMitigatorPage via useDurableForm's
// local-only path, never sent to the server. Q8-10 are tier 4, authored
// knowing they'll be shared, submitted by FrictionRespondPage.

export type FrictionVariant = 'two_person' | 'team'

export type FrictionStage = 'ground' | 'reflect' | 'clarify_needs'

export type FrictionQuestion = {
  id: string
  stage: FrictionStage
  prompt: Record<FrictionVariant, string>
}

export const FRICTION_STAGES: { id: FrictionStage; label: string }[] = [
  { id: 'ground', label: 'Ground' },
  { id: 'reflect', label: 'Reflect' },
  { id: 'clarify_needs', label: 'Clarify needs' },
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
    stage: 'clarify_needs',
    prompt: {
      two_person: 'What are you willing to take responsibility for?',
      team: 'What are you willing to take responsibility for?',
    },
  },
  {
    id: 'appreciation',
    stage: 'clarify_needs',
    prompt: {
      two_person: 'What do you genuinely appreciate about this person?',
      team: 'What do you genuinely appreciate about the people involved?',
    },
  },
]

export function frictionQuestionsForStage(stage: FrictionStage): FrictionQuestion[] {
  return FRICTION_QUESTIONS.filter((q) => q.stage === stage)
}

// Q8-10, tier 4 — authored, shared verbatim (spec §16). One variant; these
// are written knowing exactly who will read them either way.
export const FRICTION_AUTHORED_QUESTIONS: { id: 'problem_summary' | 'hopes' | 'what_matters'; prompt: string }[] = [
  { id: 'problem_summary', prompt: 'How would you summarize the problem for your discussion?' },
  { id: 'hopes', prompt: 'What do you hope this conversation creates?' },
  { id: 'what_matters', prompt: 'What matters most to you moving forward?' },
]
