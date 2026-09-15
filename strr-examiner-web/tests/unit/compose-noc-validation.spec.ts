import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enI18n } from '../mocks/i18n'
import { mockHostApplicationWithReviewer } from '../mocks/mockedData'
import ComposeNoc from '~/components/ComposeNoc.vue'

mockNuxtImport('useStrrApi', () => () => ({ getAccountApplications: vi.fn() }))
mockNuxtImport('useKeycloak', () => () => ({ kcUser: ref({ userName: 'examiner1' }) }))
mockNuxtImport('useStrrModals', () => () => ({ openErrorModal: vi.fn() }))
mockNuxtImport('useExaminerFeatureFlags', () => () => ({ isSplitDashboardTableEnabled: ref(false) }))

describe('ComposeNoc validation with the Examiner store', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const mountForm = async (status: ApplicationStatus) => {
    const store = useExaminerStore()
    store.activeRecord = {
      ...mockHostApplicationWithReviewer,
      header: { ...mockHostApplicationWithReviewer.header, status, registrationNumber: undefined }
    }
    await nextTick()
    expect(store.isAssignedToUser).toBe(true)
    const wrapper = await mountSuspended(ComposeNoc, {
      global: { plugins: [pinia, enI18n] }
    })
    expect(wrapper.find('[data-testid="compose-email"]').exists()).toBe(true)
    expect(store.emailFormRef).toBeDefined()
    return { store, wrapper }
  }

  it('rejects an empty notice of consideration and accepts entered content', async () => {
    const { store, wrapper } = await mountForm(ApplicationStatus.FULL_REVIEW)

    await expect(store.emailFormRef!.validate(undefined, { silent: true })).resolves.toBe(false)
    expect(store.emailFormRef!.getErrors('content')).toHaveLength(1)

    await wrapper.find('textarea').setValue('Please provide the missing documents.')
    await expect(store.emailFormRef!.validate()).resolves.toEqual({
      content: 'Please provide the missing documents.'
    })
    expect(store.emailFormRef!.getErrors()).toEqual([])
    wrapper.unmount()
  })

  it.each([
    ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING,
    ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED
  ])('keeps optional email content for %s and updates validation when the status changes', async (status) => {
    const { store, wrapper } = await mountForm(status)
    await expect(store.emailFormRef!.validate()).resolves.toEqual({ content: '' })

    store.activeRecord!.header.status = ApplicationStatus.FULL_REVIEW
    await nextTick()
    await expect(store.emailFormRef!.validate(undefined, { silent: true })).resolves.toBe(false)
    wrapper.unmount()
  })
})
