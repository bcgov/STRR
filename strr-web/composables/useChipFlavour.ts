import { ApplicationStatusE, RegistrationStatusE, AlertsFlavourE } from '#imports'

export const useChipFlavour = () => {
  const { t } = useTranslation()
  const { isExaminer } = useBcrosKeycloak()

  const tStatuses = (translationKey: string) => t(`statuses.${translationKey}`)
  const statusMap = (flavour: AlertsFlavourE, translationKey: string) => ({
    alert: flavour,
    text: tStatuses(translationKey)
  })

  const examinerOrHostStatusMap = (flavour: AlertsFlavourE, key: string) => ({
    alert: flavour,
    text: isExaminer
      ? tStatuses(`examinerStatuses.${key}`)
      : tStatuses(`hostStatuses.${key}`)
  })

  const getChipFlavour = (status: string): StatusChipFlavoursI['flavour'] => {
    switch (status) {
      case RegistrationStatusE.ACTIVE:
        return statusMap(AlertsFlavourE.SUCCESS, 'active')
      case RegistrationStatusE.SUSPENDED:
        return statusMap(AlertsFlavourE.ALERT, 'suspended')
      case RegistrationStatusE.EXPIRED:
        return statusMap(AlertsFlavourE.WARNING, 'expired')
      case RegistrationStatusE.CANCELLED:
        return statusMap(AlertsFlavourE.ALERT, 'cancelled')
      case ApplicationStatusE.DRAFT:
      case HostApplicationStatusE.DRAFT:
      case ExaminerApplicationStatusE.DRAFT:
        return statusMap(AlertsFlavourE.INFO, 'draft')
      case ApplicationStatusE.PAYMENT_DUE:
      case HostApplicationStatusE.PAYMENT_DUE:
      case ExaminerApplicationStatusE.PAYMENT_DUE:
        return statusMap(AlertsFlavourE.INFO, 'paymentDue')
      case ApplicationStatusE.ADDITIONAL_INFO_REQUESTED:
        return statusMap(AlertsFlavourE.WARNING, 'additionalInfoRequested')
      case ApplicationStatusE.DECLINED:
      case HostApplicationStatusE.DECLINED:
      case ExaminerApplicationStatusE.DECLINED:
        return statusMap(AlertsFlavourE.ALERT, 'declined')
      case ApplicationStatusE.PROVISIONAL:
        return statusMap(AlertsFlavourE.APPLIED, 'provisional')
      case ApplicationStatusE.PAID:
      case HostApplicationStatusE.PAID:
      case ExaminerApplicationStatusE.PAID:
        return examinerOrHostStatusMap(AlertsFlavourE.APPLIED, 'paid')
      case ApplicationStatusE.AUTO_APPROVED:
      case HostApplicationStatusE.AUTO_APPROVED:
      case ExaminerApplicationStatusE.AUTO_APPROVED:
        return examinerOrHostStatusMap(AlertsFlavourE.SUCCESS, 'autoApproved')
      case ApplicationStatusE.PROVISIONALLY_APPROVED:
      case HostApplicationStatusE.PROVISIONALLY_APPROVED:
      case ExaminerApplicationStatusE.PROVISIONALLY_APPROVED:
        return examinerOrHostStatusMap(AlertsFlavourE.SUCCESS, 'provisionalApproved')
      case ApplicationStatusE.FULL_REVIEW_APPROVED:
      case HostApplicationStatusE.FULL_REVIEW_APPROVED:
      case ExaminerApplicationStatusE.FULL_REVIEW_APPROVED:
        return examinerOrHostStatusMap(AlertsFlavourE.SUCCESS, 'fullReviewApproved')
      case ApplicationStatusE.PROVISIONAL_REVIEW:
      case HostApplicationStatusE.PROVISIONAL_REVIEW:
      case ExaminerApplicationStatusE.PROVISIONAL_REVIEW:
        return examinerOrHostStatusMap(AlertsFlavourE.SUCCESS, 'provisionalReview')
      case ApplicationStatusE.FULL_REVIEW:
      case HostApplicationStatusE.FULL_REVIEW:
      case ExaminerApplicationStatusE.FULL_REVIEW:
        return examinerOrHostStatusMap(AlertsFlavourE.APPLIED, 'fullReview')
      default:
        return { alert: AlertsFlavourE.MESSAGE, text: '' }
    }
  }

  return { getChipFlavour }
}
