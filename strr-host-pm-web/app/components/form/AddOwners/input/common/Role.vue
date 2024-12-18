<script setup lang="ts">
const originalRole = inject<OwnerRole>('originalRole')
const role = defineModel<OwnerRole>()
const props = defineProps<{
  ownerType: OwnerType,
  isCompParty: boolean,
  showError: boolean
}>()

const { t } = useI18n()
const { hasHost, hasCoHost, hasPropertyManager } = storeToRefs(useHostOwnerStore())

const radioOptions = computed(() => [
  {
    value: OwnerRole.HOST,
    label: t(`strr.label.role.${OwnerRole.HOST}`),
    disabled: hasHost.value && originalRole !== OwnerRole.HOST
  },
  ...(props.ownerType === OwnerType.INDIVIDUAL
    ? [{
        value: OwnerRole.CO_HOST,
        label: t(`strr.label.role.${OwnerRole.CO_HOST}`),
        disabled: (hasCoHost.value && originalRole !== OwnerRole.CO_HOST) || props.isCompParty
      }]
    : []
  ),
  {
    value: OwnerRole.PROPERTY_MANAGER,
    label: t(`strr.label.role.${OwnerRole.PROPERTY_MANAGER}`),
    disabled: hasPropertyManager.value && originalRole !== OwnerRole.PROPERTY_MANAGER
  }
])
</script>

<template>
  <UFormGroup id="host-contact-role" name="role">
    <!-- TODO: move radio group to base/connect -->
    <URadioGroup
      v-model="role"
      class="p-2"
      :class="showError && role === undefined ? 'border-red-600 border-2' : ''"
      :options="radioOptions"
      :ui="{ fieldset: 'flex grow' }"
      :ui-radio="{ wrapper: 'grow justify-start -ml-2 space-x-0', label: 'pl-0' }"
    >
      <template #legend>
        <span class="sr-only">{{ $t('validation.required') }}</span>
      </template>
      <template #label="{ option }">
        <p :class="[option.disabled ? 'cursor-not-allowed opacity-50' : '', 'pl-3']">
          {{ option.label }}
        </p>
      </template>
    </URadioGroup>
  </UFormGroup>
</template>
