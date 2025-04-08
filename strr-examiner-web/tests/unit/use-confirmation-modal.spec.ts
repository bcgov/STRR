import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('useConfirmationModal', () => {
  let modal: any

  beforeEach(() => {
    modal = useConfirmationModal()
  })

  it('should provide properties with default values', () => {
    expect(modal.showConfirmModal.value).toBe(false)
    expect(modal.modalTitle.value).toBe('')
    expect(modal.modalMessage.value).toBe('')
    expect(modal.confirmButtonText.value).toBe('Confirm')
    expect(modal.cancelButtonText.value).toBe('Cancel')
  })

  it('should set properties when openConfirmModal is called', () => {
    const mockConfirm = vi.fn()
    const mockCancel = vi.fn()

    modal.openConfirmModal({
      title: 'Test Title',
      message: 'Test Message',
      confirmText: 'Yes',
      cancelText: 'No',
      onConfirm: mockConfirm,
      onCancel: mockCancel
    })

    expect(modal.showConfirmModal.value).toBe(true)
    expect(modal.modalTitle.value).toBe('Test Title')
    expect(modal.modalMessage.value).toBe('Test Message')
    expect(modal.confirmButtonText.value).toBe('Yes')
    expect(modal.cancelButtonText.value).toBe('No')
    expect(modal.confirmAction.value).toBe(mockConfirm)
    expect(modal.cancelAction.value).toBe(mockCancel)
  })

  it('should use default text when not provided', () => {
    modal.openConfirmModal({
      title: 'Test Title',
      message: 'Test Message',
      onConfirm: vi.fn()
    })

    expect(modal.confirmButtonText.value).toBe('Confirm')
    expect(modal.cancelButtonText.value).toBe('Cancel')
  })

  it('should close when closeConfirmModal is called', () => {
    modal.openConfirmModal({
      title: 'Test Title',
      message: 'Test Message',
      onConfirm: vi.fn()
    })

    expect(modal.showConfirmModal.value).toBe(true)
    modal.closeConfirmModal()
    expect(modal.showConfirmModal.value).toBe(false)
  })

  it('should call confirm action and close modal when handleConfirm is called', async () => {
    const mockConfirm = vi.fn().mockResolvedValue()

    modal.openConfirmModal({
      title: 'Test Title',
      message: 'Test Message',
      onConfirm: mockConfirm
    })

    await modal.handleConfirm()

    expect(mockConfirm).toHaveBeenCalledTimes(1)
    expect(modal.showConfirmModal.value).toBe(false)
  })

  it('should call cancel action and close modal when handleCancel is called', async () => {
    const mockCancel = vi.fn().mockResolvedValue()

    modal.openConfirmModal({
      title: 'Test Title',
      message: 'Test Message',
      onConfirm: vi.fn(),
      onCancel: mockCancel
    })

    await modal.handleCancel()

    expect(mockCancel).toHaveBeenCalledTimes(1)
    expect(modal.showConfirmModal.value).toBe(false)
  })

  it('should use empty function for cancel when not provided', async () => {
    modal.openConfirmModal({
      title: 'Test Title',
      message: 'Test Message',
      onConfirm: vi.fn()
    })

    await modal.handleCancel()
    expect(modal.showConfirmModal.value).toBe(false)
  })
})
