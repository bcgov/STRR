// https://ui.nuxt.com/components/modal#control-programmatically
import {
  HostExpansionOwners
} from '#components'

export const useHostExpansion = () => {
  const exp = useStrrExpansion()

  function openHostOwners (
    data: HostApplicationResp | HousRegistrationResponse,
    display: 'primaryContact' | 'secondaryContact' | 'propertyManager',
    isApplication: boolean
  ) {
    exp.open(HostExpansionOwners, {
      data,
      display,
      isApplication,
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
