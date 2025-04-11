<script setup lang="ts">
const { t } = useI18n()

interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmButtonText?: string
  cancelButtonText?: string
  hideCancel?: boolean
  onConfirm: () => void | Promise<any>
  onCancel?: () => void | Promise<any>
}

const props = defineProps<Props>()

const confirmText = computed(() => {
  return props.confirmButtonText || t('btn.confirm')
})
const cancelText = computed(() => {
  return props.cancelButtonText || t('btn.cancel')
})
const hideCancel = computed(() => {
  return props.hideCancel ?? false
})
const handleCancel = () => {
  if (props.onCancel) {
    props.onCancel()
  }
}

const isLoading = ref(false)
const isSmallScreen = useMediaQuery('(max-width: 640px)')

const handleConfirm = async () => {
  try {
    isLoading.value = true
    await props.onConfirm()
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UModal
    :model-value="props.isOpen"
    :ui="{
      width: 'w-full sm:max-w-lg md:min-w-min'
    }"
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
          <span class="text-xl font-semibold text-bcGovColor-darkGray">{{ props.title }}</span>
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
        <p>{{ props.message }}</p>
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
