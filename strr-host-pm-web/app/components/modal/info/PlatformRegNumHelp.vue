<script setup lang="ts">

const { t } = useI18n()

const link = `<a class="text-blue-500 underline" target="_blank" href="${t('modal.strataPlatformNumHelp.link')}">
  ${t('modal.strataPlatformNumHelp.linkTitle')}</a>`

</script>
<template>
  <ModalBase :title="$t('modal.strataPlatformNumHelp.title')">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-html="$t('modal.strataPlatformNumHelp.p1', { link })" />
    <div class="mt-4">
      {{ $t('modal.strataPlatformNumHelp.p2') }}
    </div>
  </ModalBase>
</template>
