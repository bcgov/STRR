/**
 * Mock documents for stress testing document upload endpoints.
 */

// Real PDF files read once at init time (k6 open() is only valid in init context)
const smallPdfContent = open('./mockFileSmall.pdf', 'b') // 13 KB
const largePdfContent = open('./mockFileLarge.pdf', 'b') // 5.4 MB

export const mockDocuments = {
  // Small PDF (13 KB) — read from mockFileSmall.pdf
  smallPdf: {
    content: () => smallPdfContent,
    filename: 'supporting-document-1.pdf',
    mimeType: 'application/pdf',
    documentType: 'COMBINED_BCSC_LICENSE',
    description: 'Small PDF'
  },

  // Large PDF (5.4 MB) — read from mockFileLarge.pdf
  largePdf: {
    content: () => largePdfContent,
    filename: 'supporting-document-2.pdf',
    mimeType: 'application/pdf',
    documentType: 'PROPERTY_ASSESSMENT_NOTICE',
    description: 'Large PDF'
  }
}
