import type { DocumentUploadStep } from '~/enums/document-upload-step'
export interface UiDocument {
  file: File
  apiDoc: ApiDocument
  name: string
  id: string
  loading: boolean
  type: DocumentUploadType,
  uploadStep?: DocumentUploadStep,
  uploadDate?: string
}
