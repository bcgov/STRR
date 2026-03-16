import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mockHostRegistration, mockSnapshots } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import SnapshotDetails from '~/pages/registration/[registrationId]/snapshots/[snapshotId].vue'
import { ApplicationDetailsView, RegistrationInfoHeader } from '#components'

const mockSnapshotResponse = {
  ...mockSnapshots[0],
  snapshotData: mockHostRegistration
}

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    getSnapshotById: vi.fn().mockResolvedValue(mockSnapshotResponse),
    activeRecord: ref(mockHostRegistration),
    activeReg: ref(mockHostRegistration),
    activeHeader: ref(mockHostRegistration.header),
    isApplication: ref(false),
    snapshotInfo: ref(mockSnapshots[0]),
    isFilingHistoryOpen: ref(false),
    isEditingRentalUnit: ref(false),
    hasUnsavedRentalUnitChanges: ref(false),
    startEditRentalUnitAddress: vi.fn(),
    resetEditRentalUnitAddress: vi.fn()
  })
}))

describe('Snapshot Details Page', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(SnapshotDetails, {
      global: { plugins: [enI18n] }
    })
    await nextTick()
  })

  it('should render Snapshot Details page', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(ApplicationDetailsView).exists()).toBe(true)
    expect(wrapper.findComponent(RegistrationInfoHeader).exists()).toBe(true)
  })

  it('should render RegistrationInfoHeader inside ApplicationDetailsView', () => {
    const appDetailsView = wrapper.findComponent(ApplicationDetailsView)
    expect(appDetailsView.findComponent(RegistrationInfoHeader).exists()).toBe(true)
  })
})
