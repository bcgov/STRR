<template>
  <div
    data-test-id="banner"
    :class="
      `
        flex justify-center bg-white absolute w-full top-0 left-0 h-[104px] shadow-md
        py-[30px] px-[70px]
        m:flex-col m:h-[116px] m:pt-[16px] m:pb-[6px] m:px-[8px]
        ${hideButtons ? 'm:h-[70px]': ''}
      `
    "
  >
    <div class="flex justify-between px-4 w-full max-w-[1360px]">
      <slot />
      <div v-if="!hideButtons">
        <div class="mobile:hidden">
          <BcrosButtonsPrimary
            :label="tBanner('approve')"
            :action="() => approveApplication(applicationId)"
            variant="outline"
            class-name="ml-[16px]"
          />
          <BcrosButtonsPrimary
            :label="tBanner('reject')"
            :action="() => rejectApplication(applicationId)"
            variant="outline"
            class-name="ml-[16px]"
          />
          <BcrosButtonsPrimary
            :label="tBanner('issue')"
            :action="() => issueRegistration(applicationId)"
            variant="outline"
            class-name="ml-[16px]"
          />
        </div>
        <div class="desktop:hidden flex">
          <a
            class="mr-[16px] py-[10px]"
            :on-click="() => approveApplication(applicationId)"
          >
            {{ tBanner('approve') }}
          </a>
          <a
            class="mr-[16px] py-[10px]"
            :on-click="() => rejectApplication(applicationId)"
          >
            {{ tBanner('reject') }}
          </a>
          <a
            class="mr-[16px] py-[10px]"
            :on-click="() => issueRegistration(applicationId)"
          >
            {{ tBanner('issue') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const { hideButtons = true } = defineProps<{
  hideButtons?: boolean,
  applicationId: string
}>()
const { t } = useTranslation()
const tBanner = (text: string) => t(`banner.${text}`)
const {
  issueRegistration
} = useRegistrations()

const { approveApplication, rejectApplication } = useApplications()

</script>
