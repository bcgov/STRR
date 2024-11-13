<template>
  <div>
    <BcrosTypographyH1 :text="tTos('tosTitle')" />
    <div v-if="tos" class="bg-white flex flex-col pb-[20px]">
      <div class="px-[20px] py-[25px]">
        <!-- eslint-disable-next-line -->
        <span v-html="tos?.termsOfUse" />
      </div>
      <div class="flex flex-row justify-center">
        <BcrosButtonsPrimary
          :label="tTos('accept')"
          :action="() => handleAcceptTermsOfService(true)"
        />
        <BcrosButtonsPrimary
          :label="tTos('decline')"
          :action="() => handleAcceptTermsOfService(false)"
          variant="outline"
          class-name="ml-[4px]"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useTranslation()
const tTos = (translationKey: string) => t(`tos.${translationKey}`)

const { acceptTermsOfService } = useTermsOfService()
const { tos, isTosAccepted } = storeToRefs(useBcrosAccount())
const { goToCreateAccount } = useBcrosNavigate()

watch(isTosAccepted, (isAccepted) => {
  if (isAccepted) {
    goToCreateAccount()
  }
})

const handleAcceptTermsOfService = (isAccepted: boolean) => {
  // remove User Profile from the session to get updated User Profile after accepting the Terms
  sessionStorage.removeItem(SessionStorageKeyE.USER_PROFILE)
  // accept or decline the Terms
  acceptTermsOfService(isAccepted, tos.value?.termsOfUseCurrentVersion || 'n/a')
}
</script>
