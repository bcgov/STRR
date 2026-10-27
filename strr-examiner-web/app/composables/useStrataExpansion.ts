import {
  StrataExpansionBusiness,
  StrataExpansionIndividuals,
  StrataExpansionBuildings,
  StrataExpansionRentalUnits
} from '#components'

export const useStrataExpansion = () => {
  const exp = useStrrExpansion()
  const { isFilingHistoryOpen } = storeToRefs(useExaminerStore())

  const open = (component: any) => {
    exp.open(component, {})
    // the panel replaces Filing History, so the header toggle must not keep saying "Hide History"
    isFilingHistoryOpen.value = false
  }

  const openBusiness = () => open(StrataExpansionBusiness)
  const openIndividuals = () => open(StrataExpansionIndividuals)
  const openAllBuildings = () => open(StrataExpansionBuildings)
  const openRentalUnits = () => open(StrataExpansionRentalUnits)

  return {
    openBusiness,
    openIndividuals,
    openAllBuildings,
    openRentalUnits
  }
}
