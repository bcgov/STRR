<script setup lang="ts">
const { t } = useI18n();
import { refreshNuxtData } from 'nuxt/app'


const { decisionIntent } = useExaminerDecision()
const { activeHeader, activeReg, isAssignedToUser } = storeToRefs(useExaminerStore())
const { assignApplication, unassignApplication } = useExaminerStore()
const { openConfirmActionModal, close: closeConfirmActionModal } = useStrrModals()


const examinerActions = computed(() => activeHeader.value.examinerActions)

const actionButtons: ConnectBtnControlItem[] = [
  {
    action: () => {},
    label: ApplicationActionsE.APPROVE, // t('btn.approveApplication'),
    color: 'green',
    icon: 'i-mdi-check'
  },
  {
    action: () => {},
    label: ApplicationActionsE.SEND_NOC, // t('btn.sendNotice'),
    color: 'blue',
    icon: 'i-mdi-send'
  },
  {
    action: () => {},
    label:  ApplicationActionsE.REJECT, // t('btn.declineApplication'),
    color: 'red',
    icon: 'i-mdi-close'
  },
  {
    action: () => {},
    label: RegistrationActionsE.CANCEL, //t('btn.cancelRegistration'),
    color: 'red',
    icon: 'i-mdi-close'
  },
    {
    action: () => {},
    label: RegistrationActionsE.SUSPEND, // t('btn.suspendRegistration'),
    color: 'primary',
    icon: 'i-mdi-pause'
  }
]

const selectedAction = computed(() => 
    actionButtons.find(button => button.label === decisionIntent.value)
)
const emit = defineEmits(['refresh'])

const assign = async () => {
//   await assignApplication(activeHeader.value.applicationNumber)
//   emit('refresh')
refreshNuxtData()
}

const unassign = async () => {
    // Check assignee status on btn click
    if (isAssignedToUser.value) {
        // await unassignApplication(activeHeader.value.applicationNumber)
    } else {
        openConfirmActionModal(
            t('modal.unassign.title'),
            t('modal.unassign.message'),
            t('strr.label.unAssign'),
            async () => {
                closeConfirmActionModal()
                await unassignApplication(activeHeader.value.applicationNumber)
            }
        )
    }
    refreshNuxtData()
}

const sendNotice = () => {
    openConfirmActionModal(
        t('modal.sendNotice.title'),
        t('modal.sendNotice.message'),
        t('btn.yesSend'),
        () => {
          closeConfirmActionModal() // for smoother UX, close the modal before initiating the action
        }
    )
}

</script>

<template>
  <div class="bg-white py-10" data-testid="button-control">
    <div class="app-inner-container">
      {{ examinerActions }}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div class="flex justify-center gap-4 md:justify-start">
            <UButton
              v-if="examinerActions.includes(ApplicationActionsE.SET_ASIDE)"
              :label="t('btn.setAside')"
              variant="outline"
              icon="i-mdi-rotate-left"
              class="max-w-fit px-7 py-3"
              color="primary"
              :disabled="!isAssignedToUser"
              data-testid="action-button-set-aside"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-center gap-4 md:justify-end">
            <UButton
              v-if="activeHeader.reviewer.username"
              :label="t('btn.unassign')"
              class="max-w-fit px-7 py-3"
              data-testid="action-button-unassign"
              variant="ghost"
              @click="unassign"
            />
            <UButton
              v-else
              :label="t('btn.assign')"
              class="max-w-fit px-7 py-3"
              data-testid="action-button-assign"
              variant="outline"
              @click="assign"
            />

            <UButton
              v-if="!!decisionIntent"
              :label="t(`btn.${selectedAction?.label}`)"
              :color="selectedAction?.color || 'primary'"
              :icon="selectedAction?.icon"
              variant="outline"
              class="max-w-fit px-7 py-3"
              data-testid="button-control-right-button"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
