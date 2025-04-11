export interface ConfirmModal {
    openConfirmModal: (options: {
      title: string
      message: string
      onConfirm: () => Promise<any> | void
      onCancel?: () => Promise<any> | void
      confirmText?: string
      cancelText?: string
      disableCancel?: boolean
    }) => void
    closeConfirmModal: () => void
    handleConfirm: () => void
    handleOpen: (onConfirm: () => Promise<any> | void) => void
  }
