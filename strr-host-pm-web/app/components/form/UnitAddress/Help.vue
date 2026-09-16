<script setup lang="ts">
const { t } = useNuxtApp().$i18n

defineProps<{
  helpTitle: string
  label?: string
}>()
</script>

<template>
  <UAccordion
    :items="[{ label: helpTitle, slot: 'help' }]"
    data-testid="address-help-toggle"
    :ui="{
      item: { padding: 'p-0' },
      container: 'border-none'
    }"
  >
    <template #default="{ item, open }">
      <UButton
        variant="link"
        class="w-full justify-between px-0 text-blue-500 hover:text-blue-700 hover:no-underline"
      >
        <span v-if="label" class="text-base font-semibold text-bcGovColor-midGray">{{ label }}</span>
        <span
          class="inline-flex items-center gap-x-2.5 hover:underline"
          :class="open && 'font-bold'"
        >
          <UIcon name="i-mdi-help-circle-outline" class="size-5" aria-hidden="true" />
          {{ open ? `${t('help.address.hide')} ${item.label}` : item.label }}
        </span>
      </UButton>
    </template>
    <template #help="{ close }">
      <div class="mt-4 rounded border border-blue-500 bg-blue-50">
        <div class="px-3 py-2 text-bcGovColor-midGray md:px-8 md:py-5">
          <div class="space-y-8">
            <div class="space-y-3">
              <h4 class="text-base font-semibold text-bcGovColor-midGray">
                {{ t('help.address.street.heading') }}
              </h4>
              <p class="text-sm">
                {{ t('help.address.street.desc') }}
              </p>
              <div class="space-y-6">
                <h5 class="text-sm font-semibold">
                  {{ t('help.address.street.examples.title') }}
                </h5>

                <div class="rounded-lg bg-blue-50 p-3">
                  <img
                    src="/images/address-help-noncivic-examples.png"
                    :alt="t('help.address.noncivic.examples.alt')"
                    class="h-auto w-full max-w-4xl"
                  >
                </div>
              </div>
            </div>

            <div class="h-px w-full border-b border-gray-400" />

            <div class="space-y-3">
              <h4 class="text-base font-semibold text-bcGovColor-midGray">
                {{ t('help.address.noncivic.heading') }}
              </h4>
              <p class="text-sm">
                {{ t('help.address.noncivic.desc') }}
              </p>
              <div class="space-y-6">
                <h5 class="text-sm font-semibold">
                  {{ t('help.address.noncivic.examples.title') }}
                </h5>

                <div class="rounded-lg bg-blue-50 p-3">
                  <img
                    src="/images/address-help-street-examples.png"
                    :alt="t('help.address.street.examples.alt')"
                    class="h-auto w-full max-w-4xl"
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end px-4 py-3">
          <UButton
            variant="link"
            color="primary"
            class="px-2 py-1 text-sm font-bold no-underline"
            @click="close()"
          >
            {{ t('help.address.hide') }}
          </UButton>
        </div>
      </div>
    </template>
  </UAccordion>
</template>
