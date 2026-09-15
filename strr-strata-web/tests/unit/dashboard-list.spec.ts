import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { mockPermitDetailsData } from '../mocks/mockedData'
import Dashboard from '~/pages/strata-hotel/dashboard/index.vue'
import { UPagination } from '#components'

const getAccountApplications = vi.fn()
const accountStore = reactive({ currentAccount: { id: '123' } })

mockNuxtImport('useConnectAccountStore', () => () => accountStore)
mockNuxtImport('useStrrApi', () => () => ({ getAccountApplications, deleteApplication: vi.fn() }))
mockNuxtImport('useStrrModals', () => () => ({ openHelpRegisterModal: vi.fn(), openAppSubmitError: vi.fn() }))

const emptyList = { applications: [], total: 0 }
const loadedList = {
  applications: [{
    header: {
      applicationNumber: '105',
      hostStatus: 'Draft',
      status: ApplicationStatus.DRAFT,
      submitDate: '2026-09-01T12:00:00Z'
    },
    registration: {
      ...mockPermitDetailsData,
      strataHotelDetails: { ...mockPermitDetailsData.strataHotelDetails, brand: { name: 'Test Hotel' } }
    }
  }],
  total: 60
}
let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined
const renderError = vi.fn()

async function mountDashboard () {
  wrapper = await mountSuspended(Dashboard, {
    global: {
      config: { errorHandler: renderError },
      stubs: {
        ConnectPageSection: { template: '<section><slot name="header" /><slot /></section>' },
        ConnectI18nHelper: true,
        USelectMenu: true,
        UTable: {
          props: ['rows', 'emptyState', 'loading'],
          template: '<div><p v-for="row in rows" :key="row.number">{{ row.strataName }}</p>' +
            '<p v-if="!loading && !rows.length">{{ emptyState.label }}</p></div>'
        }
      }
    }
  })
  await flushPromises()
  return wrapper
}

describe('Strata dashboard list', () => {
  beforeEach(() => {
    clearNuxtData('strata-hotel-list-resp')
    accountStore.currentAccount.id = '123'
    vi.clearAllMocks()
    getAccountApplications.mockResolvedValue(emptyList)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    clearNuxtData('strata-hotel-list-resp')
  })

  it('shows the empty-account message only after a successful empty response', async () => {
    await mountDashboard()
    expect(wrapper!.text()).toContain('You don’t have any strata-titled hotels or motels yet.')
    expect(wrapper!.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper!.findComponent(UPagination).exists()).toBe(false)
    expect(renderError).not.toHaveBeenCalled()
  })

  it('loads the next page without changing the selected registration type', async () => {
    getAccountApplications.mockResolvedValue(loadedList)
    await mountDashboard()
    expect(wrapper!.text()).toContain('Test Hotel')
    wrapper!.findComponent(UPagination).vm.$emit('update:modelValue', 2)
    await flushPromises()
    expect(getAccountApplications).toHaveBeenLastCalledWith(
      50, 2, ApplicationType.STRATA_HOTEL, undefined, undefined, undefined, undefined, undefined
    )
    expect(renderError).not.toHaveBeenCalled()
  })

  it('shows a recoverable error when the first request fails', async () => {
    getAccountApplications.mockRejectedValue(new Error('API unavailable'))
    await mountDashboard()
    expect(wrapper!.find('[role="alert"]').text()).toContain('Unable to load your strata-titled hotels and motels')
    expect(wrapper!.text()).not.toContain('You don’t have any strata-titled hotels or motels yet.')
    expect(wrapper!.findComponent(UPagination).exists()).toBe(false)
    expect(renderError).not.toHaveBeenCalled()
  })

  it('retries a failed request and replaces the error with the loaded list', async () => {
    getAccountApplications.mockRejectedValueOnce(new Error('API unavailable')).mockResolvedValue(loadedList)
    await mountDashboard()
    const retry = wrapper!.findAll('button').find(button => button.text() === useNuxtApp().$i18n.t('btn.tryAgain'))
    await retry!.trigger('click')
    await flushPromises()
    expect(getAccountApplications).toHaveBeenCalledTimes(2)
    expect(wrapper!.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper!.text()).toContain('Test Hotel')
    expect(wrapper!.findComponent(UPagination).exists()).toBe(true)
    expect(renderError).not.toHaveBeenCalled()
  })

  it('removes the previous account list when the new account request fails', async () => {
    getAccountApplications.mockResolvedValueOnce(loadedList).mockRejectedValue(new Error('API unavailable'))
    await mountDashboard()
    expect(wrapper!.text()).toContain('Test Hotel')
    accountStore.currentAccount.id = '456'
    await flushPromises()
    expect(getAccountApplications).toHaveBeenCalledTimes(2)
    expect(wrapper!.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper!.text()).not.toContain('Test Hotel')
    expect(wrapper!.text()).not.toContain('You don’t have any strata-titled hotels or motels yet.')
    expect(renderError).not.toHaveBeenCalled()
  })
})
