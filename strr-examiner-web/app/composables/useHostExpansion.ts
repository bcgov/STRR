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

  const checkAndPerfomAction = (actionFn: () => void, confirmUnsavedModal: ConfirmModal | null = null) => {
    if (!isEditingRentalUnit.value || !hasUnsavedRentalUnitChanges.value) {
      resetEditRentalUnitAddress()
      actionFn()
      return
    }
    if (confirmUnsavedModal) {
      confirmUnsavedModal.handleOpen(() => {
        resetEditRentalUnitAddress()
        actionFn()
      })
      return
    }
    actionFn()
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
    checkAndPerfomAction,
    toggleFilingHistory,
    close
  }
}
