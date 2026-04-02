import { describe, beforeEach, it, expect } from 'vitest'

describe('Strata Details Store', () => {
  beforeEach(() => {
    useStrrStrataDetailsStore().$reset()
  })

  it('setOriginalBuildingCount - update originalBuildingCount', () => {
    const store = useStrrStrataDetailsStore()
    expect(store.originalBuildingCount).toBe(0)
    store.setOriginalBuildingCount(4)
    expect(store.originalBuildingCount).toBe(4)
  })

  it('$reset - clear strataDetails and reset originalBuildingCount to 0', () => {
    const store = useStrrStrataDetailsStore()
    store.strataDetails.numberOfUnits = 99
    store.setOriginalBuildingCount(3)

    store.$reset()

    expect(store.strataDetails.numberOfUnits).toBeUndefined()
    expect(store.originalBuildingCount).toBe(0)
  })

  it('should return false when strataDetails is in its initial empty state', () => {
    const store = useStrrStrataDetailsStore()
    expect(store.validateStrataDetails(true)).toBe(false)
  })

  it('should return a MultiFormValidationResult array when returnBool is false', () => {
    const store = useStrrStrataDetailsStore()
    const result = store.validateStrataDetails(false)
    expect(Array.isArray(result)).toBe(true)
    expect((result as any[])[0]).toHaveProperty('success')
  })

  it('addNewEmptyBuilding - append a building and an empty unit listing slot', () => {
    const store = useStrrStrataDetailsStore()

    expect(store.strataDetails.buildings).toHaveLength(0)
    expect(store.strataDetails.unitListings.additional).toHaveLength(0)

    // add one building
    store.addNewEmptyBuilding()

    expect(store.strataDetails.buildings).toHaveLength(1)
    expect(store.strataDetails.unitListings.additional).toHaveLength(1)
    expect(store.strataDetails.unitListings.additional[0]).toBe('')
  })

  it('removeBuildingAtIndex - remove the correct building and move unit listings', () => {
    const store = useStrrStrataDetailsStore()

    // add two buildings
    store.addNewEmptyBuilding()
    store.addNewEmptyBuilding()

    store.strataDetails.unitListings.additional[0] = 'Unit A'
    store.strataDetails.unitListings.additional[1] = 'Unit B'

    store.removeBuildingAtIndex(0)

    expect(store.strataDetails.buildings).toHaveLength(1)
    expect(store.strataDetails.unitListings.additional).toHaveLength(1)
    expect(store.strataDetails.unitListings.additional[0]).toBe('Unit B')
  })
})
