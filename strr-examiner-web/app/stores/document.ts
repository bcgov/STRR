export const useExaminerDocumentStore = defineStore('examiner/document', () => {
  const { t } = useNuxtApp().$i18n
  const { $strrApi } = useNuxtApp()
  const strrModal = useStrrModals()
  const exStore = useExaminerStore()

  const selectedDocType = ref<DocumentUploadType | undefined>(undefined)
  const isBlUploadOpen = ref(false)
  const isPrUploadOpen = ref(false)
  const uploadSectionType = ref<'BL' | 'PR' | undefined>(undefined)

  // All document type options available for examiner uploads
  const allDocTypeOptions = [
    {
      label: t(`form.pr.docType.${DocumentUploadType.BC_DRIVERS_LICENSE}`),
      value: DocumentUploadType.BC_DRIVERS_LICENSE
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.BCSC}`),
      value: DocumentUploadType.BCSC
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.COMBINED_BCSC_LICENSE}`),
      value: DocumentUploadType.COMBINED_BCSC_LICENSE
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.PROPERTY_ASSESSMENT_NOTICE}`),
      value: DocumentUploadType.PROPERTY_ASSESSMENT_NOTICE
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.SPEC_TAX_CONFIRMATION}`),
      value: DocumentUploadType.SPEC_TAX_CONFIRMATION
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.HOG_DECLARATION}`),
      value: DocumentUploadType.HOG_DECLARATION
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.ICBC_CERTIFICATE_OF_INSURANCE}`),
      value: DocumentUploadType.ICBC_CERTIFICATE_OF_INSURANCE
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.HOME_INSURANCE_SUMMARY}`),
      value: DocumentUploadType.HOME_INSURANCE_SUMMARY
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.PROPERTY_TAX_NOTICE}`),
      value: DocumentUploadType.PROPERTY_TAX_NOTICE
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.UTILITY_BILL}`),
      value: DocumentUploadType.UTILITY_BILL
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE}`),
      value: DocumentUploadType.GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT}`),
      value: DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.STRATA_HOTEL_DOCUMENTATION}`),
      value: DocumentUploadType.STRATA_HOTEL_DOCUMENTATION
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.TENANCY_AGREEMENT}`),
      value: DocumentUploadType.TENANCY_AGREEMENT
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.RENT_RECEIPT_OR_BANK_STATEMENT}`),
      value: DocumentUploadType.RENT_RECEIPT_OR_BANK_STATEMENT
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE}`),
      value: DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE
    },
    {
      label: t(`form.pr.docType.${DocumentUploadType.OTHERS}`),
      value: DocumentUploadType.OTHERS
    }
  ]

  // Filtered document type options based on upload section
  const docTypeOptions = computed(() => {
    if (uploadSectionType.value === 'BL') {
      return allDocTypeOptions.filter(option =>
        option.value === DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE
      )
    }
    return allDocTypeOptions
  })

  /**
   * Add a document to a registration.
   *
   * @param {UiDocument} uiDoc - The document to upload, containing file data and metadata.
   * @param {number} registrationId - The registration ID to which the document is being added.
   * @returns {Promise<void>} A promise that resolves when the document has been added or rejects if an error occurs.
   */
  async function addDocumentToRegistration (uiDoc: UiDocument, registrationId: number): Promise<void> {
    try {
      uiDoc.loading = true

      const formData = new FormData()
      formData.append('file', uiDoc.file)
      formData.append('documentType', uiDoc.type)
      uiDoc.uploadStep && formData.append('uploadStep', uiDoc.uploadStep)
      uiDoc.uploadDate && formData.append('uploadDate', uiDoc.uploadDate)

      const res = await $strrApi<ApiDocument>(`/registrations/${registrationId}/documents`, {
        method: 'POST',
        body: formData
      })

      uiDoc.apiDoc = res

      const documentForList = {
        ...res,
        documentType: uiDoc.type,
        fileName: res.fileName || uiDoc.file.name,
        fileType: res.fileType || uiDoc.file.type,
        uploadDate: res.uploadDate || new Date().toISOString().split('T')[0],
        addedOn: res.addedOn || new Date().toISOString().split('T')[0]
      }

      if (exStore.activeReg?.documents) {
        exStore.activeReg.documents.push(documentForList)
      }
    } catch (e) {
      logFetchError(e, 'Error uploading document to registration')
      strrModal.openErrorModal(t('error.docUpload.generic.title'), t('error.docUpload.generic.description'), false)
      throw e
    } finally {
      uiDoc.loading = false
    }
  }

  /**
   * Reset the selected document type.
   */
  function reset (): void {
    selectedDocType.value = undefined
  }

  /**
   * Open Business License document upload section.
   */
  function openBlUpload (): void {
    isBlUploadOpen.value = true
    isPrUploadOpen.value = false
    uploadSectionType.value = 'BL'
    selectedDocType.value = undefined
  }

  /**
   * Open Principal Residence document upload section.
   */
  function openPrUpload (): void {
    isPrUploadOpen.value = true
    isBlUploadOpen.value = false
    uploadSectionType.value = 'PR'
    selectedDocType.value = undefined
  }

  /**
   * Close document upload section.
   */
  function closeUpload (): void {
    isBlUploadOpen.value = false
    isPrUploadOpen.value = false
    uploadSectionType.value = undefined
    selectedDocType.value = undefined
  }

  return {
    selectedDocType,
    isBlUploadOpen,
    isPrUploadOpen,
    uploadSectionType,
    docTypeOptions,
    addDocumentToRegistration,
    reset,
    openBlUpload,
    openPrUpload,
    closeUpload
  }
})
