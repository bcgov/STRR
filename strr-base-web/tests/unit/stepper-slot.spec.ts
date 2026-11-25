import { mount } from '@vue/test-utils'
import { createCommentVNode, h, onMounted, ref, watch } from 'vue'
import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('ref', ref)
vi.stubGlobal('watch', watch)
vi.stubGlobal('onMounted', onMounted)
vi.stubGlobal('useNuxtApp', () => ({ $i18n: { t: (key: string) => key } }))
vi.stubGlobal('useElementVisibility', () => ref(true))
vi.stubGlobal('useResizeObserver', vi.fn())

const { default: Stepper } = await import('../../app/components/connect/Stepper.vue')

const steps = [{ i18nPrefix: 'strr.step', icon: 'i-mdi-domain-plus', complete: false, isValid: false }]

const mountStepper = (slot?: () => any) => mount(Stepper, {
  props: { stepperLabel: 'Steps', steps, activeStepIndex: 0, activeStep: steps[0] },
  slots: slot ? { default: slot } : {},
  global: {
    mocks: { $t: (key: string) => key },
    stubs: { UIcon: true, ConnectTypographyH2: true }
  }
})

const slotWrapper = (wrapper: ReturnType<typeof mountStepper>) =>
  wrapper.find('[data-testid="stepper"]').element.nextElementSibling!

describe('stepper slot', () => {
  it('renders content between the steps and the active step title', () => {
    const wrapper = mountStepper(() => h('p', { id: 'notice' }, 'Notice'))
    const element = slotWrapper(wrapper)
    expect(element.querySelector('#notice')?.textContent).toBe('Notice')
    expect(element.nextElementSibling?.querySelector('connect-typography-h2-stub')).not.toBeNull()
  })

  it.each([
    ['there is no slot', undefined],
    ['the slot content is hidden by v-if', () => createCommentVNode('v-if')]
  ])('is collapsed when %s', (_, slot) => {
    const element = slotWrapper(mountStepper(slot))
    // CSS :empty ignores comments, but not elements or text
    expect(element.children).toHaveLength(0)
    expect(element.textContent).toBe('')
    expect(element.classList.contains('empty:hidden')).toBe(true)
  })
})
