import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enI18n } from '../mocks/i18n'
import { mockHostRegistration } from '../mocks/mockedData'
import DocumentUpload from '~/components/DocumentUpload.vue'

const strrApi = vi.fn()
mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: enI18n.global,
  $strrApi: strrApi
}))
mockNuxtImport('useStrrModals', () => () => ({ openErrorModal: vi.fn() }))

const UploadForm = defineComponent({
  props: { uploadDocument: { type: Function, required: true } },
  emits: ['closeUpload', 'uploading'],
  template: '<div>Upload form</div>'
})

describe('Examiner upload queue completion', () => {
  let pinia: ReturnType<typeof createPinia>
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    strrApi.mockReset().mockResolvedValue({ documents: [{ fileKey: 'new-key' }] })
  })

  it('keeps the section open after an individual upload and closes only when the queue completes', async () => {
    const examiner = useExaminerStore()
    examiner.activeRecord = { ...mockHostRegistration, documents: [] }
    const documents = useExaminerDocumentStore()
    documents.openBlUpload()
    const wrapper = await mountSuspended(DocumentUpload, {
      global: { plugins: [pinia, enI18n], stubs: { BaseUploadAdditionalDocuments: UploadForm } }
    })
    const form = wrapper.findComponent(UploadForm)
    form.vm.$emit('uploading', true)
    await flushPromises()
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    const upload = form.props('uploadDocument')
    const file = new File(['test'], 'license.pdf', { type: 'application/pdf' })
    await upload({ file, type: DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE, loading: false }, examiner.activeReg.id)
    await flushPromises()

    expect(documents.isBlUploadOpen).toBe(true)
    expect(strrApi).toHaveBeenCalledTimes(1)
    form.vm.$emit('closeUpload')
    await flushPromises()
    expect(documents.isBlUploadOpen).toBe(false)
    wrapper.unmount()
  })
})
