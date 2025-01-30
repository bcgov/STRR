<script setup lang="ts">
const reqStore = usePropertyReqStore()
const localePath = useLocalePath()
</script>
<template>
  <div class="space-y-10">
    <UAlert
      data-testid="alert-str-prohibited"
      color="yellow"
      icon="i-mdi-alert"
      :close-button="null"
      variant="subtle"
      :title="$t('alert.strProhibited.title')"
      :ui="{
        inner: 'pt-0',
        icon: { base: 'self-start text-outcomes-caution' },
        title: 'text-base font-bold',
      }"
    />
    <div
      v-if="!reqStore.showUnitDetailsForm"
      class="flex justify-end gap-4"
    >
      <UButton
        data-testid="btn-exit-registration"
        :label="$t('btn.exitReg')"
        variant="outline"
        size="bcGov"
        :to="localePath('/dashboard')"
      />
      <UButton
        data-testid="btn-continue-registration"
        :label="$t('btn.contWithReg')"
        size="bcGov"
        @click="reqStore.showUnitDetailsForm = true"
      />
    </div>
  </div>
</template>
