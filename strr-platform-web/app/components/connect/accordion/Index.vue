<script setup lang="ts">
defineProps<{ items: ConnectAccordionItem[], multiple?: boolean }>()
</script>

<template>
  <UAccordion :items="items" :multiple="multiple">
    <template #default="{ item, open }">
      <UButton
        ref="accordionButton"
        variant="ghost"
        class="p-4 text-sm font-bold text-gray-900 hover:bg-transparent"
        :class="item.class || ''"
      >
        <template #leading>
          <div v-if="item.showAvatar" class="flex size-6 items-center justify-center rounded-full">
            <UAvatar size="xs" class="bg-blue-500" :ui="{text: 'text-white'}" :text="item.label.substring(0,1)" />
          </div>
        </template>
        <span class="text-left" :class="item.showAvatar ? 'pl-2' : ''">{{ item.label }}</span>
        <template #trailing>
          <UIcon
            name="i-heroicons-chevron-down-20-solid"
            class="ms-auto size-5 text-gray-700 transition-transform duration-200"
            :class="[open && '-rotate-180', item.icon]"
          />
        </template>
      </UButton>
    </template>
    <template #item="{ item }">
      <ConnectAccordionItem class="px-4" :class="item.class" :item="item" :pad-left="item.showAvatar" />
    </template>
  </UAccordion>
</template>
