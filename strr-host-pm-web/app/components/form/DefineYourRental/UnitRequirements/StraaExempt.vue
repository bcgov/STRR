<script setup lang="ts">
const localePath = useLocalePath()
</script>
<template>
  <div
    class="space-y-10"
    data-testid="alert-str-exempt"
  >
    <UAlert
      color="yellow"
      icon="i-mdi-check-circle"
      :close-button="null"
      variant="subtle"
      :ui="{
        inner: 'pt-0',
        icon: { base: 'self-start text-outcomes-approved' },
        title: 'text-base',
      }"
    >
      <template #title>
        <ConnectI18nHelper translation-path="alert.straaExempt.title" />
      </template>
    </UAlert>

    <div class="flex justify-end gap-4">
      <UButton
        data-testid="btn-exit-registration"
        :label="$t('btn.exitReg')"
        variant="outline"
        size="bcGov"
        :to="localePath('/dashboard')"
      />
    </div>
  </div>
</template>
