import { describe, expect, it } from 'vitest'
import { alignmentLabels, canInviteIntoFriction, isIndividualCohort, TEAM_TYPE_OPTIONS } from './teamType'

describe('team type', () => {
  it('treats anything that is not explicitly an individual cohort as a team', () => {
    for (const unset of [undefined, null, 'team' as const]) {
      expect(isIndividualCohort(unset)).toBe(false)
      expect(canInviteIntoFriction(unset)).toBe(true)
    }
  })

  it('keeps individual cohorts from inviting anyone into friction sessions', () => {
    expect(isIndividualCohort('individual_cohort')).toBe(true)
    expect(canInviteIntoFriction('individual_cohort')).toBe(false)
  })

  it('keeps the existing wording for a team', () => {
    expect(alignmentLabels('team')).toEqual({ common: "Where there's alignment", differences: "Where there's disconnect" })
    expect(alignmentLabels(undefined)).toEqual(alignmentLabels('team'))
  })

  it('uses common ground and differences for an individual cohort', () => {
    expect(alignmentLabels('individual_cohort')).toEqual({ common: "Where there's common ground", differences: 'Where there are differences' })
  })

  it('offers exactly the two options, team first', () => {
    expect(TEAM_TYPE_OPTIONS.map((o) => o.value)).toEqual(['team', 'individual_cohort'])
  })
})
