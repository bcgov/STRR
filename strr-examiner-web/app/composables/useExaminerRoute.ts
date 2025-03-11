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
      suspend?: {
        action: (id: number) => void
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
    let examinerActions: string[] | undefined = []
    if (isApplication.value) {
      id = activeHeader.value.applicationNumber
    } else {
      id = activeReg.value.id
    }
    examinerActions = activeHeader.value.examinerActions || []

    if (id) {
      window.history.replaceState(
        history.state,
        '',
        localePath(`${routePrefix}/${id}`)
      )

      if (examinerActions && examinerActions.length > 0) {
        const leftButtons: ConnectBtnControlItem[] = []
        const rightButtons: ConnectBtnControlItem[] = []

        examinerActions.forEach((action) => {
          if (action === 'APPROVE' && buttonConfig.approve) {
            rightButtons.push({
              action: () => buttonConfig.approve.action(id as string),
              label: buttonConfig.approve.label,
              variant: 'outline',
              color: 'green',
              icon: 'i-mdi-check'
            })
          } else if (action === 'REJECT' && buttonConfig.reject) {
            rightButtons.push({
              action: () => buttonConfig.reject.action(id as string),
              label: buttonConfig.reject.label,
              variant: 'outline',
              color: 'red',
              icon: 'i-mdi-close'
            })
          } else if (action === 'SUSPEND' && buttonConfig.suspend) {
            rightButtons.push({
              action: () => buttonConfig.suspend.action(id as number),
              label: buttonConfig.suspend.label,
              variant: 'outline',
              color: 'blue',
              icon: 'i-mdi-pause'
            })
          } else if (action === 'CANCEL' && buttonConfig.cancel) {
            rightButtons.push({
              action: () => buttonConfig.cancel.action(id as number),
              label: buttonConfig.cancel.label,
              variant: 'outline',
              color: 'red',
              icon: 'i-mdi-close'
            })
          }
        })

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
