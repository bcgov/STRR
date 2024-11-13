export const useConnectDetailsHeaderStore = defineStore('connect/detailsHeader', () => {
  const loading = ref(false)
  const title = ref<string | undefined>(undefined)
  const subtitles = ref<ConnectDetailHeaderItem[]>([])
  const details = ref<ConnectDetailHeaderItem[]>([])
  const sideDetails = ref<ConnectDetailHeaderSideDetail[]>([])
  const bottomButtons = ref<{ action: Function, label: string, icon?: string, trailingIcon?: string }[]>([])

  return {
    loading,
    title,
    subtitles,
    details,
    sideDetails,
    bottomButtons
  }
})
