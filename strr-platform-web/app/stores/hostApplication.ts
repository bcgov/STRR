export const useStrrHostApplication = defineStore('strr/hostApplication', () => {
  const { primaryContact, secondaryContact } = storeToRefs(useStrrHostContact())
  const { property } = storeToRefs(useStrrProperty())
  const { principal, supportingDocuments } = storeToRefs(useStrrPrincipal())

  const agreeToSubmit = ref(false)

  const getHostApplication = () => {
    return {
      primaryContact: primaryContact.value,
      secondaryContact: secondaryContact.value,
      propertyDetails: property.value,
      principal: principal.value,
      supportingDocuments: supportingDocuments.value
      // selectedAccount: {} as OrgI,
    }
  }
  // TODO: submit

  return {
    agreeToSubmit,
    getHostApplication
  }
})
