/**
 * Composable for managing action modals
 */
export const useConfirmationModal = () => {
  const showConfirmModal = ref(false)
  const modalTitle = ref('')
  const modalMessage = ref('')
  const confirmButtonText = ref('Confirm')
  const cancelButtonText = ref('Cancel')
  const confirmAction = ref()
  const cancelAction = ref()

  /**
   * Open the confirmation modal with the provided options
   */
  const openConfirmModal = <T>({
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  }: {
    title: string
    message: string
    onConfirm: () => Promise<T> | void
    onCancel?: () => Promise<any> | void
    confirmText?: string
    cancelText?: string
    disableCancel?: boolean
  }) => {
    modalTitle.value = title
    modalMessage.value = message
    confirmButtonText.value = confirmText
    cancelButtonText.value = cancelText
    confirmAction.value = onConfirm
    cancelAction.value = onCancel || (() => {})
    showConfirmModal.value = true
  }

  /**
   * Close the confirmation modal
   */
  const closeConfirmModal = () => {
    showConfirmModal.value = false
  }

  /**
   * Handle confirm action with optional loading state
   */
  const handleConfirm = async () => {
    await confirmAction.value()
    closeConfirmModal()
  }

  /**
   * Handle cancel action
   */
  const handleCancel = async () => {
    await cancelAction.value()
    closeConfirmModal()
  }

  return {
    showConfirmModal,
    modalTitle,
    modalMessage,
    confirmButtonText,
    cancelButtonText,
    confirmAction,
    cancelAction,
    openConfirmModal,
    closeConfirmModal,
    handleConfirm,
    handleCancel
  }
}
