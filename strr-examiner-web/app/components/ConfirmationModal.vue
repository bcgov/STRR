<script setup lang="ts">
const { t } = useI18n()

interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmButtonText?: string
  cancelButtonText?: string
  hideCancel?: boolean
  onConfirm?: () => void | Promise<any>
  onCancel?: () => void | Promise<any>
}

const props = defineProps<Props>()

const isOpen = ref(props.isOpen)
const title = ref(props.title)
const message = ref(props.message)
const confirmText = ref(props.confirmButtonText || t('btn.confirm'))
const cancelText = ref(props.cancelButtonText || t('btn.cancel'))
const hideCancel = ref(props.hideCancel ?? false)
const confirmAction = ref<(() => Promise<any> | void) | null>(props.onConfirm || null)
const cancelAction = ref<(() => Promise<any> | void) | null>(props.onCancel || null)

/**
 * Open the confirmation modal with the provided options
 */
const openConfirmModal = (options: {
  title: string
  message: string
  onConfirm: () => Promise<any> | void
  onCancel?: () => Promise<any> | void
  confirmText?: string
  cancelText?: string
  disableCancel?: boolean
}) => {
  title.value = options.title
  message.value = options.message
  confirmAction.value = options.onConfirm || null
  cancelAction.value = options.onCancel || null
  confirmText.value = options.confirmText || t('btn.confirm')
  cancelText.value = options.cancelText || t('btn.cancel')
  hideCancel.value = options.disableCancel ?? false
  isOpen.value = true
}

/**
 * Close the confirmation modal
 */
const closeConfirmModal = () => {
  isOpen.value = false
}

const isLoading = ref(false)
const isSmallScreen = useMediaQuery('(max-width: 640px)')

/**
 * Handle confirm action with loading state
 */
const handleConfirm = async () => {
  try {
    isLoading.value = true
    if (confirmAction.value) {
      await confirmAction.value()
    }
    closeConfirmModal()
  } finally {
    isLoading.value = false
  }
}

/**
 * Handle cancel action
 */
const handleCancel = async () => {
  if (cancelAction.value) {
    await cancelAction.value()
  }
  closeConfirmModal()
}

/**
 * Handle open action
 */
const handleOpen = (onConfirm: () => Promise<any> | void) => {
  confirmAction.value = onConfirm || null
  isOpen.value = true
}

// Expose methods
defineExpose({
  openConfirmModal,
  closeConfirmModal,
  handleConfirm,
  handleOpen
})
</script>

<template>
  <UModal
    :model-value="isOpen"
    :ui="{
      width: 'w-full sm:max-w-lg md:min-w-min'
    }"
    @update:model-value="(val) => isOpen = val"
  >
    <UCard
      :ui="{
        divide: '',
        rounded: 'rounded-lg',
        body: {
          base: '',
          background: '',
          padding: 'px-4 py-4 sm:p-6'
        },
        header: {
          base: '',
          background: '',
          padding: 'px-4 py-4 sm:px-6'
        },
      }"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-xl font-semibold text-bcGovColor-darkGray">{{ title }}</span>
          <UButton
            :ui="{ icon: { base: 'shrink-0 scale-150' } }"
            icon="i-mdi-close"
            color="primary"
            aria-label="Close"
            square
            variant="ghost"
            @click="handleCancel"
          />
        </div>
      </template>

      <div class="text-bcGovColor-midGray">
        <p>{{ message }}</p>
      </div>

      <template #footer>
        <div class="flex flex-wrap items-center justify-center gap-4">
          <UButton
            v-if="!hideCancel"
            variant="outline"
            :block="isSmallScreen"
            data-testid="cancel-button"
            @click="handleCancel"
          >
            {{ cancelText }}
          </UButton>
          <UButton
            color="primary"
            :loading="isLoading"
            :block="isSmallScreen"
            data-testid="confirm-button"
            @click="handleConfirm"
          >
            {{ confirmText }}
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
