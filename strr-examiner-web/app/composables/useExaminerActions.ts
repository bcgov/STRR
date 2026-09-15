import { ApplicationActionsE, RegistrationActionsE } from '@/enums/actions'

export const useExaminerActions = () => {
  const strrModal = useStrrModals()
  const { t } = useNuxtApp().$i18n
  const { getButtonControl, handleButtonLoading } = useButtonControl()
  const isActionPending = useState('examiner-action-pending', () => false)

  const runAction = async (
    action: () => Promise<void>,
    buttonPosition: 'left' | 'right',
    buttonIndex: number
  ) => {
    if (isActionPending.value) { return }
    isActionPending.value = true
    const controls = getButtonControl()
    const buttonStates = [...(controls?.leftButtons ?? []), ...(controls?.rightButtons ?? [])]
      .map(button => ({ button, disabled: button.disabled, loading: button.loading }))

    try {
      handleButtonLoading(false, buttonPosition, buttonIndex)
      await action()
    } finally {
      // Restore only the original buttons; refreshed controls carry their own disabled state.
      for (const { button, disabled, loading } of buttonStates) {
        button.disabled = disabled
        button.loading = loading
      }
      isActionPending.value = false
    }
  }

  /**
   * A generic utility function to be called from application and registration pages for
   * managing/calling actions on button click.
   *
   * @param {T} item - Has the identifier property (id) but can be any object
   * @param {string} action - Name of the action being performed
   * @param {Function} actionFn - Function that performs the actual action
   * @param {'left' | 'right'} buttonPosition - The position of the button
   * @param {number} buttonIndex - Index of the button in the group
   * @param {Function} refresh - Function to call after the action completes
   * @param {Args} additionalArgs - Optional additional arguments to pass to the action function
   *
   */
  const manageAction = <T extends { id: string | number }, Args extends any[] = []>(
    item: T,
    action: ApplicationActionsE | RegistrationActionsE,
    actionFn: (id: T['id'], ...args: Args) => Promise<void>,
    buttonPosition: 'left' | 'right',
    buttonIndex: number,
    refresh: () => void | Promise<void>,
    additionalArgs: Args = [] as unknown as Args,
    validateFn?: () => Promise<boolean>
  ) => runAction(async () => {
      try {
        if (validateFn && !(await validateFn())) {
          return
        }

        await actionFn(item.id, ...additionalArgs)
        await refresh()
      } catch (error) {
        console.error(error)
        const errMsg = t(`error.action.${action.toLowerCase()}`)
        strrModal.openErrorModal('Error', errMsg, false)
      }
    }, buttonPosition, buttonIndex)

  return {
    manageAction,
    runAction,
    isActionPending
  }
}
