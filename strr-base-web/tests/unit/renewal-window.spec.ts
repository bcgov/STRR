import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  formatRenewalWindowDate,
  getDraftEarlyRenewalDate,
  getEarlyRenewalDate,
  getRenewalDraftSubtitle
} from '~/utils/renewalWindow'
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

  it.each([
    ['the window has not started', { hasRenewalWindowStarted: false }, '123', 'January 15, 2027'],
    ['the window has started', { hasRenewalWindowStarted: true }, '123', undefined],
    ['the API does not return a window', { renewalWindowStartDate: undefined }, '123', undefined],
    ['the header is for another application', { hasRenewalWindowStarted: false }, '999', undefined]
  ])('returns the draft date only for the open draft (%s)', (_, fields, applicationNumber, expected) => {
    const header = { applicationNumber: '123', renewalWindowStartDate: '2027-01-15', ...fields }
    expect(getDraftEarlyRenewalDate(header, applicationNumber)).toBe(expected)
    expect(getDraftEarlyRenewalDate(undefined, applicationNumber)).toBeUndefined()
  })

  it('uses the early draft subtitle only when there is an early renewal date', () => {
    const t = (key: string, named?: Record<string, unknown>) => named ? `${key} ${named.date}` : key
    expect(getRenewalDraftSubtitle(t, 'January 15, 2027'))
      .toBe('todos.renewalDraft.earlySubtitle January 15, 2027')
    expect(getRenewalDraftSubtitle(t, undefined)).toBe('todos.renewalDraft.subtitle')
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
