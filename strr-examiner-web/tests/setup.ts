import { config } from '@vue/test-utils'
import { dataTestId } from './plugins/data-test-id'

config.global.plugins.push(dataTestId)
