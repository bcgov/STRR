// https://ui.nuxt.com/components/modal#control-programmatically
import {
  HostExpansionFilingHistory,
  HostExpansionOwners,
  HostExpansionEditRentalUnitForm
} from '#components'

export const useHostExpansion = () => {
  const exp = useStrrExpansion()
  const { startEditRentalUnitAddress, resetEditRentalUnitAddress } = useExaminerStore()
  const { isFilingHistoryOpen, isEditingRentalUnit, hasUnsavedRentalUnitChanges } = storeToRefs(useExaminerStore())
  const { openConfirmActionModal, close: closeConfirmActionModal } = useStrrModals()
  const { t } = useI18n()
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

  const checkAndPerformAction = (actionFn: () => void) => {
    if (!isEditingRentalUnit.value || !hasUnsavedRentalUnitChanges.value) {
      resetEditRentalUnitAddress()
      actionFn()
    } else {
      openConfirmActionModal(
        t('modal.unsavedChanges.title'),
        t('modal.unsavedChanges.message'),
        t('btn.discardChanges'),
        () => {
          closeConfirmActionModal()
          resetEditRentalUnitAddress()
          actionFn()
        },
        t('btn.keepEditing')
      )
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
    checkAndPerformAction,
    toggleFilingHistory,
    close
  }
}
