import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { enI18n } from '../mocks/i18n'
import { MOCK_EXAMINER_USER } from '../mocks/mockedData'
import ExaminerNotes from '~/components/ExaminerNotes.vue'

const mockOpenConfirmActionModal = vi.fn()
const mockKcUser = ref<any>(MOCK_EXAMINER_USER)

mockNuxtImport('useStrrModals', () => () => ({
  openConfirmActionModal: mockOpenConfirmActionModal,
  close: vi.fn()
}))

mockNuxtImport('useKeycloak', () => () => ({
  isAuthenticated: ref(true),
  kcUser: mockKcUser,
  logout: vi.fn()
}))

describe('Examiner Notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKcUser.value = MOCK_EXAMINER_USER
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

  it('should show empty state when notes array is empty', async () => {
    const wrapper = await mountSuspended(ExaminerNotes, {
      props: { isReadonly: true },
      global: { plugins: [enI18n] }
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="no-notes-available"]').exists()).toBe(true)
  })

  it('should not show textarea when readonly', async () => {
    const wrapper = await mountSuspended(ExaminerNotes, {
      props: { isReadonly: true },
      global: { plugins: [enI18n] }
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="note-textarea"]').exists()).toBe(false)
  })

  it('should show error alert when saving the note fails', async () => {
    mockKcUser.value = null // will cause the save error
    const wrapper = await mountSuspended(ExaminerNotes, { global: { plugins: [enI18n] } })
    await wrapper.find('textarea').setValue('Some note text')
    expect(wrapper.find('[data-testid="save-note-error"]').exists()).toBe(false)
    await wrapper.find('[data-testid="save-note-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="save-note-error"]').exists()).toBe(true)
  })
})
