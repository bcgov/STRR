<template>
  <div data-test-id="account-select-page">
    <BcrosTypographyH1
      :text="tRegistrationStatus('title')"
      data-test-id="accountPageTitle"
      class="pb-[32px] mobile:pb-[24px]"
    />
    <div>
      <div class="flex flex-row justify-between">
        <BcrosTypographyH2
          class="mobile:pt-[0px]"
          :text="`${tRegistrationStatus('myRegApplication')} (${applicationsCount})`"
        />
        <BcrosButtonsPrimary
          :label="tRegistrationStatus('create')"
          :action="() => navigateTo('/create-account')"
          icon="i-mdi-plus"
          class-name="mobile:hidden"
        />
      </div>
      <div class="flex flex-row mobile:flex-col flex-wrap">
        <div
          v-for="(application, index) in applications"
          :key="application?.header.id"
          :class="[
            (applications && applications?.length > 1) ? 'desktop:w-[calc(33.33%)]' : 'desktop:w-full flex-grow flex-1',
            'flex flex-row mobile:flex-col'
          ]"
        >
          <BcrosStatusCard
            v-if="application"
            :application-header="application.header"
            :is-single="!(applications && applications?.length > 1)"
            :class="{'mr-6': (index + 1) % 3 !== 0}"
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
    <div class="w-full h-[120px] desktop:hidden flex justify-center items-center">
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
  layout: 'wide-no-space'
})

/**
 * Default sorting order for applications
 */
const applicationStatusPriority: any = {
  [ApplicationStatusE.REJECTED]: 4,
  [ApplicationStatusE.APPROVED]: 3,
  [ApplicationStatusE.SUBMITTED]: 2
}

const tRegistrationStatus = (translationKey: string) => useTranslation().t(`registrationStatus.${translationKey}`)

const { getApplications } = useApplications()
const applications = ref<(ApplicationI | undefined)[]>()
const res = await getApplications()

if (res.total === 0) {
  navigateTo('/create-account')
}

applications.value = res.applications
  .sort(
    (a: ApplicationI, b: ApplicationI) =>
      applicationStatusPriority[a.header.status] ?? 1 - applicationStatusPriority[b.header.status] ?? 1
  )
  .sort((a: ApplicationI, b: ApplicationI) =>
    a.registration.unitAddress.city.localeCompare(b.registration.unitAddress.city)
  )
const applicationsCount = applications.value?.length || 0
</script>
