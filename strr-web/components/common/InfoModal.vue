<script setup lang="ts">
import BcrosContactInfo from '~/components/common/BcrosContactInfo.vue'

const { t } = useTranslation()

const isOpen = ref(false)

const props = defineProps<{
  header: string
  openButtonLabel?: string
  openButtonIcon?: string
  hideContactInfo?: boolean
}>()

const {
  header,
  hideContactInfo = true,
  openButtonLabel,
  openButtonIcon = props.openButtonIcon || 'i-mdi-help-circle-outline'
} = props

const handleCloseModal = () => {
  isOpen.value = false
}

// allow ESC to close the modal
defineShortcuts({
  escape: {
    usingInput: true,
    whenever: [isOpen],
    handler: () => {
      isOpen.value = false
    }
  }
})
</script>

<template>
  <div data-test-id="info-modal-container">
    <UButton
      v-if="openButtonLabel"
      data-test-id="info-modal-open-button"
      class="p-0 text-base"
      variant="ghost"
      :label="openButtonLabel"
      :leading-icon="openButtonIcon"
      :ui="{ variant: { ghost: 'hover:bg-transparent' } }"
      @click="isOpen = true"
    />
    <UModal
      v-model="isOpen"
      prevent-close
      data-test-id="info-modal"
      :ui="{
        container: 'items-center',
        base: 'p-10',
        overlay: { background: 'bg-black/60' },
        width: 'w-[660px]',
        rounded: 'rounded-md'
      }"
    >
      <div class="flex justify-between mb-11">
        <BcrosTypographyH2 :text="header" class="pt-0 pb-0" data-test-id="info-modal-header" />
        <UButton
          color="gray"
          variant="ghost"
          icon="i-mdi-close"
          class="p-0"
          size="xl"
          @click="isOpen = false"
        />
      </div>

      <div data-test-id="info-modal-default-slot">
        <slot />
      </div>

      <BcrosContactInfo v-if="!hideContactInfo" />

      <div
        class="flex justify-center mt-10"
        data-test-id="info-modal-action-buttons"
      >
        <BcrosButtonsPrimary
          :label="t('common.baseModal.closeButtonLabel')"
          :action="() => handleCloseModal()"
        />
      </div>
    </UModal>
  </div>
</template>
