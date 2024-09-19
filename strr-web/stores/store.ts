import { strrStateModel } from './state/strr-state-model'

export const useStrrStore = defineStore('strrStore', () => {
  const state = ref({ ...strrStateModel })

  // Getters
  const getApplicationId = computed((): string => {
    return state.value.applicationId
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
  function setApplicationId (appNum: string) {
    state.value.applicationId = appNum
  }

  function setApplicationNickname (appNickname: string) {
    state.value.applicationNickname = appNickname
  }

  function setRegistrationNumber (regNum: string) {
    state.value.registrationNumber = regNum
  }

  return {
    getApplicationId,
    getApplicationNickname,
    getRegistrationId,
    getRegistrationNumber,
    setApplicationId,
    setApplicationNickname,
    setRegistrationNumber
  }
})
