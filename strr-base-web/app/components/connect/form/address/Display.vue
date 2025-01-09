<script setup lang="ts">
const props = defineProps<{
  address: Partial<ConnectAddress>,
  useLocationDescLabel?: boolean
}>()

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

const addressData = computed(() => {
  return [
    props.address.street
      ? `${props.address.street},`
      : [
          [props.address.unitNumber, props.address.streetNumber].filter(val => !!val).join('-'),
          props.address.streetName ? `${props.address.streetName},` : undefined
        ].filter(val => !!val).join(' ') || '',
    props.address.streetAdditional ? `${props.address.streetAdditional},` : '',
    [
      props.address.city ? `${props.address.city},` : undefined,
      props.address.region ? `${props.address.region}\u00A0` : undefined,
      props.address.postalCode
    ].filter(val => !!val).join(' ') || '',
    props.address.country ? (regionNamesInEnglish.of(props.address.country) || props.address.country) : ''
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
      :title="useLocationDescLabel ? $t('label.locationDescription') : $t('label.deliveryInstructions')"
      data-testid="location-description"
    />
  </div>
</template>
