import { describe, expect, it } from 'vitest'
import { formatStrataUnitGroups } from '../../app/utils/format-helper'

describe('formatStrataUnitGroups', () => {
  it('splits primary units by lines or commas and removes blank entries', () => {
    expect(formatStrataUnitGroups({
      primary: '101\n 102, 103\n\n',
      additional: []
    })).toEqual([{ building: 0, items: ['101', '102', '103'] }])
  })

  it('keys each group by building index, skipping empty buildings', () => {
    expect(formatStrataUnitGroups({
      primary: '101',
      additional: ['', '201\n202']
    })).toEqual([
      { building: 0, items: ['101'] },
      { building: 2, items: ['201', '202'] }
    ])
  })

  it('sorts units naturally so numbers and prefixed units are easy to scan', () => {
    expect(formatStrataUnitGroups({
      primary: '206\n205\n101\nPH10\nPH2\n20',
      additional: []
    })).toEqual([{ building: 0, items: ['20', '101', '205', '206', 'PH2', 'PH10'] }])
  })

  it('returns no groups when listings are absent or contain no units', () => {
    expect(formatStrataUnitGroups()).toEqual([])
    expect(formatStrataUnitGroups({ primary: ' \n ', additional: ['', ''] })).toEqual([])
  })
})
