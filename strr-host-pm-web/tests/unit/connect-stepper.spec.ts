import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Stepper from '../../../strr-base-web/app/components/connect/Stepper.vue'

mockNuxtImport('useElementVisibility', () => () => ref(true))

const makeSteps = () => ref<Step[]>([
  { label: 'btn.back', icon: 'i-mdi-home', complete: false, isValid: false, validationFn: vi.fn(() => true) },
  { label: 'btn.next', icon: 'i-mdi-home', complete: false, isValid: false, validationFn: vi.fn(() => true) },
  { label: 'btn.submit', icon: 'i-mdi-home', complete: false, isValid: false }
])
let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('ConnectStepper', () => {
  it('initializes an uncontrolled active-step model at the selected index', async () => {
    const steps = makeSteps()
    wrapper = await mountSuspended(Stepper, {
      props: { stepperLabel: 'Application steps', steps: steps.value, activeStepIndex: 1 },
      global: { stubs: { UIcon: true } }
    })

    expect(wrapper.emitted('update:activeStep')?.at(-1)).toEqual([steps.value[1]])
    expect(wrapper.findAll('button')[1]!.attributes('aria-current')).toBe('step')
  })

  it('keeps next and previous navigation within the available steps', async () => {
    const steps = makeSteps()
    wrapper = await mountSuspended(Stepper, {
      props: { stepperLabel: 'Application steps', steps: steps.value },
      global: { stubs: { UIcon: true } }
    })

    wrapper.vm.setPreviousStep()
    expect(wrapper.emitted('newStep')).toBeUndefined()
    wrapper.vm.setNextStep()
    await flushPromises()
    wrapper.vm.setNextStep()
    await flushPromises()
    wrapper.vm.setNextStep()
    await flushPromises()
    expect(wrapper.emitted('newStep')).toEqual([[1], [2]])
    expect(wrapper.findAll('button')[2]!.attributes('aria-current')).toBe('step')

    wrapper.vm.setPreviousStep()
    await flushPromises()
    expect(wrapper.emitted('newStep')?.at(-1)).toEqual([1])
    expect(wrapper.findAll('button')[1]!.attributes('aria-current')).toBe('step')
  })

  it('marks previous steps complete and displays their validation results', async () => {
    const steps = makeSteps()
    steps.value[0]!.validationFn = vi.fn(() => Promise.resolve(false))
    wrapper = await mountSuspended(Stepper, {
      props: { stepperLabel: 'Application steps', steps: steps.value },
      global: { stubs: { UIcon: true } }
    })

    await wrapper.vm.setActiveStep(2)
    await flushPromises()

    expect(steps.value[0]).toMatchObject({ complete: true, isValid: false })
    expect(steps.value[1]).toMatchObject({ complete: true, isValid: true })
    expect(wrapper.find('img[src="/icons/invalid_step.svg"]').exists()).toBe(true)
    expect(wrapper.find('img[src="/icons/valid_step.svg"]').exists()).toBe(true)
    expect(wrapper.emitted('newStep')?.at(-1)).toEqual([2])
  })

  it('updates parent-controlled active-step and index models', async () => {
    const steps = makeSteps()
    const activeStep = ref(steps.value[0]!)
    const activeStepIndex = ref(0)
    const Parent = defineComponent({
      setup () {
        return () => h(Stepper, {
          stepperLabel: 'Application steps',
          steps: steps.value,
          activeStep: activeStep.value,
          activeStepIndex: activeStepIndex.value,
          'onUpdate:activeStep': (step: Step) => { activeStep.value = step },
          'onUpdate:activeStepIndex': (index: number) => { activeStepIndex.value = index }
        })
      }
    })
    wrapper = await mountSuspended(Parent, { global: { stubs: { UIcon: true } } })

    await wrapper.findComponent(Stepper).vm.setActiveStep(1)
    await flushPromises()

    expect(activeStepIndex.value).toBe(1)
    expect(activeStep.value).toBe(steps.value[1])
    expect(steps.value[0]).toMatchObject({ complete: true, isValid: true })

    activeStepIndex.value = 2
    await flushPromises()
    expect(activeStep.value).toBe(steps.value[2])
  })

  it.each([
    { startIndex: 0, load: 'replace' },
    { startIndex: 2, load: 'replace' },
    { startIndex: 2, load: 'append' }
  ])('initializes $load steps at index $startIndex before navigation', async ({ startIndex, load }) => {
    const pendingSteps = ref<Step[]>([])
    wrapper = await mountSuspended(Stepper, {
      props: {
        stepperLabel: 'Application steps',
        activeStepIndex: startIndex,
        ...(load === 'append' ? { steps: pendingSteps.value } : {})
      },
      global: { stubs: { UIcon: true } }
    })
    expect(wrapper.findAll('button')).toHaveLength(0)
    const steps = makeSteps()
    steps.value[startIndex]!.validationFn = vi.fn(() => Promise.resolve(false))
    if (load === 'append') {
      pendingSteps.value.push(...steps.value)
    } else {
      await wrapper.setProps({ steps: steps.value })
    }
    await flushPromises()
    expect(wrapper.emitted('update:activeStep')?.at(-1)).toEqual([steps.value[startIndex]])

    await expect(wrapper.vm.setActiveStep(1)).resolves.toBeUndefined()
    await flushPromises()

    expect(steps.value[startIndex]).toMatchObject({ complete: true, isValid: false })
    expect(wrapper.findAll('button')[1]!.attributes('aria-current')).toBe('step')
    expect(wrapper.emitted('newStep')?.at(-1)).toEqual([1])
  })
})
