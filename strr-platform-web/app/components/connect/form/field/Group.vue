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
  isRequired: { type: Boolean, default: false },
  size: { type: String, default: 'lg' }
})

const inputId = useId()

const helpId = `${props.name}-help-${inputId}`
const errorId = `${props.name}-error-${inputId}`
</script>

<template>
  <UFormGroup :label="label" :name="name">
    <template #default="{ error }">
      <ConnectFormField
        :id="id"
        v-model="model"
        :placeholder="placeholder"
        :is-disabled="isDisabled"
        :is-required="isRequired"
        :is-invalid="error !== undefined"
        :help-id="helpId"
        :error-id="errorId"
        size="lg"
      />
    </template>

    <template v-if="help" #help>
      <span :id="helpId">
        {{ help }}
      </span>
    </template>

    <template #error="{ error }">
      <span :id="helpId">
        {{ error }}
      </span>
    </template>
  </UFormGroup>
</template>
