import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { mockHostOwner } from '../mocks/mockedData'

const isRegistrationRenewal = ref(false)

const mockEmptyContact = vi.fn((isActiveUser = false) => ({
  firstName: isActiveUser ? 'Jane' : '',
  middleName: isActiveUser ? 'Marie' : '',
  lastName: isActiveUser ? 'Doe' : '',
  phone: { countryIso2: '', countryCode: '', number: '', extension: '' },
  faxNumber: '',
  emailAddress: ''
}))

mockNuxtImport('useStrrContactStore', () => () => ({
  getNewContact: mockEmptyContact
}))

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: () => ({
    isRegistrationRenewal
  })
}))

describe('useHostOwnerStore - getNewHostOwner', () => {
  let store: ReturnType<typeof useHostOwnerStore>

  beforeEach(() => {
    mockEmptyContact.mockClear()
    store = useHostOwnerStore()
    store.$reset()
  })

  it('should return an object with the correct ownerType', () => {
    const owner = store.getNewHostOwner(false, OwnerType.INDIVIDUAL)
    expect(owner.ownerType).toBe(OwnerType.INDIVIDUAL)
  })

  it('should return an object with BUSINESS ownerType when specified', () => {
    const owner = store.getNewHostOwner(false, OwnerType.BUSINESS)
    expect(owner.ownerType).toBe(OwnerType.BUSINESS)
  })

  it('should return blank string defaults for all string fields', () => {
    const owner = store.getNewHostOwner(false, OwnerType.INDIVIDUAL)
    expect(owner.preferredName).toBe('')
    expect(owner.dateOfBirth).toBe('')
    expect(owner.businessLegalName).toBe('')
    expect(owner.businessNumber).toBe('')
    expect(owner.taxNumber).toBe('')
  })

  it('should return a blank mailing address object', () => {
    const owner = store.getNewHostOwner(false, OwnerType.INDIVIDUAL)
    expect(owner.mailingAddress).toEqual({
      street: '',
      streetAdditional: '',
      region: '',
      city: '',
      country: '',
      postalCode: '',
      locationDescription: ''
    })
  })

  it('should set role to undefined', () => {
    expect(store.getNewHostOwner(false, OwnerType.INDIVIDUAL).role).toBeUndefined()
  })

  it('should set isCompParty to false when isActiveUser is false (default)', () => {
    expect(store.getNewHostOwner(false, OwnerType.INDIVIDUAL).isCompParty).toBe(false)
  })

  it('should set isCompParty to true when isActiveUser is true', () => {
    expect(store.getNewHostOwner(true, OwnerType.INDIVIDUAL).isCompParty).toBe(true)
  })

  it('should spread contact fields from getNewContact — non-active user has empty strings', () => {
    const owner = store.getNewHostOwner(false, OwnerType.INDIVIDUAL)
    expect(owner.firstName).toBe('')
    expect(owner.middleName).toBe('')
    expect(owner.lastName).toBe('')
    expect(owner.emailAddress).toBe('')
    expect(owner.faxNumber).toBe('')
  })

  it('should spread contact fields from getNewContact — active user has populated values', () => {
    const owner = store.getNewHostOwner(true, OwnerType.INDIVIDUAL)
    expect(owner.firstName).toBe('Jane')
    expect(owner.middleName).toBe('Marie')
    expect(owner.lastName).toBe('Doe')
  })
})

const validOwner = {
  role: OwnerRole.HOST,
  firstName: '',
  middleName: '',
  lastName: 'Smith',
  preferredName: '',
  faxNumber: '',
  emailAddress: 'test@example.com',
  phone: { countryCode: '1', number: '5551234567' },
  mailingAddress: { street: '123 Main St', city: 'Victoria', region: 'BC', postalCode: 'V8V1A1', country: 'CA' },
  businessLegalName: '',
  businessNumber: '',
  dateOfBirth: '1990-01-01',
  taxNumber: '046454286'
}

describe('useHostOwnerStore - getHostOwnerSchema', () => {
  beforeEach(() => {
    isRegistrationRenewal.value = false
    useHostOwnerStore().isCraNumberOptional = false
  })

  it('should validate conditional fields based on ownerType and role', () => {
    const store = useHostOwnerStore()

    // INDIVIDUAL + HOST: valid base passes
    expect(store.getHostOwnerSchema(OwnerType.INDIVIDUAL, OwnerRole.HOST).safeParse(validOwner).success).toBe(true)

    // INDIVIDUAL + HOST: taxNumber required
    expect(store.getHostOwnerSchema(OwnerType.INDIVIDUAL, OwnerRole.HOST).safeParse({
      ...validOwner, taxNumber: ''
    }).success).toBe(false)

    // INDIVIDUAL + CO_HOST: taxNumber not required
    expect(store.getHostOwnerSchema(OwnerType.INDIVIDUAL, OwnerRole.CO_HOST).safeParse({
      ...validOwner, taxNumber: ''
    }).success).toBe(true)

    // INDIVIDUAL + HOST: taxNumber optional when isCraNumberOptional is true
    store.isCraNumberOptional = true
    expect(store.getHostOwnerSchema(OwnerType.INDIVIDUAL, OwnerRole.HOST).safeParse({
      ...validOwner, taxNumber: ''
    }).success).toBe(true)
    store.isCraNumberOptional = false

    // INDIVIDUAL + HOST: taxNumber optional during renewal
    isRegistrationRenewal.value = true
    expect(store.getHostOwnerSchema(OwnerType.INDIVIDUAL, OwnerRole.HOST).safeParse({
      ...validOwner, taxNumber: ''
    }).success).toBe(true)
    isRegistrationRenewal.value = false

    // INDIVIDUAL + HOST: dateOfBirth required
    expect(store.getHostOwnerSchema(OwnerType.INDIVIDUAL, OwnerRole.HOST).safeParse({
      ...validOwner, dateOfBirth: ''
    }).success).toBe(false)

    // INDIVIDUAL + CO_HOST: dateOfBirth not required
    expect(store.getHostOwnerSchema(OwnerType.INDIVIDUAL, OwnerRole.CO_HOST).safeParse({
      ...validOwner, dateOfBirth: ''
    }).success).toBe(true)

    // BUSINESS + HOST: businessLegalName required
    expect(store.getHostOwnerSchema(OwnerType.BUSINESS, OwnerRole.HOST).safeParse({
      ...validOwner, dateOfBirth: '', taxNumber: '', businessLegalName: ''
    }).success).toBe(false)

    // BUSINESS + HOST: passes when businessLegalName provided
    expect(store.getHostOwnerSchema(OwnerType.BUSINESS, OwnerRole.HOST).safeParse({
      ...validOwner, dateOfBirth: '', taxNumber: '', businessLegalName: 'Acme Corp'
    }).success).toBe(true)

    // All types: lastName required
    expect(store.getHostOwnerSchema(OwnerType.INDIVIDUAL, OwnerRole.HOST).safeParse({
      ...validOwner, lastName: ''
    }).success).toBe(false)
  })
})

describe('useHostOwnerStore - validateOwners', () => {
  beforeEach(() => {
    useHostOwnerStore().$reset()
  })

  it('should return correct result object across all owner combinations', () => {
    const store = useHostOwnerStore()
    const host: HostOwner = { ...mockHostOwner, role: OwnerRole.HOST, isCompParty: true }
    const coHost: HostOwner = { ...mockHostOwner, role: OwnerRole.CO_HOST, isCompParty: false }

    // empty — no host, no comp party
    let result = store.validateOwners() as MultiFormValidationResult
    expect(result[0]!.success).toBe(false)
    expect(result[0]!.errors.some(e => e.path.includes('owners.completingParty'))).toBe(true)
    expect(result[0]!.errors.some(e => e.path.includes('owners.propertyHost'))).toBe(true)

    // comp party present but no host
    store.addHostOwner(coHost)
    result = store.validateOwners() as MultiFormValidationResult
    expect(result[0]!.success).toBe(false)
    expect(result[0]!.errors.some(e => e.path.includes('owners.propertyHost'))).toBe(true)

    // host + comp party — valid
    store.addHostOwner(host)
    result = store.validateOwners() as MultiFormValidationResult
    expect(result[0]!.formId).toBe('host-owners')
    expect(result[0]!.success).toBe(true)
    expect(result[0]!.errors).toHaveLength(0)

    expect(store.validateOwners(true)).toBe(true)
  })
})

describe('useHostOwnerStore - add/remove owners', () => {
  beforeEach(() => {
    useHostOwnerStore().$reset()
  })

  it('should add two owners then remove them one by one', () => {
    const store = useHostOwnerStore()
    const host: HostOwner = { ...mockHostOwner, role: OwnerRole.HOST }
    const coHost: HostOwner = { ...mockHostOwner, role: OwnerRole.CO_HOST, isCompParty: false }

    store.addHostOwner(host)
    expect(store.hostOwners).toHaveLength(1)
    expect(store.hostOwners[0]!.role).toBe(OwnerRole.HOST)

    store.addHostOwner(coHost)
    expect(store.hostOwners).toHaveLength(2)
    expect(store.hostOwners[1]!.role).toBe(OwnerRole.CO_HOST)

    store.removeHostOwner(1)
    expect(store.hostOwners).toHaveLength(1)
    expect(store.hostOwners[0]!.role).toBe(OwnerRole.HOST)

    store.removeHostOwner(0)
    expect(store.hostOwners).toHaveLength(0)
  })
})
