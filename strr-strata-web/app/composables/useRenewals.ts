import { DateTime } from 'luxon'

export const useRenewals = () => {
  const { getRegistrationToDos } = useStrrApi()
  const { t } = useI18n()
  const localePath = useLocalePath()

  const { registration } = storeToRefs(useStrrStrataStore())
  const { isRenewalsEnabled } = useStrataFeatureFlags()

  const isEligibleForRenewal = ref(false)

  const getStrataRegistrationTodos = async (): Promise<Todo[]> => {
    if (!registration.value) {
      return []
    }

    const strataRegTodos: Todo[] = []

    const { todos } = await getRegistrationToDos(registration.value.id)

    // check if todos have a renewable registration
    const hasRenewalTodo: boolean = todos.find(todo => todo?.task?.type === RegistrationTodoType.REGISTRATION_RENEWAL)

    if (isRenewalsEnabled.value && hasRenewalTodo) {
      const translationProps = {
        newLine: '<br/>',
        boldStart: '<strong>',
        boldEnd: '</strong>'
      }

      // converts expiry date to medium format date, eg Apr 1, 2025
      const renewalDueDate = computed((): string =>
        DateTime.fromISO(registration.value?.expiryDate).toLocaleString(DateTime.DATE_MED)
      )

      // number of days for renewal due date
      const renewalDateCounter = computed((): number => {
        const expDate = DateTime.fromISO(registration.value?.expiryDate).setZone('America/Vancouver')
        const today = DateTime.now().setZone('America/Vancouver')

        return Math.floor(expDate.diff(today, 'days').toObject().days)
      })

      const isOverdue = renewalDateCounter.value < 0

      // label for the due days count
      const dueDateCount = isOverdue
        ? t('label.renewalOverdue')
        : t('label.renewalDayCount', renewalDateCounter.value)

      strataRegTodos.push({
        id: 'todo-renew-strata',
        title: `${t('todos.renewal.title1')} ${renewalDueDate.value} ${t('todos.renewal.title2')} (${dueDateCount})`,
        subtitle: t(isOverdue
          ? 'todos.renewal.expired'
          : 'todos.renewal.expiresSoon', translationProps),
        buttons: [{
          label: t('btn.renew'),
          action: async () => {
            useState('renewalRegId', () => registration.value?.id)
            await navigateTo({
              path: localePath('/strata-hotel/application'),
              query: { renew: 'true' }
            })
          }
        }]
      })
    }

    return strataRegTodos
  }

  return {
    isEligibleForRenewal,
    getStrataRegistrationTodos
  }
}
