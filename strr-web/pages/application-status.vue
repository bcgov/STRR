<template>
  <div data-cy="account-select-page">
    <BcrosTypographyH1
      :text="tRegistrationStatus('title')"
      data-cy="accountPageTitle"
      class="mobile:pb-[20px] mobile:mx-[8px] pb-[32px] mobile:pb-[24px]"
    />
    <div>
      <div class="px-[8px] flex flex-row justify-between">
        <BcrosTypographyH2 :text="tRegistrationStatus('my-app')" class-name="mobile:pt-[0px]" />
        <BcrosButtonsPrimary
          :text="tRegistrationStatus('create')"
          :action="() => navigateTo('/create-account')"
          icon="i-mdi-plus"
          class-name="mobile:hidden"
        />
      </div>
      <div class="flex flex-row mobile:flex-col flex-wrap desktop:justify-between">
        <div
          v-for="registration in registrations"
          :key="registration?.id"
          :class="`
            ${
            registrations && registrations?.length > 1
              ? 'desktop:w-[calc(33%-24px)]'
              : 'desktop:w-full flex-grow flex-1'
          }
            flex flex-row mobile:flex-col
          `"
        >
          <BcrosStatusCard
            v-if="registration"
            :flavour="getFlavour(registration.status, registration?.invoices)"
            :status="registration.status"
            :single="!(registrations && registrations?.length > 1)"
          >
            <div class="mb-[24px]">
              <p class="font-bold">
                {{
                  registration.unitAddress.nickname
                    ? registration.unitAddress.nickname
                    : registration.unitAddress.address
                }}
              </p>
              <p>
                {{
                  registration.unitAddress.nickname
                    ? registration.unitAddress.address
                    : registration.unitAddress.addressLineTwo
                }}
              </p>
              <p>
                {{ registration.unitAddress.nickname ? registration.unitAddress.addressLineTwo : "" }}
              </p>
              <p>
                {{
                  `
                    ${registration.unitAddress.city}
                    ${registration.unitAddress.province}
                    ${registration.unitAddress.postalCode},
                    ${registration.unitAddress.country}
                    `
                }}
              </p>
            </div>
          </BcrosStatusCard>
        </div>
      </div>
    </div>
    <div class="w-full h-[120px] bg-white desktop:hidden flex justify-center items-center p-[8px]">
      <BcrosButtonsPrimary
        :text="tRegistrationStatus('create')"
        :action="() => navigateTo('/create-account')"
        icon="i-mdi-plus"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertsFlavourE } from '#imports'

definePageMeta({
  layout: 'wide-gutters'
})

const t = useNuxtApp().$i18n.t
const tRegistrationStatus = (translationKey: string) => t(`registration-status.${translationKey}`)

const { getRegistrations } = useRegistrations()
const registrations = ref<(RegistrationI | undefined)[]>()
const fetchedRegistrations = await getRegistrations()

const addSpacingToRegistrations = (): (RegistrationI | undefined)[] => {
  const spacedRegistrations: (RegistrationI | undefined)[] =
    [...fetchedRegistrations.filter(reg => reg.invoices.length !== 0)]
  while (spacedRegistrations.length % 3 !== 0) {
    spacedRegistrations.push(undefined)
  }
  return spacedRegistrations
}

registrations.value =
  fetchedRegistrations.length % 3 === 0 &&
  fetchedRegistrations.length !== 1
    ? fetchedRegistrations
    : addSpacingToRegistrations()

const getFlavour = (status: string, invoices: RegistrationI['invoices']):
  { alert: AlertsFlavourE, text: string } | undefined => {
  if (status === 'PENDING' && invoices[0].payment_status_code === 'COMPLETED') {
    return {
      text: tRegistrationStatus('applied'),
      alert: AlertsFlavourE.APPLIED
    }
  }
  if (status === 'PENDING' && invoices[0].payment_status_code !== 'COMPLETED') {
    return {
      text: tRegistrationStatus('payment-due'),
      alert: AlertsFlavourE.WARNING
    }
  }
}

</script>
