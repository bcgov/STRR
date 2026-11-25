import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import en from '../../i18n/locales/en-CA'

vi.stubGlobal('computed', computed)

const { default: ApplicationSubmit } = await import('../../app/components/modal/error/ApplicationSubmit.vue')

const errors = en.modal.error.applicationSubmit
const translate = (key: string) => key.split('.').reduce((value: any, part) => value[part], en) as string

const mountError = (error: unknown) => mount(ApplicationSubmit, {
  props: { error },
  global: {
    mocks: { $t: translate },
    stubs: { ModalBase: { template: '<div><slot /></div>' }, UIcon: true, ContactSTRR: true }
  }
})

describe('application submit error', () => {
  it.each([
    [400, 'RENEWAL_WINDOW_NOT_OPEN', errors.renewalWindowNotOpen],
    [500, 'RENEWAL_WINDOW_NOT_OPEN', errors.internal],
    [400, 'OTHER', errors.badRequest],
    [400, undefined, errors.badRequest],
    [409, 'RENEWAL_ALREADY_IN_PROGRESS', errors.renewalAlreadyInProgress]
  ])('shows the message for status %s and code %s', (statusCode, errorCode, expected) => {
    const wrapper = mountError({ statusCode, data: { errorCode } })
    expect(wrapper.find('h2').text()).toBe(expected.title)
    expect(wrapper.find('p').text()).toBe(expected.content)
  })
})
