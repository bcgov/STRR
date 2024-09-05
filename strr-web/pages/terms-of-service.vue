<template>
  <div>
    <BcrosTypographyH1 :text="tTos('tosTitle')" />
    <div class="bg-white flex flex-col pb-[20px]">
      <div class="px-[20px] py-[25px]">
        <!-- eslint-disable-next-line -->
        <span v-html="tos?.content" />
      </div>
      <div class="flex flex-row justify-center">
        <BcrosButtonsPrimary
          :label="tTos('accept')"
          :action="() => handleAcceptTermsOfService(true, tos?.versionId)"
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

const { updateTosAcceptance, acceptTos } = useBcrosAccount()

const tos = await updateTosAcceptance()

const handleAcceptTermsOfService = (acceptance: boolean, versionId?: string) => {
  // remove User Profile from the session to get updated User Profile after accepting the terms
  sessionStorage.removeItem(SessionStorageKeyE.USER_PROFILE)
  // accept or decline the Terms
  acceptTos(acceptance, versionId)
}

</script>
