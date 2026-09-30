// https://ui.nuxt.com/components/modal#control-programmatically
import {
  HostExpansionFilingHistory,
  HostExpansionOwners,
  HostExpansionEditRentalUnitForm
} from '#components'
import EditRegistrationEmailForm from '~/components/Host/Expansion/EditRegistrationEmailForm.vue'

export const useHostExpansion = () => {
  const exp = useStrrExpansion()
  const examinerStore = useExaminerStore()
  const {
    startEditRentalUnitAddress,
    resetEditRentalUnitAddress,
    startEditRegistrationEmail,
    resetEditRegistrationEmail
  } = examinerStore
  const {
    isFilingHistoryOpen,
    highlightedFilingHistoryEvent,
    isEditingRentalUnit,
    hasUnsavedRentalUnitChanges,
    isEditingRegistrationEmail,
    hasUnsavedRegistrationEmailChanges
  } = storeToRefs(examinerStore)
  const { openConfirmActionModal, close: closeConfirmActionModal } = useStrrModals()
  const { t } = useNuxtApp().$i18n
  isFilingHistoryOpen.value = false // reset so it's starts hidden by default
  resetEditRentalUnitAddress()
  resetEditRegistrationEmail()
  function openHostOwners (
    display: 'primaryContact' | 'secondaryContact' | 'propertyManager'
  ) {
    exp.open(HostExpansionOwners, {
      display,
      onClose () {
        exp.close()
      }
    })
    isFilingHistoryOpen.value = false
  }

  function openEditRentalUnitForm () {
    startEditRentalUnitAddress()
    exp.open(HostExpansionEditRentalUnitForm, {
      onClose () {
        exp.close()
      }
    })
  }

  function openEditRegistrationEmailForm () {
    startEditRegistrationEmail()
    exp.open(EditRegistrationEmailForm, {
      onClose () {
        exp.close()
      }
    })
  }

  const checkAndPerformAction = (actionFn: () => void) => {
    const hasUnsavedChanges =
      (isEditingRentalUnit.value && hasUnsavedRentalUnitChanges.value) ||
      (isEditingRegistrationEmail.value && hasUnsavedRegistrationEmailChanges.value)

    if (hasUnsavedChanges) {
      openConfirmActionModal(
        t('modal.unsavedChanges.title'),
        t('modal.unsavedChanges.message'),
        t('btn.discardChanges'),
        async () => {
          await Promise.resolve()
          closeConfirmActionModal()
          resetEditRentalUnitAddress()
          resetEditRegistrationEmail()
          actionFn()
        },
        t('btn.keepEditing')
      )
    } else {
      resetEditRentalUnitAddress()
      resetEditRegistrationEmail()
      actionFn()
    }
  }

  function close () {
    exp.close()
    isFilingHistoryOpen.value = false
    highlightedFilingHistoryEvent.value = null
  }

  const openFilingHistory = (targetEvent?: FilingHistoryEvent) => {
    if (targetEvent) {
      highlightedFilingHistoryEvent.value = targetEvent
    }
    isFilingHistoryOpen.value = true
    exp.open(HostExpansionFilingHistory, {
      onClose () {
        exp.close()
        isFilingHistoryOpen.value = false
        highlightedFilingHistoryEvent.value = null
      }
    })
  }

  const toggleFilingHistory = () => {
    if (isFilingHistoryOpen.value) {
      close()
    } else {
      openFilingHistory()
    }
  }

  return {
    openHostOwners,
    openEditRentalUnitForm,
    openEditRegistrationEmailForm,
    checkAndPerformAction,
    openFilingHistory,
    toggleFilingHistory,
    close
  }
}
