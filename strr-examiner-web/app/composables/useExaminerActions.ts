export const useExaminerActions = () => {
  const strrModal = useStrrModals()
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
    additionalArgs: Args = [] as unknown as Args
  ) => {
    try {
      handleButtonLoading(false, buttonPosition, buttonIndex)
      await actionFn(item.id, ...additionalArgs)
      refresh()
    } catch (error) {
      console.error(error)
      strrModal.openErrorModal('Error', `An error occurred ${action.toLowerCase()}ing this item.`, false)
    } finally {
      handleButtonLoading(true)
    }
  }

  return {
    manageAction
  }
}
