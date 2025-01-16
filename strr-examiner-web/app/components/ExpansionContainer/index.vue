<script setup lang="ts">
import type { Component } from 'vue'
import { ConnectTransitionCollapse, HostExpansionOwners } from '#components'
const componentMap: Record<ApplicationType, Record<ExpansionItem, Component>> = {
  [ApplicationType.HOST]: {
    [ExpansionItem.HOST_OWNERS]: HostExpansionOwners
  },
  [ApplicationType.PLATFORM]: {
    [ExpansionItem.HOST_OWNERS]: HostExpansionOwners // TODO: update with other expansion items
  },
  [ApplicationType.STRATA_HOTEL]: {
    [ExpansionItem.HOST_OWNERS]: HostExpansionOwners // TODO: update with other expansion items
  }
}

defineProps<{
  expansionItem: ExpansionItem | undefined
  application: HousApplicationResponse
}>()

const showExpansionModel = defineModel({ type: Boolean, default: false })
</script>
<template>
  <ConnectTransitionCollapse>
    <div v-if="showExpansionModel">
      <component
        :is="componentMap[application.registration.registrationType][expansionItem]"
        v-if="application.registration.registrationType !== undefined && expansionItem !== undefined"
        v-bind="$attrs"
        :application
      />
    </div>
  </ConnectTransitionCollapse>
</template>
