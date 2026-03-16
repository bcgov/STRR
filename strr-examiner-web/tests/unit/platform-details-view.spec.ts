import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi } from 'vitest'
import { mockPlatformRegistration } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import PlatformDetailsView from '~/components/PlatformDetailsView.vue'

const isApplication = ref(false)
const activeReg = ref<any>(mockPlatformRegistration)

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    isApplication,
    activeHeader: ref(mockPlatformRegistration.header),
    activeReg
  })
}))

const mockPlatformApplicationReg = {
  ...mockPlatformRegistration,
  completingParty: {
    firstName: 'Alice',
    lastName: 'Johnson',
    emailAddress: 'alice@example.com',
    phoneNumber: '412345678'
  }
}

describe('Platform Details view', () => {
  it('should render platform representative and business details for a registration', async () => {
    isApplication.value = false
    activeReg.value = mockPlatformRegistration

    const wrapper = await mountSuspended(PlatformDetailsView, { global: { plugins: [enI18n] } })

    const text = wrapper.text()
    expect(text).toContain('Bob Jones') // platform representative name
    expect(text).toContain('bob.jones@example.com') // representative email
    expect(text).toContain('Test Platform Inc.') // business legal name
    expect(wrapper.find('dl').exists()).toBe(true)
    expect(text).not.toContain('Completing Party') // hidden for registrations
  })

  it('should show completing party details when viewing an application', async () => {
    isApplication.value = true
    activeReg.value = mockPlatformApplicationReg

    const wrapper = await mountSuspended(PlatformDetailsView, { global: { plugins: [enI18n] } })

    const text = wrapper.text()
    expect(text).toContain('Completing Party')
    expect(text).toContain('Alice Johnson')
    expect(text).toContain('alice@example.com')
  })
})
