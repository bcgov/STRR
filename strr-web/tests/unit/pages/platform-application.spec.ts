import { mountSuspended } from '@nuxt/test-utils/runtime'
import PlatformApplication from '@/pages/platform-application.vue'
import { BcrosStepper } from '#components'
import FeeWidget from '~/components/FeeWidget.vue'

describe('Platform Application tests', () => {
  it('renders page and components correctly', async () => {
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
