<script setup lang="ts">
const { t } = useTranslation()
</script>

<template>
  <div class="flex flex-col" data-test-id="contact-info">
    <div class="contact-info-detail d:items-center">
      <UIcon name="i-mdi-phone" class="m:w-[20px] m:mt-1" />
      <span>{{ t('bcrosContactInfo.tollFree.label') }}
        <a :href="`tel:${t('bcrosContactInfo.tollFree.value')}`">
          {{ t('bcrosContactInfo.tollFree.value') }}
        </a>
      </span>
    </div>
    <div class="contact-info-detail items-center">
      <UIcon name="i-mdi-phone" />
      <span>{{ t('bcrosContactInfo.local.label') }}
        <a :href="`tel:${t('bcrosContactInfo.local.value')}`">
          {{ t('bcrosContactInfo.local.value') }}
        </a>
      </span>
    </div>
    <div class="contact-info-detail items-center">
      <UIcon name="i-mdi-email" />
      <span>{{ t('bcrosContactInfo.email.label') }}
        <a :href="`mailto:${t('bcrosContactInfo.email.value')}`">
          {{ t('bcrosContactInfo.email.value') }}
        </a>
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.contact-info-detail {
  @apply flex space-x-2;
}
a {
  @apply break-keep whitespace-nowrap;
}
.iconify {
  @apply bg-bcGovColor-nonClickable;
}
</style>
