<script setup lang="ts">
defineProps<{
  title: string,
  subtitle?: string,
  button: {
    label: string,
    action: Function,
    colour?: string,
    icon?: string
  }
}>()
</script>
<template>
  <div class="p-5">
    <div class="flex">
      <div class="grow space-y-2">
        <slot name="title">
          <h3 class="text-lg font-bold">
            {{ title }}
          </h3>
        </slot>
        <slot name="subtitle">
          <p v-if="subtitle">
            {{ subtitle }}
          </p>
        </slot>
      </div>
      <div>
        <UButton
          :label="button.label"
          :color="button.colour || 'primary'"
          :icon="button.icon"
          @click="button.action()"
        />
      </div>
    </div>
    <slot />
  </div>
</template>
