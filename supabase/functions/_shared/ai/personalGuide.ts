// The shape of a personal friction discussion guide, and the code that
// guarantees its framework. Pure TypeScript with no Deno APIs so it can be
// unit-tested from the Vite side (src/lib/personalGuide.test.ts) and imported
// by provider.ts and the client.
//
// The five steps, their order, and their titles live here, not in the model's
// hands: the model only fills in guidance and example lines for each one, and
// anything it skips, shuffles, or invents is corrected by normalizePersonalGuide.

export type PersonalGuideStepId = 'share' | 'reflect_back' | 'their_turn' | 'common_ground' | 'resolution'

export type PersonalGuideStep = {
  id: PersonalGuideStepId
  title: string
  guidance: string
  prompts: string[]
}

export type PersonalDiscussionGuide = {
  summary: string
  opener: string
  steps: PersonalGuideStep[]
}

export const PERSONAL_GUIDE_STEPS: { id: PersonalGuideStepId; title: string; fallbackGuidance: string }[] = [
  {
    id: 'share',
    title: 'Share your point of view',
    fallbackGuidance: 'Say what is going on for you, one point at a time, and stay with what you experienced and what you need.',
  },
  {
    id: 'reflect_back',
    title: 'Ask them to listen and reflect back',
    fallbackGuidance: 'Ask them to say back what they heard, without agreeing or arguing yet. Tell them what matches and add anything that is missing.',
  },
  {
    id: 'their_turn',
    title: 'Let them share their point of view',
    fallbackGuidance: 'Now it is their turn. Listen. When they finish, say back what you heard before you respond.',
  },
  {
    id: 'common_ground',
    title: 'Find common ground',
    fallbackGuidance: 'Look for what you both want, what you both care about, and where your views overlap.',
  },
  {
    id: 'resolution',
    title: 'Find a resolution',
    fallbackGuidance: 'Pick one or two concrete next steps you can both say yes to, and decide when you will check back in.',
  },
]

const MAX_PROMPTS_PER_STEP = 5

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

// Accepts whatever the model returned (an object that may be missing steps,
// reorder them, repeat them, or add ones we don't know) and returns the guide
// the app will store and show: all five steps, in order, with our titles.
export function normalizePersonalGuide(raw: unknown): PersonalDiscussionGuide {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as { summary?: unknown; opener?: unknown; steps?: unknown }
  const modelSteps = Array.isArray(obj.steps) ? obj.steps : []

  const steps = PERSONAL_GUIDE_STEPS.map((def): PersonalGuideStep => {
    const match = modelSteps.find((s) => s && typeof s === 'object' && (s as { id?: unknown }).id === def.id) as { guidance?: unknown; prompts?: unknown } | undefined
    const prompts = (Array.isArray(match?.prompts) ? match.prompts : [])
      .map(cleanText)
      .filter(Boolean)
      .slice(0, MAX_PROMPTS_PER_STEP)
    return { id: def.id, title: def.title, guidance: cleanText(match?.guidance) || def.fallbackGuidance, prompts }
  })

  return { summary: cleanText(obj.summary), opener: cleanText(obj.opener), steps }
}

// Plain text for the Copy button: readable pasted into a note, an email, or a
// calendar invite.
export function formatPersonalGuideAsText(guide: PersonalDiscussionGuide): string {
  const lines: string[] = []
  if (guide.summary) lines.push(guide.summary, '')
  if (guide.opener) lines.push('To ask for the conversation:', `"${guide.opener}"`, '')
  guide.steps.forEach((step, i) => {
    lines.push(`${i + 1}. ${step.title}`, step.guidance)
    step.prompts.forEach((p) => lines.push(`   - ${p}`))
    lines.push('')
  })
  return lines.join('\n').trim()
}
