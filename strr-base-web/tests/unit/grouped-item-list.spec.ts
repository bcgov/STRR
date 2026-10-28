import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConnectGroupedItemList from '../../app/components/connect/GroupedItemList.vue'

const stubs = {
  UInput: {
    inheritAttrs: false,
    props: ['modelValue'],
    template: '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  }
}

const mountList = (groups: any[], props: Record<string, unknown> = {}) => mount(ConnectGroupedItemList, {
  props: {
    groups,
    countLabel: (count: number) => `${count} things`,
    searchPlaceholder: 'Search things',
    emptyText: 'Nothing found',
    ...props
  },
  global: { stubs }
})

const byTestId = (wrapper: ReturnType<typeof mountList>, id: string) => wrapper.find(`[data-testid="${id}"]`)
const numbered = (count: number) => Array.from({ length: count }, (_, i) => `A${i}`)

describe('ConnectGroupedItemList', () => {
  it('shows the total, each group heading with its own count, description, and items', () => {
    const wrapper = mountList([
      { id: 1, label: 'FIRST', description: '1 Main St', items: ['a', 'b'] },
      { id: 2, label: 'SECOND', items: ['c'] }
    ])

    expect(byTestId(wrapper, 'grouped-item-list-total').text()).toBe('3 things')
    const first = byTestId(wrapper, 'grouped-item-list-group-1')
    expect(first.text()).toContain('FIRST')
    expect(first.text()).toContain('(2 things)')
    expect(first.text()).toContain('1 Main St')
    expect(first.findAll('li').map(li => li.text())).toEqual(['a', 'b'])
    expect(byTestId(wrapper, 'grouped-item-list-group-2').text()).not.toContain('Main St')
  })

  it('lets the consumer render the group description through a slot', () => {
    const wrapper = mount(ConnectGroupedItemList, {
      props: {
        groups: [{ id: 1, label: 'FIRST', description: '1 Main St', items: ['a'] }],
        countLabel: (count: number) => `${count}`,
        searchPlaceholder: '',
        emptyText: ''
      },
      slots: {
        description: '<template #description="{ group }"><em class="custom">{{ group.description }}!</em></template>'
      },
      global: { stubs }
    })

    expect(wrapper.find('.custom').text()).toBe('1 Main St!')
  })

  it('only offers search above the threshold, then filters across groups', async () => {
    expect(byTestId(mountList([{ id: 1, label: 'G', items: ['a'] }]), 'grouped-item-list-search').exists()).toBe(false)

    const wrapper = mountList([
      { id: 1, label: 'ONE', items: numbered(13) },
      { id: 2, label: 'TWO', items: ['PH1'] }
    ])
    const search = byTestId(wrapper, 'grouped-item-list-search')

    await search.setValue('ph')
    expect(byTestId(wrapper, 'grouped-item-list-group-1').exists()).toBe(false)
    expect(byTestId(wrapper, 'grouped-item-list-group-2').findAll('li')).toHaveLength(1)

    await search.setValue('zzz')
    expect(byTestId(wrapper, 'grouped-item-list-empty').text()).toBe('Nothing found')
  })

  it('honours a custom search threshold', () => {
    const wrapper = mountList([{ id: 1, label: 'G', items: ['a', 'b', 'c'] }], { searchMinItems: 2 })
    expect(byTestId(wrapper, 'grouped-item-list-search').exists()).toBe(true)
  })
})
