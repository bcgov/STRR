/**
 * Composable for managing dashboard todos shared between application and registration detail pages
 */
export const useDashboardTodos = () => {
  const { t } = useNuxtApp().$i18n
  const localePath = useLocalePath()
  const permitStore = useHostPermitStore()
  const {
    registration,
    permitDetails,
    renewalRegId,
    needsBusinessLicenseDocumentUpload
  } = storeToRefs(permitStore)

  const {
    isEligibleForRenewal,
    hasRegistrationRenewalDraft,
    hasRegistrationRenewalPaymentPending,
    renewalDraftId,
    renewalPaymentPendingId,
    renewalDueDate,
    renewalDateCounter,
    isRenewalPeriodClosed,
    getRegistrationRenewalTodos
  } = useRenewals()

  const { getAccountApplication, deleteApplication } = useStrrApi()
  const { isRenewalsEnabled } = useHostFeatureFlags()

  const todos = ref<Todo[]>([])

  // Check if there's a pending renewal application (PAID or FULL_REVIEW status)
  const hasPendingRenewalProcessing = computed(() => {
    const apps = (registration.value as any)?.header?.applications || []
    if (apps.length === 0) {
      return false
    }
    const latestApp = apps[0]
    const pendingStatuses = ['PAID', 'FULL_REVIEW']
    return latestApp?.applicationType === 'renewal' &&
      pendingStatuses.includes(latestApp?.applicationStatus)
  })

  // Common translation props for scroll-to-link
  const getScrollLinkTranslationProps = () => ({
    newLine: '<br/>',
    boldStart: '<strong>',
    boldEnd: '</strong>',
    linkStart: "<button type='button'" +
      "onClick=\"document.getElementById('summary-supporting-info').scrollIntoView({ behavior: 'smooth' })\"" +
      "class='text-blue-500 underline'>",
    linkEnd: '</button>'
  })

  // Add NOC todo if applicable
  const addNocTodo = () => {
    if (registration.value?.nocStatus === RegistrationNocStatus.NOC_PENDING) {
      const translationProps = getScrollLinkTranslationProps()
      const nocEndDate = dateToString(permitDetails.value.nocEndDate as Date)

      todos.value.push({
        id: 'todo-reg-noc-add-docs',
        title: `${t('todos.registrationNoc.title1')} ${nocEndDate} ${t('todos.registrationNoc.title2')}`,
        subtitle: `${t('todos.registrationNoc.general', translationProps)}`
      })
    }
  }

  // Add business license upload todo if conditions are met
  const addBusinessLicenseTodo = () => {
    if (needsBusinessLicenseDocumentUpload.value) {
      const translationProps = {
        ...getScrollLinkTranslationProps(),
        mailto: "<a href='mailto:STRregistry@gov.bc.ca' class='text-blue-500 underline'>STRregistry@gov.bc.ca</a>"
      }

      todos.value.push({
        id: 'todo-business-license-upload',
        title: t('todos.businessLicense.title'),
        subtitle: t('todos.businessLicense.subtitle', translationProps),
        icon: 'i-mdi-alert',
        iconClass: 'text-orange-500'
      })
    }
  }

  // Watch for Registration Renewals props and update related ToDos
  const setupRenewalTodosWatch = () => {
    watch([
      isRenewalsEnabled,
      isRenewalPeriodClosed,
      registration,
      isEligibleForRenewal,
      hasRegistrationRenewalDraft,
      hasRegistrationRenewalPaymentPending
    ], () => {
      const translationProps = {
        newLine: '<br/>',
        boldStart: '<strong>',
        boldEnd: '</strong>'
      }

      // remove all renewal todos before adding new ones
      const renewalTodoIds = [
        'todo-renew-registration-closed',
        'todo-renew-registration',
        'todo-renewal-draft',
        'todo-renewal-payment-pending'
      ]
      todos.value = todos.value.filter(todo => !renewalTodoIds.includes(todo.id))

      if (isRenewalsEnabled && isRenewalPeriodClosed.value) {
        todos.value.push({
          id: 'todo-renew-registration-closed',
          title: t('todos.renewalClosed.title'),
          subtitle: t('todos.renewalClosed.subtitle', translationProps)
        })
      } else if (isRenewalsEnabled && registration.value && isEligibleForRenewal.value) {
        const isOverdue = renewalDateCounter.value < 0
        const dueDateCount = isOverdue
          ? t('label.renewalOverdue')
          : t('label.renewalDayCount', renewalDateCounter.value)

        todos.value.push({
          id: 'todo-renew-registration',
          title: `${t('todos.renewal.title1')} ${renewalDueDate.value} ${t('todos.renewal.title2')} (${dueDateCount})`,
          subtitle: t(isOverdue
            ? 'todos.renewal.expired'
            : 'todos.renewal.expiresSoon', translationProps),
          buttons: [{
            label: t('btn.renew'),
            action: async () => {
              renewalRegId.value = registration.value?.id.toString()
              await navigateTo({
                path: localePath('/application'),
                query: { renew: 'true' }
              })
            }
          }]
        })
      } else if (isRenewalsEnabled && registration.value && hasRegistrationRenewalDraft.value) {
        // todo for existing renewal draft
        todos.value.push({
          id: 'todo-renewal-draft',
          title: t('todos.renewalDraft.title'),
          subtitle: t('todos.renewalDraft.subtitle'),
          buttons: [
            {
              label: t('todos.renewalDraft.resumeButton'),
              action: async () => {
                renewalRegId.value = undefined // reset renewal id, so the draft app is loaded instead of registration
                await navigateTo({
                  path: localePath('/application'),
                  query: { renew: 'true', applicationId: renewalDraftId.value }
                })
              }
            },
            {
              label: t('todos.renewalDraft.deleteDraft'),
              icon: 'i-mdi-delete',
              action: async () => {
                // delete draft application
                await deleteApplication(renewalDraftId.value)
                // remove renewal draft todo
                todos.value = todos.value.filter(todo => todo.id !== 'todo-renewal-draft')
                // reload registration renewal todos
                await getRegistrationRenewalTodos()
              }
            }
          ]
        })
      } else if (isRenewalsEnabled && registration.value && hasRegistrationRenewalPaymentPending.value) {
        // todo for renewal payment pending
        todos.value.push({
          id: 'todo-renewal-payment-pending',
          title: t('todos.renewalPayment.title'),
          subtitle: t('todos.renewalPayment.subtitle'),
          buttons: [{
            label: t('todos.renewalPayment.button'),
            action: async () => {
              const { handlePaymentRedirect } = useConnectNav()
              // Get the payment token
              const applicationResponse = await getAccountApplication(
                renewalPaymentPendingId.value
              )
              const paymentToken = applicationResponse?.header.paymentToken
              const appNum = applicationResponse?.header.applicationNumber
              if (paymentToken) {
                handlePaymentRedirect(
                  paymentToken,
                  '/dashboard/' + appNum
                )
              }
            }
          }]
        })
      }
    }, { immediate: true })
  }

  return {
    todos,
    hasPendingRenewalProcessing,
    addNocTodo,
    addBusinessLicenseTodo,
    setupRenewalTodosWatch
  }
}
