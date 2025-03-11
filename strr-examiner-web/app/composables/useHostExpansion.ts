// https://ui.nuxt.com/components/modal#control-programmatically
import {
  HostExpansionOwners
} from '#components'

export const useHostExpansion = () => {
  const exp = useStrrExpansion()

  function openHostOwners (
    display: 'primaryContact' | 'secondaryContact' | 'propertyManager'
  ) {
    exp.open(HostExpansionOwners, {
      display,
      onClose () {
        exp.close()
      }
    })
  }

  function close () {
    exp.close()
  }

  return {
    openHostOwners,
    close
  }
}
