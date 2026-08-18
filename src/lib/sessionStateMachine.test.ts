import { describe, expect, it } from 'vitest'
import { canTransition, isReadinessGateMet, nextStatuses } from './sessionStateMachine'

describe('canTransition', () => {
  it('allows the documented forward path', () => {
    expect(canTransition('draft', 'collecting')).toBe(true)
    expect(canTransition('collecting', 'ready')).toBe(true)
    expect(canTransition('ready', 'synthesizing')).toBe(true)
    expect(canTransition('synthesizing', 'guide_ready')).toBe(true)
    expect(canTransition('guide_ready', 'discussed')).toBe(true)
    expect(canTransition('discussed', 'closed')).toBe(true)
  })

  it('still allows the placeholder scheduled step for future calendar integration', () => {
    expect(canTransition('guide_ready', 'scheduled')).toBe(true)
    expect(canTransition('scheduled', 'discussed')).toBe(true)
  })

  it('allows the facilitator-wait and retry back-edges', () => {
    expect(canTransition('ready', 'collecting')).toBe(true)
    expect(canTransition('synthesizing', 'ready')).toBe(true)
  })

  it('allows regenerating from guide_ready once more reflections come in', () => {
    expect(canTransition('guide_ready', 'synthesizing')).toBe(true)
  })

  it('allows reopening a discussed session for a next cycle', () => {
    expect(canTransition('discussed', 'collecting')).toBe(true)
  })

  it('rejects skipping a state, e.g. draft straight to guide_ready', () => {
    expect(canTransition('draft', 'guide_ready')).toBe(false)
  })

  it('rejects any transition out of closed', () => {
    expect(canTransition('closed', 'collecting')).toBe(false)
    expect(nextStatuses('closed')).toEqual([])
  })
})

describe('isReadinessGateMet', () => {
  it('"all" gate requires every participant', () => {
    expect(isReadinessGateMet({ type: 'all' }, 5, 6)).toBe(false)
    expect(isReadinessGateMet({ type: 'all' }, 6, 6)).toBe(true)
  })

  it('"quorum" gate uses the configured threshold', () => {
    expect(isReadinessGateMet({ type: 'quorum', threshold: 0.75 }, 4, 6)).toBe(false)
    expect(isReadinessGateMet({ type: 'quorum', threshold: 0.5 }, 3, 6)).toBe(true)
  })

  it('"deadline" gate requires the deadline to have passed and at least one submission', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    const future = new Date(Date.now() + 1000 * 60 * 60).toISOString()
    expect(isReadinessGateMet({ type: 'deadline', deadline: past }, 1, 6)).toBe(true)
    expect(isReadinessGateMet({ type: 'deadline', deadline: past }, 0, 6)).toBe(false)
    expect(isReadinessGateMet({ type: 'deadline', deadline: future }, 5, 6)).toBe(false)
  })

  it('is never met with zero participants', () => {
    expect(isReadinessGateMet({ type: 'all' }, 0, 0)).toBe(false)
  })
})
