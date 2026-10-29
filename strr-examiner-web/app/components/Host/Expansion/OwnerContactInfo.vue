<script setup lang="ts">
const props = defineProps<{
  owner: HostOwner
  display: HostContactType
}>()

const exStore = useExaminerStore()
const {
  isApplication,
  isEditingRegistrationEmail,
  isAssignedToUser,
  filingHistoryEvents
} = storeToRefs(exStore)
const { openEditRegistrationEmailForm, checkAndPerformAction, openFilingHistory } = useHostExpansion()
const { isSnapshotRoute } = useExaminerRoute()

const { t } = useNuxtApp().$i18n

const editEmailAriaLabel = computed(() => t(HOST_CONTACT_EMAIL_I18N_KEYS[props.display].title))

const emailStatus = computed(() =>
  evaluateEmailDeliveryStatus(props.owner.emailAddress, filingHistoryEvents.value)
)

const formattedPhoneNumber = computed(() => {
  const phone = props.owner.phone
  if (!phone?.number) {
    return ''
  }
  const code = phone.countryCode ? `+${phone.countryCode}` : ''
  const number = phone.countryCode === '1'
    ? phone.number.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
    : phone.number
  const extension = phone.extension ? `Ext. ${phone.extension}` : ''
  return `${code} ${number} ${extension}`.replaceAll('  ', ' ').trim()
})
</script>

<template>
  <div class="space-y-3">
    <ConnectInfoWithIcon
      v-if="formattedPhoneNumber"
      icon="i-mdi-phone"
      :content="formattedPhoneNumber"
    />
    <ConnectInfoWithIcon
      v-if="owner.faxNumber"
      icon="i-mdi-fax"
      :content="owner.faxNumber"
    />
    <div v-if="owner.emailAddress" class="flex items-center gap-2">
      <div class="flex items-center gap-1">
        <UIcon
          name="i-mdi-at"
          :class="[
            'size-5 shrink-0',
            { 'text-red-600': emailStatus.isFailed }
          ]"
        />
        <UTooltip
          v-if="emailStatus.isFailed"
          :text="t('strr.alertFlags.emailDeliveryFailedTooltip')"
        >
          <UButton
            variant="link"
            color="red"
            :padded="false"
            class="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700 hover:underline"
            data-testid="owner-email-failed-badge"
            :aria-label="t('strr.alertFlags.emailDeliveryFailed')"
            @click="checkAndPerformAction(
              () => openFilingHistory(emailStatus.event || undefined)
            )"
          >
            <span>{{ owner.emailAddress }}</span>
            <UIcon name="i-mdi-alert-circle" class="size-4 shrink-0 text-red-600" />
          </UButton>
        </UTooltip>
        <span v-else>{{ owner.emailAddress }}</span>
      </div>
      <UButton
        v-if="!isApplication && !isSnapshotRoute"
        variant="link"
        size="xs"
        color="blue"
        :disabled="isEditingRegistrationEmail || !isAssignedToUser"
        data-testid="edit-owner-email-btn"
        :aria-label="editEmailAriaLabel"
        class="flex items-center gap-1"
        @click="checkAndPerformAction(() => openEditRegistrationEmailForm(props.display))"
      >
        <UIcon name="i-mdi-pencil-outline" class="size-4" />
        {{ $t('btn.edit') }}
      </UButton>
    </div>
  </div>
</template>
