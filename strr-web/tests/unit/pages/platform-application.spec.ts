import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { mockPlatformApplicationFee } from '../../mocks/mockFees'
import PlatformApplication from '@/pages/platform-application.vue'
import { BcrosStepper } from '#components'
import FeeWidget from '~/components/FeeWidget.vue'

const mockAxios = new MockAdapter(axios)

describe('Platform Application tests', () => {
  it('renders page and components correctly', async () => {
    mockAxios.onGet('/fees/STRR/PLATREG_SM').reply(200, mockPlatformApplicationFee)

    const wrapper = await mountSuspended(PlatformApplication)

    expect(wrapper.exists()).toBe(true)

    expect(wrapper.find('h1').exists()).toBe(true)

    const stepper = wrapper.findComponent(BcrosStepper)
    expect(stepper.exists()).toBe(true)
    expect(stepper.vm.steps.length).toBe(4)

    const feeSummary = wrapper.findComponent(FeeWidget)
    expect(feeSummary.exists()).toBe(true)
  })
})
