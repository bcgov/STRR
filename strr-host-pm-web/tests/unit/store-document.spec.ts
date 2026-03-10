import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { baseEnI18n } from '../mocks/i18n'

// get translate function from i18n
const $t = baseEnI18n.global.t

const unitDetails = reactive({ hostType: PropertyHostType.OWNER })
const isEnhancedDocumentUploadEnabled = ref(false)

const mockPropertyReqs = reactive({
  isBusinessLicenceRequired: false,
  isPrincipalResidenceRequired: true,
  isStraaExempt: false
})
const mockHasReqs = ref(true)

const mockPrRequirements = reactive<{ prExemptionReason: PrExemptionReason | undefined }>({
  prExemptionReason: undefined
})

const mockBlRequirements = reactive({ isBusinessLicenceExempt: true })

const mockPermitStore = reactive({
  needsBusinessLicenseDocumentUpload: false,
  application: null as { header: { status: string } } | null,
  registration: null as { nocStatus: string } | null
})

vi.mock('@/stores/propertyRequirements', () => ({
  usePropertyReqStore: () => ({
    propertyReqs: mockPropertyReqs,
    get hasReqs () { return mockHasReqs.value },
    prRequirements: mockPrRequirements,
    blRequirements: mockBlRequirements
  })
}))

vi.mock('@/stores/hostProperty', () => ({
  useHostPropertyStore: () => ({
    unitDetails
  })
}))

vi.mock('@/composables/useHostFeatureFlags', () => ({
  useHostFeatureFlags: () => ({
    isEnhancedDocumentUploadEnabled
  })
}))

vi.mock('@/composables/useStrrModals', () => ({
  useStrrModals: () => ({
    openErrorModal: vi.fn()
  })
}))

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: () => mockPermitStore
}))

const makeUiDoc = (
  id: string,
  documentType: DocumentUploadType
): UiDocument => ({
  id,
  file: new File([], `${id}.pdf`),
  name: `${id}.pdf`,
  type: documentType,
  loading: false,
  uploadStep: DocumentUploadStep.APPLICATION,
  uploadDate: '2024-01-01',
  apiDoc: {
    documentType,
    fileKey: `key-${id}`,
    fileName: `${id}.pdf`,
    fileType: 'application/pdf'
  }
})

describe('Validate PR Docs', () => {
  beforeEach(() => {
    unitDetails.hostType = PropertyHostType.OWNER
    isEnhancedDocumentUploadEnabled.value = false
    mockPropertyReqs.isStraaExempt = false
    mockPropertyReqs.isPrincipalResidenceRequired = true
    const store = useDocumentStore()
    store.storedDocuments = []
    store.selectedDocType = undefined
  })

  it('should validate principal residence documents', () => {
    const store = useDocumentStore()

    // Two column B docs only — no BC ID
    store.storedDocuments = [
      makeUiDoc('1', DocumentUploadType.PROPERTY_TAX_NOTICE),
      makeUiDoc('2', DocumentUploadType.HOME_INSURANCE_SUMMARY)
    ]
    expect(store.validatePrincipalResidenceDocuments()).toBe(false)

    // BC ID + only 1 column B doc — invalid
    store.storedDocuments = [
      makeUiDoc('1', DocumentUploadType.BC_DRIVERS_LICENSE),
      makeUiDoc('2', DocumentUploadType.PROPERTY_TAX_NOTICE)
    ]
    expect(store.validatePrincipalResidenceDocuments()).toBe(false)

    // BC ID + 2 unique column B docs — valid
    store.storedDocuments = [
      makeUiDoc('1', DocumentUploadType.BC_DRIVERS_LICENSE),
      makeUiDoc('2', DocumentUploadType.PROPERTY_TAX_NOTICE),
      makeUiDoc('3', DocumentUploadType.HOME_INSURANCE_SUMMARY)
    ]
    expect(store.validatePrincipalResidenceDocuments()).toBe(true)

    // Duplicate unique column B of the same type only counts as 1 — invalid
    store.storedDocuments = [
      makeUiDoc('1', DocumentUploadType.BC_DRIVERS_LICENSE),
      makeUiDoc('2', DocumentUploadType.PROPERTY_TAX_NOTICE),
      makeUiDoc('3', DocumentUploadType.PROPERTY_TAX_NOTICE)
    ]
    expect(store.validatePrincipalResidenceDocuments()).toBe(false)

    // Non-unique column B docs (OTHERS) can be duplicated and each counts
    store.storedDocuments = [
      makeUiDoc('1', DocumentUploadType.BC_DRIVERS_LICENSE),
      makeUiDoc('2', DocumentUploadType.OTHERS),
      makeUiDoc('3', DocumentUploadType.OTHERS)
    ]
    expect(store.validatePrincipalResidenceDocuments()).toBe(true)
  })

  it('should validate rental documents', () => {
    unitDetails.hostType = PropertyHostType.LONG_TERM_TENANT
    const store = useDocumentStore()

    // rental docs validation
    store.storedDocuments = [
      makeUiDoc('1', DocumentUploadType.BC_DRIVERS_LICENSE),
      makeUiDoc('2', DocumentUploadType.PROPERTY_TAX_NOTICE),
      makeUiDoc('3', DocumentUploadType.TENANCY_AGREEMENT),
      makeUiDoc('4', DocumentUploadType.RENT_RECEIPT_OR_BANK_STATEMENT)
    ]
    expect(store.validatePrincipalResidenceDocuments()).toBe(true)

    // Rental doc does NOT count as column B for non-tenant owners
    unitDetails.hostType = PropertyHostType.OWNER
    expect(store.validatePrincipalResidenceDocuments()).toBe(false)
  })
})

describe('Required Docs', () => {
  beforeEach(() => {
    unitDetails.hostType = PropertyHostType.OWNER
    isEnhancedDocumentUploadEnabled.value = false
    mockPropertyReqs.isStraaExempt = false
    mockPropertyReqs.isPrincipalResidenceRequired = true
    mockPropertyReqs.isBusinessLicenceRequired = false
    mockBlRequirements.isBusinessLicenceExempt = true
    mockPrRequirements.prExemptionReason = undefined
    const store = useDocumentStore()
    store.storedDocuments = []
    store.selectedDocType = undefined
  })

  it('should return empty array when isStraaExempt is true', () => {
    mockPropertyReqs.isStraaExempt = true
    expect(useDocumentStore().requiredDocs).toEqual([])
  })

  it('should return empty array when neither PR nor BL is required', () => {
    mockPropertyReqs.isPrincipalResidenceRequired = false
    expect(useDocumentStore().requiredDocs).toEqual([])
  })

  it('should return a PR doc entry for an OWNER when PR is required', () => {
    const docs = useDocumentStore().requiredDocs
    expect(docs).toHaveLength(1)
    expect(docs[0]!.formFieldName).toBe('prDocUpload')
  })

  it('should return a PR doc entry for a LONG_TERM_TENANT when PR is required', () => {
    unitDetails.hostType = PropertyHostType.LONG_TERM_TENANT
    const docs = useDocumentStore().requiredDocs
    // tenant gets PR doc + tenancy doc
    expect(docs.length).toBeGreaterThanOrEqual(2)
    expect(docs.some(d => d.formFieldName === 'tenancyDocUpload')).toBe(true)
  })

  describe('Enhanced Doc Upload feature flag enabled', () => {
    beforeEach(() => {
      isEnhancedDocumentUploadEnabled.value = true
    })

    afterEach(() => {
      isEnhancedDocumentUploadEnabled.value = false
    })

    it('should show proofOfIdentity + proofOfPrWithDocs for OWNER', () => {
      const docs = useDocumentStore().requiredDocs
      expect(docs).toHaveLength(2)
      expect(docs[0]!.formFieldName).toBe('identityDocUpload')
      expect(docs[0]!.label).toBe($t('label.proofOfIdentity'))
      expect(docs[1]!.formFieldName).toBe('prDocUpload')
      expect(docs[1]!.label).toBe($t('label.proofOfPrWithDocs'))
    })

    it('should show proofOfIdentity + proofOfPr for LONG_TERM_TENANT', () => {
      unitDetails.hostType = PropertyHostType.LONG_TERM_TENANT
      const docs = useDocumentStore().requiredDocs
      const idDoc = docs.find(d => d.formFieldName === 'identityDocUpload')
      const prDoc = docs.find(d => d.formFieldName === 'prDocUpload')
      expect(idDoc).toBeDefined()
      expect(idDoc!.label).toBe($t('label.proofOfIdentity'))
      expect(prDoc).toBeDefined()
      expect(prDoc!.label).toBe($t('label.proofOfPr'))
    })

    it('should mark identity doc as valid when BC ID doc is present', () => {
      const store = useDocumentStore()
      store.storedDocuments = [makeUiDoc('1', DocumentUploadType.BC_DRIVERS_LICENSE)]
      const idDoc = store.requiredDocs.find(d => d.formFieldName === 'identityDocUpload')
      expect(idDoc!.isValid).toBe(true)
    })
  })

  describe('PR exemptions', () => {
    it('should return PROPERTY_ASSESSMENT_NOTICE entry for FARM_LAND exemption', () => {
      mockPrRequirements.prExemptionReason = PrExemptionReason.FARM_LAND
      const docs = useDocumentStore().requiredDocs
      expect(docs).toHaveLength(1)
      expect(docs[0]!.formFieldName).toBe('prDocUpload')
      expect(docs[0]!.label).toBe($t('label.propertyAssessmentNotice'))
    })

    it('mark FARM_LAND as valid when PROPERTY_ASSESSMENT_NOTICE is uploaded', () => {
      mockPrRequirements.prExemptionReason = PrExemptionReason.FARM_LAND
      const store = useDocumentStore()
      store.storedDocuments = [makeUiDoc('1', DocumentUploadType.PROPERTY_ASSESSMENT_NOTICE)]
      expect(store.requiredDocs[0]!.isValid).toBe(true)
    })

    it('should return strata hotel doc entry for STRATA_HOTEL exemption', () => {
      mockPrRequirements.prExemptionReason = PrExemptionReason.STRATA_HOTEL
      const docs = useDocumentStore().requiredDocs
      expect(docs).toHaveLength(1)
      expect(docs[0]!.formFieldName).toBe('strataDocUpload')
      expect(docs[0]!.label).toBe($t('label.supportingStrataDocs'))
    })

    it('mark strata hotel as valid when STRATA_HOTEL_DOCUMENTATION is uploaded', () => {
      mockPrRequirements.prExemptionReason = PrExemptionReason.STRATA_HOTEL
      const store = useDocumentStore()
      store.storedDocuments = [makeUiDoc('1', DocumentUploadType.STRATA_HOTEL_DOCUMENTATION)]
      expect(store.requiredDocs[0]!.isValid).toBe(true)
    })

    it('should return both fractional doc entries for FRACTIONAL_OWNERSHIP exemption', () => {
      mockPrRequirements.prExemptionReason = PrExemptionReason.FRACTIONAL_OWNERSHIP
      const docs = useDocumentStore().requiredDocs
      expect(docs).toHaveLength(2)
      expect(docs[0]!.label).toBe($t(`form.pr.docType.${DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT}`))
      expect(docs[1]!.label).toBe($t(`form.pr.docType.${DocumentUploadType.PROPERTY_TITLE_WITH_FRACTIONAL_OWNERSHIP}`))
    })

    it('should return BL doc entry when BL is required and not exempt', () => {
      mockPropertyReqs.isBusinessLicenceRequired = true
      mockBlRequirements.isBusinessLicenceExempt = false
      const docs = useDocumentStore().requiredDocs
      expect(docs.some(d => d.formFieldName === 'blDocUpload')).toBe(true)
    })

    it('does not return BL doc entry when BL is required but exempt', () => {
      mockPropertyReqs.isBusinessLicenceRequired = true
      const docs = useDocumentStore().requiredDocs
      expect(docs.some(d => d.formFieldName === 'blDocUpload')).toBe(false)
    })
  })
})

describe('Document Type Options', () => {
  beforeEach(() => {
    mockPermitStore.needsBusinessLicenseDocumentUpload = false
    mockPermitStore.application = null
    mockPermitStore.registration = null
  })

  it('should return all options when business license is not needed', () => {
    const { docTypeOptions } = useDocumentStore()
    expect(docTypeOptions.length).toBeGreaterThan(1)
    expect(docTypeOptions.some(o => o.value === DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE)).toBe(true)
    expect(docTypeOptions.some(o => o.value === DocumentUploadType.BC_DRIVERS_LICENSE)).toBe(true)
  })

  it('should return only LOCAL_GOVT_BUSINESS_LICENSE when business license is needed and NOC is not pending', () => {
    mockPermitStore.needsBusinessLicenseDocumentUpload = true

    const { docTypeOptions } = useDocumentStore()
    expect(docTypeOptions).toHaveLength(1)
    expect(docTypeOptions[0]!.value).toBe(DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE)
  })

  it('should return all options when business license is needed and application has NOC_PENDING status', () => {
    mockPermitStore.needsBusinessLicenseDocumentUpload = true
    mockPermitStore.application = { header: { status: ApplicationStatus.NOC_PENDING } }

    const { docTypeOptions } = useDocumentStore()
    expect(docTypeOptions.length).toBeGreaterThan(1)
    expect(docTypeOptions.some(o => o.value === DocumentUploadType.BC_DRIVERS_LICENSE)).toBe(true)
  })

  it('should return all options when business license is needed and registration has NOC_PENDING status', () => {
    mockPermitStore.needsBusinessLicenseDocumentUpload = true
    mockPermitStore.registration = { nocStatus: RegistrationNocStatus.NOC_PENDING }

    const { docTypeOptions } = useDocumentStore()
    expect(docTypeOptions.length).toBeGreaterThan(1)
  })
})

describe('Potential Required Docs', () => {
  beforeEach(() => {
    unitDetails.hostType = PropertyHostType.OWNER
    mockPrRequirements.prExemptionReason = undefined
  })

  it('includes proofOfPrOwner label for OWNER host type', () => {
    const { potentialRequiredDocs } = useDocumentStore()
    expect(potentialRequiredDocs).toContain($t('label.proofOfPrOwner'))
    expect(potentialRequiredDocs).toContain($t('label.localGovShortTermRentalBL'))
    expect(potentialRequiredDocs).not.toContain($t('label.proofOfPrTenant'))
  })

  it('includes proofOfPrTenant and rentalAgreement labels for LONG_TERM_TENANT host type', () => {
    unitDetails.hostType = PropertyHostType.LONG_TERM_TENANT
    const { potentialRequiredDocs } = useDocumentStore()
    expect(potentialRequiredDocs).toContain($t('label.proofOfPrTenant'))
    expect(potentialRequiredDocs).toContain($t('label.localGovShortTermRentalBL'))
    expect(potentialRequiredDocs).toContain($t('label.rentalAgreementOrNoticeOfIncrease'))
    expect(potentialRequiredDocs).not.toContain($t('label.proofOfPrOwner'))
  })

  it('omits PR label and includes supportingStrataDocs for STRATA_HOTEL exemption', () => {
    mockPrRequirements.prExemptionReason = PrExemptionReason.STRATA_HOTEL
    const { potentialRequiredDocs } = useDocumentStore()
    expect(potentialRequiredDocs).toContain($t('label.localGovShortTermRentalBL'))
    expect(potentialRequiredDocs).toContain($t('label.supportingStrataDocs'))
    expect(potentialRequiredDocs).not.toContain($t('label.proofOfPrOwner'))
  })

  it('omits PR label and includes both fractional docs for FRACTIONAL_OWNERSHIP exemption', () => {
    mockPrRequirements.prExemptionReason = PrExemptionReason.FRACTIONAL_OWNERSHIP
    const { potentialRequiredDocs } = useDocumentStore()
    expect(potentialRequiredDocs).toContain($t('label.localGovShortTermRentalBL'))
    expect(potentialRequiredDocs).toContain(
      $t(`form.pr.docType.${DocumentUploadType.FRACTIONAL_OWNERSHIP_AGREEMENT}`)
    )
    expect(potentialRequiredDocs).toContain(
      $t(`form.pr.docType.${DocumentUploadType.PROPERTY_TITLE_WITH_FRACTIONAL_OWNERSHIP}`)
    )
    expect(potentialRequiredDocs).not.toContain($t('label.proofOfPrOwner'))
  })
})

describe('Document Validation', () => {
  beforeEach(() => {
    unitDetails.hostType = PropertyHostType.OWNER
    isEnhancedDocumentUploadEnabled.value = false
    mockPropertyReqs.isStraaExempt = false
    mockPropertyReqs.isPrincipalResidenceRequired = true
    mockPropertyReqs.isBusinessLicenceRequired = false
    mockBlRequirements.isBusinessLicenceExempt = true
    mockPrRequirements.prExemptionReason = undefined
    const store = useDocumentStore()
    store.storedDocuments = []
  })

  it('should return errors with formFieldName paths when docs are missing', () => {
    const store = useDocumentStore()
    const errors = store.validateDocumentDropdowns()
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toHaveProperty('path')
    expect(errors[0]).toHaveProperty('message')
    expect(errors[0]!.path).toBe('prDocUpload')
  })

  it('should return empty array when all required docs are valid', () => {
    const store = useDocumentStore()
    store.storedDocuments = [
      makeUiDoc('1', DocumentUploadType.BC_DRIVERS_LICENSE),
      makeUiDoc('2', DocumentUploadType.PROPERTY_TAX_NOTICE),
      makeUiDoc('3', DocumentUploadType.HOME_INSURANCE_SUMMARY)
    ]
    expect(store.validateRequiredDocuments()).toEqual([])
  })

  it('should return a documentUpload error when required docs are missing', () => {
    const errors = useDocumentStore().validateRequiredDocuments()
    expect(errors).toHaveLength(1)
    expect(errors[0]!.path).toBe('documentUpload')
    expect(errors[0]!.message).toBe($t('validation.missingReqDocs'))
  })
})

describe('Document Removal', () => {
  beforeEach(() => {
    const store = useDocumentStore()
    store.storedDocuments = []
    store.selectedDocType = undefined
  })

  it('should remove the document', async () => {
    const store = useDocumentStore()
    const doc = makeUiDoc('1', DocumentUploadType.BC_DRIVERS_LICENSE)
    store.storedDocuments = [doc]
    await store.removeStoredDocument(doc)
    expect(store.storedDocuments).toHaveLength(0)
  })

  it('should not remove any document if names do not match the given types', async () => {
    const store = useDocumentStore()
    store.storedDocuments = [makeUiDoc('1', DocumentUploadType.BC_DRIVERS_LICENSE)]
    await store.removeDocumentsByType([DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE])
    expect(store.storedDocuments).toHaveLength(1)
  })

  it('should remove all documents that match the given types', async () => {
    const store = useDocumentStore()
    store.storedDocuments = [
      makeUiDoc('1', DocumentUploadType.BC_DRIVERS_LICENSE),
      makeUiDoc('2', DocumentUploadType.PROPERTY_TAX_NOTICE),
      makeUiDoc('3', DocumentUploadType.HOME_INSURANCE_SUMMARY)
    ]
    await store.removeDocumentsByType([
      DocumentUploadType.PROPERTY_TAX_NOTICE,
      DocumentUploadType.HOME_INSURANCE_SUMMARY
    ])
    expect(store.storedDocuments).toHaveLength(1)
    expect(store.storedDocuments[0]!.type).toBe(DocumentUploadType.BC_DRIVERS_LICENSE)
  })

  it('reset should clear storedDocuments and selectedDocType', () => {
    const store = useDocumentStore()
    store.storedDocuments = [makeUiDoc('1', DocumentUploadType.BC_DRIVERS_LICENSE)]
    store.selectedDocType = DocumentUploadType.PROPERTY_TAX_NOTICE
    store.$reset()
    expect(store.storedDocuments).toHaveLength(0)
    expect(store.selectedDocType).toBeUndefined()
  })
})
