<script setup lang="ts">
import { useFlags } from '~/composables/useFlags'

const {
  isApplication,
  activeReg,
  activeHeader,
  isEditingRentalUnit,
  isAssignedToUser
} = storeToRefs(useExaminerStore())
const { openEditRentalUnitForm } = useHostExpansion()
const { t } = useI18n()
const alertFlags = reactive(useFlags())
const { isFeatureEnabled } = useFeatureFlags()
const canEditApplicationAddress = isFeatureEnabled('enable-examiner-edit-address-application')
const { checkAndPerformAction, openHostOwners } = useHostExpansion()

const isEditAddressDisabled = computed((): boolean => activeReg.value.status === RegistrationStatus.CANCELLED)

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
            v-if="!isApplication || canEditApplicationAddress"
            variant="link"
            size="xs"
            color="blue"
            :disabled="isEditingRentalUnit || !isAssignedToUser || isEditAddressDisabled"
            data-testid="edit-rental-unit-button"
            :aria-label="t('strr.label.editRentalUnit')"
            class="flex items-center gap-1"
            @click="openEditRentalUnitForm"
          >
            <UIcon name="i-mdi-pencil-outline" class="size-4" />
            {{ t('btn.edit') }}
          </UButton>
        </div>
        <div class="w-[150px]">
          <UIcon name="i-mdi-map-marker-outline" />
          {{ displayFullUnitAddress(activeReg.unitAddress) }}
          <AlertFlag
            v-if="alertFlags.isUnitNumberMissing"
            data-testid="flag-unit-number-missing"
          />
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
        <strong>{{ t('strr.label.host').toUpperCase() }}</strong>
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
        <div>
          <UIcon name="i-mdi-at" />
          {{ activeReg.primaryContact?.emailAddress }}
        </div>
        <div v-if="activeReg.primaryContact?.contactType" class="flex gap-x-1">
          <strong>{{ t('strr.label.hostType') }}</strong>
          {{ t(`ownerType.${activeReg.primaryContact?.contactType}`) }}
          <AlertFlag
            v-if="alertFlags.isHostTypeBusiness"
            :tooltip-text="t('strr.alertFlags.hostIsBusiness')"
            data-testid="flag-host-business"
          />
        </div>
        <div>
          <strong>{{ t('strr.label.ownerRenter') }}</strong>
          {{
            activeReg.unitDetails?.ownershipType
              ? t(`ownershipType.${activeReg.unitDetails.ownershipType}`)
              : t(`hostType.${activeReg.unitDetails?.hostType}`)
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
            activeReg.unitDetails?.hostResidence
              ? t(`hostResidence.${activeReg.unitDetails.hostResidence}`)
              : t(`rentalUnitSetupOption.${activeReg.unitDetails?.rentalUnitSetupOption}`)
          }}
          <AlertFlag
            v-if="isApplication && alertFlags.isNotSameProperty"
            :tooltip-text="t('strr.alertFlags.hostAddressNotSame')"
            data-testid="flag-host-address-not-same"
          />
        </div>
        <div v-if="activeReg.unitDetails?.parcelIdentifier">
          <strong>{{ t('strr.label.pid') }}</strong> {{ activeReg.unitDetails?.parcelIdentifier }}
        </div>
        <div v-if="isApplication" class="flex gap-x-1">
          <strong>{{ t('strr.label.registeredRentals') }}</strong>
          {{ (activeHeader as ApplicationHeader)?.existingHostRegistrations }}
          <AlertFlag
            v-if="alertFlags.isRegLimitExceeded"
            :tooltip-text="t('strr.alertFlags.exceedsRegistrationLimit')"
            data-testid="flag-exceeds-reg-limit"
          />
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
        <div v-if="activeReg?.secondaryContact" class="flex gap-1">
          <UIcon name="i-mdi-account-multiple-outline" class="size-5 shrink-0 text-gray-700" />
          <UButton
            :label="activeReg?.secondaryContact?.contactType === OwnerType.BUSINESS
              ? activeReg?.secondaryContact?.businessLegalName
              : displayContactFullName(activeReg?.secondaryContact)"
            :padded="false"
            class="w-full whitespace-normal text-left"
            variant="link"
            @click="checkAndPerformAction(() => openHostOwners('secondaryContact'))"
          />
        </div>

        <div v-if="activeReg?.propertyManager?.propertyManagerType" class="flex gap-1">
          <UIcon name="i-mdi-at" class="size-5 shrink-0 text-gray-700" />
          <UButton
            :label="activeReg?.propertyManager?.propertyManagerType === OwnerType.INDIVIDUAL
              ? displayContactFullName(activeReg?.propertyManager.contact)
              : activeReg?.propertyManager?.business?.legalName"
            :padded="false"
            class="w-full whitespace-normal text-left"
            variant="link"
            @click="checkAndPerformAction(() => openHostOwners('propertyManager'))"
          />
        </div>
      </div>
    </div>
  </div>
</template>
