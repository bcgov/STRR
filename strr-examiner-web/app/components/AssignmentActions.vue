<script setup lang="ts">
const { t } = useI18n()
const { assignApplication, unassignApplication } = useExaminerStore()
const { activeHeader, isAssignedToUser } = storeToRefs(useExaminerStore())
const { updateRouteAndButtons } = useExaminerRoute()
const props = defineProps({
  isRegistrationPage: {
    type: Boolean,
    default: false
  }
})

const {
  showConfirmModal,
  modalTitle,
  modalMessage,
  confirmButtonText,
  cancelButtonText,
  openConfirmModal,
  closeConfirmModal,
  handleConfirm
} = useConfirmationModal()

const emit = defineEmits(['refresh'])

const handleAssign = async (applicationNumber: string) => {
  const appNum = props.isRegistrationPage ? activeHeader.value!.applicationNumber! : applicationNumber
  await assignApplication(appNum)
  emit('refresh')
}

const handleUnassign = async (applicationNumber: string) => {
  const appNum = props.isRegistrationPage ? activeHeader.value!.applicationNumber! : applicationNumber
  await unassignApplication(appNum)
  emit('refresh')
}

const updateAssignmentButtons = () => {
  if (!activeHeader.value?.applicationNumber) { return }
  const route = props.isRegistrationPage ? RoutesE.REGISTRATION : RoutesE.EXAMINE
  updateRouteAndButtons(route, {
    assign: {
      action: async (id: string) => {
        await handleAssign(id)
      },
      label: t('btn.assign')
    },
    unassign: {
      action: async (id: string) => {
        // Check assignee status on btn click
        if (isAssignedToUser.value) {
          await handleUnassign(id)
        } else {
          openConfirmModal({
            title: t('modal.unassign.title'),
            message: t('modal.unassign.message'),
            confirmText: t('strr.label.unAssign'),
            onConfirm: async () => {
              await handleUnassign(id)
              closeConfirmModal()
            }
          })
        }
      },
      label: t('btn.unassign')
    }
  }, true)
}

watch(() => activeHeader.value, () => {
  updateAssignmentButtons()
}, { immediate: true })
</script>

<template>
  <ConfirmationModal
    :is-open="showConfirmModal"
    :title="modalTitle"
    :message="modalMessage"
    :confirm-button-text="confirmButtonText"
    :cancel-button-text="cancelButtonText"
    :on-confirm="handleConfirm"
    :on-cancel="closeConfirmModal"
  />
</template>
