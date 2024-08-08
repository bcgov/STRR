<template>
  <div data-cy="account-select-page">
    <BcrosTypographyH1
      :text="tRegistrationStatus('title')"
      data-cy="accountPageTitle"
      class-name="mobile:mx-[8px] pb-[32px] mobile:pb-[24px]"
    />
    <div>
      <div class="px-[8px] flex flex-row justify-between">
        <BcrosTypographyH2 :text="tRegistrationStatus('myRegApplication')" class-name="mobile:pt-[0px]" />
        <BcrosButtonsPrimary
          :label="tRegistrationStatus('create')"
          :action="() => navigateTo('/create-account')"
          icon="i-mdi-plus"
          class-name="mobile:hidden"
        />
      </div>
      <div class="flex flex-row mobile:flex-col flex-wrap desktop:justify-between">
        <div
          v-for="application in applications"
          :key="application?.header.id"
          :class="`
            ${
            applications && applications?.length > 1
              ? 'desktop:w-[calc(33%-24px)]'
              : 'desktop:w-full flex-grow flex-1'
          }
            flex flex-row mobile:flex-col
          `"
        >
          <BcrosStatusCard
            v-if="application"
            :application-id="application.header.id.toString()"
            :flavour="getChipFlavour(application.header.status)"
            :status="application.header.status"
            :is-single="!(applications && applications?.length > 1)"
            :registration-number="application.header?.registrationId?.toString() ?? ''"
          >
            <div>
              <p class="font-bold">
                {{
                  application.registration.unitAddress.nickname ||
                    application.registration.unitAddress.address
                }}
              </p>
              <p>
                {{
                  application.registration.unitAddress.nickname
                    ? application.registration.unitAddress.address
                    : application.registration.unitAddress.addressLineTwo
                }}
              </p>
              <p>
                {{ application.registration.unitAddress.nickname
                  ? application.registration.unitAddress.addressLineTwo
                  : "" }}
              </p>
              <p>
                {{
                  `
                    ${application.registration.unitAddress.city}
                    ${application.registration.unitAddress.province}
                    ${application.registration.unitAddress.postalCode},
                    ${application.registration.unitAddress.country}
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
        :label="tRegistrationStatus('create')"
        :action="() => navigateTo('/create-account')"
        icon="i-mdi-plus"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ApplicationI } from '~/interfaces/application-i'

definePageMeta({
  layout: 'wide-gutters'
})

const tRegistrationStatus = (translationKey: string) => useTranslation().t(`registrationStatus.${translationKey}`)

const { getApplications } = useApplications()
const { getChipFlavour } = useChipFlavour()
const applications = ref<(ApplicationI | undefined)[]>()
applications.value = await getApplications()

</script>
