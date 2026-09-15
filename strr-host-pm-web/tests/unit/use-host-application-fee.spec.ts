import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useHostApplicationFee } from '~/composables/useHostApplicationFee'

const fee: ConnectFeeItem = {
  filingTypeCode: StrrFeeCode.STR_HOST_1,
  filingType: 'Host registration',
  filingFees: 100,
  serviceFees: 1.5,
  total: 101.5,
  futureEffectiveFees: 0,
  priorityFees: 0,
  processingFees: 0,
  tax: { gst: 0, pst: 0 }
}

describe('Host application fee lookup', () => {
  afterEach(() => vi.restoreAllMocks())

  it('keeps a failed fee unavailable while allowing other fee categories', async () => {
    const getFee = vi.spyOn(useConnectFeeStore(), 'getFee')
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ ...fee, filingTypeCode: StrrFeeCode.STR_HOST_2 })
      .mockResolvedValueOnce({ ...fee, filingTypeCode: StrrFeeCode.STR_HOST_3 })
    let applicationFees!: ReturnType<typeof useHostApplicationFee>
    const wrapper = await mountSuspended(defineComponent({
      setup () {
        applicationFees = useHostApplicationFee()
        return () => null
      }
    }))

    await applicationFees.fetchStrrFees()

    expect(getFee).toHaveBeenCalledTimes(3)
    expect(applicationFees.getApplicationFee(
      PropertyType.SINGLE_FAMILY_HOME, RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE
    )).toBeUndefined()
    expect(applicationFees.getApplicationFee(
      PropertyType.SINGLE_FAMILY_HOME, RentalUnitSetupOption.DIFFERENT_PROPERTY
    )).toMatchObject({ filingTypeCode: StrrFeeCode.STR_HOST_2 })
    expect(applicationFees.getApplicationFee(
      PropertyType.BED_AND_BREAKFAST, RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE
    )).toMatchObject({ filingTypeCode: StrrFeeCode.STR_HOST_3 })

    getFee.mockResolvedValue(fee)
    await applicationFees.fetchStrrFees()
    expect(applicationFees.getApplicationFee(
      PropertyType.SINGLE_FAMILY_HOME, RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE
    )).toEqual(fee)
    wrapper.unmount()
  })
})
