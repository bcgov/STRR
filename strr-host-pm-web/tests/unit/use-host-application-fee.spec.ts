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

async function mountApplicationFees () {
  let applicationFees!: ReturnType<typeof useHostApplicationFee>
  const wrapper = await mountSuspended(defineComponent({
    setup () {
      applicationFees = useHostApplicationFee()
      return () => null
    }
  }))
  return { wrapper, applicationFees }
}

describe('Host application fee lookup', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each([
    { isRenewal: false, codes: ['HOSTREG_1', 'HOSTREG_2', 'HOSTREG_3'] },
    { isRenewal: true, codes: ['HOSTREN_ON', 'HOSTRENOFF', 'HOSTREN_BB'] }
  ])('uses the API fee schedule when isRenewal=$isRenewal', async ({ isRenewal, codes }) => {
    const getFee = vi.spyOn(useConnectFeeStore(), 'getFee')
      .mockImplementation((_entity, code) => Promise.resolve({ ...fee, filingTypeCode: code }))
    const { wrapper, applicationFees } = await mountApplicationFees()

    await applicationFees.fetchStrrFees(isRenewal)
    expect(getFee.mock.calls).toEqual(codes.map(code => ['STRR', code]))
    expect(applicationFees.getApplicationFee(
      PropertyType.SINGLE_FAMILY_HOME, RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE
    )?.filingTypeCode).toBe(codes[0])
    expect(applicationFees.getApplicationFee(
      PropertyType.SINGLE_FAMILY_HOME, RentalUnitSetupOption.SEPARATE_UNIT_SAME_PROPERTY
    )?.filingTypeCode).toBe(codes[1])
    expect(applicationFees.getApplicationFee(
      PropertyType.BED_AND_BREAKFAST, RentalUnitSetupOption.DIFFERENT_PROPERTY
    )?.filingTypeCode).toBe(codes[2])
    wrapper.unmount()
  })

  it('keeps a failed fee unavailable while allowing other fee categories', async () => {
    const getFee = vi.spyOn(useConnectFeeStore(), 'getFee')
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ ...fee, filingTypeCode: StrrFeeCode.STR_HOST_2 })
      .mockResolvedValueOnce({ ...fee, filingTypeCode: StrrFeeCode.STR_HOST_3 })
    const { wrapper, applicationFees } = await mountApplicationFees()

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
