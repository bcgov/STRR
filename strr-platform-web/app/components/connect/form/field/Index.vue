<script setup lang="ts">
import { normalizeInput } from '~/utils/connect-validation'

const model = defineModel({ type: String, default: '' })

defineProps({
  id: { type: String, required: true },
  isDisabled: { type: Boolean, default: false },
  isRequired: { type: Boolean, default: false },
  isInvalid: { type: Boolean, default: false },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  size: { type: String, default: 'lg' },
  helpId: { type: String, default: undefined },
  errorId: { type: String, default: undefined }
})

const normalize = () => {
  model.value = normalizeInput(model.value)
}
</script>

<template>
  <UInput
    :id="id"
    v-model="model"
    v-bind="$attrs"
    type="text"
    class="max-w-bcGovInput"
    :size="size"
    :color="model ? 'primary' : 'gray'"
    :placeholder="placeholder"
    :disabled="isDisabled"
    :aria-disabled="isDisabled"
    :aria-required="isRequired"
    :aria-invalid="isInvalid"
    :aria-describedby="helpId"
    @blur="normalize"
  />
  <!-- :aria-errormessage="errorId" -->
  <!-- Doesnt look like aria-errormessage is well supported, need to look into this more -->
</template>
