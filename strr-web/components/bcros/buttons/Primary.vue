<template>
  <slot>
    <UButton
      :class="classWithDefaultSpacing"
      :color="color || 'primary'"
      :icon="icon"
      :label="label"
      :loading="loading"
      :text="text"
      :trailing="trailing"
      :variant="variant"
      data-cy="button"
      :disabled="disabled"
      @click="action()"
    >
      {{ text }}
    </UButton>
  </slot>
</template>

<script setup lang="ts">
import { ButtonVariant } from '@nuxt/ui/dist/runtime/types'

const { action, color, className, icon, label, loading, text, trailing, variant, disabled } = defineProps<{
  action: Function,
  className?: string,
  color?: string,
  icon?: string,
  loading?: boolean,
  label?: string,
  text: string,
  trailing?: boolean,
  variant?: ButtonVariant,
  disabled?: boolean
}>()

const classWithDefaultSpacing = `
  ${className}
  h-fit text-[16px] px-[28px] py-[10px] justify-center
  desktop:shrink
  mobile:grow
`

</script>
