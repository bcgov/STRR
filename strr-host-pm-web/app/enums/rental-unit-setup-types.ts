export enum RentalUnitSetupType {
  WHOLE_PRINCIPAL_RESIDENCE = 'WHOLE_PRINCIPAL_RESIDENCE', // The whole Host Principal Residence
  UNIT_ON_PR_PROPERTY = 'UNIT_ON_PR_PROPERTY', // A whole unit on the same property as the Host Principal Residence (e.g., basement suite)
  UNIT_NOT_ON_PR_PROPERTY = 'UNIT_NOT_ON_PR_PROPERTY' // Not on the same property as the Host Principal Residence
}

export enum RentalUnitSetupOption {
  OPTION_1 = 'OPTION_1', // unit on a property you don't live at
  OPTION_2 = 'OPTION_2', // unit on the property where you live
  OPTION_3 = 'OPTION_3' // renting or sharing the space you live in
}
