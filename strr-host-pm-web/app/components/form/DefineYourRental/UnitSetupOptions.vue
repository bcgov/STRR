<script setup lang="ts">
const props = defineProps<{ option: any }>()

const { option } = props
const translationOptionId = `rentalUnitSetupOption.${option.value}` // eg. rentalUnitSetupOption.DIFFERENT_PROPERTY
</script>

<template>
  <div
    v-if="option.value"
    class="w-full"
    :data-testid="`unit-setup-${option.value.toLowerCase()}`"
  >
    <p class="my-2 ml-3 text-base italic">
      <ConnectI18nHelper :translation-path="`${translationOptionId}.desc`" />
    </p>
    <div
      v-if="option.value === RentalUnitSetupOption.SEPARATE_UNIT_SAME_PROPERTY"
      class="ml-3 mt-5 space-y-2 rounded border-2 border-[#E2E8EE]
      bg-[#F1F3F5] px-5 py-3 text-base italic text-[#495057]"
    >
      <ConnectI18nHelper :translation-path="`${translationOptionId}.scenarioA`" class="block" />
      <ConnectI18nHelper :translation-path="`${translationOptionId}.scenarioB`" class="block" />
      <ConnectI18nHelper :translation-path="`${translationOptionId}.scenarioC`" class="block" />
      <UAlert
        color="yellow"
        class="w-auto not-italic"
        icon="i-mdi-alert"
        :close-button="null"
        variant="subtle"
        :ui="{
          inner: 'pt-0',
          padding: 'p-6',
          icon: {
            base: 'w-5 h-5 self-start'
          }
        }"
        data-testid="alert-unit-setup-option-2"
      >
        <template #title>
          <ConnectI18nHelper :translation-path="`${translationOptionId}.alert`" />
        </template>
      </UAlert>
    </div>
    <div
      v-if="option.value === RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE"
      class="ml-3 mt-5 space-y-2 rounded border-2 border-[#E2E8EE]
      bg-[#F1F3F5] px-5 py-3 text-base italic text-[#495057]"
    >
      <ConnectI18nHelper :translation-path="`${translationOptionId}.scenarioA`" class="block" />
      <ConnectI18nHelper :translation-path="`${translationOptionId}.scenarioB`" class="block" />
      <ConnectI18nHelper :translation-path="`${translationOptionId}.scenarioC`" class="block" />
    </div>
  </div>
</template>

<style scoped></style>
