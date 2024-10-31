// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionPropertyDetails } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount Property Details Form Section component', async () => {
  const addressSection = await mountSuspended(BcrosFormSectionPropertyDetails, {
    global: { plugins: [i18n] }
  })
  expect(addressSection.find('[data-test-id="property-details"]').exists()).toBe(true)
})

describe('Number of Rooms Input', () => {
  let wrapper

  beforeEach(async () => {
    wrapper = await mountSuspended(BcrosFormSectionPropertyDetails, {
      global: { plugins: [i18n] },
      data () {
        return {
          formState: {
            propertyDetails: {
              numberOfRoomsForRent: 1
            }
          },
          numberOfRoomsForRentError: ''
        }
      }
    })
  })

  it('renders Number of Rooms input with initial value of 1', () => {
    const input = wrapper.find('[data-test-id="number-of-rooms-input"]')
    expect(input.element.value).toBe('1')
  })

  it('increments the value when the + button is clicked', async () => {
    await wrapper.setData({
      formState: {
        propertyDetails: {
          numberOfRoomsForRent: 2
        }
      }
    })
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-test-id="number-of-rooms-input"]')
    expect(wrapper.vm.formState.propertyDetails.numberOfRoomsForRent).toBe(2)
    expect(input.element.value).toBe('2')
  })

  it('decrements the value when the - button is clicked', async () => {
    const incrementButton = wrapper.find('[data-test-id="increment-button"]')
    await incrementButton.trigger('click')
    await wrapper.vm.$nextTick()

    const decrementButton = wrapper.find('[data-test-id="decrement-button"]')
    await decrementButton.trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-test-id="number-of-rooms-input"]')
    expect(wrapper.vm.formState.propertyDetails.numberOfRoomsForRent).toBe(1)
    expect(input.element.value).toBe('1')
  })

  it('does not decrement below 1', async () => {
    const decrementButton = wrapper.find('[data-test-id="decrement-button"]')
    await decrementButton.trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-test-id="number-of-rooms-input"]')
    expect(wrapper.vm.formState.propertyDetails.numberOfRoomsForRent).toBe(1)
    expect(input.element.value).toBe('1')
  })
})
