import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

export const useDocumentStore = defineStore('strata/document', () => {
  const { t } = useI18n()
  const { $strrApi } = useNuxtApp()
  const strrModal = useStrrModals()

  const storedDocuments = ref<UiDocument[]>([])
  const selectedDocType = ref<DocumentUploadType | undefined>(DocumentUploadType.STRATA_HOTEL_DOCUMENTATION) // leaving this in case we want to add other types

  const apiDocuments = computed(() => storedDocuments.value.map(item => item.apiDoc))

  async function addStoredDocument (doc: File): Promise<void> {
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10mb
    if (doc.size > MAX_FILE_SIZE) {
      strrModal.openErrorModal(t('error.docUpload.fileSize.title'), t('error.docUpload.fileSize.description'), false)
      return
    }

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
    val => val.length >= 1,
    {
      message: 'Must have at least one document',
      path: ['documents']
    }
  )

  async function $reset () {
    const docsToDelete = [...storedDocuments.value]
    for (const doc of docsToDelete) {
      await removeStoredDocument(doc)
    }
    // selectedDocType.value = undefined
  }

  return {
    apiDocuments,
    storedDocuments,
    selectedDocType,
    postDocument,
    deleteDocument,
    addStoredDocument,
    removeStoredDocument,
    getDocumentSchema,
    $reset
  }
})
