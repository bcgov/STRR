import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ConnectItemListDisplay from '../../app/components/connect/ItemListDisplay.vue'

describe('ConnectItemListDisplay Component', () => {
  const globalMocks = {
    stubs: {
      UButton: {
        props: ['icon', 'label', 'ariaLabel', 'size', 'color', 'variant'],
        template: '<button class="u-button-stub" :aria-label="ariaLabel"><slot>{{ label }}</slot></button>'
      },
      UBadge: {
        props: ['color', 'variant', 'size'],
        template: '<span class="u-badge-stub"><slot /></span>'
      },
      UInput: {
        props: ['modelValue', 'placeholder', 'icon', 'trailing'],
        template: `
          <div class="u-input-stub">
            <input
              :value="modelValue"
              :placeholder="placeholder"
              @input="$emit('update:modelValue', $event.target.value)"
            />
            <slot name="trailing" />
          </div>
        `
      },
      ModalBase: {
        props: ['modelValue', 'title', 'width'],
        template: `
          <div v-if="modelValue" class="modal-base-stub" :data-title="title">
            <slot />
            <slot name="footer" />
          </div>
        `
      }
    }
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when items is empty/null/undefined', () => {
    const wrapper = mount(ConnectItemListDisplay, {
      props: { items: null },
      global: globalMocks
    })
    expect(wrapper.find('[data-testid="item-list-display"]').exists()).toBe(false)
  })

  it('renders emptyText when provided and items is empty', () => {
    const wrapper = mount(ConnectItemListDisplay, {
      props: { items: [], emptyText: 'No units listed' },
      global: globalMocks
    })
    expect(wrapper.find('[data-testid="item-list-display-empty"]').text()).toBe('No units listed')
  })

  it('renders flat array of string items', () => {
    const wrapper = mount(ConnectItemListDisplay, {
      props: {
        items: ['201', '202', '203'],
        maxPreview: 6
      },
      global: globalMocks
    })

    expect(wrapper.find('[data-testid="item-list-display-total-count"]').text()).toContain('3 units')
    expect(wrapper.text()).toContain('201')
    expect(wrapper.text()).toContain('202')
    expect(wrapper.text()).toContain('203')
  })

  it('renders grouped items (ItemListGroup[]) across multiple buildings', () => {
    const wrapper = mount(ConnectItemListDisplay, {
      props: {
        items: [
          { label: 'Building 1', items: ['101', '102'] },
          { label: 'Building 2', items: ['201', '202'] },
          { label: 'Building 3', items: ['301'] }
        ],
        maxPreview: 10
      },
      global: globalMocks
    })

    expect(wrapper.find('[data-testid="item-list-display-total-count"]').text()).toContain('5 units')
    expect(wrapper.text()).toContain('101')
    expect(wrapper.text()).toContain('201')
    expect(wrapper.text()).toContain('301')
  })

  it('supports generic object items with custom itemFormatter', () => {
    interface UnitObj { id: number, unitNumber: string }
    const wrapper = mount(ConnectItemListDisplay<UnitObj>, {
      props: {
        items: [
          { id: 1, unitNumber: 'PH-1' },
          { id: 2, unitNumber: 'PH-2' }
        ],
        itemFormatter: u => u.unitNumber
      },
      global: globalMocks
    })

    expect(wrapper.find('[data-testid="item-list-display-total-count"]').text()).toBe('(2 units)')
    expect(wrapper.text()).toContain('PH-1')
    expect(wrapper.text()).toContain('PH-2')
  })

  it('truncates preview to maxPreview and shows "+X more" button', async () => {
    const units = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    const wrapper = mount(ConnectItemListDisplay, {
      props: {
        items: units,
        maxPreview: 4
      },
      global: globalMocks
    })

    expect(wrapper.findAll('[data-testid^="item-list-display-pill-"]')).toHaveLength(4)
    const moreBtn = wrapper.find('[data-testid="item-list-display-more-button"]')
    expect(moreBtn.exists()).toBe(true)
    expect(moreBtn.text()).toContain('+6 more')

    await moreBtn.trigger('click')
    await nextTick()
    expect(wrapper.find('.modal-base-stub').exists()).toBe(true)
  })

  it('renders label inline with count when items exist and label only when empty', () => {
    const emptyWrapper = mount(ConnectItemListDisplay, {
      props: {
        label: 'Rental Units in Building:',
        items: null
      },
      global: globalMocks
    })
    expect(emptyWrapper.text()).toBe('Rental Units in Building:')

    const populatedWrapper = mount(ConnectItemListDisplay, {
      props: {
        label: 'Rental Units in Building:',
        items: ['101', '102']
      },
      global: globalMocks
    })
    expect(
      populatedWrapper.find('[data-testid="item-list-display-toolbar"]').text()
    ).toContain('Rental Units in Building:')
    expect(populatedWrapper.find('[data-testid="item-list-display-total-count"]').text()).toBe('(2 units)')
  })

  it('filters units when search query is entered in dialog', async () => {
    const wrapper = mount(ConnectItemListDisplay, {
      props: {
        items: ['101', '102', '201', '202', 'PH301'],
        maxPreview: 2
      },
      global: globalMocks
    })

    await wrapper.find('[data-testid="item-list-display-more-button"]').trigger('click')
    await nextTick()

    const searchInput = wrapper.find('[data-testid="item-list-display-search-input"] input')
    expect(searchInput.exists()).toBe(true)

    await searchInput.setValue('PH')
    await nextTick()

    const modal = wrapper.find('.modal-base-stub')
    expect(modal.text()).toContain('PH301')
    expect(modal.text()).not.toContain('101')
    expect(modal.text()).not.toContain('201')
  })

  it('copies all units to clipboard when copy button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true
    })

    const wrapper = mount(ConnectItemListDisplay, {
      props: {
        items: ['101', '102', '103']
      },
      global: globalMocks
    })

    const copyBtn = wrapper.find('[data-testid="item-list-display-copy-button"]')
    expect(copyBtn.exists()).toBe(true)
    await copyBtn.trigger('click')
    await nextTick()

    expect(writeTextMock).toHaveBeenCalledWith('101\n102\n103')
  })
})
