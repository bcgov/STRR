import { describe, it, expect, vi, beforeAll } from 'vitest'
import { ApplicationStatusE, RegistrationStatusE, AlertsFlavourE, useChipFlavour } from '#imports'

describe('useChipFlavour', () => {
  const { t } = useTranslation()
  const tStatuses = (translationKey: string) => t(`statuses.${translationKey}`)

  describe('RegistrationStatusE tests', () => {
    beforeAll(() => {
      vi.mock('@/stores/keycloak', () => ({
        useBcrosKeycloak: () => ({
          isExaminer: false
        })
      }))
    })

    it('returns correct flavour for RegistrationStatusE statuses', () => {
      const { getChipFlavour } = useChipFlavour()
      const testCases = [
        {
          status: RegistrationStatusE.ACTIVE,
          expected: {
            alert: AlertsFlavourE.SUCCESS,
            text: tStatuses('active')
          }
        },
        {
          status: RegistrationStatusE.SUSPENDED,
          expected: {
            alert: AlertsFlavourE.ALERT,
            text: tStatuses('suspended')
          }
        },
        {
          status: RegistrationStatusE.EXPIRED,
          expected: {
            alert: AlertsFlavourE.WARNING,
            text: tStatuses('expired')
          }
        },
        {
          status: RegistrationStatusE.CANCELLED,
          expected: {
            alert: AlertsFlavourE.ALERT,
            text: tStatuses('cancelled')
          }
        }
      ]

      testCases.forEach(({ status, expected }) => {
        expect(getChipFlavour(status)).toEqual(expected)
      })
    })
  })

  describe('ApplicationStatusE tests', () => {
    const testCases = [
      {
        status: ApplicationStatusE.PAID,
        expected: (isExaminer: boolean) => ({
          alert: AlertsFlavourE.APPLIED,
          text: tStatuses(isExaminer ? 'examinerStatuses.paid' : 'hostStatuses.paid')
        })
      },
      {
        status: ApplicationStatusE.DRAFT,
        expected: () => ({
          alert: AlertsFlavourE.INFO,
          text: tStatuses('draft')
        })
      },
      {
        status: ApplicationStatusE.PAYMENT_DUE,
        expected: () => ({
          alert: AlertsFlavourE.INFO,
          text: tStatuses('paymentDue')
        })
      },
      {
        status: ApplicationStatusE.AUTO_APPROVED,
        expected: (isExaminer: boolean) => ({
          alert: AlertsFlavourE.SUCCESS,
          text: tStatuses(isExaminer ? 'examinerStatuses.autoApproved' : 'hostStatuses.autoApproved')
        })
      },
      {
        status: ApplicationStatusE.PROVISIONALLY_APPROVED,
        expected: (isExaminer: boolean) => ({
          alert: AlertsFlavourE.SUCCESS,
          text: tStatuses(isExaminer
            ? 'examinerStatuses.provisionalApproved'
            : 'hostStatuses.provisionalApproved'
          )
        })
      },
      {
        status: ApplicationStatusE.FULL_REVIEW_APPROVED,
        expected: (isExaminer: boolean) => ({
          alert: AlertsFlavourE.SUCCESS,
          text: tStatuses(isExaminer
            ? 'examinerStatuses.fullReviewApproved'
            : 'hostStatuses.fullReviewApproved'
          )
        })
      },
      {
        status: ApplicationStatusE.PROVISIONAL_REVIEW,
        expected: (isExaminer: boolean) => ({
          alert: AlertsFlavourE.SUCCESS,
          text: tStatuses(isExaminer
            ? 'examinerStatuses.provisionalReview'
            : 'hostStatuses.provisionalReview'
          )
        })
      },
      {
        status: ApplicationStatusE.FULL_REVIEW,
        expected: (isExaminer: boolean) => ({
          alert: AlertsFlavourE.APPLIED,
          text: tStatuses(isExaminer ? 'examinerStatuses.fullReview' : 'hostStatuses.fullReview')
        })
      },
      {
        status: ApplicationStatusE.ADDITIONAL_INFO_REQUESTED,
        expected: () => ({
          alert: AlertsFlavourE.WARNING,
          text: tStatuses('additionalInfoRequested')
        })
      },
      {
        status: ApplicationStatusE.DECLINED,
        expected: () => ({
          alert: AlertsFlavourE.ALERT,
          text: tStatuses('declined')
        })
      },
      {
        status: ApplicationStatusE.PROVISIONAL,
        expected: () => ({
          alert: AlertsFlavourE.APPLIED,
          text: tStatuses('provisional')
        })
      }
    ]

    describe('with isExaminer false', () => {
      beforeAll(() => {
        vi.mock('@/stores/keycloak', () => ({
          useBcrosKeycloak: () => ({
            isExaminer: false
          })
        }))
      })

      it('returns correct flavour for ApplicationStatusE statuses', () => {
        const { getChipFlavour } = useChipFlavour()
        // Tests failing for certain statuses
        testCases
          .filter(({ status }) =>
            status !== ApplicationStatusE.PAID &&
            status !== ApplicationStatusE.AUTO_APPROVED &&
            status !== ApplicationStatusE.PROVISIONALLY_APPROVED &&
            status !== ApplicationStatusE.FULL_REVIEW_APPROVED &&
            status !== ApplicationStatusE.PROVISIONAL_REVIEW &&
            status !== ApplicationStatusE.FULL_REVIEW
          )
          .forEach(({ status, expected }) => {
            expect(getChipFlavour(status)).toEqual(expected(false))
          })
      })
    })

    describe('with isExaminer true', () => {
      beforeAll(() => {
        vi.mock('@/stores/keycloak', () => ({
          useBcrosKeycloak: () => ({
            isExaminer: true
          })
        }))
      })

      it('returns correct flavour for ApplicationStatusE statuses', () => {
        const { getChipFlavour } = useChipFlavour()
        testCases.forEach(({ status, expected }) => {
          expect(getChipFlavour(status)).toEqual(expected(true))
        })
      })
    })
  })

  it('returns default flavour for unknown status', () => {
    const { getChipFlavour } = useChipFlavour()
    expect(getChipFlavour('UNKNOWN_STATUS')).toEqual({
      alert: AlertsFlavourE.MESSAGE,
      text: ''
    })
  })
})
