<script setup lang="ts">
const modalModel = defineModel({ type: Boolean, default: false })
const isSmallScreen = useMediaQuery('(max-width: 640px)')

defineProps<{
  title?: string
  content?: string
  actions?: { label: string, handler:() => void, color?: string, variant?: string }[],
  closeFn?: () => void
  error?: {
    title: string
    description: string
    showContactInfo?: boolean
  },
  fullscreen?: boolean,
  persist?: boolean
}>()

defineEmits<{
  afterLeave: [void]
}>()
</script>
<template>
  <UModal
    v-model="modalModel"
    :fullscreen
    :prevent-close="!!persist"
    :ui="{
      width: 'w-full sm:max-w-lg md:min-w-min'
    }"
    @after-leave="$emit('afterLeave')"
  >
    <UCard
      :ui="{
        divide: '',
        rounded: fullscreen ? 'rounded-none' : 'rounded-lg',
        base: fullscreen ? 'h-screen' : '',
        body: {
          base: '',
          background: '',
          padding: 'px-4 py-4 sm:p-6'
        },
        header: {
          base: '',
          background: '',
          padding: 'px-4 py-4 sm:px-6'
        },
      }"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-xl font-semibold text-bcGovColor-darkGray">{{ title }}</span>
          <UButton
            :ui="{ icon: { base: 'shrink-0 scale-150' } }"
            icon="i-mdi-close"
            color="primary"
            :aria-label="$t('btn.close')"
            square
            variant="ghost"
            @click="closeFn ? closeFn() : (modalModel = false)"
          />
        </div>
      </template>
      <slot>
        <p v-if="content" class="text-bcGovColor-midGray">
          {{ content }}
        </p>
        <div v-if="error" class="flex flex-col items-center gap-4 text-center">
          <UIcon name="i-mdi-alert-circle-outline" class="-mt-10 size-8 text-red-500" />
          <h2 class="text-xl font-semibold">
            {{ error.title }}
          </h2>
          <p>{{ error.description }}</p>
          <ConnectContactBcros v-if="error.showContactInfo" class="self-start text-left" />
        </div>
      </slot>
      <template v-if="actions !== undefined || $slots.footer" #footer>
        <slot name="footer">
          <div v-if="actions !== undefined" class="flex flex-wrap items-center justify-center gap-4">
            <UButton
              v-for="(action, index) in actions"
              :key="index"
              :block="isSmallScreen"
              :label="action.label"
              :variant="action.variant || 'solid'"
              :color="action.color || 'primary'"
              @click="action.handler"
            />
          </div>
        </slot>
      </template>
    </UCard>
  </UModal>
</template>
