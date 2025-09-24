type FeeMatrix = Partial<
  Record<
    PropertyType,
    Partial<Record<RentalUnitSetupOption, ConnectFeeItem>>
  >
>

export const useHostApplicationFee = () => {
  const { getFee } = useConnectFeeStore()

  const APPLICATION_FEE_MATRIX = ref<FeeMatrix>({})

  /**
   * Fetch three different STRR fees and setup application fee matrix based on the retrieved fees.
   */
  const fetchStrrFees = async () => {
    const [fee1, fee2, fee3] = await Promise.all([
      getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_HOST_1),
      getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_HOST_2),
      getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_HOST_3)
    ])

    APPLICATION_FEE_MATRIX.value = {
      [PropertyType.SINGLE_FAMILY_HOME]: {
        [RentalUnitSetupOption.OPTION_1]: fee2, // $450
        [RentalUnitSetupOption.OPTION_2]: fee2, // $450
        [RentalUnitSetupOption.OPTION_3]: fee1 // $100
      },
      [PropertyType.SECONDARY_SUITE]: {
        [RentalUnitSetupOption.OPTION_1]: fee2, // $450
        [RentalUnitSetupOption.OPTION_2]: fee2, // $450
        [RentalUnitSetupOption.OPTION_3]: fee1 // $100
      },
      [PropertyType.ACCESSORY_DWELLING]: {
        [RentalUnitSetupOption.OPTION_1]: fee2, // $450
        [RentalUnitSetupOption.OPTION_2]: fee2, // $450
        [RentalUnitSetupOption.OPTION_3]: fee1 // $100
      },
      [PropertyType.MULTI_UNIT_HOUSING]: {
        [RentalUnitSetupOption.OPTION_1]: fee2, // $450
        [RentalUnitSetupOption.OPTION_2]: fee2, // $450
        [RentalUnitSetupOption.OPTION_3]: fee1 // $100
      },
      [PropertyType.BED_AND_BREAKFAST]: {
        [RentalUnitSetupOption.OPTION_1]: fee3, // $100
        [RentalUnitSetupOption.OPTION_2]: fee3, // $100
        [RentalUnitSetupOption.OPTION_3]: fee3 // $100
      },
      [PropertyType.FLOAT_HOME]: {
        [RentalUnitSetupOption.OPTION_1]: fee2, // $450
        [RentalUnitSetupOption.OPTION_2]: fee2, // $450
        [RentalUnitSetupOption.OPTION_3]: fee1 // $100
      },
      [PropertyType.STRATA_HOTEL]: {
        [RentalUnitSetupOption.OPTION_1]: fee2, // $450
        [RentalUnitSetupOption.OPTION_2]: fee2, // $450
        [RentalUnitSetupOption.OPTION_3]: fee1 // $100
      }
    }

    return {
      fee1,
      fee2,
      fee3
    }
  }

  const getApplicationFee = (
    propertyType: PropertyType,
    rentalUnitSetupOption: RentalUnitSetupOption
  ): ConnectFeeItem | {} => {
    return APPLICATION_FEE_MATRIX.value[propertyType]?.[rentalUnitSetupOption] || {}
  }

  return {
    fetchStrrFees,
    getApplicationFee
  }
}
