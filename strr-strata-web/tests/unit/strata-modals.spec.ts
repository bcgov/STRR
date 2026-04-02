import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { vi, describe, beforeEach, it, expect } from 'vitest'

const mockOpen = vi.fn()
const mockClose = vi.fn()

mockNuxtImport('useModal', () => () => ({
  open: mockOpen,
  close: mockClose
}))

mockNuxtImport('useNuxtApp', () => () => ({
  $i18n: { t: (key: string) => key }
}))

describe('Strata Modals - openStrataDocUploadErrorModal', () => {
  beforeEach(() => {
    mockOpen.mockClear()
    mockClose.mockClear()
  })

  it('should open correct strata doc upload error modal', () => {
    const strataModal = useStrataModals()
    const file = new File([], 'test.pdf', { type: 'application/pdf' })

    // empty array - modal should not open
    strataModal.openStrataDocUploadErrorModal([])
    expect(mockOpen).not.toHaveBeenCalled()

    // fileType error - uses specific text
    strataModal.openStrataDocUploadErrorModal([{ file, reason: 'fileType' }])

    expect(mockOpen).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        error: expect.objectContaining({ title: 'error.docUpload.fileType.title' })
      })
    )

    mockOpen.mockClear()

    // multiple errors - uses generic text
    strataModal.openStrataDocUploadErrorModal([
      { file, reason: 'fileType' },
      { file, reason: 'fileSize' }
    ])
    expect(mockOpen).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        error: expect.objectContaining({ title: 'error.docUpload.generic.title' })
      })
    )
  })
})
