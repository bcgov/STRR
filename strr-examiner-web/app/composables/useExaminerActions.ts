export const useExaminerActions = () => {
  const strrModal = useStrrModals()
  const { handleButtonLoading } = useButtonControl()

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
