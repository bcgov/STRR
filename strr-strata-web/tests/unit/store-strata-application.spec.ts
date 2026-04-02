import { describe, beforeEach, it, expect } from 'vitest'

describe('Strata Application Store - validate strata confirmation', () => {
  beforeEach(() => {
    useStrrStrataApplicationStore().$reset()
  })

  it('should return false when confirmation is unchecked', () => {
    const store = useStrrStrataApplicationStore()
    expect(store.confirmation.confirmation).toBe(false)
    expect(store.validateStrataConfirmation(true)).toBe(false)
  })

  it('should return true when confirmation is checked', () => {
    const store = useStrrStrataApplicationStore()
    store.confirmation.confirmation = true
    expect(store.validateStrataConfirmation(true)).toBe(true)
  })

  it('fail strata confirmation validation', () => {
    const store = useStrrStrataApplicationStore()
    const [result] = store.validateStrataConfirmation(false) as any[]
    expect(result.success).toBe(false)
  })

  it('pass strata confirmation validation', () => {
    const store = useStrrStrataApplicationStore()
    store.confirmation.confirmation = true
    const [result] = store.validateStrataConfirmation(false) as any[]
    expect(result.success).toBe(true)
  })

  it('reset confirmation back to false', () => {
    const store = useStrrStrataApplicationStore()
    store.confirmation.confirmation = true
    store.$reset()
    expect(store.confirmation.confirmation).toBe(false)
  })
})
