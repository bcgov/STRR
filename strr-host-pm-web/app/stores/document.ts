// import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import uniqBy from 'lodash.uniqby'

export const useDocumentStore = defineStore('host/document', () => {
  const { t } = useNuxtApp().$i18n
  const { $strrApi } = useNuxtApp()
  const strrModal = useStrrModals()
  const reqStore = usePropertyReqStore()
  const propStore = useHostPropertyStore()
  const { isNewPrDocumentsListEnabled, isEnhancedDocumentUploadEnabled } = useHostFeatureFlags()

  const storedDocuments = ref<UiDocument[]>([])
  const selectedDocType = ref<DocumentUploadType | undefined>(undefined)

  const apiDocuments = computed<ApiDocument[]>(() => storedDocuments.value.map(item => item.apiDoc))

  // check if Host Type is Renter or long-term Tenant to determine which PR docs are required
  const isTenant = computed(() =>
    propStore.unitDetails.ownershipType === OwnershipType.RENT ||
    propStore.unitDetails.hostType === PropertyHostType.LONG_TERM_TENANT
  )

  const requiredDocs = computed(() => {
    const reqs = reqStore.propertyReqs

    if (!reqStore.hasReqs) {
      return []
    }

    if (reqs.isStraaExempt) {
      return []
    }

    const exemptionReason = reqStore.prRequirements.prExemptionReason
    const blExempt = reqStore.blRequirements.isBusinessLicenceExempt
    const docs = []

    if (reqs.isPrincipalResidenceRequired && exemptionReason === undefined) {
      const isIdValid = validateIdentityDocumentDropdown()

      const isPrValid = isEnhancedDocumentUploadEnabled.value
        ? validatePrincipalResidenceDropdown()
        : validatePrincipalResidenceDocuments()

      const hostType = propStore.unitDetails.hostType

      if (isNewPrDocumentsListEnabled.value &&
        (hostType === PropertyHostType.OWNER || hostType === PropertyHostType.FRIEND_RELATIVE)) {
        if (isEnhancedDocumentUploadEnabled.value) {
          docs.push({
            isValid: isIdValid,
            icon: isIdValid ? 'i-mdi-check' : 'i-mdi-close',
            label: t('label.proofOfIdentity'),
            formFieldName: 'identityDocUpload'
          })
          docs.push({
            isValid: isPrValid,
            icon: isPrValid ? 'i-mdi-check' : 'i-mdi-close',
            label: t('label.proofOfPrWithDocs'),
            formFieldName: 'prDocUpload'
          })
        } else {
          docs.push({
            isValid: isPrValid,
            icon: isPrValid ? 'i-mdi-check' : 'i-mdi-close',
            label: t('label.proofOfPrOwner'),
            formFieldName: 'prDocUpload'
          })
        }
      } else if (isNewPrDocumentsListEnabled.value && hostType === PropertyHostType.LONG_TERM_TENANT) {
        if (isEnhancedDocumentUploadEnabled.value) {
          docs.push({
            isValid: isIdValid,
            icon: isIdValid ? 'i-mdi-check' : 'i-mdi-close',
            label: t('label.proofOfIdentity'),
            formFieldName: 'identityDocUpload'
          })
          docs.push({
            isValid: isPrValid,
            icon: isPrValid ? 'i-mdi-check' : 'i-mdi-close',
            label: t('label.proofOfPr'),
            formFieldName: 'prDocUpload'
          })
        } else {
          docs.push({
            isValid: isPrValid,
            icon: isPrValid ? 'i-mdi-check' : 'i-mdi-close',
            label: t('label.proofOfPrTenant'),
            formFieldName: 'tenancyDocUpload'
          })
        }
      } else {
        docs.push({
          isValid: isPrValid,
          icon: isPrValid ? 'i-mdi-check' : 'i-mdi-close',
          label: t('label.proofOfPr'),
          formFieldName: 'prDocUpload'
        })
      }
    }
    if (exemptionReason === PrExemptionReason.FARM_LAND) {
      const isPropAssessmentNoticeValid = apiDocuments.value.some(
        item => item.documentType === DocumentUploadType.PROPERTY_ASSESSMENT_NOTICE
      )
      docs.push({
        isValid: isPropAssessmentNoticeValid,
        icon: isPropAssessmentNoticeValid ? 'i-mdi-check' : 'i-mdi-close',
        label: t('label.propertyAssessmentNotice'),
        formFieldName: 'prDocUpload'
      })
    }
    if (reqs.isBusinessLicenceRequired && !blExempt) {
      const isBlValid = apiDocuments.value.some(
        item => item.documentType === DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE)
      docs.push({
        isValid: isBlValid,
        icon: isBlValid ? 'i-mdi-check' : 'i-mdi-close',
        label: t('label.localGovShortTermRentalBL'),
        formFieldName: 'blDocUpload'
      })
    }
    if (exemptionReason === PrExemptionReason.STRATA_HOTEL) {
      const isStrataValid = apiDocuments.value.some(
        item => item.documentType === DocumentUploadType.STRATA_HOTEL_DOCUMENTATION)
      docs.push({
        isValid: isStrataValid,
        icon: isStrataValid ? 'i-mdi-check' : 'i-mdi-close',
        label: t('label.supportingStrataDocs'),
        formFieldName: 'strataDocUpload'
      })
    }
    if (exemptionReason === PrExemptionReason.FRACTIONAL_OWNERSHIP) {
      const hasFractionalAgreement = apiDocuments.value.some(
        item => item.documentType === DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT
      )
      const hasPropertyTitleWithFractional = apiDocuments.value.some(
        item => item.documentType === DocumentUploadType.PROPERTY_TITLE_WITH_FRACTIONAL_OWNERSHIP
      )
      docs.push({
        isValid: hasFractionalAgreement,
        icon: hasFractionalAgreement ? 'i-mdi-check' : 'i-mdi-close',
        label: t(`form.pr.docType.${DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT}`),
        formFieldName: 'fractionalOwnerDocUpload'
      },
      {
        isValid: hasPropertyTitleWithFractional,
        icon: hasPropertyTitleWithFractional ? 'i-mdi-check' : 'i-mdi-close',
        label: t(`form.pr.docType.${DocumentUploadType.PROPERTY_TITLE_WITH_FRACTIONAL_OWNERSHIP}`),
        formFieldName: 'fractionalOwnerDocUpload'
      })
    }

    if (isTenant.value && reqs.isPrincipalResidenceRequired && exemptionReason === undefined) {
      const isRentValid = apiDocuments.value.some(
        item => [DocumentUploadType.TENANCY_AGREEMENT, DocumentUploadType.RENT_RECEIPT_OR_BANK_STATEMENT]
          .includes(item.documentType)
      )
      docs.push({
        isValid: isRentValid,
        icon: isRentValid ? 'i-mdi-check' : 'i-mdi-close',
        label: t('label.rentalAgreementOrNoticeOfIncrease'),
        formFieldName: 'tenancyDocUpload'
      })
    }

    return docs
  })

  const potentialRequiredDocs = computed<string[]>(() => {
    const exemptionReason = reqStore.prRequirements.prExemptionReason
    const docs = []

    if (exemptionReason === undefined) {
      const hostType = propStore.unitDetails.hostType
      if (isNewPrDocumentsListEnabled.value &&
        (hostType === PropertyHostType.OWNER || hostType === PropertyHostType.FRIEND_RELATIVE)) {
        docs.push(t('label.proofOfPrOwner'))
      } else if (isNewPrDocumentsListEnabled.value && hostType === PropertyHostType.LONG_TERM_TENANT) {
        docs.push(t('label.proofOfPrTenant'))
      } else {
        docs.push(t('label.proofOfPr'))
      }
    }

    docs.push(t('label.localGovShortTermRentalBL'))

    if (exemptionReason === PrExemptionReason.STRATA_HOTEL) {
      docs.push(t('label.supportingStrataDocs'))
    }

    if (exemptionReason === PrExemptionReason.FRACTIONAL_OWNERSHIP) {
      docs.push(
        t(`form.pr.docType.${DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT}`),
        t(`form.pr.docType.${DocumentUploadType.PROPERTY_TITLE_WITH_FRACTIONAL_OWNERSHIP}`)
      )
    }

    if (isTenant.value) {
      docs.push(t('label.rentalAgreementOrNoticeOfIncrease'))
    }

    return docs
  })

  const allDocTypeOptions = computed(() => {
    if (isNewPrDocumentsListEnabled.value) {
      // new document list with added doc types
      return [
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
          label: t('form.pr.docType.ICBC_CERTIFICATE_OF_INSURANCE_FULL'), // todo: after new docs are released - update this
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
          label: t(`form.pr.docType.${DocumentUploadType.GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE}`),
          value: DocumentUploadType.GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE
        },
        {
          label: t(`form.pr.docType.${DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT}`),
          value: DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT
        },
        {
          label: t(`form.pr.docType.${DocumentUploadType.PROPERTY_TITLE_WITH_FRACTIONAL_OWNERSHIP}`),
          value: DocumentUploadType.PROPERTY_TITLE_WITH_FRACTIONAL_OWNERSHIP
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
        // New document types
        {
          label: t(`form.pr.docType.${DocumentUploadType.TITLE_CERTIFICATE_OR_SEARCH}`),
          value: DocumentUploadType.TITLE_CERTIFICATE_OR_SEARCH
        },
        {
          label: t(`form.pr.docType.${DocumentUploadType.SPECULATION_VACANCY_TAX_DECLARATION}`),
          value: DocumentUploadType.SPECULATION_VACANCY_TAX_DECLARATION
        },
        {
          label: t(`form.pr.docType.${DocumentUploadType.HOME_OWNER_GRANT_APPROVAL}`),
          value: DocumentUploadType.HOME_OWNER_GRANT_APPROVAL
        },
        {
          label: t(`form.pr.docType.${DocumentUploadType.NOTARIZED_REAL_ESTATE_DOC}`),
          value: DocumentUploadType.NOTARIZED_REAL_ESTATE_DOC
        },
        {
          label: t(`form.pr.docType.${DocumentUploadType.PROPERTY_TRANSFER_TAX_RETURN}`),
          value: DocumentUploadType.PROPERTY_TRANSFER_TAX_RETURN
        },
        {
          label: t(`form.pr.docType.${DocumentUploadType.AFFIDAVIT_PRINCIPAL_RESIDENCE}`),
          value: DocumentUploadType.AFFIDAVIT_PRINCIPAL_RESIDENCE
        },
        {
          label: t(`form.pr.docType.${DocumentUploadType.ASSESSMENT_ACT_NOTICE}`),
          value: DocumentUploadType.ASSESSMENT_ACT_NOTICE
        },
        {
          label: t(`form.pr.docType.${DocumentUploadType.MORTGAGE_STATEMENT_OR_SAVINGS_DOC}`),
          value: DocumentUploadType.MORTGAGE_STATEMENT_OR_SAVINGS_DOC
        },
        {
          label: t(`form.pr.docType.${DocumentUploadType.OTHERS}`),
          value: DocumentUploadType.OTHERS
        }
      ]
    }

    // Original document list
    return [
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
  })

  // Filter document options
  const docTypeOptions = computed(() => {
    const permitStore = useHostPermitStore()
    const needsBusinessLicense = permitStore.needsBusinessLicenseDocumentUpload
    // Check if NOC is pending
    const isNocPending = permitStore.application?.header.status === ApplicationStatus.NOC_PENDING ||
      permitStore.application?.header.status === ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING ||
      permitStore.registration?.nocStatus === RegistrationNocStatus.NOC_PENDING
    // If both business license is needed AND NOC is pending
    if (needsBusinessLicense && isNocPending) {
      return allDocTypeOptions.value
    }
    // If only business license is needed
    if (needsBusinessLicense) {
      return allDocTypeOptions.value.filter(option =>
        option.value === DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE
      )
    }
    return allDocTypeOptions.value
  })

  async function addStoredDocument (
    doc: File,
    uploadStep: DocumentUploadStep = DocumentUploadStep.APPLICATION
  ): Promise<void> {
    const uiDoc: UiDocument = {
      file: doc,
      apiDoc: {} as ApiDocument,
      name: doc.name,
      type: selectedDocType.value!,
      id: uuidv4(),
      loading: true,
      uploadStep,
      uploadDate: new Date().toISOString().split('T')[0]
    }

    storedDocuments.value.push(uiDoc)

    selectedDocType.value = undefined

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

  async function addDocumentToApplication (uiDoc: UiDocument, applicationNumber: string): Promise<void> {
    return await addDocument(uiDoc, applicationNumber, 'applications')
  }

  async function addDocumentToRegistration (uiDoc: UiDocument, registrationId: number): Promise<void> {
    return await addDocument(uiDoc, registrationId, 'registrations')
  }

  /**
   * Add a document to a specified application or registration.
   *
   * Upload a `uiDoc` with the given `id` (via PUT method).
   *
   * @param {UiDocument} uiDoc - The document to upload, containing file data and metadata.
   * @param {string | string} id - The id of the application or registration to which the document is being added.
   * @param {'applications' | 'registrations'} type - Type is either applications or registrations
   * @returns {Promise<void>} A promise that resolves when the document has been added or rejects if an error occurs.
   */
  async function addDocument (
    uiDoc: UiDocument,
    id: string | number, // string for applications, number for registrations
    type: 'applications' | 'registrations'
  ): Promise<void> {
    try {
      uiDoc.loading = true

      // create payload
      const formData = new FormData()
      formData.append('file', uiDoc.file)
      formData.append('documentType', uiDoc.type)
      uiDoc.uploadStep && formData.append('uploadStep', uiDoc.uploadStep)
      uiDoc.uploadDate && formData.append('uploadDate', uiDoc.uploadDate)

      // Add isUploadedFromAffectedMunicipality for business license uploads from affected municipalities
      const isBlFromAffectedMunicipality = uiDoc.type === DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE &&
        useHostPermitStore().needsBusinessLicenseDocumentUpload
      if (isBlFromAffectedMunicipality) {
        formData.append('isUploadedFromAffectedMunicipality', 'true')
      }

      // submit file
      const res = await $strrApi<ApiDocument>(`/${type}/${id}/documents`, {
        method: type === 'applications' ? 'PUT' : 'POST',
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
      // TODO: update api to accept and return the following form data fields
      // formData.append('documentType', uiDoc.type)
      // uiDoc.uploadStep && formData.append('uploadStep', uiDoc.uploadStep)
      // uiDoc.uploadDate && formData.append('uploadDate', uiDoc.uploadDate)

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

  async function removeDocumentsByType (types: DocumentUploadType[]) {
    const docsToDelete = storedDocuments.value.filter(
      doc => types.includes(doc.type)
    )

    if (docsToDelete.length === 0) {
      return
    }

    await Promise.all(docsToDelete.map(doc => removeStoredDocument(doc)))
  }

  const documentCategories = computed<Record<DocumentTypeKey, DocumentUploadType[]>>(() => {
    if (isNewPrDocumentsListEnabled.value) {
      return {
        // new list of documents
        bcId: [
          DocumentUploadType.BC_DRIVERS_LICENSE,
          DocumentUploadType.BCSC,
          DocumentUploadType.COMBINED_BCSC_LICENSE
        ],
        uniqueColumnB: [
          DocumentUploadType.ICBC_CERTIFICATE_OF_INSURANCE,
          DocumentUploadType.HOME_INSURANCE_SUMMARY,
          DocumentUploadType.PROPERTY_TAX_NOTICE,
          DocumentUploadType.SPECULATION_VACANCY_TAX_DECLARATION,
          DocumentUploadType.PROPERTY_ASSESSMENT_NOTICE,
          DocumentUploadType.HOME_OWNER_GRANT_APPROVAL,
          DocumentUploadType.TITLE_CERTIFICATE_OR_SEARCH,
          DocumentUploadType.NOTARIZED_REAL_ESTATE_DOC,
          DocumentUploadType.PROPERTY_TRANSFER_TAX_RETURN,
          DocumentUploadType.AFFIDAVIT_PRINCIPAL_RESIDENCE,
          DocumentUploadType.ASSESSMENT_ACT_NOTICE,
          DocumentUploadType.MORTGAGE_STATEMENT_OR_SAVINGS_DOC
        ],
        nonUniqueColumnB: [
          DocumentUploadType.OTHERS,
          DocumentUploadType.GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE
        ],
        rental: [
          DocumentUploadType.TENANCY_AGREEMENT,
          DocumentUploadType.RENT_RECEIPT_OR_BANK_STATEMENT
        ],
        exemption: [
          DocumentUploadType.STRATA_HOTEL_DOCUMENTATION,
          DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT,
          DocumentUploadType.PROPERTY_TITLE_WITH_FRACTIONAL_OWNERSHIP
        ],
        bl: [
          DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE
        ]
      }
    }

    // original list of documents
    return {
      bcId:
     [ // bc id cards only count as 1 document
       DocumentUploadType.BC_DRIVERS_LICENSE,
       DocumentUploadType.BCSC,
       DocumentUploadType.COMBINED_BCSC_LICENSE
     ],
      uniqueColumnB: [ // 1 doc from bcId and 2 unique docs from this list are required
        DocumentUploadType.ICBC_CERTIFICATE_OF_INSURANCE,
        DocumentUploadType.HOME_INSURANCE_SUMMARY,
        DocumentUploadType.PROPERTY_TAX_NOTICE,
        DocumentUploadType.SPEC_TAX_CONFIRMATION,
        DocumentUploadType.PROPERTY_ASSESSMENT_NOTICE,
        DocumentUploadType.HOG_DECLARATION
      ],
      nonUniqueColumnB: [ // or 1 doc from bcId and 2 non-unique docs from this list are required
        DocumentUploadType.UTILITY_BILL,
        DocumentUploadType.OTHERS,
        DocumentUploadType.GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE
      ],
      rental: [ // rental docs only count as 1 document
        DocumentUploadType.TENANCY_AGREEMENT,
        DocumentUploadType.RENT_RECEIPT_OR_BANK_STATEMENT
      ],
      exemption: [
        DocumentUploadType.STRATA_HOTEL_DOCUMENTATION,
        DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT,
        DocumentUploadType.PROPERTY_TITLE_WITH_FRACTIONAL_OWNERSHIP
      ],
      bl: [
        DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE
      ]
    }
  })

  const prDocs: DocumentUploadType[] = [
    ...documentCategories.value.bcId,
    ...documentCategories.value.uniqueColumnB,
    ...documentCategories.value.nonUniqueColumnB,
    ...documentCategories.value.rental
  ]

  function validateIdentityDocumentDropdown (): boolean {
    return apiDocuments.value.some(doc => documentCategories.value.bcId.includes(doc.documentType))
  }

  function validatePrincipalResidenceDropdown (): boolean {
    // get unique column b docs
    const columnBFilteredUnique = uniqBy(
      apiDocuments.value.filter(item => documentCategories.value.uniqueColumnB.includes(item.documentType)),
      'documentType'
    )

    // get non-unique column b docs
    const columnBFilteredNonUnique = apiDocuments.value.filter(item =>
      documentCategories.value.nonUniqueColumnB.includes(item.documentType)
    )

    // const columnACount = bcIdDocCount
    const columnBCount = columnBFilteredUnique.length + columnBFilteredNonUnique.length

    // validate at least 1 of column a and 2 of column b
    return columnBCount >= 2
  }

  function validatePrincipalResidenceDocuments (): boolean {
    // get unique column b docs
    const columnBFilteredUnique = uniqBy(
      apiDocuments.value.filter(item => documentCategories.value.uniqueColumnB.includes(item.documentType)),
      'documentType'
    )

    // get non-unique column b docs
    const columnBFilteredNonUnique = apiDocuments.value.filter(item =>
      documentCategories.value.nonUniqueColumnB.includes(item.documentType)
    )

    // get bc id docs
    const bcIdDocsExist = apiDocuments.value.some(doc => documentCategories.value.bcId.includes(doc.documentType))
    // only count bcid docs as 1 document
    const bcIdDocCount = bcIdDocsExist ? 1 : 0

    // get rental docs
    const rentalDocsExist = isTenant.value &&
      apiDocuments.value.some(doc => documentCategories.value.rental.includes(doc.documentType))
    // only count rental docs as 1 document
    const rentalDocCount = rentalDocsExist ? 1 : 0

    // get doc count
    const columnACount = bcIdDocCount
    const columnBCount = columnBFilteredUnique.length + columnBFilteredNonUnique.length + rentalDocCount

    // validate at least 1 of column a and 2 of column b
    return columnACount >= 1 && columnBCount >= 2
  }

  function validateRequiredDocuments () {
    if (!requiredDocs.value.every(doc => doc.isValid === true)) {
      return [{ path: 'documentUpload', message: t('validation.missingReqDocs') }]
    } else {
      return []
    }
  }

  function validateDocumentDropdowns (): Array<{ path: string, message: string }> {
    const invalidDocs = requiredDocs.value.filter(doc => !doc.isValid)

    if (invalidDocs.length === 0) {
      return []
    }

    const validationErrors = invalidDocs.map(doc => ({
      path: doc.formFieldName || '',
      message: t('validation.missingReqDocs')
    }))

    return validationErrors
  }

  // use this to remove documents from store and from api
  async function resetApiDocs () {
    const docsToDelete = [...storedDocuments.value]
    for (const doc of docsToDelete) {
      await removeStoredDocument(doc)
    }
    selectedDocType.value = undefined
  }

  // use this to reset store only
  function $reset () {
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
    documentCategories,
    prDocs,
    deleteDocument,
    addStoredDocument,
    addDocumentToApplication,
    addDocumentToRegistration,
    removeStoredDocument,
    validateRequiredDocuments,
    validateDocumentDropdowns,
    resetApiDocs,
    removeDocumentsByType,
    $reset
  }
})
