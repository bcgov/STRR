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

  const loadPermitData = async (id?: string) => {
    if (id) {
      // check if the id matches a registration under this account
      registration.value = await getAccountRegistrations<R>(id) as R
      if (!registration.value) {
        // No registrations under the account so get by application
        application.value = await getAccountApplications<A>(id) as A
      }
    } else {
      const applications = await getAccountApplications<A>() as A[]
      if (applications.length) {
        // set active strata to the most recent application (ordered by api: newest to oldest)
        application.value = applications[0]
        if (isApprovedApplication.value) {
          // TODO: should be able to get a registration based on the application number and vice versa?
          // get registrations under this account
          const registrations = await getAccountRegistrations<R>() as R[]
          if (
            registrations.length &&
            // NOTE: below line is just for ts
            (registrations[0] && application.value) &&
            registrations[0].startDate > application.value.header.applicationDateTime
          ) {
            // set active platform to the most recent registration
            registration.value = registrations.sort(
              // TODO: update once api allows sorting
              (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]
          }
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
