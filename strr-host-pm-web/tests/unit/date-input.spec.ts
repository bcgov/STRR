import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import DateInput from '../../../strr-base-web/app/components/connect/form/date/Input.vue'

const mountInput = () => mountSuspended(DateInput, {
  props: {
    name: 'date',
    minDate: new Date(2026, 0, 10, 12),
    maxDate: new Date(2026, 0, 20),
    initialDate: new Date(2026, 0, 15)
  },
  global: {
    stubs: {
      ConnectFormFieldGroup: { template: '<div><slot /></div>' },
      ConnectFormDatePicker: true
    }
  }
})

describe('Date input calendar bounds', () => {
  it.each([
    ['2026-01-09', false],
    ['2026-01-10', true],
    ['2026-01-16', true],
    ['2026-01-20', true],
    ['2026-01-21', false],
    ['2026-01-32', false],
    ['2026-01-', false]
  ])('accepts %s only when it is a valid day within both bounds', async (value, accepted) => {
    const wrapper = await mountInput()
    await wrapper.get('input').setValue(value)
    const selections = wrapper.emitted('selection')
    if (accepted) {
      expect(selections).toEqual([[new Date(`${value}T00:00:00`)]])
    } else {
      expect(selections).toBeUndefined()
    }
    wrapper.unmount()
  })

  it('allows clearing a selected date', async () => {
    const wrapper = await mountInput()
    await wrapper.get('input').setValue('')
    expect(wrapper.emitted('selection')).toEqual([[null]])
    wrapper.unmount()
  })

  it('emits the calendar selection and closes the picker', async () => {
    const wrapper = await mountInput()
    await wrapper.get('input').trigger('click')
    const picker = wrapper.findComponent({ name: 'ConnectFormDatePicker' })
    expect(picker.exists()).toBe(true)
    const selected = new Date(2026, 0, 20)
    picker.vm.$emit('selected-date', selected)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('selection')).toEqual([[selected]])
    expect(wrapper.findComponent({ name: 'ConnectFormDatePicker' }).exists()).toBe(false)
    wrapper.unmount()
  })
})
