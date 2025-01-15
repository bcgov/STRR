<script setup lang="ts">
import type { Component } from 'vue'
import { HostDetailsOwners } from '#components'
const componentMap: Record<string, Component> = {
  HostDetailsOwners
  // key2: resolveComponent('MyComponentB'),
  // key3: resolveComponent('MyComponentC')
}

const props = defineProps<{
  component: string
}>()

const showExpansionModel = defineModel({ type: Boolean, default: false })
</script>
<template>
  <section
    id="details-expansion-content"
    class="mx-auto overflow-hidden transition-all duration-500 ease-in-out"
    :class="{
      '-mb-3 max-h-0 opacity-0': !showExpansionModel,
      '-mb-0 max-h-[10000px] opacity-100': showExpansionModel,
    }"
  >
    <component :is="componentMap[props.component]" v-bind="$attrs" />
  </section>
</template>
