<script setup lang="ts">
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

const props = withDefaults(defineProps<Props>(), {
  confirmButtonText: 'Confirm',
  cancelButtonText: 'Cancel',
  hideCancel: false,
  onCancel: () => {}
})

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
            @click="props.onCancel"
          />
        </div>
      </template>

      <div class="text-bcGovColor-midGray">
        <p>{{ props.message }}</p>
      </div>

      <template #footer>
        <div class="flex flex-wrap items-center justify-center gap-4">
          <UButton
            v-if="!props.hideCancel"
            variant="outline"
            :block="isSmallScreen"
            data-testid="cancel-button"
            @click="props.onCancel"
          >
            {{ props.cancelButtonText }}
          </UButton>
          <UButton
            color="primary"
            :loading="isLoading"
            :block="isSmallScreen"
            data-testid="confirm-button"
            @click="handleConfirm"
          >
            {{ props.confirmButtonText }}
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
