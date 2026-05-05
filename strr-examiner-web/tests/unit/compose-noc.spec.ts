import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, vi, expect, beforeEach } from 'vitest'
import { enI18n } from '../mocks/i18n'
import ComposeNoc from '~/components/ComposeNoc.vue'

const mockState = {
  hasRegistrationNumber: false,
  showComposeEmail: true,
  showComposeNocEmail: false,
  isAssignedToUser: true,
  isApplication: true,
  registrationType: ApplicationType.HOST,
  applicationType: 'registration'
}

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    hasRegistrationNumber: ref(mockState.hasRegistrationNumber),
    showComposeEmail: ref(mockState.showComposeEmail),
    showComposeNocEmail: ref(mockState.showComposeNocEmail),
    isAssignedToUser: ref(mockState.isAssignedToUser),
    isApplication: ref(mockState.isApplication),
    activeReg: ref({ registrationType: mockState.registrationType }),
    emailContent: ref({ content: '' }),
    activeHeader: ref({ applicationType: mockState.applicationType }),
    sendNocSchema: ref({}),
    sendEmailSchema: ref({})
  })
}))

describe('ComposeNoc Component', () => {
  beforeEach(() => {
    mockState.hasRegistrationNumber = false
    mockState.showComposeEmail = true
    mockState.showComposeNocEmail = false
    mockState.isAssignedToUser = true
    mockState.isApplication = true
    mockState.registrationType = ApplicationType.HOST
    mockState.applicationType = 'registration'
  })

  it('should show compose email form when application has no registration number', async () => {
    const wrapper = await mountSuspended(ComposeNoc, {
      global: { plugins: [enI18n] }
    })
    expect(wrapper.find('[data-testid="compose-email"]').exists()).toBe(true)
  })

  it('should not show compose email form when application has a registration number', async () => {
    mockState.hasRegistrationNumber = true
    const wrapper = await mountSuspended(ComposeNoc, {
      global: { plugins: [enI18n] }
    })
    expect(wrapper.find('[data-testid="compose-email"]').exists()).toBe(false)
  })

  it('should show compose email form for strata hotel renewal with registration number', async () => {
    mockState.hasRegistrationNumber = true
    mockState.showComposeNocEmail = true
    mockState.registrationType = ApplicationType.STRATA_HOTEL
    mockState.applicationType = 'renewal'
    const wrapper = await mountSuspended(ComposeNoc, {
      global: { plugins: [enI18n] }
    })
    expect(wrapper.find('[data-testid="compose-email"]').exists()).toBe(true)
  })
})
