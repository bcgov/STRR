<script setup lang="ts">
import { type UseEventBusReturn } from '@vueuse/core'

const formBus = inject<UseEventBusReturn<any, string> | undefined>('form-events', undefined)

const model = defineModel<string | number>()
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
  size: { type: String, default: 'lg' },
  ariaLabel: { type: String, default: undefined },
  type: { type: String, default: 'text' },
  mask: { type: String, default: undefined },
  maxlength: { type: Number, default: 1000 }
})

const inputId = useId()

const helpId = `${props.name}-help-${inputId}`
const errorId = `${props.name}-error-${inputId}`
</script>

<template>
  <UFormGroup :label="label" :name="name">
    <template #default="{ error }">
      <slot :error="error">
        <ConnectFormField
          :id="id"
          v-model="model"
          :mask="mask"
          :type
          :placeholder="placeholder"
          :is-disabled="isDisabled"
          :is-required="isRequired"
          :is-invalid="error !== undefined"
          :help-id="helpId"
          :error-id="errorId"
          :aria-label="ariaLabel"
          size="lg"
          :maxlength
        />
      </slot>
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
