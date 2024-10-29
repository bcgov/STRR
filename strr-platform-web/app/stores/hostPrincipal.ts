export const useStrrPrincipal = defineStore('strr/principal', () => {
  const principal = ref({
    isPrincipal: undefined,
    reason: undefined,
    otherReason: undefined,
    declaration: false
  })

  const supportingDocuments = ref<{ name: string }[]>([])

  return {
    principal,
    supportingDocuments
  }
})
