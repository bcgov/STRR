<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const route = useRoute()
const { getSnapshotById } = useExaminerStore()
const { activeRecord, snapshotInfo } = storeToRefs(useExaminerStore())

useHead({
  title: t('page.snapshot.title')
})

definePageMeta({
  layout: 'examine',
  middleware: ['auth']
})

const initialMount = ref(true)

const { data: snapshot, status, error } = await useLazyAsyncData<
  HousRegistrationResponse | undefined, ApplicationError
>(
  'snapshot-details-view',
  async () => {
    const registrationId = route.params.registrationId as string
    const snapshotId = route.params.snapshotId as string
    const resp = await getSnapshotById(registrationId, snapshotId)
    activeRecord.value = resp.snapshotData // used for the data needed to render the details page
    snapshotInfo.value = resp // used for data needed for snapshot info widget on details page
    return resp
  }
)

watch(
  [snapshot, error],
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
    <template v-else>
      <ApplicationDetailsView>
        <template #header>
          <RegistrationInfoHeader />
        </template>
      </ApplicationDetailsView>
    </template>
  </div>
</template>
