import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, vi, expect, beforeEach } from 'vitest'
import { enI18n } from '../mocks/i18n'
import { mockHostRegistration } from '../mocks/mockedData'
import HostExpansionOwnerContactInfo from '~/components/Host/Expansion/OwnerContactInfo.vue'
import HostExpansionOwners from '~/components/Host/Expansion/Owners.vue'

const mockOpenFilingHistory = vi.fn()
const mockOpenEditRegistrationEmailForm = vi.fn()
const mockCheckAndPerformAction = vi.fn((cb: () => void) => cb())

vi.mock('~/composables/useHostExpansion', () => ({
  useHostExpansion: () => ({
    openFilingHistory: mockOpenFilingHistory,
    openEditRegistrationEmailForm: mockOpenEditRegistrationEmailForm,
    checkAndPerformAction: mockCheckAndPerformAction,
    openHostOwners: vi.fn()
  })
}))

const mockFilingHistoryEvents = ref<any[]>([])

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    isApplication: ref(false),
    isEditingRegistrationEmail: ref(false),
    isAssignedToUser: ref(true),
    filingHistoryEvents: mockFilingHistoryEvents,
    activeReg: ref(mockHostRegistration)
  })
}))

describe('HostExpansionOwnerContactInfo Component', () => {
  const baseOwner: any = {
    role: 'HOST',
    ownerType: 'INDIVIDUAL',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: { countryCode: '1', number: '2501234567', extension: '' },
    faxNumber: '2507654321',
    emailAddress: 'jane.doe@example.com'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFilingHistoryEvents.value = []
  })

  it('renders phone, fax, and clean email when no failure exists', async () => {
    const wrapper = await mountSuspended(HostExpansionOwnerContactInfo, {
      props: {
        owner: baseOwner,
        display: 'primaryContact'
      },
      global: {
        plugins: [enI18n]
      }
    })

    expect(wrapper.text()).toContain('+1 (250) 123-4567')
    expect(wrapper.text()).toContain('2507654321')
    expect(wrapper.text()).toContain('jane.doe@example.com')
    expect(wrapper.find('[data-testid="owner-email-failed-badge"]').exists()).toBe(false)
  })

  it('displays failed email badge when email has delivery failure', async () => {
    mockFilingHistoryEvents.value = [
      {
        createdDate: '2026-10-28T10:00:00Z',
        eventName: 'EMAIL_FAILED',
        eventType: 'REGISTRATION',
        structuredDetails: {
          emailType: 'REGISTRATION_NOC',
          recipientStatuses: [
            {
              email_address: 'jane.doe@example.com',
              status: 'FAILED',
              provider_status: 'PERMANENT_FAILURE',
              failure_reason: 'Address rejected'
            }
          ]
        }
      }
    ]

    const wrapper = await mountSuspended(HostExpansionOwnerContactInfo, {
      props: {
        owner: baseOwner,
        display: 'primaryContact'
      },
      global: {
        plugins: [enI18n]
      }
    })

    const badge = wrapper.find('[data-testid="owner-email-failed-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('jane.doe@example.com')

    // Click on badge opens filing history
    await badge.trigger('click')
    expect(mockOpenFilingHistory).toHaveBeenCalledTimes(1)
  })

  it('triggers edit email form when clicking edit button', async () => {
    const wrapper = await mountSuspended(HostExpansionOwnerContactInfo, {
      props: {
        owner: baseOwner,
        display: 'primaryContact'
      },
      global: {
        plugins: [enI18n]
      }
    })

    const editBtn = wrapper.find('[data-testid="edit-owner-email-btn"]')
    expect(editBtn.exists()).toBe(true)
    await editBtn.trigger('click')
    expect(mockOpenEditRegistrationEmailForm).toHaveBeenCalledWith('primaryContact')
  })
})

describe('HostExpansionOwners Component', () => {
  it('mounts and renders owners table without errors', async () => {
    const wrapper = await mountSuspended(HostExpansionOwners, {
      props: {
        display: 'primaryContact'
      },
      global: {
        plugins: [enI18n]
      }
    })

    expect(wrapper.exists()).toBe(true)
  })
})
