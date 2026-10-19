import { downloadFile } from '~/utils/download-file'
import type { ApiApplicationBaseResp, ApiDocument, ApiRegistrationResp } from '~/interfaces/strr-api'
import type { UiDocument } from '~/interfaces/ui-document'

export const useStrrBasePermit = <R extends ApiRegistrationResp, A extends ApiApplicationBaseResp, B>() => {
  const t = useNuxtApp().$i18n.t // this was casuing an issue when using the composable in route middleware
  const {
    getAccountApplication,
    getAccountRegistrations,
    getApplicationReceipt,
    getDocument,
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

  const loadPermitData = async (
    applicationId?: string,
    applicationType?: ApplicationType,
    skipRegistration = false
  ) => {
    // Get application
    application.value = await getAccountApplication<A>(applicationId, applicationType) as A

    if (application.value?.header.status === ApplicationStatus.PAYMENT_DUE) {
      // there is a lag in the payment Q, trigger the strr api to grab the most current pay details
      application.value = await updatePaymentDetails<A>(application.value.header.applicationNumber)
    }

    // conditions when registration needs to be loaded
    const shouldLoadRegistration =
      application.value?.header.applicationType !== 'renewal' ||
        application.value?.registration?.registrationType === ApplicationType.PLATFORM

    if ((application.value?.header.registrationId &&
      application.value?.header.status !== ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING) &&
      shouldLoadRegistration &&
      !skipRegistration
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

  const openDocInNewTab = async (
    supportingDocument: ApiDocument | UiDocument,
    appRegNumberOverride?: string | number,
    typeOverride?: 'applications' | 'registrations'
  ) => {
    const apiDoc = 'apiDoc' in supportingDocument ? supportingDocument.apiDoc : supportingDocument
    const uiDoc = 'loading' in supportingDocument ? supportingDocument : undefined

    if (uiDoc) {
      uiDoc.loading = true
    }

    try {
      if (uiDoc?.file instanceof File && uiDoc.file.size > 0) {
        const url = URL.createObjectURL(uiDoc.file)
        window.open(url, '_blank')
        URL.revokeObjectURL(url)
        return
      }

      const fileKey = apiDoc?.fileKey
      if (!fileKey) {
        throw new Error('Missing fileKey')
      }

      const isReg = typeOverride
        ? typeOverride === 'registrations'
        : (!!registration.value?.registrationNumber || !!registration.value?.id)
      const type = typeOverride ?? (isReg ? 'registrations' : 'applications')
      const appRegNumber = appRegNumberOverride ?? (
        isReg ? registration.value?.id : application.value?.header?.applicationNumber
      )

      if (!appRegNumber) {
        throw new Error('Missing applicationNumber or registrationId')
      }

      let file: Blob | undefined
      try {
        file = await getDocument(appRegNumber, fileKey, type)
      } catch (firstErr) {
        if (type === 'registrations' && application.value?.header?.applicationNumber) {
          file = await getDocument(
            application.value.header.applicationNumber,
            fileKey,
            'applications'
          )
        } else {
          throw firstErr
        }
      }

      if (!file) {
        throw new Error('Document content is empty or unavailable')
      }

      const blob = new Blob([file], { type: apiDoc?.fileType || 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      URL.revokeObjectURL(url)
    } catch (e) {
      logFetchError(e, t('error.openDocument.description'))
      const strrModal = useStrrModals()
      strrModal.openErrorModal(t('error.openDocument.title'), t('error.openDocument.description'), false)
    } finally {
      if (uiDoc) {
        uiDoc.loading = false
      }
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
    openDocInNewTab,
    getDocument,
    isApplicationStatus,
    loadPermitData,
    loadPermitRegistrationData
  }
}
