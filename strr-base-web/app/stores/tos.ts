interface TOSPatchResponse {
  isTermsOfUseAccepted: boolean
  termsOfUseAcceptedVersion: string
}

interface TOSGetResponse {
  isTermsOfUseAccepted: boolean
  termsOfUseAcceptedVersion: string | null
  termsOfUseCurrentVersion: string
  termsOfUse: string
}

// TODO: make this generic for the core layer?
// will require the following api calls
// await $authApi('/users/@me') <-- this is breaking for Sergey, will need to fix this before adding to core layer
// await $authApi('/documents/termsofuse')

export const useTosStore = defineStore('strr/terms-of-service', () => {
  const { $strrApi } = useNuxtApp()
  const loading = ref<boolean>(false)
  const tos = ref<TOSGetResponse>({} as TOSGetResponse)

  async function getTermsOfUse ():Promise<void> {
    try {
      loading.value = true
      // make sure user is in auth before fetching tos
      await $strrApi('/users', { method: 'POST' }) // TODO: fix in core layer
      tos.value = await $strrApi<TOSGetResponse>('/users/tos')
    } catch {
      // handled with fallback content on tos page
    } finally {
      loading.value = false
    }
  }

  // form submit event
  async function patchTermsOfUse () {
    const res = await $strrApi<TOSPatchResponse>('/users/tos', {
      method: 'PATCH',
      body: {
        istermsaccepted: true,
        termsversion: tos.value.termsOfUseCurrentVersion
      }
    })

    // update tos accepted to match patch response or middleware will run again
    tos.value.isTermsOfUseAccepted = res.isTermsOfUseAccepted
  }

  function $reset () {
    sessionStorage.removeItem('strr/terms-of-service') // required to reset store on logout
    loading.value = false
    tos.value = {} as TOSGetResponse
  }

  return {
    loading,
    tos,
    getTermsOfUse,
    patchTermsOfUse,
    $reset
  }
},
{ persist: true } // this will persist in session storage so we only load the tos once per session
)
