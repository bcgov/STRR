import { StrataExpansionBusiness, StrataExpansionIndividuals, StrataExpansionBuildings } from '#components'

export const useStrataExpansion = () => {
  const exp = useStrrExpansion()

  const open = (component: any) => {
    exp.open(component, {})
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
