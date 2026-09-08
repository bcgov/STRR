import { vi } from 'vitest'

import { config } from '@vue/test-utils'
import { dataTestId } from './plugins/data-test-id'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    useI18n: () => ({
      t: (key: string) => key
    })
  }
})

config.global.plugins.push(dataTestId)
