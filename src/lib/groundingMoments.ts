// The nine "Create space" moments (Unlearn hub redesign, Turn 3 of the
// design file). Collapse into three reusable shells rather than nine
// bespoke pages — `shell` picks which one renders; everything else is
// per-moment content the shell doesn't need to know about.
export type MomentCategory = 'timed-dark' | 'timed-paper' | 'untimed-paper'

export type GroundingMoment = {
  id: string
  name: string
  shell: MomentCategory
  durationSec: number | null // null = untimed
  meta: string // short label shown on the card, e.g. "8 min" or "About 6 min · Outside"
  blurb: string
  outside: boolean
}

export const GROUNDING_MOMENTS: GroundingMoment[] = [
  {
    id: 'breathing',
    name: 'Breathing',
    shell: 'timed-dark',
    durationSec: 120,
    meta: '2 min',
    blurb: 'A paced in-hold-out cycle with a light that grows and fades.',
    outside: false,
  },
  {
    id: 'silent-minute',
    name: 'A silent minute',
    shell: 'timed-dark',
    durationSec: 60,
    meta: '1 min',
    blurb: 'Open a session and say nothing for sixty seconds.',
    outside: false,
  },
  {
    id: 'guided-meditation',
    name: 'Guided meditation',
    shell: 'timed-dark',
    durationSec: 223, // matches public/audio/guided-meditation.mp3's actual length (3:42)
    meta: '4 min',
    blurb: 'Voice-led, eyes closed. Nothing to do but stay.',
    outside: false,
  },
  {
    id: 'binaural-beats',
    name: 'Binaural beats',
    shell: 'timed-dark',
    durationSec: 1200,
    meta: '20 min',
    blurb: 'Headphones on, work continues underneath it.',
    outside: false,
  },
  {
    id: 'dance-moment',
    name: 'Dance moment',
    shell: 'timed-dark',
    durationSec: 180,
    meta: '3 min',
    blurb: 'Put on a song you love, cameras off, everyone moving at once.',
    outside: false,
  },
  {
    id: 'shake-it-off',
    name: 'Shake it off',
    shell: 'timed-paper',
    durationSec: 60,
    meta: '1 min',
    blurb: 'Stand up and shake out your hands until it feels silly.',
    outside: false,
  },
  {
    id: 'forest-bathing',
    name: 'Forest bathing lite',
    shell: 'untimed-paper',
    durationSec: null,
    meta: 'About 6 min · Outside',
    blurb: 'Find a tree. Notice three things. Come back.',
    outside: true,
  },
  {
    id: 'walk-no-goal',
    name: 'A walk with no goal',
    shell: 'untimed-paper',
    durationSec: null,
    meta: 'Any time · Outside',
    blurb: 'No podcast, no step count, nothing to get from it.',
    outside: true,
  },
  {
    id: 'free-form-art',
    name: 'Free-form art',
    shell: 'untimed-paper',
    durationSec: null,
    meta: 'Any time',
    blurb: 'Real paper, a real pen. No subject, no one sees it.',
    outside: false,
  },
]

export type MomentFilter = 'any' | '1min' | '5min' | 'outside'

export function filterMoments(moments: GroundingMoment[], filter: MomentFilter): GroundingMoment[] {
  switch (filter) {
    case 'any':
      return moments
    case '1min':
      return moments.filter((m) => m.durationSec !== null && m.durationSec <= 60)
    case '5min':
      return moments.filter((m) => m.durationSec !== null && m.durationSec <= 300)
    case 'outside':
      return moments.filter((m) => m.outside)
  }
}

export function findMoment(id: string | undefined): GroundingMoment | undefined {
  return GROUNDING_MOMENTS.find((m) => m.id === id)
}
