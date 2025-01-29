<script setup lang="ts">
const props = defineProps<{
  error: unknown
}>()

const getErrorKey = () => {
  const error = props.error

  if (error && typeof error === 'object') {
    const hasStatusCode = 'statusCode' in error

    if (hasStatusCode) {
      const code = error.statusCode as number
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
  <ModalBase>
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
