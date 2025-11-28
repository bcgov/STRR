<script setup lang="ts">

const exStore = useExaminerStore()
const { activeReg, isApplication } = storeToRefs(exStore)

const businessDetails = activeReg.value?.businessDetails
const strataExpansion = useStrataExpansion()

const attorney = businessDetails?.registeredOfficeOrAttorneyForServiceDetails || {}
const hasAttorneyAddress = attorney.mailingAddress ? Object.values(attorney.mailingAddress).some(Boolean) : false

</script>

<template>
  <div
    data-testid="strata-sub-header"
    class="app-inner-container"
  >
    <div class="grid grid-cols-4 gap-x-5 divide-x bg-white py-4 text-sm text-bcGovColor-midGray">
      <div
        data-testid="strata-primary-building"
        class="space-y-2"
      >
        <b>{{ $t('strr.label.primaryBuilding').toUpperCase() }}</b>
        <ConnectInfoWithIcon
          icon="i-mdi-map-marker-outline"
          :content="displayFullAddress(activeReg?.strataHotelDetails.location)"
        />
        <UButton
          v-if="activeReg?.strataHotelDetails.buildings.length > 0"
          :label="$t('strr.label.viewAllBuildings')"
          :padded="false"
          variant="link"
          @click="strataExpansion.openAllBuildings()"
        />
      </div>

      <div class="space-y-4 pl-5">
        <div
          data-testid="strata-business"
          class="space-y-2"
        >
          <b>{{ $t('strr.label.business').toUpperCase() }}</b>
          <ConnectInfoWithIcon
            icon="i-mdi-domain"
            class="whitespace-nowrap"
          >
            <UButton
              :label="businessDetails?.legalName"
              :padded="false"
              class="whitespace-normal text-left"
              variant="link"
              @click="strataExpansion.openBusiness()"
            />
          </ConnectInfoWithIcon>

          <ConnectInfoWithIcon
            icon="i-mdi-envelope-outline"
            :content="displayFullAddress(businessDetails.mailingAddress)"
          />
        </div>
        <div
          v-if="attorney.attorneyName || hasAttorneyAddress"
          data-testid="strata-attorney"
          class="space-y-2"
        >
          <b>{{ $t('strr.label.attorneyForService').toUpperCase() }}</b>
          <ConnectInfoWithIcon
            v-if="attorney.attorneyName"
            icon="i-mdi-domain"
            :content="attorney.attorneyName"
          />
          <ConnectInfoWithIcon
            v-if="hasAttorneyAddress"
            icon="i-mdi-map-marker-outline"
            :content="displayFullAddress(attorney.mailingAddress)"
          />
        </div>
      </div>

      <div class="space-y-4 pl-5">
        <div class="space-y-2">
          <!--Main Representative -->
          <b>{{ $t('strr.label.representative').toUpperCase() }}</b>
          <ConnectInfoWithIcon
            icon="i-mdi-account"
            class="whitespace-nowrap"
          >
            <UButton
              :label="displayContactFullName(activeReg?.strataHotelRepresentatives[0])"
              :padded="false"
              class="whitespace-normal text-left"
              variant="link"
              @click="strataExpansion.openIndividuals()"
            />
          </ConnectInfoWithIcon>

          <ConnectInfoWithIcon
            v-if="activeReg?.strataHotelRepresentatives[0]?.phoneNumber"
            icon="i-mdi-phone"
            :content="displayPhoneAndExt(activeReg?.strataHotelRepresentatives[0]?.phoneNumber)"
          />

          <ConnectInfoWithIcon
            icon="i-mdi-at"
            :content="activeReg?.strataHotelRepresentatives[0]?.emailAddress"
          />
        </div>
        <div v-if="activeReg?.strataHotelRepresentatives[1]" class="space-y-2">
          <!-- Second Representative if available -->
          <b>{{ $t('strr.label.secondaryRepresentative').toUpperCase() }}</b>
          <ConnectInfoWithIcon
            icon="i-mdi-account"
            class="whitespace-nowrap"
          >
            <UButton
              :label="displayContactFullName(activeReg?.strataHotelRepresentatives[1])"
              :padded="false"
              class="whitespace-normal text-left"
              variant="link"
              @click="strataExpansion.openIndividuals()"
            />
          </ConnectInfoWithIcon>
        </div>
        <div v-if="isApplication" class="space-y-2">
          <!-- Completing Party -->
          <b>{{ $t('strr.label.completingParty').toUpperCase() }}</b>
          <ConnectInfoWithIcon
            icon="i-mdi-account"
            class="whitespace-nowrap"
          >
            <UButton
              :label="displayContactFullName(activeReg?.completingParty)"
              :padded="false"
              class="whitespace-normal text-left"
              variant="link"
              @click="strataExpansion.openIndividuals()"
            />
          </ConnectInfoWithIcon>
        </div>
      </div>

      <div class="space-y-2 pl-5">
        <b>{{ $t('strr.label.additionalInformation').toUpperCase() }}</b>
        <div>
          <b>{{ $t('strr.label.numberOfRentalUnits') }}</b>
          {{ activeReg.strataHotelDetails.numberOfUnits }}
        </div>
        <div>
          <b>{{ $t('label.strataHotelCategory') }}:</b>
          {{ activeReg.strataHotelDetails.category
            ? $t(`strataHotelCategoryReview.${activeReg.strataHotelDetails.category}`)
            : $t('strataHotelCategoryReview.undefined')
          }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
