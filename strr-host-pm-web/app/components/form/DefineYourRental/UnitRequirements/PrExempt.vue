<template>
  <UAlert
    color="yellow"
    icon="i-mdi-check-circle"
    :close-button="null"
    variant="subtle"
    :title="$t('alert.prExempt.title')"
    :ui="{
      inner: 'pt-0',
      icon: { base: 'text-outcomes-approved' },
      title: 'text-base font-semibold',
    }"
  />
</template>
