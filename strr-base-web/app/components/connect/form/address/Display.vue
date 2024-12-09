<script setup lang="ts">
const props = defineProps<{
  address: Partial<ConnectAddress>,
  useLocationDescLabel?: boolean
}>()

const addressData = computed(() => getAddressDisplayParts(props.address))
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
      :title="useLocationDescLabel ? $t('label.locationDescription') : $t('label.deliveryInstructions')"
      data-testid="location-description"
    />
  </div>
</template>
