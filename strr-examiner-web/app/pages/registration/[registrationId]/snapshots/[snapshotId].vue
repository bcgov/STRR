<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const route = useRoute()
const { getSnapshotById } = useExaminerStore()

useHead({
  title: t('page.snapshot.title')
})

definePageMeta({
  layout: 'examine',
  middleware: ['auth']
})

const initialMount = ref(true)

const { data: snapshot, status, error, refresh } = await useLazyAsyncData<
  ApiSnapshotResponse, ApplicationError
>(
  'snapshot-details-view',
  async () => {
    const registrationId = route.params.registrationId as string
    const snapshotId = route.params.snapshotId as string
    return await getSnapshotById(registrationId, snapshotId)
  }
)

watch(
  [snapshot, status, error],
  () => {
    initialMount.value = false
  }
)
</script>

<template>
  <div class="app-body">
    <ConnectSpinner
      v-if="initialMount || status === 'pending'"
      overlay
    />
    <ExaminerErrorState
      v-else-if="error"
      :error="error"
      item-type="Snapshot"
      :on-retry="() => {
        initialMount = true
        refresh()
      }"
    />
    <template v-else>
      <ApplicationDetailsView>
        <template #header>
          <RegistrationInfoHeader />
        </template>
      </ApplicationDetailsView>
    </template>
  </div>
</template>
