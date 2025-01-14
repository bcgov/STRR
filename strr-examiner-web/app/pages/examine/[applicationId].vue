<script setup lang="ts">
import PlatformDetailsView from '~/components/PlatformDetailsView.vue'
import StrataHotelDetailsView from '~/components/StrataHotelDetailsView.vue'
import type { ApiHostApplication } from '~/interfaces/host-i'
import type { ApiBasePlatformRegistration } from '~/interfaces/platform-i'
import type { ApiBaseStrataApplication } from '~/interfaces/strata-i'
import { useExaminerStore } from '~/store/examiner'

const { t } = useI18n()
const route = useRoute()
const { getAccountApplication } = useStrrApi()
const { loading } = storeToRefs(useConnectDetailsHeaderStore())
const { approveApplication, rejectApplication } = useExaminerStore()

useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  layout: 'examiner',
  middleware: ['auth', 'require-account']
})

let applicationId = ''
const application = ref<ApiApplicationResp>()

const approveApplicationHandler = async () => {
  try {
    loading.value = true
    await approveApplication(applicationId)
    await fetchApplication(applicationId)
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const rejectApplicationHandler = async () => {
  try {
    loading.value = true
    await rejectApplication(applicationId)
    await fetchApplication(applicationId)
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const fetchApplication = async (applicationNumber: string): Promise<void> => {
  applicationId = applicationNumber
  application.value = await getAccountApplication(applicationNumber)
}

onMounted(async () => {
  loading.value = true

  applicationId = route.params.applicationId as string

  await fetchApplication(applicationId)

  loading.value = false
})

const registration = computed(
  (): ApiHostApplication |
    ApiBasePlatformRegistration |
    ApiBaseStrataApplication |
    undefined => application.value?.registration
)

</script>

<template>
  <div v-if="loading" class="w-full justify-center p-14">
    Loading...
  </div>
  <div v-else-if="application" class="pb-5">
    <ApplicationInfoHeader
      class="mb-4"
      :application="application"
    />
    <HostDetailsView
      v-if="registration?.registrationType === ApplicationType.HOST"
      :application="application"
      @approve-application="approveApplicationHandler()"
      @reject-application="rejectApplicationHandler()"
    />

    <PlatformDetailsView
      v-if="registration?.registrationType === ApplicationType.PLATFORM"
      :application="application"
    />

    <StrataHotelDetailsView
      v-if="registration?.registrationType === ApplicationType.STRATA_HOTEL"
      :application="application"
    />
  </div>
</template>

<style scoped>
dl>dt {
  @apply font-bold text-black
}
</style>
