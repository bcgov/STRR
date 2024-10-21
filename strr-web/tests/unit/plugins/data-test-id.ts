import { config } from '@vue/test-utils'

/**
 * A plugin to extend VueWrapper with a utility function
 * to find elements by their data-test-id attribute.
 *
 * Usage: wrapper.findTestId('create-account-page')
 */
export const dataTestId = (wrapper: any) => {
  function findTestId (selector: string) {
    const dataSelector = `[data-test-id="${selector}"]`
    return wrapper.find(dataSelector)
  }

  return {
    findTestId
  }
}

config.plugins.VueWrapper.install(dataTestId)
