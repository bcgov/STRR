<script lang="ts" setup>
import { useStrrExpansion, expansionInjectionKey } from '~/composables/useStrrExpansion'

const expansionState = inject(expansionInjectionKey)

const { isExpanded } = useStrrExpansion()

// This will currently only work with 1 component instance at a time (per page)
</script>
<template>
  <ConnectTransitionCollapse>
    <div v-if="isExpanded">
      <component
        :is="expansionState.component"
        v-if="expansionState"
        v-bind="expansionState.props"
      />
    </div>
  </ConnectTransitionCollapse>
</template>
