type FeeMatrix = Partial<
  Record<
    PropertyType,
    Partial<Record<RentalUnitSetupOption, ConnectFeeItem>>
  >
>

export const useHostApplicationFee = () => {
  const { getFee } = useConnectFeeStore()

  let APPLICATION_FEE_MATRIX: FeeMatrix = {}

  /**
   * Fetch three different STRR fees and setup application fee matrix based on the retrieved fees.
   */
  const fetchStrrFees = async () => {
    const [fee1, fee2, fee3] = await Promise.all([
      getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_HOST_1),
      getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_HOST_2),
      getFee(StrrFeeEntityType.STRR, StrrFeeCode.STR_HOST_3)
    ])

    APPLICATION_FEE_MATRIX = {
      [PropertyType.SINGLE_FAMILY_HOME]: {
        [RentalUnitSetupOption.DIFFERENT_PROPERTY]: fee2, // $450
        [RentalUnitSetupOption.SEPARATE_UNIT_SAME_PROPERTY]: fee2, // $450
        [RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE]: fee1 // $100
      },
      [PropertyType.SECONDARY_SUITE]: {
        [RentalUnitSetupOption.DIFFERENT_PROPERTY]: fee2, // $450
        [RentalUnitSetupOption.SEPARATE_UNIT_SAME_PROPERTY]: fee2, // $450
        [RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE]: fee1 // $100
      },
      [PropertyType.ACCESSORY_DWELLING]: {
        [RentalUnitSetupOption.DIFFERENT_PROPERTY]: fee2, // $450
        [RentalUnitSetupOption.SEPARATE_UNIT_SAME_PROPERTY]: fee2, // $450
        [RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE]: fee1 // $100
      },
      [PropertyType.MULTI_UNIT_HOUSING]: {
        [RentalUnitSetupOption.DIFFERENT_PROPERTY]: fee2, // $450
        [RentalUnitSetupOption.SEPARATE_UNIT_SAME_PROPERTY]: fee2, // $450
        [RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE]: fee1 // $100
      },
      [PropertyType.BED_AND_BREAKFAST]: {
        [RentalUnitSetupOption.DIFFERENT_PROPERTY]: fee3, // $100
        [RentalUnitSetupOption.SEPARATE_UNIT_SAME_PROPERTY]: fee3, // $100
        [RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE]: fee3 // $100
      },
      [PropertyType.FLOAT_HOME]: {
        [RentalUnitSetupOption.DIFFERENT_PROPERTY]: fee2, // $450
        [RentalUnitSetupOption.SEPARATE_UNIT_SAME_PROPERTY]: fee2, // $450
        [RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE]: fee1 // $100
      },
      [PropertyType.STRATA_HOTEL]: {
        [RentalUnitSetupOption.DIFFERENT_PROPERTY]: fee2, // $450
        [RentalUnitSetupOption.SEPARATE_UNIT_SAME_PROPERTY]: fee2, // $450
        [RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE]: fee1 // $100
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
    return APPLICATION_FEE_MATRIX[propertyType]?.[rentalUnitSetupOption] || {}
  }

  return {
    fetchStrrFees,
    getApplicationFee
  }
}
