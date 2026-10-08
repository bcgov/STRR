<script setup lang="ts">
import { useFlags } from '~/composables/useFlags'

const {
  isApplication,
  activeReg,
  activeHeader,
  isEditingRentalUnit,
  isEditingRegistrationEmail,
  isAssignedToUser
} = storeToRefs(useExaminerStore())

const {
  openEditRentalUnitForm,
  openEditRegistrationEmailForm,
  checkAndPerformAction,
  openHostOwners,
  openFilingHistory
} = useHostExpansion()
const { t } = useNuxtApp().$i18n
const alertFlags = reactive(useFlags())
const { isEmailFailed, failureReason, failedEvent } = useEmailDeliveryStatus(
  () => activeReg.value?.primaryContact?.emailAddress
)
const { isFeatureEnabled } = useFeatureFlags()
const canEditApplicationAddress = isFeatureEnabled('enable-examiner-edit-address-application')
const { isSnapshotRoute } = useExaminerRoute()

const isEditAddressDisabled = computed((): boolean => activeReg.value.status === RegistrationStatus.CANCELLED)

const additionalContacts = computed(() => {
  const items: Array<{
    type: HostContactType
    icon: string
    label: string | undefined
    testId: string
  }> = []

  if (activeReg.value?.secondaryContact) {
    items.push({
      type: 'secondaryContact',
      icon: 'i-mdi-account-multiple-outline',
      label: activeReg.value.secondaryContact.contactType === OwnerType.BUSINESS
        ? activeReg.value.secondaryContact.businessLegalName
        : displayContactFullName(activeReg.value.secondaryContact),
      testId: 'edit-secondary-contact-email'
    })
  }

  if (activeReg.value?.propertyManager?.propertyManagerType) {
    items.push({
      type: 'propertyManager',
      icon: 'i-mdi-at',
      label: activeReg.value.propertyManager.propertyManagerType === OwnerType.INDIVIDUAL
        ? displayContactFullName(activeReg.value.propertyManager.contact)
        : activeReg.value.propertyManager.business?.legalName,
      testId: 'edit-property-manager-email'
    })
  }

  return items
})

</script>
<template>
  <div
    data-testid="host-sub-header"
    class="app-inner-container"
  >
    <div class="grid grid-cols-4 gap-x-5 divide-x py-4 text-sm text-bcGovColor-midGray">
      <div
        id="rental-unit-details"
        class="space-y-2"
      >
        <div class="flex items-center justify-between gap-2">
          <strong>{{ t('strr.label.rentalUnit').toUpperCase() }}</strong>
          <UButton
            v-if="(!isApplication || canEditApplicationAddress) && !isSnapshotRoute"
            variant="link"
            size="xs"
            color="blue"
            :disabled="isEditingRentalUnit || !isAssignedToUser || isEditAddressDisabled"
            data-testid="edit-rental-unit-button"
            :aria-label="t('strr.label.editRentalUnit')"
            class="flex items-center gap-1"
            @click="checkAndPerformAction(openEditRentalUnitForm)"
          >
            <UIcon name="i-mdi-pencil-outline" class="size-4" />
            {{ t('btn.edit') }}
          </UButton>
        </div>
        <div class="w-[150px]">
          <UIcon name="i-mdi-map-marker-outline" />
          {{ displayFullUnitAddress(activeReg.unitAddress) }}
        </div>
        <div
          v-if="activeHeader?.organizationName ||
            activeReg.strRequirements?.organizationNm ||
            activeReg.unitDetails?.jurisdiction"
        >
          <UIcon name="i-mdi-map-outline" />
          {{ isApplication ? activeReg.strRequirements.organizationNm : activeReg.unitDetails?.jurisdiction }}
        </div>
        <div
          v-if="alertFlags.isUnitNumberMissing"
          class="font-bold text-red-600"
        >
          {{ t('strr.alertFlags.unitNumberMissing') }}
        </div>
      </div>

      <div
        id="host-details"
        class="space-y-2 pl-5"
      >
        <div class="flex items-center justify-between gap-2">
          <strong>{{ t('strr.label.host').toUpperCase() }}</strong>
          <UButton
            v-if="!isApplication && !isSnapshotRoute"
            variant="link"
            size="xs"
            color="blue"
            :disabled="isEditingRegistrationEmail || !isAssignedToUser"
            data-testid="edit-registration-email"
            :aria-label="t(HOST_CONTACT_EMAIL_I18N_KEYS.primaryContact.title)"
            class="flex items-center gap-1"
            @click="checkAndPerformAction(() => openEditRegistrationEmailForm('primaryContact'))"
          >
            <UIcon name="i-mdi-pencil-outline" class="size-4" />
            {{ t('btn.edit') }}
          </UButton>
        </div>
        <div class="w-[150px]">
          <UIcon name="i-mdi-map-marker-outline" />
          {{ displayFullAddress(activeReg.primaryContact?.mailingAddress) }}
        </div>
        <div class="flex gap-1">
          <UIcon name="i-mdi-account" class="size-5 shrink-0 text-gray-700" />
          <UButton
            :label="displayContactFullName(activeReg.primaryContact!)"
            :padded="false"
            class="w-full whitespace-normal text-left"
            variant="link"
            @click="checkAndPerformAction(() => openHostOwners('primaryContact'))"
          />
        </div>
        <div class="flex items-center gap-1">
          <UIcon name="i-mdi-at" :class="{ 'text-red-600': isEmailFailed }" />
          <UTooltip
            v-if="isEmailFailed"
            :text="failureReason
              ? `${t('strr.alertFlags.emailDeliveryFailed')}: ${failureReason}`
              : t('strr.alertFlags.emailDeliveryFailedTooltip')"
          >
            <UButton
              variant="link"
              color="red"
              :padded="false"
              class="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700 hover:underline"
              data-testid="email-failed-badge"
              :aria-label="t('strr.alertFlags.emailDeliveryFailed')"
              @click="checkAndPerformAction(() => openFilingHistory(failedEvent || undefined))"
            >
              <span>{{ activeReg.primaryContact?.emailAddress }}</span>
              <UIcon name="i-mdi-alert-circle" class="size-4 shrink-0 text-red-600" />
            </UButton>
          </UTooltip>
          <span v-else>
            {{ activeReg.primaryContact?.emailAddress }}
          </span>
        </div>
        <div v-if="activeReg.primaryContact?.contactType" class="flex gap-x-1">
          <strong>{{ t('strr.label.hostType') }}</strong>
          {{ t(`ownerType.${activeReg.primaryContact?.contactType}`) }}
        </div>
        <div>
          <strong>{{ t('strr.label.ownerRenter') }}</strong>
          {{
            activeReg.unitDetails?.hostType
              ? t(`hostType.${activeReg.unitDetails?.hostType}`)
              : t(`ownershipType.${activeReg.unitDetails.ownershipType}`)
          }}
        </div>
      </div>

      <div
        id="home-details"
        class="space-y-2 pl-5"
      >
        <div>
          {{ t(`propertyType.${activeReg.unitDetails?.propertyType}`) }}
        </div>
        <div v-if="activeReg.unitDetails?.numberOfRoomsForRent">
          {{ t(`rentalUnitType.${activeReg.unitDetails?.rentalUnitSpaceType}`) }}
          ({{
            activeReg.unitDetails?.numberOfRoomsForRent + ' ' +
              t('strr.label.room', activeReg.unitDetails?.numberOfRoomsForRent)
          }})
        </div>
        <div>
          {{
            activeReg.unitDetails?.rentalUnitSetupOption
              ? t(`rentalUnitSetupOption.${activeReg.unitDetails?.rentalUnitSetupOption}`)
              : t(`hostResidence.${activeReg.unitDetails.hostResidence}`)
          }}
        </div>
        <div v-if="activeReg.unitDetails?.parcelIdentifier">
          <strong>{{ t('strr.label.pid') }}</strong> {{ activeReg.unitDetails?.parcelIdentifier }}
        </div>
        <div v-if="isApplication" class="flex gap-x-1">
          <strong>{{ t('strr.label.registeredRentals') }}</strong>
          {{ (activeHeader as ApplicationHeader)?.existingHostRegistrations }}
        </div>
        <!-- TODO: Get number of PR registered rentals -->
        <!-- <div>
          <strong>{{ t('strr.label.prRegisteredRentals') }}</strong>
        </div> -->
      </div>

      <div
        id="additional-details"
        class="space-y-2 pl-5"
      >
        <div
          v-for="contact in additionalContacts"
          :key="contact.type"
          class="flex items-start justify-between gap-2"
        >
          <div class="flex min-w-0 gap-1">
            <UIcon :name="contact.icon" class="size-5 shrink-0 text-gray-700" />
            <UButton
              :label="contact.label"
              :padded="false"
              class="min-w-0 shrink whitespace-normal text-left"
              variant="link"
              @click="checkAndPerformAction(() => openHostOwners(contact.type))"
            />
          </div>
          <UButton
            v-if="!isApplication && !isSnapshotRoute"
            variant="link"
            size="xs"
            color="blue"
            :disabled="isEditingRegistrationEmail || !isAssignedToUser"
            :data-testid="contact.testId"
            :aria-label="t(HOST_CONTACT_EMAIL_I18N_KEYS[contact.type].title)"
            class="flex shrink-0 items-center gap-1"
            @click="checkAndPerformAction(() => openEditRegistrationEmailForm(contact.type))"
          >
            <UIcon name="i-mdi-pencil-outline" class="size-4" />
            {{ t('btn.edit') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
