import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, vi, expect, beforeEach } from 'vitest'
import { enI18n } from '../mocks/i18n'
import ComposeNoc from '~/components/ComposeNoc.vue'

const mockState = {
  hasRegistrationNumber: false,
  showComposeEmail: true,
  isAssignedToUser: true
}

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    hasRegistrationNumber: ref(mockState.hasRegistrationNumber),
    showComposeEmail: ref(mockState.showComposeEmail),
    showComposeNocEmail: ref(false),
    isAssignedToUser: ref(mockState.isAssignedToUser),
    emailContent: ref({ content: '' }),
    activeHeader: ref(null),
    sendNocSchema: ref({})
  })
}))

describe('ComposeNoc Component', () => {
  beforeEach(() => {
    mockState.hasRegistrationNumber = false
    mockState.showComposeEmail = true
    mockState.isAssignedToUser = true
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
})
