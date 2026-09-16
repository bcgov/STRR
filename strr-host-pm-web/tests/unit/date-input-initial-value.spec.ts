import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import DateInput from '../../../strr-base-web/app/components/connect/form/date/Input.vue'

enableAutoUnmount(afterEach)

describe('date input initial values', () => {
  it.each([undefined, null, new Date(1990, 4, 15)])('renders and edits an initial value of %s', async (initialDate) => {
    const wrapper = await mountSuspended(DateInput, {
      props: { name: 'dateOfBirth', initialDate },
      global: {
        stubs: {
          ConnectFormFieldGroup: { template: '<div><slot /></div>' },
          ConnectFormDatePicker: true
        }
      }
    })
    const input = wrapper.get('input')
    expect(input.element.value).toBe(initialDate ? '1990-05-15' : '')
    expect(wrapper.emitted('selection')).toBeUndefined()

    await input.setValue('1991-06-16')
    expect(wrapper.emitted('selection')).toEqual([[new Date(1991, 5, 16)]])
    await input.setValue('')
    expect(wrapper.emitted('selection')?.at(-1)).toEqual([null])
  })
})
