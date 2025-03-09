import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

export const useDocumentStore = defineStore('strata/document', () => {
  const { t } = useI18n()
  const { $strrApi } = useNuxtApp()
  const strrModal = useStrrModals()

  const storedDocuments = ref<UiDocument[]>([])
  const selectedDocType = ref<DocumentUploadType | undefined>(DocumentUploadType.STRATA_HOTEL_DOCUMENTATION) // leaving this in case we want to add other types

  const apiDocuments = computed<ApiDocument[]>(() => storedDocuments.value.map(item => item.apiDoc))

  async function addStoredDocument (doc: File): Promise<void> {
    const uiDoc: UiDocument = {
      file: doc,
      apiDoc: {} as ApiDocument,
      name: doc.name,
      type: selectedDocType.value!,
      id: uuidv4(),
      loading: true
    }

    storedDocuments.value.push(uiDoc)

    // selectedDocType.value = undefined // use this if adding mutliple document types

    // await sleep(3000) // TODO: remove
    await postDocument(uiDoc)
  }

  function updateStoredDocument<K extends keyof UiDocument> (
    id: string,
    key: K,
    value: UiDocument[K]
  ) {
    const docToUpdate = storedDocuments.value.find(doc => doc.id === id)
    if (docToUpdate) {
      docToUpdate[key] = value
    }
  }

  async function removeStoredDocument (uiDoc: UiDocument) {
    const index = storedDocuments.value.findIndex(item => uiDoc.id === item.id)
    storedDocuments.value.splice(index, 1)
    if (uiDoc.apiDoc.fileKey) {
      await deleteDocument(uiDoc.apiDoc.fileKey)
    }
  }

  /**
   * Add a document to a specified application.
   *
   * Upload a `uiDoc` with the given `applicationNumber` (via PUT method)
   *
   * @param {UiDocument} uiDoc - The document to upload, containing file data and metadata.
   * @param {string} applicationNumber - The id of the application to which the document is being added.
   * @returns {Promise<void>} A promise that resolves when the document has been added or rejects if an error occurs.
   */
  async function addDocumentToApplication (uiDoc: UiDocument, applicationNumber: string): Promise<void> {
    try {
      uiDoc.loading = true

      // create payload
      const formData = new FormData()
      formData.append('file', uiDoc.file)
      formData.append('documentType', uiDoc.type)
      formData.append('uploadStep', uiDoc.uploadStep)
      if (uiDoc.uploadDate) {
        formData.append('uploadDate', uiDoc.uploadDate)
      }

      // submit file
      const res = await $strrApi<ApiDocument>(`/applications/${applicationNumber}/documents`, {
        method: 'PUT',
        body: formData
      })

      uiDoc.apiDoc = res
      storedDocuments.value.push(uiDoc)
    } catch (e) {
      logFetchError(e, 'Error uploading document')
      strrModal.openErrorModal(t('error.docUpload.generic.title'), t('error.docUpload.generic.description'), false)
      await removeStoredDocument(uiDoc)
    } finally {
      // cleanup loading on ui object
      uiDoc.loading = false
    }
  }

  async function postDocument (uiDoc: UiDocument): Promise<void> {
    try {
      // create payload
      const formData = new FormData()
      formData.append('file', uiDoc.file)

      // submit file
      const res = await $strrApi<ApiDocument>('/documents', {
        method: 'POST',
        body: formData
      })
      // api doesn't give documentType back in this response
      res.documentType = uiDoc.type
      // update ui object with backend response
      updateStoredDocument(uiDoc.id, 'apiDoc', res)
    } catch (e) {
      logFetchError(e, 'Error uploading document')
      strrModal.openErrorModal(t('error.docUpload.generic.title'), t('error.docUpload.generic.description'), false)
      await removeStoredDocument(uiDoc)
    } finally {
      // cleanup loading on ui object
      updateStoredDocument(uiDoc.id, 'loading', false)
    }
  }

  async function deleteDocument (fileKey: string) {
    try {
      await $strrApi(`/documents/${fileKey}`, {
        method: 'DELETE'
      })
    } catch (e) {
      logFetchError(e, `Error deleting document: ${fileKey}`)
    }
  }

  const getDocumentSchema = () => z.array(z.any()).refine(
    val => val.length >= 0, // 0 is optional, set to 1 to require at least 1 doc
    {
      message: t('validation.min1Document'),
      path: ['documents']
    }
  )

  const validateDocuments = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(getDocumentSchema(), storedDocuments.value, 'strata-documents-form')

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  // use this to remove documents from store and from api
  async function resetApiDocs () {
    const docsToDelete = [...storedDocuments.value]
    for (const doc of docsToDelete) {
      await removeStoredDocument(doc)
    }
  }

  // use this to reset store only
  function $reset () {
    storedDocuments.value = []
    // selectedDocType.value = undefined
  }

  return {
    apiDocuments,
    storedDocuments,
    selectedDocType,
    addDocumentToApplication,
    postDocument,
    deleteDocument,
    addStoredDocument,
    removeStoredDocument,
    getDocumentSchema,
    validateDocuments,
    resetApiDocs,
    $reset
  }
})
