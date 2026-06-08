import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { enI18n } from '../mocks/i18n'
import { MOCK_EXAMINER_USER } from '../mocks/mockedData'
import ExaminerNotes from '~/components/ExaminerNotes.vue'

const mockWithNoteCheck = vi.fn()
const mockNoteContent = ref('')

mockNuxtImport('useExaminerNotes', () => () => ({
  noteContent: mockNoteContent,
  withNoteCheck: mockWithNoteCheck,
  hasUnsavedNote: computed(() => mockNoteContent.value.trim().length > 0),
  useNoteLeaveGuard: vi.fn()
}))

const mockKcUser = ref<any>(MOCK_EXAMINER_USER)

mockNuxtImport('useKeycloak', () => () => ({
  isAuthenticated: ref(true),
  kcUser: mockKcUser,
  logout: vi.fn()
}))

describe('Examiner Notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKcUser.value = MOCK_EXAMINER_USER
    mockNoteContent.value = ''
  })

  it('should render the notes header', async () => {
    const wrapper = await mountSuspended(ExaminerNotes, { global: { plugins: [enI18n] } })
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

  it('should call withNoteCheck when the Discard button is clicked', async () => {
    const wrapper = await mountSuspended(ExaminerNotes, { global: { plugins: [enI18n] } })
    await wrapper.find('textarea').setValue('Draft note')
    await wrapper.find('[data-testid="discard-note-btn"]').trigger('click')
    expect(mockWithNoteCheck).toHaveBeenCalledOnce()
  })

  it('should clear noteContent after saving a note', async () => {
    const wrapper = await mountSuspended(ExaminerNotes, { global: { plugins: [enI18n] } })
    await wrapper.find('textarea').setValue('A saved note')
    await wrapper.find('[data-testid="save-note-btn"]').trigger('click')
    await flushPromises()
    expect(mockNoteContent.value).toBe('')
  })

  it('should add the note to the list and display it after saving', async () => {
    const wrapper = await mountSuspended(ExaminerNotes, { global: { plugins: [enI18n] } })
    expect(wrapper.find('[data-testid="no-notes-available"]').exists()).toBe(true)
    await wrapper.find('textarea').setValue('A new note')
    await wrapper.find('[data-testid="save-note-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="no-notes-available"]').exists()).toBe(false)
  })

  it('should display the character counter', async () => {
    const wrapper = await mountSuspended(ExaminerNotes, { global: { plugins: [enI18n] } })
    await flushPromises()
    expect(wrapper.text()).toContain('0/1000')
    await wrapper.find('textarea').setValue('hello')
    await flushPromises()
    expect(wrapper.text()).toContain('5/1000')
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
    mockKcUser.value = null // forces an error inside handleSaveNote
    const wrapper = await mountSuspended(ExaminerNotes, { global: { plugins: [enI18n] } })
    await wrapper.find('textarea').setValue('Some note text')
    expect(wrapper.find('[data-testid="save-note-error"]').exists()).toBe(false)
    await wrapper.find('[data-testid="save-note-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="save-note-error"]').exists()).toBe(true)
  })

  it('should clear the save error alert when note content is updated', async () => {
    mockKcUser.value = null // force an initial save error
    const wrapper = await mountSuspended(ExaminerNotes, { global: { plugins: [enI18n] } })
    await wrapper.find('textarea').setValue('Note text')
    await wrapper.find('[data-testid="save-note-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="save-note-error"]').exists()).toBe(true)

    await wrapper.find('textarea').setValue('Updated note text')
    await flushPromises()
    expect(wrapper.find('[data-testid="save-note-error"]').exists()).toBe(false)
  })
})
