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
const mutationCalls = () => api.mock.calls.filter(([, options]) => options.method !== 'GET')
const modalButton = (key: string) => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
  .find(button => button.textContent?.trim() === enI18n.global.t(key))!

beforeEach(() => {
  releaseUploads = () => {}
  clearNuxtData(['registration-details-view', 'application-details-view'])
  api.mockReset().mockImplementation((path: string, options: { method: string }) => {
    if (options.method === 'GET') {
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
  clearNuxtData(['registration-details-view', 'application-details-view'])
})

describe.each(['application address', 'registration address', 'registration email'])('%s updates', (kind) => {
  const isApplication = kind.startsWith('application')
  const isEmail = kind.endsWith('email')
  const current = isApplication ? '/examine/2220000000' : '/registration/222'
  const identifier = isApplication ? '2220000000' : '222'
  const editedValue = isEmail ? 'saved@example.com' : 'Kelowna'
  const laterValue = isEmail ? 'later@example.com' : 'Victoria'
  const editButton = isEmail ? 'edit-registration-email' : 'edit-rental-unit-button'
  const formId = isEmail ? 'edit-registration-email-form' : 'edit-rental-unit-form'
  const form = () => wrapper!.get(`[data-testid="${formId}"]`)
  const input = () => wrapper!.get(isEmail
    ? '#edit-host-email'
    : `input[placeholder="${enI18n.global.t('form.pr.editAddress.city')}"]`)
  const uploadForm = () => wrapper!.findComponent(AdditionalDocuments)
  const uploadedDocument = {
    fileKey: 'new-document',
    fileName: 'added.pdf',
    fileType: 'application/pdf',
    documentType: DocumentUploadType.UTILITY_BILL
  }
  const response = (edited: boolean, uploaded: boolean, value = editedValue) => {
    const record = isApplication ? application(identifier) : registration(Number(identifier))
    const reg = 'registration' in record ? record.registration : record
    if (edited) {
      if (isEmail) {
        reg.primaryContact = { ...reg.primaryContact, emailAddress: value }
      } else {
        reg.unitAddress = { ...reg.unitAddress, city: value }
        if (!isApplication) { reg.unitDetails = { ...reg.unitDetails, jurisdiction: `City of ${value}` } }
      }
    }
    if (uploaded) { reg.documents = [...reg.documents, uploadedDocument] }
    return record
  }
  const start = async () => {
    await router.push(current)
    wrapper = await mount()
    await flushPromises()
  }
  const startEdit = async () => {
    await wrapper!.get(`[data-testid="${editButton}"]`).trigger('click')
    await input().setValue(editedValue)
    await form().trigger('submit')
    await flushPromises()
  }
  const startUpload = async () => {
    await wrapper!.get('[data-testid="add-pr-doc-btn"]').trigger('click')
    useExaminerDocumentStore().selectedDocType = DocumentUploadType.UTILITY_BILL
    await flushPromises()
    selectFile([new File(['synthetic'], uploadedDocument.fileName, { type: 'application/pdf' })])
    await flushPromises()
    await uploadForm().get('button[type="submit"]').trigger('click')
    await flushPromises()
  }
  const expectSaved = (value = editedValue) => {
    expect(wrapper!.get(isEmail ? '#host-details' : '#rental-unit-details').text()).toContain(value)
    expect(useExaminerStore().activeReg.documents.map((doc: ApiDocument) => doc.fileKey))
      .toEqual([`${identifier}-existing`, uploadedDocument.fileKey])
    if (!isApplication && !isEmail) {
      expect(useExaminerStore().activeReg.unitDetails.jurisdiction).toBe(`City of ${value}`)
    }
    expect(wrapper!.find(`[data-testid="${formId}"]`).exists()).toBe(false)
    expect(useExaminerDocumentStore().isPrUploadOpen).toBe(false)
    expect(modal.isOpen.value).toBe(false)
  }
  const pending = () => {
    const edit = Promise.withResolvers<ReturnType<typeof response>>()
    const upload = Promise.withResolvers<ReturnType<typeof response>>()
    releaseUploads = () => {
      edit.resolve(response(true, true))
      upload.resolve(response(true, true))
    }
    api.mockImplementation((_path, options) => options.method === 'PATCH' ? edit.promise : upload.promise)
    return { edit, upload }
  }

  describe.each(['upload', 'edit'])('starting %s first', (startedFirst) => {
    it.each([
      ['upload', 'upload'], ['upload', 'edit'], ['edit', 'upload'], ['edit', 'edit']
    ])('preserves both changes when %s commits first and %s responds first', async (committedFirst, returnedFirst) => {
      await start()
      const { edit, upload } = pending()
      if (startedFirst === 'upload') {
        await startUpload()
        await startEdit()
      } else {
        await startEdit()
        await startUpload()
      }
      expect(mutationCalls()).toHaveLength(2)
      const editResponse = response(true, committedFirst === 'upload')
      const uploadResponse = response(committedFirst === 'edit', true)
      if (returnedFirst === 'upload') {
        upload.resolve(uploadResponse)
        await flushPromises()
        edit.resolve(editResponse)
      } else {
        edit.resolve(editResponse)
        await flushPromises()
        upload.resolve(uploadResponse)
      }
      await flushPromises()
      expectSaved()
    })
  })

  it.each(['upload', 'edit'])('preserves a failed %s and its retry after the other update succeeds', async (failed) => {
    await start()
    const { edit, upload } = pending()
    await startUpload()
    await startEdit()
    if (failed === 'upload') {
      edit.resolve(response(true, false))
      await flushPromises()
      upload.reject(error())
    } else {
      upload.resolve(response(false, true))
      await flushPromises()
      edit.reject(error())
    }
    await flushPromises()
    await vi.waitFor(() => expect(modal.isOpen.value).toBe(true))
    if (failed === 'edit') {
      expect((input().element as HTMLInputElement).value).toBe(editedValue)
    } else {
      expect(uploadForm().findComponent(DocumentListItem).props('documents').map((doc: UiDocument) => doc.name))
        .toEqual(['added.pdf'])
    }
    modalButton('btn.close').click()
    await flushPromises()
    api.mockResolvedValue(response(true, true))
    if (failed === 'edit') { await form().trigger('submit') } else {
      await uploadForm().get('button[type="submit"]').trigger('click')
    }
    await flushPromises()
    expect(mutationCalls()).toHaveLength(3)
    expectSaved()
  })

  it('retains changes typed during a pending save and uses the saved value as the new baseline', async () => {
    await start()
    const original = isEmail
      ? useExaminerStore().activeReg.primaryContact.emailAddress
      : useExaminerStore().activeReg.unitAddress.city
    const { edit } = pending()
    await startEdit()
    await input().setValue(laterValue)
    const submittedBody = mutationCalls()[0][1].body
    expect(isEmail ? submittedBody.primaryContact.emailAddress : submittedBody.unitAddress.city).toBe(editedValue)
    edit.resolve(response(true, false))
    await flushPromises()
    expect(wrapper!.find(`[data-testid="${formId}"]`).exists()).toBe(true)
    expect((input().element as HTMLInputElement).value).toBe(laterValue)
    const dirty = () => isEmail
      ? useExaminerStore().hasUnsavedRegistrationEmailChanges
      : useExaminerStore().hasUnsavedRentalUnitChanges
    expect(dirty()).toBe(true)
    await input().setValue(original)
    expect(dirty()).toBe(true)
    await input().setValue(editedValue)
    expect(dirty()).toBe(false)
    await input().setValue(laterValue)
    api.mockResolvedValue(response(true, false, laterValue))
    await form().trigger('submit')
    await flushPromises()
    expect(mutationCalls()).toHaveLength(2)
    expect(wrapper!.get(isEmail ? '#host-details' : '#rental-unit-details').text()).toContain(laterValue)
    expect(wrapper!.find(`[data-testid="${formId}"]`).exists()).toBe(false)
    expect(dirty()).toBe(false)
  })

  if (!isApplication) {
    it.each([
      ['first', 'first'], ['first', 'second'], ['second', 'first'], ['second', 'second']
    ])('keeps both edits when %s commits first and %s responds first', async (committedFirst, returnedFirst) => {
      await start()
      const first = Promise.withResolvers<ReturnType<typeof registration>>()
      const second = Promise.withResolvers<ReturnType<typeof registration>>()
      const firstResponse = response(true, false) as ReturnType<typeof registration>
      const secondResponse = registration(222)
      const otherValue = isEmail ? 'Kelowna' : 'saved@example.com'
      if (isEmail) {
        secondResponse.unitAddress = { ...secondResponse.unitAddress, city: otherValue }
        secondResponse.unitDetails = { ...secondResponse.unitDetails, jurisdiction: `City of ${otherValue}` }
      } else {
        secondResponse.primaryContact = { ...secondResponse.primaryContact, emailAddress: otherValue }
      }
      const both = {
        ...firstResponse,
        primaryContact: isEmail ? firstResponse.primaryContact : secondResponse.primaryContact,
        unitAddress: isEmail ? secondResponse.unitAddress : firstResponse.unitAddress,
        unitDetails: isEmail ? secondResponse.unitDetails : firstResponse.unitDetails,
        updatedDate: new Date('2026-09-15T12:02:00Z')
      }
      const olderDate = new Date('2026-09-15T12:01:00Z')
      const firstResult = committedFirst === 'first' ? { ...firstResponse, updatedDate: olderDate } : both
      const secondResult = committedFirst === 'second' ? { ...secondResponse, updatedDate: olderDate } : both
      releaseUploads = () => { first.resolve(firstResult); second.resolve(secondResult) }
      api.mockImplementation(path => (path.endsWith('/str-address') !== isEmail ? first : second).promise)
      await startEdit()
      await wrapper!.get(`[data-testid="${isEmail ? 'edit-rental-unit-button' : 'edit-registration-email'}"]`)
        .trigger('click')
      await vi.waitFor(() => expect(modal.isOpen.value).toBe(true))
      modalButton('btn.discardChanges').click()
      await flushPromises()
      const otherInput = wrapper!.get(isEmail
        ? `input[placeholder="${enI18n.global.t('form.pr.editAddress.city')}"]`
        : '#edit-host-email')
      await otherInput.setValue(otherValue)
      await wrapper!.get(`[data-testid="${isEmail ? 'edit-rental-unit-form' : 'edit-registration-email-form'}"]`)
        .trigger('submit')
      await flushPromises()
      expect(mutationCalls()).toHaveLength(2)
      if (returnedFirst === 'first') {
        first.resolve(firstResult)
        await flushPromises()
        second.resolve(secondResult)
      } else {
        second.resolve(secondResult)
        await flushPromises()
        first.resolve(firstResult)
      }
      await flushPromises()
      expect(wrapper!.get('#rental-unit-details').text()).toContain('Kelowna')
      expect(wrapper!.get('#host-details').text()).toContain('saved@example.com')
      expect(useExaminerStore().activeReg.unitDetails.jurisdiction).toBe('City of Kelowna')
      expect(useExaminerStore().activeReg.updatedDate).toEqual(both.updatedDate)
      expect(wrapper!.find('[data-testid="edit-rental-unit-form"]').exists()).toBe(false)
      expect(wrapper!.find('[data-testid="edit-registration-email-form"]').exists()).toBe(false)
      expect(modal.isOpen.value).toBe(false)
    })
  }
})
