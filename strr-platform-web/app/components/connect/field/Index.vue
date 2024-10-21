<script setup lang="ts">
import { normalizeInput } from '~/utils/connect-validation'

const model = defineModel({ type: String, default: '' })

defineProps({
  id: { type: String, required: true },
  isDisabled: { type: Boolean, default: false },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  size: { type: String, default: 'lg' }
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
    :color="model ? 'primary' : 'gray'"
    :placeholder="placeholder"
    :disabled="isDisabled"
    :size="size"
    @blur="normalize"
  />
</template>
