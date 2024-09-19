// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { mockFn } from '@nuxt/test-utils'
import { BcrosStepper, BcrosStepperFooter } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount Stepper component', async () => {
  const stepper = await mountSuspended(BcrosStepper,
    {
      global: { plugins: [i18n] },
      props: {
        steps: [{
          step: {
            label: '',
            inactiveIconPath: '',
            activeIconPath: '',
            complete: false,
            isValid: false,
            alt: ''
          },
          title: '',
          subtitle: '',
          formTitle: '',
          sections: []
        }],
        activeStep: 0
      }
    })
  expect(stepper.find('[data-test-id="stepper"]').exists()).toBe(true)
})

it('can mount Stepper Footer component', async () => {
  const stepper = await mountSuspended(BcrosStepperFooter,
    {
      global: { plugins: [i18n] },
      props: {
        isFirstStep: true,
        isLastStep: false,
        setNextStep: mockFn,
        setPreviousStep: mockFn,
        submit: mockFn
      }
    })
  expect(stepper.find('[data-test-id="stepper-footer"]').exists()).toBe(true)
})
