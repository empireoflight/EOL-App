// The grounding moment shown before the vision questionnaire. The facilitator
// writes only the prompt (stored on the session's framing, like the question
// list); the surrounding guidance — get comfortable, feet on the floor, slow
// breaths — is fixed and shown whatever the prompt says.
export const DEFAULT_MEDITATION_PROMPT = 'Take a moment to imagine your favorite holiday memory.'

export const MEDITATION_STEPS = [
  'Get comfortable. Lie down, or sit and close your eyes.',
  'Put your feet flat on the floor.',
  'Take a few slow, deep breaths.',
]

// undefined (a session created before this existed, or one that never set
// it) gets the default; an empty prompt is how a facilitator turns the
// meditation off for a session.
export function resolveMeditationPrompt(framing: { meditationPrompt?: string | null } | undefined): string | null {
  if (!framing || framing.meditationPrompt === undefined) return DEFAULT_MEDITATION_PROMPT
  return framing.meditationPrompt?.trim() || null
}
