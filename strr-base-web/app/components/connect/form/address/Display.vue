<script setup lang="ts">
defineProps<{
  address: Partial<ConnectAddress>,
  omitCountry?: boolean,
  useLocationDescLabel?: boolean
}>()
</script>
<template>
  <div data-testid="address-display">
    <div
      v-for="addressLine, i in getAddressDisplayParts(address, false, true, omitCountry)"
      :key="addressLine + i"
      data-testid="address-line"
    >
      {{ addressLine }}
    </div>
    <ConnectInfoBox
      v-if="address.locationDescription"
      class="mt-2"
      :content="address.locationDescription"
      :title="useLocationDescLabel ? $t('label.locationDescription') : $t('label.deliveryInstructions')"
      data-testid="location-description"
    />
  </div>
</template>
