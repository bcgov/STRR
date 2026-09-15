import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, shallowRef, Suspense } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { mockHostApplication, mockHostRegistration } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import { UModals } from '#components'
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
let releaseSave: () => void

mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: { t: (key: string) => enI18n.global.t(key) },
  $strrApi: api,
  $payApi: vi.fn().mockResolvedValue({})
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

const registration = (id: number) => ({
  ...mockHostRegistration,
  id,
  registrationNumber: `REG${id}`,
  header: {
    ...mockHostRegistration.header,
    applicationNumber: `${id}0000000`,
    assignee: { username: 'examiner1', displayName: 'Synthetic Examiner' }
  }
})
const application = (number: string) => ({
  ...mockHostApplication,
  registration: { ...mockHostApplication.registration },
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
      HostSupportingInfo: true,
      StrataSupportingInfo: true,
      DocumentUpload: true,
      ComposeNoc: true,
      DecisionPanel: true,
      ConnectSpinner: true
    }
  }
})
const error = () => Object.assign(new Error('synthetic edit failure'), { statusCode: 503 })
const patchCalls = () => api.mock.calls.filter(([, options]) => options.method === 'PATCH')
const modalButton = (key: string) => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
  .find(button => button.textContent?.trim() === enI18n.global.t(key))!

beforeEach(() => {
  releaseSave = () => {}
  clearNuxtData(['registration-details-view', 'application-details-view', 'snapshot-details-view'])
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
  releaseSave()
  await flushPromises()
  await modal?.close()
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
  modal?.reset()
  expansion?.close()
  wrapper?.unmount()
  wrapper = undefined
  clearNuxtData(['registration-details-view', 'application-details-view', 'snapshot-details-view'])
})

describe.each(['application address', 'registration address', 'registration email'])(
  '%s save completion', (kind) => {
    const isApplication = kind.startsWith('application')
    const isEmail = kind.endsWith('email')
    const current = isApplication ? '/examine/2220000000' : '/registration/222'
    const next = isApplication ? '/examine/1110000000' : '/registration/111'
    const endpoint = isApplication
      ? '/applications/2220000000/str-address'
      : `/registrations/222${isEmail ? '' : '/str-address'}`
    const draft = isEmail ? 'updated@example.com' : 'Kelowna'
    const editButton = isEmail ? 'edit-registration-email' : 'edit-rental-unit-button'
    const formId = isEmail ? 'edit-registration-email-form' : 'edit-rental-unit-form'
    const input = () => wrapper!.get(isEmail
      ? '#edit-host-email'
      : `input[placeholder="${enI18n.global.t('form.pr.editAddress.city')}"]`)
    const form = () => wrapper!.get(`[data-testid="${formId}"]`)
    const dirty = () => isEmail
      ? useExaminerStore().hasUnsavedRegistrationEmailChanges
      : useExaminerStore().hasUnsavedRentalUnitChanges
    const updatedRecord = () => {
      const record = isApplication ? application('2220000000') : registration(222)
      const reg = 'registration' in record ? record.registration : record
      if (isEmail) {
        reg.primaryContact = { ...reg.primaryContact, emailAddress: draft }
      } else {
        reg.unitAddress = { ...reg.unitAddress, city: draft }
      }
      return record
    }
    const start = async () => {
      await router.push(current)
      wrapper = await mount()
      await flushPromises()
      await wrapper.get(`[data-testid="${editButton}"]`).trigger('click')
      await input().setValue(draft)
    }
    const pendingSave = async () => {
      const saved = updatedRecord()
      const save = Promise.withResolvers<typeof saved>()
      releaseSave = () => save.resolve(saved)
      const implementation = api.getMockImplementation()!
      api.mockImplementation((path, options) => options.method === 'PATCH'
        ? save.promise
        : implementation(path, options))
      await form().trigger('submit')
      await flushPromises()
      expect(patchCalls()).toHaveLength(1)
      expect(patchCalls()[0][0]).toBe(endpoint)
      return { save, saved }
    }

    it('retains a failed edit and allows a successful retry with the same draft', async () => {
      await start()
      const saved = updatedRecord()
      api.mockRejectedValueOnce(error())
      await form().trigger('submit')
      await flushPromises()
      await vi.waitFor(() => expect(modal.isOpen.value).toBe(true))
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain(enI18n.global.t('error.saveAddress'))
      expect(wrapper!.find(`[data-testid="${formId}"]`).exists(), 'failed save retains the form').toBe(true)
      expect((input().element as HTMLInputElement).value).toBe(draft)
      expect(dirty()).toBe(true)
      modalButton('btn.close').click()
      await flushPromises()

      api.mockResolvedValueOnce(saved)
      await form().trigger('submit')
      await flushPromises()
      expect(patchCalls()).toHaveLength(2)
      expect(patchCalls()[1]).toEqual(patchCalls()[0])
      expect(patchCalls()[0][0]).toBe(endpoint)
      expect(useExaminerStore().activeRecord).toEqual(saved)
      expect(wrapper!.find(`[data-testid="${formId}"]`).exists()).toBe(false)
      expect(dirty()).toBe(false)
    })

    it('keeps the newly selected record and its edit when the previous save finishes', async () => {
      await start()
      const { save, saved } = await pendingSave()
      await router.push(next)
      await flushPromises()
      expect(useExaminerStore().activeHeader?.applicationNumber, 'navigation loads the next record').toBe('1110000000')
      expect(wrapper!.find(`[data-testid="${formId}"]`).exists(), 'navigation closes the previous editor').toBe(false)
      await wrapper!.get(`[data-testid="${editButton}"]`).trigger('click')
      const nextDraft = isEmail ? 'next@example.com' : 'Victoria'
      await input().setValue(nextDraft)

      save.resolve(saved)
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe(next)
      expect(useExaminerStore().activeHeader?.applicationNumber, 'late save preserves the next record')
        .toBe('1110000000')
      expect((input().element as HTMLInputElement).value).toBe(nextDraft)
      expect(dirty()).toBe(true)
    })

    it('updates the displayed value and clears edit state on successful save', async () => {
      await start()
      api.mockResolvedValueOnce(updatedRecord())
      await form().trigger('submit')
      await flushPromises()
      expect(patchCalls()).toHaveLength(1)
      expect(patchCalls()[0][0]).toBe(endpoint)
      expect(wrapper!.get(isEmail ? '#host-details' : '#rental-unit-details').text()).toContain(draft)
      expect(wrapper!.find(`[data-testid="${formId}"]`).exists()).toBe(false)
      expect(dirty()).toBe(false)
      const store = useExaminerStore()
      expect(isEmail ? store.isEditingRegistrationEmail : store.isEditingRentalUnit).toBe(false)
      expect(modal.isOpen.value).toBe(false)
    })

    it('keeps invalid input in the form without sending a PATCH', async () => {
      await start()
      await input().setValue(isEmail ? 'not-an-email' : '')
      await form().trigger('submit')
      await flushPromises()
      expect(patchCalls()).toHaveLength(0)
      expect(wrapper!.find(`[data-testid="${formId}"]`).exists()).toBe(true)
      expect(dirty()).toBe(true)
    })

    it('sends only one save while a request is pending', async () => {
      await start()
      const { save, saved } = await pendingSave()
      await form().trigger('submit')
      await flushPromises()
      expect(patchCalls()).toHaveLength(1)
      save.resolve(saved)
      await flushPromises()
      expect(wrapper!.find(`[data-testid="${formId}"]`).exists()).toBe(false)
    })

    it.each([next, '/dashboard'])('does not open an old save error after navigating to %s', async (destination) => {
      await start()
      const { save } = await pendingSave()
      await router.push(destination)
      await flushPromises()
      const selected = useExaminerStore().activeRecord
      save.reject(error())
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe(destination)
      expect(useExaminerStore().activeRecord).toBe(selected)
      expect(modal.isOpen.value).toBe(false)
    })

    it('preserves a newly opened draft on the same record when a closed form finishes saving', async () => {
      await start()
      const { save, saved } = await pendingSave()
      await wrapper!.findAll('button').find(button => button.text() === enI18n.global.t('btn.close'))!.trigger('click')
      await vi.waitFor(() => expect(modalButton('btn.discardChanges')).toBeDefined())
      modalButton('btn.discardChanges').click()
      await flushPromises()
      expect(wrapper!.find(`[data-testid="${formId}"]`).exists()).toBe(false)
      await wrapper!.get(`[data-testid="${editButton}"]`).trigger('click')
      const nextDraft = isEmail ? 'next@example.com' : 'Victoria'
      await input().setValue(nextDraft)
      save.resolve(saved)
      await flushPromises()
      expect(useExaminerStore().activeRecord).toEqual(saved)
      expect((input().element as HTMLInputElement).value).toBe(nextDraft)
      expect(dirty()).toBe(true)
    })

    it.each(['older', 'newer'])('keeps the newer edit when the %s save finishes first', async (first) => {
      await start()
      const { save, saved } = await pendingSave()
      await wrapper!.findAll('button').find(button => button.text() === enI18n.global.t('btn.close'))!.trigger('click')
      await vi.waitFor(() => expect(modalButton('btn.discardChanges')).toBeDefined())
      modalButton('btn.discardChanges').click()
      await flushPromises()
      await wrapper!.get(`[data-testid="${editButton}"]`).trigger('click')
      const nextDraft = isEmail ? 'next@example.com' : 'Victoria'
      await input().setValue(nextDraft)
      const newer = updatedRecord()
      const reg = 'registration' in newer ? newer.registration : newer
      if (isEmail) {
        reg.primaryContact = { ...reg.primaryContact, emailAddress: nextDraft }
      } else {
        reg.unitAddress = { ...reg.unitAddress, city: nextDraft }
      }
      const newerSave = Promise.withResolvers<typeof newer>()
      releaseSave = () => {
        save.resolve(saved)
        newerSave.resolve(newer)
      }
      api.mockReturnValueOnce(newerSave.promise)
      await form().trigger('submit')
      await flushPromises()
      if (first === 'older') {
        save.resolve(saved)
        await flushPromises()
        expect((input().element as HTMLInputElement).value).toBe(nextDraft)
        newerSave.resolve(newer)
      } else {
        newerSave.resolve(newer)
        await flushPromises()
        expect(useExaminerStore().activeRecord).toEqual(newer)
        save.resolve(saved)
      }
      await flushPromises()
      expect(useExaminerStore().activeRecord).toEqual(newer)
      expect(wrapper!.get(isEmail ? '#host-details' : '#rental-unit-details').text()).toContain(nextDraft)
      expect(wrapper!.find(`[data-testid="${formId}"]`).exists()).toBe(false)
    })

    it.each(['pending', 'failed', 'snapshot'])('ignores the old save after a %s detail load', async (loadState) => {
      await start()
      const { save, saved } = await pendingSave()
      const load = Promise.withResolvers<ReturnType<typeof registration>>()
      const snapshot = {
        id: 7,
        registrationId: 222,
        version: 7,
        snapshotDateTime: '2025-04-02T12:00:00',
        snapshotData: registration(222)
      }
      const destination = loadState === 'snapshot' ? '/registration/222/snapshots/7' : next
      api.mockImplementation((path, options) => options.method === 'PATCH'
        ? save.promise
        : Promise.resolve(path.endsWith('/snapshots/7') ? snapshot : registration(111)))
      if (loadState === 'pending') { api.mockReturnValueOnce(load.promise) }
      if (loadState === 'failed') { api.mockRejectedValueOnce(error()) }
      try {
        await router.push(destination)
        await flushPromises()
        expect(useExaminerStore().activeRecord).toEqual(loadState === 'snapshot' ? snapshot.snapshotData : undefined)
        save.resolve(saved)
        await flushPromises()
        expect(router.currentRoute.value.fullPath).toBe(destination)
        expect(useExaminerStore().activeRecord).toEqual(loadState === 'snapshot' ? snapshot.snapshotData : undefined)
        expect(wrapper!.find(`[data-testid="${formId}"]`).exists()).toBe(false)
        expect(modal.isOpen.value).toBe(false)
      } finally {
        load.resolve(registration(111))
        await flushPromises()
      }
    })
  }
)
