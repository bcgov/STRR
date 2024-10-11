import { strrStateModel } from './state/strr-state-model'

export const useStrrStore = defineStore('strrStore', () => {
  const state = ref({ ...strrStateModel })

  // Getters
  const getApplicationNumber = computed((): string => {
    return state.value.applicationNumber
  })

  const getRegistrationId = computed((): string => {
    return state.value.registrationId
  })

  const getApplicationNickname = computed((): string => {
    return state.value.applicationNickname
  })

  const getRegistrationNumber = computed((): string => {
    return state.value.registrationNumber
  })

  // Setters
  function setApplicationNumber (appNum: string) {
    state.value.applicationNumber = appNum
  }

  function setApplicationNickname (appNickname: string) {
    state.value.applicationNickname = appNickname
  }

  function setRegistrationNumber (regNum: string) {
    state.value.registrationNumber = regNum
  }

  return {
    getApplicationNumber,
    getApplicationNickname,
    getRegistrationId,
    getRegistrationNumber,
    setApplicationNumber,
    setApplicationNickname,
    setRegistrationNumber
  }
})
