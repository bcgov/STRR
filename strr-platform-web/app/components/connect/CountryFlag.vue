<script setup lang="ts">
import CountryFlag from 'vue-country-flag-next'

defineProps<{
  countryCodeIso2letter: string,
  tooltipText?: string
}>()
</script>

<template>
  <ConnectTooltip
    v-if="tooltipText"
    :text="tooltipText"
    :popper="{}"
  >
    <CountryFlag class="mb-2" :country="countryCodeIso2letter" />
  </ConnectTooltip>
  <CountryFlag
    v-if="!tooltipText"
    class="mb-2"
    :country="countryCodeIso2letter"
  />
</template>
