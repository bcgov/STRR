<template>
  <div
    data-test-id="banner"
    class="flex justify-center bg-white absolute w-full top-0 left-0 min-h-[104px]
      shadow-md py-[30px] px-[70px] m:flex-col m:min-h-[116px] m:px-[8px]"
  >
    <div class="d:flex justify-between px-4 w-full max-w-[1360px]">
      <slot />
      <div v-if="userActions" class="flex gap-4">
        <div v-for="(action, index) in userActions" :key="index">
          <BcrosButtonsPrimary
            :label="t(`banner.${action}`)"
            variant="outline"
            :action="actionsMap[action as HostActionsE | ExaminerActionsE]"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { application = {} as ApplicationI } = defineProps<{
  application?: ApplicationI
}>()

const { t } = useTranslation()
const { issueCertificate } = useRegistrations()
const { approveApplication, rejectApplication } = useApplications()
const { handlePaymentRedirect } = useFees()
const { isExaminer } = storeToRefs(useBcrosKeycloak())

const appHeader: ApplicationHeaderI = application?.header

// determine user actions based on the role (examiner or host)
const userActions = computed(() => isExaminer.value ? appHeader?.examinerActions : appHeader?.hostActions)

// map of actions available for host and examiner
const actionsMap: Record<HostActionsE | ExaminerActionsE, () => void> = {
  [HostActionsE.SUBMIT_PAYMENT]: () => handlePaymentRedirect(appHeader?.paymentToken, appHeader?.applicationNumber),
  [ExaminerActionsE.ISSUE_CERTIFICATE]: () => issueCertificate(appHeader?.registrationId),
  [ExaminerActionsE.APPROVE]: () => approveApplication(appHeader?.applicationNumber),
  [ExaminerActionsE.REJECT]: () => rejectApplication(appHeader?.applicationNumber)
}

</script>
