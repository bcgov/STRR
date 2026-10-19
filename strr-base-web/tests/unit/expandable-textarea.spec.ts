import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ConnectFormExpandableTextarea from '../../app/components/connect/form/ExpandableTextarea.vue'

const translate = (key: string) => {
  const map: Record<string, string> = {
    'btn.expand': 'Expand',
    'btn.collapse': 'Collapse',
    'btn.openInDialog': 'Full View',
    'btn.done': 'Done',
    'btn.close': 'Close'
  }
  return map[key] || key
}

vi.stubGlobal('useI18n', () => ({
  t: translate
}))

describe('ConnectFormExpandableTextarea Component', () => {
  const globalMocks = {
    mocks: {
      $t: translate
    },
    stubs: {
      UTextarea: {
        props: ['modelValue', 'placeholder', 'disabled', 'resize', 'ui'],
        template: `
          <div class="u-textarea-stub" :class="ui?.base">
            <textarea
              :value="modelValue"
              :placeholder="placeholder"
              :disabled="disabled"
              @input="$emit('update:modelValue', $event.target.value)"
              @blur="$emit('blur', $event)"
            />
            <slot />
          </div>
        `
      },
      UButton: {
        props: ['icon', 'label', 'ariaLabel'],
        template: '<button class="u-button-stub" :aria-label="ariaLabel">{{ label }}</button>'
      },
      UModal: {
        props: ['modelValue'],
        template: '<div v-if="modelValue" class="u-modal-stub"><slot /></div>'
      },
      UCard: {
        template: '<div class="u-card-stub"><slot name="header" /><slot /><slot name="footer" /></div>'
      },
      UIcon: true,
      ConnectContactBcros: true
    }
  }

  it('renders with default compact height', () => {
    const wrapper = mount(ConnectFormExpandableTextarea, {
      props: {
        modelValue: '',
        placeholder: 'Enter content...',
        dataTestid: 'custom-textarea'
      },
      global: globalMocks
    })

    expect(wrapper.find('textarea').element.style.height).toBe('290px')
    expect(wrapper.find('.u-textarea-stub').classes()).toContain('w-full')
    expect(wrapper.find('.u-textarea-stub').classes()).toContain('min-h-[80px]')
    expect(wrapper.find('.u-textarea-stub').classes()).toContain('resize-y')
    expect(wrapper.find('.u-textarea-stub').classes()).not.toContain('transition-all')
  })

  it('hides the toggle and dialog buttons when text is empty', () => {
    const wrapper = mount(ConnectFormExpandableTextarea, {
      props: {
        modelValue: ''
      },
      global: globalMocks
    })

    expect(wrapper.find('.u-button-stub').exists()).toBe(false)
  })

  it('shows the bottom expand and full view buttons when text exceeds threshold', () => {
    const longText = Array(12).fill('Test line of text').join('\n')
    const wrapper = mount(ConnectFormExpandableTextarea, {
      props: {
        modelValue: longText
      },
      global: globalMocks
    })

    const buttons = wrapper.findAll('.u-button-stub')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]!.text()).toBe('Expand')
    expect(buttons[1]!.text()).toBe('Full View')
    expect(wrapper.find('.justify-center.bg-gradient-to-t').exists()).toBe(true)
  })

  it('toggles expansion state when expand button is clicked', async () => {
    const longText = Array(12).fill('Decision reason').join('\n')
    const wrapper = mount(ConnectFormExpandableTextarea, {
      props: {
        modelValue: longText
      },
      global: globalMocks
    })

    const expandButton = wrapper.findAll('.u-button-stub')[0]!
    expect(expandButton.text()).toBe('Expand')

    await expandButton.trigger('click')
    await nextTick()

    expect(wrapper.find('.u-textarea-stub').classes()).not.toContain('max-h-[80vh]')
    expect(wrapper.find('textarea').element.style.height).toBe('560px')
    expect(wrapper.findAll('.u-button-stub')[0]!.text()).toBe('Collapse')
    expect(wrapper.emitted('toggleExpand')).toBeTruthy()
    expect(wrapper.emitted('toggleExpand')![0]).toEqual([true])

    // Toggle back
    await wrapper.findAll('.u-button-stub')[0]!.trigger('click')
    await nextTick()
    expect(wrapper.find('textarea').element.style.height).toBe('290px')
    expect(wrapper.findAll('.u-button-stub')[0]!.text()).toBe('Expand')
    expect(wrapper.emitted('toggleExpand')![1]).toEqual([false])
  })

  it('opens the dialog overlay when Full View button is clicked and syncs edits', async () => {
    const longText = Array(12).fill('Decision reason').join('\n')
    const wrapper = mount(ConnectFormExpandableTextarea, {
      props: {
        modelValue: longText,
        dialogTitle: 'Email to Completing Party'
      },
      global: globalMocks
    })

    expect(wrapper.find('.u-modal-stub').exists()).toBe(false)

    const dialogButton = wrapper.findAll('.u-button-stub')[1]!
    await dialogButton.trigger('click')
    await nextTick()

    expect(wrapper.find('.u-modal-stub').exists()).toBe(true)
    expect(wrapper.find('.u-modal-stub').text()).toContain('Email to Completing Party')

    const dialogTextarea = wrapper.find('.u-modal-stub textarea')
    await dialogTextarea.setValue('Edited inside dialog')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Edited inside dialog'])
  })

  it('emits update:modelValue and change events on input', async () => {
    const wrapper = mount(ConnectFormExpandableTextarea, {
      props: {
        modelValue: 'Initial'
      },
      global: globalMocks
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('Updated content')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Updated content'])
    expect(wrapper.emitted('change')?.[0]).toEqual(['Updated content'])
  })

  it('respects custom initialHeight and expandedMinHeight props', async () => {
    const wrapper = mount(ConnectFormExpandableTextarea, {
      props: {
        modelValue: 'Some text',
        initialHeight: 110,
        expandedMinHeight: 400
      },
      global: globalMocks
    })

    expect(wrapper.find('textarea').element.style.height).toBe('110px')
    await wrapper.findAll('.u-button-stub')[0]!.trigger('click')
    await nextTick()
    expect(wrapper.find('textarea').element.style.height).toBe('400px')
  })

  it('propagates disabled attribute to both main and modal textareas', async () => {
    const wrapper = mount(ConnectFormExpandableTextarea, {
      attrs: {
        disabled: true
      },
      props: {
        modelValue: 'Disabled text'
      },
      global: globalMocks
    })

    expect(wrapper.find('textarea').attributes('disabled')).toBeDefined()
    // Open dialog
    await wrapper.findAll('.u-button-stub')[1]!.trigger('click')
    await nextTick()
    expect(wrapper.find('.u-modal-stub textarea').attributes('disabled')).toBeDefined()
  })

  it('closes the modal when Done button is clicked', async () => {
    const wrapper = mount(ConnectFormExpandableTextarea, {
      props: { modelValue: 'Test message' },
      global: globalMocks
    })

    await wrapper.findAll('.u-button-stub')[1]!.trigger('click')
    await nextTick()
    expect(wrapper.find('.u-modal-stub').exists()).toBe(true)

    const doneButton = wrapper.find('[data-testid="expandable-textarea-dialog-done"]')
    await doneButton.trigger('click')
    await nextTick()
    expect(wrapper.find('.u-modal-stub').exists()).toBe(false)
  })

  it('closes the modal on Cmd+Enter / Ctrl+Enter keyboard shortcuts', async () => {
    const wrapper = mount(ConnectFormExpandableTextarea, {
      props: { modelValue: 'Test message' },
      global: globalMocks
    })

    await wrapper.findAll('.u-button-stub')[1]!.trigger('click')
    await nextTick()
    expect(wrapper.find('.u-modal-stub').exists()).toBe(true)

    const dialogTextarea = wrapper.find('.u-modal-stub textarea')
    await dialogTextarea.trigger('keydown', { key: 'Enter', metaKey: true })
    await nextTick()
    expect(wrapper.find('.u-modal-stub').exists()).toBe(false)
  })

  it('dynamically adapts gradient fade when white background is passed', () => {
    const wrapper = mount(ConnectFormExpandableTextarea, {
      props: {
        modelValue: 'Some content',
        bgClass: '!bg-white'
      },
      global: globalMocks
    })

    expect(wrapper.find('.from-white.via-white\\/85').exists()).toBe(true)
  })
})
