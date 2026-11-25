import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { formatRenewalWindowDate, getEarlyRenewalDate } from '~/utils/renewalWindow'
import { useButtonControl } from '~/composables/useButtonControl'

const buttonState = ref()
vi.stubGlobal('useNuxtApp', () => ({ $i18n: { locale: ref('en-CA') } }))
vi.stubGlobal('useState', () => buttonState)

describe('renewal window', () => {
  it('formats the calendar date without shifting it', () => {
    expect(formatRenewalWindowDate('2027-01-15')).toBe('January 15, 2027')
  })

  it('returns a date only when the window has not started', () => {
    expect(getEarlyRenewalDate('2027-01-15', false)).toBe('January 15, 2027')
    expect(getEarlyRenewalDate('2027-01-15', true)).toBeUndefined()
    expect(getEarlyRenewalDate(undefined, undefined)).toBeUndefined()
  })

  it('keeps locked buttons disabled when the loading state is reset', () => {
    const { setButtonControl, getButtonControl, handleButtonLoading } = useButtonControl()
    const button = { action: () => {}, label: 'x' }
    setButtonControl({ leftButtons: [{ ...button }], rightButtons: [{ ...button, locked: true, disabled: true }] })
    handleButtonLoading(false, 'left', 0)
    handleButtonLoading(true)
    expect(getButtonControl()?.leftButtons[0]?.disabled).toBe(false)
    expect(getButtonControl()?.rightButtons[0]?.disabled).toBe(true)
  })
})
