// What kind of group a team is. A 'team' works toward a shared vision and can
// bring each other into friction sessions. An 'individual_cohort' is people on
// their own journeys alongside each other: friction is processed personally,
// nobody is invited into someone else's session, and a little of the wording
// softens to match. Anything not explicitly an individual cohort (including a
// team row from before the setting existed) is a team.
export type TeamType = 'team' | 'individual_cohort'

export function isIndividualCohort(type: TeamType | undefined | null): boolean {
  return type === 'individual_cohort'
}

export function canInviteIntoFriction(type: TeamType | undefined | null): boolean {
  return !isIndividualCohort(type)
}

// The two headings over the AI synthesis on the vision page. Same analysis
// either way; a team reads "alignment / disconnect", a cohort reads the
// gentler "common ground / differences".
export function alignmentLabels(type: TeamType | undefined | null): { common: string; differences: string } {
  return isIndividualCohort(type)
    ? { common: "Where there's common ground", differences: 'Where there are differences' }
    : { common: "Where there's alignment", differences: "Where there's disconnect" }
}

export const TEAM_TYPE_OPTIONS: { value: TeamType; title: string; description: string }[] = [
  {
    value: 'team',
    title: 'Team',
    description: 'People working toward a shared vision. Anyone can bring teammates into a friction session.',
  },
  {
    value: 'individual_cohort',
    title: 'Individual cohort',
    description: 'People on their own journeys, alongside each other. Friction is processed personally, with no one invited into a session, and the wording is softer.',
  },
]
