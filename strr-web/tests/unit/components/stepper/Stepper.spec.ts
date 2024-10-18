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

describe('BcrosStepper', () => {
  const mockSteps = [
    {
      step: {
        label: 'Step 1',
        inactiveIconPath: '/inactive1.svg',
        activeIconPath: '/active1.svg',
        complete: false,
        isValid: false,
        alt: 'Step 1'
      },
      title: 'Title 1',
      subtitle: 'Subtitle 1',
      formTitle: 'Form 1',
      sections: []
    },
    {
      step: {
        label: 'Step 2',
        inactiveIconPath: '/inactive2.svg',
        activeIconPath: '/active2.svg',
        complete: true,
        isValid: true,
        alt: 'Step 2'
      },
      title: 'Title 2',
      subtitle: 'Subtitle 2',
      formTitle: 'Form 2',
      sections: []
    }
  ]

  it('displays correct number of steps', async () => {
    const wrapper = await mountSuspended(BcrosStepper, {
      global: { plugins: [i18n] },
      props: {
        steps: mockSteps,
        activeStep: 0
      }
    })

    const stepElements = wrapper.findAll('[data-test-id^="step-index-"]')
    expect(stepElements.length).toBe(mockSteps.length)
  })

  it('displays active step correctly', async () => {
    const wrapper = await mountSuspended(BcrosStepper, {
      global: { plugins: [i18n] },
      props: {
        steps: mockSteps,
        activeStep: 1
      }
    })

    const activeStepElement = wrapper.find('[data-test-id="step-index-1-active"]')
    expect(activeStepElement.exists()).toBe(true)
    expect(activeStepElement.text()).toContain(mockSteps[1].step.label)
  })

  it('displays correct icons for valid steps', async () => {
    const wrapper = await mountSuspended(BcrosStepper, {
      global: { plugins: [i18n] },
      props: {
        steps: mockSteps,
        activeStep: 1
      }
    })

    const completeStep = wrapper.find('[data-test-id="step-index-1-active"]')
    expect(completeStep.exists()).toBe(true)
    const validStepIcon = completeStep.find('img[src="/icons/create-account/valid_step.svg"]')
    expect(validStepIcon.exists()).toBe(true)

    const incompleteStep = wrapper.find('[data-test-id="step-index-0"]')
    expect(incompleteStep.exists()).toBe(true)
    const incompleteStepValidIcon = incompleteStep.find('img[src="/icons/create-account/valid_step.svg"]')
    expect(incompleteStepValidIcon.exists()).toBe(false)
  })

  it('emits changeStep event when a step is clicked', async () => {
    const wrapper = await mountSuspended(BcrosStepper, {
      global: { plugins: [i18n] },
      props: {
        steps: mockSteps,
        activeStep: 0
      }
    })

    const secondStep = wrapper.find('[data-test-id="step-index-1"]')
    await secondStep.trigger('click')

    expect(wrapper.emitted('changeStep')).toBeTruthy()
    expect(wrapper.emitted('changeStep')![0]).toEqual([1])
    await wrapper.setProps({ activeStep: 1 })
    const newActiveStep = wrapper.find('[data-test-id="step-index-1-active"]')
    expect(newActiveStep.exists()).toBe(true)
  })
})
