// Voice rules for synthesized text (the vision canvas and alignment guide, and
// the personal friction discussion guide), plus a cheap detector for the
// constructions those rules ban. Pure TypeScript with no Deno APIs so
// it can be unit-tested from the Vite side (src/lib/aiVoice.test.ts) as well
// as imported by provider.ts.
//
// Why a detector at all: telling a model "don't write 'not X, but Y'" lowers
// the rate but doesn't zero it, and the pattern is exactly what makes
// synthesized text read as machine-written. provider.ts checks the output and,
// if any of this slipped through, asks for one rewrite naming the offending
// phrases.

// The bullets that apply to every piece of synthesized text, whatever it's
// for. Each rule set below adds its own opening bullet(s) about whose words to
// use and what to stay faithful to.
const NAME_THE_THING_RULE =
  `- Name the actual thing. Say "potlucks and walks" instead of "gatherings", "someone to text at ` +
  `7am" instead of "support", "kids known by more than their own parents" instead of ` +
  `"intergenerational connection". Abstract words (connection, community, belonging, meaningful, ` +
  `authentic) are fine only with a concrete detail attached, never as the point of a sentence.\n`

const NO_CONTRAST_RULE =
  `- No contrast framing, in any sentence. Never write "not X, but Y", "X, not Y", ` +
  `"not just X", "isn't X, it's Y", "more than X, it's Y", "less X and more Y", "X rather than Y", ` +
  `"X instead of Y", or "no X, just Y" as a rhetorical move. That includes names and headings: write ` +
  `"Room for kids", never "Room for kids, not around them". Say what is true, directly, and stop. ` +
  `Don't set up a thing to knock it down.\n`

const NO_STOCK_PHRASING_RULE =
  `- No stock AI phrasing: tapestry, journey, foster, cultivate, empower, unlock, vibrant, holistic, ` +
  `ecosystem, thrive, delve, navigate, landscape, resonate, "fabric of", "at the heart of", "in a ` +
  `world where", strings of three abstract nouns, and em dashes (use a comma or start a new sentence).\n`

export const VISION_VOICE_RULES =
  `VOICE. Read this before you write anything:\n` +
  `- Use the team's own language. Build every node and sentence from words, images, and ` +
  `specifics that actually appear in the answers: the nouns people used ("Sunday dinners", ` +
  `"park days"), their verbs, their small concrete details. When two or more people reach for ` +
  `the same word or image, that word or image is probably the language of the north star, so use ` +
  `it as written. A distinctive phrase from one person beats a smoother abstraction you invented.\n` +
  NAME_THE_THING_RULE +
  NO_CONTRAST_RULE +
  NO_STOCK_PHRASING_RULE +
  `- Plain voice. Write the way a member of this team would say it out loud to the others: short ` +
  `sentences, ordinary words, varied rhythm. No poster slogans, no inspirational cadence.\n` +
  `- Stay faithful. Don't add ideas nobody raised. Don't smooth a real disagreement into a ` +
  `platitude; if the answers split, the output should show the split.`

// For a guide one person will use in a real conversation: it should sound like
// something they could actually say, in their own words.
export const GUIDE_VOICE_RULES =
  `VOICE. Read this before you write anything:\n` +
  `- Use this person's own words. Build the lines they could say from phrases and specifics ` +
  `that actually appear in what they wrote. A distinctive phrase of theirs beats a smoother one ` +
  `you invented.\n` +
  NAME_THE_THING_RULE +
  NO_CONTRAST_RULE +
  NO_STOCK_PHRASING_RULE +
  `- Plain voice. Write the way a thoughtful person would say it out loud to someone they ` +
  `respect: short sentences, ordinary words, no therapy-speak, no poster slogans.\n` +
  `- Stay faithful. Don't add facts, motives, or history they didn't give you.`

type Pattern = { re: RegExp }

// Each regex is written to match a short snippet worth quoting back at the
// model, not a whole sentence.
const PATTERNS: Pattern[] = [
  { re: /\bnot (?:just|only|merely|simply)\b[^.;!?]{0,40}/gi },
  { re: /\b(?:isn't|aren't|wasn't|weren't|doesn't|don't|didn't|won't|can't)\s+(?:just|only|merely|simply)\b[^.;!?]{0,40}/gi },
  { re: /\b(?:isn't|is not|aren't|are not|wasn't|not)\b[^.;!?]{1,40}?[,—–;]\s*(?:but|it's|it is|they're|it was|this is|that's)\b[^.;!?]{0,30}/gi },
  { re: /\bnot\s+(?:a|an|the|about)?\s*[\w'’-]+(?:\s+[\w'’-]+){0,4}\s+but\s+[^.;!?]{0,30}/gi },
  { re: /\bmore than (?:just |simply )?(?:a|an|the)?\s*[^.;!?,—–]{1,40}[,—–]\s*(?:it's|it is|this is|they're|we're|it becomes)\b[^.;!?]{0,30}/gi },
  { re: /\bless\b[^.;!?]{1,50}\band more\b[^.;!?]{0,30}/gi },
  { re: /\bless (?:about )?[^.;!?,]{1,40},\s*more\b[^.;!?]{0,30}/gi },
  { re: /\b(?:rather than|instead of)\b[^.;!?]{0,30}/gi },
  { re: /[,—–]\s*not\s+[^.;!?]{1,40}/gi },
  { re: /\b(?:isn't|is not|aren't|are not|wasn't|not|never)\b[^.;!?]{1,40},\s*just\b[^.;!?]{0,30}/gi },
  { re: /\bno\s+[\w'’ -]{1,30}[,—–]\s*just\b[^.;!?]{0,30}/gi },
  {
    re: /\b(?:tapestry|journey|foster(?:s|ed|ing)?|cultivat(?:e|es|ed|ing)|empower(?:s|ed|ing)?|unlock(?:s|ed|ing)?|vibrant|holistic|ecosystem|thriv(?:e|es|ed|ing)|delve|navigat(?:e|es|ed|ing)|landscape|resonat(?:e|es|ed|ing)|seamless(?:ly)?|ever-evolving)\b/gi,
  },
  { re: /\bfabric of\b[^.;!?]{0,20}/gi },
  { re: /\bat the heart of\b[^.;!?]{0,20}/gi },
  { re: /\bin a world where\b[^.;!?]{0,20}/gi },
]

const MAX_SNIPPET_CHARS = 70

// Anything inside quotation marks is the team's own words being quoted back,
// not the model's phrasing, so it's excluded before checking.
function stripQuoted(text: string): string {
  return text.replace(/“[^”]*”/g, ' ').replace(/"[^"]*"/g, ' ')
}

export function findAiSpeak(text: string): string[] {
  const body = stripQuoted(text)
  const hits = new Set<string>()
  for (const { re } of PATTERNS) {
    for (const match of body.matchAll(re)) {
      hits.add(match[0].trim().slice(0, MAX_SNIPPET_CHARS))
    }
  }
  return [...hits]
}
