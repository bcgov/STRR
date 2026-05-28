import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { emptyTodoRegistration } from './helpers/renewal-test-utils'

const replaceMock = vi.fn().mockResolvedValue(undefined)
const mockRoute = {
  path: '/en-CA/application',
  query: { renew: 'true' } as Record<string, string>,
  meta: {} as Record<string, unknown>
}

mockNuxtImport('useRouter', () => () => ({ replace: replaceMock }))
mockNuxtImport('useRoute', () => () => mockRoute)

vi.mock('@/composables/useRouterParams', () => ({
  useRouterParams: () => ({
    applicationId: computed(() => mockRoute.query.applicationId),
    isRenewal: computed(() => mockRoute.query.renew === 'true')
  })
}))

const getTodoRegistrationMock = vi.fn()

vi.mock('#baseWeb/utils/todoItems', () => ({
  getTodoRegistration: (...args: unknown[]) => getTodoRegistrationMock(...args)
}))

const registrationRef = ref<{ id: number } | undefined>({ id: 7 })
const applicationRef = ref<{ header: { applicationNumber: string, applicationType?: string } } | undefined>()
const effectiveRegistrationIdRef = ref<string | undefined>('42')
const isRegistrationRenewalRef = ref(false)
const loadHostDataMock = vi.fn()
const loadHostRegistrationDataMock = vi.fn()
const persistSelectedRegistrationIdMock = vi.fn()

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: () => ({
    loadHostRegistrationData: loadHostRegistrationDataMock,
    loadHostData: loadHostDataMock,
    application: applicationRef,
    registration: registrationRef,
    isRegistrationRenewal: isRegistrationRenewalRef,
    effectiveRegistrationId: effectiveRegistrationIdRef,
    persistSelectedRegistrationId: persistSelectedRegistrationIdMock
  })
}))

async function useDraft () {
  const { useHostApplicationDraft } = await import('@/composables/useHostApplicationDraft')
  return useHostApplicationDraft()
}

function resetDraftState () {
  mockRoute.query = { renew: 'true' }
  registrationRef.value = { id: 7 }
  applicationRef.value = undefined
  effectiveRegistrationIdRef.value = '42'
  isRegistrationRenewalRef.value = false
  getTodoRegistrationMock.mockResolvedValue({
    ...emptyTodoRegistration,
    hasRenewalDraft: true,
    renewalDraftId: 'DRAFT-APP-123'
  })
}

describe('useHostApplicationDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetDraftState()
  })

  describe('effectiveApplicationNumber', () => {
    it('prefers draftApplicationId over application header and query', async () => {
      mockRoute.query = { renew: 'true', applicationId: 'QUERY-ID' }
      applicationRef.value = { header: { applicationNumber: 'HEADER-ID' } }
      const { effectiveApplicationNumber, draftApplicationId } = await useDraft()
      draftApplicationId.value = 'DRAFT-LOCAL'
      expect(effectiveApplicationNumber.value).toBe('DRAFT-LOCAL')
    })
  })

  describe('persistDraftApplicationId', () => {
    it('syncs query and persists registration id from registration', async () => {
      const { persistDraftApplicationId, draftApplicationId } = await useDraft()
      await persistDraftApplicationId('APP-999')
      expect(draftApplicationId.value).toBe('APP-999')
      expect(replaceMock).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.objectContaining({ applicationId: 'APP-999' }) })
      )
      expect(persistSelectedRegistrationIdMock).toHaveBeenCalledWith(7)
    })
  })

  describe('resumeRenewalDraftFromTodosIfNeeded', () => {
    it('resumes renewal draft from todos and syncs applicationId to the query', async () => {
      await (await useDraft()).loadInitialPermitData()
      await flushPromises()

      expect(getTodoRegistrationMock).toHaveBeenCalledWith(7)
      expect(replaceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ renew: 'true', applicationId: 'DRAFT-APP-123' })
        })
      )
      expect(loadHostDataMock).toHaveBeenCalledWith('DRAFT-APP-123', true)
      expect(isRegistrationRenewalRef.value).toBe(true)
    })

    it.each([
      ['applicationId is in the query', { query: { renew: 'true', applicationId: 'EXISTING' } }]
    ])('does not fetch todos when %s', async (_label, setup) => {
      if ('query' in setup && setup.query) {
        mockRoute.query = setup.query
      }
      await (await useDraft()).loadInitialPermitData()
      await flushPromises()
      expect(getTodoRegistrationMock).not.toHaveBeenCalled()
    })

    it.each([
      ['todos have no renewal draft id', emptyTodoRegistration]
    ])('does not load draft when %s', async (_label, todoResponse) => {
      getTodoRegistrationMock.mockResolvedValue(todoResponse)
      await (await useDraft()).loadInitialPermitData()
      await flushPromises()
      expect(getTodoRegistrationMock).toHaveBeenCalledWith(7)
      expect(loadHostDataMock).not.toHaveBeenCalled()
    })
  })

  describe('loadInitialPermitData', () => {
    it.each([
      [
        'renew flow with applicationId in query',
        { query: { renew: 'true', applicationId: 'RENEW-APP' }, effectiveId: undefined },
        { loadReg: false, loadApp: ['RENEW-APP', true], renewal: true }
      ],
      [
        'applicationId with renewal type',
        {
          query: { applicationId: 'APP-RENEWAL-TYPE' },
          effectiveId: undefined,
          application: { header: { applicationNumber: 'APP-RENEWAL-TYPE', applicationType: 'renewal' } }
        },
        { loadReg: false, loadApp: ['APP-RENEWAL-TYPE', true], renewal: true }
      ],
      [
        'no renewal flow and no applicationId',
        { query: {}, effectiveId: undefined },
        { loadReg: false, loadApp: null, renewal: false }
      ]
    ])('%s', async (_label, setup, expected) => {
      mockRoute.query = setup.query
      effectiveRegistrationIdRef.value = setup.effectiveId
      if ('application' in setup && setup.application) {
        applicationRef.value = setup.application
      } else {
        applicationRef.value = undefined
      }

      await (await useDraft()).loadInitialPermitData()

      if (expected.loadReg) {
        expect(loadHostRegistrationDataMock).toHaveBeenCalled()
      } else {
        expect(loadHostRegistrationDataMock).not.toHaveBeenCalled()
      }
      if (expected.loadApp) {
        expect(loadHostDataMock).toHaveBeenCalledWith(...expected.loadApp)
      } else {
        expect(loadHostDataMock).not.toHaveBeenCalled()
      }
      expect(isRegistrationRenewalRef.value).toBe(expected.renewal)
    })
  })
})
