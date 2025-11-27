import type { ApiApplicationBaseResp, ApiRegistrationResp } from '~/interfaces/strr-api'
import { downloadFile } from '~/utils/download-file'

export const useStrrBasePermit = <R extends ApiRegistrationResp, A extends ApiApplicationBaseResp, B>() => {
  const t = useNuxtApp().$i18n.t // this was casuing an issue when using the composable in route middleware
  const {
    getAccountApplication,
    getAccountRegistrations,
    getApplicationReceipt,
    getRegistrationCert,
    updatePaymentDetails
  } = useStrrApi()

  // Typescript not unwrapping the generic ref properly without the 'as ...'
  const application = ref<A | undefined>(undefined) as Ref<A | undefined>
  const registration = ref<R | undefined>(undefined) as Ref<R | undefined>
  const permitDetails = computed(() => registration.value || application.value?.registration as B)

  const isApplicationStatus = (statuses: ApplicationStatus[]) =>
    statuses.includes(application.value?.header.status as ApplicationStatus)

  const isApprovedApplication = computed(() => !!application.value &&
    isApplicationStatus([
      ApplicationStatus.FULL_REVIEW_APPROVED,
      ApplicationStatus.AUTO_APPROVED,
      ApplicationStatus.PROVISIONALLY_APPROVED]))

  const isPaidApplication = computed(() => !!application.value &&
    !isApplicationStatus([ApplicationStatus.DRAFT, ApplicationStatus.PAYMENT_DUE]))

  const showPermitDetails = computed(() => !!registration.value ||
    (!!application.value && !isApplicationStatus([ApplicationStatus.DRAFT])))

  const loadPermitData = async (applicationId?: string, applicationType?: ApplicationType) => {
    // Get application
    application.value = await getAccountApplication<A>(applicationId, applicationType) as A

    if (application.value?.header.status === ApplicationStatus.PAYMENT_DUE) {
      // there is a lag in the payment Q, trigger the strr api to grab the most current pay details
      application.value = await updatePaymentDetails<A>(application.value.header.applicationNumber)
    }

    // check if current application is an approved Platform, for which registration would need to be loaded
    const isApprovedPlatform =
      application.value?.header.registrationStatus === RegistrationStatus.ACTIVE &&
        application.value?.registration?.registrationType === ApplicationType.PLATFORM

    const isRenewalDraftPlatform =
      application.value?.header.registrationStatus === RegistrationStatus.EXPIRED &&
        application.value?.header.status === ApplicationStatus.DRAFT &&
        application.value?.registration?.registrationType === ApplicationType.PLATFORM

    // conditions when registration needs to be loaded
    const shouldLoadRegistration =
      application.value?.header.applicationType !== 'renewal' || isApprovedPlatform || isRenewalDraftPlatform

    if ((application.value?.header.registrationId &&
      application.value?.header.status !== ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING) && shouldLoadRegistration
    ) { // do not load registration for Provisional Pending NOC
      // Get linked registration if applicable
      registration.value = await getAccountRegistrations<R>(
        application.value.header.registrationId) as R
    }
  }

  const loadPermitRegistrationData = async (registrationId: string) => {
    registration.value = await getAccountRegistrations<R>(registrationId) as R
  }

  const downloadApplicationReceipt = async () => {
    if (application.value && isPaidApplication.value) {
      const receipt = await getApplicationReceipt(application.value.header.applicationNumber)
      downloadFile(receipt, `${t('word.receipt')}_${application.value.header.applicationNumber}.pdf`)
    }
  }

  const downloadRegistrationCert = async () => {
    if (registration.value) {
      const certificate = await getRegistrationCert(registration.value.id)
      downloadFile(certificate, `${t('word.certificate')}_${registration.value.id}.pdf`)
    }
  }

  return {
    application,
    registration,
    permitDetails,
    isApprovedApplication,
    isPaidApplication,
    showPermitDetails,
    downloadApplicationReceipt,
    downloadRegistrationCert,
    isApplicationStatus,
    loadPermitData,
    loadPermitRegistrationData
  }
}
