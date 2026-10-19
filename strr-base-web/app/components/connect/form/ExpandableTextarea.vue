<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToggle } from '@vueuse/core'
import ModalBase from '../../modal/Base.vue'

defineOptions({ inheritAttrs: false })

const DEFAULT_COLLAPSED_HEIGHT_PX = 290
const DEFAULT_EXPANDED_HEIGHT_PX = 560

const props = withDefaults(defineProps<{
  dataTestid?: string
  toggleTestid?: string
  dialogTestid?: string
  dialogTitle?: string
  expandAriaLabel?: string
  collapseAriaLabel?: string
  initialHeight?: number
  expandedMinHeight?: number
  resize?: boolean
  color?: string
  bgClass?: string
  fadeClass?: string
}>(), {
  dataTestid: 'expandable-textarea',
  toggleTestid: '',
  dialogTestid: '',
  dialogTitle: '',
  expandAriaLabel: '',
  collapseAriaLabel: '',
  initialHeight: DEFAULT_COLLAPSED_HEIGHT_PX,
  expandedMinHeight: DEFAULT_EXPANDED_HEIGHT_PX,
  resize: true,
  color: 'gray',
  bgClass: '!bg-str-bgGray',
  fadeClass: ''
})

const emit = defineEmits<{
  change: [value: string]
  toggleExpand: [expanded: boolean]
}>()

const model = defineModel<string>({ default: '' })
const { t } = useI18n()

const textareaRef = ref<{ textarea?: HTMLTextAreaElement, $el?: HTMLElement } | null>(null)
const [isExpanded, toggleExpandState] = useToggle(false)
const [isDialogOpen] = useToggle(false)

const getTextareaEl = (): HTMLTextAreaElement | null =>
  textareaRef.value?.textarea ?? textareaRef.value?.$el?.querySelector?.('textarea') ?? null

const setHeight = (heightPx: number) => {
  const el = getTextareaEl()
  if (el) {
    el.style.height = `${heightPx}px`
  }
}

const canToggleExpand = computed(() => isExpanded.value || Boolean(model.value?.trim()))

const toggleExpand = () => {
  const next = toggleExpandState()
  emit('toggleExpand', next)
  const el = getTextareaEl()
  if (el) {
    setHeight(next ? Math.max(el.scrollHeight, props.expandedMinHeight) : props.initialHeight)
    if (!next) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }
}

const textareaBaseClass = computed(() =>
  `w-full min-h-[80px] resize-y focus:ring-0 ${props.bgClass}`
)

const resolvedFadeClass = computed(() => {
  if (props.fadeClass) { return props.fadeClass }
  return props.bgClass.includes('white')
    ? 'from-white via-white/85'
    : 'from-str-bgGray via-str-bgGray/85'
})

onMounted(() => {
  setHeight(props.initialHeight)
})
</script>

<template>
  <div class="relative w-full">
    <UTextarea
      ref="textareaRef"
      v-model="model"
      v-bind="$attrs"
      :data-testid="dataTestid"
      :color="color as any"
      :resize="resize"
      :ui="{
        base: textareaBaseClass,
        padding: { sm: 'p-4 pb-12' }
      }"
      @update:model-value="emit('change', $event)"
    >
      <div
        v-if="canToggleExpand"
        :class="[
          'pointer-events-none absolute bottom-1 left-1 right-5 z-10 flex justify-center pb-2 pt-7',
          !isExpanded && `bg-gradient-to-t ${resolvedFadeClass} to-transparent`
        ]"
      >
        <div class="pointer-events-auto flex items-center gap-2">
          <UButton
            :icon="isExpanded ? 'i-mdi-arrow-collapse-vertical' : 'i-mdi-arrow-expand-vertical'"
            :label="isExpanded ? t('btn.collapse') : t('btn.expand')"
            size="xs"
            color="white"
            variant="solid"
            class="rounded-full px-3 shadow-sm ring-1 ring-gray-300/80 transition-shadow hover:shadow"
            :data-testid="toggleTestid || `${dataTestid}-toggle-expand`"
            :aria-label="isExpanded
              ? (collapseAriaLabel || t('btn.collapse'))
              : (expandAriaLabel || t('btn.expand'))"
            @click="toggleExpand"
          />
          <UButton
            icon="i-mdi-fullscreen"
            :label="t('btn.openInDialog')"
            size="xs"
            color="white"
            variant="solid"
            class="rounded-full px-3 shadow-sm ring-1 ring-gray-300/80 transition-shadow hover:shadow"
            :data-testid="dialogTestid || `${dataTestid}-open-dialog`"
            :aria-label="t('btn.openInDialog')"
            @click="isDialogOpen = true"
          />
        </div>
      </div>
    </UTextarea>

    <ModalBase
      v-model="isDialogOpen"
      :title="dialogTitle || ($attrs['aria-label'] as string) || t('btn.openInDialog')"
      width="w-full sm:max-w-4xl"
    >
      <UTextarea
        v-model="model"
        :placeholder="($attrs.placeholder as string) || ''"
        :aria-label="($attrs['aria-label'] as string) || dialogTitle || t('btn.openInDialog')"
        :disabled="Boolean($attrs.disabled)"
        :color="color as any"
        :data-testid="`${dataTestid}-dialog-textarea`"
        resize
        :ui="{
          base: `w-full min-h-[60vh] resize-y focus:ring-0 ${bgClass}`,
          padding: { sm: 'p-4' }
        }"
        @keydown.meta.enter="isDialogOpen = false"
        @keydown.ctrl.enter="isDialogOpen = false"
        @update:model-value="emit('change', $event)"
      />

      <template #footer>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs text-gray-400">
            <span>Press</span>
            <kbd
              class="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600"
            >
              Esc
            </kbd>
            <span>or</span>
            <kbd
              class="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600"
            >
              ⌘/Ctrl + Enter
            </kbd>
            <span>to exit</span>
          </div>
          <UButton
            :label="t('btn.done')"
            color="primary"
            variant="solid"
            class="px-6"
            :data-testid="`${dataTestid}-dialog-done`"
            @click="isDialogOpen = false"
          />
        </div>
      </template>
    </ModalBase>
  </div>
</template>
