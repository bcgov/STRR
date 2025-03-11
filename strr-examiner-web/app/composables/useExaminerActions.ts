export const useExaminerActions = () => {
  const strrModal = useStrrModals()
  const { t } = useI18n()
  const { handleButtonLoading } = useButtonControl()

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
  const manageAction = async <T extends { id: string | number }, Args extends any[] = []>(
    item: T,
    action: string,
    actionFn: (id: T['id'], ...args: Args) => Promise<void>,
    buttonPosition: 'left' | 'right',
    buttonIndex: number,
    refresh: () => void,
    additionalArgs: Args = [] as unknown as Args,
    validateFn?: () => Promise<boolean> | MultiFormValidationResult | boolean
  ) => {
    try {
      handleButtonLoading(false, buttonPosition, buttonIndex)
      if (validateFn) {
        let isValid = true
        if (action === 'SEND_NOC') {
          isValid = await validateFn() as boolean
        }
        if (!isValid) {
          handleButtonLoading(true)
          return
        }
      }
      await actionFn(item.id, ...additionalArgs)
      refresh()
    } catch (error) {
      console.error(error)
      const errMsg = t(`error.action.${action.toLowerCase()}`)
      strrModal.openErrorModal('Error', errMsg, false)
    } finally {
      handleButtonLoading(true)
    }
  }

  return {
    manageAction
  }
}
