import { describe, expect, it } from 'vitest'
import { formatStrataUnitGroups } from '../../app/utils/format-helper'

describe('formatStrataUnitGroups', () => {
  it('splits primary units by lines or commas and removes blank entries', () => {
    expect(formatStrataUnitGroups({
      primary: '101\n 102, 103\n\n',
      additional: []
    })).toEqual([{ items: ['101', '102', '103'] }])
  })

  it('preserves building numbers when earlier additional listings are empty', () => {
    expect(formatStrataUnitGroups({
      primary: '101',
      additional: ['', '201\n202']
    })).toEqual([
      { label: 'Building 1', items: ['101'] },
      { label: 'Building 3', items: ['201', '202'] }
    ])
  })

  it('returns no groups when listings are absent or contain no units', () => {
    expect(formatStrataUnitGroups()).toEqual([])
    expect(formatStrataUnitGroups({ primary: ' \n ', additional: ['', ''] })).toEqual([])
  })
})
