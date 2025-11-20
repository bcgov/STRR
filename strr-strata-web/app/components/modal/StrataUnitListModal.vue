<script setup lang="ts">
const modalModel = defineModel({ type: Boolean, default: false })

const props = defineProps<{
  title: string
  unitGroups: {
    id: string
    label: string
    addressLines: string[]
    units: string[]
  }[]
}>()

const close = () => { modalModel.value = false }
</script>

<template>
  <UModal
    v-model="modalModel"
    :ui="{ width: 'w-full sm:max-w-3xl lg:max-w-4xl' }"
  >
    <UCard
      class="max-h-[850px] overflow-hidden"
      :ui="{
        divide: '',
        body: { base: 'px-4 sm:pr-0 sm:pl-16 sm:pb-0' },
        footer: { base: 'px-4 sm:pr-0 sm:pl-16 sm:py-4' }
      }"
    >
      <template #header>
        <div class="-mb-7 flex items-center justify-between py-3 pl-10 pr-12">
          <h2 class="text-xl font-semibold text-bcGovColor-darkGray">
            {{ title }}
          </h2>
          <UButton
            icon="i-mdi-close"
            color="primary"
            variant="ghost"
            square
            :aria-label="$t('btn.close')"
            @click="close"
          />
        </div>
      </template>

      <div class="max-h-[570px] space-y-4 overflow-y-auto" data-scrollbar="light">
        <div
          v-for="group in props.unitGroups"
          :key="group.id"
          class="mr-16 max-h-[570px] overflow-y-auto rounded-md bg-bcGovGray-100 p-6 shadow-sm"
          data-scrollbar="light"
        >
          <p class="text-sm font-semibold uppercase tracking-wide text-bcGovGray-900">
            {{ group.label }}
          </p>
          <p class="mt-1 text-base text-bcGovGray-900">
            {{ group.addressLines.join('  ') }}
          </p>
          <div class="rounded-md pr-2 pt-4">
            <ul
              v-if="group.units.length"
              class="space-y-1 text-sm text-bcGovGray-900"
            >
              <li
                v-for="(unit, index) in group.units"
                :key="`unit-${group.id}-${index}`"
              >
                {{ unit }}
              </li>
            </ul>
            <p v-else class="text-sm text-bcGovGray-900">
              -
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-center border-t border-gray-200 pb-2 pt-4">
          <UButton
            :label="$t('btn.close')"
            color="primary"
            variant="outline"
            class="px-6"
            @click="close"
          />
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<style scoped>
[data-scrollbar="light"] {
  scrollbar-width: thin;
  scrollbar-color: rgba(28, 73, 136, 0.3) rgba(225, 231, 239, 0.6);
}

[data-scrollbar="light"]::-webkit-scrollbar {
  width: 6px;
}

[data-scrollbar="light"]::-webkit-scrollbar-track {
  background: rgba(225, 231, 239, 0.6);
  border-radius: 999px;
}

[data-scrollbar="light"]::-webkit-scrollbar-thumb {
  background: rgba(28, 73, 136, 0.35);
  border-radius: 999px;
}

[data-scrollbar="light"]::-webkit-scrollbar-thumb:hover {
  background: rgba(28, 73, 136, 0.5);
}
</style>
