export enum RentalUnitSetupType {
  WHOLE_PRINCIPAL_RESIDENCE = 'WHOLE_PRINCIPAL_RESIDENCE', // The whole Host Principal Residence
  UNIT_ON_PR_PROPERTY = 'UNIT_ON_PR_PROPERTY', // A whole unit on the same property as the Host Principal Residence (e.g., basement suite)
  UNIT_NOT_ON_PR_PROPERTY = 'UNIT_NOT_ON_PR_PROPERTY' // Not on the same property as the Host Principal Residence
}

export enum RentalUnitSetupOption {
  DIFFERENT_PROPERTY = 'DIFFERENT_PROPERTY', // unit on a property you don't live at
  SEPARATE_UNIT_SAME_PROPERTY = 'SEPARATE_UNIT_SAME_PROPERTY', // unit on the property where you live
  PRIMARY_RESIDENCE_OR_SHARED_SPACE = 'PRIMARY_RESIDENCE_OR_SHARED_SPACE' // renting or sharing the space you live in
}
