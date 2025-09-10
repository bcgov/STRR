<script setup lang="ts">
const { t } = useI18n()
const { isAddressHelpExpanded } = storeToRefs(useHostApplicationStore())
const { hideAddressHelp } = useHostApplicationStore()
const helpPanelId = useId()
const headingId = useId()

const panelRef = ref<HTMLElement>()
const toggleButtonRef = ref<HTMLButtonElement>()

watch(isAddressHelpExpanded, (newValue) => {
  if (newValue) {
    nextTick(() => {
      panelRef.value?.focus()
    })
  } else {
    nextTick(() => {
      toggleButtonRef.value?.focus()
    })
  }
})
</script>

<template>
  <div class="rounded border border-gray-200 bg-blue-50 shadow">
    <div class="px-4 py-6 md:px-10 md:py-8">
      <ConnectTransitionCollapse>
        <div
          :id="helpPanelId"
          ref="panelRef"
          role="region"
          :aria-labelledby="headingId"
          tabindex="-1"
          class="space-y-8 focus:outline-none"
        >
          <div class="space-y-6">
            <h4 class="text-base font-semibold text-gray-900">
              {{ t('help.address.street.heading') }}
            </h4>
            <p class="text-sm text-gray-700">
              {{ t('help.address.street.desc') }}
            </p>
            <div class="space-y-6">
              <h5 class="text-sm font-semibold text-gray-800">
                {{ t('help.address.street.examples.title') }}
              </h5>

              <div class="rounded-lg bg-blue-50 p-4">
                <img
                  src="/images/address-help-noncivic-examples.png"
                  :alt="t('help.address.noncivic.examples.alt')"
                  class="mx-auto h-auto w-full max-w-4xl"
                >
              </div>
            </div>
          </div>

          <div class="h-px w-full border-b border-gray-400" />

          <div class="space-y-6">
            <h4 class="text-base font-semibold text-gray-900">
              {{ t('help.address.noncivic.heading') }}
            </h4>
            <p class="text-sm text-gray-700">
              {{ t('help.address.noncivic.desc') }}
            </p>
            <div class="space-y-6">
              <h5 class="text-sm font-semibold text-gray-800">
                {{ t('help.address.noncivic.examples.title') }}
              </h5>

              <div class="rounded-lg bg-blue-50 p-4">
                <img
                  src="/images/address-help-street-examples.png"
                  :alt="t('help.address.street.examples.alt')"
                  class="mx-auto h-auto w-full max-w-4xl"
                >
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-4">
            <button
              type="button"
              class="text-sm text-blue-600 underline hover:text-blue-800 focus:outline-none
                     focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              @click="hideAddressHelp"
            >
              {{ t('help.address.hide') }}
            </button>
          </div>
        </div>
      </ConnectTransitionCollapse>
    </div>
  </div>
</template>
