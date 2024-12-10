// import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import uniqBy from 'lodash.uniqby'

export const useDocumentStore = defineStore('host/document', () => {
  const { t } = useI18n()
  const { $strrApi } = useNuxtApp()
  const strrModal = useStrrModals()
  const reqStore = usePropertyReqStore()
  const propStore = useHostPropertyStore()

  const storedDocuments = ref<UiDocument[]>([])
  const selectedDocType = ref<DocumentUploadType | undefined>(undefined)

  const apiDocuments = computed(() => storedDocuments.value.map(item => item.apiDoc))

  const requiredDocs = computed(() => {
    const reqs = reqStore.propertyReqs

    if (!reqStore.hasReqs) {
      return []
    }

    if (reqs.isStraaExempt) {
      return []
    }

    const exemptionReason = reqStore.prRequirements.prExemptionReason
    const docs = []

    if (reqs.isBusinessLicenceRequired) {
      const isBlValid = apiDocuments.value.some(
        item => item.documentType === DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE)
      docs.push({
        isValid: isBlValid,
        icon: isBlValid ? 'i-mdi-check' : 'i-mdi-close',
        label: t('label.localGovShortTermRentalBL')
      })
    }
    if (reqs.isPrincipalResidenceRequired && exemptionReason === undefined) {
      const isPrValid = validatePrincipalResidenceDocuments()
      docs.push({
        isValid: isPrValid,
        icon: isPrValid ? 'i-mdi-check' : 'i-mdi-close',
        label: t('label.proofOfPr')
      })
    }
    if (exemptionReason === PrExemptionReason.STRATA_HOTEL) {
      const isStrataValid = apiDocuments.value.some(
        item => item.documentType === DocumentUploadType.STRATA_HOTEL_DOCUMENTATION)
      docs.push({
        isValid: isStrataValid,
        icon: isStrataValid ? 'i-mdi-check' : 'i-mdi-close',
        label: t('label.supportingStrataDocs')
      })
    }
    if (exemptionReason === PrExemptionReason.FRACTIONAL_OWNERSHIP) {
      const isFractValid = apiDocuments.value.some(
        item => item.documentType === DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT
      )
      docs.push({
        isValid: isFractValid,
        icon: isFractValid ? 'i-mdi-check' : 'i-mdi-close',
        label: t('label.fractOwnAgreement')
      })
    }

    if (propStore.unitDetails.ownershipType === OwnershipType.RENT) {
      const isRentValid = apiDocuments.value.some(
        item => [DocumentUploadType.TENANCY_AGREEMENT, DocumentUploadType.RENT_RECEIPT_OR_BANK_STATEMENT]
          .includes(item.documentType)
      )
      docs.push({
        isValid: isRentValid,
        icon: isRentValid ? 'i-mdi-check' : 'i-mdi-close',
        label: t('label.rentalAgreementOrRecept')
      })
    }

    return docs
  })

  const potentialRequiredDocs = computed<string[]>(() => {
    const exemptionReason = reqStore.prRequirements.prExemptionReason
    const docs = []

    docs.push(t('label.localGovShortTermRentalBL'))

    if (exemptionReason === undefined) {
      docs.push(t('label.proofOfPr'))
    }

    if (exemptionReason === PrExemptionReason.STRATA_HOTEL) {
      docs.push(t('label.supportingStrataDocs'))
    }

    if (exemptionReason === PrExemptionReason.FRACTIONAL_OWNERSHIP) {
      docs.push(t('label.fractOwnAgreement'))
    }

    if (propStore.unitDetails.ownershipType === OwnershipType.RENT) {
      docs.push(t('label.rentalAgreementOrRecept'))
    }

    return docs
  })

  const docTypeOptions = [
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

    selectedDocType.value = undefined

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

  function validatePrincipalResidenceDocuments (): boolean {
    // either 2 unique docs from this list are required
    const uniqueColumnADocs = [
      DocumentUploadType.BC_DRIVERS_LICENSE,
      DocumentUploadType.BCSC,
      DocumentUploadType.COMBINED_BCSC_LICENSE,
      DocumentUploadType.PROPERTY_ASSESSMENT_NOTICE,
      DocumentUploadType.SPEC_TAX_CONFIRMATION,
      DocumentUploadType.HOG_DECLARATION
    ]

    // or 1 doc from column A and 2 unique docs from this list are required
    const uniqueColumnBDocs = [
      DocumentUploadType.ICBC_CERTIFICATE_OF_INSURANCE,
      DocumentUploadType.HOME_INSURANCE_SUMMARY,
      DocumentUploadType.PROPERTY_TAX_NOTICE
    ]

    // include rental docs as part of proof of pr only if ownership type === rent
    if (propStore.unitDetails.ownershipType === OwnershipType.RENT) {
      uniqueColumnBDocs.push(DocumentUploadType.TENANCY_AGREEMENT)
      uniqueColumnBDocs.push(DocumentUploadType.RENT_RECEIPT_OR_BANK_STATEMENT)
    }

    // or 1 doc from column A and 2 non-unique docs from this list are required
    const nonUniqueColumnBDocs = [
      DocumentUploadType.UTILITY_BILL,
      DocumentUploadType.OTHERS,
      DocumentUploadType.GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE
    ]

    // get unique column a docs
    const columnAFilteredUnique = uniqBy(
      apiDocuments.value.filter(item => uniqueColumnADocs.includes(item.documentType)),
      'documentType'
    )

    // get unique column b docs
    const columnBFilteredUnique = uniqBy(
      apiDocuments.value.filter(item => uniqueColumnBDocs.includes(item.documentType)),
      'documentType'
    )

    // get non-unique column b docs
    const columnBFilteredNonUnique = apiDocuments.value.filter(item => nonUniqueColumnBDocs.includes(item.documentType))
    // get doc count
    const columnACount = columnAFilteredUnique.length
    const columnBCount = columnBFilteredUnique.length + columnBFilteredNonUnique.length

    // validate at least 2 of column a docs OR validate at least 1 of column a and 2 of column b
    return columnACount >= 2 || (columnACount >= 1 && columnBCount >= 2)
  }

  function validateRequiredDocuments () {
    if (!requiredDocs.value.every(doc => doc.isValid === true)) {
      return [{ path: 'documentUpload', message: t('validation.missingReqDocs') }]
    } else {
      return []
    }
  }

  // TODO: stepper validation function

  const $reset = () => {
    storedDocuments.value = []
    selectedDocType.value = undefined
  }

  return {
    apiDocuments,
    storedDocuments,
    selectedDocType,
    docTypeOptions,
    requiredDocs,
    potentialRequiredDocs,
    postDocument,
    deleteDocument,
    addStoredDocument,
    removeStoredDocument,
    validateRequiredDocuments,
    $reset
  }
})
