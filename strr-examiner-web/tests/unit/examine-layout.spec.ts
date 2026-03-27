import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'

import { mockProvisionalReviewApplication, mockFullReviewApplication, mockHostRegistration } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import ExamineLayout from '~/layouts/examine.vue'
import { ActionButtons, ConnectButtonControl } from '#components'

vi.mock('@/composables/useExaminerRoute', () => ({
  useExaminerRoute: () => ({
    isSnapshotRoute: ref(false)
  })
}))

vi.mock('@/composables/useExaminerFeatureFlags', () => ({
  useExaminerFeatureFlags: () => ({
    isExaminerDecisionsEnabled: ref(true)
  })
}))

const mount = () => mountSuspended(ExamineLayout, {
  global: {
    plugins: [enI18n],
    stubs: {
      ConnectHeaderWrapper: true,
      ConnectHeaderLogoHomeLink: true,
      ConnectHeaderAuthenticatedOptions: true,
      ConnectHeaderUnauthenticatedOptions: true,
      ConnectLocaleSelect: true,
      ConnectSystemBanner: true,
      ConnectButtonControl: true,
      ActionButtons: true,
      ConnectFooter: true
    }
  }
})

describe('Examine Layout', () => {
  let wrapper: any
  let store: any

  beforeEach(async () => {
    wrapper = await mount()
    store = useExaminerStore()
  })

  it('should hide ConnectButtonControl and ActionButtons when application has a registration number', async () => {
    store.activeRecord = mockProvisionalReviewApplication
    await nextTick()

    expect(wrapper.findComponent(ConnectButtonControl).exists()).toBe(false)
    expect(wrapper.findComponent(ActionButtons).exists()).toBe(false)
  })

  it('should show ConnectButtonControl for Applications in Full Review', async () => {
    store.activeRecord = mockFullReviewApplication
    await nextTick()

    expect(wrapper.findComponent(ConnectButtonControl).exists()).toBe(true)
    expect(wrapper.findComponent(ActionButtons).exists()).toBe(false)
  })

  it('should show ActionButtons for Registrations', async () => {
    store.activeRecord = mockHostRegistration
    await nextTick()

    expect(wrapper.findComponent(ConnectButtonControl).exists()).toBe(false)
    expect(wrapper.findComponent(ActionButtons).exists()).toBe(true)
  })
})
