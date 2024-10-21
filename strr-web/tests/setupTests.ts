import { config } from '@vue/test-utils'
import { dataTestId } from './unit/plugins/data-test-id'

config.global.plugins.push(dataTestId)
