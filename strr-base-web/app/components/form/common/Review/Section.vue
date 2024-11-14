<script setup lang="ts">
defineProps({
  items: {
    type: Array<{ title?: string, titleClass?: string, content?: string, slot?: string }>,
    default: []
  },
  error: { type: Boolean, default: false }
})

defineEmits<{
  edit: [void]
}>()
</script>
<template>
  <div :class="{ 'border-l-2 border-red-500': error }">
    <div
      v-if="error"
      class="inline-flex items-center gap-1 px-4 pt-4 sm:px-8"
    >
      <UIcon name="i-mdi-alert-circle-outline" class="size-6 text-red-500" />
      <span class="text-red-500">{{ $t('label.stepUnfinished') }}</span>
      <UButton
        variant="link"
        :label="$t('label.returnStepToFinish')"
        :padded="false"
        size="xl"
        class="underline"
        @click="$emit('edit')"
      />
    </div>
    <div class="p-4 sm:p-8">
      <slot>
        <div class="flex flex-col space-y-5 sm:flex-row sm:flex-wrap sm:gap-y-5 sm:space-y-0">
          <ConnectInfoBox
            v-for="(item, i) in items"
            :key="item.title + i"
            :title="item.title"
            :title-class="item.titleClass || 'font-bold text-bcGovGray-900'"
          >
            <template #default>
              <template v-if="item.slot">
                <slot :name="item.slot" />
              </template>
              <template v-else>
                {{ item.content || '-' }}
              </template>
            </template>
          </ConnectInfoBox>
        </div>
      </slot>
    </div>
  </div>
</template>
