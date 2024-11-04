<template>
  <UAlert
    class="max-w-bcGovInput"
    color="yellow"
    icon="i-mdi-alert"
    :close-button="null"
    variant="subtle"
    :ui="{
      inner: 'pt-0',
    }"
  >
    <template #description>
      <p>
        <b>{{ $t('label.note') }}:</b>
        {{ $t('strr.text.emailNote') }}
      </p>
    </template>
  </UAlert>
</template>
