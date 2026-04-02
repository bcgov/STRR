import { mountSuspended } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { describe, it, expect, vi } from 'vitest'
import { mockStrataDetails, mockRenewalStrataDetails } from '../mocks/mockedData'
import StrataDetailsForm from '~/components/form/StrataDetails.vue'
import { ConnectFormAddress } from '#components'

const mockIsRegistrationRenewal = ref(false)
const mockStrataDetailsRef = ref(mockStrataDetails)
const mockOriginalBuildingCount = ref(0)

vi.mock('@/stores/strata', () => ({
  useStrrStrataStore: () => ({
    isRegistrationRenewal: mockIsRegistrationRenewal
  })
}))

vi.mock('@/stores/strataDetails', () => ({
  useStrrStrataDetailsStore: () => ({
    strataDetails: mockStrataDetailsRef,
    originalBuildingCount: mockOriginalBuildingCount
  })
}))

const mountComponent = (overrides: any = {}) => {
  mockIsRegistrationRenewal.value = overrides.isRegistrationRenewal ?? false
  mockOriginalBuildingCount.value = overrides.originalBuildingCount ?? 0
  mockStrataDetailsRef.value = overrides.strataDetails ?? mockStrataDetails

  return mountSuspended(StrataDetailsForm, {
    props: { isComplete: false }
  })
}

describe('StrataDetails form component', () => {
  it('new application - lock only country and region in primary address', async () => {
    const wrapper = await mountComponent()

    const addresses = wrapper.findAllComponents(ConnectFormAddress)
    expect(addresses.length).toBeGreaterThan(0)

    const primaryAddressDisabledFields = addresses[0].props('disabledFields')
    expect(primaryAddressDisabledFields).toHaveLength(2)
    expect(primaryAddressDisabledFields).toContain('country')
    expect(primaryAddressDisabledFields).toContain('region')
  })

  it('renewal - should correctly disable fields for editing', async () => {
    const wrapper = await mountComponent({
      isRegistrationRenewal: true,
      originalBuildingCount: 1,
      strataDetails: mockRenewalStrataDetails
    })

    const addresses = wrapper.findAllComponents(ConnectFormAddress)
    expect(addresses.length).toBeGreaterThanOrEqual(3)

    // pre-existing building - disable all fields
    expect(addresses[1]!.props('disabledFields')).toHaveLength(10)

    // new added building - disable only country and region
    const newBuildingFields = addresses[2]!.props('disabledFields')
    expect(newBuildingFields).toHaveLength(2)
    expect(newBuildingFields).toContain('country')
    expect(newBuildingFields).toContain('region')
  })
})
