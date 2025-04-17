import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { useRoute } from 'vue-router'
import { baseEnI18n } from '../mocks/i18n'
import Application from '~/pages/application.vue'

vi.mock('vue-router', () => ({
  useRoute: vi.fn().mockImplementation(() => ({
    name: 'application',
    path: '/application',
    query: {
      registrationId: '12345',
      renew: 'true'
    }
  }))
}))

vi.mock('@/stores/hostPermit', () => {
  return {
    useHostPermitStore: () => ({
      loadHostRegistrationData: vi.fn(),
      $reset: vi.fn()
    })
  }
})

describe('Registration Renwal Application Page', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(Application, {
      global: { plugins: [baseEnI18n] }
    })
  })

  it('renders the Application page in Registration Renewal state', () => {
    expect(useRoute().query).toEqual({
      registrationId: '12345',
      renew: 'true'
    })
    expect(wrapper.vm.registrationId).toBe('12345')
    expect(wrapper.vm.isRenewal).toBe(true)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('H1').text()).toBe('Short-Term Rental Registration Renewal')
  })
})
