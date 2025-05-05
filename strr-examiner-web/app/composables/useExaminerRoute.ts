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
      },
      provisionalApprove?: {
        action: (id: string) => void
        label: string,
        disabled?: boolean
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

      const existingButtons = getButtonControl()
      const isValidExisting = existingButtons &&
        Array.isArray(existingButtons.leftButtons) &&
        Array.isArray(existingButtons.rightButtons)
      const currentButtons = isValidExisting
        ? existingButtons
        : { leftButtons: [], rightButtons: [] }
      const configLabels = Object.values(buttonConfig)
        .filter(btn => btn !== undefined)
        .map(btn => btn?.label)
        .filter(Boolean) as string[]
      const currentLabels = currentButtons.rightButtons.map(btn => btn.label)
      const commonLabels = configLabels.filter(label => currentLabels.includes(label))
      const processedLabels = new Set<string>()
      const uniqueRightButtons = currentButtons.rightButtons.filter((btn) => {
        if (processedLabels.has(btn.label) || commonLabels.includes(btn.label)) {
          return false
        }
        processedLabels.add(btn.label)
        return true
      })
      if (examinerActions && examinerActions.length > 0) {
        if (buttonConfig.assign && (!activeHeader.value?.reviewer?.username)) {
          uniqueRightButtons.unshift({
            action: () => buttonConfig.assign!.action(id as string),
            label: buttonConfig.assign!.label,
            variant: 'outline'
          })
        } else if (buttonConfig.unassign && (activeHeader.value?.reviewer?.username)) {
          uniqueRightButtons.unshift({
            action: () => buttonConfig.unassign!.action(id as string),
            label: buttonConfig.unassign!.label,
            variant: 'ghost'
          })
        }

        if (examinerActions.includes(ApplicationActionsE.SEND_NOC) && buttonConfig.sendNotice) {
          uniqueRightButtons.push({
            action: () => buttonConfig.sendNotice!.action(id as string),
            label: buttonConfig.sendNotice.label,
            variant: 'outline',
            color: 'blue',
            icon: 'i-mdi-send',
            disabled: buttonConfig.sendNotice!.disabled ?? false
          })
        }

        if (examinerActions.includes(ApplicationActionsE.REJECT) && buttonConfig.reject) {
          uniqueRightButtons.push({
            action: () => buttonConfig.reject!.action(id as string),
            label: buttonConfig.reject.label,
            variant: 'outline',
            color: 'red',
            icon: 'i-mdi-close',
            disabled: buttonConfig.reject!.disabled ?? false
          })
        }

        if (examinerActions.includes(ApplicationActionsE.APPROVE) && buttonConfig.approve) {
          uniqueRightButtons.push({
            action: () => buttonConfig.approve!.action(id as string),
            label: buttonConfig.approve.label,
            variant: 'outline',
            color: 'green',
            icon: 'i-mdi-check',
            disabled: buttonConfig.approve!.disabled ?? false
          })
        }

        if (examinerActions.includes(RegistrationActionsE.CANCEL) && buttonConfig.cancel) {
          uniqueRightButtons.push({
            action: () => buttonConfig.cancel!.action(id as number),
            label: buttonConfig.cancel.label,
            variant: 'outline',
            color: 'red',
            icon: 'i-mdi-close',
            disabled: buttonConfig.cancel!.disabled ?? false
          })
        }

        if (examinerActions.includes(ApplicationActionsE.PROVISIONAL_APPROVE) && buttonConfig.provisionalApprove) {
          uniqueRightButtons.push({
            action: () => buttonConfig.provisionalApprove!.action(id as string),
            label: buttonConfig.provisionalApprove.label,
            variant: 'outline',
            color: 'green',
            icon: 'i-mdi-check',
            disabled: buttonConfig.provisionalApprove!.disabled ?? false
          })
        }
      }

      setButtonControl({
        leftButtons: currentButtons.leftButtons,
        rightButtons: uniqueRightButtons
      })
    }
  }

  return {
    updateRouteAndButtons
  }
}
