import { describe, it, expect } from 'vitest'
import { getDashboardBuildings } from '~/utils/strataDashboardHelpers'

describe('Dashboard Building helper', () => {
  it('should return one entry per building with correct defaultOpen and label', () => {
    useStrrStrataDetailsStore().addNewEmptyBuilding()

    const buildings = getDashboardBuildings()

    expect(buildings).toHaveLength(2)
    expect(buildings[0].defaultOpen).toBe(true)
    expect(buildings[1].defaultOpen).toBe(false)
    expect(buildings[1].label).toBe('Building 2')
  })
})
