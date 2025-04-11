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

const confirmUnassignModal = ref<ConfirmModal | null>(null)

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
        } else if (confirmUnassignModal.value) {
          confirmUnassignModal.value.handleOpen(
            async () => { await handleUnassign(id) }
          )
        }
      },
      label: t('btn.unassign')
    }
  })
}

watch([() => activeHeader.value, () => isAssignedToUser.value], () => {
  updateAssignmentButtons()
}, { immediate: true })
</script>

<template>
  <ConfirmationModal
    ref="confirmUnassignModal"
    :is-open="false"
    :title="t('modal.unassign.title')"
    :message="t('modal.unassign.message')"
    :confirm-text="t('strr.label.unAssign')"
  />
</template>
