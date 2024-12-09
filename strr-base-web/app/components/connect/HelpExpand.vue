<script setup lang="ts">
defineProps<{
  text?: string,
  title?: string,
  label: string,
  labelExpanded: string,
  icon?: string
}>()
const isExpanded = ref(false)

</script>
<template>
  <div>
    <UButton
      :padded="false"
      class="font-bold"
      color="primary"
      variant="link"
      :icon="icon || 'i-mdi-help-circle-outline'"
      :label="(isExpanded && labelExpanded) ? labelExpanded : label"
      @click="isExpanded = !isExpanded"
    />
    <ConnectTransitionCollapse>
      <div
        v-if="isExpanded"
        class="mt-4 space-y-4 border-y border-dashed border-gray-700 pb-4 pt-8"
      >
        <slot>
          <slot name="title">
            <strong v-if="title" class="flex justify-center">
              {{ title }}
            </strong>
          </slot>
          <slot name="text">
            <p>{{ text }}</p>
          </slot>
        </slot>
        <div class="flex justify-end">
          <UButton
            class="underline"
            :label="labelExpanded"
            variant="link"
            @click="isExpanded = !isExpanded"
          />
        </div>
      </div>
    </ConnectTransitionCollapse>
  </div>
</template>
