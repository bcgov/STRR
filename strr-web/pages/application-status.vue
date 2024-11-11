<template>
  <div data-test-id="application-status-page">
    <BcrosTypographyH1
      :text="tRegistrationStatus('title')"
      data-test-id="account-page-title"
      class="pb-[32px] mobile:pb-[24px]"
    />
    <InfoModal
      :header="tRegistrationStatus('modal.contactInfo.header')"
      :open-button-label="tRegistrationStatus('modal.contactInfo.openButtonLabel')"
      :hide-contact-info="false"
      class="mb-6"
    >
      <p class="mb-10">
        {{ tRegistrationStatus('modal.contactInfo.contactUsFirstPart') }}
        <a
          :href="`${tRegistrationStatus('modal.contactInfo.informationPageLink')}`"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ tRegistrationStatus('modal.contactInfo.informationPageLabel') }}
        </a>{{ tRegistrationStatus('modal.contactInfo.contactUsSecondPart') }}
      </p>
    </InfoModal>
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
          :key="application?.header.applicationNumber"
          :class="[
            (applications && applications?.length > 1) ? 'desktop:w-[calc(33.33%)]' : 'desktop:w-full flex-grow flex-1',
            'flex flex-row mobile:flex-col'
          ]"
        >
          <BcrosStatusCard
            v-if="application && isHostRegistrationType(application)"
            :application-header="application.header"
            :is-single="!(applications && applications?.length > 1)"
            :class="{'mr-6': (index + 1) % 3 !== 0}"
          >
            <div>
              <p class="font-bold">
                {{
                  application.registration.unitAddress.nickname ||
                    `${application.registration.unitAddress.streetNumber} ${
                      application.registration.unitAddress.streetName
                    }${
                      application.registration.unitAddress.unitNumber
                        ? `, ${application.registration.unitAddress.unitNumber}`
                        : ''
                    }`
                }}
              </p>
              <p>
                {{
                  application.registration.unitAddress.nickname
                    ? `${application.registration.unitAddress.streetNumber} ${
                      application.registration.unitAddress.streetName}${
                      application.registration.unitAddress.unitNumber
                        ? `, ${application.registration.unitAddress.unitNumber}`
                        : ''
                    }`
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
import InfoModal from '~/components/common/InfoModal.vue'

definePageMeta({
  layout: 'wide-no-space'
})

const hostApplicationStatusPriority: any = {
  [ApplicationStatusE.DECLINED]: 4,
  [ApplicationStatusE.PROVISIONALLY_APPROVED]: 3,
  [ApplicationStatusE.FULL_REVIEW_APPROVED]: 3,
  [ApplicationStatusE.AUTO_APPROVED]: 3,
  [ApplicationStatusE.PAYMENT_DUE]: 2
}

const tRegistrationStatus = (translationKey: string) => useTranslation().t(`registrationStatus.${translationKey}`)

const { getApplications } = useApplications()
const applications = ref<(ApplicationI | undefined)[]>()
const res = await getApplications()
const { isExaminer } = storeToRefs(useBcrosKeycloak())

const isHostRegistrationType = (application): boolean => {
  return !isExaminer.value && application.registration.registrationType === RegistrationTypeE.HOST
}

onBeforeMount(() => {
  // redirect Examiners to their own Dashboard
  if (isExaminer.value) {
    navigateTo({ path: '/' + RouteNamesE.REGISTRY_DASHBOARD })
  }
})

if (res.total === 0) {
  navigateTo('/' + RouteNamesE.CREATE_ACCOUNT)
}

applications.value = res.applications
  .sort(
    (a: ApplicationI, b: ApplicationI) => {
      const priorityA = hostApplicationStatusPriority[a.header.hostStatus || a.header.status] ?? 1
      const priorityB = hostApplicationStatusPriority[b.header.hostStatus || b.header.status] ?? 1
      return priorityB - priorityA
    }
  )
  .sort((a: ApplicationI, b: ApplicationI) =>
    a.registration?.unitAddress?.city.localeCompare(b.registration?.unitAddress?.city)
  )
const applicationsCount = applications.value?.length || 0
</script>
