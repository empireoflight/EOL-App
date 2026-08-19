// AI provider abstraction (spec §15).
//
// Every AI call in Empire of Light goes through this module — never the
// Anthropic API directly from application code. This is what keeps a future
// backend swap (a fine-tuned classifier, a self-hosted model) a change
// inside one function instead of a search-and-replace across the codebase.
//
// This file runs ONLY in Edge Functions (Deno). It reads ANTHROPIC_API_KEY
// from the server-side environment and must never be imported from `src/` —
// bundling it into the Vite client would ship the key to the browser.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

// Per spec §4: Sonnet for synthesis/vision-layout (reasoning + output quality
// matter), a smaller/faster model for high-volume, low-reasoning tagging.
// Centralized here so a model swap is a one-line change.
const MODELS = {
  synthesis: 'claude-sonnet-5',
  classification: 'claude-haiku-4-5-20251001',
  visionLayout: 'claude-sonnet-5',
} as const

type AnthropicMessage = {
  role: 'user' | 'assistant'
  content: string
}

type AnthropicCallOptions = {
  model: string
  system?: string
  messages: AnthropicMessage[]
  maxTokens?: number
}

async function callAnthropic({ model, system, messages, maxTokens = 2048 }: AnthropicCallOptions): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in this Edge Function environment')
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages,
  }

  if (system) {
    // Prompt caching (spec §4) for the shared Reimagine/Do/Unlearn/Evolve
    // framework language and tone guidelines — keeps repeated synthesis
    // calls cheap at scale.
    body.system = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Anthropic API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const textBlock = data.content?.find((block: { type: string }) => block.type === 'text')
  if (!textBlock) {
    throw new Error('Anthropic response contained no text block')
  }
  return textBlock.text as string
}

function parseJsonResponse<T>(raw: string): T {
  // Models sometimes wrap JSON in a fenced code block despite instructions;
  // strip that before parsing rather than making every caller handle it.
  const stripped = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(stripped) as T
}

const FRAMEWORK_SYSTEM_PROMPT = `You write for Empire of Light, a team collaboration tool built around the
Vision -> Do -> Friction -> Evolve adaptive cycle, where Vision is the team's
shared anchor and every other stage should visibly connect back to it.
Friction is treated as information, not failure. Tone: warm, direct,
non-clinical, never corporate or saccharine. You only ever see content the
team or an individual has explicitly chosen to share at this tier — never
raw private material.`

// ------------------------------------------------------------
// synthesizeRollup — weekly pulse synthesis for the Evolve stage. Reads
// only tier-2 free-text notes already gated at n>=3 distinct contributors
// per direction (enforced by the caller, aggregate-weekly-pulse, before
// this function is ever reached) plus tier-3 vibe aggregate and already-
// paraphrased output from prior weeks — never raw, ungated tier-1/2
// content.
//
// PRODUCT-SAFETY RULES baked into the prompt below, not just style
// preference — these are the pulse redesign's actual privacy guarantees,
// enforced by instructing the model, since there's no code-level way to
// stop an LLM from quoting verbatim or naming names once given the text:
//   - paraphrase themes, never quote a response verbatim
//   - never attribute to an individual ("one person is frustrated with…"
//     is forbidden; "several responses mention…" is the required form)
//   - notice, don't diagnose — trendInsight is an invitation to explore,
//     never a verdict ("your team has a collaboration problem" is
//     disallowed phrasing)
// ------------------------------------------------------------
export type TeamSignalInput = {
  source: string
  signalType: string
  value: unknown
  contributorCount: number
}

export type RollupResult = {
  pattern: string
  gaveThemes: string[]
  drainedThemes: string[]
  visionInsight: string | null
  trendInsight: string | null
}

export async function synthesizeRollup(input: {
  teamName: string
  periodLabel: string
  vibeAvg: number | null
  // Only non-empty when that direction's distinct-contributor count
  // already cleared n>=3 — gated per-direction by the caller, same
  // precedent the category system this replaces already established.
  gaveTexts: string[]
  drainedTexts: string[]
  visionContext?: { northStar: string; pillars: string[] }
  // Already-paraphrased output from up to 3 prior weeks — safe to reuse
  // since it's tier-3 output, not raw responses.
  priorPatterns?: { periodLabel: string; pattern: string }[]
  // Computed numerically by the caller from stored vibe_avg values — the
  // model narrates a trend that's already established, it never invents one.
  vibeTrend?: 'declining' | 'improving'
  // Counted numerically by the caller (aggregate-weekly-pulse) from
  // already-team-visible tier-4 data (completed experiments, closed/
  // discussed friction sessions) — facts to work into "pattern", not
  // something the model infers.
  completedTaskCount?: number
  frictionProcessedCount?: number
}): Promise<RollupResult> {
  const raw = await callAnthropic({
    model: MODELS.synthesis,
    system: FRAMEWORK_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content:
          `Team: ${input.teamName}\nPeriod: ${input.periodLabel}\n` +
          (input.vibeAvg !== null ? `Team energy this period (1-5 scale, tier-3 aggregate): ${input.vibeAvg.toFixed(1)}\n` : '') +
          (input.gaveTexts.length
            ? `\nWhat gave people energy this period (tier-2, unattributed, n>=3 contributors):\n` + JSON.stringify(input.gaveTexts, null, 2)
            : '') +
          (input.drainedTexts.length
            ? `\nWhat drained people's energy this period (tier-2, unattributed, n>=3 contributors):\n` + JSON.stringify(input.drainedTexts, null, 2)
            : '') +
          (input.visionContext
            ? `\n\nTeam's committed vision — north star: "${input.visionContext.northStar}". Pillars: ${JSON.stringify(input.visionContext.pillars)}.`
            : '') +
          (input.vibeTrend && input.priorPatterns?.length
            ? `\n\nTeam energy has been numerically ${input.vibeTrend} across the last ${input.priorPatterns.length + 1} periods. ` +
              `Prior periods' already-paraphrased patterns:\n` + JSON.stringify(input.priorPatterns, null, 2)
            : '') +
          (input.completedTaskCount || input.frictionProcessedCount
            ? `\n\nThis period the team also completed ${input.completedTaskCount ?? 0} task(s) and processed ${input.frictionProcessedCount ?? 0} friction session(s) — both tier-4, already team-visible facts, not private data. Worth naming and celebrating in "pattern" when non-zero: completed tasks and processed friction are progress, not something to downplay or treat as failure.`
            : '') +
          `\n\nProduce:\n` +
          `- "pattern": a short paragraph (2-3 sentences) naming what's actually happening this period. Paraphrase and synthesize, never quote a response verbatim. Never attribute a theme to one person ("one person is frustrated with…") — use "several responses mention…" or similar. If task/friction counts were given above and are non-zero, weave them in as things worth celebrating.\n` +
          `- "gaveThemes": 2-4 short paraphrased theme bullets from what gave energy (omit if no gave texts were provided).\n` +
          `- "drainedThemes": 2-4 short paraphrased theme bullets from what drained energy (omit if no drained texts were provided).\n` +
          `- "visionInsight": one sentence tying this period's signals back to the team's vision — alignment or tension worth naming — or null if no vision context was given.\n` +
          `- "trendInsight": ONLY if a numeric trend was given above, one sentence noticing the trend plus recurring themes, phrased as something worth exploring, never a diagnosis — e.g. "Energy has been trending down for three weeks. The recurring themes are unclear decisions and increasing meeting load." NEVER phrase this as a verdict like "your team has a collaboration problem." Otherwise null.\n\n` +
          `Respond as JSON: {"pattern": string, "gaveThemes": string[], "drainedThemes": string[], "visionInsight": string|null, "trendInsight": string|null}. No other text.`,
      },
    ],
  })
  return parseJsonResponse<RollupResult>(raw)
}

// ------------------------------------------------------------
// classifyFriction — high-volume, low-reasoning tagging of friction/sentiment.
// Operates only on content the participant has already chosen to share
// (Phase 2 authored answers) — never Phase 1 ephemeral content (spec §16).
// ------------------------------------------------------------
export type ClassificationResult = {
  theme: string
  sentiment: 'positive' | 'neutral' | 'negative'
  confidence: number
}

export async function classifyFriction(input: { text: string }): Promise<ClassificationResult> {
  const raw = await callAnthropic({
    model: MODELS.classification,
    system: FRAMEWORK_SYSTEM_PROMPT,
    maxTokens: 256,
    messages: [
      {
        role: 'user',
        content:
          `Classify this shared friction-session text.\n\n"${input.text}"\n\n` +
          `Respond as JSON: {"theme": string, "sentiment": "positive"|"neutral"|"negative", "confidence": number between 0 and 1}. No other text.`,
      },
    ],
  })
  return parseJsonResponse<ClassificationResult>(raw)
}

// ------------------------------------------------------------
// generateVisionLayout — structured JSON layout for the vision canvas (§5).
// Nodes/edges only, never prose meant to be read verbatim without editing —
// the whole point is a team co-edits this on the canvas afterward.
// ------------------------------------------------------------
export type VisionNode = {
  id: string
  kind: 'north_star' | 'pillar' | 'practice' | 'signal'
  text: string
  x: number
  y: number
}

export type VisionEdge = {
  from: string
  to: string
}

export type VisionLayout = {
  nodes: VisionNode[]
  edges: VisionEdge[]
}

export async function generateVisionLayout(input: {
  teamName: string
  horizon: string
  // One entry per participant — a team synthesis needs everyone's answers,
  // not one person's, to find the shared north star.
  participantAnswers: Record<string, string>[]
}): Promise<VisionLayout> {
  const raw = await callAnthropic({
    model: MODELS.visionLayout,
    system: FRAMEWORK_SYSTEM_PROMPT,
    // Default 2048 truncates mid-JSON once north_star + pillar + practice +
    // signal nodes are all requested (up to ~14 nodes plus edges).
    maxTokens: 4096,
    messages: [
      {
        role: 'user',
        content:
          `Team: ${input.teamName}\nHorizon: ${input.horizon}\n\n` +
          `Individual vision-session answers, one entry per participant (tier-1, about to be aggregated):\n` +
          JSON.stringify(input.participantAnswers, null, 2) +
          `\n\nDraft a vision layout with four kinds of nodes:\n` +
          `- One "north_star" node: the synthesized north star statement.\n` +
          `- 3-5 "pillar" nodes: short phrases naming the pillars that support it.\n` +
          `- 2-4 "practice" nodes answering "what does this look like in practice?" — concrete, ` +
          `observable behaviors (draw especially on answers about what people are doing differently ` +
          `and what wouldn't be traded away).\n` +
          `- 2-4 "signal" nodes answering "how will we know we're becoming this?" — noticeable signs ` +
          `of progress (draw especially on answers about what someone would notice walking in, and ` +
          `what's gone that's here today).\n` +
          `Position all nodes in a 900x480 canvas with the north star near the center, pillars around it, ` +
          `and practice/signal nodes further out. ` +
          `Respond as JSON matching {"nodes": [{"id": string, "kind": "north_star"|"pillar"|"practice"|"signal", "text": string, "x": number, "y": number}], ` +
          `"edges": [{"from": string, "to": string}]}. Every pillar node needs an edge to the north star. No other text.`,
      },
    ],
  })
  return parseJsonResponse<VisionLayout>(raw)
}

// ------------------------------------------------------------
// generateVisionAlignmentGuide — the "where there's alignment / where
// there's disconnect" panel from the mockup. A separate call from the
// layout itself: the layout is a synthesized artifact, this is analysis
// of the individual inputs that produced it.
// ------------------------------------------------------------
export type VisionAlignmentGuide = {
  alignment: string
  disconnect: string
}

export async function generateVisionAlignmentGuide(input: {
  teamName: string
  // Deliberately unlabeled by real name — "Participant 1/2/3" — the model
  // doesn't need identity to describe where answers converge or diverge.
  participantAnswers: Record<string, string>[]
}): Promise<VisionAlignmentGuide> {
  const labeled = input.participantAnswers.map((answers, i) => ({ participant: `Participant ${i + 1}`, answers }))
  const raw = await callAnthropic({
    model: MODELS.synthesis,
    system: FRAMEWORK_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content:
          `Team: ${input.teamName}\n\nIndividual vision-session answers, one entry per participant:\n` +
          JSON.stringify(labeled, null, 2) +
          `\n\nWrite two short paragraphs (2-3 sentences each): where the team's answers ` +
          `genuinely converge, and where there's a real disconnect worth naming (different ` +
          `readings of the same idea, tension between priorities, etc.). Be specific, not generic. ` +
          `Respond as JSON: {"alignment": string, "disconnect": string}. No other text.`,
      },
    ],
  })
  return parseJsonResponse<VisionAlignmentGuide>(raw)
}

// ------------------------------------------------------------
// generateFrictionDiscussionGuide — the discussion guide for the meeting a
// friction session's participants schedule once their tier-4 authored
// answers (Q8-10) are revealed to each other. Only ever called on content
// that's already been through the simultaneous-reveal gate — never raw
// tier-0 material. Same "notice, don't diagnose" instruction as the pulse
// trend insight in synthesizeRollup: this surfaces something to explore
// together, it never hands down a verdict ("this team has a trust
// problem" is exactly the phrasing this must avoid).
// ------------------------------------------------------------
export type FrictionDiscussionGuide = {
  summary: string
  talkingPoints: string[]
}

export async function generateFrictionDiscussionGuide(input: {
  teamName: string
  topic: string
  // Deliberately unlabeled by real name — "Participant 1/2/3" — same as
  // generateVisionAlignmentGuide, and for the same reason.
  responses: Record<string, string>[]
}): Promise<FrictionDiscussionGuide> {
  const labeled = input.responses.map((answers, i) => ({ participant: `Participant ${i + 1}`, answers }))
  const raw = await callAnthropic({
    model: MODELS.synthesis,
    system: FRAMEWORK_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content:
          `Team: ${input.teamName}\nWhat this friction session is about: ${input.topic}\n\n` +
          `Each participant's authored point of view, submitted knowing it would be shared:\n` +
          JSON.stringify(labeled, null, 2) +
          `\n\nWrite a short discussion guide for the meeting these people are about to have. ` +
          `A 2-4 sentence summary of what these responses actually share and where they genuinely ` +
          `differ — specific, not generic — followed by 3-5 concrete talking points phrased as things ` +
          `to explore together in the meeting, never as conclusions or diagnoses. Never quote anyone ` +
          `verbatim and never attribute a specific view to "Participant 2" in the summary or talking ` +
          `points — describe the shared picture, not who said what. Disallowed: verdicts like "this ` +
          `team has a trust problem." Wanted: noticings that open a conversation, like "there's a real ` +
          `question here about who gets to decide, worth naming directly." ` +
          `Respond as JSON: {"summary": string, "talkingPoints": string[]}. No other text.`,
      },
    ],
  })
  return parseJsonResponse<FrictionDiscussionGuide>(raw)
}
