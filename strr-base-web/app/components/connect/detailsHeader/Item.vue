<script setup lang="ts">
import type { ConnectDetailHeaderItem } from '#imports'

defineProps<ConnectDetailHeaderItem>()
</script>

<template>
  <div class="flex space-x-1">
    <UIcon v-if="icon" :name="icon" :class="iconClass || ''" />
    <UBadge
      v-if="chip"
      :label="text"
      :color="chipColour || 'primary'"
      :class="itemClass || 'px-3'"
    />
    <a
      v-else-if="link"
      :href="linkHref"
      :class="itemClass || ''"
    >
      {{ text }}
    </a>
    <p v-else :class="itemClass || 'text-sm'">
      {{ text }}
    </p>
  </div>
</template>
