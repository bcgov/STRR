<script setup lang="ts">

const props = defineProps<{ application: StrataApplicationResp }>()

const { registration } = props.application
const { businessDetails } = registration

const strataExpansion = useStrataExpansion(props.application)

</script>

<template>
  <div class="app-inner-container">
    <div class="grid grid-cols-4 gap-x-5 divide-x bg-white py-4 text-sm text-bcGovColor-midGray">
      <div class="space-y-2">
        <b>{{ $t('strr.label.primaryBuilding').toUpperCase() }}</b>
        <ConnectInfoWithIcon
          icon="i-mdi-map-marker-outline"
          :content="displayFullAddress(registration?.strataHotelDetails.buildings[0])"
        />
        <UButton
          v-if="registration?.strataHotelDetails.buildings.length > 1"
          :label="$t('strr.label.viewAllBuildings')"
          :padded="false"
          variant="link"
          @click="strataExpansion.openAllBuildings()"
        />
      </div>

      <div class="space-y-4 pl-5">
        <div class="space-y-2">
          <b>{{ $t('strr.label.business').toUpperCase() }}</b>
          <ConnectInfoWithIcon
            icon="i-mdi-domain"
            class="whitespace-nowrap"
          >
            <UButton
              :label="businessDetails?.legalName"
              :padded="false"
              variant="link"
              @click="strataExpansion.openBusiness()"
            />
          </ConnectInfoWithIcon>

          <ConnectInfoWithIcon
            icon="i-mdi-envelope-outline"
            :content="displayFullAddress(businessDetails.mailingAddress)"
          />
        </div>
        <div class="space-y-2">
          <b>{{ $t('strr.label.attorneyForService').toUpperCase() }}</b>
          <ConnectInfoWithIcon
            v-if="businessDetails.registeredOfficeOrAttorneyForServiceDetails.attorneyName"
            icon="i-mdi-domain"
            :content="businessDetails.registeredOfficeOrAttorneyForServiceDetails.attorneyName"
          />
          <ConnectInfoWithIcon
            icon="i-mdi-map-marker-outline"
            :content="displayFullAddress(businessDetails.registeredOfficeOrAttorneyForServiceDetails.mailingAddress)"
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
              :label="displayContactFullName(registration?.strataHotelRepresentatives[0])"
              :padded="false"
              variant="link"
              @click="strataExpansion.openIndividuals()"
            />
          </ConnectInfoWithIcon>

          <ConnectInfoWithIcon
            v-if="registration?.strataHotelRepresentatives[0]?.phoneNumber"
            icon="i-mdi-phone"
            :content="displayPhoneAndExt(registration?.strataHotelRepresentatives[0]?.phoneNumber)"
          />

          <ConnectInfoWithIcon
            icon="i-mdi-at"
            :content="registration?.strataHotelRepresentatives[0]?.emailAddress"
          />
        </div>
        <div v-if="registration?.strataHotelRepresentatives[1]" class="space-y-2">
          <!-- Second Representative if available -->
          <b>{{ $t('strr.label.secondaryRepresentative').toUpperCase() }}</b>
          <ConnectInfoWithIcon
            icon="i-mdi-account"
            class="whitespace-nowrap"
          >
            <UButton
              :label="displayContactFullName(registration?.strataHotelRepresentatives[1])"
              :padded="false"
              variant="link"
              @click="strataExpansion.openIndividuals()"
            />
          </ConnectInfoWithIcon>
        </div>
        <div class="space-y-2">
          <!-- Completing Party -->
          <b>{{ $t('strr.label.completingParty').toUpperCase() }}</b>
          <ConnectInfoWithIcon
            icon="i-mdi-account"
            class="whitespace-nowrap"
          >
            <UButton
              :label="displayContactFullName(registration?.completingParty)"
              :padded="false"
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
          {{ registration.strataHotelDetails.numberOfUnits }}
        </div>
        <div>
          <b>{{ $t('label.strataHotelCategory') }}:</b>
          {{ $t(`strataHotelCategoryReview.${registration.strataHotelDetails.category}`) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
