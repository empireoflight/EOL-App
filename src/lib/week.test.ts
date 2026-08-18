import { describe, expect, it } from 'vitest'
import { getWeekStart } from './week'

describe('getWeekStart', () => {
  it('returns the same date for a Monday', () => {
    expect(getWeekStart(new Date('2026-08-10T15:00:00Z'))).toBe('2026-08-10')
  })

  it('rolls a mid-week date back to Monday', () => {
    expect(getWeekStart(new Date('2026-08-13T15:00:00Z'))).toBe('2026-08-10')
  })

  it('rolls a Sunday back to the preceding Monday', () => {
    expect(getWeekStart(new Date('2026-08-16T15:00:00Z'))).toBe('2026-08-10')
  })
})
