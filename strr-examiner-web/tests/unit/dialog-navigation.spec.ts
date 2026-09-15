import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, shallowRef, Suspense } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { mockHostApplication, mockHostRegistration } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import { UModals } from '#components'
import { modalInjectionKey } from '#imports'
import RegistrationDetails from '~/pages/registration/[registrationId]/index.vue'
import ApplicationDetails from '~/pages/examine/[applicationId].vue'
import ExamineLayout from '~/layouts/examine.vue'

const api = vi.fn()
const decisionsEnabled = ref(false)
const assignedToUser = ref(false)
const modalState = shallowRef({ component: 'div', props: {} })
let router: ReturnType<typeof createRouter>
let modal: ReturnType<typeof useModal>
let notes: ReturnType<typeof useExaminerNotes>
let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined

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
mockNuxtImport('useFeatureFlags', () => () => ({ isFeatureEnabled: () => ref(false) }))
mockNuxtImport('useExaminerFeatureFlags', () => () => ({
  isExaminerDecisionsEnabled: decisionsEnabled,
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
    assignee: {
      username: assignedToUser.value ? 'examiner1' : 'other-examiner',
      displayName: 'Synthetic Examiner'
    },
    examinerActions: ['APPROVE', 'CANCEL', 'SET_ASIDE']
  }
})
const application = (number: string) => ({
  ...mockHostApplication,
  header: {
    ...mockHostApplication.header,
    applicationNumber: number,
    registrationNumber: undefined,
    assignee: registration(222).header.assignee,
    examinerActions: ['APPROVE', 'SET_ASIDE']
  }
})
const mount = () => mountSuspended(defineComponent({
  setup () {
    modal = useModal()
    notes = useExaminerNotes()
    notes.noteContent.value = ''
    useButtonControl().setButtonControl({ leftButtons: [], rightButtons: [] })
    return () => h('div', [
      h(RouterView, null, {
        default: ({ Component, route }) => h(Suspense, null, {
          default: () => route.name === 'dashboard'
            ? h(Component, { key: route.path })
            : h(ExamineLayout, null, {
              default: () => Component && h(Component, { key: route.path })
            })
        })
      }),
      h(UModals)
    ])
  }
}), {
  attachTo: document.body,
  global: {
    plugins: [router, enI18n],
    provide: { [modalInjectionKey]: modalState },
    stubs: {
      ConnectHeaderWrapper: true,
      ConnectSystemBanner: true,
      ConnectFooter: true,
      ApplicationDetailsView: true,
      DocumentUpload: true,
      ComposeNoc: true,
      DecisionPanel: true,
      ConnectSpinner: true
    }
  }
})
const modalButton = (key: string) => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
  .find(button => button.textContent?.trim() === enI18n.global.t(key))
const modalConfirm = () => modalButton('strr.label.unAssign')

beforeEach(() => {
  assignedToUser.value = false
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
  await modal?.close()
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
  modal?.reset()
  wrapper?.unmount()
  wrapper = undefined
  clearNuxtData(['registration-details-view', 'application-details-view'])
})

describe.each([
  { record: 'registration', enabled: false }, { record: 'registration', enabled: true },
  { record: 'application', enabled: false }, { record: 'application', enabled: true }
])('$record confirmation navigation with newer decision buttons $enabled', ({ record, enabled }) => {
  const current = record === 'application' ? '/examine/2220000000' : '/registration/222'
  const previousRecord = record === 'application' ? '/examine/1110000000' : '/registration/111'
  const endpoint = record === 'application' ? '/applications/2220000000/unassign' : '/registrations/222/unassign'
  beforeEach(() => { decisionsEnabled.value = enabled })

  it.each(['/dashboard', previousRecord])('cancels the old unassignment after Back to %s', async (previous) => {
    await router.push(previous)
    wrapper = await mount()
    await flushPromises()
    await router.push(current)
    await flushPromises()
    expect(useExaminerStore().activeHeader?.applicationNumber).toBe('2220000000')
    const unassign = wrapper.findAll('[data-testid="button-control"] button')
      .find(button => button.text() === enI18n.global.t('btn.unassign'))!
    await unassign.trigger('click')
    await vi.waitFor(() => expect(modalConfirm()).toBeDefined())
    // Hold closing animation frames so any remaining dialog button stays clickable.
    const animationFrames = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 0)
    try {
      router.back()
      await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe(previous))
      await flushPromises()
      if (previous !== '/dashboard') { expect(useExaminerStore().activeHeader?.applicationNumber).toBe('1110000000') }
      modalConfirm()?.click()
      await flushPromises()

      expect(api.mock.calls.filter(([, options]) => options.method !== 'GET')).toEqual([])
      expect(modal.isOpen.value).toBe(false)
    } finally {
      animationFrames.mockRestore()
      modal.reset()
    }
  })

  it('unassigns the selected record once after normal confirmation', async () => {
    await router.push(current)
    wrapper = await mount()
    await flushPromises()
    await wrapper.findAll('[data-testid="button-control"] button')
      .find(button => button.text() === enI18n.global.t('btn.unassign'))!.trigger('click')
    await vi.waitFor(() => expect(modalConfirm()).toBeDefined())
    modalConfirm()!.click()
    await flushPromises()
    expect(api.mock.calls.filter(([, options]) => options.method !== 'GET'))
      .toEqual([[endpoint, { method: 'PUT' }]])
    expect(router.currentRoute.value.fullPath).toBe(current)
  })

  it('cancels unassignment without changing the record or navigating', async () => {
    await router.push(current)
    wrapper = await mount()
    await flushPromises()
    await wrapper.findAll('[data-testid="button-control"] button')
      .find(button => button.text() === enI18n.global.t('btn.unassign'))!.trigger('click')
    await vi.waitFor(() => expect(modalConfirm()).toBeDefined())
    modalButton('btn.cancel')!.click()
    await flushPromises()
    expect(api.mock.calls.filter(([, options]) => options.method !== 'GET')).toEqual([])
    expect(router.currentRoute.value.fullPath).toBe(current)
    expect(modal.isOpen.value).toBe(false)
  })

  it.each(['/dashboard', previousRecord])(
    'preserves an unsaved note on cancelled Back and replaces the deferred action when leaving for %s',
    async (previous) => {
      assignedToUser.value = true
      await router.push(previous)
      wrapper = await mount()
      await flushPromises()
      await router.push(current)
      await flushPromises()
      notes.noteContent.value = 'Synthetic unsaved note'
      await wrapper.findAll('[data-testid="button-control"] button')
        .find(button => button.text() === enI18n.global.t('btn.setAside'))!.trigger('click')
      await vi.waitFor(() => expect(modalButton('modal.discardNote.confirmBtn')).toBeDefined())
      router.back()
      await flushPromises()
      expect(router.currentRoute.value.fullPath).toBe(current)
      modalButton('modal.discardNote.keepEditing')!.click()
      await flushPromises()
      expect(notes.noteContent.value).toBe('Synthetic unsaved note')
      expect(router.currentRoute.value.fullPath).toBe(current)
      expect(api.mock.calls.filter(([, options]) => options.method !== 'GET')).toEqual([])

      await router.push(previous)
      await vi.waitFor(() => expect(modalButton('modal.discardNote.confirmBtn')).toBeDefined())
      modalButton('modal.discardNote.confirmBtn')!.click()
      await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe(previous))
      await flushPromises()
      expect(notes.noteContent.value).toBe('')
      expect(api.mock.calls.filter(([, options]) => options.method !== 'GET')).toEqual([])
      expect(modal.isOpen.value).toBe(false)
    }
  )

  it('keeps the current record and unsaved note during a query-only update', async () => {
    await router.push(current)
    wrapper = await mount()
    await flushPromises()
    notes.noteContent.value = 'Synthetic unsaved note'
    await router.push(`${current}?view=details`)
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe(`${current}?view=details`)
    expect(notes.noteContent.value).toBe('Synthetic unsaved note')
    expect(modal.isOpen.value).toBe(false)
    expect(api.mock.calls.filter(([, options]) => options.method !== 'GET')).toEqual([])
  })
})
