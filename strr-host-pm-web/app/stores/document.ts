// import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { ApiDocument } from '~/interfaces/host-api'
import type { UiDocument } from '~/interfaces/ui-document'

export const useDocumentStore = defineStore('host/application', () => {
  // const { t } = useI18n()
  const { $strrApi } = useNuxtApp()

  const storedDocuments = ref<UiDocument[]>([])

  const apiDocuments = computed<ApiDocument[]>(() => storedDocuments.value.map(item => item.apiDoc))

  function sleep (ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async function addStoredDocument (doc: File): Promise<void> {
    const uiDoc: UiDocument = {
      file: doc,
      apiDoc: {} as ApiDocument,
      name: doc.name,
      error: false,
      id: uuidv4(),
      loading: true,
      message: ''
    }

    storedDocuments.value.push(uiDoc)

    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10mb
    await sleep(3000)
    if (true) {
      updateStoredDocument(uiDoc.id, 'error', true)
      updateStoredDocument(uiDoc.id, 'message', 'File size too big, this file will not be included in your application')
      updateStoredDocument(uiDoc.id, 'loading', false)
      return
    }

    await sleep(5000)
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

      // update ui object with backend response
      updateStoredDocument(uiDoc.id, 'apiDoc', res)
    } catch (e) {
      // add error=true to ui object
      logFetchError(e, 'Error uploading document')
      updateStoredDocument(uiDoc.id, 'error', true)
      updateStoredDocument(uiDoc.id, 'message', 'Error uploading document <reason ??>')
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

  const $reset = () => {
    storedDocuments.value = []
  }

  return {
    apiDocuments,
    storedDocuments,
    postDocument,
    deleteDocument,
    addStoredDocument,
    removeStoredDocument,
    $reset
  }
})
