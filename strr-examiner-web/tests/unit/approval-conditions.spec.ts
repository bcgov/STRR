import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { enI18n } from '../mocks/i18n'
import ApprovalConditions from '~/components/ApprovalConditions.vue'

const mockIsMainActionDisabled = ref(false)

vi.mock('@/composables/useExaminerDecision', () => ({
  useExaminerDecision: () => ({
    preDefinedConditions: [
      'principalResidence',
      'validBL',
      'class9FarmLand',
      'partOfStrataHotel',
      'fractionalOwnership'
    ],
    isMainActionDisabled: mockIsMainActionDisabled
  })
}))

const defaultProps = () => ({
  conditions: [] as string[],
  customCondition: '',
  minBookingDays: null as number | null
})

describe('Approval Conditions Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMainActionDisabled.value = false
  })

  it('should render the approval conditions select menu', async () => {
    const wrapper = await mountSuspended(ApprovalConditions, {
      global: { plugins: [enI18n] },
      props: defaultProps()
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="approval-conditions"]').exists()).toBe(true)
  })

  it('should show open custom condition button and open min booking days button', async () => {
    const wrapper = await mountSuspended(ApprovalConditions, {
      global: { plugins: [enI18n] },
      props: defaultProps()
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="open-custom-condition-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="open-min-book-days-button"]').exists()).toBe(true)
  })

  describe('custom conditions', () => {
    it('should open custom condition form when button is clicked', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: defaultProps()
      })
      await flushPromises()

      expect(wrapper.find('[data-testid="custom-condition"]').exists()).toBe(false)

      await wrapper.find('[data-testid="open-custom-condition-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="custom-condition"]').exists()).toBe(true)
    })

    it('should disable main action when custom condition form is open', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: defaultProps()
      })
      await flushPromises()

      await wrapper.find('[data-testid="open-custom-condition-button"]').trigger('click')
      await flushPromises()

      expect(mockIsMainActionDisabled.value).toBe(true)
    })

    it('should show error when adding empty custom condition', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: defaultProps()
      })
      await flushPromises()

      await wrapper.find('[data-testid="open-custom-condition-button"]').trigger('click')
      await flushPromises()

      await wrapper.find('[data-testid="add-custom-condition-button"]').trigger('click')
      await flushPromises()

      // custom condition form should still be open (error state)
      expect(wrapper.find('[data-testid="custom-condition"]').exists()).toBe(true)
      // no customCondition update emitted
      const emitted = wrapper.emitted('update:customCondition')
      expect(emitted).toBeUndefined()
    })

    it('should show error when custom condition text exceeds 256 characters', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: defaultProps()
      })
      await flushPromises()

      await wrapper.find('[data-testid="open-custom-condition-button"]').trigger('click')
      await flushPromises()

      const textarea = wrapper.find('[data-testid="custom-condition-input"]')
      await textarea.setValue('a'.repeat(257))
      await flushPromises()

      await wrapper.find('[data-testid="add-custom-condition-button"]').trigger('click')
      await flushPromises()

      // form should still be open
      expect(wrapper.find('[data-testid="custom-condition"]').exists()).toBe(true)
      const emitted = wrapper.emitted('update:customCondition')
      expect(emitted).toBeUndefined()
    })

    it('should emit update:customCondition and close form when valid text is added', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: defaultProps()
      })
      await flushPromises()

      await wrapper.find('[data-testid="open-custom-condition-button"]').trigger('click')
      await flushPromises()

      const textarea = wrapper.find('[data-testid="custom-condition-input"]')
      await textarea.setValue('My custom condition text')
      await flushPromises()

      await wrapper.find('[data-testid="add-custom-condition-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="custom-condition"]').exists()).toBe(false)

      const emitted = wrapper.emitted('update:customCondition')
      expect(emitted).toBeDefined()
      expect(emitted![0]).toEqual(['My custom condition text'])
    })

    it('should clear customCondition and close form when remove is clicked', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: defaultProps()
      })
      await flushPromises()

      await wrapper.find('[data-testid="open-custom-condition-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="custom-condition"]').exists()).toBe(true)

      await wrapper.find('[data-testid="remove-custom-condition-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="custom-condition"]').exists()).toBe(false)

      const emitted = wrapper.emitted('update:customCondition')
      expect(emitted).toBeUndefined()
    })

    it('should re-enable main action when custom condition form is closed', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: defaultProps()
      })
      await flushPromises()

      await wrapper.find('[data-testid="open-custom-condition-button"]').trigger('click')
      await flushPromises()
      expect(mockIsMainActionDisabled.value).toBe(true)

      await wrapper.find('[data-testid="remove-custom-condition-button"]').trigger('click')
      await flushPromises()
      expect(mockIsMainActionDisabled.value).toBe(false)
    })

    it('should disable open-custom-condition-button when 3 custom conditions are already selected', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: {
          conditions: ['custom1', 'custom2', 'custom3'],
          customCondition: '',
          minBookingDays: null
        }
      })
      await flushPromises()

      const btn = wrapper.find('[data-testid="open-custom-condition-button"]')
      expect(btn.attributes('disabled')).toBeDefined()
    })

    it('should emit update conditions without predefined condition that were removed', async () => {
      const props = {
        conditions: ['principalResidence', 'validBL'],
        customCondition: '',
        minBookingDays: null
      }
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props
      })
      await flushPromises()

      // click the close icon on the first badge (principalResidence)
      await wrapper.findAll('[data-testid="remove-condition-button"]')[0]!.trigger('click')
      await flushPromises()

      const emitted = wrapper.emitted('update:conditions')
      expect(emitted).toBeUndefined()
      expect(props.conditions).not.toContain('principalResidence')
      expect(props.conditions).toContain('validBL')
    })
  })

  describe('min booking days', () => {
    it('should open min booking days form when button is clicked', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: defaultProps()
      })
      await flushPromises()

      expect(wrapper.find('[data-testid="min-booking-days"]').exists()).toBe(false)

      await wrapper.find('[data-testid="open-min-book-days-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="min-booking-days"]').exists()).toBe(true)
    })

    it('should disable main action when min booking days form is open', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: defaultProps()
      })
      await flushPromises()

      await wrapper.find('[data-testid="open-min-book-days-button"]').trigger('click')
      await flushPromises()

      expect(mockIsMainActionDisabled.value).toBe(true)
    })

    it('should emit updates and close form when valid min booking days is added', async () => {
      const props = defaultProps()
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props
      })
      await flushPromises()

      await wrapper.find('[data-testid="open-min-book-days-button"]').trigger('click')
      await flushPromises()

      // default value is 28 — valid; click add
      await wrapper.find('[data-testid="add-min-book-days-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="min-booking-days"]').exists()).toBe(false)

      const minBookingDaysEmit = wrapper.emitted('update:minBookingDays')
      expect(minBookingDaysEmit).toBeDefined()
      expect(minBookingDaysEmit![0]).toEqual([28])

      expect(wrapper.emitted('update:conditions')).toBeUndefined()
      expect(props.conditions).toContain('minBookingDays')
    })

    it('should close form and reset min booking days when remove is clicked', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: {
          conditions: [],
          customCondition: '',
          minBookingDays: 14
        }
      })
      await flushPromises()

      // open the form first
      await wrapper.find('[data-testid="open-min-book-days-button"]').trigger('click')
      await flushPromises()

      await wrapper.find('[data-testid="remove-min-book-days-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="min-booking-days"]').exists()).toBe(false)

      const minBookingDaysEmit = wrapper.emitted('update:minBookingDays')
      expect(minBookingDaysEmit).toBeDefined()
      // should have been reset to null
      const lastEmit = minBookingDaysEmit![minBookingDaysEmit!.length - 1]![0]
      expect(lastEmit).toBeNull()
    })

    it('should disable open-min-book-days-button when minBookingDays is already added', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: {
          conditions: ['minBookingDays'],
          customCondition: '',
          minBookingDays: 28
        }
      })
      await flushPromises()

      const btn = wrapper.find('[data-testid="open-min-book-days-button"]')
      expect(btn.attributes('disabled')).toBeDefined()
    })

    it('should re-enable main action when min booking days form is closed via remove', async () => {
      const wrapper = await mountSuspended(ApprovalConditions, {
        global: { plugins: [enI18n] },
        props: defaultProps()
      })
      await flushPromises()

      await wrapper.find('[data-testid="open-min-book-days-button"]').trigger('click')
      await flushPromises()
      expect(mockIsMainActionDisabled.value).toBe(true)

      await wrapper.find('[data-testid="remove-min-book-days-button"]').trigger('click')
      await flushPromises()
      expect(mockIsMainActionDisabled.value).toBe(false)
    })
  })
})
