// https://ui.nuxt.com/components/modal#control-programmatically
import {
  HostExpansionFilingHistory,
  HostExpansionOwners,
  HostExpansionEditRentalUnitForm
} from '#components'
import EditRegistrationEmailForm from '~/components/Host/Expansion/EditRegistrationEmailForm.vue'

export const useHostExpansion = () => {
  const exp = useStrrExpansion()
  const {
    startEditRentalUnitAddress,
    resetEditRentalUnitAddress,
    startEditRegistrationEmail,
    resetEditRegistrationEmail
  } = useExaminerStore()
  const {
    isFilingHistoryOpen,
    isEditingRentalUnit,
    hasUnsavedRentalUnitChanges,
    isEditingRegistrationEmail,
    hasUnsavedRegistrationEmailChanges
  } = storeToRefs(useExaminerStore())
  const { openConfirmActionModal, close: closeConfirmActionModal } = useStrrModals()
  const { t } = useNuxtApp().$i18n
  isFilingHistoryOpen.value = false // reset so it's starts hidden by default
  resetEditRentalUnitAddress()
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
  }

  const toggleFilingHistory = () => {
    isFilingHistoryOpen.value = !isFilingHistoryOpen.value
    isFilingHistoryOpen.value
      ? exp.open(HostExpansionFilingHistory, {
        onClose () {
          exp.close()
          isFilingHistoryOpen.value = false
        }
      })
      : exp.close()
  }

  return {
    openHostOwners,
    openEditRentalUnitForm,
    openEditRegistrationEmailForm,
    checkAndPerformAction,
    toggleFilingHistory,
    close
  }
}
