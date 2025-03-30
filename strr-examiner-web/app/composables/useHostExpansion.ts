// https://ui.nuxt.com/components/modal#control-programmatically
import {
  HostExpansionFilingHistory,
  HostExpansionOwners
} from '#components'

export const useHostExpansion = () => {
  const exp = useStrrExpansion()

  const { isFilingHistoryOpen } = storeToRefs(useExaminerStore())
  isFilingHistoryOpen.value = false // reset so it's starts hidden by default

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
    toggleFilingHistory,
    close
  }
}
