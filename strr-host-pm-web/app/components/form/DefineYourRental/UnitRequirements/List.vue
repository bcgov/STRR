<script setup lang="ts">
const reqStore = usePropertyReqStore()
</script>
<template>
  <div class="flex flex-col gap-4">
    <span class="font-semibold">
      {{ reqStore.overrideApplicationWarning
        ? $t('text.thisPropCouldBeInLocWithReqs')
        : $t('text.thisPropIsInLocWithReqs')
      }}
    </span>
    <UAccordion
      :items="reqStore.requirementsList"
      multiple
      :ui="{
        item: { padding: 'pt-1.5 pb-3 px-8' }
      }"
    >
      <template #default="{ item, open }">
        <UButton
          variant="ghost"
          class="justify-between px-2 py-4"
          :ui="{
            rounded: 'rounded-none'
          }"
        >
          <template #leading>
            <div class="flex items-center gap-1">
              <UIcon name="i-mdi-info-outline" class="size-5 text-blue-700 dark:text-gray-900" />
              <span class="text-base text-gray-700">{{ item.label }}</span>
            </div>
          </template>

          <template #trailing>
            <div class="flex items-center gap-1">
              <span class="text-blue-500">{{ open ? $t('btn.hideDetails') : $t('btn.showDetails') }}</span>
              <UIcon
                name="i-heroicons-chevron-down-20-solid"
                class="ms-auto size-5 transition-transform duration-200"
                :class="[open && 'rotate-180']"
              />
            </div>
          </template>
        </UButton>
      </template>

      <template #pr>
        <i18n-t
          :keypath="reqStore.overrideApplicationWarning
            ? 'requirements.pr.content.override'
            : 'requirements.pr.content.normal'
          "
          tag="p"
          scope="global"
        >
          <template #link>
            <a
              href=""
              target="_blank"
              class="text-bcGovColor-activeBlue underline"
            >
              {{ $t('link.proofOfPr') }}
            </a>
          </template>
        </i18n-t>
        NEED LINK STILL
      </template>
    </UAccordion>
  </div>
</template>
