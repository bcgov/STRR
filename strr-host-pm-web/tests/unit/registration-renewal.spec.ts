import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { useRoute } from 'vue-router'
import { flushPromises } from '@vue/test-utils'
import { baseEnI18n } from '../mocks/i18n'
import Application from '~/pages/application.vue'

vi.mock('vue-router', () => ({
  useRoute: vi.fn().mockImplementation(() => ({
    name: 'application',
    path: '/application',
    query: {
      renew: 'true'
    }
  })),
  onBeforeRouteLeave: vi.fn()
}))

vi.mock('@/stores/hostPermit', () => {
  return {
    useHostPermitStore: () => ({
      loadHostRegistrationData: vi.fn(),
      renewalRegId: ref('12345'),
      $reset: vi.fn(),
      isRegistrationRenewal: ref(true)
    })
  }
})

describe('Registration Renewal Application Page', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(Application, {
      global: { plugins: [baseEnI18n] }
    })
  })

  it('renders the Application page in Registration Renewal state', async () => {
    await flushPromises()
    expect(useRoute().query).toEqual({ renew: 'true' })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.vm.isRenewal).toBe(true)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('H1').text()).toBe('Short-Term Rental Registration Renewal')
    expect(wrapper.find('[data-testid="alert-renewal-address-change"]').exists()).toBe(true)
  })
})
