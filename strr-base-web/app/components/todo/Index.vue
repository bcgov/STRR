<script setup lang="ts">
defineProps<{
  id: string,
  title: string,
  subtitle?: string,
  button?: {
    label: string,
    action: Function,
    colour?: string,
    icon?: string
  }
}>()
</script>
<template>
  <div class="p-6">
    <div
      class="flex"
      :data-test-id="id"
    >
      <div class="grow space-y-2">
        <slot name="title">
          <h3 class="text-base font-bold">
            {{ title }}
          </h3>
        </slot>
        <slot name="subtitle">
          <p v-if="subtitle" class="text-sm">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="subtitle" />
          </p>
        </slot>
      </div>
      <div>
        <UButton
          v-if="button"
          :label="button.label"
          :color="button.colour || 'primary'"
          :icon="button.icon"
          variant="link"
          @click="button.action()"
        />
      </div>
    </div>
    <slot />
  </div>
</template>
