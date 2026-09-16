import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import ReviewSection from '../../../strr-base-web/app/components/form/common/Review/Section.vue'
import { baseEnI18n } from '../mocks/i18n'

enableAutoUnmount(afterEach)

const ReviewInput = defineComponent({
  setup () {
    const value = ref('')
    return () => h('input', {
      value: value.value,
      onInput: (event: Event) => { value.value = (event.target as HTMLInputElement).value }
    })
  }
})

describe('ReviewSection', () => {
  it.each([true, false])('preserves slotted input when validation changes (titles: %s)', async (withTitles) => {
    const wrapper = await mountSuspended(ReviewSection, {
      props: {
        items: [
          { slot: 'first', ...(withTitles && { title: 'First' }) },
          { slot: 'second', ...(withTitles && { title: 'Second' }) }
        ]
      },
      slots: {
        first: () => h(ReviewInput),
        second: () => h(ReviewInput)
      },
      global: { plugins: [baseEnI18n] }
    })

    const inputs = wrapper.findAll('input')
    expect(inputs).toHaveLength(2)
    await inputs[0]!.setValue('First entry')
    await inputs[1]!.setValue('Second entry')

    await wrapper.setProps({ error: true })

    expect(wrapper.findAll('input').map(input => input.element.value))
      .toEqual(['First entry', 'Second entry'])
    expect(wrapper.text()).toContain(baseEnI18n.global.t('label.stepUnfinished'))
  })
})
