<script setup lang="ts">
import { FetchError } from 'ofetch'

const props = defineProps<{
  error: unknown
}>()

const getErrorKey = () => {
  if (props.error instanceof FetchError) {
    const code = props.error.statusCode
    if (code) {
      if (code > 399 && code < 500) {
        return 'badRequest'
      } else if (code >= 500) {
        return 'internal'
      }
    }
  }
  return 'unknown'
}

const errorKey = getErrorKey()
</script>
<template>
  <ModalBase :actions="[{ label: $t('btn.close'), handler: () => useStrrModals().close() }]">
    <div class="-mt-6 flex flex-col items-center gap-4 text-center">
      <UIcon
        name="i-mdi-alert-circle-outline"
        class="size-8 text-red-500"
      />
      <h2 class="text-xl font-semibold">
        {{ $t(`modal.error.applicationSubmit.${errorKey}.title`) }}
      </h2>
      <p>{{ $t(`modal.error.applicationSubmit.${errorKey}.content`) }}</p>
      <ContactSTRR class="self-start text-left" />
    </div>
  </ModalBase>
</template>
