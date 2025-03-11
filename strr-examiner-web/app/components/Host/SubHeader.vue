<script setup lang="ts">
import { useFlags } from '~/composables/useFlags'

const exStore = useExaminerStore()
const { isApplication, activeReg, activeHeader } = storeToRefs(exStore)
const existingHostRegistrations = isApplication.value
  ? activeHeader.value.existingHostRegistrations
  : undefined
const { t } = useI18n()
const alertFlags = reactive(useFlags())

const hostExp = useHostExpansion()
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
        <strong>{{ t('strr.label.rentalUnit').toUpperCase() }}</strong>
        <div class="w-[150px]">
          <UIcon name="i-mdi-map-marker-outline" />
          {{ displayFullUnitAddress(activeReg.unitAddress) }}
          <AlertFlag
            v-if="alertFlags.isUnitNumberMissing"
            data-testid="flag-unit-number-missing"
          />
        </div>
        <div v-if="activeReg.strRequirements?.organizationNm">
          <UIcon name="i-mdi-map-outline" />
          {{ activeReg.strRequirements.organizationNm }}
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
        <div class="flex items-center gap-1">
          <UIcon name="i-mdi-account" class="size-5 shrink-0 text-gray-700" />
          <UButton
            :label="displayContactFullName(activeReg.primaryContact!)"
            :padded="false"
            variant="link"
            @click="hostExp.openHostOwners('primaryContact')"
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
          {{ t(`ownershipType.${activeReg.unitDetails?.ownershipType}`) }}
        </div>
      </div>

      <div class="space-y-2 pl-5">
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
          {{ t(`hostResidence.${activeReg.unitDetails?.hostResidence}`) }}
          <AlertFlag
            v-if="isApplication && alertFlags.isNotSameProperty"
            :tooltip-text="t('strr.alertFlags.hostAddressNotSame')"
            data-testid="flag-host-address-not-same"
          />
        </div>
        <div><strong>{{ t('strr.label.pid') }}</strong> {{ activeReg.unitDetails?.parcelIdentifier }}</div>
        <div v-if="isApplication" class="flex gap-x-1">
          <strong>{{ t('strr.label.registeredRentals') }}</strong>
          {{ existingHostRegistrations }}
          <AlertFlag
            v-if="alertFlags.isRegLimitExceeded"
            :tooltip-text="t('strr.alertFlags.exceedsRegistrationLimit')"
            data-testid="flag-exceeds-reg-limit"
          />
        </div>
        <div>
          <strong>{{ t('strr.label.prRegisteredRentals') }}</strong>
          <!-- TODO: Get number of PR registered rentals -->
        </div>
      </div>

      <div
        id="additional-details"
        class="space-y-2 pl-5"
      >
        <div v-if="activeReg?.secondaryContact" class="flex items-center gap-1">
          <UIcon name="i-mdi-account-multiple-outline" class="size-5 shrink-0 text-gray-700" />
          <UButton
            :label="activeReg?.secondaryContact?.contactType === OwnerType.BUSINESS
              ? activeReg?.secondaryContact?.businessLegalName
              : displayContactFullName(activeReg?.secondaryContact)"
            :padded="false"
            variant="link"
            @click="hostExp.openHostOwners('secondaryContact')"
          />
        </div>

        <div v-if="activeReg?.propertyManager?.propertyManagerType" class="flex items-center gap-1">
          <UIcon name="i-mdi-at" class="size-5 shrink-0 text-gray-700" />
          <UButton
            :label="activeReg?.propertyManager?.propertyManagerType === OwnerType.INDIVIDUAL
              ? displayContactFullName(activeReg?.propertyManager.contact)
              : activeReg?.propertyManager?.business?.legalName"
            :padded="false"
            variant="link"
            @click="hostExp.openHostOwners('propertyManager')"
          />
        </div>
      </div>
    </div>
  </div>
</template>
