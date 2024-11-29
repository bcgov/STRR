<script setup lang="ts">
const reqStore = usePropertyReqStore()
const localePath = useLocalePath()

const accordianRef = ref()

function handleContinueApp () {
  reqStore.continueApplication = true
  accordianRef.value?.buttonRefs[0].close()
}
</script>
<template>
  <div
    class="space-y-10"
  >
    <UAccordion
      ref="accordianRef"
      :items="[{ label: 'n/a' }]"
      default-open
      color="red"
      :ui="{
        wrapper: 'bg-red-50 rounded border border-red-500 border-opacity-25',
        item: {
          padding: 'pt-1.5 pb-3 px-8',
          base: ''
        }
      }"
    >
      <template #default="{ open }">
        <UButton
          ref="buttonRef"
          variant="ghost"
          color="red"
          class="justify-between p-4"
          :ui="{
            rounded: 'rounded-none'
          }"
        >
          <template #leading>
            <div class="flex items-center gap-2">
              <UIcon name="i-mdi-alert" class="size-5 shrink-0 self-start text-red-500" />
              <span class="text-left text-base font-semibold text-gray-700">
                <!-- TODO: map erorrs to different text -->
                {{ $t('error.reqFetch.unknown.title') }}
              </span>
            </div>
          </template>

          <template #trailing>
            <div
              v-if="reqStore.continueApplication"
              class="flex items-center gap-1"
            >
              <span class="text-blue-500">{{ open ? $t('btn.hideDetails') : $t('btn.showDetails') }}</span>
              <UIcon
                name="i-heroicons-chevron-down-20-solid"
                class="ms-auto size-5 shrink-0 text-blue-500 transition-transform duration-200"
                :class="[open && 'rotate-180']"
              />
            </div>
          </template>
        </UButton>
      </template>

      <template #item>
        <div class="flex flex-col gap-4 pt-2 text-base text-bcGovGray-700">
          <ConnectI18nBold translation-path="error.reqFetch.unknown.description" />
          <ConnectContactBcros />
        </div>
      </template>
    </UAccordion>

    <div
      v-if="!reqStore.continueApplication"
      class="flex justify-end gap-4"
    >
      <UButton
        :label="$t('btn.exitReg')"
        variant="outline"
        size="bcGov"
        :to="localePath('/dashboard')"
      />
      <UButton
        :label="$t('btn.contWithReg')"
        size="bcGov"
        @click="handleContinueApp"
      />
    </div>
  </div>
</template>
