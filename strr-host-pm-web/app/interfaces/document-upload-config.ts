// interface to configure enhanced multi-dropdown document upload
export interface DocumentUploadConfig {
  testId: string // unique id for tests
  title: string // title for dropdown section
  fieldName: string // form field name for the uploaded document (used for validation)
  uploadType: DocumentUploadTypeEnum // category/type of document being uploaded
  isDisplayed: boolean // show or hide the dropdown based on requirements in propStore, reqStore, etc.
}
