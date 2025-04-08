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
        const currentButtons = mergeWithExisting ? getButtonControl() : { leftButtons: [], rightButtons: [] }
        const leftButtons: ConnectBtnControlItem[] =
          Array.isArray(currentButtons.leftButtons) ? [...currentButtons.leftButtons] : []
        const rightButtons: ConnectBtnControlItem[] =
          Array.isArray(currentButtons.rightButtons) ? [...currentButtons.rightButtons] : []

        const hasAssignButton = rightButtons.some(btn => btn.label === buttonConfig.assign?.label)
        const hasUnassignButton = rightButtons.some(btn => btn.label === buttonConfig.unassign?.label)
        if (buttonConfig.assign && (!activeHeader.value?.reviewer?.username) && !hasAssignButton) {
          rightButtons.unshift({
            action: () => buttonConfig.assign!.action(id as string),
            label: buttonConfig.assign!.label,
            variant: 'outline'
          })
        } else if (buttonConfig.unassign && (activeHeader.value?.reviewer?.username) && !hasUnassignButton) {
          rightButtons.unshift({
            action: () => buttonConfig.unassign!.action(id as string),
            label: buttonConfig.unassign!.label,
            variant: 'ghost'
          })
        }

        const hasSendNoticeButton = rightButtons.some(btn => btn.label === buttonConfig.sendNotice?.label)
        if (examinerActions.includes(ApplicationActionsE.SEND_NOC) && buttonConfig.sendNotice && !hasSendNoticeButton) {
          rightButtons.push({
            action: () => buttonConfig.sendNotice.action(id as string),
            label: buttonConfig.sendNotice.label,
            variant: 'outline',
            color: 'blue',
            icon: 'i-mdi-send'
          })
        }

        const hasRejectButton = rightButtons.some(btn => btn.label === buttonConfig.reject?.label)
        if (examinerActions.includes(ApplicationActionsE.REJECT) && buttonConfig.reject && !hasRejectButton) {
          rightButtons.push({
            action: () => buttonConfig.reject.action(id as string),
            label: buttonConfig.reject.label,
            variant: 'outline',
            color: 'red',
            icon: 'i-mdi-close'
          })
        }

        const hasApproveButton = rightButtons.some(btn => btn.label === buttonConfig.approve?.label)
        if (examinerActions.includes(ApplicationActionsE.APPROVE) && buttonConfig.approve && !hasApproveButton) {
          rightButtons.push({
            action: () => buttonConfig.approve.action(id as string),
            label: buttonConfig.approve.label,
            variant: 'outline',
            color: 'green',
            icon: 'i-mdi-check'
          })
        }

        const hasCancelButton = rightButtons.some(btn => btn.label === buttonConfig.cancel?.label)
        if (examinerActions.includes(RegistrationActionsE.CANCEL) && buttonConfig.cancel && !hasCancelButton) {
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
      } else if (!mergeWithExisting) {
        setButtonControl({ leftButtons: [], rightButtons: [] })
      }
    }
  }

  return {
    updateRouteAndButtons
  }
}
