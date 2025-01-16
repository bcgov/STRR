<script setup lang="ts">
const props = defineProps<{ application: HostApplicationResp }>()
const reg = props.application.registration
// defineEmits<{
//   openExpansion: [OpenExpansionEvent]
// }>()

const { t } = useI18n()

const hostExp = useHostExpansion()
</script>
<template>
  <div class="app-inner-container">
    <div class="grid grid-cols-4 gap-x-5 divide-x py-4 text-sm text-bcGovColor-midGray">
      <div class="space-y-2">
        <strong>{{ t('strr.label.rentalUnit').toUpperCase() }}</strong>
        <div class="w-[150px]">
          <UIcon name="i-mdi-map-marker-outline" />
          {{ displayFullUnitAddress(reg.unitAddress) }}
        </div>
        <div v-if="reg.strRequirements?.organizationNm">
          <UIcon name="i-mdi-map-outline" />
          {{ reg.strRequirements.organizationNm }}
        </div>
      </div>

      <div class="space-y-2 pl-5">
        <strong>{{ t('strr.label.host').toUpperCase() }}</strong>
        <div class="w-[150px]">
          <UIcon name="i-mdi-map-marker-outline" />
          {{ displayFullAddress(reg.primaryContact?.mailingAddress) }}
        </div>
        <div class="flex items-center gap-1">
          <UIcon name="i-mdi-account" class="size-5 shrink-0 text-gray-700" />
          <UButton
            :label="displayContactFullName(reg.primaryContact!)"
            :padded="false"
            variant="link"
            @click="hostExp.openHostOwners(application, 'primaryContact')"
          />
          <!-- @click="$emit('openExpansion', [ExpansionItem.HOST_OWNERS, { display: 'primaryContact' }])" -->
        </div>
        <div>
          <UIcon name="i-mdi-at" />
          {{ reg.primaryContact?.emailAddress }}
        </div>
        <div>
          <strong>{{ t('strr.label.hostType') }}</strong>
          {{ t(`ownerType.${reg.primaryContact?.contactType}`) }}
        </div>
        <div>
          <strong>{{ t('strr.label.ownerRenter') }}</strong>
          {{ t(`ownershipType.${reg.unitDetails?.ownershipType}`) }}
        </div>
      </div>

      <div class="space-y-2 pl-5">
        <div>
          {{ t(`propertyType.${reg.unitDetails?.propertyType}`) }}
        </div>
        <div v-if="reg.unitDetails?.numberOfRoomsForRent">
          {{ t(`rentalUnitType.${reg.unitDetails?.rentalUnitSpaceType}`) }}
          (
          {{
            reg.unitDetails?.numberOfRoomsForRent + ' ' + t('strr.label.room', reg.unitDetails?.numberOfRoomsForRent)
          }}
          )
        </div>
        <div>{{ t(`hostResidence.${reg.unitDetails?.hostResidence}`) }}</div>
        <div><strong>{{ t('strr.label.pid') }}</strong> {{ reg.unitDetails?.parcelIdentifier }}</div>
        <div>
          <strong>{{ t('strr.label.registeredRentals') }}</strong>
          <!-- TODO: Get number of registered rentals -->
        </div>
        <div>
          <strong>{{ t('strr.label.prRegisteredRentals') }}</strong>
          <!-- TODO: Get number of PR registered rentals -->
        </div>
      </div>

      <div class="space-y-2 pl-5">
        <div v-if="reg?.secondaryContact" class="flex items-center gap-1">
          <UIcon name="i-mdi-account-multiple-outline" class="size-5 shrink-0 text-gray-700" />
          <UButton
            :label="reg?.secondaryContact?.contactType === OwnerType.INDIVIDUAL
              ? displayContactFullName(reg?.secondaryContact)
              : reg?.secondaryContact?.businessLegalName"
            :padded="false"
            variant="link"
            @click="hostExp.openHostOwners(application, 'secondaryContact')"
          />
          <!-- @click="$emit('openExpansion', [ExpansionItem.HOST_OWNERS, { display: 'secondaryContact' }])" -->
        </div>

        <div v-if="reg?.propertyManager?.propertyManagerType" class="flex items-center gap-1">
          <UIcon name="i-mdi-at" class="size-5 shrink-0 text-gray-700" />
          <UButton
            :label="reg?.propertyManager?.propertyManagerType === OwnerType.INDIVIDUAL
              ? displayContactFullName(reg?.propertyManager.contact)
              : reg?.propertyManager?.business?.legalName"
            :padded="false"
            variant="link"
            @click="hostExp.openHostOwners(application, 'propertyManager')"
          />
          <!-- @click="$emit('openExpansion', [ExpansionItem.HOST_OWNERS, { display: 'propertyManager' }])" -->
        </div>
      </div>
    </div>
  </div>
</template>
