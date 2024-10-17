<script setup lang="ts">
import { type UseEventBusReturn } from '@vueuse/core'

const formBus = inject<UseEventBusReturn<any, string> | undefined>('form-events', undefined)

const model = defineModel({ type: String, default: '' })
watch(model, () => {
  formBus?.emit({ type: 'blur', path: props.name })
  formBus?.emit({ type: 'change', path: props.name })
}, { deep: true })

const props = defineProps({
  name: { type: String, default: 'name.fullName' },
  help: { type: String, default: '' },
  id: { type: String, required: true },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  isDisabled: { type: Boolean, default: false },
  size: { type: String, default: 'lg' }
})
</script>

<template>
  <UFormGroup :label="label" :name="name" :help="help">
    <ConnectField
      :id="id"
      v-model="model"
      :placeholder="placeholder"
      :disabled="isDisabled"
      size="lg"
    />
  </UFormGroup>
</template>
