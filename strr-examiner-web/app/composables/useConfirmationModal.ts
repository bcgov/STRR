/**
 * Composable for managing action modals
 */
export const useConfirmationModal = () => {
  const { t } = useI18n()
  const showConfirmModal = ref(false)
  const modalTitle = ref('')
  const modalMessage = ref('')
  const confirmButtonText = ref(t('btn.confirm'))
  const cancelButtonText = ref(t('btn.cancel'))
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
    confirmText = t('btn.confirm'),
    cancelText = t('btn.cancel')
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
