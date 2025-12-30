<script setup lang="ts">
const { t } = useNuxtApp().$i18n

const addressHelpRef = ref(null)

const closeAddressHelp = () => addressHelpRef.value?.buttonRefs[0].close()

defineProps<{
  helpTitle: string
  label?: string
}>()
</script>

<template>
  <UAccordion
    ref="addressHelpRef"
    :items="[{ label: helpTitle, slot: 'help' }]"
    data-testid="address-help-toggle"
    :ui="{
      item: { padding: 'p-0' },
      container: 'border-none'
    }"
  >
    <template #default="{ item, open }">
      <div class="flex items-center justify-between">
        <span v-if="label" class="text-base font-semibold">{{ label }}</span>
        <UButton
          variant="link"
          class="justify-start px-0 text-blue-500 hover:text-blue-700"
          :class="open && 'font-bold'"
          icon="i-mdi-help-circle-outline"
          :label="open ? `${t('help.address.hide')} ${item.label}` : item.label"
        />
      </div>
    </template>
    <template #help>
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
            @click="closeAddressHelp"
          >
            {{ t('help.address.hide') }}
          </UButton>
        </div>
      </div>
    </template>
  </UAccordion>
</template>
