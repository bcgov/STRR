// import { createRouter, createWebHistory } from 'vue-router'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useRoute } from 'vue-router'
import { mockApplicationApproved } from '~/tests/mocks/mockApplication'
import Breadcrumb from '~/components/Breadcrumb.vue'
import { RouteNamesE } from '#imports'

vi.mock('vue-router', () => ({
  useRoute: vi.fn()
}))

const mockRoute = (routeName: RouteNamesE) => {
  // @ts-ignore: Ignore TypeScript error for mockImplementation
  useRoute.mockImplementation(() => ({
    name: routeName,
    path: '/' + routeName
  }))
}

describe('Breadcrumb Tests', () => {
  const { t } = useTranslation()

  const tBreadcrumb = (translationKey: string) => t(`common.breadcrumb.${translationKey}`)

  beforeEach(() => {
    const { setupBreadcrumbData } = useBreadcrumb()
    setupBreadcrumbData(mockApplicationApproved)
  })

  it('show or hide breadcrumb based on route', async () => {
    let wrapper

    // Rental Registration page
    mockRoute(RouteNamesE.CREATE_ACCOUNT)
    wrapper = await mountSuspended(Breadcrumb)
    await nextTick()

    let breadcrumb = wrapper.find('[data-test-id="breadcrumb-trail"]')

    expect(breadcrumb.exists()).toBeTruthy()
    let breadcrumbItems = breadcrumb.findAll('li')

    expect(breadcrumbItems.length).toBe(2)
    expect(breadcrumbItems[0].text()).toBe(tBreadcrumb('hostDashboard'))
    expect(breadcrumbItems[1].text()).toBe(tBreadcrumb('rentalRegistration'))

    const breadcrumbBackButton = wrapper.findComponent('[data-test-id="breadcrumb-back-button"]')
    expect(breadcrumbBackButton.attributes('href')).toContain(RouteNamesE.APPLICATION_STATUS)

    // Application Details page
    mockRoute(RouteNamesE.APPLICATION_DETAILS)
    wrapper = await mountSuspended(Breadcrumb)
    await nextTick()

    breadcrumb = wrapper.find('[data-test-id="breadcrumb-trail"]')
    expect(breadcrumb.exists()).toBeTruthy()
    breadcrumbItems = breadcrumb.findAll('li')

    expect(breadcrumbItems.length).toBe(2)
    expect(breadcrumbItems[0].text()).toBe(tBreadcrumb('hostDashboard'))
    expect(breadcrumbItems[1].text()).toBe('Application #' + mockApplicationApproved.header.id)

    // Terms of Service page - Breadcrumb should not exist
    mockRoute(RouteNamesE.TERMS_OF_SERVICE)
    wrapper = await mountSuspended(Breadcrumb)
    await nextTick()

    expect(wrapper.find('[data-test-id="breadcrumb-trail"]').exists()).toBeFalsy()
  })
})
