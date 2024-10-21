<script setup lang="ts">
const props = defineProps<{ address: Partial<ConnectAddress> }>()
const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

const addressData = computed((): string[] => {
  return [
    props.address.street || '',
    props.address.streetAdditional || '',
    [props.address.city, props.address.region, props.address.postalCode].filter(val => !!val).join(' ') || '',
    regionNamesInEnglish.of(props.address.country || '') || props.address.country || ''
  ].filter(val => !!val)
})
</script>
<template>
  <div data-testid="address-display">
    <div
      v-for="addressLine, i in addressData"
      :key="addressLine + i"
      data-testid="address-line"
    >
      {{ addressLine }}
    </div>
    <ConnectInfoBox
      v-if="address.locationDescription"
      class="mt-2"
      :content="address.locationDescription"
      title="Location Description"
      data-testid="location-description"
    />
  </div>
</template>
