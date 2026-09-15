import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { PropType } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { baseEnI18n } from '../mocks/i18n'
import AdditionalDocuments from '../../../strr-base-web/app/components/BaseUploadAdditionalDocuments.vue'
import { UButton } from '#components'

const openErrorModal = vi.fn()
mockNuxtImport('useStrrModals', () => () => ({ openErrorModal }))
mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: baseEnI18n.global
}))

const FileSelector = {
  props: { isDisabled: Boolean },
  emits: ['change', 'error'],
  template: '<button :disabled="isDisabled">Choose file</button>'
}
const DocumentList = {
  props: { documents: { type: Array as PropType<UiDocument[]>, required: true } },
  emits: ['remove'],
  template: '<div><span v-for="doc in documents" :key="doc.id">{{ doc.name }}</span></div>'
}

const mountUpload = async (uploadDocument: ReturnType<typeof vi.fn>) => {
  const wrapper = await mountSuspended(AdditionalDocuments, {
    props: {
      component: FileSelector,
      appRegNumber: 'APP123',
      selectedDocType: DocumentUploadType.UTILITY_BILL,
      uploadDocument
    },
    global: { plugins: [baseEnI18n], stubs: { DocumentListItem: DocumentList } }
  })
  const select = async (name: string) => {
    wrapper.findComponent(FileSelector).vm.$emit('change', new File(['test'], name, { type: 'application/pdf' }))
    await flushPromises()
  }
  const button = (key: 'submit' | 'cancel') => wrapper.findAllComponents(UButton)
    .find(item => key === 'submit' ? item.props('type') === 'submit' : item.props('variant') === 'outline')!
  const queuedNames = () => wrapper.findComponent(DocumentList).props('documents').map((doc: UiDocument) => doc.name)
  return { wrapper, select, button, queuedNames }
}

describe('Additional document upload completion', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the dialog and queue open until the upload completes and blocks duplicate submission', async () => {
    const pending = Promise.withResolvers<void>()
    const upload = vi.fn().mockReturnValue(pending.promise)
    const { wrapper, select, button, queuedNames } = await mountUpload(upload)
    await select('one.pdf')
    await button('submit').trigger('click')
    await flushPromises()

    expect(upload).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('closeUpload')).toBeUndefined()
    expect(queuedNames()).toEqual(['one.pdf'])
    expect(button('cancel').attributes('disabled')).toBeDefined()
    expect(wrapper.findComponent(FileSelector).props('isDisabled')).toBe(true)
    button('submit').vm.$emit('click')
    button('cancel').vm.$emit('click')
    wrapper.findComponent(DocumentList).vm.$emit('remove', wrapper.findComponent(DocumentList).props('documents')[0])
    await select('late-selection.pdf')
    await flushPromises()
    expect(upload).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('closeUpload')).toBeUndefined()
    expect(queuedNames()).toEqual(['one.pdf'])

    pending.resolve()
    await flushPromises()
    expect(queuedNames()).toEqual([])
    expect(wrapper.emitted('closeUpload')).toHaveLength(1)
    expect(wrapper.emitted('uploading')).toEqual([[true], [false]])
    wrapper.unmount()
  })

  it('uploads in order, retains failed and unattempted files, and retries only the remaining queue', async () => {
    const first = Promise.withResolvers<void>()
    const second = Promise.withResolvers<void>()
    const upload = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      .mockResolvedValue(undefined)
    const { wrapper, select, button, queuedNames } = await mountUpload(upload)
    await select('one.pdf')
    await select('two.pdf')
    await select('three.pdf')
    await button('submit').trigger('click')
    await flushPromises()
    expect(upload).toHaveBeenCalledTimes(1)

    first.resolve()
    await flushPromises()
    expect(upload).toHaveBeenCalledTimes(2)
    expect(queuedNames()).toEqual(['two.pdf', 'three.pdf'])
    expect(wrapper.emitted('closeUpload')).toBeUndefined()

    second.reject(new Error('Upload failed'))
    await flushPromises()
    expect(queuedNames()).toEqual(['two.pdf', 'three.pdf'])
    expect(wrapper.emitted('closeUpload')).toBeUndefined()
    expect(button('cancel').attributes('disabled')).toBeUndefined()

    await button('submit').trigger('click')
    await flushPromises()
    expect(upload.mock.calls.map(([doc]) => doc.name)).toEqual(['one.pdf', 'two.pdf', 'two.pdf', 'three.pdf'])
    expect(wrapper.emitted('closeUpload')).toHaveLength(1)
    expect(queuedNames()).toEqual([])
    wrapper.unmount()
  })

  it('does not upload or close an empty queue', async () => {
    const upload = vi.fn()
    const { wrapper, button } = await mountUpload(upload)
    await button('submit').trigger('click')
    await flushPromises()
    expect(upload).not.toHaveBeenCalled()
    expect(wrapper.emitted('closeUpload')).toBeUndefined()
    wrapper.unmount()
  })

  it.each([
    ['fileType', false],
    ['fileSize', false],
    ['fileType', true],
    ['fileSize', true]
  ] as const)('reports %s errors from the file selector (array payload: %s)', async (reason, arrayPayload) => {
    const { wrapper } = await mountUpload(vi.fn())
    const error = arrayPayload ? [{ file: new File(['test'], 'invalid.txt'), reason }] : reason
    wrapper.findComponent(FileSelector).vm.$emit('error', error)
    await flushPromises()

    expect(openErrorModal).toHaveBeenCalledWith(
      baseEnI18n.global.t(`error.docUpload.${reason}.title`),
      baseEnI18n.global.t(`error.docUpload.${reason}.description`),
      false
    )
    wrapper.unmount()
  })
})
