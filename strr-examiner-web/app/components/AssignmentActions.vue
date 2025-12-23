<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const { assignApplication, unassignApplication, assignRegistration, unassignRegistration } = useExaminerStore()
const { activeHeader, activeReg, isAssignedToUser } = storeToRefs(useExaminerStore())
const { updateRouteAndButtons } = useExaminerRoute()
const { openConfirmActionModal, close: closeConfirmActionModal } = useStrrModals()

const props = defineProps({
  isRegistrationPage: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['refresh'])

const handleAssign = async (applicationNumber: string) => {
  if (props.isRegistrationPage) {
    await assignRegistration(activeReg.value!.id)
  } else {
    await assignApplication(applicationNumber)
  }
  emit('refresh')
}

const handleUnassign = async (applicationNumber: string) => {
  if (props.isRegistrationPage) {
    await unassignRegistration(activeReg.value!.id)
  } else {
    await unassignApplication(applicationNumber)
  }
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
          openConfirmActionModal(
            t('modal.unassign.title'),
            t('modal.unassign.message'),
            t('strr.label.unAssign'),
            async () => {
              closeConfirmActionModal()
              await handleUnassign(id)
            }
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
  <div />
</template>
