import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { enI18n } from '../mocks/i18n'
import ExaminerNotes from '~/components/ExaminerNotes.vue'

const mockOpenConfirmActionModal = vi.fn()

mockNuxtImport('useStrrModals', () => () => ({
  openConfirmActionModal: mockOpenConfirmActionModal,
  close: vi.fn()
}))

mockNuxtImport('useKeycloak', () => () => ({
  isAuthenticated: ref(true),
  kcUser: ref({ userName: 'test-examiner', loginSource: 'idir' }),
  logout: vi.fn()
}))

describe('Examiner Notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the notes header', async () => {
    const wrapper = await mountSuspended(ExaminerNotes, { global: { plugins: [enI18n] } })
    await flushPromises()
    expect(wrapper.find('h3').exists()).toBe(true)
  })

  it('should not show action buttons when textarea is empty', async () => {
    const wrapper = await mountSuspended(ExaminerNotes, { global: { plugins: [enI18n] } })
    await flushPromises()
    expect(wrapper.find('[data-testid="note-actions"]').exists()).toBe(false)
  })

  it('should show action buttons when textarea has content', async () => {
    const wrapper = await mountSuspended(ExaminerNotes, { global: { plugins: [enI18n] } })
    await flushPromises()
    await wrapper.find('textarea').setValue('Some note text')
    await flushPromises()
    expect(wrapper.find('[data-testid="note-actions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="save-note-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="discard-note-btn"]').exists()).toBe(true)
  })

  it('should call openConfirmActionModal with correct args when discarding', async () => {
    const wrapper = await mountSuspended(ExaminerNotes, { global: { plugins: [enI18n] } })
    await wrapper.find('textarea').setValue('Draft note')
    await wrapper.find('[data-testid="discard-note-btn"]').trigger('click')
    expect(mockOpenConfirmActionModal).toHaveBeenCalledOnce()
    const args = mockOpenConfirmActionModal.mock.calls[0]
    expect(args![0]).toBe('Discard note?')
    expect(args![1]).toBe('Your note has not been saved.')
    expect(args![2]).toBe('Discard Note')
    expect(args![4]).toBe('Keep Editing')
  })
})
