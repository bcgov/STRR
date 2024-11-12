<template>
  <div data-test-id="listing-details-page">
    <BcrosTypographyH1
      :text="tApplicationConfirm('submitted')"
      data-test-id="account-page-title"
      class="mobile:pb-[20px] mobile:mx-[8px] pb-[32px]"
    />
    <div class="bg-white py-[22px] px-[30px] flex flex-row mobile:px-[8px] mobile:[py-16px] mobile:flex-col">
      <img
        class="self-start mr-[10px] mt-[2px] mobile:[mb-8px]"
        src="/icons/create-account/check_circle.svg"
        :alt="tApplicationConfirm('altTextConfirm')"
      >
      <div>
        <p class="mb-[24px] mobile:[mb-8px]">
          {{ tApplicationConfirm('submittedForProperty') }}
        </p>
        <p class="mb-[24px] font-bold">
          {{
            fetchedRegistration?.unitAddress
              ? `${fetchedRegistration.unitAddress.streetNumber} ${
                fetchedRegistration.unitAddress.streetName
              }${
                fetchedRegistration.unitAddress.unitNumber
                  ? `, ${fetchedRegistration.unitAddress.unitNumber}`
                  : ''
              }`
              : '-'
          }}
        </p>
        <p class="mobile:mb-[24px]">
          {{ tApplicationConfirm('teamWillReview') }}
        </p>
      </div>
    </div>
    <div class="mobile:mx-[8px]">
      <BcrosTypographyH2 :text="tApplicationConfirm('links')" class="mt-[32px] text-[18px] mb-[24px]" />
      <p class="mb-[24px]">
        <!-- eslint-disable-next-line max-len -->
        <a @click="navigateTo('/application-status')">{{ tApplicationConfirm('status') }}</a> {{ tApplicationConfirm('dashboard') }}
      </p>
      <p class="mb-[24px]">
        {{ tApplicationConfirm('haveAnotherProperty') }}
      </p>
      <BcrosButtonsPrimary
        :label="tApplicationConfirm('startNewApplication')"
        :action="() => navigateTo('/create-account')"
        class-name="font-bold"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'

const route = useRoute()
const fetchedRegistration = ref()
const { t } = useTranslation()
const tApplicationConfirm = (translationKey: string) => t(`createAccount.applicationConfirm.${translationKey}`)

const listingId = route.params.listingId

const apiURL = useRuntimeConfig().public.strrApiURL
const axiosInstance = addAxiosInterceptors(axios.create())

axiosInstance.get(`${apiURL}/registrations`)
  .then((res) => {
    res.data.forEach((registration: any) => {
      if (registration.id.toString() === listingId.toString()) {
        fetchedRegistration.value = registration
      }
    })
  })

</script>
