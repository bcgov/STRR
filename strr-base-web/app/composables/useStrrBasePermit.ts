import type { ApiApplicationResp, ApiRegistrationResp } from '~/interfaces/strr-api'
import { downloadFile } from '~/utils/download-file'

export const useStrrBasePermit = <R extends ApiRegistrationResp, A extends ApiApplicationResp>() => {
  const {
    getAccountApplications,
    getAccountRegistrations,
    getApplicationReceipt
  } = useStrrApi()

  // Typescript not unwrapping the generic ref properly without the 'as ...'
  const application = ref<A | undefined>(undefined) as Ref<A | undefined>
  const registration = ref<R | undefined>(undefined) as Ref<R | undefined>
  const permitDetails = computed(() => registration.value || application.value?.registration)

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
    (!!application.value && !isApplicationStatus([ApplicationStatus.DECLINED, ApplicationStatus.DRAFT])))

  const loadPermitData = async (applicationId?: string, applicationType?: ApplicationType) => {
    if (applicationId) {
      // Get specific application
      application.value = await getAccountApplications<A>(applicationId) as A
      if (application.value?.header.registrationId) {
        // Get linked registration if applicable
        registration.value = await getAccountRegistrations<R>(
          application.value.header.registrationId) as R
      }
    } else {
      // Get most recent application
      const applications = await getAccountApplications<A>(undefined, applicationType) as A[]
      if (applications.length) {
        // Set active strata to the most recent application (ordered by api: newest to oldest)
        application.value = applications[0]
        if (application.value?.header.registrationId) {
          // Get linked registration if applicable
          registration.value = await getAccountRegistrations<R>(
            application.value.header.registrationId) as R
        }
      }
    }
  }

  const downloadApplicationReceipt = async () => {
    if (application.value && isPaidApplication.value) {
      const receipt = await getApplicationReceipt(application.value.header.applicationNumber)
      downloadFile(receipt, `${application.value.header.applicationNumber}.pdf`)
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
    isApplicationStatus,
    loadPermitData
  }
}
