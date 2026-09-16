import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, shallowRef, Suspense } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { mockHostApplication, mockHostRegistration } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import AdditionalDocuments from '../../../strr-base-web/app/components/BaseUploadAdditionalDocuments.vue'
import { DocumentListItem, UModals } from '#components'
import { expansionInjectionKey, modalInjectionKey } from '#imports'
import RegistrationDetails from '~/pages/registration/[registrationId]/index.vue'
import ApplicationDetails from '~/pages/examine/[applicationId].vue'
import SnapshotDetails from '~/pages/registration/[registrationId]/snapshots/[snapshotId].vue'
import ExamineLayout from '~/layouts/examine.vue'

const api = vi.fn()
const modalState = shallowRef({ component: 'div', props: {} })
const expansionState = shallowRef({ component: 'div', props: {} })
let router: ReturnType<typeof createRouter>
let modal: ReturnType<typeof useModal>
let expansion: ReturnType<typeof useStrrExpansion>
let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined
let releaseUploads: () => void
let selectFile: (files: File[]) => void

mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: { t: (key: string) => enI18n.global.t(key) },
  $strrApi: api,
  $payApi: vi.fn().mockResolvedValue({})
}))
mockNuxtImport('useFileDialog', () => () => ({
  open: vi.fn(),
  reset: vi.fn(),
  onCancel: vi.fn(),
  onChange: (handler: typeof selectFile) => { selectFile = handler }
}))
mockNuxtImport('useConnectNav', () => () => ({ handleExternalRedirect: vi.fn() }))
mockNuxtImport('useConnectAccountStore', () => () => ({ switchCurrentAccount: vi.fn() }))
mockNuxtImport('useStrrApi', () => () => ({ getAccountApplications: vi.fn() }))
mockNuxtImport('useKeycloak', () => () => ({
  kcUser: ref({ userName: 'examiner1' }), isAuthenticated: ref(true)
}))
mockNuxtImport('useRoute', () => () => router?.currentRoute.value ?? { name: 'dashboard', params: {} })
mockNuxtImport('navigateTo', () => (path: string) => router.push(path))
mockNuxtImport('useLocalePath', () => () => (path: string) => path)
mockNuxtImport('useFeatureFlags', () => () => ({ isFeatureEnabled: () => ref(true) }))
mockNuxtImport('useExaminerFeatureFlags', () => () => ({
  isExaminerDecisionsEnabled: ref(false),
  isExaminerNotesEnabled: ref(false),
  isHistoricalApplicationsTableEnabled: ref(false),
  isSnapshotVersionsTableEnabled: ref(false),
  isSplitDashboardTableEnabled: ref(false)
}))

const existingDocument = (id: string) => ({
  fileKey: `${id}-existing`,
  fileName: 'one.pdf',
  fileType: 'application/pdf',
  documentType: DocumentUploadType.UTILITY_BILL
})
const registration = (id: number) => ({
  ...mockHostRegistration,
  id,
  registrationNumber: `REG${id}`,
  documents: [existingDocument(String(id))],
  header: {
    ...mockHostRegistration.header,
    applicationNumber: `${id}0000000`,
    assignee: { username: 'examiner1', displayName: 'Synthetic Examiner' }
  }
})
const application = (number: string) => ({
  ...mockHostApplication,
  registration: { ...mockHostApplication.registration, documents: [existingDocument(number)] },
  header: {
    ...mockHostApplication.header,
    applicationNumber: number,
    registrationNumber: undefined,
    assignee: registration(222).header.assignee
  }
})
const mount = () => mountSuspended(defineComponent({
  setup () {
    modal = useModal()
    useExaminerDocumentStore().closeUpload()
    expansion = useStrrExpansion()
    useExaminerNotes().noteContent.value = ''
    useButtonControl().setButtonControl({ leftButtons: [], rightButtons: [] })
    return () => h('div', [
      h(RouterView, null, {
        default: ({ Component, route }) => h(Suspense, null, {
          default: () => route.name === 'dashboard'
            ? h(Component, { key: route.path })
            : h(ExamineLayout, null, { default: () => Component && h(Component, { key: route.path }) })
        })
      }),
      h(UModals)
    ])
  }
}), {
  attachTo: document.body,
  global: {
    plugins: [router, enI18n],
    provide: { [modalInjectionKey]: modalState, [expansionInjectionKey]: expansionState },
    stubs: {
      ConnectHeaderWrapper: true,
      ConnectSystemBanner: true,
      ConnectFooter: true,
      StrataSupportingInfo: true,
      BaseUploadAdditionalDocuments: AdditionalDocuments,
      ComposeNoc: true,
      DecisionPanel: true,
      ConnectSpinner: true
    }
  }
})
const error = () => Object.assign(new Error('synthetic upload failure'), { statusCode: 503 })
const uploadCalls = () => api.mock.calls.filter(([path, options]) =>
  path.endsWith('/documents') && options.method !== 'GET')
const modalButton = (key: string) => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
  .find(button => button.textContent?.trim() === enI18n.global.t(key))!

beforeEach(() => {
  releaseUploads = () => {}
  clearNuxtData(['registration-details-view', 'application-details-view', 'snapshot-details-view'])
  api.mockReset().mockImplementation((path: string, options: { method: string }) => {
    if (options.method === 'GET') {
      if (path.includes('/snapshots/')) {
        return Promise.resolve({
          id: 7,
          registrationId: 222,
          version: 7,
          snapshotDateTime: '2025-04-02T12:00:00',
          snapshotData: registration(222)
        })
      }
      const id = path.split('/').pop()!
      return Promise.resolve(path.startsWith('/applications/') ? application(id) : registration(Number(id)))
    }
    return Promise.resolve({})
  })
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboard', name: 'dashboard', component: { render: () => h('div', 'Dashboard') } },
      { path: '/registration/:registrationId', name: 'registration-registrationId', component: RegistrationDetails },
      {
        path: '/registration/:registrationId/snapshots/:snapshotId',
        name: 'registration-registrationId-snapshots-snapshotId',
        component: SnapshotDetails
      },
      { path: '/examine/:applicationId', name: 'examine-applicationId', component: ApplicationDetails }
    ]
  })
})
afterEach(async () => {
  releaseUploads()
  await flushPromises()
  await modal?.close()
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
  modal?.reset()
  expansion?.close()
  useExaminerDocumentStore().closeUpload()
  wrapper?.unmount()
  wrapper = undefined
  clearNuxtData(['registration-details-view', 'application-details-view', 'snapshot-details-view'])
})

describe.each(['application', 'registration'])('%s upload navigation', (kind) => {
  const isApplication = kind === 'application'
  const current = isApplication ? '/examine/2220000000' : '/registration/222'
  const next = isApplication ? '/examine/1110000000' : '/registration/111'
  const otherKind = isApplication ? '/registration/111' : '/examine/1110000000'
  const identifier = isApplication ? '2220000000' : '222'
  const endpoint = `/${isApplication ? 'applications' : 'registrations'}/${identifier}/documents`
  const method = isApplication ? 'PUT' : 'POST'
  const uploadedDocument = (name: string) => ({
    fileKey: `${identifier}-${name}`,
    fileName: name,
    fileType: 'application/pdf',
    documentType: DocumentUploadType.UTILITY_BILL
  })
  const response = (names: string[]) => {
    const record = isApplication ? application(identifier) : registration(Number(identifier))
    const reg = 'registration' in record ? record.registration : record
    reg.documents = [existingDocument(identifier), ...names.map(uploadedDocument)]
    return record
  }
  const form = () => wrapper!.findComponent(AdditionalDocuments)
  const queued = () => form().findComponent(DocumentListItem).props('documents') as UiDocument[]
  const submit = () => form().get('button[type="submit"]').trigger('click')
  const select = async (name: string) => {
    useExaminerDocumentStore().selectedDocType = DocumentUploadType.UTILITY_BILL
    await flushPromises()
    selectFile([new File(['synthetic'], name, { type: 'application/pdf' })])
    await flushPromises()
  }
  const start = async (names = ['one.pdf', 'two.pdf']) => {
    await router.push(current)
    wrapper = await mount()
    await flushPromises()
    await wrapper.get('[data-testid="add-pr-doc-btn"]').trigger('click')
    for (const name of names) { await select(name) }
    expect(queued().map(doc => doc.name)).toEqual(names)
  }
  const pendingUpload = async () => {
    const upload = Promise.withResolvers<ReturnType<typeof response>>()
    releaseUploads = () => upload.resolve(response(['one.pdf']))
    api.mockResolvedValue(response(['one.pdf', 'two.pdf'])).mockReturnValueOnce(upload.promise)
    await submit()
    await flushPromises()
    expect(uploadCalls()).toHaveLength(1)
    expect(uploadCalls()[0]).toEqual([endpoint, { method, body: expect.any(FormData) }])
    expect(uploadCalls()[0][1].body.get('file').name).toBe('one.pdf')
    return upload
  }

  it('uploads in order, keeps returned file identities and closes after the complete queue', async () => {
    await start()
    const docs = [...queued()]
    const upload = await pendingUpload()
    expect(useExaminerDocumentStore().isPrUploadOpen).toBe(true)
    expect(queued().map(doc => doc.name)).toEqual(['one.pdf', 'two.pdf'])
    upload.resolve(response(['one.pdf']))
    await flushPromises()
    expect(uploadCalls().map(([path, options]) => [path, options.method, options.body.get('file').name]))
      .toEqual([[endpoint, method, 'one.pdf'], [endpoint, method, 'two.pdf']])
    expect(docs.map(doc => doc.apiDoc.fileKey))
      .toEqual([uploadedDocument('one.pdf').fileKey, uploadedDocument('two.pdf').fileKey])
    expect(useExaminerStore().activeReg.documents).toEqual(response(['one.pdf', 'two.pdf']).registration?.documents ??
      response(['one.pdf', 'two.pdf']).documents)
    expect(useExaminerDocumentStore().isPrUploadOpen).toBe(false)
    expect(form().exists()).toBe(false)
    expect(modal.isOpen.value).toBe(false)
  })

  it('keeps a failed file and the unattempted queue available for retry', async () => {
    await start()
    const upload = await pendingUpload()
    upload.reject(error())
    await flushPromises()
    await vi.waitFor(() => expect(modal.isOpen.value).toBe(true))
    expect(document.querySelector('[role="dialog"]')?.textContent)
      .toContain(enI18n.global.t('error.docUpload.generic.description'))
    expect(queued().map(doc => doc.name)).toEqual(['one.pdf', 'two.pdf'])
    modalButton('btn.close').click()
    await flushPromises()
    api.mockResolvedValueOnce(response(['one.pdf'])).mockResolvedValueOnce(response(['one.pdf', 'two.pdf']))
    await submit()
    await flushPromises()
    expect(uploadCalls().map(([, options]) => options.body.get('file').name)).toEqual(['one.pdf', 'one.pdf', 'two.pdf'])
    expect(useExaminerDocumentStore().isPrUploadOpen).toBe(false)
  })

  it.each([next, otherKind, '/dashboard'])(
    'stops the old queue and preserves the new selection after navigating to %s', async (destination) => {
      await start()
      const docs = [...queued()]
      const upload = await pendingUpload()
      api.mockImplementation((path: string) => {
        const id = path.split('/').pop()!
        return Promise.resolve(path.endsWith('/documents')
          ? response(['one.pdf', 'two.pdf'])
          : path.startsWith('/applications/') ? application(id) : registration(Number(id)))
      })
      await router.push(destination)
      await flushPromises()
      const selected = useExaminerStore().activeRecord
      const selectedDocuments = structuredClone(toRaw(useExaminerStore().activeReg.documents))
      upload.resolve(response(['one.pdf']))
      await flushPromises()
      expect(uploadCalls().map(([path, options]) => [path, options.method, options.body.get('file').name]),
        'navigation must not send unattempted files').toEqual([[endpoint, method, 'one.pdf']])
      expect(useExaminerStore().activeRecord, 'late upload must not replace the selection').toBe(selected)
      if (destination !== '/dashboard') {
        expect(useExaminerStore().activeReg.documents, 'late upload must not alter the next record')
          .toEqual(selectedDocuments)
      }
      expect(docs[0]!.apiDoc.fileKey).toBe(uploadedDocument('one.pdf').fileKey)
      expect(form().exists()).toBe(false)
      expect(useExaminerDocumentStore().isPrUploadOpen).toBe(false)
      expect(modal.isOpen.value).toBe(false)
    }
  )

  it.each([next, '/dashboard'])('does not show an old upload failure after navigating to %s', async (destination) => {
    await start()
    const upload = await pendingUpload()
    api.mockImplementation((path: string) => {
      const id = path.split('/').pop()!
      return Promise.resolve(path.startsWith('/applications/') ? application(id) : registration(Number(id)))
    })
    await router.push(destination)
    await flushPromises()
    upload.reject(error())
    await flushPromises()
    expect(uploadCalls()).toHaveLength(1)
    expect(modal.isOpen.value).toBe(false)
    expect(useExaminerDocumentStore().isPrUploadOpen).toBe(false)
  })

  it.each(['pending', 'failed', 'snapshot'])('preserves a %s detail load after an old upload', async (state) => {
    await start(['one.pdf'])
    const originalDoc = queued()[0]!
    const upload = await pendingUpload()
    const nextRecord = isApplication ? application('1110000000') : registration(111)
    const load = Promise.withResolvers<typeof nextRecord>()
    const snapshot = {
      id: 7,
      registrationId: 222,
      version: 7,
      snapshotDateTime: '2025-04-02T12:00:00',
      snapshotData: registration(222)
    }
    const destination = state === 'snapshot' ? '/registration/222/snapshots/7' : next
    api.mockResolvedValue(snapshot)
    if (state === 'pending') { api.mockReturnValueOnce(load.promise) }
    if (state === 'failed') { api.mockRejectedValueOnce(error()) }
    try {
      await router.push(destination)
      await flushPromises()
      const selected = state === 'snapshot' ? snapshot.snapshotData : undefined
      expect(useExaminerStore().activeRecord).toEqual(selected)
      upload.resolve(response(['one.pdf']))
      await flushPromises()
      expect(useExaminerStore().activeRecord).toEqual(selected)
      expect(originalDoc.apiDoc.fileKey).toBe(uploadedDocument('one.pdf').fileKey)
      expect(form().exists()).toBe(false)
      expect(useExaminerDocumentStore().isPrUploadOpen).toBe(false)
      expect(modal.isOpen.value).toBe(false)
    } finally {
      load.resolve(nextRecord)
      await flushPromises()
    }
  })

  it.each(['success', 'failure'])('keeps a new upload panel intact after an old %s', async (result) => {
    await start(['one.pdf'])
    const upload = await pendingUpload()
    const nextRecord = isApplication ? application('1110000000') : registration(111)
    api.mockResolvedValue(nextRecord)
    await router.push(next)
    await flushPromises()
    expect(form().exists(), 'navigation closes the old panel').toBe(false)
    await wrapper!.get('[data-testid="add-pr-doc-btn"]').trigger('click')
    await select('next.pdf')
    const nextDoc = queued()[0]!
    const nextResponse = isApplication ? application('1110000000') : registration(111)
    const nextReg = 'registration' in nextResponse ? nextResponse.registration : nextResponse
    nextReg.documents.push({ ...uploadedDocument('next.pdf'), fileKey: 'next-record-document' })
    const nextUpload = Promise.withResolvers<typeof nextRecord>()
    releaseUploads = () => {
      upload.resolve(response(['one.pdf']))
      nextUpload.resolve(nextResponse)
    }
    api.mockReturnValueOnce(nextUpload.promise)
    await submit()
    await flushPromises()
    if (result === 'success') { upload.resolve(response(['one.pdf'])) } else { upload.reject(error()) }
    await flushPromises()
    expect(useExaminerStore().activeRecord).toEqual(nextRecord)
    expect(queued().map(doc => doc.name)).toEqual(['next.pdf'])
    expect(form().get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(useExaminerDocumentStore().isPrUploadOpen).toBe(true)
    expect(modal.isOpen.value).toBe(false)
    nextUpload.resolve(nextResponse)
    await flushPromises()
    expect(useExaminerDocumentStore().isPrUploadOpen).toBe(false)
    expect(useExaminerStore().activeReg.documents).toEqual(nextReg.documents)
    expect(nextDoc.apiDoc.fileKey).toBe('next-record-document')
  })
})
