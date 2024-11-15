<script setup lng="ts">
const strrModal = useStrrModals()
</script>
<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:gap-4">
    <UButton
      :label="$t('modal.help.registerStr.triggerBtn')"
      :padded="false"
      icon="i-mdi-help-circle-outline"
      variant="link"
      @click="strrModal.openHelpRegisterModal()"
    />

    <UDivider
      orientation="vertical"
      class="hidden sm:block"
    />

    <UButton
      :label="$t('modal.info.collectionNotice.triggerBtn')"
      :padded="false"
      icon="i-mdi-information-circle-outline"
      variant="link"
      @click="strrModal.openInfoCollectionNoticeModal()"
    />
  </div>
</template>
