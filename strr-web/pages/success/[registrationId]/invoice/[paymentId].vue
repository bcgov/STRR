<template>
  <div data-test-id="invoice-page">
    <BcrosTypographyH1
      :text="tApplicationConfirm('submitted')"
      data-test-id="account-page-title"
      class="mobile:pb-5 mobile:mx-2 pb-8"
    />
    <div class="bg-white py-[22px] px-[30px] flex flex-row mobile:px-2 mobile:[py-16px] mobile:flex-col">
      <img
        class="self-start mr-[10px] mt-[2px] mobile:[mb-8px]"
        src="/icons/create-account/check_circle.svg"
        :alt="tApplicationConfirm('altTextConfirm')"
      >
      <div>
        <p class="mb-6 mobile:[mb-8px]">
          {{ tApplicationConfirm('submittedForProperty') }}
        </p>
        <p class="mb-6 font-bold">
          {{
            (fetchedApplication && fetchedApplication?.registration?.unitAddress)
              ? `${fetchedApplication.registration.unitAddress.streetNumber} ${
                fetchedApplication.registration.unitAddress.streetName
              }${
                fetchedApplication.registration.unitAddress.unitNumber
                  ? `, ${fetchedApplication.registration.unitAddress.unitNumber}`
                  : ''
              }`
              : '-'
          }}
        </p>
        <p class="mobile:mb-6">
          {{ tApplicationConfirm('teamWillReview') }}
        </p>
      </div>
    </div>
    <div class="mobile:mx-2">
      <BcrosTypographyH2 :text="tApplicationConfirm('links')" class="mt-8 text-[18px] mb-6" />
      <p class="mb-6">
        <!-- eslint-disable-next-line max-len -->
        <a @click="navigateTo('/application-status')">{{ tApplicationConfirm('status') }}</a> {{ tApplicationConfirm('dashboard') }}
      </p>
      <p class="mb-6">
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

const route = useRoute()
const fetchedApplication = ref()
const { t } = useTranslation()
const tApplicationConfirm = (translationKey: string) => t(`createAccount.applicationConfirm.${translationKey}`)

const { getApplication } = useApplications()
const { createInvoiceRecord } = useFees()

const { registrationId, paymentId } = route.params

onMounted(async () => {
  fetchedApplication.value = await getApplication(registrationId.toString())
  createInvoiceRecord(paymentId.toString(), registrationId.toString())
})

</script>
