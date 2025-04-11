import { ApplicationActionsE, RegistrationActionsE } from '@/enums/actions'

export const useExaminerRoute = () => {
  const localePath = useLocalePath()
  const { setButtonControl, getButtonControl } = useButtonControl()
  const exStore = useExaminerStore()
  const { activeReg, isApplication, activeHeader } = storeToRefs(exStore)

  const updateRouteAndButtons = (
    routePrefix: string,
    buttonConfig: {
      approve?: {
        action: (id: string) => void
        label: string
        disabled?: boolean
      }
      reject?: {
        action: (id: string) => void
        label: string
        disabled?: boolean
      }
      sendNotice?: {
        action: (id: string) => void
        label: string
        disabled?: boolean
      }
      cancel?: {
        action: (id: number) => void
        label: string
        disabled?: boolean
      }
      assign?: {
        action: (id: string) => void
        label: string
      }
      unassign?: {
        action: (id: string) => void
        label: string
      }
    },
    mergeWithExisting: boolean = false
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
        const existingButtons = mergeWithExisting ? getButtonControl() : undefined
        const isValidExisting = existingButtons &&
          Array.isArray(existingButtons.leftButtons) &&
          Array.isArray(existingButtons.rightButtons)
        const currentButtons = isValidExisting
          ? existingButtons
          : { leftButtons: [], rightButtons: [] }
        const leftButtons: ConnectBtnControlItem[] =
          Array.isArray(currentButtons.leftButtons) ? [...currentButtons.leftButtons] : []
        const rightButtons: ConnectBtnControlItem[] =
          Array.isArray(currentButtons.rightButtons) ? [...currentButtons.rightButtons] : []
        const buttonLabels = Object.values(buttonConfig)
          .filter(Boolean)
          .map(btn => btn?.label)
        const filteredRightButtons = rightButtons.filter(btn => !buttonLabels.includes(btn.label))
        const updatedRightButtons = [...filteredRightButtons]

        if (buttonConfig.assign && (!activeHeader.value?.reviewer?.username)) {
          updatedRightButtons.unshift({
            action: () => buttonConfig.assign!.action(id as string),
            label: buttonConfig.assign!.label,
            variant: 'outline'
          })
        } else if (buttonConfig.unassign && (activeHeader.value?.reviewer?.username)) {
          updatedRightButtons.unshift({
            action: () => buttonConfig.unassign!.action(id as string),
            label: buttonConfig.unassign!.label,
            variant: 'ghost'
          })
        }

        if (examinerActions.includes(ApplicationActionsE.SEND_NOC) && buttonConfig.sendNotice) {
          updatedRightButtons.push({
            action: () => buttonConfig.sendNotice.action(id as string),
            label: buttonConfig.sendNotice.label,
            variant: 'outline',
            color: 'blue',
            icon: 'i-mdi-send',
            disabled: buttonConfig.sendNotice.disabled
          })
        }

        if (examinerActions.includes(ApplicationActionsE.REJECT) && buttonConfig.reject) {
          updatedRightButtons.push({
            action: () => buttonConfig.reject.action(id as string),
            label: buttonConfig.reject.label,
            variant: 'outline',
            color: 'red',
            icon: 'i-mdi-close',
            disabled: buttonConfig.reject.disabled
          })
        }

        if (examinerActions.includes(ApplicationActionsE.APPROVE) && buttonConfig.approve) {
          updatedRightButtons.push({
            action: () => buttonConfig.approve.action(id as string),
            label: buttonConfig.approve.label,
            variant: 'outline',
            color: 'green',
            icon: 'i-mdi-check',
            disabled: buttonConfig.approve.disabled
          })
        }

        if (examinerActions.includes(RegistrationActionsE.CANCEL) && buttonConfig.cancel) {
          updatedRightButtons.push({
            action: () => buttonConfig.cancel.action(id as number),
            label: buttonConfig.cancel.label,
            variant: 'outline',
            color: 'red',
            icon: 'i-mdi-close',
            disabled: buttonConfig.cancel.disabled
          })
        }

        setButtonControl({
          leftButtons,
          rightButtons: updatedRightButtons
        })
      } else if (!mergeWithExisting) {
        setButtonControl({ leftButtons: [], rightButtons: [] })
      }
    }
  }

  return {
    updateRouteAndButtons
  }
}
