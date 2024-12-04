<script setup lang="ts">
const reqStore = usePropertyReqStore()
const localePath = useLocalePath()
const config = useRuntimeConfig().public

const accordianRef = ref()

const errorKey = computed(() => {
  const type = reqStore.propertyReqError.type
  const status = reqStore.propertyReqError.error?.status
  if (type === 'fetch' && status !== undefined) {
    if (status >= 400 && status < 500) {
      return 'notFound'
    } else if (status >= 500) {
      return 500
    }
  }

  return 'unknown'
})

function handleContinueApp () {
  reqStore.overrideApplicationWarning = true
  reqStore.showUnitDetailsForm = true
  accordianRef.value?.buttonRefs[0].close()
}
</script>
<template>
  <div
    class="space-y-10"
  >
    <UAccordion
      ref="accordianRef"
      :items="[{ label: 'n/a', disabled: !reqStore.overrideApplicationWarning }]"
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
          variant="ghost"
          color="red"
          class="justify-between p-4"
          :ui="{
            rounded: 'rounded-none',
            base: 'disabled:cursor-default disabled:opacity-100 aria-disabled:cursor-default aria-disabled:opacity-100',
          }"
        >
          <template #leading>
            <div class="flex items-center gap-2">
              <UIcon name="i-mdi-alert" class="size-5 shrink-0 self-start text-red-500" />
              <span class="text-left text-base font-semibold text-gray-700">
                <i18n-t
                  :keypath="`error.reqFetch.${errorKey}.title`"
                  tag="p"
                  scope="global"
                  class="font-semibold"
                >
                  <template #linkAllRules>
                    <a
                      :href="config.housingAllRulesUrl"
                      target="_blank"
                      class="text-bcGovColor-activeBlue underline"
                    >
                      {{ $t('link.allRules') }}
                    </a>
                  </template>
                  <template #linkReqDocs>
                    <a
                      :href="config.housingRequiredDocsUrl"
                      target="_blank"
                      class="text-bcGovColor-activeBlue underline"
                    >
                      {{ $t('link.reqDocs') }}
                    </a>
                  </template>
                </i18n-t>
              </span>
            </div>
          </template>

          <template #trailing>
            <div
              v-if="reqStore.showUnitDetailsForm"
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
          <ConnectI18nBold :translation-path="`error.reqFetch.${errorKey}.description`" />
          <ContactSTRR />
        </div>
      </template>
    </UAccordion>

    <div
      v-if="!reqStore.showUnitDetailsForm"
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
