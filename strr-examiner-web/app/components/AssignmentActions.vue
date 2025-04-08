<script setup lang="ts">
const { t } = useI18n()
const { assignApplication, unassignApplication, isCurrentUserAssignee } = useExaminerStore()
const { activeHeader } = storeToRefs(useExaminerStore())
const { updateRouteAndButtons } = useExaminerRoute()

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
  await assignApplication(applicationNumber)
  emit('refresh')
}

const handleUnassign = async (applicationNumber: string) => {
  await unassignApplication(applicationNumber)
  emit('refresh')
}

const updateAssignmentButtons = () => {
  if (!activeHeader.value?.applicationNumber) { return }
  updateRouteAndButtons(RoutesE.EXAMINE, {
    assign: {
      action: async (id: string) => {
        await handleAssign(id)
      },
      label: t('btn.assign')
    },
    unassign: {
      action: async (id: string) => {
        // Check assignee status on btn click
        const isAssignee = await isCurrentUserAssignee(id)
        if (isAssignee) {
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
