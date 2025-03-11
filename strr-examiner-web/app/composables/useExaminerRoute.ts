export const useExaminerRoute = () => {
  const localePath = useLocalePath()
  const { setButtonControl } = useButtonControl()
  const exStore = useExaminerStore()
  const { activeReg, isApplication, activeHeader } = storeToRefs(exStore)

  const updateRouteAndButtons = (
    routePrefix: string,
    buttonConfig: {
      approve?: {
        action: (id: string) => void
        label: string
      }
      reject?: {
        action: (id: string) => void
        label: string
      }
      sendNotice?: {
        action: (id: string) => void
        label: string
      }
      cancel?: {
        action: (id: number) => void
        label: string
      }
    }
  ) => {
    if (!activeReg.value) {
      setButtonControl({ leftButtons: [], rightButtons: [] })
      return
    }

    let id: string | number | undefined
    let examinerActions: string[] = []
    if (isApplication.value && activeHeader.value) {
      id = activeHeader.value.applicationNumber
    } else if (activeReg.value) {
      id = activeReg.value.id
    }
    if (activeHeader.value && activeHeader.value.examinerActions) {
      examinerActions = activeHeader.value.examinerActions
    }

    if (id) {
      window.history.replaceState(
        history.state,
        '',
        localePath(`${routePrefix}/${id}`)
      )

      if (examinerActions && examinerActions.length > 0) {
        const leftButtons: ConnectBtnControlItem[] = []
        const rightButtons: ConnectBtnControlItem[] = []

        if (examinerActions.includes('SEND_NOC') && buttonConfig.sendNotice) {
          rightButtons.push({
            action: () => buttonConfig.sendNotice.action(id as string),
            label: buttonConfig.sendNotice.label,
            variant: 'outline',
            color: 'blue',
            icon: 'i-mdi-send'
          })
        }

        if (examinerActions.includes('REJECT') && buttonConfig.reject) {
          rightButtons.push({
            action: () => buttonConfig.reject.action(id as string),
            label: buttonConfig.reject.label,
            variant: 'outline',
            color: 'red',
            icon: 'i-mdi-close'
          })
        }

        if (examinerActions.includes('APPROVE') && buttonConfig.approve) {
          rightButtons.push({
            action: () => buttonConfig.approve.action(id as string),
            label: buttonConfig.approve.label,
            variant: 'outline',
            color: 'green',
            icon: 'i-mdi-check'
          })
        }

        if (examinerActions.includes('CANCEL') && buttonConfig.cancel) {
          rightButtons.push({
            action: () => buttonConfig.cancel.action(id as number),
            label: buttonConfig.cancel.label,
            variant: 'outline',
            color: 'red',
            icon: 'i-mdi-close'
          })
        }

        setButtonControl({
          leftButtons,
          rightButtons
        })
      } else {
        setButtonControl({ leftButtons: [], rightButtons: [] })
      }
    }
  }

  return {
    updateRouteAndButtons
  }
}
