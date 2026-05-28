<script setup lang="ts">
const props = defineProps<{
  error: unknown
}>()

type ApplicationSubmitErrorKey =
  | 'renewalAlreadyInProgress'
  | 'badRequest'
  | 'internal'
  | 'unknown'

function resolveApplicationSubmitErrorKey (error: unknown): ApplicationSubmitErrorKey {
  if (!error || typeof error !== 'object') {
    return 'unknown'
  }

  const statusCode = 'statusCode' in error
    ? (error as { statusCode?: number }).statusCode
    : undefined
  const data = 'data' in error ? (error as { data?: unknown }).data : undefined
  const errorCode = data && typeof data === 'object' && 'errorCode' in data
    ? String((data as { errorCode?: unknown }).errorCode)
    : undefined

  if (statusCode === 409 && errorCode === 'RENEWAL_ALREADY_IN_PROGRESS') {
    return 'renewalAlreadyInProgress'
  }

  if (statusCode !== undefined && statusCode > 399 && statusCode < 500) {
    return 'badRequest'
  }

  if (statusCode !== undefined && statusCode >= 500) {
    return 'internal'
  }

  return 'unknown'
}

const errorKey = computed(() => resolveApplicationSubmitErrorKey(props.error))
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
