// Spec §16 — present tense throughout, sequence matters, don't reorder.
// Shared between VisionReflectPage (the form) and VisionHomePage (which
// renders each person's answers, attributed, alongside the prompt text
// rather than raw JSON keys) — see visionAnswers RLS policy for why raw
// answers are visible team-wide.
//
// The two "arrival" questions are anchored to the session's time horizon
// (set by whoever started the session, in VisionStartPage) rather than a
// vague "now" — everyone should be picturing the same point in time.
export function getVisionQuestions(horizon: string = '12 months'): { id: string; prompt: string; optional?: boolean }[] {
  return [
    { id: 'building', prompt: 'What are we building together?' },
    { id: 'who_for', prompt: "Who is it for, and what's different for them because it exists?" },
    { id: 'unique', prompt: 'What does it do that nothing else does?', optional: true },
    { id: 'hardest', prompt: "What's the hardest problem we haven't cracked yet?", optional: true },
    { id: 'proud', prompt: 'What would make you proud to put your name on this?' },
    { id: 'not_building', prompt: 'What are we deliberately not building, even if someone asks for it?', optional: true },
    { id: 'arrival_notice', prompt: `${horizon} from now, you walk in on an ordinary Tuesday. What's the first thing you notice?` },
    { id: 'arrival_doing', prompt: 'What are people doing differently than they do today?' },
    { id: 'arrival_feel', prompt: `What does it feel like to be on this team, ${horizon} from now?` },
    { id: 'negative_space', prompt: "What's gone that's here today? (a meeting, a tension, a way of working, a feeling)" },
    { id: 'anchors', prompt: "What matters most about how we get there — what wouldn't you trade away even for a better outcome?" },
  ]
}
