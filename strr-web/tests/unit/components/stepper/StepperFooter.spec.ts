import { it, expect, describe, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { BcrosStepperFooter } from '#components'

const { t } = useTranslation()

describe('BcrosStepperFooter', () => {
  let wrapper: any

  const defaultProps = {
    isFirstStep: false,
    isLastStep: false,
    setNextStep: vi.fn(),
    setPreviousStep: vi.fn(),
    submit: vi.fn(),
    submitInProgress: false
  }

  it('renders both buttons when not on first or last step', async () => {
    wrapper = await mountSuspended(BcrosStepperFooter, {
      props: defaultProps
    })

    expect(wrapper.findTestId('stepper-footer-btn-left').exists()).toBe(true)
    expect(wrapper.findTestId('stepper-footer-btn-right').exists()).toBe(true)
  })

  it('hides back button on first step', async () => {
    wrapper = await mountSuspended(BcrosStepperFooter, {
      props: { ...defaultProps, isFirstStep: true }
    })

    const backButton = wrapper.findTestId('stepper-footer-btn-left')
    expect(backButton.classes()).toContain('hidden')
  })

  it('shows submit button on last step', async () => {
    wrapper = await mountSuspended(BcrosStepperFooter, {
      props: { ...defaultProps, isLastStep: true }
    })

    const submitButton = wrapper.findTestId('stepper-footer-btn-right')
    expect(submitButton.text()).toContain(t('general.submitAndPay'))
  })

  it('calls setPreviousStep when back button is clicked', async () => {
    wrapper = await mountSuspended(BcrosStepperFooter, {
      props: defaultProps
    })

    await wrapper.findTestId('stepper-footer-btn-left').trigger('click')
    expect(defaultProps.setPreviousStep).toHaveBeenCalled()
  })

  it('calls setNextStep when next button is clicked on non-last step', async () => {
    wrapper = await mountSuspended(BcrosStepperFooter, {
      props: defaultProps
    })

    await wrapper.findTestId('stepper-footer-btn-right').trigger('click')
    expect(defaultProps.setNextStep).toHaveBeenCalled()
  })

  it('calls submit when submit button is clicked on last step', async () => {
    wrapper = await mountSuspended(BcrosStepperFooter, {
      props: { ...defaultProps, isLastStep: true }
    })

    await wrapper.findTestId('stepper-footer-btn-right').trigger('click')
    expect(defaultProps.submit).toHaveBeenCalled()
  })

  it('shows loading state during submission', async () => {
    wrapper = await mountSuspended(BcrosStepperFooter, {
      props: { ...defaultProps, submitInProgress: true }
    })

    const submitButton = wrapper.findTestId('stepper-footer-btn-right')
    expect(submitButton.text()).toBe('')
  })
})
