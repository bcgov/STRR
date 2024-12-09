<script setup lang="ts">
defineProps<{ item: ConnectAccordionItem, padLeft?: boolean }>()
</script>
<template>
  <div class="space-y-3">
    <div v-for="info, i in item.values" :key="`connect-accordian-info-${i}`">
      <div class="flex gap-4" :class="[padLeft && 'pl-10', info.icon && '-ml-9', info.class || '']">
        <UIcon v-if="info.icon" :name="info.icon" :class="info.iconClass ?? 'size-5'" />
        <div>
          <!-- TODO: bcreg font doesn't have a semi-bold so this is either fully bold or not at all -->
          <p v-if="info.label" class="text-sm font-bold">
            {{ info.label }}
          </p>
          <p v-if="info.text" class="break-all text-sm">
            {{ info.text }}
          </p>
          <ConnectFormAddressDisplay v-if="info.address" :address="info.address" />
        </div>
      </div>
    </div>
  </div>
</template>
