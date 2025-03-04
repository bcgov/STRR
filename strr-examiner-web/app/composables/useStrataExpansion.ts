import { StrataExpansionBusiness, StrataExpansionIndividuals, StrataExpansionBuildings } from '#components'

export const useStrataExpansion = (reg: ApiBaseStrataApplication | StrataHotelRegistrationResp) => {
  const exp = useStrrExpansion()

  const open = (component: any) => {
    exp.open(component, { data: reg })
  }

  const openBusiness = () => open(StrataExpansionBusiness)
  const openIndividuals = () => open(StrataExpansionIndividuals)
  const openAllBuildings = () => open(StrataExpansionBuildings)

  return {
    openBusiness,
    openIndividuals,
    openAllBuildings
  }
}
