<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="rounded border border-gray-200 bg-blue-50 shadow">
    <div class="px-3 py-2 md:px-8 md:py-5">
      <div class="space-y-8">
        <div class="space-y-3">
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
  </div>
</template>
