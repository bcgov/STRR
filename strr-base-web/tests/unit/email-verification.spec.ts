import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia, defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  optionalOrEmptyString,
  getRequiredNonEmptyString,
  getRequiredPhone,
  getRequiredEmail,
  withEmailConfirmation
} from '../../app/utils'

vi.stubGlobal('defineStore', defineStore)
vi.stubGlobal('ref', ref)
vi.stubGlobal('watch', watch)
vi.stubGlobal('optionalOrEmptyString', optionalOrEmptyString)
vi.stubGlobal('getRequiredNonEmptyString', getRequiredNonEmptyString)
vi.stubGlobal('getRequiredPhone', getRequiredPhone)
vi.stubGlobal('getRequiredEmail', getRequiredEmail)
vi.stubGlobal('withEmailConfirmation', withEmailConfirmation)

const { useStrrContactStore } = await import('../../app/stores/strrContact')

const validContact = {
  firstName: 'John',
  middleName: '',
  lastName: 'Doe',
  position: 'Manager',
  phone: {
    countryCode: '1',
    number: '5551234567',
    extension: '',
    countryIso2: 'CA'
  },
  faxNumber: '',
  emailAddress: 'primary@example.com',
  confirmEmailAddress: 'primary@example.com'
}

describe('Email Verification Flow (REGBACKLOG-372)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('useNuxtApp', () => ({
      $i18n: {
        t: (key: string) => {
          const dict: Record<string, string> = {
            'validation.required': 'Required',
            'validation.phone.number': 'Please enter a valid phone number',
            'validation.email': 'Please enter a valid email',
            'validation.emailMatch': 'Email address does not match',
            'validation.name.last': 'Please enter a last name',
            'validation.position': 'Please enter a position'
          }
          return dict[key] || key
        }
      }
    }))
    vi.stubGlobal('useKeycloak', () => ({
      kcUser: { value: { firstName: 'Jane', lastName: 'Doe', loginSource: 'BCSC' } }
    }))
  })

  describe('AC1 & AC2: Schema configuration for primary vs secondary/completing contacts', () => {
    it('primaryRepSchema enforces email confirmation requirement', () => {
      const store = useStrrContactStore()
      const nonMatching = {
        ...validContact,
        emailAddress: 'primary@example.com',
        confirmEmailAddress: 'other@example.com'
      }
      const result = store.primaryRepSchema.safeParse(nonMatching)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Email address does not match')
        expect(result.error.issues[0]?.path).toEqual(['confirmEmailAddress'])
      }
    })

    it('compPartySchema does not enforce email confirmation requirement', () => {
      const store = useStrrContactStore()
      const noConfirmEmail = {
        ...validContact,
        position: '',
        emailAddress: 'completing@example.com',
        confirmEmailAddress: ''
      }
      const result = store.compPartySchema.safeParse(noConfirmEmail)
      expect(result.success).toBe(true)
    })

    it('secondaryRepSchema does not enforce email confirmation requirement', () => {
      const store = useStrrContactStore()
      const noConfirmEmail = {
        ...validContact,
        emailAddress: 'secondary@example.com',
        confirmEmailAddress: ''
      }
      const result = store.secondaryRepSchema.safeParse(noConfirmEmail)
      expect(result.success).toBe(true)
    })
  })

  describe('AC3: Matching Email Addresses are Accepted', () => {
    it('accepts matching email and confirm email addresses', () => {
      const store = useStrrContactStore()
      const matching = {
        ...validContact,
        emailAddress: 'contact@domain.com',
        confirmEmailAddress: 'contact@domain.com'
      }
      const result = store.primaryRepSchema.safeParse(matching)
      expect(result.success).toBe(true)
    })
  })

  describe('AC4 & AC7: Non-Matching Email Addresses are Rejected', () => {
    it('rejects when values do not match and shows error message', () => {
      const store = useStrrContactStore()
      const nonMatching = {
        ...validContact,
        emailAddress: 'user1@example.com',
        confirmEmailAddress: 'user2@example.com'
      }
      const result = store.primaryRepSchema.safeParse(nonMatching)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(
          issue => issue.path.includes('confirmEmailAddress') && issue.message === 'Email address does not match'
        )).toBe(true)
      }
    })

    it('rejects when confirm email is empty while email address is filled', () => {
      const store = useStrrContactStore()
      const missingConfirm = {
        ...validContact,
        emailAddress: 'user@example.com',
        confirmEmailAddress: ''
      }
      const result = store.primaryRepSchema.safeParse(missingConfirm)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(
          issue => issue.path.includes('confirmEmailAddress') && issue.message === 'Email address does not match'
        )).toBe(true)
      }
    })
  })

  describe('AC5: Exact Match Validation (Character for Character)', () => {
    it('rejects case mismatch between email and confirm email', () => {
      const store = useStrrContactStore()
      const caseMismatch = {
        ...validContact,
        emailAddress: 'user@example.com',
        confirmEmailAddress: 'User@example.com'
      }
      const result = store.primaryRepSchema.safeParse(caseMismatch)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Email address does not match')
      }
    })

    it('rejects character discrepancies', () => {
      const store = useStrrContactStore()
      const typo = {
        ...validContact,
        emailAddress: 'john.smith@domain.com',
        confirmEmailAddress: 'john_smith@domain.com'
      }
      const result = store.primaryRepSchema.safeParse(typo)
      expect(result.success).toBe(false)
    })
  })

  describe('AC8: Existing Email Format Validation Remains Intact', () => {
    it('rejects invalid email address format on emailAddress with standard email validation error', () => {
      const store = useStrrContactStore()
      const invalidEmail = {
        ...validContact,
        emailAddress: 'invalid-email-address',
        confirmEmailAddress: 'invalid-email-address'
      }
      const result = store.primaryRepSchema.safeParse(invalidEmail)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(
          issue => issue.path.includes('emailAddress') && issue.message === 'Please enter a valid email'
        )).toBe(true)
      }
    })
  })

  describe('getNewContact', () => {
    it('initializes confirmEmailAddress as empty string', () => {
      const store = useStrrContactStore()
      const newContact = store.getNewContact(false)
      expect(newContact.confirmEmailAddress).toBe('')
    })
  })
})
